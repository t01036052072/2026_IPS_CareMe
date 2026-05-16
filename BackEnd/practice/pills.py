from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
import os
import shutil
from datetime import datetime
from sqlalchemy.orm import Session

# database.py에서 진짜 DB 세션과 Pill 테이블 모델 가져오기
from practice.database import get_db, Pill

router = APIRouter(prefix="/pills", tags=["약 검색"])

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# [수단 1] 직접 검색
@router.get("/search") 
async def 직접검색(name: str, db: Session = Depends(get_db)):
    # 💡 리스트 대신 MySQL 'pills' 테이블에서 사용자가 입력한 단어가 포함된 약을 자동으로 찾아옵니다.
    pills_in_db = db.query(Pill).filter(Pill.pill_name.like(f"%{name}%")).all()
    
    if not pills_in_db:
        raise HTTPException(status_code=404, detail="해당하는 알약을 찾을 수 없습니다.")
        
    results = [
        {"id": p.id, "pill_name": p.pill_name, "enterprise": p.enterprise, "effect": p.effect} 
        for p in pills_in_db
    ]
    return {"status": "success", "count": len(results), "results": results}


# [수단 2 & 3] 사진 촬영/등록 (이미지 분석)
@router.post("/analyze") 
async def 사진촬영등록(file: UploadFile = File(...)):
    extension = file.filename.split(".")[-1].lower()
    if extension not in ["jpg", "jpeg", "png"]:
        raise HTTPException(status_code=400, detail="이미지 파일(jpg, png)만 가능합니다.")
        
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_name = f"pill_{timestamp}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 저장 중 오류 발생: {str(e)}")

    detected_id = 1 # AI 분석 결과 시뮬레이션 (타이레놀 ID 가정)
    return {
        "status": "success",
        "message": "이미지가 업로드되었습니다.",
        "detected_id": detected_id,
        "saved_path": file_path
    }


# [기능 2] 1차 사진 확인 ("이 약이 맞습니까?")
@router.get("/check/{pill_id}") 
async def 일차사진확인(pill_id: int, db: Session = Depends(get_db)):
    # 💡 리스트 대신 MySQL에서 pill_id 고유번호로 알약 상세 정보를 가져옵니다.
    pill = db.query(Pill).filter(Pill.id == pill_id).first()
    
    if not pill:
        raise HTTPException(status_code=404, detail="알약 정보를 찾을 수 없습니다.")
        
    return {
        "status": "success",
        "data": {
            "id": pill.id,
            "pill_name": pill.pill_name,
            "master_image_url": pill.image_url,
            "question": "찾으시는 이 약이 맞습니까?"
        }
    }


# [기능 3] 상세 정보 제공 ("예" 눌렀을 때 최종 화면)
@router.get("/detail/{pill_id}") 
async def 상세정보제공(pill_id: int, db: Session = Depends(get_db)):
    pill = db.query(Pill).filter(Pill.id == pill_id).first()
    
    if not pill:
        raise HTTPException(status_code=404, detail="알약 정보를 찾을 수 없습니다.")
        
    return {
        "status": "success",
        "data": {
            "pill_name": pill.pill_name,
            "enterprise": pill.enterprise,
            "effect": pill.effect,
            "master_image_url": pill.image_url
        }
    }