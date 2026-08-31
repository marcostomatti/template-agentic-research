/**
 * @packageDocumentation
 * The in-memory dataset every research store port is driven through
 * in the isolated suite. All six halves are here — the domains
 * half, the taxonomy half with categories and terms together, the
 * personas beside them, the topics the dispatcher comes for, the
 * sources it reads and the review queue over what they captured, and
 * the operator settings the deployment as a whole is configured by.
 *
 * ONE DATASET RATHER THAN SIX FAKES, which is why this file is not
 * named for any one of the ports it satisfies. `src/domains/store.ts`
 * records that the taxonomy, personas and settings services all
 * resolve a `:slug` through {@link DomainStore.findDomainBySlug}
 * before doing anything of their own, and `src/topics/store.ts` and
 * `src/sources/store.ts` record the same of their own services. The
 * taxonomy, persona, topic and source tables all hang off
 * `domains.id` with `ON DELETE CASCADE`, so a domain deleted through
 * one port has to be gone from the others, and only shared state
 * makes that true: six independent fakes would agree with each other
 * right up until a case deleted something.
 *
 * `operator_settings` IS THE ONE TABLE THAT HANGS OFF NOTHING, and
 * it belongs in the shared dataset for the other direction of that
 * same rule. It carries no `domain_id` and no foreign key, so a
 * domain delete leaves it exactly as it was — including a
 * `defaultDomainSlug` naming the domain that has just gone. That is
 * the behaviour rather than an omission: `src/settings/store.ts`
 * carries why a dangling slug reads as no default being set, and a
 * settings fake standing on its own could not be asked the question
 * at all.
 *
 * IT REFUSES WHAT POSTGRES REFUSES, as the {@link StoreRefusal} the
 * port declares and as nothing else. A fake that merely stores what
 * it is handed is a second contract rather than a second
 * implementation, agreeing with the first until the deployment that
 * does not. `domains_slug_unique` is the whole of the domains half's
 * refusal surface — a slug is written once and is not patchable —
 * so this half has one mechanism to imitate and imitates it by
 * name, with the same `reason` a SQLSTATE 23505 classifies to.
 *
 * THE CATEGORY HALF HAS THREE MECHANISMS AND SIX WAYS TO REACH THEM,
 * AND THE ORDER THEY FIRE IN IS PART OF WHAT IS BEING IMITATED. A
 * fake writing them in the order they read well gets a request
 * carrying two faults at once wrong, which is the shape nothing else
 * would report. Measured against the live Postgres: an insert with a
 * duplicate `(domain_id, key)` BESIDE a parent that is itself a child
 * answers 23514, because `categories_enforce_depth_trigger` is a
 * BEFORE trigger and runs while the row is still being formed, ahead
 * of the unique index; the same insert with a duplicate key beside a
 * parent naming NO row answers 23505, because the foreign key is
 * checked after the index. So the order below is trigger, then key,
 * then foreign key.
 *
 * THE THREE DEPTH REFUSALS NAME NOTHING, and that is the database's
 * doing rather than a simplification here. Every branch of the
 * trigger raises through `RAISE ... USING ERRCODE`, which sets no
 * constraint name, so all three cross the port as a
 * `check-violation` carrying no `constraint` and are
 * indistinguishable from one another. The branches are still written
 * out separately, in the trigger's own order, because a reader
 * checking this file against
 * `drizzle/0002_category_depth_guard.sql` has nothing else to check
 * against — not because anything downstream can tell which fired.
 *
 * TWO REFUSALS SHARE ONE CONSTRAINT NAME, and the port is written
 * around it: `categories_parent_id_categories_id_fk` is what refuses
 * a `parentId` naming no row AND what refuses the delete of a
 * category still holding children. `reason` and `constraint` are
 * identical across the two, so which METHOD raised it is the only
 * discriminator — which is why they are thrown from the writes and
 * from the delete rather than from one shared guard.
 *
 * A DOMAIN DELETE IS NOT REFUSED BY THAT GUARD, which is the trap
 * `NO ACTION` sets for a fake. The rule is checked at the end of the
 * statement, by which point the domain's cascade has removed a
 * parent and its children together — measured, the delete answers
 * and the table is left empty. A fake reusing its own
 * `deleteCategory` inside the cascade would refuse a delete Postgres
 * takes.
 *
 * A CATEGORY'S TERMS GO WITH IT, and a domain's go two levels down.
 * `terms.category_id` is `ON DELETE CASCADE`, so removing a category
 * takes its terms — measured, the delete answers and its rows are
 * gone — and removing a domain takes its categories, which take
 * theirs. None of that is refused: the guard above is about
 * CHILDREN, and a term is not a child.
 *
 * THE TERM HALF HAS ONE KEY AND ONE FOREIGN KEY, AND NO SINGLE CALL
 * CAN REACH BOTH. `terms_category_id_pattern_unique` is
 * `(category_id, pattern)` and `terms_category_id_categories_id_fk`
 * is that same `category_id`, so a write naming a category that does
 * not exist cannot also duplicate a pattern inside it — there is
 * nothing stored there to duplicate. So this half has no measured
 * refusal ORDER of its own the way the category half does: the order
 * below is copied from that half and is unobservable either way,
 * which is stated rather than dressed up as a measurement.
 *
 * THE UPSERT REWRITES THREE COLUMNS AND KEEPS THE STORED ROW'S ID.
 * Measured against the live Postgres: an `ON CONFLICT ... DO UPDATE`
 * on that key answered the STORED id, with `weight`, `polarity` and
 * `notes` rewritten from the submitted row. A term therefore keeps
 * its id across a re-import, which is what lets import, export and
 * re-import settle instead of accumulating a second row that would
 * count the same match twice.
 *
 * AND IT BURNS AN ID FOR EVERY SUBMITTED ROW, INCLUDING THE ROWS IT
 * DOES NOT INSERT. Measured on the same statement: a two-row batch
 * moved the sequence by two while writing one new row and rewriting
 * one stored one, and a two-row batch refused outright by the
 * foreign key moved it by two as well. So the counter here advances
 * once per SUBMITTED row, ahead of every check, and a conflicting
 * row leaves the id it took unused.
 *
 * A REPEAT INSIDE ONE DOCUMENT IS NOT A `StoreRefusal`, and it is
 * the one refusal here deliberately left untranslated. Postgres
 * answers SQLSTATE 21000 when a statement's values carry the same
 * conflict target twice, `classifyPgError` does not recognise it,
 * and `src/taxonomy/store.ts` states the no-repeat rule as a
 * PRECONDITION its caller checks. A plain `Error` is thrown for it
 * rather than nothing at all, because a fake quietly applying the
 * last of the colliding rows would be ACCEPTING what the database
 * refuses — the one thing this file exists to rule out. Measured
 * beside the foreign key: a batch that both repeated a pattern and
 * named a missing category answered 21000 and not 23503, so the
 * repeat is what fires first.
 *
 * THE PERSONA HALF HAS ONE KEY AND ONE FOREIGN KEY, AND NO SINGLE
 * CALL CAN REACH BOTH EITHER. `personas_domain_id_role_unique` is
 * `(domain_id, role)` and `personas_domain_id_domains_id_fk` is that
 * same `domain_id`, so the term half's sentence carries here word
 * for word: a write naming a domain that does not exist can
 * duplicate nothing, because nothing is stored under a domain that
 * is not there. `personas` carries no CHECK and no trigger at all,
 * so this half imitates two mechanisms and no order — measured
 * against the live Postgres, where a duplicate answered 23505 on
 * INSERT and on UPDATE alike and a missing domain answered 23503,
 * each beside a positive control: a second role under the same
 * domain accepted where the duplicate was refused, and the SAME
 * role under another domain accepted, which is what says the key is
 * per-domain rather than global.
 *
 * A PERSONA DELETE CANNOT BE REFUSED, which is the one thing this
 * half has that neither of the others does. Nothing in schema v2
 * points at `personas`, so there is no guard below it and no
 * cascade: `deletePersona` is `deleteTerm`'s shape rather than
 * `deleteCategory`'s, and a persona removed is a whole operation
 * rather than half of one with a reference left behind.
 *
 * AND A DOMAIN TAKES ITS PERSONAS WITH IT. `personas.domain_id` is
 * `ON DELETE CASCADE`, as every foreign key onto `domains.id` is, so
 * the domain delete below drops them where it drops the domain's
 * categories and their terms. None of that is refusable either: the
 * `NO ACTION` a cascade has to be careful of is on
 * `categories.parent_id` and reaches no other table.
 *
 * THE TOPICS HALF HAS ONE KEY AND ONE FOREIGN KEY, AND NO SINGLE
 * CALL CAN REACH BOTH EITHER. `topics_domain_id_name_unique` is
 * `(domain_id, name)` and `topics_domain_id_domains_id_fk` is that
 * same `domain_id`, so the persona half's sentence above carries
 * here word for word: a write naming a domain that does not exist
 * can duplicate nothing, because nothing is stored under a domain
 * that is not there. `topics` carries no CHECK and no trigger — the
 * interval bounds are clamped by a writer and constrain nothing at
 * the database, which `schedulableColumns()` says in as many words
 * — so this half imitates two mechanisms and no order of its own,
 * and the order they are written in below is copied from the half
 * where it WAS measured rather than measured here.
 *
 * THE KEY REFUSES AN UPDATE AS READILY AS AN INSERT, which is the
 * personas half's shape rather than the terms half's. `name` is
 * patchable per `TopicPatch`, so both writes reach it, and what an
 * update checks is the RESULTING name within the STORED domain:
 * `domainId` is not patchable, so no update here reaches the
 * foreign key at all, and a row is not in conflict with itself.
 *
 * A TOPIC IS INSERTED UNSCHEDULED, AND ONE METHOD MOVES IT.
 * `InsertTopicInput` carries no `nextRunAt`, so every insert below
 * lands a null due time whatever it is handed, and
 * `updateTopicSchedule` is the only method here that writes the
 * column — the containment `src/topics/store.ts` states, held by
 * the shape of the types rather than by a check this file could
 * forget. `updateTopic` cannot reach the column either, for the
 * same reason: `TopicPatch` declares no member that could carry a
 * due time.
 *
 * AND A DOMAIN TAKES ITS TOPICS WITH IT. `topics.domain_id` is
 * `ON DELETE CASCADE`, as every foreign key onto `domains.id` is,
 * so the domain delete below drops them where it drops the domain's
 * personas and both levels of its taxonomy. Nothing in schema v2
 * points at `topics`, so — like a persona and unlike a category — a
 * topic delete has neither a guard nor a cascade and cannot be
 * refused at all.
 *
 * THE SOURCES HALF CARRIES NO UNIQUE KEY AT ALL, WHICH IS A SHAPE NO
 * OTHER HALF HERE HAS. Read off the generated SQL rather than off the
 * schema module: the table's whole constraint set is a primary key,
 * one CHECK and one foreign key, with no `UNIQUE` and no index beside
 * them. So there is no duplicate-on-create refusal to imitate and no
 * `409` for an insert to raise — two rows naming one endpoint are
 * ordinary here, where two topics sharing a name are refused. An
 * insert always inserts.
 *
 * ITS TWO WRITE MECHANISMS ARE A CHECK AND A FOREIGN KEY, and the
 * CHECK is the first one any half here has had to imitate.
 * `sources_kind_check` refuses a `kind` outside `SOURCE_KINDS` as a
 * `check-violation`, on an INSERT and on an UPDATE alike, because
 * `kind` is patchable per `SourcePatch`.
 * `sources_domain_id_domains_id_fk` refuses a `domainId` naming no
 * domain as a `foreign-key-violation`, and the insert alone can reach
 * it, since `domainId` is not patchable.
 *
 * THE ORDER BETWEEN THEM IS ARGUED RATHER THAN MEASURED, and saying
 * so is the honest half. A table CHECK is evaluated while the row is
 * still being formed and a foreign key by an AFTER trigger at the end
 * of the statement, which is the same relation the category half
 * MEASURED between its BEFORE trigger and its own foreign key — so
 * the CHECK is written first below on that reasoning and on no
 * reading of this table.
 *
 * THE DELETE IS REFUSED FROM OUTSIDE THE ROW, WHICH IS WHERE THIS
 * HALF DIFFERS MOST FROM THE TOPICS ONE. Nothing points at a topic,
 * so a topic delete cannot be refused; three foreign keys point at
 * `sources.id` and every one of them emits `ON DELETE no action`.
 * `documents_source_id_sources_id_fk` refuses while the feed's
 * captures are in the corpus, and
 * `finding_sightings_source_id_sources_id_fk` refuses while sightings
 * cite it, each as a `foreign-key-violation` naming its own key.
 * Retiring a feed without losing either is `SourcePatch.enabled` set
 * to false, which is what the refusal names as the operation that was
 * wanted.
 *
 * WHICH OF THE TWO A SOURCE HOLDING BOTH ANSWERS IS NOT MEASURED AND
 * IS NOT OBSERVABLE DOWNSTREAM. Both are end-of-statement checks over
 * one statement, and the service reads the COUNTS off
 * {@link SourceStore.countSourceDependents} rather than a constraint
 * name off the refusal, so no caller can tell which fired. The
 * documents key is written first below because the corpus is the
 * larger thing the delete would have taken, and for no reason a case
 * could check.
 *
 * THE THIRD REFUSING KEY IS NOT IMITATED, and the reason is that the
 * state is unreachable rather than that it was overlooked.
 * `source_config_proposals_source_id_sources_id_fk` refuses a source
 * that a config proposal still names — measured in
 * `drizzle/0005_freezing_hairball.sql` — but no port here writes a
 * proposal and no seam below plants one, so there is no dataset this
 * store can be in where that key would fire. A fake refusing a state
 * it cannot reach would be inventing a rule rather than imitating
 * one. `src/sources/store.ts` declares the throw, and the live seam
 * is where it is discharged.
 *
 * TWO SEAMS PLANT WHAT NO PORT CAN WRITE, and their shapes differ
 * because what the port can ASK about each differs.
 * {@link MemoryResearchStore.setSourceDocuments} plants ROWS, because
 * three methods read documents as rows — the parse-status aggregate,
 * the failures page and its count — and a planted number could answer
 * none of them. {@link MemoryResearchStore.setSourceSightings} plants
 * a COUNT, because `countSourceDependents` is the only thing on this
 * port that can ask about a sighting at all and a row would carry
 * members nothing here reads.
 *
 * THE PARSE-STATUS AGGREGATE IS COUNTED FROM THOSE ROWS, never
 * planted beside them, which is what keeps the delete guard and the
 * list route reading one dataset — and is where this half departs
 * from {@link MemoryResearchStore.setDomainDependents}, whose planted
 * number IS authoritative. Every member of `DOCUMENT_PARSE_STATUSES`
 * is present and every zero is a counted zero: the record is
 * initialised from the tuple and then filled, so a source that has
 * captured nothing answers zero under each member rather than an
 * empty record. That is the trap `ParseStatusCounts` names — a status
 * with no rows contributes no group to a grouped read, and letting
 * the absence through would make `0` and never-counted one value.
 *
 * THE FAILURES QUEUE READS THOSE SAME ROWS AND WRITES NONE. `failed`
 * is the whole of the filter and there is no status parameter, so the
 * queue cannot be asked for the corpus. The order is `capturedAt`
 * descending with `id` descending breaking a tie, because a batch
 * capture gives many rows one timestamp and a tie spanning a page
 * boundary would let two pages disagree about which row they hold.
 * Bodies come back AS STORED — unmasked and uncut — since
 * `src/sources/failures-service.ts` is what masks and cuts them.
 *
 * AND A DOMAIN TAKES ITS SOURCES WITH IT, ALONG WITH EVERYTHING
 * PLANTED UNDER THEM. `sources.domain_id` is `ON DELETE CASCADE`, and
 * so are the domain columns on `documents` and on `finding_sightings`
 * — the second through `findings`, which carries its own cascade — so
 * one statement removes the sources and the rows that were refusing
 * their deletes together, and the end-of-statement check finds
 * nothing left citing a source that is gone. That is why the cascade
 * below drops both plants rather than running into its own guard, the
 * same care `deleteCategory` is not reused inside it for. Deleting a
 * domain is therefore permitted where deleting one of its sources is
 * refused, and the difference is what each act means.
 *
 * THE SETTINGS HALF REFUSES NOTHING, AND THAT IS A MEASUREMENT
 * RATHER THAN A SIMPLIFICATION. `operator_settings` carries two
 * mechanisms and neither is reachable through the port: a second
 * insert at the singleton id is 23505 naming
 * `operator_settings_pkey` and any id but 1 is 23514 naming
 * `operator_settings_singleton_check`, both seen firing against the
 * live Postgres beside the control that makes them discriminating
 * — the upsert run twice in the same transaction left ONE row
 * carrying the second payload. But `SettingsStore` takes no id and
 * writes the one it chose itself, so a caller can reach neither.
 * This half has nothing to imitate, which is why it is the one half
 * below that throws no {@link StoreRefusal} at all.
 *
 * SO A FIRST WRITE AND A REWRITE ARE ONE CALL, and holding one
 * payload is how this half satisfies it. The drizzle implementation
 * gets there by upserting on the singleton id; there is no row to
 * count here and no second one to hold, which is the singleton
 * being unexpressible rather than enforced — exactly what
 * `src/settings/store.ts` says of the port's own shape.
 *
 * AND NULL IS NOT `{}` HERE, though `src/settings/service.ts`
 * answers `{}` for both. A read before any write is null and a read
 * after a write of `{}` is `{}`, because whether a row exists is a
 * fact while treating the two as one state is a decision, and the
 * port leaves that decision to its caller. A store collapsing them
 * would leave nothing able to tell a never-configured deployment
 * from a configured-to-nothing one.
 *
 * THERE IS NO SETTINGS COUNTER, which is where this half departs
 * from the three above rather than copying them.
 * `operator_settings.id` is `integer` with no default — measured
 * off `information_schema.columns` — so nothing hands out a value
 * and a refused write could not leave a gap even if one were
 * reachable. The id-burn fidelity the other four halves owe has no
 * subject here.
 *
 * EVERY `Date` CROSSING THE BOUNDARY IS COPIED, in both directions.
 * `Date` is mutable, so a store holding the caller's instance, or
 * handing its own back, lets a caller write into stored state
 * through a field the port declares `readonly` — a corruption the
 * drizzle implementation cannot have, since every row it answers is
 * built fresh out of the driver. The clock reading is copied too:
 * `() => FIXED` is the obvious way to write a fixed clock, and
 * without the copy every row it stamped would share that one `Date`.
 * `topics.next_run_at` is the first date here that is NOT a stamp:
 * it arrives as an ARGUMENT to `updateTopicSchedule` rather than off
 * the clock, and is null on a topic nobody has scheduled, so it is
 * copied in both directions and a null stays a null. A store holding
 * the caller's instance would let the call that scheduled a topic go
 * on moving the due time afterwards.
 *
 * `sources` CARRIES TWO NULLABLE STAMPS RATHER THAN ONE, and a
 * planted document carries a third that is never null.
 * `last_success_at` and `last_failure_at` are the pipeline's own
 * account of how a feed has been going, and `captured_at` is when a
 * document arrived; all three are copied on the way out and the
 * document's is copied on the way in as well, where the seam that
 * plants it could otherwise keep the instance. None of the three is
 * ever read off the clock — no method on the sources port stamps
 * anything — so this is the same argument the due time makes rather
 * than the one the domain stamps make.
 *
 * SO IS EVERY `settings` PAYLOAD, for the same reason and by the
 * route a `jsonb` column takes. Drizzle serialises the payload on
 * the way in and parses a fresh object on the way out, so no caller
 * of the drizzle store can hold a reference into a stored row. The
 * JSON round trip here is that same disconnection, and it is what
 * makes {@link DomainPatch}'s whole-unit rule assertable at all: a
 * merge and an aliased payload are indistinguishable once a caller
 * can write through the object it sent. `OperatorSettings` crosses
 * the same kind of column and is copied by a helper of its own, for
 * the reason `copyCategory`, `copyTerm` and `copyPersona` are three
 * functions rather than one: what a copy promises is a fact about
 * the shape it copies. `topics.search_terms` is a `jsonb` column
 * too and is copied one level shallower: a list of strings has
 * nothing below it, so a fresh array is the whole of it where a
 * `DomainSettings` payload needs a round trip.
 *
 * `sources.parser_config` AND `sources.contract` TAKE THE ROUND TRIP,
 * in both directions and with no shallower option available. Neither
 * column carries a `$type`, so what a parser config holds is the
 * adapter's business and differs by `kind` — there is no declared
 * depth this store could copy to instead, which is the opposite of
 * the topics list and the same as the two settings payloads.
 *
 * IDS COME FROM 1 AND ARE NOT GAPLESS, which is the half a reader
 * would not predict. Measured against the live Postgres on a
 * `bigserial` carrying a UNIQUE key: inserting `a`, having a second
 * `a` refused, then inserting `b` leaves `b` holding id 3. The
 * sequence is read while the row is formed and the unique index
 * refuses the row afterwards, and a sequence does not roll back. So
 * the counter below advances BEFORE the key is checked, and a case
 * that would come to depend on a gapless id fails here rather than
 * only against a database. `categories` carries a sequence of its
 * own and burns ids the same way, the DEPTH trigger included:
 * measured on that table, two refused inserts between two accepted
 * ones left a gap of two, so its counter advances ahead of every
 * check rather than ahead of the key check alone. `terms` carries a
 * third sequence and burns it the same way — measured there too, a
 * duplicate pattern between two accepted inserts left a gap of one
 * — with the `ON CONFLICT` rewrite above as the case a reader would
 * not predict. `personas` carries a fourth, and the measurement
 * there is the widest of them: two refused inserts between two
 * accepted ones left a gap of two with the FOREIGN KEY refusal
 * included, so its counter advances ahead of every check rather
 * than ahead of the key check alone. `topics` carries a fifth
 * counter and burns it the same way, on that reasoning and on no
 * measurement of its own: the two tables carry the same pair of
 * mechanisms over the same column, so the gap of two measured on
 * `personas` is what this one is expected to reproduce. `sources`
 * carries a SIXTH counter and is the one table here a DUPLICATE
 * cannot burn: with no unique key there is nothing to conflict on, so
 * only the kind CHECK and the domain foreign key can refuse an insert
 * and leave the id it took unused.
 */
