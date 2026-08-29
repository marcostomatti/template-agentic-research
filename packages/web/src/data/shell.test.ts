import type {
  NotificationItem,
  NotificationLevel,
  SearchSuggestion,
  SearchSuggestionKind,
} from '@ar/ui';

import { describe, expect, it } from 'vitest';

import { SURFACES } from '../routes/paths';
import { repeated } from '../test-support/repeated';

import { CONNECTORS, EXPORT_SUBSCRIPTIONS } from './connectors';
import { ENTITIES, FINDINGS } from './digest';
import { DEFAULT_DOMAIN_SLUG, getDomain } from './domains';
import { CATEGORIES, TERMS } from './lexicon';
import { PERSONAS } from './personas';
import {
  NOTIFICATIONS,
  OPERATOR,
  SEARCH_SUGGESTIONS,
  getOperator,
  listNotifications,
  listSearchSuggestions,
} from './shell';
import { SOURCES } from './sources';

/**
 * Every kind `SearchSuggestionKind` admits, written out.
 *
 * The annotation is the load-bearing half: a member RENAMED or
 * REMOVED in `@ar/ui` makes one of these literals unassignable and
 * reddens `check-types` here, which is the direction the fixture's
 * own `Record` cannot catch (a record over a smaller union is simply
 * a record with an excess key). The record catches the other
 * direction — a kind ADDED — as a missing key.
 */
const KINDS: readonly SearchSuggestionKind[] = [
  'agent',
  'session',
  'task',
  'tool',
  'doc',
];

/** Every level the bell groups by, written out. Same reasoning. */
const LEVELS: readonly NotificationLevel[] = ['ok', 'warn', 'err', 'info'];

/**
 * The suggestion filed under a kind.
 *
 * Throws rather than answering `undefined` so a fixture that lost a
 * kind fails in the test that reads it rather than several lines
 * later against a member of `undefined`. Called inside each `it` and
 * never at `describe` scope: a describe body runs at collection time,
 * so a throw there would take the whole file down and cost every
 * other test its attribution.
 *
 * @param kind - The kind to look up.
 * @returns Its suggestion.
 */
function suggestionFor(kind: SearchSuggestionKind): SearchSuggestion {
  const found = SEARCH_SUGGESTIONS.find(
    (suggestion) => suggestion.kind === kind,
  );

  if (!found) {
    throw new Error(`No suggestion for kind: ${kind}`);
  }

  return found;
}

/**
 * The notification filed under a level.
 *
 * @param level - The level to look up.
 * @returns Its notification.
 */
function notificationFor(level: NotificationLevel): NotificationItem {
  const found = NOTIFICATIONS.find(
    (notification) => notification.level === level,
  );

  if (!found) {
    throw new Error(`No notification for level: ${level}`);
  }

  return found;
}

/**
 * The surface a context line opens with.
 *
 * @param suggestion - A palette entry.
 * @returns The leading token of its `sub`, or `''` when it has none.
 */
function surfaceOf(suggestion: SearchSuggestion): string {
  return (suggestion.sub ?? '').split(' · ')[0] ?? '';
}

