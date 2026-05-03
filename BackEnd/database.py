from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. DB 파일 경로 설정 (현재 폴더에 medical_app.db 라는 파일이 생깁니다)
SQLALCHEMY_DATABASE_URL = "sqlite:///./medical_app.db"

# 2. 서버와 DB를 잇는 엔진 생성
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 3. 데이터베이스와 대화하기 위한 세션(통로) 설정
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. 나중에 DB 테이블을 만들 때 기초가 되는 클래스
Base = declarative_base()

# 5. [중요] 실제 DB에 저장될 데이터 표(Table) 모양 정의
class UserTable(Base):
    __tablename__ = "users" # DB 안에서 쓸 테이블 이름

    id = Column(Integer, primary_key=True, index=True) # 고유 번호
    email = Column(String, unique=True, index=True)    # 이메일 (중복 안됨)
    name = Column(String)
    age = Column(Integer)
    gender = Column(String)
    password = Column(String)