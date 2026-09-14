/**
 * The structural half of the read-only invariant, run against the
 * real `packages/service` tree: `scripts/read-deployment.ts` and the
 * seven scripts/ modules it imports from, and `scripts/verify-external.sh`.
 *
 * EVERY ASSERTION SITS BESIDE A PLANTED NEAR MISS. For the two AST
 * readings, that pairing is real code before it is a fixture:
 * `scripts/deployment-verdict.ts` names `deactivateWorkflow` and
 * `deleteWorkflow` in its own header prose, and
 * `scripts/n8n-client.ts` names all five in `{@link}` tags — both are
 * read here, over their real source, before a single synthetic plant
 * is built, so the case that finds nothing in them is proof the
 * reading survives the sharpest near miss this tree already has,
 * rather than one this file invented to be lenient with. The shell
 * side has its own real one: the script's own header names `docker`,
 * `curl` and `bun -e` in the sentence arguing why none of them
 * appears below it.
 *
 * ORDER: the two rosters and their liveness first — a plant per entry
 * of {@link MUTATING_WORKFLOW_CALLS} and per entry of
 * {@link RISKY_SHELL_COMMANDS}, so an entry added later without a
 * plant beside it is caught here rather than passing in silence.
 * Then the real reads, near miss included. Then the seven-module
 * roster itself, held against what `read-deployment.ts` actually
 * imports, so a module added to that file without being added here is
 * a coverage failure rather than an unchecked import. Then the
 * synthetic true-hit plants, one per forbidden name, proving each
 * reading is a MUST-FIND check and not a matcher that would never
 * fire. The shell block repeats that shape for
 * {@link unauthorizedShellInvocations}.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  LEG_INVOCATION,
  MUTATING_WORKFLOW_CALLS,
  RISKY_SHELL_COMMANDS,
  importedIdentifiers,
  mutatingHits,
  reexportedIdentifiers,
  scriptPathOf,
  siblingScriptSpecifiers,
  stripShellComments,
  unauthorizedShellInvocations,
} from './verify-external-readonly.js';

/** Root of `@ar/service`, two levels above `tests/invariants/`. */
const PACKAGE_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** Reads one package-relative file as UTF-8 text. */
function readPackageFile(relativePath: string): string {
  return readFileSync(join(PACKAGE_ROOT, relativePath), 'utf8');
}

// ---------------------------------------------------------------------------
// Roster liveness — the TypeScript side
// ---------------------------------------------------------------------------

describe('MUTATING_WORKFLOW_CALLS — roster liveness', () => {
  // The roster this whole file rests on. A future entry with no case
  // below it would be an addition nothing here proves can still be
  // found, which is the same vacuous pass a scan-root or a hash
  // identifier going untested would be next door.
  it('is non-empty', () => {
    expect(MUTATING_WORKFLOW_CALLS.length).toBeGreaterThan(0);
  });

  for (const call of MUTATING_WORKFLOW_CALLS) {
    // One plant per rostered name: an import declaration written to
    // name it, read back through the real reader. Exact equality on
    // the whole record, not a length or a `.some(...)` check, so a
    // reading that mis-resolves the module specifier or the line
    // number fails here rather than only when the roster is checked
    // as a set.
    it(`is found by importedIdentifiers when a module imports ${call.name}`, () => {
      const source = [
        'import {',
        `  ${call.name},`,
        '  listWorkflows,',
        '} from \'./n8n-client.js\';',
        '',
        `void ${call.name};`,
        'void listWorkflows;',
        '',
      ].join('\n');

      expect(mutatingHits(importedIdentifiers(source))).toStrictEqual([
        { name: call.name, moduleSpecifier: './n8n-client.js', line: 2 },
      ]);
    });

    // The same plant, re-exported rather than imported for local use —
    // the second declaration shape {@link reexportedIdentifiers} reads.
    it(`is found by reexportedIdentifiers when a module re-exports ${call.name}`, () => {
      const source = `export { ${call.name} } from './n8n-client.js';\n`;

      expect(mutatingHits(reexportedIdentifiers(source))).toStrictEqual([
        { name: call.name, moduleSpecifier: './n8n-client.js', line: 1 },
      ]);
    });
  }
});

