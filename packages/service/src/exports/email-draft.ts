/**
 * @packageDocumentation
 * email-draft — the `email_draft` export: a message somebody else
 * sends, composed by something that cannot send one.
 *
 * A DRAFT IS THE WHOLE OUTPUT. What comes back is one artifact
 * carrying a subject line and the digest beneath it, and that is
 * where this module's part in an email ends. Nothing here addresses
 * a message, writes a header block, opens a connection, enqueues
 * anything or learns an address at all — the input carries a
 * `connectorId` and never a recipient, which is what
 * `ExportSubscriptionRow.connectorId` argues at that member and what
 * `./email-draft.test.ts` reads back off the artifact.
 *
 * DISPATCH IS A LATER SERVICE-LAYER CAPABILITY, BEHIND ITS OWN
 * APPROVAL GATE. `docs/architecture/00-overview.md` fixes where a
 * capability that reaches outward lands: in the service, each behind
 * a gate of its own, and never in the executor. So whatever one day
 * puts a draft in front of a person reads an artifact this renderer
 * already answered, and the approval that lets it run is a decision
 * recorded in the database rather than a branch on a canvas. None of
 * that is deferred WORK here — it is a different layer, and the
 * draft is complete without it.
 *
 * THIS MODULE IS WHAT KEEPS THE EXECUTOR SEND-FREE ONCE EMAIL
 * SUBSCRIPTIONS EXIST. `email_draft` is already a value the
 * `export_subscriptions` format CHECK accepts, so a row naming it is
 * schedulable today: `ar-dispatch` claims one exactly as it claims
 * any other export unit, and the stored digest the pass writes is
 * later put through the renderer that row's format names. The
 * pipeline reaching a format whose own name says `email` and finding
 * a renderer that only composes text is what makes the send-free
 * rule survive contact with the one format that implies delivery. A
 * send path grown here would sit INSIDE the executor, where every
 * workflow writing to the database only would still be true and
 * would no longer be the whole story.
 *
 * THE ABSENCE OF A TRANSPORT IMPORT IS NOT LEFT TO REVIEW. The
 * import list below is the whole of what this module reaches, and
 * `tests/invariants/exports-send-free.test.ts` is what holds it
 * there: a walk over every module under `src/exports/` refusing one
 * that names a notification channel from `src/notifications/`, a
 * node transport builtin, the global fetch or a filesystem builtin.
 * A reviewer reading an import list is not that check. The reading
 * is a property of the tree, taken over every module in this
 * directory including the ones nobody thought to look at, and it is
 * why this header can make the claim rather than merely repeat it.
 *
 * ## What one draft is
 *
 * ```text
 * # Readings 2026-08-30
 *
 * <the shared body, at heading depth two>
 * ```
 *
 * A subject line, then the body `./markdown-body.ts` composes for
 * every markdown renderer. This module writes no sentence about a
 * digest, lays out no finding and re-orders nothing: what it decides
 * is the subject, the depth the sections beneath it are headed at,
 * and the name the file takes — the same three decisions
 * `./obsidian-md.ts` and `./notion-md.ts` each make for their own
 * surface, so a period reads the same in a draft as it does in a
 * vault.
 *
 * ## The subject is a heading, not a header field
 *
 * `Subject:` on its own line is the first line of an RFC 5322 header
 * block, and a header block is the half of a message that says where
 * it goes. Writing one here would put a message envelope inside a
 * renderer — an empty envelope at first, and then a place for the
 * next task to add the field that fills it. So the subject is the
 * document's own top-level heading: a person composing the message
 * reads it off the top of the draft, and nothing in the artifact is
 * shaped like a field a transport would parse.
 *
 * That is also why the body sits at heading depth two. The subject
 * occupies the top level, so a section at `#` would stand level with
 * what the draft says it is about — the same reasoning
 * `./notion-md.ts` gives for its own depth, reached from a different
 * preamble.
 *
 * ## The one preamble in this directory built from stored text
 *
 * Both markdown siblings argue that their preamble needs no
 * reduction, because every value in one comes from {@link slugify}
 * or from `toISOString`, whose alphabets hold no newline and no
 * markdown control character. THAT ARGUMENT DOES NOT REACH HERE. A
 * subject is composed from the domain's display vocabulary, which is
 * `DomainSettings.findingsDisplayName` — free text an operator
 * typed, and the one preamble value in this directory that a
 * reduction has to run over.
 *
 * So it does: {@link sanitizeUntrusted} first, then a fold onto one
 * line. The fold is not optional and is not the sanitizer's job — a
 * heading occupies part of a line, so a newline inside the value
 * would close it early and leave the rest of the vocabulary standing
 * as markup of its own. `./email-draft.test.ts` reads that as a LINE
 * COUNT over a hostile vocabulary rather than as a paragraph here.
 *
 * The reduction can empty a value that was not blank — a vocabulary
 * of markup and nothing else reduces to nothing at all — so the
 * fallback {@link displayNameFor} applies to the stored value is
 * applied a second time to the reduced one. A subject reading as a
 * bare period would say nothing about what it is a digest of.
 *
 * ## What is deliberately not in a draft
 *
 * The recipient, because there is none to know. The connector,
 * because it is an id and resolving it is the caller's step after
 * this call returns. The subscription and the run, for the reasons
 * the siblings give: the first is a standing schedule in a document
 * about a period, the second a fact about the pipeline rather than
 * about what the period came to. The briefing is named in the FILE
 * name instead, which is where a reader looking for one row would
 * go.
 *
 * ## The one refusal
 *
 * A digest whose path cannot be composed answers NO artifact. The
 * reachable cause is a domain slug whose whole content reduces to
 * nothing, which is a real stored state rather than a malformed one.
 * `./artifact-path.ts` owns that judgement; this module reads its
 * answer and stops. Everything else is written — a period that came
 * to nothing is a draft saying so, for the reason
 * `./obsidian-md.ts` argues at length: nothing downstream reads a
 * destination back, so an absent file and an export that never ran
 * are the same thing to every reader of one.
 *
 * The path is the stem both markdown siblings compose, under the
 * domain's own folder, and the collision is deliberate rather than
 * overlooked: a destination is resolved per SUBSCRIPTION, by the
 * caller holding the connector, so two artifacts of one period land
 * apart because they were dispatched for different rows and not
 * because a renderer picked different names.
 *
 * ## Two calls over one input answer the same bytes
 *
 * No clock is read, no locale is consulted, no environment is looked
 * at and no counter is incremented. The one date this module formats
 * goes through `toISOString`, which is UTC and locale-independent —
 * a renderer reaching for a local-time formatter would answer a
 * different subject on two machines for one stored row.
 */

