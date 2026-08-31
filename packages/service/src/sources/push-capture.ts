/**
 * @packageDocumentation
 * push-capture — a source that posts to us, as a source adapter: a
 * client captured something somewhere else, wrapped it in the
 * versioned envelope `../lib/capture-contract.ts` describes, and
 * sent it here. One envelope is one construction of this adapter.
 *
 * The `push` half of the source registry, and the only kind of
 * source this service does not go and read. Everything else under
 * this directory opens something; nothing here opens anything at
 * all.
 *
 * ## Why a push adapter satisfies a contract whose first member is
 * named `fetch`
 *
 * The name reads backwards for a source that was never fetched, and
 * the answer is that the contract's shape is not about retrieval.
 * `SourceAdapter` splits capture into one member that may do I/O and
 * two that may not, and what that split buys is a seam: `parse` and
 * `toCanonical` are functions of what they were handed, so every
 * adapter can be driven over a payload stored on disk with nothing
 * standing up. That is what keeps the default suite offline, and it
 * is the whole reason the split is where it is.
 *
 * A push source is the case where the stored payload IS the source.
 * There is no round trip to stand in for, so `fetch` has nothing to
 * do except answer the envelope it was constructed with — which is
 * exactly what a stored payload is, arriving one step earlier than
 * usual. The member every other adapter implements by opening a
 * socket, this one implements by returning a value, and the two
 * halves downstream cannot tell the difference. Renaming the member
 * for this one case would cost the property the name is beside: one
 * contract, one seam, and one way to test every adapter.
 *
 * So the ordering `fetch` implies is real here too. What arrives
 * from outside is untrusted until something has judged it, and the
 * member that hands it over is where the judging starts.
 *
 * ## No member of this module does I/O
 *
 * Not the parse half, which is the contract's rule, and not `fetch`
 * either, which is this module's own. There is no transport
 * parameter, no endpoint, and nothing to inject: `../paged-list.ts`
 * and the transport seam `./listing-api.ts` documents exist to make
 * a network call visible in a construction call, and an adapter that
 * makes none needs neither.
 *
 * The `sources.endpoint` column is the omission worth naming. A push
 * row may well carry one — where the client was told to post — but
 * this module never reads it, so it is not a member of
 * {@link PushCaptureOptions}. A member mentioned is a member
 * somebody eventually writes a use for, and the use here would be a
 * request this adapter is not allowed to make.
 *
 * ## Two refusals, and they are not the same refusal
 *
 * The envelope binds at construction and so does the
 * `parser_config`, so both are known before anything is read, and
 * both have a member saying what is wrong with them:
 * {@link PushCaptureAdapter.envelopeErrors} and
 * {@link PushCaptureAdapter.configErrors}. They differ in what they
 * cost.
 *
 * A refused CONFIG degrades. The records are still taken out of the
 * body and still kept, each one with its evidence and no fields
 * read — the keep half of fail-flag-keep, expressed in the adapter
 * exactly as `./listing-api.ts` expresses it. What is wrong is a row
 * an operator has to edit, and the documents written meanwhile are
 * what that operator reads while editing it.
 *
 * A refused ENVELOPE is total: no reading at all, whatever the body
 * looks like. A version this service does not accept means the rules
 * the other members would be judged by are not the rules the client
 * wrote to, so reading a body under them would be reading a shape we
 * have just been told we do not understand. Nothing is lost by it,
 * and that is the part specific to push: `ar-capture` writes
 * `documents.raw` with the received body and a `parse_status` of
 * `failed` BEFORE this module is reached, so a refusal here lands on
 * a row that already exists. The capture-contract header argues why
 * that ordering is what makes a push refusal survivable at all.
 *
 * ## What a `parser_config` says here
 *
 * The same column three modules read, minus the half that is about
 * fetching. `endpoints`, `base_url`, `max_rows`, `max_pages` and
 * `cursor` belong to the listing loop and mean nothing to a source
 * that pushes; a push row carrying them is carrying dead keys.
 *
 * - `recordsPath` is where the records sit inside the ENVELOPE'S
 *   BODY, not inside the envelope. A config author writes paths
 *   against what their client captured, and the envelope is this
 *   service's frame around it rather than part of what was captured.
 * - `fields` is the field map, applied to one record. A rule stating
 *   no `path` reads the record itself, which is what a text body
 *   needs: a capture that is one page of markup is one record, and
 *   its rules read it with a `selector` or a `pattern` and no path.
 * - Two field-map members are read by name by
 *   {@link PushCaptureAdapter.toCanonical} — {@link URL_FIELD} and
 *   {@link BODY_FIELD} — and every other one is extraction a
 *   `findings` row is built from.
 *
 * ## What `toCanonical` writes into `documents.raw`
 *
 * A record and the note the envelope carried, together: the entry
 * the reading was made from, verbatim, beside the four envelope
 * members that say how the capture was taken. See
 * {@link PushCaptureRaw}.
 *
 * The note is recorded per DOCUMENT rather than once per capture,
 * and a body carrying a list is why. One envelope becomes as many
 * documents as its body had records, and each of those rows is read
 * on its own later — so a row whose provenance lived somewhere else
 * would be a row nobody can judge without going and finding the
 * capture it arrived in. `./listing-api.ts` keeps its endpoint
 * beside each record for the same reason, and this is the same
 * decision reached from the other kind of source.
 *
 * It travels on {@link PushCaptureRecord} rather than being read off
 * the bound envelope inside `toCanonical`, which is what keeps that
 * member a function of its argument. An adapter constructed with one
 * envelope and handed a record parsed out of another would otherwise
 * stamp the wrong provenance onto it — and a stored-payload seam is
 * precisely the arrangement where that happens.
 *
 * ## The source id the client claimed, and the row it was posted to
 *
 * `documents.source_id` is taken from {@link PushCaptureOptions},
 * which is the `sources` row this adapter was CONSTRUCTED for, and
 * never from the envelope. The envelope's own `sourceId` is a claim
 * by whoever posted it, and it is recorded in the note as evidence
 * rather than acted on.
 *
 * The two are normally the same and the difference is what matters
 * when they are not. Whether a row by that id exists, is enabled, or
 * is the one this client should be posting to are three questions
 * for the workflow that has a database, and the capture contract
 * says so in as many words. Taking the column from the claim would
 * let a client that got hold of one endpoint write documents against
 * any source row in the domain; taking it from the construction
 * leaves the claim visible in `documents.raw`, where a mismatch is
 * something an operator can find.
 *
 * ## The digest, and why it is written twice
 *
 * {@link contentHash} is `./listing-api.ts`'s digest, in a second
 * copy. That is deliberate rather than a merge nobody got round to:
 * `documents.hash` is the key one row per distinct item stands on,
 * and its own column comment says capturing the same item from a
 * second source has to land on the row already there — so two
 * adapters that hashed differently would break the property the
 * column exists for, whichever one of them was right.
 *
 * The copy is what the alternatives cost. Importing it from a
 * sibling adapter would make one adapter depend on another's module
 * loading; extracting it would add a third non-adapter module to a
 * directory whose registry guard names every one of them by hand. So
 * the copies stay, and a case beside this file drives both adapters
 * over one pair of values and asserts they answer the same digest —
 * which is what stops the two drifting quietly rather than a comment
 * asking the next reader not to.
 *
 * The basis is a URL and a body, whitespace-collapsed and
 * JSON-encoded so the halves cannot bleed into each other. What is
 * NOT in it is the same list: not the source, not the capture stamp,
 * and not the provenance. A client that captures the same page twice
 * is capturing one item, and a digest that moved with the moment of
 * capture would make every re-capture a new row.
 */
