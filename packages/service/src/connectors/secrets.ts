/**
 * @packageDocumentation
 * What a connector's `config` gives back, and the one value it
 * refuses to take: the closed roster of key names that hold a
 * credential, the single literal that stands in their place on the
 * way out, and the two walks that apply it.
 *
 * `connectors.config` is a jsonb column and it is where an API key
 * lives. `src/db/schema/sources.ts` says in as many words that a
 * value there is protected by the database's access control and by
 * nothing else. This module is the other half of that sentence. It
 * does not protect the column; it keeps the column's contents from
 * ALSO being unprotected on the way out, where a response carries
 * on into a proxy log, a browser cache and a pasted support ticket.
 *
 * Write-only is the word the surface uses and this is what it buys.
 * A caller can SET a secret and can tell that one is set; it cannot
 * read one back. {@link maskConnectorConfig} is the second half of
 * that, and every path answering a config runs through it — the
 * list, and the rows a create and a patch answer with.
 *
 * ONE ROSTER AND ONE LITERAL SIT BEHIND BOTH DIRECTIONS. Replacing
 * a value on the way out and refusing that same value on the way in
 * are two rules about one string. Written twice they drift on the
 * first key added to either, and the direction they drift in is a
 * stored credential answered in the clear — so both are derived
 * from the two declarations below and neither restates them.
 *
 * THE MATCH IS CASE-INSENSITIVE, because the two mistakes cost
 * different amounts. A key this module fails to recognise is a
 * credential on the wire, and nothing downstream reports it. A key
 * it recognises that holds no credential is a member answered as
 * the mask, which a caller sees immediately and which
 * {@link findMaskedSecretPaths} then refuses back — visible, and
 * recoverable by naming the member something else. So the roster
 * errs wide. It does not err wide enough to swallow ordinary
 * configuration: a name earns a place when the NAME ALONE says the
 * value authenticates something, which `apiKey` does and a bare
 * `key` does not.
 *
 * Case is the only spelling difference the match absorbs. A
 * separator variant is a different string — `api_key` is not
 * `apiKey` under `toLowerCase` — so both spellings are roster
 * members, and a third convention costs a row rather than a rule.
 *
 * A SECRET'S VALUE IS REPLACED WHOLE AND NEVER WALKED INTO. What
 * sits under a roster key is the credential whatever its type: an
 * object of connection parameters, a list of rotating tokens, a
 * number. Recursing into it would answer every member the caller
 * put beside the secret, which is the leak stated as a feature.
 *
 * THE ANSWER IS ALWAYS A NEW STRUCTURE, even when nothing matched.
 * Sharing the stored containers when there was nothing to replace
 * would make the no-mutation promise conditional on the input, and
 * a caller cannot tell which case it got. Unconditional is what
 * makes it a rule rather than a likelihood, and a config is small.
 *
 * The rebuild is fail-CLOSED: every key of a copied record is
 * written as the mask first and overwritten with its real value
 * afterwards, so a member the walk somehow never reaches answers as
 * a mask rather than as itself. Defining the keys up front is also
 * what preserves their order, which matters because a jsonb key
 * order is a reading elsewhere in this package.
 *
 * BOTH WALKS ARE ITERATIVE, and that is not a style choice. The
 * body limit here is `express.json`'s 1mb default, and a body of
 * nested arrays that size is roughly half a million levels deep. A
 * recursive walk overflows the stack at about 50,000 (measured
 * under bun; `JSON.parse` itself survives 50,000 and more), so a
 * recursive version of either function would turn a pathological
 * body into a 500 from inside a handler. An explicit stack has no
 * such ceiling, which keeps the depth question off this module's
 * contract entirely.
 *
 * WHAT THIS IS NOT. It is not encryption and not a rotation story:
 * the stored value is still in the clear in the column, in every
 * dump and to every connection, exactly as the schema says. It is
 * not a sanitizer either — nothing here escapes HTML, SQL or a
 * shell, and a masked config is a JSON value rather than a
 * template. And it is not a scanner for secrets stored under names
 * nobody rostered; a credential filed under `note` is answered as
 * itself, which is why the roster is the thing to keep current.
 */

