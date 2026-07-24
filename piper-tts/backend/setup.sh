#!/usr/bin/env bash
# Piper TTS backend setup — Linux x86_64
# Usage: bash setup.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODELS_DIR="$SCRIPT_DIR/../models"
mkdir -p "$MODELS_DIR"

# ── 1. Python dependencies ───────────────────────────────────────────────────
echo "[1/3] Installing Python dependencies..."
pip install -r "$SCRIPT_DIR/requirements.txt" --quiet

# ── 2. Piper binary ──────────────────────────────────────────────────────────
if [ ! -f "$SCRIPT_DIR/piper" ]; then
  echo "[2/3] Downloading Piper binary (Linux x86_64)..."
  PIPER_URL="https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz"
  curl -sL "$PIPER_URL" | tar -xz -C "$SCRIPT_DIR"
  # The archive extracts to piper/piper — move it up
  if [ -f "$SCRIPT_DIR/piper/piper" ]; then
    mv "$SCRIPT_DIR/piper/piper" "$SCRIPT_DIR/piper_bin"
    rm -rf "$SCRIPT_DIR/piper"
    mv "$SCRIPT_DIR/piper_bin" "$SCRIPT_DIR/piper"
  fi
  chmod +x "$SCRIPT_DIR/piper"
  echo "  Piper binary ready at: $SCRIPT_DIR/piper"
else
  echo "[2/3] Piper binary already present, skipping."
fi

# ── 3. German voice model ────────────────────────────────────────────────────
MODEL_FILE="$MODELS_DIR/de_DE-eva_k-medium.onnx"
CONFIG_FILE="$MODELS_DIR/de_DE-eva_k-medium.onnx.json"

if [ ! -f "$MODEL_FILE" ]; then
  echo "[3/3] Downloading German voice model (de_DE-eva_k-medium)..."
  BASE="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/de/de_DE/eva_k/medium"
  curl -sL --progress-bar "$BASE/de_DE-eva_k-medium.onnx"      -o "$MODEL_FILE"
  curl -sL --progress-bar "$BASE/de_DE-eva_k-medium.onnx.json" -o "$CONFIG_FILE"
  echo "  Model ready at: $MODEL_FILE"
else
  echo "[3/3] Model already present, skipping."
fi

echo ""
echo "Setup complete. Start the server with:"
echo "  cd piper-tts/backend && python app.py"
