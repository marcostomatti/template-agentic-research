/**
 * @packageDocumentation
 * The agents editor's decisions: what the role control offers, what
 * each of a persona's three fields writes into the draft, and what a
 * draft is refused for.
 *
 * Beside the modal rather than inside it, for the reason `./cards.ts`
 * gives about the page. The unit runner collects `.ts` files under
 * `src` in a node environment, so a decision living in a `.tsx` is
 * reachable by no test in this package at all, which leaves
 * `./AgentEditorModal.tsx` one control per field and the read states.
 *
 * Written a task ahead of that modal, so nothing imports this yet. The
 * grid next door is unchanged by it: `./AgentsPage.tsx` still offers
 * one action, and the sentences below are read by nobody until the
 * editor arrives.
 *
 * ## Three fields, and all three are the operator's
 *
 * `personas` is four columns and one of them is the id, which is why
 * `../../data/api.ts` says of `savePersona` that a persona is three
 * fields and all three are the operator's. Each gets a mover
 * below, and each answers a WHOLE row rather than the member it
 * changed: the row a query answered is what the mutation hands back,
 * and one mutated in place is a new value that compares equal to the
 * old one and renders nothing. `../lexicon/terms.ts` records the same
 * reasoning for its own movers, and `../digest/actions.ts` for
 * `withVerdict`.
 *
 * ## The role control offers what the domain plays, plus what is stored
 *
 * `personas.role` carries no CHECK — `../../data/types.ts` says
 * so on the column and `../../data/personas.ts` says why: the roles a
 * pipeline plays grow with the pipeline, so a fourth role is a row
 * rather than a migration. There is no union here to be total over,
 * which makes the domain's own personas the only place this shell
 * can learn which roles it plays.
 *
 * That leaves the value `@ar/ui`'s `Select` makes dangerous rather than
 * merely untidy: it resolves a value none of its options carry to the
 * FIRST option, silently. {@link personaRoleChoices} therefore takes
 * the STORED role as an argument and guarantees it a place, so a
 * persona is never drawn wearing the role of whichever card the list
 * happens to begin with — a wrong answer rather than a missing one, and
 * one the next save would store. The guarantee earns its keep in two
 * ordinary states rather than in a hypothetical: the persona read
 * settles before the list read does, and the list belongs to a domain
 * the draft has been moved out of.
 *
 * Unlike the kind control in `../sources/editor.ts` and the polarity
 * control in `../lexicon/terms.ts`, this one needs no narrowing on the
 * way back. `Select` hands its `onChange` a bare `string` and the
 * column IS a string, so there is nothing to refuse and no reading to
 * get wrong — the arrangement `../digest/actions.ts` is in with a
 * verdict, and for the same reason: a module refusing a role here
 * would re-close what the schema left open for every deployment that
 * plays a fourth one.
 *
 * ## Every alternative the control offers is refused today
 *
 * A role is unique WITHIN a domain — `personas_domain_id_role_unique`,
 * which `../../data/personas.ts` keys its own lookup on — so choosing a
 * role another persona of the same domain already holds is a collision,
 * and {@link validatePersonaDraft} says so. The list this shell can
 * build is exactly the roles that ARE held, and nothing in this wave
 * frees one: `../../data/drafts.ts` records edits to rows that already
 * exist and can insert or remove none. So over the fixtures as shipped,
 * every option but the stored one is refused.
 *
 * That is a property of the fixture set rather than of this module,
 * and it is worth stating rather than discovering. What it buys is a
 * refusal that is REACHABLE in the running demo, which is where the
 * sentence is actually read; what a list narrowed to unheld roles
 * would buy is a control offering nothing at all, there being none.
 * `./editor.test.ts` pins the property against the shipped rows, so a
 * seam that could insert a persona makes the case say so rather than
 * leaving the claim in prose.
 *
 * ## What a refusal may say
 *
 * One sentence per fault and never more, in the order the form draws
 * the fields. Each is a constant built from this module's own
 * vocabulary and quotes no part of the draft: a refusal an operator
 * reads goes into the DOM, into a screenshot and into whatever is
 * pasted into a support thread. `../../components/jsonDraft.ts`
 * carries that argument at length and `../lexicon/terms.ts` keeps the
 * same rule for the same reason.
 *
 * A blank role suppresses the collision sentence rather than adding to
 * it. Two sentences about one field, with one repair between them,
 * reads as two things to fix.
 *
 * ## Blank is trimmed, taken is exact
 *
 * The two role readings deliberately disagree about surrounding space,
 * because they are readings of different things. Blankness is about
 * what a value NAMES, and a role of spaces names nothing an operator
 * could recognise. Collision is about what the unique index COMPARES,
 * and that comparison is byte-exact — so a role carrying a
 * trailing space genuinely is a second row, and calling it a duplicate
 * would be this module applying a rule the database does not.
 *
 * ## Which array stance this module is in
 *
 * {@link personaRoleChoices} and {@link validatePersonaDraft} both
 * answer MUTABLE arrays, built fresh per call and owned by nobody — the
 * stance the option builders beside them take, and the opposite of the
 * frozen tables in `../../data/`. `SelectProps.options` is declared
 * mutable, so a shared list here would be one component away from being
 * edited in place.
 */

