#!/usr/bin/env python3
"""Chatterbox Multilingual V3 ile Türkçe ses üretir."""

import argparse
from pathlib import Path

import soundfile as sf

from runtime import load_model, resolve_device


def main() -> None:
    parser = argparse.ArgumentParser(description="Türkçe Chatterbox V3 ses üretimi")
    parser.add_argument("--text", required=True, help="Seslendirilecek Türkçe metin")
    parser.add_argument("--output", required=True, type=Path, help="Çıkış WAV dosyası")
    parser.add_argument("--reference", type=Path, help="Kendi sesinizden referans kayıt")
    parser.add_argument(
        "--device",
        choices=("auto", "cpu", "mps", "cuda"),
        default="auto",
        help="Çalıştırma aygıtı (varsayılan: auto)",
    )
    parser.add_argument("--exaggeration", type=float, default=0.4)
    parser.add_argument("--cfg-weight", type=float, default=0.5)
    parser.add_argument("--temperature", type=float, default=0.7)
    args = parser.parse_args()

    if args.reference and not args.reference.is_file():
        parser.error(f"Referans ses bulunamadı: {args.reference}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    try:
        device = resolve_device(args.device)
    except RuntimeError as error:
        parser.error(str(error))

    print(f"Chatterbox Multilingual V3 yükleniyor (device={device})…", flush=True)
    model = load_model(device)

    print("Türkçe ses üretiliyor…", flush=True)
    wav = model.generate(
        args.text,
        language_id="tr",
        audio_prompt_path=str(args.reference) if args.reference else None,
        exaggeration=args.exaggeration,
        cfg_weight=args.cfg_weight,
        temperature=args.temperature,
    )
    sf.write(args.output, wav.squeeze().detach().cpu().numpy(), model.sr)
    print(f"Hazır: {args.output}", flush=True)


if __name__ == "__main__":
    main()
