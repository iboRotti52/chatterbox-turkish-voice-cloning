#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="$PROJECT_ROOT/chatterbox-v3"
VENV_DIR="$WORK_DIR/.venv"
SOURCE_DIR="$WORK_DIR/chatterbox-source"
UPSTREAM_URL="https://github.com/resemble-ai/chatterbox.git"
UPSTREAM_COMMIT="5de7a54aa4e5e2baadb0182dde554908b48b85c2"
PYTHON_BIN="${PYTHON_BIN:-python3.11}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "Hata: Python 3.11 bulunamadı. Önce Python 3.11 kurun." >&2
  exit 1
fi

mkdir -p "$WORK_DIR/inputs" "$PROJECT_ROOT/outputs"

if [[ ! -d "$SOURCE_DIR/.git" ]]; then
  git clone "$UPSTREAM_URL" "$SOURCE_DIR"
  git -C "$SOURCE_DIR" checkout --detach "$UPSTREAM_COMMIT"
else
  CURRENT_COMMIT="$(git -C "$SOURCE_DIR" rev-parse HEAD)"
  if [[ "$CURRENT_COMMIT" != "$UPSTREAM_COMMIT" ]]; then
    echo "Hata: $SOURCE_DIR farklı bir commit içeriyor: $CURRENT_COMMIT" >&2
    echo "Kişisel değişiklikleri korumak için klasöre otomatik müdahale edilmedi." >&2
    exit 1
  fi
fi

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/python" -m pip install --editable "$SOURCE_DIR"

echo
echo "Kurulum tamamlandı. Yardımı görüntülemek için:"
echo "$VENV_DIR/bin/python $WORK_DIR/generate_tr.py --help"
