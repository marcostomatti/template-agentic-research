# Multi-stage build for @ar/service. Build from the REPO ROOT (bun
# workspaces — the lockfile lives at the umbrella root):
#
#   docker build -f packages/service/Dockerfile -t ar-service .

# ---------------------------------------------------------------------------
# Stage 1 — install dependencies (cached when the manifests are unchanged).
# Only the service workspace is installed; the ui/web packages never enter
# the image.
# ---------------------------------------------------------------------------
FROM oven/bun:1-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/service/package.json ./packages/service/
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

# tests/ is not part of the image; its include globs simply match nothing.
WORKDIR /app/packages/service
RUN bun run check-types

# ---------------------------------------------------------------------------
# Stage 3 — runtime image with only production node_modules + source.
# ---------------------------------------------------------------------------
FROM oven/bun:1-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package.json bun.lock ./
COPY packages/service/package.json ./packages/service/
RUN bun install --frozen-lockfile --production --filter '@ar/service'

COPY --from=build /app/packages/service/lib ./packages/service/lib
COPY --from=build /app/packages/service/src ./packages/service/src
COPY packages/service/drizzle ./packages/service/drizzle
COPY packages/service/drizzle.config.ts ./packages/service/

EXPOSE 3000

WORKDIR /app/packages/service
CMD ["bun", "run", "start"]
