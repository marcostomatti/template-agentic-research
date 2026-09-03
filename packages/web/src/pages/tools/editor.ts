/**
 * @packageDocumentation
 * The tools editor's decisions: which fields a connector of each kind
 * draws, what a secret field may carry and what it may never write
 * back, what a kind change leaves standing, and what a draft is
 * refused for.
 *
 * Beside the modal rather than inside it, for the reason `./cards.ts`
 * gives about the page. The unit runner collects `.ts` files under
 * `src` in a node environment, so a decision living in a `.tsx` is
 * reachable by no test in this package at all, which leaves
 * `./ConnectorEditorModal.tsx` one control per field and the read
 * states.
 *
 * Written a task ahead of that modal. Nothing on the surface offers
 * any of it yet: `./ToolsPage.tsx` draws the cards it always did, and
 * everything below is read from the editor sub-route alone.
 *
 * ## Four branches, and a field is a config KEY
 *
 * `connectors.config` is an open payload — `../../data/types.ts`
 * declares it a record of unknowns because a client takes whatever
 * that kind of client takes — so this shell cannot hold a shape for
 * it. What it holds instead is a per-kind list of the keys it is
 * prepared to draw a text control for, and every other key is left
 * exactly as stored. {@link connectorFields} is that list and the
 * table behind it is a `Readonly<Record<ConnectorKind, ...>>`, which
 * is what makes a fifth kind a `check-types` error rather than a
 * branch that renders nothing.
 *
 * A field is named by its KEY and nothing else. The card beside the
 * editor draws `connectors.config` key by key through
 * `configEntries`, and the service documents the same keys, so a form
 * that renamed `apiKey` to `API key` would be a third vocabulary for
 * one thing — the same reason `../sources/editor.ts` labels its kind
 * options with the stored tokens. The one place this shell must not
 * paraphrase is the payload it writes.
 *
 * Every declared field is TEXT, because every control the modal draws
 * for one is a text box. That is why the seeded `search` connector's
 * `resultLimit` is deliberately NOT declared: it is stored as a
 * number, and a text control writing `"20"` where `20` was stored
 * would retype the payload with nothing reporting it. It survives
 * every edit here untouched, which is the ordinary fate of a key this
 * table does not name.
 *
 * ## Secrets are WRITE-ONLY, and the mask is never written back
 *
 * `../../data/api.ts` states the rule on `saveConnector` and cannot
 * enforce it: the accessor stores whatever row it is handed. This is
 * where it is enforced, in two places that answer different halves.
 *
 * What a read answers for a secret is a MASK. The fixtures put
 * `REDACTED` wherever the service would hold a credential, and a real
 * endpoint would answer no better — a write-only column is not read
 * back. So the placeholder is not a value: it is the reading's way of
 * saying there is something stored here that you may not see. A save
 * that echoed it would store the literal string as the credential,
 * blanking the real one on every save that did not retype it. That is
 * a wrong answer rather than a missing one, and nothing downstream
 * would report it.
 *
 * {@link openConnectorDraft} therefore takes the mask OUT before an
 * editor ever holds the row: every declared secret key goes, and so
 * does any other entry whose value is the placeholder, which is what
 * covers a credential-shaped key this table does not name. The
 * consequence is the one the rule is for — a secret field renders
 * empty, because the draft genuinely holds nothing for it — and it
 * is stronger than rendering empty over a value that is still there:
 * no path through this module can echo what it does not carry.
 *
 * {@link connectorSavePayload} answers the other half. A field left
 * blank is OMITTED from the payload rather than sent as an empty
 * string, so a save that did not retype a secret leaves the stored
 * value alone. It also drops the placeholder outright, which is a
 * guard rather than a path: {@link validateConnectorDraft} refuses a
 * draft carrying one first, and says why, because silently dropping
 * what an operator typed is worse than declining it.
 *
 * ## What the fixture seam does with an omission, and what it costs
 *
 * Over the wire an omitted key means "keep what you have". Over this
 * seam it does not: `../../data/drafts.ts` records a WHOLE row and
 * `applyDrafts` lays it over the fixture entire, so a key the payload
 * omits is a key the overlaid row no longer has. A save therefore
 * takes the placeholder off the card until the tab is reloaded, and
 * a secret that IS retyped is stored in the tab's draft store and
 * drawn on the card by `configEntries`, unredacted. Neither is what
 * an endpoint would do, and both go when the seam is re-pointed.
 *
 * Say it plainly rather than leave it to be discovered: this is not a
 * place to type a real credential.
 *
 * ## A kind change keeps the row and drops the branch
 *
 * {@link withConnectorKind} keeps the id and the name and empties the
 * config. Every key in a connector's config is configuration FOR the
 * client its kind selects, declared by this table or not, so none of
 * it means anything to a different client — and the keys the two
 * kinds happen to share are the dangerous half, not the safe one. An
 * `llm` endpoint carried into a `search` connector is an address that
 * looks right and answers the wrong service.
 *
 * What that leaves is a row with a name and nowhere to reach, which
 * `classifyConnector` already has a word for: `unconfigured`. The
 * gesture is undone by closing the modal or by `resetDraft`, neither
 * of which this module has to know about.
 *
 * {@link readConnectorKind} is the other half of the control, and it
 * cannot be dropped: `Select` hands its `onChange` a bare `string`
 * while the row holds the union. Its roster is the field table's own
 * keys, so the narrowing and the branches cannot disagree about which
 * kinds exist. The list the control OFFERS is `CONNECTOR_KIND_FACETS`
 * in `./cards.ts`, which is total over the union for the reason
 * `../sources/editor.ts` gives at length — `Select` resolves a value
 * none of its options carry to the FIRST option, silently.
 *
 * ## Nothing is written, and then everything is trimmed once
 *
 * {@link withConnectorField} trims, and a field trimmed to nothing
 * REMOVES its key rather than storing an empty string. One
 * representation of "this holds nothing" is what keeps a cleared
 * field, an absent key and an unconfigured row the same state instead
 * of three that read alike; `classifyConnector` counts KEYS, so a
 * config of empty strings would report `ready` while naming nowhere.
 *
 * Trimming inside the mover is safe here and is not in
 * `../sources/editor.ts`'s endpoint field for a reason worth
 * repeating: the modal holds the typed text in its own state and
 * shows that, writing the trimmed value into the draft beneath it. A
 * control drawn straight from a trimmed draft would swallow the space
 * between two words as the second one was being typed.
 *
 * ## What a refusal may say
 *
 * One sentence per fault, in the order the form draws its controls —
 * the name above the divider, then the branch below it. Each is a
 * constant built from this module's own vocabulary and quotes no part
 * of the draft: a refusal an operator reads goes into the DOM, into a
 * screenshot and into whatever is pasted into a support thread.
 * `../../components/jsonDraft.ts` carries that argument at length,
 * and here it is load-bearing twice over, since one of the values a
 * sentence might quote is a credential.
 *
 * A blank name suppresses the collision sentence rather than adding
 * to it, per `../agents/editor.ts`: two sentences about one field,
 * with one repair between them, reads as two things to fix.
 *
 * ## Every alternative name the editor allows is refused today
 *
 * `connectors_kind_name_unique` makes a name unique within its kind,
 * and `../../data/drafts.ts` can neither insert nor remove a row, so
 * the only names an operator can reach that are already taken are the
 * ones the fixture set ships. That is the same property
 * `../agents/editor.ts` records for a persona's role, one axis over:
 * there the vocabulary itself is learned from the rows, here it is
 * free text and only the collision is. `./editor.test.ts` pins it
 * against the shipped rows so the day a seam can insert a connector
 * the case says so.
 *
 * ## Which array stance this module is in
 *
 * {@link connectorFields} answers the SHARED readonly list every
 * caller gets, like the facet tables in `./cards.ts` and unlike the
 * option builders in `../sources/editor.ts` — nothing here feeds a
 * `@ar/ui` prop declared mutable, so there is nothing to copy for.
 * {@link validateConnectorDraft} answers a MUTABLE array built fresh
 * per call and owned by nobody, which is the stance every refusal
 * list in `../` takes.
 */

