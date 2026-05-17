import os
os.environ['PADDLE_USE_ONEDNN'] = '0'
os.environ['FLAGS_use_onednn'] = '0'
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from my_project.database import Base, engine
from my_project.routes import document, user

from my_project import models  # noqa: F401

# 테이블 생성
Base.metadata.create_all(bind=engine)

app = FastAPI(title="의료 AI 백엔드")

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

@app.get("/")
def root():
    return {"message": "서버 모듈화 완료!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("my_project.main:app", host="0.0.0.0", port=8000, reload=True)
