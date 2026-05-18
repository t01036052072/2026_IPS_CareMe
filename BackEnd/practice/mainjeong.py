# practice/mainjeong.py
from fastapi import Depends, FastAPI, HTTPException, File, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
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
from chatbot.routers.chat import router as chatbot_router

# 친구(my_project) 기능 및 데이터 구조 가져오기
from my_project.schemas import UserCreate, LoginRequest
from my_project.database import get_db
from my_project.models import UserTable
from my_project.routes.user import router as friend_user_router
from my_project.routes.document import router as friend_doc_router
from my_project.routes.mypage import router as friend_mypage_router
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

frontend_origins = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:8087,http://127.0.0.1:8087,http://localhost:8081,http://127.0.0.1:8081",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in frontend_origins if origin.strip()],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
app.include_router(friend_user_router, prefix="/friend/user", tags=["회원가입 기능"])
app.include_router(friend_doc_router, prefix="/friend/doc", tags=["진단서 기능"])
app.include_router(friend_mypage_router, prefix="/friend/mypage", tags=["마이페이지"])
app.include_router(chatbot_router, prefix="/chatbot/chat", tags=["챗봇"])

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
    return {"message": "통합 서버."}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "query": q}

#아니깃헙아 push 받아달라고
