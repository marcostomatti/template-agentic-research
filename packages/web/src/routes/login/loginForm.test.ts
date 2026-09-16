import { describe, expect, it } from 'vitest';

import { NETWORK } from '../../data/http/client';
import {
  ApiError,
  BAD_ENVELOPE,
  HTTP_ERROR,
  RATE_LIMITED,
  UNAUTHORIZED,
} from '../../data/http/envelope';

import {
  BOTH_REQUIRED_SENTENCE,
  PASSWORD_REQUIRED_SENTENCE,
  RATE_LIMITED_SENTENCE,
  REFUSED_SENTENCE,
  UNREACHABLE_SENTENCE,
  UNREADABLE_SENTENCE,
  USER_REQUIRED_SENTENCE,
  describeLoginFailure,
  readCredential,
} from './loginForm';

// Refusal cases run before the accepted ones on both halves. A reader
// that accepted everything would pass every accepted case and fail
// every refusal, and one that refused everything would do the reverse
// — so neither half alone proves anything, and each is the control for
// the other.

/** A user name with nothing wrong with it. */
const USER = 'operator';

/** A password with nothing wrong with it. */
const PASSWORD = 'correct horse battery staple';

/**
 * A string that appears in NO sentence this module owns.
 *
 * Planted in the places an error carries free text so a leak is a
 * substring search rather than a judgement about wording.
 */
const SENTINEL = 'SNTNL9-leaked-operator-name';

/**
 * An `ApiError` carrying {@link SENTINEL} everywhere it can.
 *
 * @param code - The code the mapping is asked about.
 * @returns The error, with the sentinel in `message` and `details`.
 */
function sentinelError(code: string): ApiError {
  return new ApiError({
    status: 401,
    code,
    message: `Rejected credential for ${SENTINEL}.`,
    details: { user: SENTINEL },
  });
}

describe('readCredential', () => {
  it('refuses both empty boxes with one sentence naming both', () => {
    // Arrange / Act
    const reading = readCredential({ user: '', password: '' });

    // Assert
    expect(reading).toEqual({ ok: false, refusal: BOTH_REQUIRED_SENTENCE });
  });

  it('refuses an empty user name', () => {
    // Arrange / Act
    const reading = readCredential({ user: '', password: PASSWORD });

    // Assert
    expect(reading).toEqual({ ok: false, refusal: USER_REQUIRED_SENTENCE });
  });

  it('refuses a user name that is only whitespace', () => {
    // Arrange / Act
    const reading = readCredential({ user: ' \t ', password: PASSWORD });

    // Assert
    expect(reading).toEqual({ ok: false, refusal: USER_REQUIRED_SENTENCE });
  });

  it('refuses an empty password', () => {
    // Arrange / Act
    const reading = readCredential({ user: USER, password: '' });

    // Assert
    expect(reading).toEqual({ ok: false, refusal: PASSWORD_REQUIRED_SENTENCE });
  });

  it('accepts a filled pair and hands back exactly the two members', () => {
    // Arrange / Act
    const reading = readCredential({ user: USER, password: PASSWORD });

    // Assert
    expect(reading).toEqual({
      ok: true,
      credential: { user: USER, password: PASSWORD },
    });
  });

  it('sends both values verbatim, surrounding space included', () => {
    // Arrange
    const spaced = { user: ' operator ', password: ' pass ' };

    // Act
    const reading = readCredential(spaced);

    // Assert — trimming is how the user name is MEASURED, never what
    // travels: only the service knows what it stored.
    expect(reading).toEqual({ ok: true, credential: spaced });
  });

  it('accepts a password made entirely of spaces', () => {
    // Arrange / Act
    const reading = readCredential({ user: USER, password: '   ' });

    // Assert — the asymmetry with the user name above is deliberate;
    // a password of spaces is a password.
    expect(reading).toEqual({
      ok: true,
      credential: { user: USER, password: '   ' },
    });
  });

  it('carries nothing beyond the two members onto the credential', () => {
    // Arrange — the shape a caller spreading its own state can produce.
    const widened = { user: USER, password: PASSWORD, remember: true };

    // Act
    const reading = readCredential(widened);

    // Assert
    expect(reading.ok).toBe(true);
    expect(reading.ok && Object.keys(reading.credential)).toEqual([
      'user',
      'password',
    ]);
  });
});

