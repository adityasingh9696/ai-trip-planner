import os
import json
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

import datetime

# Load env vars
load_dotenv()

# Clean any contaminated env variables from copy-paste newlines/carriage returns
for key in ["GEMINI_API_KEY", "GOOGLE_API_KEY", "SERPAPI_API_KEY", "OPENWEATHERMAP_API_KEY"]:
    val = os.environ.get(key)
    if val:
        # Strip whitespaces, newlines, and carriage returns
        val_clean = val.strip().replace('\r', '').replace('\n', '')
        
        # If the value contains subsequent variable names due to bulk copy-paste, split it
        for var_name in ["SERPAPI_API_KEY", "OPENWEATHERMAP_API_KEY", "GEMINI_API_KEY", "PORT"]:
            if var_name in val_clean and key != var_name:
                val_clean = val_clean.split(var_name)[0].strip()
                
        # Strip any trailing characters or equal signs if they slipped in
        val_clean = val_clean.rstrip('=').strip()
        os.environ[key] = val_clean

# We will use Gemini 2.5 Flash as our LLM for all agents
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.7)

# Mapping of common destinations to their 3-letter IATA airport codes for fast local lookup
IATA_MAP = {
    "goa": "GOI",
    "mumbai": "BOM",
    "delhi": "DEL",
    "new delhi": "DEL",
    "jaipur": "JAI",
    "lucknow": "LKO",
    "bangalore": "BLR",
    "bengaluru": "BLR",
    "pune": "PNQ",
    "hyderabad": "HYD",
    "chennai": "MAA",
    "kolkata": "CCU",
    "agra": "AGR",
    "london": "LHR",
    "paris": "CDG",
    "new york": "JFK",
    "nyc": "JFK",
    "dubai": "DXB",
    "singapore": "SIN",
    "tokyo": "HND",
    "bangkok": "BKK",
    "india": "DEL",
    "uk": "LHR",
    "united kingdom": "LHR",
    "england": "LHR",
    "usa": "JFK",
    "united states": "JFK",
    "united states of america": "JFK",
    "france": "CDG",
    "japan": "HND",
    "thailand": "BKK",
    "germany": "FRA",
    "spain": "MAD",
    "italy": "FCO"
}

# Define the State our graph will pass around
class TripState(TypedDict):
    destination: str
    source: str
    check_in: str
    check_out: str
    days: int
    budget: str
    companions: str
    interests: str
    
    # Results from tools/agents
    weather_info: str
    flight_info: str
    hotel_info: str
    
    # Structured lists for high-fidelity frontend rendering
    flights_list: List[dict]
    hotels_list: List[dict]
    
    # Final generated JSON
    final_itinerary: dict

# 1. Weather Agent Node
def weather_agent(state: TripState):
    from tools import get_weather
    try:
        weather = get_weather.invoke({"location": state["destination"]})
    except Exception as e:
        weather = f"Could not fetch weather: {e}"
    return {"weather_info": weather}

# 2. Flight Agent Node
def flight_agent(state: TripState):
    from tools import get_flight_prices
    
    # Resolve IATA codes locally using mapping to avoid hitting Gemini rate limits
    try:
        origin = state.get("source", "Lucknow").strip().lower()
        origin_code = IATA_MAP.get(origin, "LKO")
        
        dest_clean = state['destination'].strip().lower()
        dest_code = IATA_MAP.get(dest_clean, "GOI")
            
        flight_date = state.get("check_in")
        if not flight_date:
            flight_date = (datetime.date.today() + datetime.timedelta(days=7)).strftime("%Y-%m-%d")
            
        flights_str = get_flight_prices.invoke({"origin": origin_code, "destination": dest_code, "date": flight_date})
        try:
            flights_list = json.loads(flights_str)
        except Exception:
            flights_list = []
    except Exception as e:
        flights_str = f"Could not fetch flights: {e}"
        flights_list = []
        
    return {"flight_info": flights_str, "flights_list": flights_list}

