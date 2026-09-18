/**
 * @packageDocumentation
 * The feedback feature entry of `@ar/dev-tools` — the `./feedback`
 * export, browser-side, and deliberately empty of behaviour until the
 * feedback plan lands.
 *
 * The export is declared now rather than later on purpose: a consuming
 * app's import path is settled by `package.json`'s `exports`, and an
 * entry added after consumers exist is a second migration. So this
 * module is built, typed and shipped as a placeholder, and gains:
 *
 * - The feedback `DevToolsFeature` — the report form, its attachment
 *   capture and the submit that `POST`s to `<endpoint>/report`.
 * - The zod schema the form validates against before it sends, matching
 *   the one the node plugin validates the received body against.
 *
 * It reaches the shell only through `DevToolsHost`, like any feature:
 * it imports no shell state, no other feature and no node builtin.
 */

/**
 * Placeholder export naming this entry, so the skeleton build emits a
 * non-empty `dist/feedback.js` and the `./feedback` export resolves to
 * a file the build actually wrote. Removed when the feedback feature
 * lands.
 */
export const DEVTOOLS_FEEDBACK_ENTRY = 'devtools:feedback' as const;
