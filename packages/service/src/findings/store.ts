/**
 * @packageDocumentation
 * The `FindingStore` port — every database operation the findings
 * surface performs, declared as an interface so that the asking is
 * separable from Postgres.
 *
 * THE PORT DECIDES NOTHING, exactly as `src/domains/store.ts`,
 * `src/topics/store.ts`, `src/sources/store.ts` and
 * `src/connectors/store.ts` state for their own surfaces. An unknown
 * domain slug, an unknown finding id, a verdict outside the owning
 * domain's ladder, a category key the domain never declared: none of
 * those are facts about Postgres. They are decisions taken about
 * rows, and a decision about rows can be driven by anything that
 * supplies rows. So the isolated suite puts
 * `tests/helpers/memory-research-store.ts` behind this interface and
 * a deployment puts `./db-store.ts` behind it, both answering one
 * contract, and the live suite is left proving only that real
 * Postgres agrees.
 *
 * ONE METHOD WRITES, AND IT IS
 * {@link FindingStore.insertFindingLabel}. The other six read. That
 * is the whole of this port's write surface — there is no insert of
 * a finding, no patch of one, no delete of one, and no second write
 * anywhere below — and it is a property of the interface rather
 * than a promise a handler keeps. A handler cannot re-score a
 * finding by mistake or by a later edit, because there is nothing on
 * the store to call.
 *
 * NOTHING HERE WRITES `score` OR `score_version`. Both are ANSWERED,
 * by {@link FindingRecord}, because the page is ordered on the first
 * of them and a reader shown a ranking is owed the number it was
 * ranked by. Neither is accepted anywhere: there is no patch type on
 * this port at all, so there is no member for a score to arrive
 * through, and {@link InsertFindingLabelInput} names the three
 * columns of a ruling and nothing else.
 *
 * `docs/architecture/08-http-api.md` states that read-first law for
 * the whole wave and `tests/invariants/api-read-first.test.ts`
 * derives it from `keyof` over these types rather than from either
 * paragraph, so a second writer added below fails the invariant
 * naming itself.
 *
 * NOTHING HERE INVOKES A WORKFLOW, opens a run, closes one, or
 * appends to `llm_calls`. `ar-score` writes the two score columns,
 * `ar-ingest` and `ar-capture` write the findings themselves, and
 * `ar-research` writes the research this port reads — this surface
 * reads what those passes produced and records what an operator made
 * of it. `run-now` on the topics and sources groups remains the only
 * spelling on the whole API that causes work, and it causes it by
 * setting a schedule column rather than by calling anything.
 *
 * A RULING IS APPENDED, NEVER UPDATED, and that is the table's shape
 * rather than this port's preference. `finding_labels` carries no
 * unique key at all, so a second ruling on one finding is a second
 * row, and the verdict in force is the newest of them by
 * `labelled_at` with `id` breaking the tie. There is no
 * `updateFindingLabel` below and there is no upsert: an UPDATE would
 * destroy the only thing on this table that nothing recomputes,
 * since re-scoring rebuilds findings over a corpus nothing
 * re-fetched and nothing rebuilds what a person concluded.
 *
 * THE VERDICT VOCABULARY IS NOT THIS PORT'S, and no method below
 * consults one. `finding_labels.verdict` is the one NOT NULL text
 * column in schema v2 constrained to a value set and carrying no
 * CHECK for it, because the set is `DomainSettings.verdictVocabulary`
 * on the OWNING domain's row and differs per domain. So this port
 * stores the string it is handed, `./verdict-service.ts` is what
 * reads the domain and judges it, and an implementation refusing a
 * verdict on its own would move a per-domain rule into the half of
 * the module that cannot be exercised without a database. The
 * honest consequence is stated rather than left to be met: nothing
 * below refuses a verdict outside any ladder, so the judging binds
 * exactly the caller that runs it.
 *
 * EVERY REFUSAL CROSSES THIS PORT AS A `StoreRefusal` — the error
 * `src/db/store-errors.ts` declares — AND AS NOTHING ELSE. A method
 * below either answers or throws that one type: no implementation
 * raises a driver error, a SQLSTATE, a constraint name a caller
 * never chose, or an error class of its own. That is what lets
 * `./service.ts` catch one thing and switch over a closed reason
 * set, and it is why the in-memory implementation has to refuse what
 * Postgres refuses rather than accept it. A fake that admits what
 * the database rejects is a second contract, agreeing right up until
 * the deployment that does not.
 *
 * EXACTLY ONE KEY CAN FIRE, and it is on the one write.
 * `finding_labels_finding_id_findings_id_fk` refuses a ruling on a
 * finding that is not there, as a `foreign-key-violation`, and it is
 * the only mechanism {@link FindingStore.insertFindingLabel} can
 * reach: the table carries no unique key, no CHECK and no trigger,
 * and its primary key is a `bigserial` no input type here supplies.
 * The six reads reach nothing at all, so none of them documents a
 * throw.
 *
 * That refusal is a RACE rather than the ordinary path. The service
 * resolves the finding through
 * {@link FindingStore.findFindingById} first and answers a `404` from
 * the null, so the key fires only when the finding is deleted between
 * the two calls — which the delete's own cascade would take the
 * ruling with anyway. The method declares the throw for exactly that
 * reason, on the terms `ConnectorStore.deleteConnector` states for
 * its own counted-then-refused pair.
 *
 * THE LIST ORDER IS `compareFindings` EXPRESSED IN SQL, and the two
 * are one rule checked from two sides rather than two orders free to
 * disagree. `src/lib/digest-assemble.ts` exports the comparator the
 * digest selection and every renderer already agree on — score
 * descending with an ABSENT score sorting LAST rather than lowest,
 * then `created_at` descending, then `id` descending — and
 * `findings_domain_id_score_created_at_idx` is those four columns in
 * that order. `./service.test.ts` holds a page this port answered
 * against `orderFindings` over the same rows, so neither authority
 * can move without the other reporting it.
 *
 * WHICH MEANS THE `NULLS LAST` IS PART OF THE CONTRACT rather than a
 * detail of one implementation. A pathkey carries its nulls
 * ordering and the Postgres planner matches it literally, so a store
 * writing a bare `DESC` on any of the three descending keys puts a
 * `Sort` above the index scan and nothing reports it — measured on
 * Postgres 16 against this exact key, where the fully qualified
 * spelling plans as an index-only scan and a bare `DESC` throughout
 * degrades to a full sort over a bitmap scan. That `created_at` and
 * `id` are NOT NULL does not save the shorter spelling: nothing in
 * the planner reads the constraint to decide the two are equivalent.
 * The index's own TSDoc in `src/db/schema/findings.ts` carries the
 * measurement in full.
 *
 * A FINDING'S CATEGORY IS A MEMBER OF `fields`, AND NO COLUMN LINKS
 * THE TWO. Nothing in the schema joins a finding to a category:
 * `ar-digest` reads the member `FINDING_CATEGORY_FIELD` names off the
 * reduced payload by own key alone and matches it against
 * `categories.key`, and {@link FindingFilter.category} is that same
 * member and nothing else. So the filter is a jsonb read rather than
 * a join, a key the domain does not declare is an empty page rather
 * than a `404`, and the index above cannot narrow it — a filtered
 * page walks the domain's entries in the order it declares and
 * discards what does not match.
 *
 * THIS PORT READS ONE TABLE IT DOES NOT OWN.
 * {@link FindingStore.listFindingResearch} answers `entity_research`
 * rows, resolved through the finding's own `entity_id`, so a
 * `GET /findings/:id` can show what a research pass found out about
 * the subject beside the finding that named it. It READS them and
 * writes nothing there: `entity_research` is `ar-research`'s to
 * write, `src/entities/store.ts` is where that table's own
 * collection read lives, and two ports over one table is the
 * arrangement `SourceStore`'s failures queue and `DocumentStore`
 * already take over `documents`.
 *
 * NO METHOD RESOLVES OR DELETES A DOMAIN, which is the division of
 * labour every domain-scoped port here keeps.
 * `DomainStore.findDomainBySlug` turns `:slug` into the id
 * {@link FindingStore.listFindings} takes, before this port is
 * called, so an unknown slug is a `404` decided one layer up and
 * never an empty page. Nothing below deletes anything, so the
 * cascade that takes a domain's findings with it — and their
 * sightings and labels after them — is reached through
 * `DomainStore` and is not expressible here.
 */
