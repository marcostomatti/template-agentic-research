/**
 * The n8n compose service, held to the contract
 * `scripts/activate-workflows.sh` structurally depends on.
 *
 * That script arms this package's built workflows on a LOCAL n8n, and
 * everything it needs from the compose file next door it needs as a
 * LITERAL: it defaults `AR_N8N_CONTAINER` to a container name, its
 * refusal tells an operator to run a compose command naming a profile
 * and a service key, and it opens the instance's sqlite by absolute
 * path inside the container. None of those three is derived from the
 * compose file at run time, and none of them is checked anywhere —
 * `lint` runs over `src lib workflows tests scripts` and opens no
 * `.yml`, `check-types` reads neither file, and the naming invariant
 * reads both for forbidden names rather than for structure. This file
 * is where the two are held together. `compose-service.ts` beside it
 * is the reader; the script's own literals are read out of the script
 * rather than transcribed here, on the precedent
 * `tests/helpers/route-labels.ts` sets by reading its `/auth` mount
 * out of `src/index.ts`.
 *
 * WHAT BREAKING THE CONTRACT COSTS IS WHY IT IS WORTH A FILE. Every
 * one of these is a run that gets FURTHER than it should before
 * stopping, and two of them can end without stopping at all. A
 * container name that no longer matches leaves the script refusing
 * with `the n8n container ar-n8n is not running` against a stack that
 * is up, pointing at the stack rather than at the rename. A profile
 * or service key that moved leaves the same refusal telling an
 * operator to run a compose command that starts nothing. And a
 * `N8N_USER_FOLDER` added by somebody tidying moves the sqlite, which
 * is not a refusal at all: `node:sqlite` CREATES a database at a path
 * holding none, so the history-seeding step writes an empty file and
 * dies one statement later on a table that was never there.
 *
 * EVERY ASSERTION IS PAIRED WITH A PLANTED NEAR MISS, and each plant
 * goes in at the DOCUMENT rather than at the answer. {@link planted}
 * parses the real compose text, changes one thing, serialises it back
 * and runs it through the same reader — so a plant exercises the
 * parse, the two environment spellings and the member reads that a
 * value spliced into the answer would have skipped past. The no-op
 * plant is asserted equal to the real read before any of the others
 * are trusted, which is what says the harness itself is faithful.
 *
 * THE PLANTS ARE WHERE THE ZEROS BECOME READINGS. Half of what is
 * asserted here is an absence — no setting that moves the sqlite —
 * and an absence over a reader that had come back holding nothing
 * reads exactly like an absence over a healthy file. The refusal case
 * rules out the empty read; the plants rule out a reader that reads
 * the file and answers the same thing whatever it says.
 *
 * WHAT THIS FILE CANNOT SEE is the resolved configuration, and it is
 * worth naming rather than leaving to be discovered. `docker compose
 * config` folds `${VAR:-default}` against the `.env` beside the
 * compose file and pulls an unprofiled service into a profile's set
 * wherever a `depends_on` names it — so the `n8n` profile really
 * starts `postgres` too, which nothing here reports. That command
 * needs docker installed, which the isolated suite does not get to
 * assume, so the readings it answers are an operator's and live in
 * the measurement record rather than in a case.
 */
import type { ComposeService } from './compose-service.js';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';

import {
  COMPOSE_FILE,
  EmptyComposeFileError,
  loadComposeServices,
  parseComposeServices,
} from './compose-service.js';

// ---------------------------------------------------------------------------
// The two files
// ---------------------------------------------------------------------------

/** The compose file's text, read once and mutated by every plant. */
const COMPOSE_TEXT = readFileSync(COMPOSE_FILE, 'utf8');

/** Every service the compose file declares, read once. */
const SERVICES = loadComposeServices();

/**
 * The activation script, whose literals this file holds the compose
 * service to.
 *
 * Resolved from this file's own location for the reason
 * `COMPOSE_FILE` is: the repo-root launcher leaves a worker's
 * `process.cwd()` at the umbrella root, where a relative path names
 * nothing this package ships.
 */
