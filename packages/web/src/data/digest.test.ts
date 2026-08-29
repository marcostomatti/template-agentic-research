import type { DomainFieldSpec, DomainFieldType, Entity } from './types';

import { describe, expect, it } from 'vitest';

import { repeated } from '../test-support/repeated';

import {
  DOCUMENTS,
  ENTITIES,
  FINDINGS,
  findFinding,
  getDocument,
  getEntity,
  getFinding,
  listDocuments,
  listEntities,
  listFindings,
  resolveEntity,
} from './digest';
import {
  DEFAULT_DOMAIN_SLUG,
  SPARSE_DOMAIN_SLUG,
  getDomain,
  resolveFieldContract,
  resolveVerdictVocabulary,
} from './domains';
import { FIXTURE_NOW } from './types';

/**
 * Whether a value is what the contract says the field holds.
 *
 * A record rather than a switch so the compiler requires a check per
 * {@link DomainFieldType}: a member added to the union is a missing key
 * here rather than a case that silently falls through to true.
 */
const HOLDS: Record<DomainFieldType, (value: unknown) => boolean> = {
  string: (value) => typeof value === 'string',
  boolean: (value) => typeof value === 'boolean',
  // Finite on purpose: NaN and Infinity are numbers to `typeof` and
  // render as neither a count nor a score.
  number: (value) => typeof value === 'number' && Number.isFinite(value),
  // JSON has no date type, so a datetime is a string an instant can be
  // read out of — the distinction the contract draws it for.
  datetime: (value) => typeof value === 'string'
    && !Number.isNaN(Date.parse(value)),
  list: (value) => Array.isArray(value),
  // An array is an object to `typeof`, and null is too; neither is what
  // a field declared `object` means.
  object: (value) => typeof value === 'object'
    && value !== null
    && !Array.isArray(value),
};

/**
 * Everything wrong with one payload under one contract, as sentences.
 *
 * Returned rather than a boolean so a failure names the finding AND the
 * field, which is the difference between a red test that points at a
 * fixture edit and one that says only that something is off.
 *
 * The three rules are the ones the schema states: a required field must
 * be present, a present field must hold what it says, and a key the
 * contract does not name has no business in the payload — the
 * `findings.fields` docblock in `packages/service/src/db/schema` puts
 * it as the keys coming FROM the contract.
 */
function contractViolations(
  fields: Readonly<Record<string, unknown>>,
  contract: Readonly<Record<string, DomainFieldSpec>>,
): readonly string[] {
  const missing = Object.keys(contract)
    .filter((name) => contract[name]?.required === true)
    .filter((name) => !(name in fields))
    .map((name) => `missing required field: ${name}`);

  const unknown = Object.keys(fields)
    .filter((name) => !(name in contract))
    .map((name) => `field the contract does not name: ${name}`);

  const mistyped = Object.entries(fields)
    .filter(([name, value]) => {
      const spec = contract[name];

      return spec !== undefined && !HOLDS[spec.type](value);
    })
    .map(([name]) => `field of the wrong type: ${name}`);

  return [...missing, ...unknown, ...mistyped];
}

