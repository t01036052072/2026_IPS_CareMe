from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from openai import OpenAI
from pydantic import BaseModel
from typing import List
import json
import os

from dotenv import load_dotenv

from my_project.database import get_db
from my_project.models import UserTable

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

    try:

        # 문자열이면 JSON 변환
        if isinstance(medical_history, str):
            medical_history = json.loads(
                medical_history
            )

        disease_list = []

        for item in medical_history:

            disease_name = item.get("name")

            if disease_name:
                disease_list.append(
                    disease_name
                )

        return disease_list

    except Exception:

        return []

# =========================
# OpenAI Prompt 생성
# =========================
def build_healthcare_prompt(
    user,
    disease_name,
    bmi,
):

    return f"""
당신은 사용자의 질환별 건강관리 정보를 생성하는 AI입니다.

반드시 사용자가 앱 화면에서 바로 읽을 수 있는 형태로 작성하세요.

응답은 반드시 JSON 형식만 반환하세요.
설명, 코드블록, 마크다운 절대 금지.

반드시 아래 구조를 유지하세요.

{{
  "disease_name": "",
  "summary": "",
  "exercise": [],
  "diet": [],
  "lifestyle": []
}}

작성 규칙:

1. disease_name
- 질환명을 작성
- 예시:
  - 고혈압
  - 중이염

2. summary
- 사용자의 건강 상태를 자연스럽게 설명
- 질환 특징 + 관리 필요 내용을 포함
- 2~3문장 정도로 작성
- 너무 의학적이지 않게 작성
- 존댓말 사용

예시:
"환자분은 현재 혈압 관리가 필요한 상태입니다.
혈압 조절을 위해 나트륨 섭취를 줄이고
규칙적인 운동을 권장합니다."

3. exercise
- 운동 추천 최대 3개
- 짧고 간결하게 작성
- 리스트 형태

예시:
[
  "빠르게 걷기",
  "가벼운 근력 운동",
  "스트레칭"
]

4. diet
- 식습관 추천 최대 4개
- 한 줄씩 짧게 작성
- 리스트 형태

예시:
[
  "나트륨 함량이 낮은 채소, 과일 충분히 섭취",
  "가공 식품, 국물 음식 줄이기",
  "지방 많은 음식 줄이기"
]

5. lifestyle
- 생활습관 추천 최대 4개
- 리스트 형태

예시:
[
  "체중 관리",
  "스트레스 관리",
  "하루 6~8시간 충분히 수면",
  "금연, 절주"
]

중요 규칙:
- 반드시 한국어로 작성
- 반드시 JSON만 반환
- 운동/식습관/생활습관은 리스트 배열 형태 유지
- 의료 진단 금지
- 병원 방문 권유 금지
- 일반 건강관리 목적만 제공
- 너무 긴 문장 금지
- 앱 UI에 바로 표시 가능한 형태로 작성
- 항목명(exercise, diet, lifestyle)은 영어 그대로 유지

사용자 정보:
- 나이: {user.age}
- 성별: {user.gender}
- 키: {user.height}
- 몸무게: {user.weight}
- BMI: {bmi}
- 일반 담배 흡연: {user.smoked_regular}
- 궐련형 전자담배: {user.used_heated_tobacco}
- 액상형 전자담배: {user.used_vaping}
- 음주 빈도: {user.drinking_frequency}
- 가족력 여부: {user.has_family_history}
- 현재 치료 여부: {user.is_under_treatment}
- B형 간염 보유 여부: {user.is_b_hepatitis_carrier}

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

                response_format={
                    "type": "json_object"
                },

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

    disease_buttons = [
        {
            "disease_id": 0,
            "disease_name": "전체"
        }
    ]

    disease_buttons.extend(
        [
            {
                "disease_id": index + 1,
                "disease_name": disease
            }

            for index, disease
            in enumerate(diseases)
        ]
    )

    return {
        "status": "success",
        "diseases": disease_buttons
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