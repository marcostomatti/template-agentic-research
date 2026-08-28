import { describe, expect, it } from 'vitest';

import { repeated } from '../test-support/repeated';

import {
  DEFAULT_DOMAIN_SLUG,
  SPARSE_DOMAIN_SLUG,
  getDomain,
} from './domains';
import {
  PERSONAS,
  findPersona,
  findPersonaByRole,
  getPersona,
  listPersonas,
} from './personas';

describe('PERSONAS', () => {
  it('carries the seed personas, in pass order', () => {
    // The transcription pin, and the non-emptiness guard every
    // table-driven claim below rests on. Content is the `personas`
    // array of `packages/service/data/personas.json`. Nothing
    // mechanically joins the two files — `@ar/web` takes no dependency
    // on `@ar/service` — so this assertion is the join, and a failure
    // means the seed and the fixture have parted company rather than
    // that a page broke.
    //
    // It is also the only thing here asserting WHICH roles exist:
    // `personas.role` carries no CHECK, so there is no union to be
    // exhaustive over the way `./sources.ts` is over its kinds.
    // Arrange / Act
    const transcribed = PERSONAS.map((persona) => ({
      role: persona.role,
      systemText: persona.systemText,
    }));

    // Assert
    expect(transcribed).toEqual([
      {
        role: 'researcher',
        systemText: 'Placeholder. You research the Example Tech Radar '
          + 'domain: work from the documents the pipeline hands you, '
          + 'summarize what each one says, and name the document behind '
          + 'every claim.',
      },
      {
        role: 'scorer',
        systemText: 'Placeholder. You judge one finding for the Example '
          + 'Tech Radar domain against that domain\'s own terms and '
          + 'criteria, and say which of them the finding met.',
      },
      {
        role: 'drafter',
        systemText: 'Placeholder. You write the periodic digest for the '
          + 'Example Tech Radar domain from the findings of a single pass, '
          + 'in the order they are given and without adding any that are '
          + 'not in the list.',
      },
    ]);
  });

  it('gives every persona a distinct id', () => {
    // The agents edit sub-route carries an id, so a collision would
    // open whichever row the lookup map happened to keep.
    // Arrange / Act
    const ids = PERSONAS.map((persona) => persona.id);

    // Assert
    expect(repeated(ids)).toEqual([]);
  });

  it('gives every persona a distinct role within its domain', () => {
    // `personas_domain_id_role_unique` is the pair the seed upserts on,
    // so a repeated role within one domain is two rows the seed could
    // only ever write as one — and a run resolving that role would have
    // to choose between them.
    // Arrange / Act
    const pairs = PERSONAS.map(
      (persona) => `${persona.domainId}/${persona.role}`,
    );

    // Assert
    expect(repeated(pairs)).toEqual([]);
  });

  it('never leaves a role or its system text empty', () => {
    // NOT NULL is not the same as non-empty. An empty role is a card
    // with no name and a key nothing can be resolved through; an empty
    // system text is a role a run would play with no instructions at
    // all, which is worse than a missing row because it still resolves.
    // Arrange / Act
    const blank = PERSONAS.filter(
      (persona) => persona.role.trim() === ''
        || persona.systemText.trim() === '',
    );

    // Assert
    expect(blank).toEqual([]);
  });

  it('belongs entirely to the seeded domain', () => {
    // The sparse domain is the shell's route to its empty states, so a
    // row leaking into it would fill a page that is meant to be bare.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const strays = PERSONAS.filter((persona) => persona.domainId !== seededId);

    // Assert
    expect(strays).toEqual([]);
  });

  it('says placeholder in the first word of every system text', () => {
    // The seed's own editorial rule, transcribed: a persona is usually
    // met as a row in a database with no file in view, so prose that is
    // standing in for a real prompt has to say so where it is read. The
    // agents card clamps the text, and the clamp keeps the beginning —
    // which is why the first word is the one that has to carry it.
    // Arrange / Act
    const unmarked = PERSONAS.filter(
      (persona) => !persona.systemText.startsWith('Placeholder.'),
    );

    // Assert
    expect(unmarked).toEqual([]);
  });
});

