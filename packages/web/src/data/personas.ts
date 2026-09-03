/**
 * @packageDocumentation
 * The persona fixtures — the standing instructions a domain gives each
 * role a run plays, and what the agents surface renders one card per.
 *
 * A persona is configuration of a DOMAIN rather than of the pipeline,
 * which is what makes the agents surface a page about the subject being
 * researched rather than a list of the software: what a researcher is
 * asked to be is a property of the radar it reads for. A run fetches
 * these rows at the top of each execution, so rewording one is an
 * UPDATE and not a rebuild and a redeploy — this page is where that
 * edit begins, and the reason no prompt string is written into a
 * workflow file at all.
 *
 * Content is transcribed from `packages/service/data/personas.json`,
 * the seed that ships with the service. Transcribed rather than
 * imported, for the reason `./types.ts` redeclares the schema rather
 * than importing it: `@ar/web` has no dependency on `@ar/service` and
 * should not take one to borrow a JSON file. What that buys is a shell
 * rehearsed against the prose an operator will actually meet — its
 * LENGTH is what the card's clamp has to cope with, and prose invented
 * to fit a card would rehearse the clamp against nothing. What it costs
 * is that nothing holds the two copies in step, so
 * `./personas.test.ts` pins the role and the system text of every row
 * exactly and names the seed path beside them: a drift is then a diff
 * against a file, not a discovery.
 *
 * {@link Persona} mirrors the whole `personas` table and narrows
 * nothing — it is four columns and every one of them is rendered here,
 * unlike `./digest.ts` and `./sources.ts`, which each leave pipeline
 * internals out.
 *
 * Three properties of the seed are load-bearing and deliberately
 * preserved:
 *
 * - ROLE ORDER is the order of a pass — research, then score, then
 *   draft — and not alphabetical. It is the seed's order and the order
 *   the cards render in, so a reader meets the roles in the sequence
 *   they run rather than in the sequence they were named.
 * - Every system text says `Placeholder.` in its own FIRST word. The
 *   seed states the rule and the reason: a persona is usually met as a
 *   row in a database with no file in view, so prose that is standing
 *   in for a real prompt has to say so where it is read, not where it
 *   was written.
 * - The three roles are the ones the pipeline plays TODAY, not a closed
 *   set. `personas.role` carries no CHECK — a fourth role is a row
 *   rather than a migration — which is why {@link Persona.role} is
 *   `string` and why nothing here counts personas per role the way
 *   `./sources.ts` counts sources per status. There is no union to be
 *   exhaustive over, so the transcription pin is the only thing
 *   asserting which roles exist.
 *
 * Every row belongs to the seeded domain. The sparse domain that
 * `./domains.ts` exports as `SPARSE_DOMAIN_SLUG` deliberately
 * gets none, which is how the agents empty state is reached in a
 * running demo: switch domain rather than empty a table. It is also the
 * honest state for that domain — a domain nobody has configured has no
 * personas, and a run of it could not start.
 *
 * The prose is illustrative and stays neutral about subject matter,
 * like the rest of `example-tech-radar`. Real prompt text belongs to
 * whoever operates an instance and reaches the database through their
 * own seeds.
 */

import type { Persona } from './types';

import { DEFAULT_DOMAIN_SLUG, getDomain } from './domains';

/**
 * The `domains.id` every row below references.
 *
 * Read off the domain fixture rather than written as `1`, so a change
 * to the domain table moves these rows with it instead of silently
 * orphaning them. Resolving at module scope means an import of this
 * module fails loudly if the seeded domain ever goes, which is the
 * right time to hear about it: there is no half of this fixture set
 * that still means something without its domain.
 */
const SEEDED_DOMAIN_ID = getDomain(DEFAULT_DOMAIN_SLUG).id;

/**
 * The standing instructions — `personas` rows, in pass order.
 *
 * Pass order is the seed's order and the order the agents surface
 * renders its cards in, so it is part of what this table means rather
 * than an accident of how it was typed.
 *
 * Nothing re-sorts them and no accessor copies the array: every member
 * of {@link Persona} is `readonly`, so handing rows out is not handing
 * out a way to change them.
 */