describe('contractViolations', () => {
  // The checker every payload claim below rests on. A checker that
  // returned `[]` whatever it was handed would make all of them pass,
  // so these four cases are what make the rest evidence.

  it('accepts a payload the contract allows', () => {
    // Arrange
    const contract = resolveFieldContract(getDomain(DEFAULT_DOMAIN_SLUG));

    // Act / Assert
    expect(contractViolations({ summary: 'A reading.' }, contract))
      .toEqual([]);
  });

  it('reports a missing required field', () => {
    // Arrange
    const contract = resolveFieldContract(getDomain(DEFAULT_DOMAIN_SLUG));

    // Act
    const violations = contractViolations({ mentions: 2 }, contract);

    // Assert
    expect(violations).toEqual(['missing required field: summary']);
  });

  it('reports a field holding the wrong type', () => {
    // Arrange
    const contract = resolveFieldContract(getDomain(DEFAULT_DOMAIN_SLUG));

    // Act
    const violations = contractViolations(
      { summary: 'A reading.', mentions: 'twelve' },
      contract,
    );

    // Assert
    expect(violations).toEqual(['field of the wrong type: mentions']);
  });

  it('reports a key the contract does not name', () => {
    // Arrange
    const contract = resolveFieldContract(getDomain(DEFAULT_DOMAIN_SLUG));

    // Act
    const violations = contractViolations(
      { summary: 'A reading.', verdictNote: 'invented' },
      contract,
    );

    // Assert
    expect(violations)
      .toEqual(['field the contract does not name: verdictNote']);
  });

  it('separates a list from an object and both from null', () => {
    // The three cases `typeof` cannot tell apart, and the reason HOLDS
    // checks more than it.
    // Arrange
    const contract = resolveFieldContract(getDomain(DEFAULT_DOMAIN_SLUG));
    const payloads = [
      { summary: 'A reading.', tags: { a: 1 } },
      { summary: 'A reading.', links: ['a'] },
      { summary: 'A reading.', links: null },
    ];

    // Act
    const violations = payloads.map(
      (fields) => contractViolations(fields, contract).length,
    );

    // Assert
    expect(violations).toEqual([1, 1, 1]);
  });
});

describe('ENTITIES', () => {
  it('carries rows, including an alias and a subject of its own', () => {
    // Non-emptiness guard for every table-driven claim below, and the
    // stronger one the alias legs need: with no alias row, resolveEntity
    // would be covered by locally built entities alone and the fixture
    // the digest actually renders would go unchecked.
    // Arrange / Act
    const aliases = ENTITIES.filter((entity) => entity.aliasOf !== null);
    const subjects = ENTITIES.filter((entity) => entity.aliasOf === null);

    // Assert
    expect(aliases.length).toBeGreaterThan(0);
    expect(subjects.length).toBeGreaterThan(0);
  });

  it('gives every entity a distinct id', () => {
    // Findings reference an entity by id, so a collision would attach a
    // finding to whichever row the map happened to keep.
    // Arrange / Act
    const ids = ENTITIES.map((entity) => entity.id);

    // Assert
    expect(repeated(ids)).toEqual([]);
  });

  it('gives every entity a distinct normalized name', () => {
    // `entities.name_norm` is unique within a domain: it is the key a
    // subject is resolved by, so two rows sharing one would be two rows
    // for one subject — the thing the table exists to prevent.
    // Arrange / Act
    const norms = ENTITIES.map((entity) => entity.nameNorm);

    // Assert
    expect(repeated(norms)).toEqual([]);
  });

  it('never leaves a normalized name empty', () => {
    // A blank key would collapse every unnameable subject onto one row.
    // Arrange / Act
    const blank = ENTITIES.filter((entity) => entity.nameNorm === '');

    // Assert
    expect(blank).toEqual([]);
  });

  it('points every alias at a fixture entity in the same domain', () => {
    // A dangling alias makes resolveEntity throw where a page renders,
    // and a cross-domain one would show another domain's subject.
    // Arrange / Act
    const dangling = ENTITIES.filter((entity) => {
      if (entity.aliasOf === null) {
        return false;
      }

      const target = ENTITIES.find((other) => other.id === entity.aliasOf);

      return target === undefined || target.domainId !== entity.domainId;
    });

    // Assert
    expect(dangling).toEqual([]);
  });

  it('belongs entirely to the seeded domain', () => {
    // The sparse domain is the shell's route to its empty states, so
    // rows leaking into it would fill a page that is meant to be bare.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const strays = ENTITIES.filter((entity) => entity.domainId !== seededId);

    // Assert
    expect(strays).toEqual([]);
  });
});

