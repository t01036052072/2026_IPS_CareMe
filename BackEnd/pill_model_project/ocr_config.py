from __future__ import annotations

import os
import shutil
from pathlib import Path


def configure_pytesseract(pytesseract_module) -> None:
    configured = getattr(pytesseract_module.pytesseract, "tesseract_cmd", "")
    if configured and Path(configured).exists():
        return

    candidates = [
        os.getenv("TESSERACT_CMD"),
        os.getenv("TESSERACT_PATH"),
        shutil.which("tesseract"),
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ]

    for candidate in candidates:
        if candidate and Path(candidate).exists():
            pytesseract_module.pytesseract.tesseract_cmd = str(candidate)
            return
