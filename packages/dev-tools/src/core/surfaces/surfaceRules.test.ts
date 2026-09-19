import { describe, expect, it } from 'vitest';

import {
  DEVTOOLS_STATUS_REASON_MAX,
  describeActionDone,
  describeActionFailure,
  describeActionStart,
  isOutsidePress,
  isPromiseLike,
  readFailureReason,
} from './surfaceRules';

/** U+2026 HORIZONTAL ELLIPSIS, spelled once for every case below. */
const ELLIPSIS = '\u2026';

/**
 * A surface with one child, one grandchild and one node outside it.
 *
 * Built per case rather than shared, so nothing a case appends can
 * reach the next one.
 *
 * @returns The four nodes {@link isOutsidePress} is read against.
 */
function buildTree(): {
  surface: HTMLElement;
  child: HTMLElement;
  text: Text;
  outside: HTMLElement;
} {
  const surface = document.createElement('div');
  const child = document.createElement('button');
  const text = document.createTextNode('inside');
  const outside = document.createElement('main');

  child.append(text);
  surface.append(child);
  document.body.append(surface, outside);

  return { surface, child, text, outside };
}

describe('isPromiseLike', () => {
  // Refusals first: every shape that is not something to wait for,
  // before the two that are.

  it('refuses a value that is not thenable', () => {
    // Arrange
    const values: unknown[] = [
      undefined,
      null,
      0,
      '',
      'then',
      true,
      {},
      [],
      Symbol('then'),
    ];

    // Act
    const answers = values.map((value) => isPromiseLike(value));

    // Assert
    expect(answers).toStrictEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('refuses an object whose then is not callable', () => {
    // Arrange
    const value = { then: 'soon' };

    // Act
    const answer = isPromiseLike(value);

    // Assert
    expect(answer).toBe(false);
  });

  // Accepting cases.

  it('accepts a native promise', () => {
    // Arrange
    const value = Promise.resolve();

    // Act
    const answer = isPromiseLike(value);

    // Assert
    expect(answer).toBe(true);
  });

  it('accepts a bare thenable, which a foreign realm answers with', () => {
    // Arrange
    const value = { then: (): void => undefined };

    // Act
    const answer = isPromiseLike(value);

    // Assert
    expect(answer).toBe(true);
  });
});

describe('readFailureReason', () => {
  // Refusals first: every shape that carries nothing readable, and
  // every shape that could make the reader itself throw.

  it('answers the fallback for a rejection carrying nothing', () => {
    // Arrange
    const reasons: unknown[] = [undefined, null, '', '   '];

    // Act
    const answers = reasons.map((reason) => readFailureReason(reason));

    // Assert
    expect(answers).toStrictEqual([
      'unknown error',
      'unknown error',
      'unknown error',
      'unknown error',
    ]);
  });

  it('answers the fallback rather than [object Object] for an object '
    + 'with nothing to say', () => {
    // Arrange
    const reason = { code: 42 };

    // Act
    const answer = readFailureReason(reason);

    // Assert
    expect(answer).toBe('unknown error');
  });

  it('answers the fallback for a reason whose message getter throws', () => {
    // Arrange
    const reason = {
      get message(): string {
        throw new Error('hostile getter');
      },
    };

    // Act
    const answer = readFailureReason(reason);

    // Assert
    expect(answer).toBe('unknown error');
  });

  it('answers the fallback for an object with no prototype', () => {
    // Arrange
    // No `toString`, so `String(reason)` throws rather than answering.
    const reason: unknown = Object.create(null);

    // Act
    const answer = readFailureReason(reason);

    // Assert
    expect(answer).toBe('unknown error');
  });

  // Accepting cases.

  it('reads the message of a native error', () => {
    // Arrange
    const reason = new TypeError('endpoint refused the report');

    // Act
    const answer = readFailureReason(reason);

    // Assert
    expect(answer).toBe('endpoint refused the report');
  });

  it('falls back to the name of an error with no message', () => {
    // Arrange
    const reason = new TypeError('');

    // Act
    const answer = readFailureReason(reason);

    // Assert
    expect(answer).toBe('TypeError');
  });

  it('reads the name of a cross-realm error carrying no message', () => {
    // Arrange
    // The `name` branch's whole job: `String()` answers the name for a
    // NATIVE error with an empty message, so only a carrier that is
    // not one can reach it.
    const reason = { name: 'AbortError', message: '' };

    // Act
    const answer = readFailureReason(reason);

    // Assert
    expect(answer).toBe('AbortError');
  });

  it('reads a cross-realm error through its message rather than '
    + 'instanceof', () => {
    // Arrange
    // What an `Error` from an iframe or a worker looks like here: the
    // shape is right and `instanceof Error` is false.
    const reason = { name: 'RangeError', message: 'round is not a tag' };

    // Act
    const answer = readFailureReason(reason);

    // Assert
    expect(answer).toBe('round is not a tag');
  });

  it('reads a thrown string as itself', () => {
    // Arrange
    const reason = 'the dev server is not running';

    // Act
    const answer = readFailureReason(reason);

    // Assert
    expect(answer).toBe('the dev server is not running');
  });

  it('reads a thrown primitive through String', () => {
    // Arrange
    const reasons: unknown[] = [404, false];

    // Act
    const answers = reasons.map((reason) => readFailureReason(reason));

    // Assert
    expect(answers).toStrictEqual(['404', 'false']);
  });

  it('cuts a reason longer than the cap and marks the cut', () => {
    // Arrange
    const reason = new Error('x'.repeat(DEVTOOLS_STATUS_REASON_MAX + 200));

    // Act
    const answer = readFailureReason(reason);

    // Assert
    expect(answer).toHaveLength(DEVTOOLS_STATUS_REASON_MAX);
    expect(answer.endsWith(ELLIPSIS)).toBe(true);
  });

  it('leaves a reason exactly at the cap whole', () => {
    // Arrange
    const reason = 'y'.repeat(DEVTOOLS_STATUS_REASON_MAX);

    // Act
    const answer = readFailureReason(reason);

    // Assert
    expect(answer).toBe(reason);
  });
});

describe('describeActionStart, describeActionDone, describeActionFailure', () => {
  // Refusals first: the one shape the contract's required `label`
  // cannot stop a feature from passing.

  it('names a blank label Action in all three sentences', () => {
    // Arrange
    const label = '   ';

    // Act
    const sentences = [
      describeActionStart(label),
      describeActionDone(label),
      describeActionFailure(label, new Error('nope')),
    ];

    // Assert
    expect(sentences).toStrictEqual([
      `Running Action${ELLIPSIS}`,
      'Action finished',
      'Action failed: nope',
    ]);
  });

  // Accepting cases.

  it('narrates the wait, the outcome and the failure of one action', () => {
    // Arrange
    const label = 'Clear the draft store';

    // Act
    const sentences = [
      describeActionStart(label),
      describeActionDone(label),
      describeActionFailure(label, new Error('storage is full')),
    ];

    // Assert
    expect(sentences).toStrictEqual([
      `Running Clear the draft store${ELLIPSIS}`,
      'Clear the draft store finished',
      'Clear the draft store failed: storage is full',
    ]);
  });

  it('trims a label rather than reading its whitespace aloud', () => {
    // Arrange
    const label = '  Reload fixtures\n';

    // Act
    const sentence = describeActionDone(label);

    // Assert
    expect(sentence).toBe('Reload fixtures finished');
  });

  it('reports an unreadable rejection as a failure and not as silence', () => {
    // Arrange
    const label = 'Send report';

    // Act
    const sentence = describeActionFailure(label, undefined);

    // Assert
    expect(sentence).toBe('Send report failed: unknown error');
  });
});

describe('isOutsidePress', () => {
  // Refusals first: every press that must NOT dismiss.

  it('refuses a press when there is no surface to be outside of', () => {
    // Arrange
    const { outside } = buildTree();

    // Act
    const answer = isOutsidePress(outside, null);

    // Assert
    expect(answer).toBe(false);
  });

  it('refuses a target that is not a node', () => {
    // Arrange
    const { surface } = buildTree();
    const targets: unknown[] = [null, {}, 'main'];

    // Act
    const answers = targets.map(
      (target) => isOutsidePress(target as EventTarget | null, surface),
    );

    // Assert
    expect(answers).toStrictEqual([false, false, false]);
  });

  it('refuses a press on the surface itself', () => {
    // Arrange
    const { surface } = buildTree();

    // Act
    const answer = isOutsidePress(surface, surface);

    // Assert
    expect(answer).toBe(false);
  });

  it('refuses a press on a node inside the surface', () => {
    // Arrange
    const { surface, child, text } = buildTree();

    // Act
    const answers = [
      isOutsidePress(child, surface),
      isOutsidePress(text, surface),
    ];

    // Assert
    expect(answers).toStrictEqual([false, false]);
  });

  // Accepting case.

  it('accepts a press on an element the surface does not contain', () => {
    // Arrange
    const { surface, outside } = buildTree();

    // Act
    const answer = isOutsidePress(outside, surface);

    // Assert
    expect(answer).toBe(true);
  });
});
