import type { ConnectionFault, ConnectionTestOutcome } from './connectionTest';
import type { Connector, ConnectorKind } from '../../data/types';

import { describe, expect, it } from 'vitest';

import { listConnectors } from '../../data/connectors';

import { CONNECTOR_KIND_FACETS } from './cards';
import {
  REACHED_SENTENCE,
  connectionFaultSentence,
  testConnection,
} from './connectionTest';
import { connectorFields } from './editor';

/**
 * The kinds this surface names, read off `./cards.ts`.
 *
 * That table is total over `ConnectorKind` by declaration, so driving
 * the cases below off it covers the union rather than a list this
 * file remembered.
 */
const EVERY_KIND: readonly ConnectorKind[] = CONNECTOR_KIND_FACETS
  .map((facet) => facet.kind);

/**
 * Every refusal the module can name.
 *
 * TypeScript checks each member is in the union and nothing checks
 * that all of them are here, so the completeness reading is the
 * coverage case below: every fault a real config reaches has to be a
 * member, and the set of them has to be this list less the one arm no
 * connector can be in. The sentence side is guarded differently —
 * the module holds a `Readonly<Record<ConnectionFault, ...>>`, so a
 * member added upstream with no sentence is a `check-types` error.
 */
const EVERY_FAULT: readonly ConnectionFault[] = [
  'address-undeclared',
  'address-missing',
  'address-unreadable',
  'scheme-unsupported',
  'host-reserved',
  'path-relative',
];

/** The arm no connector can be in; see {@link EVERY_FAULT}. */
const UNREACHABLE_FAULT: ConnectionFault = 'address-undeclared';

/**
 * A token planted in a field so the leak sweep has a needle.
 *
 * No hyphen and no space: the sweep looks for it whole, and a token
 * something might quote in pieces would let a partial echo pass.
 */
const SENTINEL = 'SNTNL9';

/** The seeded model endpoint, which is documentation-reserved. */
const RESERVED_ADDRESS = 'https://api.example.com/v1/messages';

/** An address under a name nothing reserves. */
const DIALLABLE_ADDRESS = 'https://models.internal.corp/v1/messages';

/** The address a model runner actually answers on in development. */
const LOOPBACK_ADDRESS = 'http://localhost:11434/api/chat';

/** A filesystem destination of the shape the service writes. */
const ABSOLUTE_PATH = '/srv/exports/example-tech-radar/notes';

/**
 * The config key one kind is reached at.
 *
 * Read off the same field table the module reads, so a case cannot
 * drive a key the module does not look under and pass for having
 * found nothing there.
 *
 * @param kind - The connector kind.
 * @returns Its address key.
 * @throws If the table declares none, which is the wiring fault the
 * module keeps its `address-undeclared` arm for.
 */
function addressKeyOf(kind: ConnectorKind): string {
  const field = connectorFields(kind).find(
    (candidate) => candidate.role === 'address',
  );

  if (field === undefined) {
    throw new Error(`Expected an address field for ${kind}, and the `
      + 'table declared none.');
  }

  return field.key;
}

/**
 * A config carrying the address of one kind and nothing else.
 *
 * @param kind - The connector kind.
 * @param value - Whatever the address field holds.
 * @returns The payload.
 */
function addressed(
  kind: ConnectorKind,
  value: unknown,
): Connector['config'] {
  return { [addressKeyOf(kind)]: value };
}

/**
 * Which refusal an outcome carries, or `undefined` where it reached.
 *
 * @param outcome - Whatever the module answered.
 * @returns Its fault, or `undefined`.
 */
function faultOf(outcome: ConnectionTestOutcome): ConnectionFault | undefined {
  return outcome.reached
    ? undefined
    : outcome.fault;
}

/**
 * The fault one config reads as.
 *
 * @param kind - The connector kind.
 * @param value - Whatever the address field holds.
 * @returns The fault, or `undefined` where the reading reached.
 */
function faultFor(
  kind: ConnectorKind,
  value: unknown,
): ConnectionFault | undefined {
  return faultOf(testConnection(kind, addressed(kind, value)));
}

