from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageOps

from dataset import IMAGE_EXTENSIONS, resolve_image_root


DEFAULT_DATA_DIR = r"H:\내 드라이브\pill_project\data_100_per_pill_cropped"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Add a failed user photo to the correct class folder for extra supervised training."
    )
    parser.add_argument("--image_path", required=True, help="Wrongly predicted user photo path.")
    parser.add_argument("--label", required=True, help="Correct class folder label, for example K-000034.")
    parser.add_argument("--data_dir", default=DEFAULT_DATA_DIR)
    parser.add_argument("--case_type", default="failed", choices=["failed", "success"])
    parser.add_argument("--predicted_label", default="")
    parser.add_argument("--predicted_name", default="")
    parser.add_argument(
        "--note",
        default="",
        help="Optional memo, for example expected drug name or what prediction was wrong.",
    )
    parser.add_argument(
        "--keep_original",
        action="store_true",
        help="Copy the original file bytes instead of saving a normalized RGB image.",
    )
    return parser.parse_args()


def unique_output_path(class_dir: Path, source: Path, case_type: str = "failed") -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    suffix = source.suffix.lower()
    if suffix not in IMAGE_EXTENSIONS:
        suffix = ".jpg"

    base = f"user_{case_type}_{timestamp}"
    output = class_dir / f"{base}{suffix}"
    counter = 1
    while output.exists():
        output = class_dir / f"{base}_{counter}{suffix}"
        counter += 1
    return output


def save_normalized_image(source: Path, output: Path) -> None:
    image = Image.open(source)
    image = ImageOps.exif_transpose(image).convert("RGB")
    if output.suffix.lower() in {".jpg", ".jpeg"}:
        image.save(output, quality=95)
    else:
        image.save(output)


def append_manifest(
    data_dir: Path,
    output: Path,
    label: str,
    source: Path,
    note: str,
    case_type: str = "failed",
    predicted_label: str = "",
    predicted_name: str = "",
) -> None:
    manifest_path = data_dir / "feedback_cases_manifest.jsonl"
    record = {
        "added_at": datetime.now().isoformat(timespec="seconds"),
        "case_type": case_type,
        "label": label,
        "predicted_label": predicted_label,
        "predicted_name": predicted_name,
        "source_image": str(source),
        "saved_image": str(output),
        "note": note,
    }
    with manifest_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def main():
    args = parse_args()
    source = Path(args.image_path).expanduser()
    data_dir = Path(args.data_dir).expanduser()
    images_root = resolve_image_root(data_dir)
    class_dir = images_root / args.label

    if not source.exists():
        raise FileNotFoundError(f"Image not found: {source}")
    if not class_dir.exists():
        available = ", ".join(p.name for p in sorted(images_root.iterdir()) if p.is_dir())
        raise ValueError(f"Class folder not found: {class_dir}\nAvailable labels: {available}")

    output = unique_output_path(class_dir, source, args.case_type)
    if args.keep_original:
        shutil.copy2(source, output)
    else:
        save_normalized_image(source, output)

    append_manifest(
        data_dir,
        output,
        args.label,
        source,
        args.note,
        args.case_type,
        args.predicted_label,
        args.predicted_name,
    )
    print(f"Added {args.case_type} case: {output}")
    print(f"Training label: {args.label}")
    print(f"Manifest: {data_dir / 'feedback_cases_manifest.jsonl'}")


if __name__ == "__main__":
    main()
