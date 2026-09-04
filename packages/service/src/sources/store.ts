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
 * A REFUSAL IS NOT THE SAME AS A FAULT, and
 * {@link SourceStore.approveAndApplyProposal} is the one method here
 * where the difference is legible. The rule above is about what this
 * port answers a REQUEST with. An implementation asserting that its
 * own previous statement did what it says — that the row it approved
 * one statement ago reads as approved — is making a claim about
 * itself and not about the caller, and reaching that assertion means
 * the implementation is broken rather than the request. It is a 500,
 * it is not a `StoreRefusal`, and nothing catches it by reason.
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
 * promising that a zero count means the delete will land.
 *
 * The proposals half of this surface has since landed — the four
 * methods at the foot of {@link SourceStore} read that table and
 * rule on it — and the count deliberately did not come with it.
 * {@link SourceDependentCounts} is what a refusal REPORTS, so
 * widening it would change the body of a `409` no route on this
 * wave asked for, and a third number would say the delete is about
 * to take a proposal when what a proposal does is refuse the
 * delete. The third key still arrives unannounced, exactly as
 * {@link SourceStore.deleteSource} says it does.
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
 * NO METHOD HERE WRITES A `documents` ROW. Two of the thirteen read
 * that table — {@link SourceStore.listSourceFailures} and
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
 * A PROPOSAL IS MET AT ITS SOURCE AND RULED ON BY ITS OWN ID, which
 * is the same split one table over.
 * {@link SourceStore.listPendingProposals} and the count beside it
 * take a {@link SourceRecord.id}, because
 * `GET /sources/:id/pending-configs` is where the queue is addressed
 * from. {@link SourceStore.findProposalById} and
 * {@link SourceStore.approveAndApplyProposal} take a
 * {@link SourceConfigProposalRecord.id}, because
 * `POST /sources/:id/approve-config` names the row it rules on in
 * its BODY and the two may disagree — a mistyped id, a stale queue,
 * a caller trying one number after another. A read scoped to the
 * source could not tell those apart from an id that names nothing,
 * and {@link SourceStore.findProposalById} argues why that
 * difference is worth an unscoped read.
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
 * One `source_config_proposals` row, whole — every column the table
 * declares, in the order it declares them.
 *
 * WHAT THE ROW IS: an arrangement for reading one feed that a model
 * proposed and nobody has acted on yet. `sources.parser_config` and
 * `sources.contract` say how a source is read and what a correct
 * reading of it looks like, and the write that moves those two
 * columns is the one every later pass inherits — so a proposal
 * lands here as a row and only an approval moves it across.
 * `src/db/schema/sources.ts` argues the gate at the table.
 *
 * WHOLE RATHER THAN COLUMN-SCOPED, which keeps
 * {@link SourceFailureRecord} the only trimmed record on this port
 * and is not a default taken for want of a reason. The gate is an
 * approval OF THESE TWO DOCUMENTS: an operator rules on exactly what
 * will be written rather than on an account of what a model would
 * answer if it were asked again, so a record describing the payloads
 * instead of carrying them would make the ruling a ruling about
 * something else. `ResearchPoolRecord.searchTerms` in
 * `src/entities/store.ts` makes the same argument over the other
 * gate's payload.
 *
 * ONE QUEUE WITH TWO CLIENTS, and this record is the row both of
 * them read. `listPendingProposals` in `scripts/approve.ts` selects
 * the table whole, so the CLI and this port answer one shape rather
 * than two views a reader has to reconcile.
 * {@link SourceStore.listPendingProposals} carries the rest of that
 * claim, and says which parts of it are the queue and which are the
 * client.
 *
 * FOUR OF THESE MEMBERS ARE THE RULING, AND THE PROJECTION IS
 * DECLARED ELSEWHERE. `describeRuling` in `src/approvals/ruling.ts`
 * reads `id`, `status`, `approvedAt` and `appliedAt` and answers the
 * four-member `Ruling` both approval routes answer with — this row
 * being the `StoredProposalRuling` half of its input, where a
 * `research_pool` row is the other. It satisfies that input
 * STRUCTURALLY rather than by extending it: this port imports
 * nothing but its window type, and the type-check at the service's
 * own call site is what holds the two together.
 *
 * FOUR MORE ARE THE APPLIER'S INPUT, on the same terms.
 * `ApprovedProposal` in `./config-proposer.ts` is a `Pick` over
 * `id`, `approvedAt`, `parserConfig` and `contract`, so a row read
 * through this port can be handed straight to
 * `proposalToSourceUpdate` with nothing copied out and no second
 * shape in between.
 *
 * NOTHING HERE RECORDS AN EDIT. There is no `updated_at` on the
 * table, so a writer that rewrites `parserConfig` after
 * `approvedAt` is stamped changes what was approved without the
 * approval moving, and neither the schema nor this record notices.
 * The column says so itself; it is stated here because this is the
 * shape an approval is read through.
 */
