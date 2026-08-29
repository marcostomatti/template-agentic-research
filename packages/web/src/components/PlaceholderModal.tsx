/**
 * @packageDocumentation
 * What every modal sub-route renders until that surface's real modal
 * lands: the row the URL names, and nothing an operator can change.
 *
 * Five of the six surfaces open one of their rows over the list they
 * sit on — the digest at `:entityId`, the lexicon, sources, agents and
 * tools at `:entityId/edit` — and each is declared under both route
 * bases, so ten registrations render this one component. That is the
 * whole constraint on what it may say: anything it claimed would have
 * to be true of a finding opening READ-ONLY and of four editors at
 * once.
 *
 * It is why there is no footer here. A disabled `Save` would state the
 * shape of the four editors and misstate the digest's, whose bare
 * `:entityId` is the read-only detail path the UI spec grows into a
 * full page later. The body says the one thing true of all five: the
 * address is live and nothing behind it is.
 *
 * ## Why `open` is a literal
 *
 * `Modal` is controlled, and this one is never handed `false`. The
 * route matching IS the open state, and the component is unmounted the
 * moment it stops matching — so there is no flag to keep in step with
 * the URL, and no way for the two to disagree.
 *
 * What that costs is the exit transition, which a component removed
 * from the tree never gets to play. Worth it: a modal that is a PLACE
 * rather than a state is what makes an open row linkable, reloadable,
 * and carried through a domain switch — `swapBase` keeps everything
 * below the base, this sub-route included.
 *
 * ## Why closing is a navigation, and why it is relative
 *
 * Closing cannot flip a flag, so it navigates to the parent route.
 * That target is `..` rather than a built path, for the reason the
 * router's index redirect is relative too: one expression then serves
 * all ten registrations, and no caller has to resolve which base it is
 * rendering under.
 *
 * `relative: 'route'` is stated rather than inherited, because the
 * difference is load-bearing here rather than cosmetic. Route-relative
 * pops the whole matched route, so the lexicon's two-segment
 * `:entityId/edit` climbs BOTH segments and lands on `/lexicon`.
 * Path-relative would climb one and land on `/lexicon/7` — a path no
 * route declares, and therefore the catch-all.
 *
 * It PUSHES rather than replaces. An operator who deep-linked straight
 * into a row has no earlier entry to be sent back to, and replacing
 * would walk them out of the app; pushing always lands on the list.
 * The back button then re-opens the row they just closed, which is the
 * coherent reading when the URL is the state.
 *
 * ## What the header says
 *
 * The eyebrow is the surface's own title, derived from the path
 * exactly as the topbar derives its heading — never from state, since
 * a back button and the domain switcher's base swap both change the
 * surface without passing through anything here. It is what
 * distinguishes the five registrations without there being five
 * elements.
 *
 * The title is passed for a second reason beyond naming the row:
 * `Modal` draws its header, and with it the close button and the
 * dialog's accessible name, only when it is given one. A titleless
 * placeholder would be an unnamed dialog dismissable by Escape and
 * backdrop alone.
 *
 * ## This is a placeholder, not a stand-in
 *
 * Its neighbour `./PageHead` exists to be PROMOTED — q15 moves it into
 * `@ar/ui/molecules`, which is why that file imports nothing from this
 * app. This one exists to be REPLACED, surface by surface, as each
 * real modal is written; there is nothing here for a component library
 * to take, since every line of it reads the router.
 *
 * Nothing in this file is reachable from the unit suite, which is
 * node-only and collects `.ts` alone. Its bindings are proven by a
 * `check-types` mutation grid; what it renders falls to the Playwright
 * specs.
 */

import { Field, Modal } from '@ar/ui';
import { useLocation, useNavigate, useParams } from 'react-router';

import { activeSurfaceId, getSurface } from '../routes/paths';

/**
 * The route this modal closes to: the list surface it hangs under.
 *
 * See the header on why it is relative, and on why the resolution mode
 * below is spelled out rather than left to its default.
 */
const CLOSE_TO = '..';

/** Resolve `..` against the ROUTE tree, not against the path. */
const CLOSE_OPTIONS = { relative: 'route' } as const;

/**
 * What stands in for the row id if the parameter is somehow absent.
 *
 * Unreachable as the routes are declared — `:entityId` is a required
 * segment and a required segment cannot match empty — but `useParams`
 * cannot know that, and the alternative to naming the case is a header
 * reading the literal `undefined` if a pattern ever made the segment
 * optional.
 */
const UNKNOWN_ROW = 'unknown';

/**
 * The stand-in modal every list surface's sub-route opens.
 *
 * @returns The modal, naming the row from the URL, over a body with
 * nothing live in it.
 */
export const PlaceholderModal = () => {
  const { entityId } = useParams<{ entityId?: string }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const surfaceId = activeSurfaceId(pathname);
  const rowId = entityId ?? UNKNOWN_ROW;

  return (
    <Modal
      open
      onClose={() => {
        void navigate(CLOSE_TO, CLOSE_OPTIONS);
      }}
      eyebrow={surfaceId === undefined
        ? undefined
        : getSurface(surfaceId).title}
      title={`Row ${rowId}`}
    >
      <div className="flex flex-col gap-4">
        {/* `tokens.css` sizes a bare `p` for prose standing on its own
            page and gives it a trailing margin. Inside the modal's own
            body those are three rules to cancel: the panel states the
            scale, and the column above states the rhythm. */}
        <p className="m-0 text-sm text-fg2">
          Opening a row is defined in the UI spec. This surface&apos;s
          modal arrives with a later stage — the address is live, and
          nothing behind it is yet.
        </p>

        <Field
          label="Row id"
          value={rowId}
          readOnly
          state="disabled"
          helper="Read from the route. Nothing here writes."
        />
      </div>
    </Modal>
  );
};
