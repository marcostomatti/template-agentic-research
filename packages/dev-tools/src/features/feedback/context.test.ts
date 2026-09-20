import type { DevToolsBus, DevToolsHost } from '../../core/types';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDevToolsBus } from '../../core/bus';

import {
  collectFeedbackContext,
  FEEDBACK_CONTEXT_ELLIPSIS,
  FEEDBACK_CONTEXT_VALUE_LIMIT,
} from './context';

/**
 * ## Why every case installs its own environment
 *
 * jsdom answers `1024 x 768`, a device pixel ratio of `1` and a
 * `matchMedia` that matches nothing whatever the query is — it parses
 * media queries and evaluates none of them. A case written against
 * those defaults would pin jsdom's furniture rather than this
 * module's reading, and the colour-scheme cases could not exist at
 * all. So {@link stubGlobal} installs what each case needs and
 * `afterEach` puts back exactly what was there, descriptor and all.
 *
 * The document is the one piece of state shared across cases in a
 * file — jsdom builds it once per file, not once per case — so the
 * two `data-theme` cases go through {@link setTheme}, which unwinds
 * on the same stack.
 *
 * ## The bus is the real one
 *
 * `createDevToolsBus()` rather than a hand-rolled `last()`/`recent()`:
 * the ring's order, its own cap and the empty reading are the bus's
 * behaviour, and a stub would let this file agree with itself about
 * all three. Each case builds its own bus, so no publish leaks
 * forward, and the case that matters most is still the EMPTY one.
 *
 * ## The error keys are spelled out, never imported
 *
 * {@link ERROR_KEYS} names the five keys a full ring writes. `context.ts`
 * builds them from a private depth constant and a private key
 * function, and a case reading either of those would pass for
 * whatever they said — the same reason `bus.test.ts` spells its cap of
 * `20` out rather than importing it.
 */

/** Undo functions for whatever the current case installed. */
const restorers: (() => void)[] = [];

/**
 * Replace one property for the duration of one case.
 *
 * @param target - The object carrying it; `window` IS the global.
 * @param key - The property name.
 * @param value - What it should answer while the case runs.
 */
function stubGlobal(target: object, key: string, value: unknown): void {
  const previous = Object.getOwnPropertyDescriptor(target, key);

  Object.defineProperty(target, key, {
    configurable: true,
    writable: true,
    value,
  });

  restorers.push(() => {
    if (previous === undefined) {
      // `navigator.userAgent` lives on the prototype, so there was no
      // own property to put back and deleting restores the getter.
      Reflect.deleteProperty(target, key);

      return;
    }

    Object.defineProperty(target, key, previous);
  });
}

/**
 * Install a `matchMedia` that answers one colour scheme.
 *
 * @param scheme - The scheme to match, or `null` to match neither.
 */
function stubColorScheme(scheme: string | null): void {
  stubGlobal(window, 'matchMedia', (query: string) => ({
    media: query,
    matches: scheme !== null && query.includes(`prefers-color-scheme: ${scheme}`),
  } as unknown as MediaQueryList));
}

/**
 * Set `data-theme` on an element for the duration of one case.
 *
 * @param element - The document element or the body.
 * @param value - What to write.
 */
function setTheme(element: Element, value: string): void {
  element.setAttribute('data-theme', value);
  restorers.push(() => element.removeAttribute('data-theme'));
}

/**
 * Every key an `error` ring can put in the record, newest first.
 *
 * Five names, because a report carries five failures; a sixth key
 * would be a behaviour no case here asked for.
 */
const ERROR_KEYS: readonly string[] = [
  'error',
  'errorPrevious1',
  'errorPrevious2',
  'errorPrevious3',
  'errorPrevious4',
];

/**
 * Publish `error` payloads in the order an app would.
 *
 * @param bus - The bus to publish on.
 * @param payloads - OLDEST first, so the ring answers the reverse.
 */
