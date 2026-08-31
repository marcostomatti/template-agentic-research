/**
 * @packageDocumentation
 * The `SourceStore` port — every database operation the sources
 * surface performs, declared as an interface so that the asking is
 * separable from Postgres.
 *
 * THIS FILE IS THE HTTP PORT AND `./index.ts` BESIDE IT IS THE
 * ADAPTER CONTRACT. One directory, two halves, and they answer
 * different questions about the same rows. That file says what a
 * source ADAPTER is — a fetch and a pure parse over the payload it
 * returns — and holds the registry a row reaches one through by its
 * `kind`. This one says what the HTTP surface asks the database for
 * when somebody reads, writes or retires a `sources` row. Neither
 * imports the other and neither is expressible in terms of the
 * other: an adapter never learns a row's id and this port never
 * constructs an adapter.
 *
 * The split is stated rather than left to be inferred, in the
 * wire-path table of `docs/architecture/08-http-api.md`, because a
 * directory holding both reads like a misfile until somebody says it
 * is not one. `src/subscriptions/` is the same question answered the
 * other way, and says so in its own header.
 *
 * THE PORT DECIDES NOTHING, exactly as `src/domains/store.ts`,
 * `src/taxonomy/store.ts`, `src/personas/store.ts` and
 * `src/topics/store.ts` state for their own surfaces. An unknown
 * domain slug, an unknown source id, a delete refused while the
 * feed's documents are still in the corpus: none of those are facts
 * about Postgres. They are decisions taken about rows, and a
 * decision about rows can be driven by anything that supplies rows.
 * So the isolated suite puts `tests/helpers/memory-research-store.ts`
 * behind this interface and a deployment puts `./db-store.ts` behind
 * it, both answering one contract, and the live suite is left
 * proving only that real Postgres agrees.
 *
 * The delete guard is the clearest case here, as it is on the
 * domains port. {@link SourceStore.countSourceDependents} answers
 * two numbers and takes no view of them; that a non-zero count is a
 * `409` with no waiver — rather than a cascade a caller could
 * confirm, which is what `DELETE /domains/:slug` offers — is decided
 * one layer up in `./service.ts`, where the request that asked for
 * it is legible.
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
 * `sources` CARRIES NO UNIQUE KEY AT ALL, SO A DUPLICATE ENDPOINT IS
 * STORABLE. Read off the generated SQL rather than off the schema
 * module: the table's whole constraint set is a primary key, one
 * CHECK and one foreign key, and there is no `UNIQUE` and no index
 * beside them. Two things follow, and both separate this port from
 * every other resource port in this service.
 *
 * No method below can raise a `unique-violation`, so there is no
 * duplicate-on-create refusal here and no `409` on a `POST` — where
 * topics, personas and connectors each carry one. An insert always
 * inserts. Two rows naming one endpoint are ordinary rather than a
 * fault to be caught: the same feed read under two kinds, or a
 * second row differing only in `parser_config` while an arrangement
 * is being cut over, are both configurations somebody meant. The
 * cost is that a double `POST` leaves two rows fetching one feed and
 * nothing notices — the pipeline absorbs the duplicate capture
 * through `documents_hash_unique` rather than this table refusing
 * the second row.
 *
 * And there is no natural key, so a source is addressed by
 * {@link SourceRecord.id} and by nothing else.
 * `scripts/seed-apply.ts` upserts topics and personas on the natural
 * keys their tables carry; a source has none to upsert on.
 *
 * WHICH MECHANISMS CAN FIRE ON A WRITE, both read off the same
 * generated SQL. `sources_kind_check` refuses a `kind` outside
 * `SOURCE_KINDS`, as a `check-violation`, on INSERT and on UPDATE
 * alike — `kind` is patchable, so both writes reach it. This is
 * where the sources port departs from the topics one, which states
 * that a `check-violation` out of any of its methods would be a
 * fault: here it is a rule, and an implementation has to raise it.
 * `sources_domain_id_domains_id_fk` refuses a `domainId` naming no
 * domain, as a `foreign-key-violation`, and only an INSERT can reach
 * it, since `domainId` is not patchable per {@link SourcePatch}.
 *
 * Neither is reachable from the wire as things stand, and that is
 * `./service.ts`'s doing rather than this port's. They are declared
 * here because a port states what its implementations may raise, not
 * what its current caller happens to avoid — and because the
 * in-memory implementation has to refuse both for the fake to be a
 * second implementation rather than a stub.
 *
 * THE DELETE IS REFUSED FROM OUTSIDE THE ROW, WHICH IS WHERE THIS
 * TABLE DIFFERS MOST FROM `topics`. Nothing points at a topic, so
 * `TopicStore.deleteTopic` cannot be refused. Three foreign keys
 * point at `sources.id` and every one of them emits `ON DELETE no
 * action`, so all three refuse.
 *
 * Two of them are what the surface counts and reports.
 * `documents_source_id_sources_id_fk` refuses while the feed's
 * documents are in the corpus, and
 * `finding_sightings_source_id_sources_id_fk` refuses while
 * sightings cite it. Refusing rather than cascading is argued at
 * both columns: `src/db/schema/findings.ts` says the sightings table
 * IS the provenance record, so a cascade would drop syndication
 * evidence a feed at a time and every count taken afterwards would
 * be lower with nothing saying why; `src/db/schema/documents.ts`
 * says a source does not own the corpus it produced. Retiring a feed
 * without losing either is {@link SourcePatch.enabled} set to false,
 * the column the schema provides for exactly that, and it is what
 * the refusal names as the operation that was wanted.
 *
 * THE THIRD ONE IS REAL AND IS NOT COUNTED, and saying so is worth
 * more than a count that would look complete.
 * `source_config_proposals_source_id_sources_id_fk` refuses a source
 * a pending or applied config proposal still names — measured in
 * `drizzle/0005_freezing_hairball.sql`, which is present at this
 * branch's merge-base and arrived with the ingest phase rather than
 * with this surface. {@link SourceDependentCounts} describes the two
 * above and not this one, so a source carrying no documents and no
 * sightings passes the service's guard and is then refused by the
 * database anyway. That refusal reaches `./service.ts` as an
 * ordinary `foreign-key-violation` `StoreRefusal`, which is why
 * {@link SourceStore.deleteSource} declares the throw rather than
 * promising that a zero count means the delete will land. The
 * proposals half of this surface is deferred to q13 with the two
 * routes that read it, and the count belongs with them.
 *
 * A SOURCE STILL GOES WITH ITS DOMAIN, and the asymmetry is not a
 * contradiction. `sources.domain_id` cascades, as do the domain
 * columns on `documents`, on `findings` — and so on
 * `finding_sightings` through its own cascade — and on
 * `source_config_proposals`, which carries a `domain_id` for exactly
 * this reason and says so at the column. A domain delete removes all
 * of them inside one statement, so the end-of-statement check the
 * three refusing keys rest on finds nothing left citing a source
 * that is gone. Deleting a domain is therefore permitted where
 * deleting one of its sources is refused, and the difference is what
 * each act means.
 *
 * NO METHOD HERE WRITES A `documents` ROW. Two of the nine read that
 * table — {@link SourceStore.listSourceFailures} and
 * {@link SourceStore.countSourceFailures}, which back the review
 * queue behind `GET /sources/:id/failures` — and there is no third
 * one that writes. Nor does the parse-status aggregate on
 * {@link SourceStore.listSourcesWithParseStats}, which counts them.
 *
 * The absence IS the read-only rule, expressed where a later edit
 * has to argue with it. A handler cannot mutate `parse_status` by
 * mistake or by a well-meaning retry button, because there is
 * nothing on this port to call: no insert, no update, no delete, and
 * no escape hatch to reach the table through. A convention two
 * layers up is a convention, where a port declaring no writer is a
 * shape. Retrying a failed capture is a pipeline operation with a
 * cost and a dedupe question attached, and it belongs to whichever
 * wave owns re-running a source.
 *
 * A SOURCE IS MET IN ITS DOMAIN AND WRITTEN BY ITS ID, the split
 * every wave-1 port and the topics port also take. The collection
 * read and its count take a `domainId`, because
 * `GET /domains/:slug/sources` is where the group is addressed from
 * and `DomainStore.findDomainBySlug` in `src/domains/store.ts`
 * resolved that slug before anything here was called. Every other
 * method takes {@link SourceRecord.id}, because `PATCH /sources/:id`,
 * `DELETE /sources/:id` and `GET /sources/:id/failures` name no
 * domain at all. That split is why {@link SourceRecord.domainId} is
 * on the record: it is the only thing saying which domain an
 * addressed row belongs to, for a rule or a log line that has to
 * know.
 *
 * THE PIPELINE-OWNED COLUMNS ARE ON THE RECORD AND ON NO INPUT TYPE.
 * `cursor`, `consecutiveFailures`, `lastSuccessAt`, `lastFailureAt`
 * and `flagged` are answered on every read and appear on neither
 * {@link InsertSourceInput} nor {@link SourcePatch}, so no write
 * across this port can reach one whatever it is handed. That is the
 * same containment `src/topics/store.ts` gives `nextRunAt` and
 * `src/domains/store.ts` gives `featureVersion` and
 * `embeddingModel`, applied to the five columns this table carries
 * for the pipeline. `docs/architecture/08-http-api.md` carries the
 * rule for the surface; this file is its shape.
 */
