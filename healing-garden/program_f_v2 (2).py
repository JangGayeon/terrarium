#!/usr/bin/env python3
"""
스마트 식물 관리 시스템 v3.0 (Firebase 디버그 버전)
- 영상 재생 (전체화면 가능)
- 센서 모니터링
- LED Matrix 제어 (페이드 효과)
- 팬 제어
- 물 펌프 제어
- Firebase 데이터 저장 (JSON 저장 건너뜀, 바로 Firebase!)
- REST API
- 자동 환경 제어
- 디버그 메시지 추가 (Firebase 저장 문제 해결용)
"""

import cv2
import sys
import os
import argparse
import time
import json
from datetime import datetime
from threading import Thread, Lock

try:
    import serial
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False
    print("⚠️  pyserial이 설치되지 않았습니다")

try:
    from flask import Flask, jsonify, request
    from flask_cors import CORS
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False
    print("⚠️  flask가 설치되지 않았습니다")

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("⚠️  firebase-admin이 설치되지 않았습니다")

# 설정
DATA_FILE = "sensor_data.json"
ARDUINO_PORT = "/dev/ttyACM0"
BAUD_RATE = 9600
SENSOR_INTERVAL = 180
API_PORT = 5000

# 전역 변수
video_control = {
    'playing': False,
    'paused': False,
    'stopped': False,
    'fullscreen': False
}
video_control_lock = Lock()

matrix_state = {
    'on': False,
    'color': {'r': 255, 'g': 255, 'b': 255},
    'brightness': 15
}
matrix_lock = Lock()

# 🆕 팬, 펌프 상태
device_state = {
    'fan': False,
    'pump': False
}
device_lock = Lock()

# 🆕 자동 제어 설정
auto_control = {
    'enabled': False,
    'target_light': 500,     # 목표 조도 (0-1023)
    'target_temp': 25.0,     # 목표 온도 (°C)
    'target_humid': 60.0,    # 목표 습도 (%)
    'temp_tolerance': 2.0,   # 온도 허용 오차
    'humid_tolerance': 10.0  # 습도 허용 오차
}
auto_control_lock = Lock()

# ============================================================================
# Firebase 초기화
# ============================================================================
firebase_db = None

def init_firebase(cred_path):
    """Firebase 초기화"""
    global firebase_db
    
    print(f"[DEBUG] init_firebase 호출됨")
    print(f"[DEBUG] cred_path = {cred_path}")
    print(f"[DEBUG] FIREBASE_AVAILABLE = {FIREBASE_AVAILABLE}")
    
    if not FIREBASE_AVAILABLE:
        print("❌ Firebase 라이브러리가 설치되지 않았습니다")
        return False
    
    if not os.path.exists(cred_path):
        print(f"❌ Firebase 인증 파일을 찾을 수 없습니다: {cred_path}")
        print(f"[DEBUG] 현재 디렉토리: {os.getcwd()}")
        return False
    
    try:
        print(f"[DEBUG] credentials.Certificate() 호출 중...")
        cred = credentials.Certificate(cred_path)
        print(f"[DEBUG] firebase_admin.initialize_app() 호출 중...")
        firebase_admin.initialize_app(cred)
        print(f"[DEBUG] firestore.client() 호출 중...")
        firebase_db = firestore.client()
        print(f"[DEBUG] firebase_db = {firebase_db}")
        print(f"✅ Firebase 연결 성공")
        return True
    except Exception as e:
        print(f"❌ Firebase 초기화 실패: {e}")
        import traceback
        traceback.print_exc()
        return False

def save_to_firebase(data, collection_name='sensor_data'):
    """Firebase에 데이터 저장"""
    print(f"   [DEBUG] save_to_firebase 호출됨")
    print(f"   [DEBUG] firebase_db = {firebase_db}")
    print(f"   [DEBUG] collection_name = {collection_name}")
    
    if not firebase_db:
        print(f"   [DEBUG] firebase_db가 None입니다!")
        return False
    
    try:
        print(f"   [DEBUG] document 생성 중...")
        doc_ref = firebase_db.collection(collection_name).document()
        print(f"   [DEBUG] set() 호출 중...")
        doc_ref.set(data)
        print(f"   📤 Firebase 문서 저장 완료: {doc_ref.id}")
        return True
    except Exception as e:
        print(f"   ❌ Firebase 저장 실패: {e}")
        import traceback
        traceback.print_exc()
        return False
        return False

