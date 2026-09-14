/**
 * `docker-compose.scratch.yml` held against `docker-compose.yml`: the
 * scratch stack shares no container name, published port or volume
 * with the dev stack, and its Postgres listens on the port it
 * publishes.
 *
 * THE LAST CLAUSE IS THE ONE NOBODY WOULD GUESS.
 * `postgresCredentialData` in `scripts/n8n-credentials.ts` rewrites a
 * loopback host to the compose service `postgres` and KEEPS the URL's
 * port. So a scratch database the host reaches at `127.0.0.1:55432`
 * becomes an `ar-postgres` credential dialling `postgres:55432` from
 * inside the n8n container. A `55432:5432` binding answers the host,
 * and leaves that credential dialling a port nothing on the scratch
 * network listens on. The dev stack never meets this, because it
 * publishes `5432:5432`.
 *
 * NOTHING ELSE READS EITHER FILE FOR STRUCTURE. `lint` opens no
 * `.yml` and `check-types` reads neither. The naming invariant reads
 * the base file for names and does not open the overlay, which is
 * outside its scan surface. `scratch-stack.ts` beside this file is
 * the reader.
 * `compose-service.test.ts` asks the base file a different question,
 * whether its n8n service answers what `scripts/activate-workflows.sh`
 * transcribes, and neither file's cases reach the other's.
 *
 * EVERY ASSERTION IS PAIRED WITH A PLANTED NEAR MISS, planted in the
 * DOCUMENT with its tags kept. {@link planted} parses the real text
 * with `parseDocument`, changes one thing, writes the document back
 * out and reads it through the same reader. The `parse` and
 * `stringify` round trip that `compose-service.test.ts` plants
 * through would strip every tag on the way, turning each plant into
 * the untagged overlay. The no-op plants are asserted equal to the
 * real reads before any other plant is trusted.
 *
 * Each rule answers a list of NAMED faults rather than a boolean or a
 * count. The real files assert an empty list, and a plant asserts the
 * exact faults it should raise, so a plant tripping some other rule
 * than the one it was aimed at fails rather than passes.
 *
 * WHAT NO CASE HERE CAN SEE is compose's own merge and a running
 * server. `resolveScratchService` models the four merge rules the
 * overlay relies on; `docker compose config` over both files is the
 * reading that shows compose agrees, and whether Postgres listens
 * where `PGPORT` says is a reading off a running container. Both need
 * docker, which the isolated suite does not get to assume.
 */
import type { StackFile, TaggedList } from './scratch-stack.js';
import type { Document } from 'yaml';

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { isSeq, parse, parseDocument } from 'yaml';

import { COMPOSE_FILE } from './compose-service.js';
import {
  EmptyStackFileError,
  OVERRIDE_TAG,
  RESET_TAG,
  SCRATCH_COMPOSE_FILE,
  healthcheckFlag,
  loadStackFile,
  parsePortBinding,
  parseStackFile,
  resolveScratchService,
  serviceIn,
} from './scratch-stack.js';

// ---------------------------------------------------------------------------
// The two files
// ---------------------------------------------------------------------------

/** The base file's text, read once and edited by every base plant. */
const BASE_TEXT = readFileSync(COMPOSE_FILE, 'utf8');

/** The overlay's text, read once and edited by every overlay plant. */
const OVERLAY_TEXT = readFileSync(SCRATCH_COMPOSE_FILE, 'utf8');

/** The base file, read. */
const BASE = loadStackFile(COMPOSE_FILE);

/** The overlay, read. */
const OVERLAY = loadStackFile(SCRATCH_COMPOSE_FILE);

/** One service the scratch stack runs, and what it is addressed by. */
interface ScratchRow {
  /** The service key both files spell. */
  readonly service: string;

  /** The container name the scratch stack runs it under. */
  readonly container: string;

  /** The loopback port it publishes. */
  readonly port: string;
}

/**
 * The two services the scratch stack runs, in the overlay's order.
 *
 * Transcribed rather than read, and deliberately: these are the names
 * and ports an operator addresses the scratch stack by, so they are
 * the expectation. Reading them out of the overlay would hold the
 * overlay to itself.
 */
