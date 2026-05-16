from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text
from practice.database import Base

class UserTable(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    name = Column(String)
    age = Column(Integer)
    gender = Column(String)
    is_under_treatment = Column(Boolean)
    has_family_history = Column(Boolean)
    is_b_hepatitis_carrier = Column(Boolean)
    medical_history = Column(Text)

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