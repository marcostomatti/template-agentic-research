import type { Connector, ConnectorKind } from '../../data/types';

import { describe, expect, it } from 'vitest';

import { REDACTED, listConnectors } from '../../data/connectors';

import { CONNECTOR_KIND_FACETS, configValueLabel } from './cards';
import {
  ADDRESS_REQUIRED_SENTENCE,
  MASKED_VALUE_SENTENCE,
  NAME_REQUIRED_SENTENCE,
  NAME_TAKEN_SENTENCE,
  connectorFieldValue,
  connectorFields,
  connectorSavePayload,
  openConnectorDraft,
  readConnectorKind,
  validateConnectorDraft,
  withConnectorField,
  withConnectorKind,
  withConnectorName,
} from './editor';

/**
 * The kinds this surface names, read off `./cards.ts`.
 *
 * That table is total over `ConnectorKind` by its own declaration, so
 * driving the cases below off it is what makes them cover the union
 * rather than a list this file remembered.
 */
const EVERY_KIND: readonly ConnectorKind[] = CONNECTOR_KIND_FACETS
  .map((facet) => facet.kind);

/**
 * A token planted in a draft so the leak sweep has a needle.
 *
 * No hyphen and no space: the sweep looks for it whole, and a token
 * something might quote in pieces would let a partial echo pass.
 */
const SENTINEL = 'SNTNL9';

/**
 * A connector carrying only what a case names.
 *
 * @param overrides - The members the case is about.
 * @returns A whole row, so nothing under test is handed a partial one.
 */
function connectorWith(overrides: Partial<Connector>): Connector {
  return {
    id: 1,
    kind: 'llm',
    name: 'primary',
    config: {
      endpoint: 'https://api.example.com/v1/messages',
      model: 'example-model-standard',
      apiKey: REDACTED,
    },
    ...overrides,
  };
}

/**
 * The first of a list, or a throw.
 *
 * `noUncheckedIndexedAccess` is on repo-wide, so an index into a
 * derived list is `Connector | undefined`. Throwing rather than
 * asserting non-null keeps a case that lost its subject loud instead
 * of letting every `expect` below it read `undefined`.
 *
 * @param connectors - Any list.
 * @returns Its first member.
 */
function firstConnector(connectors: readonly Connector[]): Connector {
  const [connector] = connectors;

  if (connector === undefined) {
    throw new Error('Expected the list to carry a connector, and it '
      + 'did not.');
  }

  return connector;
}

/**
 * Which config values of a row are the mask.
 *
 * The second reader the write-only sweeps need: a module that stripped
 * nothing would answer a row that still looks right member by member,
 * so the placeholder is looked for rather than assumed gone.
 *
 * @param connector - Any row.
 * @returns The masked values it carries.
 */
function maskedValues(connector: Connector): unknown[] {
  return Object.values(connector.config).filter(
    (value) => value === REDACTED,
  );
}

/**
 * The keys one kind declares under one role.
 *
 * @param kind - The connector kind.
 * @param role - Which sort of field is wanted.
 * @returns Their config keys, in form order.
 */
function keysOfRole(kind: ConnectorKind, role: string): string[] {
  return connectorFields(kind)
    .filter((field) => field.role === role)
    .map((field) => field.key);
}

/**
 * Which of these sentences carry the planted token.
 *
 * A builder cannot see its own echo, so the sentences are re-read here
 * rather than trusted. The sweep drives it over a producer that
 * genuinely leaks in the same case, which is what says the reader
 * would have found one.
 *
 * @param sentences - Whatever was produced.
 * @returns The members quoting the token.
 */
function leaking(sentences: readonly string[]): string[] {
  return sentences.filter((sentence) => sentence.includes(SENTINEL));
}