# ============================================================================
# 센서 모니터링 클래스 (Matrix + Firebase + 팬 + 펌프)
# ============================================================================
class SensorMonitor:
    def __init__(self, arduino_port=ARDUINO_PORT, baud_rate=BAUD_RATE, 
                 data_file=DATA_FILE, use_firebase=False):
        self.arduino_port = arduino_port
        self.baud_rate = baud_rate
        self.data_file = data_file
        self.use_firebase = use_firebase
        self.serial_conn = None
        self.running = False
        self.last_sensor_data = None
        self.latest_data = None  # API용 최신 데이터
        self.firebase_manager = self  # Firebase 업로드용
        
        if not os.path.exists(self.data_file):
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump([], f, ensure_ascii=False, indent=2)
    
    def connect_arduino(self):
        if not SERIAL_AVAILABLE:
            return False
        try:
            self.serial_conn = serial.Serial(self.arduino_port, self.baud_rate, timeout=1)
            time.sleep(2)
            print(f"✅ Arduino 연결 성공: {self.arduino_port}")
            return True
        except Exception as e:
            print(f"❌ Arduino 연결 실패: {e}")
            return False
    
    def send_command(self, command):
        """명령 전송"""
        if not self.serial_conn or not self.serial_conn.is_open:
            return None
        try:
            self.serial_conn.write(f"{command}\n".encode())
            time.sleep(0.1)
            if self.serial_conn.in_waiting > 0:
                response = self.serial_conn.readline().decode('utf-8').strip()
                return response
            return None
        except Exception as e:
            print(f"❌ 명령 전송 실패: {e}")
            return None
    
    def read_sensor_data(self):
        """센서 데이터 읽기"""
        if not self.serial_conn or not self.serial_conn.is_open:
            return None
        try:
            self.serial_conn.write(b'READ\n')
            time.sleep(0.5)
            
            if self.serial_conn.in_waiting > 0:
                line = self.serial_conn.readline().decode('utf-8').strip()
                try:
                    data = json.loads(line)
                    self.last_sensor_data = data
                    return data
                except json.JSONDecodeError:
                    return None
        except Exception as e:
            return None
    
    # ===== LED Matrix 제어 =====
    def matrix_on(self, r=255, g=255, b=255):
        """Matrix 켜기 (페이드 효과 자동)"""
        response = self.send_command(f"MATRIX:COLOR:{r},{g},{b}")
        if response and response.startswith("OK:MATRIX_ON"):
            with matrix_lock:
                matrix_state['on'] = True
                matrix_state['color'] = {'r': r, 'g': g, 'b': b}
            print(f"💡 LED Matrix ON - RGB({r},{g},{b})")
            return True
        return False
    
    def matrix_off(self):
        """Matrix 끄기 (페이드 효과 자동)"""
        response = self.send_command("MATRIX:OFF")
        if response == "OK:MATRIX_OFF":
            with matrix_lock:
                matrix_state['on'] = False
            print("⚫ LED Matrix OFF")
            return True
        return False
    
    def matrix_color(self, color_name):
        """Matrix 색상 변경"""
        response = self.send_command(f"MATRIX:{color_name.upper()}")
        if response and response.startswith("OK:MATRIX_ON"):
            with matrix_lock:
                matrix_state['on'] = True
            print(f"🎨 LED Matrix 색상: {color_name}")
            return True
        return False
    
    def matrix_brightness(self, level):
        """Matrix 밝기 조절"""
        level = max(0, min(255, level))
        response = self.send_command(f"MATRIX:BRIGHT:{level}")
        if response and response.startswith("OK:MATRIX_BRIGHTNESS"):
            with matrix_lock:
                matrix_state['brightness'] = level
            return True
        return False
    
    # 🆕 팬 제어
    def fan_on(self):
        """팬 켜기"""
        response = self.send_command("FAN:ON")
        if response == "OK:FAN_ON":
            with device_lock:
                device_state['fan'] = True
            print("🌀 팬 켜기")
            return True
        return False
    
    def fan_off(self):
        """팬 끄기"""
        response = self.send_command("FAN:OFF")
        if response == "OK:FAN_OFF":
            with device_lock:
                device_state['fan'] = False
            print("⚫ 팬 끄기")
            return True
        return False
    
    # 🆕 펌프 제어
    def pump_on(self, duration=3):
        """펌프 켜기 (기본 3초)"""
        response = self.send_command("PUMP:ON")
        if response == "OK:PUMP_ON":
            with device_lock:
                device_state['pump'] = True
            print(f"💧 펌프 켜기 ({duration}초)")
            
            # duration초 후 자동 끄기
            def auto_off():
                time.sleep(duration)
                self.pump_off()
            Thread(target=auto_off, daemon=True).start()
            return True
        return False
    
    def pump_off(self):
        """펌프 끄기"""
        response = self.send_command("PUMP:OFF")
        if response == "OK:PUMP_OFF":
            with device_lock:
                device_state['pump'] = False
            print("⚫ 펌프 끄기")
            return True
        return False
    
    # 🆕 자동 환경 제어
    def auto_environment_control(self, sensor_data):
        """센서 데이터 기반 자동 제어"""
        with auto_control_lock:
            if not auto_control['enabled']:
                return
            
            target_light = auto_control['target_light']
            target_temp = auto_control['target_temp']
            target_humid = auto_control['target_humid']
            temp_tol = auto_control['temp_tolerance']
            humid_tol = auto_control['humid_tolerance']
        
        current_light = sensor_data.get('LIGHT', 0)
        current_temp = sensor_data.get('TEMP', 0)
        current_humid = sensor_data.get('HUMID', 0)
        
        print("\n🤖 자동 제어 실행")
        
        # 1. 조도 제어 (밝기가 부족하면 LED 켜기)
        if current_light < target_light:
            needed_brightness = int((target_light - current_light) / 4)  # 대략적 계산
            needed_brightness = min(255, max(50, needed_brightness))
            print(f"   💡 조도 부족 ({current_light} < {target_light}) → LED 밝기 {needed_brightness}")
            self.matrix_brightness(needed_brightness)
            if not matrix_state['on']:
                self.matrix_on(255, 255, 255)
        else:
            if matrix_state['on']:
                print(f"   ⚫ 조도 충분 ({current_light} >= {target_light}) → LED 끄기")
                self.matrix_off()
        
        # 2. 온도 제어 (너무 높으면 팬 켜기)
        if current_temp > target_temp + temp_tol:
            print(f"   🌀 온도 높음 ({current_temp}°C > {target_temp}°C) → 팬 켜기")
            if not device_state['fan']:
                self.fan_on()
        elif current_temp < target_temp - temp_tol:
            print(f"   ⚫ 온도 낮음 ({current_temp}°C < {target_temp}°C) → 팬 끄기")
            if device_state['fan']:
                self.fan_off()
        
        # 3. 습도 제어 (낮으면 물 뿌리기, 높으면 팬 켜기)
        if current_humid < target_humid - humid_tol:
            print(f"   💧 습도 낮음 ({current_humid}% < {target_humid}%) → 펌프 작동")
            self.pump_on(3)
        elif current_humid > target_humid + humid_tol:
            print(f"   🌀 습도 높음 ({current_humid}% > {target_humid}%) → 팬 켜기")
            if not device_state['fan']:
                self.fan_on()
    
    def save_to_json(self, sensor_data):
        """JSON 파일에 데이터 저장"""
        try:
            with open(self.data_file, 'r', encoding='utf-8') as f:
                data_list = json.load(f)
            
            document = {
                "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "hw038_moisture": sensor_data.get("HW038"),
                "light_level": sensor_data.get("LIGHT"),
                "temperature": sensor_data.get("TEMP"),
                "humidity": sensor_data.get("HUMID"),
                "raw_data": sensor_data
            }
            
            # API용 최신 데이터 저장
            self.latest_data = document
            
            # 🔥 JSON 파일 저장 건너뛰기 - 바로 Firebase로!
            # data_list.append(document)
            # if len(data_list) > 1000:
            #     data_list = data_list[-1000:]
            # with open(self.data_file, 'w', encoding='utf-8') as f:
            #     json.dump(data_list, f, ensure_ascii=False, indent=2)
            # print(f"   💾 JSON 저장 완료 ({len(data_list)}개 기록)")
            
            # 🔥 바로 Firebase에 저장! (강제 실행 + 디버그)
            print(f"   [DEBUG] use_firebase = {self.use_firebase}")
            print(f"   [DEBUG] firebase_db is None = {firebase_db is None}")
            print(f"   [DEBUG] FIREBASE_AVAILABLE = {FIREBASE_AVAILABLE}")
            
            if firebase_db is not None:
                try:
                    document['timestamp_firebase'] = firestore.SERVER_TIMESTAMP
                    print(f"   [DEBUG] save_to_firebase 호출 중...")
                    success = save_to_firebase(document)
                    print(f"   [DEBUG] save_to_firebase 결과 = {success}")
                    if success:
                        print(f"   🔥 Firebase 저장 완료!")
                    else:
                        print(f"   ❌ Firebase 저장 실패 (save_to_firebase returned False)")
                except Exception as e:
                    print(f"   ❌ Firebase 저장 에러: {e}")
                    import traceback
                    traceback.print_exc()
            else:
                print(f"   ⚠️ Firebase가 초기화되지 않았습니다!")
                print(f"   ⚠️ use_firebase = {self.use_firebase}")
                print(f"   ⚠️ firebase_db = {firebase_db}")
                print(f"   ⚠️ FIREBASE_AVAILABLE = {FIREBASE_AVAILABLE}")
            
            return True
        except Exception as e:
            return False
    
    def upload_to_firebase(self, data):
        """API용 Firebase 업로드"""
        if not self.use_firebase or not firebase_db:
            return False
        try:
            document = data.copy()
            document['timestamp_firebase'] = firestore.SERVER_TIMESTAMP
            return save_to_firebase(document)
        except Exception as e:
            print(f"   ❌ Firebase 업로드 에러: {e}")
            return False
    
    def monitor_loop(self, interval=SENSOR_INTERVAL):
        """센서 모니터링 루프"""
        print(f"\n📊 센서 모니터링 시작 (주기: {interval}초 = {interval//60}분)")
        # 💾 JSON 저장 건너뜀 - 바로 Firebase로!
        if self.use_firebase:
            print(f"🔥 Firebase 저장: 활성화 (센서 읽자마자 바로 저장!)")
        else:
            print(f"⚠️ Firebase 비활성화 - 데이터가 저장되지 않습니다!")
        print("="*60)
        
        while self.running:
            sensor_data = self.read_sensor_data()
            
            if sensor_data:
                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                print(f"\n📊 [{timestamp}] 센서 데이터")
                print(f"   🌡️ 온도: {sensor_data.get('TEMP', 'N/A')}°C")
                print(f"   💧 습도: {sensor_data.get('HUMID', 'N/A')}%")
                print(f"   🌱 토양: {sensor_data.get('HW038', 'N/A')}")
                print(f"   💡 조도: {sensor_data.get('LIGHT', 'N/A')}")
                
                self.save_to_json(sensor_data)
                
                # 🆕 자동 환경 제어
                self.auto_environment_control(sensor_data)
            
            time.sleep(interval)
    
    def start(self, interval=SENSOR_INTERVAL):
        """모니터링 시작"""
        arduino_ok = self.connect_arduino()
        if not arduino_ok:
            return None
        
        self.running = True
        monitor_thread = Thread(target=self.monitor_loop, args=(interval,), daemon=True)
        monitor_thread.start()
        return monitor_thread
    
    def stop(self):
        """모니터링 중지"""
        self.running = False
        if self.serial_conn and self.serial_conn.is_open:
            self.serial_conn.close()

