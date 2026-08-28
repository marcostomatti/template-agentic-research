/**
 * @packageDocumentation
 * Helpers the unit suites share, and nothing the app renders imports.
 *
 * This directory sits under `src/` rather than beside the Playwright
 * tree because the unit runner only reads `src/**` — see
 * `vitest.config.ts` — but it is deliberately NOT a `*.test.ts` file,
 * so vitest collects nothing from it. Nothing in the app imports it
 * either, so the bundler drops it from the build.
 */

/**
 * The values that occur more than once, in the order they repeat.
 *
 * Returned rather than counted so a distinctness assertion can compare
 * against `[]` and let vitest print the colliding values themselves —
 * `expect(repeated(ids)).toEqual([])` names the duplicate, where a
 * count says only that there is one.
 *
 * Comparison is `indexOf`, so values are matched the way `===` matches
 * them: two equal-looking objects are two values, and only primitives
 * (the ids, slugs, paths and hashes this is used on) compare the way a
 * reader expects.
 *
 * @param values - The values to check, in their own order.
 * @returns Each occurrence after the first, in the order met; `[]` when
 * every value is distinct.
 */
export function repeated<T>(values: readonly T[]): readonly T[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}
