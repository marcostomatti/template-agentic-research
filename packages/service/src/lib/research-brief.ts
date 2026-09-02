/**
 * @packageDocumentation
 * research-brief — the shape a research answer has to have before
 * anything about it is recorded: what a model came back with,
 * judged member by member, and composed into the two columns
 * `entity_research` keeps a result in.
 *
 * A research pass is the one step in this pipeline that reaches
 * outside the corpus, spends a model call to get there, and comes
 * back with prose nothing stored can reproduce. So what it answers
 * with is a stranger's shape arriving at a place that writes rows,
 * and this module is the boundary in between:
 * {@link researchBriefErrors} says whether the answer is one this
 * service will record, and {@link composeResearchRecord} turns an
 * accepted answer into the `entity_research.summary` and
 * `entity_research.payload` pair.
 *
 * ## Nothing here approves anything
 *
 * The approval is `research_pool.approved_at`, written by a person
 * through `scripts/approve.ts` and, later, through the API and the
 * UI. It is held by `research_pool_approval_check` in
 * `src/db/schema/entities.ts`, which refuses a row recording that
 * it was closed without recording that it was approved first —
 * a rule the database evaluates on every write, whoever makes it.
 *
 * This module is downstream of all of that and knows none of it.
 * It never reads an approval, never sets one, and has no member
 * that could carry one. An answer it accepts is an answer SHAPED
 * the way a record wants; whether anybody consented to the search
 * that produced it was settled before the search ran, and the
 * database is what settles it again at the write.
 *
 * ## A refusal leaves the pool row unstamped, and raises nothing
 *
 * {@link researchBriefErrors} answers a LIST of sentences and never
 * throws, which is what makes a refusal survivable in the one place
 * this runs.
 *
 * The drain reads the approved rows whose `researched_at` is still
 * NULL, and the record statement stamps that column in the same
 * statement that inserts the `entity_research` row. So an answer
 * this module refuses takes neither half: no result is written, the
 * stamp is not set, and the row goes back to being an approved
 * intention nobody has acted on. The next pass finds it again.
 *
 * That is the whole error handling, and it is deliberately not an
 * exception. A throw inside a Code node takes the workflow down
 * after the model call has already been billed and the `llm_calls`
 * ledger row already written, which turns one unusable answer into
 * a failed run — and a failed run is what a reader of `runs.errors`
 * has to go and diagnose. An unstamped pool row is a queue entry
 * that comes round again, which is what the gate is for.
 *
 * What a refusal costs is the call. That is real and it is the
 * reason every sentence below names a rule an operator can act on
 * rather than reporting that something went wrong.
 *
 * ## This module judges and never edits
 *
 * One principle, and every decision below follows from it. A
 * sentence here says an answer broke a rule; nothing here rewrites
 * an answer so that it stops breaking one.
 *
 * So a summary that spells the data fence is REFUSED rather than
 * cut, exactly as `prompt-frame.ts` refuses a persona that spells
 * it rather than editing an operator's prose. The reasoning is the
 * same in both places: text quietly edited on its way into a row
 * leaves a stored value and the thing it came from disagreeing,
 * with nothing anywhere recording the difference. And an accepted
 * summary is carried into the record VERBATIM — not trimmed, not
 * reflowed, not shortened — so what `entity_research.summary`
 * holds is what the model said.
 *
 * Reduction is a real and separate step, and it is
 * `sanitize-md.ts`. The record node splices both markers and wires
 * them in its own body: this module decides whether there is a
 * record to make, that one reduces the untrusted text inside it.
 * Two rules, two libraries, one node — which is the only place a
 * spliced library can meet a sibling at all.
 *
 * The one construction is the citation list, and
 * {@link composeResearchRecord} argues why that exception exists.
 *
 * ## What the fence rule is about, and how far it reaches
 *
 * {@link FRAME_FENCE_STEM} is the word `prompt-frame.ts` builds its
 * two delimiter lines out of, and a summary spelling it is refused
 * on that alone.
 *
 * The reason is a loop rather than a rendering worry. A stored
 * summary is read again: `entity_research` is what the next run
 * consults about a subject, what a digest carries, and what an
 * export renders. A summary carrying the stem into that column is
 * a forged delimiter waiting in storage, and the framing that
 * later puts it in front of a model would be composing a fence
 * around text that spells one. `neutralizeUntrusted` in
 * `prompt-frame.ts` cuts stems out of the untrusted half and would
 * catch it — but only for a reader that framed it, and a stored
 * value whose safety depends on every future reader remembering
 * something is a rule nothing holds. Keeping the stem out of the
 * column is the version of the rule that does not need remembering.
 *
 * The rule reaches the SUMMARY and stops there. The structured
 * half is carried unread, for the reason `digest-assemble.ts`
 * carries a findings payload unread: what belongs in it varies by
 * domain, no contract declares its keys, and a walk over an
 * arbitrarily nested value is a different module. So a stem
 * spelled inside `fields` reaches storage, and this file says so
 * rather than leaving a reader to assume the whole answer was
 * swept.
 *
 * ## The second copy of the stem is deliberate
 *
 * A spliced library imports nothing, so the stem cannot be read
 * from `prompt-frame.ts` where it is declared. It is written again
 * here, as a copy, and the copy is the point of failure worth
 * knowing about: two constants that must agree with a build that
 * cannot check them. `tests/lib/research-brief.test.ts` imports
 * both and holds them equal, which is the only thing that does.
 *
 * ## Dual context
 *
 * Like every module under `src/lib/`, this one is imported by the
 * default suite AND spliced into a workflow Code node body by
 * `scripts/build-workflows.ts`. So it imports nothing, keeps no
 * state between calls, reaches for no global beyond the language
 * itself, and takes everything it reads as an argument.
 * `tests/build/lib-splice.test.ts` registers it and reads what a
 * real build made of it; `tests/lib/research-brief.test.ts` drives
 * it directly.
 */

