import type { Persona } from '../../data/types';

import { describe, expect, it } from 'vitest';

import { DEFAULT_DOMAIN_SLUG, getDomain } from '../../data/domains';
import { listPersonas } from '../../data/personas';

import {
  ROLE_REQUIRED_SENTENCE,
  ROLE_TAKEN_SENTENCE,
  SYSTEM_TEXT_REQUIRED_SENTENCE,
  personaRoleChoices,
  validatePersonaDraft,
  withPersonaDomain,
  withPersonaRole,
  withPersonaSystemText,
} from './editor';

/** The domain every shipped persona belongs to. */
const SEEDED_DOMAIN_ID = getDomain(DEFAULT_DOMAIN_SLUG).id;

/**
 * A second domain id, so a cross-domain case has somewhere to be.
 *
 * Derived from the seeded one rather than written as a literal, which
 * is the only way to be sure the two differ: `../../data/domains.ts`
 * is free to renumber its rows, and two cases agreeing on `1` and `2`
 * would go on passing while asserting nothing.
 */
const OTHER_DOMAIN_ID = SEEDED_DOMAIN_ID + 1;

/** A role no fixture and no case below configures. */
const UNPLAYED_ROLE = 'archivist';

/**
 * A token planted in a draft so the leak sweep has a needle.
 *
 * No hyphen and no space: the sweep looks for it whole, and a token
 * something might quote in pieces would let a partial echo pass.
 */
const SENTINEL = 'SNTNL9';

/**
 * A persona carrying only what a case names.
 *
 * @param overrides - The members the case is about.
 * @returns A whole row, so nothing under test is handed a partial one.
 */
function personaWith(overrides: Partial<Persona>): Persona {
  return {
    id: 1,
    domainId: SEEDED_DOMAIN_ID,
    role: 'researcher',
    systemText: 'Placeholder. A standing instruction.',
    ...overrides,
  };
}

/**
 * The first of a list, or a throw.
 *
 * `noUncheckedIndexedAccess` is on repo-wide, so an index into a
 * derived list is `Persona | undefined`. Throwing rather than
 * asserting non-null keeps a case that lost its subject loud instead
 * of letting every `expect` below it read `undefined`.
 *
 * @param personas - Any list.
 * @returns Its first member.
 */
function firstPersona(personas: readonly Persona[]): Persona {
  const [persona] = personas;

  if (persona === undefined) {
    throw new Error('Expected the list to carry a persona, and it did not.');
  }

  return persona;
}

/**
 * The values a call offered, in offer order.
 *
 * @param personas - The list handed to the builder.
 * @param stored - The role handed to it.
 * @returns The offered values.
 */
function offeredRoles(
  personas: readonly Persona[],
  stored: string,
): string[] {
  return personaRoleChoices(personas, stored).map((option) => option.value);
}

/**
 * Which of these sentences carry the planted token.
 *
 * The second reader the leak sweep needs: a builder cannot see its own
 * echo, so the sentences are re-read here rather than trusted. The
 * sweep drives it over a producer that genuinely leaks in the same
 * case, which is what says the reader would have found one.
 *
 * @param sentences - Whatever was produced.
 * @returns The members quoting the token.
 */
function leaking(sentences: readonly string[]): string[] {
  return sentences.filter((sentence) => sentence.includes(SENTINEL));
}

