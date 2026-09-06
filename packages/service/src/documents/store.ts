/**
 * @packageDocumentation
 * The `DocumentStore` port — every database operation the documents
 * surface performs, declared as an interface so that the asking is
 * separable from Postgres.
 *
 * THE PORT DECIDES NOTHING, exactly as `src/domains/store.ts`,
 * `src/sources/store.ts` and `src/findings/store.ts` state for their
 * own surfaces. An unknown domain slug, a `parseStatus` outside
 * `DOCUMENT_PARSE_STATUSES`, a `perPage` above the shared cap: none
 * of those are facts about Postgres. They are decisions taken about
 * rows, and a decision about rows can be driven by anything that
 * supplies rows. So the isolated suite puts
 * `tests/helpers/memory-research-store.ts` behind this interface and
 * a deployment puts `./db-store.ts` behind it, both answering one
 * contract, and the live suite is left proving only that real
 * Postgres agrees.
 *
 * NOTHING BELOW WRITES. Two methods, both reads, and there is no
 * third: no insert, no update, no delete, no upsert, and no escape
 * hatch — no `query`, no exposed connection, no transaction handle —
 * to reach the table through some other way. So
 * `GET /domains/:slug/documents` is read-only as a PROPERTY OF THIS
 * TYPE rather than as a promise `./routes.ts` keeps.
 *
 * The difference is what a later edit has to argue with. A
 * convention two layers up is a convention, and the edit that would
 * break one reads as an improvement: a corpus view showing a failed
 * parse is one line away from offering to retry it. A port declaring
 * no writer is a shape, and that line has nothing to call.
 * `SourceStore` states the same absence for the failures queue one
 * wave earlier; this port is the whole surface rather than two
 * methods of a larger one, so here the absence IS the port.
 *
 * WHICH IS WHY `parse_status` REACHES THIS PORT ONLY AS
 * {@link DocumentFilter.parseStatus} — a member a caller NARROWS by
 * and never one a caller SETS. There is no patch type here and no
 * input type of any kind, so there is no member for a status to
 * arrive through, and the filter is the only place the column is
 * named on anything this port is HANDED. It is ANSWERED as well, by
 * {@link DocumentRecord.parseStatus}, because the page carries both
 * members of the set by default and a reader shown a mixed page is
 * owed the flag saying which row is which. Answered and never
 * accepted is the containment `src/sources/store.ts` gives the five
 * pipeline-owned columns on `sources`, applied here to the one
 * column this collection could plausibly be asked to change.
 *
 * `docs/architecture/08-http-api.md` states that read-first law for
 * the whole wave, under `Read-first`, and
 * `tests/invariants/api-read-first.test.ts` derives it from `keyof`
 * over these types rather than from either paragraph — so a writer
 * added below fails the invariant naming itself, and it is the type
 * and not this sentence that a reader should believe.
 *
 * RE-PARSING IS NOT THIS SURFACE'S TO OFFER, which is the rule the
 * absent writer stands for rather than something this wave ran out
 * of time for. A parse failure is something that HAPPENED, and only
 * the writer that saw it can say so — `ar-ingest` and `ar-capture`,
 * under the parse engine their adapters run — so nothing reading a
 * stored row later can work out that its parse went wrong. Re-running
 * one is a pipeline operation with a cost and a dedupe question
 * attached, and it belongs to whichever wave owns re-running a
 * source.
 *
 * NO REFUSAL CAN CROSS THIS PORT, which is where this file departs
 * from every sibling port here. `src/domains/store.ts`,
 * `src/topics/store.ts` and `src/findings/store.ts` each declare
 * that every refusal crosses as the `StoreRefusal`
 * `src/db/store-errors.ts` declares, and as nothing else; this one
 * declares that none crosses at all.
 * `documents_parse_status_check`, `documents_hash_unique` and the
 * table's two foreign keys are mechanisms only an INSERT or an
 * UPDATE reaches, so neither method below documents a throw and
 * `./service.ts` has no store refusal to switch over. A
 * `StoreRefusal` out of an implementation here would be reporting a
 * fault rather than a rule.
 *
 * THIS PORT READS A TABLE IT SHARES AND DOES NOT OWN. `SourceStore`
 * reads the same `documents` rows two ways — the review queue behind
 * `GET /sources/:id/failures`, and the parse-status aggregate on the
 * sources list — and writes none of them either. Two ports over one
 * table is the arrangement rather than an oversight, and the split is
 * by what each collection is FOR: that one is one SOURCE's failures
 * worked from the top, this one is one DOMAIN's corpus whatever its
 * status and whatever it arrived through. `src/findings/store.ts`
 * takes the same arrangement over `entity_research` one group along.
 *
 * The two disagree about the table deliberately, which is what makes
 * them two collections rather than one with a parameter.
 * {@link DocumentStore.listDocuments} answers documents that came
 * through no feed at all — an ingested file, a pasted body — and the
 * failures queue structurally cannot, being keyed on `source_id`.
 * `documents_domain_id_captured_at_idx` and
 * `documents_source_parse_status_idx` are the two readers' own
 * indexes, and `src/db/schema/documents.ts` carries why neither
 * serves the other.
 *
 * BODIES COME BACK AS STORED, UNMASKED AND UNCUT. This port answers
 * what the column holds; `./service.ts` replaces every control byte
 * with its \uXXXX text form through `maskControlBytes`, cuts the body
 * to `BODY_CODE_POINT_CAP` code points through `takeCodePoints`, and
 * answers `bodyBytes` and `bodyTruncated` beside it — the same split
 * `src/sources/failures-service.ts` makes over the same column, and
 * the same cap, one binding read from `src/http/control-bytes.ts`
 * rather than two literals that agree today. Keeping the masking at
 * the service is what lets it be tested against a planted control
 * byte with no database.
 *
 * A DOCUMENT IS MET IN ITS DOMAIN AND ADDRESSED BY NOTHING ELSE, so
 * both methods take a `domainId` and neither takes a document id.
 * There is no `GET /documents/:id` on this wave's route table, so
 * there is no `findDocumentById` here: a lookup nothing on the wire
 * could reach is a method an implementation has to write and a live
 * case has to cover for no reader.
 * `DomainStore.findDomainBySlug` in `src/domains/store.ts` turns
 * `:slug` into the id these methods take, before this port is called,
 * so an unknown slug is a `404` decided one layer up and never an
 * empty page.
 *
 * NO METHOD RESOLVES OR DELETES A DOMAIN, which is the division of
 * labour every domain-scoped port here keeps. Nothing below deletes
 * anything, so the cascade that takes a domain's documents with it is
 * reached through `DomainStore` and is not expressible from this
 * file.
 *
 * THE ORDER IS `captured_at DESC, id DESC`, AND THE `NULLS LAST`
 * SPELLING IS PART OF THE CONTRACT rather than a detail of one
 * implementation. `documents_domain_id_captured_at_idx` is those
 * three columns in that order with both descending keys declared
 * `NULLS LAST`, and a pathkey carries its nulls ordering while the
 * planner matches it literally — so a store writing a bare `DESC` on
 * either key puts a `Sort` above the index scan and nothing reports
 * it. That neither column is nullable does not save the shorter
 * spelling; nothing in the planner reads the constraint to decide the
 * two are equivalent. The index's own TSDoc in
 * `src/db/schema/documents.ts` carries the measurement, taken against
 * the findings key that shares the argument.
 */
