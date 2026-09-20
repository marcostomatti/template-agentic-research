import type { DevToolsBridgeDisposer, DevToolsBridgeTopic } from './bridge';
import type {
  AppArtefactSignal,
  AppErrorSignal,
  AppRouteSignal,
  AppSignals,
} from '../app-shell/appSignals';
import type { DevToolsBus, DevToolsBusTopic } from '@ar/dev-tools';

import { FEEDBACK_FEATURE_ID, FEEDBACK_ITEM_ID } from '@ar/dev-tools/feedback';
import { describe, expect, it } from 'vitest';

import { createAppSignals } from '../app-shell/appSignals';

import { installDevToolsBridge } from './bridge';

// The bridge reaches nothing it was not handed, which is the whole
// reason these cases exist in this package's node-only runner: the
// package's `devtoolsBus` is a singleton whose ring every later case
// would read, and its `installGlobalCapture` adds `window` listeners
// there is no `window` here to add. So every case below builds its own
// channel through `createAppSignals()`, its own recording bus, and its
// own capture stub, and asserts on what those three SAW.
//
// The three republished topics are read by NAME rather than by looping
// the array the module exports nothing of: that array is the runtime's
// copy of a derived union and no type error stands between a missing
// member and a topic that is silently never republished.

/** One publish the bridge made on the bus, as the bus saw it. */
interface BusPublish {
  /** Which topic it landed on. */
  readonly topic: DevToolsBusTopic;

  /** What it carried, unnarrowed — the bus types three of four `unknown`. */
  readonly payload: unknown;
}

/** A bus that records rather than delivers. */
interface RecordingBus {
  /** The contract the bridge is handed. */
  readonly bus: DevToolsBus;

  /** Every publish, in order. */
  readonly published: BusPublish[];
}

/** What the capture installer was handed, and what took it down. */
interface CaptureStub {
  /** The installer the bridge calls once. */
  readonly install: (bus: DevToolsBus) => DevToolsBridgeDisposer;

  /** One entry per install, holding the bus it was handed. */
  readonly installedOn: DevToolsBus[];

  /** One entry per disposer call, holding the same bus. */
  readonly disposals: DevToolsBus[];
}

/** An installed bridge and the three things it was wired to. */
interface InstalledBridge {
  /** The app channel it subscribed to. */
  readonly signals: AppSignals;

  /** The bus it republishes onto, and what that bus saw. */
  readonly recording: RecordingBus;

  /** The capture stub it installed. */
  readonly capture: CaptureStub;

  /** Its disposer. */
  readonly dispose: DevToolsBridgeDisposer;
}

/**
 * A bus that keeps every publish instead of delivering it.
 *
 * `last` and `recent` answer out of the same list, so the stub is a
 * plausible bus rather than a pair of holes — the bridge reads
 * neither, and a version of it that started to would read something
 * true.
 *
 * @returns The bus, and the list it writes.
 */
function recordingBus(): RecordingBus {
  const published: BusPublish[] = [];

  return {
    published,
    bus: {
      subscribe: () => () => {},
      publish: (topic, payload) => { published.push({ topic, payload }); },
      last: (topic) => published
        .filter((entry) => entry.topic === topic)
        .at(-1)?.payload as never,
      recent: (topic, n) => published
        .filter((entry) => entry.topic === topic)
        .reverse()
        .slice(0, n) as never[],
    },
  };
}

/**
 * A stand-in for the package's `installGlobalCapture`.
 *
 * Records the bus it was installed on and every teardown, so a case
 * can read WHICH bus the capture would publish to without a `window`
 * to raise an event on.
 *
 * @returns The installer and its two logs.
 */
function captureStub(): CaptureStub {
  const installedOn: DevToolsBus[] = [];
  const disposals: DevToolsBus[] = [];

  return {
    installedOn,
    disposals,
    install: (bus) => {
      installedOn.push(bus);

      return () => { disposals.push(bus); };
    },
  };
}

/**
 * Install a bridge over a channel, a recording bus and a capture stub.
 *
 * @param signals - The channel to subscribe to. A fresh one by
 * default; pass one in to publish on it BEFORE the install.
 * @returns The bridge and the three things it was wired to.
 */
function installBridge(signals: AppSignals = createAppSignals()): InstalledBridge {
  const recording = recordingBus();
  const capture = captureStub();
  const dispose = installDevToolsBridge({
    signals,
    bus: recording.bus,
    capture: capture.install,
  });

  return { signals, recording, capture, dispose };
}

