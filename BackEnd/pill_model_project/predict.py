from __future__ import annotations

import argparse
import colorsys
import re
import sys
from dataclasses import dataclass
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib import font_manager
import torch
from PIL import Image, ImageChops, ImageFilter, ImageOps

from dataset import resolve_image_root
from doctor_now_details import get_doctor_now_detail, get_doctor_now_name
from label_map import db_keywords_for_label, drug_name_for_label
from metadata import extract_label_metadata, load_metadata
from utils import create_model, find_example_image, get_device, get_transforms


BACKEND_ROOT = Path(__file__).resolve().parents[1]


DEFAULT_DATA_DIR = "H:\\내 드라이브\\pill_project\\data_100_per_pill_matched"


def configure_matplotlib_font() -> None:
    font_path = Path("C:/Windows/Fonts/malgun.ttf")
    if font_path.exists():
        font_manager.fontManager.addfont(str(font_path))
        plt.rcParams["font.family"] = "Malgun Gothic"
    plt.rcParams["axes.unicode_minus"] = False


@dataclass
class CandidateResult:
    label: str
    label_index: int
    name: str
    probability: float
    crop_name: str
    crop_image: Image.Image
    example_path: Path | None
    color_match: bool | None
    imprint_match: bool | None
    visual_similarity: float | None
    score: float


def parse_args():
    parser = argparse.ArgumentParser(description="Predict pill class from one image.")
    parser.add_argument("--image_path", required=True)
    parser.add_argument("--model_path", default="checkpoints/final_model.pth")
    parser.add_argument("--data_dir", default=DEFAULT_DATA_DIR)
    parser.add_argument("--top_k", type=int, default=5)
    parser.add_argument("--threshold", type=float, default=0.95)
    parser.add_argument("--no_auto_crop", action="store_true", help="Disable automatic crop candidates.")
    parser.add_argument("--no_ocr", action="store_true", help="Disable optional imprint OCR validation.")
    parser.add_argument("--no_confirm", action="store_true", help="Do not ask confirmation before printing DB details.")
    parser.add_argument("--no_show", action="store_true", help="Do not open the matplotlib image preview window.")
    return parser.parse_args()


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
    box_w = right - left
    box_h = bottom - top
    side = int(max(box_w, box_h) * (1 + padding_ratio))
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
    corner_pixels = []
    for corner in corners:
        corner_pixels.extend(corner.resize((1, 1)).getdata())
    bg = tuple(int(sum(pixel[i] for pixel in corner_pixels) / len(corner_pixels)) for i in range(3))

    bg_image = Image.new("RGB", image.size, bg)
    diff = ImageChops.difference(image, bg_image).convert("L")
    diff = diff.filter(ImageFilter.GaussianBlur(radius=2))
    mask = diff.point(lambda p: 255 if p > 18 else 0)
    bbox = bbox_from_mask(mask)
    if bbox:
        candidates.append(("auto_crop", image.crop(square_expand_box(bbox, width, height))))

    gray = ImageOps.grayscale(image)
    non_white_mask = gray.point(lambda p: 255 if p < 245 else 0)
    bbox = bbox_from_mask(non_white_mask)
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


def predict_image(model, image: Image.Image, transform, device, top_k: int, num_classes: int):
    tensor = transform(image).unsqueeze(0).to(device)
    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)[0]
        top_probs, top_indices = torch.topk(probs, k=min(top_k, num_classes))
    return top_probs, top_indices


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
    corner_pixels = []
    for corner in corners:
        corner_pixels.extend(list(corner.getdata()))
    bg = tuple(int(sum(pixel[i] for pixel in corner_pixels) / len(corner_pixels)) for i in range(3))

    pixels = []
    for pixel in image.getdata():
        distance = sum(abs(pixel[i] - bg[i]) for i in range(3))
        if distance > 28:
            pixels.append(pixel)

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


def estimate_pill_color(image: Image.Image) -> tuple[str, tuple[int, int, int]]:
    pixels = foreground_pixels(image)
    rgb = median_rgb(pixels)
    return color_name_from_rgb(rgb), rgb