# ============================================================================
# API 서버
# ============================================================================
class APIServer:
    def __init__(self, sensor_monitor, data_file=DATA_FILE, port=API_PORT):
        self.sensor_monitor = sensor_monitor
        self.data_file = data_file
        self.port = port
        self.app = None
        
        if FLASK_AVAILABLE:
            self.app = Flask(__name__)
            CORS(self.app)
            self.setup_routes()
    
    def setup_routes(self):
        @self.app.route('/')
        def index():
            firebase_status = "📤 활성화" if firebase_db else "❌ 비활성화"
            auto_status = "🤖 자동" if auto_control['enabled'] else "👆 수동"
            return f'''
            <html>
            <head>
                <title>스마트 식물 관리 시스템</title>
                <style>
                    body {{ font-family: Arial; margin: 20px; }}
                    button {{ padding: 10px 20px; margin: 5px; font-size: 16px; cursor: pointer; }}
                    .section {{ border: 1px solid #ccc; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                </style>
            </head>
            <body>
                <h1>🌱 스마트 식물 관리 시스템</h1>
                <p>Firebase: {firebase_status} | 제어 모드: {auto_status}</p>
                
                <div class="section">
                    <h2>📊 센서</h2>
                    <button onclick="fetch('/api/sensor/latest').then(r=>r.json()).then(d=>alert(JSON.stringify(d, null, 2)))">최신 센서 데이터</button>
                </div>
                
                <div class="section">
                    <h2>🔥 Firebase</h2>
                    <button onclick="fetch('/api/firebase/upload', {{method: 'POST'}}).then(r=>r.json()).then(d=>alert(JSON.stringify(d, null, 2)))">Firebase에 즉시 업로드</button>
                </div>
                
                <div class="section">
                    <h2>🎬 영상 제어</h2>
                    <button onclick="fetch('/api/video/play', {{method: 'POST'}})">재생</button>
                    <button onclick="fetch('/api/video/pause', {{method: 'POST'}})">일시정지</button>
                    <button onclick="fetch('/api/video/stop', {{method: 'POST'}})">중지</button>
                </div>
                
                <div class="section">
                    <h2>💡 LED Matrix</h2>
                    <button onclick="fetch('/api/matrix/on', {{method: 'POST'}})">켜기</button>
                    <button onclick="fetch('/api/matrix/off', {{method: 'POST'}})">끄기</button>
                    <br><br>
                    <button onclick="fetch('/api/matrix/color/red', {{method: 'POST'}})">빨강</button>
                    <button onclick="fetch('/api/matrix/color/green', {{method: 'POST'}})">초록</button>
                    <button onclick="fetch('/api/matrix/color/blue', {{method: 'POST'}})">파랑</button>
                    <button onclick="fetch('/api/matrix/color/white', {{method: 'POST'}})">하양</button>
                </div>
                
                <div class="section">
                    <h2>🌀 팬 (선풍기)</h2>
                    <button onclick="fetch('/api/fan/on', {{method: 'POST'}})">팬 켜기</button>
                    <button onclick="fetch('/api/fan/off', {{method: 'POST'}})">팬 끄기</button>
                </div>
                
                <div class="section">
                    <h2>💧 펌프 (물주기)</h2>
                    <button onclick="fetch('/api/pump/on', {{method: 'POST'}})">펌프 켜기 (3초)</button>
                    <button onclick="fetch('/api/pump/off', {{method: 'POST'}})">펌프 끄기</button>
                </div>
                
                <div class="section">
                    <h2>🤖 자동 제어</h2>
                    <button onclick="fetch('/api/auto/enable', {{method: 'POST'}})">자동 제어 켜기</button>
                    <button onclick="fetch('/api/auto/disable', {{method: 'POST'}})">자동 제어 끄기</button>
                    <br><br>
                    <p>목표값 설정 예시:</p>
                    <button onclick="setTarget()">목표값 설정하기</button>
                    <script>
                    function setTarget() {{
                        let light = prompt("목표 조도 (0-1023):", "500");
                        let temp = prompt("목표 온도 (°C):", "25");
                        let humid = prompt("목표 습도 (%):", "60");
                        
                        fetch('/api/auto/target', {{
                            method: 'POST',
                            headers: {{'Content-Type': 'application/json'}},
                            body: JSON.stringify({{
                                light: parseInt(light),
                                temp: parseFloat(temp),
                                humid: parseFloat(humid)
                            }})
                        }}).then(r=>r.json()).then(d=>alert(JSON.stringify(d)));
                    }}
                    </script>
                </div>
            </body>
            </html>
            '''
        
        @self.app.route('/api/sensor/latest')
        def get_latest_sensor():
            """최신 센서 데이터 가져오기 (메모리에서)"""
            try:
                if self.sensor_monitor and hasattr(self.sensor_monitor, 'latest_data') and self.sensor_monitor.latest_data:
                    return jsonify({'success': True, 'data': self.sensor_monitor.latest_data})
                return jsonify({'success': False, 'message': '센서 데이터가 없습니다'})
            except Exception as e:
                return jsonify({'success': False, 'error': str(e)})
        
        # 영상 제어
        @self.app.route('/api/video/play', methods=['POST'])
        def video_play():
            with video_control_lock:
                video_control['paused'] = False
                video_control['playing'] = True
            return jsonify({'success': True})
        
        @self.app.route('/api/video/pause', methods=['POST'])
        def video_pause():
            with video_control_lock:
                video_control['paused'] = True
            return jsonify({'success': True})
        
        @self.app.route('/api/video/stop', methods=['POST'])
        def video_stop():
            with video_control_lock:
                video_control['stopped'] = True
            return jsonify({'success': True})
        
        # LED Matrix 제어
        @self.app.route('/api/matrix/on', methods=['POST'])
        def matrix_on():
            if not self.sensor_monitor:
                return jsonify({'success': False, 'error': 'Sensor monitor not initialized'})
            
            try:
                data = request.get_json(silent=True) or {}
                r = int(data.get('r', 255))
                g = int(data.get('g', 255))
                b = int(data.get('b', 255))
                
                if self.sensor_monitor.matrix_on(r, g, b):
                    return jsonify({'success': True, 'color': {'r': r, 'g': g, 'b': b}})
            except Exception as e:
                return jsonify({'success': False, 'error': str(e)})
            return jsonify({'success': False})
        
        @self.app.route('/api/matrix/off', methods=['POST'])
        def matrix_off():
            if self.sensor_monitor and self.sensor_monitor.matrix_off():
                return jsonify({'success': True})
            return jsonify({'success': False})
        
        @self.app.route('/api/matrix/color/<color_name>', methods=['POST'])
        def matrix_color(color_name):
            if self.sensor_monitor and self.sensor_monitor.matrix_color(color_name):
                return jsonify({'success': True, 'color': color_name})
            return jsonify({'success': False})
        
        @self.app.route('/api/matrix/brightness', methods=['POST'])
        def matrix_brightness():
            try:
                data = request.get_json(silent=True)
                level = int(data.get('level', 15))
                
                if self.sensor_monitor and self.sensor_monitor.matrix_brightness(level):
                    return jsonify({'success': True, 'brightness': level})
            except:
                pass
            return jsonify({'success': False})
        
        # 🆕 팬 제어
        @self.app.route('/api/fan/on', methods=['POST'])
        def fan_on():
            if self.sensor_monitor and self.sensor_monitor.fan_on():
                return jsonify({'success': True})
            return jsonify({'success': False})
        
        @self.app.route('/api/fan/off', methods=['POST'])
        def fan_off():
            if self.sensor_monitor and self.sensor_monitor.fan_off():
                return jsonify({'success': True})
            return jsonify({'success': False})
        
        # 🆕 펌프 제어
        @self.app.route('/api/pump/on', methods=['POST'])
        def pump_on():
            data = request.get_json(silent=True) or {}
            duration = int(data.get('duration', 3))
            
            if self.sensor_monitor and self.sensor_monitor.pump_on(duration):
                return jsonify({'success': True, 'duration': duration})
            return jsonify({'success': False})
        
        @self.app.route('/api/pump/off', methods=['POST'])
        def pump_off():
            if self.sensor_monitor and self.sensor_monitor.pump_off():
                return jsonify({'success': True})
            return jsonify({'success': False})
        
        # 🔥 Firebase 업로드
        @self.app.route('/api/firebase/upload', methods=['POST'])
        def firebase_upload():
            """Firebase에 즉시 업로드"""
            try:
                if self.sensor_monitor:
                    # 최신 센서 데이터 가져오기
                    if hasattr(self.sensor_monitor, 'latest_data') and self.sensor_monitor.latest_data:
                        # Firebase에 업로드
                        if hasattr(self.sensor_monitor, 'firebase_manager') and self.sensor_monitor.firebase_manager:
                            success = self.sensor_monitor.firebase_manager.upload_to_firebase(
                                self.sensor_monitor.latest_data
                            )
                            if success:
                                return jsonify({
                                    'success': True, 
                                    'message': 'Firebase 업로드 성공',
                                    'data': self.sensor_monitor.latest_data
                                })
                            else:
                                return jsonify({'success': False, 'message': 'Firebase 업로드 실패'})
                        else:
                            return jsonify({'success': False, 'message': 'Firebase가 초기화되지 않았습니다'})
                    else:
                        return jsonify({'success': False, 'message': '센서 데이터가 없습니다'})
                else:
                    return jsonify({'success': False, 'message': 'Sensor monitor가 초기화되지 않았습니다'})
            except Exception as e:
                return jsonify({'success': False, 'message': f'에러: {str(e)}'})
        
        # 🆕 자동 제어
        @self.app.route('/api/auto/enable', methods=['POST'])
        def auto_enable():
            with auto_control_lock:
                auto_control['enabled'] = True
            return jsonify({'success': True, 'message': '자동 제어 활성화'})
        
        @self.app.route('/api/auto/disable', methods=['POST'])
        def auto_disable():
            with auto_control_lock:
                auto_control['enabled'] = False
            return jsonify({'success': True, 'message': '자동 제어 비활성화'})
        
        @self.app.route('/api/auto/target', methods=['POST'])
        def auto_target():
            try:
                data = request.get_json()
                
                with auto_control_lock:
                    if 'light' in data:
                        auto_control['target_light'] = int(data['light'])
                    if 'temp' in data:
                        auto_control['target_temp'] = float(data['temp'])
                    if 'humid' in data:
                        auto_control['target_humid'] = float(data['humid'])
                
                return jsonify({
                    'success': True,
                    'settings': {
                        'light': auto_control['target_light'],
                        'temp': auto_control['target_temp'],
                        'humid': auto_control['target_humid']
                    }
                })
            except Exception as e:
                return jsonify({'success': False, 'error': str(e)})
        
        @self.app.route('/api/auto/status')
        def auto_status():
            with auto_control_lock:
                return jsonify({'success': True, 'settings': auto_control})
        
        @self.app.route('/api/status')
        def get_status():
            with matrix_lock, device_lock, auto_control_lock:
                return jsonify({
                    'success': True,
                    'matrix': matrix_state,
                    'devices': device_state,
                    'auto_control': auto_control
                })
    
    def start(self):
        if not FLASK_AVAILABLE:
            return None
        
        def run_server():
            print(f"\n🌐 API 서버 시작: http://0.0.0.0:{self.port}")
            self.app.run(host='0.0.0.0', port=self.port, debug=False, use_reloader=False)
        
        api_thread = Thread(target=run_server, daemon=True)
        api_thread.start()
        return api_thread

