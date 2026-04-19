# syntax=docker/dockerfile:1.7
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_LINK_MODE=copy \
    HERMES_RUNTIME=cli \
    HERMES_CLI_VIA_WSL=false \
    HERMES_HOME=/data/hermes

# System deps: poppler for pdf2image, curl/ca-certs for Hermes Agent install
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates poppler-utils libpq5 build-essential bash \
    && rm -rf /var/lib/apt/lists/*

# uv for fast deps
COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /usr/local/bin/uv

WORKDIR /app

# Python deps (cached layer)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# App
COPY src ./src

# Hermes Agent CLI — subscription-backed model access
RUN curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash \
    && ln -sf /root/.local/bin/hermes /usr/local/bin/hermes || true

# Entrypoint symlinks /root/.hermes -> /data/hermes (Fly volume) so the OAuth
# token persists across deploys. Symlink is created at run time because the
# volume is only mounted after the build.
COPY <<'EOF' /entrypoint.sh
#!/usr/bin/env bash
set -euo pipefail
mkdir -p /data/hermes
rm -rf /root/.hermes 2>/dev/null || true
ln -sf /data/hermes /root/.hermes
exec "$@"
EOF
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uv", "run", "uvicorn", "rebarguard.main:app", "--host", "0.0.0.0", "--port", "8000"]