const ACTIVATE_SCRIPT = readFileSync(
  fileURLToPath(
    new URL('../../scripts/activate-workflows.sh', import.meta.url),
  ),
  'utf8',
);

/** The service key the compose file is expected to spell. */
const SERVICE_NAME = 'n8n';

/**
 * The profile the compose file is expected to gate it behind.
 *
 * Spelled here and also read back out of the script, through the
 * compose command in its refusal message: the case below composes
 * that command out of what the READER answered and looks for it in
 * the script's text, so a profile renamed on one side alone leaves
 * the script naming a command that starts nothing.
 */
const PROFILE_NAME = 'n8n';

/**
 * The image the compose file is expected to pin.
 *
 * A version tag and never a floating one, and the reason is that
 * every measurement this port rests on was taken against this
 * version: the id-preserving imports, the publish verb this script
 * ends on, the readiness route the healthcheck polls, and the sqlite
 * schema the history-seeding step writes into. The notes written
 * against 2.3.0 before it did not carry across, which is the evidence
 * that a version move is a re-measurement rather than an upgrade.
 */
const PINNED_IMAGE = 'docker.n8n.io/n8nio/n8n:2.15.1';

/**
 * The default `AR_N8N_CONTAINER` takes in the activation script.
 *
 * @returns The name between `:-` and `}` in the script's own
 *   parameter expansion.
 * @throws Error When the script no longer carries that assignment.
 *
 * @remarks
 * READ AND NEVER TRANSCRIBED. A literal written out here would agree
 * with the compose file while the script disagreed with both, which
 * is the whole failure this case exists to report — and it is the
 * shape a reader is most likely to reach for.
 *
 * A refusal rather than a fallback where the assignment is gone,
 * because a default this cannot find is a script that addresses its
 * container some other way, and every reading below is about the
 * wrong thing from that point on.
 */
function scriptContainerDefault(): string {
  const found = /AR_N8N_CONTAINER="\$\{AR_N8N_CONTAINER:-([^}"]+)\}"/
    .exec(ACTIVATE_SCRIPT);

  if (found?.[1] === undefined) {
    throw new Error(
      'scripts/activate-workflows.sh no longer defaults ' +
      'AR_N8N_CONTAINER through a `${AR_N8N_CONTAINER:-...}` ' +
      'expansion. The container name the compose file fixes is only ' +
      'worth checking against the default some script actually ' +
      'takes, so this case has nothing left to compare.',
    );
  }

  return found[1];
}

/**
 * The sqlite path the activation script opens inside the container.
 *
 * @returns The absolute path in the script's own `const file = '...'`
 *   line, the one its history-seeding step hands to `node:sqlite`.
 * @throws Error When the script no longer declares it.
 *
 * @remarks
 * Read for the same reason the container default is, and used for a
 * different one: this path is what makes the roster of forbidden
 * settings a derivation instead of three names somebody remembered.
 * Each of the two path settings below names a SEGMENT of it, and the
 * case asserts the segment is really in the path the script opens.
 */
function scriptSqlitePath(): string {
  const found = /^const file = '([^']+)';$/m.exec(ACTIVATE_SCRIPT);

  if (found?.[1] === undefined) {
    throw new Error(
      'scripts/activate-workflows.sh no longer opens its sqlite ' +
      'through a `const file = \'...\';` line. The settings this ' +
      'file forbids are forbidden because each moves THAT path, so ' +
      'with the path gone the roster is a list with no subject.',
    );
  }

  return found[1];
}

/** The container name the script addresses by default. */
const CONTAINER_DEFAULT = scriptContainerDefault();

/** The sqlite path the script opens by literal. */
const SQLITE_PATH = scriptSqlitePath();

// ---------------------------------------------------------------------------
// The settings that must not be set
// ---------------------------------------------------------------------------

/** One setting the n8n service must not declare, and why. */
interface MovingSetting {
  /** The environment key itself. */
  readonly setting: string;

  /**
   * The segment of {@link SQLITE_PATH} it moves, where it moves one.
   *
   * `undefined` for the setting that does not move the file but
   * decides there is no sqlite to move.
   */
  readonly segment: string | undefined;
}

