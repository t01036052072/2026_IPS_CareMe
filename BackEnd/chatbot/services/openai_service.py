import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4-mini")


def get_ai_response(message: str):
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY 환경변수가 설정되어 있지 않습니다.")

    client = OpenAI(api_key=OPENAI_API_KEY)

    response = client.chat.completions.create(
        model=OPENAI_MODEL,

        messages=[
            {
                "role": "system",
                "content": """
                너는 '지키미'라는 AI 건강 상담 챗봇이다.

                사용자의 질문에 친절하고 짧게 답변해라.

                다음 기능들에 대한 질문이 아니면 대답하지 못한다고 답변해라.

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

                마이페이지 위치를 알려달라하면
                "홈 화면 상단의 마이페이지 탭에서 확인할 수 있어요."라고 답해줘.
                
                약 검색을 어디서 하냐고 물어보면
                "검색 탭에서 약 정보를 검색할 수 있어요."라고 답해줘.



                챗봇, 간단한 상담은 어디서 하냐고 물어보면 
                "케미 상담 메뉴에서 이용할 수 있어요.라고 말해줘.

                일정 관리 관련된 내용을 물어보면
                "일정관리 탭에서 병원 예약 일정을 확인할 수 있고
                복약일정 탭에서 복약 일정을 확인할 수 있어요."라고 말해줘.
   
                """
            },

            {
                "role": "user",
                "content": message
            }
        ],

        max_completion_tokens=3000,
        temperature=0.3
    )

    return response.choices[0].message.content
