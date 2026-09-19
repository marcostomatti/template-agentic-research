import type {
  DevToolsCommandOutcome,
  DevToolsCommandRunner,
} from './git';
import type { SpawnSyncReturns } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import {
  DEVTOOLS_ROUND_ENV_NAME,
  DEVTOOLS_UNKNOWN_BUILD_VALUE,
  resolveDevToolsBuildInfo,
  resolveDevToolsRepo,
} from './git';

/**
 * ## Nothing here spawns anything
 *
 * `git.ts` takes its command runner and its environment as arguments,
 * so every case below hands it a scripted runner and a literal
 * environment. No process is started, no temp directory is created,
 * nothing is cleaned up, and the suite passes in a directory that is no
 * git repository as readily as in one — which also means the
 * "non-repository" case is a runner that refuses, not an environment
 * somebody has to arrange.
 *
 * The recorder is the one mutable thing in this file. A spy has to
 * accumulate, and a fresh one is built per case, so the mutation is
 * local to the case that reads it.
 *
 * ## Why the refusals assert the ARGV and not only the values
 *
 * A function hard-wired to answer three `unknown`s would pass every
 * unknown-answering case here. So each carries its control — the same
 * call over a runner that answers, asserted to answer — and the
 * non-repository case additionally asserts WHICH commands ran, because
 * "the probe refused and the reads were skipped" and "all three
 * commands refused" are indistinguishable from the values alone.
 *
 * Cases that answer `unknown` run before the cases that answer a value,
 * which is this plan's order for every test file in the package. Both
 * of the file's exports are grouped that way across the file, not
 * within their own pair: the two refusal blocks run first, then the two
 * reading blocks.
 *
 * `resolveDevToolsRepo` shares the scripted runner, so the repository
 * slug is read over the same refuse-by-omission script: leaving
 * `remote` out of a script is a repository with no `origin`.
 */

/** A scripted runner and the argv it was handed, in order. */
interface ScriptedRunner {
  /** What {@link resolveDevToolsBuildInfo} is handed. */
  readonly run: DevToolsCommandRunner;

  /** Every argument vector the runner saw, joined with a space. */
  readonly calls: readonly string[];
}

/** What a scripted runner answers per command. */
interface Script {
  /** The work-tree probe's answer; absent means it refuses. */
  readonly probe?: string;

  /** `rev-parse HEAD`'s answer; absent means it refuses. */
  readonly commit?: string;

  /** `rev-parse --abbrev-ref HEAD`'s answer; absent means it refuses. */
  readonly branch?: string;

  /** `remote get-url origin`'s answer; absent means it refuses. */
  readonly remote?: string;
}

/** The argv `git.ts` runs to ask whether this is a work tree. */
const PROBE_CALL = 'rev-parse --is-inside-work-tree';

/** The argv `git.ts` runs to read the commit. */
const COMMIT_CALL = 'rev-parse HEAD';

/** The argv `git.ts` runs to read the branch. */
const BRANCH_CALL = 'rev-parse --abbrev-ref HEAD';

/** The argv `git.ts` runs to read the `origin` remote's url. */
const REMOTE_CALL = 'remote get-url origin';

/** A hash of the shape a sha1 repository answers. */
const HASH = '4f22b541b723707739e74421b36d1d04ade2e755';

/**
 * Build a runner that answers from a script and records what it saw.
 *
 * @param script - What each of the three commands answers. Anything the
 * script leaves out is refused with `{ok: false}`, which is how a
 * non-repository and a failing command are both spelled.
 * @returns The runner and its call log.
 */
function scripted(script: Script): ScriptedRunner {
  const calls: string[] = [];
  const answers = new Map<string, string | undefined>([
    [PROBE_CALL, script.probe],
    [COMMIT_CALL, script.commit],
    [BRANCH_CALL, script.branch],
    [REMOTE_CALL, script.remote],
  ]);

  return {
    calls,
    run: (args: readonly string[]): DevToolsCommandOutcome => {
      const call = args.join(' ');

      calls.push(call);

      const stdout = answers.get(call);

      return stdout === undefined
        ? { ok: false }
        : { ok: true, stdout };
    },
  };
}