// ---------------------------------------------------------------------------
// The word the framing is built out of
// ---------------------------------------------------------------------------

/**
 * The stem both fence lines carry, as `prompt-frame.ts` declares
 * it — a second copy, because a spliced library cannot import a
 * sibling.
 *
 * Exported so the copy is checkable rather than merely written
 * down. Nothing in the build compares the two, and a rename on one
 * side would leave this rule testing for a delimiter the framing
 * no longer uses, which reads as a clean pass forever.
 *
 * Letters and hyphens only, which is why {@link FENCE_STEM_RE} can
 * be built straight from it: there is no metacharacter here to
 * escape, and that property belongs to the original rather than to
 * this copy of it.
 */
export const FRAME_FENCE_STEM = 'AR-UNTRUSTED-DATA';

/**
 * The stem in any casing, matched once.
 *
 * Case-insensitive for the reason the original gives: the fence is
 * read by a model rather than parsed, so a lower-cased spelling is
 * not the delimiter and would be read as one anyway.
 *
 * NOT global, and that is load-bearing rather than incidental. A
 * `g` pattern at module scope carries `lastIndex` from one
 * `.test()` into the next, which is state outliving a call — the
 * dual-context rule a transpiler scan cannot see. Without the
 * flag, `.test()` starts at zero every time.
 */
const FENCE_STEM_RE = new RegExp(FRAME_FENCE_STEM, 'iu');

// ---------------------------------------------------------------------------
// The members an answer declares
// ---------------------------------------------------------------------------

/**
 * Every member the answer declares, in the order a fault list
 * reports them.
 *
 * Exported so the members are a declaration rather than prose the
 * cases and the documentation each retype, following
 * `CAPTURE_ENVELOPE_MEMBERS` in `capture-contract.ts`. What holds
 * it to the checks below is a case: dropping any one of these from
 * a well-formed answer has to produce exactly one fault, so a
 * member added here and nowhere else fails naming itself.
 *
 * Read by own key alone — an answer inheriting one from a
 * prototype has not stated it.
 */
export const RESEARCH_ANSWER_MEMBERS = [
  'summary',
  'citations',
  'fields',
] as const;

/**
 * What the composed payload calls the citation list it carries.
 *
 * `entity_research` has no citations column and is not getting one:
 * what a domain records beyond prose lives in `payload`, and the
 * documents an answer leaned on are the clearest case of that.
 * Named here rather than spelled at the use site so the key a
 * reader looks for and the key a writer writes are one string.
 */
export const CITATIONS_KEY = 'citations';

