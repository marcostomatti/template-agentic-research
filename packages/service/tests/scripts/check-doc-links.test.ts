/**
 * What `scripts/check-doc-links.ts` decides, asked over documents and
 * git repositories these cases build in a temporary directory, and
 * never over a document this repository tracks. A checker tuned against
 * the tree it later grades passes that tree whatever it does.
 *
 * Two halves, in the order a run reaches them. The pure half first:
 * the bases a reference is resolved under, the tracked index, and the
 * judgement over readings with the tracked set and the ignore answer
 * handed in, so every rule is driven with no repository in the run.
 * Then the half that asks git, over fixture repositories: what is
 * tracked, which ignore sources count, and which roots are refused.
 *
 * A case asserting that something passes holds for a checker that
 * passes everything, so none stands alone. Every base shown resolving
 * a reference is paired with the same text in a document where that
 * base points elsewhere, every pass through an ignore or a marker with
 * the same tree lacking it, and every ignore source refused with a
 * tracked `.gitignore` answering in the same repository.
 */
import type { DocLinksReport, DocumentReading } from '../../scripts/check-doc-links.js';

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  CLAUDE_TREE,
  DocLinksCannotRun,
  candidatePaths,
  checkDocLinks,
  exitCodeFor,
  formatDocLinksReport,
  gitEnvironment,
  ignoreCandidates,
  indexTracked,
  judgeDocuments,
  parseDocLinksArguments,
  resolutionBases,
} from '../../scripts/check-doc-links.js';
import { readDocReferences } from '../../scripts/doc-references.js';

/**
 * One markdown text out of its lines, so a line number asserted against
 * it can be counted off the array.
 */
function doc(...lines: readonly string[]): string {
  return lines.join('\n');
}

/**
 * Judges documents given as path-to-text pairs against a tracked list
 * and a list of candidates to answer as ignored, the way a run would
 * after its two git calls.
 */
function judge(
  documents: Readonly<Record<string, string>>,
  tracked: readonly string[],
  ignored: readonly string[] = [],
): DocLinksReport {
  const readings: DocumentReading[] = Object.entries(documents)
    .map(([path, text]) => ({ doc: path, reading: readDocReferences(text) }));
  const ignoredSet = new Set(ignored);
  return judgeDocuments(
    readings,
    indexTracked([...tracked, ...Object.keys(documents)]),
    (candidate) => ignoredSet.has(candidate),
  );
}

// ---------------------------------------------------------------------------
// Bases and candidates
// ---------------------------------------------------------------------------

describe('resolutionBases and candidatePaths', () => {
  it('gives a package doc three bases, root first, then its directory, then its package', () => {
    expect(resolutionBases('packages/service/context/auth.md'))
      .toEqual(['', 'packages/service/context', 'packages/service']);
    expect(candidatePaths('packages/service/context/auth.md', 'lib/express/auth.ts')).toEqual([
      'lib/express/auth.ts',
      'packages/service/context/lib/express/auth.ts',
      'packages/service/lib/express/auth.ts',
    ]);
  });

  it('lists a base once where two spell it alike, and gives a doc outside packages/ none', () => {
    expect(resolutionBases('README.md')).toEqual(['']);
    expect(resolutionBases('packages/service/README.md')).toEqual(['', 'packages/service']);
    expect(resolutionBases('.claude/skills/s/SKILL.md')).toEqual(['', '.claude/skills/s']);
    expect(resolutionBases('packages/README.md')).toEqual(['', 'packages']);
  });

  it('normalizes a join, keeps one trailing slash, and drops a join above the root', () => {
    expect(candidatePaths('docs/guide.md', './src//lib/')).toEqual(['src/lib/', 'docs/src/lib/']);
    expect(candidatePaths('docs/guide.md', '../README.md')).toEqual(['README.md']);
    expect(candidatePaths('docs/guide.md', '../../outside.md')).toEqual([]);
  });
});

describe('indexTracked', () => {
  it('holds every tracked file and every directory above one, and nothing else', () => {
    const index = indexTracked(['packages/service/src/app.ts', 'README.md']);

    expect([...index.files].sort()).toEqual(['README.md', 'packages/service/src/app.ts']);
    expect([...index.directories].sort())
      .toEqual(['packages', 'packages/service', 'packages/service/src']);
  });
});

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

