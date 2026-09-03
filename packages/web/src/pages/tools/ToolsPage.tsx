/**
 * @packageDocumentation
 * The tools surface: the services this deployment can call, and what
 * the active domain has standing orders to send out.
 *
 * Two sections rather than one page, because they are two different
 * questions with two different answers, and this is the only screen in
 * the shell where that shows. A connector is a fact about the
 * INSTALLATION — `connectors` has no `domain_id`, so which model
 * endpoint answers is the same whichever subject is being researched.
 * A subscription is a fact about the DOMAIN. Switch domain with this
 * page open and the cards do not move while the list beneath them
 * changes: that is the scoping rule of the whole data layer, drawn
 * once, in the one place a person can see both sides of it.
 *
 * ## Two reads, gated separately
 *
 * The digest and the agents surface join their reads, because a row on
 * each of those IS the join — a digest row joins a finding to its
 * document, a persona card names the domain the role belongs to. This
 * page is the other case, and it is the strongest example of it: the
 * two reads are not merely independent, they are differently SCOPED,
 * so waiting for one to render the other would tie a deployment-level
 * answer to a domain-level one for no reason at all.
 *
 * Each read is therefore named as its own const and each section
 * branches on its own state. Property accesses would not do: `data` is
 * `T | undefined` until a read settles, and TypeScript cannot narrow
 * `read.data` through a flag.
 *
 * ## What a connector card does not say
 *
 * LAST USED — the UI spec names it, and nothing stores it. `./cards.ts`
 * carries the argument at length, including why the obvious stand-in
 * (a destination's next delivery) is the wrong one HERE: it is
 * domain-scoped, and a card carrying it would move on a domain switch,
 * which costs this page the one thing it is uniquely able to show. The
 * reading lives on the delivery rows instead.
 *
 * Nothing stands in for it either: the card passes `EntityCard` no
 * `meta` slot at all, so no rule is drawn under an absence. A card
 * whose bottom edge borders empty space reads as a field that failed
 * to load rather than as one nothing has yet.
 *
 * ## No toolbar
 *
 * `ListPage` renders no filter bar for a surface that passes no
 * controls, and this is one — but for a different reason from the
 * lexicon's and the agents': not that there is too little to filter,
 * but that a control strip directly under the heading would appear to
 * narrow BOTH sections, and no honest control narrows both. A kind
 * filter over the cards would silently do nothing to the deliveries.
 *
 * If this surface earns filters, they belong in the section they
 * narrow — `SectionCard` has an `action` slot for exactly that — and
 * not in the page head.
 *
 * ## What this page writes, and the one gesture it still does not
 *
 * The spec has this surface editing connectors, testing a connection,
 * duplicating a row, and toggling a delivery on and off. Three of the
 * four are offered. Editing a connector opens at the sub-route the
 * card and the row menu both name, in `./ConnectorEditorModal.tsx` —
 * which is where the connection test landed too, as a reading of the
 * configuration in front of the operator rather than as a card-level
 * control (`./connectionTest.ts` says why a test of the stored row
 * would answer about the wrong payload). And a delivery is switched
 * on and off here, on the page, through `../../data/api.ts`'s
 * `saveExportSubscriptions` and the hook over it.
 *
 * DUPLICATE is the one left, and the sources surface already settled
 * what to do about it — a control that silently did nothing would be
 * worse than one that is not there. Nothing can carry it yet:
 * duplicating a connector is an INSERT, and `../../data/drafts.ts`
 * has no id to mint.
 *
 * ## The deliveries are the spec's toggle list now
 *
 * This section shipped once as badge-bearing rows: the stored
 * `enabled` flag was drawn as a `Paused` badge, in the idiom the
 * lexicon card's `Suspended` badge set, because the write a switch
 * would call had no caller and a control that did nothing was the
 * worse of the two. It has one, so the rows are `DecoratedToggleList`
 * options and the badge is gone — the switch IS the flag, and
 * drawing both would give one fact two places to disagree.
 *
 * What an option is KEYED on is `./cards.ts`'s decision and its
 * header carries the argument: a subscription rather than a format,
 * because two rows may share one and the seeded domain's two RSS
 * deliveries do. The formats this domain subscribes to nothing under
 * stay out of the list and keep the footer sentence they always had,
 * for the reason that module gives — switching one on is an INSERT
 * the seam cannot perform.
 *
 * The save cannot reject while the list is on screen, which is why
 * nothing here reports one. Its only refusal is a slug no domain
 * carries, and that is the same slug the READ resolves through: a
 * domain the write would refuse is one whose section is already
 * drawing its rejected state, with no control in it.
 *
 * The count went with the rows. `DecoratedToggleList` draws an
 * on-of-total indicator in its own group header, so the chip that
 * carried that figure in the section's action slot would now be a
 * second copy of one reading forty pixels away from the first.
 *
 * ## The grid track is the library's, and the page picks it
 *
 * `EntityCardGrid` owns the track as a variant, so this page carries
 * no grid-template class at all: it names which of the two minimums
 * the connector grid takes and leaves the rest to `@ar/ui`. `lg` is
 * the 340px the UI spec asks for here, and the wider of the two
 * because a connector card carries a stored config block — a key and
 * a value on one line, both clipped at the 300px the other grids take,
 * would leave a card saying which keys are set and not what they are
 * set to.
 *
 * Spelled rather than left to the variant's own default, for the
 * reason the lexicon and agents headers give: it is a real choice,
 * and both of those already name this grid as the one that takes the
 * other track.
 *
 * ## The card opens, and the menu still works
 *
 * The UI spec has a card click open its editor, and `EntityCard` is
 * how a card carrying a menu gets one without nesting an interactive
 * control inside another: the TITLE is the button, an `absolute
 * inset-0` child stretches its hit area over the whole card, and the
 * `action` slot sits in a positioned layer above that overlay. One
 * focusable open control per card, with the menu still reachable on
 * its own.
 *
 * What it costs is where things may go. The overlay covers the badge
 * row and the config block, so neither is selectable and nothing in
 * either may be interactive — which is why the `RowContextAction` is
 * passed as a SLOT rather than written into markup this page controls.
 *
 * The menu keeps its `Edit connector` item beside the gesture that
 * now duplicates it: it is the same navigation, and an entry dropped
 * because the card learned to open would read as one that was taken
 * away. It is still the only action offered, for the reason the
 * section above gives about DUPLICATE.
 *
 * Nothing in this file is reachable from the unit suite, which is
 * node-only and collects `.ts` alone. Its bindings are proven by a
 * `check-types` mutation grid; what it renders falls to the Playwright
 * specs.
 */