/**
 * The three settings that break the activation script's sqlite open.
 *
 * TWO OF THEM COMPOSE THE PATH AND THE THIRD REMOVES IT. n8n resolves
 * its database file as the user folder, then `.n8n`, then the sqlite
 * file name — so `N8N_USER_FOLDER` moves the first segment and
 * `DB_SQLITE_DATABASE` the last, and each is written here beside the
 * segment it moves. `DB_TYPE` carries none: it selects the driver, so
 * setting it to anything but sqlite leaves no file at that path at
 * all rather than the same file somewhere else.
 *
 * The segments are asserted to be IN the path the script opens, which
 * is what keeps this roster tied to that script rather than to a list
 * that was true when it was written.
 *
 * Each of the three is the quiet failure rather than a loud one:
 * `node:sqlite` creates a database at a path holding none, so a moved
 * file is an empty database and a failure one statement later, not a
 * refusal naming the setting.
 */
const SETTINGS_THAT_MOVE_THE_SQLITE: readonly MovingSetting[] = [
  { setting: 'N8N_USER_FOLDER', segment: '/home/node' },
  { setting: 'DB_SQLITE_DATABASE', segment: 'database.sqlite' },
  { setting: 'DB_TYPE', segment: undefined },
];

/**
 * A path segment no n8n sqlite default carries, as the control on the
 * segment assertion.
 *
 * Without it, a roster whose every segment was the empty string would
 * satisfy `includes` on any path at all, and the tie between the
 * roster and the script would be a tie to nothing.
 */
const ABSENT_SEGMENT = '/var/lib/n8n';

/**
 * Which of the forbidden settings a service sets.
 *
 * @param service - The service to read.
 * @returns The settings it declares, in roster order, empty when it
 *   declares none — which is the whole assertion.
 *
 * @remarks
 * Named settings and never a count. The three are not
 * interchangeable, and a report saying `1` sends a reader to look for
 * something before it says what.
 */
function movingSettingsSet(service: ComposeService): readonly string[] {
  return SETTINGS_THAT_MOVE_THE_SQLITE
    .map((row) => row.setting)
    .filter((setting) => service.environmentKeys.includes(setting));
}

// ---------------------------------------------------------------------------
// The plants
// ---------------------------------------------------------------------------

/** The compose document, in the shape a plant mutates it through. */
interface PlantedDocument {
  /** Every service body, keyed the way the file keys them. */
  services: Record<string, Record<string, unknown>>;
}

/** What every planted read is named in a refusal. */
const PLANTED_SOURCE = 'a planted docker-compose.yml';

/**
 * The real compose file with one thing changed, read back.
 *
 * @param mutate - Applied to the parsed document before it is
 *   serialised. Mutating rather than returning, so a plant reads as
 *   the one edit it is.
 * @returns What the reader answers over the mutated document.
 *
 * @remarks
 * THE PLANT GOES IN AT THE DOCUMENT, not at the answer, so what comes
 * back has been through the parse, the two environment spellings and
 * every member read a real service goes through. A `ComposeService`
 * assembled by hand and spliced into the map would have shown only
 * that the assertions compare two values.
 *
 * The round trip loses the file's comments and nothing else this
 * reader looks at, and the no-op plant below is where that is
 * asserted rather than assumed.
 */
function planted(
  mutate: (document: PlantedDocument) => void,
): ReadonlyMap<string, ComposeService> {
  const document = parse(COMPOSE_TEXT) as PlantedDocument;

  mutate(document);

  return parseComposeServices(stringify(document), PLANTED_SOURCE);
}

/**
 * One service body out of a parsed document.
 *
 * @param document - The parsed compose document.
 * @param name - Which service to reach.
 * @returns Its body, for a plant to change in place.
 * @throws Error When the document declares no such service, which
 *   means an earlier plant already moved what this one is aimed at.
 */
function bodyOf(
  document: PlantedDocument,
  name: string,
): Record<string, unknown> {
  const body = document.services[name];

  if (body === undefined) {
    throw new Error(`No '${name}' service to plant into.`);
  }

  return body;
}

