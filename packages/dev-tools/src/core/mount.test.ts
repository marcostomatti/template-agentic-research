import type { DevToolsFetch } from './host';
import type { DevToolsConfig, DevToolsFeature, DevToolsStatus } from './types';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEVTOOLS_UNKNOWN_VERSION } from './host';
import {
  DEVTOOLS_FORCE_ENV_KEY,
  DEVTOOLS_GATEWAY_NONE,
  DEVTOOLS_ROOT_ATTRIBUTE,
  createDevToolsRootElement,
  fetchDevToolsStatus,
  isDevToolsAutomated,
  isDevToolsForceValue,
  isDevToolsForced,
  mountDevTools,
  parseDevToolsStatus,
  shouldMountDevTools,
} from './mount';

/**
 * ## What this file proves, and the one line it deliberately crosses
 *
 * `../../vitest.config.ts` collects `.ts` only, and says jsdom is here
 * for `document`-touching PURE modules rather than for rendering
 * React. Every case below but the last two honours that: they read
 * booleans, a narrowed payload and a detached element.
 *
 * The last two call {@link mountDevTools} itself, which creates a real
 * React root and renders `./Shell.tsx` into it. They are written this
 * way because the disposer is a DECISION of this module — unmount the
 * root, then remove the element, and be harmless when called twice —
 * and there is no root to unmount without one. So they assert on the
 * ROOT ELEMENT's lifecycle and on nothing the shell drew: no
 * accessible name, no attribute of the trigger, no menu behaviour.
 * Those are the forced Playwright spec's, against a real browser.
 *
 * The two of them also mean this file is the first in the package to
 * put React on jsdom, which is worth one measured note. As written,
 * the whole file runs clean: `Tests  32 passed (32)`, no `Errors`
 * line, and nothing from React on the console — no `act(...)` warning
 * and no complaint about the root being torn down while a render was
 * scheduled.
 *
 * That is not free, and the cost is `mount.ts`'s `disposed` guard. The
 * disposer in the `afterEach` below runs BEFORE the status and API
 * probes settle, so an unguarded `draw` renders into a root that is
 * already gone: deleting the guard answers `Error: Cannot update an
 * unmounted root.` as an unhandled rejection, which vitest reports as
 * `Errors  1 error` and exits `1` over while still printing `Tests  32
 * passed (32)` (measured). No case below reds on it — the exit code is
 * the only reading that does.
 *
 * ## The environment is stubbed, never mocked
 *
 * {@link isDevToolsForced} reads `import.meta.env` and
 * {@link isDevToolsAutomated} reads `navigator.webdriver`. Both are
 * reached through the real globals — `vi.stubEnv` for the first, an own
 * property for the second — rather than by mocking the module, so the
 * cases exercise the same read `mountDevTools` performs rather than a
 * stand-in for it.
 */

/** A config with nothing configured and no feature. */
const EMPTY_CONFIG: DevToolsConfig = { features: [] };

/** One feature, contributing nothing; presence is all that is read. */
const FEATURE: DevToolsFeature = {
  id: 'probe',
  label: 'Probe',
  items: () => [],
};

/** A config carrying one feature. */
const ONE_FEATURE_CONFIG: DevToolsConfig = { features: [FEATURE] };

/** A full status payload, as this plan's plugin would answer it. */
const STATUS_BODY = {
  commit: 'c0ffee1',
  branch: 'q20b-1',
  round: 'q20b-1',
  persistence: false,
  gateway: DEVTOOLS_GATEWAY_NONE,
};

/** What a recording transport hands back to an assertion. */
interface RecordedFetch {
  /** The transport to pass as `fetchImpl`. */
  readonly send: DevToolsFetch;

  /** Every URL it was asked for, in order. */
  readonly urls: string[];

  /** Every init it was handed, in order. */
  readonly inits: (RequestInit | undefined)[];
}

/**
 * Build a transport that records rather than sends.
 *
 * @param answer - What to answer, or a thrower to reject with.
 * @returns The transport and what it was asked.
 */
function recordFetch(answer: () => Response): RecordedFetch {
  const urls: string[] = [];
  const inits: (RequestInit | undefined)[] = [];

  return {
    urls,
    inits,
    send: (url, init) => {
      urls.push(url);
      inits.push(init);

      return Promise.resolve(answer());
    },
  };
}

