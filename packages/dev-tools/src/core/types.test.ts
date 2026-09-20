import type {
  Corner,
  DevToolsBus,
  DevToolsBusTopic,
  DevToolsConfig,
  DevToolsFeature,
  DevToolsHost,
  DevToolsOpenItemPayload,
  DevToolsStatus,
  DrawerPlacement,
  MenuItem,
  Size,
  SurfaceMode,
  SurfaceProps,
} from './types';

import { describe, expect, it } from 'vitest';

/**
 * A bus that records instead of dispatching.
 *
 * `./bus.ts` is what a real one will be; this file needs only a value
 * of the declared shape, because nothing here exercises delivery — it
 * exercises whether a feature can be HANDED one at all.
 */
const BUS: DevToolsBus = {
  subscribe: () => () => undefined,
  publish: () => undefined,
  last: () => undefined,
  recent: () => [],
};

/**
 * One host, built by hand.
 *
 * `./host.ts` is the real builder. Writing the literal out here is the
 * point rather than a shortcut: it is a `check-types` reading that the
 * contract is SATISFIABLE without the shell, which is the same claim
 * as "a feature reaches nothing but this".
 */
const HOST: DevToolsHost = {
  version: {
    commit: 'c0ffee1',
    branch: 'q20b-1',
    round: 'q20b-1',
    api: null,
  },
  endpoint: '/__devtools',
  context: () => ({ route: '/lexicon', source: 'fixture', live: false }),
  settings: { size: 'md', corner: 'bottom-right' },
  bus: BUS,
  fetch: () => Promise.resolve(new Response(null, { status: 204 })),
};

/** The four modes, annotated so a mode REMOVED reds this line. */
const SURFACE_MODES: readonly SurfaceMode[] = [
  'action',
  'popover',
  'modal',
  'drawer',
];

/** The four placements, annotated for the same reason. */
const DRAWER_PLACEMENTS: readonly DrawerPlacement[] = [
  'start',
  'end',
  'top',
  'bottom',
];

/** The four corners, annotated for the same reason. */
const CORNERS: readonly Corner[] = [
  'top-left',
  'top-right',
  'bottom-right',
  'bottom-left',
];

/** The three sizes, annotated for the same reason. */
const SIZES: readonly Size[] = ['sm', 'md', 'lg'];

/**
 * The four bus topics, annotated for the same reason.
 *
 * The union is now `keyof DevToolsBusPayloads` rather than a literal
 * list, so this line is also the reading that the derivation KEPT the
 * three original members while gaining `open-item`: a payload map
 * that lost one would red here rather than quietly narrow what the
 * bus accepts.
 */
const BUS_TOPICS: readonly DevToolsBusTopic[] = [
  'error',
  'route',
  'artefact',
  'open-item',
];

/**
 * A bus that records what it was handed, for the topic cases.
 *
 * Separate from {@link BUS}, which answers nothing and exists to make
 * a {@link DevToolsHost} literal satisfiable: a case reading what a
 * topic CARRIES needs the payload back.
 *
 * @returns The bus, and the `topic`/`payload` pairs published on it.
 */
function recordingBus(): {
  bus: DevToolsBus;
  published: { topic: DevToolsBusTopic; payload: unknown }[];
} {
  const published: { topic: DevToolsBusTopic; payload: unknown }[] = [];

  return {
    bus: {
      subscribe: () => () => undefined,
      publish: (topic, payload) => { published.push({ topic, payload }); },
      last: () => undefined,
      recent: () => [],
    },
    published,
  };
}

/**
 * What the shell would do with one item, without a shell.
 *
 * A function rather than a comment: it reads `placement` and `handle`
 * off an item the discriminant narrowed, with no cast, no optional
 * chaining and no `in` check, so the narrowing {@link MenuItem}'s doc
 * claims is checked by `check-types` rather than asserted in prose.
 * Measured live — deleting `placement` from the drawer member reds the
 * line below that reads it, `TS2339: Property 'placement' does not
 * exist on type '{ id: string; label: string; mode: "drawer"; ... }'`.
 *
 * Flattening the union into one interface carrying `run?`, `render?`,
 * `placement?` and `handle?` does NOT red this function — measured;
 * every member is then optional and present, so each read still
 * compiles. That mutation reds the three directives below instead,
 * which is why the refusals and not this function are what pin the
 * union's shape.
 *
 * @param item - Any menu item.
 * @returns A tag naming what the shell would draw.
 */
function drawnAs(item: MenuItem): string {
  if (item.mode === 'action') {
    return `run:${typeof item.run}`;
  }

  if (item.mode === 'drawer') {
    return `drawer:${item.placement ?? 'default'}:${item.handle ?? false}`;
  }

  return `${item.mode}:${typeof item.render}`;
}

