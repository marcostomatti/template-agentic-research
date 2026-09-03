/**
 * @packageDocumentation
 * The agents surface: the standing instructions this domain hands each
 * role a run plays.
 *
 * A card per persona, because a persona is a short piece of prose an
 * operator writes and then lives with — the digest shows what came out
 * of a pass, the sources surface shows what went into one, and this is
 * where somebody changes what the pass was ASKED to do. A run reads
 * these rows at the top of each execution, so editing one is an UPDATE
 * rather than a rebuild and a redeploy: this page is where that edit
 * begins.
 *
 * ## Three cards, in pass order
 *
 * `../../data/personas.ts` keeps the seed's order — research, then
 * score, then draft — and the grid renders it, so a reader meets the
 * roles in the sequence they run rather than in the sequence somebody
 * happened to name them. Nothing here re-sorts.
 *
 * ## What each card says, and what it does not
 *
 * Role as the heading, domain in the badge row, and the opening of the
 * system text as the body. The UI spec names a fourth field, last-run,
 * and this card has none: `personas` is four columns and not one of
 * them is a timestamp. When a persona was last
 * played is a fact about a RUN — a join through `runs` and `llm_calls`
 * — and neither table is modelled in this shell's fixture layer at
 * all. Drawing a plausible date beside three real fields would be the
 * quiet mistake: it would read as a column that exists, and q15 would
 * meet an endpoint with nothing to answer it. The field arrives when
 * the run tables do.
 *
 * Nothing stands in for it either: the card passes `EntityCard` no
 * `meta` slot at all, so no rule is drawn under an absence. A card
 * whose bottom edge borders empty space reads as a field that failed
 * to load rather than as one nothing has yet.
 *
 * The domain is on the card rather than only in the topbar because a
 * persona is configuration OF a domain — what a researcher is asked to
 * be is a property of the subject being researched — and because at
 * the `/` base nothing else on this page names which domain that is.
 * It is the same on all three cards today, which is honest: they are
 * three roles of one domain, and `./AgentEditorModal.tsx` states the
 * domain as its third field for exactly this reason.
 *
 * It rides the badge row rather than a meta footer because it is what
 * the card is scoped BY and not a measurement of the row — read once
 * near the top with the role, rather than looked up at the bottom.
 *
 * ## The excerpt is a cut, not a CSS clamp
 *
 * `./cards.ts` owns the rule and says why at length. The short of it:
 * a `line-clamp` would make what the card says a property of the
 * window width, would leave the whole prompt in the DOM for a screen
 * reader while showing three lines to the eye, and could not be held
 * by any test in this repo.
 *
 * ## Two reads, joined rather than gated apart
 *
 * The sources surface reads two things and gates them separately,
 * because its stat band and its table are independent statements. This
 * page is the other case, the one the digest is: a CARD is the join —
 * it names a role and the domain that role belongs to — so a partial
 * one would render a card whose domain line fills itself in a frame
 * later. Both reads are named as constants first, since `useCache`
 * answers `T | undefined` until it settles and a property access is
 * not something the compiler can narrow through a flag.
 *
 * The domain read costs nothing extra in practice: the topbar's
 * switcher has already filed the same query key, so this is a cache
 * hit rather than a second request.
 *
 * ## No toolbar
 *
 * `ListPage` renders no filter bar for a surface that passes no
 * controls, and this is that surface — for the reason the lexicon
 * gives, at a third of the scale. A seeded domain configures three
 * personas: a search box over three cards narrows nothing an operator
 * cannot already see, and an empty bordered control strip reads as one
 * that failed to load.
 *
 * ## The grid track is the library's, and the page picks it
 *
 * `EntityCardGrid` owns the track as a variant, so this page carries
 * no grid-template class at all: it names which of the two minimums
 * the persona grid takes and leaves the rest to `@ar/ui`. `md` is the
 * 300px the UI spec asks for here, and what `Grid`'s `auto` columns
 * (`minmax(180px, 1fr)`) could not give it. Spelled rather than left
 * to the variant's own default, because it is a real choice — the
 * connector grid takes `lg` — and a surface whose track can be read
 * without opening the library is one that cannot drift from the spec
 * quietly.
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
 * row and the body, so neither is selectable and nothing in either
 * may be interactive — which is why the `RowContextAction` is passed
 * as a SLOT rather than written into markup this page controls.
 *
 * The menu keeps its `Edit persona` item beside the gesture that now
 * duplicates it: it is the same navigation, and an entry dropped
 * because the card learned to open would read as one that was taken
 * away. It is still the only action offered. The seam behind this
 * wave can UPDATE a persona — `savePersona` is what the editor modal
 * saves through — but `../../data/drafts.ts` records edits to rows
 * that already exist and can insert or remove none, so duplicating
 * and deleting are the two gestures with nothing behind them.
 *
 * ## Four states
 *
 * A read that has not settled, a domain nothing answers to, a domain
 * with no personas, and the grid. The third is not hypothetical: the
 * sparse domain in `../../data/domains.ts` deliberately configures
 * none, so the empty state is one domain switch away in the running
 * demo — and it is the honest state for that domain, since a run of it
 * could not start.
 *
 * Nothing in this file is reachable from the unit suite, which is
 * node-only and collects `.ts` alone. Its bindings are proven by a
 * `check-types` mutation grid; what it renders falls to the Playwright
 * specs.
 */

