/**
 * `tests/helpers/memory-research-store.ts` in all seven ports it
 * implements — the claims that make it a second implementation of
 * `DomainStore`, of `TaxonomyStore` WHOLE with categories and terms
 * together, of `PersonaStore`, of `TopicStore`, of `SourceStore`, of
 * `ConnectorStore` and of `SettingsStore`, rather than a bag that
 * stores what it is handed.
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
 * FOUR and reaches them from three calls, which is the widest
 * mechanism surface of any half here and the only one whose delete
 * is refused from OUTSIDE the row: `sources_kind_check`, the first
 * CHECK this file imitates, refusing on an INSERT and on an UPDATE
 * alike because `kind` is patchable;
 * `sources_domain_id_domains_id_fk`, which the insert alone reaches;
 * and `documents_source_id_sources_id_fk` beside
 * `finding_sightings_source_id_sources_id_fk`, two `ON DELETE no
 * action` keys in other tables that each hold the delete of a source
 * their rows still cite. The connectors half adds THREE and reaches
 * them from three calls as well, in a shape that is the sources
 * half's mirrored: `connectors_kind_name_unique` refusing on an
 * INSERT and on an UPDATE alike because `name` is patchable,
 * `connectors_kind_check` refusing on the INSERT alone because
 * `kind` is not, and
 * `export_subscriptions_connector_id_connectors_id_fk`, a single
 * `ON DELETE no action` key in another table holding the delete of a
 * connector its rows still name. The settings half adds NONE, and
 * that is a measurement rather than a gap — see below.
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
 * THAT ONE REFUSING KEY IS DELIBERATELY NOT IMITATED, and the reason
 * is unreachability rather than oversight.
 * `source_config_proposals_source_id_sources_id_fk` is a third
 * `ON DELETE no action` key onto `sources.id`, but no port here
 * writes a proposal and no seam plants one, so there is no dataset
 * this store can be in where it would fire. A fake refusing a state
 * it cannot reach would be inventing a rule rather than imitating
 * one. There is no case for it, and that absence is why
 * `SourceStore.deleteSource` declares the throw rather than
 * promising that two zero counts mean the delete will land.
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
 * the sources half's shape and no other's. `documents.source_id` and
 * `finding_sightings.source_id` are both `ON DELETE no action`, so a
 * feed whose captures are in the corpus cannot be removed until they
 * are — argued at both columns, and most sharply at the second,
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
 * through a SEAM rather than through a method. Two seams, and their
 * shapes differ on purpose — rows for the documents, because three
 * reads answer rows, and a number for the sightings, because
 * `countSourceDependents` is the only thing that can ask about one
 * at all.
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
 */
import type {
  MemoryResearchStore,
  MemorySourceDocument,
} from './memory-research-store.js';
import type {
  ConnectorRecord,
  InsertConnectorInput,
} from '../../src/connectors/store.js';
import type { DomainSettings } from '../../src/db/schema/domains.js';
import type { OperatorSettings } from '../../src/db/schema/settings.js';
import type {
  DomainRecord,
  InsertDomainInput,
} from '../../src/domains/store.js';
import type { PersonaRecord } from '../../src/personas/store.js';
import type {
  InsertSourceInput,
  SourceFailureRecord,
  SourcePatch,
  SourceRecord,
} from '../../src/sources/store.js';
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
      () => addPersona(store, 4041, DRAFTER),
    );
    const serialised = JSON.stringify({
      ...refusal,
      message: refusal.message,
      stack: refusal.stack,
    });

    expect(countOccurrences(serialised, '4041')).toBe(0);

    // The same search over a message that DOES carry the id.
    const planted = JSON.stringify({
      ...refusal,
      message: 'domain 4041 does not exist',
    });

    expect(countOccurrences(planted, '4041')).toBe(1);
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
      () => addTopic(store, 4004, EDGE_INFERENCE),
    );
    const serialised = JSON.stringify({
      ...refusal,
      message: refusal.message,
      stack: refusal.stack,
    });

    expect(countOccurrences(serialised, '4004')).toBe(0);

    // The same search over a message that DOES carry the id.
    const planted = JSON.stringify({
      ...refusal,
      message: 'domain 4004 is not there',
    });

    expect(countOccurrences(planted, '4004')).toBe(1);
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
      () => addSource(store, 4004, FEED_ENDPOINT),
    );
    const serialised = JSON.stringify({
      ...refusal,
      message: refusal.message,
      stack: refusal.stack,
    });

    expect(countOccurrences(serialised, '4004')).toBe(0);

    // The same search over a message that DOES carry the id.
    const plantedMessage = JSON.stringify({
      ...refusal,
      message: 'domain 4004 is not there',
    });

    expect(countOccurrences(plantedMessage, '4004')).toBe(1);
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
