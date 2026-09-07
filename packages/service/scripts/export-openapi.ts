/**
 * @packageDocumentation
 * Writes the OpenAPI 3.1 document this service publishes into
 * `.docs/swagger/openapi.json`.
 *
 * The document is `src/openapi.ts`'s, assembled from the seventeen
 * binding tables the router modules export and from nothing else.
 * This file is the half that reaches the filesystem: where the
 * artifact lands, how the directory it lands in gets there, and
 * what a run reports. Nothing here decides what the document says.
 *
 * The output path is resolved from THIS FILE's own location and
 * never from the working directory. A path built from the working
 * directory names this tree only while the process was started
 * from the package; from the repo root it would name a
 * `.docs/swagger/` beside `packages/`, which the recursive mkdir
 * below would create rather than refuse — so the failure is a
 * document written where nobody looks, and not an error.
 * `scripts/build-workflows.ts` resolves the directory it writes
 * the same way, and `scripts/seed.ts` the directory it reads.
 *
 * `.docs/` is gitignored at the package and at the repo root, so
 * what a run writes reaches no diff, no review and no other
 * machine. Two consequences are worth stating rather than leaving
 * to be met. A stale artifact is invisible: there is nothing to
 * dirty, so nothing reports that the file on disk predates the
 * routes beside it, and nothing in this package reads it back at
 * all — what holds the document to the routers is
 * `src/openapi.test.ts`, over a document generated in process
 * rather than over these bytes. And the `servers` entry carries
 * whatever port THIS process resolved — bun reads a `.env` sitting
 * beside the manifest when there is one — which would be a hazard
 * in a committed artifact and is a local fact in an ignored one.
 *
 * `bun run docs:openapi` is the manifest script that runs this,
 * and `docs:generate` is its sibling: two documentation
 * generators over one package, each owning its own output and
 * neither reading the other's. They do NOT share one tree, which
 * is worth stating here because the pair of names suggests they
 * do. This half writes the gitignored `.docs/swagger/` above. The
 * other is a bare `typedoc` carrying no `typedoc.json` and no
 * `typedocOptions` key in either `package.json` or
 * `tsconfig.json` — all three measured absent — so it takes
 * typedoc's own default `out`, which resolves to the TRACKED
 * `docs/` tree beside this one, the `architecture/` set and the
 * hand-written guides. So a sentence filing both generators under
 * one ignored tree is false as configured: only this one is
 * ignored, and a `docs:generate` run writes where a diff shows
 * it.
 *
 * The directory is made recursively, which is doing two jobs.
 * Being ignored, `.docs/` is absent from every fresh checkout, so
 * a first run has both levels to create; and a rerun over a
 * directory that already exists is a no-op rather than an EEXIST.
 *
 * There is no refusal of this file's own, and so none of the
 * `try`/`catch` around the CLI call that `seed.ts`,
 * `build-workflows.ts` and `approve.ts` each carry. Those exist to
 * print a domain refusal as the report it already is, stack
 * omitted. Both failures a run here can meet want their stack
 * instead: a `TypeError` out of {@link generateOpenApiDocument},
 * which is a binding table carrying a label or a schema that
 * module cannot describe, and whatever the two filesystem calls
 * raise about a path.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { generateOpenApiDocument } from '../src/openapi.js';

/**
 * This package's own root, resolved from this file's location
 * rather than from the working directory, for the reason the
 * module header gives.
 *
 * Absolute, because `import.meta.url` is: which is what lets
 * {@link exportOpenApiDocument} report the path it wrote as a
 * string a reader can hand straight back to a shell, from
 * whatever directory the run was launched in.
 */
const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Where a run writes.
 *
 * `.docs/swagger/` rather than `.docs/` flat: a directory named
 * for the tool that reads the artifact, so that a second
 * generator writing under the same ignored tree cannot sweep past
 * this one's file.
 *
 * Exported so a caller that wants to read the artifact back names
 * the same path this writes rather than resolving `.docs/swagger/`
 * a second time. Two spellings of one path drift silently, and
 * what a stale one finds here is not nothing but whatever an
 * earlier run left there.
 */
export const OPENAPI_DOCUMENT_FILE = join(
  PACKAGE_ROOT,
  '.docs',
  'swagger',
  'openapi.json',
);

/** What a run wrote, and how much of it. */
export interface ExportedDocument {
  /** The absolute path written. */
  readonly file: string;
  /**
   * How much was written, in BYTES.
   *
   * `Buffer.byteLength` and not the string's own `length`, which
   * counts UTF-16 code units. The two AGREE on the document as it
   * stands, measured, no character in it being outside ASCII
   * today; they would part company silently the first time a
   * route description carried one of the em dashes this package's
   * prose is written with. Bytes is also the only one of the pair
   * a reader can check against `wc -c` or `stat`.
   */
  readonly bytes: number;
}

/**
 * Generate the document and write it out.
 *
 * @param file - Where to write, absolute. Defaults to
 *   {@link OPENAPI_DOCUMENT_FILE}; passed explicitly it is what
 *   lets a caller write into a directory of its own without
 *   touching the artifact an operator reads.
 * @returns The path written and the size of what was written.
 * @throws TypeError - From {@link generateOpenApiDocument}, when a
 *   binding table carries a label or a schema that module cannot
 *   describe.
 *
 * @remarks
 * Two spaces of indent and a closing newline, which is what makes
 * the artifact readable in a terminal and diffable against the
 * previous run by hand. The document is generated fresh on every
 * call, the registry behind it being an accumulator.
 */
export function exportOpenApiDocument(
  file: string = OPENAPI_DOCUMENT_FILE,
): ExportedDocument {
  const text = `${JSON.stringify(generateOpenApiDocument(), null, 2)}\n`;

  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);

  return { file, bytes: Buffer.byteLength(text) };
}

/**
 * Whether this file is what the process was started with, rather
 * than something another module imported.
 *
 * Worth asking because this module is both a command and a
 * library: `bun scripts/export-openapi.ts` writes the artifact,
 * while a caller importing {@link exportOpenApiDocument} or
 * {@link OPENAPI_DOCUMENT_FILE} gets the exports and no write.
 *
 * Both halves of the comparison fail silently when they are got
 * wrong, so both are stated. `import.meta.url` is a `file:` URL
 * where `process.argv[1]` is a path, which is why the conversion
 * is load-bearing rather than tidy: without it the two are never
 * equal and the block below never runs, in every process. And the
 * guard has to stay lexically in the file the command names,
 * `import.meta.url` being the module it is written in — a copy
 * moved into a shared helper compares THAT helper against
 * `process.argv[1]` and answers false always. `seed.ts`,
 * `approve.ts`, `build-workflows.ts` and `deploy-external.ts`
 * carry the same two lines for the same reason, and
 * `build-workflows.ts` writes the argument out at length.
 */
const INVOKED_AS_CLI = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === process.argv[1];

if (INVOKED_AS_CLI) {
  const written = exportOpenApiDocument();

  // One line carrying both facts, so a reader cannot take the
  // size for the path's own or read a byte count left over from
  // an earlier run beside a path this one wrote.
  console.log(`wrote ${written.file} (${written.bytes} bytes)`);
}