import type { DocumentParseStatus } from '../db/schema/values.js';
import type { StoreWindow } from '../http/schemas.js';

/**
 * One `sources` row, whole — every column the table declares.
 *
 * Whole rather than column-scoped, for the reason `DomainRecord` in
 * `src/domains/store.ts` gives: this record IS the resource the
 * route group answers with, and there is nothing on `sources` a
 * reader of the API may not have. No hash, no secret, no
 * operator-invisible bookkeeping — a source is an address somebody
 * configured, the arrangement for reading it, and the pipeline's own
 * account of how that has been going. A connector is the table on
 * this wave that IS partly secret, and `src/connectors/store.ts`
 * carries the masking rule that follows from it; nothing of the kind
 * applies here.
 *
 * THE FIVE PIPELINE-OWNED COLUMNS ARE ON THE RECORD IN FULL, which
 * is not the same as being writable at all.
 * {@link SourceRecord.cursor},
 * {@link SourceRecord.consecutiveFailures},
 * {@link SourceRecord.lastSuccessAt},
 * {@link SourceRecord.lastFailureAt} and
 * {@link SourceRecord.flagged} are answered on every read and appear
 * on no input type on this port. Answering them is the point of the
 * list route rather than a concession: a health counter nobody can
 * read is a health counter nobody acts on, and an operator deciding
 * which feed to retire is reading exactly these.
 *
 * `parserConfig` AND `contract` ARE `unknown` HERE, matching the two
 * columns, which carry no `$type` annotation. What a parser config
 * holds is the adapter's business and differs by `kind`, so one
 * interface across all four kinds would describe none of them
 * accurately — the argument `src/db/schema/sources.ts` makes at both
 * columns. A stored value also need not have come through this port
 * at all: the seed writes these rows, and an approved config
 * proposal is applied by an UPDATE naming those two columns. So the
 * READ side promises an object was stored and nothing about its
 * shape, while {@link InsertSourceInput} and {@link SourcePatch} take
 * the narrower `Readonly<Record<string, unknown>>` that
 * `./service.ts` produced from a request. That asymmetry is
 * deliberate and is the honest one: what this port accepts is
 * narrower than what the column can hold.
 *
 * THERE ARE NO TIMESTAMPS, and their absence is the table's rather
 * than this record's. `sources` carries no `created_at` and no
 * `updated_at`, so a source cannot report when its endpoint was last
 * edited and nothing here pretends otherwise — the two stamps it
 * does carry are outcomes rather than edits. That absence is also
 * what makes an empty patch a decision this port has to take rather
 * than leave to its two implementations; see
 * {@link SourceStore.updateSource}.
 */
