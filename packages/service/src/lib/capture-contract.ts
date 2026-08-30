/**
 * @packageDocumentation
 * capture-contract — the versioned envelope a push source posts, and
 * the boundary that decides whether this service will read it.
 *
 * `ar-capture` is the one workflow reached from outside: a client
 * that captured something somewhere else POSTs it here. Everything
 * that arrives is a stranger's, so the envelope around the payload
 * is the whole of what this service will make claims about. Five
 * members, listed in {@link CAPTURE_ENVELOPE_MEMBERS}, and
 * {@link captureEnvelopeErrors} is what says whether they are there
 * and shaped as the contract states.
 *
 * Nothing here stores, extracts, or decides what a capture MEANS.
 * The extraction is `parser-config.ts` under the source's own
 * `parser_config`, and it runs after this boundary has answered.
 *
 * ## The body is stored before any of this runs
 *
 * The workflow writes `documents.raw` FIRST, with a `parse_status`
 * of `failed`, and only then asks this module whether the envelope
 * was one the contract accepts. That ordering is the point rather
 * than an implementation detail, and it is what makes a refusal
 * survivable.
 *
 * A push source cannot be re-read. A pull source that answered
 * something unusable is fetched again on the next pass, so a
 * refusal there costs one cycle; a capture refused before it was
 * stored is gone, and the client that sent it has already moved on.
 * So the row is written while the payload is still nothing but
 * bytes, and every sentence this module returns lands in
 * `documents.parse_error` on a row that already exists. What a
 * refusal produces is a STORED FAILURE — a document an operator can
 * read, replay against a corrected config, and promote — rather
 * than a gap nobody can reconstruct.
 *
 * That is the keep half of fail-flag-keep arriving one step earlier
 * than it does on the pull path, and for a reason the pull path
 * does not have. `source-health.ts` handles the fail and the flag
 * from there, on the same terms either way.
 *
 * ## An unknown version is refused, never assumed
 *
 * {@link CAPTURE_CONTRACT_VERSION} is what this service accepts, and
 * an envelope stating anything else is refused on that alone — the
 * other four members are not looked at, and no fault about them is
 * reported.
 *
 * Refusing rather than defaulting is the whole of it. A version says
 * WHICH rules the rest of the envelope is judged by, so an envelope
 * from a client this service has never met is not an envelope with
 * an odd number in it: it is one whose members mean something this
 * module does not know. Judged under these rules anyway, a v2 client
 * moving `provenance` inside its body would be told its provenance
 * was missing — a sentence naming a member the client did not get
 * wrong, about a contract it was not writing to.
 *
 * Reporting the version fault ALONE is the other half. A list of
 * five faults derived from rules that do not apply is worse than one
 * sentence saying the rules do not apply, because an operator
 * reading the five would go and fix them.
 *
 * A client learns the version it should send from this constant and
 * from the capture-contract section of `04-sources.md` under
 * `docs/architecture/`, never from a refusal: the sentence names the
 * rule and not the value, and that holds for the version like
 * everything else.
 *
 * ## Every sentence is a constant, and there are fifteen of them
 *
 * The no-echo rule this repository applies to `documents.parse_error`
 * is total here, which is stronger than it is anywhere else. In
 * `parser-config.ts` a refusal names a SITE — a field name off the
 * config, quoted because a fault nobody can locate is not a report,
 * and bounded by a name class before it is quoted. This module needs
 * no such allowance: its five member names are a closed set written
 * into this file, so a sentence naming a member is a sentence
 * carrying a literal from here.
 *
 * So {@link captureEnvelopeErrors} answers a subset of
 * {@link CAPTURE_FAULTS}, always, and nothing it returns is built
 * from anything it was shown. There is no template with a hole in
 * it, and therefore nothing for a value to reach through.
 * `tests/lib/capture-contract.test.ts` declares the same roster from
 * the other side and holds it against what the cases produce, in
 * both directions — a sentence no entry registers, and an entry
 * nothing reaches, each fail naming themselves.
 *
 * ## Nothing here converts anything
 *
 * No `String()`, no template hole, no arithmetic on a member, no
 * comparison that boxes one. Every check is a `typeof`, an
 * `Array.isArray`, a `Number.isInteger`, an `Object.hasOwn`, a
 * `.length` on something already known to be a string or a list, or
 * a bounded pattern tested against one.
 *
 * The stamp is the one member read any further, and it stays inside
 * the rule: the parse and the re-render in {@link canonicalStamp}
 * run over a string the pattern already accepted and over the NUMBER
 * that parse produced, neither of which is a value the payload
 * chose the shape of.
 *
 * That is a consequence of the no-echo rule rather than a separate
 * one, and it has a second effect worth naming because a case pins
 * it: a value whose own `toString` raises passes through this
 * boundary without raising. A real webhook body arrives through
 * `JSON.parse` and cannot carry one, but the same envelope reaches a
 * Code node as an `$input` item that something upstream built, and
 * an accessor that throws is one of the shapes a payload takes when
 * somebody is looking for a way in. A boundary check that raised
 * would take the workflow down after the row was stored and before
 * anything judged it.
 *
 * The body is where that matters most, and this module never looks
 * inside one: {@link CAPTURE_FAULTS.bodyShape} is a question about
 * the body's own shape and about nothing it contains. Whatever is in
 * there is `parser-config.ts`'s to read, under a config that states
 * what to read — and `coerceValue` there already takes no reading
 * off a value whose conversion raises.
 *
 * ## The stamp is the client's moment, not the row's
 *
 * {@link CaptureEnvelope.capturedAt} is when the CLIENT captured the
 * material. `documents.captured_at` is when this pipeline inserted
 * the row, defaulted by the column because capture IS the insert
 * there. They are different facts and neither is derivable from the
 * other: a client that captured something on a train and posted it
 * an hour later is not lying about either.
 *
 * So the envelope's stamp never writes that column. It is stored
 * with the rest of the envelope in `documents.raw`, where a later
 * reader can compare the two.
 *
 * One spelling is accepted — {@link CAPTURED_AT_PATTERN}, a UTC
 * instant ending in `Z`. An offset form names the same instant and
 * is refused anyway, because a corpus whose stamps are written two
 * ways is one where a string sort and an instant sort disagree, and
 * every reader that has not noticed does the string one. The
 * contract picks the spelling rather than leaving each client to.
 *
 * ## Provenance is a note, not a second payload
 *
 * {@link CaptureEnvelope.provenance} records how the capture was
 * taken — which client, which version of it, where it was reading.
 * It is bounded in three ways ({@link MAX_PROVENANCE_MEMBERS},
 * {@link MAX_PROVENANCE_NAME_LENGTH},
 * {@link MAX_PROVENANCE_TEXT_LENGTH}) and admits scalars only.
 *
 * The bounds are what keep the two halves apart. Provenance is
 * operator-facing: it is read beside a document by somebody deciding
 * whether to trust it, and a nested structure of unbounded size read
 * that way is a payload wearing a note's name. The body already has
 * somewhere to be, is not bounded, and is not rendered to anybody
 * until an extraction has run over it.
 *
 * ## Dual context
 *
 * Like every module under `src/lib/`, this one is imported by the
 * default suite AND spliced into a workflow Code node body by
 * `scripts/build-workflows.ts`. So it imports nothing, keeps no
 * state between calls, reaches for no global beyond the language
 * itself, and takes everything it reads as an argument.
 * `tests/build/lib-splice.test.ts` registers it and reads what a
 * real build made of it; `tests/lib/capture-contract.test.ts` drives
 * it directly.
 */

