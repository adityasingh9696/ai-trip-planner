import os
import requests
import datetime
from dotenv import load_dotenv
load_dotenv("backend/.env")

api_key = os.environ.get("SERPAPI_API_KEY")

date = (datetime.date.today() + datetime.timedelta(days=7)).strftime("%Y-%m-%d")
params = {
  "engine": "google_flights",
  "departure_id": "DEL",
  "arrival_id": "BOM", # Let's test BOM first
  "outbound_date": date,
  "currency": "INR",
  "hl": "en",
  "api_key": api_key
}

res = requests.get("https://serpapi.com/search", params=params)
print("FLIGHTS (BOM):", res.json().get("error", "SUCCESS"))

params["arrival_id"] = "Mumbai"
res = requests.get("https://serpapi.com/search", params=params)
print("FLIGHTS (Mumbai):", res.json().get("error", "SUCCESS"))

check_in = datetime.date.today().strftime("%Y-%m-%d")
check_out = (datetime.date.today() + datetime.timedelta(days=3)).strftime("%Y-%m-%d")
params_hotel = {
  "engine": "google_hotels",
  "q": "Mumbai",
  "check_in_date": check_in,
  "check_out_date": check_out,
  "currency": "INR",
  "hl": "en",
  "api_key": api_key
}
res = requests.get("https://serpapi.com/search", params=params_hotel)
print("HOTELS (Mumbai):", res.json().get("error", "SUCCESS"))
