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

# We will use Gemini 2.5 Flash as our LLM for all agents
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.7)

# Define the State our graph will pass around
class TripState(TypedDict):
    destination: str
    days: int
    budget: str
    companions: str
    interests: str
    
    # Results from tools/agents
    weather_info: str
    flight_info: str
    hotel_info: str
    
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
    
    # Resolve IATA codes using LLM
    try:
        origin_code = "DEL" # Default origin
        prompt = f"What is the 3-letter IATA airport code for {state['destination']}? Reply with ONLY the 3 uppercase letters and nothing else."
        dest_code = llm.invoke(prompt).content.strip().upper()
        if len(dest_code) != 3:
            dest_code = "JFK" # Fallback
            
        flight_date = (datetime.date.today() + datetime.timedelta(days=7)).strftime("%Y-%m-%d")
        flights = get_flight_prices.invoke({"origin": origin_code, "destination": dest_code, "date": flight_date})
    except Exception as e:
        flights = f"Could not fetch flights: {e}"
    return {"flight_info": flights}

# 3. Hotel Agent Node
def hotel_agent(state: TripState):
    from tools import get_hotel_prices
    try:
        check_in = datetime.date.today().strftime("%Y-%m-%d")
        check_out = (datetime.date.today() + datetime.timedelta(days=state['days'])).strftime("%Y-%m-%d")
        hotels = get_hotel_prices.invoke({"location": state["destination"], "check_in": check_in, "check_out": check_out})
    except Exception as e:
        hotels = f"Could not fetch hotels: {e}"
    return {"hotel_info": hotels}

# 4. Orchestrator / Itinerary Agent Node
def itinerary_agent(state: TripState):
    prompt = f"""
    You are an expert travel agent. Generate a detailed, highly-optimized itinerary for the following trip:
    Destination: {state['destination']}
    Duration: {state['days']} days
    Budget: {state['budget']}
    Companions: {state['companions']}
    Interests: {state['interests']}
    
    Live Data Found by our specialized agents:
    - Weather: {state['weather_info']}
    - Flights: {state['flight_info']}
    - Hotels: {state['hotel_info']}
    
    IMPORTANT: Always format all estimated costs in the local currency of the destination (e.g., Rupee/INR for India).
    Ensure you incorporate the Live Data into your cost estimations and activity planning.
    
    Respond STRICTLY with valid JSON matching the following structure exactly. Do not include markdown formatting or backticks outside the JSON.
    {{
      "tripDetails": {{
        "destination": "{state['destination']}",
        "totalEstimatedCost": "Estimated cost string",
        "currency": "Local Currency Code"
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
                "lat": 0.0,
                "lng": 0.0
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
