/**
 * @packageDocumentation
 * The parts of the `verify-external.sh` read-only invariant that read
 * SYNTAX rather than run anything: which import declarations a
 * TypeScript module carries, which shell lines invoke an external
 * program, and the two rosters — the five n8n client calls that
 * mutate a deployment, and the shell commands a read-only
 * verification has no claim to run.
 *
 * THE CLAIM THIS FILE SERVES. `scripts/read-deployment.ts` sends `GET`
 * requests and `SELECT` statements and nothing else, argued at length
 * in that module's own header. `tests/scripts/read-deployment.test.ts`
 * proves the CODE half of that: every request the stub records is a
 * `GET`, every statement the recording client sees is a `SELECT`. What
 * a runtime record cannot say is what a module `read-deployment.ts`
 * imports does on some OTHER path — `scripts/audit-workflows.ts` and
 * `scripts/deploy-external.ts` each import a mutating n8n client call
 * by name, for a command of their own that `read-deployment.ts` never
 * runs. This file is the STRUCTURAL half: it reads import declarations
 * rather than grepping text, and holds that `read-deployment.ts`
 * itself, and what it re-exports through, name none of the five.
 *
 * WHY THE SCAN STOPS AT ONE HOP, AND DOES NOT OPEN EVERY FILE THE
 * TRANSITIVE CLOSURE REACHES. `read-deployment.ts` imports `classify`
 * from nothing directly, but it imports `expectedNames` from
 * `audit-workflows.ts` and `requireInstance` from
 * `deploy-external.ts` — and BOTH of those files carry, in their own
 * import declarations, a name this file rosters: `audit-workflows.ts`
 * imports `deactivateWorkflow` and `deleteWorkflow` for its own
 * `--deactivate`/`--prune` flags, and `deploy-external.ts` imports
 * `createWorkflow` and `updateWorkflow` for its own deploy command.
 * `scripts/deployment-verdict.ts` says so in its own header, in
 * prose: "`classify` is the one value taken from `audit-workflows.ts`,
 * and that module imports … by name the two client functions its
 * acting flags reach". A scan that opened every file in the
 * transitive closure and flagged ANY import declaration naming one of
 * the five would be red today, over code that is correct — those two
 * commands are real, guarded by the same `INVOKED_AS_CLI` pattern
 * `read-deployment.ts` itself uses, and importing either for an
 * unrelated export never reaches them. So "reach" here is READ AS
 * NAMED, not read as co-located: what `read-deployment.ts` reaches is
 * what it names in its own import clauses, plus whatever a module it
 * imports FORWARDS under that same name through a re-export — never
 * an import declaration sitting elsewhere in a file for a command
 * `read-deployment.ts` does not call.
 *
 * THE TWO READINGS THAT FOLLOW FROM THAT SCOPE.
 * {@link importedIdentifiers} reads `ImportDeclaration` nodes: the
 * names `read-deployment.ts` pulls in, directly. {@link
 * reexportedIdentifiers} reads `ExportDeclaration` nodes that carry a
 * module specifier — the `export { x } from './y.js'` and
 * `export type { x } from './y.js'` forms — over each of the seven
 * scripts/ modules `read-deployment.ts` imports from. A name is
 * forwarded to a caller by ONE of those two declaration shapes; a
 * plain `import` with no matching `export … from` stops at the file
 * that wrote it; measured, none of the seven re-exports anything at
 * all, so every case over the second reading rests on a planted
 * sample. Neither reading opens a THIRD file: a re-export chain two
 * hops deep is a gap this file states rather than closes, there being
 * no live subject for it.
 *
 * READ FROM DECLARATIONS, NOT FROM TEXT, so a comment naming one of
 * the five is no hit. This is not a hypothetical near miss —
 * `scripts/deployment-verdict.ts` carries it for real, in the
 * passage quoted above, and `scripts/n8n-client.ts`'s own header
 * names all five in `{@link}` tags a dozen times over. A `grep` for
 * these five spellings across `scripts/` would be red on arrival
 * against documentation explaining why the code is safe. Both
 * reading functions below parse with the TypeScript compiler's own
 * parser and walk `SourceFile.statements`; a name inside a block
 * comment, a line comment, or a string or template literal is trivia
 * or a literal to that parser and is never an `ImportSpecifier` or an
 * `ExportSpecifier`, so it is structurally absent from what either
 * function returns.
 *
 * WHAT NEITHER READING CAN SEE. A namespace import
 * (`import * as n8n from './n8n-client.js'`) names no specifier this
 * file inspects, and a caller writing `n8n.createWorkflow(...)`
 * through it would evade both readings; none of the nine files this
 * invariant covers uses that form for `n8n-client.js`; it stays a
 * stated gap rather than a closed one. A wildcard re-export
 * (`export * from './y.js'`) is opaque the same way — resolving it
 * would mean opening a fourth file, which the one-hop scope above
 * argues against — and no file here writes one either. `import()`,
 * the dynamic form, is a call expression and not a declaration at
 * all, and reaches neither reading; nothing under `scripts/` uses it.
 *
 * THE SHELL HALF. {@link unauthorizedShellInvocations} answers the
 * second assertion this invariant makes: `scripts/verify-external.sh`
 * invokes nothing but a `read-deployment.ts` leg. It strips whole-line
 * `#` comments first, for the same reason as above — the script's own
 * header names `docker`, `curl` and `bun -e` in prose, arguing why
 * none of them appears in the body, and a scan that read comments
 * would fail on the argument rather than on the script. It is a line
 * scan rather than a shell parser: {@link RISKY_SHELL_COMMANDS} is a
 * roster of program names a read-only verification has no claim to
 * run, matched as whole words, and every occurrence of the word `bun`
 * outside a comment is compared against {@link LEG_INVOCATION}, the
 * one line the script is allowed to run it as. Both checks are
 * OVER-INCLUSIVE by design: a `#` inside a quoted string would not be
 * read as a comment opener incorrectly (the file plants none), but a
 * risky word inside a quoted string this script never writes WOULD
 * still be flagged, which is the safe direction for a check with
 * nothing to lose by over-reporting a script this short.
 */