function publishErrors(bus: DevToolsBus, payloads: readonly unknown[]): void {
  for (const payload of payloads) {
    bus.publish('error', payload);
  }
}

/** What {@link createHost} takes. */
interface HostOptions {
  /** Overrides for the four version members. */
  readonly version?: Partial<DevToolsHost['version']>;

  /**
   * What `host.context()` should answer.
   *
   * Typed `unknown` per value rather than as the host's own record,
   * because the cases that matter feed it what a JavaScript caller, a
   * stale build or an `as` cast can actually get past that type.
   */
  readonly context?: Record<string, unknown>;

  /** The bus to hand over; a fresh empty one by default. */
  readonly bus?: DevToolsBus;
}

/**
 * Build a host that answers what the case is about and nothing else.
 *
 * @param options - What this case needs the host to say.
 * @returns The host.
 */
function createHost(options: HostOptions = {}): DevToolsHost {
  const context = options.context ?? {};

  return {
    version: {
      commit: 'c0ffee1',
      branch: 'main',
      round: 'r7',
      api: '2.1.0',
      ...options.version,
    },
    endpoint: '/__devtools',
    context: () => context as Record<string, string | number | boolean>,
    settings: { size: 'md', corner: 'bottom-right' },
    bus: options.bus ?? createDevToolsBus(),
    fetch: () => Promise.reject(
      new Error('devtools-test: collecting the context must not fetch'),
    ),
  };
}

beforeEach(() => {
  stubGlobal(window, 'innerWidth', 1280);
  stubGlobal(window, 'innerHeight', 800);
  stubGlobal(window, 'devicePixelRatio', 2);
  stubColorScheme('dark');
  stubGlobal(navigator, 'userAgent', 'devtools-test/1.0 (measured)');
});

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.();
  }
});