/**
 * One service out of a read, refusing where there is none.
 *
 * @param services - What a read answered.
 * @param name - Which service to take.
 * @returns The service.
 * @throws Error When the read holds no service of that name.
 *
 * @remarks
 * Called inside each case rather than once at module scope, so a
 * compose file that lost the service reddens every case here naming
 * it, and the case that exists to report exactly that still runs.
 */
function serviceNamed(
  services: ReadonlyMap<string, ComposeService>,
  name: string,
): ComposeService {
  const service = services.get(name);

  if (service === undefined) {
    throw new Error(
      `No service named '${name}' in the read. ` +
      `Declared: ${[...services.keys()].join(', ')}.`,
    );
  }

  return service;
}

/**
 * The n8n service out of a planted document.
 *
 * @param mutate - Applied to the n8n service body alone, which is
 *   what most plants here change.
 * @returns The planted service.
 * @throws Error When the plant left no service under
 *   {@link SERVICE_NAME}, which the rename plant does on purpose and
 *   drives through {@link planted} instead.
 */
function plantedN8n(
  mutate: (body: Record<string, unknown>) => void,
): ComposeService {
  return serviceNamed(
    planted((document) => {
      mutate(bodyOf(document, SERVICE_NAME));
    }),
    SERVICE_NAME,
  );
}

/**
 * The compose command that starts a service, as a refusal message
 * would tell an operator to run it.
 *
 * @param service - The service, as the reader answered it.
 * @returns `docker compose --profile <p> up -d --wait <service>`,
 *   with one `--profile` per gate and none at all for an ungated
 *   service.
 *
 * @remarks
 * Composed from the READER'S answer rather than written out, which is
 * what makes the case below a comparison of the two files instead of
 * a comparison of two things this file spells. The joined form drops
 * the profile clause cleanly for an ungated service, which is what
 * the profile-deletion plant produces.
 */
function composeUpCommand(service: ComposeService): string {
  return [
    'docker compose',
    ...service.profiles.map((profile) => `--profile ${profile}`),
    'up -d --wait',
    service.name,
  ].join(' ');
}

// ---------------------------------------------------------------------------
// The reader
// ---------------------------------------------------------------------------

describe('compose reader - the refusal', () => {
  // First, because every absence assertion below it is satisfied by a
  // read that came back holding nothing. Both shapes of the empty
  // read are driven, and the real file is read in the same case as
  // the control: a refusal that fired on everything would pass the
  // two plants and say nothing.
  it('refuses a document declaring no service, and reads one that does', () => {
    const noMember = 'volumes:\n  ar_n8n_data:\n';
    const emptyMapping = 'services: {}\nvolumes:\n  ar_n8n_data:\n';

    expect(() => parseComposeServices(noMember, PLANTED_SOURCE))
      .toThrow(EmptyComposeFileError);
    expect(() => parseComposeServices(emptyMapping, PLANTED_SOURCE))
      .toThrow(EmptyComposeFileError);

    // The control. The same call over the real file answers rather
    // than refusing, and answers something.
    expect(SERVICES.size).toBeGreaterThan(0);
  });

  // The harness itself, asserted before anything is read through it.
  // Every plant below is the real document round-tripped through
  // `parse` and `stringify` with one thing changed, so a round trip
  // that moved something on its own would show up as a plant
  // reporting more than it planted.
  it('round-trips the real document unchanged through a no-op plant', () => {
    const unchanged = planted(() => undefined);

    expect([...unchanged.keys()]).toStrictEqual([...SERVICES.keys()]);
    expect(serviceNamed(unchanged, SERVICE_NAME))
      .toStrictEqual(serviceNamed(SERVICES, SERVICE_NAME));
  });
});

