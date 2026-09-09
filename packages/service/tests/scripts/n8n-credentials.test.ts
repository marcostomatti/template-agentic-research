/**
 * What `scripts/n8n-credentials.ts` makes of an environment, asked
 * with no container anywhere in the run.
 *
 * Every rule that module holds is answered from a value — two
 * settings in, an import file out — which is what lets these cases
 * sit in the default suite, and it is the whole reason the module
 * exists apart from the shell that streams its answer into a
 * container. The shell is where the sequence lives and no gate in
 * this repository reads one.
 *
 * Five subjects. The roster itself, which is where the two
 * `(type, id, name)` triples are declared. The entries built for a
 * configured environment, which is where the field NAMES are
 * settled. The host a credential is given, which is one decision
 * with a table of spellings behind it. The two refusals, one per
 * class. And the file content, which is the text a shell hands
 * over.
 *
 * The field-name claims are the reason this file is worth its
 * length, and they are doubled on purpose. One case per credential
 * holds the emitted member set against a list written out here,
 * which is a transcription of the builder and catches a member
 * quietly added or dropped. A second holds every emitted name
 * against the list the credential class in the pinned image
 * declares, which came out of the image and is what catches a
 * misspelling — a transcription case agrees with a typo the moment
 * somebody corrects it in both places, and this one cannot.
 *
 * Both are here because n8n reports neither. Measured on the pinned
 * image: a credential's `data` is stored unvalidated and resolved at
 * read time through `getNodeParameters(..., returnDefaults: true)`,
 * which DROPS every name the type does not declare and FILLS the
 * one it was meant to be from its default. So `password` misspelled
 * `passwd` imports at exit 0, exports back byte for byte, and
 * authenticates as a user with no password. A unit test over the
 * emitted key set is the only reporter that exists.
 *
 * What no case here reaches. Nothing opens a socket, so nothing
 * says a credential at these spellings connects to anything —
 * that is a bootstrap run's reading. Nothing reads the built
 * artifacts either: {@link TRIPLES_THE_SOURCES_SPELL} is two
 * strings written out by hand from the sources, and whether the
 * artifacts still spell only those two is a question over a built
 * tree rather than over a roster. And nothing here runs the CLI, so
 * the import behaviours quoted throughout are readings carried in
 * from the container measurements behind this port rather than
 * something a green run re-proves.
 *
 * Three of the blocks are generated from a roster and each carries
 * a guard in front of its loop, because an emptied roster takes
 * every case it generates with it and leaves a green block over
 * nothing. Measured: emptying `HOST_CASES` or `FAULT_CASES` reddens
 * that block's guard ALONE and drops the file from 42 cases to 35,
 * and emptying the roster of names no entry may carry reddens the
 * control in front of it — which is a control rather than a count,
 * running the same filter over the same emitted names with one
 * planted entry that IS emitted.
 *
 * The rest of the grid, run against the module a mutation at a
 * time, with a green no-patch control at 42. Misspelling `password`
 * as `passwd` reddens 5: both postgres field claims, the values
 * case, the absence claim, and the control in front of it, whose
 * plant names `password` and has nothing left to report once that
 * member is gone. Giving the model entry a `url` reddens 4 the same
 * way, the control there reporting an extra name beside its plant.
 * Emitting the port as a string reddens 2, the values case and the
 * type claim beside it.
 *
 * Dropping the loopback rewrite reddens 6 — the values claim and
 * every translated row, leaving both pass-through rows green, which
 * is the split those rows are there for. Dropping the percent
 * decode reddens 4, one of them this file's own control that the
 * password is emittable at all. Decoding the database name BEFORE
 * the segment count is read reddens exactly the one case about an
 * escaped slash and leaves the refusal for an unescaped one green,
 * which is what makes that pair a pair. Drifting the `ar-model` id
 * reddens 4 across two blocks.
 *
 * Reversing the order the two unset settings are named in reddens
 * 3; reversing the order the URL faults are checked in reddens 2;
 * accepting a blank setting reddens 1. Removing the `sslmode`
 * refusal reddens its own row and the leak block's guard, which is
 * what says that guard is watching whether a refusal happened at
 * all. And three faithful leak plants — the URL in the message, the
 * URL in a field of the error, the decoded password in the
 * message — each redden the one case about what a refusal may say,
 * and nothing else.
 */
import type {
  CredentialEnv,
  CredentialImportEntry,
} from '../../scripts/n8n-credentials.js';

import { describe, expect, it } from 'vitest';

import {
  CREDENTIAL_ROSTER,
  IN_CONTAINER_DATABASE_HOST,
  buildCredentialEntries,
  credentialsFileContent,
} from '../../scripts/n8n-credentials.js';

