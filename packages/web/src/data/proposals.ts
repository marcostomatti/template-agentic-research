/**
 * @packageDocumentation
 * The source-config proposal fixtures — the arrangements for reading a
 * feed that nobody has ruled on yet, and what the approval modal on
 * the sources surface renders.
 *
 * `sources.parser_config` says how a feed is read and `sources.contract`
 * says what a correct reading of it looks like. Where a source has
 * neither, or where its contract has started failing, both are proposed
 * together — and the answer is not written onto the source row. It
 * lands in `source_config_proposals` as a pending row, and only an
 * approval moves it across. These rows are that queue.
 *
 * A ROW rather than a branch, which is why there is a table to mirror
 * at all: the proposal is written by one thing, ruled on by another and
 * applied by a third, so the rule about it lives where every writer
 * meets it. The schema records that argument at length; this module
 * only has to carry rows that respect it.
 *
 * ## Where {@link SourceConfigProposal} lives
 *
 * Here, and not in `./types.ts` where every other table redeclaration
 * sits. The two files are for different things: `./types.ts` holds the
 * shapes the shell was built on and survives the swap that deletes the
 * fixtures, while this table is read by ONE surface and arrived after
 * that file was written. Keeping the shape beside the rows is what lets
 * the narrowing below and the rows honouring it be read as the single
 * decision they are. `./api.ts` and `./hooks.ts` each already name this
 * module as the one that redeclares these columns, so the placement is
 * the branch's standing decision rather than this file's.
 *
 * What it costs is one move: when the seam is re-pointed at HTTP this
 * module goes the way of the other fixture modules, and the type has to
 * be lifted into `./types.ts` rather than deleted with the rows around
 * it. It follows that file's three conventions exactly — `T | null`
 * over an optional member, an ISO string over a `Date`, numeric ids —
 * so the lift is a cut and not a rewrite.
 *
 * ## What constrains the rows
 *
 * Nothing here is transcribed from a seed, for the reason `./sources.ts`
 * gives about its own rows and one more of its own. `packages/service/
 * data/` seeds a deployment's VOCABULARY and ships no proposals; a
 * proposal is not configuration an operator writes but an answer
 * something produced about one instance's feed, so there is no file to
 * pin these against and no drift to catch.
 *
 * What constrains them instead is `./sources.ts`. Every row names a
 * source that exists, of the domain the row claims — the two halves the
 * schema holds with a refusing foreign key and a redundant `domain_id`,
 * neither of which a fixture array can enforce. `./proposals.test.ts`
 * is where both are checked, so a source id pointing at nothing is a
 * test failure rather than an approval modal rendering a document about
 * a feed nobody can find.
 *
 * ## The rows, and what each is here for
 *
 * Small on purpose — three states, two rows — and each state is one a
 * modal would otherwise be written as though it never happens:
 *
 * - A source with an APPROVED proposal: someone ruled in favour, and
 *   the modal has a ruling to report rather than a decision to ask for.
 * - A source with a PENDING one: the state the gate exists for, and the
 *   only one the approve and reject actions have anything to act on.
 * - A source with NONE at all, which is not a row but a property of the
 *   set. Source 1 in `./sources.ts` is healthy and has never had a
 *   config proposed for it, and it is what the modal's empty state is
 *   reached with. Leaving every source covered would make that state
 *   unreachable in a running demo.
 *
 * Every row belongs to the seeded domain. The sparse domain that
 * `./domains.ts` exports as `SPARSE_DOMAIN_SLUG` deliberately gets
 * none, which is how the empty list is reached by switching domain
 * rather than by emptying a table — and it is the honest state for a
 * domain with no sources to propose configs for.
 *
 * ## What this set does NOT reach
 *
 * Two limits, both deliberate and neither visible from the rows:
 *
 * - Two of the four {@link ProposalStatus} members are carried. `done`
 *   and `skipped` are storable and nothing here holds one, so a badge
 *   rendering a status per member has two spellings no fixture
 *   rehearses.
 * - The table has no unique key, so several pending proposals may stand
 *   for one source — a feed failing every pass would otherwise be
 *   refused a fresh proposal. This set gives each source at most one,
 *   so the review queue's ordering question is stated by
 *   {@link SOURCE_CONFIG_PROPOSALS} and answered by nothing here.
 *
 * ## Frozen through
 *
 * Unlike the sibling fixture tables, whose rows are flat, every row
 * here carries two nested JSON documents — and `readonly` on the member
 * protects the reference rather than what is inside it. So the array,
 * the rows and both documents are each frozen, on the reasoning
 * `./settings.ts` sets out: `readonly` says it at compile time and
 * `Object.freeze` says it to a caller that has cast the claim away, and
 * a shallow freeze over an object whose interesting members are objects
 * protects nothing worth protecting. The JSON editor that renders these
 * documents is exactly such a caller.
 *
 * The documents themselves are illustrative and well-formed against the
 * shapes the parse engine reads — `recordsPath` and `fields` for a
 * config, `fields` for a contract — so a modal rendering them shows
 * something an operator would recognize rather than filler. Endpoints
 * inside them stay on the reserved example domains `./sources.ts` uses,
 * for the same reason: a fixture pointed at a network must not resolve
 * to somebody's real service.
 */