/** A script for a healthy repository on a plainly-named branch. */
const HEALTHY: Script = Object.freeze({
  probe: 'true\n',
  commit: `${HASH}\n`,
  branch: 'main\n',
});

/** An environment stating no round. */
const NO_ENV: Readonly<Record<string, string | undefined>> = Object.freeze({});

/**
 * Resolve over a script and an environment.
 *
 * @param script - What the runner answers.
 * @param env - The environment to read the round from; defaults to one
 * that states none.
 * @returns The resolved values and the runner's call log.
 */
function resolve(script: Script, env = NO_ENV) {
  const runner = scripted(script);

  return { info: resolveDevToolsBuildInfo({ run: runner.run, env }), runner };
}

/**
 * Resolve the repository slug over a remote url.
 *
 * @param remote - What `git remote get-url origin` prints; left out to
 * have that command refuse, which is a repository with no `origin`.
 * @returns The slug and the runner's call log.
 */
function resolveRepo(remote?: string) {
  const runner = scripted(remote === undefined
    ? {}
    : { remote });

  return { repo: resolveDevToolsRepo(runner.run), runner };
}

/** A remote url of the shape GitHub prints for a cloned repository. */
const HTTPS_REMOTE = 'https://github.com/open-tomato/agentic-research.git';

describe('what resolveDevToolsBuildInfo cannot read', () => {
  it('answers unknown for all three outside a repository', () => {
    // Arrange: nothing in the script, so every command refuses — which
    // is what `git rev-parse` does with exit 128 outside a work tree.
    // Act
    const { info, runner } = resolve({});

    // Assert
    expect(info).toEqual({
      commit: DEVTOOLS_UNKNOWN_BUILD_VALUE,
      branch: DEVTOOLS_UNKNOWN_BUILD_VALUE,
      round: DEVTOOLS_UNKNOWN_BUILD_VALUE,
    });

    // The probe refused, so neither read was attempted: three unknowns
    // over three refused commands would read the same as this.
    expect(runner.calls).toEqual([PROBE_CALL]);

    // The control: the same call over a repository answers all three.
    expect(resolve(HEALTHY).info).toEqual({
      commit: HASH,
      branch: 'main',
      round: 'main',
    });
  });

  it('answers unknown for a probe that says it is not a work tree', () => {
    // Arrange: `git rev-parse --is-inside-work-tree` inside a bare
    // repository exits 0 and prints `false`, so an exit code alone is
    // not the reading.
    // Act
    const { info, runner } = resolve({ ...HEALTHY, probe: 'false\n' });

    // Assert
    expect(info.commit).toBe(DEVTOOLS_UNKNOWN_BUILD_VALUE);
    expect(info.branch).toBe(DEVTOOLS_UNKNOWN_BUILD_VALUE);
    expect(runner.calls).toEqual([PROBE_CALL]);

    // The control: `true` from the same runner reads both.
    expect(resolve(HEALTHY).info.commit).toBe(HASH);
  });

  it('answers unknown for a failing command inside a repository', () => {
    // Arrange: the probe answers, the commit read fails, the branch
    // read answers. One failure must not cost the other value.
    // Act
    const { info, runner } = resolve({ probe: 'true', branch: 'main' });

    // Assert
    expect(info).toEqual({
      commit: DEVTOOLS_UNKNOWN_BUILD_VALUE,
      branch: 'main',
      round: 'main',
    });
    expect(runner.calls).toEqual([PROBE_CALL, COMMIT_CALL, BRANCH_CALL]);

    // The mirror image: a failing BRANCH read costs the branch and the
    // round, not the commit.
    expect(resolve({ probe: 'true', commit: HASH }).info).toEqual({
      commit: HASH,
      branch: DEVTOOLS_UNKNOWN_BUILD_VALUE,
      round: DEVTOOLS_UNKNOWN_BUILD_VALUE,
    });
  });

  it('answers unknown for a command that prints nothing', () => {
    // Arrange: exit 0 and an empty stdout is not a value.
    // Act
    const { info } = resolve({ ...HEALTHY, commit: '   \n' });

    // Assert
    expect(info.commit).toBe(DEVTOOLS_UNKNOWN_BUILD_VALUE);

    // The control
    expect(resolve(HEALTHY).info.commit).toBe(HASH);
  });

  it('holds the commit to a hex hash', () => {
    // Arrange: the commit is spliced into the bundle as a string
    // literal, so anything that is no hash is dropped.
    const rejected = [
      'warning: core.hooksPath is set',
      `${HASH}'; alert(1); '`,
      'HEAD',
      'abc',
      `${HASH}${HASH}`,
    ];

    // Act and assert
    for (const stdout of rejected) {
      expect(resolve({ ...HEALTHY, commit: stdout }).info.commit)
        .toBe(DEVTOOLS_UNKNOWN_BUILD_VALUE);
    }

    // The control, and the trimming reading with it: a real hash with
    // the newline `git` prints IS answered, whole.
    expect(resolve({ ...HEALTHY, commit: `${HASH}\n` }).info.commit)
      .toBe(HASH);
  });

  it('holds the branch to the characters a ref may carry', () => {
    // Arrange
    const rejected = [
      'main; rm -rf /',
      'main\' + alert(1) + \'',
      'feature branch',
      'x'.repeat(201),
    ];

    // Act and assert
    for (const stdout of rejected) {
      expect(resolve({ ...HEALTHY, branch: stdout }).info.branch)
        .toBe(DEVTOOLS_UNKNOWN_BUILD_VALUE);
    }

    // The control: the punctuation a ref does carry survives.
    expect(resolve({ ...HEALTHY, branch: 'feat/q20b-1_dev.tools' }).info.branch)
      .toBe('feat/q20b-1_dev.tools');
  });

  it('answers unknown for the branch on a detached HEAD', () => {
    // Arrange: `--abbrev-ref HEAD` prints the literal HEAD when
    // nothing is checked out, and that is no branch name.
    // Act
    const { info } = resolve({ ...HEALTHY, branch: 'HEAD\n' });

    // Assert: and the round with it, since it has no branch to
    // sanitise.
    expect(info).toEqual({
      commit: HASH,
      branch: DEVTOOLS_UNKNOWN_BUILD_VALUE,
      round: DEVTOOLS_UNKNOWN_BUILD_VALUE,
    });

    // The control: a branch actually named `head` is a branch.
    expect(resolve({ ...HEALTHY, branch: 'head' }).info).toMatchObject({
      branch: 'head',
      round: 'head',
    });
  });

  it('answers unknown for a round no source can state', () => {
    // Arrange: a branch that sanitises to nothing at all, and an
    // environment stating nothing.
    // Act
    const { info } = resolve({ ...HEALTHY, branch: '___' });

    // Assert: `___` is a legal ref spelling, so the branch survives its
    // pattern; it is the ROUND that has nothing left after [a-z0-9-].
    expect(info.branch).toBe('___');
    expect(info.round).toBe(DEVTOOLS_UNKNOWN_BUILD_VALUE);

    // The control
    expect(resolve(HEALTHY).info.round).toBe('main');
  });
});

