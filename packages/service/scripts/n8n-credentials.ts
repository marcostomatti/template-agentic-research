/**
 * @packageDocumentation
 * The two credentials this port declares, and the import file a
 * local bootstrap builds for them out of an environment.
 *
 * n8n resolves a credential BY ID. Every credential-bearing node
 * across the six workflow sources spells one of exactly two
 * `(type, id, name)` triples — `postgres` / `ar-postgres` /
 * `AR Postgres` and `openAiApi` / `ar-model` / `AR Model` — so an
 * import that minted ids of its own would leave every one of those
 * nodes bound to nothing while the import, the activation and the
 * publish each reported success. {@link CREDENTIAL_ROSTER} is where
 * those triples are written down once, and everything below reads
 * them from there rather than spelling either of them again.
 *
 * The DECISION is here and the SEQUENCE is not, which is the split
 * `activate-workflows.sh` already follows. What the two credentials
 * are, which settings a file is built from, and what the file says
 * are answered from a value by the functions below, so a case can
 * drive every one of them with no container anywhere in the run.
 * Writing the file into a container, running the CLI verb and
 * removing the file again are a shell script's, because wrapping a
 * container command in TypeScript hides the command that actually
 * ran. That split is load-bearing rather than tidy: measured with
 * `eslint --no-ignore`, a `.sh` file matches no block in this
 * repository's flat config at all, so a rule left in shell is a
 * rule nothing in the verification order can read.
 *
 * The file this module builds carries a database password and a
 * model API key, so it is a VALUE and never a path. Nothing here
 * writes a file, and the content is meant to be streamed straight
 * into a container and deleted there — it must never be written
 * anywhere under the working tree, which matters more than usual
 * because the agent loop runs `git add -A` after every task.
 *
 * The member NAMES each `data` object carries are the whole reason
 * this module exists rather than a JSON template beside the shell,
 * and the reason is measured. On the pinned image an n8n credential
 * is UNVALIDATED on the way in and REPAIRED on the way out: the
 * import stores whatever `data` it was handed, and at read time
 * `credentials-helper.js` resolves it through
 * `NodeHelpers.getNodeParameters(props, data, true, ...)`, whose
 * `returnDefaults` DROPS every key the credential type does not
 * declare and FILLS the intended one from its default. So
 * `password` misspelled `passwd` is not an error and not an empty
 * result — it is a credential that imports at exit 0, decrypts
 * cleanly, and authenticates as a user with no password. A test
 * over the emitted KEY SET is the only thing in this repository
 * that can report that, which is why the two `data` shapes below
 * are interfaces with exact members: a fresh object literal typed
 * as one of them puts a misspelling in front of `check-types` as
 * well.
 *
 * Both shapes below were then driven THROUGH that resolver on the
 * pinned image, over the shipped property arrays and the shipped
 * `n8n-workflow`, and neither loses a member: the six postgres
 * fields and the one model field come back exactly as fed, beside
 * the defaults n8n fills in for what they leave out. The control
 * that makes that reading worth anything rode in the same probe —
 * the same object with `password` spelled `passwd` and `ssl`
 * spelled `sslmode` comes back with both DROPPED and `password`
 * filled with the empty string. And the file itself was imported
 * into a throwaway instance off that image at exit 0 and read back
 * through `export:credentials --decrypted`: both ids stored
 * verbatim, both key sets intact, the port still a number.
 *
 * Every field name and default quoted below was read off the
 * credential classes the pinned image ships (`postgres`: sixteen
 * fields, no `authenticate` method; `openAiApi`: six, with one).
 * Two consequences shape what is emitted. A field whose
 * `displayOptions` gate is not also set is dropped exactly as an
 * unknown name is, so `ssl` is written and `allowUnauthorizedCerts`
 * is left unset — its default `false` is what shows `ssl` at all.
 * And nothing is coerced, so `port` is emitted as a JSON number
 * rather than as the string a URL hands over.
 *
 * What is NOT here, and none of it by omission. No connection is
 * opened and no credential is tested: that a credential at these
 * spellings reaches the database or the model server is a
 * bootstrap run's reading and not this module's. No id is minted,
 * because the ids are the roster's. And there is no HTTP path at
 * all: every call this package makes against an instance lives in
 * `n8n-client.ts` and none of them is about a credential, so the
 * import goes through the CLI inside the container instead —
 * the same route `activate-workflows.sh` takes, for the same
 * reason.
 *
 * Nothing here imports anything. A caller reaches this module as
 * `./n8n-credentials.js`, the relative form every first-party
 * import in this package takes, and a caller wanting the text of
 * the file asks {@link credentialsFileContent} for it. There is no
 * `INVOKED_AS_CLI` block: printing a file full of secrets to
 * stdout is a decision the caller makes, not one this module makes
 * for it.
 */

