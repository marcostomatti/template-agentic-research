/**
 * The AuthStore contract driven against the in-memory implementation:
 * every entry the table declares, each handed a store of its own, and
 * a guard that says which of them ran.
 *
 * `tests/auth/store-contract.ts` writes the rules once and this file
 * is the first of the two readers it was written for. The second
 * arrives with the live suite, running the same entries over drizzle
 * against a real Postgres — so what is established here is that the
 * rules hold of a store, and what that run adds when it lands is that
 * they hold of the one the service ships with. Neither reading
 * substitutes for the other, and the entries are shared rather than
 * copied so that the two cannot come to be about different rules.
 *
 * NO CASE IN THIS FILE ASSERTS ANYTHING ITSELF. An entry is a
 * sequence of calls that asserts as it goes, so a case body is the
 * call that runs it and nothing more, and a failure carries the rule
 * that broke rather than a line number in a driver. That is what the
 * contract module bought by importing `expect`, and this file is
 * where the price of it comes back.
 *
 * A STORE PER ENTRY rather than one store reset between them, which
 * is how the contract's empty-tables precondition is met here.
 * {@link createMemoryAuthStore} builds two empty maps and hands out
 * ids from 1, so constructing one IS the reset — there is nothing to
 * tear down, and no ordering between the entries to get wrong. The
 * live half cannot construct a database per entry and has to write
 * that reset out; here it would be a step with nothing to do.
 *
 * The store reads the WALL CLOCK rather than the movable clock its
 * helper also offers, and that is the contract's choice rather than
 * this file's. Every entry supplies its own expiries and asserts the
 * store's own timestamps by kind, precisely so that the same entries
 * hold against a store whose clock belongs to the database. Handing
 * a clock in here would let this run agree with something the live
 * run cannot, which is the one outcome two implementations behind
 * one contract are arranged to prevent.
 *
 * THE LAST CASE ASKS WHICH ENTRIES RAN, and asks it of the run
 * rather than of the loop. The cases are generated from the table,
 * so today the two agree by construction and an id counted off the
 * loop would be the table compared against itself. Counted off the
 * cases that executed, what is asserted is that every entry reached
 * one — which is what notices a sweep narrowed away from the table
 * later on. A slice, a filter, or a hand-written list of ids goes on
 * passing over whatever it still covers, and an entry added after
 * that has no case at all.
 */
import { describe, expect, it } from 'vitest';

import { createMemoryAuthStore } from '../helpers/memory-auth-store.js';

import { AUTH_STORE_CONTRACT } from './store-contract.js';

/**
 * Ids of the entries whose case ran, written as each one starts.
 *
 * Recorded from inside the case rather than where the loop declares
 * it, which is the difference between a table the sweep was written
 * over and one it reached. Written before the entry runs, too, so an
 * entry whose rule is broken still counts as exercised — otherwise
 * one broken rule is reported twice, the second time as an entry
 * that nothing covers.
 *
 * A set rather than a list, so an id declared twice arrives here
 * once and fails against a table carrying it twice. Nothing else
 * holds the ids to the uniqueness `AuthStoreContractCase` claims for
 * them, and two entries sharing one are two cases a reader cannot
 * tell apart.
 */
const EXERCISED_IDS = new Set<string>();

describe('AuthStore contract — the in-memory store', () => {
  // In front of the loop rather than left to it. A table that came
  // back empty generates no case at all, and a describe block with
  // nothing in it is the whole contract going quiet — this is what
  // names the list it went quiet over.
  it('declares at least one entry to run', () => {
    expect(AUTH_STORE_CONTRACT.length).toBeGreaterThan(0);
  });

  for (const entry of AUTH_STORE_CONTRACT) {
    // Named for the id and for what the entry stands for, so a
    // verbose run lists the contract itself and a new entry is
    // visible as a case that was collected rather than as a count
    // that moved.
    it(`${entry.id} — ${entry.standsFor}`, async () => {
      EXERCISED_IDS.add(entry.id);

      await entry.run(createMemoryAuthStore());
    });
  }

  // Last in the block on purpose: vitest runs a file's cases in the
  // order they were declared, so the set read here is one every case
  // above has already written to. A run that selects this case
  // without them — a `-t` filter naming it — reports the whole table
  // as unexercised, which is what asking at run time costs over
  // reading the loop that declared them.
  it('runs a case for every entry the contract declares', () => {
    const exercised = [...EXERCISED_IDS].sort();
    const declared = AUTH_STORE_CONTRACT.map((each) => each.id).sort();

    expect(exercised).toEqual(declared);
  });
});