import type { Connector, ConnectorKind } from '../../data/types';

import { REDACTED } from '../../data/connectors';

import { configValueLabel } from './cards';

/**
 * What the name field says when it holds nothing.
 *
 * Phrased as the rule rather than as the fault, so the field states
 * what a value has to be instead of scolding what is there — the
 * phrasing `../sources/editor.ts` gives its endpoint refusal.
 */
export const NAME_REQUIRED_SENTENCE = 'A name is which instance of '
  + 'this kind the pipeline asks for, so it cannot be blank.';

/**
 * What the name field says when another connector of the same kind
 * already holds the name.
 *
 * Two clauses because the refusal alone would read as a rule this
 * shell invented: the first names the constraint, the second says
 * which side of it the draft is on. Neither quotes the name — see
 * the header on what a refusal may say.
 */
export const NAME_TAKEN_SENTENCE = 'A kind names each instance once, '
  + 'and another connector of this kind already holds this one.';

/**
 * What the branch says when something is configured and the address
 * is not.
 *
 * The fault is the COMBINATION rather than the blank field: an empty
 * config is a state `classifyConnector` reads as `unconfigured` and
 * the card draws a word for, so a connector nobody has finished is
 * ordinary. What is not ordinary is a config carrying a model and a
 * credential and nowhere to send them, which that same reading
 * reports as `ready`.
 */
