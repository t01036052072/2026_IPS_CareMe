import os
import sys
from dotenv import load_dotenv
import openai

load_dotenv()
api_key = os.getenv("PILL_OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
if not api_key:
	print("PILL_OPENAI_API_KEY가 설정되어 있지 않습니다. .env 또는 환경변수 확인하세요.", file=sys.stderr)
	sys.exit(1)

openai.api_key = api_key
model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

def ask(prompt: str) -> str:
	resp = openai.ChatCompletion.create(
		model=model,
		messages=[{"role": "user", "content": prompt}]
	)
	return resp.choices[0].message.content


if __name__ == "__main__":
	if len(sys.argv) > 1:
		prompt = " ".join(sys.argv[1:])
	else:
		prompt = input("질문 입력: ")
	try:
		result = ask(prompt)
		print(result)
	except Exception as e:
		print("API 호출 실패:", e, file=sys.stderr)
		sys.exit(1)

