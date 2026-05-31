import os
import requests
from langchain_core.tools import tool

# Ensure you have set these in your environment or .env file:
# OPENWEATHERMAP_API_KEY
# SERPAPI_API_KEY

@tool
def get_weather(location: str, date: str = None) -> str:
    """
    Fetches the current weather for a specific location.
    Requires OPENWEATHERMAP_API_KEY environment variable.
    """
    api_key = os.environ.get("OPENWEATHERMAP_API_KEY")
    if not api_key:
        return "Error: OPENWEATHERMAP_API_KEY is not set. Cannot fetch live weather."
    
    url = f"http://api.openweathermap.org/data/2.5/weather?q={location}&appid={api_key}&units=metric"
    try:
        response = requests.get(url)
        data = response.json()
        if response.status_code == 200:
            temp = data["main"]["temp"]
            desc = data["weather"][0]["description"]
            return f"The current weather in {location} is {temp}°C with {desc}."
        else:
            return f"Weather API Error: {data.get('message', 'Unknown error')}"
    except Exception as e:
        return f"Failed to fetch weather: {str(e)}"


@tool
def get_flight_prices(origin: str, destination: str, date: str) -> str:
    """
    Fetches estimated live flight prices using Google Flights via SerpApi.
    Requires SERPAPI_API_KEY environment variable.
    Example origin/destination formats: 'JFK', 'DEL', 'LHR'.
    """
    api_key = os.environ.get("SERPAPI_API_KEY")
    if not api_key:
        return "Error: SERPAPI_API_KEY is not set. Cannot fetch live flights."
        
    # Mocking standard payload for SerpAPI Google Flights
    params = {
      "engine": "google_flights",
      "departure_id": origin,
      "arrival_id": destination,
      "outbound_date": date,
      "type": "2",
      "currency": "INR",
      "hl": "en",
      "api_key": api_key
    }
    
    try:
        response = requests.get("https://serpapi.com/search", params=params)
        data = response.json()
        if "best_flights" in data and len(data["best_flights"]) > 0:
            flight = data["best_flights"][0]
            price = flight.get("price", "Unknown")
            airline = flight["flights"][0].get("airline", "Unknown")
            return f"Best flight found: {airline} for roughly {price} INR."
        else:
            return f"No flights found for {origin} to {destination} on {date}."
    except Exception as e:
        return f"Failed to fetch flights: {str(e)}"


@tool
def get_hotel_prices(location: str, check_in: str, check_out: str) -> str:
    """
    Fetches estimated live hotel prices using Google Hotels via SerpApi.
    Requires SERPAPI_API_KEY environment variable.
    """
    api_key = os.environ.get("SERPAPI_API_KEY")
    if not api_key:
        return "Error: SERPAPI_API_KEY is not set. Cannot fetch live hotels."
        
    params = {
      "engine": "google_hotels",
      "q": location,
      "check_in_date": check_in,
      "check_out_date": check_out,
      "currency": "INR",
      "hl": "en",
      "api_key": api_key
    }
    
    try:
        response = requests.get("https://serpapi.com/search", params=params)
        data = response.json()
        if "properties" in data and len(data["properties"]) > 0:
            hotel = data["properties"][0]
            name = hotel.get("name", "Unknown Hotel")
            price = hotel.get("rate_per_night", {}).get("lowest", "Unknown Price")
            return f"Recommended hotel: {name} at approx {price} per night."
        else:
            return f"No hotels found in {location} for those dates."
    except Exception as e:
        return f"Failed to fetch hotels: {str(e)}"