// ---------------------------------------------------------------------------
// The version, and the members it declares
// ---------------------------------------------------------------------------

/**
 * The envelope version this service accepts, and the only one.
 *
 * An integer rather than a dotted string, because there is nothing
 * here for a minor number to say: an envelope either carries the
 * five members under the rules below or it does not, and a client
 * cannot half-satisfy that. Comparison is equality for the same
 * reason — a range would need an ordering, and an ordering implies a
 * compatibility claim across versions that nobody has made.
 *
 * Raising it is not a bump. A second version means two sets of rules
 * live at once while clients move over, which is a set of accepted
 * versions and a branch per member, not a larger number here — so
 * the shape this file would grow is written down rather than
 * pre-built, and today's contract stays one number and one
 * comparison.
 */
export const CAPTURE_CONTRACT_VERSION = 1;

/**
 * Every member the envelope declares, in the order a fault list
 * reports them.
 *
 * Exported so the members are a declaration rather than prose the
 * cases and the documentation each retype. What holds it to the
 * checks below is a case: dropping any one of these from a
 * well-formed envelope has to produce exactly one fault, so a member
 * added here and nowhere else fails naming itself.
 *
 * The names are the wire names. A client writes these keys, and they
 * are read by own key alone — an envelope inheriting one from a
 * prototype has not stated it.
 */