export interface SourceConfigProposalRecord {
  /**
   * `source_config_proposals.id`, and the id a ruling names.
   *
   * The one member a caller SUBMITS: the body of
   * `POST /sources/:id/approve-config` carries it, where every
   * other member here is answered rather than asked for.
   */
  readonly id: number;

  /**
   * The domain whose source this proposal is about.
   *
   * Carried because this record answers its table whole, and read
   * by nothing on this surface: the queue is scoped by source, the
   * containment check below is over
   * {@link SourceConfigProposalRecord.sourceId}, and the applier
   * writes one `sources` row by id. It is redundant against that
   * member too — the same domain is reached through
   * `sources.domain_id` — and the column exists so that deleting a
   * domain cascades to these rows inside the statement that
   * cascades to its sources, which is a fact about the delete
   * rather than about this read.
   *
   * `ResearchPoolRecord` in `src/entities/store.ts` DROPS its
   * `domainId` for the reason this one keeps it, and the two are
   * not in conflict: that record is a deliberate slice of its
   * table and this one is not.
   */
  readonly domainId: number;

  /**
   * The source this proposal is for, and the member the
   * containment check reads.
   *
   * {@link SourceStore.findProposalById} is unscoped, so this is
   * what `./proposals-service.ts` holds against the source in the
   * path before it rules on anything. A proposal naming another
   * source is a `404` and never a `409`, the ordering
   * `src/approvals/ruling.ts` argues for.
   *
   * NOT NULL, where the other gate's parent is nullable. A
   * `research_pool` row may name no subject at all; a proposed
   * `parser_config` is an arrangement for reading one particular
   * feed, so a row naming no source is a proposal with nothing to
   * apply it to. `on no source` is therefore a state the
   * containment check never meets here.
   */
  readonly sourceId: number;

  /**
   * The `parser_config` being proposed: what an approval writes
   * onto `sources.parser_config`.
   *
   * `unknown`, matching the column, which carries no `$type` for
   * the reason {@link SourceRecord.parserConfig} records — what a
   * parser config holds differs by `kind`, so one interface across
   * all four would describe none of them accurately.
   *
   * AS STORED AND UNREAD. Nothing on this port validates it.
   * `parserConfigErrors` in `src/lib/parser-config.ts` is what says
   * whether a config is well-formed, and an operator reading the
   * queue is who that answer is for: a malformed proposal is
   * storable, says something true about what was asked, and is one
   * to reject rather than one the table should refuse. What makes a
   * bad one merely wrong rather than dangerous is that the parse
   * engine performs the operations a config implements and
   * evaluates nothing it finds in one.
   *
   * Empty is a complete value and the column's default: a model
   * asked for an arrangement and answering with nothing usable.
   */
  readonly parserConfig: unknown;

  /**
   * The `contract` being proposed, and the other half of one
   * answer: what an approval writes onto `sources.contract`.
   *
   * `unknown` and as stored, on the terms above. Proposed together
   * with the config and approved together, because the two describe
   * one arrangement from both ends — an extraction rule approved
   * without the test that says it still holds leaves nothing to
   * notice the day the source's shape drifts, which is the failure
   * the propose path exists to answer in the first place.
   *
   * Empty is a complete value and inherits the target column's
   * cost: where a contract declares nothing, nothing is rejected
   * and nothing is counted, so a source whose shape has drifted
   * reads exactly like one that is still working.
   */
  readonly contract: unknown;

  /**
   * What proposed this — the `connectors.name` of the model
   * endpoint that was asked, or whatever else a writer named
   * itself as.
   *
   * Provenance and nothing addressable. Nothing checks that the
   * name resolves, nothing is dispatched from it, and a row may
   * name a connector that never existed; the column carries the
   * whole of that argument. It is on the record because an operator
   * ruling on a queue is deciding partly on who proposed what.
   *
   * NOT NULL, which is not the same as non-empty: an empty string
   * is a writer that did not say.
   */
  readonly proposedBy: string;