// ---------------------------------------------------------------------------
// Near miss — a comment naming one is no hit
// ---------------------------------------------------------------------------

describe('importedIdentifiers and reexportedIdentifiers — comments are no hit', () => {
  // Synthetic first: every rostered name, in a block comment, a line
  // comment and a string literal, with no actual import or re-export
  // declaration anywhere in the source.
  it('finds nothing in a synthetic module that only mentions the five in prose', () => {
    const names = MUTATING_WORKFLOW_CALLS.map((call) => call.name);
    const source = [
      '/**',
      ` * Calls ${names.join(', ')} by name, in prose only.`,
      ' */',
      '',
      `// ${names.join(' ')}`,
      '',
      `const label = "${names.join(' ')}";`,
      '',
      'import { listWorkflows } from \'./n8n-client.js\';',
      '',
      'void listWorkflows;',
      '',
    ].join('\n');

    expect(mutatingHits(importedIdentifiers(source))).toEqual([]);
    expect(mutatingHits(reexportedIdentifiers(source))).toEqual([]);
  });

  // The real near miss: `scripts/deployment-verdict.ts` names
  // `deactivateWorkflow` and `deleteWorkflow` in its own header,
  // arguing why importing `audit-workflows.ts` for `classify` never
  // reaches either. The sanity check below proves the plant is real —
  // both spellings really are in the source read here — before the
  // reading is asked to stay clean over it.
  it('finds nothing in the real deployment-verdict.ts, which names two in prose', () => {
    const source = readPackageFile('scripts/deployment-verdict.ts');

    expect(source).toContain('deactivateWorkflow');
    expect(source).toContain('deleteWorkflow');

    expect(mutatingHits(importedIdentifiers(source))).toEqual([]);
    expect(mutatingHits(reexportedIdentifiers(source))).toEqual([]);
  });

  // `scripts/n8n-client.ts` is the sharper version of the same near
  // miss: it declares all five (it is what they are exported FROM)
  // and names every one of them again and again in `{@link}` tags.
  // Its own `import` declarations name none of the five — it imports
  // only a type from `n8n-workflow.ts` — and it re-exports nothing.
  it('finds nothing in the real n8n-client.ts, which declares and links all five', () => {
    const source = readPackageFile('scripts/n8n-client.ts');

    for (const call of MUTATING_WORKFLOW_CALLS) {
      expect(source).toContain(`export async function ${call.name}(`);
    }

    expect(mutatingHits(importedIdentifiers(source))).toEqual([]);
    expect(mutatingHits(reexportedIdentifiers(source))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// read-deployment.ts — direct imports
// ---------------------------------------------------------------------------

describe('read-deployment.ts — direct import declarations', () => {
  const source = readPackageFile('scripts/read-deployment.ts');

  it('reaches none of the five mutating calls directly', () => {
    expect(mutatingHits(importedIdentifiers(source))).toEqual([]);
  });

  // The seven-module roster, held against reality rather than assumed.
  // Written out so a module added to `read-deployment.ts`'s import
  // block without being added here is a failure of this case, and not
  // a module the loop below silently never opens.
  it('imports from exactly the seven scripts/ modules this file checks', () => {
    const specifiers = siblingScriptSpecifiers(importedIdentifiers(source));

    expect(specifiers).toEqual([
      './audit-workflows.js',
      './build-workflows.js',
      './deploy-external.js',
      './deployment-verdict.js',
      './llm-connector.js',
      './migration-ledger.js',
      './n8n-client.js',
    ]);
  });
});

describe('scriptPathOf', () => {
  it('rewrites a relative specifier onto the .ts source it names', () => {
    expect(scriptPathOf('./n8n-client.js')).toBe('scripts/n8n-client.ts');
    expect(scriptPathOf('./deploy-external.js')).toBe('scripts/deploy-external.ts');
  });
});

// ---------------------------------------------------------------------------
// Every scripts/ module read-deployment.ts imports — re-exports
// ---------------------------------------------------------------------------

describe('every scripts/ module read-deployment.ts imports — re-exports', () => {
  const readDeploymentSource = readPackageFile('scripts/read-deployment.ts');
  const specifiers = siblingScriptSpecifiers(importedIdentifiers(readDeploymentSource));

  // The population this block covers is non-empty and real, so the
  // loop below is not a `for` over nothing — the same guard
  // `collectScannedFiles` states for its own walk next door.
  it('resolves at least one sibling module to read', () => {
    expect(specifiers.length).toBeGreaterThan(0);
  });

  for (const specifier of specifiers) {
    const modulePath = scriptPathOf(specifier);

    // `audit-workflows.ts` and `deploy-external.ts` are the two named
    // in this file's own header as carrying a mutating IMPORT for
    // their own command. This case reads their RE-EXPORTS only, which
    // is the declaration shape that would forward a name to a caller
    // — and holds every one of the seven to the same empty answer,
    // rather than special-casing the two the header already argues
    // about.
    it(`${modulePath} re-exports none of the five`, () => {
      const source = readPackageFile(modulePath);

      expect(mutatingHits(reexportedIdentifiers(source))).toEqual([]);
    });
  }

  // The stated limit, pinned down as a measurement rather than left
  // as a claim in prose: none of the seven writes a wildcard
  // re-export, which is the one shape `reexportedIdentifiers` cannot
  // see through.
  it('writes no wildcard re-export among the seven', () => {
    const wildcards = specifiers.flatMap((specifier) => {
      const source = readPackageFile(scriptPathOf(specifier));

      return /^export \*/mu.test(source)
        ? [specifier]
        : [];
    });

    expect(wildcards).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// True-hit plants — proving both readings are MUST-FIND checks
// ---------------------------------------------------------------------------

describe('mutatingHits — true-hit plants', () => {
  // A synthetic module shaped like `deploy-external.ts`: a mutating
  // call imported by name alongside a harmless one, aliased, so the
  // plant also proves the ORIGINAL name is what gets compared and not
  // the local binding.
  it('flags a mutating call imported under a local alias', () => {
    const source = [
      'import {',
      '  UnsuccessfulReplyError,',
      '  createWorkflow as create,',
      '} from \'./n8n-client.js\';',
      '',
      'void UnsuccessfulReplyError;',
      'void create;',
      '',
    ].join('\n');

    expect(mutatingHits(importedIdentifiers(source))).toStrictEqual([
      { name: 'createWorkflow', moduleSpecifier: './n8n-client.js', line: 3 },
    ]);
  });

  // Two of the five on one line, proving the reading reports both
  // rather than stopping at the first.
  it('flags every mutating call a single declaration imports', () => {
    const source = 'import { deactivateWorkflow, deleteWorkflow } from \'./n8n-client.js\';\n';
    const hits = mutatingHits(importedIdentifiers(source));

    expect(hits.map((hit) => hit.name)).toEqual(['deactivateWorkflow', 'deleteWorkflow']);
  });

  // A re-export under a local alias on the exported side, the same
  // pairing as the alias case above but for the second declaration
  // shape.
  it('flags a mutating call re-exported under an alias', () => {
    const source = 'export { updateWorkflow as update } from \'./n8n-client.js\';\n';

    expect(mutatingHits(reexportedIdentifiers(source))).toStrictEqual([
      { name: 'updateWorkflow', moduleSpecifier: './n8n-client.js', line: 1 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// The shell half — roster liveness
// ---------------------------------------------------------------------------

describe('RISKY_SHELL_COMMANDS — roster liveness', () => {
  it('is non-empty', () => {
    expect(RISKY_SHELL_COMMANDS.length).toBeGreaterThan(0);
  });

  for (const command of RISKY_SHELL_COMMANDS) {
    it(`is found by unauthorizedShellInvocations when the body invokes ${command.name}`, () => {
      const source = [
        '#!/usr/bin/env bash',
        '# A comment naming the same word proves nothing on its own —',
        `# see the near-miss block below for ${command.name} in prose.`,
        `${command.name} --version`,
        '',
      ].join('\n');

      const hits = unauthorizedShellInvocations(source);

      expect(hits).toStrictEqual([
        { line: 4, text: `${command.name} --version`, reason: command.reason },
      ]);
    });
  }
});

// ---------------------------------------------------------------------------
// The shell half — near miss and the real read
// ---------------------------------------------------------------------------

describe('unauthorizedShellInvocations — a comment naming one is no hit', () => {
  // Synthetic: every risky command and a non-leg `bun` invocation, all
  // inside comments, with the one real invocation the script is
  // allowed to make sitting below them.
  it('finds nothing but the leg line in a synthetic script full of commented risk', () => {
    const commandLines = RISKY_SHELL_COMMANDS
      .map((command) => `# ${command.name} --version`)
      .join('\n');
    const source = [
      '#!/usr/bin/env bash',
      commandLines,
      '# bun scripts/panic-external.ts',
      '# bun -e "console.log(1)"',
      '',
      'set -uo pipefail',
      '',
      'AR_LEG=instance',
      LEG_INVOCATION,
      '',
    ].join('\n');

    expect(unauthorizedShellInvocations(source)).toEqual([]);
  });

  // The real near miss: the script's own header names `docker`,
  // `curl` and a non-leg `bun -e` in the sentence arguing why the body
  // invokes neither. The sanity check proves the plant is real before
  // the reading is asked to stay clean over it.
  it('finds nothing in the real verify-external.sh, whose header names docker, curl and bun -e', () => {
    const source = readPackageFile('scripts/verify-external.sh');

    expect(source).toContain('`docker`');
    expect(source).toContain('`curl`');
    expect(source).toContain('`bun -e`');

    expect(unauthorizedShellInvocations(source)).toEqual([]);
  });

  it('invokes bun exactly once in its body, as the one leg line', () => {
    const source = readPackageFile('scripts/verify-external.sh');
    const stripped = stripShellComments(source);
    const bunLines = stripped
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '' && /\bbun\b/u.test(line));

    expect(bunLines).toStrictEqual([LEG_INVOCATION]);
  });
});

describe('unauthorizedShellInvocations — true-hit plants', () => {
  it('flags a risky command that is not inside a comment', () => {
    const docker = RISKY_SHELL_COMMANDS.find((command) => command.name === 'docker');

    if (docker === undefined) {
      throw new Error('RISKY_SHELL_COMMANDS no longer rosters docker');
    }

    const source = [
      '#!/usr/bin/env bash',
      'set -uo pipefail',
      '',
      'docker ps',
      '',
      'AR_LEG=instance',
      LEG_INVOCATION,
      '',
    ].join('\n');

    expect(unauthorizedShellInvocations(source)).toStrictEqual([
      { line: 4, text: 'docker ps', reason: docker.reason },
    ]);
  });

  it('flags a bun invocation that is not the leg line', () => {
    const source = [
      '#!/usr/bin/env bash',
      'set -uo pipefail',
      '',
      'bun scripts/panic-external.ts',
      '',
    ].join('\n');

    expect(unauthorizedShellInvocations(source)).toStrictEqual([{
      line: 4,
      text: 'bun scripts/panic-external.ts',
      reason: `Invokes \`bun\` other than the one leg line, ${JSON.stringify(LEG_INVOCATION)}.`,
    }]);
  });

  it('flags both a risky command and a non-leg bun invocation in the same script', () => {
    const source = [
      '#!/usr/bin/env bash',
      'curl https://example.invalid/hook',
      'bun -e "1"',
      '',
    ].join('\n');

    const hits = unauthorizedShellInvocations(source);

    expect(hits.map((hit) => hit.text)).toEqual([
      'curl https://example.invalid/hook',
      'bun -e "1"',
    ]);
  });
});
