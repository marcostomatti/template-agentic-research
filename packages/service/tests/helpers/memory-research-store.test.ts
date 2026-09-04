/**
 * `tests/helpers/memory-research-store.ts` in all twelve ports it
 * implements — the claims that make it a second implementation of
 * `DomainStore`, of `TaxonomyStore` WHOLE with categories and terms
 * together, of `PersonaStore`, of `TopicStore`, of `SourceStore`, of
 * `ConnectorStore`, of `SubscriptionStore`, of `SettingsStore`, of
 * `FindingStore`, of `DocumentStore`, of `EntityStore` and of
 * `RunStore`, rather than a bag that stores what it is handed.
 *
 * THAT IT REFUSES WHAT POSTGRES REFUSES. Every refusal case names
 * the `reason` a SQLSTATE classifies to and the constraint the
 * mechanism gave, not merely that something was thrown: a refusal
 * naming nothing would be indistinguishable from a bug in the fake,
 * and the services above switch on `reason`. Five mechanisms are
 * reachable across nine writes — `domains_slug_unique`,
 * `categories_domain_id_key_unique` and
 * `terms_category_id_pattern_unique` as unique violations, the
 * three branches of the depth trigger as one `check-violation`
 * naming NOTHING (a `RAISE ... USING ERRCODE` sets no constraint),
 * `categories_parent_id_categories_id_fk` under both of the
 * refusals that share its name, and
 * `terms_category_id_categories_id_fk` under the one that does not.
 * The personas half adds two more and reaches them from two writes:
 * `personas_domain_id_role_unique`, which refuses on an INSERT and
 * on an UPDATE alike, and `personas_domain_id_domains_id_fk`, which
 * the insert alone can reach because `domainId` is not patchable.
 * The topics half adds two more in that same shape and reaches them
 * from two writes as well: `topics_domain_id_name_unique`, which
 * refuses on an INSERT and on an UPDATE because `name` is
 * patchable, and `topics_domain_id_domains_id_fk`, which the insert
 * alone can reach because `domainId` is not. The sources half adds
 * SIX and reaches them from four calls, which is the widest
 * mechanism surface of any half here and the only one whose delete
 * is refused from OUTSIDE the row: `sources_kind_check`, the first
 * CHECK this file imitates, refusing on an INSERT and on an UPDATE
 * alike because `kind` is patchable;
 * `sources_domain_id_domains_id_fk`, which the insert alone reaches;
 * `documents_source_id_sources_id_fk` beside
 * `finding_sightings_source_id_sources_id_fk` and
 * `source_config_proposals_source_id_sources_id_fk`, three
 * `ON DELETE no action` keys in other tables that each hold the
 * delete of a source their rows still cite; and
 * `source_config_proposals_approval_check`, which no method reaches
 * at all — the fourth call is a SEAM, and the paragraphs on the
 * proposals half below carry why. The connectors half adds THREE and reaches
 * them from three calls as well, in a shape that is the sources
 * half's mirrored: `connectors_kind_name_unique` refusing on an
 * INSERT and on an UPDATE alike because `name` is patchable,
 * `connectors_kind_check` refusing on the INSERT alone because
 * `kind` is not, and
 * `export_subscriptions_connector_id_connectors_id_fk`, a single
 * `ON DELETE no action` key in another table holding the delete of a
 * connector its rows still name. The subscriptions half adds FOUR
 * and reaches them from two writes, which is the widest write
 * surface of any half here: the triple
 * `export_subscriptions_domain_id_format_connector_id_unique`
 * refusing on an INSERT and on an UPDATE alike, `format` and
 * `connectorId` both being patchable;
 * `export_subscriptions_format_check` refusing on both writes too,
 * which is the sources half's shape rather than the connectors
 * half's; `export_subscriptions_domain_id_domains_id_fk` refusing on
 * the INSERT alone, `domainId` being unpatchable; and
 * `export_subscriptions_connector_id_connectors_id_fk` on both —
 * the one constraint this file imitates from BOTH ENDS, the
 * connectors half meeting it as a refused DELETE. The settings half
 * adds NONE, and that is a measurement rather than a gap — see
 * below.
 *
 * THAT IT REFUSES THEM IN THE MEASURED ORDER. Four cases exist only
 * for that, because a request carrying two faults at once is the
 * only thing that can see any of it. On `categories`: a duplicate
 * key beside a parent that is itself a child answers the DEPTH
 * refusal, and a duplicate key beside a parent naming no row
 * answers the KEY — the BEFORE trigger runs while the row is still
 * being formed, and the foreign key is checked after the unique
 * index. On `terms`: a document repeating a pattern beside a
 * category that does not exist answers the REPEAT, and an empty
 * document into that same missing category is not refused at all,
 * because no statement runs for it. Every one was measured against
 * the live Postgres. It is the half a fake gets wrong by writing
 * its checks in the order they read well.
 *
 * THE TERM, PERSONA AND TOPIC HALVES ADD NO ORDER OF THEIR OWN, and
 * saying so is part of the claim rather than a gap in it. The term
 * key and the term foreign key are both about `category_id`, so a
 * write naming a category that does not exist cannot also duplicate
 * a pattern inside it — there is nothing stored there to duplicate
 * — and no case can tell which is asked first. The persona pair and
 * the topic pair stand in that same relation over `domain_id`, and
 * neither `personas` nor `topics` carries a CHECK or a trigger at
 * all, so each of those halves has two mechanisms and nothing
 * between them.
 *
 * THE SOURCES HALF HAS AN ORDER AND IT IS ARGUED RATHER THAN
 * MEASURED, which is a third answer to the same question and is
 * stated as such. A table CHECK is evaluated while the row is being
 * formed and a foreign key by an AFTER trigger at the end of the
 * statement — the same relation the category half MEASURED between
 * its BEFORE trigger and its own foreign key — so
 * `sources_kind_check` is asked first, on that reasoning and on no
 * reading of this table. No case pins it, because a write can carry
 * both faults and this file does not claim to know what a server
 * answers then. The two DELETE keys have no order either, and there
 * the reason is stronger than an absence of measurement: both are
 * end-of-statement checks over one statement, and
 * `src/sources/service.ts` reads the COUNTS rather than the
 * constraint name, so nothing downstream can tell which fired.
 *
 * THAT THE KEY THIS FILE ONCE DECLINED TO IMITATE IS IMITATED NOW,
 * because a seam made the state reachable.
 * `source_config_proposals_source_id_sources_id_fk` is a third
 * `ON DELETE no action` key onto `sources.id`, and while no seam
 * planted a proposal there was no dataset this store could be in
 * where it would fire, so leaving it alone was unreachability rather
 * than oversight — a fake refusing a state it cannot reach invents a
 * rule instead of imitating one.
 * `MemoryResearchStore.setDomainProposals` reaches it directly, so
 * three cases hold it: the feed a pending proposal names, the same
 * feed with an APPLIED one, since the key does not consult `status`,
 * and a fourth feed nothing has proposed for whose delete lands.
 * That last one is the positive control, and it is also what
 * `SourceStore.deleteSource` warns of — three zero counts still do
 * not promise the delete will land, `countSourceDependents` having
 * no member for a proposal.
 *
 * THAT ITS IDS COME FROM 1 AND ARE NOT GAPLESS. A refused insert
 * burns an id here because it burns one in Postgres, measured on a
 * `bigserial` carrying a UNIQUE key against the live server: insert
 * `a`, have a second `a` refused, insert `b`, and `b` holds id 3.
 * The same holds on `categories` for a DEPTH refusal as well as a
 * key one, and on `terms` for a duplicate pattern, both measured
 * there too. The case a reader would not predict is the UPSERT: a
 * two-row batch moved the sequence by two while inserting one row
 * and rewriting one, so a conflicting row takes an id and leaves it
 * unused. On `personas` the measurement is the widest of them: two
 * refused inserts between two accepted ones left a gap of two with
 * the FOREIGN KEY refusal included, which is why that half pins the
 * burn twice — once on the key and once on the foreign key. The
 * topics half pins the burn twice as well and on NO measurement of
 * its own: `topics` carries the same pair of mechanisms over the
 * same column `personas` does, so the gap of two measured there is
 * what its counter is expected to reproduce, and saying which
 * figure rests on a measurement is half the claim. `sources` pins
 * the burn twice as well, and its pair is the odd one: with NO
 * unique key there is no duplicate to burn an id, so the two cases
 * are the kind CHECK and the domain foreign key — and only the
 * second has a counterpart in the `personas` measurement the figure
 * rests on. The cases pin all of it, so a later case cannot come to
 * depend on a gaplessness only the fake has.
 *
 * THAT A DELETE CAN BE REFUSED BY ROWS IN ANOTHER TABLE, which is
 * the sources half's shape and no other's. `documents.source_id`,
 * `finding_sightings.source_id` and
 * `source_config_proposals.source_id` are all `ON DELETE no action`,
 * so a feed whose captures are in the corpus cannot be removed until
 * they are — argued at both columns, and most sharply at the second,
 * where `src/db/schema/findings.ts` states the sightings table IS
 * the provenance record. The two are separate claims rather than one
 * rule read twice, and one case exists only to say so: a source
 * carrying a sighting and NO document is refused, which a guard
 * reading the documents alone would take. Each refusal case carries
 * its positive control in the same body — the SAME call over the
 * sibling source nothing cites — and one case beside them drives the
 * `enabled` patch the refusal names as the operation that was
 * wanted, while the delete is still being refused.
 *
 * THAT THE PARSE-STATUS AGGREGATE IS COUNTED AND EVERY ZERO IS A
 * COUNTED ZERO. The record is built from `DOCUMENT_PARSE_STATUSES`
 * and then filled rather than accumulated as the rows are walked, so
 * a source that has captured nothing answers zero under each member
 * and so does a member with no rows on a source that has captured
 * plenty. Those two are separate cases: the first is the trap
 * `ParseStatusCounts` names — a status with no rows contributes no
 * group to a grouped read — and the second is the same claim from an
 * end an empty source cannot reach. A third case derives the key set
 * from the tuple rather than listing it, so a member added there
 * reddens here rather than leaving a status the aggregate silently
 * drops.
 *
 * THAT NOTHING ON THIS PORT WRITES A `documents` ROW, which is a
 * structural claim a case can only approach. `src/sources/store.ts`
 * says the absence IS the read-only rule; what this file can add is
 * that a queue read and a queue count leave the aggregate exactly as
 * it was, and that every document any case here has to exist came
 * through a SEAM rather than through a method. Three seams over this
 * half, and their shapes differ on purpose — rows for the documents,
 * because three reads answer rows; a number for the sightings,
 * because `countSourceDependents` is the only thing that can ask
 * about one at all; and rows for the config proposals, keyed by the
 * DOMAIN rather than by the feed, which is the one place a seam here
 * departs from its neighbours.
 *
 * THAT AN UPSERT REWRITES THREE COLUMNS AND KEEPS THE STORED ROW'S
 * ID. Measured: the statement answered the STORED id with `weight`,
 * `polarity` and `notes` rewritten from the submitted row. Both
 * halves are cases of their own, because a term keeping its id
 * across a re-import is what lets import, export and re-import
 * settle rather than accumulate a second row counting the same
 * match twice — and a store writing a fresh row would pass every
 * assertion about the three columns.
 *
 * THAT ONE FAULT IS DELIBERATELY NOT A `StoreRefusal`. A document
 * repeating a pattern is SQLSTATE 21000, `classifyPgError` does not
 * recognise it, and `src/taxonomy/store.ts` states the no-repeat
 * rule as a PRECONDITION its caller checks — so the store throws a
 * plain `Error`, which reaches a route as a 500 exactly as a
 * deployment would. Those cases go through `plainErrorFrom` rather
 * than `refusalFrom`, and it throws when what arrived WAS a
 * refusal: a `StoreRefusal` would satisfy any assertion about a
 * thrown error, and offering a caller a tidy status the database
 * never gave is the failure being ruled out.
 *
 * THAT THE CONNECTORS HALF REFUSES TWO MECHANISMS SITTING ON
 * DIFFERENT WRITES, which is the mirror of the sources half rather
 * than a copy of it. `connectors_kind_name_unique` refuses a kind
 * and name pair the deployment already carries on an INSERT and on
 * an UPDATE alike, because `name` is patchable;
 * `connectors_kind_check` refuses a `kind` outside `CONNECTOR_KINDS`
 * on the INSERT alone, because `kind` is deliberately absent from
 * `ConnectorPatch` and no update here is written against the CHECK.
 * There is no order between them and none is claimed: the key opens
 * on the very column the CHECK constrains, so a write proposing a
 * kind outside the tuple can duplicate nothing.
 *
 * THAT ITS KEY IS PER KIND AND ITS CHECK IS READ OFF THE RUNTIME
 * TUPLE. Three cases widen rather than narrow, which is the
 * direction a refusal case cannot reach on its own: the same name
 * under a second kind is accepted, a rename onto a name a second
 * kind holds is accepted, and every member of `CONNECTOR_KINDS` is
 * looped over and accepted rather than a list written out here. That
 * last one is two-directional for free — a member ADDED to the tuple
 * reaches the case, and a store narrowing the guard to some of them
 * fails it — and it is what keeps the refusal case above from being
 * satisfied by a store that refuses every kind.
 *
 * THAT ITS DELETE IS REFUSED FROM OUTSIDE THE ROW BY EXACTLY ONE
 * KEY. `export_subscriptions_connector_id_connectors_id_fk` is `ON
 * DELETE no action`, so a connector an export subscription still
 * names holds its own delete — one key rather than the sources
 * half's two, re-derived from the generated SQL rather than taken
 * from a plan, which is the reading that half's plan got wrong. The
 * refusal case carries its positive control in the same body, the
 * SAME call over the sibling nothing names, and the count case
 * beside it reads what a `409` would carry.
 *
 * THAT NO DOMAIN DELETE REACHES IT AT ALL, which is the claim only
 * this half and the settings half can make and which they make
 * differently. `connectors` carries no `domain_id`, so a connector
 * outlives every domain that named it; the case deletes a domain
 * holding sources and a topic, asserts THOSE are gone as its control
 * that the delete reached anything, and then asserts all three
 * connectors are standing. A store sparing the connectors by sparing
 * everything fails it.
 *
 * THAT ITS PAGE IS ORDERED BY THE PAIR AND NARROWED BY A FILTER
 * RATHER THAN SCOPED BY AN OWNER. The fixture is written in an order
 * no read answers — the notebook goes in first and its name sorts
 * before both of the others — so one case tells an ordering by
 * `(kind, name)` from an ordering by insertion and from one by name
 * alone. The kind is a FILTER and not a scope: an absent one answers
 * every row rather than none, and a kind no row carries is an empty
 * page rather than a refusal. The count reads through the same
 * predicate, which one case holds against the page it describes.
 *
 * THAT ITS `config` IS COPIED IN BOTH DIRECTIONS, AND THAT THIS IS
 * THE ONE COPIED DOCUMENT IN THIS FILE THAT IS A LIVE CREDENTIAL.
 * The port answers the column AS STORED — masking is
 * `src/connectors/service.ts`'s, one layer up — so what the copy
 * rules out is a caller writing into a stored secret through a
 * member the port declares `readonly`. There is one case per ANSWER
 * SITE rather than one per helper, each mutating one level down and
 * comparing against the fixture FUNCTION rather than against a
 * record an earlier call answered: a store handing out its own
 * object has aliased the two, and the comparison would then hold one
 * lie against itself and pass. A seventh case reads the credential
 * out of the REFUSAL as well, counted the way the sibling halves
 * count a name, because a refusal built over a config is the first
 * thing on this surface that could carry one onward.
 *
 * THAT ITS `config` IS REPLACED WHOLE RATHER THAN MERGED INTO, which
 * on this table has a sharper consequence than on a domain's
 * `settings` and is asserted rather than smoothed over: a patch
 * omitting a secret's key has CLEARED that secret, and the request
 * doing it by accident is byte-identical to the one doing it on
 * purpose. Under a merge the credentials survive the case that
 * replaces the config with an endpoint alone.
 *
 * THAT THE SUBSCRIPTIONS HALF KEYS ON A TRIPLE, AND THAT TWO THIRDS
 * OF IT ARE PATCHABLE. No PAIR of the domain, the format and the
 * connector identifies a subscription, so the widening controls a
 * per-kind key needs become THREE here and each is a case: a second
 * format at one connector, a second connector for one format, and
 * the same pair under a second domain. A store keying on any pair
 * refuses one of the three. The refusals come in two on the INSERT
 * and two on the UPDATE — a re-point onto a held triple and a
 * reformat onto one — because a store checking only the member it
 * was handed passes whichever of the two it happened to check.
 *
 * THAT ITS CHECK SITS ON BOTH WRITES AND ITS TWO FOREIGN KEYS SIT ON
 * DIFFERENT ONES. `export_subscriptions_format_check` is
 * `sources_kind_check`'s shape rather than `connectors_kind_check`'s,
 * `format` being patchable, so it has an insert case and a patch
 * case; `export_subscriptions_domain_id_domains_id_fk` has an insert
 * case and a case asserting the patch cannot reach it at all, since
 * `SubscriptionPatch` declares no `domainId`; and
 * `export_subscriptions_connector_id_connectors_id_fk` has both,
 * because re-pointing a delivery is exactly the request that can name
 * a connector somebody has just retired. The acceptance control loops
 * the RUNTIME `EXPORT_FORMATS` rather than a list written out here,
 * and does it at ONE connector, so it is the key's second widening
 * control in the same body.
 *
 * THAT ONE CONSTRAINT IS IMITATED FROM BOTH ENDS, which is true of no
 * other mechanism in this file. Read from `connectors` the connector
 * foreign key holds a DELETE; read from here it refuses a WRITE. One
 * case drives both in the same body and asserts they name the same
 * key and the same reason, so a rename on either side that missed the
 * other reddens here rather than in a deployment.
 *
 * THAT A DOMAIN TAKES ITS SUBSCRIPTIONS AND STOPS THERE. The cascade
 * on `domain_id` takes them; the `ON DELETE no action` on
 * `connector_id` points the other way, so the connectors those rows
 * named are left standing — which is a domain delete CLEARING
 * subscriptions out of a connector's way rather than taking the
 * connector with them. Both halves are cases, and the second one
 * carries the count of the removed rows beside it so a store sparing
 * the connectors by sparing everything fails.
 *
 * THAT ITS DELETE CANNOT BE REFUSED, re-derived rather than assumed:
 * nothing in the generated SQL references
 * `public.export_subscriptions`, read in the same command as the one
 * reference to `public.connectors` that is the live needle beside it.
 * The case drives the connector delete in the same body, refused
 * under the very rule this one has no counterpart of, which is what
 * says the acceptance is a fact about the table rather than a store
 * that refuses nothing.
 *
 * THAT THIS HALF INTRODUCES THE FILE'S SECOND KNOWN DIVERGENCE, and
 * that it is pinned rather than left to be discovered.
 * `countConnectorDependents` reads what
 * `setConnectorSubscriptions` planted and never the rows this half
 * writes, so a stored subscription answers a counted zero and its
 * connector's delete LANDS where a deployment would refuse it —
 * the decision `setDomainDependents` already took, for its reason,
 * and the seam's own TSDoc carries why. Two cases read it from either
 * face: the connector deleted out from under a stored subscription,
 * and the row left behind naming an id nothing carries. Each carries
 * a control in the same body — the plant still refusing a delete,
 * and the foreign-key guard still refusing a write onto the gone id
 * — so neither case describes a guard that had simply stopped
 * working. `tests/live/api-wave2.live.test.ts` is where the counted
 * answer is discharged.
 *
 * THAT ITS PAGE IS ORDERED BY THE PAIR AND SCOPED BY ITS DOMAIN. The
 * fixture is written in an order no read answers, and the second half
 * of that is arithmetic rather than taste: `feed` goes in first while
 * its format sorts last, and `archive` goes in before `digest` though
 * its connector sorts after. Seeded the other way round, an ordering
 * by format ALONE and an ordering by the pair agree, and the
 * connector tie-break is pinned by nothing — measured, the leg
 * dropping it reddened ZERO cases until the seed was reordered, and
 * reddens 3 now.
 *
 * THAT ITS DUE TIME IS THE ONE MUTABLE MEMBER IT CARRIES, and it is
 * `topics.next_run_at` again rather than a second claim: both tables
 * spread the same `schedulableColumns()` helper. So the topic half's
 * six cases repeat here over one column instead of two, the seventh
 * being the branch a subscription nobody has run now needs — a
 * copy reaching for the instant unconditionally throws on a null, and
 * the three answer sites are asserted in one body.
 *
 * THAT THE FINDINGS HALF PLANTS THREE TABLES AND WRITES ONE, which
 * is a shape no half above has. `FindingStore` declares six readers
 * and one writer, so `findings`, `finding_sightings` and
 * `entity_research` arrive through seams and only `finding_labels`
 * is appended to. The consequence for this file is that the half has
 * ONE mechanism rather than the sources half's four:
 * `finding_labels_finding_id_findings_id_fk`, refusing a ruling
 * appended onto a finding that is not there. Its case carries the
 * positive control in the same body and the id-burn case beside it
 * pins the counter, on the `personas` measurement rather than one of
 * this table's own.
 *
 * THAT ITS PAGE IS ORDERED BY `compareFindings`' KEYS AND THAT THE
 * TAIL IS NOT THE FLOOR. The fixture is planted in an order no read
 * answers and its five rows tell the score ordering from the recency
 * one and both from either direction of `id`: two rows carry one
 * score AND one stamp, so only the tiebreak separates them, and they
 * are planted with the LOWER id first so that a stable sort losing
 * that tiebreak answers them the wrong way round rather than
 * reproducing the right order by accident. One case reads the
 * absent score against a ZERO one, which is the pair a store
 * reading null as zero gets wrong: those two tie on the first key
 * and fall through to the stamp, and the unscored row is the newest
 * in the fixture.
 *
 * THAT ITS VERDICT FILTER READS THE LATEST RULING AND NOT ANY, which
 * needs a finding judged TWICE before any case can see it. The
 * re-judged row falls out of the first verdict and into the second
 * while both labels stay readable, so a store matching any label
 * answers both findings and a store reading the head of an unordered
 * read answers whichever it reached. One case ties the two stamps
 * under a fixed clock, which is where `id` is the only thing
 * deciding what is in force.
 *
 * THAT ITS CATEGORY FILTER IS THE COLUMN READ AND NOT THE DIGEST'S.
 * `fields->>'category'` answers TEXT, so a numeric member is matched
 * by its digits and a store comparing only strings answers an empty
 * page where a deployment answers a row. A key the domain never
 * declared answers a page and a key it DID declare that nothing
 * carries answers none, which is one case reading both directions:
 * no column links a finding to a category, so the taxonomy in force
 * decides neither. A third case plants an INHERITED member and reads
 * it back gone, which is the seam storing what a `jsonb` column
 * would.
 *
 * THAT ITS WINDOW IS HALF-OPEN AND THAT A NULL BOUND IS UNBOUNDED.
 * One case takes the lower boundary and drops the upper in the same
 * body, one reads each bound alone against the unbounded page, and
 * one drives all three members at once so that the filter is shown
 * selecting an intersection rather than the last member written.
 *
 * THAT IT PLANTS SIGHTINGS AS ROWS WHERE THE SOURCES HALF PLANTS A
 * NUMBER, OVER ONE TABLE. That is this file's FOURTH known
 * divergence and it is pinned from both faces: a sighting planted
 * through the findings seam answers a `findingSightings` count of
 * zero and its source's delete LANDS, while the planted number in
 * the sibling case still refuses that same delete. Neither case
 * describes a guard that had stopped guarding.
 *
 * THAT A PLANTED FINDING DOES NOT MOVE THE DOMAIN DEPENDENT COUNT,
 * which is the THIRD known divergence and is
 * `setConnectorSubscriptions`' decision taken again for its reason.
 * The case reads the counted zero beside a page of five and then
 * plants the number to show the guard still reads it.
 *
 * THAT A DOMAIN TAKES ITS FINDINGS AND TWO TABLES BELOW THEM. The
 * cascade case asserts the state BEFORE the delete so the three
 * empties after it are a delete reaching them rather than reads that
 * never answered, a sibling domain's finding is left standing so a
 * store clearing everything fails, and a third case appends a ruling
 * onto the gone finding and reads the foreign key refusing it.
 *
 * THAT THE RESEARCH EMBEDDING IS ADDRESSED BY THE FINDING AND
 * RESOLVED THROUGH ITS ENTITY. Two findings attributed to one
 * subject answer the same rows, a finding attributed to another
 * answers that one's, and an unattributed finding answers an empty
 * list with the attributed sibling in the same body as the control.
 * An id no finding carries answers the same empty list, which is the
 * one place two different absences legitimately compare equal.
 *
 * THAT THE DOCUMENTS HALF WRITES NOTHING AT ALL, which is a shape no
 * half above has: two methods, both reads, no mechanism to refuse
 * with and no id to burn. So there is no refusal case in this half
 * and no id-sequence case either, and both absences are the port's
 * shape rather than coverage nobody wrote.
 *
 * THAT ITS PAGE IS `captured_at` DESCENDING WITH `id` DESCENDING AND
 * THAT THE TIE IS THE SERVER'S OWN. The fixture plants five
 * documents in an order no read answers, and its NEWEST row carries
 * the LOWEST id so that an ordering by `id` in either direction
 * disagrees with the answer rather than resembling it. Two rows
 * carry ONE instant and are planted with the lower id first, so a
 * stable sort that lost the tiebreak answers them the wrong way
 * round; one case reads both their stamps off the store before
 * asserting the order, which is what makes the tie a measurement
 * rather than a fixture comment.
 *
 * THAT A FAILED DOCUMENT IS IN THE CORPUS RATHER THAN BEHIND A FLAG.
 * The default page's statuses are read as a SET against
 * `DOCUMENT_PARSE_STATUSES` rather than counted, since a store
 * answering five `ok` rows passes a length assertion; and the two
 * narrowed pages are asserted in ONE body, which is what says the
 * filter selects rather than that `failed` happens to name
 * everything. A status no row carries is an empty page rather than a
 * refusal, with the unnarrowed page beside it as the control.
 *
 * THAT IT HOLDS DOCUMENTS THE FAILURES QUEUE STRUCTURALLY CANNOT.
 * One case reads a null `sourceId` back with a sibling carrying the
 * feed in the same body, because the state that makes this
 * collection wider than the queue is the one
 * {@link MemoryResearchStore.setSourceDocuments} has no key to plant
 * at all.
 *
 * THAT IT PLANTS THE SAME TABLE THE SOURCES HALF PLANTS, KEYED
 * DIFFERENTLY. That is this file's FIFTH known divergence, and it is
 * pinned from both faces: a `failed` corpus document answers a queue
 * of zero, an aggregate of zero and a dependent count of zero, so
 * its source's delete LANDS, while the sibling case plants through
 * the sources seam and reads that same delete refused by name. A
 * third case reads the divergence the other way round, a queued
 * failure being absent from the corpus page. None of the three
 * describes a guard that had stopped guarding.
 *
 * THAT A DOMAIN TAKES ITS CORPUS THROUGH A SECOND CASCADE LINE OVER
 * A TABLE THE SOURCES LINE HAS ALREADY REACHED. The two seams hold
 * `documents` separately, so one case asserts the state BEFORE the
 * delete and then reads BOTH seams empty after it — which is what
 * says the two lines are two claims rather than one written twice.
 *
 * THAT THE SETTINGS HALF REFUSES NOTHING AT ALL, which no case here
 * can assert directly and which is therefore stated rather than
 * pinned. `operator_settings` carries two mechanisms — a second
 * insert at the singleton id is 23505 naming
 * `operator_settings_pkey`, and any id but 1 is 23514 naming
 * `operator_settings_singleton_check` — and `SettingsStore` takes
 * no id, so a caller can reach neither. There is no refusal case in
 * this half because there is no refusal, and a fake inventing one
 * would be offering a status the database never gives.
 *
 * THAT NULL AND `{}` ARE TWO ANSWERS, though `src/settings/service.ts`
 * answers `{}` for both. A read before any write is null and a read
 * after a write of `{}` is `{}`: whether a row exists is a fact, and
 * collapsing it into the empty payload is a decision the port leaves
 * to its caller. The two halves sit in ONE case body, because the
 * null is worth nothing without the payload beside it — a store
 * answering null for everything satisfies the first assertion alone.
 *
 * THAT A FIRST WRITE AND A REWRITE ARE ONE CALL, AND THE PAYLOAD IS
 * REPLACED WHOLE. There is no row to create first and no count to
 * read, so `holding exactly one payload` is asserted by what a read
 * answers after two writes and by nothing else: under a merge it
 * carries the two members the replacement does not, and under the
 * empty rewrite it carries every member of what it replaced. That
 * last case is the one a merge cannot survive — omitting a
 * preference is how it is removed, so a merging store makes removal
 * unexpressible.
 *
 * THAT A DOMAIN DELETE SPARES THE SETTINGS. `operator_settings`
 * carries no `domain_id` and no foreign key, so the cascade that
 * reaches a domain's personas and both levels of its taxonomy
 * reaches nothing here — and a `defaultDomainSlug` naming the
 * deleted domain is left dangling on purpose, which
 * `src/settings/store.ts` records as reading like no default being
 * set. The case carries the delete's own answer beside it, so a
 * store that spared the settings by sparing everything would fail.
 *
 * THAT NOTHING MUTABLE IS SHARED ACROSS THE BOUNDARY. Every `Date`,
 * every `settings` payload — a domain's and the operator's alike
 * — and every category, term, persona, topic, source and connector
 * row is copied in both directions, so a caller cannot write into
 * stored state through a field the port declares `readonly`. A topic
 * carries two mutable members rather than one and they are separate
 * claims: its
 * `searchTerms` list, which a caller could otherwise push a term
 * onto through a `readonly` array, and its `nextRunAt`, which is
 * the first date here that arrives as an ARGUMENT rather than off
 * the clock — so the schedule write is copied on the way IN as well
 * as out, and a caller that kept the `Date` it passed cannot go on
 * moving the stored due time. The operator's payload has
 * THREE answer sites rather than two, and one case each: the
 * argument a write was handed, the payload that write answered, and
 * the payload a read handed out. The three legs are DISJOINT,
 * reddening one case apiece, which is what says they are three
 * claims rather than one written three times. Each of those
 * cases MUTATES what it was handed and reads the row back, and each
 * compares against a CONSTANT or a primitive captured beforehand
 * rather than against the record an earlier write answered: a store
 * handing out its own objects has aliased the two, and the comparison
 * then holds one lie against itself and passes. Measured — two of the
 * four term copy cases were green under the leg until their
 * expectations stopped naming the seeded record.
 *
 * A SOURCE CARRIES TWO `jsonb` DOCUMENTS AND A PLANTED DOCUMENT
 * CARRIES A `Date`, which is where this claim lands on the sources
 * half. `parserConfig` and `contract` take a JSON round trip rather
 * than a spread, because neither column carries a `$type` and so
 * there is no declared depth a spread could be written to; one case
 * mutates a nested member of each on the way in, at BOTH call sites
 * in one body, because the patch copies them separately and a case
 * naming one is green against a store that shares the other
 * (measured: aimed at `parserConfig` alone, the leg that stops
 * copying `contract` reddened nothing). The seam copies each
 * `capturedAt` on the way in and the queue copies it on the way out,
 * and the seam rebuilds the LIST as well, so pushing onto what was
 * planted does not plant a further row.
 *
 * THE STAMPS ON A SOURCE ARE THE ONE COPY NO CASE HERE REACHES, and
 * it is a measured hole rather than a claim. `lastSuccessAt` and
 * `lastFailureAt` are pipeline-owned: no port method writes either
 * and neither seam plants one, so every stored source carries null
 * under both and the non-null branch of the copy has no subject. One
 * case pins the nulls, the record's own type pins the branch, and
 * the live seam is where a stamped row can exist at all.
 *
 * THAT A DOMAIN DELETE IS NOT REFUSED BY THE GUARD THAT REFUSES A
 * CATEGORY DELETE. `categories.parent_id` is `NO ACTION`, so
 * removing a category that still holds children is refused — and
 * the domain cascade, which removes a parent and its children in
 * one statement, is not. The two sit in adjacent describes because
 * a fake that reused one for the other would look right in every
 * case that has only one level of taxonomy.
 *
 * THAT THE CASCADE REACHES TWO LEVELS DOWN AND REFUSES NOTHING.
 * `terms.category_id` is `ON DELETE CASCADE`, so a category delete
 * takes its terms and a domain delete takes its categories AND
 * theirs — measured, both left zero rows behind. Holding terms is
 * therefore no reason to refuse a category delete, which is a case
 * of its own: only CHILDREN refuse it, and a store reusing that
 * guard over its terms refuses a delete Postgres takes.
 *
 * THAT A DOMAIN TAKES ITS PERSONAS AND ITS TOPICS, AND NOTHING ELSE
 * DOES. `personas.domain_id` and `topics.domain_id` cascade like
 * every other foreign key onto `domains.id`, so one delete reaches
 * both of them and both levels of taxonomy together; and because
 * nothing in schema v2 points at either table, a persona delete and
 * a topic delete each have neither a guard nor a cascade and cannot
 * be refused at all. Each half states those two claims as adjacent
 * cases because they are the same fact read from either end, and
 * each second case carries the category delete beside it as its
 * control — refused for holding children under the very same
 * domain.
 *
 * THAT A DOMAIN TAKES ITS SOURCES TOO, AND TAKES ONES THEIR OWN
 * DELETE WOULD REFUSE. That is the `ON DELETE no action` trap read
 * from the cascade's side, and it is the sharpest thing the sources
 * half asks: the domain columns on `documents` and on
 * `finding_sightings` cascade as well, so one statement removes the
 * sources and the rows that were holding them, and the
 * end-of-statement check finds nothing left citing a source that is
 * gone. A store reusing its own guarded delete inside the cascade
 * refuses a delete Postgres takes, and does it only for the domains
 * whose feeds have captured anything — which is why the case drives
 * the refusal FIRST and then the domain delete, in one body. A
 * second case reads the other half: the plants go with the sources,
 * so no dependent count and no queue survives for a source that no
 * longer exists.
 *
 * THE ENTITIES HALF ADDS TWO MECHANISMS AND IS THE FIRST HALF HERE
 * WHERE ONE CALL REACHES BOTH.
 * `entities_domain_id_name_norm_unique` refuses a rename landing on
 * a key another subject in the same domain already holds, and
 * `entities_alias_of_entities_id_fk` refuses an `aliasOf` naming an
 * id no entity carries. `name` and `aliasOf` are both members of one
 * `EntityPatch`, so a single request can carry both faults — which
 * is exactly what the term, persona and topic halves each said they
 * could NOT do, and it is why this half pins an order the three of
 * them have nothing to pin. Neither mechanism sits on a delete:
 * `EntityStore` declares none.
 *
 * ITS ORDER IS ARGUED AND IT IS ALSO PINNED, which no other argued
 * order here is. The sources half argues one and says no case can
 * see it; here a rename onto a taken key BESIDE an alias naming
 * nothing is a request a case can make, so the case makes it and
 * reads the KEY. What the order rests on is still the relation the
 * category half MEASURED between a unique index and an
 * end-of-statement check, carried across rather than measured on
 * this table, and the case's second half drives the alias fault
 * ALONE to show that it was a fault at all.
 *
 * ITS CHECK IS HELD BY THE SEAM AND NOT BY A METHOD, which is a
 * shape no half above has.
 * `research_pool_approval_check` holds two columns against each
 * other, and no call on this port can propose the state it refuses:
 * the approval only ever moves `approved_at` from null to an
 * instant, and nothing writes `researched_at` at all. So the plant
 * is where it is raised, over the WHOLE batch rather than row by
 * row, and one case reads the legal row beside the refused one being
 * left unstored. Its sibling `research_pool_status_check` is held by
 * the TYPE instead — {@link MemoryResearchPoolRow} declares that
 * member as the union — so it has no case here, exactly as
 * `documents_parse_status_check` has none.
 *
 * THAT ITS TWO COLLECTIONS RUN OPPOSITE WAYS, and each fixture is
 * planted in the order its own tiebreak REVERSES. Research is
 * `researched_at` descending with `id` descending, and the pool is
 * `created_at` ASCENDING with `id` ascending — the one queue this
 * file imitates, `listPending` in `scripts/approve.ts` member for
 * member. In both, the row carrying the extreme stamp also carries
 * the extreme id the OTHER way, so an ordering by `id` alone
 * disagrees with the answer rather than resembling it.
 *
 * THAT THE SAME `entity_research` ROWS ARE ANSWERED ONE MEMBER
 * SHORT. One seam plants that table and two ports read it, so a case
 * reads the key SET off this half's record and finds no `entityId`
 * on it: the subject is the PATH here, where a caller of
 * `listFindingResearch` named a finding and the entity is what the
 * port resolved.
 *
 * THAT THE APPROVAL KEEPS THE FIRST RULING'S INSTANT. The case moves
 * the clock BETWEEN the two rulings and reads the second answer
 * against the first, with a row nobody has ruled on taking the
 * second reading in the same body — without that control a store
 * whose clock had stopped would pass. A third case ratifies a row
 * already CLOSED and reads the whole row back, which is what says
 * nothing is asked of the row's state and that `researched_at` is
 * not touched from here.
 *
 * THAT A DOMAIN TAKES ITS REGISTRY, THE RESEARCH UNDER IT AND ITS
 * QUEUE, BY TWO DIFFERENT ROUTES. The research goes two levels down
 * through the entities; the intentions go directly, which is why the
 * case reads the row naming NO subject going as well — a cascade
 * written through the registry would leave it. A fourth case reads
 * the other side of the seam's key: research planted under an id no
 * entity carries has nothing to cascade from and survives, which is
 * the state the findings half's own fixture is in.
 *
 * THAT A CROSS-DOMAIN CITATION IS A DELETE THIS STORE TAKES AND A
 * DEPLOYMENT REFUSES. That is the file's sixth known divergence, and
 * it is pinned from both faces: one case plants an intention in a
 * SECOND domain naming the first's subject and reads the delete
 * landing with the citation left dangling, and a sibling reads the
 * same key holding nothing when both rows go together.
 *
 * THE RUNS HALF ADDS NO MECHANISM A CALL CAN REACH, and it is the
 * SECOND half here to add none rather than the first — the documents
 * half got there with two methods and this one with six. `runs`
 * carries `runs_status_check` and `runs_scheduled_by_check` where
 * `documents` reached neither, and both read a SINGLE column, so
 * {@link MemoryRun} declares those two members as the unions and
 * neither has a case: a plant outside `RUN_STATUSES` or
 * `RUN_SCHEDULERS` does not compile, exactly as
 * `documents_parse_status_check` and `research_pool_status_check`
 * have no case for their own tables' sake. There is no writer on this
 * port at all, so no foreign key here is reachable from a call
 * either, and this half throws nothing.
 *
 * THAT ITS TWO COLLECTIONS ARE PLANTED FLAT, which is a claim about
 * two NULLABLE columns rather than about a seam's convenience.
 * `runs.domain_id` and `llm_calls.run_id` are both nullable, so the
 * subject of this half's load-bearing cases — a maintenance tick that
 * belongs to no domain, and a call attributed to no pass — has no key
 * to be planted under at all. Cases read both: the tick is IN the
 * unfiltered page and in NONE of the narrowed ones, and the call
 * naming no run is in NO ledger and in EVERY summary.
 *
 * THAT ITS TWO ORDERS RUN THE SAME WAY AND ARE EXPRESSED TWICE.
 * `started_at DESC, id DESC` on the page and
 * `called_at DESC, id DESC` on the ledger, each planted in the order
 * its own tiebreak REVERSES and each with the extreme stamp on the
 * extreme id the OTHER way, so an ordering by `id` alone disagrees
 * with the answer rather than resembling it. The unfiltered page adds
 * a reading neither narrowed one can make: its last tie is between
 * two DOMAINS, so the tiebreak is a comparison across the collection
 * rather than within a scope.
 *
 * THAT THE SPEND SUMMARY GROUPS ON TWO AXES AND COUNTS EVERY ROW. The
 * day axis is read with a pair of calls ONE MILLISECOND apart across
 * a UTC midnight, which nothing but the truncation can separate; the
 * domain axis is read through the join, since `llm_calls` carries no
 * domain of its own; and the coverage property is read as a
 * PARTITION, the buckets' `calls` adding up to the whole ledger while
 * the two domains' own summaries fall three calls short of it. Its
 * two magnitudes are read on a bucket where one call was measured on
 * both axes, one on the characters alone and one on neither, which is
 * what separates a sum from a count and the two sums from each other.
 *
 * THAT ITS WINDOW IS HALF-OPEN OVER `called_at`, read with both
 * bounds landing exactly ON a planted call. A separate case spans two
 * EMPTY days, which is what says a bucket exists because calls landed
 * in it rather than because a calendar has that day.
 *
 * THAT A DOMAIN TAKES ITS PASSES AND THEIR LEDGER AND LEAVES THE
 * TICKS. Two levels, as the findings half's cascade is, with the
 * survivals read in the same bodies: the tick and the second domain's
 * pass stand, and so do the calls naming no run. A CROSS-DOMAIN
 * RESULT is the file's SEVENTH known divergence and is pinned from
 * both faces exactly as the sixth is — one case records research in a
 * SECOND domain naming the first's run and reads the delete landing
 * with the citation left dangling, and a sibling reads the same key
 * holding nothing when both rows go together.
 *
 * Several cases carry a positive control in the same body rather
 * than in a sibling case, because each is asking a question a broken
 * store answers the same way by accident: a store refusing every
 * write passes a refusal assertion, and a store refusing nothing
 * passes an acceptance one. So the duplicate-key cases insert a
 * second row under a different key, the depth cases repeat the same
 * write from a position the rule allows, the delete-refused case
 * removes the childless row with the very same call, and the term
 * foreign-key case writes the same row into a category that exists.
 * The containment readings over a serialised error count
 * occurrences rather than asserting absence, with the same count
 * taken over a planted message: a search that would find nothing
 * anywhere reports a clean refusal and a leaking one alike.
 *
 * MUTATION GRID, RE-DERIVED over the 174 cases here across 76 legs
 * with `--reporter=json`, and read as the SET each leg reddened
 * rather than as a count. Every figure below moves again when a
 * later task adds a case to this file, so re-derive the whole grid
 * rather than appending legs for the new rows.
 *
 * THE DOCUMENTS HALF FOLLOWED THE FILE'S SUBSTITUTE AND WIDENED THE
 * RECORDED SET IT RE-RAN. The file holds 453 cases, of which 19 are
 * this half's. What was run is this half's OWN nineteen legs plus
 * FIFTEEN recorded ones, chosen by reading what the new cases CALL:
 * the eight the findings half re-ran, the two sources legs it added,
 * and five more sources legs these cases drive directly — the source
 * delete refused by DOCUMENTS, the parse-status aggregate, the
 * failures queue's own `failed` filter, and the two cascade legs
 * over `dropSourcesOf`. The rest are closed by the same argument as
 * before: every old case is untouched and every non-document path in
 * the store is byte-identical but for the one added line in
 * `deleteDomain`.
 *
 * THE LIVENESS CONTROL IS THE BEFORE-AND-AFTER DIFF AGAIN, AND IT
 * HELD ON ALL FIFTEEN. Each recorded leg was applied to the store
 * and run TWICE, once against `git show HEAD:` of this file and once
 * at the tip, and what is read is the SET each run reddened. HEAD
 * reproduced the findings half's eight figures EXACTLY — 97, 7, 59,
 * 33, 50, 8, 6 and 4 — and every one of the fifteen legs' OUTSIDE
 * sets came back identical member for member, nothing gained and
 * nothing lost.
 *
 * THE DOCUMENTS HALF MOVED FOUR OF THOSE FIFTEEN, BY ONE CASE EACH,
 * and all four are sources legs reached by a documents case that
 * plants in the sources half on purpose. Accepting a source delete
 * while DOCUMENTS cite it went 3 to 4, through the divergence
 * control; accumulating the aggregate rather than seeding it from
 * `DOCUMENT_PARSE_STATUSES` went 6 to 7, through the case that reads
 * that aggregate answering zero over a corpus plant; and leaving the
 * sources standing in the cascade went 5 to 6 while leaving their
 * PLANTS standing went 1 to 2, both through the ONE case that reads
 * both seams empty after a delete. The eleven that did not move
 * include every one of the eight the findings half re-ran: no
 * documents case writes a category, a term, a persona or a topic,
 * reads a domain's dates or touches the operator's row.
 *
 * ONE OF THOSE FIFTEEN CARRIES A FIGURE THE SOURCES PARAGRAPH BELOW
 * RECORDS DIFFERENTLY, and it is that paragraph's own snapshot rule
 * rather than drift. Leaving the sources standing reads 5 at HEAD
 * where the sources half recorded 4, the fifth member being a
 * CONNECTORS cascade case landed since. Read every figure below as
 * of the half that wrote it.
 *
 * Nineteen documents legs redden between 1 and 17, and EVERY red one
 * of them lands wholly inside the documents describes. The whole
 * grid was run TWICE over one tree and every leg's set came back
 * identical member for member, which is what separates a measurement
 * from a bad capture.
 *
 * Planting no document at all is this half's whole-half control and
 * reddens 17 of the 19. The two survivors are exactly the divergence
 * cases whose subject is the SOURCES seam — the one reading the
 * queue, the aggregate and the dependent count answering zero, and
 * the one reading that same delete refused once the sources seam
 * holds a row.
 *
 * The ordering legs are four and they fall into two IDENTICAL PAIRS,
 * which is the honest reading of a five-row fixture rather than four
 * claims. Dropping the capture key and ordering oldest-first redden
 * the SAME 5, told apart only by the assertion that fails inside
 * each; dropping the id tiebreak and breaking it ASCENDING redden
 * the same 5 as each other and a DIFFERENT 5 from the first pair,
 * overlapping in 3. That the tiebreak legs redden at all is the
 * fixture's doing rather than the store's: `Array.prototype.sort` is
 * stable, so the tied pair is planted in the order the tiebreak
 * REVERSES.
 *
 * The filter legs are three and they are not one size. Ignoring the
 * filter and inverting it redden the same 3; defaulting it to `ok`
 * rather than to both statuses reddens 9, and THAT is the leg the
 * failed-by-default claim rests on rather than any assertion naming
 * it. The three count legs are disjoint from the page's and from
 * each other in what they are about: counting only the first window
 * reddens 3, counting the whole domain under any filter 2, and
 * counting every domain's documents at once 2.
 *
 * The two scope legs redden the SAME 2, which is what says the page
 * and the count are scoped through one predicate rather than two.
 * Ignoring the window reddens 2, disjoint from both.
 *
 * The two divergence legs are disjoint at 2 apiece: resolving the
 * corpus through the sources seam, and leaving the corpus standing
 * through a domain delete, the second being both cascade cases.
 *
 * The copy legs are one per DIRECTION and the two directions sit in
 * two case bodies for exactly that reason. Answering the planted
 * document by reference reddens 1 and handing its stored `Date` out
 * reddens the SAME 1 — one answer site, `listDocuments` being the
 * whole of the port's read surface, which is where this half is
 * narrower than the findings one. Storing the `Date` a plant was
 * handed reddens the OTHER copy case, and keeping the planted list
 * rather than rebuilding it reddens that one plus the case named for
 * it.
 *
 * THE FINDINGS HALF FOLLOWED THE FILE'S SUBSTITUTE AND SHARPENED ITS
 * LIVENESS CONTROL, which is the one change to the practice. The
 * file holds 434 cases, of which 44 are this half's. What was run is
 * this half's OWN thirty-eight legs plus TEN recorded ones, chosen by
 * reading what the new cases CALL: the same eight the subscriptions
 * half re-ran, plus two sources legs the sightings cases reach. The
 * rest are closed by the same argument as before, every old case
 * being untouched and every non-findings path in the store
 * byte-identical but for the one added line in `deleteDomain`.
 *
 * THE LIVENESS CONTROL IS NOW A BEFORE-AND-AFTER DIFF RATHER THAN A
 * COMPARISON AGAINST A FIGURE IN THIS HEADER, and it is what caught
 * that two of the eight figures above are pre-subscriptions
 * snapshots. Each recorded leg was applied to the store and run
 * TWICE, once against `git show HEAD:` of this file and once at the
 * tip, and what is read is the SET each run reddened. HEAD
 * reproduced 96, 7, 59, 33, 50, 8, 6 and 4 — the eight figures the
 * paragraph below records as 95 ... 49, each already moved by the
 * one subscriptions case that paragraph names — and every one of
 * the ten legs' OUTSIDE sets came back identical member for member,
 * nothing gained and nothing lost.
 *
 * THE FINDINGS HALF MOVED THREE OF THOSE TEN, BY ONE CASE EACH, and
 * all three are findings cases reaching another half's rules on
 * purpose. Refusing a null parent as a missing one went 96 to 97
 * through the one case that declares a category, so that a key the
 * domain HAS declared can be asked for beside one it has not.
 * Accepting a source delete while sightings cite it went 3 to 4 and
 * naming the documents key on that refusal went 2 to 3, both through
 * the single case that reads the planted count still refusing.
 * The other seven are identical member for member: no findings case
 * writes a term, a persona or a topic, deletes a category, reads a
 * domain's dates or touches the operator's row.
 *
 * Thirty-eight findings legs redden between 0 and 39 and EVERY red
 * one of them lands wholly inside the findings describes, which is
 * the mirror of the paragraph above. One leg had to be EARNED rather
 * than found: dropping the id tiebreak reddened ZERO until the
 * fixture was reordered, because `Array.prototype.sort` is stable
 * and the tied pair had been planted in the very order the tiebreak
 * answers. It reddens 5 now, and breaking the tie the other way
 * reddens the same 5.
 *
 * The one honest zero is dropping the own-key guard on the category
 * read, and it is the EIGHTH in this file though it is not the
 * empty-patch branch the other seven are. A payload reaching that
 * function came through a JSON round trip, which keeps own members
 * and drops everything else exactly as a `jsonb` column does, so
 * there is no inherited member left for the guard to refuse and no
 * key on `Object.prototype` is spelled `category`. The guard is kept
 * because `ar-digest`'s assembly node reads a driver row where it
 * DOES have a subject; `categoryTextOf`'s own TSDoc carries that,
 * and nothing else pins it.
 *
 * Planting no finding at all is this half's whole-half control and
 * reddens 39 of the 44. The five survivors are exactly the cases
 * that assert something no planted finding is needed for: the four
 * sightings cases, whose rows hang off a finding ID rather than off
 * a finding, and the one dependent-count case whose whole subject is
 * a planted NUMBER.
 *
 * The ordering legs are six and they separate the three keys.
 * Dropping the score key reddens 6 and ordering the score ASCENDING
 * reddens 4, inside it. Sorting an absent score FIRST, which is what
 * a bare SQL `DESC` does, reddens 4; sorting it LOWEST, which is
 * what `score ?? 0` does, reddens 2 — the smaller figure being the
 * sharper leg, since only the zero-scored row can tell that fault
 * from the correct answer. Dropping the stamp key reddens 2 and
 * dropping the id tiebreak 5.
 *
 * The three filter legs redden 5, 5 and 4 and are DISJOINT, which is
 * what says the three members are three claims. Inside them the
 * sharper legs are smaller: matching ANY ruling rather than the
 * latest reddens 2, reading the OLDEST as the one in force 2, and
 * dropping the id tiebreak from the rulings order 4. Matching a
 * string member alone rather than the column text reddens exactly 1,
 * the case written for it. Closing the upper bound of the window
 * reddens 3 and opening the lower bound 3.
 *
 * The write legs are three and they are disjoint from every read
 * leg. Replacing a ruling rather than appending one reddens 3,
 * skipping the foreign key 3, and taking the id after that key
 * exactly 1 — the id-burn case, which is the burn pinned once for
 * the half's one mechanism.
 *
 * The embedded reads redden small and singly, which is the honest
 * shape for three unbounded lists: ordering the sightings oldest
 * first reddens 1, dropping their id tiebreak 1, and dropping the
 * research one 1. Resolving research through the FINDING id rather
 * than through its entity reddens 6, and answering research for an
 * unattributed finding anyway reddens 1 inside it.
 *
 * The cascade legs NEST at 4 and 1: leaving the findings standing
 * reddens 4, and leaving only their sightings and rulings standing
 * reddens the one case written for the second level.
 *
 * The copy legs are one per ANSWER SITE and they redden 1 or 2
 * apiece, disjointly. Answering the planted finding by reference
 * reddens 2 — the lookup and the page, which is the term half's
 * shape rather than the category half's, `listFindings` mapping
 * through the same projection the lookup does. Storing the `fields`
 * object a plant was handed reddens 1 and storing its `createdAt` 1,
 * a split the sources half could not make with two documents on one
 * write. Keeping the planted LIST rather than rebuilding it reddens
 * 3. Answering a sighting or a research row by reference reddens 1,
 * answering the stored label by reference 1, and stamping a label
 * with the clock's own instance 1.
 *
 * THE SUBSCRIPTIONS HALF FOLLOWED THE FILE'S SUBSTITUTE AS WELL, and
 * it is the last half this file will get, so read the case totals
 * below as SNAPSHOTS taken at each half's landing rather than as
 * claims about today — the 328 the connectors paragraph states was
 * true when written, which is also why the paragraph above says every
 * figure moves again when a later task adds a case.
 *
 * The file holds 390 cases, of which 62 are this half's. What was run
 * is this half's OWN twenty-six legs plus the EIGHT recorded ones a
 * new half can reach — the same eight the sources and connectors
 * halves re-ran. The rest are closed by the same reasoning: every old
 * case is untouched and every non-subscription path in the store is
 * byte-identical but for the one added line in `deleteDomain`. The
 * liveness control held on all eight — each recorded leg's red set
 * OUTSIDE the subscriptions describes came back at exactly its
 * recorded figure (95, 7, 59, 33, 49, 8, 6 and 4, the fifth being the
 * connectors half's 48 plus the one case it added), which is what
 * says these are the legs the prose names and not eight new ones that
 * happen to redden something.
 *
 * THE SUBSCRIPTIONS HALF MOVED EXACTLY TWO OF THOSE EIGHT, by one
 * case each, and both are legs its fixture plants INTO rather than
 * legs about its own rules — the shape the sources and connectors
 * halves both measured. Refusing a null parent as a missing one went
 * 95 to 96 through the case that deletes a category to show the
 * cascade is not what removed the subscriptions, and refusing every
 * topic insert as a duplicate went 49 to 50 through the case that
 * seeds a topic to delete a domain over. The other six are identical
 * member for member: no subscriptions case writes a term, a persona
 * or a source, reads a domain's dates or touches the operator's row.
 *
 * Twenty-six subscription legs redden between 0 and 56, and every red
 * one lands wholly inside the subscriptions describes but ONE —
 * having the cascade take the connectors as well reddens the
 * connectors half's `leaves every connector standing`, which is a
 * widening leg reaching another half's claim rather than a leak.
 * Refusing every subscription insert is this half's whole-half
 * control and reddens 56 of the 62; the six survivors are exactly the
 * cases that write no subscription at all (the two empty-collection
 * list reads and the four unknown-id answers off the read, the patch,
 * the schedule write and the delete).
 *
 * The key's legs split by WRITE and then by what they widen. Skipping
 * it on the INSERT reddens 4 and on the UPDATE 2, disjoint. Refusing
 * a row in conflict with ITSELF reddens 7, which is what says the
 * ordinary patch cases exercise the rule rather than passing over it,
 * since a patch naming neither third still resolves to the stored
 * pair. Making the key global rather than per domain reddens 3. And
 * the two legs that key on a PAIR are BLUNT rather than thorough,
 * which is the honest reading and not a hole: 55 and 54, because the
 * fixture cannot be seeded at all when a pair is treated as the key
 * — two of its three rows share each pair by construction. Score
 * them as the fixture reporting, exactly as the sources half scores
 * its own domain-scope leg.
 *
 * The CHECK and the two foreign keys redden DISJOINT sets and the
 * arithmetic is per write, not per mechanism: skipping the format
 * CHECK reddens 2 on the insert and 1 on the patch; narrowing the
 * guard to four literals rather than the runtime tuple reddens 2,
 * which is the direction the refusal cases cannot reach and which
 * narrowing the TUPLE itself could not report either, since the
 * acceptance case LOOPS that tuple. Skipping the domain foreign key
 * reddens 2 and the connector one 3 on each write. Taking the id
 * after the four checks reddens exactly the 3 id cases.
 *
 * The read legs are four singletons rather than nests. Ordering by
 * insertion reddens 3 and ordering by format ALONE reddens 3, and
 * the second of those is the leg the fixture had to be reordered for
 * — it reddened ZERO until `archive` was written ahead of
 * `digest`. Ignoring the window reddens 2 and ignoring the domain
 * scope 4.
 *
 * The copy legs NEST, which is the term half's shape rather than the
 * category half's and for the term half's reason:
 * `listSubscriptions` maps through the copy helper instead of
 * building an object of its own. Answering the stored row by
 * reference reddens 7 and answering only its `Date` by reference
 * reddens 4, inside it. Storing the `Date` the schedule write was
 * handed reddens 1, and so does having that write also flip
 * `enabled` — the containment case's own row is already enabled,
 * so it is the SECOND fixture row, planted disabled, that reports it.
 *
 * The cascade legs are 3 and 3: leaving the subscriptions standing,
 * and taking the connectors as well. Refusing every delete reddens 4.
 *
 * And writing on a subscription patch that names no member reddens
 * NOTHING, the SEVENTH honest zero in this file and the same one the
 * category, term, topic, source and connector legs measure, for the
 * same reason: the early return exists because drizzle throws on an
 * empty update list, and this store has no such throw to observe. It
 * keeps the WEAKER pinning of those five rather than the persona one
 * — `src/subscriptions/db-store.ts` and a live case patching a
 * subscription with an empty patch are both later tasks, so today the
 * branch is pinned by `src/subscriptions/store.ts`'s TSDoc and by
 * nothing else.
 *
 * THE CONNECTORS HALF FOLLOWED THE FILE'S SUBSTITUTE TOO, and the
 * argument that closes it is stronger here than for either half
 * above. Read the case totals below as SNAPSHOTS taken at each
 * half's landing rather than as claims about today: the 294 the
 * sources paragraph states and the 228 the topics one states were
 * each true when written, which is also why the paragraph above says
 * every figure moves again when a later task adds a case.
 *
 * The file holds 328 cases, of which 34 are this half's. What was
 * run is this half's OWN twenty-three legs plus the EIGHT
 * recorded ones a new half can reach — the same eight the sources
 * half re-ran. The rest are closed by the same reasoning: every old
 * case is untouched and every non-connector path in the store is
 * byte-identical, with not even the one added line in `deleteDomain`
 * the topics and sources halves each needed, since `connectors`
 * hangs off no domain and the cascade was left exactly as it was.
 * The liveness control held on all eight — each recorded leg's red
 * set OUTSIDE the connectors describes came back at exactly its
 * recorded figure (95, 7, 59, 33, 48, 8, 6 and 4), which is what
 * says these are the legs the prose names and not eight new ones
 * that happen to redden something.
 *
 * THE CONNECTORS HALF MOVED EXACTLY ONE OF THOSE EIGHT, by one case,
 * and that is the narrowest a half has moved this file — narrower
 * than the settings half's three, and for the same structural reason
 * read from the other end. `connectors` hangs off nothing, so only a
 * connectors case that writes elsewhere ON PURPOSE can reach another
 * half's rules at all, and there is exactly one: the cascade case,
 * which plants a source and a topic so that the domain delete it
 * drives has something to be seen taking. Refusing every topic
 * insert as a duplicate went 48 to 49 through it. The other seven
 * are identical member for member — no connectors case plants a
 * category, a term or a persona, reads a domain's dates or touches
 * the operator's row.
 *
 * Twenty-three connector legs redden between 0 and 32, and EVERY red
 * one of them lands wholly inside the connectors describes — the
 * mirror of the paragraph above. Refusing every connector insert is
 * this half's whole-half control and reddens 32 of the 34; the two
 * survivors are exactly the cases that write no connector at all
 * (the CHECK refusal, which needs no stored row to be refused, and
 * the delete answering false for an id nothing carries).
 *
 * The two write mechanisms redden DISJOINT sets, which is the
 * sources half's split arriving at different writes: skipping the
 * key on the INSERT reddens 5, and ALL FIVE are `refusalFrom`
 * throwing rather than an assertion failing — the id-burn case
 * included, which would otherwise have read the wrong id and passed
 * for nobody's reason. Skipping it on the UPDATE reddens 1, the
 * rename the kind already holds. Skipping the CHECK reddens 2, one
 * of them in the id describe, because the burn is pinned once per
 * mechanism; taking the id after both checks reddens exactly those 2
 * id cases and nothing else.
 *
 * The two WIDENING legs are what the acceptance cases exist for and
 * they are disjoint from the narrowing ones. Refusing a connector in
 * conflict with ITSELF reddens 3 — the case named for it plus two
 * ordinary patch cases, which is what says those cases exercise the
 * rule rather than passing over it, since a patch naming no name
 * still resolves to the stored one. Making the key global rather
 * than per kind reddens 3 across two describes, both sibling-kind
 * acceptance cases and the tuple loop. Narrowing the tuple to three
 * of its four members reddens exactly 1, that loop, which no
 * refusal case in this half can reach.
 *
 * The three delete legs redden 2, 1 and 1 and NEST rather than
 * standing apart: accepting the delete while subscriptions name the
 * row reddens 2, naming another table's key on the refusal reddens
 * 1 inside it, and answering a planted count as zero reddens the
 * count case alone, which is the one the guard's `409` is read
 * through.
 *
 * The four read legs over the list are two NESTED pairs. Ordering by
 * insertion reddens 4 and ordering by name alone reddens 2 inside it
 * — the fixture is written so that both are wrong in different
 * places — and the fourth red of the first is a config case, since
 * the copy leg reads the first row of a filtered page. Ignoring the
 * filter on the page reddens 2 and ignoring it on the COUNT reddens
 * 3, overlapping in 2: the third is the key case that counts one
 * kind after writing into another, which is what says the count is
 * a claim of its own rather than the page's length. Ignoring the
 * window reddens 1, the one case that pages.
 *
 * The copy legs are one per ANSWER SITE and they NEST, which is the
 * term half's shape rather than the category half's and for the term
 * half's reason: `listConnectors` maps through the copy helper
 * instead of building an object of its own. Answering the stored
 * connector by reference reddens 3 — the read, the list and the
 * fresh-object case — and answering it by reference from the READ
 * alone reddens 2, inside it. Storing the object an insert was
 * handed and storing the one a patch was handed redden ONE CASE EACH
 * and are disjoint, which is the split the sources half could not
 * make with two documents on one write. Merging the config rather
 * than replacing it reddens 2. Clearing every connector on a domain
 * delete reddens 1, the widening leg the cascade case exists for.
 *
 * And writing on a connector patch that names no member reddens
 * NOTHING, the SIXTH honest zero in this file and the same one the
 * category, term, topic and source legs measure, for the same
 * reason: the early return exists because drizzle throws on an empty
 * update list, and this store has no such throw to observe. It keeps
 * the WEAKER pinning of those four rather than the persona one —
 * `src/connectors/db-store.ts` and a live case patching a connector
 * with an empty patch are both later tasks, so today the branch is
 * pinned by `src/connectors/store.ts`'s TSDoc and by nothing else.
 *
 * THE SOURCES HALF DID NOT FOLLOW IT EITHER, and it followed the
 * TOPICS half's substitute instead — which the paragraph below sets
 * out and which is now the file's practice rather than one task's
 * exception. The file holds 294 cases, of which 66 are the sources
 * half's. What was run is that half's OWN twenty-six legs plus EIGHT
 * of the recorded ones, chosen by reading what the new cases CALL
 * rather than guessed: the four whole-half controls the topics half
 * re-ran, the topics control itself, and the two domains legs. The
 * argument closing the rest is unchanged — every old case is
 * untouched and every non-source path in the store is byte-identical
 * except for one added line in `deleteDomain` — so only a DELTA over
 * the 66 new cases was ever in question. The liveness control is the
 * same reading and it held on all eight: each recorded leg's red set
 * OUTSIDE the sources describes came back at exactly its recorded
 * figure (93, 7, 58, 33, 47, 8, 6 and 4), which is what says these
 * are the legs the prose names and not eight new ones that happen to
 * redden something.
 *
 * THE SOURCES HALF MOVED EXACTLY THREE OF THOSE EIGHT, by four cases
 * in total, and all four sit in ONE case pair inside `the domain
 * cascade over its sources`. Refusing a null parent as a missing one
 * went 93 to 95 — the two sources cases that plant a category —
 * while refusing every term insert as a duplicate went 58 to 59 and
 * refusing every topic insert as a duplicate 47 to 48, both through
 * the single case that seeds a lexicon and a topic to delete a
 * domain over. The five that did NOT move are the category-delete
 * control, the personas control, the settings control and the two
 * domains legs, all unchanged member for member: no sources case
 * writes a persona, reads a domain's dates or touches the operator's
 * row.
 *
 * Twenty-six source legs redden between 0 and 60, and EVERY red one
 * of them lands wholly inside the sources describes — the mirror of
 * the paragraph above. Refusing every source insert is this half's
 * whole-half control and reddens 60 of the 66; the six survivors are
 * exactly the cases that write no source at all (the foreign-key
 * containment case, which needs no stored row to be refused, the two
 * list reads that plant none, and the three unknown-id answers off
 * the read, the patch and the delete).
 *
 * The two write mechanisms redden DISJOINT sets, which is a split no
 * other half here can make: skipping the kind CHECK on the insert
 * reddens 2 and on the PATCH 1, because the CHECK sits on both
 * writes where every other half's second mechanism sits on one.
 * Skipping the domain foreign key reddens 4. One case of each of
 * those two lands in the id describe rather than its own, because
 * the burn is pinned once per mechanism — and taking the id after
 * the checks reddens exactly those 2 id cases.
 *
 * The two read legs over the list are DISJOINT and one of them
 * reaches two other describes: ordering by id descending reddens 7,
 * only 3 of them in the list describe, since three aggregate cases
 * and one queue case read the first row of a page; ignoring the
 * window reddens 2, both in the list describe. The two aggregate
 * legs NEST rather than standing apart — accumulating the record
 * instead of seeding it from `DOCUMENT_PARSE_STATUSES` reddens 6 and
 * counting every source's documents at once reddens 1, inside it and
 * exactly the case named for it.
 *
 * The queue's four legs are two singletons, an IDENTICAL pair and a
 * three. Dropping the `failed` filter reddens 3; ignoring the window
 * reddens 1; and dropping the id tiebreak and ordering oldest-first
 * redden the SAME single case, told apart only by the assertion that
 * fails inside it — one ordering case standing for two claims, which
 * is the honest reading of a three-row fixture rather than two cases
 * pretending to be independent.
 *
 * The copy legs are one per ANSWER SITE and the sites do not line up
 * with the helpers, which is the reading worth having. Answering the
 * stored source by reference reddens 3 — the read, the patch and the
 * insert's own answer — and NOT the list, because
 * `listSourcesWithParseStats` builds a fresh object with its own
 * spread whatever the copy helper does; that is the category half's
 * shape rather than the term half's, and for the category half's
 * reason. Storing the object an insert was handed reddens 1. Storing
 * the object a PATCH was handed reddens 1 from either of its two
 * call sites, the SAME case both times, which is why that case
 * mutates both documents in one body. Merging a `jsonb` document
 * rather than replacing it reddens 2. And the planted `Date` has one
 * leg per direction, DISJOINT at 2 apiece: the seam keeping the
 * array and its instants, and the queue handing its own `Date` out.
 *
 * The delete legs are DISJOINT at 3 and 3 — accepting the delete
 * while documents cite it, and while sightings do — which is what
 * says the two keys are two claims rather than one rule read twice.
 * Naming one key for both reddens 1, the case that reads the
 * constraint off the refusal. The two cascade legs NEST: leaving the
 * sources standing reddens 4 and leaving the PLANTS standing reddens
 * 1, inside it.
 *
 * And writing on a source patch that names no member reddens
 * NOTHING, the FIFTH honest zero in this file and the same one the
 * category, term and topic legs measure, for the same reason: the
 * early return exists because drizzle throws on an empty update
 * list, and this store has no such throw to observe. It keeps the
 * WEAKER pinning of those three rather than the persona one —
 * `src/sources/db-store.ts` and a live case patching a source with an
 * empty patch are both later tasks, so today the branch is pinned by
 * `src/sources/store.ts`'s TSDoc and by nothing else.
 *
 * THE TOPICS HALF IS THE ONE PLACE THAT RULE WAS NOT FOLLOWED
 * WHOLE, and what stands in for it is stated rather than left to be
 * inferred. The file holds 228 cases now, of which 54 are the
 * topics half's, and re-deriving all 76 recorded legs would mean
 * reconstructing each from the prose that describes it. What was
 * run instead is the topics half's OWN seventeen legs plus SEVEN of
 * the recorded ones — the four whole-half controls and the three
 * other legs a topics case could reach, chosen by reading what the
 * new cases call rather than guessed. The argument that closes the
 * rest is that the old cases are unchanged and the store's
 * behaviour on every non-topic path is byte-identical except for
 * one added line in `deleteDomain`, which no old case can see: so
 * every recorded red set still holds over the old 174, and only a
 * DELTA over the 54 new cases was ever in question. Those seven
 * runs carry their own liveness control, and it is the reading that
 * makes the argument checkable rather than merely plausible: each
 * one's red set OUTSIDE the topics describes came back at exactly
 * the recorded figure (6, 4, 90, 6, 57, 32 and 8), which is what
 * says these are the same legs the prose names and not seven new
 * ones that happen to redden something.
 *
 * THE TOPICS HALF MOVED EXACTLY FOUR OF THOSE SEVEN, by six cases
 * in total, and every one of the six is a topics case that plants
 * in another half on purpose. Refusing a null parent as a missing
 * one went 90 to 93 — the three topics cases that plant a category,
 * matching the three the personas half moved that same leg by, and
 * for the same structural reason. Accepting
 * the delete of a category holding children went 6 to 7, through
 * the topic-delete case that carries the category delete as its
 * control. Refusing every term insert as a duplicate went 57 to 58
 * and refusing every persona insert as a duplicate 32 to 33,
 * through the ONE case that deletes a domain carrying a lexicon, a
 * persona and a topic at once. The three that did NOT move are the
 * two domains legs and the settings whole-half control, all three
 * unchanged member for member: no topics case reads a domain's
 * dates or its settings payload, and nothing here writes the
 * operator's row.
 *
 * Eighteen topic legs redden between 0 and 47, and EVERY red one of
 * them lands wholly inside the topics describes — the mirror of the
 * paragraph above, and what says the two directions are not the
 * same claim. Refusing every topic insert as a duplicate is this
 * half's whole-half control and reddens 47 of the 54; the seven
 * survivors are exactly the cases that write no topic at all (the
 * foreign-key containment case, which needs no stored row to be
 * refused, the two list reads that plant none, and the four
 * unknown-id answers off the read, the patch, the schedule write
 * and the delete). Accepting the duplicate name reddens 5 on the
 * insert and 1 on the update, the split `personas` cannot make
 * because its own key case set is differently shaped; skipping the
 * foreign key reddens 4, one of them in the id describe, because
 * the burn is measured once per mechanism.
 *
 * The patch's two legs are one narrowing and one widening and they
 * are DISJOINT, which is the personas half's shape. Skipping the
 * resulting-name check reddens 1, the rename the domain already
 * carries; refusing a topic in conflict with ITSELF reddens 7 — the
 * case named for it plus six ordinary patch and search-term cases,
 * which is what says those cases exercise the rule rather than
 * passing over it, since a patch naming no name still resolves to
 * the stored one. Making the name key global rather than per domain
 * reddens 4 across three describes, which is the widening leg the
 * two sibling-domain acceptance cases exist for.
 *
 * Both pairs of read legs OVERLAP rather than nesting or standing
 * apart, which is a shape neither of the other halves has: theirs
 * are disjoint on one side and nested on the other. Ordering by
 * insertion reddens 5 and ignoring the window reddens 2, sharing
 * the one case that asks for a page of three. Answering the stored
 * topic by reference reddens 4 — the three read paths and the
 * fresh-Date case — and handing the stored due time out of every
 * copy reddens 4 as well, overlapping in 2: one helper stands
 * behind both faults, and only the assertion that fails inside each
 * case tells them apart. Taking the id after the checks reddens
 * exactly the 2 id cases.
 *
 * The four remaining copy legs redden ONE CASE EACH and are
 * disjoint, which is one leg per ANSWER SITE exactly as the
 * settings half measures: storing the array an insert was handed,
 * storing the array a patch was handed, storing the `Date` a
 * schedule write was handed, and handing the stored array out.
 * Conflating an absent bound with a null one reddens 1, the leg
 * that says a nullable member distinguishes three requests and not
 * two.
 *
 * And writing on a topic patch that names no member reddens
 * NOTHING, the fourth honest zero in this file and the same one the
 * category, term and persona legs measure, for the same reason: the
 * early return exists because drizzle throws on an empty update
 * list, and this store has no such throw to observe. It keeps the
 * WEAKER pinning of the category and term zeros rather than the
 * persona one — `src/topics/db-store.ts` and a live case that
 * patches a topic with an empty patch are both later tasks, so
 * today the branch is pinned by `src/topics/store.ts`'s TSDoc and
 * by nothing else.
 *
 * THE SETTINGS HALF MOVED EXACTLY THREE OF THE SIXTY-SEVEN LEGS
 * THAT STOOD BEFORE IT, and all three gained the SAME single case:
 * `is not created by a write to any other table`, the one settings
 * case that deliberately plants through four other tables. Refusing
 * a null parent as a missing one went 89 to 90, refusing every term
 * insert as a duplicate 56 to 57, and refusing every persona insert
 * as a duplicate 31 to 32; the other sixty-four legs' red sets are
 * identical member for member. That is the narrowest a half has
 * moved this file — the personas half moved four of fifty-two and
 * the term half three before that — and the reason is structural
 * rather than luck: `operator_settings` hangs
 * off nothing, so only a settings case that writes elsewhere on
 * purpose can reach another half's rules at all.
 *
 * THE PERSONAS HALF MOVED EXACTLY FOUR OF THOSE FIFTY-TWO, and every
 * case each of the four gained sits in a personas describe: accepting
 * the delete of a category holding children went 5 to 6, refusing a
 * null parent as though it named a missing row 86 to 89 (three cases,
 * the only one of the four to gain more than one), the domain cascade
 * leaving a category's terms behind 2 to 3, and refusing every term
 * insert as a duplicate 55 to 56. Bucketing every red set by half is
 * what makes that readable: the category and term legs' own red sets
 * are unchanged member for member, so the four moves are personas
 * cases reaching those rules through the shared dataset rather than
 * anything having shifted under them.
 *
 * The nine domains legs are unchanged by the personas half as they
 * were by the term and category halves — 4, 6 and seven ones, over the
 * same sets — which is itself the reading: the halves' red sets are
 * disjoint. Answering the stored domain object reddens 4 (three date
 * cases and the settings case that writes through what it was
 * answered, because one helper copies both). Accepting the duplicate
 * slug reddens 6, five of them `refusalFrom` throwing because the call
 * ANSWERED rather than an assertion failing. The other seven redden
 * one case apiece: stamping the clock's own object, storing the
 * payload it was handed, taking the id after the key check, merging
 * `settings` on a patch, listing in insertion order, leaving a deleted
 * domain's counts standing, and answering those counts by reference.
 *
 * Eighteen category legs redden between 0 and 89, and TWO moved when
 * the personas half landed — each because a persona case reaches a
 * category rule, which is what one dataset behind three ports means.
 * Accepting the delete of a category holding children went 5 to 6,
 * through the persona-delete case that carries the category delete as
 * its control; and refusing a null parent as a missing one went 86 to
 * 89, through the three persona cases that plant a category. The three
 * the term half moved stand where it left them, and so does the rest:
 * the duplicate `(domain_id, key)` reddens 6, one of them in another
 * describe; the three depth branches 4, 2 and 2, which is the shape to
 * expect since only one is reachable from a patch; refusing nothing
 * for a parent that names no row 2; conflating an absent and a null
 * `parentId` 2; and the two ordering legs one case EACH and different
 * cases, a pair pinning a three-step order no single case can. Taking
 * the category id after the checks, ordering by insertion, answering
 * the stored category by reference and handing the stored object out
 * of the list redden one apiece — the last two DISJOINT, because the
 * list builds a fresh object with its own spread whatever the copy
 * helper does. Dropping the depth guard's early return on a null
 * parent reddens 1, and refusing a null parent as though it named a
 * missing row reddens 90 of the 174: the category half's whole-half
 * control, whose five survivors WITHIN that half are unchanged — the
 * reads and the refusal that plant no category at all.
 *
 * Twenty-five term legs redden between 0 and 57. Refusing every term
 * insert as a duplicate is this half's whole-half control and reddens
 * 57, of which 55 are term cases — the four survivors unchanged, and
 * exactly the reads that write no term at all (an unknown category, an
 * unknown term, a patch and a delete naming neither) — while the
 * other two are the persona case that seeds a lexicon to delete a
 * domain over and the settings case that plants through four
 * tables. Making the key global rather than per category reddens
 * 9 across five describes, which is the widening leg the
 * sibling-category acceptance case exists for. Accepting the duplicate
 * pattern reddens 5, and ALL FIVE are `refusalFrom` throwing rather
 * than an assertion failing — including the id-burn case, which would
 * have read the wrong id and passed for nobody's reason.
 *
 * The upsert carries six legs and they are not independent.
 * Leaving a conflicting row as it stands reddens 3 and writing a
 * second row rather than conflicting reddens 4, OVERLAPPING in 2:
 * two different faults on one path, and only the assertion that
 * fails inside each case tells them apart. Burning an id only for
 * the rows it inserts reddens 1. Applying the last of a repeated
 * pattern reddens 4, the whole repeat describe. The two ordering
 * legs redden 1 and 2 — asking the category before the repeat, and
 * checking the category above the empty-document return — and they
 * are what the port's precondition rests on.
 *
 * The cascade legs are DISJOINT rather than nested: leaving a
 * category's terms behind reddens 1 and leaving the domain cascade's
 * behind reddens 3 (2 term cases and the persona case that asserts one
 * delete reaches both), because reaching two levels down is a separate
 * claim from reaching one. Refusing a category delete over its terms —
 * a widening leg — reddens 5, four in the cascade describe and the
 * fifth the term-delete control, which is that control earning its
 * place.
 *
 * The three list legs nest differently in each direction. Ignoring
 * the window reddens 2 and reading one row where no window was
 * given reddens 5, and the two sets are DISJOINT: the windowed
 * claims and the whole-category claim are pinned by different
 * cases. Ordering by insertion reddens 4, a strict SUBSET of that
 * 5, so the two read as one leg unless the sets are compared.
 * Answering an uncounted zero from the category list reddens
 * exactly the 3 count cases.
 *
 * Answering the stored term by reference reddens 4 — every read
 * path — and handing the stored object out of the list reddens 1,
 * NESTED inside it rather than disjoint. That is the opposite of
 * the category pair above and has a reason: `listTerms` maps
 * through the copy helper, while `listCategoriesWithTermCounts`
 * builds a fresh object with its own spread.
 *
 * The remaining term legs redden one or two: taking the id after
 * the key check, skipping the foreign key on an insert, skipping it
 * on a patch, conflating an absent and a null `notes`, and skipping
 * the resulting-pair check (2 — the rename and the bucket move).
 * Refusing a term in conflict with ITSELF is a widening leg and
 * reddens 4: three ordinary patch cases plus the one named for it,
 * which is what says the patch cases exercise the rule rather than
 * passing over it. And writing on a term patch that names no member
 * reddens NOTHING, exactly as the category leg does and for the
 * same reason: the early return exists because drizzle throws on an
 * empty update list, and this store has no such throw to observe.
 * Both zeros are honest rather than holes, and both are pinned by
 * the ports' TSDoc and by the branch in `src/taxonomy/db-store.ts`
 * — by no case anywhere, unlike their persona sibling below, whose
 * live seam does now carry one.
 *
 * Fifteen persona legs redden between 0 and 32, and fourteen of them
 * stay wholly inside the personas describes — the mirror of the
 * paragraph above, and what says the two directions of the shared
 * dataset are not the same claim. The fifteenth is the whole-half
 * control, which reaches the one settings case that plants a
 * persona. Refusing
 * every persona insert as a duplicate is this half's whole-half
 * control and reddens 32: 31 of the half's own 37, whose six
 * survivors are exactly the cases that write no persona at all (an
 * unknown id on the read, the patch and the delete, the two list
 * reads that plant none — a domain holding nothing and an id no
 * domain carries — and the foreign-key containment case, which
 * needs no stored row to be refused), plus the settings case that
 * plants a persona of its own. Accepting the duplicate role reddens 5,
 * and ALL FIVE are `refusalFrom` throwing rather than an assertion
 * failing — including the id-burn case, which would otherwise have
 * read the wrong id and passed for nobody's reason.
 *
 * Skipping the foreign key reddens 4 the same way, all four through
 * `refusalFrom`, and one of them sits in the id describe rather
 * than in its own: the burn is measured twice here, once per
 * mechanism, because the gap of two measured on the live server
 * covered a key refusal AND a foreign-key one. Taking the id after
 * the key check reddens exactly those two id cases.
 *
 * The patch's two legs are one narrowing and one widening and they are
 * DISJOINT. Skipping the resulting-role check reddens 1, the rename
 * the domain already carries; refusing a persona in conflict with
 * ITSELF reddens 3 — the case named for it plus two ordinary patch
 * cases, which is what says those cases exercise the rule rather than
 * passing over it, since a patch naming no role still resolves to the
 * stored one. Making the role key global rather than per domain
 * reddens 3 across two describes — both sibling-domain acceptance
 * cases and the cascade case that seeds a second domain — which is the
 * widening leg those acceptance cases exist for; and counting the
 * personas of every domain at once reddens 1, only the case whose
 * fixture has a second domain to be wrong about.
 *
 * The two read legs are DISJOINT and the two copy legs are NESTED,
 * which is the term half's shape rather than the category half's
 * and for the term half's reason: `listPersonas` maps through the
 * copy helper instead of building an object of its own. Ordering by
 * insertion reddens 3 and ignoring the window reddens 2, sharing no
 * case; answering the stored persona by reference reddens 3 — every
 * read path — and handing the stored object out of the list reddens
 * 1, inside it.
 *
 * The remaining three: leaving the domain cascade's personas
 * standing reddens 2, defaulting an empty system text to the stored
 * one reddens 1 — the leg that says an empty string is a value
 * being written — and writing on a patch that names no member
 * reddens NOTHING, the same honest zero the category and term legs
 * measure, for the same reason: the early return exists because
 * drizzle throws on an empty update list, and this store has no
 * such throw to observe. Three measured zeros now, and the persona
 * one is the only one any case reaches. The live seam in
 * `tests/live/api.live.test.ts` patches a live persona with no
 * member and is answered the stored row, and deleting that early
 * return from `src/personas/db-store.ts` reddens it with drizzle's
 * own `No values to set`. The category and term zeros keep the
 * weaker pinning — the ports' TSDoc and the branches themselves
 * — since no db-store here carries a colocated test file and no
 * live case patches either table with an empty patch. The branch
 * is also unobservable in the answered row, in the stored row and
 * in a statement COUNT: what separates it from a write that sets
 * every member back to itself is the statement TEXT, which only a
 * probe over an instrumented client reads. Measured that way on
 * `src/personas/db-store.ts` when it landed — one statement,
 * and a `select`.
 *
 * Nine settings legs redden between 0 and 8, and EVERY red one of
 * them lands wholly inside the settings describes — nothing this
 * half does reaches another's rules, which is the other direction of
 * `operator_settings` hanging off nothing. Answering null however
 * much was written is the whole-half control and reddens 8 of the
 * 12; the four survivors are exactly the cases that never read the
 * store back (the two that assert what a write ANSWERED, the one
 * that asserts the absent read before writing, and the one that
 * asserts the row is nobody's side effect), so the roster is the
 * statement that the other eight read stored state at all.
 *
 * Answering null as an empty payload reddens 3 and merging rather
 * than replacing reddens 3, and the two sets are DISJOINT: the null
 * legs land on the cases that assert an absence and the merge leg on
 * the whole rewrite describe, its answer case included. There is no
 * merge-of-nothing control to sit beside it here, unlike the domain
 * patch: `writeSettings` always writes, so a payload left standing
 * is not a state this port has.
 *
 * The three copy legs redden ONE CASE EACH and are disjoint —
 * storing the argument, answering the stored payload from the write,
 * and answering it from the read. That is one leg per ANSWER SITE
 * rather than one per helper, and it is what says the three cases
 * are three claims: a store copying on the way into a write still
 * aliases every reader to one another through the read. Clearing the
 * settings on a domain delete and creating the row on a domain
 * insert redden one apiece, the second being the widening leg the
 * nobody's-side-effect case exists for.
 *
 * THE RUNS HALF RE-RAN THE RECORDED SET AND ADDED FOUR CASCADE LEGS
 * TO IT, and the reading it bought is that everything carried in
 * reproduced its recorded figure. The file holds 541 cases, of which
 * 40 are this half's. What was run is this half's OWN thirty-three
 * legs plus TEN recorded ones, chosen by reading what the new cases
 * CALL from outside the half: they reach `insertDomain`,
 * `deleteDomain`, {@link MemoryResearchStore.setDomainEntities},
 * {@link MemoryResearchStore.setEntityResearch} and
 * {@link EntityStore.listEntityResearch}, and nothing else. That is
 * the entities half's six widened by the four cascade legs its
 * divergence pair reaches through the registry. Each of the ten was
 * applied to the store and run TWICE, once against
 * `git show HEAD:` of this file at 501 cases and once at the tip at
 * 541, and what is read is the SET each run reddened.
 *
 * EVERY ONE OF THE TEN REPRODUCED ITS RECORDED FIGURE AT HEAD, which
 * is what says these are the legs the prose names rather than ten new
 * ones that happen to redden something: 6, 8, 4, 2, 4, 2, 1, 1 and 4
 * for the nine the paragraphs above record, and each OUTSIDE set came
 * back identical member for member. ONE of them needed the recorded
 * SPELLING found rather than guessed, and the wrong spelling is the
 * one a reader reaches for first: `a domain delete that removes no
 * row` reddens 8 only when the row is LEFT while the return stays
 * truthful, where answering `false` from the same method reddens 27
 * at HEAD and 33 at the tip. Both sentences describe the same
 * mutation in English and they are different legs; the second is
 * recorded here as the reading that names this half's six cascade
 * cases, since the six new members are exactly the ones asserting
 * what the delete returned.
 *
 * THE RUNS HALF MOVED EXACTLY TWO OF THE TEN, BY ONE CASE EACH, and
 * both moved through the same pair of cases. Leaving the entities
 * standing went 4 to 5 and keeping their research while dropping them
 * went 1 to 2, each gaining one member of the cross-domain divergence
 * pair — the only cases here that plant in the entities half on
 * purpose. The other eight are identical member for member: no runs
 * case writes a category, a term, a persona, a topic or a source,
 * reads a domain's dates or touches the operator's row.
 *
 * Its own thirty-three legs redden between 1 and 31, EVERY red one of
 * them lands wholly inside the runs describes, and NONE reads zero.
 * The whole grid was run TWICE over one tree and every leg's set came
 * back identical member for member, which is what separates a
 * measurement from a bad capture.
 *
 * Planting no pass reddens 31 and planting no call 22, and the two
 * are this half's whole-half controls. Their SURVIVORS are the
 * coverage statement rather than their counts. What survives the
 * first is exactly the nine cases whose subject is a CALL rather than
 * a pass — the four ledger reads, whose rows hang off a run ID rather
 * than off a run, the two call-copy cases, the ledger rebuild, the
 * absent-run bucket, and the empty-day window case, whose subject is
 * which DAYS carry a bucket. What survives the second is exactly the
 * eighteen whose subject is a run row. The first control was 29 until
 * the divergence pair gained the state-before assertion this file
 * requires, which took it to 31 and is the whole of why those two
 * reads are there.
 *
 * The runs page's three ordering legs separate its two keys and TWO
 * OF THEM ARE IDENTICAL: dropping the id tiebreak reddens 4, and
 * dropping the stamp key and reversing the whole order redden the
 * same 5, told apart only by the assertion that fails inside each.
 * That the tiebreak leg reddens at all is the fixture's doing rather
 * than the store's — `Array.prototype.sort` is stable, so the tied
 * pair is planted in the order the tiebreak REVERSES, and the oldest
 * pass is planted with the HIGHEST id so the two keys disagree on
 * every pair it is in. The ledger's two legs are the same shape one
 * table down and NEST rather than pairing: dropping its id tiebreak
 * reddens 4 and reversing it 3, inside.
 *
 * The two filter legs redden 5 apiece and are DISJOINT, which is what
 * says the page and the summary narrow through two predicates rather
 * than one. Neither is satisfied by a page that merely looks
 * plausible: both are read through a PARTITION, the two domains'
 * counts plus the one tick being the whole table on the page and the
 * two domains' summaries falling three calls short of the
 * unfiltered one.
 *
 * THE SPEND LEGS ARE ELEVEN AND THE THREE SHARPEST ARE THE SMALLEST.
 * Truncating the day in the process's own zone reddens 11, which is
 * the leg the UTC claim rests on rather than any assertion naming it;
 * attributing every call to nobody reddens 12 and joining INNER,
 * dropping the unattributed calls, reddens 10, the two overlapping in
 * seven. Counting the measured rows rather than the rows reddens 8.
 * Losing the null-last rule from the bucket order reddens 2 and
 * taking the oldest day first reddens 5, disjoint but for the
 * ordering case itself.
 *
 * The two magnitude legs redden 2 apiece and are DISJOINT, which is
 * the reading two sums over one bucket need: coalescing an unmeasured
 * bucket to zero reddens the null case and the absent-run one, and
 * summing either axis only when BOTH were recorded reddens the
 * separately-summed case and the same absent-run one. A fixture whose
 * every call carried both magnitudes could report neither.
 *
 * The two window legs redden the SAME 1, and that is a case covering
 * two claims rather than a leg that says nothing: closing the upper
 * bound and opening the lower each redden the one case that puts both
 * bounds exactly ON a planted call, which is what a half-open window
 * is read with. Recorded as two legs on one case rather than as one
 * figure for both.
 *
 * Resolving a call whose run nothing stored as though it named a
 * domain reddens 7, which is the leg the LEFT JOIN's third null rests
 * on. It NESTS the separately-summed magnitude leg, both reaching the
 * absent-run case.
 *
 * The three cascade legs read 6, 4 and 2 and NEST: leaving the runs
 * standing reddens 6, dropping every run whatever domain it belongs
 * to reddens 4 inside it, and dropping the runs while leaving their
 * ledger reddens 2 inside that. The middle one is what the tick's
 * survival is pinned by, and the two divergence cases are inside the
 * first alone.
 *
 * The copy legs are one per DIRECTION and per collection, which is
 * why they sit in six case bodies rather than four. Storing the rows
 * a plant was handed reddens 2 and keeping the STAMPS off that same
 * plant reddens 1 inside it; answering the payloads by reference
 * reddens 1 and answering the stamps by reference reddens a different
 * 1. The ledger's pair redden ONE CASE EACH and are DISJOINT, which
 * they were not until the combined case was split in two — a claim
 * with two directions in one body cannot be separated by any grid,
 * and both legs read the same single case before the split.
 *
 * The two projection legs redden 1 and 3 and neither is a copy leg.
 * Keeping `run_id` on the ledger's record reddens exactly 1, the
 * key-set case, which is the only reading in this half that could
 * report a member riding along. Dropping `errors` from the runs
 * record reddens 3, the key-set case plus both payload-copy cases,
 * since those read the member they are about.
 *
 * The two seam-replacement legs redden 1 apiece and are disjoint,
 * appending rather than replacing being what makes a collection going
 * back to empty inexpressible — which is the one thing each rebuild
 * case is for.
 *
 * THE ENTITIES HALF RE-RAN THE RECORDED SET RATHER THAN WIDENING IT,
 * and the reading it bought is that nothing carried in moved at all.
 * The file holds 501 cases, of which 48 are this half's. What was
 * run is this half's OWN twenty-eight legs plus SIX recorded ones,
 * chosen
 * by reading what the new cases CALL from outside the half: they
 * reach `insertDomain`, `deleteDomain` and
 * {@link MemoryResearchStore.setEntityResearch}, and nothing else.
 * Each of the six was applied to the store and run TWICE, once
 * against `git show HEAD:` of this file at 453 cases and once at the
 * tip at 501, and every one came back identical member for member —
 * nothing gained and nothing lost. Two of the six are the reason the
 * list is short rather than long: refusing no duplicate slug reddens
 * 6 on both sides even though this half's fixture inserts two
 * domains, and a `deleteDomain` that removes no row reddens 8 on
 * both sides even though six new cases assert what it returns,
 * because the drops run ahead of the return either way. Dropping the
 * findings cascade reddens 4 and the documents cascade 2, storing
 * planted research by reference 1 and reversing the findings half's
 * own research order 1, all unmoved.
 *
 * Its own twenty-eight legs redden between 1 and 21, and every one
 * of them lands wholly inside the entities describes. The whole grid
 * was run TWICE over one tree and every leg's set came back
 * identical member for member, which is what separates a measurement
 * from a bad capture.
 *
 * Planting no entity reddens 19 and planting no intention 21, and
 * the two are this half's whole-half controls. Their SURVIVORS are
 * the coverage statement rather than their counts: what survives the
 * first is exactly the research and pool cases, whose rows come
 * through other seams, and what survives the second is exactly the
 * registry and research cases plus the one refusal that stores
 * nothing. The pool control was 20 until one cascade case gained the
 * state-before assertion this file requires, which took it to 21 and
 * is the whole of why that assertion is there.
 *
 * The two refusal legs are 2 apiece and they OVERLAP in the order
 * case, which is what says that case reaches both mechanisms:
 * accepting a duplicate key reddens the key case and the order case,
 * and accepting a dangling alias reddens the alias case and the same
 * order case. Reversing the two guards reddens the order case ALONE
 * — 1 of 501, the sharpest leg in this half — and comparing the key
 * against every row rather than every OTHER row reddens 10, which is
 * every case whose patch keeps the key where it was. Scoping the key
 * across domains rather than within one reddens 3.
 *
 * The ordering legs are six and they fall into TWO IDENTICAL TRIPLES
 * of 4, which is the honest reading of a three-row fixture rather
 * than six claims. Dropping the stamp key, dropping the id tiebreak
 * and reversing the whole order redden the same 4 in the research
 * collection and a different same-4 in the pool, told apart only by
 * the assertion that fails inside each: each of the three produces a
 * DIFFERENT wrong answer, which is what the fixture is planted for.
 * That the tiebreak legs redden at all is the fixture's doing rather
 * than the store's, `Array.prototype.sort` being stable.
 *
 * Matching a null `entityId` as though it named the subject asked
 * about reddens 7: every pool case, the one reading a batch left
 * unstored, and the pool cascade. Answering `entityId` on this
 * half's research record reddens exactly 1, the key-set case.
 *
 * The check legs are 2 and 1 and they are nested rather than
 * disjoint: accepting a closed row with no approval reddens the
 * refusal case and the batch case, and storing the rows as it
 * guarded them row by row reddens the batch case alone.
 *
 * The approval legs are 2 apiece and disjoint in what they are
 * about: a bare `now()` in place of the coalesce reddens the
 * idempotence case and the closed-row one, and leaving the status
 * where it was reddens the closed-row one and the first-approval
 * one. Discarding the approval write entirely reddens 2 and
 * discarding the registry write 4.
 *
 * The three cascade legs read 4, 2 and 1 — dropping the entities,
 * dropping the pool, and keeping the research while dropping the
 * entities. The first two OVERLAP in exactly one case, the divergence
 * control that reads both rows going together, which is what says
 * that case is about the pair rather than about either line.
 *
 * The copy legs are one per DIRECTION and per collection, which is
 * why they sit in six case bodies. Storing the `attributes` a plant
 * or a patch was handed reddens 2, handing the stored payload out
 * reddens the OTHER 1, and the pool's four-member copy reddens 2 on
 * the way in and the SAME 2 on the way out — one answer site, this
 * half reading pool rows through one projection.
 *
 * ECHOING THE ARGUMENT RATHER THAN READING STORED STATE BACK REDDENS
 * NOTHING, and it is a MEASURED ZERO of a different kind from the
 * three empty-patch ones above. The port says a write answers what
 * is held rather than what was sent, and here the two are equal by
 * construction: the payload is copied in and copied out, so a copy
 * of the argument and a copy of the stored payload are the same
 * object graph. The claim has a subject only where the database can
 * change what it stored — `jsonb` normalises key order and drops
 * a duplicate key — so it is `src/settings/db-store.ts`'s to
 * discharge through its `RETURNING` list, which it now does in a
 * case rather than in a probe somebody ran once:
 * `tests/live/api.live.test.ts` writes a payload whose keys are
 * submitted out of jsonb order and asserts the answer comes back in
 * the database's order, at both depths and off the plain read as
 * well as off the write. No re-aiming of this leg reaches it from
 * here.
 *
 * THAT THE PROPOSALS HALF IS THE FILE'S SECOND APPROVAL GATE AND
 * READS AS THE SAME GATE. Four methods over
 * `source_config_proposals`: a page narrowed to `pending` with its
 * count, an UNSCOPED read by id, and one writer that rules AND
 * applies. Every claim the entities half makes over `research_pool`
 * has its counterpart here — an ascending queue, a by-id read that
 * answers a row whatever parent it names, a CHECK reached from the
 * seam alone, and an approval that keeps the first ruling's instant
 * — and the cases are written to be read against those.
 *
 * THAT ITS QUEUE IS ASCENDING, NARROWED AND SCOPED, AND THAT THE
 * THREE ARE SEPARATE CLAIMS. The fixture plants five proposals on
 * one feed and one on its sibling: the tied pair carries ONE instant
 * and is planted HIGH FIRST, the tiebreak being ASCENDING, and the
 * oldest row carries the HIGHEST id, so `proposed_at` and `id`
 * disagree on every pair. One case writes out the four orders the
 * answer is NOT. Two of the five are ruled on, which is what the
 * narrowing case reads and what makes the count three where the
 * table holds five; the sixth row is what the scope case reads. It
 * is `listPendingProposals` in `scripts/approve.ts` member for
 * member, and the cases are what keep that a claim rather than a
 * coincidence.
 *
 * THAT ITS WRITER TOUCHES TWO TABLES OR NEITHER. One case reads all
 * four faces of a ruling in one body — both stamps, the status, the
 * two documents landing on the feed exactly as proposed, and the row
 * leaving the queue — and one drives the state a deployment's
 * foreign key forbids and this seam can reach: a proposal naming a
 * source nothing stored. Nothing is written until every value
 * exists, so that case asserts the proposal is still unruled and the
 * feed byte-identical to what it was, and asserts the fault is a
 * plain `Error` rather than a `StoreRefusal` — answering a refusal
 * for a state Postgres cannot be in would invent a rule.
 *
 * THAT BOTH ITS STAMPS ARE IDEMPOTENT AND THAT THEY ARE TWO CLAIMS.
 * `coalesce` on each, so a second ruling keeps the first instants;
 * the case moves the CLOCK between the two calls and rules on a
 * third row afterwards as the control that it moved. A separate
 * case rules on a row somebody already approved, where one
 * `coalesce` falls through and the other does not, which is what
 * separates the two.
 *
 * THAT A MALFORMED CONFIG IS WRITTEN. The approval IS the gate and
 * this is not a second one, so a `parser_config` that is a bare
 * string and a `contract` that is a number land on the feed. A store
 * validating on the way through would refuse a row the deployment
 * stores.
 *
 * THAT ITS CASCADE FOLLOWS THE DOMAIN AND NOT THE FEED, AND THAT THE
 * DIFFERENCE IS THIS FILE'S EIGHTH KNOWN DIVERGENCE.
 * `source_config_proposals.domain_id` cascades, so every status goes
 * rather than the pending rows alone; one case drives the source
 * delete FIRST, refused, and then the domain delete, taken, which is
 * what says the cascade is not simply meeting nothing. A third case
 * plants a proposal of the SECOND domain onto the first domain's
 * feed and deletes that domain: the feed goes and the row is left
 * naming an id nothing carries, where a deployment refuses the
 * delete outright. `tests/live/api-wave3.live.test.ts` is where the
 * refusal is discharged.
 *
 * THAT THE PROPOSALS HALF'S MUTATION GRID IS TWENTY-ONE LEGS, and
 * that two of them are honest ZEROS. Every leg was run twice over
 * one tree and the two runs agree member for member; every failed
 * set lies entirely INSIDE this half, which is what says the half
 * changed nothing above it. Planting nothing reddens 27 of the 29
 * cases, and the two survivors are the coverage statement rather
 * than the figure: the seam refusal, which is answered before
 * anything is stored, and the feed nothing has proposed for, whose
 * subject is an absence it never had to reach.
 *
 * The ordering legs are three and two of them are IDENTICAL at 3,
 * told apart only by the assertion that fails inside each: dropping
 * the `proposed_at` key and reversing the whole order redden the
 * ordering case, the window case and the batch-refusal case that
 * reads the queue back. Dropping the `id` tiebreak reddens those
 * three plus the ruling case, whose queue assertion after the write
 * is the tied pair alone. That the tiebreak leg reddens at all is
 * the fixture's doing rather than the store's,
 * `Array.prototype.sort` being stable.
 *
 * The two narrowing legs are 10 and 12 and neither contains the
 * other: dropping the `pending` predicate and dropping the source
 * scope share seven cases, and each reaches three the other does
 * not. Nine of the twelve the scope leg reddens are cases about
 * something else entirely, which is the shape a scope has.
 *
 * The check legs are 2 and 1 and they are nested rather than
 * disjoint, exactly as the other gate's are: accepting an applied
 * row with no approval reddens the refusal case and the batch case,
 * and storing the rows as it guarded them row by row reddens the
 * batch case alone.
 *
 * The ruling legs are 2, 1, 1, 4, 2 and 1 — a bare `now()` in place
 * of each `coalesce`, leaving the status where it was, discarding
 * the source write, discarding the proposal write, and stamping the
 * proposal BEFORE the two columns are derived. The last is the only
 * leg the atomicity case can report and it reddens exactly that one.
 *
 * The key and cascade legs are 3 and 2, overlapping in one case: the
 * one that drives the refused source delete and the taken domain
 * delete in the same body, which is what says that case is about the
 * pair rather than about either line. Answering `domain_id` as a
 * constant reddens exactly the whole-row case.
 *
 * The copy legs are one per DIRECTION and read 1 apiece — storing
 * what the seam was handed, and handing the stored payload out.
 *
 * TWO LEGS ARE MEASURED ZEROS AND BOTH ARE STRUCTURAL. Deriving the
 * two columns inline instead of through `proposalToSourceUpdate`
 * reddens NOTHING, that function being a pass-through for any row
 * carrying an approval and the row carrying one by the statement
 * before: the claim it is one function both implementations go
 * through is about where a future rule would live, and no case here
 * can reach it. Handing the derived documents to the feed without
 * copying them reddens nothing either, and the reason is narrower
 * than it looks — the proposal is replaced by a fresh copy in the
 * same call, so the object the feed keeps is one nobody else holds,
 * and the two copies that ARE observable are pinned by the legs
 * above. Neither zero is closable by widening a case.
 */
import type {
  MemoryDomainDocument,
  MemoryDomainEntity,
  MemoryDomainFinding,
  MemoryEntityResearch,
  MemoryLlmCall,
  MemoryResearchPoolRow,
  MemoryResearchStore,
  MemorySourceDocument,
  MemorySourceProposal,
  MemoryRun,
} from './memory-research-store.js';
import type {
  ConnectorRecord,
  InsertConnectorInput,
} from '../../src/connectors/store.js';
import type { DomainSettings } from '../../src/db/schema/domains.js';
import type { OperatorSettings } from '../../src/db/schema/settings.js';
import type {
  DocumentFilter,
  DocumentRecord,
} from '../../src/documents/store.js';
import type {
  DomainRecord,
  InsertDomainInput,
} from '../../src/domains/store.js';
import type {
  EntityRecord,
  ResearchPoolRecord,
} from '../../src/entities/store.js';
import type {
  FindingFilter,
  FindingLabelRecord,
  FindingRecord,
  FindingSort,
} from '../../src/findings/store.js';
import type { TimeWindow } from '../../src/http/schemas.js';
import type { PersonaRecord } from '../../src/personas/store.js';
import type {
  RunFilter,
  RunRecord,
  SpendBucket,
} from '../../src/runs/store.js';
import type {
  InsertSourceInput,
  SourceConfigProposalRecord,
  SourceFailureRecord,
  SourcePatch,
  SourceRecord,
} from '../../src/sources/store.js';
import type {
  InsertSubscriptionInput,
  SubscriptionPatch,
  SubscriptionRecord,
} from '../../src/subscriptions/store.js';
import type {
  CategoryRecord,
  TermRecord,
  TermValues,
} from '../../src/taxonomy/store.js';
import type {
  InsertTopicInput,
  TopicPatch,
  TopicRecord,
} from '../../src/topics/store.js';

import { describe, expect, it } from 'vitest';

import {
  CONNECTOR_KINDS,
  DOCUMENT_PARSE_STATUSES,
  EXPORT_FORMATS,
  SOURCE_KINDS,
} from '../../src/db/schema/values.js';
import { StoreRefusal } from '../../src/db/store-errors.js';

import { createMemoryResearchStore } from './memory-research-store.js';

/** The seeded worked example's slug, and this file's first domain. */
const RADAR = 'example-tech-radar';

/** A second domain, invented in the same neutral register. */
const TRANSIT = 'example-urban-transit';

/** A window wide enough to read every row any case here writes. */
const WHOLE_COLLECTION = { limit: 50, offset: 0 };

/**
 * A domain id nothing stores, and the needle every no-echo case in
 * this file searches its own refusal for.
 *
 * SEVEN DIGITS ON PURPOSE, and the reason is the `stack` those cases
 * serialise. A stack frame carries a LINE and a COLUMN number, so a
 * three- or four-digit sentinel matches one by accident the moment
 * anybody inserts lines into `./memory-research-store.js` — measured,
 * a four-digit id came back once as `memory-research-store.ts:4041`
 * and the case read a leak where the refusal was clean. Nothing in an
 * eight-thousand-line file reaches seven digits, so the zero those
 * cases assert is about the refusal rather than about where the throw
 * happens to sit today.
 *
 * ONE CONSTANT FOR THREE HALVES, because the reason is one reason.
 * The personas, topics and sources foreign keys each answer about an
 * id, and a sentinel per half would be three places to shorten.
 */
const ABSENT_DOMAIN_ID = 4041987;

/** {@link ABSENT_DOMAIN_ID} as the text a no-echo scan looks for. */
const NEEDLE = String(ABSENT_DOMAIN_ID);

/**
 * The connector filter that narrows nothing.
 *
 * `{}` rather than an omitted argument, because `ConnectorFilter` is
 * REQUIRED on both methods that take it and only its member is
 * optional: an optional parameter would make an omitted argument mean
 * something an implementation had to decide.
 */
const EVERY_KIND = {};

/** Three taxonomy keys, in the same neutral register as the slugs. */
const PLATFORMS = 'platforms';
const RUNTIMES = 'runtimes';
const TOOLING = 'tooling';

/**
 * A fresh insert payload.
 *
 * A function rather than a constant: several cases WRITE into the
 * settings they submitted, which is the whole point of them, and a
 * shared fixture would carry that write into every case after it.
 *
 * @param slug - The natural key to insert under.
 * @param settings - The payload, empty by default.
 * @returns A complete {@link InsertDomainInput}.
 */
function domainInput(
  slug: string,
  settings: DomainSettings = {},
): InsertDomainInput {
  return { slug, name: `Domain ${slug}`, settings };
}

/**
 * Inserts a category, defaulting the members a case is not about.
 *
 * @param store - The store to write to.
 * @param domainId - The domain the category belongs to.
 * @param key - Its natural key, within that domain.
 * @param parentId - The root to sit under, null for a root. Required
 *   on the port and defaulted here, so a case naming no parent is
 *   visibly asking for a root rather than leaving it to a column.
 * @returns The stored row.
 */
async function addCategory(
  store: MemoryResearchStore,
  domainId: number,
  key: string,
  parentId: number | null = null,
): Promise<CategoryRecord> {
  return store.insertCategory({
    domainId,
    key,
    name: `Category ${key}`,
    parentId,
  });
}

/**
 * A domain carrying a root with one child under it.
 *
 * The state three of the five category refusals need before they can
 * be reached at all: a parent that is itself a child, a parent given
 * to a row that already has children, and a delete refused for
 * holding them.
 *
 * @param store - The store to write to.
 * @param slug - The domain to build the taxonomy under.
 * @returns The domain, its root, and the child under that root.
 */
async function seedOneLevel(
  store: MemoryResearchStore,
  slug: string,
): Promise<{
  domain: DomainRecord;
  root: CategoryRecord;
  child: CategoryRecord;
}> {
  const domain = await store.insertDomain(domainInput(slug));
  const root = await addCategory(store, domain.id, PLATFORMS);
  const child = await addCategory(store, domain.id, TOOLING, root.id);

  return { domain, root, child };
}

/**
 * Reads a category that must be there.
 *
 * @param store - The store to read.
 * @param id - The id to read under.
 * @returns The row.
 * @throws When no row carries the id, for the reason
 *   {@link readDomain} throws: two absences otherwise compare equal.
 */
async function readCategory(
  store: MemoryResearchStore,
  id: number,
): Promise<CategoryRecord> {
  const row = await store.findCategoryById(id);

  if (row === null) {
    throw new Error(`expected a stored category under ${id}`);
  }

  return row;
}

/**
 * Reads a domain that must be there.
 *
 * @param store - The store to read.
 * @param slug - The key to read under.
 * @returns The row.
 * @throws When no row carries the slug, rather than letting a null
 *   reach an assertion that would then be comparing two absences.
 */
async function readDomain(
  store: MemoryResearchStore,
  slug: string,
): Promise<DomainRecord> {
  const row = await store.findDomainBySlug(slug);

  if (row === null) {
    throw new Error(`expected a stored domain under ${slug}`);
  }

  return row;
}

/**
 * Runs a call that must be refused, and hands the refusal back.
 *
 * @param run - The call.
 * @returns The {@link StoreRefusal} it raised.
 * @throws When the call ANSWERED, so a case whose write quietly
 *   started succeeding fails here rather than asserting over an
 *   error that was never built. Anything else thrown is rethrown
 *   unchanged: a bug in the fake is not a refusal.
 */
async function refusalFrom(run: () => Promise<unknown>): Promise<StoreRefusal> {
  try {
    await run();
  } catch (err) {
    if (err instanceof StoreRefusal) {
      return err;
    }

    throw err;
  }

  throw new Error('expected a StoreRefusal, and the call answered');
}

/**
 * @param haystack - The text to search.
 * @param needle - The string to count.
 * @returns How many times the needle occurs. A count rather than a
 *   boolean, so a zero can be read against a known positive taken by
 *   the same function in the same case.
 */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** Four term patterns, in the same register as the taxonomy keys. */
const KUBERNETES = 'kubernetes';
const SERVICE_MESH = 'service mesh';
const WEBASSEMBLY = 'webassembly';
const EDGE = 'edge compute';

/** What {@link addTerm} defaults when a case is not about it. */
type TermDefaults = Partial<Omit<TermValues, 'pattern'>>;

/**
 * Inserts a term, defaulting the members a case is not about.
 *
 * @param store - The store to write to.
 * @param categoryId - The bucket it lands in.
 * @param pattern - What it looks for, within that bucket.
 * @param values - The three members a case may care about. `notes`
 *   defaults to null rather than to a string, because null is what a
 *   row with nothing recorded carries and a default note would make
 *   every case that clears one start from the wrong state.
 * @returns The stored row.
 */
async function addTerm(
  store: MemoryResearchStore,
  categoryId: number,
  pattern: string,
  values: TermDefaults = {},
): Promise<TermRecord> {
  return store.insertTerm({
    categoryId,
    pattern,
    weight: values.weight ?? 1,
    polarity: values.polarity ?? 'positive',
    notes: values.notes ?? null,
  });
}

/**
 * A domain carrying two roots, one holding two terms and one holding
 * a third.
 *
 * The state every claim about a term COLLECTION needs: an order to
 * read, a count that is not the same on both buckets, and a second
 * bucket for a cascade to leave standing.
 *
 * @param store - The store to write to.
 * @param slug - The domain to build the lexicon under.
 * @returns The domain, its two roots, and the three terms.
 */
async function seedLexicon(
  store: MemoryResearchStore,
  slug: string,
): Promise<{
  domain: DomainRecord;
  platforms: CategoryRecord;
  runtimes: CategoryRecord;
  mesh: TermRecord;
  kube: TermRecord;
  wasm: TermRecord;
}> {
  const domain = await store.insertDomain(domainInput(slug));
  const platforms = await addCategory(store, domain.id, PLATFORMS);
  const runtimes = await addCategory(store, domain.id, RUNTIMES);

  // Inserted out of pattern order, so every read-order claim below
  // is a claim about the sort rather than about insertion.
  const mesh = await addTerm(store, platforms.id, SERVICE_MESH, { weight: 5 });
  const kube = await addTerm(store, platforms.id, KUBERNETES, { weight: 3 });
  const wasm = await addTerm(store, runtimes.id, WEBASSEMBLY, {
    polarity: 'negative',
    notes: 'a runtime rather than a platform',
  });

  return { domain, platforms, runtimes, mesh, kube, wasm };
}

/**
 * Reads a term that must be there.
 *
 * @param store - The store to read.
 * @param id - The id to read under.
 * @returns The row.
 * @throws When no row carries the id, for the reason
 *   {@link readDomain} throws: two absences otherwise compare equal.
 */
async function readTerm(
  store: MemoryResearchStore,
  id: number,
): Promise<TermRecord> {
  const row = await store.findTermById(id);

  if (row === null) {
    throw new Error(`expected a stored term under ${id}`);
  }

  return row;
}

/**
 * Runs a call that must throw something that is NOT a
 * {@link StoreRefusal}, and hands the error back.
 *
 * The counterpart of {@link refusalFrom} for the one fault this
 * store deliberately does not translate: a document repeating a
 * pattern is SQLSTATE 21000, `classifyPgError` does not recognise
 * it, and a `StoreRefusal` here would be offering a caller a tidy
 * status the database never gave.
 *
 * @param run - The call.
 * @returns The error it raised.
 * @throws When the call ANSWERED, and when what it raised WAS a
 *   `StoreRefusal` — the second being the whole point, since a
 *   refusal would satisfy any assertion about a thrown error.
 */
async function plainErrorFrom(run: () => Promise<unknown>): Promise<Error> {
  try {
    await run();
  } catch (err) {
    if (err instanceof StoreRefusal) {
      throw new Error(
        'expected a plain Error, and a StoreRefusal arrived',
        { cause: err },
      );
    }

    if (err instanceof Error) {
      return err;
    }

    throw err;
  }

  throw new Error('expected an Error, and the call answered');
}

/**
 * The three roles `src/db/schema/domains.ts` names, and the only
 * ones any case here writes.
 *
 * Ordered `drafter`, `researcher`, `scorer` by code unit, which is
 * NOT the order they are seeded in: every read-order claim below is
 * therefore about the sort rather than about insertion.
 */
const RESEARCHER = 'researcher';
const SCORER = 'scorer';
const DRAFTER = 'drafter';

/**
 * Inserts a persona, defaulting the member a case is not about.
 *
 * @param store - The store to write to.
 * @param domainId - The domain it speaks for.
 * @param role - Its role, within that domain.
 * @param systemText - The text, derived from the role by default so
 *   two personas never share one string. Required on the port and
 *   defaulted here, since most cases are about the key rather than
 *   about the prose.
 * @returns The stored row.
 */
async function addPersona(
  store: MemoryResearchStore,
  domainId: number,
  role: string,
  systemText = `System text for ${role}`,
): Promise<PersonaRecord> {
  return store.insertPersona({ domainId, role, systemText });
}

/**
 * A domain carrying two personas.
 *
 * Two rather than one because every claim about the key needs a
 * second row to collide with, and every claim about the collection
 * needs an order to read.
 *
 * @param store - The store to write to.
 * @param slug - The domain to build them under.
 * @returns The domain and its two personas.
 */
async function seedPersonas(
  store: MemoryResearchStore,
  slug: string,
): Promise<{
  domain: DomainRecord;
  scorer: PersonaRecord;
  researcher: PersonaRecord;
}> {
  const domain = await store.insertDomain(domainInput(slug));

  // Inserted out of role order, so a read answering them sorted is
  // answering a sort rather than an insertion order.
  const scorer = await addPersona(store, domain.id, SCORER);
  const researcher = await addPersona(store, domain.id, RESEARCHER);

  return { domain, scorer, researcher };
}

/**
 * Reads a persona that must be there.
 *
 * @param store - The store to read.
 * @param id - The id to read under.
 * @returns The row.
 * @throws When no row carries the id, for the reason
 *   {@link readDomain} throws: two absences otherwise compare equal.
 */
async function readPersona(
  store: MemoryResearchStore,
  id: number,
): Promise<PersonaRecord> {
  const row = await store.findPersonaById(id);

  if (row === null) {
    throw new Error(`expected a stored persona under ${id}`);
  }

  return row;
}

/** Three topic subjects, in the same register as the taxonomy keys. */
const EDGE_INFERENCE = 'edge inference';
const RUNTIME_SECURITY = 'runtime security';
const WASM_TOOLCHAINS = 'wasm toolchains';

/**
 * An hour in seconds: the cadence every topic here runs at unless a
 * case is about the cadence.
 */
const HOURLY = 3600;

/** What {@link addTopic} defaults when a case is not about it. */
type TopicDefaults = Partial<Omit<InsertTopicInput, 'domainId' | 'name'>>;

/**
 * Inserts a topic, defaulting the members a case is not about.
 *
 * Every member of `InsertTopicInput` is required on the port — a
 * default is a decision, and the port takes none — so the defaults
 * live here, where a case that cares about one can see itself
 * overriding it.
 *
 * @param store - The store to write to.
 * @param domainId - The domain whose research it is part of.
 * @param name - Its subject, within that domain.
 * @param values - The five members a case may care about. The bounds
 *   default to null rather than to a number, because null is what a
 *   topic with no floor and no ceiling carries and a default bound
 *   would make every case that clears one start from the wrong
 *   state.
 * @returns The stored row.
 */
async function addTopic(
  store: MemoryResearchStore,
  domainId: number,
  name: string,
  values: TopicDefaults = {},
): Promise<TopicRecord> {
  return store.insertTopic({
    domainId,
    name,
    searchTerms: values.searchTerms ?? [],
    intervalSeconds: values.intervalSeconds ?? HOURLY,
    enabled: values.enabled ?? true,
    minIntervalSeconds: values.minIntervalSeconds ?? null,
    maxIntervalSeconds: values.maxIntervalSeconds ?? null,
  });
}

/**
 * A domain carrying two topics.
 *
 * Two rather than one because every claim about the key needs a
 * second row to collide with, and every claim about the collection
 * needs an order to read.
 *
 * @param store - The store to write to.
 * @param slug - The domain to build them under.
 * @returns The domain and its two topics.
 */
async function seedTopics(
  store: MemoryResearchStore,
  slug: string,
): Promise<{
  domain: DomainRecord;
  security: TopicRecord;
  edge: TopicRecord;
}> {
  const domain = await store.insertDomain(domainInput(slug));

  // Inserted out of name order, so a read answering them sorted is
  // answering a sort rather than an insertion order.
  const security = await addTopic(store, domain.id, RUNTIME_SECURITY);
  const edge = await addTopic(store, domain.id, EDGE_INFERENCE);

  return { domain, security, edge };
}

/**
 * Reads a topic that must be there.
 *
 * @param store - The store to read.
 * @param id - The id to read under.
 * @returns The row.
 * @throws When no row carries the id, for the reason
 *   {@link readDomain} throws: two absences otherwise compare equal.
 */
async function readTopic(
  store: MemoryResearchStore,
  id: number,
): Promise<TopicRecord> {
  const row = await store.findTopicById(id);

  if (row === null) {
    throw new Error(`expected a stored topic under ${id}`);
  }

  return row;
}

/**
 * The due time a topic must carry, ready to be read as a number.
 *
 * @param row - The row to reach into.
 * @returns Its `nextRunAt` in milliseconds — a primitive, which is
 *   what the copy cases compare against so that a store handing its
 *   own `Date` out cannot hold one lie against itself and pass.
 * @throws When the topic is unscheduled, so a case about a due time
 *   cannot quietly assert over a null.
 */
function dueAt(row: TopicRecord): number {
  if (row.nextRunAt === null) {
    throw new Error('expected the topic to carry a due time');
  }

  return row.nextRunAt.getTime();
}

/**
 * The search terms of a topic, ready to be written into.
 *
 * @param row - The row to reach into.
 * @returns Its `searchTerms`, cast writable — which is exactly the
 *   promise a shared reference would break behind the type system's
 *   back, since the port declares the array `readonly` as well as
 *   the member.
 */
function termsIn(row: TopicRecord): string[] {
  return row.searchTerms as string[];
}

/**
 * Two source endpoints, in the same neutral register as the slugs and
 * under the `.invalid` TLD nothing can resolve — the register
 * `src/sources/config-proposer.test.ts` already uses.
 *
 * `sources` carries NO unique key, so nothing here rests on the two
 * being different: a case wanting two rows on one endpoint is
 * ordinary rather than a refusal to be caught.
 */
const FEED_ENDPOINT = 'https://example.invalid/radar/feed.xml';
const ITEMS_ENDPOINT = 'https://example.invalid/radar/items';

/** What {@link addSource} defaults when a case is not about it. */
type SourceDefaults = Partial<
  Omit<InsertSourceInput, 'domainId' | 'endpoint'>
>;

/**
 * Inserts a source, defaulting the members a case is not about.
 *
 * Every member of `InsertSourceInput` is required on the port — a
 * default is a decision, and the port takes none — so the defaults
 * live here, where a case that cares about one can see itself
 * overriding it.
 *
 * @param store - The store to write to.
 * @param domainId - The domain whose research it supplies.
 * @param endpoint - Where the payload is. Never unique.
 * @param values - The four members a case may care about. `kind`
 *   defaults to a member of `SOURCE_KINDS`, since a case about the
 *   CHECK submits its own and every other case would otherwise have
 *   to name one.
 * @returns The stored row.
 */
async function addSource(
  store: MemoryResearchStore,
  domainId: number,
  endpoint: string,
  values: SourceDefaults = {},
): Promise<SourceRecord> {
  return store.insertSource({
    domainId,
    kind: values.kind ?? 'rss',
    endpoint,
    parserConfig: values.parserConfig ?? {},
    contract: values.contract ?? {},
    enabled: values.enabled ?? true,
  });
}

/**
 * A domain carrying two sources.
 *
 * Two rather than one because every claim about the collection needs
 * an order to read and a second row for a delete to leave standing.
 * They differ in `kind` as well as in endpoint, so a case about the
 * CHECK has a stored row that is not the one it is refusing.
 *
 * @param store - The store to write to.
 * @param slug - The domain to build them under.
 * @returns The domain and its two sources.
 */
async function seedSources(
  store: MemoryResearchStore,
  slug: string,
): Promise<{
  domain: DomainRecord;
  feed: SourceRecord;
  items: SourceRecord;
}> {
  const domain = await store.insertDomain(domainInput(slug));
  const feed = await addSource(store, domain.id, FEED_ENDPOINT);
  const items = await addSource(store, domain.id, ITEMS_ENDPOINT, {
    kind: 'api',
  });

  return { domain, feed, items };
}

/**
 * Reads a source that must be there.
 *
 * @param store - The store to read.
 * @param id - The id to read under.
 * @returns The row.
 * @throws When no row carries the id, for the reason
 *   {@link readDomain} throws: two absences otherwise compare equal.
 */
async function readSource(
  store: MemoryResearchStore,
  id: number,
): Promise<SourceRecord> {
  const row = await store.findSourceById(id);

  if (row === null) {
    throw new Error(`expected a stored source under ${id}`);
  }

  return row;
}

/** The instant every planted document is captured at by default. */
const CAPTURED = '2026-02-01T12:00:00.000Z';

/** What {@link planted} defaults when a case is not about it. */
type DocumentDefaults = Partial<Omit<MemorySourceDocument, 'id'>>;

/**
 * Builds one row for {@link MemoryResearchStore.setSourceDocuments}.
 *
 * A function rather than a constant, for the reason
 * {@link domainInput} is one: the copy cases WRITE into the
 * `capturedAt` they planted, which is the whole point of them, and a
 * shared row would carry that write into every case after it.
 *
 * @param id - The document id, which is also the queue's tiebreak.
 * @param values - The five members a case may care about.
 *   `parseStatus` defaults to `ok`, so a case wanting a failure says
 *   so and the aggregate cases start from the side that is not the
 *   queue's.
 * @returns The row to plant.
 */
function planted(
  id: number,
  values: DocumentDefaults = {},
): MemorySourceDocument {
  return {
    id,
    url: values.url ?? null,
    body: values.body ?? `Body of document ${id}`,
    parseError: values.parseError ?? null,
    capturedAt: values.capturedAt ?? new Date(CAPTURED),
    parseStatus: values.parseStatus ?? 'ok',
  };
}

/**
 * The capture instant of a queued failure, ready to be read as a
 * number.
 *
 * @param row - The row to reach into.
 * @returns Its `capturedAt` in milliseconds — a primitive, which is
 *   what the copy cases compare against so that a store handing its
 *   own `Date` out cannot hold one lie against itself and pass.
 */
function capturedAt(row: SourceFailureRecord): number {
  return row.capturedAt.getTime();
}

/**
 * Reads the one queued failure a case planted.
 *
 * @param store - The store to read.
 * @param sourceId - The source whose queue to read.
 * @returns The single row on its first page.
 * @throws When the queue is empty or holds more than one, so a case
 *   about one row cannot quietly assert over a page it did not mean.
 */
async function onlyFailure(
  store: MemoryResearchStore,
  sourceId: number,
): Promise<SourceFailureRecord> {
  const page = await store.listSourceFailures(sourceId, WHOLE_COLLECTION);
  const [row] = page;

  if (page.length !== 1 || row === undefined) {
    throw new Error(`expected one queued failure, and ${page.length} arrived`);
  }

  return row;
}

/**
 * Three connector names, in the same neutral register as the slugs.
 *
 * The two under one kind sort in the order they are written; the
 * third sorts BEFORE both by name and AFTER both by kind, which is
 * what lets one fixture tell an ordering by the pair from an
 * ordering by either column alone.
 */
const MODEL_HOST = 'example-model-host';
const SPARE_MODEL = 'example-spare-model';
const ARCHIVE_NOTEBOOK = 'example-archive-notebook';

/** Where a connector's client would reach, on the unresolvable TLD. */
const MODEL_ENDPOINT = 'https://example.invalid/v1/chat';

/**
 * A stand-in credential, and the needle the containment case counts.
 *
 * `connectors.config` is the one column reached in this file the
 * schema DECLARES one to be held in — `src/db/schema/sources.ts`
 * says whatever authenticates the call is held there. The store
 * answers it AS STORED, masking being `src/connectors/service.ts`'s,
 * so what a case here can ask is narrower than what the sentinel
 * capture asks of the assembled service: that a REFUSAL built over a
 * config carrying this does not carry it onward.
 */
const SECRET_TOKEN = 'example-secret-token-value';

/**
 * A connector config with something one level down to write through.
 *
 * A function rather than a constant, for the reason
 * {@link domainInput} is one: the copy cases WRITE into the config
 * they submitted, which is the whole point of them, and a shared
 * object would carry that write into every case after it.
 *
 * @param token - What to store as the credential.
 * @returns A config naming an endpoint and a nested secret.
 */
function connectorConfig(
  token: string = SECRET_TOKEN,
): Record<string, unknown> {
  return { endpoint: MODEL_ENDPOINT, credentials: { apiKey: token } };
}

/** What {@link addConnector} defaults when a case is not about it. */
type ConnectorDefaults = Partial<
  Omit<InsertConnectorInput, 'kind' | 'name'>
>;

/**
 * Inserts a connector, defaulting the member a case is not about.
 *
 * `config` is required on the port — a default is a decision, and
 * the port takes none — so the default lives here, where a case that
 * cares about it can see itself overriding it. Empty is what the
 * column defaults to and what `src/connectors/service.ts` supplies,
 * so it is the right default rather than a convenient one.
 *
 * @param store - The store to write to.
 * @param kind - The family the row fronts, and half its natural key.
 * @param name - Which instance of that family, and the other half.
 * @param values - The one member a case may care about.
 * @returns The stored row.
 */
async function addConnector(
  store: MemoryResearchStore,
  kind: string,
  name: string,
  values: ConnectorDefaults = {},
): Promise<ConnectorRecord> {
  return store.insertConnector({
    kind,
    name,
    config: values.config ?? {},
  });
}

/**
 * A deployment carrying three connectors across two kinds.
 *
 * WRITTEN IN AN ORDER NO READ ANSWERS: the notebook goes in first
 * and holds id 1, so a page reading in insertion order is
 * distinguishable from one reading by the pair. Two rows share a
 * kind, which is what a per-kind claim needs, and the third gives
 * the filter something to leave out and the delete something to
 * leave standing.
 *
 * NO DOMAIN, which is this fixture's one structural difference from
 * every sibling above: `connectors` hangs off nothing, so there is
 * nothing to insert one under.
 *
 * @param store - The store to write to.
 * @returns The three rows, named for what each fronts.
 */
async function seedConnectors(
  store: MemoryResearchStore,
): Promise<{
  notebook: ConnectorRecord;
  spare: ConnectorRecord;
  model: ConnectorRecord;
}> {
  const notebook = await addConnector(
    store,
    'notebook',
    ARCHIVE_NOTEBOOK,
  );
  const spare = await addConnector(store, 'llm', SPARE_MODEL);
  const model = await addConnector(store, 'llm', MODEL_HOST, {
    config: connectorConfig(),
  });

  return { notebook, spare, model };
}

/**
 * Reads a connector that must be there.
 *
 * @param store - The store to read.
 * @param id - The id to read under.
 * @returns The row.
 * @throws When no row carries the id, for the reason
 *   {@link readDomain} throws: two absences otherwise compare equal.
 */
async function readConnector(
  store: MemoryResearchStore,
  id: number,
): Promise<ConnectorRecord> {
  const row = await store.findConnectorById(id);

  if (row === null) {
    throw new Error(`expected a stored connector under ${id}`);
  }

  return row;
}

/**
 * The credential record a stored config must carry, ready to be
 * written into.
 *
 * @param config - The config to reach into.
 * @returns Its `credentials`, cast writable — which is exactly the
 *   promise a shared reference would break behind the type system's
 *   back.
 * @throws When the config carries none, so a copy case cannot
 *   quietly mutate nothing and pass for nobody's reason.
 */
function credentialsOf(config: unknown): Record<string, unknown> {
  const held = (config as { credentials?: unknown }).credentials;

  if (held === undefined || held === null) {
    throw new Error('expected the config to carry credentials');
  }

  return held as Record<string, unknown>;
}

/**
 * Two export formats, both members of `EXPORT_FORMATS`.
 *
 * `OBSIDIAN` sorts BEFORE `RSS`, which is what lets one page tell an
 * ordering by the pair from an ordering by the connector alone.
 */
const OBSIDIAN = 'obsidian_md';
const RSS = 'rss';

/** A daily cadence, in seconds: what a digest is delivered at. */
const DAILY = 86400;

/**
 * What {@link addSubscription} defaults when a case is not about it.
 */
type SubscriptionDefaults = Partial<
  Omit<InsertSubscriptionInput, 'domainId' | 'format' | 'connectorId'>
>;

/**
 * Inserts a subscription, defaulting the members a case is not about.
 *
 * Every member of `InsertSubscriptionInput` is required on the port
 * — a default is a decision, and the port takes none — so the
 * defaults live here, where a case that cares about one can see
 * itself overriding it. The bounds default to null rather than to a
 * number, because null is what a subscription with no floor and no
 * ceiling carries.
 *
 * @param store - The store to write to.
 * @param domainId - The domain whose material is exported.
 * @param format - What to render, and the second third of the key.
 * @param connectorId - Where it is delivered, and the last third.
 * @param values - The four members a case may care about.
 * @returns The stored row.
 */
async function addSubscription(
  store: MemoryResearchStore,
  domainId: number,
  format: string,
  connectorId: number,
  values: SubscriptionDefaults = {},
): Promise<SubscriptionRecord> {
  return store.insertSubscription({
    domainId,
    format,
    connectorId,
    intervalSeconds: values.intervalSeconds ?? DAILY,
    enabled: values.enabled ?? true,
    minIntervalSeconds: values.minIntervalSeconds ?? null,
    maxIntervalSeconds: values.maxIntervalSeconds ?? null,
  });
}

/**
 * A domain subscribing to two formats across two connectors, over
 * the deployment {@link seedConnectors} builds.
 *
 * THREE ROWS AND NO PAIR OF THEM SHARES A TRIPLE, which is what a key
 * over three columns needs before any claim about it can be made:
 * `digest` and `feed` share a connector and differ by format,
 * `digest` and `archive` share a format and differ by connector. A
 * store keying on either pair refuses one of the two.
 *
 * WRITTEN IN AN ORDER NO READ ANSWERS, AND THE SECOND HALF OF THAT IS
 * ARITHMETIC RATHER THAN TASTE. `feed` goes in first and holds the
 * lowest id while its format sorts LAST, so a page reading in
 * insertion order is distinguishable from one reading by the pair.
 * `archive` then goes in BEFORE `digest` though its connector sorts
 * after: the two share a format, so the connector is the only thing
 * separating them, and a store dropping that tie-break answers them
 * in the order they were written. Seeded the other way round the two
 * orders agree and the tie-break is pinned by nothing — measured,
 * the leg that drops it reddened zero cases.
 *
 * @param store - The store to write to.
 * @param slug - The domain to build them under.
 * @returns The domain, the three connectors, and the three rows.
 */
async function seedSubscriptions(
  store: MemoryResearchStore,
  slug: string,
): Promise<{
  domain: DomainRecord;
  model: ConnectorRecord;
  notebook: ConnectorRecord;
  digest: SubscriptionRecord;
  feed: SubscriptionRecord;
  archive: SubscriptionRecord;
}> {
  const domain = await store.insertDomain(domainInput(slug));
  const { model, notebook } = await seedConnectors(store);
  const feed = await addSubscription(store, domain.id, RSS, notebook.id);
  const archive = await addSubscription(store, domain.id, OBSIDIAN, model.id);
  const digest = await addSubscription(
    store,
    domain.id,
    OBSIDIAN,
    notebook.id,
  );

  return { domain, model, notebook, digest, feed, archive };
}

/**
 * Reads a subscription that must be there.
 *
 * @param store - The store to read.
 * @param id - The id to read under.
 * @returns The row.
 * @throws When no row carries the id, for the reason
 *   {@link readDomain} throws: two absences otherwise compare equal.
 */
async function readSubscription(
  store: MemoryResearchStore,
  id: number,
): Promise<SubscriptionRecord> {
  const row = await store.findSubscriptionById(id);

  if (row === null) {
    throw new Error(`expected a stored subscription under ${id}`);
  }

  return row;
}

/**
 * The due time a subscription must carry, ready to be read as a
 * number.
 *
 * @param row - The row to reach into.
 * @returns Its `nextRunAt` in milliseconds — a primitive, which is
 *   what the copy cases compare against so that a store handing its
 *   own `Date` out cannot hold one lie against itself and pass.
 * @throws When the subscription is unscheduled, so a case about a due
 *   time cannot quietly assert over a null.
 */
function dueFor(row: SubscriptionRecord): number {
  if (row.nextRunAt === null) {
    throw new Error('expected the subscription to carry a due time');
  }

  return row.nextRunAt.getTime();
}

/**
 * The natural key of a subscription, as one string.
 *
 * @param row - The row to read.
 * @returns Its format and connector joined, which is what the pair
 *   ordering is asserted over: two single-column lists would leave
 *   the pairing itself unasserted.
 */
function tripleOf(row: SubscriptionRecord): string {
  return `${row.format}/${row.connectorId}`;
}

/**
 * A complete operator settings payload: all three members
 * `OperatorSettings` declares.
 *
 * A function rather than a constant, for the reason
 * {@link domainInput} is one: the copy cases WRITE into the payload
 * they submitted, which is the whole point of them, and a shared
 * object would carry that write into every case after it.
 *
 * @returns A payload naming every member.
 */
function operatorInput(): OperatorSettings {
  return {
    defaultDomainSlug: RADAR,
    digestFormat: 'obsidian_md',
    notificationChannels: { email: true, webhook: false },
  };
}

/**
 * What the rewrite cases replace {@link operatorInput} with.
 *
 * ONE MEMBER, AND ONE THE STORED PAYLOAD ALSO CARRIES, which is what
 * makes the whole-unit rule observable: under a merge the read
 * answers three members where a replace answers one, and the value
 * of the shared member is the same under both. A replacement naming
 * a member the stored payload lacks would be answered identically by
 * a merge that only added.
 *
 * @returns A payload naming `digestFormat` and nothing else.
 */
function operatorRewrite(): OperatorSettings {
  return { digestFormat: 'rss' };
}

/**
 * Reads the settings that must have been written.
 *
 * @param store - The store to read.
 * @returns The stored payload.
 * @throws When nothing has been written, for the reason
 *   {@link readDomain} throws: a null would otherwise reach an
 *   assertion as though it were a payload.
 */
async function readSettings(
  store: MemoryResearchStore,
): Promise<OperatorSettings> {
  const settings = await store.readSettings();

  if (settings === null) {
    throw new Error('expected a stored settings payload');
  }

  return settings;
}

/**
 * The channel record a payload must carry, ready to be written into.
 *
 * @param settings - The payload to reach into.
 * @returns Its `notificationChannels`, cast writable — which is
 *   exactly the promise a shared reference would break behind the
 *   type system's back.
 * @throws When the payload carries none, so a copy case cannot
 *   quietly mutate nothing and pass for nobody's reason.
 */
function channelsOf(settings: OperatorSettings): Record<string, boolean> {
  const channels = settings.notificationChannels;

  if (channels === undefined) {
    throw new Error('expected the payload to carry notificationChannels');
  }

  return channels as Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// The one key this half can refuse on
// ---------------------------------------------------------------------------

describe('the domains_slug_unique key', () => {
  it('refuses a second domain on a slug one already holds', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));

    const refusal = await refusalFrom(
      () => store.insertDomain(domainInput(RADAR)),
    );

    expect(refusal).toBeInstanceOf(StoreRefusal);

    // The positive control, in this body rather than in a sibling
    // case: a store refusing every write passes the assertion above.
    const accepted = await store.insertDomain(domainInput(TRANSIT));

    expect(accepted.slug).toBe(TRANSIT);
  });

  it('names the mechanism and the constraint that refused', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));

    const refusal = await refusalFrom(
      () => store.insertDomain(domainInput(RADAR)),
    );

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe('domains_slug_unique');
  });

  it('carries only the two names this repository chose', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));

    const refusal = await refusalFrom(
      () => store.insertDomain(domainInput(RADAR)),
    );

    // `message`, `stack` and `cause` are non-enumerable on an
    // `Error`, so these are the fields a logger walking the object
    // writes — and a submitted value arriving on one of them would
    // be a red case rather than a new line on the wire.
    expect(Object.keys(refusal).sort()).toStrictEqual([
      'constraint',
      'name',
      'reason',
    ]);
  });

  it('puts the refused slug in nothing a logger can reach', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));

    const refusal = await refusalFrom(
      () => store.insertDomain(domainInput(RADAR)),
    );
    const serialised = JSON.stringify({
      ...refusal,
      message: refusal.message,
      stack: refusal.stack,
    });

    expect(countOccurrences(serialised, RADAR)).toBe(0);

    // The same search over a message that DOES carry the slug, so
    // the zero above is a reading rather than a search that finds
    // nothing anywhere.
    const planted = JSON.stringify({
      ...refusal,
      message: `duplicate key ${RADAR}`,
    });

    expect(countOccurrences(planted, RADAR)).toBe(1);
  });

  it('leaves the standing row exactly as it was', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));
    await refusalFrom(() => store.insertDomain({
      slug: RADAR,
      name: 'Rewritten by a refused insert',
      settings: { findingsDisplayName: 'Signal' },
    }));

    const stored = await readDomain(store, RADAR);

    expect(await store.countDomains()).toBe(1);
    expect(stored.name).toBe(`Domain ${RADAR}`);
    expect(stored.settings).toStrictEqual({});
  });

  it('frees the slug when the domain holding it is deleted', async () => {
    const store = createMemoryResearchStore();
    const first = await store.insertDomain(domainInput(RADAR));

    expect(await store.deleteDomain(first.id)).toBe(true);

    const second = await store.insertDomain(domainInput(RADAR));

    expect(second.slug).toBe(RADAR);
    expect(await store.countDomains()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The ids, and the gap a refusal leaves in them
// ---------------------------------------------------------------------------

describe('the id sequence', () => {
  it('hands the first domain id 1', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(domainInput(RADAR));

    expect(inserted.id).toBe(1);
  });

  it('hands each domain the next id', async () => {
    const store = createMemoryResearchStore();
    const ids: number[] = [];

    for (const slug of [RADAR, TRANSIT, 'example-coastal-weather']) {
      const inserted = await store.insertDomain(domainInput(slug));

      ids.push(inserted.id);
    }

    expect(ids).toStrictEqual([1, 2, 3]);
  });

  it('does not reuse the id of a deleted domain', async () => {
    const store = createMemoryResearchStore();
    const first = await store.insertDomain(domainInput(RADAR));

    await store.deleteDomain(first.id);

    const second = await store.insertDomain(domainInput(TRANSIT));

    expect(second.id).toBe(2);
  });

  it('burns an id on a refused insert, as the sequence does', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));
    await refusalFrom(() => store.insertDomain(domainInput(RADAR)));

    const third = await store.insertDomain(domainInput(TRANSIT));

    // 3 rather than 2, measured against the live Postgres on a
    // `bigserial` carrying a UNIQUE key: the sequence is read while
    // the row is formed, the index refuses the row afterwards, and a
    // sequence does not roll back.
    expect(third.id).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// What a caller can and cannot write into
// ---------------------------------------------------------------------------

describe('the dates crossing the boundary', () => {
  it('answers stamps a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(domainInput(RADAR));
    const stampedAt = inserted.createdAt.getTime();

    inserted.createdAt.setTime(0);
    inserted.updatedAt.setTime(0);

    const stored = await readDomain(store, RADAR);

    expect(stored.createdAt.getTime()).toBe(stampedAt);
    expect(stored.updatedAt.getTime()).toBe(stampedAt);
  });

  it('answers stamps the list read cannot be written through', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));

    const [listed] = await store.listDomains(WHOLE_COLLECTION);

    if (listed === undefined) {
      throw new Error('expected one row in the window');
    }

    const stampedAt = listed.createdAt.getTime();

    listed.createdAt.setTime(0);

    const stored = await readDomain(store, RADAR);

    expect(stored.createdAt.getTime()).toBe(stampedAt);
  });

  it('answers a fresh pair of dates on every read', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));

    const first = await readDomain(store, RADAR);
    const second = await readDomain(store, RADAR);

    expect(first.createdAt).not.toBe(second.createdAt);
    expect(first.createdAt.getTime()).toBe(second.createdAt.getTime());
  });

  it('does not read the clock object itself into a row', async () => {
    // `() => FIXED` is how a fixed clock gets written, and a store
    // that stamped the object it was handed would let this later
    // write move every row it had already stamped.
    const fixed = new Date('2026-01-01T00:00:00.000Z');
    const store = createMemoryResearchStore({ now: () => fixed });

    await store.insertDomain(domainInput(RADAR));

    fixed.setTime(Date.parse('2030-06-01T00:00:00.000Z'));

    const stored = await readDomain(store, RADAR);

    expect(stored.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('moves updatedAt on a patch and leaves createdAt standing', async () => {
    let clockMs = Date.parse('2026-01-01T00:00:00.000Z');
    const store = createMemoryResearchStore({ now: () => new Date(clockMs) });
    const inserted = await store.insertDomain(domainInput(RADAR));

    clockMs += 60_000;

    const patched = await store.updateDomain(inserted.id, {});

    expect(patched?.createdAt.getTime()).toBe(inserted.createdAt.getTime());
    expect(patched?.updatedAt.getTime()).toBe(clockMs);
  });
});

describe('the settings payload crossing the boundary', () => {
  it('does not store the object it was handed', async () => {
    const store = createMemoryResearchStore();
    const submitted: DomainSettings = { scoringWeights: { novelty: 1 } };

    await store.insertDomain(domainInput(RADAR, submitted));

    // A cast, because the port declares the payload deeply
    // `readonly` — which is exactly the promise a shared reference
    // would break behind the type system's back.
    (submitted.scoringWeights as Record<string, number>).novelty = 99;

    const stored = await readDomain(store, RADAR);

    expect(stored.settings).toStrictEqual({ scoringWeights: { novelty: 1 } });
  });

  it('does not answer the object it stores', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(
      domainInput(RADAR, { scoringWeights: { novelty: 1 } }),
    );

    (inserted.settings.scoringWeights as Record<string, number>).novelty = 99;

    const stored = await readDomain(store, RADAR);

    expect(stored.settings).toStrictEqual({ scoringWeights: { novelty: 1 } });
  });

  it('replaces the payload whole rather than merging into it', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(domainInput(RADAR, {
      findingsDisplayName: 'Signal',
      scoringWeights: { novelty: 1 },
    }));

    await store.updateDomain(inserted.id, {
      settings: { scoringWeights: { recency: 2 } },
    });

    const stored = await readDomain(store, RADAR);

    expect(stored.settings).toStrictEqual({ scoringWeights: { recency: 2 } });
  });

  it('leaves the payload standing when a patch omits it', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(
      domainInput(RADAR, { findingsDisplayName: 'Signal' }),
    );

    await store.updateDomain(inserted.id, { name: 'Renamed' });

    const stored = await readDomain(store, RADAR);

    expect(stored.name).toBe('Renamed');
    expect(stored.settings).toStrictEqual({ findingsDisplayName: 'Signal' });
  });
});

// ---------------------------------------------------------------------------
// The list, which is a window over an order
// ---------------------------------------------------------------------------

describe('the list read', () => {
  it('orders by slug ascending rather than by insertion', async () => {
    const store = createMemoryResearchStore();

    for (const slug of [TRANSIT, RADAR, 'example-coastal-weather']) {
      await store.insertDomain(domainInput(slug));
    }

    const listed = await store.listDomains(WHOLE_COLLECTION);

    expect(listed.map((row) => row.slug)).toStrictEqual([
      'example-coastal-weather',
      RADAR,
      TRANSIT,
    ]);
  });

  it('reads only the window it was given', async () => {
    const store = createMemoryResearchStore();

    for (const slug of [TRANSIT, RADAR, 'example-coastal-weather']) {
      await store.insertDomain(domainInput(slug));
    }

    const listed = await store.listDomains({ limit: 1, offset: 1 });

    expect(listed.map((row) => row.slug)).toStrictEqual([RADAR]);
    expect(await store.countDomains()).toBe(3);
  });

  it('answers an empty window past the end of the collection', async () => {
    const store = createMemoryResearchStore();

    await store.insertDomain(domainInput(RADAR));

    expect(await store.listDomains({ limit: 50, offset: 50 })).toStrictEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The counts the delete guard reads
// ---------------------------------------------------------------------------

describe('the dependent counts', () => {
  it('answers three zeros for a domain nothing points at', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(domainInput(RADAR));

    expect(await store.countDomainDependents(inserted.id)).toStrictEqual({
      topics: 0,
      sources: 0,
      findings: 0,
    });
  });

  it('answers what was planted, with an absent member as zero', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(domainInput(RADAR));

    store.setDomainDependents(inserted.id, { findings: 4, topics: 2 });

    expect(await store.countDomainDependents(inserted.id)).toStrictEqual({
      topics: 2,
      sources: 0,
      findings: 4,
    });
  });

  it('replaces the planted counts rather than merging into them', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(domainInput(RADAR));

    store.setDomainDependents(inserted.id, { findings: 4, topics: 2 });
    store.setDomainDependents(inserted.id, { sources: 1 });

    expect(await store.countDomainDependents(inserted.id)).toStrictEqual({
      topics: 0,
      sources: 1,
      findings: 0,
    });
  });

  it('answers three zeros for an id no domain carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.countDomainDependents(404)).toStrictEqual({
      topics: 0,
      sources: 0,
      findings: 0,
    });
  });

  it('answers counts a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(domainInput(RADAR));

    store.setDomainDependents(inserted.id, { findings: 4 });

    const counts = await store.countDomainDependents(inserted.id);

    (counts as { findings: number }).findings = 99;

    expect(await store.countDomainDependents(inserted.id)).toStrictEqual({
      topics: 0,
      sources: 0,
      findings: 4,
    });
  });

  it('forgets the counts of a deleted domain', async () => {
    const store = createMemoryResearchStore();
    const inserted = await store.insertDomain(domainInput(RADAR));

    store.setDomainDependents(inserted.id, { findings: 4 });

    await store.deleteDomain(inserted.id);

    expect(await store.countDomainDependents(inserted.id)).toStrictEqual({
      topics: 0,
      sources: 0,
      findings: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// The writes that find no row
// ---------------------------------------------------------------------------

describe('a write naming no stored domain', () => {
  it('answers null from a patch', async () => {
    const store = createMemoryResearchStore();

    expect(await store.updateDomain(404, { name: 'Nothing' })).toBeNull();
  });

  it('answers false from a delete', async () => {
    const store = createMemoryResearchStore();

    expect(await store.deleteDomain(404)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The natural key on categories
// ---------------------------------------------------------------------------

describe('the categories_domain_id_key_unique key', () => {
  it('refuses a second category on a key the domain holds', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    await addCategory(store, domain.id, PLATFORMS);

    const refusal = await refusalFrom(
      () => addCategory(store, domain.id, PLATFORMS),
    );

    expect(refusal).toBeInstanceOf(StoreRefusal);

    // The positive control, in this body rather than in a sibling
    // case: a store refusing every category passes the line above.
    const accepted = await addCategory(store, domain.id, TOOLING);

    expect(accepted.key).toBe(TOOLING);
  });

  it('names the mechanism and the constraint that refused', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    await addCategory(store, domain.id, PLATFORMS);

    const refusal = await refusalFrom(
      () => addCategory(store, domain.id, PLATFORMS),
    );

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe('categories_domain_id_key_unique');
  });

  it('takes the same key in a second domain', async () => {
    const store = createMemoryResearchStore();
    const first = await store.insertDomain(domainInput(RADAR));
    const second = await store.insertDomain(domainInput(TRANSIT));

    await addCategory(store, first.id, PLATFORMS);

    const accepted = await addCategory(store, second.id, PLATFORMS);

    expect(accepted.domainId).toBe(second.id);
    expect(accepted.key).toBe(PLATFORMS);
  });

  it('leaves the standing category exactly as it was', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const standing = await addCategory(store, domain.id, PLATFORMS);

    await refusalFrom(() => store.insertCategory({
      domainId: domain.id,
      key: PLATFORMS,
      name: 'Rewritten by a refused insert',
      parentId: null,
    }));

    const stored = await readCategory(store, standing.id);
    const listed = await store.listCategoriesWithTermCounts(domain.id);

    expect(listed).toHaveLength(1);
    expect(stored.name).toBe(`Category ${PLATFORMS}`);
  });

  it('puts the refused key in nothing a logger can reach', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    await addCategory(store, domain.id, PLATFORMS);

    const refusal = await refusalFrom(
      () => addCategory(store, domain.id, PLATFORMS),
    );
    const serialised = JSON.stringify({
      ...refusal,
      message: refusal.message,
      stack: refusal.stack,
    });

    expect(countOccurrences(serialised, PLATFORMS)).toBe(0);

    // The same search over a message that DOES carry the key, so the
    // zero above is a reading rather than a search finding nothing
    // anywhere.
    const planted = JSON.stringify({
      ...refusal,
      message: `duplicate key ${PLATFORMS}`,
    });

    expect(countOccurrences(planted, PLATFORMS)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The sequence behind categories.id
// ---------------------------------------------------------------------------

describe('the category id sequence', () => {
  it('hands the first category id 1', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const inserted = await addCategory(store, domain.id, PLATFORMS);

    // Its own counter, and not the domains one: the domain above
    // holds id 1 as well.
    expect(inserted.id).toBe(1);
    expect(domain.id).toBe(1);
  });

  it('burns an id on a key refusal and on a depth one', async () => {
    const store = createMemoryResearchStore();
    const { domain, child } = await seedOneLevel(store, RADAR);

    await refusalFrom(() => addCategory(store, domain.id, PLATFORMS));
    await refusalFrom(
      () => addCategory(store, domain.id, 'analytics', child.id),
    );

    const next = await addCategory(store, domain.id, RUNTIMES);

    // 5 rather than 3: the root and the child took 1 and 2, and both
    // refusals took one apiece. Measured on `categories` against the
    // live Postgres, where two refused inserts between two accepted
    // ones left a gap of two — the depth refusal included, since the
    // sequence is read before the trigger runs.
    expect(next.id).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// The three branches of the depth trigger
// ---------------------------------------------------------------------------

describe('the depth rule the trigger holds', () => {
  it('refuses a parent that is itself a child', async () => {
    const store = createMemoryResearchStore();
    const { domain, root, child } = await seedOneLevel(store, RADAR);

    const refusal = await refusalFrom(
      () => addCategory(store, domain.id, RUNTIMES, child.id),
    );

    expect(refusal).toBeInstanceOf(StoreRefusal);

    // The control: the same key under the ROOT is accepted, so the
    // refusal is about the depth and not about the write.
    const accepted = await addCategory(store, domain.id, RUNTIMES, root.id);

    expect(accepted.parentId).toBe(root.id);
  });

  it('refuses a parent belonging to another domain', async () => {
    const store = createMemoryResearchStore();
    const here = await store.insertDomain(domainInput(RADAR));
    const elsewhere = await store.insertDomain(domainInput(TRANSIT));
    const theirRoot = await addCategory(store, elsewhere.id, PLATFORMS);

    const refusal = await refusalFrom(
      () => addCategory(store, here.id, TOOLING, theirRoot.id),
    );

    expect(refusal).toBeInstanceOf(StoreRefusal);

    // The control: the same parent, asked for by a category in its
    // own domain.
    const accepted = await addCategory(
      store,
      elsewhere.id,
      TOOLING,
      theirRoot.id,
    );

    expect(accepted.parentId).toBe(theirRoot.id);
  });

  it('refuses a parent given to a row that has children', async () => {
    const store = createMemoryResearchStore();
    const { domain, root } = await seedOneLevel(store, RADAR);
    const other = await addCategory(store, domain.id, RUNTIMES);

    const refusal = await refusalFrom(
      () => store.updateCategory(root.id, { parentId: other.id }),
    );

    expect(refusal).toBeInstanceOf(StoreRefusal);

    // The control: a CHILDLESS root takes the very same parent, so
    // the refusal is about this row's children rather than about the
    // parent it named. Measured the same way against the live server.
    const moved = await store.updateCategory(other.id, { parentId: root.id });

    expect(moved?.parentId).toBe(root.id);
  });

  it('answers one check violation naming no constraint', async () => {
    const store = createMemoryResearchStore();
    const { domain, root, child } = await seedOneLevel(store, RADAR);
    const elsewhere = await store.insertDomain(domainInput(TRANSIT));
    const theirRoot = await addCategory(store, elsewhere.id, RUNTIMES);
    const branches = [
      () => addCategory(store, domain.id, 'a-parent-is-a-child', child.id),
      () => addCategory(store, domain.id, 'a-parent-elsewhere', theirRoot.id),
      () => store.updateCategory(root.id, { parentId: theirRoot.id }),
    ];

    for (const branch of branches) {
      const refusal = await refusalFrom(branch);

      // A trigger raising through `RAISE ... USING ERRCODE` names no
      // constraint, so the three branches are indistinguishable from
      // one another here — which is what makes `reason` alone the
      // discriminator a service is entitled to read.
      expect(refusal.reason).toBe('check-violation');
      expect(refusal.constraint).toBeUndefined();
    }
  });

  it('asks the depth question before the natural key', async () => {
    const store = createMemoryResearchStore();
    const { domain, child } = await seedOneLevel(store, RADAR);

    // Two faults at once: a key the domain already holds, and a
    // parent that is itself a child. Measured against the live
    // Postgres, this answers 23514 and not 23505 — the trigger is
    // BEFORE INSERT, so it runs while the row is still being formed
    // and ahead of the unique index.
    const refusal = await refusalFrom(
      () => addCategory(store, domain.id, PLATFORMS, child.id),
    );

    expect(refusal.reason).toBe('check-violation');
  });

  it('promotes a child to a root with an explicit null', async () => {
    const store = createMemoryResearchStore();
    const { child } = await seedOneLevel(store, RADAR);

    const promoted = await store.updateCategory(child.id, { parentId: null });

    expect(promoted?.parentId).toBeNull();
  });

  it('takes a null parent on a row that has children', async () => {
    const store = createMemoryResearchStore();
    const { root } = await seedOneLevel(store, RADAR);

    // The trigger's first branch returns before any of the three
    // rules, so a root may always be made a root again — which is
    // what leaves a way back up for a row the branch above refuses.
    const patched = await store.updateCategory(root.id, { parentId: null });

    expect(patched?.parentId).toBeNull();
  });

  it('takes a rename of a child, re-running the guard', async () => {
    const store = createMemoryResearchStore();
    const { child } = await seedOneLevel(store, RADAR);

    // The trigger fires on every UPDATE, so a rename re-asks all
    // three questions about the parent the row already has. A stored
    // row is always legal, so this cannot be refused — the case is
    // what keeps that a consequence rather than an assumption.
    const renamed = await store.updateCategory(child.id, { name: 'Renamed' });

    expect(renamed?.name).toBe('Renamed');
    expect(renamed?.parentId).toBe(child.parentId);
  });

  it('leaves the row where it was when it refuses a move', async () => {
    const store = createMemoryResearchStore();
    const { domain, root } = await seedOneLevel(store, RADAR);
    const other = await addCategory(store, domain.id, RUNTIMES);

    await refusalFrom(
      () => store.updateCategory(root.id, { parentId: other.id }),
    );

    const stored = await readCategory(store, root.id);

    expect(stored.parentId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The one foreign key, and the two refusals that share its name
// ---------------------------------------------------------------------------

describe('the parent_id foreign key', () => {
  it('refuses a parent naming no stored category', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    const refusal = await refusalFrom(
      () => addCategory(store, domain.id, TOOLING, 404),
    );

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe('categories_parent_id_categories_id_fk');
  });

  it('refuses a delete of a category holding children', async () => {
    const store = createMemoryResearchStore();
    const { root, child } = await seedOneLevel(store, RADAR);

    const refusal = await refusalFrom(() => store.deleteCategory(root.id));

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe('categories_parent_id_categories_id_fk');

    // The control: the CHILD, which nothing points at, is removable
    // by the same call — so the refusal is about what hangs off the
    // row rather than about deleting a category at all.
    expect(await store.deleteCategory(child.id)).toBe(true);
  });

  it('answers both under one reason and one constraint', async () => {
    const store = createMemoryResearchStore();
    const { domain, root } = await seedOneLevel(store, RADAR);

    const missingParent = await refusalFrom(
      () => addCategory(store, domain.id, RUNTIMES, 404),
    );
    const heldChildren = await refusalFrom(
      () => store.deleteCategory(root.id),
    );

    // Identical as VALUES, which is the fact the services above are
    // written around: a 422 and a 409 out of one name, told apart by
    // which call was made and by nothing on the refusal.
    expect(missingParent.reason).toBe(heldChildren.reason);
    expect(missingParent.constraint).toBe(heldChildren.constraint);
    expect(Object.keys(missingParent).sort()).toStrictEqual(
      Object.keys(heldChildren).sort(),
    );
  });

  it('asks the natural key before the missing parent', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    await addCategory(store, domain.id, PLATFORMS);

    // Two faults again, and this pair goes the other way: measured
    // against the live Postgres, a duplicate key beside a parent
    // naming no row answers 23505, because the unique index is
    // checked at insertion and the foreign key afterwards.
    const refusal = await refusalFrom(
      () => addCategory(store, domain.id, PLATFORMS, 404),
    );

    expect(refusal.reason).toBe('unique-violation');
  });

  it('takes the delete once the children are reparented', async () => {
    const store = createMemoryResearchStore();
    const { root, child } = await seedOneLevel(store, RADAR);

    await refusalFrom(() => store.deleteCategory(root.id));
    await store.updateCategory(child.id, { parentId: null });

    expect(await store.deleteCategory(root.id)).toBe(true);
    expect(await store.findCategoryById(child.id)).not.toBeNull();
  });

  it('leaves the children standing when it refuses', async () => {
    const store = createMemoryResearchStore();
    const { domain, root, child } = await seedOneLevel(store, RADAR);

    await refusalFrom(() => store.deleteCategory(root.id));

    const listed = await store.listCategoriesWithTermCounts(domain.id);

    expect(listed.map((row) => row.id).sort()).toStrictEqual(
      [root.id, child.id].sort(),
    );
  });

  it('answers false for an id no category carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.deleteCategory(404)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The cascade a domain delete runs, and what it must not consult
// ---------------------------------------------------------------------------

describe('the domain cascade over a taxonomy', () => {
  it('takes a parent and its children together', async () => {
    const store = createMemoryResearchStore();
    const { domain, root, child } = await seedOneLevel(store, RADAR);

    // The trap `NO ACTION` sets for a fake: the rule is checked at
    // the end of the statement, by which point the cascade has taken
    // both rows. Measured against the live Postgres, where the same
    // delete answered and left the table empty. A store reusing its
    // own `deleteCategory` here would refuse this.
    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await store.findCategoryById(root.id)).toBeNull();
    expect(await store.findCategoryById(child.id)).toBeNull();
  });

  it('leaves a second domain taxonomy standing', async () => {
    const store = createMemoryResearchStore();
    const going = await seedOneLevel(store, RADAR);
    const staying = await seedOneLevel(store, TRANSIT);

    await store.deleteDomain(going.domain.id);

    const listed = await store.listCategoriesWithTermCounts(
      staying.domain.id,
    );

    expect(listed.map((row) => row.key)).toStrictEqual([PLATFORMS, TOOLING]);
  });

  it('frees the keys the deleted domain held', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedOneLevel(store, RADAR);

    await store.deleteDomain(domain.id);

    const rebuilt = await store.insertDomain(domainInput(RADAR));
    const accepted = await addCategory(store, rebuilt.id, PLATFORMS);

    expect(accepted.key).toBe(PLATFORMS);
  });
});

// ---------------------------------------------------------------------------
// The category reads
// ---------------------------------------------------------------------------

describe('the category list', () => {
  it('orders by key rather than by insertion', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    for (const key of [TOOLING, RUNTIMES, PLATFORMS]) {
      await addCategory(store, domain.id, key);
    }

    const listed = await store.listCategoriesWithTermCounts(domain.id);

    expect(listed.map((row) => row.key)).toStrictEqual([
      PLATFORMS,
      RUNTIMES,
      TOOLING,
    ]);
  });

  it('lists only the categories of the domain asked about', async () => {
    const store = createMemoryResearchStore();
    const here = await store.insertDomain(domainInput(RADAR));
    const elsewhere = await store.insertDomain(domainInput(TRANSIT));

    await addCategory(store, here.id, PLATFORMS);
    await addCategory(store, elsewhere.id, RUNTIMES);

    const listed = await store.listCategoriesWithTermCounts(here.id);

    expect(listed.map((row) => row.key)).toStrictEqual([PLATFORMS]);
  });

  it('answers a counted zero rather than an absent member', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedOneLevel(store, RADAR);

    const listed = await store.listCategoriesWithTermCounts(domain.id);

    // Zero because THIS case writes no term, rather than because
    // the store cannot: the term half below plants them and reads
    // the same list back with mixed counts. What is pinned here is
    // the counted zero rather than an absent member, which is the
    // one answer `CategoryWithTermCount` forbids.
    expect(listed.map((row) => row.termCount)).toStrictEqual([0, 0]);
  });

  it('answers an empty list for a domain with no taxonomy', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    expect(await store.listCategoriesWithTermCounts(domain.id))
      .toStrictEqual([]);
  });

  it('answers rows a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { domain, root } = await seedOneLevel(store, RADAR);
    const [listed] = await store.listCategoriesWithTermCounts(domain.id);

    if (listed === undefined) {
      throw new Error('expected the taxonomy to carry a first row');
    }

    (listed as { name: string }).name = 'Written through the port';

    const stored = await readCategory(store, root.id);

    expect(stored.name).toBe(`Category ${PLATFORMS}`);
  });
});

describe('the single category read', () => {
  it('answers null for an id no category carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.findCategoryById(404)).toBeNull();
  });

  it('answers a row a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { root } = await seedOneLevel(store, RADAR);
    const read = await readCategory(store, root.id);

    (read as { key: string }).key = 'rewritten';

    expect((await readCategory(store, root.id)).key).toBe(PLATFORMS);
  });
});

// ---------------------------------------------------------------------------
// The category patch
// ---------------------------------------------------------------------------

describe('the category patch', () => {
  it('renames without touching the key or the parent', async () => {
    const store = createMemoryResearchStore();
    const { child } = await seedOneLevel(store, RADAR);

    const patched = await store.updateCategory(child.id, { name: 'Renamed' });

    expect(patched?.name).toBe('Renamed');
    expect(patched?.key).toBe(TOOLING);
    expect(patched?.parentId).toBe(child.parentId);
  });

  it('answers the stored row for a patch naming no member', async () => {
    const store = createMemoryResearchStore();
    const { child } = await seedOneLevel(store, RADAR);

    // A legal call rather than a no-op to be avoided: `categories`
    // carries no `updated_at`, so an empty patch has nothing to set
    // and answers the row without writing.
    const patched = await store.updateCategory(child.id, {});

    expect(patched).toStrictEqual(child);
  });

  it('answers null from a patch naming no stored category', async () => {
    const store = createMemoryResearchStore();

    expect(await store.updateCategory(404, { name: 'Nothing' })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The key the term half can refuse on
// ---------------------------------------------------------------------------

describe('the terms_category_id_pattern_unique key', () => {
  it('refuses a second term on a pattern the category holds', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const refusal = await refusalFrom(
      () => addTerm(store, platforms.id, KUBERNETES),
    );

    expect(refusal).toBeInstanceOf(StoreRefusal);

    // The positive control, in this body rather than in a sibling
    // case: a store refusing every write passes the assertion above.
    const accepted = await addTerm(store, platforms.id, WEBASSEMBLY);

    expect(accepted.pattern).toBe(WEBASSEMBLY);
    expect(await store.countTerms(platforms.id)).toBe(3);
  });

  it('names the mechanism and the constraint that refused', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const refusal = await refusalFrom(
      () => addTerm(store, platforms.id, KUBERNETES),
    );

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe('terms_category_id_pattern_unique');
  });

  it('takes the same pattern in a sibling category', async () => {
    const store = createMemoryResearchStore();
    const { platforms, runtimes } = await seedLexicon(store, RADAR);

    // The key is `(category_id, pattern)` and not `pattern`, so this
    // is the widening control: a store holding patterns globally
    // unique refuses a write the database takes.
    const accepted = await addTerm(store, runtimes.id, KUBERNETES);

    expect(accepted.categoryId).toBe(runtimes.id);
    expect(await store.countTerms(platforms.id)).toBe(2);
    expect(await store.countTerms(runtimes.id)).toBe(2);
  });

  it('leaves the standing term exactly as it was', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube } = await seedLexicon(store, RADAR);

    await refusalFrom(() => store.insertTerm({
      categoryId: platforms.id,
      pattern: KUBERNETES,
      weight: 99,
      polarity: 'negative',
      notes: 'rewritten by a refused insert',
    }));

    expect(await readTerm(store, kube.id)).toStrictEqual(kube);
    expect(await store.countTerms(platforms.id)).toBe(2);
  });

  it('puts the refused pattern in nothing a logger can reach', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const refusal = await refusalFrom(
      () => addTerm(store, platforms.id, KUBERNETES),
    );
    const serialised = JSON.stringify({
      ...refusal,
      message: refusal.message,
      stack: refusal.stack,
    });

    expect(countOccurrences(serialised, KUBERNETES)).toBe(0);

    // The same search over a message that DOES carry the pattern, so
    // the zero above is a reading rather than a search finding
    // nothing anywhere.
    const planted = JSON.stringify({
      ...refusal,
      message: `duplicate key ${KUBERNETES}`,
    });

    expect(countOccurrences(planted, KUBERNETES)).toBe(1);
  });

  it('refuses a rename onto a pattern the category holds', async () => {
    const store = createMemoryResearchStore();
    const { mesh, kube } = await seedLexicon(store, RADAR);

    const refusal = await refusalFrom(
      () => store.updateTerm(mesh.id, { pattern: KUBERNETES }),
    );

    expect(refusal.constraint).toBe('terms_category_id_pattern_unique');
    expect(await readTerm(store, mesh.id)).toStrictEqual(mesh);
    expect(await readTerm(store, kube.id)).toStrictEqual(kube);
  });

  it('refuses a bucket move onto a pair already taken', async () => {
    const store = createMemoryResearchStore();
    const { runtimes, kube } = await seedLexicon(store, RADAR);

    await addTerm(store, runtimes.id, KUBERNETES);

    // Both halves of the key are patchable, so the rule is about the
    // RESULTING pair: this move renames nothing and is refused all
    // the same.
    const refusal = await refusalFrom(
      () => store.updateTerm(kube.id, { categoryId: runtimes.id }),
    );

    expect(refusal.reason).toBe('unique-violation');
    expect((await readTerm(store, kube.id)).categoryId).toBe(kube.categoryId);
  });

  it('takes a patch writing a term pattern back over itself', async () => {
    const store = createMemoryResearchStore();
    const { kube } = await seedLexicon(store, RADAR);

    // A row is not in conflict with itself — measured against the
    // live Postgres, where an update writing a term's own pattern
    // back over it is accepted. A store looking the pair up without
    // excluding the row being written refuses this.
    const patched = await store.updateTerm(kube.id, {
      pattern: KUBERNETES,
      weight: 8,
    });

    expect(patched?.weight).toBe(8);
    expect(patched?.pattern).toBe(KUBERNETES);
  });
});

// ---------------------------------------------------------------------------
// The sequence behind terms.id
// ---------------------------------------------------------------------------

describe('the term id sequence', () => {
  it('hands the first term id 1', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const category = await addCategory(store, domain.id, PLATFORMS);
    const inserted = await addTerm(store, category.id, KUBERNETES);

    // Its own counter, and neither of the other two: the domain and
    // the category above hold id 1 as well.
    expect(inserted.id).toBe(1);
    expect(category.id).toBe(1);
    expect(domain.id).toBe(1);
  });

  it('burns an id on a refused insert, as the sequence does', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    await refusalFrom(() => addTerm(store, platforms.id, KUBERNETES));

    const next = await addTerm(store, platforms.id, WEBASSEMBLY);

    // 5 rather than 4: the three seeded terms took 1, 2 and 3, and
    // the refusal took the fourth. Measured on `terms` against the
    // live Postgres, where a duplicate pattern between two accepted
    // inserts left a gap of exactly one.
    expect(next.id).toBe(5);
  });

  it('burns one id per submitted row of an upsert', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    await store.upsertTerms(platforms.id, [
      { pattern: KUBERNETES, weight: 7, polarity: 'positive', notes: null },
      { pattern: WEBASSEMBLY, weight: 2, polarity: 'positive', notes: null },
    ]);

    const next = await addTerm(store, platforms.id, EDGE);

    // The rewritten row took an id and left it unused, so the new
    // row of that batch is 5 and the next insert is 6 — measured
    // against the live Postgres, where a two-row batch moved the
    // sequence by two while writing one new row.
    expect((await readTerm(store, 5)).pattern).toBe(WEBASSEMBLY);
    expect(next.id).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// The foreign key onto categories.id
// ---------------------------------------------------------------------------

describe('the term category foreign key', () => {
  it('refuses an insert naming no stored category', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const refusal = await refusalFrom(
      () => addTerm(store, platforms.id + 400, KUBERNETES),
    );

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe('terms_category_id_categories_id_fk');

    // The positive control: the same write into a category that
    // exists is taken.
    const accepted = await addTerm(store, platforms.id, WEBASSEMBLY);

    expect(accepted.categoryId).toBe(platforms.id);
  });

  it('refuses an upsert naming no stored category', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const refusal = await refusalFrom(() => store.upsertTerms(
      platforms.id + 400,
      [{ pattern: KUBERNETES, weight: 1, polarity: 'positive', notes: null }],
    ));

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe('terms_category_id_categories_id_fk');
  });

  it('takes an empty upsert into a category that is not there', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    // No statement runs for an empty document, so there is no
    // foreign key to check — which the port states and which is why
    // the early return sits above every check.
    expect(await store.upsertTerms(platforms.id + 400, [])).toStrictEqual([]);
  });

  it('takes a bucket move into another domain category', async () => {
    const store = createMemoryResearchStore();
    const { kube } = await seedLexicon(store, RADAR);
    const other = await store.insertDomain(domainInput(TRANSIT));
    const elsewhere = await addCategory(store, other.id, PLATFORMS);

    // Measured: nothing in the schema relates a term to a domain, so
    // the database takes this. The rule that a bucket move must stay
    // inside one domain is the service's, and a store enforcing it
    // would be refusing something no deployment refuses.
    const moved = await store.updateTerm(kube.id, {
      categoryId: elsewhere.id,
    });

    expect(moved?.categoryId).toBe(elsewhere.id);
    expect(moved?.id).toBe(kube.id);
  });

  it('refuses a bucket move onto a category that is not there', async () => {
    const store = createMemoryResearchStore();
    const { kube, platforms } = await seedLexicon(store, RADAR);

    const refusal = await refusalFrom(
      () => store.updateTerm(kube.id, { categoryId: platforms.id + 400 }),
    );

    expect(refusal.constraint).toBe('terms_category_id_categories_id_fk');
    expect((await readTerm(store, kube.id)).categoryId).toBe(platforms.id);
  });
});

// ---------------------------------------------------------------------------
// The upsert on that same key
// ---------------------------------------------------------------------------

describe('the upsert on the natural key', () => {
  it('rewrites weight, polarity and notes on a held pattern', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube } = await seedLexicon(store, RADAR);

    const written = await store.upsertTerms(platforms.id, [{
      pattern: KUBERNETES,
      weight: 42,
      polarity: 'negative',
      notes: 'rewritten by the lexicon',
    }]);

    expect(written).toStrictEqual([{
      id: kube.id,
      categoryId: platforms.id,
      pattern: KUBERNETES,
      weight: 42,
      polarity: 'negative',
      notes: 'rewritten by the lexicon',
    }]);

    // The answered row and the stored row are two claims, not one
    // shape written twice: a write that lies consistently satisfies
    // the first on its own.
    expect(await readTerm(store, kube.id)).toStrictEqual(written[0]);
  });

  it('keeps the stored row id rather than writing a new row', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube } = await seedLexicon(store, RADAR);

    const written = await store.upsertTerms(platforms.id, [{
      pattern: KUBERNETES,
      weight: 42,
      polarity: 'negative',
      notes: null,
    }]);

    // Measured against the live Postgres: the `ON CONFLICT ... DO
    // UPDATE` answered the STORED id. A term keeping its id across a
    // re-import is what lets import, export and re-import settle
    // instead of counting the same match twice.
    expect(written[0]?.id).toBe(kube.id);
    expect(await store.countTerms(platforms.id)).toBe(2);
  });

  it('inserts a pattern the category does not already hold', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const written = await store.upsertTerms(platforms.id, [{
      pattern: WEBASSEMBLY,
      weight: 6,
      polarity: 'positive',
      notes: null,
    }]);

    expect(written[0]?.pattern).toBe(WEBASSEMBLY);
    expect(await store.countTerms(platforms.id)).toBe(3);
  });

  it('writes every row of a batch that both rewrites and adds', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube } = await seedLexicon(store, RADAR);

    await store.upsertTerms(platforms.id, [
      { pattern: KUBERNETES, weight: 9, polarity: 'negative', notes: 'moved' },
      { pattern: WEBASSEMBLY, weight: 2, polarity: 'positive', notes: null },
    ]);

    const stored = await store.listTerms(platforms.id);

    expect(stored.map((row) => [row.pattern, row.weight])).toStrictEqual([
      [KUBERNETES, 9],
      [SERVICE_MESH, 5],
      [WEBASSEMBLY, 2],
    ]);
    expect((await readTerm(store, kube.id)).notes).toBe('moved');
  });

  it('leaves the terms a document does not name standing', async () => {
    const store = createMemoryResearchStore();
    const { platforms, mesh } = await seedLexicon(store, RADAR);

    await store.upsertTerms(platforms.id, [
      { pattern: KUBERNETES, weight: 9, polarity: 'negative', notes: null },
    ]);

    // An upsert is not a replace: a lexicon rewrites the rows it
    // names and takes nothing away, which is what makes a partial
    // document safe to apply.
    expect(await readTerm(store, mesh.id)).toStrictEqual(mesh);
  });

  it('answers an empty list for an empty document', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    expect(await store.upsertTerms(platforms.id, [])).toStrictEqual([]);
    expect(await store.countTerms(platforms.id)).toBe(2);

    // The counter is untouched too, since no statement ran: the next
    // insert takes the id the seeded rows left off at.
    expect((await addTerm(store, platforms.id, WEBASSEMBLY)).id).toBe(4);
  });

  it('settles when the same document is applied twice', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);
    const document: readonly TermValues[] = [
      { pattern: KUBERNETES, weight: 9, polarity: 'negative', notes: null },
      { pattern: WEBASSEMBLY, weight: 2, polarity: 'positive', notes: 'w' },
    ];

    const first = await store.upsertTerms(platforms.id, document);
    const second = await store.upsertTerms(platforms.id, document);

    // Import, export, re-import: the second pass rewrites the same
    // rows rather than accumulating a second copy that would count
    // the same match twice.
    expect(second).toStrictEqual(first);
    expect(await store.countTerms(platforms.id)).toBe(3);
  });

  it('answers rows a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const written = await store.upsertTerms(platforms.id, [
      { pattern: KUBERNETES, weight: 9, polarity: 'negative', notes: null },
    ]);
    const answered = written[0];

    if (answered === undefined) {
      throw new Error('expected the upsert to answer one row');
    }

    // The mutation is the case: an assertion by value would pass
    // against a store handing its own objects out.
    (answered as { weight: number }).weight = 1234;

    expect((await readTerm(store, answered.id)).weight).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// The one refusal that is deliberately not a StoreRefusal
// ---------------------------------------------------------------------------

describe('a document repeating one pattern', () => {
  it('throws, rather than applying the last of the collision', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    // Postgres answers SQLSTATE 21000 here and `classifyPgError`
    // does not recognise it, so this reaches a route as a 500 by
    // design: the fault is in the document rather than in the
    // request, and a tidy status would name neither colliding row.
    // A store applying the last row would be ACCEPTING what the
    // database refuses.
    await plainErrorFrom(() => store.upsertTerms(platforms.id, [
      { pattern: WEBASSEMBLY, weight: 1, polarity: 'positive', notes: null },
      { pattern: WEBASSEMBLY, weight: 2, polarity: 'negative', notes: null },
    ]));

    expect(await store.countTerms(platforms.id)).toBe(2);
  });

  it('writes nothing at all, the rows before the repeat too', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube, mesh } = await seedLexicon(store, RADAR);

    await plainErrorFrom(() => store.upsertTerms(platforms.id, [
      { pattern: EDGE, weight: 1, polarity: 'positive', notes: null },
      { pattern: WEBASSEMBLY, weight: 1, polarity: 'positive', notes: null },
      { pattern: WEBASSEMBLY, weight: 2, polarity: 'negative', notes: null },
    ]));

    // One statement is atomic, so a document lands whole or not at
    // all — a store looping row by row leaves the first row behind,
    // and nothing about the repeat would report it.
    expect(await store.listTerms(platforms.id)).toStrictEqual([kube, mesh]);
  });

  it('is checked before the category the document names', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    // Measured against the live Postgres: a batch that BOTH repeats
    // a pattern and names a category that does not exist answers
    // 21000 and not 23503. Only a two-fault call can see it, which
    // is why it is a case of its own.
    const raised = await plainErrorFrom(() => store.upsertTerms(
      platforms.id + 400,
      [
        { pattern: WEBASSEMBLY, weight: 1, polarity: 'positive', notes: null },
        { pattern: WEBASSEMBLY, weight: 2, polarity: 'negative', notes: null },
      ],
    ));

    expect(raised).not.toBeInstanceOf(StoreRefusal);
  });

  it('names the constraint and no part of the document', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const raised = await plainErrorFrom(() => store.upsertTerms(platforms.id, [
      { pattern: WEBASSEMBLY, weight: 1, polarity: 'positive', notes: null },
      { pattern: WEBASSEMBLY, weight: 2, polarity: 'negative', notes: null },
    ]));
    const serialised = JSON.stringify({
      message: raised.message,
      stack: raised.stack,
    });

    expect(countOccurrences(serialised, WEBASSEMBLY)).toBe(0);
    expect(raised.message)
      .toContain('terms_category_id_pattern_unique');

    // The same search over a message that DOES carry the pattern, so
    // the zero above is a reading rather than a search finding
    // nothing anywhere.
    const planted = JSON.stringify({
      message: `two rows on ${WEBASSEMBLY}`,
      stack: raised.stack,
    });

    expect(countOccurrences(planted, WEBASSEMBLY)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The cascade that takes a category's terms with it
// ---------------------------------------------------------------------------

describe('the category cascade over its terms', () => {
  it('removes the terms of the category it deletes', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube, mesh } = await seedLexicon(store, RADAR);

    expect(await store.deleteCategory(platforms.id)).toBe(true);

    // `terms.category_id` is `ON DELETE CASCADE` — measured, the
    // delete answers and the category's rows are gone. Read back
    // through the term id as well as through the count: a store
    // dropping a bucket without its rows leaves them reachable by
    // id while every count reads zero.
    expect(await store.countTerms(platforms.id)).toBe(0);
    expect(await store.findTermById(kube.id)).toBeNull();
    expect(await store.findTermById(mesh.id)).toBeNull();
  });

  it('is not refused by a category that holds only terms', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    // The guard on this delete is about CHILDREN, and a term is not
    // a child: a store reusing the children guard over its terms
    // refuses a delete Postgres takes.
    expect(await store.deleteCategory(platforms.id)).toBe(true);
    expect(await store.findCategoryById(platforms.id)).toBeNull();
  });

  it('leaves a sibling category terms standing', async () => {
    const store = createMemoryResearchStore();
    const { platforms, runtimes, wasm } = await seedLexicon(store, RADAR);

    await store.deleteCategory(platforms.id);

    expect(await store.countTerms(runtimes.id)).toBe(1);
    expect(await readTerm(store, wasm.id)).toStrictEqual(wasm);
  });

  it('frees the pattern for a category written in its place', async () => {
    const store = createMemoryResearchStore();
    const { domain, platforms } = await seedLexicon(store, RADAR);

    await store.deleteCategory(platforms.id);

    const replacement = await addCategory(store, domain.id, PLATFORMS);
    const written = await addTerm(store, replacement.id, KUBERNETES);

    expect(written.pattern).toBe(KUBERNETES);
    expect(await store.countTerms(replacement.id)).toBe(1);
  });

  it('leaves the terms standing when the delete is refused', async () => {
    const store = createMemoryResearchStore();
    const { domain, root, child } = await seedOneLevel(store, RADAR);
    const held = await addTerm(store, root.id, KUBERNETES);

    await refusalFrom(() => store.deleteCategory(root.id));

    // The refusal happens before anything is dropped, so a store
    // cascading ahead of its guard loses rows on a call that
    // answered nothing.
    expect(await readTerm(store, held.id)).toStrictEqual(held);
    expect(await store.countTerms(root.id)).toBe(1);
    expect(await store.findCategoryById(child.id)).not.toBeNull();
    expect(await store.findDomainBySlug(domain.slug)).not.toBeNull();
  });
});

describe('the domain cascade over its terms', () => {
  it('takes the categories and their terms together', async () => {
    const store = createMemoryResearchStore();
    const { domain, platforms, kube, wasm } = await seedLexicon(store, RADAR);

    expect(await store.deleteDomain(domain.id)).toBe(true);

    // Two levels down: the domain cascade removes its categories,
    // and each of those cascades onto its own terms. Measured — a
    // domain delete left zero rows in `categories` and zero in
    // `terms`.
    expect(await store.listCategoriesWithTermCounts(domain.id))
      .toStrictEqual([]);
    expect(await store.countTerms(platforms.id)).toBe(0);
    expect(await store.findTermById(kube.id)).toBeNull();
    expect(await store.findTermById(wasm.id)).toBeNull();
  });

  it('leaves a second domain terms standing', async () => {
    const store = createMemoryResearchStore();
    const radar = await seedLexicon(store, RADAR);
    const transit = await seedLexicon(store, TRANSIT);

    await store.deleteDomain(radar.domain.id);

    expect(await store.countTerms(transit.platforms.id)).toBe(2);
    expect(await readTerm(store, transit.wasm.id))
      .toStrictEqual(transit.wasm);
  });

  it('takes a parent, its children and both their terms', async () => {
    const store = createMemoryResearchStore();
    const { domain, root, child } = await seedOneLevel(store, RADAR);
    const onRoot = await addTerm(store, root.id, KUBERNETES);
    const onChild = await addTerm(store, child.id, WEBASSEMBLY);

    // The children guard is not consulted here: it is checked at the
    // end of the statement, by which point the cascade has removed
    // the parent and the child together. A store looping its own
    // guarded delete refuses this, and only for a taxonomy with more
    // than one level.
    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await store.findTermById(onRoot.id)).toBeNull();
    expect(await store.findTermById(onChild.id)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The term reads
// ---------------------------------------------------------------------------

describe('the term list', () => {
  it('orders by pattern ascending rather than by insertion', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    await addTerm(store, platforms.id, EDGE);

    expect((await store.listTerms(platforms.id)).map((row) => row.pattern))
      .toStrictEqual([EDGE, KUBERNETES, SERVICE_MESH]);
  });

  it('reads the whole category when it is given no window', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    // The export's call: a `?format=seed` document is about the
    // category as a whole, and counting first and then asking for a
    // window that size would be two reads that can disagree.
    expect(await store.listTerms(platforms.id)).toHaveLength(2);
  });

  it('reads only the window it was given', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    await addTerm(store, platforms.id, EDGE);

    const page = await store.listTerms(platforms.id, { limit: 1, offset: 1 });

    expect(page.map((row) => row.pattern)).toStrictEqual([KUBERNETES]);
  });

  it('answers an empty window past the end of the collection', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    expect(await store.listTerms(platforms.id, { limit: 50, offset: 9 }))
      .toStrictEqual([]);
  });

  it('lists only the terms of the category asked about', async () => {
    const store = createMemoryResearchStore();
    const { runtimes } = await seedLexicon(store, RADAR);

    expect((await store.listTerms(runtimes.id)).map((row) => row.pattern))
      .toStrictEqual([WEBASSEMBLY]);
  });

  it('answers an empty list for a category holding no terms', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedLexicon(store, RADAR);
    const empty = await addCategory(store, domain.id, TOOLING);

    expect(await store.listTerms(empty.id)).toStrictEqual([]);
    expect(await store.countTerms(empty.id)).toBe(0);
  });

  it('answers zero for an id no category carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.countTerms(404)).toBe(0);
    expect(await store.listTerms(404)).toStrictEqual([]);
  });

  it('answers rows a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { platforms } = await seedLexicon(store, RADAR);

    const [listed] = await store.listTerms(platforms.id);

    if (listed === undefined) {
      throw new Error('expected the list to answer a row');
    }

    (listed as { pattern: string }).pattern = 'written through the list';

    // Against the constants rather than against the records the
    // writes answered: a store handing its own objects out has
    // ALIASED the two, and the comparison then holds one lie against
    // itself and passes.
    expect((await store.listTerms(platforms.id)).map((row) => row.pattern))
      .toStrictEqual([KUBERNETES, SERVICE_MESH]);
  });
});

describe('the single term read', () => {
  it('answers null for an id no term carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.findTermById(404)).toBeNull();
  });

  it('answers a row a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { kube } = await seedLexicon(store, RADAR);
    const weight = kube.weight;

    const read = await readTerm(store, kube.id);

    (read as { weight: number }).weight = 1234;

    // Against a primitive read BEFORE the mutation: comparing
    // against `kube.weight` would compare one lie against itself,
    // since a store handing its own objects out aliased the two.
    expect((await readTerm(store, kube.id)).weight).toBe(weight);
  });
});

describe('the term counts on the category list', () => {
  it('counts the terms of each category rather than guessing', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedLexicon(store, RADAR);

    await addCategory(store, domain.id, TOOLING);

    const listed = await store.listCategoriesWithTermCounts(domain.id);

    // A zero beside two non-equal counts, so a store answering one
    // number for every bucket cannot pass: `platforms` holds two,
    // `runtimes` one and `tooling` none.
    expect(listed.map((row) => [row.key, row.termCount])).toStrictEqual([
      [PLATFORMS, 2],
      [RUNTIMES, 1],
      [TOOLING, 0],
    ]);
  });

  it('counts only the terms of the domain asked about', async () => {
    const store = createMemoryResearchStore();
    const radar = await seedLexicon(store, RADAR);

    await seedLexicon(store, TRANSIT);

    const listed = await store.listCategoriesWithTermCounts(radar.domain.id);

    expect(listed.map((row) => row.termCount)).toStrictEqual([2, 1]);
  });

  it('moves the count when a term changes bucket', async () => {
    const store = createMemoryResearchStore();
    const { domain, runtimes, kube } = await seedLexicon(store, RADAR);

    await store.updateTerm(kube.id, { categoryId: runtimes.id });

    const listed = await store.listCategoriesWithTermCounts(domain.id);

    expect(listed.map((row) => row.termCount)).toStrictEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------
// The term patch and the term delete
// ---------------------------------------------------------------------------

describe('the term patch', () => {
  it('rewrites the members it names and leaves the rest', async () => {
    const store = createMemoryResearchStore();
    const { kube } = await seedLexicon(store, RADAR);

    const patched = await store.updateTerm(kube.id, {
      weight: 11,
      polarity: 'negative',
    });

    expect(patched).toStrictEqual({
      ...kube,
      weight: 11,
      polarity: 'negative',
    });
    expect(await readTerm(store, kube.id)).toStrictEqual(patched);
  });

  it('clears a note with a null and leaves it alone when absent', async () => {
    const store = createMemoryResearchStore();
    const { wasm } = await seedLexicon(store, RADAR);

    const kept = await store.updateTerm(wasm.id, { weight: 2 });

    expect(kept?.notes).toBe(wasm.notes);

    // Absent and null are two requests rather than one: only the
    // second clears the note, and a store defaulting one to the
    // other cannot express whichever it collapses.
    const cleared = await store.updateTerm(wasm.id, { notes: null });

    expect(cleared?.notes).toBeNull();
  });

  it('moves a term between buckets, keeping its id', async () => {
    const store = createMemoryResearchStore();
    const { runtimes, kube } = await seedLexicon(store, RADAR);

    const moved = await store.updateTerm(kube.id, { categoryId: runtimes.id });

    // An UPDATE rather than a delete and an insert, which is what
    // keeps the row's id and its weight together.
    expect(moved?.id).toBe(kube.id);
    expect(moved?.weight).toBe(kube.weight);
    expect((await readTerm(store, kube.id)).categoryId).toBe(runtimes.id);
  });

  it('answers the stored row for a patch naming no member', async () => {
    const store = createMemoryResearchStore();
    const { kube } = await seedLexicon(store, RADAR);

    // A legal call rather than a no-op to be avoided: `terms`
    // carries no `updated_at`, so an empty patch has nothing to set
    // and answers the row without writing.
    expect(await store.updateTerm(kube.id, {})).toStrictEqual(kube);
  });

  it('answers null from a patch naming no stored term', async () => {
    const store = createMemoryResearchStore();

    expect(await store.updateTerm(404, { weight: 2 })).toBeNull();
  });

  it('answers a row a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { kube } = await seedLexicon(store, RADAR);

    const patched = await store.updateTerm(kube.id, { weight: 11 });

    if (patched === null) {
      throw new Error('expected the patch to answer the stored row');
    }

    (patched as { weight: number }).weight = 1234;

    expect((await readTerm(store, kube.id)).weight).toBe(11);
  });
});

describe('the term delete', () => {
  it('removes one term and leaves its category standing', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube } = await seedLexicon(store, RADAR);

    expect(await store.deleteTerm(kube.id)).toBe(true);
    expect(await store.findTermById(kube.id)).toBeNull();
    expect(await store.countTerms(platforms.id)).toBe(1);
    expect(await store.findCategoryById(platforms.id)).not.toBeNull();
  });

  it('answers false for an id no term carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.deleteTerm(404)).toBe(false);
  });

  it('frees the pattern the deleted term held', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube } = await seedLexicon(store, RADAR);

    await store.deleteTerm(kube.id);

    const written = await addTerm(store, platforms.id, KUBERNETES);

    expect(written.pattern).toBe(KUBERNETES);
    expect(await store.countTerms(platforms.id)).toBe(2);
  });

  it('cannot be refused by anything, unlike the other two', async () => {
    const store = createMemoryResearchStore();
    const { platforms, kube } = await seedLexicon(store, RADAR);

    // Nothing hangs off a term, so this is the one delete on the
    // taxonomy surface with neither a guard nor a cascade — and the
    // control that says so is a category holding a term refusing
    // nothing either.
    expect(await store.deleteTerm(kube.id)).toBe(true);
    expect(await store.deleteCategory(platforms.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The one key the personas half can refuse on
// ---------------------------------------------------------------------------

describe('the personas_domain_id_role_unique key', () => {
  it('refuses a second persona on a role the domain holds', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedPersonas(store, RADAR);

    const refusal = await refusalFrom(
      () => addPersona(store, domain.id, RESEARCHER),
    );

    expect(refusal).toBeInstanceOf(StoreRefusal);

    // The positive control, in this body rather than in a sibling
    // case: a store refusing every write passes the assertion above.
    const accepted = await addPersona(store, domain.id, DRAFTER);

    expect(accepted.role).toBe(DRAFTER);
    expect(await store.countPersonas(domain.id)).toBe(3);
  });

  it('names the mechanism and the constraint that refused', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedPersonas(store, RADAR);

    const refusal = await refusalFrom(
      () => addPersona(store, domain.id, RESEARCHER),
    );

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe('personas_domain_id_role_unique');
  });

  it('takes the same role in a second domain', async () => {
    const store = createMemoryResearchStore();
    const radar = await seedPersonas(store, RADAR);
    const transit = await store.insertDomain(domainInput(TRANSIT));

    // The key is `(domain_id, role)` and not `role`, so this is the
    // widening control: a store holding roles globally unique
    // refuses a write the database takes. Measured against the live
    // Postgres, where the same role under another domain was
    // accepted beside the duplicate that was refused.
    const accepted = await addPersona(store, transit.id, RESEARCHER);

    expect(accepted.domainId).toBe(transit.id);
    expect(await store.countPersonas(radar.domain.id)).toBe(2);
    expect(await store.countPersonas(transit.id)).toBe(1);
  });

  it('leaves the standing persona exactly as it was', async () => {
    const store = createMemoryResearchStore();
    const { domain, researcher } = await seedPersonas(store, RADAR);

    await refusalFrom(() => store.insertPersona({
      domainId: domain.id,
      role: RESEARCHER,
      systemText: 'Rewritten by a refused insert',
    }));

    expect(await readPersona(store, researcher.id))
      .toStrictEqual(researcher);
    expect(await store.countPersonas(domain.id)).toBe(2);
  });

  it('puts the refused role in nothing a logger can reach', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedPersonas(store, RADAR);

    const refusal = await refusalFrom(
      () => addPersona(store, domain.id, RESEARCHER),
    );
    const serialised = JSON.stringify({
      ...refusal,
      message: refusal.message,
      stack: refusal.stack,
    });

    expect(countOccurrences(serialised, RESEARCHER)).toBe(0);

    // The same search over a message that DOES carry the role, so
    // the zero above is a reading rather than a search finding
    // nothing anywhere.
    const planted = JSON.stringify({
      ...refusal,
      message: `duplicate key ${RESEARCHER}`,
    });

    expect(countOccurrences(planted, RESEARCHER)).toBe(1);
  });

  it('refuses a rename onto a role the domain holds', async () => {
    const store = createMemoryResearchStore();
    const { researcher, scorer } = await seedPersonas(store, RADAR);

    // The same mechanism on an UPDATE, measured against the live
    // Postgres as 23505 naming the same constraint an insert raises.
    const refusal = await refusalFrom(
      () => store.updatePersona(scorer.id, { role: RESEARCHER }),
    );

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe('personas_domain_id_role_unique');
    expect(await readPersona(store, scorer.id)).toStrictEqual(scorer);
    expect(await readPersona(store, researcher.id))
      .toStrictEqual(researcher);
  });

  it('takes a rename onto a role a SECOND domain holds', async () => {
    const store = createMemoryResearchStore();
    const { scorer } = await seedPersonas(store, RADAR);
    const transit = await store.insertDomain(domainInput(TRANSIT));

    await addPersona(store, transit.id, DRAFTER);

    // The resulting pair is checked within the STORED domain, since
    // `domainId` is not patchable: a role another domain carries is
    // not a conflict, which is the same widening control the insert
    // case makes and the patch has to make for itself.
    const patched = await store.updatePersona(scorer.id, { role: DRAFTER });

    expect(patched?.role).toBe(DRAFTER);
  });

  it('takes a patch writing a role back over itself', async () => {
    const store = createMemoryResearchStore();
    const { scorer } = await seedPersonas(store, RADAR);

    // A row is not in conflict with itself. A store looking the pair
    // up without excluding the row being written refuses this.
    const patched = await store.updatePersona(scorer.id, {
      role: SCORER,
      systemText: 'Rewritten in place',
    });

    expect(patched?.role).toBe(SCORER);
    expect(patched?.systemText).toBe('Rewritten in place');
  });
});

// ---------------------------------------------------------------------------
// The sequence behind personas.id
// ---------------------------------------------------------------------------

describe('the persona id sequence', () => {
  it('hands the first persona id 1', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const inserted = await addPersona(store, domain.id, RESEARCHER);

    // Its own counter, and none of the other three: the domain above
    // holds id 1 as well.
    expect(inserted.id).toBe(1);
    expect(domain.id).toBe(1);
  });

  it('burns an id on a refused insert, as the sequence does', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedPersonas(store, RADAR);

    await refusalFrom(() => addPersona(store, domain.id, RESEARCHER));

    const next = await addPersona(store, domain.id, DRAFTER);

    // 4 rather than 3: the two seeded personas took 1 and 2, and the
    // refusal took the third. Measured on `personas` against the
    // live Postgres, where two refused inserts between two accepted
    // ones left a gap of two.
    expect(next.id).toBe(4);
  });

  it('burns one on a foreign-key refusal as well', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedPersonas(store, RADAR);

    await refusalFrom(() => addPersona(store, domain.id + 400, DRAFTER));

    const next = await addPersona(store, domain.id, DRAFTER);

    // The widest half of that measurement: the gap of two covered a
    // key refusal AND a foreign-key one, so the counter advances
    // ahead of every check rather than ahead of the key check alone.
    expect(next.id).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// The foreign key onto domains.id
// ---------------------------------------------------------------------------

describe('the persona domain foreign key', () => {
  it('refuses an insert naming no stored domain', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedPersonas(store, RADAR);

    const refusal = await refusalFrom(
      () => addPersona(store, domain.id + 400, DRAFTER),
    );

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe('personas_domain_id_domains_id_fk');

    // The positive control: the same write into a domain that exists
    // is taken, so the refusal above is about the id rather than
    // about the row.
    const accepted = await addPersona(store, domain.id, DRAFTER);

    expect(accepted.domainId).toBe(domain.id);
  });

  it('refuses an insert into a domain just deleted', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedPersonas(store, RADAR);

    await store.deleteDomain(domain.id);

    const refusal = await refusalFrom(
      () => addPersona(store, domain.id, DRAFTER),
    );

    // Not a duplicate, though the domain carried that role a moment
    // ago: the cascade took its personas, so there is nothing left
    // to conflict with and the foreign key is what answers.
    expect(refusal.reason).toBe('foreign-key-violation');
  });

  it('puts the refused id in nothing a logger can reach', async () => {
    const store = createMemoryResearchStore();
    const refusal = await refusalFrom(
      () => addPersona(store, ABSENT_DOMAIN_ID, DRAFTER),
    );
    const serialised = JSON.stringify({
      ...refusal,
      message: refusal.message,
      stack: refusal.stack,
    });

    expect(countOccurrences(serialised, NEEDLE)).toBe(0);

    // The same search over a message that DOES carry the id.
    const planted = JSON.stringify({
      ...refusal,
      message: `domain ${NEEDLE} does not exist`,
    });

    expect(countOccurrences(planted, NEEDLE)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The domain cascade over its personas
// ---------------------------------------------------------------------------

describe('the domain cascade over its personas', () => {
  it('takes the personas of the domain it removes', async () => {
    const store = createMemoryResearchStore();
    const { domain, researcher, scorer } = await seedPersonas(store, RADAR);

    // `personas.domain_id` is `ON DELETE CASCADE`, and nothing
    // points at `personas`, so there is no guard below this one to
    // refuse it the way `categories.parent_id` refuses a category
    // delete.
    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await store.findPersonaById(researcher.id)).toBeNull();
    expect(await store.findPersonaById(scorer.id)).toBeNull();
    expect(await store.countPersonas(domain.id)).toBe(0);
    expect(await store.listPersonas(domain.id, WHOLE_COLLECTION))
      .toStrictEqual([]);
  });

  it('leaves a second domain personas standing', async () => {
    const store = createMemoryResearchStore();
    const radar = await seedPersonas(store, RADAR);
    const transit = await seedPersonas(store, TRANSIT);

    await store.deleteDomain(radar.domain.id);

    expect(await store.countPersonas(transit.domain.id)).toBe(2);
    expect(await readPersona(store, transit.scorer.id))
      .toStrictEqual(transit.scorer);
  });

  it('takes the personas and the taxonomy together', async () => {
    const store = createMemoryResearchStore();
    const { domain, platforms, kube } = await seedLexicon(store, RADAR);
    const drafter = await addPersona(store, domain.id, DRAFTER);

    // Every foreign key onto `domains.id` cascades, so one delete
    // reaches the personas and two levels of taxonomy in the same
    // statement.
    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await store.findPersonaById(drafter.id)).toBeNull();
    expect(await store.findTermById(kube.id)).toBeNull();
    expect(await store.findCategoryById(platforms.id)).toBeNull();
  });

  it('is the only thing that removes a persona in bulk', async () => {
    const store = createMemoryResearchStore();
    const { domain, researcher } = await seedPersonas(store, RADAR);

    // The other half of the cascade claim: a persona goes when its
    // domain goes and at no other time, so deleting the taxonomy
    // under a domain leaves every persona of it standing.
    const category = await addCategory(store, domain.id, PLATFORMS);

    expect(await store.deleteCategory(category.id)).toBe(true);
    expect(await readPersona(store, researcher.id))
      .toStrictEqual(researcher);
    expect(await store.countPersonas(domain.id)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// The persona reads
// ---------------------------------------------------------------------------

describe('the persona list', () => {
  it('orders by role ascending rather than by insertion', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedPersonas(store, RADAR);

    await addPersona(store, domain.id, DRAFTER);

    const listed = await store.listPersonas(domain.id, WHOLE_COLLECTION);

    expect(listed.map((row) => row.role))
      .toStrictEqual([DRAFTER, RESEARCHER, SCORER]);
  });

  it('reads only the window it was given', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedPersonas(store, RADAR);

    await addPersona(store, domain.id, DRAFTER);

    const page = await store.listPersonas(domain.id, { limit: 1, offset: 1 });

    expect(page.map((row) => row.role)).toStrictEqual([RESEARCHER]);
    expect(await store.countPersonas(domain.id)).toBe(3);
  });

  it('answers an empty window past the end', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedPersonas(store, RADAR);

    expect(await store.listPersonas(domain.id, { limit: 50, offset: 9 }))
      .toStrictEqual([]);
  });

  it('lists only the personas of the domain asked about', async () => {
    const store = createMemoryResearchStore();
    const radar = await seedPersonas(store, RADAR);
    const transit = await store.insertDomain(domainInput(TRANSIT));

    await addPersona(store, transit.id, DRAFTER);

    const listed = await store.listPersonas(radar.domain.id, WHOLE_COLLECTION);

    expect(listed.map((row) => row.role))
      .toStrictEqual([RESEARCHER, SCORER]);
  });

  it('answers an empty list for a domain holding none', async () => {
    const store = createMemoryResearchStore();
    const empty = await store.insertDomain(domainInput(TRANSIT));

    expect(await store.listPersonas(empty.id, WHOLE_COLLECTION))
      .toStrictEqual([]);
    expect(await store.countPersonas(empty.id)).toBe(0);
  });

  it('answers zero for an id no domain carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.countPersonas(404)).toBe(0);
    expect(await store.listPersonas(404, WHOLE_COLLECTION))
      .toStrictEqual([]);
  });

  it('answers rows a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedPersonas(store, RADAR);

    const [listed] = await store.listPersonas(domain.id, WHOLE_COLLECTION);

    if (listed === undefined) {
      throw new Error('expected the list to answer a row');
    }

    (listed as { role: string }).role = 'written through the list';

    // Against the constants rather than against the records the
    // writes answered: a store handing its own objects out has
    // ALIASED the two, and the comparison then holds one lie against
    // itself and passes.
    const reread = await store.listPersonas(domain.id, WHOLE_COLLECTION);

    expect(reread.map((row) => row.role))
      .toStrictEqual([RESEARCHER, SCORER]);
  });
});

describe('the single persona read', () => {
  it('answers null for an id no persona carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.findPersonaById(404)).toBeNull();
  });

  it('answers a row a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { scorer } = await seedPersonas(store, RADAR);
    const systemText = scorer.systemText;

    const read = await readPersona(store, scorer.id);

    (read as { systemText: string }).systemText = 'written through the read';

    // Against a primitive read BEFORE the mutation: comparing
    // against `scorer.systemText` would compare one lie against
    // itself, since a store handing its own objects out aliased the
    // two.
    expect((await readPersona(store, scorer.id)).systemText)
      .toBe(systemText);
  });
});

// ---------------------------------------------------------------------------
// The persona patch and the persona delete
// ---------------------------------------------------------------------------

describe('the persona patch', () => {
  it('rewrites the members it names and leaves the rest', async () => {
    const store = createMemoryResearchStore();
    const { scorer } = await seedPersonas(store, RADAR);

    const patched = await store.updatePersona(scorer.id, {
      systemText: 'Score against the domain weights',
    });

    expect(patched).toStrictEqual({
      ...scorer,
      systemText: 'Score against the domain weights',
    });
    expect(await readPersona(store, scorer.id)).toStrictEqual(patched);
  });

  it('renames within the domain, keeping the id', async () => {
    const store = createMemoryResearchStore();
    const { scorer } = await seedPersonas(store, RADAR);

    const renamed = await store.updatePersona(scorer.id, { role: DRAFTER });

    // An UPDATE rather than a delete and an insert, which is what
    // keeps the id and the system text together across a rename.
    expect(renamed?.id).toBe(scorer.id);
    expect(renamed?.systemText).toBe(scorer.systemText);
    expect((await readPersona(store, scorer.id)).role).toBe(DRAFTER);
  });

  it('writes an empty system text rather than ignoring it', async () => {
    const store = createMemoryResearchStore();
    const { scorer } = await seedPersonas(store, RADAR);

    // An empty string is a value being written and not a member
    // being left alone: the role exists and has nothing to say yet,
    // which is a state a reader can act on. A store defaulting it to
    // the stored text cannot express it at all.
    const cleared = await store.updatePersona(scorer.id, { systemText: '' });

    expect(cleared?.systemText).toBe('');
    expect((await readPersona(store, scorer.id)).systemText).toBe('');
  });

  it('answers the stored row for a patch naming no member', async () => {
    const store = createMemoryResearchStore();
    const { scorer } = await seedPersonas(store, RADAR);

    // A legal call rather than a no-op to be avoided: `personas`
    // carries no `updated_at`, so an empty patch has nothing to set
    // and answers the row without writing.
    expect(await store.updatePersona(scorer.id, {})).toStrictEqual(scorer);
  });

  it('answers null from a patch naming no stored persona', async () => {
    const store = createMemoryResearchStore();

    expect(await store.updatePersona(404, { role: DRAFTER })).toBeNull();
  });

  it('answers a row a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { scorer } = await seedPersonas(store, RADAR);

    const patched = await store.updatePersona(scorer.id, { role: DRAFTER });

    if (patched === null) {
      throw new Error('expected the patch to answer the stored row');
    }

    (patched as { role: string }).role = 'written through the patch';

    expect((await readPersona(store, scorer.id)).role).toBe(DRAFTER);
  });
});

describe('the persona delete', () => {
  it('removes one persona and leaves its domain standing', async () => {
    const store = createMemoryResearchStore();
    const { domain, scorer } = await seedPersonas(store, RADAR);

    expect(await store.deletePersona(scorer.id)).toBe(true);
    expect(await store.findPersonaById(scorer.id)).toBeNull();
    expect(await store.countPersonas(domain.id)).toBe(1);
    expect(await store.findDomainBySlug(RADAR)).not.toBeNull();
  });

  it('answers false for an id no persona carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.deletePersona(404)).toBe(false);
  });

  it('frees the role the deleted persona held', async () => {
    const store = createMemoryResearchStore();
    const { domain, scorer } = await seedPersonas(store, RADAR);

    await store.deletePersona(scorer.id);

    const written = await addPersona(store, domain.id, SCORER);

    expect(written.role).toBe(SCORER);
    expect(await store.countPersonas(domain.id)).toBe(2);
  });

  it('cannot be refused, unlike the category delete', async () => {
    const store = createMemoryResearchStore();
    const { domain, scorer } = await seedPersonas(store, RADAR);
    const root = await addCategory(store, domain.id, PLATFORMS);

    await addCategory(store, domain.id, TOOLING, root.id);

    // Nothing in schema v2 points at `personas`, so there is no
    // state a persona can be in that refuses this — and the control
    // that says so is the category delete beside it, refused for
    // holding children under the very same domain.
    expect(await store.deletePersona(scorer.id)).toBe(true);
    expect((await refusalFrom(() => store.deleteCategory(root.id))).reason)
      .toBe('foreign-key-violation');
  });
});

// ---------------------------------------------------------------------------
// The one key the topics half can refuse on
// ---------------------------------------------------------------------------

describe('the topics_domain_id_name_unique key', () => {
  it('refuses a second topic on a name the domain holds', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedTopics(store, RADAR);

    const refusal = await refusalFrom(
      () => addTopic(store, domain.id, EDGE_INFERENCE),
    );

    expect(refusal).toBeInstanceOf(StoreRefusal);

    // The positive control, in this body rather than in a sibling
    // case: a store refusing every write passes the assertion above.
    const accepted = await addTopic(store, domain.id, WASM_TOOLCHAINS);

    expect(accepted.name).toBe(WASM_TOOLCHAINS);
    expect(await store.countTopics(domain.id)).toBe(3);
  });

  it('names the mechanism and the constraint that refused', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedTopics(store, RADAR);

    const refusal = await refusalFrom(
      () => addTopic(store, domain.id, EDGE_INFERENCE),
    );

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe('topics_domain_id_name_unique');
  });

  it('takes the same name in a second domain', async () => {
    const store = createMemoryResearchStore();
    const radar = await seedTopics(store, RADAR);
    const transit = await store.insertDomain(domainInput(TRANSIT));

    // The key is `(domain_id, name)` and not `name`, so this is the
    // widening control: a store holding names globally unique
    // refuses a write the database takes. Two domains are free to
    // research subjects of the same name, which is what
    // `src/db/schema/scheduling.ts` says the pair is for.
    const accepted = await addTopic(store, transit.id, EDGE_INFERENCE);

    expect(accepted.domainId).toBe(transit.id);
    expect(await store.countTopics(radar.domain.id)).toBe(2);
    expect(await store.countTopics(transit.id)).toBe(1);
  });

  it('leaves the standing topic exactly as it was', async () => {
    const store = createMemoryResearchStore();
    const { domain, edge } = await seedTopics(store, RADAR);

    await refusalFrom(() => addTopic(store, domain.id, EDGE_INFERENCE, {
      searchTerms: ['rewritten by a refused insert'],
      intervalSeconds: 60,
      enabled: false,
    }));

    expect(await readTopic(store, edge.id)).toStrictEqual(edge);
    expect(await store.countTopics(domain.id)).toBe(2);
  });

  it('puts the refused name in nothing a logger can reach', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedTopics(store, RADAR);

    const refusal = await refusalFrom(
      () => addTopic(store, domain.id, EDGE_INFERENCE),
    );
    const serialised = JSON.stringify({
      ...refusal,
      message: refusal.message,
      stack: refusal.stack,
    });

    expect(countOccurrences(serialised, EDGE_INFERENCE)).toBe(0);

    // The same search over a message that DOES carry the name, so
    // the zero above is a reading rather than a search finding
    // nothing anywhere.
    const planted = JSON.stringify({
      ...refusal,
      message: `duplicate key ${EDGE_INFERENCE}`,
    });

    expect(countOccurrences(planted, EDGE_INFERENCE)).toBe(1);
  });

  it('refuses a rename onto a name the domain holds', async () => {
    const store = createMemoryResearchStore();
    const { edge, security } = await seedTopics(store, RADAR);

    // The same mechanism on an UPDATE, which `topics` reaches and
    // `terms` does not: `name` is patchable, so both writes open on
    // the key.
    const refusal = await refusalFrom(
      () => store.updateTopic(security.id, { name: EDGE_INFERENCE }),
    );

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe('topics_domain_id_name_unique');
    expect(await readTopic(store, security.id)).toStrictEqual(security);
    expect(await readTopic(store, edge.id)).toStrictEqual(edge);
  });

  it('takes a rename onto a name a SECOND domain holds', async () => {
    const store = createMemoryResearchStore();
    const { security } = await seedTopics(store, RADAR);
    const transit = await store.insertDomain(domainInput(TRANSIT));

    await addTopic(store, transit.id, WASM_TOOLCHAINS);

    // The resulting pair is checked within the STORED domain, since
    // `domainId` is not patchable: a name another domain carries is
    // not a conflict, which is the same widening control the insert
    // case makes and the patch has to make for itself.
    const patched = await store.updateTopic(security.id, {
      name: WASM_TOOLCHAINS,
    });

    expect(patched?.name).toBe(WASM_TOOLCHAINS);
  });

  it('takes a patch writing a name back over itself', async () => {
    const store = createMemoryResearchStore();
    const { security } = await seedTopics(store, RADAR);

    // A row is not in conflict with itself. A store looking the pair
    // up without excluding the row being written refuses this.
    const patched = await store.updateTopic(security.id, {
      name: RUNTIME_SECURITY,
      intervalSeconds: 900,
    });

    expect(patched?.name).toBe(RUNTIME_SECURITY);
    expect(patched?.intervalSeconds).toBe(900);
  });
});

// ---------------------------------------------------------------------------
// The sequence behind topics.id, and the key it burns
// ---------------------------------------------------------------------------

describe('the topic id sequence', () => {
  it('hands the first topic id 1', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const inserted = await addTopic(store, domain.id, EDGE_INFERENCE);

    // Its own counter, and none of the other four: the domain above
    // holds id 1 as well.
    expect(inserted.id).toBe(1);
    expect(domain.id).toBe(1);
  });

  it('burns an id on a refused insert, as the sequence does', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedTopics(store, RADAR);

    await refusalFrom(() => addTopic(store, domain.id, EDGE_INFERENCE));

    const next = await addTopic(store, domain.id, WASM_TOOLCHAINS);

    // 4 rather than 3: the two seeded topics took 1 and 2, and the
    // refusal took the third. No measurement on `topics` of its own
    // — the reasoning is `personas`', where two refused inserts
    // between two accepted ones left a gap of two against the live
    // server, over the same pair of mechanisms on the same column.
    expect(next.id).toBe(4);
  });

  it('burns one on a foreign-key refusal as well', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedTopics(store, RADAR);

    await refusalFrom(() => addTopic(store, 404, EDGE_INFERENCE));

    const next = await addTopic(store, domain.id, WASM_TOOLCHAINS);

    // The counter advances ahead of EVERY check rather than ahead of
    // the key check alone, which is the half of the personas
    // measurement a key-only burn would satisfy anyway.
    expect(next.id).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// The other mechanism, and the cascade that is not one
// ---------------------------------------------------------------------------

describe('the topic domain foreign key', () => {
  it('refuses an insert naming no stored domain', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    const refusal = await refusalFrom(
      () => addTopic(store, domain.id + 1, EDGE_INFERENCE),
    );

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe('topics_domain_id_domains_id_fk');

    // The positive control: the same row into the domain that IS
    // there, so the refusal above is about the id rather than about
    // the write.
    const accepted = await addTopic(store, domain.id, EDGE_INFERENCE);

    expect(accepted.domainId).toBe(domain.id);
  });

  it('refuses an insert into a domain just deleted', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedTopics(store, RADAR);

    await store.deleteDomain(domain.id);

    // The id was good a moment ago, which is the shape a service
    // meets: `findDomainBySlug` resolved the domain and the row went
    // in between. `src/topics/store.ts` names that as the one way
    // this refusal is reachable at all.
    const refusal = await refusalFrom(
      () => addTopic(store, domain.id, WASM_TOOLCHAINS),
    );

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe('topics_domain_id_domains_id_fk');
  });

  it('puts the refused id in nothing a logger can reach', async () => {
    const store = createMemoryResearchStore();

    const refusal = await refusalFrom(
      () => addTopic(store, ABSENT_DOMAIN_ID, EDGE_INFERENCE),
    );
    const serialised = JSON.stringify({
      ...refusal,
      message: refusal.message,
      stack: refusal.stack,
    });

    expect(countOccurrences(serialised, NEEDLE)).toBe(0);

    // The same search over a message that DOES carry the id.
    const planted = JSON.stringify({
      ...refusal,
      message: `domain ${NEEDLE} is not there`,
    });

    expect(countOccurrences(planted, NEEDLE)).toBe(1);
  });
});

describe('the domain cascade over its topics', () => {
  it('takes the topics of the domain it removes', async () => {
    const store = createMemoryResearchStore();
    const { domain, edge, security } = await seedTopics(store, RADAR);

    // `topics.domain_id` is `ON DELETE CASCADE`, and nothing in
    // schema v2 points at `topics`, so there is no guard below this
    // one to refuse it the way `categories.parent_id` refuses a
    // category delete.
    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await store.findTopicById(edge.id)).toBeNull();
    expect(await store.findTopicById(security.id)).toBeNull();
    expect(await store.countTopics(domain.id)).toBe(0);
    expect(await store.listTopics(domain.id, WHOLE_COLLECTION))
      .toStrictEqual([]);
  });

  it('leaves a second domain topics standing', async () => {
    const store = createMemoryResearchStore();
    const radar = await seedTopics(store, RADAR);
    const transit = await seedTopics(store, TRANSIT);

    await store.deleteDomain(radar.domain.id);

    expect(await store.countTopics(transit.domain.id)).toBe(2);
    expect(await readTopic(store, transit.edge.id))
      .toStrictEqual(transit.edge);
  });

  it('takes the topics, the personas and the taxonomy together', async () => {
    const store = createMemoryResearchStore();
    const { domain, platforms, kube } = await seedLexicon(store, RADAR);
    const drafter = await addPersona(store, domain.id, DRAFTER);
    const topic = await addTopic(store, domain.id, EDGE_INFERENCE);

    // Every foreign key onto `domains.id` cascades, so one delete
    // reaches the topics, the personas and two levels of taxonomy in
    // the same statement.
    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await store.findTopicById(topic.id)).toBeNull();
    expect(await store.findPersonaById(drafter.id)).toBeNull();
    expect(await store.findTermById(kube.id)).toBeNull();
    expect(await store.findCategoryById(platforms.id)).toBeNull();
  });

  it('is the only thing that removes a topic in bulk', async () => {
    const store = createMemoryResearchStore();
    const { domain, edge } = await seedTopics(store, RADAR);

    // The other half of the cascade claim: a topic goes when its
    // domain goes and at no other time, so deleting the taxonomy
    // under a domain leaves every topic of it standing.
    const category = await addCategory(store, domain.id, PLATFORMS);

    expect(await store.deleteCategory(category.id)).toBe(true);
    expect(await readTopic(store, edge.id)).toStrictEqual(edge);
    expect(await store.countTopics(domain.id)).toBe(2);
  });

  it('frees the names the deleted domain held', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedTopics(store, RADAR);

    await store.deleteDomain(domain.id);

    const rebuilt = await store.insertDomain(domainInput(RADAR));
    const accepted = await addTopic(store, rebuilt.id, EDGE_INFERENCE);

    expect(accepted.name).toBe(EDGE_INFERENCE);
    expect(await store.countTopics(rebuilt.id)).toBe(1);
  });

  it('leaves the planted dependent counts to the seam', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedTopics(store, RADAR);

    // The one place this file knowingly answers something a
    // deployment would not, pinned rather than left to be
    // discovered: `countDomainDependents` reads what
    // `setDomainDependents` planted and never the rows this half
    // writes, so two stored topics answer a counted zero.
    // `src/domains/db-store.ts` counts the rows instead, and
    // `MemoryResearchStore.setDomainDependents` carries why the two
    // are not reconciled here.
    expect(await store.countTopics(domain.id)).toBe(2);
    expect((await store.countDomainDependents(domain.id)).topics).toBe(0);

    store.setDomainDependents(domain.id, { topics: 2 });

    expect((await store.countDomainDependents(domain.id)).topics).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// The two mutable members crossing the boundary
// ---------------------------------------------------------------------------

describe('the topic due time crossing the boundary', () => {
  it('lands an unscheduled topic, which is not an absent one', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    const inserted = await addTopic(store, domain.id, EDGE_INFERENCE);

    // `InsertTopicInput` declares no member that could set it, so
    // the null is the type's doing rather than a default. Read back
    // as well as answered, since a store echoing its argument would
    // answer null having stored anything at all.
    expect(inserted.nextRunAt).toBeNull();
    expect((await readTopic(store, inserted.id)).nextRunAt).toBeNull();
  });

  it('does not store the Date object it was handed', async () => {
    const store = createMemoryResearchStore();
    const { edge } = await seedTopics(store, RADAR);
    const due = new Date('2026-03-01T00:00:00.000Z');

    await store.updateTopicSchedule(edge.id, due);

    // The copy on the way IN. A store holding this instance lets the
    // caller that scheduled the topic go on moving its due time
    // afterwards, through a member the port declares `readonly`.
    due.setTime(Date.parse('2030-06-01T00:00:00.000Z'));

    expect(dueAt(await readTopic(store, edge.id)))
      .toBe(Date.parse('2026-03-01T00:00:00.000Z'));
  });

  it('answers a due time the write cannot be written through', async () => {
    const store = createMemoryResearchStore();
    const { edge } = await seedTopics(store, RADAR);

    const written = await store.updateTopicSchedule(
      edge.id,
      new Date('2026-03-01T00:00:00.000Z'),
    );

    if (written === null) {
      throw new Error('expected the schedule write to answer a row');
    }

    const scheduledAt = dueAt(written);

    written.nextRunAt?.setTime(0);

    // Against the primitive captured BEFORE the mutation: a store
    // handing its own `Date` out has aliased the two, and comparing
    // against `written.nextRunAt` would hold one lie against itself.
    expect(dueAt(await readTopic(store, edge.id))).toBe(scheduledAt);
  });

  it('answers a due time the read cannot be written through', async () => {
    const store = createMemoryResearchStore();
    const { edge } = await seedTopics(store, RADAR);

    await store.updateTopicSchedule(
      edge.id,
      new Date('2026-03-01T00:00:00.000Z'),
    );

    const read = await readTopic(store, edge.id);
    const scheduledAt = dueAt(read);

    read.nextRunAt?.setTime(0);

    expect(dueAt(await readTopic(store, edge.id))).toBe(scheduledAt);
  });

  it('answers a due time the list cannot be written through', async () => {
    const store = createMemoryResearchStore();
    const { domain, edge } = await seedTopics(store, RADAR);

    await store.updateTopicSchedule(
      edge.id,
      new Date('2026-03-01T00:00:00.000Z'),
    );

    const [listed] = await store.listTopics(domain.id, WHOLE_COLLECTION);

    if (listed === undefined) {
      throw new Error('expected the list to answer a row');
    }

    const scheduledAt = dueAt(listed);

    listed.nextRunAt?.setTime(0);

    expect(dueAt(await readTopic(store, edge.id))).toBe(scheduledAt);
  });

  it('answers a fresh Date on every read', async () => {
    const store = createMemoryResearchStore();
    const { edge } = await seedTopics(store, RADAR);

    await store.updateTopicSchedule(
      edge.id,
      new Date('2026-03-01T00:00:00.000Z'),
    );

    const first = await readTopic(store, edge.id);
    const second = await readTopic(store, edge.id);

    expect(first.nextRunAt).not.toBe(second.nextRunAt);
    expect(dueAt(first)).toBe(dueAt(second));
  });
});

describe('the topic search terms crossing the boundary', () => {
  it('does not store the array an insert was handed', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const submitted = ['npu', 'accelerator'];

    const inserted = await addTopic(store, domain.id, EDGE_INFERENCE, {
      searchTerms: submitted,
    });

    submitted.push('written through the insert');

    expect((await readTopic(store, inserted.id)).searchTerms)
      .toStrictEqual(['npu', 'accelerator']);
  });

  it('does not store the array a patch was handed', async () => {
    const store = createMemoryResearchStore();
    const { edge } = await seedTopics(store, RADAR);
    const submitted = ['npu'];

    await store.updateTopic(edge.id, { searchTerms: submitted });

    submitted.push('written through the patch');

    expect((await readTopic(store, edge.id)).searchTerms)
      .toStrictEqual(['npu']);
  });

  it('answers a list a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const inserted = await addTopic(store, domain.id, EDGE_INFERENCE, {
      searchTerms: ['npu'],
    });

    termsIn(inserted).push('written through the answer');
    termsIn(await readTopic(store, inserted.id)).push('and through a read');

    // Against a constant rather than against the record the insert
    // answered, for the reason the due-time cases give.
    expect((await readTopic(store, inserted.id)).searchTerms)
      .toStrictEqual(['npu']);
  });

  it('replaces the list whole rather than merging into it', async () => {
    const store = createMemoryResearchStore();
    const { edge } = await seedTopics(store, RADAR);

    await store.updateTopic(edge.id, { searchTerms: ['npu', 'accelerator'] });

    // A caller sends the list it wants to exist, which is the only
    // shape under which removing a term is expressible at all. Under
    // a merge the read answers two members here and three below.
    const patched = await store.updateTopic(edge.id, { searchTerms: ['npu'] });

    expect(patched?.searchTerms).toStrictEqual(['npu']);
    expect((await readTopic(store, edge.id)).searchTerms)
      .toStrictEqual(['npu']);
  });
});

// ---------------------------------------------------------------------------
// The topic reads
// ---------------------------------------------------------------------------

describe('the topic list', () => {
  it('orders by name ascending rather than by insertion', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedTopics(store, RADAR);

    await addTopic(store, domain.id, WASM_TOOLCHAINS);

    const listed = await store.listTopics(domain.id, WHOLE_COLLECTION);

    expect(listed.map((row) => row.name))
      .toStrictEqual([EDGE_INFERENCE, RUNTIME_SECURITY, WASM_TOOLCHAINS]);
  });

  it('reads only the window it was given', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedTopics(store, RADAR);

    await addTopic(store, domain.id, WASM_TOOLCHAINS);

    const page = await store.listTopics(domain.id, { limit: 1, offset: 1 });

    expect(page.map((row) => row.name)).toStrictEqual([RUNTIME_SECURITY]);
    expect(await store.countTopics(domain.id)).toBe(3);
  });

  it('answers an empty window past the end', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedTopics(store, RADAR);

    expect(await store.listTopics(domain.id, { limit: 50, offset: 50 }))
      .toStrictEqual([]);
  });

  it('lists only the topics of the domain asked about', async () => {
    const store = createMemoryResearchStore();
    const radar = await seedTopics(store, RADAR);
    const transit = await seedTopics(store, TRANSIT);

    const listed = await store.listTopics(radar.domain.id, WHOLE_COLLECTION);

    expect(listed.map((row) => row.id))
      .toStrictEqual([radar.edge.id, radar.security.id]);
    expect(await store.countTopics(transit.domain.id)).toBe(2);
  });

  it('answers an empty list for a domain holding none', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    expect(await store.listTopics(domain.id, WHOLE_COLLECTION))
      .toStrictEqual([]);
    expect(await store.countTopics(domain.id)).toBe(0);
  });

  it('answers zero for an id no domain carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.countTopics(404)).toBe(0);
    expect(await store.listTopics(404, WHOLE_COLLECTION)).toStrictEqual([]);
  });

  it('answers rows a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedTopics(store, RADAR);

    const [listed] = await store.listTopics(domain.id, WHOLE_COLLECTION);

    if (listed === undefined) {
      throw new Error('expected the list to answer a row');
    }

    (listed as { name: string }).name = 'written through the list';

    // Against the constants rather than against the records the
    // writes answered: a store handing its own objects out has
    // ALIASED the two, and the comparison then holds one lie against
    // itself and passes.
    const reread = await store.listTopics(domain.id, WHOLE_COLLECTION);

    expect(reread.map((row) => row.name))
      .toStrictEqual([EDGE_INFERENCE, RUNTIME_SECURITY]);
  });
});

describe('the single topic read', () => {
  it('answers null for an id no topic carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.findTopicById(404)).toBeNull();
  });

  it('answers a row a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { edge } = await seedTopics(store, RADAR);
    const interval = edge.intervalSeconds;

    const read = await readTopic(store, edge.id);

    (read as { intervalSeconds: number }).intervalSeconds = 1;

    // Against a primitive read BEFORE the mutation: comparing
    // against `edge.intervalSeconds` would compare one lie against
    // itself, since a store handing its own objects out aliased the
    // two.
    expect((await readTopic(store, edge.id)).intervalSeconds)
      .toBe(interval);
  });
});

// ---------------------------------------------------------------------------
// The three topic writes that are not the insert
// ---------------------------------------------------------------------------

describe('the topic patch', () => {
  it('rewrites the members it names and leaves the rest', async () => {
    const store = createMemoryResearchStore();
    const { edge } = await seedTopics(store, RADAR);

    const patched = await store.updateTopic(edge.id, {
      intervalSeconds: 900,
      enabled: false,
    });

    expect(patched?.intervalSeconds).toBe(900);
    expect(patched?.enabled).toBe(false);
    expect(patched?.name).toBe(EDGE_INFERENCE);
    expect(patched?.searchTerms).toStrictEqual([]);
  });

  it('clears a bound with a null and leaves it alone when absent', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const topic = await addTopic(store, domain.id, EDGE_INFERENCE, {
      minIntervalSeconds: 300,
      maxIntervalSeconds: 86400,
    });

    // The three requests a nullable member distinguishes: absent
    // leaves the ceiling alone, an explicit null clears the floor. A
    // store reaching for `??` collapses the two and makes removing a
    // floor unexpressible.
    const patched = await store.updateTopic(topic.id, {
      minIntervalSeconds: null,
    });

    expect(patched?.minIntervalSeconds).toBeNull();
    expect(patched?.maxIntervalSeconds).toBe(86400);

    const raised = await store.updateTopic(topic.id, {
      maxIntervalSeconds: 43200,
    });

    expect(raised?.maxIntervalSeconds).toBe(43200);
    expect(raised?.minIntervalSeconds).toBeNull();
  });

  it('writes a false enabled rather than ignoring it', async () => {
    const store = createMemoryResearchStore();
    const { edge } = await seedTopics(store, RADAR);

    // `enabled` is NOT NULL and defaults true, so `false` is a value
    // being written rather than a member being left alone. This is
    // the column for retiring a topic; deleting it is a different
    // operation and pausing it is neither.
    await store.updateTopic(edge.id, { enabled: false });

    expect((await readTopic(store, edge.id)).enabled).toBe(false);
  });

  it('answers the stored row for a patch naming no member', async () => {
    const store = createMemoryResearchStore();
    const { edge } = await seedTopics(store, RADAR);

    // `topics` carries no `updated_at`, so an empty patch has
    // literally nothing to set and drizzle throws `No values to set`
    // on an empty update list. The port decides the answer rather
    // than leaving its two implementations to disagree.
    expect(await store.updateTopic(edge.id, {})).toStrictEqual(edge);
  });

  it('cannot reach the due time whatever it is handed', async () => {
    const store = createMemoryResearchStore();
    const { edge } = await seedTopics(store, RADAR);

    // `TopicPatch` declares no `nextRunAt`, so the containment is
    // the type's; the cast is what lets a case ask what happens when
    // one arrives anyway, which is the reading a route's `.strict()`
    // schema cannot give from inside `src/`.
    const patched = await store.updateTopic(
      edge.id,
      { nextRunAt: new Date('2026-03-01T00:00:00.000Z') } as TopicPatch,
    );

    expect(patched?.nextRunAt).toBeNull();
    expect((await readTopic(store, edge.id)).nextRunAt).toBeNull();
  });

  it('answers null from a patch naming no stored topic', async () => {
    const store = createMemoryResearchStore();

    expect(await store.updateTopic(404, { enabled: false })).toBeNull();
  });

  it('answers a row a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { edge } = await seedTopics(store, RADAR);

    const patched = await store.updateTopic(edge.id, { intervalSeconds: 900 });

    if (patched === null) {
      throw new Error('expected the patch to answer a row');
    }

    (patched as { intervalSeconds: number }).intervalSeconds = 1;

    expect((await readTopic(store, edge.id)).intervalSeconds).toBe(900);
  });
});

describe('the topic schedule write', () => {
  it('writes the instant it is handed and nothing else', async () => {
    const store = createMemoryResearchStore();
    const { edge } = await seedTopics(store, RADAR);
    const due = new Date('2026-03-01T00:00:00.000Z');

    const written = await store.updateTopicSchedule(edge.id, due);

    // The whole record against the row before the call, with only
    // the due time permitted to differ: the port says this method
    // writes one column, and asserting the column alone would pass
    // against a store that also cleared the search terms.
    expect(written).toStrictEqual({ ...edge, nextRunAt: due });
  });

  it('takes no view of the instant it is handed', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const topic = await addTopic(store, domain.id, EDGE_INFERENCE, {
      enabled: false,
      minIntervalSeconds: 300,
      maxIntervalSeconds: 900,
    });
    const past = new Date('2020-01-01T00:00:00.000Z');

    // A time in the past on a DISABLED row: no clamp, no clock and
    // no reading of `enabled`. All three are decisions
    // `src/topics/service.ts` takes, and a store taking them would
    // move a rule into the half that needs a database.
    const written = await store.updateTopicSchedule(topic.id, past);

    expect(written?.nextRunAt?.toISOString())
      .toBe('2020-01-01T00:00:00.000Z');
    expect(written?.enabled).toBe(false);
  });

  it('moves a due time that is already set', async () => {
    const store = createMemoryResearchStore();
    const { edge } = await seedTopics(store, RADAR);

    await store.updateTopicSchedule(
      edge.id,
      new Date('2026-03-01T00:00:00.000Z'),
    );
    await store.updateTopicSchedule(
      edge.id,
      new Date('2026-03-08T00:00:00.000Z'),
    );

    expect((await readTopic(store, edge.id)).nextRunAt?.toISOString())
      .toBe('2026-03-08T00:00:00.000Z');
  });

  it('answers null for an id no topic carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.updateTopicSchedule(404, new Date())).toBeNull();
  });
});

describe('the topic delete', () => {
  it('removes one topic and leaves its domain standing', async () => {
    const store = createMemoryResearchStore();
    const { domain, edge, security } = await seedTopics(store, RADAR);

    expect(await store.deleteTopic(edge.id)).toBe(true);
    expect(await store.findTopicById(edge.id)).toBeNull();
    expect(await readTopic(store, security.id)).toStrictEqual(security);
    expect(await readDomain(store, RADAR)).toStrictEqual(domain);
  });

  it('answers false for an id no topic carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.deleteTopic(404)).toBe(false);
  });

  it('frees the name the deleted topic held', async () => {
    const store = createMemoryResearchStore();
    const { domain, edge } = await seedTopics(store, RADAR);

    await store.deleteTopic(edge.id);

    const accepted = await addTopic(store, domain.id, EDGE_INFERENCE);

    expect(accepted.id).not.toBe(edge.id);
    expect(await store.countTopics(domain.id)).toBe(2);
  });

  it('cannot be refused, unlike the category delete', async () => {
    const store = createMemoryResearchStore();
    const { domain, edge } = await seedTopics(store, RADAR);
    const { root } = await seedOneLevel(store, TRANSIT);

    // Nothing in schema v2 points at `topics`, so there is no guard
    // to run into and no state a topic can be in that holds its
    // delete. The category beside it IS refused, under the very
    // rule this one has no counterpart of — which is what says the
    // acceptance above is a fact about the table rather than a store
    // that refuses nothing.
    expect(await store.deleteTopic(edge.id)).toBe(true);
    expect(await store.countTopics(domain.id)).toBe(1);

    const refusal = await refusalFrom(() => store.deleteCategory(root.id));

    expect(refusal.constraint).toBe('categories_parent_id_categories_id_fk');
  });
});

// ---------------------------------------------------------------------------
// The first CHECK any half here imitates
// ---------------------------------------------------------------------------

describe('the sources_kind_check', () => {
  it('refuses an insert whose kind is outside the tuple', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    const refusal = await refusalFrom(
      () => addSource(store, domain.id, FEED_ENDPOINT, { kind: 'carrier' }),
    );

    expect(refusal.reason).toBe('check-violation');
    expect(refusal.constraint).toBe('sources_kind_check');

    // The positive control: the same row under a kind the tuple
    // holds, so the refusal above is about the value rather than
    // about the write.
    const accepted = await addSource(store, domain.id, FEED_ENDPOINT);

    expect(accepted.kind).toBe('rss');
  });

  it('refuses a patch whose kind is outside the tuple', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);

    // `kind` is patchable per `SourcePatch`, which is what puts this
    // CHECK on the update as well as on the insert. It is also the
    // whole of this method's refusal surface: `domainId` is not
    // patchable and the table has no key.
    const refusal = await refusalFrom(
      () => store.updateSource(feed.id, { kind: 'carrier' }),
    );

    expect(refusal.reason).toBe('check-violation');
    expect(refusal.constraint).toBe('sources_kind_check');
    expect((await readSource(store, feed.id)).kind).toBe('rss');

    // The positive control, in this body rather than a sibling case:
    // a store refusing every patch passes the assertions above.
    const patched = await store.updateSource(feed.id, { kind: 'push' });

    expect(patched?.kind).toBe('push');
  });

  it('accepts every member of SOURCE_KINDS', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const stored: string[] = [];

    for (const kind of SOURCE_KINDS) {
      const row = await addSource(store, domain.id, FEED_ENDPOINT, { kind });

      stored.push(row.kind);
    }

    // Derived from the tuple rather than listed, so a member added to
    // `SOURCE_KINDS` is covered here with no edit — and four rows on
    // ONE endpoint is the other half of the case, since `sources`
    // carries no unique key to refuse the repeat.
    expect(stored).toStrictEqual([...SOURCE_KINDS]);
    expect(await store.countSources(domain.id)).toBe(SOURCE_KINDS.length);
  });

  it('takes a second source on an endpoint one already holds', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedSources(store, RADAR);

    // The shape a reader coming from the topics or personas half
    // expects and does not find: `sources` carries no unique key at
    // all, so an insert always inserts and there is no `409` for a
    // duplicate endpoint to raise. Two rows fetching one feed are a
    // configuration somebody meant.
    const second = await addSource(store, domain.id, FEED_ENDPOINT);

    expect(second.id).not.toBe(feed.id);
    expect(second.endpoint).toBe(feed.endpoint);
    expect(await store.countSources(domain.id)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// The other write mechanism, which the patch cannot reach
// ---------------------------------------------------------------------------

describe('the source domain foreign key', () => {
  it('refuses an insert naming no stored domain', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    const refusal = await refusalFrom(
      () => addSource(store, domain.id + 1, FEED_ENDPOINT),
    );

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe('sources_domain_id_domains_id_fk');

    // The positive control: the same row into the domain that IS
    // there, so the refusal above is about the id rather than about
    // the write.
    const accepted = await addSource(store, domain.id, FEED_ENDPOINT);

    expect(accepted.domainId).toBe(domain.id);
  });

  it('refuses an insert into a domain just deleted', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedSources(store, RADAR);

    await store.deleteDomain(domain.id);

    // The id was good a moment ago, which is the shape a service
    // meets: `findDomainBySlug` resolved the domain and the row went
    // in between. `src/sources/store.ts` names that as the one way
    // this refusal is reachable at all.
    const refusal = await refusalFrom(
      () => addSource(store, domain.id, ITEMS_ENDPOINT),
    );

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe('sources_domain_id_domains_id_fk');
  });

  it('cannot be reached by a patch whatever it is handed', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedSources(store, RADAR);
    const transit = await store.insertDomain(domainInput(TRANSIT));

    // `SourcePatch` declares no `domainId`, so a source cannot be
    // moved between domains and no update reaches this key: the
    // corpus it produced carries the OLD domain on every row, and a
    // move would leave the feed in one domain and its documents in
    // another. The cast is what lets a case ask what happens when one
    // arrives anyway.
    const patched = await store.updateSource(
      feed.id,
      { domainId: transit.id } as SourcePatch,
    );

    expect(patched?.domainId).toBe(domain.id);
    expect(await store.countSources(transit.id)).toBe(0);
  });

  it('puts the refused id in nothing a logger can reach', async () => {
    const store = createMemoryResearchStore();

    const refusal = await refusalFrom(
      () => addSource(store, ABSENT_DOMAIN_ID, FEED_ENDPOINT),
    );
    const serialised = JSON.stringify({
      ...refusal,
      message: refusal.message,
      stack: refusal.stack,
    });

    expect(countOccurrences(serialised, NEEDLE)).toBe(0);

    // The same search over a message that DOES carry the id.
    const plantedMessage = JSON.stringify({
      ...refusal,
      message: `domain ${NEEDLE} is not there`,
    });

    expect(countOccurrences(plantedMessage, NEEDLE)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The sixth counter, which no duplicate can burn
// ---------------------------------------------------------------------------

describe('the source id sequence', () => {
  it('starts at 1 and rises', async () => {
    const store = createMemoryResearchStore();
    const { feed, items } = await seedSources(store, RADAR);

    expect(feed.id).toBe(1);
    expect(items.id).toBe(2);
  });

  it('burns an id on an insert the CHECK refused', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    await addSource(store, domain.id, FEED_ENDPOINT);
    await refusalFrom(
      () => addSource(store, domain.id, ITEMS_ENDPOINT, { kind: 'carrier' }),
    );

    // The sequence is read while the row is formed and does not roll
    // back, so the refused row leaves the id it took unused. The
    // measurement behind this is `personas`'; `sources` has no
    // duplicate to burn one, which is what leaves the two refusals
    // below as the whole of this table's evidence.
    const third = await addSource(store, domain.id, ITEMS_ENDPOINT);

    expect(third.id).toBe(3);
  });

  it('burns an id on an insert the foreign key refused', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    await addSource(store, domain.id, FEED_ENDPOINT);
    await refusalFrom(() => addSource(store, domain.id + 99, ITEMS_ENDPOINT));

    const third = await addSource(store, domain.id, ITEMS_ENDPOINT);

    expect(third.id).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// The delete refused from outside the row
// ---------------------------------------------------------------------------

describe('the documents that hold a source delete', () => {
  it('refuses while the corpus holds a capture of it', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed, items } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [planted(1)]);

    // `documents.source_id` is `ON DELETE no action`, and
    // `src/db/schema/documents.ts` argues it at the column: a source
    // does not own the corpus it produced, so removing the feed
    // cannot take it.
    const refusal = await refusalFrom(() => store.deleteSource(feed.id));

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe('documents_source_id_sources_id_fk');
    expect(await readSource(store, feed.id)).toStrictEqual(feed);

    // The positive control, in this body rather than a sibling case:
    // the SAME call over the sibling source, which has captured
    // nothing. A store refusing every delete passes the assertions
    // above.
    expect(await store.deleteSource(items.id)).toBe(true);
    expect(await store.countSources(domain.id)).toBe(1);
  });

  it('counts what the delete would have taken', async () => {
    const store = createMemoryResearchStore();
    const { feed, items } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [planted(1), planted(2), planted(3)]);

    // The guard reads a count and takes no view of it; the `409` is
    // `src/sources/service.ts`'s, and carries these numbers so a
    // caller learns what the delete would have taken rather than only
    // that it was refused.
    expect(await store.countSourceDependents(feed.id)).toStrictEqual({
      documents: 3,
      findingSightings: 0,
    });
    expect(await store.countSourceDependents(items.id)).toStrictEqual({
      documents: 0,
      findingSightings: 0,
    });
  });

  it('stops refusing once the corpus is taken back', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [planted(1)]);
    await refusalFrom(() => store.deleteSource(feed.id));

    // A whole-unit plant: the second call REPLACES the first rather
    // than appending to it, which is the only shape under which a
    // source going back to none is expressible at all.
    store.setSourceDocuments(feed.id, []);

    expect(await store.deleteSource(feed.id)).toBe(true);
  });

  it('leaves the retiring patch reachable while it refuses', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [planted(1)]);
    await refusalFrom(() => store.deleteSource(feed.id));

    // `SourcePatch.enabled` set to false is what the refusal names as
    // the operation that was wanted: it keeps the endpoint, the
    // arrangement and the corpus, and stops the pipeline reading.
    const retired = await store.updateSource(feed.id, { enabled: false });

    expect(retired?.enabled).toBe(false);
    expect((await store.countSourceDependents(feed.id)).documents).toBe(1);
  });

  it('answers false for an id no source carries', async () => {
    const store = createMemoryResearchStore();

    // Two zeros rather than a refusal for an id nothing points at,
    // which is correct rather than a special case — and the delete
    // that follows removes nothing without throwing.
    expect(await store.countSourceDependents(404)).toStrictEqual({
      documents: 0,
      findingSightings: 0,
    });
    expect(await store.deleteSource(404)).toBe(false);
  });
});

describe('the sightings that hold a source delete', () => {
  it('refuses while a sighting cites it', async () => {
    const store = createMemoryResearchStore();
    const { feed, items } = await seedSources(store, RADAR);

    store.setSourceSightings(feed.id, 2);

    // A SECOND key with a sharper reason than the first:
    // `src/db/schema/findings.ts` states the sightings table IS the
    // provenance record, so a cascade would drop syndication evidence
    // a feed at a time and every count taken afterwards would be
    // lower with nothing saying why.
    const refusal = await refusalFrom(() => store.deleteSource(feed.id));

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint)
      .toBe('finding_sightings_source_id_sources_id_fk');
    expect((await store.countSourceDependents(feed.id)).findingSightings)
      .toBe(2);

    // The positive control: the same call over the sibling nothing
    // cites.
    expect(await store.deleteSource(items.id)).toBe(true);
  });

  it('refuses a source carrying no document at all', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);

    store.setSourceSightings(feed.id, 1);

    // The two keys are separate claims rather than one rule read
    // twice: this source's corpus is empty, so a guard reading only
    // the documents would take a delete the database refuses.
    expect((await store.countSourceDependents(feed.id)).documents).toBe(0);
    expect((await refusalFrom(() => store.deleteSource(feed.id))).constraint)
      .toBe('finding_sightings_source_id_sources_id_fk');
  });

  it('stops refusing once the sightings are taken back', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);

    store.setSourceSightings(feed.id, 3);
    await refusalFrom(() => store.deleteSource(feed.id));

    store.setSourceSightings(feed.id, 0);

    expect(await store.deleteSource(feed.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The cascade that runs into neither of them
// ---------------------------------------------------------------------------

describe('the domain cascade over its sources', () => {
  it('takes the sources of the domain it removes', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed, items } = await seedSources(store, RADAR);

    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await store.findSourceById(feed.id)).toBeNull();
    expect(await store.findSourceById(items.id)).toBeNull();
    expect(await store.countSources(domain.id)).toBe(0);
    expect(
      await store.listSourcesWithParseStats(domain.id, WHOLE_COLLECTION),
    ).toStrictEqual([]);
  });

  it('takes a source whose own delete is refused', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [planted(1)]);
    store.setSourceSightings(feed.id, 1);

    // The trap `ON DELETE no action` sets for a fake, and the reason
    // the cascade does not reuse `deleteSource`: the domain columns
    // on `documents` and on `finding_sightings` cascade too, so one
    // statement removes the sources and the rows that were holding
    // them, and the end-of-statement check finds nothing left citing
    // a source that is gone.
    await refusalFrom(() => store.deleteSource(feed.id));

    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await store.findSourceById(feed.id)).toBeNull();
  });

  it('takes what was planted under them', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [planted(1, { parseStatus: 'failed' })]);
    store.setSourceSightings(feed.id, 4);

    await store.deleteDomain(domain.id);

    // A plant left standing would answer a dependent count and a
    // queue for a source that no longer exists, which is the state
    // `documents.domain_id` cascading rules out.
    expect(await store.countSourceDependents(feed.id)).toStrictEqual({
      documents: 0,
      findingSightings: 0,
    });
    expect(await store.countSourceFailures(feed.id)).toBe(0);
    expect(await store.listSourceFailures(feed.id, WHOLE_COLLECTION))
      .toStrictEqual([]);
  });

  it('leaves a second domain sources standing', async () => {
    const store = createMemoryResearchStore();
    const radar = await seedSources(store, RADAR);
    const transit = await seedSources(store, TRANSIT);

    store.setSourceDocuments(transit.feed.id, [planted(1)]);
    await store.deleteDomain(radar.domain.id);

    expect(await store.countSources(transit.domain.id)).toBe(2);
    expect(await readSource(store, transit.feed.id))
      .toStrictEqual(transit.feed);
    expect((await store.countSourceDependents(transit.feed.id)).documents)
      .toBe(1);
  });

  it('takes the sources, the topics and the taxonomy together', async () => {
    const store = createMemoryResearchStore();
    const { domain, platforms, kube } = await seedLexicon(store, RADAR);
    const topic = await addTopic(store, domain.id, EDGE_INFERENCE);
    const source = await addSource(store, domain.id, FEED_ENDPOINT);

    // Every foreign key onto `domains.id` cascades, so one delete
    // reaches the sources, the topics and two levels of taxonomy in
    // the same statement.
    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await store.findSourceById(source.id)).toBeNull();
    expect(await store.findTopicById(topic.id)).toBeNull();
    expect(await store.findTermById(kube.id)).toBeNull();
    expect(await store.findCategoryById(platforms.id)).toBeNull();
  });

  it('is the only thing that removes a source in bulk', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedSources(store, RADAR);

    // The other half of the cascade claim: a source goes when its
    // domain goes and at no other time, so deleting the taxonomy
    // under a domain leaves every source of it standing.
    const category = await addCategory(store, domain.id, PLATFORMS);

    expect(await store.deleteCategory(category.id)).toBe(true);
    expect(await readSource(store, feed.id)).toStrictEqual(feed);
    expect(await store.countSources(domain.id)).toBe(2);
  });

  it('leaves the planted dependent counts to the seam', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedSources(store, RADAR);

    // The one place this file knowingly answers something a
    // deployment would not, pinned rather than left to be discovered,
    // and the second table it now applies to: `countDomainDependents`
    // reads what `setDomainDependents` planted and never the rows
    // this half writes, so two stored sources answer a counted zero.
    // `src/domains/db-store.ts` counts the rows instead.
    expect(await store.countSources(domain.id)).toBe(2);
    expect((await store.countDomainDependents(domain.id)).sources).toBe(0);

    store.setDomainDependents(domain.id, { sources: 2 });

    expect((await store.countDomainDependents(domain.id)).sources).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// The aggregate counted over the rows no port can write
// ---------------------------------------------------------------------------

describe('the parse-status aggregate', () => {
  it('counts a zero per member for a source holding none', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedSources(store, RADAR);

    const listed = await store.listSourcesWithParseStats(
      domain.id,
      WHOLE_COLLECTION,
    );

    // The trap `ParseStatusCounts` names: a status with no rows
    // contributes no group to a grouped read, so an implementation
    // has to fill the missing groups in. Under an accumulate-as-you
    // -walk aggregate both sources answer `{}` here, and `0` and
    // never-counted become one value — which is exactly what a
    // caller reading `parseStats.failed` cannot afford.
    expect(listed.map((row) => row.parseStats))
      .toStrictEqual([{ ok: 0, failed: 0 }, { ok: 0, failed: 0 }]);
  });

  it('answers a counted zero for the member with no rows', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [
      planted(1, { parseStatus: 'failed' }),
      planted(2, { parseStatus: 'failed' }),
    ]);

    const [listed] = await store.listSourcesWithParseStats(
      domain.id,
      WHOLE_COLLECTION,
    );

    // The same claim from the other end, and the one a source that
    // has captured NOTHING cannot make: rows exist, one status has
    // none of them, and the absent group is still a counted zero.
    expect(listed?.parseStats).toStrictEqual({ ok: 0, failed: 2 });
  });

  it('keys the record on DOCUMENT_PARSE_STATUSES', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [planted(1)]);

    const [listed] = await store.listSourcesWithParseStats(
      domain.id,
      WHOLE_COLLECTION,
    );

    // Derived from the tuple rather than listed, so a member added to
    // `DOCUMENT_PARSE_STATUSES` reddens here rather than leaving a
    // status the aggregate silently drops. Sorted on both sides,
    // since the record's key order is nobody's promise.
    expect(Object.keys(listed?.parseStats ?? {}).sort())
      .toStrictEqual([...DOCUMENT_PARSE_STATUSES].sort());
  });

  it('counts each source rather than the page', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed, items } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [
      planted(1),
      planted(2, { parseStatus: 'failed' }),
    ]);
    store.setSourceDocuments(items.id, [planted(3, { parseStatus: 'failed' })]);

    const listed = await store.listSourcesWithParseStats(
      domain.id,
      WHOLE_COLLECTION,
    );

    // A grouped read that lost its `source_id` answers the page's
    // totals on every row, which every single-source fixture is
    // green against.
    expect(listed.map((row) => row.parseStats))
      .toStrictEqual([{ ok: 1, failed: 1 }, { ok: 0, failed: 1 }]);
  });

  it('carries the row whole beside the counts', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [planted(1)]);

    const [listed] = await store.listSourcesWithParseStats(
      domain.id,
      WHOLE_COLLECTION,
    );

    // `SourceWithParseStats` EXTENDS the record rather than nesting
    // it, so a caller reads `enabled` off a list row and off a patch
    // response at the same path. Compared whole, since asserting the
    // members a case is about would pass against a projection that
    // dropped the rest.
    expect(listed).toStrictEqual({ ...feed, parseStats: { ok: 1, failed: 0 } });
  });
});

// ---------------------------------------------------------------------------
// The read-only queue over those same rows
// ---------------------------------------------------------------------------

describe('the source failures queue', () => {
  it('answers the failed captures and no others', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [
      planted(1),
      planted(2, { parseStatus: 'failed' }),
      planted(3),
    ]);

    // `failed` is the whole of the filter and there is no status
    // parameter, so the queue cannot be asked for the corpus and this
    // port cannot become a way to page it.
    const page = await store.listSourceFailures(feed.id, WHOLE_COLLECTION);

    expect(page.map((row) => row.id)).toStrictEqual([2]);
    expect(await store.countSourceFailures(feed.id)).toBe(1);
  });

  it('orders newest first with the id breaking a tie', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);
    const older = new Date('2026-01-01T00:00:00.000Z');

    store.setSourceDocuments(feed.id, [
      planted(1, { parseStatus: 'failed', capturedAt: older }),
      planted(2, { parseStatus: 'failed' }),
      planted(3, { parseStatus: 'failed' }),
    ]);

    // The tiebreak is not optional: a batch capture writes many rows
    // inside one statement and `defaultNow()` gives them one
    // timestamp, so a tie spanning a page boundary would let two
    // pages disagree about which row they hold — one row shown twice
    // and another shown never. Rows 2 and 3 share an instant here,
    // and 3 comes first.
    const page = await store.listSourceFailures(feed.id, WHOLE_COLLECTION);

    expect(page.map((row) => row.id)).toStrictEqual([3, 2, 1]);
  });

  it('reads only the window it was given', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [
      planted(1, { parseStatus: 'failed' }),
      planted(2, { parseStatus: 'failed' }),
      planted(3, { parseStatus: 'failed' }),
    ]);

    const page = await store.listSourceFailures(feed.id, {
      limit: 1,
      offset: 1,
    });

    expect(page.map((row) => row.id)).toStrictEqual([2]);
    expect(await store.countSourceFailures(feed.id)).toBe(3);
  });

  it('answers an empty page where nothing failed', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [planted(1), planted(2)]);

    // Three absences that are one answer: a source whose captures all
    // parsed, a window past the end, and an id no source carries.
    // None of the three is a failure to read.
    expect(await store.listSourceFailures(feed.id, WHOLE_COLLECTION))
      .toStrictEqual([]);
    expect(await store.listSourceFailures(feed.id, { limit: 50, offset: 50 }))
      .toStrictEqual([]);
    expect(await store.listSourceFailures(404, WHOLE_COLLECTION))
      .toStrictEqual([]);
    expect(await store.countSourceFailures(404)).toBe(0);
  });

  it('agrees with the aggregate it is asked for differently', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [
      planted(1),
      planted(2, { parseStatus: 'failed' }),
      planted(3, { parseStatus: 'failed' }),
    ]);

    const [listed] = await store.listSourcesWithParseStats(
      domain.id,
      WHOLE_COLLECTION,
    );

    // The same rows counted by two methods, which is one dataset
    // behind both rather than a coincidence two implementations
    // could disagree about.
    expect(await store.countSourceFailures(feed.id))
      .toBe(listed?.parseStats.failed);
  });

  it('answers the body as stored, unmasked and uncut', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);
    const body = `before${String.fromCharCode(0)}after`;

    store.setSourceDocuments(feed.id, [
      planted(1, { parseStatus: 'failed', body, parseError: 'no title' }),
    ]);

    // The masking belongs to `src/sources/failures-service.ts`, and
    // keeping it out of the port is what lets it be tested against a
    // planted control byte with no database. A store masking here
    // would leave that service with nothing to do and would answer a
    // body no column holds.
    const row = await onlyFailure(store, feed.id);

    expect(row.body).toBe(body);
    expect(row.parseError).toBe('no title');
  });

  it('answers a null parse error rather than papering over it', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [
      planted(1, { parseStatus: 'failed', parseError: null }),
    ]);

    // Nothing in the database ties the error to the status, so a
    // `failed` row with no message is storable — and it is the
    // shape that costs the most, since the operator is shown a
    // failure nobody can act on. A store inventing a message would
    // hide it.
    expect((await onlyFailure(store, feed.id)).parseError).toBeNull();
  });

  it('carries the five members and not the status', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);
    const at = new Date(CAPTURED);

    store.setSourceDocuments(feed.id, [
      planted(7, {
        parseStatus: 'failed',
        url: 'https://example.invalid/radar/items/7',
        body: 'a payload that did not parse',
        parseError: 'missing required field',
        capturedAt: at,
      }),
    ]);

    // Column-scoped, and the scoping is the point: `parseStatus` is
    // absent because every row here is `failed` by construction, and
    // `sourceId` because the source is the path. Compared as a WHOLE
    // record, so a projection that grew a member reddens.
    expect(await onlyFailure(store, feed.id)).toStrictEqual({
      id: 7,
      url: 'https://example.invalid/radar/items/7',
      body: 'a payload that did not parse',
      parseError: 'missing required field',
      capturedAt: at,
    });
  });

  it('writes nothing the aggregate can see', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [
      planted(1),
      planted(2, { parseStatus: 'failed' }),
    ]);

    const before = await store.listSourcesWithParseStats(
      domain.id,
      WHOLE_COLLECTION,
    );

    await store.listSourceFailures(feed.id, WHOLE_COLLECTION);
    await store.countSourceFailures(feed.id);

    // `SourceStore` declares no method that writes a `documents`
    // row, so the queue is read-only structurally rather than by
    // convention. The counts before and after are what says a read
    // did not quietly clear a status.
    expect(await store.listSourcesWithParseStats(domain.id, WHOLE_COLLECTION))
      .toStrictEqual(before);
  });
});

// ---------------------------------------------------------------------------
// The source reads
// ---------------------------------------------------------------------------

describe('the source list', () => {
  it('orders by id ascending rather than by endpoint', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedSources(store, RADAR);

    // `sources` has no natural key to sort on, so the port orders by
    // the surrogate — which puts the list in the order the feeds were
    // configured in, and is the one order here needing no collation
    // caveat. The third endpoint sorts FIRST lexically and last by
    // id, which is what makes the two readings tell each other apart.
    await addSource(store, domain.id, 'https://example.invalid/a-feed');

    const listed = await store.listSourcesWithParseStats(
      domain.id,
      WHOLE_COLLECTION,
    );

    expect(listed.map((row) => row.id)).toStrictEqual([1, 2, 3]);
  });

  it('reads only the window it was given', async () => {
    const store = createMemoryResearchStore();
    const { domain, items } = await seedSources(store, RADAR);

    await addSource(store, domain.id, FEED_ENDPOINT);

    const page = await store.listSourcesWithParseStats(domain.id, {
      limit: 1,
      offset: 1,
    });

    expect(page.map((row) => row.id)).toStrictEqual([items.id]);
    expect(await store.countSources(domain.id)).toBe(3);
  });

  it('answers an empty window past the end', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedSources(store, RADAR);

    expect(
      await store.listSourcesWithParseStats(domain.id, {
        limit: 50,
        offset: 50,
      }),
    ).toStrictEqual([]);
  });

  it('lists only the sources of the domain asked about', async () => {
    const store = createMemoryResearchStore();
    const radar = await seedSources(store, RADAR);
    const transit = await seedSources(store, TRANSIT);

    const listed = await store.listSourcesWithParseStats(
      radar.domain.id,
      WHOLE_COLLECTION,
    );

    expect(listed.map((row) => row.id))
      .toStrictEqual([radar.feed.id, radar.items.id]);
    expect(await store.countSources(transit.domain.id)).toBe(2);
  });

  it('answers an empty list for a domain holding none', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    expect(
      await store.listSourcesWithParseStats(domain.id, WHOLE_COLLECTION),
    ).toStrictEqual([]);
    expect(await store.countSources(domain.id)).toBe(0);
  });

  it('answers zero for an id no domain carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.countSources(404)).toBe(0);
    expect(await store.listSourcesWithParseStats(404, WHOLE_COLLECTION))
      .toStrictEqual([]);
  });

  it('answers rows a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedSources(store, RADAR);

    const [listed] = await store.listSourcesWithParseStats(
      domain.id,
      WHOLE_COLLECTION,
    );

    if (listed === undefined) {
      throw new Error('expected the list to answer a row');
    }

    (listed as { endpoint: string }).endpoint = 'written through the list';

    // Against the constants rather than against the records the
    // writes answered: a store handing its own objects out has
    // ALIASED the two, and the comparison then holds one lie against
    // itself and passes.
    const reread = await store.listSourcesWithParseStats(
      domain.id,
      WHOLE_COLLECTION,
    );

    expect(reread.map((row) => row.endpoint))
      .toStrictEqual([FEED_ENDPOINT, ITEMS_ENDPOINT]);
  });
});

describe('the single source read', () => {
  it('answers null for an id no source carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.findSourceById(404)).toBeNull();
  });

  it('answers the row without its aggregate', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [planted(1)]);

    // Deliberately not `SourceWithParseStats`: none of the three
    // callers naming `/sources/:id` needs the counts, and counting on
    // every lookup would put a document scan behind a patch.
    expect(await readSource(store, feed.id)).toStrictEqual(feed);
  });

  it('answers a row a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);
    const endpoint = feed.endpoint;

    const read = await readSource(store, feed.id);

    (read as { endpoint: string }).endpoint = 'written through the read';

    // Against a primitive read BEFORE the mutation: comparing against
    // `feed.endpoint` would compare one lie against itself, since a
    // store handing its own objects out aliased the two.
    expect((await readSource(store, feed.id)).endpoint).toBe(endpoint);
  });
});

// ---------------------------------------------------------------------------
// The source write that is not the insert
// ---------------------------------------------------------------------------

describe('the source patch', () => {
  it('rewrites the members it names and leaves the rest', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);

    const patched = await store.updateSource(feed.id, {
      endpoint: ITEMS_ENDPOINT,
      enabled: false,
    });

    expect(patched)
      .toStrictEqual({ ...feed, endpoint: ITEMS_ENDPOINT, enabled: false });
  });

  it('replaces a jsonb document whole rather than merging', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const source = await addSource(store, domain.id, FEED_ENDPOINT, {
      parserConfig: { itemPath: 'entries', titlePath: 'title' },
    });

    // A caller sends the config it wants to exist, which is the only
    // shape under which removing a selector is expressible at all.
    // Under a merge the read answers two members here.
    const patched = await store.updateSource(source.id, {
      parserConfig: { itemPath: 'items' },
    });

    expect(patched?.parserConfig).toStrictEqual({ itemPath: 'items' });
    expect((await readSource(store, source.id)).parserConfig)
      .toStrictEqual({ itemPath: 'items' });
  });

  it('clears a jsonb document with an empty object', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const source = await addSource(store, domain.id, FEED_ENDPOINT, {
      contract: { required: ['title'] },
    });

    // Every column on this table is NOT NULL, so a patch member
    // distinguishes TWO requests and not three — absent leaves the
    // document alone, present writes it — and empty is what
    // "cleared" means at these two columns rather than a workaround.
    const patched = await store.updateSource(source.id, { contract: {} });

    expect(patched?.contract).toStrictEqual({});
    expect(patched?.parserConfig).toStrictEqual({});
  });

  it('writes a false enabled rather than ignoring it', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);

    // `enabled` is NOT NULL and defaults true, so `false` is a value
    // being written rather than a member being left alone. This is
    // the column for retiring a feed; deleting it is a different
    // operation and one the corpus can refuse.
    await store.updateSource(feed.id, { enabled: false });

    expect((await readSource(store, feed.id)).enabled).toBe(false);
  });

  it('answers the stored row for a patch naming no member', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);

    // `sources` carries no `updated_at`, so an empty patch has
    // literally nothing to set and drizzle throws `No values to set`
    // on an empty update list. The port decides the answer rather
    // than leaving its two implementations to disagree.
    expect(await store.updateSource(feed.id, {})).toStrictEqual(feed);
  });

  it('cannot reach a pipeline-owned column whatever it is handed', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);

    // `SourcePatch` declares none of the five, so the containment
    // is the type's; the cast is what lets a case ask what happens
    // when they arrive anyway, which is the reading a route's
    // `.strict()` schema cannot give from inside `src/`. `flagged`
    // is the one worth the case: it is the adapter-rot detector's
    // output, and a clearable flag would be a button that hides
    // that nothing was fixed.
    const patched = await store.updateSource(feed.id, {
      flagged: false,
      cursor: 'rewound',
      consecutiveFailures: 0,
      lastSuccessAt: new Date(CAPTURED),
      lastFailureAt: new Date(CAPTURED),
    } as SourcePatch);

    expect(patched).toStrictEqual(feed);
    expect(await readSource(store, feed.id)).toStrictEqual(feed);
  });

  it('answers null from a patch naming no stored source', async () => {
    const store = createMemoryResearchStore();

    expect(await store.updateSource(404, { enabled: false })).toBeNull();
  });

  it('answers a row a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);

    const patched = await store.updateSource(feed.id, {
      endpoint: ITEMS_ENDPOINT,
    });

    if (patched === null) {
      throw new Error('expected the patch to answer a row');
    }

    (patched as { endpoint: string }).endpoint = 'written through the patch';

    expect((await readSource(store, feed.id)).endpoint).toBe(ITEMS_ENDPOINT);
  });
});

// ---------------------------------------------------------------------------
// The mutable members crossing the sources boundary
// ---------------------------------------------------------------------------

describe('the source jsonb documents crossing the boundary', () => {
  it('lands the pipeline columns unfetched', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    const inserted = await addSource(store, domain.id, FEED_ENDPOINT);

    // `InsertSourceInput` declares no member that could set one, so a
    // source is INSERTED NEVER FETCHED and there is no way to create
    // one claiming a history it does not have. The two stamps land
    // null, which is also why no case below can exercise the copy
    // their non-null branch carries: nothing on this port or in the
    // seams writes either, so the branch is pinned by the record's
    // own type and by nothing here.
    expect(inserted.cursor).toBeNull();
    expect(inserted.consecutiveFailures).toBe(0);
    expect(inserted.lastSuccessAt).toBeNull();
    expect(inserted.lastFailureAt).toBeNull();
    expect(inserted.flagged).toBe(false);
  });

  it('does not store the object an insert was handed', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const submitted = { selectors: { item: 'entry' } };

    const inserted = await addSource(store, domain.id, FEED_ENDPOINT, {
      parserConfig: submitted,
    });

    // One level down, which is what makes the round trip the right
    // copy rather than a spread: a spread would leave the caller
    // holding the selectors.
    submitted.selectors.item = 'written through the insert';

    expect((await readSource(store, inserted.id)).parserConfig)
      .toStrictEqual({ selectors: { item: 'entry' } });
  });

  it('does not store either object a patch was handed', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);
    const config = { selectors: { item: 'entry' } };
    const contract = { required: { title: true } };

    await store.updateSource(feed.id, { parserConfig: config, contract });

    // BOTH members in one case, because the patch copies them at two
    // separate call sites and a case naming one is green against a
    // store that shares the other. Measured: aimed at `parserConfig`
    // alone, the leg that stops copying `contract` reddens nothing.
    config.selectors.item = 'written through the patch';
    contract.required.title = false;

    const stored = await readSource(store, feed.id);

    expect(stored.parserConfig)
      .toStrictEqual({ selectors: { item: 'entry' } });
    expect(stored.contract).toStrictEqual({ required: { title: true } });
  });

  it('answers a document a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const inserted = await addSource(store, domain.id, FEED_ENDPOINT, {
      parserConfig: { itemPath: 'entries' },
    });

    (inserted.parserConfig as { itemPath: string }).itemPath = 'through answer';
    const read = await readSource(store, inserted.id);

    (read.parserConfig as { itemPath: string }).itemPath = 'through a read';

    // Against a constant rather than against the record the insert
    // answered, for the reason the topic due-time cases give.
    expect((await readSource(store, inserted.id)).parserConfig)
      .toStrictEqual({ itemPath: 'entries' });
  });
});

describe('the planted capture instant crossing the boundary', () => {
  it('does not store the Date the seam was handed', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);
    const at = new Date(CAPTURED);

    store.setSourceDocuments(feed.id, [
      planted(1, { parseStatus: 'failed', capturedAt: at }),
    ]);

    // The copy on the way IN. A seam holding this instance lets the
    // case that planted the row go on moving its capture time
    // afterwards, through a member the port declares `readonly`.
    at.setTime(Date.parse('2030-06-01T00:00:00.000Z'));

    expect(capturedAt(await onlyFailure(store, feed.id)))
      .toBe(Date.parse(CAPTURED));
  });

  it('does not store the array the seam was handed', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);
    const submitted = [planted(1, { parseStatus: 'failed' })];

    store.setSourceDocuments(feed.id, submitted);

    submitted.push(planted(2, { parseStatus: 'failed' }));

    expect(await store.countSourceFailures(feed.id)).toBe(1);
  });

  it('answers a capture instant the queue cannot write through', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [
      planted(1, { parseStatus: 'failed' }),
    ]);

    const row = await onlyFailure(store, feed.id);
    const at = capturedAt(row);

    row.capturedAt.setTime(0);

    // Against the primitive captured BEFORE the mutation: a store
    // handing its own `Date` out has aliased the two, and comparing
    // against `row.capturedAt` would hold one lie against itself.
    expect(capturedAt(await onlyFailure(store, feed.id))).toBe(at);
  });

  it('answers a fresh Date on every read', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSources(store, RADAR);

    store.setSourceDocuments(feed.id, [planted(1, { parseStatus: 'failed' })]);

    const first = await onlyFailure(store, feed.id);
    const second = await onlyFailure(store, feed.id);

    expect(first.capturedAt).not.toBe(second.capturedAt);
    expect(capturedAt(first)).toBe(capturedAt(second));
  });
});

// ---------------------------------------------------------------------------
// The key this half refuses on, and the CHECK that sits beside it
// ---------------------------------------------------------------------------

describe('the connectors_kind_name_unique key', () => {
  it('refuses a second connector on a pair already held', async () => {
    const store = createMemoryResearchStore();

    await seedConnectors(store);

    const refusal = await refusalFrom(
      () => addConnector(store, 'llm', MODEL_HOST),
    );

    expect(refusal).toBeInstanceOf(StoreRefusal);

    // The positive control, in this body rather than in a sibling
    // case: a store refusing every write passes the assertion above.
    const accepted = await addConnector(store, 'llm', 'example-third');

    expect(accepted.name).toBe('example-third');
    expect(await store.countConnectors(EVERY_KIND)).toBe(4);
  });

  it('names the mechanism and the constraint that refused', async () => {
    const store = createMemoryResearchStore();

    await seedConnectors(store);

    const refusal = await refusalFrom(
      () => addConnector(store, 'llm', MODEL_HOST),
    );

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe('connectors_kind_name_unique');
  });

  it('takes the same name under a second kind', async () => {
    const store = createMemoryResearchStore();

    await seedConnectors(store);

    // The key is `(kind, name)` and not `name`, so this is the
    // widening control: a store holding names globally unique refuses
    // a write the database takes. One name under two kinds is
    // ordinary, which is what `src/connectors/store.ts` says the pair
    // is for.
    const accepted = await addConnector(store, 'search', MODEL_HOST);

    expect(accepted.kind).toBe('search');
    expect(accepted.name).toBe(MODEL_HOST);
    expect(await store.countConnectors({ kind: 'llm' })).toBe(2);
  });

  it('leaves the standing connector exactly as it was', async () => {
    const store = createMemoryResearchStore();
    const { model } = await seedConnectors(store);

    await refusalFrom(() => addConnector(store, 'llm', MODEL_HOST, {
      config: { endpoint: 'https://example.invalid/rewritten' },
    }));

    expect(await readConnector(store, model.id)).toStrictEqual(model);
    expect(await store.countConnectors(EVERY_KIND)).toBe(3);
  });

  it('puts neither the name nor the secret in what it threw', async () => {
    const store = createMemoryResearchStore();

    await seedConnectors(store);

    const refusal = await refusalFrom(
      () => addConnector(store, 'llm', MODEL_HOST, {
        config: connectorConfig(),
      }),
    );
    const serialised = JSON.stringify({
      ...refusal,
      message: refusal.message,
      stack: refusal.stack,
    });

    // The name is what every sibling half counts; the CREDENTIAL is
    // what only this one can. A refusal built over a config is the
    // first thing on this surface that could carry one onward.
    expect(countOccurrences(serialised, MODEL_HOST)).toBe(0);
    expect(countOccurrences(serialised, SECRET_TOKEN)).toBe(0);

    // The same searches over a message that DOES carry both, so the
    // two zeros are readings rather than searches finding nothing
    // anywhere.
    const planted = JSON.stringify({
      ...refusal,
      message: `duplicate key ${MODEL_HOST} ${SECRET_TOKEN}`,
    });

    expect(countOccurrences(planted, MODEL_HOST)).toBe(1);
    expect(countOccurrences(planted, SECRET_TOKEN)).toBe(1);
  });

  it('refuses a rename onto a name the kind already holds', async () => {
    const store = createMemoryResearchStore();
    const { model, spare } = await seedConnectors(store);

    // The same mechanism on an UPDATE, which this table reaches
    // because `name` is patchable: both writes open on the key.
    const refusal = await refusalFrom(
      () => store.updateConnector(spare.id, { name: MODEL_HOST }),
    );

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe('connectors_kind_name_unique');
    expect(await readConnector(store, spare.id)).toStrictEqual(spare);
    expect(await readConnector(store, model.id)).toStrictEqual(model);
  });

  it('takes a rename onto a name a SECOND kind holds', async () => {
    const store = createMemoryResearchStore();
    const { spare, notebook } = await seedConnectors(store);

    // The resulting pair is checked within the STORED kind, since
    // `kind` is not patchable: a name another kind carries is not a
    // conflict, which is the same widening control the insert case
    // makes and the patch has to make for itself.
    const patched = await store.updateConnector(spare.id, {
      name: ARCHIVE_NOTEBOOK,
    });

    expect(patched?.name).toBe(ARCHIVE_NOTEBOOK);
    expect(patched?.kind).toBe('llm');
    expect(await readConnector(store, notebook.id)).toStrictEqual(notebook);
  });

  it('takes a patch writing a name back over itself', async () => {
    const store = createMemoryResearchStore();
    const { model } = await seedConnectors(store);

    // A row is not in conflict with itself. A store looking the pair
    // up without excluding the row being written refuses this.
    const patched = await store.updateConnector(model.id, {
      name: MODEL_HOST,
      config: { endpoint: MODEL_ENDPOINT },
    });

    expect(patched?.name).toBe(MODEL_HOST);
    expect(patched?.config).toStrictEqual({ endpoint: MODEL_ENDPOINT });
  });
});

describe('the connectors_kind_check', () => {
  it('refuses an insert whose kind is outside the tuple', async () => {
    const store = createMemoryResearchStore();

    const refusal = await refusalFrom(
      () => addConnector(store, 'telepathy', MODEL_HOST),
    );

    expect(refusal.reason).toBe('check-violation');
    expect(refusal.constraint).toBe('connectors_kind_check');
    expect(await store.countConnectors(EVERY_KIND)).toBe(0);
  });

  it('takes every member of the tuple it is held to', async () => {
    const store = createMemoryResearchStore();

    // The acceptance control, looped over the RUNTIME tuple rather
    // than a list written out here: a member added to
    // `CONNECTOR_KINDS` reaches this case, and a store narrowing the
    // guard to some of them fails it. Without this, a store refusing
    // every kind passes the case above.
    for (const kind of CONNECTOR_KINDS) {
      const accepted = await addConnector(store, kind, MODEL_HOST);

      expect(accepted.kind).toBe(kind);
    }

    expect(await store.countConnectors(EVERY_KIND))
      .toBe(CONNECTOR_KINDS.length);
  });
});

// ---------------------------------------------------------------------------
// The sequence behind connectors.id, and the refusals that burn it
// ---------------------------------------------------------------------------

describe('the connector id sequence', () => {
  it('hands the first connector id 1', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const inserted = await addConnector(store, 'llm', MODEL_HOST);

    // Its own counter, and none of the other six: the domain above
    // holds id 1 as well.
    expect(inserted.id).toBe(1);
    expect(domain.id).toBe(1);
  });

  it('burns an id on a refused insert, as the sequence does', async () => {
    const store = createMemoryResearchStore();

    await seedConnectors(store);
    await refusalFrom(() => addConnector(store, 'llm', MODEL_HOST));

    const next = await addConnector(store, 'llm', 'example-fourth');

    // 5 rather than 4: the three seeded connectors took 1, 2 and 3,
    // and the refusal took the fourth. No measurement on `connectors`
    // of its own — the reasoning is `personas`', where two refused
    // inserts between two accepted ones left a gap of two against the
    // live server.
    expect(next.id).toBe(5);
  });

  it('burns one on a CHECK refusal as well', async () => {
    const store = createMemoryResearchStore();

    await seedConnectors(store);
    await refusalFrom(() => addConnector(store, 'telepathy', MODEL_HOST));

    const next = await addConnector(store, 'llm', 'example-fourth');

    // The counter advances ahead of EVERY check rather than ahead of
    // the key check alone, which is the half of the personas
    // measurement a key-only burn would satisfy anyway.
    expect(next.id).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// The delete refused from outside the row, by the one key there is
// ---------------------------------------------------------------------------

describe('the subscriptions that hold a connector delete', () => {
  it('refuses while an export subscription names it', async () => {
    const store = createMemoryResearchStore();
    const { model, spare } = await seedConnectors(store);

    store.setConnectorSubscriptions(model.id, 2);

    // `export_subscriptions.connector_id` is `ON DELETE no action`,
    // and `src/db/schema/scheduling.ts` argues it at the column: a
    // connector is shared, so retiring one service should not quietly
    // cancel deliveries in every domain that named it.
    const refusal = await refusalFrom(() => store.deleteConnector(model.id));

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint)
      .toBe('export_subscriptions_connector_id_connectors_id_fk');
    expect(await readConnector(store, model.id)).toStrictEqual(model);

    // The positive control, in this body rather than a sibling case:
    // the SAME call over the sibling nothing names. A store refusing
    // every delete passes the assertions above.
    expect(await store.deleteConnector(spare.id)).toBe(true);
    expect(await store.countConnectors(EVERY_KIND)).toBe(2);
  });

  it('counts what the delete would have taken', async () => {
    const store = createMemoryResearchStore();
    const { model, spare } = await seedConnectors(store);

    store.setConnectorSubscriptions(model.id, 3);

    // The guard reads a count and takes no view of it; the `409` is
    // `src/connectors/service.ts`'s, and carries this number so a
    // caller learns what stands in the way rather than only that
    // something did.
    expect(await store.countConnectorDependents(model.id))
      .toStrictEqual({ exportSubscriptions: 3 });
    expect(await store.countConnectorDependents(spare.id))
      .toStrictEqual({ exportSubscriptions: 0 });
  });

  it('stops refusing once the subscriptions are taken back', async () => {
    const store = createMemoryResearchStore();
    const { model } = await seedConnectors(store);

    store.setConnectorSubscriptions(model.id, 1);
    await refusalFrom(() => store.deleteConnector(model.id));

    // A whole-unit plant: the second call REPLACES the first rather
    // than adding to it, and zero is how a case takes a plant back.
    store.setConnectorSubscriptions(model.id, 0);

    expect(await store.deleteConnector(model.id)).toBe(true);
    expect(await store.findConnectorById(model.id)).toBeNull();
  });

  it('answers false for an id no connector carries', async () => {
    const store = createMemoryResearchStore();

    // A counted zero rather than a refusal for an id nothing points
    // at, which is correct rather than a special case — and the
    // delete that follows removes nothing without throwing.
    expect(await store.countConnectorDependents(404))
      .toStrictEqual({ exportSubscriptions: 0 });
    expect(await store.deleteConnector(404)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The cascade that never arrives
// ---------------------------------------------------------------------------

describe('the domain delete a connector outlives', () => {
  it('leaves every connector standing', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedSources(store, RADAR);
    const { model, notebook } = await seedConnectors(store);

    await addTopic(store, domain.id, EDGE_INFERENCE);

    expect(await store.deleteDomain(domain.id)).toBe(true);

    // The control that says the delete reached anything at all: the
    // domain's own sources and topics are gone in the same call.
    expect(await store.findSourceById(feed.id)).toBeNull();
    expect(await store.countTopics(domain.id)).toBe(0);

    // `connectors` carries no `domain_id`, so nothing here is the
    // cascade's to take. A connector outlives every domain that named
    // it — which is what an `export_subscriptions` row records and a
    // column on this table would have got wrong.
    expect(await store.countConnectors(EVERY_KIND)).toBe(3);
    expect(await readConnector(store, model.id)).toStrictEqual(model);
    expect(await readConnector(store, notebook.id)).toStrictEqual(notebook);
  });
});

// ---------------------------------------------------------------------------
// What a page of connectors answers, and what narrows it
// ---------------------------------------------------------------------------

describe('the connector list', () => {
  it('orders by kind, then by name within it', async () => {
    const store = createMemoryResearchStore();
    const { model, spare, notebook } = await seedConnectors(store);

    const page = await store.listConnectors(EVERY_KIND, WHOLE_COLLECTION);

    // Neither insertion order (the notebook went in first) nor name
    // order (its name sorts before both of the others): one fixture
    // tells the pair from either column alone.
    expect(page.map((row) => row.id))
      .toStrictEqual([model.id, spare.id, notebook.id]);
  });

  it('answers one window of it', async () => {
    const store = createMemoryResearchStore();
    const { spare, notebook } = await seedConnectors(store);

    const second = await store.listConnectors(EVERY_KIND, {
      limit: 2,
      offset: 1,
    });

    expect(second.map((row) => row.id)).toStrictEqual([spare.id, notebook.id]);
    expect(await store.countConnectors(EVERY_KIND)).toBe(3);
  });

  it('narrows to one kind, and counts the same way', async () => {
    const store = createMemoryResearchStore();
    const { model, spare } = await seedConnectors(store);

    const page = await store.listConnectors({ kind: 'llm' }, WHOLE_COLLECTION);

    // The count reads through the same predicate the page did, which
    // is the whole of what keeps a page's `meta.total` from
    // describing a different collection than the page.
    expect(page.map((row) => row.id)).toStrictEqual([model.id, spare.id]);
    expect(await store.countConnectors({ kind: 'llm' })).toBe(2);
    expect(await store.countConnectors({ kind: 'notebook' })).toBe(1);
  });

  it('answers an empty page for a kind no row carries', async () => {
    const store = createMemoryResearchStore();

    await seedConnectors(store);

    // Neither an error nor a refusal: nothing failed to read. The
    // whole-collection read beside it is what says the store held
    // rows to leave out.
    expect(await store.listConnectors({ kind: 'search' }, WHOLE_COLLECTION))
      .toStrictEqual([]);
    expect(await store.countConnectors({ kind: 'search' })).toBe(0);
    expect(await store.countConnectors(EVERY_KIND)).toBe(3);
  });
});

describe('the single connector read', () => {
  it('answers the stored row by its id', async () => {
    const store = createMemoryResearchStore();
    const { model } = await seedConnectors(store);

    expect(await store.findConnectorById(model.id)).toStrictEqual({
      id: model.id,
      kind: 'llm',
      name: MODEL_HOST,
      config: connectorConfig(),
    });
  });

  it('answers null for an id no connector carries', async () => {
    const store = createMemoryResearchStore();

    await seedConnectors(store);

    expect(await store.findConnectorById(404)).toBeNull();
  });
});

describe('the connector patch', () => {
  it('writes nothing for a patch naming no member', async () => {
    const store = createMemoryResearchStore();
    const { model } = await seedConnectors(store);

    // `connectors` carries no `updated_at`, so an empty patch has
    // literally nothing to set and drizzle throws `No values to set`
    // on an empty update list. The stored row is answered instead —
    // a decision `src/connectors/store.ts` takes for both
    // implementations rather than leaving them to disagree.
    expect(await store.updateConnector(model.id, {})).toStrictEqual(model);
    expect(await readConnector(store, model.id)).toStrictEqual(model);
  });

  it('renames without touching the config', async () => {
    const store = createMemoryResearchStore();
    const { model } = await seedConnectors(store);

    const patched = await store.updateConnector(model.id, {
      name: 'example-renamed-host',
    });

    expect(patched?.name).toBe('example-renamed-host');
    expect(patched?.config).toStrictEqual(connectorConfig());
  });

  it('replaces the config whole rather than merging into it', async () => {
    const store = createMemoryResearchStore();
    const { model } = await seedConnectors(store);

    await store.updateConnector(model.id, {
      config: { endpoint: MODEL_ENDPOINT },
    });

    // A caller sends the object it wants to exist, which is the only
    // shape under which removing a member is expressible at all — and
    // on this table that means a patch omitting a secret's key has
    // CLEARED that secret. Under a merge the credentials survive.
    expect((await readConnector(store, model.id)).config)
      .toStrictEqual({ endpoint: MODEL_ENDPOINT });
  });

  it('answers null for an id no connector carries', async () => {
    const store = createMemoryResearchStore();

    await seedConnectors(store);

    expect(await store.updateConnector(404, { name: MODEL_HOST })).toBeNull();
    expect(await store.countConnectors(EVERY_KIND)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// The one copied document here that is a live credential
// ---------------------------------------------------------------------------

describe('the connector config crossing the boundary', () => {
  it('does not store the object an insert was handed', async () => {
    const store = createMemoryResearchStore();
    const submitted = connectorConfig();

    const inserted = await addConnector(store, 'llm', MODEL_HOST, {
      config: submitted,
    });

    // One level down, which is what makes the round trip the right
    // copy rather than a spread: a spread would leave the caller
    // holding the credentials.
    credentialsOf(submitted).apiKey = 'written through the insert';

    expect((await readConnector(store, inserted.id)).config)
      .toStrictEqual(connectorConfig());
  });

  it('does not store the object a patch was handed', async () => {
    const store = createMemoryResearchStore();
    const { spare } = await seedConnectors(store);
    const submitted = connectorConfig();

    await store.updateConnector(spare.id, { config: submitted });

    credentialsOf(submitted).apiKey = 'written through the patch';

    expect((await readConnector(store, spare.id)).config)
      .toStrictEqual(connectorConfig());
  });

  it('answers a config a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { model } = await seedConnectors(store);

    credentialsOf(model.config).apiKey = 'written through the insert answer';

    const read = await readConnector(store, model.id);

    credentialsOf(read.config).apiKey = 'written through a read';

    // Against the fixture function rather than against the record the
    // insert answered: a store handing out its own object has aliased
    // the two, and the comparison would then hold one lie against
    // itself and pass.
    expect((await readConnector(store, model.id)).config)
      .toStrictEqual(connectorConfig());
  });

  it('answers a config the list cannot be written through', async () => {
    const store = createMemoryResearchStore();

    await seedConnectors(store);

    const [listed] = await store.listConnectors(
      { kind: 'llm' },
      WHOLE_COLLECTION,
    );

    if (listed === undefined) {
      throw new Error('expected the llm page to carry a row');
    }

    credentialsOf(listed.config).apiKey = 'written through the list';

    expect((await readConnector(store, listed.id)).config)
      .toStrictEqual(connectorConfig());
  });

  it('answers a fresh config on every read', async () => {
    const store = createMemoryResearchStore();
    const { model } = await seedConnectors(store);

    const first = await readConnector(store, model.id);
    const second = await readConnector(store, model.id);

    expect(first.config).not.toBe(second.config);
    expect(first.config).toStrictEqual(second.config);
  });

  it('stores an empty config as a value rather than a default', async () => {
    const store = createMemoryResearchStore();
    const { spare } = await seedConnectors(store);

    // Empty is a complete value and the column's default, and for a
    // connector it means there is nowhere to reach — the row names a
    // service the pipeline cannot call rather than one it calls with
    // defaults. So a config nobody filled in reads back as `{}`
    // rather than as anything this store invented.
    expect(spare.config).toStrictEqual({});
    expect((await readConnector(store, spare.id)).config).toStrictEqual({});
  });
});

// ---------------------------------------------------------------------------
// The widest key in this file, and the only one over three columns
// ---------------------------------------------------------------------------

describe('the triple that keys a subscription', () => {
  it('refuses a second row on a triple already held', async () => {
    const store = createMemoryResearchStore();
    const { domain, notebook } = await seedSubscriptions(store, RADAR);

    const refusal = await refusalFrom(
      () => addSubscription(store, domain.id, RSS, notebook.id),
    );

    expect(refusal).toBeInstanceOf(StoreRefusal);

    // The positive control, in this body rather than in a sibling
    // case: a store refusing every write passes the assertion above.
    const accepted = await addSubscription(
      store,
      domain.id,
      'pdf',
      notebook.id,
    );

    expect(accepted.format).toBe('pdf');
    expect(await store.countSubscriptions(domain.id)).toBe(4);
  });

  it('names the mechanism and the constraint that refused', async () => {
    const store = createMemoryResearchStore();
    const { domain, notebook } = await seedSubscriptions(store, RADAR);

    const refusal = await refusalFrom(
      () => addSubscription(store, domain.id, RSS, notebook.id),
    );

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint)
      .toBe('export_subscriptions_domain_id_format_connector_id_unique');
  });

  it('takes a second format at one connector', async () => {
    const store = createMemoryResearchStore();
    const planted = await seedSubscriptions(store, RADAR);
    const { domain, notebook, digest } = planted;

    // The first of the three widening controls a triple needs, and
    // the fixture already carries it: `digest` and `feed` differ by
    // format alone. A store keying on `(domain, connector)` refuses
    // the write that produced it.
    expect(digest.connectorId).toBe(notebook.id);
    expect(await store.countSubscriptions(domain.id)).toBe(3);
  });

  it('takes a second connector for one format', async () => {
    const store = createMemoryResearchStore();
    const { domain, model, archive } = await seedSubscriptions(store, RADAR);

    // The second: `digest` and `archive` differ by connector alone,
    // which a store keying on `(domain, format)` refuses. One domain
    // wanting one digest delivered to two destinations is ordinary.
    expect(archive.format).toBe(OBSIDIAN);
    expect(archive.connectorId).toBe(model.id);
    expect(await store.countSubscriptions(domain.id)).toBe(3);
  });

  it('takes the same pair under a second domain', async () => {
    const store = createMemoryResearchStore();
    const { notebook } = await seedSubscriptions(store, RADAR);
    const transit = await store.insertDomain(domainInput(TRANSIT));

    // The third: the key is scoped by the domain, so a second domain
    // subscribing to the same format at the same connector is not a
    // conflict at all. A store keying on `(format, connector)`
    // refuses this.
    const accepted = await addSubscription(
      store,
      transit.id,
      RSS,
      notebook.id,
    );

    expect(accepted.domainId).toBe(transit.id);
    expect(await store.countSubscriptions(transit.id)).toBe(1);
  });

  it('leaves the standing subscription exactly as it was', async () => {
    const store = createMemoryResearchStore();
    const { domain, notebook, feed } = await seedSubscriptions(store, RADAR);

    await refusalFrom(() => addSubscription(
      store,
      domain.id,
      RSS,
      notebook.id,
      { intervalSeconds: 60, enabled: false },
    ));

    expect(await readSubscription(store, feed.id)).toStrictEqual(feed);
    expect(await store.countSubscriptions(domain.id)).toBe(3);
  });

  it('refuses a re-point onto a triple already held', async () => {
    const store = createMemoryResearchStore();
    const { model, digest, archive } = await seedSubscriptions(store, RADAR);

    // The same mechanism on an UPDATE, which this table reaches
    // through TWO of the three key columns: `connectorId` here.
    const refusal = await refusalFrom(
      () => store.updateSubscription(digest.id, { connectorId: model.id }),
    );

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint)
      .toBe('export_subscriptions_domain_id_format_connector_id_unique');
    expect(await readSubscription(store, digest.id)).toStrictEqual(digest);
    expect(await readSubscription(store, archive.id)).toStrictEqual(archive);
  });

  it('refuses a reformat onto a triple already held', async () => {
    const store = createMemoryResearchStore();
    const { digest, feed } = await seedSubscriptions(store, RADAR);

    // And `format` here: the other patchable third of the key. Two
    // cases rather than one, because a store checking only the
    // member it was handed passes whichever of the two it checked.
    const refusal = await refusalFrom(
      () => store.updateSubscription(digest.id, { format: RSS }),
    );

    expect(refusal.constraint)
      .toBe('export_subscriptions_domain_id_format_connector_id_unique');
    expect(await readSubscription(store, feed.id)).toStrictEqual(feed);
  });

  it('takes a re-point onto a triple nothing holds', async () => {
    const store = createMemoryResearchStore();
    const { model, feed } = await seedSubscriptions(store, RADAR);

    // The re-pointing `src/db/schema/scheduling.ts` says the
    // connector delete's refusal exists to make explicit, and the
    // acceptance control the two refusals above need.
    const patched = await store.updateSubscription(feed.id, {
      connectorId: model.id,
    });

    expect(patched?.connectorId).toBe(model.id);
    expect(patched?.format).toBe(RSS);
  });

  it('takes a patch writing the triple back over itself', async () => {
    const store = createMemoryResearchStore();
    const { notebook, digest } = await seedSubscriptions(store, RADAR);

    // A row is not in conflict with itself. A store looking the
    // triple up without excluding the row being written refuses this.
    const patched = await store.updateSubscription(digest.id, {
      format: OBSIDIAN,
      connectorId: notebook.id,
      intervalSeconds: 900,
    });

    expect(patched?.intervalSeconds).toBe(900);
    expect(patched?.format).toBe(OBSIDIAN);
  });

  it('frees the triple a deleted subscription held', async () => {
    const store = createMemoryResearchStore();
    const { domain, notebook, feed } = await seedSubscriptions(store, RADAR);

    await store.deleteSubscription(feed.id);

    const accepted = await addSubscription(
      store,
      domain.id,
      RSS,
      notebook.id,
    );

    expect(accepted.id).not.toBe(feed.id);
    expect(await store.countSubscriptions(domain.id)).toBe(3);
  });
});

describe('the export_subscriptions_format_check', () => {
  it('refuses an insert whose format is outside the tuple', async () => {
    const store = createMemoryResearchStore();
    const { domain, notebook } = await seedSubscriptions(store, RADAR);

    const refusal = await refusalFrom(
      () => addSubscription(store, domain.id, 'telegram', notebook.id),
    );

    expect(refusal.reason).toBe('check-violation');
    expect(refusal.constraint).toBe('export_subscriptions_format_check');
    expect(await store.countSubscriptions(domain.id)).toBe(3);
  });

  it('refuses a PATCH whose format is outside the tuple', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSubscriptions(store, RADAR);

    // BOTH writes reach this CHECK, which is `sources_kind_check`'s
    // shape rather than `connectors_kind_check`'s: `format` is
    // patchable, because it selects the renderer that runs for THIS
    // row and nothing outside the row reads it.
    const refusal = await refusalFrom(
      () => store.updateSubscription(feed.id, { format: 'telegram' }),
    );

    expect(refusal.reason).toBe('check-violation');
    expect(refusal.constraint).toBe('export_subscriptions_format_check');
    expect(await readSubscription(store, feed.id)).toStrictEqual(feed);
  });

  it('takes every member of the tuple it is held to', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const connector = await addConnector(store, 'notebook', ARCHIVE_NOTEBOOK);

    // The acceptance control, looped over the RUNTIME tuple rather
    // than a list written out here: a member added to
    // `EXPORT_FORMATS` reaches this case, and a store narrowing the
    // guard to some of them fails it. Without this, a store refusing
    // every format passes the two cases above. Every format at ONE
    // connector, so the loop is the key's second widening control as
    // well: a store keying on `(domain, connector)` refuses its
    // second turn.
    for (const format of EXPORT_FORMATS) {
      const accepted = await addSubscription(
        store,
        domain.id,
        format,
        connector.id,
      );

      expect(accepted.format).toBe(format);
    }

    expect(await store.countSubscriptions(domain.id))
      .toBe(EXPORT_FORMATS.length);
  });
});

// ---------------------------------------------------------------------------
// The two foreign keys, one per end of the row
// ---------------------------------------------------------------------------

describe('the subscription domain foreign key', () => {
  it('refuses an insert naming no stored domain', async () => {
    const store = createMemoryResearchStore();
    const { domain, notebook } = await seedSubscriptions(store, RADAR);

    const refusal = await refusalFrom(
      () => addSubscription(store, 404, OBSIDIAN, notebook.id),
    );

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint)
      .toBe('export_subscriptions_domain_id_domains_id_fk');

    // The positive control: the SAME write into a domain that exists.
    const accepted = await addSubscription(
      store,
      domain.id,
      'pdf',
      notebook.id,
    );

    expect(accepted.domainId).toBe(domain.id);
  });

  it('is unreachable from the patch, which names no domain', async () => {
    const store = createMemoryResearchStore();
    const { digest } = await seedSubscriptions(store, RADAR);

    // `SubscriptionPatch` declares no `domainId`, so the containment
    // is the type's; the cast is what lets a case ask what happens
    // when one arrives anyway, which is the reading a route's
    // `.strict()` schema cannot give from inside `src/`.
    const patched = await store.updateSubscription(
      digest.id,
      { domainId: 404 } as SubscriptionPatch,
    );

    expect(patched?.domainId).toBe(digest.domainId);
    expect((await readSubscription(store, digest.id)).domainId)
      .toBe(digest.domainId);
  });
});

describe('the subscription connector foreign key', () => {
  it('refuses an insert naming no stored connector', async () => {
    const store = createMemoryResearchStore();
    const { domain, model } = await seedSubscriptions(store, RADAR);

    const refusal = await refusalFrom(
      () => addSubscription(store, domain.id, 'pdf', 404),
    );

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint)
      .toBe('export_subscriptions_connector_id_connectors_id_fk');

    // The positive control: the SAME write at a connector that is
    // there. A store refusing every insert passes the assertions
    // above.
    const accepted = await addSubscription(store, domain.id, 'pdf', model.id);

    expect(accepted.connectorId).toBe(model.id);
  });

  it('refuses a re-point onto no stored connector', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSubscriptions(store, RADAR);

    // BOTH writes reach it, `connectorId` being patchable — the
    // re-pointing the connector delete's own refusal exists to make
    // explicit, which is exactly the operation that can name a row
    // somebody has just retired.
    const refusal = await refusalFrom(
      () => store.updateSubscription(feed.id, { connectorId: 404 }),
    );

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint)
      .toBe('export_subscriptions_connector_id_connectors_id_fk');
    expect(await readSubscription(store, feed.id)).toStrictEqual(feed);
  });

  it('refuses a re-point onto a connector just deleted', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedSubscriptions(store, RADAR);
    const retired = await addConnector(store, 'search', 'example-retired');

    // The race `src/subscriptions/store.ts` describes, reached
    // directly rather than argued: the service resolves the connector
    // before writing, so what is left is the row going away in
    // between. This store's connector guard reads a planted count, so
    // nothing holds the delete and the window is openable by hand.
    expect(await store.deleteConnector(retired.id)).toBe(true);

    const refusal = await refusalFrom(
      () => store.updateSubscription(feed.id, { connectorId: retired.id }),
    );

    expect(refusal.constraint)
      .toBe('export_subscriptions_connector_id_connectors_id_fk');
  });

  it('names the constraint the connector guard names', async () => {
    const store = createMemoryResearchStore();
    const { domain, model } = await seedSubscriptions(store, RADAR);

    store.setConnectorSubscriptions(model.id, 1);

    // ONE CONSTRAINT READ FROM BOTH ENDS, which no other mechanism in
    // this file is. The connector guard refuses a DELETE and this
    // half refuses a WRITE, and both name the same key — so a
    // rename on either side that missed the other would show up here
    // rather than in a deployment.
    const held = await refusalFrom(() => store.deleteConnector(model.id));
    const written = await refusalFrom(
      () => addSubscription(store, domain.id, 'email_draft', 404),
    );

    expect(written.constraint).toBe(held.constraint);
    expect(held.reason).toBe(written.reason);
  });
});

// ---------------------------------------------------------------------------
// The sequence behind export_subscriptions.id, and the four refusals
// that burn it
// ---------------------------------------------------------------------------

describe('the subscription id sequence', () => {
  it('hands the first subscription id 1', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const connector = await addConnector(store, 'notebook', ARCHIVE_NOTEBOOK);
    const inserted = await addSubscription(
      store,
      domain.id,
      OBSIDIAN,
      connector.id,
    );

    // Its own counter, and none of the other seven: the domain and
    // the connector above each hold id 1 as well.
    expect(inserted.id).toBe(1);
    expect(domain.id).toBe(1);
    expect(connector.id).toBe(1);
  });

  it('burns an id on a refused insert, as the sequence does', async () => {
    const store = createMemoryResearchStore();
    const { domain, notebook } = await seedSubscriptions(store, RADAR);

    await refusalFrom(
      () => addSubscription(store, domain.id, RSS, notebook.id),
    );

    const next = await addSubscription(store, domain.id, 'pdf', notebook.id);

    // 5 rather than 4: the three seeded rows took 1, 2 and 3, and the
    // refusal took the fourth. No measurement on this table of its
    // own — the reasoning is `personas`', where two refused inserts
    // between two accepted ones left a gap of two against the live
    // server.
    expect(next.id).toBe(5);
  });

  it('burns one on a CHECK refusal as well', async () => {
    const store = createMemoryResearchStore();
    const { domain, notebook } = await seedSubscriptions(store, RADAR);

    await refusalFrom(
      () => addSubscription(store, domain.id, 'telegram', notebook.id),
    );

    const next = await addSubscription(store, domain.id, 'pdf', notebook.id);

    expect(next.id).toBe(5);
  });

  it('burns one on each foreign key too', async () => {
    const store = createMemoryResearchStore();
    const { domain, notebook } = await seedSubscriptions(store, RADAR);

    // The counter advances ahead of EVERY check rather than ahead of
    // the key check alone, and this table has four to say it over.
    await refusalFrom(
      () => addSubscription(store, 404, OBSIDIAN, notebook.id),
    );
    await refusalFrom(() => addSubscription(store, domain.id, 'pdf', 404));

    const next = await addSubscription(store, domain.id, 'pdf', notebook.id);

    expect(next.id).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// The cascade that arrives, and the one it deliberately stops short of
// ---------------------------------------------------------------------------

describe('the domain cascade over its subscriptions', () => {
  it('takes the subscriptions of the domain it removes', async () => {
    const store = createMemoryResearchStore();
    const planted = await seedSubscriptions(store, RADAR);
    const { domain, digest, feed, archive } = planted;

    // `export_subscriptions.domain_id` is `ON DELETE CASCADE`, and
    // nothing in schema v2 points at `export_subscriptions`, so there
    // is no guard below this one to refuse it the way
    // `categories.parent_id` refuses a category delete.
    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await store.findSubscriptionById(digest.id)).toBeNull();
    expect(await store.findSubscriptionById(feed.id)).toBeNull();
    expect(await store.findSubscriptionById(archive.id)).toBeNull();
    expect(await store.countSubscriptions(domain.id)).toBe(0);
    expect(await store.listSubscriptions(domain.id, WHOLE_COLLECTION))
      .toStrictEqual([]);
  });

  it('leaves the connectors those rows named standing', async () => {
    const store = createMemoryResearchStore();
    const { domain, model, notebook } = await seedSubscriptions(store, RADAR);

    await store.deleteDomain(domain.id);

    // The cascade stops exactly where the schema stops it. The
    // `ON DELETE cascade` is on `domain_id`; `connector_id` carries
    // `ON DELETE no action` and points the other way, so a domain
    // delete clears subscriptions OUT of a connector's way rather
    // than taking the connector with them.
    expect(await store.countSubscriptions(domain.id)).toBe(0);
    expect(await store.countConnectors(EVERY_KIND)).toBe(3);
    expect(await readConnector(store, model.id)).toStrictEqual(model);
    expect(await readConnector(store, notebook.id)).toStrictEqual(notebook);
  });

  it('leaves a second domain subscriptions standing', async () => {
    const store = createMemoryResearchStore();
    const radar = await seedSubscriptions(store, RADAR);
    const transit = await store.insertDomain(domainInput(TRANSIT));
    const kept = await addSubscription(
      store,
      transit.id,
      RSS,
      radar.notebook.id,
    );

    await store.deleteDomain(radar.domain.id);

    expect(await store.countSubscriptions(transit.id)).toBe(1);
    expect(await readSubscription(store, kept.id)).toStrictEqual(kept);
  });

  it('takes the subscriptions and the topics together', async () => {
    const store = createMemoryResearchStore();
    const { domain, digest } = await seedSubscriptions(store, RADAR);
    const topic = await addTopic(store, domain.id, EDGE_INFERENCE);

    // Every foreign key onto `domains.id` cascades, so one delete
    // reaches the subscriptions and the topics in the same statement.
    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await store.findSubscriptionById(digest.id)).toBeNull();
    expect(await store.findTopicById(topic.id)).toBeNull();
  });

  it('is the only thing that removes one in bulk', async () => {
    const store = createMemoryResearchStore();
    const { domain, digest } = await seedSubscriptions(store, RADAR);

    // The other half of the cascade claim: a subscription goes when
    // its domain goes and at no other time, so deleting the taxonomy
    // under a domain leaves every subscription of it standing.
    const category = await addCategory(store, domain.id, PLATFORMS);

    expect(await store.deleteCategory(category.id)).toBe(true);
    expect(await readSubscription(store, digest.id)).toStrictEqual(digest);
    expect(await store.countSubscriptions(domain.id)).toBe(3);
  });

  it('frees the triples the deleted domain held', async () => {
    const store = createMemoryResearchStore();
    const { domain, notebook } = await seedSubscriptions(store, RADAR);

    await store.deleteDomain(domain.id);

    const rebuilt = await store.insertDomain(domainInput(RADAR));
    const accepted = await addSubscription(
      store,
      rebuilt.id,
      RSS,
      notebook.id,
    );

    expect(accepted.format).toBe(RSS);
    expect(await store.countSubscriptions(rebuilt.id)).toBe(1);
  });
});

describe('the connector delete a stored subscription does not hold', () => {
  it('leaves the planted dependent count to the seam', async () => {
    const store = createMemoryResearchStore();
    const { model, archive } = await seedSubscriptions(store, RADAR);

    // The SECOND place this file knowingly answers something a
    // deployment would not, pinned rather than left to be discovered:
    // `countConnectorDependents` reads what
    // `setConnectorSubscriptions` planted and never the rows this
    // half writes, so a stored subscription answers a counted zero
    // and its connector's delete lands.
    // `src/connectors/db-store.ts` counts the rows instead, and
    // `MemoryResearchStore.setConnectorSubscriptions` carries why the
    // two are not reconciled here.
    expect(archive.connectorId).toBe(model.id);
    expect(await store.countConnectorDependents(model.id))
      .toStrictEqual({ exportSubscriptions: 0 });
    expect(await store.deleteConnector(model.id)).toBe(true);

    // And the plant is what a case wanting the guard reaches for,
    // whether or not a subscription is stored. Without this the
    // assertions above would equally describe a guard that had
    // stopped reading the seam at all.
    const guarded = await addConnector(store, 'search', 'example-guarded');

    store.setConnectorSubscriptions(guarded.id, 1);

    const refusal = await refusalFrom(
      () => store.deleteConnector(guarded.id),
    );

    expect(refusal.constraint)
      .toBe('export_subscriptions_connector_id_connectors_id_fk');
  });

  it('leaves the subscription behind a deleted connector', async () => {
    const store = createMemoryResearchStore();
    const { model, archive } = await seedSubscriptions(store, RADAR);

    await store.deleteConnector(model.id);

    // The other face of the same divergence, and the reason it is
    // worth a case rather than a sentence: the row survives naming an
    // id nothing carries, which is a state a deployment's
    // `ON DELETE no action` makes unreachable. A later write to it
    // still meets the foreign-key guard, so the store is inconsistent
    // in exactly one direction and says so.
    expect(await readSubscription(store, archive.id)).toStrictEqual(archive);

    const refusal = await refusalFrom(
      () => store.updateSubscription(archive.id, { connectorId: model.id }),
    );

    expect(refusal.constraint)
      .toBe('export_subscriptions_connector_id_connectors_id_fk');
  });
});

// ---------------------------------------------------------------------------
// The one mutable member a subscription record carries
// ---------------------------------------------------------------------------

describe('the subscription due time crossing the boundary', () => {
  it('lands an unscheduled row, which is not an absent one', async () => {
    const store = createMemoryResearchStore();
    const { digest } = await seedSubscriptions(store, RADAR);

    // `InsertSubscriptionInput` declares no member that could set it,
    // so the null is the type's doing rather than a default. Read
    // back as well as answered, since a store echoing its argument
    // would answer null having stored anything at all.
    expect(digest.nextRunAt).toBeNull();
    expect((await readSubscription(store, digest.id)).nextRunAt).toBeNull();
  });

  it('does not store the Date object it was handed', async () => {
    const store = createMemoryResearchStore();
    const { digest } = await seedSubscriptions(store, RADAR);
    const due = new Date('2026-03-01T00:00:00.000Z');

    await store.updateSubscriptionSchedule(digest.id, due);

    // The copy on the way IN. A store holding this instance lets the
    // run-now that scheduled the subscription go on moving its due
    // time afterwards, through a member the port declares `readonly`.
    due.setTime(Date.parse('2030-06-01T00:00:00.000Z'));

    expect(dueFor(await readSubscription(store, digest.id)))
      .toBe(Date.parse('2026-03-01T00:00:00.000Z'));
  });

  it('answers a due time the write cannot be written through', async () => {
    const store = createMemoryResearchStore();
    const { digest } = await seedSubscriptions(store, RADAR);

    const written = await store.updateSubscriptionSchedule(
      digest.id,
      new Date('2026-03-01T00:00:00.000Z'),
    );

    if (written === null) {
      throw new Error('expected the schedule write to answer a row');
    }

    const scheduledAt = dueFor(written);

    written.nextRunAt?.setTime(0);

    // Against the primitive captured BEFORE the mutation: a store
    // handing its own `Date` out has aliased the two, and comparing
    // against `written.nextRunAt` would hold one lie against itself.
    expect(dueFor(await readSubscription(store, digest.id)))
      .toBe(scheduledAt);
  });

  it('answers a due time the read cannot be written through', async () => {
    const store = createMemoryResearchStore();
    const { digest } = await seedSubscriptions(store, RADAR);

    await store.updateSubscriptionSchedule(
      digest.id,
      new Date('2026-03-01T00:00:00.000Z'),
    );

    const read = await readSubscription(store, digest.id);
    const scheduledAt = dueFor(read);

    read.nextRunAt?.setTime(0);

    expect(dueFor(await readSubscription(store, digest.id)))
      .toBe(scheduledAt);
  });

  it('answers a due time the list cannot be written through', async () => {
    const store = createMemoryResearchStore();
    const { domain, digest } = await seedSubscriptions(store, RADAR);

    await store.updateSubscriptionSchedule(
      digest.id,
      new Date('2026-03-01T00:00:00.000Z'),
    );

    const page = await store.listSubscriptions(domain.id, WHOLE_COLLECTION);
    const [listed] = page.filter((row) => row.id === digest.id);

    if (listed === undefined) {
      throw new Error('expected the list to answer the scheduled row');
    }

    const scheduledAt = dueFor(listed);

    listed.nextRunAt?.setTime(0);

    expect(dueFor(await readSubscription(store, digest.id)))
      .toBe(scheduledAt);
  });

  it('answers a fresh Date on every read', async () => {
    const store = createMemoryResearchStore();
    const { digest } = await seedSubscriptions(store, RADAR);

    await store.updateSubscriptionSchedule(
      digest.id,
      new Date('2026-03-01T00:00:00.000Z'),
    );

    const first = await readSubscription(store, digest.id);
    const second = await readSubscription(store, digest.id);

    expect(first.nextRunAt).not.toBe(second.nextRunAt);
    expect(dueFor(first)).toBe(dueFor(second));
  });

  it('keeps a null a null across every answer', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedSubscriptions(store, RADAR);

    // The branch the copy needs and the three answer sites it has to
    // survive: a subscription nobody has run now is unscheduled, and
    // a copy reaching for the instant unconditionally would throw
    // here rather than answer.
    const patched = await store.updateSubscription(feed.id, {
      intervalSeconds: 900,
    });
    const page = await store.listSubscriptions(domain.id, WHOLE_COLLECTION);

    expect(patched?.nextRunAt).toBeNull();
    expect((await readSubscription(store, feed.id)).nextRunAt).toBeNull();
    expect(page.filter((row) => row.nextRunAt !== null)).toStrictEqual([]);
  });
});

// ---------------------------------------------------------------------------
// What a page of subscriptions answers, and what scopes it
// ---------------------------------------------------------------------------

describe('the subscription list', () => {
  it('orders by format, then by connector within it', async () => {
    const store = createMemoryResearchStore();
    const planted = await seedSubscriptions(store, RADAR);
    const { domain, model, notebook } = planted;

    const page = await store.listSubscriptions(domain.id, WHOLE_COLLECTION);

    // The natural key per row rather than two single-column lists,
    // which would leave the pairing itself unasserted. The fixture is
    // written so the right order is wrong under every single-column
    // reading: `feed` goes in first and sorts LAST, and the two
    // `obsidian_md` rows are separated by the connector alone.
    expect(page.map(tripleOf)).toStrictEqual([
      `${OBSIDIAN}/${notebook.id}`,
      `${OBSIDIAN}/${model.id}`,
      `${RSS}/${notebook.id}`,
    ]);
    expect(page.map((row) => row.id))
      .toStrictEqual([planted.digest.id, planted.archive.id, planted.feed.id]);
  });

  it('reads only the window it was given', async () => {
    const store = createMemoryResearchStore();
    const { domain, model } = await seedSubscriptions(store, RADAR);

    const page = await store.listSubscriptions(domain.id, {
      limit: 1,
      offset: 1,
    });

    expect(page.map(tripleOf)).toStrictEqual([`${OBSIDIAN}/${model.id}`]);
    expect(await store.countSubscriptions(domain.id)).toBe(3);
  });

  it('answers an empty window past the end', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedSubscriptions(store, RADAR);

    expect(await store.listSubscriptions(domain.id, { limit: 50, offset: 50 }))
      .toStrictEqual([]);
  });

  it('lists only the subscriptions of the domain asked about', async () => {
    const store = createMemoryResearchStore();
    const radar = await seedSubscriptions(store, RADAR);
    const transit = await store.insertDomain(domainInput(TRANSIT));

    await addSubscription(store, transit.id, RSS, radar.model.id);

    const page = await store.listSubscriptions(
      radar.domain.id,
      WHOLE_COLLECTION,
    );

    expect(page.map((row) => row.id))
      .toStrictEqual([radar.digest.id, radar.archive.id, radar.feed.id]);
    expect(await store.countSubscriptions(transit.id)).toBe(1);
  });

  it('answers an empty list for a domain subscribing to none', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    expect(await store.listSubscriptions(domain.id, WHOLE_COLLECTION))
      .toStrictEqual([]);
    expect(await store.countSubscriptions(domain.id)).toBe(0);
  });

  it('answers zero for an id no domain carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.countSubscriptions(404)).toBe(0);
    expect(await store.listSubscriptions(404, WHOLE_COLLECTION))
      .toStrictEqual([]);
  });

  it('answers rows a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedSubscriptions(store, RADAR);

    const [listed] = await store.listSubscriptions(domain.id, WHOLE_COLLECTION);

    if (listed === undefined) {
      throw new Error('expected the list to answer a row');
    }

    (listed as { format: string }).format = 'written through the list';

    // Against the constants rather than against the records the
    // writes answered: a store handing its own objects out has
    // ALIASED the two, and the comparison then holds one lie against
    // itself and passes.
    const reread = await store.listSubscriptions(domain.id, WHOLE_COLLECTION);

    expect(reread.map((row) => row.format))
      .toStrictEqual([OBSIDIAN, OBSIDIAN, RSS]);
  });
});

describe('the single subscription read', () => {
  it('answers null for an id no subscription carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.findSubscriptionById(404)).toBeNull();
  });

  it('answers a row a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { digest } = await seedSubscriptions(store, RADAR);
    const interval = digest.intervalSeconds;

    const read = await readSubscription(store, digest.id);

    (read as { intervalSeconds: number }).intervalSeconds = 1;

    // Against a primitive read BEFORE the mutation: comparing
    // against `digest.intervalSeconds` would compare one lie against
    // itself, since a store handing its own objects out aliased the
    // two.
    expect((await readSubscription(store, digest.id)).intervalSeconds)
      .toBe(interval);
  });
});

// ---------------------------------------------------------------------------
// The three subscription writes that are not the insert
// ---------------------------------------------------------------------------

describe('the subscription patch', () => {
  it('rewrites the members it names and leaves the rest', async () => {
    const store = createMemoryResearchStore();
    const { notebook, digest } = await seedSubscriptions(store, RADAR);

    const patched = await store.updateSubscription(digest.id, {
      intervalSeconds: 900,
      enabled: false,
    });

    expect(patched?.intervalSeconds).toBe(900);
    expect(patched?.enabled).toBe(false);
    expect(patched?.format).toBe(OBSIDIAN);
    expect(patched?.connectorId).toBe(notebook.id);
  });

  it('clears a bound with a null and leaves it alone when absent', async () => {
    const store = createMemoryResearchStore();
    const { domain, model } = await seedSubscriptions(store, RADAR);
    const bounded = await addSubscription(store, domain.id, 'pdf', model.id, {
      minIntervalSeconds: 300,
      maxIntervalSeconds: 86400,
    });

    // The three requests a nullable member distinguishes: absent
    // leaves the ceiling alone, an explicit null clears the floor. A
    // store reaching for `??` collapses the two and makes removing a
    // floor unexpressible.
    const patched = await store.updateSubscription(bounded.id, {
      minIntervalSeconds: null,
    });

    expect(patched?.minIntervalSeconds).toBeNull();
    expect(patched?.maxIntervalSeconds).toBe(86400);

    const lowered = await store.updateSubscription(bounded.id, {
      maxIntervalSeconds: 43200,
    });

    expect(lowered?.maxIntervalSeconds).toBe(43200);
    expect(lowered?.minIntervalSeconds).toBeNull();
  });

  it('writes a false enabled rather than ignoring it', async () => {
    const store = createMemoryResearchStore();
    const { digest } = await seedSubscriptions(store, RADAR);

    // `enabled` is NOT NULL and defaults true, so `false` is a value
    // being written rather than a member being left alone. This is
    // the column for suspending a delivery; cancelling it is the
    // delete, and a run-now is neither.
    await store.updateSubscription(digest.id, { enabled: false });

    expect((await readSubscription(store, digest.id)).enabled).toBe(false);
  });

  it('answers the stored row for a patch naming no member', async () => {
    const store = createMemoryResearchStore();
    const { digest } = await seedSubscriptions(store, RADAR);

    // `export_subscriptions` carries no `updated_at`, so an empty
    // patch has literally nothing to set and drizzle throws `No
    // values to set` on an empty update list. The port decides the
    // answer rather than leaving its two implementations to disagree.
    expect(await store.updateSubscription(digest.id, {}))
      .toStrictEqual(digest);
  });

  it('cannot reach the due time whatever it is handed', async () => {
    const store = createMemoryResearchStore();
    const { digest } = await seedSubscriptions(store, RADAR);

    // `SubscriptionPatch` declares no `nextRunAt`, so the containment
    // is the type's; the cast is what lets a case ask what happens
    // when one arrives anyway, which is the reading a route's
    // `.strict()` schema cannot give from inside `src/`.
    const patched = await store.updateSubscription(
      digest.id,
      { nextRunAt: new Date('2026-03-01T00:00:00.000Z') } as SubscriptionPatch,
    );

    expect(patched?.nextRunAt).toBeNull();
    expect((await readSubscription(store, digest.id)).nextRunAt).toBeNull();
  });

  it('answers null from a patch naming no stored row', async () => {
    const store = createMemoryResearchStore();

    expect(await store.updateSubscription(404, { enabled: false })).toBeNull();
  });

  it('answers a row a caller cannot write into', async () => {
    const store = createMemoryResearchStore();
    const { digest } = await seedSubscriptions(store, RADAR);

    const patched = await store.updateSubscription(digest.id, {
      intervalSeconds: 900,
    });

    if (patched === null) {
      throw new Error('expected the patch to answer a row');
    }

    (patched as { intervalSeconds: number }).intervalSeconds = 1;

    expect((await readSubscription(store, digest.id)).intervalSeconds)
      .toBe(900);
  });
});

describe('the subscription schedule write', () => {
  it('writes the instant it is handed and nothing else', async () => {
    const store = createMemoryResearchStore();
    const { digest } = await seedSubscriptions(store, RADAR);
    const due = new Date('2026-03-01T00:00:00.000Z');

    const written = await store.updateSubscriptionSchedule(digest.id, due);

    // The whole record against the row before the call, with only
    // the due time permitted to differ: the port says this method
    // writes one column, and asserting the column alone would pass
    // against a store that also re-pointed the connector.
    expect(written).toStrictEqual({ ...digest, nextRunAt: due });
  });

  it('takes no view of the instant it is handed', async () => {
    const store = createMemoryResearchStore();
    const { domain, model } = await seedSubscriptions(store, RADAR);
    const row = await addSubscription(store, domain.id, 'pdf', model.id, {
      enabled: false,
      minIntervalSeconds: 300,
      maxIntervalSeconds: 900,
    });
    const past = new Date('2020-01-01T00:00:00.000Z');

    // A time in the past on a DISABLED row: no clamp, no clock and
    // no reading of `enabled`. All three are decisions
    // `src/subscriptions/service.ts` takes, and a store taking them
    // would move a rule into the half that needs a database.
    const written = await store.updateSubscriptionSchedule(row.id, past);

    expect(written?.nextRunAt?.toISOString())
      .toBe('2020-01-01T00:00:00.000Z');
    expect(written?.enabled).toBe(false);
  });

  it('moves a due time that is already set', async () => {
    const store = createMemoryResearchStore();
    const { digest } = await seedSubscriptions(store, RADAR);

    await store.updateSubscriptionSchedule(
      digest.id,
      new Date('2026-03-01T00:00:00.000Z'),
    );
    await store.updateSubscriptionSchedule(
      digest.id,
      new Date('2026-03-08T00:00:00.000Z'),
    );

    expect((await readSubscription(store, digest.id)).nextRunAt?.toISOString())
      .toBe('2026-03-08T00:00:00.000Z');
  });

  it('answers null for an id no subscription carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.updateSubscriptionSchedule(404, new Date()))
      .toBeNull();
  });
});

describe('the subscription delete', () => {
  it('removes one and leaves its domain standing', async () => {
    const store = createMemoryResearchStore();
    const planted = await seedSubscriptions(store, RADAR);
    const { domain, digest, feed } = planted;

    expect(await store.deleteSubscription(digest.id)).toBe(true);
    expect(await store.findSubscriptionById(digest.id)).toBeNull();
    expect(await readSubscription(store, feed.id)).toStrictEqual(feed);
    expect(await readDomain(store, RADAR)).toStrictEqual(domain);
  });

  it('answers false for an id no subscription carries', async () => {
    const store = createMemoryResearchStore();

    expect(await store.deleteSubscription(404)).toBe(false);
  });

  it('cannot be refused, unlike the connector delete', async () => {
    const store = createMemoryResearchStore();
    const { domain, model, digest } = await seedSubscriptions(store, RADAR);

    store.setConnectorSubscriptions(model.id, 1);

    // Nothing in schema v2 points at `export_subscriptions`, so there
    // is no guard to run into and no state a subscription can be in
    // that holds its delete. The connector beside it IS refused,
    // under the very rule this one has no counterpart of — which is
    // what says the acceptance above is a fact about the table rather
    // than a store that refuses nothing.
    expect(await store.deleteSubscription(digest.id)).toBe(true);
    expect(await store.countSubscriptions(domain.id)).toBe(2);

    const refusal = await refusalFrom(() => store.deleteConnector(model.id));

    expect(refusal.constraint)
      .toBe('export_subscriptions_connector_id_connectors_id_fk');
  });
});

// ---------------------------------------------------------------------------
// The one row the database pins, before it exists and after
// ---------------------------------------------------------------------------

describe('the settings read before any write', () => {
  it('answers null, which a payload written empty is not', async () => {
    const store = createMemoryResearchStore();

    expect(await store.readSettings()).toBeNull();

    // The positive control, in this body rather than in a sibling
    // case, and the whole of what the null is worth: a store
    // answering null for everything passes the assertion above, and
    // an empty payload is a DIFFERENT answer — a row that was
    // written carrying no members. `src/settings/service.ts` is
    // where both become `{}` for a reader of the configuration.
    await store.writeSettings({});

    expect(await store.readSettings()).toStrictEqual({});
  });

  it('is not created by a write to any other table', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedLexicon(store, RADAR);

    await addPersona(store, domain.id, SCORER);

    // `operator_settings` hangs off nothing and is nobody's side
    // effect: the row exists because an operator wrote it, and the
    // four writes above reach four other tables.
    expect(await store.readSettings()).toBeNull();
  });
});

describe('the first settings write', () => {
  it('answers the payload it was handed', async () => {
    const store = createMemoryResearchStore();

    const written = await store.writeSettings(operatorInput());

    expect(written).toStrictEqual({
      defaultDomainSlug: RADAR,
      digestFormat: 'obsidian_md',
      notificationChannels: { email: true, webhook: false },
    });
  });

  it('stores what a later read answers', async () => {
    const store = createMemoryResearchStore();

    await store.writeSettings(operatorInput());

    // Against a literal rather than against what the write answered:
    // a store that lies CONSISTENTLY answers its own lie back, and
    // the comparison would then hold one against itself.
    expect(await readSettings(store)).toStrictEqual({
      defaultDomainSlug: RADAR,
      digestFormat: 'obsidian_md',
      notificationChannels: { email: true, webhook: false },
    });
  });

  it('needs no row written before it', async () => {
    const store = createMemoryResearchStore();

    // A first write and a rewrite are ONE call: there is nothing an
    // operator has to create first, which is what lets the route be
    // a single `PUT` rather than a read the caller branches on.
    // The drizzle half gets there by upserting on the singleton id.
    expect(await store.readSettings()).toBeNull();
    expect(await store.writeSettings(operatorRewrite()))
      .toStrictEqual({ digestFormat: 'rss' });
  });
});

describe('a settings rewrite', () => {
  it('answers the replacing payload whole rather than merged', async () => {
    const store = createMemoryResearchStore();

    await store.writeSettings(operatorInput());

    const rewritten = await store.writeSettings(operatorRewrite());

    expect(rewritten).toStrictEqual({ digestFormat: 'rss' });
  });

  it('stores the replacing payload whole rather than merged', async () => {
    const store = createMemoryResearchStore();

    await store.writeSettings(operatorInput());
    await store.writeSettings(operatorRewrite());

    // One payload afterwards rather than two: the port declares no
    // count and no list, so this read is the whole of what `exactly
    // one` can be asked here — and under a merge it answers the
    // two members the replacement does not carry.
    expect(await readSettings(store)).toStrictEqual({ digestFormat: 'rss' });
  });

  it('clears every member when the rewrite carries none', async () => {
    const store = createMemoryResearchStore();

    await store.writeSettings(operatorInput());
    await store.writeSettings({});

    // The maximal narrowing, and the case a merge cannot survive at
    // all: omitting a preference is how it is removed, so a store
    // merging into the stored payload would leave every member of
    // it standing and make removal unexpressible.
    expect(await readSettings(store)).toStrictEqual({});
  });
});

// ---------------------------------------------------------------------------
// The payload crossing the boundary, and the delete that spares it
// ---------------------------------------------------------------------------

describe('the operator settings crossing the boundary', () => {
  it('does not store the object it was handed', async () => {
    const store = createMemoryResearchStore();
    const submitted = operatorInput();

    await store.writeSettings(submitted);

    channelsOf(submitted).email = false;

    // Against a literal rather than against the record the write
    // answered: a store holding the caller's object has aliased the
    // two, and the comparison would hold one lie against itself.
    expect((await readSettings(store)).notificationChannels)
      .toStrictEqual({ email: true, webhook: false });
  });

  it('does not answer the object a write stored', async () => {
    const store = createMemoryResearchStore();

    const written = await store.writeSettings(operatorInput());

    channelsOf(written).email = false;

    expect((await readSettings(store)).notificationChannels)
      .toStrictEqual({ email: true, webhook: false });
  });

  it('does not answer the object a read handed out', async () => {
    const store = createMemoryResearchStore();

    await store.writeSettings(operatorInput());

    channelsOf(await readSettings(store)).email = false;

    // The third answer site, and the one a write-only copy would
    // leave open: a store copying on the way in and out of a write
    // still aliases every reader to one another through the read.
    expect((await readSettings(store)).notificationChannels)
      .toStrictEqual({ email: true, webhook: false });
  });
});

describe('the settings a domain delete leaves standing', () => {
  it('keeps a defaultDomainSlug the delete left dangling', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    await store.writeSettings(operatorInput());

    expect(await store.deleteDomain(domain.id)).toBe(true);

    // No `domain_id` and no foreign key reaches this table, so the
    // cascade that took the domain reaches nothing here — and
    // the slug is left naming a domain that has gone. That is not
    // corruption and nothing repairs it: `src/settings/store.ts`
    // carries why it reads as no default being set.
    expect(await readSettings(store)).toStrictEqual({
      defaultDomainSlug: RADAR,
      digestFormat: 'obsidian_md',
      notificationChannels: { email: true, webhook: false },
    });
    expect(await store.findDomainBySlug(RADAR)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The findings half's fixture
// ---------------------------------------------------------------------------

/**
 * The four instants the findings fixture is made across, oldest
 * first and one day apart.
 *
 * SPELLED OUT RATHER THAN DERIVED FROM ONE ANOTHER, so that a case
 * asserting a half-open window compares against a stamp no arithmetic
 * of the store's could have produced.
 */
const MADE_T0 = '2026-03-01T09:00:00.000Z';
const MADE_T1 = '2026-03-02T09:00:00.000Z';
const MADE_T2 = '2026-03-03T09:00:00.000Z';
const MADE_T3 = '2026-03-04T09:00:00.000Z';

/**
 * The five findings the fixture plants, named for what each is in
 * the two orderings rather than for its id.
 *
 * The ids are the fixture's own rather than a sequence's: nothing on
 * `FindingStore` inserts a finding, so a case says which row it means
 * and the store never chooses. `HIGH_FIRST` and `HIGH_SECOND` carry
 * one score and one stamp, so only `id` separates them and only
 * descending puts the later insert first.
 */
const NO_SCORE = 11;
const HIGH_FIRST = 12;
const MIDDLE_SCORE = 13;
const HIGH_SECOND = 14;
const ZERO_SCORE = 15;

/**
 * Two entity ids, neither of which names anything.
 *
 * No port here stores an entity, so an id is the whole of what a
 * finding can be attributed to and the whole of what research can be
 * planted under. `EntityStore` is a later task; until then this is
 * the honest shape rather than a placeholder.
 */
const SUBJECT = 71;
const OTHER_SUBJECT = 72;

/**
 * A category key the fixture files a finding under and no domain
 * declares.
 */
const RETIRED = 'retired-key';

/**
 * A window with neither bound.
 *
 * ANNOTATED RATHER THAN INFERRED, and read by two halves: the
 * findings page below and the spend summary at the foot. Without the
 * annotation the type is the literal `{ sinceInclusive: null }` pair,
 * so a helper defaulting to it takes a parameter no BOUNDED window
 * can be handed — which reads as a bad argument rather than as a
 * missing annotation.
 */
const EVERY_INSTANT: TimeWindow = {
  sinceInclusive: null,
  untilExclusive: null,
};

/**
 * The filter that narrows nothing, on the terms {@link EVERY_KIND}
 * states.
 */
const EVERY_FINDING: FindingFilter = { window: EVERY_INSTANT };

/** What {@link madeFinding} defaults when a case is not about it. */
type FindingDefaults = Partial<Omit<MemoryDomainFinding, 'id'>>;

/**
 * Builds one row for {@link MemoryResearchStore.setDomainFindings}.
 *
 * A function rather than a constant, for the reason {@link planted}
 * is one: the copy cases WRITE into the `fields` and the `createdAt`
 * they planted, which is the whole point of them.
 *
 * @param id - The finding id, which is the last key of both
 *   orderings and the id a ruling is appended against.
 * @param values - The six members a case may care about. `score`
 *   defaults to null, which is the side of the ordering a store
 *   sorting absence lowest gets wrong.
 * @returns The row to plant.
 */
function madeFinding(
  id: number,
  values: FindingDefaults = {},
): MemoryDomainFinding {
  return {
    documentId: values.documentId ?? id,
    entityId: values.entityId ?? null,
    fields: values.fields ?? {},
    id,
    score: values.score ?? null,
    scoreVersion: values.scoreVersion ?? null,
    createdAt: values.createdAt ?? new Date(MADE_T0),
  };
}

/**
 * A domain carrying the five findings every ordering, filter and
 * window case reads.
 *
 * PLANTED IN AN ORDER NO READ ANSWERS, which is what lets one fixture
 * tell the score ordering from the recency one, and both of those
 * from an ordering by insertion or by id in either direction. The
 * four answers are written out in the cases rather than here.
 *
 * @param store - The store to write to.
 * @returns The domain the findings hang off.
 */
async function seedFindings(
  store: MemoryResearchStore,
): Promise<DomainRecord> {
  const domain = await store.insertDomain(domainInput(RADAR));

  store.setDomainFindings(domain.id, [
    madeFinding(HIGH_FIRST, {
      createdAt: new Date(MADE_T1),
      entityId: SUBJECT,
      fields: { category: RUNTIMES },
      score: 0.9,
    }),
    madeFinding(MIDDLE_SCORE, {
      createdAt: new Date(MADE_T2),
      fields: { category: PLATFORMS },
      score: 0.2,
    }),
    madeFinding(ZERO_SCORE, {
      createdAt: new Date(MADE_T0),
      entityId: OTHER_SUBJECT,
      fields: { category: RETIRED },
      score: 0,
    }),
    madeFinding(NO_SCORE, { createdAt: new Date(MADE_T3) }),
    madeFinding(HIGH_SECOND, {
      createdAt: new Date(MADE_T1),
      entityId: SUBJECT,
      fields: { category: PLATFORMS },
      score: 0.9,
    }),
  ]);

  return domain;
}

/**
 * @param rows - A page of findings.
 * @returns Their ids in the order they arrived, which is what every
 *   ordering case compares rather than the rows themselves.
 */
function findingIds(rows: readonly FindingRecord[]): number[] {
  return rows.map((row) => row.id);
}

/**
 * Reads one window of a domain's findings under a filter.
 *
 * @param store - The store to read.
 * @param domainId - The domain to read within.
 * @param filter - What to narrow to.
 * @param sort - Which ordering to answer in, `score` by default so
 *   that a case about a filter says nothing about an order.
 * @returns The ids on the first page.
 */
async function pageOf(
  store: MemoryResearchStore,
  domainId: number,
  filter: FindingFilter = EVERY_FINDING,
  sort: FindingSort = 'score',
): Promise<number[]> {
  const page = await store.listFindings(
    domainId,
    filter,
    sort,
    WHOLE_COLLECTION,
  );

  return findingIds(page);
}

/**
 * Reads a finding that must be there.
 *
 * @param store - The store to read.
 * @param id - The id to read under.
 * @returns The row.
 * @throws When no finding carries the id, for the reason
 *   {@link readDomain} throws: two absences otherwise compare equal.
 */
async function readFinding(
  store: MemoryResearchStore,
  id: number,
): Promise<FindingRecord> {
  const row = await store.findFindingById(id);

  if (row === null) {
    throw new Error(`expected a stored finding under ${id}`);
  }

  return row;
}

/**
 * Appends one ruling, defaulting the note a case is not about.
 *
 * @param store - The store to write to.
 * @param findingId - The finding being judged.
 * @param verdict - The ruling, stored as submitted: no vocabulary is
 *   consulted below the service.
 * @param note - What the operator wanted to say, null by default
 *   because null is what a ruling with nothing recorded carries.
 * @returns The stored label.
 */
async function judge(
  store: MemoryResearchStore,
  findingId: number,
  verdict: string,
  note: string | null = null,
): Promise<FindingLabelRecord> {
  return store.insertFindingLabel({ findingId, note, verdict });
}

/** Three verdicts, in the same neutral register as the taxonomy keys. */
const KEEP = 'keep';
const DROP = 'drop';
const HOLD = 'hold';

// ---------------------------------------------------------------------------
// The one key this half can refuse on
// ---------------------------------------------------------------------------

describe('the finding label foreign key', () => {
  it('refuses a ruling appended onto a finding nothing carries', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);

    const refusal = await refusalFrom(
      () => judge(store, 9999, KEEP),
    );

    expect(refusal).toBeInstanceOf(StoreRefusal);
    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe(
      'finding_labels_finding_id_findings_id_fk',
    );

    // The positive control, in this body rather than in a sibling
    // case: a store refusing every append passes the assertion
    // above. The same call over a finding that IS there lands.
    const stored = await judge(store, NO_SCORE, KEEP);

    expect(stored.findingId).toBe(NO_SCORE);
    expect(await pageOf(store, domain.id)).toHaveLength(5);
  });

  it('burns an id on the append it refused', async () => {
    const store = createMemoryResearchStore();

    await seedFindings(store);

    const first = await judge(store, NO_SCORE, KEEP);

    await refusalFrom(() => judge(store, 9999, DROP));

    const second = await judge(store, NO_SCORE, DROP);

    // The counter is read while the row is being formed and the
    // foreign key is checked afterwards, so a refused append leaves
    // the id it took unused. Measured on `personas`, over a key
    // refusal and a foreign-key one; this table carries only the
    // second of that pair.
    expect(first.id).toBe(1);
    expect(second.id).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// The two orderings, and the tail an absent score sorts into
// ---------------------------------------------------------------------------

describe('the findings page ordering', () => {
  it('orders by score, then by stamp, then by id descending', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);

    // Neither the order the rows were planted in
    // (12, 13, 15, 11, 14) nor either direction of id. The tied
    // pair is planted with the LOWER id first, so a stable sort
    // that lost the tiebreak answers them the wrong way round
    // rather than reproducing this order by accident.
    const page = await pageOf(store, domain.id, EVERY_FINDING, 'score');

    expect(page).toStrictEqual(
      [HIGH_SECOND, HIGH_FIRST, MIDDLE_SCORE, ZERO_SCORE, NO_SCORE],
    );
  });

  it('orders by recency with the score key dropped', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);

    // The same three keys with the first removed rather than a
    // second rule: the unscored finding leads because it is the
    // newest, and the tie the two high scores share still falls to
    // id descending.
    expect(
      await pageOf(store, domain.id, EVERY_FINDING, 'recency'),
    ).toStrictEqual(
      [NO_SCORE, MIDDLE_SCORE, HIGH_SECOND, HIGH_FIRST, ZERO_SCORE],
    );
  });

  it('sorts an absent score behind a zero one', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);
    const byScore = await pageOf(store, domain.id, EVERY_FINDING, 'score');

    // A store reading a null score as zero ties these two on the
    // first key and falls through to the stamp, which would put the
    // unscored finding FIRST of the pair: it is the newest row in
    // the fixture and the zero-scored one is the oldest. The
    // recency page in the same body is what says the two stamps
    // genuinely run that way.
    expect(byScore.indexOf(ZERO_SCORE)).toBeLessThan(
      byScore.indexOf(NO_SCORE),
    );

    const byRecency = await pageOf(
      store,
      domain.id,
      EVERY_FINDING,
      'recency',
    );

    expect(byRecency.indexOf(NO_SCORE)).toBeLessThan(
      byRecency.indexOf(ZERO_SCORE),
    );
  });

  it('separates two findings tied on score and stamp by id', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);
    const high = await Promise.all([
      readFinding(store, HIGH_FIRST),
      readFinding(store, HIGH_SECOND),
    ]);

    // The tie is real rather than assumed: both rows carry one
    // score and one instant, so `id` descending is the only thing
    // ordering them and the later insert leads.
    expect(high.map((row) => row.score)).toStrictEqual([0.9, 0.9]);
    expect(high.map((row) => row.createdAt.getTime())).toStrictEqual(
      [Date.UTC(2026, 2, 2, 9), Date.UTC(2026, 2, 2, 9)],
    );

    const page = await pageOf(store, domain.id);

    expect(page.indexOf(HIGH_SECOND)).toBeLessThan(page.indexOf(HIGH_FIRST));
  });
});

// ---------------------------------------------------------------------------
// The window over the page, and the count beside it
// ---------------------------------------------------------------------------

describe('the findings page window', () => {
  it('answers one window of the ordered page', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);

    const page = await store.listFindings(
      domain.id,
      EVERY_FINDING,
      'score',
      { limit: 2, offset: 1 },
    );

    // The window is taken from the ORDERED collection rather than
    // from the planted list, so the second and third of the score
    // order arrive rather than the second and third row planted.
    expect(findingIds(page)).toStrictEqual([HIGH_FIRST, MIDDLE_SCORE]);
  });

  it('answers an empty page past the end and counts the whole', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);

    const page = await store.listFindings(
      domain.id,
      EVERY_FINDING,
      'score',
      { limit: 50, offset: 50 },
    );

    expect(page).toStrictEqual([]);

    // The count ignores the window, which is what a page's
    // `meta.total` is read for: a window past the end still
    // describes a collection of five.
    expect(await store.countFindings(domain.id, EVERY_FINDING)).toBe(5);
  });

  it('answers nothing for a domain that has made none', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);
    const other = await store.insertDomain(domainInput(TRANSIT));

    expect(await pageOf(store, other.id)).toStrictEqual([]);
    expect(await store.countFindings(other.id, EVERY_FINDING)).toBe(0);

    // The control: the page is scoped rather than empty for
    // everyone, and an id no domain carries answers the same way a
    // domain holding nothing does.
    expect(await pageOf(store, domain.id)).toHaveLength(5);
    expect(await pageOf(store, 9999)).toStrictEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The verdict a finding stands under, and the ruling that replaced it
// ---------------------------------------------------------------------------

describe('the findings verdict filter', () => {
  it('answers the findings whose latest ruling carries it', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);

    await judge(store, MIDDLE_SCORE, KEEP);
    await judge(store, HIGH_FIRST, KEEP);
    await judge(store, ZERO_SCORE, DROP);

    const kept = { ...EVERY_FINDING, verdict: KEEP };

    // Ordered by the score keys inside the filter rather than by
    // the order the rulings were written.
    expect(await pageOf(store, domain.id, kept)).toStrictEqual(
      [HIGH_FIRST, MIDDLE_SCORE],
    );
    expect(await store.countFindings(domain.id, kept)).toBe(2);
  });

  it('drops a finding re-judged away from the verdict', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);

    await judge(store, HIGH_FIRST, KEEP);
    await judge(store, HIGH_SECOND, KEEP);
    await judge(store, HIGH_FIRST, DROP);

    const kept = { ...EVERY_FINDING, verdict: KEEP };
    const dropped = { ...EVERY_FINDING, verdict: DROP };

    // The LATEST and not any: the first ruling is still stored and
    // still readable, and it no longer selects the row. A store
    // matching any label answers both findings here.
    expect(await pageOf(store, domain.id, kept)).toStrictEqual(
      [HIGH_SECOND],
    );
    expect(await pageOf(store, domain.id, dropped)).toStrictEqual(
      [HIGH_FIRST],
    );
    expect(await store.listFindingLabels(HIGH_FIRST)).toHaveLength(2);
  });

  it('leaves a finding nobody has judged out of every verdict', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);

    await judge(store, HIGH_FIRST, KEEP);

    const unjudged = [NO_SCORE, MIDDLE_SCORE, HIGH_SECOND, ZERO_SCORE];

    for (const verdict of [KEEP, DROP, HOLD]) {
      const page = await pageOf(store, domain.id, {
        ...EVERY_FINDING,
        verdict,
      });

      for (const id of unjudged) {
        expect(page).not.toContain(id);
      }
    }

    // The control: the loop above is satisfied by a store answering
    // an empty page for every verdict, and this is the one finding
    // that HAS been judged.
    expect(
      await pageOf(store, domain.id, { ...EVERY_FINDING, verdict: KEEP }),
    ).toStrictEqual([HIGH_FIRST]);
  });

  it('answers an empty page for a verdict no label carries', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);

    await judge(store, HIGH_FIRST, KEEP);

    const held = { ...EVERY_FINDING, verdict: HOLD };

    // An empty page rather than a refusal: a verdict may be one the
    // domain has since retired, which rows stored under it still
    // answer to, so nothing here failed to read.
    expect(await pageOf(store, domain.id, held)).toStrictEqual([]);
    expect(await store.countFindings(domain.id, held)).toBe(0);
    expect(await store.countFindings(domain.id, EVERY_FINDING)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// The category a finding is filed under, which is a member and not a column
// ---------------------------------------------------------------------------

describe('the findings category filter', () => {
  it('answers the findings filed under one key', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);
    const platforms = { ...EVERY_FINDING, category: PLATFORMS };

    expect(await pageOf(store, domain.id, platforms)).toStrictEqual(
      [HIGH_SECOND, MIDDLE_SCORE],
    );
    expect(await store.countFindings(domain.id, platforms)).toBe(2);

    // The control: the filter narrows rather than answering
    // everything, and a second key answers a different row.
    expect(
      await pageOf(store, domain.id, { ...EVERY_FINDING, category: RUNTIMES }),
    ).toStrictEqual([HIGH_FIRST]);
  });

  it('answers an empty page for a key nothing is filed under', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);

    await addCategory(store, domain.id, TOOLING);

    const tooling = { ...EVERY_FINDING, category: TOOLING };

    // A key the domain DECLARED and nothing carries, and a key the
    // domain never declared that a finding IS filed under, answer
    // the same way: an empty page and a page of one. No column
    // links a finding to a category, so the taxonomy in force at
    // the moment of the request decides neither.
    expect(await pageOf(store, domain.id, tooling)).toStrictEqual([]);
    expect(
      await pageOf(store, domain.id, { ...EVERY_FINDING, category: RETIRED }),
    ).toStrictEqual([ZERO_SCORE]);
  });

  it('files by a stored member and not an inherited one', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const inherited: Record<string, unknown> = Object.assign(
      Object.create({ category: PLATFORMS }) as Record<string, unknown>,
      { topic: RUNTIMES },
    );

    store.setDomainFindings(domain.id, [
      madeFinding(NO_SCORE, { fields: inherited }),
      madeFinding(HIGH_FIRST, { fields: { category: PLATFORMS } }),
    ]);

    const platforms = { ...EVERY_FINDING, category: PLATFORMS };

    // The seam stores what a `jsonb` column would: own members and
    // nothing else. So the inherited key is gone before any filter
    // reads one, and the sibling in the same body is what says the
    // filter still finds a member that WAS stored.
    expect(await pageOf(store, domain.id, platforms)).toStrictEqual(
      [HIGH_FIRST],
    );

    const stored = await readFinding(store, NO_SCORE);

    expect(stored.fields).toStrictEqual({ topic: RUNTIMES });
  });

  it('matches a numeric member by the text the column answers', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    store.setDomainFindings(domain.id, [
      madeFinding(NO_SCORE, { fields: { category: 5 } }),
      madeFinding(HIGH_FIRST, { fields: { category: PLATFORMS } }),
    ]);

    // `fields->>'category'` answers TEXT rather than a string
    // member, so a numeric 5 is matched by '5' and a store
    // comparing only strings answers an empty page where a
    // deployment answers a row. The sibling in the same body is the
    // control that the filter has not simply widened to everything.
    expect(
      await pageOf(store, domain.id, { ...EVERY_FINDING, category: '5' }),
    ).toStrictEqual([NO_SCORE]);

    const platforms = { ...EVERY_FINDING, category: PLATFORMS };

    expect(await pageOf(store, domain.id, platforms)).toStrictEqual(
      [HIGH_FIRST],
    );
  });
});

// ---------------------------------------------------------------------------
// The half-open window over when a finding was made
// ---------------------------------------------------------------------------

describe('the findings window over when they were made', () => {
  it('takes the lower boundary and drops the upper', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);

    // `[sinceInclusive, untilExclusive)` written out rather than
    // read off the store: the two findings made at the lower bound
    // are IN and the one made at the upper bound is OUT, so two
    // adjacent windows do not both take the seam between them.
    const page = await pageOf(store, domain.id, {
      window: {
        sinceInclusive: new Date(MADE_T1),
        untilExclusive: new Date(MADE_T2),
      },
    });

    expect(page).toStrictEqual([HIGH_SECOND, HIGH_FIRST]);
    expect(page).not.toContain(MIDDLE_SCORE);
    expect(page).not.toContain(ZERO_SCORE);
  });

  it('narrows on one bound alone and on neither', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);

    const since = await pageOf(store, domain.id, {
      window: {
        sinceInclusive: new Date(MADE_T2),
        untilExclusive: null,
      },
    });

    const until = await pageOf(store, domain.id, {
      window: {
        sinceInclusive: null,
        untilExclusive: new Date(MADE_T1),
      },
    });

    // A bound holding null is unbounded on that side rather than a
    // bound at the epoch, and the two half-bounded pages plus the
    // unbounded one below are what say so.
    expect(since).toStrictEqual([MIDDLE_SCORE, NO_SCORE]);
    expect(until).toStrictEqual([ZERO_SCORE]);
    expect(await pageOf(store, domain.id)).toHaveLength(5);
  });

  it('answers an empty page for a span nothing was made in', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);
    const quiet = {
      window: {
        sinceInclusive: new Date('2027-01-01T00:00:00.000Z'),
        untilExclusive: new Date('2027-02-01T00:00:00.000Z'),
      },
    };

    expect(await pageOf(store, domain.id, quiet)).toStrictEqual([]);
    expect(await store.countFindings(domain.id, quiet)).toBe(0);

    // The control: an empty window is a legitimate request rather
    // than a store that had stopped answering.
    expect(await store.countFindings(domain.id, EVERY_FINDING)).toBe(5);
  });

  it('narrows beside a verdict and a category at once', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);

    await judge(store, HIGH_SECOND, KEEP);
    await judge(store, MIDDLE_SCORE, KEEP);

    // Three members at once select the intersection rather than the
    // last one written: only `HIGH_SECOND` is kept, filed under
    // platforms AND made inside the window.
    const page = await pageOf(store, domain.id, {
      category: PLATFORMS,
      verdict: KEEP,
      window: {
        sinceInclusive: new Date(MADE_T1),
        untilExclusive: new Date(MADE_T2),
      },
    });

    expect(page).toStrictEqual([HIGH_SECOND]);
  });
});

// ---------------------------------------------------------------------------
// The rulings a finding accumulates, and the sequence they are read in
// ---------------------------------------------------------------------------

describe('the rulings appended to a finding', () => {
  it('appends a second ruling rather than replacing the first', async () => {
    const store = createMemoryResearchStore();

    await seedFindings(store);

    const first = await judge(store, HIGH_FIRST, KEEP, 'worth keeping');
    const second = await judge(store, HIGH_FIRST, DROP);
    const stored = await store.listFindingLabels(HIGH_FIRST);

    // `finding_labels` carries no unique key at all, so there is
    // nothing to upsert on and re-judging is a second ROW. Both are
    // readable afterwards, which is what makes the sequence the
    // record of an operator changing their mind.
    expect(stored).toHaveLength(2);
    expect(stored.map((row) => row.id)).toStrictEqual(
      [second.id, first.id],
    );
    expect(stored.map((row) => row.verdict)).toStrictEqual([DROP, KEEP]);
    expect(stored.map((row) => row.note)).toStrictEqual(
      [null, 'worth keeping'],
    );
  });

  it('breaks a tie on the stamp by id descending', async () => {
    const fixed = new Date('2026-03-05T10:00:00.000Z');
    const store = createMemoryResearchStore({ now: () => fixed });

    await seedFindings(store);
    await judge(store, HIGH_FIRST, KEEP);
    await judge(store, HIGH_FIRST, DROP);
    await judge(store, HIGH_FIRST, HOLD);

    const stored = await store.listFindingLabels(HIGH_FIRST);

    // `labelled_at` is the transaction's start time, so rulings
    // written in one transaction tie to the microsecond and `id` is
    // the only thing separating them. The tie is asserted rather
    // than assumed, and for a lookup whose whole answer is the
    // first row it is the difference between a verdict and a coin
    // flip.
    const stamps = new Set(stored.map((row) => row.labelledAt.getTime()));

    expect(stamps).toStrictEqual(new Set([fixed.getTime()]));
    expect(stored.map((row) => row.verdict)).toStrictEqual(
      [HOLD, DROP, KEEP],
    );
  });

  it('reads the verdict in force off the head of that sequence', async () => {
    const fixed = new Date('2026-03-05T10:00:00.000Z');
    const store = createMemoryResearchStore({ now: () => fixed });
    const domain = await seedFindings(store);

    await judge(store, HIGH_FIRST, KEEP);
    await judge(store, HIGH_FIRST, DROP);

    // The filter reads the same head the list answers, under a
    // clock that ties the two stamps: a store falling back on the
    // first row it reaches would select this finding under `keep`.
    expect(
      await pageOf(store, domain.id, { ...EVERY_FINDING, verdict: DROP }),
    ).toStrictEqual([HIGH_FIRST]);
    expect(
      await pageOf(store, domain.id, { ...EVERY_FINDING, verdict: KEEP }),
    ).toStrictEqual([]);
  });

  it('answers no ruling for an unjudged and an unknown id', async () => {
    const store = createMemoryResearchStore();

    await seedFindings(store);
    await judge(store, HIGH_FIRST, KEEP);

    expect(await store.listFindingLabels(NO_SCORE)).toStrictEqual([]);
    expect(await store.listFindingLabels(9999)).toStrictEqual([]);

    // The control: the read answers rows for a finding that HAS
    // been judged, so the two empties above are answers rather than
    // a read that had stopped working.
    expect(await store.listFindingLabels(HIGH_FIRST)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// The sightings one finding carries, and the count they do not move
// ---------------------------------------------------------------------------

describe('the sightings a finding carries', () => {
  it('answers them newest first with id breaking a tie', async () => {
    const store = createMemoryResearchStore();
    const seen = '2026-03-06T08:00:00.000Z';
    const later = '2026-03-07T08:00:00.000Z';

    await seedFindings(store);

    store.setFindingSightings(HIGH_FIRST, [
      { externalId: 'a', id: 31, seenAt: new Date(seen), sourceId: 5 },
      { externalId: null, id: 33, seenAt: new Date(later), sourceId: 6 },
      { externalId: 'c', id: 32, seenAt: new Date(seen), sourceId: 7 },
    ]);

    const rows = await store.listFindingSightings(HIGH_FIRST);

    // Planted in an order neither answer gives, so this tells the
    // ordering from the planted one and from id alone.
    expect(rows.map((row) => row.id)).toStrictEqual([33, 32, 31]);
    expect(rows.map((row) => row.findingId)).toStrictEqual(
      [HIGH_FIRST, HIGH_FIRST, HIGH_FIRST],
    );
    expect(rows.map((row) => row.sourceId)).toStrictEqual([6, 7, 5]);
    expect(rows.map((row) => row.externalId)).toStrictEqual(
      [null, 'c', 'a'],
    );
  });

  it('answers nothing for a finding seen nowhere', async () => {
    const store = createMemoryResearchStore();

    await seedFindings(store);

    store.setFindingSightings(HIGH_FIRST, [
      { externalId: null, id: 31, seenAt: new Date(MADE_T1), sourceId: 5 },
    ]);

    expect(await store.listFindingSightings(NO_SCORE)).toStrictEqual([]);
    expect(await store.listFindingSightings(9999)).toStrictEqual([]);
    expect(await store.listFindingSightings(HIGH_FIRST)).toHaveLength(1);
  });

  it('does not move the count that holds a source delete', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);
    const source = await store.insertSource({
      contract: {},
      domainId: domain.id,
      enabled: true,
      endpoint: FEED_ENDPOINT,
      kind: 'rss',
      parserConfig: {},
    });

    store.setFindingSightings(HIGH_FIRST, [
      {
        externalId: null,
        id: 31,
        seenAt: new Date(MADE_T1),
        sourceId: source.id,
      },
    ]);

    const counts = await store.countSourceDependents(source.id);

    // The file's fourth known divergence, pinned rather than left
    // to be discovered. `countSourceDependents` reads what
    // `setSourceSightings` planted and never these rows, because
    // one port can only be asked HOW MANY cite a source while the
    // other answers the rows. So a row planted here does not hold
    // the delete a deployment would refuse.
    expect(counts.findingSightings).toBe(0);
    expect(await store.listFindingSightings(HIGH_FIRST)).toHaveLength(1);
    expect(await store.deleteSource(source.id)).toBe(true);
  });

  it('leaves the planted count refusing that delete', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);
    const source = await store.insertSource({
      contract: {},
      domainId: domain.id,
      enabled: true,
      endpoint: FEED_ENDPOINT,
      kind: 'rss',
      parserConfig: {},
    });

    store.setSourceSightings(source.id, 1);

    // The control for the case above: the guard still works, so
    // that case describes a seam the guard cannot see rather than a
    // guard that had stopped guarding.
    const refusal = await refusalFrom(() => store.deleteSource(source.id));

    expect(refusal.constraint).toBe(
      'finding_sightings_source_id_sources_id_fk',
    );
    const counts = await store.countSourceDependents(source.id);

    expect(counts.findingSightings).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The research a finding resolves through its entity
// ---------------------------------------------------------------------------

describe('the research a finding resolves through its entity', () => {
  it('answers what was planted under the entity it names', async () => {
    const store = createMemoryResearchStore();

    await seedFindings(store);

    store.setEntityResearch(SUBJECT, [
      {
        id: 41,
        payload: { note: 'first pass' },
        researchedAt: new Date(MADE_T1),
        runId: 9,
        summary: 'what the first pass came to',
      },
    ]);
    store.setEntityResearch(OTHER_SUBJECT, [
      {
        id: 42,
        payload: {},
        researchedAt: new Date(MADE_T2),
        runId: null,
        summary: null,
      },
    ]);

    const rows = await store.listFindingResearch(HIGH_FIRST);

    // Addressed by the FINDING and resolved through its entity, so
    // a caller holding a finding never reads `entityId` itself. The
    // two findings attributed to one subject answer the same rows,
    // and a finding attributed to the other answers that one's.
    expect(rows.map((row) => row.id)).toStrictEqual([41]);
    expect(rows.map((row) => row.entityId)).toStrictEqual([SUBJECT]);
    expect(rows.map((row) => row.runId)).toStrictEqual([9]);
    expect(rows.map((row) => row.summary)).toStrictEqual(
      ['what the first pass came to'],
    );

    const sibling = await store.listFindingResearch(HIGH_SECOND);

    expect(sibling.map((row) => row.id)).toStrictEqual([41]);
    expect(
      (await store.listFindingResearch(ZERO_SCORE)).map((row) => row.id),
    ).toStrictEqual([42]);
  });

  it('answers an empty list for an unattributed finding', async () => {
    const store = createMemoryResearchStore();

    await seedFindings(store);

    store.setEntityResearch(SUBJECT, [
      {
        id: 41,
        payload: {},
        researchedAt: new Date(MADE_T1),
        runId: null,
        summary: null,
      },
    ]);

    // A null `entity_id` is an ordinary state rather than an edge
    // case, so there is no entity to resolve research through and
    // nothing failed to read. The attributed sibling in the same
    // body is what says the read still answers rows at all.
    expect(await readFinding(store, NO_SCORE)).toMatchObject({
      entityId: null,
    });
    expect(await store.listFindingResearch(NO_SCORE)).toStrictEqual([]);
    expect(await store.listFindingResearch(HIGH_FIRST)).toHaveLength(1);
  });

  it('answers an empty list for an id no finding carries', async () => {
    const store = createMemoryResearchStore();

    await seedFindings(store);

    store.setEntityResearch(SUBJECT, [
      {
        id: 41,
        payload: {},
        researchedAt: new Date(MADE_T1),
        runId: null,
        summary: null,
      },
    ]);

    expect(await store.listFindingResearch(9999)).toStrictEqual([]);
    expect(await store.listFindingResearch(HIGH_SECOND)).toHaveLength(1);
  });

  it('answers the research newest first with id breaking a tie', async () => {
    const store = createMemoryResearchStore();
    const tied = '2026-03-08T08:00:00.000Z';

    await seedFindings(store);

    store.setEntityResearch(SUBJECT, [
      {
        id: 41,
        payload: {},
        researchedAt: new Date(tied),
        runId: null,
        summary: null,
      },
      {
        id: 43,
        payload: {},
        researchedAt: new Date(MADE_T0),
        runId: null,
        summary: null,
      },
      {
        id: 42,
        payload: {},
        researchedAt: new Date(tied),
        runId: null,
        summary: null,
      },
    ]);

    // Planted in an order neither answer gives, so this tells the
    // ordering from the planted one and from id alone.
    expect(
      (await store.listFindingResearch(HIGH_FIRST)).map((row) => row.id),
    ).toStrictEqual([42, 41, 43]);
  });
});

// ---------------------------------------------------------------------------
// What a domain delete takes, and the count it does not read
// ---------------------------------------------------------------------------

describe('the domain cascade over its findings', () => {
  it('takes its findings and leaves another domain standing', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);
    const other = await store.insertDomain(domainInput(TRANSIT));

    store.setDomainFindings(other.id, [madeFinding(21, { score: 0.5 })]);

    expect(await store.deleteDomain(domain.id)).toBe(true);

    expect(await pageOf(store, domain.id)).toStrictEqual([]);
    expect(await store.countFindings(domain.id, EVERY_FINDING)).toBe(0);
    expect(await store.findFindingById(HIGH_FIRST)).toBeNull();

    // The other domain's finding is standing, so this is a cascade
    // rather than a store that cleared everything.
    expect(await pageOf(store, other.id)).toStrictEqual([21]);
  });

  it('takes their sightings and their rulings with them', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);

    store.setFindingSightings(HIGH_FIRST, [
      { externalId: null, id: 31, seenAt: new Date(MADE_T1), sourceId: 5 },
    ]);
    store.setEntityResearch(SUBJECT, [
      {
        id: 41,
        payload: {},
        researchedAt: new Date(MADE_T1),
        runId: null,
        summary: null,
      },
    ]);

    await judge(store, HIGH_FIRST, KEEP);

    // The state before, so the three empties below are a delete
    // reaching them rather than reads that never answered.
    expect(await store.listFindingSightings(HIGH_FIRST)).toHaveLength(1);
    expect(await store.listFindingLabels(HIGH_FIRST)).toHaveLength(1);
    expect(await store.listFindingResearch(HIGH_FIRST)).toHaveLength(1);

    expect(await store.deleteDomain(domain.id)).toBe(true);

    // Two levels down: `findings.domain_id` cascades, and both
    // `finding_sightings.finding_id` and `finding_labels.finding_id`
    // cascade onto the findings. The research goes unreachable for
    // the third reason rather than the same one — the finding it
    // was resolved through is gone, which is where `EntityStore`
    // will take over the cascade proper.
    expect(await store.listFindingSightings(HIGH_FIRST)).toStrictEqual([]);
    expect(await store.listFindingLabels(HIGH_FIRST)).toStrictEqual([]);
    expect(await store.listFindingResearch(HIGH_FIRST)).toStrictEqual([]);
  });

  it('lets a ruling be refused once the finding has gone', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);

    await judge(store, HIGH_FIRST, KEEP);

    expect(await store.deleteDomain(domain.id)).toBe(true);

    // The foreign key read from the write's side after the cascade:
    // the finding a ruling named is not there, so the append is
    // refused rather than storing a row citing nothing.
    const refusal = await refusalFrom(() => judge(store, HIGH_FIRST, DROP));

    expect(refusal.constraint).toBe(
      'finding_labels_finding_id_findings_id_fk',
    );
  });
});

describe('the findings a dependent count does not see', () => {
  it('answers the planted number over a planted finding row', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);

    // The file's third known divergence, pinned rather than left to
    // be discovered. `countDomainDependents` reads what
    // `setDomainDependents` planted and never these rows, because
    // `src/domains/service.test.ts` and `src/domains/routes.test.ts`
    // reach that guard over a store holding no finding at all.
    expect(await store.countDomainDependents(domain.id)).toStrictEqual({
      findings: 0,
      sources: 0,
      topics: 0,
    });
    expect(await store.countFindings(domain.id, EVERY_FINDING)).toBe(5);

    store.setDomainDependents(domain.id, { findings: 2 });

    // The control: the guard still reads the plant, so the zero
    // above is a seam it cannot see rather than a count that had
    // stopped counting.
    expect(await store.countDomainDependents(domain.id)).toStrictEqual({
      findings: 2,
      sources: 0,
      topics: 0,
    });
  });

  it('drops the plant and the rows in one delete', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);

    store.setDomainDependents(domain.id, { findings: 5 });

    expect(await store.deleteDomain(domain.id)).toBe(true);

    expect(await store.countDomainDependents(domain.id)).toStrictEqual({
      findings: 0,
      sources: 0,
      topics: 0,
    });
    expect(await store.countFindings(domain.id, EVERY_FINDING)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// What the findings half copies across the boundary
// ---------------------------------------------------------------------------

describe('the finding payload crossing the boundary', () => {
  it('does not store the fields object a plant was handed', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const fields: Record<string, unknown> = { category: PLATFORMS };

    store.setDomainFindings(domain.id, [madeFinding(NO_SCORE, { fields })]);

    fields.category = RUNTIMES;

    // Compared against the CONSTANT rather than against a record an
    // earlier read answered: a store sharing its own object would
    // otherwise hold one lie against itself and pass.
    expect(await readFinding(store, NO_SCORE)).toMatchObject({
      fields: { category: PLATFORMS },
    });

    const platforms = { ...EVERY_FINDING, category: PLATFORMS };

    expect(await pageOf(store, domain.id, platforms)).toStrictEqual(
      [NO_SCORE],
    );
  });

  it('does not answer the fields object it stores', async () => {
    const store = createMemoryResearchStore();
    const domain = await seedFindings(store);
    const answered = await readFinding(store, HIGH_FIRST);

    answered.fields.category = RETIRED;

    expect((await readFinding(store, HIGH_FIRST)).fields).toStrictEqual({
      category: RUNTIMES,
    });

    const [paged] = await store.listFindings(
      domain.id,
      { ...EVERY_FINDING, category: RUNTIMES },
      'score',
      WHOLE_COLLECTION,
    );

    // The page is a second answer site rather than the same one:
    // `listFindings` builds its records through the same projection
    // the lookup does, and a store mapping stored rows straight out
    // would share them from both.
    expect(paged?.fields).toStrictEqual({ category: RUNTIMES });
  });

  it('does not store or answer the createdAt a plant was handed', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const made = new Date(MADE_T1);

    store.setDomainFindings(domain.id, [
      madeFinding(NO_SCORE, { createdAt: made }),
    ]);

    made.setUTCFullYear(2030);

    const stored = await readFinding(store, NO_SCORE);

    expect(stored.createdAt.getTime()).toBe(Date.UTC(2026, 2, 2, 9));

    stored.createdAt.setUTCFullYear(2031);

    expect(
      (await readFinding(store, NO_SCORE)).createdAt.getTime(),
    ).toBe(Date.UTC(2026, 2, 2, 9));
  });

  it('does not share a sighting or a research row it answers', async () => {
    const store = createMemoryResearchStore();
    const seen = new Date(MADE_T1);
    const researched = new Date(MADE_T2);
    const payload: Record<string, unknown> = { note: 'as recorded' };

    await seedFindings(store);

    store.setFindingSightings(HIGH_FIRST, [
      { externalId: null, id: 31, seenAt: seen, sourceId: 5 },
    ]);
    store.setEntityResearch(SUBJECT, [
      {
        id: 41,
        payload,
        researchedAt: researched,
        runId: null,
        summary: null,
      },
    ]);

    seen.setUTCFullYear(2030);
    researched.setUTCFullYear(2030);
    payload.note = 'rewritten';

    const [sighting] = await store.listFindingSightings(HIGH_FIRST);
    const [research] = await store.listFindingResearch(HIGH_FIRST);

    expect(sighting?.seenAt.getTime()).toBe(Date.UTC(2026, 2, 2, 9));
    expect(research?.researchedAt.getTime()).toBe(Date.UTC(2026, 2, 3, 9));
    expect(research?.payload).toStrictEqual({ note: 'as recorded' });

    sighting?.seenAt.setUTCFullYear(2031);
    research?.researchedAt.setUTCFullYear(2031);

    const [again] = await store.listFindingSightings(HIGH_FIRST);
    const [researchAgain] = await store.listFindingResearch(HIGH_FIRST);

    expect(again?.seenAt.getTime()).toBe(Date.UTC(2026, 2, 2, 9));
    expect(researchAgain?.researchedAt.getTime()).toBe(
      Date.UTC(2026, 2, 3, 9),
    );
  });

  it('does not share the labelledAt an append or a read answers', async () => {
    const fixed = new Date('2026-03-05T10:00:00.000Z');
    const store = createMemoryResearchStore({ now: () => fixed });

    await seedFindings(store);

    const appended = await judge(store, HIGH_FIRST, KEEP);

    appended.labelledAt.setUTCFullYear(2031);
    fixed.setUTCFullYear(2032);

    const [read] = await store.listFindingLabels(HIGH_FIRST);

    // Three answer sites and one clock: the row the append handed
    // back, the row the read hands out, and the `Date` the clock
    // itself answered. A store keeping any of the three would have
    // every stamped row moving together.
    expect(read?.labelledAt.getTime()).toBe(Date.UTC(2026, 2, 5, 10));

    read?.labelledAt.setUTCFullYear(2033);

    const [again] = await store.listFindingLabels(HIGH_FIRST);

    expect(again?.labelledAt.getTime()).toBe(Date.UTC(2026, 2, 5, 10));
  });

  it('rebuilds the planted list rather than holding it', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const rows = [madeFinding(NO_SCORE)];

    store.setDomainFindings(domain.id, rows);

    rows.push(madeFinding(HIGH_FIRST));

    // The seam copies row by row AND rebuilds the array, so pushing
    // onto what was planted does not plant a second finding.
    expect(await pageOf(store, domain.id)).toStrictEqual([NO_SCORE]);

    // A second call REPLACES rather than appends, which is what
    // makes a domain going back to none expressible.
    store.setDomainFindings(domain.id, []);

    expect(await pageOf(store, domain.id)).toStrictEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The documents half's fixture
// ---------------------------------------------------------------------------

/**
 * The four instants the corpus fixture is captured across, oldest
 * first and one day apart.
 *
 * SPELLED OUT RATHER THAN DERIVED FROM ONE ANOTHER, so that an
 * ordering case compares against stamps no arithmetic of the store's
 * could have produced. Distinct from {@link CAPTURED}, which is the
 * sources half's default over the same table and the same column: the
 * two seams hold that table separately, and sharing an instant across
 * them would put a fixture at the centre of a divergence two cases
 * here exist to read.
 */
const CAPTURED_T0 = '2026-04-01T09:00:00.000Z';
const CAPTURED_T1 = '2026-04-02T09:00:00.000Z';
const CAPTURED_T2 = '2026-04-03T09:00:00.000Z';
const CAPTURED_T3 = '2026-04-04T09:00:00.000Z';

/**
 * The five documents the corpus fixture plants, named for what each
 * is in the page rather than for its id.
 *
 * The ids are the fixture's own, `DocumentStore` declaring no insert.
 * `TIED_FAILED` and `TIED_OK` carry ONE instant, so only `id`
 * separates them, and they are planted with the LOWER id first — a
 * stable sort that lost the tiebreak answers them the wrong way round
 * rather than reproducing this order by accident. `PASTED` is the
 * newest row AND the lowest id, so an ordering by `id` alone in
 * either direction disagrees with the answer rather than resembling
 * it.
 */
const PASTED = 51;
const TIED_FAILED = 52;
const TIED_OK = 53;
const STALE = 54;
const RECENT_FAILED = 55;

/** The corpus filter that narrows nothing: both parse statuses. */
const EVERY_DOCUMENT: DocumentFilter = {};

/** What {@link captured} defaults when a case is not about it. */
type CorpusDefaults = Partial<Omit<MemoryDomainDocument, 'id'>>;

/**
 * Builds one row for {@link MemoryResearchStore.setDomainDocuments}.
 *
 * A function rather than a constant, for the reason {@link planted}
 * is one: the copy cases WRITE into the `capturedAt` they planted,
 * which is the whole point of them.
 *
 * @param id - The document id, which is the page's tiebreak.
 * @param values - The six members a case may care about. `sourceId`
 *   defaults to NULL, which is the state the sources seam has no key
 *   to plant, and `parseStatus` to `ok` so that a case about a
 *   failure says so.
 * @returns The row to plant.
 */
function captured(
  id: number,
  values: CorpusDefaults = {},
): MemoryDomainDocument {
  return {
    id,
    sourceId: values.sourceId ?? null,
    url: values.url ?? null,
    body: values.body ?? `Body of document ${id}`,
    parseStatus: values.parseStatus ?? 'ok',
    parseError: values.parseError ?? null,
    capturedAt: values.capturedAt ?? new Date(CAPTURED_T0),
  };
}

/**
 * A domain carrying the five documents every ordering, filter and
 * window case reads, and the feed four of them came through.
 *
 * PLANTED IN AN ORDER NO READ ANSWERS, which is what lets one fixture
 * tell the capture ordering from an ordering by insertion or by `id`
 * in either direction. The answer is written out in the cases rather
 * than here.
 *
 * THE FIFTH CAME THROUGH NO FEED, which is the state that makes this
 * collection wider than the failures queue rather than a second
 * spelling of it: `setSourceDocuments` is keyed BY a source, so a
 * pasted body has no key to be planted under there at all.
 *
 * @param store - The store to write to.
 * @returns The domain the corpus hangs off and the source four of its
 *   documents name.
 */
async function seedDocuments(
  store: MemoryResearchStore,
): Promise<{ domain: DomainRecord; feed: SourceRecord }> {
  const domain = await store.insertDomain(domainInput(RADAR));
  const feed = await addSource(store, domain.id, FEED_ENDPOINT);

  store.setDomainDocuments(domain.id, [
    captured(TIED_FAILED, {
      capturedAt: new Date(CAPTURED_T1),
      parseError: 'no title',
      parseStatus: 'failed',
      sourceId: feed.id,
    }),
    captured(STALE, {
      capturedAt: new Date(CAPTURED_T0),
      parseStatus: 'failed',
      sourceId: feed.id,
    }),
    captured(PASTED, { capturedAt: new Date(CAPTURED_T3) }),
    captured(RECENT_FAILED, {
      capturedAt: new Date(CAPTURED_T2),
      parseStatus: 'failed',
      sourceId: feed.id,
    }),
    captured(TIED_OK, {
      capturedAt: new Date(CAPTURED_T1),
      sourceId: feed.id,
    }),
  ]);

  return { domain, feed };
}

/**
 * Reads one window of a domain's corpus under a filter.
 *
 * @param store - The store to read.
 * @param domainId - The domain to read within.
 * @param filter - What to narrow to, both statuses by default so that
 *   a case about an order says nothing about a status.
 * @returns The ids on the first page, in the order they arrived.
 */
async function corpusPage(
  store: MemoryResearchStore,
  domainId: number,
  filter: DocumentFilter = EVERY_DOCUMENT,
): Promise<number[]> {
  const page = await store.listDocuments(
    domainId,
    filter,
    WHOLE_COLLECTION,
  );

  return page.map((row) => row.id);
}

/**
 * Reads a corpus document that must be there.
 *
 * Off the PAGE rather than off a lookup, `DocumentStore` declaring no
 * read by id: a document is met in its domain and addressed by
 * nothing else.
 *
 * @param store - The store to read.
 * @param domainId - The domain to read within.
 * @param id - The document to find on its page.
 * @returns The row.
 * @throws When the page carries no such document, for the reason
 *   {@link readDomain} throws: two absences otherwise compare equal.
 */
async function readDocument(
  store: MemoryResearchStore,
  domainId: number,
  id: number,
): Promise<DocumentRecord> {
  const page = await store.listDocuments(
    domainId,
    EVERY_DOCUMENT,
    WHOLE_COLLECTION,
  );
  const row = page.find((held) => held.id === id);

  if (row === undefined) {
    throw new Error(`expected a stored document under ${id}`);
  }

  return row;
}

// ---------------------------------------------------------------------------
// The order the corpus page answers in, and the tie the server makes
// ---------------------------------------------------------------------------

describe('the corpus page ordering', () => {
  it('orders newest first with the id breaking a tie', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedDocuments(store);

    // Neither the order the rows were planted in
    // (52, 54, 51, 55, 53) nor either direction of id: the newest
    // document carries the LOWEST id, so an ordering by id descending
    // would lead with 55 and one ascending with 51 followed by 52.
    expect(await corpusPage(store, domain.id)).toStrictEqual(
      [PASTED, RECENT_FAILED, TIED_OK, TIED_FAILED, STALE],
    );
  });

  it('separates two documents tied on capture by id', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedDocuments(store);
    const tied = await Promise.all([
      readDocument(store, domain.id, TIED_FAILED),
      readDocument(store, domain.id, TIED_OK),
    ]);

    // The tie is read off the store rather than assumed: both rows
    // carry one instant, so `id` descending is the only thing
    // ordering them. That tie is the SERVER's own — `captured_at`
    // defaults to the transaction's start time, so a batch capture
    // writes rows tying to the microsecond and a page boundary
    // falling inside one would show a document twice and another
    // never.
    expect(tied.map((row) => row.capturedAt.getTime())).toStrictEqual(
      [Date.UTC(2026, 3, 2, 9), Date.UTC(2026, 3, 2, 9)],
    );

    const page = await corpusPage(store, domain.id);

    expect(page.indexOf(TIED_OK)).toBeLessThan(page.indexOf(TIED_FAILED));
  });

  it('orders one status the same way it orders both', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedDocuments(store);
    const failed = { parseStatus: 'failed' } as const;

    // A narrowed page is the same ordering over fewer rows rather
    // than a second read: the filter and the sort are separate
    // decisions, and a store applying the window before the order
    // answers the same rows in another sequence.
    expect(await corpusPage(store, domain.id, failed)).toStrictEqual(
      [RECENT_FAILED, TIED_FAILED, STALE],
    );
  });
});

// ---------------------------------------------------------------------------
// What the parse-status filter narrows, and what the default holds
// ---------------------------------------------------------------------------

describe('the corpus parse-status filter', () => {
  it('carries both statuses when no filter is given', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedDocuments(store);
    const page = await store.listDocuments(
      domain.id,
      EVERY_DOCUMENT,
      WHOLE_COLLECTION,
    );

    // A failed document is IN the corpus rather than behind a flag,
    // which is fail-flag-keep read from the debug page's side. The
    // statuses are read as a SET off the page rather than counted:
    // a store answering five `ok` rows passes a length assertion.
    expect(new Set(page.map((row) => row.parseStatus))).toStrictEqual(
      new Set(DOCUMENT_PARSE_STATUSES),
    );
    expect(await store.countDocuments(domain.id, EVERY_DOCUMENT)).toBe(5);
  });

  it('answers the failures alone and the parsed alone', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedDocuments(store);
    const failed = { parseStatus: 'failed' } as const;
    const ok = { parseStatus: 'ok' } as const;

    expect(await corpusPage(store, domain.id, failed)).toStrictEqual(
      [RECENT_FAILED, TIED_FAILED, STALE],
    );
    expect(await store.countDocuments(domain.id, failed)).toBe(3);

    // The other half in the same body, which is what says the filter
    // selects rather than that `failed` happens to name everything:
    // the two pages partition the default one and neither is it.
    expect(await corpusPage(store, domain.id, ok)).toStrictEqual(
      [PASTED, TIED_OK],
    );
    expect(await store.countDocuments(domain.id, ok)).toBe(2);
  });

  it('answers an empty page for a status no row carries', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const failed = { parseStatus: 'failed' } as const;

    store.setDomainDocuments(domain.id, [
      captured(PASTED),
      captured(TIED_OK),
    ]);

    // A domain whose captures all parsed is not a failure to read,
    // and a status outside the tuple never reaches here at all —
    // `src/documents/service.ts` refuses that with a `422`.
    expect(await corpusPage(store, domain.id, failed)).toStrictEqual([]);
    expect(await store.countDocuments(domain.id, failed)).toBe(0);

    // The control: the page is narrowed rather than empty, and the
    // count beside it describes the same collection.
    expect(await corpusPage(store, domain.id)).toStrictEqual(
      [TIED_OK, PASTED],
    );
    expect(await store.countDocuments(domain.id, EVERY_DOCUMENT)).toBe(2);
  });

  it('carries a document that came through no feed at all', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedDocuments(store);

    // The state the sources seam has no key to plant: an ingested
    // file and a pasted body sit in the middle of this page by
    // capture time and are unreachable through a seam keyed by a
    // source. The sibling in the same body is the control that a
    // null is answered rather than written over every row.
    expect(await readDocument(store, domain.id, PASTED)).toMatchObject({
      sourceId: null,
    });
    expect(await readDocument(store, domain.id, TIED_OK)).toMatchObject({
      sourceId: feed.id,
    });
  });

  it('answers the body and the error as stored, uncut', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const body = `before${String.fromCharCode(0)}after`;

    store.setDomainDocuments(domain.id, [
      captured(TIED_FAILED, {
        body,
        parseError: `broke${String.fromCharCode(27)}here`,
        parseStatus: 'failed',
      }),
    ]);

    // The masking belongs to `src/documents/service.ts`, and keeping
    // it out of the port is what lets it be tested against a planted
    // control byte with no database. A store masking here would
    // answer a body no column holds and would leave `bodyBytes`
    // reporting the length of something else.
    const row = await readDocument(store, domain.id, TIED_FAILED);

    expect(row.body).toBe(body);
    expect(row.parseError).toBe(`broke${String.fromCharCode(27)}here`);
  });
});

// ---------------------------------------------------------------------------
// The window over the corpus page, and the count beside it
// ---------------------------------------------------------------------------

describe('the corpus page window', () => {
  it('answers one window of the ordered page', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedDocuments(store);

    const page = await store.listDocuments(domain.id, EVERY_DOCUMENT, {
      limit: 2,
      offset: 1,
    });

    // The window is taken from the ORDERED collection rather than
    // from the planted list, so the second and third of the page
    // arrive rather than the second and third row planted.
    expect(page.map((row) => row.id)).toStrictEqual(
      [RECENT_FAILED, TIED_OK],
    );
  });

  it('answers an empty page past the end and counts the whole', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedDocuments(store);

    const page = await store.listDocuments(domain.id, EVERY_DOCUMENT, {
      limit: 50,
      offset: 50,
    });

    expect(page).toStrictEqual([]);

    // The count ignores the window, which is what a page's
    // `meta.total` is read for: a window past the end still
    // describes a collection of five.
    expect(await store.countDocuments(domain.id, EVERY_DOCUMENT)).toBe(5);
  });

  it('answers nothing for a domain that has captured none', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedDocuments(store);
    const other = await store.insertDomain(domainInput(TRANSIT));

    expect(await corpusPage(store, other.id)).toStrictEqual([]);
    expect(await store.countDocuments(other.id, EVERY_DOCUMENT)).toBe(0);

    // The control: the page is scoped rather than empty for
    // everyone, and an id no domain carries answers the same way a
    // domain holding nothing does.
    expect(await corpusPage(store, domain.id)).toHaveLength(5);
    expect(await corpusPage(store, 9999)).toStrictEqual([]);
    expect(await store.countDocuments(9999, EVERY_DOCUMENT)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// What a domain delete takes, over a table two seams hold separately
// ---------------------------------------------------------------------------

describe('the domain cascade over its documents', () => {
  it('takes its corpus and leaves another domain standing', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedDocuments(store);
    const other = await store.insertDomain(domainInput(TRANSIT));

    store.setDomainDocuments(other.id, [captured(61)]);

    expect(await store.deleteDomain(domain.id)).toBe(true);

    expect(await corpusPage(store, domain.id)).toStrictEqual([]);
    expect(await store.countDocuments(domain.id, EVERY_DOCUMENT)).toBe(0);

    // The other domain's document is standing, so this is a cascade
    // rather than a store that cleared everything.
    expect(await corpusPage(store, other.id)).toStrictEqual([61]);
  });

  it('clears both seams over the one table it cascades to', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedDocuments(store);

    store.setSourceDocuments(feed.id, [
      planted(71, { parseStatus: 'failed' }),
    ]);

    // The state before, so the two empties after are a delete
    // reaching them rather than reads that never answered.
    expect(await corpusPage(store, domain.id)).toHaveLength(5);
    expect(await store.countSourceFailures(feed.id)).toBe(1);

    expect(await store.deleteDomain(domain.id)).toBe(true);

    // Two lines rather than one, and neither is redundant: the
    // sources plants go with their sources and the corpus goes with
    // its domain, so a delete dropping only one of the two leaves
    // rows of the same table behind.
    expect(await store.countDocuments(domain.id, EVERY_DOCUMENT)).toBe(0);
    expect(await store.countSourceFailures(feed.id)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The fifth known divergence: two seams, one table, neither seeing
// the other
// ---------------------------------------------------------------------------

describe('the corpus the failures queue does not see', () => {
  it('answers no queue, no aggregate and no dependent count', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedDocuments(store);

    // Three of the corpus's five are `failed` and four of them name
    // this feed, so a store reading one seam through the other would
    // answer three here rather than nought.
    expect(await store.countSourceFailures(feed.id)).toBe(0);
    expect(await store.countSourceDependents(feed.id)).toStrictEqual({
      documents: 0,
      findingSightings: 0,
    });

    const [listed] = await store.listSourcesWithParseStats(
      domain.id,
      WHOLE_COLLECTION,
    );

    expect(listed?.parseStats).toStrictEqual({ ok: 0, failed: 0 });

    // So the delete LANDS, where the same rows planted through the
    // sources seam would refuse it. That is the divergence rather
    // than a guard that had stopped guarding, and the case below
    // reads the other face.
    expect(await store.deleteSource(feed.id)).toBe(true);
  });

  it('refuses the same delete over the sources seam', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedDocuments(store);

    store.setSourceDocuments(feed.id, [planted(71)]);

    // The control the case above needs: the guard still refuses a
    // source whose OWN seam holds a document, so the delete landing
    // there is a seam it cannot see rather than a rule that has
    // gone.
    const refusal = await refusalFrom(() => store.deleteSource(feed.id));

    expect(refusal.constraint).toBe('documents_source_id_sources_id_fk');
  });

  it('leaves a sources plant out of the corpus page', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedDocuments(store);

    store.setSourceDocuments(feed.id, [
      planted(71, { parseStatus: 'failed' }),
    ]);

    // The divergence read from the other end: a row the failures
    // queue answers is not on this page, and the five that are stay
    // put. A store resolving the sources seam through its source's
    // domain would answer six.
    expect(await store.countSourceFailures(feed.id)).toBe(1);
    expect(await corpusPage(store, domain.id)).toStrictEqual(
      [PASTED, RECENT_FAILED, TIED_OK, TIED_FAILED, STALE],
    );
  });
});

// ---------------------------------------------------------------------------
// What the documents half copies across the boundary
// ---------------------------------------------------------------------------

describe('the corpus document crossing the boundary', () => {
  it('does not store the capturedAt a plant was handed', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const taken = new Date(CAPTURED_T1);

    store.setDomainDocuments(domain.id, [
      captured(PASTED, { capturedAt: taken }),
    ]);

    taken.setUTCFullYear(2030);

    // Compared against the arithmetic rather than against an instant
    // an earlier read answered: a store sharing the caller's `Date`
    // would otherwise hold one lie against itself and pass.
    expect(
      (await readDocument(store, domain.id, PASTED)).capturedAt.getTime(),
    ).toBe(Date.UTC(2026, 3, 2, 9));
  });

  it('does not answer the capturedAt it stores', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedDocuments(store);
    const answered = await readDocument(store, domain.id, PASTED);

    answered.capturedAt.setUTCFullYear(2031);

    // The other direction, in its own case so that the two are told
    // apart by which one reddens — one seam and one answer site,
    // and a store keeping either has every page it hands out moving
    // together.
    expect(
      (await readDocument(store, domain.id, PASTED)).capturedAt.getTime(),
    ).toBe(Date.UTC(2026, 3, 4, 9));
  });

  it('rebuilds the planted list rather than holding it', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const rows = [captured(PASTED)];

    store.setDomainDocuments(domain.id, rows);

    rows.push(captured(TIED_OK));

    // The seam copies row by row AND rebuilds the array, so pushing
    // onto what was planted does not plant a second document.
    expect(await corpusPage(store, domain.id)).toStrictEqual([PASTED]);

    // A second call REPLACES rather than appends, which is what
    // makes a domain going back to none expressible.
    store.setDomainDocuments(domain.id, []);

    expect(await corpusPage(store, domain.id)).toStrictEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The entities half's fixture
// ---------------------------------------------------------------------------

/**
 * The two instants the research fixture is recorded across, and the
 * two the intentions are raised across.
 *
 * SPELLED OUT RATHER THAN DERIVED FROM ONE ANOTHER, on the terms
 * {@link MADE_T0} states, and kept clear of the findings half's own
 * stamps over the same table: `entity_research` is planted by ONE
 * seam and read by two ports, so a shared instant would put a fixture
 * at the centre of the very thing two cases here read.
 */
const RESEARCHED_T0 = '2026-05-01T09:00:00.000Z';
const RESEARCHED_T1 = '2026-05-02T09:00:00.000Z';
const RAISED_T0 = '2026-05-03T09:00:00.000Z';
const RAISED_T1 = '2026-05-04T09:00:00.000Z';

/** When the fixture's already-ruled intentions were approved. */
const RULED_AT = '2026-05-05T09:00:00.000Z';

/** When the one closed intention was closed. */
const CLOSED_AT = '2026-05-06T09:00:00.000Z';

/**
 * The four subjects the registry fixture plants, named for what each
 * is in the rules rather than for its id.
 *
 * The ids are the fixture's own, `EntityStore` declaring no insert.
 * `ELSEWHERE` sits in a SECOND domain under the key `KUBE` holds in
 * the first, which is the control that says
 * `entities_domain_id_name_norm_unique` is over the PAIR: a store
 * keying on the name alone could not hold this fixture at all.
 */
const KUBE = 81;
const MESH = 82;
const POINTER = 83;
const ELSEWHERE = 84;

/**
 * The reduced key the alias row holds.
 *
 * The other three keys are the term patterns above, reused the way
 * the findings half reuses the taxonomy keys: a `name_norm` is free
 * text, so any neutral string is as good a key as any other.
 */
const K8S = 'k8s';

/**
 * The three research rows planted under `KUBE`, and the one under
 * `MESH`.
 *
 * `PASS_TIED_LOW` and `PASS_TIED_HIGH` carry ONE instant, so only
 * `id` separates them, and they are planted LOW FIRST — a stable sort
 * that lost the descending tiebreak answers them the wrong way round
 * rather than reproducing the answer by accident. `PASS_OLDEST` is
 * the HIGHEST id and the OLDEST stamp, so the two keys disagree on
 * every pair it is in and an ordering by `id` alone cannot look
 * right.
 */
const PASS_TIED_LOW = 91;
const PASS_TIED_HIGH = 92;
const PASS_OLDEST = 93;
const PASS_ON_MESH = 99;

/**
 * The five intentions the pool fixture plants under one domain.
 *
 * `QUEUED_TIED_LOW` and `QUEUED_TIED_HIGH` carry one instant and are
 * planted HIGH FIRST, the queue's tiebreak being ASCENDING — the
 * mirror of the research fixture above, and reversed for the same
 * reason. `QUEUED_FIRST` is the HIGHEST id and the OLDEST stamp, so
 * the two keys disagree there too. `UNATTRIBUTED` names no subject
 * and `ON_MESH` names another one, which is what makes the scope of
 * a page readable at all.
 */
const QUEUED_TIED_LOW = 94;
const QUEUED_TIED_HIGH = 95;
const QUEUED_FIRST = 96;
const UNATTRIBUTED = 97;
const ON_MESH = 98;

/** What {@link registered} defaults when a case is not about it. */
type EntityDefaults = Partial<Omit<MemoryDomainEntity, 'id'>>;

/**
 * Builds one row for {@link MemoryResearchStore.setDomainEntities}.
 *
 * A function rather than a constant, for the reason {@link planted}
 * is one: the copy cases WRITE into the `attributes` they planted,
 * which is the whole point of them.
 *
 * @param id - The subject's id, which is what every entity read is
 *   addressed by.
 * @param values - The four members a case may care about. `aliasOf`
 *   defaults to null, which is the ordinary state rather than the
 *   exception, and the two name halves default to something derived
 *   from the id so that a case not about the key cannot collide by
 *   accident.
 * @returns The row to plant.
 */
function registered(
  id: number,
  values: EntityDefaults = {},
): MemoryDomainEntity {
  return {
    id,
    name: values.name ?? `Subject ${id}`,
    nameNorm: values.nameNorm ?? `subject-${id}`,
    aliasOf: values.aliasOf ?? null,
    attributes: values.attributes ?? {},
  };
}

/** What {@link queued} defaults when a case is not about it. */
type PoolDefaults = Partial<Omit<MemoryResearchPoolRow, 'id'>>;

/**
 * Builds one row for {@link MemoryResearchStore.setDomainPool}.
 *
 * @param id - The intention's id, which is what an approval names.
 * @param values - The seven members a case may care about. Both
 *   stamps default to null, which is the open state every row starts
 *   in and the one side of `research_pool_approval_check` that is
 *   always legal.
 * @returns The row to plant.
 */
function queued(id: number, values: PoolDefaults = {}): MemoryResearchPoolRow {
  return {
    id,
    entityId: values.entityId ?? null,
    findingId: values.findingId ?? null,
    status: values.status ?? 'pending',
    searchTerms: values.searchTerms ?? [`terms for ${id}`],
    createdAt: values.createdAt ?? new Date(RAISED_T0),
    approvedAt: values.approvedAt ?? null,
    researchedAt: values.researchedAt ?? null,
  };
}

/**
 * Two domains, a registry of three subjects in the first and a fourth
 * in the second, the research recorded about two of them, and the
 * five intentions queued under the first.
 *
 * PLANTED IN AN ORDER NO READ ANSWERS, on the terms
 * {@link seedFindings} states, in all three collections.
 *
 * @param store - The store to write to.
 * @returns Both domains: the registry's, and the one holding the
 *   subject that carries the same key.
 */
async function seedEntities(
  store: MemoryResearchStore,
): Promise<{ domain: DomainRecord; other: DomainRecord }> {
  const domain = await store.insertDomain(domainInput(RADAR));
  const other = await store.insertDomain(domainInput(TRANSIT));

  store.setDomainEntities(domain.id, [
    registered(POINTER, {
      aliasOf: KUBE,
      name: 'K8s',
      nameNorm: K8S,
    }),
    registered(MESH, { name: 'Service Mesh', nameNorm: SERVICE_MESH }),
    registered(KUBE, {
      attributes: { tier: 'core' },
      name: 'Kubernetes',
      nameNorm: KUBERNETES,
    }),
  ]);
  store.setDomainEntities(other.id, [
    registered(ELSEWHERE, { name: 'Kubernetes', nameNorm: KUBERNETES }),
  ]);

  store.setEntityResearch(KUBE, [
    passOn(PASS_TIED_LOW, RESEARCHED_T1),
    passOn(PASS_OLDEST, RESEARCHED_T0),
    passOn(PASS_TIED_HIGH, RESEARCHED_T1),
  ]);
  store.setEntityResearch(MESH, [passOn(PASS_ON_MESH, RESEARCHED_T0)]);

  store.setDomainPool(domain.id, [
    queued(QUEUED_TIED_HIGH, {
      approvedAt: new Date(RULED_AT),
      createdAt: new Date(RAISED_T1),
      entityId: KUBE,
      researchedAt: new Date(CLOSED_AT),
      status: 'done',
    }),
    queued(QUEUED_FIRST, { entityId: KUBE }),
    queued(UNATTRIBUTED, {}),
    queued(ON_MESH, { entityId: MESH }),
    queued(QUEUED_TIED_LOW, {
      approvedAt: new Date(RULED_AT),
      createdAt: new Date(RAISED_T1),
      entityId: KUBE,
      status: 'approved',
    }),
  ]);

  return { domain, other };
}

/**
 * Builds one row for {@link MemoryResearchStore.setEntityResearch}.
 *
 * @param id - The pass's id, which is the read's tiebreak.
 * @param at - When it was recorded, as an ISO instant.
 * @returns The row to plant.
 */
function passOn(id: number, at: string): MemoryEntityResearch {
  return {
    id,
    payload: { pass: id },
    researchedAt: new Date(at),
    runId: null,
    summary: null,
  };
}

/**
 * Reads an entity that must be there.
 *
 * @param store - The store to read.
 * @param id - The id to read under.
 * @returns The row.
 * @throws When no entity carries the id, for the reason
 *   {@link readDomain} throws: two absences otherwise compare equal.
 */
async function readEntity(
  store: MemoryResearchStore,
  id: number,
): Promise<EntityRecord> {
  const row = await store.findEntityById(id);

  if (row === null) {
    throw new Error(`expected a stored entity under ${id}`);
  }

  return row;
}

/**
 * Reads an intention that must be there.
 *
 * @param store - The store to read.
 * @param id - The id to read under.
 * @returns The row.
 * @throws When no intention carries the id.
 */
async function readPoolRow(
  store: MemoryResearchStore,
  id: number,
): Promise<ResearchPoolRecord> {
  const row = await store.findPoolRowById(id);

  if (row === null) {
    throw new Error(`expected a stored intention under ${id}`);
  }

  return row;
}

/**
 * Reads one window of what has been found out about a subject.
 *
 * @param store - The store to read.
 * @param entityId - The subject to read about.
 * @param window - How much to take, the whole collection by default.
 * @returns The ids in the order they arrived.
 */
async function researchPage(
  store: MemoryResearchStore,
  entityId: number,
  window = WHOLE_COLLECTION,
): Promise<number[]> {
  const page = await store.listEntityResearch(entityId, window);

  return page.map((row) => row.id);
}

/**
 * Reads one window of the intentions queued against a subject.
 *
 * @param store - The store to read.
 * @param entityId - The subject to read.
 * @param window - How much to take, the whole collection by default.
 * @returns The ids in the order they arrived.
 */
async function poolPage(
  store: MemoryResearchStore,
  entityId: number,
  window = WHOLE_COLLECTION,
): Promise<number[]> {
  const page = await store.listEntityPool(entityId, window);

  return page.map((row) => row.id);
}

// ---------------------------------------------------------------------------
// The two mechanisms the registry write can reach, and their order
// ---------------------------------------------------------------------------

describe('the entities_domain_id_name_norm_unique key', () => {
  it('refuses a rename onto a key a sibling already holds', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    const refusal = await refusalFrom(() => store.updateEntity(MESH, {
      name: { display: 'Kubernetes', norm: KUBERNETES },
    }));

    expect(refusal.reason).toBe('unique-violation');
    expect(refusal.constraint).toBe('entities_domain_id_name_norm_unique');

    // The row is as it was, so the refusal happened before the
    // write rather than after half of one.
    expect(await readEntity(store, MESH)).toMatchObject({
      name: 'Service Mesh',
      nameNorm: SERVICE_MESH,
    });
  });

  it('takes the same key under a second domain', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    // The control that makes the refusal above a PAIR key rather
    // than a name key: this subject is in another registry, so
    // renaming it onto a key the first domain holds is ordinary.
    const moved = await store.updateEntity(ELSEWHERE, {
      name: { display: 'Service Mesh', norm: SERVICE_MESH },
    });

    expect(moved).toMatchObject({ nameNorm: SERVICE_MESH });
    expect(await readEntity(store, MESH)).toMatchObject({
      nameNorm: SERVICE_MESH,
    });
  });

  it('takes a rename that leaves the key where it was', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    // A row is not in conflict with itself. A store comparing
    // against every row in the domain refuses this, which is the
    // rename that moves only the display half — the commonest edit
    // this surface will ever be asked for.
    const renamed = await store.updateEntity(KUBE, {
      name: { display: 'Kubernetes (k8s)', norm: KUBERNETES },
    });

    expect(renamed).toMatchObject({
      name: 'Kubernetes (k8s)',
      nameNorm: KUBERNETES,
    });
  });
});

describe('the entity alias foreign key', () => {
  it('refuses an aliasOf naming an id no entity carries', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    const refusal = await refusalFrom(
      () => store.updateEntity(MESH, { aliasOf: 9999 }),
    );

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe('entities_alias_of_entities_id_fk');

    // The control in the same case, varied along that row's own
    // axis: a live id through the same call is stored, so the
    // refusal is the id and not the member.
    expect(await store.updateEntity(MESH, { aliasOf: KUBE })).toMatchObject({
      aliasOf: KUBE,
    });
  });

  it('takes an alias pointing into another domain', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    // One of the two rules this port does NOT hold. The column is
    // onto `entities.id` alone, so a pointer across registries is
    // stored — and `src/entities/service.ts` is where it is refused
    // with a 422, above this port rather than in it.
    expect(
      await store.updateEntity(MESH, { aliasOf: ELSEWHERE }),
    ).toMatchObject({ aliasOf: ELSEWHERE });

    // The other one, in the same case for the same reason: a row
    // pointing at itself is storable too.
    expect(await store.updateEntity(MESH, { aliasOf: MESH })).toMatchObject({
      aliasOf: MESH,
    });
  });

  it('takes a null that clears the pointer', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    expect(await readEntity(store, POINTER)).toMatchObject({ aliasOf: KUBE });

    const cleared = await store.updateEntity(POINTER, { aliasOf: null });

    expect(cleared).toMatchObject({ aliasOf: null });
    expect(await readEntity(store, POINTER)).toMatchObject({ aliasOf: null });
  });
});

describe('the order the entity write asks its two mechanisms in', () => {
  it('answers the key beside an alias naming nothing', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    // The one call in this file that reaches a unique key and a
    // foreign key at once, `name` and `aliasOf` both being members
    // of one patch. The order is the relation the category half
    // MEASURED between an index and an end-of-statement check,
    // argued across rather than measured here.
    const refusal = await refusalFrom(() => store.updateEntity(MESH, {
      aliasOf: 9999,
      name: { display: 'Kubernetes', norm: KUBERNETES },
    }));

    expect(refusal.constraint).toBe('entities_domain_id_name_norm_unique');

    // The control that says the alias half of the request was a
    // fault at all: alone, it is refused by the other mechanism.
    const alone = await refusalFrom(
      () => store.updateEntity(MESH, { aliasOf: 9999 }),
    );

    expect(alone.constraint).toBe('entities_alias_of_entities_id_fk');
  });
});

// ---------------------------------------------------------------------------
// What the registry answers, and what a patch moves
// ---------------------------------------------------------------------------

describe('the single entity read', () => {
  it('answers the stored row with the domain it sits in', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedEntities(store);

    // The domain comes off the seam's KEY rather than off the
    // planted row, which is what puts it on the answer at all — and
    // it is the only thing in a request addressed by id that can
    // say whose registry was read.
    expect(await readEntity(store, KUBE)).toStrictEqual({
      aliasOf: null,
      attributes: { tier: 'core' },
      domainId: domain.id,
      id: KUBE,
      name: 'Kubernetes',
      nameNorm: KUBERNETES,
    });
  });

  it('answers null for an id no entity carries', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    expect(await store.findEntityById(9999)).toBeNull();
    expect(await store.findEntityById(KUBE)).not.toBeNull();
  });
});

describe('the entity patch', () => {
  it('moves both name columns or neither', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    const renamed = await store.updateEntity(KUBE, {
      name: { display: 'Kubernetes Core', norm: K8S + '-core' },
    });

    // A pair rather than two writes: `EntityNamePatch` is what makes
    // a display-only move unexpressible, so this case reads both
    // columns off one request.
    expect(renamed).toMatchObject({
      name: 'Kubernetes Core',
      nameNorm: K8S + '-core',
    });
    expect(await readEntity(store, KUBE)).toMatchObject({
      name: 'Kubernetes Core',
      nameNorm: K8S + '-core',
    });
  });

  it('replaces the attributes payload whole', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    expect(
      await store.updateEntity(KUBE, { attributes: { owner: 'platform' } }),
    ).toMatchObject({ attributes: { owner: 'platform' } });

    // WHOLE and never merged, so the member the fixture planted is
    // gone rather than standing beside the new one.
    expect(await readEntity(store, KUBE)).toMatchObject({
      attributes: { owner: 'platform' },
    });

    // And an empty object is a value rather than an absence, which
    // is the only shape under which clearing is expressible.
    await store.updateEntity(KUBE, { attributes: {} });

    expect((await readEntity(store, KUBE)).attributes).toStrictEqual({});
  });

  it('leaves every member a patch does not name alone', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedEntities(store);

    // The empty patch: three absences at once, so a store defaulting
    // any of the three answers something this comparison names.
    expect(await store.updateEntity(POINTER, {})).toStrictEqual({
      aliasOf: KUBE,
      attributes: {},
      domainId: domain.id,
      id: POINTER,
      name: 'K8s',
      nameNorm: K8S,
    });
  });

  it('answers null for an id no entity carries', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    expect(await store.updateEntity(9999, { aliasOf: KUBE })).toBeNull();

    // Nothing was written under that id, and the live sibling in the
    // same case says the call still writes at all.
    expect(await store.findEntityById(9999)).toBeNull();
    expect(await store.updateEntity(MESH, { aliasOf: KUBE })).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The two collections a subject carries, and the orders they run in
// ---------------------------------------------------------------------------

describe('the research a subject has accumulated', () => {
  it('answers it newest first with id breaking a tie', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    // Planted in an order this answer is neither, so the ordering
    // is told from the planted one and from id in either direction.
    // The tied pair was planted LOW FIRST, which is what a stable
    // sort with the tiebreak gone answers the wrong way round.
    expect(await researchPage(store, KUBE)).toStrictEqual([
      PASS_TIED_HIGH,
      PASS_TIED_LOW,
      PASS_OLDEST,
    ]);
  });

  it('answers those rows one member short', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    const [pass] = await store.listEntityResearch(KUBE, WHOLE_COLLECTION);

    // One seam, one table and two projections: this half drops
    // `entityId` because the subject is the PATH, and the findings
    // half keeps it because a caller there named a finding.
    expect(Object.keys(pass ?? {}).sort()).toStrictEqual([
      'id',
      'payload',
      'researchedAt',
      'runId',
      'summary',
    ]);
    expect(pass).toMatchObject({
      id: PASS_TIED_HIGH,
      payload: { pass: PASS_TIED_HIGH },
    });
  });

  it('scopes the collection to the subject it was asked about', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    expect(await researchPage(store, MESH)).toStrictEqual([PASS_ON_MESH]);
    expect(await store.countEntityResearch(MESH)).toBe(1);
    expect(await store.countEntityResearch(KUBE)).toBe(3);
  });

  it('windows the page and counts the whole either way', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    expect(
      await researchPage(store, KUBE, { limit: 2, offset: 1 }),
    ).toStrictEqual([PASS_TIED_LOW, PASS_OLDEST]);

    // The window is not the count's to read, so a page past the end
    // is empty beside a total that is not.
    expect(
      await researchPage(store, KUBE, { limit: 2, offset: 9 }),
    ).toStrictEqual([]);
    expect(await store.countEntityResearch(KUBE)).toBe(3);
  });

  it('answers an empty list and a zero for an unknown id', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    expect(await researchPage(store, 9999)).toStrictEqual([]);
    expect(await store.countEntityResearch(9999)).toBe(0);
    expect(await researchPage(store, KUBE)).toHaveLength(3);
  });
});

describe('the intentions queued against a subject', () => {
  it('answers them oldest first with id breaking a tie', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    // ASCENDING where every other collection here descends, which is
    // `listPending` in `scripts/approve.ts` member for member. The
    // tied pair was planted HIGH FIRST, the mirror of the research
    // fixture and reversed for the same reason.
    expect(await poolPage(store, KUBE)).toStrictEqual([
      QUEUED_FIRST,
      QUEUED_TIED_LOW,
      QUEUED_TIED_HIGH,
    ]);
  });

  it('keeps a row naming no subject out of every page', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    // The null is an ordinary state and it belongs to no subject, so
    // it is in nobody's page and in nobody's count — while still
    // being readable by its own id, which the next describe reads.
    expect(await poolPage(store, KUBE)).not.toContain(UNATTRIBUTED);
    expect(await poolPage(store, MESH)).toStrictEqual([ON_MESH]);
    expect(await store.countEntityPool(KUBE)).toBe(3);
    expect(await store.countEntityPool(MESH)).toBe(1);
  });

  it('is not narrowed to the rows still waiting', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    const page = await store.listEntityPool(KUBE, WHOLE_COLLECTION);

    // A subject's own queue is a history of what was ever asked
    // about it, which is where this differs from the CLI listing it
    // shares an order with.
    expect(page.map((row) => row.status)).toStrictEqual([
      'pending',
      'approved',
      'done',
    ]);
  });

  it('windows the page and counts the whole either way', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    expect(
      await poolPage(store, KUBE, { limit: 1, offset: 2 }),
    ).toStrictEqual([QUEUED_TIED_HIGH]);
    expect(
      await poolPage(store, KUBE, { limit: 2, offset: 9 }),
    ).toStrictEqual([]);
    expect(await store.countEntityPool(KUBE)).toBe(3);
  });

  it('answers an empty list and a zero for an unknown id', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    expect(await poolPage(store, 9999)).toStrictEqual([]);
    expect(await store.countEntityPool(9999)).toBe(0);
    expect(await poolPage(store, KUBE)).toHaveLength(3);
  });
});

describe('the intention read by its own id', () => {
  it('answers a row whatever subject it names', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    // UNSCOPED on purpose: a read narrowed to the entity would
    // answer null for `no such row` and for `not this subject's row`
    // alike, and only one of those is honest. What the row is FOR is
    // the service's question, and `entityId` is what it holds
    // against the addressed subject.
    expect(await readPoolRow(store, ON_MESH)).toMatchObject({
      entityId: MESH,
    });
    expect(await readPoolRow(store, UNATTRIBUTED)).toMatchObject({
      entityId: null,
    });
  });

  it('answers the row whole, its terms included', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    expect(await readPoolRow(store, QUEUED_TIED_HIGH)).toStrictEqual({
      approvedAt: new Date(RULED_AT),
      createdAt: new Date(RAISED_T1),
      entityId: KUBE,
      findingId: null,
      id: QUEUED_TIED_HIGH,
      researchedAt: new Date(CLOSED_AT),
      searchTerms: ['terms for 95'],
      status: 'done',
    });
  });

  it('answers null for an id no intention carries', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    expect(await store.findPoolRowById(9999)).toBeNull();
    expect(await store.findPoolRowById(QUEUED_FIRST)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The check the seam holds, and the approval that keeps its first stamp
// ---------------------------------------------------------------------------

describe('the research_pool_approval_check', () => {
  it('refuses a closed row carrying no approval', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedEntities(store);

    const refusal = await refusalFrom(async () => {
      store.setDomainPool(domain.id, [
        queued(101, {
          entityId: KUBE,
          researchedAt: new Date(CLOSED_AT),
          status: 'done',
        }),
      ]);
    });

    expect(refusal.reason).toBe('check-violation');
    expect(refusal.constraint).toBe('research_pool_approval_check');
  });

  it('takes the same row once it also states an approval', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedEntities(store);

    // The check read from its other side, and the control that makes
    // the refusal above about the PAIR rather than about the stamp:
    // the identical closing instant is stored once an approval
    // stands beside it.
    store.setDomainPool(domain.id, [
      queued(101, {
        approvedAt: new Date(RULED_AT),
        entityId: KUBE,
        researchedAt: new Date(CLOSED_AT),
        status: 'done',
      }),
    ]);

    expect(await readPoolRow(store, 101)).toMatchObject({
      researchedAt: new Date(CLOSED_AT),
    });
  });

  it('leaves the previous plant standing when it refuses', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedEntities(store);

    await refusalFrom(async () => {
      store.setDomainPool(domain.id, [
        queued(101, { entityId: KUBE }),
        queued(102, {
          entityId: KUBE,
          researchedAt: new Date(CLOSED_AT),
          status: 'done',
        }),
      ]);
    });

    // The batch lands NOWHERE: the legal row beside the refused one
    // is not stored either, and what was planted before is still
    // there. A guard applied row by row as it stored would leave the
    // collection half written, which one statement cannot produce.
    expect(await store.findPoolRowById(101)).toBeNull();
    expect(await poolPage(store, KUBE)).toStrictEqual([
      QUEUED_FIRST,
      QUEUED_TIED_LOW,
      QUEUED_TIED_HIGH,
    ]);
  });

  it('never consults the status the row states', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedEntities(store);

    // The constraint holds the two timestamps against each other and
    // reads nothing else, so a row calling itself done with neither
    // stamp set is storable — and is stored.
    store.setDomainPool(domain.id, [
      queued(101, { entityId: KUBE, status: 'done' }),
    ]);

    expect(await readPoolRow(store, 101)).toMatchObject({
      approvedAt: null,
      researchedAt: null,
      status: 'done',
    });
  });
});

describe('the approval that keeps the first ruling stamp', () => {
  it('stamps the approval and moves the status', async () => {
    const ruled = new Date('2026-05-10T10:00:00.000Z');
    const store = createMemoryResearchStore({ now: () => ruled });

    await seedEntities(store);

    expect(await store.approvePoolRow(QUEUED_FIRST)).toMatchObject({
      approvedAt: ruled,
      id: QUEUED_FIRST,
      status: 'approved',
    });
    expect(await readPoolRow(store, QUEUED_FIRST)).toMatchObject({
      approvedAt: ruled,
      status: 'approved',
    });
  });

  it('keeps the first instant when it is ruled on twice', async () => {
    let reading = new Date('2026-05-10T10:00:00.000Z');
    const store = createMemoryResearchStore({ now: () => reading });

    await seedEntities(store);

    const first = await store.approvePoolRow(QUEUED_FIRST);

    reading = new Date('2026-05-11T10:00:00.000Z');

    // The clock has moved, so a store writing a bare `now()` answers
    // the second reading here. `coalesce(approved_at, now())` answers
    // the first, which is what makes ruling twice a no-op rather than
    // a way to re-date a search already paid for.
    const second = await store.approvePoolRow(QUEUED_FIRST);

    expect(second?.approvedAt).toStrictEqual(first?.approvedAt);
    expect(second?.approvedAt).toStrictEqual(
      new Date('2026-05-10T10:00:00.000Z'),
    );

    // The control that says the clock did move: a row nobody has
    // ruled on takes the SECOND reading.
    expect(await store.approvePoolRow(ON_MESH)).toMatchObject({
      approvedAt: new Date('2026-05-11T10:00:00.000Z'),
    });
  });

  it('ratifies a closed row without moving its stamp', async () => {
    const store = createMemoryResearchStore({
      now: () => new Date('2026-05-11T10:00:00.000Z'),
    });

    await seedEntities(store);

    // Nothing is asked of the row's state. An id naming a row already
    // closed moves the status back to approved and leaves both stamps
    // where they were, which is exactly what the constraint permits.
    expect(await store.approvePoolRow(QUEUED_TIED_HIGH)).toStrictEqual({
      approvedAt: new Date(RULED_AT),
      createdAt: new Date(RAISED_T1),
      entityId: KUBE,
      findingId: null,
      id: QUEUED_TIED_HIGH,
      researchedAt: new Date(CLOSED_AT),
      searchTerms: ['terms for 95'],
      status: 'approved',
    });
  });

  it('ratifies and never researches', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    await store.approvePoolRow(QUEUED_FIRST);

    // Two columns of one row move and nothing else does: no research
    // row is written, and no other intention is touched.
    expect(await researchPage(store, KUBE)).toStrictEqual([
      PASS_TIED_HIGH,
      PASS_TIED_LOW,
      PASS_OLDEST,
    ]);
    expect(await store.countEntityResearch(KUBE)).toBe(3);
    expect(await readPoolRow(store, ON_MESH)).toMatchObject({
      approvedAt: null,
      status: 'pending',
    });
  });

  it('answers null for an id no intention carries', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    expect(await store.approvePoolRow(9999)).toBeNull();
    expect(await store.approvePoolRow(QUEUED_FIRST)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// What a domain delete takes, and the citation it does not hold
// ---------------------------------------------------------------------------

describe('the domain cascade over its entities', () => {
  it('takes its registry and leaves another domain standing', async () => {
    const store = createMemoryResearchStore();
    const { domain, other } = await seedEntities(store);

    expect(await store.deleteDomain(domain.id)).toBe(true);

    expect(await store.findEntityById(KUBE)).toBeNull();
    expect(await store.findEntityById(MESH)).toBeNull();
    expect(await store.findEntityById(POINTER)).toBeNull();

    // The other domain's subject is standing, so this is a cascade
    // rather than a store that cleared everything.
    expect(await readEntity(store, ELSEWHERE)).toMatchObject({
      domainId: other.id,
    });
  });

  it('takes the research hanging off those entities', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedEntities(store);

    // The state before, so the empties below are a delete reaching
    // them rather than reads that never answered.
    expect(await store.countEntityResearch(KUBE)).toBe(3);
    expect(await store.countEntityResearch(MESH)).toBe(1);

    expect(await store.deleteDomain(domain.id)).toBe(true);

    // Two levels down: `entities.domain_id` cascades and
    // `entity_research.entity_id` cascades onto the entities.
    expect(await researchPage(store, KUBE)).toStrictEqual([]);
    expect(await store.countEntityResearch(KUBE)).toBe(0);
    expect(await store.countEntityResearch(MESH)).toBe(0);
  });

  it('takes its intentions, the one naming no subject too', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedEntities(store);

    // The state before, so the nulls below are a delete reaching
    // them rather than reads that never answered.
    expect(await store.findPoolRowById(UNATTRIBUTED)).not.toBeNull();
    expect(await store.countEntityPool(KUBE)).toBe(3);

    expect(await store.deleteDomain(domain.id)).toBe(true);

    // `research_pool.domain_id` cascades DIRECTLY rather than through
    // the entities, which is why the row naming nobody goes with the
    // rest. A cascade written through the registry would leave it.
    expect(await store.findPoolRowById(UNATTRIBUTED)).toBeNull();
    expect(await store.findPoolRowById(QUEUED_FIRST)).toBeNull();
    expect(await store.findPoolRowById(ON_MESH)).toBeNull();
    expect(await poolPage(store, KUBE)).toStrictEqual([]);
    expect(await store.countEntityPool(KUBE)).toBe(0);
  });

  it('leaves research planted under an id no entity carries', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedEntities(store);

    store.setEntityResearch(9001, [passOn(103, RESEARCHED_T0)]);

    expect(await store.deleteDomain(domain.id)).toBe(true);

    // The seam takes an ID rather than a row, so research planted
    // under a subject nothing registers has nothing to cascade FROM
    // and survives — which is the state the findings half's own
    // fixture is in, and the reason its cases go on reading research
    // over a store holding no entity at all.
    expect(await researchPage(store, 9001)).toStrictEqual([103]);
  });
});

describe('the entity delete a cross-domain citation does not hold', () => {
  it('takes a delete another domain intention would refuse', async () => {
    const store = createMemoryResearchStore();
    const { domain, other } = await seedEntities(store);

    store.setDomainPool(other.id, [queued(104, { entityId: KUBE })]);

    // The file's SIXTH known divergence, pinned rather than left to
    // be discovered. `research_pool.entity_id` is `ON DELETE no
    // action`, so a deployment refuses this delete: the intention
    // raised in the second domain is outside the first's cascade and
    // still names one of its subjects at the end of the statement.
    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await store.findEntityById(KUBE)).toBeNull();

    // And the citation is left dangling here, which is what says the
    // divergence is a delete taken rather than a row cleaned up.
    expect(await readPoolRow(store, 104)).toMatchObject({ entityId: KUBE });
  });

  it('holds nothing when both rows go together', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedEntities(store);

    // The control that makes the divergence above about the SECOND
    // domain rather than about the key: a citation inside one domain
    // is removed by the same statement, which is why a deployment's
    // end-of-statement check finds nothing to refuse.
    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await store.findPoolRowById(QUEUED_FIRST)).toBeNull();
    expect(await store.findEntityById(KUBE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// What the entities half copies across the boundary
// ---------------------------------------------------------------------------

describe('the entity payload crossing the boundary', () => {
  it('does not store the attributes object a plant was handed', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const attributes: Record<string, unknown> = { tier: 'core' };

    store.setDomainEntities(domain.id, [registered(KUBE, { attributes })]);

    attributes.tier = 'edge';

    expect((await readEntity(store, KUBE)).attributes).toStrictEqual({
      tier: 'core',
    });
  });

  it('does not store the attributes object a patch was handed', async () => {
    const store = createMemoryResearchStore();
    const attributes: Record<string, unknown> = { tier: 'core' };

    await seedEntities(store);
    await store.updateEntity(MESH, { attributes });

    attributes.tier = 'edge';

    // The other direction, in its own case so the two are told apart
    // by which one reddens: one seam and one writer, and a store
    // keeping either lets a caller write into stored state.
    expect((await readEntity(store, MESH)).attributes).toStrictEqual({
      tier: 'core',
    });
  });

  it('does not share the attributes object it answers', async () => {
    const store = createMemoryResearchStore();

    await seedEntities(store);

    const answered = await readEntity(store, KUBE);
    const payload = answered.attributes as Record<string, unknown>;

    payload.tier = 'edge';

    expect((await readEntity(store, KUBE)).attributes).toStrictEqual({
      tier: 'core',
    });
  });

  it('does not store or answer the stamps a plant was handed', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const raised = new Date(RAISED_T0);
    const ruled = new Date(RULED_AT);

    store.setDomainPool(domain.id, [
      queued(101, { approvedAt: ruled, createdAt: raised, entityId: KUBE }),
    ]);

    raised.setUTCFullYear(2030);
    ruled.setUTCFullYear(2030);

    const stored = await readPoolRow(store, 101);

    expect(stored.createdAt.getTime()).toBe(Date.UTC(2026, 4, 3, 9));
    expect(stored.approvedAt?.getTime()).toBe(Date.UTC(2026, 4, 5, 9));

    stored.createdAt.setUTCFullYear(2031);
    stored.approvedAt?.setUTCFullYear(2031);

    const again = await readPoolRow(store, 101);

    expect(again.createdAt.getTime()).toBe(Date.UTC(2026, 4, 3, 9));
    expect(again.approvedAt?.getTime()).toBe(Date.UTC(2026, 4, 5, 9));
  });

  it('does not share the search terms it answers', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const searchTerms = ['as raised'];

    store.setDomainPool(domain.id, [
      queued(101, { entityId: KUBE, searchTerms }),
    ]);

    searchTerms.push('added after');

    const stored = await readPoolRow(store, 101);

    expect(stored.searchTerms).toStrictEqual(['as raised']);

    (stored.searchTerms as string[]).push('added after');

    expect((await readPoolRow(store, 101)).searchTerms).toStrictEqual([
      'as raised',
    ]);
  });

  it('rebuilds the planted registry rather than holding it', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const rows = [registered(KUBE)];

    store.setDomainEntities(domain.id, rows);

    rows.push(registered(MESH));

    // The seam copies row by row AND rebuilds the array, so pushing
    // onto what was planted does not plant a second subject.
    expect(await store.findEntityById(MESH)).toBeNull();

    // A second call REPLACES rather than appends, and it replaces
    // what a PATCH wrote as readily as what a plant did — which is
    // the one thing this seam does that no other one here can.
    await store.updateEntity(KUBE, { attributes: { tier: 'core' } });
    store.setDomainEntities(domain.id, [registered(KUBE)]);

    expect((await readEntity(store, KUBE)).attributes).toStrictEqual({});
  });

  it('rebuilds the planted queue rather than holding it', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const rows = [queued(101, { entityId: KUBE })];

    store.setDomainPool(domain.id, rows);

    rows.push(queued(102, { entityId: KUBE }));

    expect(await poolPage(store, KUBE)).toStrictEqual([101]);

    store.setDomainPool(domain.id, []);

    expect(await poolPage(store, KUBE)).toStrictEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The runs half's fixture
// ---------------------------------------------------------------------------

/**
 * The three instants the passes were opened across, and the one they
 * finished at.
 *
 * SPELLED OUT RATHER THAN DERIVED FROM ONE ANOTHER, on the terms
 * {@link MADE_T0} states, and kept clear of every other half's stamps:
 * nothing else here plants a `runs` row, so these are read by this
 * section alone.
 */
const STARTED_T0 = '2026-06-01T09:00:00.000Z';
const STARTED_T1 = '2026-06-02T09:00:00.000Z';
const STARTED_T2 = '2026-06-03T09:00:00.000Z';
const FINISHED_AT = '2026-06-02T10:00:00.000Z';

/**
 * The three instants the ledger was written across, chosen so the
 * summary's two axes are both readable off one fixture.
 *
 * `CALLED_T0` AND `CALLED_T1` STRADDLE A UTC MIDNIGHT one millisecond
 * apart, which is what says the day bucket is a truncation rather
 * than a rounding: a store bucketing in the process's own zone puts
 * the pair together anywhere but UTC, and every count beside it still
 * adds up.
 *
 * `CALLED_T2` LEAVES TWO WHOLE DAYS EMPTY behind it, which is what
 * lets a case read that no bucket exists for a day nothing landed on.
 * A contiguous run of days could not say it.
 */
const CALLED_T0 = '2026-06-10T23:59:59.999Z';
const CALLED_T1 = '2026-06-11T00:00:00.000Z';
const CALLED_T2 = '2026-06-14T09:00:00.000Z';

/** The three UTC days those instants fall on, as bucket keys. */
const DAY_BEFORE = Date.UTC(2026, 5, 10);
const DAY_OF = Date.UTC(2026, 5, 11);
const DAY_LATER = Date.UTC(2026, 5, 14);

/**
 * The five passes the runs fixture plants, named for what each is in
 * the rules rather than for its id.
 *
 * The ids are the fixture's own, `RunStore` declaring no insert.
 * `RUN_TIED_LOW` and `RUN_TIED_HIGH` carry ONE instant, so only `id`
 * separates them, and they are planted LOW FIRST — a stable sort that
 * lost the descending tiebreak answers them the wrong way round
 * rather than reproducing the answer by accident. `RUN_OLDEST` is the
 * HIGHEST id of the three and the OLDEST stamp, so the two keys
 * disagree on every pair it is in and an ordering by `id` alone
 * cannot look right.
 *
 * `RUN_TICK` NAMES NO DOMAIN and is the NEWEST of all five, so it
 * heads the unfiltered page and appears in none of the narrowed ones.
 * `RUN_ELSEWHERE` belongs to a second domain and ties with
 * `RUN_OLDEST` on the stamp, which is what makes the unfiltered
 * page's tiebreak a comparison across two domains rather than within
 * one.
 */
const RUN_TIED_LOW = 121;
const RUN_TIED_HIGH = 122;
const RUN_OLDEST = 123;
const RUN_TICK = 124;
const RUN_ELSEWHERE = 125;

/**
 * The nine model calls the ledger fixture plants.
 *
 * THE THREE ON `RUN_TIED_HIGH` REPEAT THE RUNS FIXTURE'S SHAPE one
 * table down: `CALL_TIED_LOW` and `CALL_TIED_HIGH` share `CALLED_T1`
 * and are planted low first, and `CALL_OLDEST` is the highest id of
 * the three with the oldest stamp.
 *
 * THE OTHER SIX ARE THE SUMMARY'S SUBJECTS. `CALL_UNMEASURED` records
 * neither magnitude, `CALL_PART_MEASURED` records one of the two, and
 * `CALL_ON_NOTHING` names no run at all — so a bucket can be read for
 * a count that outruns its sums, for two sums taken separately, and
 * for the two kinds of unattributed spend landing together.
 */
const CALL_TIED_LOW = 141;
const CALL_TIED_HIGH = 142;
const CALL_OLDEST = 143;
const CALL_UNMEASURED = 144;
const CALL_ON_TICK = 145;
const CALL_PART_MEASURED = 146;
const CALL_ON_NOTHING = 147;
const CALL_ELSEWHERE_EARLY = 148;
const CALL_ELSEWHERE = 149;

/** How many calls the ledger fixture plants, all told. */
const LEDGERED_CALLS = 9;

/** The filter that narrows nothing, on {@link EVERY_KIND}'s terms. */
const EVERY_RUN = {};

/** A limit wide enough to read every call any case here plants. */
const WHOLE_LEDGER = 50;

/** What {@link madePass} defaults when a case is not about it. */
type RunDefaults = Partial<Omit<MemoryRun, 'id'>>;

/**
 * Builds one row for {@link MemoryResearchStore.setRuns}.
 *
 * A function rather than a constant, for the reason {@link planted}
 * is one: the copy cases WRITE into the `counts` and `errors` they
 * planted, which is the whole point of them.
 *
 * @param id - The pass's id, which is what `GET /runs/:id` and every
 *   ledger read are addressed by.
 * @param values - The seven members a case may care about.
 *   `domainId` defaults to NULL, which is the state a case has to
 *   name a domain to leave rather than the other way round, and
 *   `finishedAt` defaults to null so an unfinished pass is the
 *   cheaper fixture.
 * @returns The row to plant.
 */
function madePass(id: number, values: RunDefaults = {}): MemoryRun {
  return {
    id,
    domainId: values.domainId ?? null,
    startedAt: values.startedAt ?? new Date(STARTED_T0),
    finishedAt: values.finishedAt ?? null,
    status: values.status ?? 'ok',
    counts: values.counts ?? {},
    errors: values.errors ?? [],
    scheduledBy: values.scheduledBy ?? 'interval',
  };
}

/** What {@link ledgered} defaults when a case is not about it. */
type CallDefaults = Partial<Omit<MemoryLlmCall, 'id'>>;

/**
 * Builds one row for {@link MemoryResearchStore.setLlmCalls}.
 *
 * @param id - The call's id, which is the ledger's tiebreak.
 * @param values - The six members a case may care about. Both
 *   magnitudes default to null, which is the unmeasured state, and
 *   `runId` defaults to null on {@link madePass}'s reasoning: a case
 *   that means a call to belong to a pass says so.
 * @returns The row to plant.
 */
function ledgered(id: number, values: CallDefaults = {}): MemoryLlmCall {
  return {
    id,
    runId: values.runId ?? null,
    node: values.node ?? `node-${id}`,
    model: values.model ?? null,
    promptChars: values.promptChars ?? null,
    estTokens: values.estTokens ?? null,
    calledAt: values.calledAt ?? new Date(CALLED_T1),
  };
}

/**
 * Two domains, five passes across them and the ledger under four of
 * those passes.
 *
 * PLANTED IN AN ORDER NO READ ANSWERS, on the terms
 * {@link seedFindings} states, in both collections.
 *
 * @param store - The store to write to.
 * @returns Both domains: the one three passes ran for, and the one
 *   the fifth ran for.
 */
async function seedRuns(
  store: MemoryResearchStore,
): Promise<{ domain: DomainRecord; other: DomainRecord }> {
  const domain = await store.insertDomain(domainInput(RADAR));
  const other = await store.insertDomain(domainInput(TRANSIT));

  store.setRuns([
    madePass(RUN_TIED_LOW, {
      counts: { findings: 4 },
      domainId: domain.id,
      finishedAt: new Date(FINISHED_AT),
      startedAt: new Date(STARTED_T1),
    }),
    madePass(RUN_OLDEST, {
      domainId: domain.id,
      errors: [{ node: 'capture' }],
      finishedAt: new Date(FINISHED_AT),
      startedAt: new Date(STARTED_T0),
      status: 'failed',
    }),
    madePass(RUN_TIED_HIGH, {
      domainId: domain.id,
      finishedAt: new Date(FINISHED_AT),
      scheduledBy: 'agent',
      startedAt: new Date(STARTED_T1),
      status: 'partial',
    }),
    madePass(RUN_ELSEWHERE, {
      domainId: other.id,
      finishedAt: new Date(FINISHED_AT),
      startedAt: new Date(STARTED_T0),
    }),
    madePass(RUN_TICK, {
      scheduledBy: 'operator',
      startedAt: new Date(STARTED_T2),
      status: 'running',
    }),
  ]);

  store.setLlmCalls([
    ledgered(CALL_TIED_LOW, {
      estTokens: 50,
      promptChars: 200,
      runId: RUN_TIED_HIGH,
    }),
    ledgered(CALL_OLDEST, {
      calledAt: new Date(CALLED_T0),
      estTokens: 25,
      promptChars: 100,
      runId: RUN_TIED_HIGH,
    }),
    ledgered(CALL_ELSEWHERE_EARLY, {
      estTokens: 3,
      promptChars: 7,
      runId: RUN_ELSEWHERE,
    }),
    ledgered(CALL_ON_TICK, {
      estTokens: 1,
      promptChars: 10,
      runId: RUN_TICK,
    }),
    ledgered(CALL_ON_NOTHING, {}),
    ledgered(CALL_TIED_HIGH, {
      estTokens: 75,
      promptChars: 300,
      runId: RUN_TIED_HIGH,
    }),
    ledgered(CALL_ELSEWHERE, {
      calledAt: new Date(CALLED_T2),
      runId: RUN_ELSEWHERE,
    }),
    ledgered(CALL_PART_MEASURED, { promptChars: 20, runId: RUN_TICK }),
    ledgered(CALL_UNMEASURED, { runId: RUN_OLDEST }),
  ]);

  return { domain, other };
}

/**
 * Reads one window of the passes the service has made.
 *
 * @param store - The store to read.
 * @param filter - What to narrow to, nothing by default.
 * @param window - How much to take, the whole collection by default.
 * @returns The ids in the order they arrived.
 */
async function runsPage(
  store: MemoryResearchStore,
  filter: RunFilter = EVERY_RUN,
  window = WHOLE_COLLECTION,
): Promise<number[]> {
  const page = await store.listRuns(filter, window);

  return page.map((row) => row.id);
}

/**
 * Reads the head of one pass's ledger.
 *
 * @param store - The store to read.
 * @param runId - The pass to read within.
 * @param limit - How many rows to take, the whole ledger by default.
 * @returns The ids in the order they arrived.
 */
async function ledgerPage(
  store: MemoryResearchStore,
  runId: number,
  limit = WHOLE_LEDGER,
): Promise<number[]> {
  const page = await store.listRunLedger(runId, limit);

  return page.map((row) => row.id);
}

/**
 * Reads a pass that must be there.
 *
 * @param store - The store to read.
 * @param id - The id to read under.
 * @returns The row.
 * @throws When no run carries the id, for the reason
 *   {@link readDomain} throws: two absences otherwise compare equal.
 */
async function readRun(
  store: MemoryResearchStore,
  id: number,
): Promise<RunRecord> {
  const row = await store.findRunById(id);

  if (row === null) {
    throw new Error(`expected a stored run under ${id}`);
  }

  return row;
}

/**
 * Names one bucket by the pair it is grouped on.
 *
 * The two axes and neither magnitude, so an ordering assertion reads
 * as the grouping rather than as a wall of numbers.
 *
 * @param bucket - The bucket to name.
 * @returns Its UTC day and its domain, the null spelled out.
 */
function bucketKey(bucket: SpendBucket): string {
  return `${bucket.day.toISOString()}/${bucket.domainId ?? 'none'}`;
}

/**
 * Reads the spend summary.
 *
 * @param store - The store to read.
 * @param filter - What to narrow to, nothing by default.
 * @param window - The span to summarise, unbounded by default.
 * @returns The buckets in the order they arrived.
 */
async function spendPage(
  store: MemoryResearchStore,
  filter: RunFilter = EVERY_RUN,
  window: TimeWindow = EVERY_INSTANT,
): Promise<readonly SpendBucket[]> {
  return store.summariseSpend(filter, window);
}

// ---------------------------------------------------------------------------
// The runs page, its order and its one narrowing
// ---------------------------------------------------------------------------

describe('the runs page ordering', () => {
  it('answers it newest first with id breaking a tie', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedRuns(store);
    const page = await runsPage(store, { domainId: domain.id });

    // Planted in an order this answer is neither, so the ordering is
    // told from the planted one and from id in either direction. The
    // tied pair was planted LOW FIRST, which is what a stable sort
    // with the tiebreak gone answers the wrong way round.
    expect(page).toStrictEqual([RUN_TIED_HIGH, RUN_TIED_LOW, RUN_OLDEST]);

    // The four orders it is NOT, written out: a small page agreeing
    // with any of them would be reproducing the answer by accident.
    expect(page).not.toStrictEqual([RUN_TIED_LOW, RUN_OLDEST, RUN_TIED_HIGH]);
    expect(page).not.toStrictEqual([RUN_TIED_HIGH, RUN_OLDEST, RUN_TIED_LOW]);
    expect(page).not.toStrictEqual([RUN_OLDEST, RUN_TIED_HIGH, RUN_TIED_LOW]);
    expect(page).not.toStrictEqual([RUN_TIED_LOW, RUN_TIED_HIGH, RUN_OLDEST]);
  });

  it('breaks a tie across two domains on the unfiltered page', async () => {
    const store = createMemoryResearchStore();

    await seedRuns(store);

    // The tick heads it, then the tied pair, then the two oldest — and
    // those two belong to DIFFERENT domains, so the tiebreak here is a
    // comparison the narrowed pages above cannot make.
    expect(await runsPage(store)).toStrictEqual([
      RUN_TICK,
      RUN_TIED_HIGH,
      RUN_TIED_LOW,
      RUN_ELSEWHERE,
      RUN_OLDEST,
    ]);
  });

  it('windows the page and counts the whole either way', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedRuns(store);
    const filter = { domainId: domain.id };

    expect(
      await runsPage(store, filter, { limit: 2, offset: 1 }),
    ).toStrictEqual([RUN_TIED_LOW, RUN_OLDEST]);

    // The window is not the count's to read, so a page past the end
    // is empty beside a total that is not.
    expect(
      await runsPage(store, filter, { limit: 2, offset: 9 }),
    ).toStrictEqual([]);
    expect(await store.countRuns(filter)).toBe(3);
  });

  it('answers those rows whole', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedRuns(store);
    const [newest] = await store.listRuns(
      { domainId: domain.id },
      WHOLE_COLLECTION,
    );

    // `runs` WHOLE and no member added: the eight columns the table
    // declares, and no ninth riding along. A key set is what says so
    // — `toMatchObject` passes over a record answering an extra one.
    expect(Object.keys(newest ?? {}).sort()).toStrictEqual([
      'counts',
      'domainId',
      'errors',
      'finishedAt',
      'id',
      'scheduledBy',
      'startedAt',
      'status',
    ]);
    expect(newest).toMatchObject({
      counts: {},
      domainId: domain.id,
      id: RUN_TIED_HIGH,
      scheduledBy: 'agent',
      status: 'partial',
    });
  });
});

describe('the runs page domain filter', () => {
  it('answers every run including the tick when none is named', async () => {
    const store = createMemoryResearchStore();

    await seedRuns(store);

    // Absent widens to the whole table rather than to the
    // domain-scoped half of it, which is what keeps this page
    // agreeing with `runs` about how much work the service has done.
    expect(await runsPage(store)).toContain(RUN_TICK);
    expect(await store.countRuns(EVERY_RUN)).toBe(5);
  });

  it('narrows to one domain and drops the tick with it', async () => {
    const store = createMemoryResearchStore();
    const { domain, other } = await seedRuns(store);
    const mine = await store.countRuns({ domainId: domain.id });
    const theirs = await store.countRuns({ domainId: other.id });
    const every = await store.countRuns(EVERY_RUN);

    expect(await runsPage(store, { domainId: other.id })).toStrictEqual([
      RUN_ELSEWHERE,
    ]);
    expect(await runsPage(store, { domainId: domain.id })).not.toContain(
      RUN_TICK,
    );

    // A PARTITION reading rather than two narrowed pages: the two
    // domains' counts plus the one tick are the whole table, so a
    // filter that had stopped narrowing could not satisfy this even
    // though each page above would still look plausible.
    expect(mine).toBe(3);
    expect(theirs).toBe(1);
    expect(mine + theirs + 1).toBe(every);
  });

  it('answers an empty page and a zero for an unknown id', async () => {
    const store = createMemoryResearchStore();

    await seedRuns(store);

    const filter = { domainId: 9999 };

    expect(await runsPage(store, filter)).toStrictEqual([]);
    expect(await store.countRuns(filter)).toBe(0);

    // Beside a control that says the store is not simply empty:
    // nothing points at a row that is not there.
    expect(await runsPage(store)).toHaveLength(5);
  });
});

describe('one run read by its own id', () => {
  it('answers a domain-scoped pass and a tick alike', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedRuns(store);

    expect(await readRun(store, RUN_OLDEST)).toMatchObject({
      domainId: domain.id,
      status: 'failed',
    });

    // A null `domainId` is the ordinary reading for a maintenance
    // tick rather than a row that failed to resolve, which is why the
    // read takes no domain to scope itself by.
    expect(await readRun(store, RUN_TICK)).toMatchObject({
      domainId: null,
      finishedAt: null,
      scheduledBy: 'operator',
      status: 'running',
    });
  });

  it('answers null for an id no run carries', async () => {
    const store = createMemoryResearchStore();

    await seedRuns(store);

    expect(await store.findRunById(9999)).toBeNull();
    expect(await store.findRunById(RUN_TIED_LOW)).not.toBeNull();
  });
});

describe('the ledger one run carries', () => {
  it('answers its calls newest first with id breaking a tie', async () => {
    const store = createMemoryResearchStore();

    await seedRuns(store);

    const page = await ledgerPage(store, RUN_TIED_HIGH);

    // The runs fixture's shape one table down, and read the same way:
    // the tied pair was planted low first, and the oldest call is the
    // highest id of the three, so the two keys disagree on every pair
    // it is in.
    expect(page).toStrictEqual([CALL_TIED_HIGH, CALL_TIED_LOW, CALL_OLDEST]);
    expect(page).not.toStrictEqual([
      CALL_TIED_LOW,
      CALL_OLDEST,
      CALL_TIED_HIGH,
    ]);
    expect(page).not.toStrictEqual([
      CALL_OLDEST,
      CALL_TIED_HIGH,
      CALL_TIED_LOW,
    ]);
  });

  it('cuts at the limit its caller passes and counts the whole', async () => {
    const store = createMemoryResearchStore();

    await seedRuns(store);

    // The cut drops the OLDEST end, which is what makes the order the
    // contract rather than a presentation choice.
    expect(await ledgerPage(store, RUN_TIED_HIGH, 2)).toStrictEqual([
      CALL_TIED_HIGH,
      CALL_TIED_LOW,
    ]);

    // And the full count is what makes that cut reportable: the
    // service compares the two into a truncation flag, so a limit
    // this method chose itself would answer a short list with nothing
    // saying it was short.
    expect(await store.countRunLedger(RUN_TIED_HIGH)).toBe(3);
    expect(await ledgerPage(store, RUN_TIED_HIGH, 1)).toStrictEqual([
      CALL_TIED_HIGH,
    ]);
  });

  it('keeps a call naming no run out of every ledger', async () => {
    const store = createMemoryResearchStore();

    await seedRuns(store);

    // Unreachable from every run id there is, both reads being
    // addressed by one — the summary is the single method that sees
    // these rows, which its own describes below read.
    for (const runId of [RUN_TIED_HIGH, RUN_OLDEST, RUN_TICK, RUN_ELSEWHERE]) {
      expect(await ledgerPage(store, runId)).not.toContain(CALL_ON_NOTHING);
    }

    // Beside the control that says the row IS stored: the ledgered
    // calls a run does claim add up to one short of the fixture.
    const claimed = await Promise.all([
      store.countRunLedger(RUN_TIED_HIGH),
      store.countRunLedger(RUN_OLDEST),
      store.countRunLedger(RUN_TICK),
      store.countRunLedger(RUN_ELSEWHERE),
    ]);

    expect(claimed).toStrictEqual([3, 1, 2, 2]);
    expect(claimed.reduce((sum, held) => sum + held, 0)).toBe(
      LEDGERED_CALLS - 1,
    );
  });

  it('answers those calls one member short', async () => {
    const store = createMemoryResearchStore();

    await seedRuns(store);

    const [call] = await store.listRunLedger(RUN_TIED_HIGH, WHOLE_LEDGER);

    // `run_id` is DROPPED where the sightings and the research put
    // their own key back: the run is the PATH here, so a caller
    // reading a run's ledger already holds it.
    expect(Object.keys(call ?? {}).sort()).toStrictEqual([
      'calledAt',
      'estTokens',
      'id',
      'model',
      'node',
      'promptChars',
    ]);
    expect(call).toMatchObject({
      estTokens: 75,
      id: CALL_TIED_HIGH,
      promptChars: 300,
    });
  });

  it('answers an empty list and a zero either way it is empty', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedRuns(store);

    store.setRuns([
      madePass(RUN_TIED_LOW, { domainId: domain.id }),
      madePass(RUN_OLDEST, { domainId: domain.id }),
    ]);
    store.setLlmCalls([]);

    // A pass that called nothing and an id no run carries are one
    // fact from these two methods' side, and the single read is what
    // separates them.
    expect(await ledgerPage(store, RUN_TIED_LOW)).toStrictEqual([]);
    expect(await store.countRunLedger(RUN_TIED_LOW)).toBe(0);
    expect(await ledgerPage(store, 9999)).toStrictEqual([]);
    expect(await store.countRunLedger(9999)).toBe(0);
    expect(await store.findRunById(RUN_TIED_LOW)).not.toBeNull();
    expect(await store.findRunById(9999)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The spend summary: its two axes, its sums and its window
// ---------------------------------------------------------------------------

describe('the spend summary buckets', () => {
  it('splits a pair one millisecond apart across a UTC midnight', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedRuns(store);
    const mine = await spendPage(store, { domainId: domain.id });

    // Both calls belong to ONE run and one domain, so the only thing
    // that can separate them is the truncation — and they are one
    // millisecond apart, so a store truncating in the process's own
    // zone puts them together anywhere but UTC.
    expect(mine.map(bucketKey)).toStrictEqual([
      `${new Date(DAY_OF).toISOString()}/${domain.id}`,
      `${new Date(DAY_BEFORE).toISOString()}/${domain.id}`,
    ]);

    // The day is the instant that OPENS the bucket rather than a
    // label, which is what makes it comparable at all.
    expect(mine.map((bucket) => bucket.day.getTime())).toStrictEqual([
      DAY_OF,
      DAY_BEFORE,
    ]);
  });

  it('buckets the tick and the unrun call together under none', async () => {
    const store = createMemoryResearchStore();

    await seedRuns(store);

    const buckets = await spendPage(store);
    const nobody = buckets.filter((bucket) => bucket.domainId === null);

    // TWO KINDS OF UNATTRIBUTED CALL IN ONE BUCKET: two made during a
    // tick that named no domain, and one naming no run at all. The
    // record has no member that separates them, which is the honest
    // limit of the property below it.
    expect(nobody.map(bucketKey)).toStrictEqual([
      `${new Date(DAY_OF).toISOString()}/none`,
    ]);
    expect(nobody.map((bucket) => bucket.calls)).toStrictEqual([3]);
  });

  it('orders the buckets newest day first with the null last', async () => {
    const store = createMemoryResearchStore();
    const { domain, other } = await seedRuns(store);

    // `day` descending, then `domainId` ASCENDING with the null
    // bucket last. The middle day carries all three, which is what
    // makes the ascending key readable rather than only the null
    // rule: a store sorting the domains the other way would answer
    // the same five buckets in a different array.
    expect((await spendPage(store)).map(bucketKey)).toStrictEqual([
      `${new Date(DAY_LATER).toISOString()}/${other.id}`,
      `${new Date(DAY_OF).toISOString()}/${domain.id}`,
      `${new Date(DAY_OF).toISOString()}/${other.id}`,
      `${new Date(DAY_OF).toISOString()}/none`,
      `${new Date(DAY_BEFORE).toISOString()}/${domain.id}`,
    ]);
  });

  it('counts every call the window holds', async () => {
    const store = createMemoryResearchStore();

    await seedRuns(store);

    const buckets = await spendPage(store);
    const counted = buckets.reduce((sum, bucket) => sum + bucket.calls, 0);

    // The property a total taken from this summary rests on, and the
    // one an INNER join would break silently: the buckets' `calls`
    // add up to the number of calls in the window, the unattributed
    // ones included.
    expect(counted).toBe(LEDGERED_CALLS);
    expect(buckets).toHaveLength(5);
  });
});

describe('the spend summary magnitudes', () => {
  it('sums the measured calls beside a count of them all', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedRuns(store);
    const [busiest] = await spendPage(store, { domainId: domain.id });

    // Three calls, two of them measured: `calls` counts ROWS and the
    // sums cover the rows that recorded anything, so the two
    // disagreeing is information rather than a fault — it says how
    // much of the bucket was measured at all.
    expect(busiest).toStrictEqual({
      calls: 3,
      day: new Date(DAY_OF),
      domainId: domain.id,
      estTokens: 125,
      promptChars: 500,
    });
  });

  it('answers null rather than zero where nothing was measured', async () => {
    const store = createMemoryResearchStore();
    const { other } = await seedRuns(store);
    const theirs = await spendPage(store, { domainId: other.id });

    // Zero is a real reading of a prompt that sent nothing, so a
    // store coalescing an unmeasured bucket to it would report a day
    // of calls that sent nothing — the same shape as a day nobody
    // measured, with no member left to tell them apart.
    expect(theirs.map((bucket) => bucket.promptChars)).toStrictEqual([
      null,
      7,
    ]);
    expect(theirs.map((bucket) => bucket.estTokens)).toStrictEqual([null, 3]);
    expect(theirs.map((bucket) => bucket.calls)).toStrictEqual([1, 1]);
  });

  it('sums the two magnitudes separately', async () => {
    const store = createMemoryResearchStore();

    await seedRuns(store);

    const [nobody] = (await spendPage(store)).filter(
      (bucket) => bucket.domainId === null,
    );

    // One call measured on BOTH axes, one on the characters alone and
    // one on neither. A store summing either axis only when both were
    // recorded would answer 10 here rather than 30, and every count
    // beside it would still be right.
    expect(nobody).toMatchObject({
      calls: 3,
      estTokens: 1,
      promptChars: 30,
    });
  });
});

describe('the spend summary window', () => {
  it('takes the lower bound and drops the upper', async () => {
    const store = createMemoryResearchStore();
    const { domain, other } = await seedRuns(store);
    const buckets = await spendPage(store, EVERY_RUN, {
      sinceInclusive: new Date(CALLED_T1),
      untilExclusive: new Date(CALLED_T2),
    });

    // Half-open, and both bounds sit exactly ON a planted call: the
    // seven at the lower bound are IN and the one at the upper is
    // OUT, so two adjacent windows do not both take the seam a caller
    // paging through time crosses most often.
    expect(buckets.map(bucketKey)).toStrictEqual([
      `${new Date(DAY_OF).toISOString()}/${domain.id}`,
      `${new Date(DAY_OF).toISOString()}/${other.id}`,
      `${new Date(DAY_OF).toISOString()}/none`,
    ]);
    expect(
      buckets.reduce((sum, bucket) => sum + bucket.calls, 0),
    ).toBe(7);
  });

  it('answers no bucket for a day nothing landed on', async () => {
    const store = createMemoryResearchStore();

    await seedRuns(store);

    const days = (await spendPage(store, EVERY_RUN, {
      sinceInclusive: new Date(Date.UTC(2026, 5, 10)),
      untilExclusive: new Date(Date.UTC(2026, 5, 15)),
    })).map((bucket) => bucket.day.getTime());

    // A bucket exists because calls landed in it, so the two empty
    // days inside this five-day span are absent rather than zeroed —
    // a caller filling a chart supplies its own zeroes, and a store
    // inventing them would be answering a calendar nobody named.
    expect([...new Set(days)]).toStrictEqual([DAY_LATER, DAY_OF, DAY_BEFORE]);
    expect(days).not.toContain(Date.UTC(2026, 5, 12));
    expect(days).not.toContain(Date.UTC(2026, 5, 13));
  });

  it('answers an empty list for a window nothing was called in', async () => {
    const store = createMemoryResearchStore();

    await seedRuns(store);

    expect(await spendPage(store, EVERY_RUN, {
      sinceInclusive: new Date(Date.UTC(2026, 6, 1)),
      untilExclusive: new Date(Date.UTC(2026, 6, 2)),
    })).toStrictEqual([]);
    expect(await spendPage(store)).toHaveLength(5);
  });
});

describe('the spend summary domain filter', () => {
  it('reaches the domain through the run and drops both nulls', async () => {
    const store = createMemoryResearchStore();
    const { domain, other } = await seedRuns(store);
    const calls = async (filter: RunFilter): Promise<number> => {
      const buckets = await spendPage(store, filter);

      return buckets.reduce((sum, bucket) => sum + bucket.calls, 0);
    };
    const mine = await calls({ domainId: domain.id });
    const theirs = await calls({ domainId: other.id });

    // `llm_calls` carries no domain of its own, so this narrowing is
    // a join — and a PARTITION reading is what says so: the two
    // domains' summaries do NOT sum to the unfiltered one, and the
    // difference is exactly the unattributed spend rather than a
    // rounding of it.
    expect(mine).toBe(4);
    expect(theirs).toBe(2);
    expect(mine + theirs).toBe(LEDGERED_CALLS - 3);
    expect(await calls(EVERY_RUN)).toBe(LEDGERED_CALLS);

    // And an id no domain carries answers nothing rather than
    // failing: nothing points at a row that is not there.
    expect(await spendPage(store, { domainId: 9999 })).toStrictEqual([]);
  });
});

// ---------------------------------------------------------------------------
// What a domain delete reaches on this half, and what it does not
// ---------------------------------------------------------------------------

describe('the domain cascade over its runs', () => {
  it('takes its passes and leaves the tick and another standing', async () => {
    const store = createMemoryResearchStore();
    const { domain, other } = await seedRuns(store);

    // The state before, so the nulls below are a delete reaching them
    // rather than reads that never answered.
    expect(await store.countRuns(EVERY_RUN)).toBe(5);
    expect(await readRun(store, RUN_TIED_LOW)).toMatchObject({
      domainId: domain.id,
    });

    expect(await store.deleteDomain(domain.id)).toBe(true);

    expect(await store.findRunById(RUN_TIED_LOW)).toBeNull();
    expect(await store.findRunById(RUN_TIED_HIGH)).toBeNull();
    expect(await store.findRunById(RUN_OLDEST)).toBeNull();

    // The tick hangs off NO domain, so no domain delete reaches it,
    // and the second domain's pass is standing — so this is a cascade
    // reading the column off the row rather than a store that cleared
    // whatever it held.
    expect(await readRun(store, RUN_TICK)).toMatchObject({ domainId: null });
    expect(await readRun(store, RUN_ELSEWHERE)).toMatchObject({
      domainId: other.id,
    });
    expect(await runsPage(store)).toStrictEqual([RUN_TICK, RUN_ELSEWHERE]);
  });

  it('takes the ledger hanging off those passes', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedRuns(store);

    // The state before, so the empties below are a delete reaching
    // them rather than reads that never answered.
    expect(await store.countRunLedger(RUN_TIED_HIGH)).toBe(3);
    expect(await store.countRunLedger(RUN_OLDEST)).toBe(1);

    expect(await store.deleteDomain(domain.id)).toBe(true);

    // Two levels down: `runs.domain_id` cascades and
    // `llm_calls.run_id` cascades onto the runs.
    expect(await ledgerPage(store, RUN_TIED_HIGH)).toStrictEqual([]);
    expect(await store.countRunLedger(RUN_TIED_HIGH)).toBe(0);
    expect(await store.countRunLedger(RUN_OLDEST)).toBe(0);

    // And the tick's own calls are standing beside them, which is
    // what says the delete followed the domain rather than the table.
    expect(await ledgerPage(store, RUN_TICK)).toStrictEqual([
      CALL_PART_MEASURED,
      CALL_ON_TICK,
    ]);
    expect(await ledgerPage(store, RUN_ELSEWHERE)).toHaveLength(2);
  });

  it('leaves a call that named no run at all', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedRuns(store);
    const before = await spendPage(store);

    expect(
      before.reduce((sum, bucket) => sum + bucket.calls, 0),
    ).toBe(LEDGERED_CALLS);

    expect(await store.deleteDomain(domain.id)).toBe(true);

    const after = await spendPage(store);

    // Four calls went with the three passes and five are left — the
    // tick's two, the second domain's two, and the one hanging off
    // nothing this store can delete.
    expect(after.reduce((sum, bucket) => sum + bucket.calls, 0)).toBe(5);
    expect(
      after.filter((bucket) => bucket.domainId === null)
        .map((bucket) => bucket.calls),
    ).toStrictEqual([3]);
  });

  it('takes those passes out of the spend summary', async () => {
    const store = createMemoryResearchStore();
    const { domain, other } = await seedRuns(store);

    expect(await spendPage(store, { domainId: domain.id })).toHaveLength(2);

    expect(await store.deleteDomain(domain.id)).toBe(true);

    // The summary reaches a domain through its runs, so removing the
    // runs is the whole of how a deleted domain's spend goes — there
    // is no second line for `llm_calls` in the cascade and none is
    // needed.
    expect(await spendPage(store, { domainId: domain.id })).toStrictEqual([]);
    expect(await spendPage(store, { domainId: other.id })).toHaveLength(2);
  });
});

describe('the run delete a cross-domain result does not hold', () => {
  it('takes a delete another domain research would refuse', async () => {
    const store = createMemoryResearchStore();
    const { domain, other } = await seedRuns(store);
    const subject = 151;

    store.setDomainEntities(other.id, [registered(subject)]);
    store.setEntityResearch(subject, [
      { ...passOn(152, RESEARCHED_T0), runId: RUN_TIED_LOW },
    ]);

    // The state before, so the null below is a delete reaching the
    // run rather than a read that never answered — without it every
    // assertion here is an absence, and the case survives a control
    // that plants no pass at all.
    expect(await readRun(store, RUN_TIED_LOW)).toMatchObject({
      domainId: domain.id,
    });

    // The file's SEVENTH known divergence, pinned rather than left to
    // be discovered. `entity_research.run_id` is `ON DELETE no
    // action`, so a deployment refuses this delete: the result
    // recorded in the SECOND domain is outside the first's cascade and
    // still names one of its runs at the end of the statement — the
    // two-hop reading `src/db/schema/entities.ts` records as verified
    // against a real Postgres.
    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await store.findRunById(RUN_TIED_LOW)).toBeNull();

    // And the citation is left dangling here, which is what says the
    // divergence is a delete taken rather than a row cleaned up.
    expect(await researchPage(store, subject)).toStrictEqual([152]);
    expect(
      (await store.listEntityResearch(subject, WHOLE_COLLECTION))
        .map((row) => row.runId),
    ).toStrictEqual([RUN_TIED_LOW]);
  });

  it('holds nothing when the result is in the same domain', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedRuns(store);
    const subject = 153;

    store.setDomainEntities(domain.id, [registered(subject)]);
    store.setEntityResearch(subject, [
      { ...passOn(154, RESEARCHED_T0), runId: RUN_TIED_LOW },
    ]);

    // The state before, on the terms the case above states.
    expect(await readRun(store, RUN_TIED_LOW)).toMatchObject({
      domainId: domain.id,
    });
    expect(await researchPage(store, subject)).toStrictEqual([154]);

    // The control that makes the divergence above about the SECOND
    // domain rather than about the key: a result inside one domain is
    // removed by the same statement, which is why a deployment's
    // end-of-statement check finds nothing to refuse.
    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await researchPage(store, subject)).toStrictEqual([]);
    expect(await store.findRunById(RUN_TIED_LOW)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// What the runs half copies across the boundary
// ---------------------------------------------------------------------------

describe('the run payload crossing the boundary', () => {
  it('does not store the payloads a plant was handed', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const counts: Record<string, number> = { findings: 4 };
    const errors: Record<string, unknown>[] = [{ node: 'capture' }];

    store.setRuns([
      madePass(RUN_TIED_LOW, { counts, domainId: domain.id, errors }),
    ]);

    counts.findings = 9;
    errors.push({ node: 'parse' });

    const stored = await readRun(store, RUN_TIED_LOW);

    expect(stored.counts).toStrictEqual({ findings: 4 });
    expect(stored.errors).toStrictEqual([{ node: 'capture' }]);
  });

  it('does not share the payloads it answers', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    store.setRuns([
      madePass(RUN_TIED_LOW, {
        counts: { findings: 4 },
        domainId: domain.id,
        errors: [{ node: 'capture' }],
      }),
    ]);

    const answered = await readRun(store, RUN_TIED_LOW);

    answered.counts.findings = 9;
    (answered.errors as Record<string, unknown>[]).push({ node: 'parse' });

    // The other direction, in its own case so the two are told apart
    // by which one reddens — one seam and one projection, and a store
    // keeping either lets a caller write into stored state through
    // members the port declares `readonly`.
    const again = await readRun(store, RUN_TIED_LOW);

    expect(again.counts).toStrictEqual({ findings: 4 });
    expect(again.errors).toStrictEqual([{ node: 'capture' }]);
  });

  it('does not store the stamps a plant was handed', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const startedAt = new Date(STARTED_T1);
    const finishedAt = new Date(FINISHED_AT);

    store.setRuns([
      madePass(RUN_TIED_LOW, { domainId: domain.id, finishedAt, startedAt }),
    ]);

    startedAt.setUTCFullYear(2030);
    finishedAt.setUTCFullYear(2030);

    const stored = await readRun(store, RUN_TIED_LOW);

    expect(stored.startedAt.getTime()).toBe(Date.UTC(2026, 5, 2, 9));
    expect(stored.finishedAt?.getTime()).toBe(Date.UTC(2026, 5, 2, 10));

    // A null stays a null through the copy, `finished_at` being the
    // one nullable stamp on the table and the branch that needs one.
    store.setRuns([madePass(RUN_OLDEST, { domainId: domain.id })]);

    expect((await readRun(store, RUN_OLDEST)).finishedAt).toBeNull();
  });

  it('does not share the stamps it answers', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));

    store.setRuns([
      madePass(RUN_TIED_LOW, {
        domainId: domain.id,
        finishedAt: new Date(FINISHED_AT),
        startedAt: new Date(STARTED_T1),
      }),
    ]);

    const answered = await readRun(store, RUN_TIED_LOW);

    answered.startedAt.setUTCFullYear(2031);
    answered.finishedAt?.setUTCFullYear(2031);

    // The other direction, in its own case body so the two are told
    // apart by which one reddens — a claim with two directions that
    // shares one case cannot be separated by any grid.
    const again = await readRun(store, RUN_TIED_LOW);

    expect(again.startedAt.getTime()).toBe(Date.UTC(2026, 5, 2, 9));
    expect(again.finishedAt?.getTime()).toBe(Date.UTC(2026, 5, 2, 10));
  });

  it('does not store the stamp a call arrived with', async () => {
    const store = createMemoryResearchStore();
    const calledAt = new Date(CALLED_T2);

    store.setRuns([madePass(RUN_TIED_LOW)]);
    store.setLlmCalls([
      ledgered(CALL_TIED_LOW, { calledAt, runId: RUN_TIED_LOW }),
    ]);

    calledAt.setUTCFullYear(2030);

    const [stored] = await store.listRunLedger(RUN_TIED_LOW, WHOLE_LEDGER);

    expect(stored?.calledAt.getTime()).toBe(Date.UTC(2026, 5, 14, 9));

    // And the day bucket is taken off the STORED instant, so a caller
    // that moved what it planted cannot move which day its spend
    // lands on — the reading the ledger's own projection cannot make.
    expect(
      (await spendPage(store)).map((bucket) => bucket.day.getTime()),
    ).toStrictEqual([DAY_LATER]);
  });

  it('does not share the stamp it answers', async () => {
    const store = createMemoryResearchStore();

    store.setRuns([madePass(RUN_TIED_LOW)]);
    store.setLlmCalls([
      ledgered(CALL_TIED_LOW, {
        calledAt: new Date(CALLED_T2),
        runId: RUN_TIED_LOW,
      }),
    ]);

    const [answered] = await store.listRunLedger(RUN_TIED_LOW, WHOLE_LEDGER);

    answered?.calledAt.setUTCFullYear(2031);

    const [again] = await store.listRunLedger(RUN_TIED_LOW, WHOLE_LEDGER);

    expect(again?.calledAt.getTime()).toBe(Date.UTC(2026, 5, 14, 9));
  });

  it('rebuilds the planted passes rather than holding them', async () => {
    const store = createMemoryResearchStore();
    const domain = await store.insertDomain(domainInput(RADAR));
    const rows = [madePass(RUN_TIED_LOW, { domainId: domain.id })];

    store.setRuns(rows);

    rows.push(madePass(RUN_OLDEST, { domainId: domain.id }));

    // The seam copies row by row AND rebuilds the collection, so
    // pushing onto what was planted does not plant a second pass.
    expect(await store.findRunById(RUN_OLDEST)).toBeNull();

    // A second call REPLACES rather than appends, which is the only
    // shape under which a deployment going back to having run nothing
    // is expressible at all.
    store.setRuns([madePass(RUN_OLDEST, { domainId: domain.id })]);

    expect(await runsPage(store)).toStrictEqual([RUN_OLDEST]);

    store.setRuns([]);

    expect(await runsPage(store)).toStrictEqual([]);
    expect(await store.countRuns(EVERY_RUN)).toBe(0);
  });

  it('rebuilds the planted ledger rather than holding it', async () => {
    const store = createMemoryResearchStore();
    const rows = [ledgered(CALL_TIED_LOW, { runId: RUN_TIED_LOW })];

    store.setRuns([madePass(RUN_TIED_LOW)]);
    store.setLlmCalls(rows);

    rows.push(ledgered(CALL_TIED_HIGH, { runId: RUN_TIED_LOW }));

    expect(await ledgerPage(store, RUN_TIED_LOW)).toStrictEqual([
      CALL_TIED_LOW,
    ]);

    store.setLlmCalls([]);

    expect(await ledgerPage(store, RUN_TIED_LOW)).toStrictEqual([]);
    expect(await store.countRunLedger(RUN_TIED_LOW)).toBe(0);
    expect(await spendPage(store)).toStrictEqual([]);
  });

  it('buckets a call naming a run nothing stored under none', async () => {
    const store = createMemoryResearchStore();

    store.setRuns([]);
    store.setLlmCalls([
      ledgered(CALL_TIED_LOW, { promptChars: 5, runId: RUN_TIED_LOW }),
    ]);

    // A state `llm_calls_run_id_runs_id_fk` forbids and this seam can
    // reach, answered the way a LEFT JOIN answers it rather than as a
    // refusal this store invented. It is what makes the summary's
    // coverage claim hold over a fixture the plant is free to build.
    expect(await spendPage(store)).toStrictEqual([{
      calls: 1,
      day: new Date(DAY_OF),
      domainId: null,
      estTokens: null,
      promptChars: 5,
    }]);

    // AND THE LEDGER STILL ANSWERS IT, which is the half a reader
    // predicts the other way round: that read filters on `run_id`
    // alone and joins to `runs` for nothing, so the row is under the
    // id it names whether or not a pass carries it. Reading the
    // ledger is not how a caller learns the run is gone —
    // `findRunById` answering null is, one call earlier, and that is
    // what `src/runs/service.ts` turns into a 404 before any of this
    // is reached.
    expect(await ledgerPage(store, RUN_TIED_LOW)).toStrictEqual([
      CALL_TIED_LOW,
    ]);
    expect(await store.countRunLedger(RUN_TIED_LOW)).toBe(1);
    expect(await store.findRunById(RUN_TIED_LOW)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The proposals half's fixture
// ---------------------------------------------------------------------------

/**
 * The two instants the queue is proposed across, and the two the
 * already-ruled rows carry.
 *
 * SPELLED OUT RATHER THAN DERIVED FROM ONE ANOTHER, on the terms
 * {@link RESEARCHED_T0} states, and kept clear of the other gate's
 * stamps: the two gates are argued to be the same gate, so a shared
 * instant would put a fixture at the centre of the comparison.
 */
const PROPOSED_T0 = '2026-06-01T09:00:00.000Z';
const PROPOSED_T1 = '2026-06-02T09:00:00.000Z';

/** When the fixture's already-ruled proposals were approved. */
const AGREED_AT = '2026-06-03T09:00:00.000Z';

/** When the one applied proposal was written onto its feed. */
const WRITTEN_AT = '2026-06-04T09:00:00.000Z';

/**
 * The six proposals the fixture plants, named for what each is in
 * the rules rather than for its id.
 *
 * `PROPOSED_TIED_LOW` and `PROPOSED_TIED_HIGH` carry ONE instant and
 * are planted HIGH FIRST, the queue's tiebreak being ASCENDING — so
 * a stable sort that lost the tiebreak answers them the wrong way
 * round rather than reproducing the answer by accident.
 * `PROPOSED_FIRST` is the HIGHEST id and the OLDEST stamp, so the
 * two keys disagree on every pair it is in and an ordering by `id`
 * alone cannot look right. `AGREED` and `APPLIED` are ruled on and
 * are what says the queue is narrowed; `ON_ITEMS` names the sibling
 * feed and is what says it is scoped.
 */
const PROPOSED_TIED_LOW = 194;
const PROPOSED_TIED_HIGH = 195;
const PROPOSED_FIRST = 196;
const AGREED = 197;
const APPLIED = 198;
const ON_ITEMS = 199;

/** The one proposal planted under the second domain. */
const ELSEWHERE_PROPOSAL = 200;

/**
 * The two documents an approval writes, distinct from anything the
 * sources fixture stores so that a case can tell a config that was
 * APPLIED from one a feed was inserted with.
 */
const PROPOSED_PARSER = { item: 'entry', select: 'a' } as const;
const PROPOSED_CONTRACT = { expects: 'entry', minimum: 3 } as const;

/** What {@link proposed} defaults when a case is not about it. */
type ProposalDefaults = Partial<Omit<MemorySourceProposal, 'id'>>;

/**
 * Builds one row for {@link MemoryResearchStore.setDomainProposals}.
 *
 * A function rather than a constant, for the reason {@link queued}
 * is one: the copy cases WRITE into the documents they planted,
 * which is the whole point of them.
 *
 * @param id - The proposal's id, which is what a ruling names and
 *   what the queue's tiebreak reads.
 * @param sourceId - The feed it is for. Required rather than
 *   defaulted, `source_config_proposals.source_id` being NOT NULL
 *   and every read here being scoped or checked by it.
 * @param values - The seven members a case may care about. Both
 *   stamps default to null, which is the open state every row starts
 *   in and the one side of `source_config_proposals_approval_check`
 *   that is always legal.
 * @returns The row to plant.
 */
function proposed(
  id: number,
  sourceId: number,
  values: ProposalDefaults = {},
): MemorySourceProposal {
  return {
    id,
    sourceId: values.sourceId ?? sourceId,
    parserConfig: values.parserConfig ?? { ...PROPOSED_PARSER },
    contract: values.contract ?? { ...PROPOSED_CONTRACT },
    proposedBy: values.proposedBy ?? `proposer ${id}`,
    status: values.status ?? 'pending',
    proposedAt: values.proposedAt ?? new Date(PROPOSED_T1),
    approvedAt: values.approvedAt ?? null,
    appliedAt: values.appliedAt ?? null,
  };
}

/**
 * Two domains, two feeds in the first and one in the second, with
 * six proposals queued against the first domain's feeds and one
 * against the second's.
 *
 * PLANTED IN AN ORDER NO READ ANSWERS, on the terms
 * {@link seedEntities} states.
 *
 * @param store - The store to write to.
 * @returns Both domains and all three feeds: the queue's, the
 *   sibling the scope is read against, and the one in the second
 *   domain the cascade is read against.
 */
async function seedProposals(store: MemoryResearchStore): Promise<{
  domain: DomainRecord;
  other: DomainRecord;
  feed: SourceRecord;
  items: SourceRecord;
  elsewhere: SourceRecord;
}> {
  const domain = await store.insertDomain(domainInput(RADAR));
  const other = await store.insertDomain(domainInput(TRANSIT));
  const feed = await addSource(store, domain.id, FEED_ENDPOINT);
  const items = await addSource(store, domain.id, ITEMS_ENDPOINT, {
    kind: 'api',
  });
  const elsewhere = await addSource(store, other.id, FEED_ENDPOINT);

  store.setDomainProposals(domain.id, [
    proposed(PROPOSED_TIED_HIGH, feed.id),
    proposed(APPLIED, feed.id, {
      appliedAt: new Date(WRITTEN_AT),
      approvedAt: new Date(AGREED_AT),
      status: 'done',
    }),
    proposed(PROPOSED_FIRST, feed.id, {
      proposedAt: new Date(PROPOSED_T0),
    }),
    proposed(ON_ITEMS, items.id),
    proposed(AGREED, feed.id, {
      approvedAt: new Date(AGREED_AT),
      status: 'approved',
    }),
    proposed(PROPOSED_TIED_LOW, feed.id),
  ]);
  store.setDomainProposals(other.id, [
    proposed(ELSEWHERE_PROPOSAL, elsewhere.id),
  ]);

  return { domain, other, feed, items, elsewhere };
}

/**
 * Reads one window of a feed's pending config proposals.
 *
 * @param store - The store to read.
 * @param sourceId - The feed whose queue to read.
 * @param window - How much to take, the whole collection by default.
 * @returns The ids in the order they arrived.
 */
async function queuePage(
  store: MemoryResearchStore,
  sourceId: number,
  window = WHOLE_COLLECTION,
): Promise<number[]> {
  const page = await store.listPendingProposals(sourceId, window);

  return page.map((row) => row.id);
}

/**
 * Reads a proposal that must be there.
 *
 * @param store - The store to read.
 * @param id - The id to read under.
 * @returns The row.
 * @throws When no proposal carries the id, for the reason
 *   {@link readDomain} throws: two absences otherwise compare equal.
 */
async function readProposal(
  store: MemoryResearchStore,
  id: number,
): Promise<SourceConfigProposalRecord> {
  const row = await store.findProposalById(id);

  if (row === null) {
    throw new Error(`expected a stored proposal under ${id}`);
  }

  return row;
}

/**
 * Rules on a proposal that must be there.
 *
 * @param store - The store to write to.
 * @param id - The proposal to rule on.
 * @returns The row as it stands after both stamps.
 * @throws When no proposal carries the id, so a case about an
 *   approval cannot quietly assert over a null.
 */
async function ruleOn(
  store: MemoryResearchStore,
  id: number,
): Promise<SourceConfigProposalRecord> {
  const row = await store.approveAndApplyProposal(id);

  if (row === null) {
    throw new Error(`expected a stored proposal under ${id}`);
  }

  return row;
}

// ---------------------------------------------------------------------------
// The pending queue, its order and its two narrowings
// ---------------------------------------------------------------------------

describe('the pending config queue ordering', () => {
  it('answers it oldest first with id breaking a tie', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedProposals(store);
    const page = await queuePage(store, feed.id);

    // ASCENDING where the failures queue one table over descends,
    // which is `listPendingProposals` in `scripts/approve.ts` member
    // for member. The tied pair was planted HIGH FIRST, so a stable
    // sort that lost the tiebreak answers them the wrong way round.
    expect(page).toStrictEqual([
      PROPOSED_FIRST,
      PROPOSED_TIED_LOW,
      PROPOSED_TIED_HIGH,
    ]);

    // The four orders it is NOT, written out: a three-row page
    // agreeing with any of them would be reproducing the answer by
    // accident rather than by the two keys.
    expect(page).not.toStrictEqual([
      PROPOSED_TIED_HIGH,
      PROPOSED_FIRST,
      PROPOSED_TIED_LOW,
    ]);
    expect(page).not.toStrictEqual([
      PROPOSED_TIED_LOW,
      PROPOSED_FIRST,
      PROPOSED_TIED_HIGH,
    ]);
    expect(page).not.toStrictEqual([
      PROPOSED_TIED_LOW,
      PROPOSED_TIED_HIGH,
      PROPOSED_FIRST,
    ]);
    expect(page).not.toStrictEqual([
      PROPOSED_TIED_HIGH,
      PROPOSED_TIED_LOW,
      PROPOSED_FIRST,
    ]);
  });

  it('narrows to the rows still waiting on a ruling', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedProposals(store);
    const page = await queuePage(store, feed.id);

    // PENDING ONLY, and the filter is the store's rather than a
    // caller's: there is no status parameter, so the gate's history
    // is not pageable from here. Both ruled rows are on the SAME
    // feed and are readable by id, which the next describe reads.
    expect(page).not.toContain(AGREED);
    expect(page).not.toContain(APPLIED);
    expect(await readProposal(store, AGREED)).toMatchObject({
      status: 'approved',
    });
    expect(await readProposal(store, APPLIED)).toMatchObject({
      status: 'done',
    });
  });

  it('scopes the queue to the feed it was asked about', async () => {
    const store = createMemoryResearchStore();
    const { feed, items, elsewhere } = await seedProposals(store);

    expect(await queuePage(store, feed.id)).not.toContain(ON_ITEMS);
    expect(await queuePage(store, items.id)).toStrictEqual([ON_ITEMS]);
    expect(await queuePage(store, elsewhere.id)).toStrictEqual([
      ELSEWHERE_PROPOSAL,
    ]);
    expect(await store.countPendingProposals(feed.id)).toBe(3);
    expect(await store.countPendingProposals(items.id)).toBe(1);
  });

  it('counts the queue and not the table', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedProposals(store);

    // Five rows are planted against this feed and two are ruled on,
    // so a count over the table answers five and the honest number
    // for a backlog is three: what is closed is not waiting on
    // anybody. The by-id reads are what say the other two are there.
    expect(await store.countPendingProposals(feed.id)).toBe(3);
    expect(await store.findProposalById(AGREED)).not.toBeNull();
    expect(await store.findProposalById(APPLIED)).not.toBeNull();
  });

  it('windows the page and counts the whole either way', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedProposals(store);

    expect(
      await queuePage(store, feed.id, { limit: 1, offset: 1 }),
    ).toStrictEqual([PROPOSED_TIED_LOW]);
    expect(
      await queuePage(store, feed.id, { limit: 2, offset: 9 }),
    ).toStrictEqual([]);
    expect(await store.countPendingProposals(feed.id)).toBe(3);
  });

  it('answers an empty list and a zero for an unknown id', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedProposals(store);

    expect(await queuePage(store, 9999)).toStrictEqual([]);
    expect(await store.countPendingProposals(9999)).toBe(0);
    expect(await queuePage(store, feed.id)).toHaveLength(3);
  });
});

describe('the proposal read by its own id', () => {
  it('answers a row whatever feed it names', async () => {
    const store = createMemoryResearchStore();
    const { feed, items, elsewhere } = await seedProposals(store);

    // UNSCOPED on purpose: a read narrowed to the source would
    // answer null for `no such row` and for `not this feed's row`
    // alike, and only one of those is honest. Whose row it is, is
    // the service's question, and `sourceId` is what it holds
    // against the addressed feed.
    expect(await readProposal(store, PROPOSED_FIRST)).toMatchObject({
      sourceId: feed.id,
    });
    expect(await readProposal(store, ON_ITEMS)).toMatchObject({
      sourceId: items.id,
    });
    expect(await readProposal(store, ELSEWHERE_PROPOSAL)).toMatchObject({
      sourceId: elsewhere.id,
    });
  });

  it('answers the row whole, the seam key put back', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedProposals(store);

    // `domainId` is the column the plant DROPS, the seam keying on
    // it, so a projection that forgot to put it back would answer
    // nine members where the record declares ten.
    expect(await readProposal(store, APPLIED)).toStrictEqual({
      appliedAt: new Date(WRITTEN_AT),
      approvedAt: new Date(AGREED_AT),
      contract: { ...PROPOSED_CONTRACT },
      domainId: domain.id,
      id: APPLIED,
      parserConfig: { ...PROPOSED_PARSER },
      proposedAt: new Date(PROPOSED_T1),
      proposedBy: `proposer ${APPLIED}`,
      sourceId: feed.id,
      status: 'done',
    });
  });

  it('answers null for an id no proposal carries', async () => {
    const store = createMemoryResearchStore();

    await seedProposals(store);

    expect(await store.findProposalById(9999)).toBeNull();
    expect(await store.findProposalById(PROPOSED_FIRST)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The check the seam holds, and the ruling that applies what it ruled
// ---------------------------------------------------------------------------

describe('the source_config_proposals_approval_check', () => {
  it('refuses an applied row carrying no approval', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedProposals(store);

    const refusal = await refusalFrom(async () => {
      store.setDomainProposals(domain.id, [
        proposed(201, feed.id, {
          appliedAt: new Date(WRITTEN_AT),
          status: 'done',
        }),
      ]);
    });

    expect(refusal.reason).toBe('check-violation');
    expect(refusal.constraint).toBe('source_config_proposals_approval_check');
  });

  it('takes the same row once it also states an approval', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedProposals(store);

    // The check read from its other side, and the control that makes
    // the refusal above about the PAIR rather than about the stamp:
    // the identical applied instant is stored once an approval
    // stands beside it.
    store.setDomainProposals(domain.id, [
      proposed(201, feed.id, {
        appliedAt: new Date(WRITTEN_AT),
        approvedAt: new Date(AGREED_AT),
        status: 'done',
      }),
    ]);

    expect(await readProposal(store, 201)).toMatchObject({
      appliedAt: new Date(WRITTEN_AT),
    });
  });

  it('leaves the previous plant standing when it refuses', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedProposals(store);

    await refusalFrom(async () => {
      store.setDomainProposals(domain.id, [
        proposed(201, feed.id),
        proposed(202, feed.id, {
          appliedAt: new Date(WRITTEN_AT),
          status: 'done',
        }),
      ]);
    });

    // The batch lands NOWHERE: the legal row beside the refused one
    // is not stored either, and what was planted before is still
    // there. A guard applied row by row as it stored would leave the
    // collection half written, which one statement cannot produce.
    expect(await store.findProposalById(201)).toBeNull();
    expect(await queuePage(store, feed.id)).toStrictEqual([
      PROPOSED_FIRST,
      PROPOSED_TIED_LOW,
      PROPOSED_TIED_HIGH,
    ]);
  });

  it('never consults the status the row states', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedProposals(store);

    // The constraint holds the two timestamps against each other and
    // reads nothing else, so a row calling itself done with neither
    // stamp set is storable — and is stored, and is out of the queue
    // because the queue reads the status the constraint ignores.
    store.setDomainProposals(domain.id, [
      proposed(201, feed.id, { status: 'done' }),
    ]);

    expect(await readProposal(store, 201)).toMatchObject({
      appliedAt: null,
      approvedAt: null,
      status: 'done',
    });
    expect(await queuePage(store, feed.id)).toStrictEqual([]);
  });
});

describe('the ruling that applies what it approved', () => {
  it('stamps both, moves the status and writes the feed', async () => {
    const ruled = new Date('2026-06-10T10:00:00.000Z');
    const store = createMemoryResearchStore({ now: () => ruled });
    const { feed } = await seedProposals(store);

    expect(await ruleOn(store, PROPOSED_FIRST)).toMatchObject({
      appliedAt: ruled,
      approvedAt: ruled,
      id: PROPOSED_FIRST,
      status: 'approved',
    });

    // BOTH TABLES, which is what makes this the one writer here that
    // is not about a single row: the two documents land on the feed
    // exactly as they were proposed, and neither was what the source
    // was inserted with.
    expect(await readSource(store, feed.id)).toMatchObject({
      contract: { ...PROPOSED_CONTRACT },
      parserConfig: { ...PROPOSED_PARSER },
    });
    expect(await readProposal(store, PROPOSED_FIRST)).toMatchObject({
      appliedAt: ruled,
      approvedAt: ruled,
      status: 'approved',
    });

    // AND IT LEAVES THE QUEUE, the status having moved off the one
    // member the queue selects on.
    expect(await queuePage(store, feed.id)).toStrictEqual([
      PROPOSED_TIED_LOW,
      PROPOSED_TIED_HIGH,
    ]);
  });

  it('keeps both first instants when it is ruled on twice', async () => {
    let reading = new Date('2026-06-10T10:00:00.000Z');
    const store = createMemoryResearchStore({ now: () => reading });

    await seedProposals(store);

    const first = await ruleOn(store, PROPOSED_FIRST);

    reading = new Date('2026-06-11T10:00:00.000Z');

    // The clock has moved, so a store writing a bare `now()` answers
    // the second reading here. `coalesce` on each stamp answers the
    // first, which is what makes ruling twice a no-op rather than a
    // way to re-date an approval already given or an application
    // already made.
    const second = await ruleOn(store, PROPOSED_FIRST);

    expect(second.approvedAt).toStrictEqual(first.approvedAt);
    expect(second.appliedAt).toStrictEqual(first.appliedAt);
    expect(second.approvedAt).toStrictEqual(
      new Date('2026-06-10T10:00:00.000Z'),
    );

    // The control that says the clock did move: a row nobody has
    // ruled on takes the SECOND reading on both stamps.
    expect(await ruleOn(store, PROPOSED_TIED_LOW)).toMatchObject({
      appliedAt: new Date('2026-06-11T10:00:00.000Z'),
      approvedAt: new Date('2026-06-11T10:00:00.000Z'),
    });
  });

  it('keeps the approval a row already carried', async () => {
    const store = createMemoryResearchStore({
      now: () => new Date('2026-06-11T10:00:00.000Z'),
    });
    const { feed } = await seedProposals(store);

    // Nothing is asked of the row's state. A row approved and never
    // applied takes the closing stamp alone and keeps the instant
    // somebody else gave it — which is what separates the two
    // `coalesce` calls: one falls through and one does not.
    expect(await ruleOn(store, AGREED)).toMatchObject({
      appliedAt: new Date('2026-06-11T10:00:00.000Z'),
      approvedAt: new Date(AGREED_AT),
    });
    expect(await readSource(store, feed.id)).toMatchObject({
      parserConfig: { ...PROPOSED_PARSER },
    });
  });

  it('writes a config nothing validated', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedProposals(store);

    store.setDomainProposals(domain.id, [
      proposed(201, feed.id, { contract: 7, parserConfig: 'not a config' }),
    ]);

    await ruleOn(store, 201);

    // The approval IS the gate and this is not a second one: a
    // malformed `parser_config` somebody agreed to is written,
    // because the alternative is a store refusing a row the
    // deployment stores.
    expect(await readSource(store, feed.id)).toMatchObject({
      contract: 7,
      parserConfig: 'not a config',
    });
  });

  it('leaves both tables alone when the feed is not there', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedProposals(store);

    store.setDomainProposals(domain.id, [proposed(201, 9999)]);

    const before = await readSource(store, feed.id);
    const fault = await plainErrorFrom(
      () => store.approveAndApplyProposal(201),
    );

    // TOGETHER OR NOT AT ALL. Nothing is stored until every value
    // exists, so neither stamp is written and the feeds are as they
    // were — the two halves the port says are not states anybody
    // meant. It is a plain Error and not a `StoreRefusal`, because a
    // deployment's foreign key makes the state unreachable and
    // answering a refusal for it would invent a rule.
    expect(fault).not.toBeInstanceOf(StoreRefusal);
    expect(await readProposal(store, 201)).toMatchObject({
      appliedAt: null,
      approvedAt: null,
      status: 'pending',
    });
    expect(await readSource(store, feed.id)).toStrictEqual(before);
  });

  it('answers null for an id no proposal carries', async () => {
    const store = createMemoryResearchStore();

    await seedProposals(store);

    expect(await store.approveAndApplyProposal(9999)).toBeNull();
    expect(await store.approveAndApplyProposal(PROPOSED_FIRST)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// What a domain delete takes, and the delete a proposal holds
// ---------------------------------------------------------------------------

describe('the domain cascade over its config proposals', () => {
  it('takes them and leaves another domain standing', async () => {
    const store = createMemoryResearchStore();
    const { domain, elsewhere } = await seedProposals(store);

    // The state before, so the absences below are about the delete
    // rather than about a fixture that planted nothing.
    expect(await store.findProposalById(PROPOSED_FIRST)).not.toBeNull();
    expect(await store.findProposalById(APPLIED)).not.toBeNull();

    expect(await store.deleteDomain(domain.id)).toBe(true);

    // `source_config_proposals.domain_id` cascades, so every status
    // goes rather than the pending ones alone, and the second
    // domain's row is untouched.
    expect(await store.findProposalById(PROPOSED_FIRST)).toBeNull();
    expect(await store.findProposalById(APPLIED)).toBeNull();
    expect(await store.findProposalById(ON_ITEMS)).toBeNull();
    expect(await queuePage(store, elsewhere.id)).toStrictEqual([
      ELSEWHERE_PROPOSAL,
    ]);
  });

  it('is not refused by the feeds it removes in the same act', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedProposals(store);

    // The delete of that feed on its own is refused, which is the
    // control that says the cascade is not simply meeting nothing —
    // and the domain delete takes both anyway, because one statement
    // removes the sources and the proposals that were holding them.
    await expect(store.deleteSource(feed.id)).rejects.toBeInstanceOf(
      StoreRefusal,
    );
    expect(await store.deleteDomain(domain.id)).toBe(true);
    expect(await store.findSourceById(feed.id)).toBeNull();
    expect(await store.findProposalById(PROPOSED_FIRST)).toBeNull();
  });

  it('leaves a proposal another domain raised on its feed', async () => {
    const store = createMemoryResearchStore();
    const { domain, other, feed } = await seedProposals(store);

    store.setDomainProposals(other.id, [
      proposed(ELSEWHERE_PROPOSAL, feed.id),
    ]);

    expect(await store.deleteDomain(domain.id)).toBe(true);

    // THE EIGHTH KNOWN DIVERGENCE. `source_config_proposals.source_id`
    // is `ON DELETE no action`, so a deployment refuses this delete
    // while a row of ANOTHER domain still names the feed; here the
    // cascade follows `domain_id` alone and the row is left naming an
    // id nothing carries. The module header states it, and the live
    // suite is where the refusal is discharged.
    expect(await store.findSourceById(feed.id)).toBeNull();
    expect(await readProposal(store, ELSEWHERE_PROPOSAL)).toMatchObject({
      sourceId: feed.id,
    });
  });
});

describe('the proposals that hold a source delete', () => {
  it('refuses the feed a proposal still names', async () => {
    const store = createMemoryResearchStore();
    const { feed, items } = await seedProposals(store);

    const refusal = await refusalFrom(() => store.deleteSource(feed.id));

    expect(refusal.reason).toBe('foreign-key-violation');
    expect(refusal.constraint).toBe(
      'source_config_proposals_source_id_sources_id_fk',
    );

    // The positive control in the same body: the SAME call over a
    // feed whose only proposal has been cleared is taken, so the
    // refusal is about the rows rather than about the method.
    store.setDomainProposals((await readSource(store, items.id)).domainId, []);

    expect(await store.deleteSource(items.id)).toBe(true);
  });

  it('refuses it whatever status the proposal stands at', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedProposals(store);

    store.setDomainProposals(domain.id, [
      proposed(201, feed.id, {
        appliedAt: new Date(WRITTEN_AT),
        approvedAt: new Date(AGREED_AT),
        status: 'done',
      }),
    ]);

    // The key does not consult `status`, so a proposal already
    // applied holds the delete exactly as a pending one does — a
    // proposal is the account of what was asked for a feed, and it
    // outlives the ruling.
    const refusal = await refusalFrom(() => store.deleteSource(feed.id));

    expect(refusal.constraint).toBe(
      'source_config_proposals_source_id_sources_id_fk',
    );
    expect(await store.countPendingProposals(feed.id)).toBe(0);
  });

  it('is not reached by a feed nothing has proposed for', async () => {
    const store = createMemoryResearchStore();
    const { domain } = await seedProposals(store);
    const spare = await addSource(store, domain.id, ITEMS_ENDPOINT);

    // Three feeds carry proposals and this one does not, so its
    // delete lands — which is what says the refusal above is scoped
    // to the feed each row names rather than to the domain.
    expect(await store.deleteSource(spare.id)).toBe(true);
  });
});

describe('the proposal payload crossing the boundary', () => {
  it('copies the documents and the stamps on the way in', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedProposals(store);
    const row = proposed(201, feed.id, {
      approvedAt: new Date(AGREED_AT),
      parserConfig: { item: 'entry' },
      status: 'approved',
    });

    store.setDomainProposals(domain.id, [row]);

    (row.parserConfig as Record<string, unknown>).item = 'moved';
    row.proposedAt.setUTCFullYear(1999);
    row.approvedAt?.setUTCFullYear(1999);

    expect(await readProposal(store, 201)).toMatchObject({
      approvedAt: new Date(AGREED_AT),
      parserConfig: { item: 'entry' },
      proposedAt: new Date(PROPOSED_T1),
    });
  });

  it('copies them on the way out of every read', async () => {
    const store = createMemoryResearchStore();
    const { feed } = await seedProposals(store);
    const [first] = await store.listPendingProposals(
      feed.id,
      WHOLE_COLLECTION,
    );

    (first?.parserConfig as Record<string, unknown>).item = 'moved';
    first?.proposedAt.setUTCFullYear(1999);

    // Compared against the fixture FUNCTION rather than against the
    // row a call answered: a store handing its own object out has
    // aliased the two, and a comparison between two answers would
    // hold one lie against itself and pass.
    expect(await readProposal(store, PROPOSED_FIRST)).toMatchObject({
      parserConfig: { ...PROPOSED_PARSER },
      proposedAt: new Date(PROPOSED_T0),
    });

    const ruled = await ruleOn(store, PROPOSED_TIED_LOW);

    ruled.appliedAt?.setUTCFullYear(1999);

    expect((await readProposal(store, PROPOSED_TIED_LOW)).appliedAt)
      .not.toStrictEqual(new Date('1999-01-01T00:00:00.000Z'));
  });

  it('rebuilds the planted queue rather than holding it', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedProposals(store);
    const rows = [proposed(201, feed.id)];

    store.setDomainProposals(domain.id, rows);

    rows.push(proposed(202, feed.id));

    expect(await queuePage(store, feed.id)).toStrictEqual([201]);

    // A second call REPLACES the first rather than appending to it,
    // which is what makes a domain going back to having proposed
    // nothing expressible.
    store.setDomainProposals(domain.id, []);

    expect(await queuePage(store, feed.id)).toStrictEqual([]);
    expect(await store.countPendingProposals(feed.id)).toBe(0);
    expect(await store.findProposalById(201)).toBeNull();
  });

  it('writes a copy of the config onto the feed', async () => {
    const store = createMemoryResearchStore();
    const { domain, feed } = await seedProposals(store);
    const row = proposed(201, feed.id, { parserConfig: { item: 'entry' } });

    store.setDomainProposals(domain.id, [row]);
    await ruleOn(store, 201);

    const applied = await readSource(store, feed.id);

    (applied.parserConfig as Record<string, unknown>).item = 'moved';

    // The feed's own copy, so writing into what a source read
    // answered moves neither the stored source nor the proposal the
    // documents came from.
    expect(await readSource(store, feed.id)).toMatchObject({
      parserConfig: { item: 'entry' },
    });
    expect(await readProposal(store, 201)).toMatchObject({
      parserConfig: { item: 'entry' },
    });
  });
});