const SCRATCH_ROWS: readonly ScratchRow[] = [
  { service: 'postgres', container: 'ar-scratch-postgres', port: '55432' },
  { service: 'n8n', container: 'ar-scratch-n8n', port: '55678' },
];

/** The database the scratch Postgres creates. */
const SCRATCH_DATABASE = 'ar_scratch';

/** The only host address a scratch port may bind. */
const LOOPBACK = '127.0.0.1';

/** The service the database and listening-port rules are about. */
const POSTGRES = 'postgres';

// ---------------------------------------------------------------------------
// The plants
// ---------------------------------------------------------------------------

/** What every planted base file is named in a refusal. */
const PLANTED_BASE = 'a planted docker-compose.yml';

/** What every planted overlay is named in a refusal. */
const PLANTED_OVERLAY = 'a planted docker-compose.scratch.yml';

/** One edit to a parsed document, made in place. */
type Plant = (document: Document) => void;

/**
 * A real document with one thing changed, read back.
 *
 * @param text - The real document's text.
 * @param source - What the planted read is named in a refusal.
 * @param plant - The edit, applied to the parsed document.
 * @returns What the reader answers over the edited document.
 *
 * @remarks
 * `parseDocument` and `String` rather than `parse` and `stringify`,
 * because the tags are the subject and only the document model keeps
 * them. The round trip loses nothing this reader looks at, which the
 * no-op plant below asserts rather than assumes.
 */
function planted(text: string, source: string, plant: Plant): StackFile {
  const document = parseDocument(text);

  plant(document);

  return parseStackFile(String(document), source);
}

/** The real overlay with one thing changed, read back. */
function plantedOverlay(plant: Plant): StackFile {
  return planted(OVERLAY_TEXT, PLANTED_OVERLAY, plant);
}

/** The real base file with one thing changed, read back. */
function plantedBase(plant: Plant): StackFile {
  return planted(BASE_TEXT, PLANTED_BASE, plant);
}

/**
 * A list node for a plant to set, carrying `tag` where one is named.
 *
 * @param document - The document the node is created for.
 * @param entries - The list's entries.
 * @param tag - The merge tag, or `undefined` for an untagged list.
 * @returns The node.
 */
function listNode(
  document: Document,
  entries: readonly string[],
  tag: string | undefined,
): unknown {
  const node = document.createNode(entries);

  if (tag !== undefined) {
    node.tag = tag;
  }

  return node;
}

/**
 * A plant replacing one service's `ports` under `!override`.
 *
 * @param service - The service key whose list is replaced.
 * @param entries - The entries the new list carries.
 * @returns The plant.
 */
function portsPlant(service: string, entries: readonly string[]): Plant {
  return (document) => {
    document.setIn(
      ['services', service, 'ports'],
      listNode(document, entries, OVERRIDE_TAG),
    );
  };
}

/**
 * The list node at `path`, for a plant to retag in place.
 *
 * @throws Error When nothing at `path` is a list, which means an
 *   earlier edit already moved what this plant is aimed at.
 */
function listAt(document: Document, path: readonly string[]) {
  const node: unknown = document.getIn(path, true);

  if (!isSeq(node)) {
    throw new Error(`No list at ${path.join('.')} to plant into.`);
  }

  return node;
}

/** Keeps the entries of a list that are there, faults or ports. */
function isDefined(fault: string | undefined): fault is string {
  return fault !== undefined;
}

/** How a fault names a list's tag, or its absence. */
function tagReading(list: TaggedList | undefined): string {
  if (list === undefined) {
    return 'no list';
  }

  return list.tag ?? 'no tag';
}

// ---------------------------------------------------------------------------
// The rules, each as named faults
// ---------------------------------------------------------------------------

/**
 * What makes the overlay a stack of its own, or a file for a service
 * the base does not have.
 */
function aloneFaults(base: StackFile, overlay: StackFile): readonly string[] {
  return [...overlay.services.values()].flatMap((service) => [
    base.services.has(service.name)
      ? undefined
      : `${service.name} is a service docker-compose.yml does not declare`,
    service.image === undefined
      ? undefined
      : `${service.name} pins the image ${service.image}`,
    service.declaresBuild
      ? `${service.name} declares a build`
      : undefined,
  ].filter(isDefined));
}

