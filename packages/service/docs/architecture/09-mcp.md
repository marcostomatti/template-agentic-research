# MCP — the tool registry, and what it may never carry

The second protocol this service speaks is MCP, and everything a
client is offered over it is one written-out list. This document is
the map of `src/mcp/`: what an entry is and what registering one
costs, why every entry carries the schema its HTTP route already
exports rather than a copy of it, the surfaces this protocol may never
carry at all, the separate set of routes nobody has exposed and why
that is a different claim, and the two processes this package runs.

It is the document the MCP row of the behaviour table in
`docs/architecture/00-overview.md` names, so a tool added, removed or
re-pointed lands here in the same commit. The design it implements is
`.specs/2026-08-19-backend-api.md` — its MCP exposure section — carved
into waves by `.specs/q08-api-wave-1.md`, `.specs/q11-api-wave-2.md`
and `.specs/q13-api-wave-3-mcp.md`, the last of which lands every
entry the list holds today and the invariant that holds them to it.

What each act MEANS is not here. A tool calls the same service
function its HTTP route calls, so the rules of a page, a verdict or an
approval belong to `docs/architecture/08-http-api.md` and are stated
there once. What this document holds is what is true of the protocol
rather than of an act: the list, the schemas, the two rosters, and the
entry point.

## The registry

`src/mcp/tools/registry.ts` holds both halves, the way
`src/exports/index.ts` and `src/sources/index.ts` each hold their own
pair. `McpToolEntry` says what a tool IS, and `MCP_TOOLS` is the list
of the ones this service exposes.

That list is composed from three wave modules, one spread each, so an
entry is declared beside the routes it mirrors.

| Module | Entries | What it covers |
| --- | --- | --- |
| `src/mcp/tools/wave-1.ts` | 8 | The reads over domains, the taxonomy, the personas and the operator settings, plus the two term edits. |
| `src/mcp/tools/wave-2.ts` | 7 | The reads over topics, sources, one source's failure queue, the connectors and a domain's export subscriptions, plus the two `run-now` verbs. |
| `src/mcp/tools/wave-3.ts` | 12 | The reads over findings, documents, the entity registry, one source's pending-config queue, the runs and the spend summary, plus the operator ruling on a finding and the two approval gates. |

Twenty-seven entries, twenty of them reads and seven the mutations the
design names among its safe ones. `src/mcp/server.ts` registers every
one of them in one loop, so that literal is the whole of what a client
is offered.

### A tool arrives by an edit to a literal, never by a file appearing

`EXPORT_RENDERERS` and `SOURCE_ADAPTERS` both state that rule for
their own registries, and it matters more here than in either. A
renderer is pure, and an adapter is reached only because a stored row
asked for it by id; an entry in this list is a capability a client can
call without anything in the database naming it first. So a file
dropped into `src/mcp/tools/` is not a registration, and no directory
listing is ever read.

What registering one costs is a line in a wave module's literal, an
import above it, and the cases in that module's own test file. Nothing
else has to be remembered: `src/mcp/tools/registry.test.ts` reads that
same binding, and so does `tests/invariants/mcp-exposure.test.ts`,
which holds it against the routers' own declarations in both
directions.

### An entry is five members, and one of them does the work

| Member | What it is |
| --- | --- |
| `name` | What a client calls it by, unique across the list. Two entries may carry one name and still compile, so the uniqueness is held by a test rather than by the type. |
| `description` | What the tool does, in a sentence a model reads. Held non-empty: an entry with a blank one is listed and unusable, the client seeing a name and nothing that says when to reach for it. |
| `inputSchema` | The arguments, as the schema the HTTP route already exports. Imported and never restated; see `The schemas are the routes' own` below. |
| `route` | The HTTP route this tool is the other protocol's face of, as a label. |
| `handler` | Runs the tool, taking the context first and the arguments second. |

A route is a LABEL, and it is the same string
`tests/api/wiring.test.ts` builds off a router's own `stack` for a
different subject — that every mounted route sits behind the auth
guard. The verb uppercased, one space, then the express path TEMPLATE
with its parameters intact: `GET /domains/:slug/findings`, never a
substituted address. The two files share a vocabulary and nothing
else.

