from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
import os
import shutil
from datetime import datetime
from sqlalchemy.orm import Session

# database.py에서 진짜 DB 세션과 Pill 테이블 모델 가져오기
from practice.database import get_db
from my_project.models import Pill

router = APIRouter(prefix="/pills", tags=["약 검색"])

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# [수단 1] 직접 검색
# 약 이름 검색 API
# - 프론트에서 name 쿼리 파라미터로 약 이름 일부를 보내면 pills 테이블에서 LIKE 검색을 수행합니다.
# - 검색 결과에는 약 id, 약 이름, 제조사, 효능 정보가 포함됩니다.
# - 검색 결과가 없으면 404를 반환합니다.
# - 통합 서버에서는 /pills/search?name=... 경로로 호출됩니다.
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
# 약 이미지 분석/업로드 API
# - 프론트에서 촬영하거나 선택한 약 이미지를 multipart/form-data의 file로 보냅니다.
# - 이미지는 서버 uploads 폴더에 저장됩니다.
# - 현재 AI 분석은 임시값 detected_id=1을 반환하며, 추후 실제 이미지 분석 모델 결과와 연결할 수 있습니다.
# - 통합 서버에서는 /pills/analyze 경로에 POST로 호출됩니다.
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
# 약 1차 확인 API
# - 이미지 분석 결과로 나온 pill_id를 기준으로 DB에서 약 정보를 조회합니다.
# - 프론트의 “이 약이 맞습니까?” 확인 화면에 필요한 대표 이미지와 질문 문구를 반환합니다.
# - pill_id에 해당하는 약이 없으면 404를 반환합니다.
# - 통합 서버에서는 /pills/check/{pill_id} 경로로 호출됩니다.
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
# 약 상세 정보 조회 API
# - 최종 선택된 pill_id를 기준으로 약 이름, 제조사, 효능, 대표 이미지 URL을 반환합니다.
# - 프론트의 약 상세 화면 또는 검색 결과 상세보기 화면에서 사용합니다.
# - pill_id에 해당하는 약이 없으면 404를 반환합니다.
# - 통합 서버에서는 /pills/detail/{pill_id} 경로로 호출됩니다.
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
