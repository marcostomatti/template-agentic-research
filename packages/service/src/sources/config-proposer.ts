/**
 * @packageDocumentation
 * config-proposer — the seam a source's `parser_config` and
 * `contract` are proposed through, and the two pure halves either
 * side of it.
 *
 * NOT an adapter, which is the first thing to know about the file:
 * it fronts no source, declares no member of the `SourceAdapter`
 * contract in `./index.ts`, opens nothing and appears in no
 * registry. What it is about is the pair of `sources` columns an
 * adapter READS — how records are taken out of a payload, and what
 * a correct reading looks like — and the separate question of who
 * is allowed to write them.
 *
 * ## The path, in the order a proposal travels it
 *
 * 1. Something is asked for an arrangement. {@link ConfigProposer}
 *    is that something, as an interface: one method, handed the
 *    source it is proposing for and one sample payload, answering
 *    the two documents.
 * 2. {@link proposalToPendingRow} turns that answer into a
 *    `source_config_proposals` insert. Pending, because `status`
 *    defaults to `pending` and nothing here says otherwise.
 * 3. A person rules on the row. That is `scripts/approve.ts`,
 *    against a database, and no member of this module is involved.
 * 4. {@link proposalToSourceUpdate} turns an approved row into the
 *    UPDATE for the source, and refuses a row nobody approved.
 *
 * {@link proposeSourceConfig} is steps 1 and 2 in one call, and the
 * only place the seam is actually crossed.
 *
 * ## No proposer is constructed by default
 *
 * {@link ConfigProposer} is declared here and implemented nowhere.
 * There is no factory in this module, no default standing in for
 * one, and nothing in this service builds one at startup: a run
 * that wants a proposal builds its own from the `connectors` row
 * naming the model endpoint it is entitled to call, and hands it
 * in.
 *
 * That is what keeps the isolated suite offline, and it is the
 * enforcement rather than a convention. The cases beside this file
 * drive an injected stub — one that answers from a literal, one
 * that throws — and never a model server, because the only thing
 * in reach that could call one is a parameter. The transport
 * `./listing-api.ts` injects is the same decision about the same
 * kind of reach: a call to something outside is visible in the
 * call that made it, or it does not happen.
 *
 * ## Only the approval writes those two columns
 *
 * A proposed `parser_config` is a document a model wrote about a
 * feed it read one page of. Writing it onto the source row is what
 * makes the pipeline read every later page that way, and nothing
 * downstream ever undoes it — the next pass extracts under
 * whatever the column holds and stores what it got. So the write
 * is gated, and the gate is a row an operator rules on rather than
 * a branch inside whatever asked.
 *
 * The database holds one half of that rule and this module holds
 * the other, and they are not the same rule.
 * `source_config_proposals_approval_check` reads the two timestamps
 * on the proposal row, so a row cannot record that it was applied
 * without recording that it was approved. It says nothing whatever
 * about `sources`, as its own comment states: a writer that skips
 * the table and rewrites `sources.parser_config` directly is
 * refused by nothing. {@link proposalToSourceUpdate} is what stands
 * in that gap on the apply path, and it keys on the same account
 * the CHECK does — `approved_at`, never `status`, which the
 * database does not consult either and which may disagree with it.
 *
 * ## What is stored is what was answered
 *
 * Nothing here validates a proposal, and that is the column's own
 * decision rather than an omission. `parserConfigErrors` in
 * `src/lib/parser-config.ts` says whether a config is well-formed,
 * and an operator reading the queue is who that answer is for: a
 * malformed proposal is storable, says something true about what
 * was asked, and is one to reject rather than one the table should
 * refuse. Both documents travel from the proposer's answer to the
 * insert unread and uncopied, which is what makes the approval an
 * approval of this exact document.
 *
 * Node-only, and not because of an import. Nothing under
 * `src/sources/` is spliceable into a workflow at all —
 * `assertMarkerPath` in `scripts/workflow-markers.ts` refuses a
 * marker path holding a `..` segment — so a Code node reaches none
 * of this, and the propose path runs where a connector can be read
 * and a database written.
 */
import type { sourceConfigProposals, sources } from '../db/schema.js';

// ---------------------------------------------------------------------------
// What crosses the seam
// ---------------------------------------------------------------------------

