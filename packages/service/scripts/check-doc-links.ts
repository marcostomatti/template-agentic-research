/**
 * @packageDocumentation
 * Whether the paths this repository's tracked markdown names are paths
 * this repository tracks. Every reference `scripts/doc-references.ts`
 * reads out of every tracked `.md` file is resolved against the tracked
 * set, and every `doc-links-skip` marker is held to the reference it was
 * written for. `bun run gate:doc-links` from the repository root runs
 * it; exit 0 is clean, 1 is findings and 2 is a check that could not
 * run, the last kept apart from the first on the control-byte gate's
 * precedent that a gate which cannot run must never read as one that
 * passed.
 *
 * Resolution is against `git ls-files` plus every directory above a
 * tracked file, and never against the disk. What a build, a plan or a
 * half-written task left in the working tree does not make a reference
 * resolve, so the answer is a property of what a commit would carry.
 * The same choice has a cost worth knowing before a run is read: a doc
 * naming a file created in the same sitting reports it until that file
 * is added, and a doc that is itself untracked is not read at all.
 *
 * A reference resolves when it names a tracked path under any of three
 * bases, {@link resolutionBases}: the repository root, the directory the
 * doc sits in, and the `packages/<name>` root of the package the doc
 * sits in. This repository names a package's files relative to that
 * package in the package's own docs, so without the third base those
 * references read as broken; and a root doc gets no package base, so a
 * package-relative path named from the root reports.
 * A directory spelling, one ending in `/`, resolves only to a directory.
 *
 * A reference no base resolves passes when a tracked `.gitignore` ignores
 * it under one of those bases: it is untracked by design, and it is
 * counted rather than reported. Only a TRACKED `.gitignore` answers.
 * `.git/info/exclude`, a global excludes file and an untracked
 * `.gitignore` all travel with one clone and no other, so a pass read
 * off one of them is a report on the next clone and in CI. A negated
 * pattern is a match that un-ignores, and passes nothing. The limit
 * this leaves is real and not closed here: a typo inside an ignored
 * tree passes too, whatever it names.
 *
 * A marker, `<!-- doc-links-skip: <path> -- <reason> -->`, skips the
 * references in its own document whose path is spelled exactly as the
 * marker spells it. It is how a doc names a path that is not meant to
 * exist, an example of what a gate refuses or a file described as
 * removed, without an exemption wide enough to hide a stale path in the
 * same paragraph. So a marker is held as closely as a reference is: one
 * naming no reference in its document is a finding, one over a
 * reference that passes without it is a finding, and an attempt the
 * reader refused is a finding, since it skips nothing and would
 * otherwise sit unseen over a path that happens to resolve.
 *
 * Findings in a document under `.claude/` are printed in a section of
 * their own and never move the exit code. Those files are mostly
 * vendored agent and skill definitions carrying paths from the projects
 * they were written in, and repairing them would fork them from where
 * they came from. They are still read and still reported, so a stale
 * path in a file native to this repository is visible there; it simply
 * does not fail the gate.
 */
import type {
  DocReading,
  DocReference,
  MarkerFault,
} from './doc-references.js';

import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { readDocReferences } from './doc-references.js';

/**
 * The NUL character git's `-z` records are separated by, built from its
 * code point so that no raw control byte can reach this file.
 */
const NUL = String.fromCharCode(0);

/** The prefix every line this command prints opens with. */
const PREFIX = '[check-doc-links]';

/**
 * The tree whose findings are reported apart and never counted in the
 * exit code.
 */
export const CLAUDE_TREE = '.claude/';

/** The `packages/<name>` root a document path sits under, when it does. */
const PACKAGE_ROOT = /^packages\/[^/]+(?=\/)/;

/**
 * The bases a reference in `doc` is resolved under, in the order they
 * are tried: the repository root, the doc's own directory, and the
 * doc's `packages/<name>` root. A base two of those spell the same way
 * is listed once, so a root doc has one base and a package's root doc
 * has two.
 *
 * @param doc - A tracked document's path, relative to the repository.
 * @returns The bases, each relative to the repository, the root as `''`.
 */
export function resolutionBases(doc: string): readonly string[] {
  const directory = posix.dirname(doc);
  const bases = [
    '',
    directory === '.'
      ? ''
      : directory,
    PACKAGE_ROOT.exec(doc)?.[0] ?? '',
  ];
  return [...new Set(bases)];
}

