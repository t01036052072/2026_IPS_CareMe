import re
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional
from enum import Enum
from datetime import datetime

# 1. 공통 열거형 및 서브 모델
class Gender(str, Enum):
    male = "남자"
    female = "여자"

class MedicalHistoryItem(BaseModel):
    name: str
    is_diagnosed: bool
    is_medicated: bool



class DiseaseStatus(BaseModel):
    name: str
    is_diagnosed: bool
    is_medicated: bool

# 2. 회원가입 및 로그인 관련 스키마
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    age: int
    gender: Gender
    password: str = Field(..., min_length=8, max_length=50)

    # [추가] 기획서 반영: 신체 정보
    height: float
    weight: float

    is_under_treatment: bool
    has_family_history: bool
    is_b_hepatitis_carrier: bool
    medical_history: List[MedicalHistoryItem]

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str):
        if not (8 <= len(v) <= 50):
            raise ValueError('비밀번호는 8자 이상 50자 이하로 설정해주세요.')
        if not re.search(r'[A-Za-z]', v) or not re.search(r'\d', v):
            raise ValueError('비밀번호는 영문자와 숫자를 모두 포함해야 합니다.')
        return v

class LoginRequest(BaseModel):
    email: Emailstr
    password: str

# 3. 문서(진단서) 관련 스키마
class DocumentBase(BaseModel):
    title: str
    content: Optional[str] = None

class DocumentCreate(DocumentBase):
    pass  # 업로드 시에는 제목과 내용만 받음

class DocumentDetail(DocumentBase): 
    id: int
    owner_id: int
    created_at: datetime
    
    # --- 가현님의 스케치 기획안 반영 필드 ---
    hospital_name: Optional[str] = None      # 스케치: 병원 이름
    upload_date: Optional[str] = None        # 스케치: 날짜 (예: 2025.12.01)
    simplified_text: Optional[str] = None    # 핵심: 어려운 용어 순화 결과
    medication_info: Optional[str] = None    # 스케치: 무슨 약 받았는지 기록
    image_url: Optional[str] = None          # 스케치: '원본 보기'용 경로
    # ---------------------------------------

    analysis_result: Optional[str] = None 

    class Config:
        from_attributes = True  # ORM 객체를 Pydantic 모델로 변환 허용