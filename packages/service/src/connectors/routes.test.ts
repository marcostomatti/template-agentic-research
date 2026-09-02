/**
 * `src/connectors/routes.ts` — what each of the four routes
 * answers when it REFUSES: the status, the envelope and the
 * members each reaches the wire with. Driven over supertest
 * against a router built by the real factory, standing on
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * WHAT THIS FILE ADDS OVER `service.test.ts` is the translation,
 * and only the translation. That a `kind` outside the tuple is a
 * `ValidationError`, that an unknown id is a `NotFoundError`, that
 * the mask literal is refused wherever it sits, that a delete
 * reads its one count before it refuses — those are claims about
 * the RULES and are pinned one file over, over direct calls. What
 * no call can report is whether the rule reached a caller: the
 * status `errorHandler` or the handler chose, the envelope written
 * around it, the members that envelope carried, and whether a
 * handler swallowed a throw on the way. So every case below reads
 * a response and none of them reads a return value.
 *
 * TWENTY CASES IN THIRTEEN GROUPS. Four guard the fixture, the
 * two vocabularies every refusal is read against and the shapes
 * every answer is held to. Eight cover the refusals — three the
 * address, two the query, two the payload and one the delete
 * guard — and eight cover what a list, a `?kind`, a create, a
 * patch and a delete answer when they LAND. A control in the
 * refusal half is a landing answer read only as far as the axis
 * its own case is about; the positive half is where each of them
 * is read whole.
 *
 * ONE ADDRESS SHAPE AND NOT TWO, which is where this file is
 * shorter than every other resource group's. `connectors` hangs
 * off no domain, so there is no `:slug` to narrow and no second
 * `404` to tell the first from: an id naming no connector is
 * `404` on the two operations that take one, asserted against ONE
 * shared body constant rather than two literals that agree today.
 * A segment that is not an id at all is `422` naming `id` and
 * never `404` — a `404` says the row is not there, and a request
 * that never named a row has not established that. Each is
 * asserted across BOTH routes that take the segment inside one
 * case, because a handler is a chance to narrow only its own.
 *
 * THE LIST TAKES A PARAMETER NO OTHER LIST ON THIS SURFACE DOES,
 * and both cases about it are about what that cost. A `?kind`
 * outside `CONNECTOR_KINDS` is `422` naming the parameter with
 * code `invalid_value`, and its control is a member of the tuple
 * that planted rows carry — so the pair says the refusal is about
 * the TUPLE rather than about a route refusing every `?kind` it is
 * handed. Both halves read the tuple at RUNTIME rather than
 * trusting two literals, so a member added to `CONNECTOR_KINDS`
 * reddens the fixture guard instead of leaving a row nobody
 * notices is wrong.
 *
 * AND THE CAP AND THE STRICTNESS SURVIVED THE EXTENSION, which is
 * the case the `.extend()` in `routes.ts` exists to be checked by.
 * `connectorListQuerySchema` adds one member to the schema
 * `src/http/schemas.ts` declares, and an extension that dropped
 * either property would leave every other case in this file green:
 * a `?perPage` above the cap would be served rather than refused,
 * and `?knid=llm` would be an unfiltered page rather than a `422`
 * naming `query`. Both are asserted in one case, told apart by
 * which assertion fails, and the cap is paired with a request at
 * exactly the cap.
 *
 * THE PAIR IS THE KEY, AND IT IS PER-KIND. A create naming a kind
 * and name the deployment already carries is `409`, and so is a
 * patch whose RESULTING name is one that kind already holds. The
 * two are asserted from ONE body constant, because two handlers
 * are two chances to answer a taken pair two different ways. The
 * control is the same NAME under a different kind, accepted
 * through the create — a router comparing names alone passes both
 * refusals and fails it.
 *
 * THE MASK IS REFUSED ON THE WAY IN, AND THE DETAIL NAMES A PATH
 * WITH NO KEY IN IT. The create submits the literal at the root of
 * a config and answers `config.*`; the patch submits it one level
 * down and answers `config.*.*`, so the DEPTH survives on the wire
 * and the operator's own key does not. The wildcard is spelled as
 * a literal here, which is the only thing that pins it: the
 * constant behind it is private to the service and a test
 * importing it would agree with itself however it were respelt.
 * The control is a REAL secret submitted through the same two
 * operations, accepted and answered as the mask — without it both
 * refusals are equally green against a router refusing every
 * config it is handed.
 *
 * AND THE KEY IT WALKED PAST DOES NOT COME BACK. The operator
 * chose that key, so a detail naming it would be the same leak the
 * `*` exists to prevent. That case COUNTS its occurrences in the
 * serialised body rather than asserting an absence, and takes the
 * same count over a PLANTED envelope carrying it — because a
 * search that would find nothing anywhere reports a clean refusal
 * and a leaking one alike. The same count is taken over the
 * unregistered `?kind`, which is the one other VALUE any request
 * in this file submits that a refusal could plausibly repeat.
 *
 * THE DELETE GUARD IS ONE COUNTED TABLE, not the sources group's
 * two: `export_subscriptions_connector_id_connectors_id_fk` is the
 * whole of what refuses a connector delete, re-derived from the
 * generated SQL in `./store.ts` rather than from a plan. The
 * refusal is asserted WHOLE, `details` included, because the count
 * is the answer rather than an accompaniment to the status — an
 * operator reading what a delete would have taken is reading that
 * number. The key set is swept off `ConnectorDependentCounts`
 * rather than named twice, so a second counted table reddens this
 * case instead of travelling unasserted.
 *
 * THE PAGE IS READ THROUGH THREE WINDOWS AND NOT ONE. A list that
 * fits inside the default window can report neither a `total`
 * taken from the rows in hand nor a handler ignoring the window
 * entirely — every page holds every row and the two numbers
 * agree. So the landing list case reads the collection whole and
 * then twice more through a window of ONE, which is what makes
 * `meta` a reading rather than a shape. The order it asserts is
 * the PAIR: kind ascending with name ascending beside it, which
 * neither column alone, nor the order the rows were planted in,
 * nor the order of their ids would have agreed with.
 *
 * AND WHICH ROWS A `?kind` ANSWERS IS ASSERTED HERE, RATHER THAN
 * HOW MANY. The refusal half's control could say only that a
 * registered member was SERVED, which an unfiltered page also is;
 * these two cases name the rows that came back and read the
 * narrowing's own `total` beside them — `?kind=llm` answers how
 * many `llm` connectors there are and not how many connectors
 * there are. One of them pages INSIDE the narrowing, which is the
 * only request in this file where the filter and the window are
 * read together.
 *
 * A CREATE IS ANSWERED MASKED THOUGH THE CALLER JUST SENT THE
 * SECRET, and both halves of that are read. The rostered key
 * comes back carrying the literal while its unrostered sibling
 * comes back as it was sent, so the mask replaces a VALUE rather
 * than standing in for a document; and the credential is COUNTED
 * in the serialised answer against a planted envelope carrying
 * it, since a search that would find nothing anywhere reports a
 * clean response and a leaking one alike. That the STORE holds
 * the secret verbatim is `./service.test.ts`'s claim over direct
 * calls — no read this router offers can answer an unmasked
 * config, so this file cannot take that reading and says so where
 * the case would otherwise look like it had.
 *
 * A MASKED COLUMN A PATCH REPLACES WHOLE NEEDS THREE REQUESTS,
 * and none of the three is reachable from the others. A patch
 * SENDING a rotated value answers the mask and drops the sibling
 * member the stored document carried, which is the replace-whole
 * rule reaching a caller. A patch naming only the NAME leaves the
 * credential where it was, which is what a service defaulting the
 * member it was not sent would fail. And a patch whose config
 * OMITS the rostered key answers that key GONE — the one channel
 * a wire reading has for telling a secret a read is hiding from
 * one a write has taken away.
 *
 * EVERY WRITE IS READ BACK THROUGH THE LIST. A create or a patch
 * answering a row it never wrote satisfies every assertion about
 * its own response, so each landing write is followed by the
 * collection read whole: the row it wrote held against what it
 * answered, a neighbour held against the constants the fixture
 * plants from, and the page's own `total` beside them.
 *
 * ANTI-VACUITY. A router that refused everything, or that answered
 * every read the same row, would satisfy most of what is below, so
 * each case carries its own control in the same body, varied along
 * the axis under test: each `404` reads what IS there through the
 * SAME operation, the not-an-id case ends on an id that is one,
 * the refused `?kind` is paired with a member of the tuple, the
 * over-cap `perPage` is paired with a request at exactly the cap,
 * the taken pair is paired with the same name under another kind,
 * the submitted mask is paired with a real secret through both
 * writes, and the refused delete is paired with a connector
 * nothing names.
 *
 * WHAT THIS FILE DOES NOT CLAIM. That the router sits behind
 * `ctx.requireAuth` is `tests/api/wiring.test.ts`'s claim; what a
 * refusal may CONTAIN across the whole surface is
 * `tests/api/request-echo.test.ts`'s; and that no sentinel secret
 * reaches a response body or the process output is
 * `tests/api/connector-secret.test.ts`'s. The containment readings
 * below are scoped to the two channels these routes open, which
 * are the operator's own config key and the value a bad `?kind`
 * carries.
 *
 * MUTATION GRID, derived over all twenty cases by mutating one
 * file one edit at a time and reading the failed `fullName` SET
 * from a `--reporter=json` run rather than a count. SIXTEEN legs,
 * each named by the EDIT it makes rather than by its effect, since
 * a leg described only by its effect is one nobody can run again.
 * Ten mutate `./routes.ts`, two mutate `src/http/schemas.ts` — the
 * only target that can reach the bound and the strictness the list
 * schema INHERITS — and four mutate `./service.ts`, which owns the
 * masking and the delete guard. Every leg COLLECTED all twenty
 * cases, which is what separates a leg that reddened nothing from
 * one that failed to load and scored zero looking the same.
 *
 * FOURTEEN OF THE SIXTEEN CAME BACK AT THE FIGURE THE REFUSALS-
 * ONLY GRID RECORDED, counted OUTSIDE the five landing groups —
 * which is the reading that says these are the legs that prose
 * named and not neighbours re-derived from it. What each gained
 * INSIDE them is the positive half's own contribution and is
 * listed beside it.
 *
 * THE ONE ADDRESS LEG REDDENS NINE, six of them the refusals it
 * already reached. Returning the segment raw from {@link readId}
 * reaches every case that gets an ANSWER OUT OF THE STORE by id,
 * which is not the set of cases that NAME a row: the three it
 * gained are the two landing patches and the landing delete, and
 * the landing create is in neither, `POST /connectors` addressing
 * nothing at all. There is still no second address leg here:
 * `connectors` hangs off no domain, so this group has no `:slug`.
 *
 * THE THREE STATUS LEGS EACH GAINED THE CASES NOW NAMED FOR THEM.
 * `res.status(201)` written as `200` on the create goes 2 to 4,
 * `res.status(200)` as `204` on the patch goes 2 to 4, and
 * `res.status(204)` as `200` on the delete goes 3 to 4. All three
 * were already pinned by controls in cases about something else;
 * what the positive half adds is a case that fails for its own
 * reason.
 *
 * `ok(page.rows)` IN PLACE OF `okPage(page.rows, meta)` REDDENS
 * SEVEN, up from one. Every landing case that reads a collection
 * counts it through `meta`, so this leg reaches the landing list,
 * both filter cases, the create read-back, the patch read-back and
 * the delete.
 *
 * THE FOUR QUERY LEGS SPLIT THREE AND ONE. Spelling `kind` as
 * `z.string()`, and dropping `.max(MAX_PER_PAGE)` and `.strict()`
 * in `src/http/schemas.ts`, each still redden exactly the one case
 * written for them — none of the three moved, no landing case
 * sending a malformed query at all. Dropping the `.extend()`
 * altogether goes 1 to 3: it refuses the REGISTERED member, so
 * both filter cases fall beside the refusal case that already
 * reported it.
 *
 * THE FOUR SERVICE LEGS. Answering a create's row UNMASKED goes 1
 * to 3, a patch's UNMASKED reddens 3, and the LIST unmasked
 * reddens 3. The last two are legs this file could not run at all
 * before the landing cases existed, and the list one is the leg
 * `./service.test.ts` records as reddening ZERO in its own
 * refusals-only half — so the claim it was waiting for is here.
 * Skipping the dependent guard still reddens exactly the
 * delete-guard case.
 *
 * AND THE THREE LEGS THAT REDDENED NOTHING NOW REDDEN TWO EACH,
 * which is what the positive half was owed for. A fixed
 * `{ limit: 50, offset: 0 }` in place of `toStoreWindow(query)`,
 * and a `total` taken from `page.rows.length` rather than from
 * `page.total`, each reach the two cases that read a window
 * NARROWER than the collection under it — the landing list and
 * the page inside the narrowing. Passing `{}` where the filter is
 * built reaches the two cases that assert WHICH rows a `?kind`
 * answered. No leg in this grid reddens zero.
 */