/**
 * A credential type name, spelled the way a node's `credentials`
 * member spells it and the way the credential class the image ships
 * declares it.
 *
 * Two members, and the union is closed on purpose: it is what makes
 * the table of `data` builders exhaustive by construction, so a
 * third credential type cannot be added to the roster without the
 * builder for it becoming a `check-types` error rather than a
 * missing case at run time.
 *
 * These are n8n's own names rather than this repository's, so
 * neither is a spelling anyone here may choose: `postgres` is the
 * base package's Postgres credential and `openAiApi` its OpenAI
 * one, which the langchain chat-model node declares as its own
 * required credential.
 */
export type CredentialTypeName = 'openAiApi' | 'postgres';

/**
 * One credential this port declares, as the roster holds it.
 *
 * Three of its four members are what n8n stores and what a node
 * binds against — {@link CredentialRosterEntry.id},
 * {@link CredentialRosterEntry.name} and
 * {@link CredentialRosterEntry.type} — and they are the three a
 * reader holding the built artifacts against this roster compares.
 * The fourth is prose for whoever is reading this file and reaches
 * no container: {@link CredentialRosterEntry.role} is not a member
 * of the import file.
 *
 * No `data` member and no builder per entry. What a credential's
 * `data` looks like is a property of its TYPE — the field set the
 * credential class declares — rather than of the row, so the
 * builders are keyed by type below and two entries of one type
 * would share one shape. That is also what keeps this roster
 * readable with no environment at all: an entry is four strings,
 * and nothing here needs a setting in order to be read.
 */
export interface CredentialRosterEntry {
  /**
   * The id n8n stores the credential under, and the id every node
   * that binds it names.
   *
   * Fixed rather than generated, and this is the member the whole
   * module is arranged around. Measured on the pinned image:
   * `import:credentials` stores the id a file declares verbatim,
   * an arbitrary id bearing no relation to the name is preserved
   * just as readily, and an entry declaring NO id is a hard
   * refusal (`credentials_entity.id` is NOT NULL with no default)
   * that aborts the whole file rather than a generated id. So the
   * failure this member exists to prevent can only ever present as
   * an id that is present and wrong.
   */
  readonly id: string;

  /**
   * The display name n8n shows for the credential, and the name a
   * node's `credentials` member carries beside the id.
   *
   * Carried by the node as well as by the row, which is why it is
   * part of the triple rather than cosmetic: a name that disagreed
   * with what the artifacts spell would show an operator opening
   * the editor one label on the credential and another on the node
   * bound to it.
   *
   * It is NOT what the import matches on. The id is (see
   * {@link CredentialRosterEntry.id}), so a rename here moves the
   * label and nothing else.
   */
  readonly name: string;

  /**
   * What this credential is for, in terms of which nodes bind it
   * and what it supplies to them.
   *
   * Prose, and the one member of an entry that reaches nothing: it
   * is dropped when the entry becomes an import entry, because the
   * measured import file carries four members and this is not one
   * of them. It is here because the two entries differ in kind and
   * a reader who has only the id cannot tell how much a wrong
   * value costs — one of them is dialled by every workflow, the
   * other by the three that reach a model.
   */
  readonly role: string;

  /** The credential type n8n resolves the row's fields against. */
  readonly type: CredentialTypeName;
}

/**
 * The credentials this port declares, and the only place their ids,
 * names and types are written down.
 *
 * Two entries, in the order the import file carries them: the one
 * every workflow needs before the one only the model passes do.
 * The order is the file's rather than a preference — a
 * partially-invalid file imports NOTHING on this image, so the
 * order carries no failure mode of its own, and reading the
 * universally-needed credential first is what a reader expects.
 *
 * Declared rather than derived. Reading the triples off the built
 * artifacts instead would make this roster agree with whatever the
 * artifacts happen to say, which is exactly the disagreement worth
 * being able to report: a workflow that gained a node bound to a
 * third credential is a workflow this bootstrap cannot arm, and a
 * roster derived from it would report a clean run.
 */