// ---------------------------------------------------------------------------
// The field names the pinned image declares
// ---------------------------------------------------------------------------

/**
 * Every field the `postgres` credential type declares, in the order
 * its class declares them.
 *
 * Read off `dist/credentials/Postgres.credentials.js` in
 * `docker.n8n.io/n8nio/n8n:2.15.1`, together with the eight
 * ssh-tunnel fields that class spreads in from
 * `dist/utils/sshTunnel.properties.js`, by instantiating the
 * shipped class inside a container off that image and printing
 * `properties.map((p) => p.name)`.
 *
 * Written out here rather than imported, because there is nothing
 * to import: this package depends on no n8n package of any kind.
 * That is what makes the comparison worth making — the builder
 * spells its members and this list spells n8n's, and a member of
 * the first that is not in the second is a field the instance will
 * silently DROP at read time while filling the field it was meant
 * to be from that field's own default.
 */
const DECLARED_POSTGRES_FIELDS: readonly string[] = [
  'host',
  'database',
  'user',
  'password',
  'maxConnections',
  'allowUnauthorizedCerts',
  'ssl',
  'port',
  'sshTunnel',
  'sshAuthenticateWith',
  'sshHost',
  'sshPort',
  'sshUser',
  'sshPassword',
  'privateKey',
  'passphrase',
];

/**
 * Every field the `openAiApi` credential type declares, in the
 * order its class declares them.
 *
 * Read the same way as {@link DECLARED_POSTGRES_FIELDS}, off
 * `dist/credentials/OpenAiApi.credentials.js`. Two more fields
 * exist at run time and are deliberately absent from this list:
 * n8n INJECTS `allowedHttpRequestDomains` and `allowedDomains`
 * into every credential type carrying an `authenticate` method,
 * which this one does and `postgres` does not. They are not here
 * because the builder must not write either — the injected default
 * of the first is what disarms the domain check — so a list
 * carrying them would license exactly the entry that breaks it.
 */
const DECLARED_MODEL_FIELDS: readonly string[] = [
  'apiKey',
  'organizationId',
  'url',
  'header',
  'headerName',
  'headerValue',
];

/** One entry of {@link FIELDS_NO_DATA_MAY_CARRY}. */
interface ForbiddenField {
  /** The field name that must appear in no emitted `data`. */
  readonly name: string;

  /** Why it must not, in terms of what n8n does with it. */
  readonly reason: string;
}

/**
 * One name no `data` object either builder emits may carry, and why.
 *
 * Three kinds in one roster, because the property they share is the
 * one being asserted: a name here is a name that reaches n8n as a
 * wrong value rather than as an error.
 *
 * The misspellings are the measured failure mode — fed `passwd` and
 * `sslmode`, the pinned image imported the credential at exit 0,
 * stored it, exported it back byte for byte, and dropped both at
 * read time while filling `password` from its default of the empty
 * string.
 *
 * The gated fields are the same silence for a correctly spelled
 * name: a field whose `displayOptions` gate is not satisfied is
 * dropped just as an unknown name is, so `headerName` without
 * `header: true` is lost, and `allowUnauthorizedCerts` is here for
 * the converse reason — writing it as `true` would HIDE the `ssl`
 * field the builder does emit.
 *
 * The declared-but-unwanted names are decisions rather than
 * hazards, and each is a decision the module argues at the
 * interface that omits it.
 */
const FIELDS_NO_DATA_MAY_CARRY: readonly ForbiddenField[] = [
  {
    name: 'passwd',
    reason: 'a misspelling of `password`, dropped and defaulted',
  },
  {
    name: 'sslmode',
    reason: 'the URL parameter name, not the field name `ssl`',
  },
  {
    name: 'baseURL',
    reason: 'the NODE parameter spelling; the field is `url`',
  },
  {
    name: 'allowUnauthorizedCerts',
    reason: 'writing it true would hide the `ssl` field',
  },
  {
    name: 'headerName',
    reason: 'gated on a `header` boolean left at false',
  },
  {
    name: 'headerValue',
    reason: 'gated on a `header` boolean left at false',
  },
  {
    name: 'sshTunnel',
    reason: 'left at its default false, so the ssh fields are hidden',
  },
  {
    name: 'url',
    reason: 'dead weight: the node parameter wins over it',
  },
  {
    name: 'organizationId',
    reason: 'reaches the model call through nothing on this path',
  },
  {
    name: 'maxConnections',
    reason: 'left at the default of 100 this deployment wants',
  },
];

// ---------------------------------------------------------------------------
// The environment every block below hands over
// ---------------------------------------------------------------------------

/**
 * The model key the configured environment carries.
 *
 * Distinctive rather than plausible, so a case asserting it reached
 * the `ar-model` entry is reading this value and not a default, and
 * so the leak controls further down have a needle that could only
 * have come from here.
 */