describe('personaRoleChoices', () => {
  it('offers a stored role the list does not carry', () => {
    // The whole reason the stored role is an argument: `Select`
    // resolves a value none of its options carry to the FIRST option,
    // so a persona whose role the list has lost would be drawn as
    // whichever card the list happens to begin with.
    // Arrange
    const played = [
      personaWith({ id: 1, role: 'researcher' }),
      personaWith({ id: 2, role: 'scorer' }),
    ];

    // Act
    const offered = offeredRoles(played, UNPLAYED_ROLE);

    // Assert
    expect(offered).toEqual(['researcher', 'scorer', UNPLAYED_ROLE]);
  });

  it('offers a stored role when the list has not settled', () => {
    // The ordinary shape of that guarantee rather than the exotic one:
    // the persona read and the list read settle separately, so an
    // empty list is a frame of every open editor.
    // Arrange / Act
    const offered = offeredRoles([], 'drafter');

    // Assert
    expect(offered).toEqual(['drafter']);
  });

  it('offers a stored role the list already carries exactly once', () => {
    // A duplicate value renders a second, unreachable radio item
    // rather than an error, so it would never announce itself.
    // Arrange
    const played = [
      personaWith({ id: 1, role: 'researcher' }),
      personaWith({ id: 2, role: 'scorer' }),
    ];

    // Act
    const offered = offeredRoles(played, 'scorer');

    // Assert
    expect(offered).toEqual(['researcher', 'scorer']);
  });

  it('keeps the order the list was handed in', () => {
    // Pass order is what `../../data/personas.ts` preserves and what
    // the cards render, so a builder that sorted would offer the roles
    // in an order the surface never shows.
    // Arrange
    const played = [
      personaWith({ id: 1, role: 'scorer' }),
      personaWith({ id: 2, role: 'drafter' }),
      personaWith({ id: 3, role: 'researcher' }),
    ];

    // Act
    const offered = offeredRoles(played, 'scorer');

    // Assert
    expect(offered).toEqual(['scorer', 'drafter', 'researcher']);
  });

  it('labels every option with its stored token', () => {
    // Prose here would be two names for one thing: the card heading
    // beside the control shows the token itself.
    // Arrange
    const played = [personaWith({ role: 'researcher' })];

    // Act
    const relabelled = personaRoleChoices(played, UNPLAYED_ROLE)
      .filter((option) => option.label !== option.value);

    // Assert
    expect(relabelled).toEqual([]);
    // The vacuity guard: an empty answer satisfies the line above.
    expect(personaRoleChoices(played, UNPLAYED_ROLE)).toHaveLength(2);
  });

  it('builds a fresh array for every caller', () => {
    // `SelectProps.options` is declared mutable, so a shared list is
    // one component away from being edited in place.
    // Arrange
    const played = [personaWith({})];

    // Act / Assert
    expect(personaRoleChoices(played, 'researcher'))
      .not.toBe(personaRoleChoices(played, 'researcher'));
  });

  it('offers the roles this deployment actually plays', () => {
    // The app-level reading rather than the shape one: driven off the
    // fixture the surface reads, so a seed that renamed a role moves
    // this case rather than leaving it agreeing with a literal.
    // Arrange
    const personas = listPersonas(SEEDED_DOMAIN_ID);
    const subject = firstPersona(personas);

    // Act
    const offered = offeredRoles(personas, subject.role);

    // Assert
    expect(offered).toEqual(personas.map((persona) => persona.role));
    expect(offered.length).toBeGreaterThan(1);
  });
});

describe('withPersonaRole', () => {
  it('writes a role no option offered', () => {
    // Deliberate: `personas.role` carries no CHECK, membership is the
    // control's business, and a mover that refused would leave a field
    // unable to show what an operator just chose.
    // Arrange
    const persona = personaWith({ role: 'researcher' });

    // Act
    const moved = withPersonaRole(persona, UNPLAYED_ROLE);

    // Assert
    expect(moved.role).toBe(UNPLAYED_ROLE);
  });

  it('touches nothing else', () => {
    // Arrange
    const persona = personaWith({ id: 7, systemText: 'Kept.' });

    // Act
    const moved = withPersonaRole(persona, 'drafter');

    // Assert
    expect(moved).toEqual({ ...persona, role: 'drafter' });
  });

  it('answers a fresh row rather than the one it was handed', () => {
    // A row mutated in place is a new value that compares equal to the
    // old one, so the draft holder would absorb it and render nothing.
    // Arrange
    const persona = personaWith({});

    // Act
    const moved = withPersonaRole(persona, 'drafter');

    // Assert
    expect(moved).not.toBe(persona);
    expect(persona.role).toBe('researcher');
  });
});

