FROM python:3.12-slim

WORKDIR /app

# System tools for downloading Piper
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Piper binary + its bundled shared libs (espeak-ng, onnxruntime)
# The archive must stay together — piper loads libs from its own directory.
RUN curl -fsSL \
    "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz" \
    | tar -xz -C /opt \
    && chmod +x /opt/piper/piper

# German voice model (~60 MB, baked into image for zero cold-start download)
RUN mkdir -p /app/models \
    && BASE="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/de/de_DE/eva_k/medium" \
    && curl -fsSL "$BASE/de_DE-eva_k-medium.onnx"      -o /app/models/de_DE-eva_k-medium.onnx \
    && curl -fsSL "$BASE/de_DE-eva_k-medium.onnx.json" -o /app/models/de_DE-eva_k-medium.onnx.json

COPY app.py .

ENV PIPER_PATH=/opt/piper/piper
ENV PIPER_MODEL=/app/models/de_DE-eva_k-medium.onnx
ENV PORT=8000

EXPOSE 8000

CMD ["python", "app.py"]