const MODEL_KEY = 'zzmodelkeyzz';

/**
 * The database password the configured environment carries, in the
 * form it takes inside a URL.
 *
 * Percent-escaped on purpose. `@` and `/` both have to be escaped to
 * survive in a URL at all, so this is what a real password
 * containing either looks like in `DATABASE_URL`, and it is the one
 * shape that separates a builder decoding what it read from one
 * forwarding it.
 *
 * Annotated rather than left to inference, and the annotation is
 * what keeps the guard case compiling: two `const` strings carry
 * two distinct literal types, so `tsc` reads a comparison between
 * them as statically decidable and reports TS2367 — an error about
 * how the fixture is written rather than about the drift the guard
 * watches for. Widening answers the static reading and leaves the
 * runtime comparison its work.
 */
const ESCAPED_PASSWORD: string = 'zzpg%40pass%2Fwordzz';

/** The same password as the credential has to carry it. */
const DECODED_PASSWORD = 'zzpg@pass/wordzz';

/**
 * The database URL the configured environment carries.
 *
 * A loopback host, because that is what `.env.example` ships and
 * what every other consumer of this setting wants; the escaped
 * password above; and a port and database name that are not the
 * ones the credential type would default to, so a case reading
 * either back is reading this URL.
 */
const CONFIGURED_DATABASE_URL =
  `postgresql://zzpguserzz:${ESCAPED_PASSWORD}@localhost:5544/zzpgdbzz`;

/**
 * The port that URL names, which is not the field default.
 *
 * Widened for the reason {@link ESCAPED_PASSWORD} gives: the guard
 * compares it against the default the credential type declares, and
 * two literal types make that comparison a compile error.
 */
const CONFIGURED_PORT: number = 5544;

/** The database that URL names, which is not the field default. */
const CONFIGURED_DATABASE = 'zzpgdbzz';

/** The user that URL names, which is not the field default. */
const CONFIGURED_USER = 'zzpguserzz';

/**
 * An environment carrying both settings, with the database URL
 * given.
 *
 * A helper rather than a constant, because half the blocks below
 * are about what a different URL does and every one of them wants
 * the same model key beside it.
 *
 * @param databaseUrl - What `DATABASE_URL` is set to.
 * @returns An environment with both settings set.
 */
function envWith(databaseUrl: string): CredentialEnv {
  return { AR_LLM_API_KEY: MODEL_KEY, DATABASE_URL: databaseUrl };
}

/** The environment the accepting blocks hand over. */
const CONFIGURED_ENV: CredentialEnv = envWith(CONFIGURED_DATABASE_URL);

// ---------------------------------------------------------------------------
// Reading an answer back
// ---------------------------------------------------------------------------

/** The id the `postgres` credential is declared under. */
const POSTGRES_ID = 'ar-postgres';

/** The id the `openAiApi` credential is declared under. */
const MODEL_ID = 'ar-model';

/**
 * The `data` of the entry carrying an id, as a plain record.
 *
 * Flattened through `Object.entries` rather than handed over as it
 * came, because the two `data` shapes are interfaces and a TS
 * interface carries no implicit index signature — so neither is
 * assignable to a record type, and a case cannot read a member off
 * one without narrowing the union first.
 *
 * An entry that is not there answers an empty record rather than
 * throwing. Which entries exist is a claim of its own in the first
 * block, and a run where one has gone missing should redden the
 * member-set case that names the fields rather than fail while
 * setting up.
 *
 * @param env - The environment to build the file from.
 * @param id - The credential id to read.
 * @returns Its `data` as a record, or an empty one.
 */
function dataOf(
  env: CredentialEnv,
  id: string,
): Readonly<Record<string, unknown>> {
  const entry = buildCredentialEntries(env)
    .find((candidate) => candidate.id === id);

  return entry === undefined
    ? {}
    : Object.fromEntries(Object.entries(entry.data));
}

/**
 * The member names of a record, sorted.
 *
 * Sorted so a comparison is about the SET, the emitted order being
 * an object literal's and not something n8n reads.
 *
 * @param data - The record to read.
 * @returns Its member names in sorted order.
 */
function namesOf(data: Readonly<Record<string, unknown>>): readonly string[] {
  return Object.keys(data).sort();
}

/**
 * The `(type, id, name)` triple of an entry or a roster row, as one
 * string.
 *
 * One string rather than a record, so a set comparison reports a
 * missing or extra triple as a readable line rather than as a
 * nested diff. Nothing here is a value out of an environment, so
 * there is no secret in a label.
 *
 * @param entry - Anything carrying the three members.
 * @returns The triple, joined.
 */