def colors_are_compatible(input_color: str, train_color: str) -> bool:
    if input_color == train_color:
        return True
    neutral = {"white", "gray"}
    if input_color in neutral and train_color in neutral:
        return True
    return False


def is_neutral_pill_color(color: str) -> bool:
    return color in {"white", "gray"}


def imprint_visual_vector(image: Image.Image, image_size: int = 96) -> list[float]:
    image = ImageOps.exif_transpose(image.convert("RGB"))
    gray = ImageOps.grayscale(image)
    gray = ImageOps.autocontrast(gray)
    gray = gray.resize((image_size, image_size), Image.Resampling.BILINEAR)

    # Embossed white-pill imprints often fail OCR, but edge/emboss filters keep
    # the groove and shadow pattern useful for comparing candidate pills.
    edge = gray.filter(ImageFilter.FIND_EDGES)
    emboss = gray.filter(ImageFilter.EMBOSS)
    combined = ImageChops.add(edge, emboss, scale=2.0)
    combined = ImageOps.autocontrast(combined)

    pixels = [value / 255.0 for value in combined.getdata()]
    mean = sum(pixels) / len(pixels)
    centered = [value - mean for value in pixels]
    norm = sum(value * value for value in centered) ** 0.5
    if norm == 0:
        return centered
    return [value / norm for value in centered]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    return max(0.0, min(1.0, (sum(x * y for x, y in zip(a, b)) + 1.0) / 2.0))


def example_images_for_label(data_dir: str | Path, label: str, primary: Path | None, limit: int = 8) -> list[Path]:
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
    return paths[:limit]


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
        score = cosine_similarity(input_vector, imprint_visual_vector(example))
        best = max(best, score)
    return best


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
            insert_cost = current[j - 1] + 1
            delete_cost = previous[j] + 1
            replace_cost = previous[j - 1] + (ca != cb)
            current.append(min(insert_cost, delete_cost, replace_cost))
        previous = current
    return previous[-1]


def imprint_similarity(a: str, b: str) -> float:
    a = normalize_imprint(a)
    b = normalize_imprint(b)
    if not a or not b:
        return 0.0
    # Single-character OCR is too noisy for pill imprints. It should not boost
    # a candidate like "TRESTAN" just because OCR returned "R".
    if len(a) < 2 or len(b) < 2:
        return 0.0
    if a in b or b in a:
        shorter = min(len(a), len(b))
        longer = max(len(a), len(b))
        if shorter < 2:
            return 0.0
        # Very short partial matches are weak evidence only.
        if shorter / longer < 0.55:
            return 0.45
        return 1.0
    distance = levenshtein(a, b)
    return max(0.0, 1.0 - distance / max(len(a), len(b)))


def preprocess_ocr_images(image: Image.Image) -> list[tuple[str, Image.Image]]:
    gray = ImageOps.grayscale(ImageOps.exif_transpose(image.convert("RGB")))
    gray = ImageOps.autocontrast(gray)
    scale = 3 if max(gray.size) < 700 else 2
    gray = gray.resize((gray.width * scale, gray.height * scale))
    sharp = gray.filter(ImageFilter.SHARPEN).filter(ImageFilter.SHARPEN)
    blur = sharp.filter(ImageFilter.GaussianBlur(radius=0.6))

    variants = [
        ("gray", gray),
        ("sharp", sharp),
        ("invert", ImageOps.invert(sharp)),
    ]

    for threshold in (110, 135, 160, 185):
        binary_dark = blur.point(lambda p, t=threshold: 255 if p < t else 0)
        binary_light = blur.point(lambda p, t=threshold: 255 if p > t else 0)
        variants.append((f"dark_t{threshold}", binary_dark))
        variants.append((f"light_t{threshold}", binary_light))

    return variants


def try_ocr_imprints(image: Image.Image) -> list[str] | None:
    try:
        import pytesseract
    except ImportError:
        return None

    configs = [
        "--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        "--psm 8 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        "--psm 10 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        "--psm 13 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    ]

    results: list[str] = []
    seen = set()
    for _, variant in preprocess_ocr_images(image):
        for config in configs:
            try:
                text = pytesseract.image_to_string(variant, config=config)
            except pytesseract.TesseractError:
                continue
            normalized = normalize_imprint(text)
            if len(normalized) >= 2 and normalized not in seen:
                seen.add(normalized)
                results.append(normalized)
    return results


