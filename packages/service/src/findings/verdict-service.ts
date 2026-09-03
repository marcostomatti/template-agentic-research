/**
 * @packageDocumentation
 * The findings surface's ONE WRITE: an operator's ruling on one
 * finding, appended to `finding_labels`.
 *
 * ONE FUNCTION AND ONE WRITE, which is why this is a module of its
 * own rather than a third export of `./service.ts`. That file
 * narrows `FindingStore` to its six READS and states the absence of
 * the seventh as its read-only claim; this one narrows the same
 * port to `findFindingById` and `insertFindingLabel` and reaches
 * none of the other six. Neither file can call the
 * other's half by accident or by a later edit, because neither
 * type has a member for it.
 *
 * THE VOCABULARY IS READ PER CALL, OFF THE OWNING DOMAIN.
 * `finding_labels.verdict` is the one NOT NULL text column in
 * schema v2 constrained to a value set and carrying no CHECK for
 * it, because the set is `DomainSettings.verdictVocabulary` on the
 * domain row and differs per domain. So there is nothing here to
 * cache and nothing for a caller to pass in: a domain that renamed
 * its ladder this morning judges this afternoon's ruling by the new
 * one, which is what makes the setting a setting rather than a
 * migration.
 *
 * THE DOMAIN IS REACHED THROUGH THE FINDING AND NEVER THROUGH A
 * SEGMENT. `PATCH /findings/:id/verdict` addresses a finding, so
 * the owning domain is `FindingRecord.domainId` and a caller
 * neither names it nor can get it wrong: one domain's finding
 * cannot be judged against another's ladder, and there is no
 * spelling of this request that would try.
 * `DomainStore.findDomainById` exists for this read and for no
 * other.
 *
 * THE FALLBACK IS ON AN ABSENT MEMBER AND ON NOTHING ELSE. A domain
 * naming no vocabulary is judged against
 * {@link DEFAULT_VERDICT_VOCABULARY}, which is what that constant
 * says it is — the value a domain starts from, not a floor under
 * it. A domain declaring an EMPTY vocabulary has NAMED one, and it
 * refuses every verdict there is: that is a domain which has closed
 * judging rather than one that has not configured it, and
 * {@link ladderOf} carries which spelling keeps the two apart and
 * which reflex quietly collapses them.
 *
 * THE REFUSAL NAMES THE FIELD AND THE ACCEPTED SET, AND NEVER THE
 * SUBMITTED VERDICT. This is the one route on the whole surface
 * whose subject is a string a caller chose, so the containment rule
 * `tests/api/request-echo.test.ts` holds over every write route is
 * at its sharpest here. {@link vocabularyRefusal} composes its
 * sentence from a constant of this module's own and from the STORED
 * ladder, and from nothing else: no branch reads the submitted
 * verdict, and a caller learns what it may say rather than being
 * told back what it said.
 *
 * THE ONE THING THAT CLAIM DOES NOT COVER is a submitted string
 * that happens to be a SUBSTRING of a declared verdict, which comes
 * back inside that member. It is a coincidence of the stored ladder
 * rather than an echo — nothing copied it — and it is why
 * `./verdict-service.test.ts` counts a sentinel no vocabulary here
 * contains a piece of, so a zero is a reading of the refusal rather
 * than of the fixture.
 *
 * A RULING APPENDS AND NEVER UPDATES, per `./store.ts`.
 * `finding_labels` carries no unique key at all, so a second ruling
 * on one finding is a second row and both are readable afterwards.
 * The sequence is the record of an operator changing their mind,
 * and the ruling a later one replaced is still a true statement
 * about the moment it was made.
 *
 * THE BODY IS PARSED HERE RATHER THAN BY THE ROUTER, on the terms
 * `src/domains/service.ts` states for its own writes: the operation
 * owns its input contract, so one parse serves the HTTP route and
 * the MCP tool that exposes the same act.
 *
 * NOTHING HERE WRITES `score` OR `score_version`, and nothing here
 * invokes a workflow. The narrowed port below has no method for
 * either, which is the read-first law of
 * `docs/architecture/08-http-api.md` arriving as a shape rather
 * than as an observance.
 *
 * THE STORE IS A PARAMETER, so every rule here is exercisable with
 * no database: `tests/helpers/memory-research-store.ts` stands
 * behind both ports in the isolated suite.
 */
