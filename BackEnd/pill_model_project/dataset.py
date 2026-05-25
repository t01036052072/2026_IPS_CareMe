from __future__ import annotations

import csv
from pathlib import Path
from typing import Callable

from PIL import Image, UnidentifiedImageError
from torch.utils.data import Dataset


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def resolve_image_root(data_dir: str | Path) -> Path:
    """Return the folder that contains class subfolders.

    The prepared dataset is expected to look like:
      data_100_per_pill_matched/images/K-000027/*.png

    If `data_dir/images` exists, that folder is used. Otherwise `data_dir`
    itself is treated like an ImageFolder root.
    """
    root = Path(data_dir).expanduser()
    images_root = root / "images"
    return images_root if images_root.exists() else root


def scan_imagefolder(data_dir: str | Path) -> tuple[list[tuple[Path, int]], list[str]]:
    """Scan class folders and build (image_path, label_index) samples."""
    root = resolve_image_root(data_dir)
    class_dirs = sorted([p for p in root.iterdir() if p.is_dir()], key=lambda p: p.name)

    class_names = [p.name for p in class_dirs]
    class_to_idx = {name: idx for idx, name in enumerate(class_names)}

    samples: list[tuple[Path, int]] = []
    for class_dir in class_dirs:
        label = class_to_idx[class_dir.name]
        for path in sorted(class_dir.rglob("*")):
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
                samples.append((path, label))

    if not class_names:
        raise ValueError(f"No class folders found under: {root}")
    if not samples:
        raise ValueError(f"No images found under: {root}")

    return samples, class_names


def scan_csv_dataset(data_dir: str | Path, csv_name: str = "labels.csv") -> tuple[list[tuple[Path, int]], list[str]]:
    """Optional CSV dataset support.

    CSV format:
      image_path,label

    image_path may be absolute or relative to data_dir.
    ImageFolder is the primary path for this project; this exists so the
    project can grow later if images are stored in one flat directory.
    """
    root = Path(data_dir).expanduser()
    csv_path = root / csv_name
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV label file not found: {csv_path}")

    rows: list[tuple[Path, str]] = []
    labels: set[str] = set()
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if "image_path" not in reader.fieldnames or "label" not in reader.fieldnames:
            raise ValueError("CSV must contain image_path and label columns.")
        for row in reader:
            image_path = Path(row["image_path"])
            if not image_path.is_absolute():
                image_path = root / image_path
            label = row["label"]
            if image_path.suffix.lower() in IMAGE_EXTENSIONS:
                rows.append((image_path, label))
                labels.add(label)

    class_names = sorted(labels)
    class_to_idx = {name: idx for idx, name in enumerate(class_names)}
    samples = [(path, class_to_idx[label]) for path, label in rows]
    return samples, class_names


class PillImageDataset(Dataset):
    """Image classification dataset that skips broken images safely."""

    def __init__(
        self,
        samples: list[tuple[Path, int]],
        transform: Callable | None = None,
    ) -> None:
        self.samples = samples
        self.transform = transform

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int):
        path, label = self.samples[index]

        try:
            image = Image.open(path).convert("RGB")
        except (OSError, UnidentifiedImageError):
            # Return None; safe_collate in utils.py filters it out.
            return None

        if self.transform:
            image = self.transform(image)

        return image, label, str(path)
