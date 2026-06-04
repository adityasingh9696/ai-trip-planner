import os
import json
import requests
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

# Initialize datetime and load project environment files
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
    "navi mumbai": "BOM",
    "delhi": "DEL",
    "new delhi": "DEL",
    "noida": "DEL",
    "gurgaon": "DEL",
    "ghaziabad": "DEL",
    "greater noida": "DEL",
    "ayodhya": "AYJ",
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
    traveler_details: List[dict]
    
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

def resolve_iata(city_name: str) -> str:
    city = city_name.split(',')[0].strip()
    if not city:
        return "N/A"
    
    # Check local map first (case-insensitive)
    city_lower = city.lower()
    for name, code in IATA_MAP.items():
        if city_lower == name or city_lower.startswith(name) or name.startswith(city_lower):
            return code
            
    # Ask Gemini to resolve to IATA code
    prompt = f"""
    Find the 3-letter IATA airport code for the city: "{city}".
    If the city does not have its own commercial airport with regular commercial flights, find the 3-letter IATA code for the nearest major active commercial airport serving that city (within 150km, e.g., BOM for Navi Mumbai, DEL for Noida).
    If no major commercial airport serves this city within 150km, respond strictly with the word "N/A".
    Do not include markdown, explanation, or extra spaces. Just the 3-letter code or "N/A".
    """
    try:
        response = llm.invoke([SystemMessage(content="You are a strict IATA resolver."), HumanMessage(content=prompt)])
        code = response.content.strip().upper()
        if len(code) == 3 and code.isalpha():
            return code
    except Exception:
        pass
    return "N/A"

# 2. Flight Agent Node
def flight_agent(state: TripState):
    from tools import get_flight_prices
    
    try:
        origin = state.get("source", "Lucknow").strip()
        dest = state.get("destination", "Goa").strip()
        
        origin_code = resolve_iata(origin)
        dest_code = resolve_iata(dest)
        
        if origin_code == "N/A":
             return {
        "flight_info": f"Unable to resolve departure airport for {origin}.",
        "flights_list": []
             }
        if dest_code == "N/A":
            return {
        "flight_info": f"Unable to resolve destination airport for {dest}.",
        "flights_list": []
                    }
            
        flight_date = state.get("check_in")
        if not flight_date:
            flight_date = (datetime.date.today() + datetime.timedelta(days=7)).strftime("%Y-%m-%d")
            
        return_date = state.get("check_out")
        query_args = {"origin": origin_code, "destination": dest_code, "date": flight_date}
        if return_date and return_date != flight_date:
            query_args["return_date"] = return_date
            
        flights_str = get_flight_prices.invoke(query_args)
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


