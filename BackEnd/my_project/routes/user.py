from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from my_project.database import get_db
from my_project.models import UserTable
from my_project.schemas import UserCreate


SECRET_KEY = "health-care-ai-engineering-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

router = APIRouter(tags=["인증"])


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

    # bcrypt 72bytes 제한 검사
    if len(user.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=400,
            detail="비밀번호가 너무 깁니다. (최대 72bytes)"
        )
    print(user.password)
    print(len(user.password))
    print(len(user.password.encode("utf-8")))

    hashed_password = pwd_context.hash(user.password)

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