describe('DOCUMENTS', () => {
  it('carries rows', () => {
    // Guard: every claim below maps or filters over the table.
    // Arrange / Act / Assert
    expect(DOCUMENTS.length).toBeGreaterThan(0);
  });

  it('gives every document a distinct id', () => {
    // Arrange / Act
    const ids = DOCUMENTS.map((document) => document.id);

    // Assert
    expect(repeated(ids)).toEqual([]);
  });

  it('gives every document a distinct hash', () => {
    // `documents.hash` is UNIQUE and is what one row per distinct item
    // stands on, so two fixtures sharing one is a contradiction rather
    // than a duplicate — the same capture would have landed on one row.
    // Arrange / Act
    const hashes = DOCUMENTS.map((document) => document.hash);

    // Assert
    expect(repeated(hashes)).toEqual([]);
  });

  it('writes an absent URL as null and never as an empty string', () => {
    // `''` is a value: a link cell handed one renders a link to nowhere,
    // where null is a cell that knows to render no link at all.
    // Arrange / Act
    const blank = DOCUMENTS.filter((document) => document.url === '');

    // Assert
    expect(blank).toEqual([]);
  });

  it('carries a parse error exactly where the parse failed', () => {
    // The pairing is the whole of fail-flag-keep: a failed document is
    // kept WITH its error, and one that parsed has nothing to explain.
    // Arrange / Act
    const mismatched = DOCUMENTS.filter(
      (document) => (document.parseStatus === 'failed')
        !== (document.parseError !== null),
    );

    // Assert
    expect(mismatched).toEqual([]);
  });

  it('never leaves a parse error empty', () => {
    // Arrange / Act
    const blank = DOCUMENTS.filter((document) => document.parseError === '');

    // Assert
    expect(blank).toEqual([]);
  });

  it('carries both parse statuses', () => {
    // The digest badge renders one tone per status, so a set missing
    // either leaves a tone nothing exercises — and the failed half is
    // what proves the pipeline keeps what it could not read.
    // Arrange / Act
    const statuses = DOCUMENTS.map((document) => document.parseStatus);

    // Assert
    expect(statuses).toContain('ok');
    expect(statuses).toContain('failed');
  });

  it('carries a document with neither a source nor a URL', () => {
    // Both NULLs at once: a document added by hand rather than fetched.
    // A source cell and a link cell each meet the absent case in the
    // running demo rather than only in this file.
    // Arrange / Act
    const unsourced = DOCUMENTS.filter(
      (document) => document.sourceId === null && document.url === null,
    );

    // Assert
    expect(unsourced.length).toBeGreaterThan(0);
  });

  it('captures every document at or before the reference clock', () => {
    // Fixtures are dated against FIXTURE_NOW so a relative-time render
    // is a property of the data; a later stamp renders as the future.
    // Compared as strings: every stamp is ISO-8601, UTC and fixed-width,
    // so lexical order is chronological order.
    // Arrange / Act
    const future = DOCUMENTS.filter(
      (document) => !(document.capturedAt <= FIXTURE_NOW),
    );

    // Assert
    expect(future).toEqual([]);
  });

  it('belongs entirely to the seeded domain', () => {
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const strays = DOCUMENTS.filter(
      (document) => document.domainId !== seededId,
    );

    // Assert
    expect(strays).toEqual([]);
  });
});