/**
 * The key names whose value is a credential, whatever kind of
 * connector stored it.
 *
 * Closed and alphabetical. A kind needing a name that is not here
 * adds it here, which is what keeps the masking and the refusal
 * looking at one set. Matching is case-insensitive
 * ({@link maskConnectorConfig}), so a member differing from one of
 * these only in case is already covered and must NOT be added as a
 * second row — a duplicate under `toLowerCase` makes the roster
 * read longer than the set it denotes.
 *
 * `credentials` is deliberately the one container name on the list.
 * Whatever a client files under it is the thing that authenticates
 * the call, so replacing it whole is the answer rather than walking
 * in and masking the members that happen to be rostered.
 */
export const SECRET_CONFIG_KEYS = [
  'access_token',
  'accessToken',
  'api_key',
  'apiKey',
  'authorization',
  'client_secret',
  'clientSecret',
  'credentials',
  'password',
  'private_key',
  'privateKey',
  'refresh_token',
  'refreshToken',
  'secret',
  'token',
] as const;

/**
 * What a masked value reads as on the wire, and the one value a
 * submitted config may not carry.
 *
 * Written so that nothing could plausibly BE this: the surrounding
 * double underscores say sentinel rather than value, and the text
 * says which sentinel. ASCII throughout, so it survives every
 * transport and every terminal that prints it, and one token, so
 * the refusal below is an equality rather than a pattern.
 */
export const MASKED_SECRET = '__masked_secret__';

/** The roster lower-cased once, for the match below. */
const SECRET_KEY_LOOKUP = new Set<string>(
  SECRET_CONFIG_KEYS.map((key) => key.toLowerCase()),
);

/** Whether `key` names a value that is masked on the way out. */
function isSecretKey(key: string): boolean {
  return SECRET_KEY_LOOKUP.has(key.toLowerCase());
}

/**
 * Whether `value` is a JSON array.
 *
 * Written as a guard rather than used inline so the narrowing lands
 * on `readonly unknown[]`: `Array.isArray` on an `unknown` narrows
 * to `any[]`, which would spread `any` through every member read
 * below it.
 */
function isJsonArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

/** Whether `value` is a JSON object, not an array or a scalar. */
function isJsonRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return !Array.isArray(value);
}

/**
 * Writes `key` onto `target` as an own enumerable property.
 *
 * `target[key] = value` is not equivalent and the difference is
 * silent: assigning `__proto__` sets the object's prototype instead
 * of storing anything, so a stored config carrying that key — which
 * `JSON.parse` produces as an own property, unlike an object
 * literal — would lose the member and change the copy's shape.
 * A define stores it as itself.
 */
