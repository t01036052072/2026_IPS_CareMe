from __future__ import annotations

import argparse
import csv
from pathlib import Path

from metadata import extract_label_metadata, load_pill_info_csv, merge_pill_info, metadata_path


DEFAULT_DATA_DIR = r"H:\내 드라이브\pill_project\data_100_per_pill_matched"


FIELDS = [
    "label",
    "item_seq",
    "drug_name",
    "drug_name_en",
    "company",
    "company_en",
    "effect",
    "use_method",
    "warning",
    "precaution",
    "interaction",
    "side_effect",
    "print_front",
    "print_back",
    "dataset_image",
    "reference_image_url",
]


def resolve_image_root(data_dir: str | Path) -> Path:
    root = Path(data_dir).expanduser()
    images_root = root / "images"
    return images_root if images_root.exists() else root


def parse_args():
    parser = argparse.ArgumentParser(description="Build metadata.csv for pill labels.")
    parser.add_argument("--data_dir", default=DEFAULT_DATA_DIR)
    parser.add_argument(
        "--pill_info_csv",
        default=None,
        help="Optional CSV exported from DB/public data. Used to fill effect and side_effect.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    data_dir = Path(args.data_dir)
    image_root = resolve_image_root(data_dir)
    label_root = data_dir / "labels"
    pill_info = load_pill_info_csv(args.pill_info_csv)

    rows = []
    for image_dir in sorted([p for p in image_root.iterdir() if p.is_dir()], key=lambda p: p.name):
        label_dir = label_root / f"{image_dir.name}_json"
        row = extract_label_metadata(label_dir, image_dir)
        row = merge_pill_info(row, pill_info)
        rows.append(row)

    out_path = metadata_path(data_dir)
    with out_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Saved metadata: {out_path}")
    print(f"Rows: {len(rows)}")
    missing_detail = [row["label"] for row in rows if not row.get("effect") or not row.get("side_effect")]
    if missing_detail:
        print(f"Rows missing effect/side_effect: {len(missing_detail)}")
        print("Fill metadata.csv manually or pass --pill_info_csv with those columns.")


if __name__ == "__main__":
    main()