def best_imprint_similarity(ocr_results: list[str] | None, expected_values: list[str]) -> tuple[float, str]:
    if not ocr_results or not expected_values:
        return 0.0, ""

    best_score = 0.0
    best_text = ""
    for detected in ocr_results:
        for expected in expected_values:
            score = imprint_similarity(detected, expected)
            if score > best_score:
                best_score = score
                best_text = detected
    return best_score, best_text


def first_nonempty(*values) -> str:
    for value in values:
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


def normalize_medicine_name(value: str) -> str:
    value = value.lower()
    value = re.sub(r"\([^)]*\)", "", value)
    value = re.sub(r"\[[^]]*\]", "", value)
    value = re.sub(
        r"\d+(\.\d+)?\s*(mg|g|ml|mcg|밀리그램|그램|정|캡슐|ptp)",
        "",
        value,
        flags=re.IGNORECASE,
    )
    return re.sub(r"[^0-9a-z가-힣]", "", value)


def medicine_name_score(query: str, candidate: str) -> float:
    query_norm = normalize_medicine_name(query)
    candidate_norm = normalize_medicine_name(candidate)
    if not query_norm or not candidate_norm:
        return 0.0
    if query_norm == candidate_norm:
        return 1.0
    if query_norm in candidate_norm or candidate_norm in query_norm:
        return min(len(query_norm), len(candidate_norm)) / max(len(query_norm), len(candidate_norm))

    query_chars = set(query_norm)
    candidate_chars = set(candidate_norm)
    return len(query_chars & candidate_chars) / len(query_chars | candidate_chars)


def detail_search_terms(label: str, *names: str) -> list[str]:
    terms: list[str] = []
    seen = set()

    for keyword in db_keywords_for_label(label):
        keyword = keyword.strip()
        if keyword and keyword not in seen:
            seen.add(keyword)
            terms.append(keyword)

    for name in names:
        if not name:
            continue

        candidates = [
            name,
            name.split("(")[0],
            re.sub(r"\s*\d+(\.\d+)?\s*(mg|g|ml|mcg|정|캡슐|PTP).*$", "", name, flags=re.IGNORECASE),
        ]

        for candidate in candidates:
            candidate = candidate.strip()
            if candidate and candidate not in seen:
                seen.add(candidate)
                terms.append(candidate)

    return terms


def load_or_build_metadata(data_dir: str | Path) -> dict[str, dict[str, str]]:
    try:
        metadata = load_metadata(data_dir)
    except OSError as exc:
        print(f"[metadata skipped] {exc}")
        return {}
    if metadata:
        return metadata

    root = Path(data_dir)
    try:
        image_root = resolve_image_root(root)
    except OSError as exc:
        print(f"[metadata skipped] {exc}")
        return {}
    label_root = root / "labels"
    if not image_root.exists() or not label_root.exists():
        print(
            "[metadata skipped] metadata.csv 또는 labels 폴더가 없어 "
            "전체 라벨-DB 이름 매칭을 만들 수 없습니다."
        )
        return {}

    built: dict[str, dict[str, str]] = {}
    for image_dir in sorted([path for path in image_root.iterdir() if path.is_dir()], key=lambda path: path.name):
        label_dir = label_root / f"{image_dir.name}_json"
        row = extract_label_metadata(label_dir, image_dir)
        if row.get("label"):
            built[row["label"]] = row

    print(f"[metadata built in memory] labels={len(built)}")
    return built


def load_db_pill_info(label: str, fallback_name: str = "", item_seq: str = "") -> dict[str, str]:
    detail = get_doctor_now_detail(label)
    if not detail:
        print(f"[local detail skipped] no detail matched label={label}")
        return {}

    print(f"[local detail found] label={label}, pill_name={detail.get('pill_name')}")
    return {
        "drug_name": first_nonempty(detail.get("pill_name")),
        "effect": first_nonempty(detail.get("effect")),
        "side_effect": first_nonempty(detail.get("side_effect")),
        "use_method": first_nonempty(detail.get("use_method")),
        "warning": first_nonempty(detail.get("warning")),
    }


