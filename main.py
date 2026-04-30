import re
from datetime import datetime, timedelta
from typing import Optional
from enum import Enum

from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from jose import JWTError, jwt
from passlib.context import CryptContext

# 1. database.py에서 설정값들을 가져옵니다
from database import SessionLocal, engine, UserTable, Base

# 서버 시작 시 DB 테이블 생성
Base.metadata.create_all(bind=engine)
app = FastAPI()

# --- 보안 및 토큰 설정 ---
SECRET_KEY = "health-care-ai-engineering-2026" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- DB 세션 관리 ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 데이터 구조 정의 (Schemas) ---

class Gender(str, Enum):
    male = "남자"
    female = "여자"

class UserCreate(BaseModel):
    email: str
    name: str
    age: int
    gender: Gender 
    password: str = Field(..., min_length=8, max_length=50)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str):
        if not (8 <= len(v) <= 50):
            raise ValueError('비밀번호는 8자 이상 50자 이하로 설정해주세요.')
        if not re.search(r'[A-Za-z]', v) or not re.search(r'\d', v):
            raise ValueError('비밀번호는 영문자와 숫자를 모두 포함해야 합니다.')
        return v

class LoginRequest(BaseModel):
    email: str
    password: str

# --- 유틸리티 함수 ---

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- API 기능 (Endpoints) ---

@app.get("/")
def read_root():
    return {"message": "의료 AI 백엔드 서버가 작동 중입니다!"}

# 3. 회원가입 API (에러 추적 기능 강화)
@app.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    # 중복 확인
    existing_user = db.query(UserTable).filter(UserTable.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")

    # 비밀번호 암호화
    hashed_password = pwd_context.hash(user.password)

    # DB 객체 생성
    # 주의: database.py의 UserTable에 age, gender 컬럼이 정의되어 있어야 합니다!
    try:
        new_user = UserTable(
            email=user.email,
            name=user.name,
            password=hashed_password,
            age=user.age, 
            gender=user.gender.value 
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {"message": f"{new_user.name}님, 회원가입이 완료되었습니다!"}
        
    except Exception as e:
        db.rollback()
        # 터미널 창에 어떤 에러인지 상세히 출력합니다.
        print(f"\n❌ DB 저장 에러 발생: {e}\n") 
        raise HTTPException(
            status_code=500, 
            detail=f"회원가입 중 서버 오류가 발생했습니다. 터미널의 에러 메시지를 확인하세요. (에러내용: {str(e)})"
        )

# 4. 로그인 API
@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserTable).filter(UserTable.email == request.email).first()
    
    if not user or not pwd_context.verify(request.password, user.password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 잘못되었습니다.")
    
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_name": user.name
    }

@app.post("/logout")
def logout():
    return {"message": "로그아웃 되었습니다."}

# 5. 회원 탈퇴 API
class DeleteUserRequest(BaseModel):
    email: str
    password: str

@app.delete("/withdraw")
def withdraw(request: DeleteUserRequest, db: Session = Depends(get_db)):
    # 1. 유저 찾기
    user = db.query(UserTable).filter(UserTable.email == request.email).first()
    
    # 2. 유저가 없거나 비밀번호가 틀린 경우
    if not user or not pwd_context.verify(request.password, user.password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 일치하지 않아 탈퇴할 수 없습니다.")
    
    try:
        # 3. DB에서 삭제
        db.delete(user)
        db.commit()
        return {"message": f"{request.email} 계정 탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다."}
    except Exception as e:
        db.rollback()
        print(f"탈퇴 처리 중 에러 발생: {e}")
        raise HTTPException(status_code=500, detail="탈퇴 처리 중 서버 오류가 발생했습니다.")