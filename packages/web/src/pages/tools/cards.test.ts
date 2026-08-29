import type { ExportSubscriptionSummary } from '../../data/connectors';
import type {
  Connector,
  ConnectorKind,
  ExportFormat,
  ExportSubscription,
} from '../../data/types';

import { describe, expect, it } from 'vitest';

import { CONNECTORS, EXPORT_SUBSCRIPTIONS } from '../../data/connectors';
import { repeated } from '../../test-support/repeated';

import {
  CONNECTOR_KIND_FACETS,
  CONNECTOR_STATUS_FACETS,
  EXPORT_FORMATS,
  NO_CADENCE_LABEL,
  cadenceLabel,
  configEntries,
  configValueLabel,
  connectorCountLabel,
  connectorStatusFacet,
  exportCountLabel,
  formatFacet,
  kindFacet,
  unsubscribedFormats,
  unsubscribedLabel,
} from './cards';

/**
 * The kinds this surface draws, in the order it introduces them.
 *
 * Written out as a TYPED literal rather than derived from the module,
 * which is what makes it worth having: annotating it
 * `readonly ConnectorKind[]` means a kind DROPPED from the union
 * upstream reddens `check-types` here, and comparing the module's list
 * against it catches an order or membership change in the suite. The
 * opposite drift — a kind ADDED upstream — is refused in `./cards.ts`
 * by the record the list is built from.
 */
const SURFACE_KIND_ORDER: readonly ConnectorKind[] = [
  'llm',
  'search',
  'notebook',
  'export_target',
];

/**
 * The formats this surface lists, in the order it lists them.
 *
 * Typed for the reason {@link SURFACE_KIND_ORDER} is.
 */
const SURFACE_FORMAT_ORDER: readonly ExportFormat[] = [
  'obsidian_md',
  'notion_md',
  'rss',
  'pdf',
  'email_draft',
];

/**
 * A subscription with every schedulable member written out.
 *
 * Built here rather than taken from the fixtures so the cases below
 * can vary one member at a time — a delivery set found in
 * `../../data/connectors.ts` is a set somebody chose for a page, and
 * a test that reads its values back cannot say which of them it is
 * actually about.
 *
 * @param format - The format the row renders.
 * @param enabled - Whether the row takes part in scheduling.
 * @returns A summary, with a destination attached.
 */
function summary(
  format: ExportFormat,
  enabled: boolean,
): ExportSubscriptionSummary {
  const subscription: ExportSubscription = {
    id: 1,
    domainId: 1,
    format,
    connectorId: 2,
    intervalSeconds: 86400,
    nextRunAt: null,
    enabled,
    minIntervalSeconds: null,
    maxIntervalSeconds: null,
  };

  const connector: Connector = {
    id: 2,
    kind: 'export_target',
    name: 'probe-target',
    config: { path: '/srv/probe' },
  };

  return { subscription, connector };
}

describe('CONNECTOR_KIND_FACETS', () => {
  it('describes every kind once, in surface order', () => {
    // The non-emptiness guard the claims below rest on, and the order
    // claim, in one: the expected side is a literal, so an emptied or
    // reordered table cannot satisfy it.
    // Arrange / Act
    const kinds = CONNECTOR_KIND_FACETS.map((facet) => facet.kind);

    // Assert
    expect(kinds).toEqual(SURFACE_KIND_ORDER);
    expect(repeated(kinds)).toEqual([]);
  });

  it('names the kinds in words rather than in stored tokens', () => {
    // Pinned against a literal, so the copy is a decision this file
    // records rather than one a rename can undo. `export_target` is
    // the reason the labels are prose at all.
    // Arrange / Act
    const labels = CONNECTOR_KIND_FACETS.map((facet) => facet.label);

    // Assert
    expect(labels).toEqual(['Model', 'Search', 'Notebook', 'Export target']);
  });

  it('gives every kind a label and a tone', () => {
    // A record over a `@ar/ui` prop union refuses a MISSING key and an
    // excess one, but not a key set to `undefined` — every cva variant
    // member resolves to `T | null | undefined`, so an entry saying
    // nothing type-checks and the badge silently falls back to the
    // component's own default. This is the only thing that catches it.
    // Arrange / Act
    const empty = CONNECTOR_KIND_FACETS.filter(
      (facet) => facet.label.trim() === '' || facet.tone == null,
    );

    // Assert
    expect(empty).toEqual([]);
  });

  it('tints only the kind the export list references', () => {
    // The restraint is the rule this surface inherits from
    // `../sources/rows.ts`: colour here means state, so a second
    // coloured vocabulary would argue with the status dot. One
    // exception, and it is the kind the deliveries below point at.
    // Arrange / Act
    const tinted = CONNECTOR_KIND_FACETS
      .filter((facet) => facet.tone !== 'neutral')
      .map((facet) => facet.kind);

    // Assert
    expect(tinted).toEqual(['export_target']);
  });
});

