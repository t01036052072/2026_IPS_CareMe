import os
import firebase_admin
from firebase_admin import credentials, messaging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from practice.database import medications_db, appointments_db

#핸드폰에 앱을 설치하면 FCM이 그 기기에 기기토큰을 부여, 이를 fastapi에 보내주어 DB에 저장해두면, 
#나중에 알림 보낼 때 그 토큰을 이용해서 특정 기기에 푸시를 보낼 수 있음

# 1. Firebase 초기화
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cred_path = os.path.join(base_dir, 'serviceAccountKey.json')
cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)

def send_actual_push(token: str, title: str, body: str):
    """
    실제로 FCM을 통해 휴대폰으로 푸시를 쏘는 함수
    """
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        token=token, # 사용자의 휴대폰 고유 토큰
    )
    try:
        response = messaging.send(message)
        print(f"Successfully sent message: {response}")
    except Exception as e:
        print(f"Error sending message: {e}")

def check_and_send_alarms():
    now = datetime.now()
    current_date = now.date()
    current_time_str = now.strftime("%H:%M")

    # 1. 병원 예약 알림
    for appt in appointments_db:#병원 예약 일정 등록한 것 관리하는 db
        if appt.get("alarm_date") == current_date and appt.get("alarm_time") == current_time_str:
            # 기기 토큰은 보통 사용자 DB에 저장되어 있음
            user_token = appt.get("user_fcm_token") 
            msg = f"{appt['appointment_time']}에 {appt['hospital_name']} 예약이 있습니다."
            send_actual_push(user_token, "병원 예약 알림", msg)

    # 2. 복약 일정 알림
    for med in medications_db:#복약 일정 등록한 것 관리하는 db
        if med["start_date"] <= current_date <= med["end_date"]:
            if med["time"] == current_time_str:
                user_token = med.get("user_fcm_token")
                msg = f"{med['name']}을 {med['count']}알 복용하세요."
                send_actual_push(user_token, "복약 시간 알림", msg)

# 스케줄러 설정 (1분마다 체크)
scheduler = BackgroundScheduler()
scheduler.add_job(check_and_send_alarms, "interval", minutes=1)
scheduler.start()