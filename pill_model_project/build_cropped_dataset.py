from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from PIL import Image, ImageOps


DEFAULT_DATA_DIR = "H:\\내 드라이브\\pill_project\\data_100_per_pill_matched"
DEFAULT_OUTPUT_DIR = "H:\\내 드라이브\\pill_project\\data_100_per_pill_cropped"


def parse_args():
    parser = argparse.ArgumentParser(description="Build bbox-cropped pill dataset from AI Hub labels.")
    parser.add_argument("--data_dir", default=DEFAULT_DATA_DIR)
    parser.add_argument("--output_dir", default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--padding", type=float, default=0.28)
    return parser.parse_args()


def clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, value))


def square_crop_box(
    bbox: list[float],
    image_width: int,
    image_height: int,
    padding: float,
) -> tuple[int, int, int, int]:
    x, y, w, h = bbox
    center_x = x + w / 2
    center_y = y + h / 2
    side = max(w, h) * (1 + padding)
    half = side / 2

    left = clamp(int(center_x - half), 0, image_width)
    top = clamp(int(center_y - half), 0, image_height)
    right = clamp(int(center_x + half), 0, image_width)
    bottom = clamp(int(center_y + half), 0, image_height)

    return left, top, right, bottom


def read_bbox(label_path: Path) -> list[float] | None:
    try:
        data = json.loads(label_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

    annotations = data.get("annotations") or []
    if not annotations:
        return None

    # Use the largest bbox if multiple annotations exist.
    best = max(annotations, key=lambda item: item.get("bbox", [0, 0, 0, 0])[2] * item.get("bbox", [0, 0, 0, 0])[3])
    bbox = best.get("bbox")
    if not bbox or len(bbox) != 4:
        return None
    return bbox


def main():
    args = parse_args()
    data_dir = Path(args.data_dir)
    output_dir = Path(args.output_dir)

    image_root = data_dir / "images"
    label_root = data_dir / "labels"
    out_image_root = output_dir / "images"
    out_label_root = output_dir / "labels"
    out_image_root.mkdir(parents=True, exist_ok=True)
    out_label_root.mkdir(parents=True, exist_ok=True)

    total = 0
    skipped = 0

    for image_class_dir in sorted([p for p in image_root.iterdir() if p.is_dir()], key=lambda p: p.name):
        label = image_class_dir.name
        label_class_dir = label_root / f"{label}_json"
        out_image_class_dir = out_image_root / label
        out_label_class_dir = out_label_root / f"{label}_json"
        out_image_class_dir.mkdir(parents=True, exist_ok=True)
        out_label_class_dir.mkdir(parents=True, exist_ok=True)

        for image_path in sorted(image_class_dir.glob("*")):
            if image_path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
                continue

            label_path = label_class_dir / f"{image_path.stem}.json"
            bbox = read_bbox(label_path) if label_path.exists() else None
            if bbox is None:
                skipped += 1
                continue

            try:
                image = ImageOps.exif_transpose(Image.open(image_path).convert("RGB"))
            except OSError:
                skipped += 1
                continue

            crop_box = square_crop_box(bbox, image.width, image.height, args.padding)
            cropped = image.crop(crop_box)
            cropped.save(out_image_class_dir / image_path.name)
            if label_path.exists():
                shutil.copy2(label_path, out_label_class_dir / label_path.name)
            total += 1

        print(f"{label}: {len(list(out_image_class_dir.glob('*')))} cropped images")

    metadata_src = data_dir / "metadata.csv"
    if metadata_src.exists():
        shutil.copy2(metadata_src, output_dir / "metadata.csv")

    print(f"Saved cropped dataset: {output_dir}")
    print(f"Cropped images: {total}")
    print(f"Skipped: {skipped}")


if __name__ == "__main__":
    main()
