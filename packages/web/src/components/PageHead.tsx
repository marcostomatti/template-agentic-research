/**
 * @packageDocumentation
 * The band every surface opens with: what page this is, what is true
 * of it right now, and the one thing an operator leads with from here.
 *
 * ## An app-local stand-in
 *
 * `@ar/ui` ships no `PageHead`. The UI spec names one, and q15
 * promotes it into `@ar/ui/molecules` beside the `EntityCard` this
 * plan also does without — so this file exists in order to be
 * DELETED, and its whole brief is to make that deletion a change of
 * import rather than a rewrite of six pages.
 *
 * Two rules follow from that, and both are cheap to hold while it
 * lives here:
 *
 * - It imports nothing from this app. No route helpers, no fixture
 *   accessors, no `../data` types — everything it draws arrives as a
 *   prop, so the library could take the file as it stands.
 * - It renders what it is handed rather than deriving anything. A tag
 *   is a node, not a row it maps; the action is a node, not an
 *   `onClick` it wires. Composition a page can already write is
 *   exactly what a promoted component must hold no opinion about.
 *
 * What promotion WILL add is the library's own component contract —
 * `forwardRef`, an `HTMLAttributes` spread, a `cn(className)` merge —
 * which every `@ar/ui` export carries and nothing in this app needs.
 * Writing it here would be an API with no caller, kept alive by the
 * next reader assuming somebody depends on it.
 *
 * ## Slots rather than data props
 *
 * `tags` and `action` are plain nodes, and neither is a render prop:
 * this component has nothing to hand a caller back. Compare
 * `AppLayout`, whose `sidebar` slot IS a render prop, because the
 * collapse flag it needs lives there and nowhere else.
 *
 * Modelling the tags as DATA would mean restating the tone and
 * variant vocabulary of `Tag`, `Badge` and `Chip` — three components
 * the library already exports and a page composes directly — in a
 * third-party shape that would then have to grow a case per surface.
 *
 * ## Why the `h1` is here
 *
 * The topbar renders the same surface title and does it deliberately
 * as a plain element, so the document carries one top-level heading
 * and it is the page's. This is that heading. A surface skipping this
 * component is a surface with no `h1` at all, which is why the shared
 * list-page skeleton composes it rather than leaving it to each page.
 *
 * ## The two utilities on the heading
 *
 * `tokens.css` styles a bare `h1` at 60px with a 24px bottom margin —
 * the right answer for a heading standing alone on a marketing page,
 * and the wrong one under a 60px topbar band. Those two utilities
 * cancel it, and they are the ONLY presentation this file states
 * about type: family, weight, tracking and colour are the design
 * system's own answer for a heading and are left to it.
 *
 * The margin goes for a second reason as well. Vertical rhythm here
 * belongs to the parent's flex gap, and a component spacing itself
 * doubles up the moment a page stacks two of them.
 *
 * Nothing in this file is reachable from the unit suite, which is
 * node-only and collects `.ts` alone. Its bindings are proven by a
 * `check-types` mutation grid; what it renders falls to the
 * Playwright specs.
 */

import type { ReactNode } from 'react';

/** What a surface's heading band is given. */
export interface PageHeadProps {
  /**
   * The page's name, and the document's only top-level heading.
   *
   * A string rather than a node: every title comes out of the surface
   * table in `../routes/paths`, where each one is a single short
   * word, and a heading accepting markup invites a second level of
   * hierarchy inside the `h1` that no page needs.
   */
  readonly title: string;
  /**
   * Chips reading what is true of the page right now — a row count, a
   * filter that is on, a state the whole surface is in.
   *
   * Sits beside the title rather than under it, because it qualifies
   * the heading; anything that would want its own line is page body,
   * not head.
   */
  readonly tags?: ReactNode;
  /**
   * The one control this surface leads with, on the trailing edge.
   *
   * Singular by intent. A head offering three equal buttons has no
   * primary action, and the row-level and bulk gestures the pages
   * carry belong to the toolbar and the table beneath this.
   */
  readonly action?: ReactNode;
}

/**
 * A surface's heading band.
 *
 * @param props - The title, and whichever slots the surface fills.
 * @returns The head, for a page to stack above its toolbar and body.
 */
export const PageHead = ({ title, tags, action }: PageHeadProps) => (
  <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
    <h1 className="m-0 text-2xl">{title}</h1>

    {tags != null && (
      <div className="flex flex-wrap items-center gap-2">{tags}</div>
    )}

    {/* `ml-auto` rather than a spacer element: the head wraps, and a
        flex-1 spacer would take a whole row to itself the moment it
        did. */}
    {action != null && (
      <div className="ml-auto flex shrink-0 items-center gap-2">{action}</div>
    )}
  </header>
);
