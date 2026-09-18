import type { FieldAction, FieldActionTable } from './actions';
import type { FieldDef } from './fieldDef';

import { describe, expect, it } from 'vitest';

import { assertActions, resolveActions } from './actions';

/**
 * A handler that answers a value, standing in for every caller.
 *
 * Never CALLED by any case here: `./actions.ts` reads ids and calls
 * nothing, which is the split its header states. This exists so a
 * table can hold an id at all.
 */
const held: FieldAction = () => 'answered';

/**
 * A leaf naming an id spelled like a prototype member.
 *
 * `toString` deliberately, and it is the one thing telling
 * `Object.hasOwn` apart from an `in` test: every other id in this
 * file is absent from `Object.prototype` too, so an `in` test would
 * refuse them all identically and no other case could see the
 * difference.
 */
const INHERITED_REF: FieldDef = {
  key: 'endpoint',
  label: 'Endpoint',
  type: 'string',
  action: { id: 'toString', label: 'Normalise URL' },
};

/** A second unanswered leaf, so "the first" is a reading. */
const SECOND_REF: FieldDef = {
  key: 'weight',
  label: 'Weight',
  type: 'number',
  action: { id: 'rescore', label: 'Rescore' },
};

describe('what an action table refuses', () => {
  it('throws for the first unknown id, naming key and id', () => {
    const defs: readonly FieldDef[] = [INHERITED_REF, SECOND_REF];

    // Decision 3: refused at mount, with the def's key and the
    // missing id. Asserted as two separate readings rather than as
    // one whole sentence — a message that dropped either half would
    // otherwise still match the other.
    expect(() => assertActions(defs, {})).toThrow('endpoint');
    expect(() => assertActions(defs, {})).toThrow('toString');

    // The FIRST, not any: the second def's own key and id do not
    // appear, so the throw is the head of the list rather than a
    // summary of it.
    expect(() => assertActions(defs, {})).not.toThrow('weight');
    expect(() => assertActions(defs, {})).not.toThrow('rescore');

    // `toString` is held by the PROTOTYPE of every table, which is
    // why the first ref above is unanswered at all. The list says
    // so directly, beside the throw that reports its head.
    expect(resolveActions(defs, {})).toEqual([
      { key: 'endpoint', id: 'toString' },
      { key: 'weight', id: 'rescore' },
    ]);

    // The control for the axis: the same two defs over a table that
    // really holds both ids as OWN members throw nothing at all, so
    // a check that had come to refuse every def list would fail
    // this case rather than pass it.
    const table: FieldActionTable = { toString: held, rescore: held };

    expect(() => assertActions(defs, table)).not.toThrow();
    expect(resolveActions(defs, table)).toEqual([]);
  });
});

describe('what the walk over a def list finds', () => {
  it('finds a ref on a leaf inside a list of objects', () => {
    // The nesting v1 has, and the only shape where a ref is neither
    // top-level nor one step down: list -> object -> leaves. The
    // containers carry no action themselves — they cannot, which is
    // `./fieldDef.test.ts`'s pin.
    const defs: readonly FieldDef[] = [
      {
        key: 'windows',
        label: 'Windows',
        type: 'list',
        item: {
          key: 'window',
          label: 'Window',
          type: 'object',
          fields: [
            {
              key: 'from',
              label: 'From',
              type: 'datetime',
              action: { id: 'pick-window', label: 'Pick a window' },
            },
            {
              key: 'to',
              label: 'To',
              type: 'datetime',
              action: { id: 'now', label: 'Use now' },
            },
          ],
        },
      },
    ];

    // One entry, not two: the sibling's `now` IS held, so this is
    // the walk FILTERING rather than the walk reporting every ref
    // it meets.
    expect(resolveActions(defs, { now: held })).toEqual([
      { key: 'from', id: 'pick-window' },
    ]);
  });

  it('answers nothing for defs naming no action at all', () => {
    // An empty table is the normal case for every def list shipped
    // today: `src/pages/lexicon/fieldDefs.ts` names no action, and
    // a form handed no `actions` prop passes `{}`.
    const defs: readonly FieldDef[] = [
      { key: 'term', label: 'Term', type: 'string' },
      {
        key: 'window',
        label: 'Window',
        type: 'object',
        fields: [{ key: 'from', label: 'From', type: 'datetime' }],
      },
    ];

    expect(resolveActions(defs, {})).toEqual([]);
    expect(() => assertActions(defs, {})).not.toThrow();

    // The control, varied along the one axis that matters: the same
    // empty table over a def list that DOES name a ref answers it.
    // Without this, a walk answering nothing for everything would
    // read exactly like the case above.
    expect(resolveActions([...defs, SECOND_REF], {})).toHaveLength(1);
  });
});
