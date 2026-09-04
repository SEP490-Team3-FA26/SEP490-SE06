"""Fine-tune VietOCR (Stage A: line-level text recognition) on prescription
line crops. Wraps vietocr's own `Trainer`, which handles the training loop,
checkpointing, and validation internally — this script's job is just to
translate our config.yaml + line-crop annotation into vietocr's expected Cfg
object and to write run metadata (config snapshot + metrics.jsonl) into
training/checkpoints/{run_id}/, per the plan's "file-based experiment
tracking" approach (no MLflow/W&B for solo local work).

Prerequisite: run build_line_crops.py first to produce a line-crop directory
+ annotation.txt (VietOCR's expected `image_path\\tlabel_text` format).

Usage:
    python scripts/train_stage_a.py --config configs/stage_a_ocr.yaml \\
        --line-crops-dir ../data/synthetic/line_crops
"""

import argparse
import json
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path

import yaml
from vietocr.model.trainer import Trainer
from vietocr.tool.config import Cfg


def make_run_id() -> str:
    return datetime.now(timezone.utc).strftime("run_%Y%m%d_%H%M%S")


def split_annotation(annotation_path: Path, val_split: float, seed: int) -> tuple[Path, Path]:
    """VietOCR wants separate train/valid annotation files. Deterministically
    split annotation.txt (from build_line_crops.py) so re-runs are
    reproducible for a given seed.
    """
    import random
    import unicodedata

    lines = [unicodedata.normalize("NFC", l) for l in annotation_path.read_text(encoding="utf-8").splitlines() if l.strip()]
    rng = random.Random(seed)
    rng.shuffle(lines)

    n_val = max(1, int(len(lines) * val_split))
    val_lines = lines[:n_val]
    train_lines = lines[n_val:]

    train_path = annotation_path.parent / "train_annotation.txt"
    val_path = annotation_path.parent / "val_annotation.txt"
    train_path.write_text("\n".join(train_lines) + "\n", encoding="utf-8")
    val_path.write_text("\n".join(val_lines) + "\n", encoding="utf-8")

    print(f"Split {len(lines)} lines: {len(train_lines)} train / {len(val_lines)} val")
    return train_path, val_path


def build_vietocr_config(stage_a_cfg: dict, line_crops_dir: Path, run_dir: Path) -> Cfg:
    base_checkpoint = stage_a_cfg["model"]["base_checkpoint"]
    config = Cfg.load_config_from_name(base_checkpoint)

    annotation_path = line_crops_dir / "annotation.txt"
    if not annotation_path.exists():
        raise FileNotFoundError(
            f"{annotation_path} not found — run build_line_crops.py first."
        )
    train_annotation, val_annotation = split_annotation(
        annotation_path,
        val_split=stage_a_cfg["data"]["val_split"],
        seed=stage_a_cfg["data"]["seed"],
    )

    config["dataset"]["data_root"] = str(line_crops_dir)
    config["dataset"]["train_annotation"] = train_annotation.name
    config["dataset"]["valid_annotation"] = val_annotation.name
    config["dataset"]["name"] = "prescription_stage_a"

    config["trainer"]["batch_size"] = stage_a_cfg["train"]["batch_size"]
    config["trainer"]["iters"] = stage_a_cfg["train"]["num_iters"]
    config["trainer"]["print_every"] = stage_a_cfg["train"]["print_every"]
    config["trainer"]["valid_every"] = stage_a_cfg["train"]["checkpoint_every"]
    config["trainer"]["checkpoint"] = str(run_dir / "checkpoint.pth")
    config["trainer"]["export"] = str(run_dir / "weights.pth")
    config["trainer"]["log"] = str(run_dir / "train.log")
    config["trainer"]["metrics"] = None  # evaluate full val set, not a subset

    config["optimizer"]["max_lr"] = stage_a_cfg["train"]["learning_rate"]

    config["device"] = _detect_device()
    config["predictor"]["beamsearch"] = False  # greedy decode is faster for frequent validation

    # Windows PyTorch multi-worker processes spawn separate CUDA contexts which exhaust pagefile
    if "dataloader" not in config:
        config["dataloader"] = {}
    config["dataloader"]["num_workers"] = 0

    return config


def _detect_device() -> str:
    import torch

    if torch.cuda.is_available():
        return "cuda:0"
    print("WARNING: no CUDA GPU detected — training will run on CPU and be very slow. "
          "Expected on a machine without the RTX 3050 / GTX 1650 Ti this pipeline targets.")
    return "cpu"


class MetricsLogger:
    """Minimal file-based experiment tracking per the plan doc: no MLflow/W&B
    for solo local work, just a metrics.jsonl a human (or later a script) can
    read back.
    """

    def __init__(self, run_dir: Path):
        self.path = run_dir / "metrics.jsonl"

    def log(self, **kwargs):
        kwargs["timestamp"] = datetime.now(timezone.utc).isoformat()
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(json.dumps(kwargs, ensure_ascii=False) + "\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=str, default="configs/stage_a_ocr.yaml")
    parser.add_argument(
        "--line-crops-dir",
        type=str,
        default="../data/synthetic/line_crops",
        help="Output of build_line_crops.py",
    )
    parser.add_argument("--run-id", type=str, default=None)
    args = parser.parse_args()

    training_root = Path(__file__).resolve().parents[1]
    config_path = (training_root / args.config).resolve() if not Path(args.config).is_absolute() else Path(args.config)
    line_crops_dir = (training_root / args.line_crops_dir).resolve() if not Path(args.line_crops_dir).is_absolute() else Path(args.line_crops_dir)

    with open(config_path, encoding="utf-8") as f:
        stage_a_cfg = yaml.safe_load(f)

    run_id = args.run_id or make_run_id()
    run_dir = (training_root / "checkpoints" / run_id).resolve()
    run_dir.mkdir(parents=True, exist_ok=True)

    # Snapshot the exact config used, so a checkpoint can always be traced
    # back to how it was produced (plan doc: dataset/model versioning).
    shutil.copy(config_path, run_dir / "stage_a_ocr.yaml")

    vietocr_config = build_vietocr_config(stage_a_cfg, line_crops_dir, run_dir)
    metrics = MetricsLogger(run_dir)

    print(f"Run ID: {run_id}")
    print(f"Checkpoint dir: {run_dir}")
    print(f"Device: {vietocr_config['device']}")

    trainer = Trainer(vietocr_config, pretrained=True)

    start = time.time()
    trainer.train()
    elapsed = time.time() - start

    metrics.log(event="training_complete", elapsed_sec=round(elapsed, 1), run_id=run_id)
    print(f"Training complete in {elapsed:.1f}s. Weights: {vietocr_config['trainer']['export']}")
    print(f"Next: python scripts/eval_stage_a.py --checkpoint {run_dir}")


if __name__ == "__main__":
    main()