describe('listPersonas', () => {
  it('returns the seeded domain personas in pass order', () => {
    // Research, then score, then draft — the seed's order and the order
    // the cards render in, so a reader meets the roles in the sequence
    // they run.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const listed = listPersonas(seededId);

    // Assert
    expect(listed.map((persona) => persona.role))
      .toEqual(['researcher', 'scorer', 'drafter']);
  });

  it('returns nothing for the sparse domain', () => {
    // Not an error: the empty agents page is a state the demo reaches
    // by switching domain rather than by emptying a table. It is also
    // the honest reading — a domain nobody has configured has nothing
    // to say to a role, and a run of it could not start.
    // Arrange
    const sparseId = getDomain(SPARSE_DOMAIN_SLUG).id;

    // Act / Assert
    expect(listPersonas(sparseId)).toEqual([]);
  });

  it('returns nothing for a domain id nothing carries', () => {
    // Arrange / Act / Assert
    expect(listPersonas(-1)).toEqual([]);
  });

  it('never hands back the stored table', () => {
    // Handing out the array itself would let a caller sorting it in
    // place reorder every later reader in the same process — and pass
    // order is what this table means.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act / Assert
    expect(listPersonas(seededId)).not.toBe(PERSONAS);
  });
});

describe('findPersona', () => {
  it('finds every fixture persona by its own id', () => {
    // Arrange / Act
    const missed = PERSONAS.filter(
      (persona) => findPersona(persona.id) !== persona,
    );

    // Assert
    expect(missed).toEqual([]);
  });

  it('answers undefined for an id no fixture carries', () => {
    // The tolerant twin exists because a persona id DOES arrive from
    // the URL — the agents edit sub-route carries one — so a stale link
    // is an ordinary outcome the page answers with a not-found state.
    // Arrange / Act / Assert
    expect(findPersona(-1)).toBeUndefined();
  });
});

describe('getPersona', () => {
  it('returns the persona carrying the id', () => {
    // Arrange / Act
    const found = PERSONAS.map((persona) => getPersona(persona.id));

    // Assert
    expect(found).toEqual([...PERSONAS]);
  });

  it('throws naming the id it could not find', () => {
    // The message is what a fixture author reads first, so it carries
    // the id rather than only the fact of the miss.
    // Arrange / Act / Assert
    expect(() => getPersona(-1)).toThrow('-1');
  });
});

describe('findPersonaByRole', () => {
  it('finds every fixture persona by its own domain and role', () => {
    // Arrange / Act
    const missed = PERSONAS.filter(
      (persona) => findPersonaByRole(persona.domainId, persona.role)
        !== persona,
    );

    // Assert
    expect(missed).toEqual([]);
  });

  it('answers undefined for a role the domain does not name', () => {
    // Roles are open — a fourth one is a row rather than a migration —
    // so a role nothing carries is an ordinary answer and not a fault.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act / Assert
    expect(findPersonaByRole(seededId, 'summarizer')).toBeUndefined();
  });

  it('answers undefined for a role of a domain that names none', () => {
    // The near-miss the composite key exists for. A lookup keyed on the
    // role ALONE answers this with the seeded domain's researcher —
    // another domain's prompt, which is a wrong answer rather than a
    // missing one, and the one failure mode a page could not detect.
    // Arrange
    const sparseId = getDomain(SPARSE_DOMAIN_SLUG).id;

    // Act / Assert
    expect(findPersonaByRole(sparseId, 'researcher')).toBeUndefined();
    expect(findPersonaByRole(-1, 'researcher')).toBeUndefined();
  });

  it('matches a role exactly', () => {
    // A map lookup, so the role has to be spelled the way the seed
    // writes it. Pinned rather than left implied: the alternative — a
    // normalizing lookup — would make two roles differing only in case
    // resolve to one row, which the table's unique key does not.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act / Assert
    expect(findPersonaByRole(seededId, 'Researcher')).toBeUndefined();
    expect(findPersonaByRole(seededId, 'researcher ')).toBeUndefined();
  });
});
