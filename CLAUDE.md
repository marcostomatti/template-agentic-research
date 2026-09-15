Refer to @AGENTS.md for the umbrella map and the `context/` page index —
shared tooling, the plans/specs law and security posture, verification
order, gate coverage and workflow each live on their own page there.

Quick orientation:

- Bun-workspaces monorepo: `@ar/ui` (component library + visual harness),
  `@ar/web` (app), `@ar/service` (Express/MCP service + future research
  pipelines). The task loop runs on the `rafa` CLI (`@open-tomato/rafa`);
  see `context/loop.md` for its architecture.
- Working inside a package? Read that package's `AGENTS.md` first — each has
  its own conventions (ui: variants-only styling + baseline-safe verification;
  service: isolated/live test seam + framework-vs-app split).
- `.plans/` and `.specs/` are untracked on purpose (unpatched security/privacy
  content). Never move their contents into tracked paths.
- Specs feed the loop: `rafa plan --spec=.specs/<file>.md`, then
  `rafa start --plan=.plans/PLAN-<stub>.md`.
