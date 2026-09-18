---
name: react-hooks
description: "Use when an effect calls setState or writes upstream — reset-on-open, derived state, a write-once seed that loops forever, or a cascading-renders or exhaustive-deps warning."
prevents: stale per-session state, cascading re-renders from setState called inside an effect, and an infinite render loop from a mount-time write-back whose write is refused
signal: loud
when_to_use: "Recognize these shapes:. Prevents: stale per-session state and cascading re-renders from setState called inside an effect, and a mount-time write-back that retries forever when the write is refused"
tags:
  - react
  - hooks
  - typescript
stack:
  - typescript
---

> Scope: file paths in this document are relative to `packages/ui/` (the `@ar/ui` package), except `.claude/`, `.plans/`, `.specs/` and any path beginning `packages/`, which are relative to the umbrella repo root.

# Removing setState — and refused write-backs — from useEffect

## Overview

**An effect that calls `setState` to derive or reset state is almost always the wrong tool.** Effects exist to synchronize React with *external* systems (DOM, timers, subscriptions, network). State that can be computed from props/other state belongs in render; state that resets per "session" belongs to the mount lifecycle.

This repo repeats the same anti-patterns across modals and overlays: reset-on-open (Fix A), derived/synced state (Fix B), and genuine effects carrying a synchronous reset (Fix C). A fourth shape writes no local state at all and so trips no lint rule — a mount-time seed sent *upstream* through a parent's callback, which loops forever when the write is refused (Fix D). Reference: https://react.dev/learn/you-might-not-need-an-effect

## When to use

Recognize these shapes:

- **Reset-on-open:** `useEffect(() => { if (open) { setForm(existing ?? DEFAULT()); setTab(0); } }, [open, existing])`
- **Derived/synced state:** `useEffect(() => { setX(deriveFrom(y)); }, [y])` (filtering, mapping, recomputing)
- **Genuine effect + a synchronous reset:** a real `setInterval`/DOM-measure/subscription effect that *also* does `if (!open) { setX(reset); return }` or seeds an initial value synchronously — only the reset is flagged (Fix C)
- **Write-once seed that writes UPSTREAM:** `useEffect(() => { if (value === undefined) onValueChange(path, fresh()); }, [..., value, onValueChange])` — the effect does not `setState` at all, it calls a callback the *parent* owns (Fix D)

Or these signals:
- IDE/ESLint: *"Calling setState synchronously within an effect can trigger cascading renders"*
- `react-hooks/exhaustive-deps` warning (a dep like `existing` or the derived source is "missing")
- A modal shows **stale data when reopened** for a different item, or shows it correctly only because an effect papers over it.

**Do NOT apply to legitimate effects** — leave these alone:
- DOM sync: `document.documentElement.setAttribute('data-theme', theme)`
- Timers/animation: `setInterval` driving a counter
- Subscriptions / event listeners / network side effects

If the effect talks to something *outside React*, it stays. If it only moves React state around, remove it. **But if a legitimate effect *also* calls `setState` synchronously (a reset on its off-branch, or seeding an initial value), that one call is still flagged — keep the effect, strip the synchronous reset (Fix C).**

## Fix A — Reset-on-open → unmount + lazy init

The bug: a component kept permanently mounted only runs `useState(initial)` once, so it leaks state between uses. The effect is a workaround. The real fix is to **make a fresh session = a fresh mount**.

**Parent** — mount only while open (unmount discards state for free):

```tsx
// ❌ Before: always mounted, state leaks between opens
<Editor open={open} onClose={close} existing={editing} />

// ✅ After: mounted only while open
{open && <Editor open onClose={close} existing={editing} />}
```

**TS note (this repo):** the "currently editing" state is usually typed `T | null` while the child prop is optional (`existing?: T`, i.e. `T | undefined`). Passing `null` to that prop is a type error, so write `existing={editing ?? undefined}`. Incoming JSX often masks this with `existing={editing as T}` — that cast lies (the value really is `null` on the create path). Use `?? undefined`, don't reintroduce the cast.

**Child** — lazy-init from props, delete the reset effect:

```tsx
// ❌ Before
const [form, setForm] = useState(existing || DEFAULT());
useEffect(() => { if (open) { setForm(existing || DEFAULT()); setTab(0); } }, [open, existing]);

// ✅ After — runs once per mount, no effect
const [form, setForm] = useState(() => existing ?? DEFAULT());
const [tab, setTab] = useState(0);
```

Modals here (`Modal`/`Drawer`) return `null` when closed and have only an *enter* animation — so unmounting the parent breaks no exit transition.

## Fix B — Derived/synced state → render or event handler

```tsx
// ❌ Before: extra render + exhaustive-deps warning
const allowed = useMemo(() => toolsForModel(form.model), [form.model]);
useEffect(() => {
  const ids = new Set(allowed.map(t => t.id));
  setForm(f => ({ ...f, tools: f.tools.filter(t => ids.has(t)) }));
}, [form.model]);

// ✅ After: prune in the handler that changes the model (one atomic update)
const selectModel = useCallback((modelId: string) => {
  setForm(f => {
    const ids = new Set(toolsForModel(modelId).map(t => t.id));
    return { ...f, model: modelId, tools: f.tools.filter(t => ids.has(t)) };
  });
}, []);
```

Rule of thumb: **pure derivation → compute in render (`useMemo` if expensive); a change caused by a user action → do it in that event handler.**

## Fix C — Genuine effect that *also* resets synchronously

The effect is legitimately external sync (a `setInterval`, a `getBoundingClientRect` measure, an event-listener subscription) **but** also calls `setState` synchronously — usually `if (!open) { setX(reset); return }`, or seeding an initial value before the real work. Only that synchronous `setState` is flagged; the external-sync work is fine. **Keep the effect; remove the synchronous reset.** How depends on who owns the open/on flag.

