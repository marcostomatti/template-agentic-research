## `@ar/ui` constraints this app is built around

Each of these was measured against the library as shipped, and none of
them may be "fixed" by editing `@ar/ui` from here — a component gap is
closed by a promotion of its own, on a wave that owns `packages/ui`.
They are here because every one of them is invisible to `lint`,
`check-types` and the unit suite.

- **`Button` cannot be used with `asChild` AT ALL.** It always renders
  `{iconLeading}{children}{iconTrailing}`, so Radix's `Slot` counts
  three children and throws — which react-router catches into its error
  boundary, i.e. the shell-down outcome. Every gate here is green over
  it. The app-local answer is a bare `Link`: `tokens.css` already styles
  `a` with the accent colour, an underline and a hover.
- **The format ladder is unreachable.** The root barrel re-exports
  `./lib` as `cn` ALONE, so `formatRelativeTime`, `formatDate` and the
  rest are not importable — only the `Formatted*` COMPONENTS are. A
  `@ar/ui` prop typed `string` that wants a relative time therefore takes
  written prose, anchored in a comment to the stamp it stands for.
- **Every list-shaped prop is declared MUTABLE** (`SearchSuggestion[]`,
  `WorkspaceOption[]`, the table and grid props) while every accessor and
  every `useCache` read hands back `readonly T[]`. Copy at the binding
  (`[...data]`, or the `.map` a shape change needs anyway) rather than
  casting: the fixture arrays are frozen ON PURPOSE, and a cast hands the
  component the frozen array with the compile-time claim removed. The
  mirror rule is for a helper BUILDING such a prop — it returns the
  mutable type, because its array is constructed per call and owned by
  nobody. Say which of the two a new module is in its docblock.
- **`Select` cannot be drawn inert** — `SelectProps` has no `disabled`
  and requires `onChange` — so on a surface with no write seam the choice
  is a LIVE control or NO control, never a disabled one. Its trigger also
  resolves as `options.find(o => o.value === value) ?? options[0]`, so a
  value no option carries renders SOMEBODY ELSE'S option while the stored
  value goes unmentioned. `WorkspaceSwitcher` resolves the same way. Any
  option list built from a read independent of the read holding the value
  must take that value as an argument and guarantee membership.
- **`Field` computes `disabled` from its `state` VARIANT**, which
  suppresses React's controlled-input warning by a presentation choice
  rather than an intent. Pass `readOnly` alongside `state="disabled"`
  whenever a fixture value is displayed in a field.
- **`Grid`'s `cols` is a FIXED track count with no responsive form**, and
  `cn` is tailwind-merge — so `<Grid cols="3" className="md:grid-cols-3">`
  silently drops the variant's own class. Pick the BASE from the variant
  and put only the breakpoint in `className`. `EntityCard`'s promotion
  did NOT retire this bullet, which is worth stating because it did
  narrow it: `EntityCardGrid` owns an auto-fill track as a `min`
  variant, so the three card surfaces no longer reach for `Grid`. The
  one remaining caller under `src/` is the sources stat band, and it
  is written exactly as prescribed — `cols="1"` taken from the
  variant, `md:grid-cols-3` alone in `className`.
- **`SmallStatCard` formats a numeric `value` with `short` defaulting to
  TRUE**, so a count paints `1.2K` at 1200. Pass `short={false}` beside
  the locale pin; neither is visible as wrong against fixtures small
  enough to render identically either way.
- **`Table` owns its sort state internally** (`initialSort` in, nothing
  out), so marking a column `sortable` creates a reading of the page that
  a shared link cannot carry — which contradicts this app's URL-as-state
  rule. The accessor's own ordering is part of what a surface MEANS and
  belongs in `data/`, not in a column.
- **`renderCellContent('status')` names the dot** `text == null ? label
  ?? tone : label`, so passing BOTH gives the indicator a `role="status"`
  name a screen reader reads on top of the visible text. Pass `label`
  only where it carries something the text does not.
- **`Segmented` renders a HALF tab pattern.** It is `role="tablist"`
  over `role="tab"` buttons carrying `aria-selected`, and it wires no
  `aria-controls` — nor offers a prop that could, its `items` being
  `{ key, label }` alone. So the region a segment switches is a plain
  `div` and NOT a `tabpanel`: half a relationship reads worse than
  none, and a spec reaching for `getByRole('tabpanel')` finds nothing.
  Address the switch as `getByRole('tab', { name })` and give the
  tablist an `aria-label` at the call site — the segments' own
  words say WHICH view, and nothing else says what they are views
  of. It also spreads `HTMLAttributes`, so that label passes straight
  through (measured). Its track is `inline-flex`, which stretches like
  any flex child, so a call site inside a column wants `self-start`.
- **`Sortable` has no keyboard path at all.** It is HTML5
  drag-and-drop over `dataTransfer`, and neither `Sortable.tsx` nor
  `SortableRow.tsx` carries an `onKeyDown`, a `tabIndex` or one ARIA
  attribute (measured). So a list drawn in it owes move controls of its
  own, and those controls are the MECHANISM rather than an enhancement
  on the drag: WCAG 2.2 SC 2.5.7 asks for a keyboard-reachable
  equivalent of a dragging movement, and a second implementation of the
  same move would answer it only until the two drifted. Route both
  gestures through ONE call so they cannot — `NodeForm.tsx` under
  `src/dynamic-form/` reports a single move and the shell answers it
  with one `withListReordered`.
