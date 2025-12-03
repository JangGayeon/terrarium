"""
Raspberry Pi example: post a sensor snapshot to the sample server.
Requires: requests (pip install requests)

Hardware support (install as needed):
  - DHT22 temperature/humidity sensor: pip install Adafruit-DHT
  - BH1750 light sensor: pip install smbus2

Edit SERVER_URL and DEVICE_ID as needed.
Run: python pi_post_sensor.py

For continuous monitoring, run in a loop or use cron/systemd timer.
"""

import time
import json
import requests
import sys

# Configure these
SERVER_URL = "http://localhost:3000"  # change if your server is hosted elsewhere
DEVICE_ID = 0  # integer id matching the terrarium index in the app
DEVICE_NAME = "로오즈마아리"
PLANT_TYPE = "허브류"
POLL_INTERVAL = 5  # seconds between sensor readings

# Sensor configuration
USE_DHT22 = True  # set to False if no DHT22 connected
DHT_PIN = 4  # GPIO pin for DHT22 data line
USE_BH1750 = True  # set to False if no BH1750 connected

# Try to import sensor libraries
DHT_sensor = None
BH1750_sensor = None

if USE_DHT22:
    try:
        import Adafruit_DHT
        DHT_sensor = Adafruit_DHT.DHT22
        print("✓ DHT22 sensor library loaded")
    except ImportError:
        print("⚠ Adafruit_DHT not installed. Install with: pip install Adafruit-DHT")
        USE_DHT22 = False

if USE_BH1750:
    try:
        import smbus2
        BH1750_sensor = smbus2.SMBus(1)  # I2C bus 1
        BH1750_ADDR = 0x23
        print("✓ BH1750 light sensor library loaded")
    except ImportError:
        print("⚠ smbus2 not installed. Install with: pip install smbus2")
        USE_BH1750 = False

def read_dht22():
    """Read temperature and humidity from DHT22 sensor."""
    if not USE_DHT22 or not DHT_sensor:
        return None, None
    
    try:
        humidity, temperature = Adafruit_DHT.read_retry(DHT_sensor, DHT_PIN, retries=3, delay_seconds=2)
        if humidity is not None and temperature is not None:
            return round(temperature, 1), round(humidity, 1)
    except Exception as e:
        print(f"DHT22 read error: {e}")
    return None, None

def read_bh1750():
    """Read light level from BH1750 sensor."""
    if not USE_BH1750 or not BH1750_sensor:
        return None
    
    try:
        # BH1750 continuous high-res mode
        BH1750_sensor.write_byte(BH1750_ADDR, 0x10)
        time.sleep(0.2)
        data = BH1750_sensor.read_i2c_block_data(BH1750_ADDR, 0x00, 2)
        lux = (data[0] << 8 | data[1]) / 1.2
        return round(lux, 0)
    except Exception as e:
        print(f"BH1750 read error: {e}")
    return None

def get_sensor_snapshot():
    """Get current sensor readings from hardware or generate mock data."""
    temp, hum = read_dht22()
    lux = read_bh1750()
    
    # Fallback to mock data if sensors not available
    if temp is None:
        temp = 22 + (time.time() % 10 - 5) * 0.5  # simulate variation
        print(f"⚠ Using mock temperature: {temp:.1f}°C")
    if hum is None:
        hum = 55 + (time.time() % 20 - 10) * 0.8
        print(f"⚠ Using mock humidity: {hum:.1f}%")
    if lux is None:
        lux = 120 + (time.time() % 30 - 15) * 2
        print(f"⚠ Using mock light: {lux:.0f} lx")
    
    return {
        "id": DEVICE_ID,
        "name": DEVICE_NAME,
        "plantType": PLANT_TYPE,
        "temp": round(temp, 1),
        "hum": round(hum, 1),
        "lux": int(lux),
        "timestamp": int(time.time() * 1000),
    }


def post_snapshot(snapshot):
    """Send sensor snapshot to server."""
    url = f"{SERVER_URL}/sensors/update"
    try:
        r = requests.post(url, json=snapshot, timeout=5)
        r.raise_for_status()
        print(f"✓ Posted: {snapshot['temp']}°C, {snapshot['hum']}%, {snapshot['lux']}lx")
        return True
    except requests.exceptions.ConnectionError:
        print("✗ Connection failed: Is the server running?")
    except Exception as e:
        print(f"✗ Failed to post snapshot: {e}")
    return False


if __name__ == '__main__':
    print(f"Starting sensor monitor for device {DEVICE_ID} ({DEVICE_NAME})")
    print(f"Server: {SERVER_URL}")
    print(f"Sensors: DHT22={'enabled' if USE_DHT22 else 'disabled'}, BH1750={'enabled' if USE_BH1750 else 'disabled'}")
    print(f"Poll interval: {POLL_INTERVAL}s")
    print("-" * 50)
    
    # Run single snapshot or continuous loop
    continuous = '--continuous' in sys.argv or '-c' in sys.argv
    
    try:
        if continuous:
            print("Running in continuous mode (Ctrl+C to stop)")
            while True:
                snap = get_sensor_snapshot()
                post_snapshot(snap)
                time.sleep(POLL_INTERVAL)
        else:
            # Single reading
            snap = get_sensor_snapshot()
            post_snapshot(snap)
            print("\nTip: Run with --continuous flag for continuous monitoring")
    except KeyboardInterrupt:
        print("\n\nStopped by user")
        sys.exit(0)
