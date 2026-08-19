# OpenAPI — documenting Express REST APIs

Use `@asteasolutions/zod-to-openapi` to generate the OpenAPI spec from the same Zod
schemas that validate requests at runtime. This keeps the spec in sync with the code.

> **Status:** OpenAPI wiring is not installed in this template yet. This rule is
> the convention to follow when adopting it — none of the files below exist
> until then.

---

## Setup

1. Add to `devDependencies` (or `dependencies` if swagger UI is served at runtime):

```json
"@asteasolutions/zod-to-openapi": "^7.3.0",
"swagger-ui-express": "^5.0.1",
"@types/swagger-ui-express": "^4.1.8"
```

2. Create `src/openapi.ts` — owns the registry, all schema registrations, all route definitions,
   and the `generateOpenApiDocument()` export.

3. Create `scripts/export-openapi.ts` — writes `.docs/swagger/openapi.json` at build time.

4. Add `docs:generate` script: `"docs:generate": "typedoc && bun scripts/export-openapi.ts"`.

5. Mount swagger UI in the service entry point:

```ts
import swaggerUi from 'swagger-ui-express';
import { generateOpenApiDocument } from './src/openapi.js';

// inside register(app, ...) callback:
const spec = generateOpenApiDocument();
// @ts-expect-error — swagger-ui-express ships @types/express@5; project uses v4
app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
```

> **Note:** The `@ts-expect-error` is required because `swagger-ui-express` ships with
> `@types/express@5` types while the project uses `@types/express@4`. This is a known
> upstream type incompatibility.

---

## `src/openapi.ts` structure

```ts
import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Must be called once before any schema uses .openapi()
extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// 1. Register reusable component schemas
const MyEntitySchema = registry.register('MyEntity', z.object({ ... }));

// 2. Register route paths
registry.registerPath({ ... });

// 3. Export the generator function
export function generateOpenApiDocument(): Record<string, unknown> {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: { title: '...', version: '0.0.1' },
    servers: [{ url: `http://localhost:${process.env['PORT'] ?? 4400}` }],
  }) as unknown as Record<string, unknown>;
}
```

The `as unknown as Record<string, unknown>` cast is required to avoid surfacing `openapi3-ts`
types (a transitive dependency) in the public return type signature.

---

## Registering schemas

Register every entity that appears in more than one route as a reusable `$ref` component:

```ts
const JobSchema = registry.register(
  'Job',
  z.object({
    id: z.string().uuid().openapi({ example: 'f47ac10b-...' }),
    status: z.enum(['pending', 'running', 'completed']).openapi({ description: 'Lifecycle status' }),
  }).openapi({ description: 'A dispatched execution job' }),
);
```

Scalar types used in multiple routes (UUIDs, enums) should be extracted as named constants:

```ts
const UuidSchema = z.string().uuid().openapi({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' });
```

---

## Registering routes

```ts
registry.registerPath({
  method: 'post',
  path: '/jobs/{jobId}/cancel',
  tags: ['Jobs'],
  summary: 'Cancel a running job',
  description: 'Marks the job as cancelled and notifies the executor node.',
  request: {
    params: z.object({ jobId: UuidSchema }),
    body: {
      content: {
        'application/json': {
          schema: z.object({ reason: z.string().optional() }),
        },
      },
    },
  },
  responses: {
    200: { description: 'Cancelled job', content: { 'application/json': { schema: JobSchema } } },
    404: errorResponse('Job not found'),
    409: errorResponse('Job is not in a cancellable state'),
  },
});
```

**Rules:**
- Group related routes with the same `tags` string.
- Always provide `summary` (one line) and `description` (fuller context) for non-trivial routes.
- Define a shared `errorResponse()` helper for `{ error: string }` shapes to avoid repetition:

```ts
const ErrorSchema = registry.register('Error', z.object({ error: z.string() }));
function errorResponse(description: string) {
  return { description, content: { 'application/json': { schema: ErrorSchema } } };
}
```

---

## SSE endpoints

OpenAPI has no native SSE type. Document SSE routes with `text/event-stream` content type:

```ts
responses: {
  200: {
    description: 'Server-Sent Events stream — sends `data: {...}` frames, heartbeat every 15 s',
    content: {
      'text/event-stream': {
        schema: z.string().openapi({ description: 'SSE data frames (JSON-encoded)' }),
      },
    },
  },
},
```

---

## `scripts/export-openapi.ts`

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { generateOpenApiDocument } from '../src/openapi.js';

const outDir = resolve(process.cwd(), '.docs/swagger');
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'openapi.json'), JSON.stringify(generateOpenApiDocument(), null, 2), 'utf8');
console.log(`OpenAPI spec written to ${outDir}/openapi.json`);
```

---

## File placement

```text
<repo root>/
├── src/
│   └── openapi.ts          ← schema registry + route definitions + generateOpenApiDocument()
├── scripts/
│   └── export-openapi.ts   ← writes .docs/swagger/openapi.json
└── .docs/                  ← gitignored; created by docs:generate
    └── swagger/
        └── openapi.json
```

The spec is served at runtime at `GET /docs` (Swagger UI). The `.docs/swagger/openapi.json`
file is for offline tooling (linters, client code generation, CI spec diffing).