describe('what the contract refuses', () => {
  it('refuses an action item that carries a render', () => {
    // An action runs and draws nothing, so `render` sits on the three
    // drawing members and on no other. `mode: 'action'` picks the
    // action member out of the union before excess-property checking
    // runs, which is what makes this TS2353 at the `render` line
    // rather than a silently accepted extra key. The directive is the
    // pin: a contract that grew `render?` on a flat interface instead
    // would red this line as an unused expectation (TS2578) rather
    // than leave the case quietly passing.
    const refused = {
      id: 'reset',
      label: 'Reset the draft store',
      mode: 'action',
      run: () => undefined,
      // @ts-expect-error an action draws nothing.
      render: () => null,
    } satisfies MenuItem;

    // The positive control, varied along that one axis: the same
    // literal without `render` compiles with no directive, so a union
    // that had come to refuse EVERY action would fail this file
    // rather than pass it.
    const accepted = {
      id: 'reset',
      label: 'Reset the draft store',
      mode: 'action',
      run: () => undefined,
    } satisfies MenuItem;

    // Runtime readings, so the case is not a directive and nothing
    // else: the refused literal still HOLDS what was written — a type
    // error is not a deletion — and both still read as an action to
    // anything narrowing on the discriminant.
    expect(typeof refused.render).toBe('function');
    expect(drawnAs(refused)).toBe('run:function');
    expect(drawnAs(accepted)).toBe('run:function');
  });

  it('refuses a placement on a modal item, where a drawer carries one', () => {
    // `placement` is the drawer's, not the contract's: a modal is
    // centred by the platform and has no edge to be fixed to, so
    // `{ mode: 'modal', placement: 'end' }` would compile and mean
    // nothing. TS2353 at the `placement` line, for the same
    // discriminant reason as the case above.
    const refusedModal = {
      id: 'about',
      label: 'About',
      mode: 'modal',
      render: () => null,
      // @ts-expect-error only a drawer is placed.
      placement: 'end',
    } satisfies MenuItem;

    // The positive control, varied along the one axis that matters
    // here — the mode, not the member. The SAME `placement` on a
    // drawer compiles with no directive, so this pair reads the
    // union's seam rather than a contract that refuses `placement`
    // everywhere. Deleting `placement` from the drawer member reds
    // this literal with TS2353 while both directives above stay
    // needed, which is the half a directive cannot measure.
    const acceptedDrawer = {
      id: 'inspector',
      label: 'Inspector',
      mode: 'drawer',
      placement: 'end',
      handle: true,
      render: () => null,
    } satisfies MenuItem;

    expect(refusedModal.placement).toBe('end');
    expect(drawnAs(refusedModal)).toBe('modal:function');
    expect(drawnAs(acceptedDrawer)).toBe('drawer:end:true');
  });

  it('refuses a drawer item that draws nothing', () => {
    // The other direction of the same seam: a drawer is a surface, so
    // `render` is required on it. Measured, `TS2322: Type '{ id:
    // string; label: string; mode: "drawer"; placement: "bottom"; }'
    // is not assignable to type 'MenuItem'. Property 'render' is
    // missing`. The directive sits on the ANNOTATION rather than on a
    // property line because the error is reported against the whole
    // literal — there is no single member to hang it on when the
    // missing one is what is wrong.
    // @ts-expect-error a drawer draws something.
    const refused: MenuItem = {
      id: 'inspector',
      label: 'Inspector',
      mode: 'drawer',
      placement: 'bottom',
    };

    // The positive control: the same literal, one member added.
    const accepted: MenuItem = {
      id: 'inspector',
      label: 'Inspector',
      mode: 'drawer',
      placement: 'bottom',
      render: () => null,
    };

    expect(drawnAs(refused)).toBe('drawer:bottom:false');
    expect(drawnAs(accepted)).toBe('drawer:bottom:false');
  });

  it('refuses an open-item payload that is not a pair of ids', () => {
    // `open-item` is the one topic with a declared payload, because it
    // is the one the widget ACTS on rather than summarises. The three
    // directives below are what that declaration buys: each publish
    // still runs — a type error is not a deletion — so the recorder
    // reads them all back afterwards.
    const { bus, published } = recordingBus();

    // @ts-expect-error open-item carries two ids, not a route-like string.
    bus.publish('open-item', 'feedback/drawer');

    // @ts-expect-error itemId is required: half a pair opens nothing.
    bus.publish('open-item', { featureId: 'feedback' });

    bus.publish('open-item', {
      featureId: 'feedback',
      itemId: 'drawer',
      // @ts-expect-error the payload is two ids and nothing else.
      open: () => undefined,
    });

    // The positive control, varied along the one axis that matters —
    // the topic, not the value. The SAME string that was refused above
    // compiles with no directive on `error`, so this pair reads the
    // map's seam rather than a bus that has come to refuse every
    // payload. A map that typed all four topics alike would red this
    // line.
    bus.publish('error', 'feedback/drawer');

    // And a topic outside the roster is refused whatever it carries:
    // the union is the map's `keyof`, so there is no fifth member to
    // publish on.
    // @ts-expect-error the roster is closed at four.
    bus.publish('open-items', { featureId: 'feedback', itemId: 'drawer' });

    expect(published.map((entry) => entry.topic)).toEqual([
      'open-item',
      'open-item',
      'open-item',
      'error',
      'open-items',
    ]);
    expect(published[0]?.payload).toBe('feedback/drawer');
    expect(published[1]?.payload).toEqual({ featureId: 'feedback' });
  });
});

