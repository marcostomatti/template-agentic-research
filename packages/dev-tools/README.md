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
| `templates` | `readonly string[]` | `.github/ISSUE_TEMPLATE/` | Issue forms to serve; `[]` serves none. |
| `gateway` | `ReportGateway` | — | Where stored reports go next. |

`outDir`'s default is `.rafa/feedback`, not `.devtools` — this table
said the latter until the constant was read
(`DEVTOOLS_DEFAULT_OUT_DIR` in `src/vite/store.ts`). It is a RELATIVE
path handed straight to `join()`, so it resolves against the cwd of
the process running the dev server, not against the repo root: left
unstated and started the usual way (`bun run dev` from inside
`packages/web`), a stored report lands at
`packages/web/.rafa/feedback/<round>/…`, and the path in the
endpoint's JSON response is relative too. Both locations are
gitignored either way — the repo-root `.gitignore`'s `.rafa/` pattern
is unanchored and matches the nested directory as well — so nothing
tracked is at risk; it is only where to look for a report by hand.

A caller that wants one fixed location therefore passes an ABSOLUTE
path, which is what `packages/web/vite.config.ts` does:
`resolve(import.meta.dirname, '../../.rafa/feedback')`, so every
report in this repo lands under the repo root's `.rafa/feedback/`
whatever directory the dev server was started from. Written relative
instead, `../../.rafa/feedback` would only reach the root while the
cwd stayed `packages/web`; from the repo root the same two `..`
segments resolve above the checkout, and nothing refuses — `store.ts`
creates the round directory with `mkdir(…, {recursive: true})`, so a
mis-resolved `outDir` writes a fresh tree somewhere else silently.
The stored path also travels: `POST /__devtools/report` answers it
and `src/vite/gateway/rafa.ts` lists the attachment paths in the
issue body it files, so it should name the same place read from
anywhere. The `templates` option resolves the same way but is left
relative there, because those paths are only read and a miss answers
`[]` rather than creating anything.

## Feedback Feature

The feedback drawer is a plugged-in feature that lets users file bug
reports or UI feedback from inside the running app. It presents a form
built from the repository's GitHub issue templates (read from
`.github/ISSUE_TEMPLATE/*.yml` or the paths `templates` names), adds
three fields of its own, captures a screenshot and element selector on
request, and files the report through `rafa` to the tracker.

### Issue Form Templates and `x-devtools` Contract

GitHub issue forms drive the feedback form. Each issue form becomes a
`ReportTemplate`: a title, description, module, and a list of fields.
The plugin reads `.yml` files on every `GET /__devtools/templates`
request, so edits are picked up without restarting; a missing or
malformed file is skipped with a warning and nothing fatal.

A template opts out of the widget's own fields through a top-level
`x-devtools` key GitHub ignores:

```yaml
x-devtools:
  screenshot: false  # hide the screenshot field
  selector: false    # hide the element-selector field
  context: always    # cannot be opted out of; ignored if present
```

The three appended fields are:
- `screenshot` (`file`): capture via `navigator.mediaDevices.
  getDisplayMedia({preferCurrentTab: true})`, or drag/paste a PNG or
  JPEG. Cancelled dialogs or missing APIs answer `null` and the report
  goes without. Stored under `.rafa/feedback/<round>/` on the server.
- `selector` (`selector`): click to pick an element on the page; the
  widget calls `@medv/finder` configured to prefer `data-testid`,
  `id`, `role` and `aria-label` over Tailwind classes. While focused,
  live matches are outlined and the match count shown; ArrowUp climbs to
  parent, ArrowDown returns.