function tripleOf(
  entry: Pick<CredentialImportEntry, 'id' | 'name' | 'type'>,
): string {
  return `${entry.type} ${entry.id} ${entry.name}`;
}

/**
 * What a call refused with, as a record naming the class.
 *
 * The class NAME rather than the class, and the field beside it: a
 * refusal from this module says which of two things went wrong in
 * its class and which one of them in a field, and a case asserting
 * `toThrow` alone would pass for either. `RETURNED` stands for a
 * call that refused nothing, so a case that expected a refusal
 * reports the answer rather than an absent error.
 *
 * @param call - The call to run.
 * @returns The class name and both refusal fields, or `RETURNED`.
 */
function refusalOf(call: () => unknown): unknown {
  try {
    call();

    return RETURNED;
  } catch (error) {
    return {
      fault: (error as { fault?: unknown }).fault,
      name: (error as Error).name,
      settings: (error as { settings?: unknown }).settings,
    };
  }
}

/** What {@link refusalOf} answers for a call that did not refuse. */
const RETURNED = 'nothing thrown';

/**
 * The member names of a value, sorted and joined into one string.
 *
 * One string rather than a list, so a record comparing several
 * values at once prints a readable line per entry. Sorted because
 * the claim is about the member SET: the order an object literal
 * was written in is nothing either n8n or this module reads.
 *
 * @param value - Any object.
 * @returns Its member names, sorted and comma-joined.
 */
function memberList(value: object): string {
  const names = Object.keys(value).sort();

  return names.join();
}

/**
 * Every field name either entry carries, over the configured
 * environment.
 *
 * One set for the two entries, because the roster of names no entry
 * may carry is about both of them and a name is as wrong on the one
 * it does not belong to as on the one it does. Shared by the
 * absence claim and by the control in front of it, so the control
 * is over the same set and not over a second reading of it.
 *
 * @returns The union of both entries' field names.
 */
function emittedFieldNames(): ReadonlySet<string> {
  return new Set([
    ...namesOf(dataOf(CONFIGURED_ENV, POSTGRES_ID)),
    ...namesOf(dataOf(CONFIGURED_ENV, MODEL_ID)),
  ]);
}

// ---------------------------------------------------------------------------
// The roster itself
// ---------------------------------------------------------------------------

/**
 * The triples the six workflow sources spell, written out.
 *
 * Read off `workflows/src/` and written here by hand, which is the
 * point: the module declares its two triples and this list declares
 * what the artifacts bind against, and a comparison of the two says
 * something exactly because neither was derived from the other.
 *
 * It is not a coverage claim over the artifacts. Which nodes carry
 * which credential, and that no seventh source has appeared, is a
 * question over a built tree and not over a roster; this list is
 * two strings a reader can check against a `grep`.
 */
const TRIPLES_THE_SOURCES_SPELL: readonly string[] = [
  'postgres ar-postgres AR Postgres',
  'openAiApi ar-model AR Model',
];

describe('the credential roster', () => {
  // What every other block here takes on trust. Held as one record
  // so a roster that drifted is named in the diff rather than
  // reported as a builder behaving oddly.
  it('was handed two entries, each carrying four members', () => {
    expect({
      entries: CREDENTIAL_ROSTER.length,
      membersPerEntry: CREDENTIAL_ROSTER.map(memberList),
    }).toStrictEqual({
      entries: 2,
      membersPerEntry: ['id,name,role,type', 'id,name,role,type'],
    });
  });

  // The claim the whole module is arranged around, and the only one
  // here that is about n8n rather than about this file: a credential
  // is resolved BY ID, so a triple that drifted from what the nodes
  // spell is 43 nodes bound to nothing at exit 0.
  //
  // Sets rather than lists, since which entry is first is the next
  // case's question and not this one's.
  it('declares exactly the triples the workflow sources spell', () => {
    expect(new Set(CREDENTIAL_ROSTER.map(tripleOf)))
      .toStrictEqual(new Set(TRIPLES_THE_SOURCES_SPELL));
  });

  // Order, separately, because the entries reach the import file in
  // it and the module says which one comes first and why.
  it('names the universally bound credential first', () => {
    expect(CREDENTIAL_ROSTER.map((entry) => entry.id))
      .toStrictEqual([POSTGRES_ID, MODEL_ID]);
  });

  // A roster naming one credential twice would satisfy neither of
  // the two claims above in a way a reader would notice: the set
  // comparison collapses a duplicate, and the id list would have to
  // be wrong in two places at once to survive. Both distinctness
  // claims in one record so the answer says WHICH collapsed.
  it('gives each entry an id and a type of its own', () => {
    expect({
      ids: new Set(CREDENTIAL_ROSTER.map((entry) => entry.id)).size,
      types: new Set(CREDENTIAL_ROSTER.map((entry) => entry.type)).size,
    }).toStrictEqual({ ids: 2, types: 2 });
  });
});