import type {
  ConnectorDependentCounts,
  ConnectorRecord,
} from './store.js';
import type {
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import type {
  PaginatedEnvelope,
  PaginationMeta,
  SuccessEnvelope,
} from '../http/envelope.js';
import type { Application } from 'express';

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler } from '../../lib/errors/index.js';
import { createLogger } from '../../lib/logger/node.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import { CONNECTOR_KINDS } from '../db/schema/values.js';

import { buildConnectorsRouter } from './routes.js';
import { MASKED_SECRET, SECRET_CONFIG_KEYS } from './secrets.js';

/**
 * A real logger with every level suppressed.
 *
 * `errorHandler` writes a warn line for every refusal below, and a
 * hand-rolled recorder would be a second implementation of an
 * interface this file makes no claim about. Silent is the whole
 * requirement; what those lines may contain is
 * `tests/api/request-echo.test.ts`'s subject.
 */
const silentLogger = createLogger('connectors-routes-test', {
  level: 'silent',
});

/** The kind the fixture's two model connectors are filed under. */
const LLM_KIND = 'llm';

/** The kind the one subscribed connector is filed under. */
const NOTEBOOK_KIND = 'notebook';

/** The name of the `llm` row carrying a credential. */
const MODEL_NAME = 'primary';

/** A second `llm` row, so a rename has a pair to collide with. */
const FALLBACK_NAME = 'fallback';

/** The `notebook` row an export subscription still names. */
const ARCHIVE_NAME = 'archive';

/**
 * A name no planted row carries, and the one every create that has
 * to LAND submits.
 *
 * Colliding would turn a `422` into a `409` on some requests and
 * change nothing on others, which is a control that reads
 * ambiguously rather than one that fails.
 */
const FRESH_NAME = 'staging';

/**
 * An id shaped like one and carried by no row in any case here.
 *
 * Far past the three the fixture hands out, and a positive integer
 * so that `resourceIdParamSchema` narrows it happily — this is the
 * `404` case's subject, and a value the schema refused would
 * answer `422` and pin the wrong thing.
 */
const MISSING_ID = 9999;

/** Where the fixture's model connector says its service answers. */
const MODEL_ENDPOINT = 'https://model.example.test/v1';

/**
 * What the fixture's model connector authenticates with.
 *
 * A live credential in every sense this file cares about: it is
 * stored under a `SECRET_CONFIG_KEYS` member, so every read of
 * that row answers the mask in its place.
 */
const MODEL_SECRET = 'model-live-credential';

/**
 * The rostered key {@link MODEL_SECRET} is stored under, and the
 * key both mask controls submit a real secret under.
 *
 * Held against the runtime roster by the fixture guard, so a key
 * REMOVED from `SECRET_CONFIG_KEYS` reddens there rather than
 * leaving these controls quietly asserting a mask nobody applies.
 */
const ROSTERED_KEY = 'apiKey';

/**
 * A credential the two mask controls rotate in.
 *
 * Distinct from {@link MODEL_SECRET}, so a control asserting a
 * masked answer cannot be satisfied by the value that was already
 * there.
 */
const ROTATED_SECRET = 'model-rotated-credential';

/**
 * A config key nobody rostered, and the key the mask cases submit
 * the literal under.
 *
 * The operator's own, which is the whole point of it: the walk
 * that finds the literal reports a VALUE wherever it sits, so this
 * key is walked past, and a detail naming it back would be the
 * leak the `*` exists to prevent. Distinctive as a substring,
 * because that case counts its occurrences in the refusal it
 * produced.
 */
const OPERATOR_KEY = 'deploymentSlot';

/**
 * A family of service nobody registered, and the value the query
 * case submits.
 *
 * Distinctive as a substring for the reason {@link OPERATOR_KEY}
 * gives: it is the one other VALUE any request in this file
 * submits that a refusal could plausibly repeat, and a short
 * realistic token would be satisfiable by some other member of the
 * envelope.
 */
const UNREGISTERED_KIND = 'sftp-mirror';

/** How many export subscriptions name {@link ARCHIVE_NAME}. */
const HELD_SUBSCRIPTIONS = 2;

/** How many connectors the fixture plants. */
const PLANTED_CONNECTORS = 3;

/**
 * The window `src/http/schemas.ts` applies to a list that names
 * none.
 *
 * Declared here rather than imported, because the constant behind
 * it is private to that module and a test importing it would agree
 * with itself however it were respelt. What the page case pins is
 * the window a caller who asked for nothing is served.
 */
const DEFAULT_PER_PAGE = 50;

/**
 * A fourth kind, carried by no planted row and by both creates
 * that land.
 *
 * It sorts BEFORE both planted kinds, which is what makes the
 * read-back case's ordering claim a claim: a created row that
 * sorts first though it was written last cannot be an append.
 */
const EXPORT_KIND = 'export_target';

/** The name both landing creates file their row under. */
const SPARE_NAME = 'nightly';

/**
 * The credential the landing create submits.
 *
 * Distinct from every other secret here, so the case counting it
 * in a serialised answer cannot be satisfied by a value some other
 * row put there.
 */
const FRESH_SECRET = 'staging-live-credential';

/**
 * A sibling member of that config, under a key nobody rostered.
 *
 * What makes the create's compare a claim about a VALUE rather
 * than about a document: this member comes back as it was sent
 * while its neighbour does not, and a module masking the config
 * whole would answer both alike.
 */
const FRESH_VAULT = 'staging-vault';

