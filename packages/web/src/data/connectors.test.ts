import type { Connector } from './types';

import { describe, expect, it } from 'vitest';

import { repeated } from '../test-support/repeated';

import {
  CONNECTORS,
  EXPORT_SUBSCRIPTIONS,
  REDACTED,
  classifyConnector,
  findConnector,
  findConnectorByName,
  findExportSubscription,
  getConnector,
  getExportSubscription,
  listConnectors,
  listExportSubscriptions,
  summarizeExportSubscriptions,
} from './connectors';
import {
  DEFAULT_DOMAIN_SLUG,
  SPARSE_DOMAIN_SLUG,
  getDomain,
} from './domains';
import { FIXTURE_NOW } from './types';

/**
 * Whether a config key is one a credential would be stored under.
 *
 * Matches on the SHAPE of a key rather than on a list of exact names,
 * so a row added later under a spelling nobody thought of is still
 * checked. The fixtures carry `apiKey` and `password`, which is why
 * this is a pattern and not a two-member set.
 *
 * @param key - A `connectors.config` key.
 * @returns Whether a value under it has to be redacted.
 */
function isSecretKey(key: string): boolean {
  return /key|token|password|secret|credential/i.test(key);
}

/** One credential-shaped config entry, as an assertion reports it. */
interface SecretEntry {
  /** The `connectors.config` key it was stored under. */
  readonly key: string;
  /** What was stored there. */
  readonly value: unknown;
}

/**
 * The credential-shaped entries of one config.
 *
 * Returns the pairs rather than a boolean so a failure prints the
 * offending key AND what was stored under it — which is the whole
 * point of the assertion, and something a count could not give.
 *
 * @param config - A `connectors.config` payload.
 * @returns Its credential-shaped entries, in declaration order.
 */
function secretEntries(
  config: Readonly<Record<string, unknown>>,
): readonly SecretEntry[] {
  return Object.entries(config)
    .filter(([key]) => isSecretKey(key))
    .map(([key, value]) => ({ key, value }));
}

describe('isSecretKey', () => {
  // The redaction sweep below is a whole-table claim, and a whole-table
  // claim is only as good as the predicate behind it: a matcher that
  // returned false for everything would make every row pass with
  // nothing checked. These four cases are what turn that sweep into
  // evidence.
  it('matches the credential spellings the fixtures use', () => {
    // Arrange / Act / Assert
    expect(isSecretKey('apiKey')).toBe(true);
    expect(isSecretKey('password')).toBe(true);
  });

  it('matches credential spellings no fixture uses yet', () => {
    // The reason it is a pattern: a row added under one of these is
    // covered without anybody remembering to widen a list.
    // Arrange / Act / Assert
    expect(isSecretKey('accessToken')).toBe(true);
    expect(isSecretKey('clientSecret')).toBe(true);
    expect(isSecretKey('credentialFile')).toBe(true);
  });

  it('leaves ordinary config keys alone', () => {
    // If this matched everything, the sweep would demand `[redacted]`
    // for every address in the table and the fixtures could carry no
    // endpoints at all.
    // Arrange / Act / Assert
    expect(isSecretKey('endpoint')).toBe(false);
    expect(isSecretKey('model')).toBe(false);
    expect(isSecretKey('path')).toBe(false);
  });

  it('reports a credential-shaped key that is not redacted', () => {
    // The near-miss the sweep exists to catch, fed to the helper
    // directly: a config that looks exactly like the fixtures except
    // for the one value that matters.
    // Arrange
    const leaky = { endpoint: 'https://api.example.com', apiKey: 'abc123' };

    // Act / Assert
    expect(secretEntries(leaky)).toEqual([{ key: 'apiKey', value: 'abc123' }]);
  });
});

