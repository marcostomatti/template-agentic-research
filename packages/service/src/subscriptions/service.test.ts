/**
 * `src/subscriptions/service.ts` — what the four export
 * subscription operations refuse, and what they let through. Driven
 * over `tests/helpers/memory-research-store.ts`, so every claim
 * here is answered with no database anywhere.
 *
 * EIGHTEEN CLAIMS, ELEVEN OF THEM ABOUT A REFUSAL. The refusal
 * half carries only the CONTROLS a refusal needs to be readable:
 * each is varied along the one axis its refusal turns on, because
 * a module refusing everything passes every assertion a refusal
 * case makes on its own. The plan's seven are the address, the
 * connector, the format, the triple, the pipeline-owned member,
 * the id that names nothing and the subscription that is switched
 * off; the other four are the readings those seven cannot give on
 * their own. The seven that follow them are what these operations
 * LET THROUGH, and every one of those is read back through an
 * operation other than the one that wrote it.
 *
 * THAT AN ADDRESS NAMING NOTHING IS A 404 ON ALL FIVE OPERATIONS,
 * and that the two addresses are told apart. A `:slug` naming no
 * domain and an `:id` naming no subscription are fixed in different
 * places, so a module answering one sentence to both would send an
 * operator to the wrong one — a distinction pinned without pinning
 * either wording, since the sentences are free to be reworded and
 * the difference is not.
 *
 * THAT A `connectorId` NAMING NO CONNECTOR IS A 422 AND NOT A 404,
 * from both writes that can carry one. This is the claim this group
 * has and no wave-1 group does: the id is a body member rather than
 * an address, so the refusal names `connectorId` in a detail a
 * caller can act on. `SubscriptionPatch` carries the member, so a
 * RE-POINT can name a connector that is not there exactly as a
 * create can, and the table drives both. Two controls sit beside it
 * and neither substitutes for the other: the same write naming a
 * connector that IS there, and a patch naming no connector at all —
 * which is what says the resolution is conditional rather than an
 * unconditional read of a member the request never sent.
 *
 * THAT THE TWO ORDERINGS ARE OPPOSITE, AND DELIBERATELY. A create
 * against an unknown slug carrying an unknown connector answers the
 * SLUG, and a patch against an unknown id carrying an unknown
 * connector answers the CONNECTOR. Neither is arbitrary: the create
 * resolves its address because the insert needs the domain id, and
 * the patch never resolves its address at all — the store answers
 * `null` at the write, which is last. Two cases pin the pair, and a
 * module that had folded them into one rule fails exactly one of
 * them.
 *
 * THAT A TRIPLE THE DOMAIN ALREADY SUBSCRIBES TO IS A 409 FROM BOTH
 * WRITES THAT CAN PROPOSE ONE. Two thirds of the natural key are
 * patchable, so a re-format and a re-point can collide as a create
 * can. `StoreRefusal` is deliberately not an `AppError`, so an
 * untranslated one answers 500; the cases pin the translation
 * rather than merely that something was thrown. Four controls
 * follow, and the last two are the ones the first two cannot stand
 * in for: the key is over a TRIPLE, so one domain taking one format
 * to two connectors and one taking two formats to one connector
 * both have to be accepted, and a service or a store holding any
 * PAIR of the three refuses one of them while passing every other
 * case in this file.
 *
 * THAT A BODY IS PARSED HERE, not above. Every row of the body
 * table is submitted to a SERVICE function rather than to a schema,
 * which is what says an MCP tool in wave 3 cannot be handed a
 * payload the HTTP route would have refused. Both operations that
 * take a body have rows of their own, since a row driven through
 * only one of them pins nothing about the other, and both orderings
 * are pinned: a malformed body outranks a slug that names nothing
 * AND an id that names nothing.
 *
 * THAT `format` IS HELD TO `EXPORT_FORMATS` AND THE TUPLE IS READ
 * AT RUNTIME. The rows submitting a format outside it are filtered
 * against the imported constant rather than against a list retyped
 * here, so a member ADDED to the tuple fails the guard — the row it
 * was named for having become legal — instead of leaving a case
 * asserting a refusal that is no longer one. The other direction is
 * a separate claim no refusal row can reach, and it is the
 * acceptance case that LOOPS the tuple: a schema narrowed to four
 * of five formats passes every refusal row here and fails only
 * that.
 *
 * THAT THE ENUM ANSWERS ONE CODE FOR THREE FAULTS. A format outside
 * the tuple, a format left off, and a format cleared with an
 * explicit `null` are all `invalid_value`, where a string member
 * would answer `invalid_type` for two of the three. That is
 * measured rather than assumed, and the three rows are kept apart
 * because the BODIES differ even where the detail does not: a
 * schema made optional passes the second and still refuses the
 * first.
 *
 * THAT `nextRunAt` IS REFUSED AS AN UNRECOGNIZED KEY ON BOTH
 * WRITES. It is `.strict()` doing its ordinary work rather than a
 * per-column check, which is the reason the refusal holds for a
 * column nobody has added yet — `domainId` and a member of another
 * table entirely are refused by the same clause and are in the
 * table for exactly that reason.
 *
 * THAT THE REASONS THIS PORT DECLARES ARE TOLD APART, INCLUDING THE
 * TWO ONLY A LOST RACE REACHES. Both writes resolve their parents
 * and only then write, so a foreign-key refusal means a row went
 * between the two — a state the ordinary fixture cannot produce and
 * which is therefore RECONSTRUCTED rather than stubbed: the parent
 * is really deleted, the lookup really answers the row it had, and
 * what the write meets is the store's own refusal. The insert
 * reaches two keys and answers the domain 404 to both, which is
 * this module's stated misattribution and is pinned as such rather
 * than left to a reader to discover; the update reaches one and
 * answers the same 422 the lookup does. Beside them sit the two
 * rethrow cases, which are what says a reason `SubscriptionStore`
 * does not declare answers 500 rather than a plausible status no
 * rule authorised.
 *
 * THAT NOTHING SUBMITTED COMES BACK. The containment block counts
 * occurrences of a sentinel in the serialised refusal rather than
 * asserting absence, and takes the same count over a planted
 * envelope — a search that would find nothing anywhere reports a
 * clean refusal and a leaking one alike. Its connector rows carry
 * the submitted ID as a needle, which is the value the one refusal
 * built by hand here is likeliest to quote and the only channel a
 * string sentinel cannot reach.
 *
 * THAT A DISABLED SUBSCRIPTION IS A 409 AND IS LEFT EXACTLY AS IT
 * WAS. `enabled` false excludes a row from the partial index the
 * dispatch claim walks, so writing the clock onto it would produce
 * a row looking due forever and never claimed — a silent no-op the
 * caller cannot see. Three readings sit beside the status and none
 * substitutes for another: the same verb against a row differing
 * in `enabled` alone, which is what says the guard is a guard
 * rather than a verb refusing everything; the whole stored row
 * compared afterwards, which is what says the refusal happened
 * BEFORE the write rather than after it; and `enabled` named on
 * its own, since a verb quietly enabling what it was handed would
 * be undoing a suspension somebody chose.
 *
 * THAT A LIST ANSWERS ONE DOMAIN'S SUBSCRIPTIONS AND ORDERS THEM BY
 * THE PAIR. The fixture puts a row carrying `digest`'s WHOLE pair
 * under the second domain, so a read reaching past the domain
 * cannot tell the two deliveries apart by their natural key at all,
 * and the page is compared as WHOLE RECORDS rather than as pairs.
 * The order is read over a collection arranged so that neither
 * single-column reading answers it: the two rows sharing a format
 * go in LAST and sort FIRST, and the one written first sits on the
 * HIGHER connector id, so a page in insertion order and a page
 * sorted on the format alone are each wrong in a different place.
 *
 * THAT ONE DOMAIN HOLDS ONE FORMAT AT TWO CONNECTORS AND TWO
 * FORMATS AT ONE. The acceptance controls beside the 409s say each
 * write was TAKEN; this says the collection can hold both shapes at
 * once, which is the reading a list keyed on any PAIR of the three
 * columns could not give. It is the same widening the refusal half
 * plants, read off a page rather than off a write.
 *
 * THAT A CREATE LANDS UNSCHEDULED AND ENABLED, and that both are
 * DEFAULTS rather than constants. A null due time is the state
 * `ar-dispatch` never claims and the run-now verb exists to leave;
 * `enabled` true is what a body may override, and the case staging
 * a subscription switched off is what says the surface reads the
 * member rather than writing a literal. The two bounds are folded
 * here and distinguished by the patch, so the create's
 * absent-equals-null case and the patch's clear-with-null case are
 * two claims rather than one written twice.
 *
 * THAT A PATCH REACHES THE MEMBER IT NAMED AND NO OTHER. Every
 * write is compared as a WHOLE record against the row as it was,
 * with only the overridden members differing, and the cadence is
 * read back through the list rather than off the answer. The two
 * bounds carry the three-request distinction on their own: absent
 * leaves the stored bound alone, a number sets it, and `null`
 * clears it, which a `??` anywhere between the schema and the port
 * would collapse. `enabled` is read in both directions, since a
 * member folded through `||` writes true for a submitted false, and
 * a member no longer written at all is green in whichever direction
 * the stored value already pointed.
 *
 * THAT A DELETE TAKES ONE ROW AND FREES ITS TRIPLE. Nothing in
 * schema v2 points at `export_subscriptions`, so the whole of what
 * this operation answers is nothing and the whole of what it did is
 * read off the page afterwards. Three readings no page can give sit
 * beside it: the second domain still carries the pair, a second
 * delete of the same id is a 404, and the create that takes the
 * freed triple lands a NEW row rather than the old one back.
 *
 * THAT THE ANSWERED KEY SET IS PINNED IN BOTH DIRECTIONS. A list of
 * `SubscriptionRecord`'s members is held to the record by
 * `satisfies` and the record to the list by a conditional read
 * through {@link EVERY_KEY_LISTED}, with the sorted set asserted
 * over an ANSWERED row beside it. The type half is the one THIS
 * table needs: `export_subscriptions` spreads
 * `schedulableColumns()`, so a column added to that one helper
 * reaches every projection here with no subscriptions module edited
 * at all. Measured — planting an optional member on the record
 * answers exactly one TS2322, at this file's own pin.
 *
 * THAT A RUN NOW WRITES THE CLOCK'S INSTANT AND MOVES NOTHING
 * ELSE. The equality is against an INJECTED instant, which is the
 * whole reason the clock is a parameter: a verb reading the real
 * present answers a plausible time no assertion could pin. One
 * equality against one fixed instant is not the claim on its own,
 * so the case calls again from a clock that has MOVED — the
 * reading that separates the thunk being resolved at the write
 * from one resolved when the dependency was assembled. Idempotence
 * is its own case and its own control: two whole answers compared
 * are equally green against a verb that wrote nothing either time,
 * so the first call is shown moving the row off the null a create
 * landed it at. And the containment is read off the STORE rather
 * than off what the verb answered, member for member against a
 * copy taken before the call, over TWO rows — one carrying neither
 * bound and one carrying both, since one row alone is blind to
 * whichever direction it is not in.
 *
 * Mutation legs, run over this file with `--reporter=json` and read
 * as the failed case SET rather than as a count, measured against
 * 127 cases. Thirty-eight legs, twenty-five aimed at
 * `src/subscriptions/service.ts` and thirteen at
 * `tests/helpers/memory-research-store.ts` — the natural key, the
 * page's order and what a write actually stores are all the
 * STORE's, and no leg over the service reaches any of them. Every
 * leg collected all 127 cases, which is what separates a leg that
 * legitimately reddened nothing from one whose edit broke
 * collection and scored zero identically.
 *
 * THE TWENTY LEGS THE REFUSALS-ONLY FILE RECORDED WERE RE-RUN
 * RATHER THAN QUOTED, and each figure below is the reds OUTSIDE the
 * four positive sections. Sixteen of the twenty came back unmoved
 * in every direction, which is the reading that says they are still
 * live: they are refusal-TRANSLATION legs, and a positive case has
 * nothing to say about which status a refusal wears. The four that
 * gained new reds are the four whose edit changes what an accepted
 * write STORES or what a page holds, and each is noted where it
 * sits.
 *
 * Collapsing the two 404 sentences into one reddens exactly 1, the
 * distinctness case, which is the narrowest reading in this file.
 *
 * THE FOUR CONNECTOR LEGS ARE TOLD APART BY WHICH SIDE OF THE
 * RESOLUTION EACH EDIT SITS ON. Answering the lookup a 404 instead
 * of a 422 reddens 4 — both refusal rows, the message case and the
 * patch ordering case. Dropping the resolution from the CREATE
 * reddens 2 and dropping it from the PATCH reddens 1, and the two
 * sets are disjoint, which says the two call sites are separately
 * pinned. The create's leg is 2 rather than 3 because a create with
 * no pre-flight read still answers 404 for a connector that is not
 * there — through the foreign key rather than the lookup — so the
 * ordering case is green under it, which is this module's stated
 * misattribution showing up as a leg that cannot reach it. Making
 * the patch's resolution UNCONDITIONAL reddens 10 outside the
 * positive sections and 19 in all, and is recorded as blunt rather
 * than as coverage: a lookup of `undefined` refuses every patch, so
 * the one case named for the conditional carries the claim and the
 * other eighteen are the fixture reporting. It is the first of the
 * four legs the positive half moved, and the one it moved for the
 * least interesting reason.
 *
 * The two `.strict()` legs redden 4 apiece and their sets are
 * DISJOINT, which says the two schemas are separately pinned rather
 * than sharing one `parseBody` nobody would notice degrading. Each
 * is exactly its half's three undeclared-member rows plus that
 * half's containment row.
 *
 * The two numeric legs are two members held to one rule and they
 * redden disjoint sets. Relaxing the shared interval schema to
 * `.nonnegative()` reddens 5 — the zero row and the zero-floor row
 * on each operation, plus the patch ordering case, which submits a
 * zero of its own — and relaxing the connector id schema reddens 3,
 * the two zero rows plus the create ordering case. Neither reaches
 * the fractional or negative rows, which says `.int()` and
 * `.positive()` are separately pinned.
 *
 * THE TWO ENUM LEGS REDDEN DISJOINT SETS AND NEITHER DIRECTION IS
 * REACHABLE FROM THE OTHER. Narrowing the schema to four of the
 * five formats reddens exactly 1, the acceptance loop, and no
 * refusal row at all. Widening it to `z.string()` reddens 6, every
 * row whose expected code is `invalid_value` plus the create
 * ordering case — which is the three-faults-one-code claim paying
 * for itself, since the missing-member and explicit-null rows are
 * in that set and a string schema answers `invalid_type` to both.
 *
 * WHICH four the narrowing leg drops moves its figure, so the leg
 * is named by its EDIT rather than by its arity. Omitting
 * `notion_md` — the one member no case here spells — is the leg
 * recorded above, and it still answers 1. Omitting `email_draft`
 * answers 4: the body table's whole-shape acceptance case patches
 * to that format, and the positive half's widening and ordering
 * cases both deliver it. That is the second of the four legs the
 * positive half moved.
 *
 * The triple legs nest. Rethrowing the unique refusal reddens 7 —
 * all three 409 cases, both read-back controls, the containment row
 * and the `cause` case — while answering that same refusal a 404
 * reddens a strict SUBSET of 3, the three 409 cases alone, because
 * a wrong status still leaves an `AppError` for the refusal helper
 * to hand back and every read-back control still sees a row nobody
 * wrote.
 *
 * The two lost-race legs redden disjoint sets, which is what makes
 * the insert's misattribution a decision this file pins rather than
 * a behaviour it inherits. Answering every foreign-key refusal as
 * the connector 422 reddens 3, all of them insert cases; answering
 * every one as the domain 404 reddens exactly 1, the patch case. A
 * module reading the constraint name — the design `./service.ts`
 * considered and did not take — fails the second of those three,
 * which is what makes the CONNECTOR-raced case worth having rather
 * than a transcription of what the code already does.
 *
 * Three legs redden exactly the one case each is aimed at.
 * Resolving the domain before parsing the create body reddens only
 * that ordering case; reading the connector before the domain
 * reddens only the create's both-wrong case; and answering an
 * undeclared reason a 409 rather than rethrowing it reddens only
 * the first rethrow case.
 *
 * THE TWO RECORDED STORE LEGS REACH WHAT NO SERVICE MUTATION CAN,
 * the key being the STORE's, and both are among the four the
 * positive half moved. Keying it on `(domain, format)` reddens 2
 * outside the positive sections — the widening control that exists
 * for it and the format acceptance loop, which delivers five
 * formats to one connector — and 4 in all, the two added reds being
 * the page that carries one format at two connectors and the page
 * whose order is read. Keying it across every domain rather than
 * within one reddens 77 outside and 104 in all, and is recorded
 * rather than read: the fixture plants a row carrying another
 * domain's whole pair, so {@link plantSubscriptions} cannot build
 * its dataset at all under that edit. That is the fixture's design
 * reporting rather than any case, and it is why the three explicit
 * widening controls sit beside it.
 *
 * THE PAGE'S ORDER IS THE STORE'S AND IT IS TWO CLAIMS RATHER THAN
 * ONE. Dropping the connector tie-break reddens 2, both in the
 * positive half and both the cases the fixture was arranged for;
 * reversing the format comparison reddens 7, of which 2 sit in the
 * refusal half, where two read-back controls happen to compare a
 * page as a list. Neither is reachable from the other, and the
 * tie-break leg would read ZERO against a fixture whose tied rows
 * had been written in the tie-break's own order — which is the
 * whole reason the row sorting FIRST is the one written LAST.
 *
 * THE DOMAIN SCOPE IS THREE LEGS AND ONE OF THEM IS A DUPLICATE.
 * Reading the LIST past its domain reddens 13 and counting past it
 * reddens 10, both spanning the refusal half and the positive one,
 * and their sets are different — a page holding the wrong rows and
 * a total describing the wrong collection are separate faults. The
 * third, making the store's shared `subscriptionsOf` helper ignore
 * its argument, answers a red set IDENTICAL to the
 * across-every-domain key leg above, member for member at 104: the
 * key lookup reads through that same helper, so the two edits are
 * one edit as far as this file can see. It is recorded rather than
 * kept, since a leg that cannot be told from its neighbour pins
 * nothing the neighbour does not.
 *
 * THE SERVICE'S OWN POSITIVE LEGS ARE NARROW, WHICH IS WHAT SAYS
 * THE POSITIVE HALF IS NOT ONE ASSERTION WRITTEN FIVE TIMES. Taking
 * a page's `total` from the rows in hand reddens 2, and both are
 * the cases that read a window narrower than their collection —
 * every other positive case reads the default window over a
 * collection that fits inside it and cannot report either. Writing
 * `enabled` true whatever the create submitted reddens exactly 1,
 * the staged-off case. Folding every created bound to null reddens
 * 2, one of them in the patch section, since the case that clears a
 * floor first needs one to have been stored.
 *
 * THREE MORE STORE LEGS COVER WHAT A PATCH WRITES AND WHAT A
 * PROJECTION ANSWERS. Collapsing an absent patched bound and an
 * explicit `null` reddens 2, one in each half, which is what makes
 * the create's fold and the patch's clear two claims. Folding a
 * patched `enabled` through `||` reddens 2, both suspension cases.
 * And the projection is pinned in both directions at runtime as
 * well as in the type system: answering a member it never had
 * reddens 2, the two whole-record cases that also assert the key
 * set, and dropping one from it reddens 7 across both halves.
 *
 * THE RUN-NOW VERB'S SIX LEGS SPLIT THREE AND THREE, and the
 * figures below are the whole file rather than a bucket, every one
 * of them landing inside the two sections the verb owns. Deleting
 * the `enabled` guard reddens 4 — the whole of the refusal section
 * — where making that same branch refuse EVERY run now reddens 5
 * and is recorded as blunt: four of the five are the fixture
 * reporting, and only the control varied on `enabled` alone is
 * named for it. Answering the disabled state a 404 rather than a
 * 409 reddens exactly 2, the status case and that same control,
 * which is the narrowest of the three.
 *
 * Having the verb read the real present rather than the injected
 * thunk reddens 4, and it is the leg the second call from a moved
 * clock exists for: a fixture whose only reading were one equality
 * against one instant would have had to be measured against a
 * clock nobody moved. Its two store-side neighbours redden 4 and
 * 3. Having `updateSubscriptionSchedule` ALSO flip `enabled`
 * reaches the containment case; having it store nothing at all
 * reddens the three positive cases and no refusal, which is what
 * says every containment reading here is paired with a control
 * that the permitted column did move.
 *
 * FIVE RECORDED LEGS WERE RE-RUN RATHER THAN QUOTED, chosen by
 * what the new cases CALL rather than by what each leg is about,
 * and each came back at exactly its recorded figure OUTSIDE the
 * two new sections — which is the reading that says the leg was
 * rebuilt and not re-derived into a neighbour. Writing `enabled`
 * true whatever a create submitted still reddens 1 outside and
 * gains the whole refusal section, the staged row being a create
 * with `enabled: false`. Folding every created bound to null still
 * reddens 2 outside and gains the containment case, which reads
 * the two bounds in both states. Collapsing the two 404 sentences
 * still reddens exactly 1 and gained nothing, the new address row
 * naming the same subject the patch and the delete do. And the two
 * projection legs behaved oppositely: answering a member the
 * record never had still reddens 2 and gains nothing, the
 * containment projection being BUILT from a key list rather than
 * spread, while dropping a bound from the projection reddens 6
 * outside and gains the containment case — which it does only
 * because that case's fixture guard reads the planted bounds as
 * numbers rather than merely as non-null. The remaining fifteen
 * are refusal-TRANSLATION legs over the four ordinary operations,
 * and the run-now verb calls none of the rules they mutate.
 *
 * What no module mutation reaches, by construction: the table
 * guards read only the tables beside them and are aimed at a later
 * edit, such as an operation added with no row or a body half
 * deleted whole. The planted containment control is invisible to
 * every leg for the same reason and deliberately so: it proves the
 * SEARCH, where the rethrow legs prove the SUBJECT.
 * {@link EVERY_KEY_LISTED} is invisible to all of them too, and for
 * a third reason: its claim is `check-types`'s rather than this
 * suite's, so the leg that reports it is a planted column and not
 * an edit to any rule.
 */

