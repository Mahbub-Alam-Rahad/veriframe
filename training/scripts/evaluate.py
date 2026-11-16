#!/usr/bin/env python3
"""Evaluate a saved image-classification model on a labelled test set.

Outputs overall metrics, per-class precision/recall/F1, a confusion matrix and
simple probability calibration bins. Intended for offline comparison before
promoting a model to the running service.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
from datasets import load_dataset
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from transformers import AutoImageProcessor, AutoModelForImageClassification


def calibration_bins(probs: np.ndarray, labels: np.ndarray, n_bins: int = 10):
    edges = np.linspace(0.0, 1.0, n_bins + 1)
    bins = []
    for i in range(n_bins):
        lo, hi = edges[i], edges[i + 1]
        mask = (probs >= lo) & (probs < hi if i < n_bins - 1 else probs <= hi)
        if not mask.any():
            bins.append({"bin": [float(lo), float(hi)], "count": 0})
            continue
        bins.append({
            "bin": [float(lo), float(hi)],
            "count": int(mask.sum()),
            "avg_confidence": float(probs[mask].mean()),
            "avg_accuracy": float(labels[mask].mean()),
        })
    return bins


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-dir", required=True, help="Saved model/checkpoint directory")
    parser.add_argument("--test-dir", required=True, help="Class-folder test dataset")
    parser.add_argument("--report", help="Path to write JSON report")
    parser.add_argument("--fake-label", default="fake", help="Name of the positive/fake class")
    parser.add_argument("--bins", type=int, default=10)
    args = parser.parse_args()

    ds = load_dataset("imagefolder", data_dir=args.test_dir, split="train")
    names = ds.features["label"].names
    if args.fake_label not in names:
        raise SystemExit(f"fake label '{args.fake_label}' not in dataset labels {names}")
    fake_idx = names.index(args.fake_label)

    processor = AutoImageProcessor.from_pretrained(args.model_dir)
    model = AutoModelForImageClassification.from_pretrained(args.model_dir)
    model.eval()

    y_true, y_pred, y_prob = [], [], []
    for row in ds:
        inputs = processor(row["image"].convert("RGB"), return_tensors="pt")
        with torch.no_grad():
            logits = model(**inputs).logits[0]
        probs = torch.softmax(logits, dim=-1).numpy()
        pred = int(np.argmax(probs))
        y_true.append(int(row["label"]))
        y_pred.append(pred)
        y_prob.append(float(probs[fake_idx]))

    y_true_arr = np.array(y_true)
    y_pred_arr = np.array(y_pred)
    y_prob_arr = np.array(y_prob)
    binary_true = (y_true_arr == fake_idx).astype(int)

    report = {
        "model_dir": args.model_dir,
        "samples": len(y_true),
        "labels": names,
        "fake_label_index": fake_idx,
        "accuracy": float(accuracy_score(y_true_arr, y_pred_arr)),
        "confusion_matrix": confusion_matrix(y_true_arr, y_pred_arr).tolist(),
        "classification_report": classification_report(
            y_true_arr, y_pred_arr, target_names=names, output_dict=True, zero_division=0
        ),
        "calibration": calibration_bins(y_prob_arr, binary_true, n_bins=args.bins),
    }
    if len(np.unique(binary_true)) == 2:
        report["roc_auc_fake_vs_rest"] = float(roc_auc_score(binary_true, y_prob_arr))

    print(json.dumps({k: v for k, v in report.items() if k != "calibration"}, indent=2))
    if args.report:
        out = Path(args.report)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"wrote report to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