import type { FindingLabelRecord, FindingStore } from './store.js';
import type { DomainRecord, DomainStore } from '../domains/store.js';

import { z } from 'zod';

import {
  NotFoundError,
  ValidationError,
} from '../../lib/errors/index.js';
import { DEFAULT_VERDICT_VOCABULARY } from '../db/schema/values.js';
import { StoreRefusal } from '../db/store-errors.js';
import { parseBody } from '../http/validation.js';

/**
 * Exactly the port methods {@link recordVerdict} reaches, across
 * both ports it reaches them on.
 *
 * A `Pick` OF TWO PORTS RATHER THAN EITHER ONE WHOLE, on the terms
 * `FindingsServiceStore` in `./service.ts` states. Reading the
 * owning domain is one method of `DomainStore`, and asking for that
 * port whole would have this module claim to need the domain writes
 * it never issues — including the delete that would take the very
 * finding being ruled on.
 *
 * FIVE OF `FindingStore`'S SEVEN METHODS ARE ABSENT, and the
 * absence is the split between this module and its sibling written
 * as a type. The six READS belong to `./service.ts`, the one write
 * belongs here, and `findFindingById` is the only method both
 * name — each resolving its own address before it does
 * anything else.
 *
 * Built with `Pick` rather than by listing signatures, so a method
 * here cannot drift from the thing it names: a hand-copied
 * signature would go on type-checking against a port that had moved
 * under it.
 */
export type VerdictServiceStore =
  Pick<DomainStore, 'findDomainById'>
  & Pick<FindingStore, 'findFindingById' | 'insertFindingLabel'>;

/**
 * The whole body `PATCH /findings/:id/verdict` reads: the ruling,
 * and what the operator wanted to say about it.
 *
 * STRICT, so an undeclared key is a `422` naming `body` rather than
 * a member quietly dropped. That matters more here than on a
 * read: a caller that misspelt `note` and had it stripped would
 * read a `200` as its remark having been stored.
 *
 * `verdict` IS A BARE STRING AND CARRIES NO VALUE RULE AT ALL,
 * which is this module's whole subject rather than an omission. The
 * accepted set is the owning domain's and is not knowable until the
 * finding has been resolved, so a `z.enum` here would have to name
 * a ladder some other domain uses. It carries no length rule
 * either: a verdict outside the vocabulary is refused by
 * {@link recordVerdict} whatever its length, and a `.min(1)` would
 * refuse one particular non-member with a different code from every
 * other — two authorities on one question.
 *
 * `note` IS OPTIONAL AND ITS ABSENCE IS A NULL. There is no writer
 * but a person here, so an omitted note is a person having written
 * none, and `finding_labels.note` stores that as NULL rather than
 * as an empty string.
 */
export const verdictBodySchema = z.object({
  note: z.string().optional(),
  verdict: z.string(),
}).strict();

/** A parsed ruling: the verdict always, the note when sent. */
export type VerdictBody = z.infer<typeof verdictBodySchema>;

/**
 * What a caller is told when no finding carries the id it named.
 *
 * Equal by intent to the sentence `./service.ts` answers for the
 * same `:id`, and spelled again rather than imported: the two are
 * equal by intent rather than by derivation, and either is free to
 * change without dragging the other with it.
 */
const NO_SUCH_FINDING = 'No finding carries that id';

/** The `field` a vocabulary refusal names, and the only one. */
const VERDICT_FIELD = 'verdict';

