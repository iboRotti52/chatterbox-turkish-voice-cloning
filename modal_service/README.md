# Modal TTS servisi

Bu klasör, web demosunun GPU çıkarım katmanıdır. Chatterbox Multilingual V3'ü
L4 üzerinde yükler ve Proxy Token korumalı `/tts` endpoint'i sunar.

## Dağıtım

```bash
python3.11 -m venv .venv-modal
.venv-modal/bin/pip install -r modal_service/requirements.txt
.venv-modal/bin/modal setup
.venv-modal/bin/modal deploy modal_service/modal_app.py
```

Dağıtımdan dönen URL'nin sonuna `/tts` ekleyip web uygulamasında
`MODAL_TTS_URL` olarak ayarlayın. Modal Proxy Token kimliğini
`MODAL_PROXY_TOKEN_ID`, sırrını `MODAL_PROXY_TOKEN_SECRET` adıyla yalnızca web
sunucusuna verin.