describe('kindFacet', () => {
  it('finds every kind by its own key', () => {
    // Arrange / Act
    const found = SURFACE_KIND_ORDER.map((kind) => kindFacet(kind).kind);

    // Assert
    expect(found).toEqual(SURFACE_KIND_ORDER);
  });

  it('answers every kind the fixture connectors carry', () => {
    // The join between this surface's table and the deployment's rows:
    // a kind a fixture uses and this file does not describe is a card
    // that throws rather than one that renders a blank badge.
    // Arrange / Act
    const labelled = CONNECTORS.map(
      (connector) => kindFacet(connector.kind).label,
    );

    // Assert
    expect(labelled.filter((label) => label.trim() === '')).toEqual([]);
    expect(labelled).toHaveLength(CONNECTORS.length);
  });

  it('throws for a kind this surface does not describe', () => {
    // Reached only by a kind left out of the private order list — a
    // wiring bug in `./cards.ts`, which is why it is loud rather than
    // tolerated. The cast is what lets the test ask the question at
    // all: the union has no member to spare.
    // Arrange / Act / Assert
    expect(() => kindFacet('webhook' as ConnectorKind))
      .toThrow('Unknown connector kind: webhook');
  });
});

describe('CONNECTOR_STATUS_FACETS', () => {
  it('describes both states once, working state first', () => {
    // Arrange / Act
    const statuses = CONNECTOR_STATUS_FACETS.map((facet) => facet.status);

    // Assert
    expect(statuses).toEqual(['ready', 'unconfigured']);
    expect(repeated(statuses)).toEqual([]);
  });

  it('draws the unconfigured state as a warning, not as a failure', () => {
    // `classifyConnector` reads configuration and nothing else —
    // nothing has been attempted against a connector — so no state
    // here may claim a call went wrong.
    // Arrange / Act
    const tones = CONNECTOR_STATUS_FACETS.map((facet) => facet.tone);

    // Assert
    expect(tones).toEqual(['ok', 'warn']);
  });

  it('gives every state a label and a tone', () => {
    // The `undefined`-key case again — see the kind table's own copy
    // of this test for why a record cannot refuse it.
    // Arrange / Act
    const empty = CONNECTOR_STATUS_FACETS.filter(
      (facet) => facet.label.trim() === '' || facet.tone == null,
    );

    // Assert
    expect(empty).toEqual([]);
  });
});

describe('connectorStatusFacet', () => {
  it('finds both states by their own key', () => {
    // Arrange / Act
    const labels = CONNECTOR_STATUS_FACETS.map(
      (facet) => connectorStatusFacet(facet.status).label,
    );

    // Assert
    expect(labels).toEqual(['Ready', 'Not configured']);
  });

  it('throws for a state this surface does not describe', () => {
    // Arrange / Act / Assert
    expect(() => connectorStatusFacet('degraded' as 'ready'))
      .toThrow('Unknown connector status: degraded');
  });
});

