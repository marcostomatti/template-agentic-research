/**
 * The findings, documents, registry, passes and gate stores driven
 * against a real Postgres, through the real migrations. The findings
 * half: a domain with five findings written in an order that is
 * neither the digest order nor its reverse, that order answered by a
 * real `ORDER BY` with an unscored finding last, the same order with
 * the score key gone, the verdict in force over a finding re-judged
 * twice, a ruling appended beside the one it followed, and the jsonb
 * read that files a finding under a category. The documents half: a
 * stored control byte answered as an escape, a body cut at the
 * shared cap, and the one member of the masked class a `text` column
 * cannot hold. The registry half: a rename whose key is recomputed
 * and whose old key is released, a colliding rename refused with its
 * SQLSTATE read apart from the reason this repository decided, an
 * alias refusing the delete of the subject it points at, and a
 * research stamp refused until an approval has landed. The passes
 * half: a page holding a domain-scoped run beside a domain-less
 * tick, a ledger cut at the cap with its whole count beside it, and
 * a spend summary bucketed at UTC under a session whose zone is not.
 * The gate half: an application refused until an approval has
 * landed, and one transaction writing the approval, both feed
 * columns and the closing stamp — or, when it fails halfway, none of
 * them.
 * Self-skips when AR_LIVE_DATABASE_URL is unset — run via:
 *
 *   bun run stress:start && bun run test:live && bun run stress:stop
 *
 * WHAT ONLY A SERVER CAN ANSWER is why this file is worth its
 * container, and it is not the rules. Every decision either surface
 * takes — the 404 for an unknown slug, the empty page for a category
 * key nobody declared, the 422 for an inverted window — is a
 * decision about rows, and `tests/helpers/memory-research-store.ts`
 * supplies rows with no database, so all of it is already pinned by
 * the service and routes suites under `src/findings/` and
 * `src/documents/`. What is left is the half those suites
 * structurally cannot reach: every operation below is SQL, and a
 * statement that is valid drizzle and invalid SQL passes `lint`,
 * `check-types` and the entire isolated suite. A projection naming a
 * column the migration never created, an `ORDER BY` that lost its
 * nulls qualifier, a `DISTINCT ON` reading the wrong row, a `->>`
 * against a member that is not text, a `WHERE` that stopped
 * narrowing — each is reported here and nowhere else.
 *
 * EVERY READING BELOW IS SOMETHING AN IN-MEMORY MAP CANNOT DO,
 * which is the same argument put sharply enough to be checkable.
 * The number is deliberately not quoted: it moves with every case
 * added, and a figure nobody re-derives reads as a claim.
 *
 * THE ORDER IS A REAL `ORDER BY` AND THE COMPARATOR IS A SECOND
 * DERIVATION OF IT. `findingOrder` in `src/findings/db-store.ts` is
 * `compareFindings` from `src/lib/digest-assemble.ts` expressed in
 * SQL, and the two are held against each other here by sorting the
 * rows the server answered with `orderFindings` and comparing the
 * lists. That is one rule checked from two sides rather than an
 * assertion against a page written out by hand — and only a server
 * can supply the first side, a library sorting objects being unable
 * to order a `LIMIT`ed read at all.
 *
 * AN ABSENT SCORE SORTS LAST AND NOT LOWEST, which is a `NULLS LAST`
 * on a descending key rather than a comparator branch. Postgres puts
 * nulls FIRST for `DESC` unless told otherwise, so the finding
 * nobody scored is the first row of a page whose store dropped that
 * qualifier — an inversion no type reports, that every isolated
 * suite is green through, and that puts an unranked finding at the
 * head of a ranking.
 *
 * THE TIEBREAKS ARE PLANTED SO THAT EACH KEY DISAGREES WITH THE ONE
 * BENEATH IT, without which a dropped key answers the right page for
 * the fixture's reasons rather than the store's. The two findings
 * scored alike and made at one instant are planted lower-id-first,
 * so the `id` key REVERSES the plant order; and the two scored alike
 * at different instants are planted newest-first, so the newer of
 * them carries the LOWER id and the `created_at` key answers one row
 * where the `id` key beneath it answers the other.
 *
 * THE SECOND DOMAIN MAKES EVERY READING A SCOPE READING TOO. Its one
 * finding is scored, stamped, filed and judged so that it sorts into
 * the MIDDLE of the subject domain's page under both orderings, sits
 * inside the window the boundary case takes, carries the category
 * key that case asks for, and holds the verdict the filter case
 * asks for. A `WHERE domain_id = $1` that stopped narrowing
 * therefore answers a row of the right shape in every one of them,
 * where a fixture with one domain is green either way.
 *
 * THE LATEST VERDICT IS A `DISTINCT ON` AND THE COMPARISON SITS
 * OUTSIDE IT. A finding ruled three ways in turn is matched by the
 * third and by neither of the first two, and the MIDDLE ruling is
 * what separates the two shapes a reader confuses: a subquery
 * pushing the verdict comparison inside answers the finding under
 * every verdict it ever carried, and one that lost its ordering
 * answers whichever row the scan reached. The finding ruled once is
 * the in-band positive control — the zero for the re-judged one
 * under its old verdict is read beside a non-empty page the same
 * call produced.
 *
 * THE RULING STAMP IS THE TRANSACTION'S AND THAT IS WHY `id` IS
 * BESIDE IT. `labelled_at` defaults to `now()`, which is the
 * transaction's start rather than the row's, so two rulings written
 * inside ONE transaction carry a single value between them and `id`
 * is the only thing separating them. This file plants that tie the
 * way a deployment makes it, and for a read whose whole answer is
 * the FIRST row it is the difference between a verdict and a coin
 * flip. No map can be made to produce it: two objects appended to a
 * list carry whatever clock the fake read, twice.
 *
 * `fields->>'category'` YIELDS TEXT, AND THE MEMBER THIS FILE PLANTS
 * AS A NUMBER IS WHAT SAYS SO. A store comparing only string members
 * answers an empty page where the server answers the row, because
 * `->>` renders a numeric member as its digits — so the finding
 * filed under the number is matched by the STRING of it. Two more
 * rows carry the two absences that read alike in JavaScript and both
 * come back SQL NULL here: one whose payload has no such member at
 * all, and one whose member holds the JSON null. Neither matches any
 * key a caller can name, which is a three-valued reading a map
 * comparing values has no third value to be wrong about.
 *
 * THE WINDOW IS HALF-OPEN AND BOTH ENDS ARE PLANTED ON. A finding
 * made at exactly the lower bound is IN and one made at exactly the
 * upper bound is OUT, so a store writing `<=` on the upper is
 * reported by the row it takes and a store writing `>` on the lower
 * by the row it drops. Both bounds are instants the fixture chose
 * rather than a clock's, and both carry a non-zero millisecond
 * component: a column at second resolution, or a store rounding on
 * the way through, moves a boundary row across the seam that two
 * adjacent windows share.
 *
 * A `text` COLUMN CANNOT HOLD U+0000 AND THE DRIVER CANNOT CARRY A
 * LONE SURROGATE, so two of the four classes `maskControlBytes` in
 * `src/http/control-bytes.ts` covers are UNREACHABLE through
 * `documents.body` and the other two are not. That is the reading
 * this half exists for and it is available nowhere else: the masker
 * is a pure function and its colocated suite hands it every class
 * directly, where what a stored body can actually carry is a fact
 * about the server and the wire between them. Measured rather than
 * assumed — a C0 control, DEL and a C1 control each round-trip
 * byte-identically and come back as escapes, a NUL is refused with
 * SQLSTATE 22021 before any row lands, and a lone surrogate is
 * stored as U+FFFD, replaced on the way out of this process rather
 * than refused. The scoped task this file was written for asked for
 * a body holding a raw NUL read back masked and cut; the nearest
 * true thing is the pair of cases below, and saying which of the two
 * was delivered is part of delivering it.
 *
 * THE CUT AND THE MASK ARE READ FROM BOTH SIDES OF ONE STORE. The
 * row as `DocumentStore.listDocuments` answers it is UNMASKED and
 * UNCUT, per that port, and the row `listDocuments` in
 * `src/documents/service.ts` answers is neither — so the same
 * planted body is read twice through one connection, and the zero
 * the second reading counts is about the value the first counted as
 * a one. An in-memory store can host neither end: it has no column
 * under its answer, and a fake that masked would agree with itself.
 *
 * THE THREE NUMBERS A CUT BODY CARRIES ARE DISTINCT HERE ON PURPOSE.
 * A body that is entirely ASCII makes the stored BYTES, the stored
 * CODE POINTS and the bytes of the KEPT text one number, and two of
 * the three wrong answers pass. The over-cap body is the at-cap body
 * plus a single two-byte character, so the three read one above the
 * other against a cap the fixture never transcribes — and the kept
 * text is the at-cap body ITSELF, which one comparison reads the
 * flag, the byte count and the retained text through. The at-cap
 * body carries a mark at each END, because a run of one repeated
 * character equals every slice of itself and a cap comparison that
 * slipped by one takes a character nothing can see going.
 *
 * THE CAP IS DERIVED AND NEVER TRANSCRIBED. Both bodies are built
 * from `BODY_CODE_POINT_CAP`, which is what exporting it is for: a
 * literal plant goes on reading as `past the cap` after the cap
 * moves above it, and the case then answers nothing while staying
 * green.
 *
 * A KEY IS RECOMPUTED AND NEVER SUBMITTED, and the index is what
 * makes that a reading rather than a member comparison.
 * `entities.name_norm` has no definition in the database at all —
 * nothing computes it, no CHECK reaches it, and a writer reducing a
 * name differently never fails, it silently misses. So what the
 * registry half reads is the reduction ARRIVING AT THE INDEX: the
 * rename releases the key the subject held, another subject takes
 * it, and a re-spelling of one subject moves the display without
 * moving the key it is matched on. A store comparing strings agrees
 * with every one of those and can report none of them.
 *
 * THE SQLSTATE IS THE SERVER'S AND THE REASON IS THIS REPOSITORY'S,
 * so the colliding rename reads them separately. `StoreRefusal`
 * carries what `classifyPgError` DECIDED and `cause.code` carries
 * what Postgres raised, so a classifier mapping the wrong code onto
 * the right reason answers one and fails the other. The constraint
 * NAME is a third reading and it is this repository's too — spelled
 * in `src/db/schema/entities.ts`, which makes asserting it a reading
 * of the migration rather than of the driver.
 *
 * THE UNIQUE KEY IS ON A PAIR, AND ONE REQUEST IS WHAT SAYS SO. The
 * same rename is issued twice: refused inside one registry, and
 * accepted from the other onto the key this one holds. Without the
 * second, an index over `name_norm` alone passes every assertion
 * about the refusal, and a fixture carrying one domain cannot tell a
 * per-domain key from a store refusing a name wherever it appears.
 *
 * TWO REFUSALS BELOW ARE RAISED BY STATEMENTS NO PORT ISSUES, which
 * is the read-first law met from the other side. Nothing here
 * deletes an entity and nothing writes `research_pool.researched_at`
 * — the entity port ratifies and never researches — so both arrive
 * as the driver error drizzle wrapped rather than as a
 * `StoreRefusal`, and each case reads the SQLSTATE off `cause`
 * instead of a reason somebody chose. That is also what says both
 * rules are the schema's: no module in this package can be edited to
 * stop either being raised.
 *
 * THE APPROVAL GATE IS PROVEN IN BOTH DIRECTIONS AND THE REFUSAL
 * COMES FIRST. `research_pool_approval_check` reads the two
 * timestamps and never the status, so a closing stamp on a row
 * nobody approved is refused, and the SAME stamp lands once the
 * ruling `POST /entities/:id/approve-research` gives has written
 * `approved_at`. Both tables are read back between the two and
 * before any accepting control issues a write of its own, which is
 * what says the refusal was a statement failing rather than a
 * session: every reading after it goes through that connection.
 *
 * `coalesce(approved_at, now())` IS THE SERVER'S CLOCK AND TWO CALLS
 * ARE TWO TRANSACTIONS, which is the whole of the idempotence and
 * something no map can be made to produce. A second ruling answers
 * the FIRST one's instant, and the control keeping that from being
 * green over a server stamping one constant is a third intention
 * ruled on afterwards carrying a later one.
 *
 * NO METHOD ON THESE PORTS WRITES A FINDING, A DOCUMENT, AN ENTITY
 * OR A RESEARCH PASS, which is the read-first law stated
 * structurally, so every fixture row below is planted through
 * drizzle directly. That is the plainest demonstration of the
 * containment there is, and it is the same reason
 * `tests/live/api-wave2.live.test.ts` reaches `documents` itself.
 * The exceptions are the three writes the three ports declare
 * between them — `insertFindingLabel`, `updateEntity` and
 * `approvePoolRow` — and the registry half drives the last two.
 *
 * EVERY CASE PLANTS EVERYTHING IT READS and `resetTables` in the
 * `beforeEach` empties the tables between them, so a row surviving
 * a case would make some later assertion true for a reason nobody
 * wrote. The first case reads that emptiness through the stores
 * rather than through SQL, so a table missing from the `TABLES`
 * roster in `./live-postgres.ts` — a fault that leaves `lint`,
 * `check-types` and the whole live run green while leaking rows —
 * is reported here too.
 *
 *
 * NINETEEN MUTATIONS WERE RUN AGAINST THE FIRST NINE CASES and
 * TWELVE MORE AGAINST THE FOUR REGISTRY ONES, each leg twice, every
 * leg collecting the whole file it was measured against and every
 * red set identical across the two passes; none reddened nothing.
 * Of the nineteen, twelve patch `src/findings/db-store.ts`, two
 * `src/documents/db-store.ts`
 * and three `src/documents/service.ts`. The twelve patch five
 * modules: six `src/entities/db-store.ts`, two
 * `src/entities/service.ts`, one `src/lib/entity-name-norm.ts`, two
 * `src/db/store-errors.ts` and one this file itself.
 *
 * THE NINETEEN FIGURES BELOW ARE QUOTED AS THEY WERE TAKEN, over the
 * NINE-case file rather than this one, and only three of them were
 * re-run at this tip: the findings scope leg, the score key losing
 * its `NULLS LAST`, and masking before cutting. All three held
 * member for member, so only the denominator moved — but a reader
 * comparing any other numerator against a run of thirteen is
 * comparing against a measurement nobody took. The figures are a
 * measurement over a case list and nothing else, so a task adding a
 * case here owes the legs its own cases can REACH rather than
 * inheriting any of them.
 *
 * EVERY ORDERING LEG IS TOLD APART BY THE ASSERTION IT FAILS rather
 * than by its count, which is the shape a page read whole produces.
 * Dropping `NULLS LAST` from the score key and reversing that key
 * each redden the digest case alone; dropping the `id` tiebreak and
 * ignoring the sort parameter each redden the digest case and the
 * recency one; and dropping the `created_at` key reddens those two
 * AND the window case, whose page is read in the recency order. Read
 * the SET and attribute each member to the claim it is about — the
 * third of those is not drift.
 *
 * THE TWO VERDICT LEGS ARE TWO DIFFERENT WRONG ANSWERS AND ONE CASE.
 * Pushing the comparison inside the `DISTINCT ON` answers the
 * re-judged finding under every verdict it ever carried, and
 * ordering that subquery ascending answers it under its first — each
 * reddening that one case, and the middle ruling is what separates
 * them from a store that is merely right.
 *
 * THE SCOPE LEG IS THE BLUNTEST IN THE GRID AND ITS SET IS THE
 * COVERAGE READING. Dropping the domain equality from the findings
 * predicate reddens five of thirteen: every case that reads a page,
 * leaving the empty-database case, the two documents cases and the
 * four registry ones, which is exactly the partition the second
 * domain was planted to produce. Re-run at this tip, where its five
 * are the same five. The corpus scope leg reddens one, there being
 * one documents case that plants a second domain at all.
 *
 * THE APPEND CASE IS PINNED BY THREE LEGS AND NO TWO OF THEM ARE THE
 * SAME CLAIM: deleting the row a repeat ruling would replace, having
 * the write answer an object rebuilt from its argument, and dropping
 * the `id` tiebreak from the ruling read. Each reddens that case
 * alone, and the third is what the transaction-made tie is for.
 *
 * THE DOCUMENTS HALF IS PINNED BY FIVE, all landing on the mask-and-
 * cut case: the corpus order, the corpus scope, masking BEFORE
 * cutting, counting the KEPT text as `bodyBytes`, and answering the
 * parse error unmasked. The pass-order leg is live only because that
 * case asserts `bodyTruncated` FALSE over a body with something to
 * mask — `maskControlBytes` is idempotent, so what a wrong order
 * moves is the flag and not the text.
 *
 * THE REGISTRY HALF IS PINNED BY TWELVE, of which NINE redden
 * exactly the case they are named for. The rename case: the
 * reduction answering its argument unchanged, and the service
 * handing the store the submitted spelling as the key. The collision
 * case: dropping `refusing` from the patch so the driver error
 * crosses raw, mapping 23505 onto a `check-violation`, and refusals
 * carrying no constraint name — the second of those being what says
 * the SQLSTATE and the reason are two readings rather than one. The
 * alias case: ignoring the `aliasOf` member of a patch. The approval
 * case: the ruling re-dating every approval, leaving the status
 * where it found it, and reading instead of writing.
 *
 * THE OTHER THREE LAND ON A PAIR OF CASES EACH AND ALL THREE ARE
 * WORTH THE PAIR. The store writing a patch's DISPLAY half into both
 * columns reddens the rename case AND the collision one, the second
 * because a key that is not the reduction stops colliding with
 * anything — the same fact read from its other side. A projection
 * answering an entity its OWN id as its registry reddens the two
 * cases that read a domain id, and it read ZERO until the rename
 * case was re-planted so that no row's id equals the id of the
 * domain carrying it, two sequences both restarting at one otherwise
 * agreeing. And this file's own `driverFields` reading the value it
 * caught rather than one link down reddens the two REGISTRY cases
 * whose refusal is a raw driver error, which is what says the
 * `cause` walk is load-bearing rather than decoration. It reaches a
 * third case now that the gate half is here, and the grid below
 * records the wider figure.
 *
 * TWENTY-ONE MORE WERE RUN AGAINST THE SIX PASSES-AND-GATE CASES,
 * each leg twice, every leg collecting the whole file it was
 * measured against and every red set identical across the two
 * passes. Thirteen patch `src/runs/db-store.ts`, two
 * `src/runs/service.ts`, five `src/sources/db-store.ts` and one this
 * file itself. Twenty reddened; the twenty-first is an honest zero
 * named below.
 *
 * FIFTEEN OF THEM REDDEN EXACTLY THE CASE THEY ARE NAMED FOR. The
 * page: the domain equality dropped, the same equality widened to
 * keep the tick, the `started_at` key dropped, and the `id` tiebreak
 * reversed. The ledger: its two ordering keys reversed one at a
 * time, and the run scope dropped from the page and from the count
 * separately — two methods, two legs, neither standing in for the
 * other. The summary: the day bucket taken at the session's zone
 * rather than at the named one, the join made INNER, a null sum
 * coerced to zero, the lower window bound dropped, and the domain
 * narrowing dropped. And two on the service: the truncation
 * comparison loosened to `>=`, and the answered length reported as
 * the whole count.
 *
 * THE OTHER FIVE LAND ON TWO CASES EACH OR ON THREE, and every one
 * of them is worth the spread. Issuing the three statements of
 * `approveAndApplyProposal` OUTSIDE a transaction reddens the apply
 * case AND the forced-failure one, which is the atomicity read from
 * both of its sides: without the transaction the two stamps stop
 * agreeing, and the approval statement 1 wrote survives the refusal
 * statement 2 raises. Reversing the queue's ordering and dropping
 * its status predicate reach the two cases that read the queue.
 * Leaving the contract unwritten by the apply reddens the apply case
 * and the second attempt the forced-failure one makes. And this
 * file's own `driverFields` leg now reddens THREE rather than the
 * two the registry paragraph above records, the added member being
 * the gate case beneath it — a carried-in leg gaining exactly the
 * new case that reads a raw driver refusal, which is predictable
 * rather than drift.
 *
 * THE HONEST ZERO IS THE APPROVAL STAMP'S IDEMPOTENCE, and it is
 * structural rather than a gap a case could close. Replacing
 * `coalesce(approved_at, now())` with a bare `now()` reddens
 * NOTHING here, because no row below is ruled on twice: the first
 * ruling has no earlier stamp to keep, and the instant a re-date
 * would write is the same transaction's `now()` either way. What
 * could close it is a row this surface refuses to produce —
 * applying twice is a `409` before the store is reached — so the
 * zero belongs to `RULING_ACTS` rather than to this file.
 *
 * WHAT NO LEG HERE REACHES, said rather than left to be inferred.
 * The refusal the NUL case reads is the SERVER's, so nothing in this
 * package can be edited to stop it being raised; the same is true of
 * the driver's surrogate replacement, of `documents_hash_unique`, of
 * the per-domain scope of `entities_domain_id_name_norm_unique`, of
 * `research_pool_approval_check`, of
 * `source_config_proposals_approval_check`, of `now()` being the
 * transaction's start rather than the statement's, of a `bigint`
 * sum arriving as text, of the fact that a refused
 * statement leaves both its tables as it found them, and of every
 * `ON DELETE` in the schema — the `alias_of` one this file now reads
 * included. Each is declared in a migration whose breakage fails
 * `applyMigrations` and takes the whole file down rather than
 * reddening a case.
 *
 * A NULL DOMAIN IS EXCLUDED BY THE COMPARISON AND NOT BY A BRANCH,
 * which is three-valued logic rather than a rule this package
 * keeps. `domain_id = $1` is UNKNOWN on a maintenance tick, so the
 * tick is out of one domain's page for the same reason it is out of
 * any other's — and it is IN the unfiltered one, which is the pair
 * that says the widening is an absent predicate rather than a
 * second query. A store holding rows in a map decides both of those
 * with an `if`, so neither is a reading there.
 *
 * TWO PASSES OPENED BY ONE TICK TIE TO THE MICROSECOND, because
 * `started_at` defaults to `now()` and `now()` is the TRANSACTION's
 * start rather than the statement's. The pair below is planted the
 * way a deployment makes it — two inserts inside one transaction,
 * no stamp written by the fixture — and `id` is the only thing
 * separating them afterwards. For a page with a boundary in it that
 * is the difference between a row shown once and a row shown twice.
 *
 * THE LEDGER CUT IS READ BY MEMBERSHIP AND THE CAP IS NEVER
 * TRANSCRIBED. The long pass carries `RUN_LEDGER_CAP` calls plus an
 * overshoot, planted with ascending stamps so the ids ascend with
 * them — the newest rows are then also the highest ids and which
 * END the cut took is readable rather than inferred. A literal plant
 * would go on reading as `past the cap` after the cap moved above
 * it, answering nothing while staying green.
 *
 * THE TRUNCATION FLAG IS A COMPARISON AND IT IS LIVE ONLY WHERE THE
 * TWO NUMBERS ARE EQUAL, so the short pass and the silent one are
 * what pin it. `llmCallCount > ledger.length` and `>=` answer alike
 * for the pass that overflowed and differently for the two that did
 * not, which is why a case reading only the long ledger leaves the
 * operator itself covered by nothing.
 *
 * A CALL NAMING NO PASS IS UNREACHABLE FROM A SCOPED READ, whatever
 * id is asked for, `run_id = $1` being UNKNOWN on it — and the same
 * row IS counted by the spend summary, which is the one method that
 * sees it. Both halves are planted here, on both sides of the cut:
 * the short pass's calls are stamped NEWER than every row of the
 * long one, so an unscoped page would answer them at its head, and
 * the unattributed call is stamped OLDER than all of them, so an
 * unscoped COUNT is what reports it.
 *
 * THE DAY BUCKET IS `date_trunc` IN ITS THREE-ARGUMENT FORM AND THE
 * ZONE IS NAMED, which is unreadable under a session already at
 * UTC. So the spend case opens a connection of its own, moves its
 * `TimeZone` to a zone that is not UTC, and takes every reading
 * there. Two calls a millisecond either side of a UTC midnight land
 * in TWO buckets under the named zone and in ONE under the
 * session's, and the case counts both truncations over its own
 * planted rows in the same connection — so the answer is held
 * against what this server would otherwise have said rather than
 * against a sentence.
 *
 * `Pool.totalCount` AT ONE IS WHAT MAKES THAT A MEASUREMENT. A
 * session setting is per CONNECTION, so a pool that opened a second
 * one would answer half the case at UTC while every assertion still
 * read plausibly. The pool is ended in a `finally`, which is also
 * the whole of the cleanup: the zone dies with the connection and
 * nothing here touches a shared session.
 *
 * A SUM ARRIVES AS TEXT AND A SUM OVER NOTHING MEASURED STAYS NULL.
 * `sum(integer)` is `bigint` in Postgres and the driver hands a
 * bigint back as a STRING, where `count()` arrives a number — so
 * the store owes a conversion behind one and none behind the other,
 * and `Number('')` and `Number(null)` are both `0`, which is what a
 * bare coercion would answer for a bucket in which nothing was
 * measured. One planted call carries neither magnitude and one
 * whole bucket is made of such calls, so the counted call and the
 * null total are read side by side.
 *
 * THE JOIN IS LEFT AND THE PARTITION IS WHAT SAYS SO. The calls of
 * a domain-less tick and the calls attributed to no pass at all
 * both land in the null bucket, and an INNER join would drop only
 * the second while every bucket it did answer stayed right. No
 * per-bucket assertion can report that; the narrowed summaries
 * adding up to the unnarrowed one can, and does.
 *
 * `source_config_proposals_approval_check` IS PROVEN IN BOTH
 * DIRECTIONS AND THE REFUSAL COMES FIRST, the shape the other
 * gate's case one file-half up already takes. A closing stamp on a
 * row nobody approved is refused by the server, and the SAME stamp
 * lands once an approval has been written — written the way
 * `scripts/approve.ts` writes it, an approval without an
 * application being the state that CLI leaves behind. Neither write
 * is a port's: nothing on `SourceStore` stamps either column alone,
 * so both arrive as the driver error drizzle wrapped and the case
 * reads the SQLSTATE off `cause`.
 *
 * THE CHECK READS THE TWO STAMPS AND THE QUEUE READS THE STATUS,
 * and the row that says so carries an approval with its status
 * still `pending`. It is storable, the CLI makes it, and it is
 * still in the queue afterwards — so the two rules are about
 * different columns rather than two readings of one gate.
 *
 * ONE TRANSACTION IS READABLE FROM THE TWO STAMPS IT WROTE. `now()`
 * is the transaction's start, so the approval and the application
 * stamped by statements 1 and 3 of `approveAndApplyProposal` carry
 * the IDENTICAL instant — which is the only evidence anywhere that
 * the three statements were one transaction rather than three
 * calls. The control that keeps it from being green over a server
 * stamping one constant is a second proposal ruled on afterwards,
 * whose own pair is later than the first's.
 *
 * THE TWO DOCUMENTS COME BACK AS THE COLUMN HOLDS THEM AND NOT AS
 * THE FIXTURE WROTE THEM. jsonb normalises key order, so the
 * arrangement this file plants is answered with its members in a
 * different order while being the same value — and the source row
 * afterwards carries THAT spelling. A comparison of the two
 * renderings is what says the documents travelled through the
 * server, where a member-by-member equality is equally green over
 * an applier that copied the fixture's own object across.
 *
 * THE FORCED FAILURE IS A TEMP TABLE SHADOWING `sources` ON ONE
 * DEDICATED CONNECTION, which is the only way to read the
 * atomicity: every refusal the real schema can raise is out of that
 * transaction's reach by construction, per the port. The shadow
 * carries a COPY of the row and a CHECK refusing the write, so
 * statement 1 lands on the REAL proposal, statement 2 is refused by
 * the server, and the rollback takes the approval with it. What is
 * read afterwards is that the proposal is unruled again and both
 * source rows are as they were — the state the request can be made
 * from a second time, which is what the port claims and nothing
 * else here can check. The shadow dies with the pool: the temp
 * schema leads the search path, so no statement of this file's
 * outside that case can see it and nothing is left behind.
 *
 * THE HELPERS THROW RATHER THAN ASSERT, on the terms the sibling
 * live files state: a fixture that answered nothing leaves every
 * assertion below it about nothing, and a failure raised by a helper
 * names the read that raised it. That does not extend to a case's
 * own assertion failures and nothing here re-wraps one.
 */