/** How the fixture's notebook connector is arranged. */
const ARCHIVE_VAULT = 'research';

/** The arrangement a config patch replaces the model's with. */
const PATCHED_VAULT = 'model-notes';

/**
 * The three planted rows in the order the port answers them: kind
 * ascending, with name ascending beside it.
 *
 * Neither the order they were planted in nor the order of their
 * ids — the model row was written FIRST and sorts second — and
 * neither the order their names alone would give, since `archive`
 * sorts before both `llm` names and comes last. So a page in this
 * order is the store having applied BOTH columns rather than any
 * single one a simpler comparison would also have agreed with.
 */
const LISTED_PAIRS = [
  `${LLM_KIND}/${FALLBACK_NAME}`,
  `${LLM_KIND}/${MODEL_NAME}`,
  `${NOTEBOOK_KIND}/${ARCHIVE_NAME}`,
];

/** The planted rows a `?kind=llm` selects, in page order. */
const LLM_PAIRS = LISTED_PAIRS.slice(0, 2);

/** The planted rows a `?kind=notebook` selects. */
const NOTEBOOK_PAIRS = LISTED_PAIRS.slice(2);

/**
 * The model row's config as every read of it answers: the endpoint
 * the operator wrote, and the mask where the credential is.
 *
 * Built from the exported literal rather than spelled out, because
 * what that literal IS belongs to `./secrets.test.ts`; what these
 * comparisons pin is that it is what arrives in a credential's
 * place, on every one of the three paths a config leaves by.
 */
const MASKED_MODEL_CONFIG = {
  endpoint: MODEL_ENDPOINT,
  [ROSTERED_KEY]: MASKED_SECRET,
};

/**
 * The whole body a `404` about a connector answers with.
 *
 * One constant asserted by two cases rather than two literals,
 * which is how this file says the two operations that take an
 * `:id` answer ONE envelope rather than two that happen to agree
 * today. The message is `src/connectors/service.ts`'s constant;
 * what is pinned here is that it arrives unmodified with `code`
 * beside it and nothing else.
 */
const NO_SUCH_CONNECTOR_BODY = {
  code: 'NOT_FOUND',
  message: 'No connector carries that id',
};

/**
 * The whole body a segment that is not an id answers with.
 *
 * `invalid_type` rather than a format code, because
 * `resourceIdParamSchema` COERCES: `Number('abc')` is `NaN`, which
 * fails the integer check as a type fault and never reaches the
 * positivity one. Asserted from one constant on both routes that
 * take an `:id`, which on this group is the whole of the address
 * vocabulary.
 */
const NOT_AN_ID_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'id',
    message: 'Missing, or not of the expected type.',
    code: 'invalid_type',
  }],
};

/**
 * The whole body a `?kind` outside the tuple answers with.
 *
 * `invalid_value` and not `invalid_type`, which is what an enum
 * answers to a member it does not carry — and to an explicit
 * `null` as well, so a parameter widened to `z.string()` reddens
 * this case from more than one direction. The detail names `kind`,
 * because the fault has a path of its own; nothing the request
 * submitted is in this envelope at all, and that is the claim its
 * case makes by counting the submitted value in it.
 */
const BAD_KIND_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'kind',
    message: 'Not one of the accepted values.',
    code: 'invalid_value',
  }],
};

/**
 * The whole body a `?perPage` above the cap answers with.
 *
 * `too_big` and naming the parameter the caller typed, which is
 * what makes the refusal the only way a client learns it asked for
 * more than this surface serves.
 */
const OVER_CAP_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'perPage',
    message: 'Above the allowed maximum.',
    code: 'too_big',
  }],
};

/**
 * The whole body a query naming an undeclared parameter answers
 * with.
 *
 * ONE detail naming `query` rather than the parameter, which is
 * `src/http/validation.ts`'s rule: an `unrecognized_keys` issue
 * names the container, because the key itself is something the
 * REQUEST said. That it survives `.extend()` is what its case is
 * for.
 */
const UNDECLARED_QUERY_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'query',
    message: 'Carries a key this endpoint does not declare.',
    code: 'unrecognized_keys',
  }],
};

/**
 * The whole body a taken kind and name pair answers with.
 *
 * The sentence names the PAIR rather than the name, because the
 * key is per-kind: one name under two kinds is ordinary, and a
 * message naming the name alone would send an operator looking for
 * a collision that is not there. Asserted from one constant on
 * both writes that can propose a pair.
 */
const PAIR_TAKEN_BODY = {
  code: 'CONFLICT',
  message: 'This deployment already carries a connector of that kind '
    + 'by that name',
};

/**
 * The whole body a config submitting the mask at the ROOT answers
 * with.
 *
 * One wildcard per segment the operator chose, so `config.*` is a
 * member of the config and the depth is the whole of what
 * survives. The literal `*` is spelled here rather than imported,
 * because the constant behind it is private to
 * `src/http/validation.ts` and to the service that respells it —
 * a test importing either would agree with itself however it were
 * respelt.
 */
const ROOT_MASK_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'config.*',
    message: 'Carries the value a read answers in place of a secret.',
    code: 'masked_secret',
  }],
};

/**
 * The whole body a config submitting the mask ONE LEVEL DOWN
 * answers with.
 *
 * The same sentence and the same code under a longer path, which
 * is the reading that says the depth survives: a service reporting
 * every occurrence as `config.*` would pass the case above and
 * fail this one.
 */
const NESTED_MASK_BODY = {
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: [{
    field: 'config.*.*',
    message: 'Carries the value a read answers in place of a secret.',
    code: 'masked_secret',
  }],
};

/**
 * The `code` and `message` a refused delete answers with, without
 * the count.
 *
 * The count is spread onto this at the assertion, so the SENTENCE
 * is one constant while the number is the subject's own. The
 * message names `/exports` because the repair is a different
 * request rather than a correction to this one, and there is no
 * confirmation that gets past the guard for it to name instead.
 */
const CONNECTOR_SUBSCRIBED_BODY = {
  code: 'CONFLICT',
  message: 'Export subscriptions still deliver through this connector; '
    + 'retire those under /exports first',
};

/**
 * The members `ConnectorRecord` declares, as a response carries
 * them.
 *
 * Written out rather than derived, because an interface has no
 * runtime form to read keys off — and pinned in BOTH directions,
 * since a one-directional list is exactly as green as no list at
 * all against the drift that matters. `satisfies` closes the
 * direction where this names a member the record lacks;
 * {@link EVERY_KEY_LISTED} closes the one where the record grows a
 * member nothing here learned about.
 *
 * FOUR MEMBERS AND NO TIMESTAMP, which is what makes this the one
 * resource group on the surface whose answers carry no `Date`:
 * `connectors` declares neither stamp, so nothing here is
 * rendered by `Date#toJSON` on the way out.
 */
const CONNECTOR_KEYS = [
  'config',
  'id',
  'kind',
  'name',
] as const satisfies readonly (keyof ConnectorRecord)[];

/**
 * The one count a refused delete carries in `details`.
 *
 * Held to the interface by `satisfies`, so a second counted table
 * has to be named here before this file can be green again —
 * which is the one edit that would otherwise let a count travel to
 * a caller with nothing asserting it.
 */
const DEPENDENT_KEYS = [
  'exportSubscriptions',
] as const satisfies readonly (keyof ConnectorDependentCounts)[];

/** The members every body this router answers a resource in has. */
const RESOURCE_KEYS = [
  'data',
  'success',
] as const satisfies readonly (keyof SuccessEnvelope<unknown>)[];

/** The same members, plus the one a windowed read adds to them. */
const PAGE_KEYS = [
  ...RESOURCE_KEYS,
  'meta',
] as const satisfies readonly (keyof PaginatedEnvelope<unknown>)[];

/** The members `meta` describes the window and the collection with. */
const META_KEYS = [
  'page',
  'perPage',
  'total',
  'totalPages',
] as const satisfies readonly (keyof PaginationMeta)[];

/**
 * `true` only while `L` names every key of `T`.
 *
 * The tuple wrapper is load-bearing rather than decoration:
 * without it the union distributes over the conditional and the
 * answer is `boolean`, which accepts `true` as an initializer and
 * pins nothing at all.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/** Every list above, held against the type it describes. */
type EveryKeyListed =
  CoversEveryKey<ConnectorRecord, typeof CONNECTOR_KEYS>
  & CoversEveryKey<ConnectorDependentCounts, typeof DEPENDENT_KEYS>
  & CoversEveryKey<SuccessEnvelope<unknown>, typeof RESOURCE_KEYS>
  & CoversEveryKey<PaginatedEnvelope<unknown>, typeof PAGE_KEYS>
  & CoversEveryKey<PaginationMeta, typeof META_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `ConnectorRecord`, to the dependent counts, to
 * either envelope or to `meta` and to none of the lists above
 * turns {@link EveryKeyListed} into `never`, and this initializer
 * is then a TS2322 at this line — before any case can compare a
 * response against a set that has quietly stopped describing it.
 * Read in a case below so it is a symbol this file uses rather
 * than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link CONNECTOR_KEYS}, sorted at use rather than by hand. */
const CONNECTOR_KEY_SET: readonly string[] = [...CONNECTOR_KEYS].sort();