import type { StoreWindow, TimeWindow } from '../http/schemas.js';

/**
 * One `findings` row, whole — the seven columns the table declares
 * beyond its key, and no eighth.
 *
 * Whole rather than column-scoped, for the reason `DomainRecord` in
 * `src/domains/store.ts` gives: there is nothing on `findings` a
 * reader of this port may not have. What a reader of the API may
 * have is a different question and this port does not take it — the
 * masking rule two surfaces over, on `ConnectorRecord.config`, is
 * the shape of a record that would have needed one, and no column
 * here holds a credential.
 *
 * THE TWO SCORE COLUMNS ARE ANSWERED AND NEVER ACCEPTED, which is
 * the module header's read-first claim expressed as a record. They
 * are here because the page is ordered on the first of them and a
 * reader shown a ranking is owed the number behind it; there is no
 * patch type on this port for either to arrive through.
 */
export interface FindingRecord {
  /**
   * `findings.id`, and the last tiebreak on both orderings this
   * port offers.
   */
  readonly id: number;

  /**
   * The domain whose criteria produced this finding, and the scope
   * every collection read below is taken within.
   *
   * Answered rather than implied, though
   * {@link FindingStore.listFindings} was handed it: a single get
   * takes no domain at all — `GET /findings/:id` addresses the
   * finding — so this member is how that reader learns which
   * domain's taxonomy and weights the row was made under.
   */
  readonly domainId: number;