/**
 * The `sources` row members a proposer is shown.
 *
 * A `Pick` over the row type rather than an interface of its own,
 * so a column renamed in `src/db/schema/sources.ts` stops this file
 * compiling instead of leaving a member that names nothing. `kind`
 * is `string` here for the same reason: that is what a SELECT
 * answers, the tuple it is held to being a CHECK in the database
 * rather than a union in the type system.
 *
 * Four members, and what they leave out is the substance. `cursor`
 * is where the last fetch stopped, which is state a proposal must
 * not move. `enabled`, `flagged`, `consecutive_failures` and the
 * two stamps are the health half, answered by
 * `src/lib/source-health.ts` and nobody else. And the current
 * `parser_config` and `contract` are left out deliberately: a
 * proposer answers what the sample payload says the arrangement
 * should be, and handing it the arrangement that is currently
 * failing gives it something to copy.
 *
 * The cost of that last omission is worth naming, because it is
 * real. A proposer cannot answer "the config is right and the
 * source changed", and it cannot improve on a config by degrees.
 * The comparison happens where the ruling does: an operator has the
 * pending row and the source row both in front of them.
 */
export type ProposalSource = Pick<
  typeof sources.$inferSelect,
  'domainId' | 'endpoint' | 'id' | 'kind'
>;

/**
 * What a proposer answers: the two documents, together.
 *
 * Together because they describe one arrangement from both ends,
 * which is the argument `source_config_proposals.contract` makes at
 * the column — an extraction rule approved without the test that
 * says it still holds leaves nothing to notice the day the source's
 * shape drifts, and a failing contract is what asks for a proposal
 * in the first place.
 *
 * Both `unknown`, matching the columns they are bound for, which
 * carry no `$type` annotation. A proposer's answer is a document
 * that arrived from outside; typing it as `ParserConfig`
 * would be this module asserting a shape nothing has checked, and
 * every reader downstream would then be reading a guarantee that
 * was never made.
 */
export interface ProposedConfig {
  /** The proposed `parser_config`, as answered. */
  readonly parserConfig: unknown;
  /** The proposed `contract`, as answered. */
  readonly contract: unknown;
}

/**
 * Whatever proposes a source's arrangement.
 *
 * One method and one property, and the property is provenance: the
 * name goes into `source_config_proposals.proposed_by`, so what
 * produced a stored document is recorded by the thing that produced
 * it rather than by a string a caller passes alongside. The column
 * takes it as text and resolves it against nothing, which is what
 * lets it survive the connector being renamed or deleted.
 *
 * A model client is the expected implementation and is not the only
 * one this shape admits. Anything that can answer two documents for
 * a source and a sample satisfies it, including something
 * deterministic, and nothing in the propose path asks which it was.
 *
 * Asynchronous because the expected implementation calls something.
 * A proposer that fails — unreachable, refused, timed out — throws
 * or rejects, and {@link proposeSourceConfig} lets that through
 * untouched; the reason is written there.
 */
export interface ConfigProposer {
  /**
   * What this proposer is called, as
   * `source_config_proposals.proposed_by` will record it. The
   * `connectors.name` of the endpoint that was asked, where one was.
   */
  readonly name: string;
  /**
   * Answers an arrangement for one source.
   *
   * @param source - The source being proposed for.
   * @param sample - One payload from it, as `fetch` returned one.
   * @returns The two documents.
   */
  propose(
    source: ProposalSource,
    sample: unknown,
  ): Promise<ProposedConfig>;
}

// ---------------------------------------------------------------------------
// The rows either side of the gate
// ---------------------------------------------------------------------------

/** The `source_config_proposals` row as an insert sees it. */
type ProposalInsert = typeof sourceConfigProposals.$inferInsert;

/**
 * The insert {@link proposalToPendingRow} answers: five columns,
 * and every other column of that table left to its default.
 *
 * The omissions are the enforcement, in the way
 * `src/lib/source-health.ts` describes for the columns it declines
 * to answer — a column mentioned is a column somebody eventually
 * writes a value into. Three matter here.
 *
 * `status` is absent, so a proposal is `pending` because the column
 * says so. Naming it here would put the propose path in the
 * business of setting the state of its own proposal, and `done`
 * spells the same number of characters as `pending`.
 *
 * `approved_at` is absent, and that is the same edit one keystroke
 * from the thing this whole module exists to prevent. Nothing that
 * proposes may name that column, so the propose path is arranged so
 * that it cannot: the value it answers has no such member, and a
 * writer spreading it into an insert has nothing to spread.
 *
 * `proposed_at` is absent so the stamp is the transaction's, which
 * is also what makes the queue orderable — `scripts/approve.ts`
 * reads oldest first, and a clock read in this process would date
 * the proposal at whenever the caller got round to writing it.
 *
 * Derived from the table rather than written out, so a column
 * renamed under `src/db/schema/` fails here rather than at the
 * INSERT. `Required` because the two documents are optional to an
 * insert — they have defaults — and are not optional to this: a row
 * proposing nothing is a row the default would have written
 * anyway, and the builder that answered it would be reporting a
 * proposal nobody made.
 */
