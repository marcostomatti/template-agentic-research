/**
 * @packageDocumentation
 * The in-memory dataset every research store port is driven through
 * in the isolated suite. All twelve halves are here — the domains
 * half, the taxonomy half with categories and terms together, the
 * personas beside them, the topics the dispatcher comes for, the
 * sources it reads and the review queue over what they captured, the
 * connectors the deployment reaches other services through, the
 * export subscriptions that pair the two, the operator settings it
 * is configured by, the findings a pass made with the sightings,
 * rulings and research that hang off them, the corpus one domain has
 * captured whatever feed it arrived through, the registry of
 * subjects it tracks with the intentions queued against them, and
 * the passes it has made with the model calls each one ledgered.
 *
 * ONE DATASET RATHER THAN SEVEN FAKES, which is why this file is not
 * named for any one of the ports it satisfies. `src/domains/store.ts`
 * records that the taxonomy, personas and settings services all
 * resolve a `:slug` through {@link DomainStore.findDomainBySlug}
 * before doing anything of their own, and `src/topics/store.ts` and
 * `src/sources/store.ts` record the same of their own services. The
 * taxonomy, persona, topic and source tables all hang off
 * `domains.id` with `ON DELETE CASCADE`, so a domain deleted through
 * one port has to be gone from the others, and only shared state
 * makes that true: seven independent fakes would agree with each
 * other right up until a case deleted something.
 *
 * `operator_settings` IS ONE OF TWO TABLES THAT HANG OFF NOTHING,
 * and it belongs in the shared dataset for the other direction of
 * that same rule. It carries no `domain_id` and no foreign key, so a
 * domain delete leaves it exactly as it was — including a
 * `defaultDomainSlug` naming the domain that has just gone. That is
 * the behaviour rather than an omission: `src/settings/store.ts`
 * carries why a dangling slug reads as no default being set, and a
 * settings fake standing on its own could not be asked the question
 * at all.
 *
 * `connectors` IS THE SECOND, and the pair differ in where they are
 * pointed AT rather than in what they hang off. Nothing references
 * the settings row, while an `export_subscriptions` row names a
 * connector — so the connectors half below carries a guarded delete
 * where the settings half cannot be refused anything at all, and a
 * domain delete reaches neither.
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
 * THE CONNECTORS HALF HANGS OFF NO DOMAIN AT ALL, WHICH IS A SHAPE
 * ONLY THE SETTINGS HALF SHARES. `connectors` carries no `domain_id`
 * — `src/db/schema/sources.ts` argues it at the table: which model
 * endpoint answers, or which notebook an export is handed to, is a
 * fact about the deployment rather than about any one domain's
 * subject matter — so no method in this half takes a domain, no case
 * plants one to hang a row off, and the cascade below reaches nothing
 * of it. Which domain wanted which connector is recorded where it
 * varies, in an `export_subscriptions` row, so a connector outlives
 * every domain that named it.
 *
 * ITS TWO WRITE MECHANISMS ARE A KEY AND A CHECK, AND THEY SIT ON
 * DIFFERENT WRITES — the mirror of the sources half, whose CHECK
 * sits on both writes and whose foreign key sits on one.
 * `connectors_kind_name_unique` refuses a kind and name pair the
 * deployment already carries, as a `unique-violation`, on an INSERT
 * and on an UPDATE alike, because `name` is patchable per
 * `ConnectorPatch`. `connectors_kind_check` refuses a `kind` outside
 * `CONNECTOR_KINDS` as a `check-violation`, and the INSERT alone
 * reaches it: `kind` is deliberately absent from that patch type, so
 * no update here is ever written against the CHECK.
 *
 * THE TWO CANNOT BE VIOLATED AT ONCE, so this half imitates no order
 * and claims none. The key opens on the very column the CHECK
 * constrains: every stored row's `kind` is inside the tuple, because
 * the CHECK kept it there, so a write proposing a kind outside the
 * tuple can duplicate nothing. That is the term half's sentence over
 * a different pair of mechanisms, and `src/connectors/store.ts`
 * states it for the port.
 *
 * ITS DELETE IS REFUSED FROM OUTSIDE THE ROW AND BY EXACTLY ONE KEY,
 * which is the sources half's shape narrowed to a single mechanism
 * — and narrowed on a reading of the generated SQL rather than on a
 * plan, since that is the reading the sources half's plan got wrong.
 * `export_subscriptions_connector_id_connectors_id_fk` is the whole
 * of it. So this half has no unimitated key of its own, and the
 * sentence the sources half owes about a state it cannot reach has no
 * counterpart here.
 *
 * ITS ONE SEAM PLANTS A COUNT, and that is
 * {@link MemoryResearchStore.setSourceSightings}' shape taken for
 * that seam's reason rather than the documents seam's:
 * `countConnectorDependents` is the only method on this port that can
 * be asked about a subscription at all. The number is AUTHORITATIVE
 * the way {@link MemoryResearchStore.setDomainDependents}' is, and
 * today it is the only decision available — no port here writes an
 * `export_subscriptions` row, so there is nothing to count from. When
 * the subscriptions half lands, this seam meets the question that
 * domain guard already answered, and the seam's own TSDoc is where
 * the answer is owed.
 *
 * AND ITS `config` TAKES THE ROUND TRIP, in both directions, for the
 * reason the two source documents take it and with one consequence
 * they do not carry. `connectors.config` declares no `$type` — what
 * a client needs differs by `kind` — so there is no depth a spread
 * could be written to instead. The consequence is that this is the
 * one column in this file holding a CREDENTIAL: the port answers it
 * AS STORED, masking being `src/connectors/service.ts`'s, so the copy
 * is what keeps a caller from writing into a stored secret and what
 * keeps a caller that kept an answered row from reading one this
 * store has since replaced.
 *
 * THE SUBSCRIPTIONS HALF IS THE ONLY ONE STANDING BETWEEN TWO
 * OTHERS, which is why it is last and why it could not have been a
 * fake of its own. `export_subscriptions.domain_id` cascades, so its
 * rows are the domains half's to take, and its `connector_id` names
 * a `connectors` row, so its writes are the connectors half's to be
 * refused by. Every other half here answers to at most one
 * neighbour. One dataset is what lets a write ask whether a
 * connector another half stored is still there, and two fakes would
 * agree with each other until a case deleted one.
 *
 * ITS NATURAL KEY IS A TRIPLE, THE WIDEST IN THIS FILE, AND BOTH
 * WRITES REACH IT. The key
 * `export_subscriptions_domain_id_format_connector_id_unique` is
 * declared over the domain, the format and the connector together
 * because no PAIR of the three identifies a subscription: one domain
 * may want the same digest in two formats, and may want one format
 * delivered to two destinations. So the two widening controls a
 * per-kind key needs become three here — a second format under one
 * connector, a second connector under one format, and the same triple
 * under a second domain — and a store keying on any pair refuses a
 * write the database takes.
 *
 * FOUR MECHANISMS SIT ON ITS TWO WRITES, WHICH IS THE WIDEST WRITE
 * SURFACE OF ANY HALF HERE. The triple above refuses on an INSERT
 * and on an UPDATE alike, `format` and `connectorId` both being
 * patchable. `export_subscriptions_format_check` refuses a format
 * outside `EXPORT_FORMATS` on both writes too — the sources half's
 * shape rather than the connectors half's, and for the sources
 * half's reason: a format selects the renderer that runs for THIS
 * row and nothing outside the row reads it.
 * `export_subscriptions_domain_id_domains_id_fk` refuses a domain
 * that is not there, and the INSERT alone reaches it, `domainId`
 * being unpatchable. And
 * `export_subscriptions_connector_id_connectors_id_fk` refuses a
 * connector that is not there, on both writes, because re-pointing
 * a delivery is the operation `src/db/schema/scheduling.ts` says the
 * connector delete's own refusal exists to make explicit.
 *
 * THAT LAST KEY IS THE ONE CONSTRAINT THIS FILE IMITATES FROM BOTH
 * ENDS, and the two ends are different rules. Read from `connectors`
 * it holds a DELETE: a connector an export subscription still names
 * cannot go, which is the connectors half's guarded delete above. Read
 * from here it refuses a WRITE: a subscription naming a connector that
 * is not there cannot land. The port in `src/subscriptions/store.ts`
 * calls the second a race rather than an ordinary refusal, the service
 * having resolved the connector before writing — but a race a
 * deployment can lose is a state this store can be put in directly, so
 * the guard is imitated rather than argued away.
 *
 * ITS ONLY UNOBSERVABLE ORDER IS ARGUED AND NOT MEASURED, which is
 * the sources half's answer to the same question. Four mechanisms
 * make six pairings and three of them cannot both fire at all: the
 * key opens on the very columns the CHECK and each foreign key
 * constrain, so a write proposing a format outside the tuple, or a
 * domain or connector that is not there, can duplicate nothing. What
 * is left — the CHECK beside a missing parent, and the two foreign
 * keys beside each other — is reachable, and the order below rests
 * on when a server evaluates each KIND of mechanism rather than on
 * any reading of this table. No case pins it.
 *
 * ITS DELETE CANNOT BE REFUSED, and that is a re-derivation rather
 * than an assumption: nothing in the generated SQL references
 * `public.export_subscriptions`, read in the same command as the one
 * reference to `public.connectors` that is the live needle beside it.
 * `briefings` is the near miss and is not one — the schema module
 * `src/db/schema/runs.ts` states that no foreign key runs between the
 * two, so a rendered digest outlives the subscription that asked for
 * it as stored text rather than as a reference. So this half has a
 * guarded delete on neither side of it: it is refused by nothing, and
 * what it CLEARS is the connectors half's refusal.
 *
 * IT DOES NOT CLEAR THAT REFUSAL HERE, AND THAT IS THIS FILE'S
 * SECOND KNOWN DIVERGENCE. `ConnectorStore.countConnectorDependents`
 * reads what {@link MemoryResearchStore.setConnectorSubscriptions}
 * planted and never the rows this half writes, exactly as the domain
 * guard reads a planted number over real topics and sources. The
 * seam's own TSDoc carries why — `src/connectors/service.test.ts`
 * and `src/connectors/routes.test.ts` reach that guard by planting
 * over a store holding no subscription at all, and a rule mixing a
 * planted number with a counted one answers neither — and
 * `tests/live/api-wave2.live.test.ts` is where the counted answer is
 * discharged.
 *
 * THE FINDINGS HALF WRITES ONE TABLE AND PLANTS THREE, WHICH IS THE
 * SHAPE NO HALF ABOVE HAS. `FindingStore` declares six readers and
 * one writer, and the writer appends a `finding_labels` row — so
 * `findings`, `finding_sightings` and `entity_research` are supplied
 * by seams, on the reasoning `documents` already is one table over.
 * The consequence for a reader of this file is that the half has ONE
 * refusal mechanism rather than the sources half's four:
 * `finding_labels_finding_id_findings_id_fk`, refusing a ruling
 * appended onto a finding that is not there. No CHECK, no unique key
 * and no guarded delete, because there is nothing else a method can
 * reach.
 *
 * ITS PAGE IS ORDERED BY `compareFindings`' KEYS WRITTEN OUT rather
 * than by that comparator called, and the distinction is what one
 * suite one layer up rests on. `src/lib/digest-assemble.ts` exports
 * the ordering the digest selection and every renderer already agree
 * on, and `src/findings/service.test.ts` holds a page THIS store
 * answered against `orderFindings` over the same rows — so a store
 * importing the library would leave that comparison holding one
 * authority against itself. Expressing the keys here is the same
 * decision `src/findings/db-store.ts` takes when it expresses them
 * in SQL, and the two suites then check one rule from two sides.
 *
 * AN ABSENT SCORE IS THE TAIL OF THAT ORDER AND NOT ITS FLOOR, which
 * is the half of it a store gets wrong by sorting nulls low. Two
 * unscored findings tie on the first key and fall through to the
 * stamp, so the tail keeps an order of its own. Both orderings end
 * in `id` descending, `created_at` defaulting to the transaction's
 * start time and a pass therefore writing findings that tie to the
 * microsecond.
 *
 * ITS VERDICT FILTER READS THE LATEST RULING AND NOT ANY. The table
 * carries no unique key at all, so re-judging APPENDS and the row in
 * force is the newest by `labelled_at` with `id` breaking the tie. A
 * store matching any label answers a page of findings an operator
 * has already moved on from, with every count beside it agreeing,
 * and a finding nobody has judged matches no verdict a caller can
 * name.
 *
 * ITS CATEGORY FILTER IS A `jsonb` READ AND NOT A JOIN. No column
 * links a finding to a category: a domain files one through the
 * `fields` payload, under the member named in this file and in
 * `ar-digest`'s assembly node and nowhere else. What is imitated is
 * the COLUMN read `fields->>'category'` rather than the digest's own
 * reduction of that member — `src/findings/store.ts` names that as
 * the one place the two filings could part — so a numeric member
 * answers its text here exactly as `->>` does, and a key the domain
 * never declared is an empty page rather than a refusal.
 *
 * ITS WINDOW IS HALF-OPEN OVER `created_at`,
 * `[sinceInclusive, untilExclusive)`, and the member names are what
 * say which side each bound closes. A store writing `<=` on the
 * upper bound is a bug no type could report, and two adjacent
 * windows would then both take the seam a caller paging through time
 * crosses most often. Neither bound is re-checked for order:
 * `timeWindowQuerySchema` refuses an inverted window before any of
 * this is reached.
 *
 * AND ITS SIGHTINGS ARE ROWS WHERE THE SOURCES HALF PLANTS A NUMBER,
 * OVER ONE TABLE. `SourceStore.countSourceDependents` can only be
 * asked how many `finding_sightings` rows cite a source, while
 * `FindingStore.listFindingSightings` answers the rows themselves,
 * so one shape cannot serve both. A row planted through the findings
 * seam therefore does not hold its source's delete, which is a known
 * divergence stated at both seams and pinned by a case rather than
 * left to be discovered.
 *
 * THE DOCUMENTS HALF WRITES NOTHING AT ALL, WHICH IS A SHAPE NO HALF
 * ABOVE HAS EITHER. `DocumentStore` declares two methods and both
 * are reads, so there is no insert to burn an id on, no update, no
 * delete, and no mechanism for this half to imitate. It throws no
 * {@link StoreRefusal} for the settings half's reason reached by a
 * shorter argument: that port cannot reach the `operator_settings`
 * mechanisms, and this one has no write to reach
 * `documents_parse_status_check`, `documents_hash_unique` or either
 * of that table's foreign keys WITH. So the whole half is a seam,
 * two reads, and one line in the domain cascade.
 *
 * AND IT PLANTS THE SAME TABLE THE SOURCES HALF PLANTS, KEYED
 * DIFFERENTLY, which is this file's FIFTH known divergence and its
 * second over `documents`.
 * {@link MemoryResearchStore.setSourceDocuments} is keyed by the
 * source a capture came through and
 * {@link MemoryResearchStore.setDomainDocuments} by the domain that
 * holds it, because the two ports ask different questions of the
 * table: that one is one SOURCE's failures worked from the top, and
 * this one is one DOMAIN's corpus whatever its status and whatever
 * it arrived through. A row planted through either seam is invisible
 * to the other, and both faces are pinned by a case rather than left
 * to be discovered — the sightings divergence stated one table over,
 * for the same reason.
 *
 * A NULL `source_id` IS WHAT MAKES THAT MORE THAN A BOOKKEEPING
 * CHOICE. An ingested file and a pasted body land in the corpus
 * carrying no source at all, and the sources seam is keyed BY a
 * source id — so those rows are not merely planted somewhere else,
 * they have no key to be planted under there. A fake resolving one
 * seam through the other could not hold the collection this half
 * exists for.
 *
 * ITS PAGE IS `captured_at` DESCENDING WITH `id` DESCENDING, AND THE
 * TIE THE SECOND KEY BREAKS IS THE SERVER'S OWN. `captured_at`
 * defaults to `now()`, which is the TRANSACTION's start time, so a
 * batch capture writes rows tying to the microsecond and a page
 * boundary falling inside that tie would show one document twice and
 * another never. The failures queue orders by the same pair over the
 * same rows; that the two agree is the column's doing rather than a
 * shared helper's, and each ordering is expressed where its own
 * reader can be checked against it.
 *
 * ITS FILTER NARROWS AND NEVER SETS, AND ABSENT IS BOTH STATUSES. A
 * failed document is IN the corpus rather than behind a flag, which
 * is fail-flag-keep read from the debug page's side: a default that
 * hid them would make this collection agree with every other reader
 * precisely where an operator is looking for the disagreement. A
 * status no row carries is an empty page rather than a refusal, and
 * a status outside `DOCUMENT_PARSE_STATUSES` never reaches here at
 * all — `src/documents/service.ts` refuses it with a `422` before
 * this port is called, which is why the filter's member is the union
 * where the record's is `string`.
 *
 * THE ENTITIES HALF WRITES TWO TABLES AND PLANTS THREE, WHICH IS THE
 * WIDEST SHAPE HERE THAT INSERTS NOTHING AT ALL. `EntityStore`
 * declares six readers and two writers, and neither writer is an
 * insert: `updateEntity` rewrites a registry row and `approvePoolRow`
 * stamps an intention. So `entities`, `entity_research` and
 * `research_pool` all arrive through seams, and two of the three are
 * then written in place.
 *
 * IT READS `entity_research` THROUGH THE SEAM THE FINDINGS HALF
 * ALREADY PLANTS, which is why there is no sixth seam over that
 * table. {@link MemoryResearchStore.setEntityResearch} is keyed by
 * the subject, and the subject is what both readers resolve through
 * — the findings half through a finding's own `entity_id`, this one
 * through the path. One table, one seam and two projections: this
 * half's record omits `entity_id` where that one keeps it.
 *
 * AND IT ORDERS THAT TABLE AGAIN RATHER THAN SHARING THE ORDER,
 * which is the decision {@link orderedDocuments} takes beside
 * {@link failuresOf} over `documents`. Both readers promise
 * `researched_at DESC, id DESC`, and that they agree is the column's
 * doing rather than a helper's — so each ordering is expressed where
 * its own reader's cases can falsify it.
 *
 * ITS UNIQUE KEY AND ITS FOREIGN KEY BOTH SIT ON THE REGISTRY WRITE,
 * AND ONE CALL CAN REACH BOTH, which is the shape the term, persona
 * and topic halves each said they did not have.
 * `entities_domain_id_name_norm_unique` refuses a rename landing on a
 * key another subject in this domain already holds, and
 * `entities_alias_of_entities_id_fk` refuses an `aliasOf` naming an
 * id no entity carries. Both are members of one `EntityPatch`, so a
 * request can carry both faults at once and the order between them is
 * observable. It is written key first and foreign key second, on the
 * relation the category half MEASURED between a unique index and an
 * end-of-statement check rather than on any reading of this table.
 *
 * TWO RULES THIS HALF DOES NOT HOLD, AND NEITHER IS AN OMISSION. A
 * row pointing at itself and a row pointing into another domain are
 * both storable — `entities.alias_of` in
 * `src/db/schema/entities.ts` says so in as many words — so
 * `src/entities/service.ts` refuses what the column stores and this
 * file goes on refusing only what Postgres does. The empty
 * `name_norm` is guarded by nothing here either: no CHECK forbids it,
 * and what keeps it unreachable is `normalizeEntityName` throwing one
 * layer up.
 *
 * `research_pool` CARRIES TWO CHECKS AND THEY ARE HELD IN DIFFERENT
 * PLACES, which is the one split in this file between a rule a TYPE
 * carries and a rule a call raises. `research_pool_status_check`
 * reads a single column, so {@link MemoryResearchPoolRow} declares
 * that member as the union and a plant outside the tuple does not
 * compile — the way `MemoryDomainDocument.parseStatus` holds
 * `documents_parse_status_check` one table over.
 * `research_pool_approval_check` holds TWO columns against each
 * other, which no type here can say, so the seam raises it: a row
 * carrying `researched_at` and no `approved_at` is refused as a
 * `check-violation` naming that constraint.
 *
 * THE SEAM IS WHERE THAT CHECK IS REACHED BECAUSE NO METHOD CAN
 * REACH IT. {@link EntityStore.approvePoolRow} only ever moves
 * `approved_at` from null to an instant, so it cannot produce the
 * refused state from either side, and nothing on this port writes
 * `researched_at` at all. A seam storing that state anyway would let
 * a case be written against a row the database will not hold, which
 * is the one thing this file exists to rule out — so the plant
 * refuses the batch WHOLE, leaving the previous plant standing,
 * rather than writing the rows that passed.
 *
 * THE APPROVAL IS IDEMPOTENT, AND THE SECOND CALL IS THE READING
 * THAT SAYS SO. `approvePoolRow` writes the approved status and
 * `coalesce(approved_at, now())`, member for member with
 * `approveById` in `scripts/approve.ts`, so a second ruling keeps the
 * FIRST ruling's instant rather than re-dating a search already paid
 * for. Nothing is asked of the row's state: an id naming a closed row
 * moves its status back to approved without moving the stamp, exactly
 * as the constraint permits.
 *
 * THERE IS NO ENTITY COUNTER AND NO POOL COUNTER, which is where this
 * half departs from every half above that inserts. Both tables carry
 * a `bigserial` in the database and no method here reaches it: the
 * ids are the fixture's own, as they are for `findings`, so the
 * id-burn fidelity the inserting halves owe has no subject.
 *
 * AND A DOMAIN TAKES ITS ENTITIES, THEIR RESEARCH AND ITS POOL ROWS
 * WITH IT, over three tables and by two different routes.
 * `entities.domain_id` cascades and `entity_research.entity_id`
 * cascades onto the entities, so the research goes two levels down
 * the way a finding's sightings do; `research_pool.domain_id`
 * cascades directly, so an intention naming NO subject goes with the
 * rest rather than being left behind. There is no guarded entity
 * delete to be careful of reusing: `EntityStore` declares no delete
 * at all, and retiring a subject is the alias pointer.
 *
 * WHAT IT DOES NOT REFUSE IS A CROSS-DOMAIN CITATION, AND THAT IS
 * THIS FILE'S SIXTH KNOWN DIVERGENCE. `research_pool.entity_id` and
 * `findings.entity_id` are both `ON DELETE no action`, so a
 * deployment REFUSES the delete of a domain whose entities are still
 * named by another domain's intentions or findings, the
 * end-of-statement check finding rows outside the cascade's reach.
 * Every seam here takes an id rather than a row, so that state is
 * plantable and this store takes the delete. One case pins it rather
 * than leaving it to be discovered, and
 * `tests/live/api-wave3.live.test.ts` is where the refusal is
 * discharged.
 *
 * THE RUNS HALF WRITES NOTHING AND REFUSES NOTHING, WHICH IS THE
 * DOCUMENTS HALF'S SHAPE OVER SIX METHODS AND TWO TABLES. `RunStore`
 * declares six reads and no seventh, so there is no insert to burn an
 * id on, no update, no delete, and no run counter. `runs` DOES carry
 * two mechanisms where `documents` reached none, and both are single
 * columns: {@link MemoryRun} declares `status` and `scheduledBy` as
 * the unions `runs_status_check` and `runs_scheduled_by_check`
 * enumerate, so a plant outside either tuple does not compile rather
 * than being refused at run time. That is the split the entities half
 * states between a rule a TYPE carries and a rule a call raises, with
 * nothing left on this side of it: the half throws no
 * {@link StoreRefusal} at all.
 *
 * AND IT IS THE ONE HALF HERE WHOSE PLANTS ARE FLAT. Every seam above
 * is keyed by the column its rows hang off, and neither of this
 * half's tables has one to be keyed by: `runs.domain_id` is NULLABLE
 * because a maintenance or cross-domain tick belongs to no domain,
 * and `llm_calls.run_id` is NULLABLE because a call may be attributed
 * to no pass. A domain-keyed runs seam and a run-keyed ledger seam
 * would each have no key for exactly the rows this half's most
 * load-bearing claims are about, which is the trap
 * {@link MemoryResearchStore.setSourceDocuments} meets one table over
 * for a document that came through no feed. So the parent rides on
 * the row and {@link dropRunsOf} reads it off there.
 *
 * ITS PAGE IS `started_at` DESCENDING WITH `id` DESCENDING, AND THE
 * TIE THE SECOND KEY BREAKS IS THE SERVER'S OWN, the argument the
 * corpus page makes over `captured_at`: the column defaults to
 * `now()`, which is the TRANSACTION's start time, so passes opened
 * together tie to the microsecond and a page boundary falling inside
 * that tie would show one run twice and another never. The ledger's
 * `called_at DESC, id DESC` is the same shape over the same kind of
 * default, and it is expressed AGAIN rather than shared — the
 * decision {@link orderedDocuments} takes beside {@link failuresOf},
 * applied to two tables instead of one.
 *
 * ITS FILTER NARROWS AND ABSENT MEANS EVERY RUN, TICKS INCLUDED. That
 * is not the corpus page's fail-flag-keep argument restated: there,
 * absent means both members of a closed tuple, and here it means the
 * whole table rather than the domain-scoped half of it. A filter
 * quietly dropping the ticks would make the page disagree with `runs`
 * about how much work the service has done, and the maintenance
 * passes are exactly the rows a reader goes looking for after
 * something stopped happening. There is no spelling that answers
 * those rows ALONE, `RunFilter.domainId` being an optional `number`
 * and never a `number | null`.
 *
 * ITS LEDGER IS CUT AT A LIMIT THE CALLER SUPPLIES, which is the one
 * read here that is not a window. `listRunLedger` takes a positive
 * `limit` and no offset, `countRunLedger` answers the full count, and
 * `src/runs/service.ts` compares the two into a truncation flag — so
 * a short list is never answered with nothing saying it was short.
 * A call naming NO run is unreachable from either, both being
 * addressed by a run id.
 *
 * ITS SUMMARY IS A `GROUP BY` OVER A `LEFT JOIN`, AND THE JOIN IS THE
 * HALF A READER WOULD GET WRONG. Every call inside the window is
 * counted, so the buckets' `calls` add up to the number of calls the
 * window holds; a call whose run named no domain and a call naming no
 * run at all both land in the bucket whose domain is null, and
 * neither is separable from the other in the answer. An INNER join
 * would drop the second kind silently, leaving a total taken from
 * this summary under-reporting with every number beside it agreeing.
 * {@link spendDomainOf} is where that is decided, and it answers null
 * a THIRD way this store can reach and a deployment cannot: a call
 * naming a run nothing stored.
 *
 * ITS DAY BUCKET IS UTC EXPLICITLY AND ITS SUMS ARE NULLABLE.
 * {@link utcDayOf} reads the three UTC parts rather than truncating
 * in whatever zone the process runs in, which is the same
 * per-deployment difference `SpendBucket.day` says a session's
 * `TimeZone` would make of `date_trunc`. And each magnitude sums the
 * calls that recorded it while `calls` counts the rows — so a bucket
 * where nothing was measured answers null rather than zero, zero
 * being a real reading of a prompt that sent nothing, and the two
 * sums are taken separately so a call measured on one axis alone
 * contributes to one of them.
 *
 * NO MEMBER OF THAT SUMMARY IS CURRENCY, and `llm_calls` carries no
 * column behind one. `est_tokens` is arithmetic over `prompt_chars`
 * rather than a provider's report, per its own TSDoc in
 * `src/db/schema/runs.ts`, so the two are one reading expressed twice
 * and no total here reconciles with a bill.
 *
 * AND A DOMAIN TAKES ITS RUNS AND THEIR LEDGER WITH IT, OVER TWO
 * LEVELS, LEAVING THE TICKS. `runs.domain_id` cascades and
 * `llm_calls.run_id` cascades onto the runs, which is
 * {@link dropFindingsOf}'s two levels over a different pair; a
 * domain-less tick hangs off no domain, so no delete reaches it or
 * its calls, and neither does anything reach a call naming no run.
 * There is no guarded run delete to be careful of reusing:
 * `RunStore` declares no delete at all.
 *
 * WHAT IT DOES NOT REFUSE IS A CROSS-DOMAIN RESEARCH CITATION, AND
 * THAT IS THIS FILE'S SEVENTH KNOWN DIVERGENCE.
 * `entity_research.run_id` is `ON DELETE no action`, and
 * `src/db/schema/entities.ts` records the two-hop reading VERIFIED
 * against a real Postgres: a result
 * whose entity belongs to the run's own domain goes in the same
 * statement and nothing is left orphaned, while a row pairing ONE
 * domain's entity with ANOTHER domain's run holds that second domain
 * open. {@link MemoryResearchStore.setEntityResearch} plants a
 * `runId`, so the state is reachable here and this store takes the
 * delete. One case pins it, and `tests/live/api-wave3.live.test.ts`
 * is where the refusal is discharged. `briefings.run_id` is the same
 * key and is left unimitated for `research_pool.finding_id`'s reason:
 * no port here writes that table and no seam plants one.
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
 * `export_subscriptions.next_run_at` is the SECOND and is the same
 * column: both tables spread the same `schedulableColumns()` helper,
 * so the argument carries over word for word rather than being made
 * again, and it is the ONLY mutable member a subscription record
 * carries.
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
 * `connectors.config` IS THE THIRD, on that same reasoning and with
 * the credential the connectors paragraphs above carry: it is the one
 * copied document here that is a live secret.
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
 * and leave the id it took unused. `connectors` carries a SEVENTH,
 * and burns it on both of ITS mechanisms on the same reasoning: a
 * key refusal and a non-key refusal are the pair the `personas` gap
 * of two was measured over, and this table's CHECK stands where that
 * measurement's foreign key did. `export_subscriptions` carries an
 * EIGHTH and burns it on all FOUR of its mechanisms, which is the
 * same reasoning again and the widest reach it has had: the
 * `personas` gap of two was measured over a key refusal and a
 * foreign-key one, and this table's four are that pair plus a CHECK
 * and a second foreign key.
 */
