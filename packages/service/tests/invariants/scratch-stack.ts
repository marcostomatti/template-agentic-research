/**
 * @packageDocumentation
 * `docker-compose.scratch.yml` and `docker-compose.yml` read as the
 * questions the scratch-stack invariant asks of them, with the merge
 * TAG a compose overlay writes kept on every list it replaces.
 *
 * THE TAGS ARE THE SUBJECT, AND A PLAIN YAML READ DROPS THEM. `yaml`
 * resolves `!override` and `!reset` to nothing it knows, records a
 * `TAG_RESOLVE_FAILED` warning for each, and `parse` hands back the
 * list underneath — the list an UNTAGGED overlay holds, value for
 * value. An untagged `ports` or `volumes` list in an overlay is not a
 * replacement, either: compose APPENDS it to the base's. Measured with
 * Docker Compose v2.31.0, an untagged draft of the overlay left the
 * merged stack publishing dev `5432` and `127.0.0.1:5678` beside its
 * own ports and mounting both named volumes. A tag-blind reader passes
 * exactly that file, so this one reads through `parseDocument`, whose
 * nodes keep the tag the text wrote, and never through `toJS`.
 *
 * WHAT {@link resolveScratchService} MODELS IS FOUR MERGE RULES, NOT
 * COMPOSE. A scalar and an environment key in the overlay replace the
 * base's; a list tagged `!override` replaces the base's list; a list
 * tagged `!reset` leaves none, whatever it carries; an untagged list
 * is appended. Each was read off `docker compose config` at v2.31.0,
 * the valued `!reset` included, and together they are what the
 * isolation property turns on. They are answered only for the members
 * read here. Compose's real merge is the `config` render over both
 * files, which needs docker installed — something the isolated suite
 * does not get to assume — so that render is an operator's reading
 * rather than a case.
 *
 * THIS ANSWERS THE FILES, NOT THE RESOLVED CONFIGURATION, on the
 * argument `compose-service.ts` makes for the base file: no
 * `${VAR:-default}` is folded and no `.env` is read. The one
 * interpolation either file carries is the base n8n's
 * `GENERIC_TIMEZONE`, which this reader answers as written and no
 * check here compares. Interpolating first would only add a way for
 * a comparison to move.
 *
 * REFUSING AN EMPTY READ is owed for the reason every sibling reader
 * here gives. Half the isolation property is an absence — no shared
 * name, no shared port, no volume — and a read holding no service
 * satisfies all of it having looked at nothing, so
 * {@link EmptyStackFileError} fires instead. Every other malformed
 * shape arrives as a plain `Error` or as the parser's own error: a
 * member of the wrong type, a port this reader cannot split, a list
 * in compose's long syntax, and a tag compose does not merge by. Each
 * is a file to go and fix rather than a state a caller distinguishes.
 */

import type { YAMLMap } from 'yaml';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { isMap, isScalar, isSeq, parseDocument } from 'yaml';

/**
 * The scratch overlay this package ships, resolved from this file's
 * own location for the reason `COMPOSE_FILE` in `compose-service.ts`
 * is: the repo-root launcher leaves a worker's `process.cwd()` at the
 * umbrella root, where a relative path names nothing here.
 */
export const SCRATCH_COMPOSE_FILE = fileURLToPath(
  new URL('../../docker-compose.scratch.yml', import.meta.url),
);

/** The tag under which an overlay list replaces the base's list. */
export const OVERRIDE_TAG = '!override';

/** The tag under which an overlay leaves no list at all. */
export const RESET_TAG = '!reset';

/** The only two tags compose merges by, and so the only two read. */
const MERGE_TAGS: readonly string[] = [OVERRIDE_TAG, RESET_TAG];

/** A port half: digits only, so a range or a variable is refused. */
const PORT_NUMBER = /^\d+$/;

/**
 * Thrown when a compose document declares no service.
 *
 * Covers a document with no `services` member and one whose
 * `services` is an empty mapping, which are one fact to a caller.
 * A distinct class, so the case driving this path pins the failure
 * to this cause rather than to any `Error` a malformed file raises.
 */
export class EmptyStackFileError extends Error {
  /** The document that yielded nothing, as the caller named it. */
  readonly source: string;