import ts from 'typescript';

/** One n8n client call `read-deployment.ts` must never reach. */
export interface MutatingWorkflowCall {
  /**
   * The exported name, exactly as `scripts/n8n-client.ts` spells it —
   * the ORIGINAL name an import or a re-export names, never a local
   * alias. {@link importedIdentifiers} and {@link reexportedIdentifiers}
   * both resolve `propertyName ?? name` before comparing, so
   * `import { createWorkflow as create } from './n8n-client.js'`
   * still matches this on `createWorkflow`.
   */
  readonly name: string;

  /** What the call does to a deployment, in one sentence. */
  readonly reason: string;
}

/**
 * The five n8n client calls a read-only verification must never
 * reach, as `scripts/n8n-client.ts` exports them.
 *
 * `listWorkflows` is deliberately absent: it is the one function of
 * that module `read-deployment.ts` DOES import, and it sends a `GET`.
 * These five are every OTHER exported call, and every one of them
 * changes what the instance stores or runs.
 */
export const MUTATING_WORKFLOW_CALLS: readonly MutatingWorkflowCall[] = [
  {
    name: 'createWorkflow',
    reason: 'Creates a new workflow on the instance.',
  },
  {
    name: 'updateWorkflow',
    reason: 'Replaces a stored workflow\'s nodes and connections outright.',
  },
  {
    name: 'activateWorkflow',
    reason: 'Arms a workflow, so the instance starts what its triggers start.',
  },
  {
    name: 'deactivateWorkflow',
    reason: 'Disarms a workflow, stopping what its triggers were starting.',
  },
  {
    name: 'deleteWorkflow',
    reason: 'Deletes a workflow and its execution history outright, unrecoverably.',
  },
];

/**
 * One name an import or a re-export declaration brings into scope,
 * read off the declaration rather than off free text.
 */
export interface ImportedIdentifier {
  /**
   * The ORIGINAL exported name — `propertyName ?? name` on the
   * specifier — so a local rename never hides a match and a rename ON
   * THE EXPORTING SIDE never manufactures one.
   */
  readonly name: string;

  /**
   * The module specifier the declaration names, exactly as written —
   * `'./n8n-client.js'` and not a resolved path. Relative and bare
   * specifiers are both returned verbatim; resolving one to a file on
   * disk is a caller's decision, made in
   * `tests/invariants/verify-external-readonly.test.ts` over the real
   * tree, never inside this module.
   */
  readonly moduleSpecifier: string;

  /** 1-based line the specifier sits on, matching what an editor shows. */
  readonly line: number;
}

/**
 * Parses `source` once, as an ordinary `.ts` module.
 *
 * `setParentNodes` is `true` so `getStart` below can skip leading
 * trivia without a second pass; nothing here walks up from a child to
 * a parent. The filename passed to the parser is never read back —
 * both reading functions take content, never a path, which is the
 * seam that lets a planted sample be a string assembled in memory
 * rather than a fixture file.
 */
