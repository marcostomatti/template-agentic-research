/**
 * `hashPassword` and `verifyPassword`, driven over the real
 * `@node-rs/argon2` binding rather than over a stub of it.
 *
 * Nothing here is mocked, and that is the point of the file rather
 * than an omission. The module is four lines of glue over a native
 * addon, so a suite that stubbed the addon would assert only that the
 * glue calls what it calls — while the three things a login path
 * actually depends on all live on the other side of that boundary:
 * that the binding loads at all under a vitest worker (Node.js, not
 * bun, which is the whole reason `Bun.password` is unusable here),
 * that the algorithm selected is argon2id, and that a candidate which
 * should not match does not.
 *
 * The algorithm claim is checked from the output rather than from the
 * input. `src/auth/password.ts` cannot write `Algorithm.Argon2id` —
 * an ambient `const enum` member is TS2748 under this repo's
 * `isolatedModules` — so it passes the numeric literal the enum
 * declares, and the `$argon2id$` prefix on the PHC string is what
 * says that literal still means what the constant's name claims.
 * Measured by flipping that literal to `1` (Argon2i): exactly the two
 * cases that read the prefix go red and the other four stay green, so
 * an argon2i hash round-trips, refuses a wrong password, refuses an
 * empty candidate and turns away a malformed stored hash just as an
 * argon2id one does. The prefix is the only thing in this file that
 * says which variant is actually in use.
 *
 * The malformed-hash roster is the one table here, and it carries two
 * guards, because "answers false" is the assertion a function that
 * returned `false` unconditionally would also pass. Its length is
 * pinned, so a roster silently emptied fails rather than passing
 * vacuously over nothing; and the case ends with the same call over a
 * genuine hash, which must answer `true`. Both were measured against
 * their own mutations — emptying the roster and flipping the module's
 * `catch` to fail OPEN each redden this case and nothing else.
 */
import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password.js';

const PASSWORD = 'correct-horse-battery-staple';

/**
 * Hash strings argon2 cannot verify against, each a shape a real
 * `auth_users.password_hash` column could hold. The last two are not
 * redundant with the first three: a truncated digest behind a
 * well-formed prefix fails inside argon2 for a different reason
 * (`Output is too short`, not `Decoding failed`), and a bcrypt string
 * is what a row migrated in from another scheme would look like.
 */
const MALFORMED_HASHES = [
  '',
  'not-a-hash-at-all',
  '$argon2id$',
  '$argon2id$v=19$m=19456,t=2,p=1$AAAA$BBBB',
  '$2b$12$K4y1cQz0Zt7bJ8mXqvOeFuT3sHwLpRdN2aGhVxYbCiJkMnOpQrStu',
] as const;

// ---------------------------------------------------------------------------
// hashPassword
// ---------------------------------------------------------------------------

describe('hashPassword', () => {
  it('round-trips a password through an argon2id PHC string', async () => {
    const hash = await hashPassword(PASSWORD);

    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(hash, PASSWORD)).toBe(true);
  });

  it('salts every hash, so one password never yields one string', async () => {
    const [first, second] = await Promise.all([
      hashPassword(PASSWORD),
      hashPassword(PASSWORD),
    ]);

    expect(first).not.toBe(second);
    expect(await verifyPassword(first, PASSWORD)).toBe(true);
    expect(await verifyPassword(second, PASSWORD)).toBe(true);
  });

  it('hashes an empty password rather than refusing it', async () => {
    const hash = await hashPassword('');

    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(hash, '')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// verifyPassword
// ---------------------------------------------------------------------------

describe('verifyPassword', () => {
  it('refuses a wrong password', async () => {
    const hash = await hashPassword(PASSWORD);

    expect(await verifyPassword(hash, 'correct-horse-battery-stapl')).toBe(false);
    expect(await verifyPassword(hash, `${PASSWORD} `)).toBe(false);
    expect(await verifyPassword(hash, PASSWORD.toUpperCase())).toBe(false);
  });

  it('never lets an empty candidate match a real password', async () => {
    const hash = await hashPassword(PASSWORD);

    expect(await verifyPassword(hash, '')).toBe(false);
  });

  it('answers false rather than throwing for a hash it cannot read', async () => {
    const verdicts: Array<readonly [string, boolean]> = [];
    for (const stored of MALFORMED_HASHES) {
      verdicts.push([stored, await verifyPassword(stored, PASSWORD)]);
    }

    expect(verdicts).toHaveLength(5);
    expect(verdicts).toEqual(MALFORMED_HASHES.map((stored) => [stored, false]));

    // In-band control: the same call over a hash argon2 CAN read
    // answers `true`, so the roster above is discriminating rather
    // than a function that reports `false` for everything.
    expect(await verifyPassword(await hashPassword(PASSWORD), PASSWORD)).toBe(true);
  });
});