import type { DomainSettings } from '../../src/db/schema/domains.js';
import type { OperatorSettings } from '../../src/db/schema/settings.js';
import type { DocumentParseStatus } from '../../src/db/schema/values.js';
import type {
  DomainDependentCounts,
  DomainPatch,
  DomainRecord,
  DomainStore,
  InsertDomainInput,
} from '../../src/domains/store.js';
import type { StoreWindow } from '../../src/http/schemas.js';
import type {
  InsertPersonaInput,
  PersonaPatch,
  PersonaRecord,
  PersonaStore,
} from '../../src/personas/store.js';
import type { SettingsStore } from '../../src/settings/store.js';
import type {
  InsertSourceInput,
  ParseStatusCounts,
  SourceDependentCounts,
  SourceFailureRecord,
  SourcePatch,
  SourceRecord,
  SourceStore,
  SourceWithParseStats,
} from '../../src/sources/store.js';
import type {
  CategoryPatch,
  CategoryRecord,
  CategoryWithTermCount,
  InsertCategoryInput,
  InsertTermInput,
  TaxonomyStore,
  TermPatch,
  TermRecord,
  TermValues,
} from '../../src/taxonomy/store.js';
import type {
  InsertTopicInput,
  TopicPatch,
  TopicRecord,
  TopicStore,
} from '../../src/topics/store.js';

import {
  DOCUMENT_PARSE_STATUSES,
  SOURCE_KINDS,
} from '../../src/db/schema/values.js';
import { StoreRefusal } from '../../src/db/store-errors.js';

/**
 * One planted `documents` row, as the sources half reads it.
 *
 * {@link SourceFailureRecord} plus the one column that record leaves
 * out, and it is left out for a reason this shape has to supply:
 * every row the failures queue answers is `failed` by construction,
 * so the port's record carries no `parseStatus` at all. A plant has
 * to carry it, because the parse-status aggregate counts across BOTH
 * members of `DOCUMENT_PARSE_STATUSES` and a queue that could only be
 * given failures could never answer a counted `ok`.
 *
 * `sourceId` and `domainId` are absent for the same reason
 * `SourceFailureRecord` omits the first: the source is the argument
 * {@link MemoryResearchStore.setSourceDocuments} is planting under,
 * and the domain is its source's. `raw`, `features` and `embedding`
 * are absent because nothing on this port reads them — the projection
 * the queue answers is a decision about what a review surface is FOR,
 * and a fixture carrying a stored payload and two derived vectors
 * would be imitating a column no case can see.
 */
export interface MemorySourceDocument {
  /** `documents.id`, and the tiebreak on the queue's order. */
  readonly id: number;

  /** Where the document can be read at its source, or null. */
  readonly url: string | null;

  /** The document's text as captured, verbatim and possibly empty. */
  readonly body: string;

  /**
   * What went wrong, or null when nothing was recorded — including
   * on a row that is `failed`, which is storable and is the shape
   * that costs an operator the most.
   */
  readonly parseError: string | null;

  /** When the pipeline captured it. Copied on the way in. */
  readonly capturedAt: Date;

  /**
   * Which side of `documents_parse_status_check` the row sits on.
   * The one member {@link SourceFailureRecord} does not carry, and
   * what the aggregate groups by.
   */
  readonly parseStatus: DocumentParseStatus;
}

/**
 * All six research ports over one dataset, plus the three seams a
 * case needs that no port declares.
 *
 * EVERY ONE OF THEM WHOLE rather than a `Pick` of it. The category
 * half stood behind a narrowed alias while the term methods were
 * unwritten, which was the honest statement of what existed rather
 * than a gap papered over with stubs; all twelve taxonomy methods,
 * all six persona ones, all seven topic ones, all nine source ones
 * and both settings ones are here now, so a caller wanting any of
 * the six ports entire can be handed this store.
 *
 * `TopicStore` was the first member from outside wave 1 and
 * `SourceStore` is the second, and both join this file rather than
 * standing on their own for the reason the paragraph above gives:
 * `topics.domain_id` and `sources.domain_id` both cascade, so a
 * domain deleted through `DomainStore` has to take its topics and
 * its sources with it, and only shared state makes that true.
 *
 * Nothing in `src/` is handed a {@link MemoryResearchStore} — a
 * service takes the port — so the seams below cannot become a way for
 * the code under test to route around them.
 */
