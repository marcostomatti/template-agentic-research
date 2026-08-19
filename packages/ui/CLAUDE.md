Refer to @AGENTS.md for the full context: what this library is, the atomic
structure, the variant-first styling rules, the theming split, the verification
order, and the reference-free rule.

Quick orientation:

- Workspace package `@ar/ui` of the agentic-research umbrella (bun
  workspaces), vendored fork-style from the standalone `components-library`
  template. Everything for the library (components, cache module, workbench, visual CI,
  agent tooling) lives here.
- Component work follows `.claude/skills/component-from-design/SKILL.md`
  (the rosetta loop + Known hazards). Orchestrate sessions with the personas
  in `.claude/agents/` (component-migrator is the prime).
- Verification is baseline-safe and ordered: visual against existing baselines
  FIRST, then lint / check-types / test / check:stories. Baselines are
  per-environment and untracked — regenerate, never copy.
- Styling is variants-only: CVA axes in `<Name>.variants.ts`, no caller-driven
  inline classes, semantic tokens only (no hardcoded palette values).
- Story files never import from `vitest`; stories are deterministic (no
  `Date.now()`).