/**
 * Which of these sentences carry the planted token.
 *
 * A builder cannot see its own echo, so the sentences are re-read
 * here rather than trusted. The sweep drives this over a producer
 * that genuinely leaks in the same case, which is what says the
 * reader would have found one.
 *
 * @param sentences - Whatever was produced.
 * @returns The members quoting the token.
 */
function leaking(sentences: readonly string[]): string[] {
  return sentences.filter((sentence) => sentence.includes(SENTINEL));
}

/** One address the module has to refuse, and why. */
interface RefusalCase {
  /** Which kind reads it. */
  readonly kind: ConnectorKind;
  /** What its address field holds. */
  readonly value: unknown;
  /** The refusal it must read as. */
  readonly fault: ConnectionFault;
}

/**
 * One representative per reachable refusal, with the token planted in
 * a part of the value a sentence might quote.
 *
 * The token rides the PATH of every address rather than the host: the
 * URL parser lowercases a host, so a leak through `hostname` would
 * arrive respelled and a reader looking for the token whole would
 * miss it. `address-missing` is absent by construction — there is
 * nothing held for a sentence to quote.
 */
const PLANTED_REFUSALS: readonly RefusalCase[] = [
  {
    kind: 'llm',
    value: `${SENTINEL} not an address`,
    fault: 'address-unreadable',
  },
  {
    kind: 'llm',
    value: `ftp://models.internal/${SENTINEL}`,
    fault: 'scheme-unsupported',
  },
  {
    kind: 'llm',
    value: `https://api.example.com/${SENTINEL}`,
    fault: 'host-reserved',
  },
  {
    kind: 'export_target',
    value: `srv/${SENTINEL}/notes`,
    fault: 'path-relative',
  },
];