export interface SourceRecord {
  /** `sources.id`, and the key every write below takes. */
  readonly id: number;

  /**
   * The domain whose research this feed supplies. Read by the one
   * rule a path cannot express: `PATCH /sources/:id` names no
   * domain, so this is what says whose configuration the addressed
   * row is part of.
   */
  readonly domainId: number;

  /**
   * Which transport family fronts this source — one of
   * `SOURCE_KINDS` in `src/db/schema/values.ts`, and what selects
   * the adapter in `./index.ts` that will read the row.
   *
   * `string` rather than the `SourceKind` union, which is what a
   * SELECT actually answers: the tuple is a CHECK in the database
   * rather than a union in the type system, so a row written before
   * a member was removed still reads back. `ProposalSource` in
   * `./config-proposer.ts` takes the same view of the same column
   * for the same reason. The narrowing belongs at the boundary,
   * where `./service.ts` holds a request to the tuple.
   */
  readonly kind: string;

  /**
   * Where the payload is. What that means is `kind`'s to say: an
   * address to request for the three kinds the pipeline polls, and
   * for `push` the place a payload nobody asked for lands.
   *
   * NOT NULL is not the same as non-empty, and the column enforces
   * only the first. An empty endpoint is configuration somebody has
   * not finished — nothing to fetch from and nowhere to listen — so
   * refusing one is `./service.ts`'s, at the boundary, rather than
   * anything this port can promise. Nor is it unique: see the module
   * header for why two rows may name one endpoint.
   */
  readonly endpoint: string;

  /**
   * How records are pulled out of the payload, as stored. Data the
   * parse engine performs operations against and never code it
   * evaluates, which is what keeps an INSERT into this table an
   * INSERT; `src/db/schema/sources.ts` argues it at the column.
   * Empty is a complete value and the column's default.
   */
  readonly parserConfig: unknown;

  /**
   * What a payload from this source has to contain: the validation
   * schema a captured document is checked against, as stored. Empty
   * is a complete value and carries a cost the column states — where
   * a contract declares nothing, nothing is rejected and nothing is
   * counted, so a source whose shape has drifted reads exactly like
   * one that is still working.
   */
  readonly contract: unknown;

  /**
   * Where the last fetch stopped, expressed however the adapter that
   * wrote it chose to express that, and opaque to everything else.
   * NULL means this source has never been fetched, or that its
   * adapter keeps no cursor at all.
   *
   * Pipeline-owned: answered here, on no input type, and the module
   * header says why rewinding a feed is not a patch member.
   */
  readonly cursor: string | null;

  /**
   * How many fetches have failed in a row since the last one that
   * succeeded, as the pipeline counted them. A counter, so zero is a
   * reading rather than an absence.
   *
   * This is the number `flagged` below is raised from, and reading
   * it is how an operator sees a feed drifting before the threshold
   * is crossed.
   */
  readonly consecutiveFailures: number;

  /**
   * When this source last yielded a payload that was accepted, or
   * null when it never has. Which of this and `lastFailureAt` is the
   * more recent is what says whether the feed is broken right now.
   */
  readonly lastSuccessAt: Date | null;

  /** When this source last failed, or null when it never has. */
  readonly lastFailureAt: Date | null;

