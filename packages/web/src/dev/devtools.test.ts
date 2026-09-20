import type { DevToolsBridgeTopic } from './bridge';
import type {
  AppArtefactSignal,
  AppErrorSignal,
  AppRouteSignal,
  AppSignals,
} from '../app-shell/appSignals';
import type { ProbeAuthCall } from '../data/auth';
import type {
  DevToolsBus,
  DevToolsBusTopic,
  DevToolsConfig,
  DevToolsDisposer,
  DevToolsFeature,
  DevToolsHost,
} from '@ar/dev-tools';
import type {
  FeedbackValues,
  ReportFormField,
  ReportFormRenderer,
} from '@ar/dev-tools/feedback';
import type { ReactElement } from 'react';

import {
  FEEDBACK_DEFAULT_MODULE,
  FEEDBACK_FEATURE_ID,
  FEEDBACK_ITEM_ID,
  FEEDBACK_MODULE_CONTEXT_KEY,
  feedbackFeature,
} from '@ar/dev-tools/feedback';
import { describe, expect, it } from 'vitest';

import { createAppSignals } from '../app-shell/appSignals';
import { authMode, probeAuth } from '../data/auth';

import {
  DEVTOOLS_NO_SURFACE,
  devToolsBuildVersion,
  devToolsConfig,
  devToolsExtra,
  devToolsFeatures,
  probeDevToolsApiVersion,
  renderDevToolsReportForm,
  startDevToolsOver,
} from './devtools';
import { ReportForm } from './ReportForm';

/** What a flat context record is allowed to carry. */
const PRIMITIVE_TYPES: readonly string[] = ['string', 'number', 'boolean'];

/** The smallest template a renderer can be handed. */
const FIELDS: readonly ReportFormField[] = [
  { id: 'title', kind: 'text', label: 'Title', required: true },
];

/** What the drawer is handed by the one item this app plugs in. */
interface DrawnDrawerProps {
  /** The app's renderer, or `undefined` where none was configured. */
  readonly renderForm?: ReportFormRenderer;

  /** The host the feature derived from the one it was passed. */
  readonly host: DevToolsHost;
}

/** What {@link renderDevToolsReportForm} builds its element with. */
interface DrawnFormProps {
  /** The fields the slot was handed. */
  readonly fields: readonly ReportFormField[];

  /** The answers the slot was handed. */
  readonly values: FeedbackValues;

  /** The edit callback the slot was handed. */
  readonly onChange: (next: FeedbackValues) => void;
}

/**
 * A host this file owns end to end.
 *
 * Built here rather than by the widget, so a feature reading
 * anything but what it was handed would have nowhere to read it
 * from. Its endpoint is a real one: the feature's own gate refuses a
 * blank, and that refusal is the package's case rather than this
 * file's.
 *
 * @returns The host the shell would hand a surface.
 */
function createHost(): DevToolsHost {
  return {
    version: { commit: 'c0ffee1', branch: 'main', round: 'r7', api: null },
    endpoint: '/__devtools',
    context: () => ({ route: '/digest' }),
    settings: { size: 'md', corner: 'bottom-right' },
    bus: {
      subscribe: () => () => {},
      publish: () => {},
      last: () => undefined,
      recent: () => [],
    },
    fetch: () => Promise.resolve(new Response(null, { status: 204 })),
  };
}

/**
 * What the drawer of a feature's one item would be handed.
 *
 * `render` CREATES an element and never invokes the component, so
 * this stays inside the node runner's reach — see `tests/README.md`
 * on the two-runner split.
 *
 * @param feature - The feature whose item is drawn.
 * @param host - The host the shell would pass to `render`.
 * @returns The props of the element `render` built.
 * @throws If the feature contributed anything but one drawer item,
 * which is a failure of the case that called this.
 */
function drawnDrawerProps(
  feature: DevToolsFeature,
  host: DevToolsHost,
): DrawnDrawerProps {
  const [item] = feature.items(host);

  if (item === undefined || item.mode !== 'drawer') {
    throw new Error('devtools-test: the feature drew no drawer item');
  }

  const element = item.render({ close: () => {}, host });

  return (element as ReactElement<DrawnDrawerProps>).props;
}

/**
 * What the app's renderer built, for the arguments the slot passes.
 *
 * @param values - Every answer so far.
 * @param onChange - What the slot would report an edit to.
 * @returns The props of the element the renderer answered.
 */
function drawnFormProps(
  values: FeedbackValues,
  onChange: (next: FeedbackValues) => void,
): DrawnFormProps {
  const element = renderDevToolsReportForm(FIELDS, values, onChange);

  return (element as ReactElement<DrawnFormProps>).props;
}