// ---------------------------------------------------------------------------
// The file an environment that configured both settings gets
// ---------------------------------------------------------------------------

describe('the import entries over a configured environment', () => {
  // What every claim in this block reads back, stated as a property
  // of the fixture rather than assumed. A URL whose port was the
  // field default, or whose password needed no decoding, leaves the
  // value claims below satisfiable by a builder that read nothing.
  it('was handed a loopback URL with an escaped password', () => {
    expect({
      theHostIsLoopback: CONFIGURED_DATABASE_URL.includes('@localhost:'),
      thePasswordIsEscaped: CONFIGURED_DATABASE_URL
        .includes(ESCAPED_PASSWORD),
      thePasswordNeedsDecoding: ESCAPED_PASSWORD !== DECODED_PASSWORD,
      thePortIsNotTheFieldDefault: CONFIGURED_PORT !== 5432,
    }).toStrictEqual({
      theHostIsLoopback: true,
      thePasswordIsEscaped: true,
      thePasswordNeedsDecoding: true,
      thePortIsNotTheFieldDefault: true,
    });
  });

  // The entries carry the roster's triples, in the roster's order,
  // and nothing else: four members apiece, which is what says the
  // `role` a roster entry carries reaches no container.
  it('emits one four-member entry per roster row, in order', () => {
    const entries = buildCredentialEntries(CONFIGURED_ENV);

    expect({
      members: entries.map(memberList),
      triples: entries.map(tripleOf),
    }).toStrictEqual({
      members: ['data,id,name,type', 'data,id,name,type'],
      triples: CREDENTIAL_ROSTER.map(tripleOf),
    });
  });

  // The member set of the postgres `data`, against a list written
  // out here. This is the transcription half: it says the builder
  // emits these six and no others, and it is what a member quietly
  // dropped from the builder moves.
  it('gives the postgres entry exactly its six fields', () => {
    expect(namesOf(dataOf(CONFIGURED_ENV, POSTGRES_ID))).toStrictEqual([
      'database',
      'host',
      'password',
      'port',
      'ssl',
      'user',
    ]);
  });

  // The independent half, and the one that catches a typo the case
  // above cannot: every emitted name is a name the credential class
  // in the pinned image declares. A misspelling passes the
  // transcription case the moment somebody corrects it there too,
  // and fails here, because this list came out of the image.
  //
  // Reported as the difference rather than as a boolean, so a
  // failure names the field.
  it('emits no postgres field the image does not declare', () => {
    expect(namesOf(dataOf(CONFIGURED_ENV, POSTGRES_ID))
      .filter((name) => !DECLARED_POSTGRES_FIELDS.includes(name)))
      .toStrictEqual([]);
  });

  // The same pair for the model credential, whose one field is the
  // only one of the six the node consumes on this path.
  it('gives the model entry exactly its one field', () => {
    expect(namesOf(dataOf(CONFIGURED_ENV, MODEL_ID)))
      .toStrictEqual(['apiKey']);
  });

  it('emits no model field the image does not declare', () => {
    expect(namesOf(dataOf(CONFIGURED_ENV, MODEL_ID))
      .filter((name) => !DECLARED_MODEL_FIELDS.includes(name)))
      .toStrictEqual([]);
  });

  // The claim after this one is an ABSENCE over a roster, so an
  // emptied roster and a filter that reports nothing read the same:
  // green. Both halves are here — the roster has entries, and the
  // same filter over the same emitted set reports a planted entry
  // naming a field that IS emitted.
  it('was handed a roster the emitted fields could have hit', () => {
    const planted: readonly ForbiddenField[] = [
      ...FIELDS_NO_DATA_MAY_CARRY,
      { name: 'password', reason: 'planted, and emitted on purpose' },
    ];

    expect({
      rosterHasEntries: FIELDS_NO_DATA_MAY_CARRY.length > 0,
      theSameFilterReportsThePlant: planted
        .filter((field) => emittedFieldNames().has(field.name))
        .map((field) => field.name),
    }).toStrictEqual({
      rosterHasEntries: true,
      theSameFilterReportsThePlant: ['password'],
    });
  });

  // Both directions of the subset claims above are still satisfied
  // by a builder emitting a DECLARED name that must not be there —
  // `url`, `maxConnections`, `allowUnauthorizedCerts` — and by one
  // emitting a gated name whose gate is unset. That is what this
  // roster is for, and it reports which name and why.
  it('carries no field either builder must not emit', () => {
    expect(FIELDS_NO_DATA_MAY_CARRY
      .filter((field) => emittedFieldNames().has(field.name))
      .map((field) => `${field.name}: ${field.reason}`))
      .toStrictEqual([]);
  });

  // The values behind the names, which is the claim a builder
  // emitting the right six members filled from the wrong parts of
  // the URL would fail and a member set would not. The host is the
  // translated one, argued in its own block below.
  it('fills the postgres fields from the URL it was given', () => {
    expect(dataOf(CONFIGURED_ENV, POSTGRES_ID)).toStrictEqual({
      database: CONFIGURED_DATABASE,
      host: IN_CONTAINER_DATABASE_HOST,
      password: DECODED_PASSWORD,
      port: CONFIGURED_PORT,
      ssl: 'disable',
      user: CONFIGURED_USER,
    });
  });

  // `toStrictEqual` above compares a number to a number, so the
  // port's TYPE is already in it — but only while the expectation
  // is written as one. Measured on the pinned image: nothing
  // coerces a credential field, so a port stored as a string
  // reaches the driver as a string, and the claim is worth making
  // where a reader will see it.
  it('emits the port as a number', () => {
    expect(typeof dataOf(CONFIGURED_ENV, POSTGRES_ID).port)
      .toBe('number');
  });

  it('gives the model entry the configured key', () => {
    expect(dataOf(CONFIGURED_ENV, MODEL_ID))
      .toStrictEqual({ apiKey: MODEL_KEY });
  });
});

