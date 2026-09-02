import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge, Icon, IconButton, Switch, Tag } from '../../atoms';

import { EntityCard } from './EntityCard';
import { EntityCardGrid } from './EntityCardGrid';

/**
 * The action slot's stand-in. The real occupant is `RowContextAction`,
 * which lives a layer up in organisms and itself composes back down into
 * molecules — importing it from here would point a molecule's story
 * upward and straight back through its own layer. Its trigger is an
 * `ellipsis-vertical` icon button, which is exactly this, so the slot is
 * shown at the size and weight it really occupies.
 */
const ActionStandIn = ({ entity }: { entity: string }) => (
  <IconButton
    icon={<Icon name="ellipsis-vertical" size={16} />}
    label={`Actions for ${entity}`}
  />
);

/** One row of the fixed grid fixture below. */
interface TaxonomyRow {
  readonly id: number;
  readonly name: string;
  readonly terms: number;
  readonly reviewed: string;
}

/**
 * Fixed rows: the visual suite screenshots every story, so nothing here
 * may be generated, counted from the clock, or locale-formatted. The
 * lead row is named rather than indexed out of the list because the grid
 * stories drive it through `args` — and because `noUncheckedIndexedAccess`
 * makes every `[0]` a nullable read.
 */
const LEAD_ROW: TaxonomyRow = {
  id: 4101,
  name: 'Regulatory signals',
  terms: 128,
  reviewed: '2026-02-14',
};

/** The cards behind the lead one, so a grid story shows a real track. */
const OTHER_ROWS: readonly TaxonomyRow[] = [
  { id: 4102, name: 'Funding and acquisitions', terms: 96, reviewed: '2026-02-11' },
  { id: 4103, name: 'Model releases', terms: 61, reviewed: '2026-02-09' },
  { id: 4104, name: 'Benchmarks and evaluations', terms: 34, reviewed: '2026-02-02' },
];

const meta = {
  title: 'Molecules/EntityCard',
  component: EntityCard,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof EntityCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A single card at the width its track gives it — the grid stories below
 * show the track itself, so these four do not have to fight it for room.
 */
const CARD_WIDTH: Story['decorators'] = [
  (Story) => (
    <div className="max-w-md">
      <Story />
    </div>
  ),
];

/** One card of the grid stories below, from the same fixed rows. */
const gridCard = (row: TaxonomyRow) => (
  <EntityCard
    key={row.id}
    title={row.name}
    badges={<Badge tone="neutral" size="sm">{`${row.terms} terms`}</Badge>}
    control={<Switch checked aria-label={`Enable ${row.name}`} />}
    action={<ActionStandIn entity={row.name} />}
    meta={(
      <>
        <span className="text-fg3">Reviewed</span>
        <span className="ml-auto font-medium">{row.reviewed}</span>
      </>
    )}
    onOpen={() => undefined}
  >
    <p className="m-0 text-sm leading-relaxed text-fg2">
      What this bucket matches on, and how much vocabulary it has to
      match with.
    </p>
  </EntityCard>
);

/**
 * Every slot filled, and the card opens: title as a button whose hit
 * area is stretched over the whole card, switch and action in the layer
 * above it. All three stay independently clickable and focusable.
 */
export const Default: Story = {
  decorators: CARD_WIDTH,
  args: {
    title: 'Regulatory signals',
    badges: (
      <>
        <Badge tone="neutral" size="sm">128 terms</Badge>
        <Tag tone="success">Enabled</Tag>
      </>
    ),
    control: <Switch checked aria-label="Enable Regulatory signals" />,
    action: <ActionStandIn entity="Regulatory signals" />,
    meta: (
      <>
        <span className="text-fg3">Reviewed</span>
        <span className="ml-auto font-medium">2026-02-14</span>
      </>
    ),
    onOpen: () => undefined,
    children: (
      <p className="m-0 text-sm leading-relaxed text-fg2">
        Rulemaking, enforcement and consultation notices, weighted toward
        the jurisdictions this domain actually files in.
      </p>
    ),
  },
};

/**
 * The floor of the contract: a title and nothing else. No `onOpen`, so
 * the title is a plain heading — there is no button, no overlay, and
 * nothing on the card to focus.
 */
export const TitleOnly: Story = {
  decorators: CARD_WIDTH,
  args: { title: 'Model releases' },
};

/** Title plus badges — the shape a card takes before it has a body to show. */
export const TitleAndBadges: Story = {
  decorators: CARD_WIDTH,
  args: {
    title: 'Funding and acquisitions',
    badges: (
      <>
        <Badge tone="neutral" size="sm">96 terms</Badge>
        <Tag tone="warning">Suspended</Tag>
      </>
    ),
  },
};

/**
 * Every slot filled and `onOpen` absent: the same card with no open
 * gesture at all. Against `Default` this is the whole of what the
 * callback changes — a heading instead of a button, no stretched
 * overlay, and no hover on the border.
 */
export const WithoutOpen: Story = {
  decorators: CARD_WIDTH,
  args: {
    ...Default.args,
    onOpen: undefined,
  },
};

/**
 * The `md` track: `repeat(auto-fill, minmax(300px, 1fr))`, the taxonomy
 * and persona grids. `auto-fill` rather than `auto-fit` so a short list
 * stays card-width instead of stretching two cards across the viewport.
 */
export const GridMedium: Story = {
  args: { title: LEAD_ROW.name },
  render: (args) => (
    <EntityCardGrid min="md">
      <EntityCard
        {...args}
        badges={<Badge tone="neutral" size="sm">{`${LEAD_ROW.terms} terms`}</Badge>}
        control={<Switch checked aria-label={`Enable ${LEAD_ROW.name}`} />}
        action={<ActionStandIn entity={LEAD_ROW.name} />}
        onOpen={() => undefined}
      />
      {OTHER_ROWS.map(gridCard)}
    </EntityCardGrid>
  ),
};

/** The `lg` track: `minmax(340px, 1fr)`, the connector grid's wider cards. */
export const GridLarge: Story = {
  args: { title: LEAD_ROW.name },
  render: (args) => (
    <EntityCardGrid min="lg">
      <EntityCard
        {...args}
        badges={<Badge tone="neutral" size="sm">{`${LEAD_ROW.terms} terms`}</Badge>}
        control={<Switch checked aria-label={`Enable ${LEAD_ROW.name}`} />}
        action={<ActionStandIn entity={LEAD_ROW.name} />}
        onOpen={() => undefined}
      />
      {OTHER_ROWS.map(gridCard)}
    </EntityCardGrid>
  ),
};
