from __future__ import annotations

import random
from pathlib import Path

import torch
from torch import nn
from torchvision import models, transforms


def get_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def seed_everything(seed: int = 42) -> None:
    random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


def safe_collate(batch):
    """Drop samples that failed image loading."""
    batch = [item for item in batch if item is not None]
    if not batch:
        return None

    images, labels, paths = zip(*batch)
    return torch.stack(images), torch.tensor(labels, dtype=torch.long), list(paths)


def get_transforms(image_size: int = 224):
    train_transform = transforms.Compose(
        [
            transforms.RandomResizedCrop(
                image_size,
                scale=(0.45, 1.0),
                ratio=(0.75, 1.33),
            ),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomVerticalFlip(p=0.2),
            transforms.RandomRotation(degrees=35),
            transforms.RandomPerspective(distortion_scale=0.25, p=0.35),
            transforms.RandomAffine(
                degrees=0,
                translate=(0.12, 0.12),
                scale=(0.75, 1.25),
                shear=(-8, 8, -8, 8),
            ),
            transforms.ColorJitter(brightness=0.35, contrast=0.35, saturation=0.25, hue=0.03),
            transforms.RandomAutocontrast(p=0.25),
            transforms.RandomAdjustSharpness(sharpness_factor=1.8, p=0.35),
            transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 1.2)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            transforms.RandomErasing(p=0.2, scale=(0.02, 0.12), ratio=(0.3, 3.3)),
        ]
    )

    eval_transform = transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    return train_transform, eval_transform


def create_model(model_name: str, num_classes: int, pretrained: bool = True) -> nn.Module:
    """Create a small pretrained classifier."""
    name = model_name.lower()

    if name == "efficientnet_b0":
        weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
        model = models.efficientnet_b0(weights=weights)
        in_features = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(in_features, num_classes)
        return model

    if name == "resnet18":
        weights = models.ResNet18_Weights.DEFAULT if pretrained else None
        model = models.resnet18(weights=weights)
        in_features = model.fc.in_features
        model.fc = nn.Linear(in_features, num_classes)
        return model

    raise ValueError("model_name must be one of: efficientnet_b0, resnet18")


def save_checkpoint(
    path: str | Path,
    model: nn.Module,
    optimizer: torch.optim.Optimizer,
    epoch: int,
    class_names: list[str],
    model_name: str,
    best_val_acc: float,
) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "class_names": class_names,
            "model_name": model_name,
            "best_val_acc": best_val_acc,
        },
        path,
    )


def load_checkpoint(path: str | Path, model: nn.Module, optimizer: torch.optim.Optimizer | None = None):
    checkpoint = torch.load(path, map_location="cpu")
    model.load_state_dict(checkpoint["model_state_dict"])
    if optimizer is not None and "optimizer_state_dict" in checkpoint:
        optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
    return checkpoint


def find_example_image(data_dir: str | Path, label: str) -> Path | None:
    root = Path(data_dir)
    class_dir = root / "images" / label
    if not class_dir.exists():
        class_dir = root / label
    if not class_dir.exists():
        return None
    for ext in ("*.jpg", "*.jpeg", "*.png"):
        found = sorted(class_dir.glob(ext))
        if found:
            return found[0]
    return None
