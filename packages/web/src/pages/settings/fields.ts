/**
 * @packageDocumentation
 * What the settings surface offers, what an operator's changes to it
 * amount to, and what saving them records.
 *
 * ## The draft, and what a save does with it
 *
 * `Settings` MIRRORS NO TABLE — `../../data/types.ts` says so on the
 * type and `../../data/settings.ts` says it again at length. Schema v2
 * keeps per-DOMAIN configuration in `domains.settings` and keeps
 * nothing per operator, so there is still no column to write and a
 * schema decision still open behind every control on this page.
 *
 * What there IS now is a seam. `../../data/api.ts`'s `saveSettings`
 * records the whole preference set into the singleton slot in
 * `../../data/drafts.ts`, and `fetchSettings` lays it back over the
 * fixture on every later read. So a save here is a real save for the
 * LIFE OF THE TAB: it survives a domain switch, a walk to another
 * surface and back, and every re-read in between, and it is gone on
 * reload, because that store is module state and touches no storage
 * at all. The page says both halves in a banner above the column — a
 * save that forgets is a bad answer only while it is silent about
 * forgetting.
 *
 * That splits what used to be one thing into two, and every function
 * below sits on one side of the split. STORED is the fixture with
 * whatever this tab has already saved laid over it, and it is what
 * the `with*` writers compare against. The DRAFT is the unsaved
 * remainder: what the operator has moved since the last save and has
 * not committed. `../../components/editorDraft.ts` draws the same line
 * for every modal editor in this app; this module draws it for the
 * one surface that has no modal to draw it in.
 *
 * A save is a PUT of the WHOLE preference set, none of its members
 * being independently addressable — so the payload is
 * {@link effectiveSettings}, the same object the controls are drawn
 * from. What an operator is looking at is what gets sent, with no
 * second assembly step that could disagree with it.
 *
 * A `Select` could not have been drawn any other way in any case:
 * `SelectProps` carries no `disabled` and spreads nothing onto its
 * trigger, so the choice on this surface was never between a live
 * control and a dead one — it was between a live control and no
 * control.
 *
 * ## The two operator fields are outside all of this
 *
 * {@link SettingsDraft} declares four members and none of them names
 * an operator, because `Settings` carries no such member either — so
 * `saveSettings` has nowhere to put a name or an address, seam or no
 * seam. That is the structural half; the other half is what makes it
 * the right shape rather than a gap.
 *
 * The line is the VALUE SET and not the storage. A select and a switch
 * can only take values this deployment already knows — a domain it
 * carries, a format the union spells, a channel that exists — so a
 * saved reading of one is a complete reading of what it would do. A
 * text box accepts anything, and an address no channel has validated
 * would be a fabrication rather than a reading whether it were kept
 * for a tab or forever. `./SettingsPage.tsx` draws those two
 * `disabled` and `readOnly` for that reason and states it again at the
 * control.
 *
 * ## An override that agrees with what is stored is not an override
 *
 * Every `with*` function below DROPS its key when the new value equals
 * the stored one, so switching a channel off and back on leaves the
 * draft exactly as it found it — `{}` rather than `{ channels: {...} }`
 * holding a value that happens to match. Same property the lexicon's
 * delta has for the same reason: "nothing has been changed" and
 * "everything changed has been changed back" have to be one state, as
 * they will have to be the day this is written through to an endpoint
 * that only ships what moved.
 *
 * It is also what makes {@link isPristine} a fact about the page
 * rather than about how many controls have been touched, and through
 * {@link canSaveSettings} it is what takes the save control away
 * again: an operator who undoes their own change is offered no save,
 * because there is nothing left for one to send.
 *
 * ## The vocabulary is the tools surface's
 *
 * {@link FORMAT_OPTIONS} and the cadence labels come from
 * `../tools/cards`, imported rather than restated. The two surfaces
 * are talking about one thing from two ends: this page states the
 * defaults a NEW `export_subscriptions` row starts from, and that one
 * lists the rows themselves. A second copy of the format names or of
 * the cadence phrasing would let `86400` read as `Daily` on one
 * surface and `Every 1 day` on the other, which is a promise and a
 * result that disagree on sight.
 *
 * ## An option list has to contain the value it is showing
 *
 * `Select` resolves its trigger as `options.find(o => o.value ===
 * value) ?? options[0]`, so a value no option carries does not render
 * blank — it renders somebody ELSE'S option while the stored
 * preference goes unmentioned. {@link domainOptions} and
 * {@link cadenceOptions} therefore both take the current value and
 * guarantee it is a member. `FORMAT_OPTIONS` needs no such argument
 * because it is total over `ExportFormat` and the compiler says so.
 */