describe('what the feedback context refuses to report', () => {
  it('omits the theme when no data-theme attribute is set', () => {
    // Arrange: asserted rather than assumed — a leaked attribute from
    // an earlier case would make this pass for the wrong reason.
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(document.body.hasAttribute('data-theme')).toBe(false);

    // Act
    const collected = collectFeedbackContext(createHost());

    // Assert
    expect(collected).not.toHaveProperty('theme');
  });

  it('omits the theme when the attribute is present but blank', () => {
    // Arrange
    setTheme(document.documentElement, '   ');

    // Act
    const collected = collectFeedbackContext(createHost());

    // Assert
    expect(collected).not.toHaveProperty('theme');
  });

  it('omits every bus key when the ring is empty', () => {
    // Arrange: an untouched bus, which is what a report reads until
    // something publishes — the normal case, not a gap.
    const bus = createDevToolsBus();

    expect(bus.last('error')).toBeUndefined();
    expect(bus.recent('error', ERROR_KEYS.length)).toEqual([]);

    // Act
    const collected = collectFeedbackContext(createHost({ bus }));

    // Assert: all five error names, not only the newest one's.
    for (const key of ERROR_KEYS) {
      expect(collected, `${key} came from an empty ring`).not.toHaveProperty(key);
    }

    expect(collected).not.toHaveProperty('artefact');
  });

  it('omits the error keys a ring of two does not fill', () => {
    // Arrange
    const bus = createDevToolsBus();

    publishErrors(bus, ['the older failure', 'the newer failure']);

    // Act
    const collected = collectFeedbackContext(createHost({ bus }));

    // Assert: what the ring holds, and nothing padded after it.
    expect(collected.error).toBe('the newer failure');
    expect(collected.errorPrevious1).toBe('the older failure');

    for (const key of ERROR_KEYS.slice(2)) {
      expect(collected, `${key} was padded`).not.toHaveProperty(key);
    }
  });

  it('omits every error older than the fifth', () => {
    // Arrange: six published, so the window has to have moved.
    const bus = createDevToolsBus();

    publishErrors(bus, ['e1', 'e2', 'e3', 'e4', 'e5', 'e6']);

    // Act
    const collected = collectFeedbackContext(createHost({ bus }));

    // Assert: the oldest is gone from the record entirely, and no
    // sixth key appeared to carry it.
    expect(Object.values(collected)).not.toContain('e1');
    expect(collected).not.toHaveProperty('errorPrevious5');
    expect(collected.errorPrevious4).toBe('e2');
  });

  it('leaves an unreportable error its own number rather than closing the gap', () => {
    // Arrange: the third-newest is blank, which `summariseBusPayload`
    // omits — the two older than it keep their own ages.
    const bus = createDevToolsBus();

    publishErrors(bus, ['the oldest', '   ', 'the middle', 'the newest']);

    // Act
    const collected = collectFeedbackContext(createHost({ bus }));

    // Assert
    expect(collected.error).toBe('the newest');
    expect(collected.errorPrevious1).toBe('the middle');
    expect(collected).not.toHaveProperty('errorPrevious2');
    expect(collected.errorPrevious3).toBe('the oldest');
  });

  it('omits every artefact but the current one', () => {
    // Arrange: the artefact stays a single `last` read — a report is
    // filed about one artefact, not about a trail of them.
    const bus = createDevToolsBus();

    bus.publish('artefact', 'source:41');
    bus.publish('artefact', 'source:42');

    // Act
    const collected = collectFeedbackContext(createHost({ bus }));

    // Assert
    expect(collected.artefact).toBe('source:42');
    expect(collected).not.toHaveProperty('artefactPrevious1');
    expect(Object.values(collected)).not.toContain('source:41');
  });

  it('omits a bus payload that is blank', () => {
    // Arrange
    const bus = createDevToolsBus();

    bus.publish('error', '   ');

    // Act
    const collected = collectFeedbackContext(createHost({ bus }));

    // Assert
    expect(collected).not.toHaveProperty('error');
  });

  it('omits a bus payload that cannot be serialised', () => {
    // Arrange: a cycle, which throws out of `JSON.stringify`, and a
    // function, which serialises to `undefined` without throwing.
    const bus = createDevToolsBus();
    const cyclic: Record<string, unknown> = { id: 'a1' };

    cyclic.self = cyclic;
    bus.publish('artefact', cyclic);
    bus.publish('error', () => 'never called');

    // Act
    const collected = collectFeedbackContext(createHost({ bus }));

    // Assert
    expect(collected).not.toHaveProperty('artefact');
    expect(collected).not.toHaveProperty('error');
  });

  it('omits a bus payload that is a number no report can carry', () => {
    // Arrange
    const bus = createDevToolsBus();

    bus.publish('error', Number.NaN);

    // Act
    const collected = collectFeedbackContext(createHost({ bus }));

    // Assert: never the four characters `JSON.stringify` writes for
    // it, which would report a non-number as a value.
    expect(collected).not.toHaveProperty('error');
  });

  it('omits a bus payload published as null', () => {
    // Arrange: a producer clearing the current artefact, which is the
    // one publish that means "there is nothing".
    const bus = createDevToolsBus();

    bus.publish('artefact', null);

    // Act
    const collected = collectFeedbackContext(createHost({ bus }));

    // Assert
    expect(collected).not.toHaveProperty('artefact');
  });

  it('omits the device pixel ratio when the browser answers no number', () => {
    // Arrange
    stubGlobal(window, 'devicePixelRatio', Number.POSITIVE_INFINITY);

    // Act
    const collected = collectFeedbackContext(createHost());

    // Assert
    expect(collected).not.toHaveProperty('devicePixelRatio');
    expect(collected.viewportWidth).toBe(1280);
  });

  it('drops what the app smuggled past the context type', () => {
    // Arrange: the host types this record as primitives, and a
    // JavaScript caller, a stale build or an `as` cast all reach it
    // with whatever they like.
    const host = createHost({
      context: {
        route: '/sources',
        filters: { kind: 'rss' },
        selected: ['a', 'b'],
        missing: null,
        counted: Number.NaN,
      },
    });

    // Act
    const collected = collectFeedbackContext(host);

    // Assert
    expect(collected.route).toBe('/sources');
    expect(collected).not.toHaveProperty('filters');
    expect(collected).not.toHaveProperty('selected');
    expect(collected).not.toHaveProperty('missing');
    expect(collected).not.toHaveProperty('counted');
  });

  it('answers unknown when the browser cannot say what it prefers', () => {
    // Arrange: two ways to say nothing — no `matchMedia` at all, and
    // one that matches neither scheme.
    stubGlobal(window, 'matchMedia', undefined);

    // Act
    const absent = collectFeedbackContext(createHost());

    stubColorScheme(null);

    const silent = collectFeedbackContext(createHost());

    // Assert
    expect(absent.colorScheme).toBe('unknown');
    expect(silent.colorScheme).toBe('unknown');
  });

  it('reads no storage while collecting', () => {
    // Arrange: one counting store installed over BOTH globals. The
    // widget's own `devtools.settings` is as forbidden here as the
    // app's session: only the title, the body and this record reach
    // the tracker.
    const asked: string[] = [];
    const counting = {
      get length(): number {
        return 0;
      },
      clear(): void {},
      getItem(key: string): string | null {
        asked.push(key);

        return null;
      },
      key(): string | null {
        return null;
      },
      removeItem(key: string): void {
        asked.push(key);
      },
      setItem(key: string): void {
        asked.push(key);
      },
    } satisfies Storage;

    stubGlobal(window, 'localStorage', counting);
    stubGlobal(window, 'sessionStorage', counting);

    // Act
    const collected = collectFeedbackContext(createHost());

    // Assert
    expect(asked).toEqual([]);
    expect(Object.keys(collected).length).toBeGreaterThan(0);

    // Control: the counter above reads zero because nothing asked,
    // not because it could never have moved.
    localStorage.getItem('devtools.settings');
    sessionStorage.getItem('ar.session');

    expect(asked).toEqual(['devtools.settings', 'ar.session']);
  });
});