export const CREDENTIAL_ROSTER: readonly CredentialRosterEntry[] = [
  {
    id: 'ar-postgres',
    name: 'AR Postgres',
    role:
      'The database every workflow in this port reads and writes. ' +
      'Resolved by n8n from inside its own container, so its host is ' +
      'the compose service name and never a loopback address.',
    type: 'postgres',
  },
  {
    id: 'ar-model',
    name: 'AR Model',
    role:
      'The API key the model-reaching workflows authenticate with. ' +
      'It supplies the key and nothing else: the address and the ' +
      'model name reach those nodes as data, off the `llm` connector ' +
      'row their canvas selects.',
    type: 'openAiApi',
  },
];

/**
 * An environment, as this module reads one.
 *
 * A bag of names rather than the parsed configuration in
 * `src/config.ts`, and for the same reason `InstanceSettings` in
 * `deploy-external.ts` is one: that schema parses `process.env` at
 * import time, so a parameter typed as its output would make every
 * case below a statement about the environment the suite happened
 * to run in. Taking the environment as an argument is what lets a
 * case hand over two strings and get an import file back.
 *
 * The names this module reads out of it are
 * {@link CREDENTIAL_SETTING_NAMES}, which is why the type is a bare
 * record rather than an interface per setting: the setting NAMES
 * belong to this module, and a caller hands over whatever it has.
 */
export type CredentialEnv = Readonly<Record<string, string | undefined>>;

/**
 * The environment entries a credential file is built from, and the
 * only place either name is spelled.
 *
 * `DATABASE_URL` is the same setting the running service connects
 * with, read here for a different consumer: what it yields is the
 * `ar-postgres` credential's host, port, database, user and
 * password, with the host translated for a reader inside the n8n
 * container (see {@link IN_CONTAINER_DATABASE_HOST}). Reusing it
 * rather than declaring a second database setting is deliberate —
 * two spellings of one database is how a bootstrap ends up arming
 * workflows against a database nobody migrated.
 *
 * `AR_LLM_API_KEY` is the `ar-model` credential's key, and it goes
 * HERE rather than into the `llm` connector row: the model nodes
 * read only the endpoint and the model name off that row, so a key
 * written into it would be a stored secret with no reader that
 * `src/connectors/secrets.ts` would then have to mask on every
 * read.
 *
 * Both are read off an environment rather than through
 * `src/config.ts`, which declares its own n8n entries optional
 * because the running service opens none of them. The refusal for
 * an absent one is therefore this module's
 * ({@link UnsetCredentialSettingError}), exactly as the refusal for
 * an absent `AR_N8N_URL` is `deploy-external.ts`'s.
 *
 * Keyed by the member of {@link CredentialSettings} each one
 * answers for, so the two live side by side and a rename cannot
 * leave a resolved member reading the wrong name.
 */
export const CREDENTIAL_SETTING_NAMES = {
  /** Read for the five connection fields of `ar-postgres`. */
  databaseUrl: 'DATABASE_URL',

  /** Read for the `ar-model` credential's one field. */
  modelApiKey: 'AR_LLM_API_KEY',
} as const;

/**
 * The two settings, resolved: present, non-blank, and narrowed to
 * `string`.
 *
 * The narrowing is the point of the type. An environment answers
 * `string | undefined` for any name, and a builder left holding
 * that has only a `??` or a `!` between it and a credential built
 * on a blank — which is the silent failure
 * {@link resolveCredentialSettings} exists to be instead of, and it
 * is silent all the way down: a blank password imports at exit 0
 * and reads back as the credential type's own default.
 *
 * Neither member is validated beyond being present. Whether the
 * database URL is one this builder can use at all is
 * {@link UnusableDatabaseUrlError}'s question, asked where the URL
 * is read rather than here, and whether the key is the right key is
 * a question only the model server can answer.
 */
export interface CredentialSettings {
  /** Whatever `DATABASE_URL` was set to. */
  readonly databaseUrl: string;

  /** Whatever `AR_LLM_API_KEY` was set to. */
  readonly modelApiKey: string;
}

/**
 * Whether a setting was answered for at all.
 *
 * Absent and set-to-blank are one answer, which is the reading
 * `resolveEnvVar` in `workflow-markers.ts` gives the build settings
 * and `isSet` in `deploy-external.ts` gives the instance ones. A
 * `.env` line whose value has been deleted reads as a setting taken
 * back out of the file rather than as one set to the empty string,
 * and nothing downstream can tell those apart.
 *
 * The trim is the TEST and never the answer: what was configured is
 * what reaches the credential, so a value carrying surrounding
 * whitespace is emitted as it was set. A password ending in a space
 * is a password.
 *
 * @param value - The setting as an environment answered for it.
 * @returns Whether it is present and not blank.
 */
function isSet(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== '';
}