describe('CONNECTORS', () => {
  it('carries a connector of every kind, named', () => {
    // The non-emptiness guard every table-driven claim below rests on,
    // and the coverage claim in one: the tools grid renders a kind
    // badge per card and the editor modal branches per kind, so a kind
    // no fixture carries is a branch nothing rehearses.
    //
    // Keyed on the name rather than on a position, so a failure prints
    // the offending row instead of an index.
    // Arrange / Act
    const catalog = CONNECTORS.map((connector) => ({
      kind: connector.kind,
      name: connector.name,
    }));

    // Assert
    expect(catalog).toEqual([
      { kind: 'llm', name: 'primary' },
      { kind: 'llm', name: 'long-context' },
      { kind: 'search', name: 'web' },
      { kind: 'notebook', name: 'research' },
      { kind: 'export_target', name: 'notes-directory' },
      { kind: 'export_target', name: 'static-feed' },
      { kind: 'export_target', name: 'mail-drafts' },
    ]);
  });

  it('redacts every credential-shaped config value', () => {
    // These files are tracked and this payload is rendered, so the
    // convention is asserted rather than trusted to be remembered: the
    // cost of getting it wrong once is a secret in a public git
    // history, not a broken page.
    //
    // The sweep runs over the whole table and reports the offending
    // key and value, which is what a fixture author needs to see.
    // Arrange / Act
    const unredacted = CONNECTORS.flatMap(
      (connector) => secretEntries(connector.config)
        .filter((entry) => entry.value !== REDACTED)
        .map((entry) => ({ name: connector.name, ...entry })),
    );

    // Assert
    expect(unredacted).toEqual([]);
  });

  it('carries at least one credential to redact', () => {
    // Without this, the sweep above passes over a table whose configs
    // hold no credential-shaped key at all — the same vacuous shape a
    // dead grep needle has, and one an edit could reach by renaming
    // the two keys rather than by leaking anything.
    // Arrange / Act
    const withSecrets = CONNECTORS.filter(
      (connector) => secretEntries(connector.config).length > 0,
    );

    // Assert
    expect(withSecrets.map((connector) => connector.name))
      .toEqual(['primary', 'long-context', 'web', 'research']);
  });

  it('carries a config with no credential at all', () => {
    // The other half of the pair: a filesystem destination needs no
    // secret, and a page rendering "credentials configured" off the
    // presence of a key would report this row as unfinished.
    // Arrange / Act
    const withoutSecrets = CONNECTORS.filter(
      (connector) => secretEntries(connector.config).length === 0,
    );

    // Assert
    expect(withoutSecrets.map((connector) => connector.name))
      .toEqual(['notes-directory', 'static-feed', 'mail-drafts']);
  });

  it('gives every connector a distinct id', () => {
    // The tools edit sub-route carries an id, so a collision would open
    // whichever row the lookup map happened to keep.
    // Arrange / Act
    const ids = CONNECTORS.map((connector) => connector.id);

    // Assert
    expect(repeated(ids)).toEqual([]);
  });

  it('gives every connector a distinct name within its kind', () => {
    // `connectors_kind_name_unique` is the pair an upsert lands on, so
    // a repeated name within one kind is two rows claiming the same
    // service with different addresses — and a run resolving that name
    // would have to choose between them.
    // Arrange / Act
    const pairs = CONNECTORS.map(
      (connector) => `${connector.kind}/${connector.name}`,
    );

    // Assert
    expect(repeated(pairs)).toEqual([]);
  });

  it('never leaves a connector name empty', () => {
    // NOT NULL is not the same as non-empty. An empty name is half the
    // natural key gone: it takes the place the next row of that kind
    // means to occupy, and the upsert that should have updated it
    // inserts a rival instead.
    // Arrange / Act
    const blank = CONNECTORS.filter(
      (connector) => connector.name.trim() === '',
    );

    // Assert
    expect(blank).toEqual([]);
  });
});

describe('classifyConnector', () => {
  it('reads an empty config as unconfigured', () => {
    // The schema's own reading: an empty config means there is nowhere
    // to reach, so the row names a service the pipeline cannot call
    // rather than one it calls with defaults. Selected by name rather
    // than by id, so a renumbering of the table leaves this pointed at
    // the row it is about.
    // Arrange / Act
    const statuses = CONNECTORS.filter(
      (connector) => connector.name === 'mail-drafts',
    ).map(classifyConnector);

    // Assert
    expect(statuses).toEqual(['unconfigured']);
  });

  it('reads every configured row as ready', () => {
    // Named rather than counted, so a row that changed status says
    // which one it was.
    // Arrange / Act
    const ready = CONNECTORS.filter(
      (connector) => classifyConnector(connector) === 'ready',
    );

    // Assert
    expect(ready.map((connector) => connector.name)).toEqual([
      'primary',
      'long-context',
      'web',
      'research',
      'notes-directory',
      'static-feed',
    ]);
  });

  it('gives the fixture table both statuses', () => {
    // The card's `StatusIndicator` has a tone per status, so a status
    // no fixture reaches is a tone nothing rehearses. Asserted as the
    // SET rather than the count, so a failure names which one went.
    // Arrange / Act
    const reached = new Set(CONNECTORS.map(classifyConnector));

    // Assert
    expect([...reached].sort()).toEqual(['ready', 'unconfigured']);
  });

  it('does not read a config of falsy values as unconfigured', () => {
    // The near-miss: a check written as `!connector.config` or against
    // the truthiness of its members passes this row off as empty, and
    // the page then reports a configured destination as having nowhere
    // to reach. Built here rather than found, because no fixture row
    // carries it.
    // Arrange
    const zeroed: Connector = {
      id: -1,
      kind: 'search',
      name: 'zeroed',
      config: { resultLimit: 0 },
    };

    // Act / Assert
    expect(classifyConnector(zeroed)).toBe('ready');
  });
});

