import type { FeedbackDrawerProps } from './FeedbackDrawer';
import type { ReportFormRenderer } from './types';
import type { DevToolsFeature, DevToolsHost, MenuItem } from '../../core/types';
import type { ReactElement } from 'react';

import { describe, expect, it } from 'vitest';

import {
  FEEDBACK_DEFAULT_MODULE,
  FEEDBACK_FEATURE_ID,
  FEEDBACK_ITEM_ID,
  FEEDBACK_ITEM_LABEL,
  FEEDBACK_MODULE_CONTEXT_KEY,
  FEEDBACK_PRIORITY_CONTEXT_KEY,
  feedbackFeature,
} from './index';

/**
 * ## What this file pins, and what it cannot
 *
 * `index.ts` decides three things: what the row is, when it is drawn,
 * and what the drawer is handed. All three are readable without a
 * renderer — `item.render(props)` CREATES an element and does not
 * invoke the component — so every case below is a plain call and a
 * read of what came back. Nothing is mounted, nothing is clicked, and
 * `react-dom/server` is not needed: the drawer's own markup is the
 * next task's reading and the forced Playwright spec's.
 *
 * ## How "imports no shell state and reaches the host alone" is read
 *
 * Three ways, none of which is an inspection of the import list:
 *
 * - Every host below is built BY THIS FILE. Nothing here calls
 *   `buildDevToolsHost`, mounts a shell or imports one, so a feature
 *   that needed shell state would have nowhere to get it.
 * - A recording `Proxy` over the host says which members were
 *   touched: `items()` touches none, `isEnabled()` touches
 *   `endpoint` and nothing else.
 * - A counting store installed over both `localStorage` and
 *   `sessionStorage` says the widget's own `devtools.settings` is
 *   never read while the rows are built — with the control that
 *   proves the counter could have moved.
 *
 * ## Refusals first
 *
 * The gate opens the file: a host with nowhere to send a report
 * contributes no row at all. The two blank-option cases follow, both
 * of them about a report declaring LESS than it was handed rather
 * than more.
 */

/** What {@link createHost} takes. */
interface HostOptions {
  /** The endpoint the host claims; a real one by default. */
  readonly endpoint?: string;

  /** What `context()` answers, re-read on every call. */
  readonly context?: Record<string, string | number | boolean>;

  /** Where a `fetch` call is recorded. */
  readonly calls?: { path: string; init?: RequestInit }[];
}

/**
 * Build a host this file owns end to end.
 *
 * @param options - What this case needs the host to say.
 * @returns The host. Its `fetch` records rather than sends.
 */
function createHost(options: HostOptions = {}): DevToolsHost {
  const record = options.context ?? {};

  return {
    version: { commit: 'c0ffee1', branch: 'main', round: 'r7', api: null },
    endpoint: options.endpoint ?? '/__devtools',
    context: () => ({ ...record }),
    settings: { size: 'md', corner: 'bottom-right' },
    bus: {
      subscribe: () => () => {},
      publish: () => {},
      last: () => undefined,
    },
    fetch: (path: string, init?: RequestInit) => {
      options.calls?.push({ path, init });

      return Promise.resolve(new Response(null, { status: 204 }));
    },
  };
}

/**
 * Wrap a host so every member read is recorded.
 *
 * @param host - The host to wrap.
 * @param seen - Where each read member name is pushed.
 * @returns The recording host.
 */
function recordingHost(host: DevToolsHost, seen: string[]): DevToolsHost {
  return new Proxy(host, {
    get(target, key, receiver): unknown {
      seen.push(String(key));

      return Reflect.get(target, key, receiver);
    },
  });
}

/**
 * The one item a feature contributes, narrowed to a drawer.
 *
 * @param feature - What {@link feedbackFeature} answered.
 * @returns The item, as the drawer member of the union.
 * @throws If the feature answered anything but one drawer item, which
 * is a failure of the case that called this rather than of the read.
 */
function drawerItem(
  feature: DevToolsFeature,
): Extract<MenuItem, { mode: 'drawer' }> {
  const [item] = feature.items(createHost());

  if (item === undefined || item.mode !== 'drawer') {
    throw new Error('devtools-test: the feature contributed no drawer item');
  }

  return item;
}

/**
 * What the drawer would be handed for a host.
 *
 * @param feature - What {@link feedbackFeature} answered.
 * @param host - The host the shell would pass to `render`.
 * @param close - The shell's own dismissal, recorded by the caller.
 * @returns The props of the element `render` built.
 */
function drawnProps(
  feature: DevToolsFeature,
  host: DevToolsHost,
  close: () => void = (): void => {},
): FeedbackDrawerProps {
  const element = drawerItem(feature).render({ close, host });

  return (element as ReactElement<FeedbackDrawerProps>).props;
}

