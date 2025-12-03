# 라즈베리파이 하드웨어 제어 설정 가이드

## 1. 필요한 패키지 설치

```bash
# Python 패키지 설치
pip3 install firebase-admin RPi.GPIO

# 또는 requirements.txt 사용
pip3 install -r requirements.txt
```

## 2. Firebase Service Account Key 다운로드

1. Firebase 콘솔 접속: https://console.firebase.google.com/
2. 프로젝트 선택: `raspberry-sensor-b2856`
3. ⚙️ (설정) > 프로젝트 설정 > 서비스 계정
4. "새 비공개 키 생성" 클릭
5. JSON 파일 다운로드
6. 라즈베리파이로 복사:

```bash
# 로컬 PC에서 실행 (파일 이름은 다를 수 있음)
scp raspberry-sensor-b2856-firebase-adminsdk-xxxxx.json pi@raspberrypi.local:/home/pi/serviceAccountKey.json
```

## 3. 하드웨어 연결

### GPIO 핀 배치 (BCM 모드)
- **GPIO 17**: 환기팬 릴레이 (Fan)
- **GPIO 18**: 워터펌프 릴레이 (Water Pump)
- **GPIO 27**: LED 조명 (Grow Light)

### 회로 구성
```
라즈베리파이              릴레이 모듈           장치
GPIO 17 -----> IN1 -----> 환기팬
GPIO 18 -----> IN2 -----> 워터펌프
GPIO 27 -----> IN3 -----> LED 조명
GND ---------> GND
5V ----------> VCC
```

**주의사항:**
- 릴레이 모듈은 HIGH 트리거 방식 사용
- 고전류 장치는 반드시 릴레이를 통해 연결
- 전원 공급이 충분한지 확인 (5V 2A 이상 권장)

## 4. 스크립트 실행

### 수동 실행
```bash
cd /home/pi/terrarium/healing-garden/server/examples
python3 pi_hardware_control.py
```

### 자동 실행 (부팅 시)

#### systemd 서비스 생성
```bash
sudo nano /etc/systemd/system/terrarium-control.service
```

다음 내용 입력:
```ini
[Unit]
Description=Terrarium Hardware Control Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/terrarium/healing-garden/server/examples
ExecStart=/usr/bin/python3 /home/pi/terrarium/healing-garden/server/examples/pi_hardware_control.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### 서비스 활성화
```bash
# 서비스 등록
sudo systemctl daemon-reload

# 서비스 시작
sudo systemctl start terrarium-control

# 부팅 시 자동 실행 설정
sudo systemctl enable terrarium-control

# 상태 확인
sudo systemctl status terrarium-control

# 로그 확인
sudo journalctl -u terrarium-control -f
```

## 5. 테스트

### 앱에서 테스트
1. Healing Garden 앱 실행
2. "제어하기" 메뉴로 이동
3. 환기팬, 워터펌프, 조명 토글 ON/OFF
4. 라즈베리파이에서 실제 장치 동작 확인

### 콘솔 로그 확인
```bash
# 실시간 로그 보기
sudo journalctl -u terrarium-control -f

# 최근 로그 보기
sudo journalctl -u terrarium-control -n 50
```

## 6. 트러블슈팅

### Firebase 연결 실패
```
❌ Firebase 연결 실패: Could not load credentials
```
**해결:** serviceAccountKey.json 파일 경로 확인
```bash
ls -l /home/pi/serviceAccountKey.json
```

### GPIO 권한 오류
```
❌ RuntimeError: Not running on a RPi!
```
**해결:** 실제 라즈베리파이에서만 실행 가능 (테스트 모드 필요 시 코드 수정)

### 장치가 동작하지 않음
1. GPIO 핀 번호 확인 (BCM 모드)
2. 릴레이 모듈 VCC/GND 연결 확인
3. 릴레이 트리거 방식 확인 (HIGH/LOW)
4. 전원 공급 확인

```bash
# GPIO 상태 확인
gpio readall
```

### 서비스 재시작
```bash
sudo systemctl restart terrarium-control
```

### 서비스 중지
```bash
sudo systemctl stop terrarium-control
```

## 7. 안전 종료

프로그램 종료 시 모든 장치가 자동으로 OFF 됩니다.

**수동 실행 중**: `Ctrl+C`
**서비스 중지**: `sudo systemctl stop terrarium-control`

## 8. 추가 기능

### PWM으로 LED 밝기 제어 (고급)
현재는 ON/OFF만 지원. PWM을 사용하려면:

```python
# GPIO 27을 PWM으로 설정
pwm = GPIO.PWM(LIGHT_PIN, 1000)  # 1kHz 주파수
pwm.start(0)

# 밝기 조절 (0-100%)
duty_cycle = (brightness / 255) * 100
pwm.ChangeDutyCycle(duty_cycle)
```

### RGB LED 제어
`led_color` 값 (`#RRGGBB`)을 파싱하여 RGB LED 제어 가능

## 9. 파일 구조

```
server/examples/
├── pi_hardware_control.py          # 메인 제어 스크립트
├── HARDWARE_SETUP.md               # 이 문서
├── requirements.txt                # Python 패키지 목록
└── /home/pi/serviceAccountKey.json # Firebase 인증 키 (별도 다운로드)
```

## 10. 문의

문제가 발생하면 로그를 확인하고, GPIO 연결과 Firebase 설정을 재확인하세요.
