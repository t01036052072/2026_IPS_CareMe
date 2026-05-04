from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import List, Optional, Literal
import re

# ── DB 설정 ──────────────────────────────────────────────
# medications.db 파일을 현재 프로젝트 폴더에 생성
DATABASE_URL = "sqlite:///./medications.db"

# DB 파일과 실제로 연결하는 엔진 생성
# check_same_thread=False → FastAPI 멀티스레드 환경에서 SQLite 사용 허용
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# DB 작업을 처리하는 세션 팩토리
# autocommit=False → db.commit() 직접 호출해야 저장됨
# autoflush=False  → commit 전에 자동으로 DB에 반영하지 않음
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ORM 모델 클래스들이 상속받을 베이스
Base = declarative_base()


# ── ORM 모델 (실제 DB 테이블 구조 정의) ──────────────────
class MedicationModel(Base):
    __tablename__ = "medications"  # DB에 생성될 테이블 이름

    id            = Column(Integer, primary_key=True, index=True)  # 고유 식별자 (자동 증가)
    user_id       = Column(Integer, nullable=False)                 # 사용자 ID
    name          = Column(String, nullable=False)                  # 약 이름
    period        = Column(String, nullable=False)                  # 오전 / 오후
    time          = Column(String, nullable=False)                  # "HH:MM" 24시간 형식으로 저장
    count         = Column(Integer, nullable=False)                 # 복약 개수 (정)
    duration_days = Column(Integer, nullable=False)                 # 복약 기간 (일)
    created_at    = Column(DateTime, default=datetime.utcnow)       # 등록 시각 (자동 입력)


# 정의한 테이블이 DB에 없으면 자동으로 생성
Base.metadata.create_all(bind=engine)


# ── 의존성 ────────────────────────────────────────────────
# API 요청마다 DB 세션(창구)을 자동으로 열고 닫아주는 함수
def get_db():
    db = SessionLocal()  # DB 창구 열기
    try:
        yield db          # API 함수에게 창구 넘겨주기
    finally:
        db.close()        # 요청이 끝나면 에러 여부 관계없이 무조건 창구 닫기


# ── Pydantic 스키마 ───────────────────────────────────────
# 사용자가 보낸 데이터가 올바른지 검사하는 양식

class MedicationCreate(BaseModel):
    user_id:       int                       # 사용자 고유 번호
    name:          str                       # 약 이름
    period:        Literal["오전", "오후"]    # 오전/오후 선택값 (이 두 값 외엔 자동으로 에러)
    time:          str                       # 시간 입력 "HH:MM" 예: "08:30", "01:00"
    count:         int                       # 복약 개수 (정 단위)
    duration_days: int                       # 복약 기간 (일 단위)

    @field_validator("time")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        # 입력값이 HH:MM 형식인지 정규식으로 검사
        # 허용 범위: 시(01~12), 분(00~59) — 오전/오후 선택이 따로 있으므로 12시간 형식
        if not re.fullmatch(r"(0?[1-9]|1[0-2]):[0-5][0-9]", v):
            raise ValueError("time 형식은 'HH:MM' 이어야 합니다. 예: '08:30', '12:00'")
        # "8:30" 처럼 입력해도 "08:30" 으로 자동 변환 (zero-padding)
        h, m = v.split(":")
        return f"{int(h):02d}:{m}"

    @field_validator("count")
    @classmethod
    def count_positive(cls, v: int) -> int:
        # 복약 개수는 최소 1정 이상이어야 함
        if v < 1:
            raise ValueError("count는 1 이상이어야 합니다.")
        return v

    @field_validator("duration_days")
    @classmethod
    def duration_positive(cls, v: int) -> int:
        # 복약 기간은 최소 1일 이상이어야 함
        if v < 1:
            raise ValueError("duration_days는 1 이상이어야 합니다.")
        return v


class MedicationDetail(BaseModel):
    # DB 데이터를 앱에 응답으로 내보낼 때 사용하는 양식
    id:            int
    user_id:       int
    name:          str
    period:        str       # "오전" / "오후"
    time:          str       # 저장된 24시간 형식 시간
    time_label:    str       # UI 표시용 "오전 08:30" 형식
    count:         int
    duration_days: int
    created_at:    datetime

    class Config:
        # SQLAlchemy ORM 객체를 Pydantic 모델로 자동 변환 허용
        from_attributes = True


class MedicationSummary(BaseModel):
    # 목록 조회 화면용 양식
    # > 버튼 누르기 전 → id, name, time_label만 표시
    # > 버튼 누른 후  → detail 필드에 상세정보 포함
    id:         int
    name:       str
    time_label: str                        # "오전 08:30" 형식
    detail:     Optional[MedicationDetail] = None  # 기본값 None (상세 미포함)


