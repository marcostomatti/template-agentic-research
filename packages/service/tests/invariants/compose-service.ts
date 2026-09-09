/**
 * @packageDocumentation
 * `docker-compose.yml` read as the per-service questions an invariant
 * asks of it: which services exist, which profiles gate each one, what
 * image each pins, what container name each declares, and which
 * environment keys each sets.
 *
 * THE COMPOSE FILE IS UNDER NO GATE IN THIS PACKAGE, and neither is
 * the script whose literals it has to agree with. `lint` runs over
 * `src lib workflows tests scripts` and opens no `.yml` and no `.sh`;
 * `check-types` reads the TypeScript program and neither; the naming
 * invariant does read both, for forbidden names, and reads names
 * rather than structure. So the coupling between this file and
 * `scripts/activate-workflows.sh` — a container name that script
 * defaults to, a compose command its refusal tells an operator to
 * run, a sqlite path it opens by literal — is held together today by
 * nobody, and the failure it produces is a run that gets further than
 * it should before stopping. This module is what puts that coupling
 * inside the isolated suite, and `compose-service.test.ts` beside it
 * makes the assertions.
 *
 * THIS ANSWERS THE FILE, NOT THE RESOLVED CONFIGURATION, and the
 * difference is worth stating because `docker compose config` answers
 * the other one and is the tool a reader reaches for first. That
 * command folds `${VAR:-default}` against the `.env` sitting beside
 * the compose file, splits a port string into its host and published
 * halves, and pulls an unprofiled service into a profile's set
 * wherever a `depends_on` names it — so a profile can start more than
 * it declares, and this reader cannot see that. It also needs docker
 * installed, which the isolated suite does not get to assume: the
 * suite runs wherever `bun run test` runs, and a machine with no
 * docker on it would turn every reading here into an error about the
 * environment rather than about the file.
 *
 * What the declaration is exactly the right subject for is the thing
 * being checked. A shell script's transcribed literal has to agree
 * with what the file SAYS — `AR_N8N_CONTAINER` defaults to the string
 * `container_name` declares, and the compose command in a refusal
 * message names the profile and the service key. None of those three
 * is a resolved value, and interpolating before comparing would only
 * add a way for the comparison to move.
 *
 * ENVIRONMENT HAS TWO SPELLINGS AND THEY FOLD TO ONE KEY SET. Compose
 * accepts a mapping (`KEY: value`) and a list (`- KEY=value`, or a
 * bare `- KEY` inheriting from the host), and this reader answers keys
 * from either. That is the one parse decision here with teeth, because
 * the assertion it feeds is an ABSENCE check: three settings must not
 * be set, since each moves the sqlite `activate-workflows.sh` opens by
 * literal path. A reader that handed back a list entry whole would
 * answer `N8N_USER_FOLDER=/data` where the check looks for
 * `N8N_USER_FOLDER`, report no such key, and pass — over a file that
 * plainly sets it.
 *
 * REFUSING AN EMPTY READ is owed for that same reason, and it is the
 * shape `workflow-dist.ts` next door already argues at length. A read
 * that came back holding no service satisfies every absence check
 * asked of it, and prints what a clean file prints. So
 * {@link EmptyComposeFileError} fires instead, and a caller reaches it
 * over text of its own rather than by emptying the package.
 *
 * Everything else on the path arrives unwrapped, as `Error` or as the
 * `YAMLParseError` the parser raises: a file that is not there, text
 * that will not parse, a `services` member that is not a mapping, a
 * service body that is not one, a `profiles` that is not a list, and a
 * member declared as something other than a string. None of those is a
 * state a caller distinguishes — each is a compose file to go and fix,
 * and each is loud where it happens.
 *
 * Split from the assertions the way `workflow-dist.ts`,
 * `openapi-coverage.ts` and `exports-send-free.ts` are: the input to a
 * check is a subject in its own right, it sits inside the program
 * `tsc` reads, and a case can ask it questions rather than assume the
 * answers.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { parse } from 'yaml';

/**
 * The compose file this package ships, resolved from this file's own
 * location rather than from the working directory.
 *
 * {@link parseComposeServices} takes text, so a case drives the
 * refusal and every plant over a document of its own. This constant is
 * what {@link loadComposeServices} reads when a caller names no file,
 * which is how the assertions over the real one are handed it.
 *
 * Keyed to where this file sits for the reason `workflow-dist.ts`
 * gives its own `DIST_DIR`: `bun run test` inside the package and the
 * `bun run --filter '@ar/*' test` fan-out both start in the package,
 * but the repo-root form leaves a worker's `process.cwd()` at the
 * root, where a relative `docker-compose.yml` names the umbrella's
 * own file — a different document, and one that would read as this
 * package's compose file having lost every service in it.
 */