/** An error payload, held so a case can read it back by identity. */
const AN_ERROR: AppErrorSignal = {
  name: 'TypeError',
  message: 'devtools-test: the digest is blank',
  topFrame: 'at Digest (digest.tsx:1:1)',
  componentStack: '\n    at Digest',
};

/** A route payload, held for the same reason. */
const A_ROUTE: AppRouteSignal = { path: '/lexicon', search: '?q=x', at: 7 };

/** An artefact payload, held for the same reason. */
const AN_ARTEFACT: AppArtefactSignal = { kind: 'lexicon-entry', id: 'le-1' };

/**
 * One publish per republished topic, keyed by the derived union.
 *
 * A `Record` over `DevToolsBridgeTopic` rather than a list, so a
 * fourth topic both channels declare reds this declaration instead of
 * going unswept here — `./bridge.test.ts` holds the same guard over
 * the bridge itself, and this file's subject is that the bridge was
 * WIRED at all.
 */
const PUBLISH_ONE: Record<DevToolsBridgeTopic, (signals: AppSignals) => void> = {
  error: (signals) => { signals.publish('error', AN_ERROR); },
  route: (signals) => { signals.publish('route', A_ROUTE); },
  artefact: (signals) => { signals.publish('artefact', AN_ARTEFACT); },
};

/** One publish the bridge made on the injected bus, as that bus saw it. */
interface BusPublish {
  /** Which topic it landed on. */
  readonly topic: DevToolsBusTopic;

  /** What it carried, unnarrowed — the bus types three of four `unknown`. */
  readonly payload: unknown;
}

/** What {@link startOver} may vary, and what it fills in otherwise. */
interface StartOptions {
  /** What `isDevToolsAutomated()` would have answered. Default `false`. */
  readonly automated?: boolean;

  /** What `isDevToolsForced()` would have answered. Default `false`. */
  readonly forced?: boolean;

  /** The config both the mount and the decision read. Default the app's. */
  readonly config?: DevToolsConfig;

  /** The app channel. A fresh one by default. */
  readonly signals?: AppSignals;
}

/** A started widget, and what each of its four collaborators saw. */
interface StartedDevTools {
  /** The app channel it subscribed to, and announces itself on. */
  readonly signals: AppSignals;

  /** The bus it republishes onto. */
  readonly bus: DevToolsBus;

  /** Every publish that reached that bus, in order. */
  readonly published: BusPublish[];

  /** One entry per mount call, holding the config it was handed. */
  readonly mountedWith: DevToolsConfig[];

  /** One entry per widget teardown. */
  readonly widgetDisposals: DevToolsConfig[];

  /** One entry per capture install, holding the bus it was handed. */
  readonly captureInstalls: DevToolsBus[];

  /** One entry per capture teardown. */
  readonly captureDisposals: DevToolsBus[];

  /**
   * `'widget'`, pushed the moment the mount's own disposer runs.
   *
   * The only way a case can read teardown ORDER: the bridge announces
   * itself gone on the app channel, so a case that subscribes there
   * pushes its own mark into this same list as it happens.
   */
  readonly teardownOrder: string[];

  /** The one disposer covering both halves. */
  readonly dispose: DevToolsDisposer;
}

/**
 * Start the dev tools over four collaborators this file owns.
 *
 * `mountDevTools` appends to `document.body` and this runner is
 * node-only, so the mount arrives as a stub that records what it was
 * handed — which is also what lets a case read whether the widget was
 * taken down. The bus records rather than delivers, for the reason
 * `./bridge.test.ts` states: the package's own `devtoolsBus` is a
 * singleton whose ring every later case would read.
 *
 * @param options - What to vary; everything else is the app's own.
 * @returns The four collaborators' logs and the composed disposer.
 */
function startOver(options: StartOptions = {}): StartedDevTools {
  const signals = options.signals ?? createAppSignals();
  const published: BusPublish[] = [];
  const mountedWith: DevToolsConfig[] = [];
  const widgetDisposals: DevToolsConfig[] = [];
  const captureInstalls: DevToolsBus[] = [];
  const captureDisposals: DevToolsBus[] = [];
  const teardownOrder: string[] = [];
  const bus: DevToolsBus = {
    subscribe: () => () => {},
    publish: (topic, payload) => { published.push({ topic, payload }); },
    last: (topic) => published
      .filter((entry) => entry.topic === topic)
      .at(-1)?.payload as never,
    recent: (topic, n) => published
      .filter((entry) => entry.topic === topic)
      .reverse()
      .slice(0, n) as never[],
  };

  const dispose = startDevToolsOver({
    signals,
    bus,
    config: options.config ?? devToolsConfig(),
    automated: options.automated ?? false,
    forced: options.forced ?? false,
    mount: (config) => {
      mountedWith.push(config);

      // Deliberately NOT idempotent, unlike the package's own: the
      // once-ness a case reads for a disposer called twice is then
      // `startDevToolsOver`'s rather than this stub's.
      return () => {
        widgetDisposals.push(config);
        teardownOrder.push('widget');
      };
    },
    capture: (installedOn) => {
      captureInstalls.push(installedOn);

      return () => { captureDisposals.push(installedOn); };
    },
  });

  return {
    signals,
    bus,
    published,
    mountedWith,
    widgetDisposals,
    captureInstalls,
    captureDisposals,
    teardownOrder,
    dispose,
  };
}

