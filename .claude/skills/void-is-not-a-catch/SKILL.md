---
name: void-is-not-a-catch
description: "Use when auditing or writing `void somePromise.then(...)` — the operator silences the lint rule and attaches no rejection handler."
prevents: "an unhandled rejection shipped under a `void` that was read as handling it"
signal: silent
when_to_use: "You are writing or reviewing a fire-and-forget promise call site, or auditing a file for unhandled rejection paths. Prevents: an unhandled rejection shipped under a `void` that was read as handling it"
tags:
  - typescript
  - async
  - review
stack:
  - typescript
---

# void-is-not-a-catch

`void` is a unary operator: it evaluates its operand and discards the
result. It has NO runtime effect on promise rejection handling. So

```ts
void computePosition(anchor, panel, opts).then(apply);
```

satisfies `no-floating-promises` and still lets a rejection of
`computePosition` reach the unhandled-rejection path — and the `.then`
callback's own throw with it, since `.then(fn)` returns a new promise
nobody is holding. The lint rule's contract is "you acknowledged this
promise", not "you handled its failure", and the two are easy to
conflate precisely because the operator is what the rule's own
autofix suggests.

## The audit

`void` marks the call sites worth checking rather than the safe ones.
Grep the non-test sources for `.then(` and hold every hit to one of
two shapes:

- **Documented-total** — the promise provably cannot reject, with the
  reasoning written at the call site and, better, measured (a probe
  against `process.on('unhandledRejection')`).
- **Wrapped** — a `.catch(...)` on the tail, or the whole thing inside
  `try`/`await`/`catch`.

A call site with neither is the finding. In a codebase where the
sibling call sites all carry one of the two shapes, the odd one out is
a strong signal rather than a style nit: the convention is doing the
work an `await` would, and a gap in it is unreviewed rather than
deliberate.