describe('compose reader - the two environment spellings', () => {
  // Compose accepts a mapping and a list, and the absence check
  // further down is worth nothing unless both answer keys. The plant
  // rewrites the real service's environment into the list form and
  // adds the three forbidden settings in it — so this case reports
  // both that the spelling folds and that a setting hidden in the
  // list form is still found.
  it('answers keys from a list the way it answers them from a mapping', () => {
    const listForm = plantedN8n((body) => {
      body['environment'] = [
        'GENERIC_TIMEZONE=UTC',
        'N8N_USER_FOLDER=/data/n8n',
        'DB_SQLITE_DATABASE=n8n.sqlite',
        'DB_TYPE',
      ];
    });

    expect(listForm.environmentKeys).toStrictEqual([
      'GENERIC_TIMEZONE',
      'N8N_USER_FOLDER',
      'DB_SQLITE_DATABASE',
      'DB_TYPE',
    ]);

    // `DB_TYPE` carries no `=` at all, which compose reads as
    // inheriting the host's value. It is a key the service sets as
    // far as the container is concerned, so the roster finds it.
    expect(movingSettingsSet(listForm)).toStrictEqual(
      SETTINGS_THAT_MOVE_THE_SQLITE.map((row) => row.setting),
    );
  });

  // The cut is at the FIRST `=` and not the last, which only a value
  // carrying one can report. A reader cutting at the last would
  // answer `DB_SQLITE_DATABASE=/data` here and find no forbidden
  // setting at all.
  it('cuts a list entry at the first equals sign', () => {
    const awkwardValue = plantedN8n((body) => {
      body['environment'] = ['DB_SQLITE_DATABASE=/data=n8n=.sqlite'];
    });

    expect(awkwardValue.environmentKeys)
      .toStrictEqual(['DB_SQLITE_DATABASE']);
    expect(movingSettingsSet(awkwardValue))
      .toStrictEqual(['DB_SQLITE_DATABASE']);
  });
});

// ---------------------------------------------------------------------------
// The contract
// ---------------------------------------------------------------------------

