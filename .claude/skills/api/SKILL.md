---
name: api
description: >
  Use when designing or modifying an HTTP endpoint or its client-side
  consumption in this service — covers Zod validation at the route boundary,
  response envelope shape, RESTful naming, auth/security requirements, and
  pagination.
tags: [api, rest, zod, openapi, express, jwt, pagination]
---

> Scope: file paths in this document are relative to `packages/service/` (the `@ar/service` package), except `.claude/`, `.plans/`, `.specs/`, and `tools/`, which live at the umbrella repo root.

# API Skill

This skill defines how to build and consume APIs in this service.

---

## Developing an API

- Validate all external input (request bodies, query params, headers) at the route/middleware boundary with Zod.
- Share common field schemas (e.g., `emailSchema`, `uuidSchema`) from a project-level shared file.
- Document API routes with TSDoc comments and keep OpenAPI specs in sync (see [`skills/documentation`](../documentation/SKILL.md)).
- Keep response schemas consistent: `{ success: boolean, data?: T, error?: string }`.
- Use RESTful naming and appropriate HTTP status codes.
- Apply security measures: authentication, authorization, input sanitization, rate limiting, CORS allowlist, HTTP security headers.
- Favor JWTs/auth tokens over server-side sessions for horizontal scalability.
- Use pagination for list routes.

---

## Consuming an API

- Handle responses and errors gracefully — never let unhandled rejections crash the app.
- Use auto-generated types from OpenAPI specs for type safety.
- Keep API consumption logic modular (separate fetching, state management, UI rendering).
- Do not implement caching without team alignment on architecture and performance goals.

---

## Gotchas

- **`z.custom<T>()` without a check function is a no-op validator**: It accepts everything, including `undefined`. Always pass a runtime predicate: `z.custom<Fn>((val) => typeof val === 'function')`. The generic type parameter only influences TypeScript inference — it has no runtime effect.