export const ADDRESS_REQUIRED_SENTENCE = 'A connector is reached at '
  + 'an address, so one with anything else configured cannot leave '
  + 'that field blank.';

/**
 * What the branch says when a field holds the placeholder a reading
 * shows in place of a stored secret.
 *
 * Reachable by typing and by nothing else: {@link openConnectorDraft}
 * takes every mask out before an editor holds the row, so a
 * placeholder in a draft was put there by somebody copying it off the
 * card next door. Names no field, for the reason the header gives
 * about what a refusal may say.
 */
export const MASKED_VALUE_SENTENCE = 'The placeholder shown in place '
  + 'of a stored secret is not itself a secret, so it cannot be saved '
  + 'as one.';

/** What a field written to nothing, or read as nothing, answers. */
const EMPTY_FIELD_TEXT = '';

/**
 * What one declared field is FOR, which is the whole of what this
 * module needs to know about it.
 *
 * - `address` — where the service is, or where a destination writes.
 *   Exactly one per kind, and the one field a configured connector
 *   may not leave blank.
 * - `secret` — write-only. Rendered empty, omitted from a save when
 *   blank, and never carrying a mask; see the header.
 * - `setting` — everything else that kind of client takes.
 */
export type ConnectorFieldRole = 'address' | 'secret' | 'setting';

/** One control the editor draws below the divider. */
export interface ConnectorField {
  /**
   * The `connectors.config` key it reads and writes, which is also
   * what the control is called — see the header on why this shell
   * does not paraphrase a key.
   */
  readonly key: string;
  /** What that key is for. */
  readonly role: ConnectorFieldRole;
}

/**
 * The keys this shell draws a control for, per kind, in form order.
 *
 * Total over `ConnectorKind`, which is the whole reason it is a
 * record rather than four lists: a kind added to the union is a
 * `check-types` error here rather than a branch that draws nothing.
 * It is also the roster {@link readConnectorKind} narrows against, so
 * the control and the branches cannot disagree about which kinds
 * exist.
 *
 * Deliberately NOT total over the payload: the column is open, this
 * is a list of keys the editor is prepared to draw, and every other
 * key survives an edit untouched. See the header on why a key stored
 * as a number is left off.
 *
 * The address comes first in each branch because it is the field the
 * others are set against, and the secret comes last because it is the
 * one an operator usually leaves alone.
 */
const CONNECTOR_FIELDS: Readonly<
  Record<ConnectorKind, readonly ConnectorField[]>
> = {
  llm: [
    { key: 'endpoint', role: 'address' },
    { key: 'model', role: 'setting' },
    { key: 'apiKey', role: 'secret' },
  ],
  // No `resultLimit`, and its absence is the worked example the header
  // gives: the seeded search connector stores it as a number.
  search: [
    { key: 'endpoint', role: 'address' },
    { key: 'apiKey', role: 'secret' },
  ],
  notebook: [
    { key: 'baseUrl', role: 'address' },
    { key: 'notebookId', role: 'setting' },
    { key: 'password', role: 'secret' },
  ],
  // The one kind with no secret at all. A filesystem destination
  // needs none, and `../../data/connectors.ts` ships a row with an
  // empty config to keep that branch from being written as though
  // every connector has a credential.
  export_target: [
    { key: 'path', role: 'address' },
    { key: 'publicUrl', role: 'setting' },
  ],
};

/** One `connectors.config` entry, as this module rebuilds them. */
type ConfigPair = readonly [string, unknown];

/**
 * The fields the editor draws for one kind, in form order.
 *
 * Answers the SHARED list rather than a copy — see the header on
 * which array stance this module is in.
 *
 * @param kind - The connector's kind.
 * @returns Its fields, in the order the form draws them.
 */
export function connectorFields(
  kind: ConnectorKind,
): readonly ConnectorField[] {
  return CONNECTOR_FIELDS[kind];
}

