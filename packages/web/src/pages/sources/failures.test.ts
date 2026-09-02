import type { Document } from '../../data/types';

import { describe, expect, it } from 'vitest';

import { listDocuments } from '../../data/digest';
import { DEFAULT_DOMAIN_SLUG, getDomain } from '../../data/domains';

import {
  FAILURE_RULINGS,
  NO_ADDRESS_TITLE,
  describeFailureRuling,
  failureActionName,
  failureCountLabel,
  failureReason,
  failureTitle,
  readFailureRuling,
  ruleOnFailure,
} from './failures';

/**
 * The reserved prefix, spelled here rather than imported.
 *
 * `./failures.ts` keeps it private on purpose — the mark is an
 * internal of that module and nothing outside it may write one — so
 * the cases that have to build a marked string by hand restate it.
 * The pair is held together by the round-trip cases below: a prefix
 * that drifted would leave every hand-built mark reading as an
 * ordinary stored error, which those cases report by name.
 */
const MARK_PREFIX = 'ar:failure-ruling=';

/** A capture carrying only what a case names. */
function documentWith(overrides: Partial<Document>): Document {
  return {
    id: 1,
    domainId: 1,
    sourceId: 3,
    hash: 'hash-1',
    url: 'https://example.org/feeds/one',
    body: 'Extracted text.',
    capturedAt: '2026-06-07T21:10:00.000Z',
    parseStatus: 'failed',
    parseError: 'Response body ended mid-record.',
    ...overrides,
  };
}

/**
 * The seeded domain's failed captures, straight off the fixture.
 *
 * The vacuity guard the cases about stored errors rest on: a module
 * that strips a mark off text nothing ever carries would pass every
 * hand-built case in this file and have no subject in the running
 * app.
 *
 * @returns Them, in whatever order the fixture holds.
 */
function seededFailures(): readonly Document[] {
  return listDocuments(getDomain(DEFAULT_DOMAIN_SLUG).id).filter(
    (document) => document.parseStatus === 'failed',
  );
}

describe('the fixture the list is drawn from', () => {
  it('seeds failed captures carrying an error to read', () => {
    // Nothing below has a subject in the running app without this:
    // the reason line, the mark that goes in front of it and the
    // round trip that has to preserve it are all about stored text.
    // Arrange / Act
    const failures = seededFailures();

    // Assert
    expect(failures.length).toBeGreaterThan(1);
    expect(failures.filter((row) => row.parseError === null)).toEqual([]);
  });

  it('seeds no capture already wearing a mark', () => {
    // The mark is this shell's and lives for the life of a tab, so a
    // fixture carrying one would mean a demo opening on rulings
    // nobody made.
    // Arrange / Act
    const marked = seededFailures().filter(
      (row) => readFailureRuling(row) !== undefined,
    );

    // Assert
    expect(marked).toEqual([]);
  });
});

describe('readFailureRuling', () => {
  it('answers nothing for a capture nobody has worked through', () => {
    // The state the list opens in, and the one every row is in until
    // an operator rules on it.
    // Arrange / Act / Assert
    expect(readFailureRuling(documentWith({}))).toBeUndefined();
  });

  it('answers nothing where the store held no error at all', () => {
    // `parse_error` is nullable and a failed capture is free to carry
    // no text, so the reader has to reach the null branch before it
    // reaches a prefix check.
    // Arrange / Act / Assert
    expect(readFailureRuling(documentWith({ parseError: null })))
      .toBeUndefined();
  });

  it('answers nothing for a reserved line it has no answer for', () => {
    // The near miss: the namespace is right and the word is not one
    // this module writes, so it is nothing this module wrote.
    // Arrange
    const document = documentWith({
      parseError: `${MARK_PREFIX}shred\nResponse body ended mid-record.`,
    });

    // Act / Assert
    expect(readFailureRuling(document)).toBeUndefined();
  });

  it('answers nothing for an error that merely mentions the token', () => {
    // The mark is a PREFIX. An error quoting it mid-line is a stored
    // error, and reading it as a ruling would let a parser rule on
    // its own failure.
    // Arrange
    const document = documentWith({
      parseError: `Item 3 held the literal ${MARK_PREFIX}keep`,
    });

    // Act / Assert
    expect(readFailureRuling(document)).toBeUndefined();
  });

  it('answers nothing for an error whose tail spells a ruling', () => {
    // The prefix guard doing work the membership check below it
    // cannot, which is the one claim a grid says is missing without
    // this case. A reader that trusted the membership check alone
    // would slice the prefix LENGTH off any stored error and ask what
    // was left, so a message whose remainder happens to read `keep`
    // would be a ruling nobody made.
    // Arrange
    const text = `${'x'.repeat(MARK_PREFIX.length)}keep`;
    const document = documentWith({ parseError: text });

    // Act / Assert
    expect(readFailureRuling(document)).toBeUndefined();
    expect(failureReason(document)).toBe(text);
  });

  it('reads back every ruling this module records', () => {
    // Over the union rather than over a literal pair, so an answer
    // added upstream is covered here with nothing edited.
    // Arrange
    const stored = documentWith({});

    // Act
    const round = FAILURE_RULINGS.map((ruling) => ({
      ruling,
      read: readFailureRuling(ruleOnFailure(stored, ruling)),
    }));

    // Assert
    expect(round).toEqual(
      FAILURE_RULINGS.map((ruling) => ({ ruling, read: ruling })),
    );
  });
});

