/**
 * Cases for `src/sources/config-proposer.ts`.
 *
 * Two refusals lead, because they are what the module is for. A
 * proposal nobody approved must not become an UPDATE, and a
 * proposer that could not answer must not become a row — the rest
 * of the file is the accepting paths those two bound, and the
 * builder that deliberately refuses nothing arrives last with the
 * case that says so.
 *
 * Nothing here reaches a model server and nothing could. Every
 * proposer in this file is a literal declared beside the case that
 * uses it: one that answers from a constant, one that throws where
 * it stands, one that rejects a step later, and one that records
 * what it was handed. That is the seam working rather than a
 * mocking arrangement — the module holds no proposer, so a case
 * that wanted to reach one would have to write it.
 *
 * The recorder is the only way one claim can be made at all. The
 * source view is narrowed before it crosses the seam, and a
 * narrowing is invisible to a caller: {@link ProposalSource} is
 * structural, so a whole `sources` row satisfies it and the case
 * that matters passes one in. Declaring the recorder's parameter as
 * `unknown` is what lets it read the members the caller was
 * supposed to have kept out, and the interface still accepts it.
 *
 * Two key rosters are written out here rather than read off the
 * answers. Both functions promise a shape whose whole point is what
 * it does NOT carry — a pending row that cannot name `approved_at`,
 * an update that cannot name `source_id` — and a roster taken from
 * the value under test would agree with whatever that value became.
 */
import type {
  ApprovedProposal,
  ConfigProposer,
  PendingProposalRow,
  ProposalSource,
  ProposedConfig,
  SourceConfigUpdate,
} from './config-proposer.js';

import { describe, expect, it } from 'vitest';

import { parserConfigErrors } from '../lib/parser-config.js';

import {
  proposalToPendingRow,
  proposalToSourceUpdate,
  proposeSourceConfig,
} from './config-proposer.js';

// ---------------------------------------------------------------------------
// Shared inputs
// ---------------------------------------------------------------------------

/** The source every case proposes for. */
const SOURCE: ProposalSource = {
  id: 7,
  domainId: 3,
  kind: 'api',
  endpoint: 'https://example.invalid/listing',
};

/**
 * The members a proposer is entitled to see, written out.
 *
 * The claim they support is a set equality against what a recorder
 * was actually handed, so reading them off the type would make it a
 * comparison of the module with itself.
 *
 * `satisfies` closes one direction of that trade: a name here that
 * the type does not carry fails to compile, so the roster cannot
 * outlive a renamed column. The other direction — the type growing
 * a member no roster knows about — is closed by
 * {@link COVERS_EVERY_MEMBER} below and by nothing else.
 */
const SOURCE_MEMBERS = [
  'domainId',
  'endpoint',
  'id',
  'kind',
] as const satisfies readonly (keyof ProposalSource)[];

/** The columns a pending row names, and the ones it must not. */
const PENDING_MEMBERS = [
  'contract',
  'domainId',
  'parserConfig',
  'proposedBy',
  'sourceId',
] as const satisfies readonly (keyof PendingProposalRow)[];

/** The columns an approval authorizes, and no others. */
const UPDATE_MEMBERS = [
  'contract',
  'parserConfig',
] as const satisfies readonly (keyof SourceConfigUpdate)[];

/**
 * True only when a roster names every member of the shape it was
 * written for.
 *
 * The tuple around `Exclude` is load-bearing. Without it the union
 * distributes, the conditional answers `boolean`, and `true` is
 * assignable to that — the pin compiles for every shape and holds
 * nothing.
 *
 * `Required` is the other half, and it matters here because two of
 * the three shapes are built from an INSERT type where a column
 * with a default is optional. Over an all-optional shape `keyof` is
 * satisfied by a roster naming none of its members, so a pin
 * written without it would look identical to this one and close
 * nothing at all.
 */
type Covers<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof Required<T>, L[number]>] extends [never] ? true : false;

/**
 * The three rosters, pinned in the direction a hand-written list
 * cannot see: a column added to any of the three shapes fails here.
 *
 * One intersection rather than three constants, because a failing
 * leg collapses the whole to `never` and the assignment names the
 * line. Read by a case below, or nothing would report it.
 */
const COVERS_EVERY_MEMBER: Covers<ProposalSource, typeof SOURCE_MEMBERS>
  & Covers<PendingProposalRow, typeof PENDING_MEMBERS>
  & Covers<SourceConfigUpdate, typeof UPDATE_MEMBERS> = true;

/**
 * A stem no module here was written against, assembled at run time
 * so it appears nowhere in this file whole.
 *
 * The refusal message is scanned for it, which is what makes the
 * no-echo claim a reading of the output rather than a reading of
 * the sentence somebody meant to write.
 */