/**
 * The machine-readable code that refusal carries.
 *
 * This module's own rather than one of zod's: no schema raised it,
 * because no schema could — the accepted set is not knowable until
 * a row has been read. A client branching on it learns that the
 * ruling was refused by the DOMAIN rather than by the shape of the
 * request, which is the one distinction the two 422s here differ
 * on.
 */
const OUTSIDE_VOCABULARY_CODE = 'verdict_outside_vocabulary';

/**
 * What that refusal's one detail says, up to the accepted set.
 *
 * A CONSTANT OF THIS MODULE'S OWN, with the stored ladder appended
 * and nothing else. Nothing submitted is composed into it, which is
 * the containment claim in this module's header expressed as one
 * declaration rather than as a review of which values were touched.
 */
const NOT_ACCEPTED = 'Not a verdict this domain accepts. Its ladder:';

/**
 * Builds the 422 a verdict outside the ladder answers with.
 *
 * @param vocabulary - The accepted set, as the domain declared it or
 *   as {@link DEFAULT_VERDICT_VOCABULARY} supplied it. Rendered into
 *   the message so a caller is told what it MAY say.
 * @returns The refusal to throw.
 *
 * @remarks
 * `JSON.stringify` RATHER THAN A JOIN, for two reasons and neither
 * is formatting. It quotes each member, so a verdict carrying a
 * comma or a space is still readable as one member rather than as
 * two. And it escapes every control character it meets, so a ladder
 * an operator stored with a raw NUL or a lone surrogate in it
 * reaches the wire and the log line as an escape — which is the
 * same discipline `src/http/control-bytes.ts` applies to the two
 * surfaces that answer stored bodies, reached here through the
 * serialiser rather than through a mask this one detail does not
 * need.
 *
 * AN EMPTY LADDER RENDERS AS `[]` AND TAKES NO BRANCH. A domain
 * that has closed judging is told exactly that, in the sentence
 * every other refusal here uses, and there is no second wording to
 * come to disagree with the first.
 *
 * The array is built per call rather than shared from a module
 * constant, so nothing a handler or a serialiser does to one
 * refusal's details can reach the next one's.
 */
function vocabularyRefusal(
  vocabulary: readonly string[],
): ValidationError {
  return new ValidationError('Validation failed', [{
    field: VERDICT_FIELD,
    message: `${NOT_ACCEPTED} ${JSON.stringify(vocabulary)}`,
    code: OUTSIDE_VOCABULARY_CODE,
  }]);
}

/**
 * The ladder one finding's ruling is judged against.
 *
 * @param domain - The owning domain, as the read answered it.
 * @returns What the domain declared, or
 *   {@link DEFAULT_VERDICT_VOCABULARY} when it declared nothing.
 *
 * @remarks
 * `??` AND NOT AN EMPTINESS TEST, which is the whole of the
 * empty-ladder rule. A domain that declared the EMPTY list has
 * NAMED a ladder, so a service reaching for the natural-looking
 * `vocabulary?.length ? vocabulary : DEFAULT` answers a domain
 * that has closed judging with the four verdicts it deliberately
 * stopped using. `??` falls through an ABSENT member and through
 * nothing else, which is the one state the fallback is for.
 *
 * `||` HAPPENS TO AGREE HERE, AND IS NOT WHAT THIS SPELLING IS
 * ABOUT — which is worth saying because it is the reflex a reader
 * reaches for. An empty ARRAY is truthy, so `||` falls through
 * `undefined` alone exactly as `??` does; measured, swapping the
 * two reddens nothing in `./verdict-service.test.ts`. The mistake
 * that IS reachable is the emptiness test above, and that is the
 * leg the test file's grid records.
 */
function ladderOf(domain: DomainRecord): readonly string[] {
  return domain.settings.verdictVocabulary
    ?? DEFAULT_VERDICT_VOCABULARY;
}