import type { ExportSubscriptionSummary } from '../../data/connectors';
import type { Connector } from '../../data/types';
import type { DecoratedToggleOption } from '@ar/ui';

import {
  Badge,
  DecoratedToggleList,
  EmptyState,
  EntityCard,
  EntityCardGrid,
  FormattedRelativeTime,
  Icon,
  RowContextAction,
  SectionCard,
  Skeleton,
  StatusIndicator,
  Tag,
} from '@ar/ui';
import { useNavigate, useParams } from 'react-router';

import { ListPage } from '../../components/ListPage';
import { classifyConnector } from '../../data/connectors';
import {
  useConnectors,
  useExportSubscriptions,
  useSaveExportSubscriptions,
} from '../../data/hooks';
import { FIXTURE_NOW } from '../../data/types';
import { getSurface } from '../../routes/paths';

import {
  NEVER_SCHEDULED_LABEL,
  NOTHING_CONFIGURED_LABEL,
  applyEnabledDeliveries,
  cadenceLabel,
  configEntries,
  connectorCountLabel,
  connectorStatusFacet,
  deliveryToggleId,
  enabledDeliveryIds,
  formatFacet,
  kindFacet,
  unsubscribedFormats,
  unsubscribedLabel,
} from './cards';

/** Which surface this is — the page's title comes off the same table. */
const SURFACE_ID = 'tools';