/** An error payload, held so a case can read it back by identity. */
const AN_ERROR: AppErrorSignal = {
  name: 'TypeError',
  message: 'bridge-test: the digest is blank',
  topFrame: 'at Digest (digest.tsx:1:1)',
  componentStack: '\n    at Digest',
};

/** A route payload, held for the same reason. */
const A_ROUTE: AppRouteSignal = { path: '/lexicon', search: '?q=x', at: 7 };

/** An artefact payload, held for the same reason. */
const AN_ARTEFACT: AppArtefactSignal = { kind: 'lexicon-entry', id: 'le-1' };

/**
 * One publish per REPUBLISHED topic, keyed by the derived union.
 *
 * A `Record` over {@link DevToolsBridgeTopic} rather than a list, so a
 * fourth topic declared by both channels reds this declaration instead
 * of quietly going unswept.
 */
const PUBLISH_ONE: Record<DevToolsBridgeTopic, (signals: AppSignals) => void> = {
  error: (signals) => { signals.publish('error', AN_ERROR); },
  route: (signals) => { signals.publish('route', A_ROUTE); },
  artefact: (signals) => { signals.publish('artefact', AN_ARTEFACT); },
};

describe('what the dev-tools bridge refuses to do', () => {
  it('publishes the devtools signal once for a disposer called twice', () => {
    // Arrange: subscribed BEFORE the install, so the install's own
    // publish is in this list too.
    const signals = createAppSignals();
    const seen: boolean[] = [];

    signals.subscribe('devtools', (payload) => { seen.push(payload.installed); });

    const { dispose } = installBridge(signals);

    // Act: a React effect cleanup runs twice under StrictMode, which
    // this app renders under.
    dispose();
    dispose();

    // Assert: install, and one teardown rather than two.
    expect(seen).toEqual([true, false]);
  });

  it('takes the global capture down once for a disposer called twice', () => {
    // Arrange
    const { capture, dispose } = installBridge();

    // Act
    dispose();
    dispose();

    // Assert: the listeners come off once. The control is the install
    // count beside it — a stub that recorded nothing at all would read
    // the same zero on both lines.
    expect(capture.installedOn).toHaveLength(1);
    expect(capture.disposals).toHaveLength(1);
  });

  it('republishes nothing on any topic after disposal', () => {
    // Arrange
    const { signals, recording, dispose } = installBridge();

    dispose();

    // Act
    for (const publish of Object.values(PUBLISH_ONE)) {
      publish(signals);
    }

    // Assert
    expect(recording.published).toEqual([]);

    // The control: the same three publishes over a LIVE bridge reach
    // the bus, so the empty list above is a disposal rather than a
    // recorder that never records.
    const live = installBridge();

    for (const publish of Object.values(PUBLISH_ONE)) {
      publish(live.signals);
    }

    expect(live.recording.published).toHaveLength(3);
  });

  it('translates no open-feedback after disposal', () => {
    // Arrange
    const { signals, recording, dispose } = installBridge();

    dispose();

    // Act
    signals.publish('open-feedback');

    // Assert
    expect(recording.published).toEqual([]);
  });

  it('republishes nothing that was published before it was installed', () => {
    // Arrange: the channel remembers the last payload per topic, and
    // the bridge deliberately never reads it — a navigation from
    // before the widget mounted would land in the bus's ring dated
    // now rather than then.
    const signals = createAppSignals();

    signals.publish('route', A_ROUTE);

    // Act
    const { recording } = installBridge(signals);

    // Assert
    expect(recording.published).toEqual([]);
    expect(signals.last('route')).toBe(A_ROUTE);

    // The control: published again, with the bridge up, it arrives.
    signals.publish('route', A_ROUTE);
    expect(recording.published).toHaveLength(1);
  });

  it('keeps the app handshake topics off the bus as themselves', () => {
    // Arrange: `devtools` and `open-feedback` are the app's two
    // handshake topics and the bus declares neither. The bridge's own
    // install publish is on the app channel, so the bus has seen
    // nothing at this point.
    const { signals, recording } = installBridge();

    expect(recording.published).toEqual([]);

    // Act: a `devtools` publish by anything other than the bridge
    // reaches the bus not at all.
    signals.publish('devtools', { installed: true });

    // Assert
    expect(recording.published).toEqual([]);

    // The control: `open-feedback` DOES reach the bus, and only under
    // the bus's own name for it.
    signals.publish('open-feedback');
    expect(recording.published.map((entry) => entry.topic)).toEqual(['open-item']);
  });
});

