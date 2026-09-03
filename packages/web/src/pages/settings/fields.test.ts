import type {
  Domain,
  ExportFormat,
  NotificationChannel,
  Settings,
} from '../../data/types';

import { describe, expect, it } from 'vitest';

import { DOMAINS } from '../../data/domains';
import { NOTIFICATION_CHANNELS, SETTINGS } from '../../data/settings';
import { repeated } from '../../test-support/repeated';
import { EXPORT_FORMATS, cadenceLabel } from '../tools/cards';

import {
  CADENCE_CHOICES,
  EMPTY_DRAFT,
  FORMAT_OPTIONS,
  cadenceOptions,
  canSaveSettings,
  channelFacet,
  domainOptions,
  effectiveSettings,
  enabledChannelsLabel,
  isPristine,
  missingDomainLabel,
  parseCadenceValue,
  withDefaultDomain,
  withDigestFormat,
  withDigestInterval,
  withNotificationChannel,
} from './fields';

/**
 * The channels this surface draws a switch for.
 *
 * Written out as a TYPED literal rather than derived from the module,
 * which is the only thing that catches a channel DROPPED from the
 * union upstream — that direction reddens `check-types` here, where
 * the record in `./fields.ts` refuses a channel added.
 */
const SURFACE_CHANNELS: readonly NotificationChannel[] = [
  'email',
  'push',
  'webhook',
];

/**
 * The formats the digest default select offers.
 *
 * Typed for the reason {@link SURFACE_CHANNELS} is.
 */
const SURFACE_FORMATS: readonly ExportFormat[] = [
  'obsidian_md',
  'notion_md',
  'rss',
  'pdf',
  'email_draft',
];

/**
 * A deployment's stored preferences, built here rather than taken
 * from the fixture.
 *
 * The drop-on-equal rule cannot be proved against a value that agrees
 * with whatever the caller happens to pass: every assertion below
 * needs a stored reading and a DIFFERENT one to move to, and the
 * fixture is free to change either. So this carries values nothing
 * else uses, and the tests that are genuinely about the fixture say
 * so by naming `SETTINGS`.
 */
const STORED: Settings = {
  defaultDomainSlug: 'stored-domain',
  digest: { format: 'rss', intervalSeconds: 3600 },
  notificationChannels: { email: true, push: false, webhook: true },
};

/** A cadence no option list offers, for the guarantee tests. */
const ODD_INTERVAL_SECONDS = 12345;

describe('EMPTY_DRAFT', () => {
  it('holds nothing', () => {
    expect(isPristine(EMPTY_DRAFT)).toBe(true);
    expect(EMPTY_DRAFT).toEqual({});
  });

  it('is frozen, since every mount starts from this one object', () => {
    expect(Object.isFrozen(EMPTY_DRAFT)).toBe(true);
  });
});

describe('isPristine', () => {
  it('reports a draft carrying any override as changed', () => {
    expect(isPristine({ defaultDomainSlug: 'other' })).toBe(false);
    expect(isPristine({ digestFormat: 'pdf' })).toBe(false);
    expect(isPristine({ digestIntervalSeconds: 60 })).toBe(false);
    expect(isPristine({ notificationChannels: { push: true } })).toBe(false);
  });
});

describe('canSaveSettings', () => {
  /** One override, for the cases that need something to send. */
  const CHANGED = withDigestFormat(STORED, EMPTY_DRAFT, 'pdf');

  it('refuses a save with nothing to send it from', () => {
    // No settled read means no payload: `effectiveSettings` needs a
    // stored reading to lay the draft over, and a save of the draft
    // alone would be a preference set with three members missing.
    expect(canSaveSettings(undefined, CHANGED, false)).toBe(false);
  });

  it('refuses a save of a draft that holds nothing', () => {
    expect(canSaveSettings(STORED, EMPTY_DRAFT, false)).toBe(false);
  });

  it('refuses a second save while one is in flight', () => {
    expect(canSaveSettings(STORED, CHANGED, true)).toBe(false);
  });

  it('offers the save once a settled read carries an override', () => {
    expect(canSaveSettings(STORED, CHANGED, false)).toBe(true);
  });

  it('refuses again once the override is undone', () => {
    // The drop-on-equal rule reaching the control: an operator who
    // puts the select back is offered no save, because there is
    // nothing left for one to send.
    const undone = withDigestFormat(STORED, CHANGED, STORED.digest.format);

    expect(isPristine(undone)).toBe(true);
    expect(canSaveSettings(STORED, undone, false)).toBe(false);
  });
});