# ============================================================================
# 영상 재생 (전면 가득 채우기)
# ============================================================================
def play_video(video_path, fullscreen=False, loop=False, enable_api_control=False):
    if not os.path.exists(video_path):
        print(f"\n❌ 오류: '{video_path}' 파일을 찾을 수 없습니다.")
        return False
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return False
    
    # 화면 해상도 가져오기
    try:
        import subprocess
        result = subprocess.run(['xrandr'], capture_output=True, text=True)
        for line in result.stdout.split('\n'):
            if '*' in line:
                parts = line.split()
                screen_resolution = parts[0]
                screen_width = int(screen_resolution.split('x')[0])
                screen_height = int(screen_resolution.split('x')[1])
                break
        else:
            screen_width = 1920
            screen_height = 1080
    except:
        screen_width = 1920
        screen_height = 1080
    
    window_name = 'Video Player'
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    
    if fullscreen:
        cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
           
    with video_control_lock:
        video_control['playing'] = True
        video_control['paused'] = False
        video_control['stopped'] = False
        video_control['fullscreen'] = fullscreen
    
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    delay = int(1000 / fps) if fps > 0 else 30
    paused = False
    
    print("\n🎬 영상 재생 시작")
    print("   조작키: Q(종료) | 스페이스(일시정지) | F(전체화면)")
    
    try:
        while True:
            if enable_api_control:
                with video_control_lock:
                    if video_control['stopped']:
                        break
                    if video_control['paused'] != paused:
                        paused = video_control['paused']
            
            if not paused:
                ret, frame = cap.read()
                
                if not ret:
                    if loop:
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        continue
                    else:
                        break
                
                if fullscreen or cv2.getWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN) == cv2.WINDOW_FULLSCREEN:
                    frame = cv2.resize(frame, (screen_width, screen_height), interpolation=cv2.INTER_LINEAR)
                
                cv2.imshow(window_name, frame)
            
            key = cv2.waitKey(delay if not paused else 100) & 0xFF
            
            if key == ord('q') or key == ord('Q'):
                break
            elif key == ord(' '):
                paused = not paused
                if enable_api_control:
                    with video_control_lock:
                        video_control['paused'] = paused
            elif key == ord('f') or key == ord('F'):
                current = cv2.getWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN)
                if current == cv2.WINDOW_FULLSCREEN:
                    cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_NORMAL)
                    fullscreen = False
                else:
                    cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
                    fullscreen = True
                if enable_api_control:
                    with video_control_lock:
                        video_control['fullscreen'] = fullscreen
    
    except KeyboardInterrupt:
        pass
    finally:
        cap.release()
        cv2.destroyAllWindows()
    
    return True