  /**
   * The document this finding was read out of. NOT NULL on the
   * table, because a finding is a reading OF something.
   *
   * An id rather than the document itself. `documents.body` is the
   * stored untrusted text `src/documents/` masks and cuts, and a
   * findings page embedding one would be answering a corpus through
   * a collection that never declared a cap for it.
   */
  readonly documentId: number;

  /**
   * The entity this finding is about, or null when it is about
   * none.
   *
   * NULL IS AN ORDINARY STATE rather than an edge case: a finding
   * nobody could attribute still scored and is still read. It is
   * also what makes {@link FindingStore.listFindingResearch} answer
   * an empty list for some findings rather than fail — there is no
   * entity to resolve research through, which is not a failure to
   * read.
   */
  readonly entityId: number | null;

  /**
   * Everything this domain needs beyond the neutral columns, keyed
   * by field name, AS STORED.
   *
   * `Record<string, unknown>` because that is what the column
   * infers and as much as holds across every domain: the keys come
   * from `DomainSettings.fieldContract` on the owning domain rather
   * than from this schema, so one interface across all of them would
   * describe none of them. Possibly empty, never absent — the
   * column defaults to `{}` — and a finding carrying no extra
   * fields and one whose fields were never written come to the same
   * thing for every reader.
   *
   * {@link FindingFilter.category} reads one member of this payload
   * and nothing else reads any of it. The rest travels to the wire
   * whole, which is why `tests/api/request-echo.test.ts` treats a
   * findings response as a containment window: an open record is a
   * place a submitted key could otherwise come back from.
   */
  readonly fields: Record<string, unknown>;

  /**
   * How this finding scored against its domain's criteria, or null
   * when nothing has scored it.
   *
   * `number | null` because the column is `numeric` read in
   * `number` mode: the exactness that matters is kept where the
   * comparisons that matter happen, which is the SQL a
   * threshold or an ordering runs in.
   *
   * NULL IS NOT ZERO and the ordering says so. An absent score
   * sorts LAST rather than lowest, per `compareFindings`, because a
   * finding nothing has read is not a finding read and found
   * worthless. `src/db/schema/findings.ts` argues that at the
   * column at length; this member is the reason the argument reaches
   * the wire.
   */
  readonly score: number | null;

  /**
   * Which scoring version produced the number above, or null when
   * nothing has scored it.
   *
   * The finding's half of a pin: a stored score is stale exactly
   * when this is behind the version the scorer is at, and that is a
   * comparison nobody can make unless it was recorded at the time.
   * The other half belongs to `ar-score` and is not a column in this
   * schema, so this port answers the recorded number and compares it
   * with nothing.
   */
  readonly scoreVersion: number | null;

  /**
   * When this finding was made, which is when a document was read
   * into one — not when the document was captured and not when its
   * source published it.
   *
   * The second key on both orderings, and what
   * {@link FindingFilter.window} bounds. It defaults to `now()`,
   * which is the TRANSACTION's start time, so findings written by
   * one pass tie to the microsecond and `id` is the only thing
   * separating them.
   */
  readonly createdAt: Date;
}

/**
 * One `finding_sightings` row, whole: where a finding has been seen.
 *
 * A DUPLICATE IS EVIDENCE RATHER THAN NOISE, which is the whole
 * reason these rows exist. An item four feeds carry reads
 * differently from one that turned up in a single place, so
 * convergence keeps ONE finding and records each sighting against
 * it. `src/db/schema/findings.ts` carries why nothing else in the
 * schema can hold that.
 *
 * `findingId` is answered though the caller supplied it, unlike
 * `SourceFailureRecord` in `src/sources/store.ts`, which omits the
 * `source_id` its caller named. These rows are embedded in a single
 * finding's answer rather than paged on their own, so the member is
 * what lets a reader — and a live case — see that the rows
 * answered are the addressed finding's, at no cost.
 */
export interface FindingSightingRecord {
  /** `finding_sightings.id`. */
  readonly id: number;

  /** The finding this sighting is of. */
  readonly findingId: number;

  /**
   * The feed this finding was seen at. NOT NULL on the table, where
   * `documents.source_id` is nullable, because this row IS the
   * statement that something was seen at a feed.
   */
  readonly sourceId: number;