describe('configValueLabel', () => {
  it('hands a stored string back unchanged', () => {
    // Exactness is the whole contract: an endpoint or a key is checked
    // character by character or it is not checked at all.
    // Arrange / Act / Assert
    expect(configValueLabel('https://api.example.com/v1/messages'))
      .toBe('https://api.example.com/v1/messages');
    expect(configValueLabel('[redacted]')).toBe('[redacted]');
    expect(configValueLabel('')).toBe('');
  });

  it('gives numbers and booleans their own reading', () => {
    // `resultLimit: 20` is a real fixture value, and `0`/`false` are
    // the two a falsy check would render as an empty cell.
    // Arrange / Act / Assert
    expect(configValueLabel(20)).toBe('20');
    expect(configValueLabel(0)).toBe('0');
    expect(configValueLabel(false)).toBe('false');
    expect(configValueLabel(true)).toBe('true');
  });

  it('keeps a number JSON cannot carry distinct from a null', () => {
    // The one thing the number branch does that the JSON fallback
    // underneath it would not: `JSON.stringify` answers the STRING
    // `null` for a non-finite number, which would draw `NaN` and a
    // stored null identically. Neither survives a round trip through
    // `jsonb`, so this is a claim about the function staying total
    // rather than about a value a row can hold.
    // Arrange / Act / Assert
    expect(configValueLabel(Number.NaN)).toBe('NaN');
    expect(configValueLabel(Number.POSITIVE_INFINITY)).toBe('Infinity');
  });

  it('gives an explicit null a word rather than an empty cell', () => {
    // A null is a value somebody wrote. Drawn as nothing it would read
    // as a column that failed.
    // Arrange / Act / Assert
    expect(configValueLabel(null)).toBe('null');
  });

  it('falls through to JSON for a nested payload', () => {
    // Arrange / Act / Assert
    expect(configValueLabel({ retries: 3 })).toBe('{"retries":3}');
    expect(configValueLabel(['a', 'b'])).toBe('["a","b"]');
  });

  it('stays total for a value JSON cannot carry', () => {
    // `JSON.stringify` answers `undefined` for these, and neither
    // survives a round trip through `jsonb`. The fallback is what
    // keeps the function total rather than a state a row can reach.
    // Arrange / Act / Assert
    expect(configValueLabel(undefined)).toBe('undefined');
  });
});

describe('configEntries', () => {
  it('keeps the payload own key order', () => {
    // Re-sorting would move an address away from the credential that
    // belongs with it.
    // Arrange
    const config = {
      endpoint: 'https://api.example.com/v1/messages',
      model: 'example-model-standard',
      apiKey: '[redacted]',
    };

    // Act
    const entries = configEntries(config);

    // Assert
    expect(entries).toEqual([
      { key: 'endpoint', value: 'https://api.example.com/v1/messages' },
      { key: 'model', value: 'example-model-standard' },
      { key: 'apiKey', value: '[redacted]' },
    ]);
  });

  it('answers nothing for an empty config', () => {
    // The card has its own sentence for this state, and `[]` is what
    // lets it choose one.
    // Arrange / Act / Assert
    expect(configEntries({})).toEqual([]);
  });

  it('draws every fixture connector config without a blank key', () => {
    // The whole-table pass: a payload this cannot render is a card
    // with an unreadable line, and the fixtures are the only real
    // configs this app has.
    // Arrange / Act
    const blank = CONNECTORS
      .flatMap((connector) => configEntries(connector.config))
      .filter((entry) => entry.key.trim() === '');

    // Assert
    expect(blank).toEqual([]);
  });

  it('shows a credential as the placeholder the fixture stores', () => {
    // The reason the card renders the payload key by key rather than
    // picking out an address: the redaction is the thing an operator
    // checks, and a card showing only an endpoint would never display
    // it.
    // Arrange
    const notebook = CONNECTORS.find(
      (connector) => connector.kind === 'notebook',
    );

    // Act
    const entries = configEntries(notebook?.config ?? {});

    // Assert
    expect(entries).toContainEqual({ key: 'password', value: '[redacted]' });
  });
});

describe('connectorCountLabel', () => {
  it('counts connectors, singular at exactly one', () => {
    // Arrange / Act / Assert
    expect(connectorCountLabel(0)).toBe('0 connectors');
    expect(connectorCountLabel(1)).toBe('1 connector');
    expect(connectorCountLabel(7)).toBe('7 connectors');
  });
});