export const CAPTURE_ENVELOPE_MEMBERS = [
  'version',
  'sourceId',
  'capturedAt',
  'provenance',
  'body',
] as const;

/**
 * How many members a provenance note may carry.
 *
 * A note about how a capture was taken — the client, its version,
 * what it was reading, what it was reading it as. Beyond a couple of
 * dozen the thing being described is the capture's context rather
 * than its provenance, and it belongs in the body with everything
 * else the source said.
 */
export const MAX_PROVENANCE_MEMBERS = 32;

/**
 * How long a provenance member's NAME may be.
 *
 * The same ceiling `parser-config.ts` puts on a field name, and the
 * same reasoning: a name is an identifier somebody reads beside a
 * document, and an identifier that does not fit on a line is text
 * that has been put where a name goes.
 */
export const MAX_PROVENANCE_NAME_LENGTH = 64;

/**
 * How long a provenance member's TEXT value may be.
 *
 * Long enough for a URL, a user agent or a client build string, and
 * far short of a document. The bound is the difference between a
 * note and a payload: provenance is rendered beside a document to
 * somebody deciding whether to trust it, and text nobody bounded is
 * how a body arrives in that position under another name.
 */
export const MAX_PROVENANCE_TEXT_LENGTH = 512;

/**
 * What a provenance member's name may be spelled with.
 *
 * The class `parser-config.ts` uses for a field name, deliberately
 * the same rather than merely similar: both are keys an operator
 * reads and a later stage may address, and two classes that differ
 * by a character would be two rules nobody can hold in mind at once.
 *
 * Anchored at both ends and carrying no unbounded alternation, so it
 * is a scan of the string and not a search over it. Applied only
 * after {@link MAX_PROVENANCE_NAME_LENGTH} has already bounded what
 * it is applied to.
 */
export const PROVENANCE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/u;

/**
 * How long the captured-at stamp may be.
 *
 * Exactly what the longest spelling {@link CAPTURED_AT_PATTERN}
 * accepts takes: `YYYY-MM-DDTHH:MM:SS.mmmZ`, which is also what
 * `toISOString` emits. The pattern would refuse anything longer
 * anyway; the ceiling is what stops an arbitrarily long string
 * reaching a pattern at all, and {@link canonicalStamp} reads it a
 * second time to tell the two accepted spellings apart.
 */
export const MAX_CAPTURED_AT_LENGTH = 24;

/**
 * The one spelling of a moment this contract accepts.
 *
 * Exactly what `Date.prototype.toISOString` emits, and the same with
 * the milliseconds left off — three fraction digits or none, never
 * one or two. Deriving the shape from that method rather than
 * inventing one is what makes the round trip in
 * {@link isCapturedAt} a comparison rather than a normalisation.
 *
 * Every quantifier is bounded and the whole is anchored, so the
 * match is linear in a string already bounded by
 * {@link MAX_CAPTURED_AT_LENGTH}.
 *
 * The pattern says the SHAPE is right and NOT that the date exists.
 * `2026-02-30T00:00:00Z` matches it AND parses, because the language
 * validates the day against 1 to 31 and rolls the surplus into the
 * next month — measured on this runtime and on node alike, where
 * that stamp comes back as the second of March. Only a month past 12
 * or a day past 31 is refused outright. {@link isCapturedAt} runs
 * the other half of the reading, which is why the two are not one
 * regular expression: no pattern knows how many days February had.
 */