/**
 * Thrown when a credential file is asked of an environment that
 * names no database or no model key.
 *
 * It carries every setting that went unanswered rather than the
 * first of them. The two are configured independently, so an
 * operator who has set neither is one who has not configured this
 * command at all, and a refusal naming one of two buys a second run
 * to learn the other — the reading `UnconfiguredInstanceError` in
 * `deploy-external.ts` gives its own pair.
 *
 * That is the opposite of {@link UnusableDatabaseUrlError}, which
 * reports one fault, and the asymmetry is deliberate: the parts of
 * one URL are not independently configured, so naming several of
 * them would be several complaints about one value an operator
 * edits once.
 *
 * Nothing it holds came from an environment. The setting names are
 * this module's own ({@link CREDENTIAL_SETTING_NAMES}) and the
 * values are exactly what is missing, so there is no route by which
 * a password or a key reaches the message, the stack or a
 * `JSON.stringify` over the error — which prints the one field
 * beside the class name `this.name` assigns.
 */
export class UnsetCredentialSettingError extends Error {
  /**
   * The names of the settings nothing was configured for, in the
   * order this module reads them: the database before the key.
   *
   * Names and never values, and a list rather than one name. It is
   * what the message is built from, so a caller reading the field
   * and a reader reading the message answer the same question off
   * one value.
   */
  readonly settings: readonly string[];

  /**
   * @param settings - The names of every setting that was absent or
   *   blank, in reading order and at least one of them.
   */
  constructor(settings: readonly string[]) {
    const named = settings.join(' and ');
    const verb = settings.length === 1
      ? 'is'
      : 'are';

    super(
      `${named} ${verb} not set, so no credential file was built ` +
      'and nothing was imported. `DATABASE_URL` is the database ' +
      'the workflows read and write, and `AR_LLM_API_KEY` is the ' +
      'key the model-reaching ones authenticate with. Set them in ' +
      'the untracked environment, in `.env` or in the launching ' +
      'shell, and never in a tracked file — the file built from ' +
      'them carries both secrets and is written into the container ' +
      'rather than to any path. A setting that is present but ' +
      'blank is read here as unset, so a `.env` line with nothing ' +
      'after the `=` is one of these.',
    );
    this.name = this.constructor.name;
    this.settings = settings;
  }
}

/**
 * Refuse a credential file that has no database or no model key
 * configured, and hand back the settings it cleared.
 *
 * It returns {@link CredentialSettings} rather than answering
 * `void`, which is the load-bearing half rather than a
 * convenience: every builder below takes one of those and this is
 * the only place one is made, so a `data` object built on an
 * unresolved setting is not one this module can produce. That is
 * the same argument `requireInstance` in `deploy-external.ts`
 * makes for handing back an instance.
 *
 * Each setting is read through {@link isSet} twice: the composed
 * test is what the compiler narrows on, and the two beneath it are
 * what name the offenders. The duplication is control flow rather
 * than a second rule, both readings going through one predicate.
 *
 * @param env - The environment to read the two settings out of.
 * @returns The settings every builder below is written against.
 * @throws UnsetCredentialSettingError When either setting is
 *   absent or blank, naming every one that is.
 */
export function resolveCredentialSettings(
  env: CredentialEnv,
): CredentialSettings {
  const databaseUrl = env[CREDENTIAL_SETTING_NAMES.databaseUrl];
  const modelApiKey = env[CREDENTIAL_SETTING_NAMES.modelApiKey];

  if (!isSet(databaseUrl) || !isSet(modelApiKey)) {
    const unset: string[] = [];

    if (!isSet(databaseUrl)) {
      unset.push(CREDENTIAL_SETTING_NAMES.databaseUrl);
    }

    if (!isSet(modelApiKey)) {
      unset.push(CREDENTIAL_SETTING_NAMES.modelApiKey);
    }

    throw new UnsetCredentialSettingError(unset);
  }

  return { databaseUrl, modelApiKey };
}

/**
 * The host the `ar-postgres` credential dials, wherever a loopback
 * address was configured.
 *
 * n8n resolves that credential from INSIDE its own container, where
 * `localhost` is the n8n container and not the machine the compose
 * stack is running on. So a `DATABASE_URL` written for the host —
 * which is what `.env.example` ships and what every other consumer
 * of that setting wants — names a database this credential cannot
 * reach, and the failure is a node opening a socket to nothing long
 * after the import, the activation and the publish have all
 * succeeded.
 *
 * The value is the compose SERVICE key in `docker-compose.yml`,
 * which is the name resolvable on the project network. It is
 * exported so that anything holding this module against that file
 * has a name to read rather than a literal buried in a builder, and
 * because the service key and the container name are deliberately
 * different strings there — `docker exec` takes the container name,
 * a compose command takes this one, and a credential takes this one
 * too.
 */
