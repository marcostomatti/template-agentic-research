/**
 * @packageDocumentation
 * The lexicon surface: what this domain sorts its subject matter into,
 * and how much vocabulary each bucket has to sort it with.
 *
 * A card per category rather than a row per term, because the taxonomy
 * is what an operator reasons about — a bucket is either pulling its
 * weight or it is not — while the terms themselves are edited a
 * bucketful at a time, in the modal this page's `Outlet` will hold.
 * `../../data/lexicon.ts` keeps categories and terms as two tables for
 * the same reason, and answers the join as one summary per card.
 *
 * ## One read, so one state to gate on
 *
 * The digest joins four reads and has to wait for all of them. This
 * surface reads `useCategorySummaries` and nothing else: the counting
 * happens in the data layer, so the page has no join to perform and no
 * partial state to guard against. What that costs is worth naming — a
 * card cannot show a term until the editor modal loads them — and what
 * it buys is that the q15 endpoint answers a card with one response
 * rather than shipping every term of every category to be counted in
 * a browser.
 *
 * ## No toolbar
 *
 * `ListPage` renders no filter bar for a surface that passes no
 * controls, and this is that surface. A seeded domain has three
 * categories: a search box over three cards narrows nothing an
 * operator cannot already see, and an empty bordered control strip
 * reads as one that failed to load.
 *
 * The search this surface will eventually want is over TERMS, not
 * over categories — `end of life`, which bucket is it in — and terms
 * arrive with the editor modal in q15. Adding a category filter now
 * would be the wrong control in the right place.
 *
 * ## The switch stores nothing
 *
 * `categories` has no enabled column, so the toggle is a delta held
 * for the life of the tab and written nowhere. `./cards.ts` documents
 * what that means and which schema decision q15 has to take; this file
 * owns the state and hands each card the reading of it.
 *
 * ## The grid track is the library's, and the page picks it
 *
 * `EntityCardGrid` owns the track as a variant, so this page carries
 * no grid-template class at all: it names which of the two minimums
 * the taxonomy takes and leaves the rest to `@ar/ui`. `md` is the
 * 300px the UI spec asks for here, and what `Grid`'s `auto` columns
 * (`minmax(180px, 1fr)`) could not give it.
 *
 * Spelled rather than left to the variant's own default, because it is
 * a real choice — the connector grid takes `lg` — and a surface whose
 * track can be read without opening the library is one that cannot
 * drift from the spec quietly.
 *
 * ## The card opens, and the switch still works
 *
 * The UI spec has a card click open the editor, and `EntityCard` is
 * how a card carrying a switch and a menu gets one without nesting an
 * interactive control inside another: the TITLE is the button, an
 * `absolute inset-0` child stretches its hit area over the whole card,
 * and the `control` and `action` slots sit in a positioned layer above
 * that overlay. One focusable open control per card, with the switch
 * and the menu still reachable on their own.
 *
 * What it costs is where things may go. The overlay covers the badge
 * row, the body and the meta footer, so nothing in them is selectable
 * and nothing in them may be interactive — which is why the switch and
 * the `RowContextAction` are passed as SLOTS rather than written into
 * markup this page controls. The menu keeps its `Edit terms` item
 * beside the gesture that now duplicates it: it is the same
 * navigation, and an entry dropped because the card learned to open
 * would read as one that was taken away.
 *
 * ## Four states
 *
 * A read that has not settled, a domain nothing answers to, a domain
 * with no taxonomy, and the grid. The third is not hypothetical: the
 * sparse domain in `../../data/domains.ts` deliberately carries no
 * categories, so the empty state is one domain switch away in the
 * running demo.
 *
 * Nothing in this file is reachable from the unit suite, which is
 * node-only and collects `.ts` alone. Its bindings are proven by a
 * `check-types` mutation grid; what it renders falls to the Playwright
 * specs.
 */

import type { SuspendedCategories } from './cards';
import type { CategorySummary } from '../../data/lexicon';

import {
  Badge,
  EmptyState,
  EntityCard,
  EntityCardGrid,
  RowContextAction,
  Skeleton,
  Switch,
  Tag,
  cn,
} from '@ar/ui';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { ListPage } from '../../components/ListPage';
import { useCategorySummaries } from '../../data/hooks';
import { getSurface } from '../../routes/paths';

