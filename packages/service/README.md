# template-service-express

An Express + MCP service template for small, mostly ad-hoc projects: a
dependency-injected service core with health/control endpoints, Drizzle +
Postgres by default, optional Redis, an interval cron runner, a
preference-aware notification layer with channel stubs, a first-party
credential strategy behind token-wired auth middleware, an isolated-vs-live
testing harness, and an agent task loop (`ralph`) with the skills/agents
context to drive it.

## Overview & origins

Most of this stack was extracted from **Open Tomato** (a private project by
the same author) — an agentic platform for development, and probably research
in the near future. There, each concern runs as its own micro service; this
template collapses that stack into one repo for quick projects where
everything is mostly ad-hoc. Properly production-bound services should
consider the single-purpose-service shape instead — this template's `lib/` is
the same framework code, so graduating later is mechanical.

## Quickstart

```bash
bun install
cp .env.example .env
bun run db:start        # dev Postgres via docker compose
bun run db:migrate
bun run dev             # http://localhost:3000/health
```

```bash
bun run test            # isolated suite — no db, no network, no credentials
bun run lint
bun run check-types
```

## Entry points (API and/or MCP)

The template ships two entry points sharing the modules under `src/`:

| Entry | Command | What it serves |
| --- | --- | --- |
| `src/index.ts` | `bun run start` / `bun run dev` | the Express API (`createService`) |
| `src/mcp/index.ts` | `bun run start:mcp` | the MCP server (`createMCP`; stdio or HTTP via `MCP_TRANSPORT`) |

Two ways to combine them:

- **Option 1 — single process, path-based.** Run only `createService` and
  mount your MCP surface under a route (e.g. `<host>/api/*` for API routes,
  `<host>/mcp` for MCP-over-HTTP). The business logic is shared either by
  wrapping the API handlers as tools or exposing the handlers directly.
  Simple to run and maintain; good for a small local stack. The MCP SDK's
  streamable-HTTP transport can attach to an Express route — see
  `lib/mcp/transport.ts` for the transport wiring to adapt.
- **Option 2 — one stack, two services (the wired default).** `createService`
  and `createMCP` run as two processes on their own ports; they run
  independently, and deployed unmodified they share an instance exposing two
  ports. Tools live in `src/mcp/tools/` (see `echo.ts` for the 4-export
  convention).

## What's wired

- **Postgres (default)** — `src/db/` exposes a typed Drizzle client as a
  managed dependency (eager connection probe on start, pool drain on stop).
  Migrations: `bun run db:generate` / `bun run db:migrate`. See
  `docs/drizzle.md` and the `drizzle-orm` skill.
- **Redis (off by default)** — `src/redis/`; registered only when
  `REDIS_URL` is set (`docker compose --profile redis up -d` for a local
  instance). Off by default because it tends to be the most expensive and
  least used piece.
- **Cron** — `src/cron/`: interval jobs with overlap suppression and
  contained errors, managed through the same dependency lifecycle (visible
  under `/_control/dependencies`). The starter `heartbeat` job is a
  placeholder to replace.
- **Notifications** — `src/notifications/`: emit one event with per-channel
  payloads; `dispatch` checks the recipient's preferences and calls each
  enabled channel module. `email`/`push` are stubs (validate + log — the seam
  for future modules); `webhook` is the real reference implementation.
- **Auth** — presence-toggled on `AUTH_BASIC_USER` + `AUTH_BASIC_PASSWORD`.
  Both set: `src/auth/` upserts that operator credential (argon2id) from a
  managed dependency ordered behind Postgres, mounts `/auth`
  (`login`/`logout`/`introspect`), and `requireAuth`/`optionalAuth` verify
  bearer tokens in-process against this service's own session table — no
  loopback HTTP hop per request, while `POST /auth/introspect` is served
  anyway for a sibling service pointing its own `AUTH_INTROSPECT_URL` here
  (gated on `AUTH_INTROSPECT_SECRET`): two introspection paths that never
  meet. `bun run db:migrate` is the precondition for a first boot — against
  an unmigrated database the boot aborts on the `auth-bootstrap` dependency
  rather than at the first login. With the basic pair unset,
  `AUTH_INTROSPECT_URL`/`AUTH_INTROSPECT_SECRET` point the middleware at
  somebody else's RFC 7662 endpoint instead; with neither pair set both are
  no-op passthroughs. Configured either way, they fail closed.