const STEM = ['zq', 'wv', 'xk'].join('');

/** A proposal carrying that stem in both documents. */
const MARKED: ProposedConfig = {
  parserConfig: { recordsPath: `${STEM}-records` },
  contract: { fields: { [`${STEM}-field`]: { required: true } } },
};

/** An ordinary well-formed proposal, as a proposer would answer one. */
const PROPOSAL: ProposedConfig = {
  parserConfig: { recordsPath: 'items', fields: { url: { path: 'link' } } },
  contract: { fields: { url: { required: true } } },
};

/** When an approval was recorded, for the rows that carry one. */
const APPROVED_AT = new Date('2026-08-30T09:00:00.000Z');

/**
 * A proposal row, built around whatever the case is about.
 *
 * A local builder rather than a constant per case, so the one
 * member under test is the only thing that differs between a
 * refused row and an accepted one — which is what lets the approval
 * be the whole of the difference.
 *
 * @param approvedAt - The approval stamp, or null for a pending row.
 * @param proposal - The two documents the row carries.
 * @returns The row, as a SELECT would answer one.
 */
function proposalRow(
  approvedAt: Date | null,
  proposal: ProposedConfig = PROPOSAL,
): ApprovedProposal {
  return {
    id: 41,
    approvedAt,
    parserConfig: proposal.parserConfig,
    contract: proposal.contract,
  };
}

/** What a recorder saw on one call. */
interface SeenCall {
  /** The source, as it arrived — `unknown`, so extras are readable. */
  readonly source: unknown;
  /** The sample, by reference. */
  readonly sample: unknown;
}

/**
 * A proposer that answers a constant and records what it was asked.
 *
 * Its `propose` declares `unknown` parameters, which the interface
 * accepts and which is the only way a case can observe a member the
 * narrowing was supposed to have dropped. A parameter typed
 * {@link ProposalSource} would make the extras unreadable and the
 * claim untestable.
 *
 * @param seen - Where to record the calls.
 * @param answer - What to answer.
 * @returns The proposer.
 */
function recordingProposer(
  seen: SeenCall[],
  answer: ProposedConfig = PROPOSAL,
): ConfigProposer {
  return {
    name: 'recording-proposer',
    propose(source: unknown, sample: unknown): Promise<ProposedConfig> {
      seen.push({ source, sample });

      return Promise.resolve(answer);
    },
  };
}

// ---------------------------------------------------------------------------
// The gate: what an approval authorizes, and what nothing does
// ---------------------------------------------------------------------------

describe('proposalToSourceUpdate', () => {
  // The refusal the module exists for. A pending row and an
  // approved one differ in this one member, so the approval is the
  // whole of the difference between this case and the one below
  // that gets an answer.
  it('refuses a proposal nobody approved', () => {
    expect(() => proposalToSourceUpdate(proposalRow(null)))
      .toThrow(/carries no approved_at/u);
  });

  // Read through `??`, so a column projected away is the same
  // answer as a column that is NULL. A caller that selected the
  // documents without the stamp is in exactly the state the rule
  // refuses, and a shape that cannot say it was approved was not.
  it('refuses a row that carries no stamp at all', () => {
    const projected = { id: 41, parserConfig: {}, contract: {} };

    expect(() => proposalToSourceUpdate(projected as ApprovedProposal))
      .toThrow(/carries no approved_at/u);
  });

  // The status column is not consulted, which is what the
  // database does too: its CHECK reads the two timestamps and
  // nothing else, so a row stamped `done` by a writer that skipped
  // the ruling is storable. A gate reading the status would open
  // for it.
  it('refuses on the stamp rather than on anything a status says', () => {
    const claimed = { ...proposalRow(null), status: 'done' };

    expect(() => proposalToSourceUpdate(claimed)).toThrow(/approved_at/u);
  });

  // The refusal names the row and the rule. Both documents carry a
  // stem assembled at run time, so this reads the OUTPUT for a
  // leak rather than reading the sentence somebody meant to write
  // — a template pasting a proposed value into the message would
  // satisfy every other case in this file.
  it('names the row and the rule, and neither proposed document', () => {
    let message = '';

    try {
      proposalToSourceUpdate(proposalRow(null, MARKED));
    } catch (error) {
      message = error instanceof Error
        ? error.message
        : String(error);
    }

    // The control: the scan has something to find, and the stem is
    // genuinely in the input it was told to look at.
    expect(JSON.stringify(MARKED)).toContain(STEM);
    expect(message).toContain('41');
    expect(message).toContain('approved_at');
    expect(message).not.toContain(STEM);
  });

  // The same row the first case refused, approved and re-offered.
  // Nothing else about it moved.
  it('answers once the row records an approval', () => {
    const update = proposalToSourceUpdate(proposalRow(APPROVED_AT));

    expect(Object.keys(update).sort())
      .toStrictEqual([...UPDATE_MEMBERS].sort());
  });

  // The answer IS the SET clause, so a member it carried would be
  // written onto the source. `source_id` is the WHERE and is
  // absent for that reason; `status` and `applied_at` belong to
  // the proposal row. Asserting the key set rather than the two
  // members is what catches a third arriving.
  it('carries the two documents and no other column', () => {
    const update = proposalToSourceUpdate(proposalRow(APPROVED_AT));

    expect(update.parserConfig).toBe(PROPOSAL.parserConfig);
    expect(update.contract).toBe(PROPOSAL.contract);
    expect(Object.keys(update)).not.toContain('sourceId');
  });

  // Not a refusal, and deliberately so: re-applying an approved
  // proposal writes the same two documents onto the same source,
  // so there is nothing here to protect by turning it away. The
  // selection that skips applied rows belongs to whoever walks the
  // queue.
  it('answers again for a proposal already applied', () => {
    const applied = {
      ...proposalRow(APPROVED_AT),
      appliedAt: new Date('2026-08-30T10:00:00.000Z'),
    };

    expect(proposalToSourceUpdate(applied).contract)
      .toBe(PROPOSAL.contract);
  });

  // The approval is the gate and this is not a second one. A
  // config the engine would refuse still reaches the source once
  // somebody approved it, and the control beside the assertion is
  // what says the engine really would have refused it.
  it('answers a proposal the parse engine would refuse', () => {
    const refused: ProposedConfig = {
      parserConfig: { fields: {} },
      contract: {},
    };
    const update = proposalToSourceUpdate(proposalRow(APPROVED_AT, refused));

    expect(parserConfigErrors(refused.parserConfig).length)
      .toBeGreaterThan(0);
    expect(update.parserConfig).toBe(refused.parserConfig);
  });
});