function defineEntry(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

/** One member of a copied container, still owing its own copy. */
interface MaskTask {
  /** Where the copy is attached once it has been built. */
  readonly attach: (value: unknown) => void;

  /** The stored value this task copies. */
  readonly node: unknown;
}

/**
 * One level of {@link maskConnectorConfig}'s copy.
 *
 * @param node - The stored value to copy.
 * @param pending - The walk's stack, which this appends each member
 *   of a container to rather than descending itself.
 * @returns A new container whose members are still to be filled in,
 *   or `node` itself when it is a scalar and there is nothing to
 *   copy.
 */
function maskOne(node: unknown, pending: MaskTask[]): unknown {
  if (isJsonArray(node)) {
    const target: unknown[] = [];

    for (const [index, member] of node.entries()) {
      pending.push({
        attach: (value) => { target[index] = value; },
        node: member,
      });
    }

    return target;
  }

  if (isJsonRecord(node)) {
    const target: Record<string, unknown> = {};

    for (const [key, member] of Object.entries(node)) {
      defineEntry(target, key, MASKED_SECRET);

      if (!isSecretKey(key)) {
        pending.push({
          attach: (value) => { defineEntry(target, key, value); },
          node: member,
        });
      }
    }

    return target;
  }

  return node;
}

/**
 * `config` with the value under every {@link SECRET_CONFIG_KEYS}
 * member, at any depth, replaced by {@link MASKED_SECRET}.
 *
 * @param config - A config as STORED. Typed `unknown` because that
 *   is what a jsonb column answers: nothing constrains the stored
 *   shape to an object, and a scalar or a list written by another
 *   client has to pass through here rather than throw.
 * @returns A new value of the same shape. Containers are rebuilt
 *   whether or not anything in them matched, so the argument is
 *   never mutated and is never shared with the answer; scalars are
 *   answered as themselves, having nothing to copy.
 *
 * @remarks
 * The match is on the KEY and case-insensitive, and the whole value
 * under a matching key is replaced whatever its type — see this
 * module's header for why each of those is the safer half of its
 * trade.
 *
 * Applying this twice is safe and answers the same thing, which is
 * worth having rather than being a coincidence: a config can reach
 * a response through a caller that could not know whether another
 * had already masked it.
 */
export function maskConnectorConfig(config: unknown): unknown {
  const pending: MaskTask[] = [];
  const answer = maskOne(config, pending);

  for (let task = pending.pop(); task !== undefined; task = pending.pop()) {
    task.attach(maskOne(task.node, pending));
  }

  return answer;
}

/** One value the path walk has yet to look at, and where it sat. */
interface PathTask {
  /** The submitted value. */
  readonly node: unknown;

  /** The dotted path it was submitted at. */
  readonly path: string;
}

/** `key` appended to `path`, which is empty at the top level. */
function joinPath(path: string, key: string): string {
  if (path === '') {
    return key;
  }

  return `${path}.${key}`;
}

/**
 * Appends each member of `node` to `pending`, in reverse.
 *
 * Reverse because the walk pops: pushing backwards is what makes
 * the paths come out in the order they were submitted in, rather
 * than in the order a stack happens to unwind.
 */
function pushMembers(
  node: unknown,
  path: string,
  pending: PathTask[],
): void {
  if (isJsonArray(node)) {
    for (let index = node.length - 1; index >= 0; index -= 1) {
      pending.push({ node: node[index], path: `${path}.${index}` });
    }

    return;
  }

  if (!isJsonRecord(node)) {
    return;
  }

  const entries = Object.entries(node);

  for (let at = entries.length - 1; at >= 0; at -= 1) {
    const entry = entries[at];

    if (entry !== undefined) {
      pending.push({ node: entry[1], path: joinPath(path, entry[0]) });
    }
  }
}

/**
 * Every dotted path in `config` whose value is
 * {@link MASKED_SECRET}.
 *
 * @param config - A config as SUBMITTED, after the request schema
 *   has made it a record. Unlike {@link maskConnectorConfig}'s
 *   argument this never comes off a row, so the record type is the
 *   honest one.
 * @returns The paths, in the order they were submitted in, and an
 *   empty list when the literal appears nowhere. A member inside a
 *   list is addressed by index (`tokens.1`), which is the spelling
 *   `src/http/validation.ts` gives an array-element fault.
 *
 * @remarks
 * The round trip this exists to close is the ordinary one: a caller
 * reads a connector, edits one member of the masked config, and
 * sends the whole object back. Storing what came back would put the
 * literal `MASKED_SECRET` in place of that deployment's API key,
 * the connector would stop working, and the read afterwards would
 * show the mask — which is what it showed before.
 *
 * The literal is reported wherever it sits and not only under a
 * roster key, because a value that reads as a sentinel is never one
 * somebody meant to store, and because the key it was copied onto
 * need not be the key it was copied FROM. What a caller does with
 * the paths is the service's business; nothing is refused here.
 */
export function findMaskedSecretPaths(
  config: Readonly<Record<string, unknown>>,
): readonly string[] {
  const found: string[] = [];
  const pending: PathTask[] = [];

  pushMembers(config, '', pending);

  for (let task = pending.pop(); task !== undefined; task = pending.pop()) {
    if (task.node === MASKED_SECRET) {
      found.push(task.path);
    } else {
      pushMembers(task.node, task.path, pending);
    }
  }

  return found;
}
