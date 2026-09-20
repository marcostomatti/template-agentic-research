import type { DevToolsFeature, DevToolsHost, MenuItem } from './types';

import { describe, expect, it } from 'vitest';

import { resolveOpenItem } from './openItem';

/**
 * ## What this file pins, and what it cannot
 *
 * `openItem.ts` is pure and React-free, so every case here is a plain
 * call and a read of the answer — no renderer, no `document`, no bus.
 * It runs under the jsdom project because that is the project
 * collecting `src/core/**\/*.test.ts`, not because anything below
 * needs a DOM.
 *
 * What it cannot pin is the half that made the resolver necessary:
 * that the shell SUBSCRIBES to `open-item`, that it opens the answered
 * item the way a menu click does, that it announces "Nothing to open"
 * on a `null`, and that it unsubscribes when disposed. Those are
 * `Shell.tsx`'s and the forced Playwright spec's.
 *
 * The four refusals come first, in the order the resolver reaches
 * them, because every one of them answers `null` and a case that
 * merely observed `null` would pass for the wrong reason. Each is
 * built so exactly ONE thing is wrong: the roster, the item id, the
 * gate, the payload. The accepting cases follow, over a roster of
 * three features with the target in the MIDDLE — a resolver that
 * answered `features[0]`, or that never filtered at all, would
 * otherwise pass them.
 */

/** A host every case shares; the resolver reads no member of it. */
const HOST: DevToolsHost = {
  version: { commit: 'c0ffee1', branch: 'main', round: 'q20b-3', api: null },
  endpoint: '/__devtools',
  context: () => ({}),
  settings: { size: 'md', corner: 'bottom-right' },
  bus: {
    subscribe: () => () => undefined,
    publish: () => undefined,
    last: () => undefined,
    recent: () => [],
  },
  fetch: () => Promise.reject(new Error('the resolver never fetches')),
};

/**
 * A second host, so "was handed THE host" is a real reading.
 *
 * Distinguished by its endpoint alone: a case comparing with `toBe`
 * would pass against a clone, and a case comparing the endpoint would
 * pass against either if both said the same thing.
 */
const OTHER_HOST: DevToolsHost = { ...HOST, endpoint: '/__other' };

/** A feature built by {@link recordingFeature}, with its call log. */
interface RecordedFeature {
  /** The contract value to put in the roster. */
  readonly feature: DevToolsFeature;

  /** The hosts `isEnabled` was called with, in call order. */
  readonly enabledCalls: DevToolsHost[];

  /** The hosts `items` was called with, in call order. */
  readonly itemCalls: DevToolsHost[];
}

/** What {@link recordingFeature} needs. */
interface FeatureOptions {
  /** The feature's own id, as an app would spell it. */
  readonly id: string;

  /** What its `items` answers. */
  readonly items: readonly MenuItem[];

  /**
   * What its `isEnabled` answers.
   *
   * Omitted means the feature declares no `isEnabled` at all, which
   * the contract reads as always enabled — a different thing from
   * declaring one that answers `true`, and the reason this is
   * spread in rather than defaulted.
   */
  readonly enabled?: boolean;
}

/**
 * Build a feature that answers fixed values and records its calls.
 *
 * @param options - What the feature is and what it answers.
 * @returns The feature and the two call logs.
 */
function recordingFeature(options: FeatureOptions): RecordedFeature {
  const { enabled } = options;
  const enabledCalls: DevToolsHost[] = [];
  const itemCalls: DevToolsHost[] = [];

  return {
    feature: {
      id: options.id,
      label: `Feature ${options.id}`,
      items: (host) => {
        itemCalls.push(host);

        return options.items;
      },
      ...(enabled === undefined
        ? {}
        : {
          isEnabled: (host) => {
            enabledCalls.push(host);

            return enabled;
          },
        }),
    },
    enabledCalls,
    itemCalls,
  };
}

/**
 * Build an `action` item, the cheapest legal {@link MenuItem}.
 *
 * @param id - The item's own id.
 * @returns The item.
 */
function createItem(id: string): MenuItem {
  return { id, label: `Item ${id}`, mode: 'action', run: () => undefined };
}

/** The item every accepting case resolves to, by identity. */
const DRAWER_ITEM = createItem('drawer');

/** A sibling item, so the matching one is matched and not merely found. */
const ABOUT_ITEM = createItem('about');

/**
 * The roster the accepting cases use: the target in the MIDDLE.
 *
 * The two neighbours hold items of their own, and one of them holds an
 * item whose id is `drawer` too — so a resolver that searched every
 * feature's items would answer the wrong feature's item rather than
 * merely the right one by luck.
 *
 * @param target - The recorded feature under test.
 * @returns Three features, `target` second.
 */