describe('testConnection refusals', () => {
  it('leaves the undeclared arm unreachable', () => {
    // The module keeps that arm so it stays total rather than because
    // a connector could be in it. This is the reading that says so
    // against the field table as shipped, driven over the whole union
    // rather than over the kind this file happened to pick.
    // Arrange / Act
    const faults = EVERY_KIND.map((kind) => faultOf(testConnection(kind, {})));

    // Assert
    expect(faults.filter((fault) => fault === UNREACHABLE_FAULT)).toEqual([]);
    expect(EVERY_KIND.length).toBeGreaterThan(1);
  });

  it('refuses a kind whose address key is absent', () => {
    // Every kind, because a branch reading an address for one kind
    // and nothing for another answers this correctly for the one it
    // was written against.
    // Arrange / Act
    const faults = EVERY_KIND.map((kind) => faultOf(testConnection(kind, {})));

    // Assert
    expect(faults).toEqual(EVERY_KIND.map(() => 'address-missing'));
  });

  it('reads a field of whitespace as holding nothing', () => {
    // A cleared control writes no key at all through
    // `withConnectorField`, but a payload arriving from anywhere else
    // is free to carry one, and a blank address names nowhere exactly
    // as an absent one does.
    // Arrange / Act / Assert
    expect(faultFor('llm', '   ')).toBe('address-missing');
    expect(faultFor('llm', '')).toBe('address-missing');
    expect(faultFor('export_target', ' ')).toBe('address-missing');
  });

  it('refuses an address stored as something other than text', () => {
    // `connectors.config` is an open payload, so a number under the
    // address key is a shape the column allows and this shell draws
    // no control for. Both address shapes go through the one guard.
    // Arrange / Act / Assert
    expect(faultFor('llm', 20)).toBe('address-unreadable');
    expect(faultFor('export_target', 20)).toBe('address-unreadable');
    expect(faultFor('notebook', null)).toBe('address-unreadable');
  });

  it('refuses text that does not read as an address', () => {
    // A host with no scheme is the shape an operator most often
    // types, and it parses as nothing at all rather than as an
    // address with a piece missing.
    // Arrange / Act / Assert
    expect(faultFor('llm', 'api.internal.corp/v1')).toBe('address-unreadable');
    expect(faultFor('search', '//search.internal/v1'))
      .toBe('address-unreadable');
    expect(faultFor('notebook', 'notebook')).toBe('address-unreadable');
  });

  it('refuses a scheme this deployment does not speak', () => {
    // It parses, it names a host, and nothing here would open it.
    // Arrange / Act / Assert
    expect(faultFor('llm', 'ftp://models.internal/v1'))
      .toBe('scheme-unsupported');
    expect(faultFor('notebook', 'file:///srv/notebooks'))
      .toBe('scheme-unsupported');
  });

  it('refuses a host set aside for documentation', () => {
    // The reading that gives this surface a failure to show: every
    // seeded network address is under a reserved name on purpose, so
    // the demo has both answers in it.
    // Arrange / Act / Assert
    expect(faultFor('llm', RESERVED_ADDRESS)).toBe('host-reserved');
    expect(faultFor('search', 'https://example.net/v1/query'))
      .toBe('host-reserved');
    expect(faultFor('notebook', 'https://deep.sub.example.org/'))
      .toBe('host-reserved');
  });

  it('refuses the reserved top-level names too', () => {
    // RFC 2606 sets aside three second-level names and three
    // top-level ones, and a reading that covered only the first three
    // would pass an address nothing can resolve.
    // Arrange / Act / Assert
    expect(faultFor('llm', 'https://models.example/v1')).toBe('host-reserved');
    expect(faultFor('llm', 'https://gateway.invalid/v1'))
      .toBe('host-reserved');
    expect(faultFor('llm', 'https://box.test/v1')).toBe('host-reserved');
  });

  it('refuses a reserved host however it is spelled', () => {
    // The URL parser lowercases the host of an http address, which is
    // what lets the reserved reading compare without folding case
    // itself. Driven rather than left a subtlety two readers have to
    // agree about.
    // Arrange / Act / Assert
    expect(faultFor('llm', 'https://API.EXAMPLE.COM/v1'))
      .toBe('host-reserved');
  });

  it('leaves a host that merely looks like a reserved one alone', () => {
    // The dotted comparison is what keeps a suffix match from
    // swallowing an ordinary name, and nothing else in the module
    // would report it.
    // Arrange / Act / Assert
    const nearMisses = [
      'https://notexample.com/v1',
      'https://example.company/v1',
    ];

    // Act
    const faults = nearMisses.map((address) => faultFor('llm', address));

    // Assert
    expect(faults).toEqual([undefined, undefined]);
  });

  it('refuses a destination that is not an absolute path', () => {
    // Where a relative destination writes depends on which directory
    // the service was started in, which is the one thing a stored
    // path must not leave open. A URL under a path-shaped address
    // fails the same reading, since it starts with a scheme.
    // Arrange / Act / Assert
    expect(faultFor('export_target', 'srv/exports/notes'))
      .toBe('path-relative');
    expect(faultFor('export_target', './notes')).toBe('path-relative');
    expect(faultFor('export_target', 'https://example.org/feed.xml'))
      .toBe('path-relative');
  });

  it('carries exactly one sentence, and it is the one the fault names', () => {
    // A refusal is one sentence rather than a list, and the sentence
    // has to be about the field the reading was taken on: a reading
    // that named a sibling key would send an operator to the wrong
    // control with every gate green.
    // Arrange
    const cases = PLANTED_REFUSALS.map((entry) => ({
      entry,
      outcome: testConnection(entry.kind, addressed(entry.kind, entry.value)),
    }));

    // Act
    const mismatched = cases.filter(({ entry, outcome }) => outcome.reached
      || outcome.sentence !== connectionFaultSentence(
        entry.fault,
        addressKeyOf(entry.kind),
      ));

    // Assert
    expect(mismatched).toEqual([]);
    expect(cases.map(({ outcome }) => faultOf(outcome)))
      .toEqual(PLANTED_REFUSALS.map((entry) => entry.fault));
  });

  it('names the field it read and not a sibling kind field', () => {
    // The one input-derived thing a sentence carries. `path` is left
    // out of the sibling check on purpose: it is also an ordinary
    // word in the sentence about a relative destination, so a
    // containment reading over it would pass on the prose.
    // Arrange
    const endpointKey = addressKeyOf('llm');
    const notebookKey = addressKeyOf('notebook');

    // Act
    const outcome = testConnection('llm', addressed('llm', RESERVED_ADDRESS));

    // Assert
    expect(outcome.sentence).toContain(endpointKey);
    expect(outcome.sentence).not.toContain(notebookKey);
    expect(endpointKey).not.toBe(notebookKey);
  });

  it('says nothing about what the field holds', () => {
    // A refusal an operator reads goes into the DOM, into a
    // screenshot and into whatever is pasted into a support thread,
    // and on this surface one of the values a sentence might quote is
    // a credential. The reader is driven over a producer that
    // genuinely leaks in the same case, so a green sweep is a reading
    // rather than a blind one.
    // Arrange / Act
    const sentences = PLANTED_REFUSALS.map(
      (entry) => testConnection(entry.kind, addressed(entry.kind, entry.value))
        .sentence,
    );

    // Assert
    expect(sentences).toHaveLength(PLANTED_REFUSALS.length);
    expect(leaking(sentences)).toEqual([]);
    // The control: the same reader over a sentence that does quote
    // the value finds it, so the empty answer above is a measurement.
    expect(leaking([`The endpoint ${SENTINEL} is unreachable.`]))
      .toHaveLength(1);
  });
});

