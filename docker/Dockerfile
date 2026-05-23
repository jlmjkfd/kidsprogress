# syntax=docker/dockerfile:1.7

# ---------- Stage 1: install deps (cached as long as lockfile is stable) ----------
FROM node:22-alpine AS deps
WORKDIR /repo
RUN apk add --no-cache python3 make g++ \
  && corepack enable && corepack prepare pnpm@9.1.2 --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
RUN --mount=type=cache,id=pnpm,target=/pnpm-store \
    pnpm config set store-dir /pnpm-store \
    && pnpm install --frozen-lockfile

# ---------- Stage 2: build everything ----------
FROM deps AS build
COPY . .
RUN pnpm -r run build

# ---------- Stage 3: prod runtime (tiny) ----------
FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache tini \
  && addgroup -S app && adduser -S -G app app \
  && corepack enable && corepack prepare pnpm@9.1.2 --activate

COPY --from=build /repo/package.json /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/apps/api/package.json ./apps/api/
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/web/dist ./apps/web/dist
COPY --from=build /repo/packages/shared/package.json ./packages/shared/
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/packages/db/package.json ./packages/db/
COPY --from=build /repo/packages/db/dist ./packages/db/dist

RUN pnpm install --prod --frozen-lockfile=false --ignore-scripts || pnpm install --prod

# Data + uploads live on a mounted volume on the NAS
RUN mkdir -p /data/uploads && chown -R app:app /data

ENV NODE_ENV=production \
    PORT=8000 \
    SQLITE_PATH=/data/kidsprogress.sqlite \
    UPLOADS_PATH=/data/uploads

USER app
VOLUME ["/data"]
EXPOSE 8000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/dist/main.js"]