describe('connectorFields', () => {
  it('draws a branch for every kind this surface names', () => {
    // The record is total over the union by declaration; this is the
    // reading that says the union and the surface agree about which
    // kinds there are.
    // Arrange / Act
    const empty = EVERY_KIND.filter(
      (kind) => connectorFields(kind).length === 0,
    );

    // Assert
    expect(empty).toEqual([]);
    expect(EVERY_KIND.length).toBeGreaterThan(1);
  });

  it('names exactly one address per kind', () => {
    // The address is the field a configured connector may not leave
    // blank, so a kind with two would refuse on whichever the reading
    // happened to find and a kind with none would refuse nothing.
    // Arrange / Act
    const counts = EVERY_KIND.map(
      (kind) => keysOfRole(kind, 'address').length,
    );

    // Assert
    expect(counts).toEqual(EVERY_KIND.map(() => 1));
  });

  it('declares each key once within a kind', () => {
    // Two controls writing one config key would draw the same value
    // twice and the second would overwrite the first with no error.
    // Arrange / Act
    const doubled = EVERY_KIND.filter((kind) => {
      const keys = connectorFields(kind).map((field) => field.key);

      return new Set(keys).size !== keys.length;
    });

    // Assert
    expect(doubled).toEqual([]);
  });

  it('answers the same list every caller gets', () => {
    // The shared stance this module is in: nothing here feeds a
    // `@ar/ui` prop declared mutable, so there is nothing to copy for.
    // Arrange / Act / Assert
    expect(connectorFields('llm')).toBe(connectorFields('llm'));
  });

  it('declares only keys the shipped connectors store as text', () => {
    // Every control the modal draws for a field is a text box, so a
    // declared key holding a number would be retyped as a string by
    // the first save that touched it. The seeded `resultLimit` is the
    // reason that rule needs a case: it is a number, and it is
    // deliberately not declared.
    // Arrange
    const stored = listConnectors().flatMap(
      (connector) => connectorFields(connector.kind)
        .map((field) => connector.config[field.key])
        .filter((value) => value !== undefined),
    );

    // Act
    const untyped = stored.filter((value) => typeof value !== 'string');

    // Assert
    expect(untyped).toEqual([]);
    // The vacuity guard: an empty walk satisfies the line above.
    expect(stored.length).toBeGreaterThan(5);
  });
});

describe('openConnectorDraft', () => {
  it('renders a declared secret empty', () => {
    // The write-only rule, read the way the control reads it. The
    // draft holds nothing for the field rather than holding a mask
    // the modal has to remember not to draw.
    // Arrange
    const stored = connectorWith({});

    // Act
    const opened = openConnectorDraft(stored);

    // Assert
    expect(connectorFieldValue(opened, 'apiKey')).toBe('');
    expect(connectorFieldValue(stored, 'apiKey')).toBe(REDACTED);
  });

  it('takes out a secret whatever it holds', () => {
    // A declared secret goes on its KEY and not on its value, which is
    // what makes a reopen after a retyped save show an empty box
    // again rather than the credential the store now carries.
    // Arrange
    const stored = connectorWith({
      config: { endpoint: 'https://api.example.com', apiKey: 'typed-value' },
    });

    // Act
    const opened = openConnectorDraft(stored);

    // Assert
    expect(Object.keys(opened.config)).toEqual(['endpoint']);
  });

  it('takes out a mask under a key this table does not declare', () => {
    // The half a per-kind list cannot cover: a deployment is free to
    // configure a second credential under a key this shell has never
    // heard of, and the fixtures carry no such shape, so this case is
    // what keeps the guard honest.
    // Arrange
    const stored = connectorWith({
      config: {
        endpoint: 'https://api.example.com',
        orgToken: REDACTED,
      },
    });

    // Act
    const opened = openConnectorDraft(stored);

    // Assert
    expect(Object.keys(opened.config)).toEqual(['endpoint']);
  });

  it('keeps a key this table does not declare', () => {
    // The payload is open and this shell does not own it: a key it
    // draws no control for survives every edit untouched.
    // Arrange
    const stored = connectorWith({
      kind: 'search',
      name: 'web',
      config: {
        endpoint: 'https://search.example.net/v1/query',
        resultLimit: 20,
        apiKey: REDACTED,
      },
    });

    // Act
    const opened = openConnectorDraft(stored);

    // Assert
    expect(opened.config).toEqual({
      endpoint: 'https://search.example.net/v1/query',
      resultLimit: 20,
    });
  });

  it('keeps the id, the kind and the name', () => {
    // Arrange
    const stored = connectorWith({
      id: 4,
      kind: 'notebook',
      name: 'research',
    });

    // Act
    const opened = openConnectorDraft(stored);

    // Assert
    expect(opened.id).toBe(4);
    expect(opened.kind).toBe('notebook');
    expect(opened.name).toBe('research');
  });

  it('answers a fresh row and leaves the stored one alone', () => {
    // Arrange
    const stored = connectorWith({});

    // Act
    const opened = openConnectorDraft(stored);

    // Assert
    expect(opened).not.toBe(stored);
    expect(stored.config.apiKey).toBe(REDACTED);
  });

  it('opens an already opened draft to the same row', () => {
    // A modal calls this with the query answer on every render, so a
    // second pass over its own result has to be the same row by value
    // or the holder records a change nobody made.
    // Arrange
    const opened = openConnectorDraft(connectorWith({}));

    // Act
    const reopened = openConnectorDraft(opened);

    // Assert
    expect(reopened).toEqual(opened);
  });

  it('leaves no mask in any connector this deployment ships', () => {
    // The app-level reading rather than the shape one, driven off the
    // fixture the surface reads.
    // Arrange
    const shipped = listConnectors();

    // Act
    const carrying = shipped
      .map(openConnectorDraft)
      .filter((opened) => maskedValues(opened).length > 0);

    // Assert
    expect(carrying).toEqual([]);
    // The control: the rows as READ do carry masks, so the empty
    // answer above is a reading rather than a table with none in it.
    expect(shipped.filter((row) => maskedValues(row).length > 0).length)
      .toBeGreaterThan(0);
  });
});