import type {
  ConnectorDependentCounts,
  ConnectorFilter,
  ConnectorPatch,
  ConnectorRecord,
  ConnectorStore,
  InsertConnectorInput,
} from '../../src/connectors/store.js';
import type { DomainSettings } from '../../src/db/schema/domains.js';
import type { OperatorSettings } from '../../src/db/schema/settings.js';
import type {
  DocumentParseStatus,
  ResearchPoolStatus,
  RunScheduler,
  RunStatus,
} from '../../src/db/schema/values.js';
import type {
  DocumentFilter,
  DocumentRecord,
  DocumentStore,
} from '../../src/documents/store.js';
import type {
  DomainDependentCounts,
  DomainPatch,
  DomainRecord,
  DomainStore,
  InsertDomainInput,
} from '../../src/domains/store.js';
import type {
  EntityPatch,
  EntityRecord,
  EntityResearchRecord,
  EntityStore,
  ResearchPoolRecord,
} from '../../src/entities/store.js';
import type {
  FindingFilter,
  FindingLabelRecord,
  FindingRecord,
  FindingResearchRecord,
  FindingSightingRecord,
  FindingSort,
  FindingStore,
  InsertFindingLabelInput,
} from '../../src/findings/store.js';
import type { StoreWindow, TimeWindow } from '../../src/http/schemas.js';
import type {
  InsertPersonaInput,
  PersonaPatch,
  PersonaRecord,
  PersonaStore,
} from '../../src/personas/store.js';
import type {
  LlmCallRecord,
  RunFilter,
  RunRecord,
  RunStore,
  SpendBucket,
} from '../../src/runs/store.js';
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
  InsertSubscriptionInput,
  SubscriptionPatch,
  SubscriptionRecord,
  SubscriptionStore,
} from '../../src/subscriptions/store.js';
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
  CONNECTOR_KINDS,
  DOCUMENT_PARSE_STATUSES,
  EXPORT_FORMATS,
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
 * One planted `documents` row, as the documents half reads it.
 *
 * {@link DocumentRecord} MEMBER FOR MEMBER, which is the one plant
 * in this file that carries every column its record answers. The
 * other three drop the key they are planted under; this one has
 * nothing to drop, because the record already omits `domainId` on
 * its own reasoning — a document is met in its domain and addressed
 * by nothing else, so `src/documents/store.ts` leaves the scope out
 * of the row and {@link MemoryResearchStore.setDomainDocuments}
 * plants under exactly the member the record does not carry.
 *
 * ITS `parseStatus` IS THE UNION WHERE THE RECORD'S IS `string`,
 * and the asymmetry is the point rather than a slip. A plant stands
 * in for the WRITER that stored the row, and a writer is held to
 * `documents_parse_status_check`; a record is what a SELECT answers,
 * and a SELECT answers whatever is stored, including a value written
 * before the tuple was narrowed. {@link MemorySourceDocument} takes
 * the same view of the same column for the same reason.
 *
 * IT IS NOT {@link MemorySourceDocument}, AND THE DIFFERENCE IS
 * `sourceId`. That shape omits the column because the source is its
 * key; this one carries it, nullable, because the corpus holds
 * documents that came through no feed at all. The two are two shapes
 * over one table rather than one shape somebody split, on the
 * two-ports argument `src/documents/store.ts` makes: each is scoped
 * to what its own readers can see, and one shape serving both would
 * put a column added for one collection into the other.
 */
export interface MemoryDomainDocument {
  /** `documents.id`, and the tiebreak on the corpus page's order. */
  readonly id: number;

  /**
   * The feed this document was captured through, or null when it
   * came through none.
   *
   * NULL IS AN ORDINARY STATE rather than an edge case, and it is
   * the state {@link MemoryResearchStore.setSourceDocuments} has no
   * key to plant: an ingested file and a pasted body sit in the
   * middle of this page by capture time and are unreachable through
   * a seam keyed by a source.
   */
  readonly sourceId: number | null;

  /** Where the document can be read at its source, or null. */
  readonly url: string | null;

  /** The document's text as captured, verbatim and possibly empty. */
  readonly body: string;

  /**
   * Which side of `documents_parse_status_check` the row sits on,
   * and what {@link DocumentFilter.parseStatus} narrows against.
   */
  readonly parseStatus: DocumentParseStatus;

  /**
   * What went wrong, or null when nothing was recorded — including
   * on a row that is `failed`, which is storable and is the shape
   * that costs an operator the most.
   */
  readonly parseError: string | null;

  /**
   * When the pipeline captured it, which is the page's first key.
   * Copied on the way in.
   */
  readonly capturedAt: Date;
}

/**
 * One planted `findings` row, as the findings half reads it.
 *
 * {@link FindingRecord} minus its `domainId`, which is the argument
 * {@link MemoryResearchStore.setDomainFindings} is planting under —
 * the same omission {@link MemorySourceDocument} makes of its
 * `sourceId`, and for the same reason: a member repeating the key it
 * was planted beneath is a second authority for one fact, and a plant
 * naming a domain other than its key would leave every read here
 * deciding which of the two it meant.
 *
 * A PLANT RATHER THAN A WRITE, because `FindingStore` declares no
 * insert at all. Six of its seven methods read `findings` and the
 * seventh appends a LABEL, so a case wanting a finding to page, to
 * order, to filter or to judge has to be handed a seam — the
 * decision {@link MemoryResearchStore.setSourceDocuments} already
 * took for `documents`, one table over and for the same reason.
 *
 * EVERY COLUMN THE RECORD CARRIES IS HERE, INCLUDING `score` AND
 * `scoreVersion`, and that is not a way in for a writer. Nothing on
 * the port accepts either — `src/findings/store.ts` says so of its
 * whole write surface — so the only thing that can set a score is a
 * case saying what state it is asking about, which is what a fixture
 * is for.
 */
export interface MemoryDomainFinding {
  /** `findings.id`, and the last key of both orderings. */
  readonly id: number;

  /** The document this was read out of. */
  readonly documentId: number;

  /**
   * The entity it is about, or null when it is about nobody in
   * particular. The null is the state
   * {@link FindingStore.listFindingResearch} answers an empty list
   * for, and it is ordinary rather than exceptional.
   */
  readonly entityId: number | null;

  /**
   * What the pass extracted. The category filter reads the one
   * member of this payload named below and nothing else, no column
   * linking a finding to a category at all.
   */
  readonly fields: Record<string, unknown>;

  /**
   * What scoring made of it, or null while nothing has. Null is the
   * TAIL of the score ordering rather than its floor, which is the
   * one thing about that order a fixture has to be able to state.
   */
  readonly score: number | null;

  /** Which scoring pass that was, or null beside a null score. */
  readonly scoreVersion: number | null;

  /**
   * When it was made: the window's subject and the second key of
   * both orderings. Copied on the way in, so a caller that goes on
   * moving the `Date` it planted does not move a stored one.
   */
  readonly createdAt: Date;
}

/**
 * One planted `finding_sightings` row, as the findings half reads
 * it.
 *
 * {@link FindingSightingRecord} minus its `findingId`, which is the
 * argument {@link MemoryResearchStore.setFindingSightings} is
 * planting under, on the reasoning {@link MemoryDomainFinding}
 * gives.
 *
 * ROWS HERE AND A NUMBER AT
 * {@link MemoryResearchStore.setSourceSightings}, OVER ONE TABLE.
 * That is the shape difference this file already draws between
 * {@link MemoryResearchStore.setDomainDependents} and
 * {@link MemoryResearchStore.setSourceDocuments}, and it lands on
 * `finding_sightings` because the two ports ask about it
 * differently: `SourceStore.countSourceDependents` can only be asked
 * HOW MANY cite a source, while
 * {@link FindingStore.listFindingSightings} answers the rows. A
 * planted row therefore does NOT move that count, which is a known
 * divergence rather than an oversight and is stated at both seams.
 */
export interface MemoryFindingSighting {
  /** `finding_sightings.id`, and the tiebreak on the read's order. */
  readonly id: number;

  /**
   * The feed it was seen at. Carried because
   * {@link FindingSightingRecord} carries it: the sightings table IS
   * the provenance record, and a projection dropping the feed would
   * leave the rows saying only that something was seen.
   */
  readonly sourceId: number;

  /** What the feed called it there, or null when it named nothing. */
  readonly externalId: string | null;

  /** When it was seen. Copied on the way in. */
  readonly seenAt: Date;
}

/**
 * One planted `entity_research` row, as the findings half reads it.
 *
 * {@link FindingResearchRecord} minus its `entityId`, which is the
 * argument {@link MemoryResearchStore.setEntityResearch} is planting
 * under, on the reasoning {@link MemoryDomainFinding} gives.
 *
 * PLANTED BY ENTITY AND READ BY FINDING, which is the one seam here
 * whose key is not the key it is read back through.
 * {@link FindingStore.listFindingResearch} takes a finding, reads
 * its `entityId` and answers what was planted under that — so a
 * case has to attribute a finding before any of this is reachable,
 * and a finding attributed to nothing reaches none of it whatever
 * was planted.
 *
 * NOTHING ON THIS PORT WRITES ONE. `src/findings/store.ts` states
 * that `entity_research` is `ar-research`'s to write and that the
 * embedding is read-only structurally rather than by convention,
 * which is exactly why a seam is what supplies these rows.
 */
export interface MemoryEntityResearch {
  /** `entity_research.id`, and the tiebreak on the read's order. */
  readonly id: number;

  /** The pass that recorded it, or null when none is named. */
  readonly runId: number | null;

  /** What it came to in prose, or null when nothing was written. */
  readonly summary: string | null;

  /**
   * The structured findings of the pass. `unknown` rather than a
   * record, exactly as {@link FindingResearchRecord} declares it:
   * the column carries no `$type`, so what a pass records is that
   * pass's business.
   */
  readonly payload: unknown;

  /** When the research was recorded. Copied on the way in. */
  readonly researchedAt: Date;
}

/**
 * One planted `entities` row, as the entities half reads it.
 *
 * {@link EntityRecord} minus its `domainId`, which is the argument
 * {@link MemoryResearchStore.setDomainEntities} is planting under, on
 * the reasoning {@link MemoryDomainFinding} gives.
 *
 * PLANTED AND THEN WRITTEN, which is a shape no other planted row
 * here has. `FindingStore` reads what it is given and appends to a
 * different table; {@link EntityStore.updateEntity} rewrites THIS
 * row, so a case plants the registry and then edits it through the
 * port. What no method can do is add one or remove one, `EntityStore`
 * declaring neither an insert nor a delete — so the seam is the whole
 * of how a subject arrives and how it goes.
 *
 * NO STAMP, BECAUSE THE TABLE CARRIES NONE. `entities` has no
 * `created_at` and no `updated_at`, so this is the one planted shape
 * in this file with no `Date` to copy on the way in — the copy that
 * matters here is the `attributes` payload instead.
 */
export interface MemoryDomainEntity {
  /**
   * `entities.id`, and the key both writers take.
   *
   * The fixture's own rather than a sequence's, for the reason
   * {@link MemoryDomainFinding.id} is: nothing here inserts an
   * entity, so a case says which row it means and the store never
   * chooses.
   */
  readonly id: number;

  /** `entities.name`: the subject's name as a person reads it. */
  readonly name: string;

  /**
   * `entities.name_norm`: the same name reduced to the key the
   * registry matches on, and the half of the pair
   * `entities_domain_id_name_norm_unique` is declared over.
   *
   * Planted rather than computed, and that is the seam standing in
   * for a writer rather than a second definition of the reduction.
   * `normalizeEntityName` in `src/lib/entity-name-norm.ts` is the one
   * definition, `src/entities/service.ts` is where it is called, and
   * nothing below this line reduces a name at all — so a fixture
   * planting a key no spelling reduces to is a fixture saying so
   * rather than a store agreeing with it.
   */
  readonly nameNorm: string;

  /**
   * The subject this row turned out to be, or null when the row IS
   * its own subject.
   *
   * A self-alias and an alias into another domain are both plantable
   * here, because both are storable in the database: the two rules
   * that refuse them are `src/entities/service.ts`'s and are held
   * above this port.
   */
  readonly aliasOf: number | null;

  /**
   * Whatever the domain records about the subject beyond its name.
   *
   * `unknown` for the reason {@link EntityRecord.attributes} is, and
   * copied on the way in and on the way out for the reason every
   * `jsonb` payload here is: a caller writing through the object it
   * planted would be writing into stored state.
   */
  readonly attributes: unknown;
}

/**
 * One planted `research_pool` row: an intention queued at the gate.
 *
 * {@link ResearchPoolRecord} WHOLE rather than a member short, which
 * is what separates this shape from every other planted row here.
 * The domain is the seam's key and that record carries no `domainId`
 * to drop, so there is nothing to omit — and every remaining member
 * has to be plantable, the two stamps included, because the state
 * `research_pool_approval_check` refuses is a pair of them and a case
 * about that check has to be able to propose it.
 *
 * ITS `status` IS THE UNION WHERE THE RECORD'S IS `string`, which is
 * how `research_pool_status_check` is held here:
 * {@link MemoryDomainDocument.parseStatus} holds its own table's
 * CHECK the same way, and a plant outside `RESEARCH_POOL_STATUSES`
 * does not compile rather than being refused at run time. The record
 * widens it back, because that is what a SELECT answers.
 *
 * PLANTED AND THEN WRITTEN, as {@link MemoryDomainEntity} is:
 * {@link EntityStore.approvePoolRow} rewrites the status and the
 * approval stamp of a row this seam supplied.
 */
export interface MemoryResearchPoolRow {
  /** `research_pool.id`: the id an approval names and the tiebreak. */
  readonly id: number;

  /**
   * The subject this intention is about, or null when it names none.
   *
   * The null is an ordinary state and it is one a case has to be able
   * to plant: a row naming no subject appears in NO subject's page,
   * and it still goes with its domain, which is the pair of claims
   * that separates the pool's cascade from the registry's.
   */
  readonly entityId: number | null;

  /** The finding that raised it, or null when nothing did. */
  readonly findingId: number | null;

  /** Where the row stands at the gate. See the interface TSDoc. */
  readonly status: ResearchPoolStatus;

  /** The exact terms the search would be issued with. */
  readonly searchTerms: readonly string[];

  /**
   * When the intention was raised: the queue's first key, ascending,
   * with {@link MemoryResearchPoolRow.id} breaking the tie `now()`
   * makes inevitable. Copied on the way in.
   */
  readonly createdAt: Date;

  /**
   * When a person ruled in favour, or null while nobody has.
   *
   * Plantable so that a case can put a row on either side of the
   * idempotence: an approval already given is what the second ruling
   * has to keep. Copied on the way in.
   */
  readonly approvedAt: Date | null;

  /**
   * When the intention was closed, or null while it is open.
   *
   * The member `research_pool_approval_check` holds against the one
   * above it, and the reason this shape is refusable at all: an
   * instant here beside a null approval is the state the seam throws
   * over. Copied on the way in.
   */
  readonly researchedAt: Date | null;
}

/**
 * One planted `runs` row: the service's own account of one pass.
 *
 * {@link RunRecord} WHOLE with no member added and none dropped,
 * which is a shape only {@link MemoryResearchPoolRow} shares here.
 * Every other planted row above omits the column its seam keys on,
 * and this one has none to omit: `runs.domain_id` is NULLABLE, so a
 * domain-keyed seam would have no key at all for the maintenance
 * ticks, and {@link MemoryResearchStore.setRuns} is flat.
 *
 * ITS TWO SINGLE-COLUMN CHECKS ARE HELD BY THIS TYPE, exactly as
 * {@link MemoryDomainDocument.parseStatus} and
 * {@link MemoryResearchPoolRow.status} hold their own tables'.
 * `status` and `scheduledBy` are the unions where {@link RunRecord}
 * widens both back to `string`, so a plant outside `RUN_STATUSES`
 * or `RUN_SCHEDULERS` does not compile rather than being refused at
 * run time. Between them they are the whole of what `runs` would
 * refuse this half, which is why nothing in it throws.
 *
 * PLANTED AND NEVER WRITTEN, which is the shape
 * {@link MemoryDomainDocument} has and {@link MemoryDomainEntity}
 * does not. `RunStore` declares six reads and no writer at all, so
 * the seam is the whole of how a pass arrives and a domain delete is
 * the whole of how one goes.
 */