describe('devToolsExtra', () => {
  it('reports no surface for a path that names none', () => {
    const extra = devToolsExtra('/nowhere', 'fixture');

    expect(extra.surface).toBe(DEVTOOLS_NO_SURFACE);
  });

  it('reports no surface for the single-domain index path', () => {
    const extra = devToolsExtra('/', 'fixture');

    expect(extra.surface).toBe(DEVTOOLS_NO_SURFACE);
  });

  it('answers a record of primitives only, one level deep', () => {
    const extra = devToolsExtra('/d/ai/lexicon/new', 'api');
    const types = Object.values(extra).map((value) => typeof value);

    expect(types.length).toBeGreaterThan(0);
    expect(types.every((type) => PRIMITIVE_TYPES.includes(type))).toBe(true);
  });

  it('carries the path it was handed as the route', () => {
    const extra = devToolsExtra('/digest', 'fixture');

    expect(extra.route).toBe('/digest');
  });

  it('keeps a modal sub-route on the surface that owns it', () => {
    const extra = devToolsExtra('/lexicon/new', 'fixture');

    expect(extra.surface).toBe('lexicon');
  });

  it('reads the surface out of a domain-based path', () => {
    const extra = devToolsExtra('/d/ai/sources', 'fixture');

    expect(extra.surface).toBe('sources');
  });

  it('carries the data source it was handed', () => {
    expect(devToolsExtra('/digest', 'api').dataSource).toBe('api');
    expect(devToolsExtra('/digest', 'fixture').dataSource).toBe('fixture');
  });
});

describe('probeDevToolsApiVersion', () => {
  it('answers null for a probe that rejects, rather than rejecting', async () => {
    const rejecting: ProbeAuthCall = () => Promise.reject(new Error('offline'));

    await expect(probeDevToolsApiVersion(rejecting)).resolves.toBeNull();
  });

  it('answers null when there is no probe to call', async () => {
    await expect(probeDevToolsApiVersion(undefined)).resolves.toBeNull();
  });

  it('answers null for the probe a fixture build actually holds', async () => {
    // The control: this runner has no VITE_AR_API_URL, so the selector
    // above must BE the fixture one. Without it a wired probe that
    // merely failed would read the same as no probe at all.
    expect(authMode).toBe('fixture');
    expect(probeAuth).toBeUndefined();

    await expect(probeDevToolsApiVersion(probeAuth)).resolves.toBeNull();
  });

  it('answers what a reachable service said about its auth', async () => {
    const open: ProbeAuthCall = () => Promise.resolve('open');

    await expect(probeDevToolsApiVersion(open)).resolves.toBe('open');
  });
});

describe('devToolsBuildVersion', () => {
  it('leaves every member undefined where define did not reach', () => {
    // The unit runner is a build the plugin never transformed, which is
    // the shape a production build has too: the three identifiers are
    // not declared at all, so a read that was not a `typeof` guard
    // would throw here rather than answer.
    expect(devToolsBuildVersion()).toEqual({
      commit: undefined,
      branch: undefined,
      round: undefined,
    });
  });
});