describe('failureReason', () => {
  it('answers null where the store held no error', () => {
    // Arrange / Act / Assert
    expect(failureReason(documentWith({ parseError: null }))).toBeNull();
  });

  it('answers an unruled error whole', () => {
    // Arrange
    const text = 'Contract field published_at missing from 1 of 4 items.';

    // Act / Assert
    expect(failureReason(documentWith({ parseError: text }))).toBe(text);
  });

  it('reports an unrecognised reserved line whole', () => {
    // The other half of the near-miss claim above: a line this module
    // did not write is not text it may edit, so nothing is stripped
    // and the operator sees exactly what was stored.
    // Arrange
    const text = `${MARK_PREFIX}shred\nResponse body ended mid-record.`;

    // Act / Assert
    expect(failureReason(documentWith({ parseError: text }))).toBe(text);
  });

  it('takes the mark off a ruled capture', () => {
    // The reading the list exists for, surviving the ruling made on
    // it — an operator who just kept a capture can still see what was
    // wrong with it.
    // Arrange
    const text = 'Response body ended mid-record after 12 of 30 items.';
    const ruled = ruleOnFailure(documentWith({ parseError: text }), 'keep');

    // Act / Assert
    expect(failureReason(ruled)).toBe(text);
  });

  it('keeps an error that carries newlines of its own', () => {
    // Only the FIRST break separates the mark from the reason, which
    // is what lets a multi-line parser message round trip. A reader
    // splitting on every break would answer the first line alone and
    // silently drop the rest.
    // Arrange
    const text = 'Item 3: published_at missing.\nItem 7: body empty.';
    const ruled = ruleOnFailure(
      documentWith({ parseError: text }),
      'discard',
    );

    // Act / Assert
    expect(failureReason(ruled)).toBe(text);
  });

  it('answers null for a ruled capture that had no error', () => {
    // The mark alone, with nothing behind it: the ruling reads back
    // and the reason stays absent rather than becoming the empty
    // string, which a row would draw as a blank line.
    // Arrange
    const ruled = ruleOnFailure(
      documentWith({ parseError: null }),
      'keep',
    );

    // Act / Assert
    expect(readFailureRuling(ruled)).toBe('keep');
    expect(failureReason(ruled)).toBeNull();
  });
});

describe('ruleOnFailure', () => {
  it('leaves the member the queue reads exactly where it was', () => {
    // `../../data/api.ts` filters this list on `parseStatus`, and the
    // header says why a ruling may not move it: the parse really did
    // fail. This is the case that says the queue does not shorten
    // because the ruling declines to lie, rather than by accident.
    // Arrange
    const stored = documentWith({});

    // Act
    const ruled = ruleOnFailure(stored, 'discard');

    // Assert
    expect(ruled.parseStatus).toBe('failed');
    expect(ruled.parseStatus).toBe(stored.parseStatus);
  });

  it('moves nothing but the marked column', () => {
    // Every other member carried through, checked by difference
    // rather than by listing them: a member added to `Document` joins
    // this claim with nothing edited here.
    // Arrange
    const stored = documentWith({});

    // Act
    const ruled = ruleOnFailure(stored, 'keep');
    const moved = Object.keys(stored).filter((member) => {
      const before = Object.entries(stored).find(([key]) => key === member);
      const after = Object.entries(ruled).find(([key]) => key === member);

      return before?.[1] !== after?.[1];
    });

    // Assert
    expect(Object.keys(stored).length).toBeGreaterThan(1);
    expect(moved).toEqual(['parseError']);
  });

  it('leaves the row it was handed untouched', () => {
    // The fixture arrays are frozen and the store applies drafts over
    // copies, so a transition editing its argument would be reported
    // a long way from here if at all.
    // Arrange
    const stored = documentWith({});
    const before = stored.parseError;

    // Act
    ruleOnFailure(stored, 'discard');

    // Assert
    expect(stored.parseError).toBe(before);
  });

  it('replaces a ruling rather than stacking one on it', () => {
    // What makes a mis-click recoverable with the control that made
    // it. A writer that prepended a second mark would leave the first
    // one inside the reason, where the reader would report it as part
    // of the parser message.
    // Arrange
    const text = 'Response body ended mid-record.';
    const kept = ruleOnFailure(documentWith({ parseError: text }), 'keep');

    // Act
    const discarded = ruleOnFailure(kept, 'discard');

    // Assert
    expect(readFailureRuling(discarded)).toBe('discard');
    expect(failureReason(discarded)).toBe(text);
  });

  it('records a ruling the fixture rows can carry', () => {
    // Driven over the seeded failures rather than a hand-built row,
    // which is what says the transition works on what the list
    // actually shows.
    // Arrange
    const failures = seededFailures();

    // Act
    const round = failures.map((row) => ({
      reason: failureReason(ruleOnFailure(row, 'keep')),
      stored: row.parseError,
    }));

    // Assert
    expect(round).toEqual(
      failures.map((row) => ({
        reason: row.parseError,
        stored: row.parseError,
      })),
    );
  });
});

