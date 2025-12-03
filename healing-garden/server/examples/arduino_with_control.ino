/*
 * Arduino Terrarium Sensor Monitor + Control
 * 
 * - Reads sensor data and sends to Firestore
 * - Receives control commands from Firestore
 * - Controls: LED, Water Pump, Heater, Fan
 * 
 * Hardware:
 * - DHT22: Temperature/Humidity sensor (pin 2)
 * - BH1750: Light sensor (I2C: SDA, SCL)
 * - LED (WS2812B/NeoPixel): pin 5
 * - Water Pump Relay: pin 6
 * - Heater Relay: pin 7
 * - Fan Relay: pin 8
 * - ESP32/ESP8266 for WiFi + Firebase
 * 
 * Libraries needed:
 * - DHT sensor library
 * - BH1750 library
 * - ArduinoJson
 * - Firebase ESP Client by Mobizt (https://github.com/mobizt/Firebase-ESP-Client)
 * - Adafruit NeoPixel (for LED control)
 */

#include <Arduino.h>
#include <WiFi.h>  // Use ESP8266WiFi.h for ESP8266
#include <Firebase_ESP_Client.h>
#include <DHT.h>
#include <Wire.h>
#include <BH1750.h>
#include <Adafruit_NeoPixel.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// WiFi credentials
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Firebase project credentials
#define API_KEY "AIzaSyD8QAwiQc8b0PzvutVNsU0fGaSSwiAqkhk"
#define FIREBASE_PROJECT_ID "raspberry-sensor-b2856"
#define USER_EMAIL "your-email@example.com"  // Firebase Auth 사용자
#define USER_PASSWORD "your-password"        // Firebase Auth 비밀번호

// Sensor pins
#define DHTPIN 2
#define DHTTYPE DHT22

// Control pins
#define LED_PIN 5
#define LED_COUNT 16
#define PUMP_PIN 6
#define HEATER_PIN 7
#define FAN_PIN 8

// Device info
const String DEVICE_ID = "rosemary_terrarium";

// Objects
DHT dht(DHTPIN, DHTTYPE);
BH1750 lightMeter;
Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Timing
unsigned long lastSensorRead = 0;
unsigned long lastControlCheck = 0;
const unsigned long SENSOR_INTERVAL = 10000;  // 10초마다 센서 읽기
const unsigned long CONTROL_INTERVAL = 2000;   // 2초마다 제어 명령 확인

// Current states
bool pumpOn = false;
bool heaterOn = false;
bool fanOn = false;
uint8_t ledBrightness = 128;
uint32_t ledColor = strip.Color(255, 200, 100); // 기본 따뜻한 색

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=== Arduino Terrarium Control System ===");
  
  // Initialize pins
  pinMode(PUMP_PIN, OUTPUT);
  pinMode(HEATER_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW);
  digitalWrite(HEATER_PIN, LOW);
  digitalWrite(FAN_PIN, LOW);
  
  // Initialize LED strip
  strip.begin();
  strip.setBrightness(ledBrightness);
  strip.show(); // Off initially
  
  // Initialize sensors
  dht.begin();
  Wire.begin();
  lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  Serial.println("✓ Sensors initialized");
  
  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✓ WiFi connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  
  // Configure Firebase
  config.api_key = API_KEY;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.token_status_callback = tokenStatusCallback;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  Serial.println("✓ Firebase initialized");
  Serial.println("=== System Ready ===\n");
}

void loop() {
  unsigned long now = millis();
  
  // 센서 데이터 읽기 & Firebase 업로드
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = now;
    readAndUploadSensors();
  }
  
  // 제어 명령 확인 & 실행
  if (now - lastControlCheck >= CONTROL_INTERVAL) {
    lastControlCheck = now;
    checkAndExecuteCommands();
  }
}

// 센서 데이터 읽고 Firestore에 업로드
void readAndUploadSensors() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  float lux = lightMeter.readLightLevel();
  
  if (isnan(temp) || isnan(hum)) {
    Serial.println("❌ DHT sensor read failed");
    return;
  }
  
  Serial.printf("📊 Temp: %.1f°C | Hum: %.1f%% | Light: %.0f lux\n", temp, hum, lux);
  
  // Firestore 문서 경로: sensor_data 컬렉션에 타임스탬프로 새 문서 생성
  String documentPath = "sensor_data/" + String(millis());
  
  FirebaseJson content;
  content.set("fields/temperature/doubleValue", temp);
  content.set("fields/humidity/doubleValue", hum);
  content.set("fields/light_level/doubleValue", lux);
  content.set("fields/hw038_moisture/integerValue", 0);  // 습도 센서 없으면 0
  content.set("fields/timestamp/timestampValue", getISOTimestamp());
  content.set("fields/device_id/stringValue", DEVICE_ID);
  
  if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", documentPath.c_str(), content.raw())) {
    Serial.println("✓ Data uploaded to Firestore");
  } else {
    Serial.println("❌ Upload failed: " + fbdo.errorReason());
  }
}