`isMcpRouteLabel` in the registry checks the SHAPE and nothing more. A
label can satisfy it and still name a route no router declares;
whether one names a real route is the exposure invariant's reading,
taken against the routers themselves. What the shape check covers is
the fault that reading cannot report cheaply — a label written in the
wrong form at all, which would compare unequal against every
registered one and say nothing about why.

### The registry starts nothing, which is what makes it readable

`src/mcp/server.ts` calls `createMCP` at module scope, so importing
THAT module boots a server and binds a port. No test can read the tool
list through it. The registry is the half that can be read: type
imports, one zod type, and the three wave lists — no transport, no
store construction, no `createMCP`. The wave modules keep the same
rule from their own side, which is what makes the composition safe to
import.

Every reading this document rests on spends that rule.
`registry.test.ts` and `tests/invariants/mcp-exposure.test.ts` each
import `MCP_TOOLS` directly, so a value import added to the registry
that reaches a server would take both away at once, and neither would
fail in a way that named the import.

### The store arrives at call time, which is what keeps the list static

A handler takes `McpToolContext` as its FIRST parameter and is handed
the store and a clock. A handler closing over a store would need one
built at module scope, which is the side effect the rule above forbids
— so the server builds one context at boot and hands it to whichever
entry was called.

`McpToolStore` is the twelve ports as one intersection rather than the
`Pick` every service module here declares, and the difference is
deliberate. A service names the methods IT reaches, so its type is a
claim about that module. This one is the parameter of a heterogeneous
list: whatever the widest entry needs, every entry is handed. A
handler is still free to declare a `Pick` of its own and stays
assignable, a narrower parameter being the safe direction, so the
read-first claims the wave-3 ports make are not given up by passing
through here.

The clock is a thunk and not an instant, on the terms `src/index.ts`
gives for the one it hands its schedule routers: this context is built
once at boot and then answers for the life of the process, so a
captured `Date` would freeze the present every window is measured back
from at the moment of wiring.

## The schemas are the routes' own

### A restated copy is what asserting identity is for

Every entry's `inputSchema` is the `...ToolInputSchema` its own route
module exports. Not a copy, not a rebuild from the same members, and
not a structurally equal object: the same object. Twenty-seven such
bindings are exported across sixteen route modules, one per exposed
route.

A copy that agreed today would be a second authority nothing compares.
It would parse identically on the commit that wrote it and then drift
on the first change to either side — a member added, a cap moved, a
coercion tightened — and no reading of either half would report it.
What a client would meet is two protocols wearing one name,
disagreeing about which requests are legal, with each side's own tests
green.

`Object.is` and never `toEqual` is what turns that into a measurement.
A structural comparison PASSES over a restated copy, and being
restated is the whole fault; identity fails on it. The claim is
asserted twice from different keys rather than once written down
twice: each wave module's own test pairs a schema with a tool NAME,
and `tests/invariants/mcp-exposure.test.ts` pairs it with the ROUTE
the entry carries.

Those two catch faults one case apart, which is why keeping both is
not redundancy. An entry holding a SIBLING route's schema — the
findings list schema on the findings get, both exported from one
module — still agrees with a name-keyed row somebody wrote to match,
and disagrees with the route-keyed one.

A table of identities would also be satisfied by a surface where one
schema is shared by everything, so the invariant asserts beside it
that the paired schemas are DISTINCT objects. A route module aliasing
one export to a sibling reddens that case alone and leaves every
identity row green, both rows then naming one object.

### A tool input is one object where a request is two parsed units

An HTTP request carries its address in the path and its window in the
query string, and the route parses them apart. A tool is handed a
single arguments object. So the binding an identity can be asserted
against has to be declared per exposed ROUTE, in the route module,
spread from the pieces that route already parses — an object over the
address shape and the query shape, `.strict()`, exported as
`<thing>ToolInputSchema`.

A spread rather than an export of the private address schema. Those
address consts are declared per router rather than shared, and most of
these modules say so in as many words; a derived export tracks one
without making it importable, so exposing a route left every such
sentence true.

Defaults and coercions survive the spread, and so does `.strict()`. A
tool called with a string id answers the same parsed number and the
same defaulted window its route would have answered.

A handler parses its own input through that schema and through
`parseBody`, so a refusal here is the same `ValidationError` the route
answers: one detail per fault, with a field path and never a submitted
value. `parseBody` and not `parseQuery`, because a tool is called with
one object the caller composed, which is what that function names
`body`, and there is no query string on this protocol for the other
spelling to mean. A list tool therefore answers `field: 'body'` where
its route answers `field: 'query'` for the same misspelt parameter,
and that is the one place the two refusals read differently.

