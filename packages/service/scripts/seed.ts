/**
 * @packageDocumentation
 * The seed pipeline: the path that takes the seed files in `data/`
 * and applies them to the database.
 *
 * Only the underscore-stripping half is here today. The per-file
 * schemas, the loader that reads and validates the bundle, the
 * idempotent apply and the CLI entry point all arrive later in this
 * stage.
 */

/**
 * A copy of `value` with every object key beginning with an
 * underscore removed, at every depth.
 *
 * `data/README.md` requires each seed file to open with a `"_readme"`
 * header repeating that the file is a seed, that this script applies
 * it, and that nothing in the directory is read at runtime. The
 * leading underscore is what marks a key as that commentary rather
 * than a value bound for a column, so it is dropped here — ahead of
 * the per-file schemas, which are to reject an unknown key so that a
 * mistyped member is an error rather than a field that silently never
 * applies. A header key would be exactly such an unknown, and naming
 * each one in those schemas would spend that strictness on the
 * convention.
 *
 * Recursive rather than top-level because a header belongs wherever a
 * reader meets the thing it describes. Today that is only the
 * outermost object of each file, but a note about one row belongs on
 * that row, and a note carried into an insert is a key no column
 * answers to.
 *
 * An array and a scalar are unchanged in themselves: an array has no
 * keys to drop, so its length and order survive, and a string,
 * number, boolean or `null` comes back as it arrived. The walk still
 * descends through an array, since a seed's rows are the objects
 * inside one.
 *
 * Nothing is mutated — every object and array is rebuilt — so the
 * parsed value a caller still holds keeps its header.
 *
 * Two limits. The filter reads a key's name and nothing else, so
 * commentary under a key without the prefix is carried through, to be
 * reported by the schema that meets it. And the input this is written
 * for is parsed JSON: a `Date`, a `Map` or a class instance reaching
 * it comes back as a plain object with its underscore-prefixed
 * properties gone.
 *
 * `__proto__` is dropped by the same rule, `JSON.parse` having made
 * it an own key rather than a prototype write. It would not reach a
 * prototype here in any case: `Object.fromEntries` defines the
 * properties it is given instead of assigning them, unlike the
 * `object[key] = value` form.
 *
 * @param value - Parsed JSON, or any part of it.
 * @returns The same value with every leading-underscore key removed.
 */
export function stripUnderscoreKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((member) => stripUnderscoreKeys(member));
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, member]): [string, unknown] => [
        key,
        stripUnderscoreKeys(member),
      ]),
  );
}