describe('effectiveSettings', () => {
  it('is the stored settings, value for value, under an empty draft', () => {
    expect(effectiveSettings(STORED, EMPTY_DRAFT)).toEqual(STORED);
  });

  it('lays each override over the stored value', () => {
    const settings = effectiveSettings(STORED, {
      defaultDomainSlug: 'chosen-domain',
      digestFormat: 'pdf',
      digestIntervalSeconds: 604800,
      notificationChannels: { push: true },
    });

    expect(settings).toEqual({
      defaultDomainSlug: 'chosen-domain',
      digest: { format: 'pdf', intervalSeconds: 604800 },
      // The two channels nobody touched keep their stored readings —
      // a partial override that pinned all three would freeze a
      // channel at whatever it read when the first switch moved.
      notificationChannels: { email: true, push: true, webhook: true },
    });
  });

  it('overrides a channel to false, not just to true', () => {
    const settings = effectiveSettings(STORED, {
      notificationChannels: { email: false },
    });

    expect(settings.notificationChannels.email).toBe(false);
  });

  it('hands back fresh objects, nested ones included', () => {
    const settings = effectiveSettings(SETTINGS, EMPTY_DRAFT);

    // The stored fixture is frozen through, so a caller reaching a
    // stored object through this would be able to write to nothing —
    // which is the point. What this asserts is the other half: the
    // page never receives the fixture itself.
    expect(settings).not.toBe(SETTINGS);
    expect(settings.digest).not.toBe(SETTINGS.digest);
    expect(settings.notificationChannels)
      .not.toBe(SETTINGS.notificationChannels);
    expect(Object.isFrozen(settings)).toBe(false);
  });
});

describe('withDefaultDomain', () => {
  it('records a domain the deployment does not currently default to', () => {
    expect(withDefaultDomain(STORED, EMPTY_DRAFT, 'other-domain'))
      .toEqual({ defaultDomainSlug: 'other-domain' });
  });

  it('drops the key when the choice is what is already stored', () => {
    const changed = withDefaultDomain(STORED, EMPTY_DRAFT, 'other-domain');

    expect(withDefaultDomain(STORED, changed, STORED.defaultDomainSlug))
      .toEqual({});
  });

  it('leaves the draft it was given alone', () => {
    const draft = { digestFormat: 'pdf' } as const;

    withDefaultDomain(STORED, draft, 'other-domain');

    expect(draft).toEqual({ digestFormat: 'pdf' });
  });

  it('keeps the other overrides when it drops its own', () => {
    const draft = { defaultDomainSlug: 'other', digestFormat: 'pdf' } as const;

    expect(withDefaultDomain(STORED, draft, STORED.defaultDomainSlug))
      .toEqual({ digestFormat: 'pdf' });
  });
});

describe('withDigestFormat', () => {
  it('records a format other than the stored one', () => {
    expect(withDigestFormat(STORED, EMPTY_DRAFT, 'pdf'))
      .toEqual({ digestFormat: 'pdf' });
  });

  it('drops the key when the choice is what is already stored', () => {
    const changed = withDigestFormat(STORED, EMPTY_DRAFT, 'pdf');

    expect(withDigestFormat(STORED, changed, STORED.digest.format))
      .toEqual({});
  });

  it('keeps the other overrides when it drops its own', () => {
    const draft = { digestFormat: 'pdf', digestIntervalSeconds: 60 } as const;

    expect(withDigestFormat(STORED, draft, STORED.digest.format))
      .toEqual({ digestIntervalSeconds: 60 });
  });
});

describe('withDigestInterval', () => {
  it('records a cadence other than the stored one', () => {
    expect(withDigestInterval(STORED, EMPTY_DRAFT, 604800))
      .toEqual({ digestIntervalSeconds: 604800 });
  });

  it('drops the key when the choice is what is already stored', () => {
    const changed = withDigestInterval(STORED, EMPTY_DRAFT, 604800);

    expect(withDigestInterval(STORED, changed, STORED.digest.intervalSeconds))
      .toEqual({});
  });

  it('keeps the other overrides when it drops its own', () => {
    const draft = { digestFormat: 'pdf', digestIntervalSeconds: 60 } as const;

    expect(withDigestInterval(STORED, draft, STORED.digest.intervalSeconds))
      .toEqual({ digestFormat: 'pdf' });
  });
});