/** Each scratch container off its own name, or on a dev one. */
function nameFaults(base: StackFile, overlay: StackFile): readonly string[] {
  const fixed = new Set(
    [...base.services.values()].map((service) => service.containerName),
  );

  return SCRATCH_ROWS.flatMap(({ service, container }) => {
    const name = resolveScratchService(base, overlay, service).containerName;

    return [
      name === container
        ? undefined
        : `${service} runs as ${name ?? 'a derived name'}, not ${container}`,
      name !== undefined && fixed.has(name)
        ? `${service} runs as ${name}, which docker-compose.yml fixes`
        : undefined,
    ].filter(isDefined);
  });
}

/** Whether scratch Postgres creates its own database and probes it. */
function databaseFaults(
  base: StackFile,
  overlay: StackFile,
): readonly string[] {
  const postgres = resolveScratchService(base, overlay, POSTGRES);
  const database = postgres.environment.get('POSTGRES_DB');
  const created = database ?? 'no named database';
  const probed = healthcheckFlag(postgres.healthcheckTest, '-d');

  return [
    database === SCRATCH_DATABASE
      ? undefined
      : `postgres creates ${created}, not ${SCRATCH_DATABASE}`,
    probed === database
      ? undefined
      : `the healthcheck probes ${probed ?? 'no database'}, not ${created}`,
  ].filter(isDefined);
}

/** Every base port list the overlay leaves unreplaced. */
function portTagFaults(
  base: StackFile,
  overlay: StackFile,
): readonly string[] {
  return SCRATCH_ROWS.flatMap(({ service }) => {
    const declared = serviceIn(base, service).ports?.entries ?? [];
    const replacing = serviceIn(overlay, service).ports;

    return declared.length === 0 || replacing?.tag === OVERRIDE_TAG
      ? []
      : [`${service} ports carry ${tagReading(replacing)}, not ${OVERRIDE_TAG}`];
  });
}

/**
 * Every binding the merge leaves that is not the one loopback port its
 * service owns, or that a base service publishes too.
 *
 * @remarks
 * A base port is compared by its published half alone, whatever
 * address either side binds. That is a choice rather than a model of
 * the host's socket rules: a scratch port sharing a number with a dev
 * one is refused on any interface, so no case here has to know which
 * pairs of addresses the host would let coexist.
 */
function portFaults(base: StackFile, overlay: StackFile): readonly string[] {
  const dev = new Map(
    [...base.services.values()].flatMap((service) => {
      const published = (service.ports?.entries ?? [])
        .map((entry) => parsePortBinding(entry).published)
        .filter(isDefined);

      return published.map((taken) => [taken, service.name] as const);
    }),
  );

  return SCRATCH_ROWS.flatMap(({ service, port }) => {
    const bindings = resolveScratchService(base, overlay, service).ports;
    const listed = bindings.map((binding) => binding.entry).join(', ');

    return [
      bindings.length === 1
        ? undefined
        : `${service} publishes [${listed}], not one binding`,
      ...bindings.flatMap((binding) => {
        const published = binding.published ?? 'an ephemeral port';
        const owner = dev.get(published);

        return [
          binding.hostIp === LOOPBACK
            ? undefined
            : `${service} binds ${binding.entry} beyond loopback`,
          published === port
            ? undefined
            : `${service} publishes ${published}, not ${port}`,
          owner === undefined
            ? undefined
            : `${service} publishes ${published}, as dev ${owner} does`,
        ];
      }),
    ].filter(isDefined);
  });
}

/**
 * Every volume list the base declares and the overlay does not empty,
 * every mount the merge leaves, and every volume the overlay declares.
 */
function volumeFaults(base: StackFile, overlay: StackFile): readonly string[] {
  const perService = SCRATCH_ROWS.flatMap(({ service }) => {
    const declared = serviceIn(base, service).volumes?.entries ?? [];
    const resetting = serviceIn(overlay, service).volumes;
    const mounted = resolveScratchService(base, overlay, service).volumes;

    return [
      declared.length === 0 || resetting?.tag === RESET_TAG
        ? undefined
        : `${service} volumes carry ${tagReading(resetting)}, not ${RESET_TAG}`,
      ...mounted.map((entry) => `${service} mounts ${entry}`),
    ].filter(isDefined);
  });

  return [
    ...perService,
    ...overlay.volumeDeclarations
      .map((name) => `the overlay declares the volume ${name}`),
  ];
}