export const COMPOSE_FILE = fileURLToPath(
  new URL('../../docker-compose.yml', import.meta.url),
);

/**
 * Thrown when a compose document declares no service.
 *
 * Covers a document with no `services` member and one whose `services`
 * is an empty mapping. Both are one fact to a caller — there is
 * nothing to ask a per-service question of — and nothing downstream
 * turns on which of the two it was.
 *
 * The refusal is what stops an empty read reading as a clean one. The
 * assertion this feeds that most needs it is the absence check over
 * environment keys: three settings must not appear, and a read holding
 * no service satisfies that having looked at nothing. The must-find
 * half of the same suite — an image pinned to a version, a container
 * name a script defaults to — would redden on an empty read as well,
 * but it would redden naming a service that is missing rather than a
 * document that holds none, which is a different edit.
 *
 * A distinct class rather than a bare `Error`, so a case covering this
 * path pins the failure to this cause. Every other way the read can
 * fail arrives unwrapped, and an assertion taking one of those would
 * pass for a read that got further than this one ever does.
 */
export class EmptyComposeFileError extends Error {
  /** The document that yielded nothing, as the caller named it. */
  readonly source: string;

  /**
   * @param source - Where the text came from, for the message. A file
   *   path from {@link loadComposeServices}, and whatever a caller
   *   driving {@link parseComposeServices} over its own text called
   *   it.
   */
  constructor(source: string) {
    super(
      `No compose service resolved out of ${source}. The assertions ` +
      'over a service are partly absence checks — three settings ' +
      'that must not be set, because each moves the sqlite ' +
      '`scripts/activate-workflows.sh` opens by literal path — so a ' +
      'read holding no service leaves them passing over nothing and ' +
      'the run printing what a healthy file prints. Either the ' +
      'document declares no `services` mapping, or the reader was ' +
      'pointed at something other than a compose file.',
    );
    this.name = this.constructor.name;
    this.source = source;
  }
}

/**
 * One compose service, cut down to the questions an invariant asks.
 *
 * Deliberately not the whole service body. A compose service carries
 * ports, volumes, healthchecks, dependency conditions and host
 * mappings, and declaring those here would give a format this repo
 * does not own a second home in it. What is named is what a check
 * keys on; anything else is read out of the file by whoever adds the
 * check that needs it.
 */
export interface ComposeService {
  /**
   * The service key, as the `services` mapping spells it.
   *
   * The name `docker compose up` and `--wait` take, and the half of a
   * failure that says which block to open. Distinct from
   * {@link ComposeService.containerName}, which is what `docker exec`
   * takes, and the two disagreeing on purpose is the point of
   * carrying both.
   */
  readonly name: string;

  /**
   * Every profile gating the service, in declaration order.
   *
   * Empty means UNGATED, which is compose's default set — the
   * services a bare `docker compose up -d` starts. So this member
   * answers the gate question in both directions, and an empty list
   * is a reading rather than an absence.
   *
   * A list and not a set: compose treats several profiles as
   * alternatives, any one of which starts the service, and a
   * duplicate is a file to fix rather than something to collapse
   * quietly.
   */
  readonly profiles: readonly string[];

  /**
   * The image reference the service pins, as written.
   *
   * `undefined` where the service declares none, which is a service
   * built from a `build:` block rather than pulled. Handed back whole
   * rather than split into a repository and a tag: a reference can
   * carry a registry host with a port of its own, so the colon that
   * separates a tag is not simply the last one, and no check here
   * needs the halves.
   */
  readonly image: string | undefined;

  /**
   * The container name the service fixes, or `undefined` where it
   * leaves compose to derive one.
   *
   * `undefined` is not the same as a name nobody chose: compose then
   * derives `<project>-<service>-<n>`, whose project half is the
   * checkout's directory name and moves with a clone under another
   * path and with `docker compose -p`. A script that addresses a
   * container by a fixed default needs this member set, which is the
   * whole reason it is read.
   */
  readonly containerName: string | undefined;