/** The sub-route a card's edit action opens, relative to this surface. */
const EDIT_SEGMENT = 'edit';

/**
 * The locale every formatted value on this page is rendered in.
 *
 * Pinned rather than left to the browser, for the reason `FIXTURE_NOW`
 * is pinned: a value rendered one way on one machine and another way
 * on the next makes the text a property of who is looking rather than
 * of the data.
 */
const DISPLAY_LOCALE = 'en-US';

/** What the second section is called, and what it says it is. */
const EXPORTS_TITLE = 'Export subscriptions';
const EXPORTS_SUBTITLE
  = 'What this domain sends out, and how often. The connectors above '
  + 'belong to the deployment; these belong to the domain.';

/**
 * What the toggle list calls the group it draws.
 *
 * `DecoratedToggleList` renders it beside its own on-of-total
 * indicator, so it has to be a word the ratio reads against rather
 * than a repeat of the section heading directly above it: five
 * FORMATS, four of them running.
 */
const EXPORTS_GROUP_TITLE = 'Formats';

/**
 * The tools surface.
 *
 * @returns The page: its head, the deployment's connector grid, this
 * domain's deliveries, and the `Outlet` an opened card's editor
 * arrives in.
 */
export const ToolsPage = () => {
  const { domainSlug } = useParams<{ domainSlug?: string }>();
  const navigate = useNavigate();

  // Deployment-level, so no slug goes in — see the header. The
  // domain-scoped read below is the only half a switch touches.
  const connectorsRead = useConnectors();
  const exportsRead = useExportSubscriptions(domainSlug);
  // Scoped like the read beside it and unlike the connector half:
  // whose deliveries these are moves with the domain.
  const saveSubscriptions = useSaveExportSubscriptions(domainSlug);

  const connectors = connectorsRead.data;
  const summaries = exportsRead.data;

  const handleEdit = (connectorId: number) => {
    // Relative, so one expression serves both route bases.
    void navigate(`${connectorId}/${EDIT_SEGMENT}`);
  };

  /**
   * Record the delivery list as a flip left it.
   *
   * Silent for a read that has not settled, which the control cannot
   * reach: the list is rendered out of `summaries`, so there is no
   * toggle on screen while it is undefined. The guard is what narrows
   * the type, and doing nothing is what an absent collection means.
   *
   * @param enabledIds - Every option the list now draws as on.
   */
  const handleDeliveryToggle = (enabledIds: readonly string[]) => {
    if (summaries === undefined) {
      return;
    }

    // The WHOLE collection, per `./cards.ts`: the write is a PUT.
    saveSubscriptions.mutate(applyEnabledDeliveries(summaries, enabledIds));
  };

  return (
    <ListPage
      title={getSurface(SURFACE_ID).title}
      // Counts the CONNECTORS rather than both sections: the chip sits
      // beside the heading, above the grid, and the deliveries carry
      // their own figure in their section's own header.
      //
      // Undefined rather than `false` while the read is in flight: the
      // head renders its tag row for anything that is not null, and
      // `false` would give it an empty one to space around.
      tags={connectors === undefined
        ? undefined
        : <Tag tone="neutral">{connectorCountLabel(connectors.length)}</Tag>}
    >
      <ConnectorsBody
        failed={connectorsRead.isError}
        connectors={connectors}
        onEdit={handleEdit}
      />

      <ExportsSection
        failed={exportsRead.isError}
        summaries={summaries}
        onToggle={handleDeliveryToggle}
      />
    </ListPage>
  );
};

/** What the connector half shows in place of its grid. */
interface ConnectorsBodyProps {
  /**
   * Whether the connectors read rejected.
   *
   * Unreachable against the fixtures — `fetchConnectors` takes no
   * argument and resolves from memory — and kept anyway, because the
   * API swap makes it an HTTP call that can fail. Without this branch
   * that failure would render as a deployment with no connectors
   * configured, which is a different and much more alarming statement.
   */
  readonly failed: boolean;
  /** The deployment's services, or undefined until the read settles. */
  readonly connectors: readonly Connector[] | undefined;
  /** Report a card's edit action being chosen. */
  readonly onEdit: (connectorId: number) => void;
}

