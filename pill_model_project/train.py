from __future__ import annotations

import argparse
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader, WeightedRandomSampler, random_split
from tqdm import tqdm

from dataset import PillImageDataset, scan_csv_dataset, scan_imagefolder
from utils import (
    create_model,
    get_device,
    get_transforms,
    load_checkpoint,
    safe_collate,
    save_checkpoint,
    seed_everything,
)


DEFAULT_DATA_DIR = "H:\\내 드라이브\\pill_project\\data_100_per_pill_matched"


def parse_args():
    parser = argparse.ArgumentParser(description="Train a pill image classifier.")
    parser.add_argument("--data_dir", default=DEFAULT_DATA_DIR)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--model_name", default="efficientnet_b0", choices=["efficientnet_b0", "resnet18"])
    parser.add_argument("--val_ratio", type=float, default=0.2)
    parser.add_argument("--num_workers", type=int, default=0, help="Use 0 on Windows for fewer multiprocessing issues.")
    parser.add_argument("--checkpoint_dir", default="checkpoints")
    parser.add_argument("--csv", action="store_true", help="Use labels.csv instead of ImageFolder folders.")
    parser.add_argument("--fresh", action="store_true", help="Ignore existing checkpoint and train from scratch.")
    parser.add_argument(
        "--feedback_weight",
        type=float,
        default=25.0,
        help="Sample user_success/user_failed images this many times more often during training.",
    )
    return parser.parse_args()


def is_feedback_sample(sample: tuple[Path, int]) -> bool:
    return sample[0].name.startswith(("user_failed_", "user_success_"))


def build_weighted_sampler(samples: list[tuple[Path, int]], feedback_weight: float) -> WeightedRandomSampler | None:
    if feedback_weight <= 1:
        return None

    weights = [feedback_weight if is_feedback_sample(sample) else 1.0 for sample in samples]
    if all(weight == 1.0 for weight in weights):
        return None

    return WeightedRandomSampler(weights=weights, num_samples=len(weights), replacement=True)


def run_epoch(model, loader, criterion, device, optimizer=None):
    is_train = optimizer is not None
    model.train() if is_train else model.eval()

    total_loss = 0.0
    total_correct = 0
    total_count = 0

    with torch.set_grad_enabled(is_train):
        for batch in tqdm(loader, leave=False):
            if batch is None:
                continue

            images, labels, _ = batch
            images = images.to(device)
            labels = labels.to(device)

            outputs = model(images)
            loss = criterion(outputs, labels)

            if is_train:
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

            preds = outputs.argmax(dim=1)
            total_loss += loss.item() * images.size(0)
            total_correct += (preds == labels).sum().item()
            total_count += images.size(0)

    if total_count == 0:
        return 0.0, 0.0

    return total_loss / total_count, total_correct / total_count


def main():
    args = parse_args()
    seed_everything()

    data_dir = Path(args.data_dir)
    checkpoint_dir = Path(args.checkpoint_dir)
    checkpoint_path = checkpoint_dir / "checkpoint.pth"
    final_model_path = checkpoint_dir / "final_model.pth"

    if args.csv:
        samples, class_names = scan_csv_dataset(data_dir)
    else:
        samples, class_names = scan_imagefolder(data_dir)

    train_transform, val_transform = get_transforms()

    feedback_samples = [sample for sample in samples if is_feedback_sample(sample)]
    base_samples = [sample for sample in samples if not is_feedback_sample(sample)]

    val_size = max(1, int(len(base_samples) * args.val_ratio))
    train_size = len(base_samples) - val_size
    train_subset, val_subset = random_split(
        base_samples,
        [train_size, val_size],
        generator=torch.Generator().manual_seed(42),
    )

    train_samples = list(train_subset) + feedback_samples
    val_samples = list(val_subset)

    train_dataset = PillImageDataset(train_samples, transform=train_transform)
    val_dataset = PillImageDataset(list(val_subset), transform=val_transform)
    train_sampler = build_weighted_sampler(train_samples, args.feedback_weight)

    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=train_sampler is None,
        sampler=train_sampler,
        num_workers=args.num_workers,
        collate_fn=safe_collate,
        pin_memory=torch.cuda.is_available(),
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        collate_fn=safe_collate,
        pin_memory=torch.cuda.is_available(),
    )

    device = get_device()
    print(f"Device: {device}")
    print(f"Classes: {len(class_names)}")
    print(f"Train samples: {len(train_dataset)}, Val samples: {len(val_dataset)}")
    print(f"Feedback train samples: {len(feedback_samples)}, feedback_weight={args.feedback_weight}")

    model = create_model(args.model_name, num_classes=len(class_names), pretrained=True).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr)

    start_epoch = 1
    best_val_acc = 0.0

    if checkpoint_path.exists() and not args.fresh:
        checkpoint = load_checkpoint(checkpoint_path, model, optimizer)
        start_epoch = int(checkpoint["epoch"]) + 1
        best_val_acc = float(checkpoint.get("best_val_acc", 0.0))
        saved_classes = checkpoint.get("class_names", [])
        if saved_classes and saved_classes != class_names:
            raise ValueError("Checkpoint class_names do not match current dataset.")
        print(f"Resuming from epoch {start_epoch}. Best val acc: {best_val_acc:.4f}")
    elif args.fresh:
        print("Fresh training requested. Existing checkpoint will be ignored.")

    for epoch in range(start_epoch, args.epochs + 1):
        print(f"\nEpoch {epoch}/{args.epochs}")
        train_loss, train_acc = run_epoch(model, train_loader, criterion, device, optimizer)
        val_loss, val_acc = run_epoch(model, val_loader, criterion, device)

        print(
            f"epoch={epoch} "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.4f}"
        )

        save_checkpoint(
            checkpoint_path,
            model,
            optimizer,
            epoch,
            class_names,
            args.model_name,
            best_val_acc,
        )

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            save_checkpoint(
                final_model_path,
                model,
                optimizer,
                epoch,
                class_names,
                args.model_name,
                best_val_acc,
            )
            print(f"Saved new best model: {final_model_path} val_acc={best_val_acc:.4f}")


if __name__ == "__main__":
    main()