  /**
   * @param source - Where the text came from, for the message.
   */
  constructor(source: string) {
    super(
      `No compose service resolved out of ${source}. The scratch ` +
      'stack is held apart from the dev stack by absences — no shared ' +
      'container name, no shared published port, no volume — and a ' +
      'read holding no service satisfies every one of them having ' +
      'compared nothing. Either the document declares no `services` ' +
      'mapping, or the reader was pointed at something other than a ' +
      'compose file.',
    );
    this.name = this.constructor.name;
    this.source = source;
  }
}

/**
 * A `ports` or `volumes` list as a file writes it, tag included.
 *
 * The entries are handed back whole, in compose's short syntax, and
 * the tag is `undefined` where the text wrote none — which in an
 * overlay is the appending case, and the one reading this type exists
 * to keep apart from the other two.
 */
export interface TaggedList {
  /** `!override`, `!reset`, or `undefined` for an untagged list. */
  readonly tag: string | undefined;

  /** Every entry, as written, in declaration order. */
  readonly entries: readonly string[];
}

/** One short-syntax port entry, split into its halves. */
export interface PortBinding {
  /** The entry as written, for a failure to quote. */
  readonly entry: string;

  /**
   * The host address it binds, or `undefined` where the entry names
   * none — which is not loopback, and is refused by the check that
   * reads this member for that reason.
   */
  readonly hostIp: string | undefined;

  /**
   * The host port, or `undefined` for a container-only entry, which
   * names no host port at all.
   */
  readonly published: string | undefined;

  /** The port inside the container the binding forwards to. */
  readonly target: string;
}

/**
 * One compose service, cut down to what the isolation property keys
 * on — the shape `ComposeService` in `compose-service.ts` takes for
 * its own questions, and for the same reason not the whole body.
 */
export interface StackService {
  /** The service key, as the `services` mapping spells it. */
  readonly name: string;

  /** The image it pins, or `undefined` where it declares none. */
  readonly image: string | undefined;

  /** Whether it declares a `build` block. */
  readonly declaresBuild: boolean;

  /**
   * Whether it declares a `command`. Read for Postgres, where a flag
   * on the server's command line can set a port that the `PGPORT` a
   * check here compares against does not show.
   */
  readonly declaresCommand: boolean;

  /** The container name it fixes, or `undefined` for a derived one. */
  readonly containerName: string | undefined;

  /**
   * Every environment entry, from either of compose's spellings,
   * keyed by name. A bare list entry, which inherits the host's
   * value, answers `undefined`.
   */
  readonly environment: ReadonlyMap<string, string | undefined>;

  /** Its `ports` list, or `undefined` where it declares none. */
  readonly ports: TaggedList | undefined;

  /** Its `volumes` list, or `undefined` where it declares none. */
  readonly volumes: TaggedList | undefined;

  /**
   * Its healthcheck's `test`, or `undefined` where it declares none.
   * The string form is answered as the `CMD-SHELL` list compose reads
   * it as.
   */
  readonly healthcheckTest: readonly string[] | undefined;
}

/** One compose document, read. */
export interface StackFile {
  /** Where the text came from, as the caller named it. */
  readonly source: string;

  /** Every service, keyed by name, in the document's own order. */
  readonly services: ReadonlyMap<string, StackService>;

  /** Every key under the top-level `volumes` mapping. */
  readonly volumeDeclarations: readonly string[];
}

/**
 * One scratch service as the four merge rules resolve it, the base
 * file's service under the overlay's.
 */
export interface ScratchService {
  /** The service key both files spell. */
  readonly name: string;

  /** The overlay's container name, else the base's. */
  readonly containerName: string | undefined;

  /** The base's entries with the overlay's replacing them by key. */
  readonly environment: ReadonlyMap<string, string | undefined>;

  /** Every binding left once the `ports` rule has been applied. */
  readonly ports: readonly PortBinding[];

  /** Every mount left once the `volumes` rule has been applied. */
  readonly volumes: readonly string[];

  /** The overlay's healthcheck `test`, else the base's. */
  readonly healthcheckTest: readonly string[] | undefined;

  /** Whether either file gives the service a `command`. */
  readonly declaresCommand: boolean;
}

