#!/usr/bin/env python3
"""
Raspberry Pi Hardware Control with Firebase Firestore
라즈베리파이에서 Firestore의 device_control 문서를 실시간으로 모니터링하고
API를 통해 환기팬, 워터펌프, LED 조명을 제어합니다.

API 엔드포인트:
- POST /api/control/fan
- POST /api/control/pump
- POST /api/control/light

설치 필요 패키지:
pip3 install firebase-admin requests
"""

import firebase_admin
from firebase_admin import credentials, firestore
import requests
import time
import sys
from datetime import datetime

# API 서버 설정
API_BASE_URL = "http://172.21.166.166:5000"  # 실제 API 서버 주소로 변경

# Firebase 초기화
def init_firebase():
    """Firebase Admin SDK 초기화"""
    try:
        # Service Account Key 파일 경로 (실제 경로로 변경 필요)
        cred = credentials.Certificate('/home/pi/serviceAccountKey.json')
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Firebase 연결 성공")
        return db
    except Exception as e:
        print(f"❌ Firebase 연결 실패: {e}")
        sys.exit(1)

# API를 통한 장치 제어
def control_device_api(device_type, state):
    """
    API를 통해 장치를 ON/OFF 제어
    
    Args:
        device_type: 'fan', 'pump', 'light'
        state: True(ON) / False(OFF)
    """
    try:
        endpoint = f"{API_BASE_URL}/api/control/{device_type}"
        payload = {"state": state}
        
        response = requests.post(endpoint, json=payload, timeout=5)
        
        if response.status_code == 200:
            status = "ON" if state else "OFF"
            icon = "🟢" if state else "⚫"
            device_names = {'fan': '환기팬', 'pump': '워터펌프', 'light': 'LED 조명'}
            device_name = device_names.get(device_type, device_type)
            print(f"{icon} {device_name}: {status}")
            return True
        else:
            print(f"❌ API 요청 실패 ({device_type}): {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ API 연결 실패 ({device_type}): {e}")
        return False

# LED 밝기 제어
def control_led_brightness_api(brightness):
    """
    API를 통해 LED 밝기 제어 (0-255)
    
    Args:
        brightness: 0 (OFF) ~ 255 (최대 밝기)
    """
    try:
        endpoint = f"{API_BASE_URL}/api/control/light/brightness"
        payload = {"brightness": brightness}
        
        response = requests.post(endpoint, json=payload, timeout=5)
        
        if response.status_code == 200:
            if brightness == 0:
                print(f"💡 LED 조명: OFF")
            else:
                duty_cycle = (brightness / 255) * 100
                print(f"💡 LED 조명: ON (밝기: {brightness}/255, {duty_cycle:.1f}%)")
            return True
        else:
            print(f"❌ LED 밝기 제어 실패: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ LED API 연결 실패: {e}")
        return False

# Firestore 실시간 리스너
def on_snapshot(doc_snapshot, changes, read_time):
    """
    Firestore 문서 변경 감지 시 호출되는 콜백 함수
    """
    for doc in doc_snapshot:
        if doc.exists:
            data = doc.to_dict()
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            print(f"\n📡 [{timestamp}] Firestore 업데이트 감지")
            print(f"   문서 ID: {doc.id}")
            
            # 환기팬 제어
            if 'fan' in data:
                control_device_api('fan', data['fan'])
            
            # 워터펌프 제어
            if 'water_pump' in data:
                control_device_api('pump', data['water_pump'])
            
            # LED 밝기 제어
            if 'led_brightness' in data:
                brightness = data.get('led_brightness', 0)
                control_led_brightness_api(brightness)
            
            # LED 색상 정보 (참고용 로그)
            if 'led_color' in data:
                print(f"🎨 LED 색상: {data['led_color']}")
            
            print("-" * 50)

def main():
    """메인 실행 함수"""
    print("=" * 50)
    print("🌿 Healing Garden - Hardware Control System (API Mode)")
    print("=" * 50)
    
    # Firebase 초기화
    db = init_firebase()
    
    print(f"🔗 API 서버: {API_BASE_URL}")
    
    # Firestore 문서 경로
    doc_ref = db.collection('device_control').document('rosemary_terrarium')
    
    print("\n🔄 실시간 모니터링 시작...")
    print("   Firestore: device_control/rosemary_terrarium")
    print("   Ctrl+C를 눌러 종료\n")
    
    # 초기 상태 읽기
    try:
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            print("📊 초기 상태:")
            print(f"   - 환기팬: {'ON' if data.get('fan') else 'OFF'}")
            print(f"   - 워터펌프: {'ON' if data.get('water_pump') else 'OFF'}")
            print(f"   - LED 밝기: {data.get('led_brightness', 0)}")
            print(f"   - LED 색상: {data.get('led_color', 'N/A')}")
            print()
            
            # 초기 상태 적용
            control_device_api('fan', data.get('fan', False))
            control_device_api('pump', data.get('water_pump', False))
            control_led_brightness_api(data.get('led_brightness', 0))
    except Exception as e:
        print(f"⚠️ 초기 상태 읽기 실패: {e}")
    
    # 실시간 리스너 등록
    doc_watch = doc_ref.on_snapshot(on_snapshot)
    
    try:
        # 계속 실행 (Ctrl+C로 종료)
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n🛑 프로그램 종료 중...")
        
        # 모든 장치 OFF (API 호출)
        control_device_api('fan', False)
        control_device_api('pump', False)
        control_led_brightness_api(0)
        print("   모든 장치 OFF")
        
        print("✅ 안전하게 종료되었습니다.")

if __name__ == "__main__":
    main()