/**
 * The repository paths `target` names from `doc`, one per base that
 * spells a distinct path.
 *
 * Each is the base and the target joined and normalized, so `./` and
 * `..` segments are gone and a directory spelling keeps exactly one
 * trailing slash. A join that climbs above the repository names nothing
 * this repository could track and is dropped; the root itself is `''`.
 *
 * @param doc - The document the reference sits in.
 * @param target - The reference exactly as the document spells it.
 * @returns The candidate paths, in base order, without repeats.
 */
export function candidatePaths(doc: string, target: string): readonly string[] {
  const candidates = resolutionBases(doc)
    .map((base) => posix.normalize(posix.join(base, target)))
    .filter((joined) => joined !== '..' && !joined.startsWith('../'))
    .map((joined) => (joined === '.' || joined === './'
      ? ''
      : joined));
  return [...new Set(candidates)];
}

/** The tracked set, split into the files and the directories above them. */
export type TrackedIndex = {

  /** Every path `git ls-files` answers. */
  readonly files: ReadonlySet<string>;

  /** Every directory above one of those files, without a trailing slash. */
  readonly directories: ReadonlySet<string>;
};

/**
 * The tracked set a list of tracked paths describes: the paths
 * themselves, and every directory above one of them.
 *
 * @param paths - Tracked file paths, relative to the repository.
 * @returns The index {@link resolveReference} looks candidates up in.
 */
export function indexTracked(paths: readonly string[]): TrackedIndex {
  const directories = new Set<string>();
  for (const path of paths) {
    let parent = posix.dirname(path);
    while (parent !== '.' && !directories.has(parent)) {
      directories.add(parent);
      parent = posix.dirname(parent);
    }
  }
  return { files: new Set(paths), directories };
}

/**
 * Whether one candidate path is tracked: a directory spelling names a
 * tracked directory, any other spelling a tracked file or directory.
 */
function isTracked(index: TrackedIndex, candidate: string): boolean {
  const path = candidate.replace(/\/+$/, '');
  if (path === '' || index.directories.has(path)) {
    return true;
  }
  return !candidate.endsWith('/') && index.files.has(path);
}

/**
 * What one reference comes to: a tracked path under some base, a path a
 * tracked `.gitignore` ignores under some base, or neither.
 */
export type ReferenceStatus = 'tracked' | 'gitignored' | 'unresolved';

/**
 * Resolves one reference. Tracked under any base wins over ignored
 * under any base, so a path both tracked and matched by an ignore
 * pattern counts as tracked.
 *
 * @param doc - The document the reference sits in.
 * @param target - The reference exactly as the document spells it.
 * @param index - The tracked set.
 * @param isIgnored - Whether a candidate path is ignored by a tracked
 * `.gitignore`; asked only when no candidate is tracked.
 * @returns The reference's status.
 */
export function resolveReference(
  doc: string,
  target: string,
  index: TrackedIndex,
  isIgnored: (candidate: string) => boolean,
): ReferenceStatus {
  const candidates = candidatePaths(doc, target);
  if (candidates.some((candidate) => isTracked(index, candidate))) {
    return 'tracked';
  }
  return candidates.some((candidate) => isIgnored(candidate))
    ? 'gitignored'
    : 'unresolved';
}

/** One tracked document and what the reader read out of it. */
export type DocumentReading = {

  /** The document's path, relative to the repository. */
  readonly doc: string;

  /** The reader's answer over the document's text. */
  readonly reading: DocReading;
};

/**
 * Every candidate path of every reference no base resolves, which is
 * the whole set the ignore question has to be asked about, so that it
 * can be asked in one call.
 *
 * @param readings - Every document read.
 * @param index - The tracked set.
 * @returns The candidates, sorted and without repeats.
 */
export function ignoreCandidates(
  readings: readonly DocumentReading[],
  index: TrackedIndex,
): readonly string[] {
  const candidates = new Set<string>();
  for (const { doc, reading } of readings) {
    for (const { target } of [...reading.spans, ...reading.links]) {
      const paths = candidatePaths(doc, target);
      if (!paths.some((path) => isTracked(index, path))) {
        paths.forEach((path) => candidates.add(path));
      }
    }
  }
  return [...candidates].sort();
}

/** Which of the reader's two reference populations a reference is from. */
export type Population = 'span' | 'link';

/**
 * One thing this check reports, at the document and line it sits on.
 *
 * - `unresolved`: a reference no base resolves, no tracked `.gitignore`
 *   ignores and no marker in its document skips.
 * - `unused-marker`: a marker whose path no reference in its document
 *   spells.
 * - `marker-over-resolving`: a marker over a reference that passes
 *   without it, `status` saying whether it resolved or was ignored.
 * - `refused-marker`: a marker attempt the reader refused, `fault`
 *   saying why.
 */