import type {
  SubscriptionPage,
  SubscriptionServiceStore,
} from './service.js';
import type { SubscriptionRecord } from './store.js';
import type { FieldError } from '../../lib/errors/index.js';
import type {
  MovableClock,
} from '../../tests/helpers/memory-auth-store.js';
import type {
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import type { ConnectorRecord } from '../connectors/store.js';
import type { StoreWindow } from '../http/schemas.js';

import { describe, expect, it } from 'vitest';

import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors/index.js';
import {
  createMovableClock,
} from '../../tests/helpers/memory-auth-store.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import { EXPORT_FORMATS } from '../db/schema/values.js';
import { StoreRefusal } from '../db/store-errors.js';

import {
  createSubscription,
  deleteSubscription,
  listSubscriptions,
  patchSubscription,
  runSubscriptionNow,
} from './service.js';

/** The seeded worked example, and the domain every case stores. */
const RADAR = 'example-tech-radar';

/** A second domain, invented in the same neutral register. */
const TRANSIT = 'example-urban-transit';

/** A slug shaped like one and carried by no row in any case here. */
const MISSING_SLUG = 'example-not-a-domain';

/** An id shaped like one and carried by no subscription here. */
const MISSING_ID = 9999;

/**
 * An id shaped like one and carried by no connector here.
 *
 * Distinct from {@link MISSING_ID}, and not because either would
 * do: the containment block below counts this number as a NEEDLE,
 * so a value that also stands for a missing subscription would make
 * one channel unreadable against the other.
 */
const MISSING_CONNECTOR_ID = 424242;

/**
 * A day, as the cadence every planted subscription delivers at.
 *
 * Named rather than repeated, so the interval rows below are the
 * only place a number is being ARGUED about: a fixture spelling
 * `86400` eight times invites a reader to wonder which of them the
 * boundary cases are varying.
 */
const DAILY = 86400;

/**
 * The instant every clock in this file reads until a case moves
 * it.
 *
 * A literal rather than the present, because the run-now verb
 * writes what its clock answered and the case that pins the write
 * compares the two exactly. A verb reading the real present
 * answers a plausible instant no assertion could pin at all.
 */
const FIXED_INSTANT = new Date('2026-08-31T09:00:00.000Z');

/**
 * A window wider than any collection planted here.
 *
 * Wide on purpose, because a REFUSAL is the subject of every case
 * in this file: a window narrow enough to be interesting would make
 * every list refusal depend on where its rows happened to fall.
 * What the window ARRIVES as rather than what it selects is
 * `src/http/schemas.ts`'s claim, and what it SELECTS belongs to the
 * cases about what this module lets through.
 */
const WIDE_WINDOW: StoreWindow = { limit: 50, offset: 0 };

/**
 * A format the tuple does not carry, shaped like one that could.
 *
 * Lower case with no separator, so what refuses it is the
 * membership rule rather than any narrowing of the string: a
 * sentinel shaped unlike a format would be testing a rule this
 * schema does not have.
 */
const UNKNOWN_FORMAT = 'csv';

/**
 * Two domains, two connectors, three subscriptions, and the store
 * holding them.
 *
 * The shape is chosen so that the three refusals that have to be
 * WIDENED against are planted rather than asserted. {@link feed}
 * takes a SECOND format to the connector {@link digest} already
 * delivers to, and {@link foreign} takes {@link digest}'s own
 * format to that same connector under the OTHER domain — so a store
 * or a service holding any pair of the triple cannot even build
 * this fixture, and every case in the file fails at its first line
 * rather than one case failing for the right reason. The explicit
 * widening controls below are what turn that blunt signal into
 * named ones.
 */
interface PlantedSubscriptions {
  /** The store, holding {@link RADAR} and {@link TRANSIT}. */
  readonly store: MemoryResearchStore;

  /**
   * The present, as the run-now verb reads it. Fixed at
   * {@link FIXED_INSTANT} and moved only by the case that asks
   * whether the thunk is resolved at the write.
   */
  readonly clock: MovableClock;

  /**
   * The notebook connector all three planted subscriptions deliver
   * to, and so the one a duplicate collides at.
   */
  readonly vault: ConnectorRecord;

  /**
   * A second connector nothing planted delivers to, so a re-point
   * onto it is legal and a create naming it collides with nothing.
   */
  readonly inbox: ConnectorRecord;

  /**
   * A subscription of {@link RADAR}, the row every patch moves.
   */
  readonly digest: SubscriptionRecord;

  /**
   * A second subscription of {@link RADAR}, taking another format
   * to {@link vault}, and the triple a re-format collides with.
   */
  readonly feed: SubscriptionRecord;

  /**
   * A subscription of {@link TRANSIT} carrying {@link digest}'s
   * whole pair, which is the fixture asserting that the key is a
   * triple.
   */
  readonly foreign: SubscriptionRecord;
}

/**
 * Plants that shape through the service under test.
 *
 * Through {@link createSubscription} rather than through the store,
 * so every case starts from writes this module accepted. A planting
 * helper reaching past the subject would leave the whole file green
 * against a `createSubscription` that refused everything.
 *
 * The two connectors go in through the STORE, which is the one
 * place this file plants past a subject and is not an exception at
 * all: `ConnectorStore` is a different port with a service of its
 * own, and `src/connectors/service.test.ts` is where a connector
 * write is under test. What this file needs from them is that the
 * rows exist.
 *
 * @returns The store, the two connectors and the three rows.
 */
async function plantSubscriptions(): Promise<PlantedSubscriptions> {
  const store = createMemoryResearchStore();
  const clock = createMovableClock(FIXED_INSTANT);

  await store.insertDomain({ slug: RADAR, name: 'Radar', settings: {} });
  await store.insertDomain({ slug: TRANSIT, name: 'Transit', settings: {} });

  const vault = await store.insertConnector({
    kind: 'notebook',
    name: 'research vault',
    config: {},
  });
  const inbox = await store.insertConnector({
    kind: 'export_target',
    name: 'weekly inbox',
    config: {},
  });
  const digest = await createSubscription(store, RADAR, {
    format: 'obsidian_md',
    connectorId: vault.id,
    intervalSeconds: DAILY,
  });
  const feed = await createSubscription(store, RADAR, {
    format: 'rss',
    connectorId: vault.id,
    intervalSeconds: DAILY,
    minIntervalSeconds: 3600,
    maxIntervalSeconds: 604800,
  });
  const foreign = await createSubscription(store, TRANSIT, {
    format: 'obsidian_md',
    connectorId: vault.id,
    intervalSeconds: DAILY,
  });

  return { store, clock, vault, inbox, digest, feed, foreign };
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
 * `message` is not among them for the details zod raised: their
 * wording is asserted in `src/http/validation.ts`. The connector
 * detail is this module's own and its message IS pinned, in the
 * case named for it, so nothing here is reading a sentence twice.
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
 * @returns What the body carries under that key, or undefined. The
 *   companion to {@link bodyCarries}, for a guard that has to read
 *   a submitted VALUE rather than only ask whether one was sent.
 */
function bodyValue(body: unknown, key: string): unknown {
  return bodyCarries(body, key)
    ? (body as Record<string, unknown>)[key]
    : undefined;
}

// ---------------------------------------------------------------------------
// An address that names nothing
// ---------------------------------------------------------------------------

/** Every function this module exports. */
const OPERATIONS = [
  'createSubscription',
  'deleteSubscription',
  'listSubscriptions',
  'patchSubscription',
  'runSubscriptionNow',
];

/**
 * One operation asked for something that is not there, beside the
 * same operation asked for something that is.
 *
 * The control is a member of the row rather than a table of its
 * own, because the two are one claim: a 404 for an address naming
 * nothing means nothing unless the identical call against a real
 * address answers.
 */
interface MissingCase {
  /** The exported function under test, and the row label. */
  readonly operation: string;

  /**
   * Which address was wrong. Two subjects reach these five
   * operations — a `:slug` that names no domain, and an `:id` that
   * names no subscription — and a caller has to be able to tell
   * which, since the two are fixed in different places.
   */
  readonly subject: 'domain' | 'subscription';

  /** The call that has to be refused. */
  readonly refuse: (planted: PlantedSubscriptions) => Promise<unknown>;

  /** The same call against an address that is there. */
  readonly control: (planted: PlantedSubscriptions) => Promise<unknown>;
}

/** Every operation that can be handed an address naming no row. */
const MISSING_CASES: readonly MissingCase[] = [
  {
    operation: 'listSubscriptions',
    subject: 'domain',
    refuse: ({ store }) => listSubscriptions(
      store,
      MISSING_SLUG,
      WIDE_WINDOW,
    ),
    control: ({ store }) => listSubscriptions(store, RADAR, WIDE_WINDOW),
  },
  {
    // The body is a legal one and names a connector that is there,
    // so what this row measures is the slug and nothing else. A row
    // sending a fault of its own would answer 422 and pass for a
    // 404 nobody checked.
    operation: 'createSubscription',
    subject: 'domain',
    refuse: ({ store, inbox }) => createSubscription(store, MISSING_SLUG, {
      format: 'pdf',
      connectorId: inbox.id,
      intervalSeconds: DAILY,
    }),
    control: ({ store, inbox }) => createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: inbox.id,
      intervalSeconds: DAILY,
    }),
  },
  {
    operation: 'patchSubscription',
    subject: 'subscription',
    refuse: ({ store }) => patchSubscription(store, MISSING_ID, {
      intervalSeconds: 900,
    }),
    control: ({ store, digest }) => patchSubscription(store, digest.id, {
      intervalSeconds: 900,
    }),
  },
  {
    operation: 'deleteSubscription',
    subject: 'subscription',
    refuse: ({ store }) => deleteSubscription(store, MISSING_ID),
    control: ({ store, digest }) => deleteSubscription(store, digest.id),
  },
  {
    // The verb reads the stored row before it decides, so an id
    // naming nothing is answered by the LOOKUP rather than by the
    // write — and the control is an enabled row, since the other
    // state this verb refuses is a 409 and would pass for a
    // missing address on a case reading only that something threw.
    operation: 'runSubscriptionNow',
    subject: 'subscription',
    refuse: ({ store, clock }) => runSubscriptionNow(
      store,
      clock.now,
      MISSING_ID,
    ),
    control: ({ store, clock, digest }) => runSubscriptionNow(
      store,
      clock.now,
      digest.id,
    ),
  },
];

