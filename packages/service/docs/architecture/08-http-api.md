# HTTP API — the route surface and the rules every route obeys

Wave 1 of the HTTP API is four resource groups over schema v2:
domains, the taxonomy of categories and terms, personas, and the
single operator settings row. This document is the map of what they
share — the two envelopes on the wire, the pagination vocabulary,
the guard every route sits behind, what a validation failure is
allowed to say, and the paths each router declares.

Wave 2 adds four more groups over the same schema: topics, sources,
the deployment's connectors, and the export subscriptions that
answer under `/exports`. What THEY share sits below the wave-1
groups — the two schedule verbs and the one column they may
write, the columns the pipeline owns and never accepts, the
connector-secret mask, and the read-only failures queue.

Wave 3 adds five more groups over the same schema and takes the pair
wave 2 deferred: the findings a scoring pass produced and the
verdicts an operator rules on them with, the raw documents behind
them, the entity registry and its research approvals, the run ledger
with the spend summary over it, and the pending-config queue on
`/sources/:id`. What THEY share sits below the wave-2 groups — the
read-first law the ports carry rather than promise, the per-domain
verdict vocabulary, the time-window and sort vocabulary two groups
read, the one cap stored untrusted text is cut at, the approval
vocabulary both gates answer in, and the reason no member of the
spend surface is money.

Each of the three halves was written before any of its routes
existed, which is the point. Every rule below is one that each
resource group would otherwise settle separately, and a surface
whose 422 body depends on which router answered is not one contract
but one per router. The routes land against this document; where
one of them departs from it, the departure is argued here in the
same commit rather than left for a reader to find in a response.

It is the document the HTTP API row of the behaviour table in
`docs/architecture/00-overview.md` names, so a change to an
envelope, to the pagination contract, to the guard or to a declared
path lands here with the code. The designs it implements are
`.specs/q08-api-wave-1.md`, `.specs/q11-api-wave-2.md` and
`.specs/q13-api-wave-3-mcp.md`, the three waves carved out of
`.specs/2026-08-19-backend-api.md`.

The framework half is not this. `lib/express/` builds the app,
installs the middleware and registers the error handler last;
`lib/errors/` declares the error classes and the shape a failure
serialises to. Both are vendored, and both already answer for
`/health`, `/_control` and `/auth`. What is here is what this
package's own routes do inside that frame — which is why several
rules below are stated as departures from a framework default
rather than as inventions.

## The two envelopes

### A success answers `{ success: true, data, meta? }`

`data` is the resource, or the array of resources on a list route.
`meta` is present on a paginated list and absent everywhere else.
There is no third top-level member, and `src/http/envelope.ts` is
the only place either object is built.

Wrapping the payload rather than returning it bare buys two things.
A list answers an object and never a top-level JSON array, so a
member can be added beside `data` later without changing the type
of the body. And the body carries its own verdict: a consumer that
has lost the status line — a logged response, a queued one, a
client library surfacing only `body` — can still tell an answer
from a refusal.

`success` is therefore a discriminator, not a status code in
disguise. It is `true` on every body this surface writes. Nothing
here ever answers `{ success: false }`, because a failure is
answered by the other envelope.

### A failure answers the framework's own `{ code, message, details? }`

`AppError.toJSON()` in `lib/errors/errors.ts` produces that object
and `errorHandler` writes it, with the HTTP status carrying the
failure. `code` is the machine-readable name (`NOT_FOUND`,
`CONFLICT`, `VALIDATION_ERROR`), `message` is human-readable, and
`details` appears only when the error was given some.

Wave-1 service functions throw `NotFoundError` (404),
`ConflictError` (409) and `ValidationError` (422), and route
handlers carry no try/catch at all: `createService` registers
`errorHandler` as the last middleware, and under Express 5 a bare
`throw` inside an `async` handler reaches it with no `next(err)`.

Wave 3 exposes those same service functions as MCP tools and reads
`err.code` rather than an HTTP status, which is why the code is the
part that has to mean something and the status is the part that
merely has to be right.

### The asymmetry between them is deliberate and cheaper than the fix

`.claude/skills/api/SKILL.md` prescribes ONE envelope,
`{ success, data?, error? }`, which this surface follows on the
success half and not on the failure half.

Reshaping the failure half means editing `lib/errors/handler.ts`:
vendored framework code, with its own characterization tests,
already answering for `/_control`, for `/auth` and for every
unhandled throw in the process. The choice is between one asymmetry
written down here and two error shapes on the wire, and two shapes
is the more expensive of the two for everyone downstream — starting
with `parseApiError` in `lib/errors/client.ts`, which reads the
shape the framework already emits.

The second reason is that the skill's failure half could not carry
this surface anyway. `error?: string` has nowhere to put a
`FieldError[]`, and the 422 wave 1 owes names a list of field
paths. A single string would either drop them or encode them into
prose, and prose is the one thing a machine-readable failure must
not be.

### Four failures answer in neither shape, all of them the framework's

Measured against a service built by `createService` in this tree:

| Trigger | Answer |
| --- | --- |
| No bearer, or one the verifier rejects, with the guard armed | `401` `{ error: 'Unauthorized' }` from `buildRequireAuthFrom` in `lib/express/auth.ts` |
| The app-wide rate limit exceeded | `429` `text/html`, express-rate-limit's own default string `Too many requests, please try again later.` |
| A body that is not parseable JSON | `500` `{ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }` |
| No route matched the path | `404` `text/html`, Express's own page — but `401` first for a caller with no credential, per the claim below |

Wave 1 changes one of the four and leaves three untouched, so two
things follow for a client. It cannot assume every response body is
JSON, and it cannot assume every JSON body is one of the two
envelopes above. The `401` is the one every wave-1 route can
answer, because every one of them sits behind the guard.

### An unmatched path answers `401` before it answers `404`

The five wave-1 mounts sit at `/` rather than under a prefix, so
each one's `ctx.requireAuth` runs for every request that REACHES
it and not only for the ones its router matches. A path no route
matches therefore falls through all five guards before it can
reach Express's own page.

Measured both ways against a service carrying an auth block: with the
wave-1 mounts absent, `/nope` answers `404` `text/html` with and
without a credential; with them in, it answers `401` to a caller
carrying none and the same `404` `text/html` to a credentialled one.
The three other rows above are unchanged, and so are `/health`,
`/users` and `/me` — which is what `src/index.ts` mounting the five
LAST buys, since a mount above `/users` would have guarded a starter
route this wave does not touch.

It is a disclosure narrowing rather than a loss: an uncredentialled
caller learns that the port is guarded instead of which paths exist on
it, and nothing is withheld that a credential does not reveal. The
cost sits on the other side of the same mechanism — a credentialled
request the fifth router serves runs the verifier five times, once per
mount it falls through.

`parseApiError` in `lib/errors/client.ts` is the reference client
reading, and it separates them the same way: only the `500` body
satisfies `isAppError`, so the other three fall through to its
`{ code: 'NETWORK_ERROR', message: <statusText> }` default. A
refused credential therefore reaches a consumer of that helper as a
network error rather than as `UNAUTHORIZED`, which is worth knowing
before writing the branch that keys on the code.

The `500` on a malformed body reads as a bug and is not one to fix
from a route: body-parser raises a `SyntaxError`, which is not an
`AppError`, so `errorHandler` takes its unknown-error branch.
Answering `400` there means teaching the framework handler about
body-parser, which has callers outside this package. It is recorded
here as a known departure rather than patched from a route group.

## Pagination

### Every PAGINATED list reads `?page` and `?perPage` and no other window

`page` is 1-based. Neither `limit`/`offset`, nor `pageSize`, nor
`per_page` is accepted anywhere. The store ports take `limit` and
`offset` because that is what SQL takes, and the translation
happens once, in `src/http/schemas.ts`.

No router declares a pagination vocabulary of its own. Four
declare a query schema of some other shape, and none of the four
is a second spelling of a window: the confirmation on
`DELETE /domains/:slug`, the empty one that refuses every parameter
on `GET /domains/:slug/categories`, the `?format` on
`GET /categories/:id/terms`, and the `?kind` on `GET /connectors`.
The third competes with this schema on the same route, and it
competes by REPLACING it — a request naming `?format` is judged
against that schema instead, which is what makes
`?format=seed&page=2` a refusal rather than a window silently
dropped.

The fourth does not compete at all: `src/connectors/routes.ts`
EXTENDS the schema below rather than respelling it, adding one
optional `?kind` held to `CONNECTOR_KINDS` and inheriting the
default, the cap and the strictness unchanged. That is the shape a
list-route filter should take here — the window stays one
declaration, and a parameter this surface does not declare is still
a `422` naming `query`. The `Connectors` group below carries the
argument.

One wave-1 list route is not paginated at all, and the capital is
what keeps this rule true rather than nearly true:
`GET /domains/:slug/categories` answers a domain's taxonomy WHOLE
and refuses any query parameter it is sent, including `?page`. The
Taxonomy section below carries the argument for both halves of
that.

A second route leaves the paginated class only when it is asked
to. `GET /categories/:id/terms?format=seed` answers a document
rather than a page and reads through no window at all, while the
same route without `?format` is an ordinary paginated list. That
is one route stepping out of this rule for one request, not a
third parameter joining the two spellings above. Every other list
route on the surface reads its WINDOW through the schema named
above and through nothing else; `GET /connectors` reads one
further parameter beside it, through an extension of that same
schema rather than through a second one.

Those names match `PaginationMeta` in
`packages/ui/src/cache/types.ts`, which declares the same four
members — under a `pagination` key rather than `meta`, and with no
consumer anywhere in the repo today. The two shapes are not yet in
contact. When `@ar/web` swaps its fixtures for this API,
reconciling them is a decision to make there rather than a
difference to discover.

### `perPage` defaults to 50 and is refused above 200

The defaults are `page=1` and `perPage=50`; the cap is 200, because
a `perPage` with no ceiling is a query with no ceiling.

A `perPage` above the cap is a `422`, not a silent clamp. A clamp
makes `meta.perPage` disagree with what was asked, and a client
computing its own page count from the number it SENT then walks off
the end of the collection with nothing reporting an error. A
refusal costs one round trip and answers nothing wrong.

`page` below 1, and a non-integer in either parameter, are refused
the same way and through the same parse a body goes through — so a
bad query and a bad body produce the same envelope, with a field
path naming the parameter.

### `meta` is derived, so it cannot disagree with the page it describes

`buildPaginationMeta` takes `{ page, perPage, total }` and returns
those three plus `totalPages`, computed as
`Math.ceil(total / perPage)` and therefore `0` when `total` is `0`.
`page` and `perPage` are echoed from the parsed query and `total`
comes from the store's own count, so no caller can supply a
`totalPages` that disagrees with the other three.

### A page past the end is an empty list, not a 404

`?page=99` on a collection with two pages answers `200` with
`data: []` and the same `meta`. The collection exists and the
window over it is empty; a `404` would deny the collection, which
is a different and false statement. `total` and `totalPages` are
what tell the caller it overshot.

## The guard

### Every wave-1 route sits behind `ctx.requireAuth`, reads included

`.specs/q08-api-wave-1.md` permits arguing reads down to
`optionalAuth` per resource group. They are not argued down.

Everything this wave serves is operator configuration — a domain's
scoring weights and field contract, the lexicon a scorer runs on,
the system text a run plays, the operator's own preferences. None
of it has an anonymous consumer. No route varies its answer by
claims either, so `optionalAuth` would buy nothing at all except an
open read surface on a configured deployment.

The shape to avoid is the deployment that is credentialled with
writes guarded and reads open: the whole taxonomy, every persona's
system text and the operator's default domain readable by anyone
who can reach the port. Nothing on the read side of this wave is
public by design, so nothing on it is left public by default.

### The guard sits on the mount, not on the handler

`src/index.ts` mounts each of the five routers as
`app.use(ctx.requireAuth, router)`. A route added to one of those
routers later inherits the guard without anyone remembering to
attach it.

The alternative — repeating `ctx.requireAuth` as the second
argument of every `router.get`/`post`/`patch`/`delete` — makes an
unguarded route a one-line omission that no type and no gate
reports, on a surface where the omission is the whole failure.

### With no credential configured the guard IS a passthrough

`createService` substitutes `passthroughMiddleware` for both
`requireAuth` and `optionalAuth` when the `auth` block is absent,
and `src/index.ts` derives that block from `AUTH_BASIC_USER` and
`AUTH_BASIC_PASSWORD` (see `docs/architecture/07-auth.md`). A local
boot without those variables is therefore unchanged by everything
above: every wave-1 route answers without a credential.

The consequence is about evidence rather than about behaviour. A
green local run says nothing about whether the guard is on a mount,
because there the guard is a no-op that a missing mount is
indistinguishable from. `tests/api/wiring.test.ts` is the reading
that has something in it: a table of every route on the surface,
asserted `401` with no credential and not-`401` with one, against a
service built WITH an auth block. The table is held equal to the
labels read off the mounted routers' own `stack`, so a route added
to a router and not to the table is a route with no reading here.

### Wave 2 sits behind the same guard, and one group raises the stakes

The argument above is the same for topics, sources, connectors and
export subscriptions. All four are operator configuration, none has an
anonymous consumer, and no route among them varies its answer by
claims, so none of them is argued down to `optionalAuth` either.

`/connectors` is the group that would be worst to get wrong. A
connector's `config` is where an API key for a model provider, a
search back end or an export target is stored, and while every read of
it is masked (see Connector secrets below), an open read surface would
still publish which providers a deployment talks to and under what
names. The mask is a second line, not the first one.

Wave 2 adds five more mounts on the same
`app.use(ctx.requireAuth, router)` terms, so the fall-through cost
recorded above — one verifier run per mount a request passes — grows
with each of them. That is the price of root-absolute mounts, it is
paid per request rather than per matched route, and the number in that
claim moves with the mount list rather than standing as a constant.

## Validation

### A validation detail names a field path and never a submitted value

`src/http/validation.ts` is the only boundary parser. `parseBody`
and `parseQuery` return parsed data or throw `ValidationError`,
whose `details` is a `FieldError[]`: a `field` holding a dot path,
a `message` drawn from a fixed vocabulary declared in that module,
and the zod issue `code`. Nothing in a detail is copied out of the
request.

This is q07's login lesson generalised off that one route. A
response body is the one place a leaked value cannot be un-leaked,
and a log line is the second; both are read by people and systems
that were never shown the request.

### zod's own message is not usable here, and that is measured

`zodToValidationError` in `lib/errors/handler.ts` copies
`issue.message` VERBATIM — its own TSDoc says as much — and
`errorHandler` answers a raw `ZodError` through it. Under the zod
4.5.1 in this tree, a `.strict()` object rejecting an undeclared
key produces one detail whose `field` is the empty string, whose
`code` is `unrecognized_keys`, and whose `message` is
`Unrecognized key: "<the submitted key>"` — the key quoted back
verbatim.

A key is submitted content. So a wave-1 handler that lets a
`ZodError` escape, rather than parsing through
`src/http/validation.ts`, quotes the request back to the caller and
writes the same string to the warn line — with no code change
anywhere and every gate green.
That is the trap this module exists to close: the boundary parses
and throws its OWN error, and a `ZodError` never travels.

The other issue kinds measured in the same run do not leak on their
own: `invalid_type` names the expected and received TYPES, and
`invalid_value` on an enum names the allowed options rather than
the rejected one. The rule is keyed on the vocabulary regardless of
which kinds happen to be safe today, because a zod minor that
rewords a message changes this service's wire text with no diff in
this package — which is what the 3-to-4 bump did to `Required`.

### An `unrecognized_keys` detail names the container, never the key

The offending key names live in `issue.keys`, and `issue.path` on
that issue is measured EMPTY for a root-level object. So the detail
names the object that did the refusing, and the caller learns that
its body carried something undeclared without being told back what.

The root object has no path of its own and therefore needs a name;
that spelling is `src/http/validation.ts`'s to declare once, and
once declared it is the same on every route.

### A path below an open record collapses to `*`

Six payload areas are open records whose KEYS are operator-chosen
rather than declared: `settings.scoringWeights.<key>` and
`settings.fieldContract.<key>` on a domain,
`notificationChannels.<key>` in operator settings,
`parserConfig.<key>` and `contract.<key>` on a source, and
`config.<key>` on a connector. A key there is submitted content in
exactly the sense above.

Any path segment below such a prefix is reported as `*` —
`settings.scoringWeights.*`, never the key itself. The caller learns
which unit of the payload failed and how it failed, and learns nothing
it had not already sent.

The source pair and the connector's `config` are declared and mask
nothing that zod raises today, and saying so is worth more than a list
that reads as six equal cases. Their value schema is `z.unknown()` and
a JSON key is always a string, so no issue is reachable strictly below
any of the three: a `parserConfig` that is not an object is refused AT
the member, which is the one name this service chose and the one
segment `openCutoff` in `src/http/validation.ts` deliberately leaves
unmasked. The declaration is what puts the masking in place BEFORE the
narrowing that would need it — what a parser config holds genuinely
differs by `kind`, so a per-kind shape is the obvious next thing to
want — rather than after the refusal that first carried a key back.

The connector's `config` is the one prefix a refusal reaches below
already, and it is not zod's. The masked-secret rule in
`src/connectors/service.ts` walks the submitted record itself, so
`openPaths` cannot see it; that rule masks the path it reports by
hand, one `*` per segment, which is why the same law holds for a
detail no schema built.

### Request schemas are `.strict()`, and the sanitiser is what affords it

Every request schema is strict, matching `scripts/seed-schemas.ts`:
a typo in a JSONB unit is refused rather than silently stripped and
then wondered about later. Strictness is what makes a settings PUT
trustworthy as a whole-unit replacement.

Its whole cost is the `unrecognized_keys` issue above, which is the
one issue kind that carries submitted content. So the two decisions
are one decision: strict schemas are affordable because the
sanitiser exists, and the sanitiser is worth writing because the
schemas are strict.

## Route paths

### Every path is root-absolute and every router mounts at `/`

| Router | Module | Paths it declares |
| --- | --- | --- |
| `buildDomainsRouter` | `src/domains/routes.ts` | `GET /domains`, `POST /domains`, `GET /domains/:slug`, `PATCH /domains/:slug`, `DELETE /domains/:slug` |
| `buildCategoriesRouter` | `src/taxonomy/categories-routes.ts` | `GET /domains/:slug/categories`, `POST /domains/:slug/categories`, `PATCH /categories/:id`, `DELETE /categories/:id` |
| `buildTermsRouter` | `src/taxonomy/terms-routes.ts` | `GET /categories/:id/terms`, `POST /categories/:id/terms`, `PATCH /terms/:id`, `DELETE /terms/:id` |
| `buildPersonasRouter` | `src/personas/routes.ts` | `GET /domains/:slug/personas`, `POST /domains/:slug/personas`, `PATCH /personas/:id`, `DELETE /personas/:id` |
| `buildSettingsRouter` | `src/settings/routes.ts` | `GET /settings`, `PUT /settings` |

Each is mounted with `app.use(ctx.requireAuth, router)` and no path
prefix, so the string in the router is the string on the wire.

### `/domains/:slug/categories` is what forces it

A `/domains` mount would put `/domains/:slug` in the domains router
and `/domains/:slug/categories` in the taxonomy router: one path
prefix owned by two routers, with `POST /domains/:slug/personas`
owned by a third. Reading any of them would then mean holding a
mount path from another file in your head, and grepping for a path
seen in a log would find no line that contains it.

