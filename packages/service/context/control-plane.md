## Operator control plane

`lib/express/control/` is the framework's `/_control` surface — status,
dependency listing, per-dependency pause/resume/restart, client reset and
stop — mounted by `createService` whenever `control` is configured. It is
vendored from the service template this package forks and diverges from
that origin deliberately at the points below; a reader who finds the
template otherwise reads each divergence as a mistake.

**`POST /_control/stop` is opt-in.** `ControlConfig.allowStop` defaults to
`false`, so a config that enables the plane keeps every other route and
loses the one that ends the process. A refusal answers 404 and not 403 —
the same answer the whole plane gives while `enabled` is `false` — so a
caller already holding a valid token is not told that a shutdown endpoint
exists here and is merely switched off. The check sits inside the handler
rather than skipping the `router.post` registration, so a refusal carries
this router's own body rather than whatever the host application answers
for an unmatched path.

**The token compare is timing-safe.** `controlAuth` reduces both the
supplied `x-control-token` and the configured secret to fixed-length
SHA-256 digests and compares those with `crypto.timingSafeEqual`, so what
a rejection costs does not vary with how much of the token was correct.
The digest step is not decoration: `timingSafeEqual` throws `RangeError`
on operands of unequal length, so comparing raw tokens would turn a
wrong-length token into an exception rather than a rejection, and which
of the two paths ran would itself disclose the secret's length. A token
shorter than the secret, one longer than it, and one the same length but
different in content all reach the same constant-time compare.

**The version is resolved relative to the module.** `readServiceVersion`
walks up from `dirname(fileURLToPath(import.meta.url))` to the first
readable `package.json`. It used to join against `process.cwd()`, which
belongs to whoever launched the process — so a service started from a
parent directory reported that directory's version, or `'unknown'`, with
no error to show for it. `ControlConfig.version` short-circuits the read
entirely and is the escape hatch for a bundled deployment with no
`package.json` above the module. Both the probe and the read go through
the single `_impl.readFile` seam, which makes a candidate that throws
indistinguishable from an absent one: the match is the first READABLE
`package.json`, and a malformed one is still the match rather than being
skipped in favour of an ancestor's.

A field added to `ControlConfig` is only half-added until the matching key
lands in the `control` object of `lib/express/schema.ts`. The interface
reaches that validator through a cast and a zod object strips the keys it
does not declare, so the compile-time and runtime halves drift silently —
and the drift is not cosmetic: `createControlRouter` is not exported from
`lib/express/index.ts`, and its only production caller hands it
`config.control`, which is the zod OUTPUT, so an interface-only field can
never reach the router. `allowStop` and `version` are each declared in
both places for that reason. No gate here says so — lint, `check-types`
and the suite are green either way.

Both gates ahead of the routes are router-level `router.use` layers, so
the 404 for a disabled plane and the 403 for a bad token are decided one
layer out from any per-route check. A per-route gate such as `allowStop`
can therefore only move requests that were already reaching the handler,
and a 404 from `/_control` is ambiguous by construction: disabled plane,
unmatched path and refused stop all answer the same, so a test asserting
one of them needs a sibling assertion to say which it got.
