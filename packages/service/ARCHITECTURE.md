# Architecture — the index of `docs/architecture/`

The platform shape and the same-commit doc-update law live in
[`docs/architecture/00-overview.md`](docs/architecture/00-overview.md);
this file is the index of that directory and holds nothing else.

| Document | What it covers |
| --- | --- |
| [`docs/architecture/00-overview.md`](docs/architecture/00-overview.md) | The three parts and the one schema they share, the layout of `packages/service`, the core vocabulary, which document covers each behaviour area and the law that keeps it true, and the test harness. |
| [`docs/architecture/01-invariants.md`](docs/architecture/01-invariants.md) | The register of platform-wide invariants: what each one is, the artifact that fails when it stops holding, the phase that lands that artifact, and whether it is enforced today. |
| [`docs/architecture/02-schema.md`](docs/architecture/02-schema.md) | Schema v2: the twenty-two tables by area, the rules the database holds itself rather than leaving to whoever writes the row — the null-vs-zero classes, the `documents.hash` dedupe pair, the schedulable-row contract, the approval CHECK and the category depth cap — and which of them the generated migration owns and which the hand-written one. |
