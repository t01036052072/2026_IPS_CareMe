from datetime import datetime, timedelta
import hashlib

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from my_project.database import get_db
from my_project.models import UserTable
from my_project.schemas import UserCreate


SECRET_KEY = "health-care-ai-engineering-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
BCRYPT_SHA256_PREFIX = "bcrypt_sha256$"

router = APIRouter()


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def hash_password(password: str) -> str:
    password_digest = hashlib.sha256(password.encode("utf-8")).hexdigest().encode("ascii")
    hashed_password = bcrypt.hashpw(password_digest, bcrypt.gensalt()).decode("utf-8")
    return f"{BCRYPT_SHA256_PREFIX}{hashed_password}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if hashed_password.startswith(BCRYPT_SHA256_PREFIX):
            stored_hash = hashed_password.removeprefix(BCRYPT_SHA256_PREFIX).encode("utf-8")
            password_digest = hashlib.sha256(plain_password.encode("utf-8")).hexdigest().encode("ascii")
            return bcrypt.checkpw(password_digest, stored_hash)

        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        return False


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="자격 증명을 확인할 수 없습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(UserTable).filter(UserTable.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(UserTable).filter(UserTable.email == user.email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")

    try:
        hashed_password = hash_password(user.password)

        history_list = []
        for disease in user.medical_history:
            status_list = []

            if disease.is_diagnosed:
                status_list.append("진단")

            if disease.is_medicated:
                status_list.append("약물치료")

            if status_list:
                history_list.append(f"{disease.name}({'+'.join(status_list)})")

        medical_history_str = ", ".join(history_list)

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
            smoked_regular=user.smoked_regular,
            used_heated_tobacco=user.used_heated_tobacco,
            used_vaping=user.used_vaping,
            drinking_frequency=user.drinking_frequency,
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return {
            "message": f"{new_user.name}님, 생활습관 정보까지 포함된 가입이 완료되었습니다!"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"회원가입 중 오류 발생: {str(e)}"
        )


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(UserTable).filter(UserTable.email == form_data.username).first()

    if user is None or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

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
