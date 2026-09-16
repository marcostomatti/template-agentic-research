import { describe, expect, it } from 'vitest';

import { LOGIN_PATH, loginPathFor, safeReturnPath } from './returnPath';

// Refusals run before the accepted cases, in both blocks. The order is
// the point of the module rather than a convention: a guard that simply
// returned its input would pass every accepted case here, so the cases
// that can distinguish it from no guard at all come first.

/** What a refused candidate is replaced by. */
const FALLBACK_PATH = '/';

/** A real deep location, the shape a mid-session redirect carries. */
const DEEP_PATH = '/d/example-tech-radar/sources/src-1/failures';

/**
 * Control characters URL parsing STRIPS rather than rejects.
 *
 * Built from code points instead of written as escapes: a literal control
 * byte in a source file is invisible in a diff, and an escape spelled
 * into a tool call can reach disk decoded. `bun x` over this file would
 * see the difference; a reader would not.
 */
const TAB = String.fromCharCode(9);
const NEWLINE = String.fromCharCode(10);
const CARRIAGE_RETURN = String.fromCharCode(13);

describe('safeReturnPath', () => {
  it('refuses an absolute http URL', () => {
    // Arrange / Act
    const path = safeReturnPath('https://evil.example/steal');

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses an absolute URL on the app own scheme spelling', () => {
    // Arrange / Act
    const path = safeReturnPath('http://evil.example/');

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses a protocol-relative host', () => {
    // Arrange / Act
    const path = safeReturnPath('//evil.example/digest');

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses a backslash pair a browser folds into a host', () => {
    // Arrange / Act
    const path = safeReturnPath('/\\evil.example/digest');

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses a leading double backslash', () => {
    // Arrange / Act
    const path = safeReturnPath('\\\\evil.example/digest');

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses a backslash anywhere below the root', () => {
    // Arrange / Act
    const path = safeReturnPath('/digest\\..\\..\\evil');

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses a javascript: URL', () => {
    // Arrange / Act
    const path = safeReturnPath('javascript:alert(1)');

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses a javascript: URL hidden behind leading whitespace', () => {
    // Arrange / Act
    const path = safeReturnPath(' javascript:alert(1)');

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses a scheme broken up by a stripped control character', () => {
    // Arrange / Act
    const path = safeReturnPath(`java${NEWLINE}script:alert(1)`);

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses a root-relative path carrying a tab', () => {
    // Arrange / Act
    const path = safeReturnPath(`/dig${TAB}est`);

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses a root-relative path carrying a carriage return', () => {
    // Arrange / Act
    const path = safeReturnPath(`/digest${CARRIAGE_RETURN}`);

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses dot segments that resolve to a protocol-relative path', () => {
    // A same-origin resolution, and still refused: the resolved pathname
    // is `//evil.example`, which is a host the moment it is a string
    // again. Returning the input verbatim is what makes that possible.
    // Arrange / Act
    const path = safeReturnPath('/..//evil.example');

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses the login path itself', () => {
    // Arrange / Act
    const path = safeReturnPath(LOGIN_PATH);

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses a path under the login route', () => {
    // Arrange / Act
    const path = safeReturnPath('/login/recover?token=abc');

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses the login path in another case', () => {
    // Arrange / Act
    const path = safeReturnPath('/LogIn');

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses a path that is not root-relative', () => {
    // Arrange / Act
    const path = safeReturnPath('digest');

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses an empty value', () => {
    // Arrange / Act
    const path = safeReturnPath('');

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses an absent value', () => {
    // `URLSearchParams.get` answers null for a parameter nobody wrote.
    // Arrange / Act
    const path = safeReturnPath(null);

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('refuses an undefined value', () => {
    // Arrange / Act
    const path = safeReturnPath(undefined);

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('accepts a root-relative surface path', () => {
    // Arrange / Act
    const path = safeReturnPath('/digest');

    // Assert
    expect(path).toBe('/digest');
  });

  it('accepts a deep domain-scoped path', () => {
    // Arrange / Act
    const path = safeReturnPath(DEEP_PATH);

    // Assert
    expect(path).toBe(DEEP_PATH);
  });

  it('accepts a path carrying a query string and a fragment', () => {
    // Arrange / Act
    const path = safeReturnPath('/sources?verdict=adopt&q=vector#row-3');

    // Assert
    expect(path).toBe('/sources?verdict=adopt&q=vector#row-3');
  });

  it('accepts the root itself, unchanged', () => {
    // The fallback and an accepted value are the same string here, which
    // is why the refusal cases above carry the weight.
    // Arrange / Act
    const path = safeReturnPath(FALLBACK_PATH);

    // Assert
    expect(path).toBe(FALLBACK_PATH);
  });

  it('accepts a path that merely starts with the login segment', () => {
    // `/logins` is not under `/login`, and a prefix test without the
    // separator would refuse it.
    // Arrange / Act
    const path = safeReturnPath('/logins/42');

    // Assert
    expect(path).toBe('/logins/42');
  });

  it('accepts a path whose percent escapes survived decoding', () => {
    // What `URLSearchParams.get` hands back for a doubly encoded slash:
    // a literal `%2F`, which is one path segment rather than two.
    // Arrange / Act
    const path = safeReturnPath('/lexicon/a%2Fb/edit');

    // Assert
    expect(path).toBe('/lexicon/a%2Fb/edit');
  });
});

describe('loginPathFor', () => {
  it('writes no return path for a location under /login', () => {
    // Arrange / Act
    const path = loginPathFor('/login', '?next=%2Fdigest');

    // Assert
    expect(path).toBe(LOGIN_PATH);
  });

  it('writes no return path for a hostile location', () => {
    // Nothing constructs one today; the guard holds on both sides so that
    // stays true rather than being assumed.
    // Arrange / Act
    const path = loginPathFor('//evil.example', '');

    // Assert
    expect(path).toBe(LOGIN_PATH);
  });

  it('writes no return path for the root', () => {
    // Arrange / Act
    const path = loginPathFor('/', '');

    // Assert
    expect(path).toBe(LOGIN_PATH);
  });

  it('carries a surface path as the next parameter', () => {
    // Arrange / Act
    const path = loginPathFor('/digest', '');

    // Assert
    expect(path).toBe('/login?next=%2Fdigest');
  });

  it('encodes the query string of the location it came from', () => {
    // Arrange / Act
    const path = loginPathFor('/sources', '?verdict=adopt&q=vector');

    // Assert
    expect(path).toBe('/login?next=%2Fsources%3Fverdict%3Dadopt%26q%3Dvector');
  });

  it('round-trips a deep location back through safeReturnPath', () => {
    // Arrange
    const path = loginPathFor(DEEP_PATH, '?tab=recent');

    // Act
    const returned = safeReturnPath(
      new URLSearchParams(path.split('?')[1]).get('next'),
    );

    // Assert
    expect(returned).toBe(`${DEEP_PATH}?tab=recent`);
  });
});
