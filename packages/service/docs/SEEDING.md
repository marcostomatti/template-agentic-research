# Seeding — how a seed file is written and applied

`data/` holds what a domain needs before the pipeline can do anything
for it: the domain row itself, the personas each run speaks as, the
taxonomy its terms hang off, and the standing subjects it wants
looked into. `scripts/seed.ts` reads those files and writes the rows.
This document is what to write in one, and what happens to it.

`data/README.md` states the rules the directory is under and names
this file as the one that fixes the format. What follows is that
format, and the rules on content that come with it. The argument
behind each rule stays with the code that enforces it —
`scripts/seed-schemas.ts` for what a row must carry, `scripts/seed.ts`
for how a bundle is read, `scripts/seed-apply.ts` for how one is
written — and the columns underneath are described in
`docs/architecture/02-schema.md`.

## What a seed file looks like

Every file in `data/` is one JSON object with exactly two keys: the
`"_readme"` header, and one key named for the concern the file seeds,
holding that concern's rows.

```json
{
  "_readme": ["SEED FILE. ..."],
  "categories": [
    {
      "domainSlug": "example-tech-radar",
      "key": "technologies",
      "name": "Technologies",
      "parentKey": null
    }
  ]
}
```

The outermost value is an object rather than a bare array of rows,
because an array has nowhere to put a header. Each file's schema in
`scripts/seed-schemas.ts` is strict at that level as well as inside a
row, so a third top-level key — or the concern key misspelled — is an
error rather than a file whose rows are silently never read.

### Members are named for drizzle properties

A member is spelled the way `src/db/schema/` spells the column, in
camelCase: `systemText`, not `system_text`. The rows reach Postgres
through a drizzle insert rather than through hand-written SQL, so a
row is a slice of what that insert takes, and a seed spelled the
other way would need a translation table between the file and the
write for a mismatch to hide in.

### Which members a row carries

Four classes, and the column behind a member decides which it joins.

| The column is | The member is | Which members |
| --- | --- | --- |
| NOT NULL with no default | required | `slug`, `domainSlug`, `role`, `systemText`, `key`, `categoryKey`, `pattern`, `weight`, `polarity`, `intervalSeconds`, and every `name` |
| nullable | required, and written out as `null` where there is nothing to record | `parentKey`, `notes`, `minIntervalSeconds`, `maxIntervalSeconds` |
| defaulted to what absence means | optional | `settings`, `searchTerms` |
| written by something other than a seed author | named nowhere | surrogate ids, `createdAt`, `updatedAt`, and `nextRunAt` and `enabled` on a topic |

A nullable member is written out rather than left off so that a
deliberate absence is distinguishable from one somebody forgot: a
root is not a category missing a parent, and a term with no note is
not a term whose author skipped the field. An optional member is
genuinely optional — the column's default and the member's absence
are the same row, which is why `settings` and `searchTerms` may be
omitted and nothing else may.

The fourth class is what the strictness is for. A surrogate id and
the two timestamps belong to the database, and `next_run_at` and
`enabled` belong to the dispatcher and to the operator. A pass writes
back whatever a seed file states, so seeding `enabled` would switch a
topic back on that somebody had switched off, and seeding a due time
would reset a schedule already in flight. Because no schema names
them, writing one is an unrecognized key and an error rather than a
quiet overwrite of state a seed does not own.

A member that is a key, or that names one, carries a non-empty floor;
a member that is only a label does not. An empty key is the mirror of
a NULL one: NULL never collides, so nothing dedupes, while `''`
always collides, so every row an author could not name folds onto one
row and accumulates whatever the pipeline hangs off it. The three
`name` members split on exactly that: `topics.name` is half of its
table's key and carries the floor, while `domains.name` and
`categories.name` sit beside a key of their own and do not. An empty
one there costs legibility rather than correctness, and so does an
empty `systemText`.

### A parent row is named by its natural key

Three members are not columns at all. `domainSlug`, `categoryKey` and
`parentKey` stand in for `domain_id`, `category_id` and `parent_id`,
because no seed can know a key the database has not issued yet.
`loadSeedBundle` resolves the first two against the rows the bundle
carries; `parentKey` is resolved by the apply pass, against the roots
it has just written.

A reference resolves against the bundle and never against the
database, which is forced rather than chosen: the loader is handed no
connection and opens none. The cost is that a bundle has to be
self-contained. A persona whose domain was seeded by an earlier pass
and has since been dropped from `domains.json` is refused, though the
row it names is sitting in the database.

## Starting a bundle from the scaffold

`bun run scaffold seed-bundle <slug> <target-dir>` stamps all five
files for one domain into a directory of its choosing, each already
carrying a header and rows that validate. It is the one shape that
command emits which has to work on arrival: every other generator it
has writes a placeholder that throws, while a seed refusing to
validate would say nothing about whether the bundle somebody edits it
into would apply.

So its placeholders are in the values instead — an empty `settings`,
one persona per role with an empty `systemText`, a root category and a
child named for the scaffold, one term per polarity, and a topic that
is enabled and never due because no seed names `nextRunAt`. Each is a
value the generator could not decide, written in the form that says so
rather than in an invented one, and each file's own header states
which of them is which.

