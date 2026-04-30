import re
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional
from enum import Enum

from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles # 이미지 서빙용
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from jose import JWTError, jwt
from passlib.context import CryptContext

# 1. database.py에서 설정값들을 가져옵니다 (기존 유지)
# UserTable 외에 DocumentTable도 정의되어 있어야 합니다!
from database import SessionLocal, engine, UserTable, Base

# 서버 시작 시 DB 테이블 생성
Base.metadata.create_all(bind=engine)
app = FastAPI()

# --- 이미지 업로드 설정 ---
UPLOAD_DIR = "./static/uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# 프론트엔드에서 http://서버주소/static/uploads/파일명 으로 접근 가능하게 설정
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- 보안 및 토큰 설정 (기존 유지) ---
SECRET_KEY = "health-care-ai-engineering-2026" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- DB 세션 관리 (기존 유지) ---
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

# 3. 회원가입 API (기존 유지)
@app.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(UserTable).filter(UserTable.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")

    hashed_password = pwd_context.hash(user.password)

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
        print(f"\n❌ DB 저장 에러 발생: {e}\n") 
        raise HTTPException(status_code=500, detail=f"회원가입 중 오류 발생: {str(e)}")

# 4. 로그인 API (기존 유지)
@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserTable).filter(UserTable.email == request.email).first()
    if not user or not pwd_context.verify(request.password, user.password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 잘못되었습니다.")
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "user_name": user.name}

@app.post("/logout")
def logout():
    return {"message": "로그아웃 되었습니다."}

# 5. 회원 탈퇴 API (기존 유지)
class DeleteUserRequest(BaseModel):
    email: str
    password: str

@app.delete("/withdraw")
def withdraw(request: DeleteUserRequest, db: Session = Depends(get_db)):
    user = db.query(UserTable).filter(UserTable.email == request.email).first()
    if not user or not pwd_context.verify(request.password, user.password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 일치하지 않습니다.")
    try:
        db.delete(user)
        db.commit()
        return {"message": f"{request.email} 계정 탈퇴가 완료되었습니다."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="탈퇴 처리 중 서버 오류가 발생했습니다.")

# --- 추가된 문서 관리 API ---

# 6. 문서 이미지 업로드 API (진단서/처방전 구분)
@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...), 
    doc_type: str = Form(...), # "diagnosis" or "prescription"
    upload_date: str = Form(...), # "YYYY-MM-DD"
    db: Session = Depends(get_db)
):
    # 파일 확장자 제한
    extension = file.filename.split(".")[-1].lower()
    if extension not in ["jpg", "jpeg", "png"]:
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

    # 고유파일명 생성 (UUID 활용)
    unique_filename = f"{doc_type}_{uuid.uuid4()}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # 서버 로컬 폴더에 이미지 저장
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 저장 중 오류 발생: {e}")

    # TODO: 여기서 OCR 및 NLP AI 모델을 호출하여 텍스트를 추출하고 순화합니다.
    # 현재는 파일 저장 후 경로만 반환합니다.
    
    return {
        "message": f"{doc_type} 업로드 성공",
        "image_url": f"/static/uploads/{unique_filename}",
        "date": upload_date
    }

# 7. 문서 상세 조회 API
@app.get("/documents/{doc_id}")
def get_document_detail(doc_id: int, db: Session = Depends(get_db)):
    # 가현님의 기획: 진단서/처방전 글을 보여주고 버튼 클릭 시 원본 보기
    # (실제 구현 시 DB에서 doc_id로 데이터를 쿼리해야 합니다)
    
    return {
        "id": doc_id,
        "date": "2026-04-30",
        "hospital_name": "OO 이비인후과",
        "diagnosis": {
            "refined_text": "순화된 진단 내용입니다.",
            "original_image_url": "/static/uploads/sample_diagnosis.jpg"
        },
        "prescription": {
            "refined_text": "순화된 처방 정보입니다.",
            "original_image_url": "/static/uploads/sample_prescription.jpg"
        }
    }