describe('the n8n compose service', () => {
  // The service the script's refusal message names. Planted by
  // renaming the key, which is what a tidy-up that spelled the
  // service after its container would do.
  it('is declared under the key the activation script names', () => {
    expect(serviceNamed(SERVICES, SERVICE_NAME).name).toBe(SERVICE_NAME);

    const renamed = planted((document) => {
      document.services['ar-n8n'] = bodyOf(document, SERVICE_NAME);
      delete document.services[SERVICE_NAME];
    });

    expect(renamed.has(SERVICE_NAME)).toBe(false);
    expect(renamed.has('ar-n8n')).toBe(true);
  });

  // Gated, so `docker compose up -d` cannot start an hourly LLM pass
  // by accident. `postgres` is read in the same case as the positive
  // control on the other answer: a reader that called everything
  // gated would pass the first expectation on its own.
  it('sits behind a profile, where dev postgres sits in the default set', () => {
    expect(serviceNamed(SERVICES, SERVICE_NAME).profiles)
      .toStrictEqual([PROFILE_NAME]);
    expect(serviceNamed(SERVICES, 'postgres').profiles).toStrictEqual([]);

    // The plant is the tidy-up that drops the gate. An empty list is
    // the default set, so this is the service moving INTO what
    // `docker compose up -d` starts.
    const ungated = plantedN8n((body) => {
      delete body['profiles'];
    });

    expect(ungated.profiles).toStrictEqual([]);
  });

  // The name `docker exec` takes, held against the default the script
  // reads when the environment names none. Both sides move for
  // different reasons — a compose file tidied, an environment
  // variable renamed — and neither move is visible to the other.
  it('fixes the container name the activation script defaults to', () => {
    const n8n = serviceNamed(SERVICES, SERVICE_NAME);

    expect(n8n.containerName).toBe(CONTAINER_DEFAULT);

    // Two plants, because the two ways this breaks read differently
    // to an operator. A renamed container leaves the script refusing
    // against a stack that is up; an ABSENT one leaves compose
    // deriving `<project>-n8n-1`, whose project half is the
    // checkout's directory name, so the same tree refuses on one
    // machine and not on another.
    const renamed = plantedN8n((body) => {
      body['container_name'] = `${CONTAINER_DEFAULT}-1`;
    });
    const derived = plantedN8n((body) => {
      delete body['container_name'];
    });

    expect(renamed.containerName).not.toBe(CONTAINER_DEFAULT);
    expect(derived.containerName).toBeUndefined();
  });

  // The version every measurement behind this port was taken against.
  // The plant is the floating tag, which is the change that would
  // move the CLI verbs, the readiness route and the sqlite schema all
  // at once and report none of it.
  it('pins the image to the version this port was measured against', () => {
    expect(serviceNamed(SERVICES, SERVICE_NAME).image).toBe(PINNED_IMAGE);

    const floating = plantedN8n((body) => {
      body['image'] = 'docker.n8n.io/n8nio/n8n:latest';
    });

    expect(floating.image).not.toBe(PINNED_IMAGE);
  });

  // The roster is tied to the script's own path before it is used, so
  // it is a derivation rather than three names that were true once.
  it('forbids settings that really do move the path the script opens', () => {
    const withSegment = SETTINGS_THAT_MOVE_THE_SQLITE
      .filter((row) => row.segment !== undefined);

    // Both halves present, or the filter below reads over nothing or
    // over everything and says so either way.
    expect(withSegment.length).toBeGreaterThan(0);
    expect(withSegment.length)
      .toBeLessThan(SETTINGS_THAT_MOVE_THE_SQLITE.length);

    const missing = withSegment
      .filter((row) => !SQLITE_PATH.includes(row.segment ?? ''))
      .map((row) => `${row.setting} moves '${row.segment ?? ''}'`);

    expect(missing).toStrictEqual([]);

    // The control on `includes`, which answers true for the empty
    // string and would agree with a roster naming no segment at all.
    expect(SQLITE_PATH.includes(ABSENT_SEGMENT)).toBe(false);
  });

  // The absence itself. Planted in the mapping form here; the list
  // form is planted in the spellings describe above, so both ways a
  // setting can reach the container are covered.
  it('sets none of the settings that move that path', () => {
    const n8n = serviceNamed(SERVICES, SERVICE_NAME);

    // Asserted non-empty first. A service declaring no environment at
    // all satisfies the report below having looked at nothing, which
    // is the one failure the zero structurally cannot see.
    expect(n8n.environmentKeys.length).toBeGreaterThan(0);
    expect(movingSettingsSet(n8n)).toStrictEqual([]);

    const tidied = plantedN8n((body) => {
      body['environment'] = {
        GENERIC_TIMEZONE: 'UTC',
        DB_TYPE: 'sqlite',
        DB_SQLITE_DATABASE: 'database.sqlite',
        N8N_USER_FOLDER: '/data',
      };
    });

    // All three named, in roster order, and not a count: the three
    // are not interchangeable and each is a different edit.
    expect(movingSettingsSet(tidied)).toStrictEqual(
      SETTINGS_THAT_MOVE_THE_SQLITE.map((row) => row.setting),
    );
  });

  // The last of the three literals: the compose command the script's
  // refusal tells an operator to run. Composed from what the reader
  // answered, so the case compares the compose file against the
  // script rather than comparing two strings this file spells.
  it('answers the compose command the script tells an operator to run', () => {
    const n8n = serviceNamed(SERVICES, SERVICE_NAME);
    const command = composeUpCommand(n8n);

    expect(command).toBe('docker compose --profile n8n up -d --wait n8n');
    expect(ACTIVATE_SCRIPT).toContain(command);

    // Either half moving leaves the script naming a command that
    // starts nothing, and neither move is loud: compose answers `no
    // such service` only when somebody runs it.
    const regated = plantedN8n((body) => {
      body['profiles'] = [`${PROFILE_NAME}-stack`];
    });
    const renamed = planted((document) => {
      document.services['n8n-local'] = bodyOf(document, SERVICE_NAME);
      delete document.services[SERVICE_NAME];
    });

    expect(ACTIVATE_SCRIPT).not.toContain(composeUpCommand(regated));
    expect(ACTIVATE_SCRIPT)
      .not.toContain(composeUpCommand(serviceNamed(renamed, 'n8n-local')));
  });
});