  /**
   * The source's own id for the item behind this finding, or null
   * when the source publishes none.
   *
   * Not to be confused with `sourceId` above, which is this
   * schema's key into `sources`. NULL is ordinary rather than
   * exceptional — a feed may offer nothing more stable than a URL
   * — and it is also the state under which the table's natural key
   * does not fire, so an id-less source's sightings can accumulate
   * one per poll. That is a fact about what the count MEANS rather
   * than something this port can repair.
   */
  readonly externalId: string | null;

  /**
   * When the pipeline saw this finding at this source — not when
   * the source published the item, which nothing here records.
   *
   * Which of a finding's sightings at one feed the stamp stands for
   * is the writer's choice rather than the schema's, so a reader
   * taking this column for "still carried by the source" reports a
   * feed as current on the strength of a sighting made once.
   */
  readonly seenAt: Date;
}

/**
 * One `finding_labels` row, whole: what an operator made of a
 * finding.
 *
 * THE ONLY ROWS IN THIS GROUP A PERSON WRITES. Plenty in this schema
 * is authored — the taxonomy, the personas, a domain's settings —
 * but all of that is input the pipeline consumes, and these are the
 * only rows holding a person's reading of what it produced.
 *
 * A FINDING MAY CARRY SEVERAL, and neither the table nor this port
 * orders them for a reader who does not ask.
 * {@link FindingStore.listFindingLabels} orders newest first and
 * says so; a reader that took any single row from an unordered read
 * would be reporting whichever one the scan reached first, with
 * nothing raised and no guarantee it reaches the same one twice.
 */
export interface FindingLabelRecord {
  /**
   * `finding_labels.id`, and the tiebreak that makes the
   * latest-verdict lookup an answer rather than a coin flip: two
   * rulings written in one transaction carry the same
   * `labelled_at` to the microsecond.
   */
  readonly id: number;

  /** The finding this judgement is about. */
  readonly findingId: number;

  /**
   * The operator's ruling, AS STORED.
   *
   * `string` rather than a union, and that is the module header's
   * vocabulary claim expressed as a member. The accepted set is
   * `DomainSettings.verdictVocabulary` on the owning domain's row,
   * so a union here would re-close in the code exactly what the
   * column deliberately leaves open, and every consumer written
   * against it would refuse the verdicts of any domain that had
   * exercised its own ladder. It would also be a lie about rows
   * already stored: a label made under a vocabulary since narrowed
   * reads back unchanged.
   */
  readonly verdict: string;

  /**
   * Whatever the operator wanted to say about the verdict, in their
   * own words, or null when they said nothing.
   *
   * NULL is the ordinary case rather than a gap. There is no writer
   * but a person here, so an absent note is a person having written
   * none, and the two states a default of `''` would keep apart do
   * not exist.
   */
  readonly note: string | null;

  /**
   * When the judgement was made, which is when the row was written.
   *
   * What orders a finding's labels, and with no unique key on the
   * table it is the only thing that does. The ordering is total in
   * practice and not by construction — `now()` is the
   * transaction's start time — which is why `id` sits beside it in
   * every ordering this port declares over these rows.
   */
  readonly labelledAt: Date;
}

/**
 * One `entity_research` row as the findings surface answers it: what
 * a research pass found out about the subject a finding names.
 *
 * A TABLE THIS PORT READS AND DOES NOT OWN, on the terms
 * `SourceFailureRecord` in `src/sources/store.ts` reads `documents`.
 * `src/entities/store.ts` declares its own record over the same
 * table for the windowed collection `GET /entities/:id/research`
 * serves; this one is the un-windowed list embedded in a single
 * finding, resolved through {@link FindingRecord.entityId}. Two
 * ports over one table is the arrangement rather than an oversight,
 * and neither writes it — `ar-research` does.
 *
 * `entityId` IS ANSWERED THOUGH NO CALLER SUPPLIED IT, which is what
 * separates this record from the two above. The join is this port's:
 * a caller names a FINDING and the entity is resolved from it, so
 * the member is the answer to whose research this is rather than an
 * echo of something the request carried.
 */
export interface FindingResearchRecord {
  /** `entity_research.id`, and the tiebreak on the order below. */
  readonly id: number;

  /**
   * The entity this research is about, which is
   * {@link FindingRecord.entityId} resolved by this port rather
   * than named by a caller.
   */
  readonly entityId: number;

  /**
   * The run this pass belonged to, or null when it belonged to
   * none.
   *
   * Nullable on the table, so research recorded outside a run is an
   * ordinary row. Answered as an id rather than as the run itself:
   * `src/runs/store.ts` is where a run is met, and embedding one
   * here would put a second authority on what a run is.
   */
  readonly runId: number | null;