export interface MemoryResearchStore extends
  DomainStore,
  TaxonomyStore,
  PersonaStore,
  SettingsStore,
  TopicStore,
  SourceStore {
  /**
   * Plants what a domain has ACCUMULATED, for the delete guard to
   * read back through {@link DomainStore.countDomainDependents}.
   *
   * NOTHING HERE WRITES `findings`. No port declares an insert for
   * it, and the pipeline that fills it arrives in a later phase — so
   * the state the delete guard exists for is unreachable through the
   * ports themselves, and without this seam every count answers zero
   * and the guard is exercisable only against a real database. That
   * would put the one rule the spec argues hardest for in the half of
   * the suite that needs a container up.
   *
   * `topics` AND `sources` ARE NOW BOTH WRITABLE AND BOTH COUNTS ARE
   * STILL PLANTED, which is the one place this file knowingly answers
   * something a deployment would not. `TopicStore.insertTopic` and
   * {@link SourceStore.insertSource} below store real rows, and
   * `src/domains/db-store.ts` counts them, so a live domain holding
   * either is refused a delete it is offered here. Reconciling the
   * two is not a matter of counting instead:
   * `src/domains/service.test.ts` and `src/domains/routes.test.ts`
   * plant counts for tables no port can write, and a rule mixing a
   * planted number with a counted one would answer neither. So the
   * plant stays authoritative for all three members, a case wanting
   * the guard to see a topic or a source plants it whether or not it
   * also inserted one, and `tests/live/api-wave2.live.test.ts` is
   * where the counted answer is discharged.
   *
   * IT IS THE OPPOSITE DECISION FROM THE SOURCES SEAMS BELOW, and the
   * two are worth reading together. This one plants a NUMBER the
   * guard reads back, so a stored row cannot move it;
   * {@link MemoryResearchStore.setSourceDocuments} plants ROWS and
   * every number over them — the parse-status aggregate, the failures
   * count, the `documents` member of
   * {@link SourceStore.countSourceDependents} — is COUNTED. The
   * difference is which port owns the guard: this one answers about a
   * domain across three tables no port fully covers, and that one
   * answers about a source across rows the same seam supplies whole.
   *
   * @param domainId - The domain the rows hang off. Need not name a
   *   stored domain: the counts are plantable ahead of the row, and
   *   `countDomainDependents` answers about an id rather than about
   *   a domain.
   * @param counts - What to record, WHOLE. An absent member is zero
   *   rather than left standing, and a second call replaces the
   *   first rather than merging into it — the same whole-unit rule
   *   {@link DomainPatch} states for `settings`, for the same
   *   reason: a merge makes clearing a member unexpressible.
   */
  setDomainDependents(
    domainId: number,
    counts: Partial<DomainDependentCounts>,
  ): void;

  /**
   * Plants the `documents` rows captured through one source, for the
   * three reads over that table to answer from.
   *
   * NO PORT WRITES A `documents` ROW, and `src/sources/store.ts`
   * states the absence IS the read-only rule rather than an omission:
   * a handler cannot mutate `parse_status` because there is nothing
   * on the port to call. That leaves the parse-status aggregate, the
   * failures page and its count with no reachable state to read, so
   * this seam supplies it — and it supplies ROWS rather than numbers,
   * because two of those three answer rows.
   *
   * THE COUNTS ARE THEN COUNTED FROM WHAT WAS PLANTED, which is what
   * keeps one dataset behind the aggregate, the queue and the
   * `documents` member of {@link SourceStore.countSourceDependents}.
   * A case planting one `failed` row therefore refuses that source's
   * delete, answers `parseStats.failed` of 1, and answers a queue of
   * one, without saying any of the three.
   *
   * @param sourceId - The source the rows were captured through. Need
   *   not name a stored source: the rows are plantable ahead of it,
   *   and every read below answers about an id rather than about a
   *   source.
   * @param documents - What to record, WHOLE. A second call replaces
   *   the first rather than appending to it — the same whole-unit
   *   rule {@link MemoryResearchStore.setDomainDependents} and
   *   {@link DomainPatch} state, for the same reason: under an append
   *   there is no way to express a source going back to none. Each
   *   row's `capturedAt` is copied on the way in, so a caller that
   *   goes on moving the `Date` it planted does not move a stored
   *   one.
   */
  setSourceDocuments(
    sourceId: number,
    documents: readonly MemorySourceDocument[],
  ): void;

  /**
   * Plants how many `finding_sightings` rows cite one source, for the
   * delete guard to read back.
   *
   * A COUNT RATHER THAN ROWS, and that is not an inconsistency with
   * the seam above but a reading of what the port can ask.
   * {@link SourceStore.countSourceDependents} is the only method here
   * that can be asked about a sighting at all — nothing lists one,
   * nothing reads one by id — so a planted row would carry a
   * `finding_id`, a `url` and an `observed_at` that no case could
   * ever read back, and would imitate a shape rather than a rule.
   *
   * @param sourceId - The source the sightings cite. Need not name a
   *   stored source, for the reason the seam above gives.
   * @param count - How many. A second call replaces the first, and
   *   zero is how a case takes a plant back.
   */
  setSourceSightings(sourceId: number, count: number): void;
}

/** What {@link createMemoryResearchStore} may be handed. */
export interface MemoryResearchStoreOptions {
  /**
   * The clock every stamped timestamp is read from.
   *
   * Defaults to the wall clock, which is right for any case that
   * asserts a timestamp by kind — that a patch moved `updated_at`
   * and left `created_at` — rather than by instant. A case about an
   * instant hands in a clock it controls, and gets there without
   * waiting for one to arrive.
   */
  readonly now?: () => Date;
}

/**
 * The natural key on `categories`, spelled as
 * `src/db/schema/taxonomy.ts` spells it.
 */
const CATEGORY_KEY_UNIQUE = 'categories_domain_id_key_unique';

/**
 * The self-referencing foreign key on `categories.parent_id`, and the
 * one name TWO different refusals arrive under: a parent that names
 * no row, and a delete of a category that still holds children.
 */
const CATEGORY_PARENT_FK = 'categories_parent_id_categories_id_fk';

/**
 * The natural key on `terms`, spelled as `src/db/schema/taxonomy.ts`
 * spells it. The one key both term writes and the upsert's conflict
 * target all name.
 */
const TERM_KEY_UNIQUE = 'terms_category_id_pattern_unique';

/**
 * The foreign key from `terms.category_id`.
 *
 * Unlike {@link CATEGORY_PARENT_FK} this name stands for ONE rule,
 * so a service reading it needs no help from which method raised it:
 * `terms.category_id` cascades on delete, so there is no
 * children-hold-the-delete refusal to share the name with.
 */
const TERM_CATEGORY_FK = 'terms_category_id_categories_id_fk';

/**
 * The natural key on `personas`, spelled as
 * `src/db/schema/domains.ts` spells it. The one key both persona
 * writes name, and the only mechanism an update here can reach.
 */
const PERSONA_KEY_UNIQUE = 'personas_domain_id_role_unique';

/**
 * The foreign key from `personas.domain_id`.
 *
 * Like {@link TERM_CATEGORY_FK} and unlike {@link CATEGORY_PARENT_FK}
 * this name stands for ONE rule: the column cascades on delete, so
 * there is no rows-hold-the-delete refusal to share the name with.
 */
const PERSONA_DOMAIN_FK = 'personas_domain_id_domains_id_fk';

/**
 * The natural key on `topics`, spelled as
 * `src/db/schema/scheduling.ts` spells it. The one key both topic
 * writes name: `name` is patchable, so an UPDATE reaches it as
 * readily as an INSERT.
 */
const TOPIC_KEY_UNIQUE = 'topics_domain_id_name_unique';

/**
 * The foreign key from `topics.domain_id`.
 *
 * Like {@link PERSONA_DOMAIN_FK} and unlike {@link CATEGORY_PARENT_FK}
 * this name stands for ONE rule: the column cascades on delete, so
 * there is no rows-hold-the-delete refusal to share the name with.
 */
const TOPIC_DOMAIN_FK = 'topics_domain_id_domains_id_fk';

/**
 * The CHECK on `sources.kind`, spelled as `src/db/schema/sources.ts`
 * spells it. The first CHECK any half here imitates, and the one
 * mechanism both source writes can reach: `kind` is patchable, so an
 * UPDATE meets it as readily as an INSERT.
 */
const SOURCE_KIND_CHECK = 'sources_kind_check';

/**
 * The foreign key from `sources.domain_id`.
 *
 * Like {@link TOPIC_DOMAIN_FK} and unlike {@link CATEGORY_PARENT_FK}
 * this name stands for ONE rule: the column cascades on delete, so
 * there is no rows-hold-the-delete refusal to share the name with.
 */
const SOURCE_DOMAIN_FK = 'sources_domain_id_domains_id_fk';

/**
 * The foreign key from `documents.source_id`, and the first of the
 * two names a refused source delete can carry.
 *
 * `ON DELETE no action`, so the corpus a feed produced holds its
 * delete. `src/db/schema/documents.ts` argues it at the column: a
 * source does not own the documents it captured.
 */
const SOURCE_DOCUMENTS_FK = 'documents_source_id_sources_id_fk';

/**
 * The foreign key from `finding_sightings.source_id`, and the second
 * of the two.
 *
 * `ON DELETE no action` for a sharper reason than the first:
 * `src/db/schema/findings.ts` states the sightings table IS the
 * provenance record, so a cascade would drop syndication evidence a
 * feed at a time and every count taken afterwards would be lower with
 * nothing saying why.
 */
const SOURCE_SIGHTINGS_FK = 'finding_sightings_source_id_sources_id_fk';

/** Three zeros: what a domain nothing points at has accumulated. */
const NO_DEPENDENTS: DomainDependentCounts = {
  topics: 0,
  sources: 0,
  findings: 0,
};

/**
 * A `Date` with the same instant and no shared identity.
 *
 * @param instant - The date to copy.
 * @returns A new `Date` reading the same millisecond.
 */
function copyInstant(instant: Date): Date {
  return new Date(instant.getTime());
}

/**
 * A settings payload sharing no object with the one handed in.
 *
 * A JSON round trip rather than a spread, because a spread copies
 * only the top level and `scoringWeights`, `verdictVocabulary` and
 * `fieldContract` are all one level down — a caller would still hold
 * a reference into the stored weights. The round trip is also what a
 * `jsonb` column does to a payload in each direction, which is the
 * behaviour being imitated rather than merely a deep copy.
 *
 * @param settings - The payload to copy.
 * @returns An equal payload sharing nothing with it.
 */
function copySettings(settings: DomainSettings): DomainSettings {
  return JSON.parse(JSON.stringify(settings)) as DomainSettings;
}

/**
 * An operator settings payload sharing no object with the one it was
 * handed.
 *
 * A JSON round trip for the reason {@link copySettings} gives, and a
 * function of its own rather than a widening of that one for the
 * reason {@link copyCategory}, {@link copyTerm} and
 * {@link copyPersona} are three functions with one body: what a copy
 * promises is a fact about the shape it copies, and
 * `notificationChannels` is this payload's one level down rather
 * than the three `DomainSettings` carries.
 *
 * @param settings - The payload to copy.
 * @returns An equal payload sharing nothing with it.
 */
function copyOperatorSettings(
  settings: OperatorSettings,
): OperatorSettings {
  return JSON.parse(JSON.stringify(settings)) as OperatorSettings;
}

/**
 * The refusal every branch of the depth trigger produces.
 *
 * One function rather than three, because the trigger names no
 * constraint: `RAISE ... USING ERRCODE` sets none, so a service sees
 * one `check-violation` whichever branch fired. A fake spelling three
 * distinguishable refusals would be offering a discrimination the
 * database does not, and the first caller to read it would be right
 * about this store and wrong about a deployment.
 *
 * @returns The refusal to throw.
 */
function depthRefusal(): StoreRefusal {
  return new StoreRefusal({ reason: 'check-violation' });
}

/**
 * A category record whose members belong to nobody else.
 *
 * A shallow copy is the whole of it, unlike {@link copyDomain}: every
 * member of `CategoryRecord` is a number, a string or null, so there
 * is nothing one level down for a caller to reach. The copy still has
 * to happen — a caller handed the stored object could rewrite `key`
 * or `parentId` straight through the `readonly` the port declares.
 *
 * @param row - The stored row.
 * @returns A copy safe to hand across the port.
 */
function copyCategory(row: CategoryRecord): CategoryRecord {
  return { ...row };
}

/**
 * A term record whose members belong to nobody else.
 *
 * A shallow copy is the whole of it, for the reason
 * {@link copyCategory} gives: every member of `TermRecord` is a
 * number, a string or null, so there is nothing one level down to
 * reach. The copy still has to happen, or a caller handed the stored
 * object could rewrite `pattern` straight through the `readonly` the
 * port declares.
 *
 * @param row - The stored row.
 * @returns A copy safe to hand across the port.
 */
function copyTerm(row: TermRecord): TermRecord {
  return { ...row };
}

/**
 * A persona record whose members belong to nobody else.
 *
 * A shallow copy is the whole of it, for the reason
 * {@link copyCategory} gives: every member of `PersonaRecord` is a
 * number or a string, so there is nothing one level down to reach.
 * The copy still has to happen, or a caller handed the stored object
 * could rewrite `systemText` straight through the `readonly` the port
 * declares.
 *
 * @param row - The stored row.
 * @returns A copy safe to hand across the port.
 */
function copyPersona(row: PersonaRecord): PersonaRecord {
  return { ...row };
}

/**
 * A topic record whose mutable members belong to nobody else.
 *
 * Neither {@link copyPersona}'s shallow copy nor {@link copyDomain}'s
 * pair of stamps: `TopicRecord` carries a list one level down and a
 * `Date` that is null on a topic nobody has scheduled, so both are
 * rebuilt here. `searchTerms` is `readonly` on the array as well as
 * on the member, and a caller handed the stored one could push a
 * term straight through that promise; `nextRunAt` is the mutable
 * instant every other date in this file is copied for.
 *
 * @param row - The stored row.
 * @returns A copy safe to hand across the port.
 */
function copyTopic(row: TopicRecord): TopicRecord {
  return {
    ...row,
    searchTerms: [...row.searchTerms],
    nextRunAt: row.nextRunAt === null
      ? null
      : copyInstant(row.nextRunAt),
  };
}