import type { Domain, Persona } from '../../data/types';

import {
  EmptyState,
  EntityCard,
  EntityCardGrid,
  RowContextAction,
  Skeleton,
  Tag,
} from '@ar/ui';
import { useNavigate, useParams } from 'react-router';

import { ListPage } from '../../components/ListPage';
import { useDomain, usePersonas } from '../../data/hooks';
import { getSurface } from '../../routes/paths';

import {
  SYSTEM_TEXT_EXCERPT_LIMIT,
  excerpt,
  personaCountLabel,
} from './cards';

/** Which surface this is — the page's title comes off the same table. */
const SURFACE_ID = 'agents';

/** The sub-route a card's edit action opens, relative to this surface. */
const EDIT_SEGMENT = 'edit';

/**
 * The agents surface.
 *
 * @returns The page: its head, its grid of persona cards, and the
 * `Outlet` an opened card's editor arrives in.
 */
export const AgentsPage = () => {
  const { domainSlug } = useParams<{ domainSlug?: string }>();
  const navigate = useNavigate();

  const personasRead = usePersonas(domainSlug);
  const domainRead = useDomain(domainSlug);

  // Named rather than read through the hook results at each use: the
  // body branches on whether both have settled, and `data` is
  // `T | undefined` until it has.
  const personas = personasRead.data;
  const domain = domainRead.data;

  const handleEdit = (personaId: number) => {
    // Relative, so one expression serves both route bases.
    void navigate(`${personaId}/${EDIT_SEGMENT}`);
  };

  return (
    <ListPage
      title={getSurface(SURFACE_ID).title}
      // Undefined rather than `false` while the read is in flight: the
      // head renders its tag row for anything that is not null, and
      // `false` would give it an empty one to space around.
      tags={personas === undefined
        ? undefined
        : <Tag tone="neutral">{personaCountLabel(personas.length)}</Tag>}
    >
      <AgentsBody
        failed={personasRead.isError || domainRead.isError}
        personas={personas}
        domain={domain}
        onEdit={handleEdit}
      />
    </ListPage>
  );
};

/** What the agents surface shows in place of its grid. */
interface AgentsBodyProps {
  /** Whether either read rejected — an unknown domain, today. */
  readonly failed: boolean;
  /** The domain's personas, or undefined until the read settles. */
  readonly personas: readonly Persona[] | undefined;
  /** The domain they belong to, or undefined until its read settles. */
  readonly domain: Domain | undefined;
  /** Report a card's edit action being chosen. */
  readonly onEdit: (personaId: number) => void;
}

/**
 * The page's body: the grid, or the reason there is not one.
 *
 * Split out of the page rather than written as three nested ternaries
 * inside its JSX — the states are exclusive and each has something to
 * say, which reads as a sequence of early returns and as very little
 * else.
 *
 * @param props - Which state the reads are in, and what to render
 * with.
 * @returns The grid of cards, an empty state, or the loading stand-in.
 */