  /**
   * Where the row stands in the gate, as stored.
   *
   * `string` rather than the `ResearchPoolStatus` union, which is
   * what a SELECT actually answers: the tuple is a CHECK in the
   * database rather than a union in the type system, so a row
   * written before a member was removed still reads back.
   * `ResearchPoolRecord.status` in `src/entities/store.ts` and
   * `Ruling.status` in `src/approvals/ruling.ts` take the same view
   * of the same column and record the same reason.
   *
   * THE COLUMN IS THE ACCOUNT OF THE ROW AND NOT THE GATE. Nothing
   * refuses a transition and a writer may set any member at any
   * time, `done` on a row nobody approved included.
   * `source_config_proposals_approval_check` never consults it — it
   * holds the two timestamps against each other and nothing else —
   * so a row may state a status its stamps do not support, and
   * `proposalToSourceUpdate` in `./config-proposer.ts` deliberately
   * reads the stamp rather than this member.
   */
  readonly status: string;

  /**
   * When the proposal was made. The proposing IS the insert, so
   * there is no window in which a row exists and nothing has been
   * proposed.
   *
   * What the queue is ordered by, oldest first, with
   * {@link SourceConfigProposalRecord.id} breaking the tie `now()`
   * makes inevitable — argued at
   * {@link SourceStore.listPendingProposals}.
   */
  readonly proposedAt: Date;

  /**
   * When a person ruled in favour, or null while nobody has — the
   * state every row starts in and the one an apply step passes
   * over.
   *
   * THE ONE MEMBER THE APPLIER READS. `proposalToSourceUpdate` in
   * `./config-proposer.ts` refuses a row carrying null here, and
   * consults nothing else: not the status, which may disagree with
   * it, and not the source row, which cannot say who agreed to
   * what. That refusal is the whole of what stands between an
   * unruled proposal and the two columns every later pass reads,
   * because `source_config_proposals_approval_check` constrains
   * this row's own timestamps and says nothing about `sources`.
   *
   * Written `coalesce(approved_at, now())`, so a second ruling
   * answers the FIRST one's time. A client reading an instant older
   * than the request it just made has found the idempotence rather
   * than a fault.
   */
  readonly approvedAt: Date | null;

  /**
   * When the approved documents were written onto the source row,
   * and null while they have not been.
   *
   * THE CLOSING STAMP, which is what `describeRuling` in
   * `src/approvals/ruling.ts` reads it as: the same fact
   * `research_pool.researched_at` records for the other gate, under
   * a column name of its own, translated once there and nowhere
   * else.
   *
   * It cannot be read back off the source. `sources.parser_config`
   * holds whatever it holds now — an operator may have edited it
   * since, a later proposal may have overwritten it, and two
   * proposals may have been identical — so only this member says
   * that THIS row is the one that was written, and when.
   *
   * A non-null here requires a non-null above, under
   * `source_config_proposals_approval_check`, and the rule bites
   * from both directions: an application cannot be recorded without
   * the approval, and an approval cannot be withdrawn from a config
   * already written. That is why
   * {@link SourceStore.approveAndApplyProposal} stamps the two in
   * the order it does.
   */
  readonly appliedAt: Date | null;
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
 * Thirteen methods and no escape hatch: there is no `query`, no
 * exposed connection and no transaction handle, so an
 * implementation is substitutable by anything that can hold rows.
 * That closure is what makes the in-memory implementation a genuine
 * second implementation rather than a stub covering the easy calls.
 *
 * Every method is asynchronous, including the ones an in-memory
 * implementation could answer synchronously. The port is shaped by
 * the caller that has to await a database, and a synchronous member
 * would be one drizzle could not satisfy.
 *
 * SIX ORDINARY METHODS, A GUARD, TWO READS OVER ANOTHER TABLE AND A
 * GATE OVER A THIRD, which is the split worth reading this
 * interface by. Six are the resource operations every port in this
 * service declares — a windowed list, its count, a lookup, an
 * insert, a patch and a delete.
 * {@link SourceStore.countSourceDependents} is the delete guard,
 * the shape `DomainStore` also carries. Two read `documents` rather
 * than `sources`, and they are here rather than on a port of their
 * own because the queue they back is addressed as a source's —
 * `GET /sources/:id/failures` — and because a port that could read
 * those rows without writing them is the point, per the module
 * header.
 *
 * The last four are `source_config_proposals`, and they are here on
 * the same terms: `GET /sources/:id/pending-configs` and
 * `POST /sources/:id/approve-config` address a source, so a port of
 * their own would be one addressed the same way over rows the same
 * service reads. They are also the one place this port writes
 * anything but a `sources` row.
 * {@link SourceStore.approveAndApplyProposal} writes both tables at
 * once, and says why that has to be one transaction.
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