export const CAPTURED_AT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;

/**
 * A provenance value, as the contract admits one.
 *
 * Scalars only, `null` included: a member the client had no reading
 * for says so, rather than being left out and read later as a member
 * the client does not have. Nothing nested, for the reason the
 * header gives — the body is where structure goes.
 */
export type ProvenanceValue = string | number | boolean | null;

/** How a capture was taken, as the client describes it. */
export type CaptureProvenance = Readonly<Record<string, ProvenanceValue>>;

/**
 * The envelope a push source posts, once it has been accepted.
 *
 * A description of what {@link captureEnvelopeErrors} answering an
 * empty list means, rather than something a caller can trust because
 * it holds one: the payload arrives as `unknown` off a webhook and
 * this type is what it is known to be afterwards. Nothing here
 * narrows on its own.
 */
export interface CaptureEnvelope {
  /** Which contract the client wrote to. */
  readonly version: number;

  /**
   * The `sources` row this capture is posted against, as a positive
   * integer — the same id `documents.source_id` carries.
   *
   * The client is configured with it, because a push source is a row
   * an operator created and handed to somebody. Nothing here looks
   * the row up; whether a source by that id exists, is enabled, or
   * is the one this client should be posting to are three questions
   * for the workflow that has a database.
   */
  readonly sourceId: number;

  /**
   * When the CLIENT captured the material, as a UTC instant.
   *
   * Not `documents.captured_at`, which is when this pipeline
   * inserted the row and is the column's own default. See the
   * header: the two are different facts, and this one is stored with
   * the rest of the envelope rather than written over the other.
   */
  readonly capturedAt: string;

  /** How the capture was taken. Bounded, and scalars only. */
  readonly provenance: CaptureProvenance;

  /**
   * What was captured: text, a keyed object, or a list of them.
   *
   * Never read here, and never converted here. An empty string is
   * accepted — a capture that yielded no text is kept, which is what
   * `documents.body` being NOT NULL and possibly empty already says.
   */
  readonly body: unknown;
}

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

/**
 * Every sentence {@link captureEnvelopeErrors} can answer, whole.
 *
 * Fifteen constants and no template. Unlike the fault tables in
 * `parser-config.ts`, no entry here is a predicate something is put
 * in front of: the five member names are written into this file, so
 * a sentence naming one carries a literal from here rather than a
 * site read off the envelope. That is what makes the no-echo claim
 * total for this module — see the header.
 *
 * Each fault is reported AT MOST ONCE, so the answer is a subset of
 * this table in the order below and never a repeat. A note with
 * three unusable names produces one sentence, because the second and
 * third would be the identical constant and would say nothing the
 * first did not.
 *
 * What a reader loses by that is which member broke the rule, and
 * the trade is deliberate. An envelope is five members and a note
 * bounded at {@link MAX_PROVENANCE_MEMBERS}, and it is sitting in
 * `documents.raw` in front of whoever is reading the sentence — so a
 * rule plus a member family locates the fault. A parser config makes
 * the opposite trade for the opposite reason: its field map is far
 * larger and there is no stored copy of it beside the error.
 *
 * Not exported. The suite declares the roster itself, because a
 * suite reading these off the module would agree with any edit to
 * them.
 */
