Pi/Arduino examples

이 폴더는 라즈베리파이와 아두이노에서 센서 데이터를 읽어 서버로 전송하는 예제를 포함합니다.

## 📁 파일 목록

- `pi_post_sensor.py` - 라즈베리파이 센서 모니터 (DHT22, BH1750 지원)
- `pi_lcd_client.py` - LCD 비디오 플레이어 클라이언트
- `arduino_sensor.ino` - 아두이노 센서 스케치 (ESP8266/Ethernet 지원)

---

## 🔌 하드웨어 연결

### 라즈베리파이 + DHT22 + BH1750

**DHT22 (온습도 센서)**
- VCC → 3.3V (Pin 1)
- GND → Ground (Pin 6)
- DATA → GPIO 4 (Pin 7)
- 10kΩ pull-up 저항을 DATA와 VCC 사이에 연결 권장

**BH1750 (조도 센서)**
- VCC → 3.3V (Pin 1)
- GND → Ground (Pin 9)
- SDA → GPIO 2 (SDA, Pin 3)
- SCL → GPIO 3 (SCL, Pin 5)

### 아두이노 + DHT22 + BH1750

**DHT22**
- VCC → 5V
- GND → GND
- DATA → Digital Pin 2
- 10kΩ pull-up 저항 권장

**BH1750**
- VCC → 5V
- GND → GND
- SDA → A4 (Uno) 또는 SDA 핀
- SCL → A5 (Uno) 또는 SCL 핀

---

## 🚀 라즈베리파이 설정

### 1. 필요한 라이브러리 설치

```bash
# 기본 패키지
pip install requests

# DHT22 센서 (선택)
pip install Adafruit-DHT

# BH1750 조도 센서 (선택)
pip install smbus2

# I2C 활성화 (라즈비안)
sudo raspi-config
# → Interface Options → I2C → Enable
```

### 2. 센서 연결 테스트

```bash
# I2C 장치 확인 (BH1750은 0x23 주소로 표시되어야 함)
i2cdetect -y 1

# DHT22 테스트
python3 -c "import Adafruit_DHT; h,t=Adafruit_DHT.read_retry(Adafruit_DHT.DHT22, 4); print(f'Temp: {t}C, Humidity: {h}%')"
```

### 3. 센서 모니터 실행

```bash
# pi_post_sensor.py 수정: SERVER_URL을 서버 IP로 변경
nano pi_post_sensor.py

# 단일 측정
python3 pi_post_sensor.py

# 연속 모니터링 (5초 간격)
python3 pi_post_sensor.py --continuous
```

### 4. 자동 시작 설정 (systemd)

```bash
# 서비스 파일 생성
sudo nano /etc/systemd/system/terrarium-sensor.service
```

다음 내용 입력:

```ini
[Unit]
Description=Terrarium Sensor Monitor
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/terrarium/healing-garden/server/examples
ExecStart=/usr/bin/python3 pi_post_sensor.py --continuous
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# 서비스 활성화
sudo systemctl enable terrarium-sensor
sudo systemctl start terrarium-sensor

# 상태 확인
sudo systemctl status terrarium-sensor

# 로그 확인
sudo journalctl -u terrarium-sensor -f
```

---

## 🎮 아두이노 설정

### 1. Arduino IDE 라이브러리 설치

**라이브러리 매니저**에서 다음 설치:
- DHT sensor library (Adafruit)
- Adafruit Unified Sensor
- BH1750 (Christopher Laws)
- ArduinoJson (Benoit Blanchon)

**ESP8266 보드** (WiFi 사용 시):
- 파일 → 환경설정 → 추가 보드 매니저 URLs에 추가:
  ```
  http://arduino.esp8266.com/stable/package_esp8266com_index.json
  ```
- 도구 → 보드 → 보드 매니저에서 "esp8266" 검색 후 설치

### 2. 스케치 설정

`arduino_sensor.ino` 파일을 열고 다음을 수정:

```cpp
// WiFi 설정 (ESP8266 사용 시)
const char* ssid = "YOUR_WIFI_SSID";      // WiFi 이름
const char* password = "YOUR_WIFI_PASSWORD";  // WiFi 비밀번호

// 서버 설정
const char* serverHost = "192.168.1.100";  // 서버 IP 주소로 변경
const int serverPort = 3000;

// 장치 설정
const int DEVICE_ID = 0;  // 앱의 테라리움 인덱스와 일치
```

### 3. 업로드 및 실행

1. 아두이노 연결
2. 도구 → 보드 선택 (예: Arduino Uno 또는 NodeMCU 1.0)
3. 도구 → 포트 선택
4. 업로드 버튼 클릭
5. 시리얼 모니터 열기 (115200 baud)

---

## 🧪 테스트

### 서버 로그 확인

```bash
cd healing-garden/server
node index.js
# 센서 데이터가 수신되면 "sensor update" 로그가 표시됨
```

### 앱에서 확인

1. `npx expo start`로 앱 실행
2. 홈 화면에서 센서 값이 자동으로 업데이트되는지 확인 (5초 간격)
3. 제어 화면에서 실시간 데이터 확인 (3초 간격)

---

## 🔧 문제 해결

### 라즈베리파이

**I2C 장치가 감지되지 않음**
```bash
sudo apt-get install i2c-tools
sudo i2cdetect -y 1
# BH1750이 0x23에 표시되어야 함
```

**DHT22 읽기 실패**
- 연결 확인 (특히 pull-up 저항)
- 센서 전원 재연결
- GPIO 핀 번호 확인 (BCM 모드 사용)

**권한 오류**
```bash
sudo usermod -a -G i2c,gpio pi
# 재로그인 필요
```

### 아두이노

**컴파일 오류**
- 필요한 모든 라이브러리가 설치되었는지 확인
- ESP8266 보드 정의 설치 확인

**WiFi 연결 실패**
- SSID와 비밀번호 확인
- 2.4GHz WiFi 사용 (5GHz는 ESP8266에서 지원 안 됨)

**서버 연결 실패**
- 서버 IP와 포트 확인
- 방화벽 설정 확인
- 네트워크에서 서버 접근 가능한지 확인

---

## 📊 데이터 흐름

```
[센서] → [Pi/Arduino] → HTTP POST → [서버 :3000/sensors/update]
                                            ↓
                                    [메모리 저장/DB]
                                            ↓
[앱] ← HTTP GET ← [서버 :3000/sensors/:id/latest]
```

---

## 💡 추가 기능

- `pi_lcd_client.py`로 LCD에 비디오 재생 (별도 문서 참조)
- cron으로 정기적 재시작 설정
- 여러 센서 추가 (토양 수분, CO2 등)
- MQTT 프로토콜로 변경하여 실시간성 향상