describe('connectorFieldValue', () => {
  it('answers the empty string for a key nothing stores', () => {
    // Which is how a secret comes back blank once it has been taken
    // out, and how a field the payload has never carried draws.
    // Arrange
    const connector = connectorWith({ config: {} });

    // Act / Assert
    expect(connectorFieldValue(connector, 'endpoint')).toBe('');
  });

  it('answers the same reading the card draws', () => {
    // Through `configValueLabel`, so the editor and the card cannot
    // describe one payload two ways. The number is the case that
    // separates the two readings from each other.
    // Arrange
    const connector = connectorWith({
      kind: 'search',
      config: { endpoint: 'https://search.example.net', resultLimit: 20 },
    });

    // Act / Assert
    expect(connectorFieldValue(connector, 'resultLimit'))
      .toBe(configValueLabel(20));
    expect(connectorFieldValue(connector, 'endpoint'))
      .toBe('https://search.example.net');
  });
});

describe('readConnectorKind', () => {
  it('refuses a value naming no kind', () => {
    // A fallback here would be this module picking a client on the
    // operator behalf, and the client decides whether the config
    // below it means anything at all.
    // Arrange / Act / Assert
    expect(readConnectorKind('smtp')).toBeUndefined();
    expect(readConnectorKind('')).toBeUndefined();
  });

  it('reads back every kind this surface names', () => {
    // The roster is the field table own keys, so this is also what
    // says the narrowing and the branches agree.
    // Arrange / Act
    const read = EVERY_KIND.map((kind) => readConnectorKind(kind));

    // Assert
    expect(read).toEqual(EVERY_KIND);
  });
});

describe('withConnectorName', () => {
  it('writes the name exactly as typed, surrounding space included', () => {
    // A mover that trimmed would eat the space between two words as
    // the second one was being typed.
    // Arrange
    const connector = connectorWith({});

    // Act
    const moved = withConnectorName(connector, ' long context ');

    // Assert
    expect(moved.name).toBe(' long context ');
  });

  it('touches nothing else', () => {
    // Arrange
    const connector = connectorWith({ id: 7 });

    // Act
    const moved = withConnectorName(connector, 'renamed');

    // Assert
    expect(moved).toEqual({ ...connector, name: 'renamed' });
    expect(moved).not.toBe(connector);
  });
});