/** {@link DEPENDENT_KEYS}, sorted. */
const DEPENDENT_KEY_SET: readonly string[] = [...DEPENDENT_KEYS].sort();

/** {@link RESOURCE_KEYS}, sorted. */
const RESOURCE_KEY_SET: readonly string[] = [...RESOURCE_KEYS].sort();

/** {@link PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...PAGE_KEYS].sort();

/** {@link META_KEYS}, sorted. */
const META_KEY_SET: readonly string[] = [...META_KEYS].sort();

/** The roster read at run time, for the fixture guard below. */
const ROSTERED: readonly string[] = SECRET_CONFIG_KEYS;

/** The kind tuple read at run time, for that same guard. */
const KINDS: readonly string[] = CONNECTOR_KINDS;

/**
 * Just enough of an answered connector for an assertion to read
 * it.
 *
 * `supertest` types a response body as `any`, so a callback over
 * `body.data` has no contextual type and its parameter would be an
 * implicit `any` that `check-types` refuses. This is the narrowest
 * shape that makes those reads typed without restating a record
 * already declared in `./store.ts`.
 */
interface AddressedRow {
  /** Which family of service the row reaches. */
  readonly kind: string;

  /** What the row is filed under within that family. */
  readonly name: string;
}

/**
 * A connector as a page carries it, which on this group is the
 * record itself.
 *
 * `connectors` declares no timestamp, so nothing here is rendered
 * by `Date#toJSON` on the way out and the wire shape and the port
 * shape are the same four members — the one resource group on
 * this surface where that is true, and why this file needs no
 * string-typed restatement of a column the record types as a
 * `Date`. What it adds over {@link AddressedRow} is the two
 * members the positive cases read: the id a write answered, and
 * the config every read answers masked.
 */
interface ListedRow extends AddressedRow {
  /** The row's own id, as the store stamped it. */
  readonly id: number;

  /** The stored document, with every rostered value replaced. */
  readonly config: Record<string, unknown>;
}

/**
 * The path one connector is patched and deleted under.
 *
 * @param id - The connector's id, or whatever a case is sending in
 *   its place.
 * @returns The wire path, root-absolute as the router declares it.
 */
function connectorPath(id: number | string): string {
  return `/connectors/${id}`;
}

/**
 * @param body - A paginated body, as it came off the wire.
 * @returns Each row's kind, so a filtered page can be held to one
 *   family rather than to a length another narrowing would also
 *   satisfy.
 */
function kindsOf(body: { data: readonly AddressedRow[] }): string[] {
  return body.data.map((row) => row.kind);
}

/**
 * @param body - A paginated body, as it came off the wire.
 * @returns Each row's name.
 */
function namesOf(body: { data: readonly AddressedRow[] }): string[] {
  return body.data.map((row) => row.name);
}

/**
 * @param body - A paginated body, as it came off the wire.
 * @returns Each row as `<kind>/<name>`, in page order. The natural
 *   key `connectors_kind_name_unique` declares, so ONE list says
 *   both which rows came back and in what order — where two lists
 *   of the columns separately would leave the pairing unasserted.
 */
function pairsOf(body: { data: readonly AddressedRow[] }): string[] {
  return body.data.map((row) => `${row.kind}/${row.name}`);
}

/**
 * @param body - A paginated body, as it came off the wire.
 * @returns Each row's id, in the order the page carried them. Read
 *   beside {@link pairsOf} so an ordering claim says the page is
 *   not the order the store stamped its rows in.
 */
function idsOf(body: { data: readonly ListedRow[] }): number[] {
  return body.data.map((row) => row.id);
}

/**
 * Finds one answered row by its natural key.
 *
 * @param rows - The rows a page answered.
 * @param pair - The `<kind>/<name>` to look for.
 * @returns That row, whole.
 * @throws Error - When the page carries none, which is what keeps
 *   a `find` answering `undefined` from turning a missing row into
 *   a comparison against nothing.
 */
function connectorFor(
  rows: readonly ListedRow[],
  pair: string,
): ListedRow {
  const found = rows.find((row) => `${row.kind}/${row.name}` === pair);

  if (found === undefined) {
    throw new Error(`no connector answered for ${pair}`);
  }

  return found;
}

/**
 * Every key of a response body, sorted.
 *
 * The `toStrictEqual` substitute at this boundary: a row's id is
 * the store's own, so a whole-body literal is unavailable for an
 * answer carrying one — while a key set catches the fault a field
 * read cannot, which is a member arriving that nobody asserted.
 *
 * @param value - The body, or a member of it.
 * @returns Its own enumerable keys, sorted. An empty list for a
 *   response that carried no body at all, which is what a `204`
 *   answers.
 */
function keysOf(value: unknown): string[] {
  return Object.keys(value as object).sort();
}

/**
 * @param haystack - The text to search.
 * @param needle - The string to count.
 * @returns How many times the needle occurs. A count rather than a
 *   boolean, so a zero can be read against a known positive taken
 *   by this same function in the same case.
 */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * Builds an app carrying one freshly built connectors router.
 *
 * `errorHandler` is registered LAST, exactly as `createService`
 * does it, because that registration is what turns a bare `throw`
 * inside an `async` handler into a typed body — without it every
 * case here would read Express's own 500 page. What this app
 * leaves out is the framework's middleware stack and the auth
 * guard: that the routes are mounted behind `ctx.requireAuth` is
 * `tests/api/wiring.test.ts`'s claim, and a limiter counting
 * across cases would only make this file's failures depend on
 * their order.
 *
 * A FRESH router and a fresh app per call, so no case can be
 * reached by state another one left. No clock is supplied, because
 * this router takes none: nothing on this group reads the present.
 *
 * @param store - What the router acts against.
 * @returns The Express app, with the router mounted at `/`.
 */
function buildConnectorsApp(store: MemoryResearchStore): Application {
  const app = express();

  app.use(express.json());
  app.use(buildConnectorsRouter({ store }));
  app.use(errorHandler(silentLogger));

  return app;
}

/**
 * Three connectors, one planted dependent state, and the app in
 * front of them.
 *
 * The smallest fixture every case here can be reached from, and
 * each row earns its place. Two share the `llm` kind, which is
 * where a rename has a pair to collide with and what a `?kind`
 * control narrows to; the `notebook` row is what the delete guard
 * refuses over, and its kind is also what says the natural key is
 * per-kind rather than per-name. Only the model row carries a
 * credential, so a case reading a masked answer is reading one row
 * rather than any row.
 *
 * NO DOMAIN IS PLANTED AND NONE IS NEEDED, which is the one shape
 * difference from every other resource fixture on this surface —
 * and it costs this file the reading a domain id would have given
 * it. On a domain-scoped group the row's `domainId` is the one
 * member no request names, so a row answering it is the store
 * having said where the row sat. Every member of a connector is
 * something a request can name, so there is no such member here
 * and this file makes no claim of that shape.
 *
 * Planted through the PORT rather than through `POST /connectors`,
 * so a case about a patch is not also a case about the create
 * route — and so the refused delete is refused by a subscription
 * count no route on this router could have written. The
 * subscription itself is a seam rather than a row:
 * `export_subscriptions` is not a table this port can write at
 * all.
 *
 * @returns The app and the three ids. The store is not handed
 *   back: every reading a case takes afterwards is a response, so
 *   a case reaching past the surface under test would be pinning
 *   the fixture rather than the router. The ids are addresses
 *   rather than readings — a request cannot name a row without
 *   one.
 */
async function withConnectors(): Promise<{
  app: Application;
  modelId: number;
  fallbackId: number;
  archiveId: number;
}> {
  const store = createMemoryResearchStore();
  const model = await store.insertConnector({
    kind: LLM_KIND,
    name: MODEL_NAME,
    config: { endpoint: MODEL_ENDPOINT, [ROSTERED_KEY]: MODEL_SECRET },
  });
  const fallback = await store.insertConnector({
    kind: LLM_KIND,
    name: FALLBACK_NAME,
    config: {},
  });
  const archive = await store.insertConnector({
    kind: NOTEBOOK_KIND,
    name: ARCHIVE_NAME,
    config: { vault: ARCHIVE_VAULT },
  });

  store.setConnectorSubscriptions(archive.id, HELD_SUBSCRIPTIONS);

  return {
    app: buildConnectorsApp(store),
    modelId: model.id,
    fallbackId: fallback.id,
    archiveId: archive.id,
  };
}

// ---------------------------------------------------------------------------
// What the fixture below plants, and what every answer is held to
// ---------------------------------------------------------------------------

