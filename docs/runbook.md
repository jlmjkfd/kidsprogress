# KidsProgress v2 Runbook

Operator-facing recipes for the running app. Pair with `docs/deployment-synology.md` for first-time deploy steps.

## Rotate the Gemini API key

1. Generate a new key in Google AI Studio.
2. Edit `/volume1/docker/kidsprogress/.env` and replace `GEMINI_API_KEY`.
3. `docker compose --env-file ../.env -f docker-compose.yml -f docker-compose.synology.yml up -d` to restart.
4. Confirm `/health` is `200 ok`.
5. Revoke the old key in Google AI Studio.

## Rotate `JWT_SECRET`

Rotating `JWT_SECRET` invalidates every issued access token + refresh token. Users must log in again.

1. Generate: `openssl rand -hex 32`.
2. Edit `.env`, replace `JWT_SECRET`, restart the container.
3. Communicate to users that they need to log in again.

For graceful rotation (no forced logout), implement key-id'd JWTs (`kid` claim) — not in scope for v2.0.

## Restore from backup

1. Stop the container: `docker compose stop`.
2. From Hyper Backup, restore `/volume1/docker/kidsprogress/data/` to the same path.
3. `docker compose up -d`. The app's migration step is idempotent and reads the restored DB as-is.
4. Test: `curl /health`, log in, list children, list tasks.

## Inspect the audit log

```bash
docker exec -it kidsprogress-api-1 sh
# Inside container:
sqlite3 /data/kidsprogress.sqlite "select occurred_at, event, outcome, actor_email, ip_address from audit_logs order by occurred_at desc limit 50;"
```

## Common queries (read-only, run on a copy)

Always work on a copy: `cp /volume1/docker/kidsprogress/data/kidsprogress.sqlite /tmp/snapshot.sqlite` then query that.

```bash
# All login failures in the last 24h
sqlite3 /tmp/snapshot.sqlite "select occurred_at, actor_email, ip_address, meta from audit_logs where event='auth.login' and outcome='failure' and occurred_at >= datetime('now','-1 day');"

# Active refresh tokens per user
sqlite3 /tmp/snapshot.sqlite "select user_id, count(*) from refresh_tokens where revoked_at is null group by user_id order by 2 desc;"

# Today's Gemini token usage per child
sqlite3 /tmp/snapshot.sqlite "select target_child_id, sum(json_extract(meta,'$.tokens')) from audit_logs where event='auth.llm_call' and occurred_at >= date('now') group by target_child_id;"
```

## Force-logout a single user

```bash
docker exec -it kidsprogress-api-1 sh
sqlite3 /data/kidsprogress.sqlite "update refresh_tokens set revoked_at = datetime('now') where user_id = '<uuid>' and revoked_at is null;"
```

Next time the user's web client tries to refresh, it'll receive 401 and bounce to `/login`.

## Revoke a child device

Use the parent UI → Children → Devices → Revoke. Or, from the DB:

```bash
sqlite3 /data/kidsprogress.sqlite "update devices set revoked_at = datetime('now') where id = '<device-uuid>';"
```

## Container won't start: "Invalid environment configuration"

The app is strict about env vars (audit fix #1: no fallback secrets). The error message lists missing/invalid fields. Common causes:

- `JWT_SECRET` not set or under 16 chars.
- `CORS_ORIGINS` empty.
- `SQLITE_PATH` points at a directory the container user can't write.

Fix `.env`, restart.

## Reset a forgotten parent password

We don't have a password-reset flow yet. Temporary procedure:

1. Generate an argon2id hash for a known password with a small script (or use any argon2 CLI).
2. `sqlite3 /data/kidsprogress.sqlite "update users set password_hash = '<hash>' where email = '<email>';"`
3. Force-logout the user (above). They can log in with the new password.

Password-reset email flow is on the roadmap for v2.1.

## Verify backups

Every quarter:

1. Copy the latest Hyper Backup snapshot to a side directory.
2. Spin up a throwaway container pointing at it.
3. `curl /health` and exercise login + list APIs.
4. Confirm the data matches the previous month's known state.

If anything fails, fix backups before you need them.