Root-absolute declarations make every path greppable exactly as it
appears on the wire, and put the whole surface in one table (the
one above) rather than in five mount statements plus five routers.

### The `/auth` mount is the deliberate exception

`src/index.ts` mounts `buildAuthRouter` at `/auth`, and that router
declares `/login`, `/logout` and `/introspect`. It owns a prefix
nothing else touches and never will, so its mount splits no
resource and the argument above does not reach it.

The exception is recorded so that "every router mounts at `/`" is
read as a wave-1 rule with a known neighbour, rather than as a
description of `src/index.ts` that the file already contradicts.

### A domain is addressed by slug and everything else by id

`domains.slug` is UNIQUE and is the natural key `scripts/seed.ts`
upserts on, so it is stable across a re-seed and meaningful in a
URL. Categories, terms and personas are addressed by `:id`, the
`bigserial` primary key in drizzle's `number` mode.

`resourceIdParamSchema` coerces and requires a positive integer, so
a non-numeric `:id` is a `422` before any store call rather than a
`404` after one. The distinction is worth the schema: a `404` says
the row is not there, and a request that never named a row has not
established that.

### The paths wave 1 does not take

`GET /health` and `ALL /_control/*` belong to the framework
(`lib/express/builtin-routes.ts`), `/auth/*` to q07, and `/me` and
`/example` are declared in `src/index.ts` today. Wave 1 adds
nothing under any of them, and none of its five prefixes —
`/domains`, `/categories`, `/terms`, `/personas`, `/settings` —
collides with one.

Waves 2 and 3 extend the same root on the same terms. Wave 2 takes
four of those prefixes and the table below names them; `/findings`,
`/documents`, `/entities`, `/runs` and `/spend` arrive with wave 3
as further routers, mounted the same way and answering under every
rule above.

### The four prefixes wave 2 adds, and the two it borrows

| Router | Module | Paths it declares |
| --- | --- | --- |
| `buildTopicsRouter` | `src/topics/routes.ts` | `GET /domains/:slug/topics`, `POST /domains/:slug/topics`, `PATCH /topics/:id`, `DELETE /topics/:id`, `POST /topics/:id/run-now`, `POST /topics/:id/pause` |
| `buildSourcesRouter` | `src/sources/routes.ts` | `GET /domains/:slug/sources`, `POST /domains/:slug/sources`, `PATCH /sources/:id`, `DELETE /sources/:id` |
| `buildSourceFailuresRouter` | `src/sources/failures-routes.ts` | `GET /sources/:id/failures` |
| `buildConnectorsRouter` | `src/connectors/routes.ts` | `GET /connectors`, `POST /connectors`, `PATCH /connectors/:id`, `DELETE /connectors/:id` |
| `buildSubscriptionsRouter` | `src/subscriptions/routes.ts` | `GET /domains/:slug/exports`, `POST /domains/:slug/exports`, `PATCH /exports/:id`, `DELETE /exports/:id`, `POST /exports/:id/run-now` |

The four new prefixes are `/topics`, `/sources`, `/connectors` and
`/exports`, and none of them collides with a framework path, with
`/auth/*`, or with a wave-1 prefix. Two existing prefixes are borrowed
rather than added: `/domains/:slug` carries two more collections, and
`/sources/:id` carries the failures queue. That is the pattern
`/domains/:slug/categories` already forces, and the reason every path
here is declared root-absolute.

Three of the four groups are met in their domain and written by their
id, exactly as categories, terms and personas are. `/connectors` is
the one that is not. A connector is deployment-level and the table
carries no `domain_id` at all, so its list hangs off the root and its
natural key is the (`kind`, `name`) pair rather than anything a domain
owns.

Two directory names in that table do not match the prefix they serve,
and both splits are deliberate. `src/sources/` already holds the
source ADAPTER contract and its registry, so the HTTP half lands
beside it as `store.ts`, `service.ts`, `routes.ts` and the two
`failures-*.ts` modules rather than in a second directory named for
the same table. And the export subscriptions group is
`src/subscriptions/` because `src/exports/` is the renderer registry
and a subscription is not a renderer — the table is
`export_subscriptions`, and the routes still answer under `/exports`.
The table above is where a reader learns that, rather than a directory
listing that reads like a misfile.

### The paths wave 2 defers, and the wave that takes them

`GET /sources/:id/pending-configs` and
`POST /sources/:id/approve-config` are in the parent spec's sources
list and are NOT in this wave. They read and rule on
`source_config_proposals`, and they move to q13, the approvals wave,
where they land beside the entity approvals over `research_pool`.

The reason they were carved out has expired and the deferral stands on
a second one that has not. The table was still moving when this wave
was planned — it arrived on leg A with q09, so a route planned against
it here would have targeted a schema somebody else was landing — and
it is in the tree now. What has not changed is that an approval gate
is one vocabulary and this repository has two subjects on it:
`scripts/approve.ts` already rules on `source_config_proposals` and on
`research_pool` from one CLI, and the HTTP half should arrive as one
surface answering for both rather than as half a surface here and the
other half two waves later.

So the pair is scheduled rather than missing, and this is the sentence
that says so. The same note sits beside the approval gate itself in
`docs/architecture/04-sources.md`, under `The HTTP half of this gate
is scheduled`, so a reader who reaches the gate from the pipeline
side is not left to conclude that the API forgot it. The `Sources`
group below repeats it a third time, where a reader looking up the
four routes would otherwise find six expected and four listed.

### The five prefixes wave 3 adds, and the two it borrows

| Router | Module | Paths it declares |
| --- | --- | --- |
| `buildFindingsRouter` | `src/findings/routes.ts` | `GET /domains/:slug/findings`, `GET /findings/:id`, `PATCH /findings/:id/verdict` |
| `buildDocumentsRouter` | `src/documents/routes.ts` | `GET /domains/:slug/documents` |
| `buildEntitiesRouter` | `src/entities/routes.ts` | `GET /entities/:id`, `PATCH /entities/:id`, `GET /entities/:id/research`, `POST /entities/:id/approve-research` |
| `buildRunsRouter` | `src/runs/routes.ts` | `GET /runs`, `GET /runs/:id` |
| `buildSpendRouter` | `src/runs/spend-routes.ts` | `GET /spend/summary` |
| `buildSourceProposalsRouter` | `src/sources/proposals-routes.ts` | `GET /sources/:id/pending-configs`, `POST /sources/:id/approve-config` |

The five new prefixes are `/findings`, `/documents`, `/entities`,
`/runs` and `/spend`, and none of them collides with a framework
path, with `/auth/*`, or with a prefix either earlier wave took. Two
existing prefixes are borrowed rather than added, which is the third
wave running to do it: `/domains/:slug` carries two more collections,
and `/sources/:id` carries the proposal pair beside the failures
queue it already carries.

Four of the five carry a path in this wave and `/documents` does
not, which is worth stating rather than leaving a reader to count the
table. The documents group serves exactly one route and it is
`GET /domains/:slug/documents`, so the prefix is claimed against the
framework and the two earlier waves rather than taken — a raw
document is met in its domain and there is no `GET /documents/:id`
to look for. What the claim buys is that the name stays free: a
document addressed by its own id is the obvious next thing to want,
and a prefix reserved in this table is one nothing else can quietly
occupy first.

Six routers over five prefixes, because neither a prefix nor a
directory maps one to one onto them. `GET /spend/summary` is served
from `src/runs/` rather than from a directory of its own: the
aggregation is over `llm_calls`, that table hangs off `runs`, and a
`src/spend/` holding one read over somebody else's table would be a
directory named for a question rather than for a subject. It is a
second router in the same directory instead — `spend-routes.ts`
beside `routes.ts` — so the mount list stays one line per prefix.

The proposal pair lands in `src/sources/` for the reason the
failures queue did, one wave earlier: `source_config_proposals` is
one table and `SourceStore` is one port over the sources group, so
the pair arrives as `proposals-service.ts` and `proposals-routes.ts`
beside the adapter contract and the wave-2 HTTP half rather than in a
second directory named for the same group. `The paths wave 2 defers`
above is where the pair was promised; this row is where it is
declared.

Three of the five new prefixes are addressed by id alone —
`/findings/:id`, `/entities/:id` and `/runs/:id` — which is the rule
above rather than an exception to it: a domain is met by slug and
everything else is written by its id. `/spend/summary` is the one
path here that addresses nothing at all, in the shape `/settings`
already takes: it is a question over a whole deployment's ledger, and
the domain it may be narrowed to travels as a query parameter rather
than as a segment, because a summary over every domain is the
ordinary request rather than a special case of one.

## Domains

### Five endpoints over one table, addressed by slug

| Method and path | Answers |
| --- | --- |
| `GET /domains` | `200` with a page of rows, slug ascending, plus `meta`. `422` for a window the pagination schema refuses. |
| `POST /domains` | `201` with the stored row. `422` for a body the schema refuses, `409` when the slug is taken. |
| `GET /domains/:slug` | `200` with the row. `404` for an unknown slug, `422` for a segment that is not a slug. |
| `PATCH /domains/:slug` | `200` with the row afterwards. `422` for a body the schema refuses, `404` for an unknown slug. |
| `DELETE /domains/:slug` | `204` with no body. `404` for an unknown slug, `409` while the domain holds rows it accumulated. |

`src/domains/routes.ts` declares all five and decides none of them:
each handler reads the address, derives the window, calls the
matching function in `src/domains/service.ts` and chooses a status.
Wave 3 exposes those same functions as MCP tools, so a rule that
lived in a handler would be a rule that surface could not reach.

### A create answers `201` and carries no `Location` header

The answer is a resource that did not exist when the request was
made, which is what `201` says and `200` does not.

No `Location`, because the created row travels in the body and its
`slug` IS the address every other route in this group takes. A
header would restate what the caller sent and already has back.

### A delete answers `204`, so the counts travel in the refusal

A removed resource has no representation to carry. The numbers
worth reading are the ones the guard refused with, and by the time
a delete succeeds they describe nothing that still exists.

### `settings` is replaced whole and is never merged

A `PATCH` supplying `settings` stores exactly that payload. An
absent member of it is cleared rather than left standing, and a
patch omitting `settings` altogether leaves the stored payload
alone. Those are two different requests and they are meant to be.

A merge would make clearing a member unexpressible, since the
request that omits a weight and the request that removes it would
be the same bytes. It would also make a whole-unit contract read
like a field-level one at exactly the point an operator is tuning
scoring.

`slug` is not patchable at all. It is what every other surface
addresses the domain by — a route path, the seed's upsert key, an
operator's `defaultDomainSlug` — and none of those references is
a foreign key the database would follow, so a rename is a separate
operation with its own fan-out rather than a member on a patch.

### `featureVersion` and `embeddingModel` are answered, never accepted

Both appear on every domain body and on neither request schema.
They are the feature pipeline's own pins: a bumped
`feature_version` claims vectors were recomputed, and every stale
vector then reads as current. An operator editing a domain has no
business moving either.

### A delete refuses while the domain holds rows it accumulated

`topics`, `sources` and `findings` are counted, and a non-zero
count in any of them is a `409` whose `details` is
`{ topics, sources, findings }` — three facts about the database
rather than anything about the request. The domain's categories,
terms, criteria and personas are not counted: those are what it was
CONFIGURED with, and losing a lexicon written for a subject being
discarded is the outcome anybody expects.

The guard prevents nothing at the database. Every foreign key onto
`domains.id` is `ON DELETE CASCADE`, so the statement takes all of
it either way. What the guard buys is that the loss was EXPLICIT,
and the counts are in the refusal so that reading is possible
before the confirmation is sent.

### `?cascade=confirm` is the only spelling that gets past it

A word rather than a boolean, and that word rather than `true` or
`1`, because a query string is where a confirmation is easiest to
arrive at by accident: a stale form field, a copied URL, a client
that sends every parameter it knows.

Any other value of `cascade` is a `422` naming `cascade`, and any
other query parameter is a `422` naming `query`. Both are
deliberate. A caller that wrote `?cascade=yes` meant to get past
the guard, and answering it the guard's own `409` would send it
looking for rows to remove instead of for the typo it made; a
caller that wrote `?casacde=confirm` and had it stripped would
have a delete it believed it confirmed.

### The address is checked before the payload, except on a delete

A `PATCH` carrying both an unroutable slug and a malformed body is
answered about the slug. A request that has not named a resource
has not yet asked anything about a payload, and answering the
payload first tells a caller what is wrong with a body it was
never going to be allowed to send.

The delete is the exception and reads its query first, for the
reason above: that route is one keystroke from a destructive call,
so a misspelt confirmation is the half of the request worth
answering.
## Taxonomy

### A category is met in its domain and written by its id

| Method and path | Answers |
| --- | --- |
| `GET /domains/:slug/categories` | `200` with every category in the domain, key ascending, each carrying a `termCount`. No `meta`. `404` for an unknown slug, `422` for a segment that is not a slug or for any query parameter at all. |
| `POST /domains/:slug/categories` | `201` with the stored row. `422` for a body the schema refuses and for a parent the depth rule or the foreign key refuses, `404` for an unknown slug, `409` when the key is taken. |
| `PATCH /categories/:id` | `200` with the row afterwards. `422` for a body the schema refuses, for a segment that is not an id, and for a parent either rule refuses. `404` for an unknown id. |
| `DELETE /categories/:id` | `204` with no body. `404` for an unknown id, `422` for a segment that is not one, `409` while the category holds children. |

`src/taxonomy/categories-routes.ts` declares all four and decides
none of them: each handler reads the address, calls the matching
function in `src/taxonomy/categories-service.ts` and chooses a
status.

The collection hangs off `/domains/:slug` because a taxonomy has no
meaning apart from the domain it describes, and a caller holding a
slug should not have to look an id up to read one. The two writes
address `/categories/:id` instead: the row carries its own
`domain_id`, every rule that needs one is the database's, and
repeating the slug would let a request name a domain the row does not
belong to — a disagreement the router would then have to answer
for.

### The category list takes no window, and refuses a query for one

There is no `?page` and no `?perPage` here, and no `meta` in the
answer. The taxonomy is shallow, operator-authored and capped at two
levels; there is no page to describe, and a domain whose categories
did not fit in one response would be a domain nobody could read.

This is the one list route on the wave-1 surface that departs from
the pagination rules above, which is why a query parameter sent to
it is a `422` naming `query` rather than a value quietly dropped.
Every OTHER list route takes `?page`, so a caller sending one here
is expecting a page: stripping it would answer the whole taxonomy
and look like a first page with nothing after it.

### A count of zero is a counted zero

Every row on the list carries `termCount`, which is what makes the
list readable as a lexicon rather than as a list of names — an
operator is scanning for the bucket with nothing in it, or the one
with far too much.

A category holding no terms contributes no row to a grouped count,
so an implementation has to fill the missing groups back in.
Answering an absent member instead would make `0` and "not counted"
the same value, on the one member whose whole job is telling an
empty bucket from a full one.

### The depth cap is the database's, and this surface only translates it

A category is a root or the child of a root. The rule is a trigger
on `categories`, so it holds against every writer including the seed
and a psql prompt, and no route checks a proposed parent before
writing it — a check here would be a second, weaker statement of
the same rule, with the first one to disagree doing so silently.

What the surface owns is the way out. The trigger raises SQLSTATE
23514, the store classifies it as a `check-violation`, and the
service turns it into a `422` whose one detail names `parentId`,
carries the code `depth_violation` and states the one-level rule.
That code is this package's own and not zod's: no request schema can
raise a rule the database holds, so no zod code describes it.

All three branches of the trigger — a parent that is itself a
child, a parent in another domain, and a parent given to a row that
already has children — arrive as ONE reason carrying no
constraint name, because a `RAISE ... USING ERRCODE` names none. So
the detail states the cap they all enforce rather than the branch
that fired, which would otherwise be right a third of the time.

### One constraint name answers `422` and `409`, and the method decides

`categories_parent_id_categories_id_fk` refuses a `parentId` naming
no row AND a delete of a category still holding children. The two
are indistinguishable on the refusal itself — same SQLSTATE, same
constraint, measured against the live server — so the service takes
the write as an argument and the status follows from which call
raised it: `422` naming `parentId` out of a create or a patch, `409`
out of a delete.

### A delete takes the terms and leaves the children

`terms` and `criteria` cascade on `category_id`; `parent_id` is
`NO ACTION`. So removing a bucket removes the lexicon written into
it, and removing a bucket that still has sub-buckets is refused.

That asymmetry is what makes losing a sub-tree an explicit decision:
reparent or remove the children, and the delete goes through. There
is no `?cascade=confirm` here, unlike `DELETE /domains/:slug`. A
domain's delete is guarded because the database would silently take
everything; a category's is guarded by the database itself, so a
confirmation would authorise nothing the caller could not do by
moving the children first.

### `key` is not patchable, and `parentId` distinguishes three requests

`key` is what the seed upserts on and what a term seed row names in
`categoryKey`, and neither reference is a foreign key the database
would follow. A re-key is therefore a separate operation with a
fan-out of its own rather than a member on a patch — the same
argument `slug` gets on a domain.

`parentId` is nullable AND optional on the patch, because those are
three different requests: absent leaves the row where it is, a
number moves it under that root, and `null` promotes it to a root.
Null is the only way back up, and it would be unexpressible if
absent and null meant the same thing.

### A term is met in its category and written by its id

| Method and path | Answers |
| --- | --- |
| `GET /categories/:id/terms` | `200` with one page of the category's lexicon, pattern ascending, plus `meta`. `404` for an unknown id, `422` for a segment that is not an id and for the pagination faults every list route answers. |
| `GET /categories/:id/terms?format=seed` | `200` whose body is a seed document rather than an envelope. `404` for an unknown id, `422` for any other `?format` value and for `?format` sent beside any other parameter. |
| `POST /categories/:id/terms` | `201` with the stored row for one term, or with `{ imported }` for a seed document. `404` for an unknown id, `409` when a single create names a taken pattern, `422` for a body either schema refuses and for a document row naming another category or repeating a pattern. |
| `PATCH /terms/:id` | `200` with the row afterwards. `404` for an unknown id. `422` for a body the schema refuses, for a segment that is not an id, and for a `categoryId` naming no category or one in another domain. `409` when the resulting pattern is taken. |
| `DELETE /terms/:id` | `204` with no body. `404` for an unknown id, `422` for a segment that is not one. Never `409`: nothing hangs off a term. |

`src/taxonomy/terms-routes.ts` declares four routes over the six
functions in `src/taxonomy/terms-service.ts`, and decides none of
them. Two of the four carry two operations apiece, which is the
whole of what this file adds over its siblings: `?format` picks
between a page and a document, and the body's `terms` member picks
between one term and a whole lexicon.

The collection hangs off `/categories/:id` because a lexicon has no
meaning apart from the bucket it scores for. The two writes address
`/terms/:id` instead, for the reason a category is written by id:
the row carries its own `category_id`, and repeating it in the path
would let a request name a bucket the term does not sit in. A term
is never addressed by a `:slug` at all — nothing relates it to a
domain except through its category, and no rule on this surface
needs one.

### `?format=seed` and `?page` are exclusive, and sending both is a `422`

They are two vocabularies for two different answers. Without
`?format` the route answers one page in the paginated envelope every
other list route uses; with `?format=seed` it answers the category's
terms WHOLE, as the bytes `data/terms.json` carries — no envelope,
no `meta` and no window, because a document describing a page would
not import back into the category it came out of.

