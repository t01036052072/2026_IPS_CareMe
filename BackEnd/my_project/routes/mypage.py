import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import desc
from sqlalchemy.orm import Session

from my_project.database import get_db
from my_project.models import DocumentTable, UserTable
from my_project.routes.user import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)


router = APIRouter()


class AccountUpdate(BaseModel):
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(default=None, min_length=8, max_length=50)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: Optional[str]):
        if value is None:
            return value
        if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
            raise ValueError("비밀번호는 영문자와 숫자를 모두 포함해야 합니다.")
        return value


def serialize_user(user: UserTable) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "age": user.age,
        "gender": user.gender,
        "height": user.height,
        "weight": user.weight,
        "is_under_treatment": user.is_under_treatment,
        "has_family_history": user.has_family_history,
        "is_b_hepatitis_carrier": user.is_b_hepatitis_carrier,
        "medical_history": user.medical_history,
        "smoked_regular": user.smoked_regular,
        "used_heated_tobacco": user.used_heated_tobacco,
        "used_vaping": user.used_vaping,
        "drinking_frequency": user.drinking_frequency,
    }


def serialize_document(document: DocumentTable) -> dict:
    return {
        "id": document.id,
        "doc_type": document.doc_type,
        "hospital_name": document.hospital_name,
        "upload_date": document.upload_date,
        "image_url": document.image_url,
        "ocr_count": document.ocr_count,
        "simplified_text": document.simplified_text,
        "medication_info": document.medication_info,
    }


def get_my_documents(db: Session, user_id: int) -> list[dict]:
    documents = (
        db.query(DocumentTable)
        .filter(DocumentTable.user_id == user_id)
        .order_by(desc(DocumentTable.id))
        .all()
    )
    return [serialize_document(document) for document in documents]


@router.get("")
def read_mypage(
    db: Session = Depends(get_db),
    current_user: UserTable = Depends(get_current_user),
):
    return {
        "profile": serialize_user(current_user),
        "documents": get_my_documents(db, current_user.id),
    }


@router.get("/profile")
def read_my_profile(current_user: UserTable = Depends(get_current_user)):
    return serialize_user(current_user)


@router.get("/documents")
def read_my_documents(
    db: Session = Depends(get_db),
    current_user: UserTable = Depends(get_current_user),
):
    return {
        "count": db.query(DocumentTable)
        .filter(DocumentTable.user_id == current_user.id)
        .count(),
        "results": get_my_documents(db, current_user.id),
    }


@router.patch("/account")
def update_my_account(
    update_data: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: UserTable = Depends(get_current_user),
):
    if update_data.email is None and update_data.new_password is None:
        raise HTTPException(status_code=400, detail="변경할 이메일 또는 비밀번호를 입력해주세요.")

    if update_data.email and update_data.email != current_user.email:
        existing_user = (
            db.query(UserTable)
            .filter(UserTable.email == update_data.email, UserTable.id != current_user.id)
            .first()
        )
        if existing_user:
            raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")
        current_user.email = update_data.email

    if update_data.new_password:
        if not update_data.current_password:
            raise HTTPException(status_code=400, detail="현재 비밀번호를 입력해주세요.")
        if not verify_password(update_data.current_password, current_user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="현재 비밀번호가 올바르지 않습니다.",
            )
        current_user.password = hash_password(update_data.new_password)

    db.commit()
    db.refresh(current_user)

    return {
        "message": "계정 정보가 변경되었습니다.",
        "profile": serialize_user(current_user),
        "access_token": create_access_token(data={"sub": current_user.email}),
        "token_type": "bearer",
    }


@router.post("/logout")
def logout_mypage():
    return {"message": "로그아웃 되었습니다."}


@router.delete("/withdraw")
def withdraw_mypage(
    db: Session = Depends(get_db),
    current_user: UserTable = Depends(get_current_user),
):
    db.query(DocumentTable).filter(DocumentTable.user_id == current_user.id).delete()
    db.delete(current_user)
    db.commit()
    return {"message": "회원탈퇴가 정상적으로 처리되었습니다."}