// Firestore에서 제어 명령 확인 & 실행
void checkAndExecuteCommands() {
  // device_control/rosemary_terrarium 문서 읽기
  String documentPath = "device_control/" + DEVICE_ID;
  
  if (Firebase.Firestore.getDocument(&fbdo, FIREBASE_PROJECT_ID, "", documentPath.c_str())) {
    FirebaseJson json;
    json.setJsonData(fbdo.payload());
    
    FirebaseJsonData result;
    
    // 워터펌프 제어
    if (json.get(result, "fields/water_pump/booleanValue")) {
      bool newState = result.boolValue;
      if (newState != pumpOn) {
        pumpOn = newState;
        digitalWrite(PUMP_PIN, pumpOn ? HIGH : LOW);
        Serial.printf("💧 Water Pump: %s\n", pumpOn ? "ON" : "OFF");
      }
    }
    
    // 히터 제어
    if (json.get(result, "fields/heater/booleanValue")) {
      bool newState = result.boolValue;
      if (newState != heaterOn) {
        heaterOn = newState;
        digitalWrite(HEATER_PIN, heaterOn ? HIGH : LOW);
        Serial.printf("🔥 Heater: %s\n", heaterOn ? "ON" : "OFF");
      }
    }
    
    // 환기팬 제어
    if (json.get(result, "fields/fan/booleanValue")) {
      bool newState = result.boolValue;
      if (newState != fanOn) {
        fanOn = newState;
        digitalWrite(FAN_PIN, fanOn ? HIGH : LOW);
        Serial.printf("🌀 Fan: %s\n", fanOn ? "ON" : "OFF");
      }
    }
    
    // LED 밝기 제어
    if (json.get(result, "fields/led_brightness/integerValue")) {
      ledBrightness = result.intValue;
      strip.setBrightness(ledBrightness);
      strip.show();
      Serial.printf("💡 LED Brightness: %d\n", ledBrightness);
    }
    
    // LED 색상 제어 (hex string: "#RRGGBB")
    if (json.get(result, "fields/led_color/stringValue")) {
      String colorHex = result.stringValue;
      ledColor = hexToColor(colorHex);
      setAllPixels(ledColor);
      Serial.printf("🎨 LED Color: %s\n", colorHex.c_str());
    }
    
  } else {
    // 문서가 없으면 초기 문서 생성
    if (fbdo.errorReason().indexOf("NOT_FOUND") >= 0) {
      Serial.println("📝 Creating initial control document...");
      createInitialControlDoc();
    }
  }
}

// 초기 제어 문서 생성
void createInitialControlDoc() {
  String documentPath = "device_control/" + DEVICE_ID;
  
  FirebaseJson content;
  content.set("fields/water_pump/booleanValue", false);
  content.set("fields/heater/booleanValue", false);
  content.set("fields/fan/booleanValue", false);
  content.set("fields/led_brightness/integerValue", 128);
  content.set("fields/led_color/stringValue", "#FFC864");
  content.set("fields/device_id/stringValue", DEVICE_ID);
  content.set("fields/last_updated/timestampValue", getISOTimestamp());
  
  Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", documentPath.c_str(), content.raw());
}

// LED 전체 색상 설정
void setAllPixels(uint32_t color) {
  for (int i = 0; i < strip.numPixels(); i++) {
    strip.setPixelColor(i, color);
  }
  strip.show();
}

// Hex color string을 RGB로 변환
uint32_t hexToColor(String hex) {
  // "#RRGGBB" 형식
  hex.replace("#", "");
  long number = strtol(hex.c_str(), NULL, 16);
  uint8_t r = (number >> 16) & 0xFF;
  uint8_t g = (number >> 8) & 0xFF;
  uint8_t b = number & 0xFF;
  return strip.Color(r, g, b);
}

// ISO 8601 타임스탬프 생성
String getISOTimestamp() {
  time_t now = time(nullptr);
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}