// ---------------------------------------------------------------------------
// The host a credential is given
// ---------------------------------------------------------------------------

/** One host spelling and the host the credential should carry. */
interface HostCase {
  /** The host as it appears in `DATABASE_URL`. */
  readonly configured: string;

  /** What the credential should dial from inside the container. */
  readonly credential: string;

  /** What the spelling is there to exercise. */
  readonly reading: string;
}

/**
 * One case per host spelling the translation has an opinion about,
 * translated and untranslated alike.
 *
 * The untranslated rows are not filler. A rule that answered the
 * compose service name for every host would satisfy every
 * translating row here, and only a row that must come back
 * unchanged can report it — which is also why one of them is a
 * bracketed IPv6 address that is not the loopback one, the shape a
 * roster matching on brackets rather than on the address would get
 * wrong.
 */
const HOST_CASES: readonly HostCase[] = [
  {
    configured: 'localhost',
    credential: IN_CONTAINER_DATABASE_HOST,
    reading: 'what .env.example ships',
  },
  {
    configured: 'LOCALHOST',
    credential: IN_CONTAINER_DATABASE_HOST,
    reading: 'a non-special scheme does not lower-case its host',
  },
  {
    configured: '127.0.0.1',
    credential: IN_CONTAINER_DATABASE_HOST,
    reading: 'the numeric loopback',
  },
  {
    configured: '0.0.0.0',
    credential: IN_CONTAINER_DATABASE_HOST,
    reading: 'a URL written from a bind address',
  },
  {
    configured: '[::1]',
    credential: IN_CONTAINER_DATABASE_HOST,
    reading: 'the only IPv6 loopback spelling a URL will hold',
  },
  {
    configured: 'zzdbhostzz',
    credential: 'zzdbhostzz',
    reading: 'a named host, which is meant from inside too',
  },
  {
    configured: '[fe80::1]',
    credential: '[fe80::1]',
    reading: 'a bracketed address that is not the loopback one',
  },
];

describe('the host the postgres credential is given', () => {
  // The roster is what the loop below is generated from, so an
  // emptied one leaves every case with it and reports a green run
  // over nothing. This names that, and it names the split the
  // untranslated rows depend on: with no row of either kind, one
  // of the two things this block can catch stops being watched.
  it('was handed rows of both kinds', () => {
    expect({
      passedThrough: HOST_CASES
        .filter((row) => row.configured === row.credential).length,
      translated: HOST_CASES
        .filter((row) => row.credential === IN_CONTAINER_DATABASE_HOST
          && row.configured !== IN_CONTAINER_DATABASE_HOST).length,
    }).toStrictEqual({ passedThrough: 2, translated: 5 });
  });

  for (const row of HOST_CASES) {
    const title = `answers ${row.credential} for ${row.configured}`;

    it(`${title} (${row.reading})`, () => {
      const env = envWith(
        `postgresql://zzuzz:zzpzz@${row.configured}:5432/zzdzz`,
      );

      expect(dataOf(env, POSTGRES_ID).host).toBe(row.credential);
    });
  }
});

// ---------------------------------------------------------------------------
// An environment that configured neither setting, or one of them
// ---------------------------------------------------------------------------

