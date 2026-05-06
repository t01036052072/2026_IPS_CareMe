from pydantic import BaseModel, Field, field_validator
from enum import Enum
import re
#아 진짜~
#성별 선택지 정의
class Gender(str, Enum):
    male = "남자"
    female = "여자"

#회원가입 데이터구조
class UserCreate(BaseModel):
    email: str
    name: str
    age: int
    gender: Gender 
    password: str

    # 비밀번호 검증 함수 추가
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str):
        # 1. 길이 체크 (8~20자)
        if not (8 <= len(v) <= 20):
            raise ValueError('비밀번호는 8자 이상 20자 이하로 설정해주세요.')
        
        # 2. 영문자 포함 여부 체크
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('비밀번호에 최소 하나의 영문자가 포함되어야 합니다.')
            
        # 3. 숫자 포함 여부 체크
        if not re.search(r'\d', v):
            raise ValueError('비밀번호에 최소 하나의 숫자가 포함되어야 합니다.')
            
        # 4. 허용된 문자만 있는지 체크 (영문+숫자만)
        if not re.fullmatch(r'[A-Za-z\d]+', v):
            raise ValueError('비밀번호는 영문자와 숫자만 사용할 수 있습니다.')
            
        return v

#로그인 시 받을 데이터 규칙
class LoginRequest(BaseModel):
    email: str
    password: str