describe('withNotificationChannel', () => {
  it('records a channel switched away from its stored reading', () => {
    expect(withNotificationChannel(STORED, EMPTY_DRAFT, 'push', true))
      .toEqual({ notificationChannels: { push: true } });
  });

  it('records a channel switched off as well as one switched on', () => {
    expect(withNotificationChannel(STORED, EMPTY_DRAFT, 'email', false))
      .toEqual({ notificationChannels: { email: false } });
  });

  it('drops the whole member when the last override is undone', () => {
    const changed = withNotificationChannel(STORED, EMPTY_DRAFT, 'push', true);

    // Not `{ notificationChannels: {} }` — an empty override object
    // would leave `isPristine` reporting a page that has been changed
    // and changed back as changed.
    expect(withNotificationChannel(STORED, changed, 'push', false))
      .toEqual({});
  });

  it('drops one channel and keeps the other', () => {
    const twoChanged = withNotificationChannel(
      STORED,
      withNotificationChannel(STORED, EMPTY_DRAFT, 'push', true),
      'email',
      false,
    );

    expect(twoChanged).toEqual({
      notificationChannels: { push: true, email: false },
    });
    expect(withNotificationChannel(STORED, twoChanged, 'push', false))
      .toEqual({ notificationChannels: { email: false } });
  });

  it('leaves the draft and its override object alone', () => {
    const draft = { notificationChannels: { push: true } } as const;

    withNotificationChannel(STORED, draft, 'email', false);

    expect(draft).toEqual({ notificationChannels: { push: true } });
  });

  it('keeps the other overrides when it drops its own', () => {
    const draft = withNotificationChannel(
      STORED,
      { digestFormat: 'pdf' },
      'push',
      true,
    );

    expect(withNotificationChannel(STORED, draft, 'push', false))
      .toEqual({ digestFormat: 'pdf' });
  });
});

describe('FORMAT_OPTIONS', () => {
  it('offers every export format, in the tools surface order', () => {
    expect(FORMAT_OPTIONS.map((option) => option.value))
      .toEqual([...EXPORT_FORMATS]);
  });

  it('offers the formats this surface expects', () => {
    // The literal side, so that a format leaving the union upstream is
    // a type error here rather than a silently shorter select.
    expect(FORMAT_OPTIONS.map((option) => option.value))
      .toEqual([...SURFACE_FORMATS]);
  });

  it('names every format in words rather than in its stored token', () => {
    const unnamed = FORMAT_OPTIONS.filter(
      (option) => typeof option.label !== 'string'
        || option.label.trim() === ''
        || option.label === option.value,
    );

    expect(unnamed).toEqual([]);
    expect(FORMAT_OPTIONS.length).toBeGreaterThan(0);
  });

  it('offers each format once', () => {
    expect(repeated(FORMAT_OPTIONS.map((option) => option.value))).toEqual([]);
  });
});

describe('CADENCE_CHOICES', () => {
  it('offers the three gaps the cadence phrasing has a word for', () => {
    // The join with `../tools/cards`: these numbers are named in this
    // module and rendered by that one, so a disagreement between the
    // two shows up here rather than as an option reading `Every 1 day`.
    expect(CADENCE_CHOICES.map((seconds) => cadenceLabel(seconds)))
      .toEqual(['Hourly', 'Daily', 'Weekly']);
  });

  it('lists them shortest first', () => {
    expect([...CADENCE_CHOICES].sort((a, b) => a - b))
      .toEqual([...CADENCE_CHOICES]);
  });
});

describe('cadenceOptions', () => {
  it('offers the three choices for a cadence that is one of them', () => {
    expect(cadenceOptions(86400).map((option) => option.value))
      .toEqual(CADENCE_CHOICES.map((seconds) => String(seconds)));
  });

  it('adds a cadence it does not offer, in its place in the order', () => {
    const values = cadenceOptions(ODD_INTERVAL_SECONDS)
      .map((option) => Number(option.value));

    // 12345 sits between hourly and daily, so an appended option would
    // read out of order — the select is a ladder, not a set.
    expect(values).toEqual([3600, ODD_INTERVAL_SECONDS, 86400, 604800]);
  });

  it('always contains the cadence it was given', () => {
    const cadences = [...CADENCE_CHOICES, ODD_INTERVAL_SECONDS, 1];
    const missing = cadences.filter((seconds) => !cadenceOptions(seconds)
      .some((option) => option.value === String(seconds)));

    // The whole point of the argument: `Select` falls back to its
    // first option for a value it cannot find, so an absent cadence
    // would render as a different one presented as this deployment's.
    expect(missing).toEqual([]);
    expect(cadences.length).toBeGreaterThan(0);
  });

  it('labels each option through the shared cadence phrasing', () => {
    const mislabelled = cadenceOptions(ODD_INTERVAL_SECONDS).filter(
      (option) => option.label !== cadenceLabel(Number(option.value)),
    );

    expect(mislabelled).toEqual([]);
  });

  it('does not reorder the offered choices', () => {
    // The cast form on purpose: a spread here would sort a copy of a
    // copy and could never fail. A mutation grid cannot isolate this
    // one — the case above it calls `cadenceOptions` first, so an
    // in-place sort has already landed by the time this snapshot is
    // taken and the before and after agree. It is still the only test
    // that catches a consumer sorting the shared table.
    const before = [...CADENCE_CHOICES];

    cadenceOptions(ODD_INTERVAL_SECONDS);

    expect([...CADENCE_CHOICES]).toEqual(before);
  });
});

