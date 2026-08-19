---
name: documentation
description: >
  Use when adding or updating TSDoc comments, wiring TypeDoc into the
  service, documenting an Express route with OpenAPI/Swagger, or
  deciding whether a doc belongs in the gitignored `.docs/` output or the
  tracked `docs/` tree.
tags: [tsdoc, typedoc, openapi, swagger, express, mcp, react]
---

> Scope: file paths in this document are relative to `packages/service/` (the `@ar/service` package), except `.claude/`, `.plans/`, `.specs/`, and `tools/`, which live at the umbrella repo root.

# Documentation Skill

This skill defines how to document code in this repo.
Two kinds of documentation are maintained:

| Kind | Tool | Output | When to generate |
| --- | --- | --- | --- |
| **Code (TypeDoc)** | `typedoc` | `.docs/typedoc/` | `bun docs:generate` |
| **API (Swagger)** | `@asteasolutions/zod-to-openapi` + `swagger-ui-express` | `.docs/swagger/openapi.json` + served at `GET /docs` | `bun docs:generate` |

> The OpenAPI/Swagger row is the convention to follow **when adopted** — it is
> not wired into this template yet. `docs:generate` currently runs TypeDoc
> only; [`rules/openapi.md`](rules/openapi.md) is the setup guide for the day
> API docs are added.

Manual documentation (ADRs, design notes) lives in `docs/` and is never gitignored.
Auto-generated outputs go in `.docs/` (dotfolder) and are always gitignored.

---

## Rules index

| Rule file | When to use |
| --- | --- |
| [`rules/tsdoc.md`](rules/tsdoc.md) | Writing TSDoc comments on any TypeScript symbol |
| [`rules/openapi.md`](rules/openapi.md) | Documenting Express routes with OpenAPI/Swagger |
| [`rules/typedoc-setup.md`](rules/typedoc-setup.md) | Adding TypeDoc infra to the repo (or a project derived from it) |

---

## Workflow

1. **Determine kind before touching**: identify whether documentation is manual or auto-generated before editing. Manual docs live in `docs/`; auto-generated outputs live in `.docs/`.
2. **Manual docs**: include author and date in the file header. Never gitignore `docs/`.
3. **Auto-generated docs**: outputs go in `.docs/` (dotfolder). If adding a new documentation tool, add its output folder to `.gitignore`.
4. **Update in parallel**: update documentation before or in parallel with code changes — do not defer docs to a follow-up PR.

---

## Quick checklist

Before marking a documentation task done:

- [ ] Every exported function, class, and interface has a TSDoc block with `@param` and `@returns`.
- [ ] Every file has a `@packageDocumentation` comment (or is covered by a module-level JSDoc).
- [ ] Every Express router factory is documented with `@remarks` listing its HTTP endpoints.
- [ ] `typedoc.json`, `tsconfig.docs.json`, and a `docs:generate` script exist (see [`rules/typedoc-setup.md`](rules/typedoc-setup.md)).
- [ ] If OpenAPI docs have been adopted: `src/openapi.ts` exists and all routes are registered in it.
- [ ] `.docs/` is gitignored (add a `.docs` entry to the root `.gitignore` if it is missing).
- [ ] `docs/` (manual ADRs) is **not** gitignored.
- [ ] `bun docs:generate` passes with 0 errors.

---

## Toolchain

```text
typedoc                          → HTML docs from TSDoc comments → .docs/typedoc/
@asteasolutions/zod-to-openapi   → OpenAPI spec from Zod schemas          (when adopted)
swagger-ui-express               → Serves the spec at GET /docs at runtime (when adopted)
scripts/export-openapi.ts        → Writes .docs/swagger/openapi.json      (when adopted)
```

Dependencies go in `devDependencies` — the docs toolchain is not needed at runtime,
**except** `swagger-ui-express` when the service serves the UI at runtime (put it in `dependencies` in that case).
