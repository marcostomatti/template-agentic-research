/**
 * Whether `scripts/check-doc-links.ts` behaves the way `bun run
 * gate:doc-links` actually runs it: spawned as its own process, over a
 * real git repository, reading its own `--root` flag and answering in
 * its own exit code. `tests/scripts/check-doc-links.test.ts` drives
 * every rule the checker follows without this process ever leaving
 * itself; what only a spawned run can prove is that `INVOKED_AS_CLI`
 * fires, that `parseDocLinksArguments` reads a real command line, and
 * that the two exit codes a passing report can never produce — 1 for
 * a finding, 2 for a run that could not happen at all — are the ones
 * the operating system actually reports back.
 *
 * Refusals first, and each is paired with the same tree once the one
 * fault that earned it is gone, in the same case: a broken backtick
 * path and a broken markdown link are both `unresolved` findings and
 * both exit 0 once the path they name is tracked; an unused marker
 * exits 0 once its document names the reference it was written for,
 * and a marker sitting on a path that already resolves exits 0 once
 * the marker is gone; and a root outside any git work tree exits 2
 * until the same directory IS one. Pairing them is the point of
 * spawning at all — a case reading only that the broken tree exited
 * non-zero would pass a binary that refused every tree it was ever
 * pointed at.
 *
 * After the refusals: a `.claude/` finding, read for the exit code it
 * does NOT move and the section it prints anyway, and a tree assembled
 * so that its three references resolve one apiece through the package
 * base, the doc directory and a tracked `.gitignore` — the three
 * things {@link resolutionBases} and the ignore question exist for, in
 * `../../scripts/check-doc-links.ts`, proven together over one spawned
 * run rather than three isolated calls.
 *
 * Every fixture is a throwaway repository this file builds in a
 * temporary directory and never this repository's own tree, for the
 * reason `check-doc-links.test.ts` gives: a checker graded against the
 * tree it was tuned on passes that tree whatever it does.
 */
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

import { gitEnvironment } from '../../scripts/check-doc-links.js';

/**
 * One markdown text out of its lines, so a line number asserted
 * against it can be counted off the array — the same helper
 * `check-doc-links.test.ts` reads its own fixtures with.
 */
