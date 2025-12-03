/*
 * Arduino Terrarium Sensor Monitor
 * 
 * Reads sensor data and sends to server via ESP8266 WiFi module or Ethernet shield.
 * 
 * Hardware:
 * - DHT22: Temperature/Humidity sensor (VCC, GND, Data to pin 2)
 * - BH1750: Light sensor (I2C: SDA to A4, SCL to A5 on Uno)
 * - ESP8266 or Ethernet shield for network connectivity
 * 
 * Libraries needed:
 * - DHT sensor library by Adafruit
 * - BH1750 library by Christopher Laws
 * - ArduinoJson by Benoit Blanchon
 * - ESP8266WiFi (if using ESP8266) or Ethernet (if using Ethernet shield)
 * 
 * Install via Arduino Library Manager
 */

#include <DHT.h>
#include <Wire.h>
#include <BH1750.h>
#include <ArduinoJson.h>

// WiFi configuration (for ESP8266)
#ifdef ESP8266
  #include <ESP8266WiFi.h>
  #include <ESP8266HTTPClient.h>
  #include <WiFiClient.h>
  const char* ssid = "YOUR_WIFI_SSID";
  const char* password = "YOUR_WIFI_PASSWORD";
#else
  // For Arduino with Ethernet shield
  #include <Ethernet.h>
  byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };
  EthernetClient ethClient;
#endif

// Server configuration
const char* serverHost = "192.168.1.100"; // Change to your server IP
const int serverPort = 3000;
const char* serverPath = "/sensors/update";

// Device configuration
const int DEVICE_ID = 0;
const char* DEVICE_NAME = "Arduino Garden";
const char* PLANT_TYPE = "허브류";

// Sensor pins
#define DHTPIN 2
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);
BH1750 lightMeter;

// Timing
unsigned long lastPost = 0;
const unsigned long POST_INTERVAL = 5000; // 5 seconds

void setup() {
  Serial.begin(115200);
  Serial.println("Arduino Terrarium Sensor Monitor");
  
  // Initialize sensors
  dht.begin();
  Wire.begin();
  lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  
  Serial.println("Sensors initialized");
  
  // Connect to network
  #ifdef ESP8266
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }
    Serial.println("\nWiFi connected");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  #else
    if (Ethernet.begin(mac) == 0) {
      Serial.println("Failed to configure Ethernet using DHCP");
      // Try to configure with a static IP
      IPAddress ip(192, 168, 1, 177);
      Ethernet.begin(mac, ip);
    }
    Serial.print("IP: ");
    Serial.println(Ethernet.localIP());
  #endif
  
  Serial.println("Ready to send data");
}

void loop() {
  unsigned long now = millis();
  
  if (now - lastPost >= POST_INTERVAL) {
    lastPost = now;
    
    // Read sensors
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    float lux = lightMeter.readLightLevel();
    
    // Check if reads failed
    if (isnan(temp) || isnan(hum)) {
      Serial.println("Failed to read from DHT sensor!");
      return;
    }
    
    // Print readings
    Serial.print("Temp: ");
    Serial.print(temp, 1);
    Serial.print("°C, Hum: ");
    Serial.print(hum, 1);
    Serial.print("%, Lux: ");
    Serial.println(lux, 0);
    
    // Send to server
    sendToServer(temp, hum, lux);
  }
}

void sendToServer(float temp, float hum, float lux) {
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["id"] = DEVICE_ID;
  doc["name"] = DEVICE_NAME;
  doc["plantType"] = PLANT_TYPE;
  doc["temp"] = round(temp * 10) / 10.0; // Round to 1 decimal
  doc["hum"] = round(hum * 10) / 10.0;
  doc["lux"] = (int)lux;
  doc["timestamp"] = millis();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  #ifdef ESP8266
    // ESP8266 HTTP POST
    if (WiFi.status() == WL_CONNECTED) {
      WiFiClient client;
      HTTPClient http;
      
      String url = String("http://") + serverHost + ":" + serverPort + serverPath;
      http.begin(client, url);
      http.addHeader("Content-Type", "application/json");
      
      int httpCode = http.POST(jsonString);
      
      if (httpCode > 0) {
        Serial.print("HTTP Response: ");
        Serial.println(httpCode);
        if (httpCode == HTTP_CODE_OK) {
          String response = http.getString();
          Serial.println("Server response: " + response);
        }
      } else {
        Serial.print("HTTP POST failed: ");
        Serial.println(http.errorToString(httpCode));
      }
      
      http.end();
    } else {
      Serial.println("WiFi not connected!");
    }
  #else
    // Ethernet HTTP POST
    if (ethClient.connect(serverHost, serverPort)) {
      ethClient.print("POST ");
      ethClient.print(serverPath);
      ethClient.println(" HTTP/1.1");
      ethClient.print("Host: ");
      ethClient.print(serverHost);
      ethClient.print(":");
      ethClient.println(serverPort);
      ethClient.println("Content-Type: application/json");
      ethClient.print("Content-Length: ");
      ethClient.println(jsonString.length());
      ethClient.println("Connection: close");
      ethClient.println();
      ethClient.println(jsonString);
      
      // Wait for response
      unsigned long timeout = millis();
      while (ethClient.available() == 0) {
        if (millis() - timeout > 5000) {
          Serial.println("Timeout!");
          ethClient.stop();
          return;
        }
      }
      
      // Read response
      while (ethClient.available()) {
        String line = ethClient.readStringUntil('\r');
        Serial.print(line);
      }
      Serial.println();
      
      ethClient.stop();
      Serial.println("Data sent successfully");
    } else {
      Serial.println("Connection to server failed");
    }
  #endif
}