export const PERSONAS: readonly Persona[] = [
  {
    id: 1,
    domainId: SEEDED_DOMAIN_ID,
    // First of the pass: it reads documents and says what they say.
    role: 'researcher',
    // The three payloads below are the transcription the module
    // docblock describes, from the `personas` array of
    // `packages/service/data/personas.json`. Keep them character-equal
    // to the seed: `personas.test.ts` pins each one.
    systemText: 'Placeholder. You research the Example Tech Radar domain: '
      + 'work from the documents the pipeline hands you, summarize what '
      + 'each one says, and name the document behind every claim.',
  },
  {
    id: 2,
    domainId: SEEDED_DOMAIN_ID,
    // Second: it judges ONE finding at a time, against the domain's own
    // terms — the `terms` rows `./lexicon.ts` holds — rather than
    // against a standard shared across domains.
    role: 'scorer',
    systemText: 'Placeholder. You judge one finding for the Example Tech '
      + 'Radar domain against that domain\'s own terms and criteria, and '
      + 'say which of them the finding met.',
  },
  {
    id: 3,
    domainId: SEEDED_DOMAIN_ID,
    // Last: it writes the digest from the findings of a single pass and
    // adds none of its own, which is the constraint that keeps a digest
    // attributable to the documents behind it.
    role: 'drafter',
    systemText: 'Placeholder. You write the periodic digest for the '
      + 'Example Tech Radar domain from the findings of a single pass, in '
      + 'the order they are given and without adding any that are not in '
      + 'the list.',
  },
];

const PERSONAS_BY_ID = new Map<number, Persona>(
  PERSONAS.map((persona) => [persona.id, persona]),
);

/**
 * The key {@link findPersonaByRole} looks a row up under — the pair
 * `personas_domain_id_role_unique` holds, not the role alone.
 *
 * A role is unique WITHIN a domain and nowhere else: every domain names
 * its own researcher. Keying the map on the role by itself would answer
 * one domain's lookup with another domain's prompt, which is a wrong
 * answer rather than a missing one.
 *
 * @param domainId - The `domains.id` the persona speaks for.
 * @param role - The role, as the seed writes it.
 * @returns The composite key for the lookup map.
 */
function roleKey(domainId: number, role: string): string {
  return `${domainId}/${role}`;
}

const PERSONAS_BY_ROLE = new Map<string, Persona>(
  PERSONAS.map((persona) => [
    roleKey(persona.domainId, persona.role),
    persona,
  ]),
);

/**
 * The personas of one domain, in pass order.
 *
 * Scoped by numeric id rather than by slug: `./api.ts` is the module
 * that speaks slugs, and it resolves one through `getDomain`, whose
 * throw is where an unknown domain is refused. A domain with no
 * personas answers `[]`, which is a state the fixtures reach on purpose
 * rather than an error.
 *
 * @param domainId - The `domains.id` whose personas are wanted.
 * @returns Its personas, in pass order. Never the stored array.
 */
export function listPersonas(domainId: number): readonly Persona[] {
  return PERSONAS.filter((persona) => persona.domainId === domainId);
}

/**
 * Look a persona up by id, tolerating a miss.
 *
 * Use this where an unknown id is an ordinary outcome — the agents edit
 * sub-route carries one in the URL, so a stale bookmark reaches here as
 * a number nothing answers and the page renders a not-found state.
 * Where a miss would mean a broken fixture instead, {@link getPersona}
 * says so louder.
 *
 * @param id - The `personas.id` wanted.
 * @returns The persona, or `undefined` if no fixture carries that id.
 */
export function findPersona(id: number): Persona | undefined {
  return PERSONAS_BY_ID.get(id);
}

/**
 * Look a persona up by id, or throw.
 *
 * @param id - The `personas.id` wanted.
 * @returns The persona carrying that id.
 * @throws If no fixture persona carries it.
 */
export function getPersona(id: number): Persona {
  const persona = findPersona(id);

  if (persona === undefined) {
    throw new Error(`Unknown persona id: ${id}`);
  }

  return persona;
}

/**
 * Look a persona up by the natural key the table is upserted on.
 *
 * The lookup a RUN makes — a workflow fetches the text for the role it
 * is about to play — and so the one the API endpoint has to answer as
 * well as the id lookup above. Kept here rather than left to each
 * caller's `find` over {@link listPersonas} so that the composite key
 * is written once: see {@link roleKey} for what goes wrong when it is
 * not.
 *
 * Tolerant only, with no throwing twin. A role a domain does not
 * configure is an ordinary answer — the sparse domain configures none
 * at all — and unlike an id, a role is not something a URL hands over
 * for a page to fail on.
 *
 * @param domainId - The `domains.id` whose persona is wanted.
 * @param role - The role, as the seed writes it. Matched exactly.
 * @returns The persona, or `undefined` if that domain names no such
 * role.
 */
export function findPersonaByRole(
  domainId: number,
  role: string,
): Persona | undefined {
  return PERSONAS_BY_ROLE.get(roleKey(domainId, role));
}