/**
 * A mapping key, which compose requires to be a string.
 *
 * @throws Error When the key is anything else.
 */
function keyOf(key: unknown, source: string): string {
  if (isScalar(key) && typeof key.value === 'string') {
    return key.value;
  }

  throw new Error(
    `${source} holds a mapping key that is not a string. Every ` +
    'question this reader answers is keyed by a service or member ' +
    'name, so there is nothing to key on.',
  );
}

/**
 * A scalar entry read as text: a list entry or an environment value.
 *
 * @throws Error When the node is not a string, number or boolean.
 */
function entryText(node: unknown, where: string): string {
  if (
    isScalar(node) &&
    (typeof node.value === 'string' ||
      typeof node.value === 'number' ||
      typeof node.value === 'boolean')
  ) {
    return String(node.value);
  }

  throw new Error(
    `${where} holds an entry that is not a scalar. This reader takes ` +
    'compose\'s short syntax only, so an entry it cannot read as text ' +
    'is one no comparison here could ever match.',
  );
}

/**
 * A member that has to be a string when present.
 *
 * @throws Error When the member is present and is not a string.
 */
function stringMember(
  body: YAMLMap,
  member: string,
  where: string,
): string | undefined {
  const node: unknown = body.get(member, true);

  if (node === undefined || (isScalar(node) && node.value === null)) {
    return undefined;
  }

  if (isScalar(node) && typeof node.value === 'string') {
    return node.value;
  }

  throw new Error(
    `${where} declares a '${member}' that is not a string. Every ` +
    'check over it compares against a literal, so a value of another ' +
    'type fails naming the literal rather than the type.',
  );
}

/**
 * Every environment entry a service sets, from either spelling.
 *
 * @throws Error When `environment` is neither a mapping nor a list.
 *
 * @remarks
 * A list entry is cut at its FIRST `=`, as `compose-service.ts` cuts
 * one, because a value can carry another.
 */
function environmentOf(
  node: unknown,
  where: string,
): ReadonlyMap<string, string | undefined> {
  if (node === undefined) {
    return new Map();
  }

  if (isMap(node)) {
    return new Map(node.items.map((pair) => [
      keyOf(pair.key, where),
      isScalar(pair.value) && pair.value.value === null
        ? undefined
        : entryText(pair.value, where),
    ]));
  }

  if (isSeq(node)) {
    return new Map(node.items.map((item) => {
      const entry = entryText(item, where);
      const split = entry.indexOf('=');

      return split === -1
        ? [entry, undefined]
        : [entry.slice(0, split), entry.slice(split + 1)];
    }));
  }

  throw new Error(
    `${where} declares an 'environment' that is neither a mapping ` +
    'nor a list, which is all compose accepts.',
  );
}

/**
 * A `ports` or `volumes` member, with the tag its node carries.
 *
 * @throws Error When the member is not a list, or carries a tag
 *   compose does not merge by.
 *
 * @remarks
 * A foreign tag is refused rather than read as untagged. A typo such
 * as `!overide` is not a replacement to compose, and handed back as a
 * tag nobody compares against it would redden a case naming the list
 * rather than the spelling.
 */
function taggedListOf(
  node: unknown,
  member: string,
  where: string,
): TaggedList | undefined {
  if (node === undefined) {
    return undefined;
  }

  if (!isSeq(node)) {
    throw new Error(
      `${where} declares a '${member}' that is not a list. An empty ` +
      'one is written `[]`, and under a merge tag `!reset []`.',
    );
  }

  if (node.tag !== undefined && !MERGE_TAGS.includes(node.tag)) {
    throw new Error(
      `${where} tags its '${member}' ${node.tag}, which is not a tag ` +
      `compose merges by. Only ${MERGE_TAGS.join(' and ')} are.`,
    );
  }

  return {
    tag: node.tag,
    entries: node.items.map((item) => entryText(item, `${where} ${member}`)),
  };
}

/**
 * A healthcheck's `test`, as the list compose runs.
 *
 * @throws Error When `healthcheck` is not a mapping, or its `test` is
 *   neither a list nor a string.
 */
