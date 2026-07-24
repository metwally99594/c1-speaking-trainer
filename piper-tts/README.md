# Piper TTS Backend

Self-hosted German TTS server using [Piper](https://github.com/rhasspy/piper).
Runs as a FastAPI service that `api/tts.mjs` proxies when `VITE_PIPER_ENABLED=true`.

## Quick start

**Linux / macOS**
```bash
cd piper-tts/backend
bash setup.sh       # downloads Piper binary + German model (~60 MB, once)
python app.py       # starts on http://localhost:8000
```

**Windows**
```powershell
cd piper-tts\backend
.\setup.ps1
python app.py
```

Verify:
```bash
curl http://localhost:8000/health
# {"ok":true,"piper_found":true,"model_found":true,...}
```

Smoke-test synthesis:
```bash
curl -X POST http://localhost:8000/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Guten Tag, wie geht es Ihnen?"}' \
  --output test.wav && aplay test.wav
```

## Vercel wiring

Set these in **Vercel → Settings → Environment Variables**:

| Variable | Value |
|----------|-------|
| `PIPER_API_URL` | Public URL of this server (e.g. `https://piper.yourdomain.com`) |
| `PIPER_VOICE_MODEL` | `de_DE-eva_k-medium` (optional, server uses default if absent) |
| `VITE_PIPER_ENABLED` | `true` |

`api/tts.mjs` calls `PIPER_API_URL/tts` with `POST { text, voice }` and
returns the WAV binary to the browser.

## API reference

### `GET /health`
```json
{ "ok": true, "piper_found": true, "model_found": true, "model_path": "..." }
```

### `POST /tts`
**Request**
```json
{ "text": "Hallo Welt", "speed": 1.0 }
```
- `text` — plain German text (required, non-empty)
- `speed` — playback rate, 0.5–2.0 (default 1.0)

**Response** — `audio/wav` binary on 200, JSON `{ "detail": "..." }` on error.

## Deployment options

| Option | Notes |
|--------|-------|
| Local machine | Run `python app.py` during development |
| Railway / Fly.io | Push the `piper-tts/backend/` folder; Piper binary via setup.sh |
| Docker | Use `FROM python:3.12-slim`; copy binary + model in; run app.py |
| VPS (systemd) | Copy files, create service unit pointing to `python app.py` |

For production, put a reverse proxy (Nginx/Caddy) in front on port 443 with TLS.