  /**
   * Reads one window of a source's PENDING config proposals,
   * ordered by {@link SourceConfigProposalRecord.proposedAt}
   * ascending with {@link SourceConfigProposalRecord.id} ascending
   * breaking a tie.
   *
   * ONE QUEUE WITH TWO CLIENTS. The predicate and both ordering
   * keys are `listPendingProposals` in `scripts/approve.ts` member
   * for member: `status` equal to the `pending` member of
   * `RESEARCH_POOL_STATUSES` in `src/db/schema/values.ts`, then
   * `proposed_at` ascending, then `id` ascending. That is not a
   * coincidence to be preserved by hand but the substance of the
   * arrangement — the CLI and this route are two ways to reach one
   * backlog, so an operator who rules from a terminal and one who
   * rules from the API have to be looking at the same next row.
   * Two queues that happen to agree today would drift the first
   * time either was edited, and nothing anywhere would report it.
   *
   * WHAT DIFFERS IS THE CLIENT AND NOT THE QUEUE, and saying which
   * is which is what keeps `member for member` a claim somebody can
   * check. That function is addressed at no source: it reads every
   * pending proposal in the deployment under a `limit` that is a
   * ceiling on an undrained backlog rather than a page, because a
   * terminal listing has no cursor to page with. This one is
   * addressed as `GET /sources/:id/pending-configs`, so it is
   * scoped to one feed and takes a `window` that pages. Two clients
   * reading one queue must agree about WHICH ROW IS NEXT; they need
   * not agree about how much of it either can see at once.
   *
   * OLDEST FIRST, BECAUSE THE QUEUE IS WORKED FROM THE TOP, which
   * is the opposite of {@link SourceStore.listSourceFailures} one
   * table over and is the right way round for the same reason. A
   * failure queue is about what broke most recently; a gate is
   * about what has been waiting longest. `source_config_proposals`
   * carries no unique key over `source_id`, deliberately, so a feed
   * that has been failing every pass collects several pending
   * proposals — and the oldest is the one whose absence of a ruling
   * has cost the most passes. `source_config_proposals.proposed_at`
   * names this order at the column.
   *
   * THE TIEBREAK IS NOT OPTIONAL. `now()` is the TRANSACTION's start
   * time, so several proposals written in one pass tie to the
   * microsecond and timestamptz stores nothing finer. A tie
   * spanning a page boundary lets two pages disagree about which
   * row they hold — one row shown twice and another shown never,
   * with nothing in either response saying so. `id` ascending
   * closes it, ascending so the tiebreak reads the same direction
   * as the sort.
   *
   * PENDING ONLY, AND THE FILTER IS THIS METHOD'S RATHER THAN A
   * CALLER'S. There is no status parameter, so the queue cannot be
   * asked for approved or applied rows and this port cannot become
   * a way to page the gate's history — the containment
   * {@link SourceStore.listSourceFailures} states for `failed`,
   * met again here. What an operator is owed is what is waiting on
   * them. `source_config_proposals_source_id_status_idx` over
   * (`source_id`, `status`) is what serves it.
   *
   * @param sourceId - The {@link SourceRecord.id} a read already
   *   returned. Proposals carry `source_id`, so this is the key
   *   available.
   * @param window - `limit` and `offset`, as `toStoreWindow` in
   *   `src/http/schemas.ts` derived them from `?page`/`?perPage`,
   *   already validated.
   * @returns The rows in that window, possibly empty. A source with
   *   nothing pending, a source whose proposals have all been ruled
   *   on, a window past the end and an id no source carries are all
   *   an empty list rather than an error. Both proposed documents
   *   come back AS STORED, unread and uncut: the queue is what an
   *   approval is given from, so answering an account of them
   *   instead would make the ruling a ruling about something else.
   */
  listPendingProposals(
    sourceId: number,
    window: StoreWindow,
  ): Promise<readonly SourceConfigProposalRecord[]>;