describe('devToolsFeatures', () => {
  it('plugs in one feature, and it is the feedback feature', () => {
    // Act
    const features = devToolsFeatures();

    // Assert
    expect(features).toHaveLength(1);
    expect(features[0]?.id).toBe(FEEDBACK_FEATURE_ID);
  });

  it('contributes the one report row to the menu', () => {
    // Arrange
    const [feature] = devToolsFeatures();

    // Act
    const items = feature?.items(createHost()) ?? [];

    // Assert
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe(FEEDBACK_ITEM_ID);
  });

  it('hands the drawer the form renderer this app owns', () => {
    // Arrange
    const [feature] = devToolsFeatures();

    if (feature === undefined) {
      throw new Error('devtools-test: no feature was configured');
    }

    // Act
    const props = drawnDrawerProps(feature, createHost());

    // Assert
    expect(props.renderForm).toBe(renderDevToolsReportForm);

    // Control: the slot reads `undefined` on a feature nobody
    // configured one on, so the identity above is this app's wiring
    // rather than a member that is always filled.
    expect(
      drawnDrawerProps(feedbackFeature(), createHost()).renderForm,
    ).toBeUndefined();
  });

  it('leaves the filing module at the package default', () => {
    // Arrange: this app passes no `module` option, so `web` reaching
    // the report is the package's default rather than a second
    // spelling of it here.
    const [feature] = devToolsFeatures();

    if (feature === undefined) {
      throw new Error('devtools-test: no feature was configured');
    }

    // Act
    const context = drawnDrawerProps(feature, createHost()).host.context();

    // Assert
    expect(context[FEEDBACK_MODULE_CONTEXT_KEY]).toBe(FEEDBACK_DEFAULT_MODULE);
  });

  it('builds a fresh feature per call', () => {
    // Arrange: the feature memoises the host it derives for the
    // drawer, so one list per mount is the shape `startDevTools`
    // relies on — a shared instance would outlive the widget it was
    // built for.
    const first = devToolsFeatures();

    // Act
    const second = devToolsFeatures();

    // Assert
    expect(second[0]).not.toBe(first[0]);
    expect(second[0]?.id).toBe(first[0]?.id);
  });
});

describe('renderDevToolsReportForm', () => {
  it('draws the report form component this app owns', () => {
    // Act
    const element = renderDevToolsReportForm(FIELDS, {}, () => {});

    // Assert
    expect((element as ReactElement).type).toBe(ReportForm);
  });

  it('passes the three slot arguments on untouched', () => {
    // Arrange: identity, not equality — a renderer that copied the
    // record or wrapped the callback would answer an equal value and
    // a different reference.
    const values: FeedbackValues = { title: 'The digest is blank' };
    const onChange = (): void => {};

    // Act
    const props = drawnFormProps(values, onChange);

    // Assert
    expect(props.fields).toBe(FIELDS);
    expect(props.values).toBe(values);
    expect(props.onChange).toBe(onChange);
  });

  it('builds the element without drawing it', () => {
    // Arrange: the control is the runner itself. This project is
    // node-only, so a renderer that RENDERED its component would
    // reach a document that is not there.
    expect(typeof document).toBe('undefined');

    // Act
    const element = renderDevToolsReportForm(FIELDS, {}, () => {});

    // Assert
    expect(element).not.toBeNull();
  });
});

describe('what startDevTools refuses to wire', () => {
  it('installs no bridge under automation without the force override', () => {
    // Arrange: the default e2e server exactly — `navigator.webdriver`
    // true and no `VITE_DEVTOOLS_FORCE` — which must read the way a
    // production build does.
    const started = startOver({ automated: true, forced: false });

    // Act
    for (const publish of Object.values(PUBLISH_ONE)) {
      publish(started.signals);
    }

    started.signals.publish('open-feedback');

    // Assert
    expect(started.captureInstalls).toEqual([]);
    expect(started.published).toEqual([]);

    // The control: the same four publishes with the override on reach
    // the bus, so the empty list above is a refusal rather than a
    // recorder that never records.
    const forced = startOver({ automated: true, forced: true });

    for (const publish of Object.values(PUBLISH_ONE)) {
      publish(forced.signals);
    }

    forced.signals.publish('open-feedback');
    expect(forced.published).toHaveLength(4);
  });

  it('publishes no devtools signal when it installed no bridge', () => {
    // Arrange: `CrashFallback` reads this signal to decide whether its
    // report button can reach anything, so a widget that never drew
    // must leave it unsaid rather than answer false.
    const started = startOver({ automated: true, forced: false });

    // Act
    expect(started.signals.last('devtools')).toBeUndefined();
    started.dispose();

    // Assert: and no `{installed: false}` on the way out either.
    expect(started.signals.last('devtools')).toBeUndefined();

    // The control: with the override on, both halves of the handshake
    // are published on the same channel.
    const forced = startOver({ automated: true, forced: true });

    expect(forced.signals.last('devtools')).toEqual({ installed: true });
  });

  it('installs no bridge for a config the widget would draw nothing for', () => {
    // Arrange: the package's second refusal — no configured feature
    // and `showEmpty: false`. It is a reading of the CONFIG rather
    // than of the environment, which is what says the decision here is
    // taken over the same config the mount is handed.
    const started = startOver({ config: { features: [], showEmpty: false } });

    // Act
    started.signals.publish('open-feedback');

    // Assert
    expect(started.captureInstalls).toEqual([]);
    expect(started.published).toEqual([]);

    // The control: the same empty list with `showEmpty` left to its
    // default mounts, and the bridge goes up with it.
    const drawn = startOver({ config: { features: [] } });

    expect(drawn.captureInstalls).toHaveLength(1);
  });

  it('calls the mount even when it installs no bridge', () => {
    // Arrange: the package owns its own refusal and answers a disposer
    // through both branches, so nothing here second-guesses it — what
    // the reading gates is the bridge.
    const started = startOver({ automated: true, forced: false });

    // Act
    expect(started.mountedWith).toHaveLength(1);
    started.dispose();

    // Assert: and the disposer it answered is the mount's own.
    expect(started.widgetDisposals).toHaveLength(1);
  });

  it('takes each half down once for a disposer called twice', () => {
    // Arrange: a React effect cleanup runs twice under StrictMode, and
    // this app renders under it. The mount stub is deliberately not
    // idempotent, so this reads the composed disposer's own guard.
    const started = startOver();
    const seen: boolean[] = [];

    started.signals.subscribe('devtools', (payload) => {
      seen.push(payload.installed);
    });

    // Act
    started.dispose();
    started.dispose();

    // Assert
    expect(started.widgetDisposals).toHaveLength(1);
    expect(started.captureDisposals).toHaveLength(1);
    expect(seen).toEqual([false]);
  });
});

