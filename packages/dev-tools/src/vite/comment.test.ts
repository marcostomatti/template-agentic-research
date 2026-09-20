import { describe, expect, it } from 'vitest';

import { parseComment } from './comment';

/**
 * ## What this file drives
 *
 * `./comment.ts` alone: an object in, a comment or a refusal out. The
 * route that calls it is driven by `./endpoint.test.ts`, which is where
 * the status code each refusal answers with is pinned.
 *
 * The refusals run first, then the two accepting cases. Every refusal
 * varies ONE member of a body the last case accepts whole, so a schema
 * that refused everything would fail that case rather than pass these.
 */

/** A body every case below varies away from. */
const COMMENT = Object.freeze({
  issueId: 'AR-123',
  body: 'Also affected: the same modal traps focus on Firefox 148.',
});

describe('the refusals of an also affected body', () => {
  it('refuses a payload that is not an object', () => {
    // Arrange + Act
    const parsed = parseComment('AR-123');

    // Assert: the root, since there is no field to name.
    expect(parsed.ok).toBe(false);
    expect(parsed).toMatchObject({ ok: false, path: '' });
  });

  it('refuses an empty issue id', () => {
    // Arrange + Act
    const parsed = parseComment({ ...COMMENT, issueId: '' });

    // Assert
    expect(parsed).toMatchObject({ ok: false, path: 'issueId' });
  });

  it('refuses an issue id beginning with a dash', () => {
    // Arrange: the refusal the pattern exists for — an argv element
    // opening with a dash is read by a CLI as a flag, not as a value.
    const parsed = parseComment({ ...COMMENT, issueId: '--force' });

    // Assert
    expect(parsed).toMatchObject({ ok: false, path: 'issueId' });
  });

  it('refuses an issue id carrying whitespace', () => {
    // Arrange + Act
    const parsed = parseComment({ ...COMMENT, issueId: 'AR 123' });

    // Assert
    expect(parsed).toMatchObject({ ok: false, path: 'issueId' });
  });

  it('refuses an issue id of 129 characters and accepts one of 128', () => {
    // Arrange + Act: both sides of the boundary, so a cap moved in
    // either direction reds one half.
    const over = parseComment({ ...COMMENT, issueId: 'a'.repeat(129) });
    const at = parseComment({ ...COMMENT, issueId: 'a'.repeat(128) });

    // Assert
    expect(over).toMatchObject({ ok: false, path: 'issueId' });
    expect(at.ok).toBe(true);
  });

  it('refuses an empty comment', () => {
    // Arrange + Act
    const parsed = parseComment({ ...COMMENT, body: '' });

    // Assert
    expect(parsed).toMatchObject({ ok: false, path: 'body' });
  });

  it('refuses a comment of 5,001 characters and accepts one of 5,000', () => {
    // Arrange + Act
    const over = parseComment({ ...COMMENT, body: 'x'.repeat(5_001) });
    const at = parseComment({ ...COMMENT, body: 'x'.repeat(5_000) });

    // Assert
    expect(over).toMatchObject({ ok: false, path: 'body' });
    expect(at.ok).toBe(true);
  });

  it('refuses a missing comment', () => {
    // Arrange + Act
    const parsed = parseComment({ issueId: COMMENT.issueId });

    // Assert
    expect(parsed).toMatchObject({ ok: false, path: 'body' });
  });

  it('names no received value in the reason it refuses with', () => {
    // Arrange: a value a refusal must not echo back to a browser.
    const parsed = parseComment({ ...COMMENT, issueId: '<script>alert(1)' });

    // Act
    const { reason } = parsed as { readonly reason: string };

    // Assert: zod names the expectation, never the input.
    expect(parsed).toMatchObject({ ok: false, path: 'issueId' });
    expect(reason).not.toContain('script');
  });
});

describe('an accepted also affected body', () => {
  it('answers the issue id and the comment markdown', () => {
    // Arrange + Act: the control every refusal above varies away from.
    const parsed = parseComment({ ...COMMENT });

    // Assert
    expect(parsed).toEqual({ ok: true, comment: COMMENT });
  });

  it('strips a key the schema does not name', () => {
    // Arrange: a sender that has not been updated, not an attack — so
    // the extra key is dropped rather than refused, and nothing
    // unvalidated travels onward to the gateway.
    const parsed = parseComment({ ...COMMENT, tracker: 'github' });

    // Assert
    expect(parsed).toEqual({ ok: true, comment: COMMENT });
  });
});
