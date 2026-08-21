import os
os.environ['PADDLE_USE_ONEDNN'] = '0'
os.environ['FLAGS_use_onednn'] = '0'
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from chatbot.routers.chat import router as chatbot_router
from core.database import Base, engine
from core.routes import document, mypage, user

from core import models  # noqa: F401

# 테이블 생성
Base.metadata.create_all(bind=engine)

app = FastAPI(title="의료 AI 백엔드")

frontend_origins = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:8087,http://127.0.0.1:8087,http://localhost:8081,http://127.0.0.1:8081",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in frontend_origins if origin.strip()],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 업로드 폴더 생성
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
UPLOAD_DIR = STATIC_DIR / "uploads"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 정적 파일 설정
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# 라우터 등록
app.include_router(user.router)
app.include_router(document.router)
app.include_router(mypage.router, prefix="/mypage", tags=["마이페이지"])
#app.include_router(chatbot_router, prefix="/chatbot/chat", tags=["챗봇"])

@app.get("/")
def root():
    return {"message": "서버 모듈화 완료!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("core.main:app", host="0.0.0.0", port=8000, reload=True)