function rosterAround(target: DevToolsFeature): readonly DevToolsFeature[] {
  return [
    recordingFeature({ id: 'router', items: [createItem('drawer')] }).feature,
    target,
    recordingFeature({ id: 'state', items: [createItem('inspect')] }).feature,
  ];
}

describe('what resolveOpenItem refuses', () => {
  it('answers null for a feature id no configured feature holds', () => {
    const held = recordingFeature({
      id: 'feedback',
      items: [DRAWER_ITEM],
    });
    const roster = rosterAround(held.feature);

    const answer = resolveOpenItem(roster, HOST, {
      featureId: 'inspector',
      itemId: 'drawer',
    });

    // A roster holding an item of that id, under another feature, is
    // the point: the pair names a feature FIRST, so the item id
    // matching somewhere else must not be enough.
    expect(answer).toBeNull();
    expect(held.itemCalls).toEqual([]);

    // The empty roster is the same refusal with nothing to search, and
    // it is what an app publishing before anything plugged in hits.
    expect(resolveOpenItem([], HOST, {
      featureId: 'feedback',
      itemId: 'drawer',
    })).toBeNull();

    // The control: the SAME roster, the same item id, the one id the
    // resolver could not find corrected. Without this line the case
    // would pass against a resolver that answered `null` for
    // everything.
    expect(resolveOpenItem(roster, HOST, {
      featureId: 'feedback',
      itemId: 'drawer',
    })).toBe(DRAWER_ITEM);
  });

  it('answers null for an item id the feature does not hold', () => {
    const held = recordingFeature({
      id: 'feedback',
      items: [ABOUT_ITEM, DRAWER_ITEM],
    });
    const roster = rosterAround(held.feature);

    const answer = resolveOpenItem(roster, HOST, {
      featureId: 'feedback',
      itemId: 'report',
    });

    // `toBeNull` rather than a falsy read: `undefined` is what the
    // final `find` answers on its own, and the declared type says
    // `MenuItem | null`.
    expect(answer).toBeNull();

    // The feature WAS asked — an unknown item is not an unknown
    // feature, and the only way to know it is unknown is to look.
    expect(held.itemCalls).toEqual([HOST]);

    // The control, varied along the one axis that matters: the item id.
    expect(resolveOpenItem(roster, HOST, {
      featureId: 'feedback',
      itemId: 'drawer',
    })).toBe(DRAWER_ITEM);
  });

  it('answers null for a feature whose isEnabled answers false, and never asks it for items', () => {
    const disabled = recordingFeature({
      id: 'feedback',
      items: [DRAWER_ITEM],
      enabled: false,
    });

    const answer = resolveOpenItem(
      rosterAround(disabled.feature),
      HOST,
      { featureId: 'feedback', itemId: 'drawer' },
    );

    expect(answer).toBeNull();

    // The gate was reached with the host, and `items` was not reached
    // at all: a feature is only ever asked for rows it may draw,
    // through the bus exactly as through the menu.
    expect(disabled.enabledCalls).toEqual([HOST]);
    expect(disabled.itemCalls).toEqual([]);

    // The control: the same feature, the same pair, `isEnabled`
    // answering `true` instead. So the refusal is the gate's and not
    // the roster's or the ids'.
    const enabled = recordingFeature({
      id: 'feedback',
      items: [DRAWER_ITEM],
      enabled: true,
    });

    expect(resolveOpenItem(
      rosterAround(enabled.feature),
      HOST,
      { featureId: 'feedback', itemId: 'drawer' },
    )).toBe(DRAWER_ITEM);
    expect(enabled.itemCalls).toEqual([HOST]);
  });

  it('answers null for a payload of the wrong shape', () => {
    const held = recordingFeature({
      id: 'feedback',
      items: [DRAWER_ITEM],
    });
    const roster = rosterAround(held.feature);

    // Every value a publisher outside this contract can produce and
    // the topic's declaration forbids: nothing, the wrong primitive,
    // an array, an empty record, half a pair either way round, and a
    // pair whose ids are not strings. The publisher may not have been
    // compiled against `DevToolsOpenItemPayload` at all — a line typed
    // into a console is a legal publisher — so each is a runtime case
    // rather than a compiler one.
    const malformed: readonly unknown[] = [
      undefined,
      null,
      'feedback/drawer',
      42,
      true,
      [],
      ['feedback', 'drawer'],
      {},
      { featureId: 'feedback' },
      { itemId: 'drawer' },
      { featureId: 'feedback', itemId: 7 },
      { featureId: null, itemId: 'drawer' },
    ];

    const answers = malformed.map(
      (payload) => resolveOpenItem(roster, HOST, payload),
    );

    expect(answers).toEqual(malformed.map(() => null));

    // Nothing was searched: a shape that cannot name a feature never
    // reaches one, so no feature callback ran for any of the twelve.
    expect(held.itemCalls).toEqual([]);

    // The control, varied along the payload alone: the well-formed
    // pair, against the same roster and the same host. Without it the
    // twelve `null`s above would pass against a resolver that refused
    // every payload there is.
    expect(resolveOpenItem(roster, HOST, {
      featureId: 'feedback',
      itemId: 'drawer',
    })).toBe(DRAWER_ITEM);
  });
});