export type DocFinding =
  | {
    readonly kind: 'unresolved';
    readonly doc: string;
    readonly line: number;
    readonly population: Population;
    readonly target: string;
  }
  | {
    readonly kind: 'unused-marker';
    readonly doc: string;
    readonly line: number;
    readonly path: string;
  }
  | {
    readonly kind: 'marker-over-resolving';
    readonly doc: string;
    readonly line: number;
    readonly path: string;
    readonly status: Exclude<ReferenceStatus, 'unresolved'>;
  }
  | {
    readonly kind: 'refused-marker';
    readonly doc: string;
    readonly line: number;
    readonly fault: MarkerFault;
    readonly text: string;
  };

/**
 * What one run comes to. Every reference lands in exactly one of
 * `tracked`, `gitignored`, `skipped` and the `unresolved` findings of
 * the two sections, so those four sum to `references`.
 */
export type DocLinksReport = {

  /** Tracked markdown documents read. */
  readonly documents: number;

  /** References read across them, spans and links together. */
  readonly references: number;

  /** References resolving to a tracked path. */
  readonly tracked: number;

  /** References passing as ignored by a tracked `.gitignore`. */
  readonly gitignored: number;

  /** Unresolved references a marker in their own document skipped. */
  readonly skipped: number;

  /** Findings outside `.claude/`, the ones that decide the exit code. */
  readonly findings: readonly DocFinding[];

  /** Findings in documents under `.claude/`, reported apart. */
  readonly claudeFindings: readonly DocFinding[];
};

/**
 * Whether a document sits under `.claude/`.
 *
 * @param doc - A document path, relative to the repository.
 * @returns `true` for a document whose findings are reported apart.
 */
export function isClaudeDocument(doc: string): boolean {
  return doc.startsWith(CLAUDE_TREE);
}

/** One document's counts and findings, before the sections are split. */
type DocumentVerdict = {
  readonly tracked: number;
  readonly gitignored: number;
  readonly skipped: number;
  readonly findings: readonly DocFinding[];
};

/**
 * One document judged: each reference resolved once per distinct
 * spelling, each marker held to the references it names, each refusal
 * reported. Findings come back in line order.
 */
function judgeDocument(
  { doc, reading }: DocumentReading,
  index: TrackedIndex,
  isIgnored: (candidate: string) => boolean,
): DocumentVerdict {
  const statuses = new Map<string, ReferenceStatus>();
  const statusOf = (target: string): ReferenceStatus => {
    const status = statuses.get(target)
      ?? resolveReference(doc, target, index, isIgnored);
    statuses.set(target, status);
    return status;
  };
  const references: readonly {
    readonly reference: DocReference;
    readonly population: Population;
  }[] = [
    ...reading.spans.map((reference) => ({ reference, population: 'span' as const })),
    ...reading.links.map((reference) => ({ reference, population: 'link' as const })),
  ];
  const marked = new Set(reading.markers.map(({ path }) => path));
  const counts = { tracked: 0, gitignored: 0, skipped: 0 };
  const findings: DocFinding[] = [];

  for (const { reference: { target, line }, population } of references) {
    const status = statusOf(target);
    if (status === 'tracked' || status === 'gitignored') {
      counts[status] += 1;
    } else if (marked.has(target)) {
      counts.skipped += 1;
    } else {
      findings.push({ kind: 'unresolved', doc, line, population, target });
    }
  }

  const named = new Set(references.map(({ reference }) => reference.target));
  for (const { path, line } of reading.markers) {
    const status = named.has(path)
      ? statusOf(path)
      : undefined;
    if (status === undefined) {
      findings.push({ kind: 'unused-marker', doc, line, path });
    } else if (status !== 'unresolved') {
      findings.push({ kind: 'marker-over-resolving', doc, line, path, status });
    }
  }

  for (const { fault, text, line } of reading.refusals) {
    findings.push({ kind: 'refused-marker', doc, line, fault, text });
  }

  return {
    ...counts,
    findings: [...findings].sort((left, right) => left.line - right.line),
  };
}

/**
 * Judges every document read, splitting the findings into the section
 * that decides the exit code and the `.claude/` section that does not.
 *
 * Pure: the tracked set and the ignore answer are handed in, so a case
 * can drive every rule here with no repository at all.
 *
 * @param readings - Every document read, in the order to report them.
 * @param index - The tracked set.
 * @param isIgnored - Whether a candidate path is ignored by a tracked
 * `.gitignore`.
 * @returns The report.
 */