describe('EXPORT_FORMATS', () => {
  it('lists every format once, in surface order', () => {
    // Arrange / Act / Assert
    expect(EXPORT_FORMATS).toEqual(SURFACE_FORMAT_ORDER);
    expect(repeated([...EXPORT_FORMATS])).toEqual([]);
  });
});

describe('formatFacet', () => {
  it('names every format in words and gives it a glyph', () => {
    // Pinned against literals, so the copy is a decision this file
    // records. `Email draft` is the load-bearing one: no format sends
    // anything, and this is the one whose name would suggest it does.
    // Arrange / Act
    const described = SURFACE_FORMAT_ORDER.map((format) => {
      const facet = formatFacet(format);

      return { label: facet.label, icon: facet.icon };
    });

    // Assert
    expect(described).toEqual([
      { label: 'Obsidian Markdown', icon: 'file-text' },
      { label: 'Notion Markdown', icon: 'notebook' },
      { label: 'RSS feed', icon: 'rss' },
      { label: 'PDF', icon: 'file-type-2' },
      { label: 'Email draft', icon: 'mail' },
    ]);
  });

  it('gives the two Markdown formats different glyphs', () => {
    // They render the same artifact into two different tools. Drawn
    // identically, the destination would be the only thing telling
    // them apart, which is not the reading an operator scanning this
    // list is doing.
    // Arrange / Act
    const obsidian = formatFacet('obsidian_md').icon;
    const notion = formatFacet('notion_md').icon;

    // Assert
    expect(obsidian).not.toBe(notion);
  });

  it('answers every format the fixture subscriptions carry', () => {
    // Arrange / Act
    const labels = EXPORT_SUBSCRIPTIONS.map(
      (subscription) => formatFacet(subscription.format).label,
    );

    // Assert
    expect(labels.filter((label) => label.trim() === '')).toEqual([]);
    expect(labels).toHaveLength(EXPORT_SUBSCRIPTIONS.length);
  });

  it('throws for a format this surface does not describe', () => {
    // Arrange / Act / Assert
    expect(() => formatFacet('csv' as ExportFormat))
      .toThrow('Unknown export format: csv');
  });
});

describe('cadenceLabel', () => {
  it('gives the three familiar gaps their own word', () => {
    // A list where most rows read `Every 1 day` is a list nobody
    // scans.
    // Arrange / Act / Assert
    expect(cadenceLabel(3600)).toBe('Hourly');
    expect(cadenceLabel(86400)).toBe('Daily');
    expect(cadenceLabel(604800)).toBe('Weekly');
  });

  it('spells out every other gap in its largest exact unit', () => {
    // The fixture cadences, plus the two units below a day. Exactness
    // is the rule: a rounded figure could not be checked against the
    // field that set it.
    // Arrange / Act / Assert
    expect(cadenceLabel(21600)).toBe('Every 6 hours');
    expect(cadenceLabel(2592000)).toBe('Every 30 days');
    expect(cadenceLabel(1209600)).toBe('Every 14 days');
    expect(cadenceLabel(900)).toBe('Every 15 minutes');
    expect(cadenceLabel(45)).toBe('Every 45 seconds');
  });

  it('reads a gap of exactly one unit in the singular', () => {
    // The boundary the pluraliser is for. Note the three units with a
    // word of their own never reach it.
    // Arrange / Act / Assert
    expect(cadenceLabel(60)).toBe('Every 1 minute');
    expect(cadenceLabel(1)).toBe('Every 1 second');
  });

  it('picks the largest unit that divides the gap exactly', () => {
    // 90 minutes is divisible by a minute and by nothing larger, so it
    // must not round up to two hours.
    // Arrange / Act / Assert
    expect(cadenceLabel(5400)).toBe('Every 90 minutes');
    expect(cadenceLabel(172800)).toBe('Every 2 days');
  });

  it('refuses an interval no schedule can carry', () => {
    // No schedulable column produces one, which is exactly why a row
    // holding it should look wrong rather than read as a very frequent
    // delivery.
    // Arrange / Act / Assert
    expect(cadenceLabel(0)).toBe(NO_CADENCE_LABEL);
    expect(cadenceLabel(-3600)).toBe(NO_CADENCE_LABEL);
    expect(cadenceLabel(Number.NaN)).toBe(NO_CADENCE_LABEL);
    expect(cadenceLabel(Number.POSITIVE_INFINITY)).toBe(NO_CADENCE_LABEL);
  });

  it('reads every fixture subscription cadence', () => {
    // Arrange / Act
    const spoken = EXPORT_SUBSCRIPTIONS.map(
      (subscription) => cadenceLabel(subscription.intervalSeconds),
    );

    // Assert
    expect(spoken.filter((label) => label === NO_CADENCE_LABEL)).toEqual([]);
    expect(spoken).toHaveLength(EXPORT_SUBSCRIPTIONS.length);
  });
});