describe('FINDINGS', () => {
  it('carries rows', () => {
    // Guard: every claim below maps or filters over the table.
    // Arrange / Act / Assert
    expect(FINDINGS.length).toBeGreaterThan(0);
  });

  it('gives every finding a distinct id', () => {
    // The digest modal sub-route carries one, so a collision would open
    // the wrong finding from a link that looks right.
    // Arrange / Act
    const ids = FINDINGS.map((finding) => finding.id);

    // Assert
    expect(repeated(ids)).toEqual([]);
  });

  it('reads every finding out of a fixture document of its own domain', () => {
    // A finding is a reading OF something, and the digest cites the
    // document beside the verdict. A dangling reference throws in
    // getDocument where the page renders; a cross-domain one would cite
    // another domain's material.
    // Arrange / Act
    const orphans = FINDINGS.filter((finding) => {
      const document = DOCUMENTS.find(
        (candidate) => candidate.id === finding.documentId,
      );

      return document === undefined || document.domainId !== finding.domainId;
    });

    // Assert
    expect(orphans).toEqual([]);
  });

  it('names a fixture entity wherever it names one at all', () => {
    // Arrange / Act
    const dangling = FINDINGS.filter((finding) => {
      if (finding.entityId === null) {
        return false;
      }

      return !ENTITIES.some((entity) => entity.id === finding.entityId);
    });

    // Assert
    expect(dangling).toEqual([]);
  });

  it('carries a finding about no entity at all', () => {
    // The nullable column: a reading about something the domain does not
    // track by name. A title cell reaching for an entity has to survive
    // it in the running demo.
    // Arrange / Act
    const unattributed = FINDINGS.filter(
      (finding) => finding.entityId === null,
    );

    // Assert
    expect(unattributed.length).toBeGreaterThan(0);
  });

  it('moves score and score version together', () => {
    // They record one absence between them: never scored. A score with
    // no version, or a version with no score, would be a half state the
    // schema does not describe.
    // Arrange / Act
    const split = FINDINGS.filter(
      (finding) => (finding.score === null) !== (finding.scoreVersion === null),
    );

    // Assert
    expect(split).toEqual([]);
  });

  it('carries a score of zero and a score of null on separate rows', () => {
    // The pair `types.ts` keeps distinguishable: read and matched
    // nothing, versus never scored. A set carrying only one of them lets
    // a falsy check in a score cell pass for the wrong reason.
    // Arrange / Act
    const zero = FINDINGS.filter((finding) => finding.score === 0);
    const unscored = FINDINGS.filter((finding) => finding.score === null);

    // Assert
    expect(zero.length).toBeGreaterThan(0);
    expect(unscored.length).toBeGreaterThan(0);
  });

  it('labels every finding from its domain vocabulary, or not at all', () => {
    // The verdict is per-domain and the column carries no CHECK, so this
    // is the only place a fixture verdict outside the ladder would be
    // caught — and the digest filter, which renders the ladder, would
    // otherwise have an option that selects a row it cannot show.
    // Arrange
    const seeded = getDomain(DEFAULT_DOMAIN_SLUG);
    const vocabulary = resolveVerdictVocabulary(seeded);

    // Act
    const offLadder = FINDINGS.filter(
      (finding) => finding.verdict !== null
        && !vocabulary.includes(finding.verdict),
    );

    // Assert
    expect(offLadder).toEqual([]);
  });

  it('exercises every verdict on the ladder, plus none at all', () => {
    // The spread the digest filter needs: a verdict no fixture carries
    // is a filter option that selects nothing, and the null is the state
    // an operator opens the digest to clear.
    // Arrange
    const seeded = getDomain(DEFAULT_DOMAIN_SLUG);
    const vocabulary = resolveVerdictVocabulary(seeded);
    const used = FINDINGS.map((finding) => finding.verdict);

    // Act
    const unused = vocabulary.filter((verdict) => !used.includes(verdict));

    // Assert
    expect(unused).toEqual([]);
    expect(used).toContain(null);
  });

  it('makes every finding after its document was captured', () => {
    // A reading cannot precede the capture it was read from, and the
    // digest shows both stamps.
    // Arrange / Act
    const backwards = FINDINGS.filter((finding) => {
      const document = getDocument(finding.documentId);

      return !(document.capturedAt <= finding.createdAt);
    });

    // Assert
    expect(backwards).toEqual([]);
  });

  it('makes every finding at or before the reference clock', () => {
    // Arrange / Act
    const future = FINDINGS.filter(
      (finding) => !(finding.createdAt <= FIXTURE_NOW),
    );

    // Assert
    expect(future).toEqual([]);
  });

  it('carries a finding read out of a document whose parse failed', () => {
    // The degraded row: the contract fields the source promises were
    // absent, so the document is flagged, but the text was readable and
    // a finding was made. Without it the digest could never show a
    // failed status on a row it also has a verdict for.
    // Arrange / Act
    const degraded = FINDINGS.filter(
      (finding) => getDocument(finding.documentId).parseStatus === 'failed',
    );

    // Assert
    expect(degraded.length).toBeGreaterThan(0);
  });

  it('leaves a failed document with no finding at all', () => {
    // The other half of fail-flag-keep: nothing usable came back, the
    // document is kept as evidence, and no finding was invented for it.
    // An accessor producing one row per document would fail here.
    // Arrange
    const failed = DOCUMENTS.filter(
      (document) => document.parseStatus === 'failed',
    );

    // Act
    const unread = failed.filter(
      (document) => !FINDINGS.some(
        (finding) => finding.documentId === document.id,
      ),
    );

    // Assert
    expect(unread.length).toBeGreaterThan(0);
  });

  it('belongs entirely to the seeded domain', () => {
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const strays = FINDINGS.filter((finding) => finding.domainId !== seededId);

    // Assert
    expect(strays).toEqual([]);
  });
});