function parse(source: string): ts.SourceFile {
  return ts.createSourceFile(
    'module.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

/** 1-based line `node` starts on, trivia skipped. */
function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  const { line } = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );

  return line + 1;
}

/**
 * Every name `source`'s import declarations bring into scope, read
 * off `ImportDeclaration` nodes — never off comments, strings, or
 * template literals, which the parser never turns into a specifier.
 *
 * Only `import { x }` and `import type { x }` NAMED forms are read.
 * A default import (`import x from 'y'`) or a namespace import
 * (`import * as x from 'y'`) binds a local name the exporting module
 * never chose, so neither can be compared against
 * {@link MUTATING_WORKFLOW_CALLS} by name — the namespace-import gap
 * this leaves is stated in the header, with no live subject for it
 * anywhere in the nine files this invariant covers.
 *
 * `import type` is read exactly like a value import rather than
 * excluded: the five rostered names are functions and importing one
 * `type`-only is a needless form nothing here writes, so including it
 * costs nothing and the safe direction is to keep it in scope rather
 * than carve it out.
 *
 * Declarations are read at the top level only — `SourceFile.statements`
 * — which is exhaustive for `import`, since the grammar admits an
 * `ImportDeclaration` nowhere else.
 *
 * @param source - A TypeScript module's text, verbatim.
 * @returns One record per named specifier, in declaration order.
 */
export function importedIdentifiers(
  source: string,
): readonly ImportedIdentifier[] {
  const sourceFile = parse(source);

  return sourceFile.statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement) || statement.importClause === undefined) {
      return [];
    }

    const { namedBindings } = statement.importClause;

    if (namedBindings === undefined || !ts.isNamedImports(namedBindings)) {
      return [];
    }

    if (!ts.isStringLiteral(statement.moduleSpecifier)) {
      return [];
    }

    const moduleSpecifier = statement.moduleSpecifier.text;

    return namedBindings.elements.map((element) => ({
      name: (element.propertyName ?? element.name).text,
      moduleSpecifier,
      line: lineOf(sourceFile, element),
    }));
  });
}

/**
 * Every name `source` RE-EXPORTS from another module — read off an
 * `ExportDeclaration` that carries a module specifier, the
 * `export { x } from './y.js'` and `export type { x } from './y.js'`
 * forms.
 *
 * A plain `export function x() {}` or `export const x = …` carries no
 * module specifier and is not read here at all: the name it exports
 * is declared IN this file, not forwarded from another one, so a
 * caller reaching it has already reached whatever this file's own
 * `import` declarations pulled in, which
 * {@link importedIdentifiers} over THAT file answers for.
 *
 * `export * from './y.js'` is a wildcard and carries no named
 * specifiers to read — resolving what it forwards would mean opening
 * `./y.js` in turn, which the one-hop scope this file argues for does
 * not do. None of the seven scripts/ modules `read-deployment.ts`
 * imports from writes one, so this is a stated limit rather than a
 * live gap; `tests/invariants/verify-external-readonly.test.ts` pins
 * that measurement down as one of its cases.
 *
 * @param source - A TypeScript module's text, verbatim.
 * @returns One record per re-exported specifier, in declaration order.
 */
export function reexportedIdentifiers(
  source: string,
): readonly ImportedIdentifier[] {
  const sourceFile = parse(source);

  return sourceFile.statements.flatMap((statement) => {
    if (!ts.isExportDeclaration(statement) || statement.moduleSpecifier === undefined) {
      return [];
    }

    if (!ts.isStringLiteral(statement.moduleSpecifier)) {
      return [];
    }

    const { exportClause } = statement;

    if (exportClause === undefined || !ts.isNamedExports(exportClause)) {
      // A wildcard re-export carries no `NamedExports` clause — see
      // the header's own account of that limit.
      return [];
    }

    const moduleSpecifier = statement.moduleSpecifier.text;

    return exportClause.elements.map((element) => ({
      name: (element.propertyName ?? element.name).text,
      moduleSpecifier,
      line: lineOf(sourceFile, element),
    }));
  });
}

/**
 * Which of `identifiers` names one of {@link MUTATING_WORKFLOW_CALLS},
 * by its original exported name.
 *
 * @param identifiers - Whatever {@link importedIdentifiers} or
 *   {@link reexportedIdentifiers} read.
 * @returns The subset that names a mutating call, in the order it was
 *   handed over — empty when none does, which is the passing answer.
 */
