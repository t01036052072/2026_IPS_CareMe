from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import Chat
from schemas.chat import ChatRequest

from services.openai_service import get_ai_response

router = APIRouter()

@router.post("")
def chat(payload: ChatRequest, db: Session = Depends(get_db)):

    message = payload.message.strip()

    # GPT 응답 생성
    ai_reply = get_ai_response(message)

    # 유저 메시지 저장
    user_msg = Chat(
        role="user",
        content=message
    )

    # AI 메시지 저장
    assistant_msg = Chat(
        role="assistant",
        content=ai_reply
    )

    db.add(user_msg)
    db.add(assistant_msg)

    db.commit()

    return {
        "reply": ai_reply
    }


@router.get("/history")
def get_chat_history(db: Session = Depends(get_db)):

    messages = db.query(Chat).all()

    result = []

    for msg in messages:
        result.append({
            "id": msg.id,
            "role": msg.role,
            "content": msg.content
        })

    return {
        "messages": result
    }


@router.delete("/history")
def clear_chat_history(db: Session = Depends(get_db)):

    db.query(Chat).delete()

    db.commit()

    return {
        "message": "채팅 기록 삭제 완료"
    }