import type {
  Domain,
  ExportFormat,
  NotificationChannel,
  Settings,
} from '../../data/types';
import type { SelectOption } from '@ar/ui';

import { NOTIFICATION_CHANNELS } from '../../data/settings';
import { EXPORT_FORMATS, cadenceLabel, formatFacet } from '../tools/cards';

/**
 * An operator's untried changes to their own preferences.
 *
 * Sparse on purpose: an absent member means "whatever is stored",
 * which is what lets a round trip back to the stored value leave no
 * trace. Flat rather than mirroring `Settings`' nesting, so each
 * control's writer is one key rather than a merge of two levels.
 */
export interface SettingsDraft {
  /** Overrides {@link Settings.defaultDomainSlug}. */
  readonly defaultDomainSlug?: string;
  /** Overrides `Settings.digest.format`. */
  readonly digestFormat?: ExportFormat;
  /** Overrides `Settings.digest.intervalSeconds`. */
  readonly digestIntervalSeconds?: number;
  /**
   * Overrides individual channels of
   * {@link Settings.notificationChannels}.
   *
   * Partial rather than total, unlike the stored record: a channel
   * nobody has touched has to stay absent, or the first flip of any
   * switch would pin all three.
   */
  readonly notificationChannels?: Readonly<
    Partial<Record<NotificationChannel, boolean>>
  >;
}

/**
 * A draft with nothing in it — where the page starts, every mount.
 *
 * Frozen because it is a module-scope singleton handed to every
 * caller: a `with*` function writing through its argument would edit
 * the initial state of every later mount in the tab.
 */
export const EMPTY_DRAFT: SettingsDraft = Object.freeze({});

/**
 * The same draft, writable — for the one operation the interface's
 * `readonly` members refuse.
 */
type MutableDraft = { -readonly [K in keyof SettingsDraft]: SettingsDraft[K] };

/**
 * The draft with one override taken out.
 *
 * Removing the key rather than setting it to `undefined`, which is
 * what makes {@link isPristine} a key count and what makes a draft
 * that has been changed and changed back compare equal to a fresh
 * one.
 *
 * @param draft - The draft as it stands.
 * @param key - Which override to drop.
 * @returns A fresh draft without it.
 */
function withoutOverride(
  draft: SettingsDraft,
  key: keyof SettingsDraft,
): SettingsDraft {
  const next: MutableDraft = { ...draft };

  delete next[key];

  return next;
}

/**
 * Whether the operator has changed anything.
 *
 * A count of keys rather than a comparison against the stored
 * settings, which is only correct because of the drop-on-equal rule
 * the header describes — no key here can hold a value that agrees
 * with what is stored.
 *
 * @param draft - The draft as it stands.
 * @returns Whether it holds nothing.
 */
export function isPristine(draft: SettingsDraft): boolean {
  return Object.keys(draft).length === 0;
}