A request carrying both is refused as an undeclared key naming
`query` rather than served a document with the window dropped. A
caller that sent `?page` believes it is reading a page, and a
document is not one; this is the same fault
`GET /domains/:slug/categories` refuses a bare `?page` for, reached
from the other direction.

The discrimination is on the member's PRESENCE and the refusal on
its value, which is why `?format=csv` answers a detail naming
`format` and not one naming `query`. A branch keyed on the value
would have sent that request to the paginated parse, where `format`
is undeclared, and left the caller looking for a typo it did not
make.

### A create is one term or a whole lexicon, and the body says which

A body carrying `terms` is a seed document; anything else is one
term. The discriminator is the member rather than a second path or a
`?mode`, because the two bodies are already distinguishable and a
caller holding a document should not have to describe it as well as
send it. Both schemas are strict, so a body carrying `terms` beside
`pattern` is refused rather than quietly read as one of the two.

The two answer a duplicate pattern differently, and that is the
substantive difference rather than a detail of the dispatch. A
document is a lexicon being applied, so it upserts on
`terms_category_id_pattern_unique` and rewrites the row it finds —
which is what lets an export import back rather than accumulating a
second row that would count the same match twice. A single `POST` is
a caller stating that a pattern is not yet in the bucket, so a
duplicate is a `409` rather than a silent rewrite of somebody else's
weight.

### An import is checked whole before any of it is written

One malformed row in a hundred refuses the hundred, which is what
makes a bulk import an operation rather than a batch of them. Three
checks run before the single statement that writes: the schema over
every row, the rule that each row's `categoryKey` names the category
the path addressed, and the rule that one document states one row
per pattern.

The last of those is not tidiness. Postgres answers SQLSTATE 21000
when one statement's values repeat the conflict target, the store's
classifier deliberately does not recognise it, and the port states
one-row-per-pattern as a precondition — so without the check the
document would answer `500` naming neither colliding row.

A detail from any of the three names the row by INDEX
(`terms.0.polarity`, `terms.3.categoryKey`), which is how a caller
finds the offending row in a long document. The index comes from the
row's position and never from anything the row said, so the rule
that a detail names a field path and never a submitted value holds
here as everywhere else on this surface.

### A bulk import answers a count, and the count is of rows submitted

The port answers an upsert's rows in an UNSPECIFIED order, so putting
them on the wire would hand a caller a list it cannot line up against
the document it sent. Both ordered reads are one request away, so the
answer is `{ imported }` and a caller wanting the stored rows re-reads
the category.

`imported` counts SUBMITTED rows and not new ones: a pattern the
category already carried is rewritten rather than skipped, so a caller
comparing the count against the category's size is reading it wrong.
`GET /categories/:id/terms` answers that question.

### A bucket move is this surface's own rule, not the database's

Nothing in the schema relates a term to a domain. `terms` reaches
`domains` only through `categories`, and no constraint follows that
path, so Postgres accepts a move into another domain's taxonomy —
measured. A term that landed there would go on scoring for a domain
nobody put it in and would arrive in that domain's export.

So `PATCH /terms/:id` reads both categories when the patch names one
and refuses the pair that disagree, with a `422` naming `categoryId`.
It is the one rule on the taxonomy surface checked BEFORE a write
rather than translated after one, and the depth cap is the opposite
case for the opposite reason: a trigger holds that one against every
writer, so a check would be a second, weaker statement of a rule that
already held.

## Personas

### A persona is met in its domain and written by its id

| Method and path | Answers |
| --- | --- |
| `GET /domains/:slug/personas` | `200` with one page of the domain's personas, role ascending, plus `meta`. `404` for an unknown slug, `422` for a segment that is not a slug and for the pagination faults every list route answers. |
| `POST /domains/:slug/personas` | `201` with the stored row. `422` for a body the schema refuses, `404` for an unknown slug, `409` when the domain already carries that role. |
| `PATCH /personas/:id` | `200` with the row afterwards. `422` for a body the schema refuses and for a segment that is not an id, `404` for an unknown id, `409` when the resulting role is taken. |
| `DELETE /personas/:id` | `204` with no body. `404` for an unknown id, `422` for a segment that is not one. Never `409`: nothing hangs off a persona. |

`src/personas/routes.ts` declares all four and decides none of them:
each handler reads the address, derives the window, calls the matching
function in `src/personas/service.ts` and chooses a status.

The collection hangs off `/domains/:slug` because system text is
written ABOUT the subject a domain names, and a caller holding a slug
should not have to look an id up to read it. The two writes address
`/personas/:id` instead, for the reason a category is written by id:
the row carries its own `domain_id`, the one rule that spans a domain
— a role unique within it — is the database's, and repeating the slug
would let a request name a domain the row does not belong to.

### This collection is paginated, and the taxonomy is the exception

`GET /domains/:slug/personas` reads through the `?page`/`?perPage`
schema itself, unextended — as every list route on the surface
except `GET /connectors` does — and answers `meta` beside its
rows. A domain carries three personas today,
so the window is doing nothing yet — but nothing caps how many roles a
pipeline may come to play, and a collection that grows unbounded is
one a caller should be paging through before it has to.

`GET /domains/:slug/categories` is the wave-1 list that departs from
that rule, because a two-level tree has no page to describe. The two
sit under the same path prefix and answer differently on purpose,
which is the collections differing rather than the surface disagreeing
with itself.

### A role is unique within its domain, and both writes can propose one

`personas_domain_id_role_unique` refuses a role the domain already
carries, on an INSERT and on an UPDATE alike — measured against the
live server. So a `409` carrying `code: 'CONFLICT'` is the answer from
`POST /domains/:slug/personas` and from `PATCH /personas/:id` both,
and the two are separate call sites rather than one rule stated twice.

The key is per-domain and not global. The same role under a second
domain is accepted, which is what makes a pipeline's roles a
vocabulary each domain configures for itself rather than a registry
the deployment shares.

The refusal names the rule and never the role. A duplicate is the one
refusal on this surface whose cause is a value the caller sent, so it
is the one where quoting the value back would read most naturally and
would be exactly the leak the validation rules above forbid.

### `role` is patchable, which no other natural key here is

`patchDomainSchema` refuses to carry a `slug` and
`patchCategorySchema` a `key`, because both are references something
else holds: a seed upserts on them, and a term seed row names its
category by key. A persona's role is neither.

Nothing in schema v2 points at `personas`, the seed upserts on
`(domain, role)` so a re-run writes the row the file describes, and a
run resolves the role it plays by name at its own start. A rename
therefore changes which text the next run finds, for the same reason
every other edit does, rather than leaving a dangling pointer for
something else to trip over later.

That is why a rename can collide, and it is the only wave-1 patch that
can reach a unique key at all.

### `systemText` is required on a create and may be empty

An empty string is a legal value and means something: the role exists
and has no instructions yet, which is a state an operator can act on.
An ABSENT member is a request that forgot to say.

Holding the member required and its value unconstrained is what keeps
those two apart, which is why the create schema does not simply
default it. On a patch both members are optional, since a patch names
what to rewrite rather than stating a whole persona — so the same
absent member is a `422` on one route and a legal call on the other.

A patch carrying no member at all is legal and answers the stored row
unchanged. `personas` has no `updated_at`, so an empty patch has
literally nothing to set.

### An edit lands on the following run, and nothing has to be told

A run reads its personas at its own start, in one query alongside the
domain's taxonomy, and nothing between the store port and that query
keeps a copy. There is no cache to expire, no version to bump and
nobody to notify, so a write here is visible to the next run because
Postgres is the only place either of them looks.

The other half of that rule is what a write does NOT do. A run already
in flight keeps the text it started with, so what a run did stays
attributable to one set of rows rather than to whichever edit landed
partway through it.

### A delete cannot be refused, and a create's `404` may be a lost race

No foreign key in schema v2 points at `personas`, so removing one has
neither a guard nor a cascade. There is no `?cascade=confirm` here and
nothing for one to authorise, which is the difference from a domain's
delete: that one is guarded because the database would otherwise
silently take everything the domain accumulated.

`POST /domains/:slug/personas` resolves the domain and only then
writes, so a foreign-key refusal out of that write means the domain
was deleted in between. The fact to report is the one the lookup
itself reports — no domain carries that slug — so it is the same `404`
rather than a `500`, and a caller re-issuing the request gets one
answer for one state however the timing fell.

## Settings

### One row, two routes, and no address at all

| Method and path | Answers |
| --- | --- |
| `GET /settings` | `200` with the stored payload, or `{}` when no row has been written yet. No other status: there is no address to get wrong, no body to check and no query it reads. |
| `PUT /settings` | `200` with the stored payload afterwards. `422` for a body the schema refuses, one detail per fault, and `422` again when a well-formed `defaultDomainSlug` names no domain. |

`src/settings/routes.ts` declares both and decides neither: each
handler calls the matching function in `src/settings/service.ts` and
chooses a status.

Every sibling group declares two path shapes, because a resource is
met in its parent and written by its id. `operator_settings` holds one
row whose id the database pins, so there is no collection to page, no
parent to hang off and no segment for a request to get wrong. Neither
handler reads `req.params`, and this group answers no `404` and no
`409` — there is no address to name a row that is not there, and
no natural key a request could propose twice.

### Per-domain settings live on the domain row and are unreachable here

`domains.settings` is a different column on a different table holding
a different shape: scoring weights, a verdict vocabulary, a field
contract and a display name, all of them things ONE domain scores and
reports with. It is written through `PATCH /domains/:slug`, where it
is one member of a larger body, and it is documented under Domains
above.

What `operator_settings` holds is the deployment's own preferences
— which domain a caller that named none meant, which format a
digest takes, which channels a notification reaches. None of it
belongs to a domain, and none of it is reachable from a `/domains`
path.

The two are near enough in name that a reader may expect one route to
reach the other. Nothing here does. No path on this group takes a
slug, and `defaultDomainSlug` is the only member of either payload
that names the other side at all — as a value inside JSON, and
never as an address.

### A `PUT` rather than a `PATCH`, because the payload is the request

Omitting a member is how it is cleared. `SettingsStore.writeSettings`
replaces the stored payload rather than merging into it, so under a
merge the request that omits a preference and the request that removes
it would be the same bytes and removal would be unexpressible.

`PATCH /domains/:slug` is the shape that needs the other verb. There
`settings` is one member of a larger body, so omitting the member and
emptying it are two different requests and the surface has to tell
them apart. Here the payload IS the request and there is no third
state to express.

Strictness is what makes the replacement trustworthy, per the
validation rules above: a payload whose typo was silently stripped
would be a whole-unit write that quietly dropped what its author
wrote.

### A read before any write is `{}` and never a `404`

Absent settings mean the defaults apply, which is exactly what an
empty payload means once one has been written. There is nothing an
operator must create before they can configure something, so a missing
row is not a missing resource — the same argument
`domains.settings` already makes for its own `{}` default.

The port still reports which of the two the database is in, and that
is not a contradiction: `SettingsStore.readSettings` answers null for
a table with no row, because whether a row exists is a fact, while
treating the two as one state is a decision. `src/settings/service.ts`
is the single line that takes it.

### A write answers `200` and carries what is held

Not `201`, although the first write may create the row. The resource a
caller addressed exists before any row does — `GET /settings`
answers `{}` rather than `404` — so a `201` would announce a
creation no caller can observe, and would make the first write answer
differently from every later one for a reason about storage rather
than about the request. No `Location` header either: the address is
fixed, and the caller already has it.

Not `204`, because the answer is worth reading. A write is a
replacement, so what is held afterwards is what a caller checks
against what it meant, and the payload is read back rather than echoed
from the argument — `jsonb` may normalise the key order it stored.

### The default domain is checked on the way in, and it is a `422`

`defaultDomainSlug` names a `domains.slug` from inside a JSONB
payload, where no foreign key reaches, so the app layer is the whole
of the enforcement. A slug that is well formed and names no domain is
refused with one detail against that member carrying
`code: 'unknown_domain'` — this service's own code, since no
schema can raise a rule that is about rows.

A `422` and not a `404`, because the slug is a member of the BODY and
never the address. `PUT /settings` addresses the settings row, which
exists, and a body naming a domain that is not there is a body this
endpoint cannot accept rather than a resource that is missing. The
three sibling groups answering `404` for a slug are not being
contradicted: theirs arrives in the path.

The same member has a second refusal, from `slugParamSchema` refusing
its SHAPE, and the two answer the same status at the same field. The
`code` beside it is what separates them, which is the difference
between a spelling to fix and a domain to create.

The check is not maintained afterwards. A domain deleted later leaves
the slug naming nothing and nothing repairs it: it reads as no default
being set, which is the state the operator is one write away from
either way. So this is a guard against a typo rather than a
referential guarantee, and calling it the second would promise
something no column enforces.

### Neither route parses a query, and that is a departure

`GET /domains/:slug/categories` answers its collection whole and still
refuses `?page`, because a window silently ignored would let a caller
read every row believing it had read the first page. A singleton has
no page for a caller to believe in: `?page=2` on a route answering one
payload is as meaningless as it is on `GET /domains/:slug`, which is
the read this pair follows rather than the list routes.

### No refusal crosses this group's store port, and that is measured

`operator_settings` carries two mechanisms and both were seen firing
against the live server: a second insert at the singleton id is 23505,
and any id but 1 is 23514 — on a plain INSERT and through an `ON
CONFLICT` alike, because the row is formed before the conflict arbiter
is consulted. Neither is reachable from a request. `writeSettings`
spells the id from a constant of its own and absorbs the conflict by
upserting on it, which is why this is the one wave-1 group whose store
call cannot be refused.

So a `StoreRefusal` arriving out of this group would be a store doing
something its port does not describe. It is left to answer `500`
rather than given a plausible status no rule authorised.

## Schedule verbs

### Three routes write `next_run_at`, and no other route can reach it

`POST /topics/:id/run-now`, `POST /topics/:id/pause` and
`POST /exports/:id/run-now` are the whole of this surface's access to
a schedulable row's due time. Each writes `next_run_at` and nothing
else, through one store method declared for the purpose
(`updateTopicSchedule`, `updateSubscriptionSchedule`), and `nextRunAt`
is refused as an unrecognized key by every create and patch schema on
both groups.

That is two mechanisms saying one thing, and both are wanted. The
refusal is what a caller meets. The single-purpose store method is
what a future route meets, because a port offering exactly one
schedule writer cannot grow a second one by accident.

The two tables are `topics` and `export_subscriptions`, which are the
two that spread `schedulableColumns()` from
`src/db/schema/scheduling.ts`. Nothing else on this surface has a due
time, so the rule costs the other two groups nothing.

### A run-now is the extraordinary run, and refuses a disabled row

`run-now` writes the service clock's instant, so the next dispatch
tick claims the row whatever its interval said.

`enabled` false is a `409` rather than a write. The dispatch claim
reads `WHERE enabled AND next_run_at <= now()`, and the partial index
behind it — `topics_dispatch_claim_idx`,
`export_subscriptions_dispatch_claim_idx` — is declared over the
enabled rows alone. Writing the clock onto a disabled row therefore
produces a row that looks due forever and is never claimed: a silent
no-op the caller has no way to see. The `409` says it instead, and
enabling is a `PATCH` the caller takes first as its own decision.

Calling it twice is not refused. A row already due answers `200` again
with a later instant, because the verb describes a state — due now —
rather than an action taken, and refusing the second call would mean
answering `409` to a request asking for exactly what already holds.

### A pause bases on the later of the clock and the stored due time

`cycles` is a required member of the pause body, a positive integer
with a declared ceiling, and anything else is a `422`. The instant
written is `cycles` clamped intervals past a base, and the base is
whichever of the service clock and the stored `next_run_at` is later.

Both simpler rules are wrong in one direction each. Basing on the
clock alone pulls a topic due next week FORWARD on a request to defer
it. Basing on the stored time alone leaves an overdue row overdue, so
a pause of a row three days late buys nothing at all until the
dispatcher has caught up with it.

A `next_run_at` of NULL is a `409`. The claim reads
`next_run_at <= now()`, so a NULL row is not scheduled at all, and
pausing it would SCHEDULE it — the opposite of what was asked. A
seeded topic is exactly that row, since `data/topics.json` leaves the
column out on purpose, so this is an ordinary state rather than a
corner of one.

Pause is not disable. It does not write `enabled`, and the schema
keeps the two columns apart precisely so that deferring a run and
retiring a feed stay different requests with different undo.

### The clamp is the library's, and the cycle length passes through it

`pauseFrom` in `src/lib/schedule.ts` calls `clampIntervalSeconds` over
the row's own `minIntervalSeconds` and `maxIntervalSeconds` and
multiplies the clamped seconds by `cycles`. No route re-derives the
clamp, and no SQL counterpart is written for it: the API works out an
absolute instant in TypeScript and stores it, where `ar-dispatch`
expresses the same rule as `LEAST(max_interval_seconds,
GREATEST(min_interval_seconds, interval_seconds))` inside its claim
because there the claim and the reschedule are one statement.

The arithmetic lives in the library rather than in a service because
the library is the one place the rule is written, and it obeys the
three dual-context rules that file is held to — no value import,
declaration-form exports, nothing relying on module scope — so the
splice gate keeps passing over a grown module.

This narrowed a sentence next door, and that sentence has been
corrected. `docs/architecture/06-scheduling.md` used to count two of
the four modes through the bounds, on the reading that an
extraordinary run and a pause each write a timestamp directly. The
timestamp half was right: what `pauseFrom` clamps is the CYCLE LENGTH
it multiplies, not the instant it stores. But that makes THREE of the
four modes pass through the bounds, and that section now says three.

### The API never claims a row, opens a run, or invokes a workflow

`ar-dispatch` holds the only schedule trigger in the system, and
`docs/architecture/01-invariants.md` carries that as a row of its own.
A run-now that ran the work itself would be a second trigger,
answering to no batch cap, writing no `runs` row and spending against
no per-run ceiling — which is the shape the incident behind `capBatch`
took.

So the verbs write a column and stop. The tick that follows does the
claiming, the `runs` insert, the routing and the invoking, exactly as
it does for a row the periodic increment made due. `runs.scheduled_by`
records `operator` for both operator modes, because that column
attributes the choice rather than the arithmetic.

`tests/invariants/api-schedule-containment.test.ts` is what makes this
a property of the tree rather than a sentence here: no module under
`src/topics/`, `src/subscriptions/`, `src/sources/` or
`src/connectors/` names `runs`, `llm_calls`, `research_pool` or an n8n
invocation, and the two schedule ports declare exactly one
schedule-writing method apiece.

## Pipeline-owned columns

### A column the pipeline writes is answered and never accepted

Five columns on a source — `cursor`, `consecutiveFailures`,
`lastSuccessAt`, `lastFailureAt` and `flagged` — and `nextRunAt` on a
topic and on an export subscription are projected on every read and
refused as unrecognized keys on every write. That is the rule wave 1
already holds for `featureVersion` and `embeddingModel` on a domain,
applied to the columns wave 2's tables carry.

Answering them matters as much as refusing them. A health counter
nobody can read is a health counter nobody acts on, and
`GET /domains/:slug/sources` exists so that an operator can see which
feeds are failing before deciding which to retire.

The refusal is the schemas' `.strict()` doing its ordinary work rather
than a per-column check, which is what makes it hold for columns
nobody has written yet: one added to these tables later is refused by
default and has to be argued ONTO a request schema rather than quietly
inherited by one.

### `flagged` records what the pipeline saw, `enabled` what was decided