import type { Persona } from '../../data/types';
import type { SelectOption } from '@ar/ui';

/**
 * What the role field says when it holds nothing.
 *
 * Phrased as the rule rather than as the fault, so the field states
 * what a value has to be instead of scolding what is there — the
 * same phrasing `../sources/editor.ts` gives its endpoint refusal.
 *
 * Reachable from stored data rather than from typing: the control is a
 * `Select` over roles that exist, so the empty role it refuses is one
 * a row arrived carrying.
 */
export const ROLE_REQUIRED_SENTENCE = 'A role is what this persona is '
  + 'played as, so it cannot be blank.';

/**
 * What the role field says when another persona already holds the
 * chosen role.
 *
 * Two clauses because the refusal alone would read as a rule this
 * shell invented: the first names the constraint, the second says
 * which side of it the draft is on. Neither quotes the role — see
 * the header on what a refusal may say.
 */
export const ROLE_TAKEN_SENTENCE = 'A domain names each role once, and '
  + 'another persona in this domain already holds this one.';

/**
 * What the system-text field says when it holds nothing.
 *
 * A persona IS its system text — `../../data/personas.ts` calls
 * the row a standing instruction — so a blank one is a role with
 * nothing to say rather than a field somebody has not filled in yet.
 */
export const SYSTEM_TEXT_REQUIRED_SENTENCE = 'The system text is what '
  + 'this role is given to do, so it cannot be blank.';

/**
 * Whether a field reads as blank.
 *
 * Trimmed, per the header: a field of spaces looks empty and names
 * nothing, so it is the same state as an empty one rather than a
 * second state with a sentence of its own.
 *
 * @param value - A field of the draft.
 * @returns Whether it names anything.
 */
function isBlank(value: string): boolean {
  return value.trim() === '';
}

/**
 * Whether another persona of the same domain already holds this
 * draft's role.
 *
 * Three conditions and each is load-bearing. The id keeps a persona
 * from colliding with ITSELF, which is the ordinary state of an editor
 * that has changed nothing. The domain id is what makes the key
 * composite — `../../data/personas.ts` says at length what goes
 * wrong when a role is treated as unique on its own — and it is
 * read off the DRAFT rather than off the list, so a draft moved by
 * {@link withPersonaDomain} is compared against the domain it is in
 * now. And the role is compared exactly, per the header.
 *
 * The list is whatever the caller was handed, so a draft moved to a
 * domain that list does not describe collides with nothing. That is
 * honest rather than lax: this shell reads one domain at a time and
 * has not been told what the other one holds. See
 * {@link withPersonaDomain} for why no control reaches that state
 * today.
 *
 * @param draft - The persona as the operator has it.
 * @param personas - The personas the surface loaded.
 * @returns Whether the role is already spoken for.
 */
function isRoleTaken(
  draft: Persona,
  personas: readonly Persona[],
): boolean {
  return personas.some((persona) => persona.id !== draft.id
    && persona.domainId === draft.domainId
    && persona.role === draft.role);
}

/**
 * What the role control offers for one persona.
 *
 * The roles the domain plays, in the pass order
 * `../../data/personas.ts` keeps, then the stored role where that list
 * does not already carry it. Nothing re-sorts, and a stored role the
 * list has lost joins at the END rather than being spliced into a
 * position the pass no longer gives it.
 *
 * Values are de-duplicated, first occurrence winning, which is what
 * makes the common case — a stored role the list DOES carry — offer one
 * option rather than two. A duplicate value in a `Select` renders a
 * second, unreachable radio item rather than an error, so it is a
 * defect that would never announce itself.
 *
 * Labels are the stored tokens rather than prose, because that is what
 * the card heading beside them shows: an editor offering
 * `Research agent` next to a card titled `researcher` would be two
 * names for one thing.
 *
 * Built fresh per call and owned by nobody — see the header on
 * which array stance this module is in.
 *
 * @param personas - The personas the surface loaded, in pass order.
 * Usually the draft's own domain, and never has to be: the stored
 * role is guaranteed a place whatever this list holds.
 * @param stored - The role the persona is being edited from.
 * @returns One option per distinct role, in offer order.
 */
