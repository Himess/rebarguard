# syntax=docker/dockerfile:1.7
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_LINK_MODE=copy \
    HERMES_RUNTIME=cli \
    HERMES_CLI_VIA_WSL=false \
    HERMES_HOME=/data/hermes

# System deps: poppler for pdf2image, curl/ca-certs for Hermes Agent install,
# git for the Hermes installer which clones NousResearch/hermes-agent at build time.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates git poppler-utils libpq5 build-essential bash \
    && rm -rf /var/lib/apt/lists/*

# uv for fast deps
COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /usr/local/bin/uv

WORKDIR /app

# Python deps (cached layer)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# App
COPY src ./src

# Custom Hermes Agent skills (parse-structural-plan, inspect-rebar, moderate-inspection).
# Shipped inside the image at /opt/hermes-skills so deploys always carry the latest
# SKILL.md definitions. The entrypoint symlinks them under the runtime HERMES_HOME
# (= /data/hermes via the OAuth-persistence symlink) where `hermes chat -s <name>`
# looks for them.
COPY skills /opt/hermes-skills

# Hermes Agent CLI — subscription-backed model access.
#
# IMPORTANT: the install MUST go somewhere that the runtime entrypoint does NOT
# clobber. The entrypoint symlinks /root/.hermes to the Fly volume at /data/hermes
# so the OAuth token persists across deploys — but that symlink also shadows
# anything the installer put under /root/.hermes (default). Install to
# /opt/hermes-agent instead: the binary + venv survive container restarts, and
# the OAuth state (which hermes writes to $HOME/.hermes at run time) still lands
# on the volume via the entrypoint symlink.
#
# DO NOT append `|| true` here — a silent install failure leaves the runtime
# without a working CLI, which only surfaces as 500s on /api/quick and
# /api/inspections under live demo pressure.
RUN curl -fsSL https://hermes-agent.nousresearch.com/install.sh \
    | bash -s -- --skip-setup --dir /opt/hermes-agent \
    && ln -sf /opt/hermes-agent/venv/bin/hermes /usr/local/bin/hermes \
    && /usr/local/bin/hermes --version

# Entrypoint symlinks /root/.hermes -> /data/hermes (Fly volume) so the OAuth
# token persists across deploys. Symlink is created at run time because the
# volume is only mounted after the build.
COPY <<'EOF' /entrypoint.sh
#!/usr/bin/env bash
set -euo pipefail

# Mount OAuth state on the Fly volume so tokens survive redeploys.
mkdir -p /data/hermes
rm -rf /root/.hermes 2>/dev/null || true
ln -sf /data/hermes /root/.hermes

# Install our custom Hermes skills into the runtime HERMES_HOME. We symlink
# (rather than copy) so a fresh `fly deploy` always surfaces the latest SKILL.md
# from the shipped image, while OAuth state in /data/hermes stays intact.
if [ ! -L /root/.hermes/skills ]; then
  rm -rf /root/.hermes/skills 2>/dev/null || true
  ln -sf /opt/hermes-skills /root/.hermes/skills
fi

exec "$@"
EOF
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uv", "run", "uvicorn", "rebarguard.main:app", "--host", "0.0.0.0", "--port", "8000"]
