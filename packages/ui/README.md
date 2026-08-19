# components-library

A variant-first React component library — CVA + Tailwind 4 + Radix primitives,
organized by atomic design up to full application shells — plus a dual-entry
caching module (TanStack Query in the browser, Redis cache-aside on the
server). The repo is a single package and doubles as the component workbench:
Storybook, smoke/unit/visual test suites, and a pixel-fidelity comparator all
live here.

Peer deps: `react` / `react-dom` ^19 (and optionally `ioredis` ^5 for the
server cache).

## Authoring & origins

Created by **Marcos Tomatti**. This library was extracted from **Open Tomato**
(a private project by the same author) as a standalone package, intended for
ad-hoc apps that use a similar application shell — `AppShell`/`AuthShell`, the
auth page set, and the variant-first atoms they compose. The **design-system
extraction pipeline** (design handoff → component specs → rosetta side-by-side
comparison) still lives in the *component-breakdown* project; this repo carries
the consuming half of that workflow — the `design/` reference-page contract,
`scripts/compare-design.mjs`, and the `component-porter` agent for landing
finished components here.

If you build on this work, keep the pointer back to it — see
[License](#license).

## Structure

```text
src/
├── atoms/          # smallest building blocks — Button, Field, Icon, Chip,
│                   # StatusIndicator, Sparkline, brand marks, …
├── molecules/      # composed controls — Modal, Drawer, Select, Toast,
│                   # Wizard, Stepper, charts, stat cards, …
├── organisms/      # app-level assemblies — CommandPalette, Table, Toolbar,
│                   # FormKit, ProfileMenu, WorkspaceSwitcher, …
├── templates/      # application shells — AppShell, AuthShell
├── pages/          # full page compositions (auth flows)
├── stories/        # shared story fixtures
├── lib/            # cn() and shared utilities (formatting lives here)
├── styles/         # the theming split — tokens.css / theme.css / fonts.css /
│                   # lib.css (published styles entry) / global.css (workbench)
└── cache/          # the caching module (./cache and ./cache/server exports)
```

Every component owns a folder with the same four files:

```text
src/<layer>/<Name>/
├── index.ts              # barrel exporter
├── <Name>.tsx            # component definition
├── <Name>.variants.ts    # CVA variant definitions
└── <Name>.stories.tsx    # Storybook stories (one per variant/state)
```

Molecules and above may colocate internal sub-components in the same folder,
exported through the parent's barrel. Layers roll up through layer barrels into
the root `src/index.tsx`. Styling is variants-only: axes live in
`<Name>.variants.ts`, call sites pass variants and flags — not class strings.

## Exports

| Import | Contents |
| --- | --- |
| `components-library` | every component, `cn()` |
| `components-library/styles.css` | the styles entry: fonts + default theme + component contract + Tailwind `@source` scan |
| `components-library/theme.css` | the default theme definition alone (semantic variables, light + dark) |
| `components-library/fonts.css` | the type-face layer alone |
| `components-library/cache` | browser cache: `useCache`, `QueryProvider`, `defaultQueryClient`, re-exported TanStack Query core |
| `components-library/cache/server` | server cache: `createServerCache` (Redis cache-aside; `ioredis` optional peer) |

## Setup (Tailwind 4 consumers)

The package ships **no prebuilt utility CSS** — your Tailwind build generates
exactly the classes the components use. In your Tailwind CSS entry:

```css
@import "tailwindcss";
@import "components-library/styles.css";
```

That single import brings in, layer by layer:

| Layer                  | File                                   | Role                                                                                                 |
| ---------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| fonts                  | `fonts.css`                            | type faces (Google Fonts today; swappable source)                                                    |
| **theme definition**   | `tokens.css` (exported as `theme.css`) | the DEFAULT theme — semantic variables (`--bg`, `--fg1`, `--primary`, …) for light + dark            |
| **component contract** | internal `@theme` mapping              | maps semantic variables onto Tailwind utilities (`bg-primary`, `text-fg1`, …) — stable across themes |
| source scan            | `@source`                              | points your Tailwind build at the package's JS so the components' classes are generated              |

```tsx
import { Button, Touchable } from 'components-library';

<Button variant="accent" size="lg">Run agent</Button>
```

Dark mode: set `data-theme="dark"` on the document element (default follows
`prefers-color-scheme`).

## Using the shells

`AppShell` (navigation + content chrome for signed-in surfaces) and `AuthShell`
(the auth flow frame, paired with the `src/pages/auth` set) are the templates
tier — most of their composition is reusable as-is, with app-specific layouts
tweaked at the consumer. Brand atoms (`Wordmark`, `TomatoMark`,
`WorkspaceMark`) are the shells' logo slots: swap or restyle them per product.
Demo content in stories uses the placeholder brand "Acme".

## Theming (v1: theme definition via CSS)

Component layout is fixed; the **token variables are the theme**. Override the
semantic variables after the styles import:

```css
@import "tailwindcss";
@import "components-library/styles.css";

/* your theme definition — same contract tokens.css fulfills */
:root, [data-theme='light'] {
  --primary: #7a1fa2;
  --accent: #1d4ed8;
}
[data-theme='dark'] {
  --primary: #c084fc;
}
```

The variable→utility mapping itself is part of the components — don't override
it.

## Caching

Browser (TanStack Query wrapper with stale-while-revalidate defaults):

```tsx
import { QueryProvider, useCache } from 'components-library/cache';

// once at the root
<QueryProvider>{children}</QueryProvider>

// in components — staleTime 60s, gcTime 5min, no refetch-on-focus by default
const { data, isLoading, refetch } = useCache(['agents', id], () => fetchAgent(id));
```

Server (Redis cache-aside; `ioredis` is an optional peer dependency):

```ts
import Redis from 'ioredis';
import { createServerCache } from 'components-library/cache/server';

const cache = createServerCache(new Redis(process.env.REDIS_URL!));
const value = await cache.get('agents:1', 300, () => fetchAgent('1'));
await cache.invalidatePattern('agents:*');
```

The build fails if `ioredis` leaks into the browser bundle.

## Development

See [AGENTS.md](AGENTS.md) for conventions, the baseline-safe verification
order, and the agent personas/skills under `.claude/` that drive component
sessions.

```bash
bun install
bun run storybook          # component workbench
bun run test               # unit (cache) + smoke layer (one test per story)
bun run test:visual        # screenshot regression vs this machine's baselines
bun run test:visual:update # (re)seed this machine's baselines
bun run check:stories      # every story renders error-free
bun run build              # library build (dist/ — JS, d.ts, styles/)
```

Visual baselines are per-environment and untracked — each machine (and CI)
regenerates its own; they are never copied between environments.

Pixel-fidelity against design sources:

```bash
bun run build:storybook
node scripts/compare-design.mjs atoms-button--primary Button
```

Design reference pages live under [`design/`](design/README.md).

### Visual CI (off by default)

`.github/workflows/front.yml` gates PRs on the visual suite using a
self-hosted runner: merges to `main` refresh the runner's baselines, changed
pixels on a PR fail with downloadable diffs.

The workflow ships **disabled** — it is a reference implementation for
projects that adopt this library, and it does nothing until the repository
Actions variable `VISUAL_CI` is set to `enabled`. The activation flag, and the
runner it points at (`VISUAL_CI_RUNNER`, defaulting to the `grow-box` label),
live in GitHub settings — the live pipeline wiring is deliberately not tracked
in the repo. The local suite above works regardless.

Operator setup and enablement:
[docs/ci/grow-box-runner-setup.md](docs/ci/grow-box-runner-setup.md); verify
the wiring with `scripts/verify-visual-ci.sh`.

## License

[Apache-2.0](LICENSE) — permissive: use, modify, and redistribute freely,
commercial use included. What the license **does** require (§4) is
attribution: redistributions in source or bundled form must retain the
[LICENSE](LICENSE) and the notices in [NOTICE](NOTICE) — the credit to the
original author and the origin projects (Open Tomato, component-breakdown).
Don't strip the credit; everything else is fair game.

Copyright 2026 Marcos Tomatti.