def merge_display_pill_info(metadata_info: dict[str, str], db_info: dict[str, str]) -> dict[str, str]:
    merged = dict(metadata_info)
    for key, value in db_info.items():
        if value:
            merged[key] = value
    return merged


def evaluate_candidate(
    label: str,
    idx: int,
    probability: float,
    crop_name: str,
    crop_image: Image.Image,
    metadata: dict[str, dict[str, str]],
    data_dir: str,
    detected_imprints: list[str] | None,
) -> CandidateResult:
    pill_info = metadata.get(label, {})
    name = pill_info.get("drug_name") or get_doctor_now_name(label) or drug_name_for_label(label)
    example_path = Path(pill_info["dataset_image"]) if pill_info.get("dataset_image") else None
    if not example_path or not example_path.exists():
        try:
            example_path = find_example_image(data_dir, label)
        except OSError:
            example_path = None

    input_color, _ = estimate_pill_color(crop_image)
    color_match: bool | None = None
    visual_similarity: float | None = None
    if example_path and example_path.exists():
        train_image = Image.open(example_path).convert("RGB")
        train_color, _ = estimate_pill_color(train_image)
        color_match = colors_are_compatible(input_color, train_color)
        if is_neutral_pill_color(input_color) and is_neutral_pill_color(train_color):
            visual_similarity = best_visual_similarity(
                crop_image,
                example_images_for_label(data_dir, label, example_path),
            )

    imprints = expected_imprints(pill_info)
    imprint_match: bool | None = None
    imprint_score, _ = best_imprint_similarity(detected_imprints, imprints)
    if imprints and detected_imprints and imprint_score >= 0.75:
        imprint_match = True

    score = probability
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

    # OCR is noisy for embossed white pills, so use it as strong positive
    # evidence only. Bad OCR should not sink a plausible white-pill candidate.
    if imprint_match is True:
        score += 0.35

    return CandidateResult(
        label=label,
        label_index=idx,
        name=name,
        probability=probability,
        crop_name=crop_name,
        crop_image=crop_image,
        example_path=example_path,
        color_match=color_match,
        imprint_match=imprint_match,
        visual_similarity=visual_similarity,
        score=score,
    )


def show_images(
    upload_path: Path,
    crop_image: Image.Image,
    example_path: Path | None,
    predicted_label: str,
    confidence: float,
    crop_name: str,
):
    columns = 3 if example_path else 2
    plt.figure(figsize=(5 * columns, 5))

    plt.subplot(1, columns, 1)
    plt.imshow(Image.open(upload_path).convert("RGB"))
    plt.title("Uploaded")
    plt.axis("off")

    plt.subplot(1, columns, 2)
    plt.imshow(crop_image)
    plt.title(f"Model input: {crop_name}\n{predicted_label} ({confidence:.2%})")
    plt.axis("off")

    if example_path:
        plt.subplot(1, columns, 3)
        plt.imshow(Image.open(example_path).convert("RGB"))
        plt.title("Training example")
        plt.axis("off")

    plt.tight_layout()
    plt.show()


def copy_feedback_case(
    image_path: Path,
    data_dir: Path,
    label: str,
    case_type: str,
    predicted_label: str,
    predicted_name: str,
    note: str,
) -> Path:
    images_root = resolve_image_root(data_dir)
    class_dir = images_root / label
    if not class_dir.exists():
        raise ValueError(f"Class folder not found: {class_dir}")

    output = unique_output_path(class_dir, image_path, case_type)
    save_normalized_image(image_path, output)
    append_manifest(
        data_dir=data_dir,
        output=output,
        label=label,
        source=image_path,
        note=note,
        case_type=case_type,
        predicted_label=predicted_label,
        predicted_name=predicted_name,
    )
    return output