describe('what startDevTools wires to the mounted widget', () => {
  it('republishes every topic the bridge carries onto the bus', () => {
    // Arrange
    const started = startOver();

    // Act
    for (const publish of Object.values(PUBLISH_ONE)) {
      publish(started.signals);
    }

    // Assert: the payloads themselves, not copies — the bus's ring
    // holds what the app published, so a report can match the two.
    expect(started.published).toEqual([
      { topic: 'error', payload: AN_ERROR },
      { topic: 'route', payload: A_ROUTE },
      { topic: 'artefact', payload: AN_ARTEFACT },
    ]);
    expect(started.published.map((entry) => entry.topic)).toEqual(
      Object.keys(PUBLISH_ONE),
    );
  });

  it('translates open-feedback into the package feedback item', () => {
    // Arrange: the ids are the package's own constants on both sides.
    // The app never spells either one.
    const started = startOver();

    // Act
    started.signals.publish('open-feedback');

    // Assert
    expect(started.published).toEqual([{
      topic: 'open-item',
      payload: { featureId: FEEDBACK_FEATURE_ID, itemId: FEEDBACK_ITEM_ID },
    }]);
  });

  it('announces on the app channel that the bridge is installed', () => {
    // Arrange + Act
    const started = startOver();

    // Assert: read through `last`, which is what `CrashFallback` does
    // for the state it missed before it rendered.
    expect(started.signals.last('devtools')).toEqual({ installed: true });
  });

  it('announces on the app channel that the bridge is gone', () => {
    // Arrange
    const started = startOver();

    // Act
    started.dispose();

    // Assert
    expect(started.signals.last('devtools')).toEqual({ installed: false });
  });

  it('installs the window capture on the bus it republishes onto', () => {
    // Arrange + Act
    const started = startOver();

    // Assert: identity. The capture's own default is the package's
    // shared bus, so a call that passed nothing would publish captured
    // failures somewhere this widget never reads.
    expect(started.captureInstalls).toEqual([started.bus]);
    expect(started.captureInstalls[0]).toBe(started.bus);
  });

  it('hands the mount the same config the decision was taken over', () => {
    // Arrange: one value read twice. A second `devToolsConfig()` call
    // would answer an equal config with a different feature instance,
    // and the widget would then be drawing a list nothing decided on.
    const config = devToolsConfig();

    // Act
    const started = startOver({ config });

    // Assert
    expect(started.mountedWith).toEqual([config]);
    expect(started.mountedWith[0]).toBe(config);
  });

  it('takes the bridge down before the widget', () => {
    // Arrange: the bridge is the half that can still publish onto the
    // bus, so it goes first — a widget removed first would leave a
    // live bridge republishing into a bus nothing reads. Both marks
    // are pushed AS they happen: the mount stub pushes its own from
    // inside its disposer, and the bridge's last act is the signal
    // this subscriber answers.
    const started = startOver();

    started.signals.subscribe('devtools', (payload) => {
      if (!payload.installed) {
        started.teardownOrder.push('bridge');
      }
    });

    // Act
    started.dispose();

    // Assert
    expect(started.teardownOrder).toEqual(['bridge', 'widget']);
  });
});