import type { IsoTimestamp } from './types';

import { DEFAULT_DOMAIN_SLUG, getDomain } from './domains';
import { getSource } from './sources';

/**
 * The `domains.id` every row below references.
 *
 * Read off the domain fixture rather than written as `1`, so a change
 * to the domain table moves these rows with it instead of silently
 * orphaning them. Resolving at module scope means an import of this
 * module fails loudly if the seeded domain ever goes, which is the
 * right time to hear about it: there is no half of this fixture set
 * that still means something without its domain.
 */
const SEEDED_DOMAIN_ID = getDomain(DEFAULT_DOMAIN_SLUG).id;

/**
 * The `sources.id` the approved proposal is about — the push source,
 * which needed a config before anything posted to it could be parsed.
 *
 * Resolved through `getSource` rather than written as `4`, for the
 * reason {@link SEEDED_DOMAIN_ID} is resolved rather than written, and
 * for one the domain does not have: `source_config_proposals.source_id`
 * is a REFUSING foreign key, so a proposal naming a source that is not
 * there is a row the database would never have accepted. A fixture
 * array cannot refuse it, and this throw is the closest thing to the
 * constraint that a module-scope read can be.
 */
const APPROVED_SOURCE_ID = getSource(4).id;

/**
 * The `sources.id` the pending proposal is about — the flagged feed
 * whose contract has started failing, which is the case the propose
 * step exists to answer.
 *
 * Resolved rather than written, for the reason
 * {@link APPROVED_SOURCE_ID} gives.
 */
const PENDING_SOURCE_ID = getSource(3).id;

/**
 * Where a proposal stands in the approval gate: `pending` until it is
 * ruled on, then `approved` and `done` along the accepted path, or
 * `skipped` where it is refused or closed without being applied.
 *
 * Mirrors `RESEARCH_POOL_STATUSES` in
 * `packages/service/src/db/schema/values.ts`, the tuple both
 * `source_config_proposals.status` and `research_pool.status` are
 * constrained to — one gate over two subjects, sharing a vocabulary
 * and not a rule.
 *
 * Named after the proposal rather than after the pool the tuple is
 * named for, which is the one place this redeclaration deliberately
 * does not follow the schema's spelling: `research_pool` is mirrored
 * nowhere in this package, so the shared name would point a reader
 * here at something they cannot find. The TSDoc above is what keeps
 * the two findable from each other.
 *
 * The status is the operator-facing ACCOUNT of the row and not the
 * gate itself. The database refuses nothing on it — a row may carry
 * any member at any time — and what it does hold is the timestamps.
 * See {@link SourceConfigProposal.approvedAt}.
 */