import type {
  CanonicalDocument,
  SourceAdapter,
  SourceKind,
} from './index.js';
import type { ParseDeps, ParsedRecord } from '../lib/parser-config.js';

import { createHash } from 'node:crypto';

import {
  CAPTURE_ENVELOPE_MEMBERS,
  captureEnvelopeErrors,
} from '../lib/capture-contract.js';
import { markupSelect } from '../lib/markup-select.js';
import {
  applyFieldMap,
  parserConfigErrors,
  valueAtPath,
} from '../lib/parser-config.js';

import { htmlToText } from './html-text.js';

/**
 * This adapter's id: stable, and unique across the registry in
 * `./index.ts`. Spelled as the file stem, so the module a reader
 * opens and the id a `sources` row selects are one word.
 */
const ADAPTER_ID = 'push-capture';

/**
 * Which transport family this adapter fronts, and the `kind` every
 * `sources` row it can be constructed for carries.
 *
 * `push` is the one member of `SOURCE_KINDS` naming a direction
 * rather than a format: the other three say what this service will
 * go and read, and this one says the reading already happened
 * somewhere else. The annotation holds it to a member of that tuple
 * in `src/db/schema/values.ts` — the same tuple the `sources.kind`
 * CHECK is generated from — so a kind that is not one is a type
 * error rather than a row this adapter is never selected for.
 */
