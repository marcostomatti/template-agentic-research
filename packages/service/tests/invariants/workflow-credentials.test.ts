/**
 * The credentials the built workflows bind, held against the roster
 * the local bootstrap creates.
 *
 * TWO FILES WRITTEN BY DIFFERENT PEOPLE FOR DIFFERENT REASONS have to
 * spell the same thing. `workflows/dist/` carries a binding per
 * credential-bearing node, drawn on a canvas; `CREDENTIAL_ROSTER` in
 * `scripts/n8n-credentials.ts` declares what a bootstrap creates on an
 * instance, written by whoever wrote the bootstrap. n8n resolves a
 * binding BY ID, so a triple present on one side and absent from the
 * other is a node bound to nothing.
 *
 * WHAT MAKES IT WORTH A FILE IS HOW QUIET IT IS. The import verb
 * writes a workflow whatever its nodes name, `activate-workflows.sh`
 * reads triggers rather than bindings, and the publish that arms it
 * asks about neither — so every step of the local path reports
 * success and the failure arrives at the first node that opens a
 * socket, on an operator's machine. The ordinary way to get there is
 * a canvas edit that adds a node bound to a third credential, and it
 * looks like every other canvas edit.
 *
 * SET-EQUAL IN BOTH DIRECTIONS, because the two failures are
 * different edits. A triple bound by an artifact and declared by no
 * roster entry is the 43-nodes-bound-to-nothing failure and the
 * dangerous one, so it is reported first. A roster entry no artifact
 * binds is a credential the bootstrap creates for nobody, which
 * spends an id and hides a rename — and a comparison of COUNTS would
 * report neither, two sets of two staying two while both moved.
 *
 * BOTH SIDES ARE ASSERTED NON-EMPTY ABOVE THE EQUALITY. Two empty
 * sets are set-equal, and the report over them is the report over a
 * healthy pair: the same empty list, printed the same way. The
 * artifact side is guarded twice over — `loadBuiltWorkflows` refuses
 * a tree nothing built, `credentialReferences` refuses a walk handed
 * no workflow, and the case below still asserts the size rather than
 * inheriting either refusal.
 *
 * EACH DIRECTION IS PLANTED AT THE ARTIFACT ITS OWN SIDE IS DERIVED
 * FROM, on the precedent `openapi-coverage.test.ts` sets. The
 * artifact direction is planted by copying the real built tree,
 * adding one node bound to a credential nobody declares, and reading
 * it back through the same walk — so the plant goes through the JSON
 * parse, the node walk and the binding read rather than being
 * spliced into an answer. The roster direction is planted on a copy
 * of the roster array, which is the document that side is: the roster
 * is a TypeScript literal and there is nothing else to mutate. The
 * no-op plant is asserted equal to the real read before either is
 * trusted.
 *
 * WHAT THIS FILE CANNOT SEE is whether the credentials really landed.
 * A triple agreeing on both sides says the bootstrap declares what
 * the canvases bind; it says nothing about an import that ran, a row
 * that stored the declared id, or a stored secret that decrypts —
 * n8n encrypts credential data with a salt, so neither the row's
 * presence nor its timestamp witnesses a usable credential. Those are
 * operator readings and live in the measurement record.
 */
import type { BuiltWorkflow } from './workflow-dist.js';
import type { CredentialRosterEntry } from '../../scripts/n8n-credentials.js';

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { CREDENTIAL_ROSTER } from '../../scripts/n8n-credentials.js';

import {
  NoWorkflowsReadError,
  TRIPLE_SEPARATOR,
  credentialReferences,
  referencedTriples,
  tripleLabel,
} from './workflow-credentials.js';
import { DIST_DIR, loadBuiltWorkflows } from './workflow-dist.js';

// ---------------------------------------------------------------------------
// The two sides
// ---------------------------------------------------------------------------

/** The built tree, read once. */
const WORKFLOWS = loadBuiltWorkflows();

/** Every credential the built artifacts bind. */
const REFERENCED = referencedTriples(WORKFLOWS);

/** Every credential the local bootstrap declares. */
const DECLARED = new Set(CREDENTIAL_ROSTER.map(tripleLabel));

/** Why a triple appears in the report's leading block. */
const UNDECLARED = 'bound by an artifact, declared by no roster entry';

/** Why a triple appears in the trailing one. */
const UNREFERENCED = 'declared by the roster, bound by no artifact';