export function judgeDocuments(
  readings: readonly DocumentReading[],
  index: TrackedIndex,
  isIgnored: (candidate: string) => boolean,
): DocLinksReport {
  const verdicts = readings.map((reading) => judgeDocument(reading, index, isIgnored));
  const sum = (count: (verdict: DocumentVerdict) => number): number => verdicts
    .reduce((total, verdict) => total + count(verdict), 0);
  const findings = verdicts.flatMap((verdict) => verdict.findings);
  return {
    documents: readings.length,
    references: readings.reduce(
      (total, { reading }) => total + reading.spans.length + reading.links.length,
      0,
    ),
    tracked: sum((verdict) => verdict.tracked),
    gitignored: sum((verdict) => verdict.gitignored),
    skipped: sum((verdict) => verdict.skipped),
    findings: findings.filter((finding) => !isClaudeDocument(finding.doc)),
    claudeFindings: findings.filter((finding) => isClaudeDocument(finding.doc)),
  };
}

/**
 * The exit code a report stands for: 1 when any finding sits outside
 * `.claude/`, and 0 otherwise, however many sit inside it.
 *
 * @param report - A finished report.
 * @returns `0` or `1`; `2` is never a report's, only a failed run's.
 */
export function exitCodeFor(report: DocLinksReport): 0 | 1 {
  return report.findings.length > 0
    ? 1
    : 0;
}

/** The words a passing status is described in, under a marker finding. */
const PASSING_WORDS: Readonly<Record<Exclude<ReferenceStatus, 'unresolved'>, string>> = {
  tracked: 'resolves',
  gitignored: 'passes as gitignored',
};

/**
 * One finding as one report line: the document and line first, so a
 * reader can jump to it, then what is wrong.
 *
 * @param finding - One finding.
 * @returns The line, indented two spaces.
 */
export function formatFinding(finding: DocFinding): string {
  const at = `  ${finding.doc}:${finding.line}`;
  switch (finding.kind) {
    case 'unresolved':
      return `${at}  ${finding.population} ${finding.target} resolves under no base`;
    case 'unused-marker':
      return `${at}  marker ${finding.path} names no reference in this document`;
    case 'marker-over-resolving':
      return `${at}  marker ${finding.path} skips a reference that ${PASSING_WORDS[finding.status]}`;
    case 'refused-marker':
      return `${at}  marker refused (${finding.fault}): ${finding.text}`;
  }
}

/**
 * A section's findings counted per kind, every kind named even at zero
 * so that a zero is read rather than implied.
 */
function countsByKind(findings: readonly DocFinding[]): string {
  const count = (matches: (finding: DocFinding) => boolean): number => findings
    .filter(matches).length;
  return [
    `${count((f) => f.kind === 'unresolved' && f.population === 'span')} unresolved span`,
    `${count((f) => f.kind === 'unresolved' && f.population === 'link')} unresolved link`,
    `${count((f) => f.kind === 'unused-marker')} unused marker`,
    `${count((f) => f.kind === 'marker-over-resolving')} marker over a passing reference`,
    `${count((f) => f.kind === 'refused-marker')} refused marker`,
  ].join(', ');
}

/**
 * The whole report as text: the counts, the verdict over the findings
 * that decide the exit code and those findings, then the `.claude/`
 * section with its own count, printed whether or not it holds anything.
 * Every verdict word is ASCII, so a reader matching on it has no dash
 * encoding to get right.
 *
 * @param report - A finished report.
 * @returns The lines, joined with newlines.
 */
export function formatDocLinksReport(report: DocLinksReport): string {
  const { findings, claudeFindings } = report;
  return [
    `${PREFIX} ${report.documents} tracked document(s), ${report.references} reference(s): `
      + `${report.tracked} tracked, ${report.gitignored} gitignored, `
      + `${report.skipped} skipped by a marker`,
    findings.length === 0
      ? `${PREFIX} OK: no finding outside ${CLAUDE_TREE}`
      : `${PREFIX} FAIL: ${findings.length} finding(s): ${countsByKind(findings)}`,
    ...findings.map((finding) => formatFinding(finding)),
    '',
    `${CLAUDE_TREE} section, never counted in the exit code: `
      + `${claudeFindings.length} finding(s): ${countsByKind(claudeFindings)}`,
    ...claudeFindings.map((finding) => formatFinding(finding)),
  ].join('\n');
}

