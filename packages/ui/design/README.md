# design/ — design references for the rosetta comparator

`scripts/compare-design.mjs` captures a Storybook story and its design source
side by side (`visual/__compare__/<story-id>--{ours,design}.png`) so a human or
an agent can verify a component translation is 1:1 before trusting visual
baselines. This directory holds the design side. It ships nothing — it is repo
tooling only.

Drop design references here per source mode:

| Mode        | Path                        | Contract |
| ----------- | --------------------------- | -------- |
| `bundle`    | `design/bundle/index.html`  | A component-catalog page where each spec renders inside an element with id `prim-<SpecName>`, its live demo in `.prim-body > div:first-child > div:first-child`, and segmented controls (one labeled button per variant value) for `--set key=value`. |
| `auth`      | `design/pages/auth.html`    | Full-screen artboards: `<section class="screen-card">` per screen, title in the header, the screen rendered inside `.frame > div` at 85% scale (the script neutralizes the scale). |
| `topbar`    | `design/pages/topbar.html`  | Showcase cards: one `<section>` per card, title in its header, live demo inside a `.check-bg` body. |
| `dashboard` | `design/pages/<file>.html`  | Whole-app screens mounting into `#root`; captured full-page, or crop with `--selector`. |

Any static assets a page needs (JS, CSS, images, fonts) can sit next to it —
the comparator serves the whole directory. Pages that pull React UMD + Babel
standalone from a CDN need network access at capture time.

The selector contracts above match the layout of the design sources the
original library was built against. If your design pages are shaped
differently, adjust the mode-specific capture blocks at the bottom of
`scripts/compare-design.mjs` — they are small and well-commented.

Usage (after a fresh `bun run build:storybook`):

```bash
node scripts/compare-design.mjs atoms-button--primary Button
node scripts/compare-design.mjs pages-auth-login--default "Default state" --source auth --theme dark
node scripts/compare-design.mjs organisms-searchsuggest--default "Search suggest" --source topbar
```