export const IN_CONTAINER_DATABASE_HOST = 'postgres';

/**
 * The host spellings that mean "this machine" and therefore have to
 * be translated for a reader inside the container.
 *
 * A literal roster and not a range: `127.0.0.1` is here and
 * `127.0.1.1` is not, because a rule guessing at loopback ranges
 * would also have to decide what to do with a private address that
 * is genuinely reachable from the container. `0.0.0.0` is included
 * because a `.env` written from a bind address carries it.
 *
 * The IPv6 loopback appears in its BRACKETED form only, and that is
 * measured rather than a guess about which spelling is idiomatic: a
 * URL refuses a bare `::1` as a host outright, so a hostname read
 * out of one can never be the unbracketed spelling and an entry for
 * it would be a line nothing could reach.
 *
 * Compared lower-cased, which is not cosmetic either: `postgresql:`
 * is a non-special URL scheme, so — measured — a URL does NOT
 * lower-case its host the way it does for `http:`, and `LocalHost`
 * arrives spelled as it was written.
 *
 * A host outside this roster is passed through exactly as the URL
 * spelled it, brackets included. An operator who named a real host
 * meant it from inside the container too, and this module makes no
 * claim about which spellings of an address the node's own driver
 * accepts.
 */
const LOOPBACK_DATABASE_HOSTS: readonly string[] = [
  '0.0.0.0',
  '127.0.0.1',
  '[::1]',
  'localhost',
];

/**
 * The port used when the database URL names none.
 *
 * Postgres's own default and the same one the credential type
 * declares, so this constant only ever agrees with n8n rather than
 * overriding it. It is written out because the field is emitted
 * unconditionally: leaving `port` off for a URL that named none
 * would land in the same silent-default path every other omitted
 * member does, and the point of this builder is that nothing it
 * emits is filled in behind it.
 */
const DEFAULT_DATABASE_PORT = 5432;

/**
 * The value the `ssl` field is emitted with — n8n's vocabulary.
 *
 * The credential type declares `ssl` as an enumeration of `allow`,
 * `disable` and `require`, defaulting to `disable`, and this
 * bootstrap arms workflows against a Postgres on the compose
 * project network with no TLS at all. It is written rather than
 * left to that default so the plaintext connection is a statement
 * this file makes.
 *
 * Emitting it depends on `allowUnauthorizedCerts` being left unset:
 * `ssl` is shown only while that boolean is `false`, which is its
 * default, and a field whose `displayOptions` gate is not satisfied
 * is dropped at read time exactly as an unknown name is.
 */
const PLAINTEXT_SSL = 'disable';

/**
 * The `sslmode` query parameter this builder accepts — libpq's
 * vocabulary.
 *
 * One word, two constants, on purpose. `sslmode` is a connection-URI
 * parameter with six values, of which three happen to be spelled
 * the way n8n's three-value field spells them, and a comparison
 * written against the wrong vocabulary would be invisible. Nothing
 * here maps one onto the other: a URL asking for anything but
 * plaintext is refused rather than quietly emitted as `disable`,
 * which would be a TLS downgrade with no reporter, or as `require`,
 * which would over-claim a verification n8n's field cannot express.
 */
const PLAINTEXT_SSLMODE = 'disable';

/** The query parameter {@link PLAINTEXT_SSLMODE} is read from. */
const SSLMODE_PARAM = 'sslmode';

/**
 * Which part of a database URL a refusal is about.
 *
 * A closed set of names rather than a free-text reason, so a case
 * can pin which fault fired and a reader can grep for one. Each
 * name is a PART of the URL and never a value out of it, which is
 * what keeps a password out of every message built from one.
 */
export type DatabaseUrlFault =
  | 'database'
  | 'escape'
  | 'host'
  | 'sslmode'
  | 'unparseable'
  | 'user';

/**
 * What each fault means, in the terms an operator would fix it in.
 *
 * Keyed by the union, so a fault added without a sentence is a
 * `check-types` error rather than an `undefined` in a message.
 */
const DATABASE_URL_FAULT_REASONS: Readonly<
  Record<DatabaseUrlFault, string>