/**
 * The connector grid, or the reason there is not one.
 *
 * Split out of the page rather than written as three nested ternaries
 * inside its JSX — the states are exclusive and each has something to
 * say, which reads as a sequence of early returns and as very little
 * else.
 *
 * @param props - Which state the read is in, and what to render with.
 * @returns The grid of cards, an empty state, or the loading stand-in.
 */
const ConnectorsBody = ({
  failed,
  connectors,
  onEdit,
}: ConnectorsBodyProps) => {
  if (failed) {
    return (
      <EmptyState
        title="Connectors could not be read"
        description="The deployment did not answer for its configured services. Nothing here is scoped to a domain, so switching domains will not change it."
      />
    );
  }

  if (connectors === undefined) {
    // `Skeleton` is aria-hidden, which is right for a frame that is
    // gone within a microtask against fixtures: announcing a loading
    // state that never gets read is noise.
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (connectors.length === 0) {
    return (
      <EmptyState
        title="No connectors yet"
        description="A connector is a service the pipeline calls — a model endpoint, a search API, somewhere to write an export. The first one gives a run something to reach."
      />
    );
  }

  return (
    // `lg` is the 340px track — spelled rather than defaulted, per
    // the page header on why a surface states which of the two it
    // takes, and on why this is the grid that takes the wider one.
    <EntityCardGrid min="lg">
      {connectors.map((connector) => (
        <ConnectorCard
          key={connector.id}
          connector={connector}
          onEdit={onEdit}
        />
      ))}
    </EntityCardGrid>
  );
};

/** What one connector's card is given. */
interface ConnectorCardProps {
  /** The service, and whatever configures it. */
  readonly connector: Connector;
  /** Report the edit action being chosen. */
  readonly onEdit: (connectorId: number) => void;
}

/**
 * One configured service, as a card.
 *
 * The name is the card's title because a connector's identity is its
 * name within its kind. It gives up the monospace face this page's
 * own heading gave it: `EntityCard` takes `title` as a string and
 * draws it itself, and a page reaching past that to restyle one
 * library heading would be this app choosing the library's typography
 * for one surface, on the last of three grids meant to read alike.
 * The agents card gave the same face up for the same reason. What it
 * was saying is still said a few lines down, where a reader can act
 * on it: the stored config sets key and value alike in monospace,
 * which is where a token is actually compared.
 *
 * Everything an operator can DO with the connector is passed to
 * `EntityCard` rather than rendered here — `onOpen` makes the title
 * the open control, and `action` is the layer the card keeps above
 * the overlay that gesture stretches. Everything they only READ goes
 * in the badge row and the body, which the overlay covers.
 *
 * @param props - The connector and the gesture the card reports.
 * @returns The card.
 */
const ConnectorCard = ({ connector, onEdit }: ConnectorCardProps) => {
  const kind = kindFacet(connector.kind);
  const status = connectorStatusFacet(classifyConnector(connector));

  return (
    <EntityCard
      title={connector.name}
      // The open gesture. `EntityCard` derives the card's hover
      // affordance from this being present, so there is no second
      // thing to keep in step with it.
      onOpen={() => onEdit(connector.id)}
      badges={(
        <>
          <Badge tone={kind.tone} size="sm">{kind.label}</Badge>

          <span className="ml-auto flex items-center gap-1.5 text-[12.5px] text-fg2">
            {/* No `label`: the words beside it already ARE the status,
                and naming the dot would announce them a second time. */}
            <StatusIndicator tone={status.tone} />
            {status.label}
          </span>
        </>
      )}
      // One action, and it is the one the card itself now performs.
      // Kept because it is the same navigation under a name — see
      // the page header on the three the spec names and this round
      // cannot honour.
      action={(
        <RowContextAction
          actions={[{
            icon: 'square-pen',
            title: 'Edit connector',
            onClick: () => onEdit(connector.id),
          }]}
          entityType="connector"
          entityName={connector.name}
        />
      )}
    >
      <ConnectorConfig connector={connector} />
    </EntityCard>
  );
};

/** What the config block is given. */
interface ConnectorConfigProps {
  /** The connector whose payload is being drawn. */
  readonly connector: Connector;
}

/**
 * A connector's stored configuration, key by key.
 *
 * `mt-auto` so the block sits on the card's bottom edge whatever the
 * config runs to: cards in a grid row stretch to the tallest, and
 * seven config blocks at seven different heights would read as seven
 * different kinds of thing.
 *
 * It is the card's BODY rather than its `meta` slot, though it draws
 * the footer's own rule: `entityCardMeta` lays its children out as a
 * wrapping ROW, and a key-and-value list read down a column is the
 * one shape that layout cannot carry. Passing it there would also
 * have drawn a second border over the one below.
 *
 * Values truncate with the whole string kept in a `title`, which is
 * the treatment the sources table gives an endpoint and for the same
 * reason: a stored token is checked exactly or not at all.
 *
 * @param props - The connector.
 * @returns The definition list, or the sentence for having no config.
 */
const ConnectorConfig = ({ connector }: ConnectorConfigProps) => {
  const entries = configEntries(connector.config);

  if (entries.length === 0) {
    return (
      <p className="m-0 mt-auto border-t border-border-soft pt-3 text-[12.5px] text-fg3">
        {NOTHING_CONFIGURED_LABEL}
      </p>
    );
  }

  return (
    <dl className="mt-auto flex flex-col gap-1.5 border-t border-border-soft pt-3 text-[12.5px]">
      {entries.map((entry) => (
        <div key={entry.key} className="flex items-baseline gap-3">
          <dt className="shrink-0 font-mono text-fg3">{entry.key}</dt>
          <dd
            className="m-0 ml-auto min-w-0 truncate font-mono"
            title={entry.value}
          >
            {entry.value}
          </dd>
        </div>
      ))}
    </dl>
  );
};

/** What the deliveries section is given. */
interface ExportsSectionProps {
  /** Whether the subscriptions read rejected — an unknown domain. */
  readonly failed: boolean;
  /** This domain's deliveries, or undefined until the read settles. */
  readonly summaries: readonly ExportSubscriptionSummary[] | undefined;
  /**
   * Report the toggle list's new ON set.
   *
   * The complete set rather than the option that moved, which is the
   * control's own contract and what lets one function record a flip
   * in either direction.
   */
  readonly onToggle: (enabledIds: readonly string[]) => void;
}

/**
 * The deliveries, in a section of their own.
 *
 * The section's chrome is rendered once and its body carries the
 * states, rather than each state carrying a copy of the section. What
 * that costs is the two derived slots having to ask whether there is
 * anything to derive from; what it buys is that the heading, and the
 * sentence under it explaining the scope, are present in every state
 * — including the one where the domain could not be read, which is
 * exactly when a reader needs to be told what this section is.
 *
 * The unsubscribed line is dropped in every other state: a list of
 * every format this domain does not receive is worse than the empty
 * state that says the same thing in one sentence, and over a body
 * reporting that the domain could not be read it would be a confident
 * answer to a question nobody could answer.
 *
 * No action slot and no `padded` override, both of which went with
 * the rows. The header's chip carried the on-of-total figure the
 * toggle list now draws itself, and the body is padded in every state
 * because the options are bordered boxes — full-bleed put the old
 * rows' own dividers flush with the section's border, and would put
 * two borders a pixel apart here.
 *
 * @param props - Which state the read is in, and what to report.
 * @returns The section.
 */
const ExportsSection = ({
  failed,
  summaries,
  onToggle,
}: ExportsSectionProps) => {
  const listed = failed
    ? undefined
    : summaries;
  const hasDeliveries = listed !== undefined && listed.length > 0;

  return (
    <SectionCard
      title={EXPORTS_TITLE}
      subtitle={EXPORTS_SUBTITLE}
      footer={hasDeliveries
        ? unsubscribedLabel(unsubscribedFormats(listed)) ?? undefined
        : undefined}
      footerDivider
    >
      <ExportsBody
        failed={failed}
        summaries={summaries}
        onToggle={onToggle}
      />
    </SectionCard>
  );
};

/**
 * The delivery toggles, or the reason there are not any.
 *
 * @param props - Which state the read is in, and what to report.
 * @returns The toggle list, an empty state, or the loading stand-in.
 */
const ExportsBody = ({
  failed,
  summaries,
  onToggle,
}: ExportsSectionProps) => {
  if (failed) {
    return (
      <EmptyState
        title="This domain could not be read"
        description="Nothing in this deployment answers to that domain. Pick one from the switcher above."
      />
    );
  }

  if (summaries === undefined) {
    return <Skeleton className="h-32 w-full rounded-lg" />;
  }

  if (summaries.length === 0) {
    return (
      <EmptyState
        title="No deliveries yet"
        description="A subscription pairs a format with somewhere to put it. Until there is one, this domain's findings stay in the digest."
      />
    );
  }

  return (
    <DecoratedToggleList
      title={EXPORTS_GROUP_TITLE}
      // `options` is declared mutable, and mapping a readonly array
      // already answers a fresh mutable one, so nothing is copied
      // here. `value` below is the binding that has to.
      options={summaries.map(deliveryOption)}
      // `enabledDeliveryIds` answers a READONLY array and the prop is
      // `string[]`. Spread rather than cast: the control is free to
      // hold what it is handed, and a cast would hand it a reading
      // several other things on this page derive from.
      value={[...enabledDeliveryIds(summaries)]}
      onChange={onToggle}
    />
  );
};

/**
 * One standing delivery, as an option in the toggle list.
 *
 * Every reading the old row carried survives the move, in the slot
 * `DecoratedToggle` gives it. The stored format token is the TITLE,
 * which the library already draws in the monospace face the row gave
 * it by hand; the words for that token are the DESCRIPTION underneath;
 * and the destination and the schedule ride in META, beside the title,
 * because they are what an operator compares between deliveries.
 *
 * The one reading that does NOT survive is `Paused`. The switch is
 * that badge now, and a row wearing both would give one stored flag
 * two things to disagree about.
 *
 * Nothing in here may be interactive: `DecoratedToggle` renders the
 * whole option as one `button`, which is what buys it a single
 * focusable control per row. `Badge`, `Icon` and
 * `FormattedRelativeTime` are a span, a span and a `time`, so all
 * three are content a button may hold.
 *
 * @param summary - The subscription and the destination it resolved
 * to.
 * @returns The option, keyed on the subscription rather than on its
 * format — `./cards.ts` carries that argument.
 */
const deliveryOption = (
  summary: ExportSubscriptionSummary,
): DecoratedToggleOption => {
  const { subscription, connector } = summary;
  const facet = formatFacet(subscription.format);

  return {
    id: deliveryToggleId(subscription),
    title: subscription.format,
    description: facet.label,
    decoration: <Icon name={facet.icon} size={16} />,
    meta: (
      <>
        <Badge tone="neutral" size="sm">
          {cadenceLabel(subscription.intervalSeconds)}
        </Badge>

        <span className="text-[12.5px] font-normal text-fg3">
          {'to '}
          <span className="font-mono" title={connector.name}>
            {connector.name}
          </span>
        </span>

        <span className="text-[12.5px] font-normal text-fg3">
          {subscription.nextRunAt === null
            ? NEVER_SCHEDULED_LABEL
            : (
              <>
                {'Due '}
                <FormattedRelativeTime
                  date={subscription.nextRunAt}
                  now={FIXTURE_NOW}
                  locale={DISPLAY_LOCALE}
                />
              </>
            )}
        </span>
      </>
    ),
  };
};