describe('the fixture every case below is read through', () => {
  it('plants one connector per state a case needs', () => {
    const planted = [
      `${LLM_KIND}/${MODEL_NAME}`,
      `${LLM_KIND}/${FALLBACK_NAME}`,
      `${NOTEBOOK_KIND}/${ARCHIVE_NAME}`,
    ];

    // Distinct pairs, so a case finding a row by its key cannot
    // find the wrong one — and two of them share a kind, which is
    // what a rename has to collide inside and what the `?kind`
    // control narrows to.
    expect(new Set(planted).size).toBe(planted.length);
    expect(planted).toHaveLength(PLANTED_CONNECTORS);
    // The conflict control re-uses a planted NAME under a kind
    // that does not carry it, which is the whole of what says the
    // key is per-kind: a router comparing names alone refuses that
    // control and passes both refusals beside it.
    expect(planted).toContain(`${LLM_KIND}/${MODEL_NAME}`);
    expect(planted).not.toContain(`${NOTEBOOK_KIND}/${MODEL_NAME}`);
    // And the name every create that has to LAND submits is one no
    // planted row carries under any kind, so a `422` that turned
    // into a `409` would be this file's fixture rather than its
    // subject.
    expect(planted.map((pair) => pair.split('/').at(-1)))
      .not.toContain(FRESH_NAME);
    // The delete guard is reached by a table that actually holds
    // something. A plant of none would leave the delete landing
    // and its case reading as a guard that stopped guarding.
    expect(HELD_SUBSCRIPTIONS).toBeGreaterThan(0);
    // The refusal spreads that count onto ONE sentence, so the
    // sentence must carry no count of its own: a message naming a
    // number would be green against a guard that had stopped
    // reading the table.
    expect(keysOf(CONNECTOR_SUBSCRIBED_BODY))
      .toStrictEqual(['code', 'message']);
  });

  it('reads both config keys off the runtime roster', () => {
    // The key the fixture stores a credential under IS rostered,
    // so every read of that row answers the mask — a key removed
    // from `SECRET_CONFIG_KEYS` reddens here rather than leaving
    // the mask controls asserting a replacement nobody makes.
    expect(ROSTERED).toContain(ROSTERED_KEY);
    // And the key the mask cases submit the literal under is NOT,
    // which is what makes those cases about the VALUE: the walk
    // reports the literal wherever it sits, and this key is one it
    // walked past rather than one it was looking for.
    expect(ROSTERED).not.toContain(OPERATOR_KEY);
    // The two secrets differ, so a control asserting a rotated
    // credential was stored cannot be satisfied by the one that
    // was already there.
    expect(MODEL_SECRET).not.toBe(ROTATED_SECRET);
  });

  it('reads both kind controls off the runtime tuple', () => {
    // Read off `CONNECTOR_KINDS` rather than trusting two
    // literals, so the pair stays two-directional: a member ADDED
    // to the tuple makes the refused `?kind` legal and reddens
    // here, and a member REMOVED makes a planted kind illegal and
    // reddens here too. Neither direction is reachable from the
    // other, and neither is reported by any assertion in the cases
    // themselves.
    expect(KINDS).toContain(LLM_KIND);
    expect(KINDS).toContain(NOTEBOOK_KIND);
    expect(KINDS).not.toContain(UNREGISTERED_KIND);
  });
});

describe('the shapes every answer below is held to', () => {
  it('names every member of each shape it asserts', () => {
    // The `check-types` half, read here so it is a symbol this
    // file uses rather than one lint reports unused. A member
    // added to `ConnectorRecord`, to the dependent count, to
    // either envelope or to `meta` and to none of the lists is a
    // TS2322 at that declaration, before any assertion below can
    // compare a response against a set that has quietly stopped
    // describing it.
    expect(EVERY_KEY_LISTED).toBe(true);
    // The page envelope IS the resource envelope plus `meta`,
    // which is `okPage`'s stated contract and the one difference
    // this router's two success shapes are read apart by.
    expect(PAGE_KEY_SET)
      .toStrictEqual([...RESOURCE_KEY_SET, 'meta'].sort());
    // And the member every mask claim in this file is about is ON
    // the record, which is what those claims are FOR: `config` is
    // answered on every read here and never answered as stored.
    expect(CONNECTOR_KEY_SET).toContain('config');
  });
});

// ---------------------------------------------------------------------------
// The address: an id naming no connector, and a segment naming none
// ---------------------------------------------------------------------------

describe('an id naming no connector', () => {
  it('answers 404 on a patch, and 200 for the stored id', async () => {
    const { app, modelId } = await withConnectors();
    const patch = { name: FRESH_NAME };

    const missing = await request(app)
      .patch(connectorPath(MISSING_ID))
      .send(patch);
    // The control, along the axis under test and through the SAME
    // operation: a router answering 404 to every patch satisfies
    // the assertion above on its own.
    const found = await request(app)
      .patch(connectorPath(modelId))
      .send(patch);

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_CONNECTOR_BODY);
    expect(found.status).toBe(200);
    expect(found.body.data.name).toBe(FRESH_NAME);
  });

  it('answers 404 on a delete, and 204 for the stored id', async () => {
    const { app, modelId } = await withConnectors();

    const missing = await request(app).delete(connectorPath(MISSING_ID));
    const removed = await request(app).delete(connectorPath(modelId));
    const afterwards = await request(app).get('/connectors');

    expect(missing.status).toBe(404);
    expect(missing.body).toStrictEqual(NO_SUCH_CONNECTOR_BODY);
    // No subscription names the model row, so this delete meets no
    // guard. That the deployment reads two connectors afterwards
    // is what says the 204 was a delete rather than a handler
    // answering without acting.
    expect(removed.status).toBe(204);
    expect(namesOf(afterwards.body)).not.toContain(MODEL_NAME);
    expect(afterwards.body.data).toHaveLength(PLANTED_CONNECTORS - 1);
  });
});

