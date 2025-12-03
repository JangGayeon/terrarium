# 🔥 Firebase 실시간 센서 데이터 연동 가이드

라즈베리파이에서 아두이노 센서 데이터를 Firebase로 전송하고, 앱에서 실시간으로 받아오는 완전한 가이드입니다.

---

## 📋 시스템 구조

```
[아두이노] → (5분 간격) → [라즈베리파이] → [JSON 파일 저장]
                                    ↓
                            [Firebase 업로드]
                                    ↓
                            [Firebase Realtime DB]
                                    ↓
                         [모바일 앱] (실시간 리스너)
```

---

## 🚀 1단계: Firebase 프로젝트 설정

### 1.1 Firebase 프로젝트 생성

1. [Firebase 콘솔](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: terrarium-monitor)
4. Google Analytics 설정 (선택사항)
5. 프로젝트 생성 완료

### 1.2 Realtime Database 생성

1. Firebase 콘솔 > 빌드 > Realtime Database
2. "데이터베이스 만들기" 클릭
3. 위치 선택 (asia-southeast1 권장)
4. 보안 규칙 선택:
   - **테스트 모드**: 개발 중 사용 (30일 후 만료)
   - **잠금 모드**: 나중에 규칙 설정

### 1.3 웹 앱 구성 정보 가져오기

1. 프로젝트 설정 (⚙️) > 일반
2. "내 앱" 섹션에서 웹 아이콘(</>)  클릭
3. 앱 닉네임 입력 (예: terrarium-app)
4. Firebase SDK 구성 정보 복사

### 1.4 서비스 계정 키 생성 (라즈베리파이용)

1. 프로젝트 설정 (⚙️) > 서비스 계정
2. "새 비공개 키 생성" 클릭
3. JSON 파일 다운로드
4. 파일 이름을 `serviceAccountKey.json`으로 변경

---

## 📱 2단계: 모바일 앱 설정

### 2.1 Firebase 구성 정보 입력

`healing-garden/firebaseConfig.js` 파일을 열어 Firebase 콘솔에서 복사한 정보로 수정:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "terrarium-monitor.firebaseapp.com",
  databaseURL: "https://terrarium-monitor-default-rtdb.firebaseio.com",
  projectId: "terrarium-monitor",
  storageBucket: "terrarium-monitor.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxxxxxxxxxxx"
};
```

### 2.2 앱 실행 및 테스트

```bash
cd healing-garden
npm install
npx expo start
```

---

## 🥧 3단계: 라즈베리파이 설정

### 3.1 필요한 패키지 설치

```bash
# Firebase Admin SDK 설치
pip3 install firebase-admin

# 기타 필요한 패키지
pip3 install requests
```

### 3.2 서비스 계정 키 파일 복사

Firebase에서 다운로드한 `serviceAccountKey.json` 파일을 라즈베리파이로 복사:

```bash
# 로컬 PC에서 라즈베리파이로 전송
scp serviceAccountKey.json pi@raspberrypi.local:~/terrarium/

# 또는 라즈베리파이에서 직접 다운로드
# USB, 이메일, Google Drive 등 활용
```

### 3.3 업로드 스크립트 설정

`upload_to_firebase.py` 파일 수정:

```python
# Firebase Realtime Database URL (Firebase 콘솔에서 확인)
DATABASE_URL = "https://terrarium-monitor-default-rtdb.firebaseio.com"

# 아두이노 JSON 파일 경로
ARDUINO_JSON_PATH = "/home/pi/arduino_data/sensor_data.json"

# 업로드 간격 (초) - 아두이노 간격과 맞춤
UPLOAD_INTERVAL = 300  # 5분
```

### 3.4 스크립트 실행 테스트

```bash
# 단일 업로드 테스트
python3 upload_to_firebase.py

# 연속 모드 (5분마다 자동 업로드)
python3 upload_to_firebase.py --continuous

# 파일 변경 감지 모드 (파일이 변경될 때마다 즉시 업로드)
python3 upload_to_firebase.py --watch
```

### 3.5 자동 시작 설정 (systemd)

systemd 서비스 파일 생성:

```bash
sudo nano /etc/systemd/system/firebase-uploader.service
```

다음 내용 입력:

```ini
[Unit]
Description=Firebase Sensor Data Uploader
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/terrarium/healing-garden/server/examples
ExecStart=/usr/bin/python3 upload_to_firebase.py --continuous
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
```

서비스 활성화:

```bash
# 서비스 활성화
sudo systemctl enable firebase-uploader

# 서비스 시작
sudo systemctl start firebase-uploader

# 상태 확인
sudo systemctl status firebase-uploader