  /**
   * Counts one source's pending config proposals, ignoring any
   * window.
   *
   * The same read as {@link SourceStore.listPendingProposals}
   * without the window, and separate from it for the reason
   * {@link SourceStore.countSources} gives: a page's total
   * describes the collection and not the page.
   *
   * COUNTS THE QUEUE AND NOT THE TABLE. The predicate is the same
   * one, so this is how many proposals are waiting on a ruling
   * rather than how many have ever been made for the feed. A source
   * carrying fifty applied proposals and nothing pending answers
   * `0`, which is the honest number for a backlog: what is closed
   * is not waiting on anybody.
   *
   * @param sourceId - The {@link SourceRecord.id} to count within.
   * @returns How many pending rows `source_config_proposals` holds
   *   for it. An id no source carries answers `0`, which is correct
   *   rather than a special case: nothing points at a row that is
   *   not there.
   */
  countPendingProposals(sourceId: number): Promise<number>;

  /**
   * Reads one proposal by its own id, whatever source it names.
   *
   * UNSCOPED ON PURPOSE, AND THAT IS WHAT MAKES THE CONTAINMENT
   * RULE DECIDABLE. `POST /sources/:id/approve-config` carries a
   * `proposalId` in its body and a source in its path, and the two
   * may disagree — a mistyped id, a stale queue, or a caller trying
   * one number after another. A read scoped to the source would
   * answer null for both `no such row` and `not this source's row`,
   * which are a `404` for different reasons and only one of which
   * is honest. So this answers the row, and `./proposals-service.ts`
   * holds {@link SourceConfigProposalRecord.sourceId} against the
   * addressed source and refuses `not-on-this-parent` before it
   * looks at anything else — the ordering `src/approvals/ruling.ts`
   * argues, which is what stops a `409` disclosing that a row the
   * caller does not own exists and has already been applied.
   * `EntityStore.findPoolRowById` in `src/entities/store.ts` is the
   * same method over the other gate, for the same reason.
   *
   * ANY STATUS, NOT ONLY A PENDING ONE, which is what separates
   * this from {@link SourceStore.listPendingProposals} beyond the
   * window. The refusal a service owes an already-applied proposal
   * is decidable only from a read that can see one:
   * {@link SourceConfigProposalRecord.appliedAt} is the closing
   * stamp `describeRuling` in `src/approvals/ruling.ts` reads, and
   * a read that filtered the row out would leave `already-ruled`
   * indistinguishable from `no-such-ruling`.
   *
   * @param id - The {@link SourceConfigProposalRecord.id} the body
   *   named.
   * @returns The row, or null when no proposal carries that id. The
   *   row may name any source; whose it is, is the caller's
   *   question and not this method's.
   */
  findProposalById(id: number): Promise<SourceConfigProposalRecord | null>;

