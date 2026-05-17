from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
import re

# database.py에서 DB 세션 연동 함수와 Appointment 테이블 모델 가져오기
from practice.database import get_db
from my_project.models import Appointment

router = APIRouter(prefix="/appointments", tags=["병원 예약"])


# ── Pydantic 스키마 ───────────────────────────────────────
class AppointmentCreate(BaseModel):
    user_id:        int    # 사용자 고유 번호
    hospital_name:  str    # 병원 이름
    date:           str    # 예약 날짜 "YYYY-MM-DD" 예: "2026-05-04"
    time:           str    # 예약 시간 "HH:MM" 예: "14:00"
    alarm_date:     str    # 알림 날짜 "YYYY-MM-DD"
    alarm_time:     str    # 알림 시간 "HH:MM"

    @field_validator("date", "alarm_date")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])", v):
            raise ValueError("날짜 형식은 'YYYY-MM-DD' 이어야 합니다. 예: '2026-05-04'")
        return v

    @field_validator("time", "alarm_time")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", v):
            raise ValueError("시간 형식은 'HH:MM' 이어야 합니다. 예: '14:30'")
        return v


class AppointmentDetail(BaseModel):
    id:             int
    user_id:        int
    hospital_name:  str
    date:           str
    time:           str
    alarm_date:     str
    alarm_time:     str


# ── 헬퍼 함수 ─────────────────────────────────────────────
def _model_to_detail(appt: Appointment, alarm_date_str: str, alarm_time_str: str) -> AppointmentDetail:
    """MySQL Appointment 객체를 프론트엔드 규격인 AppointmentDetail로 가공합니다."""
    # database.py의 appointment_time(DateTime)에서 날짜와 시간 문자열 추출
    date_str = appt.appointment_time.strftime("%Y-%m-%d")
    time_str = appt.appointment_time.strftime("%H:%M")
    
    return AppointmentDetail(
        id=appt.id,
        user_id=int(appt.user_id),
        hospital_name=appt.hospital_name,
        date=date_str,
        time=time_str,
        alarm_date=alarm_date_str,
        alarm_time=alarm_time_str
    )


# ── 1. 병원 예약 등록 ──────────────────────────────────────
@router.post("", response_model=AppointmentDetail, status_code=201, summary="병원 예약 등록")
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    # 프론트가 보낸 날짜와 시간을 파이썬 datetime 객체로 결합 및 변환
    appt_datetime = datetime.strptime(f"{payload.date} {payload.time}", "%Y-%m-%d %H:%M")

    # 사용자가 화면에 입력한 값으로 MySQL 데이터베이스 행 객체 생성
    # database.py의 컬럼명(user_id, title, hospital_name, appointment_time)에 맞춰 넣어줍니다.
    new_appt = Appointment(
        user_id=str(payload.user_id),
        title=f"{payload.hospital_name} 예약",
        hospital_name=payload.hospital_name,
        appointment_time=appt_datetime
    )

    # 💡 핵심: AWS RDS MySQL에 예약 정보를 실시간으로 자동 저장하는 구간
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)

    return _model_to_detail(new_appt, payload.alarm_date, payload.alarm_time)


# ── 2. 병원 예약 조회 ──────────────────────────────────────
@router.get("", response_model=List[AppointmentDetail], summary="병원 예약 조회")
def get_appointments(user_id: int, month: Optional[str] = None, db: Session = Depends(get_db)):
    # 💡 덤프 리스트 대신 MySQL에서 해당 유저의 모든 예약을 긁어옵니다.
    query = db.query(Appointment).filter(Appointment.user_id == str(user_id))
    rows = query.all()

    result = []
    for appt in rows:
        # 가상 데이터 연동을 위한 임시 알람 값 설정 (Detail 스키마 규격 충족용)
        alarm_date_str = appt.appointment_time.strftime("%Y-%m-%d")
        alarm_time_str = appt.appointment_time.strftime("%H:%M")
        
        result.append(_model_to_detail(appt, alarm_date_str, alarm_time_str))
        
    return result


# ── 3. 병원 예약 수정 ──────────────────────────────────────
@router.put("/{appointment_id}", response_model=AppointmentDetail, summary="병원 예약 수정")
def update_appointment(appointment_id: int, payload: AppointmentCreate, db: Session = Depends(get_db)):
    # MySQL에서 수정할 데이터를 찾습니다.
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="해당 예약을 찾을 수 없습니다.")

    # 사용자가 입력한 새 데이터로 업데이트
    appt_datetime = datetime.strptime(f"{payload.date} {payload.time}", "%Y-%m-%d %H:%M")
    appt.hospital_name = payload.hospital_name
    appt.title = f"{payload.hospital_name} 예약"
    appt.appointment_time = appt_datetime

    db.commit()
    db.refresh(appt)

    return _model_to_detail(appt, payload.alarm_date, payload.alarm_time)


# ── 4. 병원 예약 삭제 ──────────────────────────────────────
@router.delete("/{appointment_id}", summary="병원 예약 삭제")
def delete_appointment(appointment_id: int, db: Session = Depends(get_db)):
    # MySQL에서 삭제할 데이터를 찾습니다.
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="해당 예약을 찾을 수 없습니다.")

    # 💡 데이터베이스에서 완벽하게 자동 삭제 처리
    db.delete(appt)
    db.commit()

    return {"message": f"병원 예약(id={appointment_id})이 데이터베이스에서 삭제되었습니다."}