describe('what the feedback context reports', () => {
  it('answers exactly the keys it promises, and no others', () => {
    // Act
    const collected = collectFeedbackContext(createHost());

    // Assert
    expect(Object.keys(collected).sort()).toEqual([
      'api',
      'branch',
      'colorScheme',
      'commit',
      'devicePixelRatio',
      'round',
      'url',
      'userAgent',
      'viewportHeight',
      'viewportWidth',
    ]);
  });

  it('adds the theme and the two bus keys to that set when present', () => {
    // Arrange
    const bus = createDevToolsBus();

    setTheme(document.documentElement, 'dark');
    bus.publish('error', 'TypeError: x is not a function');
    bus.publish('artefact', 'source:42');
    bus.publish('route', '/sources');

    // Act
    const collected = collectFeedbackContext(createHost({ bus }));

    // Assert: `route` is not among them — spec decision 10 names two
    // topics, and the route is already in `url`.
    expect(Object.keys(collected).sort()).toEqual([
      'api',
      'artefact',
      'branch',
      'colorScheme',
      'commit',
      'devicePixelRatio',
      'error',
      'round',
      'theme',
      'url',
      'userAgent',
      'viewportHeight',
      'viewportWidth',
    ]);
  });

  it('adds all five error keys to that set when the ring is full', () => {
    // Arrange
    const bus = createDevToolsBus();

    setTheme(document.documentElement, 'dark');
    publishErrors(bus, ['e1', 'e2', 'e3', 'e4', 'e5']);
    bus.publish('artefact', 'source:42');

    // Act
    const collected = collectFeedbackContext(createHost({ bus }));

    // Assert: the four `errorPrevious` keys are the only addition to
    // the set the case above pins — every other key is unchanged.
    expect(Object.keys(collected).sort()).toEqual([
      'api',
      'artefact',
      'branch',
      'colorScheme',
      'commit',
      'devicePixelRatio',
      'error',
      'errorPrevious1',
      'errorPrevious2',
      'errorPrevious3',
      'errorPrevious4',
      'round',
      'theme',
      'url',
      'userAgent',
      'viewportHeight',
      'viewportWidth',
    ]);
  });

  it('reports the five newest errors newest first', () => {
    // Arrange
    const bus = createDevToolsBus();

    publishErrors(bus, ['e1', 'e2', 'e3', 'e4', 'e5', 'e6']);

    // Act
    const collected = collectFeedbackContext(createHost({ bus }));

    // Assert: read through the key names in age order, so a record
    // that carried the right values under the wrong numbers reds.
    expect(ERROR_KEYS.map((key) => collected[key])).toEqual([
      'e6',
      'e5',
      'e4',
      'e3',
      'e2',
    ]);
  });

  it('summarises every error in the ring, not only the newest', () => {
    // Arrange: three shapes `summariseBusPayload` reads differently,
    // published oldest first.
    const bus = createDevToolsBus();
    const long = 'e'.repeat(FEEDBACK_CONTEXT_VALUE_LIMIT + 40);

    publishErrors(bus, [
      long,
      { kind: 'render', id: 7 },
      new TypeError('x is not a function'),
    ]);

    // Act
    const collected = collectFeedbackContext(createHost({ bus }));

    // Assert
    expect(collected.error).toBe('TypeError: x is not a function');
    expect(collected.errorPrevious1).toBe('{"kind":"render","id":7}');
    expect(collected.errorPrevious2).toBe(
      `${'e'.repeat(FEEDBACK_CONTEXT_VALUE_LIMIT)}${FEEDBACK_CONTEXT_ELLIPSIS}`,
    );
  });

  it('reports the viewport rounded, and the device pixel ratio as is', () => {
    // Arrange: a fractionally scaled window, which is where
    // `innerWidth` stops being an integer.
    stubGlobal(window, 'innerWidth', 1279.5);
    stubGlobal(window, 'innerHeight', 799.4);

    // Act
    const collected = collectFeedbackContext(createHost());

    // Assert
    expect(collected.viewportWidth).toBe(1280);
    expect(collected.viewportHeight).toBe(799);
    expect(collected.devicePixelRatio).toBe(2);
  });

  it('reports the colour scheme the browser matches', () => {
    // Act
    const dark = collectFeedbackContext(createHost());

    stubColorScheme('light');

    const light = collectFeedbackContext(createHost());

    // Assert
    expect(dark.colorScheme).toBe('dark');
    expect(light.colorScheme).toBe('light');
  });

  it('reports the data-theme the app set on the document element', () => {
    // Arrange
    setTheme(document.documentElement, 'dark');

    // Act
    const collected = collectFeedbackContext(createHost());

    // Assert: the attribute and the media query are separate
    // readings, and a report carries both — an app in light theme on
    // a machine set to dark is exactly the bug worth seeing.
    stubColorScheme('light');

    expect(collected.theme).toBe('dark');
    expect(collectFeedbackContext(createHost()).colorScheme).toBe('light');
  });

  it('reads a data-theme set on the body when the element has none', () => {
    // Arrange: `@ar/ui`'s tokens.css honours the attribute on <html>
    // OR on <body>.
    setTheme(document.body, 'light');

    // Act
    const collected = collectFeedbackContext(createHost());

    // Assert
    expect(collected.theme).toBe('light');
  });

  it('reports the user agent and the URL the report was filed from', () => {
    // Arrange: a URL jsdom did not start on, so the reading cannot be
    // the default answered by accident.
    const previous = location.href;

    window.history.replaceState({}, '', '/sources?kind=rss#row-2');
    restorers.push(() => window.history.replaceState({}, '', previous));

    // Act
    const collected = collectFeedbackContext(createHost());

    // Assert
    expect(collected.userAgent).toBe('devtools-test/1.0 (measured)');
    expect(collected.url).toBe(`${location.origin}/sources?kind=rss#row-2`);
  });

  it('reports all four version members the host was built with', () => {
    // Act
    const collected = collectFeedbackContext(createHost());

    // Assert
    expect(collected.commit).toBe('c0ffee1');
    expect(collected.branch).toBe('main');
    expect(collected.round).toBe('r7');
    expect(collected.api).toBe('2.1.0');
  });

  it('reports api as unknown when no probe answered', () => {
    // Arrange
    const host = createHost({ version: { api: null } });

    // Act
    const collected = collectFeedbackContext(host);

    // Assert: present and `unknown`, never absent and never `null` —
    // the same word the host's version line uses.
    expect(collected.api).toBe('unknown');
  });

  it('merges the app own context keys through host.context()', () => {
    // Arrange
    const host = createHost({
      context: { route: '/digest', dataSource: 'fixtures', rows: 12 },
    });

    // Act
    const collected = collectFeedbackContext(host);

    // Assert
    expect(collected.route).toBe('/digest');
    expect(collected.dataSource).toBe('fixtures');
    expect(collected.rows).toBe(12);
  });

  it('lets an app key win over a key this module read itself', () => {
    // Arrange: the reading `./core/host.ts` already takes for its own
    // fixed keys, not reversed one layer up.
    const host = createHost({ context: { commit: 'app-said-so' } });

    // Act
    const collected = collectFeedbackContext(host);

    // Assert
    expect(collected.commit).toBe('app-said-so');
  });

  it('lets a published payload win over an app key of the same name', () => {
    // Arrange
    const bus = createDevToolsBus();

    bus.publish('error', 'the newer reading');

    const host = createHost({ bus, context: { error: 'the older reading' } });

    // Act
    const collected = collectFeedbackContext(host);

    // Assert
    expect(collected.error).toBe('the newer reading');
  });

  it('reports an Error payload as its name and its message', () => {
    // Arrange: `JSON.stringify` answers `{}` for an Error, which is
    // why this shape is read before the serialiser.
    const bus = createDevToolsBus();

    bus.publish('error', new TypeError('x is not a function'));

    // Act
    const collected = collectFeedbackContext(createHost({ bus }));

    // Assert
    expect(collected.error).toBe('TypeError: x is not a function');
  });

  it('reports a record payload as its JSON, and a number as itself', () => {
    // Arrange
    const bus = createDevToolsBus();

    bus.publish('artefact', { kind: 'source', id: 42 });
    bus.publish('error', 503);

    // Act
    const collected = collectFeedbackContext(createHost({ bus }));

    // Assert
    expect(collected.artefact).toBe('{"kind":"source","id":42}');
    expect(collected.error).toBe(503);
  });

  it('caps a long bus payload rather than carrying all of it', () => {
    // Arrange
    const bus = createDevToolsBus();
    const long = 'e'.repeat(FEEDBACK_CONTEXT_VALUE_LIMIT + 40);

    bus.publish('error', long);

    // Act
    const collected = collectFeedbackContext(createHost({ bus }));

    // Assert
    expect(collected.error).toBe(
      `${'e'.repeat(FEEDBACK_CONTEXT_VALUE_LIMIT)}${FEEDBACK_CONTEXT_ELLIPSIS}`,
    );
  });

  it('collects afresh per call rather than holding a reading', () => {
    // Arrange: the drawer stays open while the app moves, so a
    // captured record would file yesterday's viewport.
    const host = createHost();
    const before = collectFeedbackContext(host);

    // Act
    stubGlobal(window, 'innerWidth', 390);

    const after = collectFeedbackContext(host);

    // Assert
    expect(before.viewportWidth).toBe(1280);
    expect(after.viewportWidth).toBe(390);
  });
});
