"""
Raspberry Pi example: post a sensor snapshot to the sample server.
Requires: requests (pip install requests)

Edit SERVER_URL and DEVICE_ID as needed.
Run: python pi_post_sensor.py
"""

import time
import json
import requests

# Configure these
SERVER_URL = "http://localhost:3000"  # change if your server is hosted elsewhere
DEVICE_ID = 0  # integer id matching the terrarium index in the app
DEVICE_NAME = "로오즈마아리"
PLANT_TYPE = "허브류"

# Example payload generator (replace with real sensor reads)

def get_sensor_snapshot():
    # Replace the following with real sensor readings (DHT22, BH1750, etc.)
    return {
        "id": DEVICE_ID,
        "name": DEVICE_NAME,
        "plantType": PLANT_TYPE,
        "temp": 23.5,
        "hum": 58,
        "lux": 120,
        "timestamp": int(time.time() * 1000),
    }


def post_snapshot(snapshot):
    url = f"{SERVER_URL}/sensors/update"
    try:
        r = requests.post(url, json=snapshot, timeout=5)
        r.raise_for_status()
        print("Posted snapshot:", snapshot)
        print("Server response:", r.json())
    except Exception as e:
        print("Failed to post snapshot:", e)


if __name__ == '__main__':
    snap = get_sensor_snapshot()
    post_snapshot(snap)