export function mutatingHits(
  identifiers: readonly ImportedIdentifier[],
): readonly ImportedIdentifier[] {
  const names = new Set(MUTATING_WORKFLOW_CALLS.map((call) => call.name));

  return identifiers.filter((identifier) => names.has(identifier.name));
}

/**
 * Every relative module specifier {@link importedIdentifiers} read
 * off `source`, deduplicated and sorted.
 *
 * `./`-prefixed only — a specifier reaching outside `scripts/`
 * (`'../src/config.js'`) or naming a package (`'pg'`, `'node:fs'`) is
 * dropped, since "every `scripts/` module it imports" names siblings
 * under the same directory and neither of those is one.
 *
 * @param identifiers - What {@link importedIdentifiers} read off one
 *   module's source.
 * @returns The distinct sibling specifiers, alphabetical.
 */
export function siblingScriptSpecifiers(
  identifiers: readonly ImportedIdentifier[],
): readonly string[] {
  const specifiers = identifiers
    .map((identifier) => identifier.moduleSpecifier)
    .filter((specifier) => specifier.startsWith('./'));

  return [...new Set(specifiers)].sort((left, right) => left.localeCompare(right));
}

/** The `.js` suffix an ES module specifier carries, TypeScript beneath it. */
const JS_SPECIFIER_SUFFIX = /\.js$/u;

/**
 * The `scripts/`-relative path a sibling specifier names, as a `.ts`
 * file on disk.
 *
 * `read-deployment.ts` and everything it imports from write their
 * specifiers with an explicit `.js` suffix over a `.ts` source file —
 * the ordinary Node ESM convention this whole package follows — so
 * the suffix is rewritten rather than dropped.
 *
 * @param specifier - One entry of {@link siblingScriptSpecifiers}'s
 *   answer, such as `'./n8n-client.js'`.
 * @returns The package-relative path, such as `'scripts/n8n-client.ts'`.
 */