describe('SEARCH_SUGGESTIONS', () => {
  it('names only kinds the union admits', () => {
    // The membership claim. Worth being honest about its reach: the
    // fixture is typed `readonly SearchSuggestion[]`, so the compiler
    // already refuses a kind outside the union and this can only fail
    // on a cast — which is exactly how one would arrive, since the
    // research vocabulary these stand for (finding, term, source,
    // persona, connector) has no member of this union spelled like
    // it. The claim with teeth at runtime is the coverage one below.
    // Arrange / Act
    const kinds = SEARCH_SUGGESTIONS.map((suggestion) => suggestion.kind);

    // Assert
    expect(kinds).not.toHaveLength(0);
    expect(kinds.filter((kind) => !KINDS.includes(kind))).toEqual([]);
  });

  it('covers every kind exactly once', () => {
    // The half the fixture's `Record` cannot state and a page would
    // notice: `SearchSuggest` gives each kind its own accent pill, so
    // a kind with no entry is chrome no demo and no screenshot ever
    // exercises. Sorted on both sides because it is a set claim; the
    // order claim is its own test below.
    // Arrange / Act
    const kinds = SEARCH_SUGGESTIONS.map((suggestion) => suggestion.kind);

    // Assert
    expect([...kinds].sort()).toEqual([...KINDS].sort());
    expect(repeated(kinds)).toEqual([]);
  });

  it('renders in nav order', () => {
    // Compared against a literal rather than against anything derived
    // from the module, so this is an order claim and not a
    // restatement: `SearchSuggest` shows the first five suggestions
    // before anything is typed, and this order is the one that makes
    // the panel and the sidebar read the same way round.
    // Arrange / Act / Assert
    expect(SEARCH_SUGGESTIONS.map((suggestion) => suggestion.kind)).toEqual([
      'doc',
      'task',
      'session',
      'agent',
      'tool',
    ]);
  });

  it('opens every context line with a surface the router carries', () => {
    // The mono line under a label says where the hit lives before it
    // says what it is, which is only useful while the word is a real
    // surface. A surface renamed in `NAV_ITEMS` reddens here rather
    // than shipping a palette pointing at a page that no longer
    // exists under that name.
    // Arrange
    const surfaceIds = SURFACES.map((surface) => surface.id);

    // Act
    const named = SEARCH_SUGGESTIONS.map((suggestion) => surfaceOf(suggestion));

    // Assert
    expect(named).not.toHaveLength(0);
    expect(named.filter((id) => !surfaceIds.includes(id))).toEqual([]);
  });

  it('offers one hit per content surface, leaving settings out', () => {
    // What makes five kinds the right number: every surface holding
    // content is reachable from the unfiltered panel, and settings —
    // which holds preferences rather than anything searchable — is
    // deliberately absent. A second hit on one surface would push
    // another off the five `SearchSuggest` shows.
    // Arrange
    const content = SURFACES
      .map((surface) => surface.id)
      .filter((id) => id !== 'settings');

    // Act
    const named = SEARCH_SUGGESTIONS.map((suggestion) => surfaceOf(suggestion));

    // Assert
    expect([...named].sort()).toEqual([...content].sort());
  });

  it('names an entity and a verdict the digest fixtures carry', () => {
    // First of the five cross-module pins. Nothing joins a palette
    // label to the row it names at compile time, so a subject renamed
    // in `./digest.ts` would leave a suggestion pointing at nothing —
    // findable here and nowhere else, since this is the module that
    // holds both sides.
    // Arrange
    const suggestion = suggestionFor('doc');

    // Act
    const entity = ENTITIES.find((row) => row.name === suggestion.label);
    const ruled = FINDINGS.filter((row) => row.entityId === entity?.id);

    // Assert
    expect(entity).toBeDefined();
    expect(ruled.map((row) => row.verdict)).toContain('caution');
    expect(suggestion.sub).toContain('caution');
  });

  it('names a term the lexicon fixtures carry, under its category', () => {
    // Arrange
    const suggestion = suggestionFor('task');

    // Act
    const term = TERMS.find((row) => row.pattern === suggestion.label);
    const category = CATEGORIES.find((row) => row.id === term?.categoryId);

    // Assert
    expect(term?.polarity).toBe('negative');
    expect(suggestion.sub).toContain('negative');
    expect(category?.key).toBe('technologies');
    expect(suggestion.sub).toContain('technologies');
  });

  it('names a source endpoint the source fixtures carry', () => {
    // The label is the endpoint with its scheme stripped, because
    // nobody types a scheme into a search box. Reconstructed here
    // rather than compared loosely, so the pin is exact.
    // Arrange
    const suggestion = suggestionFor('session');

    // Act
    const source = SOURCES.find(
      (row) => row.endpoint === `https://${suggestion.label}`,
    );

    // Assert
    expect(source).toBeDefined();
    expect(source?.kind).toBe('api');
    expect(suggestion.sub).toContain('api');
  });

  it('names a persona role and the domain it belongs to', () => {
    // Arrange
    const suggestion = suggestionFor('agent');
    const domain = getDomain(DEFAULT_DOMAIN_SLUG);

    // Act
    const persona = PERSONAS.find(
      (row) => row.role === suggestion.label && row.domainId === domain.id,
    );

    // Assert
    expect(persona).toBeDefined();
    expect(suggestion.sub).toContain(domain.name);
  });

  it('names a connector the connector fixtures carry, with its kind', () => {
    // Arrange
    const suggestion = suggestionFor('tool');

    // Act
    const connector = CONNECTORS.find((row) => row.name === suggestion.label);

    // Assert
    expect(connector?.kind).toBe('search');
    expect(suggestion.sub).toContain('search');
  });

  it('refuses a write to the palette or to a suggestion in it', () => {
    // `readonly` is a compile-time claim and the value handed over is
    // an ordinary array any consumer can reach past it. One shared
    // palette, no accessor copying it: a caller sorting it in place
    // would reorder what every later reader in the tab renders.
    // Arrange
    const first = suggestionFor('doc');
    const label = first.label;

    // Act / Assert
    expect(() => {
      (SEARCH_SUGGESTIONS as SearchSuggestion[]).push({
        kind: 'doc',
        label: 'appended',
      });
    }).toThrow(TypeError);
    expect(() => {
      (first as { label: string }).label = 'renamed';
    }).toThrow(TypeError);

    // Read back, so the claim is that neither write took rather than
    // that the fixture happens to hold particular values.
    expect(SEARCH_SUGGESTIONS).toHaveLength(KINDS.length);
    expect(suggestionFor('doc').label).toBe(label);
  });
});