/** What the composed payload calls the domain-shaped half. */
export const FIELDS_KEY = 'fields';

// ---------------------------------------------------------------------------
// What a refusal says
// ---------------------------------------------------------------------------

/**
 * Every sentence {@link researchBriefErrors} can answer, whole.
 *
 * Ten constants and no template. The three member names are a
 * closed set written into this file, so a sentence naming one
 * carries a literal from here rather than a site read off the
 * answer — which is what makes the no-echo rule total for this
 * module, the way `capture-contract.ts` records it for its own.
 *
 * Nothing a refusal reports came out of the model. That matters
 * more here than at any other boundary in this pipeline, because
 * the value being judged is text a document the pass was reading
 * may have authored: a sentence quoting the summary it refused
 * would carry a stranger's prose into `runs.errors`, into a digest
 * banner and in front of an operator, having refused it precisely
 * for being unusable. There is no template with a hole in it, so
 * there is nothing for a value to reach through.
 *
 * Each fault is reported AT MOST ONCE and the answer is a subset of
 * this table in the order below. An answer citing four documents it
 * was never given produces one sentence, because the second and
 * third would be the identical constant and would say nothing the
 * first did not.
 *
 * What a reader loses by that is WHICH citation was unoffered, and
 * the trade is the one `capture-contract.ts` makes for the same
 * reason: the answer is sitting in front of whoever reads the
 * sentence, the offered set is the pass's own, and a rule plus a
 * member locates the fault. `parser-config.ts` makes the opposite
 * trade because its field map is far larger and nothing stores a
 * copy of it beside the error.
 *
 * Not exported. The suite declares the roster itself, because a
 * suite reading these off the module would agree with any edit to
 * them.
 */
const RESEARCH_FAULTS = {
  /** The thing answered is not something with keys in it. */
  notObject: 'the research answer is not an object',

  /** No summary member at all. */
  summaryAbsent: 'the research answer records no summary',

  /** A summary that is not a string. */
  summaryNotText:
    'the research answer records a summary that is not text',

  /** A summary that is empty, or is nothing but whitespace. */
  summaryEmpty:
    'the research answer records a summary holding no text',

  /** A summary spelling {@link FRAME_FENCE_STEM}. */
  summaryFence:
    'the research answer records a summary that spells the data fence',

  /** No citations member, so nothing states what was drawn on. */
  citationsAbsent: 'the research answer records no citations',

  /** A citations member that is not a list. */
  citationsNotList:
    'the research answer records citations that are not a list',

  /** A citation no `documents.id` could be. */
  citationNotId:
    'the research answer cites something that is not a document id',

  /** A citation outside the set the pass handed over. */
  citationUnoffered:
    'the research answer cites a document this pass was not given',

  /** A fields member that is not something with keys in it. */
  fieldsShape:
    'the research answer records fields that are not a keyed value',
} as const;

// ---------------------------------------------------------------------------
// What a caller declares
// ---------------------------------------------------------------------------

/**
 * A document id, in either spelling it reaches a Code node as.
 *
 * `documents.id` is a `bigserial`, which a Postgres node may hand
 * over as a string rather than lose digits past what a double
 * holds. Both spellings are read and both are accepted; one of
 * them is stored, and {@link canonicalId} is where the two meet.
 */
export type DocumentId = number | string;

/**
 * What a research pass came back with.
 *
 * A description of what {@link researchBriefErrors} answering an
 * empty list means, rather than something a caller can trust
 * because it holds one: the answer arrives as `unknown` off a
 * model node and this type is what it is known to be afterwards.
 * Nothing here narrows on its own.
 */
export interface ResearchAnswer {
  /**
   * What the research found, in prose, for a person to read —
   * `entity_research.summary` on the row this becomes.
   *
   * Required here where the column is nullable, and the two do not
   * disagree. The column admits NULL for a row nobody asked a model
   * for: research written by hand, carried in from whatever a
   * domain kept before it had a pipeline, or backfilled. This
   * contract governs the other case — a pass that spent a call and
   * came back — and an answer from one of those with no prose in it
   * is an answer with nothing in it.
   *
   * Unbounded, following the column, and for the reason the column
   * gives: a length cap belongs where the ask was made, because
   * that is the only place that knows what was asked for. This
   * module did not make the ask.
   */
  readonly summary: string;

