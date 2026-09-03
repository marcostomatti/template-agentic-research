/**
 * @packageDocumentation
 * The digest's row actions: ruling on a finding, and queueing one for
 * research.
 *
 * The action `./DigestPage.tsx` already offers is a navigation and has
 * no decision in it — opening a row is a route change, which the page
 * performs directly. These two are the other kind: each produces a NEW
 * finding for the seam to record, and each has a rule that is easy to
 * get subtly wrong. Both controls now exist — the row menu in
 * `./DigestPage.tsx` and the verdict control in
 * `./DigestDetailModal.tsx` — and both read this module rather than
 * holding a rule of their own, because a decision written into a
 * `.tsx` is reachable by no test in this package at all.
 *
 * So both live here as pure functions: nothing below renders, imports
 * React or reads a clock. That is the arrangement `./rows.ts` and
 * `./timeWindow.ts` are in, and for the same reason — the node unit
 * suite collects `src/**` `.ts` and reaches no `.tsx`.
 *
 * ## The option list is the domain's ladder, plus whatever is stored
 *
 * A verdict vocabulary belongs to its domain: `../../data/types.ts`
 * keeps `Finding.verdict` a plain string because the column carries no
 * CHECK, and `../../data/domains.ts` resolves the ladder a domain that
 * configures none is judged against. So the options a control offers
 * come from the domain and are not a constant here.
 *
 * That leaves two values the ladder cannot supply, and `@ar/ui`'s
 * `Select` makes both dangerous rather than merely untidy: it resolves
 * a value none of its options carry to the FIRST option, silently, so
 * a control drawn short offers up somebody else's reading of the row.
 * {@link verdictChoices} therefore takes the STORED verdict as an
 * argument and guarantees it a place —
 *
 * - a finding carrying a verdict the domain has since dropped from its
 *   ladder still draws as what it says it is, rather than as the most
 *   negative rung; and
 * - a finding nobody has ruled on draws as {@link NO_VERDICT_VALUE},
 *   which is a real option rather than the absence of one, because
 *   `Select` holds a `string` and there is no spelling of null in it.
 *
 * {@link verdictSelectValue} and {@link readVerdictChoice} are the two
 * halves of that translation and are one claim: what the control is
 * handed for a stored verdict, and what its answer means as a column
 * value. Unlike the polarity narrowing in `../lexicon/terms.ts` this
 * pair narrows nothing else — the column is open on purpose, and a
 * module refusing a verdict here would re-close what the schema left
 * open for every domain that had exercised its own ladder.
 *
 * ## Which array stance this module is in
 *
 * {@link verdictChoices} answers a MUTABLE array, built fresh per call
 * and owned by nobody — the stance `../filters.ts` and
 * `../lexicon/terms.ts` take, and the opposite of the frozen tables in
 * `../../data/`. `SelectProps.options` is declared mutable, so a
 * `readonly` return would protect nothing and cost the call site a
 * copy of a copy.
 *
 * ## Queueing rides on the finding, and that is a seam narrowing
 *
 * Noticing that something is worth looking into and looking into it
 * are separate events: the intention is queued and a later paced pass
 * drains it, which is what stops one busy ingest becoming an afternoon
 * of searches nobody asked for. The row that records the intention is
 * a `research_pool` row — the table `../../data/proposals.ts` names as
 * the sibling its own status vocabulary is shared with, and the one
 * table in that gate this package mirrors nowhere.
 *
 * It mirrors it nowhere because the fixture seam could not use one.
 * `../../data/drafts.ts` states in as many words that its store EDITS
 * rows and cannot insert one, and the only write this surface has for
 * a finding is `saveFinding`. So the intention is recorded on the
 * finding itself, under {@link RESEARCH_REQUEST_FIELD} — a key this
 * shell reserves, namespaced with a colon so it cannot be mistaken for
 * one of the domain's own contract fields, and read back by the two
 * readers below it — {@link researchRequestedAt} for the stamp itself
 * and {@link isShellField} for the convention that hides it — and by
 * nothing else. Nothing in `./rows.ts` reads it, so it reaches no cell
 * and no search.
 *
 * That is a narrowing worth stating rather than discovering: the key
 * is not a column, the domain never declared it, and it goes with the
 * fixture modules the day the seam is re-pointed. What survives the
 * swap is {@link sendToResearch}'s GUARD, which is the part that is
 * not a stand-in at all — the pool carries no unique key over the
 * nullable columns that cite a finding (`packages/service/src/db/
 * schema/entities.ts` says so, and says a key could not be added that
 * would fire for exactly the rows most likely to repeat), so
 * deduplicating an intention is the writer's job and this surface is a
 * writer. A second send is not a louder request; it is a second row
 * that gets researched twice.
 *
 * ## Nothing here quotes a finding
 *
 * The one sentence this module builds is a constant. A refusal an
 * operator reads goes into the DOM, into a screenshot and into
 * whatever is pasted into a support thread, so it is written from this
 * module's own vocabulary and never from a payload —
 * `../../components/jsonDraft.ts` carries the argument at length and
 * `../lexicon/terms.ts` keeps the same rule for the same reason.
 */