/**
 * Every disagreement between the two sides, as the failure prints it.
 *
 * @param referenced - Triples the built artifacts bind.
 * @param declared - Triples the roster declares.
 * @returns One line per disagreement, `<triple> — <direction>`, the
 *   undeclared block first and each block sorted. Empty when the two
 *   sets are equal, which is the whole assertion.
 *
 * @remarks
 * Both sets are arguments rather than the module constants, so a case
 * can hand it a side it planted.
 *
 * The undeclared block leads because it is the failure that costs an
 * operator a run: a node bound to a credential nothing creates. The
 * trailing block is the cheaper one, a credential created for nobody.
 * Reporting the triples rather than a count is what makes the
 * direction legible at all — a rename moves one entry out of each
 * side at once and leaves both counts where they were.
 */
function credentialGaps(
  referenced: ReadonlySet<string>,
  declared: ReadonlySet<string>,
): readonly string[] {
  const undeclared = [...referenced]
    .filter((triple) => !declared.has(triple))
    .sort();
  const unreferenced = [...declared]
    .filter((triple) => !referenced.has(triple))
    .sort();

  return [
    ...undeclared.map((triple) => `${triple} — ${UNDECLARED}`),
    ...unreferenced.map((triple) => `${triple} — ${UNREFERENCED}`),
  ];
}

/**
 * A set of triples in a form two of them can be compared in.
 *
 * @param triples - Either side, or a planted one.
 * @returns The members, sorted, so a comparison reads the same on
 *   every machine and a failure prints the whole list.
 */
function sorted(triples: ReadonlySet<string>): readonly string[] {
  return [...triples].sort();
}

// ---------------------------------------------------------------------------
// Fixture trees
// ---------------------------------------------------------------------------

/** Fixture trees created here, removed once this file finishes. */
const FIXTURE_DIRS: string[] = [];

