import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
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


# 마이페이지 계정 변경 요청 바디입니다.
# email만 보내면 아이디(이메일)만 변경하고, new_password를 보내면 비밀번호를 변경합니다.
# 비밀번호 변경 시에는 current_password가 반드시 필요합니다.
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


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=50)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str):
        if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
            raise ValueError("비밀번호는 영문자와 숫자를 모두 포함해야 합니다.")
        return value


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    age: Optional[int] = Field(default=None, ge=0, le=150)
    gender: Optional[str] = Field(default=None, max_length=50)
    height: Optional[float] = Field(default=None, gt=0, le=300)
    weight: Optional[float] = Field(default=None, gt=0, le=500)
    is_under_treatment: Optional[bool] = None
    has_family_history: Optional[bool] = None
    is_b_hepatitis_carrier: Optional[bool] = None
    medical_history: Optional[str] = None
    smoked_regular: Optional[bool] = None
    used_heated_tobacco: Optional[bool] = None
    used_vaping: Optional[bool] = None
    drinking_frequency: Optional[str] = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def validate_has_update(self):
        if not self.model_fields_set or all(
            getattr(self, field_name) is None for field_name in self.model_fields_set
        ):
            raise ValueError("수정할 프로필 정보를 입력해주세요.")
        return self


class BasicProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    age: Optional[int] = Field(default=None, ge=0, le=150)
    gender: Optional[str] = Field(default=None, max_length=50)
    height: Optional[float] = Field(default=None, gt=0, le=300)
    weight: Optional[float] = Field(default=None, gt=0, le=500)

    @model_validator(mode="after")
    def validate_has_update(self):
        if not self.model_fields_set or all(
            getattr(self, field_name) is None for field_name in self.model_fields_set
        ):
            raise ValueError("수정할 기본정보를 입력해주세요.")
        return self


class HealthProfileUpdate(BaseModel):
    is_under_treatment: Optional[bool] = None
    has_family_history: Optional[bool] = None
    is_b_hepatitis_carrier: Optional[bool] = None
    medical_history: Optional[str] = None
    smoked_regular: Optional[bool] = None
    used_heated_tobacco: Optional[bool] = None
    used_vaping: Optional[bool] = None
    drinking_frequency: Optional[str] = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def validate_has_update(self):
        if not self.model_fields_set or all(
            getattr(self, field_name) is None for field_name in self.model_fields_set
        ):
            raise ValueError("수정할 건강정보를 입력해주세요.")
        return self


class DiseaseHistoryUpdate(BaseModel):
    is_under_treatment: Optional[bool] = None
    has_family_history: Optional[bool] = None
    is_b_hepatitis_carrier: Optional[bool] = None
    medical_history: Optional[str] = None

    @model_validator(mode="after")
    def validate_has_update(self):
        if not self.model_fields_set or all(
            getattr(self, field_name) is None for field_name in self.model_fields_set
        ):
            raise ValueError("수정할 질환력 정보를 입력해주세요.")
        return self


class LifestyleUpdate(BaseModel):
    smoked_regular: Optional[bool] = None
    used_heated_tobacco: Optional[bool] = None
    used_vaping: Optional[bool] = None
    drinking_frequency: Optional[str] = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def validate_has_update(self):
        if not self.model_fields_set or all(
            getattr(self, field_name) is None for field_name in self.model_fields_set
        ):
            raise ValueError("수정할 흡연 및 음주 정보를 입력해주세요.")
        return self


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


def serialize_basic_profile(user: UserTable) -> dict:
    return {
        "name": user.name,
        "age": user.age,
        "gender": user.gender,
        "height": user.height,
        "weight": user.weight,
    }


