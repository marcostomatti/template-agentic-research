import type { TermEntryMemberDefs } from './fieldDefs';
import type { EditableTermMembers } from './schema';
import type {
  FieldDef,
  FieldType,
  LeafFieldDef,
} from '../../dynamic-form/fieldDef';

import { describe, expect, it } from 'vitest';

import {
  isContainerField,
  isLeafField,
} from '../../dynamic-form/fieldDef';

import { POLARITY_FACETS } from './cards';
import { fieldDefsForTermPayload } from './fieldDefs';

/**
 * The four members a payload entry carries, as a typed literal.
 *
 * The REMOVAL direction of the crossing: annotated
 * `readonly (keyof EditableTermMembers)[]`, so a member dropped from
 * what `./schema.ts` says an operator may write reddens
 * `check-types` at the spelling here that outlived it (TS2322), and
 * names the member.
 *
 * Retyped rather than read off the def list, which is the whole
 * point: a roster derived from the subject agrees with the subject
 * whatever the subject says.
 */
const MEMBERS: readonly (keyof EditableTermMembers)[] = [
  'pattern',
  'weight',
  'polarity',
  'notes',
];

/**
 * The v1 type each member is offered as, keyed BY the member union.
 *
 * The ADDITION direction, and the direction {@link MEMBERS} cannot
 * guard: a member added to `EditableTermMembers` is a key the
 * compiler demands here (TS2741), so a member cannot arrive with
 * these cases still green.
 *
 * `polarity` at `string` is the degraded answer the module's header
 * argues for. Written out rather than derived, so the day v1 grows
 * an enumeration this row is what fails.
 */
const EXPECTED_TYPES: Readonly<Record<keyof EditableTermMembers, FieldType>>
  = {
    pattern: 'string',
    weight: 'number',
    polarity: 'string',
    notes: 'string',
  };

/**
 * A member name read as a key of the module's own table.
 *
 * A function rather than a comment, in the shape `./schema.test.ts`
 * uses for the same job: the crossing is checked by `check-types`
 * rather than asserted in prose. This direction says the table is
 * keyed by NO MORE than the editable members — a table widened to
 * `Record<string, ...>` would still satisfy every runtime case
 * below, and reddens exactly here.
 *
 * @param member - A member an operator may write.
 * @returns The same name, read as a key of the def table.
 */
function tabledMember(
  member: keyof EditableTermMembers,
): keyof TermEntryMemberDefs {
  return member;
}

/**
 * A key of the module's own table read as a member name.
 *
 * The other direction of the same crossing: the table is keyed by no
 * FEWER than the editable members either. The pair is what makes the
 * two names one union rather than two that happen to agree today.
 *
 * @param key - A key of the def table.
 * @returns The same name, read as a member an operator may write.
 */
function editableMember(
  key: keyof TermEntryMemberDefs,
): keyof EditableTermMembers {
  return key;
}

/**
 * The def list, or a thrown sentence rather than a null dereference.
 *
 * Every case below the refusal ones asks for the ACCEPTED answer, so
 * a module that started refusing would otherwise leave them reading
 * members off `null` and reporting a type error as a failure about
 * something else.
 *
 * @returns The list def the module answers for its own table.
 * @throws If the module refused the shape, which is a different
 * finding from any case here.
 */
function payloadDefs() {
  const defs = fieldDefsForTermPayload();

  if (defs === null) {
    throw new Error('The module refused a shape it must express.');
  }

  return defs;
}

/**
 * The four leaf defs one entry draws, in the module's own order.
 *
 * @returns The item object's fields.
 * @throws If the item def is not the object the list wraps.
 */
function entryFields(): readonly FieldDef[] {
  const { item } = payloadDefs();

  if (item.type !== 'object') {
    throw new Error(`A list item drawn as ${item.type}, not an object.`);
  }

  return item.fields;
}

/**
 * One entry field by the member it claims to write.
 *
 * Found by KEY rather than by position, which is what makes the
 * type cases below readings about a member instead of about a slot.
 *
 * @param member - The member to look for.
 * @returns Its def.
 * @throws If no field claims that member, which the key-crossing
 * case reports first and in full.
 */
function fieldFor(member: keyof EditableTermMembers): FieldDef {
  const found = entryFields().find((def) => def.key === member);

  if (found === undefined) {
    throw new Error(`No field writes ${member}.`);
  }

  return found;
}

/**
 * A table with one member v1 cannot express.
 *
 * Fabricated rather than the module's own, because every member of
 * that one is expressible and the refusal arm would otherwise be a
 * branch nothing drives. Keyed by the member union, so it carries
 * the ADDITION direction too.
 *
 * @param absent - The member to declare undrawable.
 * @returns The table, with that member at `null`.
 */