import type { DocumentStore } from '../../src/documents/store.js';
import type { DomainRecord, DomainStore } from '../../src/domains/store.js';
import type {
  EntityRecord,
  EntityStore,
  ResearchPoolRecord,
} from '../../src/entities/store.js';
import type {
  FindingFilter,
  FindingRecord,
  FindingStore,
} from '../../src/findings/store.js';
import type { StoreWindow, TimeWindow } from '../../src/http/schemas.js';
import type {
  RunRecord,
  RunStore,
  SpendBucket,
} from '../../src/runs/store.js';
import type {
  SourceConfigProposalRecord,
  SourceRecord,
  SourceStore,
} from '../../src/sources/store.js';
import type { Pool } from 'pg';

import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import {
  documents,
  entities,
  findingLabels,
  findings,
  llmCalls,
  researchPool,
  runs,
  sourceConfigProposals,
} from '../../src/db/schema.js';
import { StoreRefusal } from '../../src/db/store-errors.js';
import { createDbDocumentStore } from '../../src/documents/db-store.js';
import { listDocuments } from '../../src/documents/service.js';
import { createDbDomainStore } from '../../src/domains/index.js';
import { createDbEntityStore } from '../../src/entities/db-store.js';
import {
  approveEntityResearch,
  patchEntity,
} from '../../src/entities/service.js';
import { createDbFindingStore } from '../../src/findings/db-store.js';
import {
  BODY_CODE_POINT_CAP,
  maskControlBytes,
} from '../../src/http/control-bytes.js';
import { orderFindings } from '../../src/lib/digest-assemble.js';
import { normalizeEntityName } from '../../src/lib/entity-name-norm.js';
import { createDbRunStore } from '../../src/runs/db-store.js';
import {
  RUN_LEDGER_CAP,
  getRun,
  listRuns,
} from '../../src/runs/service.js';
import { summariseSpend } from '../../src/runs/spend-service.js';
import { createDbSourceStore } from '../../src/sources/db-store.js';
import {
  approveSourceConfig,
  listPendingConfigs,
} from '../../src/sources/proposals-service.js';

import {
  applyMigrations,
  createLiveDb,
  createLivePool,
  describeLivePg,
  resetTables,
} from './live-postgres.js';

/**
 * The slug the subject domain sits under.
 *
 * `example-tech-radar` is the seeded worked example, so this fixture
 * stays in the register `data/domains.json` set: neutral about the
 * subject, and recognisable as an example rather than as anybody's
 * deployment. The two sibling live API files plant under the same
 * slug and the three never meet — every case in all of them
 * truncates first.
 */
const RADAR = 'example-tech-radar';

/** Its operator-facing label. */
const RADAR_NAME = 'Radar';

/**
 * The slug the SCOPE control sits under.
 *
 * Every reading below is taken over {@link RADAR} while this domain
 * holds one finding and one document arranged to be answered by any
 * statement that stopped narrowing.
 */
const TRANSIT = 'example-urban-transit';

/** Its operator-facing label. */
const TRANSIT_NAME = 'Transit';

/**
 * A window wide enough to hold every collection this file plants.
 *
 * The ordering cases want the WHOLE page, an order being unreadable
 * through a window narrower than the rows it ranks. What a `LIMIT`
 * and an `OFFSET` that stopped working cost is pinned one file over,
 * on collections planted for it.
 */
const WHOLE: StoreWindow = { limit: 50, offset: 0 };

/**
 * The window that names no bound at all.
 *
 * `{ sinceInclusive: null, untilExclusive: null }` rather than an
 * omitted member, per {@link FindingFilter}: the member is required
 * and `null` is what unbounded is spelled as, so a store branching
 * on `!== null` has two states rather than three.
 */
const UNBOUNDED: TimeWindow = {
  sinceInclusive: null,
  untilExclusive: null,
};

/**
 * An instant `seconds` into the minute every finding is stamped in.
 *
 * Built with `Date.UTC` and NEVER by parsing a stamp, so no
 * expectation here is derived through the same reader the store
 * uses. The month argument is zero-based, so `8` is September.
 *
 * THE MILLISECOND COMPONENT IS NON-ZERO ON PURPOSE. A column at
 * second resolution, or a store rounding on the way through, answers
 * these instants with that component gone — and a boundary row then
 * crosses the seam two adjacent windows share while every other
 * assertion still reads correct.
 *
 * @param seconds - Where in the minute to sit.
 * @returns The instant.
 */
function at(seconds: number): Date {
  return new Date(Date.UTC(2026, 8, 1, 12, 0, seconds, 457));
}

/** The instant the newer of the two findings scored alike has. */
const LATE = at(40);

/** The instant the two findings scored alike at one moment carry. */
const MIDDLE = at(30);

/** The instant the unscored finding has, and the window floor. */
const EARLY = at(20);

/** The instant the oldest finding has, below that floor. */
const EARLIEST = at(10);

/** The scope control instant: inside every window here. */
const OTHER_AT = at(35);

/** The higher of the two scores this domain findings carry. */
const HIGH_SCORE = 0.9;

/** The lower, carried by two findings at different instants. */
const LOW_SCORE = 0.5;

/** The scope control's score, between the two above under either. */
const OTHER_SCORE = 0.7;

/** The category key two findings are filed under, one per domain. */
const MODELS = 'models';

/** The key exactly one finding of that domain is filed under. */
const INFRA = 'infra';

/**
 * A category member stored as a NUMBER rather than as a string.
 *
 * `fields->>'category'` yields TEXT, so this member is matched by
 * the STRING of it and a store comparing only string members answers
 * an empty page where the server answers the row.
 */
const NUMERIC_CATEGORY = 4;

/** That member as `->>` renders it, and as the filter is sent it. */
const NUMERIC_KEY = String(NUMERIC_CATEGORY);

/** A category key no finding here is filed under. */
const UNDECLARED = 'governance';

/** The first ruling the re-judged finding carried. */
const FIRST_VERDICT = 'interested';

/** The second, which no filter must answer that finding under. */
const MIDDLE_VERDICT = 'caution';

/** The third, and the one in force. */
const LATEST_VERDICT = 'avoid';

/** A member of the default vocabulary no ruling here carries. */
const UNUSED_VERDICT = 'neutral';

/** What the first ruling of the append case records. */
const FIRST_NOTE = 'read it as a launch';

/** What the second records, the verdict being unchanged. */
const SECOND_NOTE = 'and the launch slipped';

/** Builds one character from its code point. */
const charFrom = String.fromCharCode;

/**
 * A C0 control other than NUL, planted inside a stored body.
 *
 * BUILT FROM ITS CODE POINT rather than written as a literal,
 * because a control character in a tracked source file makes
 * `git diff` render the file as binary and makes POSIX grep report
 * no match for text that is present — both silently, and both the
 * exact failure `gate:control-bytes` exists to keep out of the tree.
 */
const BELL = charFrom(0x07);

/** DEL, which is masked and is neither C0 nor C1. */
const DEL = charFrom(0x7f);

/** A C1 control: TWO UTF-8 bytes where the others are one. */
const NEL = charFrom(0x85);

/**
 * U+0000, the one member of the masked class a `text` column
 * refuses.
 *
 * Never reaches a row: the insert planting it is refused by the
 * server, which is what the case below reads.
 */
const NUL = charFrom(0x00);

/** A lone high surrogate: the driver replaces it on the way out. */
const LONE_SURROGATE = charFrom(0xd800);

/** What a lone surrogate is stored as, having been replaced. */
const REPLACEMENT = charFrom(0xfffd);

