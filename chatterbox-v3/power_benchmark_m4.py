#!/usr/bin/env python3
"""macOS pil telemetrisiyle yaklaşık toplam/ek sistem gücü ölçümü."""

import argparse
import json
import os
import re
import subprocess
import threading
import time
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

import torch

from runtime import load_model


DEFAULT_TEXT = (
    "Merhaba, bugün biraz dışarı çıkıp yürüyüş yapmak istiyorum. "
    "Hava güzel görünüyor, umarım keyifli bir gün olur."
)

phase = "idle"
stop_sampling = False
samples = []


def read_system_power_watts():
    raw = subprocess.check_output(
        ["ioreg", "-rn", "AppleSmartBattery", "-l"],
        text=True,
        stderr=subprocess.DEVNULL,
    )
    match = re.search(r'"SystemLoad"=(\d+)', raw)
    return int(match.group(1)) / 1000 if match else None


def sampler():
    while not stop_sampling:
        watts = read_system_power_watts()
        if watts is not None:
            samples.append({"phase": phase, "watts": watts, "time": time.time()})
        time.sleep(0.5)


def run_phase(name, callable_):
    global phase
    phase = name
    start = time.perf_counter()
    value = callable_()
    return value, time.perf_counter() - start


def main():
    global phase, stop_sampling
    parser = argparse.ArgumentParser(description="Apple Silicon güç/süre benchmark'ı")
    parser.add_argument("--reference", required=True, type=Path, help="Referans WAV dosyası")
    parser.add_argument("--text", default=DEFAULT_TEXT, help="Seslendirilecek Türkçe metin")
    parser.add_argument("--idle-seconds", type=float, default=5.0)
    parser.add_argument("--threads", type=int, default=4)
    parser.add_argument("--seed", type=int, default=20260810)
    args = parser.parse_args()
    if not args.reference.is_file():
        parser.error(f"Referans ses bulunamadı: {args.reference}")

    thread = threading.Thread(target=sampler, daemon=True)
    thread.start()

    phase = "idle"
    time.sleep(args.idle_seconds)

    model, load_s = run_phase(
        "model_load",
        lambda: load_model("cpu"),
    )
    _, reference_s = run_phase(
        "reference_prepare",
        lambda: model.prepare_conditionals(str(args.reference), exaggeration=0.4),
    )

    torch.set_num_threads(args.threads)
    torch.manual_seed(args.seed)
    wav, generation_s = run_phase(
        "generation",
        lambda: model.generate(
            args.text,
            language_id="tr",
            exaggeration=0.4,
            cfg_weight=0.5,
            temperature=0.7,
        ),
    )

    stop_sampling = True
    thread.join(timeout=2)

    grouped = defaultdict(list)
    for sample in samples:
        grouped[sample["phase"]].append(sample["watts"])
    averages = {
        key: {
            "samples": len(values),
            "avg_system_w": sum(values) / len(values),
            "min_system_w": min(values),
            "max_system_w": max(values),
        }
        for key, values in grouped.items()
    }

    idle_w = averages["idle"]["avg_system_w"]
    generation_w = averages["generation"]["avg_system_w"]
    extra_w = max(0.0, generation_w - idle_w)
    result = {
        "timing_s": {
            "model_load": load_s,
            "reference_prepare": reference_s,
            "generation": generation_s,
            "audio": wav.shape[-1] / model.sr,
        },
        "power": averages,
        "estimated_chatterbox_extra_w": extra_w,
        "estimated_generation_extra_wh": extra_w * generation_s / 3600,
        "note": "SystemLoad is whole-system battery telemetry; extra power is generation minus idle baseline.",
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