function tableWithout(
  absent: keyof EditableTermMembers,
): TermEntryMemberDefs {
  const drawn: LeafFieldDef = {
    key: 'drawn',
    label: 'Drawn',
    type: 'string',
  };

  const table: TermEntryMemberDefs = {
    pattern: drawn,
    weight: drawn,
    polarity: drawn,
    notes: drawn,
  };

  return { ...table, [absent]: null };
}

describe('what the reading refuses', () => {
  it('answers null when one member has no v1 type', () => {
    MEMBERS.forEach((member) => {
      expect(fieldDefsForTermPayload(tableWithout(member))).toBeNull();
    });

    // A roster that had quietly emptied would satisfy that loop.
    expect(MEMBERS.length).toBeGreaterThan(0);
  });

  it('answers the defs for a table it can express', () => {
    // The control for the axis: the same fold over a table with no
    // null in it. Without it a reading that refused everything
    // satisfies the case above.
    const whole = tableWithout('notes');
    const expressible: TermEntryMemberDefs = {
      ...whole,
      notes: { key: 'notes', label: 'Notes', type: 'string' },
    };

    expect(fieldDefsForTermPayload(expressible)).not.toBeNull();
  });

  it('expresses its own table, so the presentation is offered', () => {
    // The measurement the module header records as a fact about
    // this payload rather than about the provider: no member of the
    // term payload forced the null arm.
    expect(fieldDefsForTermPayload()).not.toBeNull();
  });
});

describe('what one term payload is drawn as', () => {
  it('roots the shape at a list, the payload having no envelope', () => {
    const defs = payloadDefs();

    expect(defs.type).toBe('list');
    expect(isContainerField(defs)).toBe(true);
  });

  it('draws every entry as one object of leaf fields', () => {
    const { item } = payloadDefs();

    expect(item.type).toBe('object');
    expect(entryFields().every(isLeafField)).toBe(true);
    expect(entryFields().length).toBeGreaterThan(0);
  });

  it('names the list and the item so the tree reads Term 1', () => {
    // Both labels are load-bearing: `../../dynamic-form/tree.ts`
    // makes the root node the list's label and an item's label the
    // item def's label plus its position.
    const defs = payloadDefs();

    expect(defs.label).toBe('Terms');
    expect(defs.item.label).toBe('Term');
  });
});

describe('how the def list crosses the editable members', () => {
  it('writes exactly the members an operator may write', () => {
    const written = entryFields().map((def) => def.key);

    expect([...written].sort()).toEqual([...MEMBERS].sort());
  });

  it('draws them in the order the payload declares them', () => {
    // The record's key order is not a contract; the module holds an
    // ordered roster for this, and a swapped pair survives every
    // structural case above.
    expect(entryFields().map((def) => def.key)).toEqual([...MEMBERS]);
  });

  it('offers each member at the type the member forced', () => {
    MEMBERS.forEach((member) => {
      expect(fieldFor(member).type).toBe(EXPECTED_TYPES[member]);
    });

    expect(Object.keys(EXPECTED_TYPES).sort()).toEqual([...MEMBERS].sort());
  });

  it('reads one union through both crossing directions', () => {
    // The compile-time half, asked for at runtime too so a case
    // fails rather than a function sitting unused: both spellings
    // are the same name, and `check-types` is what says they are the
    // same TYPE.
    MEMBERS.forEach((member) => {
      expect(tabledMember(member)).toBe(member);
      expect(editableMember(member)).toBe(member);
    });
  });

  it('gives every member a label and none of them a blank one', () => {
    MEMBERS.forEach((member) => {
      expect(fieldFor(member).label.length).toBeGreaterThan(0);
    });
  });
});

describe('what the polarity field says in place of a control', () => {
  it('names every spelling the save path accepts', () => {
    const { description } = fieldFor('polarity');

    POLARITY_FACETS.forEach((facet) => {
      expect(description).toContain(facet.polarity);
    });

    expect(POLARITY_FACETS.length).toBeGreaterThan(0);
  });

  it('draws it as free text, v1 carrying no enumeration', () => {
    // The degradation stated as a case: the day this reads anything
    // else, the header's argument about the save path owning the
    // refusal has stopped being the design.
    expect(fieldFor('polarity').type).toBe('string');
  });

  it('leaves the other three members their own descriptions', () => {
    // A description built for one member and pasted onto the rest
    // would satisfy every case above.
    const said = MEMBERS.map((member) => fieldFor(member).description);

    expect(new Set(said).size).toBe(MEMBERS.length);
    expect(said).not.toContain(undefined);
  });
});