const CAPTURE_FAULTS = {
  /** The thing posted is not something with keys in it. */
  notObject: 'the capture envelope is not an object',

  /** No version at all, so nothing says which rules apply. */
  versionAbsent: 'the envelope states no contract version',

  /** A version that is not {@link CAPTURE_CONTRACT_VERSION}. */
  versionUnknown:
    'the envelope states a contract version this service does not accept',

  /** No source id, so nothing says which row this is posted against. */
  sourceAbsent: 'the envelope names no source',

  /** A source id no `sources` row could carry. */
  sourceNotId: 'the envelope names a source that is not a positive integer',

  /** No captured-at stamp. */
  capturedAtAbsent: 'the envelope carries no captured-at stamp',

  /** A stamp outside {@link CAPTURED_AT_PATTERN}, or naming no real day. */
  capturedAtShape:
    'the envelope carries a captured-at stamp that is not a UTC instant',

  /** No provenance member at all. */
  provenanceAbsent: 'the envelope records no provenance',

  /** A provenance that is not something with keys in it. */
  provenanceNotObject:
    'the envelope records provenance that is not an object',

  /** More members than {@link MAX_PROVENANCE_MEMBERS}. */
  provenanceCount:
    'the envelope records more provenance members than the contract carries',

  /**
   * A name outside {@link PROVENANCE_NAME_PATTERN}, or past
   * {@link MAX_PROVENANCE_NAME_LENGTH}.
   */
  provenanceName:
    'the envelope records a provenance member whose name the contract ' +
    'cannot use',

  /** A value that is not a scalar the contract admits. */
  provenanceValue:
    'the envelope records a provenance member that is not a scalar',

  /** Text past {@link MAX_PROVENANCE_TEXT_LENGTH}. */
  provenanceLength:
    'the envelope records a provenance member whose text is longer than ' +
    'the contract carries',

  /** No body, so there is nothing to have captured. */
  bodyAbsent: 'the envelope carries no body',

  /** A body that is neither text nor something an extraction could walk. */
  bodyShape:
    'the envelope carries a body that is neither text nor a keyed value',
} as const;

// ---------------------------------------------------------------------------
// Reading a member without trusting one
// ---------------------------------------------------------------------------

/**
 * Whether a value is a keyed object rather than a list or a null.
 *
 * The envelope, its provenance and a keyed body are all read by
 * member name, so a list arriving where one of them belonged should
 * read as the wrong shape rather than as an empty one.
 *
 * @param value - Anything at all.
 * @returns Whether it is a plain keyed object.
 */