describe('judgeDocuments, resolution', () => {
  /**
   * One reference per base, in a document where only that base reaches
   * the tracked file, beside the same text in a twin that reports.
   *
   * The doc-directory and package-root twins keep the tracked set and
   * move the document, so the base itself points somewhere else. The
   * root base is in every document's list, so no move takes it away;
   * its twin keeps the document and moves the file into that doc's own
   * package under the same trailing name, which no base joins to.
   */
  const BASES: readonly {
    readonly base: string;
    readonly target: string;
    readonly doc: string;
    readonly tracked: string;
    readonly twinDoc: string;
    readonly twinTracked: string;
  }[] = [
    {
      base: 'the repository root',
      target: 'packages/service/src/app.ts',
      doc: 'packages/ui/README.md',
      tracked: 'packages/service/src/app.ts',
      twinDoc: 'packages/ui/README.md',
      twinTracked: 'packages/ui/src/app.ts',
    },
    {
      base: 'the doc directory',
      target: 'sibling/b.md',
      doc: 'docs/guide/intro.md',
      tracked: 'docs/guide/sibling/b.md',
      twinDoc: 'docs/other/intro.md',
      twinTracked: 'docs/guide/sibling/b.md',
    },
    {
      base: 'the package root',
      target: 'lib/express/auth.ts',
      doc: 'packages/service/context/auth.md',
      tracked: 'packages/service/lib/express/auth.ts',
      twinDoc: 'packages/web/context/auth.md',
      twinTracked: 'packages/service/lib/express/auth.ts',
    },
  ];

  for (const { base, target, doc: path, tracked, twinDoc, twinTracked } of BASES) {
    it(`resolves a reference through ${base} alone, and its twin reports`, () => {
      const text = doc('# Title', '', `See \`${target}\`.`);

      expect(judge({ [path]: text }, [tracked])).toMatchObject({ tracked: 1, findings: [] });
      expect(judge({ [twinDoc]: text }, [twinTracked]).findings).toEqual([
        { kind: 'unresolved', doc: twinDoc, line: 3, population: 'span', target },
      ]);
    });
  }

  it('gives a root doc no package base, so a package-relative path reports', () => {
    const report = judge(
      { 'context/gates.md': 'Built into `workflows/dist/a.json`.' },
      ['packages/service/workflows/dist/a.json'],
    );

    expect(report.findings.map(({ kind, doc: path }) => ({ kind, path })))
      .toEqual([{ kind: 'unresolved', path: 'context/gates.md' }]);
  });

  it('resolves a directory spelling to a tracked directory and never to a file', () => {
    const report = judge(
      { 'README.md': doc('`docs/` and `docs/guide.md/` and [guide](docs/guide.md)') },
      ['docs/guide.md'],
    );

    expect(report.tracked).toBe(2);
    expect(report.findings).toEqual([{
      kind: 'unresolved',
      doc: 'README.md',
      line: 1,
      population: 'span',
      target: 'docs/guide.md/',
    }]);
  });

  it('reports a broken link as a link, at the line its target sits on', () => {
    const report = judge({ 'docs/a.md': doc('Intro', '', 'See [the', 'guide](gone.md).') }, []);

    expect(report.findings).toEqual([
      { kind: 'unresolved', doc: 'docs/a.md', line: 4, population: 'link', target: 'gone.md' },
    ]);
  });

  it('passes a reference ignored under any base and counts it, and reports it when nothing ignores it', () => {
    const text = 'Built into `workflows/dist/a.json`.';
    const ignored = judge(
      { 'packages/service/README.md': text },
      [],
      ['packages/service/workflows/dist/a.json'],
    );
    const control = judge({ 'packages/service/README.md': text }, []);

    expect(ignored).toMatchObject({ gitignored: 1, findings: [] });
    expect(control).toMatchObject({ gitignored: 0 });
    expect(control.findings).toHaveLength(1);
  });

  it('asks the ignore question only about references no base resolves', () => {
    const readings = [{
      doc: 'packages/service/README.md',
      reading: readDocReferences('`src/app.ts` and `dist/out.js`'),
    }];

    expect(ignoreCandidates(readings, indexTracked(['packages/service/src/app.ts'])))
      .toEqual(['dist/out.js', 'packages/service/dist/out.js']);
  });
});