const AgentsBody = ({
  failed,
  personas,
  domain,
  onEdit,
}: AgentsBodyProps) => {
  if (failed) {
    return (
      <EmptyState
        title="This domain could not be read"
        description="Nothing in this deployment answers to that domain. Pick one from the switcher above."
      />
    );
  }

  if (personas === undefined || domain === undefined) {
    // `Skeleton` is aria-hidden, which is right for a frame that is
    // gone within a microtask against fixtures: announcing a loading
    // state that never gets read is noise.
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (personas.length === 0) {
    return (
      <EmptyState
        title="No personas yet"
        description="A run reads its instructions from these rows, so a domain with none cannot start one. The first persona gives it a researcher."
      />
    );
  }

  return (
    // `md` is the 300px track — spelled rather than defaulted, per the
    // page header on why a surface states which of the two it takes.
    <EntityCardGrid min="md">
      {personas.map((persona) => (
        <PersonaCard
          key={persona.id}
          persona={persona}
          domain={domain}
          onEdit={onEdit}
        />
      ))}
    </EntityCardGrid>
  );
};

/** What one persona's card is given. */
interface PersonaCardProps {
  /** The role and the text it is given. */
  readonly persona: Persona;
  /**
   * The domain the persona configures.
   *
   * Handed down rather than looked up per card: `listPersonas` scopes
   * by this domain's own id, so every row on this page belongs to it
   * by construction and a per-card lookup would be a second answer to
   * a question already settled.
   */
  readonly domain: Domain;
  /** Report the edit action being chosen. */
  readonly onEdit: (personaId: number) => void;
}

/**
 * One standing instruction, as a card.
 *
 * The role is the card's title because a persona has no name column:
 * the role IS its identity, and it is unique within the domain. It
 * gives up the monospace face the page's own heading gave it —
 * `EntityCard` takes `title` as a string and draws it itself, and a
 * page reaching past that to restyle one library heading would be
 * this app choosing the library's typography for one surface, on the
 * first of three grids meant to read alike. What that face was
 * saying is still said where a reader can act on it: the editor
 * modal shows the role as a stored field rather than as prose.
 *
 * Everything an operator can DO with the persona is passed to
 * `EntityCard` rather than rendered here — `onOpen` makes the title
 * the open control, and `action` is the layer the card keeps above
 * the overlay that gesture stretches. Everything they only READ goes
 * in the badge row and the body, which the overlay covers.
 *
 * @param props - The persona, its domain, and the gesture the card
 * reports.
 * @returns The card.
 */
const PersonaCard = ({ persona, domain, onEdit }: PersonaCardProps) => (
  <EntityCard
    title={persona.role}
    // The open gesture. `EntityCard` derives the card's hover
    // affordance from this being present, so there is no second thing
    // to keep in step with it.
    onOpen={() => onEdit(persona.id)}
    // `Tag` and not `Badge`: the domain classifies the persona rather
    // than reporting a state it is in. `mono={false}` because a domain
    // NAME is prose — the tag's default face is for bare ids — and the
    // key rides inside the pill, so the value keeps the label the meta
    // footer used to give it.
    badges={(
      <Tag tone="neutral" mono={false}>
        <span className="text-fg3">Domain</span>
        {domain.name}
      </Tag>
    )}
    // One action, and it is the one the card itself now performs.
    // Kept because it is the same navigation under a name — see the
    // header on why it stays, and on the two gestures with no seam.
    action={(
      <RowContextAction
        actions={[{
          icon: 'square-pen',
          title: 'Edit persona',
          onClick: () => onEdit(persona.id),
        }]}
        entityType="persona"
        entityName={persona.role}
      />
    )}
  >
    <p className="m-0 text-sm leading-relaxed text-fg2">
      {excerpt(persona.systemText, SYSTEM_TEXT_EXCERPT_LIMIT)}
    </p>
  </EntityCard>
);
