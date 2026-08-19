# Server-Sent Events (opt-in)

## What it is

A `GET /stream` endpoint that holds the TCP connection open and pushes
newline-delimited `event:`/`data:` frames whenever your service publishes
something to the in-process bus. Useful for dashboards, live tails, and
any one-way server→client streaming where WebSockets would be overkill.

## What you get

- `createStreamRouter()` — returns `{ router, publish(event) }`.
- The router handles `GET /`, sets the SSE headers, and relays events
  from the in-process `EventEmitter` to the client. It cleans up on
  `req.close`.

## Dependencies to add

None. Uses plain Node `EventEmitter` + Express.

## How to enable

1. Copy `examples/sse-stream.ts.example` → `src/routes/stream.ts`.
2. In `src/index.ts`, create the router and expose the `publish` handle
   to the rest of your service:

   ```ts
   import { createService } from '../lib/express/index.js';
   import { createStreamRouter } from './routes/stream.js';

   const stream = createStreamRouter();

   await createService({
     serviceId: 'my-service',
     register(app) {
       app.use('/stream', stream.router);

       app.post('/ping', (_req, res) => {
         stream.publish({ type: 'ping', data: { at: Date.now() } });
         res.json({ ok: true });
       });
     },
   });
   ```

3. Subscribe:

   ```sh
   curl -N http://localhost:3000/stream
   # (in another terminal)
   curl -X POST http://localhost:3000/ping
   # subscriber sees:
   # event: ping
   # data: {"at":1700000000000}
   ```

## Notes

- The in-process `EventEmitter` is single-instance. For multi-process or
  multi-pod fan-out, back `publish` with Redis pub/sub, Postgres
  `LISTEN/NOTIFY`, or a proper message broker.
- No heartbeat is sent by default. If clients sit behind a proxy that
  closes idle connections, schedule a periodic comment frame
  (`res.write(': keepalive\\n\\n')`).
