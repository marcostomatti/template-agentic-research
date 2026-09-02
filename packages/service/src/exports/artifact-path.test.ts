/**
 * Cases for `./artifact-path.ts`: the one rule every artifact path
 * obeys, driven refusal-first.
 *
 * THE REFUSALS COME BEFORE THE ACCEPTANCES, and the ordering is the
 * point rather than a filing convention. What this module is FOR is
 * the shapes it refuses; a suite that opened with a composed path and
 * closed with a traversal would read as a builder that happens to
 * have a guard, where it is a guard that happens to have a builder.
 *
 * EVERY REFUSAL IS DRIVEN, and {@link DROVE} is what says so. A closed
 * roster of reasons is as green as no roster at all once a reason
 * nothing reaches joins it, so each helper below records the reason it
 * got and the last case holds the recorded SET against
 * `ARTIFACT_PATH_REFUSALS` in both directions. That case fails NAMING
 * the reason nothing reached, which a count cannot do.
 *
 * The set is accumulated rather than declared a second time because
 * the claim is about what the cases DID, not about what a reader
 * believes they do — and vitest runs describe blocks in declaration
 * order, so the guard at the foot reads a full accumulator.
 *
 * ONE FIXTURE CARRIES A CHARACTER THAT CANNOT BE WRITTEN DOWN. The NUL
 * is assembled from its code point rather than typed: a raw control
 * byte in a tracked file makes `git diff` render the file as binary
 * and makes POSIX grep report no match for text that is right there,
 * both silently, and `bun run gate:control-bytes` is the floor that
 * refuses one.
 */
import { describe, expect, it } from 'vitest';

import {
  ARTIFACT_PATH_REFUSALS,
  buildArtifactPath,
  checkArtifactPath,
} from './artifact-path.js';

/** The NUL, built from its code point. See the header. */
const NUL = String.fromCharCode(0);

/**
 * Every reason a case below actually drove.
 *
 * A `Set` rather than a list, so a reason driven twice counts once
 * and the comparison at the foot is a membership question.
 */
const DROVE = new Set<string>();

/**
 * A reason no check answers, assembled from parts so that a reason
 * genuinely spelt this way would still appear nowhere in this file.
 *
 * Asserted outside the roster in the same case the roster is compared
 * in: a set equality holds just as well against a roster that has
 * stopped discriminating, and only a member known to be outside it
 * says otherwise.
 */
const ABSENT_REASON = ['too', '_', 'deep'].join('');

/**
 * The reason `checkArtifactPath` refused `path`, recorded on the way
 * past, or the accepted path when it did not refuse.
 *
 * Answering the accepted path rather than null is what lets an
 * accepting case read the checked string instead of asserting against
 * its own copy of the input.
 *
 * @param path - The path to check.
 * @returns The reason, or the accepted path.
 */
function checkOne(path: string): string {
  const result = checkArtifactPath(path);

  if (result.ok) {
    return result.path;
  }

  DROVE.add(result.reason);

  return result.reason;
}

/**
 * The same over the builder, so a builder case reads one line.
 *
 * @param folders - The directories, outermost first.
 * @param name - The filename, without its extension.
 * @param extension - The extension, without a leading dot.
 * @returns The reason, or the composed path.
 */
function buildOne(
  folders: readonly string[],
  name: string,
  extension: string,
): string {
  const result = buildArtifactPath({ folders, name, extension });

  if (result.ok) {
    return result.path;
  }

  DROVE.add(result.reason);

  return result.reason;
}

// ---------------------------------------------------------------------------
// The refusals, which are what this module is for
// ---------------------------------------------------------------------------

describe('a path that would name something outside the destination', () => {
  it('refuses a segment that climbs out of it', () => {
    expect(checkOne('rainfall/../../etc/passwd')).toBe('traversal_segment');
  });

  it('refuses a bare climb with nothing around it', () => {
    expect(checkOne('..')).toBe('traversal_segment');
  });

  it('refuses a path that opens at a root', () => {
    expect(checkOne('/etc/passwd')).toBe('leading_separator');
  });

  it('refuses a volume prefix, absolute with no separator', () => {
    // The reason a drive letter is its own check rather than a case
    // of the one above: nothing here starts with a separator.
    expect(checkOne('C:rainfall/digest.md')).toBe('drive_letter');
    expect(checkOne('c:/rainfall/digest.md')).toBe('drive_letter');
  });

  it('refuses the other separator rather than translating it', () => {
    expect(checkOne('rainfall\\digest.md')).toBe('backslash');
  });

  it('refuses a climb spelt with the other separator', () => {
    // What the ordering buys. This is ONE segment to the traversal
    // check, so a backslash reaching it would pass untouched.
    expect(checkOne('rainfall\\..\\..\\etc')).toBe('backslash');
  });

  it('refuses a control character before it splits anything', () => {
    // The tail after a NUL is invisible to the filesystem and present
    // in the value, so this is refused ahead of every shape check.
    expect(checkOne('rainfall/digest.md' + NUL + '/../etc')).toBe(
      'control_character',
    );
  });

  it('refuses a path with nothing in it at all', () => {
    expect(checkOne('')).toBe('empty');
  });

  it('refuses a doubled or trailing separator', () => {
    // Both leave a segment naming nothing, so neither names a file.
    expect(checkOne('rainfall//digest.md')).toBe('empty');
    expect(checkOne('rainfall/digest.md/')).toBe('empty');
  });
});