function healthcheckTestOf(
  node: unknown,
  where: string,
): readonly string[] | undefined {
  if (node === undefined) {
    return undefined;
  }

  if (!isMap(node)) {
    throw new Error(`${where} declares a 'healthcheck' that is not a mapping.`);
  }

  const test: unknown = node.get('test', true);

  if (test === undefined) {
    return undefined;
  }

  if (isSeq(test)) {
    return test.items.map((item) => entryText(item, `${where} healthcheck`));
  }

  return ['CMD-SHELL', entryText(test, `${where} healthcheck`)];
}

/**
 * Every key under a top-level `volumes` mapping.
 *
 * @throws Error When `volumes` is present and is not a mapping.
 */
function volumeDeclarationsOf(
  node: unknown,
  source: string,
): readonly string[] {
  if (node === undefined) {
    return [];
  }

  if (!isMap(node)) {
    throw new Error(`${source} declares a 'volumes' that is not a mapping.`);
  }

  return node.items.map((pair) => keyOf(pair.key, source));
}

/**
 * The `services` mapping a document holds.
 *
 * @throws EmptyStackFileError When the document declares no service.
 * @throws Error When the document or its `services` is not a mapping.
 */
function servicesMappingOf(root: YAMLMap, source: string): YAMLMap {
  const node: unknown = root.get('services', true);

  if (node === undefined || (isScalar(node) && node.value === null)) {
    throw new EmptyStackFileError(source);
  }

  if (!isMap(node)) {
    throw new Error(`${source} declares a 'services' that is not a mapping.`);
  }

  if (node.items.length === 0) {
    throw new EmptyStackFileError(source);
  }

  return node;
}

/**
 * Every service a compose document declares, tags kept.
 *
 * @param text - The document, as text. Handed in rather than read, so
 *   a case drives the refusal and every plant over a document of its
 *   own.
 * @param source - Where the text came from, printed by every refusal.
 * @returns The document's services and its top-level volume keys.
 * @throws EmptyStackFileError When the document declares no service.
 * @throws Error When the text does not parse, or a member read here
 *   is not shaped the way compose declares it.
 */
export function parseStackFile(text: string, source: string): StackFile {
  const document = parseDocument(text);
  const error = document.errors.at(0);

  if (error !== undefined) {
    throw error;
  }

  const root: unknown = document.contents;

  if (!isMap(root)) {
    throw new Error(
      `${source} did not parse to a mapping. A compose file is one at ` +
      'its top level.',
    );
  }

  const services = servicesMappingOf(root, source).items.map((pair) => {
    const name = keyOf(pair.key, source);
    const where = `Service '${name}' in ${source}`;
    const body: unknown = pair.value;

    if (!isMap(body)) {
      throw new Error(`${where} has a body that is not a mapping.`);
    }

    const service: StackService = {
      name,
      image: stringMember(body, 'image', where),
      declaresBuild: body.has('build'),
      declaresCommand: body.has('command'),
      containerName: stringMember(body, 'container_name', where),
      environment: environmentOf(body.get('environment', true), where),
      ports: taggedListOf(body.get('ports', true), 'ports', where),
      volumes: taggedListOf(body.get('volumes', true), 'volumes', where),
      healthcheckTest: healthcheckTestOf(body.get('healthcheck', true), where),
    };

    return [name, service] as const;
  });

  return {
    source,
    services: new Map(services),
    volumeDeclarations: volumeDeclarationsOf(root.get('volumes', true), source),
  };
}

/**
 * The compose document at `file`, read.
 *
 * @param file - Which file to read.
 * @returns What {@link parseStackFile} answers, the path as source.
 * @throws Error When the file is not there, and anything
 *   {@link parseStackFile} throws.
 */
export function loadStackFile(file: string): StackFile {
  return parseStackFile(readFileSync(file, 'utf8'), file);
}

/**
 * One short-syntax port entry, split.
 *
 * @param entry - `[HOST_IP:]HOST:CONTAINER[/PROTOCOL]`, or a bare
 *   container port.
 * @returns Its halves.
 * @throws Error When the entry is a range, an IPv6 address, a
 *   variable, or anything else whose halves are not plain numbers.
 *
 * @remarks
 * Refused rather than approximated: a range compared as a string
 * misses the port inside it, which is a collision this check would
 * report as none.
 */
