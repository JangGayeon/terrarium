"""
Raspberry Pi Firebase Uploader
아두이노에서 받은 JSON 파일을 Firebase Realtime Database에 업로드합니다.

필요한 패키지:
pip install firebase-admin requests

사용법:
1. Firebase 콘솔에서 서비스 계정 키 생성
   - Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > Python > 새 비공개 키 생성
   - 다운로드한 JSON 파일을 이 스크립트와 같은 폴더에 저장 (예: serviceAccountKey.json)

2. 아두이노 JSON 파일 경로 설정

3. 실행:
   python upload_to_firebase.py --continuous
"""

import json
import time
import sys
import os
from datetime import datetime
from pathlib import Path

try:
    import firebase_admin
    from firebase_admin import credentials, db
except ImportError:
    print("❌ firebase-admin이 설치되지 않았습니다.")
    print("   설치: pip install firebase-admin")
    sys.exit(1)

# ==================== 설정 ====================

# Firebase 서비스 계정 키 파일 경로
SERVICE_ACCOUNT_KEY = "serviceAccountKey.json"

# Firebase Realtime Database URL
# Firebase 콘솔 > Realtime Database > 데이터 탭에서 확인
DATABASE_URL = "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com"

# 아두이노에서 생성한 JSON 파일 경로
# 예: /home/pi/arduino_data/sensor_data.json
ARDUINO_JSON_PATH = "/home/pi/arduino_data/sensor_data.json"

# 업로드 간격 (초) - 아두이노 업데이트 간격과 맞춤 (5분 = 300초)
UPLOAD_INTERVAL = 300

# Firebase 데이터 경로 (예: /sensors/device_0)
# 앱에서 참조하는 경로와 일치해야 함
FIREBASE_PATH_TEMPLATE = "sensors/device_{device_id}"

# ===============================================

def init_firebase():
    """Firebase 초기화"""
    if not os.path.exists(SERVICE_ACCOUNT_KEY):
        print(f"❌ 서비스 계정 키 파일을 찾을 수 없습니다: {SERVICE_ACCOUNT_KEY}")
        print("   Firebase 콘솔에서 서비스 계정 키를 다운로드하세요:")
        print("   https://console.firebase.google.com/")
        print("   프로젝트 설정 > 서비스 계정 > 새 비공개 키 생성")
        sys.exit(1)
    
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY)
        firebase_admin.initialize_app(cred, {
            'databaseURL': DATABASE_URL
        })
        print("✅ Firebase 초기화 완료")
        return True
    except Exception as e:
        print(f"❌ Firebase 초기화 실패: {e}")
        return False

def read_arduino_json():
    """아두이노 JSON 파일 읽기"""
    try:
        if not os.path.exists(ARDUINO_JSON_PATH):
            print(f"⚠️  JSON 파일을 찾을 수 없습니다: {ARDUINO_JSON_PATH}")
            return None
        
        with open(ARDUINO_JSON_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 데이터 검증
        required_fields = ['temp', 'hum', 'lux']
        for field in required_fields:
            if field not in data:
                print(f"⚠️  필수 필드 누락: {field}")
                return None
        
        return data
    except json.JSONDecodeError as e:
        print(f"❌ JSON 파싱 오류: {e}")
        return None
    except Exception as e:
        print(f"❌ 파일 읽기 오류: {e}")
        return None

def upload_to_firebase(data):
    """Firebase에 데이터 업로드"""
    try:
        device_id = data.get('id', 0)
        firebase_path = FIREBASE_PATH_TEMPLATE.format(device_id=device_id)
        
        # 타임스탬프 추가
        data['timestamp'] = int(time.time() * 1000)
        data['lastUpdated'] = datetime.now().isoformat()
        
        # Firebase에 데이터 쓰기
        ref = db.reference(firebase_path)
        ref.set(data)
        
        print(f"✅ Firebase 업로드 완료: {firebase_path}")
        print(f"   온도: {data.get('temp')}°C, 습도: {data.get('hum')}%, 조도: {data.get('lux')}lx")
        return True
    except Exception as e:
        print(f"❌ Firebase 업로드 실패: {e}")
        return False

def watch_file_changes(file_path, callback, interval=1):
    """파일 변경 감지 및 콜백 실행"""
    last_modified = None
    
    while True:
        try:
            if os.path.exists(file_path):
                current_modified = os.path.getmtime(file_path)
                
                if last_modified is None or current_modified > last_modified:
                    last_modified = current_modified
                    print(f"📄 파일 변경 감지: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                    callback()
            else:
                print(f"⚠️  파일이 존재하지 않습니다: {file_path}")
        except Exception as e:
            print(f"❌ 파일 감시 오류: {e}")
        
        time.sleep(interval)

def main():
    """메인 실행 함수"""
    print("=" * 60)
    print("🌱 Raspberry Pi → Firebase 센서 데이터 업로더")
    print("=" * 60)
    print(f"Arduino JSON 경로: {ARDUINO_JSON_PATH}")
    print(f"Firebase DB URL: {DATABASE_URL}")
    print(f"업로드 간격: {UPLOAD_INTERVAL}초")
    print("=" * 60)
    
    # Firebase 초기화
    if not init_firebase():
        sys.exit(1)
    
    # 실행 모드 확인
    continuous = '--continuous' in sys.argv or '-c' in sys.argv
    watch_mode = '--watch' in sys.argv or '-w' in sys.argv
    
    if watch_mode:
        # 파일 변경 감지 모드
        print("\n📡 파일 변경 감지 모드 (Ctrl+C로 중지)")
        print(f"   {ARDUINO_JSON_PATH} 파일을 감시합니다...\n")
        
        def on_file_change():
            data = read_arduino_json()
            if data:
                upload_to_firebase(data)
        
        try:
            watch_file_changes(ARDUINO_JSON_PATH, on_file_change)
        except KeyboardInterrupt:
            print("\n\n✋ 사용자에 의해 중지되었습니다")
            sys.exit(0)
    
    elif continuous:
        # 연속 업로드 모드
        print(f"\n📡 연속 업로드 모드 ({UPLOAD_INTERVAL}초 간격, Ctrl+C로 중지)")
        print(f"   {ARDUINO_JSON_PATH} 파일을 주기적으로 읽어 업로드합니다...\n")
        
        try:
            while True:
                data = read_arduino_json()
                if data:
                    upload_to_firebase(data)
                else:
                    print("⏭️  데이터가 없어 건너뜁니다")
                
                print(f"⏰ {UPLOAD_INTERVAL}초 대기 중...\n")
                time.sleep(UPLOAD_INTERVAL)
        except KeyboardInterrupt:
            print("\n\n✋ 사용자에 의해 중지되었습니다")
            sys.exit(0)
    
    else:
        # 단일 업로드 모드
        print("\n📤 단일 업로드 모드\n")
        data = read_arduino_json()
        if data:
            success = upload_to_firebase(data)
            if success:
                print("\n✅ 업로드 완료!")
            else:
                print("\n❌ 업로드 실패")
                sys.exit(1)
        else:
            print("❌ 데이터를 읽을 수 없습니다")
            sys.exit(1)
        
        print("\n💡 Tip: 연속 모드로 실행하려면 --continuous 플래그를 사용하세요")
        print("        파일 변경 감지 모드: --watch")

if __name__ == '__main__':
    main()
