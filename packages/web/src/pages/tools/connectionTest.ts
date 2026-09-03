/**
 * @packageDocumentation
 * The tools surface's connection test: whether a connector's stored
 * configuration names somewhere this deployment could reach, decided
 * by reading the payload and never by dialling it.
 *
 * Beside the modal rather than inside it, for the reason `./editor.ts`
 * gives at length: the unit runner collects `.ts` files under `src` in
 * a node environment, so a decision living in a `.tsx` is reachable by
 * no test in this package at all.
 *
 * `./ConnectorEditorModal.tsx` is what offers it, on a control below
 * that editor's per-kind fields, and it runs this over the DRAFT
 * rather than over the row the read answered — so what an operator
 * is told is about the configuration in front of them. A refusal goes
 * to a dismissable toast and a success to the modal's footer, for the
 * reason {@link REACHED_SENTENCE} is written the way it is.
 *
 * ## A reading of the stored configuration, not of a live service
 *
 * The sentence this whole module is built around, and the one an
 * operator has to be told rather than left to infer.
 *
 * This app is fixture-backed. `../../data/` answers rows out of frozen
 * arrays, nothing in this shell holds a socket, and a page that opened
 * one would be the first thing here to leave the tab. So a connection
 * test cannot report that the service answered, and a green that an
 * operator reads as "the service is up" would be the worst thing this
 * surface could say — a wrong answer rather than a missing one.
 *
 * What a reading CAN say is what a client would find when it read the
 * row, and that is worth having on its own: most of what stops a
 * connector from working is visible in the payload before a packet is
 * sent. A blank endpoint, a scheme nothing here speaks, a path that is
 * not absolute, a host reserved never to resolve — each is a repair
 * an operator can make, and each is invisible on a card that reports
 * `ready` for any config with a key in it.
 *
 * {@link REACHED_SENTENCE} therefore leads with what did NOT happen,
 * and every refusal below describes the configuration rather than an
 * attempt.
 *
 * The same rule is why there is no timer here, no retry, no pending
 * state and no network: nothing is in flight, so the outcome is
 * available on the tick the button is pressed. A spinner would be
 * theatre and a delay pretending to be a round trip would make the
 * shell lie about the one thing this module exists to be honest about.
 *
 * The day the seam is re-pointed at HTTP this module is the wrong
 * shape and goes with the fixture modules: a real test is
 * asynchronous, can fail for reasons no payload shows, and answers
 * about the service instead of about the row.
 *
 * ## One sentence, and not a list
 *
 * `./editor.ts`'s `validateConnectorDraft` answers every fault at
 * once, because a form is repaired all of a piece and an operator
 * wants the whole list before starting on it. This answers exactly
 * one, because an attempt is not a form: a client stops at the first
 * thing that stopped it, and a reading that listed everything wrong
 * with a config it never dialled would be a second validator wearing
 * the word "test".
 *
 * The order the readings are taken in is the order a client would
 * meet them — is there an address, does it read as one, is it
 * addressed in a way this deployment speaks, and does it name
 * somewhere that could answer.
 *
 * ## What it reads, and the two things it deliberately does not
 *
 * The subject is the ADDRESS field alone — the one field
 * `./editor.ts` declares per kind under the `address` role, taken
 * from that same table so the two modules cannot disagree about which
 * key it is.
 *
 * It reads no SECRET, and that is a rule rather than an omission.
 * `openConnectorDraft` takes every write-only value out before an
 * editor holds the row, so a draft carries no credential unless one
 * has just been typed; a test that refused for a missing credential
 * would refuse every connector nobody had retyped, which is all of
 * them. Credentials are checked by the service that is handed them
 * and by nothing in this shell.
 *
 * It reads no SETTING either. A model name or a notebook id decides
 * what a call asks for rather than where it goes, so a row missing
 * one has somewhere to reach and something else to fix. The seeded
 * `static-feed` export target is the case that shows the line: its
 * `publicUrl` names a reserved host and is not read at all, because
 * that member says where the written file is served from and the
 * address is where the file is written.
 *
 * ## Reserved hosts, and the two narrowings around that reading
 *
 * A documentation-reserved name is the one thing a pure reading can
 * say about reachability with real confidence: RFC 2606 sets aside
 * `example.com`, `example.net`, `example.org` and the `.example`,
 * `.invalid` and `.test` top-level names precisely so that they never
 * resolve to anybody's service. An address under one of them is not
 * merely unlikely to answer — it is reserved not to.
 *
 * That is what gives this surface a failure to show. Every seeded
 * connector reached over the network is addressed under a reserved
 * name, for the reason `../../data/connectors.ts` states: a fixture
 * pointed at a real endpoint is a fixture that could be dialled by
 * accident. So the demo has both answers in it rather than a control
 * whose refusal nothing reaches, and `./connectionTest.test.ts` pins
 * that partition against the shipped rows.
 *
 * Two narrowings, both deliberate and neither reported by anything
 * else. `.localhost` is NOT refused: a loopback address is where a
 * model runner or a workflow engine actually sits during development,
 * and refusing it would report the one address most likely to answer
 * as the one that cannot. And this reads reserved NAMES and not
 * reserved address BLOCKS — an endpoint written as a documentation
 * IP literal is dialled as far as this module is concerned, because
 * covering that would mean a second parser for a shape no fixture
 * carries.
 *
 * ## What a refusal may say
 *
 * Nothing of what the payload HOLDS. A sentence an operator reads
 * goes into the DOM, into a screenshot and into whatever is pasted
 * into a support thread, and on this surface one of the values it
 * might quote is a credential — `../../components/jsonDraft.ts`
 * carries the argument at length and `./editor.ts` restates it for
 * the same reason.
 *
 * The one input-derived thing a sentence here carries is the config
 * KEY, and it is not an exception to that rule: the key comes from
 * `./editor.ts`'s own field table, which is this shell's vocabulary
 * rather than the operator's, and it is already the visible name of
 * the control the sentence is about. Naming it is what makes a
 * refusal actionable instead of leaving an operator to guess which of
 * three fields is meant.
 *
 * ## A fresh outcome per call
 *
 * {@link testConnection} builds a new record every time, including
 * for the success, so a caller holding the last outcome in state can
 * always tell two readings apart. The modal does not lean on that: it
 * clears the outcome on a dismiss and on every edit, so a second
 * press arrives at a state change whatever the record's identity is.
 * A caller that compared references instead would quietly skip the
 * render for the second of two identical readings and leave an
 * operator looking at nothing, and that is a trap worth not laying.
 *
 * Nothing here freezes what it answers either, so a shared record
 * would be one every caller could reach into. Every mover in `../`
 * answers fresh for the same family of reason.
 *
 * No array is answered anywhere here, so the two array-ownership
 * stances the sibling modules declare do not arise.
 */