`flagged` is the adapter-rot detector's output. The pipeline raises it
when `consecutive_failures` crosses its threshold, and
`src/db/schema/sources.ts` says in as many words that it is set by the
pipeline and not by an operator. `enabled` is the column the schema
provides for retiring a feed, and it IS patchable — on sources, topics
and export subscriptions alike. That pair is the whole distinction:
one column records what the pipeline observed and the other records
what an operator decided, and this surface writes the second kind.

Clearing `flagged` therefore has no route here, and the gap is worth
naming rather than implying. `src/lib/source-health.ts` sets the flag
and never clears it, because clearing it is an operator's act, and the
act it means is a hand-written UPDATE for as long as this surface
offers no verb for it. Offering a bare patchable boolean would be
worse than the gap: clearing the flag without repairing the config
that failed brings it straight back on the next pass, so the button
that looks like a fix is the one that hides that nothing was fixed. A
verb that clears it as part of an operation that also re-runs the
source is the shape worth building, and it belongs with whichever wave
owns re-running a source.

`cursor` is refused for a narrower reason, and it is not that nobody
would want it. Rewinding a feed is a real operation; it is also one
that re-captures a window of documents, where `documents_hash_unique`
rather than anything on this surface decides what that costs. It stays
off the request schemas until something owns that question, rather
than being exposed as a text field on a patch.

## Connector secrets

### A secret is accepted on the way in and masked on every way out

`connectors.config` is a jsonb column and it is where an API key
lives. `src/connectors/secrets.ts` declares `SECRET_CONFIG_KEYS`, the
closed roster of key names that hold one, and the single
`MASKED_SECRET` literal that stands in for a value under any of them.
`maskConnectorConfig` replaces that value at any depth and whatever
its type, and every path that answers a config runs through it: the
list, and the rows `POST` and `PATCH` answer with.

Write-only is the parent spec's word and this is what it buys. A
caller can set a key and can tell that one is set; it cannot read one
back, and neither can anything reading a response over its shoulder —
a proxy log, a browser cache, a support ticket carrying a pasted body.

The match reads a key's NAME and reads it case-insensitively, because
the two mistakes cost different amounts. A key the roster fails to
recognise is a credential on the wire and nothing downstream reports
it. A key it recognises that holds no credential is a member answered
as the mask, which the caller sees at once and can rename. So the
roster errs wide, though not so wide as to swallow ordinary
configuration: a name earns its place when the name ALONE says the
value authenticates something, which `apiKey` does and a bare `key`
does not. Case is the only spelling difference the match absorbs —
`api_key` and `apiKey` are separate rows, and a third convention costs
a row rather than a rule.

One declaration sits behind both the masking and the refusal below.
Two rosters, or two literals, would drift apart on the first key added
to either, and the direction they drift in is a stored key answered in
the clear.

### The mask literal is refused as a submitted value

A `config` carrying `MASKED_SECRET` as a value is a `422` naming where
it sat, and never a write. `findMaskedSecretPaths` reports the literal
wherever it is and not only under a rostered key, because a value that
reads as a sentinel is never one somebody meant to store and because
the key it was copied onto need not be the key it was copied from.

The round trip this closes is the ordinary one. A caller reads a
connector, edits one member of the masked config, and sends the whole
object back. Without the refusal, the literal `MASKED_SECRET` is what
gets stored as that deployment's API key, the connector stops working,
and nothing in the response says why — the read afterwards shows the
mask, which is what it showed before.

The walk runs before the write is issued, so a body carrying the mask
costs the table no round trip; it also runs before the conflict is
met, so a create that both submits the mask and names a pair the
deployment already carries is a `422` rather than a `409`.

The detail carries no value, and it names the path with every
operator-chosen segment masked to `*`: `config.*` for a member of the
config, `config.*.*` for one inside it, one detail per occurrence.
That is the no-echo rule in `src/http/validation.ts` applied whole
rather than only its first half — a key inside an open record is
submitted content in the same sense a value is, and this refusal is
the one thing on the surface that reaches BELOW the `openPaths`
prefix, so it masks by hand what a zod issue there would have been
masked by. What survives is the depth and the count, which is enough:
a caller that submitted the mask knows which member it copied.

### A `config` is replaced whole, so an omitted key clears a secret

`config` follows `settings` on a domain. A `PATCH` supplying it stores
exactly that payload, a member left out is cleared rather than left
standing, and a patch omitting `config` altogether leaves the stored
payload alone.

The consequence is sharper here than on a domain, so it is stated
rather than smoothed over. A caller that reads a connector, drops the
masked key because it has no value to put there, and patches the
result has CLEARED that secret. The refusal above catches the caller
that keeps the mask; nothing catches the caller that removes it,
because that request is byte-identical to a deliberate one.

A merge would trade this for a worse problem: clearing a secret would
become unexpressible, since the request that omits a key and the
request that removes it would be the same bytes. The whole-unit
contract is the one a caller can reason about, and a client building a
patch sends back the members it means to keep.

### The containment is a sentinel capture, not a reading of the code

`tests/api/connector-secret.test.ts` boots the assembled service with
stdout, stderr and the console methods patched BEFORE any logger is
constructed, writes one sentinel secret through `POST` and `PATCH`,
reads it back through `GET`, and counts the sentinel in every response
body and in everything the process wrote. Zero, both directions.

A zero-hit scan with no live control is evidence of nothing, so the
file carries the controls q07's bootstrap-password test established. A
third boot mounts a route that logs the stored config and answers it
unmasked, proving both searches would find the sentinel. The create is
asserted `201`, and the store is asserted to hold the sentinel
verbatim, so the zero is about a value that genuinely traversed the
path rather than one that never arrived.

The `409` a duplicate (`kind`, `name`) raises while a sentinel secret
sits in the body is checked in the same file. A conflict detail is the
likeliest place a submitted body leaks back, and it is the one refusal
on this group a caller reaches while holding a real key.

## The failures queue

### `GET /sources/:id/failures` is read-only, and structurally so

The route reads `documents` where `parse_status = 'failed'` for one
source. It is the fail-flag-keep path's review surface: a payload that
would not parse is KEPT rather than dropped, and this is where
somebody reads what was kept.

Read-only is a property of the port rather than a convention the
handler observes. `SourceStore` declares no method that writes a
document at all, so a handler cannot mutate `parse_status` by mistake
or by a later edit — there is nothing to call.
`src/sources/failures-routes.ts` registers one `get` and no other
verb, and the route test reads that off the router's own `stack`
rather than transcribing it.

Retrying a failed capture is therefore not on this surface. It is a
pipeline operation with a cost and a dedupe question attached, and a
review queue that could also re-run work would be a second trigger of
the kind the claim under Schedule verbs rules out.

### The order is `captured_at DESC, id DESC`, so two pages agree

`captured_at` alone is not a total order. A batch capture writes many
documents inside one statement and `defaultNow()` gives them one
timestamp, so a tie at a page boundary lets page 1 and page 2 disagree
about which row they hold — one row shown twice and another shown
never, with nothing in either response saying so. The `id DESC`
tiebreak is what closes it, and the index behind both of this wave's
document readers is `documents_source_parse_status_idx` over
(`source_id`, `parse_status`).

The window itself is the ordinary one: `?page` and `?perPage` through
`paginationQuerySchema`, defaulting to 50, refused above 200, and a
page past the end answering an empty list rather than a `404`. This
route follows every pagination rule above and departs from none of
them.

### A stored body is masked, and `JSON.stringify` is not the masking

`body` and `parse_error` are served as stored except that every C0
control, DEL, every C1 control and every lone surrogate is replaced by
its `\uXXXX` TEXT form by `maskControlBytes` in
`src/http/control-bytes.ts`.

That is deliberately more than JSON escaping does. `JSON.stringify`
escapes C0 and lone surrogates and passes DEL and the whole C1 range
through as raw bytes, which is exactly how a control byte reaches a
terminal, a log file or a tracked artifact — where a raw NUL makes
`git diff` print `Bin` forever and makes POSIX grep report no match
for text that is present, both silently. A failed parse is the
likeliest body in the corpus to carry one, because what made it fail
is often what carries it.

The masking is checked by re-reading the OUTPUT rather than by
trusting the masker: a leg asserts that `JSON.stringify` of a masked
string carries no code point below 0x20 and none in 0x7F-0x9F. A
self-reporting redactor cannot see its own regex fail.

### The body is cut by code point, and the stored length travels too

`body` is cut to a module-level code-point cap, with the stored byte
length answered as `bodyBytes` and a `bodyTruncated` flag beside it.
`takeCodePoints` cuts by code point rather than by UTF-16 unit, so the
cap itself can never split an astral pair into a lone surrogate that
the masking would then have to escape.

The cap is on the route from the first commit rather than added when a
body gets big, which is the parent spec's word for it. A DLQ holds the
payloads that broke a parser, and the payload that broke a parser by
being enormous is exactly the one a review surface would otherwise
fetch whole.

`bodyBytes` is what lets a reader tell a cut body from a short one,
and it is the STORED length rather than the answered one — the two
differ by exactly what was withheld, which is the number worth having
when deciding whether to go to the database for the rest.

## Topics

### A topic is met in its domain and written by its id

| Method and path | Answers |
| --- | --- |
| `GET /domains/:slug/topics` | `200` with one page of the domain's topics, name ascending, plus `meta`. `404` for an unknown slug, `422` for a segment that is not a slug and for the pagination faults every list route answers. |
| `POST /domains/:slug/topics` | `201` with the stored row, unscheduled. `422` for a body the schema refuses, `404` for an unknown slug, `409` when the domain already researches that name. |
| `PATCH /topics/:id` | `200` with the row afterwards. `422` for a body the schema refuses and for a segment that is not an id, `404` for an unknown id, `409` when the resulting name is taken. |
| `DELETE /topics/:id` | `204` with no body. `404` for an unknown id, `422` for a segment that is not one. Never `409`: nothing hangs off a topic. |
| `POST /topics/:id/run-now` | `200` with the row afterwards, whose `nextRunAt` is the service clock's instant. `404` for an unknown id, `422` for a segment that is not one, `409` when the topic is disabled. Reads no body. |
| `POST /topics/:id/pause` | `200` with the row afterwards. `422` for a body the schema refuses and for a segment that is not an id, `404` for an unknown id, `409` when the topic is not scheduled. |

`src/topics/routes.ts` declares all six and decides none of them:
each handler reads the address, derives the window, calls the matching
function in `src/topics/service.ts` and chooses a status.

The collection hangs off `/domains/:slug` because a topic is a
question asked ABOUT the subject a domain names, and a caller holding
a slug should not have to look an id up to read it. The two writes
address `/topics/:id` instead, for the reason a persona is written by
id: the row carries its own `domain_id`, the one rule that spans a
domain — a name unique within it — is the database's, and repeating
the slug would let a request name a domain the row does not belong to.

### The last two rows are ruled on above, not here

`POST /topics/:id/run-now` and `POST /topics/:id/pause` are in the
table because they are this router's, and their answers are in it
because a reader looking up a path should find one. What is NOT
restated here is the reasoning: they write one column and no other,
and the rules behind each status — the disabled row, the
unscheduled row, the required `cycles`, the clamp the count
multiplies — are stated once for both schedulable groups under
`Schedule verbs`, because `POST /exports/:id/run-now` answers to the
same ones. Duplicating them here would give this surface two places
to disagree with itself about the same rule.

The clock is supplied to the router rather than read inside it, as
`AuthRouterOptions` supplies one for session expiry: a router built
once at boot and answering for the life of the process must not
close over the instant its wiring ran at.

`TopicServiceStore` names `updateTopicSchedule`, because
`src/topics/service.ts` holds the two verbs and one type stands for
all six functions rather than a second `Pick` being kept in step with
the first. So the containment is not that the handlers hold a store
that cannot write `next_run_at`; it is that exactly two of the six
derive an instant to write, and both do it through the one service
function that owns the column. The other four derive none,
`TopicPatch` carries no such member, all three request schemas refuse
the key, and `tests/invariants/api-schedule-containment.test.ts`
reads the modules rather than the types.

### A topic is created unscheduled, and a verb is what schedules it

`POST /domains/:slug/topics` lands a row whose `nextRunAt` is null
whatever the request said, because `InsertTopicInput` carries no such
member. A null due time is never claimed — the dispatch claim reads
`WHERE enabled AND next_run_at <= now()` — so a topic created here and
never run-now'd sits at null until something writes an instant.

That is stated rather than hidden, and it is the same state a seeded
topic is in: `data/topics.json` leaves the column out on purpose. The
alternative, defaulting a create to due-now, would make every import
of a domain's topics a burst of runs nobody asked for.

`enabled` defaults to true, so a topic staged switched off is one the
body said so about. The two interact: `run-now` refuses a disabled
row, so a topic created disabled has to be enabled by a `PATCH` before
it can be run, which is the caller's own decision to take first.

### A name is unique within its domain, and both writes can propose one

`topics_domain_id_name_unique` refuses a name the domain already
researches, on an INSERT and on an UPDATE alike. So a `409` carrying
`code: 'CONFLICT'` is the answer from `POST /domains/:slug/topics` and
from `PATCH /topics/:id` both, and the two are separate call sites
rather than one rule stated twice.

The key is per-domain and not global. The same name under a second
domain is accepted, which is what makes two domains free to research
the same subject through their own terms and their own cadence.

`name` is patchable, as a persona's role is and as a domain's slug and
a category's key are not. Nothing in schema v2 points at `topics`, and
the seed upserts on `(domain, name)`, so a rename changes which row a
seed pass adjusts rather than leaving a dangling pointer behind. That
is why a rename can collide at all.

The refusal names the rule and never the name, which is the validation
rule above applied to the one refusal on this group whose cause is a
value the caller sent.

### `searchTerms` is replaced whole, and the bounds distinguish three

A patch carrying `searchTerms` writes the list it was given. Nothing
is merged into the stored list and nothing is appended to it, so
removing a term is expressible and an empty array is a legal request
meaning the topic issues nothing. That is the same rule a domain's
`settings` is replaced under.

`minIntervalSeconds` and `maxIntervalSeconds` distinguish three
requests on a patch where they distinguish two on a create. Absent
leaves the stored bound alone, a number sets it, and an explicit
`null` clears it — the only way to remove a floor or a ceiling, and
unexpressible if absent and null meant one thing. On a create there is
nothing stored for an absence to leave alone, so the two fold
together there.

Each of the three interval members has to be a positive integer and
none is checked against the others. A floor above its ceiling is not
refused here: no CHECK relates the three, `clampIntervalSeconds`
already resolves crossed bounds to the ceiling, and a refinement on
this one path would enforce a rule the seed and every other writer
would pass by.

### A delete cannot be refused, and a create's `404` may be a lost race

No foreign key in schema v2 points at `topics`, so removing one has
neither a guard nor a cascade. There is no `?cascade=confirm` here and
nothing for one to authorise, which is the difference from
`DELETE /sources/:id`: a source accumulated a corpus that its
documents and sightings still reference, and a topic accumulated
nothing that names it. A run is not a counter-example — `runs` carries
no `topic_id`, so what a run was about survives its topic as recorded
text rather than as a reference.

A delete and a disable are different operations and this surface means
both. `enabled: false` through the patch keeps the subject, its terms
and its cadence and stops the topic coming due; the delete takes them.
Neither reaches work already dispatched, because the dispatcher claims
a row and commits its reschedule in one transaction.

`POST /domains/:slug/topics` resolves the domain and only then writes,
so a foreign-key refusal out of that write means the domain was
deleted in between. The fact to report is the one the lookup itself
reports — no domain carries that slug — so it is the same `404` rather
than a `500`, and a caller re-issuing the request gets one answer for
one state however the timing fell.

## Sources

### A source is met in its domain and written by its id

| Method and path | Answers |
| --- | --- |
| `GET /domains/:slug/sources` | `200` with one page of the domain's sources, id ascending, each carrying its five health columns and a `parseStats` record, plus `meta`. `404` for an unknown slug, `422` for a segment that is not a slug and for the pagination faults every list route answers. |
| `POST /domains/:slug/sources` | `201` with the stored row, never fetched. `422` for a body the schema refuses, `404` for an unknown slug. Never `409`. |
| `PATCH /sources/:id` | `200` with the row afterwards. `422` for a body the schema refuses and for a segment that is not an id, `404` for an unknown id. Never `409`. |
| `DELETE /sources/:id` | `204` with no body. `404` for an unknown id, `422` for a segment that is not one. `409` while documents or sightings still cite the source, carrying both counts in `details`; and `409` with no `details` at all when a key the guard does not count refuses the write. |

`src/sources/routes.ts` declares all four and decides none of them:
each handler reads the address, derives the window, calls the
matching function in `src/sources/service.ts` and chooses a status.

The collection hangs off `/domains/:slug` because a source is a feed
a domain reads, and a caller holding a slug should not have to look
an id up to list one. The two writes address `/sources/:id` instead,
for the reason a persona is written by id: the row carries its own
`domain_id`, no rule on this table spans a domain at all, and
repeating the slug would let a request name a domain the row does
not belong to.

`GET /sources/:id/failures` shares that second prefix and is NOT on
this router. It is `buildSourceFailuresRouter` in
`src/sources/failures-routes.ts`, because its subject is a
`documents` row rather than a `sources` one, and its rules are
stated under `The failures queue` above. Two routers under one
prefix is what the prefix table records and what `src/index.ts`
mounts.

There are no schedule verbs on this group. `sources` spreads no
`schedulableColumns()` and carries no `next_run_at` at all — a feed
is read when the topic that needs it comes due — so there is no due
time to bring forward and no cycle to count, and this router is
handed no clock.

### A list answers the health columns and a parse-status aggregate

Every row of `GET /domains/:slug/sources` carries the whole
`sources` row and one member the table does not have: a `parseStats`
record keyed by `DOCUMENT_PARSE_STATUSES`, counting the documents
captured through that source on each side of
`documents_parse_status_check`.

It is one grouped read over the whole page rather than one query per
row, and every member comes back present. A source that has captured
nothing answers a counted zero under each, which is the same
distinction the taxonomy's term counts draw: a left join gives a
parent with no children exactly one null-extended row, so a count of
rows answers one where a count of children answers zero.

The record is the store's to count. Nothing in the service or the
router fills a gap in it, because a gap filled at those layers would
be filled on the in-memory path and not on the live one.

The five columns beside it are what an operator reads a feed's
health off: `consecutive_failures`, `last_success_at`,
`last_failure_at`, `flagged` and `enabled`. Four are the pipeline's
and the fifth is the operator's, which is the pairing that makes the
reading useful — a feed failing every pass and a feed somebody
switched off are two states that have to be told apart.

### No create here can be refused, because the table has no key

`sources` carries no unique constraint at all, only
`sources_kind_check`. So `POST /domains/:slug/sources` has nothing
for a duplicate to land on and answers no `409`, which is the
departure from every other resource group on this surface.

Two rows naming one endpoint are ordinary rather than a fault: the
same feed read under two kinds, or a second row differing only in
`parser_config` while an arrangement is being cut over. The cost is
that a double POST leaves two rows fetching one feed and nothing
here notices.

A `kind` outside `SOURCE_KINDS` is a `422` from the boundary rather
than a CHECK refusal from the database, because both request schemas
hold the member to the same tuple `sources_kind_check` is generated
from. A CHECK refusal reaching the service therefore means the tuple
and the column have drifted apart, which is a deployment fault a
caller cannot act on: it answers `500`, and dressing it as a `422`
would tell an operator to fix a request that was correct.

### `kind` is patchable, and both jsonb members replace whole