  /**
   * The documents this answer drew on, as their ids.
   *
   * Required, and an EMPTY list is a legitimate answer meaning it
   * drew on none of them. That split is the security-relevant half:
   * an answer stating an empty list has made a checkable claim,
   * where an answer omitting the member has made none at all — and
   * a member that may be left out is a member the offered-set rule
   * can be skipped by omitting. `capture-contract.ts` splits
   * `provenance` the same way for the same reason.
   */
  readonly citations: readonly DocumentId[];

  /**
   * The structured half — whatever this domain's research is meant
   * to come back with beyond prose.
   *
   * Optional, and an absent member and an empty one come to the
   * same thing. That follows `entities.attributes` in
   * `src/db/schema/entities.ts`, whose two absences read
   * identically to everything that opens the column, so the
   * distinction would buy nothing and cost every reader a guard.
   * {@link composeResearchRecord} writes `{}` for both.
   *
   * Its CONTENTS are not read here, are not judged here, and are
   * carried into the payload as they arrived. No contract declares
   * their keys — `entity_research.payload` says so from the
   * schema's side — so there is nothing here to hold them to.
   */
  readonly fields?: Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// What a record is
// ---------------------------------------------------------------------------

/**
 * The structured half of a result, as `entity_research.payload`
 * stores it.
 *
 * Two members, always both present. A payload whose shape varies
 * row to row is one every reader guards, and this is the column
 * `05-exports.md` renderers and the next run's decision all read.
 */
export interface ResearchPayload {
  /**
   * The documents the answer drew on, canonical and deduplicated,
   * in the order the answer first named them.
   */
  readonly citations: readonly string[];

  /** The domain-shaped half, exactly as the answer carried it. */
  readonly fields: Readonly<Record<string, unknown>>;
}

/**
 * One result, as the two columns `entity_research` keeps it in.
 *
 * A pair rather than a row: no id, no entity, no run and no stamp.
 * Which subject this is about and which run produced it are the
 * drain's to say — it claimed the pool row that names them — and
 * `researched_at` is defaulted by the column. What this module
 * knows is what the model answered, so what it composes is that
 * and nothing else.
 */
export interface ResearchRecord {
  /** `entity_research.summary`, verbatim as the answer carried it. */
  readonly summary: string;

  /** `entity_research.payload`. */
  readonly payload: ResearchPayload;
}

// ---------------------------------------------------------------------------
// Reading a member without trusting one
// ---------------------------------------------------------------------------

/**
 * Whether a value is a keyed object rather than a list or a null.
 *
 * The answer and its fields are both read by member name, so a
 * list arriving where one of them belonged should read as the
 * wrong shape rather than as an empty one.
 *
 * @param value - Anything at all.
 * @returns Whether it is a plain keyed object.
 */
function isKeyed(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value);
}

/**
 * One own member of a value, or nothing.
 *
 * By own key, so a prototype's member is not a member the answer
 * stated. The reading `capture-contract.ts` makes of the same
 * question, written again because a spliced library cannot import
 * a sibling.
 *
 * @param source - The keyed value to read.
 * @param name - The member to read off it.
 * @returns Its value, or `undefined` where the key is not its own.
 */
function ownMember(
  source: Record<string, unknown>,
  name: string,
): unknown {
  return Object.hasOwn(source, name)
    ? source[name]
    : undefined;
}

/**
 * A document id in its one stored spelling, or nothing at all.
 *
 * ONE spelling is stored, and that is the whole of this function.
 * A citation that arrived as the number `12` and an offered id that
 * arrived as the string `12` name one document, and a column
 * holding both spellings is one where a later reader's `===`
 * disagrees with the database's `=`. `capture-contract.ts` picks a
 * single spelling for a stamp on the same argument.
 *
 * A NUMBER is read only when it is a positive SAFE integer. Past
 * that the value has already lost digits — which is the reason a
 * `bigserial` reaches a Code node as a string in the first place —
 * so a number that large names no document this could resolve, and
 * refusing it is more honest than storing a rounded id.
 *
 * A STRING is read only in the canonical decimal spelling: digits
 * alone, no leading zero, no sign, no space. `012` is refused
 * rather than read as twelve, because Postgres never emits it and
 * accepting it would put two spellings of one id back in the
 * column by another route.
 *
 * @param value - Whatever stood where an id belonged.
 * @returns Its canonical decimal spelling, or `null`.
 */