describe('NOTIFICATIONS', () => {
  it('names only levels the bell groups by', () => {
    // Same reach as the palette's membership test: the compiler
    // already refuses a level outside the union, so this catches a
    // cast. The coverage claim below is the one a page would notice.
    // Arrange / Act
    const levels = NOTIFICATIONS.map((notification) => notification.level);

    // Assert
    expect(levels).not.toHaveLength(0);
    expect(levels.filter((level) => !LEVELS.includes(level))).toEqual([]);
  });

  it('covers every level exactly once', () => {
    // `NotificationsBell` renders a group per level and skips the
    // empty ones, so a level with no row leaves that group heading
    // and puck tone unrehearsed by every demo. Once each, because a
    // second row in one group would say something about grouping the
    // fixture does not mean to say.
    // Arrange / Act
    const levels = NOTIFICATIONS.map((notification) => notification.level);

    // Assert
    expect([...levels].sort()).toEqual([...LEVELS].sort());
    expect(repeated(levels)).toEqual([]);
  });

  it('keys each row once, and titles and dates every one', () => {
    // The non-emptiness guard the whole-list claims above rest on, and
    // the duplicate-id check a React list needs: two rows sharing an
    // id render as one, and the second silently replaces what the
    // first showed.
    // Arrange / Act
    const ids = NOTIFICATIONS.map((notification) => notification.id);

    // Assert
    expect(repeated(ids)).toEqual([]);
    expect(NOTIFICATIONS.filter((row) => !row.title)).toEqual([]);
    expect(NOTIFICATIONS.filter((row) => !row.time)).toEqual([]);
  });

  it('leaves unread uncorrelated with level', () => {
    // The near-miss pair. The bell dots on unread ALONE, so a fixture
    // whose unread rows are also its alarming ones lets a bell that
    // dotted on level pass for one that reads the flag — and a
    // mark-all-read that cleared nothing would look right too. So the
    // benign row is unread and a warning row is read.
    // Arrange / Act
    const unread = NOTIFICATIONS.filter((row) => row.unread);

    // Assert
    expect(unread).toHaveLength(2);
    expect(notificationFor('ok').unread).toBe(true);
    expect(notificationFor('warn').unread).toBe(false);
  });

  it('reports two source states the source fixtures are actually in', () => {
    // The cross-module pin for the two rows about sources. Both name
    // an endpoint and make a claim about it — a streak of two, and a
    // flag standing on its own — which are precisely the pair
    // `./sources.ts` keeps distinct. A notification claiming a state
    // no row is in is a bell reporting on a page that disagrees with
    // it.
    // Arrange
    const failing = SOURCES.find((row) => row.consecutiveFailures === 2);
    const flagged = SOURCES.find(
      (row) => row.flagged && row.consecutiveFailures === 0,
    );

    // Act
    const err = String(notificationFor('err').body);
    const warn = String(notificationFor('warn').body);

    // Assert
    expect(failing).toBeDefined();
    expect(err).toContain(failing?.endpoint.replace('https://', ''));
    expect(flagged).toBeDefined();
    expect(warn).toContain(flagged?.endpoint.replace('https://', ''));
  });

  it('reports an export the connector fixtures subscribe to', () => {
    // The `ok` row names a format and a destination, and both have to
    // belong to a subscription that exists: a digest reported as
    // written to a target nothing exports to is the bell inventing a
    // pipeline.
    // Arrange
    const body = String(notificationFor('ok').body);

    // Act
    const subscribed = EXPORT_SUBSCRIPTIONS.filter((row) => {
      const target = CONNECTORS.find((one) => one.id === row.connectorId);

      return body.includes(row.format) && body.includes(target?.name ?? ' ');
    });

    // Assert
    expect(subscribed).not.toHaveLength(0);
  });

  it('reports a finding the digest fixtures leave unruled', () => {
    // The `info` row says a finding is waiting for a verdict. The
    // state it names is the pair of nulls `./digest.ts` keeps
    // deliberately distinct from a finding scored to zero, so a
    // fixture that lost it would leave this notification describing
    // an empty queue.
    // Arrange / Act
    const waiting = FINDINGS.filter(
      (row) => row.verdict === null && row.score === null,
    );

    // Assert
    expect(waiting).not.toHaveLength(0);
    expect(String(notificationFor('info').body)).toContain('unruled');
  });

  it('refuses a write to the list or to a notification in it', () => {
    // The bell is parent-owned: the shell answers `onMarkAllRead`
    // with a NEW list. Flipping `unread` on the fixture instead is
    // the shortcut that looks like it worked — every later reader in
    // the tab sees it, and a reload does not.
    // Arrange
    const first = notificationFor('err');
    const unread = first.unread;

    // Act / Assert
    expect(() => {
      (NOTIFICATIONS as NotificationItem[]).push({
        id: 'appended',
        level: 'info',
        title: 'appended',
      });
    }).toThrow(TypeError);
    expect(() => {
      (first as { unread: boolean }).unread = false;
    }).toThrow(TypeError);

    expect(NOTIFICATIONS).toHaveLength(LEVELS.length);
    expect(notificationFor('err').unread).toBe(unread);
  });
});

