from fastapi import FastAPI
from routers.chat import router as chat_router

from database.connection import engine
from database.models import Base

app = FastAPI()

app.include_router(
    chat_router,
    prefix="/chat",
    tags=["Chat"]
)

Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "Chatbot API running"}