# 3. Hotel Agent Node
def hotel_agent(state: TripState):
    from tools import get_hotel_prices
    try:
        check_in = state.get("check_in")
        if not check_in:
            check_in = datetime.date.today().strftime("%Y-%m-%d")
            
        check_out = state.get("check_out")
        if not check_out:
            check_out = (datetime.date.today() + datetime.timedelta(days=state['days'])).strftime("%Y-%m-%d")
            
        hotels_str = get_hotel_prices.invoke({"location": state["destination"], "check_in": check_in, "check_out": check_out})
        try:
            hotels_list = json.loads(hotels_str)
        except Exception:
            hotels_list = []
    except Exception as e:
        hotels_str = f"Could not fetch hotels: {e}"
        hotels_list = []
        
    return {"hotel_info": hotels_str, "hotels_list": hotels_list}

# 4. Orchestrator / Itinerary Agent Node
def itinerary_agent(state: TripState):
    prompt = f"""
    You are an expert travel agent. Generate a detailed, highly-optimized itinerary for the following trip:
    Destination: {state['destination']}
    Source City: {state.get('source', 'Lucknow')}
    Check-in Date: {state.get('check_in', '')}
    Check-out Date: {state.get('check_out', '')}
    Duration: {state['days']} days
    Budget: {state['budget']}
    Companions: {state['companions']}
    Interests: {state['interests']}
    
    Live Data Found by our specialized agents:
    - Weather: {state['weather_info']}
    - Flight options: {state['flight_info']}
    - Hotel options: {state['hotel_info']}
    
    IMPORTANT: Always format all estimated costs in the local currency of the destination (e.g., Rupee/INR for India).
    Ensure you incorporate the Live Data into your cost estimations and activity planning.
    
    CRITICAL COORDINATE RULES: You MUST generate real, geographically accurate latitude (lat) and longitude (lng) coordinates for every activity spot! Do not leave them as 0.0 placeholders. For example, if destination is Goa, Baga Beach is approximately lat: 15.552, lng: 73.751.
    
    Respond STRICTLY with valid JSON matching the following structure exactly. Do not include markdown formatting or backticks outside the JSON.
    {{
      "tripDetails": {{
        "destination": "{state['destination']}",
        "source": "{state.get('source', 'Lucknow')}",
        "check_in": "{state.get('check_in', '')}",
        "check_out": "{state.get('check_out', '')}",
        "days": {state['days']},
        "totalEstimatedCost": "Estimated cost string",
        "currency": "INR"
      }},
      "itinerary": [
        {{
          "day": 1,
          "theme": "Theme of the day",
          "activities": [
            {{
              "time": "09:00 AM",
              "name": "Activity Name",
              "description": "Brief description",
              "cost": "Cost estimate",
              "location": {{
                "lat": 15.552,
                "lng": 73.751
              }}
            }}
          ]
        }}
      ]
    }}
    """
    
    response = llm.invoke([SystemMessage(content="You are a strict JSON generator."), HumanMessage(content=prompt)])
    text = response.content.replace('```json', '').replace('```', '').strip()
    
    try:
        final_json = json.loads(text)
    except Exception as e:
        final_json = {"error": f"Failed to parse AI output: {str(e)}"}
        
    return {"final_itinerary": final_json}


# Build the LangGraph
workflow = StateGraph(TripState)

# Add nodes
workflow.add_node("weather_agent", weather_agent)
workflow.add_node("flight_agent", flight_agent)
workflow.add_node("hotel_agent", hotel_agent)
workflow.add_node("itinerary_agent", itinerary_agent)

# Define routing (Edges)
# Start by fanning out to the data gathering agents simultaneously
workflow.set_entry_point("weather_agent")
workflow.add_edge("weather_agent", "flight_agent")
workflow.add_edge("flight_agent", "hotel_agent")
workflow.add_edge("hotel_agent", "itinerary_agent")
workflow.add_edge("itinerary_agent", END)

# Compile graph
trip_orchestrator = workflow.compile()