function canonicalId(value: unknown): string | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0
      ? String(value)
      : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  return CANONICAL_ID_RE.test(value)
    ? value
    : null;
}

/**
 * A positive integer written in decimal, with no leading zero.
 *
 * Anchored at both ends, one bounded alternation, no backtracking
 * to be had: a scan of the string rather than a search over it.
 * Not global, so `.test()` starts at zero every call — the
 * `lastIndex` trap {@link FENCE_STEM_RE} records.
 */
const CANONICAL_ID_RE = /^[1-9][0-9]*$/u;

/**
 * The set of document ids a pass actually handed the model.
 *
 * FAILS CLOSED in both directions a caller can get it wrong. An
 * `offered` argument that is not a list offers nothing, and a
 * member of it this module cannot read as an id is skipped rather
 * than reported — because neither is the model's mistake, and
 * neither belongs in a sentence about the model's answer.
 *
 * What that costs is stated rather than hidden: a caller that
 * handed over a broken list gets every citation refused as
 * unoffered, which is the direction a wrong answer should fail in.
 * The alternative — treating an unreadable offer list as offering
 * everything — would turn a caller's bug into the one check this
 * module exists for being silently skipped.
 *
 * @param offered - Whatever the caller says the pass handed over.
 * @returns The canonical ids among them.
 */
function offeredIds(offered: unknown): ReadonlySet<string> {
  const ids = new Set<string>();

  if (!Array.isArray(offered)) {
    return ids;
  }

  for (const member of offered) {
    const id = canonicalId(member);

    if (id !== null) {
      ids.add(id);
    }
  }

  return ids;
}

// ---------------------------------------------------------------------------
// The boundary
// ---------------------------------------------------------------------------

/**
 * Everything wrong with the summary half, at most one sentence.
 *
 * Split out because it is the one member with a rule about its
 * CONTENT rather than only its shape, and because the four
 * readings are ordered: a value that is not text cannot be empty,
 * and an empty one cannot spell a fence. Each answers alone, so a
 * summary reports the first rule it broke and not a cascade
 * derived from it.
 *
 * @param value - Whatever the answer had there.
 * @returns One sentence, or an empty list.
 */
function summaryFaults(value: unknown): readonly string[] {
  if (value === undefined) {
    return [RESEARCH_FAULTS.summaryAbsent];
  }

  if (typeof value !== 'string') {
    return [RESEARCH_FAULTS.summaryNotText];
  }

  if (value.trim().length === 0) {
    return [RESEARCH_FAULTS.summaryEmpty];
  }

  return FENCE_STEM_RE.test(value)
    ? [RESEARCH_FAULTS.summaryFence]
    : [];
}

/**
 * Everything wrong with the citations half, at most once each.
 *
 * The walk is what makes this its own function: the two per-member
 * rules are decided over every entry and reported once, so an
 * answer citing three documents it was never given reads as an
 * answer that cited unoffered documents rather than as three
 * copies of one sentence.
 *
 * An empty list produces nothing. It is a claim — this answer drew
 * on none of the offered documents — and it is a claim that holds.
 *
 * @param value - Whatever the answer had there.
 * @param offered - The ids the pass handed over.
 * @returns One sentence per rule broken, in roster order.
 */
function citationFaults(
  value: unknown,
  offered: ReadonlySet<string>,
): readonly string[] {
  if (!Array.isArray(value)) {
    return [RESEARCH_FAULTS.citationsNotList];
  }

  const ids = value.map(canonicalId);
  const faults: string[] = [];

  if (ids.some((id) => id === null)) {
    faults.push(RESEARCH_FAULTS.citationNotId);
  }

  if (ids.some((id) => id !== null && !offered.has(id))) {
    faults.push(RESEARCH_FAULTS.citationUnoffered);
  }

  return faults;
}

