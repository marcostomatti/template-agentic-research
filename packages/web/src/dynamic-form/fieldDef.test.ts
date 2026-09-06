import type {
  ContainerFieldDef,
  FieldDef,
  FieldType,
} from './fieldDef';

import { describe, expect, it } from 'vitest';

import {
  isContainerField,
  isLeafField,
  LEAF_FIELD_TYPES,
} from './fieldDef';

/**
 * One def per type, which is what makes this file's coverage total.
 *
 * Keyed by {@link FieldType} rather than listed, so a seventh type
 * added to the union is a key the COMPILER demands here. That is the
 * second half of the mutation the module header records, and the
 * reason a new type cannot arrive with these cases still green.
 *
 * Every def carries a distinct `key`, so a case reading the wrong one
 * names which.
 */
const DEFS: Readonly<Record<FieldType, FieldDef>> = {
  string: { key: 'pattern', label: 'Pattern', type: 'string' },
  boolean: { key: 'enabled', label: 'Enabled', type: 'boolean' },
  number: { key: 'weight', label: 'Weight', type: 'number' },
  datetime: { key: 'seenAt', label: 'Last seen', type: 'datetime' },
  list: {
    key: 'terms',
    label: 'Terms',
    type: 'list',
    item: { key: 'term', label: 'Term', type: 'string' },
  },
  object: {
    key: 'window',
    label: 'Window',
    type: 'object',
    fields: [
      { key: 'from', label: 'From', type: 'datetime' },
      { key: 'to', label: 'To', type: 'datetime' },
    ],
  },
};

/**
 * The six types, as a typed literal.
 *
 * The direction {@link DEFS} cannot guard: annotated
 * `readonly FieldType[]`, so a type REMOVED from the union reddens
 * `check-types` at the spelling here that outlived it. The pair is
 * what makes the roster cases below a reading rather than two lists
 * agreeing with each other.
 */
const FIELD_TYPES: readonly FieldType[] = [
  'string',
  'boolean',
  'number',
  'datetime',
  'list',
  'object',
];

/**
 * The two types the tree drills into, held apart from the four.
 *
 * Spelled out rather than derived from {@link LEAF_FIELD_TYPES}: a
 * roster checked against its own complement would agree with itself
 * whatever either of them said.
 */
const CONTAINER_TYPES: readonly FieldType[] = ['list', 'object'];

/**
 * Every label in a def tree, in the order a walk meets them.
 *
 * A function rather than a comment: it reads `item` and `fields` off
 * defs the guard narrowed, with no cast, no optional chaining and no
 * `in` check, so the narrowing the module header claims is checked by
 * `check-types` rather than asserted in prose. Measured live —
 * flattening the union into one interface carrying `item?` and
 * `fields?` reddens exactly this function.
 *
 * The negated guard is the other half: its `else` branch reads
 * `label` off a def narrowed to a leaf.
 *
 * @param def - Any def, container or leaf.
 * @returns Its label, then its children's, depth first.
 */
function labelsOf(def: FieldDef): string[] {
  if (!isContainerField(def)) {
    return [def.label];
  }

  if (def.type === 'list') {
    return [def.label, ...labelsOf(def.item)];
  }

  return [def.label, ...def.fields.flatMap(labelsOf)];
}

/**
 * What one def is, read through both guards at once.
 *
 * The partition is the claim, so the cases ask for it as one value:
 * a def both guards accept, or one they both refuse, reads as
 * `'both'` or `'neither'` rather than as two assertions that pass
 * separately.
 *
 * @param def - The def to classify.
 * @returns `'leaf'`, `'container'`, or the two broken readings.
 */
function classify(def: FieldDef): string {
  const leaf = isLeafField(def);
  const container = isContainerField(def);

  if (leaf && container) {
    return 'both';
  }

  if (!leaf && !container) {
    return 'neither';
  }

  return leaf
    ? 'leaf'
    : 'container';
}