// ---------------------------------------------------------------------------
// The seam: what crosses it, and what happens when nothing answers
// ---------------------------------------------------------------------------

describe('proposeSourceConfig', () => {
  // A proposer that fails where it stands. The rejection is the
  // SAME error object, which is the observable form of nothing
  // having caught it: a wrapper, a retry or a swallowed failure
  // would each answer something else, and a swallowed one would
  // build a pending row for a question nobody answered.
  it('lets a proposer that throws through untouched', async () => {
    const refusal = new Error('the endpoint refused the request');
    const proposer: ConfigProposer = {
      name: 'throwing-proposer',
      propose(): Promise<ProposedConfig> {
        throw refusal;
      },
    };

    await expect(proposeSourceConfig(proposer, SOURCE, {}))
      .rejects.toBe(refusal);
  });

  // The other shape the same failure arrives in, and the one a
  // model client actually produces: the call returns and the
  // promise rejects a step later.
  //
  // Not the case above written twice, and the difference is
  // measurable. A `.catch()` hung on the returned promise swallows
  // this shape and leaves that one green — a synchronous throw
  // never reaches a handler attached to a promise that was never
  // returned — while a `try` around the `await` reddens both. One
  // case alone would leave half of the propagation claim to a
  // spelling nobody chose.
  it('lets a proposer that rejects through untouched', async () => {
    const refusal = new Error('the endpoint stopped answering');
    const proposer: ConfigProposer = {
      name: 'rejecting-proposer',
      propose(): Promise<ProposedConfig> {
        return Promise.reject(refusal);
      },
    };

    await expect(proposeSourceConfig(proposer, SOURCE, {}))
      .rejects.toBe(refusal);
  });

  // The narrowing, which is the one claim here a caller cannot
  // make on its own. A whole `sources` row satisfies the parameter
  // type, so this passes one in and reads back what the proposer
  // was actually shown — the recorder's `unknown` parameter is
  // what makes the extras readable at all.
  it('shows a proposer the members it declares and no others', async () => {
    const seen: SeenCall[] = [];
    const wholeRow = {
      ...SOURCE,
      cursor: 'page-9',
      parserConfig: { recordsPath: 'items' },
      contract: {},
      enabled: true,
      flagged: false,
      consecutiveFailures: 2,
    };

    await proposeSourceConfig(recordingProposer(seen), wholeRow, {});

    expect(seen.length).toBe(1);
    expect(Object.keys(seen[0]?.source as object).sort())
      .toStrictEqual([...SOURCE_MEMBERS].sort());
  });

  // The members that DID cross, by value, so the narrowing above
  // is shown to have kept what it was supposed to keep rather than
  // simply dropping things.
  it('shows the source it was asked about', async () => {
    const seen: SeenCall[] = [];

    await proposeSourceConfig(recordingProposer(seen), SOURCE, {});

    expect(seen[0]?.source).toStrictEqual(SOURCE);
    expect(seen[0]?.source).not.toBe(SOURCE);
  });

  // The sample is forwarded and never read, so a value nothing can
  // render reaches the proposer intact. Identity rather than
  // equality: a copy would mean something here had walked it.
  it('hands the sample over unread', async () => {
    const seen: SeenCall[] = [];
    const hostile = {
      toString(): string {
        throw new Error('this sample cannot be rendered');
      },
    };

    await proposeSourceConfig(recordingProposer(seen), SOURCE, hostile);

    expect(seen[0]?.sample).toBe(hostile);
  });

  // The accepting path, end to end: what the proposer answered
  // becomes the row, and `proposed_by` is the proposer's own name
  // rather than a string the caller supplied.
  it('builds the pending row from what the proposer answered', async () => {
    const seen: SeenCall[] = [];
    const proposer = recordingProposer(seen);
    const row = await proposeSourceConfig(proposer, SOURCE, {});

    expect(Object.keys(row).sort())
      .toStrictEqual([...PENDING_MEMBERS].sort());
    expect(row.proposedBy).toBe('recording-proposer');
    expect(row.sourceId).toBe(SOURCE.id);
    expect(row.parserConfig).toBe(PROPOSAL.parserConfig);
  });
});

