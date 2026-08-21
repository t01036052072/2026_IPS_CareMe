from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import asc
from sqlalchemy.orm import Session

from chatbot.schemas.chat import ChatRequest
from chatbot.services.openai_service import get_ai_response
from chatbot.services.app_navigation import find_app_command

from core.database import get_db
from core.models import Chat, UserTable
from core.routes.user import get_current_user

router = APIRouter()


@router.post("/")
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: UserTable = Depends(get_current_user),
):
    message = payload.message.strip()

    if not message:
        raise HTTPException(status_code=400, detail="메시지를 입력해주세요.")
    
    app_result = find_app_command(message)
    print("입력:", message)
    print("결과:", app_result)

    if app_result:
        return {
            "answer": app_result["reply"],
            "route": app_result["route"]
        }

    try:
        ai_reply = get_ai_response(message)
        
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"챗봇 응답 생성 실패: {exc}",
        )

    user_msg = Chat(
        user_id=current_user.id,
        role="user",
        content=message,
    )

    assistant_msg = Chat(
        user_id=current_user.id,
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
    current_user: UserTable = Depends(get_current_user),
):
    messages = (
        db.query(Chat)
        .filter(Chat.user_id == current_user.id)
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
    current_user: UserTable = Depends(get_current_user),
):
    db.query(Chat).filter(Chat.user_id == current_user.id).delete()
    db.commit()

    return {"message": "채팅 기록 삭제 완료"}
