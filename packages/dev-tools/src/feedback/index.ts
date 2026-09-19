/**
 * @packageDocumentation
 * The feedback feature entry of `@ar/dev-tools` — the `./feedback`
 * export, browser-side, and deliberately EMPTY until q20b-2 lands.
 *
 * It exports nothing, on purpose. The export path is declared in
 * `package.json` now rather than later because a consuming app's
 * import specifier is settled by `exports`, and an entry added after
 * consumers exist is a second migration; so the path is built, typed
 * and shipped ahead of the behaviour it will carry.
 *
 * q20b-2 fills it with:
 *
 * - The feedback {@link DevToolsFeature} — the report form, its
 *   attachment capture and the submit that `POST`s to
 *   `<endpoint>/report`.
 * - The zod schema the form validates against before it sends,
 *   matching the one `src/vite/`'s plugin validates the received body
 *   against.
 *
 * It will reach the shell only through `DevToolsHost`, like any
 * feature: no shell state, no other feature, no node builtin.
 *
 * The `export {}` below exports nothing and is not decoration: it is
 * what makes this file a MODULE. Measured — with it deleted, `bun run
 * build` still exits `0` and still writes `dist/feedback.js` and
 * `dist/feedback/index.d.ts`, but the declaration file ends at the
 * comment, so the `./feedback` export resolves to a script rather than
 * to a module with no exports yet. The marker is the difference
 * between an entry that is empty and an entry that is not an entry.
 */

export {};