> = {
  database: 'it names no database, or names a path with more than ' +
    'one segment where the credential takes a plain database name',
  escape: 'one of its percent-escapes does not decode, so the user, ' +
    'the password or the database name cannot be read back out of it',
  host: 'it names no host',
  sslmode: 'it asks for TLS through an `sslmode` parameter, and ' +
    'this builder writes a plaintext credential for a database on ' +
    'the compose project network rather than mapping the six modes ' +
    'libpq declares onto the three values the n8n field takes',
  unparseable: 'it is not a URL at all, so nothing could be read ' +
    'out of it',
  user: 'it names no user',
};

/**
 * Thrown when the configured database URL is one no usable
 * credential can be built from.
 *
 * It reports ONE fault, where
 * {@link UnsetCredentialSettingError} reports every setting that
 * was missing. The parts of a URL are not independently
 * configured — an operator edits one value — so several complaints
 * about one string would be noise, and the fault names where in it
 * to look.
 *
 * Every one of these is a refusal where the alternative is a silent
 * wrong value rather than an error, which is why the checks are
 * worth their lines. A missing member of a credential's `data` is
 * filled from the credential type's own default at read time, so a
 * URL naming no host builds a credential dialling `localhost`, one
 * naming no database builds a credential dialling `postgres`, and
 * one naming no user builds a credential connecting as `postgres` —
 * three plausible-looking credentials that import at exit 0 and
 * dial the wrong thing.
 *
 * Nothing it carries came out of the URL. The fault is a name from
 * a closed set and the message is built from
 * {@link DATABASE_URL_FAULT_REASONS}, so a password in the URL
 * cannot reach the message, the stack or a `JSON.stringify` over
 * the error. The caught parse error is dropped rather than wrapped
 * for the same reason, and the reason is measured: what a runtime
 * puts in an invalid-URL message differs by runtime — bun echoes
 * the input, redacting it only when it carries userinfo, while node
 * 22 says `Invalid URL` and nothing else — so a message forwarded
 * from one of them would leak a secret in the query or the path on
 * one runtime and not on the other.
 */
export class UnusableDatabaseUrlError extends Error {
  /** Which part of the URL the refusal is about. */
  readonly fault: DatabaseUrlFault;

  /**
   * @param fault - The part of the URL that made it unusable.
   */
  constructor(fault: DatabaseUrlFault) {
    super(
      '`DATABASE_URL` cannot be read as a database credential: ' +
      `${DATABASE_URL_FAULT_REASONS[fault]}. No credential file was ` +
      'built and nothing was imported. The value itself is not ' +
      'quoted here, or in any other refusal from this module, ' +
      'because it carries the database password.',
    );
    this.name = this.constructor.name;
    this.fault = fault;
  }
}

/**
 * The `data` an `ar-postgres` entry carries.
 *
 * Exact members, and that is what the interface is for rather than
 * documentation: a fresh object literal typed as this is checked for
 * excess properties, so `password` misspelled `passwd` is a
 * `check-types` error here where the import, the stored row and the
 * read path all answer 0 for it.
 *
 * Six of the sixteen fields the credential type declares. The other
 * ten are the eight ssh-tunnel fields, all gated on an `sshTunnel`
 * boolean this builder leaves at its default `false`;
 * `maxConnections`, whose default of 100 is what this deployment
 * wants; and `allowUnauthorizedCerts`, which must stay unset for
 * {@link PostgresCredentialData.ssl} to be visible at all.
 *
 * `port` is a number rather than the string a URL answers with,
 * because — measured on the pinned image — the read path performs no
 * type coercion at all: a port stored as a string reaches the
 * driver as a string.
 */
export interface PostgresCredentialData {
  /**
   * The database name, decoded from the URL path.
   *
   * One path segment, decoded after the segment count is checked,
   * which is what makes the two spellings of a slash mean different
   * things and is measured on both: an ESCAPED slash decodes into
   * the name, and an unescaped one is a second segment and a
   * refusal.
   */
  readonly database: string;

  /** The host as a reader inside the n8n container needs it. */
  readonly host: string;

  /** The password, decoded from the URL userinfo. */
  readonly password: string;

  /** The port, as a JSON number. */
  readonly port: number;

  /** Plaintext, spelled in the enumeration the field declares. */
  readonly ssl: typeof PLAINTEXT_SSL;

  /** The user, decoded from the URL userinfo. */
  readonly user: string;
}

