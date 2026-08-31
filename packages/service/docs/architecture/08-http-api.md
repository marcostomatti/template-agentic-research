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

Each half was written before any of its routes existed, which is
the point. Every rule below is one that each resource group would
otherwise settle separately, and a surface whose 422 body depends on
which router answered is not one contract but four. The routes land
against this document; where one of them departs from it, the
departure is argued here in the same commit rather than left for a
reader to find in a response.

It is the document the HTTP API row of the behaviour table in
`docs/architecture/00-overview.md` names, so a change to an
envelope, to the pagination contract, to the guard or to a declared
path lands here with the code. The designs it implements are
`.specs/q08-api-wave-1.md` and `.specs/q11-api-wave-2.md`, waves 1
and 2 of three carved out of `.specs/2026-08-19-backend-api.md`.

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

### Every PAGINATED list takes `?page` and `?perPage`, and nothing else

`page` is 1-based. Neither `limit`/`offset`, nor `pageSize`, nor
`per_page` is accepted anywhere. The store ports take `limit` and
`offset` because that is what SQL takes, and the translation
happens once, in `src/http/schemas.ts`.

No router declares a pagination vocabulary of its own. Three do
declare a query schema for something else, and none of the three
is a second spelling of a window: the confirmation on
`DELETE /domains/:slug`, the empty one that refuses every parameter
on `GET /domains/:slug/categories`, and the `?format` on
`GET /categories/:id/terms`. Only the last competes with this
schema on the same route, and it competes by REPLACING it — a
request naming `?format` is judged against that schema instead,
which is what makes `?format=seed&page=2` a refusal rather than a
window silently dropped.

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
route on the surface reads through the schema named above and
through nothing else.

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
that has something in it: a table of every wave-1 route, asserted
`401` with no credential and not-`401` with one, against a service
built WITH an auth block.

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

Three payload areas are open records whose KEYS are operator-chosen
rather than declared: `settings.scoringWeights.<key>` and
`settings.fieldContract.<key>` on a domain, and
`notificationChannels.<key>` in operator settings. A key there is
submitted content in exactly the sense above.

Any path segment below such a prefix is reported as `*` —
`settings.scoringWeights.*`, never the key itself. The caller
learns which unit of the payload failed and how it failed, and
learns nothing it had not already sent.

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
that says so. The same note is repeated beside the approval gate
itself in `docs/architecture/04-sources.md` when the sources group
lands, so a reader who reaches the gate from the pipeline side is not
left to conclude that the API forgot it.

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
schema every other list route on the surface reads through, and
answers `meta` beside its rows. A domain carries three personas today,
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

This narrows a sentence next door.
`docs/architecture/06-scheduling.md` counts two of the four modes
through the bounds, on the reading that an extraordinary run and a
pause each write a timestamp directly. The timestamp half stays right:
what `pauseFrom` clamps is the CYCLE LENGTH it multiplies, not the
instant it stores. But that makes three of the four modes pass through
the bounds rather than two, and that section is corrected in the
commit that lands the verb rather than left to disagree with this one.

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

One declaration sits behind both the masking and the refusal below.
Two rosters, or two literals, would drift apart on the first key added
to either, and the direction they drift in is a stored key answered in
the clear.

### The mask literal is refused as a submitted value

A `config` carrying `MASKED_SECRET` as a value is a `422` naming the
path it sat at, and never a write.

The round trip this closes is the ordinary one. A caller reads a
connector, edits one member of the masked config, and sends the whole
object back. Without the refusal, the literal `MASKED_SECRET` is what
gets stored as that deployment's API key, the connector stops working,
and nothing in the response says why — the read afterwards shows the
mask, which is what it showed before.

The detail names the path and carries no value, which is the no-echo
rule in `src/http/validation.ts` applied unchanged. The path is enough
on its own: a caller that submitted the mask knows which member it
copied.

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

`src/topics/routes.ts` declares all four and decides none of them:
each handler reads the address, derives the window, calls the matching
function in `src/topics/service.ts` and chooses a status.

The collection hangs off `/domains/:slug` because a topic is a
question asked ABOUT the subject a domain names, and a caller holding
a slug should not have to look an id up to read it. The two writes
address `/topics/:id` instead, for the reason a persona is written by
id: the row carries its own `domain_id`, the one rule that spans a
domain — a name unique within it — is the database's, and repeating
the slug would let a request name a domain the row does not belong to.

### Two more routes are this group's, and they are documented above

`POST /topics/:id/run-now` and `POST /topics/:id/pause` belong to the
same router and are not in the table above, because what they do is
not what the four operations do: they write one column, they write no
other, and the rules they answer to are stated once for both
schedulable groups under `Schedule verbs`. Their rows join this table
in the commit that lands them.

`TopicServiceStore` now names `updateTopicSchedule`, because
`src/topics/service.ts` holds the two verbs and one type stands for
all six functions rather than a second `Pick` being kept in step with
the first. So the containment is not that the four handlers above
hold a store that cannot write `next_run_at`; it is that none of them
derives an instant to write. `TopicPatch` carries no such member,
both request schemas refuse the key, and
`tests/invariants/api-schedule-containment.test.ts` reads the modules
rather than the types.

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