  /**
   * Whether the pipeline may read this source at all. Defaults true
   * at the column, because a source row exists in order to be read.
   *
   * Operator-owned and patchable, unlike `flagged` below. This is
   * the column for retiring a feed, and it is what the refusal on
   * {@link SourceStore.deleteSource} names as the operation that was
   * wanted: it keeps the endpoint, the arrangement and the corpus
   * and stops the pipeline reading.
   */
  readonly enabled: boolean;

  /**
   * Whether this source has tripped the adapter-rot detector — set
   * by `src/lib/source-health.ts` when `consecutiveFailures` crosses
   * its threshold, and never by an operator.
   *
   * Pipeline-owned, and the one column on this table where that is
   * an argument rather than a category. Clearing the flag without
   * repairing the config that failed brings it straight back on the
   * next pass, so a patchable boolean would be a button that hides
   * that nothing was fixed. The gap is named in
   * `docs/architecture/08-http-api.md` rather than implied, along
   * with the shape that would close it.
   */
  readonly flagged: boolean;
}

/**
 * How many of a source's documents stand at each parse status.
 *
 * Keyed by `DocumentParseStatus` rather than by two literals, so the
 * record's members and the CHECK the column carries are two readings
 * of `DOCUMENT_PARSE_STATUSES` in `src/db/schema/values.ts`. A member
 * added to that tuple reddens every implementation of this port
 * instead of leaving a status the aggregate silently drops.
 *
 * EVERY MEMBER IS PRESENT AND EVERY ZERO IS A COUNTED ZERO. A source
 * that has never captured anything answers zero under each member
 * rather than an empty record, and an implementation grouping one
 * query over the corpus has to fill the missing groups in: a status
 * with no rows contributes no row to a grouped result, and letting
 * that reach a caller as an absent member would make `0` and "never
 * counted" the same value. `DomainDependentCounts` in
 * `src/domains/store.ts` records the same trap over a different read.
 */
export type ParseStatusCounts =
  Readonly<Record<DocumentParseStatus, number>>;

/**
 * One source as the list route answers it: the row, plus the
 * parse-status aggregate over the documents captured through it.
 *
 * The aggregate is on the list read and on no other method, which is
 * the shape of what it costs. It is bounded by the document counts
 * of the sources on ONE page, and an implementation reads it for the
 * whole page in a single `GROUP BY (source_id, parse_status)` rather
 * than in a query per source — the difference between one statement
 * and a page's worth of them, and the reason
 * `documents_source_parse_status_idx` exists.
 *
 * Extends the record rather than nesting it, so a caller reading
 * `enabled` off a list row and off a patch response reads it at the
 * same path. The health columns and the aggregate are one reading
 * anyway: `consecutiveFailures` is the current streak and
 * `parseStats.failed` is the standing total.
 */
export interface SourceWithParseStats extends SourceRecord {
  /** The counts, every member present. */
  readonly parseStats: ParseStatusCounts;
}

/**
 * One row of the failures queue: a document captured through this
 * source whose payload did not parse under its contract.
 *
 * COLUMN-SCOPED, AND THE ONLY RECORD ON THIS PORT THAT IS. Every
 * other record here answers its table whole, because there is
 * nothing on `sources` a reader of the API may not have. `documents`
 * carries `raw`, `features` and `embedding` — a stored payload and
 * two derived vectors that a review surface has no use for and that
 * would dwarf the five members below on the wire. So this shape is a
 * decision about what the queue is FOR rather than a projection
 * somebody trimmed for size.
 *
 * `parseStatus` IS NOT HERE, and its absence is the filter. Every
 * row this record stands for is `failed` by construction, so a
 * member repeating that would be a column whose value is a constant.
 * Nor is `sourceId`: the source is the path.
 *
 * THE BODY IS AS STORED, UNMASKED AND UNCUT. This port answers what
 * the column holds; `src/sources/failures-service.ts` is what
 * replaces every control byte with its \uXXXX text form through
 * `maskControlBytes`, cuts the body to a code-point cap through
 * `takeCodePoints`, and answers `bodyBytes` and `bodyTruncated`
 * beside it. The split is the same one every other rule on this port
 * obeys — a store answers rows and a service decides — and it is
 * what lets the masking be tested against a planted control byte
 * with no database.
 */
export interface SourceFailureRecord {
  /** `documents.id`, and the tiebreak on the queue's order. */
  readonly id: number;

  /**
   * Where the document can be read at its source, when there is
   * such a place. NULL means there is not — an ingested file, a
   * pasted body — and never an empty string.
   */
  readonly url: string | null;

  /**
   * The document's text as captured, verbatim and possibly empty.
   *
   * Empty is a capture that yielded no text and was kept anyway,
   * which is fail-flag-keep working rather than a row to skip: a
   * source whose shape has drifted leaves something to read instead
   * of a silence indistinguishable from a quiet day.
   */
  readonly body: string;

  /**
   * What went wrong, as the writer that saw it recorded it, or null
   * when nothing was recorded.
   *
   * Nothing in the database ties this to the status, so a `failed`
   * row with a null error is storable — and it is the shape that
   * costs the most, since the document is kept, the source's counter
   * climbs, and what the operator is shown is a failure nobody can
   * act on. The queue answers it as null rather than papering over
   * it with a message no writer wrote.
   */
  readonly parseError: string | null;