describe('OPERATOR', () => {
  it('names the local operator the profile menu renders', () => {
    // The pin, and the non-emptiness guard behind the freeze test
    // below: `ProfileMenu` renders all three members — initials from
    // the name, the address under it, the role as a badge — so a
    // blank member is a menu opening onto a gap.
    // Arrange / Act / Assert
    expect(OPERATOR).toEqual({
      name: 'Local Operator',
      email: 'operator@localhost',
      role: 'owner',
    });
  });

  it('refuses a write to the operator', () => {
    // Arrange
    const before = OPERATOR.role;

    // Act / Assert
    expect(() => {
      (OPERATOR as { role: string }).role = 'member';
    }).toThrow(TypeError);
    expect(OPERATOR.role).toBe(before);
  });
});

describe('the shell accessors', () => {
  it('hand back the frozen fixtures rather than copies', () => {
    // Deliberately identity, not equality. A spread copy would
    // satisfy `toEqual` while being a fresh UNFROZEN value — the one
    // thing a caller can write in place and believe the write took —
    // so identity is the only form of this assertion that fails on
    // the mutation it exists to catch.
    // Arrange / Act / Assert
    expect(listSearchSuggestions()).toBe(SEARCH_SUGGESTIONS);
    expect(listNotifications()).toBe(NOTIFICATIONS);
    expect(getOperator()).toBe(OPERATOR);
    expect(Object.isFrozen(listSearchSuggestions())).toBe(true);
    expect(Object.isFrozen(listNotifications())).toBe(true);
    expect(Object.isFrozen(getOperator())).toBe(true);
  });

  it('take no domain argument at all', () => {
    // The property `./api.ts` has to know about: all three are
    // deployment-level, so none of them can reject an unknown domain
    // slug and the barrel-wide "rejects an unknown slug" test has to
    // name them among its exceptions. Read off the functions
    // themselves rather than asserted in prose, so a later edit that
    // scopes one of these reddens here and sends the next reader to
    // that test.
    // Arrange / Act / Assert
    expect(listSearchSuggestions).toHaveLength(0);
    expect(listNotifications).toHaveLength(0);
    expect(getOperator).toHaveLength(0);
  });
});
