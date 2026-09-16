# Multi-stage build for @ar/service. Build from the REPO ROOT (bun
# workspaces — the lockfile lives at the umbrella root):
#
#   docker build -f packages/service/Dockerfile -t ar-service .
#
# One container: the runtime stage also carries the built web app from
# the `web` stage and serves it at `/app` (AR_WEB_DIST).

# ---------------------------------------------------------------------------
# Stage 1 — install dependencies (cached when the manifests are unchanged).
# Only the service workspace is installed here; the ui/web workspaces are
# installed and built in the separate `web` stage, and only their built
# `packages/web/dist` reaches the runtime image.
# ---------------------------------------------------------------------------
FROM oven/bun:1-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
# All workspace manifests must be present for frozen-lockfile validation,
# even though only @ar/service gets installed.
COPY packages/service/package.json ./packages/service/
COPY packages/ui/package.json ./packages/ui/
COPY packages/web/package.json ./packages/web/
RUN bun install --frozen-lockfile --filter '@ar/service'

# ---------------------------------------------------------------------------
# Stage 2 — type-check the source.
# ---------------------------------------------------------------------------
FROM deps AS build
WORKDIR /app

COPY tsconfig.base.json ./
COPY packages/service/tsconfig.json ./packages/service/
COPY packages/service/lib ./packages/service/lib
COPY packages/service/src ./packages/service/src

# src/ carries colocated *.test.ts files that import from tests/ (the
# in-memory fakes under tests/helpers, the parity fixtures under
# tests/parity), so the whole tree comes along and the type-check
# covers it. tests/seed imports scripts/seed*.ts, so scripts/ comes too.
# Both live only in this stage: runtime copies neither.
COPY packages/service/scripts ./packages/service/scripts
COPY packages/service/tests ./packages/service/tests

WORKDIR /app/packages/service
RUN bun run check-types

# ---------------------------------------------------------------------------
# Stage 3 — build the web app. Its OWN stage, so it reads nothing any
# other stage wrote and removing it is a deletion: no other stage reads
# packages/ui or packages/web. @ar/web resolves @ar/ui through
# `workspace:*` against @ar/ui's built dist/, so @ar/ui builds first.
# The API is same-origin (empty URL) and the app is served under /app/.
# ---------------------------------------------------------------------------
FROM oven/bun:1-alpine AS web
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/service/package.json ./packages/service/
COPY packages/ui/package.json ./packages/ui/
COPY packages/web/package.json ./packages/web/
RUN bun install --frozen-lockfile --filter '@ar/ui' --filter '@ar/web'

COPY tsconfig.base.json ./
COPY packages/ui/tsconfig.json packages/ui/vite.config.ts ./packages/ui/
COPY packages/ui/src ./packages/ui/src
WORKDIR /app/packages/ui
RUN bun run build

WORKDIR /app
COPY packages/web/tsconfig.json packages/web/vite.config.ts packages/web/index.html ./packages/web/
COPY packages/web/src ./packages/web/src
WORKDIR /app/packages/web
RUN VITE_AR_API_URL='' VITE_AR_BASE_PATH=/app/ bun run build

# ---------------------------------------------------------------------------
# Stage 4 — runtime image with only production node_modules + source.
# ---------------------------------------------------------------------------
FROM oven/bun:1-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package.json bun.lock ./
COPY packages/service/package.json ./packages/service/
COPY packages/ui/package.json ./packages/ui/
COPY packages/web/package.json ./packages/web/
RUN bun install --frozen-lockfile --production --filter '@ar/service'

COPY --from=build /app/packages/service/lib ./packages/service/lib
COPY --from=build /app/packages/service/src ./packages/service/src
COPY packages/service/drizzle ./packages/service/drizzle
COPY packages/service/drizzle.config.ts ./packages/service/
COPY --from=web /app/packages/web/dist ./packages/web/dist

# Presence-toggled in src/config.ts: set, src/index.ts serves the build
# at /app. Absolute, so it does not depend on the WORKDIR below.
ENV AR_WEB_DIST=/app/packages/web/dist

EXPOSE 3000

WORKDIR /app/packages/service
CMD ["bun", "run", "start"]