# 로그 확인
sudo journalctl -u firebase-uploader -f
```

---

## 📊 4단계: Firebase 데이터 구조

### 권장 데이터 구조

```json
{
  "sensors": {
    "device_0": {
      "id": 0,
      "name": "로오즈마아리",
      "plantType": "허브류",
      "temp": 23.5,
      "hum": 58.0,
      "lux": 120,
      "timestamp": 1700000000000,
      "lastUpdated": "2025-11-25T10:30:00"
    },
    "device_1": {
      "id": 1,
      "name": "민트정원",
      "plantType": "허브류",
      "temp": 22.1,
      "hum": 62.5,
      "lux": 150,
      "timestamp": 1700000000000,
      "lastUpdated": "2025-11-25T10:30:00"
    }
  }
}
```

### 보안 규칙 설정

Firebase 콘솔 > Realtime Database > 규칙 탭:

```json
{
  "rules": {
    "sensors": {
      "$device_id": {
        ".read": true,
        ".write": "auth != null"
      }
    }
  }
}
```

개발 단계에서는 모두 허용:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

⚠️ **주의**: 프로덕션에서는 적절한 인증 및 규칙 설정 필요!

---

## 🧪 5단계: 테스트 및 디버깅

### 5.1 Firebase 콘솔에서 확인

1. Firebase 콘솔 > Realtime Database > 데이터 탭
2. `sensors/device_0` 경로에 데이터가 표시되는지 확인
3. 실시간으로 값이 업데이트되는지 확인

### 5.2 앱에서 확인

1. 모바일 앱 실행
2. 홈 화면에서 센서 값 확인
3. 값이 자동으로 업데이트되는지 확인 (Firebase 실시간 리스너)

### 5.3 문제 해결

**Firebase 연결 실패**
```bash
# 인터넷 연결 확인
ping google.com

# Firebase 서비스 계정 키 확인
cat serviceAccountKey.json | python3 -m json.tool
```

**권한 오류**
```bash
# Firebase 규칙 확인 (콘솔)
# 또는 임시로 읽기/쓰기 모두 허용
```

**앱에서 데이터가 보이지 않음**
- `firebaseConfig.js`의 `databaseURL` 확인
- Firebase 콘솔에서 데이터 존재 여부 확인
- 브라우저 콘솔에서 오류 메시지 확인

---

## 🔄 6단계: 아두이노 → 라즈베리파이 연동

### 6.1 아두이노 시리얼 통신

아두이노에서 센서 데이터를 시리얼로 전송:

```cpp
void loop() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  float lux = lightMeter.readLightLevel();
  
  // JSON 형식으로 시리얼 출력
  Serial.print("{\"id\":0,\"name\":\"로오즈마아리\",\"plantType\":\"허브류\",");
  Serial.print("\"temp\":");
  Serial.print(temp, 1);
  Serial.print(",\"hum\":");
  Serial.print(hum, 1);
  Serial.print(",\"lux\":");
  Serial.print((int)lux);
  Serial.println("}");
  
  delay(300000); // 5분 대기
}
```

### 6.2 라즈베리파이에서 시리얼 읽기

```python
import serial
import json

# 시리얼 포트 열기
ser = serial.Serial('/dev/ttyUSB0', 115200, timeout=1)

try:
    while True:
        if ser.in_waiting > 0:
            line = ser.readline().decode('utf-8').strip()
            try:
                data = json.loads(line)
                # JSON 파일로 저장
                with open('/home/pi/arduino_data/sensor_data.json', 'w') as f:
                    json.dump(data, f, indent=2)
                print(f"Saved: {data}")
            except json.JSONDecodeError:
                pass
except KeyboardInterrupt:
    ser.close()
```

---

## 📈 고급 기능

### 히스토리 데이터 저장

```python
# Firebase에 시계열 데이터 저장
history_ref = db.reference(f'history/device_{device_id}')
history_ref.push({
    'temp': data['temp'],
    'hum': data['hum'],
    'lux': data['lux'],
    'timestamp': time.time()
})
```

### 앱에서 차트 표시

Firebase에서 지난 24시간 데이터를 가져와 차트로 표시

### 알림 설정

온도/습도가 임계값을 벗어나면 Firebase Cloud Messaging으로 푸시 알림 전송

---

## 🎯 체크리스트

- [ ] Firebase 프로젝트 생성
- [ ] Realtime Database 설정
- [ ] 웹 앱 구성 정보 복사
- [ ] 서비스 계정 키 다운로드
- [ ] 앱 `firebaseConfig.js` 수정
- [ ] 라즈베리파이에 `firebase-admin` 설치
- [ ] 서비스 계정 키 파일 복사
- [ ] `upload_to_firebase.py` 설정
- [ ] 스크립트 테스트 실행
- [ ] systemd 서비스 등록
- [ ] Firebase 콘솔에서 데이터 확인
- [ ] 앱에서 실시간 데이터 확인

---

## 💡 추가 리소스

- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Firebase Admin Python SDK](https://firebase.google.com/docs/admin/setup)
- [Realtime Database 가이드](https://firebase.google.com/docs/database)

---

완료! 이제 아두이노 센서 데이터가 Firebase를 통해 앱에 실시간으로 표시됩니다. 🎉
