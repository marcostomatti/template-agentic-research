import type {
  ContainerFieldDef,
  EnumFieldDef,
  FieldDef,
  FieldType,
  LeafFieldDef,
  ListFieldDef,
  ObjectFieldDef,
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
 * Keyed by {@link FieldType} rather than listed, so an eighth type
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
  enum: {
    key: 'polarity',
    label: 'Polarity',
    type: 'enum',
    options: [
      { value: 'positive', label: 'Positive' },
      { value: 'negative', label: 'Negative' },
    ],
  },
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
 * The seven types, as a typed literal.
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
  'enum',
  'list',
  'object',
];

/**
 * The two types the tree drills into, held apart from the five.
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
  it('refuses an enum def offering nothing to choose from', () => {
    // A `check-types` reading rather than a runtime one: `options` is
    // a non-empty tuple, so the empty literal is TS2322 where somebody
    // WROTE it. The directive is the pin — a contract that stopped
    // refusing it would red this line as an unused expectation
    // (TS2578) rather than leave the case quietly passing.
    const refused = {
      key: 'polarity',
      label: 'Polarity',
      type: 'enum',
      // @ts-expect-error an enum offers at least one option.
      options: [],
    } satisfies EnumFieldDef;

    // The positive control, varied along that one axis: the same def
    // carrying one option compiles with no directive at all, so a
    // type that had come to refuse EVERY enum literal would fail this
    // file rather than pass it.
    const accepted = {
      key: 'polarity',
      label: 'Polarity',
      type: 'enum',
      options: [{ value: 'positive', label: 'Positive' }],
    } satisfies EnumFieldDef;

    expect(refused.options).toHaveLength(0);
    expect(accepted.options).toHaveLength(1);
  });

  it('refuses a list def and an object def carrying an action', () => {
    // Decision 5 of
    // `.specs/q20b-0-dynamic-form-enum-and-actions.md`: a container
    // carries no action in v1. `action` sits on the leaf base alone,
    // so both literals below are TS2353 at the `action` line —
    // measured, `'action' does not exist in type 'ListFieldDef'` and
    // the same for `ObjectFieldDef`. The directives are the pin: a
    // contract that grew the member on `FieldDefBase` instead would
    // red these lines as unused expectations (TS2578) rather than
    // leave the case quietly passing.
    const refusedList = {
      key: 'terms',
      label: 'Terms',
      type: 'list',
      item: { key: 'term', label: 'Term', type: 'string' },
      // @ts-expect-error a container carries no action in v1.
      action: { id: 'pick', label: 'Pick a term' },
    } satisfies ListFieldDef;

    const refusedObject = {
      key: 'window',
      label: 'Window',
      type: 'object',
      fields: [{ key: 'from', label: 'From', type: 'datetime' }],
      // @ts-expect-error a container carries no action in v1.
      action: { id: 'pick', label: 'Pick a window' },
    } satisfies ObjectFieldDef;

    // The positive control, varied along that one axis alone: the
    // same member on a LEAF def compiles with no directive, so a
    // contract that had come to refuse every `action` would fail
    // this file rather than pass it.
    const accepted = {
      key: 'endpoint',
      label: 'Endpoint',
      type: 'string',
      action: { id: 'normalise', label: 'Normalise URL' },
    } satisfies LeafFieldDef;

    // Runtime readings, so the case is not a directive and nothing
    // else: the two refused literals still HOLD what was written —
    // a type error is not a deletion — and the accepted one reaches
    // its ref through the declared member rather than through a
    // cast or an `in` check.
    expect(isContainerField(refusedList)).toBe(true);
    expect(isContainerField(refusedObject)).toBe(true);
    expect(accepted.action?.id).toBe('normalise');
  });

  it('throws for a type outside the seven, rather than leaf', () => {
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

describe('how the guards split the seven types', () => {
  it('holds one def per type, leaving no type untested', () => {
    expect(Object.keys(DEFS).sort()).toEqual([...FIELD_TYPES].sort());
  });

  it('answers exactly one guard for every one of the seven', () => {
    const readings = FIELD_TYPES.map((type) => classify(DEFS[type]));

    expect(readings).not.toContain('both');
    expect(readings).not.toContain('neither');
  });

  it('reads the five leaf types as leaves', () => {
    LEAF_FIELD_TYPES.forEach((type) => {
      expect(classify(DEFS[type])).toBe('leaf');
    });
  });

  it('reads the list and the object as containers', () => {
    CONTAINER_TYPES.forEach((type) => {
      expect(classify(DEFS[type])).toBe('container');
    });
  });

  it('answers false for an enum def, which holds no defs', () => {
    // The one leaf def carrying a member of its own, asked directly
    // rather than through the roster loop above: `options` is a list
    // INSIDE a def and the reflex reading of "a def holding a list"
    // is the container one. It is not — nothing under an enum is a
    // def, so there is nothing to drill into.
    expect(isContainerField(DEFS.enum)).toBe(false);
    expect(isLeafField(DEFS.enum)).toBe(true);

    // The control for the axis: a def that really does hold defs,
    // through the same two calls.
    expect(isContainerField(DEFS.object)).toBe(true);
    expect(isLeafField(DEFS.object)).toBe(false);
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
