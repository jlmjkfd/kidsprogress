# Deploying KidsProgress v2 on Synology DS216+II

Target: a Synology DS216+II (Intel Atom CE5335, 1 GB RAM, DSM 7.2+). The plan assumes Container Manager is available on the unit — if not, see §6 for the non-Docker fallback.

## 1. One-time NAS preparation

1. **DSM packages**
   - Install **Container Manager** from Package Center (Docker engine).
   - Install **Hyper Backup** (for nightly snapshots of the data volume).
   - Enable **Web Station** only if you want DSM to serve the SPA bundle directly; otherwise the Node container will serve the static files itself.

2. **Volume layout**
   ```
   /volume1/docker/kidsprogress/
   ├── compose/
   │   ├── docker-compose.yml             # copy of repo's docker/docker-compose.yml
   │   └── docker-compose.synology.yml    # copy of repo's docker/docker-compose.synology.yml
   ├── data/                              # bind-mounted to /data inside container
   │   ├── kidsprogress.sqlite            # created on first run
   │   └── uploads/                       # created on first run
   └── .env                               # secrets, NOT committed
   ```

3. **DSM Reverse Proxy** (Control Panel → Login Portal → Advanced → Reverse Proxy)
   - Source: `https://kidsprogress.yourdomain.com:443`
   - Destination: `http://localhost:8000`
   - Enable HTTP/2.

4. **Let's Encrypt** (Control Panel → Security → Certificate)
   - Add certificate → Let's Encrypt → for `kidsprogress.yourdomain.com`. Auto-renew.

## 2. Secrets file (`/volume1/docker/kidsprogress/.env`)

```bash
# Required.
JWT_SECRET=<long-random-string-from-`openssl rand -hex 32`>
GEMINI_API_KEY=<your Gemini key>

# Public origin(s) — comma-separated.
CORS_ORIGINS=https://kidsprogress.yourdomain.com

# Optional. Defaults shown.
GEMINI_MODEL=gemini-1.5-flash
GEMINI_DAILY_TOKENS_PER_CHILD=5000
LOG_LEVEL=info
```

`chmod 600 /volume1/docker/kidsprogress/.env` so only owner can read it.

## 3. Build the image (developer machine, push to ghcr.io)

```bash
# In the repo root, after a clean checkout:
docker build -f docker/Dockerfile -t ghcr.io/<your-org>/kidsprogress:latest .
docker push ghcr.io/<your-org>/kidsprogress:latest
```

Image target size: ≤120 MB.

## 4. First-time deploy on the NAS

```bash
ssh you@<nas>
cd /volume1/docker/kidsprogress/compose

# Pull the built image
docker pull ghcr.io/<your-org>/kidsprogress:latest

# Start it (compose loads ../.env automatically when --env-file is given)
docker compose --env-file ../.env -f docker-compose.yml -f docker-compose.synology.yml up -d

# Watch logs
docker logs -f kidsprogress-api-1
```

The container runs migrations on every start (idempotent), so the SQLite file is created and brought to the current schema automatically.

## 5. Updates (zero-downtime is overkill at this scale — accept ~30 s blip)

```bash
docker pull ghcr.io/<your-org>/kidsprogress:latest
docker compose --env-file ../.env -f docker-compose.yml -f docker-compose.synology.yml up -d
docker image prune -f
```

## 6. No-Docker fallback (DS216+II is borderline-supported)

If Container Manager isn't available on your unit:

1. Install **Node.js v22** via Package Center (community packages, e.g. SynoCommunity's Node.js) — or use Entware.
2. Deploy the repo to `/volume1/homes/<you>/kidsprogress` and run:
   ```bash
   pnpm install --prod
   pnpm db:migrate
   PORT=8000 JWT_SECRET=... node apps/api/dist/main.js
   ```
3. Use **DSM Task Scheduler** with `Triggered Task` on `Boot-up` to launch the same `node …` command, redirected to a log file. Pair with a tiny watchdog cron that restarts on exit.

## 7. Backups

- **SQLite file**: `Hyper Backup` set to back up `/volume1/docker/kidsprogress/data/` nightly. SQLite WAL mode + APFS-style snapshots play well together. Verify restore once.
- **Uploads**: same `data/` folder includes uploads — backed up together.
- **Secrets** (`.env`): keep an encrypted copy in 1Password / Bitwarden — do NOT back up to the same offsite as the data.

## 8. Health check

```bash
curl https://kidsprogress.yourdomain.com/health
# {"status":"ok","uptime":42,"version":"2.0.0-alpha.0","db":"ok","timestamp":"..."}
```

If `db` reports `down`, check the data volume mount and SQLite file permissions.

## 9. Resource budget on a 1 GB unit

Expected resident memory after warm-up:
- Node 22 + Fastify: ~50–80 MB
- better-sqlite3 in-process: ~5 MB
- pino + dependencies: ~10 MB
- **Total app footprint: ~100 MB** of a ~500 MB headroom after DSM.

If you're closing on the limit:
- Drop `LOG_LEVEL=info` to `warn`.
- Set `pino` redaction to a smaller list (we ship a generic one).
- Disable the Synology Media Server / Indexer if not used — those eat ~200 MB on this hardware.
