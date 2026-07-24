"""
Piper TTS FastAPI server.

POST /tts  { text: str, voice?: str, speed?: float } → audio/wav
GET  /health → { ok, piper_found, model_found, model_path }

Env vars:
  PIPER_PATH        Path to piper binary  (default: ./piper or ./piper.exe)
  PIPER_MODEL       Path to .onnx model   (default: ./models/de_DE-eva_k-medium.onnx)
  PIPER_SPEED       Default speed (0.75–1.5, default: 1.0)
  PORT              Server port           (default: 8000)
  ALLOWED_ORIGINS   Comma-separated CORS origins (default: http://localhost:5173)
"""

import os
import subprocess
import sys
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

_IS_WINDOWS = sys.platform.startswith("win")
_DEFAULT_BINARY = "piper.exe" if _IS_WINDOWS else "./piper"

PIPER_PATH = Path(os.environ.get("PIPER_PATH", _DEFAULT_BINARY))
MODEL_PATH = Path(os.environ.get("PIPER_MODEL", "models/de_DE-eva_k-medium.onnx"))
DEFAULT_SPEED = float(os.environ.get("PIPER_SPEED", "1.0"))
PORT = int(os.environ.get("PORT", "8000"))

_raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="Piper TTS", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

class TTSRequest(BaseModel):
    text: str
    voice: str | None = None   # ignored for now; future multi-voice support
    speed: float = Field(default=1.0, ge=0.5, le=2.0)

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("text must not be empty")
        return v.strip()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health() -> dict:
    piper_found = PIPER_PATH.exists() or _which(str(PIPER_PATH))
    model_found = MODEL_PATH.exists()
    return {
        "ok": piper_found and model_found,
        "piper_found": piper_found,
        "model_found": model_found,
        "model_path": str(MODEL_PATH.resolve()),
    }


@app.post("/tts")
def tts(req: TTSRequest) -> Response:
    if not MODEL_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Model not found at {MODEL_PATH}. Run setup.sh to download it.",
        )

    # length_scale = 1 / speed  (Piper convention: >1 = slower, <1 = faster)
    effective_speed = req.speed if req.speed != 0 else DEFAULT_SPEED
    length_scale = str(round(1.0 / effective_speed, 3))

    tmp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = Path(tmp.name)

        cmd = [
            str(PIPER_PATH),
            "--model", str(MODEL_PATH),
            "--output-file", str(tmp_path),
            "--length-scale", length_scale,
            "--sentence-silence", "0.2",
        ]

        result = subprocess.run(
            cmd,
            input=req.text.encode("utf-8"),
            capture_output=True,
            timeout=30,
        )

        if result.returncode != 0:
            err = result.stderr.decode("utf-8", errors="replace")[:300]
            raise HTTPException(status_code=502, detail=f"Piper error: {err}")

        audio_bytes = tmp_path.read_bytes()

    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail=f"Piper binary not found at '{PIPER_PATH}'. Run setup.sh.",
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Piper synthesis timed out (30 s)")
    finally:
        if tmp_path and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)

    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={"Cache-Control": "no-store"},
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _which(name: str) -> bool:
    """Return True if name is found on PATH."""
    import shutil
    return shutil.which(name) is not None


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=PORT, reload=False)