describe('an address that names nothing', () => {
  it('covers every operation this module exports', () => {
    // Paired by name rather than by count, so a sixth operation
    // added to the module without a row here is this case failing
    // rather than a table that quietly covers five of six. The
    // run-now verb owed a row here and has one: it addresses a
    // subscription by id exactly as the patch and the delete do.
    expect(MISSING_CASES.map((row) => row.operation).sort())
      .toEqual([...OPERATIONS].sort());
  });

  it('carries rows for both addresses a path can name', () => {
    expect([...new Set(MISSING_CASES.map((row) => row.subject))].sort())
      .toEqual(['domain', 'subscription']);
  });

  for (const row of MISSING_CASES) {
    it(`answers 404 from ${row.operation}`, async () => {
      const planted = await plantSubscriptions();
      const refusal = await refusalFrom(() => row.refuse(planted));

      expect(refusal).toBeInstanceOf(NotFoundError);
      expect(refusal.code).toBe('NOT_FOUND');
      expect(refusal.statusCode).toBe(404);
      expect(refusal.details).toBeUndefined();
    });

    it(`answers ${row.operation} for an address that is`, async () => {
      // The positive control for the row above, varied along the
      // one axis under test: the same operation, the same body, an
      // address that resolves. A module refusing everything passes
      // the refusal case and fails this one.
      const planted = await plantSubscriptions();

      await expect(row.control(planted)).resolves.not.toThrow();
    });
  }

  it('says which of the two addresses was wrong', async () => {
    // Not a pin on the wording, which is free to change: a pin on
    // the DISTINCTION. A module answering one sentence to both
    // would send an operator to fix a slug when the id was the
    // fault, and is green against every case above.
    const planted = await plantSubscriptions();
    const said = new Map<string, Set<string>>();

    for (const row of MISSING_CASES) {
      const refusal = await refusalFrom(() => row.refuse(planted));
      const seen = said.get(row.subject) ?? new Set<string>();

      seen.add(refusal.message);
      said.set(row.subject, seen);
    }

    const messages = [...said].map(([subject, seen]) => ({
      subject,
      distinct: seen.size,
    }));

    // One sentence per subject, and two subjects: so the map holds
    // exactly two messages and neither is shared.
    expect(messages.sort((left, right) => left.subject < right.subject
      ? -1
      : 1)).toEqual([
      { subject: 'domain', distinct: 1 },
      { subject: 'subscription', distinct: 1 },
    ]);

    const everySentence = [...said.values()].flatMap((seen) => [...seen]);

    expect(new Set(everySentence).size).toBe(2);
  });

  it('leaves the collection alone when it refuses', async () => {
    // A delete refused for naming nothing must not have taken
    // something else on the way past. Read back through the list,
    // not off the refusal.
    const planted = await plantSubscriptions();

    await refusalFrom(() => deleteSubscription(planted.store, MISSING_ID));

    const page = await listSubscriptions(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map((row) => row.format))
      .toEqual(['obsidian_md', 'rss']);
    expect(page.total).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// A connector the deployment does not carry
// ---------------------------------------------------------------------------

/**
 * The two writes that can carry a `connectorId`, and so the two
 * that can be refused for one.
 */
const CONNECTOR_OPERATIONS = ['create', 'patch'];

/** One write naming a connector that is not there. */
interface UnknownConnectorCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** Which operation is handed the id. */
  readonly operation: string;

  /** The write naming {@link MISSING_CONNECTOR_ID}. */
  readonly refuse: (planted: PlantedSubscriptions) => Promise<unknown>;
}

/**
 * Both ways a caller can name a connector the deployment does not
 * carry.
 *
 * BOTH ARE HERE BECAUSE BOTH CAN REACH THE READ.
 * `SubscriptionPatch` carries `connectorId`, so a re-point can name
 * a row that is not there exactly as a create can — and a re-point
 * is the likelier of the two in a deployment, since a destination
 * is chosen once and moved between services later.
 */
const UNKNOWN_CONNECTOR_CASES: readonly UnknownConnectorCase[] = [
  {
    label: 'a create delivering to a connector that is not there',
    operation: 'create',
    refuse: ({ store }) => createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: MISSING_CONNECTOR_ID,
      intervalSeconds: DAILY,
    }),
  },
  {
    label: 'a re-point onto a connector that is not there',
    operation: 'patch',
    refuse: ({ store, digest }) => patchSubscription(store, digest.id, {
      connectorId: MISSING_CONNECTOR_ID,
    }),
  },
];

describe('a connector the deployment does not carry', () => {
  it('carries rows for both writes that can name one', () => {
    expect([...new Set(
      UNKNOWN_CONNECTOR_CASES.map((row) => row.operation),
    )].sort()).toEqual([...CONNECTOR_OPERATIONS].sort());
  });

  for (const row of UNKNOWN_CONNECTOR_CASES) {
    it(`answers 422 to ${row.label}`, async () => {
      // A 422 rather than a 404, because the id is a body member
      // and not an address: what the caller can act on is being
      // told WHICH member named nothing.
      const planted = await plantSubscriptions();
      const refusal = await refusalFrom(() => row.refuse(planted));

      expect(refusal).toBeInstanceOf(ValidationError);
      expect(refusal.code).toBe('VALIDATION_ERROR');
      expect(refusal.statusCode).toBe(422);
      expect(detailsOf(refusal.details as FieldError[] | undefined))
        .toEqual([{ field: 'connectorId', code: 'unknown_connector' }]);
    });
  }

  it('says the connector is not there, and nothing else', async () => {
    // The one detail this module builds by hand rather than
    // reading off zod, so its message is pinned here and not in
    // `src/http/validation.ts`. The id is deliberately absent from
    // it; the containment block below is what measures that.
    const { store } = await plantSubscriptions();
    const refusal = await refusalFrom(() => createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: MISSING_CONNECTOR_ID,
      intervalSeconds: DAILY,
    }));
    const details = (refusal.details ?? []) as FieldError[];

    expect(refusal.message).toBe('Validation failed');
    expect(details.map((detail) => detail.message))
      .toEqual(['No connector carries that id']);
  });

  it('creates against a connector the deployment carries', async () => {
    // The narrow control: a module refusing every create passes
    // the create row above and fails this one.
    const { store, inbox } = await plantSubscriptions();
    const created = await createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: inbox.id,
      intervalSeconds: DAILY,
    });

    expect(created.connectorId).toBe(inbox.id);
  });

  it('re-points onto a connector the deployment carries', async () => {
    // The same control for the other write. The two are separate
    // cases because the two call sites are separate, and a module
    // that had stopped resolving on one of them passes the other.
    const { store, digest, inbox } = await plantSubscriptions();
    const patched = await patchSubscription(store, digest.id, {
      connectorId: inbox.id,
    });

    expect(patched.connectorId).toBe(inbox.id);
    expect(patched.id).toBe(digest.id);
  });

  it('patches a row without naming a connector at all', async () => {
    // The control that says the resolution is CONDITIONAL. A
    // module reading a connector on every patch would have to get
    // the id from somewhere, and the only place is the stored row
    // — a read this port does not offer the patch. What reports
    // that here is a patch naming no connector answering at all.
    const { store, digest } = await plantSubscriptions();
    const patched = await patchSubscription(store, digest.id, {
      intervalSeconds: 900,
    });

    expect(patched.intervalSeconds).toBe(900);
    expect(patched.connectorId).toBe(digest.connectorId);
  });

  it('leaves the row pointed where it was when it refuses', async () => {
    // Read back through the list rather than off the refusal: a
    // resolution that answered 422 after writing would satisfy
    // every assertion above.
    const planted = await plantSubscriptions();

    await refusalFrom(() => patchSubscription(
      planted.store,
      planted.digest.id,
      { connectorId: MISSING_CONNECTOR_ID },
    ));

    const page = await listSubscriptions(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map((row) => row.connectorId))
      .toEqual([planted.vault.id, planted.vault.id]);
  });

  it('answers the slug when a create gets both wrong', async () => {
    // The create resolves its address before its connector, so an
    // unknown connector under an unknown slug answers the SLUG. It
    // is not a precedence choice: the insert needs the domain id,
    // so that read has to happen and happens first.
    const { store } = await plantSubscriptions();
    const refusal = await refusalFrom(
      () => createSubscription(store, MISSING_SLUG, {
        format: 'pdf',
        connectorId: MISSING_CONNECTOR_ID,
        intervalSeconds: DAILY,
      }),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });

  it('answers the connector when a patch gets both wrong', async () => {
    // The opposite ordering, and deliberately: the patch resolves
    // no address at all, the store answering `null` at the write,
    // so the connector read is what comes first. A module that had
    // folded the two orderings into one rule fails this case or
    // the one above, and no other case in this file reports it.
    const { store } = await plantSubscriptions();
    const refusal = await refusalFrom(
      () => patchSubscription(store, MISSING_ID, {
        connectorId: MISSING_CONNECTOR_ID,
      }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([{ field: 'connectorId', code: 'unknown_connector' }]);
  });
});

// ---------------------------------------------------------------------------
// A triple the domain already subscribes to
// ---------------------------------------------------------------------------

/**
 * The two writes that can propose a triple, and so the two that can
 * be refused for one.
 *
 * BOTH ARE HERE BECAUSE BOTH CAN REACH THE KEY. `SubscriptionPatch`
 * carries `format` and `connectorId`, two of the three columns the
 * key is over, so a table driven through the create alone would
 * leave the update's translation pinned by nothing — and either
 * patch reaches the key from a different direction, which is why
 * there are two patch rows rather than one.
 */
interface DuplicateCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The write proposing a triple the domain already subscribes to. */
  readonly refuse: (planted: PlantedSubscriptions) => Promise<unknown>;
}

/** Every way a caller can propose a triple that is taken. */
const DUPLICATE_CASES: readonly DuplicateCase[] = [
  {
    label: 'a create of a format the domain takes there already',
    refuse: ({ store, digest, vault }) => createSubscription(store, RADAR, {
      format: digest.format,
      connectorId: vault.id,
      intervalSeconds: DAILY,
    }),
  },
  {
    label: 'a re-format onto a triple the domain carries',
    refuse: ({ store, digest, feed }) => patchSubscription(store, digest.id, {
      format: feed.format,
    }),
  },
  {
    label: 'a re-point onto a triple the domain carries',
    refuse: async (planted) => {
      // The other third of the key, reached by moving a row's
      // DESTINATION rather than its format. Staged in two steps
      // because the fixture holds no pair a single re-point would
      // collide with: `digest` is moved out to the second
      // connector, a row is created in its place, and the re-point
      // back is what meets the key.
      await patchSubscription(planted.store, planted.digest.id, {
        connectorId: planted.inbox.id,
      });
      await createSubscription(planted.store, RADAR, {
        format: planted.digest.format,
        connectorId: planted.vault.id,
        intervalSeconds: DAILY,
      });

      return patchSubscription(planted.store, planted.digest.id, {
        connectorId: planted.vault.id,
      });
    },
  },
];