### Two schemas are composed the other way round, and that is a refusal

`.strict()` survives a spread and an object-level refinement does not.
zod carries a cross-field check OUTWARDS only, so a refined schema
spread into a fresh object keeps every key rule and silently drops the
refinement — and the tool then accepts a request its own route
refuses, while agreeing with every other reading anybody would take.

Two of the twenty-seven read a window over time and inherit the check
that refuses a `since` at or after its `until`: the findings list and
the spend summary. `src/http/schemas.ts` carries exactly one
refinement today and both of them get it from there. So both are
composed by EXTENDING from the refined schema rather than by spreading
into a new one, and `GET /spend/summary`, whose whole request IS that
query, ALIASES the binding instead of rebuilding it — which also makes
its identity the strongest form one can take. Each of those two route
modules argues it beside its own declaration.

The rule generalises past those two: read a piece for a refinement
before spreading it, because the spread is silent about what it
dropped.

## What a tool answers

### One text block carrying the envelope the route would have sent

`src/mcp/tools/text-result.ts` holds the single function every wave
module answers through: one text block carrying the same
`{ success: true, data, meta? }` envelope the route writes, serialised
the way `res.json` serialises it, so a `Date` is the same ISO string
on both protocols and a client reading a tool result is reading the
documented response body. Indented, because the consumer is a model
reading text rather than a parser counting bytes.

The `success` member is kept rather than unwrapped. It costs one key,
and it means the two answers are one shape rather than two that happen
to agree about the data.

### A raise crosses as a sentence, and the code does not survive it

No handler on this surface catches anything, and neither does the loop
in `src/mcp/server.ts`. A service function throwing `NotFoundError`,
`ConflictError` or `ValidationError` reaches the SDK, which answers an
ordinary RESULT carrying `isError: true` and the raised sentence as
its only block — never an exception a caller could catch.

What that costs is the machine-readable half of the failure envelope.
`AppError.code` is what an HTTP client reads to tell a `404` from a
`409`, and it does not cross this protocol: on MCP those two are told
apart by their message alone. The messages are the ones the HTTP
surface already answers, which is what keeps it workable, and a caller
that needs the code is on the wire rather than here.

The SDK parses the input schema ITSELF, before a handler runs, which
is what makes handing over a whole schema enforced at runtime rather
than only at `check-types`. A malformed address and an undeclared key
are each refused in the SDK's own wording rather than in this
package's `ValidationError` vocabulary; the handler's own `parseBody`
produces the house refusal for whatever the schema admits. It is also
the cheapest evidence the schema was applied at all rather than
ignored.

## The banned surfaces

Three routes are named outright, and no entry of `MCP_TOOLS` may carry
one. `tests/invariants/mcp-exposure.test.ts` holds the roster with a
reason beside each row so the check can fail naming one; the argument
is here.

| Route | Why it may never be a tool |
| --- | --- |
| `POST /connectors` | Takes a connector config, which is where an API key lives, so a create IS a credential write. |
| `PATCH /connectors/:id` | Takes the same config a create does, so it can set or rotate a stored credential. The list beside it IS exposed, and answers the mask literal rather than what is stored. |
| `DELETE /domains/:slug` | Removes a domain and cascades over every row hanging off it, which is the one act on this surface no later request can undo. |

A fourth family is not a roster but a path PREFIX: every route under
`/_control`, the framework control plane, which can pause a
dependency, reset a client and stop the process. It is a prefix
because the control plane grows routes on the vendored half of this
package, and a roster enumerating them would go stale on a change
nothing here reviews.

### A ban is a property of the act, and no later wave revisits one

That is the whole of the difference between this roster and the
deliberate absences below, and it is worth stating because the two
look alike from a distance.

A route is BANNED when the reason is a property of the act rather than
of how much of the surface has been exposed so far: a credential
leaving the deployment, a cascade nothing can undo, a process a client
can stop. Growing the surface never makes one of those reasonable, so
a later wave has nothing to revisit and the roster is not a backlog.

A route in the other roster is one nobody has exposed. The reason is
real and it is about today, and a later wave is free to make a
different call about it.