import {
  POLARITY_FACETS,
  categoryCountLabel,
  isCategoryEnabled,
  polarityShares,
  termNoun,
  withCategoryEnabled,
} from './cards';

/** Which surface this is — the page's title comes off the same table. */
const SURFACE_ID = 'lexicon';

/** The sub-route a card's edit action opens, relative to this surface. */
const EDIT_SEGMENT = 'edit';

/**
 * The lexicon surface.
 *
 * @returns The page: its head, its grid of category cards, and the
 * `Outlet` an opened card's editor arrives in.
 */
export const LexiconPage = () => {
  const { domainSlug } = useParams<{ domainSlug?: string }>();
  const navigate = useNavigate();

  const categoriesRead = useCategorySummaries(domainSlug);

  // The delta the switches write, not a copy of anything read: no
  // column stores it, so it starts empty and nothing seeds it.
  const [suspended, setSuspended] = useState<SuspendedCategories>(
    () => new Set<number>(),
  );

  // Named rather than read through the hook result at each use: the
  // body branches on whether the read has settled, and `data` is
  // `T | undefined` until it has.
  const summaries = categoriesRead.data;

  const handleEnabledChange = (categoryId: number, enabled: boolean) => {
    setSuspended(
      (current) => withCategoryEnabled(current, categoryId, enabled),
    );
  };

  const handleEdit = (categoryId: number) => {
    // Relative, so one expression serves both route bases.
    void navigate(`${categoryId}/${EDIT_SEGMENT}`);
  };

  return (
    <ListPage
      title={getSurface(SURFACE_ID).title}
      // Undefined rather than `false` while the read is in flight: the
      // head renders its tag row for anything that is not null, and
      // `false` would give it an empty one to space around.
      tags={summaries === undefined
        ? undefined
        : <Tag tone="neutral">{categoryCountLabel(summaries.length)}</Tag>}
    >
      <LexiconBody
        failed={categoriesRead.isError}
        summaries={summaries}
        suspended={suspended}
        onEnabledChange={handleEnabledChange}
        onEdit={handleEdit}
      />
    </ListPage>
  );
};

/** What the lexicon shows in place of its grid. */
interface LexiconBodyProps {
  /** Whether the read rejected — an unknown domain, today. */
  readonly failed: boolean;
  /** The domain's taxonomy, or undefined until the read settles. */
  readonly summaries: readonly CategorySummary[] | undefined;
  /** Which categories the operator has switched off. */
  readonly suspended: SuspendedCategories;
  /** Report a card's switch moving. */
  readonly onEnabledChange: (categoryId: number, enabled: boolean) => void;
  /** Report a card's edit action being chosen. */
  readonly onEdit: (categoryId: number) => void;
}

/**
 * The page's body: the grid, or the reason there is not one.
 *
 * Split out of the page rather than written as three nested ternaries
 * inside its JSX — the states are exclusive and each has something to
 * say, which reads as a sequence of early returns and as very little
 * else.
 *
 * @param props - Which state the read is in, and what to render with.
 * @returns The grid of cards, an empty state, or the loading stand-in.
 */