describe('a name the reduction answers nothing for', () => {
  it('refuses a filename whose whole content reduces away', () => {
    // Every character is outside the slug alphabet, so the reduction
    // collapses the lot and leaves nothing. Composing anyway would
    // answer `.md` — a hidden file naming no digest.
    expect(buildOne(['rainfall-bulletin'], '---  ---', 'md')).toBe('empty');
  });

  it('refuses a filename written in no ASCII letters', () => {
    // The slugger says this about itself: a name in a script with no
    // ASCII letters in it reduces to nothing at all.
    expect(buildOne([], '\u964d\u96e8\u91cf', 'md')).toBe('empty');
  });

  it('refuses a folder that reduces away rather than dropping it', () => {
    // Dropping it would move the file up one level from where the
    // caller said, silently.
    expect(buildOne(['???'], 'digest', 'md')).toBe('empty');
  });

  it('refuses an extension that is nothing but spaces', () => {
    expect(buildOne([], 'digest', '   ')).toBe('empty');
  });
});

// ---------------------------------------------------------------------------
// The acceptances
// ---------------------------------------------------------------------------

describe('a path the rule accepts', () => {
  it('keeps a name that merely carries two dots', () => {
    // The hazard is the whole SEGMENT, never the characters, so an
    // ordinary name holding a pair of dots is not a traversal.
    const dotted = 'rainfall/..sums/q..b.md';

    expect(checkOne(dotted)).toBe(dotted);
  });

  it('keeps a single dot segment and a dotted stem', () => {
    expect(checkOne('./digest.md')).toBe('./digest.md');
  });

  it('hands back the string it checked and not a copy', () => {
    const path = 'rainfall-bulletin/11.md';
    const result = checkArtifactPath(path);

    expect(result.ok).toBe(true);
    expect(result.ok && result.path).toBe(path);
  });

  it('says nothing about a path when it refuses one', () => {
    const result = checkArtifactPath('/etc/passwd');

    // The refusal carries no path key at all, so a caller that forgot
    // to narrow reads `undefined` rather than the unchecked string.
    expect(result.ok).toBe(false);
    expect(Object.keys(result).sort()).toStrictEqual(['ok', 'reason']);
  });
});

describe('the builder composing a path', () => {
  it('joins the folders, the slug and the extension', () => {
    expect(buildOne(['rainfall-bulletin'], 'digest', 'md')).toBe(
      'rainfall-bulletin/digest.md',
    );
  });

  it('reduces every name it is given rather than the caller', () => {
    // Uppercase, spaces and punctuation all collapse, which is the
    // whole reason a title may be handed straight in.
    expect(buildOne(['Rainfall Bulletin'], 'Week 34: Gauges!', 'md')).toBe(
      'rainfall-bulletin/week-34-gauges.md',
    );
  });

  it('puts the file at the destination when no folder is named', () => {
    expect(buildOne([], 'feed', 'xml')).toBe('feed.xml');
  });

  it('nests folders outermost first, in the order given', () => {
    expect(buildOne(['rainfall', '2026-08'], 'digest', 'md')).toBe(
      'rainfall/2026-08/digest.md',
    );
  });
});

// ---------------------------------------------------------------------------
// The guards: what a later edit has to keep true
// ---------------------------------------------------------------------------

describe('what the builder can and cannot answer', () => {
  it('never answers a path its own checker would refuse', () => {
    // The claim the header makes about the composition: the builder
    // ends by checking what it composed, so no argument reaches an
    // accepted path the rule refuses. The hostile members here are a
    // traversal, a root, a volume prefix and both separators.
    const hostile = [
      '..',
      '/etc/passwd',
      'C:',
      'a\\b',
      'a/b',
      NUL,
      '',
    ];

    for (const value of hostile) {
      const built = buildArtifactPath({
        folders: [value],
        name: value,
        extension: 'md',
      });

      if (built.ok) {
        expect(checkArtifactPath(built.path).ok).toBe(true);
      } else {
        expect([...ARTIFACT_PATH_REFUSALS]).toContain(built.reason);
      }
    }

    // Anti-vacuity: a loop over an emptied list asserts nothing.
    expect(hostile).toHaveLength(7);
  });

  it('leaves an extension it was handed alone but still checked', () => {
    // The extension is a renderer literal rather than stored text, so
    // it is not reduced — and the final check is what stops that from
    // being a hole.
    expect(buildOne([], 'digest', 'md')).toBe('digest.md');
    expect(buildOne([], 'digest', 'md\\evil')).toBe('backslash');
  });
});

describe('the roster of reasons', () => {
  it('is reached in full by the cases above', () => {
    const driven = [...DROVE].sort();
    const declared = [...ARTIFACT_PATH_REFUSALS].sort();

    // Both directions. A reason nothing drives is a rule no case
    // reports, and a reason driven that the roster does not name is a
    // token a stored log line could not be read against.
    expect(driven).toStrictEqual(declared);
  });

  it('does not name a reason no check answers', () => {
    const declared: readonly string[] = ARTIFACT_PATH_REFUSALS;

    // The control beside the equality above: a roster that had
    // stopped discriminating satisfies a set comparison exactly as a
    // live one does.
    expect(declared).not.toContain(ABSENT_REASON);
    expect(declared.length).toBeGreaterThan(0);
  });
});