  /**
   * When the pipeline captured the document, which is not when its
   * source published it. What the queue is ordered by, newest
   * first, and why the order needs `id` beside it: a batch capture
   * writes many rows inside one statement and `defaultNow()` gives
   * them one timestamp, so a tie at a page boundary would let two
   * pages disagree about which row they hold.
   */
  readonly capturedAt: Date;
}

/**
 * What a source has ACCUMULATED, per dependent table, as
 * {@link SourceStore.countSourceDependents} counted it.
 *
 * TWO OF THE THREE REFUSING FOREIGN KEYS, and the module header says
 * which one is missing and why. These two are the ones the surface
 * reports: a `409` on `DELETE /sources/:id` carries both numbers in
 * its details, so a caller reading the refusal learns what the
 * delete would have taken rather than only that it was refused.
 *
 * A zero is a counted zero, on the same terms
 * `DomainDependentCounts` in `src/domains/store.ts` states: an
 * implementation grouping one query over the two tables has to fill
 * a missing group in, because a table holding no rows contributes no
 * row to a grouped result.
 *
 * BOTH ZERO IS NOT A PROMISE THAT THE DELETE WILL LAND. The third
 * key still refuses a source a config proposal names, and a
 * concurrent capture can write a document between this count and the
 * delete. {@link SourceStore.deleteSource} declares the refusal for
 * both reasons.
 */
export interface SourceDependentCounts {
  /** Rows in `documents` carrying this `source_id`. */
  readonly documents: number;

  /** Rows in `finding_sightings` carrying this `source_id`. */
  readonly findingSightings: number;
}

/**
 * What {@link SourceStore.insertSource} is handed: a complete source,
 * minus the id the write stamps and minus the five columns the
 * pipeline owns.
 *
 * EVERY MEMBER IS REQUIRED, INCLUDING THE ONES THE COLUMN DEFAULTS,
 * and that is the port deciding nothing again — the argument
 * `InsertDomainInput` makes for its `settings` and
 * `InsertTopicInput` for its `enabled`. A default is a decision
 * about what an omission means, and leaving `parserConfig` or
 * `enabled` to the column would make the drizzle implementation
 * quietly right and the in-memory one quietly wrong, since only one
 * of the two has a column to default from. `./service.ts` supplies
 * the empty objects and the `true` where the choice is visible and a
 * test can reach it.
 *
 * THE FIVE PIPELINE COLUMNS ARE ABSENT, so a source is INSERTED
 * NEVER FETCHED: no cursor, no failures, neither stamp, and
 * unflagged. There is no way to create one that claims a history it
 * does not have, and the containment is structural rather than a
 * check an implementation could forget.
 */
export interface InsertSourceInput {
  /**
   * The domain this source feeds, as
   * `DomainStore.findDomainBySlug` in `src/domains/store.ts` already
   * resolved it from the `:slug` in the path.
   */
  readonly domainId: number;

  /**
   * The transport family. `sources_kind_check` refuses one outside
   * `SOURCE_KINDS`; the boundary refuses it first.
   */
  readonly kind: string;

  /** Where the payload is. Never unique, per the module header. */
  readonly endpoint: string;

  /** The arrangement for reading it. Possibly empty, never absent. */
  readonly parserConfig: Readonly<Record<string, unknown>>;

  /** What a payload has to contain. Possibly empty, never absent. */
  readonly contract: Readonly<Record<string, unknown>>;

  /** Whether the pipeline may read it from the outset. */
  readonly enabled: boolean;
}

/**
 * What {@link SourceStore.updateSource} is handed: the members to
 * rewrite, and no others.
 *
 * `kind` IS PATCHABLE, which is what puts `sources_kind_check` on
 * the update as well as on the insert. Repointing a feed at a
 * different transport is an ordinary correction — a source
 * configured as `url` that turns out to serve an `api` payload — and
 * what it changes is which adapter in `./index.ts` reads the row on
 * the next pass. It leaves the documents already captured through
 * the source exactly where they are, which is the point of a source
 * being configuration rather than code.
 *
 * `domainId` is deliberately absent, so a source cannot be moved
 * between domains. The corpus it produced carries the OLD domain on
 * every row — `documents.domain_id` is its own column — so a move
 * would leave a feed in one domain and its documents in another,
 * with nothing in the schema to notice. Its absence is also what
 * keeps every foreign-key refusal off this method.
 *
 * THE FIVE PIPELINE COLUMNS ARE ABSENT, per the module header, so no
 * patch can clear a flag, rewind a cursor, or backdate a stamp.
 *
 * EVERY MEMBER DISTINGUISHES TWO REQUESTS AND NOT THREE, which is
 * where this patch differs from `TopicPatch` and `CategoryPatch`:
 * absent leaves the column alone, present writes it, and there is no
 * third `null` reading, because every column here is NOT NULL. The
 * two jsonb columns are cleared by sending an empty object, which is
 * what "empty" means at those columns rather than a workaround.
 */
export interface SourcePatch {
  /**
   * The new transport family, or absent to leave it alone.
   * `sources_kind_check` refuses one outside `SOURCE_KINDS`.
   */
  readonly kind?: string;