/**
 * The `data` an `ar-model` entry carries.
 *
 * One member of the six the credential type declares, and the four
 * omissions are each a decision. `url` is dead weight: the three
 * model nodes set `options.baseURL` from the `llm` connector row,
 * and the node reads that parameter FIRST and falls back to the
 * credential only when it is unset — read off the shipped node,
 * which takes `options.baseURL` and only then `credentials.url`. So
 * a base URL written here would never be consulted, while the
 * field's own default points at the public API, which is what a
 * local-only deployment must not silently dial. `organizationId`
 * reaches the model call through neither the client configuration
 * nor its fields on that path. And `headerName` and `headerValue`
 * are gated on a `header` boolean left at `false`, so writing
 * either without the gate would lose it silently.
 *
 * `allowedHttpRequestDomains` is not omitted so much as left alone:
 * n8n injects it, plus `allowedDomains`, into every credential type
 * carrying an `authenticate` method — which this one does and
 * `postgres` does not — and its injected default `all` is what
 * disarms the domain check. Setting it to `none` for a local-only
 * deployment, which is the tempting move, would make every pass
 * throw once a `url` were also set.
 */
export interface ModelCredentialData {
  /** The model API key, exactly as the environment set it. */
  readonly apiKey: string;
}

/** The `data` of either credential this port declares. */
export type CredentialData = ModelCredentialData | PostgresCredentialData;

/**
 * Read the configured database URL, or refuse it.
 *
 * The caught error is dropped rather than wrapped, for the reason
 * {@link UnusableDatabaseUrlError} states: what a runtime puts in an
 * invalid-URL message is a runtime's own business and one of them
 * echoes the input.
 *
 * @param databaseUrl - The setting, already known to be non-blank.
 * @returns The parsed URL.
 * @throws UnusableDatabaseUrlError When it is not a URL.
 */
function readDatabaseUrl(databaseUrl: string): URL {
  try {
    return new URL(databaseUrl);
  } catch {
    throw new UnusableDatabaseUrlError('unparseable');
  }
}

/**
 * Percent-decode one part of a URL, or refuse the URL.
 *
 * A URL hands back its userinfo and its path percent-ENCODED, so a
 * password containing `@`, `/` or `:` — every one of which has to be
 * escaped to survive in a URL at all — arrives as an escape
 * sequence and would be stored as one. Measured: `%41` in a password
 * reads back as `%41` and decodes to `A`, so this is the difference
 * between the configured password and a different one.
 *
 * A malformed escape is a refusal rather than a throw from the
 * middle of a builder: measured, a URL carrying `%zz` parses
 * cleanly and it is the decode that fails.
 *
 * @param value - One encoded part of the URL.
 * @returns The decoded part.
 * @throws UnusableDatabaseUrlError When the escape does not decode.
 */
function decodedPart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new UnusableDatabaseUrlError('escape');
  }
}

/**
 * The host to write into the credential for a configured hostname.
 *
 * @param hostname - The hostname as the URL spelled it.
 * @returns The compose service key for a loopback address, and the
 *   hostname itself for anything else.
 */
function credentialHost(hostname: string): string {
  return LOOPBACK_DATABASE_HOSTS.includes(hostname.toLowerCase())
    ? IN_CONTAINER_DATABASE_HOST
    : hostname;
}

/**
 * Build the `ar-postgres` credential's `data` from the settings.
 *
 * The four refusals are ordered the way a reader reads a URL —
 * host, user, database, then the parameters after it — and the first
 * one reached is the one reported.
 *
 * @param settings - The resolved settings.
 * @returns The six fields the credential type is given.
 * @throws UnusableDatabaseUrlError When the URL names no host, no
 *   user or no single-segment database, asks for TLS, or carries an
 *   escape that does not decode.
 */
function postgresCredentialData(
  settings: CredentialSettings,
): PostgresCredentialData {
  const url = readDatabaseUrl(settings.databaseUrl);
  const database = url.pathname.slice(1);
  const sslmode = url.searchParams.get(SSLMODE_PARAM) ?? undefined;

  if (url.hostname === '') {
    throw new UnusableDatabaseUrlError('host');
  }

  if (url.username === '') {
    throw new UnusableDatabaseUrlError('user');
  }

  if (database === '' || database.includes('/')) {
    throw new UnusableDatabaseUrlError('database');
  }

  if (isSet(sslmode) && sslmode !== PLAINTEXT_SSLMODE) {
    throw new UnusableDatabaseUrlError('sslmode');
  }

  return {
    database: decodedPart(database),
    host: credentialHost(url.hostname),
    password: decodedPart(url.password),
    port: url.port === ''
      ? DEFAULT_DATABASE_PORT
      : Number(url.port),
    ssl: PLAINTEXT_SSL,
    user: decodedPart(url.username),
  };
}

