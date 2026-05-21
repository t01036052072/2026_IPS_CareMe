"""import os
import shutil
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from my_project.models import Pill
from practice.database import get_db

router = APIRouter(prefix="/pills", tags=["pill search"])

UPLOAD_DIR = "./uploads"
ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png"}
os.makedirs(UPLOAD_DIR, exist_ok=True)

def serialize_pill_detail(pill: Pill) -> dict:
    return {
        "id": pill.id,
        "pill_name": pill.pill_name,
        "enterprise": pill.enterprise,
        "effect": pill.effect,
        "master_image_url": pill.image_url,
        "side_effect": getattr(pill, "side_effect", None),
    }

def get_side_effect(pill: Pill):
    return (
        getattr(pill, "side_effect", None)
        or getattr(pill, "side_effects", None)
        or getattr(pill, "adverse_effect", None)
        or getattr(pill, "warning", None)
        or getattr(pill, "caution", None)
    )


def serialize_pill_check(pill: Pill) -> dict:
    return {
        "id": pill.id,
        "pill_name": pill.pill_name,
        "question": "Is this the pill you are looking for?",
    }


def analyze_pill_image(file_path: str, db: Session) -> int:
    pill = db.query(Pill).order_by(Pill.id.asc()).first()
    if not pill:
        raise HTTPException(status_code=404, detail="No pill data is available.")
    return pill.id


@router.get("/search")
async def search_pills(name: str, db: Session = Depends(get_db)):
    keyword = name.strip()

    if not keyword:
        raise HTTPException(status_code=400, detail="Search keyword is required.")

    pills = db.query(Pill).filter(Pill.pill_name.like(f"%{keyword}%")).all()

    if not pills:
        raise HTTPException(status_code=404, detail="No matching pill was found.")

    results = [
        {
            "id": pill.id,
            "pill_name": pill.pill_name,
        }
        for pill in pills
    ]

    return {
        "status": "success",
        "flow": "direct_search",
        "count": len(results),
        "results": results,
    }


@router.post("/analyze")
async def analyze_pill_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    filename = file.filename or ""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only jpg, jpeg, png allowed")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    file_name = f"pill_{timestamp}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    detected_id = analyze_pill_image(file_path, db)

    return {
        "status": "success",
        "detected_id": detected_id,
    }


@router.get("/check/{pill_id}")
async def check_photo_result(pill_id: int, db: Session = Depends(get_db)):
    pill = db.query(Pill).filter(Pill.id == pill_id).first()

    if not pill:
        raise HTTPException(status_code=404, detail="Not found")

    return {
        "status": "success",
        "data": serialize_pill_check(pill),
    }


@router.get("/detail/{pill_id}")
async def get_pill_detail(pill_id: int, db: Session = Depends(get_db)):
    pill = db.query(Pill).filter(Pill.id == pill_id).first()

    if not pill:
        raise HTTPException(status_code=404, detail="Not found")

    return {
        "status": "success",
        "data": serialize_pill_detail(pill),
    }"""

"""import os
import shutil
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from my_project.models import Pill
from practice.database import get_db

router = APIRouter(prefix="/pills", tags=["pill search"])

UPLOAD_DIR = "./uploads"
ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png"}
os.makedirs(UPLOAD_DIR, exist_ok=True)

def serialize_pill_detail(pill: Pill) -> dict:
    return {
        "id": pill.id,
        "pill_name": pill.pill_name,
        "enterprise": pill.enterprise,
        "effect": pill.effect,
        "master_image_url": pill.image_url,
        "side_effect": getattr(pill, "side_effect", None),
    }

def get_side_effect(pill: Pill):
    return (
        getattr(pill, "side_effect", None)
        or getattr(pill, "side_effects", None)
        or getattr(pill, "adverse_effect", None)
        or getattr(pill, "warning", None)
        or getattr(pill, "caution", None)
    )


def serialize_pill_check(pill: Pill) -> dict:
    return {
        "id": pill.id,
        "pill_name": pill.pill_name,
        "question": "Is this the pill you are looking for?",
    }


def analyze_pill_image(file_path: str, db: Session) -> int:
    pill = db.query(Pill).order_by(Pill.id.asc()).first()
    if not pill:
        raise HTTPException(status_code=404, detail="No pill data is available.")
    return pill.id


@router.get("/search")
async def search_pills(name: str, db: Session = Depends(get_db)):
    keyword = name.strip()

    if not keyword:
        raise HTTPException(status_code=400, detail="Search keyword is required.")

    pills = db.query(Pill).filter(Pill.pill_name.like(f"%{keyword}%")).all()

    if not pills:
        raise HTTPException(status_code=404, detail="No matching pill was found.")

    results = [
        {
            "id": pill.id,
            "pill_name": pill.pill_name,
        }
        for pill in pills
    ]

    return {
        "status": "success",
        "flow": "direct_search",
        "count": len(results),
        "results": results,
    }


@router.post("/analyze")
async def analyze_pill_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    filename = file.filename or ""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only jpg, jpeg, png allowed")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    file_name = f"pill_{timestamp}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    detected_id = analyze_pill_image(file_path, db)

    return {
        "status": "success",
        "detected_id": detected_id,
    }


@router.get("/check/{pill_id}")
async def check_photo_result(pill_id: int, db: Session = Depends(get_db)):
    pill = db.query(Pill).filter(Pill.id == pill_id).first()

    if not pill:
        raise HTTPException(status_code=404, detail="Not found")

    return {
        "status": "success",
        "data": serialize_pill_check(pill),
    }


@router.get("/detail/{pill_id}")
async def get_pill_detail(pill_id: int, db: Session = Depends(get_db)):
    pill = db.query(Pill).filter(Pill.id == pill_id).first()

    if not pill:
        raise HTTPException(status_code=404, detail="Not found")

    return {
        "status": "success",
        "data": serialize_pill_detail(pill),
    }"""