# ============================================================================
# 메인
# ============================================================================
def main():
    print("\n" + "="*60)
    print("🌱 스마트 식물 관리 시스템 v2.0")
    print("="*60)
    
    parser = argparse.ArgumentParser()
    parser.add_argument('video_path', nargs='?', help='영상 파일')
    parser.add_argument('-f', '--fullscreen', action='store_true')
    parser.add_argument('-l', '--loop', action='store_true')
    parser.add_argument('--api', action='store_true', help='API 서버 활성화')
    parser.add_argument('--firebase', help='Firebase 인증 JSON 파일 경로')
    parser.add_argument('--no-sensor', action='store_true')
    parser.add_argument('--no-video', action='store_true')
    parser.add_argument('--no-keypad', action='store_true', help='키패드 비활성화')
    parser.add_argument('--auto', action='store_true', help='자동 제어 켜기')
    
    args = parser.parse_args()
    
    # Firebase 초기화
    if args.firebase:
        init_firebase(args.firebase)
    
    # 센서 모니터링
    sensor_monitor = None
    if not args.no_sensor:
        sensor_monitor = SensorMonitor(use_firebase=(firebase_db is not None))
        sensor_monitor.start()
    
    # 자동 제어 활성화
    if args.auto:
        with auto_control_lock:
            auto_control['enabled'] = True
        print("🤖 자동 환경 제어 활성화")
    
    # API 서버
    if args.api:
        api_server = APIServer(sensor_monitor)
        api_server.start()
        time.sleep(1)
    
    # 영상 재생
    if not args.no_video and args.video_path:
        try:
            play_video(args.video_path, args.fullscreen, args.loop, args.api)
        finally:
            if sensor_monitor:
                sensor_monitor.stop()
    elif args.no_video:
        status = "📊 센서 모니터링"
        if firebase_db:
            status += " + Firebase"
        if args.api:
            status += " + API"
        if args.auto:
            status += " + 🤖 자동 제어"
        
        print(f"\n{status} 실행 중..")
        print("Ctrl+C로 종료하세요\n")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            if sensor_monitor:
                sensor_monitor.stop()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ 오류: {e}")
        import traceback
        traceback.print_exc()