/**
 * A stored `jsonb` document sharing no object with the one handed in.
 *
 * A JSON round trip for the reason {@link copySettings} gives, and
 * over `unknown` rather than over a declared shape because
 * `sources.parser_config` and `sources.contract` carry no `$type`:
 * what a parser config holds differs by `kind`, so there is no depth
 * a spread could be written to instead. Every value this store puts
 * through it arrived as a `Readonly<Record<string, unknown>>` from
 * {@link InsertSourceInput} or {@link SourcePatch}, which is what
 * makes the round trip total — a value `JSON.stringify` answers
 * `undefined` for could not have got here.
 *
 * @param document - The document to copy.
 * @returns An equal document sharing nothing with it.
 */
function copyJsonDocument(document: unknown): unknown {
  return JSON.parse(JSON.stringify(document)) as unknown;
}

/**
 * A source record whose mutable members belong to nobody else.
 *
 * Four members rather than {@link copyPersona}'s none: two `jsonb`
 * documents that take the round trip above, and two nullable stamps
 * that are `Date` objects a caller could otherwise write through. The
 * stamps are the pipeline's own account of how the feed has been
 * going, and nothing on this port writes either, so they are copied
 * on the way out alone — there is no way in.
 *
 * @param row - The stored row.
 * @returns A copy safe to hand across the port.
 */
function copySource(row: SourceRecord): SourceRecord {
  return {
    ...row,
    parserConfig: copyJsonDocument(row.parserConfig),
    contract: copyJsonDocument(row.contract),
    lastSuccessAt: row.lastSuccessAt === null
      ? null
      : copyInstant(row.lastSuccessAt),
    lastFailureAt: row.lastFailureAt === null
      ? null
      : copyInstant(row.lastFailureAt),
  };
}

/**
 * A planted document whose `Date` belongs to nobody else.
 *
 * Used on the way IN, where the seam is handed a row a case built,
 * and again on the way out through {@link failureOf}. `capturedAt` is
 * never null, unlike the two stamps above, so there is no branch.
 *
 * @param row - The document to copy.
 * @returns A copy sharing no object with it.
 */
function copyPlantedDocument(
  row: MemorySourceDocument,
): MemorySourceDocument {
  return { ...row, capturedAt: copyInstant(row.capturedAt) };
}

/**
 * The failures-queue projection of one planted document.
 *
 * COLUMN-SCOPED, and the scoping is the point rather than a saving:
 * {@link SourceFailureRecord} carries no `parseStatus`, because every
 * row the queue answers is `failed` by construction and a member
 * whose value is a constant would be a column pretending to be a
 * reading.
 *
 * @param row - The stored document.
 * @returns The five members the queue answers, its `capturedAt`
 *   copied.
 */
function failureOf(row: MemorySourceDocument): SourceFailureRecord {
  return {
    id: row.id,
    url: row.url,
    body: row.body,
    parseError: row.parseError,
    capturedAt: copyInstant(row.capturedAt),
  };
}

/**
 * A domain record whose mutable members belong to nobody else.
 *
 * @param row - The stored row.
 * @returns A copy safe to hand across the port.
 */
function copyDomain(row: DomainRecord): DomainRecord {
  return {
    ...row,
    settings: copySettings(row.settings),
    createdAt: copyInstant(row.createdAt),
    updatedAt: copyInstant(row.updatedAt),
  };
}

/**
 * Builds a store over one dataset, holding no rows.
 *
 * @param options - Where the clock comes from; see
 *   {@link MemoryResearchStoreOptions}.
 * @returns A store whose ids start at 1, as the `bigserial` columns
 *   do. Each call builds a dataset of its own, so constructing one
 *   IS the reset a case needs and there is nothing to tear down.
 */