The personas are where that differs visibly from the seed shipped
here. These files mark their worked-example instructions with the word
`Placeholder`, under the rule below; a scaffold has no instructions to
mark, and an empty `systemText` records that the role exists and has
none yet — which is a state the column is entitled to hold, and the
one placeholder a model could not go on and follow.

The target directory is an argument and the command overwrites
nothing, so it cannot be pointed at `data/` while these five files
exist: it checks every path before writing any, refuses, and leaves
the directory as it found it. Stamp a bundle elsewhere and move across
what is wanted. `tests/scripts/scaffold.test.ts` holds every emitted
file to the schema `scripts/seed-schemas.ts` exports for its concern
and then loads the whole directory through `loadSeedBundle`, which is
what says a stamped bundle would survive `bun run db:seed` before
anybody has edited it.

## Every file opens with a `"_readme"`

The header is required. The reason is in `data/README.md`, under
§"Every seed file carries a header": a seed file is usually met on
its own, in a diff or an editor tab, where nothing about the content
says which path owns it.

It is an array of strings, one entry per line as that line should
appear, with an empty entry between paragraphs. Wrap so no line of
the header exceeds 74 columns as it sits in the file — four spaces of
indent, the opening quote, the text, and the closing quote and comma.

All five files open with the same two paragraphs, eleven entries
including the blank one after each. Copy them from any file in `data/`
rather than from here: one says the file is a seed, that
`scripts/seed.ts` applies it, and that nothing in the directory is
read at runtime; the other says that underscore-prefixed keys are
stripped, which is what lets the header be there at all. A sixth copy
in this document would be one more place for the wording to drift,
with nothing to report it when it does.

What a file adds after that opening, in this order:

- which table it seeds and the natural key it is upserted on, so a
  reader knows what a second pass does to the rows below it;
- every member that is not a column, and which key each stands in
  for;
- anything the file chose that no schema and no constraint fixes — an
  `ignore` term's weight, a topic's cadence — stated as this file's
  choice and not as a rule, because the shipped seed is the only
  worked example here and an arbitrary value in it becomes the
  convention otherwise;
- a closing note that the rows are an illustration.

## Keys beginning with an underscore are stripped

`stripUnderscoreKeys` in `scripts/seed.ts` removes every object key
beginning with an underscore, at every depth, before anything is
validated or written. That is what lets a seed file carry a header at
all: the schemas reject a key they do not name, so `"_readme"` would
otherwise be the first thing reported wrong with every file, and
naming it in each schema would spend that strictness on the
convention.

The strip is recursive rather than top-level because a note belongs
wherever a reader meets the thing it describes. Today only the
outermost object of each file carries one, but a note about a single
row belongs on that row, and a note carried into an insert is a key
no column answers to. The walk descends through arrays — a seed's
rows are objects inside one — and leaves their length and order
alone, an array having no keys of its own to drop.

Two limits, both worth knowing before writing a note:

- the filter reads a key's name and nothing else, so commentary under
  a key without the prefix is a member no schema names, and is
  reported as one;
- the underscore has to lead. `_note` is stripped; `field_note` is
  not, and is refused like any other unrecognized key.

## The natural key each concern is upserted on

| Concern | File | Table | Upserted on | Names its parent by |
| --- | --- | --- | --- | --- |
| domains | `domains.json` | `domains` | `slug` | — |
| personas | `personas.json` | `personas` | (domain, `role`), the pair `personas_domain_id_role_unique` holds | `domainSlug` |
| categories | `categories.json` | `categories` | (domain, `key`), the pair `categories_domain_id_key_unique` holds | `domainSlug`, and `parentKey` for a child |
| terms | `terms.json` | `terms` | (category, `pattern`), the pair `terms_category_id_pattern_unique` holds | `categoryKey` |
| topics | `topics.json` | `topics` | (domain, `name`), the pair `topics_domain_id_name_unique` holds | `domainSlug` |

Those are the only keys a seed can spell, an id being the database's
to issue, and they are also the only ones it would be safe to key on.
A pass that deleted and re-inserted instead would reissue every id
and take the findings, criteria and research citing the old ones with
it.

The consequence for an author is that a natural key is the one field
in a row that is not safe to edit in place. Rename a term's `pattern`
and the next pass writes a second term rather than renaming the
first, because from the pass's side a renamed row and a new one are
the same thing.

The order above is the order the rows are written in, which the
foreign keys force: a domain before anything naming one, a category
before the terms hanging off it, and — within `categories.json` —
every root before the rows naming one. It is also the order the
loader reports failures in, so two runs over one broken bundle print
the same list.

`terms.json` names its category by `key` alone, which is half of that
table's (domain, key) key. With one domain seeded that names one row.
A second domain reusing a key would make the member ambiguous without
making it unresolved, and `data/terms.json`'s own header records the
choice as belonging to whoever adds that domain.

### What a second pass does

`applySeedBundle` reads each row under its natural key before writing
it, holds what is stored against what the file states, and reports
the row as created, updated or unchanged. So the same files applied
twice with no edit between report everything unchanged the second
time, and what an operator asks after a run — whether it did what the
edit intended — is answered by `updated: 1` beside `unchanged: 40`
rather than by a count of rows touched.

