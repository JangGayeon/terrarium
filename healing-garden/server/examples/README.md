Pi/Arduino examples

This folder contains a minimal Raspberry Pi example script that posts a single sensor snapshot to the example server's `/sensors/update` endpoint.

Usage:

1. Install requests: `pip install requests`
2. Edit `pi_post_sensor.py` and set `SERVER_URL` and `DEVICE_ID` as needed.
3. Run: `python pi_post_sensor.py`

Replace the `get_sensor_snapshot()` function with real sensor readings from your hardware (DHT sensors, light sensors, etc.).