/**
 * Whether a stored value reads as nothing.
 *
 * Trimmed, and true only of a STRING: a number or a boolean stored
 * under a key is a value however small it is, and treating one as
 * blank would drop a `false` or a `0` an operator meant.
 *
 * @param value - Whatever the config holds.
 * @returns Whether it names anything.
 */
function isBlankValue(value: unknown): boolean {
  return typeof value === 'string' && value.trim() === EMPTY_FIELD_TEXT;
}

/**
 * Whether a stored value is the placeholder a reading shows in place
 * of a secret.
 *
 * Compared against `../../data/connectors.ts`'s own constant rather
 * than a copy of the string, so a fixture that respells its mask
 * moves this with it.
 *
 * @param value - Whatever the config holds.
 * @returns Whether it is the mask.
 */
function isMaskedValue(value: unknown): boolean {
  return value === REDACTED;
}

/**
 * The keys one kind declares as write-only.
 *
 * @param kind - The connector's kind.
 * @returns Its secret keys; empty for a kind that has none.
 */
function secretKeys(kind: ConnectorKind): ReadonlySet<string> {
  const secrets = connectorFields(kind)
    .filter((field) => field.role === 'secret')
    .map((field) => field.key);

  return new Set(secrets);
}

/**
 * The one field a configured connector of this kind is reached at.
 *
 * @param kind - The connector's kind.
 * @returns Its address field, or `undefined` if the table declares
 * none for that kind — a wiring fault in this file rather than a
 * state a draft can be in, and `./editor.test.ts` asserts it never
 * happens.
 */
function addressField(kind: ConnectorKind): ConnectorField | undefined {
  return connectorFields(kind).find((field) => field.role === 'address');
}

/**
 * The row an editor opens on.
 *
 * The stored row with every mask taken out: each declared secret key
 * of its kind goes whatever it held, and so does any other entry
 * whose value is the placeholder. See the header at length — a
 * secret field renders empty because the draft holds nothing for it,
 * which is what leaves no path able to echo a mask back into a save.
 *
 * A modal records THIS row as the source its footer compares against,
 * not the row the read answered. Comparing an opened draft against a
 * stored row carrying a mask would report an untouched editor as
 * having unsaved work from the frame it mounted in.
 *
 * @param stored - The connector as the read answered it.
 * @returns A fresh row, with the same id, kind and name.
 */
export function openConnectorDraft(stored: Connector): Connector {
  const secrets = secretKeys(stored.kind);
  const kept = Object.entries(stored.config).filter(
    ([key, value]) => !secrets.has(key) && !isMaskedValue(value),
  );

  return { ...stored, config: Object.fromEntries(kept) };
}

/**
 * What one field's control shows.
 *
 * The card's own reading of the stored value, through
 * `configValueLabel` in `./cards.ts`, so the editor and the card
 * cannot describe one payload two ways. A key the config does not
 * carry answers the empty string, which is how a secret comes back
 * blank after {@link openConnectorDraft} has taken it out.
 *
 * @param connector - The draft as the operator has it.
 * @param key - The field's config key.
 * @returns Its text, or the empty string where nothing is stored.
 */
export function connectorFieldValue(
  connector: Connector,
  key: string,
): string {
  const value = connector.config[key];

  return value === undefined
    ? EMPTY_FIELD_TEXT
    : configValueLabel(value);
}

/**
 * The connector after its name is rewritten.
 *
 * A fresh row every time with nothing else touched, which is the
 * shape every mover in `../` answers for the same reason: the row a
 * query answered is what the mutation hands back, and one mutated in
 * place is a new value that compares equal to the old one and renders
 * nothing.
 *
 * The name is stored exactly as typed, surrounding space included. A
 * mover that trimmed would eat the space between two words as the
 * second one was being typed; what a name NAMES is
 * {@link validateConnectorDraft}'s question and it trims there.
 *
 * @param connector - The row as it stands.
 * @param name - The name as the operator has it.
 * @returns The row wearing that name.
 */
export function withConnectorName(
  connector: Connector,
  name: string,
): Connector {
  return { ...connector, name };
}

/**
 * The connector after its kind changes.
 *
 * Keeps the id and the name, takes the new kind, and empties the
 * config outright — see the header on why the keys the two kinds
 * share are the dangerous half rather than the safe one. What it
 * leaves is a row `classifyConnector` reads as `unconfigured`, which
 * is the honest state of a row whose client has just been swapped.
 *
 * Nothing here checks that the kind was offered. Membership is the
 * control's business and {@link readConnectorKind} is where a value
 * that named no kind stops, so a mover that refused would leave a
 * field unable to show what an operator just chose.
 *
 * @param connector - The row as it stands.
 * @param kind - Whichever kind the control resolved to.
 * @returns The row wearing that kind, with an empty config.
 */