describe('what resolveDevToolsRepo cannot read', () => {
  it('answers unknown when there is no origin remote', () => {
    // Arrange: `git remote get-url origin` exits 2 with "No such
    // remote" in a repository nobody cloned and nobody added a remote
    // to, which is one refused command to this seam.
    // Act
    const { repo, runner } = resolveRepo();

    // Assert
    expect(repo).toBe(DEVTOOLS_UNKNOWN_BUILD_VALUE);

    // One command, and no work-tree probe before it: a repo read that
    // silently ran nothing would answer unknown just the same.
    expect(runner.calls).toEqual([REMOTE_CALL]);

    // The control: the same call over a runner that answers a url
    // answers the slug.
    expect(resolveRepo(HTTPS_REMOTE).repo).toBe('open-tomato/agentic-research');
  });

  it('answers unknown for a remote that prints nothing', () => {
    // Arrange: exit 0 and an empty stdout is not a url.
    // Act and assert
    for (const stdout of ['', '   \n']) {
      expect(resolveRepo(stdout).repo).toBe(DEVTOOLS_UNKNOWN_BUILD_VALUE);
    }

    // The control
    expect(resolveRepo(HTTPS_REMOTE).repo).toBe('open-tomato/agentic-research');
  });

  it('answers unknown for a url it cannot parse', () => {
    // Arrange: the slug is spliced into a GitHub new-issue link, so
    // anything that is no `owner/name` remote is dropped rather than
    // echoed. A local path, a host with no owner, an owner with no
    // name, a third path segment, a space, and dot segments that would
    // climb out of a url path are all refused.
    const rejected = [
      'warning: core.hooksPath is set',
      '/Users/someone/projects/agentic-research',
      '../agentic-research',
      'https://github.com/',
      'https://github.com/open-tomato',
      'https://github.com/open-tomato/agentic-research/tree/main',
      'https://github.com/open tomato/agentic-research',
      'https://github.com/../..',
      'git@github.com:open-tomato',
      'git@github.com',
      `https://github.com/open-tomato/${'x'.repeat(101)}`,
    ];

    // Act and assert
    for (const stdout of rejected) {
      expect(resolveRepo(stdout).repo).toBe(DEVTOOLS_UNKNOWN_BUILD_VALUE);
    }

    // The control: the two shapes a real remote takes still parse.
    expect(resolveRepo(HTTPS_REMOTE).repo).toBe('open-tomato/agentic-research');
    expect(resolveRepo('git@github.com:open-tomato/agentic-research').repo)
      .toBe('open-tomato/agentic-research');
  });
});