describe('the field contract every payload is held to', () => {
  it('constrains something, and requires at least one field', () => {
    // Guard for the claims below: an empty contract, or one requiring
    // nothing, would let every payload satisfy it — including `{}`.
    // Arrange
    const contract = resolveFieldContract(getDomain(DEFAULT_DOMAIN_SLUG));

    // Act
    const required = Object.keys(contract)
      .filter((name) => contract[name]?.required === true);

    // Assert
    expect(Object.keys(contract).length).toBeGreaterThan(0);
    expect(required.length).toBeGreaterThan(0);
  });

  it('is satisfied by every finding payload', () => {
    // The join this module has in place of a seed file: documents and
    // findings are pipeline output, so there is nothing to transcribe
    // them from, and the contract the domain declares is what holds
    // them. Reported per finding so a failure names the row and field.
    // Arrange
    const contract = resolveFieldContract(getDomain(DEFAULT_DOMAIN_SLUG));

    // Act
    const offending = FINDINGS
      .map((finding) => ({
        id: finding.id,
        violations: contractViolations(finding.fields, contract),
      }))
      .filter((entry) => entry.violations.length > 0);

    // Assert
    expect(offending).toEqual([]);
  });

  it('is met by a payload carrying the required field alone', () => {
    // The sparsest payload the contract admits, and what a cell reading
    // an optional field has to survive.
    // Arrange
    const contract = resolveFieldContract(getDomain(DEFAULT_DOMAIN_SLUG));
    const required = Object.keys(contract)
      .filter((name) => contract[name]?.required === true);

    // Act
    const minimal = FINDINGS.filter(
      (finding) => Object.keys(finding.fields).length === required.length,
    );

    // Assert
    expect(minimal.length).toBeGreaterThan(0);
  });

  it('is met by a payload carrying every field it names', () => {
    // The other end of the range: a row where every optional cell has
    // something to render.
    // Arrange
    const contract = resolveFieldContract(getDomain(DEFAULT_DOMAIN_SLUG));
    const names = Object.keys(contract);

    // Act
    const complete = FINDINGS.filter(
      (finding) => names.every((name) => name in finding.fields),
    );

    // Assert
    expect(complete.length).toBeGreaterThan(0);
  });
});