describe('testConnection successes', () => {
  it('reaches an address under a name nothing reserves', () => {
    // Arrange / Act
    const outcome = testConnection('llm', addressed('llm', DIALLABLE_ADDRESS));

    // Assert
    expect(outcome.reached).toBe(true);
    expect(outcome.sentence).toBe(REACHED_SENTENCE);
  });

  it('reaches a loopback address', () => {
    // The deliberate narrowing: a model runner or a workflow engine
    // sits on loopback during development, so refusing it would
    // report the address most likely to answer as the one that
    // cannot.
    // Arrange / Act / Assert
    expect(testConnection('llm', addressed('llm', LOOPBACK_ADDRESS)).reached)
      .toBe(true);
    expect(testConnection('llm', addressed('llm', 'http://127.0.0.1:8080/v1'))
      .reached).toBe(true);
  });

  it('reaches an absolute filesystem destination', () => {
    // Arrange / Act
    const outcome = testConnection(
      'export_target',
      addressed('export_target', ABSOLUTE_PATH),
    );

    // Assert
    expect(outcome.reached).toBe(true);
    expect(outcome.sentence).toBe(REACHED_SENTENCE);
  });

  it('reads no secret, so a row with none stored still reaches', () => {
    // `openConnectorDraft` takes every write-only value out before an
    // editor holds the row, so a draft carries no credential unless
    // one has just been typed. A reading that refused for a missing
    // one would refuse every connector nobody had retyped.
    // Arrange
    const secrets = connectorFields('llm').filter(
      (field) => field.role === 'secret',
    );

    // Act
    const outcome = testConnection('llm', addressed('llm', DIALLABLE_ADDRESS));

    // Assert
    expect(outcome.reached).toBe(true);
    // The vacuity guard: the kind under test has to declare a secret
    // for its absence to mean anything.
    expect(secrets.length).toBeGreaterThan(0);
  });

  it('reads no setting beside the address', () => {
    // The seeded `static-feed` target is this shape: its `publicUrl`
    // names a reserved host and says where the written file is served
    // from, while the address says where the file is written.
    // Arrange
    const config: Connector['config'] = {
      path: ABSOLUTE_PATH,
      publicUrl: 'https://example.org/example-tech-radar/feed.xml',
    };

    // Act / Assert
    expect(testConnection('export_target', config).reached).toBe(true);
  });

  it('answers a fresh outcome per call', () => {
    // The modal holds the last outcome in state and raises a toast
    // from it, so a shared record would make a second press set state
    // to the identical reference, skip the render and leave the
    // operator looking at nothing.
    // Arrange
    const config = addressed('llm', DIALLABLE_ADDRESS);

    // Act
    const first = testConnection('llm', config);
    const second = testConnection('llm', config);

    // Assert
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
    // The refusing arm answers fresh for the same reason.
    expect(testConnection('llm', {})).not.toBe(testConnection('llm', {}));
  });
});

