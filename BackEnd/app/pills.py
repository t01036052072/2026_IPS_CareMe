from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.models import Pill
from app.database import get_db


router = APIRouter(prefix="/pills", tags=["pill direct search"])


def serialize_pill_detail(pill: Pill) -> dict:
    return {
        "id": pill.id,
        "pill_name": pill.pill_name,
        "master_image_url": getattr(pill, "image_url", None),
        "effect": getattr(pill, "effect", None),
        "use_method": getattr(pill, "use_method", None),
        "warning": getattr(pill, "warning", None),
        "interaction": getattr(pill, "interaction", None),
        "side_effect": getattr(pill, "side_effect", None),
    }


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

    pills = db.query(Pill).filter(Pill.pill_name.contains(keyword)).all()

    if not pills:
        raise HTTPException(
            status_code=404,
            detail="No matching pill was found.",
        )

    return {
        "status": "success",
        "flow": "direct_search",
        "count": len(pills),
        "results": [
            {
                "id": pill.id,
                "pill_name": pill.pill_name,
                "master_image_url": getattr(pill, "image_url", None),
                "effect": getattr(pill, "effect", None),
                "use_method": getattr(pill, "use_method", None),
                "warning": getattr(pill, "warning", None),
                "side_effect": getattr(pill, "side_effect", None),
            }
            for pill in pills
        ],
    }


@router.get("/detail/{pill_id}")
async def get_pill_detail(
    pill_id: int,
    db: Session = Depends(get_db),
):
    pill = db.query(Pill).filter(Pill.id == pill_id).first()

    if not pill:
        raise HTTPException(
            status_code=404,
            detail="Not found",
        )

    return {
        "status": "success",
        "flow": "direct_search",
        "data": serialize_pill_detail(pill),
    }