import type { DocumentParseStatus } from '../db/schema/values.js';
import type { StoreWindow } from '../http/schemas.js';

/**
 * One row of a domain's corpus as the debug page answers it: what
 * was captured, where it came from, and whether it parsed.
 *
 * COLUMN-SCOPED RATHER THAN WHOLE, which is the same decision
 * `SourceFailureRecord` in `src/sources/store.ts` takes over the
 * same table and for the same reason. `documents` also carries
 * `raw`, `features`, `feature_version`, `embedding` and
 * `embedding_model` — a stored payload and two derived vectors,
 * each of which would dwarf the six members below on the wire and
 * none of which a reader looking at what was captured has a use
 * for. So this shape is a decision about what the page is FOR
 * rather than a projection somebody trimmed for size, and
 * `./db-store.ts` projects these columns and no others rather than
 * selecting the row and discarding the rest.
 *
 * `hash` IS NOT HERE EITHER, and its absence is a different kind.
 * The other five are omitted for their size; this one is omitted
 * because it answers a question about the CORPUS rather than about
 * a document — it is the key one row per distinct item stands on,
 * and a reader wanting to know why an item appears once is asking
 * about `documents_hash_unique` rather than about this row. Adding
 * it later is a member; answering it now would be this record
 * claiming to be the table.
 *
 * `domainId` IS NOT HERE: the domain is the path. That is the same
 * rule `SourceFailureRecord` states about the scope column it
 * omits, and it holds here because a document is met in its domain
 * and addressed by nothing else — there is no route on which
 * one of these rows arrives without its domain already named. The
 * records that DO carry a scope, `FindingRecord.domainId` and
 * `SourceRecord.domainId`, carry it because their surfaces address
 * a row by its own id and the member is the only thing saying whose
 * it is.
 */