function isKeyed(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * One own member of a value, or nothing.
 *
 * The single place this module reads a key it did not write.
 * `Object.hasOwn` rather than `in` and rather than a bare read: over
 * an object carrying no data at all, `in` answers true for
 * `constructor` and `toString`, so a bare read would take an
 * envelope with nothing in it for one stating every member — and a
 * `version` read off `Object.prototype` is a function, which is not
 * {@link CAPTURE_CONTRACT_VERSION} and would be refused, while a
 * `body` read the same way is a function that would pass a truthiness
 * test.
 *
 * @param source - Something to read a member off.
 * @param name - The member's wire name.
 * @returns The member, or `undefined` when it is not an own one.
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
 * The instant a stamp resolved to, written back in the spelling the
 * stamp itself used.
 *
 * `toISOString` always emits the millisecond form, so the
 * second-precision spelling is that form with its last five
 * characters dropped. Those are the only two lengths
 * {@link CAPTURED_AT_PATTERN} admits, which is what lets the length
 * choose the form.
 *
 * @param at - The instant, as `Date.parse` read it.
 * @param length - How long the stamp being checked was.
 * @returns That instant's own spelling, at that precision.
 */
function canonicalStamp(at: number, length: number): string {
  const rendered = new Date(at).toISOString();

  return length === MAX_CAPTURED_AT_LENGTH
    ? rendered
    : `${rendered.slice(0, -5)}Z`;
}

/**
 * Whether a value is the one spelling of a moment this contract takes.
 *
 * Four steps in one direction, each of which bounds the next: a
 * string, short enough to be one of these, shaped like one, and
 * naming the instant it says it does. `Date.parse` runs only over a
 * string the pattern already accepted, so nothing here hands an
 * arbitrary string to a parser whose behaviour outside the shapes it
 * documents is the implementation's business.
 *
 * The fourth step is a ROUND TRIP rather than a validity test,
 * because a validity test does not exist. Any day from 1 to 31
 * parses under any month, and the surplus is rolled forward rather
 * than refused — so `2026-02-30T00:00:00Z` comes back as the second
 * of March, silently. Stored that way it is a capture stamped two
 * days after the client says it took it, and nothing downstream
 * could tell. Comparing the instant's own spelling against what
 * arrived is what catches it.
 *
 * @param value - Whatever the envelope had there.
 * @returns Whether it is a UTC instant the contract accepts.
 */
function isCapturedAt(value: unknown): boolean {
  if (typeof value !== 'string'
    || value.length > MAX_CAPTURED_AT_LENGTH
    || !CAPTURED_AT_PATTERN.test(value)) {
    return false;
  }

  const at = Date.parse(value);

  return Number.isFinite(at) && canonicalStamp(at, value.length) === value;
}

/**
 * Whether a value could be a `sources` row's id.
 *
 * A positive integer, tested as one rather than coerced into one: a
 * `sources.id` is a bigserial and starts at 1, so zero and every
 * negative are as impossible as a string is. The `typeof` leads
 * because it is what narrows the value — `Number.isInteger` answers
 * a boolean and narrows nothing, so the comparison after it needs a
 * number the compiler already has rather than one this module would
 * have had to convert.
 *
 * @param value - Whatever the envelope had there.
 * @returns Whether it is an id a row could carry.
 */
function isSourceId(value: unknown): boolean {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value > 0;
}

/**
 * Whether a name is one a provenance member may be recorded under.
 *
 * The ceiling first and the class second, which is the order that
 * bounds the pattern's input rather than the order the rule reads
 * in.
 *
 * @param name - A key off the provenance note.
 * @returns Whether the contract can use it.
 */
function isProvenanceName(name: string): boolean {
  return name.length > 0
    && name.length <= MAX_PROVENANCE_NAME_LENGTH
    && PROVENANCE_NAME_PATTERN.test(name);
}

/**
 * Whether a value is a scalar the contract admits.
 *
 * `null` is one, deliberately: a client with no reading for a member
 * says so rather than leaving the member out, which is the same
 * null-vs-zero distinction this pipeline holds everywhere else. A
 * number has to be finite, because a `NaN` cannot come out of
 * `JSON.parse` and can come out of whatever built the item a Code
 * node was handed.
 *
 * @param value - Whatever the note had there.
 * @returns Whether it may be recorded.
 */
function isProvenanceValue(value: unknown): boolean {
  if (value === null || typeof value === 'string'
    || typeof value === 'boolean') {
    return true;
  }

  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Whether a body is something an extraction could be run over.
 *
 * Text, a keyed object, or a list of either — and nothing is read
 * inside it. A number or a boolean is refused because neither is a
 * document: a capture whose whole content is `7` is a client sending
 * a field where a body goes.
 *
 * An empty string passes, and that is the keep rule rather than an
 * oversight. A capture that yielded no text is stored with an empty
 * `documents.body`, which is what the column being NOT NULL and
 * legitimately empty already records.
 *
 * @param value - Whatever the envelope had there.
 * @returns Whether the contract accepts it as a body.
 */
function isBody(value: unknown): boolean {
  return typeof value === 'string'
    || (typeof value === 'object' && value !== null);
}

// ---------------------------------------------------------------------------
// The boundary
// ---------------------------------------------------------------------------

/**
 * Everything wrong with a provenance note, at most once each.
 *
 * Split out because the note is the one member with rules of its own
 * rather than a single shape test, and because reading it is a walk:
 * the three per-member faults are decided over every entry and
 * reported once, so a note with several bad members reads as a note
 * with those rules broken rather than as a list of identical
 * sentences.
 *
 * The names come off `Object.keys`, so every one of them is an own
 * enumerable key and the walk needs no second own-key test of its
 * own. A note holding no own member at all is an EMPTY note rather
 * than a fault: the member was stated, which is the whole of what
 * {@link CAPTURE_FAULTS.provenanceAbsent} asks, and a client with
 * nothing to record about a capture is not a client that got the
 * envelope wrong.
 *
 * @param value - Whatever the envelope had there.
 * @returns One sentence per rule broken, in roster order.
 */
function provenanceFaults(value: unknown): readonly string[] {
  if (!isKeyed(value)) {
    return [CAPTURE_FAULTS.provenanceNotObject];
  }

  const names = Object.keys(value);
  const faults: string[] = [];

  if (names.length > MAX_PROVENANCE_MEMBERS) {
    faults.push(CAPTURE_FAULTS.provenanceCount);
  }

  if (names.some((name) => !isProvenanceName(name))) {
    faults.push(CAPTURE_FAULTS.provenanceName);
  }

  const values = names.map((name) => value[name]);

  if (values.some((member) => !isProvenanceValue(member))) {
    faults.push(CAPTURE_FAULTS.provenanceValue);
  }

  if (values.some((member) => typeof member === 'string'
    && member.length > MAX_PROVENANCE_TEXT_LENGTH)) {
    faults.push(CAPTURE_FAULTS.provenanceLength);
  }

  return faults;
}

/**
 * Everything wrong with a posted capture envelope, one sentence at a
 * time.
 *
 * Answers a LIST rather than throwing at the first fault, so a
 * client author fixing an integration sees the whole of what is
 * wrong with it. An empty list is the only thing that means
 * accepted, and it is a claim about the ENVELOPE alone: nothing here
 * looked inside the body, looked up the source, or asked whether the
 * capture was one anybody wanted.
 *
 * Two refusals answer alone, and both are the same argument. A
 * payload that is not an object has no members to judge. And a
 * version this service does not accept — including none at all —
 * means the rules the other four members would be judged by are not
 * the rules the client wrote to, so reporting faults derived from
 * them would name members the client did not get wrong. That is what
 * refusing an unknown version rather than assuming one comes to in
 * code, and the header argues it at length.
 *
 * Past the version every member is judged and every fault is
 * collected, in {@link CAPTURE_ENVELOPE_MEMBERS} order. Members are
 * read by own key, so an envelope inheriting one has not stated it.
 *
 * Nothing a member HOLDS is converted. No value read here is turned
 * into text, done arithmetic on, or put in a sentence, so a body
 * carrying something whose own `toString` raises passes this
 * boundary rather than taking the workflow down after the row was
 * already stored. The header argues why the body is where that
 * matters most, and `tests/lib/capture-contract.test.ts` carries the
 * case that pins it.
 *
 * @param payload - Whatever was posted.
 * @returns One sentence per fault, empty when the envelope is
 * accepted.
 */
export function captureEnvelopeErrors(payload: unknown): readonly string[] {
  if (!isKeyed(payload)) {
    return [CAPTURE_FAULTS.notObject];
  }

  const version = ownMember(payload, 'version');

  if (version === undefined) {
    return [CAPTURE_FAULTS.versionAbsent];
  }

  if (version !== CAPTURE_CONTRACT_VERSION) {
    return [CAPTURE_FAULTS.versionUnknown];
  }

  const faults: string[] = [];
  const sourceId = ownMember(payload, 'sourceId');

  if (sourceId === undefined) {
    faults.push(CAPTURE_FAULTS.sourceAbsent);
  } else if (!isSourceId(sourceId)) {
    faults.push(CAPTURE_FAULTS.sourceNotId);
  }

  const capturedAt = ownMember(payload, 'capturedAt');

  if (capturedAt === undefined) {
    faults.push(CAPTURE_FAULTS.capturedAtAbsent);
  } else if (!isCapturedAt(capturedAt)) {
    faults.push(CAPTURE_FAULTS.capturedAtShape);
  }

  const provenance = ownMember(payload, 'provenance');

  if (provenance === undefined) {
    faults.push(CAPTURE_FAULTS.provenanceAbsent);
  } else {
    faults.push(...provenanceFaults(provenance));
  }

  const body = ownMember(payload, 'body');

  if (body === undefined) {
    faults.push(CAPTURE_FAULTS.bodyAbsent);
  } else if (!isBody(body)) {
    faults.push(CAPTURE_FAULTS.bodyShape);
  }

  return faults;
}