def serialize_health_profile(user: UserTable) -> dict:
    return {
        "is_under_treatment": user.is_under_treatment,
        "has_family_history": user.has_family_history,
        "is_b_hepatitis_carrier": user.is_b_hepatitis_carrier,
        "medical_history": user.medical_history,
        "smoked_regular": user.smoked_regular,
        "used_heated_tobacco": user.used_heated_tobacco,
        "used_vaping": user.used_vaping,
        "drinking_frequency": user.drinking_frequency,
    }


def serialize_disease_history(user: UserTable) -> dict:
    return {
        "is_under_treatment": user.is_under_treatment,
        "has_family_history": user.has_family_history,
        "is_b_hepatitis_carrier": user.is_b_hepatitis_carrier,
        "medical_history": user.medical_history,
    }


def serialize_lifestyle(user: UserTable) -> dict:
    return {
        "smoked_regular": user.smoked_regular,
        "used_heated_tobacco": user.used_heated_tobacco,
        "used_vaping": user.used_vaping,
        "drinking_frequency": user.drinking_frequency,
    }


def update_user_fields(user: UserTable, update_data: BaseModel) -> None:
    for field_name, value in update_data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(user, field_name, value)


def update_password(user: UserTable, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="현재 비밀번호가 올바르지 않습니다.",
        )
    user.password = hash_password(new_password)


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


# 마이페이지 통합 조회 API
# - Authorization 헤더의 토큰으로 현재 로그인한 사용자를 확인합니다.
# - profile에는 회원가입 때 입력한 사용자 정보가 들어갑니다.
# - documents에는 현재 사용자 id에 연결된 진단서 업로드 내역이 최신순으로 들어갑니다.
# - 통합 서버에서는 /friend/mypage 경로로 호출됩니다.
@router.get("")
def read_mypage(
    db: Session = Depends(get_db),
    current_user: UserTable = Depends(get_current_user),
):
    return {
        "profile": serialize_user(current_user),
        "documents": get_my_documents(db, current_user.id),
    }


# 마이페이지 프로필 단독 조회 API
# - 진단서 목록 없이 사용자 프로필 정보만 필요할 때 사용합니다.
# - 이름, 이메일, 나이, 성별, 키, 몸무게, 질환/가족력/흡연/음주 정보를 반환합니다.
# - 통합 서버에서는 /friend/mypage/profile 경로로 호출됩니다.
@router.get("/profile")
def read_my_profile(current_user: UserTable = Depends(get_current_user)):
    return serialize_user(current_user)


@router.get("/profile/basic")
def read_my_basic_profile(current_user: UserTable = Depends(get_current_user)):
    return serialize_basic_profile(current_user)


@router.patch("/profile/basic")
def update_my_basic_profile(
    update_data: BasicProfileUpdate,
    db: Session = Depends(get_db),
    current_user: UserTable = Depends(get_current_user),
):
    update_user_fields(current_user, update_data)
    db.commit()
    db.refresh(current_user)

    return {
        "message": "기본정보가 변경되었습니다.",
        "profile": serialize_basic_profile(current_user),
    }


@router.get("/profile/health")
def read_my_health_profile(current_user: UserTable = Depends(get_current_user)):
    return serialize_health_profile(current_user)


@router.patch("/profile/health")
def update_my_health_profile(
    update_data: HealthProfileUpdate,
    db: Session = Depends(get_db),
    current_user: UserTable = Depends(get_current_user),
):
    update_user_fields(current_user, update_data)
    db.commit()
    db.refresh(current_user)

    return {
        "message": "건강정보가 변경되었습니다.",
        "profile": serialize_health_profile(current_user),
    }


@router.get("/profile/health/disease")
def read_my_disease_history(current_user: UserTable = Depends(get_current_user)):
    return serialize_disease_history(current_user)


@router.patch("/profile/health/disease")
def update_my_disease_history(
    update_data: DiseaseHistoryUpdate,
    db: Session = Depends(get_db),
    current_user: UserTable = Depends(get_current_user),
):
    update_user_fields(current_user, update_data)
    db.commit()
    db.refresh(current_user)

    return {
        "message": "질환력 정보가 변경되었습니다.",
        "profile": serialize_disease_history(current_user),
    }


