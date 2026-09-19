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
| `outDir` | `string` | `.devtools` | Where round directory is created. |
| `gateway` | `ReportGateway` | — | Where stored reports go next. |

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
| `not-loopback` | 403 | Non-LAN address without `allowLan` | Remote not allowed |
| `not-same-origin` | 403 | Request `Origin` header mismatch | Cross-origin `POST` |
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

## "Save settings" behaviour

The status payload reports `persistence: false` unconditionally.
The menu row exists and reads this field — when `persistence` is
`true`, the row is drawn; otherwise it is hidden. The behaviour
behind the row is deferred and does not ship in this plan.