/**
 * A two-byte character, and the whole of the over-cap body's
 * overshoot.
 *
 * ONE UTF-16 UNIT AND TWO UTF-8 BYTES, which is what makes the three
 * numbers a cut body carries distinct without an astral fixture and
 * without any surrogate arithmetic: the stored bytes exceed the
 * stored code points, which exceed the code points kept.
 */
const TWO_BYTE = charFrom(0x00e9);

/** The mark the at-cap body opens with. */
const BODY_HEAD = 'S';

/** The mark it closes with, so a cut of one character is visible. */
const BODY_TAIL = 'E';

/** The filler between them. */
const BODY_FILL = 'x';

/**
 * A body of exactly {@link BODY_CODE_POINT_CAP} code points, marked
 * at both ends.
 *
 * DERIVED FROM THE CAP AND NEVER TRANSCRIBED, which is what
 * exporting that constant is for: a literal plant goes on reading as
 * an at-cap body after the cap moves, and the case then answers
 * nothing while staying green.
 *
 * The marks are what a run of one repeated character cannot supply.
 * Such a run equals every slice of itself, so a comparison that
 * slipped by one takes a character nothing can see going.
 */
const AT_CAP_BODY = BODY_HEAD
  + BODY_FILL.repeat(BODY_CODE_POINT_CAP - 2)
  + BODY_TAIL;

/**
 * The at-cap body plus one code point, which the cut must answer as
 * the at-cap body ITSELF.
 *
 * One comparison then reads the flag, the retained text and the byte
 * count through a single equality, where two separately built
 * fixtures only ever read lengths.
 */
const OVER_CAP_BODY = AT_CAP_BODY + TWO_BYTE;

/** A short body carrying one control byte of each stored class. */
const MARKED_BODY = 'A' + BELL + DEL + NEL + 'Z';

/** What a writer recorded about the capture that would not parse. */
const MARKED_ERROR = 'gave up at' + BELL + 'the head';

/**
 * The SQLSTATE Postgres raises for a byte no encoding can carry.
 *
 * `character_not_in_repertoire`, and NOT one of the three
 * `classifyPgError` in `src/db/store-errors.ts` maps — so this
 * refusal crosses as the driver error drizzle wrapped rather than as
 * a `StoreRefusal`, which is what the case reads it off.
 */
const ENCODING_VIOLATION = '22021';

/** The parse status a capture that read cleanly carries. */
const PARSED = 'ok';

/** The parse status a capture that did not carries. */
const UNPARSED = 'failed';

/**
 * The subject the registry cases plant, as its writer spelled it.
 *
 * THE DISPLAY HALF KEEPS WHAT THE SOURCE WROTE, which is what makes
 * the key below visibly not the lowercase of it: a hyphen is
 * neither a letter, a digit nor a mark, so the reduction turns it
 * into the one separator every run of such characters becomes.
 */
const FIRST_SPELLING = 'Vector-DB';

/**
 * A second spelling of the same subject, arriving later.
 *
 * One subject spelled two ways landing on one row is what the
 * registry is for, and both of these reduce to {@link FIRST_KEY}.
 */
const SECOND_SPELLING = 'vector  db';

/**
 * What both of those reduce to, WRITTEN OUT rather than derived.
 *
 * The expectation is a literal this file chose, and the library
 * agreeing with it is a second reading taken inside the case rather
 * than the only one: an expectation computed through the function
 * under test agrees with a reduction that is wrong in exactly the
 * same way.
 */
const FIRST_KEY = 'vector db';

/** What the rename case renames that subject to. */
const RENAMED = 'Feature Store';

/** A rival subject of the same registry, spelled its own way. */
const RIVAL_SPELLING = 'feature-store';

/** The key {@link RENAMED} and the rival both reduce to. */
const RENAMED_KEY = 'feature store';

/** The subject an alias points at, and the delete case deletes. */
const TARGET_NAME = 'Ranking Model';

/** Its key. */
const TARGET_KEY = 'ranking model';

/** The placeholder that turned out to be the subject above. */
const PLACEHOLDER_NAME = 'the model (unnamed)';

/** Its key: each run of brackets and spaces is one separator. */
const PLACEHOLDER_KEY = 'the model unnamed';

/** A subject nothing points at, and the accepting control. */
const LOOSE_NAME = 'Retired Subject';

/** Its key. */
const LOOSE_KEY = 'retired subject';

/** The subject the placeholder is re-pointed at before the drop. */
const SUCCESSOR_NAME = 'Ranking Model v2';

/** Its key. */
const SUCCESSOR_KEY = 'ranking model v2';

/**
 * The terms an operator read before agreeing to a search.
 *
 * Stored when the intention is raised rather than composed when it
 * is acted on, per `research_pool.search_terms`: approval is given
 * to these strings, so what is planted is what was consented to.
 */
const POOL_TERMS = ['vector database', 'ann index'];

/** The instant the refused and the accepted stamp both name. */
const RESEARCHED_AT = at(45);

/** The status every intention is raised under. */
const PENDING_STATUS = 'pending';

/** The status a ruling in favour writes. */
const APPROVED_STATUS = 'approved';

/**
 * The unique key on `(entities.domain_id, entities.name_norm)`.
 *
 * Spelled in `src/db/schema/entities.ts`, so asserting it is a
 * reading of the migration rather than of the driver: a name
 * Postgres derived for itself would not be greppable here at all.
 */
const ENTITY_NAME_KEY = 'entities_domain_id_name_norm_unique';

/** The self-referencing foreign key `alias_of` emits. */
const ENTITY_ALIAS_FK = 'entities_alias_of_entities_id_fk';

/** The CHECK holding a research stamp against an approval. */
const POOL_APPROVAL_CHECK = 'research_pool_approval_check';

/**
 * The SQLSTATE a `unique_violation` arrives with.
 *
 * Read off the driver error the refusal kept on `cause` rather than
 * off the refusal itself, and that split is the point:
 * `StoreRefusal.reason` is what `classifyPgError` DECIDED, and this
 * is what the server raised. `src/db/store-errors.ts` maps the two,
 * and a mapping gone wrong answers the right reason from the wrong
 * code.
 */
const UNIQUE_VIOLATION = '23505';

/** The SQLSTATE a `foreign_key_violation` arrives with. */
const FOREIGN_KEY_VIOLATION = '23503';

/** The SQLSTATE a `check_violation` arrives with. */
const CHECK_VIOLATION = '23514';

/**
 * How every pass this file opens says it was scheduled.
 *
 * A `RUN_SCHEDULERS` member, and the column carries a CHECK
 * generated from that tuple — so a value a reader invents is
 * refused by the server before any assertion below it runs.
 */
const SCHEDULED_BY = 'interval';

/** How every pass this file opens ended. */
const RUN_STATUS = 'ok';

/** The node the call just below a UTC midnight was made from. */
const BEFORE_NODE = 'fetch';

/** The node the call exactly at that midnight was made from. */
const AFTER_NODE = 'reduce';

/** The node every other call in the spend half was made from. */
const OTHER_NODE = 'judge';

/** The node the long pass ledgers every one of its calls under. */
const LEDGER_NODE = 'summarise';

/**
 * Midnight UTC opening the first day the spend window spans, and
 * the window's own inclusive lower bound.
 *
 * Built with `Date.UTC` and NEVER by parsing a stamp, on the terms
 * {@link at} states: an expectation derived through the reader
 * under test agrees with a reader that is wrong in the same way.
 */
const DAY_ONE = new Date(Date.UTC(2026, 8, 1));

/** Midnight UTC opening the second day, and one call's instant. */
const DAY_TWO = new Date(Date.UTC(2026, 8, 2));

/** Midnight UTC opening the third: the window's EXCLUSIVE upper. */
const DAY_THREE = new Date(Date.UTC(2026, 8, 3));

/**
 * One millisecond below {@link DAY_TWO}.
 *
 * THE TWO INSTANTS ARE ONE MILLISECOND APART AND ON DIFFERENT UTC
 * DAYS, which is what makes the bucket a reading about the
 * truncation rather than about the span: nothing but a day boundary
 * separates them.
 */
const BEFORE_MIDNIGHT = new Date(DAY_TWO.getTime() - 1);

/**
 * A later instant on the SAME UTC day as {@link DAY_TWO}.
 *
 * The row that separates a truncation from a grouping by the raw
 * instant: it joins that midnight's bucket rather than opening one.
 */
const LATER_ON_DAY_TWO = new Date(Date.UTC(2026, 8, 2, 11, 22, 33, 444));

/** An instant below the window, so the narrowing has one to drop. */
const BELOW_WINDOW = new Date(Date.UTC(2026, 7, 31, 12, 0, 0, 0));

/**
 * A session `TimeZone` that is NOT UTC.
 *
 * The spend half reads everything under this, because
 * `date_trunc('day', ts, 'UTC')` and `date_trunc('day', ts)` answer
 * ALIKE on a session already at UTC — so a store that named no zone
 * would be green through every assertion there.
 */
const SESSION_ZONE = 'America/Sao_Paulo';

/** How many calls past the cap the long pass carries. */
const LEDGER_OVERSHOOT = 3;

/** What every call of the long pass measured, in characters. */
const LEDGER_CHARS = 10;

/** And in tokens, which is arithmetic over the characters. */
const LEDGER_TOKENS = 3;

/** What the call below the midnight measured. */
const BEFORE_CHARS = 100;

/** And in tokens. */
const BEFORE_TOKENS = 25;

/** What the call at the midnight measured. */
const AFTER_CHARS = 200;

/** And in tokens. */
const AFTER_TOKENS = 50;

/** What the domain-less tick's one call measured. */
const TICK_CHARS = 7;

/** And in tokens. */
const TICK_TOKENS = 1;

/** What the call attributed to no pass at all measured. */
const UNATTRIBUTED_CHARS = 3;

/** And in tokens. */
const UNATTRIBUTED_TOKENS = 1;

/** The transport family every feed below is read through. */
const FEED_KIND = 'rss';

/** Where the feed the proposals are about says its payload is. */
const FEED_ENDPOINT = 'https://feeds.example.com/radar.xml';

/** A second feed, so a queue that stopped scoping is reported. */
const OTHER_ENDPOINT = 'https://feeds.example.com/transit.xml';

/**
 * The arrangement a proposal offers, as its writer wrote it.
 *
 * VALID UNDER `parserConfigErrors` in `src/lib/parser-config.ts`,
 * which nothing on this path consults — the approval is the gate
 * and neither the port nor the applier is a second one. It is
 * written valid anyway so that no case here rests on a fixture that
 * would have been rejected upstream.
 *
 * ITS MEMBERS ARE IN AN ORDER jsonb DOES NOT KEEP, which is what
 * makes the read-back a reading: the column answers its keys
 * normalised, so the rendering that comes off the source row is not
 * the rendering of this object.
 */
const PROPOSED_CONFIG = {
  fields: {
    title: { selector: 'h1' },
    body: { selector: 'article' },
  },
  recordsPath: 'items',
};

/** The test that says the arrangement above still holds. */
const PROPOSED_CONTRACT = { mustMatch: ['title'], sample: 3 };

/** What proposed the row the gate case rules on. */
const FIRST_PROPOSER = 'radar-config-model';

/** What proposed the row beside it. */
const SECOND_PROPOSER = 'radar-config-review';

/** What proposed the row that stays in the queue. */
const THIRD_PROPOSER = 'radar-config-fallback';

/**
 * The CHECK holding an application against an approval.
 *
 * Spelled in `src/db/schema/sources.ts`, so asserting it is a
 * reading of the migration rather than of the driver.
 */
const PROPOSAL_APPROVAL_CHECK = 'source_config_proposals_approval_check';

/**
 * The CHECK a temp shadow of `sources` carries, and nothing else
 * in this deployment does.
 *
 * Named rather than anonymous so the refusal below can be attributed
 * to the shadow: a constraint name the real schema does not carry is
 * what says the statement met the copy and not the table.
 */
const SHADOW_CHECK = 'wave3_shadow_refuses_apply';

/** The node the call below the spend window was made from. */
const OUTSIDE_NODE = 'backfill';

/**
 * What that call measured, distinct from every other magnitude
 * here so a bucket carrying it would be visible in the totals.
 */
const OUTSIDE_CHARS = 900;

/** And in tokens. */
const OUTSIDE_TOKENS = 225;

/** What proposed the arrangement for the second feed. */
const OUTSIDE_PROPOSER = 'transit-config-model';

/** When a terminal operator ruled in favour, in the CLI's shape. */
const AGREED_AT = at(50);

/** When the arrangement was recorded as written onto the feed. */
const WRITTEN_AT = at(55);

/**
 * The value a live read was supposed to answer.
 *
 * @param value - Whatever the read answered.
 * @param read - What was being read, quoted back in the refusal.
 * @returns The value, without the `null` the port declares.
 * @throws Error When the read answered null.
 */
function present<T>(value: T | null, read: string): T {
  if (value === null) {
    throw new Error(
      `[wave3-live] reading ${read} answered null, so every assertion `
      + 'below it would be about nothing.',
    );
  }

  return value;
}

/**
 * The first row of a read, without the `undefined`
 * `noUncheckedIndexedAccess` gives an index access.
 *
 * @param rows - Whatever the read answered.
 * @param read - What was being read, quoted back in the refusal.
 * @returns Its first row.
 * @throws Error When the read answered no row at all.
 */
function oneRow<T>(rows: readonly T[], read: string): T {
  const [row] = rows;

  if (row === undefined) {
    throw new Error(
      `[wave3-live] reading ${read} answered no row, so every `
      + 'assertion below it would be about nothing.',
    );
  }

  return row;
}

/**
 * The ids of a page, in the order it answered them.
 *
 * @param rows - The page.
 * @returns Its ids, order preserved.
 */
function idsOf(
  rows: readonly { readonly id: number }[],
): readonly number[] {
  return rows.map((row) => row.id);
}

/**
 * How many calls a spend summary counted altogether.
 *
 * @param buckets - Whatever the summary answered.
 * @returns The sum of their `calls`.
 */
function callsIn(buckets: readonly SpendBucket[]): number {
  return buckets.reduce((total, bucket) => total + bucket.calls, 0);
}

/**
 * How many times a needle occurs in some text.
 *
 * A count rather than a boolean, so a zero can be read beside a
 * known positive taken by the same function in the same case.
 *
 * @param haystack - The text to search.
 * @param needle - The string to count.
 * @returns The number of occurrences.
 */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * The fields a pg `DatabaseError` carries that a case here reads.
 *
 * Every one is optional and `unknown`, because the value being read
 * is whatever a driver put on a `cause` rather than something this
 * package built. Declared once, so the three cases reading a raw
 * refusal do not each spell a view of their own.
 */
interface DriverFields {
  /** The five-character SQLSTATE, as a STRING and never a number. */
  readonly code?: unknown;

  /** The constraint the mechanism named, where it named one. */
  readonly constraint?: unknown;

  /**
   * The sentence the server wrote about the row, which carries the
   * submitted values verbatim.
   *
   * The in-band positive control every containment zero here is
   * read beside: a needle counted once in this and zero times in
   * what a caller sees is a zero about a value that genuinely
   * reached the server.
   */
  readonly detail?: unknown;
}

/**
 * The refusal a live write through a port was supposed to raise.
 *
 * Throws on both of the shapes that are not one. A call that
 * ANSWERED leaves every assertion below it about a refusal nobody
 * built, and a thrown value that is not a `StoreRefusal` is the one
 * thing every implementation of these ports promises never to raise
 * — so rethrowing it here is what says a driver error crossed the
 * port translated rather than raw.
 *
 * @param run - The call expected to be refused.
 * @returns The refusal it raised.
 * @throws Error When the call answered instead.
 */
async function refusalFrom(
  run: () => Promise<unknown>,
): Promise<StoreRefusal> {
  try {
    await run();
  } catch (err) {
    if (err instanceof StoreRefusal) {
      return err;
    }

    throw err;
  }

  throw new Error(
    '[wave3-live] expected a StoreRefusal and the call answered, so '
    + 'the refusal asserted below was never raised at all.',
  );
}

/**
 * The raise a statement NO PORT ISSUES was supposed to make.
 *
 * The counterpart of {@link refusalFrom} for a write this package
 * has no port for at all — a document insert, a delete of an
 * entity, a research stamp. Nothing translates such a statement, so
 * what arrives is the driver error drizzle wrapped and a case reads
 * its SQLSTATE off `cause` rather than reading a reason somebody
 * chose.
 *
 * @param run - The statement expected to be refused.
 * @param what - What was being written, quoted back in the refusal.
 * @returns Whatever it raised, still untyped.
 * @throws Error When the statement was accepted instead.
 */
async function raisedBy(
  run: () => Promise<unknown>,
  what: string,
): Promise<unknown> {
  try {
    await run();
  } catch (err) {
    return err;
  }

  throw new Error(
    `[wave3-live] ${what} was accepted, so the refusal asserted `
    + 'below was never raised at all.',
  );
}

/**
 * The driver fields under whatever a raise wrapped.
 *
 * One link down, which is where drizzle puts the pg error: the
 * wrapper it throws carries no `code` of its own, so a case reading
 * the value it caught would answer `undefined` for every refusal a
 * drizzle statement can produce.
 *
 * @param raised - Whatever {@link raisedBy} answered.
 * @returns The wrapped error, read through {@link DriverFields}.
 */
function driverFields(raised: unknown): DriverFields {
  return (raised as { cause?: unknown }).cause as DriverFields;
}

/**
 * The five findings the subject domain carries, and the one the
 * scope control does.
 *
 * Named rather than inlined so the plant helper has a return type
 * the cases can be held against.
 */
interface PlantedFindings {
  /** The subject domain. */
  readonly domain: DomainRecord;

  /** The scope control, whose one finding sorts into the middle. */
  readonly other: DomainRecord;

  /** Scored low, made LAST, and filed under `models`. */
  readonly late: FindingRecord;

  /** Scored high at the shared instant, planted BEFORE its twin. */
  readonly high: FindingRecord;

  /** Scored by nobody, which sorts it last rather than first. */
  readonly unscored: FindingRecord;

  /** Scored high at the same instant, planted AFTER `high`. */
  readonly twin: FindingRecord;

  /** Scored low, made FIRST, and carrying no category member. */
  readonly earliest: FindingRecord;