def resolve_feedback_label(answer: str, metadata: dict[str, dict[str, str]], data_dir: Path) -> str | None:
    answer = answer.strip()
    if not answer:
        return None

    images_root = resolve_image_root(data_dir)
    if (images_root / answer).exists():
        return answer

    normalized_answer = answer.replace(" ", "").lower()
    matches: list[tuple[str, str]] = []
    for label, info in metadata.items():
        drug_name = info.get("drug_name", "")
        normalized_name = drug_name.replace(" ", "").lower()
        if normalized_answer in normalized_name:
            matches.append((label, drug_name))

    if len(matches) == 1:
        label, drug_name = matches[0]
        print(f"정답 라벨을 찾았습니다: {label} ({drug_name})")
        return label

    if len(matches) > 1:
        print("비슷한 약 이름이 여러 개입니다. 다음에는 정확한 라벨을 입력해 주세요:")
        for label, drug_name in matches[:10]:
            print(f"- {label}: {drug_name}")
        return None

    print("해당 약 이름을 metadata에서 찾지 못했습니다. K-000034 같은 라벨로 입력해 주세요.")
    return None


def collect_feedback(
    image_path: Path,
    data_dir: Path,
    metadata: dict[str, dict[str, str]],
    best: CandidateResult,
) -> None:
    answer = input("\n이 약이 맞았나요? [맞음/틀림/건너뛰기]: ").strip().lower()
    if answer in {"", "s", "skip", "건너뛰기", "건너뛰", "패스"}:
        print("피드백을 건너뛰었습니다.")
        return

    if answer in {"y", "yes", "맞", "맞음", "맞았어", "ㅇ", "ㅇㅇ"}:
        output = copy_feedback_case(
            image_path=image_path,
            data_dir=data_dir,
            label=best.label,
            case_type="success",
            predicted_label=best.label,
            predicted_name=best.name,
            note="prediction accepted by user",
        )
        print(f"성공 케이스를 학습 데이터에 저장했습니다: {output}")
        return

    if answer not in {"n", "no", "틀", "틀림", "틀렸어", "아니", "ㄴ", "ㄴㄴ"}:
        print("답변을 이해하지 못해서 피드백을 저장하지 않았습니다.")
        return

    correct = input("정답 약 이름이나 라벨을 입력해 주세요. 예: K-000034 또는 페니라민정: ")
    correct_label = resolve_feedback_label(correct, metadata, data_dir)
    if not correct_label:
        print("정답 라벨을 찾지 못해서 피드백을 저장하지 않았습니다.")
        return

    output = copy_feedback_case(
        image_path=image_path,
        data_dir=data_dir,
        label=correct_label,
        case_type="failed",
        predicted_label=best.label,
        predicted_name=best.name,
        note=f"wrong prediction: {best.name} ({best.label})",
    )
    print(f"실패 케이스를 정답 라벨 학습 데이터에 저장했습니다: {output}")


def print_pill_details_after_confirmation(pill_info: dict[str, str], skip_confirm: bool = False) -> None:
    if not skip_confirm:
        answer = input("\n이 약이 맞습니까? [예/아니오]: ").strip().lower()
        if answer not in {"y", "yes", "예", "네", "맞음", "맞아요", "ㅇ", "ㅇㅇ"}:
            print("사진 검색 화면으로 돌아가서 다시 촬영해 주세요.")
            return

    print("\n선택한 약 상세 정보")
    print(f"Effect: {pill_info.get('effect') or '-'}")
    print(f"Side effect: {pill_info.get('side_effect') or '-'}")
    print(f"Use method: {pill_info.get('use_method') or '-'}")
    print(f"Warning: {pill_info.get('warning') or pill_info.get('precaution') or '-'}")

    missing = [
        name
        for name, value in {
            "effect": pill_info.get("effect"),
            "side_effect": pill_info.get("side_effect"),
            "use_method": pill_info.get("use_method"),
            "warning/precaution": pill_info.get("warning") or pill_info.get("precaution"),
        }.items()
        if not value
    ]
    if missing:
        print(f"[DB detail empty fields] {', '.join(missing)}")