/**
 * Whether the scratch Postgres listens on the port it publishes, on
 * the port its bindings forward to, and on the port it probes.
 */
function listenFaults(base: StackFile, overlay: StackFile): readonly string[] {
  const postgres = resolveScratchService(base, overlay, POSTGRES);
  const listening = postgres.environment.get('PGPORT');
  const on = `listens on ${listening ?? 'the server default'}`;
  const probed = healthcheckFlag(postgres.healthcheckTest, '-p');

  return [
    listening === undefined
      ? 'postgres sets no PGPORT'
      : undefined,
    ...postgres.ports.flatMap((binding) => [
      binding.target === listening
        ? undefined
        : `postgres forwards ${binding.entry} to ${binding.target}, and ${on}`,
      binding.published === listening
        ? undefined
        : `postgres publishes ${binding.published ?? 'no port'}, and ${on}`,
    ]),
    probed === listening
      ? undefined
      : `the healthcheck probes ${probed ?? 'no port'}, where postgres ${on}`,
    postgres.declaresCommand
      ? 'postgres declares a command, which can set a port PGPORT does not'
      : undefined,
  ].filter(isDefined);
}

// ---------------------------------------------------------------------------
// The reader
// ---------------------------------------------------------------------------

describe('scratch stack reader - the refusals', () => {
  // First, because every rule below is partly an absence, and a read
  // holding no service satisfies an absence having compared nothing.
  // Both real files are read in the same case as the control: a
  // refusal that fired on everything would pass the two plants.
  it('refuses a document with no service, and reads both real files', () => {
    expect(() => parseStackFile('volumes:\n  scratch:\n', PLANTED_OVERLAY))
      .toThrow(EmptyStackFileError);
    expect(() => parseStackFile('services: {}\n', PLANTED_OVERLAY))
      .toThrow(EmptyStackFileError);

    expect(BASE.services.size).toBeGreaterThan(0);
    expect(OVERLAY.services.size).toBeGreaterThan(0);
  });

  // A misspelt tag is not a replacement to compose, so the reader
  // refuses it by name rather than answering a tag nothing compares
  // against. Ranges and IPv6 addresses are refused for the port
  // rule's sake, since a range compared as text misses the port
  // inside it. The three short shapes compose accepts are the
  // controls.
  it('refuses a foreign tag or an unsplittable port, splits the rest', () => {
    expect(() => plantedOverlay((document) => {
      listAt(document, ['services', POSTGRES, 'ports']).tag = '!overide';
    })).toThrow('not a tag compose merges by');

    const refusal = 'not one this reader can split';

    expect(() => parsePortBinding('55432-55433:55432')).toThrow(refusal);
    expect(() => parsePortBinding('[::1]:55432:55432')).toThrow(refusal);
    expect(() => parsePortBinding('PGPORT:55432')).toThrow(refusal);

    expect(parsePortBinding('127.0.0.1:55432:55432')).toStrictEqual({
      entry: '127.0.0.1:55432:55432',
      hostIp: '127.0.0.1',
      published: '55432',
      target: '55432',
    });
    expect(parsePortBinding('5433:5432/tcp')).toStrictEqual({
      entry: '5433:5432/tcp',
      hostIp: undefined,
      published: '5433',
      target: '5432',
    });
    expect(parsePortBinding('5678')).toStrictEqual({
      entry: '5678',
      hostIp: undefined,
      published: undefined,
      target: '5678',
    });
  });

  // The harness itself, asserted before anything is read through it.
  // A round trip that moved a tag or a value on its own would show up
  // as a plant reporting more than it planted.
  it('round-trips both real documents unchanged through a no-op plant', () => {
    const base = plantedBase(() => undefined);
    const overlay = plantedOverlay(() => undefined);

    expect(base.services).toStrictEqual(BASE.services);
    expect(base.volumeDeclarations).toStrictEqual(BASE.volumeDeclarations);
    expect(overlay.services).toStrictEqual(OVERLAY.services);
    expect(overlay.volumeDeclarations)
      .toStrictEqual(OVERLAY.volumeDeclarations);
  });
});

