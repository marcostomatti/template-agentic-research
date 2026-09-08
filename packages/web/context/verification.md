## Verification order

The fast inner loop, from inside `packages/web`:

```bash
bun run lint && bun run check-types && bun run test
```

The root fan-out (`lint:all`, `check-types:all`, `test:all`) is the
gate before a PR — read the per-package lines rather than the exit
code, per the repo-root `context/verification.md`. Four properties of
this package's gates are worth knowing before calling a change verified:

- `lint` uses the explicit-path form (`eslint src tests *.ts *.mjs`),
  which fails CLOSED with exit 2 on any path matching no lint target.
  An EMPTY directory counts as no target — which is what
  `tests/README.md` exists to prevent.
- The React rule sets (`react-hooks`, `jsx-a11y`, `react-refresh`) are
  scoped to `.jsx` and `.tsx` alone, so a hook living in a `.ts` file
  gets NO rules-of-hooks and no `exhaustive-deps` checking. Read those
  dependency arrays by hand.
- `check-types` covers `src`, `tests` and the package-root config
  files. The `*.mjs` entry in the tsconfig `include` is inert without
  `allowJs`, and the package `test` script does not type-check at all
  (vitest transpiles per file), so a module can be green under `test`
  and red under `check-types`.
- `check-types` CANNOT see a missing `@ar/ui` runtime artifact: that
  package's exports map resolves types and values from DIFFERENT
  files, so a subpath import whose JS is absent still type-checks
  clean. `bun run build` is the cheapest thing that proves an import
  actually resolves.
- The bundle carries a KNOWN, deliberately unaddressed follow-up, so a
  size reading here is not a regression to chase: the main chunk's size
  and the ~1776 emitted glyph chunks are both `lucide-react/dynamic`'s
  name-to-glyph map, which lands ~2035 `import(` call sites in the entry
  chunk and trips rolldown's own 500 kB chunk warning. It clears this
  app's page budget regardless. Whoever takes the lucide barrel on should
  re-measure against HEAD's own build rather than any figure quoted in a
  plan, and quote the BUILD's own gzip line rather than re-deriving it —
  a bundler's printed gzip size is not reproducible by any gzip level, so
  re-deriving it reports an improvement nobody made.