export function createMemoryResearchStore(
  options: MemoryResearchStoreOptions = {},
): MemoryResearchStore {
  const readClock = options.now ?? (() => new Date());
  const domains = new Map<number, DomainRecord>();
  const dependents = new Map<number, DomainDependentCounts>();
  const categories = new Map<number, CategoryRecord>();
  const terms = new Map<number, TermRecord>();
  const personas = new Map<number, PersonaRecord>();
  const topics = new Map<number, TopicRecord>();
  const sources = new Map<number, SourceRecord>();

  // The two planting seams' state, keyed by source id. Neither is a
  // table this store's ports can write, and the header carries why
  // one holds rows and the other a number.
  const sourceDocuments = new Map<number, MemorySourceDocument[]>();
  const sourceSightings = new Map<number, number>();
  let nextDomainId = 1;
  let nextCategoryId = 1;
  let nextTermId = 1;
  let nextPersonaId = 1;
  let nextTopicId = 1;
  let nextSourceId = 1;

  // The whole of the settings half's state. Not a Map, because
  // there is no key: `src/settings/store.ts` states a second
  // configuration is something that port cannot express, and this
  // is what that looks like where the rows are held.
  let storedSettings: OperatorSettings | null = null;

  /**
   * Reads the clock and copies what it answered.
   *
   * @returns The instant to write onto a row.
   */
  function stamp(): Date {
    return copyInstant(readClock());
  }

  /**
   * @param slug - The natural key to look under.
   * @returns The row carrying it, or undefined. At most one row can,
   *   which is what `domains_slug_unique` guarantees and what
   *   {@link DomainStore.insertDomain} below enforces.
   */
  function domainBySlug(slug: string): DomainRecord | undefined {
    return [...domains.values()].find((row) => row.slug === slug);
  }

  /**
   * Every stored domain, ordered as
   * {@link DomainStore.listDomains} promises.
   *
   * The comparison is by code unit rather than locale-aware, and
   * agrees with the live server's `en_US.utf8` collation on the one
   * punctuation a slug may carry: `a-b`, `a-c`, `ab` is the order
   * both produce (measured, both sides).
   *
   * @returns The rows, slug ascending. The order is total because
   *   the key is unique, so there is no tie-break to forget.
   */
  function orderedDomains(): DomainRecord[] {
    return [...domains.values()].sort((left, right) => {
      if (left.slug === right.slug) {
        return 0;
      }

      return left.slug < right.slug
        ? -1
        : 1;
    });
  }

  /**
   * @param domainId - The domain to look within.
   * @param key - The key to look for.
   * @returns The row carrying that pair, or undefined. At most one
   *   can, which is what `categories_domain_id_key_unique` guarantees
   *   and what `insertCategory` below enforces.
   */
  function categoryByKey(
    domainId: number,
    key: string,
  ): CategoryRecord | undefined {
    return [...categories.values()].find(
      (row) => row.domainId === domainId && row.key === key,
    );
  }

  /**
   * @param id - The category to ask about.
   * @returns Whether any stored category names it as its parent. Read
   *   by two rules that share nothing else: the depth trigger's third
   *   branch, and the `NO ACTION` on `categories.parent_id` that
   *   refuses the delete.
   */
  function hasChildren(id: number): boolean {
    return [...categories.values()].some((row) => row.parentId === id);
  }

  /**
   * One domain's categories, ordered as
   * `TaxonomyStore.listCategoriesWithTermCounts` promises.
   *
   * By `key` ascending, compared by code unit — but NOT for the
   * reason {@link orderedDomains} gives, which is the alphabet a
   * slug is held to. A taxonomy key is free text: `categorySeedSchema`
   * in `scripts/seed-schemas.ts` holds it to non-empty and so does
   * `createCategorySchema` in `src/taxonomy/categories-service.ts`,
   * so a key may carry case, spaces and punctuation. What makes the
   * comparison right anyway is measured rather than argued — the live
   * server's `en_US.utf8` ordered a mixed-case, punctuation-heavy set
   * of keys exactly as `<` did (measured, both sides) — and that is a
   * fact about a deployment's collation rather than about this port,
   * so a reader holding this order against a real server should
   * re-measure rather than infer. The order is total because the key
   * is unique within the domain, so there is no tie-break to forget.
   *
   * @param domainId - The domain to read.
   * @returns Its categories, key ascending.
   */
  function orderedCategories(domainId: number): CategoryRecord[] {
    return [...categories.values()]
      .filter((row) => row.domainId === domainId)
      .sort((left, right) => {
        if (left.key === right.key) {
          return 0;
        }

        return left.key < right.key
          ? -1
          : 1;
      });
  }

  /**
   * One category's terms, unordered.
   *
   * A fresh array every call, which is what lets {@link orderedTerms}
   * sort it in place without reaching into stored state.
   *
   * @param categoryId - The category to read.
   * @returns Its terms. Empty for a category holding none AND for an
   *   id no category carries — nothing points at a row that is not
   *   there, which is the answer `countTerms` is read for.
   */
  function termsOf(categoryId: number): TermRecord[] {
    return [...terms.values()].filter((row) => row.categoryId === categoryId);
  }

  /**
   * One category's terms, ordered as `TaxonomyStore.listTerms`
   * promises.
   *
   * By `pattern` ascending, compared by code unit — and the port is
   * explicit that this is NOT the same promise a server makes. A
   * pattern is free text carrying case, spaces and punctuation, and
   * a database orders it under its own collation, so the agreement
   * measured for slugs and taxonomy keys does not carry here on its
   * own reasoning. It was measured anyway: this container's
   * `en_US.utf8` ordered a mixed-case, punctuation-heavy set of
   * patterns exactly as `<` did, both sides. That is a fact about a
   * deployment's locale rather than about this port, which is why
   * the seed serialiser sorts for itself rather than trusting any
   * read order.
   *
   * @param categoryId - The category to read.
   * @returns Its terms, pattern ascending. The order is total
   *   because the pattern is unique within the category, so there is
   *   no tie-break to forget.
   */
  function orderedTerms(categoryId: number): TermRecord[] {
    return termsOf(categoryId).sort((left, right) => {
      if (left.pattern === right.pattern) {
        return 0;
      }

      return left.pattern < right.pattern
        ? -1
        : 1;
    });
  }

  /**
   * @param categoryId - The category to look within.
   * @param pattern - The pattern to look for.
   * @returns The row carrying that pair, or undefined. At most one
   *   can, which is what `terms_category_id_pattern_unique`
   *   guarantees and what the three writes below enforce.
   */
  function termByPattern(
    categoryId: number,
    pattern: string,
  ): TermRecord | undefined {
    return termsOf(categoryId).find((row) => row.pattern === pattern);
  }

  /**
   * Refuses a `categoryId` that names no stored category.
   *
   * @param categoryId - The bucket a term write is asking for.
   * @throws A `foreign-key-violation` {@link StoreRefusal} naming
   *   `terms_category_id_categories_id_fk`. Unlike the category
   *   half's foreign key this one refuses exactly one thing, so a
   *   service can read it off the refusal without knowing which call
   *   it made.
   */
  function guardTermCategory(categoryId: number): void {
    if (!categories.has(categoryId)) {
      throw new StoreRefusal({
        reason: 'foreign-key-violation',
        constraint: TERM_CATEGORY_FK,
      });
    }
  }

  /**
   * Removes every term in one category, as `ON DELETE CASCADE` does.
   *
   * Reached from both deletes rather than from `deleteCategory`
   * alone: a domain delete removes its categories, and the cascade
   * on `terms.category_id` fires for each of them. Unlike the
   * children guard this is not a rule that can refuse anything, so
   * sharing it between the two is safe in the way reusing
   * `deleteCategory` there would not be.
   *
   * @param categoryId - The category being removed.
   */
  function dropTermsOf(categoryId: number): void {
    for (const [termId, row] of terms) {
      if (row.categoryId === categoryId) {
        terms.delete(termId);
      }
    }
  }

  /**
   * Runs the depth trigger over a write, in the trigger's own order.
   *
   * The three branches of `categories_enforce_depth()`, asked as
   * `drizzle/0002_category_depth_guard.sql` asks them: the parent's
   * domain, then the parent's own parent, then this row's children.
   * All three answer the same refusal — see {@link depthRefusal} — so
   * the order is unobservable from outside, and is kept anyway
   * because it is the only thing a reader can check this against.
   *
   * IT RUNS AHEAD OF BOTH KEYS, which is measured rather than chosen.
   * `BEFORE INSERT OR UPDATE` fires while the row is still being
   * formed, so an insert carrying a duplicate `(domain_id, key)`
   * beside a parent that is itself a child answers 23514 and not
   * 23505 against the live server.
   *
   * A null parent returns immediately, exactly as the trigger's first
   * branch does — so promoting a row to a root is legal however many
   * children it holds.
   *
   * @param writtenId - The id of the row being written: the fresh
   *   counter value on an insert, the stored id on a patch. Only the
   *   third branch reads it, and it finds nothing on an insert
   *   because no row can point at an id the counter has just handed
   *   out.
   * @param domainId - The domain the written row belongs to.
   * @param parentId - The parent it is asking for, after the patch.
   * @throws A `check-violation` {@link StoreRefusal} for any of the
   *   three branches. A parent naming NO row is not refused here: the
   *   trigger's lookup finds nothing, both of its parent rules are
   *   guarded on that, and the write falls through to the foreign
   *   key.
   */
  function guardDepth(
    writtenId: number,
    domainId: number,
    parentId: number | null,
  ): void {
    if (parentId === null) {
      return;
    }

    const parent = categories.get(parentId);

    // Asked first because the trigger asks it first: a parent in
    // another domain is out of scope rather than too deep, and
    // reporting where it sits in its own taxonomy would send a reader
    // to the wrong domain.
    if (parent !== undefined && parent.domainId !== domainId) {
      throw depthRefusal();
    }

    if (parent !== undefined && parent.parentId !== null) {
      throw depthRefusal();
    }

    // The same cap from the other end. Left unguarded on which call
    // made it, as the trigger leaves it unguarded on TG_OP: an
    // insert's id is fresh from the counter, so nothing can name it
    // yet and the branch refuses nothing.
    if (hasChildren(writtenId)) {
      throw depthRefusal();
    }
  }

  /**
   * Refuses a parent that names no stored category.
   *
   * Split from {@link guardDepth} rather than folded into it because
   * the two fire at different points, measured: an insert carrying a
   * duplicate key beside a parent naming no row answers 23505, so the
   * unique index is checked between them.
   *
   * @param parentId - The parent being asked for, or null.
   * @throws A `foreign-key-violation` {@link StoreRefusal} naming
   *   `categories_parent_id_categories_id_fk` — the SAME name a
   *   delete refused for holding children carries, which is why the
   *   two are raised from different methods rather than told apart by
   *   anything on the refusal itself.
   */
  function guardParentExists(parentId: number | null): void {
    if (parentId !== null && !categories.has(parentId)) {
      throw new StoreRefusal({
        reason: 'foreign-key-violation',
        constraint: CATEGORY_PARENT_FK,
      });
    }
  }

  /**
   * One domain's personas, unordered.
   *
   * A fresh array every call, which is what lets
   * {@link orderedPersonas} sort it in place without reaching into
   * stored state.
   *
   * @param domainId - The domain to read.
   * @returns Its personas. Empty for a domain holding none AND for
   *   an id no domain carries — nothing points at a row that is not
   *   there, which is the answer `countPersonas` is read for.
   */
  function personasOf(domainId: number): PersonaRecord[] {
    return [...personas.values()].filter((row) => row.domainId === domainId);
  }

  /**
   * One domain's personas, ordered as
   * `PersonaStore.listPersonas` promises.
   *
   * By `role` ascending, compared by code unit, and the caveat
   * {@link orderedTerms} carries applies here word for word: a role
   * is free text holding case, spaces and punctuation, and a
   * database orders it under its own collation, so the agreement
   * measured for slugs does not carry here on its own reasoning. It
   * was measured anyway — this container's `en_US.utf8` ordered a
   * mixed-case, punctuation-bearing set of roles exactly as `<` did,
   * both sides — and that is a fact about a deployment's locale
   * rather than about this port. Nothing on the personas surface
   * serialises rows byte-for-byte, so there is nothing here that has
   * to notice if a deployment's collation differs.
   *
   * @param domainId - The domain to read.
   * @returns Its personas, role ascending. The order is total
   *   because the role is unique within the domain, so there is no
   *   tie-break to forget.
   */
  function orderedPersonas(domainId: number): PersonaRecord[] {
    return personasOf(domainId).sort((left, right) => {
      if (left.role === right.role) {
        return 0;
      }

      return left.role < right.role
        ? -1
        : 1;
    });
  }

  /**
   * @param domainId - The domain to look within.
   * @param role - The role to look for.
   * @returns The row carrying that pair, or undefined. At most one
   *   can, which is what `personas_domain_id_role_unique` guarantees
   *   and what the two writes below enforce.
   */
  function personaByRole(
    domainId: number,
    role: string,
  ): PersonaRecord | undefined {
    return personasOf(domainId).find((row) => row.role === role);
  }

  /**
   * Refuses a `domainId` that names no stored domain.
   *
   * @param domainId - The domain a persona insert is asking for.
   * @throws A `foreign-key-violation` {@link StoreRefusal} naming
   *   `personas_domain_id_domains_id_fk`. Reached from the insert
   *   alone: `domainId` is not on `PersonaPatch`, so no update
   *   touches this key at all.
   */
  function guardPersonaDomain(domainId: number): void {
    if (!domains.has(domainId)) {
      throw new StoreRefusal({
        reason: 'foreign-key-violation',
        constraint: PERSONA_DOMAIN_FK,
      });
    }
  }

  /**
   * Removes every persona of one domain, as `ON DELETE CASCADE`
   * does.
   *
   * Reached from the domain delete alone, and unable to refuse
   * anything — which is what makes sharing it safe in the way
   * reusing a guarded delete would not be. There is no guarded
   * persona delete to reuse in any case: nothing points at
   * `personas`.
   *
   * @param domainId - The domain being removed.
   */
  function dropPersonasOf(domainId: number): void {
    for (const [personaId, row] of personas) {
      if (row.domainId === domainId) {
        personas.delete(personaId);
      }
    }
  }

  /**
   * One domain's topics, unordered.
   *
   * A fresh array every call, which is what lets
   * {@link orderedTopics} sort it in place without reaching into
   * stored state.
   *
   * @param domainId - The domain to read.
   * @returns Its topics. Empty for a domain holding none AND for an
   *   id no domain carries — nothing points at a row that is not
   *   there, which is the answer `countTopics` is read for.
   */
  function topicsOf(domainId: number): TopicRecord[] {
    return [...topics.values()].filter((row) => row.domainId === domainId);
  }

  /**
   * One domain's topics, ordered as `TopicStore.listTopics`
   * promises.
   *
   * By `name` ascending, compared by code unit, and the caveat
   * {@link orderedTerms} carries applies here word for word: a topic
   * name is free text holding case, spaces, digits and punctuation,
   * and a database orders it under its own collation, so the
   * agreement measured for slugs does not carry here on its own
   * reasoning. It was measured anyway — this container's
   * `en_US.utf8` ordered a mixed-case set of names carrying spaces,
   * hyphens and digits exactly as `<` did, both sides — and that is
   * a fact about a deployment's locale rather than about this port.
   *
   * @param domainId - The domain to read.
   * @returns Its topics, name ascending. The order is total because
   *   the name is unique within the domain, so there is no tie-break
   *   to forget.
   */
  function orderedTopics(domainId: number): TopicRecord[] {
    return topicsOf(domainId).sort((left, right) => {
      if (left.name === right.name) {
        return 0;
      }

      return left.name < right.name
        ? -1
        : 1;
    });
  }

  /**
   * @param domainId - The domain to look within.
   * @param name - The name to look for.
   * @returns The row carrying that pair, or undefined. At most one
   *   can, which is what `topics_domain_id_name_unique` guarantees
   *   and what the two writes below enforce.
   */
  function topicByName(
    domainId: number,
    name: string,
  ): TopicRecord | undefined {
    return topicsOf(domainId).find((row) => row.name === name);
  }

  /**
   * Refuses a `domainId` that names no stored domain.
   *
   * @param domainId - The domain a topic insert is asking for.
   * @throws A `foreign-key-violation` {@link StoreRefusal} naming
   *   `topics_domain_id_domains_id_fk`. Reached from the insert
   *   alone: `domainId` is not on `TopicPatch`, so no update touches
   *   this key at all.
   */
  function guardTopicDomain(domainId: number): void {
    if (!domains.has(domainId)) {
      throw new StoreRefusal({
        reason: 'foreign-key-violation',
        constraint: TOPIC_DOMAIN_FK,
      });
    }
  }

  /**
   * Removes every topic of one domain, as `ON DELETE CASCADE` does.
   *
   * Reached from the domain delete alone, and unable to refuse
   * anything — which is what makes sharing it safe in the way
   * reusing a guarded delete would not be. There is no guarded topic
   * delete to reuse in any case: nothing points at `topics`.
   *
   * @param domainId - The domain being removed.
   */
  function dropTopicsOf(domainId: number): void {
    for (const [topicId, row] of topics) {
      if (row.domainId === domainId) {
        topics.delete(topicId);
      }
    }
  }

  /**
   * One domain's sources, unordered.
   *
   * A fresh array every call, which is what lets
   * {@link orderedSources} sort it in place without reaching into
   * stored state.
   *
   * @param domainId - The domain to read.
   * @returns Its sources. Empty for a domain holding none AND for an
   *   id no domain carries — nothing points at a row that is not
   *   there, which is the answer `countSources` is read for.
   */
  function sourcesOf(domainId: number): SourceRecord[] {
    return [...sources.values()].filter((row) => row.domainId === domainId);
  }

  /**
   * One domain's sources, ordered as
   * `SourceStore.listSourcesWithParseStats` promises.
   *
   * By `id` ascending, and this is the one collection here whose
   * order needs no collation caveat at all: `sources` has no natural
   * key to sort on, so the port orders by the surrogate. That makes
   * the comparison arithmetic rather than lexical, total because the
   * id is unique, and identical on every server whatever its locale
   * — the opposite of every sibling helper above, each of which
   * carries a measured agreement it could in principle lose.
   *
   * @param domainId - The domain to read.
   * @returns Its sources, id ascending: the order the feeds were
   *   configured in.
   */
  function orderedSources(domainId: number): SourceRecord[] {
    return sourcesOf(domainId).sort((left, right) => left.id - right.id);
  }

  /**
   * The documents planted under one source.
   *
   * @param sourceId - The source to read.
   * @returns Its planted rows, or none. A fresh array every call, so
   *   a caller sorting or slicing what this answers cannot reach the
   *   planted list.
   */
  function documentsOf(sourceId: number): MemorySourceDocument[] {
    return [...(sourceDocuments.get(sourceId) ?? [])];
  }

  /**
   * One source's parse-status aggregate, counted from its planted
   * documents.
   *
   * EVERY MEMBER IS PRESENT AND EVERY ZERO IS A COUNTED ZERO, which
   * is why the record is built from `DOCUMENT_PARSE_STATUSES` and
   * then filled rather than accumulated as the rows are walked. A
   * status carrying no rows contributes no group to the `GROUP BY`
   * the drizzle implementation issues, and letting that absence reach
   * a caller would make `0` and never-counted one value —
   * `ParseStatusCounts` names the trap and `DomainDependentCounts`
   * records it over a different read.
   *
   * @param sourceId - The source to count within.
   * @returns The counts, every member of the tuple present.
   */
  function parseStatsOf(sourceId: number): ParseStatusCounts {
    const counts: Record<DocumentParseStatus, number> = Object.fromEntries(
      DOCUMENT_PARSE_STATUSES.map((status) => [status, 0]),
    ) as Record<DocumentParseStatus, number>;

    for (const row of documentsOf(sourceId)) {
      counts[row.parseStatus] += 1;
    }

    return counts;
  }

  /**
   * One source's failed captures, newest first.
   *
   * `capturedAt` descending with `id` descending breaking a tie, as
   * `SourceStore.listSourceFailures` promises. The tiebreak is not
   * optional: a batch capture writes many rows inside one statement
   * and `defaultNow()` gives them one timestamp, so a tie spanning a
   * page boundary would let two pages disagree about which row they
   * hold.
   *
   * @param sourceId - The source to read.
   * @returns Its `failed` documents in that order. A fresh array, so
   *   the sort never reaches the planted list.
   */
  function failuresOf(sourceId: number): MemorySourceDocument[] {
    return documentsOf(sourceId)
      .filter((row) => row.parseStatus === 'failed')
      .sort((left, right) => {
        const byCapture = right.capturedAt.getTime()
          - left.capturedAt.getTime();

        return byCapture === 0
          ? right.id - left.id
          : byCapture;
      });
  }

  /**
   * Refuses a `kind` outside `SOURCE_KINDS`.
   *
   * @param kind - The transport family a source write is asking for.
   * @throws A `check-violation` {@link StoreRefusal} naming
   *   `sources_kind_check`. Reached from BOTH writes, unlike every
   *   foreign-key guard above: `kind` is patchable per
   *   {@link SourcePatch}, so an update meets the CHECK as readily as
   *   an insert does.
   */
  function guardSourceKind(kind: string): void {
    if (!(SOURCE_KINDS as readonly string[]).includes(kind)) {
      throw new StoreRefusal({
        reason: 'check-violation',
        constraint: SOURCE_KIND_CHECK,
      });
    }
  }

  /**
   * Refuses a `domainId` that names no stored domain.
   *
   * @param domainId - The domain a source insert is asking for.
   * @throws A `foreign-key-violation` {@link StoreRefusal} naming
   *   `sources_domain_id_domains_id_fk`. Reached from the insert
   *   alone: `domainId` is not on {@link SourcePatch}, so no update
   *   touches this key at all — a source cannot be moved between
   *   domains, and the corpus it produced is why.
   */
  function guardSourceDomain(domainId: number): void {
    if (!domains.has(domainId)) {
      throw new StoreRefusal({
        reason: 'foreign-key-violation',
        constraint: SOURCE_DOMAIN_FK,
      });
    }
  }

  /**
   * Removes every source of one domain, and everything planted under
   * them, as `ON DELETE CASCADE` does.
   *
   * REACHED FROM THE DOMAIN DELETE ALONE, AND IT DOES NOT REUSE
   * `deleteSource` — the same care {@link dropTermsOf} is separate
   * from `deleteCategory` for, and for a sharper reason here. That
   * method is REFUSED while documents or sightings cite the source,
   * and reusing it would refuse a delete Postgres takes: the domain
   * columns on `documents` and on `finding_sightings` cascade too, so
   * one statement removes the sources and the rows that were holding
   * them, and the end-of-statement check finds nothing left citing a
   * source that is gone.
   *
   * Dropping both plants is that second half. A plant left standing
   * would answer a dependent count for a source that no longer
   * exists, and would leave the queue answering documents for it.
   *
   * @param domainId - The domain being removed.
   */
  function dropSourcesOf(domainId: number): void {
    for (const [sourceId, row] of sources) {
      if (row.domainId === domainId) {
        sourceDocuments.delete(sourceId);
        sourceSightings.delete(sourceId);
        sources.delete(sourceId);
      }
    }
  }

  return {
    /** One window of the list, slug ascending. */
    async listDomains(window: StoreWindow): Promise<readonly DomainRecord[]> {
      return orderedDomains()
        .slice(window.offset, window.offset + window.limit)
        .map(copyDomain);
    },

    /** How many rows the dataset holds, ignoring any window. */
    async countDomains(): Promise<number> {
      return domains.size;
    },

    /** One domain by its natural key, or null. */
    async findDomainBySlug(slug: string): Promise<DomainRecord | null> {
      const row = domainBySlug(slug);

      return row === undefined
        ? null
        : copyDomain(row);
    },

    /**
     * Inserts a domain, stamping both timestamps off the clock.
     *
     * The id is taken from the counter BEFORE the slug is checked,
     * so a refused insert burns it exactly as the sequence behind a
     * `bigserial` does. This module's header carries the
     * measurement.
     *
     * `feature_version` and `embedding_model` are null on a fresh
     * row, which is the column default rather than a decision taken
     * here: neither is on {@link InsertDomainInput}, because they
     * are the feature pipeline's own pins and an operator has no
     * business writing them.
     */
    async insertDomain(input: InsertDomainInput): Promise<DomainRecord> {
      const id = nextDomainId;

      nextDomainId += 1;

      if (domainBySlug(input.slug) !== undefined) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: 'domains_slug_unique',
        });
      }

      // One clock reading, two `Date` objects: a row whose stamps
      // were the same object would let a write to one move the
      // other.
      const written = stamp();
      const row: DomainRecord = {
        id,
        slug: input.slug,
        name: input.name,
        settings: copySettings(input.settings),
        featureVersion: null,
        embeddingModel: null,
        createdAt: written,
        updatedAt: copyInstant(written),
      };

      domains.set(row.id, row);

      return copyDomain(row);
    },

    /**
     * Rewrites the supplied members and stamps `updated_at`.
     *
     * `settings` REPLACES the stored payload rather than merging
     * into it, and an absent `settings` leaves it standing — the two
     * halves of the whole-unit rule {@link DomainPatch} states. The
     * stamp moves on every call, including one carrying no member at
     * all.
     */
    async updateDomain(
      id: number,
      patch: DomainPatch,
    ): Promise<DomainRecord | null> {
      const existing = domains.get(id);

      if (existing === undefined) {
        return null;
      }

      const updated: DomainRecord = {
        ...existing,
        name: patch.name ?? existing.name,
        settings: patch.settings === undefined
          ? existing.settings
          : copySettings(patch.settings),
        updatedAt: stamp(),
      };

      domains.set(id, updated);

      return copyDomain(updated);
    },

    /**
     * What the domain has accumulated, per dependent table.
     *
     * Every member is present, including a zero, because a counted
     * zero and a missing group are different facts to a guard whose
     * whole job is telling them apart. An id no domain carries
     * answers three zeros rather than failing: nothing points at a
     * row that is not there.
     */
    async countDomainDependents(id: number): Promise<DomainDependentCounts> {
      return { ...(dependents.get(id) ?? NO_DEPENDENTS) };
    },

    /**
     * Deletes one domain, and everything hanging off it.
     *
     * The cascade is the database's: every foreign key onto
     * `domains.id` is `ON DELETE CASCADE`, so dropping the planted
     * counts and the domain's categories here is this dataset's half
     * of the same behaviour. The rows the later halves of this file
     * add join it in the same place.
     *
     * IT IS NOT REFUSED BY THE `NO ACTION` ON `categories.parent_id`,
     * and this is deliberately not `deleteCategory` in a loop. That
     * rule is checked at the end of the statement, by which point the
     * cascade has removed a parent and its children together —
     * measured, the delete answers and the table is left empty. A
     * fake reusing its own guard here would refuse a delete Postgres
     * takes, and would do it only for the domains whose taxonomy has
     * more than one level.
     *
     * IT REACHES TWO LEVELS DOWN, because each category it removes
     * cascades onto its own terms. Measured: a domain delete left
     * zero rows in `categories` and zero in `terms`. The term drop
     * IS shared with `deleteCategory` below — {@link dropTermsOf} —
     * which is safe precisely where reusing the guarded category
     * delete is not, since removing terms refuses nothing.
     *
     * IT TAKES THE DOMAIN'S PERSONAS AND ITS TOPICS IN THE SAME
     * PLACE, for the same reason and with nothing to be careful of:
     * `personas.domain_id` and `topics.domain_id` are both `ON
     * DELETE CASCADE` and nothing in schema v2 points at either
     * table, so there is no guard anywhere below this one to run
     * into.
     *
     * ITS SOURCES GO IN THAT SAME PLACE AND THERE IS SOMETHING TO BE
     * CAREFUL OF, which is why {@link dropSourcesOf} exists rather
     * than a loop over `deleteSource`. Three foreign keys onto
     * `sources.id` are `ON DELETE no action`, so that method is
     * refused while a source's documents or sightings are there —
     * and the domain columns on those same tables cascade, so a real
     * delete removes the sources and the rows that were holding them
     * together and refuses nothing. Reusing the guarded delete here
     * would refuse a delete Postgres takes, and would do it only for
     * the domains whose feeds have captured anything.
     *
     * IT DOES NOT MOVE THE PLANTED DEPENDENT COUNTS OF ANY OTHER
     * DOMAIN, and dropping the topics does not move them at all:
     * {@link MemoryResearchStore.setDomainDependents} records what
     * the guard reads and this half of the file writes real rows,
     * which is the divergence that seam's own TSDoc states.
     */
    async deleteDomain(id: number): Promise<boolean> {
      dependents.delete(id);
      dropPersonasOf(id);
      dropTopicsOf(id);
      dropSourcesOf(id);

      for (const [categoryId, row] of categories) {
        if (row.domainId === id) {
          dropTermsOf(categoryId);
          categories.delete(categoryId);
        }
      }

      return domains.delete(id);
    },

    /**
     * Every category in one domain, key ascending, each with its
     * term count.
     *
     * THE COUNT IS COUNTED, over the same `terms` collection the
     * term half below writes to. A category holding none answers a
     * counted zero rather than an absent member, which is the one
     * answer `CategoryWithTermCount` forbids — `JSON.stringify`
     * drops an `undefined` outright, so a bucket that was never
     * counted and a bucket holding nothing would otherwise reach a
     * caller as the same thing.
     */
    async listCategoriesWithTermCounts(
      domainId: number,
    ): Promise<readonly CategoryWithTermCount[]> {
      return orderedCategories(domainId).map(
        (row) => ({ ...copyCategory(row), termCount: termsOf(row.id).length }),
      );
    },

    /** One category by its id, or null. */
    async findCategoryById(id: number): Promise<CategoryRecord | null> {
      const row = categories.get(id);

      return row === undefined
        ? null
        : copyCategory(row);
    },

    /**
     * Inserts a category, checking what the database checks in the
     * order the database checks it.
     *
     * The id comes off the counter first, so every refusal below
     * burns one exactly as the sequence does — measured on
     * `categories` itself, where two refused inserts between two
     * accepted ones left a gap of two, the depth refusal included.
     * Then the trigger, then the natural key, then the foreign key:
     * that order is measured rather than read off the schema, and it
     * is what an insert carrying two faults at once can see.
     */
    async insertCategory(input: InsertCategoryInput): Promise<CategoryRecord> {
      const id = nextCategoryId;

      nextCategoryId += 1;

      guardDepth(id, input.domainId, input.parentId);

      if (categoryByKey(input.domainId, input.key) !== undefined) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: CATEGORY_KEY_UNIQUE,
        });
      }

      guardParentExists(input.parentId);

      const row: CategoryRecord = {
        id,
        domainId: input.domainId,
        key: input.key,
        name: input.name,
        parentId: input.parentId,
      };

      categories.set(row.id, row);

      return copyCategory(row);
    },

    /**
     * Rewrites the supplied members of one category.
     *
     * A PATCH NAMING NO MEMBER WRITES NOTHING and answers the stored
     * row, which the port states rather than leaving to its two
     * implementations: `categories` carries no `updated_at`, so an
     * empty patch has genuinely nothing to set and drizzle throws on
     * an empty update list rather than issuing a harmless statement.
     *
     * Anything else re-runs the depth guard over the EFFECTIVE
     * parent — the patched one where the patch names it, the stored
     * one where it does not — because the trigger fires on every
     * write, a rename included. A stored row is always legal, so a
     * rename cannot be refused by it; running the guard anyway is
     * what keeps that a consequence rather than an assumption.
     *
     * `key` is not patchable, so this method raises no
     * `unique-violation` at all.
     */
    async updateCategory(
      id: number,
      patch: CategoryPatch,
    ): Promise<CategoryRecord | null> {
      const existing = categories.get(id);

      if (existing === undefined) {
        return null;
      }

      if (patch.name === undefined && patch.parentId === undefined) {
        return copyCategory(existing);
      }

      // Absent and null are different requests here, which is why the
      // test is against `undefined` rather than a nullish default:
      // absent leaves the row where it is, and null promotes it to a
      // root.
      const parentId = patch.parentId === undefined
        ? existing.parentId
        : patch.parentId;

      guardDepth(id, existing.domainId, parentId);
      guardParentExists(parentId);

      const updated: CategoryRecord = {
        ...existing,
        name: patch.name ?? existing.name,
        parentId,
      };

      categories.set(id, updated);

      return copyCategory(updated);
    },

    /**
     * Deletes one category, unless something still hangs off it.
     *
     * ITS CHILDREN REFUSE THE DELETE, which is `categories.parent_id`
     * being `NO ACTION` rather than a rule invented here: a category
     * holding children is not removable until they are reparented or
     * removed, and that is what makes losing them an explicit
     * decision. The refusal names
     * `categories_parent_id_categories_id_fk`, the same name a parent
     * naming no row carries, and the two are told apart by which call
     * raised them and by nothing else.
     *
     * ITS TERMS GO WITH IT, which is `terms.category_id` being
     * `ON DELETE CASCADE` and is measured: the delete answers and
     * the category's rows are gone. Holding terms is therefore no
     * reason to refuse — only children are — and the two are checked
     * in that order here because only one of them can refuse
     * anything. Its CRITERIA would go the same way, and there is
     * still nothing to take: no method on this store writes one.
     */
    async deleteCategory(id: number): Promise<boolean> {
      if (hasChildren(id)) {
        throw new StoreRefusal({
          reason: 'foreign-key-violation',
          constraint: CATEGORY_PARENT_FK,
        });
      }

      dropTermsOf(id);

      return categories.delete(id);
    },

    /**
     * One category's terms, pattern ascending, windowed only when a
     * window was given.
     *
     * AN ABSENT WINDOW READS THE WHOLE CATEGORY, which is the
     * export's call rather than a default standing in for one. A
     * `?format=seed` document is about the category as a whole, and
     * serving it by counting first and then asking for a window that
     * size would be two reads whose answers can disagree — a term
     * written in between is simply missing from a document claiming
     * to be the category.
     */
    async listTerms(
      categoryId: number,
      window?: StoreWindow,
    ): Promise<readonly TermRecord[]> {
      const ordered = orderedTerms(categoryId);
      const rows = window === undefined
        ? ordered
        : ordered.slice(window.offset, window.offset + window.limit);

      return rows.map(copyTerm);
    },

    /**
     * How many terms one category holds, ignoring any window.
     *
     * An id no category carries answers zero rather than failing,
     * which is correct rather than a special case.
     */
    async countTerms(categoryId: number): Promise<number> {
      return termsOf(categoryId).length;
    },

    /** One term by its id, or null. */
    async findTermById(id: number): Promise<TermRecord | null> {
      const row = terms.get(id);

      return row === undefined
        ? null
        : copyTerm(row);
    },

    /**
     * Inserts one term, asserting a new row rather than upserting.
     *
     * The id comes off the counter first, so every refusal below
     * burns one exactly as the sequence does — measured on `terms`,
     * where a duplicate pattern between two accepted inserts left a
     * gap of one and a foreign-key refusal moved the sequence by one
     * as well.
     *
     * The key is checked ahead of the foreign key, matching
     * `insertCategory` above. NOTHING CAN OBSERVE THAT ORDER HERE,
     * and saying so is the honest half: both mechanisms are about
     * `category_id`, so a write naming a category that does not
     * exist cannot also duplicate a pattern inside it. The order is
     * copied from the half where it WAS measured rather than
     * measured here.
     */
    async insertTerm(input: InsertTermInput): Promise<TermRecord> {
      const id = nextTermId;

      nextTermId += 1;

      if (termByPattern(input.categoryId, input.pattern) !== undefined) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: TERM_KEY_UNIQUE,
        });
      }

      guardTermCategory(input.categoryId);

      const row: TermRecord = {
        id,
        categoryId: input.categoryId,
        pattern: input.pattern,
        weight: input.weight,
        polarity: input.polarity,
        notes: input.notes,
      };

      terms.set(row.id, row);

      return copyTerm(row);
    },

    /**
     * Writes a whole lexicon into one category, rewriting the terms
     * it already carries.
     *
     * A CONFLICTING ROW KEEPS THE STORED ROW'S ID and rewrites
     * `weight`, `polarity` and `notes` — measured against the live
     * Postgres, where the statement answered the stored id. The
     * conflict target itself is what the row was matched ON, so
     * there is nothing in `categoryId` or `pattern` to rewrite.
     *
     * ONE ID PER SUBMITTED ROW, TAKEN AHEAD OF EVERY CHECK. Measured
     * on the same statement: a two-row batch moved the sequence by
     * two while inserting one row and rewriting one, and a two-row
     * batch refused outright by the foreign key moved it by two as
     * well. So the counter advances by the whole length here and a
     * conflicting row leaves the id it took unused, which is what
     * keeps this fake's ids as gappy as a deployment's.
     *
     * AN EMPTY LIST TOUCHES NOTHING, the foreign key included: no
     * statement runs, so a `categoryId` naming no category is not
     * refused. The port states it, and it is why the early return
     * sits above the counter as well as above the checks.
     *
     * A REPEATED CONFLICT TARGET IS NOT A `StoreRefusal` — see this
     * module's header — and it is checked before the foreign key
     * because that is the order measured: a batch both repeating a
     * pattern and naming a missing category answered 21000 and not
     * 23503. The message names the constraint and the count and no
     * part of the document, so a logger reaching it learns nothing
     * about what was submitted.
     */
    async upsertTerms(
      categoryId: number,
      rows: readonly TermValues[],
    ): Promise<readonly TermRecord[]> {
      if (rows.length === 0) {
        return [];
      }

      const firstId = nextTermId;

      nextTermId += rows.length;

      const patterns = new Set(rows.map((row) => row.pattern));

      if (patterns.size !== rows.length) {
        throw new Error(
          `${rows.length} rows carry ${patterns.size} patterns, `
          + `and ${TERM_KEY_UNIQUE} admits one row per pattern`,
        );
      }

      guardTermCategory(categoryId);

      return rows.map((values, index) => {
        const existing = termByPattern(categoryId, values.pattern);
        const row: TermRecord = {
          id: existing === undefined
            ? firstId + index
            : existing.id,
          categoryId,
          pattern: values.pattern,
          weight: values.weight,
          polarity: values.polarity,
          notes: values.notes,
        };

        terms.set(row.id, row);

        return copyTerm(row);
      });
    },

    /**
     * Rewrites the supplied members of one term.
     *
     * A PATCH NAMING NO MEMBER WRITES NOTHING and answers the stored
     * row, for the reason `updateCategory` above gives: `terms`
     * carries no `updated_at` either, so an empty patch has nothing
     * to set and drizzle throws on an empty update list.
     *
     * BOTH HALVES OF THE NATURAL KEY ARE PATCHABLE, so what is
     * checked is the RESULTING pair rather than either member: a
     * rename, a bucket move and both at once are one rule with one
     * refusal. A row is not in conflict with itself — measured, an
     * update writing a term's own pattern back over it is accepted
     * — so the row found under the resulting pair is a refusal only
     * when it is a different row.
     *
     * A CATEGORY IN ANOTHER DOMAIN IS NOT REFUSED HERE, measured:
     * nothing in the schema relates a term to a domain, so the move
     * is accepted and that rule belongs to
     * `src/taxonomy/terms-service.ts`. A
     * category that does not exist IS refused, by the foreign key.
     */
    async updateTerm(
      id: number,
      patch: TermPatch,
    ): Promise<TermRecord | null> {
      const existing = terms.get(id);

      if (existing === undefined) {
        return null;
      }

      if (
        patch.categoryId === undefined
        && patch.pattern === undefined
        && patch.weight === undefined
        && patch.polarity === undefined
        && patch.notes === undefined
      ) {
        return copyTerm(existing);
      }

      const categoryId = patch.categoryId ?? existing.categoryId;
      const pattern = patch.pattern ?? existing.pattern;
      const holder = termByPattern(categoryId, pattern);

      if (holder !== undefined && holder.id !== id) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: TERM_KEY_UNIQUE,
        });
      }

      guardTermCategory(categoryId);

      const updated: TermRecord = {
        ...existing,
        categoryId,
        pattern,
        weight: patch.weight ?? existing.weight,
        polarity: patch.polarity ?? existing.polarity,
        // Absent and null are different requests, which is why the
        // test is against `undefined` rather than a nullish default:
        // absent leaves the note alone and null clears it.
        notes: patch.notes === undefined
          ? existing.notes
          : patch.notes,
      };

      terms.set(id, updated);

      return copyTerm(updated);
    },

    /**
     * Deletes one term.
     *
     * Nothing hangs off a term, so this is the one delete on the
     * taxonomy surface with neither a guard nor a cascade.
     */
    async deleteTerm(id: number): Promise<boolean> {
      return terms.delete(id);
    },

    /**
     * One window of a domain's personas, role ascending.
     *
     * A domain holding none and an id no domain carries are one
     * answer here — the empty list — because whether the domain
     * exists was settled by `DomainStore.findDomainBySlug` before
     * this was called.
     */
    async listPersonas(
      domainId: number,
      window: StoreWindow,
    ): Promise<readonly PersonaRecord[]> {
      return orderedPersonas(domainId)
        .slice(window.offset, window.offset + window.limit)
        .map(copyPersona);
    },

    /**
     * How many personas one domain holds, ignoring any window.
     *
     * An id no domain carries answers zero rather than failing,
     * which is correct rather than a special case: nothing points at
     * a row that is not there.
     */
    async countPersonas(domainId: number): Promise<number> {
      return personasOf(domainId).length;
    },

    /** One persona by its id, or null. */
    async findPersonaById(id: number): Promise<PersonaRecord | null> {
      const row = personas.get(id);

      return row === undefined
        ? null
        : copyPersona(row);
    },

    /**
     * Inserts one persona, asserting a new row rather than
     * upserting — unlike `scripts/seed.ts`, which writes this same
     * table through an `ON CONFLICT` on this same natural key.
     *
     * The id comes off the counter first, so every refusal below
     * burns one exactly as the sequence does. Measured on `personas`
     * against the live Postgres, and the widest of the three
     * measurements this file rests on: two refused inserts between
     * two accepted ones left a gap of two with the FOREIGN KEY
     * refusal included, so the counter advances ahead of every check
     * rather than ahead of the key check alone.
     *
     * The key is checked ahead of the foreign key, matching
     * `insertCategory` and `insertTerm` above. NOTHING CAN OBSERVE
     * THAT ORDER HERE, and saying so is the honest half: the unique
     * key opens on the very column the foreign key constrains, so a
     * write naming a domain that does not exist can duplicate
     * nothing. The order is copied from the half where it WAS
     * measured rather than measured here.
     */
    async insertPersona(input: InsertPersonaInput): Promise<PersonaRecord> {
      const id = nextPersonaId;

      nextPersonaId += 1;

      if (personaByRole(input.domainId, input.role) !== undefined) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: PERSONA_KEY_UNIQUE,
        });
      }

      guardPersonaDomain(input.domainId);

      const row: PersonaRecord = {
        id,
        domainId: input.domainId,
        role: input.role,
        systemText: input.systemText,
      };

      personas.set(row.id, row);

      return copyPersona(row);
    },

    /**
     * Rewrites the supplied members of one persona.
     *
     * A PATCH NAMING NO MEMBER WRITES NOTHING and answers the stored
     * row, for the reason `updateCategory` and `updateTerm` above
     * give: `personas` carries no `updated_at` either, so an empty
     * patch has nothing to set and drizzle throws on an empty update
     * list.
     *
     * `role` IS PATCHABLE AND `domainId` IS NOT, so what is checked
     * is the resulting role within the STORED domain — measured
     * against the live Postgres, where a duplicate answers 23505 on
     * an UPDATE exactly as it does on an INSERT — and no update
     * reaches the foreign key at all. A row is not in conflict with
     * itself, so the row found under the resulting pair is a refusal
     * only when it is a different row.
     *
     * AN EMPTY `systemText` IS A VALUE BEING WRITTEN rather than a
     * member being left alone, which is why the tests below are
     * against `undefined`: `PersonaRecord.systemText` states that a
     * role with nothing to say says so, and a store defaulting the
     * empty string to the stored text could not express it.
     */
    async updatePersona(
      id: number,
      patch: PersonaPatch,
    ): Promise<PersonaRecord | null> {
      const existing = personas.get(id);

      if (existing === undefined) {
        return null;
      }

      if (patch.role === undefined && patch.systemText === undefined) {
        return copyPersona(existing);
      }

      const role = patch.role ?? existing.role;
      const holder = personaByRole(existing.domainId, role);

      if (holder !== undefined && holder.id !== id) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: PERSONA_KEY_UNIQUE,
        });
      }

      const updated: PersonaRecord = {
        ...existing,
        role,
        systemText: patch.systemText ?? existing.systemText,
      };

      personas.set(id, updated);

      return copyPersona(updated);
    },

    /**
     * Deletes one persona.
     *
     * Nothing hangs off a persona — no foreign key in schema v2
     * points at this table — so this is `deleteTerm`'s shape rather
     * than `deleteCategory`'s: neither a guard nor a cascade, and a
     * delete that cannot be refused.
     */
    async deletePersona(id: number): Promise<boolean> {
      return personas.delete(id);
    },

    /**
     * One window of a domain's topics, name ascending.
     *
     * A domain holding none and an id no domain carries are one
     * answer here — the empty list — because whether the domain
     * exists was settled by `DomainStore.findDomainBySlug` before
     * this was called.
     */
    async listTopics(
      domainId: number,
      window: StoreWindow,
    ): Promise<readonly TopicRecord[]> {
      return orderedTopics(domainId)
        .slice(window.offset, window.offset + window.limit)
        .map(copyTopic);
    },

    /**
     * How many topics one domain holds, ignoring any window.
     *
     * An id no domain carries answers zero rather than failing,
     * which is correct rather than a special case: nothing points at
     * a row that is not there.
     */
    async countTopics(domainId: number): Promise<number> {
      return topicsOf(domainId).length;
    },

    /** One topic by its id, or null. */
    async findTopicById(id: number): Promise<TopicRecord | null> {
      const row = topics.get(id);

      return row === undefined
        ? null
        : copyTopic(row);
    },

    /**
     * Inserts one topic, UNSCHEDULED.
     *
     * `nextRunAt` is null on the row this answers whatever the
     * caller wanted, because `InsertTopicInput` declares no member
     * that could set it: the containment is the type's rather than a
     * check here. `searchTerms` is copied on the way in, so a caller
     * that goes on editing the list it submitted does not edit the
     * stored row.
     *
     * The id comes off the counter first, so every refusal below
     * burns one exactly as the sequence does. No measurement of this
     * table's own: `topics` carries the same pair of mechanisms over
     * the same column `personas` does, where two refused inserts
     * between two accepted ones left a gap of two against the live
     * server.
     *
     * The key is checked ahead of the foreign key, matching every
     * insert above. NOTHING CAN OBSERVE THAT ORDER HERE, and saying
     * so is the honest half: the unique key opens on the very column
     * the foreign key constrains, so a write naming a domain that
     * does not exist can duplicate nothing.
     */
    async insertTopic(input: InsertTopicInput): Promise<TopicRecord> {
      const id = nextTopicId;

      nextTopicId += 1;

      if (topicByName(input.domainId, input.name) !== undefined) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: TOPIC_KEY_UNIQUE,
        });
      }

      guardTopicDomain(input.domainId);

      const row: TopicRecord = {
        id,
        domainId: input.domainId,
        name: input.name,
        searchTerms: [...input.searchTerms],
        intervalSeconds: input.intervalSeconds,
        nextRunAt: null,
        enabled: input.enabled,
        minIntervalSeconds: input.minIntervalSeconds,
        maxIntervalSeconds: input.maxIntervalSeconds,
      };

      topics.set(row.id, row);

      return copyTopic(row);
    },

    /**
     * Rewrites the supplied members of one topic.
     *
     * A PATCH NAMING NO MEMBER WRITES NOTHING and answers the stored
     * row, for the reason `updatePersona` above gives: `topics`
     * carries no `updated_at` either, so an empty patch has nothing
     * to set and drizzle throws on an empty update list.
     *
     * `name` IS PATCHABLE AND `domainId` IS NOT, so what is checked
     * is the resulting name within the STORED domain, and no update
     * reaches the foreign key at all. A row is not in conflict with
     * itself, so the row found under the resulting pair is a refusal
     * only when it is a different row.
     *
     * THE TWO BOUNDS DISTINGUISH THREE REQUESTS and the two NOT NULL
     * members distinguish two, which is why they are written
     * differently below. Absent leaves a bound alone and an explicit
     * `null` clears it, so `??` would collapse the two and make
     * removing a floor unexpressible — the rule
     * `CategoryPatch.parentId` carries in `src/taxonomy/store.ts`.
     * `intervalSeconds` and `enabled` are not nullable, so `??` says
     * exactly the right thing for them, `false` included.
     *
     * `searchTerms` REPLACES THE STORED LIST WHOLE and is copied on
     * the way in, never merged into what is there and never appended
     * to: a caller sends the list it wants to exist, which is the
     * only shape under which removing a term is expressible at all.
     */
    async updateTopic(
      id: number,
      patch: TopicPatch,
    ): Promise<TopicRecord | null> {
      const existing = topics.get(id);

      if (existing === undefined) {
        return null;
      }

      if (
        patch.name === undefined
        && patch.searchTerms === undefined
        && patch.intervalSeconds === undefined
        && patch.enabled === undefined
        && patch.minIntervalSeconds === undefined
        && patch.maxIntervalSeconds === undefined
      ) {
        return copyTopic(existing);
      }

      const name = patch.name ?? existing.name;
      const holder = topicByName(existing.domainId, name);

      if (holder !== undefined && holder.id !== id) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: TOPIC_KEY_UNIQUE,
        });
      }

      const updated: TopicRecord = {
        ...existing,
        name,
        searchTerms: patch.searchTerms === undefined
          ? existing.searchTerms
          : [...patch.searchTerms],
        intervalSeconds: patch.intervalSeconds ?? existing.intervalSeconds,
        enabled: patch.enabled ?? existing.enabled,
        minIntervalSeconds: patch.minIntervalSeconds === undefined
          ? existing.minIntervalSeconds
          : patch.minIntervalSeconds,
        maxIntervalSeconds: patch.maxIntervalSeconds === undefined
          ? existing.maxIntervalSeconds
          : patch.maxIntervalSeconds,
      };

      topics.set(id, updated);

      return copyTopic(updated);
    },

    /**
     * Writes one topic's due time, AND NOTHING ELSE.
     *
     * The instant is COPIED on the way in, which is what the two
     * schedule verbs need from this method rather than a nicety: a
     * service holding the `Date` it passed could otherwise go on
     * moving the stored due time after the write, through a member
     * the port declares `readonly`. The drizzle implementation
     * cannot have that fault, since a timestamp crossing the driver
     * is serialised on the way in and parsed fresh on the way out.
     *
     * It takes no view of the instant: no clamp, no clock, no
     * reading of `enabled` and no comparison against the stored due
     * time. All four are `src/topics/service.ts`'s, because all four
     * are decisions rather than facts a database reports.
     */
    async updateTopicSchedule(
      id: number,
      nextRunAt: Date,
    ): Promise<TopicRecord | null> {
      const existing = topics.get(id);

      if (existing === undefined) {
        return null;
      }

      const updated: TopicRecord = {
        ...existing,
        nextRunAt: copyInstant(nextRunAt),
      };

      topics.set(id, updated);

      return copyTopic(updated);
    },

    /**
     * Deletes one topic.
     *
     * Nothing in schema v2 points at `topics`, so this is
     * `deletePersona`'s shape rather than `deleteCategory`'s:
     * neither a guard nor a cascade, and a delete that cannot be
     * refused.
     */
    async deleteTopic(id: number): Promise<boolean> {
      return topics.delete(id);
    },

    /**
     * One window of a domain's sources, id ascending, each with its
     * parse-status aggregate.
     *
     * THE AGGREGATE IS COUNTED FOR EVERY ROW ON THE PAGE, from the
     * documents the seam planted, and every member of
     * `DOCUMENT_PARSE_STATUSES` is present on each — a source that
     * has captured nothing answers a counted zero under each rather
     * than an empty record. The drizzle implementation reads the
     * whole page in one `GROUP BY (source_id, parse_status)` rather
     * than a query per source; here the difference does not exist,
     * which is exactly why the shape of the ANSWER is what this port
     * pins.
     *
     * A domain holding none and an id no domain carries are one
     * answer — the empty list — because whether the domain exists
     * was settled by `DomainStore.findDomainBySlug` before this was
     * called.
     */
    async listSourcesWithParseStats(
      domainId: number,
      window: StoreWindow,
    ): Promise<readonly SourceWithParseStats[]> {
      return orderedSources(domainId)
        .slice(window.offset, window.offset + window.limit)
        .map((row) => ({
          ...copySource(row),
          parseStats: parseStatsOf(row.id),
        }));
    },

    /**
     * How many sources one domain holds, ignoring any window.
     *
     * SOURCES AND NEVER DOCUMENTS: the document counts belong to the
     * aggregate on each row, and this is the number `meta.total` on
     * the page is derived from. An id no domain carries answers zero
     * rather than failing, which is correct rather than a special
     * case.
     */
    async countSources(domainId: number): Promise<number> {
      return sourcesOf(domainId).length;
    },

    /**
     * One source by its id, or null.
     *
     * WITHOUT the parse-status aggregate, deliberately: none of the
     * three callers naming `/sources/:id` needs the counts, and
     * counting on every lookup would put a document scan behind a
     * patch.
     */
    async findSourceById(id: number): Promise<SourceRecord | null> {
      const row = sources.get(id);

      return row === undefined
        ? null
        : copySource(row);
    },

    /**
     * Inserts one source, NEVER FETCHED.
     *
     * `cursor`, `consecutiveFailures`, both stamps and `flagged` are
     * the column defaults whatever the caller wanted, because
     * {@link InsertSourceInput} declares no member that could set
     * one: the containment is the type's rather than a check here.
     * The two `jsonb` documents are copied on the way in, so a caller
     * that goes on editing the config it submitted does not edit the
     * stored row.
     *
     * IT ALWAYS INSERTS AND CANNOT CONFLICT. `sources` carries no
     * unique key, so there is nothing for a duplicate to land on —
     * the one thing about this method a reader coming from the topics
     * or personas half will expect and not find.
     *
     * The id comes off the counter first, so the two refusals below
     * burn one exactly as the sequence does. No measurement of this
     * table's own, and it is the weakest of the burn claims here for
     * a structural reason: the gaps measured on `personas` covered a
     * key refusal and a foreign-key one, and this table has no key at
     * all, so only the second of that pair has a counterpart.
     *
     * The CHECK is asked ahead of the foreign key. Argued rather than
     * measured — a table CHECK is evaluated while the row is still
     * being formed and a foreign key by an AFTER trigger at the end
     * of the statement — and the module header says so.
     */
    async insertSource(input: InsertSourceInput): Promise<SourceRecord> {
      const id = nextSourceId;

      nextSourceId += 1;

      guardSourceKind(input.kind);
      guardSourceDomain(input.domainId);

      const row: SourceRecord = {
        id,
        domainId: input.domainId,
        kind: input.kind,
        endpoint: input.endpoint,
        parserConfig: copyJsonDocument(input.parserConfig),
        contract: copyJsonDocument(input.contract),
        cursor: null,
        consecutiveFailures: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        enabled: input.enabled,
        flagged: false,
      };

      sources.set(row.id, row);

      return copySource(row);
    },

    /**
     * Rewrites the supplied members of one source.
     *
     * A PATCH NAMING NO MEMBER WRITES NOTHING and answers the stored
     * row, for the reason `updateTopic` above gives: `sources`
     * carries no `updated_at` either, so an empty patch has literally
     * nothing to set and drizzle throws `No values to set` on an
     * empty update list.
     *
     * THE CHECK IS RE-RUN OVER THE EFFECTIVE `kind` — the patched one
     * where the patch names it, the stored one where it does not —
     * because a CHECK fires on every write. A stored row is always
     * legal, so a patch that renames only the endpoint cannot be
     * refused by it; running the guard anyway is what keeps that a
     * consequence rather than an assumption.
     *
     * NO FOREIGN KEY AND NO UNIQUE KEY IS REACHABLE HERE. `domainId`
     * is not on {@link SourcePatch} and the table has no key, so the
     * CHECK is the whole of this method's refusal surface — the only
     * update in this file whose one mechanism is not a duplicate.
     *
     * THE FIVE PIPELINE-OWNED COLUMNS ARE UNREACHABLE, whatever this
     * is handed, because the patch type declares no member that could
     * carry one. Both `jsonb` documents REPLACE what is stored rather
     * than merging into it, and are copied on the way in.
     */
    async updateSource(
      id: number,
      patch: SourcePatch,
    ): Promise<SourceRecord | null> {
      const existing = sources.get(id);

      if (existing === undefined) {
        return null;
      }

      if (
        patch.kind === undefined
        && patch.endpoint === undefined
        && patch.parserConfig === undefined
        && patch.contract === undefined
        && patch.enabled === undefined
      ) {
        return copySource(existing);
      }

      const kind = patch.kind ?? existing.kind;

      guardSourceKind(kind);

      const updated: SourceRecord = {
        ...existing,
        kind,
        endpoint: patch.endpoint ?? existing.endpoint,
        parserConfig: patch.parserConfig === undefined
          ? existing.parserConfig
          : copyJsonDocument(patch.parserConfig),
        contract: patch.contract === undefined
          ? existing.contract
          : copyJsonDocument(patch.contract),
        enabled: patch.enabled ?? existing.enabled,
      };

      sources.set(id, updated);

      return copySource(updated);
    },

    /**
     * What one source has accumulated, per dependent table.
     *
     * BOTH MEMBERS COUNTED FROM WHAT THE TWO SEAMS HOLD, and the
     * document half is counted from ROWS rather than read off a
     * planted number — the divergence
     * {@link MemoryResearchStore.setDomainDependents} carries for the
     * domain guard has no counterpart here, because one seam supplies
     * every reader of that table.
     *
     * A zero is a counted zero, and an id no source carries answers
     * two of them rather than failing: nothing points at a row that
     * is not there. Whether that id should have existed is a question
     * `findSourceById` already answered.
     */
    async countSourceDependents(id: number): Promise<SourceDependentCounts> {
      return {
        documents: documentsOf(id).length,
        findingSightings: sourceSightings.get(id) ?? 0,
      };
    },

    /**
     * Deletes one source, unless something still cites it.
     *
     * ITS DOCUMENTS AND ITS SIGHTINGS EACH REFUSE THE DELETE, which
     * is both columns being `ON DELETE no action` rather than a rule
     * invented here. This is the shape `deleteCategory` has and
     * `deleteTopic` does not, and it differs from the category one in
     * the direction the refusal points: a category is held by its own
     * table's children, and a source is held from outside by two
     * tables of somebody else's rows.
     *
     * NO CASCADE ANYWHERE. This either removes a row nothing
     * references or is refused; it never takes a second row with it,
     * which is the opposite of `deleteDomain` above.
     *
     * THE ORDER OF THE TWO CHECKS IS NOT MEASURED AND NOT OBSERVABLE:
     * both are end-of-statement checks over one statement, and the
     * service reads the counts rather than the constraint name. The
     * module header carries that whole argument, and the reason a
     * THIRD refusing key is not imitated at all.
     */
    async deleteSource(id: number): Promise<boolean> {
      if (documentsOf(id).length > 0) {
        throw new StoreRefusal({
          reason: 'foreign-key-violation',
          constraint: SOURCE_DOCUMENTS_FK,
        });
      }

      if ((sourceSightings.get(id) ?? 0) > 0) {
        throw new StoreRefusal({
          reason: 'foreign-key-violation',
          constraint: SOURCE_SIGHTINGS_FK,
        });
      }

      return sources.delete(id);
    },

    /**
     * One window of a source's failed captures, newest first.
     *
     * READS DOCUMENTS AND WRITES NONE — there is no insert, update or
     * delete over that table anywhere on this port, so the review
     * queue is read-only structurally rather than by convention.
     *
     * `failed` ROWS ONLY, and the filter is this method's rather than
     * a caller's: there is no status parameter, so the queue cannot
     * be asked for the corpus.
     *
     * BODIES COME BACK AS STORED, unmasked and uncut.
     * `src/sources/failures-service.ts` is what replaces a control
     * byte with its text form and cuts the body to a cap, and keeping
     * that out of here is what lets it be tested against a planted
     * control byte with no database.
     */
    async listSourceFailures(
      sourceId: number,
      window: StoreWindow,
    ): Promise<readonly SourceFailureRecord[]> {
      return failuresOf(sourceId)
        .slice(window.offset, window.offset + window.limit)
        .map(failureOf);
    },

    /**
     * How many of one source's documents stand at `failed`, ignoring
     * any window.
     *
     * The same rows `parseStats.failed` counts on the list route,
     * asked for differently, and the same number: one dataset behind
     * both is what makes that true here rather than a coincidence two
     * implementations could disagree about.
     */
    async countSourceFailures(sourceId: number): Promise<number> {
      return failuresOf(sourceId).length;
    },

    /**
     * Reads the operator's configuration, or null before any write.
     *
     * NULL AND `{}` ARE TWO ANSWERS HERE, though
     * `src/settings/service.ts` answers `{}` for both. What crosses
     * this port is whether a row exists; collapsing that into the
     * empty payload is a decision, and a store taking it would
     * leave nothing able to tell a never-configured deployment from
     * a configured-to-nothing one.
     */
    async readSettings(): Promise<OperatorSettings | null> {
      return storedSettings === null
        ? null
        : copyOperatorSettings(storedSettings);
    },

    /**
     * Writes the operator's configuration, whole.
     *
     * A FIRST WRITE AND A REWRITE ARE ONE CALL, and neither can be
     * refused. The drizzle implementation gets there by upserting on
     * the singleton id; this one gets there by holding one payload,
     * and nothing here can hold a second.
     *
     * THE PAYLOAD REPLACES THE STORED ONE RATHER THAN MERGING INTO
     * IT, which is the only way a member is ever cleared: under a
     * merge, the request that omits a preference and the request
     * that removes it would be the same bytes. The assignment below
     * is the whole of the rule, exactly as a `jsonb` column in a
     * drizzle `set` list is assigned rather than merged.
     *
     * THE ANSWER IS READ BACK OUT OF STORED STATE rather than echoed
     * from the argument, so a caller sees what is held — and a
     * second copy is taken on the way out, since handing the stored
     * payload back would let a caller write into it through the
     * deeply `readonly` the port declares.
     *
     * Only the second half of that is observable here, and the
     * first is a MEASURED ZERO: the payload is copied in and copied
     * out, so a copy of the argument and a copy of stored state are
     * the same object graph, and the leg swapping one for the other
     * reddens no case in
     * `tests/helpers/memory-research-store.test.ts`. The claim has a
     * subject only where the database can change what it stored
     * — `jsonb` normalises key order and drops a duplicate key
     * — so it is `src/settings/db-store.ts`'s `RETURNING` list
     * that discharges it, and `tests/live/api.live.test.ts` is
     * where that now happens: a payload written with its keys out
     * of jsonb order comes back in the database's order, which is
     * an answer this implementation cannot give.
     */
    async writeSettings(
      settings: OperatorSettings,
    ): Promise<OperatorSettings> {
      storedSettings = copyOperatorSettings(settings);

      return copyOperatorSettings(storedSettings);
    },

    setDomainDependents(
      domainId: number,
      counts: Partial<DomainDependentCounts>,
    ): void {
      dependents.set(domainId, { ...NO_DEPENDENTS, ...counts });
    },

    setSourceDocuments(
      sourceId: number,
      documents: readonly MemorySourceDocument[],
    ): void {
      // Copied on the way in, row by row, so a caller that goes on
      // moving a planted `capturedAt` does not move a stored one —
      // and the list itself is rebuilt, so pushing onto what was
      // planted does not plant a sixth row.
      sourceDocuments.set(sourceId, documents.map(copyPlantedDocument));
    },

    setSourceSightings(sourceId: number, count: number): void {
      sourceSightings.set(sourceId, count);
    },
  };
}
