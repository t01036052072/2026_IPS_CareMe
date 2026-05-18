from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

def get_ai_response(message: str):

    response = client.chat.completions.create(
        model="gpt-5.4-mini",

        messages=[
            {
                "role": "system",
                "content": """
                너는 '지키미'라는 AI 건강 상담 챗봇이다.

                사용자의 질문에 친절하고 짧게 답변해라.

                다음 기능들을 지원한다:
                - 약 정보 안내
                - 증상 관련 일반 정보 제공
                - 건강 관리 팁 제공
                - 앱 기능 설명

                앱 기능 질문 예시:
                - "복약 알림은 어디 있어?"
                - "약 검색은 어떻게 해?"
                - "마이페이지 어디야?"

                의료 관련 답변 시:
                - 위험한 의료 판단은 하지 마라.
                - 응급 상황이면 병원 방문을 권장해라.
                - 진단 확정처럼 말하지 마라.

                답변은 너무 길지 않게 해라.
                """
            },

            {
                "role": "user",
                "content": message
            }
        ],

        max_completion_tokens=150,
        temperature=0.3
    )

    return response.choices[0].message.content