The connectors group is where the two sit one step apart, which is
what makes the line legible. `POST /connectors` and
`PATCH /connectors/:id` are banned because each is how a credential is
SET. `DELETE /connectors/:id` is merely unexposed: it removes a
connector and the stored credential with it, which is destructive
rather than a credential write, and it is off the surface for the
reason every other delete is.

### The prefix is read out of the mount rather than transcribed

`anything under /_control` stays a sentence until the routes it covers
are read off the framework router, so the invariant builds
`createControlRouter` and labels its layers at the mount
`lib/express/builtin-routes.ts` gives them — seven routes at this
commit, the roster following the framework instead of copying it. The
prefix itself is READ out of that module, and the read REFUSES rather
than falling back: a formatting change to that one line fails the
whole file naming itself, instead of quietly shrinking what the ban
covers.

What the read does NOT buy is a cross-check, and saying so is part of
the reading. The walk labels the control router at whatever it derived
and the classifier compares against the same constant, so both sides
move together: a mount that MOVED is followed, a mount that cannot be
READ fails the file, and a mount derived WRONGLY would be invisible.
Closing that would mean standing a service up to see where the router
is really mounted, which is `tests/api/wiring.test.ts`'s subject
rather than this one.

The comparison is against the whole mount SEGMENT and not a bare
`startsWith`, because a route served at `/_controls/...` would satisfy
the looser form and is a different surface.

### The auth router is left out rather than listed

`src/auth/` is not walked at all, and leaving it out is the stronger
statement rather than the weaker one. Its routes answer a different
envelope, share no service function with anything on this surface, and
are mounted outside it.

A tool naming `POST /auth/login` is caught on the EXPOSED side
instead: that label sits in no walked router, so the covering equality
fails on it. Listing the three as deliberate absences would have made
them LEGAL members of the walked set, which is the opposite of what is
wanted for a credential surface. The choice generalises — reach for
the exclusion for anything a partition must never admit, and for a
roster row only where a later wave could reasonably revisit the
absence.

## The deliberate absences

### An absence nobody wrote down reads exactly like an oversight

Twenty-two routes are declared by a router, banned by nothing, and
named by no tool. Each is written out with the reason it is off the
surface, in the same file as the banned roster.

Without that list the covering below could not exist, and
`no tool exposes this yet` would be indistinguishable from
`nobody has read this route`. The design says as much in as many
words: an omission nothing asserts is an omission the next contributor
undoes. A route added to any router lands in one of the three rosters
or the partition fails naming it.

The roster lives in the invariant rather than in this document because
it is the thing the partition is taken against, and a copy here would
be a second authority nothing compares — the same fault
`A restated copy` above is about, one artifact over. What belongs here
is the pattern those rows fall into, which is what a reader needs in
order to predict where a new route lands.

### Almost all of them are writes, and the pattern is the safe list

A mutation reaches this protocol when the design names it among the
safe ones, and every such mutation is exposed: the two term edits, the
two `run-now` verbs, the operator ruling on a finding, and the two
approval gates. Seven, and there is no eighth. What is left over falls
into three shapes.

- Every create and patch that writes configuration a research pass is
  scored BY — a domain's criteria and settings, a category's filing
  key, a persona, a topic's terms and schedule, a source's contract
  and parser config, a subscription's destination and interval, the
  operator settings row, and an entity's name and alias. Each of those
  moves what an already-answered page holds, and a model able to
  rewrite the criteria it is judged against is not reading the
  surface, it is editing it.
- Every delete, because a removal answers no representation. The one
  delete whose reason is stronger than that is banned rather than
  merely absent.
- `POST /topics/:id/pause`, which writes the same column its `run-now`
  sibling does but is a deferral measured in cycles against a clock an
  operator is watching, where a run-now asks for no new configuration
  and takes effect on the next tick.

Two branches of the terms router are out of reach structurally rather
than by decision. `?format=seed` on the read and a seed body on the
create answer and accept a whole lexicon written for byte-exact
re-import — a file rather than a result — and `.strict()` on the tool
input is what puts the create branch out of a tool's reach at all.
`src/taxonomy/terms-routes.ts` carries that argument beside each
schema that leaves it out.

## The partition, in both directions

The rule has two directions and the second is where a gap would hide.
No entry may name a banned route, which is the direction a reader
expects. And every route label the walked routers declare is exposed
by a tool, banned, or written out as a deliberate absence carrying its
reason — so `nothing exposes it yet` and `nobody has looked` stop
being the same state.

