from fastapi import APIRouter
from schemas.chat import ChatRequest

router = APIRouter()

chat_history = []

@router.post("")
def chat(payload: ChatRequest):

    user_message = {
        "role": "user",
        "content": payload.message
    }

    assistant_message = {
        "role": "assistant",
        "content": f"입력한 메시지: {payload.message}"
    }

    chat_history.append(user_message)
    chat_history.append(assistant_message)

    return {
        "reply": assistant_message["content"]
    }

@router.get("/history")
def get_chat_history():

    return {
        "messages": chat_history
    }

@router.delete("/history")
def clear_chat_history():
    chat_history.clear()
    return {
        "message": "채팅 기록 삭제 완료"
    }