/**
 * Records one operator ruling on one finding.
 *
 * @param store - Where the finding, its domain and the ruling go.
 * @param id - The finding, as `resourceIdParamSchema` in
 *   `src/http/schemas.ts` parsed the path segment.
 * @param body - The unvalidated request body, or the arguments an
 *   MCP tool was called with. Parsed here; see this module's header
 *   for why the parse is not the caller's.
 * @returns The stored row, read back rather than reconstructed from
 *   the argument, so the caller sees the id the write stamped and
 *   the instant the column defaulted.
 * @throws ValidationError - When the body does not satisfy
 *   {@link verdictBodySchema}, and when the verdict is outside the
 *   owning domain's ladder. The second carries one detail naming
 *   {@link VERDICT_FIELD} and the accepted set, and nothing the
 *   caller submitted.
 * @throws NotFoundError - When no finding carries the id.
 *
 * @remarks
 * THE BODY IS PARSED BEFORE THE FINDING IS RESOLVED, on the terms
 * `patchDomain` in `src/domains/service.ts` states: the shape of a
 * body is a fact about the request alone, so a malformed one is a
 * 422 whether or not the finding exists, and answering the same
 * malformed ruling a 422 or a 404 depending on what happens to be
 * stored would make a caller's error depend on someone else's rows.
 * It also costs that refusal no database read at all.
 *
 * THE THREE READS ARE STRICTLY SEQUENTIAL AND NONE OF THEM CAN BE
 * ISSUED TOGETHER. The domain is addressed by a member of the
 * finding, and the ladder decides whether the append happens at
 * all, so this is the one operation on the findings surface with no
 * `Promise.all` to reach for: each answer is the next question's
 * argument.
 *
 * A DOMAIN THAT IS NOT THERE IS THE SAME 404 AS A FINDING THAT IS
 * NOT, and that is a statement about the schema rather than a
 * convenience. `findings.domain_id` is NOT NULL and cascades, so a
 * null here means the domain went between the two reads — which
 * took this finding with it. By the time the caller reads the
 * answer, no finding carries the id, which is exactly what the
 * refusal says.
 *
 * THE FOREIGN KEY IS A RACE AND IS TRANSLATED AS ONE.
 * `finding_labels_finding_id_findings_id_fk` is the only mechanism
 * the write can reach, per `./store.ts`, and the lookup above has
 * already settled that the finding was there — so a refusal at the
 * insert means it went in between, and it is the same 404 because
 * it is the same fact by the time a caller reads it. Anything else
 * a store throws is a store doing something its port does not
 * describe, and it is rethrown untouched.
 *
 * The insert is `return await` inside the `try` and not a bare
 * `return`. Returning the promise unawaited would settle it outside
 * this block, the `catch` would never run, and every raced ruling
 * in the deployment would answer 500 with the whole function still
 * reading as if it handled one.
 */
export async function recordVerdict(
  store: VerdictServiceStore,
  id: number,
  body: unknown,
): Promise<FindingLabelRecord> {
  const input = parseBody(verdictBodySchema, body);
  const finding = await store.findFindingById(id);

  if (finding === null) {
    throw new NotFoundError(NO_SUCH_FINDING);
  }

  const domain = await store.findDomainById(finding.domainId);

  if (domain === null) {
    throw new NotFoundError(NO_SUCH_FINDING);
  }

  const ladder = ladderOf(domain);

  if (!ladder.includes(input.verdict)) {
    throw vocabularyRefusal(ladder);
  }

  try {
    return await store.insertFindingLabel({
      findingId: finding.id,
      verdict: input.verdict,
      note: input.note ?? null,
    });
  } catch (err) {
    if (
      err instanceof StoreRefusal
      && err.reason === 'foreign-key-violation'
    ) {
      throw new NotFoundError(NO_SUCH_FINDING, undefined, {
        cause: err,
      });
    }

    throw err;
  }
}
