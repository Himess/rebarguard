# RebarGuard — Deploy guide

Two services:

1. **Frontend** — Next.js 16 on **Vercel** (static/ISR + server actions)
2. **Backend** — FastAPI + Hermes Agent CLI on **Fly.io** (Docker, persistent volume for OAuth token)

Target cost: **$0** (Vercel Hobby + Fly.io free allowance + Nous Portal subscription).

---

## 1. Frontend — Vercel

### One-time

```bash
# From repo root
vercel login
vercel link --cwd frontend    # pick "rebarguard" scope, "rebarguard" project
```

### Environment

In the Vercel project dashboard → Settings → Environment Variables, add:

| Key                       | Value                                   | Scope                      |
|---------------------------|-----------------------------------------|----------------------------|
| `NEXT_PUBLIC_BACKEND_URL` | `https://rebarguard-api.fly.dev`        | Production + Preview       |
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:8000`                 | Development (optional)     |

### Deploy

Auto-deploys on every push to `main` via the GitHub integration. Manual:

```bash
vercel --prod --cwd frontend
```

`frontend/vercel.json` pins the framework to Next.js, region to `fra1` (Frankfurt, closest to Istanbul users), and sets security headers.

---

## 2. Backend — Fly.io

### One-time

```bash
# From backend/
fly launch --no-deploy --copy-config    # keeps the checked-in fly.toml
fly volumes create hermes_data --size 1 --region fra   # persistent OAuth token
fly secrets set APP_CORS_ORIGINS=https://rebarguard.vercel.app,https://rebarguard.app
```

### Deploy

```bash
fly deploy
```

The Dockerfile installs:

- Python 3.11 + `uv` + project deps (via `uv.lock`)
- `poppler-utils` for `pdf2image` (PlanParser agent)
- Hermes Agent CLI (`curl -fsSL hermes-agent.nousresearch.com/install.sh | bash`)

### First-time OAuth (run once after first deploy)

Hermes Agent uses an OAuth device flow that can't run at build time — complete it inside the running container:

```bash
fly ssh console
hermes auth add nous --type oauth --no-browser
# Copy the printed URL + code, open on your laptop, approve.
# Token persists to /data/hermes (mounted from the hermes_data volume),
# survives container restarts and redeploys.
exit
```

Verify:

```bash
curl https://rebarguard-api.fly.dev/health
# {"status":"ok","service":"rebarguard","version":"0.1.0"}
```

### Environment (pre-set in `fly.toml`)

- `HERMES_RUNTIME=cli` — routes all LLM calls through the `hermes` CLI subprocess, billed against the Nous Portal subscription (not direct API tier).
- `HERMES_CLI_VIA_WSL=false` — we're already in Linux, no WSL hop.
- `HERMES_HOME=/data/hermes` — volume-backed OAuth token.
- `VISION_BACKEND=nous_portal` — Kimi K2.6 vision via subscription.

Override via `fly secrets set KEY=value` for anything sensitive.

---

## 3. Demo data

The backend ships with a demo seeder (`POST /api/demo/fistik`) that injects the
1340 Ada 43 Parsel project into the in-memory store. Two ways to reach it:

- `/demo` page → "Seed Fıstık into Dashboard" button
- `/dashboard` page → "Seed Fıstık demo" button in the header

For a full demo run, call the seeder once per cold start (the store is in-memory).

---

## 4. Cold-start note

`fly.toml` has `auto_stop_machines = "suspend"` and `min_machines_running = 0` —
the backend spins down when idle and restarts on the first request (~2-3 s suspend
resume). For the hackathon demo video, warm it with a `curl /health` before recording.

---

## 4b. Hermes cron jobs (optional, opt-in)

Two scheduled jobs are registered by `scripts/install-cron.sh`:

- `rebarguard-daily-audit` — 03:00 UTC daily, Hermes 4 70B summarises the past 24 h of `audit-log.jsonl`
- `rebarguard-weekly-afad-probe` — 02:00 UTC Sunday, cross-references AFAD seismic feed against seeded parcels

The Fly machine auto-suspends when traffic is idle, so the cron gateway that fires these
jobs cannot run continuously by default. Two options:

- **Manual fire** (recommended for the hackathon): `fly ssh console -a rebarguard-api`,
  then `hermes cron run rebarguard-daily-audit`. The job runs once on demand. Used in the
  demo video.
- **Always-on gateway**: flip `min_machines_running = 1` in `fly.toml`, redeploy, and
  start the gateway via `bash scripts/start-cron-gateway.sh`. Burns Fly free-tier
  always-on minutes — track the budget if you go this route.

## 5. Post-deploy smoke tests

```bash
# Backend alive
curl https://rebarguard-api.fly.dev/health

# Seed + read back
curl -X POST https://rebarguard-api.fly.dev/api/demo/fistik
curl https://rebarguard-api.fly.dev/api/projects

# Regulation lookup
curl https://rebarguard-api.fly.dev/api/regulations/TBDY%207.3.4.2

# Frontend routes
curl -I https://rebarguard.vercel.app/
curl -I https://rebarguard.vercel.app/demo
curl -I https://rebarguard.vercel.app/dashboard
```