export type ProposalStatus = 'pending' | 'approved' | 'done' | 'skipped';

/**
 * One of the two documents a proposal carries.
 *
 * An open record rather than a described shape, mirroring the columns:
 * `parser_config` and `contract` are `jsonb` carrying no `$type`
 * annotation, because what a parser config holds differs by the
 * source's kind and one interface across all four kinds would describe
 * none of them accurately. The service states that on the columns and
 * checks a document with a validator rather than with a type.
 *
 * That suits what this surface does with them too. The approval modal
 * renders both documents as text for a person to read and rules on the
 * row as a whole, so it needs a document it can serialize and never a
 * member it reads by name — and a shape invented here would be a
 * second, weaker account of a validator that already exists.
 */
export type ProposalDocument = Readonly<Record<string, unknown>>;

/**
 * One proposed arrangement for reading a source, held until a person
 * rules on it — mirrors the `source_config_proposals` table.
 *
 * Narrowed: `proposed_by` and `applied_at` are left out, and both
 * omissions cost something worth naming.
 *
 * `proposed_by` is provenance — the name of whatever produced the two
 * documents. Nothing dispatches or authenticates from it and the
 * approval modal renders the documents rather than their author, so it
 * is weight a fixture would have to invent values for. The cost is that
 * an operator ruling on a config cannot see what wrote it, which is a
 * question for the modal's own task rather than a settled one.
 *
 * `applied_at` is the second half of the gate: when the approved config
 * was written onto the source row. Leaving it out means this shape
 * cannot express `source_config_proposals_approval_check` at all —
 * the rule that a row may record an application only if it already
 * records an approval — and an approved proposal already written onto
 * its source is indistinguishable here from one still waiting. That is
 * a reading the sources surface does not offer and an endpoint would
 * have to answer for a page that did.
 */
export interface SourceConfigProposal {
  /** `source_config_proposals.id`. */
  readonly id: number;
  /**
   * `source_config_proposals.domain_id` → `Domain.id`.
   *
   * Redundant against {@link SourceConfigProposal.sourceId} below,
   * which reaches the same domain through `sources.domain_id`, and
   * carried anyway because the redundancy is what lets a domain be
   * dropped at all — and, here, what lets a domain's review queue be a
   * predicate rather than a join. `./proposals.test.ts` holds the two
   * in agreement, which nothing else does.
   */
  readonly domainId: number;
  /**
   * `source_config_proposals.source_id` → `Source.id`.
   *
   * The feed this arrangement is for. NOT NULL in the schema and
   * required here: a proposal naming no source is an arrangement there
   * is nothing to apply.
   */
  readonly sourceId: number;
  /**
   * `source_config_proposals.parser_config` — what would be written to
   * `sources.parser_config` if this row is approved and applied.
   *
   * Stored on the row rather than composed when it is ruled on, and
   * that ordering is the gate's substance: an operator approves this
   * exact document instead of a description of what a model would
   * answer if it were asked again.
   */
  readonly parserConfig: ProposalDocument;
  /**
   * `source_config_proposals.contract` — the other half of the same
   * answer, and what would be written to `sources.contract`.
   *
   * Proposed and approved together with the config above, because the
   * two describe one arrangement from both ends: an extraction rule
   * approved without the test that says it still holds leaves nothing
   * to notice the day the source's shape drifts, which is the failure
   * the propose path exists to answer in the first place.
   */
  readonly contract: ProposalDocument;
  /**
   * `source_config_proposals.status` — the operator-facing account of
   * where the row stands.
   */
  readonly status: ProposalStatus;
  /**
   * `source_config_proposals.proposed_at` — when the proposal was
   * made. NOT NULL because the proposing IS the insert: there is no
   * window in which one of these rows exists and nothing has been
   * proposed.
   *
   * It is also what a review queue is ordered by, oldest first, which
   * is what makes several proposals for one source workable without a
   * key refusing the later ones.
   */
  readonly proposedAt: IsoTimestamp;
  /**
   * `source_config_proposals.approved_at` — when a person ruled in
   * favour. NULL means nobody has, which is the state every row starts
   * in and the one an apply step passes over.
   *
   * `T | null` rather than an optional member, per `./types.ts`: the
   * absence is a value the schema stores and reasons about, and this
   * is the column the database actually holds to a rule rather than
   * {@link SourceConfigProposal.status} beside it.
   */
  readonly approvedAt: IsoTimestamp | null;
}