describe('what resolveDevToolsBuildInfo reads', () => {
  it('runs the repository probe before anything else', () => {
    // Arrange and act
    const { runner } = resolve(HEALTHY);

    // Assert: exactly three commands, in spec item 8.1's order, and no
    // command run twice.
    expect(runner.calls).toEqual([PROBE_CALL, COMMIT_CALL, BRANCH_CALL]);
  });

  it('sanitises a branch that needs it into the round', () => {
    // Arrange: a ref with a slash, a capital and a dot — none of which
    // may reach a directory name.
    // Act
    const { info } = resolve({ ...HEALTHY, branch: 'feat/Q20b-1.Shell\n' });

    // Assert: the branch is reported as git spells it, the round is the
    // sanitised form, and the two are deliberately different.
    expect(info.branch).toBe('feat/Q20b-1.Shell');
    expect(info.round).toBe('feat-q20b-1-shell');
  });

  it('lets VITE_DEVTOOLS_ROUND win over the branch', () => {
    // Arrange
    const env = { [DEVTOOLS_ROUND_ENV_NAME]: 'round-7' };

    // Act
    const { info } = resolve(HEALTHY, env);

    // Assert: the round comes from the environment; the commit and the
    // branch still come from git.
    expect(info).toEqual({ commit: HASH, branch: 'main', round: 'round-7' });

    // And it wins without a repository too, where there is no branch to
    // fall back to.
    expect(resolveDevToolsBuildInfo({ run: scripted({}).run, env })).toEqual({
      commit: DEVTOOLS_UNKNOWN_BUILD_VALUE,
      branch: DEVTOOLS_UNKNOWN_BUILD_VALUE,
      round: 'round-7',
    });
  });

  it('sanitises a round the environment stated', () => {
    // Arrange: the variable is operator-supplied, and it names a
    // directory, so it takes the same [a-z0-9-] treatment as a branch.
    const env = { [DEVTOOLS_ROUND_ENV_NAME]: '../Round 7!!' };

    // Act
    const { info } = resolve(HEALTHY, env);

    // Assert: no separator and no dot-segment survives, so the round
    // cannot name a directory outside the output directory.
    expect(info.round).toBe('round-7');
  });

  it('falls back to the branch when the environment round is unusable', () => {
    // Arrange: set-but-empty and set-but-punctuation both fall through
    // rather than answering unknown.
    const cases = ['', '   ', '../..'];

    // Act and assert
    for (const stated of cases) {
      const { info } = resolve(HEALTHY, {
        [DEVTOOLS_ROUND_ENV_NAME]: stated,
      });

      expect(info.round).toBe('main');
    }

    // The control: a usable value is still taken.
    expect(resolve(HEALTHY, { [DEVTOOLS_ROUND_ENV_NAME]: 'r9' }).info.round)
      .toBe('r9');
  });

  it('answers a frozen record', () => {
    // Arrange and act: the values reach a Vite `define` and the status
    // route, so nothing downstream may edit them in place.
    const { info } = resolve(HEALTHY);

    // Assert
    expect(Object.isFrozen(info)).toBe(true);
  });

  it('is implementable over node spawnSync result type', () => {
    // Arrange: `plugin.ts` builds the runner out of `spawnSync`, so the
    // mapping from node's result shape to DevToolsCommandOutcome is
    // asserted here at the type level. A signature edited in `git.ts`
    // that `plugin.ts` could no longer satisfy reds `check-types`
    // rather than failing at dev-server start.
    type Spawned = Pick<SpawnSyncReturns<string>, 'status' | 'stdout' | 'error'>;

    const runnerFrom = (
      spawn: (args: readonly string[]) => Spawned,
    ): DevToolsCommandRunner => (args) => {
      const { status, stdout, error } = spawn(args);

      return error === undefined && status === 0
        ? { ok: true, stdout }
        : { ok: false };
    };

    // Act
    const ok = runnerFrom(() => ({
      status: 0,
      stdout: 'true\n',
      error: undefined,
    }));
    const failed = runnerFrom(() => ({
      status: 128,
      stdout: '',
      error: undefined,
    }));

    // Assert
    expect(ok([])).toEqual({ ok: true, stdout: 'true\n' });
    expect(failed([])).toEqual({ ok: false });
  });
});

