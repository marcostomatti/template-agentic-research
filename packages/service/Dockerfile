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

# tests/ stays out of the image, but src/ carries colocated *.test.ts
# files importing the shared in-memory fakes, so tests/helpers has to
# come along for the type-check to resolve them. The rest of tests/ is
# absent and its include glob simply matches nothing.
COPY packages/service/tests/helpers ./packages/service/tests/helpers

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
COPY packages/ui/package.json ./packages/ui/
COPY packages/web/package.json ./packages/web/
RUN bun install --frozen-lockfile --production --filter '@ar/service'

COPY --from=build /app/packages/service/lib ./packages/service/lib
COPY --from=build /app/packages/service/src ./packages/service/src
COPY packages/service/drizzle ./packages/service/drizzle
COPY packages/service/drizzle.config.ts ./packages/service/

EXPOSE 3000

WORKDIR /app/packages/service
CMD ["bun", "run", "start"]
