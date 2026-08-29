import { describe, expect, it } from 'vitest';

import { repeated } from '../test-support/repeated';

import { findDomain, resolveDomainSlug } from './domains';
import { NOTIFICATION_CHANNELS, SETTINGS, getSettings } from './settings';

describe('SETTINGS', () => {
  it('names a default domain the fixtures carry', () => {
    // The settings page renders this as a `Select` whose options come
    // from the domain table, so a slug nothing carries is a control
    // showing an empty value and silently discarding the preference it
    // was opened to display. `settings.ts` resolves the slug through
    // `getDomain` at module scope so that fails at import; this is the
    // same claim asserted where a reader looks for it.
    // Arrange / Act
    const named = findDomain(SETTINGS.defaultDomainSlug);

    // Assert
    expect(named).toBeDefined();
    expect(named?.slug).toBe(SETTINGS.defaultDomainSlug);
  });

  it('agrees with the slug the single-domain base resolves to', () => {
    // The cross-module pin the settings module's docblock describes.
    // `resolveDomainSlug` is what the ROUTER does with an absent
    // `:domainSlug`; `defaultDomainSlug` is what the operator asked
    // for. They are separate today and equal on purpose — a fixture
    // that let them part company would show one domain on this page
    // while `/` loaded another, and neither surface could tell.
    // Arrange / Act / Assert
    expect(resolveDomainSlug(undefined)).toBe(SETTINGS.defaultDomainSlug);
  });

  it('starts a new digest on a daily markdown export', () => {
    // The pin, and the non-emptiness guard the whole-object claims
    // below rest on: an empty or half-filled `digest` satisfies a
    // "every member is present" style assertion vacuously.
    // Arrange / Act / Assert
    expect(SETTINGS.digest).toEqual({
      format: 'obsidian_md',
      // One day. Written out here rather than reusing the module's own
      // constant, so this side of the comparison is a literal and the
      // assertion is not a restatement of the value under test.
      intervalSeconds: 86400,
    });
  });

  it('carries a toggle for every notification channel, and no other', () => {
    // Half of the exhaustiveness chain. The record's TYPE makes a
    // fourth channel a compile error here; nothing in the type system
    // then makes it an error in `NOTIFICATION_CHANNELS`, which is a
    // plain array — so this is the assertion that keeps the switch
    // list and the toggles from parting company. Sorted on both sides
    // because it is a set claim; the order claim is its own test
    // below.
    // Arrange / Act
    const toggled = Object.keys(SETTINGS.notificationChannels).sort();

    // Assert
    expect(toggled).toEqual([...NOTIFICATION_CHANNELS].sort());
  });

  it('leaves one channel off and the others on', () => {
    // The near-miss pair. A fixture with every channel on never
    // renders an off switch, so a page that lost its `checked` binding
    // renders identically to one that kept it; a fixture with one on
    // never renders a list. Asserted as the set of values rather than
    // as a count so it says what it means.
    // Arrange / Act
    const states = NOTIFICATION_CHANNELS.map(
      (channel) => SETTINGS.notificationChannels[channel],
    );

    // Assert
    expect(states.filter((enabled) => enabled)).toHaveLength(2);
    expect(states.filter((enabled) => !enabled)).toHaveLength(1);
  });

  it('refuses a write to the fixture itself', () => {
    // `readonly` is a compile-time claim and the value handed over is
    // an ordinary object any consumer can reach past it. There is one
    // settings object and no accessor copies it, so a page toggling in
    // place would change what every later reader in the tab sees — and
    // lose it on reload, which is the version that looks like it
    // worked.
    // Arrange
    const before = SETTINGS.defaultDomainSlug;

    // Act / Assert
    expect(() => {
      (SETTINGS as { defaultDomainSlug: string })
        .defaultDomainSlug = 'example-reading-list';
    }).toThrow(TypeError);
    expect(SETTINGS.defaultDomainSlug).toBe(before);
  });

  it('refuses a write to the nested defaults and toggles', () => {
    // The half a shallow freeze misses, and the half worth having:
    // every interesting member of this fixture is itself an object, so
    // freezing only the outer one would protect the two members nobody
    // would try to write.
    // Arrange
    const cadence = SETTINGS.digest.intervalSeconds;
    const email = SETTINGS.notificationChannels.email;

    // Act / Assert
    expect(() => {
      (SETTINGS.digest as { intervalSeconds: number }).intervalSeconds = 60;
    }).toThrow(TypeError);
    expect(() => {
      (SETTINGS.notificationChannels as { email: boolean }).email = false;
    }).toThrow(TypeError);

    // Read back, so the claim is that the write did not take rather
    // than that the fixture happens to hold a particular value.
    expect(SETTINGS.digest.intervalSeconds).toBe(cadence);
    expect(SETTINGS.notificationChannels.email).toBe(email);
  });
});

describe('NOTIFICATION_CHANNELS', () => {
  it('renders the switches in a fixed order', () => {
    // Compared against a literal rather than against anything derived
    // from the fixture, so this is an order claim and not a spelling
    // check: a page renders these top to bottom and an operator hits
    // one by position.
    // Arrange / Act / Assert
    expect(NOTIFICATION_CHANNELS).toEqual(['email', 'push', 'webhook']);
  });

  it('names every channel once', () => {
    // A repeat would render two switches for one toggle, where the
    // second silently overwrites what the first showed.
    // Arrange / Act / Assert
    expect(repeated(NOTIFICATION_CHANNELS)).toEqual([]);
  });
});

describe('getSettings', () => {
  it('hands back the frozen fixture rather than a copy', () => {
    // Deliberately identity, not equality. A spread copy would satisfy
    // `toEqual` while being a fresh UNFROZEN object — the one thing a
    // caller can toggle in place and believe the toggle took — so
    // identity is the only form of this assertion that fails on the
    // mutation it exists to catch.
    // Arrange / Act / Assert
    expect(getSettings()).toBe(SETTINGS);
    expect(Object.isFrozen(getSettings())).toBe(true);
  });
});