export interface DocumentRecord {
  /**
   * `documents.id`, and the last key of the page's order.
   *
   * The tiebreak is not optional there: `captured_at` defaults to
   * `now()`, which is the TRANSACTION's start time, so a batch
   * capture writes rows tying to the microsecond and a page
   * boundary falling inside that tie would show one document twice
   * and another never.
   */
  readonly id: number;

  /**
   * The feed this document was captured through, or null when it
   * came through none.
   *
   * NULL IS AN ORDINARY STATE rather than an edge case, and it is
   * what makes this collection wider than the failures queue beside
   * it. A file handed to the ingest path and a body an operator
   * pasted in both land here with no source, sit in the middle of
   * this page by capture time, and are structurally unreachable
   * through `GET /sources/:id/failures`, which is keyed on
   * `source_id`.
   *
   * An id rather than the source itself. `src/sources/store.ts` is
   * where a feed is met, and embedding one per row would put a
   * second authority on what a source is — and would answer a
   * source's `parser_config` to a reader who asked for a corpus.
   */
  readonly sourceId: number | null;

  /**
   * Where this document can be read at its source, when there is
   * such a place. NULL means there is not — an ingested file, a
   * pasted body — and never an empty string: an empty string is a
   * value, and a reader handed one renders a link to nowhere.
   */
  readonly url: string | null;

  /**
   * The document's text as captured, verbatim and possibly empty.
   *
   * EMPTY IS A CAPTURE THAT YIELDED NO TEXT and was kept anyway,
   * which is fail-flag-keep working rather than a row to skip: a
   * source whose shape has drifted leaves something to read instead
   * of a silence indistinguishable from a quiet day.
   *
   * AS STORED, per the module header. This member is the whole
   * body, unmasked and uncut, and `./service.ts` is what masks it,
   * cuts it at `BODY_CODE_POINT_CAP` and answers `bodyBytes` beside
   * the cut. A store answering the masked form would leave the
   * count of what was withheld unanswerable, since the number a
   * reader needs is the length of what is here.
   */
  readonly body: string;

  /**
   * Whether this document's payload parsed under its source's
   * contract: one of `DOCUMENT_PARSE_STATUSES` in
   * `src/db/schema/values.ts`, as stored.
   *
   * ON THE RECORD AND ON NO INPUT TYPE, which is the module
   * header's read-first claim expressed as a member. The page
   * carries both statuses by default — a failed document is IN the
   * corpus rather than behind a flag — so a reader is owed the one
   * column that says which of the two a row is, and there is
   * nothing on this port for a new value to arrive through.
   *
   * `string` rather than the `DocumentParseStatus` union, which is
   * what a SELECT actually answers: the tuple is a CHECK in the
   * database rather than a union in the type system, so a row
   * written before a member was removed still reads back.
   * `SourceRecord.kind` takes the same view of the same kind of
   * column, and {@link DocumentFilter.parseStatus} is where the
   * narrowing belongs, an input having been held to the tuple at the
   * boundary before it got here.
   *
   * The honest limit is the column default rather than this
   * member's: `parse_status` defaults to `ok`, so it cannot tell a
   * document that parsed from one whose writer never set the
   * column, and records both as `ok`.
   */
  readonly parseStatus: string;

