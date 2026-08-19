# JSON-RPC routes (opt-in)

## What it is

A minimal JSON-RPC 2.0 POST endpoint backed by an in-process method registry.
Useful when your service needs to expose a handful of remote-callable
operations over a single stable URL (`POST /rpc`) rather than a large REST
surface.

## What you get

- `rpcRouter(methods)` — an Express router that accepts `{ jsonrpc: "2.0",
  id, method, params }` and dispatches `params` to the registered handler.
- Parsed with zod, so invalid payloads return standard JSON-RPC `-32600`
  errors. Unknown methods return `-32601`. Thrown errors become `-32603`.

## Dependencies to add

None. The example uses only `express` and `zod`, both already in
`package.json`.

## How to enable

1. Copy `examples/rpc-route.ts.example` → `src/routes/rpc.ts`.
2. In `src/index.ts`, define your method map and mount the router:

   ```ts
   import { createService } from '../lib/express/index.js';
   import { rpcRouter, type RpcMethod } from './routes/rpc.js';

   const methods: Record<string, RpcMethod> = {
     'ping': async () => ({ pong: true }),
     'add': async (params) => {
       const { a, b } = params as { a: number; b: number };
       return a + b;
     },
   };

   await createService({
     serviceId: 'my-service',
     register(app) {
       app.use('/rpc', rpcRouter(methods));
     },
   });
   ```

3. Call it:

   ```sh
   curl -X POST http://localhost:3000/rpc \
     -H 'content-type: application/json' \
     -d '{"jsonrpc":"2.0","id":1,"method":"ping"}'
   # -> {"jsonrpc":"2.0","id":1,"result":{"pong":true}}
   ```

## Notes

- The template's handler validates incoming envelopes but trusts `params`
  — each handler should validate its own params shape with zod.
- Batched requests (JSON-RPC arrays) are intentionally not supported; add
  support in your own fork if needed.