const ADAPTER_KIND: SourceKind = 'push';

/**
 * The field-map member `documents.url` is taken from.
 *
 * The same name `./listing-api.ts` exports, and declared again
 * rather than imported: the convention belongs to whoever writes a
 * `parser_config`, not to either adapter, and one adapter reaching
 * into another for it would make the second the first's dependency
 * over a string. A case beside this file holds the two constants
 * equal, so the convention is checked rather than remembered.
 */
export const URL_FIELD = 'url';

/**
 * The field-map member `documents.body` is taken from.
 *
 * A field map declaring neither this nor {@link URL_FIELD} is not an
 * error: it produces documents with an empty body, which is a
 * capture that yielded no text and is kept anyway. What decides
 * whether that matters is the source contract, not this module.
 */
export const BODY_FIELD = 'body';

/**
 * Which envelope member carries what was captured.
 *
 * Spelled the same as {@link BODY_FIELD} and meaning something
 * else: this is a WIRE member of the capture envelope, and that is a
 * member name in a field map an operator wrote. The two vocabularies
 * agree here by coincidence and neither may be defined in terms of
 * the other — renaming a field-map convention must not silently move
 * which envelope member the body is read from.
 */
const ENVELOPE_BODY_MEMBER = 'body';

/**
 * Which envelope members are recorded beside every document.
 *
 * Derived from `CAPTURE_ENVELOPE_MEMBERS` rather than written out,
 * so a member added to the envelope joins the note by joining that
 * tuple and this file needs no edit. Everything except the body,
 * which is not provenance — it is the thing the provenance is about,
 * and it is already stored as the record.
 */
const NOTE_MEMBERS: readonly string[] = CAPTURE_ENVELOPE_MEMBERS
  .filter((member) => member !== ENVELOPE_BODY_MEMBER);

/**
 * The digest `documents.hash` is written with.
 *
 * Not exported, and no case reads it. A suite asserting the
 * algorithm off this module would agree with any edit to it, where
 * what a case can actually check — that the digest is stable, that
 * whitespace does not move it, and that the other adapter answers
 * the same one — holds whichever digest is named here.
 */
const HASH_ALGORITHM = 'sha256';

/**
 * The markup step the extraction engine is given: the matcher in
 * `../lib/markup-select.ts`, paired with the reduction in
 * `./html-text.ts`.
 *
 * Neither imports the other — the matcher is spliceable and a
 * spliced library may not import anything — and each names its
 * caller as the place the two are paired. This is that caller, and
 * `./listing-api.ts` is the other one; the pairing is a property of
 * reading markup rather than of any one kind of source.
 *
 * The pairing sits in the STEP rather than in
 * {@link PushCaptureAdapter.toCanonical}, and the reason is what
 * judges the result: a source contract is checked against the
 * reading, so a body reduced after the check would be checked as
 * markup and stored as text. It also confines the reduction to
 * fields that declared a selector — a field reading a plain member
 * never reaches this step.
 *
 * @param markup - The value the field rule reached.
 * @param selector - The selector the field rule stated.
 * @returns One plain-text fragment per match.
 */