  /**
   * Every environment key the service sets, in declaration order.
   *
   * Keys and never values, which is what makes the two spellings one
   * answer: a mapping's keys and a list entry's name before its first
   * `=` are the same question asked twice. A bare list entry, which
   * inherits the host's value, is a key too — the service sets it as
   * far as the container is concerned, and the check reading this is
   * asking exactly that.
   *
   * The order is the file's rather than sorted, so a failure names
   * the line to open. Read it as a set; nothing here depends on the
   * order and a duplicate key is a file to fix.
   */
  readonly environmentKeys: readonly string[];
}

/**
 * A member of a service body that has to be a string when present.
 *
 * @param body - The service body, already known to be a mapping.
 * @param member - Which member to read, `image` or `container_name`.
 * @param service - The service key, for the message.
 * @param source - Where the document came from, for the message.
 * @returns The member, or `undefined` where the service declares
 *   none.
 * @throws Error When the member is present and is not a string.
 *
 * @remarks
 * Refused rather than coerced, and the reason is the same vacuity the
 * empty read carries one level up: a `container_name` parsed as a
 * number matches no string a script transcribed, so an equality
 * against it fails naming the wrong fault, and an absence check over
 * it passes having compared nothing.
 *
 * A plain `Error` rather than a class, on the split `workflow-dist.ts`
 * draws over its own node members: a class is what lets a case pin a
 * cause, and a malformed compose file is a defect to report rather
 * than a path this suite covers.
 */
function stringMemberOf(
  body: Record<string, unknown>,
  member: string,
  service: string,
  source: string,
): string | undefined {
  const value = body[member];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(
      `Service '${service}' in ${source} declares a '${member}' that ` +
      `is ${typeof value} and not a string. Every check over this ` +
      'member compares it against a literal some script or some ' +
      'message already spells, so a value of another type fails ' +
      'that comparison naming the literal rather than the type.',
    );
  }

  return value;
}

/**
 * The profiles gating a service.
 *
 * @param value - The service's `profiles` member, unchecked.
 * @param service - The service key, for the message.
 * @param source - Where the document came from, for the message.
 * @returns One entry per declared profile, empty where the service
 *   declares none — which is compose's default set.
 * @throws Error When `profiles` is present and is not a list of
 *   strings.
 */
function profilesOf(
  value: unknown,
  service: string,
  source: string,
): readonly string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value) || value.some((e) => typeof e !== 'string')) {
    throw new Error(
      `Service '${service}' in ${source} declares a 'profiles' that ` +
      'is not a list of strings. An unreadable gate is the one that ' +
      'reads as no gate at all, which is the default set — the ' +
      'services a bare `docker compose up -d` starts.',
    );
  }

  return value as readonly string[];
}

/**
 * Every environment key a service sets, from either spelling.
 *
 * @param value - The service's `environment` member, unchecked.
 * @param service - The service key, for the message.
 * @param source - Where the document came from, for the message.
 * @returns One key per entry, in declaration order, empty where the
 *   service declares no `environment` at all.
 * @throws Error When `environment` is neither a mapping nor a list of
 *   strings.
 *
 * @remarks
 * THE LIST FORM IS CUT AT THE FIRST `=` AND NOT THE LAST. A value can
 * carry one — a connection string, a cron expression, a path list —
 * so cutting at the last would answer a key with half a value stuck
 * to it, which is a key no check ever names.
 *
 * A LIST ENTRY WITH NO `=` IS A KEY, not a malformed one. Compose
 * reads it as inheriting the host's value for that name, so the
 * service sets it as far as the container is concerned, and a check
 * asking whether the setting reaches the process is asking about
 * exactly that entry.
 */
function environmentKeysOf(
  value: unknown,
  service: string,
  source: string,
): readonly string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    if (value.some((entry) => typeof entry !== 'string')) {
      throw new Error(
        `Service '${service}' in ${source} declares an ` +
        '\'environment\' list holding an entry that is not a ' +
        'string. A key that cannot be read is a key no absence ' +
        'check can report, and this list is read by one.',
      );
    }

    return (value as readonly string[]).map((entry) => {
      const split = entry.indexOf('=');

      return split === -1
        ? entry
        : entry.slice(0, split);
    });
  }

  if (typeof value !== 'object') {
    throw new Error(
      `Service '${service}' in ${source} declares an 'environment' ` +
      `that is ${typeof value}, and compose accepts only a mapping ` +
      'or a list. Read as neither, it would answer no keys at all, ' +
      'which is what an absence check over it reports as clean.',
    );
  }

  return Object.keys(value as Record<string, unknown>);
}