@router.get("/profile/health/lifestyle")
def read_my_lifestyle(current_user: UserTable = Depends(get_current_user)):
    return serialize_lifestyle(current_user)


@router.patch("/profile/health/lifestyle")
def update_my_lifestyle(
    update_data: LifestyleUpdate,
    db: Session = Depends(get_db),
    current_user: UserTable = Depends(get_current_user),
):
    update_user_fields(current_user, update_data)
    db.commit()
    db.refresh(current_user)

    return {
        "message": "흡연 및 음주 정보가 변경되었습니다.",
        "profile": serialize_lifestyle(current_user),
    }


# 마이페이지 기본정보 수정 API
# - 통합 서버에서는 PATCH /friend/mypage/profile 경로로 호출됩니다.
# - 요청 body 예시: {"name": "홍길동", "gender": "남자", "height": 170, "weight": 60}
@router.patch("/profile")
def update_my_profile(
    update_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: UserTable = Depends(get_current_user),
):
    update_user_fields(current_user, update_data)
    db.commit()
    db.refresh(current_user)

    return {
        "message": "프로필 정보가 변경되었습니다.",
        "profile": serialize_user(current_user),
    }


# 마이페이지 진단서 내역 조회 API
# - 현재 로그인한 사용자 id와 연결된 documents 테이블 데이터만 조회합니다.
# - 진단서가 업로드될 때 current_user.id로 저장되므로, 새 업로드 후 다시 호출하면 최신 내역이 반영됩니다.
# - 통합 서버에서는 /friend/mypage/documents 경로로 호출됩니다.
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


# 계정 정보 변경 API
# - 이메일 변경과 비밀번호 변경을 한 엔드포인트에서 처리합니다.
# - 이메일 변경 시 중복 이메일이 있는지 먼저 확인합니다.
# - 비밀번호 변경 시 현재 비밀번호를 검증한 뒤 새 비밀번호를 해시로 저장합니다.
# - 이메일이 바뀌면 JWT payload의 sub도 바뀌어야 하므로 새 access_token을 함께 반환합니다.
# - 통합 서버에서는 /friend/mypage/account 경로로 호출됩니다.
@router.patch("/account/password")
def update_my_password(
    update_data: PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: UserTable = Depends(get_current_user),
):
    update_password(current_user, update_data.current_password, update_data.new_password)
    db.commit()

    return {"message": "비밀번호가 변경되었습니다."}


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


# 마이페이지 로그아웃 API
# - 서버는 JWT 토큰을 별도로 저장하지 않으므로 실제 로그아웃은 프론트의 토큰 삭제로 완료됩니다.
# - 이 API는 마이페이지 화면에서 로그아웃 버튼을 눌렀을 때 성공 메시지를 받기 위한 용도입니다.
# - 통합 서버에서는 /friend/mypage/logout 경로로 호출됩니다.
@router.post("/logout")
def logout_mypage():
    return {"message": "로그아웃 되었습니다."}


# 마이페이지 회원탈퇴 API
# - Authorization 헤더의 토큰으로 현재 사용자를 식별합니다.
# - 현재 사용자에게 연결된 진단서 내역을 먼저 삭제한 뒤 사용자 계정을 삭제합니다.
# - 계정 삭제 후 프론트는 저장된 access_token을 제거하고 로그인/시작 화면으로 이동해야 합니다.
# - 통합 서버에서는 /friend/mypage/withdraw 경로로 호출됩니다.
@router.delete("/withdraw")
def withdraw_mypage(
    db: Session = Depends(get_db),
    current_user: UserTable = Depends(get_current_user),
):
    db.query(DocumentTable).filter(DocumentTable.user_id == current_user.id).delete()
    db.delete(current_user)
    db.commit()
    return {"message": "회원탈퇴가 정상적으로 처리되었습니다."}