export function scriptPathOf(specifier: string): string {
  const withoutPrefix = specifier.replace(/^\.\//u, '');

  return `scripts/${withoutPrefix.replace(JS_SPECIFIER_SUFFIX, '.ts')}`;
}

// ---------------------------------------------------------------------------
// The shell half: what `verify-external.sh` invokes
// ---------------------------------------------------------------------------

/** One program a read-only verification has no claim to run. */
export interface RiskyShellCommand {
  /** The program's name, matched as a whole word. */
  readonly name: string;

  /** Why running it would reach past a `GET` or a `SELECT`. */
  readonly reason: string;
}

/**
 * Programs `scripts/verify-external.sh` has no claim to invoke.
 *
 * Every one of these can reach a network position, a container, or a
 * database beyond the `GET`/`SELECT` pair `read-deployment.ts` sends;
 * none of them is a bash builtin, so none can appear in this script
 * without naming an external program. `bun` is deliberately absent
 * from this roster and held to its own rule below instead — the
 * script has to invoke `bun` once per leg, so a bare "must not appear"
 * roster entry could never be satisfied.
 */
export const RISKY_SHELL_COMMANDS: readonly RiskyShellCommand[] = [
  { name: 'docker', reason: 'Starts, stops or execs into a container.' },
  { name: 'curl', reason: 'Sends an HTTP request of a shape this script does not control.' },
  { name: 'wget', reason: 'Sends an HTTP request of a shape this script does not control.' },
  { name: 'ssh', reason: 'Opens a remote shell on another host.' },
  { name: 'scp', reason: 'Copies a file to or from another host.' },
  { name: 'psql', reason: 'Sends an arbitrary SQL statement, `SELECT` or otherwise.' },
  { name: 'kubectl', reason: 'Acts on a cluster this verification has no claim over.' },
  { name: 'npm', reason: 'Can run an arbitrary package script.' },
  { name: 'npx', reason: 'Downloads and runs an arbitrary package.' },
  { name: 'node', reason: 'Runs arbitrary JavaScript outside the one leg command.' },
  { name: 'python', reason: 'Runs an arbitrary script outside the one leg command.' },
  { name: 'python3', reason: 'Runs an arbitrary script outside the one leg command.' },
];

/**
 * The one shape `bun` is allowed to appear in, trimmed — one leg,
 * read as a command line rather than as a function call.
 *
 * Written out rather than derived from `LEG_NAMES` in
 * `deployment-verdict.ts`: this file reads syntax and does not import
 * a roster to build a shell string out of, the way
 * `scripts/verify-external.sh` itself spells `AR_LEGS` again rather
 * than reading `LEG_NAMES`, for the reason its own header gives — a
 * reading would mean invoking something other than a leg.
 */
export const LEG_INVOCATION = 'bun scripts/read-deployment.ts "$AR_LEG"';

/** A whole-line `#` comment, leading whitespace and all. */
const FULL_LINE_COMMENT = /^\s*#/u;

/**
 * `source` with every whole-line `#` comment blanked, line count and
 * line numbers unchanged.
 *
 * Blanked rather than removed, so every line number
 * {@link unauthorizedShellInvocations} reports still matches the real
 * file — the same reason `sqlWords` in `dispatch-sql.ts` replaces a
 * comment with a space rather than deleting it.
 *
 * WHOLE-LINE ONLY, never a trailing `# …` after code on the same
 * line. `scripts/verify-external.sh` writes several lines carrying a
 * `#` that is not a comment opener at all — `"$#"`, `"${#AR_LEGS[@]}"`
 * — and a scanner that stripped from the first `#` on a line would
 * truncate `if [ "$#" -ne 0 ]; then` into `if [ "`. The file plants no
 * trailing comment for the other direction to miss; a script that
 * added one would keep it visible to the checks below, which is the
 * safe direction to be wrong in.
 *
 * @param source - The script's text, verbatim.
 * @returns The same text with comment lines blanked.
 */
export function stripShellComments(source: string): string {
  return source
    .split('\n')
    .map((line) => (FULL_LINE_COMMENT.test(line)
      ? ''
      : line))
    .join('\n');
}

/** One line outside a comment that this script has no claim to run. */
export interface ShellInvocationHit {
  /** 1-based line the invocation sits on. */
  readonly line: number;

  /** The line's trimmed text, for a failure message to quote. */
  readonly text: string;

  /** Why the line is a finding. */
  readonly reason: string;
}

/**
 * `token` as a whole word, boundaries taken as "not another
 * identifier character" on either side — the same shape
 * `RESEARCH_TABLE_SOURCE` in `research-acyclicity.ts` uses, so
 * `docker` is carried by `docker ps` and not by `docker-compose`, and
 * `node` is carried by a bare invocation and not by `AR_N8N_...`.
 */
function wholeWord(token: string): RegExp {
  return new RegExp(`(?<![A-Za-z0-9_])${token}(?![A-Za-z0-9_])`, 'u');
}

/**
 * Every line of `source`, outside a `#` comment, that this script has
 * no claim to run: an occurrence of a {@link RISKY_SHELL_COMMANDS}
 * entry, or an occurrence of `bun` that is not the exact
 * {@link LEG_INVOCATION} line.
 *
 * Comments are stripped first — see {@link stripShellComments} — so a
 * risky word or a `bun` invocation named only in prose is no hit,
 * which is not hypothetical: this script's own header names `docker`,
 * `curl` and `bun -e` in the sentence arguing why none of them
 * appears in the body below it.
 *
 * A line scan rather than a shell parser, and deliberately
 * over-inclusive rather than under: it does not track whether an
 * occurrence sits inside a single-quoted string, so a script that
 * PRINTED the word `docker` in a message — this one does not — would
 * be flagged for a line that runs nothing. That is the safe direction
 * for a script this short and this stable to be wrong in.
 *
 * @param source - The script's text, verbatim.
 * @returns One record per offending line, in file order, empty when
 *   the only `bun` invocation is the one leg line and no risky command
 *   appears — the passing answer.
 */
export function unauthorizedShellInvocations(
  source: string,
): readonly ShellInvocationHit[] {
  const stripped = stripShellComments(source);

  return stripped.split('\n').flatMap((raw, index) => {
    const text = raw.trim();

    if (text === '') {
      return [];
    }

    const line = index + 1;

    const risky = RISKY_SHELL_COMMANDS
      .filter((command) => wholeWord(command.name).test(text))
      .map((command) => ({ line, text, reason: command.reason }));

    const isBun = wholeWord('bun').test(text);

    const bun = isBun && text !== LEG_INVOCATION
      ? [{
        line,
        text,
        reason: `Invokes \`bun\` other than the one leg line, ${JSON.stringify(LEG_INVOCATION)}.`,
      }]
      : [];

    return [...risky, ...bun];
  });
}
