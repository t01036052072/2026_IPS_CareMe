# database.py
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. .env 파일 로드
load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

# 2. MySQL 접속 URL 생성
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"

# 3. SQLAlchemy 엔진 생성
# pool_recycle은 MySQL 연결 유지 시간을 관리합니다 (보안 및 안정성)
engine = create_engine(DATABASE_URL, pool_recycle=3600)

# 4. 세션 설정 (실제 DB 조작 도구)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 5. 모델 클래스의 부모 클래스
Base = declarative_base()

# DB 세션 의존성 주입 함수 (FastAPI에서 사용)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()












#임의로 만들었음

# 임의의 알약 데이터 (Mock Data)
# 리스트 안에 딕셔너리 형태로 저장합니다.
PILL_DB = [
    {
        "id": 1,
        "pill_name": "오메가엑스과립",
        "master_image_url": "https://careme-s3.amazonaws.com/pill_1.jpg",
        "effect": "비타민 A 및 D의 보급",
        "side_effect": "구역질, 구토, 가려움",
        "usage": "1일 2회 복용"
    },
    {
        "id": 2,
        "pill_name": "종근당오메가미니연질캡슐",
        "master_image_url": "https://careme-s3.amazonaws.com/pill_2.jpg",
        "effect": "혈중 중성지질 개선",
        "side_effect": "복부팽만감",
        "usage": "1일 1회 복용"
    }
]

medications_db = []
appointments_db = []