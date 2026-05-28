from __future__ import annotations

import os
import shutil
import traceback
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from PIL import UnidentifiedImageError

from .doctor_now_details import get_doctor_now_detail
from .inference import find_example_images, predict_pill_image


router = APIRouter(prefix="/pill-photo", tags=["pill photo search"])

UPLOAD_DIR = "./uploads"
ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png"}
UNSUPPORTED_IMAGE_EXTENSIONS = {"heic", "heif"}
PILL_MODEL_DIR = Path(__file__).resolve().parent
PILL_MODEL_PATH = PILL_MODEL_DIR / "checkpoints" / "final_model.pth"
PILL_MODEL_DATA_DIR = Path(os.getenv("PILL_MODEL_DATA_DIR", str(PILL_MODEL_DIR)))

os.makedirs(UPLOAD_DIR, exist_ok=True)


def reference_image_url(label: str) -> str | None:
    return f"/pill-photo/reference-image/{label}" if reference_image_path(label) else None


def reference_image_path(label: str) -> Path | None:
    images = find_example_images(PILL_MODEL_DATA_DIR, label, limit=1)
    return images[0] if images else None


def serialize_detail(label: str) -> dict:
    detail = get_doctor_now_detail(label)
    if not detail:
        return {
            "ai_label": label,
            "pill_name": label,
            "effect": None,
            "use_method": None,
            "warning": None,
            "side_effect": None,
            "image_url": reference_image_url(label),
        }
    return {
        "ai_label": label,
        "pill_name": detail.get("pill_name"),
        "effect": detail.get("effect"),
        "use_method": detail.get("use_method"),
        "warning": detail.get("warning"),
        "side_effect": detail.get("side_effect"),
        "image_url": reference_image_url(label),
    }


def serialize_prediction_candidate(candidate) -> dict:
    detail = get_doctor_now_detail(candidate.label)
    return {
        "label": candidate.label,
        "pill_name": detail.get("pill_name") or candidate.pill_name,
        "confidence": round(candidate.probability, 6),
        "score": round(candidate.score, 6),
        "crop": candidate.crop,
        "color_match": candidate.color_match,
        "imprint_match": candidate.imprint_match,
        "visual_similarity": (
            round(candidate.visual_similarity, 6)
            if candidate.visual_similarity is not None
            else None
        ),
        "image_url": reference_image_url(candidate.label),
    }


@router.post("/analyze")
async def analyze_pill_photo(file: UploadFile = File(...)):
    filename = file.filename or ""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if extension in UNSUPPORTED_IMAGE_EXTENSIONS or (file.content_type or "").lower() in {"image/heic", "image/heif"}:
        raise HTTPException(
            status_code=400,
            detail="HEIC/HEIF images are not supported. Please upload a JPG or PNG image.",
        )

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only jpg, jpeg, png allowed",
        )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    file_name = f"pill_{timestamp}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        prediction = predict_pill_image(
            image_path=file_path,
            model_path=PILL_MODEL_PATH,
            data_dir=PILL_MODEL_DATA_DIR,
            top_k=5,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Pill AI model file is missing: {exc}",
        ) from exc
    except UnidentifiedImageError as exc:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is not a readable JPG/PNG image. Please upload a JPG or PNG image.",
        ) from exc
    except Exception as exc:
        print("[PillPhoto] analysis failed")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Pill image analysis failed: {exc}",
        ) from exc

    detail = serialize_detail(prediction.label)

    return {
        "status": "success",
        "flow": "photo_search",
        "message": "Pill image analysis completed.",
        "needs_confirmation": True,
        "question": "Is this the pill you are looking for?",
        "detected_label": prediction.label,
        "detail_path": f"/pill-photo/detail/{prediction.label}",
        "prediction": {
            "label": prediction.label,
            "pill_name": detail["pill_name"],
            "confidence": round(prediction.confidence, 6),
            "score": round(prediction.score, 6),
            "low_confidence": prediction.low_confidence,
            "crop": prediction.crop,
            "image_url": detail.get("image_url"),
            "detail": detail,
            "top_candidates": [
                serialize_prediction_candidate(candidate)
                for candidate in prediction.top_candidates
            ],
        },
    }


@router.get("/detail/{ai_label}")
async def get_ai_pill_detail(ai_label: str):
    detail = get_doctor_now_detail(ai_label)

    if not detail:
        raise HTTPException(
            status_code=404,
            detail="Predicted pill detail was not found.",
        )

    return {
        "status": "success",
        "flow": "photo_search",
        "data": serialize_detail(ai_label),
    }


@router.get("/reference-image/{ai_label}")
async def get_reference_pill_image(ai_label: str):
    image_path = reference_image_path(ai_label)
    if not image_path:
        raise HTTPException(
            status_code=404,
            detail="Reference pill image was not found.",
        )
    return FileResponse(image_path)