/**
 * Everything wrong with a research answer, one sentence at a time.
 *
 * Answers a LIST rather than throwing at the first fault, so an
 * operator reading a refusal sees the whole of what was wrong with
 * the answer instead of one rule at a time across as many passes.
 * An empty list is the only thing that means accepted.
 *
 * One refusal answers alone: an answer that is not an object has no
 * members to judge, and every other sentence in the roster is about
 * a member. Past that, all three members are read and every fault
 * is collected in {@link RESEARCH_ANSWER_MEMBERS} order. Members
 * are read by own key, so an answer inheriting one has not stated
 * it.
 *
 * What an empty list claims is bounded and worth stating. It says
 * the answer is SHAPED the way a record wants and that every
 * document it cites is one this pass was given. It does not say
 * the summary is true, that the research was any good, that the
 * subject was worth researching, or that anybody approved it —
 * that last one is `research_pool_approval_check`, and the header
 * argues why nothing here stands in for it.
 *
 * Nothing a member HOLDS is converted. No value read here is
 * turned into text, done arithmetic on, or put in a sentence, so
 * an answer carrying something whose own `toString` raises passes
 * this boundary rather than taking the workflow down after the
 * model call has already been billed.
 *
 * @param answer - Whatever the model came back with.
 * @param offered - The document ids this pass handed it, in either
 * spelling. Anything that is not a list offers nothing.
 * @returns One sentence per fault, empty when the answer is
 * accepted.
 */
export function researchBriefErrors(
  answer: unknown,
  offered: unknown,
): readonly string[] {
  if (!isKeyed(answer)) {
    return [RESEARCH_FAULTS.notObject];
  }

  const faults: string[] = [
    ...summaryFaults(ownMember(answer, 'summary')),
  ];

  const citations = ownMember(answer, 'citations');

  if (citations === undefined) {
    faults.push(RESEARCH_FAULTS.citationsAbsent);
  } else {
    faults.push(...citationFaults(citations, offeredIds(offered)));
  }

  const fields = ownMember(answer, 'fields');

  if (fields !== undefined && !isKeyed(fields)) {
    faults.push(RESEARCH_FAULTS.fieldsShape);
  }

  return faults;
}

// ---------------------------------------------------------------------------
// What gets written
// ---------------------------------------------------------------------------

/**
 * An accepted answer as the two columns `entity_research` keeps a
 * result in.
 *
 * The summary is carried VERBATIM, which is the module's one
 * principle applied at the end of it: what the column holds is what
 * the model said, untrimmed and unreflowed. Reducing its untrusted
 * text is `sanitize-md.ts`, spliced beside this one in the record
 * node. The fields are carried by reference for the same reason
 * and a second one — no contract declares their keys, so there is
 * nothing to rebuild them against, and a rebuild by plain
 * assignment silently loses a `__proto__` member that
 * `JSON.parse` can genuinely produce.
 *
 * THE CITATIONS ARE THE ONE THING CONSTRUCTED, and the exception
 * has a reason the summary does not. They are ids rather than
 * prose: two spellings of one id stored in one column is a fault
 * every later reader inherits, so {@link canonicalId} settles the
 * spelling here, once. They are deduplicated, because the list
 * names the DOCUMENTS an answer drew on and a document named twice
 * is not two documents. Order is first appearance, which is the
 * answer's own — nothing here ranks a citation.
 *
 * TOTAL, and never throws. A caller that composes without
 * validating first gets a well-formed record with whatever it
 * handed over: an unreadable citation is dropped rather than
 * stored, an absent or unkeyed `fields` becomes `{}`. That is not
 * a second boundary and must not be read as one —
 * {@link researchBriefErrors} is where an answer is judged, and
 * this function has no offered set to judge one against. What it
 * guarantees is that the value reaching a jsonb column is one,
 * because a Code node body that raised here would take a run down
 * between a model call and its record.
 *
 * @param answer - An answer {@link researchBriefErrors} accepted.
 * @returns The `summary` and `payload` pair to write.
 */
export function composeResearchRecord(
  answer: ResearchAnswer,
): ResearchRecord {
  const cited = Array.isArray(answer.citations)
    ? answer.citations
    : [];

  const citations: string[] = [];

  for (const member of cited) {
    const id = canonicalId(member);

    if (id !== null && !citations.includes(id)) {
      citations.push(id);
    }
  }

  return {
    summary: answer.summary,
    payload: {
      [CITATIONS_KEY]: citations,
      [FIELDS_KEY]: isKeyed(answer.fields)
        ? answer.fields
        : {},
    },
  };
}