describe('listDocuments', () => {
  it('returns every document of the seeded domain', () => {
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const listed = listDocuments(seededId);

    // Assert
    expect(listed.map((document) => document.id).sort())
      .toEqual(DOCUMENTS.map((document) => document.id).sort());
  });

  it('returns the most recently captured document first', () => {
    // The digest is a list of the latest material, so the order is part
    // of what the accessor means and the q15 endpoint has to answer in.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const captured = listDocuments(seededId)
      .map((document) => document.capturedAt);

    // Assert
    expect(captured).toEqual([...captured].sort().reverse());
  });

  it('returns nothing for the sparse domain', () => {
    // Not an error: the empty digest is a state the demo reaches by
    // switching domain rather than by emptying a table.
    // Arrange
    const sparseId = getDomain(SPARSE_DOMAIN_SLUG).id;

    // Act / Assert
    expect(listDocuments(sparseId)).toEqual([]);
  });

  it('returns nothing for a domain id nothing carries', () => {
    // Arrange / Act / Assert
    expect(listDocuments(-1)).toEqual([]);
  });

  it('leaves the stored table in its own order', () => {
    // The accessor sorts, and it sorts a filtered COPY. Sorting DOCUMENTS
    // itself would reorder the fixture for every later reader in the
    // same process, which is the kind of shared-state bug a fixture
    // layer should not be able to have.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;
    const before = DOCUMENTS.map((document) => document.id);

    // Act
    listDocuments(seededId);

    // Assert
    expect(DOCUMENTS.map((document) => document.id)).toEqual(before);
  });
});

describe('listFindings', () => {
  it('returns every finding of the seeded domain', () => {
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const listed = listFindings(seededId);

    // Assert
    expect(listed.map((finding) => finding.id).sort())
      .toEqual(FINDINGS.map((finding) => finding.id).sort());
  });

  it('returns the most recently made finding first', () => {
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const created = listFindings(seededId).map((finding) => finding.createdAt);

    // Assert
    expect(created).toEqual([...created].sort().reverse());
  });

  it('returns nothing for the sparse domain', () => {
    // Arrange
    const sparseId = getDomain(SPARSE_DOMAIN_SLUG).id;

    // Act / Assert
    expect(listFindings(sparseId)).toEqual([]);
  });

  it('leaves the stored table in its own order', () => {
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;
    const before = FINDINGS.map((finding) => finding.id);

    // Act
    listFindings(seededId);

    // Assert
    expect(FINDINGS.map((finding) => finding.id)).toEqual(before);
  });
});

describe('listEntities', () => {
  it('returns every entity of the seeded domain', () => {
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const listed = listEntities(seededId);

    // Assert
    expect(listed.map((entity) => entity.id))
      .toEqual(ENTITIES.map((entity) => entity.id));
  });

  it('includes the alias rows, which a resolver needs to follow', () => {
    // The reason this lists rather than filters: a caller resolving a
    // finding's entity needs the row an alias POINTS AT and the alias
    // itself, so dropping either half would answer the wrong subject.
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;

    // Act
    const listed = listEntities(seededId);

    // Assert
    expect(listed.filter((entity) => entity.aliasOf !== null))
      .not.toHaveLength(0);
  });

  it('returns nothing for the sparse domain', () => {
    // Arrange
    const sparseId = getDomain(SPARSE_DOMAIN_SLUG).id;

    // Act / Assert
    expect(listEntities(sparseId)).toEqual([]);
  });

  it('never hands back the stored table', () => {
    // Arrange
    const seededId = getDomain(DEFAULT_DOMAIN_SLUG).id;
    const before = ENTITIES.map((entity) => entity.id);

    // Act — the cast is the point: `readonly` is a compile-time claim
    // a consumer can drop, and the fresh array is what answers the one
    // that did.
    (listEntities(seededId) as Entity[]).reverse();

    // Assert
    expect(ENTITIES.map((entity) => entity.id)).toEqual(before);
  });
});

describe('getDocument', () => {
  it('returns each fixture document by its id', () => {
    // Arrange / Act
    const found = DOCUMENTS.map((document) => getDocument(document.id));

    // Assert
    expect(found).toEqual([...DOCUMENTS]);
  });

  it('throws on an id no fixture carries', () => {
    // A document id reaches this accessor from a finding, never from a
    // URL, so a miss is a broken fixture and the message names the id.
    // Arrange / Act / Assert
    expect(() => getDocument(9999)).toThrow(/unknown document/i);
    expect(() => getDocument(9999)).toThrow(/9999/);
  });
});