export type PendingProposalRow = Required<Pick<
  ProposalInsert,
  'contract' | 'domainId' | 'parserConfig' | 'proposedBy' | 'sourceId'
>>;

/**
 * The proposal row {@link proposalToSourceUpdate} rules on: what it
 * reads, and nothing else.
 *
 * A whole selected row satisfies it, which is the ordinary call —
 * this is the floor rather than the ceiling. What the four members
 * say is which columns the decision actually rests on, and the
 * omission worth reading is `source_id`. It is not here because the
 * answer does not carry it either: the source is the UPDATE's
 * WHERE, and a value that named it in this shape would sooner or
 * later be spread into a SET clause.
 *
 * `applied_at` is not read. Re-applying an approved proposal writes
 * the same two documents onto the same source, so there is nothing
 * for this function to protect by refusing it, and the selection
 * that skips already-applied rows belongs to whoever is walking the
 * queue.
 */
export type ApprovedProposal = Pick<
  typeof sourceConfigProposals.$inferSelect,
  'approvedAt' | 'contract' | 'id' | 'parserConfig'
>;

/**
 * The UPDATE an approval authorizes: exactly the two columns, and
 * exactly as they were proposed.
 *
 * Derived from the `sources` insert shape, so this is the pair of
 * columns that table actually has. `Required` for the reason
 * {@link PendingProposalRow} gives — both carry defaults, and an
 * apply that answered neither would be an apply that did nothing
 * while reporting a write.
 */
export type SourceConfigUpdate = Required<Pick<
  typeof sources.$inferInsert,
  'contract' | 'parserConfig'
>>;

// ---------------------------------------------------------------------------
// Propose
// ---------------------------------------------------------------------------

/**
 * The four members a proposer is shown, copied out.
 *
 * The narrowing is the whole of it, and it is needed because
 * {@link ProposalSource} is structural: a caller holding a whole
 * `sources` row satisfies that annotation, and forwarding the value
 * it passed would show a model endpoint the row's cursor and its
 * current arrangement along with everything else the row carries.
 * An annotation is a floor; copying the members out is what makes
 * it a ceiling.
 *
 * A fresh object per call rather than a shared one, which is the
 * rule everywhere here and is not waste: the caller's row is not
 * ours to hold on to, and two proposals running at once would
 * otherwise be shown one source between them.
 *
 * @param source - Whatever the caller passed.
 * @returns Just the four members, as a new object.
 */
function proposalSourceView(source: ProposalSource): ProposalSource {
  return {
    id: source.id,
    domainId: source.domainId,
    kind: source.kind,
    endpoint: source.endpoint,
  };
}

/**
 * One proposal, as the row that will carry it.
 *
 * Pure, and it takes `proposedBy` as a parameter rather than
 * reading it off a proposer, because a proposal need not have come
 * through one: an operator writing an arrangement by hand goes
 * through the same table and the same ruling, and names themselves
 * the same way. {@link proposeSourceConfig} is what fills it from
 * {@link ConfigProposer.name} for the model case.
 *
 * Both documents are carried across by reference and neither is
 * read, copied or checked. `parserConfigErrors` in
 * `src/lib/parser-config.ts` is what says whether the config is
 * well-formed, and the answer is for the person ruling on the row —
 * a proposal the engine would refuse is a real proposal, stored,
 * saying that a model was asked and answered with something
 * unusable. Refusing to build the row would leave that fact
 * nowhere.
 *
 * An empty `proposedBy` is passed through for the reason the column
 * gives: NOT NULL is not the same as non-empty, and an empty string
 * is a writer that did not say rather than a proposal with no
 * author.
 *
 * @param source - The source this arrangement is for.
 * @param proposal - The two documents, as answered.
 * @param proposedBy - What to record as having proposed them.
 * @returns The insert, with every other column left to its default.
 */
export function proposalToPendingRow(
  source: ProposalSource,
  proposal: ProposedConfig,
  proposedBy: string,
): PendingProposalRow {
  return {
    domainId: source.domainId,
    sourceId: source.id,
    parserConfig: proposal.parserConfig,
    contract: proposal.contract,
    proposedBy,
  };
}

