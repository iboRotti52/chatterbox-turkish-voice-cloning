#!/usr/bin/env python3
"""Aynı Türkçe metni farklı doğallık ayarlarıyla karşılaştırır."""

import argparse
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parent
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

import soundfile as sf
import torch

from runtime import load_model, resolve_device


DEFAULT_TEXT = (
    "Merhaba, bugün biraz dışarı çıkıp yürüyüş yapmak istiyorum. "
    "Hava güzel görünüyor, umarım keyifli bir gün olur."
)

VARIANTS = {
    "a-dengeli": {"exaggeration": 0.4, "cfg_weight": 0.4, "temperature": 0.7},
    "b-sakin": {"exaggeration": 0.3, "cfg_weight": 0.35, "temperature": 0.65},
    "c-sese-bagli": {"exaggeration": 0.4, "cfg_weight": 0.5, "temperature": 0.7},
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Üç Türkçe ses üretim profilini karşılaştır")
    parser.add_argument("--reference", required=True, type=Path, help="Referans WAV dosyası")
    parser.add_argument("--text", default=DEFAULT_TEXT, help="Seslendirilecek Türkçe metin")
    parser.add_argument("--output-dir", type=Path, default=ROOT.parent / "outputs")
    parser.add_argument("--device", choices=("auto", "cpu", "mps", "cuda"), default="auto")
    parser.add_argument("--seed", type=int, default=20260810)
    args = parser.parse_args()

    if not args.reference.is_file():
        parser.error(f"Referans ses bulunamadı: {args.reference}")
    try:
        device = resolve_device(args.device)
    except RuntimeError as error:
        parser.error(str(error))

    args.output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Chatterbox Multilingual V3 yükleniyor (device={device})…", flush=True)
    model = load_model(device)

    for name, settings in VARIANTS.items():
        torch.manual_seed(args.seed)
        print(f"{name} üretiliyor: {settings}", flush=True)
        wav = model.generate(
            args.text,
            language_id="tr",
            audio_prompt_path=str(args.reference),
            **settings,
        )
        output = args.output_dir / f"variant-{name}.wav"
        sf.write(output, wav.squeeze().detach().cpu().numpy(), model.sr)
        print(f"Hazır: {output}", flush=True)


if __name__ == "__main__":
    main()
