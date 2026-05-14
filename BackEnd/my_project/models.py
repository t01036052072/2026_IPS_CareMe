from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, Text
from database import Base

class UserTable(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    age = Column(Integer)
    gender = Column(String)
    # [추가] 기획서 반영: 신체 정보
    height = Column(Float, nullable=True) 
    weight = Column(Float, nullable=True)

    is_under_treatment = Column(Boolean, default=False)
    has_family_history = Column(Boolean, default=False)
    is_b_hepatitis_carrier = Column(Boolean, default=False)
    medical_history = Column(Text, nullable=True)

    # 🆕 라이프스타일 추가 필드
    smoked_regular = Column(Boolean, default=False)       # 일반담배
    used_heated_tobacco = Column(Boolean, default=False)  # 궐련형 전자담배
    used_vaping = Column(Boolean, default=False)          # 액상형 전자담배
    drinking_frequency = Column(String, nullable=True)     # 음주 빈도

class DocumentTable(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    doc_type = Column(String)
    hospital_name = Column(String)
    upload_date = Column(String)
    image_url = Column(String)
    ocr_count = Column(Integer)
    raw_text = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    simplified_text = Column(Text)  # 용어 순화된 내용 저장용
    medication_info = Column(Text)  # 처방 약 정보 저장용