import type {
  ExportArtifact,
  ExportFormat,
  ExportRenderInput,
  ExportRenderer,
} from './index.js';

import {
  NEUTRAL_FINDINGS_DISPLAY_NAME,
  displayNameFor,
} from '../lib/digest-assemble.js';
import { sanitizeUntrusted, slugify } from '../lib/sanitize-md.js';

import { buildArtifactPath } from './artifact-path.js';
import { composeMarkdownBody } from './markdown-body.js';

/**
 * The media type every artifact this renderer answers carries.
 *
 * Markdown, and the same value both markdown siblings declare. What
 * an artifact holds is a document somebody reads and edits before
 * sending it, so it is the same kind of bytes a note is — a message
 * media type would describe an envelope this renderer does not
 * compose.
 */
export const EMAIL_DRAFT_MEDIA_TYPE = 'text/markdown';

/**
 * The extension the draft takes.
 *
 * A renderer literal rather than stored text, which is why
 * `buildArtifactPath` does not reduce it — see that module's header
 * for the asymmetry and for what still checks it.
 */
export const EMAIL_DRAFT_EXTENSION = 'md';

/**
 * The depth the shared body heads its sections at.
 *
 * Two, because the subject occupies the level above. Stated as a
 * constant rather than written at the call site so that the axis
 * this renderer shares with `./notion-md.ts` and parts from
 * `./obsidian-md.ts` on is a difference a reader can find by looking
 * at three names.
 */
export const EMAIL_DRAFT_HEADING_DEPTH = 2;

/**
 * What opens the subject line: an ATX heading at the top level.
 *
 * Exported so a case names the construct by this constant rather
 * than by a second spelling of it, the shape `FRONT_MATTER_FENCE` in
 * `./obsidian-md.ts` sets for the same reason. It is also the whole
 * of what makes the subject a heading rather than a header field —
 * see the header for why that distinction is load-bearing.
 */
export const SUBJECT_HEADING_PREFIX = '# ';

/**
 * What separates the two halves of a subject.
 *
 * Exported for the same reason: a case composing the expected
 * subject from the two stored members it comes out of writes this
 * constant rather than a second spelling of a space.
 */
export const SUBJECT_SEPARATOR = ' ';

/** What separates two lines of one artifact. */
const LINE_SEPARATOR = '\n';

/** What joins the readable parts of a draft name. */
const NAME_SEPARATOR = '-';

/** How many characters of an ISO stamp are the calendar day. */
const PERIOD_LENGTH = 10;