`PATCH /sources/:id` accepts `kind`, which no natural key on this
surface is patchable in. This table can afford it because it has no
natural key: repointing a feed at a different transport is an
ordinary correction — a source configured as `url` that turns out to
serve an `api` payload — and what it changes is which adapter reads
the row on the next pass. The documents already captured stay
exactly where they are.

`parserConfig` and `contract` are replaced whole and never merged,
which is the rule a domain's `settings` is written under. An omitted
key is therefore a cleared key, and `{}` is how a caller empties one
of them rather than a workaround.

Every member of this patch distinguishes two requests and not three,
which is where it differs from the topics patch: absent leaves the
column alone, present writes it, and no member is nullable, because
every column a request may reach here is NOT NULL.

`domainId` is on neither schema, so no request can move a feed
between domains. The corpus it produced carries the old domain on
every row, so a move would leave a feed in one domain and its
documents in another with nothing in the schema to notice.

### A delete is refused absolutely, and the counts say what holds it

`documents.source_id` and `finding_sightings.source_id` both emit
`ON DELETE no action`, so the database refuses whoever asks.
`DELETE /sources/:id` reads both counts first so that the refusal
can say what the delete would have taken, and answers `409` carrying
them in `details`.

There is no `?cascade=confirm` here and nothing for one to
authorise, which is the difference from `DELETE /domains/:slug`.
What a domain cascade takes is the domain's own configuration, which
an operator can be shown and can authorise. What this would take is
a corpus and the syndication evidence citing it, and
`src/db/schema/findings.ts` argues at the column that the sightings
table IS the provenance record: a cascade would drop that evidence a
feed at a time, and every count taken afterwards would be lower with
nothing saying why.

So the refusal names the operation that was wanted instead.
`enabled: false` through the patch keeps the endpoint, the
arrangement and the corpus and stops the pipeline reading, and the
message says so.

BOTH COUNTS AT ZERO IS NOT A PROMISE THE DELETE WILL LAND, and the
second `409` is what that costs. A third key —
`source_config_proposals_source_id_sources_id_fk` — refuses a source
a config proposal still names and is not counted, and a capture can
write a document between the count and the write. Both arrive as an
ordinary foreign-key refusal out of the write and are answered `409`
with NO `details`, because the counted sentence names two tables
this one is reached with at zero. Two zeros invented there would say
the opposite of what happened.

### The queue under this prefix is read-only, ordered and capped

| Method and path | Answers |
| --- | --- |
| `GET /sources/:id/failures` | `200` with one page of the source's failed captures, `captured_at` descending with `id` descending breaking a tie, plus `meta`. `404` for an unknown id, `422` for a segment that is not one and for the pagination faults every list route answers — an undeclared parameter among them, naming `query` rather than the parameter. Never `409`. |

`buildSourceFailuresRouter` in `src/sources/failures-routes.ts` is
the whole of it: one `get`, no other verb, and a store that is the
three-read `Pick` `src/sources/failures-service.ts` declares. The
read-only rule is therefore two shapes rather than an observance
— a retry button could not be added here by a small edit,
because there would be nothing on the store for it to call.

The order, the masking and the cap are ANSWERED by this router
rather than chosen in it. The page arrives `captured_at DESC,
id DESC` because that is the port's rule, and the bodies arrive cut
to a code-point cap and masked because that is the service's. A
handler re-sorting a page it was handed would be answering a
different order from the one the window was taken under, which is
how two pages come to disagree about which row they hold; a handler
trimming a string it was given would be a second cap nobody would
notice drifting from the first. `The failures queue` above carries
the whole of each argument, and this is the sentence that says which
layer holds it.

The window is the ordinary one and departs from nothing above:
`?page` and `?perPage` through `paginationQuerySchema`, defaulting
to 50, refused above 200, and a page past the end answering an empty
list. A source whose captures all parsed answers an empty list too,
with a `200` — which is what tells it apart from an id no
source carries, and what the lookup in front of both document reads
exists for.

The query is read before the address, as on the list route beside
it. Both faults are facts about the request alone and neither costs
a read, so a request getting both wrong is answered about the
window: the half a caller can fix without knowing anything about
what is stored.

### The pipeline's five columns are answered and never accepted

`cursor`, `consecutiveFailures`, `lastSuccessAt`, `lastFailureAt`
and `flagged` are projected on every read this group answers and
declared by neither request schema, so `.strict()` refuses each as
an unrecognized key. That is the surface-wide rule above applied to
the columns this table carries for the pipeline, and it is stated
here because this is the group that carries the most of them.

`flagged` is the one worth arguing rather than asserting. It is the
adapter-rot detector's output, so clearing it without repairing the
config that failed brings it straight back — a patchable boolean
would be a button that hides that nothing was fixed. `enabled` is
the column the schema provides for retiring a feed, and it IS
patchable.

### The pending-config pair is not on this router, and q13 takes it

`GET /sources/:id/pending-configs` and
`POST /sources/:id/approve-config` are in the parent spec's sources
list and are not among the four routes above. They read and rule on
`source_config_proposals`, and they move to q13, the approvals wave,
where they land beside the entity approvals over `research_pool`.

`The paths wave 2 defers` above carries the whole argument, and the
same note sits beside the approval gate itself in
`docs/architecture/04-sources.md`. In short: the reason they were
carved out has expired — the table arrived on leg A with q09 and is
in the tree — and the deferral stands on the reason that has not,
which is that an approval gate is one vocabulary with two subjects
and `scripts/approve.ts` already rules on both from one CLI. The
HTTP half should arrive as one surface answering for both rather
than as half a surface here and the other half two waves later.

So this group is four routes rather than six on purpose, and this is
the sentence that says so.

## Connectors

### A connector is deployment-level, and addressed by nothing but id

| Method and path | Answers |
| --- | --- |
| `GET /connectors` | `200` with one page of the deployment's connectors, kind ascending with name ascending beside it, every `config` masked, plus `meta`. `422` for a `?kind` outside `CONNECTOR_KINDS` and for the pagination faults every list route answers. Never `404`: the collection has no address. |
| `POST /connectors` | `201` with the stored row, config masked. `422` for a body the schema refuses, including a `config` that submits the mask literal. `409` when the deployment already carries that kind by that name. |
| `PATCH /connectors/:id` | `200` with the row afterwards, config masked. `422` for a body the schema refuses and for a segment that is not an id, `404` for an unknown id, `409` when the RESULTING name is one that kind already holds. |
| `DELETE /connectors/:id` | `204` with no body. `404` for an unknown id, `422` for a segment that is not one. `409` while export subscriptions still name the connector, carrying the count in `details`; and `409` with no `details` at all when one is written between the count and the delete. |

`src/connectors/routes.ts` declares all four and decides none of
them: each handler reads the address, derives the window and the
filter, calls the matching function in `src/connectors/service.ts`
and chooses a status.

This is the one resource group on the surface that is not met in a
domain. `connectors` carries no `domain_id` at all — which model
endpoint answers, or which notebook an export is handed to, is a
fact about the deployment — so the collection hangs off the root,
there is no `:slug` to narrow, and no route here can answer a `404`
about a domain. A connector outlives every domain that named it,
and which domain wanted which connector is recorded where it varies,
in an `export_subscriptions` row.

There are no schedule verbs on this group and this router is handed
no clock. Nothing here reads the present: `connectors` spreads no
`schedulableColumns()` and carries no `next_run_at`.

There is no single-item `GET` either, which matters more here than
on the groups beside it. The list and the two writes are the whole
of what answers a `config` at all, so the masking rule below has
three paths out to hold rather than four.

### The list takes a `?kind`, and it is the surface's one exception

`GET /connectors` is the only list route here that reads a query
parameter beyond the window. `?kind` narrows the page to one family
of service and is held to `CONNECTOR_KINDS`, the same tuple
`connectors_kind_check` is generated from, so a family nobody
registered is a `422` naming the parameter rather than an empty page
whose emptiness a caller cannot account for.

The schema is `paginationQuerySchema` EXTENDED rather than a second
window respelt beside it, so `?page` and `?perPage` mean here
exactly what they mean everywhere else and the default, the cap and
the strictness are the ones `src/http/schemas.ts` argues for. That
last one is the half worth measuring: `.extend()` preserves
`.strict()`, so `?knid=llm` is still a `422` naming `query` rather
than a typo silently answered as an unfiltered page.

A kind is a FILTER and not a scope. Absent answers every connector
the deployment holds, and a registered kind no row carries answers
an empty page with a `200`, exactly as a window past the end does.
`meta.total` counts the rows the same filter selects, so
`?kind=llm` answers how many `llm` connectors there are and not how
many connectors there are.

### A secret goes in and never comes back out

`connectors.config` is where an API key lives, and every one of the
three routes above that answers a config answers it MASKED: the
value under any `SECRET_CONFIG_KEYS` member is replaced by the
single `MASKED_SECRET` literal, `__masked_secret__`, at any depth
and whatever its type. That includes the row a `POST` answers,
though the caller has just sent the credential — a create is
answered by the shape a read answers, and a body carrying the key
back would be the artifact the masking exists to prevent.

`Connector secrets` above carries the whole rule and its containment
proof. What this group's routes add is where it is applied: in
`src/connectors/service.ts`, once, and not in the router or the
store. `ConnectorStore` answers the config as STORED, because the
live suite compares a write against the raw row and `ar-ingest`
reads the column directly, so the mask is a property of what this
SURFACE answers rather than of what is held.

A `config` submitting `__masked_secret__` as a value is a `422` and
never a write, from both writes, naming the path with every
operator-chosen segment masked to `*` — `config.*` for a member and
`config.*.*` for one inside it, one detail per occurrence. The round
trip it closes is the ordinary one: a caller reads a connector,
edits one member of the masked config, and sends the whole object
back, at which point the literal would be stored as that
deployment's API key.

### A `config` is replaced whole, so an omitted key clears a secret

A `PATCH` supplying `config` stores exactly that payload. A member
left out is CLEARED rather than left standing, and a patch omitting
`config` altogether leaves the stored payload alone. `{}` is
therefore how a caller empties one rather than a workaround, and
`settings` on a domain is written under the same rule.

The consequence is sharper here than on a domain and is stated
rather than smoothed over. A caller that reads a connector, drops
the masked key because it has no value to put there, and patches the
result has cleared that secret — and nothing catches it, that
request being byte-identical to a deliberate clear. The refusal
above catches the caller that KEEPS the mask; this is the one it
cannot. A merge would trade it for a worse problem, since clearing
would then be unexpressible; `Connector secrets` above argues that
trade in full.

### The pair is the natural key, and both writes can propose one

`connectors_kind_name_unique` is over (`kind`, `name`), so one name
under two kinds is ordinary and only the pair collides. `POST` can
propose a taken pair and so can a `PATCH` that renames, and both
answer `409` with the same sentence — which names the PAIR rather
than the name, because a message naming the name alone would send an
operator looking for a collision that is not there.

The mask refusal is reached BEFORE the conflict, so a create that
both submits the mask and names a taken pair is a `422`. That is the
ordinary ordering of a fact about the request ahead of a fact about
the rows.

### `kind` is not patchable, which the sources group's is

The two columns look alike and are not. A source's kind selects the
adapter that reads that one row, so a patch there reaches only what
it names. A connector's kind is read by rows and by queries that are
not this one: an `export_subscriptions` row names a connector by id
while MEANING one of a particular kind, and the foreign key
constrains the id alone, so a kind patch would silently re-point
live subscriptions at another family. `ar-ingest`'s model lookup
selects `WHERE c.kind = 'llm' ORDER BY c.id LIMIT 1`, so the same
patch changes which row the pipeline calls without touching the row
it was reading. Neither is visible to any constraint.

So a connector whose kind is wrong is a different connector: delete
it and create the one that was meant, which is an explicit act with
a delete guard in front of it. A body naming `kind` is refused as an
unrecognized key, so its detail names `body` rather than `kind` —
the same word refused by a different mechanism from the one that
refuses a `?kind`, which is worth knowing when reading a detail.

Leaving the member off the patch schema also keeps
`connectors_kind_check` off the update, so a `PATCH` here can raise
exactly one database mechanism.

### A delete is refused while a subscription still names the row

`export_subscriptions_connector_id_connectors_id_fk` is the ONE
foreign key onto `connectors.id`, re-derived from the generated SQL
rather than from a plan, and it emits `ON DELETE no action`. So the
statement is refused whatever the guard decided; what the guard buys
is a refusal a caller can read, carrying the count in `details`
where the bare foreign-key error says only that something is in the
way.

There is no `?cascade=confirm` here and nothing for one to
authorise, which is the difference from `DELETE /domains/:slug` and
is a decision about what each act takes. A domain cascade takes the
domain's own configuration, which an operator can be shown and can
authorise. This would cancel deliveries that OTHER domains asked
for, and the operator retiring a shared service is not the operator
who subscribed to it. So the refusal names `/exports` as where those
subscriptions are edited instead.

The second `409` is a race rather than a key nobody counts, which is
where this group differs from the sources delete. The counted set is
complete, so a subscription written between the count and the write
is the only state that reaches it — and it answers a different
sentence with NO `details`, because inventing a zero there would say
the opposite of what happened and because the two want different
next acts: retry, or go and look at `/exports`.

An unknown id falls through the guard rather than being looked up
first. Nothing points at a row that is not there, so the count is
zero, the guard passes, and the store answers that it removed
nothing — the same `404` a lookup would have raised, one round trip
earlier.

## Export subscriptions

### A subscription is met in its domain and written by its id

| Method and path | Answers |
| --- | --- |
| `GET /domains/:slug/exports` | `200` with one page of the domain's subscriptions, format ascending with the connector id ascending beside it, plus `meta`. `404` for an unknown slug, `422` for a segment that is not a slug and for the pagination faults every list route answers. |
| `POST /domains/:slug/exports` | `201` with the stored row, unscheduled. `422` for a body the schema refuses and for a `connectorId` no connector carries, `404` for an unknown slug, `409` when the domain already exports that format to that connector. |
| `PATCH /exports/:id` | `200` with the row afterwards. `422` for a body the schema refuses, for a `connectorId` no connector carries and for a segment that is not an id, `404` for an unknown id, `409` when the resulting triple is taken. |
| `DELETE /exports/:id` | `204` with no body. `404` for an unknown id, `422` for a segment that is not one. Never `409`: nothing hangs off a subscription. |
| `POST /exports/:id/run-now` | `200` with the row afterwards, whose `nextRunAt` is the service clock's instant. `404` for an unknown id, `422` for a segment that is not one, `409` when the subscription is disabled. Reads no body. |

`src/subscriptions/routes.ts` declares all five and decides none of
them: each handler reads the address, derives the window, calls the
matching function in `src/subscriptions/service.ts` and chooses a
status.

The collection hangs off `/domains/:slug` because a subscription is a
standing request for what one domain produces, and a caller holding a
slug should not have to look an id up to read it. The other three
address `/exports/:id` instead, for the reason a topic is written by
id: the row carries its own `domain_id`, the one rule that spans a
domain — a format delivered to a connector at most once — is the
database's, and repeating the slug would let a request name a domain
the row does not belong to.

### The path base is `/exports` and the directory is `subscriptions`

They differ on purpose, and this is the section that says why, since
a reader looking up `POST /exports/:id/run-now` will find it in
`src/subscriptions/routes.ts` and has no other way to learn that this
is deliberate. The wave-2 prefix table above records the same split
one line at a time; here is the argument.

`src/exports/` was already taken when this group was planned, by the
RENDERER registry q12 fills. A renderer turns a domain's material
into the bytes of one format; a subscription is a standing request to
deliver those bytes to one connector on a cadence. They are two
different things about one word, and putting both under one directory
would make the registry and the HTTP surface look like halves of one
module. So the directory is named for the table it serves,
`export_subscriptions`, exactly as `src/topics/` and `src/connectors/`
are.

The prefix stays `/exports` because it is the caller's noun rather
than the schema's. What a client is asking for is an export,
delivered on a schedule; `/subscriptions` would read as a billing
noun on a surface that has none, and `/export-subscriptions` would be
the only hyphenated prefix here. The one cost is paid in the `404`
message, which names the resource in full — `No export subscription
carries that id` — so a caller that met it while addressing
`/exports/:id` is told the noun it would search this document for.

`src/sources/` splits the other way round for a different reason, and
the two are not one pattern: there the directory name matches the
prefix and it is the CONTENTS that are shared, the HTTP half sitting
beside an adapter contract that was there first.

### A subscription is created unscheduled, and the verb schedules it

`POST /domains/:slug/exports` lands a row whose `nextRunAt` is null
whatever the request said, because `InsertSubscriptionInput` carries
no such member. A null due time is never claimed — the dispatch claim
reads `WHERE enabled AND next_run_at <= now()` — so a subscription
created here and never run-now'd sits at null until something writes
an instant.

That is the same state a seeded subscription is in, and the same rule
`Topics` above states for the other schedulable table. The
alternative, defaulting a create to due-now, would make importing a
domain's exports a burst of deliveries nobody asked for.

`enabled` defaults to true, so a subscription staged switched off is
one the body said `enabled: false` for. That row is legal, and it is
the one state `POST /exports/:id/run-now` refuses: the rules behind
that `409`, and behind the verb generally, are stated once for both
schedulable groups under `Schedule verbs` above, because the topics
group has a run-now answering to the same ones. Duplicating them here
would give this surface two places to disagree with itself.

There is no pause under this prefix, which is where this router is
shorter than the topics one rather than a copy of it. A pause defers
a question that would otherwise be asked. A delivery nobody wants for
a while is one an operator switches off with `enabled: false` and
switches back on — a digest that skipped three cycles and one that
was suspended are the same thing to whoever reads it. The verb would
be additive if that turns out to be wrong.

### The natural key is a triple, and both writes can propose one

`export_subscriptions_domain_id_format_connector_id_unique` is over
(`domain_id`, `format`, `connector_id`), so a domain taking one
format to two connectors is ordinary, and so is a domain taking two
formats to one. Only the whole triple collides. `POST` can propose a
taken one and so can a `PATCH` that re-formats or re-points, since
`patchSubscriptionSchema` carries two thirds of the key, and both
answer `409` with the same sentence — which names all three parts,
because a message naming the format alone would send an operator
looking for a collision that is not there.

`domainId` is the third and is NOT patchable, so no request here can
move a subscription between domains. A subscription is a request
ABOUT the material one domain produces, and a move would carry it to
another domain's.

### A `connectorId` naming no row is a `422`, not a `404`

Both writes that can name a connector resolve it before they write,
through `ConnectorStore.findConnectorById`, and an id no row carries
is a `422` whose one detail names `connectorId` and carries
`code: 'unknown_connector'` — the service's own code rather than one
of zod's, since the shape was legal and the value was a positive
integer, and what failed is a question only the store could answer.

The difference from the `404` a bad `:slug` answers is the difference
between an address and a payload. A slug is where the request was
SENT, so a slug naming nothing means there is nothing at that
address. A `connectorId` is something the request SUBMITTED, so an id
naming nothing means one member of the body is wrong and the refusal
names it. `parentId` on a category is the same column shape answered
the same way.

Resolving it rather than translating the foreign key is what leaves
`export_subscriptions_connector_id_connectors_id_fk` holding only the
race, and it is what makes the `PATCH` answer the same `422` for the
same fault as the `POST`. A foreign-key refusal that does reach the
boundary is that race, and the insert can lose two of them: it is
answered as the domain `404`, which misattributes the rarer one and
errs in the safer direction, since a caller told its address is gone
re-reads the address while a caller told its body is wrong would go
looking at a member that was correct.

