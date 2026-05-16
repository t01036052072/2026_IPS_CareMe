
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker


# -----------------------------
# .env 파일 로드
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)


# -----------------------------
# 환경변수 읽기
# -----------------------------
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME")


# -----------------------------
# 예외 처리
# -----------------------------
required_values = {
    "DB_USER": DB_USER,
    "DB_PASSWORD": DB_PASSWORD,
    "DB_HOST": DB_HOST,
    "DB_PORT": DB_PORT,
    "DB_NAME": DB_NAME,
}

missing = [key for key, value in required_values.items() if not value]

if missing:
    raise ValueError(f".env 환경변수가 비어있습니다: {', '.join(missing)}")


# -----------------------------
# MySQL 연결 URL
# -----------------------------
DATABASE_URL = (
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}"
    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
)

print("DATABASE_URL CONNECTED")


# -----------------------------
# SQLAlchemy 엔진
# -----------------------------
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=True
)


# -----------------------------
# 세션 생성
# -----------------------------
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# -----------------------------
# Base 클래스
# -----------------------------
Base = declarative_base()


# -----------------------------
# FastAPI Dependency
# -----------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -----------------------------
# 기존 notifications.py 호환용
# -----------------------------
# 현재 notifications.py 에서 import 중이라
# 서버 실행 오류 방지용으로 임시 추가
medications_db = []
appointments_db = []