/**
 * Whether the save control has anything to do.
 *
 * Three readings rather than one, because each refuses for a different
 * reason and only the middle one is about the operator. There has to
 * be a settled preference set for the payload to be built out of; the
 * draft has to hold something the stored value does not already say;
 * and a save already in flight must not be started a second time.
 *
 * The first is why this takes the possibly-absent value rather than a
 * settled one — a page cannot send {@link effectiveSettings}' answer
 * before there is a stored reading to lay the draft over. It NARROWS
 * nothing for the caller: a `.tsx` still guards its own payload, and
 * this decides only whether the control is offered.
 *
 * @param settings - The effective preferences, or undefined while the
 * read behind them has not settled.
 * @param draft - What the operator has changed since the last save.
 * @param saving - Whether a save is already in flight.
 * @returns Whether the save control should be live.
 */
export function canSaveSettings(
  settings: Settings | undefined,
  draft: SettingsDraft,
  saving: boolean,
): boolean {
  return settings !== undefined && !isPristine(draft) && !saving;
}

/**
 * What the page is showing: the stored preferences with the
 * operator's changes laid over them.
 *
 * A fresh object every call, nested objects included. The stored one
 * is frozen — `../../data/settings.ts` freezes it through, precisely
 * so a page cannot toggle it in place — and handing back anything
 * derived from it that a caller could write to would defeat the same
 * guarantee one level down.
 *
 * @param stored - What the deployment holds.
 * @param draft - What the operator has changed.
 * @returns The effective settings, for the controls to read.
 */
export function effectiveSettings(
  stored: Settings,
  draft: SettingsDraft,
): Settings {
  return {
    defaultDomainSlug: draft.defaultDomainSlug ?? stored.defaultDomainSlug,
    digest: {
      format: draft.digestFormat ?? stored.digest.format,
      intervalSeconds:
        draft.digestIntervalSeconds ?? stored.digest.intervalSeconds,
    },
    notificationChannels: {
      ...stored.notificationChannels,
      ...draft.notificationChannels,
    },
  };
}

/**
 * The draft after the domain select moves.
 *
 * @param stored - What the deployment holds.
 * @param draft - The draft as it stands.
 * @param slug - The domain now chosen.
 * @returns The new draft, without the key when the choice is what is
 * already stored.
 */
export function withDefaultDomain(
  stored: Settings,
  draft: SettingsDraft,
  slug: string,
): SettingsDraft {
  const rest = withoutOverride(draft, 'defaultDomainSlug');

  return slug === stored.defaultDomainSlug
    ? rest
    : { ...rest, defaultDomainSlug: slug };
}

/**
 * The draft after the digest format select moves.
 *
 * @param stored - What the deployment holds.
 * @param draft - The draft as it stands.
 * @param format - The format now chosen.
 * @returns The new draft, without the key when the choice is what is
 * already stored.
 */
export function withDigestFormat(
  stored: Settings,
  draft: SettingsDraft,
  format: ExportFormat,
): SettingsDraft {
  const rest = withoutOverride(draft, 'digestFormat');

  return format === stored.digest.format
    ? rest
    : { ...rest, digestFormat: format };
}

/**
 * The draft after the digest cadence select moves.
 *
 * @param stored - What the deployment holds.
 * @param draft - The draft as it stands.
 * @param intervalSeconds - The cadence now chosen.
 * @returns The new draft, without the key when the choice is what is
 * already stored.
 */
export function withDigestInterval(
  stored: Settings,
  draft: SettingsDraft,
  intervalSeconds: number,
): SettingsDraft {
  const rest = withoutOverride(draft, 'digestIntervalSeconds');

  return intervalSeconds === stored.digest.intervalSeconds
    ? rest
    : { ...rest, digestIntervalSeconds: intervalSeconds };
}

/**
 * The draft after one notification switch moves.
 *
 * Drops the channel when it returns to its stored reading, and drops
 * the whole member when that was the last channel in it — so a draft
 * carrying an empty override object is not a state this can produce,
 * and {@link isPristine} can stay a key count.
 *
 * @param stored - What the deployment holds.
 * @param draft - The draft as it stands.
 * @param channel - Which switch moved.
 * @param enabled - Where it now reads.
 * @returns The new draft.
 */
