from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from practice.database import Base
from my_project.models import UserTable
from my_project.schemas import UserCreate, LoginRequest

# 보안 설정
SECRET_KEY = "health-care-ai-engineering-2026" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(tags=["Auth"])

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(UserTable).filter(UserTable.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")
    
    hashed_password = pwd_context.hash(user.password)
    
    history_list = []
    for d in user.medical_history:
        status = []
        if d.is_diagnosed: status.append("진단")
        if d.is_medicated: status.append("약물치료")
        if status:
            history_list.append(f"{d.name}({'+'.join(status)})")
    
    medical_history_str = ", ".join(history_list)

    try:
        new_user = UserTable(
            email=user.email, name=user.name, password=hashed_password,
            age=user.age, gender=user.gender.value,
            is_under_treatment=user.is_under_treatment,
            has_family_history=user.has_family_history,
            is_b_hepatitis_carrier=user.is_b_hepatitis_carrier,
            medical_history=medical_history_str
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {"message": f"{new_user.name}님, 회원가입이 완료되었습니다!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"회원가입 중 오류 발생: {str(e)}")

@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserTable).filter(UserTable.email == request.email).first()
    if not user or not pwd_context.verify(request.password, user.password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 잘못되었습니다.")
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "user_name": user.name}