### A delete cannot be refused, and it is not a disable

Nothing in schema v2 points at `export_subscriptions`, re-derived
from the generated SQL rather than from a plan, so `DELETE
/exports/:id` has no guard and no `?cascade=confirm` for one to be
waived by. It answers `204` or the `404` and `422` its address can
raise, and nothing else.

A delete and a disable are different operations and this surface
offers both, because it means both. `enabled: false` through the
patch keeps the format, the destination and the cadence and stops the
subscription coming due; the delete removes them. Neither reaches
work already dispatched: `ar-dispatch` claims a row and commits its
reschedule in one transaction, so by the time a delete can take the
row the render it claimed for has already gone out.

### This group answers no config, and so masks nothing

The credential a delivery authenticates with is not on this table. A
subscription stores a `connector_id`, and the `config` holding an API
key is a column of `connectors` — which `Connector secrets` above
masks on every path that answers one. So no route here reads that
column, no route here masks anything, and a caller wanting to know
where a delivery goes reads `GET /connectors`: one request for the
whole page rather than one per row, and the surface that does the
masking.

That is also why this list route joins nothing. A row answers the id
it delivers to, and expanding it into the connector would put a
masked config inside a page that has no other reason to carry one.

### The list reads the window and nothing else

`GET /domains/:slug/exports` takes `?page` and `?perPage` through
`paginationQuerySchema` unchanged — no `?format`, no `?connectorId`,
and no extension of the kind `GET /connectors` declares. The window
is the ordinary one: defaulting to 50, refused above 200, and a page
past the end answering an empty list rather than a `404`. This route
follows every pagination rule above and departs from none of them.

A filter would be a narrowing nobody has asked for over a collection
a single page already holds — a domain's standing export requests are
counted in single figures, bounded by how many formats there are
times how many connectors a deployment runs. It would be additive if
that stops being true.

## Read-first

### No port in this wave declares a method that recomputes anything

Read-first is a property of the port types rather than a promise a
handler keeps. `FindingStore`, `DocumentStore`, `EntityStore` and
`RunStore` declare no method that writes `findings.score`,
`findings.score_version` or `documents.parse_status`, so a handler
cannot re-score a finding or re-file a parse by mistake or by a
later edit — there is nothing on the store to call.

That is the shape `GET /sources/:id/failures` already took one wave
earlier, stated once for a whole wave rather than argued per group.
It is worth having as a type rather than as a sentence because the
edit that would break it is small and reads as an improvement: a
review surface showing a failed parse is one line away from offering
to retry it, and a findings list showing a score is one line away
from offering to recompute one.

### The wave writes in exactly four places, and they are named

The four writers are the verdict append on `finding_labels`, the
patch on `entities`, the approval on `research_pool`, and the
approve-and-apply on `source_config_proposals` and the source row it
updates. Everything else this wave serves is a read.

`tests/invariants/api-read-first.test.ts` derives that split from
`keyof` over the port and patch types rather than from this
paragraph, so a fifth writer added to a port fails the invariant
naming itself, and a patch type gaining a `score`, `scoreVersion` or
`parseStatus` member fails it the same way. A roster nothing checks
is a roster the next contributor widens, which is the same argument
the MCP non-exposure claim rests on.

### A workflow is not reachable from here, and the ledger is not written

`The API never claims a row, opens a run, or invokes a workflow`
above is a wave-2 claim about the schedule verbs, and it holds
unchanged for a wave whose whole subject is what a pipeline
produced. Nothing here opens a run, closes one, appends to
`llm_calls`, or writes `entity_research`: those rows are written by
`ar-research`, `ar-score` and `ar-digest`, and this surface reads
them and rules on them.

`run-now` remains the only spelling on the whole API that causes
work, and it causes it by setting a schedule column that
`ar-dispatch` picks up. A wave that answers runs and their cost is
exactly the wave where a second trigger would look reasonable, which
is why the claim is restated here rather than left to the section
that first made it.

## Verdict vocabulary

### The accepted set is read per request off the domain row

`finding_labels.verdict` is the one NOT NULL text column in schema v2
that is constrained to a value set and carries no CHECK for it. The
set is `DomainSettings.verdictVocabulary` on the OWNING domain's row,
and `DEFAULT_VERDICT_VOCABULARY` in `src/db/schema/values.ts` where
that domain names none.

So `PATCH /findings/:id/verdict` resolves the finding, reads the
domain it belongs to, and judges the submitted verdict against what
that row holds at the moment of the request. Not compiled in, not
cached for the process, and not narrowed to a union type anywhere on
the way: a `Verdict` union would re-close in the code exactly what
the column deliberately leaves open, and every consumer written
against it would then refuse the verdicts of any domain that had
exercised its own ladder.

A domain naming NO vocabulary and a domain naming an EMPTY one are
different requests and get different answers. The first is judged
against the default ladder; the second has named a ladder with
nothing on it and every verdict is refused. That falls out of the
whole-unit `settings` rule in the Domains group above rather than
being decided again here — an absent member and a present empty one
are already two different requests everywhere else on this surface.

### The refusal names the accepted set and never the submitted value

A verdict outside the vocabulary is a `422` whose detail names the
field path and the ACCEPTED set. The submitted string appears in no
message, in no detail and in no log line.

This is `A validation detail names a field path and never a submitted
value` above, applied to the one route on the surface whose entire
subject is a string the caller chose. Nothing narrower would do:
answering `"quarantine" is not a verdict` reads as helpful and writes
the request into the response body and the warn line, which is the
trap `src/http/validation.ts` exists to close.

The accepted set is not submitted content, and answering it is not
the mirror of the same fault. A vocabulary is the operator's own
configuration, stored inside the `settings` payload that
`GET /domains/:slug` already answers whole to the same credential —
so a caller learns which ladder this domain judges on and learns
nothing it was not already entitled to read. What a request carried
is the thing nobody else had.

Because the set is read per request, the refusal is a statement about
a moment rather than about the API. A verdict refused now is accepted
after the domain's settings are widened, with no deploy in between,
which is the whole reason the vocabulary is a setting.

### A ruling is appended, and the sequence is the record

`finding_labels` carries no unique key at all, so a second ruling on
one finding APPENDS a row rather than updating one. The verdict in
force is the newest row by `labelled_at` with `id` breaking the tie —
the same total-order shape the failures queue and the run ledger
take, and for the same reason a tie at a page boundary is otherwise
free to disagree with itself.

Re-judging is an operator changing their mind, and the ruling it
replaces is a true statement about the moment it was made under the
ladder in force then. An UPDATE would destroy the only thing on this
table that nothing recomputes: findings are rebuilt by re-scoring a
corpus, and nothing rebuilds what a person concluded.

## Time windows and sort keys

### One window vocabulary, `since` and `until`, and it is half-open

`?since` and `?until` are ISO-8601 datetimes, each optional, and the
bounds they name are half-open: a row stamped exactly at `since` is
IN the window and a row stamped exactly at `until` is not. They are
declared once, as `timeWindowQuerySchema` in `src/http/schemas.ts`
beside `paginationQuerySchema`, with `toTimeWindow` translating a
parsed pair into what a store port takes exactly as `toStoreWindow`
translates a parsed page.

What it translates them INTO says which side each bound closes:
`sinceInclusive` and `untilExclusive`, rather than the two words the
wire uses. `since` and `until` do not carry their own inclusivity,
and a store writing `<= until` is a bug no type could report — a
member called `untilExclusive` is read by whoever writes the
predicate, which is where the mistake would otherwise be made. An
absent bound arrives as `null` rather than as a missing key, so a
store branches on one shape.

Two groups read that vocabulary — the findings list and the spend
summary — and neither declares a second spelling of it. No
`?from`/`?to`, no `?days`, and no bare `?date`. This is the
pagination rule one level up: the translation happens once so that
two surfaces cannot come to disagree about what a window means.

Half-open rather than closed because two adjacent windows should
partition a ledger rather than overlap on it. Closed bounds put every
row stamped on the boundary into both of them, which double-counts
exactly at the seam a caller paging through time crosses most often,
and no member of either answer says it happened.

### A window narrows what is counted; a page windows what is answered

The two are different questions and a route may read both. The
findings list does: `?since`/`?until` decide which findings are in
the collection, and `?page`/`?perPage` decide which slice of it comes
back. A route reading both COMPOSES the two declarations rather than
respelling either, the way `GET /connectors` extends the page schema
for its `?kind`, so the default, the cap and the strictness are
inherited and an undeclared parameter is still a `422` naming
`query`.

The composition has a DIRECTION, and it is not the one that reads
naturally. `since` before `until` is a check on the window OBJECT,
and measured against this tree's zod, `.extend()` carries such a
check OUTWARDS and not inwards:
`timeWindowQuerySchema.extend(paginationQuerySchema.shape)` refuses
an inverted window and
`paginationQuerySchema.extend(timeWindowQuerySchema.shape)` accepts
one. Both spellings type-check, both answer every other request
identically, and only one of them refuses — so a list route reading
a window extends FROM the window schema, and
`src/http/schemas.test.ts` sends an inverted window through the
composed query rather than through the window schema alone.

`GET /spend/summary` reads the window and no page at all, which puts
it in the small unpaginated class `GET /domains/:slug/categories`
opened. They are unpaginated for different reasons and it is worth
not reading them as one convention: a domain's taxonomy is small by
construction, while a summary is bounded by the WINDOW it aggregates
over — a bucket per domain per day, so the size of the answer is a
function of the span and of how many domains the deployment runs
rather than of how much the ledger holds.

That is why the span itself is bounded on the way in. `/spend/summary`
defaults to a declared number of days and refuses one above a declared
maximum with a `422`, so no request can ask for an unbounded scan of
`llm_calls`. It is the same decision `perPage` is refused above 200
for, taken on the axis this route actually windows.

### `since` at or after `until` is a `422`, not a swap and not a clamp

An unparseable stamp and a `since` that is not strictly before its
`until` are both refusals out of the same parse, with a field path
naming the parameter and no submitted value in the detail.

Swapping the two would answer a window nobody asked for, and clamping
either would make the answer disagree with the request in a way
nothing in the body reports — which is the argument `perPage` above
the cap already loses. An empty window is a legitimate request and
answers an empty result; an inverted one is a mistake and says so.

### A sort is a declared key, and never a column name

`?sort` takes one member of a tuple the route declares — `score` and
`recency` on the findings list — and never a column name, never a
direction, and never a comma-separated list of either. A key outside
the tuple is a `422` naming the parameter and the accepted keys.

The tuple states its own default by its ORDER: `sortQuerySchema`
defaults an absent `?sort` to the FIRST member, so a route names its
default ordering once rather than in a tuple and again in a default
that could come to disagree with it.

The keys name ORDERINGS rather than columns, and that is the whole
point of the spelling. `score` is three keys deep: score descending
with a finding carrying none sorted LAST rather than lowest, then
`created_at` descending, then `id` descending. That order is
`compareFindings` in `src/lib/digest-assemble.ts`, which the digest
selection and every renderer already agree on, expressed in SQL.
Accepting `?sort=score&dir=asc` would put a second authority on an
order this repository has already settled once, and accepting a bare
column name would let a caller ask for one no index answers.

Every ordering this surface offers ends in `id`, on the tie-break
rule the failures queue's own ordering states in full: a timestamp
alone is not a total order, and a tie at a page boundary is how page
1 and page 2 come to disagree about which row they hold, with nothing
in either response saying so.

## Stored untrusted text

### Two surfaces cut at one cap, and it is one binding rather than two

`BODY_CODE_POINT_CAP` moves out of `src/sources/failures-service.ts`
and into `src/http/control-bytes.ts`, beside `maskControlBytes` and
`takeCodePoints`. The failures service imports it from there, the
documents service reads the same binding, and neither declares a
number of its own.

Two literals that agree today are two caps. The day one of them moves
there is nothing in either file that reports the other did not, and a
review surface and a debug surface answering different amounts of one
stored body is precisely the drift nobody looks for. A case holds the
two imports EQUAL rather than transcribing the number, on the rule
the constant's own TSDoc already states for its tests: a reading that
restates the value stays green against a value that has moved.

### The second reader is held to the masking rather than deciding again

`GET /domains/:slug/documents` answers `body` and `parse_error` with
every C0 control, DEL, every C1 control and every lone surrogate
replaced by its `\uXXXX` text form, which is the masking rule in
`The failures queue` above applied unchanged. That section carries
the whole argument — what JSON escaping does not cover, and what a
raw control byte does to a terminal, a log file or a tracked
artifact.

The documents view is the wider reader of the two, and the widening
is the part worth arguing. The failures queue answers rows whose
`parse_status` is `failed`, where the bytes that broke the parser are
the likeliest in the corpus to be hostile. This route answers both
members of `DOCUMENT_PARSE_STATUSES`, so most of what it serves
parsed cleanly — and a document that parsed is untrusted text all the
same, because what it came from is a fetch of somebody else's bytes
either way. Masking only the failed half would make the masking a
property of a status column rather than of where the text came from.

### `bodyBytes` travels with the cut, on both surfaces

The stored byte length is answered beside a `bodyTruncated` flag, and
it is the STORED length rather than the answered one. The two differ
by exactly what was withheld, which is the number a reader needs to
decide whether to go back to the database for the rest.

The cut is by code point rather than by UTF-16 unit, so it can never
split an astral pair into a lone surrogate that the masking would
then have to escape — the two rules are ordered rather than merely
both present.

## The approval vocabulary

### Two gates, one vocabulary, and `src/approvals/ruling.ts` holds it

This repository has two approval subjects. `research_pool` carries an
intention to research an entity, held by
`research_pool_approval_check`; `source_config_proposals` carries a
proposed parser config, held by
`source_config_proposals_approval_check`. `scripts/approve.ts`
already rules on both from one CLI, and the HTTP half arrives as one
vocabulary rather than as two that agree for a while.

`src/approvals/ruling.ts` is where it lives: the ruling projection
both routes answer with, and the closed roster of refusal reasons
either may raise, as named tokens rather than as strings written out
at two call sites. It imports no store, writes nothing and reaches no
table — it is a vocabulary, not a service.

That is the promise `The paths wave 2 defers` above made when the
pending-config pair was carved out of wave 2. The pair could have
landed there against a table that was already in the tree; what it
could not have landed with is the other subject, and half a
vocabulary is what the deferral bought its way out of.

### An approval is idempotent, because a second one is not a re-date

Both writes stamp `coalesce(approved_at, now())`, matching
`approveById` and `approveProposalById` in `scripts/approve.ts`
member for member. Ruling twice on one row keeps the time the first
ruling was given, so a re-approval is a no-op rather than a way to
re-date something already paid for.

Nothing in the database refuses the other behaviour. Both CHECK
constraints hold the two timestamps against each other and never
consult the status column, so a bare `now()` here would be accepted
and would quietly move the record of when a person agreed. That makes
the `coalesce` the writer's discipline rather than the schema's — the
reading `research_pool.approved_at` records at the column — which is
why it is stated here and held by a case rather than assumed from the
DDL.

### An approval names its own row, or it is a `404`

`POST /entities/:id/approve-research` takes `{ poolId }` and
`POST /sources/:id/approve-config` takes `{ proposalId }`, both
`.strict()`. A row whose parent is not the addressed one is a `404`
rather than an approval granted to somebody else's intention.

The id in the body is not enough on its own, and the segment is not
decoration on a route that could have been flat. An operator ruling
from a queue they are looking at addresses the parent they are
looking at, and the pairing is what turns a mistyped id into a
refusal instead of into an approval of whatever that id happened to
name.

### The API ratifies, and never writes what it ratified

Approve-research writes the approval and never `entity_research`.
That table is what a research pass found out and is `ar-research`'s
to write; no method on any port in this wave touches it. The gate is
the ratify half of the propose-then-ratify pattern the parser-config
proposals already use, and a surface that could write both halves
would be a proposer wearing a gate's name.

Approve-config is the same split with one more step, because an
approved config is only worth anything once it is on the source row.
It writes the approval and the two source columns in ONE
transaction, and it derives those columns through
`proposalToSourceUpdate` in `src/sources/config-proposer.ts` rather
than copying them off the row. That function gates on `approved_at`
and on nothing else — `status` is deliberately not consulted — and
throws on a row carrying none. It is the applier q09 declared, and
the refusal is one this route is not allowed to re-derive in its own
words.

### The pending queue is the CLI's queue, and it is oldest-first

`GET /sources/:id/pending-configs` selects `status = 'pending'`
ordered `proposed_at ASC, id ASC`, which is `listPendingProposals` in
`scripts/approve.ts` member for member. One queue with two clients,
rather than two queues that happen to agree today and drift the first
time either side adds a predicate.

Oldest-first is a queue rather than a list, and it is the one
time-ordered collection on this surface that runs that way: a
backlog is worked from its head, so the proposal that has waited
longest is the one an operator should be offered first. Every other
collection ordered by time here — the failures queue, the findings
list, a run's ledger — is newest-first, because each is a record
being read rather than a backlog being cleared. The `id ASC`
tiebreak is the same total-order rule as everywhere else:
`proposed_at` alone is not one, and a proposer writing several rows
inside one transaction gives them all one stamp.

## The spend ledger

### `llm_calls` carries no money column, so no member here is currency

The table holds `node`, `model`, `prompt_chars`, `est_tokens` and
`called_at`, and no price, rate, amount or currency at all. So
`GET /spend/summary` answers `calls`, `promptChars` and `estTokens` —
a count and two magnitudes — and there is no member of it a reader
can mistake for a cost, because there is no column behind one.

This is the group where the name of the surface pulls the other way,
which is why it is written down before the route exists. `spend` is
what the question is called and what the widget reading it is for; a
member called `cost`, a `usd` beside a total, or a rate applied on
the way out would each be a number nobody measured, answered in the
one shape a reader trusts without checking.

### `est_tokens` does not reconcile with a bill, and the column says so

Its own TSDoc is the authority and states it plainly: the `est_` is
load-bearing, the value is arithmetic over `prompt_chars` — characters
divided by a constant, in the design this port draws from — so the
two columns are one reading expressed twice rather than two
independent ones, nothing stored says which estimator produced it,
and a total over it does not reconcile with a bill.

What it IS good for is comparison. A magnitude lets one run be held
against another, one node against another, one week against the week
before, and every one of those is what the summary is read for. A
number that cannot be compared to an invoice can still be compared to
itself, and saying which of the two it is here is what keeps a
consumer from doing the other thing with it.

`prompt_chars` and `est_tokens` are both nullable, and a NULL means
nothing measured that call rather than a call that sent nothing —
zero is a real reading here, a call declined before it was sent. A
summary totalling them therefore reports a sum over the calls that
WERE measured beside a count of all of them, and the two disagreeing
is information rather than a fault.

### The bucket is UTC, and it is stated rather than inherited

The day bucket is `date_trunc` over `called_at` at UTC explicitly,
never at whatever zone the session happens to carry. `called_at` is
`timestamptz`, so it names an absolute instant and the truncation is
what chooses a calendar to name it in — `date_trunc('day', ...)`
reads the session's own `TimeZone` unless the value is taken
`AT TIME ZONE 'UTC'` first. That is a setting rather than a constant,
so a bucket left to it is a silent per-deployment difference in every
number the widget shows: two deployments of one build, reading one
ledger, would answer different summaries and nothing in either answer
would say why.