export function withNotificationChannel(
  stored: Settings,
  draft: SettingsDraft,
  channel: NotificationChannel,
  enabled: boolean,
): SettingsDraft {
  const rest = withoutOverride(draft, 'notificationChannels');
  // A fresh object rather than the draft's own: this is React state,
  // and one mutated in place is a new value that compares equal to the
  // old one and renders nothing.
  const next: Partial<Record<NotificationChannel, boolean>> = {
    ...draft.notificationChannels,
  };

  if (enabled === stored.notificationChannels[channel]) {
    delete next[channel];
  } else {
    next[channel] = enabled;
  }

  return Object.keys(next).length === 0
    ? rest
    : { ...rest, notificationChannels: next };
}

/**
 * The formats the digest default can be set to.
 *
 * Total over `ExportFormat` because {@link EXPORT_FORMATS} is, which
 * is what makes this the one select on the page needing no guard that
 * the stored value is among its options — the type says it is.
 *
 * Built once rather than per render: the formats are static, and
 * `Select` only reads the array it is handed. Mutable because that is
 * what `SelectProps` declares; the array is constructed here and
 * owned by nobody, unlike the frozen tables in `../../data`.
 */
export const FORMAT_OPTIONS: SelectOption[] = EXPORT_FORMATS.map(
  (format) => ({ value: format, label: formatFacet(format).label }),
);

/** Seconds in the units a cadence is offered in. */
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = SECONDS_PER_HOUR * 24;
const SECONDS_PER_WEEK = SECONDS_PER_DAY * 7;

/**
 * The cadences this surface offers, shortest first.
 *
 * Three rather than a spread of plausible intervals: `cadenceLabel`
 * has a word for exactly these and spells everything else out, so an
 * operator picking from this list gets `Hourly`, `Daily` or `Weekly`
 * and never `Every 3 days`. A select whose own options need a
 * paragraph is a select offering too much.
 *
 * The numbers are named here rather than imported because
 * `../tools/cards` keeps its own seconds-per-unit constants private —
 * what that module exports is the PHRASING, which is the half worth
 * sharing. `./fields.test.ts` holds these three against it, so a
 * disagreement is a test failure rather than an odd-looking option.
 */
export const CADENCE_CHOICES: readonly number[] = [
  SECONDS_PER_HOUR,
  SECONDS_PER_DAY,
  SECONDS_PER_WEEK,
];

/**
 * The cadences the select lists, with the current one guaranteed to
 * be among them.
 *
 * An interval outside the three offered ones is a value this page did
 * not put there and cannot represent — a subscription cadence chosen
 * elsewhere, or a default a later schema stores. It is added in its
 * own right rather than dropped, for the reason the header gives:
 * dropping it would leave `Select` showing the first option instead,
 * which is a different cadence presented as this deployment's.
 *
 * @param intervalSeconds - The cadence currently in effect.
 * @returns The options, shortest first.
 */
export function cadenceOptions(intervalSeconds: number): SelectOption[] {
  const offered = CADENCE_CHOICES.includes(intervalSeconds)
    ? CADENCE_CHOICES
    : [...CADENCE_CHOICES, intervalSeconds].sort((a, b) => a - b);

  return offered.map((seconds) => ({
    value: String(seconds),
    label: cadenceLabel(seconds),
  }));
}

/**
 * The cadence a select value names.
 *
 * `Select` hands back a string, and only ever one this module put in
 * its options — but a value arrives here as text and is validated
 * like any other boundary, so a cadence that cannot be a schedule
 * (zero, negative, fractional, not a number at all) is refused rather
 * than written into a draft where the label would then read
 * `No cadence`.
 *
 * @param value - What the select reported.
 * @returns The interval in seconds, or `undefined` if it is not one.
 */
export function parseCadenceValue(value: string): number | undefined {
  const seconds = Number(value);

  if (!Number.isInteger(seconds) || seconds <= 0) {
    return undefined;
  }

  return seconds;
}