describe('what resolveOpenItem answers', () => {
  it('answers the item the pair names, handed through unchanged', () => {
    const held = recordingFeature({
      id: 'feedback',
      items: [ABOUT_ITEM, DRAWER_ITEM],
    });

    const answer = resolveOpenItem(
      rosterAround(held.feature),
      HOST,
      { featureId: 'feedback', itemId: 'drawer' },
    );

    // Identity, not equality: the shell opens the FEATURE's own item —
    // its `run` and its `render` are closures the feature owns — so a
    // resolver that rebuilt a matching object would be wrong while
    // `toEqual` stayed green.
    expect(answer).toBe(DRAWER_ITEM);

    // And the sibling it sits beside was not the one answered, so the
    // match is on the id rather than on position.
    expect(answer).not.toBe(ABOUT_ITEM);
    expect(held.itemCalls).toEqual([HOST]);
  });

  it('reads the items of the feature the pair names, not of the first feature', () => {
    const held = recordingFeature({
      id: 'feedback',
      items: [DRAWER_ITEM],
    });
    const roster = rosterAround(held.feature);

    // `router`, first in the roster, holds an item id'd `drawer` too.
    const answer = resolveOpenItem(roster, HOST, {
      featureId: 'feedback',
      itemId: 'drawer',
    });

    expect(answer).toBe(DRAWER_ITEM);

    // The neighbour's own pair still resolves to the neighbour's item,
    // which is what makes the line above a reading of the id match
    // rather than of the order.
    const neighbour = resolveOpenItem(roster, HOST, {
      featureId: 'router',
      itemId: 'drawer',
    });

    expect(neighbour).not.toBeNull();
    expect(neighbour).not.toBe(DRAWER_ITEM);
    expect(neighbour?.label).toBe('Item drawer');
  });

  it('hands the host it was given to isEnabled and to items', () => {
    const held = recordingFeature({
      id: 'feedback',
      items: [DRAWER_ITEM],
      enabled: true,
    });
    const roster = [held.feature];
    const payload = { featureId: 'feedback', itemId: 'drawer' };

    expect(resolveOpenItem(roster, HOST, payload)).toBe(DRAWER_ITEM);
    expect(resolveOpenItem(roster, OTHER_HOST, payload)).toBe(DRAWER_ITEM);

    // Both callbacks got the host of THAT call, in order, by identity:
    // the resolver holds no host of its own and captures none between
    // calls.
    expect(held.enabledCalls).toEqual([HOST, OTHER_HOST]);
    expect(held.itemCalls).toEqual([HOST, OTHER_HOST]);
    expect(held.itemCalls[1]).toBe(OTHER_HOST);
  });

  it('resolves a payload carrying more than the two ids', () => {
    const held = recordingFeature({
      id: 'feedback',
      items: [DRAWER_ITEM],
    });

    // A publisher that grows its payload still opens today's item: the
    // check asks whether the two ids are there, never whether anything
    // else is.
    const answer = resolveOpenItem(
      rosterAround(held.feature),
      HOST,
      { featureId: 'feedback', itemId: 'drawer', at: 1_700_000_000, why: 'x' },
    );

    expect(answer).toBe(DRAWER_ITEM);
  });

  it('lets a throw from isEnabled and from items escape', () => {
    const payload = { featureId: 'feedback', itemId: 'drawer' };
    const gate: DevToolsFeature = {
      id: 'feedback',
      label: 'Feedback',
      isEnabled: () => {
        throw new Error('isEnabled is broken');
      },
      items: () => [DRAWER_ITEM],
    };
    const rows: DevToolsFeature = {
      id: 'feedback',
      label: 'Feedback',
      items: () => {
        throw new Error('items is broken');
      },
    };

    // Loud, not `null`: the operator of a dev tool is the author of the
    // feature, and `./menuModel.ts` lets the same two throws escape for
    // the same reason. A caught throw here would read as "no such
    // item".
    expect(() => resolveOpenItem([gate], HOST, payload))
      .toThrow('isEnabled is broken');
    expect(() => resolveOpenItem([rows], HOST, payload))
      .toThrow('items is broken');

    // The control: a payload naming neither feature throws nothing,
    // because neither callback is reached. So the two throws above are
    // the callbacks' and not the resolver's.
    expect(resolveOpenItem([gate, rows], HOST, {
      featureId: 'inspector',
      itemId: 'drawer',
    })).toBeNull();
  });
});
