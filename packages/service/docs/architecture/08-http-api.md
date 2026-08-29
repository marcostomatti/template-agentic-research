# HTTP API — the wave-1 surface and the rules every route obeys

Wave 1 of the HTTP API is four resource groups over schema v2:
domains, the taxonomy of categories and terms, personas, and the
single operator settings row. This document is the map of what they
share — the two envelopes on the wire, the pagination vocabulary,
the guard every route sits behind, what a validation failure is
allowed to say, and the paths each router declares.

It is written before any of those routes exist, which is the point.
Every rule below is one that four resource groups would otherwise
each settle separately, and a surface whose 422 body depends on
which router answered is not one contract but four. The routes land
against this document; where one of them departs from it, the
departure is argued here in the same commit rather than left for a
reader to find in a response.

It is the document the HTTP API row of the behaviour table in
`docs/architecture/00-overview.md` names, so a change to an
envelope, to the pagination contract, to the guard or to a declared
path lands here with the code. The design it implements is
`.specs/q08-api-wave-1.md`, wave 1 of three carved out of
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
| No route matched the path | `404` `text/html`, Express's own page |

Wave 1 changes none of them, so two things follow for a client. It
cannot assume every response body is JSON, and it cannot assume
every JSON body is one of the two envelopes above. The `401` is the
one every wave-1 route can answer, because every one of them sits
behind the guard.

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

### Every list route takes `?page` and `?perPage`, and no other spelling

`page` is 1-based. Neither `limit`/`offset`, nor `pageSize`, nor
`per_page` is accepted anywhere. The store ports take `limit` and
`offset` because that is what SQL takes; the translation happens
once, in `src/http/schemas.ts`, and no router declares a query
schema of its own.

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
4.5.2 in this tree, a `.strict()` object rejecting an undeclared
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
then wondered about later. Strictness is what makes a settings
PATCH trustworthy as a whole-unit replacement.

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

Waves 2 and 3 extend the same root on the same terms: `/topics`,
`/sources`, `/connectors`, `/exports`, `/findings`, `/documents`,
`/entities`, `/runs` and `/spend` arrive as further routers,
mounted the same way and answering under every rule above.
