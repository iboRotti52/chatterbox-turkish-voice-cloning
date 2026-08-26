#!/usr/bin/env python3
"""Chatterbox Multilingual V3 gecikme ve RAM ölçümü (M4 odaklı)."""

import argparse
import json
import os
import platform
import resource
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

import torch

from runtime import load_model, resolve_device


DEFAULT_TEXT = (
    "Merhaba, bugün biraz dışarı çıkıp yürüyüş yapmak istiyorum. "
    "Hava güzel görünüyor, umarım keyifli bir gün olur."
)


def timed(callable_):
    wall_start = time.perf_counter()
    cpu_start = time.process_time()
    value = callable_()
    return value, time.perf_counter() - wall_start, time.process_time() - cpu_start


def main() -> None:
    parser = argparse.ArgumentParser(description="Chatterbox V3 süre/RAM benchmark'ı")
    parser.add_argument("--reference", required=True, type=Path, help="Referans WAV dosyası")
    parser.add_argument("--text", default=DEFAULT_TEXT, help="Seslendirilecek Türkçe metin")
    parser.add_argument("--device", choices=("auto", "cpu", "mps", "cuda"), default="auto")
    parser.add_argument(
        "--threads",
        default="4,6,10",
        help="CPU için virgülle ayrılmış thread sayıları (varsayılan: 4,6,10)",
    )
    parser.add_argument("--seed", type=int, default=20260810)
    args = parser.parse_args()

    if not args.reference.is_file():
        parser.error(f"Referans ses bulunamadı: {args.reference}")
    try:
        device = resolve_device(args.device)
        thread_counts = [int(value) for value in args.threads.split(",") if value]
    except (RuntimeError, ValueError) as error:
        parser.error(str(error))
    if not thread_counts:
        parser.error("En az bir thread sayısı verilmelidir.")
    if device != "cpu":
        thread_counts = [torch.get_num_threads()]

    results = {
        "hardware": {
            "platform": platform.platform(),
            "processor": platform.processor() or "unknown",
            "logical_cores": os.cpu_count(),
            "device": device,
        }
    }

    model, load_wall, load_cpu = timed(lambda: load_model(device))
    results["model_load"] = {"wall_s": load_wall, "cpu_s": load_cpu}

    _, ref_wall, ref_cpu = timed(
        lambda: model.prepare_conditionals(str(args.reference), exaggeration=0.4)
    )
    results["reference_prepare"] = {"wall_s": ref_wall, "cpu_s": ref_cpu}

    generations = []
    for threads in thread_counts:
        if device == "cpu":
            torch.set_num_threads(threads)
        torch.manual_seed(args.seed)
        wav, wall_s, cpu_s = timed(
            lambda: model.generate(
                args.text,
                language_id="tr",
                exaggeration=0.4,
                cfg_weight=0.5,
                temperature=0.7,
            )
        )
        audio_s = wav.shape[-1] / model.sr
        generations.append(
            {
                "threads": threads,
                "wall_s": wall_s,
                "cpu_s": cpu_s,
                "audio_s": audio_s,
                "rtf": wall_s / audio_s,
                "process_cpu_multiple": cpu_s / wall_s,
            }
        )

    results["generations"] = generations
    peak_rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    divisor = 1024**3 if platform.system() == "Darwin" else 1024**2
    results["peak_rss_gib"] = peak_rss / divisor
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
