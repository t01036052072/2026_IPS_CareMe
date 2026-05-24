from __future__ import annotations

import csv
import json
from pathlib import Path


METADATA_FILENAME = "metadata.csv"


def metadata_path(data_dir: str | Path) -> Path:
    return Path(data_dir) / METADATA_FILENAME


def load_metadata(data_dir: str | Path) -> dict[str, dict[str, str]]:
    path = metadata_path(data_dir)
    if not path.exists():
        return {}

    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return {row["label"]: row for row in reader if row.get("label")}


def first_nonempty(*values) -> str:
    for value in values:
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


def extract_label_metadata(label_dir: Path, image_dir: Path) -> dict[str, str]:
    first_json = next(iter(sorted(label_dir.glob("*.json"))), None)
    first_image = next(iter(sorted(image_dir.glob("*.*"))), None)

    row = {
        "label": image_dir.name,
        "item_seq": "",
        "drug_name": image_dir.name,
        "drug_name_en": "",
        "company": "",
        "company_en": "",
        "effect": "",
        "use_method": "",
        "warning": "",
        "precaution": "",
        "interaction": "",
        "side_effect": "",
        "print_front": "",
        "print_back": "",
        "dataset_image": str(first_image) if first_image else "",
        "reference_image_url": "",
    }

    if not first_json:
        return row

    try:
        data = json.loads(first_json.read_text(encoding="utf-8"))
        image_info = data.get("images", [{}])[0]
    except (OSError, json.JSONDecodeError, IndexError):
        return row

    row.update(
        {
            "label": first_nonempty(image_info.get("dl_mapping_code"), image_info.get("drug_N"), image_dir.name),
            "item_seq": first_nonempty(image_info.get("item_seq")),
            "drug_name": first_nonempty(image_info.get("dl_name"), image_dir.name),
            "drug_name_en": first_nonempty(image_info.get("dl_name_en")),
            "company": first_nonempty(image_info.get("dl_company")),
            "company_en": first_nonempty(image_info.get("dl_company_en")),
            "print_front": first_nonempty(image_info.get("print_front")),
            "print_back": first_nonempty(image_info.get("print_back")),
            "reference_image_url": first_nonempty(image_info.get("img_key")),
        }
    )
    return row


def merge_pill_info(row: dict[str, str], pill_info: dict[str, dict[str, str]]) -> dict[str, str]:
    """Merge medicine details exported from DB/public data.

    Match priority:
      1. item_seq
      2. label / pill_code
      3. drug_name / pill_name
    """
    candidates = [
        row.get("item_seq", ""),
        row.get("label", ""),
        row.get("drug_name", ""),
    ]

    match = None
    for key in candidates:
        if key and key in pill_info:
            match = pill_info[key]
            break

    if not match:
        return row

    field_map = {
        "drug_name": ["pill_name", "drug_name", "itemName"],
        "company": ["enterprise", "company", "entpName"],
        "effect": ["effect", "efcyQesitm"],
        "use_method": ["use_method", "useMethodQesitm"],
        "warning": ["warning", "atpnWarnQesitm"],
        "precaution": ["precaution", "atpnQesitm"],
        "interaction": ["interaction", "intrcQesitm"],
        "side_effect": ["side_effect", "seQesitm"],
        "reference_image_url": ["image_url", "itemImage"],
    }

    for target, source_names in field_map.items():
        merged_value = first_nonempty(row.get(target), *(match.get(name, "") for name in source_names))
        row[target] = merged_value

    return row


def load_pill_info_csv(path: str | Path | None) -> dict[str, dict[str, str]]:
    if not path:
        return {}

    csv_path = Path(path)
    if not csv_path.exists():
        raise FileNotFoundError(f"Pill info CSV not found: {csv_path}")

    info: dict[str, dict[str, str]] = {}
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            for key_name in ("item_seq", "pill_code", "label", "pill_name", "drug_name", "itemName"):
                key = row.get(key_name)
                if key:
                    info[str(key).strip()] = row
    return info
