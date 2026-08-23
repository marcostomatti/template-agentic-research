# data — seed files only

Every file in this directory is a **seed**: input applied once to the
database by `scripts/seed.ts` at setup. Nothing here is a config file, a
fixture, or a lookup table the running service consults. What sits here
seeds one worked example domain: `domains.json` for the domain row,
`personas.json` for the roles each run speaks as, `categories.json` and
`terms.json` for the taxonomy underneath it, and `topics.json` for the
standing subject it wants looked into. Phase 2 landed those files,
`scripts/seed.ts`, and the seed-authoring guide `docs/SEEDING.md`, which
fixes the format each of them is written in.

Phase numbers throughout refer to the 7-phase sequencing in the parent
design, `.specs/2026-08-19-research-pipeline-port.md` §7.

## Nothing here is read at runtime

Postgres is the single source of truth for the pipeline's configuration.
A seed file is how a row *gets* into the database; from that point the
database is what every reader uses — the service, the workflows, and the
scripts alike.

Reading a file from this directory at runtime would break that in three
ways at once:

- it creates a second source of truth, and the two drift the moment
  someone edits a row that a file also declares;
- an operator's change through the database becomes invisible to whatever
  reads the file, and vice versa;
- the file has to exist wherever the code runs, so a deployment that ships
  only the built service starts behaving differently from a local one.

The rule is therefore absolute, not a default: no code path outside
`scripts/seed.ts` opens a file in this directory.

## Every seed file carries a header

Each file here opens with a header stating that it is a seed, that
`scripts/seed.ts` applies it, and that it is not read at runtime — the
same three facts this README states, repeated in the file itself.

The repetition is deliberate. A seed file is usually met on its own, in a
diff or an editor tab, with no directory listing and no README in view,
and its content alone gives no hint of which path owns it. The header is
what stops a file from being mistaken for live config and wired into a
reader, and what tells a contributor adding a file here which rules it
inherits. `docs/SEEDING.md` fixes the exact format: what the header key is
called, the two paragraphs every file opens with, and what each file adds
after them.

## Seed content stays domain-neutral

This platform is domain-parameterized: the subject a deployment researches
is data, not code. Seeds tracked in this repo therefore carry structure —
the shape of a domain, its sources, its criteria — and never a particular
subject's vocabulary. The worked example here exists to show the shape and
is written as a neutral illustration; real subject matter belongs to
whoever operates an instance, and reaches the database through their own
seeds.

Two consequences worth stating plainly:

- no seed here reproduces the vocabulary of the origin project this
  pipeline was ported from, or of any other single subject domain;
- no seed here carries a real hostname, credential, or personal data —
  those belong in the untracked environment, never in a tracked file.

This directory is one of the scan roots of the naming invariant
(`tests/invariants/naming.test.ts`), so the origin's own names — its
prefix, its repository, the host it ran under, the note-store paths — are
refused by the default test suite rather than left to review. That needle
set is fixed and holds no subject's vocabulary and no hostname but that
one, so the rest of both rules above is held by review. `docs/SEEDING.md`
§"`data/` is scanned for origin naming" states the split as it reaches
somebody writing a file.
