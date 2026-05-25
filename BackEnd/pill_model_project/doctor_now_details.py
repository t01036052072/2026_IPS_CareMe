from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path


DETAILS_PATH = Path(__file__).resolve().parent / "doctor_now_33_medicines.json"


@lru_cache(maxsize=1)
def load_doctor_now_details() -> dict[str, dict[str, str]]:
    if not DETAILS_PATH.exists():
        return {}
    return json.loads(DETAILS_PATH.read_text(encoding="utf-8"))


def get_doctor_now_detail(label: str) -> dict[str, str]:
    return load_doctor_now_details().get(label, {})


def get_doctor_now_name(label: str) -> str:
    return get_doctor_now_detail(label).get("pill_name", "")
