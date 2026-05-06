import os
os.environ['PADDLE_USE_ONEDNN'] = '0'
os.environ['FLAGS_use_onednn'] = '0'
import uvicorn
from fastapi import FastAPI
from routes import document
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from routes import user

# 테이블 생성
Base.metadata.create_all(bind=engine)

app = FastAPI(title="의료 AI 백엔드")

# 업로드 폴더 생성
if not os.path.exists("./static/uploads"):
    os.makedirs("./static/uploads")

# 정적 파일 설정
app.mount("/static", StaticFiles(directory="static"), name="static")

# 라우터 등록
app.include_router(user.router)
app.include_router(document.router)

@app.get("/")
def root():
    return {"message": "서버 모듈화 완료!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)