import type { Connector, ConnectorKind } from '../../data/types';

import { connectorFields } from './editor';

/**
 * What a reading says when the configuration names an address.
 *
 * Leads with what did not happen, per the header. An operator who
 * reads only the first clause has still been told the true thing, and
 * one who reads all of it knows what was actually checked.
 */
export const REACHED_SENTENCE = 'Nothing was contacted: this reads '
  + 'the stored configuration, and it names an address this '
  + 'deployment could dial.';

/** What the empty field name reads as, where a sentence names none. */
const NO_FIELD = '';

/** What a trimmed field holding nothing reads as. */
const EMPTY_TEXT = '';

/** The prefix an absolute path starts with. */
const PATH_ROOT = '/';

/**
 * Why a reading refused, as a value rather than as a sentence.
 *
 * A closed union so the sentence table below can be
 * `Readonly<Record<ConnectionFault, ...>>` and therefore total by
 * declaration: a member added here without a sentence is a
 * `check-types` error rather than a refusal that says nothing.
 *
 * It also gives a caller something to branch on that is not a string
 * comparison against prose. A spec asserting which refusal it got
 * should read this and let the sentence be pinned separately, so a
 * reworded sentence does not redden a case about behaviour.
 *
 * - `address-undeclared` — no address field is declared for the
 *   kind at all. A wiring fault in `./editor.ts` rather than a state
 *   a connector can be in; see {@link testConnection}.
 * - `address-missing` — the config carries nothing under the
 *   address key.
 * - `address-unreadable` — it carries something that does not read
 *   as an address: text that will not parse, or a value this shell
 *   draws no text control for.
 * - `scheme-unsupported` — it parses, and names a scheme this
 *   deployment does not speak.
 * - `host-reserved` — it names a host reserved never to resolve.
 * - `path-relative` — a filesystem destination that is not
 *   absolute.
 */
export type ConnectionFault =
  | 'address-undeclared'
  | 'address-missing'
  | 'address-unreadable'
  | 'scheme-unsupported'
  | 'host-reserved'
  | 'path-relative';

/** A reading that found an address. */
export interface ConnectionReached {
  /** Discriminates the outcome. */
  readonly reached: true;
  /** {@link REACHED_SENTENCE}, carried so a caller reads one member. */
  readonly sentence: string;
}

/** A reading that refused, and why. */
export interface ConnectionRefused {
  /** Discriminates the outcome. */
  readonly reached: false;
  /** Which reading refused, for a caller that branches. */
  readonly fault: ConnectionFault;
  /** The one sentence, for a caller that shows it. */
  readonly sentence: string;
}