describe('testConnection over the shipped connectors', () => {
  it('leaves the seeded rows on both sides of the reading', () => {
    // The property the demo rests on, pinned against the fixtures
    // rather than assumed: a surface whose failure nothing reaches
    // has a toast with no subject, and one whose success nothing
    // reaches has a footer nobody sees.
    // Arrange
    const read = listConnectors().map((connector) => ({
      name: connector.name,
      outcome: testConnection(connector.kind, connector.config),
    }));

    // Act
    const reached = read.filter((row) => row.outcome.reached);
    const refused = read.filter((row) => !row.outcome.reached);

    // Assert
    expect(reached.map((row) => row.name))
      .toEqual(['notes-directory', 'static-feed']);
    expect(refused.map((row) => row.name))
      .toEqual(['primary', 'long-context', 'web', 'research', 'mail-drafts']);
  });

  it('refuses the seeded network rows as reserved', () => {
    // Which refusal each row is in, rather than a count: the four
    // network connectors are addressed under reserved names on
    // purpose, and the unconfigured export target names nowhere at
    // all.
    // Arrange / Act
    const faults = listConnectors()
      .map((connector) => faultOf(
        testConnection(connector.kind, connector.config),
      ))
      .filter((fault) => fault !== undefined);

    // Assert
    expect(faults).toEqual([
      'host-reserved',
      'host-reserved',
      'host-reserved',
      'host-reserved',
      'address-missing',
    ]);
  });
});

describe('connectionFaultSentence', () => {
  it('reaches every fault but the undeclared arm from a real config', () => {
    // What makes {@link EVERY_FAULT} more than a list this file
    // remembered: each member below is reached by driving a payload
    // rather than by naming the fault.
    // Arrange
    const missing = faultOf(testConnection('llm', {}));

    // Act
    const reachedFaults = new Set([
      missing,
      ...PLANTED_REFUSALS.map((entry) => faultFor(entry.kind, entry.value)),
    ]);

    // Assert
    expect([...reachedFaults].sort())
      .toEqual(EVERY_FAULT
        .filter((fault) => fault !== UNREACHABLE_FAULT)
        .sort());
  });

  it('answers one distinct, non-empty sentence per fault', () => {
    // A table with two members sharing a sentence would leave an
    // operator unable to tell two repairs apart, and nothing in the
    // module would report it.
    // Arrange / Act
    const sentences = EVERY_FAULT.map(
      (fault) => connectionFaultSentence(fault, 'endpoint'),
    );

    // Assert
    expect(new Set(sentences).size).toBe(EVERY_FAULT.length);
    expect(sentences.filter((sentence) => sentence.trim() === '')).toEqual([]);
  });

  it('names the field in every sentence but the undeclared one', () => {
    // That arm names none because the fault is that none is declared;
    // every other sentence is about a control the operator can see.
    // Arrange
    const named = EVERY_FAULT.filter((fault) => fault !== UNREACHABLE_FAULT);

    // Act
    const silent = named.filter(
      (fault) => !connectionFaultSentence(fault, SENTINEL).includes(SENTINEL),
    );

    // Assert
    expect(silent).toEqual([]);
    expect(connectionFaultSentence(UNREACHABLE_FAULT, SENTINEL))
      .not.toContain(SENTINEL);
  });

  it('reads as the sentences an operator sees', () => {
    // One literal pin, so the readings above are not all comparisons
    // of the module against itself. The success leads with what did
    // not happen, which is the whole of what this surface may claim.
    // Arrange / Act / Assert
    expect(REACHED_SENTENCE).toBe('Nothing was contacted: this reads '
      + 'the stored configuration, and it names an address this '
      + 'deployment could dial.');
    expect(connectionFaultSentence('host-reserved', 'endpoint'))
      .toBe('The endpoint field names a host set aside for '
        + 'documentation, which is reserved never to answer for a '
        + 'real service.');
  });
});