export function withConnectorKind(
  connector: Connector,
  kind: ConnectorKind,
): Connector {
  return { ...connector, kind, config: {} };
}

/**
 * Whether a string is one of the kinds this deployment knows.
 *
 * The roster is the field table's own keys, so a kind the branches
 * cannot draw is a kind this refuses. The membership test runs
 * against a WIDENED copy of them, so nothing here tells the compiler
 * something the runtime has not checked.
 *
 * @param value - Whatever the control reported.
 * @returns Whether the union carries it.
 */
function isConnectorKind(value: string): value is ConnectorKind {
  const spellings: readonly string[] = Object.keys(CONNECTOR_FIELDS);

  return spellings.includes(value);
}

/**
 * The kind an option value names, or `undefined`.
 *
 * The narrowing the control needs and cannot do itself. Answering
 * `undefined` for anything else is what keeps a value nothing offered
 * from writing a kind at all: a fallback here would be this module
 * picking a client on the operator's behalf, and the client is what
 * decides whether the config below it means anything.
 *
 * @param value - Whatever the control reported.
 * @returns The kind it names, or `undefined` for anything else.
 */
export function readConnectorKind(
  value: string,
): ConnectorKind | undefined {
  return isConnectorKind(value)
    ? value
    : undefined;
}

/**
 * The config with one key rewritten where it stands, or appended.
 *
 * Rewriting in place is what keeps the payload's own key order, which
 * `configEntries` in `./cards.ts` states is the order an operator
 * wrote it in: a rebuild that moved the edited key to the end would
 * walk an address away from the credential that belongs with it.
 *
 * @param config - The payload as it stands.
 * @param key - The field being written.
 * @param value - Its new value, already trimmed.
 * @returns The entries, in payload order.
 */
function writtenEntries(
  config: Readonly<Record<string, unknown>>,
  key: string,
  value: string,
): readonly ConfigPair[] {
  const stored = Object.entries(config);

  if (!stored.some(([name]) => name === key)) {
    return [...stored, [key, value]];
  }

  return stored.map<ConfigPair>(
    ([name, held]) => (name === key
      ? [name, value]
      : [name, held]),
  );
}

/**
 * The connector after one config field is written.
 *
 * Trims, and a field trimmed to nothing REMOVES its key rather than
 * storing an empty string — see the header on why one representation
 * of "this holds nothing" is load-bearing. Trimming here is safe
 * because the modal shows its own typed text and writes this beneath
 * it; a control drawn straight from a trimmed draft could not be
 * typed a space.
 *
 * Takes a KEY rather than a {@link ConnectorField}, so a payload key
 * this table does not declare is writable by the same call. Nothing
 * else in the payload moves, whether this shell knows what it is for
 * or not.
 *
 * @param connector - The row as it stands.
 * @param key - The `connectors.config` key being written.
 * @param text - The field's contents, as typed.
 * @returns The row carrying that value, or carrying that key no
 * longer.
 */
export function withConnectorField(
  connector: Connector,
  key: string,
  text: string,
): Connector {
  const value = text.trim();
  const written = writtenEntries(connector.config, key, value);
  const kept = written.filter(
    ([name]) => name !== key || value !== EMPTY_FIELD_TEXT,
  );

  return { ...connector, config: Object.fromEntries(kept) };
}

/**
 * The row a save sends.
 *
 * The draft with every blank and every mask dropped, which is the
 * write-only rule stated once in the place the modal actually calls:
 * a secret left alone is OMITTED rather than sent empty, so the
 * stored value survives a save that did not retype it.
 *
 * The mask drop is a guard and not a path —
 * {@link validateConnectorDraft} refuses a draft carrying one, and
 * says why — but it is the layer that holds whatever a caller hands
 * it, which is the same bargain `../../data/api.ts` describes from
 * the other side.
 *
 * What an omission MEANS is the seam's, not this module's: over the
 * wire it keeps the stored value, and over `../../data/drafts.ts` it
 * takes the key off the row. The header says so at length.
 *
 * @param draft - The connector as the operator left it.
 * @returns A fresh row to hand `saveConnector`.
 */
