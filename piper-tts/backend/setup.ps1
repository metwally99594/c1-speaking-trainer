# Piper TTS backend setup — Windows x64
# Usage: .\setup.ps1
param()
$ErrorActionPreference = "Stop"

$BackendDir = $PSScriptRoot
$ModelsDir  = Join-Path $BackendDir "..\models"
New-Item -ItemType Directory -Force -Path $ModelsDir | Out-Null

# ── 1. Python dependencies ───────────────────────────────────────────────────
Write-Host "[1/3] Installing Python dependencies..."
pip install -r (Join-Path $BackendDir "requirements.txt") --quiet

# ── 2. Piper binary ──────────────────────────────────────────────────────────
$PiperExe = Join-Path $BackendDir "piper.exe"
if (-not (Test-Path $PiperExe)) {
    Write-Host "[2/3] Downloading Piper binary (Windows x64)..."
    $ZipPath = Join-Path $env:TEMP "piper_windows.zip"
    $PiperUrl = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip"
    Invoke-WebRequest -Uri $PiperUrl -OutFile $ZipPath
    Expand-Archive -Path $ZipPath -DestinationPath $BackendDir -Force
    Remove-Item $ZipPath
    # Archive extracts to piper\ folder — move piper.exe up
    $Nested = Join-Path $BackendDir "piper\piper.exe"
    if (Test-Path $Nested) {
        Move-Item $Nested $PiperExe -Force
        Remove-Item (Join-Path $BackendDir "piper") -Recurse -Force
    }
    Write-Host "  Piper binary ready at: $PiperExe"
} else {
    Write-Host "[2/3] Piper binary already present, skipping."
}

# ── 3. German voice model ────────────────────────────────────────────────────
$ModelFile  = Join-Path $ModelsDir "de_DE-eva_k-medium.onnx"
$ConfigFile = Join-Path $ModelsDir "de_DE-eva_k-medium.onnx.json"

if (-not (Test-Path $ModelFile)) {
    Write-Host "[3/3] Downloading German voice model (de_DE-eva_k-medium)..."
    $Base = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/de/de_DE/eva_k/medium"
    Invoke-WebRequest -Uri "$Base/de_DE-eva_k-medium.onnx"      -OutFile $ModelFile
    Invoke-WebRequest -Uri "$Base/de_DE-eva_k-medium.onnx.json" -OutFile $ConfigFile
    Write-Host "  Model ready at: $ModelFile"
} else {
    Write-Host "[3/3] Model already present, skipping."
}

Write-Host ""
Write-Host "Setup complete. Start the server with:"
Write-Host "  cd piper-tts\backend; python app.py"
