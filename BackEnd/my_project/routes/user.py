from datetime import datetime, timedelta
import base64
import hashlib
import hmac

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy import desc
from sqlalchemy.orm import Session

from my_project.database import get_db
from my_project.models import DocumentTable, UserTable
from my_project.schemas import UserCreate


SECRET_KEY = "health-care-ai-engineering-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
BCRYPT_SHA256_PREFIX = "bcrypt_sha256$"
PASSLIB_BCRYPT_SHA256_PREFIX = "$bcrypt-sha256$"

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

        if hashed_password.startswith(PASSLIB_BCRYPT_SHA256_PREFIX):
            return verify_passlib_bcrypt_sha256(plain_password, hashed_password)

        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except (TypeError, ValueError):
        return False


def verify_passlib_bcrypt_sha256(plain_password: str, hashed_password: str) -> bool:
    parts = hashed_password.split("$")
    if len(parts) != 5 or parts[1] != "bcrypt-sha256":
        return False

    config, salt, digest = parts[2], parts[3], parts[4]
    password_bytes = plain_password.encode("utf-8")

    if config.startswith("v=2,"):
        config_values = dict(item.split("=", 1) for item in config.split(","))
        bcrypt_type = config_values.get("t")
        rounds = int(config_values.get("r", "0"))
        prehashed_password = base64.b64encode(
            hmac.new(salt.encode("ascii"), password_bytes, hashlib.sha256).digest()
        )
    else:
        bcrypt_type, rounds_text = config.split(",", 1)
        rounds = int(rounds_text)
        prehashed_password = base64.b64encode(hashlib.sha256(password_bytes).digest())

    if bcrypt_type not in {"2a", "2b"} or not (4 <= rounds <= 31):
        return False

    bcrypt_hash = f"${bcrypt_type}${rounds:02d}${salt}{digest}".encode("ascii")
    return bcrypt.checkpw(prehashed_password, bcrypt_hash)


def serialize_user_for_mypage(user: UserTable) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "age": user.age,
        "gender": user.gender,
        "height": user.height,
        "weight": user.weight,
        "is_under_treatment": user.is_under_treatment,
        "has_family_history": user.has_family_history,
        "is_b_hepatitis_carrier": user.is_b_hepatitis_carrier,
        "medical_history": user.medical_history,
        "smoked_regular": user.smoked_regular,
        "used_heated_tobacco": user.used_heated_tobacco,
        "used_vaping": user.used_vaping,
        "drinking_frequency": user.drinking_frequency,
    }


def serialize_document_for_mypage(document: DocumentTable) -> dict:
    return {
        "id": document.id,
        "doc_type": document.doc_type,
        "hospital_name": document.hospital_name,
        "upload_date": document.upload_date,
        "image_url": document.image_url,
        "ocr_count": document.ocr_count,
        "simplified_text": document.simplified_text,
        "medication_info": document.medication_info,
    }


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

        access_token = create_access_token(data={"sub": new_user.email})
        return {
            "message": f"{new_user.name}님, 생활습관 정보까지 포함된 가입이 완료되었습니다!",
            "access_token": access_token,
            "token_type": "bearer",
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

    if not user.password.startswith(BCRYPT_SHA256_PREFIX):
        user.password = hash_password(form_data.password)
        db.commit()

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def read_users_me(
    db: Session = Depends(get_db),
    current_user: UserTable = Depends(get_current_user),
):
    documents = (
        db.query(DocumentTable)
        .filter(DocumentTable.user_id == current_user.id)
        .order_by(desc(DocumentTable.id))
        .all()
    )

    return {
        "profile": serialize_user_for_mypage(current_user),
        "document_count": len(documents),
        "documents": [serialize_document_for_mypage(document) for document in documents],
    }


@router.post("/logout")
def logout():
    return {"message": "로그아웃 되었습니다."}


@router.delete("/withdraw")
def withdraw(db: Session = Depends(get_db), current_user: UserTable = Depends(get_current_user)):
    db.delete(current_user)
    db.commit()
    return {"message": "회원탈퇴가 정상적으로 처리되었습니다."}