/**
 * What {@link testConnection} answers.
 *
 * Both arms carry a `sentence` so the modal has words for either
 * outcome without holding any of its own: a `.tsx` in this package is
 * reachable by no test here, and a success message written there
 * would be the one operator-facing string on this surface that
 * nothing could read back.
 */
export type ConnectionTestOutcome = ConnectionReached | ConnectionRefused;

/** What a `connectors.config` address is written as, per kind. */
type AddressShape = 'url' | 'path';

/**
 * Which shape each kind's address takes.
 *
 * Total over `ConnectorKind` for the reason `./editor.ts`'s field
 * table is: a kind added to the union is a `check-types` error here
 * rather than a branch reading an address it has no rule for.
 *
 * There is a table at all because the two shapes fail each other's
 * readings. An export target's `/srv/exports/notes` parses as no URL,
 * and an endpoint that happened to start with a slash would satisfy
 * the only question asked of a path.
 */
const ADDRESS_SHAPES: Readonly<Record<ConnectorKind, AddressShape>> = {
  llm: 'url',
  search: 'url',
  notebook: 'url',
  export_target: 'path',
};

/**
 * The URL schemes this deployment reaches a service over.
 *
 * Spelled with the trailing colon because that is what `URL.protocol`
 * answers, rather than trimming it off at every comparison.
 */
const DIALLED_SCHEMES: readonly string[] = ['http:', 'https:'];

/**
 * The host names reserved never to resolve to a real service.
 *
 * RFC 2606's set, second-level names and top-level names in one list
 * because {@link isUnder} answers both the exact match and the
 * subdomain one. `localhost` is deliberately absent — see the
 * header on why the address most likely to answer must not be the one
 * refused.
 */
const RESERVED_HOSTS: readonly string[] = [
  'example.com',
  'example.net',
  'example.org',
  'example',
  'invalid',
  'test',
];

/**
 * The sentence each refusal reads as, built from the field it is
 * about.
 *
 * Total over {@link ConnectionFault} by declaration. Every sentence
 * describes the configuration rather than an attempt, and none quotes
 * a value; the field name is the one input-derived thing any of them
 * carries, and the header says why that is not an exception.
 */
const FAULT_SENTENCES: Readonly<
  Record<ConnectionFault, (field: string) => string>
> = {
  // Names no field, because the fault is that none is declared. The
  // parameter is dropped rather than ignored, which is what keeps
  // `noUnusedParameters` quiet without an underscore nobody reads.
  'address-undeclared': () => 'This deployment declares no address '
    + 'field for connectors of this kind, so there is nothing to '
    + 'read.',
  // The blank case, phrased as what is absent rather than as a rule
  // the field breaks: an unfinished connector is an ordinary row and
  // `classifyConnector` already has a word for it.
  'address-missing': (field) => `The ${field} field holds nothing, so `
    + 'this connector names nowhere to reach.',
  // Deliberately vague about WHAT is there, which is the no-echo rule
  // doing its job: the value is on screen in the control this
  // sentence names.
  'address-unreadable': (field) => `The ${field} field does not read `
    + 'as an address at all.',
  // Names the two schemes rather than the one that was found, so the
  // sentence is a repair instead of a report.
  'scheme-unsupported': (field) => `The ${field} field names a scheme `
    + 'this deployment does not speak; services are reached over http '
    + 'and https.',
  // The one refusal that has to explain itself, since a reserved name
  // looks like an ordinary address and reads as one.
  'host-reserved': (field) => `The ${field} field names a host set `
    + 'aside for documentation, which is reserved never to answer for '
    + 'a real service.',
  // Says where the consequence lands rather than restating the rule:
  // a relative destination is not wrong so much as unpredictable.
  'path-relative': (field) => `The ${field} field is not an absolute `
    + 'path, so where it writes depends on which directory the '
    + 'service was started in.',
};

/**
 * What one refusal reads as.
 *
 * Exported so a caller comparing outcomes reads this module's own
 * words instead of restating them — the same reason `./editor.ts`
 * exports its refusal sentences.
 *
 * @param fault - Which reading refused.
 * @param field - The config key the sentence is about. Ignored by the
 * one fault that names no field.
 * @returns The sentence, exactly as an operator sees it.
 */
export function connectionFaultSentence(
  fault: ConnectionFault,
  field: string,
): string {
  return FAULT_SENTENCES[fault](field);
}

/**
 * A refused outcome, assembled once.
 *
 * @param fault - Which reading refused.
 * @param field - The config key it is about.
 * @returns A fresh outcome; see the header on why fresh.
 */
function refused(
  fault: ConnectionFault,
  field: string,
): ConnectionRefused {
  return {
    reached: false,
    fault,
    sentence: connectionFaultSentence(fault, field),
  };
}

/**
 * A reached outcome.
 *
 * @returns A fresh outcome; see the header on why a shared constant
 * would cost the modal a render.
 */