describe('withPersonaSystemText', () => {
  it('writes the text exactly as typed, surrounding space included', () => {
    // The mover does not trim: it would eat the space between two
    // words as the second one was being typed.
    // Arrange
    const persona = personaWith({});

    // Act
    const moved = withPersonaSystemText(persona, '  Keep looking. ');

    // Assert
    expect(moved.systemText).toBe('  Keep looking. ');
  });

  it('touches nothing else', () => {
    // Arrange
    const persona = personaWith({ id: 3, role: 'drafter' });

    // Act
    const moved = withPersonaSystemText(persona, 'Rewritten.');

    // Assert
    expect(moved).toEqual({ ...persona, systemText: 'Rewritten.' });
    expect(moved).not.toBe(persona);
  });
});

describe('withPersonaDomain', () => {
  it('touches nothing else', () => {
    // Arrange
    const persona = personaWith({ id: 5, role: 'scorer' });

    // Act
    const moved = withPersonaDomain(persona, OTHER_DOMAIN_ID);

    // Assert
    expect(moved).toEqual({ ...persona, domainId: OTHER_DOMAIN_ID });
    expect(moved).not.toBe(persona);
  });

  it('moves which personas the uniqueness reading compares against', () => {
    // The pairing this mover earns its keep by: the collision check
    // reads the domain off the DRAFT, so the two are one claim rather
    // than a mover nothing consults.
    // Arrange
    const siblings = [
      personaWith({ id: 1, role: 'researcher' }),
      personaWith({ id: 2, role: 'scorer' }),
    ];
    const colliding = personaWith({ id: 1, role: 'scorer' });

    // Act
    const moved = withPersonaDomain(colliding, OTHER_DOMAIN_ID);

    // Assert
    expect(validatePersonaDraft(colliding, siblings))
      .toEqual([ROLE_TAKEN_SENTENCE]);
    expect(validatePersonaDraft(moved, siblings)).toEqual([]);
  });
});