/**
 * A response carrying a JSON body.
 *
 * @param body - What to serialise.
 * @param status - The status code.
 * @returns The response.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Hold `navigator.webdriver` at a value for one case.
 *
 * jsdom answers `false`, and the property is a prototype getter, so it
 * is shadowed by an own property and deleted again afterwards.
 *
 * @param value - What `navigator.webdriver` should read.
 */
function setWebdriver(value: boolean): void {
  Object.defineProperty(navigator, 'webdriver', {
    value,
    configurable: true,
  });
}

/** Undo {@link setWebdriver}. */
function clearWebdriver(): void {
  if (Object.getOwnPropertyDescriptor(navigator, 'webdriver') !== undefined) {
    Reflect.deleteProperty(navigator, 'webdriver');
  }
}

/** Every disposer a case took, unwound after it. */
const disposers: (() => void)[] = [];

afterEach(() => {
  for (const dispose of disposers.splice(0)) {
    dispose();
  }

  document.body.replaceChildren();
  clearWebdriver();
  vi.unstubAllEnvs();
});

describe('isDevToolsForceValue', () => {
  it('answers false for every value that means not set', () => {
    // Arrange
    const values: unknown[] = [
      undefined,
      null,
      '',
      '   ',
      '0',
      'false',
      'FALSE',
      0,
      1,
      false,
      {},
    ];

    // Act
    const answers = values.map(isDevToolsForceValue);

    // Assert
    expect(answers).toEqual(values.map(() => false));
  });

  it('answers true for the boolean true', () => {
    // Arrange, Act
    const answer = isDevToolsForceValue(true);

    // Assert
    expect(answer).toBe(true);
  });

  it('answers true for any string that is not one of those', () => {
    // Arrange
    const values = ['1', 'true', 'yes', 'on', ' 1 '];

    // Act
    const answers = values.map(isDevToolsForceValue);

    // Assert
    expect(answers).toEqual(values.map(() => true));
  });
});

describe('isDevToolsForced', () => {
  it('answers false when the key is set to a value meaning off', () => {
    // Arrange
    vi.stubEnv(DEVTOOLS_FORCE_ENV_KEY, '0');

    // Act
    const answer = isDevToolsForced();

    // Assert
    expect(answer).toBe(false);
  });

  it('answers true when the key is set', () => {
    // Arrange
    vi.stubEnv(DEVTOOLS_FORCE_ENV_KEY, '1');

    // Act
    const answer = isDevToolsForced();

    // Assert
    expect(answer).toBe(true);
  });
});

describe('isDevToolsAutomated', () => {
  it('answers false when navigator.webdriver is false', () => {
    // Arrange
    setWebdriver(false);

    // Act
    const answer = isDevToolsAutomated();

    // Assert
    expect(answer).toBe(false);
  });

  it('answers true when navigator.webdriver is true', () => {
    // Arrange
    setWebdriver(true);

    // Act
    const answer = isDevToolsAutomated();

    // Assert
    expect(answer).toBe(true);
  });
});

describe('shouldMountDevTools', () => {
  it('refuses under automation while the force flag is off', () => {
    // Arrange, Act
    const answer = shouldMountDevTools({
      config: ONE_FEATURE_CONFIG,
      automated: true,
      forced: false,
    });

    // Assert
    expect(answer).toBe(false);
  });

  it('refuses an empty feature list when showEmpty is false', () => {
    // Arrange
    const config: DevToolsConfig = { features: [], showEmpty: false };

    // Act
    const answer = shouldMountDevTools({
      config,
      automated: false,
      forced: false,
    });

    // Assert
    expect(answer).toBe(false);
  });

  it('keeps the two refusals independent of each other', () => {
    // Arrange
    const config: DevToolsConfig = { features: [], showEmpty: false };

    // Act
    const answer = shouldMountDevTools({
      config,
      automated: false,
      forced: true,
    });

    // Assert
    expect(answer).toBe(false);
  });

  it('mounts under automation when the force flag is on', () => {
    // Arrange, Act
    const answer = shouldMountDevTools({
      config: ONE_FEATURE_CONFIG,
      automated: true,
      forced: true,
    });

    // Assert
    expect(answer).toBe(true);
  });

  it('mounts an empty feature list when showEmpty says nothing', () => {
    // Arrange, Act
    const answer = shouldMountDevTools({
      config: EMPTY_CONFIG,
      automated: false,
      forced: false,
    });

    // Assert
    expect(answer).toBe(true);
  });

  it('mounts an empty feature list when showEmpty is true', () => {
    // Arrange
    const config: DevToolsConfig = { features: [], showEmpty: true };

    // Act
    const answer = shouldMountDevTools({
      config,
      automated: false,
      forced: false,
    });

    // Assert
    expect(answer).toBe(true);
  });

  it('mounts a configured feature even when showEmpty is false', () => {
    // Arrange
    const config: DevToolsConfig = { features: [FEATURE], showEmpty: false };

    // Act
    const answer = shouldMountDevTools({
      config,
      automated: false,
      forced: false,
    });

    // Assert
    expect(answer).toBe(true);
  });
});

