from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from database import get_db
from models import UserTable
from schemas import UserCreate, LoginRequest

# 보안 설정
SECRET_KEY = "health-care-ai-engineering-2026" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Swagger의 Authorize 버튼 설정
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

router = APIRouter(tags=["Auth"])

# --- 유틸리티 함수 ---

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="자격 증명을 확인할 수 없습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(UserTable).filter(UserTable.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# --- API 엔드포인트 ---

@router.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    # 1. 중복 가입 체크
    existing_user = db.query(UserTable).filter(UserTable.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")
    
    # 2. 비밀번호 암호화
    hashed_password = pwd_context.hash(user.password)
    
    # 3. 질환력 상세 리스트 정제
    history_list = []
    for d in user.medical_history:
        status_list = []
        if d.is_diagnosed: status_list.append("진단")
        if d.is_medicated: status_list.append("약물치료")
        if status_list:
            history_list.append(f"{d.name}({'+'.join(status_list)})")
    
    medical_history_str = ", ".join(history_list)

    # 4. DB 저장 (🆕 라이프스타일 필드 포함)
    try:
        new_user = UserTable(
            email=user.email, 
            name=user.name, 
            password=hashed_password,
            age=user.age, 
            gender=user.gender.value,
            height=user.height,
            weight=user.weight,
            is_under_treatment=user.is_under_treatment,
            has_family_history=user.has_family_history,
            is_b_hepatitis_carrier=user.is_b_hepatitis_carrier,
            medical_history=medical_history_str,
            
            # 🆕 와이어프레임 추가 항목 매핑
            smoked_regular=user.smoked_regular,
            used_heated_tobacco=user.used_heated_tobacco,
            used_vaping=user.used_vaping,
            drinking_frequency=user.drinking_frequency
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {"message": f"{new_user.name}님, 생활습관 정보까지 포함된 가입이 완료되었습니다!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"회원가입 중 오류 발생: {str(e)}")

@router.post("/login")
def login(request: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserTable).filter(UserTable.email == request.username).first()
    
    if not user or not pwd_context.verify(request.password, user.password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 잘못되었습니다.")
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "user_name": user.name}

@router.get("/me")
def read_users_me(current_user: UserTable = Depends(get_current_user)):
    return current_user

@router.post("/logout")
def logout():
    return {"message": "로그아웃 되었습니다."}

@router.delete("/withdraw")
def withdraw(db: Session = Depends(get_db), current_user: UserTable = Depends(get_current_user)):
    db.delete(current_user)
    db.commit()
    return {"message": "회원탈퇴가 정상적으로 처리되었습니다."}