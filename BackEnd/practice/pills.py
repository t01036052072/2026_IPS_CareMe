import os
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
    }


def serialize_pill_check(pill: Pill) -> dict:
    return {
        "id": pill.id,
        "pill_name": pill.pill_name,
        "master_image_url": pill.image_url,
        "question": "Is this the pill you are looking for?",
    }


def analyze_pill_image(file_path: str, db: Session) -> int:
    """Placeholder for the future AI image model.

    Replace this function with the real model call later. The real version should
    inspect file_path and return the matched Pill.id.
    """
    pill = db.query(Pill).order_by(Pill.id.asc()).first()
    if not pill:
        raise HTTPException(status_code=404, detail="No pill data is available.")
    return pill.id


@router.get("/search")
async def search_pills(name: str, db: Session = Depends(get_db)):
    """Direct text search: return pill information immediately."""
    keyword = name.strip()
    if not keyword:
        raise HTTPException(status_code=400, detail="Search keyword is required.")

    pills = db.query(Pill).filter(Pill.pill_name.like(f"%{keyword}%")).all()

    if not pills:
        raise HTTPException(status_code=404, detail="No matching pill was found.")

    results = [serialize_pill_detail(pill) for pill in pills]
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
    """Photo search: upload image, run AI placeholder, return candidate pill id."""
    filename = file.filename or ""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only jpg, jpeg, and png images are allowed.")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    file_name = f"pill_{timestamp}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {exc}") from exc

    detected_id = analyze_pill_image(file_path, db)

    return {
        "status": "success",
        "flow": "photo_search",
        "message": "Image uploaded and analyzed.",
        "detected_id": detected_id,
        "saved_path": file_path,
        "analysis_status": "placeholder",
    }


@router.get("/check/{pill_id}")
async def check_photo_result(pill_id: int, db: Session = Depends(get_db)):
    """Photo search confirmation screen: 'Is this the pill?'."""
    pill = db.query(Pill).filter(Pill.id == pill_id).first()

    if not pill:
        raise HTTPException(status_code=404, detail="Pill information was not found.")

    return {
        "status": "success",
        "flow": "photo_search_confirmation",
        "data": serialize_pill_check(pill),
    }


@router.get("/detail/{pill_id}")
@router.get("/confirm/{pill_id}")
async def get_pill_detail(pill_id: int, db: Session = Depends(get_db)):
    """Final pill detail screen for direct search or confirmed photo search."""
    pill = db.query(Pill).filter(Pill.id == pill_id).first()

    if not pill:
        raise HTTPException(status_code=404, detail="Pill information was not found.")

    return {
        "status": "success",
        "data": serialize_pill_detail(pill),
    }