  /**
   * What the pass concluded in prose, or null when it recorded
   * none.
   *
   * Stored untrusted text in the same sense a document body is: it
   * is whatever a model wrote. Answered here AS STORED — the
   * masking rule this repository holds for such values lives at the
   * service, per {@link FindingStore} on the port-answers-rows
   * split.
   */
  readonly summary: string | null;

  /**
   * Whatever else the pass recorded, keyed however the pass keyed
   * it.
   *
   * `unknown` rather than a shape, which is what the column infers:
   * it carries no `$type`, deliberately, because what belongs inside
   * varies by domain and one interface across all of them would
   * describe none of them. `ConnectorRecord.config` in
   * `src/connectors/store.ts` takes the same view of the same kind
   * of column, for the same reason and with a credential at stake
   * where there is none here.
   */
  readonly payload: unknown;

  /**
   * When this research was recorded, and what orders it.
   *
   * The honest limit is which moment it names: the column defaults
   * to the write, so a pass that searched at one time and persisted
   * five minutes later is dated by the second.
   */
  readonly researchedAt: Date;
}

/**
 * What narrows a domain's findings: a verdict, a category, a window
 * over when they were made, or any combination of the three.
 *
 * A VALUE OBJECT RATHER THAN THE QUERY THE ROUTE PARSED, which is
 * the same separation `StoreWindow` draws from `PaginationQuery` and
 * `TimeWindow` from `TimeWindowQuery`: one is what a caller asked
 * for and the other is what SQL is handed. `./routes.ts` rebuilds
 * this shape member by member rather than forwarding a parsed query,
 * so a parameter added to the wire reaches this port only when
 * somebody adds it here too.
 *
 * NO MEMBER IS A SCOPE. The domain is a separate leading parameter
 * on both methods that take a filter, because a domain names an
 * OWNER and every member here narrows a collection that is already
 * scoped — `ConnectorFilter` in `src/connectors/store.ts` draws
 * exactly that line from the other side, having a filter and no
 * owner at all. An omitted member widens; the domain cannot be
 * omitted.
 *
 * THE FILTER CARRIES NO ORDERING. {@link FindingSort} is a separate
 * parameter on the list, so {@link FindingStore.countFindings}
 * cannot be handed an ordering it would have to ignore — which is
 * the shape an implementation comes to disagree with itself in,
 * counting one collection and paging another.
 */
export interface FindingFilter {
  /**
   * Answer only findings whose LATEST ruling carries this verdict,
   * or absent for every finding.
   *
   * THE LATEST AND NOT ANY. A finding judged one way and then
   * re-judged another is matched by the second verdict and not by
   * the first, because the first is no longer in force — the whole
   * point of a table that appends. An implementation that matched
   * any label would answer a page of findings an operator has
   * already moved on from, and every count beside it would agree.
   *
   * A finding carrying NO ruling at all matches no verdict, which
   * follows rather than being decided: there is no latest row to
   * read one off. Asking for findings nobody has judged is a
   * different question and this member cannot express it, there
   * being no verdict to name.
   *
   * `string` rather than a union, matching
   * {@link FindingLabelRecord.verdict} for the reason stated there.
   * A verdict no label carries is an empty page rather than an
   * error: it may be one the domain has since retired, which rows
   * stored under it still answer to.
   */
  readonly verdict?: string;

  /**
   * Answer only findings filed under this category key, or absent
   * for every finding.
   *
   * THE MEMBER OF `fields` THAT `FINDING_CATEGORY_FIELD` NAMES, and
   * nothing else. No column links a finding to a category, so this
   * is a jsonb read rather than a join, and it is the same member
   * `ar-digest` files a finding under when it lays out a section.
   * The two agreeing is what makes the API's filing and the
   * digest's one act rather than two.
   *
   * They agree on the STORED string, and the one place they could
   * part is worth naming rather than leaving to be met: the digest
   * matches the member as its own sanitiser REDUCED it, while this
   * filter reads the column. For any key an operator actually
   * declared the two are the same string, a reduction leaving an
   * ordinary key as it stands. A stored value the sanitiser would
   * edit is a finding filed under a key no domain declares, which
   * both surfaces already answer the same way — the digest's
   * undeclared section, and an empty page here.
   *
   * A key the domain does not declare answers an empty page rather
   * than a `404`. Nothing failed to read: the domain has no
   * findings filed under a category it never named, and a refusal
   * would make the API's answer depend on the taxonomy in force at
   * the moment of the request rather than on the rows.
   */
  readonly category?: string;

