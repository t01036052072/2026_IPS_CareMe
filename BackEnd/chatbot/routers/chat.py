from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import asc
from sqlalchemy.orm import Session

from schemas.chat import ChatRequest
from services.openai_service import get_ai_response
from database import get_db
from models import Chat

router = APIRouter()


@router.post("/")
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
):
    message = payload.message.strip()

    if not message:
        raise HTTPException(status_code=400, detail="메시지를 입력해주세요.")

    try:
        ai_reply = get_ai_response(message)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"챗봇 응답 생성 실패: {exc}",
        )

    user_msg = Chat(
        role="user",
        content=message,
    )

    assistant_msg = Chat(
        role="assistant",
        content=ai_reply,
    )

    db.add(user_msg)
    db.add(assistant_msg)
    db.commit()

    return {
        "answer": ai_reply
    }


@router.get("/history")
def get_chat_history(
    db: Session = Depends(get_db),
):
    messages = (
        db.query(Chat)
        .order_by(asc(Chat.id))
        .all()
    )

    return {
        "messages": [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
            }
            for msg in messages
        ]
    }


@router.delete("/history")
def clear_chat_history(
    db: Session = Depends(get_db),
):
    db.query(Chat).delete()
    db.commit()

    return {"message": "채팅 기록 삭제 완료"}
