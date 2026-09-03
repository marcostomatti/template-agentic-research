/**
 * @packageDocumentation
 * The settings surface: the preferences that belong to the operator
 * rather than to any one research domain, and the one surface here
 * whose save is a page action rather than a modal's footer.
 *
 * ## Why it is not a list page
 *
 * Every other surface composes `../../components/ListPage` — a head, a
 * filter bar, a body of rows, and the `Outlet` a row's modal arrives
 * in. This one has no rows to filter, no rows to open, and the router
 * declares no sub-route under it. So it composes its own column: the
 * same `PageHead` the skeleton would have given it, on the same flex
 * rhythm, with `SectionCard`s instead of a table.
 *
 * ## Deployment-level, top to bottom
 *
 * All three reads take no domain argument. Switch domain with this
 * page open and nothing on it moves — which is the correct reading of
 * a preference that spans domains, and the clearest statement in the
 * shell of what `../../data/api.ts`'s two scopes mean. The tools
 * surface shows the same split within one page; this one shows a whole
 * surface on the far side of it.
 *
 * Each section gates on the read it needs rather than on all three
 * together, per the rule the tools surface settled: waiting is only
 * honest where the rendered unit is a JOIN. The default-domain section
 * IS one — it needs the preference and the domain list to say
 * anything at all — so it waits for both. The digest and notification
 * sections need the settings alone, and the operator section needs
 * neither.
 *
 * ## The controls are live, and a save keeps them for one tab
 *
 * `Settings` still mirrors no table: no column, no HTTP endpoint, and
 * a schema decision still open behind every control here. What there
 * is instead is the write seam — `../../data/api.ts`'s `saveSettings`
 * over the singleton slot in `../../data/drafts.ts`, reached through
 * `useSaveSettings` like every other write in this app — and what it
 * stores it stores for the LIFE OF THE TAB. A saved preference
 * survives a domain switch, a walk to another surface and back, and
 * every re-read in between; it is gone on reload, because that store
 * is module state and touches no storage at all.
 *
 * The banner above the column says exactly that, and it is not
 * decoration — it is the difference between a save that forgets and
 * one that forgets silently. `./fields.ts` owns the delta, the
 * payload and the argument behind both.
 *
 * The controls could not have been drawn any other way in any case. A
 * `Select` cannot be disabled at all (`SelectProps` carries no such
 * prop and spreads nothing onto its trigger), and a switch drawn
 * `disabled` costs the section the library's `disabled:opacity-50`,
 * which reads as a section that failed to load rather than one that is
 * up to date.
 *
 * The two operator fields are the exception, for the reason
 * `./fields.ts` gives: the line is the VALUE SET rather than the
 * storage. A select and a switch can only take values this deployment
 * already knows, so a saved reading of one is a complete reading of
 * what it would do. A text box accepts anything, and `Settings` names
 * no member for an operator anyway — so there is nowhere in the
 * payload for a name or an address to go, seam or no seam. Those two
 * are `disabled` AND `readOnly`: the variant is the only way to
 * disable a `Field`, and `readOnly` is what says the value is not
 * being collected, independently of how the control looks.
 *
 * ## The save button, and the two ways the chip clears
 *
 * `PageHead`'s `action` slot carries it — the one control this
 * surface leads with, and the first use of that slot in the app. It
 * is live only while `./fields.ts` says there is something to send:
 * a settled read to build the payload out of, a draft holding an
 * override, and no save already in flight.
 *
 * The chip beside the title reports the unsaved delta, and it clears
 * two ways. Putting every control back where they were empties the
 * draft through the drop-on-equal rule, with no save at all; a save
 * empties it here, in `mutate`'s own `onSuccess`. That callback runs
 * AFTER the hook's — `../../data/hooks.ts` hands the invalidation
 * promise back rather than firing it and moving on — so by the time
 * the draft is dropped the settings read has already answered with
 * the saved values, and no frame draws the ones it replaced.
 *
 * Nothing renders a save FAILURE, and that is a reading rather than
 * an omission: `saveSettings` takes no slug, so it has nothing to
 * refuse, and `../../data/api.ts` says outright that it cannot
 * reject. A notice here would be one nothing could reach.
 *
 * Nothing in this file is reachable from the unit suite, which is
 * node-only and collects `.ts` alone. Its bindings are proven by a
 * `check-types` mutation grid; what it renders falls to the Playwright
 * specs.
 */

