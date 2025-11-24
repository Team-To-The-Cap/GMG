from dotenv import load_dotenv
import os

load_dotenv()

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

client_id = os.getenv("client_id")
client_secret = os.getenv("client_secret")