describe('what the feedback feature refuses', () => {
  it('refuses a host whose endpoint is blank', () => {
    // Arrange: the two shapes a hand-rolled host can take — empty,
    // and whitespace that would join onto a path as if it were one.
    const feature = feedbackFeature();

    // Act
    const empty = feature.isEnabled?.(createHost({ endpoint: '' }));
    const blank = feature.isEnabled?.(createHost({ endpoint: '   ' }));

    // Assert
    expect(empty).toBe(false);
    expect(blank).toBe(false);

    // Control: the gate reads false above because the endpoint is
    // blank, not because it can only answer false.
    expect(feature.isEnabled?.(createHost())).toBe(true);
  });

  it('files under the default module when the option is blank', () => {
    // Arrange
    const feature = feedbackFeature({ module: '   ' });

    // Act
    const context = drawnProps(feature, createHost()).host.context();

    // Assert
    expect(context[FEEDBACK_MODULE_CONTEXT_KEY]).toBe(FEEDBACK_DEFAULT_MODULE);
  });

  it('declares no priority when none is configured', () => {
    // Arrange: the default, per the plan's operator decision — rafa
    // labels an issue filed without a priority `needs-triage`.
    const feature = feedbackFeature();

    // Act
    const context = drawnProps(feature, createHost()).host.context();

    // Assert
    expect(context).not.toHaveProperty(FEEDBACK_PRIORITY_CONTEXT_KEY);
  });

  it('declares no priority when the option is blank', () => {
    // Arrange
    const feature = feedbackFeature({ priority: '  ' });

    // Act
    const context = drawnProps(feature, createHost()).host.context();

    // Assert
    expect(context).not.toHaveProperty(FEEDBACK_PRIORITY_CONTEXT_KEY);
  });

  it('sends nothing and collects nothing while the row is built', () => {
    // Arrange: building a row and drawing its element must not reach
    // the network — the drawer's own effect is what fetches.
    const calls: { path: string; init?: RequestInit }[] = [];
    const seen: string[] = [];
    const host = createHost({ calls, context: { route: '/sources' } });
    const feature = feedbackFeature();

    // Act
    feature.isEnabled?.(host);
    drawnProps(feature, recordingHost(host, seen));

    // Assert
    expect(calls).toEqual([]);

    // Control: the wrapped fetch is reachable, so the empty list
    // above is silence rather than an unreachable recorder.
    void drawnProps(feature, host).host.fetch('/status');
    expect(calls).toEqual([{ path: '/status', init: undefined }]);
  });

  it('reads no storage while building the rows', () => {
    // Arrange: one counting store over BOTH globals. The widget's own
    // `devtools.settings` is shell state, and a feature reaches the
    // shell through the host alone.
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
    const previous = {
      local: Object.getOwnPropertyDescriptor(window, 'localStorage'),
      session: Object.getOwnPropertyDescriptor(window, 'sessionStorage'),
    };

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: counting,
    });
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: counting,
    });

    try {
      // Act
      const feature = feedbackFeature();

      feature.isEnabled?.(createHost());
      drawnProps(feature, createHost());

      // Assert
      expect(asked).toEqual([]);

      // Control: the counter reads zero because nothing asked, not
      // because it could never have moved.
      localStorage.getItem('devtools.settings');
      sessionStorage.getItem('ar.session');

      expect(asked).toEqual(['devtools.settings', 'ar.session']);
    } finally {
      Object.defineProperty(window, 'localStorage', previous.local ?? {});
      Object.defineProperty(window, 'sessionStorage', previous.session ?? {});
    }
  });
});

describe('the rows the feedback feature contributes', () => {
  it('names itself with the prefixed feature id', () => {
    // Act
    const feature = feedbackFeature();

    // Assert
    expect(feature.id).toBe(FEEDBACK_FEATURE_ID);
    expect(feature.label.length).toBeGreaterThan(0);
  });

  it('contributes exactly one item', () => {
    // Act
    const items = feedbackFeature().items(createHost());

    // Assert
    expect(items).toHaveLength(1);
  });

  it('draws that item as a drawer fixed to the end edge', () => {
    // Act
    const item = drawerItem(feedbackFeature());

    // Assert: spec item 3's shape, both halves.
    expect(item.mode).toBe('drawer');
    expect(item.placement).toBe('end');
    expect(item.handle).toBe(true);
  });

  it('labels the row with what an operator clicks', () => {
    // Act
    const item = drawerItem(feedbackFeature());

    // Assert
    expect(item.id).toBe(FEEDBACK_ITEM_ID);
    expect(item.label).toBe(FEEDBACK_ITEM_LABEL);
  });

  it('answers the same rows on every call', () => {
    // Arrange: the rows are a constant, so a shell rebuilding its
    // menu gets the same item rather than an equal one.
    const feature = feedbackFeature();

    // Act
    const first = feature.items(createHost());
    const second = feature.items(createHost());

    // Assert
    expect(second).toBe(first);
  });

  it('reads no host member at all to build the rows', () => {
    // Arrange
    const seen: string[] = [];
    const feature = feedbackFeature();

    // Act
    feature.items(recordingHost(createHost(), seen));

    // Assert
    expect(seen).toEqual([]);

    // Control: the recorder does report a read — the gate takes one,
    // and takes exactly one.
    feature.isEnabled?.(recordingHost(createHost(), seen));
    expect(seen).toEqual(['endpoint']);
  });
});

