# Piper Voice Models

Model files are not committed to git (they can exceed 60 MB).

Run the setup script to download the German model automatically:

```bash
# Linux / macOS
bash ../backend/setup.sh

# Windows
..\backend\setup.ps1
```

The setup script downloads:

| File | Size | Description |
|------|------|-------------|
| `de_DE-eva_k-medium.onnx` | ~60 MB | German female voice (Eva) |
| `de_DE-eva_k-medium.onnx.json` | <1 KB | Voice config |

## Alternative German voices

Set `PIPER_MODEL` to any of these after downloading manually from
<https://huggingface.co/rhasspy/piper-voices/tree/v1.0.0/de>:

| Model name | Quality | Speaker |
|------------|---------|---------|
| `de_DE-eva_k-medium` | medium | Female (Eva) |
| `de_DE-thorsten-high` | high | Male (Thorsten) |
| `de_DE-kerstin-low` | low | Female, fastest |