  /**
   * Which findings are in the collection at all, by when they were
   * made: `[sinceInclusive, untilExclusive)` over
   * {@link FindingRecord.createdAt}.
   *
   * REQUIRED, WITH `null` FOR UNBOUNDED, and that is the shape
   * `toTimeWindow` in `src/http/schemas.ts` already answers. An
   * absent key and a key holding `undefined` are two spellings of
   * one state, and a store branching on `!== null` over a required
   * member cannot meet a third. An unbounded window is
   * `{ sinceInclusive: null, untilExclusive: null }` rather than an
   * omitted member.
   *
   * HALF-OPEN, AND THE MEMBER NAMES SAY WHICH SIDE EACH BOUND
   * CLOSES. A store writing `<= untilExclusive` is a bug no type
   * could report, and two adjacent windows that both took their
   * shared boundary would double-count exactly at the seam a caller
   * paging through time crosses most often.
   *
   * An empty window — a span in which the domain made nothing — is
   * a legitimate request answering an empty page. An INVERTED one
   * never reaches this port: `timeWindowQuerySchema` refuses a
   * `since` that is not strictly before its `until`, so no
   * implementation here re-checks the ordering.
   */
  readonly window: TimeWindow;
}

/**
 * Which ordering {@link FindingStore.listFindings} answers in.
 *
 * A KEY NAMES AN ORDERING, NEVER A COLUMN AND NEVER A DIRECTION.
 * `score` is three keys deep and the whole of it lives behind that
 * one word; a port taking a column name would be taking an order no
 * index answers, and one taking a direction beside the key would put
 * a second authority on an order this repository has settled once.
 *
 * The wire's `?sort` is held to this same pair by
 * `sortQuerySchema` in `src/http/schemas.ts`, whose FIRST member is
 * the default — so `score` being first here and there is one fact
 * rather than two that could come to disagree.
 */
export type FindingSort =
  /**
   * Score descending with an absent score LAST, then `created_at`
   * descending, then `id` descending: `compareFindings` in
   * `src/lib/digest-assemble.ts`, and the order a digest shows.
   */
  | 'score'
  /**
   * `created_at` descending, then `id` descending: the same
   * ordering with the score key dropped, for a reader asking what
   * the domain made most recently rather than what it rated
   * highest.
   */
  | 'recency';

/**
 * What {@link FindingStore.insertFindingLabel} is handed: a complete
 * ruling, minus the id the write stamps and minus the stamp the
 * column defaults.
 *
 * EVERY MEMBER IS REQUIRED, INCLUDING THE NULLABLE ONE, and that is
 * the port deciding nothing again — the argument
 * `InsertConnectorInput` in `src/connectors/store.ts` makes for its
 * defaulted member. A ruling with no note is `note: null` written
 * out, so the in-memory implementation and the drizzle one are
 * handed the same three values rather than one of them defaulting
 * from a column the other does not have.
 *
 * `labelledAt` IS NOT A MEMBER, and that is a different rule rather
 * than an exception to the one above. The stamp is not a value with
 * a default — it is WHEN THE WRITE HAPPENED, and the write is
 * happening now. Accepting one would let a caller back-date a
 * judgement, which is the one thing that would make the newest row
 * stop being the verdict in force.
 *
 * THERE IS NO SCORE MEMBER AND NO PATCH TYPE ANYWHERE ON THIS PORT,
 * which is where the read-first law is actually enforced rather than
 * stated. `tests/invariants/api-read-first.test.ts` reads that off
 * `keyof` over this type.
 */
export interface InsertFindingLabelInput {
  /**
   * The finding being ruled on.
   * `finding_labels_finding_id_findings_id_fk` refuses an id no
   * finding carries.
   */
  readonly findingId: number;

  /**
   * The ruling, already judged against the owning domain's
   * vocabulary by `./verdict-service.ts`. Stored as submitted; no
   * implementation below consults a ladder.
   */
  readonly verdict: string;

  /**
   * What the operator wanted to say, or `null` when they said
   * nothing. Written out rather than omitted, per the header above.
   */
  readonly note: string | null;
}

/**
 * Every database operation the findings surface performs.
 *
 * Seven methods and no escape hatch: there is no `query`, no exposed
 * connection and no transaction handle, so an implementation is
 * substitutable by anything that can hold rows. That closure is what
 * makes the in-memory implementation a genuine second implementation
 * rather than a stub covering the easy calls.
 *
 * Every method is asynchronous, including the ones an in-memory
 * implementation could answer synchronously. The port is shaped by
 * the caller that has to await a database, and a synchronous member
 * would be one drizzle could not satisfy.
 *
 * SIX READERS AND ONE WRITER, and the split is the point rather
 * than an accident of what this wave needed. The six are a windowed
 * list, its count, a lookup, and three embedded reads a single
 * finding's answer is assembled from. The seventh appends a ruling.
 * There is no eighth, and the module header carries what that buys.
 */