describe('describeFailureRuling', () => {
  it('has words for every ruling', () => {
    // Total over the union rather than over the two the list draws:
    // a member added to the answer set is a `check-types` error in
    // the table, and this is what says the table is reached.
    // Arrange / Act
    const blank = FAILURE_RULINGS.filter((ruling) => {
      const reading = describeFailureRuling(ruling);

      return reading.action === ''
        || reading.ruled === ''
        || reading.sentence === '';
    });

    // Assert
    expect(FAILURE_RULINGS.length).toBeGreaterThan(1);
    expect(blank).toEqual([]);
  });

  it('gives no two rulings the same words', () => {
    // Two controls reading the same is a screen offering one answer
    // twice, which every other assertion here would pass through.
    // Arrange / Act
    const actions = FAILURE_RULINGS.map(
      (ruling) => describeFailureRuling(ruling).action,
    );
    const ruled = FAILURE_RULINGS.map(
      (ruling) => describeFailureRuling(ruling).ruled,
    );

    // Assert
    expect(new Set(actions).size).toBe(FAILURE_RULINGS.length);
    expect(new Set(ruled).size).toBe(FAILURE_RULINGS.length);
  });
});

describe('failureTitle', () => {
  it('names a capture with no address of its own', () => {
    // `documents.url` is NULL where there is no such place, and the
    // fallback is a sentence rather than the empty string: a control
    // named `Keep ` is a control that says nothing.
    // Arrange / Act / Assert
    expect(failureTitle(documentWith({ url: null }))).toBe(NO_ADDRESS_TITLE);
  });

  it('names a capture by where it can be read', () => {
    // Arrange
    const url = 'https://example.org/feeds/infrastructure/2026-06-07';

    // Act / Assert
    expect(failureTitle(documentWith({ url }))).toBe(url);
  });
});

describe('failureCountLabel', () => {
  it('states a count alone while nothing has been ruled', () => {
    // The state a list opens in. `0 ruled` would be a figure about
    // work not done, which is noise on a screen whose whole point is
    // the work.
    // Arrange / Act / Assert
    expect(failureCountLabel(3, 0)).toBe('3 failed captures');
  });

  it('says how many carry a ruling once any does', () => {
    // The only progress reading this surface has, because the queue
    // does not shorten — see `./failures.ts`.
    // Arrange / Act / Assert
    expect(failureCountLabel(3, 1)).toBe('3 failed captures, 1 ruled');
  });

  it('counts one capture in the singular', () => {
    // Arrange / Act / Assert
    expect(failureCountLabel(1, 0)).toBe('1 failed capture');
    expect(failureCountLabel(1, 1)).toBe('1 failed capture, 1 ruled');
  });
});

describe('failureActionName', () => {
  it('leads with the label the button shows', () => {
    // The accessible name has to contain the visible one, and this is
    // the claim that says it does BY CONSTRUCTION: both come off
    // `describeFailureRuling`, so a control renamed in one place
    // cannot leave the other spelling the old word.
    // Arrange
    const title = failureTitle(documentWith({}));

    // Act
    const led = FAILURE_RULINGS.filter((ruling) => failureActionName(
      ruling,
      title,
    ).startsWith(describeFailureRuling(ruling).action));

    // Assert
    expect(led).toEqual([...FAILURE_RULINGS]);
  });

  it('names the capture it acts on', () => {
    // Arrange
    const title = failureTitle(documentWith({}));

    // Act / Assert
    expect(failureActionName('discard', title)).toContain(title);
    expect(failureActionName('keep', title))
      .not.toBe(failureActionName('discard', title));
  });
});