  /**
   * Records that a person ruled in favour of one proposal AND
   * writes the two documents onto its source: `approved_at`, then
   * the source's `parser_config` and `contract`, then `applied_at`.
   *
   * THE PORT'S FOURTH WRITER AND THE ONLY ONE THAT TOUCHES TWO
   * TABLES. The other three — {@link SourceStore.insertSource},
   * {@link SourceStore.updateSource} and
   * {@link SourceStore.deleteSource} — each write one `sources`
   * row and nothing else.
   *
   * ONE TRANSACTION, BECAUSE THE APPROVAL AND THE SOURCE WRITE ARE
   * ONE DECISION. They are not two operations a caller sequences;
   * they are the two halves of what an operator did, and neither
   * half is a state anybody meant on its own.
   *
   * An approval recorded with the source unwritten leaves a gate
   * saying a config was agreed while every later pass still reads
   * the feed the old way, with `applied_at` NULL and no writer left
   * to finish the job — the proposal reads exactly like one nobody
   * has got to yet.
   *
   * A source written with `applied_at` unstamped is the worse half.
   * `sources.parser_config` holds whatever it holds and cannot say
   * which proposal put it there, so the only account of why the two
   * columns hold what they hold is gone, and a later apply writes
   * them again as though the first had never happened. The column
   * carries that argument itself:
   * {@link SourceConfigProposalRecord.appliedAt} is the only thing
   * that says THIS row is the one that was written.
   *
   * So a failure anywhere in the middle leaves the source untouched
   * and the proposal unruled, which is the state the request can be
   * made from again.
   *
   * THREE STATEMENTS, AND THEIR ORDER IS PART OF THE CONTRACT
   * RATHER THAN AN IMPLEMENTATION'S TASTE.
   *
   * 1. Stamp `approved_at` as `coalesce(approved_at, now())` and
   *    move `status` to the approved member, returning the row.
   * 2. Derive the two source columns from THAT returned row through
   *    `proposalToSourceUpdate` in `./config-proposer.ts`, and
   *    UPDATE the source it names.
   * 3. Stamp `applied_at` as `coalesce(applied_at, now())`, and
   *    answer the row.
   *
   * Neither swap is available.
   * `source_config_proposals_approval_check` refuses an
   * `applied_at` on a row carrying no `approved_at`, so stamping
   * the two the other way round is refused by the server
   * mid-transaction; and the derivation reads `approved_at`, so it
   * cannot run before the row carries one.
   *
   * THE DERIVATION GOES THROUGH ONE FUNCTION, and that is the point
   * of naming it here. An implementation reading `parserConfig` and
   * `contract` off the row directly would be a second applier, and
   * the refusal standing between an unruled proposal and the two
   * columns every later pass reads would then be restated once per
   * implementation instead of being one function both go through.
   * `proposalToSourceUpdate` also answers the SET clause itself, so
   * nothing an implementation spreads can widen what an approval
   * authorizes.
   *
   * Reaching that function's refusal from HERE would mean the
   * statement above it did not do what it says: the row was
   * approved one statement earlier. It is a fault rather than a
   * refusal of the request, so it is not a `StoreRefusal` and no
   * service catches it — the module header carries that
   * distinction. Driving it with an unapproved row is a claim about
   * `./config-proposer.ts` and is tested there.
   *
   * IDEMPOTENT ON BOTH STAMPS. `coalesce` on each, so a second
   * ruling keeps the first one's instants rather than re-dating an
   * approval already given or an application already made.
   * `approveProposalById` in `scripts/approve.ts` writes
   * `approved_at` the same way, and the two are one gate with two
   * clients — though only one of them applies: that function
   * deliberately leaves `applied_at` alone, so the CLI rules and
   * this method rules and writes.
   *
   * NOTHING IS ASKED OF THE ROW'S STATE, exactly as
   * `EntityStore.approvePoolRow` in `src/entities/store.ts` states
   * for the other gate. Whether an already-applied proposal may be
   * applied again is `RULING_ACTS` in `src/approvals/ruling.ts`,
   * decided one layer up, and the two acts answer differently:
   * ratifying twice is a no-op where applying twice is refused, so
   * `./proposals-service.ts` reads the row through
   * {@link SourceStore.findProposalById} and answers a `409` before
   * this is called.
   *
   * NOTHING VALIDATES THE DOCUMENTS EITHER. A malformed
   * `parser_config` somebody approved anyway is written, because
   * the approval IS the gate and this is not a second one — the
   * argument `./config-proposer.ts` makes where it declines to
   * validate on the way in.
   *
   * THE SOURCE CANNOT HAVE GONE.
   * `source_config_proposals_source_id_sources_id_fk` emits
   * `ON DELETE no action`, so a source a proposal names cannot be
   * deleted while the proposal is there. Statement 2 therefore
   * matches a row by construction, and an implementation finding
   * none has found a database that has stopped holding its own
   * keys rather than a race to handle.
   *
   * @param id - The {@link SourceConfigProposalRecord.id} to rule
   *   on, as {@link SourceStore.findProposalById} already resolved
   *   and the service already held against the addressed source.
   *   This method re-checks neither.
   * @returns The row as it stands after both stamps, or null when
   *   no row carries that id. An id that never existed and one
   *   deleted since it was read are indistinguishable here, and
   *   both say the same thing: there was nothing to rule on. The
   *   four members `describeRuling` reads are on the answer, so a
   *   service can project the ruling without a second read.
   *
   * @remarks
   * No refusal this port declares is reachable from here, and that
   * is worth saying rather than leaving to be inferred from a
   * missing `@throws`. `kind` is not written, so
   * `sources_kind_check` is out of reach; the status written is a
   * member of the tuple its own CHECK is generated from; and the
   * approval check is satisfied by the order above. A `StoreRefusal`
   * out of this method would be a fault in the implementation.
   */
  approveAndApplyProposal(
    id: number,
  ): Promise<SourceConfigProposalRecord | null>;
}
