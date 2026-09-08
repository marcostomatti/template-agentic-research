## Plans and specs

`.plans/` and `.specs/` are the destinations for working plans and specs,
and they are **gitignored on purpose**: these files routinely describe
critical bugs (privacy/security) before they are patched, and must never
reach the remote ahead of the fix. Rules:

- Generated plan artifacts (`PLAN-<stub>.md`, `PREREQUISITES-<stub>.md`,
  `PLAN_TRACKER-<stub>.md`) live in `.plans/` — `ralph plan` writes there,
  and the loop's commit step can then never pick them up by accident.
- Specs you are actively working from go in `.specs/`. There is no tracked
  `specs/` directory here — a follow-up whose subject is already visible in
  the public code is written up in `docs/` or on the `context/` page
  that owns the behaviour (the control-plane hardening notes live in
  `context/control-plane.md`); when in doubt, `.specs/`.
- Never "tidy" these files into a tracked path, and never weaken the
  `.gitignore` entries.