/**
 * Why a run could not produce a report. The command answers it with
 * exit 2, which is what keeps a check that did not happen from reading
 * as a check that passed.
 */
export class DocLinksCannotRun extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocLinksCannotRun';
  }
}

/**
 * The environment variables that point git at a repository, a work
 * tree or an index other than the one `--root` names.
 *
 * git exports `GIT_INDEX_FILE` to a pre-commit hook (measured), so a
 * check or a fixture repository run from inside one would otherwise
 * read, or `git add` into, the index of the commit in progress.
 */
const RELOCATING_GIT_VARIABLES: ReadonlySet<string> = new Set([
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
]);

/**
 * The environment git is run under: this process's own, less every
 * variable {@link RELOCATING_GIT_VARIABLES} names, so the directory a
 * command runs in is the only thing deciding which repository answers.
 *
 * @param environment - The environment to copy from.
 * @returns A copy without the relocating variables.
 */
export function gitEnvironment(
  environment: typeof process.env = process.env,
): typeof process.env {
  return Object.fromEntries(Object.entries(environment)
    .filter(([name]) => !RELOCATING_GIT_VARIABLES.has(name)));
}

/** What one git call answered. */
type GitAnswer = {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
};

/** Runs git in `directory`, refusing a git that could not be started. */
function runGit(
  directory: string,
  args: readonly string[],
  input?: string,
): GitAnswer {
  const result = spawnSync('git', args, {
    cwd: directory,
    encoding: 'utf8',
    env: gitEnvironment(),
    input,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error !== undefined) {
    throw new DocLinksCannotRun(`git could not be run in ${directory}: ${result.error.message}`);
  }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

/**
 * The top of the work tree `root` names, refusing a root that is not
 * one: a path that does not exist, one that is not a directory, one git
 * answers is in no work tree, and one BELOW the top of a work tree. The
 * last is refused rather than walked up from, because `git ls-files`
 * run there lists only that subtree, which would read as a smaller,
 * cleaner repository.
 *
 * @param root - The directory the run was pointed at.
 * @returns The top, as git spells it, which is the resolved real path.
 */
export function workTreeTop(root: string): string {
  const real = realDirectory(root);
  const answer = runGit(real, ['rev-parse', '--show-toplevel']);
  const top = answer.stdout.trim();
  if (answer.status !== 0 || top === '') {
    throw new DocLinksCannotRun(`${root} is not inside a git work tree`);
  }
  if (top !== real) {
    throw new DocLinksCannotRun(`${root} is not the top of its work tree; pass --root ${top}`);
  }
  return top;
}

/** The real path of `root`, refusing one that is missing or not a directory. */
function realDirectory(root: string): string {
  try {
    const real = realpathSync(root);
    if (statSync(real).isDirectory()) {
      return real;
    }
  } catch {
    throw new DocLinksCannotRun(`${root} does not exist`);
  }
  throw new DocLinksCannotRun(`${root} is not a directory`);
}

/**
 * Every path the work tree's index tracks.
 *
 * @param top - The top of a work tree.
 * @returns The tracked paths, relative to `top`.
 */
export function listTracked(top: string): readonly string[] {
  const answer = runGit(top, ['ls-files', '-z']);
  if (answer.status !== 0) {
    throw new DocLinksCannotRun(`git ls-files failed in ${top}: ${answer.stderr.trim()}`);
  }
  return answer.stdout.split(NUL).filter((path) => path !== '');
}

/**
 * The candidates a tracked `.gitignore` ignores, asked of
 * `git check-ignore --no-index --verbose --stdin -z` in one call.
 *
 * Verbose, because the plain answer lists a path whatever file ignored
 * it and lists nothing about a negation. Each record names its source,
 * and a candidate is kept only when that source is a tracked file named
 * `.gitignore` and the pattern does not open with `!`. check-ignore
 * exits 1 when it ignores nothing, so only a code other than 0 and 1 is
 * a failure.
 *
 * @param top - The top of a work tree.
 * @param candidates - Repository-relative paths, none climbing above it.
 * @param index - The tracked set, which says which sources are tracked.
 * @returns The candidates a tracked `.gitignore` ignores.
 */
export function ignoredByTrackedGitignore(
  top: string,
  candidates: readonly string[],
  index: TrackedIndex,
): ReadonlySet<string> {
  if (candidates.length === 0) {
    return new Set();
  }
  const answer = runGit(
    top,
    ['check-ignore', '--no-index', '--verbose', '--stdin', '-z'],
    candidates.map((candidate) => `${candidate}${NUL}`).join(''),
  );
  if (answer.status !== 0 && answer.status !== 1) {
    throw new DocLinksCannotRun(`git check-ignore failed in ${top}: ${answer.stderr.trim()}`);
  }
  const fields = answer.stdout.split(NUL);
  const ignored = new Set<string>();
  for (let at = 0; at + 3 < fields.length; at += 4) {
    const [source = '', , pattern = '', path = ''] = fields.slice(at, at + 4);
    const fromTrackedGitignore = index.files.has(source)
      && posix.basename(source) === '.gitignore';
    if (fromTrackedGitignore && !pattern.startsWith('!')) {
      ignored.add(path);
    }
  }
  return ignored;
}

/** A tracked document's text, refusing one that cannot be read. */
function readDocument(top: string, doc: string): string {
  try {
    return readFileSync(join(top, doc), 'utf8');
  } catch (cause) {
    const reason = cause instanceof Error
      ? cause.message
      : String(cause);
    throw new DocLinksCannotRun(`tracked document ${doc} could not be read: ${reason}`);
  }
}

/**
 * Runs the whole check over one repository: its tracked `.md` files
 * read, every reference judged, the ignore question asked once.
 *
 * Refuses, with {@link DocLinksCannotRun}, a root {@link workTreeTop}
 * refuses, a tracked document it cannot read, a git call that fails,
 * and a work tree tracking no markdown at all, which is a check pointed
 * at the wrong place far more often than a repository with nothing to
 * check.
 *
 * @param root - The top of the work tree to check.
 * @returns The report.
 */
export function checkDocLinks(root: string): DocLinksReport {
  const top = workTreeTop(root);
  const tracked = listTracked(top);
  const documents = tracked.filter((path) => path.endsWith('.md'));
  if (documents.length === 0) {
    throw new DocLinksCannotRun(`${top} tracks no markdown document; refusing to report a pass`);
  }
  const index = indexTracked(tracked);
  const readings = documents.map((doc) => ({
    doc,
    reading: readDocReferences(readDocument(top, doc)),
  }));
  const ignored = ignoredByTrackedGitignore(top, ignoreCandidates(readings, index), index);
  return judgeDocuments(readings, index, (candidate) => ignored.has(candidate));
}

/** The one line every argument refusal closes with. */
export const DOC_LINKS_USAGE = 'usage: bun packages/service/scripts/check-doc-links.ts [--root <work tree top>]';

/**
 * The command line read into the root a run is pointed at: the working
 * directory when nothing is passed, or `--root <dir>` resolved against
 * it. Anything else is refused rather than dropped, because an argument
 * a gate ignores prints the same verdict as one it obeyed.
 *
 * @param argv - The arguments after the script path.
 * @param cwd - The directory a relative root is resolved against.
 * @returns The root to check.
 */
export function parseDocLinksArguments(
  argv: readonly string[],
  cwd: string,
): { readonly root: string } {
  if (argv.length === 0) {
    return { root: cwd };
  }
  const [flag, value, ...rest] = argv;
  if (flag !== '--root' || value === undefined || value.startsWith('--') || rest.length > 0) {
    throw new DocLinksCannotRun(`arguments not understood: ${argv.join(' ')}\n${DOC_LINKS_USAGE}`);
  }
  return { root: resolve(cwd, value) };
}

/**
 * Whether this file is what the process was started with, rather than
 * something a case imported. `import.meta.url` is a `file:` URL where
 * `process.argv[1]` is a path, so the conversion is what lets the two
 * ever be equal, and the guard stays lexically in this file because
 * `import.meta.url` is the module it is written in;
 * `scripts/build-workflows.ts` carries the measurement behind both.
 */
const INVOKED_AS_CLI = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === process.argv[1];

if (INVOKED_AS_CLI) {
  try {
    const { root } = parseDocLinksArguments(process.argv.slice(2), process.cwd());
    const report = checkDocLinks(root);
    console.log(formatDocLinksReport(report));
    process.exitCode = exitCodeFor(report);
  } catch (cause) {
    // A refusal on the roster is already its own report, so a stack
    // over it buries the one line worth reading; anything else is
    // unexpected, and there the stack is what a reader needs. Both are
    // a run that produced no report, which is exit 2 and never 0.
    process.exitCode = 2;
    console.error(
      cause instanceof DocLinksCannotRun
        ? `${PREFIX} cannot run: ${cause.message}`
        : cause,
    );
  }
}
