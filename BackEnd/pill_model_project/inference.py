from __future__ import annotations

import colorsys
import os
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import torch
from PIL import Image, ImageChops, ImageFilter, ImageOps

from .doctor_now_details import get_doctor_now_name
from .label_map import drug_name_for_label
from .dataset import resolve_image_root
from .metadata import extract_label_metadata, load_metadata
from .utils import create_model, get_device, get_transforms


PROJECT_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL_PATH = PROJECT_DIR / "checkpoints" / "final_model.pth"
DEFAULT_DATA_DIR = Path(os.getenv("PILL_MODEL_DATA_DIR", str(PROJECT_DIR)))


def load_or_build_metadata(data_dir: str | Path) -> dict[str, dict[str, str]]:
    try:
        metadata = load_metadata(data_dir)
    except OSError:
        return {}
    if metadata:
        return metadata

    root = Path(data_dir)
    try:
        image_root = resolve_image_root(root)
    except OSError:
        return {}
    label_root = root / "labels"
    if not image_root.exists() or not label_root.exists():
        return {}

    built: dict[str, dict[str, str]] = {}
    for image_dir in sorted([path for path in image_root.iterdir() if path.is_dir()], key=lambda path: path.name):
        label_dir = label_root / f"{image_dir.name}_json"
        row = extract_label_metadata(label_dir, image_dir)
        if row.get("label"):
            built[row["label"]] = row
    return built


@dataclass
class PillPredictionCandidate:
    label: str
    item_seq: str
    pill_name: str
    probability: float
    score: float
    crop: str
    color_match: bool | None
    imprint_match: bool | None
    visual_similarity: float | None


@dataclass
class PillPredictionResult:
    label: str
    item_seq: str
    pill_name: str
    confidence: float
    score: float
    low_confidence: bool
    crop: str
    top_candidates: list[PillPredictionCandidate]


def clamp_box(box: tuple[int, int, int, int], width: int, height: int) -> tuple[int, int, int, int]:
    left, top, right, bottom = box
    return max(0, left), max(0, top), min(width, right), min(height, bottom)


def square_expand_box(
    box: tuple[int, int, int, int],
    width: int,
    height: int,
    padding_ratio: float = 0.22,
) -> tuple[int, int, int, int]:
    left, top, right, bottom = box
    side = int(max(right - left, bottom - top) * (1 + padding_ratio))
    center_x = (left + right) // 2
    center_y = (top + bottom) // 2
    half = side // 2
    return clamp_box((center_x - half, center_y - half, center_x + half, center_y + half), width, height)


def bbox_from_mask(mask: Image.Image, min_area_ratio: float = 0.003) -> tuple[int, int, int, int] | None:
    bbox = mask.getbbox()
    if not bbox:
        return None
    width, height = mask.size
    area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
    if area < width * height * min_area_ratio:
        return None
    return bbox


