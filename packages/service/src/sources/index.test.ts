/**
 * Cases for the runtime half of `src/sources/index.ts`: the contract
 * check, the registry, and the guard that says the registry names
 * every adapter this directory holds.
 *
 * The failing modules come first, and that is the order the file is
 * for rather than a preference. A contract check meets a module that
 * satisfies it once — on the day somebody writes a good adapter —
 * and meets every other shape for the whole life of the platform: a
 * member forgotten, a member spelt wrong, a `kind` that reads well
 * and is not in the set, a module that turned out to be a function.
 * Each of those has a case here, and the satisfying module arrives
 * afterwards as the control that says the check can still answer
 * with nothing.
 *
 * Three arrangements in here exist to stop a claim going vacuous.
 * The shipped registry is small — one entry, and that entry is a
 * declaration bound to no row — so a walk over it agrees with
 * almost anything, and each of the three supplies the discriminating
 * input the shipped registry cannot.
 *
 * The member roster is declared here rather than read off the
 * module, so the "every member" claim is a real set equality: a
 * sixth member added to the check without a row in this file fails
 * naming the sentence nobody expected, and a member quietly dropped
 * from the check fails naming the sentence that stopped arriving.
 * Reading the roster out of the module under test would satisfy
 * both cases with the module's own opinion of itself.
 *
 * The registry walk is driven over a BUILT registry as well as over
 * the shipped one. The shipped one reports nothing, so the walk over
 * it cannot say whether a fault would have been reported at all;
 * the built one holds a perfectly good adapter filed under the
 * wrong key, which is the one fault expressible without reaching
 * past the types, and its sentence is what says the walk reports.
 *
 * And the directory guard asserts what it FOUND as well as what it
 * failed to classify. An empty leftover set is what a guard reading
 * the wrong directory produces too, so the listing is held to carry
 * the module it covers and the file doing the reading.
 */
import type {
  CanonicalDocument,
  SourceAdapter,
  SourceAdapterRegistry,
  SourceKind,
} from './index.js';

import { readdirSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { SOURCE_KINDS } from '../db/schema/values.js';

import {
  SOURCE_ADAPTERS,
  getSourceAdapter,
  listSourceIds,
  sourceAdapterContractErrors,
} from './index.js';

// ---------------------------------------------------------------------------
// Modules to check, satisfying and otherwise
// ---------------------------------------------------------------------------

/**
 * What every satisfying module in this file returns from
 * `toCanonical`. The values are the emptiest a canonical document is
 * entitled to hold — the contract check never looks at them, and a
 * document with content in it would suggest it did.
 */
const CAPTURED: CanonicalDocument = {
  hash: 'sample-hash',
  sourceId: null,
  url: null,
  body: '',
  raw: null,
};

/**
 * A module declaring every member the contract asks for.
 *
 * Typed as the contract rather than as a record, so a member the
 * interface gains and this builder does not is a type error here
 * before it is a failing case: the satisfying module is the one
 * thing in the file that must not be able to drift from the
 * interface silently.
 *
 * @param id - The id it declares.
 * @param kind - The kind it declares; `api` unless a case is about
 *   the kind itself.
 * @returns A module that satisfies the contract.
 */
function satisfyingModule(
  id = 'sample',
  kind: SourceKind = 'api',
): SourceAdapter {
  return {
    id,
    kind,
    fetch: () => Promise.resolve(null),
    parse: () => [],
    toCanonical: () => CAPTURED,
  };
}

/**
 * A satisfying module as a plain record, so a case can break it.
 *
 * The contract cannot be violated through a value typed as the
 * contract, which is the type system doing its job and is exactly
 * what a check for modules that arrive from anywhere has to be
 * driven past.
 *
 * @returns The same members, in a record that can be edited.
 */
function editableModule(): Record<string, unknown> {
  return { ...satisfyingModule() };
}

/**
 * A satisfying module with one member removed.
 *
 * @param member - The member to drop.
 * @returns The module without it.
 */
function moduleWithout(member: string): Record<string, unknown> {
  const draft = editableModule();

  delete draft[member];

  return draft;
}

/**
 * A satisfying module with one member replaced.
 *
 * @param member - The member to replace.
 * @param value - What to put there instead.
 * @returns The module carrying that value.
 */
function moduleWith(member: string, value: unknown): Record<string, unknown> {
  return { ...editableModule(), [member]: value };
}

// ---------------------------------------------------------------------------
// The members the check is expected to report on
// ---------------------------------------------------------------------------

/** The `kind` sentence, whose text names the whole accepted set. */
function kindFault(got: string): string {
  return `kind must be one of ${SOURCE_KINDS.join(' | ')}, got ${got}`;
}

/**
 * Every member of the contract, paired with the sentence the check
 * reports when a module declares nothing at all in its place.
 *
 * Written out here rather than derived from the module under test.
 * A roster read off the check would agree with the check whatever
 * the check did, and the two claims this file rests on — that every
 * member is reported, and that no member reports twice — would both
 * be satisfied by a check that had stopped reporting anything.
 */
const CONTRACT_MEMBERS = [
  { member: 'id', fault: 'id must be a non-empty string' },
  { member: 'kind', fault: kindFault('[undefined]') },
  { member: 'fetch', fault: 'fetch must be a function' },
  { member: 'parse', fault: 'parse must be a function' },
  { member: 'toCanonical', fault: 'toCanonical must be a function' },
] as const;

// ---------------------------------------------------------------------------
// What the directory holds
// ---------------------------------------------------------------------------

/** The directory this file, the registry and the adapters share. */
const SOURCES_DIR = dirname(fileURLToPath(import.meta.url));

/** This file, taken from itself rather than written out. */
const THIS_FILE = basename(fileURLToPath(import.meta.url));

/** The module the registry and the contract live in. */
const REGISTRY_MODULE = 'index.ts';

/**
 * The modules in this directory that are deliberately not adapters.
 *
 * Both declare no member of the contract, front no source and say so
 * at the top of their own sources: `html-text.ts` is a pure markup
 * reduction, `paged-list.ts` the listing loop an adapter runs inside
 * its own `fetch`. They are named here because the guard below has
 * to account for every entry the directory holds, and a helper is
 * the one kind of entry that is neither an adapter nor a case file.
 *
 * Naming them is the cost of the guard and is meant to be paid: a
 * module that satisfies no contract and appears in no registry is
 * exactly the thing a directory listing would otherwise absorb
 * without anybody deciding what it was.
 */
const HELPER_MODULES: readonly string[] = ['html-text.ts', 'paged-list.ts'];

/**
 * What a scaffolded adapter's stored payload is named.
 *
 * `bun run scaffold source-adapter` emits a trio — the module, its
 * colocated cases, and the payload those cases are driven over — so
 * registering an id accounts for all three files rather than for the
 * module alone. Without this bucket the fixture beside the first
 * adapter falls through all four, and the guard below reports it as
 * something nobody has decided what to call.
 */
const PAYLOAD_SUFFIX = '-payload.json';

/**
 * Everything the directory holds, sorted.
 *
 * No filter of any kind. A file that is neither a module nor a case
 * file is as much a thing this guard has to account for as an
 * adapter is, and filtering by extension first would hide the entry
 * most worth reporting.
 *
 * @returns The entry names, sorted.
 */
function directoryEntries(): string[] {
  return readdirSync(SOURCES_DIR).sort();
}

/**
 * Every entry the guard cannot account for.
 *
 * The four buckets are the registry module itself, the colocated
 * case files, the declared helpers, and the module and stored
 * payload of each registered id.
 * What falls out of all four is an adapter nobody registered, a
 * helper nobody declared, or something else entirely — and each of
 * those wants a person, which is why the answer is the names rather
 * than a count.
 *
 * @returns The unaccounted-for names, sorted.
 */
function unclassifiedEntries(): string[] {
  const registered = new Set(listSourceIds().flatMap((id) => [
    `${id}.ts`,
    `${id}${PAYLOAD_SUFFIX}`,
  ]));

  return directoryEntries()
    .filter((entry) => entry !== REGISTRY_MODULE)
    .filter((entry) => !entry.endsWith('.test.ts'))
    .filter((entry) => !HELPER_MODULES.includes(entry))
    .filter((entry) => !registered.has(entry));
}

/**
 * Every fault the registry's own contents report, labelled by key.
 *
 * Labelled because a bare sentence says what is wrong without saying
 * which adapter is wrong, and a registry check that names neither is
 * a registry check nobody can act on.
 *
 * @param registry - The registry to walk.
 * @returns One `<id>: <fault>` line per fault, in id order.
 */
function registryFaults(registry: SourceAdapterRegistry): string[] {
  const faults: string[] = [];

  for (const id of listSourceIds(registry)) {
    const adapter = getSourceAdapter(id, registry);

    for (const fault of sourceAdapterContractErrors(adapter, id)) {
      faults.push(`${id}: ${fault}`);
    }
  }

  return faults;
}

describe('sourceAdapterContractErrors — what a module fails', () => {
  // The refusal that is about the module rather than about a member.
  // A value that is not an object has no member to report on, so the
  // check answers once and stops — and a module authored as a
  // FUNCTION lands here rather than in the member-by-member report,
  // which is worth pinning because it is the near miss somebody
  // actually writes.
  it('refuses anything that is not a module object', () => {
    const refusals = [null, undefined, 'adapter', 7, () => CAPTURED]
      .map((value) => sourceAdapterContractErrors(value));

    expect(refusals).toEqual(refusals.map(() => ['not a module object']));
    expect(refusals[0]).toEqual(['not a module object']);
  });

  // An array IS an object, so it is reported member by member rather
  // than refused whole. Pinned because the two endings are one
  // `typeof` apart and nothing else in the file would notice if they
  // swapped.
  it('reports an array member by member rather than refusing it', () => {
    expect(sourceAdapterContractErrors([]))
      .toEqual(CONTRACT_MEMBERS.map((entry) => entry.fault));
  });

  // The whole-contract claim, and the roster guard in one. A module
  // declaring nothing fails every member, in member order, and the
  // expectation is built from the roster — so a member added to the
  // check without a row here arrives as an unexpected sentence, and
  // a member dropped from the check leaves a row with nothing to
  // match.
  it('reports every member a module declaring nothing fails', () => {
    expect(sourceAdapterContractErrors({}))
      .toEqual(CONTRACT_MEMBERS.map((entry) => entry.fault));
  });

  // One member at a time, which is the claim the case above cannot
  // make: a check reporting a fixed list whatever it was handed
  // would pass that one and fail every one of these.
  for (const entry of CONTRACT_MEMBERS) {
    it(`reports ${entry.member} alone when it is the one missing`, () => {
      expect(sourceAdapterContractErrors(moduleWithout(entry.member)))
        .toEqual([entry.fault]);
    });
  }

  // An id that is present and unusable. The empty string is the one
  // worth a case of its own: it is a string, it is falsy, and a
  // check written with a `typeof` test alone would accept it and
  // register an adapter under a key nothing can select.
  it('refuses an id that is present and empty', () => {
    expect(sourceAdapterContractErrors(moduleWith('id', '')))
      .toEqual(['id must be a non-empty string']);
    expect(sourceAdapterContractErrors(moduleWith('id', 7)))
      .toEqual(['id must be a non-empty string']);
  });

  // The key disagreement, which is the only fault a well-typed
  // registry can still carry — every other member is enforced by the
  // interface once the value is typed as one.
  it('reports an id that disagrees with the key it was found under', () => {
    expect(sourceAdapterContractErrors(satisfyingModule('beta'), 'alpha'))
      .toEqual(['id "beta" does not match its registry key "alpha"']);
  });

  // And the same module with no key to disagree with. A module
  // checked on its own has no registry entry, so the id claim is
  // about the id alone.
  it('says nothing about the id when no key was supplied', () => {
    expect(sourceAdapterContractErrors(satisfyingModule('beta'))).toEqual([]);
  });

  // The kind sentence names the accepted set, so a reader of a
  // failure knows what to write without opening the schema. The
  // near miss is deliberate: a plausible kind that is not in the
  // tuple is the mistake this sentence exists for.
  it('reports a kind outside the set, naming the set', () => {
    expect(sourceAdapterContractErrors(moduleWith('kind', 'html')))
      .toEqual([kindFault('"html"')]);
  });

  // Every member of the tuple is accepted, driven off the tuple
  // itself so a kind added to the schema is covered here without an
  // edit. The control is the case above: a check accepting
  // everything would pass this one.
  it('accepts every kind the schema tuple holds', () => {
    const built = SOURCE_KINDS.map((kind) => satisfyingModule('id', kind));
    const answers = built.map((mod) => sourceAdapterContractErrors(mod));

    expect(answers).toEqual(SOURCE_KINDS.map(() => []));
    expect(answers.length).toBeGreaterThan(1);
  });

  // The values that refuse to render, which are the reason the check
  // has a renderer of its own. `JSON.stringify` answers the VALUE
  // undefined for a symbol and THROWS on a cycle, so a sentence
  // built straight out of it would either say nothing or take the
  // check down with it.
  it('describes a kind that has no JSON rendering', () => {
    const cyclic: Record<string, unknown> = {};

    cyclic.self = cyclic;

    expect(sourceAdapterContractErrors(moduleWith('kind', Symbol('api'))))
      .toEqual([kindFault('[symbol]')]);
    expect(sourceAdapterContractErrors(moduleWith('kind', cyclic)))
      .toEqual([kindFault('[unrenderable object]')]);
  });

  // A module whose members refuse to be read at all. Every member
  // reports, and the check returns rather than throwing — which is
  // the claim, since a check that propagated would say nothing about
  // any of the five.
  it('reports every member of a module that refuses to be read', () => {
    const hostile = new Proxy({}, {
      get() {
        throw new Error('this module refuses to be read');
      },
    });

    expect(sourceAdapterContractErrors(hostile))
      .toEqual(CONTRACT_MEMBERS.map((entry) => entry.fault));
  });

  // The control the whole describe rests on. Every case above
  // asserts a sentence; this one asserts that the check can still
  // answer with none, which a check hardcoded to report would fail
  // and every other case here would pass.
  it('answers with nothing for a module that satisfies the contract', () => {
    const module = satisfyingModule();

    expect(sourceAdapterContractErrors(module)).toEqual([]);
    expect(sourceAdapterContractErrors(module, 'sample')).toEqual([]);
  });
});

describe('the registry, and how one adapter is reached', () => {
  // What the registry ships, written out rather than derived. A case
  // that computed the answer from the same literal it is checking
  // would agree with any edit to that literal, and this is the one
  // case that notices an adapter being registered or unregistered at
  // all — beside the guard below, which notices a module that was
  // written and never named.
  it('lists the adapters this service ships', () => {
    expect(listSourceIds()).toEqual(['listing-api']);
  });

  // Sorted, over keys written out of order. The shipped registry
  // cannot demonstrate a sort, which is what the registry argument
  // is for.
  it('lists ids sorted rather than in declaration order', () => {
    const registry: SourceAdapterRegistry = {
      zeta: satisfyingModule('zeta'),
      alpha: satisfyingModule('alpha'),
      mid: satisfyingModule('mid'),
    };

    expect(listSourceIds(registry)).toEqual(['alpha', 'mid', 'zeta']);
  });

  // The lookup, both endings. Identity rather than equality on the
  // hit: a lookup that rebuilt what it returned would satisfy a
  // structural comparison and hand back something the registry does
  // not hold.
  it('answers the registered adapter, and null for an unknown id', () => {
    const adapter = satisfyingModule('alpha');
    const registry: SourceAdapterRegistry = { alpha: adapter };

    expect(getSourceAdapter('alpha', registry)).toBe(adapter);
    expect(getSourceAdapter('beta', registry)).toBeNull();
  });

  // The prototype keys, and the case is live rather than
  // hypothetical whatever the registry holds: `in` answers true for
  // every one of these names over the very object the lookup reads,
  // so a lookup that read the key instead of asking whether it was
  // an own key would hand back a function off `Object.prototype`.
  //
  // The `in` assertions are the control. Without them a green run is
  // equally satisfied by a registry that had stopped being a plain
  // object, where there would be nothing to inherit and nothing to
  // discriminate.
  it('answers null for a name inherited from the prototype', () => {
    const inherited = [
      'toString', 'valueOf', 'constructor', 'hasOwnProperty',
    ];
    const answers = inherited.map((name) => getSourceAdapter(name));

    expect(answers).toEqual(inherited.map(() => null));
    expect(inherited.map((name) => name in SOURCE_ADAPTERS))
      .toEqual(inherited.map(() => true));
  });

  // Every registered adapter satisfies the contract under its own
  // key, over the registry as shipped rather than over one written
  // here.
  //
  // The second half is what makes the first half a reading. A
  // perfectly good adapter filed under the wrong key is the one
  // fault a well-typed registry can still carry, so it is the
  // control available without reaching past the types — and its
  // sentence proves the walk reports, labels, and reaches the id.
  it('holds only adapters satisfying the contract under their key', () => {
    expect(registryFaults(SOURCE_ADAPTERS)).toEqual([]);
    expect(registryFaults({ alpha: satisfyingModule('beta') }))
      .toEqual(['alpha: id "beta" does not match its registry key "alpha"']);
  });
});

describe('the registry names every adapter this directory holds', () => {
  // The guard the static registration costs. Registration is an edit
  // to a literal, so nothing about a new adapter file makes it run —
  // which is the whole point, and which also means an adapter that
  // was written and never registered is invisible to every other
  // gate in the package. This case is what reports it.
  //
  // Both directions. An entry the four buckets cannot account for is
  // an unregistered adapter; a registered id with no module beside
  // it is a key naming nothing.
  it('accounts for every entry, and every id has a module', () => {
    const entries = directoryEntries();

    expect(unclassifiedEntries()).toEqual([]);
    expect(listSourceIds().filter((id) => !entries.includes(`${id}.ts`)))
      .toEqual([]);
  });

  // The control an empty leftover set needs. A guard pointed at a
  // directory that does not hold what it thinks it holds produces
  // exactly the same green, so what was FOUND is asserted too: the
  // module this file covers, the file doing the reading, and every
  // helper the roster declares.
  it('reads the directory the registry and this file sit in', () => {
    const entries = directoryEntries();

    expect(entries).toContain(REGISTRY_MODULE);
    expect(entries).toContain(THIS_FILE);
    expect(HELPER_MODULES.filter((helper) => !entries.includes(helper)))
      .toEqual([]);
    expect(HELPER_MODULES.length).toBeGreaterThan(0);
  });

  // A helper is not an adapter, which the two rosters would let
  // somebody assert twice. Registering a helper would make the guard
  // above pass while the registry named a module declaring none of
  // the five members, so the overlap is refused directly.
  it('registers no module the helper roster declares', () => {
    const registered = listSourceIds().map((id) => `${id}.ts`);

    expect(registered.filter((file) => HELPER_MODULES.includes(file)))
      .toEqual([]);
  });
});