/** Every run of line breaks, for the fold the vocabulary gets. */
const NEWLINE_RUN_RE = /[\r\n]+/g;

/**
 * The format this renderer serves, named once.
 *
 * Once rather than at each of the two places it is written into,
 * because two spellings of one literal is two things to keep in step
 * and the registry selects on this value.
 */
const FORMAT: ExportFormat = 'email_draft';

// ---------------------------------------------------------------------------
// Reading the one column the period comes out of
// ---------------------------------------------------------------------------

/**
 * The briefing's stamp as text, or `null` when it cannot be read.
 *
 * `ExportBriefingRow.generatedAt` is typed as a `Date` and a row read
 * through the ORM supplies one, but the type admits an invalid date —
 * `new Date` over text it cannot parse is still a `Date` — and
 * `toISOString` THROWS on one. A renderer that threw would fail a
 * whole export run over the half of a subject line, so the reading is
 * guarded and its failure is an absence.
 *
 * The siblings', copied for the reason `./notion-md.ts` gives about
 * its own copy: importing one renderer into another would make the
 * set a hierarchy and put a change one surface needs one edit away
 * from moving another's documents. The price is paid where a case can
 * see it — `./email-draft.test.ts` holds the period this module
 * answers equal to what the same stamp gives elsewhere.
 *
 * @param generatedAt - The stamp, as the row carried it.
 * @returns The ISO instant, or `null` when there is nothing to show.
 */
function readStamp(generatedAt: Date): string | null {
  const moment = generatedAt instanceof Date
    ? generatedAt.getTime()
    : Number.NaN;

  return Number.isFinite(moment)
    ? generatedAt.toISOString()
    : null;
}

/**
 * The period an ISO stamp names: the calendar day it fell on.
 *
 * THE HONEST LIMIT IS THE COLUMN'S OWN. No column holds the span a
 * briefing covers, so what a renderer has is the moment it was
 * written plus the writer's convention that a briefing is generated
 * at the end of what it covers. A subject naming that day says which
 * digest this is; it does not claim the day is the whole period.
 *
 * @param stamp - An ISO instant, as {@link readStamp} answered it.
 * @returns The calendar day, in UTC.
 */
function periodOf(stamp: string): string {
  return stamp.slice(0, PERIOD_LENGTH);
}

// ---------------------------------------------------------------------------
// The subject
// ---------------------------------------------------------------------------

/**
 * Untrusted text, neutralized and folded onto one line.
 *
 * The same two steps `./markdown-body.ts` applies to every inline
 * position it composes, and for the same reason: a heading occupies
 * part of a line, so a newline inside a value would close it early
 * and leave the remainder standing as markup of its own. Runs
 * collapse to a single space rather than to nothing, so two words
 * either side of a line break stay two words.
 *
 * Written out here rather than imported from that module, which does
 * not export it — and a second reduction is not what this is. Both
 * call the same {@link sanitizeUntrusted} and apply the same fold
 * after it, so what is duplicated is two lines of sequencing.
 *
 * @param text - The untrusted text.
 * @returns The same words, neutralized, on one line.
 */
function reduceInline(text: string): string {
  return sanitizeUntrusted(text).replace(NEWLINE_RUN_RE, ' ');
}

/**
 * What this domain calls a finding, reduced and safe in a heading.
 *
 * {@link displayNameFor} guards the STORED value: absent, or present
 * and blank, falls back to {@link NEUTRAL_FINDINGS_DISPLAY_NAME}, and
 * anything else is carried through exactly as the operator wrote it.
 * The reduction then runs over what that answered, and it can empty a
 * value that was not blank — a vocabulary of markup and nothing else
 * reduces to nothing at all — so the same fallback is applied a
 * second time to the reduced value.
 *
 * What is NOT applied is a trim. Spacing an operator wrote is theirs,
 * on the reasoning `displayNameFor` states at length; the trim here
 * decides only whether anything is LEFT, and a value that survives is
 * written as it stands.
 *
 * @param input - The four stored rows this render is of.
 * @returns The vocabulary to head the draft with.
 */
function subjectVocabulary(input: ExportRenderInput): string {
  const reduced = reduceInline(displayNameFor(input.domain.settings));

  return reduced.trim() === ''
    ? NEUTRAL_FINDINGS_DISPLAY_NAME
    : reduced;
}