describe('parseCadenceValue', () => {
  it('reads a cadence the select offered', () => {
    expect(parseCadenceValue('86400')).toBe(86400);
  });

  it('refuses anything that cannot be a schedule', () => {
    const refused = ['', ' ', 'daily', '0', '-3600', '1.5', 'NaN', 'Infinity'];
    const accepted = refused.filter(
      (value) => parseCadenceValue(value) !== undefined,
    );

    expect(accepted).toEqual([]);
    expect(refused.length).toBeGreaterThan(0);
  });
});

describe('domainOptions', () => {
  it('lists the deployment\'s domains, in the order it was given them', () => {
    const options = domainOptions(DOMAINS, DOMAINS[0]?.slug ?? '');

    expect(options).toEqual(DOMAINS.map((domain) => ({
      value: domain.slug,
      label: domain.name,
    })));
    expect(DOMAINS.length).toBeGreaterThan(0);
  });

  it('adds the stored slug when no domain carries it', () => {
    const options = domainOptions(DOMAINS, 'deleted-domain');

    expect(options.map((option) => option.value))
      .toEqual([...DOMAINS.map((domain) => domain.slug), 'deleted-domain']);
    expect(options.at(-1)?.label).toBe(missingDomainLabel('deleted-domain'));
  });

  it('says what a stand-in option is rather than naming it as one', () => {
    const label = missingDomainLabel('deleted-domain');

    expect(label).toContain('deleted-domain');
    expect(label).not.toBe('deleted-domain');
  });

  it('always contains the slug it was given', () => {
    const empty: readonly Domain[] = [];
    const missing = [DOMAINS[0]?.slug ?? '', 'deleted-domain'].filter(
      (slug) => !domainOptions(DOMAINS, slug)
        .some((option) => option.value === slug)
        || !domainOptions(empty, slug)
          .some((option) => option.value === slug),
    );

    expect(missing).toEqual([]);
  });

  it('offers each slug once', () => {
    const options = domainOptions(DOMAINS, DOMAINS[0]?.slug ?? '');

    expect(repeated(options.map((option) => option.value))).toEqual([]);
  });
});

describe('channelFacet', () => {
  it('names every channel the settings fixture carries a switch for', () => {
    const named = NOTIFICATION_CHANNELS
      .map((channel) => channelFacet(channel).channel);

    expect(named).toEqual([...NOTIFICATION_CHANNELS]);
  });

  it('covers the channels this surface expects', () => {
    expect([...NOTIFICATION_CHANNELS]).toEqual([...SURFACE_CHANNELS]);
  });

  it('gives every channel a label and a line saying what it does', () => {
    // A record over a union refuses a missing key and an excess one,
    // but not a key present and saying nothing — this is the only
    // thing that catches an entry left blank.
    const silent = NOTIFICATION_CHANNELS.filter((channel) => {
      const facet = channelFacet(channel);

      return facet.label.trim() === '' || facet.description.trim() === '';
    });

    expect(silent).toEqual([]);
    expect(NOTIFICATION_CHANNELS.length).toBeGreaterThan(0);
  });

  it('gives the channels distinct labels', () => {
    const labels = NOTIFICATION_CHANNELS
      .map((channel) => channelFacet(channel).label);

    expect(repeated(labels)).toEqual([]);
  });

  it('throws for a channel this surface does not draw', () => {
    expect(() => channelFacet('carrier-pigeon' as NotificationChannel))
      .toThrow(/carrier-pigeon/u);
  });
});

describe('enabledChannelsLabel', () => {
  it('counts the channels that are on, out of every channel there is', () => {
    expect(enabledChannelsLabel(STORED.notificationChannels))
      .toBe('2 of 3 on');
  });

  it('counts none and counts all', () => {
    expect(enabledChannelsLabel({ email: false, push: false, webhook: false }))
      .toBe('0 of 3 on');
    expect(enabledChannelsLabel({ email: true, push: true, webhook: true }))
      .toBe('3 of 3 on');
  });
});