- **Operator control plane** — with `control` configured, `/_control` exposes
  status/pause/resume/restart behind a shared token, and `stop` as well when
  `control.allowStop` opts in (see `lib/express/control/`; hardening notes
  in AGENTS.md — "Operator control plane").

## Testing: isolated vs live

The distinction is structural, not advisory — a past incident (tests run
against real infrastructure with real credentials) cost a month of tokens in
under an hour.

- **`bun run test` is fully isolated.** No database, no network, no
  credentials. It is what CI runs on every PR.
- **`bun run test:live` is explicit.** `tests/live/*.live.test.ts` self-skip
  unless `AR_LIVE_DATABASE_URL` is set; the script sets it to the
  `postgres-live` compose service (`--profile stress`): a separate instance
  on port 5433, database `ar_live`, **no volume**. The suite runs the
  real migrations, truncates between cases, and its destructive helpers
  refuse any database that isn't `ar_live` — a fat-fingered URL that
  still connects cannot touch dev data.

```bash
bun run stress:start && bun run test:live && bun run stress:stop
```

## The agent loop (ralph)

Ralph is hoisted to the umbrella root (`tools/ralph/`); run the commands below from the repo root.

```bash
bun run ralph plan  --spec=.specs/my-feature.md         # spec → .plans/PLAN-my-feature.md (+ PREREQUISITES-…)
bun run ralph start --plan=.plans/PLAN-my-feature.md    # execute task-by-task; resumes blocked tasks
bun run ralph start --plan=.plans/PLAN-my-feature.md --start-at=23:00   # queue for off-hours
```

Plans follow the format in `.claude/skills/dev-planner/SKILL.md` (flat
`- [ ]` checklists under `# Stage:` headings; per-plan trackers). When a
`progress.txt` exists, `ralph plan` feeds its accumulated findings to the
planner as advisory context (`--no-progress` to skip). The loop prompt
lives in `tools/ralph/PROMPT.md` at the umbrella root (a repo-root `PROMPT.md` overrides it).

Working plans and specs live in the **gitignored** `.plans/` and `.specs/`
directories — they can describe unpatched privacy/security bugs, so they
stay out of the remote by design (see AGENTS.md — "Plans and specs").
There is no tracked `specs/` directory here: design prose whose subject is
already public lands in `docs/` or AGENTS.md instead.

## CI & deploy

- [.github/workflows/test.yml](.github/workflows/test.yml) — lint,
  type-check, and the isolated suite on every PR (GitHub-hosted; no external
  dependencies by design — integration/live tests stay local or on your own
  runner).
- [.github/workflows/deploy.yml](.github/workflows/deploy.yml) — manually
  triggered; builds the Docker image and stops where your infrastructure
  begins (an on-merge trigger is included, commented out).
- **Self-hosted runners**: nothing here requires one. If you have a homelab
  runner (this stack's origin used one labeled `grow-box`), point `runs-on`
  at its labels to give jobs access to private registries or long-lived test
  databases — the note in `test.yml` shows where.

## GitHub tokens & environment for the agent tooling

Some of the `.claude/` tooling talks to GitHub on your behalf:

- The **qa-bug-reporter** agent files and comments on issues via the `gh`
  CLI — it needs `gh auth login` completed with a token that can read/write
  issues on the repo (`repo` scope on a classic PAT, or Issues read/write on
  a fine-grained one).
- The loop's finishing step pushes a branch and opens a PR — same `gh`
  requirements plus push rights.
- Security findings are never filed as public issues: the reporter stops and
  asks you to open a private security advisory (GitHub → Security →
  Advisories) — there is deliberately no automated path for that.

## License

[Apache-2.0](LICENSE). Redistributions must retain the [LICENSE](LICENSE)
and the attribution notices in [NOTICE](NOTICE) (original author and origin
project), per §4 of the license.

Copyright 2026 Marcos Tomatti.