describe('listConnectors', () => {
  it('returns every connector, in configuration order', () => {
    // Takes no domain, unlike every other list accessor here, because
    // `connectors` has no `domain_id`: the row is a fact about the
    // installation and the same cards render whichever domain is
    // active.
    // Arrange / Act
    const listed = listConnectors();

    // Assert
    expect(listed.map((connector) => connector.id))
      .toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('never hands back the stored table', () => {
    // It copies rather than filters, so this is the only assertion
    // standing between the accessor and a caller who sorts it in place
    // and reorders every later reader in the same process.
    // Arrange / Act / Assert
    expect(listConnectors()).not.toBe(CONNECTORS);
  });

  it('leaves the stored order untouched when a caller sorts', () => {
    // The mutation the copy exists to stop, performed: a page sorting
    // its own list by name must not renumber the fixture table for
    // whatever renders next.
    //
    // The cast is the point rather than a convenience. `readonly` is a
    // compile-time claim and nothing else — the value handed over is an
    // ordinary array, reachable in place by any consumer that is not
    // this compiler — so an assertion that spread the result first
    // would sort a copy of a copy and could never fail.
    // Arrange
    const before = CONNECTORS.map((connector) => connector.id);

    // Act
    (listConnectors() as Connector[]).sort(
      (a, b) => a.name.localeCompare(b.name),
    );

    // Assert
    expect(CONNECTORS.map((connector) => connector.id)).toEqual(before);
  });
});

describe('findConnector', () => {
  it('finds every fixture connector by its own id', () => {
    // Arrange / Act
    const missed = CONNECTORS.filter(
      (connector) => findConnector(connector.id) !== connector,
    );

    // Assert
    expect(missed).toEqual([]);
  });

  it('answers undefined for an id no fixture carries', () => {
    // The tolerant twin exists because a connector id DOES arrive from
    // the URL — the tools edit sub-route carries one — so a stale link
    // is an ordinary outcome the page answers with a not-found state.
    // Arrange / Act / Assert
    expect(findConnector(-1)).toBeUndefined();
  });
});

describe('getConnector', () => {
  it('returns the connector carrying the id', () => {
    // Arrange / Act
    const found = CONNECTORS.map((connector) => getConnector(connector.id));

    // Assert
    expect(found).toEqual([...CONNECTORS]);
  });

  it('throws naming the id it could not find', () => {
    // The message is what a fixture author reads first, so it carries
    // the id rather than only the fact of the miss.
    // Arrange / Act / Assert
    expect(() => getConnector(-1)).toThrow('-1');
  });
});

describe('findConnectorByName', () => {
  it('finds every fixture connector by its own kind and name', () => {
    // Arrange / Act
    const missed = CONNECTORS.filter(
      (connector) => findConnectorByName(connector.kind, connector.name)
        !== connector,
    );

    // Assert
    expect(missed).toEqual([]);
  });

  it('tells two instances of one kind apart by name', () => {
    // What the pair key is for, and the reason the fixture set carries
    // two `llm` rows: a deployment runs one model for the researcher
    // and a longer-context one for the drafter.
    // Arrange / Act
    const primary = findConnectorByName('llm', 'primary');
    const long = findConnectorByName('llm', 'long-context');

    // Assert
    expect(primary?.id).toBe(1);
    expect(long?.id).toBe(2);
  });

  it('answers undefined for a name of a kind that has none', () => {
    // The near-miss the composite key exists for. A lookup keyed on the
    // NAME alone answers this with the llm connector — another kind's
    // address, which is a wrong answer rather than a missing one, and
    // the one failure mode a page could not detect.
    // Arrange / Act / Assert
    expect(findConnectorByName('search', 'primary')).toBeUndefined();
    expect(findConnectorByName('notebook', 'static-feed')).toBeUndefined();
  });

  it('answers undefined for a name nothing carries', () => {
    // Arrange / Act / Assert
    expect(findConnectorByName('llm', 'secondary')).toBeUndefined();
  });

  it('matches a name exactly', () => {
    // A map lookup, so the name has to be spelled the way it was
    // configured. Pinned rather than left implied: a normalizing lookup
    // would make two instances differing only in case resolve to one
    // row, which the table's unique key does not.
    // Arrange / Act / Assert
    expect(findConnectorByName('llm', 'Primary')).toBeUndefined();
    expect(findConnectorByName('llm', 'primary ')).toBeUndefined();
  });
});

describe('EXPORT_SUBSCRIPTIONS', () => {
  it('carries the standing deliveries, in subscription order', () => {
    // The non-emptiness guard, and the pin on what each row delivers
    // where. Keyed on the format and the destination NAME rather than
    // the connector id, so a failure names the service rather than a
    // number the reader would have to look up.
    // Arrange / Act
    const deliveries = EXPORT_SUBSCRIPTIONS.map((subscription) => ({
      format: subscription.format,
      target: getConnector(subscription.connectorId).name,
      enabled: subscription.enabled,
    }));

    // Assert
    expect(deliveries).toEqual([
      { format: 'obsidian_md', target: 'notes-directory', enabled: true },
      { format: 'pdf', target: 'notes-directory', enabled: true },
      { format: 'rss', target: 'static-feed', enabled: true },
      { format: 'rss', target: 'notes-directory', enabled: true },
      { format: 'email_draft', target: 'mail-drafts', enabled: false },
    ]);
  });

  it('gives every subscription a distinct id', () => {
    // Arrange / Act
    const ids = EXPORT_SUBSCRIPTIONS.map((subscription) => subscription.id);

    // Assert
    expect(repeated(ids)).toEqual([]);
  });

  it('gives every subscription a distinct domain, format and target', () => {
    // `export_subscriptions_domain_id_format_connector_id_unique` is
    // the TRIPLE a seed pass upserts on. A repeat would be two rows
    // rendering the same artifact to the same place on independent
    // schedules, which costs twice over — once in the rendering, again
    // at the far end.
    // Arrange / Act
    const triples = EXPORT_SUBSCRIPTIONS.map(
      (subscription) => [
        subscription.domainId,
        subscription.format,
        subscription.connectorId,
      ].join('/'),
    );

    // Assert
    expect(repeated(triples)).toEqual([]);
  });

  it('repeats both pairs inside that triple', () => {
    // The reason the key is all three columns and not either pair
    // inside it, asserted against the fixture rows rather than argued:
    // one domain wants two artifacts in one place, and one artifact in
    // two places. A distinctness guard keyed on either pair reddens
    // against these rows, which is what makes the guard above a
    // measurement rather than a formality.
    // Arrange / Act
    const byDomainAndTarget = EXPORT_SUBSCRIPTIONS.map(
      (subscription) => `${subscription.domainId}/${subscription.connectorId}`,
    );
    const byDomainAndFormat = EXPORT_SUBSCRIPTIONS.map(
      (subscription) => `${subscription.domainId}/${subscription.format}`,
    );

    // Assert
    expect(repeated(byDomainAndTarget)).not.toEqual([]);
    expect(repeated(byDomainAndFormat)).not.toEqual([]);
  });

  it('delivers only to export targets', () => {
    // A subscription may name no other kind — the schema's FK points at
    // `connectors` and the format renderer hands its artifact to an
    // export target. The module resolves these by name and so cannot
    // reach another kind today; this is the guard against a future
    // edit that cites an id directly.
    // Arrange / Act
    const wrongKind = EXPORT_SUBSCRIPTIONS.filter(
      (subscription) => getConnector(subscription.connectorId).kind
        !== 'export_target',
    );

    // Assert
    expect(wrongKind).toEqual([]);
  });

  it('belongs entirely to the seeded domain', () => {
    // The sparse domain is the shell's route to its empty states, so a
    // row leaking into it would fill a page that is meant to be bare.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const strays = EXPORT_SUBSCRIPTIONS.filter(
      (subscription) => subscription.domainId !== seededId,
    );

    // Assert
    expect(strays).toEqual([]);
  });

  it('leaves one export format unsubscribed', () => {
    // Deliberate: the tools surface names the formats a domain
    // receives nothing under in one sentence under its toggle list,
    // and a fixture set covering every member would leave that
    // sentence unrehearsed.
    // Arrange / Act
    const subscribed = new Set(
      EXPORT_SUBSCRIPTIONS.map((subscription) => subscription.format),
    );

    // Assert
    expect([...subscribed].sort())
      .toEqual(['email_draft', 'obsidian_md', 'pdf', 'rss']);
  });

  it('carries a never-scheduled row beside an overdue one', () => {
    // Two rows the dispatcher is not running right now, and they are
    // not the same state: NULL means nothing claims it whatever its
    // interval says, while a stamp in the past means it is due and
    // waiting for the next tick. A cadence cell keyed off the interval
    // alone renders these identically and would be wrong about both.
    //
    // Read against the fixture clock rather than the wall clock: every
    // stamp here is the same ISO shape with an explicit `Z`, so a
    // string comparison orders them, and dating the assertion against
    // `Date.now()` would make it pass until the day it silently
    // stopped meaning anything.
    // Arrange / Act
    const unscheduled = EXPORT_SUBSCRIPTIONS.filter(
      (subscription) => subscription.nextRunAt === null,
    );
    const overdue = EXPORT_SUBSCRIPTIONS.filter(
      (subscription) => subscription.nextRunAt !== null
        && subscription.nextRunAt < FIXTURE_NOW,
    );

    // Assert
    expect(unscheduled.map((subscription) => subscription.id)).toEqual([2]);
    expect(overdue.map((subscription) => subscription.id)).toEqual([3]);
  });

  it('keeps the cadence and due time of a disabled row', () => {
    // Disabling is not cancelling — cancelling is a DELETE — so every
    // part of this row's configuration survives being switched off. A
    // page clearing the schedule when the toggle flips would destroy
    // what the operator meant to keep.
    // Arrange
    const disabled = EXPORT_SUBSCRIPTIONS.filter(
      (subscription) => !subscription.enabled,
    );

    // Act / Assert
    expect(disabled.map((subscription) => subscription.id)).toEqual([5]);
    expect(disabled.map((subscription) => subscription.intervalSeconds))
      .toEqual([604800]);
    expect(disabled.map((subscription) => subscription.nextRunAt))
      .toEqual(['2026-06-13T05:00:00.000Z']);
  });

  it('bounds exactly one row and leaves the rest unclamped', () => {
    // The clamp is for the agent-driven mode: a proposed gap is held
    // between the two bounds before it is written. A row on a fixed
    // cadence has nothing to clamp, so NULL is the common case rather
    // than a member left unset — and a page rendering the bounds needs
    // both shapes.
    // Arrange / Act
    const clamped = EXPORT_SUBSCRIPTIONS.filter(
      (subscription) => subscription.minIntervalSeconds !== null
        || subscription.maxIntervalSeconds !== null,
    );

    // Assert
    expect(clamped.map((subscription) => ({
      id: subscription.id,
      min: subscription.minIntervalSeconds,
      max: subscription.maxIntervalSeconds,
    }))).toEqual([{ id: 3, min: 3600, max: 172800 }]);
  });

  it('never carries a bound that inverts the clamp', () => {
    // A floor above its ceiling is a range no proposal can land in, and
    // nothing in the database refuses it: the clamp is the writer's,
    // and no CHECK relates these two columns to each other.
    // Arrange / Act
    const inverted = EXPORT_SUBSCRIPTIONS.filter(
      (subscription) => subscription.minIntervalSeconds !== null
        && subscription.maxIntervalSeconds !== null
        && subscription.minIntervalSeconds > subscription.maxIntervalSeconds,
    );

    // Assert
    expect(inverted).toEqual([]);
  });

  it('gives every subscription a positive interval', () => {
    // NOT NULL is not the same as sensible. A zero or negative
    // interval is a row the dispatcher reschedules to now or to the
    // past after every run, which is a loop paid for once per tick for
    // as long as nobody looks.
    // Arrange / Act
    const nonPositive = EXPORT_SUBSCRIPTIONS.filter(
      (subscription) => subscription.intervalSeconds <= 0,
    );

    // Assert
    expect(nonPositive).toEqual([]);
  });
});

describe('listExportSubscriptions', () => {
  it('returns the seeded domain subscriptions in subscription order', () => {
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const listed = listExportSubscriptions(seededId);

    // Assert
    expect(listed.map((subscription) => subscription.id))
      .toEqual([1, 2, 3, 4, 5]);
  });

  it('includes the disabled subscription', () => {
    // The tools surface is where a subscription is switched back on, so
    // filtering disabled rows out here would make the control that
    // turns one off the control that hides it.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const listed = listExportSubscriptions(seededId);

    // Assert
    expect(listed.filter((subscription) => !subscription.enabled))
      .not.toEqual([]);
  });

  it('returns nothing for the sparse domain', () => {
    // Not an error: the empty half of the tools page is a state the
    // demo reaches by switching domain rather than by emptying a table
    // — and the connector cards stay put across that switch, which is
    // the clearest demonstration of the two scopes the shell can give.
    // Arrange
    const sparseId = getDomain(SPARSE_DOMAIN_SLUG).id;

    // Act / Assert
    expect(listExportSubscriptions(sparseId)).toEqual([]);
  });

  it('returns nothing for a domain id nothing carries', () => {
    // Arrange / Act / Assert
    expect(listExportSubscriptions(-1)).toEqual([]);
  });

  it('never hands back the stored table', () => {
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act / Assert
    expect(listExportSubscriptions(seededId)).not.toBe(EXPORT_SUBSCRIPTIONS);
  });
});

describe('findExportSubscription', () => {
  it('finds every fixture subscription by its own id', () => {
    // Arrange / Act
    const missed = EXPORT_SUBSCRIPTIONS.filter(
      (subscription) => findExportSubscription(subscription.id)
        !== subscription,
    );

    // Assert
    expect(missed).toEqual([]);
  });

  it('answers undefined for an id no fixture carries', () => {
    // Arrange / Act / Assert
    expect(findExportSubscription(-1)).toBeUndefined();
  });
});

describe('getExportSubscription', () => {
  it('returns the subscription carrying the id', () => {
    // Arrange / Act
    const found = EXPORT_SUBSCRIPTIONS.map(
      (subscription) => getExportSubscription(subscription.id),
    );

    // Assert
    expect(found).toEqual([...EXPORT_SUBSCRIPTIONS]);
  });

  it('throws naming the id it could not find', () => {
    // Arrange / Act / Assert
    expect(() => getExportSubscription(-1)).toThrow('-1');
  });
});

describe('summarizeExportSubscriptions', () => {
  it('resolves every destination for the seeded domain', () => {
    // The join this module exists to answer: the page maps over these
    // and renders a row each, so the resolution stays here and the q15
    // swap replaces one accessor rather than a page.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const summaries = summarizeExportSubscriptions(seededId);

    // Assert
    expect(summaries.map((summary) => ({
      id: summary.subscription.id,
      connector: summary.connector.name,
    }))).toEqual([
      { id: 1, connector: 'notes-directory' },
      { id: 2, connector: 'notes-directory' },
      { id: 3, connector: 'static-feed' },
      { id: 4, connector: 'notes-directory' },
      { id: 5, connector: 'mail-drafts' },
    ]);
  });

  it('hands back the connector rows themselves', () => {
    // Not copies: a page comparing the resolved connector against one
    // it looked up separately — to mark the active card, say — would
    // find two objects that are equal and not identical.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const summaries = summarizeExportSubscriptions(seededId);

    // Assert
    const mismatched = summaries.filter(
      (summary) => summary.connector
        !== getConnector(summary.subscription.connectorId),
    );
    expect(mismatched).toEqual([]);
  });

  it('surfaces a delivery to the unconfigured target', () => {
    // The state an export reaches when it renders and has nowhere to
    // go, which the tools list has to show rather than hide: the row is
    // switched off precisely because its destination is unfinished.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const summaries = summarizeExportSubscriptions(seededId);

    // Assert
    const unconfigured = summaries.filter(
      (summary) => classifyConnector(summary.connector) === 'unconfigured',
    );
    expect(unconfigured.map((summary) => summary.subscription.id))
      .toEqual([5]);
  });

  it('returns nothing for a domain that has subscribed to nothing', () => {
    // Arrange
    const sparseId = getDomain(SPARSE_DOMAIN_SLUG).id;

    // Act / Assert
    expect(summarizeExportSubscriptions(sparseId)).toEqual([]);
  });
});