# ── 헬퍼 ─────────────────────────────────────────────────
# DB에서 꺼낸 날것의 데이터를 앱이 쓰기 좋게 가공하는 변환 함수
# _ 언더바 prefix = 이 파일 안에서만 쓰는 내부 함수
def _to_detail(m: MedicationModel) -> MedicationDetail:
    # 저장된 24시간 시간을 시/분으로 분리
    h, mi = map(int, m.time.split(":"))

    # 24시간 → 12시간 변환
    # 0시  → 12시 (자정), 13시 → 1시, 그 외는 그대로
    display_h = 12 if h == 0 else (h - 12 if h > 12 else h)

    # UI 표시용 문자열 조합 예: "오후 06:30"
    time_label = f"{m.period} {display_h:02d}:{mi:02d}"

    return MedicationDetail(
        id=m.id,
        user_id=m.user_id,
        name=m.name,
        period=m.period,
        time=m.time,
        time_label=time_label,
        count=m.count,
        duration_days=m.duration_days,
        created_at=m.created_at,
    )


# ── 오전/오후 + 시간 → 24시간 변환 함수 ──────────────────
# DB에는 항상 24시간 형식으로 저장해서 시간 순 정렬이 가능하게 함
def _to_24h(period: str, time: str) -> str:
    h, m = map(int, time.split(":"))

    if period == "오전":
        # 오전 12시 → 0시 (자정)
        if h == 12:
            h = 0
    else:  # 오후
        # 오후 12시는 그대로 12시, 나머지는 +12
        if h != 12:
            h += 12

    return f"{h:02d}:{m:02d}"


# ── 라우터 설정 ───────────────────────────────────────────
# prefix="/medications" → 모든 엔드포인트 앞에 /medications 자동으로 붙음
router = APIRouter(prefix="/medications", tags=["복약 일정"])


# ────────────────────────────────────────────────────────
# 1. 복약 일정 조회  GET /medications
# ────────────────────────────────────────────────────────
@router.get("", response_model=List[MedicationSummary], summary="복약 일정 조회")
def get_medications(
    user_id:     int,
    show_detail: bool = False,   # 기본값 False → 목록만, True → 상세정보 포함
    db:          Session = Depends(get_db),
):
    # 해당 user_id의 복약 일정 전체 조회
    rows = db.query(MedicationModel).filter(MedicationModel.user_id == user_id).all()

    # 저장된 24시간 형식 time 기준으로 시간 순 정렬
    rows.sort(key=lambda m: m.time)

    result = []
    for m in rows:
        # 헬퍼로 ORM 객체 → MedicationDetail 변환
        detail = _to_detail(m)
        result.append(MedicationSummary(
            id=m.id,
            name=m.name,
            time_label=detail.time_label,
            # show_detail=True일 때만 detail 포함, False면 None
            detail=detail if show_detail else None,
        ))

    return result


# ────────────────────────────────────────────────────────
# 2. 복약 일정 등록  POST /medications
# ────────────────────────────────────────────────────────
@router.post("", response_model=MedicationDetail, status_code=201, summary="복약 일정 등록")
def create_medication(
    payload: MedicationCreate,   # 요청 body (자동으로 유효성 검사됨)
    db:      Session = Depends(get_db),
):
    # 오전/오후 + 12시간 → 24시간 변환 후 저장 (시간 순 정렬을 위해)
    time_24h = _to_24h(payload.period, payload.time)

    # ORM 객체 생성
    med = MedicationModel(
        user_id=payload.user_id,
        name=payload.name,
        period=payload.period,
        time=time_24h,
        count=payload.count,
        duration_days=payload.duration_days,
    )

    db.add(med)      # DB에 추가 예약
    db.commit()      # 실제 저장
    db.refresh(med)  # 저장된 데이터(id, created_at 등) 다시 불러오기

    # 저장된 ORM 객체를 응답 형식으로 변환해서 반환
    return _to_detail(med)


# ────────────────────────────────────────────────────────
# 3. 복약 일정 삭제  DELETE /medications/{medication_id}
# ────────────────────────────────────────────────────────
@router.delete("/{medication_id}", summary="복약 일정 삭제")
def delete_medication(
    medication_id: int,   # URL 경로에서 받는 삭제할 일정의 id
    db:            Session = Depends(get_db),
):
    # 해당 id의 복약 일정 조회
    med = db.query(MedicationModel).filter(MedicationModel.id == medication_id).first()

    # 존재하지 않는 id면 404 에러 반환
    if not med:
        raise HTTPException(status_code=404, detail="해당 복약 일정을 찾을 수 없습니다.")

    db.delete(med)   # 삭제 예약
    db.commit()      # 실제 삭제

    return {"message": f"복약 일정(id={medication_id})이 삭제되었습니다."}
