from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from openai import OpenAI
from pydantic import BaseModel
from typing import List, Optional
import json
import os

from my_project.database import get_db
from my_project.models import UserTable
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/healthcare",
    tags=["healthcare"]
)

# =========================
# OpenAI Client
# =========================
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

# =========================
# Request / Response Schema
# =========================

class HealthcareGenerateRequest(BaseModel):
    user_id: int


class DiseaseItem(BaseModel):
    disease_id: int
    disease_name: str


class HealthcareItem(BaseModel):
    disease_name: str
    summary: str
    exercise: List[str]
    diet: List[str]
    lifestyle: List[str]
    health_score: int
    risk_level: str


class HealthcareResponse(BaseModel):
    status: str
    count: int
    data: List[HealthcareItem]

# =========================
# BMI 계산
# =========================
def calculate_bmi(
    height: float,
    weight: float,
):

    if not height or not weight:
        return None

    height_meter = height / 100

    bmi = weight / (
        height_meter * height_meter
    )

    return round(bmi, 1)

# =========================
# 질환 리스트 추출
# =========================
def extract_disease_list(
    medical_history
):

    if not medical_history:
        return []

    disease_list = []

    for item in medical_history:

        disease_name = item.get("name")

        if disease_name:
            disease_list.append(
                disease_name
            )

    return disease_list

# =========================
# OpenAI Prompt 생성
# =========================
def build_healthcare_prompt(
    user,
    disease_name,
    bmi,
):

    return f"""
사용자의 건강 정보를 기반으로
질환별 건강관리 추천을 생성해줘.

반드시 아래 JSON 형식만 반환해.

{{
  "disease_name": "",
  "summary": "",
  "exercise": [],
  "diet": [],
  "lifestyle": [],
  "health_score": 0,
  "risk_level": ""
}}

조건:
- 운동/식습관/생활습관은 각각 최대 3개
- 의료적 진단 금지
- 일반 건강관리 목적만 제공
- 한국어로 작성

사용자 건강 정보:
- 나이: {user.age}
- 성별: {user.gender}
- 키: {user.height}
- 몸무게: {user.weight}
- BMI: {bmi}

- 일반 담배 흡연:
{user.smoked_regular}

- 궐련형 전자담배:
{user.used_heated_tobacco}

- 액상형 전자담배:
{user.used_vaping}

- 음주 빈도:
{user.drinking_frequency}

- 가족력 여부:
{user.has_family_history}

- 현재 치료 여부:
{user.is_under_treatment}

- B형 간염 보유 여부:
{user.is_b_hepatitis_carrier}

질환명:
{disease_name}
"""

# =========================
# OpenAI 응답 생성
# =========================
def generate_ai_healthcare(
    user,
    disease_name,
):

    bmi = calculate_bmi(
        user.height,
        user.weight,
    )

    prompt = build_healthcare_prompt(
        user=user,
        disease_name=disease_name,
        bmi=bmi,
    )

    try:

        response = (
            client.chat.completions.create(
                model="gpt-5-mini",

                messages=[
                    {
                        "role": "system",
                        "content":
                        "당신은 건강관리 추천 AI입니다."
                    },

                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],

                temperature=0.7,
            )
        )

    except Exception as e:

        print("OpenAI API Error:", e)

        raise HTTPException(
            status_code=502,
            detail="OpenAI API 호출 실패"
        )

    try:

        result = json.loads(
            response.choices[0]
            .message
            .content
        )

    except Exception as e:

        print("JSON Parse Error:", e)

        raise HTTPException(
            status_code=500,
            detail="OpenAI 응답 파싱 중 오류가 발생했습니다."
        )

    return result

# =========================
# 질환 버튼 목록 조회 API
# =========================
@router.get(
    "/diseases/{user_id}"
)
def get_healthcare_diseases(
    user_id: int,
    db: Session = Depends(get_db)
):

    user = (
        db.query(UserTable)
        .filter(
            UserTable.id == user_id
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="사용자를 찾을 수 없습니다."
        )

    diseases = extract_disease_list(
        user.medical_history
    )

    return {
        "status": "success",

        "diseases": [
            {
                "disease_id": index + 1,
                "disease_name": disease
            }

            for index, disease
            in enumerate(diseases)
        ]
    }

# =========================
# 건강관리 생성 API
# =========================
@router.post(
    "/generate",
    response_model=HealthcareResponse
)
async def generate_healthcare(
    request: HealthcareGenerateRequest,
    db: Session = Depends(get_db),
):

    user = (
        db.query(UserTable)
        .filter(
            UserTable.id == request.user_id
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="사용자를 찾을 수 없습니다."
        )

    diseases = extract_disease_list(
        user.medical_history
    )

    if not diseases:

        raise HTTPException(
            status_code=400,
            detail="질환 정보가 없습니다."
        )

    result = []

    for disease in diseases:

        healthcare = (
            generate_ai_healthcare(
                user=user,
                disease_name=disease,
            )
        )

        result.append(
            healthcare
        )

    return {
        "status": "success",

        "count": len(result),

        "data": result,
    }