function doc(...lines: readonly string[]): string {
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// The command this file spawns
// ---------------------------------------------------------------------------

/**
 * `scripts/check-doc-links.ts`, resolved from this file's own
 * location rather than the working directory, so the suite runs the
 * same way launched from the package and from the repository root.
 */
const ENTRY = fileURLToPath(
  new URL('../../scripts/check-doc-links.ts', import.meta.url),
);

/**
 * Where every run below is launched from — never one of the fixture
 * roots. A command that fell back to `process.cwd()` instead of
 * reading `--root` would fail its own "tracks no markdown" guard over
 * this directory rather than quietly answering about the wrong tree,
 * so a case here would read the mistake rather than pass around it.
 */
const SPAWN_CWD = tmpdir();

/** What one spawned run answered. */
interface CliRun {

  /** The process exit code, or `null` when it never produced one. */
  readonly status: number | null;

  /** Everything written to stdout. */
  readonly stdout: string;

  /** Everything written to stderr. */
  readonly stderr: string;
}

/**
 * Runs the command over `root`, exactly as `bun run gate:doc-links
 * --root <dir>` would from the repository root.
 *
 * @param root - The work tree top to point it at.
 * @returns Its exit status and both streams.
 */
function runCli(root: string): CliRun {
  const run = spawnSync('bun', [ENTRY, '--root', root], {
    cwd: SPAWN_CWD,
    encoding: 'utf8',
    env: gitEnvironment(),
  });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}

// ---------------------------------------------------------------------------
// The fixture repositories these cases build
// ---------------------------------------------------------------------------

/** Every temporary directory a case made, removed once the file is done. */
const made: string[] = [];

afterAll(() => {
  for (const directory of made) {
    rmSync(directory, { recursive: true, force: true });
  }
});

/** Runs git in a fixture, failing the case on anything but exit 0. */
function git(directory: string, ...args: readonly string[]): void {
  const result = spawnSync('git', args, {
    cwd: directory,
    encoding: 'utf8',
    env: gitEnvironment(),
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} exited ${String(result.status)}: ${result.stderr}`,
    );
  }
}

/**
 * A fresh temporary directory holding `files`, made a git repository
 * whose index holds exactly the paths in `tracked`, which defaults to
 * all of them. Nothing is committed: `git ls-files`, which is all the
 * checker ever asks, reads the index and not a commit.
 *
 * @param files - Every file to write, keyed by its repository-relative path.
 * @param tracked - The paths to `git add`; defaults to every file written.
 * @returns The repository's absolute root.
 */
function repository(
  files: Readonly<Record<string, string>>,
  tracked: readonly string[] = Object.keys(files),
): string {
  const directory = mkdtempSync(join(tmpdir(), 'ar-check-doc-links-cli-'));
  made.push(directory);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), text, 'utf8');
  }
  git(directory, 'init', '-q');
  if (tracked.length > 0) {
    git(directory, 'add', '--', ...tracked);
  }
  return directory;
}

// ---------------------------------------------------------------------------
// Refusals, each paired with the same tree minus its fault
// ---------------------------------------------------------------------------

describe('check-doc-links.ts, spawned over a fixture repository', () => {
  it('exits 1 over a broken backtick path, naming its file and line, and 0 once it is tracked', () => {
    const text = doc('# Guide', '', 'See `docs/gone.md` for details.');
    const broken = runCli(repository({ 'README.md': text }));
    const fixed = runCli(repository({ 'README.md': text, 'docs/gone.md': '' }));

    expect(broken.status).toBe(1);
    expect(broken.stdout).toContain('README.md:3');
    expect(broken.stdout).toContain('span docs/gone.md resolves under no base');

    expect(fixed.status).toBe(0);
  });

  it('exits 1 over a broken markdown link, and 0 once its target is tracked', () => {
    const text = doc('# Guide', '', 'See [the guide](docs/missing-guide.md) for details.');
    const broken = runCli(repository({ 'README.md': text }));
    const fixed = runCli(
      repository({ 'README.md': text, 'docs/missing-guide.md': '' }),
    );

    expect(broken.status).toBe(1);
    expect(broken.stdout).toContain('README.md:3');
    expect(broken.stdout).toContain('link docs/missing-guide.md resolves under no base');

    expect(fixed.status).toBe(0);
  });

  it('exits 1 over an unused marker, and 0 once its document names the reference it was written for', () => {
    const marker = '<!-- doc-links-skip: docs/nope.md -- names a file the gate refuses -->';
    const unused = runCli(
      repository({ 'README.md': doc(marker, '', 'Nothing here names that path.') }),
    );
    const used = runCli(
      repository({ 'README.md': doc(marker, '', 'See `docs/nope.md`.') }),
    );

    expect(unused.status).toBe(1);
    expect(unused.stdout).toContain('README.md:1');
    expect(unused.stdout).toContain('marker docs/nope.md names no reference in this document');

    expect(used.status).toBe(0);
  });

  it('exits 1 over a marker sitting on a path that already resolves, and 0 once the marker is gone', () => {
    const marker = '<!-- doc-links-skip: docs/resolves.md -- was going away -->';
    const marked = runCli(repository({
      'README.md': doc(marker, '', 'See `docs/resolves.md`.'),
      'docs/resolves.md': '',
    }));
    const unmarked = runCli(repository({
      'README.md': 'See `docs/resolves.md`.',
      'docs/resolves.md': '',
    }));

    expect(marked.status).toBe(1);
    expect(marked.stdout).toContain('README.md:1');
    expect(marked.stdout).toContain('marker docs/resolves.md skips a reference that resolves');

    expect(unmarked.status).toBe(0);
  });

  it('exits 2 over a root outside any git work tree, and 0 once the same directory is one', () => {
    const root = mkdtempSync(join(tmpdir(), 'ar-check-doc-links-cli-plain-'));
    made.push(root);

    const broken = runCli(root);

    expect(broken.status).toBe(2);
    expect(broken.stderr).toContain('is not inside a git work tree');

    git(root, 'init', '-q');
    writeFileSync(join(root, 'README.md'), '# Now a work tree.\n', 'utf8');
    git(root, 'add', '--', 'README.md');

    const fixed = runCli(root);

    expect(fixed.status).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// A .claude/ finding: apart from the exit code, not apart from the report
// ---------------------------------------------------------------------------

describe('check-doc-links.ts, a .claude/ finding', () => {
  it('exits 0 and still prints the finding in its own section', () => {
    const root = repository({
      '.claude/agents/porter.md': 'Run `scripts/compare-design.mjs`.',
      'README.md': 'See `.claude/agents/porter.md`.',
    });

    const result = runCli(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      '.claude/ section, never counted in the exit code: 1 finding(s)',
    );
    expect(result.stdout).toContain('.claude/agents/porter.md:1');
    expect(result.stdout).toContain('scripts/compare-design.mjs resolves under no base');
  });
});

// ---------------------------------------------------------------------------
// The three non-root resolution routes, all at once
// ---------------------------------------------------------------------------

describe('check-doc-links.ts, a tree resolving through every non-root base', () => {
  it(
    'exits 0 over references resolving only through the package base, '
      + 'the doc directory and a gitignored path',
    () => {
      const notes = doc(
        '# Notes',
        '',
        'Import from `lib/thing.ts`.',
        'See `sibling/note.md` for the pairing.',
        'Built into `dist/build.log`.',
      );
      const root = repository({
        '.gitignore': 'dist/\n',
        'packages/service/context/notes.md': notes,
        'packages/service/lib/thing.ts': '',
        'packages/service/context/sibling/note.md': '',
      });

      const result = runCli(root);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain(
        '2 tracked document(s), 3 reference(s): 2 tracked, 1 gitignored, 0 skipped by a marker',
      );
    },
  );
});
