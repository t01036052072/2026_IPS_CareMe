# practice/mainjeong.py
from fastapi import Depends, FastAPI, HTTPException, File, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import os
from sqlalchemy import text
from sqlalchemy.orm import Session

# DB 및 모델 
from practice.database import engine, Base
from my_project import models

# 내 기능들 가져오기
from practice import notifications 
from practice.pills import router as pill_router
from practice.pill_alarm import router as pill_alarm_router
from practice.hospital_appointment import router as appointment_router

# 친구(my_project) 기능 및 데이터 구조 가져오기
from my_project.schemas import UserCreate, LoginRequest
from my_project.database import get_db
from my_project.models import UserTable
from my_project.routes.user import create_access_token, pwd_context, router as friend_user_router
from my_project.routes.document import router as friend_doc_router
# 기존 import들 아래에 추가
from my_project.models import Base
import firebase_admin
from firebase_admin import credentials


def initialize_firebase_if_available():
    candidate_paths = [
        os.path.join(os.path.dirname(__file__), "serviceAccountKey.json"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "serviceAccountKey.json"),
    ]

    cred_path = next((path for path in candidate_paths if os.path.exists(path)), None)
    if not cred_path:
        print("[Firebase] serviceAccountKey.json 파일이 없어 푸시 알림 초기화를 건너뜁니다.")
        return

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)


initialize_firebase_if_available()


def ensure_user_profile_columns():
    required_columns = {
        "height": "FLOAT NULL",
        "weight": "FLOAT NULL",
        "smoked_regular": "BOOL DEFAULT 0",
        "used_heated_tobacco": "BOOL DEFAULT 0",
        "used_vaping": "BOOL DEFAULT 0",
        "drinking_frequency": "VARCHAR(100) NULL",
    }

    with engine.begin() as conn:
        existing_columns = {
            row[0] for row in conn.execute(text("DESCRIBE users")).fetchall()
        }
        for column_name, column_type in required_columns.items():
            if column_name not in existing_columns:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {column_type}"))
                print(f"[DB] users.{column_name} 컬럼을 추가했습니다.")

# --- 1. 앱 객체 생성 ---
app = FastAPI(title="CareMe Medication Service")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = await request.body()
    print(
        "[ValidationError]",
        request.method,
        request.url.path,
        "errors=",
        exc.errors(),
        "body=",
        body.decode("utf-8", errors="replace"),
    )
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# --- 2. 라우터 등록 (기능 합치기) ---
# 내 기능
app.include_router(pill_router)
app.include_router(pill_alarm_router)
app.include_router(appointment_router)

# 친구 기능 (경로가 겹치지 않게 /friend를 붙였습니다)
app.include_router(friend_user_router, prefix="/friend/user", tags=["친구 회원가입 기능"])
app.include_router(friend_doc_router, prefix="/friend/doc", tags=["친구 진단서 기능"])

# 앱 시작 시 실제 MySQL에 테이블 생성
Base.metadata.create_all(bind=engine)
ensure_user_profile_columns()


# --- 3. 설정 및 초기화 --- 
UPLOAD_DIR = "./uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# --- 4. API 경로 설정 ---

@app.get("/")
def root():
    return {"message": "나와 친구의 모든 기능이 합쳐진 통합 서버입니다!"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "query": q}

@app.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(UserTable).filter(UserTable.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")

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
            medical_history=", ".join(history_list),
            smoked_regular=user.smoked_regular,
            used_heated_tobacco=user.used_heated_tobacco,
            used_vaping=user.used_vaping,
            drinking_frequency=user.drinking_frequency,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {"message": "회원가입이 완료되었습니다.", "user_name": new_user.name}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"회원가입 중 오류 발생: {str(e)}")


@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserTable).filter(UserTable.email == request.email).first()
    if not user or not pwd_context.verify(request.password, user.password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 잘못되었습니다.")

    access_token = create_access_token(data={"sub": user.email})
    return {
        "message": f"환영합니다, {user.name}님!",
        "status": "success",
        "access_token": access_token,
        "token_type": "bearer",
        "user_name": user.name,
    }
