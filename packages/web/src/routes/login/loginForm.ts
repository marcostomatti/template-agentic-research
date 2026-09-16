/**
 * @packageDocumentation
 * The pure half of the login form: what an operator typed read as a
 * credential, and what a refused sign-in says back to them.
 *
 * `./LoginPage.tsx` is the only caller. It holds the two boxes, calls
 * `login` and renders whatever comes back out of here, and it makes no
 * decision of its own — for the reason the two-runner split makes
 * structural: the unit runner collects `.ts` files under `src` in a
 * node environment, so a decision living in a `.tsx` is reachable by
 * no test in this package at all.
 *
 * ## The service's refusal is never quoted
 *
 * Every sentence here is a CONSTANT picked by {@link ApiError.code},
 * and nothing is read out of the error beside that code. An
 * `ApiError`'s `message` is the service's own text where the service
 * wrote one, and this app cannot bound what a deployment puts there —
 * a proxy's page, a stack frame, or the submitted user name echoed
 * back into the DOM of the screen that just sent it.
 *
 * `details` is left unread for the same reason, and so is `status`:
 * a status in a refusal sentence tells an operator who cannot read it
 * nothing, and the code already carries every distinction the four
 * sentences below draw.
 *
 * ## `UNAUTHORIZED` says one thing, whichever half was wrong
 *
 * {@link REFUSED_SENTENCE} is a single sentence that names neither
 * box, and that is a security property rather than a style: a form
 * answering "no such user" for one input and "wrong password" for
 * another is a user-name oracle, and anyone who can reach the login
 * screen can enumerate the deployment's operators with it. The
 * service already refuses both halves with one `401`; splitting that
 * answer back apart here would invent a distinction it deliberately
 * did not make.
 *
 * {@link describeLoginFailure} is therefore not handed the credential
 * at all. The property is structural rather than a rule to remember:
 * with no user name and no password in scope, no sentence it returns
 * can name one.
 *
 * ## The local refusals DO name the box
 *
 * {@link readCredential} runs before any request, and what it reports
 * is a fact about the screen the operator is looking at — a box they
 * left empty — rather than anything this deployment holds. Naming the
 * empty one is the whole use of the sentence, and it is no oracle:
 * the answer is the same on every deployment and for every user name,
 * including one that exists nowhere.
 *
 * ## Emptiness is read differently on the two boxes
 *
 * A user name is trimmed before it is measured, because whitespace is
 * not a user name anywhere and a box holding a stray space reads as
 * empty to the person looking at it. A password is NOT: a password
 * made of spaces is a password, and refusing it here would lock out a
 * credential the service would have accepted.
 *
 * Neither value is trimmed for what gets SENT. Only the service knows
 * whether the credential it stored carries surrounding space, so the
 * bytes that travel are the bytes that were typed — `login` rebuilds
 * the body from these two members, and {@link readCredential} hands
 * back a fresh object of exactly those two so nothing else a caller
 * attached can ride along.
 */

import type { Credential } from '../../data/http/auth';

import { NETWORK } from '../../data/http/client';
import { ApiError, RATE_LIMITED, UNAUTHORIZED } from '../../data/http/envelope';

/** What a sign-in with both boxes empty says. */
export const BOTH_REQUIRED_SENTENCE = 'Type a user name and a password '
  + 'to sign in.';

/** What a sign-in with only the user name empty says. */
export const USER_REQUIRED_SENTENCE = 'Type the user name this deployment '
  + 'issued you to sign in.';

/** What a sign-in with only the password empty says. */
export const PASSWORD_REQUIRED_SENTENCE = 'Type the password for that user '
  + 'name to sign in.';

/**
 * What a refused credential says — one sentence, naming neither box.
 *
 * See the header: the two halves are deliberately indistinguishable
 * from out here, and the service answers both with the same `401`.
 */
export const REFUSED_SENTENCE = 'That user name and password were not '
  + 'accepted.';

/** What a sign-in past the login limiter's budget says. */
export const RATE_LIMITED_SENTENCE = 'Too many sign-in attempts have come '
  + 'from here; wait a minute and try again.';

/** What a sign-in that never reached the service says. */
export const UNREACHABLE_SENTENCE = 'This deployment could not be reached, '
  + 'so nothing was signed in.';

/**
 * What every other failure says.
 *
 * Reached by a `BAD_ENVELOPE` (a `2xx` body that is not a session), by
 * a `5xx`, and by anything thrown that is not an {@link ApiError} at
 * all. None of the three is an operator's to fix and none of them is
 * worth three sentences, so they share one that says what is known —
 * the sign-in did not happen — and names who can act on it.
 */
export const UNREADABLE_SENTENCE = 'The sign-in failed for a reason this '
  + 'app could not read; try again, and tell whoever runs this deployment '
  + 'if it keeps failing.';

/**
 * The sentence each code a login can fail with answers.
 *
 * Keyed by `string` rather than by a union: {@link ApiError.code} is a
 * `string`, and a service or a client that grows a code this table has
 * not caught up with must fall through to {@link UNREADABLE_SENTENCE}
 * rather than fail to compile in a deployed app.
 */
const FAILURE_SENTENCES: Readonly<Record<string, string>> = {
  [UNAUTHORIZED]: REFUSED_SENTENCE,
  [RATE_LIMITED]: RATE_LIMITED_SENTENCE,
  [NETWORK]: UNREACHABLE_SENTENCE,
};

/**
 * What reading the two boxes produced.
 *
 * Discriminated rather than a credential that may be `undefined`, so
 * the caller cannot submit a refusal by forgetting to check: the
 * credential does not exist on the refusing branch.
 */
export type CredentialReading =
  | { readonly ok: true; readonly credential: Credential }
  | { readonly ok: false; readonly refusal: string };

/**
 * Read what was typed as a credential worth a request.
 *
 * Answers a result rather than throwing: an empty box is the state a
 * login form mounts in, not an exceptional one.
 *
 * @param typed - The two boxes, exactly as they stand.
 * @returns The credential to send, or the one sentence explaining why
 * no request was made.
 */
export function readCredential(typed: Credential): CredentialReading {
  const { user, password } = typed;

  // Trimmed on the user name only. The header measures why, and why
  // neither value is trimmed for what travels.
  const hasUser = user.trim() !== '';
  const hasPassword = password !== '';

  if (!hasUser && !hasPassword) {
    return { ok: false, refusal: BOTH_REQUIRED_SENTENCE };
  }

  if (!hasUser) {
    return { ok: false, refusal: USER_REQUIRED_SENTENCE };
  }

  if (!hasPassword) {
    return { ok: false, refusal: PASSWORD_REQUIRED_SENTENCE };
  }

  // Rebuilt rather than passed through, so the object handed to
  // `login` carries these two members and nothing else.
  return { ok: true, credential: { user, password } };
}

/**
 * The one sentence a failed sign-in shows.
 *
 * Takes the thrown value rather than a code, because a rejection is
 * not guaranteed to be an {@link ApiError} — a transport that throws
 * before the client wraps it arrives here as whatever it was — and a
 * caller narrowing that itself would be the second place this rule
 * lives.
 *
 * Nothing but `code` is read off the error. The header states what
 * `message` and `details` would otherwise put on screen.
 *
 * @param error - Whatever `login` rejected with.
 * @returns One sentence, naming neither box for a refused credential.
 */
export function describeLoginFailure(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return UNREADABLE_SENTENCE;
  }

  return FAILURE_SENTENCES[error.code] ?? UNREADABLE_SENTENCE;
}