export interface MemoryRun {
  /**
   * `runs.id`: the address of `GET /runs/:id`, the key the ledger
   * hangs off, and the tiebreak on the page's order.
   *
   * The fixture's own rather than a sequence's, for the reason
   * {@link MemoryDomainFinding.id} gives: nothing here inserts a
   * run, so a case says which pass it means and the store never
   * chooses. There is no runs counter below and no id-burn fidelity
   * to owe.
   */
  readonly id: number;

  /**
   * Whose pass it was, or null for a tick that belongs to nobody.
   *
   * THE NULL IS AN ORDINARY STATE AND IT IS THE ONE A CASE MUST BE
   * ABLE TO PLANT. A maintenance or cross-domain pass names no
   * domain, it appears in the UNFILTERED page beside the rest, its
   * calls land in the null spend bucket, and no domain delete
   * reaches it — four claims that a domain-keyed seam could not
   * hold the subject of.
   */
  readonly domainId: number | null;

  /**
   * When the pass began: the page's first key, descending, with
   * {@link MemoryRun.id} breaking the tie `now()` makes inevitable.
   * Copied on the way in.
   */
  readonly startedAt: Date;

  /**
   * When it stopped, or null while it is still going. Copied on the
   * way in, and a null stays a null.
   */
  readonly finishedAt: Date | null;

  /**
   * What the pass came to. The union where {@link RunRecord.status}
   * is `string`, per the interface TSDoc.
   */
  readonly status: RunStatus;

  /**
   * What it did, as one number per thing counted.
   *
   * Copied one level shallower than a `jsonb` payload of unknown
   * depth, on the reasoning `topics.search_terms` is: the column
   * carries a `$type` of `Record<string, number>`, so there is a
   * declared depth to copy TO and a fresh object is the whole of it.
   */
  readonly counts: Record<string, number>;

  /**
   * What it could not do, as one entry per failure.
   *
   * `unknown` for the reason {@link RunRecord.errors} declares it so
   * — the column carries no `$type`, the entries sharing no shape —
   * and copied through the round trip every undeclared payload here
   * takes.
   */
  readonly errors: unknown;

  /**
   * What asked for the pass. The union where
   * {@link RunRecord.scheduledBy} is `string`.
   */
  readonly scheduledBy: RunScheduler;
}

/**
 * One planted `llm_calls` row: one model call the ledger recorded.
 *
 * {@link LlmCallRecord} PLUS the `run_id` that record omits, which
 * makes this the whole of the table and the only planted shape here
 * that is WIDER than the record its reads answer. The record drops
 * the column because the run is the PATH on `GET /runs/:id`; the
 * plant cannot, because the column is nullable and a call attributed
 * to no run has to be plantable.
 *
 * FLAT LIKE THE RUNS ABOVE AND FOR THE SAME REASON. A run-keyed seam
 * would have no key for the unattributed calls at all — the trap
 * {@link MemoryResearchStore.setSourceDocuments} meets over a
 * document that came through no feed — and those calls are exactly
 * what the summary's null bucket is claimed to hold.
 */
export interface MemoryLlmCall {
  /**
   * `llm_calls.id`, and the tiebreak on the ledger's order.
   *
   * The fixture's own, on {@link MemoryRun.id}'s terms.
   */
  readonly id: number;

  /**
   * The pass this call was made during, or null when none is named.
   *
   * A ROW CARRYING NULL IS IN NO LEDGER AND IN EVERY SUMMARY, which
   * is the pair of claims this member exists to make plantable.
   * {@link RunStore.listRunLedger} and
   * {@link RunStore.countRunLedger} are both addressed by a run id,
   * so neither can reach it; {@link RunStore.summariseSpend} covers
   * every row of the ledger in its window, so it lands in the null
   * bucket beside the calls of a domain-less tick.
   */
  readonly runId: number | null;

  /** Which step of the pass made the call. */
  readonly node: string;

  /** Which model was asked, or null when nothing recorded one. */
  readonly model: string | null;

  /**
   * How many characters the prompt ran to, or null when the call
   * recorded no magnitude at all.
   *
   * The null is what makes the summary's own null answerable: a
   * bucket whose calls all carry one is a sum, and a bucket where
   * none does is null rather than zero.
   */
  readonly promptChars: number | null;

  /**
   * The estimated tokens, or null on the terms above.
   *
   * Plantable INDEPENDENTLY of the characters beside it, which is
   * what lets a case say the two sums are taken separately: a call
   * measured on one axis and not the other is an ordinary row.
   */
  readonly estTokens: number | null;

  /**
   * When the call was made: the ledger's first key, descending, and
   * the column the spend window bounds and the day bucket truncates.
   * Copied on the way in.
   */
  readonly calledAt: Date;
}

/**
 * All twelve research ports over one dataset, plus the twelve seams
 * a case needs that no port declares.
 *
 * EVERY ONE OF THEM WHOLE rather than a `Pick` of it. The category
 * half stood behind a narrowed alias while the term methods were
 * unwritten, which was the honest statement of what existed rather
 * than a gap papered over with stubs; all twelve taxonomy methods,
 * all six persona ones, all seven topic ones, all nine source ones,
 * all seven connector ones, all seven subscription ones, both
 * settings ones, all seven finding ones, both document ones, all
 * eight entity ones and all six run ones are here now, so a caller
 * wanting any of the twelve ports entire can be handed this store.
 *
 * `TopicStore` was the first member from outside wave 1 and
 * `SourceStore` is the second, and both join this file rather than
 * standing on their own for the reason the paragraph above gives:
 * `topics.domain_id` and `sources.domain_id` both cascade, so a
 * domain deleted through `DomainStore` has to take its topics and
 * its sources with it, and only shared state makes that true.
 *
 * `ConnectorStore` is the third and joins for the OTHER reason,
 * which is `SettingsStore`'s. `connectors` hangs off no domain, so
 * no cascade reaches it and nothing here forces it into the shared
 * dataset — what does is the composed store `src/index.ts` builds
 * and the surface that reads across the two: an export subscription
 * pairs a domain with a connector, so the delete this port guards is
 * refused by rows the half below it writes.
 *
 * `SubscriptionStore` IS THE FOURTH AND IS THE ONE THAT NEEDS BOTH
 * REASONS AT ONCE, which is why it was the last of wave 2's four
 * and why it could not have stood on its own at all.
 * `export_subscriptions.domain_id` cascades, so a domain deleted
 * through `DomainStore` has to take its subscriptions with it — the
 * topics and sources argument — and
 * `export_subscriptions.connector_id` names a `connectors` row, so a
 * write here has to be able to ask whether that row is there — the
 * connectors argument, read from the writing end. A subscriptions
 * fake standing alone could answer neither question, and two fakes
 * would agree with each other until a case deleted something.
 *
 * `FindingStore` IS THE FIFTH AND NEEDS THE FIRST REASON ALONE,
 * which is the topics-and-sources argument reaching two levels
 * further than it has before. `findings.domain_id` cascades, so a
 * domain deleted through `DomainStore` has to take its findings —
 * and `finding_sightings.finding_id` and `finding_labels.finding_id`
 * cascade onto those, so it has to take their sightings and their
 * rulings too. A findings fake standing alone could not be asked
 * about a domain at all, and one sharing no state with the sources
 * half could not say why a sighting planted through this port is
 * invisible to `SourceStore.countSourceDependents`.
 *
 * `DocumentStore` IS THE SIXTH AND NEEDS THE FIRST REASON ALONE AS
 * WELL, on the shallowest reading of it any half here has.
 * `documents.domain_id` cascades, so a domain deleted through
 * `DomainStore` has to take its corpus, and nothing hangs off a
 * document that this store can plant. What it could not do standing
 * alone is the OTHER thing: `SourceStore` reads the same table two
 * ways, so only a shared dataset can say why a row planted for the
 * corpus page answers no failures queue and holds no source's
 * delete.
 *
 * `EntityStore` IS THE SEVENTH AND NEEDS THE FIRST REASON REACHING
 * ITS FURTHEST YET. `entities.domain_id` cascades, so a domain
 * deleted through `DomainStore` has to take its registry; the
 * research hanging off those entities cascades onto them; and
 * `research_pool.domain_id` cascades directly, so the intentions go
 * too whether or not they name a subject. It also reads a table
 * ANOTHER half plants — `entity_research`, keyed by the subject — so
 * an entities fake standing alone could not be handed the rows the
 * findings half already supplies, and two fakes over that table
 * would agree with each other until a case deleted a domain.
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
  SourceStore,
  ConnectorStore,
  SubscriptionStore,
  FindingStore,
  DocumentStore,
  EntityStore,
  RunStore {
  /**
   * Plants what a domain has ACCUMULATED, for the delete guard to
   * read back through {@link DomainStore.countDomainDependents}.
   *
   * NOTHING HERE WRITES `findings`, AND A SEAM NOW PLANTS THEM.
   * No port declares an insert for that table — `FindingStore`
   * reads it six ways and writes only a LABEL — so the state the
   * delete guard exists for was unreachable through the ports
   * themselves, and without this seam every count answered zero and
   * the guard was exercisable only against a real database. That
   * would put the one rule the spec argues hardest for in the half of
   * the suite that needs a container up.
   *
   * {@link MemoryResearchStore.setDomainFindings} DOES NOT MOVE THIS
   * COUNT, and that is the file's third known divergence rather than
   * a second authority. Rows planted there are what the findings
   * page, its total and the single lookup answer from; the number
   * planted HERE is what `countDomainDependents` answers, because
   * `src/domains/service.test.ts` and `src/domains/routes.test.ts`
   * reach that guard over a store holding no finding at all. The
   * paragraph below states the same decision for `topics` and
   * `sources`, and that seam's own TSDoc carries the rest.
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

  /**
   * Plants how many `export_subscriptions` rows name one connector,
   * for the delete guard to read back.
   *
   * A COUNT RATHER THAN ROWS, which is
   * {@link MemoryResearchStore.setSourceSightings}' shape taken for
   * that seam's own reason:
   * {@link ConnectorStore.countConnectorDependents} is the only
   * method on that port that can be asked about a subscription at
   * all — nothing lists one, nothing reads one by id — so a planted
   * row would carry a domain, a format and a due time no case could
   * read back, and would imitate a shape rather than a rule.
   *
   * THE NUMBER IS AUTHORITATIVE, AND STAYS SO NOW THAT THERE IS
   * SOMETHING TO COUNT — which is the question this TSDoc was left
   * owing and which it answers here.
   * {@link SubscriptionStore.insertSubscription} below writes real
   * `export_subscriptions` rows, so counting them was available; what
   * rules it out is that `src/connectors/service.test.ts` and
   * `src/connectors/routes.test.ts` reach this guard by PLANTING,
   * over a store holding no subscription at all, and a rule mixing a
   * planted number with a counted one answers neither. So this is
   * {@link MemoryResearchStore.setDomainDependents}' decision taken
   * for {@link MemoryResearchStore.setDomainDependents}' reason, and
   * it is a KNOWN DIVERGENCE rather than a simplification: a
   * subscription stored here does not hold its connector's delete,
   * where `src/connectors/db-store.ts` counts the rows and a
   * deployment refuses it. `tests/live/api-wave2.live.test.ts` is
   * where the counted answer is discharged, and one case in
   * `tests/helpers/memory-research-store.test.ts` pins the divergence
   * rather than leaving it to be discovered.
   *
   * @param connectorId - The connector the subscriptions name. Need
   *   not name a stored connector: the count is plantable ahead of
   *   the row, and the guard answers about an id rather than about a
   *   connector.
   * @param count - How many. A second call replaces the first, and
   *   zero is how a case takes a plant back.
   */
  setConnectorSubscriptions(connectorId: number, count: number): void;

  /**
   * Plants the `findings` rows one domain has made, for the six
   * reads over that table to answer from.
   *
   * NO PORT WRITES A `findings` ROW, and `src/findings/store.ts`
   * states the absence IS the read-first rule rather than an
   * omission: a handler cannot re-score a finding because there is
   * nothing on the port to call. That leaves the page, its count,
   * the single lookup and the three embedded reads with no reachable
   * state, so this seam supplies it — and it supplies ROWS rather
   * than numbers, because five of those six answer rows.
   *
   * THE COUNT IS COUNTED FROM WHAT WAS PLANTED, which is what keeps
   * one dataset behind the page and its `meta.total`. A case
   * planting four findings and asking for the second page of two
   * gets a page of two and a total of four without saying either.
   *
   * IT DOES NOT MOVE {@link DomainStore.countDomainDependents},
   * WHICH IS THIS FILE'S THIRD KNOWN DIVERGENCE and is
   * {@link MemoryResearchStore.setConnectorSubscriptions}' decision
   * taken again. That guard reads the number
   * {@link MemoryResearchStore.setDomainDependents} planted and
   * never these rows, because `src/domains/service.test.ts` and
   * `src/domains/routes.test.ts` reach it by PLANTING over a store
   * holding no finding at all, and a rule mixing a planted number
   * with a counted one answers neither. So a domain holding a
   * planted finding is offered a delete `src/domains/db-store.ts`
   * would refuse, one case here pins that rather than leaving it to
   * be discovered, and `tests/live/api-wave3.live.test.ts` is where
   * the counted answer is discharged.
   *
   * @param domainId - The domain that made them. Need not name a
   *   stored domain: the rows are plantable ahead of it, and every
   *   read below answers about an id rather than about a domain.
   * @param findings - What to record, WHOLE. A second call replaces
   *   the first rather than appending to it — the same whole-unit
   *   rule {@link MemoryResearchStore.setSourceDocuments} states,
   *   for the same reason: under an append there is no way to
   *   express a domain going back to none. Each row's `createdAt`
   *   and each `fields` payload is copied on the way in.
   */
  setDomainFindings(
    domainId: number,
    findings: readonly MemoryDomainFinding[],
  ): void;

  /**
   * Plants where one finding has been seen, for
   * {@link FindingStore.listFindingSightings} to answer from.
   *
   * ROWS RATHER THAN THE NUMBER
   * {@link MemoryResearchStore.setSourceSightings} PLANTS OVER THE
   * SAME TABLE, and {@link MemoryFindingSighting} carries why: the
   * two ports can ask different questions of `finding_sightings`, so
   * a shape answering one cannot answer the other. The consequence
   * is that a row planted here is invisible to
   * `SourceStore.countSourceDependents` and cannot hold a source's
   * delete, which is a known divergence stated at both seams and
   * pinned by a case.
   *
   * @param findingId - The finding the rows cite. Need not name a
   *   planted finding: the read answers about an id rather than
   *   about a finding, and an id nothing carries answers an empty
   *   list either way.
   * @param sightings - What to record, WHOLE. A second call replaces
   *   the first, on the terms
   *   {@link MemoryResearchStore.setDomainFindings} states, and each
   *   row's `seenAt` is copied on the way in.
   */
  setFindingSightings(
    findingId: number,
    sightings: readonly MemoryFindingSighting[],
  ): void;

  /**
   * Plants what research has recorded about one entity, for
   * {@link FindingStore.listFindingResearch} and for
   * {@link EntityStore.listEntityResearch} to answer from.
   *
   * ONE SEAM AND TWO READERS, which is why no entities seam over this
   * table exists. The entities half reads it by the KEY it is planted
   * under, and the findings half reaches the same rows through a
   * finding's own `entity_id` — so this is the one seam here whose
   * key differs from the id ONE of its reads takes, and
   * {@link MemoryEntityResearch} carries what that costs a case: a
   * finding has to be attributed before any planted research is
   * reachable through it.
   *
   * @param entityId - The subject the research is about. Need not
   *   name a planted entity: both readers answer about an id rather
   *   than about a row, so research is plantable ahead of the
   *   registry — which is also what leaves it standing when a domain
   *   delete removes entities it was never hung off.
   * @param research - What to record, WHOLE. A second call replaces
   *   the first, on the terms
   *   {@link MemoryResearchStore.setDomainFindings} states, and each
   *   row's `researchedAt` and `payload` is copied on the way in.
   */
  setEntityResearch(
    entityId: number,
    research: readonly MemoryEntityResearch[],
  ): void;

  /**
   * Plants the `documents` rows one domain holds, for the two reads
   * over that table to answer from.
   *
   * NO PORT WRITES A `documents` ROW, and `src/documents/store.ts`
   * states the absence IS the read-first rule rather than an
   * omission: a handler cannot offer to re-parse a failed capture
   * because there is nothing on the port to call. That leaves the
   * corpus page and its count with no reachable state, so this seam
   * supplies it — and it supplies ROWS rather than a number, because
   * one of the two answers rows and the other counts the same
   * predicate over them.
   *
   * IT IS NOT {@link MemoryResearchStore.setSourceDocuments}, AND
   * NEITHER SEES THE OTHER'S ROWS. That is this file's fifth known
   * divergence: the two ports read `documents` differently, so each
   * gets the seam its own readers can be driven through, and a row
   * planted here answers no parse-status aggregate, no failures
   * queue and no `documents` member of
   * {@link SourceStore.countSourceDependents}. One case pins each
   * face rather than leaving it to be discovered, and
   * `tests/live/api-wave3.live.test.ts` is where one table behind
   * both is discharged.
   *
   * @param domainId - The domain that holds them. Need not name a
   *   stored domain: the rows are plantable ahead of it, and both
   *   reads answer about an id rather than about a domain.
   * @param documents - What to record, WHOLE. A second call replaces
   *   the first rather than appending to it — the same whole-unit
   *   rule {@link MemoryResearchStore.setDomainFindings} states, for
   *   the same reason: under an append there is no way to express a
   *   domain going back to none. Each row's `capturedAt` is copied
   *   on the way in.
   */
  setDomainDocuments(
    domainId: number,
    documents: readonly MemoryDomainDocument[],
  ): void;

  /**
   * Plants the `entities` rows one domain's registry holds, for the
   * six reads and the registry write to work over.
   *
   * NO PORT INSERTS AN ENTITY AND NONE DELETES ONE, which
   * `src/entities/store.ts` states as the shape of its write surface
   * rather than as an omission: the two writers rewrite a subject and
   * stamp an intention, and neither adds a row. Nothing in the tree
   * writes an `entities` row at all today — no workflow inserts one
   * and `scripts/approve.ts` reads the registry through joins — so
   * this seam is not standing in for a writer the ports merely lack,
   * it is standing in for one the repository has yet to grow.
   *
   * IT PLANTS ROWS AND THEN A METHOD REWRITES THEM, which is where
   * this seam differs from every other one here.
   * {@link EntityStore.updateEntity} edits what was planted, so a
   * second call to this seam REPLACES what a patch has written as
   * readily as what a previous plant did.
   *
   * @param domainId - The domain whose registry these are. Need not
   *   name a stored domain: the rows are plantable ahead of it, and
   *   every read below answers about an id rather than about a
   *   domain.
   * @param entities - What to record, WHOLE. A second call replaces
   *   the first rather than appending to it — the same whole-unit
   *   rule {@link MemoryResearchStore.setDomainFindings} states, for
   *   the same reason: under an append there is no way to express a
   *   registry going back to none. Each row's `attributes` payload is
   *   copied on the way in.
   */
  setDomainEntities(
    domainId: number,
    entities: readonly MemoryDomainEntity[],
  ): void;

  /**
   * Plants the `research_pool` rows queued under one domain, for the
   * three reads and the approval to work over.
   *
   * KEYED BY THE DOMAIN AND NOT BY THE SUBJECT, which is the one
   * thing about this seam a reader would predict the other way round.
   * `research_pool.entity_id` is NULLABLE — an intention can be
   * raised from a finding whose subject nothing has attributed yet —
   * so a subject-keyed seam would have no key to plant those rows
   * under at all — exactly as
   * {@link MemoryResearchStore.setSourceDocuments} has none for a
   * document that came through no feed. The domain is also what the
   * cascade follows, `research_pool.domain_id` being the column that
   * carries it.
   *
   * IT IS THE ONE SEAM HERE THAT CAN REFUSE. Every row is held
   * against `research_pool_approval_check` before any is stored, so a
   * row carrying `researched_at` and no `approved_at` throws a
   * {@link StoreRefusal} and the batch lands nowhere. The module
   * header carries why the check has to be reached from here rather
   * than through a method, and why the refusal is over the WHOLE
   * batch.
   *
   * @param domainId - The domain the intentions were raised under.
   *   Need not name a stored domain, for the reason the seam above
   *   gives.
   * @param rows - What to record, WHOLE. A second call replaces the
   *   first rather than appending to it, on the terms
   *   {@link MemoryResearchStore.setDomainFindings} states. Each
   *   row's `createdAt`, `approvedAt` and `researchedAt` is copied on
   *   the way in, and so is its `searchTerms` list.
   * @throws A `check-violation` {@link StoreRefusal} naming
   *   `research_pool_approval_check` when any row states that it was
   *   closed without stating that it was approved. Nothing is stored
   *   when it does.
   */
  setDomainPool(
    domainId: number,
    rows: readonly MemoryResearchPoolRow[],
  ): void;

  /**
   * Plants the `runs` rows the service has made, for the page, the
   * single lookup and the spend summary's join to answer from.
   *
   * FLAT WHERE EVERY OTHER SEAM HERE IS KEYED, and that is
   * `runs.domain_id` being NULLABLE rather than a shape chosen for
   * convenience. Every keyed seam above plants under the column its
   * rows hang off; a domain-keyed seam here would have no key for the
   * maintenance and cross-domain ticks, which are precisely the rows
   * the unfiltered page and the null spend bucket are claimed to
   * hold. So the domain rides on {@link MemoryRun.domainId} and the
   * cascade reads it off the row — the trap
   * {@link MemoryResearchStore.setSourceDocuments} meets from the
   * other side, where a document with no `source_id` has no key on
   * that seam at all.
   *
   * NO PORT WRITES A RUN, AND THAT IS WHAT THIS STANDS IN FOR.
   * `RunStore` declares six reads and no seventh method, so there is
   * no insert to burn an id on and no update to move a status; a pass
   * is opened by `ar-dispatch` and this seam is the whole of how one
   * arrives here. `src/runs/store.ts` carries why the absence is the
   * read-only rule rather than an omission.
   *
   * @param rows - What to record, WHOLE. A second call replaces the
   *   first rather than appending to it — the same whole-unit rule
   *   {@link MemoryResearchStore.setDomainFindings} states, for the
   *   same reason: under an append there is no way to express a
   *   deployment going back to having run nothing. Each row's
   *   `startedAt` and `finishedAt` is copied on the way in, and so
   *   are its `counts` and `errors` payloads. A row may name a
   *   domain nothing stored: every read below answers about an id
   *   rather than about a domain, so a pass is plantable ahead of
   *   the row it hangs off.
   */
  setRuns(rows: readonly MemoryRun[]): void;

  /**
   * Plants the `llm_calls` rows the ledger holds, for the per-run
   * reads and the spend summary to answer from.
   *
   * FLAT FOR {@link MemoryResearchStore.setRuns}' REASON one table
   * down: `llm_calls.run_id` is nullable, so a run-keyed seam would
   * have no key for a call attributed to no pass, and that call is
   * one of the two kinds the null spend bucket is claimed to count.
   *
   * ONE SEAM AND THREE READERS, two of them addressed by a run id
   * and the third by nothing at all. A row carrying a null `runId` is
   * therefore in NO ledger and in EVERY summary, which is a state
   * only a flat plant can put this store in.
   *
   * @param rows - What to record, WHOLE, on the terms
   *   {@link MemoryResearchStore.setRuns} states. Each row's
   *   `calledAt` is copied on the way in. A row may name a run
   *   nothing stored: the summary reads a call's domain through
   *   whatever run it finds and answers the null bucket when it
   *   finds none, which is what a `LEFT JOIN` does and what the
   *   foreign key makes unreachable in a deployment.
   */
  setLlmCalls(rows: readonly MemoryLlmCall[]): void;
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

