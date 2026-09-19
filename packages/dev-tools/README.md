# Dev Tools

Development tools shell and Vite plugin for the agentic research
platform. Runs in its own React root; invisible to visual baselines
and the default e2e suite under automation.

## `mountDevTools(config)`

Mount the dev-tools widget on `document.body`.

```typescript
import { mountDevTools } from '@ar/dev-tools'

const dispose = mountDevTools({
  features: [...],
})
```

### Config members

| Member | Type | Default | Purpose |
| --- | --- | --- | --- |
| `features` | `readonly DevToolsFeature[]` | required | The plugged-in features, in menu order. |
| `corner` | `'top-left' \| 'top-right' \| 'bottom-right' \| 'bottom-left'` | `'bottom-right'` | Where the trigger starts, every load. Not persisted. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Initial trigger size. Persisted in `localStorage`. |
| `endpoint` | `string` | `'/__devtools'` | Dev-server endpoint path. |
| `extra` | `() => Record<string, string \| number \| boolean>` | — | App-supplied context keys, merged per read. |
| `apiVersion` | `() => Promise<string \| null>` | — | Probe the service version. |
| `version` | `Partial<{ commit, branch, round }>` | — | Build facts, wins over status payload. |
| `showEmpty` | `boolean` | `true` | Mount with no enabled feature. |

### Return value

`DevToolsDisposer` — a function that unmounts the root and removes
the element. Calling it more than once is harmless.

## `devtoolsPlugin(options)`

The Vite dev-server plugin. Registers in `serve` only; does nothing
under `vite build`.

```typescript
import { defineConfig } from 'vite'

export default defineConfig(async ({ command }) => ({
  plugins: [
    ...(command === 'serve'
      ? [(await import('@ar/dev-tools/vite')).devtoolsPlugin({
        round: 'my-round',
      })]
      : []),
  ],
}))
```

Import it dynamically and only under `serve`. A static top-level
import is resolved whenever the config file is loaded, `vite build`
included, so a build environment holding no built copy of this
package — an image stage that copies only its manifest, for one —
fails with `ERR_MODULE_NOT_FOUND` before the plugin's own
`apply: 'serve'` is ever read.

### Options

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `round` | `string` | — | Round tag for reports. Wins over env and branch. |
| `allowLan` | `boolean` | `DEVTOOLS_ALLOW_LAN` env | Accept non-loopback addresses. |
| `outDir` | `string` | `.rafa/feedback` | Where round directory is created. |
| `gateway` | `ReportGateway` | — | Where stored reports go next. |

`outDir`'s default is `.rafa/feedback`, not `.devtools` — this table
said the latter until the constant was read
(`DEVTOOLS_DEFAULT_OUT_DIR` in `src/vite/store.ts`). It is a RELATIVE
path handed straight to `join()`, so it resolves against the cwd of
the process running the dev server, not against the repo root: started
the usual way (`bun run dev` from inside `packages/web`), a stored
report lands at `packages/web/.rafa/feedback/<round>/…`, and the path
in the endpoint's JSON response is relative too. Both locations are
gitignored either way — the repo-root `.gitignore`'s `.rafa/` pattern
is unanchored and matches the nested directory as well — so nothing
tracked is at risk; it is only where to look for a report by hand.

## Endpoints

### `GET /__devtools/status`

Returns build and configuration info.

```json
{
  "commit": "abc1234...",
  "branch": "main",
  "round": "default",
  "persistence": false,
  "gateway": "none"
}
```

### `POST /__devtools/report`

Stores a report and attachments.

**Request body** (spec item 8.3):
- `title`: slug-friendly string
- `body`: up to 5,000 characters
- `context`: record of strings
- `attachments`: array of `{ name, data: base64 }`

**Success (200)**:
```json
{
  "status": "stored",
  "path": ".devtools/default/abc1234.json",
  "gateway": { ... }
}
```

### Refusals

| Rule | Code | Reason | When |
| --- | --- | --- | --- |
| `remote-not-loopback` | 403 | Non-loopback address without `allowLan` | Remote not allowed |
| `origin-mismatch` | 403 | Request `Origin` header mismatch | Cross-origin `POST` |
| `host-mismatch` | 403 | Request `Host` header mismatch | Cross-origin `POST` |
| `method-not-allowed` | 405 | Wrong method for path | `GET` to `/report` or `POST` to `/status` |
| `body-too-large` | 413 | Over 24 MiB | Oversized body |
| `body-unreadable` | 400 | Stream error | Read failed |
| `body-not-json` | 400 | `JSON.parse` failed | Invalid JSON |
| `slug-unusable` | 400 | Title sanitises to empty | Body validation |
| `attachment-name-unusable` | 400 | Attachment name empty | Body validation |
| `round-unusable` | 500 | Round is empty | Server state |
| `clock-unusable` | 500 | Timestamp failed | Server state |
| `write-failed` | 500 | Filesystem error | Server I/O |
| `socket-unreadable` | 403 | Can't read local port | Connection issue |
| `endpoint-failed` | 500 | Unhandled throw | Middleware error |

The first two codes were spelled `not-loopback` and `not-same-origin`
here until they were read off `src/vite/origin.ts`; the names above are
the ones the endpoint actually answers with.

The ORDER matters when reading a refusal. `endpoint.ts`'s route runs
`isAllowedRemote` FIRST, on both `GET` and `POST`, and only then
`isSameOriginRequest` (`POST` only). So a non-loopback caller is
refused `remote-not-loopback` whatever `Origin` and `Host` it sends —
there is no way to observe an origin refusal from a LAN address, and a
test for the LAN rule needs no crafted mismatched origin to provoke it.

## Environment variables

| Name | Type | Purpose |
| --- | --- | --- |
| `VITE_DEVTOOLS_ROUND` | string | Round tag for reports. Loses to plugin option. |
| `VITE_DEVTOOLS_FORCE` | `'1'`, `'true'`, etc. | Override automation guard. |
| `DEVTOOLS_ALLOW_LAN` | `'1'`, `'true'`, etc. | Accept non-loopback addresses. |

## Portability

This package is written to be ported as a directory copy. Every
string, path, export, CSS var and env name is prefixed
`devtools` / `DEVTOOLS` / `--devtools-` to survive the move
unchanged. The plugin unplugs under the port; the routes and types
stay.

## Known gap: the stylesheet is not imported by `@ar/web`

`src/styles.css` is the package's only stylesheet and the consuming
app opts in with one `@import` — but `@ar/web` does not yet write
one. Measured: `packages/web/src/styles.css` imports `tailwindcss`
and the `@ar/ui` stylesheet and nothing else, and no other file under
`packages/web/src/` names this package's `styles.css` export. The
widget therefore mounts and behaves correctly while rendering
UNSTYLED — every `data-corner` / `data-size` assertion in
`packages/web/tests/e2e/dev-tools-shell.spec.ts` still passes, so no
gate reports it. Whoever closes this must keep the import out of the production
CSS graph (a plain line in `packages/web/src/styles.css` would ship
the widget's CSS to users) and re-run the `dist/` leak greps that
`packages/web/src/main.tsx`'s header describes.

## "Save settings" behaviour

The status payload reports `persistence: false` unconditionally.
The menu row exists and reads this field — when `persistence` is
`true`, the row is drawn; otherwise it is hidden. The behaviour
behind the row is deferred and does not ship in this plan.