export function parsePortBinding(entry: string): PortBinding {
  const [mapping = ''] = entry.split('/');
  const halves = mapping.split(':');

  switch (halves.length) {
    case 1:
      return bindingOf(entry, undefined, undefined, halves[0]);
    case 2:
      return bindingOf(entry, undefined, halves[0], halves[1]);
    case 3:
      return bindingOf(entry, halves[0], halves[1], halves[2]);
    default:
      throw portRefusal(entry);
  }
}

/**
 * The refusal every unsplittable port entry raises.
 *
 * @param entry - The entry, as written.
 * @returns The error, for the caller to throw.
 */
function portRefusal(entry: string): Error {
  return new Error(
    `The port entry '${entry}' is not one this reader can split. It ` +
    'takes `[HOST_IP:]HOST:CONTAINER` with plain numbers, and refuses ' +
    'a range or a variable rather than comparing it as text and ' +
    'missing the port inside it.',
  );
}

/**
 * A binding out of halves already cut, each checked.
 *
 * @throws Error When a port half is not a plain number, or the host
 *   half is empty.
 */
function bindingOf(
  entry: string,
  hostIp: string | undefined,
  published: string | undefined,
  target: string | undefined,
): PortBinding {
  if (target === undefined || !PORT_NUMBER.test(target)) {
    throw portRefusal(entry);
  }

  if (published !== undefined && !PORT_NUMBER.test(published)) {
    throw portRefusal(entry);
  }

  if (hostIp === '') {
    throw portRefusal(entry);
  }

  return { entry, hostIp, published, target };
}

/**
 * The healthcheck argument after `flag`, such as `-p` or `-d`.
 *
 * @param test - A healthcheck `test`, as {@link StackService} answers
 *   it.
 * @param flag - The flag whose argument to read.
 * @returns The word after it, or `undefined` where it is absent.
 */
export function healthcheckFlag(
  test: readonly string[] | undefined,
  flag: string,
): string | undefined {
  const [form, ...rest] = test ?? [];
  const words = form === 'CMD-SHELL'
    ? rest.join(' ').split(/\s+/)
    : rest;
  const at = words.indexOf(flag);

  return at === -1
    ? undefined
    : words[at + 1];
}

/**
 * The service under `name`, refusing where there is none.
 *
 * @throws Error When the file declares no such service.
 */
export function serviceIn(file: StackFile, name: string): StackService {
  const service = file.services.get(name);

  if (service === undefined) {
    throw new Error(
      `No service named '${name}' in ${file.source}. ` +
      `Declared: ${[...file.services.keys()].join(', ')}.`,
    );
  }

  return service;
}

/**
 * A list as the merge leaves it.
 *
 * @throws Error Never for a list {@link parseStackFile} answered, which
 *   has refused any other tag already.
 */
function mergedList(
  base: TaggedList | undefined,
  overlay: TaggedList | undefined,
): readonly string[] {
  const under = base?.entries ?? [];

  if (overlay === undefined) {
    return under;
  }

  if (overlay.tag === OVERRIDE_TAG) {
    return overlay.entries;
  }

  if (overlay.tag === RESET_TAG) {
    return [];
  }

  return [...under, ...overlay.entries];
}

/**
 * One service as the base file declares it under the overlay.
 *
 * @param base - The base file, `docker-compose.yml`.
 * @param overlay - The overlay merged over it.
 * @param name - The service key both files spell.
 * @returns The service the four merge rules leave.
 * @throws Error When either file declares no such service, or a port
 *   left by the merge is not one {@link parsePortBinding} can split.
 */
export function resolveScratchService(
  base: StackFile,
  overlay: StackFile,
  name: string,
): ScratchService {
  const under = serviceIn(base, name);
  const over = serviceIn(overlay, name);

  return {
    name,
    containerName: over.containerName ?? under.containerName,
    environment: new Map([...under.environment, ...over.environment]),
    ports: mergedList(under.ports, over.ports).map(parsePortBinding),
    volumes: mergedList(under.volumes, over.volumes),
    healthcheckTest: over.healthcheckTest ?? under.healthcheckTest,
    declaresCommand: under.declaresCommand || over.declaresCommand,
  };
}
