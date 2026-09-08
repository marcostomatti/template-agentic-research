## Accessibility and motion — measured, with a standing ledger

Every reading here was taken against the app as built, twice and
deterministically, and the ones that are DEBT are recorded as ledgers
that the repair reds rather than as bare zeros.

- **The app carries THREE serious-impact axe violations at the merge
  base, all owned by `@ar/ui` and none reachable from here.**
  `aria-progressbar-name` (1 node, every surface): `SidebarWeekSummary`
  renders `Progress` with no accessible name. `aria-dialog-name` (1
  node, every modal): `Modal` puts `aria-labelledby` on its role-less
  panel while `role="dialog"` sits on the `Overlay` one level up, and
  `Overlay` takes a `label` prop for exactly this that `Modal` never
  passes, so no call site can name a dialog. `color-contrast`:
  `Badge.variants.ts` pairs each tone with a wash of itself and the
  `--fg3` token reads 2.53:1 at 11.5px. `tests/e2e/a11y.spec.ts`
  carries them as a LEDGER compared by SET EQUALITY, which is the
  shape to copy for any scan whose honest answer is non-zero: a new
  finding reds it, AND a ledger entry that has stopped having a
  subject reds it too, which is the half an allowlist cannot do. The
  ledger is also its own liveness control, since a scan that reached a
  blank page answers an EMPTY set. Pin a node COUNT only where the
  rule is renderer-independent — a markup rule is safe,
  `color-contrast` is not, axe moving a node it cannot resolve to
  `incomplete` rather than to `violations`.
- **Focus is NOT returned to the control that opened a modal,
  anywhere.** Radix's `DialogContentModal` cancels its own restore and
  focuses `context.triggerRef.current` instead, which is filled by a
  `Dialog.Trigger` — and `Overlay` renders none, these modals being
  opened by a ROUTE. So `document.activeElement` is the BODY after
  every close (measured on all seven modal addresses, both openers,
  Escape and Cancel alike), and the next Tab restarts the whole shell.
  Carried in, and UNREPAIRABLE from this package: `Overlay` does not
  forward `onCloseAutoFocus`. The spec therefore asserts the body, as
  a documented ledger, with the opener asserted still visible and
  enabled beside it so the red is about focus and never about a
  control that vanished.
- **An open `Modal` `aria-hidden`s the app root**, and that has a
  locator half and an axe half. `page.getByRole('main')` resolves to
  ZERO elements while a dialog is open, taking every locator scoped
  under it (a CSS one included), so a grid/rail/topbar assertion is
  taken BEFORE the modal opens or AFTER it closes. And axe does not
  walk hidden subtrees, so scanning a modal address reports the DIALOG
  alone — which makes a modal address answering the SURFACE set the
  reading that says the dialog never opened. Assert the dialog visible
  before scanning.
- **`.animate-shimmer` is the app-wide settled-state handle.**
  `@ar/ui`'s `Skeleton` is its only user, and every page and modal
  renders one while its read is in flight, so
  `expect(page.locator('.animate-shimmer')).toHaveCount(0)` waits out
  every stand-in at once. It matters most for a SCAN: a `Skeleton` is
  `aria-hidden`, so axe walks straight past one and a scan taken
  mid-load reports a CLEAN page having read no content at all.
- **`test.use({ reducedMotion })` is GONE at the pinned 1.62.1**, and
  its two failure modes need separating because one is silent. The
  flat option is not in `PlaywrightTestOptions` (TS2353), but a test
  DESTRUCTURING it is still handed `'reduce'` while the browser
  context is never told — so a file that suppressed the type error
  runs every case in the DEFAULT state and passes. Use
  `test.use({ contextOptions: { reducedMotion: 'reduce' } })` or
  `page.emulateMedia`, and assert
  `matchMedia('(prefers-reduced-motion: reduce)').matches` in the
  Arrange: it is the only reading separating a reduced-motion case
  from one that quietly ran in the default state. Expect the same
  shape for `forcedColors` and `contrast`.
- **`@ar/ui` reduces motion through TWO independent mechanisms** and a
  spec needs a subject for each: Tailwind's `motion-reduce:animate-none`
  on a CVA variant (`StatusIndicator`, `Skeleton`, `Progress`), and a
  global `*, *::before, *::after` rule in `tokens.css` capping
  animation and transition duration at `0.01ms !important`. The second
  reaches INSIDE the Radix portal (measured), which is worth checking
  rather than assuming. The whole app's settled-state motion inventory
  is TWO `pulseRing` dots, derived by walking every element and
  reading `getComputedStyle(node).animationName` — so a motion
  sweep over the other five surfaces is a zero-hit scan whose only
  liveness control is the sources surface. `Overlay` itself ships NO
  enter/exit transition, so a claim about a modal TRANSITION settling
  has no subject in the frame; the modal motion that exists is inside
  it (`Switch`'s knob is `transition-[left] duration-150`).
- **"Not animating" is a rAF WINDOW reduction, never an instant.**
  `expect.poll` retries until the assertion PASSES, so an animating
  element satisfies an instantaneous read on whichever frame happens
  to match and the case is vacuous. Return the widest deviation across
  N `requestAnimationFrame` samples taken inside ONE browser task, and
  press-and-sample inside one `page.evaluate` — a click issued from
  node returns after the 150ms has already elapsed and reads the same
  zero the settled case does, so a node-side press makes the control
  silently agree with what it was meant to discriminate against.
  `offsetWidth` against `getBoundingClientRect().width` is the free
  transform-blind / transform-aware pair, which lets ONE element
  supply both the reading and its expectation.
- **The shell has NO responsive behaviour of any kind.**
  `appShellSidebar` is a flat `w-[var(--sidebar-w)]` with no media
  query, measured at 264px identically at 320, 768, 1024 and 1440, and
  `AppLayout` seeds collapse as a plain `useState(false)` with nothing
  watching the viewport. A 320px shot is therefore a 264px rail beside
  a 56px content column — a picture of the rail. Record that rather
  than working around it in a spec; open debt for whoever owns the
  `packages/ui` shell.
- **The DOCUMENT scrolls and the shell's own scroller does not**,
  which is the reverse of what the markup suggests: `AppShell` is
  `h-full` inside a body with no height, so it sizes to content, while
  `AppShellContent`'s `overflow-y-auto` reported `scrollHeight ===
  clientHeight` on every surface at every width. So `fullPage: true`
  genuinely reaches everything below the fold, and a spec that scrolls
  the inner slot to reveal a row is driving a scroller that never
  scrolls.
- **`tokens.css`'s Google Fonts `@import` is DROPPED** and the app
  renders in the host's `system-ui` fallback. The postcss `@import
  statements must precede all other statements` warning on every dev
  boot IS the whole story: measured zero offsite requests and
  `document.fonts.size === 0` on a settled page. Good for a screenshot
  suite (no webfont race to lose) and a real finding otherwise — any
  typography claim about the declared display and body families is
  currently false.