describe('scratch stack reader - the tags', () => {
  /** Every list's tag in a read, as one line per list. */
  function tagsOf(file: StackFile): readonly string[] {
    return [...file.services.values()].flatMap((service) => [
      `${service.name} ports ${tagReading(service.ports)}`,
      `${service.name} volumes ${tagReading(service.volumes)}`,
    ]);
  }

  // The reason the reader goes through `parseDocument`. With every
  // tag stripped, a plain `parse` answers the same value it answers
  // for the real overlay, so a tag-blind reader cannot tell the
  // overlay that replaces the dev ports from one appending to them.
  // This reader answers the difference.
  it('reads the tags a plain parse throws away', () => {
    const document = parseDocument(OVERLAY_TEXT);

    for (const { service } of SCRATCH_ROWS) {
      for (const member of ['ports', 'volumes']) {
        delete listAt(document, ['services', service, member]).tag;
      }
    }

    const untaggedText = String(document);

    expect(parse(untaggedText, { logLevel: 'error' }))
      .toStrictEqual(parse(OVERLAY_TEXT, { logLevel: 'error' }));

    expect(tagsOf(OVERLAY)).toStrictEqual([
      `postgres ports ${OVERRIDE_TAG}`,
      `postgres volumes ${RESET_TAG}`,
      `n8n ports ${OVERRIDE_TAG}`,
      `n8n volumes ${RESET_TAG}`,
    ]);
    expect(tagsOf(parseStackFile(untaggedText, PLANTED_OVERLAY)))
      .toStrictEqual([
        'postgres ports no tag',
        'postgres volumes no tag',
        'n8n ports no tag',
        'n8n volumes no tag',
      ]);
  });
});

// ---------------------------------------------------------------------------
// The overlay, held against the base
// ---------------------------------------------------------------------------