describe('the refusal for a setting nothing was set for', () => {
  // Both names, in reading order, from an environment carrying
  // neither. The plural is the ordinary case: an operator who set
  // neither has not configured this command at all, and a refusal
  // naming one of two buys a second run to learn the other.
  it('names every setting that was not set', () => {
    expect(refusalOf(() => buildCredentialEntries({}))).toStrictEqual({
      fault: undefined,
      name: 'UnsetCredentialSettingError',
      settings: ['DATABASE_URL', 'AR_LLM_API_KEY'],
    });
  });

  it('names the database alone when only the key is set', () => {
    expect(refusalOf(
      () => buildCredentialEntries({ AR_LLM_API_KEY: MODEL_KEY }),
    )).toStrictEqual({
      fault: undefined,
      name: 'UnsetCredentialSettingError',
      settings: ['DATABASE_URL'],
    });
  });

  it('names the key alone when only the database is set', () => {
    expect(refusalOf(
      () => buildCredentialEntries({ DATABASE_URL: CONFIGURED_DATABASE_URL }),
    )).toStrictEqual({
      fault: undefined,
      name: 'UnsetCredentialSettingError',
      settings: ['AR_LLM_API_KEY'],
    });
  });

  // Present-but-blank is the third state a `.env` can be in and it
  // is read as unset here, which is what keeps a line with nothing
  // after the `=` from building a credential with an empty
  // password — a shape the instance stores and defaults without
  // complaint.
  it('reads a blank setting as one nothing was set for', () => {
    expect(refusalOf(() => buildCredentialEntries({
      AR_LLM_API_KEY: '   ',
      DATABASE_URL: '',
    }))).toStrictEqual({
      fault: undefined,
      name: 'UnsetCredentialSettingError',
      settings: ['DATABASE_URL', 'AR_LLM_API_KEY'],
    });
  });
});

// ---------------------------------------------------------------------------
// A database URL no credential can be built from
// ---------------------------------------------------------------------------

/** One unusable database URL, and the fault it earns. */
interface FaultCase {
  /** What makes it unusable, in a phrase. */
  readonly breakage: string;

  /** The name the refusal should carry. */
  readonly fault: string;

  /** The URL, with its secret-shaped parts kept distinctive. */
  readonly url: string;
}

/**
 * One case per fault the module declares, plus the second shape of
 * the one fault that has two.
 *
 * Every one of these is a refusal where the alternative is a
 * plausible credential rather than an error: a missing member of a
 * credential is filled from the field's own default at read time,
 * so a URL naming no host would build one dialling `localhost`, and
 * one naming no user would build one connecting as `postgres`.
 *
 * The escape row carries a `%zz` in the PASSWORD, which — measured
 * — a URL parses without complaint and `decodeURIComponent` then
 * refuses, so the fault is reached from inside the builder rather
 * than from the parse.
 */
const FAULT_CASES: readonly FaultCase[] = [
  {
    breakage: 'not a URL at all',
    fault: 'unparseable',
    url: 'zznotaurlzz',
  },
  {
    breakage: 'no host',
    fault: 'host',
    url: 'postgresql:///zzdzz',
  },
  {
    breakage: 'no user',
    fault: 'user',
    url: 'postgresql://zzhostzz:5432/zzdzz',
  },
  {
    breakage: 'no database',
    fault: 'database',
    url: 'postgresql://zzuzz:zzpzz@zzhostzz:5432/',
  },
  {
    breakage: 'a database path of more than one segment',
    fault: 'database',
    url: 'postgresql://zzuzz:zzpzz@zzhostzz:5432/zzdzz/zzextrazz',
  },
  {
    breakage: 'an sslmode this builder does not write',
    fault: 'sslmode',
    url: `postgresql://zzuzz:zzpzz@zzhostzz:5432/zzdzz?${'sslmode=require'}`,
  },
  {
    breakage: 'a percent-escape that does not decode',
    fault: 'escape',
    url: 'postgresql://zzuzz:%zz@zzhostzz:5432/zzdzz',
  },
];