  /** The new address, or absent to leave it alone. */
  readonly endpoint?: string;

  /**
   * The arrangement to store WHOLE, or absent to leave it alone.
   * Never merged into what is already there: a caller sends the
   * config it wants to exist, which is the only shape under which
   * removing a selector is expressible at all — the rule
   * `DomainPatch.settings` states for its own payload.
   */
  readonly parserConfig?: Readonly<Record<string, unknown>>;

  /** The contract to store WHOLE, on the same terms. */
  readonly contract?: Readonly<Record<string, unknown>>;

  /**
   * Whether the pipeline may read this source, or absent to leave it
   * alone. This is the column for retiring a feed; deleting it is
   * {@link SourceStore.deleteSource}, and that delete is refused
   * while the corpus it produced is still there.
   */
  readonly enabled?: boolean;
}

/**
 * Every database operation the sources surface performs.
 *
 * Nine methods and no escape hatch: there is no `query`, no exposed
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
 * SIX ORDINARY METHODS, A GUARD, AND TWO READS OVER ANOTHER TABLE,
 * which is the split worth reading this interface by. Six are the
 * resource operations every port in this service declares — a
 * windowed list, its count, a lookup, an insert, a patch and a
 * delete. {@link SourceStore.countSourceDependents} is the delete
 * guard, the shape `DomainStore` also carries. The last two read
 * `documents` rather than `sources`, and they are here rather than
 * on a port of their own because the queue they back is addressed as
 * a source's — `GET /sources/:id/failures` — and because a port that
 * could read those rows without writing them is the point, per the
 * module header.
 *
 * NO METHOD RESOLVES A DOMAIN, AND NONE DELETES ONE. `:slug` becomes
 * a domain row through `DomainStore.findDomainBySlug` in
 * `src/domains/store.ts` before anything here is called, and the
 * cascade that takes a domain's sources with it belongs to
 * `DomainStore.deleteDomain` and to the `ON DELETE CASCADE` behind
 * `sources.domain_id`. One in-memory implementation stands behind
 * both ports over one dataset, which is what keeps a domain deleted
 * in one of them deleted in the other.
 *
 * NO METHOD FETCHES ANYTHING. This port reads and writes rows about
 * feeds; it never opens a socket to one, never constructs an adapter
 * from `./index.ts`, and never runs a parse. A `PATCH` that repoints
 * an endpoint is an UPDATE that lands and answers, with no probe of
 * the new address, so a config that turns out to be wrong is
 * discovered by the next pipeline pass rather than by the request
 * that wrote it. That is the ordinary price of configuration being a
 * row, and it is what keeps this surface answerable in the isolated
 * suite with no network at all.
 */
export interface SourceStore {
  /**
   * Reads one window of a domain's sources, ordered by
   * {@link SourceRecord.id} ascending, each with its parse-status
   * aggregate.
   *
   * THE ORDER IS PART OF THE CONTRACT, because a window over an
   * unordered read is not a page. Postgres promises nothing about
   * row order without an `ORDER BY`, so two requests for consecutive
   * pages may repeat one row and skip another while every count on
   * the wire still adds up.
   *
   * Ordered by `id` rather than by a natural key, because this table
   * has none — the module header's first consequence, met here.
   * `endpoint` is not unique, so ordering on it needs a tiebreak and
   * moves a row whenever somebody repoints it; `id` is unique, total,
   * already the key everything else addresses a source by, and puts
   * the list in the order the feeds were configured in.
   *
   * THE AGGREGATE IS PART OF THIS READ AND NOT A SECOND CALL, so an
   * implementation counts the whole page in one `GROUP BY (source_id,
   * parse_status)` rather than a query per source. A second method
   * answering the counts would make the per-source loop the natural
   * way to call it, which is what this signature rules out.
   *
   * @param domainId - The domain whose sources to read, as
   *   `DomainStore.findDomainBySlug` in `src/domains/store.ts`
   *   already returned it.
   * @param window - `limit` and `offset`, as `toStoreWindow` in
   *   `src/http/schemas.ts` derived them from `?page`/`?perPage`.
   *   The window arrives already validated, so no implementation
   *   re-checks its bounds.
   * @returns The rows in that window, possibly empty, each carrying
   *   every member of {@link ParseStatusCounts} — a source that has
   *   captured nothing answers a counted zero under each rather than
   *   an empty record. A window past the end of the collection, a
   *   domain with no sources and an id no domain carries are all an
   *   empty list rather than an error: none of the three is a
   *   failure to read, and whether the domain existed is a question
   *   `DomainStore.findDomainBySlug` answered before this was called.
   */
  listSourcesWithParseStats(
    domainId: number,
    window: StoreWindow,
  ): Promise<readonly SourceWithParseStats[]>;