describe('findFinding', () => {
  it('returns each fixture finding by its id', () => {
    // Arrange / Act
    const found = FINDINGS.map((finding) => findFinding(finding.id));

    // Assert
    expect(found).toEqual([...FINDINGS]);
  });

  it('returns undefined for an id no fixture carries', () => {
    // The tolerant half: a finding id DOES arrive from the URL, so a
    // stale link is an ordinary outcome the page answers with a
    // not-found state rather than a throw.
    // Arrange / Act / Assert
    expect(findFinding(9999)).toBeUndefined();
  });
});

describe('getFinding', () => {
  it('returns each fixture finding by its id', () => {
    // Arrange / Act
    const found = FINDINGS.map((finding) => getFinding(finding.id));

    // Assert
    expect(found).toEqual([...FINDINGS]);
  });

  it('throws on an id no fixture carries', () => {
    // Arrange / Act / Assert
    expect(() => getFinding(9999)).toThrow(/unknown finding/i);
    expect(() => getFinding(9999)).toThrow(/9999/);
  });
});

describe('getEntity', () => {
  it('returns each fixture entity by its id', () => {
    // Arrange / Act
    const found = ENTITIES.map((entity) => getEntity(entity.id));

    // Assert
    expect(found).toEqual([...ENTITIES]);
  });

  it('throws on an id no fixture carries', () => {
    // Arrange / Act / Assert
    expect(() => getEntity(9999)).toThrow(/unknown entity/i);
    expect(() => getEntity(9999)).toThrow(/9999/);
  });
});

describe('resolveEntity', () => {
  it('returns a subject of its own unchanged', () => {
    // Arrange
    const subjects = ENTITIES.filter((entity) => entity.aliasOf === null);

    // Act
    const resolved = subjects.map((entity) => resolveEntity(entity));

    // Assert
    expect(resolved).toEqual(subjects);
  });

  it('resolves every fixture alias to the row it stands for', () => {
    // The digest renders a subject once however many names it has been
    // met under, which is what the alias column is for.
    // Arrange
    const aliases = ENTITIES.filter((entity) => entity.aliasOf !== null);

    // Act
    const resolved = aliases.map((entity) => resolveEntity(entity).id);

    // Assert
    expect(resolved).toEqual(aliases.map((entity) => entity.aliasOf));
  });

  it('resolves an alias to a row that is not the alias itself', () => {
    // The claim above compares against the same column the resolver
    // reads, so it would hold for an alias pointing at itself. This is
    // the case that would not.
    // Arrange
    const aliases = ENTITIES.filter((entity) => entity.aliasOf !== null);

    // Act
    const selfReferential = aliases.filter(
      (entity) => resolveEntity(entity).id === entity.id,
    );

    // Assert
    expect(selfReferential).toEqual([]);
  });

  it('follows one hop and no more', () => {
    // A deliberate limit rather than an omission: chains are not
    // followed, so a cycle cannot hang a render. Built here because the
    // fixtures carry no alias of an alias — and should not, since the
    // schema retires a subject onto its replacement, not onto another
    // alias.
    // Arrange
    const alias = ENTITIES.find((entity) => entity.aliasOf !== null);
    const chained = {
      id: 99,
      domainId: getDomain(DEFAULT_DOMAIN_SLUG).id,
      name: 'Example Chained Alias',
      nameNorm: 'example chained alias',
      aliasOf: alias?.id ?? null,
      attributes: {},
    };

    // Act
    const resolved = resolveEntity(chained);

    // Assert
    expect(resolved).toEqual(alias);
  });

  it('throws when an alias names an entity nothing carries', () => {
    // Built rather than found: the fixtures have no dangling alias, and
    // the table test above is what keeps it that way. This pins what
    // happens if one ever appears — a named throw, not a silent row.
    // Arrange
    const dangling = {
      id: 98,
      domainId: getDomain(DEFAULT_DOMAIN_SLUG).id,
      name: 'Example Dangling Alias',
      nameNorm: 'example dangling alias',
      aliasOf: 9999,
      attributes: {},
    };

    // Act / Assert
    expect(() => resolveEntity(dangling)).toThrow(/unknown entity/i);
  });
});
