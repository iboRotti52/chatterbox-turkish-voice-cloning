"""Komut satırı araçlarının paylaştığı çalışma zamanı yardımcıları."""

from __future__ import annotations

import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent

# Yerel kurulum betiği upstream kaynağını bu klasöre klonlar. Klasör yoksa
# Python normal site-packages kurulumuna devam eder.
SOURCE_DIR = ROOT / "chatterbox-source" / "src"
if SOURCE_DIR.is_dir():
    sys.path.insert(0, str(SOURCE_DIR))

os.environ.setdefault("HF_HOME", str(ROOT / "hf-cache"))
os.environ.setdefault("TORCH_HOME", str(ROOT / "torch-cache"))
os.environ.setdefault("PKUSEG_HOME", str(ROOT / "pkuseg-cache"))
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")


def resolve_device(requested: str) -> str:
    """`auto` seçimini CUDA > MPS > CPU sırasıyla çözer ve doğrular."""
    import torch

    if requested == "auto":
        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    if requested == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA istendi ancak bu PyTorch ortamında kullanılamıyor.")
    if requested == "mps" and not torch.backends.mps.is_available():
        raise RuntimeError("MPS istendi ancak bu PyTorch/macOS ortamında kullanılamıyor.")
    return requested


def load_model(device: str):
    """Multilingual V3 modelini seçilen aygıta yükler."""
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    return ChatterboxMultilingualTTS.from_pretrained(
        device=device,
        t3_model="v3",
    )
