from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from typing import List, Optional, Literal
import re

#모든 주소 앞에 자동으로 /medications가 붙는 것 (= 라우터 설정)
router = APIRouter(prefix="/medications", tags=["복약 일정"])


# 메모리에 임시 저장하는 리스트 (서버 재시작하면 초기화됨)
medications_db = []
id_counter = 1  # id 자동 증가용


# ── Pydantic 스키마 ───────────────────────────────────────
#사용다가 보낸 데이터가 올바른지 검사하는 양식
class MedicationCreate(BaseModel):
    user_id:       int#유저 식별
    name:          str#약 이름
    period:        Literal["오전", "오후"]   # 오전/오후 외 값 자동 에러
    time:          str#시간                       # "HH:MM" 예: "08:30"
    count:         int#갯수
    duration_days: int#기간

    @field_validator("time")
    #시간 범위 제한 00:00 구조여야 하며 시간은 01~12, 분은 00:59까지 허용
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        # 01~12시, 00~59분만 허용
        if not re.fullmatch(r"(0?[1-9]|1[0-2]):[0-5][0-9]", v):
            raise ValueError("time 형식은 'HH:MM' 이어야 합니다. 예: '08:30'")
        h, m = v.split(":")
        return f"{int(h):02d}:{m}"

    @field_validator("count")
    #갯수는 1 이상이어야 함
    @classmethod
    def count_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("count는 1 이상이어야 합니다.")
        return v

    @field_validator("duration_days")
    #복용 기간은 1 이상이어야 함
    @classmethod
    def duration_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("duration_days는 1 이상이어야 합니다.")
        return v


#저장된 값을 프론트에게 돌려줌
class MedicationDetail(BaseModel):
    id:            int#복약 일정 자체의 고유 번호 ex. 타이레놀 08:30
    user_id:       int#사용자 id
    name:          str
    period:        str
    time:          str#정렬용 24시간 형식
    time_label:    str#보여주기용 12시간 형식 ex. "오전 08:30" 형식
    count:         int
    duration_days: int

#> 버튼 누르기 전 목록 화면 (팝업 창 띄우기 전이기 때문에 이름과 시간 정보만)
class MedicationSummary(BaseModel):
    id:         int
    name:       str
    time_label: str
    detail:     Optional[MedicationDetail] = None


# ── 헬퍼 ─────────────────────────────────────────────────
#반복되는 로직이나 계산을 깔끔하게 처리
def _to_24h(period: str, time: str) -> str:
    # 오전/오후 + 12시간 → 24시간 변환 (시간 순 정렬용)
    h, m = map(int, time.split(":"))
    if period == "오전":
        h = 0 if h == 12 else h
    else:
        h = h if h == 12 else h + 12
    return f"{h:02d}:{m:02d}"

#내부 저장용 24시간제를 오전 / 오후로 바꿔 저장
def _make_detail(med: dict) -> MedicationDetail:
    # 저장된 딕셔너리 → MedicationDetail 변환
    h, mi = map(int, med["time"].split(":"))
    display_h = 12 if h == 0 else (h - 12 if h > 12 else h)
    time_label = f"{med['period']} {display_h:02d}:{mi:02d}"
    return MedicationDetail(
        id=med["id"], user_id=med["user_id"], name=med["name"],
        period=med["period"], time=med["time"], time_label=time_label,
        count=med["count"], duration_days=med["duration_days"],
    )


# 1. 복약 일정 조회
@router.get("", response_model=List[MedicationSummary], summary="복약 일정 조회")
def get_medications(user_id: int, show_detail: bool = False):
    # 해당 user_id 필터링 후 시간 순 정렬
    rows = sorted(
        [m for m in medications_db if m["user_id"] == user_id],
        key=lambda m: m["time"]
    )
    result = []
    for m in rows:
        detail = _make_detail(m)
        #> 버튼 눌러서 상세보기일 경우 기본 요약본 + 상세정보 제공
        result.append(MedicationSummary(
            id=m["id"], name=m["name"], time_label=detail.time_label,
            detail=detail if show_detail else None,
        ))
    return result



# 2. 복약 일정 등록
@router.post("", response_model=MedicationDetail, status_code=201, summary="복약 일정 등록")
def create_medication(payload: MedicationCreate):
    global id_counter

    # 오전/오후 + 12시간 → 24시간 변환 후 저장
    time_24h = _to_24h(payload.period, payload.time)

    med = {
        "id":            id_counter,
        "user_id":       payload.user_id,#토큰 해석해서 컴퓨터가 등록
        "name":          payload.name,
        "period":        payload.period,
        "time":          time_24h,
        "count":         payload.count,
        "duration_days": payload.duration_days,
    }
    #사용자가 입력한 값이 담긴 리스트 추가
    medications_db.append(med)
    id_counter += 1

    return _make_detail(med)

"""지금 코드에서는 MedicationCreate 스키마에 user_id: int가 포함되어 있어 사용자가 직접 입력해야만 작동
 로그인 할 때 토큰 넣어서 Header에서 토큰을 읽어와서 자동으로 처리하도록 바꾸기."""


# 3. 복약 일정 삭제  
@router.delete("/{medication_id}", summary="복약 일정 삭제")
def delete_medication(id: int):
    global medications_db #전역변수 사용한다는 선언

    # 해당 id 존재 여부 확인, 지우려는 ID가 목록에 없으면 404 Not Found 에러
    med = next((m for m in medications_db if m["id"] == id), None)
    #일치하는 ID가 있다면 그 딕셔너리를 med에 저장
    if not med:
        raise HTTPException(status_code=404, detail="해당 복약 일정을 찾을 수 없습니다.")

    # 해당 id 제외하고 다시 저장
    medications_db = [m for m in medications_db if m["id"] != id]
    #내가 선택한(지우려는) 항을 뺀 것을 medication_id리스트에 넣고 겡신 
    return {"message": f"복약 일정(id={id})이 삭제되었습니다."}