import os
import shutil
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from my_project.models import Pill
from practice.database import get_db
from practice.services.pill_api import search_pill_by_name

router = APIRouter(prefix="/pills", tags=["pill search"])

UPLOAD_DIR = "./uploads"
ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png"}

os.makedirs(UPLOAD_DIR, exist_ok=True)


# =========================
# 상세 정보 직렬화
# =========================
def serialize_pill_detail(pill: Pill) -> dict:
    return {
        "id": pill.id,
        "pill_name": pill.pill_name,

        # 제조사
        "enterprise": getattr(pill, "enterprise", None),

        # 이미지
        "master_image_url": getattr(pill, "image_url", None),

        # 효능효과
        "effect": getattr(pill, "effect", None),

        # 복용법
        "use_method": getattr(pill, "use_method", None),

        # 경고
        "warning": getattr(pill, "warning", None),

        # 상호작용
        "interaction": getattr(pill, "interaction", None),

        # 부작용
        "side_effect": getattr(pill, "side_effect", None),
    }


# =========================
# 사진 검색 확인용
# =========================
def serialize_pill_check(pill: Pill) -> dict:
    return {
        "id": pill.id,
        "pill_name": pill.pill_name,
        "master_image_url": getattr(pill, "image_url", None),
        "question": "Is this the pill you are looking for?",
    }


# =========================
# 사진 분석 임시 함수
# =========================
def analyze_pill_image(file_path: str, db: Session) -> int:

    pill = db.query(Pill).order_by(Pill.id.asc()).first()

    if not pill:
        raise HTTPException(
            status_code=404,
            detail="No pill data is available.",
        )

    return pill.id


# =========================
# 약 검색
# =========================
@router.get("/search")
async def search_pills(
    name: str,
    db: Session = Depends(get_db),
):

    keyword = name.strip()

    if not keyword:
        raise HTTPException(
            status_code=400,
            detail="Search keyword is required.",
        )

    # 공공데이터 API 호출
    try:
        api_results = search_pill_by_name(keyword)

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Public data API request failed: {exc}",
        )

    if not api_results:
        raise HTTPException(
            status_code=404,
            detail="No matching pill was found.",
        )

    saved_pills = []

    for item in api_results:

        pill_code = item.get("pill_code")
        pill_name = item.get("pill_name")

        if not pill_name:
            continue

        pill = None

        # 기존 데이터 조회
        if pill_code:
            pill = (
                db.query(Pill)
                .filter(Pill.pill_code == pill_code)
                .first()
            )

        # 없으면 새로 생성
        if not pill:
            pill = Pill(
                pill_code=pill_code,
                pill_name=pill_name,
            )

            db.add(pill)

        # =========================
        # 데이터 저장
        # =========================
        pill.pill_name = pill_name
        pill.enterprise = item.get("enterprise")
        pill.image_url = item.get("image_url")

        # 효능효과
        if hasattr(pill, "effect"):
            pill.effect = item.get("effect")

        # 복용법
        if hasattr(pill, "use_method"):
            pill.use_method = item.get("use_method")

        # 경고
        if hasattr(pill, "warning"):
            pill.warning = item.get("warning")

        # 상호작용
        if hasattr(pill, "interaction"):
            pill.interaction = item.get("interaction")

        # 부작용
        if hasattr(pill, "side_effect"):
            pill.side_effect = item.get("side_effect")

        saved_pills.append(pill)

    db.commit()

    for pill in saved_pills:
        db.refresh(pill)

    return {
        "status": "success",
        "flow": "public_api_search",
        "count": len(saved_pills),

        "results": [
            {
                "id": pill.id,
                "pill_name": pill.pill_name,
            }
            for pill in saved_pills
        ],
    }


# =========================
# 사진 분석
# =========================
@router.post("/analyze")
async def analyze_pill_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):

    filename = file.filename or ""

    extension = (
        filename.rsplit(".", 1)[-1].lower()
        if "." in filename
        else ""
    )

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only jpg, jpeg, png allowed",
        )

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S_%f"
    )

    file_name = f"pill_{timestamp}.{extension}"

    file_path = os.path.join(
        UPLOAD_DIR,
        file_name,
    )

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    detected_id = analyze_pill_image(
        file_path,
        db,
    )

    return {
        "status": "success",
        "detected_id": detected_id,
    }


# =========================
# 사진 검색 확인
# =========================
@router.get("/check/{pill_id}")
async def check_photo_result(
    pill_id: int,
    db: Session = Depends(get_db),
):

    pill = (
        db.query(Pill)
        .filter(Pill.id == pill_id)
        .first()
    )

    if not pill:
        raise HTTPException(
            status_code=404,
            detail="Not found",
        )

    return {
        "status": "success",
        "data": serialize_pill_check(pill),
    }


# =========================
# 상세 정보
# =========================
@router.get("/detail/{pill_id}")
async def get_pill_detail(
    pill_id: int,
    db: Session = Depends(get_db),
):

    pill = (
        db.query(Pill)
        .filter(Pill.id == pill_id)
        .first()
    )

    if not pill:
        raise HTTPException(
            status_code=404,
            detail="Not found",
        )

    return {
        "status": "success",
        "data": serialize_pill_detail(pill),
    }