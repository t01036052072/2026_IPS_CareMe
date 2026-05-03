import re
import os
import uuid
import shutil
from datetime import datetime, timedelta
from typing import Optional, List
from enum import Enum

from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from jose import JWTError, jwt
from passlib.context import CryptContext

# --- [추가] PaddleOCR 관련 임포트 ---
from paddleocr import PaddleOCR

# 1. database.py에서 설정값 가져오기
from database import SessionLocal, engine, UserTable, Base

# 서버 시작 시 DB 테이블 생성
Base.metadata.create_all(bind=engine)

# --- [추가] 환경 변수 및 모델 초기화 ---
os.environ['FLAGS_use_onednn'] = '0' # 엔진 충돌 방지

app = FastAPI()

# 서버 시작 시 OCR 모델을 메모리에 한 번만 로드합니다.
# 인공지능공학과 프로젝트 환경에 맞춰 인식률을 높인 설정을 적용했습니다.
ocr = PaddleOCR(
    lang='korean', 
    enable_mkldnn=False, 
    use_textline_orientation=True,
    text_det_thresh=0.1,
    text_det_box_thresh=0.1,
    text_det_unclip_ratio=2.5
)

# --- 이미지 업로드 설정 ---
UPLOAD_DIR = "./static/uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app.mount("/static", StaticFiles(directory="static"), name="static")

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

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "의료 AI 백엔드 서버가 작동 중입니다!"}

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
        raise HTTPException(status_code=500, detail=f"회원가입 중 오류 발생: {str(e)}")

@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserTable).filter(UserTable.email == request.email).first()
    if not user or not pwd_context.verify(request.password, user.password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 잘못되었습니다.")
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "user_name": user.name}

# --- 수정된 문서 관리 및 OCR API ---

@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...), 
    doc_type: str = Form(...), # "diagnosis" or "prescription"
    upload_date: str = Form(...), # "YYYY-MM-DD"
    db: Session = Depends(get_db)
):
    # 1. 파일 확장자 체크
    extension = file.filename.split(".")[-1].lower()
    if extension not in ["jpg", "jpeg", "png"]:
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

    # 2. 고유파일명 생성 및 저장
    unique_filename = f"{doc_type}_{uuid.uuid4()}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 저장 중 오류 발생: {e}")

    # 3. [핵심] OCR 실행하여 텍스트 추출
    extracted_texts = []
    try:
        # 어제 성공한 그 로직 그대로 적용
        ocr_result = ocr.ocr(file_path)
        
        if ocr_result:
            for res in ocr_result:
                # PaddleOCRv5 딕셔너리 구조 대응
                if isinstance(res, dict) and 'rec_texts' in res:
                    extracted_texts = [text for text in res['rec_texts'] if text.strip()]
                # 리스트 구조 대응 (하위 호환)
                elif isinstance(res, list):
                    for line in res:
                        if len(line) > 1 and len(line[1][0]) > 0:
                            extracted_texts.append(line[1][0])
    except Exception as e:
        # OCR 실패 시 파일은 저장되었으므로 에러 메시지와 함께 반환
        return {"message": "파일 저장 성공, 그러나 OCR 분석 실패", "error": str(e)}
    
    # 4. 결과 반환 (추후 여기서 KoBART로 extracted_texts를 넘기면 됩니다!)
    return {
        "message": f"{doc_type} 업로드 및 분석 성공",
        "image_url": f"/static/uploads/{unique_filename}",
        "upload_date": upload_date,
        "ocr_result": {
            "raw_text": extracted_texts,
            "text_count": len(extracted_texts)
        }
    }

@app.get("/documents/{doc_id}")
def get_document_detail(doc_id: int, db: Session = Depends(get_db)):
    # 상세 조회 로직 (추후 DB 연동 필요)
    return {
        "id": doc_id,
        "date": "2026-04-30",
        "hospital_name": "예스병원",
        "diagnosis": {
            "refined_text": "순화된 텍스트가 들어갈 자리입니다.",
            "original_image_url": "/static/uploads/sample.jpg"
        }
    }