The whole pass is one transaction, so a bundle the database refuses
partway through rolls back the concerns already written: a broken
bundle is an edit and another run rather than an edit and a
reconciliation.

What a pass never does is delete. A term dropped from `terms.json`
stays in the database, because a row removed from a seed and a row
somebody added another way are indistinguishable from the pass's
side. Removing one is a DELETE somebody issues.

## Rules on what a seed carries

Three rules bind a seed's content rather than its shape, and
`data/README.md` argues all three. What each asks of an author, and
which of them anything checks, is below.

### Seed content stays domain-neutral

A seed tracked here carries structure — the shape of a domain, its
taxonomy, its cadence — and never a particular subject's vocabulary.
The platform is domain-parameterized: the subject a deployment
researches is data its operator supplies, so `example-tech-radar`
exists to show the shape and is nobody's radar. Real subject matter
reaches the database through an operator's own seeds, and a real
hostname, credential or personal datum reaches nothing tracked at all.

That gives a test for a row worth shipping. One that exercises
something closed earns its place: the example's field contract names
seven fields covering all six members of `DomainFieldType`, so the set
is exercised rather than sampled and whatever validates a contract
later has a case for each. One chosen because it reads plausibly does
not. And a row says as much in its own text — each seeded persona
opens with the word `Placeholder`, because a persona is met in a
database row or an API response with no file in view.

### `data/` is scanned for origin naming

The directory is one of the scan roots of the naming invariant
(`tests/invariants/naming.test.ts`): every file here is read like the
scanned source beside it, and a hit fails the default suite naming the
file and the line.

What it looks for is a fixed set of names — the origin project's short
prefix and its repository name, the host that deployment ran under,
and two forms of a personal note-store reference. So it holds the
naming half of the rule above and no more than that. A subject's
vocabulary is on no needle list, and a seed full of one domain's terms
passes `bun run test` without a word: that half is held by review,
which is worth knowing before reading a green run as agreement.

### Nothing here is read at runtime

`scripts/seed.ts` is the only code path that takes a value out of a
file in `data/`. From the first pass on, the database is what reads a
seeded value — the service, the workflows and the scripts alike — so a
file here is how a row gets in, and never what anything consults
afterwards.

The consequence for an author is where a value goes rather than how it
is written: something that has to be true while the service runs
belongs in a row, in a domain's `settings` or in a table of its own. A
file here would be a second source of truth, and the two drift the
moment somebody edits a row a file also declares. The naming invariant
walking the same directory is not the exception it looks like — it
opens these files to check the names in them and takes no value out of
one.

## Adding a domain

A second domain is rows rather than a fork. Nothing below is a
migration or a code change, because one schema serves every domain: a
row belongs to one either directly, through a `domain_id`, or through
the parent that carries one, as a term does through its category. No
table is per-domain, and `domains.slug` is what tells two apart.

1. **Add the domain.** One row in `data/domains.json` with a slug
   nothing else uses, a display name, and as much of `settings` as
   differs from the pipeline's defaults. An absent settings member
   means the default applies, so a domain configures only what it
   wants to change.
2. **Add its personas.** One row per role in `data/personas.json`,
   each naming the new slug in `domainSlug`. `personas.role` carries
   no CHECK, so a role beyond the three the pipeline plays today is a
   row rather than a migration.
3. **Add its categories.** One row per bucket in
   `data/categories.json`, each naming the new slug and carrying
   `parentKey`. Nesting is capped at one level by a trigger on
   `categories`, so a `parentKey` may only name a root — and the
   apply pass refuses one that names no root of the same bundle
   before the trigger is ever reached.
4. **Add its terms.** Rows in `data/terms.json` naming those category
   keys. Note the ambiguity above if a key is one another domain
   already uses.
5. **Add its topics.** Rows in `data/topics.json` naming the new
   slug, each with the queries it issues and its cadence. A seeded
   topic is configured and not yet due: `next_run_at` is NULL until
   something writes one.
6. **Correct the headers the new rows falsify.** A `"_readme"` that
   says the bundle holds one domain, or that a category key names one
   row, stops being true the moment a second domain lands. A header
   is stripped before anything is validated, so nothing ever holds
   one against the rows below it.
7. **Apply it.** With the migrations applied (`bun run db:migrate`),
   run `bun run db:seed` from `packages/service`. The database is the
   one `DATABASE_URL` names, read through `src/config.ts`. The whole
   bundle is validated first, so a bundle with anything wrong in it
   is refused before a connection is opened and before a row is
   written — and the refusal names every file and field at fault, not
   the first.
8. **Run it again.** A second pass over unedited files reports every
   concern unchanged. That is the cheapest confirmation that the run
   applied what the files state and that a natural key was not
   changed by accident, which would show up as a row created rather
   than updated.

What a seeded domain does not have yet: `sources`, `criteria`,
`connectors` and `export_subscriptions` carry no seed file, so a
domain configured this way has a taxonomy, personas and a schedule,
and no feed to read. Those rows reach the database another way until
a seed file covers them.