function selectText(markup: string, selector: string): string[] {
  return markupSelect(markup, selector)
    .map((fragment) => htmlToText(fragment));
}

/**
 * Everything the extraction engine needs that is not data.
 *
 * The step is supplied rather than reached for, for a reason of the
 * engine's own: it is written dual-context and a spliced library may
 * not import another, so the markup step is a parameter there. Held
 * at module scope because it never varies — the engine treats it as
 * read-only, and a fresh object per call would be an allocation a
 * reader would have to explain.
 */
const PARSE_DEPS: ParseDeps = { selectMarkup: selectText };

/**
 * What this adapter's `fetch` answers, and the only thing `parse`
 * reads: the envelope as it was posted.
 *
 * `unknown`, and that is the honest type rather than a placeholder.
 * `CaptureEnvelope` in `../lib/capture-contract.ts` describes what
 * an ACCEPTED envelope is, and its own header says nothing narrows
 * to it on its own — so typing this member as that shape would
 * assert the very thing `captureEnvelopeErrors` exists to doubt, on
 * a value that arrived from outside.
 */
export type PushCapturePayload = unknown;

/**
 * How the capture was taken, as the envelope recorded it.
 *
 * The members are {@link NOTE_MEMBERS} — every envelope member
 * except the body — and each value is whatever the envelope held
 * there, verbatim. Read as `unknown` because that is what it is: the
 * note is EVIDENCE on its way to `documents.raw`, and a second set
 * of member types written here would be a narrowing claim this
 * module cannot check and does not need.
 */
export type CaptureNote = Readonly<Record<string, unknown>>;

/**
 * One reading: what the field map made of one record, beside the
 * record it was made from and the capture it arrived in.
 *
 * `parse` answers exactly one of these per entry the body carried,
 * whatever the extraction managed — which is the keep half of
 * fail-flag-keep expressed in the adapter rather than in a workflow.
 * A record the config could read nothing out of still arrives with
 * its {@link PushCaptureRecord.raw}, so the document written for it
 * carries the evidence a shape change is discovered from.
 */
export interface PushCaptureRecord {
  /**
   * The reading: one member per field the map declared, including
   * the ones that read as nothing.
   *
   * Built on a null prototype by the engine, so a member named
   * `__proto__` is a real own key rather than a silent no-op.
   */
  readonly fields: ParsedRecord;

  /**
   * The capture this record arrived in, as the envelope described
   * it. Carried per record for the reason the header gives — one
   * envelope becomes as many documents as its body had records.
   */
  readonly capture: CaptureNote;

  /**
   * The body entry this reading was made from, verbatim, and the
   * record half of what `documents.raw` is written with.
   */
  readonly raw: unknown;

  /**
   * One sentence per step the engine could not take on this record.
   *
   * Per record rather than per capture, because that is the grain a
   * reader needs: a warning belongs to the document it is stored
   * beside, and a capture-level list would say a step failed without
   * saying which document it failed on.
   */
  readonly warnings: readonly string[];
}

/**
 * What `documents.raw` holds for a document this adapter produced.
 *
 * Two members and no third. A stored row answers both of the
 * questions a reader has about a pushed document — what the client
 * sent, and how the client says it got it — without either being
 * reconstructed from somewhere else.
 *
 * The envelope is NOT stored whole here. Its body is the record
 * beside the note, one entry at a time, so a capture carrying twenty
 * records does not put all twenty into each of the twenty rows it
 * becomes.
 */
export interface PushCaptureRaw {
  /** How the capture was taken, as the envelope recorded it. */
  readonly capture: CaptureNote;

