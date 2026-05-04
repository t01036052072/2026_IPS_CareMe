import os
from BackEnd.my_project.routes import document
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from BackEnd.my_project.database import engine, Base
from BackEnd.my_project.routes import user

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