export function personaRoleChoices(
  personas: readonly Persona[],
  stored: string,
): SelectOption[] {
  const offered = [...personas.map((persona) => persona.role), stored];

  return [...new Set(offered)].map(
    (role) => ({ value: role, label: role }),
  );
}

/**
 * The persona after its role changes.
 *
 * A fresh row every time, with nothing else touched — see the
 * header on why a mover answers the whole row.
 *
 * The role is not checked against the offered list and not checked
 * against the domain, deliberately. Membership is the control's
 * business and uniqueness is {@link validatePersonaDraft}'s, so a
 * mover that refused would leave a field unable to show what an
 * operator just chose and would put the same rule in two places.
 *
 * @param persona - The row as it stands.
 * @param role - Whatever the control reported.
 * @returns The row wearing that role.
 */
export function withPersonaRole(
  persona: Persona,
  role: string,
): Persona {
  return { ...persona, role };
}

/**
 * The persona after its system text is rewritten.
 *
 * {@link withPersonaRole}'s sibling and its equal: the editor
 * draws one control per field and each writes one column.
 *
 * The text is stored exactly as typed, including surrounding space. A
 * mover that trimmed would eat the space between two words as the
 * second one was being typed, which is the trap
 * `../sources/editor.ts` avoids by trimming at the crossing rather
 * than on every keystroke — and this field has no crossing to
 * trim at, since every string is a system text. {@link isBlank} is
 * where the trimming lives instead: what a text NAMES is the only
 * question this module asks of the space around it.
 *
 * @param persona - The row as it stands.
 * @param systemText - The text as the operator has it.
 * @returns The row carrying that text.
 */
export function withPersonaSystemText(
  persona: Persona,
  systemText: string,
): Persona {
  return { ...persona, systemText };
}

/**
 * The persona after it is moved to another domain.
 *
 * The third field, and the one no control reaches in this wave. The
 * editor draws the domain as a reading rather than as a control, for a
 * reason the seam decides rather than the surface: `savePersona` is
 * scoped by the SLUG it is called with, and `fetchPersonas` lists a
 * domain's rows out of the fixture and overlays drafts by row id
 * over that list. A moved row would therefore be recorded under the
 * domain it left and go on being drawn there, wearing an id naming a
 * domain whose grid never shows it. That is a wrong answer rather than
 * a missing feature, and it is the seam's to fix: the day the
 * write is a PUT carrying the row's own domain, this mover is
 * what a control writes through.
 *
 * It is not dead in the meantime. {@link isRoleTaken} reads the
 * domain off the DRAFT, so the pair is one claim rather than two: a
 * draft this moves is compared for uniqueness against the domain it
 * was moved to.
 *
 * @param persona - The row as it stands.
 * @param domainId - The `domains.id` it belongs to.
 * @returns The row scoped to that domain.
 */
export function withPersonaDomain(
  persona: Persona,
  domainId: number,
): Persona {
  return { ...persona, domainId };
}

/**
 * What is wrong with this draft, one sentence at a time.
 *
 * The order is the order the form draws its fields — role, then
 * system text — so the sentences read down the same way the
 * controls do. An empty list is a draft with nothing wrong, which is
 * what a save is gated on.
 *
 * Three faults and never a fourth: a blank role, a role another
 * persona of the same domain holds, and a blank system text. The two
 * this deliberately does not have are the domain id, which no control
 * writes (see {@link withPersonaDomain}) and which the reads would
 * refuse anyway, and any rule about the role's SPELLING —
 * the column is open, and a shell inventing a vocabulary for it would
 * refuse the fourth role a deployment invents.
 *
 * A blank role reports one sentence rather than two, per the header.
 *
 * Built fresh per call, and each sentence is a constant this module
 * owns: nothing here quotes the draft.
 *
 * @param draft - The persona as the operator has it.
 * @param personas - The personas the surface loaded, for the
 * uniqueness reading. A list this draft is not in refuses nothing on
 * its account.
 * @returns One sentence per fault, in form order; `[]` when the draft
 * is savable.
 */
export function validatePersonaDraft(
  draft: Persona,
  personas: readonly Persona[],
): string[] {
  const faults: string[] = [];

  if (isBlank(draft.role)) {
    faults.push(ROLE_REQUIRED_SENTENCE);
  } else if (isRoleTaken(draft, personas)) {
    faults.push(ROLE_TAKEN_SENTENCE);
  }

  if (isBlank(draft.systemText)) {
    faults.push(SYSTEM_TEXT_REQUIRED_SENTENCE);
  }

  return faults;
}
