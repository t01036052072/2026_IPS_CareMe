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
# 모델 설정 (기존 호환용)
# -----------------------------
from sqlalchemy import Column, Integer, String, DateTime


# -----------------------------
# ⚠️ 순서 변경 1: 먼저 AWS RDS에 테이블부터 안전하게 생성합니다.
# -----------------------------
Base.metadata.create_all(bind=engine)


# -----------------------------
# AI Hub 연동 전 임시 알약 더미 데이터 자동 삽입 코드
# -----------------------------
from sqlalchemy.orm import Session
from my_project.models import Pill

#이거 좀 어려워서 질문하기...

def insert_dummy_pills():
    db: Session = SessionLocal()
    try:
        # 이미 데이터가 들어있다면 중복으로 넣지 않기 위해 개수 체크
        if db.query(Pill).count() == 0:
            dummy_pills = [
                Pill(
                    pill_code="A11A001",
                    pill_name="타이레놀정500mg",
                    enterprise="(주)한국얀센",
                    effect="감기로 인한 발열 및 통증, 두통, 신경통",
                    image_url="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500"
                ),
                Pill(
                    pill_code="A11A002",
                    pill_name="아스피린정100mg",
                    enterprise="바이엘코리아(주)",
                    effect="혈전 생성 억제 (심혈관 질환 예방)",
                    image_url="https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500"
                ),
                Pill(
                    pill_code="A11A003",
                    pill_name="이부프로펜정400mg",
                    enterprise="대웅제약(주)",
                    effect="소염진통제, 관절염, 몸살감기",
                    image_url="https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=500"
                )
            ]
            db.add_all(dummy_pills)
            db.commit()
            print("🎉 알약 더미 데이터 3건이 MySQL에 성공적으로 삽입되었습니다!")
    except Exception as e:
        db.rollback()
        print(f"❌ 더미 데이터 삽입 중 오류 발생: {e}")
    finally:
        db.close()

# ⚠️ 순서 변경 2: 테이블이 생성된 후에 더미 데이터를 밀어 넣습니다.
insert_dummy_pills()
