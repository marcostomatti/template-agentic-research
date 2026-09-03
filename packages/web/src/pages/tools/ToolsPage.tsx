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
 * ## No writes on the PAGE, and no controls that pretend otherwise
 *
 * The spec has this surface editing connectors, testing a connection,
 * duplicating a row, and toggling a delivery on and off. None of that
 * is offered by this file, and the sources surface already settled
 * what to do about it — a control that silently did nothing would be
 * worse than one that is not there.
 *
 * The reason has narrowed twice and the sentence is worth keeping
 * accurate. There IS a write seam (`../../data/api.ts`'s
 * `saveConnector` and `saveExportSubscriptions`, reached through
 * `../../data/hooks.ts` like every read), and the first of those now
 * has a caller: editing a connector is offered, at the sub-route the
 * card and the row menu both open, by
 * `./ConnectorEditorModal.tsx`. What this page still offers nothing
 * for is the connection test, the duplicate, and the delivery toggle
 * — the third of which is a write this seam already carries, and the
 * toggle list that would call it is what is missing.
 *
 * That is also why the deliveries are rows rather than the spec's
 * `DecoratedToggleList`. The stored `enabled` flag is drawn as a
 * badge, in the idiom the lexicon card's `Suspended` badge set, and
 * the switch arrives with the endpoint that can answer it. A disabled
 * switch was the alternative, and it costs the whole section the
 * library's `disabled:opacity-50` — five faded rows read as a section
 * that failed to load rather than as one that is up to date.
 *
 * The one gesture that works is offered on the cards, and now twice
 * over: the card itself opens this surface's editor sub-route, and
 * the menu names the same navigation.
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
 * section above gives about the three the spec names.
 *
 * Nothing in this file is reachable from the unit suite, which is
 * node-only and collects `.ts` alone. Its bindings are proven by a
 * `check-types` mutation grid; what it renders falls to the Playwright
 * specs.
 */

import type { ExportSubscriptionSummary } from '../../data/connectors';
import type { Connector } from '../../data/types';

import {
  Badge,
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
import { useConnectors, useExportSubscriptions } from '../../data/hooks';
import { FIXTURE_NOW } from '../../data/types';
import { getSurface } from '../../routes/paths';

import {
  NEVER_SCHEDULED_LABEL,
  NOTHING_CONFIGURED_LABEL,
  cadenceLabel,
  configEntries,
  connectorCountLabel,
  connectorStatusFacet,
  exportCountLabel,
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

  const connectors = connectorsRead.data;
  const summaries = exportsRead.data;

  const handleEdit = (connectorId: number) => {
    // Relative, so one expression serves both route bases.
    void navigate(`${connectorId}/${EDIT_SEGMENT}`);
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
   * q15 swap makes it an HTTP call that can fail. Without this branch
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
 * The count and the unsubscribed line are dropped in every other
 * state. `0 of 0 active` over a body saying the domain could not be
 * read is a confident answer to a question nobody could answer, and a
 * list of every format this domain does not receive is worse than the
 * empty state that says the same thing in one sentence.
 *
 * @param props - Which state the read is in.
 * @returns The section.
 */
const ExportsSection = ({ failed, summaries }: ExportsSectionProps) => {
  const listed = failed
    ? undefined
    : summaries;
  const hasDeliveries = listed !== undefined && listed.length > 0;

  return (
    <SectionCard
      title={EXPORTS_TITLE}
      subtitle={EXPORTS_SUBTITLE}
      action={hasDeliveries
        ? <Tag tone="neutral">{exportCountLabel(listed)}</Tag>
        : undefined}
      // Full-bleed for the row list, padded for the single message
      // every other state renders — a message flush against the
      // section's border would read as a rendering fault.
      padded={!hasDeliveries}
      footer={hasDeliveries
        ? unsubscribedLabel(unsubscribedFormats(listed)) ?? undefined
        : undefined}
      footerDivider
    >
      <ExportsBody failed={failed} summaries={summaries} />
    </SectionCard>
  );
};

/**
 * The delivery rows, or the reason there are not any.
 *
 * @param props - Which state the read is in.
 * @returns The list, an empty state, or the loading stand-in.
 */
const ExportsBody = ({ failed, summaries }: ExportsSectionProps) => {
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
    <ul>
      {summaries.map((summary) => (
        <li
          key={summary.subscription.id}
          className="border-b border-border-soft px-[18px] py-3 last:border-b-0"
        >
          <DeliveryRow summary={summary} />
        </li>
      ))}
    </ul>
  );
};

/** What one delivery row is given. */
interface DeliveryRowProps {
  /** The subscription and the destination it was resolved to. */
  readonly summary: ExportSubscriptionSummary;
}

/**
 * One standing delivery: what is rendered, where it goes, how often,
 * and when it is next due.
 *
 * The stored format token leads in the monospace face, with the words
 * for it underneath — the same split the connector cards make, and the
 * reason both halves of this page read as one surface. The cadence
 * rides in a badge because it is the value an operator compares
 * between rows.
 *
 * `Paused` is drawn only where the row is switched off, in the idiom
 * the lexicon card's `Suspended` badge set: the absence of a marker is
 * the ordinary state, and marking both would make a scan of the list
 * harder rather than easier. Disabling is not cancelling, so a paused
 * row keeps its cadence and its due time on display.
 *
 * @param props - The delivery.
 * @returns The row.
 */
const DeliveryRow = ({ summary }: DeliveryRowProps) => {
  const { subscription, connector } = summary;
  const facet = formatFacet(subscription.format);

  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-fg3" aria-hidden>
        <Icon name={facet.icon} size={16} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[13px] font-semibold">
            {subscription.format}
          </span>

          <Badge tone="neutral" size="sm">
            {cadenceLabel(subscription.intervalSeconds)}
          </Badge>

          {!subscription.enabled && (
            <Badge tone="neutral" size="sm">Paused</Badge>
          )}
        </div>

        <p className="m-0 mt-0.5 truncate text-xs text-fg3">
          {facet.label}
          {' to '}
          <span className="font-mono" title={connector.name}>
            {connector.name}
          </span>
        </p>
      </div>

      <span className="shrink-0 text-xs text-fg3">
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
    </div>
  );
};
