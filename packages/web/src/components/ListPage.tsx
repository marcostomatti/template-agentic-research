/**
 * @packageDocumentation
 * The skeleton every list surface is built on: the heading band, the
 * filter bar under it, whatever the surface lists, and the modal its
 * rows open into.
 *
 * Five of the six surfaces take this shape — the digest and sources
 * list rows in a `Table`, the lexicon, agents and tools list cards in
 * an `EntityCardGrid`. Settings is the one that does not: it is a
 * single form with no rows to filter and none to open, so it composes
 * its own column and never comes through here.
 *
 * ## Why this one is not a stand-in
 *
 * Its neighbour `./PageHead` exists in order to be DELETED — a later
 * wave promotes it into `@ar/ui/molecules` — which is why that file
 * imports nothing from this app. This one is the opposite and stays
 * for good: it composes the router's `Outlet`, which no component
 * library can take without taking a router with it.
 *
 * The two sit side by side anyway, because the promotion should cost
 * this file one import line and cost the pages nothing at all. That
 * is also why the head props are not restated here but taken from
 * `PageHeadProps` and forwarded whole — a prop added to the head
 * cannot end up accepted by this type and dropped on the way down.
 *
 * ## The trailing Outlet
 *
 * Each list surface's modal sub-route is declared as a CHILD of the
 * surface route rather than a sibling (see `../routes/router`), so
 * the list route stays matched while a row is open. This is where the
 * modal arrives, and two things follow that are the whole point of
 * the shape: an operator deep-linking into a row gets the list
 * rendered behind it for free, and closing is a navigation up to the
 * parent rather than a re-entry into the list.
 *
 * It is rendered unconditionally because it costs nothing to be: an
 * `Outlet` with no matched child route renders null, and the `Modal`
 * it will hold takes itself out of flow. Neither ever shows up as a
 * gap in the column.
 *
 * ## Two surfaces rather than one
 *
 * `Toolbar` is the library's controlled filter compound and ships two
 * presentations: DETACHED, where it and the body each own a frame
 * with a gap between them, and ATTACHED, where the toolbar surface
 * owns the single frame and a `Table` renders `frame={false}` inside
 * it.
 *
 * This is the detached one, and the reason is that attached is not
 * available to every caller: three of the five list surfaces render an
 * `EntityCardGrid` of cards, which has no frame to hand over. One
 * skeleton all five share is worth more than a presentation two of
 * them could use.
 *
 * A surface with no filters passes no `controls` and gets no toolbar
 * at all — an empty bordered band reads as a control strip that
 * failed to load.
 *
 * ## What this deliberately does not slot
 *
 * The library's compound has a third row, `ToolbarSummary`, for the
 * result count and the active-filter chips. There is no slot for it
 * here because `PageHead`'s `tags` already has that job, and a page
 * with two places to say how many rows it is showing is a page that
 * will eventually say two different numbers.
 *
 * ## Spacing
 *
 * The column's `gap` is the whole of the page's vertical rhythm.
 * `PageHead` drops its own bottom margin for it, and `AppShellContent`
 * above contributes the padding and the scrolling but no rhythm of
 * its own.
 *
 * Nothing in this file is reachable from the unit suite, which is
 * node-only and collects `.ts` alone. Its bindings are proven by a
 * `check-types` mutation grid; what it renders falls to the
 * Playwright specs.
 */

import type { PageHeadProps } from './PageHead';
import type { ReactNode } from 'react';

import { Toolbar, ToolbarControls } from '@ar/ui';
import { Outlet } from 'react-router';

import { PageHead } from './PageHead';

/**
 * What a list surface hands its skeleton.
 *
 * The heading band's props are inherited rather than restated, and
 * forwarded as a whole — see the header on why.
 */
export interface ListPageProps extends PageHeadProps {
  /**
   * The surface's filter controls, laid out in the toolbar's control
   * row: a `SearchInput`, the `Select`s and `FilterDropdown`s a
   * surface filters by, a `ToolbarSep` between clusters.
   *
   * Controlled by the page, which reads and writes them through the
   * URL (`../routes/useSearchParamState`) and derives its own rows.
   * The toolbar presents controls; it owns no filter state, and
   * neither does this.
   *
   * Absent on a surface that filters by nothing, which is the only
   * way to get no toolbar.
   */
  readonly controls?: ReactNode;
  /**
   * What the surface lists — a `Table` of rows, or an
   * `EntityCardGrid` of cards.
   *
   * Rendered into the column directly rather than through a wrapper,
   * so a body of several elements stacks on the same rhythm as the
   * bands above it instead of inventing a second one inside.
   */
  readonly children: ReactNode;
}

/**
 * A list surface's skeleton.
 *
 * The element is a `section` because the page is one, and it is
 * deliberately left unnamed: it already sits inside the shell's
 * `main`, and naming it would add a region landmark that repeats the
 * `h1` immediately below it.
 *
 * @param props - The head's props, the filter controls where the
 * surface has any, and the body it lists.
 * @returns The composed surface, with the open row's modal at its end.
 */
export const ListPage = ({ controls, children, ...head }: ListPageProps) => (
  <section className="flex flex-col gap-4">
    <PageHead {...head} />

    {controls != null && (
      <Toolbar>
        <ToolbarControls>{controls}</ToolbarControls>
      </Toolbar>
    )}

    {children}

    <Outlet />
  </section>
);