def get_coordinates_osm(city_name: str) -> tuple:
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": city_name.strip(),
            "format": "json",
            "limit": 1
        }
        headers = {"User-Agent": "AntigravityTripPlanner/1.0 (contact: support@tripplanner.app)"}
        response = requests.get(url, params=params, headers=headers, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        print(f"OSM lookup failed for {city_name}: {e}")
    
    # Fallback to local offline dictionary if Nominatim fails or times out
    city_lower = city_name.lower()
    if "ayodhya" in city_lower:
        return 26.7922, 82.1998
    elif "goa" in city_lower:
        return 15.5522, 73.7512
    elif "delhi" in city_lower:
        return 28.6139, 77.2090
    elif "mumbai" in city_lower:
        return 19.0760, 72.8777
    elif "lucknow" in city_lower:
        return 26.8467, 80.9462
    elif "agra" in city_lower:
        return 27.1767, 78.0081
    elif "jaipur" in city_lower:
        return 26.9124, 75.7873
    elif "bangalore" in city_lower or "bengaluru" in city_lower:
        return 12.9716, 77.5946
    elif "hyderabad" in city_lower:
        return 17.3850, 78.4867
    elif "chennai" in city_lower:
        return 13.0827, 80.2707
    elif "kolkata" in city_lower:
        return 22.5726, 88.3639
    elif "pune" in city_lower:
        return 18.5204, 73.8567
    elif "london" in city_lower:
        return 51.5074, -0.1278
    elif "paris" in city_lower:
        return 48.8566, 2.3522
    elif "new york" in city_lower or "nyc" in city_lower:
        return 40.7128, -74.0060
    elif "tokyo" in city_lower:
        return 35.6762, 139.6503
    elif "singapore" in city_lower:
        return 1.3521, 103.8198
    elif "bangkok" in city_lower:
        return 13.7563, 100.5018
    elif "dubai" in city_lower:
        return 25.2048, 55.2708
        
    return 15.552, 73.751 # Ultimate fallback


def generate_fallback_itinerary(state: TripState) -> dict:
    dest = state['destination']
    source = state.get('source', 'Lucknow')
    check_in = state.get('check_in', '')
    check_out = state.get('check_out', '')
    days = state['days']
    
    # 1. Resolve base coordinates
    lat, lng = get_coordinates_osm(dest)
    
    # Let's count total travelers
    traveler_details = state.get("traveler_details", [])
    num_travelers = len(traveler_details)
    if num_travelers == 0:
        num_travelers = 1
        
    budget_lower = state.get('budget', '').lower()
    
    # Define price multipliers
    if "under" in budget_lower or "budget" in budget_lower or "backpacker" in budget_lower:
        flight_rate = 4500
        hotel_rate = 1500
        activity_rate = 400
        meal_rate = 350
        tier_label = "Budget/Backpacker"
    elif "moderate" in budget_lower or "standard" in budget_lower:
        flight_rate = 7500
        hotel_rate = 3500
        activity_rate = 850
        meal_rate = 650
        tier_label = "Moderate/Standard"
    else:
        flight_rate = 15000
        hotel_rate = 9000
        activity_rate = 2000
        meal_rate = 1500
        tier_label = "Luxury/Premium"
        
    dest_lower = dest.lower()
    if "ayodhya" in dest_lower:
        if "budget" in tier_label.lower():
            selected_hotel_name = "Shree Ram Guest House, Ayodhya"
        elif "moderate" in tier_label.lower():
            selected_hotel_name = "Royal Heritage Hotel, Ayodhya"
        else:
            selected_hotel_name = "The Taj Palace Ayodhya"
    elif "goa" in dest_lower:
        if "budget" in tier_label.lower():
            selected_hotel_name = "Baga Beach Backpackers, Goa"
        elif "moderate" in tier_label.lower():
            selected_hotel_name = "Whispering Palms Beach Resort, Goa"
        else:
            selected_hotel_name = "Taj Exotica Resort & Spa, Goa"
    elif "tokyo" in dest_lower:
        if "budget" in tier_label.lower():
            selected_hotel_name = "Capsule Inn Shinjuku, Tokyo"
        elif "moderate" in tier_label.lower():
            selected_hotel_name = "Shinjuku Washington Hotel, Tokyo"
        else:
            selected_hotel_name = "The Ritz-Carlton Tokyo"
    else:
        if "budget" in tier_label.lower():
            selected_hotel_name = f"{dest} Eco-Lodge & Homestay"
        elif "moderate" in tier_label.lower():
            selected_hotel_name = f"{dest} Plaza & Suites"
        else:
            selected_hotel_name = f"The Grand Palace & Resort, {dest}"
            
    rooms_needed = max(1, (num_travelers + 1) // 2) # 2 people per room
    total_flights = flight_rate * num_travelers
    total_hotels = hotel_rate * rooms_needed * max(1, days - 1)
    total_activities = activity_rate * num_travelers * days
    total_meals = meal_rate * num_travelers * days
    
    grand_total = total_flights + total_hotels + total_activities + total_meals
    
    totalEstimatedCost = f"₹{grand_total:,}"
    costBreakdown = {
        "flights": f"₹{total_flights:,} (₹{flight_rate:,} x {num_travelers} travelers)",
        "hotels": f"₹{total_hotels:,} ({rooms_needed} room(s) x {max(1, days - 1)} night(s) at ₹{hotel_rate:,}/night)",
        "activities": f"₹{total_activities:,} (₹{activity_rate:,}/day per traveler)",
        "meals": f"₹{total_meals:,} (₹{meal_rate:,}/day per traveler)"
    }
    
    # 2. Check if the destination is Ayodhya
    if "ayodhya" in dest_lower:
        # Predefined rich itinerary for Ayodhya (up to 5 days, or longer by looping)
        ayodhya_activities = [
            # Day 1
            [
                {
                    "time": "08:30 AM",
                    "name": "Darshan at Shree Ram Janmabhoomi Temple (Ram Mandir)",
                    "description": "Visit the newly constructed grand temple dedicated to Lord Rama, appreciating its majestic architecture and holy atmosphere.",
                    "cost": "Free",
                    "location": {"lat": 26.7922, "lng": 82.1998}
                },
                {
                    "time": "12:00 PM",
                    "name": "Worship at Hanumangarhi Temple",
                    "description": "Climb the 76 steps to this famous fortress-like temple dedicated to Lord Hanuman, who is believed to guard the city.",
                    "cost": "Free",
                    "location": {"lat": 26.7981, "lng": 82.1994}
                },
                {
                    "time": "03:30 PM",
                    "name": "Explore Kanak Bhawan (Golden Palace Temple)",
                    "description": "Visit this beautiful palace temple, which legend says was gifted to Sita by Kaikeyi immediately after her marriage to Rama.",
                    "cost": "Free",
                    "location": {"lat": 26.7995, "lng": 82.1990}
                },
                {
                    "time": "06:30 PM",
                    "name": "Sarayu River Aarti at Ram Ki Paidi",
                    "description": "Experience the peaceful and divine evening oil-lamp Aarti on the banks of the sacred Sarayu River.",
                    "cost": "Free",
                    "location": {"lat": 26.8041, "lng": 82.2032}
                }
            ],
            # Day 2
            [
                {
                    "time": "09:00 AM",
                    "name": "Visit Dashrath Mahal Palace",
                    "description": "Explore the royal palace and seat of King Dashrath, the father of Lord Rama, now functioning as a vibrant temple complex.",
                    "cost": "Free",
                    "location": {"lat": 26.7987, "lng": 82.1983}
                },
                {
                    "time": "12:30 PM",
                    "name": "Nageshwarnath Temple Visit",
                    "description": "Pay respects at one of the oldest temples in Ayodhya, dedicated to Lord Shiva and established by Kusha, Rama's son.",
                    "cost": "Free",
                    "location": {"lat": 26.8028, "lng": 82.2025}
                },
                {
                    "time": "03:30 PM",
                    "name": "Climb Mani Parbat",
                    "description": "Visit the holy hillock believed to be a fragment of the Sanjeevani herb hill carried by Hanuman.",
                    "cost": "Free",
                    "location": {"lat": 26.7865, "lng": 82.1932}
                },
                {
                    "time": "06:30 PM",
                    "name": "Sunset Walk at Guptar Ghat",
                    "description": "Take a scenic walk or boat ride at the ghat where Lord Rama is said to have taken his final journey (Jal Samadhi) to Vaikuntha.",
                    "cost": "₹200",
                    "location": {"lat": 26.8123, "lng": 82.1482}
                }
            ],
            # Day 3
            [
                {
                    "time": "09:00 AM",
                    "name": "Explore Ram Katha Museum & Park",
                    "description": "View a collection of ancient scriptures, historical coins, paintings, and stone sculptures illustrating the history of Ayodhya.",
                    "cost": "₹20",
                    "location": {"lat": 26.8010, "lng": 82.2012}
                },
                {
                    "time": "12:30 PM",
                    "name": "Visit Tulsi Smarak Bhawan",
                    "description": "Visit the memorial building dedicated to Goswami Tulsidas, the composer of Ramcharitmanas, featuring regular cultural programs.",
                    "cost": "Free",
                    "location": {"lat": 26.7942, "lng": 82.1935}
                },
                {
                    "time": "04:00 PM",
                    "name": "Walk through Gulab Bari Rose Gardens",
                    "description": "Explore the tomb of Nawab Shuja-ud-Daula surrounded by beautifully landscaped gardens and historic water fountains.",
                    "cost": "₹25",
                    "location": {"lat": 26.7845, "lng": 82.1412}
                },
                {
                    "time": "07:00 PM",
                    "name": "Satvik Dinner at Awadhi Dhaba",
                    "description": "Enjoy an authentic local vegetarian dinner featuring specialties like Dal Baati, Peda sweets, and local vegetables.",
                    "cost": "₹500",
                    "location": {"lat": 26.7932, "lng": 82.1955}
                }
            ],
            # Day 4
            [
                {
                    "time": "09:00 AM",
                    "name": "Visit Valmiki Ramayan Bhawan",
                    "description": "Admire the beautiful marble walls completely engraved with verses from Maharishi Valmiki's Ramayana epic.",
                    "cost": "Free",
                    "location": {"lat": 26.7915, "lng": 82.1912}
                },
                {
                    "time": "12:30 PM",
                    "name": "Explore Treta Ke Thakur Temple",
                    "description": "Visit the historical temple housing beautiful black sandstone idols of Rama, Sita, and Laxman, where Ashvamedha Yagna was performed.",
                    "cost": "Free",
                    "location": {"lat": 26.8035, "lng": 82.2038}
                },
                {
                    "time": "04:00 PM",
                    "name": "Worship at Choti Chawni Temple",
                    "description": "Visit the magnificent complex crafted entirely out of white marble, offering peace and architectural beauty.",
                    "cost": "Free",
                    "location": {"lat": 26.7972, "lng": 82.1915}
                },
                {
                    "time": "06:30 PM",
                    "name": "Shopping at Ayodhya Local Bazaar",
                    "description": "Shop for Ramdarbar brass statues, wooden handicrafts, tulsi mala beads, and traditional Ayodhya dry-sweets (pedas).",
                    "cost": "Free Entry",
                    "location": {"lat": 26.7950, "lng": 82.1960}
                }
            ],
            # Day 5
            [
                {
                    "time": "09:00 AM",
                    "name": "Excursion to Bharat Kund (Nandigram)",
                    "description": "Travel 20 km to Nandigram where Lord Rama's brother Bharat placed Rama's wooden sandals (charan paduka) and ruled from during the exile.",
                    "cost": "₹400",
                    "location": {"lat": 26.6542, "lng": 82.1642}
                },
                {
                    "time": "01:00 PM",
                    "name": "Traditional Lunch & Tea",
                    "description": "Have a relaxed lunch at a roadside Dhaba on the Lucknow-Ayodhya highway.",
                    "cost": "₹300",
                    "location": {"lat": 26.7880, "lng": 82.1850}
                },
                {
                    "time": "04:00 PM",
                    "name": "Final Blessings at Sarayu River",
                    "description": "Take a final quiet stroll on the ghats of the Sarayu River before starting your departure journey.",
                    "cost": "Free",
                    "location": {"lat": 26.8041, "lng": 82.2032}
                }
            ]
        ]
        
        themes = [
            "Ram Janmabhoomi & Ancient Temples",
            "Historical Palaces & Sacred Ghats",
            "Cultural Heritage & Nawabi Gardens",
            "Epic Ashrams & Local Bazaars",
            "Nandigram Excursion & Departure"
        ]
        
        itinerary = []
        for i in range(days):
            day_idx = i % len(ayodhya_activities)
            itinerary.append({
                "day": i + 1,
                "theme": themes[day_idx],
                "accommodation": selected_hotel_name,
                "meals": {
                    "breakfast": "Complimentary buffet at " + selected_hotel_name,
                    "lunch": "Traditional satvik thali at local temple prasad center",
                    "dinner": "Signature local Awadhi dinner"
                },
                "activities": ayodhya_activities[day_idx]
            })
            
    else:
        # Generic rich non-repeating itinerary for any other destination
        generic_activities = [
            # Day 1: Arrival & Exploring the Core
            [
                {
                    "time": "09:00 AM",
                    "name": f"Welcome Breakfast & Orientation in {dest}",
                    "description": f"Enjoy regional breakfast specialties at a highly-rated local cafe and plan your exploration.",
                    "cost": "₹400",
                    "location": {"lat": lat + 0.001, "lng": lng + 0.001}
                },
                {
                    "time": "01:00 PM",
                    "name": f"City Center & Local Heritage Walk",
                    "description": f"Take a walking tour around the primary historic center, vibrant squares, and landmark monuments.",
                    "cost": "Free",
                    "location": {"lat": lat - 0.002, "lng": lng + 0.003}
                },
                {
                    "time": "06:30 PM",
                    "name": f"Scenic Sunset View & Dinner",
                    "description": f"Enjoy a delicious welcome dinner at a local rooftop restaurant with panoramic city views.",
                    "cost": "₹800",
                    "location": {"lat": lat + 0.003, "lng": lng - 0.002}
                }
            ],
            # Day 2: Culture & Famous Landmarks
            [
                {
                    "time": "09:00 AM",
                    "name": f"Major Cultural Landmark or Palace Tour",
                    "description": f"Explore the top architectural marvel, historic palace, or fort that defines the identity of {dest}.",
                    "cost": "₹300",
                    "location": {"lat": lat - 0.004, "lng": lng - 0.001}
                },
                {
                    "time": "01:30 PM",
                    "name": f"Artistry & Souvenir Shopping in Local Markets",
                    "description": f"Browse traditional craft shops, street vendor stalls, and artisan collectives to pick up unique local souvenirs.",
                    "cost": "Free Entry",
                    "location": {"lat": lat + 0.002, "lng": lng - 0.004}
                },
                {
                    "time": "07:00 PM",
                    "name": f"Evening Live Performance or Folklore Show",
                    "description": f"Immerse yourself in local traditions with an authentic dance, musical showcase, or historical sound & light show.",
                    "cost": "₹600",
                    "location": {"lat": lat - 0.001, "lng": lng + 0.002}
                }
            ],
            # Day 3: Nature, Parks & Relaxation
            [
                {
                    "time": "08:30 AM",
                    "name": f"Morning Trek or Scenic Nature Walk",
                    "description": f"Rejuvenate your senses with a hike or relaxed stroll through the highest-rated botanical gardens, scenic cliffs, or national parks.",
                    "cost": "₹150",
                    "location": {"lat": lat + 0.005, "lng": lng + 0.005}
                },
                {
                    "time": "01:00 PM",
                    "name": f"Waterfront Picnic or Lakeside Lunch",
                    "description": f"Enjoy an elegant dining experience with views of the sea, lake, or major river flowing through {dest}.",
                    "cost": "₹700",
                    "location": {"lat": lat - 0.003, "lng": lng - 0.005}
                },
                {
                    "time": "06:00 PM",
                    "name": f"Golden Hour Sunset Cruise or Promenade Stroll",
                    "description": f"Walk along the waterfront promenade or enjoy a sunset cruise, catching spectacular reflections as the sun goes down.",
                    "cost": "₹500",
                    "location": {"lat": lat + 0.004, "lng": lng - 0.003}
                }
            ],
            # Day 4: Culinary Journey & Hidden Gems
            [
                {
                    "time": "09:30 AM",
                    "name": f"Authentic Cooking Class or Food Tasting Tour",
                    "description": f"Taste local street food specialties with a culinary guide, or learn to cook signature dishes yourself.",
                    "cost": "₹1,200",
                    "location": {"lat": lat - 0.002, "lng": lng + 0.004}
                },
                {
                    "time": "02:00 PM",
                    "name": f"Off-the-Beaten-Path Secrets",
                    "description": f"Avoid tourist crowds and visit a hidden local gem, peaceful community library, or ancient ruins known mostly to locals.",
                    "cost": "Free",
                    "location": {"lat": lat + 0.006, "lng": lng - 0.002}
                },
                {
                    "time": "07:30 PM",
                    "name": f"Gourmet Farewell Dinner",
                    "description": f"Dine at a highly acclaimed restaurant blending traditional recipes with modern culinary art.",
                    "cost": "₹1,500",
                    "location": {"lat": lat - 0.005, "lng": lng + 0.005}
                }
            ],
            # Day 5: Scenic Retreat & Departure
            [
                {
                    "time": "09:00 AM",
                    "name": f"Spiritual Marvel or Architectural Wonder Visit",
                    "description": f"Visit a stunning cathedral, temple, church, or heritage monument renowned for its architecture and serenity.",
                    "cost": "Free",
                    "location": {"lat": lat + 0.001, "lng": lng - 0.001}
                },
                {
                    "time": "01:00 PM",
                    "name": f"Leisurely Lunch & Coffee at a Literary Cafe",
                    "description": f"Spend a slow, relaxed afternoon reading, writing postcards, and sipping artisan coffee.",
                    "cost": "₹500",
                    "location": {"lat": lat - 0.001, "lng": lng + 0.001}
                },
                {
                    "time": "04:00 PM",
                    "name": f"Final Scenic Photo Shoot & Departure",
                    "description": f"Gather your memories and take some parting photographs at the most picturesque spot in {dest} before your departure.",
                    "cost": "Free",
                    "location": {"lat": lat + 0.002, "lng": lng + 0.002}
                }
            ]
        ]
        
        themes = [
            f"Arrival & Core Discovery in {dest}",
            f"Cultural Heritage & Landmark Treasures",
            f"Nature, Lakes & Scenic Splendour",
            f"Gastronomy & Local Hidden Secrets",
            f"Spiritual Peace & Departures"
        ]
        
        itinerary = []
        for i in range(days):
            day_idx = i % len(generic_activities)
            day_activities = []
            for act in generic_activities[day_idx]:
                act_copy = dict(act)
                lat_drift = (i // 5) * 0.015
                lng_drift = (i // 5) * 0.015
                act_copy["location"] = {
                    "lat": act["location"]["lat"] + lat_drift,
                    "lng": act["location"]["lng"] + lng_drift
                }
                day_activities.append(act_copy)
                
            itinerary.append({
                "day": i + 1,
                "theme": themes[day_idx],
                "accommodation": selected_hotel_name,
                "meals": {
                    "breakfast": "Complimentary breakfast buffet at " + selected_hotel_name,
                    "lunch": "Local specialty lunch on tour",
                    "dinner": "Signature dining experience"
                },
                "activities": day_activities
            })
            
    return {
        "tripDetails": {
            "destination": dest,
            "source": source,
            "check_in": check_in,
            "check_out": check_out,
            "days": days,
            "totalEstimatedCost": totalEstimatedCost,
            "costBreakdown": costBreakdown,
            "currency": "INR"
        },
        "itinerary": itinerary
    }

# 4. Orchestrator / Itinerary Agent Node
def itinerary_agent(state: TripState):
    traveler_details = state.get("traveler_details", [])
    travelers_str = ""
    if traveler_details:
        travelers_str = "\nTravelers list:\n" + "\n".join([f"- Traveler {i+1}: Age {t['age']}, Gender {t['gender']}" for i, t in enumerate(traveler_details)])
    else:
        travelers_str = "\nTraveler: 1 Solo traveler (unspecified age/gender)"

    prompt = f"""
    You are an expert travel agent. Generate a detailed, highly-optimized itinerary for the following trip:
    Destination: {state['destination']}
    Source City: {state.get('source', 'Lucknow')}
    Check-in Date: {state.get('check_in', '')}
    Check-out Date: {state.get('check_out', '')}
    Duration: {state['days']} days
    Budget Class/Limit: {state['budget']}
    Companions Type: {state['companions']}{travelers_str}
    Interests: {state['interests']}
    
    Live Data Found by our specialized agents:
    - Weather: {state['weather_info']}
    - Flight options: {state['flight_info']}
    - Hotel options: {state['hotel_info']}
    
    IMPORTANT RULES FOR COST & MEALS & LODGING:
    1. Always format all estimated costs in the local currency of the destination (e.g., Rupee/INR for India).
    2. Incorporate the Live Data into your cost estimations and activity planning.
    3. You must provide a clean cost breakdown ("costBreakdown") in "tripDetails" detailing the cost of Flights, Hotels, Activities, and Meals based on the budget and number of travelers.
    4. For EACH DAY in the itinerary, you MUST specify the hotel or lodging ("accommodation") where they are staying that night, and the daily meal details ("meals") including breakfast, lunch, and dinner. E.g., if hotels live data suggests a hotel name, use that hotel for accommodation!
    
    CRITICAL COORDINATE RULES: You MUST generate real, geographically accurate latitude (lat) and longitude (lng) coordinates for every activity spot! Do not leave them as 0.0 placeholders.
    
    Respond STRICTLY with valid JSON matching the following structure exactly. Do not include markdown formatting or backticks outside the JSON.
    {{
      "tripDetails": {{
        "destination": "{state['destination']}",
        "source": "{state.get('source', 'Lucknow')}",
        "check_in": "{state.get('check_in', '')}",
        "check_out": "{state.get('check_out', '')}",
        "days": {state['days']},
        "totalEstimatedCost": "Total estimated cost string e.g. ₹54,000",
        "costBreakdown": {{
          "flights": "Cost explanation e.g. ₹15,000",
          "hotels": "Cost explanation e.g. ₹20,000",
          "activities": "Cost explanation e.g. ₹12,000",
          "meals": "Cost explanation e.g. ₹7,000"
        }},
        "currency": "INR"
      }},
      "itinerary": [
        {{
          "day": 1,
          "theme": "Theme of the day",
          "accommodation": "Name of hotel or stay, e.g. Baga Beach Resort",
          "meals": {{
            "breakfast": "e.g. Buffet at hotel",
            "lunch": "e.g. Local seafood at beach shack",
            "dinner": "e.g. Beachfront dining"
          }},
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
    
    try:
        response = llm.invoke([SystemMessage(content="You are a strict JSON generator."), HumanMessage(content=prompt)])
        text = response.content.replace('```json', '').replace('```', '').strip()
        final_json = json.loads(text)
    except Exception as e:
        print(f"Fallback Mode Triggered: Gemini API rate limit or quota exceeded: {e}")
        final_json = generate_fallback_itinerary(state)
        
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