describe('the refusal for a database URL nothing can be built from', () => {
  // The loop below is generated from this roster, so an emptied one
  // reports a green block over no cases at all. The distinct-fault
  // count is the other half: a roster that had collapsed onto one
  // fault would still generate cases and would stop being about the
  // set the module declares.
  it('was handed a row for every fault the module declares', () => {
    expect({
      faults: new Set(FAULT_CASES.map((row) => row.fault)).size,
      rows: FAULT_CASES.length,
    }).toStrictEqual({ faults: 6, rows: 7 });
  });

  for (const row of FAULT_CASES) {
    it(`refuses ${row.breakage} with the ${row.fault} fault`, () => {
      expect(refusalOf(() => buildCredentialEntries(envWith(row.url))))
        .toStrictEqual({
          fault: row.fault,
          name: 'UnusableDatabaseUrlError',
          settings: undefined,
        });
    });
  }

  // The counterpart of the multi-segment row above, and the reason
  // that row is about SEGMENTS rather than about the character: the
  // name is decoded after the segment count is read, so an escaped
  // slash is part of a one-segment name and comes back in it.
  // Without this the refusal above reads as a rule about a slash,
  // which a builder decoding first would satisfy by refusing both.
  it('takes an escaped slash as part of the database name', () => {
    const env = envWith('postgresql://zzuzz:zzpzz@zzhostzz/zzd%2Fzz');

    expect(dataOf(env, POSTGRES_ID).database).toBe('zzd/zz');
  });

  // One URL, wrong in two ways, reporting the first in reading
  // order. The module states that order, and without a case for it
  // a builder checking in some other order would pass every row
  // above — each of those is wrong in exactly one way.
  it('reports the first fault in reading order', () => {
    expect(refusalOf(
      () => buildCredentialEntries(envWith('postgresql:///')),
    )).toStrictEqual({
      fault: 'host',
      name: 'UnusableDatabaseUrlError',
      settings: undefined,
    });
  });
});

// ---------------------------------------------------------------------------
// What a refusal is allowed to say
// ---------------------------------------------------------------------------

/**
 * A URL carrying the configured password and one fault.
 *
 * The fault is the `sslmode` one because it is the one refusal that
 * happens AFTER the URL has parsed and its parts have been read,
 * which is where a builder is most likely to have something
 * quotable in hand.
 */
const REFUSED_URL =
  `postgresql://zzpguserzz:${ESCAPED_PASSWORD}@localhost:5432/d` +
  '?sslmode=require';

describe('what a refusal about the database URL carries', () => {
  // The needle has to be in the subject before its absence from a
  // message says anything, and it has to be able to come back out
  // somewhere or the absence is a property of the whole module
  // rather than of the refusal. Both halves here: the password is
  // in the URL this block refuses, and the same password reaches
  // the file built from a URL that is fine.
  it('was handed a URL carrying the password, which is emittable', () => {
    expect({
      theFileCarriesIt: credentialsFileContent(CONFIGURED_ENV)
        .includes(DECODED_PASSWORD),
      theRefusedUrlCarriesIt: REFUSED_URL.includes(ESCAPED_PASSWORD),
    }).toStrictEqual({ theFileCarriesIt: true, theRefusedUrlCarriesIt: true });
  });

  // Neither spelling of the password, and no part of the URL, in
  // the message or in anything a caller would log. `JSON.stringify`
  // over an Error prints its own enumerable fields — here the one
  // the class assigns — so the two readings together cover what a
  // handler prints and what a message shows.
  it('quotes neither the URL nor the password it carries', () => {
    let printed = '';

    try {
      buildCredentialEntries(envWith(REFUSED_URL));
    } catch (error) {
      printed = `${(error as Error).message} ${JSON.stringify(error)}`;
    }

    expect({
      carriesTheDecodedPassword: printed.includes(DECODED_PASSWORD),
      carriesTheEscapedPassword: printed.includes(ESCAPED_PASSWORD),
      carriesTheUrl: printed.includes(REFUSED_URL),
      saidSomething: printed.length > 0,
    }).toStrictEqual({
      carriesTheDecodedPassword: false,
      carriesTheEscapedPassword: false,
      carriesTheUrl: false,
      saidSomething: true,
    });
  });
});

// ---------------------------------------------------------------------------
// The file content itself
// ---------------------------------------------------------------------------

describe('the credential file content', () => {
  // The content is what a shell streams into the container, so its
  // shape is part of the contract: one line and a trailing newline.
  it('is one line of JSON with a trailing newline', () => {
    const content = credentialsFileContent(CONFIGURED_ENV);

    expect({
      endsWithNewline: content.endsWith('\n'),
      lines: content.trimEnd().split('\n').length,
    }).toStrictEqual({ endsWithNewline: true, lines: 1 });
  });

  // And it is the entries, unchanged. A content builder that had
  // dropped a member or re-ordered the file would pass every claim
  // above, all of which read the entries rather than the text.
  it('parses back to the entries it was built from', () => {
    expect(JSON.parse(credentialsFileContent(CONFIGURED_ENV)))
      .toStrictEqual(buildCredentialEntries(CONFIGURED_ENV));
  });

  // The refusals are the builder's, so the content path cannot have
  // its own opinion about an environment: it must not answer text
  // for one the entries were refused for.
  it('refuses an environment the entries were refused for', () => {
    expect(refusalOf(() => credentialsFileContent({}))).toStrictEqual({
      fault: undefined,
      name: 'UnsetCredentialSettingError',
      settings: ['DATABASE_URL', 'AR_LLM_API_KEY'],
    });
  });
});