describe('a triple the domain already subscribes to', () => {
  it('labels every row distinctly', () => {
    const labels = DUPLICATE_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  for (const row of DUPLICATE_CASES) {
    it(`answers 409 to ${row.label}`, async () => {
      // `StoreRefusal` is deliberately not an `AppError`, so an
      // untranslated one answers 500 through the framework
      // handler. The assertions pin the translation and not merely
      // that something was thrown.
      const planted = await plantSubscriptions();
      const refusal = await refusalFrom(() => row.refuse(planted));

      expect(refusal).toBeInstanceOf(ConflictError);
      expect(refusal.code).toBe('CONFLICT');
      expect(refusal.statusCode).toBe(409);

      // No `details`: the refusal is one fact, and the per-table
      // counts a connector delete carries have no analogue here.
      expect(refusal.details).toBeUndefined();
    });
  }

  it('takes a format the domain does not take there yet', async () => {
    // The narrow control: a module refusing every create passes
    // the create row above and fails this one.
    const { store, vault } = await plantSubscriptions();
    const created = await createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: vault.id,
      intervalSeconds: DAILY,
    });

    expect(created.format).toBe('pdf');
  });

  it('re-formats onto a triple the domain does not carry', async () => {
    // The same control for the other write. The two are separate
    // cases because the two translations are separate call sites,
    // and a module that had stopped translating one of them passes
    // the other.
    const { store, digest } = await plantSubscriptions();
    const patched = await patchSubscription(store, digest.id, {
      format: 'pdf',
    });

    expect(patched.format).toBe('pdf');
    expect(patched.id).toBe(digest.id);
  });

  it('takes one format to a second connector', async () => {
    // The first WIDENING control, and one of the two the narrow
    // controls cannot stand in for: the key is over a TRIPLE, so a
    // domain delivering one format to two destinations is
    // ordinary. A service or a store holding the key over
    // `(domain, format)` refuses this and passes every case above.
    const { store, digest, inbox } = await plantSubscriptions();
    const created = await createSubscription(store, RADAR, {
      format: digest.format,
      connectorId: inbox.id,
      intervalSeconds: DAILY,
    });

    expect(created.format).toBe(digest.format);
    expect(created.connectorId).toBe(inbox.id);
  });

  it('takes a second format to one connector', async () => {
    // The other pair, held over `(domain, connector)`. The
    // fixture already plants one such row, so this reads the rule
    // through a write of its own rather than through a row that
    // was there when the case started.
    const { store, vault } = await plantSubscriptions();
    const created = await createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: vault.id,
      intervalSeconds: DAILY,
    });

    expect(created.connectorId).toBe(vault.id);
    expect(created.format).toBe('pdf');
  });

  it('takes the same pair under a second domain', async () => {
    // The third pair, `(format, connector)`, and the one a key
    // held across the table rather than within a domain refuses.
    // The fixture plants a row exactly like this one, which is
    // what makes a globally-held key fail at the first line of
    // every case rather than here; this reads it through a write.
    const planted = await plantSubscriptions();
    const created = await createSubscription(planted.store, TRANSIT, {
      format: planted.feed.format,
      connectorId: planted.vault.id,
      intervalSeconds: DAILY,
    });

    expect(created.format).toBe(planted.feed.format);
    expect(created.domainId).not.toBe(planted.feed.domainId);
  });

  it('leaves a row holding the triple it already had', async () => {
    // A row is not in conflict with itself: a patch naming the
    // format and the connector the addressed row already carries
    // is a no-op and not a 409. A store checking the resulting
    // triple without excluding the row being written refuses this,
    // and nothing else in the file reports it.
    const { store, digest } = await plantSubscriptions();
    const patched = await patchSubscription(store, digest.id, {
      format: digest.format,
      connectorId: digest.connectorId,
    });

    expect(patched).toStrictEqual(digest);
  });

  it('leaves both rows standing when it refuses a re-format', async () => {
    // Read back through the list rather than off the refusal: a
    // translation that answered 409 after writing would satisfy
    // every assertion above.
    const planted = await plantSubscriptions();

    await refusalFrom(() => patchSubscription(
      planted.store,
      planted.digest.id,
      { format: planted.feed.format },
    ));

    const page = await listSubscriptions(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map((row) => row.format))
      .toEqual(['obsidian_md', 'rss']);
  });

  it('keeps the refusal off the second domain', async () => {
    // The create below was refused; the other domain's
    // subscription carrying that same pair is untouched, which is
    // the widening control restated over a refusal rather than an
    // acceptance.
    const planted = await plantSubscriptions();

    await refusalFrom(() => createSubscription(planted.store, RADAR, {
      format: planted.digest.format,
      connectorId: planted.vault.id,
      intervalSeconds: DAILY,
    }));

    const page = await listSubscriptions(planted.store, TRANSIT, WIDE_WINDOW);

    expect(page.rows.map((row) => row.id)).toEqual([planted.foreign.id]);
  });
});

// ---------------------------------------------------------------------------
// The bodies these operations refuse
// ---------------------------------------------------------------------------

/** The two operations {@link BODY_CASES} covers. */
const BODY_OPERATIONS = ['create', 'patch'];

/**
 * The columns this table's pipeline writes and this surface never
 * accepts, plus one a sibling table carries.
 *
 * `nextRunAt` is `export_subscriptions`'s own: `ar-dispatch` writes
 * it inside the claim it reschedules with, and the only door onto
 * it from here is `runSubscriptionNow`, which reads no body at all
 * and so cannot be reached by a member of one.
 * `flagged` is not a column of this table at all — it is a source's
 * — and it is here for exactly that reason: the refusal is
 * `.strict()` doing its ordinary work rather than a per-column
 * check, so a member no table carries is refused by the same clause
 * that refuses one another table does.
 */
const PIPELINE_OWNED = ['flagged', 'nextRunAt'];

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
 * The bodies the two writes have to refuse.
 *
 * Both carry rows of their own rather than sharing them. They run
 * through one `parseBody`, so a mutation degrading that function
 * reddens both halves equally and a table driven through one of
 * them would pin only that the two share an implementation — while
 * the two schemas genuinely differ, `format`, `connectorId` and
 * `intervalSeconds` being required by one and optional on the
 * other.
 *
 * Every row here is submitted to a SERVICE function rather than to
 * a schema, which is the point: it is what says an MCP tool in wave
 * 3 cannot be handed a body the HTTP route would have refused.
 *
 * THE FORMAT ROWS ARE THREE CLAIMS UNDER ONE CODE. An enum answers
 * `invalid_value` for a member outside the tuple, for an ABSENT
 * member and for an explicit `null` alike — measured through
 * `parseBody` rather than assumed, and where a plain string would
 * answer `invalid_type` for two of the three. The three rows are
 * kept because the BODIES differ even where the detail does not: a
 * schema made optional accepts the second and still refuses the
 * first, and no other row here would report it.
 *
 * THE CADENCE ROWS DISTINGUISH TWO FAULTS THAT READ ALIKE. Zero and
 * a negative are `too_small`, which is `.positive()` answering; a
 * fraction is `invalid_type`, which is `.int()` answering before
 * it. Both are wanted and neither substitutes for the other: a
 * schema that had kept `.int()` and dropped `.positive()` accepts
 * the zero row while still refusing the fraction. The `connectorId`
 * rows repeat the pair on a member whose refusal for SHAPE has to
 * stay distinct from its refusal for naming nothing — the two
 * answer different codes at the same field, which is the whole
 * reason the hand-built one carries a code of its own.
 *
 * There is no open record on this surface, so no row carries a `*`
 * and no call below passes `openPaths`. A subscription body is six
 * declared members and nothing else — which is what makes the
 * undeclared-member rows below say what they say.
 */