describe('parseDevToolsStatus', () => {
  it('answers null for a body that is not a record', () => {
    // Arrange
    const bodies: unknown[] = [
      null,
      undefined,
      [],
      ['commit'],
      'not found',
      404,
      true,
    ];

    // Act
    const answers = bodies.map(parseDevToolsStatus);

    // Assert
    expect(answers).toEqual(bodies.map(() => null));
  });

  it('reads persistence as literally true and nothing else', () => {
    // Arrange
    const values: unknown[] = ['true', 1, 'yes', {}, null, undefined];

    // Act
    const answers = values.map(
      (persistence) => parseDevToolsStatus({ persistence })?.persistence,
    );

    // Assert
    expect(answers).toEqual(values.map(() => false));
  });

  it('reads the version members and the persistence flag', () => {
    // Arrange
    const body = { ...STATUS_BODY, persistence: true, gateway: 'file' };

    // Act
    const status = parseDevToolsStatus(body);

    // Assert
    expect(status).toEqual({
      commit: 'c0ffee1',
      branch: 'q20b-1',
      round: 'q20b-1',
      persistence: true,
      gateway: 'file',
    });
  });

  it('completes the members the server did not say', () => {
    // Arrange, Act
    const status = parseDevToolsStatus({ commit: 'c0ffee1', branch: '  ' });

    // Assert
    expect(status).toEqual({
      commit: 'c0ffee1',
      branch: DEVTOOLS_UNKNOWN_VERSION,
      round: DEVTOOLS_UNKNOWN_VERSION,
      persistence: false,
      gateway: DEVTOOLS_GATEWAY_NONE,
    });
  });
});