export function connectorSavePayload(draft: Connector): Connector {
  const kept = Object.entries(draft.config).filter(
    ([, value]) => !isBlankValue(value) && !isMaskedValue(value),
  );

  return { ...draft, config: Object.fromEntries(kept) };
}

/**
 * Whether another connector of the same kind already holds this
 * draft's name.
 *
 * Three conditions and each is load-bearing. The id keeps a connector
 * from colliding with ITSELF, which is the ordinary state of an
 * editor that has changed nothing. The kind is what makes the key
 * composite — `../../data/connectors.ts` says at length what goes
 * wrong when a name is treated as unique on its own — and it is read
 * off the DRAFT, so a row {@link withConnectorKind} has just moved is
 * compared against the kind it is now. And the name is compared
 * exactly, because that is what the unique index compares: a name
 * carrying a trailing space genuinely is a second row.
 *
 * @param draft - The connector as the operator has it.
 * @param connectors - The connectors the surface loaded.
 * @returns Whether the name is already spoken for.
 */
function isNameTaken(
  draft: Connector,
  connectors: readonly Connector[],
): boolean {
  return connectors.some((connector) => connector.id !== draft.id
    && connector.kind === draft.kind
    && connector.name === draft.name);
}

/**
 * Whether this draft has anything configured at all.
 *
 * Read off the VALUES rather than the key count, unlike
 * `classifyConnector`, and the difference is deliberate: a draft is
 * free to carry a key holding nothing where a stored row is not,
 * since {@link connectorSavePayload} drops those on the way out. So a
 * row whose every field has been cleared is unconfigured here and
 * will be unconfigured once stored.
 *
 * @param draft - The connector as the operator has it.
 * @returns Whether any field holds a value.
 */
function isConfigured(draft: Connector): boolean {
  return Object.values(draft.config).some(
    (value) => !isBlankValue(value),
  );
}

/**
 * Whether this draft names where to reach the service.
 *
 * Answers `true` for a kind declaring no address field, so a table
 * that lost one refuses nothing rather than refusing everything; see
 * {@link addressField} on why that is a wiring fault and where it is
 * caught instead.
 *
 * @param draft - The connector as the operator has it.
 * @returns Whether its address field holds a value.
 */
function hasAddress(draft: Connector): boolean {
  const field = addressField(draft.kind);

  if (field === undefined) {
    return true;
  }

  const value = draft.config[field.key];

  return value !== undefined && !isBlankValue(value);
}

/**
 * Whether any field of this draft holds the mask.
 *
 * @param draft - The connector as the operator has it.
 * @returns Whether a placeholder would be saved as a value.
 */
function carriesMask(draft: Connector): boolean {
  return Object.values(draft.config).some(isMaskedValue);
}

/**
 * What is wrong with this draft, one sentence at a time.
 *
 * The order is the order the form draws its controls — the name
 * above the divider, then the branch below it — so the sentences
 * read down the same way the fields do. An empty list is a draft with
 * nothing wrong, which is what a save is gated on.
 *
 * Four faults and never a fifth: a blank name, a name another
 * connector of the same kind holds, a config that is set against no
 * address, and a field holding the mask. The two this deliberately
 * does not have are the KIND, which {@link readConnectorKind} has
 * already refused anything unknown for, and any rule about what a
 * config key may be called: the payload is open, and a shell
 * inventing a vocabulary for it would refuse the key the next client
 * takes.
 *
 * A blank name reports one sentence rather than two, per the header.
 *
 * Built fresh per call, and each sentence is a constant this module
 * owns: nothing here quotes the draft, which matters twice over on a
 * surface whose fields hold credentials.
 *
 * @param draft - The connector as the operator has it.
 * @param connectors - The connectors the surface loaded, for the
 * uniqueness reading. A list this draft is not in refuses nothing on
 * its account.
 * @returns One sentence per fault, in form order; `[]` when the draft
 * is savable.
 */
export function validateConnectorDraft(
  draft: Connector,
  connectors: readonly Connector[],
): string[] {
  const faults: string[] = [];

  if (draft.name.trim() === EMPTY_FIELD_TEXT) {
    faults.push(NAME_REQUIRED_SENTENCE);
  } else if (isNameTaken(draft, connectors)) {
    faults.push(NAME_TAKEN_SENTENCE);
  }

  if (isConfigured(draft) && !hasAddress(draft)) {
    faults.push(ADDRESS_REQUIRED_SENTENCE);
  }

  if (carriesMask(draft)) {
    faults.push(MASKED_VALUE_SENTENCE);
  }

  return faults;
}
