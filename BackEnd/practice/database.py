# database.py

import os
from pathlib import Path

from dotenv import load_dotenv
print("DB_PORT =", os.getenv("DB_PORT"))
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker


# .env 절대경로 지정
env_path = Path(__file__).resolve().parent.parent / ".env"

print("ENV PATH:", env_path)
print("ENV EXISTS:", env_path.exists())

# .env 로드
load_dotenv(dotenv_path=env_path)

# 환경변수 읽기
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

# 디버깅 출력
print("DB_USER:", DB_USER)
print("DB_HOST:", DB_HOST)
print("DB_PORT:", DB_PORT)
print("DB_NAME:", DB_NAME)

# MySQL 접속 URL
DATABASE_URL = (
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}"
    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
)

print("DATABASE_URL:", DATABASE_URL)

# SQLAlchemy 엔진 생성
engine = create_engine(
    DATABASE_URL,
    pool_recycle=3600
)

# 세션 생성
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base 클래스
Base = declarative_base()


# DB 세션 의존성 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()