describe('the scratch overlay', () => {
  // An overlay pinning no image cannot start on its own, which keeps
  // it from being run as a stack without the base under it. And a
  // service key the base lacks is not an overlay at all but a new
  // service, merged over nothing.
  it('is never used alone: no image, build or service the base lacks', () => {
    expect([...OVERLAY.services.keys()])
      .toStrictEqual(SCRATCH_ROWS.map((row) => row.service));
    expect(aloneFaults(BASE, OVERLAY)).toStrictEqual([]);

    const imaged = plantedOverlay((document) => {
      document.setIn(['services', POSTGRES, 'image'], 'postgres:16-alpine');
    });
    const added = plantedOverlay((document) => {
      document.setIn(
        ['services', 'postgres-scratch', 'container_name'],
        'ar-scratch-postgres',
      );
    });

    expect(aloneFaults(BASE, imaged))
      .toStrictEqual(['postgres pins the image postgres:16-alpine']);
    expect(aloneFaults(BASE, added)).toStrictEqual([
      'postgres-scratch is a service docker-compose.yml does not declare',
    ]);
  });

  // `container_name` is a scalar and replaces without a tag, but only
  // where the overlay writes one: the base fixes `ar-n8n`, and an
  // overlay leaving that line out inherits it under any `-p`. The
  // base-side plant is the other direction, a dev service taking a
  // scratch name.
  it('renames both containers away from every name the base fixes', () => {
    expect(nameFaults(BASE, OVERLAY)).toStrictEqual([]);

    const devName = serviceIn(BASE, 'n8n').containerName;

    expect(devName).toBeDefined();

    const inherited = plantedOverlay((document) => {
      document.deleteIn(['services', 'n8n', 'container_name']);
    });
    const taken = plantedBase((document) => {
      document.setIn(['services', 'n8n', 'container_name'], 'ar-scratch-n8n');
    });

    expect(nameFaults(BASE, inherited)).toStrictEqual([
      `n8n runs as ${devName ?? ''}, not ar-scratch-n8n`,
      `n8n runs as ${devName ?? ''}, which docker-compose.yml fixes`,
    ]);
    expect(nameFaults(taken, OVERLAY)).toStrictEqual([
      'n8n runs as ar-scratch-n8n, which docker-compose.yml fixes',
    ]);
  });

  // Environment entries merge by key, so an overlay that drops its
  // `POSTGRES_DB` line quietly creates the dev database's name. The
  // healthcheck is held to the same name, since `test` replaces the
  // base's whole and a stale `-d` would probe a database never made.
  it('moves postgres to its own database, and probes that one', () => {
    expect(databaseFaults(BASE, OVERLAY)).toStrictEqual([]);

    const devDatabase = serviceIn(BASE, POSTGRES).environment.get('POSTGRES_DB');

    expect(devDatabase).toBeDefined();

    const inherited = plantedOverlay((document) => {
      document.deleteIn(['services', POSTGRES, 'environment', 'POSTGRES_DB']);
    });
    const staleProbe = plantedOverlay((document) => {
      document.setIn(
        ['services', POSTGRES, 'healthcheck', 'test'],
        document.createNode(['CMD-SHELL', 'pg_isready -U ar -d ar -p 55432']),
      );
    });

    expect(databaseFaults(BASE, inherited)).toStrictEqual([
      `postgres creates ${devDatabase ?? ''}, not ${SCRATCH_DATABASE}`,
      `the healthcheck probes ${SCRATCH_DATABASE}, not ${devDatabase ?? ''}`,
    ]);
    expect(databaseFaults(BASE, staleProbe)).toStrictEqual([
      `the healthcheck probes ar, not ${SCRATCH_DATABASE}`,
    ]);
  });

  // The file's shape, asserted directly: every port list the base
  // declares is replaced under `!override`. Two near misses, because
  // the two wrong answers cost different things — no tag appends the
  // dev ports, and `!reset` publishes nothing at all.
  it('replaces every published port list under !override', () => {
    expect(portTagFaults(BASE, OVERLAY)).toStrictEqual([]);

    const untagged = plantedOverlay((document) => {
      delete listAt(document, ['services', POSTGRES, 'ports']).tag;
    });
    const reset = plantedOverlay((document) => {
      listAt(document, ['services', 'n8n', 'ports']).tag = RESET_TAG;
    });

    expect(portTagFaults(BASE, untagged))
      .toStrictEqual([`postgres ports carry no tag, not ${OVERRIDE_TAG}`]);
    expect(portTagFaults(BASE, reset))
      .toStrictEqual([`n8n ports carry ${RESET_TAG}, not ${OVERRIDE_TAG}`]);
  });

  // What the merge leaves, rather than what the file says: one
  // binding per service, on loopback, on its own port, and on no
  // port any base service publishes. Each plant moves one of those.
  // The last is planted in the base: a dev service taking the
  // scratch port.
  it('publishes one loopback port per service, none the base takes', () => {
    expect(portFaults(BASE, OVERLAY)).toStrictEqual([]);

    const appended = plantedOverlay((document) => {
      delete listAt(document, ['services', POSTGRES, 'ports']).tag;
    });
    const unpublished = plantedOverlay((document) => {
      listAt(document, ['services', 'n8n', 'ports']).tag = RESET_TAG;
    });
    const everyInterface = plantedOverlay(portsPlant(POSTGRES, ['55432:55432']));
    const liveDatabasePort = plantedOverlay(
      portsPlant(POSTGRES, ['127.0.0.1:5433:55432']),
    );
    const taken = plantedBase(portsPlant('n8n', ['127.0.0.1:55678:5678']));

    expect(portFaults(BASE, appended)).toStrictEqual([
      'postgres publishes [5432:5432, 127.0.0.1:55432:55432], not one binding',
      'postgres binds 5432:5432 beyond loopback',
      'postgres publishes 5432, not 55432',
      'postgres publishes 5432, as dev postgres does',
    ]);
    expect(portFaults(BASE, unpublished))
      .toStrictEqual(['n8n publishes [], not one binding']);
    expect(portFaults(BASE, everyInterface))
      .toStrictEqual(['postgres binds 55432:55432 beyond loopback']);
    expect(portFaults(BASE, liveDatabasePort)).toStrictEqual([
      'postgres publishes 5433, not 55432',
      'postgres publishes 5433, as dev postgres-live does',
    ]);
    expect(portFaults(taken, OVERLAY))
      .toStrictEqual(['n8n publishes 55678, as dev n8n does']);
  });

  // Volumes are held on both halves at once: the tag the file writes,
  // and the mounts the merge leaves. An untagged `[]` merges as
  // nothing and keeps the base's mount; an `!override` carrying the
  // base's entry keeps it too, under a tag that looks right. A volume
  // declared at the top of the overlay is the third way to share one.
  it('empties every volume list under !reset, and declares no volume', () => {
    expect(volumeFaults(BASE, OVERLAY)).toStrictEqual([]);

    const pgMount = serviceIn(BASE, POSTGRES).volumes?.entries ?? [];
    const n8nMount = serviceIn(BASE, 'n8n').volumes?.entries ?? [];

    expect(pgMount.length).toBe(1);
    expect(n8nMount.length).toBe(1);

    const untagged = plantedOverlay((document) => {
      delete listAt(document, ['services', POSTGRES, 'volumes']).tag;
    });
    const overridden = plantedOverlay((document) => {
      document.setIn(
        ['services', 'n8n', 'volumes'],
        listNode(document, n8nMount, OVERRIDE_TAG),
      );
    });
    const declared = plantedOverlay((document) => {
      document.setIn(['volumes', 'scratch_pg_data'], null);
    });

    expect(volumeFaults(BASE, untagged)).toStrictEqual([
      `postgres volumes carry no tag, not ${RESET_TAG}`,
      ...pgMount.map((entry) => `postgres mounts ${entry}`),
    ]);
    expect(volumeFaults(BASE, overridden)).toStrictEqual([
      `n8n volumes carry ${OVERRIDE_TAG}, not ${RESET_TAG}`,
      ...n8nMount.map((entry) => `n8n mounts ${entry}`),
    ]);
    expect(volumeFaults(BASE, declared))
      .toStrictEqual(['the overlay declares the volume scratch_pg_data']);
  });

  // The clause `postgresCredentialData` forces, argued in this file's
  // header. `PGPORT` is the one port setting, so it is held to both
  // halves of the binding and to the healthcheck's `-p`, and a
  // `command` is refused because a flag on it can move the listener
  // where none of those three would see.
  it('has postgres listen on the port it publishes, and probe that port', () => {
    expect(listenFaults(BASE, OVERLAY)).toStrictEqual([]);
    expect(resolveScratchService(BASE, OVERLAY, POSTGRES).environment
      .get('PGPORT')).toBe('55432');

    const forwarded = plantedOverlay(
      portsPlant(POSTGRES, ['127.0.0.1:55432:5432']),
    );
    const unset = plantedOverlay((document) => {
      document.deleteIn(['services', POSTGRES, 'environment', 'PGPORT']);
    });
    const staleProbe = plantedOverlay((document) => {
      document.setIn(
        ['services', POSTGRES, 'healthcheck', 'test'],
        document.createNode([
          'CMD-SHELL',
          'pg_isready -U ar -d ar_scratch -p 5432',
        ]),
      );
    });
    const commanded = plantedOverlay((document) => {
      document.setIn(
        ['services', POSTGRES, 'command'],
        document.createNode(['postgres', '-p', '5432']),
      );
    });

    expect(listenFaults(BASE, forwarded)).toStrictEqual([
      'postgres forwards 127.0.0.1:55432:5432 to 5432, and listens on 55432',
    ]);
    const serverDefault = 'listens on the server default';

    expect(listenFaults(BASE, unset)).toStrictEqual([
      'postgres sets no PGPORT',
      `postgres forwards 127.0.0.1:55432:55432 to 55432, and ${serverDefault}`,
      `postgres publishes 55432, and ${serverDefault}`,
      `the healthcheck probes 55432, where postgres ${serverDefault}`,
    ]);
    expect(listenFaults(BASE, staleProbe)).toStrictEqual([
      'the healthcheck probes 5432, where postgres listens on 55432',
    ]);
    expect(listenFaults(BASE, commanded)).toStrictEqual([
      'postgres declares a command, which can set a port PGPORT does not',
    ]);
  });
});