const BODY_CASES: readonly BodyCase[] = [
  {
    label: 'a create body that is not an object',
    operation: 'create',
    body: null,
    details: [{ field: 'body', code: 'invalid_type' }],
  },
  {
    label: 'a create body carrying none of the three required',
    operation: 'create',
    body: {},
    details: [
      { field: 'format', code: 'invalid_value' },
      { field: 'connectorId', code: 'invalid_type' },
      { field: 'intervalSeconds', code: 'invalid_type' },
    ],
  },
  {
    label: 'a create body rendering a format nothing renders',
    operation: 'create',
    body: { format: UNKNOWN_FORMAT, connectorId: 1, intervalSeconds: DAILY },
    details: [{ field: 'format', code: 'invalid_value' }],
  },
  {
    label: 'a create body leaving the format off',
    operation: 'create',
    body: { connectorId: 1, intervalSeconds: DAILY },
    details: [{ field: 'format', code: 'invalid_value' }],
  },
  {
    label: 'a create body leaving the connector off',
    operation: 'create',
    body: { format: 'pdf', intervalSeconds: DAILY },
    details: [{ field: 'connectorId', code: 'invalid_type' }],
  },
  {
    label: 'a create body delivering every zero seconds',
    operation: 'create',
    body: { format: 'pdf', connectorId: 1, intervalSeconds: 0 },
    details: [{ field: 'intervalSeconds', code: 'too_small' }],
  },
  {
    label: 'a create body delivering every minus day',
    operation: 'create',
    body: { format: 'pdf', connectorId: 1, intervalSeconds: -DAILY },
    details: [{ field: 'intervalSeconds', code: 'too_small' }],
  },
  {
    label: 'a create body delivering every second and a half',
    operation: 'create',
    body: { format: 'pdf', connectorId: 1, intervalSeconds: 1.5 },
    details: [{ field: 'intervalSeconds', code: 'invalid_type' }],
  },
  {
    label: 'a create body naming connector zero',
    operation: 'create',
    body: { format: 'pdf', connectorId: 0, intervalSeconds: DAILY },
    details: [{ field: 'connectorId', code: 'too_small' }],
  },
  {
    label: 'a create body naming a connector by name',
    operation: 'create',
    body: {
      format: 'pdf',
      connectorId: 'research vault',
      intervalSeconds: DAILY,
    },
    details: [{ field: 'connectorId', code: 'invalid_type' }],
  },
  {
    label: 'a create body flooring at zero seconds',
    operation: 'create',
    body: {
      format: 'pdf',
      connectorId: 1,
      intervalSeconds: DAILY,
      minIntervalSeconds: 0,
    },
    details: [{ field: 'minIntervalSeconds', code: 'too_small' }],
  },
  {
    label: 'a create body scheduling its own first delivery',
    operation: 'create',
    body: {
      format: 'pdf',
      connectorId: 1,
      intervalSeconds: DAILY,
      nextRunAt: '2026-08-31T09:00:00.000Z',
    },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a create body naming its own domain',
    operation: 'create',
    body: {
      format: 'pdf',
      connectorId: 1,
      intervalSeconds: DAILY,
      domainId: 1,
    },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a create body flagging itself',
    operation: 'create',
    body: {
      format: 'pdf',
      connectorId: 1,
      intervalSeconds: DAILY,
      flagged: true,
    },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch body that is not an object',
    operation: 'patch',
    body: 7,
    details: [{ field: 'body', code: 'invalid_type' }],
  },
  {
    label: 'a patch rendering a format nothing renders',
    operation: 'patch',
    body: { format: UNKNOWN_FORMAT },
    details: [{ field: 'format', code: 'invalid_value' }],
  },
  {
    label: 'a patch clearing the format with null',
    operation: 'patch',
    body: { format: null },
    details: [{ field: 'format', code: 'invalid_value' }],
  },
  {
    label: 'a patch delivering every zero seconds',
    operation: 'patch',
    body: { intervalSeconds: 0 },
    details: [{ field: 'intervalSeconds', code: 'too_small' }],
  },
  {
    label: 'a patch clearing the cadence with null',
    operation: 'patch',
    body: { intervalSeconds: null },
    details: [{ field: 'intervalSeconds', code: 'invalid_type' }],
  },
  {
    label: 'a patch naming connector zero',
    operation: 'patch',
    body: { connectorId: 0 },
    details: [{ field: 'connectorId', code: 'too_small' }],
  },
  {
    label: 'a patch clearing the connector with null',
    operation: 'patch',
    body: { connectorId: null },
    details: [{ field: 'connectorId', code: 'invalid_type' }],
  },
  {
    label: 'a patch flooring at zero seconds',
    operation: 'patch',
    body: { minIntervalSeconds: 0 },
    details: [{ field: 'minIntervalSeconds', code: 'too_small' }],
  },
  {
    label: 'a patch moving its own next delivery',
    operation: 'patch',
    body: { nextRunAt: '2026-08-31T09:00:00.000Z' },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch proposing a move between domains',
    operation: 'patch',
    body: { domainId: 2 },
    details: [{ field: 'body', code: 'unrecognized_keys' }],
  },
  {
    label: 'a patch clearing the flag',
    operation: 'patch',
    body: { flagged: false },
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
  planted: PlantedSubscriptions,
  row: BodyCase,
): Promise<unknown> {
  return row.operation === 'create'
    ? createSubscription(planted.store, RADAR, row.body)
    : patchSubscription(planted.store, planted.digest.id, row.body);
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

  it('submits a format the tuple does not carry', () => {
    // Read off the imported tuple rather than off a list retyped
    // here, which makes the guard two-directional for free: a
    // format ADDED to `EXPORT_FORMATS` fails this case — the row
    // it was named for having become a legal request — instead of
    // leaving a case asserting a refusal that is no longer one.
    const outside = BODY_CASES.filter((row) => {
      const format = bodyValue(row.body, 'format');

      return typeof format === 'string'
        && !(EXPORT_FORMATS as readonly string[]).includes(format);
    });

    expect(outside.map((row) => row.operation).sort())
      .toEqual([...BODY_OPERATIONS].sort());
    expect([...new Set(outside.flatMap(
      (row) => row.details.map((detail) => detail.code),
    ))]).toEqual(['invalid_value']);
  });

  it('refuses a cadence of zero from both operations', () => {
    // The scoped claim, held against the table rather than against
    // a memory of what was written into it: a row deleted from
    // either half stops this file covering the refusal it is named
    // for, and nothing else here would report it. Read off the
    // BODY rather than the label, so renaming a row cannot satisfy
    // this.
    const zeroed = BODY_CASES.filter(
      (row) => bodyValue(row.body, 'intervalSeconds') === 0,
    );

    expect(zeroed.map((row) => row.operation).sort())
      .toEqual([...BODY_OPERATIONS].sort());
    expect(zeroed.every((row) => row.details.length === 1)).toBe(true);
    expect([...new Set(zeroed.flatMap(
      (row) => row.details.map((detail) => detail.code),
    ))]).toEqual(['too_small']);
  });

  it('refuses a connector id for its shape from both', () => {
    // The rows that make the hand-built refusal readable: this
    // member is refused at the same FIELD for two different
    // reasons, so a caller branching on the field alone could not
    // tell a malformed id from one that named nothing. What tells
    // them apart is the code, and these rows are the half of that
    // pair the schema owns.
    const shaped = BODY_CASES.filter(
      (row) => bodyCarries(row.body, 'connectorId')
        && row.details.some((detail) => detail.field === 'connectorId'),
    );

    expect(shaped.map((row) => row.operation).sort())
      .toEqual(['create', 'create', 'patch', 'patch']);
    expect([...new Set(shaped.flatMap(
      (row) => row.details.map((detail) => detail.code),
    ))].sort()).toEqual(['invalid_type', 'too_small']);
  });

  it('refuses every pipeline-owned member from both', () => {
    // One reading per member rather than one over the set, so a
    // member submitted through the create alone is this case
    // naming which one rather than a count that still adds up.
    const reach = PIPELINE_OWNED.map((key) => ({
      key,
      operations: [...new Set(BODY_CASES
        .filter((row) => bodyCarries(row.body, key))
        .map((row) => row.operation))].sort(),
    }));

    expect(reach).toEqual(PIPELINE_OWNED.map((key) => ({
      key,
      operations: [...BODY_OPERATIONS].sort(),
    })));
  });

  for (const row of BODY_CASES) {
    it(`refuses ${row.label}`, async () => {
      const planted = await plantSubscriptions();
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
    // operation, naming every member each schema declares: a
    // module refusing every body passes all twenty-five rows above
    // and fails this.
    const { store, digest, inbox } = await plantSubscriptions();
    const created = await createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: inbox.id,
      intervalSeconds: DAILY,
      enabled: false,
      minIntervalSeconds: 3600,
      maxIntervalSeconds: 604800,
    });
    const patched = await patchSubscription(store, digest.id, {
      format: 'email_draft',
      connectorId: inbox.id,
      intervalSeconds: 1800,
      enabled: false,
      minIntervalSeconds: 300,
      maxIntervalSeconds: 43200,
    });

    expect(created.format).toBe('pdf');
    expect(patched.format).toBe('email_draft');
  });

  it('accepts every format the tuple carries', async () => {
    // The other direction of the enum, and the one no refusal row
    // can reach: narrowing the schema to four of the five formats
    // passes every row above and fails only this. Looped over the
    // runtime tuple, so a format added to `EXPORT_FORMATS` is
    // covered the day it lands.
    const { store, inbox } = await plantSubscriptions();
    const landed: string[] = [];

    for (const format of EXPORT_FORMATS) {
      const created = await createSubscription(store, TRANSIT, {
        format,
        connectorId: inbox.id,
        intervalSeconds: DAILY,
      });

      landed.push(created.format);
    }

    expect(landed).toEqual([...EXPORT_FORMATS]);
    expect(EXPORT_FORMATS.length).toBeGreaterThan(1);
  });

  it('accepts a cadence of one second from both', async () => {
    // The boundary control for the zero rows, a single step from
    // the value they refuse. A schema that had stopped checking
    // the interval at all passes those rows' neighbours and fails
    // them; a schema refusing every interval passes them and fails
    // this. Neither reading is available from one of the two.
    const { store, digest, inbox } = await plantSubscriptions();
    const created = await createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: inbox.id,
      intervalSeconds: 1,
    });
    const patched = await patchSubscription(store, digest.id, {
      intervalSeconds: 1,
    });

    expect(created.intervalSeconds).toBe(1);
    expect(patched.intervalSeconds).toBe(1);
  });

  it('accepts a bound cleared with null from the patch', async () => {
    // The control for the two nullable members, and the one the
    // cadence rows cannot stand in for: `intervalSeconds` refuses
    // a null and a bound accepts one, because clearing a floor is
    // expressible in no other way. A patch schema that dropped
    // `.nullable()` from the bounds passes every row above and
    // fails only this.
    const { store, feed } = await plantSubscriptions();
    const patched = await patchSubscription(store, feed.id, {
      minIntervalSeconds: null,
      maxIntervalSeconds: null,
    });

    expect(patched.minIntervalSeconds).toBeNull();
    expect(patched.maxIntervalSeconds).toBeNull();
  });

  it('accepts a patch that carries no member at all', async () => {
    // The port's rule rather than this module's:
    // `export_subscriptions` has no `updated_at`, so an empty
    // patch has nothing to set and answers the stored row. A
    // schema making any member required refuses this and passes
    // every row above.
    const { store, digest } = await plantSubscriptions();
    const patched = await patchSubscription(store, digest.id, {});

    expect(patched).toStrictEqual(digest);
  });

  it('refuses a malformed patch against an id that is not', async () => {
    // The body is parsed before the id is resolved, so the same
    // patch answers the same refusal either way. A module
    // resolving first would answer this 404 and the matching row
    // above 422, which would make a caller's error depend on rows
    // it never asked about.
    const { store } = await plantSubscriptions();
    const refusal = await refusalFrom(
      () => patchSubscription(store, MISSING_ID, { intervalSeconds: 0 }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([{ field: 'intervalSeconds', code: 'too_small' }]);
  });

  it('refuses a malformed create against a slug that is not', async () => {
    // The same ordering claim on the other operation.
    // `createSubscription` parses, then resolves the domain, so a
    // body fault outranks a slug that names nothing.
    const { store } = await plantSubscriptions();
    const refusal = await refusalFrom(
      () => createSubscription(store, MISSING_SLUG, {
        format: UNKNOWN_FORMAT,
        connectorId: 0,
        intervalSeconds: DAILY,
      }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([
        { field: 'format', code: 'invalid_value' },
        { field: 'connectorId', code: 'too_small' },
      ]);
  });
});

// ---------------------------------------------------------------------------
// What only a lost race can produce
// ---------------------------------------------------------------------------

describe('what only a lost race can produce', () => {
  it('answers 404 when the domain went between the two', async () => {
    // The first of the two branches the ordinary fixture cannot
    // reach: `createSubscription` resolves the domain and only
    // then writes, so a foreign-key refusal means the row was
    // deleted in between. Reconstructed rather than stubbed — the
    // domain is really removed, and the lookup really answers the
    // row it had — so what the write meets is the store's own
    // refusal. The answer is the same 404 the lookup itself
    // raises, because it is the same fact.
    const { store, inbox } = await plantSubscriptions();
    const found = await store.findDomainBySlug(RADAR);

    if (found === null) {
      throw new Error('the fixture planted no domain to capture');
    }

    await store.deleteDomain(found.id);

    const vanished: SubscriptionServiceStore = {
      ...store,
      findDomainBySlug: async () => found,
    };
    const refusal = await refusalFrom(
      () => createSubscription(vanished, RADAR, {
        format: 'pdf',
        connectorId: inbox.id,
        intervalSeconds: DAILY,
      }),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
    expect(refusal.cause).toBeInstanceOf(StoreRefusal);
  });

  it('answers 404 rather than the 409 a taken triple gets', async () => {
    // The narrow claim inside the case above: two of the reasons
    // `SubscriptionStore` declares are told apart. A translator
    // keying on `instanceof StoreRefusal` alone would answer one
    // status to both, and would pass every duplicate case here.
    //
    // The domain is deleted, which takes its subscriptions with it
    // through the cascade, so the triple this create proposes is
    // free by the time the write runs — and it is still the triple
    // the fixture collided on, which is what makes the two
    // refusals genuinely competing for this one call.
    const { store, digest, vault } = await plantSubscriptions();
    const found = await store.findDomainBySlug(RADAR);

    if (found === null) {
      throw new Error('the fixture planted no domain to capture');
    }

    await store.deleteDomain(found.id);

    const vanished: SubscriptionServiceStore = {
      ...store,
      findDomainBySlug: async () => found,
    };
    const refusal = await refusalFrom(
      () => createSubscription(vanished, RADAR, {
        format: digest.format,
        connectorId: vault.id,
        intervalSeconds: DAILY,
      }),
    );

    expect(refusal.code).toBe('NOT_FOUND');
    expect(refusal.code).not.toBe('CONFLICT');
  });

  it('answers the insert 404 when the CONNECTOR raced', async () => {
    // The module's stated misattribution, pinned as one rather
    // than left for a reader to discover. Two foreign keys reach
    // the insert and this layer reads no constraint name, so both
    // answer the domain sentence — which is wrong here and errs in
    // the safer direction: a caller told its address is gone
    // re-reads the address, where a caller told its body is wrong
    // when the domain died would go looking at a member that was
    // correct. What names the truth is the `cause`, and its
    // constraint is read below so a change of mind here is a
    // failing case rather than a silent widening.
    const { store, inbox } = await plantSubscriptions();

    await store.deleteConnector(inbox.id);

    const vanished: SubscriptionServiceStore = {
      ...store,
      findConnectorById: async () => inbox,
    };
    const refusal = await refusalFrom(
      () => createSubscription(vanished, RADAR, {
        format: 'pdf',
        connectorId: inbox.id,
        intervalSeconds: DAILY,
      }),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
    expect(refusal.cause).toBeInstanceOf(StoreRefusal);
    expect((refusal.cause as StoreRefusal).constraint)
      .toBe('export_subscriptions_connector_id_connectors_id_fk');
  });

  it('answers the patch 422 when the connector raced', async () => {
    // The other side of that pair, and the reason the insert's
    // misattribution is not a rule this module holds: an update
    // reaches ONE foreign key, `domainId` not being patchable, so
    // there is nothing to tell apart and the refusal is answered
    // as what it is. It is the same 422 the pre-flight read
    // raises, which is what makes that read a convenience rather
    // than a second rule.
    const { store, digest, inbox } = await plantSubscriptions();

    await store.deleteConnector(inbox.id);

    const vanished: SubscriptionServiceStore = {
      ...store,
      findConnectorById: async () => inbox,
    };
    const refusal = await refusalFrom(
      () => patchSubscription(vanished, digest.id, { connectorId: inbox.id }),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal.details as FieldError[] | undefined))
      .toEqual([{ field: 'connectorId', code: 'unknown_connector' }]);
    expect(refusal.cause).toBeInstanceOf(StoreRefusal);
  });

  it('rethrows a reason this port does not declare', async () => {
    // Both schemas hold `format` to the tuple
    // `export_subscriptions_format_check` is generated from, so a
    // `check-violation` out of a write here means the two have
    // drifted apart. It is rethrown as itself, which answers 500,
    // rather than a plausible status no rule authorised. A
    // translator with a catch-all branch passes every other case
    // here and fails this.
    const { store, inbox } = await plantSubscriptions();
    const misbehaving: SubscriptionServiceStore = {
      ...store,
      insertSubscription: async () => {
        throw new StoreRefusal({
          reason: 'check-violation',
          constraint: 'export_subscriptions_format_check',
        });
      },
    };

    await expect(createSubscription(misbehaving, RADAR, {
      format: 'pdf',
      connectorId: inbox.id,
      intervalSeconds: DAILY,
    })).rejects.toBeInstanceOf(StoreRefusal);
  });

  it('rethrows an error that is not a store refusal', async () => {
    // The other half of the same rule, on the other write. A
    // driver fault is not a decision about rows, so nothing here
    // dresses it as one.
    const { store, digest } = await plantSubscriptions();
    const misbehaving: SubscriptionServiceStore = {
      ...store,
      updateSubscription: async () => {
        throw new TypeError('the driver failed on its own account');
      },
    };

    await expect(patchSubscription(misbehaving, digest.id, {
      intervalSeconds: 900,
    })).rejects.toBeInstanceOf(TypeError);
  });
});

// ---------------------------------------------------------------------------
// What a refusal is allowed to say
// ---------------------------------------------------------------------------

/** A slug shaped like one, so it reaches the store rather than the parser. */
const SENTINEL_SLUG = 'sentinel-slug-value';

/** A key no schema here declares, submitted as one. */
const SENTINEL_MEMBER = 'sentinelMemberValue';

/** A value, submitted under that undeclared key. */
const SENTINEL_VALUE = 'sentinel value under a key';

/**
 * The id {@link MISSING_CONNECTOR_ID} is spelled as, so the one
 * refusal this module builds by hand can be searched for the number
 * it was given.
 *
 * A NUMBER RATHER THAN A STRING, and it is the needle the other
 * three cannot stand in for: the connector refusal is the only
 * detail on this surface whose message is this module's own, and
 * the only value it could quote is an id. Nothing else in a refusal
 * envelope here is numeric, so a count against this cannot be
 * satisfied by anything else in the text.
 */
const SENTINEL_ID = String(MISSING_CONNECTOR_ID);

/**
 * The four strings the rows below submit. None is a substring of
 * another, so a count against one cannot be satisfied by another.
 */
const SENTINELS = [
  SENTINEL_SLUG,
  SENTINEL_MEMBER,
  SENTINEL_VALUE,
  SENTINEL_ID,
];

/** One refused request, and what it submitted that must not return. */
interface ContainmentCase {
  /** What makes this row different from every other. */
  readonly label: string;

  /** The call, submitting the needles below. */
  readonly run: (planted: PlantedSubscriptions) => Promise<unknown>;

  /** The submitted strings the answer must not carry. */
  readonly needles: readonly string[];
}

/**
 * Every channel a submitted string could come back through.
 *
 * THE TWO CONNECTOR ROWS ARE THE ONES THIS GROUP HAS AND ITS
 * SIBLINGS DO NOT. Every other refusal here is built from a
 * constant or handed back by `src/http/validation.ts`, whose own
 * containment is measured in that module; the `connectorId` detail
 * is assembled in `./service.ts` from a message, a field name and a
 * code, and the id is the value sitting a line away from all three.
 */
const CONTAINMENT_CASES: readonly ContainmentCase[] = [
  {
    label: 'a slug that names no domain',
    run: ({ store }) => listSubscriptions(store, SENTINEL_SLUG, WIDE_WINDOW),
    needles: [SENTINEL_SLUG],
  },
  {
    label: 'a create against a slug that names no domain',
    run: ({ store, inbox }) => createSubscription(store, SENTINEL_SLUG, {
      format: 'pdf',
      connectorId: inbox.id,
      intervalSeconds: DAILY,
    }),
    needles: [SENTINEL_SLUG],
  },
  {
    label: 'a create naming a connector that is not there',
    run: ({ store }) => createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: MISSING_CONNECTOR_ID,
      intervalSeconds: DAILY,
    }),
    needles: [SENTINEL_ID],
  },
  {
    label: 'a re-point onto a connector that is not there',
    run: ({ store, digest }) => patchSubscription(store, digest.id, {
      connectorId: MISSING_CONNECTOR_ID,
    }),
    needles: [SENTINEL_ID],
  },
  {
    label: 'a create of a triple the domain carries',
    run: ({ store, digest, vault }) => createSubscription(store, RADAR, {
      format: digest.format,
      connectorId: vault.id,
      intervalSeconds: DAILY,
    }),
    needles: [SENTINEL_ID],
  },
  {
    label: 'an undeclared member of a create body',
    run: ({ store, inbox }) => createSubscription(store, RADAR, {
      format: 'pdf',
      connectorId: inbox.id,
      intervalSeconds: DAILY,
      [SENTINEL_MEMBER]: SENTINEL_VALUE,
    }),
    needles: [SENTINEL_MEMBER, SENTINEL_VALUE],
  },
  {
    label: 'an undeclared member of a patch body',
    run: ({ store, digest }) => patchSubscription(store, digest.id, {
      [SENTINEL_MEMBER]: SENTINEL_VALUE,
    }),
    needles: [SENTINEL_MEMBER, SENTINEL_VALUE],
  },
  {
    label: 'a patch against an id that is not there',
    run: ({ store }) => patchSubscription(store, MISSING_ID, {
      connectorId: MISSING_CONNECTOR_ID,
    }),
    needles: [SENTINEL_ID],
  },
];

describe('what a refusal is allowed to say', () => {
  it('submits every sentinel through at least one channel', () => {
    const submitted = CONTAINMENT_CASES.flatMap((row) => [...row.needles]);

    expect([...new Set(submitted)].sort()).toEqual([...SENTINELS].sort());
  });

  it('would find a sentinel a refusal did carry', () => {
    // The planted control. Every row below counts to zero, and a
    // zero is what a search over the wrong text answers too — so
    // the same helper is run against an envelope built here, out
    // of details this module did not produce, and has to find each
    // one.
    const planted = JSON.stringify({
      code: 'CONFLICT',
      message: `No domain carries ${SENTINEL_SLUG}`,
      details: [
        {
          field: SENTINEL_MEMBER,
          message: `No connector carries ${SENTINEL_ID}: ${SENTINEL_VALUE}`,
          code: 'custom',
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
      const planted = await plantSubscriptions();
      const refusal = await refusalFrom(() => row.run(planted));
      const answered = JSON.stringify(refusal.toJSON());
      const found = row.needles.map((needle) => ({
        needle,
        occurrences: countOccurrences(answered, needle),
      }));

      // Counted rather than asserted absent, so the reading is a
      // number the planted control above has shown can be
      // something other than zero.
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
    // The translation below passes the `StoreRefusal` as `cause`,
    // which is where a debugger and the error-level log line find
    // it. `cause` is non-enumerable per spec, so it reaches no
    // serialised body — a property of the platform rather than of
    // this module, which is why it is measured here rather than
    // assumed.
    const { store, digest, vault } = await plantSubscriptions();
    const refusal = await refusalFrom(() => createSubscription(store, RADAR, {
      format: digest.format,
      connectorId: vault.id,
      intervalSeconds: DAILY,
    }));

    expect(refusal.cause).toBeInstanceOf(StoreRefusal);
    expect(Object.keys(refusal.toJSON()).sort())
      .toEqual(['code', 'message']);
  });
});

// ---------------------------------------------------------------------------
// The state a run now refuses
// ---------------------------------------------------------------------------

/** A format nothing the fixture plants delivers in. */
const STAGED_FORMAT = 'notion_md';

/** The cadence every subscription staged below delivers at. */
const WEEKLY = 604800;

/**
 * Stages one subscription of {@link RADAR} switched off.
 *
 * Through {@link createSubscription} rather than through the
 * store, per {@link plantSubscriptions}: `enabled` is a member the
 * create schema takes, so the state this verb refuses is one the
 * surface itself can land rather than one only a fixture can
 * build.
 *
 * @param planted - The fixture to stage it in.
 * @param connectorId - Where it would deliver. Varied by the
 *   caller so that two staged rows do not collide on the triple.
 * @returns The stored row, whose `enabled` is false.
 */
async function stageDisabled(
  planted: PlantedSubscriptions,
  connectorId: number,
): Promise<SubscriptionRecord> {
  return createSubscription(planted.store, RADAR, {
    format: STAGED_FORMAT,
    connectorId,
    intervalSeconds: WEEKLY,
    enabled: false,
  });
}

describe('the state a run now refuses', () => {
  it('answers 409 to a run now on a disabled row', async () => {
    // `enabled` false excludes the row from the partial index the
    // dispatch claim walks, so writing the clock onto it would
    // produce a row looking due forever and never claimed — a
    // silent no-op the caller cannot see. The refusal carries no
    // details: nothing about it names a member of a body, this
    // verb reading none.
    const planted = await plantSubscriptions();
    const staged = await stageDisabled(planted, planted.vault.id);

    const refusal = await refusalFrom(
      () => runSubscriptionNow(planted.store, planted.clock.now, staged.id),
    );

    expect(refusal).toBeInstanceOf(ConflictError);
    expect(refusal.code).toBe('CONFLICT');
    expect(refusal.statusCode).toBe(409);
    expect(refusal.details).toBeUndefined();
  });

  it('runs the same call against an enabled row', async () => {
    // The positive control for the case above, varied along the
    // one axis under test: same verb, same clock, same domain, two
    // rows differing in `enabled` alone. A verb refusing every
    // run now passes the refusal and fails this.
    const planted = await plantSubscriptions();
    const staged = await stageDisabled(planted, planted.inbox.id);

    await expect(runSubscriptionNow(
      planted.store,
      planted.clock.now,
      staged.id,
    )).rejects.toBeInstanceOf(ConflictError);

    const enabled = await createSubscription(planted.store, RADAR, {
      format: STAGED_FORMAT,
      connectorId: planted.vault.id,
      intervalSeconds: WEEKLY,
    });
    const ran = await runSubscriptionNow(
      planted.store,
      planted.clock.now,
      enabled.id,
    );

    expect(ran.enabled).toBe(true);
    expect(ran.nextRunAt).toStrictEqual(FIXED_INSTANT);
  });

  it('leaves the disabled row exactly as it found it', async () => {
    // Read off the STORE rather than off the refusal: a verb that
    // wrote the instant and only then noticed the state satisfies
    // every assertion above. The due time is the member the write
    // would have moved, and it was null before the call.
    const planted = await plantSubscriptions();
    const staged = await stageDisabled(planted, planted.vault.id);

    expect(staged.nextRunAt).toBeNull();

    await refusalFrom(
      () => runSubscriptionNow(planted.store, planted.clock.now, staged.id),
    );

    const stored = await planted.store.findSubscriptionById(staged.id);

    expect(stored).toStrictEqual(staged);
  });

  it('does not enable the row it refused', async () => {
    // The repair is a `PATCH` the caller takes as its own
    // decision, so a verb quietly enabling what it was handed
    // would answer a request nobody made — and would then be
    // undoing a suspension somebody chose. The case above compares
    // the whole row and reports it too; this one names it, since
    // that is the member the refusal is about.
    const planted = await plantSubscriptions();
    const staged = await stageDisabled(planted, planted.vault.id);

    await refusalFrom(
      () => runSubscriptionNow(planted.store, planted.clock.now, staged.id),
    );

    const stored = await planted.store.findSubscriptionById(staged.id);

    expect(stored?.enabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// What a list scopes to
// ---------------------------------------------------------------------------

/**
 * The members `SubscriptionRecord` declares.
 *
 * Written out rather than derived, because an interface has no
 * runtime form to read keys off — and pinned in BOTH directions,
 * since a one-directional list is exactly as green as no list at
 * all against the drift that matters. `satisfies` closes the
 * direction where this names a member the record lacks;
 * {@link EVERY_KEY_LISTED} closes the one where the record grows a
 * member nothing here learned about.
 *
 * The second direction is the one THIS table needs.
 * `export_subscriptions` spreads `schedulableColumns()` from
 * `src/db/schema/scheduling.ts`, and so does `topics`, so a column
 * added to that one helper reaches `SubscriptionRecord` and every
 * projection under it with no subscriptions module edited at all —
 * and every field-by-field assertion below stays green while the
 * surface answers a member nobody argued onto it.
 */
const SUBSCRIPTION_KEYS = [
  'connectorId',
  'domainId',
  'enabled',
  'format',
  'id',
  'intervalSeconds',
  'maxIntervalSeconds',
  'minIntervalSeconds',
  'nextRunAt',
] as const satisfies readonly (keyof SubscriptionRecord)[];

/** The two members a page carries around its rows. */
const PAGE_KEYS = [
  'rows',
  'total',
] as const satisfies readonly (keyof SubscriptionPage)[];

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

/** Both lists above, held against the types they describe. */
type EveryKeyListed =
  CoversEveryKey<SubscriptionRecord, typeof SUBSCRIPTION_KEYS>
  & CoversEveryKey<SubscriptionPage, typeof PAGE_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to `SubscriptionRecord` or to `SubscriptionPage`
 * and to neither list above collapses {@link EveryKeyListed} to
 * `never` — an intersection of `true` and `false` — and this
 * initializer is then a TS2322 at this line, before any case can
 * compare a record against a set that has quietly stopped
 * describing it. Read in a case below, so it is a symbol this file
 * uses rather than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** {@link SUBSCRIPTION_KEYS}, sorted at use rather than by hand. */
const SUBSCRIPTION_KEY_SET: readonly string[] = [...SUBSCRIPTION_KEYS].sort();

/** {@link PAGE_KEYS}, sorted. */
const PAGE_KEY_SET: readonly string[] = [...PAGE_KEYS].sort();

/** A third domain, invented in the same neutral register. */
const SEABED = 'example-seabed-mapping';

/**
 * The format one domain takes to BOTH connectors below.
 *
 * A member the fixture plants nowhere, so the widening case adds
 * the whole pair itself: two rows differing in their destination
 * alone are what make one format to two connectors a reading off a
 * PAGE rather than a pair of accepted writes.
 *
 * It also sorts before every format the fixture does plant, which
 * is what lets the ordering case below disagree with the order the
 * rows were written in.
 */
const SHARED_FORMAT = 'email_draft';

/** Twelve hours, as the cadence every write below proposes. */
const HALF_DAILY = 43200;

/**
 * Finds one answered subscription by the pair that names it within
 * its domain.
 *
 * @param rows - What a read answered.
 * @param format - The format half of the pair.
 * @param connectorId - The destination half.
 * @returns The row carrying both.
 * @throws When no row does. A `find` answering `undefined`
 *   compares equal to another `undefined`, so a case reading a
 *   stored row back against a write that never landed would
 *   otherwise pass for nobody's reason.
 */
function subscriptionFor(
  rows: readonly SubscriptionRecord[],
  format: string,
  connectorId: number,
): SubscriptionRecord {
  const found = rows.find(
    (row) => row.format === format && row.connectorId === connectorId,
  );

  if (found === undefined) {
    throw new Error('no answered row carries that pair');
  }

  return found;
}

/**
 * @param rows - The rows a page answered.
 * @returns The natural key of each, in the order they came back.
 *   The PAIR rather than two lists of one column each, because two
 *   single-column lists leave the pairing unasserted: a page whose
 *   formats and connectors are each right in isolation can still
 *   have them on the wrong rows.
 */
function pairsOf(rows: readonly SubscriptionRecord[]): string[] {
  return rows.map((row) => `${row.format}/${row.connectorId}`);
}

describe('what a list scopes to', () => {
  it('holds both key sets against the types they describe', () => {
    // The runtime half of the pin above. What it asserts is not
    // the `true` — that is a constant — but that the symbol exists
    // to be read: its VALUE is the statement `check-types` makes
    // at the declaration, which is a TS2322 the moment either type
    // grows a member neither list names.
    expect(EVERY_KEY_LISTED).toBe(true);
  });

  it('answers the subscriptions of the domain it was given', async () => {
    // The scoping claim, and the fixture is what makes it sharp:
    // TRANSIT carries `digest`'s WHOLE pair, so a read reaching
    // past the domain answers three rows here and cannot tell the
    // two deliveries apart by their natural key at all. Whole
    // records rather than pairs, so a page assembled out of the
    // right pairs and the wrong rows is this case failing.
    const planted = await plantSubscriptions();
    const { store } = planted;
    const here = await listSubscriptions(store, RADAR, WIDE_WINDOW);
    const there = await listSubscriptions(store, TRANSIT, WIDE_WINDOW);

    expect(here.rows).toStrictEqual([planted.digest, planted.feed]);
    expect(here.total).toBe(2);
    expect(there.rows).toStrictEqual([planted.foreign]);
    expect(there.total).toBe(1);

    // The sorted key SET beside the records the case compares, and
    // read off the ANSWERED row rather than the planted one. A
    // member arriving by spread — a column nobody projected — is
    // invisible to a compare against a record this same module
    // built, and is exactly what this line catches.
    const listed = subscriptionFor(
      here.rows,
      planted.digest.format,
      planted.vault.id,
    );

    expect(Object.keys(listed).sort()).toEqual([...SUBSCRIPTION_KEY_SET]);
    expect(Object.keys(here).sort()).toEqual([...PAGE_KEY_SET]);
  });

  it('tells the two rows of one pair apart by their domain', async () => {
    // The scoping claim read from the other end. The two rows
    // share a format AND a destination — the whole of what the key
    // has left once the domain is fixed — so a read answering
    // EITHER of them under both slugs passes a pair-only
    // comparison and fails this.
    const planted = await plantSubscriptions();
    const { store } = planted;
    const here = await listSubscriptions(store, RADAR, WIDE_WINDOW);
    const there = await listSubscriptions(store, TRANSIT, WIDE_WINDOW);
    const mine = subscriptionFor(
      here.rows,
      planted.digest.format,
      planted.vault.id,
    );
    const theirs = subscriptionFor(
      there.rows,
      planted.foreign.format,
      planted.vault.id,
    );

    expect(mine.format).toBe(theirs.format);
    expect(mine.connectorId).toBe(theirs.connectorId);
    expect(mine.domainId).not.toBe(theirs.domainId);
    expect(mine.id).not.toBe(theirs.id);
  });

  it('carries one format to two connectors and two to one', async () => {
    // The two shapes the natural key permits WITHIN one domain,
    // read off a page rather than off the writes that landed them.
    // The acceptance controls beside the 409s above say each write
    // was taken; this says the collection can hold both at once,
    // which is what a list keyed on any PAIR of the three columns
    // could not answer. RADAR already takes two formats to
    // `vault`, so the two writes here are the other shape.
    const planted = await plantSubscriptions();

    await createSubscription(planted.store, RADAR, {
      format: SHARED_FORMAT,
      connectorId: planted.inbox.id,
      intervalSeconds: HALF_DAILY,
    });
    await createSubscription(planted.store, RADAR, {
      format: SHARED_FORMAT,
      connectorId: planted.vault.id,
      intervalSeconds: HALF_DAILY,
    });

    const page = await listSubscriptions(planted.store, RADAR, WIDE_WINDOW);
    const pairs = pairsOf(page.rows);

    expect(pairs).toEqual([
      `${SHARED_FORMAT}/${planted.vault.id}`,
      `${SHARED_FORMAT}/${planted.inbox.id}`,
      `${planted.digest.format}/${planted.vault.id}`,
      `${planted.feed.format}/${planted.vault.id}`,
    ]);
    expect(page.total).toBe(4);

    // The two shapes named apart, so a page answering four rows of
    // one of them fails here rather than passing a list this case
    // had only read as a whole.
    const toVault = `/${planted.vault.id}`;

    expect(pairs.filter((pair) => pair.startsWith(SHARED_FORMAT)))
      .toHaveLength(2);
    expect(pairs.filter((pair) => pair.endsWith(toVault))).toHaveLength(3);
  });

  it('orders the page by the format and the connector', async () => {
    // The order the port promises, over a collection arranged so
    // that no single-column reading answers it. The two rows
    // sharing the added format go in LAST and sort FIRST, so a
    // page in insertion order is wrong; the one written first sits
    // on the HIGHER connector id, so a stable sort on the format
    // alone hands that tie back the other way round. The ids are
    // read rather than the pairs, since the pairs are what the
    // case above already compared.
    const planted = await plantSubscriptions();
    const early = await createSubscription(planted.store, RADAR, {
      format: SHARED_FORMAT,
      connectorId: planted.inbox.id,
      intervalSeconds: HALF_DAILY,
    });
    const late = await createSubscription(planted.store, RADAR, {
      format: SHARED_FORMAT,
      connectorId: planted.vault.id,
      intervalSeconds: HALF_DAILY,
    });
    const page = await listSubscriptions(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows.map((row) => row.id))
      .toEqual([late.id, early.id, planted.digest.id, planted.feed.id]);

    // What makes the line above a claim: both single-column
    // readings of this collection answer something else.
    expect(early.id).toBeLessThan(late.id);
    expect(planted.inbox.id).toBeGreaterThan(planted.vault.id);
  });

  it('reports the collection rather than the page in hand', async () => {
    // `total` is a second question rather than the length of the
    // rows in hand, and the refusal half of this file could not
    // say so: its one window is wider than every collection it
    // reads, so a total taken off the rows would have been right
    // there. This window holds one row of two.
    const planted = await plantSubscriptions();
    const page = await listSubscriptions(planted.store, RADAR, {
      limit: 1,
      offset: 0,
    });

    expect(page.rows).toStrictEqual([planted.digest]);
    expect(page.total).toBe(2);
  });

  it('answers an empty page for a domain subscribing to none', async () => {
    // A domain subscribing to nothing and a slug naming no domain
    // are two states, and this is the one that is not a 404: the
    // collection is there and empty. The RADAR read beside it is
    // the control — a module answering an empty page to everything
    // passes the first half of this and fails the second.
    const planted = await plantSubscriptions();

    await planted.store.insertDomain({
      slug: SEABED,
      name: 'Seabed',
      settings: {},
    });

    const empty = await listSubscriptions(planted.store, SEABED, WIDE_WINDOW);
    const held = await listSubscriptions(planted.store, RADAR, WIDE_WINDOW);

    expect(empty).toStrictEqual({ rows: [], total: 0 });
    expect(held.total).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// What a create lands
// ---------------------------------------------------------------------------

/** The format every create below adds to a domain. */
const FRESH_FORMAT = 'pdf';

/** A floor no planted row carries, for the create that sets one. */
const FRESH_FLOOR = 1800;

/** A ceiling no planted row carries, for the same create. */
const FRESH_CEILING = 259200;

describe('what a create lands', () => {
  it('answers a row that is unscheduled and enabled', async () => {
    // The whole row rather than the two members the case is named
    // for. A null due time is never claimed by `ar-dispatch`, and
    // an enabled row is the only kind the run-now verb will
    // schedule — but a create reaching a member nobody submitted
    // is exactly as wrong and is invisible to a pair of field
    // reads.
    const planted = await plantSubscriptions();
    const created = await createSubscription(planted.store, RADAR, {
      format: FRESH_FORMAT,
      connectorId: planted.vault.id,
      intervalSeconds: HALF_DAILY,
    });

    expect(created).toStrictEqual({
      id: created.id,
      domainId: planted.digest.domainId,
      format: FRESH_FORMAT,
      connectorId: planted.vault.id,
      intervalSeconds: HALF_DAILY,
      nextRunAt: null,
      enabled: true,
      minIntervalSeconds: null,
      maxIntervalSeconds: null,
    });

    // The id is the store's own — no body here carries one — and
    // the sorted key set beside it, since the id is the one member
    // a whole-row compare cannot pin against anything but itself.
    expect(created.id).toBeGreaterThan(planted.foreign.id);
    expect(Object.keys(created).sort()).toEqual([...SUBSCRIPTION_KEY_SET]);
  });

  it('stages a subscription switched off when asked', async () => {
    // The control that makes the `enabled: true` above a DEFAULT
    // rather than a constant: a service writing true whatever was
    // submitted passes the case above and fails this. It is also
    // the state the run-now verb refuses, so a subscription staged
    // off is one an operator enables deliberately rather than one
    // answering a run-now with a due time nothing would read.
    const { store, vault } = await plantSubscriptions();
    const created = await createSubscription(store, RADAR, {
      format: FRESH_FORMAT,
      connectorId: vault.id,
      intervalSeconds: HALF_DAILY,
      enabled: false,
    });

    expect(created.enabled).toBe(false);
    expect(created.nextRunAt).toBeNull();
  });

  it('folds an absent bound and an explicit null together', async () => {
    // On a create there is nothing stored for an absent bound to
    // leave alone, so the two spellings mean one thing and the
    // service folds them. One bound is submitted null and the
    // other omitted in the same call, so the two paths are read
    // against each other rather than one at a time.
    const { store, vault } = await plantSubscriptions();
    const created = await createSubscription(store, RADAR, {
      format: FRESH_FORMAT,
      connectorId: vault.id,
      intervalSeconds: HALF_DAILY,
      minIntervalSeconds: null,
    });

    expect(created.minIntervalSeconds).toBeNull();
    expect(created.maxIntervalSeconds).toBeNull();
  });

  it('lands the bounds a body did supply', async () => {
    // The control for the case above: a service folding every
    // bound to null passes it and fails this. Both members, since
    // a floor written from the ceiling's value is a plausible row
    // no single-bound read would report.
    const { store, vault } = await plantSubscriptions();
    const created = await createSubscription(store, RADAR, {
      format: FRESH_FORMAT,
      connectorId: vault.id,
      intervalSeconds: HALF_DAILY,
      minIntervalSeconds: FRESH_FLOOR,
      maxIntervalSeconds: FRESH_CEILING,
    });

    expect(created.minIntervalSeconds).toBe(FRESH_FLOOR);
    expect(created.maxIntervalSeconds).toBe(FRESH_CEILING);
  });

  it('stores the row it answered', async () => {
    // Read back through the OTHER operation, so the claim is about
    // what is stored rather than about what one call happened to
    // answer: a create returning a row it never wrote passes every
    // case above and fails this.
    const planted = await plantSubscriptions();
    const created = await createSubscription(planted.store, RADAR, {
      format: FRESH_FORMAT,
      connectorId: planted.vault.id,
      intervalSeconds: HALF_DAILY,
    });
    const page = await listSubscriptions(planted.store, RADAR, WIDE_WINDOW);

    expect(subscriptionFor(page.rows, FRESH_FORMAT, planted.vault.id))
      .toStrictEqual(created);
  });

  it('writes into the domain the path addressed', async () => {
    // The `:slug` reached the WRITE rather than only a lookup: a
    // create stamping another domain answers a perfectly plausible
    // row and files it under configuration nobody asked about. The
    // triple is one RADAR already carries, so a write landing
    // there would be REFUSED rather than merely misfiled — the
    // sharper failure, and the reason this pair was chosen over a
    // free one.
    const planted = await plantSubscriptions();

    await createSubscription(planted.store, TRANSIT, {
      format: planted.feed.format,
      connectorId: planted.vault.id,
      intervalSeconds: HALF_DAILY,
    });

    const here = await listSubscriptions(planted.store, TRANSIT, WIDE_WINDOW);
    const there = await listSubscriptions(planted.store, RADAR, WIDE_WINDOW);

    expect(pairsOf(here.rows)).toEqual([
      `${planted.foreign.format}/${planted.vault.id}`,
      `${planted.feed.format}/${planted.vault.id}`,
    ]);
    expect(here.total).toBe(2);
    expect(there.rows).toStrictEqual([planted.digest, planted.feed]);
  });

  it('counts the new row in the total a page reports', async () => {
    // `total` is a second question rather than the length of the
    // rows in hand, so a create the count never saw would leave a
    // page claiming to be the whole of a domain it is not. Read
    // through a window of one, so the two numbers cannot agree by
    // accident.
    const { store, vault } = await plantSubscriptions();

    await createSubscription(store, RADAR, {
      format: FRESH_FORMAT,
      connectorId: vault.id,
      intervalSeconds: HALF_DAILY,
    });

    const page = await listSubscriptions(store, RADAR, {
      limit: 1,
      offset: 0,
    });

    expect(page.rows).toHaveLength(1);
    expect(page.total).toBe(3);
  });

  it('leaves the subscriptions the domain already had', async () => {
    // A write lands one row. The two the fixture planted are still
    // there and still say what they said, which no assertion over
    // the created row could report.
    const planted = await plantSubscriptions();

    await createSubscription(planted.store, RADAR, {
      format: FRESH_FORMAT,
      connectorId: planted.vault.id,
      intervalSeconds: HALF_DAILY,
    });

    const page = await listSubscriptions(planted.store, RADAR, WIDE_WINDOW);
    const held = planted.vault.id;

    expect(subscriptionFor(page.rows, planted.digest.format, held))
      .toStrictEqual(planted.digest);
    expect(subscriptionFor(page.rows, planted.feed.format, held))
      .toStrictEqual(planted.feed);
  });
});

// ---------------------------------------------------------------------------
// What a patch retunes
// ---------------------------------------------------------------------------

/** Six hours, as the cadence a patch below moves a row to. */
const SIX_HOURLY = 21600;

/** A floor above the one `feed` was planted with. */
const RAISED_FLOOR = 7200;

/** A ceiling below the one it was planted with. */
const LOWERED_CEILING = 172800;

describe('what a patch retunes', () => {
  it('moves the cadence and leaves the bounds alone', async () => {
    // Compared against the row as it was rather than field by
    // field: a patch reaching a second member answers a plausible
    // subscription and quietly changes what it delivers or where.
    // `feed` carries both bounds, so they are in the compare by
    // being absent from the override — a patch writing a bound
    // from the cadence it was handed is exactly the shape a
    // field-by-field read would pass.
    const { store, feed } = await plantSubscriptions();
    const patched = await patchSubscription(store, feed.id, {
      intervalSeconds: SIX_HOURLY,
    });

    expect(patched).toStrictEqual({ ...feed, intervalSeconds: SIX_HOURLY });
    expect(feed.intervalSeconds).not.toBe(SIX_HOURLY);
  });

  it('stores the cadence it retuned', async () => {
    // Read back through the list, so the claim is about the stored
    // row rather than about what the patch answered. A module
    // answering a row it never wrote passes the case above.
    const { store, feed, vault } = await plantSubscriptions();

    await patchSubscription(store, feed.id, {
      intervalSeconds: SIX_HOURLY,
    });

    const page = await listSubscriptions(store, RADAR, WIDE_WINDOW);

    expect(subscriptionFor(page.rows, feed.format, vault.id))
      .toStrictEqual({ ...feed, intervalSeconds: SIX_HOURLY });
  });

  it('moves both interval bounds and leaves the cadence', async () => {
    // `feed` was planted with both bounds set, so this is the
    // write that MOVES them rather than the one that adds them.
    // `intervalSeconds` is in the compare by being absent from the
    // override, which is the case above read the other way round.
    const { store, feed } = await plantSubscriptions();
    const patched = await patchSubscription(store, feed.id, {
      minIntervalSeconds: RAISED_FLOOR,
      maxIntervalSeconds: LOWERED_CEILING,
    });

    expect(patched).toStrictEqual({
      ...feed,
      minIntervalSeconds: RAISED_FLOOR,
      maxIntervalSeconds: LOWERED_CEILING,
    });
    expect(feed.minIntervalSeconds).not.toBe(RAISED_FLOOR);
    expect(feed.maxIntervalSeconds).not.toBe(LOWERED_CEILING);
  });

  it('sets a bound on a subscription that carried none', async () => {
    // The other transition, and the one the case above cannot
    // make: `digest` was created with neither bound, so a store
    // treating a stored null as nothing to write passes the move
    // and fails this.
    const { store, digest } = await plantSubscriptions();
    const patched = await patchSubscription(store, digest.id, {
      minIntervalSeconds: RAISED_FLOOR,
      maxIntervalSeconds: LOWERED_CEILING,
    });

    expect(digest.minIntervalSeconds).toBeNull();
    expect(digest.maxIntervalSeconds).toBeNull();
    expect(patched).toStrictEqual({
      ...digest,
      minIntervalSeconds: RAISED_FLOOR,
      maxIntervalSeconds: LOWERED_CEILING,
    });
  });

  it('clears one bound and leaves the other alone', async () => {
    // The third request the two bounds distinguish here and the
    // create above folds away: absent leaves the stored bound
    // alone, a number sets it, and `null` CLEARS it. A `??`
    // anywhere between the schema and the port collapses the first
    // and the third, and the ceiling in this same call is what
    // says the clear reached one member rather than both.
    const { store, feed } = await plantSubscriptions();
    const patched = await patchSubscription(store, feed.id, {
      minIntervalSeconds: null,
    });

    expect(patched).toStrictEqual({ ...feed, minIntervalSeconds: null });
    expect(feed.minIntervalSeconds).not.toBeNull();
    expect(patched.maxIntervalSeconds).toBe(feed.maxIntervalSeconds);
  });

  it('suspends a subscription without cancelling it', async () => {
    // `enabled` is the column the schema provides for stopping a
    // delivery, and this is the whole of what a suspension writes:
    // the format, the destination and the cadence stay, which is
    // what makes it reversible and what makes it different from
    // the delete below.
    const { store, digest } = await plantSubscriptions();
    const patched = await patchSubscription(store, digest.id, {
      enabled: false,
    });

    expect(digest.enabled).toBe(true);
    expect(patched).toStrictEqual({ ...digest, enabled: false });
  });

  it('keeps a suspended subscription on its page', async () => {
    // `enabled` is not a filter on this read. A list quietly
    // hiding suspended rows would leave an operator with no way to
    // find the delivery they had just stopped, and every count in
    // the refusal half of this file would still add up.
    const { store, digest, vault } = await plantSubscriptions();

    await patchSubscription(store, digest.id, { enabled: false });

    const page = await listSubscriptions(store, RADAR, WIDE_WINDOW);

    expect(page.total).toBe(2);
    expect(subscriptionFor(page.rows, digest.format, vault.id).enabled)
      .toBe(false);
  });

  it('brings a suspended subscription back', async () => {
    // The member is not one-way, and this is what says so. A
    // service folding `enabled` through `||` rather than `??`
    // writes true for a submitted false and fails the suspension
    // above; one that had stopped writing the column at all passes
    // that case only while the stored value already differed, and
    // fails here.
    const { store, digest } = await plantSubscriptions();

    await patchSubscription(store, digest.id, { enabled: false });

    const revived = await patchSubscription(store, digest.id, {
      enabled: true,
    });

    expect(revived).toStrictEqual(digest);
  });

  it('retunes the subscription it named and no other', async () => {
    // The whole of both domains read back: three rows, one cadence
    // moved. A patch reaching more rows than the id it was given
    // answers the same row and is invisible to every case above.
    // The second domain is in the sweep because its subscription
    // carries `digest`'s whole pair, so a patch keyed on the
    // triple rather than on the id would reach across the two.
    const planted = await plantSubscriptions();

    await patchSubscription(planted.store, planted.digest.id, {
      intervalSeconds: SIX_HOURLY,
    });

    const { store } = planted;
    const here = await listSubscriptions(store, RADAR, WIDE_WINDOW);
    const there = await listSubscriptions(store, TRANSIT, WIDE_WINDOW);

    expect(subscriptionFor(here.rows, planted.feed.format, planted.vault.id))
      .toStrictEqual(planted.feed);
    expect(there.rows).toStrictEqual([planted.foreign]);
  });
});

// ---------------------------------------------------------------------------
// What a delete takes
// ---------------------------------------------------------------------------

describe('what a delete takes', () => {
  it('answers nothing and leaves the sibling standing', async () => {
    // Nothing in schema v2 points at `export_subscriptions`, so
    // this delete has neither a guard nor a confirmation to give
    // it: the whole of what it answers is nothing, and the whole
    // of what it did is read back off the page. The sibling is
    // compared as a WHOLE record — a delete that took the right
    // row and edited the one beside it answers the same page of
    // pairs.
    const planted = await plantSubscriptions();

    await expect(deleteSubscription(planted.store, planted.digest.id))
      .resolves.toBeUndefined();

    const page = await listSubscriptions(planted.store, RADAR, WIDE_WINDOW);

    expect(page.rows).toStrictEqual([planted.feed]);
    expect(page.total).toBe(1);
  });

  it('leaves the second domain subscribed to that pair', async () => {
    // A subscription in each domain carries the same format and
    // the same destination, so a delete keyed on the triple rather
    // than on the id takes both and passes any count that only
    // looked at one of them.
    const planted = await plantSubscriptions();

    await deleteSubscription(planted.store, planted.digest.id);

    const there = await listSubscriptions(
      planted.store,
      TRANSIT,
      WIDE_WINDOW,
    );

    expect(there.rows).toStrictEqual([planted.foreign]);
    expect(there.total).toBe(1);
  });

  it('answers 404 to a second delete of the same id', async () => {
    // The row is gone rather than merely unlisted, which no read
    // above can say: a delete that unlinked the row without
    // removing it answers this second call as a success.
    const { store, digest } = await plantSubscriptions();

    await deleteSubscription(store, digest.id);

    const refusal = await refusalFrom(
      () => deleteSubscription(store, digest.id),
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
  });

  it('frees the triple the delete took out of the domain', async () => {
    // The natural key went with the row rather than outliving it,
    // which neither read above can say: an index keeping the entry
    // answers the same page and refuses this create as a
    // duplicate.
    const { store, digest, vault } = await plantSubscriptions();

    await deleteSubscription(store, digest.id);

    const created = await createSubscription(store, RADAR, {
      format: digest.format,
      connectorId: vault.id,
      intervalSeconds: HALF_DAILY,
    });

    expect(created.format).toBe(digest.format);
    expect(created.connectorId).toBe(vault.id);

    // A new row rather than the old one back: a sequence does not
    // roll back over a row that went, and the cadence the
    // cancelled subscription delivered at did not come with the
    // triple it freed.
    expect(created.id).not.toBe(digest.id);
    expect(created.intervalSeconds).toBe(HALF_DAILY);
  });
});

// ---------------------------------------------------------------------------
// What a run now moves
// ---------------------------------------------------------------------------

/**
 * Milliseconds in a second, so an expected instant below is
 * arithmetic a reader can check rather than a date literal.
 */
const MILLISECONDS_PER_SECOND = 1000;

/** An hour, as the only distance any clock here is moved by. */
const HOURLY = 3600;

/**
 * The instant `seconds` seconds after `base`.
 *
 * The arithmetic written out rather than taken from the module
 * under test: an expected value derived from the rule it is
 * checking agrees with that rule however wrong the rule is. This
 * verb derives nothing at all — it stores what the clock answered
 * — so what this helper exists for is the SECOND call, where the
 * clock has moved and the expected instant has to move with it.
 *
 * @param base - The instant to measure from.
 * @param seconds - How far after it.
 * @returns A fresh `Date`, so nothing a caller holds moves.
 */
function secondsAfter(base: Date, seconds: number): Date {
  return new Date(base.getTime() + seconds * MILLISECONDS_PER_SECOND);
}

/**
 * Every `SubscriptionRecord` member except the due time, as the
 * set this verb must leave exactly where it found it.
 *
 * DERIVED FROM THE RECORD RATHER THAN LISTED BY HAND. The eight
 * columns worth naming in a sentence are not the claim; the claim
 * is that `nextRunAt` is the ONLY exception, so the exclusion is
 * written as an `Omit` and the list below is held against what
 * that leaves. A column added to `export_subscriptions` — or to
 * the `schedulableColumns()` helper that reaches this record with
 * no subscriptions module edited at all — then has to be named
 * here or `satisfies` refuses the list, where a hand-written eight
 * would have gone on comparing eight members of a wider record,
 * green forever.
 */
type UnmovedByARunNow = Omit<SubscriptionRecord, 'nextRunAt'>;

/** Those members, named, in the order {@link SUBSCRIPTION_KEYS} uses. */
const UNMOVED_KEYS = [
  'connectorId',
  'domainId',
  'enabled',
  'format',
  'id',
  'intervalSeconds',
  'maxIntervalSeconds',
  'minIntervalSeconds',
] as const satisfies readonly (keyof UnmovedByARunNow)[];

/** {@link UNMOVED_KEYS}, held against what it describes. */
type EveryUnmovedKeyListed =
  CoversEveryKey<UnmovedByARunNow, typeof UNMOVED_KEYS>;

/**
 * The `check-types` half of that pin, per {@link EVERY_KEY_LISTED}.
 *
 * `satisfies` above closes the direction where the list names a
 * member the record lacks. This closes the one that matters here:
 * a column arriving on `SubscriptionRecord` and not on the list
 * would sit outside the comparison below without one case going
 * red — which is exactly where a verb writing an extra column
 * would hide.
 */
const EVERY_UNMOVED_KEY_LISTED: EveryUnmovedKeyListed = true;

/**
 * One subscription's {@link UNMOVED_KEYS} members, and nothing
 * else.
 *
 * Built FROM the list rather than by spreading the row and
 * deleting the due time off it: a spread compares whatever members
 * the record happens to carry, which is green against precisely
 * the column nobody knew had arrived.
 *
 * @param row - The subscription to project.
 * @returns Its members under those keys.
 */
function unmovedMembers(
  row: SubscriptionRecord,
): Record<string, unknown> {
  return Object.fromEntries(UNMOVED_KEYS.map((key) => [key, row[key]]));
}

/**
 * Reads one row back off the store, by id.
 *
 * @param planted - The fixture holding it.
 * @param id - The row to read.
 * @returns The stored row.
 * @throws When the store answers null, for the reason
 *   {@link subscriptionFor} gives: two absences compare equal, so
 *   a comparison against a row that is not there would otherwise
 *   pass for nobody's reason.
 */
async function storedSubscription(
  planted: PlantedSubscriptions,
  id: number,
): Promise<SubscriptionRecord> {
  const found = await planted.store.findSubscriptionById(id);

  if (found === null) {
    throw new Error('the store has no row under that id');
  }

  return found;
}

describe('what a run now moves', () => {
  it('writes the instant the clock read', async () => {
    // An EQUALITY rather than a window, which is the whole reason
    // the clock is injected: a verb reading the real present
    // answers a plausible instant no assertion could pin. The
    // whole row is compared against the record as it was planted,
    // per this file's discipline — a run now that also moved the
    // cadence answers a perfectly ordinary subscription.
    const planted = await plantSubscriptions();

    const ran = await runSubscriptionNow(
      planted.store,
      planted.clock.now,
      planted.digest.id,
    );

    expect(ran).toStrictEqual({
      ...planted.digest,
      nextRunAt: FIXED_INSTANT,
    });

    // And again from a clock that has moved. One equality against
    // one fixed instant is also satisfied by a verb writing a
    // constant, and by one that resolved the thunk when the
    // dependency was assembled rather than at the write.
    planted.clock.advanceSeconds(HOURLY);

    const moved = secondsAfter(FIXED_INSTANT, HOURLY);
    const again = await runSubscriptionNow(
      planted.store,
      planted.clock.now,
      planted.digest.id,
    );

    expect(again.nextRunAt).toStrictEqual(moved);
    expect(again.nextRunAt).not.toStrictEqual(FIXED_INSTANT);

    // Read off the row rather than off the answer: a verb that
    // answered an instant it did not store satisfies every line
    // above, and this surface has no other reader of the column to
    // report it.
    const stored = await storedSubscription(planted, planted.digest.id);

    expect(stored.nextRunAt).toStrictEqual(moved);
  });

  it('answers the same row to a second call', async () => {
    // The verb describes a state — due now — rather than an action
    // taken, so a row already due answers again instead of being
    // refused a second time. The two whole answers are compared,
    // not their statuses: a second call that had quietly stopped
    // writing would also not throw.
    const planted = await plantSubscriptions();

    const first = await runSubscriptionNow(
      planted.store,
      planted.clock.now,
      planted.digest.id,
    );
    const second = await runSubscriptionNow(
      planted.store,
      planted.clock.now,
      planted.digest.id,
    );

    expect(second).toStrictEqual(first);

    // The control the equality cannot carry: two matching answers
    // are equally green against a verb that wrote nothing either
    // time, so the FIRST call has to be shown moving the row off
    // the null a create landed it at.
    expect(planted.digest.nextRunAt).toBeNull();
    expect(first.nextRunAt).toStrictEqual(FIXED_INSTANT);

    const stored = await storedSubscription(planted, planted.digest.id);

    expect(stored.nextRunAt).toStrictEqual(FIXED_INSTANT);
  });

  it('leaves every other column where it found it', async () => {
    // The pin above, read so that it is a symbol this file uses
    // rather than one lint reports. Its value is not the claim:
    // the claim is the TS2322 at its declaration the moment
    // `SubscriptionRecord` grows a column {@link UNMOVED_KEYS}
    // misses.
    expect(EVERY_UNMOVED_KEY_LISTED).toBe(true);

    // The containment reading, and the one every equality above is
    // blind to: each of those compares a due time, so a verb that
    // ALSO cleared a bound, flipped `enabled` or re-pointed the
    // row answers all of them. What is compared here is the stored
    // row against a copy of itself taken before the call, member
    // for member, with the due time the only member the projection
    // leaves out.
    //
    // Two rows rather than one, so the nullable bounds are read in
    // both states: `digest` carries neither bound, so a verb
    // WRITING one moves it, and `feed` carries both, so a verb
    // CLEARING one moves it. One row is blind to whichever
    // direction it is not in.
    const planted = await plantSubscriptions();

    const beforeDigest = unmovedMembers(planted.digest);
    const beforeFeed = unmovedMembers(planted.feed);

    await runSubscriptionNow(
      planted.store,
      planted.clock.now,
      planted.digest.id,
    );
    await runSubscriptionNow(
      planted.store,
      planted.clock.now,
      planted.feed.id,
    );

    // Off the STORE rather than off what the verb answered: a verb
    // answering an unmoved record while writing a second column
    // satisfies a comparison against its own return value, and
    // this surface has no other reader to report it.
    const digest = await storedSubscription(planted, planted.digest.id);
    const feed = await storedSubscription(planted, planted.feed.id);

    expect(unmovedMembers(digest)).toStrictEqual(beforeDigest);
    expect(unmovedMembers(feed)).toStrictEqual(beforeFeed);

    // The control neither equality can carry: a verb that wrote
    // NOTHING satisfies both, and so does one that threw before
    // writing. The column it IS allowed to write has to have
    // moved, read off the same two stored rows.
    expect(planted.digest.nextRunAt).toBeNull();
    expect(planted.feed.nextRunAt).toBeNull();
    expect(digest.nextRunAt).toStrictEqual(FIXED_INSTANT);
    expect(feed.nextRunAt).toStrictEqual(FIXED_INSTANT);

    // And that the bounds the projection carries are the two
    // states the pair was planted for, so a fixture whose rows had
    // drifted into agreeing cannot leave one direction unread.
    expect(beforeDigest.minIntervalSeconds).toBeNull();
    expect(beforeDigest.maxIntervalSeconds).toBeNull();
    expect(beforeFeed.minIntervalSeconds).toBeTypeOf('number');
    expect(beforeFeed.maxIntervalSeconds).toBeTypeOf('number');
  });
});