describe('validatePersonaDraft', () => {
  it('refuses a blank role', () => {
    // Reachable from stored data rather than from typing: the control
    // is a `Select` over roles that exist.
    // Arrange
    const draft = personaWith({ role: '' });

    // Act
    const faults = validatePersonaDraft(draft, []);

    // Assert
    expect(faults).toEqual([ROLE_REQUIRED_SENTENCE]);
  });

  it('refuses a role of spaces exactly as it refuses an empty one', () => {
    // Trimming first is what makes these one state rather than two
    // with a sentence apiece.
    // Arrange / Act
    const spaced = validatePersonaDraft(personaWith({ role: ' \t ' }), []);
    const empty = validatePersonaDraft(personaWith({ role: '' }), []);

    // Assert
    expect(spaced).toEqual(empty);
  });

  it('refuses a role another persona of the domain holds', () => {
    // `personas_domain_id_role_unique`: a domain names each role once.
    // Arrange
    const siblings = [personaWith({ id: 2, role: 'drafter' })];
    const draft = personaWith({ id: 1, role: 'drafter' });

    // Act
    const faults = validatePersonaDraft(draft, siblings);

    // Assert
    expect(faults).toEqual([ROLE_TAKEN_SENTENCE]);
  });

  it('refuses a blank system text', () => {
    // A persona IS its system text, so a blank one is a role with
    // nothing to say rather than a field left for later.
    // Arrange
    const draft = personaWith({ systemText: '   ' });

    // Act
    const faults = validatePersonaDraft(draft, []);

    // Assert
    expect(faults).toEqual([SYSTEM_TEXT_REQUIRED_SENTENCE]);
  });

  it('refuses both fields at once, in the order the form draws them', () => {
    // Arrange
    const draft = personaWith({ role: '', systemText: '' });

    // Act
    const faults = validatePersonaDraft(draft, []);

    // Assert
    expect(faults).toEqual([
      ROLE_REQUIRED_SENTENCE,
      SYSTEM_TEXT_REQUIRED_SENTENCE,
    ]);
  });

  it('reports one sentence for a blank role a sibling also holds', () => {
    // Two sentences about one field, with one repair between them,
    // reads as two things to fix.
    // Arrange
    const siblings = [personaWith({ id: 2, role: '' })];
    const draft = personaWith({ id: 1, role: '' });

    // Act
    const faults = validatePersonaDraft(draft, siblings);

    // Assert
    expect(faults).toEqual([ROLE_REQUIRED_SENTENCE]);
  });

  it('says nothing about what the draft holds', () => {
    // A refusal an operator reads goes into the DOM, into a screenshot
    // and into whatever is pasted into a support thread. The reader is
    // driven over a producer that genuinely leaks in the same case, so
    // a green sweep is a reading rather than a blind one.
    // Arrange
    const siblings = [personaWith({ id: 2, role: SENTINEL })];
    // The token rides the ROLE, which is the member both sentences
    // are about. It cannot also ride the system text, whose only
    // fault is holding nothing at all.
    const draft = personaWith({ id: 1, role: SENTINEL, systemText: '' });

    // Act
    const faults = validatePersonaDraft(draft, siblings);

    // Assert
    expect(faults).toEqual([
      ROLE_TAKEN_SENTENCE,
      SYSTEM_TEXT_REQUIRED_SENTENCE,
    ]);
    expect(leaking(faults)).toEqual([]);
    // The control: the same reader over a sentence that does quote the
    // draft finds it, so the empty answer above is a measurement.
    expect(leaking([`The role ${draft.role} is taken.`])).toHaveLength(1);
  });

  it('accepts a persona that has changed nothing', () => {
    // The ordinary state of an open editor: its own row is in the
    // list, and a persona may not collide with itself.
    // Arrange
    const personas = listPersonas(SEEDED_DOMAIN_ID);
    const subject = firstPersona(personas);

    // Act / Assert
    expect(validatePersonaDraft(subject, personas)).toEqual([]);
  });

  it('accepts a role only another domain holds', () => {
    // The key is composite. A role held elsewhere is not held here.
    // Arrange
    const siblings = [
      personaWith({ id: 2, role: 'drafter', domainId: OTHER_DOMAIN_ID }),
    ];
    const draft = personaWith({ id: 1, role: 'drafter' });

    // Act / Assert
    expect(validatePersonaDraft(draft, siblings)).toEqual([]);
  });

  it('accepts a role a sibling holds only up to trailing space', () => {
    // Collision is what the unique index COMPARES, and that comparison
    // is byte-exact: a role carrying a trailing space genuinely is a
    // second row, so calling it a duplicate would apply a rule the
    // database does not.
    // Arrange
    const siblings = [personaWith({ id: 2, role: 'drafter' })];
    const draft = personaWith({ id: 1, role: 'drafter ' });

    // Act / Assert
    expect(validatePersonaDraft(draft, siblings)).toEqual([]);
  });

  it('accepts the personas this deployment ships', () => {
    // The seed has to be savable as it stands, or the editor opens on
    // a row it refuses to let anybody close.
    // Arrange
    const personas = listPersonas(SEEDED_DOMAIN_ID);

    // Act
    const refused = personas
      .filter((persona) => validatePersonaDraft(persona, personas).length > 0);

    // Assert
    expect(refused).toEqual([]);
    expect(personas.length).toBeGreaterThan(0);
  });

  it('refuses every alternative the control offers today', () => {
    // The fixture property the header states: the list this shell can
    // build is exactly the roles that ARE held, and nothing in this
    // wave frees one. The day a seam can insert or remove a persona,
    // this case is what says so.
    // Arrange
    const personas = listPersonas(SEEDED_DOMAIN_ID);
    const subject = firstPersona(personas);
    const alternatives = offeredRoles(personas, subject.role)
      .filter((role) => role !== subject.role);

    // Act
    const accepted = alternatives.filter((role) => {
      const moved = withPersonaRole(subject, role);

      return validatePersonaDraft(moved, personas).length === 0;
    });

    // Assert
    expect(accepted).toEqual([]);
    expect(alternatives.length).toBeGreaterThan(0);
  });
});
