#!/usr/bin/env python3
"""Fine-tune an image-classification deepfake detector (offline).

Expects class-folder datasets (e.g. real/, fake/). The script is a thin wrapper
around Hugging Face Transformers so it stays easy to audit and modify.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from datasets import load_dataset
from transformers import (
    AutoImageProcessor,
    AutoModelForImageClassification,
    Trainer,
    TrainingArguments,
    set_seed,
)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--train-dir", required=True)
    p.add_argument("--val-dir", required=True)
    p.add_argument("--base-model", default="dima806/deepfake_vs_real_image_detection")
    p.add_argument("--output-dir", required=True)
    p.add_argument("--epochs", type=float, default=3)
    p.add_argument("--batch-size", type=int, default=16)
    p.add_argument("--lr", type=float, default=5e-5)
    p.add_argument("--weight-decay", type=float, default=0.01)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--fp16", action="store_true")
    p.add_argument("--mlflow", action="store_true", help="Log to MLFLOW_TRACKING_URI if set")
    return p


def main() -> int:
    args = build_parser().parse_args()
    set_seed(args.seed)

    dataset = load_dataset("imagefolder", data_files={
        "train": f"{args.train_dir}/**",
        "validation": f"{args.val_dir}/**",
    })
    labels = dataset["train"].features["label"].names
    label2id = {name: i for i, name in enumerate(labels)}
    id2label = {i: name for name, i in label2id.items()}

    processor = AutoImageProcessor.from_pretrained(args.base_model)

    def transform(batch):
        images = [img.convert("RGB") for img in batch["image"]]
        inputs = processor(images, return_tensors="pt")
        inputs["labels"] = batch["label"]
        return inputs

    dataset = dataset.with_transform(transform)

    model = AutoModelForImageClassification.from_pretrained(
        args.base_model,
        num_labels=len(labels),
        id2label=id2label,
        label2id=label2id,
        ignore_mismatched_sizes=True,
    )

    def compute_metrics(eval_pred):
        logits, y_true = eval_pred
        y_pred = np.argmax(logits, axis=-1)
        acc = float((y_pred == y_true).mean())
        return {"accuracy": acc}

    report_to = ["none"]
    if args.mlflow:
        report_to = ["mlflow"]

    training_args = TrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        learning_rate=args.lr,
        weight_decay=args.weight_decay,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        logging_steps=25,
        fp16=args.fp16,
        remove_unused_columns=False,
        report_to=report_to,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset["train"],
        eval_dataset=dataset["validation"],
        compute_metrics=compute_metrics,
    )
    trainer.train()
    trainer.save_model(args.output_dir)
    processor.save_pretrained(args.output_dir)

    # Persist label mapping explicitly for deployment.
    (Path(args.output_dir) / "labels.txt").write_text(
        "\n".join(f"{i}:{name}" for i, name in id2label.items()) + "\n", encoding="utf-8"
    )
    print(f"saved model to {args.output_dir} (labels: {id2label})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