describe('fetchDevToolsStatus', () => {
  it('answers null when the transport rejects', async () => {
    // Arrange
    const send: DevToolsFetch = () => Promise.reject(new Error('offline'));

    // Act
    const status = await fetchDevToolsStatus(EMPTY_CONFIG, send);

    // Assert
    expect(status).toBeNull();
  });

  it('answers null when the response is not ok', async () => {
    // Arrange
    const refused = recordFetch(() => jsonResponse(STATUS_BODY, 404));
    const accepted = recordFetch(() => jsonResponse(STATUS_BODY));

    // Act
    const status = await fetchDevToolsStatus(EMPTY_CONFIG, refused.send);
    const control = await fetchDevToolsStatus(EMPTY_CONFIG, accepted.send);

    // Assert: the same body over 200 IS read, so the null above is the
    // status code and not the body.
    expect(status).toBeNull();
    expect(control).not.toBeNull();
  });

  it('answers null when the body is not JSON', async () => {
    // Arrange
    const send: DevToolsFetch = () => Promise.resolve(
      new Response('<!doctype html><title>dev server</title>'),
    );

    // Act
    const status = await fetchDevToolsStatus(EMPTY_CONFIG, send);

    // Assert
    expect(status).toBeNull();
  });

  it('answers null when the body is JSON but not a record', async () => {
    // Arrange
    const send = recordFetch(() => jsonResponse(['c0ffee1'])).send;

    // Act
    const status = await fetchDevToolsStatus(EMPTY_CONFIG, send);

    // Assert
    expect(status).toBeNull();
  });

  it('answers null, unsent, when the endpoint names an origin', async () => {
    // Arrange
    const config: DevToolsConfig = {
      features: [],
      endpoint: 'https://example.test/__devtools',
    };
    const recorded = recordFetch(() => jsonResponse(STATUS_BODY));

    // Act
    const status = await fetchDevToolsStatus(config, recorded.send);

    // Assert
    expect(status).toBeNull();
    expect(recorded.urls).toEqual([]);
  });

  it('asks the default endpoint for its status path, as JSON', async () => {
    // Arrange
    const recorded = recordFetch(() => jsonResponse(STATUS_BODY));

    // Act
    await fetchDevToolsStatus(EMPTY_CONFIG, recorded.send);

    // Assert
    expect(recorded.urls).toEqual(['/__devtools/status']);
    expect(recorded.inits[0]?.headers).toEqual({
      accept: 'application/json',
    });
  });

  it('asks a configured endpoint for its status path', async () => {
    // Arrange
    const config: DevToolsConfig = { features: [], endpoint: 'tools/' };
    const recorded = recordFetch(() => jsonResponse(STATUS_BODY));

    // Act
    await fetchDevToolsStatus(config, recorded.send);

    // Assert
    expect(recorded.urls).toEqual(['/tools/status']);
  });

  it('resolves the version and the persistence flag', async () => {
    // Arrange
    const body = { ...STATUS_BODY, persistence: true };
    const recorded = recordFetch(() => jsonResponse(body));

    // Act
    const status: DevToolsStatus | null = await fetchDevToolsStatus(
      EMPTY_CONFIG,
      recorded.send,
    );

    // Assert
    expect(status?.commit).toBe('c0ffee1');
    expect(status?.branch).toBe('q20b-1');
    expect(status?.round).toBe('q20b-1');
    expect(status?.persistence).toBe(true);
  });
});

describe('createDevToolsRootElement', () => {
  it('answers a detached div carrying the root attribute', () => {
    // Arrange, Act
    const element = createDevToolsRootElement();

    // Assert
    expect(element.tagName).toBe('DIV');
    expect(element.hasAttribute(DEVTOOLS_ROOT_ATTRIBUTE)).toBe(true);
    expect(element.isConnected).toBe(false);
  });
});

describe('mountDevTools', () => {
  it('appends nothing under automation', () => {
    // Arrange
    setWebdriver(true);

    // Act
    disposers.push(mountDevTools(EMPTY_CONFIG));

    // Assert
    expect(document.querySelectorAll(`[${DEVTOOLS_ROOT_ATTRIBUTE}]`))
      .toHaveLength(0);
  });

  it('appends nothing with no feature when showEmpty is false', () => {
    // Arrange
    const config: DevToolsConfig = { features: [], showEmpty: false };

    // Act
    disposers.push(mountDevTools(config));

    // Assert
    expect(document.querySelectorAll(`[${DEVTOOLS_ROOT_ATTRIBUTE}]`))
      .toHaveLength(0);
  });

  it('answers a disposer that is harmless after a refusal', () => {
    // Arrange
    setWebdriver(true);
    const dispose = mountDevTools(EMPTY_CONFIG);

    // Act, Assert
    expect(() => {
      dispose();
      dispose();
    }).not.toThrow();
  });

  it('appends one root element to the body', () => {
    // Arrange, Act
    disposers.push(mountDevTools(EMPTY_CONFIG));

    // Assert
    const roots = document.querySelectorAll(`[${DEVTOOLS_ROOT_ATTRIBUTE}]`);

    expect(roots).toHaveLength(1);
    expect(roots[0]?.parentElement).toBe(document.body);
  });

  it('removes the element on dispose, twice over', () => {
    // Arrange
    const dispose = mountDevTools(EMPTY_CONFIG);
    const element = document.querySelector(`[${DEVTOOLS_ROOT_ATTRIBUTE}]`);

    // Act
    dispose();
    dispose();

    // Assert
    expect(element?.isConnected).toBe(false);
    expect(document.querySelectorAll(`[${DEVTOOLS_ROOT_ATTRIBUTE}]`))
      .toHaveLength(0);
  });
});