describe('what a feature contributes', () => {
  it('accepts one item per mode, and every placement on a drawer', () => {
    const items: readonly MenuItem[] = [
      { id: 'a', label: 'Run it', mode: 'action', run: () => undefined },
      { id: 'p', label: 'Peek', mode: 'popover', render: () => null },
      { id: 'm', label: 'About', mode: 'modal', render: () => null },
      ...DRAWER_PLACEMENTS.map((placement): MenuItem => ({
        id: `d-${placement}`,
        label: `Drawer ${placement}`,
        mode: 'drawer',
        placement,
        render: () => null,
      })),
    ];

    // Every mode is represented, so the roster and the items agree
    // without either of them being derived from the other.
    expect(new Set(items.map((item) => item.mode))).toEqual(
      new Set(SURFACE_MODES),
    );
    expect(items.map(drawnAs)).toEqual([
      'run:function',
      'popover:function',
      'modal:function',
      'drawer:start:false',
      'drawer:end:false',
      'drawer:top:false',
      'drawer:bottom:false',
    ]);
  });

  it('accepts a feature that answers no items, and one with no isEnabled', () => {
    // Both shapes are legal and the menu model reads them: a feature
    // answering nothing contributes nothing, and a feature omitting
    // `isEnabled` is always enabled.
    const silent: DevToolsFeature = {
      id: 'silent',
      label: 'Silent',
      isEnabled: () => false,
      items: () => [],
    };

    const always: DevToolsFeature = {
      id: 'always',
      label: 'Always',
      items: (host) => [
        { id: 'ping', label: `Ping ${host.endpoint}`, mode: 'action', run: () => undefined },
      ],
    };

    expect(silent.isEnabled?.(HOST)).toBe(false);
    expect(silent.items(HOST)).toEqual([]);
    expect(always.isEnabled).toBeUndefined();
    expect(always.items(HOST).map((item) => item.label)).toEqual([
      'Ping /__devtools',
    ]);
  });

  it('hands a surface a close and the host, and nothing else', () => {
    let closed = 0;
    const props: SurfaceProps = {
      close: () => {
        closed += 1;
      },
      host: HOST,
    };

    // The claim is the SIZE of the surface a feature is given: two
    // keys, one of which is the single entry point. A third member
    // added to `SurfaceProps` would leave this reading behind.
    expect(Object.keys(props).sort()).toEqual(['close', 'host']);

    props.close();
    props.close();

    expect(closed).toBe(2);
    expect(props.host.settings.corner).toBe('bottom-right');
    expect(props.host.bus.last('error')).toBeUndefined();
  });
});