/**
 * The natural key on `connectors`, spelled as
 * `src/db/schema/sources.ts` spells it. The one key both connector
 * writes name: `name` is patchable per `ConnectorPatch`, so an
 * UPDATE reaches it as readily as an INSERT.
 */
const CONNECTOR_KEY_UNIQUE = 'connectors_kind_name_unique';

/**
 * The CHECK on `connectors.kind`, and the second CHECK this file
 * imitates.
 *
 * Unlike {@link SOURCE_KIND_CHECK} an INSERT alone reaches it:
 * `kind` is deliberately absent from `ConnectorPatch`, because a
 * connector's kind is read by rows and queries that are not this one
 * and neither could see the edit. So no update here is ever written
 * against this name.
 */
const CONNECTOR_KIND_CHECK = 'connectors_kind_check';

/**
 * The foreign key from `export_subscriptions.connector_id`, and the
 * ONE name a refused connector delete can carry.
 *
 * `ON DELETE no action`, so a connector an export subscription still
 * names holds its own delete. `src/db/schema/scheduling.ts` argues it
 * at the column: a domain going away takes its own configuration with
 * it, but a connector is shared, and retiring one service should not
 * quietly cancel deliveries in every domain that named it.
 *
 * Exactly one, re-derived from the generated SQL rather than taken
 * from a plan — the reading the sources half's plan got wrong by
 * one, where a sibling leg's migration had added a third refusing key
 * nobody had named. So unlike that half there is no key here left
 * unimitated, and no dataset this store can be in that a deployment
 * would refuse a delete over while this one takes it.
 */
const CONNECTOR_SUBSCRIPTIONS_FK
  = 'export_subscriptions_connector_id_connectors_id_fk';

/**
 * The natural key on `export_subscriptions`, spelled as
 * `src/db/schema/scheduling.ts` spells it, and the widest key in this
 * file: a triple rather than a pair.
 *
 * No PAIR of the three identifies a subscription — one domain may
 * want the same digest in two formats, and may want one format
 * delivered to two destinations — so a key over either pair would
 * refuse the second row. Both writes name it: `format` and
 * `connectorId` are patchable per `SubscriptionPatch`, so an UPDATE
 * reaches it as readily as an INSERT.
 */
const SUBSCRIPTION_KEY_UNIQUE
  = 'export_subscriptions_domain_id_format_connector_id_unique';

/**
 * The CHECK on `export_subscriptions.format`, and the third CHECK
 * this file imitates.
 *
 * {@link SOURCE_KIND_CHECK}'s shape rather than
 * {@link CONNECTOR_KIND_CHECK}'s: BOTH writes reach it, `format`
 * being patchable, because a format selects the renderer that runs
 * for THIS row and nothing outside the row reads it.
 */
const SUBSCRIPTION_FORMAT_CHECK = 'export_subscriptions_format_check';

/**
 * The foreign key from `export_subscriptions.domain_id`, reached by
 * the INSERT alone.
 *
 * `domainId` is deliberately absent from `SubscriptionPatch` — a
 * subscription is a request ABOUT the material its domain produces,
 * so a move would carry it to another domain's — which is what keeps
 * this name off the update, exactly as {@link TOPIC_DOMAIN_FK} is
 * kept off the topic patch.
 */
const SUBSCRIPTION_DOMAIN_FK
  = 'export_subscriptions_domain_id_domains_id_fk';

/**
 * The foreign key from `export_subscriptions.connector_id`, read from
 * the side that WRITES it rather than from the side it protects.
 *
 * One key and two directions. {@link CONNECTOR_SUBSCRIPTIONS_FK} is
 * this same constraint named for what it refuses on the other port —
 * a connector delete an export subscription holds — and the two are
 * spelled apart here because a reader meeting either one is asking a
 * different question. This end is the race
 * `src/subscriptions/store.ts` describes: the service resolves the
 * connector before writing, so an ordinary request hands the database
 * a live id, and what is left is the connector removed between that
 * read and this write. Both writes reach it, `connectorId` being
 * patchable.
 */
const SUBSCRIPTION_CONNECTOR_FK
  = 'export_subscriptions_connector_id_connectors_id_fk';

/**
 * The foreign key from `finding_labels.finding_id`, and the ONE
 * mechanism the findings half can reach.
 *
 * `ON DELETE cascade`, so it never holds a delete the way
 * {@link SOURCE_DOCUMENTS_FK} does — what it refuses is the WRITE,
 * a ruling appended onto a finding that is not there.
 * `src/findings/store.ts` calls that a race rather than the ordinary
 * path, the service having resolved the finding first, but a race a
 * deployment can lose is a state this store can be put in directly.
 *
 * It is the half's whole refusal surface. `findings`,
 * `finding_sightings` and `entity_research` are all PLANTED here
 * rather than written, so no key onto any of them is reachable
 * through a method. `research_pool_finding_id_findings_id_fk` — the
 * one `ON DELETE no action` key onto `findings.id` — is left
 * unimitated for a reason that has since narrowed: the entities half
 * plants pool rows, so a row citing a finding is reachable, and what
 * keeps the key from firing is the CASCADE rather than the absence
 * of a row. Only a citation crossing two domains would reach it, and
 * the module header carries that as the sixth known divergence.
 */
const FINDING_LABEL_FINDING_FK = 'finding_labels_finding_id_findings_id_fk';

/**
 * The member of a finding's `fields` payload naming the category it
 * is filed under.
 *
 * A SECOND DECLARATION OF ONE NAME, and saying so is the honest
 * reading rather than a gap to close here: `ar-digest`'s assembly
 * node declares `FINDING_CATEGORY_FIELD` for the same string, and
 * nothing in the tree exports either. `src/findings/store.ts` names
 * that constant as the authority and this file imitates the column
 * read rather than the digest's own reduction of it, which is the
 * one place the two are stated to part.
 */
const FINDING_CATEGORY_FIELD = 'category';

/**
 * The natural key on `entities`, spelled as
 * `src/db/schema/entities.ts` spells it.
 *
 * Over the PAIR rather than over the name alone, so two domains are
 * free to track unrelated subjects under one key and only a rename
 * inside a domain can collide. The registry write is the one call
 * that reaches it: nothing here inserts an entity.
 */
const ENTITY_NAME_NORM_UNIQUE = 'entities_domain_id_name_norm_unique';

/**
 * The self-referencing foreign key on `entities.alias_of`.
 *
 * Unlike {@link CATEGORY_PARENT_FK}, which sits on the same kind of
 * column, this name stands for ONE rule here: the refusal of a WRITE
 * naming an id no entity carries. The other rule that name carries in
 * a deployment — a subject aliases still point at holding its own
 * delete — is unreachable, `EntityStore` declaring no delete at all.
 */
const ENTITY_ALIAS_FK = 'entities_alias_of_entities_id_fk';

/**
 * The CHECK on `research_pool` holding its two stamps against each
 * other, and the fourth CHECK this file imitates.
 *
 * The only one reached from a SEAM rather than from a method, and the
 * module header carries why: the approval write moves `approved_at`
 * from null to an instant and nothing on the port writes
 * `researched_at`, so no call can propose the state this refuses.
 */
const POOL_APPROVAL_CHECK = 'research_pool_approval_check';

/**
 * The status {@link EntityStore.approvePoolRow} writes.
 *
 * Annotated against {@link ResearchPoolStatus} rather than left a
 * bare literal, for the reason `APPROVED_STATUS` in
 * `scripts/approve.ts` records: the member belongs to
 * `RESEARCH_POOL_STATUSES`, the tuple `research_pool_status_check` is
 * generated from, so renaming it there fails this file's compile
 * instead of leaving a fake that writes a status the database would
 * refuse.
 */
const POOL_APPROVED_STATUS: ResearchPoolStatus = 'approved';

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
 * `sources.parser_config`, `sources.contract` and
 * `connectors.config` carry no `$type`: what a parser config or a
 * client's address holds differs by `kind`, so there is no depth a
 * spread could be written to instead. Every value this store puts
 * through it arrived as a `Readonly<Record<string, unknown>>` from
 * {@link InsertSourceInput}, {@link SourcePatch},
 * {@link InsertConnectorInput} or {@link ConnectorPatch}, which is
 * what makes the round trip total — a value `JSON.stringify`
 * answers `undefined` for could not have got here.
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
 * A planted corpus document whose `Date` belongs to nobody else.
 *
 * Used on the way IN, where the seam is handed a row a case built,
 * and again on the way out through {@link documentOf}.
 * {@link copyPlantedDocument} is the same shape one seam over, and
 * the two are separate for the reason their plants are:
 * `MemoryDomainDocument` carries a column `MemorySourceDocument`
 * does not, so one function serving both would have to widen the
 * narrower shape.
 *
 * @param row - The document to copy.
 * @returns A copy sharing no object with it.
 */
function copyPlantedCorpusDocument(
  row: MemoryDomainDocument,
): MemoryDomainDocument {
  return { ...row, capturedAt: copyInstant(row.capturedAt) };
}

/**
 * The corpus page's projection of one planted document.
 *
 * EVERY MEMBER, unlike {@link failureOf} beside it: the record and
 * the plant carry the same seven columns, so this is a copy with a
 * fresh `Date` rather than a narrowing. What makes it a projection
 * anyway is the table — `documents` carries `raw`, `features`,
 * `feature_version`, `embedding`, `embedding_model`, `hash` and
 * `domain_id` too, and neither shape here has ever held them.
 *
 * @param row - The stored document.
 * @returns The seven members {@link DocumentRecord} declares, its
 *   `capturedAt` copied.
 */
function documentOf(row: MemoryDomainDocument): DocumentRecord {
  return {
    id: row.id,
    sourceId: row.sourceId,
    url: row.url,
    body: row.body,
    parseStatus: row.parseStatus,
    parseError: row.parseError,
    capturedAt: copyInstant(row.capturedAt),
  };
}

/**
 * A connector record whose config belongs to nobody else.
 *
 * ONE MEMBER rather than {@link copySource}'s four:
 * `ConnectorRecord` carries a single `jsonb` document and no `Date`
 * at all, `connectors` declaring neither of the stamps `domains`
 * carries nor the due time `topics` does. So this is
 * {@link copyCategory}'s shallow shape with one member added rather
 * than a narrowing of {@link copySource}.
 *
 * It is also the one copy in this file standing between a caller and
 * a value the schema DECLARES to be a credential — `config` in
 * `src/db/schema/sources.ts` says whatever authenticates the call is
 * held there. `src/connectors/store.ts` answers the config AS
 * STORED — masking is `src/connectors/service.ts`'s, one layer up
 * — so what this rules out is a caller writing into a stored secret
 * through a member the port declares `readonly`, and a caller that
 * kept an answered row going on reading one this store has since
 * replaced.
 *
 * @param row - The stored row.
 * @returns A copy safe to hand across the port.
 */
function copyConnector(row: ConnectorRecord): ConnectorRecord {
  return { ...row, config: copyJsonDocument(row.config) };
}

/**
 * A subscription record whose due time belongs to nobody else.
 *
 * {@link copyTopic}'s shape with the list taken out:
 * `SubscriptionRecord` carries one mutable member and it is the same
 * one — a `Date` that is null on a subscription nobody has scheduled
 * — because `export_subscriptions` and `topics` spread the same
 * `schedulableColumns()` helper. Its `format` and its two ids are
 * primitives, and the table carries neither of the stamps `domains`
 * does nor a `jsonb` column at all, so the spread is the whole of the
 * rest.
 *
 * @param row - The stored row.
 * @returns A copy safe to hand across the port.
 */
