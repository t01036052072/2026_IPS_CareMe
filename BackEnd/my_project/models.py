# my_project/models.py
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime
from practice.database import Base  # 💡 연결할 진짜 DB의 Base를 바라보게 합니다.

# ========================================================
# 1. 친구 프로젝트 기능용 테이블 (기존 내용 그대로)
# ========================================================

class UserTable(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True) # MySQL 안정성을 위해 길이 지정
    password = Column(String(255))
    name = Column(String(100))
    age = Column(Integer)
    gender = Column(String(50))
    is_under_treatment = Column(Boolean)
    has_family_history = Column(Boolean)
    is_b_hepatitis_carrier = Column(Boolean)
    medical_history = Column(Text)

class DocumentTable(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    doc_type = Column(String(100))
    hospital_name = Column(String(255))
    upload_date = Column(String(100))
    image_url = Column(String(500))
    ocr_count = Column(Integer)
    raw_text = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    simplified_text = Column(Text)  # 용어 순화된 내용 저장용
    medication_info = Column(Text)  # 처방 약 정보 저장용


# ========================================================
# 2. 내 기능용 테이블 (아래에 자연스럽게 덧붙임)
# ========================================================

class Medication(Base):
    __tablename__ = "medications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True)       # 사용자 식별자
    medication_name = Column(String(255), index=True) # 약 이름
    dose = Column(String(100))                       # 복용량 (예: 2알)
    time = Column(String(50))                        # 복용 시간 (08:30 등)

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True)       # 사용자 식별자
    title = Column(String(255))                     # 예약 제목
    hospital_name = Column(String(255))             # 병원 이름
    appointment_time = Column(DateTime)             # 예약 날짜 및 시간

class Pill(Base):
    __tablename__ = "pills"
    id = Column(Integer, primary_key=True, index=True)
    pill_code = Column(String(100), unique=True)    # 알약 고유 코드
    pill_name = Column(String(255), index=True)     # 알약 이름
    enterprise = Column(String(255))                # 제조사
    effect = Column(Text)                           # 효능/효과
    image_url = Column(Text)                        # 알약 이미지 링크