- **Three more `Sortable` contracts are invisible from the call site.**
  A drop is reported as the WHOLE NEXT ORDER and never a pair of
  indices, and its internal move works in insertion GAPS, so a consumer
  holding an index-pair API owes a derivation — which is the one place
  the pointer path and the keyboard path can still disagree. Omitting
  `onReceive` is what REFUSES a drag out of another list (the handlers
  return before `preventDefault`, so the drop never lands), so it is a
  decision rather than an omission. And `draggable` sits on the wrapper
  around EVERY row, so a press on a button or a text selection inside
  one starts a drag unless the row's content opts out with
  `draggable={false}`.
- **A `Readonly<Record<Union, T>>` over a cva PROP union is not
  exhaustive** the way one over an app-owned union is: every
  `VariantProps` member resolves to `T | null | undefined`, so a key set
  to `undefined` type-checks and the component falls back to its own
  default variant. The record still refuses a missing key and an excess
  one; only a colocated "gives every member a value" test catches the
  third case.
- **This app reaches NO icon library and no `@ar/ui` glyph.** `lucide` is
  absent from this package's manifest (measured 0 occurrences) and
  `packages/ui/src/lib/icons.tsx` is internal by design, never
  re-exported from that package's root. So a component needing a glyph
  draws its own inline `<svg>`, which is what `@ar/ui`'s own `Breadcrumb`
  does for its separator. Mark it `aria-hidden` — that is what keeps a
  whole-row button's accessible name the label ALONE, the concatenated-
  subtree naming an ARIA composite suffers biting a row button the same
  way.
- **`FormField` owns labelling through `htmlFor`, which reaches a
  LABELABLE control and nothing else.** This package has already ruled
  that a `<label for>` does not reach `Switch` (a `button`) or `Select`
  (a menu trigger) — see `ControlRow` in
  `src/pages/sources/SourceEditorModal.tsx`. So a form drawing mixed
  controls needs TWO envelopes and the split follows what the control IS
  rather than a style choice: `FormField` for the `<input>` kinds, and a
  labelling element carrying an id plus `aria-labelledby` for the rest.
  `FormField`'s label and hint spans carry NO id, so nothing can point
  `aria-describedby` at them; the established repair is putting the id
  INSIDE the `error` slot (`error={<span id={faultId}>{fault}</span>}`).
- **Surface tokens are HYPHENATED and a wrong spelling is silent.**
  `bg-surface-1`, `bg-surface-2` and `bg-surface-sunk` are the only three
  in the tree, so a reflexive `bg-surface2` renders no rule at all and
  `lint`, `check-types` and a render probe are every one of them green.
  Derive the token with `git grep —oh 'bg-surface[a-z0-9-]*' | sort |
  uniq —c` before writing one. `surface-sunk` already carries a MEANING
  here — `src/components/JsonEditor.tsx` uses it for a read-only box
  because that surface means "not where you type" everywhere — so a
  navigation row is the right reuse and an input is not.
- **A component library's variant roster is a CEILING a page can already
  be sitting at**, and nothing in the tree reports that a widening is a
  no-op: `Modal` offers `sm | md | lg` and the lexicon editor was already
  `lg`, so a task saying "widen the size" was unsatisfiable without a
  change to the library. Read the variant's own `cva` declaration (or
  `dist/**/*.variants.d.ts`, which prints the union) BEFORE planning
  around a size, and record the ceiling in the consuming file's TSDoc.
- **Two tsconfig facts that only surface from inside this package.** `lib`
  is ES2022 + DOM, so the ES2023 array methods are NOT typed here —
  `toSorted`, `toReversed` and `with` are each TS2550 on an array while
  `lint` and the runtime are both fine, bun and modern chromium shipping
  them; `[...x].sort()` is the form this package already uses, and
  raising `lib` to satisfy one call widens what every module may reach.
  And `noUncheckedIndexedAccess` is on repo-wide but does NOT reach a
  `Record<UnionOfStringLiterals, V>`, that being a mapped type with
  literal keys rather than an index signature — so a roster-keyed table
  answers `V` and needs no non-null assertion, and adding a `?? fallback`
  hides the very TS2741 that reports a member the table is missing.
- **The established typed-text-beside-value shape** is three lines and is
  worth copying rather than re-deriving: `const [typed, setTyped] =
  useState<string | undefined>(undefined)`, `const text = typed ??
  spell(value)`, then `setTyped(next)` UNCONDITIONALLY in `onChange` with
  the report guarded on the reading. `undefined` rather than `''` is what
  lets the box follow a value edited elsewhere until an operator takes it
  over, and the consequence both existing sites document is that a SAVE
  can be offered while a box shows a refusal. The hold's lifetime is the
  component's MOUNT, so the caller's `key` is load-bearing: without a
  per-member key React reuses the control at a position and one member's
  half-typed text appears in another's box.