describe('describeLoginFailure', () => {
  it('answers one sentence for a refused credential', () => {
    // Arrange / Act
    const sentence = describeLoginFailure(sentinelError(UNAUTHORIZED));

    // Assert
    expect(sentence).toBe(REFUSED_SENTENCE);
  });

  it('answers the limiter sentence past the login budget', () => {
    // Arrange / Act
    const sentence = describeLoginFailure(sentinelError(RATE_LIMITED));

    // Assert
    expect(sentence).toBe(RATE_LIMITED_SENTENCE);
  });

  it('answers the unreachable sentence when no answer arrived', () => {
    // Arrange / Act
    const sentence = describeLoginFailure(sentinelError(NETWORK));

    // Assert
    expect(sentence).toBe(UNREACHABLE_SENTENCE);
  });

  it('falls back for a success body that is not a session', () => {
    // Arrange / Act
    const sentence = describeLoginFailure(sentinelError(BAD_ENVELOPE));

    // Assert
    expect(sentence).toBe(UNREADABLE_SENTENCE);
  });

  it('falls back for a status no error class names', () => {
    // Arrange / Act
    const sentence = describeLoginFailure(sentinelError(HTTP_ERROR));

    // Assert
    expect(sentence).toBe(UNREADABLE_SENTENCE);
  });

  it('falls back for a code this app has never seen', () => {
    // Arrange / Act
    const sentence = describeLoginFailure(sentinelError('TEAPOT_LOCKOUT'));

    // Assert
    expect(sentence).toBe(UNREADABLE_SENTENCE);
  });

  it('falls back for a rejection that is not an ApiError', () => {
    // Arrange / Act
    const sentence = describeLoginFailure(new TypeError(SENTINEL));

    // Assert
    expect(sentence).toBe(UNREADABLE_SENTENCE);
  });

  it('falls back for a rejection that is not an Error at all', () => {
    // Arrange / Act
    const sentence = describeLoginFailure(SENTINEL);

    // Assert
    expect(sentence).toBe(UNREADABLE_SENTENCE);
  });

  it('quotes nothing the error carried, whichever code it carried', () => {
    // Arrange — every code the table knows, plus one it does not.
    const codes = [UNAUTHORIZED, RATE_LIMITED, NETWORK, BAD_ENVELOPE, 'X_NEW'];

    // Act
    const sentences = codes.map((code) => describeLoginFailure(
      sentinelError(code),
    ));

    // Assert — the sentinel sat in `message` AND `details` on each of
    // those errors, so a builder that interpolated either would red
    // this. The count is asserted so a mapping answering nothing
    // cannot pass the loop vacuously.
    expect(sentences).toHaveLength(codes.length);
    expect(sentences.some((sentence) => sentence.includes(SENTINEL)))
      .toBe(false);
  });
});

describe('the refused-credential sentence', () => {
  it('names both boxes or neither, never one', () => {
    // Arrange
    const namesUser = /user/i.test(REFUSED_SENTENCE);
    const namesPassword = /password/i.test(REFUSED_SENTENCE);

    // Assert — the user-name oracle this refuses is exactly a sentence
    // that mentions one half without the other.
    expect(namesUser).toBe(namesPassword);
  });

  it('is a single sentence', () => {
    // Arrange
    const stops = REFUSED_SENTENCE.match(/[.!?]/gu) ?? [];

    // Assert
    expect(stops).toHaveLength(1);
    expect(REFUSED_SENTENCE.endsWith('.')).toBe(true);
  });

  it('is told apart from the local refusals that DO name one box', () => {
    // Assert — the control for the property above. A sentence in this
    // module CAN name one half without the other, and the local
    // user-name refusal is one, so "names both or neither" is a real
    // constraint on the refused-credential sentence rather than a fact
    // about a set where every member mentions everything.
    expect(/user/i.test(USER_REQUIRED_SENTENCE)).toBe(true);
    expect(/password/i.test(USER_REQUIRED_SENTENCE)).toBe(false);
    expect(USER_REQUIRED_SENTENCE).not.toBe(PASSWORD_REQUIRED_SENTENCE);
    expect(REFUSED_SENTENCE).not.toBe(USER_REQUIRED_SENTENCE);
    expect(REFUSED_SENTENCE).not.toBe(PASSWORD_REQUIRED_SENTENCE);
  });
});