import type { Finding, IsoTimestamp } from '../../data/types';
import type { SelectOption } from '@ar/ui';

import { UNRATED_VERDICT_LABEL } from './rows';

/**
 * The value the verdict control holds for a finding nobody has ruled
 * on.
 *
 * `Select` takes a `string`, and NULL is the column's ordinary state
 * rather than an error, so the unruled reading needs a value of its
 * own — and picking it is how a ruling is taken back, which the
 * column permits and no other control in this shell offers.
 *
 * Namespaced with a colon on the reasoning
 * {@link RESEARCH_REQUEST_FIELD} sets out: a verdict is a word a
 * domain puts on a ladder, and this is not one. Should a domain spell
 * it anyway, {@link verdictChoices} answers ONE option for it rather
 * than two — the unruled one, since it leads the list — which is a
 * duplicate a `Select` would otherwise render as a second, unreachable
 * radio item.
 */
export const NO_VERDICT_VALUE = 'ar:no-verdict';

/**
 * The `fields` key a queued intention is recorded under.
 *
 * Not a column and not a contract field: the header says why a
 * `research_pool` row cannot be raised through this seam, and this is
 * the stand-in it leaves. The colon is what keeps it out of the
 * domain's namespace — every key a `fieldContract` declares is a plain
 * identifier (`summary`, `firstSeenAt`, `isOpenSource`), so a reader
 * of a payload can tell at a glance which keys are the domain's and
 * which are this shell's.
 *
 * Its value is the instant the intention was raised, which is what
 * `research_pool.created_at` holds. A boolean would have been shorter
 * and would have left the surface nothing to say about WHEN.
 */
export const RESEARCH_REQUEST_FIELD = 'ar:researchRequestedAt';

/**
 * What marks a payload key as this shell's rather than the domain's.
 *
 * The colon {@link RESEARCH_REQUEST_FIELD} is namespaced with, held as
 * a constant because {@link isShellField} is the second place that
 * convention is applied and a second literal is how the two would
 * drift apart.
 */
const SHELL_FIELD_MARK = ':';

/**
 * What the send action says about a finding already in the queue.
 *
 * Two sentences because the refusal alone would read as a rule this
 * shell invented. The second one is the reason the guard is here and
 * not below: see the header.
 */
export const ALREADY_QUEUED_REASON = 'Already queued for research. '
  + 'The queue is drained a few rows at a time, and nothing beneath '
  + 'this screen refuses a second intention for the same finding.';