  /**
   * Counts a domain's sources, ignoring any window.
   *
   * Separate from {@link SourceStore.listSourcesWithParseStats}
   * rather than answered beside it, because the two are different
   * questions: a page's total describes the collection and not the
   * page. Splitting them also keeps the list read free of a window
   * function an in-memory implementation could only imitate.
   *
   * Counts SOURCES and never documents. The document counts belong
   * to the aggregate on each row, and this is the number `meta.total`
   * on the page is derived from.
   *
   * @param domainId - The domain to count within.
   * @returns How many rows `sources` holds for it. An id no domain
   *   carries answers `0`, which is correct rather than a special
   *   case: nothing points at a row that is not there.
   */
  countSources(domainId: number): Promise<number>;

  /**
   * Looks one source up by its id. Where every request naming
   * `/sources/:id` enters — the patch, the delete, and the failures
   * queue, which resolves the source before it reads a document.
   *
   * Answers the row WITHOUT its parse-status aggregate, deliberately.
   * None of the three callers needs the counts — two are about to
   * write the row and the third is about to read the failed documents
   * themselves — and counting on every lookup would put a `documents`
   * scan behind `PATCH /sources/:id`.
   *
   * @param id - The id as `resourceIdParamSchema` in
   *   `src/http/schemas.ts` parsed it.
   * @returns The row, or null when no source carries that id. Null
   *   is neither an error nor a refusal: it is the fact from which
   *   the service decides a 404. The row carries
   *   {@link SourceRecord.domainId}, which is the only thing saying
   *   which domain an addressed source belongs to.
   */
  findSourceById(id: number): Promise<SourceRecord | null>;

  /**
   * Inserts one source, NEVER FETCHED: no cursor, no failures,
   * neither stamp and unflagged, because {@link InsertSourceInput}
   * carries no member that could set one.
   *
   * ALWAYS INSERTS, AND CANNOT CONFLICT. `sources` carries no unique
   * key, so there is nothing for an `ON CONFLICT` to land on and no
   * `unique-violation` to answer a `409` from — the one thing about
   * this method a reader coming from the topics or personas port
   * will expect and not find.
   *
   * @param input - The complete row, minus its id and the five
   *   columns the pipeline owns.
   * @returns The stored row, read back rather than reconstructed
   *   from the input, so the id is the database's own and the
   *   defaults are the ones actually stored.
   * @throws A `StoreRefusal` with `reason` `check-violation` and
   *   `constraint` `sources_kind_check`, when `kind` is outside
   *   `SOURCE_KINDS`. The service holds the request to that tuple
   *   first, so this is reachable only by a caller that bypassed it.
   * @throws A `StoreRefusal` with `reason` `foreign-key-violation`
   *   and `constraint` `sources_domain_id_domains_id_fk`, when
   *   `domainId` names no domain. The service resolved the domain
   *   before calling, so this is reachable only if the row went in
   *   between.
   */
  insertSource(input: InsertSourceInput): Promise<SourceRecord>;

  /**
   * Rewrites the supplied members of one source.
   *
   * NEVER WRITES A PIPELINE-OWNED COLUMN, WHATEVER IT IS HANDED,
   * because {@link SourcePatch} declares no member that could carry
   * one. That is the containment stated in the module header,
   * expressed as a type rather than as a check an implementation
   * could forget.
   *
   * A PATCH CARRYING NO MEMBER ANSWERS THE STORED ROW WITHOUT
   * WRITING, and this port decides that rather than leaving it to two
   * implementations. `sources` has no `updated_at`, so an empty patch
   * has literally nothing to set: drizzle throws `No values to set`
   * on an empty update list, while an in-memory implementation would
   * happily answer the row. Left unstated, the two halves of this
   * port would disagree about a call the surface admits.
   * `TopicStore.updateTopic` carries the same rule for the same
   * reason; `DomainStore.updateDomain` does not, because `domains`
   * has a timestamp to stamp.
   *
   * The edit is visible to the next pipeline pass and to no pass
   * already in flight, on the same terms every other configuration
   * edit is: nothing between this port and the query a pass issues at
   * its own start keeps a copy, so there is no cache to expire and no
   * invalidation path to get wrong.
   *
   * @param id - The {@link SourceRecord.id} a read already returned.
   * @param patch - The members to rewrite. `parserConfig` and
   *   `contract` each replace the stored document WHOLE and are
   *   never merged into it.
   * @returns The stored row afterwards, or null when no row carries
   *   that id. Null is reachable even after a successful read, since
   *   the row may go in between, and answering it rather than
   *   throwing leaves what that means to the caller.
   * @throws A `StoreRefusal` with `reason` `check-violation` and
   *   `constraint` `sources_kind_check`, when the RESULTING `kind`
   *   is outside `SOURCE_KINDS`. This is the only refusal an update
   *   raises: `domainId` is not patchable, so no update reaches the
   *   foreign key, and the table has no unique key to violate.
   */
  updateSource(id: number, patch: SourcePatch): Promise<SourceRecord | null>;