/**
 * Ask a proposer for an arrangement, and answer the row that would
 * record it.
 *
 * The only place the seam is crossed, which is why it is one
 * function rather than a step a caller writes twice. What it does
 * is narrow the source, hand it over with the sample, and build the
 * pending row from what came back.
 *
 * A proposer that throws or rejects is let through untouched, and
 * that is a decision rather than an absent `try`. Catching it would
 * merge two states that are not the same: a proposer that could not
 * be reached, and a proposer that answered something unusable. Only
 * the second is a proposal. A caught failure would write a pending
 * row for a question nobody answered, an operator would rule on an
 * empty arrangement produced by a timeout, and the row would
 * read exactly like a model that had genuinely answered with
 * nothing. The run that owns the connector is also the only thing
 * that can retry, back off, or record the failure against the
 * endpoint it was reaching.
 *
 * The sample is passed on and never stored. This row records the
 * ANSWER rather than the question, and where the payload matters it
 * is already in `documents.raw`.
 *
 * @param proposer - What to ask.
 * @param source - The source to propose for.
 * @param sample - One payload from it, as `fetch` returned one.
 * @returns The pending row, ready to insert.
 * @throws Whatever the proposer threw, unwrapped.
 */
export async function proposeSourceConfig(
  proposer: ConfigProposer,
  source: ProposalSource,
  sample: unknown,
): Promise<PendingProposalRow> {
  const proposal = await proposer.propose(proposalSourceView(source), sample);

  return proposalToPendingRow(source, proposal, proposer.name);
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

/**
 * The UPDATE an approved proposal authorizes.
 *
 * Two members and no others, and that is what the function is for
 * as much as the refusal above it is. The answer IS the SET clause:
 * a caller spreads it, so anything this shape carried would be
 * written onto the source. `status` is not in it because the
 * proposal's state is the proposal's; `applied_at` is not, because
 * it belongs on the proposal row rather than on the source; and the
 * source's own id is not, because that is the WHERE.
 *
 * The refusal is a `throw` rather than a `null`, and the two
 * neighbours it could have followed both make the other choice:
 * `approveById` in `scripts/approve.ts` answers `null` for a row
 * that is not there, and `sourceHealth` in
 * `src/lib/source-health.ts` refuses nothing at all. What separates
 * this one is that the wrong answer is silent and permanent. A
 * caller handed `null` here has an empty value to spread into an
 * UPDATE, and an UPDATE with nothing in its SET clause is not an
 * error anywhere in the stack; a caller handed the two documents
 * for an unapproved proposal writes them, and the next pass reads
 * every page of that source under an arrangement nobody agreed to.
 * Neither is undone by a later pass, so the refusal is loud.
 *
 * It reads `approved_at` and nothing else, which is the same
 * account `source_config_proposals_approval_check` is written
 * against. `status` is deliberately not consulted: the column's own
 * comment says a writer may set any member at any time, so a row
 * stamped `done` with no approval is storable, and a gate reading
 * the status would open for it. The stamp is read through `??`, so
 * a NULL column and a member a caller projected away are one
 * answer — a row that cannot say it was approved is a row that was
 * not.
 *
 * What it does NOT refuse is worth reading beside that. A proposal
 * already applied is answered again, for the reason
 * {@link ApprovedProposal} gives. A malformed `parser_config` that
 * somebody approved anyway is answered, because the approval is the
 * gate and this is not a second one. And nothing here is written:
 * the answer is a value, and whether the UPDATE happened is known
 * only to whoever ran it.
 *
 * @param row - The proposal, as selected.
 * @returns The two columns to write onto its source.
 * @throws {Error} When the row carries no `approved_at`.
 */
export function proposalToSourceUpdate(
  row: ApprovedProposal,
): SourceConfigUpdate {
  const approvedAt = row.approvedAt ?? null;

  if (approvedAt === null) {
    throw new Error(
      `[config-proposer] proposal ${row.id} carries no approved_at, `
      + 'and only an approval writes parser_config and contract onto '
      + 'a source. The CHECK on the proposal row constrains that '
      + 'row\'s own two timestamps and says nothing about sources, so '
      + 'this is the refusal standing between an unruled proposal and '
      + 'the columns every later pass reads.',
    );
  }

  return {
    parserConfig: row.parserConfig,
    contract: row.contract,
  };
}