function reached(): ConnectionReached {
  return { reached: true, sentence: REACHED_SENTENCE };
}

/**
 * The config key one kind is reached at.
 *
 * Read off `./editor.ts`'s field table rather than declared again
 * here, so the control an operator types into and the field this
 * refuses about are the same one by construction.
 *
 * @param kind - The connector's kind.
 * @returns Its address key, or `undefined` where the table declares
 * none.
 */
function addressKey(kind: ConnectorKind): string | undefined {
  const field = connectorFields(kind).find(
    (candidate) => candidate.role === 'address',
  );

  return field?.key;
}

/**
 * Whether a host is the named one or sits beneath it.
 *
 * The dotted form is what keeps `notexample.com` out of a match on
 * `example.com` while `api.example.com` stays in it.
 *
 * @param host - The host as the URL parser answered it, lowercased.
 * @param name - A reserved name.
 * @returns Whether the host is under it.
 */
function isUnder(host: string, name: string): boolean {
  return host === name || host.endsWith(`.${name}`);
}

/**
 * Whether a host is reserved never to resolve.
 *
 * @param host - The host as the URL parser answered it.
 * @returns Whether any reserved name covers it.
 */
function isReservedHost(host: string): boolean {
  return RESERVED_HOSTS.some((name) => isUnder(host, name));
}

/**
 * The address text as a URL, or `undefined`.
 *
 * The parser is the whole readability test: a string it refuses is
 * one no client could dial, and one it accepts carries the scheme and
 * the host the two readings below ask about. Nothing is fetched by
 * constructing one.
 *
 * @param address - The trimmed field text.
 * @returns The parsed address, or `undefined` if it is not one.
 */
function parseAddress(address: string): URL | undefined {
  try {
    return new URL(address);
  } catch {
    return undefined;
  }
}

/**
 * What a network address reads as.
 *
 * @param address - The trimmed field text.
 * @param field - The config key, for the sentence.
 * @returns The outcome.
 */
function readUrlAddress(
  address: string,
  field: string,
): ConnectionTestOutcome {
  const parsed = parseAddress(address);

  if (parsed === undefined) {
    return refused('address-unreadable', field);
  }

  if (!DIALLED_SCHEMES.includes(parsed.protocol)) {
    return refused('scheme-unsupported', field);
  }

  // `URL` lowercases the host of every scheme reached here, so the
  // reserved reading needs no case folding of its own. The colocated
  // test drives an upper-case host rather than leaving that a
  // subtlety two readers have to agree about.
  if (isReservedHost(parsed.hostname)) {
    return refused('host-reserved', field);
  }

  return reached();
}

/**
 * What a filesystem destination reads as.
 *
 * Absolute means a leading slash, which is what every path this
 * deployment writes looks like. A drive-lettered path is not a shape
 * the service produces and is refused with the rest; saying so is
 * cheaper than a second parser for it.
 *
 * @param address - The trimmed field text.
 * @param field - The config key, for the sentence.
 * @returns The outcome.
 */
function readPathAddress(
  address: string,
  field: string,
): ConnectionTestOutcome {
  return address.startsWith(PATH_ROOT)
    ? reached()
    : refused('path-relative', field);
}

/**
 * What this deployment's stored configuration says about reaching a
 * connector.
 *
 * Takes the kind and the config rather than a whole `Connector`
 * because those are the only members a client would read: an id and a
 * name say which row this is, and neither is dialled. It is also what
 * lets the modal run this over a draft the store has never seen.
 *
 * Pure and immediate — no timer, no network, no state. See the
 * header at length: this reads the configuration and reports what a
 * client would find in it, and it never reports that a service
 * answered.
 *
 * The `address-undeclared` arm is here so this stays total rather
 * than because a connector could reach it: `./editor.ts` declares an
 * address for every kind and both packages' tests assert it. A
 * non-null assertion in its place would answer a sentence about a
 * field that does not exist.
 *
 * @param kind - The connector's kind, which selects the client and
 * therefore the shape of its address.
 * @param config - Its `connectors.config`, as stored or as drafted.
 * @returns One outcome, freshly built; a refusal carries exactly one
 * sentence.
 */
export function testConnection(
  kind: ConnectorKind,
  config: Connector['config'],
): ConnectionTestOutcome {
  const field = addressKey(kind);

  if (field === undefined) {
    return refused('address-undeclared', NO_FIELD);
  }

  const stored = config[field];

  if (stored === undefined) {
    return refused('address-missing', field);
  }

  if (typeof stored !== 'string') {
    return refused('address-unreadable', field);
  }

  const address = stored.trim();

  if (address === EMPTY_TEXT) {
    return refused('address-missing', field);
  }

  return ADDRESS_SHAPES[kind] === 'url'
    ? readUrlAddress(address, field)
    : readPathAddress(address, field);
}