  /**
   * Counts what a source has accumulated, and takes no view of it.
   *
   * The guard behind `DELETE /sources/:id`, read before the delete is
   * attempted so that the refusal can say what the delete would have
   * taken. Whether a non-zero count refuses is `./service.ts`'s, and
   * on this resource it refuses absolutely: there is no
   * `?cascade=confirm` here, because what a cascade would take is a
   * corpus rather than the configuration the caller was editing.
   *
   * @param id - The {@link SourceRecord.id} to count against. The
   *   dependent tables carry `source_id`, so this is the only key
   *   available.
   * @returns Both counts, every one present.
   *
   * @remarks
   * A zero is a counted zero; {@link SourceDependentCounts} carries
   * why an implementation grouping one query has to fill the missing
   * groups in.
   *
   * An id no source carries answers two zeros rather than failing,
   * which is correct rather than a special case: nothing points at a
   * row that is not there. Whether that id should have existed is a
   * question {@link SourceStore.findSourceById} already answered.
   *
   * TWO OF THE THREE REFUSING KEYS ARE COUNTED. Both zero is not a
   * promise the delete will land — `source_config_proposals` is not
   * counted here, and a capture can write a document between this
   * call and the next one. The module header carries the whole of
   * that argument.
   */
  countSourceDependents(id: number): Promise<SourceDependentCounts>;

  /**
   * Deletes one source.
   *
   * NO CASCADE ANYWHERE, which is the opposite of what
   * `DomainStore.deleteDomain` does and is the schema's decision
   * rather than this method's. All three foreign keys onto
   * `sources.id` emit `ON DELETE no action`, so this either removes a
   * row nothing references or is refused; it never takes a second row
   * with it.
   *
   * The guard above is what makes the ordinary refusal legible, and
   * this method is what makes it true. A service that only consulted
   * the counts would be enforcing a convention; the database refuses
   * whoever asks, this port included.
   *
   * @param id - The {@link SourceRecord.id} a read already returned.
   * @returns Whether a row was removed. False means no source
   *   carried that id.
   * @throws A `StoreRefusal` with `reason` `foreign-key-violation`
   *   naming whichever key refused —
   *   `documents_source_id_sources_id_fk` while the corpus holds its
   *   documents, `finding_sightings_source_id_sources_id_fk` while
   *   sightings cite it, or
   *   `source_config_proposals_source_id_sources_id_fk` while a
   *   config proposal names it. The service reads the first two off
   *   {@link SourceStore.countSourceDependents} before calling and
   *   the third off nothing, so only the third arrives here
   *   unannounced.
   */
  deleteSource(id: number): Promise<boolean>;

  /**
   * Reads one window of a source's failed captures, ordered by
   * {@link SourceFailureRecord.capturedAt} descending with
   * {@link SourceFailureRecord.id} descending breaking a tie.
   *
   * READS `documents` AND WRITES NOTHING. This method and the count
   * beside it are the whole of what this port does with that table,
   * per the module header: there is no insert, no update and no
   * delete, so the review queue is read-only structurally rather than
   * by convention.
   *
   * NEWEST FIRST, BECAUSE THE QUEUE IS WORKED FROM THE TOP. What
   * broke most recently is what an operator is deciding about, and an
   * ascending order would put the oldest failure of a long-broken
   * feed on page one forever.
   *
   * THE TIEBREAK IS NOT OPTIONAL. `captured_at` alone is not a total
   * order: a batch capture writes many rows inside one statement and
   * `defaultNow()` gives them all one timestamp, so a tie spanning a
   * page boundary lets two pages disagree about which row they hold —
   * one row shown twice and another shown never, with nothing in
   * either response saying so. `id` descending closes it, descending
   * so the tiebreak reads the same direction as the sort.
   *
   * FAILED ROWS ONLY, and the filter is this method's rather than a
   * caller's. There is no status parameter, so the queue cannot be
   * asked for `ok` documents and this port cannot become a way to
   * page the corpus. `documents_source_parse_status_idx` over
   * (`source_id`, `parse_status`) is what serves the filter.
   *
   * @param sourceId - The {@link SourceRecord.id} a read already
   *   returned. Documents carry `source_id`, so this is the key
   *   available.
   * @param window - `limit` and `offset`, already validated, as on
   *   {@link SourceStore.listSourcesWithParseStats}.
   * @returns The rows in that window, possibly empty. A source whose
   *   captures all parsed, a source that has captured nothing, a
   *   window past the end and an id no source carries are all an
   *   empty list rather than an error. Bodies come back AS STORED —
   *   unmasked and uncut — and `src/sources/failures-service.ts` is
   *   what masks and cuts them.
   */
  listSourceFailures(
    sourceId: number,
    window: StoreWindow,
  ): Promise<readonly SourceFailureRecord[]>;

  /**
   * Counts one source's failed captures, ignoring any window.
   *
   * The same read as {@link SourceStore.listSourceFailures} without
   * the window, and separate from it for the reason
   * {@link SourceStore.countSources} gives: a page's total describes
   * the collection and not the page.
   *
   * THE SAME ROWS AS `parseStats.failed` ON THE LIST ROUTE, asked
   * for differently. That aggregate is answered for a page of
   * sources so an operator can see which feeds are failing; this is
   * the total behind one source's queue, and it is what `meta.total`
   * on that page is derived from. An implementation is free to serve
   * both from the same index.
   *
   * @param sourceId - The {@link SourceRecord.id} a read already
   *   returned.
   * @returns How many of that source's documents stand at `failed`.
   *   An id no source carries answers `0`.
   */
  countSourceFailures(sourceId: number): Promise<number>;
}