export interface FindingStore {
  /**
   * Reads one window of a domain's findings, narrowed by the filter
   * and ordered by the sort key.
   *
   * THE ORDER IS PART OF THE CONTRACT, because a window over an
   * unordered read is not a page. Postgres promises nothing about
   * row order without an `ORDER BY`, so two requests for
   * consecutive pages may repeat one row and skip another while
   * every count on the wire still adds up. Both orderings this port
   * offers end in `id` for that reason: `created_at` defaults to
   * the TRANSACTION's start time, so findings written by one pass
   * tie to the microsecond and a page boundary falling inside that
   * tie would show a row twice.
   *
   * AND THE ORDER IS `compareFindings`, NOT AN ORDER THAT AGREES
   * WITH IT TODAY. The module header carries the argument and the
   * `NULLS LAST` spelling every descending key needs, and
   * `./service.test.ts` holds a page this method answered against
   * `orderFindings` over the same rows, so the SQL and the library
   * are one rule checked from two sides.
   *
   * @param domainId - The domain to read within, as
   *   `DomainStore.findDomainBySlug` resolved `:slug` into before
   *   this was called. A scope rather than a filter member, per
   *   {@link FindingFilter}.
   * @param filter - What to narrow to, or a filter carrying only an
   *   unbounded window for every finding the domain has. Narrowing
   *   here and in {@link FindingStore.countFindings} is the same
   *   question asked twice, and an implementation answering the two
   *   through different predicates would put a page's `meta.total`
   *   at odds with the page.
   * @param sort - Which ordering to answer in. Not a member of the
   *   filter, per {@link FindingFilter}.
   * @param window - `limit` and `offset`, as `toStoreWindow` in
   *   `src/http/schemas.ts` derived them from `?page`/`?perPage`.
   *   The window arrives already validated, so no implementation
   *   re-checks its bounds.
   * @returns The rows in that window, possibly empty. A window past
   *   the end, a domain that has made no findings, a verdict no
   *   label carries, a category key the domain never declared, a
   *   span in which nothing was made, and an id no domain carries
   *   are all an empty list rather than an error: none of the six is
   *   a failure to read.
   */
  listFindings(
    domainId: number,
    filter: FindingFilter,
    sort: FindingSort,
    window: StoreWindow,
  ): Promise<readonly FindingRecord[]>;

  /**
   * Counts the findings the same domain and filter select, ignoring
   * any window and any ordering.
   *
   * Separate from {@link FindingStore.listFindings} rather than
   * answered beside it, because the two are different questions: a
   * page's total describes the collection and not the page.
   * Splitting them also keeps the list read free of a window
   * function an in-memory implementation could only imitate.
   *
   * NO SORT PARAMETER, and its absence is a claim rather than an
   * omission: an ordering cannot change how many rows a predicate
   * selects, so a method taking one would be inviting an
   * implementation to answer a number that depends on it.
   *
   * @param domainId - The domain to count within.
   * @param filter - The same narrowing the list was read through.
   * @returns How many of that domain's findings stand under it. An
   *   id no domain carries answers `0`, which is correct rather
   *   than a special case: nothing points at a row that is not
   *   there.
   */
  countFindings(domainId: number, filter: FindingFilter): Promise<number>;

  /**
   * Looks one finding up by its id. Where every request naming
   * `/findings/:id` enters — the single get and the verdict append
   * alike.
   *
   * TAKES NO DOMAIN, which is the addressing rule this surface
   * keeps: a domain is met by slug and everything else is written by
   * its id. {@link FindingRecord.domainId} on the answer is how the
   * caller learns which domain it belongs to, and it is what
   * `./verdict-service.ts` reads the vocabulary off.
   *
   * @param id - The id as `resourceIdParamSchema` in
   *   `src/http/schemas.ts` parsed it.
   * @returns The row, or null when no finding carries that id. Null
   *   is neither an error nor a refusal: it is the fact from which
   *   the service decides a 404.
   */
  findFindingById(id: number): Promise<FindingRecord | null>;

  /**
   * Reads where one finding has been seen, ordered by
   * {@link FindingSightingRecord.seenAt} descending with
   * {@link FindingSightingRecord.id} descending breaking a tie.
   *
   * NO WINDOW AND NO COUNT, which is a decision worth stating
   * rather than leaving to be met. These rows are embedded in a
   * single finding's answer rather than paged on their own, so
   * there is no `?page` for a caller to send and no `meta` for one
   * to read. The honest limit is that the read is UNBOUNDED: a
   * finding a great many feeds carried answers a great many
   * sightings, and nothing here cuts them. Where a cap is wanted it
   * belongs at the service with a count beside it, as
   * `RUN_LEDGER_CAP` does one group over, rather than as a silent
   * limit inside an implementation.
   *
   * @param findingId - The {@link FindingRecord.id} a read already
   *   returned. Sightings carry `finding_id`, so this is the key
   *   available.
   * @returns The rows, possibly empty. A finding seen at no feed —
   *   which is every finding today, nothing having written one of
   *   these rows yet — and an id no finding carries are both an
   *   empty list rather than an error.
   */
  listFindingSightings(
    findingId: number,
  ): Promise<readonly FindingSightingRecord[]>;