**C1 — a parent owns the flag and can unmount** (e.g. a log stream's streaming `setInterval`). Conditional-mount the parent (Fix A) and fold the seed/reset value into `useState`. The effect then does *only* the external work, with `[]` deps:

```tsx
// ❌ Before — reset + seed are synchronous setState inside the effect
const [visible, setVisible] = useState(0);
useEffect(() => {
  if (!open) { setVisible(0); return; }  // ← flagged (reset on close)
  setVisible(1);                          // ← flagged (synchronous seed)
  const iv = setInterval(() => setVisible(v => v + 1), 380);
  return () => clearInterval(iv);
}, [open]);

// ✅ After — parent renders {open && <LogStream/>}; effect is timer-only
const [visible, setVisible] = useState(1); // seed lives in the initializer
useEffect(() => {
  const iv = setInterval(() => setVisible(v => v + 1), 380);
  return () => clearInterval(iv);
}, []);
```

**C2 — the component owns its own flag, so there's no parent to unmount** (e.g. a popover's internal `open`). The reset is usually *redundant*: if render is already gated on the flag (`{open && coords && …}`) and the value is recomputed on each activation, just delete it. (Only if the value were read while off would you move the reset into the handler that flips the flag off — never leave it in the effect.)

```tsx
// ❌ Before — setCoords(null) on close is the flagged synchronous reset
useEffect(() => {
  if (!open) { setCoords(null); return; }  // ← flagged; redundant
  computePosition();                        // recomputes on every open anyway
  /* …attach scroll/resize/click/key listeners… */
}, [open]);

// ✅ After — keep the genuine measure + subscription, drop the reset
useEffect(() => {
  if (!open) return;
  computePosition();
  /* …attach scroll/resize/click/key listeners… */
}, [open]);
```

`computePosition()` calls `setCoords` too, but indirectly through a helper — the lint rule only flags *direct* synchronous `setState` in the effect body, so it stays quiet. Stale coords while closed are never read (the portal is gated on `open`).

## Fix D — a write-once seed that writes UPSTREAM

The effect calls no `setState`, so none of the shapes above match it and no lint rule fires. It calls a callback the **parent** owns, intending to write a default exactly once:

```tsx
// ❌ Before — loops forever the moment the write is refused
useEffect(() => {
  if (value === undefined) onValueChange(path, freshEnumValue(def));
}, [def, path, value, onValueChange]);
```

This is correct only under two assumptions it never states, and both can be false at once:

1. **The write always lands**, so `value` stops being `undefined` and the effect stops re-qualifying. A write that is validated *upstream* — against a whole payload rather than the touched member — is refused whenever anything **else** in that payload is invalid. The guard's own condition then never changes.
2. **`onValueChange` is stable.** A caller handing down an inline arrow (`onValueChange={(p, v) => …}`) recreates it every render, so the dep array changes on every render of the parent — for reasons having nothing to do with this field.

Together they are an infinite loop: render → effect → refused write → parent re-renders → new callback identity → effect → … The artifact is React's `Maximum update depth exceeded`, and it reaches no test that does not render the component with a value of `undefined` *inside an otherwise-invalid payload*.

**The fix is a ref scoped to the mount**, because "once" is a property of *this mount* and not of any value in the dep array:

```tsx
// ✅ After — attempted once per mount, whatever the write answers
const attempted = useRef(false);

useEffect(() => {
  if (value === undefined && !attempted.current) {
    attempted.current = true;
    onValueChange(path, freshEnumValue(def));
  }
}, [def, path, value, onValueChange]);
```

Memoizing the parent's callback (`useCallback`) narrows the loop but does not close it: assumption 1 stands on its own, and the next unrelated state change in the parent re-fires the effect anyway. Fix the ref; memoize as well if the callback has other consumers.

`packages/web/src/dynamic-form/ChoiceField.tsx` is the worked example, with the reasoning in a comment above the ref.

### Recognizing it before it bites

Ask of any effect that writes a default: **what happens if this write is refused?** If the answer is "the guard re-qualifies next render", the effect needs a mount-scoped flag. The two aggravating ingredients — validation over a wider unit than the write, and a non-memoized callback prop — are each individually harmless and are invisible from inside the component.

## Quick reference

| Shape | Fix |
|-------|-----|
| Reset form/step when `open` flips true | Conditional-mount parent + lazy `useState(() => …)`; delete effect |
| Filter/recompute state B from state A | Compute in render / `useMemo`, or update in the event handler |
| `setX` in effect on `[a]` derived purely from `a` | Derive during render |
| DOM attr, `setInterval`, subscription | **Keep** — genuine external sync |
| Genuine effect that *also* resets state synchronously when closed | Keep the effect; lift the seed into `useState` + conditional-mount if a parent owns the flag (C1), or delete the redundant reset if the component owns it (C2) — **Fix C** |
| Effect seeds a value by calling a callback the PARENT owns, and the write can be refused | Gate on a `useRef` flag scoped to the mount, not on the value the write was supposed to change — **Fix D** |

Each Fix A also needs its parent to mount conditionally (`{open && <…/>}`).

## Common mistakes

- **Fixing the child but not the parent.** Lazy `useState` still runs once; without unmount-on-close the state never resets. Both edits are required for Fix A.
- **Reaching for `key={id}` instead of unmounting.** A stable id won't remount when reopening the *same* item after a cancel, so discarded edits persist. Unmount-on-close is unconditional; prefer it.
- **Deleting a genuine effect.** DOM/timer/subscription effects look similar but sync with the outside world — keep them.
- **Leaving the now-unused `useEffect` import** after removing the last effect (TS6133 / lint noise).
