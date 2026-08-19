# Contributing to `template-service-express`

There are two distinct workflows depending on what you are trying to do.

## 1. Update the template

You want to improve the template itself — better defaults, a new opt-in
example, clearer docs, a framework (`lib/`) upgrade.

- Keep `src/` minimal (see [AGENTS.md](./AGENTS.md)). New patterns belong in
  `examples/` + `docs/`, not baked into the default service.
- Run the full gate before committing:

  ```sh
  bun install
  bun run lint
  bun run check-types
  bun run test
  ```

- Feature-branch → PR → merge; commits follow `<type>: <description>`
  (feat, fix, refactor, docs, test, chore, perf, ci).

## 2. Adopt the template for a new service

You want to start a new service from this template.

1. Copy the repo (or use GitHub's template button) into a fresh repo.
2. Rename the package in `package.json` and the `serviceId` values in
   `src/index.ts`, `src/mcp/server.ts`, and `tests/health.test.ts`.
3. Replace the starter surface: `src/routes/example.ts`, the `users`
   schema/repository, the `heartbeat` cron job.
4. Delete what you don't need (`src/redis/` if you never opt in, `src/mcp/`
   if you only serve HTTP, `specs/` entries that don't apply) — and keep the
   [NOTICE](NOTICE) attribution either way.
5. Decide your entry-point shape (README — "Entry points").