  /**
   * Reads one finding's rulings, NEWEST FIRST: ordered by
   * {@link FindingLabelRecord.labelledAt} descending with
   * {@link FindingLabelRecord.id} descending breaking a tie.
   *
   * THE FIRST ROW IS THE VERDICT IN FORCE, which is what makes this
   * ordering load-bearing rather than a presentation choice. The
   * table carries no unique key, so re-judging appends, and a read
   * that forgot to order would report whichever row the scan
   * reached first — with nothing raised and no guarantee it
   * reaches the same one twice.
   *
   * THE TIEBREAK IS NOT OPTIONAL. `labelled_at` defaults to
   * `now()`, which is the transaction's start time, so two rulings
   * written in one transaction carry the same stamp to the
   * microsecond and `id` is the only thing separating them. For a
   * lookup whose whole answer is the FIRST row, that is the
   * difference between a verdict and a coin flip.
   *
   * THE WHOLE SEQUENCE, NOT THE LATEST. Re-judging is an operator
   * changing their mind and the ruling it replaced is a true
   * statement about the moment it was made, so the reader is handed
   * the record and takes the head of it. Unbounded, on the terms
   * {@link FindingStore.listFindingSightings} states.
   *
   * @param findingId - The {@link FindingRecord.id} a read already
   *   returned.
   * @returns The rows newest first, possibly empty. A finding
   *   nobody has judged and an id no finding carries are both an
   *   empty list rather than an error.
   */
  listFindingLabels(
    findingId: number,
  ): Promise<readonly FindingLabelRecord[]>;

  /**
   * Reads what research has recorded about the entity one finding
   * names, ordered by {@link FindingResearchRecord.researchedAt}
   * descending with {@link FindingResearchRecord.id} descending
   * breaking a tie.
   *
   * ADDRESSED BY THE FINDING, RESOLVED THROUGH ITS ENTITY. The join
   * is this port's rather than the caller's: a caller holding a
   * finding does not have to read {@link FindingRecord.entityId},
   * branch on its nullability and address a second surface to learn
   * what is known about the subject.
   *
   * AN UNATTRIBUTED FINDING ANSWERS AN EMPTY LIST. A null
   * `entity_id` is an ordinary state rather than an edge case —
   * plenty is worth keeping without a subject anyone could name —
   * so there is no entity to resolve research through, which is not
   * a failure to read.
   *
   * READS `entity_research` AND WRITES NOTHING. This method is the
   * whole of what this port does with that table: there is no
   * insert, no update and no delete, so the embedding is read-only
   * structurally rather than by convention. Those rows are
   * `ar-research`'s to write.
   *
   * @param findingId - The {@link FindingRecord.id} a read already
   *   returned. The entity is resolved from it here rather than
   *   supplied.
   * @returns The rows newest first, possibly empty, and unbounded
   *   on the terms {@link FindingStore.listFindingSightings}
   *   states. A finding attributed to nothing, an entity nothing has
   *   researched, and an id no finding carries are all an empty list
   *   rather than an error.
   */
  listFindingResearch(
    findingId: number,
  ): Promise<readonly FindingResearchRecord[]>;

  /**
   * Appends one ruling to a finding. THE ONE WRITE ON THIS PORT.
   *
   * APPENDS AND NEVER UPDATES, per the module header. There is no
   * upsert here and no key to upsert on: a second ruling on one
   * finding is a second row, and the sequence is the record of an
   * operator changing their mind.
   *
   * TAKES THE VERDICT AS GIVEN. The owning domain's vocabulary is
   * read per request by `./verdict-service.ts`, one layer up, and
   * nothing below consults one. An implementation refusing a
   * verdict on its own would move a per-domain rule into the half of
   * the module that cannot be exercised without a database, and it
   * would refuse writes the database accepts.
   *
   * @param input - The complete ruling, minus its id and its stamp.
   * @returns The stored row, read back rather than reconstructed
   *   from the argument, so a caller sees the id the write stamped
   *   and the instant the column defaulted.
   * @throws `StoreRefusal` carrying `foreign-key-violation` when no
   *   finding carries {@link InsertFindingLabelInput.findingId} —
   *   `finding_labels_finding_id_findings_id_fk`, and the only
   *   mechanism this port can reach. The service resolves the
   *   finding through {@link FindingStore.findFindingById} first, so
   *   this is a race rather than the ordinary path, and it is
   *   declared for that reason alone.
   */
  insertFindingLabel(
    input: InsertFindingLabelInput,
  ): Promise<FindingLabelRecord>;
}
