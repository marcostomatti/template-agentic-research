# Drizzle + Postgres (wired by default — see src/db/)

## What it is

Wiring to expose a typed [Drizzle ORM](https://orm.drizzle.team) client as
a managed the service framework (`lib/express`) dependency. The pool is opened on service
start (failing fast if the database is unreachable) and drained on stop.

## What you get

- A `createDbDependency(connectionString)` factory returning a
  `TypedDependency<Db>` you can pass to `createService({ dependencies })`.
- A typed schema (`users` table) and a repository query as starter
  examples to replace with your own.
- A minimal `drizzle-kit` migration and config so `bun drizzle-kit
  generate`/`migrate` work out of the box.

## Dependencies to add

```sh
bun add drizzle-orm pg
bun add -d drizzle-kit @types/pg
```

## How to enable

1. Copy `examples/drizzle-db.ts.example` into place, splitting it into the
   conventional files:
   - Section 1 → `src/db/index.ts`
   - Section 2 → `src/db/schema.ts`
   - Section 3 → `src/db/users.ts` (or whatever repository name you prefer)
   - Section 4 → `drizzle/0000_init.sql`
   - Section 5 → `drizzle.config.ts` (at the project root)

2. Add a `DATABASE_URL` entry to `.env.example` and `.env`:

   ```text
   DATABASE_URL=postgres://user:pass@localhost:5432/mydb
   ```

3. Also extend `src/config.ts` so the env is validated at boot:

   ```ts
   const EnvSchema = z.object({
     PORT: z.coerce.number().int().positive().default(3000),
     LOG_LEVEL: z.enum([...]).default('info'),
     DATABASE_URL: z.string().url(),
   });
   ```

4. Wire it in `src/index.ts`:

   ```ts
   import { createService } from '../lib/express/index.js';
   import { config } from './config.js';
   import { createDbDependency } from './db/index.js';
   import { listUsers } from './db/users.js';

   const dbDep = createDbDependency(config.DATABASE_URL);

   await createService({
     serviceId: 'my-service',
     port: config.PORT,
     dependencies: [dbDep],
     register(app, { deps }) {
       const db = deps.get(dbDep);
       app.get('/users', async (_req, res) => {
         res.json(await listUsers(db));
       });
     },
   });
   ```

5. Uncomment the `postgres` service in `docker-compose.yml` and run:

   ```sh
   docker compose up -d postgres
   bun drizzle-kit migrate
   bun run dev
   ```

## Notes

- `createDbDependency` uses a pool `max: 10`. Tune for your workload.
- `/health` automatically turns 503 when any dependency reports `"error"`
  status, so a failed startup probe surfaces through the built-in route.
- For test isolation, spin up a throwaway Postgres with Testcontainers or
  use `pg-mem`; both integrate cleanly with Drizzle.
