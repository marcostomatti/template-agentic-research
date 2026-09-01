/**
 * `src/connectors/service.ts` — what the four connector operations
 * refuse, and what they let through. Driven over
 * `tests/helpers/memory-research-store.ts`, so every claim here is
 * answered with no database anywhere.
 *
 * THIRTEEN CLAIMS, NINE OF THEM REFUSALS. The first nine are every
 * way this module says no, each carrying the narrow CONTROL its
 * refusal needs, varied along the one axis the refusal turns on: a
 * module refusing everything passes every assertion a refusal case
 * makes on its own, which is what those controls exist against. The
 * last four are what the four operations LAND, and on this group
 * that half is where the write-only rule is finally read from both
 * sides — what a caller is answered, and what the store was left
 * holding, in the same case.
 *
 * THAT AN ADDRESS NAMING NOTHING IS A 404, ON THE TWO OPERATIONS
 * THAT TAKE ONE. `connectors` hangs off no domain, so there is no
 * `:slug` and no second address to tell the first from: the table
 * below covers the patch and the delete, and a guard beside it
 * holds the two operations that take NO address against the
 * module's own export list, so an operation that grew one without a
 * row here is a named failure rather than a table quietly covering
 * half of what it should.
 *
 * THAT A BODY IS PARSED HERE, not above. Every row of the body
 * table is submitted to a SERVICE function rather than to a schema,
 * which is what says an MCP tool in wave 3 cannot be handed a
 * payload the HTTP route would have refused. Both operations that
 * take a body have rows of their own, since a row driven through
 * only one of them pins nothing about the other, and the ordering
 * is pinned in both directions available here: a malformed patch
 * outranks an id that names nothing, and a malformed create
 * outranks a pair the deployment already carries.
 *
 * THAT `kind` IS HELD TO THE TUPLE ON THE CREATE AND REFUSED
 * OUTRIGHT ON THE PATCH, which is the one place this group departs
 * from the sources group over a column that looks identical. Both
 * halves are read off the BODY against `CONNECTOR_KINDS` at run
 * time rather than off a label: the create rows submit a kind
 * OUTSIDE the tuple and answer `invalid_value`, and the patch row
 * submits a kind the tuple DOES declare and answers
 * `unrecognized_keys`, so a schema that grew a `kind` member would
 * fail the second while passing every other row. The widening
 * control loops the tuple through a create, since a schema
 * spelling three of the four literals by hand refuses the fourth
 * and is green against every refusal row.
 *
 * THAT THE PAIR IS THE KEY, AND IT IS PER-KIND. A create naming a
 * kind and name the deployment carries is a 409, and so is a patch
 * whose RESULTING name is one that kind already holds. Three
 * controls sit under them and no two are reachable from each other:
 * the same name under a DIFFERENT kind lands, a rename to the row's
 * OWN name lands, and a rename onto a name another kind carries
 * lands. A service comparing names alone passes both 409 rows and
 * fails all three.
 *
 * THAT THE MASK IS REFUSED ON THE WAY IN, WHEREVER IT SITS. The
 * table submits the literal at the root of a config, one level
 * down, inside a list, twice at once, and under a key nobody
 * rostered — that last one being the reading that says the walk
 * reports the VALUE rather than the roster. Both writes carry rows.
 * The controls are the ones an equality needs: a real secret is
 * accepted and stored verbatim while the answer is masked, a value
 * that merely CONTAINS the literal is accepted, and the literal as
 * a KEY is accepted, each a single step from the boundary.
 *
 * THAT SUCH A REFUSAL NAMES THE PATH WITH EVERY OPERATOR-CHOSEN
 * SEGMENT MASKED. `config.*` for a member and `config.*.*` for one
 * inside it, so the DEPTH and the COUNT survive and no key does —
 * the same rule `src/http/validation.ts` applies to a zod issue
 * below an `openPaths` prefix, applied by hand because this refusal
 * is not zod's. The wildcard is spelled as a literal in the table,
 * which is the only thing that pins it: the constant behind it is
 * private to the module under test and a test importing it would
 * agree with itself however it were respelt.
 *
 * THAT A DELETE IS REFUSED ABSOLUTELY WHILE A SUBSCRIPTION NAMES
 * THE ROW, and that the refusal carries the count. One table is
 * counted here rather than the sources group's two, so what the
 * roster guard reads is that the rows and
 * `ConnectorDependentCounts` agree about which — a second counted
 * table added to that record reddens `check-types` before it
 * reaches the guard. Three readings sit beside the table. A
 * connector nothing names is deleted, which is the control the rows
 * cannot supply. The operation stops BEFORE the destructive call,
 * which no reading of the stored rows can answer. And a
 * subscription written AFTER the count answers a DIFFERENT sentence
 * with no counts at all, because the counted one quotes a number
 * that refusal is reached with at zero and because retrying is the
 * right next act for one and not the other.
 *
 * THAT THE ONE REASON EITHER WRITE DECLARES IS TOLD FROM THE ONES
 * IT DOES NOT. `unique-violation` is the whole of what
 * `refuseWrite` translates. A `check-violation` is rethrown on the
 * same reading `src/sources/service.ts` records — the boundary
 * holds `kind` to the tuple the CHECK is generated from, so meeting
 * one anyway means the two have drifted apart — and it is rethrown
 * out of BOTH call sites, though only the insert can reach the
 * CHECK for real, which is what says the rethrow is a claim about
 * the REASON rather than about the call site.
 *
 * THAT NOTHING SUBMITTED COMES BACK, INCLUDING THE CREDENTIAL. The
 * containment block counts occurrences of a sentinel in the
 * serialised refusal rather than asserting absence, and takes the
 * same count over a planted envelope — a search that would find
 * nothing anywhere reports a clean refusal and a leaking one alike.
 * Two of its five needles are this group's own. One is a config
 * VALUE under a rostered key, which is a live credential and the
 * thing this whole surface exists to keep off the wire; the other
 * is a config KEY, which the mask refusal walks past and which
 * would reach a detail if that refusal named the path it found. The
 * 409 a duplicate pair raises while a sentinel secret sits in the
 * body is a row of its own: a conflict detail is the likeliest
 * place a submitted body leaks back, and it is the one refusal on
 * this group a caller reaches while holding a real key.
 *
 * THAT EVERY CONFIG A READ ANSWERS IS MASKED, which is the
 * write-only rule seen from the side a caller stands on. The page
 * carries TWO credentials under two DIFFERENT rostered keys, so a
 * module masking the first row, or the first key, answers a
 * perfectly plausible page and fails; and the stored rows are
 * counted in the same case, so the zero on the wire is a statement
 * about values that genuinely traversed this path rather than about
 * a fixture that never carried one. A config holding no rostered
 * key comes back as itself, which is the control the masked rows
 * cannot supply and which a module masking wholesale would fail.
 *
 * THAT A CREATE ANSWERS THE MASK AND STORES THE SECRET. Both halves
 * are read in one case, because either alone describes a different
 * module: an answer carrying the credential back would be the very
 * artifact the masking exists against, and a write that stored the
 * mask would leave the deployment holding a connector that cannot
 * authenticate, with nothing on the wire saying so.
 *
 * THAT A PATCH REPLACES `config` WHOLE, SO AN OMITTED KEY IS A
 * CLEARED SECRET. Read off the STORE and not off the answer, which
 * is the only reading that tells a credential that is gone from one
 * the mask is hiding, and paired with the same patch sending a
 * ROTATED secret — a module clearing every rostered key on every
 * patch passes the first and fails the second. A patch naming the
 * name alone is the third of the three: it reaches no config at
 * all, and the credential is still there and still itself.
 *
 * THAT A DELETE TAKES THE ROW AND THE CREDENTIAL WITH IT. The page
 * afterwards is compared as whole records, the id is unusable by a
 * patch as well as by a second delete, and the port's own lookup
 * answers null — the one read that would still see a config the
 * masking had hidden.
 *
 * Mutation legs, run over this file with `--reporter=json` and read
 * as the failed case SET rather than as a count. Thirty legs
 * against 117 cases, each named by the EDIT it makes rather than by
 * its effect, plus two `check-types` legs that are not vitest runs
 * at all. Twenty-four mutate `./service.ts`, five mutate
 * `tests/helpers/memory-research-store.ts` — the only target that
 * can reach the natural key's per-kind half, the page's ORDER, its
 * filter or the replace-whole rule — and one mutates
 * `src/db/schema/values.ts`.
 *
 * THE POSITIVE HALF WAS ADDED AFTER THE TWENTY-TWO LEGS BELOW WERE
 * RECORDED, so every one of them was re-derived from its own
 * sentence and re-run. Nineteen came back at exactly their recorded
 * figures with no red at all in the four new sections, which is the
 * reading that says they are still the legs this prose names.
 * THREE moved, all by GAINING new-section reds and none by losing
 * an old one: the guard-refuses-every-delete leg, the
 * written-record-unmasked leg, and the list-unmasked leg whose
 * recorded ZERO the new half exists to close. Two were rebuilt
 * WRONG on the first attempt and are worth the warning: an edit
 * that DELETED the create's mask check rather than moving it below
 * the insert reddens 5 where the recorded leg reddens 1, and
 * narrowing `CONNECTOR_KINDS` itself rather than the schema's enum
 * reddens 14 where the recorded leg reddens 2. Both are neighbours
 * of the leg their sentence names, not the leg.
 *
 * The two `.strict()` legs redden 4 apiece and their sets are
 * DISJOINT, which is what says the two schemas are separately
 * pinned rather than sharing one `parseBody` nobody would notice
 * degrading. Each is that half's undeclared-key rows plus its
 * containment row; the create's fourth is its ordering case and the
 * patch's is the `kind` row, which is declared on one schema and
 * refused outright by the other.
 *
 * The two kind legs make the tuple two-directional and their sets
 * are disjoint. Widening `kind` to `z.string()` reddens 4 — both
 * create kind rows, the containment row that submits one, and the
 * empty create body, whose MISSING `kind` answers `invalid_value`
 * under an enum and `invalid_type` under a string. Narrowing the
 * tuple to three of its four members reddens 2, both acceptance
 * controls, and only one of the two was written for it: the
 * one-character-name control creates an `export_target`, so a
 * control aimed at the name floor is the second reading of the
 * tuple.
 *
 * The two name legs are nearly disjoint. Dropping `.min(1)` from
 * the create reddens only its empty-name row; dropping it from the
 * patch reddens 2, that half's row and the patch ordering case,
 * which sends the empty name to an id that is not there.
 *
 * The two config legs read the record's SHAPE against its VALUES.
 * Widening `connectorConfigSchema` to `z.unknown()` reddens exactly
 * 4, the member on both operations twice over. Narrowing its VALUES
 * to `z.string()` reddens a disjoint 5 — the open-record acceptance
 * control, and every mask row whose literal sits inside a
 * container, a nested object no longer being a legal value.
 *
 * Dropping `openPaths` from the create parse reddens ZERO, and that
 * zero is recorded rather than repaired: while the value schema is
 * `unknown`, no zod issue is reachable strictly below the prefix,
 * so the declaration has nothing in this file to report. The
 * masked-secret rule reaches below it by hand, which is why the
 * three legs below do.
 *
 * The three masked-path legs pin the wildcards and they nest.
 * Neutering the walk reddens 12 — every table row, the sentence
 * pin, the ordering case, the wrote-nothing case and the
 * containment row. Reporting the path UNMASKED reddens 10 of those
 * same 12, all but the two that read no field. Folding every path
 * to a single `config.*` reddens 4, exactly the rows whose literal
 * sits more than one segment down, which is the surviving depth
 * expressed as a leg. The case that reads the depths off the TABLE
 * moves for none of the three, being a fixture guard rather than a
 * reading of the module.
 *
 * Removing the check from the patch call site alone reddens 7,
 * exactly the patch half of that 12, so the two call sites are two
 * claims. Moving the create's check to after the insert reddens
 * exactly 1, the ordering case, which is the narrowest reading in
 * the file.
 *
 * The two `refuseWrite` legs are disjoint. Making it a catch-all
 * reddens 3, all three rethrow cases and neither 409, which is what
 * says the rethrow is a claim about the REASON rather than about
 * the call site. Removing the `unique-violation` branch reddens 6:
 * both 409 rows, the no-details case, the collection read-back and
 * both conflict containment rows.
 *
 * The delete legs nest, and what the first leaves GREEN is the
 * reading. Removing the guard reddens 6 — all three count rows, the
 * stop-before-the-delete reading, the two-sentences case and the
 * counts-on-the-wire case — while all three
 * leaves-the-connector-standing cases stay green, because the STORE
 * refuses the delete whatever this module decided. That is the
 * port's own claim showing up as a leg that cannot reach it. Making
 * the guard refuse EVERY delete reddens 13 and is the blunt leg
 * rather than a rule: 9 outside the positive half, three of those
 * in the address section, plus all four of what-a-delete-takes.
 * Sharing one sentence between the counted and the raced refusal
 * reddens exactly 1.
 *
 * The two masking legs split by call site and BOTH now report,
 * which is the change the positive half made. Answering a written
 * record unmasked reddens 8: the 2 controls in the mask section it
 * always reached, plus 6 across the new half, since a create is
 * compared against its own stored row and every page below is
 * compared against the rows the writes answered. Answering the LIST
 * unmasked reddens 4, all of them new, where the refusals-only file
 * recorded a ZERO and named this half as what would close it.
 *
 * That 4 is worth reading as a SET rather than as a number: the
 * leaves-a-config-alone case is NOT in it, and cannot be. It
 * compares the answered config against the STORED one, which an
 * unmasked list satisfies exactly as a masked list does over a row
 * carrying no rostered key. The four that do report are the ones
 * comparing a page against a masked write.
 *
 * The store leg reaches what no service mutation could. Having the
 * in-memory store compare NAMES alone rather than the pair reddens
 * 3 — both per-kind controls, plus one acceptance case whose create
 * and patch happen to land on one name under two kinds. A fake
 * refusing what the database does not is a second contract, and
 * this file is where it is caught.
 *
 * EIGHT LEGS ARE THE POSITIVE HALF'S OWN and five of them mutate
 * the in-memory store, because what a read ANSWERS is decided
 * there as often as here. Having the store MERGE a patched config
 * rather than replace it reddens 6 — the three replace-whole cases
 * plus three acceptance controls in the refusal half — and it is
 * the leg the cleared-secret claim rests on. Having the SERVICE
 * default an omitted config to `{}` reddens exactly 2, the rename
 * and the empty patch, which are the only two requests that name no
 * config at all. Having the store MASK on the way in reddens 10,
 * split 3 old and 7 new, and is what says the credential reaches
 * the column as submitted.
 *
 * The three read legs are narrow and disjoint. Answering the page
 * in insertion order reddens 16 and is BLUNT rather than a claim —
 * 6 of its reds sit in the refusal half, every collection read-back
 * comparing an ordered list. Ignoring the filter reddens exactly 2,
 * both list cases that narrow. Taking `total` from the rows in hand
 * reddens exactly 2, the two cases that read a window narrower than
 * its collection, which is the whole budget a paging claim needs.
 *
 * The key-set pin is TWO legs and only one is a vitest run. Adding
 * a member to the record this module answers reddens 2, exactly the
 * cases that read `Object.keys`. The other half is `check-types`:
 * planting an OPTIONAL member on `ConnectorRecord`, and separately
 * on `ConnectorPage`, answers exactly ONE diagnostic apiece, both
 * at the {@link EVERY_KEY_LISTED} line and both reading
 * `Type 'true' is not assignable to type 'never'` — `never` and not
 * `false`, the pin being an intersection of two reads.
 *
 * What no module mutation reaches, by construction: the table
 * guards read only the tables beside them and are aimed at a later
 * edit, such as an operation added with no row or a half deleted
 * whole. The planted containment control is invisible to every leg
 * for the same reason and deliberately so: it proves the SEARCH,
 * where the rethrow legs prove the SUBJECT. The roster reads in the
 * positive half are the same shape: nothing in `./service.ts` can
 * move a key into `SECRET_CONFIG_KEYS` or out of it, and that guard
 * is aimed at the edit which would.
 */