const LexiconBody = ({
  failed,
  summaries,
  suspended,
  onEnabledChange,
  onEdit,
}: LexiconBodyProps) => {
  if (failed) {
    return (
      <EmptyState
        title="This domain could not be read"
        description="Nothing in this deployment answers to that domain. Pick one from the switcher above."
      />
    );
  }

  if (summaries === undefined) {
    // `Skeleton` is aria-hidden, which is right for a frame that is
    // gone within a microtask against fixtures: announcing a loading
    // state that never gets read is noise.
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (summaries.length === 0) {
    return (
      <EmptyState
        title="No categories yet"
        description="A category is the bucket its terms hang off — the first one gives the pipeline something to match on."
      />
    );
  }

  return (
    // `md` is the 300px track — spelled rather than defaulted, per the
    // page header on why a surface states which of the two it takes.
    <EntityCardGrid min="md">
      {summaries.map((summary) => (
        <CategoryCard
          key={summary.category.id}
          summary={summary}
          enabled={isCategoryEnabled(summary.category.id, suspended)}
          onEnabledChange={onEnabledChange}
          onEdit={onEdit}
        />
      ))}
    </EntityCardGrid>
  );
};

/** What one category's card is given. */
interface CategoryCardProps {
  /** The bucket and the two readings of its vocabulary. */
  readonly summary: CategorySummary;
  /** Where this card's switch reads. */
  readonly enabled: boolean;
  /** Report the switch moving. */
  readonly onEnabledChange: (categoryId: number, enabled: boolean) => void;
  /** Report the edit action being chosen. */
  readonly onEdit: (categoryId: number) => void;
}

/**
 * One taxonomy bucket, as a card.
 *
 * Everything an operator can DO with the bucket is passed to
 * `EntityCard` rather than rendered here: `onOpen` makes the title
 * the open control, and `control` and `action` are the layer the card
 * keeps above the overlay that gesture stretches. Everything they
 * only READ goes in the body and the meta footer, which the overlay
 * covers — that is what makes the whole card open.
 *
 * The split is drawn twice on purpose: a bar to compare this card
 * against the one beside it without reading, and three figures for the
 * operator who is. The bar is `aria-hidden` because it says nothing
 * the figures under it do not — a screen reader meeting both would
 * hear the same three numbers twice.
 *
 * @param props - The summary, the switch's reading, and the two
 * gestures the card reports.
 * @returns The card.
 */
const CategoryCard = ({
  summary,
  enabled,
  onEnabledChange,
  onEdit,
}: CategoryCardProps) => {
  const { category, termCount, polarity } = summary;
  const shares = polarityShares(polarity);

  return (
    <EntityCard
      title={category.name}
      // The open gesture. `EntityCard` derives the card's hover
      // affordance from this being present, so there is no second
      // thing to keep in step with it.
      onOpen={() => onEdit(category.id)}
      // Undefined rather than `false` for a live category: the card
      // renders its badge row for anything that is not null, and
      // `false` would give it an empty one to space around.
      //
      // Said in words as well as by the switch, because the switch is
      // a control an operator looks at when they are using it and the
      // badge is a state they read across a grid.
      badges={enabled
        ? undefined
        : <Badge tone="neutral" size="sm">Suspended</Badge>}
      // The label names the setting rather than its state: the state
      // rides `aria-checked`, which the switch keeps in step with what
      // is drawn.
      control={(
        <Switch
          checked={enabled}
          onChange={(next) => onEnabledChange(category.id, next)}
          aria-label={`Enable ${category.name}`}
        />
      )}
      // One action, and it is the one the card itself now performs.
      // Kept because it is the same navigation under a name, where
      // exporting a seed and deleting a category are mutations this
      // round still has no seam to write through — a menu item that
      // did nothing would be worse than one that is not there.
      action={(
        <RowContextAction
          actions={[{
            icon: 'square-pen',
            title: 'Edit terms',
            onClick: () => onEdit(category.id),
          }]}
          entityType="category"
          entityName={category.name}
        />
      )}
      meta={(
        <>
          {/* A `span` and not a `p`: `tokens.css` sets a paragraph's
              own font-size, which beats the footer's inherited one. */}
          <span className="text-fg1">
            <span className="font-mono">{termCount}</span> {termNoun(termCount)}
          </span>

          <dl className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {POLARITY_FACETS.map((facet) => (
              <div key={facet.polarity} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={cn(
                    'size-2 shrink-0 rounded-full',
                    facet.fillClass,
                  )}
                />
                <dt>{facet.label}</dt>
                <dd className="font-mono text-fg1">
                  {polarity[facet.polarity]}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    >
      <div
        aria-hidden
        className={cn(
          'flex h-1.5 w-full overflow-hidden rounded-full bg-surface-sunk',
          // Not a text colour, so dimming it costs no contrast — see
          // the badge above on why the card says this twice.
          !enabled && 'opacity-40',
        )}
      >
        {POLARITY_FACETS.map((facet) => (
          <span
            key={facet.polarity}
            className={facet.fillClass}
            // The one place a style attribute is the right tool, for
            // the reason `@ar/ui`'s `Progress` gives: the fraction is
            // genuinely dynamic and there is no utility for it.
            style={{ width: `${shares[facet.polarity]}%` }}
          />
        ))}
      </div>
    </EntityCard>
  );
};
