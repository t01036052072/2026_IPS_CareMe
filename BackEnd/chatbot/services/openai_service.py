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
                너는 의료 및 약 정보 챗봇이다.

                의료 정보를 쉽고 간단하게 설명해라.
                위험한 의료 판단은 하지 마라.
                응급 상황이면 병원 방문을 권장해라.

                답변은 짧고 친절하게 해라.
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