The window is parsed as ISO-8601 and the stamps are compared as
instants, so the grouping is the one step in the whole read where a
default could quietly have introduced a second calendar. Stating it
costs four words in the SQL and closes the class.

`runs.domain_id` is nullable — a maintenance or cross-domain tick
belongs to no domain — so the summary carries a bucket whose domain
is null rather than dropping those calls or attributing them
somewhere. Calls that belong to no domain still belong to the
deployment, and an aggregate that silently omits them is a total
that does not add up to the ledger it claims to summarise.

## Findings

### A finding is met in its domain and addressed by its id

| Method and path | Answers |
| --- | --- |
| `GET /domains/:slug/findings` | `200` with one page of the domain's findings, in the ordering `?sort` names, plus `meta`. `404` for an unknown slug, `422` for a segment that is not a slug, for an unparseable or inverted window, for a `?sort` outside the two declared keys, and for the pagination faults every list route answers. |
| `GET /findings/:id` | `200` with the finding, its sightings, its rulings newest first and its entity's research. `404` for an unknown id, `422` for a segment that is not one. Reads no query at all. |
| `PATCH /findings/:id/verdict` | `200` with the appended `finding_labels` row. `404` for an unknown id, `422` for a segment that is not one, for a body that is not `{ verdict, note? }`, for an undeclared key in it, and for a verdict outside the owning domain's ladder. |

`src/findings/routes.ts` declares all three and decides none: each
handler reads the address, takes apart the query or hands on the body
it was given, calls the matching function in
`src/findings/service.ts` or `src/findings/verdict-service.ts`, and
chooses a status.

The collection hangs off `/domains/:slug` because a finding is what a
domain's criteria produced, and a caller holding a slug should not
have to look an id up to read one. The single get and the ruling
address `/findings/:id` instead, for the reason a topic is written by
id: the row carries its own `domain_id`, no rule on this table spans
a domain, and repeating the slug would let a request name a domain
the row does not belong to. The ruling is where that would cost most,
since the ladder it is judged against is read off `domain_id` and a
slug in the path would be a second answer to a question the row has
already settled.

None of the three can answer `409`. Neither read decides on stored
state beyond whether the domain and the finding are there, and the
ruling has no conflicting state to refuse — `A second ruling` below
is why — so the refusals available to this group are the `404` about
the address and the `422` about the request and nothing else.

### The reads and the ruling are two modules on one router

`PATCH /findings/:id/verdict` belongs to this router and is addressed
the same way, but it is not served by the same module. The two reads
are `src/findings/service.ts` and the ruling is
`src/findings/verdict-service.ts`, so the store the reads are handed
does not name the one method that appends a `finding_labels` row, and
no handler serving them could append one by mistake or by a later
edit. `Read-first` above states why that is a type rather than an
observance.

That split is what lets the two be read separately. What a verdict IS
— the set it is judged against, the refusal that names that set
rather than the submitted value, and the append that makes the
sequence the record — is argued once under `Verdict vocabulary`
above, because it is a fact about the column rather than about this
route.

What the three sub-sections at the foot of this group add is what the
ROUTE does under each of them: which row the ladder is read off, how
a client tells the two `422`s apart, and what a second ruling on one
finding answers.

### Two narrowings and a window, and none of them refuses a value

`GET /domains/:slug/findings` reads `?verdict`, `?category`,
`?since`, `?until`, `?sort`, `?page` and `?perPage`, and no other
parameter. Its schema composes the three shared declarations rather
than respelling any of them, so the 50-row default, the 200 cap, the
ISO-8601 stamp format, the half-open bounds and the
first-member-is-the-default rule are all inherited — and the
composition extends FROM the window schema, for the reason
`A window narrows what is counted` above measures.

The two narrowings accept any string and refuse none. A `?verdict` no
label carries and a `?category` the domain never declared are each
`200` with an empty `data`, not a `404` and not a `422`. Either could
be a value that was legitimate when the rows were written: a domain
is free to retire a verdict from its ladder, and the rows stored
under the retired one still answer to it. A refusal would make this
answer depend on the settings and the taxonomy in force at the moment
of the request rather than on the rows.

`?verdict` matches the LATEST ruling and not any. A finding judged
one way and then re-judged another is in the page for the second
verdict and out of the page for the first, because the first is no
longer in force. A finding nobody has judged matches no verdict at
all, which follows rather than being decided — there is no latest row
to read one off — so this parameter cannot ask for the findings
nobody has ruled on, and no spelling of it here can.

The count is taken through the SAME filter as the page, so
`meta.total` describes the collection the page came out of. A total
counted without the narrowings would tell a caller filtering by one
verdict how many findings the domain holds altogether, and every page
of that filter would then be read against a number about something
else.

### The order is `compareFindings`, and it is checked from two sides

`?sort=score` is score descending with an absent score sorted LAST
rather than lowest, then `created_at` descending, then `id`
descending. `?sort=recency` is that same order with the score key
dropped. Both are `compareFindings` in `src/lib/digest-assemble.ts`,
which the digest selection and every renderer already agree on — the
keys and what they mean are stated once under `A sort is a declared
key` above and are not re-argued here.

What this group adds is that the SQL and the library are held against
each other rather than trusted to match.
`src/findings/service.test.ts` reads a page out of the store and
compares it against `orderFindings` over the same rows, so one order
is checked from two sides rather than two orders being free to
disagree. The recency expectation is derived by neutralising the
score in the input to the SAME library rather than by writing a
second comparator in the test: a comparator written out beside the
one it copies is a third authority, and it goes stale silently.

The store spells `DESC NULLS LAST` on every descending key, which is
not decoration. `findings_domain_id_score_created_at_idx` is declared
that way, a Postgres pathkey carries its nulls ordering, and the
planner matches it literally — so a store writing a bare `DESC`
cannot use the index even on a `NOT NULL` column, and nothing in the
answer would say the read had degraded to a sort.

### A category is a member of `fields`, and no column links the two

No foreign key joins a finding to a category. `?category` reads the
member of the `fields` payload that `FINDING_CATEGORY_FIELD` names —
the string `category` — and matches it against nothing else. It is a
jsonb read rather than a join, and it is the same member `ar-digest`
files a finding under when it lays a section out. The two agreeing is
what makes the API's filing and the digest's one act rather than two.

The one place they could part is worth naming rather than leaving to
be met. The digest matches the member as its own sanitiser REDUCED
it, while this filter reads the column. For any key an operator
actually declared the two are the same string, a reduction leaving an
ordinary key as it stands. A stored value the sanitiser would edit is
a finding filed under a key no domain declares, which both surfaces
already answer the same way: the digest's undeclared section, and an
empty page here.

### The single get embeds three collections and pages none of them

`GET /findings/:id` answers `finding`, `sightings`, `labels` and
`research` — four members rather than a flattened row, because the
three lists are about different tables and a reader has to be able to
tell an empty one from a finding that has none. All three can be
empty at once, and each empty one is an ordinary state: a finding
nobody has judged, one no feed has cited again, and one attributed to
no entity.

`research` is resolved through the finding's own `entity_id` inside
the port, so nothing on this route reads that member, branches on its
nullability or addresses a second surface. An unattributed finding
answers an empty list. Those rows are `ar-research`'s to write and no
method behind this route touches them, which is
`A workflow is not reachable from here` above applied to the one read
on this surface that embeds a table somebody else fills.

None of the three takes a window. They are embedded in one finding's
answer rather than paged, so there is no `?page` for a caller to send
and no total for one to be read against — which is a decision rather
than an omission, and the place a cap would go if one is ever wanted
is beside a count in `src/findings/service.ts` rather than as a
silent limit inside an implementation.

`labels` arrives NEWEST FIRST and carries the whole sequence rather
than the head of it. The first row is the verdict in force, and the
ruling a later one replaced is still a true statement about the
moment it was made under the ladder in force then —
`A ruling is appended` above is where that is argued.

### The ladder is the owning domain's, and no segment names it

`PATCH /findings/:id/verdict` addresses a FINDING, so the domain
whose ladder judges the ruling is `findings.domain_id` on the row
that id resolved to. A caller neither names it nor can get it wrong:
there is no spelling of this request that would judge one domain's
finding against another's vocabulary, and `DomainStore` carries a
by-id read for this lookup and for no other on the surface.

`The accepted set is read per request` above is where that set being
a per-domain setting is argued, and it is argued about the column. On
this route it shows as an ORDER, and none of the three reads in it
can be issued together, each answer being the next question's
argument. The body is parsed first, so a malformed ruling is a `422`
whether or not the finding exists and costs no read at all; the
finding is resolved next; the domain is read off the row it answered;
and only then does the ladder decide whether the append happens.

The body is `{ verdict, note? }` and strict. `verdict` carries no
value rule in the schema at all — not an enum, not a length — and
that absence is the subject rather than an omission: the accepted set
is not knowable until a row has been read, so a rule here would
either name some other domain's ladder or refuse one particular
non-member under a different code from every other. `note` is
optional and its absence is a NULL, there being no writer but a
person on this route.

A domain that has gone by the time the second read runs is the same
`404` as a finding that is not there, and that is a statement about
the schema rather than a convenience. `findings.domain_id` is NOT
NULL and cascades, so a domain that went between the two reads took
this finding with it: by the time the caller reads the answer, no
finding carries the id, which is exactly what the refusal says.

### The refusal names the ladder, and never the ruling refused

A verdict outside the vocabulary is a `422` whose one detail names
`verdict` and carries the accepted set. `The refusal names the
accepted set` above argues why that direction is the safe one. What
this route adds is that the refusal is the SERVICE's rather than a
schema's, and that the two `422`s a caller can get here are
distinguishable.

The code is `verdict_outside_vocabulary`, declared in
`src/findings/verdict-service.ts` rather than mapped from a schema
issue. No schema raised it because none could: the accepted set is a
row this request had to be resolved before it could be read. So a
client branching on the code learns that its ruling was refused by
the DOMAIN, where the other `422` on this route — a malformed body,
an undeclared key, a segment that is not an id — says the REQUEST was
the wrong shape. That is the one distinction between them, and it is
the one a caller acts on differently: the first is fixed by sending a
verdict the ladder holds, the second by sending a different request.

The set is rendered with `JSON.stringify` rather than joined, which
is not formatting. It quotes each member, so a verdict carrying a
comma or a space is still readable as one member; and it escapes
every control character it meets, so a ladder an operator stored with
a raw NUL or a lone surrogate in it reaches the wire and the log line
as an escape. `Two surfaces cut at one cap` above reaches the same
discipline through a mask, and one detail built from a constant and
an array does not need the second pass.

One thing the containment claim does not cover is worth meeting here
rather than discovering. A submitted string that happens to be a
SUBSTRING of a declared verdict comes back inside that member.
Nothing copied it — the sentence is a constant of the module's own
with the stored ladder appended — so it is a coincidence of what the
domain declared rather than an echo, and the case that counts
occurrences uses a sentinel no vocabulary here contains a piece of,
so its zero is a reading of the refusal rather than of the fixture.

### A second ruling is a `200`, because the table appends

`A ruling is appended` above argues the column: `finding_labels`
carries no unique key, so the sequence is the record. What that means
at this route is that there is nothing here to conflict with. A
second ruling on one finding — the SAME verdict included — is a `200`
and a second row, never a `409` and never a silent no-op, which is
why the `409` is unavailable across all three routes of this group
and not only across the two reads.

What comes back is the row the append STORED, read back rather than
rebuilt from the body. Its `id` and its `labelled_at` are the two
members no request carried, which is what makes the answer a reading
of the write: a body assembled from the parsed input would agree with
this one on every member a caller submitted, and those two are where
the difference is.

The route answers one row and never the list. What it did is one act,
and what the finding now stands at is a question about the finding —
`GET /findings/:id` is where the sequence is read, newest first and
whole.

## Documents

### A corpus is met in its domain, and there is no second address

| Method and path | Answers |
| --- | --- |
| `GET /domains/:slug/documents` | `200` with one page of the domain's corpus, `captured_at` descending with `id` descending breaking a tie, plus `meta`. `404` for an unknown slug, `422` for a segment that is not a slug, for a `?parseStatus` outside `DOCUMENT_PARSE_STATUSES`, and for the pagination faults every list route answers — an undeclared parameter among them, naming `query` rather than the parameter. Never `409`. |

`buildDocumentsRouter` in `src/documents/routes.ts` declares that one
route and decides nothing in it: the handler reads the address, takes
the query apart into a filter and a window, calls `listDocuments` in
`src/documents/service.ts`, and chooses a status.

The collection hangs off `/domains/:slug` because a corpus is what a
domain's polls brought in, and a caller holding a slug should not have
to look an id up to read one. Nothing here addresses a single
document: there is no `GET /documents/:id`, so the `/documents` prefix
`The five prefixes wave 3 adds` above tabulates is claimed against the
framework and the earlier waves rather than taken. What the claim buys
is that the name stays free for the route that would want it, which is
`A domain is addressed by slug` above applied to a table this wave
does not address by id.

The window is the ordinary one and departs from nothing above: `?page`
and `?perPage` through `paginationQuerySchema`, defaulting to 50,
refused above 200, and a page past the end answering an empty list. A
domain that has captured nothing answers an empty list too, with a
`200` — which is what tells it apart from a slug no domain carries,
and what the lookup in front of both document reads exists for.

### One route, one verb, and no writer on the store behind it

This router registers `get` and no other verb, and the store it holds
is the `Pick` pair `src/documents/service.ts` declares: one domain
read, and the two methods `DocumentStore` has, both of them reads.
There is no third method on that port left out of the narrowing — the
port declares two — so read-only here is the whole port rather than a
slice of one that keeps more.

`Read-first` above states that law once for the wave and names the
small edit it exists to stop. This is the group where that edit reads
most like an improvement: a page showing a document whose parse failed
is one line from offering to re-run it. What stops it is that there
would be nothing on the store to call. Re-parsing is a pipeline
operation with a cost and a dedupe question attached, and only the
writer that saw a parse fail can record that it did — nothing reading
a stored row later can work that out.

`The queue under this prefix is read-only` above took the same shape
one prefix over a wave earlier. Two routers now read `documents` and
neither can write a row of it, which is the arrangement rather than a
coincidence: `src/documents/store.ts` and `SourceStore` are two ports
over one table, split by what each collection is for.

### A failed document is in the default page, not behind a flag

An absent `?parseStatus` is BOTH members of the set rather than
neither, so the ordinary request over this collection answers a mixed
page. There is no spelling here that widens, because nothing has been
narrowed to widen back.

That follows the column rather than this surface. A payload its
contract rejects is STORED with its `parse_error` rather than dropped,
the source's failure counter is bumped, and a run of rejections trips
`sources.flagged` — fail-flag-keep, the rule
`src/db/schema/documents.ts` records at `parse_status`. The row is the
keep and the column is the flag, and a page that hid the flagged half
would be answering about a corpus the pipeline does not have.

The debug reading is what the default is for. An operator reaching for
this collection is asking what the last poll brought in, and the rows
worth seeing first are the ones every other reader has already put
aside: what scores is what parsed, what a digest carries is what
scored, and a default here that agreed with them would hide the
disagreement precisely where somebody is looking for it. A flag would
make finding those rows an extra request that has to be known about,
which is the same thing as hiding them.

Because the page carries both members, every row answers its own
`parseStatus` as stored. A reader shown a mixed page is owed the
column that says which of the two a row is, and it is answered on
every row rather than only on a narrowed one.

### `?parseStatus` is refused at the boundary, not paged empty

A `?parseStatus` outside `DOCUMENT_PARSE_STATUSES` is a `422` naming
the parameter, raised before the domain is resolved and before any
document is read. It is not passed through to a page that would come
back empty.

That is the opposite of what `Connectors` above does with its `?kind`,
and the two are worth reading together, because what separates them is
what a value can MEAN rather than a preference about strictness. A
connector kind is an open registry a deployment extends, so a kind no
row carries is a question about the rows and an empty page answers it
honestly. A parse status is a two-member CHECK constraint, so a third
value is not a status the corpus happens to lack — it is a value the
column cannot hold, and an empty page would answer it as though the
corpus simply held none.

Inside the tuple the rule flips back. `?parseStatus=failed` over a
domain whose captures all parsed is a `200` with an empty `data`, on
the terms `A page past the end is an empty list` above sets: a member
of the set that no row carries is a fact about the rows, and a domain
whose feeds are all healthy is not a failure to read.

What reaches the port is a value object rebuilt member by member
rather than the parsed query forwarded whole, so `?page` never crosses
a boundary that has no use for it, and a parameter added to the wire
reaches the store only when somebody adds it there too.

### The body is masked and cut, and this router chooses neither

Every row's `body` is answered cut to `BODY_CODE_POINT_CAP` code
points and then masked, its `parseError` is answered masked and uncut,
and `bodyBytes` and `bodyTruncated` travel beside them. The `url` is
answered as stored, which is the narrower promise of the three and is
recorded here rather than left to be discovered.

Three sections above carry the arguments and this is the sentence that
says which layer holds them. `Two surfaces cut at one cap` above is
why the number is one binding rather than two; `The second reader is
held to the masking` above is why this page masks what parsed as well
as what failed; `bodyBytes` above is why the length answered is the
STORED one and why the cut is by code point rather than by UTF-16
unit.

What belongs to this group is the ORDER of the two passes and the one
member left out of them. The cut runs on the stored text and the
masking on what the cut answered: masking first would let a single
control byte spend six of the cap's budget, and would let the cut land
in the middle of an escape the masking had just written. `parseError`
is masked and never cut, because it is a sentence a writer in this
system composed rather than a payload somebody else sent, and cutting
one would take the end of the sentence that names the fault — where
cutting a body takes the end of somebody else's document, which is
what the cap is for.

Neither pass is in the router. `src/documents/service.ts` runs both
before any row reaches a handler, so nothing on this route trims a
string it was given or escapes a byte it was handed, and a handler
that did either would be a second rule nobody would notice drifting
from the first. `The failures queue` above says the same of the review
surface, which is the other reader of the same two passes over the
same table.

## Entities

### A subject is addressed by its own id, and by nothing else

| Method and path | Answers |
| --- | --- |
| `GET /entities/:id` | `200` with the stored row: its `domainId`, its `name`, the `nameNorm` computed from that name, its `aliasOf` and its `attributes`. `404` for an unknown id, `422` for a segment that is not one. Reads no query at all. |
| `PATCH /entities/:id` | `200` with the stored row afterwards, read off the write. `404` for an unknown id, `409` for a rename onto a key another subject in the domain already holds, `422` for a segment that is not an id, for a body outside `{ name?, attributes?, aliasOf? }`, for an undeclared key in it, for a name that identifies nothing, and for each of the three refused aliases. |
| `GET /entities/:id/research` | `200` with one page of what has been found out about the subject, `researched_at` descending with `id` descending breaking a tie, plus `meta`. `404` for an unknown id, `422` for a segment that is not one and for the pagination faults every list route answers. |
| `POST /entities/:id/approve-research` | `200` with the four-member ruling. `404` for an unknown id and for a `poolId` this subject does not hold, `422` for a segment that is not an id, for a body that is not `{ poolId }`, and for an undeclared key in it. |

`buildEntitiesRouter` in `src/entities/routes.ts` declares all four
and decides none of them: each handler narrows the segment, takes
the query apart or hands on the body it was given, calls the
matching function in `src/entities/service.ts`, and chooses a
status.