  /** The scope control's one finding, under the other domain. */
  readonly outside: FindingRecord;
}

describeLivePg('wave-3 stores (live Postgres)', () => {
  let pool: Pool;
  let db: ReturnType<typeof createLiveDb>;

  // All four stores are built before the pool exists, which is the
  // ordering the thunk in each of them is there for: `src/index.ts`
  // builds these same stores while `createService` is still
  // registering, and that is before the Postgres dependency has
  // started. Constructing them here touches nothing — a store that
  // resolved `db` eagerly would capture an undefined and fail every
  // case in this file, which is this run's reading of that claim.
  //
  // `createDbDomainStore` comes through `src/domains/index.js` and
  // not through the module declaring it, which is the containment
  // that barrel states about itself. Neither wave-3 group carries a
  // barrel, so those two constructors are deep imports.
  const domainStore: DomainStore = createDbDomainStore(() => db);
  const findingStore: FindingStore = createDbFindingStore(() => db);
  const documentStore: DocumentStore = createDbDocumentStore(() => db);
  const entityStore: EntityStore = createDbEntityStore(() => db);
  const runStore: RunStore = createDbRunStore(() => db);
  const sourceStore: SourceStore = createDbSourceStore(() => db);

  // What `src/documents/service.ts` takes: one `DomainStore` method
  // and the two `DocumentStore` reads. Spread rather than wrapped,
  // no two ports in this package declaring a method under the same
  // name, and built over the SAME two stores the raw reads go
  // through — which is what makes the masked answer and the stored
  // row two readings of one connection rather than of two fixtures.
  const corpusStore = { ...domainStore, ...documentStore };

  // What `src/runs/service.ts` and `src/runs/spend-service.ts` take
  // between them: one `DomainStore` method and all six `RunStore`
  // reads. One object for both, no two ports here declaring a
  // method under the same name, so the page, the ledger and the
  // summary are three readings of one connection.
  const passStore = { ...domainStore, ...runStore };

  beforeAll(async () => {
    pool = createLivePool();
    await applyMigrations(pool);
    db = createLiveDb(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await resetTables(pool);
  });

  /**
   * Writes one domain.
   *
   * @param slug - Its natural key.
   * @param name - Its operator-facing label.
   * @returns The stored row, as the database answered it.
   */
  async function plantDomain(
    slug: string,
    name: string,
  ): Promise<DomainRecord> {
    return await domainStore.insertDomain({ slug, name, settings: {} });
  }

  /**
   * Writes one document, straight through drizzle.
   *
   * NOT THROUGH A PORT, BECAUSE NEITHER PORT CAN. `DocumentStore`
   * declares two reads and no write whatever, and `FindingStore`
   * declares one write and it is a ruling — so a fixture standing a
   * corpus up has to reach the table itself, and that is the
   * plainest demonstration of the read-first law there is.
   *
   * @param domainId - The corpus this capture belongs to.
   * @param hash - Its content key. Unique across the table, so every
   *   caller supplies its own.
   * @param body - The captured text, stored verbatim.
   * @param status - Which side of `documents_parse_status_check` it
   *   sits on.
   * @param parseError - What the writer that saw it recorded, or
   *   null.
   * @param capturedAt - When, written explicitly so an ordering is
   *   the fixture's rather than the clock's.
   * @returns Its `documents.id`.
   * @throws Error When the insert returned no row.
   */
  async function plantDocument(
    domainId: number,
    hash: string,
    body: string,
    status: string = PARSED,
    parseError: string | null = null,
    capturedAt: Date = EARLIEST,
  ): Promise<number> {
    const written = await db.insert(documents)
      .values({
        domainId,
        sourceId: null,
        hash,
        url: null,
        body,
        capturedAt,
        parseStatus: status,
        parseError,
      })
      .returning({ id: documents.id });

    return oneRow(written, `the insert of document ${hash}`).id;
  }

  /**
   * Writes one finding, straight through drizzle, and reads it back
   * through the port.
   *
   * Read back rather than projected from the `RETURNING` list, so
   * every row a case holds is one `findFindingById` answered — which
   * makes the fixture itself a reading of that projection.
   *
   * @param domainId - The domain whose criteria produced it.
   * @param documentId - The capture it was read out of.
   * @param score - What it was scored, or null for one nobody has.
   * @param createdAt - When it was made, written explicitly.
   * @param fields - Its payload, which is where a category lives.
   * @returns The stored row, as the port answers it.
   * @throws Error When the insert returned no row.
   */
  async function plantFinding(
    domainId: number,
    documentId: number,
    score: number | null,
    createdAt: Date,
    fields: Record<string, unknown>,
  ): Promise<FindingRecord> {
    const written = await db.insert(findings)
      .values({
        domainId,
        documentId,
        entityId: null,
        fields,
        score,
        scoreVersion: null,
        createdAt,
      })
      .returning({ id: findings.id });
    const id = oneRow(written, 'the insert of a finding').id;

    return present(
      await findingStore.findFindingById(id),
      `findFindingById after planting finding ${id}`,
    );
  }

  /**
   * Writes both domains, a capture under each, and six findings.
   *
   * THE PLANT ORDER IS NEITHER THE ANSWER NOR ITS REVERSE, and it is
   * also neither direction of the id key beneath the answer, so no
   * ordering assertion below is satisfied by a store that read the
   * table in insertion order or backwards.
   *
   * THE TIE PAIRS ARE PLANTED SO EACH KEY DISAGREES WITH THE ONE
   * UNDER IT. `high` and `twin` share a score and an instant and are
   * planted low-id-first, so `id` descending reverses them; `late`
   * and `earliest` share a score and are planted newest-first, so
   * the newer of the two carries the LOWER id and the `created_at`
   * key answers one where the `id` key answers the other. Without
   * both, a key dropped from the `ORDER BY` answers the right page
   * for the fixture's reasons rather than the store's.
   *
   * @returns Both domains and all six findings.
   */
  async function plantFindings(): Promise<PlantedFindings> {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const other = await plantDomain(TRANSIT, TRANSIT_NAME);
    const capture = await plantDocument(domain.id, 'radar-capture', 'read');
    const outsideCapture = await plantDocument(
      other.id,
      'transit-capture',
      'read',
    );
    const late = await plantFinding(
      domain.id,
      capture,
      LOW_SCORE,
      LATE,
      { category: MODELS },
    );
    const high = await plantFinding(
      domain.id,
      capture,
      HIGH_SCORE,
      MIDDLE,
      { category: NUMERIC_CATEGORY },
    );
    const unscored = await plantFinding(
      domain.id,
      capture,
      null,
      EARLY,
      { category: INFRA },
    );
    const twin = await plantFinding(
      domain.id,
      capture,
      HIGH_SCORE,
      MIDDLE,
      { category: null },
    );
    const earliest = await plantFinding(
      domain.id,
      capture,
      LOW_SCORE,
      EARLIEST,
      {},
    );
    const outside = await plantFinding(
      other.id,
      outsideCapture,
      OTHER_SCORE,
      OTHER_AT,
      { category: MODELS },
    );

    return {
      domain,
      other,
      late,
      high,
      unscored,
      twin,
      earliest,
      outside,
    };
  }

  /**
   * One page of the subject domain, read through the store.
   *
   * @param domainId - The domain to read within.
   * @param filter - What to narrow to.
   * @param sort - Which ordering to answer in.
   * @returns The page and the count the same filter selects, so
   *   every case reads the two through one call and a predicate that
   *   narrowed one and not the other is visible.
   */
  async function pageOf(
    domainId: number,
    filter: FindingFilter,
    sort: 'recency' | 'score' = 'score',
  ): Promise<{ rows: readonly FindingRecord[]; total: number }> {
    const [rows, total] = await Promise.all([
      findingStore.listFindings(domainId, filter, sort, WHOLE),
      findingStore.countFindings(domainId, filter),
    ]);

    return { rows, total };
  }

  /**
   * Writes one registry row, straight through drizzle, and reads it
   * back through the port.
   *
   * NOT THROUGH A PORT, BECAUSE THE PORT HAS NO INSERT.
   * `EntityStore` declares two writers and both are updates — a
   * patch and a ratification — so a fixture standing a registry up
   * has to reach the table itself. Nothing in this repository writes
   * one of these rows yet, which is the state `entities` records
   * rather than a gap this file found.
   *
   * THE KEY IS PASSED IN AND NEVER COMPUTED HERE, so no expectation
   * below is derived through `normalizeEntityName`. A plant is free
   * to store a key no spelling of its name reduces to, which is the
   * silent miss that column warns about and exactly what a fixture
   * has to be able to express.
   *
   * @param domainId - The registry this subject belongs to.
   * @param name - Its display half, as a person reads it.
   * @param nameNorm - Its key half, as the registry matches on it.
   * @returns The stored row, as the port answers it.
   * @throws Error When the insert returned no row.
   */
  async function plantEntity(
    domainId: number,
    name: string,
    nameNorm: string,
  ): Promise<EntityRecord> {
    const written = await db.insert(entities)
      .values({ domainId, name, nameNorm, aliasOf: null })
      .returning({ id: entities.id });
    const id = oneRow(written, `the insert of entity ${nameNorm}`).id;

    return present(
      await entityStore.findEntityById(id),
      `findEntityById after planting entity ${id}`,
    );
  }

  /**
   * Raises one intention, straight through drizzle, and reads it
   * back through the port.
   *
   * NOT THROUGH A PORT FOR THE SAME REASON, one table over:
   * `EntityStore` ratifies and never raises, so the only write it
   * declares over `research_pool` is the approval the case under it
   * is about.
   *
   * Neither timestamp is given a value, which is the open state
   * every intention starts in and the one side of
   * `research_pool_approval_check` that permits both being NULL.
   *
   * @param domainId - The gate this row is queued at.
   * @param entityId - The subject it is about.
   * @returns The stored row, as the port answers it.
   * @throws Error When the insert returned no row.
   */
  async function plantPoolRow(
    domainId: number,
    entityId: number,
  ): Promise<ResearchPoolRecord> {
    const written = await db.insert(researchPool)
      .values({
        domainId,
        entityId,
        findingId: null,
        status: PENDING_STATUS,
        searchTerms: [...POOL_TERMS],
      })
      .returning({ id: researchPool.id });
    const id = oneRow(written, 'the insert of an intention').id;

    return present(
      await entityStore.findPoolRowById(id),
      `findPoolRowById after planting intention ${id}`,
    );
  }

  /**
   * Opens one pass, straight through drizzle, and reads it back
   * through the port.
   *
   * NOT THROUGH A PORT, BECAUSE `RunStore` HAS NO WRITER AT ALL.
   * Six methods, all six reads, and there is no seventh — so a
   * fixture standing a pass up has to reach the table itself, and
   * that is the read-first law demonstrated rather than described.
   *
   * @param domainId - Whose pass it was, or null for a maintenance
   *   tick belonging to no domain. Null is an ordinary state here
   *   rather than a row that failed to resolve.
   * @param startedAt - When it opened, written explicitly so an
   *   ordering is the fixture's rather than the clock's.
   * @returns The stored row, as the port answers it.
   * @throws Error When the insert returned no row.
   */
  async function plantRun(
    domainId: number | null,
    startedAt: Date,
  ): Promise<RunRecord> {
    const written = await db.insert(runs)
      .values({
        domainId,
        startedAt,
        status: RUN_STATUS,
        counts: {},
        scheduledBy: SCHEDULED_BY,
      })
      .returning({ id: runs.id });
    const id = oneRow(written, 'the insert of a pass').id;

    return present(
      await runStore.findRunById(id),
      `findRunById after planting run ${id}`,
    );
  }

  /**
   * Ledgers one model call, straight through drizzle.
   *
   * NOT THROUGH A PORT FOR THE SAME REASON, one table over: nothing
   * on `RunStore` appends to `llm_calls`, which is what the surface
   * answering what each call cost is one line away from offering to
   * do and deliberately does not.
   *
   * @param runId - The pass it was made inside, or null for a call
   *   made inside none. A null here is reachable only from the
   *   spend summary, `run_id = $1` being UNKNOWN on such a row.
   * @param node - Which step made it.
   * @param calledAt - When, written explicitly.
   * @param promptChars - What it measured, or null for a call
   *   nobody measured.
   * @param estTokens - The arithmetic over that, or null.
   * @returns Its `llm_calls.id`.
   * @throws Error When the insert returned no row.
   */
  async function plantCall(
    runId: number | null,
    node: string,
    calledAt: Date,
    promptChars: number | null,
    estTokens: number | null,
  ): Promise<number> {
    const written = await db.insert(llmCalls)
      .values({
        runId,
        node,
        model: null,
        promptChars,
        estTokens,
        calledAt,
      })
      .returning({ id: llmCalls.id });

    return oneRow(written, `the insert of a ${node} call`).id;
  }

  /**
   * Writes one feed, with the empty arrangement every case here
   * starts it at.
   *
   * THROUGH THE PORT, unlike every other plant in this file, and
   * the difference is the point: `SourceStore` declares four
   * writers where the wave-3 ports declare three between them, so a
   * feed is standable-up without reaching a table.
   *
   * THE EMPTY ARRANGEMENT IS WHAT THE APPLY CASE MEASURES FROM. A
   * source planted with the documents already on it would leave the
   * write below indistinguishable from no write at all.
   *
   * @param domainId - The domain whose research it supplies.
   * @param endpoint - Where its payload is.
   * @returns The stored row, as the database answered it.
   */
  async function plantSource(
    domainId: number,
    endpoint: string,
  ): Promise<SourceRecord> {
    return await sourceStore.insertSource({
      domainId,
      kind: FEED_KIND,
      endpoint,
      parserConfig: {},
      contract: {},
      enabled: true,
    });
  }

  /**
   * Proposes one arrangement, straight through drizzle, and reads
   * it back through the port.
   *
   * NOT THROUGH A PORT, BECAUSE THE PORT HAS NO INSERT.
   * `SourceStore` reads this table three ways and writes it once,
   * and the write is the ruling the cases below are about — so a
   * fixture standing a queue up has to reach the table itself.
   * `src/sources/config-proposer.ts` is what proposes one in a
   * deployment, and it is a workflow rather than a route.
   *
   * Neither timestamp is given a value, which is the open state
   * every proposal starts in and the one side of
   * `source_config_proposals_approval_check` that permits both
   * being NULL.
   *
   * @param domainId - The domain the feed belongs to.
   * @param sourceId - The feed the arrangement is for.
   * @param proposedBy - What proposed it. Provenance and nothing
   *   addressable, per the column.
   * @returns The stored row, as the port answers it.
   * @throws Error When the insert returned no row.
   */
  async function plantProposal(
    domainId: number,
    sourceId: number,
    proposedBy: string,
  ): Promise<SourceConfigProposalRecord> {
    const written = await db.insert(sourceConfigProposals)
      .values({
        domainId,
        sourceId,
        parserConfig: PROPOSED_CONFIG,
        contract: PROPOSED_CONTRACT,
        proposedBy,
      })
      .returning({ id: sourceConfigProposals.id });
    const id = oneRow(written, `the proposal from ${proposedBy}`).id;

    return present(
      await sourceStore.findProposalById(id),
      `findProposalById after planting proposal ${id}`,
    );
  }

  it('meets an empty database in every case', async () => {
    // The precondition every case below rests on, taken as a reading
    // rather than left to a comment: each of them plants everything
    // it reads, so a row surviving between cases would make some
    // later assertion true for a reason nobody wrote.
    //
    // Read through the stores rather than through SQL, so a table
    // missing from the `TABLES` roster in `./live-postgres.ts` — a
    // fault that leaves `lint`, `check-types` and the whole live run
    // green while leaking rows — is reported here too.
    const filter: FindingFilter = { window: UNBOUNDED };

    expect(await findingStore.countFindings(1, filter)).toBe(0);
    expect(await findingStore.listFindings(1, filter, 'score', WHOLE))
      .toStrictEqual([]);
    expect(await findingStore.findFindingById(1)).toBeNull();
    expect(await findingStore.listFindingLabels(1)).toStrictEqual([]);
    expect(await findingStore.listFindingSightings(1)).toStrictEqual([]);
    expect(await findingStore.listFindingResearch(1)).toStrictEqual([]);
    expect(await documentStore.countDocuments(1, {})).toBe(0);
    expect(await documentStore.listDocuments(1, {}, WHOLE))
      .toStrictEqual([]);
    expect(await runStore.countRuns({})).toBe(0);
    expect(await runStore.listRuns({}, WHOLE)).toStrictEqual([]);
    expect(await runStore.findRunById(1)).toBeNull();
    expect(await runStore.listRunLedger(1, RUN_LEDGER_CAP))
      .toStrictEqual([]);
    expect(await runStore.countRunLedger(1)).toBe(0);
    expect(await runStore.summariseSpend({}, UNBOUNDED))
      .toStrictEqual([]);
    expect(await sourceStore.countPendingProposals(1)).toBe(0);
    expect(await sourceStore.listPendingProposals(1, WHOLE))
      .toStrictEqual([]);
    expect(await sourceStore.findProposalById(1)).toBeNull();
  });

  it('orders a page the way a digest orders one', async () => {
    const planted = await plantFindings();
    const { rows, total } = await pageOf(planted.domain.id, {
      window: UNBOUNDED,
    });
    const answered = idsOf(rows);

    // The scope first, and it is what makes every line below a
    // statement about this domain rather than about the table. The
    // other domain's finding is scored BETWEEN the two scores here
    // and stamped BETWEEN two of these instants, so a `WHERE` that
    // stopped narrowing puts a row of exactly the right shape into
    // the middle of this page and no assertion about the head or the
    // tail of it would notice.
    expect(total).toBe(5);
    expect(answered).toHaveLength(5);
    expect(answered).not.toContain(planted.outside.id);

    // The digest order, written out. Score descending with an absent
    // score LAST, then `created_at` descending, then `id`
    // descending.
    expect(answered).toStrictEqual([
      planted.twin.id,
      planted.high.id,
      planted.late.id,
      planted.earliest.id,
      planted.unscored.id,
    ]);

    // THE UNSCORED FINDING IS LAST AND NOT FIRST, which is the
    // `NULLS LAST` on a descending key rather than a comparator
    // branch. Postgres puts nulls FIRST for `DESC` unless told
    // otherwise, so a store that dropped the qualifier answers this
    // row at the head of a ranking.
    expect(oneRow(rows.slice(-1), 'the last row of the page').score)
      .toBeNull();
    expect(oneRow(rows, 'the first row of the page').score)
      .toBe(HIGH_SCORE);

    // The vacuity guards. The answer is none of the four orders a
    // store that read the table without ordering it, or ordered it
    // by its identity alone, would have produced — so the assertion
    // above is about the `ORDER BY` and not about how the rows were
    // written.
    const plantOrder = [
      planted.late.id,
      planted.high.id,
      planted.unscored.id,
      planted.twin.id,
      planted.earliest.id,
    ];

    expect(answered).not.toStrictEqual(plantOrder);
    expect(answered).not.toStrictEqual([...plantOrder].reverse());
    expect(plantOrder).toStrictEqual([...plantOrder].sort((l, r) => l - r));

    // THE COMPARATOR IS THE SECOND DERIVATION OF ONE RULE. The rows
    // the server ranked, re-ranked by `compareFindings` from
    // `src/lib/digest-assemble.ts`, come out in the order they
    // arrived in — so the SQL and the library are one authority
    // checked from two sides rather than two orders free to
    // disagree. `orderFindings` copies before sorting, so the page
    // this compares against is not the page it sorted.
    expect(idsOf(orderFindings([...rows]))).toStrictEqual(answered);

    // And the shuffled control: the same rows handed to the library
    // in a DIFFERENT order come back in the same one. Without it the
    // line above is equally green over a library that answers its
    // argument unchanged.
    const shuffled = [...rows].reverse();

    expect(idsOf(shuffled)).not.toStrictEqual(answered);
    expect(idsOf(orderFindings(shuffled))).toStrictEqual(answered);
  });

  it('answers recency as that order with the score gone', async () => {
    const planted = await plantFindings();
    const { rows, total } = await pageOf(
      planted.domain.id,
      { window: UNBOUNDED },
      'recency',
    );
    const answered = idsOf(rows);

    expect(total).toBe(5);
    expect(answered).not.toContain(planted.outside.id);

    // `created_at` descending with `id` descending under it, and no
    // score key at all — so the unscored finding sits by its instant
    // rather than at the end, and the two findings scored alike at
    // one moment keep the order their ids give them.
    expect(answered).toStrictEqual([
      planted.late.id,
      planted.twin.id,
      planted.high.id,
      planted.unscored.id,
      planted.earliest.id,
    ]);

    // The sort parameter is READ, which is what this case is for: a
    // store answering one ordering whatever it was asked would pass
    // the case above and fail this line.
    const ranked = await findingStore.listFindings(
      planted.domain.id,
      { window: UNBOUNDED },
      'score',
      WHOLE,
    );

    expect(idsOf(ranked)).not.toStrictEqual(answered);

    // AND IT IS THE SAME ORDER WITH ONE KEY NEUTRALISED rather than
    // a second rule. Two absent scores tie on the first key and fall
    // through to the stamp and then to the id, so the library
    // answers the recency order for rows whose scores are all gone —
    // derived through the same authority the case above compares
    // against rather than through a comparator written out here.
    // Taken over the RANKED page, whose order is not this one, so
    // the library is asked to move the rows rather than to leave
    // them where a no-op sort already had them.
    const unranked = ranked.map((row) => ({ ...row, score: null }));

    expect(idsOf(orderFindings(unranked))).toStrictEqual(answered);

    // The plant order and its reverse are neither, on the terms the
    // case above states.
    const plantOrder = [
      planted.late.id,
      planted.high.id,
      planted.unscored.id,
      planted.twin.id,
      planted.earliest.id,
    ];

    expect(answered).not.toStrictEqual(plantOrder);
    expect(answered).not.toStrictEqual([...plantOrder].reverse());
  });

  it('answers the verdict in force over a re-judged finding', async () => {
    const planted = await plantFindings();

    // Three rulings in turn on one finding, and one ruling on
    // another. The MIDDLE verdict is what separates the two shapes a
    // reader confuses: a subquery pushing the comparison inside
    // answers this finding under every verdict it ever carried,
    // where the store compares against the row `DISTINCT ON` left
    // standing and answers it under the third alone.
    await findingStore.insertFindingLabel({
      findingId: planted.late.id,
      verdict: FIRST_VERDICT,
      note: null,
    });
    await findingStore.insertFindingLabel({
      findingId: planted.late.id,
      verdict: MIDDLE_VERDICT,
      note: null,
    });
    await findingStore.insertFindingLabel({
      findingId: planted.late.id,
      verdict: LATEST_VERDICT,
      note: null,
    });
    await findingStore.insertFindingLabel({
      findingId: planted.high.id,
      verdict: FIRST_VERDICT,
      note: null,
    });

    // The scope control carries the verdict in force on the subject
    // domain's re-judged finding, so a `WHERE` that stopped
    // narrowing answers two rows below rather than one.
    await findingStore.insertFindingLabel({
      findingId: planted.outside.id,
      verdict: LATEST_VERDICT,
      note: null,
    });

    const inForce = await pageOf(planted.domain.id, {
      verdict: LATEST_VERDICT,
      window: UNBOUNDED,
    });

    expect(idsOf(inForce.rows)).toStrictEqual([planted.late.id]);
    expect(inForce.total).toBe(1);

    // THE FIRST TWO RULINGS ARE NO LONGER IN FORCE, and the zeros
    // are read beside a non-empty page the same call produced — the
    // finding ruled ONCE is the in-band positive control, so a store
    // that had stopped answering any verdict at all fails the line
    // below rather than passing the two above it.
    const superseded = await pageOf(planted.domain.id, {
      verdict: FIRST_VERDICT,
      window: UNBOUNDED,
    });

    expect(idsOf(superseded.rows)).toStrictEqual([planted.high.id]);
    expect(superseded.total).toBe(1);

    const middle = await pageOf(planted.domain.id, {
      verdict: MIDDLE_VERDICT,
      window: UNBOUNDED,
    });

    expect(idsOf(middle.rows)).toStrictEqual([]);
    expect(middle.total).toBe(0);

    // A FINDING NOBODY HAS JUDGED MATCHES NO VERDICT, which follows
    // from the subquery rather than being decided: it contributes no
    // row, so it is in no membership list any verdict could produce.
    const unjudged = [
      planted.unscored.id,
      planted.twin.id,
      planted.earliest.id,
    ];
    const judged = [
      ...idsOf(inForce.rows),
      ...idsOf(superseded.rows),
      ...idsOf(middle.rows),
    ];

    expect(unjudged.some((id) => judged.includes(id))).toBe(false);

    // A verdict no label carries is an empty page rather than an
    // error, and the whole collection is what the three narrowings
    // fall short of.
    const unused = await pageOf(planted.domain.id, {
      verdict: UNUSED_VERDICT,
      window: UNBOUNDED,
    });
    const everything = await pageOf(planted.domain.id, {
      window: UNBOUNDED,
    });

    expect(unused.total).toBe(0);
    expect(judged).toHaveLength(2);
    expect(everything.total).toBe(5);
  });

  it('appends a ruling and leaves the one it followed', async () => {
    const planted = await plantFindings();

    // THE SAME VERDICT TWICE, which is the pair that reports. Two
    // rulings that DIFFER are survived by an upsert keyed on the
    // finding and the verdict; only a second call carrying the same
    // value collapses under one. The notes differ, so the row the
    // first call wrote is identifiable afterwards.
    const first = await findingStore.insertFindingLabel({
      findingId: planted.late.id,
      verdict: LATEST_VERDICT,
      note: FIRST_NOTE,
    });
    const second = await findingStore.insertFindingLabel({
      findingId: planted.late.id,
      verdict: LATEST_VERDICT,
      note: SECOND_NOTE,
    });

    // The id and the stamp are the two members no request carried,
    // and they are what says the write ANSWERED THE STORED ROW
    // rather than an object rebuilt from its argument.
    expect(typeof first.id).toBe('number');
    expect(second.id).not.toBe(first.id);
    expect(first.labelledAt).toBeInstanceOf(Date);
    expect(second.labelledAt.getTime())
      .toBeGreaterThanOrEqual(first.labelledAt.getTime());

    // BOTH ROWS STAND, newest first, and the note the first ruling
    // recorded survived the second — which an update would have
    // taken with the value it replaced.
    const held = await findingStore.listFindingLabels(planted.late.id);

    expect(held).toStrictEqual([second, first]);
    expect(held.map((row) => row.note))
      .toStrictEqual([SECOND_NOTE, FIRST_NOTE]);
    expect(held.map((row) => row.verdict))
      .toStrictEqual([LATEST_VERDICT, LATEST_VERDICT]);

    // The append reached one finding and no other, so the rulings
    // are keyed by the finding rather than by the domain.
    expect(await findingStore.listFindingLabels(planted.high.id))
      .toStrictEqual([]);

    // THE STAMP IS THE TRANSACTION'S AND THAT IS WHY `id` IS BESIDE
    // IT. `labelled_at` defaults to `now()`, which is the
    // transaction's start rather than the row's, so two rulings
    // written inside ONE transaction carry a single value between
    // them. Planted here the way a deployment makes such a tie — two
    // statements in one transaction — rather than by writing one
    // instant twice, and no in-memory store can be made to produce
    // it: two objects appended to a list carry whatever clock the
    // fake read, twice.
    await db.transaction(async (tx) => {
      await tx.insert(findingLabels).values({
        findingId: planted.twin.id,
        verdict: FIRST_VERDICT,
        note: FIRST_NOTE,
      });
      await tx.insert(findingLabels).values({
        findingId: planted.twin.id,
        verdict: FIRST_VERDICT,
        note: SECOND_NOTE,
      });
    });

    const tied = await findingStore.listFindingLabels(planted.twin.id);
    const older = oneRow(tied.slice(-1), 'the older of the tied rulings');
    const newer = oneRow(tied, 'the newer of the tied rulings');

    // The tie is real — without this the ordering below is equally
    // green over a store that read the stamps and found them apart.
    expect(newer.labelledAt.toISOString())
      .toBe(older.labelledAt.toISOString());

    // And `id` is what separated them. For a lookup whose whole
    // answer is the FIRST row, that is the difference between a
    // verdict and a coin flip.
    expect(newer.id).toBeGreaterThan(older.id);
    expect(newer.note).toBe(SECOND_NOTE);
    expect(older.note).toBe(FIRST_NOTE);
  });

  it('filters findings on the category member of fields', async () => {
    const planted = await plantFindings();

    // A key exactly one finding of this domain is filed under, while
    // the OTHER domain's finding carries the same key — so a `WHERE`
    // that stopped narrowing answers two rows here.
    const models = await pageOf(planted.domain.id, {
      category: MODELS,
      window: UNBOUNDED,
    });

    expect(idsOf(models.rows)).toStrictEqual([planted.late.id]);
    expect(models.total).toBe(1);

    const infra = await pageOf(planted.domain.id, {
      category: INFRA,
      window: UNBOUNDED,
    });

    expect(idsOf(infra.rows)).toStrictEqual([planted.unscored.id]);
    expect(infra.total).toBe(1);

    // `fields->>'category'` YIELDS TEXT, and this is the row that
    // says so. The member was stored as a NUMBER, so a store
    // comparing only string members answers an empty page where the
    // server answers the row — a reading with no expression in any
    // implementation that holds its payloads as JavaScript values.
    expect(planted.high.fields['category']).toBe(NUMERIC_CATEGORY);

    const numeric = await pageOf(planted.domain.id, {
      category: NUMERIC_KEY,
      window: UNBOUNDED,
    });

    expect(idsOf(numeric.rows)).toStrictEqual([planted.high.id]);
    expect(numeric.total).toBe(1);

    // THE TWO ABSENCES BOTH COME BACK SQL NULL, which is a
    // three-valued reading a comparison over JavaScript values has
    // no third value to be wrong about. One payload holds the JSON
    // null under the member and the other has no such member at all,
    // and neither matches any key a caller can name — so the three
    // narrowings above fall SHORT of the collection by exactly those
    // two, which is a partition no single narrowed page can report.
    expect(planted.twin.fields['category']).toBeNull();
    expect(Object.hasOwn(planted.earliest.fields, 'category')).toBe(false);

    const filed = [
      ...idsOf(models.rows),
      ...idsOf(infra.rows),
      ...idsOf(numeric.rows),
    ];
    const whole = await pageOf(planted.domain.id, { window: UNBOUNDED });

    expect(filed).toHaveLength(3);
    expect(whole.total).toBe(5);
    expect(filed).not.toContain(planted.twin.id);
    expect(filed).not.toContain(planted.earliest.id);

    // A key the domain never declared is an empty page rather than a
    // `404`. Nothing failed to read: the domain has no findings
    // filed under a category it never named.
    const undeclared = await pageOf(planted.domain.id, {
      category: UNDECLARED,
      window: UNBOUNDED,
    });

    expect(idsOf(undeclared.rows)).toStrictEqual([]);
    expect(undeclared.total).toBe(0);
  });

  it('takes a window lower bound and drops its upper', async () => {
    const planted = await plantFindings();

    // `[EARLY, LATE)` — half-open, so the finding made at exactly
    // the lower bound is IN and the one made at exactly the upper
    // bound is OUT. Both ends are planted on, which is what makes
    // this two readings rather than one: a store writing `>` on the
    // lower is reported by the row it drops and one writing `<=` on
    // the upper by the row it takes.
    const window: TimeWindow = {
      sinceInclusive: EARLY,
      untilExclusive: LATE,
    };
    const { rows, total } = await pageOf(
      planted.domain.id,
      { window },
      'recency',
    );
    const answered = idsOf(rows);

    // The instants the two bounds name are the instants two findings
    // carry, taken as a reading rather than left to the fixture's
    // constants: without it the boundary claim is about a seam no
    // row sits on.
    expect(planted.unscored.createdAt.toISOString())
      .toBe(EARLY.toISOString());
    expect(planted.late.createdAt.toISOString())
      .toBe(LATE.toISOString());

    expect(answered).toStrictEqual([
      planted.twin.id,
      planted.high.id,
      planted.unscored.id,
    ]);
    expect(total).toBe(3);

    // The lower bound is INCLUSIVE, so the row stamped at it is in
    // the page.
    expect(answered).toContain(planted.unscored.id);

    // The upper bound is EXCLUSIVE, so the row stamped at it is not
    // — and neither is the row below the span, which is what says
    // the lower bound narrows at all rather than being ignored.
    expect(answered).not.toContain(planted.late.id);
    expect(answered).not.toContain(planted.earliest.id);

    // And the scope: the other domain's finding is stamped INSIDE
    // this span, so a `WHERE` that stopped narrowing answers it here
    // at exactly the position an unnoticed row would take.
    expect(planted.outside.createdAt.getTime())
      .toBeGreaterThan(EARLY.getTime());
    expect(planted.outside.createdAt.getTime())
      .toBeLessThan(LATE.getTime());
    expect(answered).not.toContain(planted.outside.id);

    // Each bound alone, so neither is read as the other. An open
    // upper takes the row the closed one dropped; an open lower
    // takes the row below the span.
    const fromEarly = await pageOf(planted.domain.id, {
      window: { sinceInclusive: EARLY, untilExclusive: null },
    });
    const untilLate = await pageOf(planted.domain.id, {
      window: { sinceInclusive: null, untilExclusive: LATE },
    });

    expect(fromEarly.total).toBe(4);
    expect(idsOf(fromEarly.rows)).toContain(planted.late.id);
    expect(untilLate.total).toBe(4);
    expect(idsOf(untilLate.rows)).toContain(planted.earliest.id);
    expect(idsOf(untilLate.rows)).not.toContain(planted.late.id);

    // A span in which the domain made nothing is a legitimate
    // request answering an empty page rather than an error.
    const quiet = await pageOf(planted.domain.id, {
      window: { sinceInclusive: at(50), untilExclusive: at(55) },
    });

    expect(idsOf(quiet.rows)).toStrictEqual([]);
    expect(quiet.total).toBe(0);
  });

  it('answers a stored control byte masked and a body cut', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const other = await plantDomain(TRANSIT, TRANSIT_NAME);
    const markedId = await plantDocument(
      domain.id,
      'radar-marked',
      MARKED_BODY,
      UNPARSED,
      MARKED_ERROR,
      LATE,
    );
    const atCapId = await plantDocument(
      domain.id,
      'radar-at-cap',
      AT_CAP_BODY,
      PARSED,
      null,
      MIDDLE,
    );
    const overCapId = await plantDocument(
      domain.id,
      'radar-over-cap',
      OVER_CAP_BODY,
      PARSED,
      null,
      EARLY,
    );

    // The scope control, planted with the body the cut case reads so
    // a corpus read that stopped narrowing answers a row of exactly
    // the right shape.
    await plantDocument(
      other.id,
      'transit-marked',
      MARKED_BODY,
      UNPARSED,
      MARKED_ERROR,
      OTHER_AT,
    );

    // THE STORE ANSWERS THE BODY AS STORED, unmasked and uncut, per
    // its port — and this is the reading that says the control
    // characters survived a `text` column byte-identically rather
    // than having been dropped or transcoded on the way in. Only a
    // server can supply it: the masker's own suite hands it these
    // characters directly.
    const stored = await documentStore.listDocuments(domain.id, {}, WHOLE);

    expect(idsOf(stored)).toStrictEqual([markedId, atCapId, overCapId]);

    const storedMarked = oneRow(stored, 'the corpus page, newest first');

    expect(storedMarked.body).toBe(MARKED_BODY);
    expect(storedMarked.body.length).toBe(MARKED_BODY.length);
    expect(countOccurrences(storedMarked.body, BELL)).toBe(1);
    expect(countOccurrences(storedMarked.body, DEL)).toBe(1);
    expect(countOccurrences(storedMarked.body, NEL)).toBe(1);
    expect(present(storedMarked.parseError, 'the stored parse error'))
      .toBe(MARKED_ERROR);

    // AND THE SERVICE ANSWERS NEITHER, over the same two stores and
    // the same connection — so the zeros below are about the value
    // the lines above counted as ones rather than about text nothing
    // ever stored.
    const page = await listDocuments(corpusStore, RADAR, {}, WHOLE);

    expect(page.total).toBe(3);
    expect(idsOf(page.rows)).toStrictEqual([markedId, atCapId, overCapId]);

    const answered = oneRow(page.rows, 'the answered corpus page');

    expect(countOccurrences(answered.body, BELL)).toBe(0);
    expect(countOccurrences(answered.body, DEL)).toBe(0);
    expect(countOccurrences(answered.body, NEL)).toBe(0);
    expect(answered.body).toBe(maskControlBytes(MARKED_BODY));
    expect(present(answered.parseError, 'the answered parse error'))
      .toBe(maskControlBytes(MARKED_ERROR));

    // The masked body is SHORT, so nothing was cut — which is what
    // makes this a reading about the mask. A service masking before
    // cutting answers the same text and moves this flag instead,
    // there being something in this body to mask.
    expect(answered.bodyTruncated).toBe(false);

    // Bytes and not characters, and the C1 control is what separates
    // the two: it is one UTF-16 unit and two UTF-8 bytes.
    expect(answered.bodyBytes)
      .toBe(Buffer.byteLength(MARKED_BODY, 'utf8'));
    expect(answered.bodyBytes).toBeGreaterThan(MARKED_BODY.length);

    // THE CUT ANSWERS THE AT-CAP BODY ITSELF, which one equality
    // reads the flag, the retained text and the length through. The
    // over-cap body is the at-cap body plus a single two-byte
    // character, so the three numbers a cut body carries are
    // distinct here: stored bytes, stored code points, and the code
    // points kept.
    const atCap = page.rows.find((row) => row.id === atCapId);
    const overCap = page.rows.find((row) => row.id === overCapId);

    expect(present(atCap ?? null, 'the at-cap row of the page').body)
      .toBe(AT_CAP_BODY);
    expect(present(atCap ?? null, 'the at-cap row of the page')
      .bodyTruncated).toBe(false);
    expect(present(atCap ?? null, 'the at-cap row of the page').bodyBytes)
      .toBe(BODY_CODE_POINT_CAP);

    const cut = present(overCap ?? null, 'the over-cap row of the page');

    expect(cut.body).toBe(AT_CAP_BODY);
    expect(cut.bodyTruncated).toBe(true);
    expect(cut.bodyBytes).toBe(BODY_CODE_POINT_CAP + 2);
    expect(Array.from(cut.body)).toHaveLength(BODY_CODE_POINT_CAP);
    expect(Array.from(OVER_CAP_BODY))
      .toHaveLength(BODY_CODE_POINT_CAP + 1);

    // The mark at each END, which a run of one repeated character
    // cannot supply: such a run equals every slice of itself, so a
    // comparison that slipped by one takes a character nothing can
    // see going.
    expect(cut.body.startsWith(BODY_HEAD)).toBe(true);
    expect(cut.body.endsWith(BODY_TAIL)).toBe(true);

    // And the scope, read through both faces: the other domain's
    // capture is in neither answer.
    const outside = await listDocuments(corpusStore, TRANSIT, {}, WHOLE);

    expect(outside.total).toBe(1);
    expect(idsOf(outside.rows)).not.toContain(markedId);

    // The narrowing, so a page that stopped filtering is reported:
    // the two halves SUM to the unnarrowed total and neither equals
    // it, which no single narrowed page can say.
    const failed = await listDocuments(
      corpusStore,
      RADAR,
      { parseStatus: UNPARSED },
      WHOLE,
    );
    const parsed = await listDocuments(
      corpusStore,
      RADAR,
      { parseStatus: PARSED },
      WHOLE,
    );

    expect(idsOf(failed.rows)).toStrictEqual([markedId]);
    expect(failed.total).toBe(1);
    expect(parsed.total).toBe(2);
    expect(failed.total + parsed.total).toBe(page.total);
  });

  it('refuses the one control byte a text column cannot hold', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const kept = await plantDocument(
      domain.id,
      'radar-kept',
      MARKED_BODY,
      PARSED,
      null,
      LATE,
    );

    // THE MASKED CLASS IS FOUR RANGES AND THIS COLUMN CAN CARRY TWO
    // OF THEM. The case above is the two it can; this is the two it
    // cannot, and neither is readable anywhere but here —
    // `maskControlBytes` is a pure function and its colocated suite
    // hands it every range directly, where what a stored body can
    // actually hold is a fact about the server and the wire between
    // them.
    //
    // U+0000 is refused OUTRIGHT. Postgres has no representation for
    // it in any encoding, so the insert never lands and the SQLSTATE
    // is `character_not_in_repertoire` — which is NOT one of the
    // three `classifyPgError` in `src/db/store-errors.ts` maps, so
    // it crosses as the driver error drizzle wrapped rather than as
    // a `StoreRefusal`.
    let raised: unknown = null;

    try {
      await plantDocument(domain.id, 'radar-nul', 'A' + NUL + 'Z');
    } catch (err) {
      raised = err;
    }

    if (raised === null) {
      throw new Error(
        '[wave3-live] the NUL insert was accepted, so the assertions '
        + 'below would be about a refusal nobody raised.',
      );
    }

    const cause = (raised as { cause?: unknown }).cause as {
      code?: unknown;
    };

    expect(cause.code).toBe(ENCODING_VIOLATION);

    // THE REFUSAL WROTE NOTHING and the connection is still usable,
    // which is what says the statement failed rather than the
    // session. Read after the refusal rather than before it, so the
    // count is a statement about the state the refusal left.
    expect(await documentStore.countDocuments(domain.id, {})).toBe(1);
    expect(idsOf(await documentStore.listDocuments(domain.id, {}, WHOLE)))
      .toStrictEqual([kept]);

    // A LONE SURROGATE IS NOT REFUSED, AND IT IS NOT STORED EITHER.
    // It is replaced with U+FFFD on the way out of this process,
    // before the server sees it, so the row lands carrying a
    // character nobody wrote and the mask has nothing left to
    // escape. That is the quieter of the two and the one worth
    // measuring: a refusal is loud, and this is a body that reads
    // back plausibly and is not what was sent.
    const swappedId = await plantDocument(
      domain.id,
      'radar-surrogate',
      'A' + LONE_SURROGATE + 'Z',
      PARSED,
      null,
      MIDDLE,
    );
    const page = await listDocuments(corpusStore, RADAR, {}, WHOLE);
    const swapped = page.rows.find((row) => row.id === swappedId);
    const back = present(swapped ?? null, 'the surrogate row of the page');

    expect(back.body).toBe('A' + REPLACEMENT + 'Z');
    expect(countOccurrences(back.body, LONE_SURROGATE)).toBe(0);
    expect(countOccurrences(back.body, REPLACEMENT)).toBe(1);

    // The masker WOULD have escaped it, which is the control that
    // says the zero above is the column's doing and not the mask
    // having stopped matching.
    expect(maskControlBytes('A' + LONE_SURROGATE + 'Z'))
      .not.toBe('A' + LONE_SURROGATE + 'Z');
    expect(maskControlBytes(back.body)).toBe(back.body);
  });
  it('recomputes the key a rename matches on', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const other = await plantDomain(TRANSIT, TRANSIT_NAME);

    // The fixture and the library agree, asserted rather than
    // assumed. Every key this file carries is a literal it chose,
    // and these three lines are what say the reduction under test
    // answers the same thing — an expectation computed through
    // `normalizeEntityName` agrees with a reduction that is wrong
    // in exactly the same way.
    expect(normalizeEntityName(FIRST_SPELLING)).toBe(FIRST_KEY);
    expect(normalizeEntityName(SECOND_SPELLING)).toBe(FIRST_KEY);
    expect(normalizeEntityName(RENAMED)).toBe(RENAMED_KEY);

    // THE SCOPE CONTROL HOLDS THE KEY THE RENAME LANDS ON, in the
    // other registry. The unique key is on the PAIR, so a key that
    // lost its domain column refuses the rename below — and a
    // fixture with one domain is green either way. Planted FIRST,
    // which is what keeps every domain id below different from the
    // id of the row carrying it: two sequences both restarting at
    // one otherwise agree, and a projection answering an entity its
    // own id as its registry is green through the case.
    const outside = await plantEntity(other.id, RENAMED, RENAMED_KEY);
    const subject = await plantEntity(
      domain.id,
      FIRST_SPELLING,
      FIRST_KEY,
    );

    expect(subject.name).toBe(FIRST_SPELLING);
    expect(subject.nameNorm).toBe(FIRST_KEY);
    expect(subject.id).not.toBe(subject.domainId);
    expect(outside.id).not.toBe(outside.domainId);

    // The rename through the path a request takes: `patchEntity`
    // reduces the submitted spelling and hands the store the PAIR,
    // so the key is computed once and written beside the display.
    const renamed = await patchEntity(entityStore, subject.id, {
      name: RENAMED,
    });

    expect(renamed.name).toBe(RENAMED);
    expect(renamed.nameNorm).toBe(RENAMED_KEY);

    // THE KEY IS NOT ANYTHING THE REQUEST CARRIED, which is what
    // recomputed means here: the submitted spelling does not
    // contain it, so a writer copying the display into both columns
    // is reported by this line rather than by a shape assertion.
    expect(countOccurrences(RENAMED, RENAMED_KEY)).toBe(0);
    expect(renamed.nameNorm).not.toBe(renamed.name);

    // And the COLUMN holds it, read back through the store rather
    // than off the row the write projected.
    expect(await entityStore.findEntityById(subject.id))
      .toStrictEqual(renamed);

    // THE OLD KEY IS FREE, which only an index can say: the rename
    // released it, so another subject takes it. A store writing the
    // new key without moving the row would leave this refused.
    const newcomer = await plantEntity(
      domain.id,
      FIRST_SPELLING,
      FIRST_KEY,
    );

    expect(newcomer.nameNorm).toBe(FIRST_KEY);
    expect(newcomer.id).not.toBe(subject.id);

    // A RE-SPELLING MOVES THE DISPLAY AND NOT THE KEY, so it cannot
    // collide with the row it is written onto — a row is not in
    // conflict with itself, and this is the request saying the
    // reduction is what the index compares rather than the
    // spelling.
    const respelled = await patchEntity(entityStore, newcomer.id, {
      name: SECOND_SPELLING,
    });

    expect(respelled.name).toBe(SECOND_SPELLING);
    expect(respelled.nameNorm).toBe(FIRST_KEY);
    expect(respelled.id).toBe(newcomer.id);

    // The scope from the accepting side: the other registry still
    // holds the key this one was renamed onto, and neither row
    // moved the other.
    expect(await entityStore.findEntityById(outside.id))
      .toStrictEqual(outside);
    expect(outside.nameNorm).toBe(renamed.nameNorm);
    expect(renamed.domainId).toBe(domain.id);
    expect(outside.domainId).toBe(other.id);
  });

  it('refuses a rename onto a key the registry holds', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const other = await plantDomain(TRANSIT, TRANSIT_NAME);
    const subject = await plantEntity(
      domain.id,
      FIRST_SPELLING,
      FIRST_KEY,
    );
    const rival = await plantEntity(
      domain.id,
      RIVAL_SPELLING,
      RENAMED_KEY,
    );

    // The scope control sits in the OTHER registry under the key
    // the subject starts with, so the same rename is issued twice
    // below: refused inside one domain and accepted across two.
    const outside = await plantEntity(
      other.id,
      FIRST_SPELLING,
      FIRST_KEY,
    );

    // Read BEFORE the refusal and before any accepting control, so
    // the comparison below is against the state the case found
    // rather than against what a later write left. Both readings a
    // refusal case owes touch this row, which is what makes the
    // order load-bearing rather than tidy.
    const before = present(
      await entityStore.findEntityById(subject.id),
      'findEntityById before the refused rename',
    );
    const refusal = await refusalFrom(() => entityStore.updateEntity(
      subject.id,
      { name: { display: RENAMED, norm: RENAMED_KEY } },
    ));

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe(ENTITY_NAME_KEY);

    // THE SQLSTATE IS THE SERVER'S AND THE REASON IS THIS
    // REPOSITORY'S, so the two are read separately: a classifier
    // mapping the wrong code onto the right reason answers the line
    // above and fails the line below.
    const fields = refusal.cause as DriverFields;

    expect(fields.code).toBe(UNIQUE_VIOLATION);

    // NOTHING THE CALLER SUBMITTED IS ON THE REFUSAL, read beside a
    // live positive control the same function takes over the same
    // needle in the same case. The server spells
    // `Key (domain_id, name_norm)=(...)` with the submitted key in
    // it, and `errorHandler` logs an unhandled error together with
    // its `cause`, so the zeros are about a value that genuinely
    // reached the server. No in-memory store can supply that
    // control: its refusals are built from a reason and a
    // constraint name this repository chose, so there was never
    // anything there to have leaked.
    const carried = String(fields.detail);
    const serialised = JSON.stringify(refusal);

    expect(countOccurrences(carried, RENAMED_KEY)).toBe(1);
    expect(countOccurrences(serialised, RENAMED_KEY)).toBe(0);
    expect(countOccurrences(refusal.message, RENAMED_KEY)).toBe(0);

    // THE REFUSAL WROTE NOTHING, and the connection is still usable
    // — which is what says the statement failed rather than the
    // session, since every accepting write below goes through it.
    expect(await entityStore.findEntityById(subject.id))
      .toStrictEqual(before);

    // A ROW IS NOT IN CONFLICT WITH ITSELF: writing the rival its
    // own key back over it is accepted, which is the control that
    // keeps the refusal above from being satisfied by an update
    // refusing every rename there is.
    expect(present(
      await entityStore.updateEntity(rival.id, {
        name: { display: RIVAL_SPELLING, norm: RENAMED_KEY },
      }),
      'updateEntity writing a row its own key back',
    )).toStrictEqual(rival);

    // THE KEY IS PER REGISTRY, and this is the request that says
    // so: the SAME rename, from a subject of the OTHER domain onto
    // the key this one holds, LANDS. An index over `name_norm`
    // alone would refuse it too, and every assertion above would
    // still read correct.
    const moved = present(
      await entityStore.updateEntity(outside.id, {
        name: { display: RENAMED, norm: RENAMED_KEY },
      }),
      'updateEntity renaming across registries onto a held key',
    );

    expect(moved.id).toBe(outside.id);
    expect(moved.nameNorm).toBe(rival.nameNorm);
    expect(moved.domainId).toBe(other.id);
    expect(rival.domainId).toBe(domain.id);

    // And the registry afterwards: the refused subject unmoved and
    // the rival spelled as its own accepted write spelled it.
    expect(present(
      await entityStore.findEntityById(subject.id),
      'the refused subject after the accepting controls',
    ).nameNorm).toBe(FIRST_KEY);
    expect(present(
      await entityStore.findEntityById(rival.id),
      'the rival after writing its own key back',
    ).name).toBe(RIVAL_SPELLING);
  });

  it('refuses deleting an entity an alias points at', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const target = await plantEntity(domain.id, TARGET_NAME, TARGET_KEY);
    const placeholder = await plantEntity(
      domain.id,
      PLACEHOLDER_NAME,
      PLACEHOLDER_KEY,
    );
    const loose = await plantEntity(domain.id, LOOSE_NAME, LOOSE_KEY);

    // The merge, written through the port rather than into the
    // table: `aliasOf` is the one pointer `PATCH /entities/:id`
    // sets, so the state the refusal below is about is the state
    // that surface produces.
    const aliased = present(
      await entityStore.updateEntity(placeholder.id, {
        aliasOf: target.id,
      }),
      'updateEntity pointing the placeholder at its subject',
    );

    expect(aliased.aliasOf).toBe(target.id);
    expect(target.aliasOf).toBeNull();

    // THE ACCEPTING CONTROL FIRST, so the refusal below is about
    // the alias rather than about deletes: a subject nothing points
    // at goes, through the same statement over the same table.
    await db.delete(entities).where(eq(entities.id, loose.id));

    expect(await entityStore.findEntityById(loose.id)).toBeNull();

    // `alias_of` EMITS `ON DELETE no action`, so the subject an
    // alias still names cannot go. No port declares a delete over
    // this table at all, so nothing translates the refusal and what
    // arrives is the driver error drizzle wrapped — which is also
    // what says the rule is the schema's rather than one a module
    // here could be edited out of.
    const raised = await raisedBy(
      () => db.delete(entities).where(eq(entities.id, target.id)),
      `the delete of entity ${TARGET_KEY}`,
    );
    const fields = driverFields(raised);

    expect(raised).not.toBeInstanceOf(StoreRefusal);
    expect(fields.code).toBe(FOREIGN_KEY_VIOLATION);
    expect(fields.constraint).toBe(ENTITY_ALIAS_FK);

    // BOTH ROWS STAND. A cascade would have taken the placeholder
    // with the subject it points at, discarding the one thing the
    // pointer was worth keeping: when the subject was first seen,
    // and under what it was first called.
    expect(await entityStore.findEntityById(target.id))
      .toStrictEqual(target);
    expect(await entityStore.findEntityById(placeholder.id))
      .toStrictEqual(aliased);

    // AND THE WAY OUT IS A DECISION SOMEBODY MAKES. Clearing the
    // pointer lets the delete land and leaves the placeholder
    // standing as a subject of its own — which is exactly the row
    // `ON DELETE SET NULL` would have written by itself, the
    // difference being that a person wrote it.
    expect(present(
      await entityStore.updateEntity(placeholder.id, { aliasOf: null }),
      'updateEntity clearing the alias back to null',
    ).aliasOf).toBeNull();

    await db.delete(entities).where(eq(entities.id, target.id));

    expect(await entityStore.findEntityById(target.id)).toBeNull();
    expect(present(
      await entityStore.findEntityById(placeholder.id),
      'the placeholder after its subject was deleted',
    ).nameNorm).toBe(PLACEHOLDER_KEY);

    // IT DOES NOT OBSTRUCT DROPPING THE WHOLE REGISTRY, which is
    // the end-of-statement check the column's reasoning rests on:
    // the cascade removes the alias and the subject it names inside
    // ONE statement, so the constraint finds nothing orphaned.
    const successor = await plantEntity(
      domain.id,
      SUCCESSOR_NAME,
      SUCCESSOR_KEY,
    );

    expect(present(
      await entityStore.updateEntity(placeholder.id, {
        aliasOf: successor.id,
      }),
      'updateEntity re-pointing the placeholder',
    ).aliasOf).toBe(successor.id);
    expect(await domainStore.deleteDomain(domain.id)).toBe(true);
    expect(await entityStore.findEntityById(successor.id)).toBeNull();
    expect(await entityStore.findEntityById(placeholder.id)).toBeNull();
  });

  it('refuses a research stamp until an approval lands', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const subject = await plantEntity(
      domain.id,
      TARGET_NAME,
      TARGET_KEY,
    );
    const intention = await plantPoolRow(domain.id, subject.id);
    const second = await plantPoolRow(domain.id, subject.id);

    // The state the case found, read through the port before
    // anything is written. An intention nobody has ruled on carries
    // neither timestamp, which is the open state the CHECK permits
    // and the one both directions below are measured from.
    const beforeEntity = present(
      await entityStore.findEntityById(subject.id),
      'findEntityById before the refused stamp',
    );

    expect(intention.status).toBe(PENDING_STATUS);
    expect(intention.approvedAt).toBeNull();
    expect(intention.researchedAt).toBeNull();
    expect(intention.searchTerms).toStrictEqual(POOL_TERMS);

    // DIRECTION ONE: A CLOSING STAMP ON AN UNAPPROVED ROW IS
    // REFUSED BY THE SERVER. Written straight through drizzle
    // because no port writes it — `EntityStore` ratifies and never
    // researches, and `approvePoolRow` cannot reach this CHECK from
    // either side, a write that only ever ADDS an approval being
    // unable to produce a row closed without one.
    const raised = await raisedBy(
      () => db.update(researchPool)
        .set({ researchedAt: RESEARCHED_AT })
        .where(eq(researchPool.id, intention.id)),
      'the research stamp on an unapproved intention',
    );
    const fields = driverFields(raised);

    expect(raised).not.toBeInstanceOf(StoreRefusal);
    expect(fields.code).toBe(CHECK_VIOLATION);
    expect(fields.constraint).toBe(POOL_APPROVAL_CHECK);

    // BOTH TABLES ARE AS THE CASE FOUND THEM, taken before any
    // accepting control issues a write of its own: the refusal is a
    // statement failing rather than a session, so the intention is
    // still open, the intention beside it untouched and the subject
    // both of them name unchanged.
    expect(await entityStore.findPoolRowById(intention.id))
      .toStrictEqual(intention);
    expect(await entityStore.findPoolRowById(second.id))
      .toStrictEqual(second);
    expect(await entityStore.findEntityById(subject.id))
      .toStrictEqual(beforeEntity);

    // DIRECTION TWO: THE SAME STAMP AFTER AN APPROVAL. The ruling
    // is the one `POST /entities/:id/approve-research` gives, taken
    // through the service that route calls, and it writes the two
    // columns `approvePoolRow` names and nothing else.
    const ruling = await approveEntityResearch(entityStore, subject.id, {
      poolId: intention.id,
    });

    expect(ruling.id).toBe(intention.id);
    expect(ruling.status).toBe(APPROVED_STATUS);
    expect(ruling.closedAt).toBeNull();

    const agreedAt = present(ruling.approvedAt, 'the ruling stamp');

    // The approval reached the addressed row and no other, so the
    // intention beside it is still open and still refuses the stamp
    // for the reason the first direction read.
    expect(present(
      await entityStore.findPoolRowById(second.id),
      'the intention nobody ruled on',
    ).approvedAt).toBeNull();

    await db.update(researchPool)
      .set({ researchedAt: RESEARCHED_AT })
      .where(eq(researchPool.id, intention.id));

    const closed = present(
      await entityStore.findPoolRowById(intention.id),
      'findPoolRowById after the accepted stamp',
    );

    expect(closed.researchedAt).toStrictEqual(RESEARCHED_AT);
    expect(closed.approvedAt).toStrictEqual(agreedAt);
    expect(closed.status).toBe(APPROVED_STATUS);

    // THE APPROVAL INSTANT IS THE SERVER'S AND `coalesce` KEEPS THE
    // FIRST ONE. Ruling again on a closed row is no refusal for a
    // ratification, and the stamp it answers is the instant the
    // first ruling settled on rather than this request's — a client
    // reading an instant older than the call it just made has found
    // the idempotence and not a fault.
    const again = await approveEntityResearch(entityStore, subject.id, {
      poolId: intention.id,
    });

    expect(again.approvedAt).toStrictEqual(agreedAt);
    expect(again.closedAt).toStrictEqual(RESEARCHED_AT);

    // And the control saying the clock MOVED between the two calls,
    // without which the line above is equally green over a server
    // stamping one constant: an intention ruled on afterwards
    // carries a LATER instant. Two calls through this port are two
    // transactions and `now()` is the transaction's start, which no
    // in-memory store can be made to produce.
    const later = await approveEntityResearch(entityStore, subject.id, {
      poolId: second.id,
    });
    const laterAt = present(later.approvedAt, 'the second ruling stamp');

    expect(laterAt.getTime()).toBeGreaterThan(agreedAt.getTime());
  });

  it('lists every pass and narrows to one domain', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const other = await plantDomain(TRANSIT, TRANSIT_NAME);

    // THE TICK IS PLANTED FIRST, which is what keeps every pass's
    // domain id different from its own id: `resetTables` restarts
    // both sequences at one, so a projection answering a pass its
    // OWN id as its domain is green through a fixture planted the
    // other way round.
    const tick = await plantRun(null, MIDDLE);
    const late = await plantRun(domain.id, LATE);
    const early = await plantRun(domain.id, EARLY);
    const outside = await plantRun(other.id, LATE);

    expect(tick.domainId).toBeNull();
    expect(late.domainId).toBe(domain.id);
    expect(outside.domainId).toBe(other.id);
    expect(late.id).not.toBe(late.domainId);
    expect(early.id).not.toBe(early.domainId);
    expect(outside.id).not.toBe(outside.domainId);

    const everything = await listRuns(passStore, undefined, WHOLE);
    const answered = idsOf(everything.rows);

    // `started_at` descending with `id` descending under it. The
    // two passes stamped alike are planted low-id-first, so the
    // tiebreak REVERSES the plant order rather than agreeing with
    // it; and the pass stamped in the middle carries a LOWER id
    // than the one stamped earliest, so the stamp key and the id
    // key beneath it answer different rows.
    expect(everything.total).toBe(4);
    expect(answered).toStrictEqual([
      outside.id,
      late.id,
      tick.id,
      early.id,
    ]);

    // The vacuity guards: the answer is none of the four orders a
    // read that forgot to order, or ordered by identity alone,
    // would have produced.
    const plantOrder = [tick.id, late.id, early.id, outside.id];

    expect(answered).not.toStrictEqual(plantOrder);
    expect(answered).not.toStrictEqual([...plantOrder].reverse());
    expect(answered).not.toStrictEqual([...answered].sort((l, r) => l - r));
    expect(answered).not.toStrictEqual([...answered].sort((l, r) => r - l));

    const tiedStamp = outside.startedAt.toISOString();

    expect(late.startedAt.toISOString()).toBe(tiedStamp);
    expect(outside.id).toBeGreaterThan(late.id);
    expect(answered.indexOf(outside.id) + 1)
      .toBe(answered.indexOf(late.id));

    // A NULL DOMAIN IS EXCLUDED BY THE COMPARISON AND NOT BY A
    // BRANCH. `domain_id = $1` is UNKNOWN on the tick, so it is out
    // of this page for the same reason it is out of any other
    // domain's — and it was IN the page above, which is the pair
    // that says the widening is an absent predicate rather than a
    // second query. The other domain's pass is stamped at the same
    // instant as this domain's newest, so a `WHERE` that stopped
    // narrowing puts a row of exactly the right shape at the head.
    const scoped = await listRuns(passStore, RADAR, WHOLE);

    expect(scoped.total).toBe(2);
    expect(idsOf(scoped.rows)).toStrictEqual([late.id, early.id]);
    expect(idsOf(scoped.rows)).not.toContain(tick.id);
    expect(idsOf(scoped.rows)).not.toContain(outside.id);

    // TWO PASSES OPENED BY ONE TICK TIE TO THE MICROSECOND, because
    // `started_at` defaults to `now()` and `now()` is the
    // TRANSACTION's start rather than the statement's. Planted the
    // way a deployment makes such a tie — two inserts inside one
    // transaction, no stamp written here — rather than by writing
    // one instant twice, and no in-memory store can be made to
    // produce it.
    await db.transaction(async (tx) => {
      const opening = {
        domainId: domain.id,
        status: RUN_STATUS,
        counts: {},
        scheduledBy: SCHEDULED_BY,
      };

      await tx.insert(runs).values(opening);
      await tx.insert(runs).values(opening);
    });

    const opened = await listRuns(passStore, RADAR, WHOLE);
    const planted = [late.id, early.id];
    const tied = opened.rows.filter((row) => !planted.includes(row.id));
    const newer = oneRow(tied, 'the newer of the tied passes');
    const older = oneRow(tied.slice(-1), 'the older of the tied passes');

    expect(opened.total).toBe(4);
    expect(tied).toHaveLength(2);
    expect(newer.startedAt.toISOString())
      .toBe(older.startedAt.toISOString());

    // And `id` is what separated them: the two sit adjacent
    // wherever the clock put the pair, the stamp key grouping them
    // and the tiebreak ordering them.
    const order = idsOf(opened.rows);

    expect(newer.id).toBeGreaterThan(older.id);
    expect(order.indexOf(newer.id) + 1).toBe(order.indexOf(older.id));
  });

  it('cuts a long ledger and reports the whole count', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const long = await plantRun(domain.id, EARLY);
    const brief = await plantRun(domain.id, MIDDLE);
    const silent = await plantRun(domain.id, LATE);

    // THE CAP IS DERIVED AND NEVER TRANSCRIBED, which is what
    // exporting it is for: a literal plant goes on reading as `past
    // the cap` after the cap moves above it, and the case then
    // answers nothing while staying green. The stamps ascend with
    // the ids, so which END the cut took is readable as a
    // membership rather than inferred from an order.
    const ledgered = RUN_LEDGER_CAP + LEDGER_OVERSHOOT;
    const bulk = Array.from(
      { length: ledgered },
      (_, index) => ({
        runId: long.id,
        node: LEDGER_NODE,
        model: null,
        promptChars: LEDGER_CHARS,
        estTokens: LEDGER_TOKENS,
        calledAt: new Date(DAY_ONE.getTime() + index * 1000),
      }),
    );

    await db.insert(llmCalls).values(bulk);

    // THE SCOPE CONTROLS SIT ON BOTH SIDES OF THE CUT, without
    // which an unscoped read answers the right page for the
    // fixture's reasons. This one is BELOW every row above and is
    // attributed to no pass at all, so it is unreachable from any
    // scoped page — `run_id = $1` is UNKNOWN on it — and it is the
    // COUNT that would report a read that stopped scoping.
    const loose = await plantCall(
      null,
      LEDGER_NODE,
      BELOW_WINDOW,
      UNATTRIBUTED_CHARS,
      UNATTRIBUTED_TOKENS,
    );

    // And these are ABOVE it, on a pass of the same domain: two
    // calls ledgered inside ONE transaction, which is how
    // `called_at` ties in a deployment. An unscoped page would
    // answer them at the long pass's head.
    await db.transaction(async (tx) => {
      await tx.insert(llmCalls).values({
        runId: brief.id,
        node: BEFORE_NODE,
        model: null,
        promptChars: LEDGER_CHARS,
        estTokens: LEDGER_TOKENS,
      });
      await tx.insert(llmCalls).values({
        runId: brief.id,
        node: AFTER_NODE,
        model: null,
        promptChars: LEDGER_CHARS,
        estTokens: LEDGER_TOKENS,
      });
    });

    const detail = await getRun(passStore, long.id);
    const answered = idsOf(detail.ledger);
    const head = oneRow(detail.ledger, 'the head of the long ledger');
    const tail = oneRow(detail.ledger.slice(-1), 'its oldest kept row');

    expect(detail.run.id).toBe(long.id);
    expect(detail.llmCallCount).toBe(ledgered);
    expect(detail.ledger).toHaveLength(RUN_LEDGER_CAP);
    expect(detail.ledgerTruncated).toBe(true);

    // NEWEST FIRST, SO THE CUT DROPPED THE OLDEST END. The kept ids
    // are a contiguous run ending at the newest, which says the cut
    // took the head of an ordering rather than an arbitrary subset
    // a read that forgot to order would have cut.
    expect(head.id - tail.id).toBe(RUN_LEDGER_CAP - 1);
    expect(answered).toStrictEqual([...answered].sort((l, r) => r - l));
    expect(head.calledAt.getTime())
      .toBeGreaterThan(tail.calledAt.getTime());
    expect(answered).not.toContain(tail.id - 1);
    expect(answered).not.toContain(loose);
    expect([...new Set(detail.ledger.map((row) => row.node))])
      .toStrictEqual([LEDGER_NODE]);

    // THE TRUNCATION FLAG IS LIVE ONLY WHERE THE TWO NUMBERS ARE
    // EQUAL: `llmCallCount > ledger.length` and `>=` answer alike
    // for the pass above and differently for these two, so a case
    // reading only a long ledger leaves the comparison itself
    // covered by nothing.
    const short = await getRun(passStore, brief.id);
    const newer = oneRow(short.ledger, 'the newer of the tied calls');
    const older = oneRow(short.ledger.slice(-1), 'the older of them');

    expect(short.llmCallCount).toBe(2);
    expect(short.ledger).toHaveLength(2);
    expect(short.ledgerTruncated).toBe(false);
    expect(newer.calledAt.toISOString())
      .toBe(older.calledAt.toISOString());
    expect(newer.id).toBeGreaterThan(older.id);

    // The scope control is genuinely above the cut, asserted rather
    // than assumed: these calls carry the server's clock and the
    // long pass's carry the fixture's.
    expect(newer.calledAt.getTime())
      .toBeGreaterThan(head.calledAt.getTime());

    const quiet = await getRun(passStore, silent.id);

    expect(quiet.ledger).toStrictEqual([]);
    expect(quiet.llmCallCount).toBe(0);
    expect(quiet.ledgerTruncated).toBe(false);

    // THE THREE COUNTS FALL SHORT OF THE TABLE BY EXACTLY ONE, and
    // that one is the call attributed to no pass. It is a partition
    // no single scoped read can report: every count above is
    // correct under a read that had stopped scoping too.
    const counted = await runStore.countRunLedger(long.id)
      + await runStore.countRunLedger(brief.id)
      + await runStore.countRunLedger(silent.id);
    const held = await db.select({ id: llmCalls.id }).from(llmCalls);

    expect(counted).toBe(ledgered + 2);
    expect(held).toHaveLength(ledgered + 3);
    expect(idsOf(held)).toContain(loose);
  });

  it('buckets the ledger by UTC day and not by session', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const other = await plantDomain(TRANSIT, TRANSIT_NAME);
    const radarPass = await plantRun(domain.id, EARLY);
    const transitPass = await plantRun(other.id, EARLY);
    const tick = await plantRun(null, EARLY);

    // The two straddling calls, one millisecond apart and on
    // different UTC days. Nothing but a day boundary separates
    // them, which is what makes the buckets below a reading about
    // the truncation rather than about the span.
    await plantCall(
      radarPass.id,
      BEFORE_NODE,
      BEFORE_MIDNIGHT,
      BEFORE_CHARS,
      BEFORE_TOKENS,
    );
    await plantCall(
      radarPass.id,
      AFTER_NODE,
      DAY_TWO,
      AFTER_CHARS,
      AFTER_TOKENS,
    );

    // A third call LATER on the second day, which separates a
    // truncation from a grouping by the raw instant: it joins that
    // midnight's bucket rather than opening one of its own. Nobody
    // measured it, so it is counted and not summed.
    await plantCall(radarPass.id, OTHER_NODE, LATER_ON_DAY_TWO, null, null);

    // The scope control's one call, and it is the bucket in which
    // NOTHING was measured — `sum()` over that answers NULL rather
    // than the zero a bare coercion would give.
    await plantCall(
      transitPass.id,
      OTHER_NODE,
      LATER_ON_DAY_TWO,
      null,
      null,
    );

    // The two rows the join has to keep: a pass belonging to no
    // domain, and a call belonging to no pass. Both land in the
    // null bucket, and an INNER join would drop only the second
    // while every bucket it did answer stayed right.
    await plantCall(
      tick.id,
      OTHER_NODE,
      LATER_ON_DAY_TWO,
      TICK_CHARS,
      TICK_TOKENS,
    );
    await plantCall(
      null,
      OTHER_NODE,
      LATER_ON_DAY_TWO,
      UNATTRIBUTED_CHARS,
      UNATTRIBUTED_TOKENS,
    );

    // And one below the window, so the narrowing has a row to drop.
    await plantCall(
      radarPass.id,
      OUTSIDE_NODE,
      BELOW_WINDOW,
      OUTSIDE_CHARS,
      OUTSIDE_TOKENS,
    );

    const zonedPool = createLivePool();

    try {
      const zonedDb = createLiveDb(zonedPool);

      // THE SESSION MOVES OFF UTC, which is the whole of what makes
      // this case a reading about the zone the store NAMES: the
      // two-argument `date_trunc` reads whatever `TimeZone` the
      // session carries, so on a session already at UTC a store
      // naming no zone answers every line below correctly.
      await zonedDb.execute(
        sql`select set_config('TimeZone', ${SESSION_ZONE}, false)`,
      );

      const setting = await zonedDb.execute(
        sql`select current_setting('TimeZone') as zone`,
      );

      expect(oneRow(setting.rows, 'the session zone')['zone'])
        .toBe(SESSION_ZONE);

      const zonedStore = {
        ...createDbDomainStore(() => zonedDb),
        ...createDbRunStore(() => zonedDb),
      };
      const summary = await summariseSpend(
        zonedStore,
        () => DAY_THREE,
        { since: DAY_ONE, until: DAY_THREE },
      );

      expect(summary.window.sinceInclusive).toStrictEqual(DAY_ONE);
      expect(summary.window.untilExclusive).toStrictEqual(DAY_THREE);

      // One assertion reads the order, the two UTC midnights, the
      // null bucket the join kept, the counted-but-unmeasured call
      // and the sum over nothing measured. `day` DESCENDING, then
      // `domain_id` ASCENDING with the null bucket last.
      expect(summary.buckets).toStrictEqual([
        {
          domainId: domain.id,
          day: DAY_TWO,
          calls: 2,
          promptChars: AFTER_CHARS,
          estTokens: AFTER_TOKENS,
        },
        {
          domainId: other.id,
          day: DAY_TWO,
          calls: 1,
          promptChars: null,
          estTokens: null,
        },
        {
          domainId: null,
          day: DAY_TWO,
          calls: 2,
          promptChars: TICK_CHARS + UNATTRIBUTED_CHARS,
          estTokens: TICK_TOKENS + UNATTRIBUTED_TOKENS,
        },
        {
          domainId: domain.id,
          day: DAY_ONE,
          calls: 1,
          promptChars: BEFORE_CHARS,
          estTokens: BEFORE_TOKENS,
        },
      ]);

      // AND THE SESSION WOULD HAVE SAID SOMETHING ELSE, counted in
      // this connection over these two planted rows. The named zone
      // puts them on two days and the session's puts them on one,
      // so the buckets above are held against what this server
      // would otherwise have answered rather than against a
      // sentence about zones.
      const rival = await zonedDb.execute(sql`
        select
          count(distinct date_trunc('day', called_at, 'UTC')) as named,
          count(distinct date_trunc('day', called_at)) as sessioned
        from llm_calls
        where node in (${BEFORE_NODE}, ${AFTER_NODE})
      `);
      const truncations = oneRow(rival.rows, 'the two truncations');

      expect(Number(truncations['named'])).toBe(2);
      expect(Number(truncations['sessioned'])).toBe(1);

      // THE PARTITION IS WHAT CATCHES AN INNER JOIN. Each narrowed
      // summary is correct under one; only the three adding up to
      // the unnarrowed total says the rows belonging to nobody were
      // kept.
      const scoped = await summariseSpend(
        zonedStore,
        () => DAY_THREE,
        { since: DAY_ONE, until: DAY_THREE, domain: RADAR },
      );
      const elsewhere = await summariseSpend(
        zonedStore,
        () => DAY_THREE,
        { since: DAY_ONE, until: DAY_THREE, domain: TRANSIT },
      );
      const nobody = summary.buckets.filter(
        (bucket) => bucket.domainId === null,
      );

      expect(callsIn(summary.buckets)).toBe(6);
      expect(callsIn(scoped.buckets)).toBe(3);
      expect(callsIn(elsewhere.buckets)).toBe(1);
      expect(callsIn(nobody)).toBe(2);
      expect(callsIn(scoped.buckets)
        + callsIn(elsewhere.buckets)
        + callsIn(nobody)).toBe(callsIn(summary.buckets));

      // The narrowing drops the domain-less rows by the comparison
      // rather than by a branch, exactly as the page above does.
      expect(scoped.buckets.map((bucket) => bucket.domainId))
        .toStrictEqual([domain.id, domain.id]);

      // The window is half-open and the call below it is out, which
      // is what says the span narrows at all: its magnitudes are
      // distinct from every other call's, so a bucket carrying them
      // would be visible in the totals above.
      const measured = summary.buckets.map(
        (bucket) => bucket.promptChars,
      );

      expect(measured).not.toContain(OUTSIDE_CHARS);

      // EVERY STATEMENT ABOVE RAN ON ONE CONNECTION. A session
      // setting is per connection, so a pool that had opened a
      // second one would have answered half this case at UTC while
      // every assertion still read plausibly.
      expect(zonedPool.totalCount).toBe(1);
    } finally {
      await zonedPool.end();
    }
  });

  it('refuses an applied stamp until an approval lands', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const feed = await plantSource(domain.id, FEED_ENDPOINT);
    const subject = await plantProposal(domain.id, feed.id, FIRST_PROPOSER);
    const beside = await plantProposal(domain.id, feed.id, SECOND_PROPOSER);

    // The state the case found, read through the port before
    // anything is written. A proposal nobody has ruled on carries
    // neither stamp, which is the open state the CHECK permits and
    // the one both directions below are measured from.
    expect(subject.status).toBe(PENDING_STATUS);
    expect(subject.approvedAt).toBeNull();
    expect(subject.appliedAt).toBeNull();
    expect(subject.sourceId).toBe(feed.id);

    // DIRECTION ONE: A CLOSING STAMP ON AN UNAPPROVED ROW IS
    // REFUSED BY THE SERVER. Written straight through drizzle
    // because no port writes it — `SourceStore` stamps the two
    // columns together inside one transaction and never one alone,
    // so this state is unreachable from every method it declares
    // and what arrives is the driver error drizzle wrapped.
    const raised = await raisedBy(
      () => db.update(sourceConfigProposals)
        .set({ appliedAt: WRITTEN_AT })
        .where(eq(sourceConfigProposals.id, subject.id)),
      'the application stamp on an unapproved proposal',
    );
    const fields = driverFields(raised);

    expect(raised).not.toBeInstanceOf(StoreRefusal);
    expect(fields.code).toBe(CHECK_VIOLATION);
    expect(fields.constraint).toBe(PROPOSAL_APPROVAL_CHECK);

    // BOTH TABLES ARE AS THE CASE FOUND THEM, taken before any
    // accepting control issues a write of its own: the refusal is a
    // statement failing rather than a session, so the proposal is
    // still open, the proposal beside it untouched and the feed
    // both of them name unchanged.
    expect(await sourceStore.findProposalById(subject.id))
      .toStrictEqual(subject);
    expect(await sourceStore.findProposalById(beside.id))
      .toStrictEqual(beside);
    expect(await sourceStore.findSourceById(feed.id)).toStrictEqual(feed);

    // DIRECTION TWO: THE SAME STAMP AFTER AN APPROVAL. Written the
    // way `scripts/approve.ts` writes one — an approval with no
    // application is the state that CLI deliberately leaves behind,
    // so this is the row a terminal operator makes rather than a
    // shape invented for the case.
    await db.update(sourceConfigProposals)
      .set({ approvedAt: AGREED_AT })
      .where(eq(sourceConfigProposals.id, subject.id));
    await db.update(sourceConfigProposals)
      .set({ appliedAt: WRITTEN_AT })
      .where(eq(sourceConfigProposals.id, subject.id));

    const closed = present(
      await sourceStore.findProposalById(subject.id),
      'findProposalById after the accepted stamp',
    );

    expect(closed.approvedAt).toStrictEqual(AGREED_AT);
    expect(closed.appliedAt).toStrictEqual(WRITTEN_AT);

    // THE CHECK READS THE TWO STAMPS AND THE QUEUE READS THE
    // STATUS, and this row is what says the two rules are about
    // different columns rather than two readings of one gate: it is
    // approved and applied, its status never moved, and it is still
    // in the queue an operator is shown.
    const queue = await listPendingConfigs(sourceStore, feed.id, WHOLE);

    expect(closed.status).toBe(PENDING_STATUS);
    expect(queue.total).toBe(2);
    expect(idsOf(queue.rows)).toStrictEqual([subject.id, beside.id]);

    // And the approval alone is not an application: the row beside
    // it takes an approval and still refuses nothing, which is the
    // accepting half of the pair — without it the refusal above is
    // satisfied by a column that refuses every write there is.
    await db.update(sourceConfigProposals)
      .set({ approvedAt: AGREED_AT })
      .where(eq(sourceConfigProposals.id, beside.id));

    expect(present(
      await sourceStore.findProposalById(beside.id),
      'the proposal ruled on but not applied',
    ).appliedAt).toBeNull();
  });

  it('approves and applies in one transaction', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const feed = await plantSource(domain.id, FEED_ENDPOINT);
    const other = await plantSource(domain.id, OTHER_ENDPOINT);
    const first = await plantProposal(domain.id, feed.id, FIRST_PROPOSER);
    const elsewhere = await plantProposal(
      domain.id,
      other.id,
      OUTSIDE_PROPOSER,
    );

    // Two proposals written inside ONE transaction tie on
    // `proposed_at` to the microsecond, `now()` being the
    // transaction's start. A tie spanning a page boundary would let
    // two pages disagree about which row they hold, with nothing in
    // either response saying so, and `id` ASCENDING closes it —
    // ascending so the tiebreak reads the same direction as the
    // sort.
    const tied = await db.transaction(async (tx) => {
      const values = {
        domainId: domain.id,
        sourceId: feed.id,
        parserConfig: PROPOSED_CONFIG,
        contract: PROPOSED_CONTRACT,
      };
      const opened = await tx.insert(sourceConfigProposals)
        .values({ ...values, proposedBy: SECOND_PROPOSER })
        .returning({ id: sourceConfigProposals.id });
      const closed = await tx.insert(sourceConfigProposals)
        .values({ ...values, proposedBy: THIRD_PROPOSER })
        .returning({ id: sourceConfigProposals.id });

      return [
        oneRow(opened, 'the first of the tied proposals').id,
        oneRow(closed, 'the second of the tied proposals').id,
      ];
    });
    const tiedEarly = oneRow(tied, 'the lower of the tied ids');
    const tiedLate = oneRow(tied.slice(-1), 'the higher of them');
    const queue = await listPendingConfigs(sourceStore, feed.id, WHOLE);
    const head = oneRow(queue.rows, 'the head of the queue');
    const middle = oneRow(queue.rows.slice(1), 'its second row');
    const tail = oneRow(queue.rows.slice(-1), 'its last row');

    // OLDEST FIRST, because a gate is about what has been waiting
    // longest — the opposite of the failures queue one table over
    // and the right way round for the same reason.
    expect(queue.total).toBe(3);
    expect(idsOf(queue.rows))
      .toStrictEqual([first.id, tiedEarly, tiedLate]);
    expect(head.proposedAt.getTime())
      .toBeLessThan(middle.proposedAt.getTime());
    expect(middle.proposedAt.toISOString())
      .toBe(tail.proposedAt.toISOString());
    expect(middle.id).toBeLessThan(tail.id);

    // The scope: the other feed's proposal is in neither this
    // queue's page nor its count, so a read that stopped narrowing
    // answers a row of exactly the right shape here.
    const outside = await listPendingConfigs(sourceStore, other.id, WHOLE);

    expect(outside.total).toBe(1);
    expect(idsOf(outside.rows)).toStrictEqual([elsewhere.id]);
    expect(idsOf(queue.rows)).not.toContain(elsewhere.id);

    // THE RULING THE ROUTE GIVES, taken through the service
    // `POST /sources/:id/approve-config` calls.
    const ruling = await approveSourceConfig(
      sourceStore,
      feed.id,
      { proposalId: first.id },
    );
    const agreedAt = present(ruling.approvedAt, 'the approval stamp');
    const writtenAt = present(ruling.closedAt, 'the application stamp');

    expect(ruling.id).toBe(first.id);
    expect(ruling.status).toBe(APPROVED_STATUS);

    // ONE TRANSACTION IS READABLE FROM THE TWO STAMPS IT WROTE.
    // `now()` is the transaction's start, so the approval statement
    // 1 wrote and the application statement 3 wrote carry the
    // IDENTICAL instant — which is the only evidence anywhere that
    // the three statements were one transaction rather than three
    // calls, and something no in-memory store can be made to
    // produce. The control keeping it from being green over a
    // server stamping one constant is the plant's own stamp, made
    // in an earlier transaction and strictly older.
    expect(writtenAt.toISOString()).toBe(agreedAt.toISOString());
    expect(agreedAt.getTime())
      .toBeGreaterThan(head.proposedAt.getTime());

    const applied = present(
      await sourceStore.findSourceById(feed.id),
      'findSourceById after the ruling',
    );
    const stored = present(
      await sourceStore.findProposalById(first.id),
      'findProposalById after the ruling',
    );

    // THE TWO DOCUMENTS COME BACK AS THE COLUMN HOLDS THEM AND NOT
    // AS THE FIXTURE WROTE THEM. jsonb normalises key order, so the
    // arrangement planted here is answered with its members in a
    // different order while being the same value — and the feed
    // afterwards carries THAT spelling. A structural equality is
    // equally green over an applier that copied this file's own
    // object across; the two renderings are what say the documents
    // travelled through the server.
    expect(applied.parserConfig).toStrictEqual(PROPOSED_CONFIG);
    expect(applied.contract).toStrictEqual(PROPOSED_CONTRACT);
    expect(JSON.stringify(applied.parserConfig))
      .toBe(JSON.stringify(stored.parserConfig));
    expect(JSON.stringify(applied.parserConfig))
      .not.toBe(JSON.stringify(PROPOSED_CONFIG));
    expect(JSON.stringify(applied.contract))
      .not.toBe(JSON.stringify(PROPOSED_CONTRACT));

    // AND NO OTHER COLUMN MOVED, which is a whole-row diff and
    // nothing weaker: the feed as it stands, with the two written
    // columns put back to the empty arrangement it was planted
    // with, is the row this case planted.
    expect({ ...applied, parserConfig: {}, contract: {} })
      .toStrictEqual(feed);
    expect(await sourceStore.findSourceById(other.id)).toStrictEqual(other);

    // The proposal afterwards carries what the ruling reported, and
    // the queue is one row shorter: the status moved, so the gate's
    // own backlog is what an operator is still owed.
    const after = await listPendingConfigs(sourceStore, feed.id, WHOLE);

    expect(stored.status).toBe(APPROVED_STATUS);
    expect(stored.approvedAt).toStrictEqual(agreedAt);
    expect(stored.appliedAt).toStrictEqual(writtenAt);
    expect(after.total).toBe(2);
    expect(idsOf(after.rows)).toStrictEqual([tiedEarly, tiedLate]);

    // A second ruling, on a second row, stamps its own pair the
    // same way — the equality above is a property of the write
    // rather than of the row it landed on.
    const again = await approveSourceConfig(
      sourceStore,
      feed.id,
      { proposalId: tiedEarly },
    );
    const laterAgreed = present(again.approvedAt, 'the second approval');
    const laterWritten = present(again.closedAt, 'its application');

    expect(laterWritten.toISOString()).toBe(laterAgreed.toISOString());
    expect(laterAgreed.getTime())
      .toBeGreaterThanOrEqual(agreedAt.getTime());
  });

  it('leaves both tables as found when an apply fails', async () => {
    const domain = await plantDomain(RADAR, RADAR_NAME);
    const feed = await plantSource(domain.id, FEED_ENDPOINT);
    const subject = await plantProposal(domain.id, feed.id, FIRST_PROPOSER);
    const shadowPool = createLivePool();

    try {
      const shadowDb = createLiveDb(shadowPool);

      // A TEMP TABLE SHADOWING `sources` ON THIS CONNECTION ALONE,
      // which is the only way to read the atomicity: every refusal
      // the real schema can raise is out of that transaction's
      // reach by construction, per the port. The temp schema leads
      // the search path, so the store's second statement meets this
      // copy — carrying the same row and a CHECK refusing the write
      // — while its first and third meet the REAL proposal.
      await shadowDb.execute(sql`
        create temp table sources as
          select * from public.sources where id = ${feed.id}
      `);
      await shadowDb.execute(sql.raw(
        `alter table sources add constraint ${SHADOW_CHECK} `
        + 'check (parser_config = jsonb_build_object())',
      ));

      const shadowStore = createDbSourceStore(() => shadowDb);
      const refusal = await refusalFrom(
        () => shadowStore.approveAndApplyProposal(subject.id),
      );

      // The constraint name is what attributes the refusal: no
      // table in this deployment carries it, so the statement met
      // the copy rather than the table.
      expect(refusal.reason).toBe('check-violation');
      expect(refusal.constraint).toBe(SHADOW_CHECK);

      const shadowRow = await shadowDb.execute(sql`
        select parser_config from sources where id = ${feed.id}
      `);

      expect(oneRow(shadowRow.rows, 'the shadow row')['parser_config'])
        .toStrictEqual({});

      // EVERY STATEMENT ABOVE RAN ON ONE CONNECTION. A temp table
      // is per connection, so a pool that had opened a second one
      // would have run the store against the REAL table and this
      // case would have read an approval that landed.
      expect(shadowPool.totalCount).toBe(1);
    } finally {
      await shadowPool.end();
    }

    // THE ROLLBACK TOOK THE APPROVAL WITH IT. Statement 1 stamped
    // the real proposal and statement 2 was refused, so what is
    // left is the row this case planted — unruled, its status
    // unmoved, and the feed it names untouched. That is the state
    // the request can be made from a second time, which is what the
    // port claims and what nothing else here can check.
    expect(await sourceStore.findProposalById(subject.id))
      .toStrictEqual(subject);
    expect(await sourceStore.findSourceById(feed.id)).toStrictEqual(feed);

    // And it IS made a second time, which is the control saying the
    // refusal was about the shadow rather than about approvals: the
    // same request through the same service over the real table
    // lands, and the arrangement reaches the feed.
    const ruling = await approveSourceConfig(
      sourceStore,
      feed.id,
      { proposalId: subject.id },
    );
    const applied = present(
      await sourceStore.findSourceById(feed.id),
      'findSourceById after the second attempt',
    );

    expect(ruling.status).toBe(APPROVED_STATUS);
    expect(ruling.approvedAt).not.toBeNull();
    expect(ruling.closedAt).not.toBeNull();
    expect(applied.parserConfig).toStrictEqual(PROPOSED_CONFIG);
    expect(applied.contract).toStrictEqual(PROPOSED_CONTRACT);
  });

});