/**
 * What the domain select says about a slug the deployment does not
 * carry.
 *
 * @param slug - The stored preference.
 * @returns The option's label.
 */
export function missingDomainLabel(slug: string): string {
  return `${slug} — not in this deployment`;
}

/**
 * The domains the default can be set to, with the current one
 * guaranteed to be among them.
 *
 * The stored preference and the domain list are two independent
 * reads: the fixtures pin them into agreement, and the API swap makes
 * them two endpoints that can disagree the moment a domain is
 * deleted. When they do, the stored slug is listed as itself and
 * labelled for what it is, rather than being silently replaced by the
 * first domain in the deployment — see the header on what `Select`
 * does with a value its options do not carry.
 *
 * @param domains - The deployment's domains, in switcher order.
 * @param selectedSlug - The preference currently in effect.
 * @returns The options, the deployment's own first.
 */
export function domainOptions(
  domains: readonly Domain[],
  selectedSlug: string,
): SelectOption[] {
  const options = domains.map((domain) => ({
    value: domain.slug,
    label: domain.name,
  }));

  return options.some((option) => option.value === selectedSlug)
    ? options
    : [...options, {
      value: selectedSlug,
      label: missingDomainLabel(selectedSlug),
    }];
}

/** How one notification channel is named and explained. */
export interface NotificationChannelFacet {
  /** Which channel this reads. */
  readonly channel: NotificationChannel;
  /** What the row calls it. */
  readonly label: string;
  /** What switching it on would mean, in one line. */
  readonly description: string;
}

/**
 * What each channel reads as, keyed by the channel itself.
 *
 * Total over `NotificationChannel`, and the entries omit the key for
 * the reason `../tools/cards` gives on its own facet tables: written
 * out, an entry filed under one key could name another and the row
 * would explain the wrong channel. A channel ADDED to the union is a
 * missing key the compiler refuses; a channel REMOVED is an excess
 * property. `./fields.test.ts` covers the third direction — a key
 * present and saying nothing.
 */
const CHANNEL_BODIES: Readonly<
  Record<NotificationChannel, Omit<NotificationChannelFacet, 'channel'>>
> = {
  email: {
    label: 'Email',
    description: 'A message per digest, to the operator address below.',
  },
  push: {
    label: 'Push',
    description: 'Browser notifications. Needs a registered device first.',
  },
  webhook: {
    label: 'Webhook',
    description: 'A POST per digest, for something else to react to.',
  },
};

const FACETS_BY_CHANNEL = new Map<
  NotificationChannel,
  NotificationChannelFacet
>(
  NOTIFICATION_CHANNELS.map((channel) => [
    channel,
    { channel, ...CHANNEL_BODIES[channel] },
  ]),
);

/**
 * How one channel is named and explained.
 *
 * Throws on a miss rather than answering `undefined`: the argument
 * comes from `NOTIFICATION_CHANNELS`, which this module builds its
 * own lookup from, so a miss is this file disagreeing with itself and
 * not a fact about a deployment.
 *
 * @param channel - The channel a switch is being drawn for.
 * @returns Its facet — the same object every caller gets.
 * @throws If this surface names no facet for that channel.
 */
export function channelFacet(
  channel: NotificationChannel,
): NotificationChannelFacet {
  const facet = FACETS_BY_CHANNEL.get(channel);

  if (facet === undefined) {
    throw new Error(`Unknown notification channel: ${channel}`);
  }

  return facet;
}

/**
 * How the notifications section reads its own state.
 *
 * A count rather than a list: three channels fit on the page, so the
 * chip says how many carry anything rather than repeating the names
 * beneath it.
 *
 * @param channels - The effective per-channel readings.
 * @returns The chip's text.
 */
export function enabledChannelsLabel(
  channels: Readonly<Record<NotificationChannel, boolean>>,
): string {
  const on = NOTIFICATION_CHANNELS.filter((channel) => channels[channel]);

  return `${on.length} of ${NOTIFICATION_CHANNELS.length} on`;
}