import type { ConnectorPage, ConnectorServiceStore } from './service.js';
import type { ConnectorFilter, ConnectorRecord } from './store.js';
import type { FieldError } from '../../lib/errors/index.js';
import type {
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import type { StoreWindow } from '../http/schemas.js';

import { describe, expect, it } from 'vitest';

import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors/index.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import { CONNECTOR_KINDS } from '../db/schema/values.js';
import { StoreRefusal } from '../db/store-errors.js';

import { MASKED_SECRET, SECRET_CONFIG_KEYS } from './secrets.js';
import {
  createConnector,
  deleteConnector,
  listConnectors,
  patchConnector,
} from './service.js';

/** The name the fixture's model connector is filed under. */
const MODEL_NAME = 'primary';

/** A second `llm` row, so a rename has somewhere to collide. */
const FALLBACK_NAME = 'fallback';

/** The one `notebook` row, and the only other kind planted. */
const ARCHIVE_NAME = 'archive';

/**
 * A name no fixture row carries, for the rows that have to submit
 * one without colliding with anything planted.
 *
 * Colliding would turn a 422 into a 409 on some rows and change
 * nothing on others, which is a row that reads ambiguously rather
 * than a row that fails.
 */
const FRESH_NAME = 'staging';

/** An id shaped like one and carried by no row in any case here. */
const MISSING_ID = 9999;

/** Where the fixture's model connector says its service answers. */
const MODEL_ENDPOINT = 'https://model.example.test/v1';

/**
 * What the fixture's model connector authenticates with.
 *
 * A live credential in every sense this file cares about: it is
 * stored under a `SECRET_CONFIG_KEYS` member, so every read of that
 * row answers the mask in its place, and no refusal may carry it.
 */
const MODEL_SECRET = 'model-live-credential';

/**
 * The unnarrowed filter, which is what `GET /connectors` sends when
 * no `?kind` was asked for.
 *
 * Every case here reads the whole deployment. What a filter SELECTS
 * belongs to the cases about what this module lets through; the
 * `?kind` narrowing itself belongs to `./routes.ts`, which is where
 * the parameter is held to `CONNECTOR_KINDS`.
 */
const EVERY_KIND: ConnectorFilter = {};

/**
 * A window wider than any collection planted here.
 *
 * Wide on purpose, because a REFUSAL is the subject of every case
 * in this file: a window narrow enough to be interesting would make
 * every read-back depend on where its rows happened to fall.
 */
const WIDE_WINDOW: StoreWindow = { limit: 50, offset: 0 };

/**
 * Three connectors, and the store holding them.
 *
 * Planted through {@link createConnector} rather than through the
 * store, so every case starts from writes this module accepted. A
 * planting helper reaching past the subject would leave the whole
 * file green against a `createConnector` that refused everything.
 *
 * NO DOMAIN IS PLANTED AND NONE IS NEEDED, which is the one shape
 * difference from every other resource fixture on this surface.
 * `connectors` hangs off the root.
 *
 * TWO ROWS SHARE A KIND AND TWO SHARE NOTHING, which is what the
 * conflict section needs: `fallback` is where a rename collides
 * with {@link model}, and `archive` is where a rename onto the same
 * name has to LAND, the key being per-kind. Only {@link model}
 * carries a secret, so a case reading a masked answer is reading
 * one row rather than any row.
 */
interface PlantedConnectors {
  /** The store, holding the three rows below. */
  readonly store: MemoryResearchStore;

  /** The `llm` row carrying a credential, and the one patches move. */
  readonly model: ConnectorRecord;

  /** A second `llm` row, so a rename has a pair to collide with. */
  readonly fallback: ConnectorRecord;

  /** The `notebook` row, so a kind clash has somewhere not to be. */
  readonly archive: ConnectorRecord;
}

/**
 * Plants that shape.
 *
 * @returns The store and the three rows, each as
 *   {@link createConnector} answered it — which means each config
 *   already MASKED. What the store holds is read back through the
 *   store where a case needs it.
 */
async function plantConnectors(): Promise<PlantedConnectors> {
  const store = createMemoryResearchStore();
  const model = await createConnector(store, {
    kind: 'llm',
    name: MODEL_NAME,
    config: { endpoint: MODEL_ENDPOINT, apiKey: MODEL_SECRET },
  });
  const fallback = await createConnector(store, {
    kind: 'llm',
    name: FALLBACK_NAME,
  });
  const archive = await createConnector(store, {
    kind: 'notebook',
    name: ARCHIVE_NAME,
    config: { vault: 'research' },
  });

  return { store, model, fallback, archive };
}

/**
 * Runs a call that has to be refused, and hands the refusal back.
 *
 * @param run - The call.
 * @returns The `AppError` it raised.
 * @throws When the call ANSWERED, so an operation whose refusal
 *   quietly stopped happening fails here — naming the refusal it
 *   wanted — rather than asserting over an error nobody built.
 *   Anything that is not an `AppError` is rethrown unchanged: a
 *   `StoreRefusal` reaching a caller is a bug in this module rather
 *   than one of its answers, and folding it in would report a 500
 *   as a rule working.
 */
async function refusalFrom(run: () => Promise<unknown>): Promise<AppError> {
  try {
    await run();
  } catch (err) {
    if (err instanceof AppError) {
      return err;
    }

    throw err;
  }

  throw new Error('expected a refusal, and the call answered');
}

/**
 * The two facts a caller reads off each detail of a 422.
 *
 * `message` is not among them for a detail the boundary parser
 * built, whose wording is asserted in that module's own file. The
 * masked-secret detail is this module's own and gets a reading of
 * its own in the section that raises it.
 *
 * @param details - `err.details`, absent when nothing built any.
 * @returns One `{ field, code }` per detail, in the order the
 *   details were raised.
 */
function detailsOf(
  details: readonly FieldError[] | undefined,
): { field: string; code: string }[] {
  return [...details ?? []].map((detail) => ({
    field: detail.field,
    code: detail.code ?? '',
  }));
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
 * @param planted - The store and its rows.
 * @returns Every connector's kind and name, in page order — what a
 *   refusal has to have left alone.
 */
async function pairsIn(
  planted: PlantedConnectors,
): Promise<{ kind: string; name: string }[]> {
  const page = await listConnectors(planted.store, EVERY_KIND, WIDE_WINDOW);

  return page.rows.map((row) => ({ kind: row.kind, name: row.name }));
}

/** The three planted pairs, in the order the list answers them. */
const PLANTED_PAIRS = [
  { kind: 'llm', name: FALLBACK_NAME },
  { kind: 'llm', name: MODEL_NAME },
  { kind: 'notebook', name: ARCHIVE_NAME },
];

// ---------------------------------------------------------------------------
// An id that names nothing
// ---------------------------------------------------------------------------

/** Every function this module exports. */
const OPERATIONS = [
  'createConnector',
  'deleteConnector',
  'listConnectors',
  'patchConnector',
];

/**
 * The two operations that take no address at all.
 *
 * Held against {@link OPERATIONS} and the table below rather than
 * asserted on their own, so the three lists cover the module's
 * exports exactly once between them: an operation that grew an
 * address without a row in {@link MISSING_CASES} is a named failure
 * here rather than a table quietly covering half of what it should.
 *
 * `listConnectors` reads the collection, which is met at the root
 * and cannot be misspelt. `createConnector` writes a row that has
 * no id yet. Neither can answer a 404 and neither has a 404 to
 * answer, which is the whole of what this list records.
 */
const ADDRESSLESS = ['createConnector', 'listConnectors'];

/**
 * One operation asked for a row that is not there, beside the same
 * operation asked for a row that is.
 *
 * The control is a member of the row rather than a table of its
 * own, because the two are one claim: a 404 for an id naming
 * nothing means nothing unless the identical call against a real id
 * answers.
 */
interface MissingCase {
  /** The exported function under test, and the row label. */
  readonly operation: string;

  /** The call that has to be refused. */
  readonly refuse: (planted: PlantedConnectors) => Promise<unknown>;

  /** The same call against a row that is there. */
  readonly control: (planted: PlantedConnectors) => Promise<unknown>;
}

/** Every operation that can be handed an id naming no row. */
const MISSING_CASES: readonly MissingCase[] = [
  {
    operation: 'patchConnector',
    refuse: ({ store }) => patchConnector(store, MISSING_ID, {
      name: FRESH_NAME,
    }),
    control: ({ store, fallback }) => patchConnector(store, fallback.id, {
      name: FRESH_NAME,
    }),
  },
  {
    // The control deletes the row NOTHING names. Every planted row
    // is free of subscriptions, the delete guard being the subject
    // three sections down, but a control that could be refused for
    // a second reason reads ambiguously.
    operation: 'deleteConnector',
    refuse: ({ store }) => deleteConnector(store, MISSING_ID),
    control: ({ store, archive }) => deleteConnector(store, archive.id),
  },
];

describe('an id that names nothing', () => {
  it('covers every operation this module exports', () => {
    // Paired by name rather than by count, so a fifth operation
    // added to the module without a row here — or without a place
    // in the addressless list — is this case failing rather than a
    // table that quietly covers three of five.
    const covered = [
      ...MISSING_CASES.map((row) => row.operation),
      ...ADDRESSLESS,
    ];

    expect(covered.sort()).toEqual([...OPERATIONS].sort());
    expect(new Set(covered).size).toBe(OPERATIONS.length);
  });

  for (const row of MISSING_CASES) {
    it(`answers 404 from ${row.operation}`, async () => {
      const planted = await plantConnectors();
      const refusal = await refusalFrom(() => row.refuse(planted));

      expect(refusal).toBeInstanceOf(NotFoundError);
      expect(refusal.code).toBe('NOT_FOUND');
      expect(refusal.statusCode).toBe(404);
      expect(refusal.details).toBeUndefined();
    });

    it(`answers ${row.operation} for an id that is`, async () => {
      // The positive control for the row above, varied along the
      // one axis under test: the same operation, the same body, an
      // id that resolves. A module refusing everything passes the
      // refusal case and fails this one.
      const planted = await plantConnectors();

      await expect(row.control(planted)).resolves.not.toThrow();
    });
  }

  it('answers one sentence to both operations', async () => {
    // The counterpart of the sources group's says-which-address
    // case, and the opposite reading: there is only one address
    // here, so the two refusals SHOULD share a sentence, and a
    // module answering two would be inventing a distinction a
    // caller has nothing to do with.
    const planted = await plantConnectors();
    const said = new Set<string>();

    for (const row of MISSING_CASES) {
      const refusal = await refusalFrom(() => row.refuse(planted));

      said.add(refusal.message);
    }

    expect(said.size).toBe(1);
  });

  it('leaves the collection alone when it refuses', async () => {
    // A delete refused for naming nothing must not have taken
    // something else on the way past. Read back through the list,
    // not off the refusal.
    const planted = await plantConnectors();

    await refusalFrom(() => deleteConnector(planted.store, MISSING_ID));

    expect(await pairsIn(planted)).toEqual(PLANTED_PAIRS);
  });
});

// ---------------------------------------------------------------------------
// The bodies these operations refuse
// ---------------------------------------------------------------------------

/** The two operations {@link BODY_CASES} covers. */
const BODY_OPERATIONS = ['create', 'patch'];

/** One detail, as a caller reads it off a validation refusal. */
interface ExpectedDetail {
  /** The dotted field path, or the root name the parser supplies. */
  readonly field: string;

  /** The zod issue code the detail carries through unchanged. */
  readonly code: string;
}

/** One body, and what the operation it was submitted to answers. */
interface BodyCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** Which operation is handed the body. */
  readonly operation: string;

  /** The body, unvalidated, exactly as a request would carry it. */
  readonly body: unknown;

  /** Every detail the refusal has to carry, in order. */
  readonly details: readonly ExpectedDetail[];
}

/**
 * The bodies the two operations have to refuse.
 *
 * Both carry rows of their own rather than sharing them. They run
 * through one `parseBody`, so a mutation degrading that function
 * reddens both halves equally and a table driven through one of
 * them would pin only that the two share an implementation — while
 * the two schemas genuinely differ, `kind` being declared by one
 * and refused outright by the other.
 *
 * Every row here is submitted to a SERVICE function rather than to
 * a schema, which is the point: it is what says an MCP tool in wave
 * 3 cannot be handed a body the HTTP route would have refused.
 *
 * THE KIND ROWS ANSWER `invalid_value` AND NOT `invalid_type`, on a
 * missing member as readily as on a wrong one, which is measured
 * rather than assumed: `z.enum` raises its own code for an absence,
 * where `z.string()` raises `invalid_type`. The empty create body
 * below is what carries that reading, since it omits both required
 * members and answers two different codes for them.
 *
 * THE PATCH'S KIND ROW IS THE ONE TO READ TWICE. It submits a kind
 * the tuple DOES declare and is refused all the same, as an
 * unrecognized key at `body` rather than at `kind`, because
 * `patchConnectorSchema` declares no such member. That is the
 * containment `ConnectorPatch` argues expressed as a detail, and a
 * schema that grew a `kind` member passes every other row in this
 * table.
 *
 * THE CONFIG ROWS NAME THE MEMBER AND NEVER A KEY INSIDE IT. A
 * record handed a list, a string or a null is refused AT the
 * member, which is the one fault this member can raise while its
 * value schema is `unknown` — and it is the fault `openCutoff` in
 * `src/http/validation.ts` deliberately leaves unmasked, because a
 * fault against the record AS A WHOLE names the one segment this
 * service chose.
 *
 * THE UNDECLARED-MEMBER ROWS ARE INDISTINGUISHABLE FROM EACH OTHER
 * AT THE DETAIL LEVEL, every one of them `unrecognized_keys` at
 * `body`, and what makes each worth having is the KEY it submits
 * rather than the detail it expects. `connectors` carries no
 * pipeline-owned column and no `domain_id`, so the keys worth
 * refusing are the ones a caller might reasonably think it had: the
 * id the write stamps, a domain this table does not have, and the
 * kind the patch will not take.
 */
const BODY_CASES: readonly BodyCase[] = [
  {
    label: 'a create body that is not an object',
    operation: 'create',
    body: null,
    details: [{ field: 'body', code: 'invalid_type' }],
  },
  {
    label: 'a create body carrying neither required member',
    operation: 'create',
    body: {},
    details: [
      { field: 'kind', code: 'invalid_value' },
      { field: 'name', code: 'invalid_type' },
    ],
  },
  {
    label: 'a create body fronting a family nobody declared',
    operation: 'create',
    body: { kind: 'ftp', name: FRESH_NAME },
    details: [{ field: 'kind', code: 'invalid_value' }],
  },
  {
    label: 'a create body clearing the family with null',
    operation: 'create',
    body: { kind: null, name: FRESH_NAME },
    details: [{ field: 'kind', code: 'invalid_value' }],
  },
  {
    label: 'a create body named the empty string',
    operation: 'create',
    body: { kind: 'llm', name: '' },
    details: [{ field: 'name', code: 'too_small' }],
  },
  {
    label: 'a create body leaving the name off',
    operation: 'create',
    body: { kind: 'llm' },
    details: [{ field: 'name', code: 'invalid_type' }],
  },
  {
    label: 'a create body configured as a list',
    operation: 'create',
    body: { kind: 'llm', name: FRESH_NAME, config: [] },
    details: [{ field: 'config', code: 'invalid_type' }],
  },
  {
    label: 'a create body configured as a string',
    operation: 'create',
    body: { kind: 'llm', name: FRESH_NAME, config: MODEL_ENDPOINT },
    details: [{ field: 'config', code: 'invalid_type' }],
  },
  {
    label: 'a create body stamping its own id',
    operation: 'create',
    body: { kind: 'llm', name: FRESH_NAME, id: 7 },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a create body naming a domain to belong to',
    operation: 'create',
    body: { kind: 'llm', name: FRESH_NAME, domainId: 1 },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch body that is not an object',
    operation: 'patch',
    body: 7,
    details: [{ field: 'body', code: 'invalid_type' }],
  },
  {
    label: 'a patch repointing the row at another family',
    operation: 'patch',
    body: { kind: 'search' },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch renaming the row to the empty string',
    operation: 'patch',
    body: { name: '' },
    details: [{ field: 'name', code: 'too_small' }],
  },
  {
    label: 'a patch clearing the name with null',
    operation: 'patch',
    body: { name: null },
    details: [{ field: 'name', code: 'invalid_type' }],
  },
  {
    label: 'a patch configured as a list',
    operation: 'patch',
    body: { config: [] },
    details: [{ field: 'config', code: 'invalid_type' }],
  },
  {
    label: 'a patch clearing its config with null',
    operation: 'patch',
    body: { config: null },
    details: [{ field: 'config', code: 'invalid_type' }],
  },
  {
    label: 'a patch restamping the id it was addressed by',
    operation: 'patch',
    body: { id: 7 },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch moving the row into a domain',
    operation: 'patch',
    body: { domainId: 1 },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
];

/**
 * Submits one body to the operation its row names.
 *
 * @param planted - The store and its rows.
 * @param row - The row.
 * @returns Whatever the operation answered, which for every row in
 *   {@link BODY_CASES} is a throw.
 */
async function submitBody(
  planted: PlantedConnectors,
  row: BodyCase,
): Promise<unknown> {
  return row.operation === 'create'
    ? createConnector(planted.store, row.body)
    : patchConnector(planted.store, planted.model.id, row.body);
}

/**
 * @param body - A row's body, of any shape at all.
 * @param key - The member to look for.
 * @returns Whether the body is an object carrying that key. Read
 *   off the row rather than off its label, so a guard below cannot
 *   be satisfied by prose.
 */
function bodyCarries(body: unknown, key: string): boolean {
  return typeof body === 'object'
    && body !== null
    && Object.hasOwn(body, key);
}

/**
 * @param body - A row's body.
 * @param key - The member to read.
 * @returns What that member holds, or `undefined` when the body is
 *   not an object or does not carry it.
 */
function bodyMember(body: unknown, key: string): unknown {
  return bodyCarries(body, key)
    ? (body as Record<string, unknown>)[key]
    : undefined;
}

describe('the bodies these operations refuse', () => {
  it('carries rows for both operations that take one', () => {
    expect([...new Set(BODY_CASES.map((row) => row.operation))].sort())
      .toEqual([...BODY_OPERATIONS].sort());
  });

  it('labels every row distinctly', () => {
    const labels = BODY_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('names a distinct reason for each class of refusal', () => {
    const codes = BODY_CASES.flatMap(
      (row) => row.details.map((detail) => detail.code),
    );

    expect([...new Set(codes)].sort()).toEqual([
      'invalid_type', 'invalid_value', 'too_small', 'unrecognized_keys',
    ]);
  });

  it('refuses a kind outside the tuple on the create', () => {
    // Read off the BODY rather than the label, and against
    // `CONNECTOR_KINDS` rather than against the literal `ftp`, so a
    // member ADDED to that tuple turns a refusal row into this case
    // failing rather than into a row nobody notices is now wrong.
    // The create is the only half that can reach the enum, `kind`
    // being undeclared on the patch.
    const kinds: readonly string[] = CONNECTOR_KINDS;
    const outside = BODY_CASES.filter((row) => {
      const kind = bodyMember(row.body, 'kind');

      return typeof kind === 'string' && !kinds.includes(kind);
    });

    expect([...new Set(outside.map((row) => row.operation))])
      .toEqual(['create']);
    expect([...new Set(outside.flatMap(
      (row) => row.details.map((detail) => detail.code),
    ))]).toEqual(['invalid_value']);
  });

  it('refuses a kind the tuple declares on the patch', () => {
    // The other direction, and the one the enum cannot give: the
    // patch half's one kind row submits a MEMBER of the tuple and
    // is refused all the same, at `body` rather than at `kind`,
    // because the schema declares no such member. A patch schema
    // that grew one passes every other row in this table and fails
    // here. The membership is read against the runtime tuple for
    // the same reason the case above is: a member removed from
    // `CONNECTOR_KINDS` turns this row into a kind nobody declares,
    // which is the OTHER claim, and this case says so.
    const kinds: readonly string[] = CONNECTOR_KINDS;
    const inside = BODY_CASES.filter(
      (row) => row.operation === 'patch' && bodyCarries(row.body, 'kind'),
    );

    expect(inside.length).toBe(1);
    expect(kinds).toContain(bodyMember(inside[0]?.body, 'kind'));
    expect(inside.flatMap((row) => row.details)).toEqual([
      { field: 'body', code: 'unrecognized_keys' },
    ]);
  });

  it('refuses an empty name from both operations', () => {
    const empty = BODY_CASES.filter(
      (row) => bodyMember(row.body, 'name') === '',
    );

    expect(empty.map((row) => row.operation).sort())
      .toEqual([...BODY_OPERATIONS].sort());
    expect(empty.every((row) => row.details.length === 1)).toBe(true);
    expect([...new Set(empty.flatMap(
      (row) => row.details.map((detail) => detail.code),
    ))]).toEqual(['too_small']);
  });

  it('names the config member rather than a key inside it', () => {
    // The openness read from the refusal side. A record handed a
    // list is refused AT the member, which is the segment this
    // service chose; a detail naming `config.*` here would mean a
    // shape fault had been reported as though it were one of the
    // operator's keys. Both operations carry rows, so a schema
    // narrowing one of the two is a named failure.
    const documents = BODY_CASES.filter(
      (row) => row.details.some((detail) => detail.field === 'config'),
    );

    expect(documents.map((row) => row.operation).sort())
      .toEqual([...BODY_OPERATIONS, ...BODY_OPERATIONS].sort());
    expect([...new Set(documents.flatMap(
      (row) => row.details.map((detail) => detail.code),
    ))]).toEqual(['invalid_type']);
  });

  for (const row of BODY_CASES) {
    it(`refuses ${row.label}`, async () => {
      const planted = await plantConnectors();
      const refusal = await refusalFrom(() => submitBody(planted, row));

      expect(refusal).toBeInstanceOf(ValidationError);
      expect(refusal.code).toBe('VALIDATION_ERROR');
      expect(refusal.statusCode).toBe(422);
      expect(detailsOf(refusal.details as FieldError[] | undefined))
        .toEqual([...row.details]);
    });
  }

  it('accepts a body of each declared shape', async () => {
    // The positive control for the whole table, one call per
    // operation, naming every member each schema declares: a module
    // refusing every body passes all eighteen rows above and fails
    // this.
    const { store, model } = await plantConnectors();
    const created = await createConnector(store, {
      kind: 'search',
      name: FRESH_NAME,
      config: { endpoint: MODEL_ENDPOINT },
    });
    const patched = await patchConnector(store, model.id, {
      name: FRESH_NAME,
      config: { endpoint: MODEL_ENDPOINT },
    });

    expect(created.name).toBe(FRESH_NAME);
    expect(patched.name).toBe(FRESH_NAME);
  });

  it('accepts every kind the tuple declares', async () => {
    // The WIDENING control for the kind rows, and the one a single
    // accepted kind cannot stand in for: a schema spelling three of
    // the four literals by hand refuses the fourth and is green
    // against every refusal row above. Driven over
    // `CONNECTOR_KINDS` rather than over four literals, so a member
    // added to that tuple is covered here the day it lands. Each
    // create takes a name of its own, the key being per-kind only
    // for names that repeat.
    const { store } = await plantConnectors();
    const landed: string[] = [];

    for (const kind of CONNECTOR_KINDS) {
      const created = await createConnector(store, {
        kind,
        name: `${FRESH_NAME}-${kind}`,
      });

      landed.push(created.kind);
    }

    expect(landed).toEqual([...CONNECTOR_KINDS]);
  });

  it('accepts a name of one character from both', async () => {
    // The boundary control for the empty-name rows, a single step
    // from the value they refuse. A schema that had stopped
    // checking the name at all passes those rows' neighbours and
    // fails them; a schema refusing every name passes them and
    // fails this. Neither reading is available from one of the two.
    const { store, model } = await plantConnectors();
    const created = await createConnector(store, {
      kind: 'export_target',
      name: 'x',
    });
    const patched = await patchConnector(store, model.id, { name: 'y' });

    expect(created.name).toBe('x');
    expect(patched.name).toBe('y');
  });

  it('accepts a config whose keys are the operator', async () => {
    // The open-record control, and the one reading that says
    // `config` is a record this service takes no view of rather
    // than an object it has not narrowed yet. The keys carry a
    // space, a dot and a leading digit, and the values nest a list
    // inside an object — none of which any declared schema on this
    // surface would accept — and both come back stored whole.
    //
    // It is also the whole of the evidence available for the
    // `openPaths` declaration beside it: while the value schema is
    // `unknown`, no zod issue is reachable strictly below the
    // prefix, so there is no `*` from the parser to assert and the
    // acceptance is what stands in for one. The masked-secret
    // refusal below is what reaches under the prefix instead.
    const arrangement = {
      'model id': { name: 'a-model', retries: [1, 2] },
      '2ndChoice': null,
      'header.map': { accept: 'application/json' },
    };
    const { store, model } = await plantConnectors();
    const created = await createConnector(store, {
      kind: 'search',
      name: FRESH_NAME,
      config: arrangement,
    });
    const patched = await patchConnector(store, model.id, {
      config: arrangement,
    });

    expect(created.config).toEqual(arrangement);
    expect(patched.config).toEqual(arrangement);
  });

  it('refuses a malformed patch before it reads the id', async () => {
    // The ordering: the shape of a body is a fact about the request
    // alone, so the same body answers 422 whether or not the row
    // exists. A service reading the row first answers 404 here and
    // is green against every patch row above.
    const { store } = await plantConnectors();
    const refusal = await refusalFrom(
      () => patchConnector(store, MISSING_ID, { name: '' }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
  });

  it('refuses a malformed create before it meets the key', async () => {
    // The same ordering on the other write, where there is no
    // address to be wrong and the fact about the rows is the
    // conflict instead. The pair below is one the deployment
    // already carries, so a service parsing after writing answers
    // 409 and passes every create row above.
    const { store } = await plantConnectors();
    const refusal = await refusalFrom(() => createConnector(store, {
      kind: 'llm',
      name: MODEL_NAME,
      id: 7,
    }));

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// A kind and name pair the deployment already carries
// ---------------------------------------------------------------------------

describe('a kind and name pair the deployment carries', () => {
  it('answers 409 to a create over that pair', async () => {
    const { store } = await plantConnectors();
    const refusal = await refusalFrom(() => createConnector(store, {
      kind: 'llm',
      name: MODEL_NAME,
    }));

    expect(refusal).toBeInstanceOf(ConflictError);
    expect(refusal.code).toBe('CONFLICT');
    expect(refusal.statusCode).toBe(409);
  });

  it('answers 409 to a rename onto that pair', async () => {
    // The other write reaches the same key, `name` being patchable.
    // The subject is the OTHER `llm` row, so what collides is the
    // resulting pair rather than the row's own.
    const { store, fallback } = await plantConnectors();
    const refusal = await refusalFrom(
      () => patchConnector(store, fallback.id, { name: MODEL_NAME }),
    );

    expect(refusal).toBeInstanceOf(ConflictError);
    expect(refusal.statusCode).toBe(409);
  });

  it('carries no details on either refusal', async () => {
    // A conflict here has nothing to count and says so by carrying
    // no `details` at all, which is what the delete's 409 two
    // sections down does carry. Read as the serialised key SET
    // rather than as an undefined, so a refusal that grew an empty
    // details object is a failure.
    const planted = await plantConnectors();
    const created = await refusalFrom(() => createConnector(planted.store, {
      kind: 'llm',
      name: MODEL_NAME,
    }));
    const renamed = await refusalFrom(() => patchConnector(
      planted.store,
      planted.fallback.id,
      { name: MODEL_NAME },
    ));

    const bare = ['code', 'message'];

    expect(Object.keys(created.toJSON()).sort()).toEqual(bare);
    expect(Object.keys(renamed.toJSON()).sort()).toEqual(bare);
  });

  it('takes the same name under another kind', async () => {
    // The key is per-kind, which is the first of three controls no
    // one of the others is reachable from. A service comparing
    // NAMES alone passes both 409 rows above and fails this.
    const { store } = await plantConnectors();
    const created = await createConnector(store, {
      kind: 'search',
      name: MODEL_NAME,
    });

    expect(created.name).toBe(MODEL_NAME);
    expect(created.kind).toBe('search');
  });

  it('takes a rename onto a name another kind holds', async () => {
    // The same reading on the other write: `archive` is a
    // `notebook`, so taking the `llm` row's name collides with
    // nothing.
    const { store, archive } = await plantConnectors();
    const patched = await patchConnector(store, archive.id, {
      name: MODEL_NAME,
    });

    expect(patched.name).toBe(MODEL_NAME);
    expect(patched.kind).toBe('notebook');
  });

  it('takes a rename of a row to its own name', async () => {
    // A row is not in conflict with itself, which a service reading
    // the resulting pair without checking whose row it found would
    // get wrong — and which no refusal row above can report.
    const { store, model } = await plantConnectors();
    const patched = await patchConnector(store, model.id, {
      name: MODEL_NAME,
    });

    expect(patched.name).toBe(MODEL_NAME);
    expect(patched.id).toBe(model.id);
  });

  it('leaves the collection alone when it refuses', async () => {
    // Read back through the list, which is what says neither
    // refused write LANDED. A store upserting on the pair would
    // satisfy every assertion above and answer a changed collection
    // here.
    const planted = await plantConnectors();

    await refusalFrom(() => createConnector(planted.store, {
      kind: 'llm',
      name: MODEL_NAME,
    }));
    await refusalFrom(() => patchConnector(
      planted.store,
      planted.fallback.id,
      { name: MODEL_NAME },
    ));

    expect(await pairsIn(planted)).toEqual(PLANTED_PAIRS);
  });
});

// ---------------------------------------------------------------------------
// A config that submits the mask
// ---------------------------------------------------------------------------

/**
 * A key `SECRET_CONFIG_KEYS` does not roster.
 *
 * What it is FOR is the row that submits the mask under it: the
 * walk reports the literal wherever it sits, because a value that
 * reads as a sentinel is never one somebody meant to store and
 * because the key it was copied onto need not be the key it was
 * copied from.
 */
const UNROSTERED_KEY = 'modelSlug';

/** What a detail this module builds itself says. */
const MASK_SENTENCE
  = 'Carries the value a read answers in place of a secret.';

/** The code every such detail carries. */
const MASK_CODE = 'masked_secret';

/** One config submitting the mask, and where the refusal says it sat. */
interface MaskCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** Which operation is handed the body. */
  readonly operation: string;

  /** The config, exactly as a request would carry it. */
  readonly config: Readonly<Record<string, unknown>>;

  /** The field of each detail, in the order they are raised. */
  readonly fields: readonly string[];
}

/**
 * Every shape a submitted mask arrives in.
 *
 * BOTH WRITES CARRY ROWS, since the two parses are two call sites
 * and a table driven through one would pin nothing about the other.
 *
 * THE DEPTHS ARE THE POINT OF THE FIELD COLUMN. `config.*` says the
 * literal sat at a member of the config and `config.*.*` says it
 * sat inside one, which are different things for a caller to go and
 * look at — and the wildcards say that no key the operator chose
 * reaches the wire. The literal `*` is spelled here rather than
 * imported: the constant behind it is private to the module under
 * test, so a case reading it would agree with itself however it
 * were respelt.
 *
 * A LIST INDEX IS A SEGMENT LIKE ANY OTHER, and it is masked like
 * one. `src/http/validation.ts` spells an array-element fault
 * `terms.1.pattern`, so an unmasked walk would put a position on
 * the wire; that is structural rather than submitted, but the rule
 * below the prefix is one rule and this file is where it is read.
 *
 * TWO AT ONCE IS ITS OWN ROW because the COUNT is what survives the
 * masking: a caller that copied two masked members back is told
 * there were two, by two details that are otherwise identical.
 */
const MASK_CASES: readonly MaskCase[] = [
  {
    label: 'a create masking under a rostered key',
    operation: 'create',
    config: { endpoint: MODEL_ENDPOINT, apiKey: MASKED_SECRET },
    fields: ['config.*'],
  },
  {
    label: 'a create masking under a key nobody rostered',
    operation: 'create',
    config: { [UNROSTERED_KEY]: MASKED_SECRET },
    fields: ['config.*'],
  },
  {
    label: 'a create masking one level down',
    operation: 'create',
    config: { provider: { token: MASKED_SECRET } },
    fields: ['config.*.*'],
  },
  {
    label: 'a create masking inside a list',
    operation: 'create',
    config: { tokens: [MASKED_SECRET] },
    fields: ['config.*.*'],
  },
  {
    label: 'a patch masking under a rostered key',
    operation: 'patch',
    config: { apiKey: MASKED_SECRET },
    fields: ['config.*'],
  },
  {
    label: 'a patch masking two members at once',
    operation: 'patch',
    config: { apiKey: MASKED_SECRET, clientSecret: MASKED_SECRET },
    fields: ['config.*', 'config.*'],
  },
  {
    label: 'a patch masking beside a member it kept',
    operation: 'patch',
    config: {
      endpoint: MODEL_ENDPOINT,
      provider: { credentials: MASKED_SECRET },
    },
    fields: ['config.*.*'],
  },
  {
    label: 'a patch masking two levels down through a list',
    operation: 'patch',
    config: { layers: [{ password: MASKED_SECRET }] },
    fields: ['config.*.*.*'],
  },
];

/**
 * Submits one config to the operation its row names.
 *
 * @param planted - The store and its rows.
 * @param row - The row.
 * @returns Whatever the operation answered, which for every row in
 *   {@link MASK_CASES} is a throw.
 */
async function submitConfig(
  planted: PlantedConnectors,
  row: MaskCase,
): Promise<unknown> {
  return row.operation === 'create'
    ? createConnector(planted.store, {
      kind: 'search',
      name: FRESH_NAME,
      config: row.config,
    })
    : patchConnector(planted.store, planted.model.id, {
      config: row.config,
    });
}

/**
 * @param value - Anything a config can hold.
 * @returns How many times {@link MASKED_SECRET} occurs as a VALUE
 *   in it, at any depth. Read off the row's own config rather than
 *   off its label, so a row whose literal was edited away is a
 *   named failure here rather than a case asserting a refusal it
 *   can no longer earn.
 */
function masksIn(value: unknown): number {
  if (value === MASKED_SECRET) {
    return 1;
  }

  if (Array.isArray(value)) {
    return value.reduce<number>(
      (total, member) => total + masksIn(member),
      0,
    );
  }

  if (typeof value !== 'object' || value === null) {
    return 0;
  }

  return Object.values(value)
    .reduce<number>((total, member) => total + masksIn(member), 0);
}

describe('a config that submits the mask', () => {
  it('carries rows for both operations that take one', () => {
    expect([...new Set(MASK_CASES.map((row) => row.operation))].sort())
      .toEqual([...BODY_OPERATIONS].sort());
  });

  it('labels every row distinctly', () => {
    const labels = MASK_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('submits one literal per detail it expects', () => {
    // The rows and their expectations read against each other. A
    // row whose config lost the literal would go on passing while
    // asserting nothing, since a config with no mask in it is
    // simply accepted.
    expect(MASK_CASES.map((row) => masksIn(row.config)))
      .toEqual(MASK_CASES.map((row) => row.fields.length));
  });

  it('names the member and never a key inside it', () => {
    // The masking rule read off the table: every field starts at
    // the one segment this service chose, and every segment after
    // it is the wildcard. A row expecting an operator's key would
    // be a row asserting the leak.
    const segments = MASK_CASES.flatMap(
      (row) => row.fields.map((field) => field.split('.')),
    );

    expect([...new Set(segments.map((parts) => parts[0]))])
      .toEqual(['config']);
    expect([...new Set(segments.flatMap((parts) => parts.slice(1)))])
      .toEqual(['*']);
  });

  it('keeps the depth a caller would go and look at', () => {
    // The masking is one for one rather than a single `*`, so the
    // LENGTH of a path survives it. A module folding every path to
    // `config.*` passes the case above and fails this.
    const depths = new Set(
      MASK_CASES.flatMap((row) => row.fields.map(
        (field) => field.split('.').length,
      )),
    );

    expect([...depths].sort()).toEqual([2, 3, 4]);
  });

  for (const row of MASK_CASES) {
    it(`refuses ${row.label}`, async () => {
      const planted = await plantConnectors();
      const refusal = await refusalFrom(() => submitConfig(planted, row));

      expect(refusal).toBeInstanceOf(ValidationError);
      expect(refusal.code).toBe('VALIDATION_ERROR');
      expect(refusal.statusCode).toBe(422);
      expect(detailsOf(refusal.details as FieldError[] | undefined))
        .toEqual(row.fields.map((field) => ({
          field,
          code: MASK_CODE,
        })));
    });
  }

  it('pins the sentence a masked detail carries', async () => {
    // The one detail message on this surface that is not the
    // boundary parser's, so nothing else asserts its wording — and
    // the code beside it, which is this module's own and the member
    // a client would branch on.
    const planted = await plantConnectors();
    const refusal = await refusalFrom(() => patchConnector(
      planted.store,
      planted.model.id,
      { config: { apiKey: MASKED_SECRET } },
    ));

    expect(refusal.message).toBe('Validation failed');
    expect(refusal.details).toEqual([{
      field: 'config.*',
      message: MASK_SENTENCE,
      code: MASK_CODE,
    }]);
  });

  it('stores a real secret and answers the mask', async () => {
    // The control the whole table rests on: a config carrying a
    // credential under the SAME rostered key is accepted, stored
    // verbatim, and answered masked. A module refusing every config
    // under a rostered key passes all eight rows above and fails
    // this, and a module masking nothing fails the second half.
    const { store, model } = await plantConnectors();
    const stored = await store.findConnectorById(model.id);

    expect(stored?.config).toEqual({
      endpoint: MODEL_ENDPOINT,
      apiKey: MODEL_SECRET,
    });
    expect(model.config).toEqual({
      endpoint: MODEL_ENDPOINT,
      apiKey: MASKED_SECRET,
    });
  });

  it('accepts a value that merely contains the mask', async () => {
    // A single step from the boundary the refusal turns on, which
    // is an EQUALITY. A module testing for a substring refuses this
    // and is green against every row above; the value below is a
    // plausible one, a deployment naming its own key after the
    // sentinel it saw in a response.
    const { store, model } = await plantConnectors();
    const near = `${MASKED_SECRET}-2`;
    const patched = await patchConnector(store, model.id, {
      config: { apiKey: near },
    });
    const stored = await store.findConnectorById(model.id);

    expect(stored?.config).toEqual({ apiKey: near });
    expect(patched.config).toEqual({ apiKey: MASKED_SECRET });
  });

  it('accepts the mask as a key rather than a value', async () => {
    // The other step from the same boundary: the walk reads VALUES,
    // so the literal sitting where a key goes is a config nobody
    // meant to send but not one this rule is about. A module
    // scanning the serialised body for the literal refuses it.
    const { store, model } = await plantConnectors();
    const patched = await patchConnector(store, model.id, {
      config: { [MASKED_SECRET]: MODEL_ENDPOINT },
    });

    expect(patched.config).toEqual({ [MASKED_SECRET]: MODEL_ENDPOINT });
  });

  it('takes a patch that names no config at all', async () => {
    // The refusal is not unconditional: a body with no config has
    // nothing to walk, and a module refusing one would refuse every
    // rename on the surface.
    const { store, model } = await plantConnectors();
    const patched = await patchConnector(store, model.id, {
      name: FRESH_NAME,
    });

    expect(patched.name).toBe(FRESH_NAME);
  });

  it('refuses the mask before it meets the key', async () => {
    // The ordering, and the one reading that says the walk happens
    // before the write is issued rather than after it comes back:
    // the pair below is one the deployment already carries, so a
    // module writing first answers 409.
    const { store } = await plantConnectors();
    const refusal = await refusalFrom(() => createConnector(store, {
      kind: 'llm',
      name: MODEL_NAME,
      config: { apiKey: MASKED_SECRET },
    }));

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
  });

  it('writes nothing when it refuses the mask', async () => {
    // Read back off the STORE rather than off the refusal: a module
    // that stored the literal and then threw would leave the same
    // answer everywhere else in this section.
    const planted = await plantConnectors();

    await refusalFrom(() => patchConnector(
      planted.store,
      planted.model.id,
      { config: { apiKey: MASKED_SECRET } },
    ));

    const stored = await planted.store.findConnectorById(planted.model.id);

    expect(stored?.config).toEqual({
      endpoint: MODEL_ENDPOINT,
      apiKey: MODEL_SECRET,
    });
    expect(await pairsIn(planted)).toEqual(PLANTED_PAIRS);
  });
});

// ---------------------------------------------------------------------------
// What a delete refuses
// ---------------------------------------------------------------------------

/**
 * Every table `ConnectorDependentCounts` counts, spelled out.
 *
 * ONE MEMBER, WHICH IS THE WHOLE OF THE REFUSING SET RATHER THAN
 * the subset `SourceDependentCounts` describes. `./store.ts`
 * re-derives that from the generated SQL: exactly one foreign key
 * points at `connectors.id`, so a guard that passes is refused by
 * nothing except a race.
 *
 * Written out once so an empty roster cannot make the sweep below
 * vacuously green, and held against the counts each row declares —
 * which `check-types` already holds to the record, so a second
 * counted table reddens there before it reaches this line. With one
 * member there is no plant-each-alone reading to take, and saying
 * so is more honest than a sweep that cannot fail.
 */
const DEPENDENT_TABLES = ['exportSubscriptions'];

/** One state a connector can be in that refuses its own delete. */
interface DependentCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** How many subscriptions the seam plants against the row. */
  readonly subscriptions: number;

  /** The count the refusal has to carry. */
  readonly counts: Readonly<Record<string, number>>;
}

/**
 * Every state the guard refuses.
 *
 * THREE COUNTS RATHER THAN ONE, because the refusal carries the
 * NUMBER and not a boolean: a guard answering a constant would
 * satisfy a single row and fails these three, and the counts differ
 * from one another and from every other number in the file.
 */
const DEPENDENT_CASES: readonly DependentCase[] = [
  {
    label: 'one subscription',
    subscriptions: 1,
    counts: { exportSubscriptions: 1 },
  },
  {
    label: 'two subscriptions',
    subscriptions: 2,
    counts: { exportSubscriptions: 2 },
  },
  {
    label: 'seven subscriptions',
    subscriptions: 7,
    counts: { exportSubscriptions: 7 },
  },
];

/**
 * Wraps a store so that every method reached through it is
 * recorded.
 *
 * A refusal claim has two halves — what was answered, and where the
 * operation stopped — and only the second one says a guard refused
 * BEFORE the destructive call rather than after it. Nothing else
 * in this file can see the difference: the in-memory dataset would
 * look identical if the row had been deleted and the refusal thrown
 * afterwards.
 *
 * @param store - The store to wrap.
 * @param calls - The array every reached method name is pushed
 *   onto, in call order.
 * @returns A store answering exactly as the wrapped one does.
 */
function recordingStore(
  store: MemoryResearchStore,
  calls: string[],
): MemoryResearchStore {
  return new Proxy(store, {
    get(target, key): unknown {
      const member = Reflect.get(target, key) as unknown;

      if (typeof member !== 'function') {
        return member;
      }

      const method = member as (...args: unknown[]) => unknown;

      return (...args: unknown[]): unknown => {
        calls.push(String(key));

        return Reflect.apply(method, target, args);
      };
    },
  });
}

/**
 * A store whose delete is refused by the one key that can refuse
 * it.
 *
 * The lost race, reconstructed rather than stubbed at the service:
 * what the write meets is a `StoreRefusal` of the reason and
 * constraint `ConnectorStore.deleteConnector` declares. No seam can
 * produce the state for real, since planting a subscription count
 * makes the GUARD refuse first, which is the whole difference
 * between the two refusals below.
 *
 * @param store - The store to answer everything else from.
 * @returns A store refusing every delete that way.
 */
function racingStore(store: MemoryResearchStore): ConnectorServiceStore {
  return {
    ...store,
    deleteConnector: async () => {
      throw new StoreRefusal({
        reason: 'foreign-key-violation',
        constraint: 'export_subscriptions_connector_id_connectors_id_fk',
      });
    },
  };
}

describe('what a delete refuses', () => {
  it('labels every row distinctly', () => {
    const labels = DEPENDENT_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('counts every table the port declares', () => {
    // The roster and the rows read against each other. A row
    // declaring a count under another name would leave the counted
    // table unasserted while every case below still passed.
    expect(DEPENDENT_TABLES).toEqual(['exportSubscriptions']);

    for (const row of DEPENDENT_CASES) {
      expect(Object.keys(row.counts).sort())
        .toEqual([...DEPENDENT_TABLES].sort());
    }
  });

  it('carries a distinct count on every row', () => {
    // What makes three rows worth having over one: the refusal
    // reports the number it read, so a guard answering a constant
    // is a failure naming the row it got wrong.
    const counted = DEPENDENT_CASES.map((row) => row.subscriptions);

    expect(new Set(counted).size).toBe(DEPENDENT_CASES.length);
    expect(DEPENDENT_CASES.map((row) => row.counts.exportSubscriptions))
      .toEqual(counted);
  });

  for (const row of DEPENDENT_CASES) {
    it(`answers 409 to a connector with ${row.label}`, async () => {
      const planted = await plantConnectors();

      planted.store.setConnectorSubscriptions(
        planted.model.id,
        row.subscriptions,
      );

      const refusal = await refusalFrom(
        () => deleteConnector(planted.store, planted.model.id),
      );

      expect(refusal).toBeInstanceOf(ConflictError);
      expect(refusal.code).toBe('CONFLICT');
      expect(refusal.statusCode).toBe(409);
      expect(refusal.details).toEqual(row.counts);
    });

    it(`leaves the connector standing over ${row.label}`, async () => {
      // Read back through the list rather than off the refusal: a
      // guard that answered 409 after deleting would satisfy every
      // assertion above.
      const planted = await plantConnectors();

      planted.store.setConnectorSubscriptions(
        planted.model.id,
        row.subscriptions,
      );

      await refusalFrom(
        () => deleteConnector(planted.store, planted.model.id),
      );

      expect(await pairsIn(planted)).toEqual(PLANTED_PAIRS);
    });
  }

  it('deletes a connector nothing names at all', async () => {
    // The control for every row above, and the one they cannot
    // supply: a guard refusing every delete passes all three and
    // fails this. The count here is a counted zero rather than
    // absent, which is what the planting seam makes reachable.
    const { store, model } = await plantConnectors();

    store.setConnectorSubscriptions(model.id, 0);

    await expect(deleteConnector(store, model.id)).resolves.toBeUndefined();
  });

  it('stops before the delete rather than after it', async () => {
    // Where the operation stopped, which no reading of the stored
    // rows can answer on its own.
    const planted = await plantConnectors();

    planted.store.setConnectorSubscriptions(planted.model.id, 1);

    const guarded: string[] = [];

    await refusalFrom(() => deleteConnector(
      recordingStore(planted.store, guarded),
      planted.model.id,
    ));

    expect(guarded).toContain('countConnectorDependents');
    expect(guarded).not.toContain('deleteConnector');
  });

  it('reaches the delete when the guard passes', async () => {
    // The control the case above needs: a wrapper recording
    // nothing would satisfy its `not.toContain` too.
    const planted = await plantConnectors();
    const reached: string[] = [];

    await deleteConnector(
      recordingStore(planted.store, reached),
      planted.archive.id,
    );

    expect(reached).toContain('countConnectorDependents');
    expect(reached).toContain('deleteConnector');
  });

  it('answers 409 to a subscription written in between', async () => {
    // The race, which is the only state that reaches the store's
    // own refusal here: the counted set is complete, so a guard
    // that passed was refused by nothing that existed when it ran.
    const { store, archive } = await plantConnectors();
    const refusal = await refusalFrom(
      () => deleteConnector(racingStore(store), archive.id),
    );

    expect(refusal).toBeInstanceOf(ConflictError);
    expect(refusal.statusCode).toBe(409);

    // No count, because none was read for it: the sentence is all
    // there is, and inventing a zero would say the opposite of what
    // happened.
    expect(refusal.details).toBeUndefined();
    expect(refusal.cause).toBeInstanceOf(StoreRefusal);
  });

  it('says which of the two refusals it met', async () => {
    // The distinction rather than either wording. The counted
    // sentence quotes a number this one is reached with at zero,
    // and the two want different next acts — retry, or go and look
    // at `/exports` — so a module answering one sentence to both
    // would tell an operator to go and cancel deliveries that are
    // not there.
    const planted = await plantConnectors();

    planted.store.setConnectorSubscriptions(planted.model.id, 1);

    const counted = await refusalFrom(
      () => deleteConnector(planted.store, planted.model.id),
    );
    const raced = await refusalFrom(
      () => deleteConnector(racingStore(planted.store), planted.archive.id),
    );

    expect(counted.statusCode).toBe(raced.statusCode);
    expect(counted.message).not.toBe(raced.message);
    expect(Object.keys(counted.toJSON()).sort())
      .toEqual(['code', 'details', 'message']);
    expect(Object.keys(raced.toJSON()).sort()).toEqual(['code', 'message']);
  });

  it('rethrows a delete refusal of another reason', async () => {
    // Only a foreign-key refusal is a conflict here. Anything else
    // out of that write is a store doing something its port does
    // not describe, and answers 500 rather than a plausible status
    // no rule authorised.
    const { store, archive } = await plantConnectors();
    const misbehaving: ConnectorServiceStore = {
      ...store,
      deleteConnector: async () => {
        throw new StoreRefusal({
          reason: 'check-violation',
          constraint: 'a constraint no delete can reach',
        });
      },
    };

    await expect(deleteConnector(misbehaving, archive.id))
      .rejects.toBeInstanceOf(StoreRefusal);
  });
});

// ---------------------------------------------------------------------------
// What only a drifted deployment can produce
// ---------------------------------------------------------------------------

describe('what only a drifted deployment can produce', () => {
  it('rethrows the CHECK this port does declare', async () => {
    // The one place this module reads a refusal differently from a
    // sibling that translates the same reason.
    // `connectors_kind_check` is a rule `ConnectorStore` genuinely
    // declares on the insert, and it is rethrown all the same,
    // because `createConnectorSchema` holds `kind` to the tuple the
    // CHECK is generated from. Meeting one anyway means the two
    // have drifted apart, which is a deployment fault no caller can
    // act on; a translation answering 422 would tell an operator to
    // fix a request that was correct.
    const { store } = await plantConnectors();
    const misbehaving: ConnectorServiceStore = {
      ...store,
      insertConnector: async () => {
        throw new StoreRefusal({
          reason: 'check-violation',
          constraint: 'connectors_kind_check',
        });
      },
    };

    await expect(createConnector(misbehaving, {
      kind: 'llm',
      name: FRESH_NAME,
    })).rejects.toBeInstanceOf(StoreRefusal);
  });

  it('rethrows the same CHECK out of a patch', async () => {
    // The other write goes through the same translator, and a
    // module that had grown a catch-all on one call site alone
    // passes the case above and fails this. No real update can
    // reach that CHECK — `kind` is not patchable — which is what
    // makes this a claim about the REASON rather than about the
    // constraint.
    const { store, model } = await plantConnectors();
    const misbehaving: ConnectorServiceStore = {
      ...store,
      updateConnector: async () => {
        throw new StoreRefusal({
          reason: 'check-violation',
          constraint: 'connectors_kind_check',
        });
      },
    };

    await expect(patchConnector(misbehaving, model.id, { name: FRESH_NAME }))
      .rejects.toBeInstanceOf(StoreRefusal);
  });

  it('rethrows a foreign key neither write can raise', async () => {
    // `connectors` references nothing, so no write on this surface
    // can be refused by a key pointing outward, and `refuseWrite`
    // carries no branch for one. A module that copied the sources
    // translation would answer this 404 — a sentence about a domain
    // this table does not have.
    const { store } = await plantConnectors();
    const misbehaving: ConnectorServiceStore = {
      ...store,
      insertConnector: async () => {
        throw new StoreRefusal({
          reason: 'foreign-key-violation',
          constraint: 'a key this table does not carry',
        });
      },
    };

    await expect(createConnector(misbehaving, {
      kind: 'llm',
      name: FRESH_NAME,
    })).rejects.toBeInstanceOf(StoreRefusal);
  });

  it('rethrows an error that is not a store refusal', async () => {
    // A driver fault is not a decision about rows, so nothing here
    // dresses it as one.
    const { store, model } = await plantConnectors();
    const misbehaving: ConnectorServiceStore = {
      ...store,
      updateConnector: async () => {
        throw new TypeError('the driver failed on its own account');
      },
    };

    await expect(patchConnector(misbehaving, model.id, { name: FRESH_NAME }))
      .rejects.toBeInstanceOf(TypeError);
  });
});

// ---------------------------------------------------------------------------
// What a refusal is allowed to say
// ---------------------------------------------------------------------------

/** A connector name, submitted as one. */
const SENTINEL_NAME = 'sentinel-connector-name';

/**
 * A config VALUE under a rostered key, submitted as one.
 *
 * The needle this group has and no other resource group on the
 * surface does. What sits under a `SECRET_CONFIG_KEYS` member is a
 * live credential, so a refusal carrying one has published it — to
 * the caller, and through `errorHandler` to a log line, and from
 * there to wherever that log goes.
 */
const SENTINEL_SECRET = 'sentinel-live-credential';

/**
 * A KEY inside the open record, submitted as one.
 *
 * The channel the masked-secret refusal walks. That rule finds the
 * literal at a dotted path and reports the path, so a module
 * reporting it unmasked would put this needle in a detail — which
 * is the leak the wildcards in {@link MASK_CASES} exist against,
 * read here from the containment side.
 */
const SENTINEL_KEY = 'sentinelConfigKey';

/** A family of service no tuple declares, submitted as one. */
const SENTINEL_KIND = 'sentinel-kind-value';

/** A key no schema here declares, submitted as one. */
const SENTINEL_MEMBER = 'sentinelMemberValue';

/**
 * The five strings the rows below submit. None is a substring of
 * another, so a count against one cannot be satisfied by another.
 */
const SENTINELS = [
  SENTINEL_NAME,
  SENTINEL_SECRET,
  SENTINEL_KEY,
  SENTINEL_KIND,
  SENTINEL_MEMBER,
];

/** One refused request, and what it submitted that must not return. */
interface ContainmentCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The call, submitting the needles below. */
  readonly run: (planted: PlantedConnectors) => Promise<unknown>;

  /** The submitted strings the answer must not carry. */
  readonly needles: readonly string[];
}

/** Every channel a submitted string could come back through. */
const CONTAINMENT_CASES: readonly ContainmentCase[] = [
  {
    label: 'a create fronted by a family nobody declared',
    run: ({ store }) => createConnector(store, {
      kind: SENTINEL_KIND,
      name: SENTINEL_NAME,
      config: { [SENTINEL_KEY]: 'a model', apiKey: SENTINEL_SECRET },
    }),
    needles: [SENTINEL_KIND, SENTINEL_NAME, SENTINEL_KEY, SENTINEL_SECRET],
  },
  {
    label: 'an undeclared member of a create body',
    run: ({ store }) => createConnector(store, {
      kind: 'llm',
      name: SENTINEL_NAME,
      config: { apiKey: SENTINEL_SECRET },
      [SENTINEL_MEMBER]: 1,
    }),
    needles: [SENTINEL_NAME, SENTINEL_MEMBER, SENTINEL_SECRET],
  },
  {
    label: 'a create over a pair the deployment carries',
    run: ({ store }) => createConnector(store, {
      kind: 'llm',
      name: MODEL_NAME,
      config: { [SENTINEL_KEY]: 'a model', apiKey: SENTINEL_SECRET },
    }),
    needles: [SENTINEL_KEY, SENTINEL_SECRET],
  },
  {
    label: 'a rename onto a pair the deployment carries',
    run: ({ store, fallback }) => patchConnector(store, fallback.id, {
      name: MODEL_NAME,
      config: { apiKey: SENTINEL_SECRET },
    }),
    needles: [SENTINEL_SECRET],
  },
  {
    label: 'a patch against an id that is not there',
    run: ({ store }) => patchConnector(store, MISSING_ID, {
      name: SENTINEL_NAME,
      config: { [SENTINEL_KEY]: SENTINEL_SECRET },
    }),
    needles: [SENTINEL_NAME, SENTINEL_KEY, SENTINEL_SECRET],
  },
  {
    label: 'a config submitting the mask beside a real key',
    run: ({ store, model }) => patchConnector(store, model.id, {
      config: { [SENTINEL_KEY]: MASKED_SECRET, apiKey: SENTINEL_SECRET },
    }),
    needles: [SENTINEL_KEY, SENTINEL_SECRET],
  },
  {
    label: 'an undeclared member of a patch body',
    run: ({ store, model }) => patchConnector(store, model.id, {
      config: { apiKey: SENTINEL_SECRET },
      [SENTINEL_MEMBER]: 1,
    }),
    needles: [SENTINEL_MEMBER, SENTINEL_SECRET],
  },
];

describe('what a refusal is allowed to say', () => {
  it('submits every sentinel through at least one channel', () => {
    const submitted = CONTAINMENT_CASES.flatMap((row) => [...row.needles]);

    expect([...new Set(submitted)].sort()).toEqual([...SENTINELS].sort());
  });

  it('submits the credential through every channel', () => {
    // The needle this group exists to keep off the wire reaches
    // EVERY row rather than one, since a refusal a caller meets
    // while holding a real key is the shape that matters and there
    // is no way to know in advance which refusal that will be.
    const carrying = CONTAINMENT_CASES.filter(
      (row) => row.needles.includes(SENTINEL_SECRET),
    );

    expect(carrying.length).toBe(CONTAINMENT_CASES.length);
  });

  it('would find a sentinel a refusal did carry', () => {
    // The planted control. Every row below counts to zero, and a
    // zero is what a search over the wrong text answers too — so
    // the same helper is run against an envelope built here, out of
    // details this module did not produce, and has to find each
    // one.
    const planted = JSON.stringify({
      code: 'CONFLICT',
      message: `No connector named ${SENTINEL_NAME}`,
      details: [
        {
          field: `config.${SENTINEL_KEY}`,
          message: `${SENTINEL_KIND} authenticated by ${SENTINEL_SECRET}`,
          code: SENTINEL_MEMBER,
        },
      ],
    });
    const found = SENTINELS.map((needle) => ({
      needle,
      occurrences: countOccurrences(planted, needle),
    }));

    expect(found).toEqual(SENTINELS.map((needle) => ({
      needle,
      occurrences: 1,
    })));
  });

  for (const row of CONTAINMENT_CASES) {
    it(`answers ${row.label} without quoting it`, async () => {
      const planted = await plantConnectors();
      const refusal = await refusalFrom(() => row.run(planted));
      const answered = JSON.stringify(refusal.toJSON());
      const found = row.needles.map((needle) => ({
        needle,
        occurrences: countOccurrences(answered, needle),
      }));

      // Counted rather than asserted absent, so the reading is a
      // number the planted control above has shown can be something
      // other than zero.
      expect(found).toEqual(row.needles.map((needle) => ({
        needle,
        occurrences: 0,
      })));

      // The envelope was built at all: a helper answering an empty
      // string would satisfy every count above.
      expect(answered.length).toBeGreaterThan(0);
      expect(refusal.toJSON().code).toBe(refusal.code);
    });
  }

  it('keeps the driver error off the wire and on the cause', async () => {
    // The delete's raced refusal passes the `StoreRefusal` as
    // `cause`, which is where a debugger and the error-level log
    // line find it. `cause` is non-enumerable per spec, so it
    // reaches no serialised body — a property of the platform
    // rather than of this module, which is why it is measured here
    // rather than assumed.
    const { store, archive } = await plantConnectors();
    const refusing: ConnectorServiceStore = {
      ...store,
      deleteConnector: async () => {
        throw new StoreRefusal({
          reason: 'foreign-key-violation',
          constraint: `${SENTINEL_MEMBER}_fk`,
        });
      },
    };
    const refusal = await refusalFrom(
      () => deleteConnector(refusing, archive.id),
    );

    expect(refusal.cause).toBeInstanceOf(StoreRefusal);
    expect(Object.keys(refusal.toJSON()).sort())
      .toEqual(['code', 'message']);
    expect(countOccurrences(
      JSON.stringify(refusal.toJSON()),
      SENTINEL_MEMBER,
    )).toBe(0);
  });

  it('puts the count it read on the wire and nothing else', async () => {
    // The one refusal here that carries `details` at all, and the
    // reading that says what they are: one number this module
    // counted, rather than anything a caller sent. The name and the
    // credential were both submitted on the row being deleted, so a
    // refusal echoing the row it refused would be caught by the
    // same count the rows above take.
    const planted = await plantConnectors();
    const connector = await createConnector(planted.store, {
      kind: 'search',
      name: SENTINEL_NAME,
      config: { [SENTINEL_KEY]: SENTINEL_SECRET },
    });

    planted.store.setConnectorSubscriptions(connector.id, 4);

    const refusal = await refusalFrom(
      () => deleteConnector(planted.store, connector.id),
    );
    const answered = JSON.stringify(refusal.toJSON());

    expect(refusal.details).toEqual({ exportSubscriptions: 4 });
    expect(Object.keys(refusal.toJSON()).sort())
      .toEqual(['code', 'details', 'message']);
    expect([SENTINEL_NAME, SENTINEL_KEY, SENTINEL_SECRET].map((needle) => ({
      needle,
      occurrences: countOccurrences(answered, needle),
    }))).toEqual([SENTINEL_NAME, SENTINEL_KEY, SENTINEL_SECRET].map(
      (needle) => ({ needle, occurrences: 0 }),
    ));
  });
});

// ---------------------------------------------------------------------------
// What a list answers
// ---------------------------------------------------------------------------

/**
 * The members `ConnectorRecord` declares.
 *
 * Written out rather than derived, an interface having no runtime
 * form to read keys off, and pinned in BOTH directions: `satisfies`
 * closes the direction where this names a member the record lacks,
 * and {@link EVERY_KEY_LISTED} closes the one where the record
 * grows a member nothing here learned about.
 *
 * The second direction is the one this group needs most. A column
 * added to `connectors` is answered on every read the day it lands,
 * and a credential is exactly the kind of thing that arrives that
 * way — so a member appearing here without a masking decision
 * behind it is a `check-types` failure rather than a projection
 * nobody re-read.
 */
const CONNECTOR_KEYS = [
  'config',
  'id',
  'kind',
  'name',
] as const satisfies readonly (keyof ConnectorRecord)[];

/** The two members a page carries around its rows. */
const PAGE_KEYS = [
  'rows',
  'total',
] as const satisfies readonly (keyof ConnectorPage)[];

/**
 * `true` only while `L` names every key of `T`.
 *
 * The tuple wrapper is load-bearing rather than decoration: without
 * it the union distributes over the conditional and the answer is
 * `boolean`, which accepts `true` as an initializer and pins
 * nothing at all.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/** The two lists above, held against the types they describe. */
type EveryKeyListed =
  CoversEveryKey<ConnectorRecord, typeof CONNECTOR_KEYS>
  & CoversEveryKey<ConnectorPage, typeof PAGE_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `ConnectorRecord` or to `ConnectorPage` and to
 * neither list above collapses {@link EveryKeyListed} to `never`,
 * and this initializer is then a TS2322 at this line — before any
 * case can compare a record against a set that has quietly stopped
 * describing it. An INTERSECTION rather than one read, so the
 * message names `never` rather than `false`. Read in a case below,
 * so it is a symbol this file uses rather than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link CONNECTOR_KEYS}, sorted at use rather than by hand. */
const CONNECTOR_KEY_SET: readonly string[] = [...CONNECTOR_KEYS].sort();

/** {@link PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...PAGE_KEYS].sort();

/**
 * `SECRET_CONFIG_KEYS` as plain strings.
 *
 * The tuple's members are literal types, so `includes` over it as
 * declared refuses any argument that is not already one of them
 * — which makes the second membership read below, over keys the
 * roster must NOT name, impossible to compile at all.
 */
const ROSTERED: readonly string[] = SECRET_CONFIG_KEYS;

/**
 * The rostered keys the configs here file a credential under.
 *
 * TWO RATHER THAN ONE, AND DIFFERENT FROM EACH OTHER: a module
 * matching a single key answers one row masked and the other
 * verbatim, which is the fault a page-wide claim exists to report
 * and which one secret-bearing row cannot see.
 */
const SECRET_MEMBERS = ['apiKey', 'token'];

/**
 * The keys those same configs carry that nothing masks.
 *
 * Read against the roster in the other direction, so a member
 * ADDED to `SECRET_CONFIG_KEYS` — `endpoint` being the plausible
 * one — is a named failure here rather than a case below quietly
 * asserting that a value which should now be masked came back as
 * itself.
 */
const PLAIN_MEMBERS = ['endpoint', 'vault'];

/** A row of a third kind carrying a credential of its own. */
const SEARCH_NAME = 'discovery';

/** Where that row says its service answers. */
const SEARCH_ENDPOINT = 'https://search.example.test/query';

/** What it authenticates with, under the second rostered key. */
const SEARCH_TOKEN = 'search-live-credential';

/**
 * Reads the whole deployment through the window every case here
 * but two uses.
 *
 * @param planted - The store and its rows.
 * @returns The page, every config masked.
 */
async function everyConnector(
  planted: PlantedConnectors,
): Promise<ConnectorPage> {
  return listConnectors(planted.store, EVERY_KIND, WIDE_WINDOW);
}

/**
 * Finds one answered connector by the name it carries.
 *
 * @param rows - What a read answered.
 * @param name - The name to look for.
 * @returns The row carrying it. Every name planted here is unique
 *   across the kinds, which the key is not: two rows may share one
 *   under different kinds, and this would answer the first.
 * @throws When no row carries it. A `find` answering `undefined`
 *   compares equal to another `undefined`, so a case reading a row
 *   back against a write that never landed would otherwise pass
 *   for nobody's reason.
 */
function connectorAt(
  rows: readonly ConnectorRecord[],
  name: string,
): ConnectorRecord {
  const found = rows.find((row) => row.name === name);

  if (found === undefined) {
    throw new Error('no answered row carries that name');
  }

  return found;
}

/**
 * The keys of a stored jsonb document.
 *
 * `ConnectorRecord.config` is `unknown` by design — the port takes
 * no view of what a client's arrangement holds — so a case reading
 * its SHAPE says so here once rather than casting on every line.
 *
 * @param document - What a read answered.
 * @returns Its own keys, sorted.
 */
function keysOf(document: unknown): string[] {
  return Object.keys(document as object).sort();
}

describe('what a list answers', () => {
  it('holds every key set against the type it describes', () => {
    // The runtime half of the pin above. What it asserts is not the
    // `true` — that is a constant — but that the symbol exists to
    // be read: its VALUE is the statement `check-types` makes at
    // the declaration, which is a TS2322 the moment either type
    // grows a member no list names.
    expect(EVERY_KEY_LISTED).toBe(true);

    // The fixture's two secret keys and its two plain ones, read
    // against the RUNTIME roster in both directions. A key moving
    // into `SECRET_CONFIG_KEYS` or out of it makes the cases below
    // assert the opposite of what they were written for, and this
    // is the only line that would say so.
    expect(SECRET_MEMBERS.filter((key) => !ROSTERED.includes(key)))
      .toEqual([]);
    expect(PLAIN_MEMBERS.filter((key) => ROSTERED.includes(key)))
      .toEqual([]);
    expect(new Set(SECRET_MEMBERS).size).toBe(SECRET_MEMBERS.length);
  });

  it('answers every config masked', async () => {
    // The claim the write-only rule reduces to on the read side,
    // and the section this file was missing. TWO rows carry a
    // credential, under two different rostered keys, so a module
    // masking the first row or the first key answers a perfectly
    // plausible page and fails here. The page is compared WHOLE
    // against the rows the writes answered, which is what says the
    // two reads agree about what a caller may see.
    const planted = await plantConnectors();
    const search = await createConnector(planted.store, {
      kind: 'search',
      name: SEARCH_NAME,
      config: { endpoint: SEARCH_ENDPOINT, token: SEARCH_TOKEN },
    });
    const page = await everyConnector(planted);

    expect(page.rows).toStrictEqual([
      planted.fallback,
      planted.model,
      planted.archive,
      search,
    ]);

    // Counted rather than asserted, and counted on BOTH sides: the
    // stored rows still hold the credentials verbatim, so the zero
    // below is about values that genuinely traversed this path
    // rather than about a fixture that never carried one.
    const storedModel = await planted.store.findConnectorById(
      planted.model.id,
    );
    const storedSearch = await planted.store.findConnectorById(search.id);

    expect(masksIn(page.rows.map((row) => row.config))).toBe(2);
    expect(masksIn([storedModel?.config, storedSearch?.config])).toBe(0);
    expect(storedModel?.config).toStrictEqual({
      endpoint: MODEL_ENDPOINT,
      apiKey: MODEL_SECRET,
    });
    expect(storedSearch?.config).toStrictEqual({
      endpoint: SEARCH_ENDPOINT,
      token: SEARCH_TOKEN,
    });

    // The sorted key SET beside the records the case compares. A
    // member arriving on a row by spread — a column nobody
    // projected — is invisible to a compare against records this
    // same module answered, and is exactly what these lines catch.
    expect(page.rows.map((row) => Object.keys(row).sort()))
      .toEqual(page.rows.map(() => [...CONNECTOR_KEY_SET]));
    expect(Object.keys(page).sort()).toEqual([...PAGE_KEY_SET]);
  });

  it('leaves a config with no rostered key alone', async () => {
    // The other direction of the claim above, and the control it
    // rests on: a module replacing the config wholesale, or masking
    // every value in it, answers the two secret-bearing rows
    // correctly and fails here. Read against the STORED document
    // rather than against a literal, so the two are one reading,
    // and the keys are read beside it so an emptied config cannot
    // satisfy the equality from both sides at once.
    const planted = await plantConnectors();
    const page = await everyConnector(planted);
    const stored = await planted.store.findConnectorById(
      planted.archive.id,
    );
    const answered = connectorAt(page.rows, ARCHIVE_NAME);

    expect(answered.config).toStrictEqual(stored?.config);
    expect(keysOf(answered.config)).toEqual(['vault']);
    expect(masksIn(answered.config)).toBe(0);
  });

  it('orders the page by kind and then by name', async () => {
    // The port's contract, and the fixture separates it from both
    // orders that would agree with it on a smaller one: insertion
    // order answers the model first, and name-only order answers
    // the notebook first. Neither matches what the pair produces.
    const planted = await plantConnectors();
    const page = await everyConnector(planted);
    const answered = page.rows.map((row) => row.name);

    expect(page.rows.map((row) => row.kind))
      .toEqual(['llm', 'llm', 'notebook']);
    expect(answered).toEqual([FALLBACK_NAME, MODEL_NAME, ARCHIVE_NAME]);
    expect([...answered].sort()).not.toEqual(answered);
    expect([MODEL_NAME, FALLBACK_NAME, ARCHIVE_NAME]).not.toEqual(answered);
  });

  it('narrows the page to the kind it was given', async () => {
    // What a filter SELECTS, which is this module's half of the
    // `?kind` parameter — holding it to `CONNECTOR_KINDS` is
    // `./routes.ts`'s. The count is read through the SAME filter as
    // the rows, so a module narrowing one and not the other answers
    // a page whose `meta.total` describes a different collection.
    const planted = await plantConnectors();
    const models = await listConnectors(
      planted.store,
      { kind: 'llm' },
      WIDE_WINDOW,
    );
    const every = await everyConnector(planted);

    expect(models.rows).toStrictEqual([planted.fallback, planted.model]);
    expect(models.total).toBe(2);
    expect(every.total).toBe(3);
  });

  it('answers an empty page for a kind no row carries', async () => {
    // Nothing failed to read: the collection is there and the
    // narrowing selected none of it, which is the same answer a
    // window past the end gives. The unnarrowed read beside it is
    // the control — a module answering an empty page to everything
    // passes the first half of this and fails the second.
    const planted = await plantConnectors();
    const none = await listConnectors(
      planted.store,
      { kind: 'search' },
      WIDE_WINDOW,
    );
    const held = await everyConnector(planted);

    expect(none).toStrictEqual({ rows: [], total: 0 });
    expect(held.total).toBe(3);
  });

  it('reports the collection rather than the page in hand', async () => {
    // `total` is a second question rather than the length of the
    // rows in hand, and the refusal half of this file could not say
    // so: its one window was wider than every collection, so a
    // total taken off the rows would have been right there. This
    // window holds one row of three.
    const planted = await plantConnectors();
    const page = await listConnectors(planted.store, EVERY_KIND, {
      limit: 1,
      offset: 0,
    });

    expect(page.rows).toStrictEqual([planted.fallback]);
    expect(page.total).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// What a create lands
// ---------------------------------------------------------------------------

/** A name no fixture row carries, for a second notebook. */
const VAULT_NAME = 'offsite';

describe('what a create lands', () => {
  it('answers the masked row the store holds unmasked', async () => {
    // The two halves of one write, read on both sides in one case.
    // What the caller gets back is the mask, though the caller is
    // the one who just sent the credential — a create answered
    // with the secret in it would be the very artifact this surface
    // exists to keep it out of. What the store holds is the value
    // as submitted, byte for byte, because a masked write would
    // leave the deployment with a connector that cannot
    // authenticate and nothing on the wire saying so.
    const planted = await plantConnectors();
    const created = await createConnector(planted.store, {
      kind: 'search',
      name: SEARCH_NAME,
      config: { endpoint: SEARCH_ENDPOINT, token: SEARCH_TOKEN },
    });
    const stored = await planted.store.findConnectorById(created.id);

    expect(created).toStrictEqual({
      id: created.id,
      kind: 'search',
      name: SEARCH_NAME,
      config: { endpoint: SEARCH_ENDPOINT, token: MASKED_SECRET },
    });
    expect(stored).toStrictEqual({
      id: created.id,
      kind: 'search',
      name: SEARCH_NAME,
      config: { endpoint: SEARCH_ENDPOINT, token: SEARCH_TOKEN },
    });

    // The id is the store's own — no body here carries one — and
    // the sorted key set beside it, since the id is the one member
    // a whole-row compare cannot pin against anything but itself.
    expect(created.id).toBeGreaterThan(planted.archive.id);
    expect(Object.keys(created).sort()).toEqual([...CONNECTOR_KEY_SET]);
  });

  it('turns an omitted config into an empty one', async () => {
    // The member is optional in the schema and REQUIRED by
    // `InsertConnectorInput`, so what an absence means is decided
    // in the service and is readable here rather than left to a
    // column only one of the two implementations has. The empty
    // object is a complete value: for a connector it means there is
    // nowhere to reach, which is a row the pipeline cannot call
    // rather than one it calls with defaults.
    const { store } = await plantConnectors();
    const created = await createConnector(store, {
      kind: 'notebook',
      name: VAULT_NAME,
    });
    const stored = await store.findConnectorById(created.id);

    expect(created.config).toStrictEqual({});
    expect(stored?.config).toStrictEqual({});
  });

  it('lands the row on the page a read answers', async () => {
    // Read back through the OTHER operation, so the claim is about
    // what is stored rather than about what one call happened to
    // answer: a create returning a row it never wrote passes every
    // case above and fails this. The whole page is compared, which
    // says in the same line that the three rows already there are
    // still there and still say what they said.
    const planted = await plantConnectors();
    const created = await createConnector(planted.store, {
      kind: 'search',
      name: SEARCH_NAME,
      config: { endpoint: SEARCH_ENDPOINT, token: SEARCH_TOKEN },
    });
    const page = await everyConnector(planted);

    expect(page.rows).toStrictEqual([
      planted.fallback,
      planted.model,
      planted.archive,
      created,
    ]);
    expect(connectorAt(page.rows, SEARCH_NAME).config)
      .toStrictEqual({ endpoint: SEARCH_ENDPOINT, token: MASKED_SECRET });
  });

  it('counts the new row in the total a page reports', async () => {
    // `total` is a second question rather than the length of the
    // rows in hand, so a create the count never saw would leave a
    // page claiming to be the whole of a deployment it is not. Read
    // through a window of one, so the two numbers cannot agree by
    // accident.
    const planted = await plantConnectors();

    await createConnector(planted.store, {
      kind: 'search',
      name: SEARCH_NAME,
    });

    const page = await listConnectors(planted.store, EVERY_KIND, {
      limit: 1,
      offset: 0,
    });

    expect(page.rows).toHaveLength(1);
    expect(page.total).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// What a patch retunes
// ---------------------------------------------------------------------------

/** The credential a patch writes in place of a stored one. */
const ROTATED_SECRET = 'model-rotated-credential';

describe('what a patch retunes', () => {
  it('clears a secret by being sent the config without it', async () => {
    // THE REPLACE-WHOLE RULE AT ITS SHARPEST. A caller sends the
    // document it wants to exist, so omitting a member removes it
    // — and on this table the member is a live credential, which
    // makes the request doing it by accident byte-identical to the
    // one doing it on purpose. Both readings are here because
    // neither is enough: the answer says the key is gone, and only
    // the STORE can say the value went with it rather than being
    // masked out of a row that still holds it.
    const planted = await plantConnectors();
    const patched = await patchConnector(planted.store, planted.model.id, {
      config: { endpoint: MODEL_ENDPOINT },
    });
    const stored = await planted.store.findConnectorById(planted.model.id);

    expect(patched).toStrictEqual({
      ...planted.model,
      config: { endpoint: MODEL_ENDPOINT },
    });
    expect(stored?.config).toStrictEqual({ endpoint: MODEL_ENDPOINT });
    expect(keysOf(planted.model.config)).toEqual(['apiKey', 'endpoint']);
    expect(keysOf(stored?.config)).toEqual(['endpoint']);
  });

  it('stores the config it replaced', async () => {
    // Read back through the list, so the claim is about the stored
    // row rather than about what the patch answered, and compared
    // as a WHOLE PAGE: a patch reaching more rows than the id it
    // was given answers the same row and is invisible to every
    // other case in this section.
    const planted = await plantConnectors();

    await patchConnector(planted.store, planted.model.id, {
      config: { endpoint: MODEL_ENDPOINT },
    });

    const page = await everyConnector(planted);

    expect(page.rows).toStrictEqual([
      planted.fallback,
      { ...planted.model, config: { endpoint: MODEL_ENDPOINT } },
      planted.archive,
    ]);
  });

  it('keeps a secret the same patch sent again', async () => {
    // The control the clearing above rests on: a module clearing
    // every rostered key on every patch — or masking on the way IN
    // as well as on the way out — passes that case and fails this.
    // A rotated credential is the ordinary request here, and the
    // value stored is the one submitted rather than the one that
    // was there.
    const planted = await plantConnectors();
    const patched = await patchConnector(planted.store, planted.model.id, {
      config: { endpoint: MODEL_ENDPOINT, apiKey: ROTATED_SECRET },
    });
    const stored = await planted.store.findConnectorById(planted.model.id);

    expect(patched.config).toStrictEqual({
      endpoint: MODEL_ENDPOINT,
      apiKey: MASKED_SECRET,
    });
    expect(stored?.config).toStrictEqual({
      endpoint: MODEL_ENDPOINT,
      apiKey: ROTATED_SECRET,
    });
  });

  it('clears the config when it is sent an empty object', async () => {
    // An empty object is a complete value and the only way to
    // express holding no arrangement at all, so a store treating it
    // as an absence leaves the stored config standing and answers a
    // row that looks right — which here means a credential the
    // operator believes they have just removed.
    const planted = await plantConnectors();
    const patched = await patchConnector(planted.store, planted.model.id, {
      config: {},
    });
    const stored = await planted.store.findConnectorById(planted.model.id);

    expect(patched).toStrictEqual({ ...planted.model, config: {} });
    expect(stored?.config).toStrictEqual({});
  });

  it('renames a connector without reaching its config', async () => {
    // A patch naming one member leaves the other alone, and on this
    // table the other member is the credential. The whole record is
    // compared against the row as it was, and the STORE is read
    // beside it: a service defaulting the config it was not sent
    // would have cleared the secret, and the masked answer looks
    // identical either way.
    const planted = await plantConnectors();
    const patched = await patchConnector(planted.store, planted.model.id, {
      name: FRESH_NAME,
    });
    const stored = await planted.store.findConnectorById(planted.model.id);

    expect(patched).toStrictEqual({ ...planted.model, name: FRESH_NAME });
    expect(stored?.config).toStrictEqual({
      endpoint: MODEL_ENDPOINT,
      apiKey: MODEL_SECRET,
    });
    expect(stored?.name).toBe(FRESH_NAME);
  });

  it('answers the stored row to a patch naming nothing', async () => {
    // The port's rule rather than this module's: `connectors`
    // carries no `updated_at`, so a patch with no member has
    // literally nothing to set and the row it answers is the row
    // that was there. The stored config is read beside it, since a
    // module that took the empty patch as a clear would answer a
    // record that differs in the one member the mask hides.
    const planted = await plantConnectors();
    const patched = await patchConnector(
      planted.store,
      planted.model.id,
      {},
    );
    const stored = await planted.store.findConnectorById(planted.model.id);

    expect(patched).toStrictEqual(planted.model);
    expect(stored?.config).toStrictEqual({
      endpoint: MODEL_ENDPOINT,
      apiKey: MODEL_SECRET,
    });
  });
});

// ---------------------------------------------------------------------------
// What a delete takes
// ---------------------------------------------------------------------------

describe('what a delete takes', () => {
  it('answers nothing and leaves the siblings standing', async () => {
    // The other side of the guard two sections up: a connector no
    // subscription names, where the whole of what the operation
    // answers is `undefined` and the whole of what it did is read
    // back off the page. The siblings are compared as WHOLE records
    // — a delete that took the right row and edited the one beside
    // it answers the same page of names.
    const planted = await plantConnectors();

    await expect(deleteConnector(planted.store, planted.archive.id))
      .resolves.toBeUndefined();

    const page = await everyConnector(planted);

    expect(page.rows).toStrictEqual([planted.fallback, planted.model]);
    expect(page.total).toBe(2);
  });

  it('takes the stored credential with the row', async () => {
    // What a delete takes on THIS group that it takes on no other:
    // the row is where the credential lived, and after this there
    // is no read anywhere that answers it, masked or otherwise.
    // Read through the port's own lookup rather than through the
    // list, which is the one reading that would still see a config
    // the masking had hidden. The sibling is read in the same
    // case — a store answering null to everything passes the
    // line above.
    const planted = await plantConnectors();

    await deleteConnector(planted.store, planted.model.id);

    const gone = await planted.store.findConnectorById(planted.model.id);
    const kept = await planted.store.findConnectorById(planted.fallback.id);

    expect(gone).toBeNull();
    expect(kept).not.toBeNull();
  });

  it('answers 404 to a second delete of the same id', async () => {
    // The row is gone rather than merely unlisted, which no read
    // above can say: a delete that unlinked the row without
    // removing it answers this second call as a success.
    const planted = await plantConnectors();

    await deleteConnector(planted.store, planted.archive.id);

    const refusal = await refusalFrom(
      () => deleteConnector(planted.store, planted.archive.id),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });

  it('answers 404 from a patch of the id it took', async () => {
    // The id is unusable by every operation that names one rather
    // than only by the delete that took it: a store dropping the
    // row from the collection while leaving it addressable passes
    // both reads above and answers this patch — with a config it
    // still holds.
    const planted = await plantConnectors();

    await deleteConnector(planted.store, planted.archive.id);

    const refusal = await refusalFrom(() => patchConnector(
      planted.store,
      planted.archive.id,
      { name: FRESH_NAME },
    ));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });
});