Measured at this commit: fifty-nine distinct labels, fifty-two from
the sixteen research routers and seven from the control plane,
splitting as twenty-seven exposed, ten banned — the three named plus
the seven under the prefix — and twenty-two written-out absences.

The covering is asserted with the three rosters held pairwise DISJOINT
beside it, and that pairing is load-bearing rather than tidy. A
covering alone is satisfied by a label sitting in TWO rosters, which
is exactly how a banned route would acquire a tool without the union
changing size. The intersections are asserted rather than an
arithmetic identity over the sizes, so a failure names the label
instead of reporting a number that moved.

### Declared, not mounted

The walk reads what the sixteen routers DECLARE and not what
`src/index.ts` mounts, and the two sets are free to differ — a router
can be built and not yet mounted, or mounted and later taken down.

That is the point rather than a gap. What a tool reaches is a service
FUNCTION: a handler calls the same function the route handler calls,
with no express in between, so the surface a tool could name is what
the routers declare. Reading the mounted set instead would go green
over a router that had been unmounted, which is a wiring fault rather
than an exposure one — and the mounts are `tests/api/wiring.test.ts`'s
subject.

Because a partition over an empty set holds and so does a classifier
over one, every router has to contribute at least one label, asserted
as a set difference so a failure names the router that went quiet
rather than reporting a number that moved. A `router.use(path, fn)`
layer carries no route at all, so a router registering its path as
middleware declares nothing — which is the cheapest way that case is
made to report.

### A plant per family, because the classifier is two shapes

The banned classifier reads a written-out roster AND a path prefix, so
an entry planted over one says nothing about the other. The invariant
drives one plant per family through the same function in the same
case, each with a fabricated near miss beside it.

The near misses are near ON PURPOSE. `POST /_controls/stop` against
`POST /_control/stop` is what says the prefix rule is not a bare
`startsWith`, where a fabricated label nothing resembles is absent for
the trivial reason and reports on nothing.

## Two processes over one codebase

### The API and the tool server are separate entry points

`src/index.ts` starts the Express API through `createService`;
`src/mcp/index.ts` starts the MCP server through `createMCP`. Two
entry points, two processes, two ports, over one `src/` —
`bun run start` and `bun run start:mcp` — and deployed unmodified they
share an instance exposing both.

`README.md` records the alternative the template also supports: a
single process serving both, with the MCP surface mounted under a
route of the API. This package runs the two-process form, and the
reason the choice costs so little either way is that neither protocol
holds a rule. A tool calls the same service function the route calls,
with the same arguments, and wraps the answer in the same envelope;
what differs is the transport and nothing else.

The MCP process's own transport is not chosen here either. `lib/mcp`
resolves `MCP_TRANSPORT` at call time: stdio for local use and a
client on the same machine, streamable HTTP otherwise, with a health
server beside it in the HTTP form and none under stdio.

Each process builds its own stores. `src/index.ts` spreads one drizzle
implementation per resource group into the object its routers share,
and `src/mcp/server.ts` spreads the same twelve into the context every
handler is given, each over its own thunk onto the database client.
Every `createDb*Store` opens nothing at construction and resolves that
client per call, which is what lets the MCP context be built at module
scope at all: the pool connects on the first tool somebody calls.

### What the MCP process does not do

`createMCP` takes no dependency array, and the Postgres dependency
built for that process is built for its client alone. Three things the
API process gets from `createService` are therefore absent here, and
they are written down rather than left to be discovered.

- Postgres is not probed at boot, so an unreachable database surfaces
  at the first tool call rather than at start.
- The pool is not drained on shutdown: on `SIGTERM` the transport and
  the health server are closed, and the pool is left to time its idle
  clients out.
- There is no `/_control` plane on this process at all —
  `lib/express/builtin-routes.ts` mounts it, and no Express app runs
  here. The banned prefix is a statement about what a TOOL may reach,
  and the routes it names are the API process's.

Auth is the fourth difference and it is a different shape rather than
an omission. Every HTTP route sits behind `ctx.requireAuth`; this
protocol registers no such guard, and what stands in its place is the
transport — stdio is a process somebody started, and the HTTP
transport is reached on a port a deployment decides who can see. That
is why the banned roster is a boundary rather than a convenience: it
is the one thing on this surface that does not depend on how the
process was exposed.
