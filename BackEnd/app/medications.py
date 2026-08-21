from fastapi import APIRouter, HTTPException, Depends 
from pydantic import BaseModel, field_validator
from typing import List, Optional, Literal
from datetime import date, timedelta, datetime
from sqlalchemy.orm import Session
from core.models import Medication, UserTable
from core.routes.user import get_current_user

import re

# database.py에서 DB 세션 연동 함수와 Medication 테이블 모델 가져오기
from app.database import get_db

# 모든 주소 앞에 자동으로 /medications가 붙는 것 (= 라우터 설정)
router = APIRouter(prefix="/medications", tags=["복약 일정"])


# ── Pydantic 스키마 ───────────────────────────────────────
class MedicationCreate(BaseModel):
    name:          str  # 약 이름
    period:        Literal["오전", "오후"]   # 오전/오후 외 값 자동 에러
    time:          str  # 시간 ("HH:MM" 예: "08:30")
    count:         int  # 갯수
    duration_days: int  # 기간
    start_date:    date

    @field_validator("time")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        if not re.fullmatch(r"(0?[1-9]|1[0-2]):[0-5][0-9]", v):
            raise ValueError("time 형식은 'HH:MM' 이어야 합니다. 예: '08:30'")
        h, m = v.split(":")
        return f"{int(h):02d}:{m}"

    @field_validator("count")
    @classmethod
    def count_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("count는 1 이상이어야 합니다.")
        return v

    @field_validator("duration_days")
    @classmethod
    def duration_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("duration_days는 1 이상이어야 합니다.")
        return v


class MedicationDetail(BaseModel):
    id:            int  # 복약 일정 자체의 고유 번호
    user_id:       int  # 사용자 id
    name:          str
    period:        str
    time:          str  # 정렬용 24시간 형식
    time_label:    str  # 보여주기용 12시간 형식 ex. "오전 08:30" 형식
    count:         int
    duration_days: int
    start_date:    date # 등록 시작일
    end_date:      date # 만료일


class MedicationSummary(BaseModel):
    id:         int
    name:       str
    time_label: str
    detail:     Optional[MedicationDetail] = None


# ── 헬퍼 함수 ─────────────────────────────────────────────
def _to_24h(period: str, time: str) -> str:
    h, m = map(int, time.split(":"))
    if period == "오전":
        h = 0 if h == 12 else h
    else:
        h = h if h == 12 else h + 12
    return f"{h:02d}:{m:02d}"


def _model_to_detail(med: Medication, period: str, duration_days: int, start_date: date) -> MedicationDetail:
    """MySQL Medication 객체를 받아 MedicationDetail 양식으로 가공합니다."""
    h, mi = map(int, med.time.split(":"))
    display_h = 12 if h == 0 else (h - 12 if h > 12 else h)
    time_label = f"{period} {display_h:02d}:{mi:02d}"
    
    # count 뒤의 '알' 텍스트를 숫자로 역변환 (예: '1알' -> 1)
    count_int = med.count or (int(med.dose.replace("알", "")) if med.dose else 1)
    
    return MedicationDetail(
        id=med.id, 
        user_id=int(med.user_id), 
        name=med.medication_name,
        period=period, 
        time=med.time, 
        time_label=time_label,
        count=count_int, 
        duration_days=duration_days,
        start_date=start_date, 
        end_date=start_date + timedelta(days=duration_days - 1), 
    )


# ── 1. 복약 일정 조회 ──────────────────────────────────────
# 복약 일정 조회 API
# - 특정 user_id가 등록한 모든 복약 일정을 MySQL medications 테이블에서 조회합니다.
# - show_detail=true로 호출하면 복약명, 시간뿐 아니라 복용 기간/횟수/시작일/종료일 상세 정보까지 함께 내려줍니다.
# - 현재는 요청 파라미터의 user_id 기준으로 조회하며, 추후 토큰 기반 current_user.id 조회로 확장할 수 있습니다.
# - 통합 서버에서는 /medications 경로에 GET으로 호출됩니다.
@router.get("", response_model=List[MedicationSummary], summary="복약 일정 조회")
def get_medications(show_detail: bool = False, db: Session = Depends(get_db), current_user: UserTable = Depends(get_current_user)):
    rows = db.query(Medication).filter(Medication.user_id == str(current_user.id)).all()
    # 시간 순서대로 정렬
    rows_sorted = sorted(rows, key=lambda m: m.time)
    
    result = []
    for m in rows_sorted:
        # 가상 데이터 연동을 위한 임시 값 매핑 (Detail 양식 충족용)
        period = m.period or ("오전" if int(m.time.split(":")[0]) < 12 else "오후")
        duration_days = m.duration_days or 7
        start_date = m.start_date or date.today()
        detail = _model_to_detail(m, period=period, duration_days=duration_days, start_date=start_date)
        
        result.append(MedicationSummary(
            id=m.id, 
            name=m.medication_name, 
            time_label=detail.time_label,
            detail=detail if show_detail else None,
        ))
    return result


# ── 2. 복약 일정 등록 ──────────────────────────────────────
# 복약 일정 등록 API
# - 프론트에서 복약명, 오전/오후, 복용 시간, 복용 개수, 복용 기간, 시작일을 보내면 DB에 저장합니다.
# - 사용자가 입력하는 12시간제 시간을 DB 저장용 24시간제 시간으로 변환합니다.
# - Medication 테이블에는 medication_name, dose, time, user_id 중심으로 저장됩니다.
# - 통합 서버에서는 /medications 경로에 POST로 호출됩니다.
@router.post("", response_model=MedicationDetail, status_code=201, summary="복약 일정 등록")
def create_medication(
    payload: MedicationCreate,
    db: Session = Depends(get_db),
    current_user: UserTable = Depends(get_current_user),
):
    # 24시간 형식 시간 변환
    time_24h = _to_24h(payload.period, payload.time)

    # 사용자가 프론트엔드 화면에서 보낸 데이터로 MySQL 객체 생성
    new_med = Medication(
        user_id=str(current_user.id),
        medication_name=payload.name,  
        dose=f"{payload.count}알",      
        time=time_24h,
        period=payload.period,
        count=payload.count,
        duration_days=payload.duration_days,
        start_date=payload.start_date,
    )

    # 💡 핵심: AWS RDS MySQL 데이터베이스에 자동으로 반영시키는 구간
    db.add(new_med)
    db.commit()      
    db.refresh(new_med)

    # 최종 결과 반환
    return _model_to_detail(new_med, payload.period, payload.duration_days, payload.start_date)


# ── 3. 복약 일정 삭제 ──────────────────────────────────────
# 복약 일정 삭제 API
# - medication_id에 해당하는 복약 일정을 MySQL medications 테이블에서 삭제합니다.
# - 해당 id의 데이터가 없으면 404를 반환합니다.
# - 통합 서버에서는 /medications/{medication_id} 경로에 DELETE로 호출됩니다.
@router.delete("/{medication_id}", summary="복약 일정 삭제")
def delete_medication(medication_id: int, db: Session = Depends(get_db)):
    # 💡 리스트 필터링 대신 MySQL 데이터베이스에서 해당 id를 가진 행을 찾습니다.
    med = db.query(Medication).filter(Medication.id == medication_id).first()
    
    if not med:
        raise HTTPException(status_code=404, detail="해당 복약 일정을 찾을 수 없습니다.")

    # 💡 진짜 DB에서 자동으로 완벽히 삭제 처리
    db.delete(med)
    db.commit()
    
    return {"message": f"복약 일정(id={medication_id})이 데이터베이스에서 삭제되었습니다."}