describe('what the guards refuse', () => {
  it('throws for a type outside the six, rather than leaf', () => {
    // The contract is a compile-time union, so this def cannot be
    // WRITTEN — only parsed, or built by something that does not
    // type-check. `date-range` is one of the composite types the
    // source doc defers to v2, which is the shape this would really
    // arrive as. Answering `false` is what would draw it as a text
    // box and report nothing.
    const foreign = {
      key: 'span',
      label: 'Span',
      type: 'date-range',
    } as unknown as FieldDef;

    expect(() => isContainerField(foreign)).toThrow('date-range');
    expect(() => isLeafField(foreign)).toThrow('date-range');

    // The control for the axis: the same def at a type that exists.
    expect(isLeafField(DEFS.string)).toBe(true);
  });

  it('keeps every container type out of the leaf roster', () => {
    CONTAINER_TYPES.forEach((type) => {
      expect(LEAF_FIELD_TYPES).not.toContain(type);
    });

    // A roster that had quietly emptied would satisfy that loop.
    expect(LEAF_FIELD_TYPES.length).toBeGreaterThan(0);
  });
});

describe('how the guards split the six types', () => {
  it('holds one def per type, leaving no type untested', () => {
    expect(Object.keys(DEFS).sort()).toEqual([...FIELD_TYPES].sort());
  });

  it('answers exactly one guard for every one of the six', () => {
    const readings = FIELD_TYPES.map((type) => classify(DEFS[type]));

    expect(readings).not.toContain('both');
    expect(readings).not.toContain('neither');
  });

  it('reads the four leaf types as leaves', () => {
    LEAF_FIELD_TYPES.forEach((type) => {
      expect(classify(DEFS[type])).toBe('leaf');
    });
  });

  it('reads the list and the object as containers', () => {
    CONTAINER_TYPES.forEach((type) => {
      expect(classify(DEFS[type])).toBe('container');
    });
  });

  it('names in the leaf roster exactly what reads as a leaf', () => {
    // The roster's own coverage, and the one case that would catch a
    // leaf type added to the union and left out of it: `DEFS` grows
    // by compiler demand, so the type arrives on the right of this
    // comparison whether or not anybody remembered the roster.
    const leaves = FIELD_TYPES
      .filter((type) => isLeafField(DEFS[type]));

    expect([...LEAF_FIELD_TYPES].sort()).toEqual([...leaves].sort());
  });
});

describe('what a narrowed def hands over', () => {
  it('reaches the item def through a list narrowing', () => {
    expect(labelsOf(DEFS.list)).toEqual(['Terms', 'Term']);
  });

  it('reaches every field through an object narrowing', () => {
    expect(labelsOf(DEFS.object)).toEqual(['Window', 'From', 'To']);
  });

  it('walks a list of objects, which is the nesting v1 has', () => {
    // The shape the Lexicon swap actually hands over: a list whose
    // item is an object. The drill-in the source doc's nesting
    // strategy describes is this walk, one level at a time.
    const def: FieldDef = {
      key: 'terms',
      label: 'Terms',
      type: 'list',
      item: DEFS.object,
    };

    expect(labelsOf(def)).toEqual(['Terms', 'Window', 'From', 'To']);
  });

  it('stops at a leaf, which holds no def to walk into', () => {
    expect(labelsOf(DEFS.number)).toEqual(['Weight']);
  });

  it('takes a description without changing either guard', () => {
    // `description` is the one optional member the source doc
    // declares, so a def carrying it and one leaving it off are both
    // the contract — and neither is a reading the guards make.
    const described: FieldDef = {
      key: 'weight',
      label: 'Weight',
      type: 'number',
      description: 'How strongly a match on this term scores.',
    };

    expect(classify(described)).toBe('leaf');
    expect(classify(DEFS.number)).toBe('leaf');
  });

  it('narrows a container without naming which one it is', () => {
    // The guard's own return type, asked for directly: a def it
    // accepts is assignable to `ContainerFieldDef` with no cast, and
    // the two container defs are the whole of what that admits.
    const held: ContainerFieldDef[] = CONTAINER_TYPES
      .map((type) => DEFS[type])
      .filter(isContainerField);

    expect(held).toHaveLength(CONTAINER_TYPES.length);
  });
});