/**
 * The approved proposal — the push source's first config, ruled on the
 * day after it was proposed.
 *
 * A source with an approved config that has still never been read is
 * not a contradiction: nothing polls a `push` source, so its config is
 * ready for a payload that has not been posted yet. That is the state
 * source 4 in `./sources.ts` carries, and this row is why it can hold
 * one at all.
 *
 * Declared as its own annotated constant rather than inlined below for
 * the reason `./settings.ts` gives about `DIGEST_DEFAULTS`: a literal
 * handed straight to `Object.freeze` widens `status` to `string` and
 * would take any spelling. The annotation is what keeps it a
 * {@link ProposalStatus}.
 */
const APPROVED_PROPOSAL: SourceConfigProposal = Object.freeze({
  id: 1,
  domainId: SEEDED_DOMAIN_ID,
  sourceId: APPROVED_SOURCE_ID,
  // A posted payload: records under a key, three fields read by path.
  parserConfig: Object.freeze({
    recordsPath: 'items',
    fields: Object.freeze({
      title: Object.freeze({ path: 'title' }),
      url: Object.freeze({ path: 'link' }),
      publishedAt: Object.freeze({ path: 'published_at' }),
    }),
  }),
  // Two members required and one shape checked. A contract that
  // declared nothing would pass every payload, which is the documented
  // cost of leaving the column at its default.
  contract: Object.freeze({
    fields: Object.freeze({
      title: Object.freeze({ required: true, type: 'text' }),
      url: Object.freeze({ required: true, pattern: '^https://' }),
    }),
  }),
  status: 'approved',
  proposedAt: '2026-06-08T09:15:00.000Z',
  // Ruled on a day later, which is the lag a gate with a person in it
  // has. A same-instant pair would rehearse an approval nobody waited
  // for.
  approvedAt: '2026-06-09T08:05:00.000Z',
});

/**
 * The pending proposal — a fresh arrangement for the feed whose
 * contract has started failing.
 *
 * Source 3 in `./sources.ts` is the drifting one: flagged, three
 * consecutive failures, and a last failure stamped at the capture its
 * contract rejected. This proposal is dated after that failure, which
 * is what makes it a response to it rather than a coincidence — and it
 * is the row the approve and reject actions have something to act on.
 *
 * Annotated for the reason {@link APPROVED_PROPOSAL} is.
 */
const PENDING_PROPOSAL: SourceConfigProposal = Object.freeze({
  id: 2,
  domainId: SEEDED_DOMAIN_ID,
  sourceId: PENDING_SOURCE_ID,
  // A feed whose records nest under a path, with one field reaching
  // through markup — the step that makes this a different arrangement
  // from the config the source is running on now.
  parserConfig: Object.freeze({
    recordsPath: 'channel.item',
    fields: Object.freeze({
      title: Object.freeze({ path: 'title' }),
      url: Object.freeze({ path: 'guid' }),
      summary: Object.freeze({
        path: 'description',
        selector: 'p',
        type: 'text',
      }),
      publishedAt: Object.freeze({ path: 'pubDate' }),
    }),
  }),
  contract: Object.freeze({
    fields: Object.freeze({
      title: Object.freeze({ required: true, type: 'text' }),
      url: Object.freeze({ required: true, pattern: '^https://' }),
      publishedAt: Object.freeze({ required: true }),
    }),
  }),
  status: 'pending',
  // After the failure `./sources.ts` stamps on source 3, and before
  // FIXTURE_NOW: a proposal made in response to a contract that has
  // just stopped holding, still waiting on somebody.
  proposedAt: '2026-06-11T06:20:00.000Z',
  // The pending state, and the whole of it. Nothing has been ruled.
  approvedAt: null,
});