- `context` (`readonly`): automatically collected: viewport, device
  pixel ratio, colour scheme, `data-theme` if present, user agent,
  `location.href`, app version, the bus's five newest `error` payloads
  (`error` for the newest, then `errorPrevious1` to `errorPrevious4`,
  a number naming a payload's age and never padded) and its current
  `artefact`, each when present. Never opted out.

### Form Renderer Slot

The package ships a plain HTML renderer for the form, but `mountDevTools`
accepts `renderForm?(fields, value, onChange)` to customize it. The
renderer receives `ReportField[]` (the seven kinds: `text`, `textarea`,
`select`, `checkboxes`, `readonly`, `file`, `selector`) and owns all
drawing; both the default and a custom renderer mark the selector input
`data-devtools-field="selector"` so the element-picker decoration can
attach correctly.

### Endpoints: Templates, Report, and Comment

Three routes handle the feature:

**`GET /__devtools/templates`**: Returns an array of `ReportTemplate`
objects, parsed from `.yml` files and validated against a zod schema
that both halves of this package share. A missing directory answers
`[]`; an unreadable or malformed file is skipped with a dev-server
log warning.

**`POST /__devtools/report`**: Stores a filed report to disk and
dispatches it to a gateway if configured. The request carries a
title, body (both validated for length), a context object, and
attachments (base64-encoded PNG/JPEG). The response answers `{status,
path, gateway}` where `gateway` is whatever the configured gateway
returned (or `none` if unconfigured). The PNG is stored under
`.rafa/feedback/<round>/` and the path links it in the issue body.
The PNG never travels to the tracker — only its path does.

**`POST /__devtools/comment`**: The "also affected" route. When a
search finds a duplicate, this posts a comment linking the new report.
The request carries an `issueId` (passed to the gateway's `comment`
method and never altered) and a body. The response answers `{status:
'commented', gateway: {...}}`. A dev server with no gateway answers
`gateway-absent`, since there is nowhere for a comment to go.

### Refusals

| Rule | Code | When |
| --- | --- | --- |
| `remote-not-loopback` | 403 | Non-loopback address without `allowLan` |
| `origin-mismatch` | 403 | Cross-origin `POST` on request `Origin` header |
| `host-mismatch` | 403 | Cross-origin `POST` on request `Host` header |
| `method-not-allowed` | 405 | Wrong method: `GET` to `/report` or `/comment` |
| `body-too-large` | 413 | Over 24 MiB |
| `body-unreadable` | 400 | Stream read error |
| `body-not-json` | 400 | JSON parse failed |
| `slug-unusable` | 400 | Title sanitises to empty |
| `attachment-name-unusable` | 400 | Attachment name empty |
| `gateway-absent` | 500 | `POST /comment` with no gateway configured |
| `round-unusable` | 500 | Round is empty |
| `clock-unusable` | 500 | Timestamp failed |
| `write-failed` | 500 | Filesystem I/O error |
| `socket-unreadable` | 403 | Cannot read local port |
| `endpoint-failed` | 500 | Unhandled middleware exception |

The endpoint checks `remote-not-loopback` on every request (both `GET`
and `POST`), before checking origin; so a non-loopback caller is
refused the same code whatever `Origin` it sends, and there is no way
to observe an origin-based refusal from a LAN address.

### `rafaGateway`: Filing Through `rafa`

The one built-in gateway runs the `rafa` binary to file reports and
dedupe against existing issues. It is imported dynamically and bound
through the `gateway` plugin option:

```typescript
import { rafaGateway } from '@ar/dev-tools/vite'

export default defineConfig({
  plugins: [
    devtoolsPlugin({
      gateway: rafaGateway({
        bin: 'rafa',  // optional; default is 'rafa'
      }),
    }),
  ],
})
```

The gateway decides the exact argv for every call to `rafa` (never a
shell string; every flag is one argv element in `--flag=value` form):

```text
rafa issue list   --type=bug --search=<words> --output=json
rafa issue create --title=[fb/<round>] <title> --body=<body>
                  --type=bug --module=web --output=json
rafa issue comment <id> --body=<markdown> --output=json
```

The `[fb/<round>]` title prefix and attachment paths are applied
server-side (the browser has no authority over the round and the paths
do not exist until the report is stored). The attachment BYTES never
leave the machine; only their paths are appended to the issue body.

An issue form's own `labels:` key does NOT reach an issue the widget
files. That key is applied by GitHub's new-issue chooser UI alone;
`rafa issue create` neither reads nor forwards it, and rafa has no
label flag at all. So the labels on a widget-filed issue are the ones
rafa derives from its own flags — measured on the github tracker as
`type:bug`, `needs-triage` and `module:web` for a `--type=bug
--module=web` create, whichever form was chosen. A form's `labels:`
still governs the same issue opened by hand, so the two routes to one
tracker do not agree on labels and a triage query must key on the
`[fb/<round>]` title prefix rather than on a label.

### Local Tracker Path

When the tracker has no GitHub authentication, rafa falls back to the
`local` tracker and stores issues in the repo. That fallback still
SUCCEEDS: the gateway answers `filed` with `tracker: 'local'`, not the
endpoint-level `stored`, and the drawer's status line reads
`Filed as <id> on local.` The escape hatch is keyed on the tracker
rather than on the status — any non-`github` `filed` is treated exactly
like a gateway-absent `stored` — so the widget shows a prefilled GitHub
new-issue link beside a copy block of the same body, so a triager can
carry the content over by hand:

```
/issues/new?template=<file>&title=[fb/<round>] <title>&body=<body>
```

The repo slug is read from `git remote get-url origin` and served by
`GET /__devtools/status`.

## Endpoints

### `GET /__devtools/status`

Returns build and configuration info.

```json
{
  "commit": "abc1234...",
  "branch": "main",
  "round": "default",
  "persistence": false,
  "gateway": "none",
  "repo": "owner/name"
}
```

`repo` is the `owner/name` slug of the `origin` remote, read once at
dev-server start through `git remote get-url origin`, and `unknown`
where there is no remote or its url parses as no repository. Only the
two capture groups are answered, so a remote url carrying credentials
never reaches the response.

### `GET /__devtools/templates`

Returns the repository's GitHub issue forms, parsed into the
`ReportTemplate` shape both halves of this package validate against —
a bare JSON array, in the order they were read.

The directory is read on every request, so an edited issue form is
picked up without restarting the dev server. Nothing there is fatal: a
missing `.github/ISSUE_TEMPLATE/` answers `[]`, and an unreadable or
malformed file is skipped with a warning in the dev-server log naming
it.

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

`path` is this package's own report-JSON path on disk, written before
any gateway runs. It is NOT `gateway.id`, which is the tracker's own
issue id; both are present in the same response and read alike in a
log, so name which one a reading means.

### `POST /__devtools/comment`

The "also affected" route: adds a comment to an issue the tracker
already has, which is how a report that matched an existing one ends.
It writes nothing to disk — the report it is about was stored by the
route above on an earlier request.

**Request body**:
- `issueId`: the tracker's own id, up to 128 characters. An identifier
  charset only, and never one beginning with a dash: a gateway passes
  it to `rafa` as an argv element, where a leading dash reads as a flag.
- `body`: the comment markdown, up to 5,000 characters

**Success (200)**:
```json
{
  "status": "commented",
  "gateway": { "status": "filed", "tracker": "local", "id": "AR-123" }
}
```

`gateway` is whatever `ReportGateway.comment` answered, wrapped rather
than returned bare. A gateway that refused is still a 200 carrying
`{"status": "refused", "reason": "…"}` under that key, because the
REQUEST was not refused; a top-level `"status": "refused"` always means
the request itself was.

A dev server configured with no gateway refuses this route with
`gateway-absent` — see below — since there is nowhere for a comment to
go. The body is validated first either way, so a malformed one is
refused the same on every machine.

### Refusals

| Rule | Code | Reason | When |
| --- | --- | --- | --- |
| `remote-not-loopback` | 403 | Non-loopback address without `allowLan` | Remote not allowed |
| `origin-mismatch` | 403 | Request `Origin` header mismatch | Cross-origin `POST` |
| `host-mismatch` | 403 | Request `Host` header mismatch | Cross-origin `POST` |
| `method-not-allowed` | 405 | Wrong method for path | `GET` to `/report` or `/comment`, or `POST` to `/status` or `/templates` |
| `body-too-large` | 413 | Over 24 MiB | Oversized body |
| `body-unreadable` | 400 | Stream error | Read failed |
| `body-not-json` | 400 | `JSON.parse` failed | Invalid JSON |
| `slug-unusable` | 400 | Title sanitises to empty | Body validation |
| `attachment-name-unusable` | 400 | Attachment name empty | Body validation |
| `gateway-absent` | 500 | No gateway configured | `POST` to `/comment` with no `gateway` option |
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