describe('what the feedback drawer is handed', () => {
  it('hands it the feature id, the shell close and nothing else', () => {
    // Arrange
    const close = (): void => {};
    const feature = feedbackFeature();

    // Act
    const props = drawnProps(feature, createHost(), close);

    // Assert
    expect(Object.keys(props).sort()).toEqual([
      'close',
      'feature',
      'host',
      'renderForm',
    ]);
    expect(props.feature).toBe(FEEDBACK_FEATURE_ID);
    expect(props.close).toBe(close);
  });

  it('passes no renderer when the app configured none', () => {
    // Arrange: absent rather than a second default, so the drawer's
    // own fallback is the one renderer in play.
    const feature = feedbackFeature();

    // Act
    const props = drawnProps(feature, createHost());

    // Assert
    expect(props.renderForm).toBeUndefined();
  });

  it('passes the configured renderer slot through untouched', () => {
    // Arrange
    const renderForm: ReportFormRenderer = () => null;

    // Act
    const props = drawnProps(feedbackFeature({ renderForm }), createHost());

    // Assert
    expect(props.renderForm).toBe(renderForm);
  });

  it('hands the same derived host back for the same host', () => {
    // Arrange: the drawer's template effect is keyed on the host it
    // is handed, and the shell calls `render` on every render of its
    // own — so a fresh wrapper per call would re-fetch the templates
    // every time.
    const feature = feedbackFeature();
    const host = createHost();

    // Act
    const first = drawnProps(feature, host).host;
    const second = drawnProps(feature, host).host;

    // Assert
    expect(second).toBe(first);

    // Control: a different host is a different wrapper, so the
    // identity above is a memo and not one shared wrapper.
    expect(drawnProps(feature, createHost()).host).not.toBe(first);
  });

  it('carries the configured module into the report context', () => {
    // Act
    const feature = feedbackFeature({ module: 'design-system' });
    const context = drawnProps(feature, createHost()).host.context();

    // Assert
    expect(context[FEEDBACK_MODULE_CONTEXT_KEY]).toBe('design-system');
  });

  it('carries the configured priority into the report context', () => {
    // Act
    const feature = feedbackFeature({ priority: 'high' });
    const context = drawnProps(feature, createHost()).host.context();

    // Assert
    expect(context[FEEDBACK_PRIORITY_CONTEXT_KEY]).toBe('high');
  });

  it('files under the default module when no option was given', () => {
    // Act
    const context = drawnProps(feedbackFeature(), createHost()).host.context();

    // Assert: the shape a configured-nothing widget sends — the
    // module, and no priority beside it.
    expect(context).toStrictEqual({
      [FEEDBACK_MODULE_CONTEXT_KEY]: FEEDBACK_DEFAULT_MODULE,
    });
  });

  it('keeps the keys the wrapped host already answered', () => {
    // Arrange
    const host = createHost({ context: { route: '/sources', ready: true } });

    // Act
    const context = drawnProps(feedbackFeature(), host).host.context();

    // Assert
    expect(context.route).toBe('/sources');
    expect(context.ready).toBe(true);
    expect(context[FEEDBACK_MODULE_CONTEXT_KEY]).toBe(FEEDBACK_DEFAULT_MODULE);
  });

  it('lets the configured module win over an app key of the same name', () => {
    // Arrange: the module a report files under is this feature's
    // configuration, not a fact the app reports about itself.
    const host = createHost({ context: { module: 'whatever-the-app-meant' } });

    // Act
    const feature = feedbackFeature({ module: 'web' });
    const context = drawnProps(feature, host).host.context();

    // Assert
    expect(context[FEEDBACK_MODULE_CONTEXT_KEY]).toBe('web');
  });

  it('reads the wrapped context per call rather than once', () => {
    // Arrange: `src/core/host.ts` calls the app's `extra()` per read,
    // and a wrapper that snapshotted it would freeze the route at the
    // moment the drawer was first drawn.
    const record: Record<string, string> = { route: '/sources' };
    const host: DevToolsHost = { ...createHost(), context: () => ({ ...record }) };
    const derived = drawnProps(feedbackFeature(), host).host;

    // Act
    const before = derived.context();

    record.route = '/digest';

    const after = derived.context();

    // Assert
    expect(before.route).toBe('/sources');
    expect(after.route).toBe('/digest');
  });

  it('leaves every other host member as it found it', () => {
    // Arrange
    const host = createHost();

    // Act
    const derived = drawnProps(feedbackFeature(), host).host;

    // Assert
    expect(derived.version).toBe(host.version);
    expect(derived.endpoint).toBe(host.endpoint);
    expect(derived.settings).toBe(host.settings);
    expect(derived.bus).toBe(host.bus);
    expect(Object.isFrozen(derived)).toBe(true);
  });

  it('sends a fetch through the host it wrapped', () => {
    // Arrange
    const calls: { path: string; init?: RequestInit }[] = [];
    const host = createHost({ calls });
    const init: RequestInit = { method: 'POST' };

    // Act
    const derived = drawnProps(feedbackFeature(), host).host;

    void derived.fetch('/report', init);

    // Assert
    expect(calls).toEqual([{ path: '/report', init }]);
  });
});