/**
 * The proposals a person may rule on — `source_config_proposals` rows,
 * oldest first.
 *
 * Review-queue order, which is `proposed_at` ascending with `id` as the
 * tiebreak — the order `listPendingProposals` in the service reads
 * them, and what makes several proposals for one source workable
 * without a key refusing the later ones. Ids ascend with the stamps
 * because a bigserial does, so the two orders agree here and
 * `./proposals.test.ts` pins that they do.
 *
 * Nothing re-sorts them and no accessor copies a row: every member of
 * {@link SourceConfigProposal} is `readonly` and every row is frozen,
 * so handing one out is not handing out a way to change it.
 */
export const SOURCE_CONFIG_PROPOSALS: readonly SourceConfigProposal[]
  = Object.freeze([APPROVED_PROPOSAL, PENDING_PROPOSAL]);

const PROPOSALS_BY_ID = new Map<number, SourceConfigProposal>(
  SOURCE_CONFIG_PROPOSALS.map((proposal) => [proposal.id, proposal]),
);

/**
 * The proposals of one domain, oldest first.
 *
 * Scoped by numeric id rather than by slug: `./api.ts` is the module
 * that speaks slugs, and it resolves one through `getDomain`, whose
 * throw is where an unknown domain is refused. A domain with no
 * proposals answers `[]`, which is a state the fixtures reach on
 * purpose rather than an error.
 *
 * Every status, not just the pending ones, and the distinction matters
 * to the surface that reads it: a modal filtering to `pending` alone
 * could not tell a source whose config was already approved from one
 * nothing has ever proposed for, and those are different sentences to
 * put in front of an operator. Which proposals belong to which source
 * is the same kind of reading — a filter over this list, made where the
 * modal knows the source it is about.
 *
 * @param domainId - The `domains.id` whose proposals are wanted.
 * @returns Its proposals, oldest first. Never the stored array.
 */
export function listSourceProposals(
  domainId: number,
): readonly SourceConfigProposal[] {
  return SOURCE_CONFIG_PROPOSALS.filter(
    (proposal) => proposal.domainId === domainId,
  );
}

/**
 * Look a proposal up by id, tolerating a miss.
 *
 * Use this where an unknown id is an ordinary outcome, which a proposal
 * id genuinely is: the table has no unique key over its source, so a
 * queue an operator is looking at may have moved on — somebody else
 * ruled on the row, or a later proposal replaced it — and a ruling
 * carrying the id of a row that is no longer pending is a state the
 * modal answers rather than a fault. Where a miss would mean a broken
 * fixture instead, {@link getSourceProposal} says so louder.
 *
 * @param id - The `source_config_proposals.id` wanted.
 * @returns The proposal, or `undefined` if no fixture carries that id.
 */
export function findSourceProposal(
  id: number,
): SourceConfigProposal | undefined {
  return PROPOSALS_BY_ID.get(id);
}

/**
 * Look a proposal up by id, or throw.
 *
 * @param id - The `source_config_proposals.id` wanted.
 * @returns The proposal carrying that id.
 * @throws If no fixture proposal carries it.
 */
export function getSourceProposal(id: number): SourceConfigProposal {
  const proposal = findSourceProposal(id);

  if (proposal === undefined) {
    throw new Error(`Unknown source config proposal id: ${id}`);
  }

  return proposal;
}