/**
 * What asking for a finding to be researched produced.
 *
 * Discriminated rather than a finding that may be `undefined`, for the
 * reason `../../components/jsonDraft.ts` gives about its own parse
 * result: the refusal carries something to show, and a caller that
 * merely checked for absence would have nothing to render and no way
 * to tell a refusal from a transition that had quietly stopped
 * happening.
 */
export type ResearchSendOutcome =
  | { readonly sent: true; readonly finding: Finding }
  | { readonly sent: false; readonly reason: string };

/**
 * What one offered value is called in the control.
 *
 * Every verdict is shown in the domain's own words, exactly as
 * `./DigestPage.tsx` shows them in its filter — a ladder title-cased
 * into something the domain never said would be this shell editing a
 * vocabulary it does not own.
 *
 * @param value - An offered value.
 * @returns Its label.
 */
function verdictLabel(value: string): string {
  return value === NO_VERDICT_VALUE
    ? UNRATED_VERDICT_LABEL
    : value;
}

/**
 * What the verdict control offers for one finding.
 *
 * The unruled option, then the domain's ladder in its own order, then
 * the stored verdict where the ladder does not already carry it. The
 * ladder's order is load-bearing — `../../data/domains.ts` records
 * that it runs from most negative to most positive — so nothing here
 * re-sorts it, and a stored verdict the domain has dropped joins at
 * the END rather than being spliced into a rung it no longer occupies.
 *
 * Values are de-duplicated, first occurrence winning, which is what
 * makes the common case (a stored verdict the ladder DOES carry) offer
 * one option rather than two. A duplicate value in a `Select` renders
 * a second, unreachable radio item rather than an error, so this is a
 * defect that would never announce itself.
 *
 * Built fresh per call and owned by nobody — see the header on which
 * array stance this module is in.
 *
 * Not called `verdictOptions`: `./DigestPage.tsx` already binds that
 * name for the FILTER's list, and the two are different controls
 * rather than one list used twice. The filter leads with the option
 * that filters nothing and never offers the unruled reading; this one
 * leads with the unruled reading and never offers a value that stands
 * for every verdict at once.
 *
 * @param vocabulary - The domain's ladder, in its own order.
 * @param stored - The finding's current verdict, or null where nobody
 * has ruled on it.
 * @returns One option per distinct value, the unruled one leading.
 */
export function verdictChoices(
  vocabulary: readonly string[],
  stored: string | null,
): SelectOption[] {
  const offered = stored === null
    ? [NO_VERDICT_VALUE, ...vocabulary]
    : [NO_VERDICT_VALUE, ...vocabulary, stored];

  return [...new Set(offered)].map((value) => ({
    value,
    label: verdictLabel(value),
  }));
}

/**
 * The value the control is handed for a stored verdict.
 *
 * Half of the translation {@link readVerdictChoice} completes, and the
 * half that must agree with {@link verdictChoices}: the value handed
 * to a `Select` has to be one the option list carries, or the control
 * resolves it to the first option and the row is drawn wearing
 * somebody else's ruling.
 *
 * @param stored - The finding's current verdict, or null.
 * @returns The value naming that state.
 */
export function verdictSelectValue(stored: string | null): string {
  return stored === null
    ? NO_VERDICT_VALUE
    : stored;
}

/**
 * What a control's answer means as a column value.
 *
 * The other half of the translation, and total: `Select` hands its
 * `onChange` a bare `string`, every value it can hand back came from
 * {@link verdictChoices}, and every one of those is either the unruled
 * sentinel or a verdict. There is nothing to refuse — see the header
 * on why a narrowing here would be re-closing an open column — so
 * this is a rename of one value and a pass-through of the rest.
 *
 * @param value - Whatever the control reported.
 * @returns The verdict it names, or null for the unruled option.
 */
export function readVerdictChoice(value: string): string | null {
  return value === NO_VERDICT_VALUE
    ? null
    : value;
}