describe('withConnectorKind', () => {
  it('keeps the id and the name', () => {
    // The common fields are what a kind change is about keeping: the
    // row is the same row, configured for a different client.
    // Arrange
    const connector = connectorWith({ id: 3, name: 'primary' });

    // Act
    const moved = withConnectorKind(connector, 'notebook');

    // Assert
    expect(moved.id).toBe(3);
    expect(moved.name).toBe('primary');
    expect(moved.kind).toBe('notebook');
  });

  it('drops the branch the old kind was configured for', () => {
    // Including the keys the two kinds share, which are the dangerous
    // half: an llm endpoint carried into a search connector is an
    // address that looks right and answers the wrong service.
    // Arrange
    const connector = connectorWith({});

    // Act
    const moved = withConnectorKind(connector, 'search');

    // Assert
    expect(moved.config).toEqual({});
    expect(keysOfRole('llm', 'address'))
      .toEqual(keysOfRole('search', 'address'));
  });

  it('drops a key this table declares for neither kind', () => {
    // Every key in a config is configuration FOR the client the kind
    // selects, declared here or not, so none of it survives the swap.
    // Arrange
    const connector = connectorWith({
      config: { endpoint: 'https://api.example.com', orgToken: 'kept-value' },
    });

    // Act
    const moved = withConnectorKind(connector, 'export_target');

    // Assert
    expect(Object.keys(moved.config)).toEqual([]);
  });

  it('leaves every field of the new branch empty', () => {
    // What the form asks for next, read the way the controls read it.
    // Arrange
    const connector = connectorWith({});

    // Act
    const moved = withConnectorKind(connector, 'notebook');
    const drawn = connectorFields('notebook')
      .map((field) => connectorFieldValue(moved, field.key));

    // Assert
    expect(drawn).toEqual(connectorFields('notebook').map(() => ''));
    expect(drawn.length).toBeGreaterThan(1);
  });

  it('answers a fresh row and leaves the old one alone', () => {
    // Arrange
    const connector = connectorWith({});

    // Act
    const moved = withConnectorKind(connector, 'search');

    // Assert
    expect(moved).not.toBe(connector);
    expect(connector.kind).toBe('llm');
    expect(Object.keys(connector.config)).toHaveLength(3);
  });

  it('moves which connectors the uniqueness reading compares against', () => {
    // The pairing this mover earns its keep by: the collision check
    // reads the kind off the DRAFT, so the two are one claim rather
    // than a mover nothing consults.
    // Arrange
    const siblings = [
      connectorWith({ id: 2, kind: 'llm', name: 'shared', config: {} }),
      connectorWith({ id: 3, kind: 'search', name: 'other', config: {} }),
    ];
    // Configured with nothing, so the only fault either reading can
    // report is the collision the case is about.
    const colliding = connectorWith({
      id: 1,
      kind: 'llm',
      name: 'shared',
      config: {},
    });

    // Act
    const moved = withConnectorKind(colliding, 'search');

    // Assert
    expect(validateConnectorDraft(colliding, siblings))
      .toEqual([NAME_TAKEN_SENTENCE]);
    expect(validateConnectorDraft(moved, siblings)).toEqual([]);
  });
});

describe('withConnectorField', () => {
  it('writes the trimmed value', () => {
    // What is stored has to be what the value means, not what the
    // keyboard produced. Trimming here is safe because the modal
    // shows its own typed text and writes this beneath it.
    // Arrange
    const connector = connectorWith({ config: {} });

    // Act
    const moved = withConnectorField(connector, 'endpoint', '  https://x  ');

    // Assert
    expect(moved.config.endpoint).toBe('https://x');
  });

  it('removes the key when the field is cleared', () => {
    // One representation of nothing: a cleared field, an absent key
    // and an unconfigured row are one state rather than three that
    // read alike. `classifyConnector` counts KEYS, so a config of
    // empty strings would report `ready` while naming nowhere.
    // Arrange
    const connector = connectorWith({});

    // Act
    const moved = withConnectorField(connector, 'model', '');

    // Assert
    expect(Object.keys(moved.config)).toEqual(['endpoint', 'apiKey']);
  });

  it('removes the key when the field holds only spaces', () => {
    // Trimming first is what makes those one state rather than two.
    // Arrange / Act
    const spaced = withConnectorField(connectorWith({}), 'model', '  \t ');
    const empty = withConnectorField(connectorWith({}), 'model', '');

    // Assert
    expect(spaced).toEqual(empty);
  });

  it('keeps the payload key order when rewriting in place', () => {
    // The stored order is the order an operator wrote it in, and a
    // rebuild that moved the edited key to the end would walk an
    // address away from the credential that belongs with it.
    // Arrange
    const connector = connectorWith({});

    // Act
    const moved = withConnectorField(connector, 'endpoint', 'https://y');

    // Assert
    expect(Object.keys(moved.config)).toEqual(['endpoint', 'model', 'apiKey']);
  });

  it('appends a key the payload does not carry', () => {
    // Which is the ordinary state of a secret field being typed into
    // for the first time, the mask having been taken out on open.
    // Arrange
    const opened = openConnectorDraft(connectorWith({}));

    // Act
    const moved = withConnectorField(opened, 'apiKey', 'typed-value');

    // Assert
    expect(Object.keys(moved.config)).toEqual(['endpoint', 'model', 'apiKey']);
  });

  it('writes a key this table does not declare', () => {
    // Takes a KEY rather than a declared field, so the payload stays
    // as open to this module as it is to the service.
    // Arrange
    const connector = connectorWith({ config: {} });

    // Act
    const moved = withConnectorField(connector, 'orgToken', 'value');

    // Assert
    expect(moved.config).toEqual({ orgToken: 'value' });
  });

  it('touches nothing else', () => {
    // Arrange
    const connector = connectorWith({ id: 9, name: 'primary' });

    // Act
    const moved = withConnectorField(connector, 'model', 'other-model');

    // Assert
    expect(moved.id).toBe(9);
    expect(moved.name).toBe('primary');
    expect(moved.kind).toBe('llm');
    expect(moved).not.toBe(connector);
    expect(connector.config.model).toBe('example-model-standard');
  });
});