def make_crop_candidates(image: Image.Image) -> list[tuple[str, Image.Image]]:
    image = ImageOps.exif_transpose(image.convert("RGB"))
    width, height = image.size
    candidates: list[tuple[str, Image.Image]] = [("original", image)]

    corner_size = max(8, min(width, height) // 20)
    corners = [
        image.crop((0, 0, corner_size, corner_size)),
        image.crop((width - corner_size, 0, width, corner_size)),
        image.crop((0, height - corner_size, corner_size, height)),
        image.crop((width - corner_size, height - corner_size, width, height)),
    ]
    corner_pixels = [corner.resize((1, 1)).getpixel((0, 0)) for corner in corners]
    bg = tuple(int(sum(pixel[i] for pixel in corner_pixels) / len(corner_pixels)) for i in range(3))

    bg_image = Image.new("RGB", image.size, bg)
    diff = ImageChops.difference(image, bg_image).convert("L").filter(ImageFilter.GaussianBlur(radius=2))
    bbox = bbox_from_mask(diff.point(lambda p: 255 if p > 18 else 0))
    if bbox:
        candidates.append(("auto_crop", image.crop(square_expand_box(bbox, width, height))))

    gray = ImageOps.grayscale(image)
    bbox = bbox_from_mask(gray.point(lambda p: 255 if p < 245 else 0))
    if bbox:
        candidates.append(("non_white_crop", image.crop(square_expand_box(bbox, width, height))))

    if width >= height * 1.35:
        mid = width // 2
        candidates.append(("left_half", image.crop((0, 0, mid, height))))
        candidates.append(("right_half", image.crop((mid, 0, width, height))))

    side = min(width, height)
    left = (width - side) // 2
    top = (height - side) // 2
    candidates.append(("center_square", image.crop((left, top, left + side, top + side))))

    unique: list[tuple[str, Image.Image]] = []
    seen = set()
    for name, candidate in candidates:
        key = (name, candidate.size)
        if key not in seen and candidate.size[0] > 20 and candidate.size[1] > 20:
            unique.append((name, candidate))
            seen.add(key)
    return unique


def foreground_pixels(image: Image.Image, max_size: int = 160) -> list[tuple[int, int, int]]:
    image = ImageOps.exif_transpose(image.convert("RGB"))
    image.thumbnail((max_size, max_size))
    width, height = image.size
    corner_size = max(4, min(width, height) // 12)
    corners = [
        image.crop((0, 0, corner_size, corner_size)),
        image.crop((width - corner_size, 0, width, corner_size)),
        image.crop((0, height - corner_size, corner_size, height)),
        image.crop((width - corner_size, height - corner_size, width, height)),
    ]
    corner_pixels = list(pixel for corner in corners for pixel in corner.getdata())
    bg = tuple(int(sum(pixel[i] for pixel in corner_pixels) / len(corner_pixels)) for i in range(3))
    pixels = [pixel for pixel in image.getdata() if sum(abs(pixel[i] - bg[i]) for i in range(3)) > 28]
    return pixels if len(pixels) >= 20 else list(image.getdata())


def median_rgb(pixels: list[tuple[int, int, int]]) -> tuple[int, int, int]:
    channels = list(zip(*pixels))
    return tuple(int(sorted(channel)[len(channel) // 2]) for channel in channels)


def color_name_from_rgb(rgb: tuple[int, int, int]) -> str:
    r, g, b = [value / 255 for value in rgb]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    hue = h * 360

    if v < 0.23:
        return "black"
    if s < 0.16 and v > 0.72:
        return "white"
    if s < 0.18:
        return "gray"
    if hue < 18 or hue >= 345:
        return "red"
    if hue < 45:
        return "orange"
    if hue < 75:
        return "yellow"
    if hue < 165:
        return "green"
    if hue < 255:
        return "blue"
    if hue < 315:
        return "purple"
    return "pink"


def estimate_pill_color(image: Image.Image) -> str:
    return color_name_from_rgb(median_rgb(foreground_pixels(image)))


def colors_are_compatible(input_color: str, train_color: str) -> bool:
    if input_color == train_color:
        return True
    return input_color in {"white", "gray"} and train_color in {"white", "gray"}


def normalize_imprint(text: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", text.upper())


def expected_imprints(pill_info: dict[str, str]) -> list[str]:
    values = [pill_info.get("print_front", ""), pill_info.get("print_back", "")]
    return [normalize_imprint(value) for value in values if normalize_imprint(value)]


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)

    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        current = [i]
        for j, cb in enumerate(b, start=1):
            current.append(min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (ca != cb)))
        previous = current
    return previous[-1]


def imprint_similarity(a: str, b: str) -> float:
    a = normalize_imprint(a)
    b = normalize_imprint(b)
    if len(a) < 2 or len(b) < 2:
        return 0.0
    if a in b or b in a:
        shorter = min(len(a), len(b))
        longer = max(len(a), len(b))
        return 1.0 if shorter / longer >= 0.55 else 0.45
    return max(0.0, 1.0 - levenshtein(a, b) / max(len(a), len(b)))


def try_ocr_imprints(image: Image.Image) -> list[str] | None:
    try:
        import pytesseract
    except ImportError:
        return None
    from .ocr_config import configure_pytesseract

    configure_pytesseract(pytesseract)

    gray = ImageOps.grayscale(ImageOps.exif_transpose(image.convert("RGB")))
    gray = ImageOps.autocontrast(gray)
    if max(gray.size) > 900:
        gray.thumbnail((900, 900))
    else:
        scale = 2 if max(gray.size) < 700 else 1
        gray = gray.resize((gray.width * scale, gray.height * scale))
    sharp = gray.filter(ImageFilter.SHARPEN).filter(ImageFilter.SHARPEN)
    variants = [sharp, ImageOps.invert(sharp)]
    configs = [
        "--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    ]

    results: list[str] = []
    seen = set()
    for variant in variants:
        for config in configs:
            try:
                normalized = normalize_imprint(pytesseract.image_to_string(variant, config=config, timeout=0.8))
            except (pytesseract.TesseractError, RuntimeError):
                continue
            if len(normalized) >= 2 and normalized not in seen:
                seen.add(normalized)
                results.append(normalized)
    return results


def best_imprint_score(ocr_results: list[str] | None, expected_values: list[str]) -> float:
    if not ocr_results or not expected_values:
        return 0.0
    return max(imprint_similarity(detected, expected) for detected in ocr_results for expected in expected_values)


def resolve_image_root(data_dir: str | Path) -> Path:
    root = Path(data_dir)
    images_root = root / "images"
    return images_root if images_root.exists() else root


def find_example_images(data_dir: str | Path, label: str, primary: Path | None = None, limit: int = 8) -> list[Path]:
    paths: list[Path] = []
    if primary and primary.exists():
        paths.append(primary)
    class_dir = resolve_image_root(data_dir) / label
    if class_dir.exists():
        for ext in ("*.jpg", "*.jpeg", "*.png"):
            for path in sorted(class_dir.glob(ext)):
                if path not in paths:
                    paths.append(path)
                if len(paths) >= limit:
                    return paths
    return paths


def imprint_visual_vector(image: Image.Image, image_size: int = 96) -> list[float]:
    gray = ImageOps.grayscale(ImageOps.exif_transpose(image.convert("RGB")))
    gray = ImageOps.autocontrast(gray).resize((image_size, image_size), Image.Resampling.BILINEAR)
    combined = ImageChops.add(gray.filter(ImageFilter.FIND_EDGES), gray.filter(ImageFilter.EMBOSS), scale=2.0)
    pixels = [value / 255.0 for value in ImageOps.autocontrast(combined).getdata()]
    mean = sum(pixels) / len(pixels)
    centered = [value - mean for value in pixels]
    norm = sum(value * value for value in centered) ** 0.5
    return centered if norm == 0 else [value / norm for value in centered]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    return max(0.0, min(1.0, (sum(x * y for x, y in zip(a, b)) + 1.0) / 2.0))


def best_visual_similarity(input_image: Image.Image, example_paths: list[Path]) -> float | None:
    if not example_paths:
        return None
    input_vector = imprint_visual_vector(input_image)
    best = 0.0
    for path in example_paths:
        try:
            example = Image.open(path).convert("RGB")
        except OSError:
            continue
        best = max(best, cosine_similarity(input_vector, imprint_visual_vector(example)))
    return best


@lru_cache(maxsize=2)
def load_model_bundle(model_path: str = str(DEFAULT_MODEL_PATH)):
    checkpoint_path = Path(model_path)
    if not checkpoint_path.exists():
        raise FileNotFoundError(f"Pill model checkpoint not found: {checkpoint_path}")

    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    class_names = checkpoint["class_names"]
    model_name = checkpoint.get("model_name", "efficientnet_b0")
    device = get_device()
    model = create_model(model_name, num_classes=len(class_names), pretrained=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()
    _, eval_transform = get_transforms()
    return model, class_names, eval_transform, device


def predict_tensor(model, transform, device, image: Image.Image, top_k: int, num_classes: int):
    tensor = transform(image).unsqueeze(0).to(device)
    with torch.no_grad():
        probs = torch.softmax(model(tensor), dim=1)[0]
        return torch.topk(probs, k=min(top_k, num_classes))


def predict_pill_image(
    image_path: str | Path,
    model_path: str | Path = DEFAULT_MODEL_PATH,
    data_dir: str | Path = DEFAULT_DATA_DIR,
    top_k: int = 5,
    threshold: float = 0.95,
    use_ocr: bool = True,
) -> PillPredictionResult:
    model, class_names, transform, device = load_model_bundle(str(model_path))
    image = Image.open(image_path).convert("RGB")
    metadata = load_or_build_metadata(data_dir)
    detected_imprints = try_ocr_imprints(image) if use_ocr else None

    evaluated: dict[str, PillPredictionCandidate] = {}
    for crop_name, crop_image in make_crop_candidates(image):
        top_probs, top_indices = predict_tensor(model, transform, device, crop_image, top_k, len(class_names))
        for prob, idx_tensor in zip(top_probs, top_indices):
            idx = idx_tensor.item()
            label = class_names[idx]
            info = metadata.get(label, {})
            item_seq = info.get("item_seq", "")
            pill_name = info.get("drug_name") or get_doctor_now_name(label) or drug_name_for_label(label)

            input_color = estimate_pill_color(crop_image)
            color_match = None
            visual_similarity = None
            example_path = Path(info.get("dataset_image", "")) if info.get("dataset_image") else None
            try:
                examples = find_example_images(data_dir, label, example_path)
            except OSError:
                examples = []
            if examples:
                try:
                    train_color = estimate_pill_color(Image.open(examples[0]).convert("RGB"))
                    color_match = colors_are_compatible(input_color, train_color)
                    if input_color in {"white", "gray"} and train_color in {"white", "gray"}:
                        visual_similarity = best_visual_similarity(crop_image, examples)
                except OSError:
                    pass

            imprint_score = best_imprint_score(detected_imprints, expected_imprints(info))
            imprint_match = True if imprint_score >= 0.75 else None

            score = prob.item()
            if crop_name == "center_square":
                score += 0.06

            if color_match is False:
                score -= 0.75
            elif color_match is True:
                score += 0.08
            if visual_similarity is not None:
                score += (visual_similarity - 0.5) * 1.1
                if visual_similarity >= 0.72:
                    score += 0.25
                elif visual_similarity <= 0.38:
                    score -= 0.25
            if imprint_match is True:
                score += 0.35

            candidate = PillPredictionCandidate(
                label=label,
                item_seq=item_seq,
                pill_name=pill_name,
                probability=prob.item(),
                score=score,
                crop=crop_name,
                color_match=color_match,
                imprint_match=imprint_match,
                visual_similarity=visual_similarity,
            )
            previous = evaluated.get(label)
            if previous is None or candidate.score > previous.score:
                evaluated[label] = candidate

    ranked = sorted(evaluated.values(), key=lambda item: item.score, reverse=True)
    if not ranked:
        raise ValueError("No prediction candidates were produced.")

    best = ranked[0]
    return PillPredictionResult(
        label=best.label,
        item_seq=best.item_seq,
        pill_name=best.pill_name,
        confidence=best.probability,
        score=best.score,
        low_confidence=best.probability < threshold or best.color_match is False,
        crop=best.crop,
        top_candidates=ranked[:top_k],
    )