  /**
   * What went wrong, as the writer that saw it recorded it, or null
   * when nothing was recorded.
   *
   * Nothing in the database ties this to the status, so a `failed`
   * row carrying a null error is storable — and it is the shape
   * that costs the most, since the document is kept, the source's
   * counter climbs toward its threshold, and what the operator is
   * shown is a failure nobody can act on. This port answers the
   * null rather than papering over it with a message no writer
   * wrote.
   *
   * AS STORED, and masked at the service exactly as the body is.
   * The two are one rule rather than two: a parse error is a
   * message built out of the bytes that broke the parser, so it is
   * the likelier of the pair to carry a control byte at all.
   */
  readonly parseError: string | null;

  /**
   * When the pipeline captured this document, which is not when its
   * source published it. The two diverge by however long an item
   * sat before a poll reached it, and only this one is a fact about
   * the corpus rather than a claim copied out of a payload.
   *
   * What the page is ordered by, newest first, and why `id` sits
   * beside it in that order. NOT NULL on the table and defaulted to
   * the write, because capture IS the insert.
   */
  readonly capturedAt: Date;
}

/**
 * What narrows a domain's corpus: a parse status, or nothing at
 * all.
 *
 * A VALUE OBJECT RATHER THAN THE QUERY THE ROUTE PARSED, which is
 * the separation `StoreWindow` draws from `PaginationQuery` in
 * `src/http/schemas.ts`: one is what a caller asked for and the
 * other is what SQL is handed. `./routes.ts` rebuilds this shape
 * member by member rather than forwarding a parsed query, so a
 * parameter added to the wire reaches this port only when somebody
 * adds it here too.
 *
 * NO MEMBER IS A SCOPE. The domain is a separate leading parameter
 * on both methods, because a domain names an OWNER and this member
 * narrows a collection that is already scoped — the same line
 * `FindingFilter` draws one group along. An omitted member widens;
 * the domain cannot be omitted.
 *
 * ONE MEMBER, AND THE INTERFACE IS THE PLACE THAT SAYS SO. A bare
 * optional parameter would say the same thing today and would have
 * to change every implementation's signature on the day a second
 * narrowing lands, where a member is added to this type and read by
 * whichever implementation wants it.
 *
 * THERE IS NO WINDOW MEMBER HERE, unlike `FindingFilter`, and the
 * absence is this wave's decision rather than an oversight.
 * `GET /domains/:slug/documents` reads `?page`, `?perPage` and
 * `?parseStatus` and no other parameter, so `timeWindowQuerySchema`
 * is not composed into its query and no `[since, until)` bound
 * reaches this port. The page IS ordered by `captured_at`, so a
 * window over it is the obvious next narrowing to want; adding one
 * is a member here, a member on the query schema and a predicate in
 * each implementation, and it is not what this wave shipped.
 */
export interface DocumentFilter {
  /**
   * Answer only documents whose parse ended this way, or absent for
   * both.
   *
   * ABSENT IS BOTH STATUSES, and that is the default a page gets. A
   * failed document is IN the corpus rather than behind a flag,
   * because the corpus is what was captured and a payload its
   * contract rejected was still captured — fail-flag-keep, the rule
   * `src/db/schema/documents.ts` records at the column. A default
   * that hid them would make the debug page agree with every other
   * reader precisely where an operator is looking for the
   * disagreement.
   *
   * `DocumentParseStatus` rather than `string`, which is the
   * opposite of {@link DocumentRecord.parseStatus} beside it and of
   * `ConnectorFilter.kind` in `src/connectors/store.ts`. The two
   * asymmetries are one rule read twice. A member ANSWERED off a row
   * is `string` because a SELECT answers whatever is stored,
   * including a value written before the tuple was narrowed. A
   * member HANDED to this port is the union because `./service.ts`
   * refuses a status outside `DOCUMENT_PARSE_STATUSES` with a `422`
   * before calling, rather than passing it through to an empty page
   * — which is what the connectors list does with a `?kind`, and the
   * reason its filter member is the looser type.
   *
   * A status no row carries is an empty page rather than an error:
   * a domain whose captures all parsed is not a failure to read.
   * That is a claim about a MEMBER of the tuple, and it is the only
   * empty-page case left once the boundary has refused everything
   * outside it.
   */
  readonly parseStatus?: DocumentParseStatus;
}