/**
 * The subject line of one draft: what it is about, and when.
 *
 * TWO STORED MEMBERS AND NOTHING ELSE.
 * `domains.settings.findingsDisplayName` says what this domain calls
 * a finding, and `briefings.generated_at` says which period this is a
 * digest of. No clock, no locale, no environment, no counter and
 * nothing off the subscription — a subject that moved when the row it
 * was dispatched for moved would be describing the schedule rather
 * than the digest.
 *
 * The period drops out entirely when the stamp cannot be read, rather
 * than leaving a separator with nothing after it. The vocabulary
 * never drops out, because a subject that is a bare date says nothing
 * about what it is a digest of.
 *
 * Exported because the subject is a value in its own right: whatever
 * later reads an artifact and puts a message in front of a person
 * needs the subject apart from the body, and one authority for it is
 * better than that layer reading the first line back and stripping a
 * prefix. Exporting it moves nothing outward — the answer is text,
 * this call reaches nothing, and where it goes is decided somewhere
 * else entirely.
 *
 * @param input - The four stored rows this render is of.
 * @returns The subject, without the heading prefix.
 */
export function emailDraftSubject(input: ExportRenderInput): string {
  const vocabulary = subjectVocabulary(input);
  const stamp = readStamp(input.briefing.generatedAt);

  return stamp === null
    ? vocabulary
    : vocabulary + SUBJECT_SEPARATOR + periodOf(stamp);
}

/**
 * The stem of the draft name: the period and the briefing row.
 *
 * The row id is what supplies uniqueness, which the slugger says it
 * cannot: the reduction collapses rather than encodes, so two
 * subjects can answer one slug and only a stored id cannot. The
 * period leads because that is what a person scanning a folder is
 * looking for, and it drops out entirely when the stamp could not be
 * read rather than leaving a hyphen with nothing before it.
 *
 * @param stamp - The briefing stamp, or `null` when unreadable.
 * @param briefingId - The `briefings.id` this draft is of.
 * @returns The stem, before it is reduced.
 */
function draftStem(stamp: string | null, briefingId: number): string {
  const identifier = String(briefingId);

  return stamp === null
    ? identifier
    : periodOf(stamp) + NAME_SEPARATOR + identifier;
}

// ---------------------------------------------------------------------------
// The renderer
// ---------------------------------------------------------------------------

/**
 * Render one stored digest as one email draft.
 *
 * The subject line, a blank line and the shared body — or the subject
 * alone when the digest came to nothing, which is a draft saying so
 * rather than an absence a reader would have to interpret.
 *
 * NOTHING IS ADDRESSED, QUEUED OR SENT. The artifact carries the four
 * members `ExportArtifact` declares and no fifth: no recipient, no
 * header block, no envelope and no handle on anything that could
 * deliver one. See the header for where dispatch lands instead and
 * for what asserts the absence rather than trusting this paragraph.
 *
 * Answers an empty list only when the path cannot be composed, which
 * `./artifact-path.ts` decides and this function does not second-
 * guess. Never throws for any stored row; the one ending a caller has
 * to be ready for is `sanitizeUntrusted`'s, over a field whose string
 * conversion throws.
 *
 * Pure. Nothing is read that is not in the input, nothing is written
 * anywhere, and the returned artifacts are the only way anything
 * leaves this call.
 *
 * @param input - The four stored rows this render is of.
 * @returns One artifact, or none when the path was refused.
 */
export function renderEmailDraft(input: ExportRenderInput): ExportArtifact[] {
  const slug = slugify(input.domain.slug);
  const stamp = readStamp(input.briefing.generatedAt);
  const built = buildArtifactPath({
    folders: [slug],
    name: draftStem(stamp, input.briefing.id),
    extension: EMAIL_DRAFT_EXTENSION,
  });

  if (!built.ok) {
    return [];
  }

  const subject = SUBJECT_HEADING_PREFIX + emailDraftSubject(input)
    + LINE_SEPARATOR;
  const body = composeMarkdownBody(input, {
    headingDepth: EMAIL_DRAFT_HEADING_DEPTH,
  });

  return [{
    format: FORMAT,
    path: built.path,
    mediaType: EMAIL_DRAFT_MEDIA_TYPE,
    body: body === ''
      ? subject
      : subject + LINE_SEPARATOR + body,
  }];
}

/**
 * The `email_draft` renderer, as the registry names it.
 *
 * The declaration shape `LISTING_API_DECLARATION` in
 * `src/sources/listing-api.ts` sets: the behaviour is an exported
 * function a case can call directly, and this const is the one member
 * a registry entry needs. TWO MEMBERS AND NO THIRD — the interface
 * leaves nowhere for a `send` to live, and this is the format where
 * that matters most.
 */
export const EMAIL_DRAFT_RENDERER: ExportRenderer = {
  format: FORMAT,
  render: renderEmailDraft,
};