describe('what resolveDevToolsRepo reads', () => {
  it('answers owner/name for an https url', () => {
    // Arrange and act: the url `git clone https://…` writes, with the
    // newline `git` prints and without the `.git` suffix stripped yet.
    const { repo, runner } = resolveRepo(
      'https://github.com/open-tomato/agentic-research\n',
    );

    // Assert
    expect(repo).toBe('open-tomato/agentic-research');
    expect(runner.calls).toEqual([REMOTE_CALL]);

    // A host that is not GitHub parses the same way: the slug is a path
    // reading, not a host reading.
    expect(resolveRepo('https://gitlab.example.com/team/thing').repo)
      .toBe('team/thing');
  });

  it('answers owner/name for a git@ url', () => {
    // Arrange and act
    const { repo } = resolveRepo('git@github.com:open-tomato/agentic-research');

    // Assert
    expect(repo).toBe('open-tomato/agentic-research');

    // The `ssh://` spelling git writes for a remote carrying a port
    // reaches the same slug.
    expect(resolveRepo('ssh://git@github.com:22/open-tomato/thing').repo)
      .toBe('open-tomato/thing');
  });

  it('drops a .git suffix from either form', () => {
    // Arrange: `git clone` leaves the suffix on, and a GitHub slug
    // never carries it.
    // Act and assert
    expect(resolveRepo(HTTPS_REMOTE).repo).toBe('open-tomato/agentic-research');
    expect(resolveRepo('git@github.com:open-tomato/agentic-research.git').repo)
      .toBe('open-tomato/agentic-research');

    // The control that keeps the strip honest: only the TRAILING
    // suffix goes, so a repository actually named `.git`-something
    // keeps its name and a `.github` owner survives whole.
    expect(resolveRepo('https://github.com/open-tomato/dot.github').repo)
      .toBe('open-tomato/dot.github');
    expect(resolveRepo('https://github.com/.github/profile.git').repo)
      .toBe('.github/profile');
  });

  it('answers the slug alone for a url carrying credentials', () => {
    // Arrange: a remote a CI checkout wrote carries a token in its
    // userinfo, and that value must never reach the browser through the
    // status payload.
    const url = 'https://x-access-token:ghs_SECRET@github.com/open/thing.git';

    // Act
    const { repo } = resolveRepo(url);

    // Assert: the two captured segments and nothing else.
    expect(repo).toBe('open/thing');
    expect(repo).not.toContain('ghs_SECRET');
  });
});