function copySubscription(row: SubscriptionRecord): SubscriptionRecord {
  return {
    ...row,
    nextRunAt: row.nextRunAt === null
      ? null
      : copyInstant(row.nextRunAt),
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
 * A `fields` payload sharing no object with the one handed in.
 *
 * A JSON round trip for the reason {@link copySettings} gives, and a
 * function of its own rather than a widening of
 * {@link copyJsonDocument} because the shape is DECLARED here:
 * `findings.fields` carries `$type<Record<string, unknown>>()`, so
 * what crosses the port is a record rather than the `unknown` a
 * parser config is. The round trip is also what a `jsonb` column
 * does in each direction, which is the behaviour being imitated
 * rather than merely a deep copy — and it is what keeps a key
 * spelling `__proto__` an OWN member on the way out, `JSON.parse`
 * making one where an object literal could not.
 *
 * @param fields - The payload to copy.
 * @returns An equal payload sharing nothing with it.
 */
function copyFields(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  return JSON.parse(JSON.stringify(fields)) as Record<string, unknown>;
}

/**
 * A planted finding whose mutable members belong to nobody else.
 *
 * Used on the way IN, where the seam is handed a row a case built,
 * and its two mutable members are the `jsonb` payload and the stamp.
 * `createdAt` is never null, unlike a source's two, so there is no
 * branch.
 *
 * @param row - The finding to copy.
 * @returns A copy sharing no object with it.
 */
function copyPlantedFinding(
  row: MemoryDomainFinding,
): MemoryDomainFinding {
  return {
    ...row,
    fields: copyFields(row.fields),
    createdAt: copyInstant(row.createdAt),
  };
}

/**
 * A planted sighting whose `Date` belongs to nobody else.
 *
 * {@link copyPlantedDocument}'s shape: one stamp and nothing one
 * level down, `external_id` being text and `source_id` a number.
 *
 * @param row - The sighting to copy.
 * @returns A copy sharing no object with it.
 */
function copyPlantedSighting(
  row: MemoryFindingSighting,
): MemoryFindingSighting {
  return { ...row, seenAt: copyInstant(row.seenAt) };
}

/**
 * A planted research row whose mutable members belong to nobody
 * else.
 *
 * {@link copyPlantedFinding}'s shape with {@link copyJsonDocument}
 * standing where {@link copyFields} does, for the reason
 * {@link MemoryEntityResearch} gives: `entity_research.payload`
 * carries no `$type`, so there is no declared depth a spread could
 * be written to instead.
 *
 * @param row - The research to copy.
 * @returns A copy sharing no object with it.
 */
function copyPlantedResearch(
  row: MemoryEntityResearch,
): MemoryEntityResearch {
  return {
    ...row,
    payload: copyJsonDocument(row.payload),
    researchedAt: copyInstant(row.researchedAt),
  };
}

/**
 * A label record whose `Date` belongs to nobody else.
 *
 * The one record in this half that a METHOD writes rather than a
 * seam plants, so this copy runs in both directions: over the row
 * the append answers and over every row the sequence read answers.
 *
 * @param row - The stored row.
 * @returns A copy safe to hand across the port.
 */
function copyFindingLabel(row: FindingLabelRecord): FindingLabelRecord {
  return { ...row, labelledAt: copyInstant(row.labelledAt) };
}

/**
 * The port's projection of one planted finding.
 *
 * The domain arrives as the KEY the row was planted under rather
 * than off the row, which is what {@link MemoryDomainFinding} omits
 * it for.
 *
 * @param domainId - The domain the row was planted under.
 * @param row - The stored finding.
 * @returns The eight members {@link FindingRecord} declares, its
 *   payload and its stamp copied.
 */
function findingOf(
  domainId: number,
  row: MemoryDomainFinding,
): FindingRecord {
  return {
    id: row.id,
    domainId,
    documentId: row.documentId,
    entityId: row.entityId,
    fields: copyFields(row.fields),
    score: row.score,
    scoreVersion: row.scoreVersion,
    createdAt: copyInstant(row.createdAt),
  };
}

/**
 * The port's projection of one planted sighting.
 *
 * @param findingId - The finding the row was planted under.
 * @param row - The stored sighting.
 * @returns The five members {@link FindingSightingRecord} declares,
 *   its stamp copied.
 */
function sightingOf(
  findingId: number,
  row: MemoryFindingSighting,
): FindingSightingRecord {
  return {
    id: row.id,
    findingId,
    sourceId: row.sourceId,
    externalId: row.externalId,
    seenAt: copyInstant(row.seenAt),
  };
}

/**
 * The port's projection of one planted research row.
 *
 * @param entityId - The entity the row was planted under.
 * @param row - The stored research.
 * @returns The six members {@link FindingResearchRecord} declares,
 *   its payload and its stamp copied.
 */
function researchOf(
  entityId: number,
  row: MemoryEntityResearch,
): FindingResearchRecord {
  return {
    id: row.id,
    entityId,
    runId: row.runId,
    summary: row.summary,
    payload: copyJsonDocument(row.payload),
    researchedAt: copyInstant(row.researchedAt),
  };
}

/**
 * A planted entity whose `attributes` payload belongs to nobody
 * else.
 *
 * One member rather than {@link copyPlantedFinding}'s two, and no
 * stamp at all: `entities` carries neither `created_at` nor
 * `updated_at`, so the payload is the whole of what a caller could
 * otherwise write through.
 *
 * @param row - The row a seam or a patch is storing.
 * @returns A copy safe to store.
 */
function copyPlantedEntity(row: MemoryDomainEntity): MemoryDomainEntity {
  return { ...row, attributes: copyJsonDocument(row.attributes) };
}

/**
 * The port's projection of one planted entity.
 *
 * The domain arrives as the KEY the row was planted under rather than
 * off the row, which is what {@link MemoryDomainEntity} omits it for
 * — and it is on the ANSWER because `PATCH /entities/:id` carries no
 * slug, so this member is the only thing that says whose registry was
 * edited.
 *
 * @param domainId - The domain the row was planted under.
 * @param row - The stored entity.
 * @returns The five members {@link EntityRecord} declares beyond its
 *   key, its payload copied.
 */
function entityOf(domainId: number, row: MemoryDomainEntity): EntityRecord {
  return {
    id: row.id,
    domainId,
    name: row.name,
    nameNorm: row.nameNorm,
    aliasOf: row.aliasOf,
    attributes: copyJsonDocument(row.attributes),
  };
}

/**
 * A planted pool row whose three stamps and whose term list belong to
 * nobody else.
 *
 * FOUR MEMBERS, THE WIDEST COPY IN THIS FILE. Two of the stamps are
 * nullable and a null stays a null, which matters more here than
 * anywhere above: the pair of them IS the state
 * {@link POOL_APPROVAL_CHECK} reads, so a copy turning either into
 * something else would move the row across the rule. `searchTerms` is
 * a list of strings and is copied one level, on the terms
 * `topics.search_terms` is: there is nothing below it.
 *
 * @param row - The row a seam or an approval is storing.
 * @returns A copy safe to store.
 */
function copyPlantedPoolRow(
  row: MemoryResearchPoolRow,
): MemoryResearchPoolRow {
  return {
    ...row,
    searchTerms: [...row.searchTerms],
    createdAt: copyInstant(row.createdAt),
    approvedAt: row.approvedAt === null
      ? null
      : copyInstant(row.approvedAt),
    researchedAt: row.researchedAt === null
      ? null
      : copyInstant(row.researchedAt),
  };
}

/**
 * The port's projection of one planted pool row.
 *
 * WHOLE RATHER THAN NARROWED, {@link ResearchPoolRecord} carrying no
 * `domainId` for this to drop — so the projection is a copy plus the
 * widening of `status` back to the `string` a SELECT answers.
 *
 * @param row - The stored intention.
 * @returns A copy safe to hand across the port.
 */
function poolRowOf(row: MemoryResearchPoolRow): ResearchPoolRecord {
  return copyPlantedPoolRow(row);
}

/**
 * The entities half's projection of one planted research row.
 *
 * `entityId` IS DROPPED, WHERE {@link researchOf} ANSWERS IT. Two
 * ports read `entity_research` and each takes the same rule from a
 * different end: the entity is the PATH on
 * `GET /entities/:id/research`, so answering it back would echo the
 * request, while a caller of `listFindingResearch` named a finding
 * and the entity is what the port resolved.
 *
 * @param row - The stored research.
 * @returns The five members {@link EntityResearchRecord} declares,
 *   its payload and its stamp copied.
 */
function entityResearchOf(row: MemoryEntityResearch): EntityResearchRecord {
  return {
    id: row.id,
    runId: row.runId,
    summary: row.summary,
    payload: copyJsonDocument(row.payload),
    researchedAt: copyInstant(row.researchedAt),
  };
}

/**
 * A planted run whose mutable members belong to nobody else.
 *
 * FOUR MEMBERS, WHICH IS THE WIDEST COPY IN THIS FILE: two stamps
 * and two `jsonb` payloads, where {@link copySource} takes four over
 * two stamps and two documents and {@link copyPlantedFinding} takes
 * two. `finishedAt` is nullable and `startedAt` is not, which is the
 * branch a source's two nullable stamps also carry.
 *
 * THE TWO PAYLOADS ARE COPIED TO DIFFERENT DEPTHS, and that is each
 * column's own declaration rather than an inconsistency. `counts`
 * carries a `$type` of `Record<string, number>`, so a fresh object
 * is the whole of it — `topics.search_terms`' argument for a list of
 * strings — while `errors` carries no `$type` at all and takes the
 * round trip every undeclared payload here takes.
 *
 * @param row - The run to copy.
 * @returns A copy sharing no object with it.
 */
function copyPlantedRun(row: MemoryRun): MemoryRun {
  return {
    ...row,
    startedAt: copyInstant(row.startedAt),
    finishedAt: row.finishedAt === null
      ? null
      : copyInstant(row.finishedAt),
    counts: { ...row.counts },
    errors: copyJsonDocument(row.errors),
  };
}

/**
 * A planted model call whose `Date` belongs to nobody else.
 *
 * {@link copyPlantedSighting}'s shape: one stamp and nothing one
 * level down, both magnitudes being numbers and both text members
 * strings.
 *
 * @param row - The call to copy.
 * @returns A copy sharing no object with it.
 */
function copyPlantedLlmCall(row: MemoryLlmCall): MemoryLlmCall {
  return { ...row, calledAt: copyInstant(row.calledAt) };
}

/**
 * The runs page's projection of one planted pass.
 *
 * EVERY MEMBER, like {@link documentOf} and unlike {@link failureOf}:
 * {@link RunRecord} is the whole row, so this is a copy with fresh
 * mutable members rather than a narrowing. What keeps it a
 * projection anyway is that the two CHECK-bearing members widen —
 * the record answers the `string` a SELECT gives where the plant
 * carries a union.
 *
 * @param row - The stored run.
 * @returns The eight members {@link RunRecord} declares, its stamps
 *   and both payloads copied.
 */
function runOf(row: MemoryRun): RunRecord {
  return {
    id: row.id,
    domainId: row.domainId,
    startedAt: copyInstant(row.startedAt),
    finishedAt: row.finishedAt === null
      ? null
      : copyInstant(row.finishedAt),
    status: row.status,
    counts: { ...row.counts },
    errors: copyJsonDocument(row.errors),
    scheduledBy: row.scheduledBy,
  };
}

/**
 * The ledger's projection of one planted model call.
 *
 * ONE MEMBER SHORT, which is the shape {@link sightingOf} and
 * {@link entityResearchOf} have for the opposite reason. Those two
 * are handed the omitted key and put it BACK; this one DROPS
 * `run_id`, because {@link RunStore.listRunLedger} is addressed by
 * the run and a caller reading a run's ledger already holds it.
 *
 * @param row - The stored call.
 * @returns The six members {@link LlmCallRecord} declares, its stamp
 *   copied.
 */
function llmCallOf(row: MemoryLlmCall): LlmCallRecord {
  return {
    id: row.id,
    node: row.node,
    model: row.model,
    promptChars: row.promptChars,
    estTokens: row.estTokens,
    calledAt: copyInstant(row.calledAt),
  };
}

/**
 * Adds one call's magnitude into a bucket's running sum.
 *
 * NULL PLUS A NUMBER IS THAT NUMBER AND NULL PLUS NULL IS NULL,
 * which is `sum()` over a nullable column written out: Postgres skips
 * the nulls and answers null for a group in which every row was
 * null. That is the behaviour {@link SpendBucket.promptChars}
 * requires and the one a store coalescing to zero would lose — zero
 * is a real reading, so a day of calls that sent nothing would become
 * indistinguishable from a day nobody measured.
 *
 * @param carried - The sum so far, or null while no call on this axis
 *   has recorded anything.
 * @param added - This call's reading, or null when it recorded none.
 * @returns The new sum, still null when both were.
 */
function addMagnitude(
  carried: number | null,
  added: number | null,
): number | null {
  if (added === null) {
    return carried;
  }

  return (carried ?? 0) + added;
}

/**
 * The instant that opens the UTC day one call falls on.
 *
 * `date_trunc('day', called_at AT TIME ZONE 'UTC')` written out, and
 * UTC EXPLICITLY rather than by inheriting a zone. `Date.UTC` over
 * the three UTC parts reads no local offset at all, where
 * `setHours(0, 0, 0, 0)` would truncate in whatever zone the process
 * happens to run in — the same silent per-deployment difference
 * `SpendBucket.day` says a session's `TimeZone` setting would make.
 *
 * @param at - When the call was made.
 * @returns Midnight UTC of that day, as the bucket's own key.
 */
function utcDayOf(at: Date): Date {
  return new Date(Date.UTC(
    at.getUTCFullYear(),
    at.getUTCMonth(),
    at.getUTCDate(),
  ));
}

/**
 * The text `fields->>'category'` answers over one payload.
 *
 * THE COLUMN READ RATHER THAN THE DIGEST'S, which is the one place
 * `src/findings/store.ts` says the two filings could part. Read by
 * OWN key alone: the payload came out of a column rather than out of
 * this file, so it carries a prototype, and an inherited member
 * standing in for one nobody wrote would file a finding under a
 * section on the strength of nothing.
 *
 * `->>` ANSWERS TEXT AND NOT A STRING MEMBER, which is why a
 * non-string value is stringified rather than dropped: Postgres
 * answers `5` for a numeric member and `true` for a boolean one, and
 * a store matching strings alone would answer an empty page where a
 * deployment answers a row. The honest limit is a COMPOSITE member,
 * where jsonb normalises key order and whitespace and this does not,
 * so the two spellings are not claimed to agree — no case rests on
 * one, and a category key is text in every state a domain can
 * declare.
 *
 * THE OWN-KEY READ IS AN HONEST ZERO HERE, and saying so is better
 * than letting it read as a rule this file pins. A payload reaching
 * this function came through {@link copyFields}, whose round trip
 * keeps own members and drops everything else — which is what a
 * `jsonb` column does too — so there is no inherited member left
 * to guard against and no key on `Object.prototype` is spelled
 * `category`. Measured: dropping the guard reddens no case in
 * `tests/helpers/memory-research-store.test.ts`. It is kept because
 * `ar-digest`'s assembly node reads a payload straight off a driver
 * row, where the guard DOES have a subject, and a store spelling
 * the read differently from the node it is imitating would be one
 * more thing that can drift.
 *
 * @param fields - The stored payload.
 * @returns The member's text, or null when the payload does not
 *   carry it and when it carries the JSON null. Both are SQL NULL
 *   under `->>`, and neither matches any key a caller can ask for.
 */
function categoryTextOf(
  fields: Record<string, unknown>,
): string | null {
  if (!Object.hasOwn(fields, FINDING_CATEGORY_FIELD)) {
    return null;
  }

  const held = fields[FINDING_CATEGORY_FIELD];

  if (held === null || held === undefined) {
    return null;
  }

  return typeof held === 'string'
    ? held
    : JSON.stringify(held);
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
  const connectors = new Map<number, ConnectorRecord>();
  const subscriptions = new Map<number, SubscriptionRecord>();

  // The three planting seams' state, the first two keyed by source id
  // and the third by connector id. None is a table this store's ports
  // can write, and the header carries why one holds rows and the
  // other two a number.
  const sourceDocuments = new Map<number, MemorySourceDocument[]>();
  const sourceSightings = new Map<number, number>();
  const connectorSubscriptions = new Map<number, number>();

  // The findings half's four collections. Three are PLANTED —
  // `findings` keyed by the domain that made them, `finding_sightings`
  // keyed by the finding they cite, and `entity_research` keyed by the
  // entity it is about — because no port here writes any of the
  // three. The fourth is WRITTEN: `finding_labels` is the one table
  // this half appends to, so it is keyed by its own id and carries a
  // counter beside the eight above.
  // The documents half's whole state, and the second seam over
  // `documents` in this file. Keyed by the DOMAIN that holds the
  // corpus rather than by the source a capture came through, because
  // the two ports read the table differently and a row with no
  // `source_id` has no key on the other seam at all.
  const domainDocuments = new Map<number, MemoryDomainDocument[]>();
  const domainFindings = new Map<number, MemoryDomainFinding[]>();
  const findingSightings = new Map<number, MemoryFindingSighting[]>();
  const entityResearch = new Map<number, MemoryEntityResearch[]>();
  const findingLabels = new Map<number, FindingLabelRecord>();

  // The entities half's two collections, BOTH keyed by the domain
  // that holds them and both planted before either writer can reach
  // them. `entity_research` is not among them: that table is planted
  // by the findings half above, keyed by the subject, and this half
  // reads the same rows through a projection of its own.
  const domainEntities = new Map<number, MemoryDomainEntity[]>();
  const domainPool = new Map<number, MemoryResearchPoolRow[]>();

  // The runs half's two collections, BOTH keyed by their own id and
  // NEITHER keyed by a parent. `runs.domain_id` and `llm_calls.run_id`
  // are both nullable, so a parent-keyed seam would have no key at all
  // for a maintenance tick or a call attributed to no pass — and those
  // are the rows the unfiltered page and the summary's null bucket are
  // claimed to hold. The domain and the run ride on the rows instead,
  // and the cascade reads them off there.
  const runs = new Map<number, MemoryRun>();
  const llmCalls = new Map<number, MemoryLlmCall>();
  let nextDomainId = 1;
  let nextCategoryId = 1;
  let nextTermId = 1;
  let nextPersonaId = 1;
  let nextTopicId = 1;
  let nextSourceId = 1;
  let nextConnectorId = 1;
  let nextSubscriptionId = 1;
  let nextFindingLabelId = 1;

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

  /**
   * The connectors one filter selects, unordered.
   *
   * A fresh array every call, which is what lets
   * {@link orderedConnectors} sort it in place without reaching into
   * stored state.
   *
   * NO OWNER IS TAKEN, unlike every sibling helper above.
   * `connectors` carries no `domain_id`, so a kind is a FILTER rather
   * than a scope: an absent one answers every row rather than none,
   * which is what `ConnectorFilter` says the member is for.
   *
   * @param filter - What to narrow to, or `{}` for every connector.
   * @returns The rows under it. Empty for a kind no row carries,
   *   which is an answer rather than a failure to read.
   */
  function connectorsMatching(filter: ConnectorFilter): ConnectorRecord[] {
    return [...connectors.values()].filter(
      (row) => filter.kind === undefined || row.kind === filter.kind,
    );
  }

  /**
   * The connectors one filter selects, ordered as
   * `ConnectorStore.listConnectors` promises.
   *
   * By `kind` ascending with `name` ascending beside it, compared by
   * code unit. The collation caveat {@link orderedTerms} carries
   * applies to the second column and NOT to the first: a kind is a
   * member of `CONNECTOR_KINDS`, four lowercase ASCII words a
   * collation cannot disagree about, while a name is free text an
   * operator chose.
   *
   * The order is total because the PAIR is unique, so unlike every
   * other ordered read here there is no tie-break to forget — a
   * property of `connectors_kind_name_unique` rather than of the
   * comparison.
   *
   * @param filter - What to narrow to, or `{}` for every connector.
   * @returns The rows, kind ascending then name ascending.
   */
  function orderedConnectors(filter: ConnectorFilter): ConnectorRecord[] {
    return connectorsMatching(filter).sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind < right.kind
          ? -1
          : 1;
      }

      if (left.name === right.name) {
        return 0;
      }

      return left.name < right.name
        ? -1
        : 1;
    });
  }

  /**
   * @param kind - The family to look within.
   * @param name - The name to look for.
   * @returns The row carrying that pair, or undefined. At most one
   *   can, which is what `connectors_kind_name_unique` guarantees and
   *   what the two writes below enforce.
   */
  function connectorByKey(
    kind: string,
    name: string,
  ): ConnectorRecord | undefined {
    return [...connectors.values()].find(
      (row) => row.kind === kind && row.name === name,
    );
  }

  /**
   * Refuses a `kind` outside `CONNECTOR_KINDS`.
   *
   * @param kind - The family a connector insert is asking for.
   * @throws A `check-violation` {@link StoreRefusal} naming
   *   `connectors_kind_check`. Reached from the INSERT alone, which
   *   is where this CHECK differs from {@link guardSourceKind}:
   *   `kind` is absent from `ConnectorPatch`, so no update here is
   *   written against it and none can be refused by it.
   */
  function guardConnectorKind(kind: string): void {
    if (!(CONNECTOR_KINDS as readonly string[]).includes(kind)) {
      throw new StoreRefusal({
        reason: 'check-violation',
        constraint: CONNECTOR_KIND_CHECK,
      });
    }
  }

  /**
   * One domain's export subscriptions, unordered.
   *
   * A fresh array every call, which is what lets
   * {@link orderedSubscriptions} sort it in place without reaching
   * into stored state.
   *
   * @param domainId - The domain to read.
   * @returns Its subscriptions. Empty for a domain subscribing to
   *   nothing AND for an id no domain carries — nothing points at a
   *   row that is not there, which is the answer `countSubscriptions`
   *   is read for.
   */
  function subscriptionsOf(domainId: number): SubscriptionRecord[] {
    return [...subscriptions.values()].filter(
      (row) => row.domainId === domainId,
    );
  }

  /**
   * One domain's subscriptions, ordered as
   * `SubscriptionStore.listSubscriptions` promises.
   *
   * By `format` ascending with `connectorId` ascending beside it, and
   * the ordering needs HALF the collation caveat its siblings carry.
   * The first column is free text to the type system but not to the
   * database: `export_subscriptions_format_check` holds it to
   * `EXPORT_FORMATS`, five lower-case ASCII identifiers whose only
   * punctuation is an underscore, so no locale this deployment could
   * carry orders them differently from `<`. The second is arithmetic,
   * as {@link orderedSources}' is.
   *
   * @param domainId - The domain to read.
   * @returns Its subscriptions, format ascending then connector
   *   ascending. The order is total because the pair is unique within
   *   one domain — it is what the natural key has left once the
   *   domain is fixed — so there is no tie-break to forget.
   */
  function orderedSubscriptions(domainId: number): SubscriptionRecord[] {
    return subscriptionsOf(domainId).sort((left, right) => {
      if (left.format === right.format) {
        return left.connectorId - right.connectorId;
      }

      return left.format < right.format
        ? -1
        : 1;
    });
  }

  /**
   * @param domainId - The domain to look within.
   * @param format - The format to look for.
   * @param connectorId - The destination to look for.
   * @returns The row carrying that triple, or undefined. At most one
   *   can, which is what
   *   `export_subscriptions_domain_id_format_connector_id_unique`
   *   guarantees and what the two writes below enforce.
   */
  function subscriptionByTriple(
    domainId: number,
    format: string,
    connectorId: number,
  ): SubscriptionRecord | undefined {
    return subscriptionsOf(domainId).find(
      (row) => row.format === format && row.connectorId === connectorId,
    );
  }

  /**
   * Refuses a `format` that no member of `EXPORT_FORMATS` matches.
   *
   * @param format - The format a subscription write is proposing.
   * @throws A `check-violation` {@link StoreRefusal} naming
   *   `export_subscriptions_format_check`. Reached from BOTH writes,
   *   as {@link guardSourceKind} is and unlike
   *   {@link guardConnectorKind}: `format` is patchable.
   */
  function guardSubscriptionFormat(format: string): void {
    if (!(EXPORT_FORMATS as readonly string[]).includes(format)) {
      throw new StoreRefusal({
        reason: 'check-violation',
        constraint: SUBSCRIPTION_FORMAT_CHECK,
      });
    }
  }

  /**
   * Refuses a `domainId` that names no stored domain.
   *
   * @param domainId - The domain a subscription insert is asking for.
   * @throws A `foreign-key-violation` {@link StoreRefusal} naming
   *   `export_subscriptions_domain_id_domains_id_fk`. Reached from
   *   the insert alone: `domainId` is not on `SubscriptionPatch`, so
   *   no update touches this key at all.
   */
  function guardSubscriptionDomain(domainId: number): void {
    if (!domains.has(domainId)) {
      throw new StoreRefusal({
        reason: 'foreign-key-violation',
        constraint: SUBSCRIPTION_DOMAIN_FK,
      });
    }
  }

  /**
   * Refuses a `connectorId` that names no stored connector.
   *
   * THE ONE GUARD HERE READING ANOTHER HALF'S TABLE, which is what
   * shared state buys and what a subscriptions fake standing alone
   * could not have done at all. Both writes reach it, `connectorId`
   * being patchable — the re-pointing
   * `src/db/schema/scheduling.ts` says the connector delete's own
   * refusal exists to make explicit.
   *
   * @param connectorId - The destination a subscription write names.
   * @throws A `foreign-key-violation` {@link StoreRefusal} naming
   *   `export_subscriptions_connector_id_connectors_id_fk` — the
   *   constraint {@link CONNECTOR_SUBSCRIPTIONS_FK} spells from the
   *   other end.
   */
  function guardSubscriptionConnector(connectorId: number): void {
    if (!connectors.has(connectorId)) {
      throw new StoreRefusal({
        reason: 'foreign-key-violation',
        constraint: SUBSCRIPTION_CONNECTOR_FK,
      });
    }
  }

  /**
   * Removes every subscription of one domain, as `ON DELETE CASCADE`
   * does.
   *
   * Reached from the domain delete alone, and unable to refuse
   * anything — which is what makes sharing it safe in the way
   * reusing a guarded delete would not be. There is no guarded
   * subscription delete to reuse in any case: nothing points at
   * `export_subscriptions`.
   *
   * IT DOES NOT REACH THE CONNECTORS THOSE ROWS NAMED, and that is
   * the cascade stopping exactly where the schema stops it. The
   * `ON DELETE cascade` is on `domain_id`; `connector_id` carries
   * `ON DELETE no action` and points the other way. So a domain
   * delete clears subscriptions OUT of a connector's way rather than
   * taking the connector with them.
   *
   * @param domainId - The domain being removed.
   */
  function dropSubscriptionsOf(domainId: number): void {
    for (const [subscriptionId, row] of subscriptions) {
      if (row.domainId === domainId) {
        subscriptions.delete(subscriptionId);
      }
    }
  }

  /**
   * One planted finding and the domain it was planted under.
   *
   * The one lookup three reads and the half's only guard share, so
   * that a finding a case planted is found the same way whether it
   * is being read, resolved through to its entity, or checked for by
   * the foreign key behind the append.
   *
   * @param id - The finding to look for.
   * @returns The row and its domain, or null when nothing carries
   *   the id. Null rather than a throw: an id no finding carries is
   *   a fact three of the four callers answer differently.
   */
  function plantedFinding(
    id: number,
  ): { domainId: number; row: MemoryDomainFinding } | null {
    for (const [domainId, planted] of domainFindings) {
      const row = planted.find((held) => held.id === id);

      if (row !== undefined) {
        return { domainId, row };
      }
    }

    return null;
  }

  /**
   * One domain's findings, as records and unordered.
   *
   * A fresh record every call, which is what lets the caller sort
   * and slice without reaching into planted state.
   *
   * @param domainId - The domain to read.
   * @returns Its findings. Empty for a domain that has made none AND
   *   for an id no domain carries.
   */
  function findingsIn(domainId: number): FindingRecord[] {
    return (domainFindings.get(domainId) ?? []).map(
      (row) => findingOf(domainId, row),
    );
  }

  /**
   * One finding's rulings, newest first: `labelled_at` descending
   * with `id` descending breaking a tie, as
   * {@link FindingStore.listFindingLabels} promises.
   *
   * THE TIEBREAK IS NOT OPTIONAL and it is what
   * {@link verdictInForce} rests on. `labelled_at` defaults to the
   * transaction's start time, so two rulings written in one
   * transaction tie to the microsecond and `id` is the only thing
   * separating them — which, for a lookup whose whole answer is the
   * first row, is the difference between a verdict and a coin flip.
   * The clock this store stamps from can be held FIXED, so that tie
   * is reachable here rather than only against a server.
   *
   * @param findingId - The finding to read.
   * @returns Its rulings in that order. A fresh array, so the sort
   *   never reaches stored state.
   */
  function labelsOf(findingId: number): FindingLabelRecord[] {
    return [...findingLabels.values()]
      .filter((row) => row.findingId === findingId)
      .sort((left, right) => {
        const byMoment = right.labelledAt.getTime()
          - left.labelledAt.getTime();

        if (byMoment !== 0) {
          return byMoment;
        }

        return right.id - left.id;
      });
  }

  /**
   * The verdict one finding stands under, or null when nobody has
   * judged it.
   *
   * THE LATEST AND NOT ANY, which is `FindingFilter.verdict`'s whole
   * rule: a finding judged one way and re-judged another is matched
   * by the second and not by the first, because the first is no
   * longer in force. A store matching any label would answer a page
   * of findings an operator has already moved on from, with every
   * count beside it agreeing.
   *
   * @param findingId - The finding to read.
   * @returns The head of {@link labelsOf}, or null. Null matches no
   *   verdict a caller can name, which is how a finding nobody has
   *   judged falls out of a filtered page.
   */
  function verdictInForce(findingId: number): string | null {
    const [latest] = labelsOf(findingId);

    return latest === undefined
      ? null
      : latest.verdict;
  }

  /**
   * Whether one finding stands under a filter.
   *
   * The predicate the page and the count BOTH read through, written
   * once so that a page's `meta.total` cannot come to describe a
   * different collection than the page.
   *
   * THE WINDOW IS HALF-OPEN, `[sinceInclusive, untilExclusive)`. A
   * finding made exactly at the lower bound is IN and one made
   * exactly at the upper bound is OUT, so two adjacent windows do
   * not both take the seam a caller paging through time crosses most
   * often. Neither bound is re-checked for order: `FindingFilter`
   * records that an inverted window never reaches this port.
   *
   * @param row - The finding to judge.
   * @param filter - What to narrow to.
   * @returns Whether it belongs in the collection.
   */
  function matchesFindingFilter(
    row: FindingRecord,
    filter: FindingFilter,
  ): boolean {
    const verdict = filter.verdict;

    if (verdict !== undefined && verdictInForce(row.id) !== verdict) {
      return false;
    }

    const category = filter.category;

    if (category !== undefined && categoryTextOf(row.fields) !== category) {
      return false;
    }

    const made = row.createdAt.getTime();
    const since = filter.window.sinceInclusive;
    const until = filter.window.untilExclusive;

    if (since !== null && made < since.getTime()) {
      return false;
    }

    return until === null || made < until.getTime();
  }

  /**
   * Where one finding sorts against another under one sort key.
   *
   * THE KEYS OF `compareFindings` WRITTEN OUT, not that comparator
   * called. `src/lib/digest-assemble.ts` exports it and this store
   * could import it, but then `src/findings/service.test.ts` holding
   * a page this store answered against `orderFindings` over the same
   * rows would be holding one authority against itself — and the
   * page the isolated suite reads is THIS one. So the ordering is
   * expressed independently here, exactly as `./db-store.ts`
   * expresses it in SQL, and the comparison in that suite is a real
   * one between two derivations of one rule.
   *
   * AN ABSENT SCORE IS THE TAIL AND NOT THE FLOOR. Two unscored
   * findings tie on the first key and fall through to the stamp,
   * which is what keeps the tail in an order of its own rather than
   * in whatever order the rows happened to arrive.
   *
   * BOTH ORDERINGS END IN `id` DESCENDING. `created_at` defaults to
   * the transaction's start time, so findings written by one pass
   * tie to the microsecond, and a page boundary falling inside that
   * tie would show a row twice.
   *
   * @param left - The first finding.
   * @param right - The second.
   * @param sort - Which ordering to answer in. `recency` is this
   *   same comparison with the score key dropped rather than a
   *   second rule.
   * @returns Negative when the first sorts earlier, positive when it
   *   sorts later, zero when the two are indistinguishable to every
   *   key — which no pair of stored rows is, `id` being unique.
   */
  function compareFindingRows(
    left: FindingRecord,
    right: FindingRecord,
    sort: FindingSort,
  ): number {
    if (sort === 'score' && left.score !== right.score) {
      if (left.score === null) {
        return 1;
      }

      if (right.score === null) {
        return -1;
      }

      return right.score - left.score;
    }

    const byMoment = right.createdAt.getTime() - left.createdAt.getTime();

    if (byMoment !== 0) {
      return byMoment;
    }

    return right.id - left.id;
  }

  /**
   * One domain's findings, narrowed and ordered.
   *
   * @param domainId - The domain to read within.
   * @param filter - What to narrow to.
   * @param sort - Which ordering to answer in.
   * @returns The rows, ordered. A fresh array of fresh records.
   */
  function orderedFindings(
    domainId: number,
    filter: FindingFilter,
    sort: FindingSort,
  ): FindingRecord[] {
    return findingsIn(domainId)
      .filter((row) => matchesFindingFilter(row, filter))
      .sort((left, right) => compareFindingRows(left, right, sort));
  }

  /**
   * One finding's sightings, newest first: `seen_at` descending with
   * `id` descending breaking a tie, as
   * {@link FindingStore.listFindingSightings} promises.
   *
   * @param findingId - The finding to read.
   * @returns Its sightings in that order, possibly empty.
   */
  function orderedSightings(findingId: number): FindingSightingRecord[] {
    return (findingSightings.get(findingId) ?? [])
      .map((row) => sightingOf(findingId, row))
      .sort((left, right) => {
        const byMoment = right.seenAt.getTime() - left.seenAt.getTime();

        if (byMoment !== 0) {
          return byMoment;
        }

        return right.id - left.id;
      });
  }

  /**
   * One entity's research, newest first: `researched_at` descending
   * with `id` descending breaking a tie, as
   * {@link FindingStore.listFindingResearch} promises.
   *
   * @param entityId - The subject to read.
   * @returns Its research in that order, possibly empty.
   */
  function orderedResearch(entityId: number): FindingResearchRecord[] {
    return (entityResearch.get(entityId) ?? [])
      .map((row) => researchOf(entityId, row))
      .sort((left, right) => {
        const byMoment = right.researchedAt.getTime()
          - left.researchedAt.getTime();

        if (byMoment !== 0) {
          return byMoment;
        }

        return right.id - left.id;
      });
  }

  /**
   * Refuses a `findingId` that names no planted finding.
   *
   * @param findingId - The finding a ruling is being appended to.
   * @throws A `foreign-key-violation` {@link StoreRefusal} naming
   *   `finding_labels_finding_id_findings_id_fk`. Reached from the
   *   append alone, which is the half's only write.
   */
  function guardLabelFinding(findingId: number): void {
    if (plantedFinding(findingId) === null) {
      throw new StoreRefusal({
        reason: 'foreign-key-violation',
        constraint: FINDING_LABEL_FINDING_FK,
      });
    }
  }

  /**
   * Removes every finding of one domain, and its sightings and its
   * rulings with it, as `ON DELETE CASCADE` does.
   *
   * TWO LEVELS DOWN, which is {@link dropSourcesOf}'s reach reached
   * for a different reason. `findings.domain_id` cascades, and
   * `finding_sightings.finding_id` and `finding_labels.finding_id`
   * cascade onto the findings — so one statement takes all three
   * tables. There is no guarded finding delete to reuse in any case:
   * `FindingStore` declares no delete at all.
   *
   * IT IS NOT REFUSED BY THE `NO ACTION` ON
   * `research_pool.finding_id`, AND THAT WAS UNREACHABILITY UNTIL
   * THE ENTITIES HALF LANDED. A seam now plants pool rows, so a row
   * citing a finding is a state this store can be in: within one
   * domain both go in the same statement and nothing is left citing
   * anything, and ACROSS two domains a deployment refuses the delete
   * where this store takes it. That is the sixth known divergence,
   * stated in the module header beside the same two columns'
   * `entity_id` half.
   *
   * @param domainId - The domain being removed.
   */
  function dropFindingsOf(domainId: number): void {
    for (const row of domainFindings.get(domainId) ?? []) {
      findingSightings.delete(row.id);

      for (const [labelId, label] of findingLabels) {
        if (label.findingId === row.id) {
          findingLabels.delete(labelId);
        }
      }
    }

    domainFindings.delete(domainId);
  }

  /**
   * The documents planted under one domain.
   *
   * @param domainId - The domain to read.
   * @returns Its planted rows, or none. A fresh array every call, so
   *   a caller filtering, sorting or slicing what this answers cannot
   *   reach the planted list.
   */
  function corpusOf(domainId: number): MemoryDomainDocument[] {
    return [...(domainDocuments.get(domainId) ?? [])];
  }

  /**
   * Whether one document stands under a filter.
   *
   * The predicate the page and the count BOTH read through, written
   * once so that a page's `meta.total` cannot come to describe a
   * different collection than the page —
   * {@link matchesFindingFilter}'s reason one group over.
   *
   * AN ABSENT MEMBER WIDENS, which is the whole of the default page:
   * a failed document is IN the corpus rather than behind a flag, so
   * a filter naming no status answers both members of
   * `DOCUMENT_PARSE_STATUSES` rather than the `ok` half. Nothing
   * here refuses a status outside the tuple, and nothing here can be
   * handed one: `DocumentFilter.parseStatus` is the union, and
   * `src/documents/service.ts` is where a `422` is decided.
   *
   * @param row - The document to judge.
   * @param filter - What to narrow to.
   * @returns Whether it belongs in the collection.
   */
  function matchesDocumentFilter(
    row: MemoryDomainDocument,
    filter: DocumentFilter,
  ): boolean {
    return filter.parseStatus === undefined
      || row.parseStatus === filter.parseStatus;
  }

  /**
   * One domain's corpus, narrowed and ordered newest first.
   *
   * `captured_at` descending with `id` descending breaking a tie, as
   * {@link DocumentStore.listDocuments} promises. THE TIEBREAK IS
   * NOT OPTIONAL AND THE TIE IS THE SERVER'S: `captured_at` defaults
   * to the transaction's start time, so a batch capture writes rows
   * carrying one instant and a page boundary falling inside that tie
   * would show one document twice and another never.
   *
   * The same pair {@link failuresOf} orders by over the same table,
   * expressed again rather than shared. The two collections agree
   * because the column does, and a helper serving both would make
   * one reader's ordering unfalsifiable from the other's cases.
   *
   * @param domainId - The domain to read within.
   * @param filter - What to narrow to.
   * @returns The rows in that order. A fresh array, so the sort
   *   never reaches the planted list.
   */
  function orderedDocuments(
    domainId: number,
    filter: DocumentFilter,
  ): MemoryDomainDocument[] {
    return corpusOf(domainId)
      .filter((row) => matchesDocumentFilter(row, filter))
      .sort((left, right) => {
        const byCapture = right.capturedAt.getTime()
          - left.capturedAt.getTime();

        return byCapture === 0
          ? right.id - left.id
          : byCapture;
      });
  }

  /**
   * Removes every document of one domain, as `ON DELETE CASCADE`
   * does.
   *
   * ONE LEVEL AND ONE TABLE HERE, and the two keys onto
   * `documents.id` are both worth naming for a reader checking this
   * against the schema. `findings.document_id` is `ON DELETE
   * cascade`, and those rows have gone in the line above either
   * way, so the two orders are indistinguishable.
   * `ingested_files.document_id` is `ON DELETE no action` and
   * REFUSES the domain delete in a deployment while its rows cite
   * these documents — left unimitated for
   * `research_pool.finding_id`'s reason, since no port here writes
   * that table and no seam plants one, so there is no dataset this
   * store can be in where the key would fire.
   *
   * IT DOES NOT REACH {@link MemoryResearchStore.setSourceDocuments}'
   * PLANTS, and {@link dropSourcesOf} does not reach these. The two
   * seams hold the same table separately, so the domain delete has
   * to clear both — which is what makes the fifth known divergence
   * survive a cascade rather than leaking a row through it.
   *
   * @param domainId - The domain being removed.
   */
  function dropDocumentsOf(domainId: number): void {
    domainDocuments.delete(domainId);
  }

  /**
   * The planted entity carrying one id, and the domain it was
   * planted under.
   *
   * {@link plantedFinding}'s shape for {@link plantedFinding}'s
   * reason: the seam is keyed by domain and every read here is
   * addressed by the row's own id, so the domain has to be recovered
   * from the key rather than from the row.
   *
   * @param id - The entity to look for.
   * @returns The domain and the stored row, or null when nothing
   *   carries the id.
   */
  function plantedEntity(
    id: number,
  ): { domainId: number; row: MemoryDomainEntity } | null {
    for (const [domainId, planted] of domainEntities) {
      const row = planted.find((held) => held.id === id);

      if (row !== undefined) {
        return { domainId, row };
      }
    }

    return null;
  }

  /**
   * Rewrites one stored entity in place.
   *
   * IN PLACE RATHER THAN THROUGH THE SEAM, because the seam replaces
   * a whole registry and a patch replaces one subject. The row is
   * already this store's own copy, so nothing is copied again here.
   *
   * @param domainId - The domain the row sits under, as
   *   {@link plantedEntity} recovered it.
   * @param row - What the row becomes.
   */
  function replaceEntity(domainId: number, row: MemoryDomainEntity): void {
    const planted = domainEntities.get(domainId);

    if (planted === undefined) {
      return;
    }

    const at = planted.findIndex((held) => held.id === row.id);

    if (at >= 0) {
      planted[at] = row;
    }
  }

  /**
   * @param domainId - The registry to look within.
   * @param nameNorm - The key to look for.
   * @param exceptId - The row being renamed, which is not in conflict
   *   with itself — the clause a store forgets and then refuses a
   *   rename that changed only the display half.
   * @returns The other row holding that key, or undefined. At most
   *   one can, which is what `entities_domain_id_name_norm_unique`
   *   guarantees within a domain and says nothing about across two.
   */
  function entityByNameNorm(
    domainId: number,
    nameNorm: string,
    exceptId: number,
  ): MemoryDomainEntity | undefined {
    return (domainEntities.get(domainId) ?? []).find(
      (row) => row.nameNorm === nameNorm && row.id !== exceptId,
    );
  }

  /**
   * Refuses an `aliasOf` naming an id no entity carries.
   *
   * ACROSS EVERY DOMAIN, because the column is: the foreign key is
   * onto `entities.id` alone, so an alias into another registry is
   * satisfied by it. That such a pointer is not a merge anybody meant
   * is `src/entities/service.ts`'s rule and not this one's.
   *
   * @param aliasOf - What the patch proposes, or null to clear.
   * @throws A `foreign-key-violation` {@link StoreRefusal} naming
   *   {@link ENTITY_ALIAS_FK}.
   */
  function guardAliasTarget(aliasOf: number | null): void {
    if (aliasOf !== null && plantedEntity(aliasOf) === null) {
      throw new StoreRefusal({
        reason: 'foreign-key-violation',
        constraint: ENTITY_ALIAS_FK,
      });
    }
  }

  /**
   * One subject's research, newest first: `researched_at` descending
   * with `id` descending breaking a tie, as
   * {@link EntityStore.listEntityResearch} promises.
   *
   * THE SAME PAIR {@link orderedResearch} ORDERS BY OVER THE SAME
   * TABLE, EXPRESSED AGAIN, which is the decision
   * {@link orderedDocuments} takes beside {@link failuresOf}. The two
   * readers agree because the column does, and a helper serving both
   * would make one reader's ordering unfalsifiable from the other's
   * cases.
   *
   * @param entityId - The subject to read about.
   * @returns Its research in that order, possibly empty. A fresh
   *   array, so the sort never reaches the planted list.
   */
  function orderedEntityResearch(entityId: number): EntityResearchRecord[] {
    return (entityResearch.get(entityId) ?? [])
      .map(entityResearchOf)
      .sort((left, right) => {
        const byMoment = right.researchedAt.getTime()
          - left.researchedAt.getTime();

        if (byMoment !== 0) {
          return byMoment;
        }

        return right.id - left.id;
      });
  }

  /**
   * Every planted intention naming one subject, across every domain.
   *
   * ACROSS EVERY DOMAIN, because the seam's key is the domain and the
   * question is about the subject. A row carrying a null `entityId`
   * matches no subject at all, the parameter being a number, which is
   * how an intention naming nobody stays out of every page here.
   *
   * @param entityId - The subject to look for.
   * @returns The stored rows, unordered.
   */
  function poolRowsFor(entityId: number): MemoryResearchPoolRow[] {
    const held: MemoryResearchPoolRow[] = [];

    for (const planted of domainPool.values()) {
      for (const row of planted) {
        if (row.entityId === entityId) {
          held.push(row);
        }
      }
    }

    return held;
  }

  /**
   * One subject's intentions, oldest first: `created_at` ascending
   * with `id` ascending breaking a tie, as
   * {@link EntityStore.listEntityPool} promises.
   *
   * ASCENDING WHERE EVERY OTHER COLLECTION HERE DESCENDS, and that is
   * the one place this file imitates a QUEUE rather than a page:
   * `listPending` in `scripts/approve.ts` orders the same way, and a
   * queue worked top-down empties where a newest-first one buries
   * whatever has waited longest.
   *
   * @param entityId - The subject to read.
   * @returns Its intentions in that order, possibly empty.
   */
  function orderedPool(entityId: number): ResearchPoolRecord[] {
    return poolRowsFor(entityId)
      .map(poolRowOf)
      .sort((left, right) => {
        const byRaised = left.createdAt.getTime() - right.createdAt.getTime();

        if (byRaised !== 0) {
          return byRaised;
        }

        return left.id - right.id;
      });
  }

  /**
   * The planted intention carrying one id, and the domain it was
   * raised under.
   *
   * @param id - The intention to look for.
   * @returns The domain and the stored row, or null when nothing
   *   carries the id.
   */
  function plantedPoolRow(
    id: number,
  ): { domainId: number; row: MemoryResearchPoolRow } | null {
    for (const [domainId, planted] of domainPool) {
      const row = planted.find((held) => held.id === id);

      if (row !== undefined) {
        return { domainId, row };
      }
    }

    return null;
  }

  /**
   * Rewrites one stored intention in place, on
   * {@link replaceEntity}'s terms.
   *
   * @param domainId - The domain the row sits under.
   * @param row - What the row becomes.
   */
  function replacePoolRow(
    domainId: number,
    row: MemoryResearchPoolRow,
  ): void {
    const planted = domainPool.get(domainId);

    if (planted === undefined) {
      return;
    }

    const at = planted.findIndex((held) => held.id === row.id);

    if (at >= 0) {
      planted[at] = row;
    }
  }

  /**
   * Refuses a planted intention that states it was closed without
   * stating that it was approved.
   *
   * `research_pool_approval_check` READ FROM THE ONE SIDE A CALL CAN
   * PROPOSE IT. The constraint bites both ways in a deployment —
   * stamping `researched_at` on a row nobody approved, and clearing
   * `approved_at` on a row already closed — and only the first is
   * reachable here, because nothing on this port writes either column
   * to null. The status is not consulted, exactly as the constraint
   * does not consult it: a row stating `done` with neither stamp set
   * is storable and is stored.
   *
   * @param row - The row a seam is about to store.
   * @throws A `check-violation` {@link StoreRefusal} naming
   *   {@link POOL_APPROVAL_CHECK}.
   */
  function guardPoolApproval(row: MemoryResearchPoolRow): void {
    if (row.researchedAt !== null && row.approvedAt === null) {
      throw new StoreRefusal({
        reason: 'check-violation',
        constraint: POOL_APPROVAL_CHECK,
      });
    }
  }

  /**
   * Removes every entity of one domain, and its research with it, as
   * `ON DELETE CASCADE` does.
   *
   * TWO LEVELS DOWN, which is {@link dropFindingsOf}'s reach over a
   * different pair of tables. `entities.domain_id` cascades and
   * `entity_research.entity_id` cascades onto the entities, so one
   * statement takes both.
   *
   * IT REACHES ONLY THE RESEARCH PLANTED UNDER A ROW THAT IS THERE,
   * and that is the seam's key rather than a shortcut.
   * {@link MemoryResearchStore.setEntityResearch} takes an id and not
   * a row, so research planted under an id no entity carries has
   * nothing to cascade from and survives — which is the state the
   * findings half's own fixture is in, no entity row backing the
   * subject its findings name.
   *
   * IT IS NOT REFUSED BY THE `NO ACTION` ON `research_pool.entity_id`
   * OR ON `findings.entity_id` WITHIN ONE DOMAIN, because the rows
   * that would hold it are removed by the same statement — the
   * cascade's own reach, which is the care `deleteDomain` below takes
   * over `categories.parent_id` by not reusing its guarded delete.
   * ACROSS two domains they are not, and this store takes a delete a
   * deployment refuses: the module header carries that as the sixth
   * known divergence.
   *
   * @param domainId - The domain being removed.
   */
  function dropEntitiesOf(domainId: number): void {
    for (const row of domainEntities.get(domainId) ?? []) {
      entityResearch.delete(row.id);
    }

    domainEntities.delete(domainId);
  }

  /**
   * Removes every intention raised under one domain, as
   * `ON DELETE CASCADE` does.
   *
   * ONE LEVEL AND ONE TABLE, AND IT DOES NOT GO THROUGH THE ENTITIES.
   * `research_pool.domain_id` is the cascading column, so a row
   * naming NO subject goes with the rest rather than being left
   * behind — which a cascade written through
   * {@link dropEntitiesOf} could not do, there being no subject to
   * follow.
   *
   * @param domainId - The domain being removed.
   */
  function dropPoolOf(domainId: number): void {
    domainPool.delete(domainId);
  }

  /**
   * Every stored run, as a fresh list.
   *
   * @returns The rows. A fresh array every call, so a caller
   *   filtering, sorting or slicing what this answers cannot reach
   *   the stored collection.
   */
  function runRows(): MemoryRun[] {
    return [...runs.values()];
  }

  /**
   * Whether one run stands under a filter.
   *
   * The predicate the page and the count BOTH read through, written
   * once so that a page's `meta.total` cannot come to describe a
   * different collection than the page — {@link matchesFindingFilter}
   * and {@link matchesDocumentFilter}'s reason, two groups over.
   *
   * AN ABSENT MEMBER WIDENS TO EVERY RUN INCLUDING THE DOMAIN-LESS
   * ONES, which is the whole of the unfiltered page. A named domain
   * excludes them, and it does so BY THE COMPARISON rather than by a
   * branch: `null === <a number>` is false, so a tick is out of one
   * domain's page for the same reason it is out of another's.
   *
   * @param row - The run to judge.
   * @param filter - What to narrow to.
   * @returns Whether it belongs in the collection.
   */
  function matchesRunFilter(row: MemoryRun, filter: RunFilter): boolean {
    return filter.domainId === undefined || row.domainId === filter.domainId;
  }

  /**
   * The stored runs a filter selects, ordered newest first.
   *
   * `started_at` descending with `id` descending breaking a tie, as
   * {@link RunStore.listRuns} promises. THE TIEBREAK IS NOT OPTIONAL
   * AND THE TIE IS THE SERVER'S OWN: `started_at` defaults to
   * `now()`, which is the TRANSACTION's start time, so passes opened
   * together tie to the microsecond and a page boundary falling
   * inside that tie would show one run twice and another never.
   *
   * @param filter - What to narrow to.
   * @returns The rows in that order. A fresh array, so the sort
   *   never reaches the stored collection.
   */
  function orderedRuns(filter: RunFilter): MemoryRun[] {
    return runRows()
      .filter((row) => matchesRunFilter(row, filter))
      .sort((left, right) => {
        const byStart = right.startedAt.getTime() - left.startedAt.getTime();

        return byStart === 0
          ? right.id - left.id
          : byStart;
      });
  }

  /**
   * One run's model calls, newest first.
   *
   * `called_at` descending with `id` descending breaking a tie, as
   * {@link RunStore.listRunLedger} promises, and expressed here
   * rather than shared with {@link orderedRuns} above — the decision
   * {@link orderedDocuments} takes beside {@link failuresOf} over one
   * table, applied to two.
   *
   * A CALL NAMING NO RUN IS IN NO LEDGER, and that is this
   * comparison rather than a guard: the parameter is a number and
   * `null === <a number>` is false, so the unattributed calls are
   * unreachable from every run id there is.
   *
   * @param runId - The run to read within.
   * @returns Its calls in that order, possibly empty. A fresh array.
   */
  function orderedLedger(runId: number): MemoryLlmCall[] {
    return [...llmCalls.values()]
      .filter((row) => row.runId === runId)
      .sort((left, right) => {
        const byCall = right.calledAt.getTime() - left.calledAt.getTime();

        return byCall === 0
          ? right.id - left.id
          : byCall;
      });
  }

  /**
   * Whose spend one call is, or null when it is nobody's.
   *
   * A `LEFT JOIN` TO `runs` WRITTEN OUT, and the two ways it answers
   * null are the two kinds of unattributed call `src/runs/store.ts`
   * says the bucket holds together: a call naming no run, and a call
   * whose run named no domain. A join that DROPPED either would leave
   * the buckets' `calls` adding up to less than the window holds,
   * which is the one thing a total taken from the summary must not
   * do.
   *
   * A THIRD WAY IT ANSWERS NULL IS UNREACHABLE IN A DEPLOYMENT and
   * reachable here: a call naming a run nothing stored.
   * `llm_calls_run_id_runs_id_fk` forbids that state, and the seam
   * takes an id rather than a row, so this store answers what the
   * left join would answer rather than inventing a refusal.
   *
   * @param row - The call to attribute.
   * @returns The domain id, or null.
   */
  function spendDomainOf(row: MemoryLlmCall): number | null {
    if (row.runId === null) {
      return null;
    }

    return runs.get(row.runId)?.domainId ?? null;
  }

  /**
   * Whether one call falls inside a spend window.
   *
   * THE WINDOW IS HALF-OPEN, `[sinceInclusive, untilExclusive)`, and
   * the member names are what say which side each bound closes —
   * {@link matchesFindingFilter}'s rule over `created_at`, applied to
   * `called_at`. A store writing `<=` on the upper bound would let
   * two adjacent windows both take the seam a caller paging through
   * time crosses most often, and every number beside them would
   * still add up.
   *
   * Neither bound is re-checked for order and either may be null:
   * `RunStore.summariseSpend` records that `./spend-service.ts`
   * defaults an absent window and refuses an inverted or over-wide
   * one, so no request reaches here unbounded.
   *
   * @param row - The call to judge.
   * @param window - The span to hold it against.
   * @returns Whether it belongs in the summary.
   */
  function calledWithin(row: MemoryLlmCall, window: TimeWindow): boolean {
    const made = row.calledAt.getTime();
    const since = window.sinceInclusive;
    const until = window.untilExclusive;

    if (since !== null && made < since.getTime()) {
      return false;
    }

    return until === null || made < until.getTime();
  }

  /**
   * Where one bucket sorts against another.
   *
   * `day` DESCENDING, THEN `domainId` ASCENDING WITH THE NULL BUCKET
   * LAST, as {@link RunStore.summariseSpend} promises. The order is
   * contracted for the reason any listed answer needs one: two
   * implementations free to emit their groups in whatever order the
   * grouping produced would agree on every number and disagree on
   * the array.
   *
   * THE NULL GOES LAST BY A BRANCH AND NOT BY ARITHMETIC, which is
   * what the SQL spells `NULLS LAST` on an ascending key for. It is
   * the one place on this half where a null sorts rather than
   * filtering: the page's two descending keys are over NOT NULL
   * columns.
   *
   * @param left - The first bucket.
   * @param right - The second.
   * @returns Negative when the first sorts earlier, positive when it
   *   sorts later, zero for two buckets of one domain on one day —
   *   which the grouping makes unreachable.
   */
  function compareSpendBuckets(left: SpendBucket, right: SpendBucket): number {
    const byDay = right.day.getTime() - left.day.getTime();

    if (byDay !== 0) {
      return byDay;
    }

    if (left.domainId === right.domainId) {
      return 0;
    }

    if (left.domainId === null) {
      return 1;
    }

    return right.domainId === null
      ? -1
      : left.domainId - right.domainId;
  }

  /**
   * Adds one call into the bucket it belongs to.
   *
   * A GROUP BY WRITTEN OUT, keyed by the day and the domain together
   * so that a bucket exists only because calls landed in it — there
   * is no row here for a day nothing was called on and none for a
   * domain that made no calls, which is what
   * {@link RunStore.summariseSpend} says a store must not invent.
   *
   * `calls` COUNTS ROWS AND THE TWO MAGNITUDES SUM THE MEASURED
   * ONES, SEPARATELY. A call carrying neither is still a call that
   * was made, and each sum stays null until a call records that axis
   * — so a bucket nobody measured answers null rather than the zero
   * a real reading of nothing sent would give, and a call measured on
   * one axis alone contributes to one sum.
   *
   * @param into - The buckets accumulated so far, keyed by day and
   *   domain.
   * @param row - The call to add.
   */
  function addToBucket(
    into: Map<string, SpendBucket>,
    row: MemoryLlmCall,
  ): void {
    const day = utcDayOf(row.calledAt);
    const domainId = spendDomainOf(row);
    const key = `${day.getTime()}:${domainId ?? 'none'}`;
    const held = into.get(key) ?? null;

    into.set(key, {
      domainId,
      day,
      calls: (held?.calls ?? 0) + 1,
      promptChars: addMagnitude(held?.promptChars ?? null, row.promptChars),
      estTokens: addMagnitude(held?.estTokens ?? null, row.estTokens),
    });
  }

  /**
   * Removes every run of one domain and the ledger under it, as
   * `ON DELETE CASCADE` does at both levels.
   *
   * TWO LEVELS AND TWO TABLES. `runs.domain_id` cascades and
   * `llm_calls.run_id` cascades onto the runs, which is
   * {@link dropFindingsOf}'s shape over a different pair.
   *
   * IT READS THE DOMAIN OFF THE ROW RATHER THAN OFF A KEY, which is
   * {@link MemoryResearchStore.setRuns} being flat, and the
   * comparison is what leaves the domain-less ticks standing: a tick
   * hangs off no domain, so no domain delete reaches it and its
   * ledger survives with it. So do the calls naming no run at all,
   * which hang off nothing this store can delete.
   *
   * TWO KEYS ONTO `runs.id` ARE LEFT UNIMITATED AND THEY ARE LEFT SO
   * FOR DIFFERENT REASONS. `briefings.run_id` is `ON DELETE no
   * action` and would refuse this delete in a deployment, and it goes
   * unimitated for `research_pool.finding_id`'s reason: no port here
   * writes that table and no seam plants one, so there is no dataset
   * this store can be in where the key would fire.
   * `entity_research.run_id` is the SAME `no action` key and IS
   * reachable, {@link MemoryEntityResearch.runId} being plantable —
   * that is this file's SEVENTH known divergence, stated in the
   * module header and pinned by a case.
   *
   * @param domainId - The domain being removed.
   */
  function dropRunsOf(domainId: number): void {
    for (const [runId, row] of runs) {
      if (row.domainId !== domainId) {
        continue;
      }

      for (const [callId, call] of llmCalls) {
        if (call.runId === runId) {
          llmCalls.delete(callId);
        }
      }

      runs.delete(runId);
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
     * One domain by its surrogate key, or null.
     *
     * The map is keyed by id, so this is the direct read the slug
     * lookup above has to scan for. Copied on the way out on the
     * same terms: a caller writing into an answered `settings`
     * payload must not move what the next read answers.
     */
    async findDomainById(id: number): Promise<DomainRecord | null> {
      const row = domains.get(id);

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
     * ITS EXPORT SUBSCRIPTIONS GO IN THAT SAME PLACE, and this is
     * the one cascade line whose neighbours are NOT all cascading.
     * `export_subscriptions.domain_id` is `ON DELETE CASCADE` like
     * every other foreign key onto `domains.id`, so the rows go; but
     * the `connector_id` on those same rows is `ON DELETE no action`
     * and points OUT of the domain, so the connectors they named do
     * not. A domain delete therefore clears subscriptions out of a
     * connector's way rather than taking the connector with them,
     * which is what makes `connectors` and `operator_settings` the
     * two tables no domain delete reaches.
     *
     * ITS FINDINGS GO IN THAT SAME PLACE AND TAKE TWO TABLES WITH
     * THEM, which is {@link dropSourcesOf}'s reach for a different
     * reason. `findings.domain_id` cascades, and
     * `finding_sightings.finding_id` and `finding_labels.finding_id`
     * cascade onto the findings, so one statement clears all three.
     * There is no guarded finding delete to be careful of reusing:
     * `FindingStore` declares no delete at all, and the one
     * `ON DELETE no action` key onto `findings.id` sits on a table
     * nothing here can put a row in.
     *
     * ITS DOCUMENTS GO IN THAT SAME PLACE, THROUGH A SECOND LINE
     * OVER A TABLE {@link dropSourcesOf} HAS ALREADY REACHED. The
     * two seams over `documents` are keyed differently and neither
     * sees the other's rows, so clearing the sources' plants leaves
     * this domain's corpus standing and clearing the corpus leaves
     * their plants standing — the fifth known divergence surviving
     * the cascade rather than leaking a row through it. Both lines
     * are needed and neither is redundant, which one case reads from
     * each side.
     *
     * ITS ENTITIES GO IN THAT SAME PLACE AND TAKE THEIR RESEARCH
     * WITH THEM, and ITS INTENTIONS GO BY A ROUTE OF THEIR OWN.
     * `entities.domain_id` cascades and `entity_research.entity_id`
     * cascades onto the entities, which is {@link dropFindingsOf}'s
     * two levels over a different pair of tables. `research_pool`
     * does NOT arrive through the entities: its own `domain_id`
     * cascades, so an intention naming no subject goes with the rest
     * rather than being left behind, and that is why the two lines
     * below are two claims and neither is redundant.
     *
     * NEITHER IS REFUSED WITHIN ONE DOMAIN, though both
     * `research_pool.entity_id` and `findings.entity_id` are
     * `ON DELETE no action`: the rows that would hold the delete are
     * removed by the same statement, which is the care taken with
     * `categories.parent_id` above. ACROSS two domains they would be,
     * and this store takes the delete — the sixth known divergence,
     * stated in the module header and pinned by a case.
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
      dropSubscriptionsOf(id);
      dropFindingsOf(id);
      dropDocumentsOf(id);
      dropEntitiesOf(id);
      dropPoolOf(id);
      dropRunsOf(id);

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
     * One window of the connector list, kind ascending with name
     * ascending beside it, narrowed to one kind or to none.
     *
     * TAKES NO OWNER, which is the one structural difference between
     * this list and every other one here: `connectors` hangs off no
     * domain, so `GET /connectors` has nothing to be scoped by and a
     * filter that names no kind answers the whole deployment.
     *
     * THE CONFIG COMES BACK UNMASKED, on every row and on every read
     * below. `src/connectors/store.ts` carries the whole argument:
     * the live suite compares a write against the raw row, the
     * sentinel capture watches the assembled service rather than a
     * store, and `ar-ingest` reads the column directly. So masking is
     * `src/connectors/service.ts`'s and nothing here calls it.
     */
    async listConnectors(
      filter: ConnectorFilter,
      window: StoreWindow,
    ): Promise<readonly ConnectorRecord[]> {
      return orderedConnectors(filter)
        .slice(window.offset, window.offset + window.limit)
        .map(copyConnector);
    },

    /**
     * How many connectors the same filter selects, ignoring any
     * window.
     *
     * The same predicate the list read through, which is the whole
     * of what keeps a page's `meta.total` from describing a
     * different collection than the page. A kind no row carries
     * answers zero rather than failing.
     */
    async countConnectors(filter: ConnectorFilter): Promise<number> {
      return connectorsMatching(filter).length;
    },

    /** One connector by its id, config unmasked, or null. */
    async findConnectorById(id: number): Promise<ConnectorRecord | null> {
      const row = connectors.get(id);

      return row === undefined
        ? null
        : copyConnector(row);
    },

    /**
     * Inserts one connector.
     *
     * THE CONFIG IS COPIED ON THE WAY IN, so a caller that goes on
     * editing the object it submitted does not edit a stored
     * credential — the sharper half of the rule
     * {@link copyConnector} carries, since what is being written
     * through here is the value a client authenticates with.
     *
     * The id comes off the counter first, so both refusals below burn
     * one exactly as the sequence does. No measurement of this
     * table's own: the reasoning is `personas`', where two refused
     * inserts between two accepted ones left a gap of two against the
     * live server, and this table's CHECK stands where that
     * measurement's foreign key did.
     *
     * The CHECK is asked ahead of the key, matching `insertSource`
     * above and argued the same way — a table CHECK is evaluated
     * while the row is still being formed, and a unique index
     * afterwards. NOTHING CAN OBSERVE THAT ORDER HERE, and saying so
     * is the honest half: the key opens on the very column the CHECK
     * constrains, so a write proposing a kind outside the tuple can
     * duplicate nothing — there is nothing stored under that kind.
     */
    async insertConnector(
      input: InsertConnectorInput,
    ): Promise<ConnectorRecord> {
      const id = nextConnectorId;

      nextConnectorId += 1;

      guardConnectorKind(input.kind);

      if (connectorByKey(input.kind, input.name) !== undefined) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: CONNECTOR_KEY_UNIQUE,
        });
      }

      const row: ConnectorRecord = {
        id,
        kind: input.kind,
        name: input.name,
        config: copyJsonDocument(input.config),
      };

      connectors.set(row.id, row);

      return copyConnector(row);
    },

    /**
     * Rewrites the supplied members of one connector.
     *
     * A PATCH NAMING NEITHER MEMBER WRITES NOTHING and answers the
     * stored row, for the reason `updateSource` above gives:
     * `connectors` carries no `updated_at` either, so an empty patch
     * has literally nothing to set and drizzle throws `No values to
     * set` on an empty update list.
     *
     * `kind` IS UNREACHABLE, whatever this is handed, because
     * `ConnectorPatch` declares no member that could carry one — the
     * containment is the type's rather than a check here. That is
     * also what keeps the CHECK off this write, so a rename raises
     * exactly one mechanism where a source patch can raise its own
     * CHECK.
     *
     * WHAT IS CHECKED IS THE RESULTING NAME WITHIN THE STORED KIND,
     * and a row is not in conflict with itself: the row found under
     * the resulting pair is a refusal only when it is a different
     * row. A name another KIND carries is not a conflict at all,
     * which is what makes the key per-kind rather than global.
     *
     * `config` REPLACES THE STORED DOCUMENT WHOLE and is copied on
     * the way in, never merged into what is there. A caller sends the
     * object it wants to exist, which is the only shape under which
     * removing a member is expressible — and on this table that
     * means a patch omitting a secret's key has CLEARED that secret,
     * which `src/connectors/store.ts` states rather than smooths
     * over.
     */
    async updateConnector(
      id: number,
      patch: ConnectorPatch,
    ): Promise<ConnectorRecord | null> {
      const existing = connectors.get(id);

      if (existing === undefined) {
        return null;
      }

      if (patch.name === undefined && patch.config === undefined) {
        return copyConnector(existing);
      }

      const name = patch.name ?? existing.name;
      const holder = connectorByKey(existing.kind, name);

      if (holder !== undefined && holder.id !== id) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: CONNECTOR_KEY_UNIQUE,
        });
      }

      const updated: ConnectorRecord = {
        ...existing,
        name,
        config: patch.config === undefined
          ? existing.config
          : copyJsonDocument(patch.config),
      };

      connectors.set(id, updated);

      return copyConnector(updated);
    },

    /**
     * What still names one connector, per dependent table.
     *
     * ONE MEMBER READ OFF THE SEAM, and the number is AUTHORITATIVE
     * rather than counted — the shape
     * {@link MemoryResearchStore.setDomainDependents} has and the
     * sources documents do not. Nothing here writes an
     * `export_subscriptions` row, so there is no dataset to count
     * from; {@link MemoryResearchStore.setConnectorSubscriptions}
     * carries what happens when there is.
     *
     * A zero is a counted zero, and an id no connector carries
     * answers one rather than failing: nothing points at a row that
     * is not there. Whether that id should have existed is a question
     * `findConnectorById` already answered.
     */
    async countConnectorDependents(
      id: number,
    ): Promise<ConnectorDependentCounts> {
      return { exportSubscriptions: connectorSubscriptions.get(id) ?? 0 };
    },

    /**
     * Deletes one connector, unless a subscription still names it.
     *
     * REFUSED FROM OUTSIDE THE ROW AND BY ONE KEY, which is
     * `deleteSource`'s shape narrowed to a single mechanism — and
     * narrowed on a reading of the generated SQL rather than on a
     * plan. `export_subscriptions_connector_id_connectors_id_fk` is
     * the whole of it.
     *
     * NO CASCADE ANYWHERE AND NO DOMAIN ABOVE IT. This either removes
     * a row nothing references or is refused, and no delete of a
     * domain reaches it at all: a connector outlives every domain
     * that named it, which is what `deleteDomain` above does NOT do
     * to this table.
     */
    async deleteConnector(id: number): Promise<boolean> {
      if ((connectorSubscriptions.get(id) ?? 0) > 0) {
        throw new StoreRefusal({
          reason: 'foreign-key-violation',
          constraint: CONNECTOR_SUBSCRIPTIONS_FK,
        });
      }

      return connectors.delete(id);
    },

    /**
     * One window of a domain's export subscriptions, format
     * ascending with the connector ascending beside it.
     *
     * A domain subscribing to nothing and an id no domain carries are
     * one answer here — the empty list — because whether the domain
     * exists was settled by `DomainStore.findDomainBySlug` before
     * this was called.
     */
    async listSubscriptions(
      domainId: number,
      window: StoreWindow,
    ): Promise<readonly SubscriptionRecord[]> {
      return orderedSubscriptions(domainId)
        .slice(window.offset, window.offset + window.limit)
        .map(copySubscription);
    },

    /**
     * How many subscriptions one domain holds, ignoring any window.
     *
     * An id no domain carries answers zero rather than failing,
     * which is correct rather than a special case: nothing points at
     * a row that is not there.
     */
    async countSubscriptions(domainId: number): Promise<number> {
      return subscriptionsOf(domainId).length;
    },

    /** One subscription by its id, or null. */
    async findSubscriptionById(
      id: number,
    ): Promise<SubscriptionRecord | null> {
      const row = subscriptions.get(id);

      return row === undefined
        ? null
        : copySubscription(row);
    },

    /**
     * Inserts one subscription, UNSCHEDULED.
     *
     * `nextRunAt` is null on the row this answers whatever the
     * caller wanted, because `InsertSubscriptionInput` declares no
     * member that could set it: the containment is the type's rather
     * than a check here, exactly as it is on `insertTopic` above.
     *
     * The id comes off the counter first, so every refusal below
     * burns one exactly as the sequence does. No measurement of this
     * table's own: it carries the same kind of pair `personas` does,
     * where two refused inserts between two accepted ones left a gap
     * of two against the live server.
     *
     * FOUR MECHANISMS AND THE WIDEST WRITE IN THIS FILE, checked in
     * the order a server evaluates them: the CHECK while the row is
     * still being formed, the unique index next, and the two foreign
     * keys at the end of the statement. Only ONE of the six pairings
     * is observable in principle and none is claimed here. The CHECK
     * and the key cannot both fire, the key opening on the very
     * column the CHECK constrains — a write proposing a format
     * outside the tuple can duplicate nothing, since every stored
     * row's format is inside it. Neither can the key and either
     * foreign key, for the same reason read on the other two thirds
     * of the triple. What IS reachable together is the CHECK beside a
     * missing parent, and the two foreign keys beside each other, and
     * `src/sources/store.ts`'s half of this argument applies word for
     * word: the order below is argued from when a server evaluates
     * each kind of mechanism and rests on no reading of this table,
     * so no case pins it.
     */
    async insertSubscription(
      input: InsertSubscriptionInput,
    ): Promise<SubscriptionRecord> {
      const id = nextSubscriptionId;

      nextSubscriptionId += 1;

      guardSubscriptionFormat(input.format);

      if (
        subscriptionByTriple(
          input.domainId,
          input.format,
          input.connectorId,
        ) !== undefined
      ) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: SUBSCRIPTION_KEY_UNIQUE,
        });
      }

      guardSubscriptionDomain(input.domainId);
      guardSubscriptionConnector(input.connectorId);

      const row: SubscriptionRecord = {
        id,
        domainId: input.domainId,
        format: input.format,
        connectorId: input.connectorId,
        intervalSeconds: input.intervalSeconds,
        nextRunAt: null,
        enabled: input.enabled,
        minIntervalSeconds: input.minIntervalSeconds,
        maxIntervalSeconds: input.maxIntervalSeconds,
      };

      subscriptions.set(row.id, row);

      return copySubscription(row);
    },

    /**
     * Rewrites the supplied members of one subscription.
     *
     * A PATCH NAMING NO MEMBER WRITES NOTHING and answers the stored
     * row, for the reason `updateTopic` above gives:
     * `export_subscriptions` carries no `updated_at` either, so an
     * empty patch has nothing to set and drizzle throws on an empty
     * update list.
     *
     * TWO THIRDS OF THE KEY ARE PATCHABLE AND THE THIRD IS NOT, so
     * what is checked is the resulting pair within the STORED domain,
     * and no update reaches the domain foreign key at all. A row is
     * not in conflict with itself, so the row found under the
     * resulting triple is a refusal only when it is a different row.
     * That is the topic patch's rule over two moving parts rather
     * than one.
     *
     * IT REACHES THREE MECHANISMS WHERE THE INSERT REACHES FOUR, and
     * the missing one is the domain key rather than anything about
     * this write. The CHECK is here because `format` is patchable —
     * where `updateConnector` reaches no CHECK at all — and the
     * connector foreign key is here because re-pointing is the
     * operation `src/db/schema/scheduling.ts` says the connector
     * delete's refusal exists to make explicit.
     *
     * THE TWO BOUNDS DISTINGUISH THREE REQUESTS and the three NOT
     * NULL members distinguish two, which is why they are written
     * differently below — the rule `CategoryPatch.parentId` carries
     * in `src/taxonomy/store.ts`.
     */
    async updateSubscription(
      id: number,
      patch: SubscriptionPatch,
    ): Promise<SubscriptionRecord | null> {
      const existing = subscriptions.get(id);

      if (existing === undefined) {
        return null;
      }

      if (
        patch.format === undefined
        && patch.connectorId === undefined
        && patch.intervalSeconds === undefined
        && patch.enabled === undefined
        && patch.minIntervalSeconds === undefined
        && patch.maxIntervalSeconds === undefined
      ) {
        return copySubscription(existing);
      }

      const format = patch.format ?? existing.format;
      const connectorId = patch.connectorId ?? existing.connectorId;

      guardSubscriptionFormat(format);

      const holder = subscriptionByTriple(
        existing.domainId,
        format,
        connectorId,
      );

      if (holder !== undefined && holder.id !== id) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: SUBSCRIPTION_KEY_UNIQUE,
        });
      }

      guardSubscriptionConnector(connectorId);

      const updated: SubscriptionRecord = {
        ...existing,
        format,
        connectorId,
        intervalSeconds: patch.intervalSeconds ?? existing.intervalSeconds,
        enabled: patch.enabled ?? existing.enabled,
        minIntervalSeconds: patch.minIntervalSeconds === undefined
          ? existing.minIntervalSeconds
          : patch.minIntervalSeconds,
        maxIntervalSeconds: patch.maxIntervalSeconds === undefined
          ? existing.maxIntervalSeconds
          : patch.maxIntervalSeconds,
      };

      subscriptions.set(id, updated);

      return copySubscription(updated);
    },

    /**
     * Writes one subscription's due time, AND NOTHING ELSE.
     *
     * `updateTopicSchedule`'s shape and its reasons, one caller
     * shorter: `POST /exports/:id/run-now` is this column's whole
     * access, there being no pause verb under `/exports`, so nothing
     * here is ever handed an instant `pauseFrom` derived.
     *
     * The instant is COPIED on the way in, which is what the run-now
     * needs from this method rather than a nicety: a service holding
     * the `Date` it passed could otherwise go on moving the stored
     * due time after the write, through a member the port declares
     * `readonly`.
     *
     * It takes no view of the instant: no clamp, no clock, no reading
     * of `enabled` and no comparison against the stored due time. All
     * four are `src/subscriptions/service.ts`'s, because all four are
     * decisions rather than facts a database reports.
     */
    async updateSubscriptionSchedule(
      id: number,
      nextRunAt: Date,
    ): Promise<SubscriptionRecord | null> {
      const existing = subscriptions.get(id);

      if (existing === undefined) {
        return null;
      }

      const updated: SubscriptionRecord = {
        ...existing,
        nextRunAt: copyInstant(nextRunAt),
      };

      subscriptions.set(id, updated);

      return copySubscription(updated);
    },

    /**
     * Deletes one subscription.
     *
     * Nothing in schema v2 points at `export_subscriptions` — read
     * off the generated SQL rather than the schema, and with the
     * `connectors` key as the live needle beside it — so this is
     * `deleteTopic`'s shape rather than `deleteConnector`'s: neither
     * a guard nor a cascade, and a delete that cannot be refused.
     *
     * It is also what CLEARS a refusal one port over. A connector is
     * held by the rows that name it, so cancelling here is exactly
     * what lets `deleteConnector` land — in a deployment. It does not
     * do so in this store, whose connector guard reads a planted
     * number rather than these rows;
     * {@link MemoryResearchStore.setConnectorSubscriptions} carries
     * that divergence and where it is discharged.
     */
    async deleteSubscription(id: number): Promise<boolean> {
      return subscriptions.delete(id);
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

    /**
     * One window of a domain's findings, narrowed and ordered.
     *
     * THE ORDER IS `compareFindings`' KEYS EXPRESSED HERE rather
     * than that comparator called, and {@link compareFindingRows}
     * carries why: the page `src/findings/service.test.ts` holds
     * against `orderFindings` is this one, so importing the library
     * would leave that comparison holding one authority against
     * itself.
     *
     * READS FINDINGS AND WRITES NONE. Nothing on this port inserts,
     * patches or deletes a finding, so every row here arrived
     * through {@link MemoryResearchStore.setDomainFindings} — which
     * is the read-first law being structural rather than kept.
     *
     * FIELDS COME BACK AS STORED, unreduced and uncut. What
     * `ar-digest` does to a payload before filing it is that
     * pipeline's, and a store imitating it would make the column
     * read this page filters on unreachable.
     */
    async listFindings(
      domainId: number,
      filter: FindingFilter,
      sort: FindingSort,
      window: StoreWindow,
    ): Promise<readonly FindingRecord[]> {
      return orderedFindings(domainId, filter, sort)
        .slice(window.offset, window.offset + window.limit);
    },

    /**
     * How many of one domain's findings the same filter selects,
     * ignoring any window and any ordering.
     *
     * The same predicate the page read through — one dataset and
     * one {@link matchesFindingFilter} behind both is what makes a
     * page's `meta.total` describe the page's own collection here
     * rather than by coincidence.
     *
     * NO SORT PARAMETER, which the port states as a claim: an
     * ordering cannot change how many rows a predicate selects.
     */
    async countFindings(
      domainId: number,
      filter: FindingFilter,
    ): Promise<number> {
      return findingsIn(domainId).filter(
        (row) => matchesFindingFilter(row, filter),
      ).length;
    },

    /**
     * One finding by its id, or null.
     *
     * TAKES NO DOMAIN, which is the addressing rule the surface
     * keeps: a domain is met by slug and everything else by its id.
     * The domain the row was planted under is what
     * {@link FindingRecord.domainId} answers, so a caller learns the
     * owner from the row rather than having to name it.
     */
    async findFindingById(id: number): Promise<FindingRecord | null> {
      const held = plantedFinding(id);

      return held === null
        ? null
        : findingOf(held.domainId, held.row);
    },

    /**
     * Where one finding has been seen, newest first.
     *
     * UNBOUNDED, as the port declares: these rows are embedded in a
     * single finding's answer rather than paged, so there is no
     * window to take and nothing here cuts them.
     *
     * A ROW HERE DOES NOT HOLD ITS SOURCE'S DELETE, which is the
     * known divergence {@link MemoryFindingSighting} states.
     * `SourceStore.countSourceDependents` reads what
     * {@link MemoryResearchStore.setSourceSightings} planted and
     * never these rows.
     */
    async listFindingSightings(
      findingId: number,
    ): Promise<readonly FindingSightingRecord[]> {
      return orderedSightings(findingId);
    },

    /**
     * One finding's rulings, newest first and WHOLE.
     *
     * THE FIRST ROW IS THE VERDICT IN FORCE and the rest are the
     * record of an operator changing their mind, which is why the
     * sequence is answered rather than the head of it. The table
     * carries no unique key at all, so re-judging appends and a read
     * that forgot to order would report whichever row it reached
     * first.
     */
    async listFindingLabels(
      findingId: number,
    ): Promise<readonly FindingLabelRecord[]> {
      return labelsOf(findingId).map(copyFindingLabel);
    },

    /**
     * What research has recorded about the entity one finding names,
     * newest first.
     *
     * ADDRESSED BY THE FINDING, RESOLVED THROUGH ITS ENTITY. The
     * join is this port's rather than the caller's, so a caller
     * holding a finding does not have to read its `entityId`, branch
     * on the nullability and address a second surface.
     *
     * AN UNATTRIBUTED FINDING ANSWERS AN EMPTY LIST, and so does an
     * id no finding carries. Neither is a failure to read: a null
     * `entity_id` is an ordinary state, and there is no entity to
     * resolve research through either way.
     *
     * READS `entity_research` AND WRITES NOTHING — there is no
     * insert, update or delete over that table anywhere on this
     * port, so the embedding is read-only structurally. Those rows
     * are `ar-research`'s to write, and
     * {@link MemoryResearchStore.setEntityResearch} is what stands
     * in for that writer here.
     */
    async listFindingResearch(
      findingId: number,
    ): Promise<readonly FindingResearchRecord[]> {
      const held = plantedFinding(findingId);

      if (held === null || held.row.entityId === null) {
        return [];
      }

      return orderedResearch(held.row.entityId);
    },

    /**
     * Appends one ruling to a finding. THE HALF'S ONE WRITE.
     *
     * APPENDS AND NEVER UPDATES. There is no upsert here and no key
     * to upsert on — `finding_labels` carries no unique key at all
     * — so a second ruling on one finding is a second row and both
     * are readable afterwards.
     *
     * TAKES THE VERDICT AS GIVEN. The owning domain's vocabulary is
     * read per request by `src/findings/verdict-service.ts`, one
     * layer up, and nothing here consults one. A store refusing a
     * verdict on its own would refuse writes the database accepts,
     * and would move a per-domain rule into the half that cannot be
     * exercised without a database.
     *
     * The id comes off the counter first, so the refusal below burns
     * one exactly as the sequence does. No measurement of this table
     * was taken: `personas` is where the gap of two was measured,
     * over a key refusal and a foreign-key one, and this counter is
     * expected to reproduce the second of that pair.
     *
     * THE STAMP IS READ OFF THE CLOCK AND NEVER OFF THE ARGUMENT,
     * which {@link InsertFindingLabelInput} has no member for. A
     * back-dated ruling is the one thing that would make the newest
     * row stop being the verdict in force.
     */
    async insertFindingLabel(
      input: InsertFindingLabelInput,
    ): Promise<FindingLabelRecord> {
      const id = nextFindingLabelId;

      nextFindingLabelId += 1;
      guardLabelFinding(input.findingId);

      const row: FindingLabelRecord = {
        id,
        findingId: input.findingId,
        verdict: input.verdict,
        note: input.note,
        labelledAt: stamp(),
      };

      findingLabels.set(id, row);

      return copyFindingLabel(row);
    },

    /**
     * One window of a domain's corpus, narrowed and ordered newest
     * first.
     *
     * READS DOCUMENTS AND WRITES NONE — there is no insert, update
     * or delete over that table anywhere on this port, so the corpus
     * page is read-only structurally rather than by convention. Every
     * row here arrived through
     * {@link MemoryResearchStore.setDomainDocuments}.
     *
     * BOTH STATUSES BY DEFAULT, and the filter is the CALLER's where
     * the failures queue's is that method's own. A failed document
     * is in the corpus rather than behind a flag, so this collection
     * can be asked for the corpus and for either half of it, which
     * is the difference between a debug page and a review queue.
     *
     * BODIES COME BACK AS STORED, unmasked and uncut.
     * `src/documents/service.ts` is what replaces a control byte with
     * its text form and cuts the body at `BODY_CODE_POINT_CAP`, and
     * keeping that out of here is what lets it be tested against a
     * planted control byte with no database.
     */
    async listDocuments(
      domainId: number,
      filter: DocumentFilter,
      window: StoreWindow,
    ): Promise<readonly DocumentRecord[]> {
      return orderedDocuments(domainId, filter)
        .slice(window.offset, window.offset + window.limit)
        .map(documentOf);
    },

    /**
     * How many of one domain's documents the same filter selects,
     * ignoring any window.
     *
     * The same predicate the page read through — one dataset and one
     * {@link matchesDocumentFilter} behind both is what makes a
     * page's `meta.total` describe the page's own collection here
     * rather than by coincidence.
     *
     * A window past the end still counts the whole, and an id no
     * domain carries counts zero. Neither is a special case: the
     * window is not this method's to read, and nothing points at a
     * row that is not there.
     */
    async countDocuments(
      domainId: number,
      filter: DocumentFilter,
    ): Promise<number> {
      return corpusOf(domainId).filter(
        (row) => matchesDocumentFilter(row, filter),
      ).length;
    },

    /**
     * One subject by its own id, or null.
     *
     * WHERE EVERY ENTITY ROUTE ENTERS, the path carrying an id rather
     * than a slug. The domain comes off the seam's key and reaches
     * the answer, which is what lets a service refuse an alias
     * pointing into another registry without a second read.
     */
    async findEntityById(id: number): Promise<EntityRecord | null> {
      const held = plantedEntity(id);

      return held === null
        ? null
        : entityOf(held.domainId, held.row);
    },

    /**
     * Rewrites the supplied members of one subject. THE HALF'S FIRST
     * WRITE.
     *
     * THE NAME MOVES AS A PAIR OR NOT AT ALL, which is
     * `EntityNamePatch`'s doing rather than a rule checked here: a
     * patch carrying one half is not a request this method can be
     * handed. Nothing below reduces a name, and
     * `src/lib/entity-name-norm.ts` stays the single definition.
     *
     * `attributes` REPLACES THE STORED PAYLOAD WHOLE and is never
     * merged into it, so `{}` clears every attribute — the same
     * whole-unit rule `DomainPatch` states for `settings`, and the
     * only shape under which removing a member is expressible.
     *
     * THE KEY IS CHECKED BEFORE THE FOREIGN KEY, and this is the one
     * half here where a single call can reach both: `name` and
     * `aliasOf` are both patchable, so a rename onto a taken key
     * BESIDE an alias naming nothing is a request that carries two
     * faults. The order is the relation the category half MEASURED
     * between a unique index and an end-of-statement check, argued
     * across rather than measured on this table.
     *
     * A ROW IS NOT IN CONFLICT WITH ITSELF. The comparison excludes
     * the row being written, so a rename that moves only the display
     * half — or one that rewrites both to what they already were — is
     * stored rather than refused.
     */
    async updateEntity(
      id: number,
      patch: EntityPatch,
    ): Promise<EntityRecord | null> {
      const held = plantedEntity(id);

      if (held === null) {
        return null;
      }

      const next: MemoryDomainEntity = {
        id: held.row.id,
        name: patch.name === undefined
          ? held.row.name
          : patch.name.display,
        nameNorm: patch.name === undefined
          ? held.row.nameNorm
          : patch.name.norm,
        aliasOf: patch.aliasOf === undefined
          ? held.row.aliasOf
          : patch.aliasOf,
        attributes: patch.attributes === undefined
          ? held.row.attributes
          : patch.attributes,
      };

      if (entityByNameNorm(held.domainId, next.nameNorm, id) !== undefined) {
        throw new StoreRefusal({
          reason: 'unique-violation',
          constraint: ENTITY_NAME_NORM_UNIQUE,
        });
      }

      guardAliasTarget(next.aliasOf);
      replaceEntity(held.domainId, copyPlantedEntity(next));

      return entityOf(held.domainId, next);
    },

    /**
     * One window of what has been found out about a subject, newest
     * first.
     *
     * READS A TABLE THIS PORT DOES NOT WRITE. `entity_research` is
     * `ar-research`'s, and every row here arrived through
     * {@link MemoryResearchStore.setEntityResearch} — the seam the
     * findings half plants through as well, one table read two ways.
     *
     * AN ID NO ENTITY CARRIES ANSWERS AN EMPTY LIST rather than
     * failing, and so does a window past the end: neither is a
     * failure to read, and nothing points at a row that is not there.
     * Summaries come back AS STORED.
     */
    async listEntityResearch(
      entityId: number,
      window: StoreWindow,
    ): Promise<readonly EntityResearchRecord[]> {
      return orderedEntityResearch(entityId)
        .slice(window.offset, window.offset + window.limit);
    },

    /**
     * How many passes have been recorded about a subject, ignoring
     * any window.
     *
     * Separate from the list rather than answered beside it, for the
     * reason `EntityStore` gives: a page's total describes the
     * collection and not the page.
     */
    async countEntityResearch(entityId: number): Promise<number> {
      return (entityResearch.get(entityId) ?? []).length;
    },

    /**
     * One window of the intentions queued against a subject, oldest
     * first.
     *
     * NOT NARROWED TO `pending`, which is where this differs from the
     * CLI listing it shares an order with: a subject's own queue is a
     * history of what was ever asked about it, and an approved or
     * closed row is the part a reader is most likely checking for.
     *
     * A ROW NAMING NO SUBJECT APPEARS IN NO PAGE HERE, `entityId`
     * being nullable and the parameter a number.
     *
     * NO ROUTE ON THIS WAVE CALLS IT, per `src/entities/store.ts`.
     */
    async listEntityPool(
      entityId: number,
      window: StoreWindow,
    ): Promise<readonly ResearchPoolRecord[]> {
      return orderedPool(entityId)
        .slice(window.offset, window.offset + window.limit);
    },

    /**
     * How many intentions stand against a subject, in any state and
     * ignoring any window.
     *
     * Selecting the same rows the list does — one
     * {@link poolRowsFor} behind both — which is what keeps a page's
     * total describing the page's own collection here rather than by
     * coincidence.
     *
     * NO ROUTE ON THIS WAVE CALLS IT either.
     */
    async countEntityPool(entityId: number): Promise<number> {
      return poolRowsFor(entityId).length;
    },

    /**
     * One intention by its own id, whatever subject it names.
     *
     * UNSCOPED ON PURPOSE, AND THAT IS WHAT MAKES THE CONTAINMENT
     * RULE DECIDABLE ONE LAYER UP. A read scoped to the entity would
     * answer null for `no such row` and for `not this subject's row`
     * alike, which are a `404` for different reasons and only one of
     * which is honest.
     */
    async findPoolRowById(id: number): Promise<ResearchPoolRecord | null> {
      const held = plantedPoolRow(id);

      return held === null
        ? null
        : poolRowOf(held.row);
    },

    /**
     * Rules in favour of one intention. THE HALF'S SECOND AND LAST
     * WRITE.
     *
     * IDEMPOTENT BY CONSTRUCTION. `approved_at` is written the way
     * `coalesce(approved_at, now())` writes it, so a second ruling
     * keeps the FIRST one's instant rather than re-dating a search
     * already paid for — `approveById` in `scripts/approve.ts` writes
     * the same pair the same way, and the two are one gate with two
     * clients.
     *
     * NOTHING IS ASKED OF THE ROW'S STATE. An id naming a row already
     * closed moves its status back to approved without moving the
     * stamp, and `research_pool_approval_check` permits that: it
     * holds the two timestamps against each other and never consults
     * the status. Whether a closed row may be ratified at all is
     * `RULING_ACTS` in `src/approvals/ruling.ts`, one layer up.
     *
     * IT RATIFIES AND NEVER RESEARCHES. Two columns of one row move
     * and nothing else does: no `entity_research` row is written, and
     * `researched_at` is not touched from here at all — which is why
     * this write cannot reach the CHECK from either side.
     *
     * THE STAMP IS READ OFF THE CLOCK, which stands in for the
     * server's `now()`. That is the transaction's start time in a
     * deployment, so approvals written together tie to the
     * microsecond with `id` breaking the tie.
     */
    async approvePoolRow(id: number): Promise<ResearchPoolRecord | null> {
      const held = plantedPoolRow(id);

      if (held === null) {
        return null;
      }

      const ruled: MemoryResearchPoolRow = {
        ...held.row,
        status: POOL_APPROVED_STATUS,
        approvedAt: held.row.approvedAt ?? stamp(),
      };

      replacePoolRow(held.domainId, ruled);

      return poolRowOf(ruled);
    },

    /**
     * One window of the passes the service has made, narrowed and
     * ordered newest first.
     *
     * READS RUNS AND WRITES NONE — there is no insert, update or
     * delete over that table anywhere on this port, so a pass is
     * read-only structurally rather than by convention, exactly as
     * the corpus page above is. Every row here arrived through
     * {@link MemoryResearchStore.setRuns}.
     *
     * EVERY RUN BY DEFAULT, THE DOMAIN-LESS TICKS INCLUDED. A filter
     * naming no domain widens to the whole table rather than to the
     * domain-scoped half of it, which is what keeps this page
     * agreeing with `runs` about how much work the service has done
     * — and the maintenance passes are exactly the rows a reader
     * goes looking for after something stopped happening.
     *
     * THERE IS NO SPELLING THAT ANSWERS THE TICKS ALONE, and that is
     * `RunFilter.domainId` being an optional `number` rather than a
     * decision taken here: there is no value a caller could send to
     * mean the ones belonging to nobody.
     */
    async listRuns(
      filter: RunFilter,
      window: StoreWindow,
    ): Promise<readonly RunRecord[]> {
      return orderedRuns(filter)
        .slice(window.offset, window.offset + window.limit)
        .map(runOf);
    },

    /**
     * How many runs the same filter selects, ignoring any window.
     *
     * The same predicate the page read through — one dataset and one
     * {@link matchesRunFilter} behind both is what makes a page's
     * `meta.total` describe the page's own collection here rather
     * than by coincidence.
     *
     * A window past the end still counts the whole, and an id no
     * domain carries counts zero. Neither is a special case: the
     * window is not this method's to read, and nothing points at a
     * row that is not there.
     */
    async countRuns(filter: RunFilter): Promise<number> {
      return runRows().filter((row) => matchesRunFilter(row, filter)).length;
    },

    /**
     * One pass by its own id, or null.
     *
     * WHERE EVERY `GET /runs/:id` REQUEST ENTERS, and it takes no
     * domain: a domain is met by slug and everything else on this
     * surface is written by its id. A null {@link RunRecord.domainId}
     * on the answer is the ordinary reading for a maintenance tick
     * rather than a row that failed to resolve.
     */
    async findRunById(id: number): Promise<RunRecord | null> {
      const row = runs.get(id);

      return row === undefined
        ? null
        : runOf(row);
    },

    /**
     * The head of one run's ledger: its model calls newest first,
     * cut at the limit its caller passes.
     *
     * THE LIMIT IS THE CALLER'S AND THE CUT IS NOT SILENT.
     * `src/runs/service.ts` passes `RUN_LEDGER_CAP`, reads
     * {@link RunStore.countRunLedger} beside this and answers a
     * truncation flag from the two, so nothing here chooses a limit
     * of its own — which would answer a short list with nothing
     * saying it was short.
     *
     * NEWEST FIRST, SO THE CUT DROPS THE OLDEST END. That is why the
     * order is the contract rather than a presentation choice: a read
     * that forgot to order would cut an arbitrary subset and report
     * the same count beside it.
     *
     * A CALL NAMING NO RUN IS UNREACHABLE HERE, whatever id is asked
     * for. {@link RunStore.summariseSpend} is the one method that
     * sees those rows.
     */
    async listRunLedger(
      runId: number,
      limit: number,
    ): Promise<readonly LlmCallRecord[]> {
      return orderedLedger(runId)
        .slice(0, limit)
        .map(llmCallOf);
    },

    /**
     * How many calls one pass ledgered, ignoring any limit.
     *
     * THE FULL COUNT IS WHAT MAKES THE CUT REPORTABLE, per
     * `src/runs/store.ts`: it is the number the service answers
     * beside the capped list and compares against the cap.
     *
     * An id no run carries answers zero, and so does a pass that
     * called nothing: the two are one fact from this method's side,
     * and {@link RunStore.findRunById} is what separates them.
     */
    async countRunLedger(runId: number): Promise<number> {
      return [...llmCalls.values()].filter(
        (row) => row.runId === runId,
      ).length;
    },

    /**
     * The ledger inside one window, aggregated into one bucket per
     * domain per UTC day.
     *
     * COUNTS AND MAGNITUDES, NEVER CURRENCY. `llm_calls` carries no
     * price, rate or amount column, so there is nothing behind a cost
     * for a bucket to answer and no member here is named for one.
     *
     * EVERY ROW IN THE WINDOW IS COUNTED, which is the property that
     * stops a total taken from this summary under-reporting: the
     * calls of a domain-less tick and the calls attributed to no run
     * at all both land in the null bucket, so the buckets' `calls`
     * add up to the number of calls the window holds.
     * {@link spendDomainOf} is the `LEFT JOIN` that makes that so.
     *
     * NARROWING BY DOMAIN EXCLUDES BOTH KINDS, correctly: neither is
     * that domain's. So the summaries of every domain do NOT sum to
     * the unfiltered one, and the difference is the unattributed
     * spend rather than a rounding of it.
     *
     * A BUCKET EXISTS BECAUSE CALLS LANDED IN IT. There is no row for
     * a day nothing was called on and none for a domain that made no
     * calls — a caller filling a chart supplies its own zeroes, and a
     * store inventing empty buckets would be answering a calendar it
     * was never told which of.
     */
    async summariseSpend(
      filter: RunFilter,
      window: TimeWindow,
    ): Promise<readonly SpendBucket[]> {
      const buckets = new Map<string, SpendBucket>();

      for (const row of llmCalls.values()) {
        const domainId = spendDomainOf(row);
        const wanted = filter.domainId === undefined
          || domainId === filter.domainId;

        if (wanted && calledWithin(row, window)) {
          addToBucket(buckets, row);
        }
      }

      return [...buckets.values()].sort(compareSpendBuckets);
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

    setConnectorSubscriptions(connectorId: number, count: number): void {
      connectorSubscriptions.set(connectorId, count);
    },

    setDomainFindings(
      domainId: number,
      findings: readonly MemoryDomainFinding[],
    ): void {
      // Copied on the way in, row by row, so a caller that goes on
      // moving a planted `createdAt` or writing into a planted
      // `fields` does not move stored state — and the list itself
      // is rebuilt, so pushing onto what was planted does not plant
      // a further finding.
      domainFindings.set(domainId, findings.map(copyPlantedFinding));
    },

    setFindingSightings(
      findingId: number,
      sightings: readonly MemoryFindingSighting[],
    ): void {
      findingSightings.set(findingId, sightings.map(copyPlantedSighting));
    },

    setEntityResearch(
      entityId: number,
      research: readonly MemoryEntityResearch[],
    ): void {
      entityResearch.set(entityId, research.map(copyPlantedResearch));
    },

    setDomainDocuments(
      domainId: number,
      documents: readonly MemoryDomainDocument[],
    ): void {
      // Copied on the way in, row by row, so a caller that goes on
      // moving a planted `capturedAt` does not move a stored one —
      // and the list itself is rebuilt, so pushing onto what was
      // planted does not plant a further document.
      domainDocuments.set(domainId, documents.map(copyPlantedCorpusDocument));
    },

    setDomainEntities(
      domainId: number,
      entities: readonly MemoryDomainEntity[],
    ): void {
      // Copied on the way in, row by row, so a caller that goes on
      // writing into a planted `attributes` does not move stored
      // state — and the list itself is rebuilt, so pushing onto what
      // was planted does not plant a further subject.
      domainEntities.set(domainId, entities.map(copyPlantedEntity));
    },

    setDomainPool(
      domainId: number,
      rows: readonly MemoryResearchPoolRow[],
    ): void {
      // Every row held against the CHECK BEFORE any is stored, so a
      // batch carrying one impossible state lands nowhere and the
      // previous plant is left standing. A guard applied row by row
      // as it stored would leave the collection half written, which
      // is a state one statement cannot produce.
      for (const row of rows) {
        guardPoolApproval(row);
      }

      domainPool.set(domainId, rows.map(copyPlantedPoolRow));
    },

    setRuns(rows: readonly MemoryRun[]): void {
      // Copied on the way in, row by row, so a caller that goes on
      // moving a planted stamp or writing into a planted `counts`
      // does not move stored state — and the collection is rebuilt
      // rather than added to, so pushing onto what was planted does
      // not plant a further pass.
      runs.clear();

      for (const row of rows) {
        runs.set(row.id, copyPlantedRun(row));
      }
    },

    setLlmCalls(rows: readonly MemoryLlmCall[]): void {
      // Rebuilt on the terms the seam above states. Keyed by the
      // call's own id, so a plant naming a run nothing stored is held
      // rather than dropped: the summary answers it in the null
      // bucket, which is what the left join would do.
      llmCalls.clear();

      for (const row of rows) {
        llmCalls.set(row.id, copyPlantedLlmCall(row));
      }
    },
  };
}
