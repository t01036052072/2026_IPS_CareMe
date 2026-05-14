from fastapi import APIRouter, HTTPException, UploadFile, File
import os
import shutil
from datetime import datetime
from database import PILL_DB

# 라우터 설정: 모든 주소 앞에 /pills가 자동으로 붙습니다.
router = APIRouter(prefix="/pills", tags=["약 검색"])

# 사진 업로드 폴더 설정
UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# [수단 1] 직접 검색
@router.get("/search") # 실제 주소: /pills/search
async def 직접검색(name: str):
    results = [
        {"id": pill["id"], "pill_name": pill["pill_name"]} 
        for pill in PILL_DB if name in pill["pill_name"]
    ]
    if not results:
        raise HTTPException(status_code=404, detail="해당하는 알약을 찾을 수 없습니다.")
    return {"status": "success", "count": len(results), "results": results}

# [수단 2 & 3] 사진 촬영/등록 (이미지 분석)
@router.post("/analyze") # 실제 주소: /pills/analyze
async def 사진촬영등록(file: UploadFile = File(...)):
    extension = file.filename.split(".")[-1].lower()
    if extension not in ["jpg", "jpeg", "png"]:
        raise HTTPException(status_code=400, detail="이미지 파일(jpg, png)만 가능합니다.")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_name = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 저장 중 오류 발생: {str(e)}")

    detected_id = 1 # AI 분석 결과 시뮬레이션
    return {
        "status": "success",
        "message": "이미지가 업로드되었습니다.",
        "detected_id": detected_id,
        "saved_path": file_path
    }

# [기능 2] 1차 사진 확인 ("이 약이 맞습니까?")
#detected_id = id
#임의로 만들었음. 실제로는 AI 분석 결과로 나온 ID를 기반으로 알약 정보를 불러와서 사용자에게 보여줌
@router.get("/check/{pill_id}") # 실제 주소: /pills/check/{pill_id}
async def 일차사진확인(pill_id: int):
    pill = next((p for p in PILL_DB if p["id"] == pill_id), None)
    if not pill:
        raise HTTPException(status_code=404, detail="알약 정보를 찾을 수 없습니다.")
    return {
        "status": "success",
        "data": {
            "id": pill["id"], #이 id가 사진촬영으로 분석한 detected_id와 동일
            "pill_name": pill["pill_name"],
            "master_image_url": pill["master_image_url"],
            "question": "찾으시는 이 약이 맞습니까?"
        }
    }

# [기능 3] 상세 정보 제공 ("예" 클릭 시)
@router.get("/confirm/{pill_id}") # 실제 주소: /pills/confirm/{pill_id}
async def 상세정보제공(pill_id: int):
    #piss_id = 기능2의 id
    pill = next((p for p in PILL_DB if p["id"] == pill_id), None)
    if not pill:
        raise HTTPException(status_code=404, detail="상세 정보를 불러올 수 없습니다.")
    return {
        "status": "success",
        "data": {
            "pill_name": pill["pill_name"],
            "effect": pill["effect"],
            "side_effect": pill["side_effect"],
            "usage": pill["usage"]
        }
    }