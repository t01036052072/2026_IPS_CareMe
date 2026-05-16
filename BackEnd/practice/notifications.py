import os
import firebase_admin
from firebase_admin import credentials, messaging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
#DB 세션 팩토리와 통합 모델 가져오기
from practice.database import SessionLocal
from my_project.models import Medication, Appointment


# 1. Firebase 초기화: 키 파일이 없으면 서버 시작을 막지 않고 알림만 비활성화합니다.
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
practice_dir = os.path.dirname(os.path.abspath(__file__))
candidate_cred_paths = [
    os.path.join(practice_dir, "serviceAccountKey.json"),
    os.path.join(base_dir, "serviceAccountKey.json"),
]
cred_path = next((path for path in candidate_cred_paths if os.path.exists(path)), None)
firebase_enabled = False

if cred_path:
    cred = credentials.Certificate(cred_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    firebase_enabled = True
else:
    print("[Firebase] serviceAccountKey.json 파일이 없어 푸시 알림을 비활성화합니다.")

def send_actual_push(token: str, title: str, body: str):
    """실제로 FCM을 통해 푸시를 쏘는 함수"""
    if not firebase_enabled:
        print("[FCM] Firebase가 초기화되지 않아 푸시 알림을 건너뜁니다.")
        return

    if not token:
        print("[FCM] 전송 실패: 기기 토큰이 없습니다.")
        return
        
    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        token=token,
    )
    try:
        response = messaging.send(message)
        print(f"Successfully sent message: {response}")
    except Exception as e:
        print(f"Error sending message: {e}")

def check_and_send_alarms():
    """백그라운드에서 주기적으로 돌며 클라우드 DB의 일정을 체크해 푸시를 보냅니다."""
    # 💡 요청을 받아서 처리하는 API가 아니라 스스로 도는 스케줄러이므로, SessionLocal()로 직접 DB 연결 통로를 열어줍니다.
    db = SessionLocal()
    try:
        now = datetime.now()
        current_date_str = now.strftime("%Y-%m-%d")
        current_time_str = now.strftime("%H:%M")

        # 💡 리스트 대신 AWS RDS 클라우드 DB에서 실시간 전체 예약 및 복약 데이터를 가져옵니다!
        appointments = db.query(Appointment).all()
        medications = db.query(Medication).all()

        # 1. 병원 예약 알림 검사
        for appt in appointments:
            appt_time_str = appt.appointment_time.strftime("%H:%M")
            appt_date_str = appt.appointment_time.strftime("%Y-%m-%d")
            
            # 임시 매핑 로직 (진짜 앱 구동 시에는 DB 구조에 알람설정 컬럼을 맞춰 연결하면 좋습니다)
            if appt_date_str == current_date_str and appt_time_str == current_time_str:
                # 임시 하드코딩 테스트용 토큰 사용 예시 (실제로는 User 테이블 연동)
                user_token = "mock_fcm_token_from_db" 
                msg = f"{appt_time_str}에 {appt.hospital_name} 예약이 있습니다."
                send_actual_push(user_token, "병원 예약 알림", msg)

        # 2. 복약 일정 알림 검사
        for med in medications:
            if med.time == current_time_str:
                user_token = "mock_fcm_token_from_db"
                msg = f"[{med.medication_name}] 복용 시간입니다. ({med.dose})"
                send_actual_push(user_token, "복약 알림", msg)
                
    except Exception as e:
        print(f"[Scheduler Error] 알림 검사 중 오류 발생: {e}")
    finally:
        # 💡 작업이 끝나면 데이터베이스 커넥션을 안전하게 닫아줍니다.
        db.close()

# 스케줄러 설정 (매 분마다 알림 조건이 충족되었는지 백그라운드 체크)
scheduler = BackgroundScheduler()
scheduler.add_job(check_and_send_alarms, "cron", second=0)  # 매 분 0초마다 실행
scheduler.start()