import type { SettingsDraft } from './fields';
import type {
  Domain,
  ExportFormat,
  NotificationChannel,
  Settings,
} from '../../data/types';
import type { ProfileMenuUser } from '@ar/ui';
import type { ReactNode } from 'react';

import {
  Banner,
  Button,
  EmptyState,
  Field,
  SectionCard,
  Select,
  Skeleton,
  Switch,
  Tag,
} from '@ar/ui';
import { useId, useState } from 'react';

import { PageHead } from '../../components/PageHead';
import {
  useDomains,
  useOperator,
  useSaveSettings,
  useSettings,
} from '../../data/hooks';
import { NOTIFICATION_CHANNELS } from '../../data/settings';
import { getSurface } from '../../routes/paths';

import {
  EMPTY_DRAFT,
  FORMAT_OPTIONS,
  cadenceOptions,
  canSaveSettings,
  channelFacet,
  domainOptions,
  effectiveSettings,
  enabledChannelsLabel,
  isPristine,
  parseCadenceValue,
  withDefaultDomain,
  withDigestFormat,
  withDigestInterval,
  withNotificationChannel,
} from './fields';

/** Which surface this is — the page's title comes off the same table. */
const SURFACE_ID = 'settings';

/** What the banner over the column says, and why it is there. */
const TAB_SAVE_TITLE = 'Saved for this tab only';
const TAB_SAVE_BODY
  = 'This deployment has no table for operator preferences yet — they '
  + 'belong to no domain, and where they would live is still a schema '
  + 'decision. A save here is kept in the tab and laid over every later '
  + 'read of them: it survives a domain switch and a walk to another '
  + 'surface, and it is gone on reload.';

/** The chip beside the title while the operator has changed something. */
const UNSAVED_CHIP = 'Unsaved';

/** What the head's one control is called. */
const SAVE_LABEL = 'Save preferences';

/** How wide the selects on this page open. */
const SELECT_PANEL_WIDTH = 260;

/**
 * The settings surface.
 *
 * @returns The page: its head, the banner, and the four sections.
 */