/**
 * Build the `ar-model` credential's `data` from the settings.
 *
 * Nothing is validated, and there is nothing here that could be: a
 * key is whatever the model server issued, and a wrong one is
 * reported by that server at the first model call. The import
 * would not have caught it either — measured, an `openAiApi`
 * credential with an entirely EMPTY `data` imports at exit 0
 * despite `apiKey` being declared `required`, that property being
 * the editor's and not the CLI's.
 *
 * @param settings - The resolved settings.
 * @returns The one field the credential type is given.
 */
function modelCredentialData(
  settings: CredentialSettings,
): ModelCredentialData {
  return { apiKey: settings.modelApiKey };
}

/**
 * The `data` builder for each credential type in the roster.
 *
 * Keyed by {@link CredentialTypeName} rather than by credential id,
 * which is the exhaustiveness this table is for: a type added to
 * that union with no builder beside it is a `check-types` error, so
 * a roster entry whose `data` nobody wrote cannot be reached at run
 * time. Keying by id would have made the same mistake a missing
 * lookup instead.
 */
const CREDENTIAL_DATA_BUILDERS: Readonly<
  Record<CredentialTypeName, (settings: CredentialSettings) => CredentialData>
> = {
  openAiApi: modelCredentialData,
  postgres: postgresCredentialData,
};

/**
 * One entry of the import file, as `n8n import:credentials` reads
 * one.
 *
 * Four members, which is what the measured import file carries: the
 * id, the display name, the type, and the plaintext `data` the
 * instance encrypts on the way in. {@link CredentialRosterEntry}'s
 * `role` is not among them — it is prose for a reader of this
 * module and reaches no container.
 *
 * The `data` is PLAINTEXT. n8n encrypts stored credentials with the
 * key in its own state directory, and the plaintext flag that reads
 * one back (`--decrypted`) lives on `export:credentials` and not on
 * the import: what goes in is an object, and what comes back out of
 * the database is ciphertext. Measured, and the reason the shape of
 * this member is worth getting right in one place: the import
 * accepts a `data` it cannot decrypt just as happily as one it can,
 * reporting success either way, and the breakage surfaces only at
 * the next read.
 */
export interface CredentialImportEntry {
  /** The plaintext fields, as the credential type declares them. */
  readonly data: CredentialData;

  /** The id every node binding this credential names. */
  readonly id: string;

  /** The display name n8n shows. */
  readonly name: string;

  /** The credential type. */
  readonly type: CredentialTypeName;
}

/**
 * Build the entries of the credential import file from an
 * environment.
 *
 * One entry per {@link CREDENTIAL_ROSTER} row, in roster order, with
 * the `data` for each taken from the builder its TYPE names. Every
 * refusal happens before any entry is built: the settings are
 * resolved first, and a URL that cannot be read refuses on the
 * first entry, so there is no partial file to reason about. That
 * matches what the CLI does with one — measured, an entry the
 * instance refuses aborts the whole file, and the valid entries
 * ahead of it are not written either.
 *
 * @param env - The environment the two settings are read from.
 * @returns The entries, in roster order.
 * @throws UnsetCredentialSettingError When either setting is absent
 *   or blank.
 * @throws UnusableDatabaseUrlError When the database URL is one no
 *   credential can be built from.
 */
export function buildCredentialEntries(
  env: CredentialEnv,
): readonly CredentialImportEntry[] {
  const settings = resolveCredentialSettings(env);

  return CREDENTIAL_ROSTER.map((entry) => ({
    data: CREDENTIAL_DATA_BUILDERS[entry.type](settings),
    id: entry.id,
    name: entry.name,
    type: entry.type,
  }));
}

/**
 * Build the content of the credential import file.
 *
 * The text rather than a path, and the caller's business where it
 * goes: this content carries a database password and a model API
 * key, and the only place it belongs is inside the container, in a
 * file the same script removes. It must never be written under the
 * working tree.
 *
 * A single line and a trailing newline. The file is a transport
 * payload streamed into a container and deleted, not something
 * anyone edits, and a one-line document is what a shell can hand
 * over without a heredoc having an opinion about it. The newline is
 * there because a file without one is awkward to inspect with the
 * tools the container ships.
 *
 * @param env - The environment the two settings are read from.
 * @returns The JSON array `n8n import:credentials` takes as its
 *   `--input`.
 * @throws UnsetCredentialSettingError When either setting is absent
 *   or blank.
 * @throws UnusableDatabaseUrlError When the database URL is one no
 *   credential can be built from.
 */
export function credentialsFileContent(env: CredentialEnv): string {
  return `${JSON.stringify(buildCredentialEntries(env))}\n`;
}