describe('what the dev-tools bridge republishes', () => {
  it('republishes an error payload under the same name', () => {
    // Arrange
    const { signals, recording } = installBridge();

    // Act
    signals.publish('error', AN_ERROR);

    // Assert: identity, not equality — the bus's ring holds what the
    // app published, so a report can match the two.
    expect(recording.published).toEqual([{ topic: 'error', payload: AN_ERROR }]);
    expect(recording.published[0]?.payload).toBe(AN_ERROR);
  });

  it('republishes a route payload under the same name', () => {
    // Arrange
    const { signals, recording } = installBridge();

    // Act
    signals.publish('route', A_ROUTE);

    // Assert
    expect(recording.published).toEqual([{ topic: 'route', payload: A_ROUTE }]);
    expect(recording.published[0]?.payload).toBe(A_ROUTE);
  });

  it('republishes an artefact payload, and the null that clears it', () => {
    // Arrange: `null` is a published FACT on this topic — a surface
    // that has gone — and `undefined` is the absence, so the clear has
    // to cross as itself.
    const { signals, recording } = installBridge();

    // Act
    signals.publish('artefact', AN_ARTEFACT);
    signals.publish('artefact', null);

    // Assert
    expect(recording.published).toEqual([
      { topic: 'artefact', payload: AN_ARTEFACT },
      { topic: 'artefact', payload: null },
    ]);
    expect(recording.published[0]?.payload).toBe(AN_ARTEFACT);
  });

  it('republishes every topic both channels declare', () => {
    // Arrange: the sweep the per-topic cases above cannot be — a
    // fourth topic added to both unions reds `PUBLISH_ONE`'s
    // declaration, and this case is what then reads it.
    const { signals, recording } = installBridge();

    // Act
    for (const publish of Object.values(PUBLISH_ONE)) {
      publish(signals);
    }

    // Assert
    expect(recording.published.map((entry) => entry.topic)).toEqual(
      Object.keys(PUBLISH_ONE),
    );
  });

  it('translates open-feedback into the package feedback item', () => {
    // Arrange: the ids are the package's constants, read from the
    // package here as well — the app side names neither.
    const { signals, recording } = installBridge();

    // Act
    signals.publish('open-feedback');

    // Assert
    expect(recording.published).toEqual([{
      topic: 'open-item',
      payload: { featureId: FEEDBACK_FEATURE_ID, itemId: FEEDBACK_ITEM_ID },
    }]);
  });

  it('installs the global capture on the bus it was handed', () => {
    // Arrange + Act
    const { recording, capture } = installBridge();

    // Assert: identity. The capture's default is the package's shared
    // bus, so a call that passed nothing would publish captured
    // failures somewhere this bridge never reads.
    expect(capture.installedOn).toEqual([recording.bus]);
    expect(capture.installedOn[0]).toBe(recording.bus);
  });

  it('takes the global capture down on disposal', () => {
    // Arrange
    const { capture, dispose } = installBridge();

    expect(capture.disposals).toEqual([]);

    // Act
    dispose();

    // Assert
    expect(capture.disposals).toHaveLength(1);
  });

  it('announces on the app channel that it is installed', () => {
    // Arrange + Act
    const { signals } = installBridge();

    // Assert: read through `last`, which is what `CrashFallback` does
    // for the state it missed before it rendered.
    expect(signals.last('devtools')).toEqual({ installed: true });
  });

  it('announces on the app channel that it is gone', () => {
    // Arrange
    const { signals, dispose } = installBridge();

    // Act
    dispose();

    // Assert
    expect(signals.last('devtools')).toEqual({ installed: false });
  });

  it('registers every subscription before it announces that it is installed', () => {
    // Arrange: a listener that answers the handshake by asking for the
    // feedback surface immediately. If `{installed: true}` went out
    // before the `open-feedback` subscription, this publish would
    // reach nothing at all.
    const signals = createAppSignals();

    signals.subscribe('devtools', (payload) => {
      if (payload.installed) {
        signals.publish('open-feedback');
      }
    });

    // Act
    const { recording } = installBridge(signals);

    // Assert
    expect(recording.published.map((entry) => entry.topic)).toEqual(['open-item']);
  });

  it('gives each install its own subscriptions and its own capture', () => {
    // Arrange: `./devtools.ts` installs one bridge per mount, and a
    // second mount must not publish into the first mount's bus.
    const signals = createAppSignals();
    const first = installBridge(signals);

    // Act
    const second = installBridge(signals);

    signals.publish('route', A_ROUTE);
    first.dispose();
    signals.publish('route', A_ROUTE);

    // Assert: both saw the first publish, only the live one saw the
    // second, and each installed its own capture.
    expect(first.recording.published).toHaveLength(1);
    expect(second.recording.published).toHaveLength(2);
    expect(second.capture.installedOn[0]).not.toBe(first.recording.bus);
  });
});