export const SettingsPage = () => {
  const settingsRead = useSettings();
  const domainsRead = useDomains();
  const operatorRead = useOperator();
  // No slug, like the read it invalidates: an operator is a person and
  // not a workspace, so a domain switch leaves both where they were.
  const save = useSaveSettings();

  // What the operator has changed and has not yet committed. Empty at
  // mount and empty again after a save — see `./fields.ts` on why the
  // saved half lives under `../../data/api.ts` rather than here.
  const [draft, setDraft] = useState<SettingsDraft>(EMPTY_DRAFT);

  // Named as consts before anything branches on them: `read.data` is
  // `T | undefined` until a read settles, and TypeScript narrows a
  // const through a flag where it cannot narrow a property access.
  const stored = settingsRead.data;
  const domains = domainsRead.data;
  const operator = operatorRead.data;

  const settings = stored === undefined
    ? undefined
    : effectiveSettings(stored, draft);

  /**
   * Send the preference set the controls are drawn from.
   *
   * The guard NARROWS the payload rather than deciding anything: the
   * button is already dead without a settled read, and
   * `canSaveSettings` is where that decision lives.
   */
  const handleSave = () => {
    if (settings === undefined) {
      return;
    }

    save.mutate(settings, {
      // On success alone, and only once the invalidated read has
      // settled — see the header. Dropping the draft over stored
      // values that had not caught up would draw the page back to
      // what the save just replaced.
      onSuccess: () => {
        setDraft(EMPTY_DRAFT);
      },
    });
  };

  return (
    // `AppShellContent` contributes the padding and the scrolling but
    // no vertical rhythm, so the column owns its own — the same gap
    // the list-page skeleton uses, so this surface sits on the same
    // ladder as the other five.
    <section className="flex flex-col gap-4">
      <PageHead
        title={getSurface(SURFACE_ID).title}
        tags={isPristine(draft)
          ? undefined
          : <Tag tone="warning">{UNSAVED_CHIP}</Tag>}
        action={(
          <Button
            variant="primary"
            disabled={!canSaveSettings(settings, draft, save.isPending)}
            onClick={handleSave}
          >
            {SAVE_LABEL}
          </Button>
        )}
      />

      <Banner tone="warning" title={TAB_SAVE_TITLE}>{TAB_SAVE_BODY}</Banner>

      <DefaultDomainSection
        failed={settingsRead.isError || domainsRead.isError}
        settings={settings}
        domains={domains}
        onChange={(slug) => {
          setDraft((current) => (stored === undefined
            ? current
            : withDefaultDomain(stored, current, slug)));
        }}
      />

      <DigestSection
        failed={settingsRead.isError}
        settings={settings}
        onFormatChange={(format) => {
          setDraft((current) => (stored === undefined
            ? current
            : withDigestFormat(stored, current, format)));
        }}
        onIntervalChange={(seconds) => {
          setDraft((current) => (stored === undefined
            ? current
            : withDigestInterval(stored, current, seconds)));
        }}
      />

      <NotificationsSection
        failed={settingsRead.isError}
        settings={settings}
        onChange={(channel, enabled) => {
          setDraft((current) => (stored === undefined
            ? current
            : withNotificationChannel(stored, current, channel, enabled)));
        }}
      />

      <OperatorSection failed={operatorRead.isError} operator={operator} />
    </section>
  );
};

/** What one labelled setting row is given. */
interface SettingRowProps {
  /** What the row is called. */
  readonly label: string;
  /** What choosing it would mean, in a line under the label. */
  readonly description: string;
  /**
   * The control, called with the id of the row's own label.
   *
   * A render prop rather than a node because this row has something
   * to hand back: a control that can take `aria-labelledby` should be
   * named by the label an operator can see, rather than carrying a
   * second copy of the same words in a prop. `Select` cannot — it
   * accepts a string `ariaLabel` and spreads nothing — so the two
   * kinds of control on this page are named differently, which is the
   * library's shape rather than a choice made here.
   */
  readonly control: (labelId: string) => ReactNode;
}

/**
 * One setting: what it is, what it means, and the control for it.
 *
 * The rows carry their own separator and horizontal padding so the
 * sections holding them can run full-bleed — the same treatment the
 * tools surface gives its delivery list.
 *
 * @param props - The label, its explanation, and the control.
 * @returns The row.
 */
const SettingRow = ({ label, description, control }: SettingRowProps) => {
  const labelId = useId();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border-soft px-[18px] py-3.5 last:border-b-0">
      <div className="min-w-[12rem] flex-1">
        <div id={labelId} className="text-[13px] font-semibold text-fg1">
          {label}
        </div>
        <p className="m-0 mt-0.5 text-xs text-fg3">{description}</p>
      </div>

      <div className="shrink-0">{control(labelId)}</div>
    </div>
  );
};

/** What a section shows in place of its rows. */
interface SectionStateProps {
  /** Whether the read behind this section rejected. */
  readonly failed: boolean;
  /** What the failure says, in the operator's terms. */
  readonly title: string;
  /** The line under it. */
  readonly description: string;
}

/**
 * The message or the stand-in a section renders instead of its rows.
 *
 * @param props - Which state the read is in, and what to say about a
 * failure.
 * @returns The empty state, or the loading stand-in.
 */
const SectionState = ({ failed, title, description }: SectionStateProps) => {
  if (failed) {
    return <EmptyState title={title} description={description} />;
  }

  // `Skeleton` is aria-hidden, which is right for a frame that is gone
  // within a microtask against fixtures.
  return <Skeleton className="h-24 w-full rounded-lg" />;
};