// ---------------------------------------------------------------------------
// The builder, which refuses nothing
// ---------------------------------------------------------------------------

describe('proposalToPendingRow', () => {
  // The columns the propose path writes, and — the half that
  // matters — the ones it cannot. A key set rather than four
  // member assertions, because what would be wrong is a fifth key
  // arriving rather than one of these four being off.
  it('names the columns a proposal writes and no others', () => {
    const row = proposalToPendingRow(SOURCE, PROPOSAL, 'an-operator');

    expect(Object.keys(row).sort())
      .toStrictEqual([...PENDING_MEMBERS].sort());
    expect(Object.keys(row)).not.toContain('approvedAt');
    expect(Object.keys(row)).not.toContain('status');
  });

  // The pin the key sets above cannot supply. `satisfies` catches
  // a roster naming a column the type dropped; this catches the
  // type growing one no roster knows about, which is the direction
  // a hand-written list agrees with by construction.
  it('holds every member of all three shapes', () => {
    expect(COVERS_EVERY_MEMBER).toBe(true);
  });

  // Provenance comes through as given. The builder takes it as a
  // parameter rather than reading a proposer, because an operator
  // writing an arrangement by hand goes through the same table and
  // the same ruling.
  it('records whatever proposed the arrangement', () => {
    const row = proposalToPendingRow(SOURCE, PROPOSAL, 'an-operator');

    expect(row.proposedBy).toBe('an-operator');
    expect(row.domainId).toBe(SOURCE.domainId);
    expect(row.sourceId).toBe(SOURCE.id);
  });

  // NOT NULL is not the same as non-empty, which the column says
  // in as many words: an empty string is a writer that did not say
  // rather than a proposal with no author.
  it('stores a proposal whose author did not say', () => {
    expect(proposalToPendingRow(SOURCE, PROPOSAL, '').proposedBy).toBe('');
  });

  // Both documents cross by reference, unread. Identity is the
  // assertion because equality would also pass over a copy, and a
  // copy is a walk this module must not be taking — the row is
  // meant to carry the exact document that was answered.
  it('carries both documents by reference', () => {
    const row = proposalToPendingRow(SOURCE, MARKED, 'a-model');

    expect(row.parserConfig).toBe(MARKED.parserConfig);
    expect(row.contract).toBe(MARKED.contract);
  });

  // A proposal the engine would refuse is a real proposal and is
  // stored, saying that a model was asked and answered with
  // something unusable. The control beside it is what makes the
  // sentence a reading: the engine really does refuse this one.
  it('stores a proposal the parse engine would refuse', () => {
    const refused: ProposedConfig = {
      parserConfig: 'not a config',
      contract: {},
    };
    const row = proposalToPendingRow(SOURCE, refused, 'a-model');

    expect(parserConfigErrors(refused.parserConfig).length)
      .toBeGreaterThan(0);
    expect(row.parserConfig).toBe(refused.parserConfig);
  });

  // An empty proposal is storable too, and the column says why: it
  // is one an operator should reject rather than one the table
  // should refuse.
  it('stores a proposal holding nothing at all', () => {
    const empty: ProposedConfig = { parserConfig: {}, contract: {} };

    expect(proposalToPendingRow(SOURCE, empty, 'a-model').parserConfig)
      .toBe(empty.parserConfig);
  });
});