/**
 * The mapping a compose document's `services` member holds.
 *
 * @param text - The document.
 * @param source - Where it came from, for the messages.
 * @returns The `services` mapping, known non-empty.
 * @throws EmptyComposeFileError When the document declares no
 *   `services`, or an empty one.
 * @throws Error When the document, or its `services`, is not a
 *   mapping.
 */
function servicesMappingOf(
  text: string,
  source: string,
): Record<string, unknown> {
  const document: unknown = parse(text);

  if (typeof document !== 'object' || document === null) {
    throw new Error(
      `${source} did not parse to a mapping. A compose file is one ` +
      'at its top level, so this is either a different document or ' +
      'text that is not a compose file at all.',
    );
  }

  const member = (document as Record<string, unknown>)['services'];

  if (member === undefined || member === null) {
    throw new EmptyComposeFileError(source);
  }

  if (typeof member !== 'object' || Array.isArray(member)) {
    throw new Error(
      `${source} declares a 'services' that is not a mapping. Every ` +
      'question this reader answers is per service and keyed by the ' +
      'service name, so there is nothing to key on.',
    );
  }

  const services = member as Record<string, unknown>;

  if (Object.keys(services).length === 0) {
    throw new EmptyComposeFileError(source);
  }

  return services;
}

/**
 * Every service a compose document declares, keyed by service name.
 *
 * @param text - The document, as text. Handed in rather than read, so
 *   a case drives the refusal and every plant over a document of its
 *   own — which is what keeps both reachable once this package's own
 *   compose file is a healthy one.
 * @param source - Where the text came from. Printed by every refusal
 *   below and read by nothing, so a caller with no file names it
 *   whatever reads best in a failure.
 * @returns One {@link ComposeService} per service, in the document's
 *   own order, keyed by the name the `services` mapping spells.
 * @throws EmptyComposeFileError When the document declares no service.
 * @throws Error When the document, the `services` mapping, a service
 *   body or one of the members read off it is not shaped the way
 *   compose declares it.
 *
 * @remarks
 * A `Map` rather than a list, because both questions asked of this
 * answer are keyed: which services exist is its key set, and every
 * per-service question is a lookup. The insertion order is the
 * document's, so a walk over it reads the file top to bottom.
 */
export function parseComposeServices(
  text: string,
  source: string,
): ReadonlyMap<string, ComposeService> {
  const services = new Map<string, ComposeService>();

  for (const [name, value] of Object.entries(servicesMappingOf(text, source))) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(
        `Service '${name}' in ${source} has a body that is not a ` +
        'mapping. Every member this reader goes on to read would ' +
        'come back absent, which is indistinguishable from a ' +
        'service that declares none of them.',
      );
    }

    const body = value as Record<string, unknown>;

    services.set(name, {
      name,
      profiles: profilesOf(body['profiles'], name, source),
      image: stringMemberOf(body, 'image', name, source),
      containerName: stringMemberOf(body, 'container_name', name, source),
      environmentKeys: environmentKeysOf(body['environment'], name, source),
    });
  }

  return services;
}

/**
 * Every service the compose file at `file` declares.
 *
 * @param file - Which file to read. Defaults to {@link COMPOSE_FILE},
 *   the one this package ships.
 * @returns What {@link parseComposeServices} answers over its text,
 *   with the path as the source every refusal names.
 * @throws EmptyComposeFileError When the file declares no service.
 * @throws Error When the file is not there, will not parse, or is not
 *   shaped the way compose declares it.
 *
 * @remarks
 * A file that is absent arrives as the reader's `ENOENT`, unwrapped
 * and naming the path. It is not folded into
 * {@link EmptyComposeFileError} — where `workflow-dist.ts` folds an
 * absent directory into its own empty refusal, because a tree nothing
 * has built is the ordinary way that read comes back short. This
 * file is tracked, so its absence is a checkout that lost it rather
 * than a step somebody skipped, and there is no command to name in a
 * message.
 */
export function loadComposeServices(
  file: string = COMPOSE_FILE,
): ReadonlyMap<string, ComposeService> {
  return parseComposeServices(readFileSync(file, 'utf8'), file);
}