/** What the default-domain section is given. */
interface DefaultDomainSectionProps {
  /** Whether either read behind this section rejected. */
  readonly failed: boolean;
  /** The effective preferences, or undefined until they settle. */
  readonly settings: Settings | undefined;
  /** The deployment's domains, or undefined until they settle. */
  readonly domains: readonly Domain[] | undefined;
  /** Report the select moving. */
  readonly onChange: (slug: string) => void;
}

/**
 * Which domain the single-domain base means.
 *
 * The one section on this page whose rendered unit is a JOIN: the
 * preference names a slug and the domain list is what turns it into a
 * name, so half of it is not worth drawing. Both reads are gated
 * together for that reason, and for that reason alone.
 *
 * @param props - Which state the reads are in, and the gesture.
 * @returns The section.
 */
const DefaultDomainSection = ({
  failed,
  settings,
  domains,
  onChange,
}: DefaultDomainSectionProps) => {
  const joined = !failed && settings !== undefined && domains !== undefined;

  return (
    <SectionCard
      title="Default domain"
      subtitle="Which research domain the app opens on when the address carries none."
      padded={!joined}
    >
      {joined
        ? (
          <SettingRow
            label="Domain"
            description="What / resolves to. A /d/<slug> address always names its own."
            control={() => (
              <Select
                value={settings.defaultDomainSlug}
                options={domainOptions(domains, settings.defaultDomainSlug)}
                onChange={onChange}
                width={SELECT_PANEL_WIDTH}
                ariaLabel="Default domain"
              />
            )}
          />
        )
        : (
          <SectionState
            failed={failed}
            title="Preferences could not be read"
            description="The deployment did not answer for its operator preferences or for its domains. Nothing here is scoped to a domain, so switching domains will not change it."
          />
        )}
    </SectionCard>
  );
};

/** What the digest-defaults section is given. */
interface DigestSectionProps {
  /** Whether the settings read rejected. */
  readonly failed: boolean;
  /** The effective preferences, or undefined until they settle. */
  readonly settings: Settings | undefined;
  /** Report the format select moving. */
  readonly onFormatChange: (format: ExportFormat) => void;
  /** Report the cadence select moving. */
  readonly onIntervalChange: (intervalSeconds: number) => void;
}

/**
 * What a new digest subscription would start from.
 *
 * Defaults rather than a subscription: nothing here schedules
 * anything, and the rows this domain actually receives are on the
 * tools surface. The two read identically because the vocabulary
 * behind both is one module — see `./fields.ts`.
 *
 * @param props - Which state the read is in, and the two gestures.
 * @returns The section.
 */
const DigestSection = ({
  failed,
  settings,
  onFormatChange,
  onIntervalChange,
}: DigestSectionProps) => {
  const settled = !failed && settings !== undefined;

  return (
    <SectionCard
      title="Digest defaults"
      subtitle="What a new export subscription starts from, before it is changed."
      padded={!settled}
    >
      {settled
        ? (
          <>
            <SettingRow
              label="Format"
              description="Which renderer a new subscription uses. No format sends anything on its own."
              control={() => (
                <Select
                  value={settings.digest.format}
                  options={FORMAT_OPTIONS}
                  onChange={(value) => {
                    onFormatChange(value as ExportFormat);
                  }}
                  width={SELECT_PANEL_WIDTH}
                  ariaLabel="Digest format"
                />
              )}
            />

            <SettingRow
              label="Cadence"
              description="How often a new subscription runs. An interval is a floor, not a promise."
              control={() => (
                <Select
                  value={String(settings.digest.intervalSeconds)}
                  options={cadenceOptions(settings.digest.intervalSeconds)}
                  onChange={(value) => {
                    // Refused rather than defaulted: a cadence that
                    // cannot be a schedule leaves the control where it
                    // was instead of writing a value the label would
                    // then have no word for.
                    const seconds = parseCadenceValue(value);

                    if (seconds !== undefined) {
                      onIntervalChange(seconds);
                    }
                  }}
                  width={SELECT_PANEL_WIDTH}
                  ariaLabel="Digest cadence"
                />
              )}
            />
          </>
        )
        : (
          <SectionState
            failed={failed}
            title="Preferences could not be read"
            description="The deployment did not answer for its operator preferences. The subscriptions it already has are on the tools surface."
          />
        )}
    </SectionCard>
  );
};

