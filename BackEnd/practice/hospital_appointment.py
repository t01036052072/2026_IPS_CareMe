from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime
import re

router = APIRouter(prefix="/appointments", tags=["병원 예약"])

# 메모리에 임시 저장 (나중에 DB로 교체)
appointments_db = []
id_counter = 1


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
        # YYYY-MM-DD 형식 검사
        if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])", v):
            raise ValueError("날짜 형식은 'YYYY-MM-DD' 이어야 합니다. 예: '2026-05-04'")
        return v

    @field_validator("time", "alarm_time")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        # HH:MM 24시간 형식 검사
        if not re.fullmatch(r"([01]?[0-9]|2[0-3]):[0-5][0-9]", v):
            raise ValueError("시간 형식은 'HH:MM' 이어야 합니다. 예: '14:00'")
        h, m = v.split(":")
        return f"{int(h):02d}:{m}"


class AppointmentUpdate(BaseModel):
    hospital_name:  Optional[str] = None   # 수정할 병원 이름 (선택)
    date:           Optional[str] = None   # 수정할 예약 날짜 (선택)
    time:           Optional[str] = None   # 수정할 예약 시간 (선택)
    alarm_date:     Optional[str] = None   # 수정할 알림 날짜 (선택)
    alarm_time:     Optional[str] = None   # 수정할 알림 시간 (선택)

    @field_validator("date", "alarm_date")
    @classmethod
    def validate_date_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])", v):
            raise ValueError("날짜 형식은 'YYYY-MM-DD' 이어야 합니다.")
        return v

    @field_validator("time", "alarm_time")
    @classmethod
    def validate_time_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.fullmatch(r"([01]?[0-9]|2[0-3]):[0-5][0-9]", v):
            raise ValueError("시간 형식은 'HH:MM' 이어야 합니다.")
        h, m = v.split(":")
        return f"{int(h):02d}:{m}"


class AppointmentDetail(BaseModel):
    id:             int
    user_id:        int
    hospital_name:  str
    date:           str    # "YYYY-MM-DD"
    time:           str    # "HH:MM"
    alarm_date:     str
    alarm_time:     str


# ── 헬퍼 ─────────────────────────────────────────────────

def _to_detail(a: dict) -> AppointmentDetail:
    # 딕셔너리 → AppointmentDetail 변환
    return AppointmentDetail(
        id=a["id"], user_id=a["user_id"], hospital_name=a["hospital_name"],
        date=a["date"], time=a["time"],
        alarm_date=a["alarm_date"], alarm_time=a["alarm_time"],
    )


# ────────────────────────────────────────────────────────
# 1. 병원 예약 조회  GET /appointments
# ────────────────────────────────────────────────────────
@router.get("", response_model=List[AppointmentDetail], summary="병원 예약 조회")
def get_appointments(user_id: int, month: Optional[str] = None):
    """
    - user_id: 해당 사용자의 예약만 조회
    - month: "2026-05" 형식으로 넘기면 해당 월 예약만 필터링 (캘린더용)
    - 미입력 시 전체 예약 반환
    - 날짜 순으로 정렬
    """
    rows = [a for a in appointments_db if a["user_id"] == user_id]

    # month 파라미터 있으면 해당 월만 필터링
    if month:
        rows = [a for a in rows if a["date"].startswith(month)]

    # 날짜 + 시간 순 정렬
    rows.sort(key=lambda a: (a["date"], a["time"]))

    return [_to_detail(a) for a in rows]


# ────────────────────────────────────────────────────────
# 2. 병원 예약 등록  POST /appointments
# ────────────────────────────────────────────────────────
@router.post("", response_model=AppointmentDetail, status_code=201, summary="병원 예약 등록")
def create_appointment(payload: AppointmentCreate):
    global id_counter

    appointment = {
        "id":            id_counter,
        "user_id":       payload.user_id,
        "hospital_name": payload.hospital_name,
        "date":          payload.date,
        "time":          payload.time,
        "alarm_date":    payload.alarm_date,
        "alarm_time":    payload.alarm_time,
    }

    appointments_db.append(appointment)
    id_counter += 1

    return _to_detail(appointment)


# ────────────────────────────────────────────────────────
# 3. 병원 예약 수정  PATCH /appointments/{appointment_id}
# ────────────────────────────────────────────────────────
@router.patch("/{appointment_id}", response_model=AppointmentDetail, summary="병원 예약 수정")
def update_appointment(appointment_id: int, payload: AppointmentUpdate):
    # 해당 id 예약 찾기
    appointment = next((a for a in appointments_db if a["id"] == appointment_id), None)
    if not appointment:
        raise HTTPException(status_code=404, detail="해당 예약을 찾을 수 없습니다.")

    # 넘어온 값만 업데이트 (None이 아닌 것만)
    if payload.hospital_name is not None:
        appointment["hospital_name"] = payload.hospital_name
    if payload.date is not None:
        appointment["date"] = payload.date
    if payload.time is not None:
        appointment["time"] = payload.time
    if payload.alarm_date is not None:
        appointment["alarm_date"] = payload.alarm_date
    if payload.alarm_time is not None:
        appointment["alarm_time"] = payload.alarm_time

    return _to_detail(appointment)


# ────────────────────────────────────────────────────────
# 4. 병원 예약 삭제  DELETE /appointments/{appointment_id}
# ────────────────────────────────────────────────────────
@router.delete("/{appointment_id}", summary="병원 예약 삭제")
def delete_appointment(appointment_id: int):
    global appointments_db

    # 해당 id 존재 여부 확인
    appointment = next((a for a in appointments_db if a["id"] == appointment_id), None)
    if not appointment:
        raise HTTPException(status_code=404, detail="해당 예약을 찾을 수 없습니다.")

    # 해당 id 제외하고 다시 저장
    appointments_db = [a for a in appointments_db if a["id"] != appointment_id]
    return {"message": f"예약(id={appointment_id})이 삭제되었습니다."}
