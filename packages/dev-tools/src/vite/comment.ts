/**
 * The body of `POST /__devtools/comment` — the "also affected" route —
 * and the one function that turns an unknown request payload into
 * either a comment or a refusal.
 *
 * Spec item 7 is the authority: a report the tracker chain believes is
 * already filed leaves the reporter one action, and that action is
 * called "also affected" here and everywhere else in this package. What
 * travels over the wire for it is two values, an issue id and the
 * comment markdown, and all of the rules about them live here, pure:
 * this module reads the one argument it is handed, touches no
 * filesystem, no clock, no socket and no module state, and answers a
 * value rather than writing a response.
 *
 * ## Why this is a module and not a schema inside `./endpoint.ts`
 *
 * `./report.ts` is the same shape for the same reason, and the split
 * task that produced `./http.ts` left `./endpoint.ts` holding "the
 * routing and the route handlers alone". A schema is neither. Keeping
 * it here also keeps both files under this package's 800-line cap,
 * which `./endpoint.ts` measurably was not with the schema inlined:
 * 922 lines with it, 833 without (measured with `wc -l`, before the
 * handler was rewired onto {@link parseComment}).
 *
 * ## What a refusal may safely be echoed
 *
 * {@link DevToolsCommentRefusal.reason} is zod's own message, which
 * names the EXPECTATION and at most the received TYPE and never the
 * received VALUE — the measurement is in `./report.ts`'s header, over
 * the same zod. {@link DevToolsCommentRefusal.path} is one of exactly
 * three strings — `issueId`, `body`, or `''` for a payload that is not
 * an object at all — because both members of this schema are flat: a
 * caller putting the path in a response body is not echoing anything
 * the request chose, which is the one caveat `./report.ts` carries for
 * its `context` keys and this module does not.
 *
 * ## The one limit this module does NOT enforce
 *
 * The size of the REQUEST. This function is handed an already-parsed
 * value, so by the time it runs the bytes are in memory; capping what
 * the middleware reads off the socket is `./http.ts`'s job, and
 * `DEVTOOLS_BODY_BYTES_MAX` is where that cap lives.
 */

import { z } from 'zod';

/**
 * The longest issue id accepted on the "also affected" route.
 *
 * A tracker's identifier is a number, a key like `AR-123`, or a
 * GitHub-style `owner/name#1` — never prose — so this is generous
 * rather than tight, the same reading `./report.ts` takes of a feature
 * id.
 */
const COMMENT_ISSUE_ID_MAX = 128;

/**
 * What an issue id may be spelled with.
 *
 * The leading character is the point of the pattern: an id reaches a
 * gateway that runs `rafa` with an argv ARRAY, and an element opening
 * with `-` is read by every CLI as a FLAG rather than as a value.
 * Refusing it here means an implementation never has to defend against
 * one. The rest of the charset — alphanumerics, then the separators a
 * tracker key actually uses — carries no whitespace, no quote and no
 * control byte, so an id cannot smuggle a second argument either.
 */
const COMMENT_ISSUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9#/._-]*$/;

/**
 * The longest comment accepted, in characters.
 *
 * `./report.ts`'s `body` limit, restated rather than imported: the
 * sender is the same drawer writing the same kind of markdown, and spec
 * item 8.3's 5,000 is the size the form is built around. zod counts
 * CODE POINTS here — `./report.ts`'s header has the measurement — so a
 * comment of astral characters may be up to 10,000 UTF-16 units, which
 * is well inside `./http.ts`'s body cap either way.
 */
const COMMENT_BODY_MAX = 5_000;

/**
 * The body of `POST /__devtools/comment`.
 *
 * Two members, because the "also affected" path has two things to say:
 * which issue is already this report, and what to add to it. The names
 * are `ReportGateway.comment`'s own parameter names, so a reader moving
 * between the route and the gateway meets one spelling.
 *
 * Unknown top-level keys are STRIPPED rather than refused, which is
 * zod's default and the reading `./report.ts` takes for the same
 * reason: a key outside the contract is a sender that has not been
 * updated, not an attack, and nothing unvalidated travels onward.
 */
export const devtoolsCommentSchema = z.object({
  /** The `ReportGatewayIssue.id` of the issue being commented on. */
  issueId: z
    .string()
    .min(1)
    .max(COMMENT_ISSUE_ID_MAX)
    .regex(
      COMMENT_ISSUE_ID_PATTERN,
      'An issue id is a tracker identifier: it may not begin with a '
      + 'dash or carry whitespace.',
    ),

  /** The comment markdown, already rendered by the caller. */
  body: z
    .string()
    .min(1)
    .max(COMMENT_BODY_MAX),
});

/**
 * A validated "also affected" body.
 *
 * Inferred from {@link devtoolsCommentSchema} rather than declared
 * beside it, so the type cannot drift from the thing that enforces it.
 */
export type DevToolsComment = z.infer<typeof devtoolsCommentSchema>;

/** A body that passed {@link devtoolsCommentSchema}. */
export interface DevToolsCommentParsed {
  /** Always `true`; the discriminant. */
  readonly ok: true;

  /** The comment, with unknown top-level keys stripped. */
  readonly comment: DevToolsComment;
}

/**
 * A body that did not pass, and where it failed.
 *
 * One refusal, not a list, for the reason `./report.ts` gives: the
 * endpoint answers a status code and a sentence, and a caller that
 * wants every issue reaches for {@link devtoolsCommentSchema} itself.
 */
export interface DevToolsCommentRefusal {
  /** Always `false`; the discriminant. */
  readonly ok: false;

  /** Which field failed — `issueId`, `body`, or `''` for the root. */
  readonly path: string;

  /** Why, in zod's words. Never contains the received value. */
  readonly reason: string;
}

/**
 * What {@link parseComment} answers.
 *
 * A discriminated union rather than a nullable comment, so a caller
 * that reads {@link DevToolsCommentParsed.comment} without testing `ok`
 * first does not compile — the shape `./report.ts` and `./origin.ts`
 * both answer in, because `./endpoint.ts` reads them in a row.
 */
export type DevToolsCommentParse =
  | DevToolsCommentParsed
  | DevToolsCommentRefusal;

/**
 * The reason a refusal carries when zod gave none.
 *
 * Unreachable with zod 4.5.1, for the reason `./report.ts`'s own
 * fallback states: a `safeParse` answering `success: false` always
 * carries at least one issue, and the branch below exists because
 * `noUncheckedIndexedAccess` types the first element as possibly
 * absent. Written as a refusal rather than a throw, so that a zod which
 * ever did answer an empty issue list would refuse the body instead of
 * failing the dev server's middleware.
 */
const UNEXPLAINED_REFUSAL = 'The comment body was refused.';

/**
 * Validate an unknown "also affected" request body.
 *
 * @param input - Whatever the middleware parsed out of the request
 * body. `unknown` on purpose: `JSON.parse` answers `any`, and taking it
 * as `unknown` makes this the boundary rather than a formality after
 * one.
 * @returns The parsed comment, or the first refusal with its field
 * path.
 */
export function parseComment(input: unknown): DevToolsCommentParse {
  const result = devtoolsCommentSchema.safeParse(input);

  if (result.success) {
    return Object.freeze({ ok: true as const, comment: result.data });
  }

  const [issue] = result.error.issues;

  if (issue === undefined) {
    return Object.freeze({
      ok: false as const,
      path: '',
      reason: UNEXPLAINED_REFUSAL,
    });
  }

  return Object.freeze({
    ok: false as const,
    path: issue.path.map((segment) => String(segment)).join('.'),
    reason: issue.message,
  });
}