/** What the notifications section is given. */
interface NotificationsSectionProps {
  /** Whether the settings read rejected. */
  readonly failed: boolean;
  /** The effective preferences, or undefined until they settle. */
  readonly settings: Settings | undefined;
  /** Report one switch moving. */
  readonly onChange: (channel: NotificationChannel, enabled: boolean) => void;
}

/**
 * Which channels a notification goes out on.
 *
 * One switch per channel, in the order `../../data/settings.ts` lists
 * them — a record has no order a render may rely on, and a list of
 * toggles that reshuffles is one an operator hits by muscle memory and
 * gets wrong.
 *
 * @param props - Which state the read is in, and the gesture.
 * @returns The section.
 */
const NotificationsSection = ({
  failed,
  settings,
  onChange,
}: NotificationsSectionProps) => {
  const settled = !failed && settings !== undefined;
  const channels = settled
    ? settings.notificationChannels
    : undefined;

  return (
    <SectionCard
      title="Notifications"
      subtitle="Where this deployment reports a finished digest, and anything that needed attention."
      action={channels === undefined
        ? undefined
        : <Tag tone="neutral">{enabledChannelsLabel(channels)}</Tag>}
      padded={channels === undefined}
    >
      {channels === undefined
        ? (
          <SectionState
            failed={failed}
            title="Preferences could not be read"
            description="The deployment did not answer for its operator preferences, so which channels are on is unknown."
          />
        )
        : NOTIFICATION_CHANNELS.map((channel) => {
          const facet = channelFacet(channel);

          return (
            <SettingRow
              key={channel}
              label={facet.label}
              description={facet.description}
              control={(labelId) => (
                <Switch
                  checked={channels[channel]}
                  onChange={(next) => {
                    onChange(channel, next);
                  }}
                  aria-labelledby={labelId}
                />
              )}
            />
          );
        })}
    </SectionCard>
  );
};

/** What the operator section is given. */
interface OperatorSectionProps {
  /** Whether the operator read rejected. */
  readonly failed: boolean;
  /** Who this deployment runs as, or undefined until it settles. */
  readonly operator: ProfileMenuUser | undefined;
}

/**
 * Who this deployment runs as.
 *
 * The two fields the UI spec asks this page for, and the only two
 * controls on it the save above does not reach — see the header, and
 * `./fields.ts` behind it, on why a value SET is a complete reading
 * where free text is not, and on `Settings` naming no member either
 * of these could be sent in. The values are the same stub the
 * topbar's profile menu draws, read through the same accessor, so the
 * two cannot come to disagree.
 *
 * @param props - Which state the read is in.
 * @returns The section.
 */
const OperatorSection = ({ failed, operator }: OperatorSectionProps) => (
  <SectionCard
    title="Operator"
    subtitle="Who this deployment runs as. There is no sign-in and no second account."
    padded
  >
    {operator === undefined || failed
      ? (
        <SectionState
          failed={failed}
          title="The operator could not be read"
          description="This deployment did not answer for the identity it runs as."
        />
      )
      : (
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* `readOnly` beside the disabled variant: the variant is
              the only way to disable a `Field`, and on its own it says
              how the control LOOKS rather than that the value is not
              being collected. */}
          <Field
            className="flex-1"
            label="Name"
            value={operator.name}
            state="disabled"
            readOnly
            helper="Editable once there is somewhere to store an operator."
          />

          <Field
            className="flex-1"
            label="Email"
            value={operator.email}
            state="disabled"
            readOnly
            helper="Where the email channel above would deliver."
          />
        </div>
      )}
  </SectionCard>
);