  /** The one body entry this document was read from, verbatim. */
  readonly record: unknown;
}

/**
 * What one adapter of this kind is constructed with: the capture
 * that arrived, and the `sources` row it was posted against.
 *
 * No endpoint and no transport, which is the divergence from
 * `./listing-api.ts` worth reading twice — see the header. Nothing
 * here can reach anything, so there is nothing to bind that would
 * let it.
 */
export interface PushCaptureOptions {
  /**
   * The envelope as it was posted, whatever was posted.
   *
   * Bound once rather than handed to `fetch`, because the contract
   * gives `fetch` no parameters and because this IS the source: an
   * adapter is constructed per capture here, where every other kind
   * is constructed per row and reused.
   */
  readonly envelope: unknown;

  /**
   * The row's `parser_config` column, whatever it holds.
   *
   * `unknown` rather than a config interface, matching the column's
   * lack of a `$type` annotation: what a well-formed row looks like
   * is what `parserConfigErrors` checks, and typing the parameter as
   * that shape would assert the very thing the check exists to
   * doubt.
   */
  readonly parserConfig: unknown;

  /**
   * The row's own id, written to `documents.source_id` on every
   * document this adapter produces.
   *
   * The row this adapter was CONSTRUCTED for, never the one the
   * envelope claims — the header argues the difference. Nullable
   * because the column is, and required-but-nullable rather than
   * optional for the reason the contract gives: the NULL means the
   * document came through no source at all, and an omitted key would
   * leave this module deciding which of the two it had been handed.
   */
  readonly sourceId: number | null;
}

/**
 * This adapter, as {@link createPushCapture} answers it.
 *
 * `SourceAdapter` plus two members the contract does not declare,
 * both for the same reason: `parse` answers a list of readings,
 * which is a shape with nowhere for a fault about the capture or the
 * row to go, and both of those bind at construction so both are
 * known before anything is read. A caller that dropped them would
 * discover a refused envelope and a broken config as the same thing
 * — an extraction of nothing, which is also what a thin body looks
 * like.
 */
export interface PushCaptureAdapter
  extends SourceAdapter<PushCapturePayload, PushCaptureRecord> {
  /**
   * Everything wrong with the bound `parser_config`, one sentence
   * each, and empty when the row is usable.
   *
   * A non-empty list means `parse` reads NO field at all rather than
   * the subset that happened to be well-formed, which is the
   * engine's own refusal carried up. The records are still kept.
   */
  readonly configErrors: readonly string[];

  /**
   * Everything wrong with the bound envelope, one sentence each, and
   * empty when the contract accepts it.
   *
   * What `ar-capture` writes into `documents.parse_error` on the row
   * it already stored. Every sentence is a whole constant out of
   * `../lib/capture-contract.ts` and names the member and the rule
   * rather than the value that broke it.
   *
   * `parse` does not read this member. It re-runs the same check on
   * whatever it was HANDED, which is what keeps it a function of its
   * argument and keeps the stored-payload seam honest; this member
   * is the answer for the envelope bound above. For the ordinary
   * call — `parse(await adapter.fetch())` — they are one envelope
   * and one answer, and a case pins that.
   */
  readonly envelopeErrors: readonly string[];
}

/**
 * The note recorded beside every document one envelope becomes.
 *
 * Read by own key through `valueAtPath`, whose whole job is a
 * lookup that a stored `__proto__` or `constructor` cannot reach
 * through. The four names carry no separator, so each path is one
 * segment.
 *
 * Called only for an envelope the contract accepted, so every member
 * is there; it is written to survive one that is not anyway, because
 * a missing member reads as `undefined` and a note is evidence
 * rather than a claim.
 *
 * @param envelope - The envelope, as it was posted.
 * @returns One member per {@link NOTE_MEMBERS} entry, verbatim.
 */