describe('a path segment that is not an address', () => {
  it('answers 422 naming the id rather than 404', async () => {
    const { app, modelId } = await withConnectors();

    // A router that skipped the narrowing would hand `abc` to the
    // store, find no row and answer the 404 the group above
    // asserts. That is the fault this case exists to separate: a
    // 404 is a claim about the table, and `abc` is not an id the
    // table was ever asked about.
    //
    // The patch carries a body the schema WOULD refuse, sent under
    // a segment that is not an id. The answer names the SEGMENT,
    // which is the one reading in this file that the router
    // narrows its address before `patchConnector` sees a body: a
    // handler in the other order answers about `body` and passes
    // every other case here.
    const onPatch = await request(app)
      .patch(connectorPath('abc'))
      .send({ kind: LLM_KIND });
    const onDelete = await request(app).delete(connectorPath('abc'));
    // The control, ending on an id that IS one: without it the
    // assertions above are equally green against a router refusing
    // every `:id` it is handed.
    const anId = await request(app).delete(connectorPath(modelId));

    // BOTH routes that take an `:id`, against ONE body constant:
    // two handlers are two chances to narrow the segment in only
    // one of them, and nothing else in this package would report
    // the half that was left raw. They are also the WHOLE address
    // vocabulary of this group, which has no `:slug` at all.
    expect(onPatch.status).toBe(422);
    expect(onPatch.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(onDelete.status).toBe(422);
    expect(onDelete.body).toStrictEqual(NOT_AN_ID_BODY);
    expect(anId.status).toBe(204);
  });
});

// ---------------------------------------------------------------------------
// The query: a family nobody registered, and what extending kept
// ---------------------------------------------------------------------------

describe('a ?kind outside the tuple', () => {
  it('answers 422 naming the parameter, quoting nothing', async () => {
    const { app } = await withConnectors();

    const unregistered = await request(app)
      .get(`/connectors?kind=${UNREGISTERED_KIND}`);
    // The control, along the axis under test and through the SAME
    // read: a member of `CONNECTOR_KINDS` that planted rows carry.
    // Without it the assertion above is equally green against a
    // route refusing every `?kind` it is handed — which is a
    // plausible failure here, this being the one list parameter on
    // the surface that is not the window.
    const registered = await request(app)
      .get(`/connectors?kind=${LLM_KIND}`);

    // `invalid_value` and not `invalid_type`, which is what an
    // enum answers: the whole envelope, because the detail is the
    // answer here rather than an accompaniment to the status.
    expect(unregistered.status).toBe(422);
    expect(unregistered.body).toStrictEqual(BAD_KIND_BODY);
    expect(registered.status).toBe(200);
    // The narrowing answered rows rather than nothing, which is
    // what says the accepted member reached the store as a filter.
    // WHICH rows it answers is asserted further down, under `a
    // ?kind that narrows the page` — this control cannot say it,
    // an unfiltered page being equally non-empty.
    expect(registered.body.data.length).toBeGreaterThan(0);

    // A COUNT rather than an absence, over the serialised body:
    // the unregistered family is one of two VALUES any request in
    // this file submits that a refusal could plausibly repeat.
    const leaked = JSON.stringify({
      ...BAD_KIND_BODY,
      details: [{
        field: 'kind',
        message: `Not one of the accepted values: ${UNREGISTERED_KIND}.`,
        code: 'invalid_value',
      }],
    });
    const answered = JSON.stringify(unregistered.body);

    expect(countOccurrences(answered, UNREGISTERED_KIND)).toBe(0);
    // The planted control: without it the zero above is equally
    // green against a search that would find nothing anywhere.
    expect(countOccurrences(leaked, UNREGISTERED_KIND)).toBe(1);
  });

  it('keeps the cap and the strictness it extended', async () => {
    const { app } = await withConnectors();

    // `connectorListQuerySchema` adds one member to the schema
    // `src/http/schemas.ts` declares. An extension that dropped
    // either property would leave every other case in this file
    // green, so both are read here — told apart by which
    // assertion fails rather than by two cases.
    const overCap = await request(app).get('/connectors?perPage=201');
    // The control is one past the refusal rather than an arbitrary
    // small window: it says the refusal is a CAP and not a route
    // that refuses every `perPage` it is given.
    const atCap = await request(app).get('/connectors?perPage=200');
    const undeclared = await request(app).get('/connectors?knid=llm');

    expect(overCap.status).toBe(422);
    expect(overCap.body).toStrictEqual(OVER_CAP_BODY);
    expect(atCap.status).toBe(200);
    // Echoed rather than clamped, which is what makes the refusal
    // above the only way a caller learns it asked for too much.
    expect(atCap.body.meta.perPage).toBe(200);
    // ONE detail naming `query` and not the parameter, because the
    // key itself is something the request said. A misspelt `?kind`
    // is the shape this refusal exists for: without it, the page
    // would be unfiltered and look like an answer.
    expect(undeclared.status).toBe(422);
    expect(undeclared.body).toStrictEqual(UNDECLARED_QUERY_BODY);
    // The three shapes an answered page is held to, read as key
    // SETS rather than as fields: a member arriving that nobody
    // asserted is invisible to every field read in this file.
    expect(keysOf(atCap.body)).toStrictEqual(PAGE_KEY_SET);
    expect(keysOf(atCap.body.meta)).toStrictEqual(META_KEY_SET);
    expect(atCap.body.data.map(keysOf)).toStrictEqual(
      Array.from({ length: PLANTED_CONNECTORS }, () => CONNECTOR_KEY_SET),
    );
  });
});

// ---------------------------------------------------------------------------
// The payload: a pair the deployment carries, and a submitted mask
// ---------------------------------------------------------------------------

describe('a kind and name pair the deployment already carries', () => {
  it('answers 409 from both writes, and lands it elsewhere', async () => {
    const { app, fallbackId } = await withConnectors();

    const created = await request(app)
      .post('/connectors')
      .send({ kind: LLM_KIND, name: MODEL_NAME });
    // The patch proposes a name its OWN kind already holds, which
    // is the other way a request can reach this key: the RESULTING
    // pair is what the store is asked for, not the submitted name
    // on its own. The subject is the second `llm` row for that
    // reason — a rename of the `notebook` row onto the same name
    // is the control below rather than a second refusal.
    const renamed = await request(app)
      .patch(connectorPath(fallbackId))
      .send({ name: MODEL_NAME });
    // The control, along the axis under test: the same NAME under
    // a kind that does not carry it. A router comparing names
    // alone refuses this and passes both refusals above, so this
    // is what makes the key per-kind rather than per-name.
    const elsewhere = await request(app)
      .post('/connectors')
      .send({ kind: NOTEBOOK_KIND, name: MODEL_NAME });

    // ONE body constant read by both writes, because two handlers
    // are two chances to answer a taken pair two different ways.
    expect(created.status).toBe(409);
    expect(created.body).toStrictEqual(PAIR_TAKEN_BODY);
    expect(renamed.status).toBe(409);
    expect(renamed.body).toStrictEqual(PAIR_TAKEN_BODY);
    expect(elsewhere.status).toBe(201);
    expect(elsewhere.body.data.kind).toBe(NOTEBOOK_KIND);
    expect(elsewhere.body.data.name).toBe(MODEL_NAME);
    // The record a write answers is the whole row, read as a key
    // SET: `connectors` has four columns and this create names
    // two, so the id and the defaulted config are the store's.
    expect(keysOf(elsewhere.body.data)).toStrictEqual(CONNECTOR_KEY_SET);
    expect(keysOf(elsewhere.body)).toStrictEqual(RESOURCE_KEY_SET);
    // And the refused row is still under its own name, which is
    // what says the 409 left the table where it was rather than
    // refusing after acting.
    const afterwards = await request(app).get('/connectors');

    expect(namesOf(afterwards.body)).toContain(FALLBACK_NAME);
  });
});

describe('a config submitting the mask literal', () => {
  it('answers 422 naming the path with no key in it', async () => {
    const { app, modelId } = await withConnectors();

    // At the ROOT of the config on the create, and one level DOWN
    // on the patch, so the two paths differ by exactly the segment
    // the depth adds: a service reporting every occurrence as
    // `config.*` passes the first and fails the second.
    const created = await request(app)
      .post('/connectors')
      .send({
        kind: NOTEBOOK_KIND,
        name: FRESH_NAME,
        config: { [OPERATOR_KEY]: MASKED_SECRET },
      });
    const patched = await request(app)
      .patch(connectorPath(modelId))
      .send({ config: { nested: { [OPERATOR_KEY]: MASKED_SECRET } } });
    // The controls, along the axis under test and through the SAME
    // two operations: a REAL secret, which is a step from the
    // boundary rather than an arbitrary value. Without them both
    // refusals are equally green against a router refusing every
    // config it is handed.
    const accepted = await request(app)
      .post('/connectors')
      .send({
        kind: NOTEBOOK_KIND,
        name: FRESH_NAME,
        config: { [ROSTERED_KEY]: ROTATED_SECRET },
      });
    const rotated = await request(app)
      .patch(connectorPath(modelId))
      .send({ config: { [ROSTERED_KEY]: ROTATED_SECRET } });

    // The WHOLE envelope on both, because the detail is the answer
    // here rather than an accompaniment to the status. The `*` is
    // spelled as a literal, which is the only thing that pins it:
    // the constant behind it is private to the module that builds
    // the path.
    expect(created.status).toBe(422);
    expect(created.body).toStrictEqual(ROOT_MASK_BODY);
    expect(patched.status).toBe(422);
    expect(patched.body).toStrictEqual(NESTED_MASK_BODY);
    // The controls landed, and each answered the MASK in place of
    // the credential it had just been sent — which is the rule the
    // refusals above exist to protect, seen from the side a caller
    // stands on.
    expect(accepted.status).toBe(201);
    expect(accepted.body.data.config[ROSTERED_KEY]).toBe(MASKED_SECRET);
    expect(rotated.status).toBe(200);
    expect(rotated.body.data.config[ROSTERED_KEY]).toBe(MASKED_SECRET);

    // A COUNT rather than an absence, over the serialised bodies:
    // the operator chose that key, so a detail naming it back
    // would be the leak the `*` exists to prevent.
    const leaked = JSON.stringify({
      ...ROOT_MASK_BODY,
      details: [{
        field: `config.${OPERATOR_KEY}`,
        message: 'Carries the value a read answers in place of a secret.',
        code: 'masked_secret',
      }],
    });

    expect(countOccurrences(JSON.stringify(created.body), OPERATOR_KEY))
      .toBe(0);
    expect(countOccurrences(JSON.stringify(patched.body), OPERATOR_KEY))
      .toBe(0);
    // The planted control: without it both zeros above are equally
    // green against a search that would find nothing anywhere.
    expect(countOccurrences(leaked, OPERATOR_KEY)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The guard: a delete an export subscription still refuses
// ---------------------------------------------------------------------------

describe('a delete of a connector a subscription names', () => {
  it('answers 409 carrying the count, and frees the rest', async () => {
    const { app, archiveId, fallbackId } = await withConnectors();

    const refused = await request(app).delete(connectorPath(archiveId));
    // The control, along the axis under test and through the SAME
    // operation: a connector nothing names. Without it the refusal
    // is equally green against a router refusing every delete it
    // is handed, and against a guard that had stopped counting and
    // started refusing.
    const removed = await request(app).delete(connectorPath(fallbackId));
    const afterwards = await request(app).get('/connectors');

    // The WHOLE envelope, `details` included, because the count IS
    // the answer: an operator reading what a delete would have
    // taken is reading that number. ONE counted table rather than
    // the sources group's two — one foreign key refuses a
    // connector delete and `./store.ts` re-derives that from the
    // generated SQL rather than from a plan.
    expect(refused.status).toBe(409);
    expect(refused.body).toStrictEqual({
      ...CONNECTOR_SUBSCRIBED_BODY,
      details: { exportSubscriptions: HELD_SUBSCRIPTIONS },
    });
    // Swept off the interface rather than named twice, so a second
    // counted table reddens this case rather than travelling
    // unasserted.
    expect(keysOf(refused.body.details)).toStrictEqual(DEPENDENT_KEY_SET);
    expect(removed.status).toBe(204);
    // No body at all on the way that lands, which is what `204`
    // means and what an envelope here would contradict — and on
    // this group it also means the delete is not a last chance to
    // read a config.
    expect(keysOf(removed.body)).toStrictEqual([]);
    // And the refused row is still standing while the free one is
    // gone, which is what says the 409 left the table where it was
    // rather than refusing after acting.
    expect(namesOf(afterwards.body)).toContain(ARCHIVE_NAME);
    expect(namesOf(afterwards.body)).not.toContain(FALLBACK_NAME);
    expect(kindsOf(afterwards.body)).toContain(NOTEBOOK_KIND);
  });
});

// ---------------------------------------------------------------------------
// The page: one window of the deployment's connectors, and its meta
// ---------------------------------------------------------------------------

describe('a connector list that lands', () => {
  it('answers one window of rows beside its own meta', async () => {
    const planted = await withConnectors();
    const { app, modelId, fallbackId, archiveId } = planted;

    const whole = await request(app).get('/connectors');
    // The controls, varied along the axis under test and through
    // the SAME read: two windows of one over the same three rows.
    // A handler ignoring the window answers all three to every
    // call, and a `total` taken from the rows in hand answers 1 to
    // each of the narrow pair. Neither is a reading the refusal
    // half could take — no case there can afford a window
    // narrower than the collection it reads, so every page there
    // holds every row and the two numbers agree.
    const first = await request(app)
      .get('/connectors')
      .query({ page: 1, perPage: 1 });
    const last = await request(app)
      .get('/connectors')
      .query({ page: PLANTED_CONNECTORS, perPage: 1 });

    expect(whole.status).toBe(200);
    expect(first.status).toBe(200);
    expect(last.status).toBe(200);
    // THREE members and not two: this list applies a window, so it
    // carries the `meta` describing one — which is the whole
    // difference between the envelope `okPage` writes and the one
    // `ok` does, and the only place in this file it is read.
    expect(keysOf(whole.body)).toStrictEqual(PAGE_KEY_SET);
    expect(keysOf(whole.body.meta)).toStrictEqual(META_KEY_SET);
    expect(whole.body.success).toBe(true);
    expect(whole.body.meta).toStrictEqual({
      page: 1,
      perPage: DEFAULT_PER_PAGE,
      total: PLANTED_CONNECTORS,
      totalPages: 1,
    });
    // Kind ascending with name ascending beside it, which neither
    // column alone and no arrival order would have agreed with:
    // the model row was planted FIRST and sorts second, and the
    // notebook row sorts LAST though its name sorts before both
    // the others'. The ids read in the same order are what say the
    // page is not simply the order the store stamped them in.
    expect(pairsOf(whole.body)).toStrictEqual(LISTED_PAIRS);
    expect(idsOf(whole.body))
      .toStrictEqual([fallbackId, modelId, archiveId]);
    // Every row rather than the first, so a page cannot carry one
    // well-shaped record beside one that leaked a column.
    for (const row of whole.body.data) {
      expect(keysOf(row)).toStrictEqual(CONNECTOR_KEY_SET);
    }
    // One row WHOLE, against the constants the fixture plants from
    // rather than against another response: a store answering
    // every read the same wrong row would satisfy any
    // cross-response compare. The config is the point of it —
    // this list is one of the three ways a config reaches a caller
    // at all, and it reaches this one masked.
    const rows = whole.body.data as ListedRow[];

    expect(connectorFor(rows, `${LLM_KIND}/${MODEL_NAME}`))
      .toStrictEqual({
        id: modelId,
        kind: LLM_KIND,
        name: MODEL_NAME,
        config: MASKED_MODEL_CONFIG,
      });
    // The two windows are disjoint and each names the total of the
    // COLLECTION, which no page could have counted from its rows.
    expect(pairsOf(first.body)).toStrictEqual(LISTED_PAIRS.slice(0, 1));
    expect(pairsOf(last.body)).toStrictEqual(LISTED_PAIRS.slice(-1));
    expect(first.body.meta).toStrictEqual({
      page: 1,
      perPage: 1,
      total: PLANTED_CONNECTORS,
      totalPages: PLANTED_CONNECTORS,
    });
    expect(last.body.meta).toStrictEqual({
      page: PLANTED_CONNECTORS,
      perPage: 1,
      total: PLANTED_CONNECTORS,
      totalPages: PLANTED_CONNECTORS,
    });
  });
});

// ---------------------------------------------------------------------------
// The filter: which rows a ?kind answers, and which it counts
// ---------------------------------------------------------------------------

describe('a ?kind that narrows the page', () => {
  it('answers only that kind, and counts only those', async () => {
    const { app } = await withConnectors();

    const llm = await request(app)
      .get('/connectors')
      .query({ kind: LLM_KIND });
    const notebook = await request(app)
      .get('/connectors')
      .query({ kind: NOTEBOOK_KIND });
    // The control, along the axis under test and through the SAME
    // read: no `?kind` at all, which is every connector the
    // deployment holds. Without it the two narrowings above are
    // equally green against a route answering one fixed subset.
    const unfiltered = await request(app).get('/connectors');

    // A split that is neither empty nor the whole page on either
    // side, which is what makes the two narrowings different
    // claims rather than one taken twice.
    expect(LLM_PAIRS.length).toBeGreaterThan(0);
    expect(NOTEBOOK_PAIRS.length).toBeGreaterThan(0);
    expect([...LLM_PAIRS, ...NOTEBOOK_PAIRS]).toStrictEqual(LISTED_PAIRS);
    expect(llm.status).toBe(200);
    expect(notebook.status).toBe(200);
    expect(unfiltered.status).toBe(200);
    // WHICH rows, and not how many: a page of the right length is
    // what an unfiltered read of a narrower window would also have
    // answered, and the refusal half's `?kind` control could say
    // no more than that a registered member was served. This is
    // the case that owns the filter.
    expect(pairsOf(llm.body)).toStrictEqual(LLM_PAIRS);
    expect(pairsOf(notebook.body)).toStrictEqual(NOTEBOOK_PAIRS);
    expect(pairsOf(unfiltered.body)).toStrictEqual(LISTED_PAIRS);
    // And the filter reached the COUNT as well as the page, which
    // is the half a caller pages by: `meta.total` answers how many
    // `llm` connectors there are rather than how many connectors
    // there are. A handler narrowing the rows alone answers three
    // to both of these and leaves every assertion above green.
    expect(llm.body.meta.total).toBe(LLM_PAIRS.length);
    expect(notebook.body.meta.total).toBe(NOTEBOOK_PAIRS.length);
    expect(unfiltered.body.meta.total).toBe(PLANTED_CONNECTORS);
  });

  it('narrows the window it pages and the total', async () => {
    const { app } = await withConnectors();

    // The second `llm` row through a window of one, which is the
    // one request in this file where the filter and the window are
    // read together. A handler applying the narrowing to the page
    // and not to the count answers the collection's `totalPages`
    // here and sends a caller to a page that does not exist.
    const second = await request(app)
      .get('/connectors')
      .query({ kind: LLM_KIND, page: 2, perPage: 1 });

    expect(second.status).toBe(200);
    expect(pairsOf(second.body)).toStrictEqual(LLM_PAIRS.slice(1));
    // `totalPages` is the filtered total at a window of one, so
    // both numbers below are the narrowing rather than the
    // deployment — which holds one more row than either.
    expect(second.body.meta).toStrictEqual({
      page: 2,
      perPage: 1,
      total: LLM_PAIRS.length,
      totalPages: LLM_PAIRS.length,
    });
    expect(PLANTED_CONNECTORS).toBeGreaterThan(LLM_PAIRS.length);
  });
});

// ---------------------------------------------------------------------------
// The resource: one connector added, and the mask it answers
// ---------------------------------------------------------------------------

describe('a create that lands', () => {
  it('answers 201 carrying the mask, not the secret', async () => {
    const { app } = await withConnectors();

    const created = await request(app)
      .post('/connectors')
      .send({
        kind: NOTEBOOK_KIND,
        name: FRESH_NAME,
        config: { [ROSTERED_KEY]: FRESH_SECRET, vault: FRESH_VAULT },
      });
    // The control, along the axis under test and through the SAME
    // operation: the two members the schema requires and nothing
    // else. `config` is then the SERVICE's default rather than the
    // request's, so the pair says a create writes what it was
    // handed where a member was handed and defaults only where one
    // was not — a handler defaulting unconditionally answers the
    // first request wrongly and this one right.
    const sparse = await request(app)
      .post('/connectors')
      .send({ kind: EXPORT_KIND, name: SPARE_NAME });

    expect(created.status).toBe(201);
    expect(sparse.status).toBe(201);
    // Two members and not three on both: a create answers one
    // resource, and there is no window for a `meta` to describe.
    expect(keysOf(created.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(sparse.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(created.body.success).toBe(true);
    // The whole row, so a create reaching a member nobody
    // submitted is a red case rather than an answer three field
    // reads agreed with. The config is the point of the compare:
    // the operator's own key came back as it was sent and the
    // rostered one did not, which is the mask replacing a VALUE
    // rather than standing in for a document.
    expect(created.body.data).toStrictEqual({
      id: created.body.data.id,
      kind: NOTEBOOK_KIND,
      name: FRESH_NAME,
      config: { [ROSTERED_KEY]: MASKED_SECRET, vault: FRESH_VAULT },
    });
    // The default, on the request that named no config: an empty
    // document rather than an absent member. A connector with
    // nowhere to reach is a complete row, which is what the
    // column's own default says as well.
    expect(sparse.body.data).toStrictEqual({
      id: sparse.body.data.id,
      kind: EXPORT_KIND,
      name: SPARE_NAME,
      config: {},
    });
    // Neither id is on either request body — `POST /connectors`
    // names no row at all — so both arriving is the STORE having
    // stamped them rather than the request having been echoed back
    // under a 201.
    expect(typeof created.body.data.id).toBe('number');
    expect(created.body.data.id).not.toBe(sparse.body.data.id);

    // A COUNT rather than an absence, over the serialised answer:
    // the credential the caller just sent is the one value a
    // create could plausibly repeat, and a response body is
    // exactly the artifact the mask exists to keep it out of.
    const answered = JSON.stringify(created.body);
    const leaked = JSON.stringify({
      ...created.body,
      data: {
        ...created.body.data,
        config: { [ROSTERED_KEY]: FRESH_SECRET, vault: FRESH_VAULT },
      },
    });

    expect(countOccurrences(answered, FRESH_SECRET)).toBe(0);
    // The planted control: without it the zero above is equally
    // green against a search that would find nothing anywhere.
    expect(countOccurrences(leaked, FRESH_SECRET)).toBe(1);
  });

  it('stores it, and leaves the deployment alone', async () => {
    // Read back through the OTHER operation, so the claim is about
    // what is stored rather than about what a call happened to
    // answer: a create returning a row it never wrote passes the
    // case above and fails this one.
    const { app, modelId } = await withConnectors();
    const pair = `${EXPORT_KIND}/${SPARE_NAME}`;

    const created = await request(app)
      .post('/connectors')
      .send({
        kind: EXPORT_KIND,
        name: SPARE_NAME,
        config: { [ROSTERED_KEY]: FRESH_SECRET },
      });
    const listed = await request(app).get('/connectors');
    const rows = listed.body.data as ListedRow[];

    expect(created.status).toBe(201);
    expect(listed.status).toBe(200);
    // The whole collection in order, so a create reaching more
    // rows than the one it wrote is a red case here rather than an
    // answer nobody compared against anything. The new row sorts
    // FIRST though it was written last, which is what says the
    // page is the store's ordering rather than an append.
    expect(pairsOf(listed.body)).toStrictEqual([pair, ...LISTED_PAIRS]);
    expect(listed.body.meta.total).toBe(PLANTED_CONNECTORS + 1);
    // The stored row is the one the create answered, mask and all.
    // What a caller may never read back is the credential; what it
    // may is that a value is there under that key. That the store
    // holds the secret VERBATIM is `./service.test.ts`'s claim
    // over direct calls — no read on this router can answer an
    // unmasked config, which is the containment rather than a gap
    // in what is asserted here.
    expect(connectorFor(rows, pair)).toStrictEqual(created.body.data);
    expect(keysOf(connectorFor(rows, pair).config))
      .toStrictEqual([ROSTERED_KEY]);
    expect(countOccurrences(JSON.stringify(listed.body), FRESH_SECRET))
      .toBe(0);
    // And a row that was already there still carries what it
    // carried, which no assertion over a created row could say: a
    // create lands ONE row.
    expect(connectorFor(rows, `${LLM_KIND}/${MODEL_NAME}`))
      .toStrictEqual({
        id: modelId,
        kind: LLM_KIND,
        name: MODEL_NAME,
        config: MASKED_MODEL_CONFIG,
      });
  });
});

// ---------------------------------------------------------------------------
// The patch: a credential rotated, and one a request never named
// ---------------------------------------------------------------------------

describe('a patch that rotates a credential', () => {
  it('answers 200 with the config replaced whole', async () => {
    const { app, modelId } = await withConnectors();
    const model = `${LLM_KIND}/${MODEL_NAME}`;

    const rotated = await request(app)
      .patch(connectorPath(modelId))
      .send({
        config: { [ROSTERED_KEY]: ROTATED_SECRET, vault: PATCHED_VAULT },
      });
    const listed = await request(app).get('/connectors');
    const rows = listed.body.data as ListedRow[];

    expect(rotated.status).toBe(200);
    // Two members, not three: a patch answers one resource, and a
    // `meta` arriving here would be the page envelope on a body
    // that describes no window.
    expect(keysOf(rotated.body)).toStrictEqual(RESOURCE_KEY_SET);
    expect(keysOf(rotated.body.data)).toStrictEqual(CONNECTOR_KEY_SET);
    expect(rotated.body.success).toBe(true);
    // The whole row afterwards, which is what says the members
    // this request did not name came through untouched — and the
    // config REPLACED rather than merged into: the endpoint the
    // stored document carried is gone, because this request did
    // not carry it. That is the store's rule reaching a caller,
    // and the only shape under which dropping a setting is
    // expressible at all.
    expect(rotated.body.data).toStrictEqual({
      id: modelId,
      kind: LLM_KIND,
      name: MODEL_NAME,
      config: { [ROSTERED_KEY]: MASKED_SECRET, vault: PATCHED_VAULT },
    });
    expect(keysOf(MASKED_MODEL_CONFIG)).toContain('endpoint');
    expect(keysOf(rotated.body.data.config)).not.toContain('endpoint');
    // The rotated credential is not on the wire either, counted
    // against the same planted control shape the create uses: a
    // write is the one request that carries a live secret INTO
    // this surface, and it is answered by a read.
    const leaked = JSON.stringify({
      ...rotated.body,
      data: {
        ...rotated.body.data,
        config: { [ROSTERED_KEY]: ROTATED_SECRET },
      },
    });

    expect(countOccurrences(JSON.stringify(rotated.body), ROTATED_SECRET))
      .toBe(0);
    expect(countOccurrences(leaked, ROTATED_SECRET)).toBe(1);
    // And the store holds what the patch answered, read back
    // through the OTHER operation: a patch answering a row it
    // never wrote satisfies every assertion above. The collection
    // is read whole beside it, so a patch reaching a neighbour is
    // a red case rather than a write nobody looked past — and the
    // page order is unmoved, this patch having named no column the
    // read is sorted by.
    expect(connectorFor(rows, model)).toStrictEqual(rotated.body.data);
    expect(pairsOf(listed.body)).toStrictEqual(LISTED_PAIRS);
    expect(listed.body.meta.total).toBe(PLANTED_CONNECTORS);
  });

  it('clears a key a config omits, and keeps the rest', async () => {
    const { app, modelId, fallbackId } = await withConnectors();
    const model = connectorPath(modelId);

    // A patch naming only a SIBLING member: the credential is
    // still there and still itself afterwards, which is what a
    // service defaulting the member it was not sent would fail.
    const renamed = await request(app)
      .patch(model)
      .send({ name: FRESH_NAME });
    // The same row's config replaced WITHOUT the rostered key,
    // which on this surface is how a credential is cleared. The
    // answer can tell the two states apart where a masked value on
    // its own cannot: a hidden secret is the key present carrying
    // the literal, and a cleared one is the key gone.
    const cleared = await request(app)
      .patch(model)
      .send({ config: { vault: PATCHED_VAULT } });
    // The control: a patch carrying no member at all, which is a
    // legal call answering the stored row. `connectors` has no
    // `updated_at` for an empty write to stamp, so the port
    // answers without writing rather than refusing.
    const untouched = await request(app)
      .patch(connectorPath(fallbackId))
      .send({});

    expect(renamed.status).toBe(200);
    // `kind` came through though no patch can name it: the column
    // is absent from `patchConnectorSchema` rather than guarded
    // here, and a row whose kind moved would be a different
    // connector.
    expect(renamed.body.data).toStrictEqual({
      id: modelId,
      kind: LLM_KIND,
      name: FRESH_NAME,
      config: MASKED_MODEL_CONFIG,
    });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data).toStrictEqual({
      id: modelId,
      kind: LLM_KIND,
      name: FRESH_NAME,
      config: { vault: PATCHED_VAULT },
    });
    // The key is GONE rather than masked, which is the whole
    // difference between a secret a read is hiding and one a write
    // has taken away — and the rename above is what says the
    // clearing was this request rather than something every patch
    // here does.
    expect(keysOf(cleared.body.data.config)).not.toContain(ROSTERED_KEY);
    expect(keysOf(renamed.body.data.config)).toContain(ROSTERED_KEY);
    expect(untouched.status).toBe(200);
    expect(untouched.body.data).toStrictEqual({
      id: fallbackId,
      kind: LLM_KIND,
      name: FALLBACK_NAME,
      config: {},
    });
  });
});

// ---------------------------------------------------------------------------
// The delete: what a 204 carries, and what it leaves behind
// ---------------------------------------------------------------------------

describe('a delete that lands', () => {
  it('answers 204 with nothing, and takes the row', async () => {
    const { app, fallbackId } = await withConnectors();

    const removed = await request(app).delete(connectorPath(fallbackId));
    const listed = await request(app).get('/connectors');
    // The control, through the SAME operation: the identical
    // request against an id that named a row a moment ago is a
    // 404, which is what makes the 204 above a delete rather than
    // what this route answers to any id it is handed.
    const again = await request(app).delete(connectorPath(fallbackId));

    expect(removed.status).toBe(204);
    // An EMPTY key set and nothing on the wire at all, which is
    // this route's half of the shape the rest of the file reads: a
    // deleted resource has no representation, and on this group
    // that also means a delete is not a last chance to read a
    // config.
    expect(keysOf(removed.body)).toStrictEqual([]);
    expect(removed.text).toBe('');
    expect(removed.type).toBe('');
    // The row is gone and both neighbours are not — including the
    // one whose subscriptions refuse its own delete, which is what
    // says this delete was addressed by id rather than applied to
    // the kind the row sat in.
    expect(listed.status).toBe(200);
    expect(pairsOf(listed.body)).toStrictEqual(LISTED_PAIRS.slice(1));
    expect(listed.body.meta.total).toBe(PLANTED_CONNECTORS - 1);
    expect(again.status).toBe(404);
    expect(again.body).toStrictEqual(NO_SUCH_CONNECTOR_BODY);
  });
});
