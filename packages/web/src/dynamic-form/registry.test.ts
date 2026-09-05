import type { FieldType } from './fieldDef';
import type { FieldControlKind } from './registry';

import { describe, expect, it } from 'vitest';

import { LEAF_FIELD_TYPES } from './fieldDef';
import { CONTROL_KIND_BY_TYPE, controlKindFor } from './registry';

/**
 * The six types, as a typed literal.
 *
 * The direction {@link CONTROL_KIND_BY_TYPE} cannot guard. Its own
 * annotation makes a type ADDED to the union a key the compiler
 * demands and says nothing about one removed; this literal is
 * annotated `readonly FieldType[]`, so a spelling that outlived the
 * union reddens `check-types` right here.
 *
 * It is also what every loop below iterates, so a case reading the
 * table reads it over the whole roster rather than over the keys
 * the table happens to hold.
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
 * The two types the tree drills into.
 *
 * Spelled out rather than derived from {@link LEAF_FIELD_TYPES}: a
 * roster checked against its own complement agrees with itself
 * whatever either of them says, and the distinctness case below is
 * exactly the comparison that would go vacuous.
 */
const CONTAINER_TYPES: readonly FieldType[] = ['list', 'object'];

/**
 * Every kind the union declares, keyed BY the union.
 *
 * A set written as a record, because a record is the only shape the
 * compiler checks for totality, and this is the one artifact
 * anywhere that guards {@link FieldControlKind} in both directions:
 * a kind ADDED is a key demanded here, and a kind REMOVED leaves an
 * excess property at the spelling that outlived it. The module's
 * own table guards neither — a kind mapped to no type type-checks
 * perfectly and is a control nothing ever draws.
 *
 * Retyped rather than read off the table, which is the whole point:
 * a roster derived from the table would agree with the table
 * whatever the table said.
 */
const KIND_ROSTER: Readonly<Record<FieldControlKind, true>> = {
  text: true,
  toggle: true,
  numeric: true,
  timestamp: true,
  'drill-in': true,
};

/**
 * The table read the way a value from outside the union reaches it.
 *
 * `CONTROL_KIND_BY_TYPE` is keyed by literals, so the compiler
 * answers `FieldControlKind` for every index and there is no
 * `undefined` to assert against. This widening is what lets the
 * cases below ask the runtime question the module's own guard
 * exists for.
 */
const LOOSE: Readonly<Record<string, FieldControlKind | undefined>>
  = CONTROL_KIND_BY_TYPE;

describe('what the registry refuses', () => {
  it('throws for a type outside the six, not undefined', () => {
    // The contract is a compile-time union, so this type cannot be
    // WRITTEN — only parsed, or built by something that does not
    // type-check. `date-range` is one of the composite types the
    // source doc defers to v2, which is how it would really arrive.
    const foreign = 'date-range' as FieldType;

    expect(() => controlKindFor(foreign)).toThrow('date-range');

    // The control for the axis: the same call at a type that does
    // exist. Without it a reader throwing for everything satisfies
    // the line above.
    const known = controlKindFor('string');

    expect(known).toBe(CONTROL_KIND_BY_TYPE.string);
  });

  it('answers undefined off the table for that same type', () => {
    // Why the reader guards at all rather than returning its
    // lookup, and the live control for every `toBeDefined` below:
    // an assertion nothing in reach can fail is not a reading.
    expect(LOOSE['date-range']).toBeUndefined();
    expect(LOOSE.string).toBeDefined();
  });
});

describe('which control each of the six types draws', () => {
  it('maps every type to the kind the type table names', () => {
    // The row-level reading, retyped from the source doc's table
    // rather than derived: the structural cases below all survive
    // two rows being swapped, and this one does not.
    expect(CONTROL_KIND_BY_TYPE).toEqual({
      string: 'text',
      boolean: 'toggle',
      number: 'numeric',
      datetime: 'timestamp',
      list: 'drill-in',
      object: 'drill-in',
    });
  });

  it('holds a kind for every one of the six types', () => {
    const keys = Object.keys(CONTROL_KIND_BY_TYPE).sort();

    expect(keys).toEqual([...FIELD_TYPES].sort());
  });

  it('resolves no type to undefined, by either read', () => {
    FIELD_TYPES.forEach((type) => {
      expect(LOOSE[type]).toBeDefined();
      expect(controlKindFor(type)).toBeDefined();
    });

    // A roster that had quietly emptied would satisfy that loop.
    expect(FIELD_TYPES.length).toBeGreaterThan(0);
  });

  it('reads the same kind through the table and the reader', () => {
    // What stops the reader drifting into a second table: it may
    // guard, and it may not decide.
    const throughReader = FIELD_TYPES.map(controlKindFor);
    const throughTable = FIELD_TYPES.map((type) => LOOSE[type]);

    expect(throughReader).toEqual(throughTable);
  });
});

describe('how the leaf and container kinds are kept apart', () => {
  it('gives each of the four leaf types its own kind', () => {
    const kinds = LEAF_FIELD_TYPES.map(controlKindFor);

    expect(new Set(kinds).size).toBe(kinds.length);
    expect(kinds.length).toBeGreaterThan(0);
  });

  it('draws both containers as the one drill-in row', () => {
    const kinds = CONTAINER_TYPES.map(controlKindFor);

    expect(new Set(kinds).size).toBe(1);
    expect(kinds).toHaveLength(CONTAINER_TYPES.length);
  });

  it('gives the containers a kind no leaf type draws', () => {
    const leafKinds = new Set(LEAF_FIELD_TYPES.map(controlKindFor));
    const containerKinds = CONTAINER_TYPES.map(controlKindFor);

    containerKinds.forEach((kind) => {
      expect(leafKinds.has(kind)).toBe(false);
    });

    // Both halves non-empty, or the loop above is satisfied by a
    // pair of rosters that between them named nothing.
    expect(leafKinds.size).toBeGreaterThan(0);
    expect(containerKinds.length).toBeGreaterThan(0);
  });

  it('names every declared kind somewhere in the table', () => {
    // The runtime half of the roster above: the compiler makes the
    // roster total over the union, and this says the table reaches
    // every member of it. A kind declared and drawn by no type is
    // green everywhere else.
    const drawn = [...new Set(FIELD_TYPES.map(controlKindFor))];

    expect(drawn.sort()).toEqual(Object.keys(KIND_ROSTER).sort());
  });
});