function captureNote(envelope: unknown): CaptureNote {
  return Object.fromEntries(
    NOTE_MEMBERS.map((member) => [member, valueAtPath(envelope, member)]),
  );
}

/**
 * The entries a body carries, one per document it will become.
 *
 * A LIST body is as many entries as it has members and anything else
 * is exactly one, which is what a capture contract admitting text, a
 * keyed object or a list of them comes to on this side. A text body
 * is one entry and reads perfectly well: a field rule stating no
 * `path` reads the record itself, which is how a captured page of
 * markup is extracted.
 *
 * `recordsPath` is applied HERE and once. It is the engine's own
 * key, and it is read at this level rather than inside `parse` for
 * the reason `./listing-api.ts` gives about its own loop: whatever
 * splits a payload into records has already taken them out by the
 * time a field map runs, and applying the path a second time would
 * look for the array inside one of its own members.
 *
 * @param body - The envelope's body member, whatever it held.
 * @param recordsPath - The config `recordsPath`, or undefined to
 *   read the body itself.
 * @returns One entry per record, empty when the path reached none.
 */
function bodyEntries(
  body: unknown,
  recordsPath: unknown,
): readonly unknown[] {
  const found = recordsPath === undefined
    ? body
    : valueAtPath(body, recordsPath);

  if (found === undefined) {
    return [];
  }

  return Array.isArray(found)
    ? found
    : [found];
}

/**
 * One reading, made from one body entry.
 *
 * @param entry - One member of the body's record list.
 * @param note - The capture this entry arrived in.
 * @param fields - The bound field map, or undefined to read none.
 * @returns The reading, its evidence and its warnings.
 */
function readEntry(
  entry: unknown,
  note: CaptureNote,
  fields: unknown,
): PushCaptureRecord {
  const built = applyFieldMap(entry, fields, PARSE_DEPS);

  return {
    fields: built.record,
    capture: note,
    raw: entry,
    warnings: built.warnings,
  };
}

/**
 * One member of a reading, as text, or nothing.
 *
 * The empty string answers nothing rather than itself, because both
 * columns this feeds treat it that way: `documents.url` is NULL
 * where there is no such place and never `''`, and a body read as
 * `''` is a capture that yielded no text either way.
 *
 * @param fields - The reading.
 * @param name - Which member to take.
 * @returns The text, or null when the member is not usable text.
 */
function textMember(fields: ParsedRecord, name: string): string | null {
  const value = valueAtPath(fields, name);

  return typeof value === 'string' && value !== ''
    ? value
    : null;
}

/**
 * One half of a hash basis, with its whitespace collapsed.
 *
 * @param value - Either half, as text.
 * @returns The half with runs of whitespace reduced and trimmed.
 */