afterAll(() => {
  for (const fixtureDir of FIXTURE_DIRS) {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

/**
 * A fresh empty directory, registered for removal.
 *
 * One per call rather than one shared, so a case that leaves a file
 * behind can never decide what the next one reads.
 *
 * @returns Its path.
 */
function makeFixtureDir(): string {
  const directory = mkdtempSync(join(tmpdir(), 'ar-workflow-credentials-'));

  FIXTURE_DIRS.push(directory);

  return directory;
}

/**
 * An artifact in the shape a plant mutates it through.
 *
 * Only `nodes` is declared: it is the member every plant here reaches
 * for, and the rest of the n8n envelope is carried through the round
 * trip untouched.
 */
interface PlantedArtifact {
  /** The workflow's nodes, each an open bag a plant may edit. */
  nodes: Record<string, unknown>[];
}

/**
 * The artifact every plant against the real tree is made in.
 *
 * `ar-dispatch` because it binds the database credential at five
 * nodes and no model one, so a plant that adds a binding cannot be
 * confused with a node that already carried the same triple, and a
 * plant that removes one leaves four siblings behind — which is the
 * reading the blindness case rests on.
 */
const PLANT_TARGET = 'ar-dispatch.json';

/**
 * The real built tree with one artifact changed, read back.
 *
 * @param mutate - Applied to the parsed {@link PLANT_TARGET} before it
 *   is written back. Mutating rather than returning, so a plant reads
 *   as the one edit it is.
 * @returns What `loadBuiltWorkflows` answers over the whole planted
 *   tree, the other five artifacts copied verbatim.
 * @throws Error When the copy holds no {@link PLANT_TARGET}, which
 *   means the artifact was renamed and every plant here is aimed at
 *   nothing.
 *
 * @remarks
 * THE PLANT GOES IN AT THE ARTIFACT, not at the answer, so what comes
 * back has been through the directory walk, the JSON parse, the node
 * check and the binding read that a real artifact goes through. A
 * `BuiltWorkflow` assembled by hand and spliced into the list would
 * have shown only that the assertions compare two values.
 *
 * The whole tree is copied rather than the one artifact, so the
 * planted set differs from the real one by exactly the plant and a
 * case can say which line the difference is.
 */
function plantedWorkflows(
  mutate: (artifact: PlantedArtifact) => void,
): readonly BuiltWorkflow[] {
  const directory = makeFixtureDir();

  cpSync(DIST_DIR, directory, { recursive: true });

  const target = join(directory, PLANT_TARGET);
  const artifact = JSON.parse(
    readFileSync(target, 'utf8'),
  ) as PlantedArtifact;

  if (!Array.isArray(artifact.nodes)) {
    throw new Error(
      `The built tree holds no '${PLANT_TARGET}' with nodes to ` +
      'plant into. Every plant in this file is made in that ' +
      'artifact, so a rename leaves them all aimed at nothing.',
    );
  }

  mutate(artifact);
  writeFileSync(target, JSON.stringify(artifact));

  return loadBuiltWorkflows(directory);
}

/** The one artifact {@link fixtureTree} writes. */
const FIXTURE_ARTIFACT = 'zz-credential-fixture.json';

/**
 * A tree holding one artifact, written from a node list.
 *
 * @param nodes - The nodes the artifact carries, unchecked, so a case
 *   can write a binding no well-formed artifact would.
 * @returns The directory it was written into.
 *
 * @remarks
 * Named by nothing the roster reserves and by nothing the build will
 * ever write, so a fixture cannot read as an assertion about a real
 * workflow.
 */
function fixtureTree(nodes: readonly unknown[]): string {
  const directory = makeFixtureDir();

  writeFileSync(
    join(directory, FIXTURE_ARTIFACT),
    JSON.stringify({ name: 'AR Credential Fixture', nodes }),
  );

  return directory;
}

// ---------------------------------------------------------------------------
// The plants
// ---------------------------------------------------------------------------

/**
 * A node bound to a credential the roster does not declare.
 *
 * Shaped like the edit that would really produce this failure: a
 * canvas gaining an HTTP node that authenticates against a search
 * provider, bound at a fixed id the way every node in this port binds
 * one.
 */
const PLANTED_NODE = {
  credentials: { httpHeaderAuth: { id: 'ar-search', name: 'AR Search' } },
  name: 'Fetch Source Page',
  type: 'n8n-nodes-base.httpRequest',
};

/** The triple {@link PLANTED_NODE} adds to the artifact side. */
const PLANTED_NODE_TRIPLE = 'httpHeaderAuth / ar-search / AR Search';

/**
 * A roster entry no artifact binds.
 *
 * The other half of the same story: a bootstrap that creates a
 * credential for an export target before any canvas reaches for one.
 */
const PLANTED_ROSTER_ENTRY: CredentialRosterEntry = {
  id: 'ar-export',
  name: 'AR Export',
  role: 'Planted here alone, and declared by no shipped roster.',
  type: 'openAiApi',
};

// ---------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------

describe('the credential walk - the refusals', () => {
  // First, because the equality below is answered by an empty read
  // in a way that names the wrong edit. The control is in the same
  // case: a refusal that fired on everything would pass the two
  // expectations above it and say nothing.
  it('refuses a walk handed no workflow, and answers over the tree', () => {
    expect(() => credentialReferences([])).toThrow(NoWorkflowsReadError);
    expect(() => referencedTriples([])).toThrow(NoWorkflowsReadError);

    expect(credentialReferences(WORKFLOWS).length).toBeGreaterThan(0);
  });

  // A `credentials` member read as anything but a mapping answers no
  // binding, which is what a node binding nothing answers. Both
  // shapes are driven, and the control is the same node with a
  // well-formed member.
  it('refuses a credentials member that is not a mapping', () => {
    const withMember = (member: unknown): string => fixtureTree([
      { credentials: member, name: 'Open Run', type: 'n8n-nodes-base.postgres' },
    ]);

    expect(() => credentialReferences(
      loadBuiltWorkflows(withMember('ar-postgres')),
    ))
      .toThrow(/is string and not a mapping/);
    expect(() => credentialReferences(loadBuiltWorkflows(withMember([
      { id: 'ar-postgres', name: 'AR Postgres' },
    ]))))
      .toThrow(/not a mapping/);

    // The control. The same node carrying the member a real artifact
    // carries answers one binding rather than refusing.
    const wellFormed = withMember(
      { postgres: { id: 'ar-postgres', name: 'AR Postgres' } },
    );

    expect(credentialReferences(loadBuiltWorkflows(wellFormed)))
      .toHaveLength(1);
  });

  // The quiet one. A binding short of a string member drops out of a
  // set that forty siblings keep populated, so the equality would
  // pass over a node bound to nothing.
  it('refuses a binding short of a string id or name', () => {
    const bound = (binding: unknown): string => fixtureTree([
      {
        credentials: { postgres: binding },
        name: 'Open Run',
        type: 'n8n-nodes-base.postgres',
      },
    ]);

    expect(() => credentialReferences(loadBuiltWorkflows(bound(
      { id: 7, name: 'AR Postgres' },
    ))))
      .toThrow(/carrying no string id\. /);
    expect(() => credentialReferences(loadBuiltWorkflows(bound(
      { id: 'ar-postgres' },
    ))))
      .toThrow(/carrying no string name\. /);
    expect(() => credentialReferences(loadBuiltWorkflows(bound(
      { name: 'AR Postgres' },
    ))))
      .toThrow(/carrying no string id\. /);

    // Short of both, which is what an entry that is not an object at
    // all is: named in one refusal rather than in two runs.
    expect(() => credentialReferences(loadBuiltWorkflows(bound('ar-postgres'))))
      .toThrow(/carrying no string id and no string name\. /);

    // The control, in the same case: the same node with both members
    // spelled answers the binding rather than refusing.
    expect(credentialReferences(loadBuiltWorkflows(bound(
      { id: 'ar-postgres', name: 'AR Postgres' },
    ))))
      .toHaveLength(1);
  });

  // Why that refusal is worth having rather than a quiet skip. The
  // comparison is over a SET, and a set is blind to one node: the
  // same artifact with that node's binding deleted outright answers
  // exactly the triples the real tree does.
  it('answers the same set with one artifact node unbound', () => {
    const unbound = referencedTriples(plantedWorkflows((artifact) => {
      const node = artifact.nodes
        .find((entry) => entry['credentials'] !== undefined);

      if (node === undefined) {
        throw new Error(`No bound node in '${PLANT_TARGET}' to unbind.`);
      }

      node['credentials'] = undefined;
    }));

    expect(sorted(unbound)).toStrictEqual(sorted(REFERENCED));
  });
});

describe('the credential walk - what it reads', () => {
  // The type is the KEY and the id and name are the value under it.
  // A node binding twice answers twice, and a node binding nothing
  // answers nothing rather than refusing.
  it('takes the type from the key and the id and name from the value', () => {
    const directory = fixtureTree([
      { name: 'Open Run', type: 'n8n-nodes-base.noOp' },
      {
        credentials: {
          openAiApi: { id: 'ar-model', name: 'AR Model' },
          postgres: { id: 'ar-postgres', name: 'AR Postgres' },
        },
        name: 'Bound Twice',
        type: 'n8n-nodes-base.postgres',
      },
    ]);

    expect(credentialReferences(loadBuiltWorkflows(directory)))
      .toStrictEqual([
        {
          file: FIXTURE_ARTIFACT,
          id: 'ar-model',
          name: 'AR Model',
          node: 'Bound Twice',
          type: 'openAiApi',
        },
        {
          file: FIXTURE_ARTIFACT,
          id: 'ar-postgres',
          name: 'AR Postgres',
          node: 'Bound Twice',
          type: 'postgres',
        },
      ]);
  });

  // The near miss on that reading: the same value under another key
  // is another credential. A walk answering a constant type, or
  // taking the type off the node, would answer `postgres` here.
  it('answers the key it found, not the value it recognised', () => {
    const directory = fixtureTree([
      {
        credentials: { httpHeaderAuth: { id: 'ar-postgres', name: 'AR Postgres' } },
        name: 'Open Run',
        type: 'n8n-nodes-base.postgres',
      },
    ]);

    expect(credentialReferences(loadBuiltWorkflows(directory))[0]?.type)
      .toBe('httpHeaderAuth');
  });

  // Every binding carries where it was found, which is the whole of
  // what a failure has to send a reader on.
  it('names the artifact and the node every binding came from', () => {
    const references = credentialReferences(WORKFLOWS);
    const anonymous = references
      .filter((reference) => reference.file === '' || reference.node === '');

    expect(references.length).toBeGreaterThan(0);
    expect(anonymous).toStrictEqual([]);
    expect(new Set(references.map((reference) => reference.file)).size)
      .toBe(WORKFLOWS.length);
  });
});

describe('the triple label', () => {
  // The label is a faithful key only while no part of a triple
  // carries the separator, and that is a reading rather than an
  // assumption: both sides are checked, and the label itself is
  // checked to carry it so `includes` is known to be looking.
  it('joins three parts that carry no separator on either side', () => {
    const parts = [
      ...credentialReferences(WORKFLOWS)
        .flatMap((reference) => [reference.type, reference.id, reference.name]),
      ...CREDENTIAL_ROSTER
        .flatMap((entry) => [entry.type, entry.id, entry.name]),
    ];

    expect(parts.length).toBeGreaterThan(0);
    expect(parts.filter((part) => part.includes(TRIPLE_SEPARATOR)))
      .toStrictEqual([]);

    // The control on `includes`, and on the join itself.
    const label = tripleLabel(
      { id: 'ar-postgres', name: 'AR Postgres', type: 'postgres' },
    );

    expect(label).toBe(`postgres${TRIPLE_SEPARATOR}ar-postgres${TRIPLE_SEPARATOR}AR Postgres`);
    expect(label.includes(TRIPLE_SEPARATOR)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The contract
// ---------------------------------------------------------------------------

describe('the built workflows and the bootstrap roster', () => {
  // The harness, asserted before anything is read through it. Every
  // plant against the real tree is that tree copied, one artifact
  // rewritten through `JSON.stringify`, and read back — so a round
  // trip that moved something on its own would show up as a plant
  // reporting more than it planted.
  it('round-trips the built tree unchanged through a no-op plant', () => {
    expect(sorted(referencedTriples(plantedWorkflows(() => undefined))))
      .toStrictEqual(sorted(REFERENCED));
  });

  // Both sides, sized. The fold is over many more bindings than it
  // answers triples, which is what says the set is a fold rather than
  // two artifacts that happened to carry one binding each.
  it('folds many bindings into a small set on a non-empty roster', () => {
    expect(WORKFLOWS.length).toBeGreaterThan(0);
    expect(REFERENCED.size).toBeGreaterThan(0);
    expect(DECLARED.size).toBeGreaterThan(0);
    expect(credentialReferences(WORKFLOWS).length)
      .toBeGreaterThan(REFERENCED.size);
  });

  // The rule. Both sides are asserted non-empty immediately above the
  // equality as well, because two empty sets are set-equal and the
  // report over them is the report over a healthy pair.
  it('binds exactly the credentials the bootstrap roster declares', () => {
    expect(REFERENCED.size).toBeGreaterThan(0);
    expect(DECLARED.size).toBeGreaterThan(0);

    expect(credentialGaps(REFERENCED, DECLARED)).toStrictEqual([]);
  });

  // The first direction, planted at the artifact side. This is the
  // canvas edit that adds a node bound to a third credential: the
  // import, the activation and the publish all succeed, and the node
  // is bound to nothing.
  it('reports an artifact binding a credential the roster omits', () => {
    const planted = referencedTriples(plantedWorkflows((artifact) => {
      artifact.nodes.push(PLANTED_NODE);
    }));

    expect(planted.has(PLANTED_NODE_TRIPLE)).toBe(true);
    expect(credentialGaps(planted, DECLARED))
      .toStrictEqual([`${PLANTED_NODE_TRIPLE} — ${UNDECLARED}`]);
  });

  // The second direction, planted at the roster side — which is the
  // document that side is, the roster being a TypeScript literal. A
  // credential created for nobody, which spends an id and hides a
  // rename.
  it('reports a roster entry no artifact binds', () => {
    const declared = new Set(
      [...CREDENTIAL_ROSTER, PLANTED_ROSTER_ENTRY].map(tripleLabel),
    );

    expect(declared.size).toBe(DECLARED.size + 1);
    expect(credentialGaps(REFERENCED, declared))
      .toStrictEqual([`${tripleLabel(PLANTED_ROSTER_ENTRY)} — ${UNREFERENCED}`]);
  });

  // Both at once, which is what a rename really produces: one entry
  // leaves each side and the two counts do not move. A report keyed
  // on counts says nothing here.
  it('reports both directions of a renamed credential', () => {
    const renamed = CREDENTIAL_ROSTER.map((entry) => (
      entry.id === 'ar-model'
        ? { ...entry, id: 'ar-llm' }
        : entry
    ));
    const declared = new Set(renamed.map(tripleLabel));
    const gaps = credentialGaps(REFERENCED, declared);

    expect(declared.size).toBe(DECLARED.size);
    expect(gaps).toStrictEqual([
      `openAiApi / ar-model / AR Model — ${UNDECLARED}`,
      `openAiApi / ar-llm / AR Model — ${UNREFERENCED}`,
    ]);
  });
});