describe('unsubscribedFormats', () => {
  it('answers the formats no row names, in surface order', () => {
    // Arrange
    const summaries = [summary('rss', true), summary('pdf', true)];

    // Act
    const missing = unsubscribedFormats(summaries);

    // Assert
    expect(missing).toEqual(['obsidian_md', 'notion_md', 'email_draft']);
  });

  it('counts a disabled subscription as subscribed', () => {
    // Disabling is not cancelling — the row survives with its cadence
    // and its destination — so a format switched off is one this
    // domain configured and paused, not one it never asked for.
    // Arrange
    const summaries = [summary('rss', false)];

    // Act
    const missing = unsubscribedFormats(summaries);

    // Assert
    expect(missing).not.toContain('rss');
  });

  it('answers every format for a domain that receives nothing', () => {
    // Arithmetically right, and a sentence the page chooses not to
    // print: it has an empty state that says the same thing better.
    // Arrange / Act / Assert
    expect(unsubscribedFormats([])).toEqual(SURFACE_FORMAT_ORDER);
  });

  it('answers nothing when every format is subscribed', () => {
    // Arrange
    const summaries = SURFACE_FORMAT_ORDER.map(
      (format) => summary(format, true),
    );

    // Act / Assert
    expect(unsubscribedFormats(summaries)).toEqual([]);
  });

  it('leaves the seeded domain one format unsubscribed', () => {
    // The fixture set covers four of the five members on purpose, so
    // the sentence under the list is rehearsed against real data
    // rather than only against constructed rows.
    // Arrange
    const summaries = EXPORT_SUBSCRIPTIONS.map(
      (subscription) => summary(subscription.format, subscription.enabled),
    );

    // Act / Assert
    expect(unsubscribedFormats(summaries)).toEqual(['notion_md']);
  });
});

describe('unsubscribedLabel', () => {
  it('names one absent format', () => {
    // Arrange / Act / Assert
    expect(unsubscribedLabel(['notion_md']))
      .toBe('Not subscribed: Notion Markdown.');
  });

  it('names several in the order it was handed them', () => {
    // Arrange / Act / Assert
    expect(unsubscribedLabel(['rss', 'pdf', 'email_draft']))
      .toBe('Not subscribed: RSS feed, PDF, Email draft.');
  });

  it('says nothing where every format is subscribed', () => {
    // Null rather than an empty string: the section renders no footer
    // at all, and an empty one would draw a divider under nothing.
    // Arrange / Act / Assert
    expect(unsubscribedLabel([])).toBeNull();
  });
});

describe('exportCountLabel', () => {
  it('counts the running deliveries out of the configured ones', () => {
    // Arrange
    const summaries = [
      summary('rss', true),
      summary('pdf', true),
      summary('email_draft', false),
    ];

    // Act / Assert
    expect(exportCountLabel(summaries)).toBe('2 of 3 active');
  });

  it('reads a domain whose every delivery is paused', () => {
    // The figure the section header carries in place of the toggle
    // list's own indicator — zero of something is a reading, not an
    // empty state.
    // Arrange
    const summaries = [summary('rss', false)];

    // Act / Assert
    expect(exportCountLabel(summaries)).toBe('0 of 1 active');
  });

  it('reads a domain with no deliveries at all', () => {
    // Arrange / Act / Assert
    expect(exportCountLabel([])).toBe('0 of 0 active');
  });
});