describe('connectorSavePayload', () => {
  it('omits a secret left blank', () => {
    // The write-only rule at the crossing it is named for: a save that
    // did not retype the credential says nothing about it, so the
    // stored value is left alone rather than blanked.
    // Arrange
    const opened = openConnectorDraft(connectorWith({}));

    // Act
    const payload = connectorSavePayload(opened);

    // Assert
    expect(Object.keys(payload.config)).toEqual(['endpoint', 'model']);
  });

  it('sends a secret that was retyped', () => {
    // The other half, and the whole point of the field: a value an
    // operator typed is the one thing a write-only field ever sends.
    // Arrange
    const opened = openConnectorDraft(connectorWith({}));
    const typed = withConnectorField(opened, 'apiKey', 'typed-value');

    // Act
    const payload = connectorSavePayload(typed);

    // Assert
    expect(payload.config.apiKey).toBe('typed-value');
  });

  it('drops a field holding the mask', () => {
    // A guard rather than a path: the validation refuses such a draft
    // first, and says why. This is the layer that holds whatever a
    // caller hands it.
    // Arrange
    const draft = connectorWith({
      config: { endpoint: 'https://api.example.com', apiKey: REDACTED },
    });

    // Act
    const payload = connectorSavePayload(draft);

    // Assert
    expect(maskedValues(payload)).toEqual([]);
    expect(Object.keys(payload.config)).toEqual(['endpoint']);
  });

  it('drops a blank field that is not a secret', () => {
    // Reachable by a caller building a draft some other way; the
    // movers cannot produce one. A stored empty string would make
    // `classifyConnector` report `ready` over a row naming nowhere.
    // Arrange
    const draft = connectorWith({
      config: { endpoint: 'https://api.example.com', model: '   ' },
    });

    // Act
    const payload = connectorSavePayload(draft);

    // Assert
    expect(Object.keys(payload.config)).toEqual(['endpoint']);
  });

  it('keeps a key this table does not declare', () => {
    // Arrange
    const draft = connectorWith({
      kind: 'search',
      config: { endpoint: 'https://search.example.net', resultLimit: 20 },
    });

    // Act
    const payload = connectorSavePayload(draft);

    // Assert
    expect(payload.config.resultLimit).toBe(20);
  });

  it('answers a fresh row and leaves the draft alone', () => {
    // Arrange
    const draft = connectorWith({});

    // Act
    const payload = connectorSavePayload(draft);

    // Assert
    expect(payload).not.toBe(draft);
    expect(draft.config.apiKey).toBe(REDACTED);
  });

  it('sends no mask for any connector this deployment ships', () => {
    // Opened and saved with nothing typed, which is what a save that
    // only renamed a row does. The placeholder reaches the store
    // through no path at all.
    // Arrange
    const shipped = listConnectors();

    // Act
    const carrying = shipped
      .map((connector) => connectorSavePayload(openConnectorDraft(connector)))
      .filter((payload) => maskedValues(payload).length > 0);

    // Assert
    expect(carrying).toEqual([]);
    expect(shipped.filter((row) => maskedValues(row).length > 0).length)
      .toBeGreaterThan(0);
  });
});