// ---------------------------------------------------------------------------
// Markers
// ---------------------------------------------------------------------------

describe('judgeDocuments, markers', () => {
  const MARKER = '<!-- doc-links-skip: packages/web/zz-no-such-file.ts -- names a file the gate refuses -->';

  it('skips an unresolved reference its own document marks and counts the skip', () => {
    const marked = judge({ 'context/gates.md': doc(MARKER, 'Try `packages/web/zz-no-such-file.ts`.') }, []);
    const control = judge({ 'context/gates.md': doc('', 'Try `packages/web/zz-no-such-file.ts`.') }, []);

    expect(marked).toMatchObject({ skipped: 1, findings: [] });
    expect(control).toMatchObject({ skipped: 0 });
    expect(control.findings.map(({ kind, line }) => ({ kind, line })))
      .toEqual([{ kind: 'unresolved', line: 2 }]);
  });

  it('skips nothing in another document, and reports the marker there as unused', () => {
    const report = judge({
      'context/gates.md': MARKER,
      'context/tooling.md': 'Try `packages/web/zz-no-such-file.ts`.',
    }, []);

    expect(report.findings.map(({ kind, doc: path, line }) => ({ kind, path, line }))).toEqual([
      { kind: 'unused-marker', path: 'context/gates.md', line: 1 },
      { kind: 'unresolved', path: 'context/tooling.md', line: 1 },
    ]);
  });

  it('matches a reference only by the exact spelling the marker names', () => {
    const report = judge({
      'docs/a.md': doc('<!-- doc-links-skip: ./gone/b.md -- an example -->', 'See `gone/b.md`.'),
    }, []);

    expect(report.findings.map(({ kind }) => kind)).toEqual(['unused-marker', 'unresolved']);
  });

  it('reports a marker over a tracked reference and over a gitignored one, and not over a broken one', () => {
    const report = judge({
      'docs/a.md': doc(
        '<!-- doc-links-skip: docs/b.md -- was an example -->',
        '<!-- doc-links-skip: dist/out.js -- was an example -->',
        '<!-- doc-links-skip: docs/gone.md -- still an example -->',
        '`docs/b.md` `dist/out.js` `docs/gone.md`',
      ),
    }, ['docs/b.md'], ['dist/out.js']);

    expect(report).toMatchObject({ tracked: 1, gitignored: 1, skipped: 1 });
    expect(report.findings).toEqual([
      { kind: 'marker-over-resolving', doc: 'docs/a.md', line: 1, path: 'docs/b.md', status: 'tracked' },
      { kind: 'marker-over-resolving', doc: 'docs/a.md', line: 2, path: 'dist/out.js', status: 'gitignored' },
    ]);
  });

  it('reports a refused marker attempt, and still reports the reference it was written for', () => {
    const report = judge({
      'docs/a.md': doc('<!-- doc-links-skip: docs/gone.md -->', 'See `docs/gone.md`.'),
    }, []);

    expect(report.findings).toEqual([
      {
        kind: 'refused-marker',
        doc: 'docs/a.md',
        line: 1,
        fault: 'no-reason',
        text: '<!-- doc-links-skip: docs/gone.md -->',
      },
      { kind: 'unresolved', doc: 'docs/a.md', line: 2, population: 'span', target: 'docs/gone.md' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// The .claude/ section, the exit code and the report
// ---------------------------------------------------------------------------

describe('judgeDocuments, the .claude/ section', () => {
  const BROKEN = doc('Run `scripts/compare-design.mjs`.', '[bundle](design/bundle/)');

  it('files a .claude/ document\'s findings apart, off the exit code, and the same text elsewhere in it', () => {
    const apart = judge({ [`${CLAUDE_TREE}agents/porter.md`]: BROKEN }, []);
    const counted = judge({ 'docs/agents/porter.md': BROKEN }, []);

    expect(apart.findings).toEqual([]);
    expect(apart.claudeFindings).toHaveLength(2);
    expect(exitCodeFor(apart)).toBe(0);
    expect(counted.claudeFindings).toEqual([]);
    expect(counted.findings).toHaveLength(2);
    expect(exitCodeFor(counted)).toBe(1);
  });

  it('holds a finding outside .claude/ to exit 1 whatever the .claude/ section holds', () => {
    const report = judge({
      [`${CLAUDE_TREE}skills/a/SKILL.md`]: BROKEN,
      'README.md': 'See `docs/gone.md`.',
    }, []);

    expect(exitCodeFor(report)).toBe(1);
    expect(exitCodeFor(judge({ 'README.md': 'See `docs/b.md`.' }, ['docs/b.md']))).toBe(0);
  });
});

describe('judgeDocuments, the counts', () => {
  it('puts every reference in exactly one count, across both sections', () => {
    const report = judge({
      'docs/a.md': doc(
        '<!-- doc-links-skip: docs/illustrative.md -- an example -->',
        '`docs/b.md` `dist/out.js` `docs/illustrative.md` `docs/gone.md` [b](b.md)',
      ),
      [`${CLAUDE_TREE}agents/x.md`]: '`design/README.md` `docs/b.md`',
    }, ['docs/b.md'], ['dist/out.js']);
    const unresolved = [...report.findings, ...report.claudeFindings]
      .filter(({ kind }) => kind === 'unresolved').length;

    expect(report).toMatchObject({ documents: 2, references: 7, tracked: 3, gitignored: 1, skipped: 1 });
    expect(unresolved).toBe(2);
    expect(report.tracked + report.gitignored + report.skipped + unresolved).toBe(report.references);
  });
});

describe('formatDocLinksReport', () => {
  it('names each finding by file and line under its section, the .claude/ one included', () => {
    const report = judge({
      'docs/a.md': doc('Intro', 'See `docs/gone.md`.'),
      [`${CLAUDE_TREE}agents/x.md`]: '[bundle](design/bundle/)',
    }, []);
    const lines = formatDocLinksReport(report).split('\n');

    expect(lines).toEqual([
      '[check-doc-links] 2 tracked document(s), 2 reference(s): 0 tracked, 0 gitignored, 0 skipped by a marker',
      '[check-doc-links] FAIL: 1 finding(s): 1 unresolved span, 0 unresolved link, 0 unused marker, '
        + '0 marker over a passing reference, 0 refused marker',
      '  docs/a.md:2  span docs/gone.md resolves under no base',
      '',
      '.claude/ section, never counted in the exit code: 1 finding(s): 0 unresolved span, '
        + '1 unresolved link, 0 unused marker, 0 marker over a passing reference, 0 refused marker',
      '  .claude/agents/x.md:1  link design/bundle/ resolves under no base',
    ]);
  });

  it('says OK over no finding outside .claude/, and still prints the .claude/ section', () => {
    const text = formatDocLinksReport(judge({ 'README.md': '`docs/b.md`' }, ['docs/b.md']));

    expect(text).toContain('[check-doc-links] OK: no finding outside .claude/');
    expect(text).toContain('.claude/ section, never counted in the exit code: 0 finding(s)');
  });
});

describe('parseDocLinksArguments', () => {
  it('takes the working directory with no arguments, and --root resolved against it', () => {
    expect(parseDocLinksArguments([], '/work')).toEqual({ root: '/work' });
    expect(parseDocLinksArguments(['--root', 'repo'], '/work')).toEqual({ root: '/work/repo' });
    expect(parseDocLinksArguments(['--root', '/elsewhere'], '/work')).toEqual({ root: '/elsewhere' });
  });

  const REFUSED: readonly (readonly string[])[] = [
    ['--root'],
    ['--root', '--staged'],
    ['--staged'],
    ['docs/a.md'],
    ['--root', 'a', '--root', 'b'],
  ];

  for (const argv of REFUSED) {
    it(`refuses ${JSON.stringify(argv)} rather than dropping it`, () => {
      expect(() => parseDocLinksArguments(argv, '/work')).toThrow(DocLinksCannotRun);
    });
  }
});

describe('gitEnvironment', () => {
  it('drops the variables that point git elsewhere and keeps the rest', () => {
    const environment = gitEnvironment({
      GIT_DIR: '/x/.git',
      GIT_WORK_TREE: '/x',
      GIT_INDEX_FILE: '/x/.git/index.lock',
      GIT_AUTHOR_NAME: 'kept',
      PATH: '/bin',
    });

    expect(environment).toEqual({ GIT_AUTHOR_NAME: 'kept', PATH: '/bin' });
  });
});

// ---------------------------------------------------------------------------
// Fixture repositories
// ---------------------------------------------------------------------------

/** Every temporary directory a case made, removed once the file is done. */
const made: string[] = [];

afterAll(() => {
  for (const directory of made) {
    rmSync(directory, { recursive: true, force: true });
  }
});

/** Runs git in a fixture, failing the case on anything but exit 0. */
function git(directory: string, ...args: readonly string[]): string {
  const result = spawnSync('git', args, {
    cwd: directory,
    encoding: 'utf8',
    env: gitEnvironment(),
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} exited ${result.status}: ${result.stderr}`);
  }
  return result.stdout;
}

/**
 * A temporary directory holding `files`, made a git repository whose
 * index holds exactly the paths in `tracked`, which defaults to all of
 * them. Nothing is committed: `git ls-files` reads the index.
 */
function repository(
  files: Readonly<Record<string, string>>,
  tracked: readonly string[] = Object.keys(files),
): string {
  const directory = mkdtempSync(join(tmpdir(), 'ar-check-doc-links-'));
  made.push(directory);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), text);
  }
  git(directory, 'init', '-q');
  if (tracked.length > 0) {
    git(directory, 'add', '--', ...tracked);
  }
  return directory;
}

describe('checkDocLinks, over a fixture repository', () => {
  it('resolves against the index, so a file on disk that was never added reports', () => {
    const root = repository({
      'docs/guide.md': doc('See `src/app.ts`.', 'See `src/new.ts`.'),
      'src/app.ts': '',
      'src/new.ts': '',
    }, ['docs/guide.md', 'src/app.ts']);

    const report = checkDocLinks(root);

    expect(report).toMatchObject({ documents: 1, references: 2, tracked: 1 });
    expect(report.findings).toEqual([
      { kind: 'unresolved', doc: 'docs/guide.md', line: 2, population: 'span', target: 'src/new.ts' },
    ]);
  });

  it('passes a path a tracked .gitignore ignores, and nothing only another source ignores', () => {
    const root = repository({
      '.gitignore': doc('dist/*', '!dist/keep.js', ''),
      'other/.gitignore': 'cache/\n',
      'global-excludes': 'global/\n',
      'docs/guide.md': doc(
        '`dist/out.js`',
        '`build/out.js`',
        '`dist/keep.js`',
        '`other/cache/a.json`',
        '`global/out.js`',
      ),
    }, ['.gitignore', 'docs/guide.md']);
    git(root, 'config', 'core.excludesFile', join(root, 'global-excludes'));
    mkdirSync(join(root, '.git', 'info'), { recursive: true });
    writeFileSync(join(root, '.git', 'info', 'exclude'), 'build/\n');

    const report = checkDocLinks(root);

    expect(report).toMatchObject({ references: 5, gitignored: 1 });
    expect(report.findings.map(({ line }) => line)).toEqual([2, 3, 4, 5]);
  });

  it('files a tracked .claude/ document apart, over git as over readings', () => {
    const root = repository({
      '.claude/agents/porter.md': 'Run `scripts/compare-design.mjs`.',
      'README.md': 'See `.claude/agents/porter.md`.',
    });

    const report = checkDocLinks(root);

    expect(report).toMatchObject({ documents: 2, tracked: 1, findings: [] });
    expect(report.claudeFindings.map(({ doc: path }) => path)).toEqual(['.claude/agents/porter.md']);
  });

  it('checks a repository from its top, and refuses one below it', () => {
    const root = repository({ 'docs/guide.md': 'See `docs/guide.md`.' });

    expect(checkDocLinks(root)).toMatchObject({ documents: 1, tracked: 1, findings: [] });
    expect(() => checkDocLinks(join(root, 'docs'))).toThrow(/is not the top of its work tree/);
  });

  it('refuses a directory in no work tree, a missing root and a work tree tracking no markdown', () => {
    const plain = mkdtempSync(join(tmpdir(), 'ar-check-doc-links-plain-'));
    made.push(plain);
    const noMarkdown = repository({ 'src/app.ts': '' });

    expect(() => checkDocLinks(plain)).toThrow(/is not inside a git work tree/);
    expect(() => checkDocLinks(join(plain, 'missing'))).toThrow(/does not exist/);
    expect(() => checkDocLinks(noMarkdown)).toThrow(/tracks no markdown document/);
  });
});