Every path here opens on the row's own id and none opens on
`/domains/:slug`, which is where this group departs from the two the
same wave landed before it. A finding and a document are met in
their domain because a caller holding a slug should not have to look
an id up to read one. A subject is met by its id because the row
carries its own `domain_id`, and that column is what the
cross-domain alias rule below is decided against — so a slug in the
path would be a second answer to a question the row has already
settled, and this surface would then owe a reading of what a
disagreement between the two means. That is `A domain is addressed
by slug` above rather than an exception to it.

There is no `GET /domains/:slug/entities` on this wave at all, so a
registry is read one subject at a time and the collection under a
domain is a path this wave leaves free. The research collection
hangs off the subject instead, for the reason the addressing gives:
a pass is about one entity, `entity_research` carries that entity's
id and nothing else that addresses it, and a caller reading passes
already holds the subject they were read about.

`409` is available to this group and to no other in the wave. The
findings and documents groups have no conflicting state to refuse; a
rename here can collide with `entities_domain_id_name_norm_unique`,
which the section below argues. Every other refusal available here
is the `404` about an address and the `422` about a request.

Neither read takes a filter, so this group has no narrowing to
argue. `GET /entities/:id/research` reads `?page` and `?perPage` and
no other parameter, `meta.total` is the whole collection rather than
a narrowed part of it, and a subject nobody has researched answers
an empty page on the terms `A page past the end is an empty list`
above sets.

### `name_norm` is recomputed on a rename and never accepted

A `name` patch is reduced through `normalizeEntityName` in
`src/lib/entity-name-norm.ts` and the two halves are written
together, so a request that moved the display spelling without the
key it reduces to is not one this surface can express. A body naming
`nameNorm` is refused as an undeclared key rather than having the
member quietly dropped. The detail names `body` and never the key,
which `An unrecognized_keys detail names the container` above
argues, and a dropped member would be indistinguishable on the wire
from the surface having honoured it.

That closes a silent miss the column's own comment asks for and had
no answer to. `entities.name_norm` is the key half of the natural
key `entities_domain_id_name_norm_unique` is declared over, and
nothing in this repository wrote an `entities` row before this wave
— no workflow inserts one, and `scripts/approve.ts` reads the
registry through joins alone — so the reduction had no definition
anywhere at all. A caller allowed to supply one would key a row on
something no spelling of its name reduces to: every later lookup
would find nothing, the next sighting would insert a rival row, and
no constraint in the database would report it, a writer that reduces
differently never failing but only missing.

A name that carries nothing identifying is a `422` naming `name`
under a code of the service's own, because no schema could raise it:
whether a name identifies a subject is the reduction's answer rather
than a shape rule, and asking it twice is exactly the second
definition this group exists to avoid. It is a `422` rather than the
`500` the library's own plain `Error` would otherwise become —
`src/lib/entity-name-norm.ts` throws one deliberately, being spliced
into workflow nodes where there is no status to raise, and this
surface is the boundary that has one.

A rename onto a key another subject in the same domain already holds
is a `409` carrying no `details` at all. Which subject holds the key
is a fact about a row the caller did not ask about and, the display
spelling being free to differ from it, may never have seen — naming
it would let a caller enumerate a registry by proposing names, which
is `A validation detail names a field path` above applied to a
refusal that has no field to name.

Neither the collision nor the alias foreign key is checked before
the write. A read-then-write pair would answer about a row that had
gone in between and would miss one that arrived, where the
constraint is the deployment's own authority at the instant of the
write. So the two rules the database holds are TRANSLATED here and
the two it cannot hold are held here, which is the split the next
section is about.

The patch answers the stored row rather than the request, and the
recomputed key is why that matters on this route above the others:
reading it back is the only way a client learns what its name
reduced to. A body of `{}` is a legal call answering that row
unchanged, `entities` carrying no `updated_at` for a write to stamp.

### Two alias rules this surface holds that the database does not

`entities.alias_of` is a nullable self-referencing foreign key, and
the database will store two things through it that nobody meant. A
row pointing at ITSELF makes a subject its own subject, which every
reader following the pointer either loops on or silently stops at. A
row pointing at a subject in ANOTHER domain joins two registries
whose criteria, findings and research were accumulated apart, and no
foreign key anywhere would follow the join back out. The column's
own comment says both are storable; nothing in the DDL refuses
either.

Each is a `422` naming `aliasOf` under a code of the service's own —
`self_alias` and `cross_domain_alias`. They have to be the service's
codes because no schema raised them: the first is a comparison
between the path and the body, and the second is a comparison
between two stored rows, which is two reads rather than a shape
rule. The detail carries the rule and never the two domains, both of
which are facts about rows the caller did not ask about and, in the
case of the subject's own, did not even name.

The self rule is decided before any read, the two ids both being in
hand. The one-registry rule costs the read that resolves the target,
and an alias naming a target that is NOT there falls through to the
write rather than being refused here: there is no domain to compare
against, and the foreign key is the authority at the instant of the
write, per the section above. It reaches the caller as the same
`422` naming the same member under a third code, so the three read
alike from the outside and only one of them cost a round trip.

`aliasOf` distinguishes three requests, which is why the member is
both nullable and optional. Absent leaves the pointer where it is, a
number aims the row at a subject, and `null` clears it back to a row
that is its own subject — the only way back, and unexpressible if
absent and null meant the same thing.

The `409` one section above and these three `422`s are the whole of
what a patch can be refused for beyond its shape, and the difference
between the two statuses is which layer knows. A duplicate key is a
conflict with a row that exists; an alias into another registry is a
request that was never coherent, whichever rows happen to be
stored.

### The intention is named in the body and its subject in the path

`POST /entities/:id/approve-research` takes `{ poolId }` and nothing
else, and the pairing is argued for both gates under
`An approval names its own row` above. What this route adds is which
refusals the pairing produces here, and why a caller reads one
sentence for three of them.

`EntityStore.findPoolRowById` is UNSCOPED on purpose: the row is
read and then judged rather than selected under the subject. A
lookup narrowed to the subject would answer null for `no such row`
and for `not this subject's row` alike, and the gate has to tell
those apart even though what a caller reads is the same either way.
Telling a caller which of the two happened would say that a row it
does not own exists, which is the whole reason the sentence is
shared.

`research_pool.entity_id` is NULLABLE, an intention being raisable
from a finding nothing has attributed to a subject yet, so a row
naming NO subject at all is refused by that same comparison rather
than by a clause of its own. That is the third refusal under the one
sentence; the write's own null, the row having gone between the read
and the ruling, is a fourth path to it that no ordinary sequence of
calls produces.

The subject is resolved before the intention is read, so an id
nothing carries costs one lookup and never reaches the queue. It is
also what makes the comparison decidable at all: it is the ADDRESSED
entity the stored row has to name, and there is nothing else in the
request that says which registry either id belongs to.

There is no spelling here for approving a subject's queue wholesale.
An operator ruling on an intention has read the search terms that
intention carries, and a request naming a subject rather than a row
would be approving terms nobody was shown.

This wave serves no page over `research_pool`, which is the one
asymmetry between the two gates worth stating rather than leaving to
be counted. `GET /sources/:id/pending-configs` pages the proposal
queue; the entity queue is read from `listPending` in
`scripts/approve.ts` and from nowhere on this surface, so a `poolId`
submitted here was learned from the CLI. `EntityStore` declares the
two reads that would serve such a page and no route on this wave
calls either, which is the port recording the gap rather than
closing it.

### The ruling is the whole of the write, and research is elsewhere

`The API ratifies` above states the split once for both gates. What
this route does under it is `approvePoolRow` and nothing else: two
columns of one `research_pool` row, `approved_at` stamped
`coalesce(approved_at, now())` and `status` moved to the approved
member. No research is recorded, no search is issued, and nothing
downstream is told — `ar-research` picks the row up on a later pass
and writes what it found out.

The split is a property of the port rather than of the handler's
restraint. `EntityStore` declares no method that writes
`entity_research` at all, so a route recording a summary beside the
approval could not be added here by a small edit: there would be
nothing on the store to call. `Read-first` above states that law for
the whole wave and names the two writers this group is entitled to,
and `tests/invariants/api-read-first.test.ts` derives it from `keyof`
over the port types rather than from any paragraph.

A second ruling on one row is a `200` and not a `409`, because the
`coalesce` answers the FIRST ruling's instant and a row already
closed ratifies without complaint. That is `An approval is
idempotent` above plus the one axis on which the two gates differ:
ratifying twice is a no-op where applying twice is refused, and
`RULING_ACTS` in `src/approvals/ruling.ts` is where that difference
is declared once rather than as an `if` in either gate.

What comes back is the four-member ruling — the row's id, where it
stands, when a person agreed, and when the intention was closed —
taken off the row the write answered rather than rebuilt around the
`poolId` that was sent. `approvedAt` and `id` are the members no
request carried, which is what makes the response a reading of the
write. `closedAt` reads `research_pool.researched_at`, so a
ratification answers `null` there by construction: the gate records
that somebody agreed, and what closes the intention is the pass this
surface never runs.

## Runs and spend

### Two routers under two prefixes, and one directory behind both

| Method and path | Answers |
| --- | --- |
| `GET /runs` | `200` with one page of the passes the service has made, `startedAt` descending with `id` descending breaking a tie, plus `meta`. `404` when a `?domain` was sent and no domain carries it, `422` for a `?domain` that could not be a slug and for the pagination faults every list route answers. |
| `GET /runs/:id` | `200` with the pass, the newest `RUN_LEDGER_CAP` rows of its ledger, the full `llmCallCount` and a `ledgerTruncated` flag. `404` for an unknown id, `422` for a segment that is not one. Reads no query at all. |
| `GET /spend/summary` | `200` with the resolved `window` and one bucket per domain per UTC day inside it. `404` when a `?domain` was sent and no domain carries it, `422` for a `?domain` that could not be a slug, for an unparseable or inverted window, for a span above the maximum, and for any undeclared parameter, `?page` included. |

`buildRunsRouter` in `src/runs/routes.ts` declares the first two and
`buildSpendRouter` in `src/runs/spend-routes.ts` declares the third,
and neither decides anything: each handler takes a query apart or
narrows a segment, calls the matching function in
`src/runs/service.ts` or `src/runs/spend-service.ts`, and chooses a
status.

Two routers rather than one, in one directory rather than two.
`The five prefixes wave 3 adds` above carries the arithmetic; what
the split buys HERE is that the store each router is handed has no
member for the other's read. The page and the single get reach five
`RunStore` methods, the summary reaches the sixth, and no method is
named by both — so the ledger cannot be paged through the summary's
store or bucketed through the page's, by accident or by a later
edit.

Neither prefix is domain-scoped, which is where this group departs
from every list the wave landed before it. A finding and a document
are met in their domain because a caller holding a slug should not
have to look an id up; a pass belongs to a domain or to NONE, so the
collection is the deployment's and the domain narrows it. `/runs/:id`
addresses the row by its own id under `A domain is addressed by slug`
above, and `/spend/summary` addresses nothing at all, in the shape
`/settings` already takes.

`409` is available to none of the three, and neither is `204`.
Nothing on these routes writes, and nothing on them decides on
stored state beyond whether the domain and the run are there, so the
only refusals they can answer are the `404` about an address or a
narrowing and the `422` about a request. `Read-first` above states
the law for the wave, and `RunStore` declares six methods of which
all six are reads — so the claim is the port's shape rather than
these routers' restraint.

### The domain is a filter here, and there is no domain-less spelling

`?domain=<slug>` is optional on both the page and the summary. Absent
answers EVERY run and every call, the ones belonging to no domain
included; present answers that domain's alone. There is no third
request, and that absence is this wave's decision on the record
rather than an omission for a later reader to find.

`runs.domain_id` is nullable because a maintenance or cross-domain
tick belongs to nobody, so the rows such a spelling would name do
exist. What makes asking for them inexpressible is the TYPE of the
narrowing: `RunFilter.domainId` is an optional `number` and never a
`number | null`, so there is no value a caller could send that would
mean the rows belonging to no domain — and both query schemas are
`.strict()`, so a parameter invented to carry one is a `422` naming
`query` rather than a filter silently ignored. A widened member would
have shipped a third query nobody scoped.

Reading the unattributed rows alone is therefore a subtraction the
caller does: the unnarrowed answer less each domain's. That is what
the summary's null bucket is for, and it is why the per-domain
summaries do NOT sum to the unnarrowed one — the difference is the
unattributed spend rather than a rounding of it.

The narrowing splits its refusal in two, and the split is the
`slugParamSchema` the parameter is held to. A value that could not be
a slug is a `422` naming `domain`, raised before any store call; a
well-shaped one no domain carries is a `404` raised after one. A
request that never named a well-formed slug has not established that
no domain carries it, which is `A validation detail names a field
path` above applied to a narrowing rather than to a body.

That `404` is not the one a `/domains/:slug` route answers, and the
difference is worth stating: `/runs` exists for every deployment,
including one that runs no domains at all, so what is missing is the
narrowing rather than the collection. A domain that has run nothing
answers `200` with an empty `data` under `A page past the end is an
empty list` above.

### The filter is built one file in, which inverts every other list

Every other narrowing on this surface is rebuilt in the handler that
read it. A `?kind`, a `?verdict` or a `?parseStatus` becomes the
port's own value object there, because what a caller ASKED FOR and
what a port NARROWS ON are different statements, and a parsed query
forwarded whole would put `?page` on the far side of a boundary with
no use for it.

`?domain` cannot follow that rule. `RunFilter.domainId` is an ID, and
the only thing that turns a slug into one is `findDomainBySlug` — a
store call, which a handler has nowhere to make. So both handlers
hand the slug on as the string it arrived as and the service builds
the filter. The value object is still built once and in one place;
that place is one file further in than it is anywhere else, and both
routers say so where a reader looks.

### The ledger is embedded, cut at one constant, and the cut is reported

`GET /runs/:id` answers at most `RUN_LEDGER_CAP` calls — 200 of them
— `calledAt` descending with `id` descending breaking a tie. The cap
is a module constant in `src/runs/service.ts` rather than a query
parameter, so no caller can ask for the whole of a long pass's ledger
and no route can be talked into serving one: every model call the
service makes lands in `llm_calls`, nothing prunes the table, and a
pass that looped or ran for a day is exactly the row whose embedded
ledger would otherwise be fetched whole.

The list is CUT rather than paged, which is why two members travel
beside it. `llmCallCount` is the FULL count and `ledgerTruncated`
says whether the cap took anything, so a ledger of exactly 200 rows
and the head of a longer one are distinguishable — which they would
not be from the list alone. A client cannot compare a length against
a cap it was never told, which is what `bodyBytes` above records one
collection over, on the same reasoning.

Newest-first is what makes this cut the useful one: what a long
pass's ledger loses is its OLDEST end, and a reader opening a run is
asking what it has been doing lately. There is no `?page` over the
embedded list, no total for a window to be read against and no `meta`
inside the answer — the ledger is part of one run's reading rather
than a collection this surface addresses.

A pass that called nothing answers `200` with an empty `ledger`,
`llmCallCount` at zero and `ledgerTruncated` false. A tick that found
no work to do ledgers nothing at all, which is an ordinary state
rather than a failure to read.

### The window defaults to 30 days and is refused above 92

`GET /spend/summary` reads `?since` and `?until` in the vocabulary
`One window vocabulary` above declares — ISO-8601, half-open,
`sinceInclusive` and `untilExclusive` — and closes whatever the caller
left open. Three spellings arrive and all three leave with two
bounds: neither sent is the last `SPEND_DEFAULT_WINDOW_DAYS` days, an
`until` alone closes below it by the same span, and a `since` alone
closes at the clock. So an unbounded scan of `llm_calls` is
unreachable from the wire.

A resolved span wider than `SPEND_MAX_WINDOW_DAYS` — a quarter — is a
`422` naming `since` under a code of the service's own, carrying the
MAXIMUM rather than the span submitted, and raised before any store
is asked anything. It is refused and not clamped, on the terms a
`perPage` above the cap is refused by: clamping would answer a
narrower window than the request named with no member of the answer
saying so. A year is still askable, in four requests, the half-open
bounds being what makes four adjacent quarters partition it rather
than overlap on the seams.

The ceiling exists because this is the one read on the surface with
no page at all. Every other collection is bounded by `?perPage`; a
summary is bounded by the SPAN it aggregates over, one bucket per
domain per day, so the size of the body is a function of that number
and of how many domains the deployment runs. `?page` and `?perPage`
are undeclared here and, on a `.strict()` shape, a `422` naming
`query` rather than parameters quietly ignored.

The resolved window TRAVELS BACK, as `window` in the
`sinceInclusive`/`untilExclusive` spelling. A request that sent no
bounds is answered over a span the service chose, and a bare list of
buckets would leave a reader inferring which one from the days that
happen to carry calls — which says nothing at all about a window in
which nothing was called. `window` is what stands in for `meta` here:
the answer says which span it covers rather than which slice of a
collection.

A `?since` in the future with no `?until` is an empty summary and not
a refusal. The clock closes such a window below its own lower bound,
and under half-open semantics nothing can fall inside it, so an empty
`buckets` is the truthful answer to a request for the calls made
since an instant that has not arrived. It is not refused because the
rule would depend on the clock rather than on the request, and the
schema's ordering check is what makes it unreachable whenever both
bounds were sent.

### A count and two magnitudes, and no member of either is a total

Each bucket is `{ domainId, day, calls, promptChars, estTokens }`.
`The spend ledger` above argues why none of the three numbers is
currency — there is no price, rate, amount or currency column on
`llm_calls` for one to be answered from. What this route adds is that
it composes no total either: no sum across buckets, no rate applied
on the way out and no member a handler multiplied, so a consumer
adding them up is doing arithmetic over a count and two magnitudes it
can see.

The authority on the second magnitude is the column's own comment,
and it states it plainly: a total over this column does not reconcile
with a bill. The `est_` is load-bearing — the value is arithmetic
over `prompt_chars` rather than a count a provider reported, so the
two are one reading expressed twice, and nothing stored says which
estimator produced it. What the number IS good for is comparison, one
run against another and one week against the week before, which is
what the summary is read for.

`promptChars` and `estTokens` are each nullable in a bucket as they
are in a row, and a NULL means nothing measured that call rather than
a call that sent nothing — zero being a real reading here. So a
bucket may carry a non-zero `calls` beside a null magnitude, and the
two disagreeing is information rather than a fault.

A bucket exists because calls landed in it. There is no row for a day
nothing was called on and none for a domain that made no calls, so a
consumer filling a chart supplies its own zeroes for the gaps. An
empty `buckets` is an ordinary answer, and three requests reach it: a
window in which nothing was called, a domain that called nothing, and
a deployment that has called nothing at all.

### The day arrives as the instant a UTC day opens

`The bucket is UTC` above argues the grouping. What a client reads is
its consequence: `day` is a `Date` across the service and reaches the
wire through `Date#toJSON`, so it arrives as `...T00:00:00.000Z` —
the instant that opens the day at UTC, with the calendar written into
the value rather than left to whoever reads it. Two deployments of
one build, reading one ledger, answer the same string.

The order is `day` descending then `domainId` ascending, with the
null bucket last. Nothing on this router re-buckets, re-orders or
truncates anything: a handler doing any of the three would be a
second calendar for the one question where a default is a silent
per-deployment difference in every number a widget shows.

The null bucket is how the calls belonging to no domain are answered
rather than dropped. Both `runs.domain_id` and `llm_calls.run_id` are
nullable, so a call can reach no domain by two routes and both land
there — which is what makes the buckets' `calls` add up to the number
of calls the window holds.