describe('validateConnectorDraft', () => {
  it('refuses a blank name', () => {
    // A name is which instance of its kind the pipeline asks for.
    // Arrange
    const draft = connectorWith({ name: '' });

    // Act
    const faults = validateConnectorDraft(draft, []);

    // Assert
    expect(faults).toEqual([NAME_REQUIRED_SENTENCE, MASKED_VALUE_SENTENCE]);
  });

  it('refuses a name of spaces exactly as it refuses an empty one', () => {
    // Trimming first is what makes these one state rather than two
    // with a sentence apiece.
    // Arrange / Act
    const spaced = validateConnectorDraft(connectorWith({ name: ' \t ' }), []);
    const empty = validateConnectorDraft(connectorWith({ name: '' }), []);

    // Assert
    expect(spaced).toEqual(empty);
  });

  it('refuses a name another connector of the kind holds', () => {
    // `connectors_kind_name_unique`: a kind names each instance once.
    // Arrange
    const siblings = [connectorWith({ id: 2, name: 'long-context' })];
    const draft = openConnectorDraft(
      connectorWith({ id: 1, name: 'long-context' }),
    );

    // Act
    const faults = validateConnectorDraft(draft, siblings);

    // Assert
    expect(faults).toEqual([NAME_TAKEN_SENTENCE]);
  });

  it('refuses a config set against no address', () => {
    // The fault is the COMBINATION rather than the blank field: an
    // empty config is a state the card has a word for, and a config
    // carrying a model and nowhere to send it is one it reports as
    // ready.
    // Arrange
    const draft = connectorWith({ config: { model: 'example-model' } });

    // Act
    const faults = validateConnectorDraft(draft, []);

    // Assert
    expect(faults).toEqual([ADDRESS_REQUIRED_SENTENCE]);
  });

  it('refuses a field holding the mask', () => {
    // Reachable by typing and by nothing else, the open having taken
    // every mask out. Saving it would store the placeholder as the
    // credential and blank the real one.
    // Arrange
    const draft = connectorWith({
      config: { endpoint: 'https://api.example.com', apiKey: REDACTED },
    });

    // Act
    const faults = validateConnectorDraft(draft, []);

    // Assert
    expect(faults).toEqual([MASKED_VALUE_SENTENCE]);
  });

  it('refuses the shipped rows as the read answers them', () => {
    // The live subject for the mask fault, and the clearest statement
    // of what write-only means: a row cannot be saved back the way it
    // arrived, because what arrived is not the secret.
    // Arrange
    const shipped = listConnectors();
    const masked = shipped.filter((row) => maskedValues(row).length > 0);

    // Act
    const accepted = masked.filter(
      (row) => validateConnectorDraft(row, shipped).length === 0,
    );

    // Assert
    expect(accepted).toEqual([]);
    expect(masked.length).toBeGreaterThan(0);
  });

  it('refuses several at once, in the order the form draws them', () => {
    // The name above the divider, then the branch below it.
    // Arrange
    const draft = connectorWith({
      name: '',
      config: { model: 'example-model', apiKey: REDACTED },
    });

    // Act
    const faults = validateConnectorDraft(draft, []);

    // Assert
    expect(faults).toEqual([
      NAME_REQUIRED_SENTENCE,
      ADDRESS_REQUIRED_SENTENCE,
      MASKED_VALUE_SENTENCE,
    ]);
  });

  it('reports one sentence for a blank name a sibling also holds', () => {
    // Two sentences about one field, with one repair between them,
    // reads as two things to fix.
    // Arrange
    const siblings = [connectorWith({ id: 2, name: '', config: {} })];
    const draft = connectorWith({ id: 1, name: '', config: {} });

    // Act
    const faults = validateConnectorDraft(draft, siblings);

    // Assert
    expect(faults).toEqual([NAME_REQUIRED_SENTENCE]);
  });

  it('says nothing about what the draft holds', () => {
    // A refusal an operator reads goes into the DOM, into a screenshot
    // and into whatever is pasted into a support thread, and one of
    // the values it might quote here is a credential. The reader is
    // driven over a producer that genuinely leaks in the same case, so
    // a green sweep is a reading rather than a blind one.
    // Arrange
    const siblings = [connectorWith({ id: 2, name: SENTINEL })];
    // The token rides the name and a config value, which are the two
    // members every sentence below is about.
    const draft = connectorWith({
      id: 1,
      name: SENTINEL,
      config: { model: SENTINEL, apiKey: REDACTED },
    });

    // Act
    const faults = validateConnectorDraft(draft, siblings);

    // Assert
    expect(faults).toEqual([
      NAME_TAKEN_SENTENCE,
      ADDRESS_REQUIRED_SENTENCE,
      MASKED_VALUE_SENTENCE,
    ]);
    expect(leaking(faults)).toEqual([]);
    // The control: the same reader over a sentence that does quote the
    // draft finds it, so the empty answer above is a measurement.
    expect(leaking([`The name ${draft.name} is taken.`])).toHaveLength(1);
  });

  it('accepts a row with nothing configured at all', () => {
    // `classifyConnector` reads an empty config as `unconfigured` and
    // the card draws a word for it, so a connector nobody has
    // finished is an ordinary row rather than a refusal.
    // Arrange / Act / Assert
    expect(validateConnectorDraft(connectorWith({ config: {} }), []))
      .toEqual([]);
  });

  it('accepts a row whose every field has been cleared', () => {
    // Read off the VALUES rather than the key count, so a draft on its
    // way back to unconfigured is not refused on the way.
    // Arrange
    const draft = connectorWith({ config: { endpoint: '  ', model: '' } });

    // Act / Assert
    expect(validateConnectorDraft(draft, [])).toEqual([]);
  });

  it('accepts a name only another kind holds', () => {
    // The key is composite. A name held elsewhere is not held here.
    // Arrange
    const siblings = [
      connectorWith({ id: 2, kind: 'search', name: 'primary', config: {} }),
    ];
    const draft = connectorWith({ id: 1, name: 'primary', config: {} });

    // Act / Assert
    expect(validateConnectorDraft(draft, siblings)).toEqual([]);
  });

  it('accepts a name a sibling holds only up to trailing space', () => {
    // Collision is what the unique index COMPARES, and that comparison
    // is byte-exact: a name carrying a trailing space genuinely is a
    // second row, so calling it a duplicate would apply a rule the
    // database does not.
    // Arrange
    const siblings = [connectorWith({ id: 2, name: 'primary', config: {} })];
    const draft = connectorWith({ id: 1, name: 'primary ', config: {} });

    // Act / Assert
    expect(validateConnectorDraft(draft, siblings)).toEqual([]);
  });

  it('accepts every connector this deployment ships, once opened', () => {
    // The seed has to be savable as it stands, or the editor opens on
    // a row it refuses to let anybody close. Once OPENED is the whole
    // of the qualification: the rows as read carry masks, and the case
    // above is what says so.
    // Arrange
    const shipped = listConnectors();
    const opened = shipped.map(openConnectorDraft);

    // Act
    const refused = opened.filter(
      (draft) => validateConnectorDraft(draft, shipped).length > 0,
    );

    // Assert
    expect(refused).toEqual([]);
    expect(opened.length).toBeGreaterThan(0);
  });

  it('refuses every name the shipped rows already hold, per kind', () => {
    // The fixture property the header states: nothing in this wave
    // frees a name, `../../data/drafts.ts` being unable to insert or
    // remove a row, so the names an operator can collide with are
    // exactly the ones this deployment ships. The day a seam can
    // insert a connector, this case is what says so.
    // Arrange
    const shipped = listConnectors();
    const subject = firstConnector(shipped);
    const taken = shipped
      .filter((row) => row.kind === subject.kind && row.id !== subject.id)
      .map((row) => row.name);

    // Act
    const accepted = taken.filter((name) => {
      const moved = withConnectorName(openConnectorDraft(subject), name);

      return validateConnectorDraft(moved, shipped).length === 0;
    });

    // Assert
    expect(accepted).toEqual([]);
    expect(taken.length).toBeGreaterThan(0);
  });
});
