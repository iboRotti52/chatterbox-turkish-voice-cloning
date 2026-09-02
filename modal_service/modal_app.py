"""Modal GPU service for the Turkish Chatterbox Multilingual V3 demo."""

import logging
import os
import subprocess
import tempfile
from io import BytesIO
from pathlib import Path

import modal


APP_NAME = "chatterbox-turkish-demo"
UPSTREAM_COMMIT = "5de7a54aa4e5e2baadb0182dde554908b48b85c2"
CACHE_PATH = "/cache"
MAX_TEXT_LENGTH = 500
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
MIN_AUDIO_SECONDS = 3.0
MAX_AUDIO_SECONDS = 45.0
ALLOWED_SUFFIXES = {".wav", ".mp3", ".m4a", ".mp4", ".webm"}

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

model_cache = modal.Volume.from_name("chatterbox-turkish-model-cache", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git", "libsndfile1")
    .pip_install(
        f"chatterbox-tts @ git+https://github.com/resemble-ai/chatterbox.git@{UPSTREAM_COMMIT}",
        "fastapi[standard]==0.116.1",
        "python-multipart==0.0.20",
        "soundfile==0.13.1",
    )
    .env(
        {
            "HF_HOME": CACHE_PATH,
            "TORCH_HOME": f"{CACHE_PATH}/torch",
            "PKUSEG_HOME": f"{CACHE_PATH}/pkuseg",
        }
    )
)

app = modal.App(APP_NAME)


def _validate_text(value: object) -> str:
    text = str(value or "").strip()
    if not text:
        raise ValueError("Lütfen okunacak metni yazın.")
    if len(text) > MAX_TEXT_LENGTH:
        raise ValueError(f"Metin en fazla {MAX_TEXT_LENGTH} karakter olabilir.")
    return text


def _validate_upload(filename: str, payload: bytes) -> str:
    suffix = Path(filename or "reference.wav").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise ValueError("Bu ses biçimi desteklenmiyor. WAV, MP3, M4A veya WEBM kullanın.")
    if not payload:
        raise ValueError("Ses dosyası boş görünüyor.")
    if len(payload) > MAX_UPLOAD_BYTES:
        raise ValueError("Ses dosyası 15 MB'dan küçük olmalı.")
    return suffix


@app.cls(
    image=image,
    gpu="L4",
    cpu=4,
    memory=12288,
    volumes={CACHE_PATH: model_cache},
    min_containers=0,
    max_containers=2,
    scaledown_window=300,
    timeout=140,
    startup_timeout=900,
)
@modal.concurrent(max_inputs=1)
class TurkishVoiceService:
    @modal.enter()
    def load_model(self):
        import torch
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS

        if not torch.cuda.is_available():
            raise RuntimeError("CUDA is required for this deployment.")

        logger.info("Loading Chatterbox Multilingual V3 on CUDA")
        self.model = ChatterboxMultilingualTTS.from_pretrained(
            device="cuda",
            t3_model="v3",
        )
        model_cache.commit()
        logger.info("Model is ready")

    @modal.asgi_app(requires_proxy_auth=True)
    def web(self):
        import soundfile as sf
        from fastapi import FastAPI, HTTPException, Request
        from fastapi.responses import JSONResponse, Response

        web_app = FastAPI(
            title="Ses Atölyesi TTS API",
            version="1.0.0",
            docs_url=None,
            redoc_url=None,
            openapi_url=None,
        )

        @web_app.exception_handler(HTTPException)
        async def http_error(_request, error):
            return JSONResponse(
                status_code=error.status_code,
                content={"error": str(error.detail)},
                headers={"Cache-Control": "no-store"},
            )

        @web_app.get("/health")
        def health():
            return {
                "status": "ok",
                "model": "chatterbox-multilingual-v3",
                "language": "tr",
                "gpu": "L4",
            }

        @web_app.post("/tts")
        async def synthesize(request: Request):
            form = await request.form()

            try:
                text = _validate_text(form.get("text"))
            except ValueError as error:
                raise HTTPException(status_code=400, detail=str(error)) from error

            if str(form.get("consent", "")).lower() != "true":
                raise HTTPException(
                    status_code=400,
                    detail="Sesi kullanma izniniz olduğunu onaylamalısınız.",
                )

            upload = form.get("reference")
            if upload is None or not hasattr(upload, "read"):
                raise HTTPException(status_code=400, detail="Lütfen bir referans ses yükleyin.")

            payload = await upload.read(MAX_UPLOAD_BYTES + 1)
            try:
                suffix = _validate_upload(getattr(upload, "filename", ""), payload)
            except ValueError as error:
                raise HTTPException(status_code=400, detail=str(error)) from error

            with tempfile.TemporaryDirectory(prefix="tts-") as temp_dir:
                source_path = os.path.join(temp_dir, f"source{suffix}")
                reference_path = os.path.join(temp_dir, "reference.wav")
                Path(source_path).write_bytes(payload)

                try:
                    subprocess.run(
                        [
                            "ffmpeg",
                            "-hide_banner",
                            "-loglevel",
                            "error",
                            "-nostdin",
                            "-y",
                            "-i",
                            source_path,
                            "-ac",
                            "1",
                            "-ar",
                            "24000",
                            "-c:a",
                            "pcm_s16le",
                            reference_path,
                        ],
                        check=True,
                        capture_output=True,
                        timeout=25,
                    )
                    duration = sf.info(reference_path).duration
                except (subprocess.CalledProcessError, subprocess.TimeoutExpired, RuntimeError) as error:
                    raise HTTPException(
                        status_code=400,
                        detail="Ses dosyası okunamadı. Geçerli bir kayıt yükleyin.",
                    ) from error

                if duration < MIN_AUDIO_SECONDS or duration > MAX_AUDIO_SECONDS:
                    raise HTTPException(
                        status_code=400,
                        detail="Referans ses 3–45 saniye arasında olmalı.",
                    )

                try:
                    generated = self.model.generate(
                        text,
                        language_id="tr",
                        audio_prompt_path=reference_path,
                        exaggeration=0.4,
                        cfg_weight=0.5,
                        temperature=0.7,
                    )
                    wav = generated.squeeze().detach().cpu().numpy()
                    output = BytesIO()
                    sf.write(output, wav, self.model.sr, format="WAV", subtype="PCM_16")
                except Exception as error:
                    logger.exception("TTS generation failed")
                    raise HTTPException(
                        status_code=500,
                        detail="Ses şu anda oluşturulamadı. Lütfen tekrar deneyin.",
                    ) from error

            return Response(
                content=output.getvalue(),
                media_type="audio/wav",
                headers={
                    "Cache-Control": "no-store",
                    "Content-Disposition": 'attachment; filename="ses-atolyesi.wav"',
                    "X-Content-Type-Options": "nosniff",
                },
            )

        return web_app