describe('what mountDevTools takes', () => {
  it('accepts a config naming only its features', () => {
    // Everything but `features` is optional, so the smallest legal
    // config is one key. The readings below are what the shell's
    // defaults are applied ON TOP of: each absent member reads as
    // `undefined` here rather than as a value this module invented.
    const minimal: DevToolsConfig = { features: [] };

    expect(minimal.features).toEqual([]);
    expect(minimal.corner).toBeUndefined();
    expect(minimal.size).toBeUndefined();
    expect(minimal.endpoint).toBeUndefined();
    expect(minimal.extra).toBeUndefined();
    expect(minimal.apiVersion).toBeUndefined();
    expect(minimal.version).toBeUndefined();
    expect(minimal.showEmpty).toBeUndefined();

    // `showEmpty` defaults to TRUE, which is the direction that
    // matters: an app that says nothing gets the shell on its own
    // during a round where no feature has landed yet.
    expect(minimal.showEmpty ?? true).toBe(true);
    expect(({ features: [], showEmpty: false } satisfies DevToolsConfig)
      .showEmpty ?? true).toBe(false);
  });

  it('accepts every corner and size the config may name', async () => {
    const configs = CORNERS.flatMap((corner) => SIZES.map(
      (size): DevToolsConfig => ({ corner, size, features: [] }),
    ));

    expect(configs).toHaveLength(CORNERS.length * SIZES.length);
    expect(configs.map((config) => `${config.corner}/${config.size}`)).toContain(
      'bottom-right/md',
    );

    // The two callable members, read rather than described: `extra`
    // answers a flat record and `apiVersion` answers a promise of a
    // string or `null`.
    const full: DevToolsConfig = {
      corner: 'top-left',
      size: 'lg',
      endpoint: '/__devtools',
      features: [],
      extra: () => ({ route: '/agents', live: true, depth: 2 }),
      apiVersion: () => Promise.resolve(null),
      version: { commit: 'c0ffee1' },
      showEmpty: false,
    };

    expect(full.extra?.()).toEqual({ route: '/agents', live: true, depth: 2 });
    await expect(full.apiVersion?.()).resolves.toBeNull();
  });

  it('takes a partial version, because define may miss a linked dist', () => {
    // A linked `@ar/dev-tools` resolves to `dist/index.js`, which the
    // plugin's `define` never transformed, so the app passes what it
    // knows and the rest falls back. Partial is the point: an app
    // that knows only its commit says only that.
    const known: DevToolsConfig = { features: [], version: { commit: 'c0ffee1' } };
    const all: DevToolsConfig = {
      features: [],
      version: { commit: 'c0ffee1', branch: 'q20b-1', round: 'q20b-1' },
    };

    expect(known.version).toEqual({ commit: 'c0ffee1' });
    expect(all.version?.branch).toBe('q20b-1');

    // `api` is NOT among them: it comes from `apiVersion()` alone, so
    // the config's version cannot name it.
    expect(Object.keys(all.version ?? {})).not.toContain('api');
  });
});

describe('what the status endpoint answers', () => {
  it('carries the build facts, the persistence gate and the gateway', () => {
    const status: DevToolsStatus = {
      commit: 'c0ffee1',
      branch: 'q20b-1',
      round: 'q20b-1',
      persistence: false,
      gateway: 'none',
    };

    // This plan's plugin answers exactly this pair, and the menu reads
    // the first of them: "Save settings" is drawn only when
    // `persistence` is true.
    expect(status.persistence).toBe(false);
    expect(status.gateway).toBe('none');
    expect([status.commit, status.branch, status.round]).toEqual([
      'c0ffee1',
      'q20b-1',
      'q20b-1',
    ]);

    // The absent-repository reading, which is a value and not an
    // error: the plugin answers `unknown` rather than refusing.
    const outsideARepo: DevToolsStatus = {
      commit: 'unknown',
      branch: 'unknown',
      round: 'q20b-1',
      persistence: false,
      gateway: 'none',
    };

    expect(outsideARepo.commit).toBe('unknown');
  });
});

describe('what a bus topic carries', () => {
  it('names four topics, one of which carries a pair of ids', () => {
    // The roster, read as a set so its ORDER is not a contract. Four
    // members, because the union is the payload map's `keyof` and the
    // map has four keys.
    expect(new Set(BUS_TOPICS)).toEqual(
      new Set(['error', 'route', 'artefact', 'open-item']),
    );
    expect(BUS_TOPICS).toHaveLength(4);

    // The typed payload is two ids and nothing else. Read as the key
    // set rather than member by member, so a third member added to the
    // payload would leave this reading behind.
    const payload: DevToolsOpenItemPayload = {
      featureId: 'feedback',
      itemId: 'drawer',
    };

    expect(Object.keys(payload).sort()).toEqual(['featureId', 'itemId']);
    expect(`${payload.featureId}/${payload.itemId}`).toBe('feedback/drawer');
  });

  it('accepts any payload at all on the three unknown topics', () => {
    // The looseness is per topic and deliberate: the three
    // announcement topics are the host app's, their shapes are settled
    // by whatever producer it attaches, and `unknown` is what lets a
    // string, an Error and a record all through the same call.
    const { bus, published } = recordingBus();
    const thrown = new TypeError('devtools-test: x is not a function');

    bus.publish('error', thrown);
    bus.publish('route', '/lexicon');
    bus.publish('artefact', { kind: 'source', id: 42 });
    bus.publish('open-item', { featureId: 'feedback', itemId: 'report' });

    expect(published.map((entry) => entry.topic)).toEqual([
      'error',
      'route',
      'artefact',
      'open-item',
    ]);
    expect(published[0]?.payload).toBe(thrown);
    expect(published[3]?.payload).toEqual({
      featureId: 'feedback',
      itemId: 'report',
    });
  });
});
