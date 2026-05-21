# my_project/models.py
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, Text, DateTime
from sqlalchemy.sql import func
from my_project.database import Base


class UserTable(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    age = Column(Integer)
    gender = Column(String(50))
    height = Column(Float, nullable=True)
    weight = Column(Float, nullable=True)

    is_under_treatment = Column(Boolean, default=False)
    has_family_history = Column(Boolean, default=False)
    is_b_hepatitis_carrier = Column(Boolean, default=False)
    medical_history = Column(Text, nullable=True)

    smoked_regular = Column(Boolean, default=False)
    used_heated_tobacco = Column(Boolean, default=False)
    used_vaping = Column(Boolean, default=False)
    drinking_frequency = Column(String(100), nullable=True)


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
    simplified_text = Column(Text)
    medication_info = Column(Text)


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True)
    medication_name = Column(String(255), index=True)
    dose = Column(String(100))
    time = Column(String(50))


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True)
    title = Column(String(255))
    hospital_name = Column(String(255))
    appointment_time = Column(DateTime)


class Pill(Base):
    __tablename__ = "pills"

    id = Column(Integer, primary_key=True, index=True)
    pill_code = Column(String(100), unique=True)
    pill_name = Column(String(255), index=True)
    enterprise = Column(String(255))
    effect = Column(Text)
    use_method = Column(Text)
    warning = Column(Text)
    interaction = Column(Text)
    side_effect = Column(Text)
    image_url = Column(Text)


class Chat(Base):
    __tablename__ = "chat"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