function hashBasis(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

/**
 * The content hash of one document, as `documents.hash` takes it.
 *
 * The second copy of `./listing-api.ts`'s digest, kept in step by a
 * case rather than by an import — the header says what the two
 * alternatives cost. Both adapters have to answer the same digest
 * for the same document, because the column's dedupe rule is about
 * items and not about how one was captured.
 *
 * The pair is whitespace-collapsed so a client that re-serializes
 * its own text does not answer as a new item, and JSON-encoded so
 * the two halves cannot bleed into each other: without the encoding
 * a URL ending in the first words of a body would collide with a
 * shorter URL and a longer one.
 *
 * @param url - Where the document is, or null when nowhere.
 * @param body - The document text, possibly empty.
 * @returns The digest, hex-encoded.
 */
function contentHash(url: string | null, body: string): string {
  const basis = JSON.stringify([hashBasis(url ?? ''), hashBasis(body)]);

  return createHash(HASH_ALGORITHM)
    .update(basis, 'utf8')
    .digest('hex');
}

/**
 * Construct the adapter for one capture.
 *
 * Per CAPTURE rather than per row, which is the one place this
 * adapter's lifetime differs from every other kind's: the envelope
 * binds here, so a second capture against the same `sources` row is
 * a second construction. The config is validated ONCE for the same
 * reason it is elsewhere — it cannot change between calls — and so
 * is the envelope, which cannot either.
 *
 * @param options - The capture that arrived, the row's config, and
 *   the id of the row it was posted against.
 * @returns The adapter, ready to be read.
 */
export function createPushCapture(
  options: PushCaptureOptions,
): PushCaptureAdapter {
  const configErrors = parserConfigErrors(options.parserConfig);
  const usable = configErrors.length === 0;
  const fields = usable
    ? valueAtPath(options.parserConfig, 'fields')
    : undefined;
  const recordsPath = usable
    ? valueAtPath(options.parserConfig, 'recordsPath')
    : undefined;

  return {
    id: ADAPTER_ID,
    kind: ADAPTER_KIND,
    configErrors,
    envelopeErrors: captureEnvelopeErrors(options.envelope),

    /**
     * Answer the envelope this adapter was constructed with. The
     * member the contract allows to do I/O, and the one member of
     * this module that would have — see the header for why a push
     * source is the case where there is nothing to go and get.
     */
    async fetch(): Promise<PushCapturePayload> {
      return options.envelope;
    },

    /**
     * One reading per record the envelope's body carried, under the
     * field map bound above. Pure: no I/O, no clock, no network.
     *
     * The envelope is judged first and a refused one reads nothing
     * at all, whatever its body looks like. The check runs on the
     * argument rather than on the bound envelope, which is what
     * keeps this a function of what it was handed.
     */
    parse(raw: PushCapturePayload): PushCaptureRecord[] {
      if (captureEnvelopeErrors(raw).length > 0) {
        return [];
      }

      const note = captureNote(raw);
      const body = valueAtPath(raw, ENVELOPE_BODY_MEMBER);

      return bodyEntries(body, recordsPath)
        .map((entry) => readEntry(entry, note, fields));
    },

    /**
     * Map one reading onto the canonical shape. Pure, and the only
     * member that has to know what a `documents` row holds — every
     * member of `CanonicalDocument` is produced here or nowhere.
     *
     * `raw` is the record and its capture note together, and
     * `sourceId` is the row this adapter was constructed for rather
     * than the one the envelope claimed. The header argues both.
     */
    toCanonical(parsed: PushCaptureRecord): CanonicalDocument {
      const url = textMember(parsed.fields, URL_FIELD);
      const body = textMember(parsed.fields, BODY_FIELD) ?? '';
      const raw: PushCaptureRaw = {
        capture: parsed.capture,
        record: parsed.raw,
      };

      return {
        hash: contentHash(url, body),
        sourceId: options.sourceId,
        url,
        body,
        raw,
      };
    },
  };
}

/**
 * What the registry in `./index.ts` holds under `push-capture`.
 *
 * An adapter bound to NO capture and no row: no envelope, an empty
 * config that declares no field, and a null source id. What it
 * carries is the id and the kind — the two members a `sources` row
 * is matched against, and the whole of what registration answers.
 *
 * Inertness is free here, and that is the `fetch` argument arriving
 * at the registry. `./listing-api.ts` needs a transport that refuses
 * before its declaration is safe to hold, because its `fetch` opens
 * a socket. No member of this module can reach anything at all, so
 * the declaration is inert by being constructed rather than by being
 * defused: `fetch` answers the undefined envelope, the contract
 * refuses it, and `parse` reads nothing.
 *
 * That there is something to explain here at all is the place the
 * contract and the registry pull against each other. Configuration
 * binds at construction, so an adapter is per ROW — and per CAPTURE
 * for this kind; a registry is keyed by id and holds one entry per
 * KIND of source. The entry is therefore a declaration rather than a
 * working adapter, and a run builds its own through
 * {@link createPushCapture} with the envelope that arrived.
 */
export const PUSH_CAPTURE_DECLARATION: PushCaptureAdapter =
  createPushCapture({
    envelope: undefined,
    parserConfig: {},
    sourceId: null,
  });