/**
 * The finding after a ruling changes.
 *
 * A fresh row every time, with nothing else touched. Both halves of
 * that matter. The row is a value a query answered and a mutation
 * hands back to `saveFinding`, so one mutated in place would compare
 * equal to itself and render nothing — the reasoning
 * `../lexicon/terms.ts` records for its own movers. And the members
 * this does not name are carried rather than rebuilt, which is what
 * keeps `score` NULL where a finding has never been scored: null is
 * not zero here, the two reach different cells, and a transition that
 * defaulted its way past the distinction would erase it on the first
 * ruling.
 *
 * The verdict is not checked against the domain's ladder, deliberately
 * — see the header.
 *
 * @param finding - The row as it stands.
 * @param verdict - The new ruling, or null to take one back.
 * @returns The row as the operator left it.
 */
export function withVerdict(
  finding: Finding,
  verdict: string | null,
): Finding {
  return { ...finding, verdict };
}

/**
 * When this finding was queued for research, or null.
 *
 * The read-back half of {@link sendToResearch}, and the whole of what
 * a surface needs to know whether the action is still available.
 * Defensive about the value for the reason `./rows.ts` reads every
 * `fields` key defensively: the payload is a JSON document, so a key
 * holding something that is not a stamp is a state this type cannot
 * forbid, and it reads as no intention rather than as a crash.
 *
 * @param finding - Any finding.
 * @returns The recorded instant, or null where nothing queued it.
 */
export function researchRequestedAt(finding: Finding): IsoTimestamp | null {
  const recorded = finding.fields[RESEARCH_REQUEST_FIELD];

  return typeof recorded === 'string'
    ? recorded
    : null;
}

/**
 * Whether a payload key belongs to this shell rather than to the
 * domain.
 *
 * The other read-back of the reservation {@link RESEARCH_REQUEST_FIELD}
 * makes, and the general one: a `fieldContract` declares plain
 * identifiers (`summary`, `firstSeenAt`, `isOpenSource`), so a key
 * carrying the colon is one this shell wrote and no domain asked for.
 * `./detail.ts` is what needs the general form — a detail view listing
 * a payload is showing the DOMAIN what it recorded, and a stand-in
 * this shell keeps on the row would read there as a field the domain
 * has never heard of.
 *
 * Keyed on the convention rather than on the one member, so a second
 * reserved key is hidden by the reservation itself rather than by
 * remembering to extend a list. The colocated test pins the member
 * that exists against the rule, which is what keeps the two halves
 * from being separately true and jointly wrong.
 *
 * @param name - A key of a finding's `fields` payload.
 * @returns Whether this shell reserved it.
 */
export function isShellField(name: string): boolean {
  return name.includes(SHELL_FIELD_MARK);
}

/**
 * Ask for this finding to be researched.
 *
 * Refuses a finding already queued, which is the guard the header
 * argues is not a stand-in: nothing beneath this screen refuses a
 * second intention, so a surface that sent one twice would have it
 * researched twice.
 *
 * Nothing else is refused. An UNSCORED finding queues exactly like a
 * scored one — noticing that a subject is worth looking into is what
 * the gate is for, and a score is the reading of a pass that may not
 * have run — and the score, like every other member, is carried
 * through untouched.
 *
 * The stamp is an argument rather than a clock read, on the rule
 * `./timeWindow.ts` follows: a module that read the wall clock would
 * be a pure function of nothing, and the shell has a pinned instant
 * for exactly this.
 *
 * @param finding - The row as it stands.
 * @param requestedAt - The instant the intention is raised at.
 * @returns The row to record, or the reason there is nothing to
 * record.
 */
export function sendToResearch(
  finding: Finding,
  requestedAt: IsoTimestamp,
): ResearchSendOutcome {
  if (researchRequestedAt(finding) !== null) {
    return { sent: false, reason: ALREADY_QUEUED_REASON };
  }

  return {
    sent: true,
    finding: {
      ...finding,
      fields: { ...finding.fields, [RESEARCH_REQUEST_FIELD]: requestedAt },
    },
  };
}