def main():
    configure_matplotlib_font()
    args = parse_args()
    image_path = Path(args.image_path)
    checkpoint = torch.load(args.model_path, map_location="cpu")
    class_names = checkpoint["class_names"]
    model_name = checkpoint.get("model_name", "efficientnet_b0")

    device = get_device()
    model = create_model(model_name, num_classes=len(class_names), pretrained=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()

    _, eval_transform = get_transforms()
    image = Image.open(image_path).convert("RGB")
    candidates = [("original", image)] if args.no_auto_crop else make_crop_candidates(image)
    metadata = load_or_build_metadata(args.data_dir)

    detected_imprints = None if args.no_ocr else try_ocr_imprints(image)
    if detected_imprints is not None:
        preview = ", ".join(detected_imprints[:12]) if detected_imprints else "-"
        print(f"Detected imprint OCR candidates: {preview}")

    evaluated: list[CandidateResult] = []
    seen = set()
    for crop_name, crop_image in candidates:
        top_probs, top_indices = predict_image(model, crop_image, eval_transform, device, args.top_k, len(class_names))
        for prob, idx_tensor in zip(top_probs, top_indices):
            idx = idx_tensor.item()
            label = class_names[idx]
            key = (label, crop_name)
            if key in seen:
                continue
            seen.add(key)
            evaluated.append(
                evaluate_candidate(
                    label=label,
                    idx=idx,
                    probability=prob.item(),
                    crop_name=crop_name,
                    crop_image=crop_image,
                    metadata=metadata,
                    data_dir=args.data_dir,
                    detected_imprints=detected_imprints,
                )
            )

    best_by_label: dict[str, CandidateResult] = {}
    for candidate in evaluated:
        previous = best_by_label.get(candidate.label)
        if previous is None or candidate.score > previous.score:
            best_by_label[candidate.label] = candidate

    ranked = sorted(best_by_label.values(), key=lambda item: item.score, reverse=True)
    best = ranked[0]
    pill_info = merge_display_pill_info(
        metadata.get(best.label, {}),
        load_db_pill_info(
            best.label,
            best.name,
            metadata.get(best.label, {}).get("item_seq", ""),
        ),
    )
    if pill_info.get("drug_name"):
        best.name = pill_info["drug_name"]

    print("\nTop candidates after validation:")
    for rank, candidate in enumerate(ranked[: args.top_k], start=1):
        color_status = "?" if candidate.color_match is None else ("OK" if candidate.color_match else "BAD")
        imprint_status = "?" if candidate.imprint_match is None else ("OK" if candidate.imprint_match else "BAD")
        visual_status = "-" if candidate.visual_similarity is None else f"{candidate.visual_similarity:.3f}"
        print(
            f"{rank}. {candidate.name} ({candidate.label}) - "
            f"model={candidate.probability:.2%}, score={candidate.score:.3f}, "
            f"color={color_status}, imprint={imprint_status}, "
            f"visual={visual_status}, "
            f"crop={candidate.crop_name}"
        )

    print(f"\nPrediction: {best.name} ({best.label})")
    print(f"Confidence: {best.probability:.2%}")
    print(f"Validation score: {best.score:.3f}")
    print(f"Crop used: {best.crop_name}")

    input_color, input_rgb = estimate_pill_color(best.crop_image)
    print(f"Input color estimate: {input_color} rgb={input_rgb}")
    if best.example_path and best.example_path.exists():
        train_color, train_rgb = estimate_pill_color(Image.open(best.example_path).convert("RGB"))
        print(f"Training color estimate: {train_color} rgb={train_rgb}")

    if pill_info:
        print(f"Company: {pill_info.get('company') or '-'}")
        imprints = expected_imprints(pill_info)
        if imprints:
            print(f"Expected imprint: {', '.join(imprints)}")
            imprint_score, best_ocr = best_imprint_similarity(detected_imprints, imprints)
            print(f"Best OCR imprint match: {best_ocr or '-'} score={imprint_score:.2f}")

    suspicious = best.probability < args.threshold or best.color_match is False or best.imprint_match is False
    if suspicious:
        print("Low reliability. Please retake the photo or use direct text search.")

    if not args.no_show:
        show_images(image_path, best.crop_image, best.example_path, best.name, best.probability, best.crop_name)

    if pill_info:
        print_pill_details_after_confirmation(pill_info, skip_confirm=args.no_confirm)


if __name__ == "__main__":
    main()