/**
 * Every database operation the documents surface performs.
 *
 * TWO METHODS, BOTH READS. There is no third, and the module header
 * carries what the absence buys: no insert, no update, no delete and
 * no escape hatch, so an implementation is substitutable by anything
 * that can hold rows and a handler has nothing to write with. That
 * closure is also what makes the in-memory implementation a genuine
 * second implementation rather than a stub covering the easy calls.
 *
 * Both methods are asynchronous, including the one an in-memory
 * implementation could answer synchronously. The port is shaped by
 * the caller that has to await a database, and a synchronous member
 * would be one drizzle could not satisfy.
 */
export interface DocumentStore {
  /**
   * Reads one window of a domain's corpus, narrowed by the filter
   * and ordered by {@link DocumentRecord.capturedAt} descending with
   * {@link DocumentRecord.id} descending breaking a tie.
   *
   * THE ORDER IS PART OF THE CONTRACT, because a window over an
   * unordered read is not a page. Postgres promises nothing about
   * row order without an `ORDER BY`, so two requests for consecutive
   * pages may repeat one row and skip another while every count on
   * the wire still adds up. The module header carries why both
   * descending keys have to be spelled `DESC NULLS LAST` and what a
   * bare `DESC` costs silently.
   *
   * NEWEST FIRST, BECAUSE THE PAGE IS A DEBUG VIEW OF WHAT JUST
   * ARRIVED. An operator reaching for this collection is asking what
   * the last poll brought in, and an ascending order would put the
   * first document a long-running domain ever captured on page one
   * forever.
   *
   * @param domainId - The domain to read within, as
   *   `DomainStore.findDomainBySlug` resolved `:slug` into before
   *   this was called. A scope rather than a filter member, per
   *   {@link DocumentFilter}.
   * @param filter - What to narrow to, or an empty filter for the
   *   whole corpus. Narrowing here and in
   *   {@link DocumentStore.countDocuments} is the same question
   *   asked twice, and an implementation answering the two through
   *   different predicates would put a page's `meta.total` at odds
   *   with the page.
   * @param window - `limit` and `offset`, as `toStoreWindow` in
   *   `src/http/schemas.ts` derived them from `?page`/`?perPage`.
   *   The window arrives already validated, so no implementation
   *   re-checks its bounds.
   * @returns The rows in that window, possibly empty. A window past
   *   the end, a domain that has captured nothing, a status no
   *   document carries and an id no domain carries are all an empty
   *   list rather than an error: none of the four is a failure to
   *   read. Bodies come back AS STORED — unmasked and uncut — and
   *   `./service.ts` is what masks and cuts them.
   */
  listDocuments(
    domainId: number,
    filter: DocumentFilter,
    window: StoreWindow,
  ): Promise<readonly DocumentRecord[]>;

  /**
   * Counts the documents the same domain and filter select,
   * ignoring any window.
   *
   * Separate from {@link DocumentStore.listDocuments} rather than
   * answered beside it, because the two are different questions: a
   * page's total describes the collection and not the page.
   * Splitting them also keeps the list read free of a window
   * function an in-memory implementation could only imitate.
   *
   * @param domainId - The domain to count within.
   * @param filter - The same narrowing the list was read through.
   * @returns How many of that domain's documents stand under it. An
   *   id no domain carries answers `0`, which is correct rather than
   *   a special case: nothing points at a row that is not there.
   */
  countDocuments(
    domainId: number,
    filter: DocumentFilter,
  ): Promise<number>;
}
