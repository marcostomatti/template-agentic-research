-- Custom SQL migration file, put your code below! --

-- Hand-written on purpose. Every other statement under drizzle/ was
-- generated from src/db/schema.ts; the trigger below was not, and
-- could not be -- the rule it carries reads the parent and the
-- children of the row being written, which no column constraint and
-- no drizzle table definition can express. Why the cap is a trigger
-- at all, and what a trigger does not buy, is argued in the header
-- of src/db/schema/taxonomy.ts, beside the columns it governs.
--
-- drizzle-kit's snapshot models tables, columns, constraints and
-- indexes, and nothing else. meta/0002_snapshot.json, written beside
-- this file when it was generated, is meta/0001_snapshot.json with a
-- fresh id chained onto it: the same 22 tables, and no mention of a
-- trigger or of a function anywhere in it. So the generator holds no
-- record of what is below, has nothing to diff it against, and never
-- proposes dropping it -- which is why db:generate goes on reporting
-- no changes while the guard stands.
--
-- Nor is this file regenerated. db:generate diffs the schema modules
-- against the newest snapshot and writes a NEW migration where they
-- differ; it never rewrites one already on disk. An edit here
-- survives it, and it will never carry a change made in taxonomy.ts
-- down into one -- a guard that has to follow a column is a hand
-- edit in the same commit as that column.
--
-- What being invisible to the snapshot costs: it cannot be reported
-- missing either. Nothing in this repository reads pg_trigger, so a
-- database this migration never reached, or one where the trigger
-- was dropped at a psql prompt, is indistinguishable from a database
-- where it holds. A file scan over drizzle/*.sql is evidence about
-- this file and about nothing else; only the depth cases in
-- tests/live/schema.live.test.ts watch a database refuse the write.

CREATE OR REPLACE FUNCTION categories_enforce_depth() RETURNS trigger AS $$
DECLARE
	parent_domain_id bigint;
	parent_parent_id bigint;
BEGIN
	-- A root is always legal: there is nothing above it to measure a
	-- depth against, and most categories are roots.
	IF NEW.parent_id IS NULL THEN
		RETURN NEW;
	END IF;

	-- One lookup answers both of the rules that read the parent: which
	-- domain it belongs to, and how deep it already sits.
	--
	-- A parent_id naming no row leaves both of these NULL and falls
	-- through to the foreign key, which refuses it in its own terms
	-- rather than being reported here as a domain or a depth problem.
	SELECT parent.domain_id, parent.parent_id
		INTO parent_domain_id, parent_parent_id
	FROM "public"."categories" AS parent
	WHERE parent.id = NEW.parent_id;

	-- The parent must belong to the same domain. A category hung under
	-- another domain's root sits in two taxonomies at once: it carries
	-- this domain's domain_id, so every query filtering by domain keeps
	-- it here, while a walk down from the other domain's root reaches
	-- it, and reaches the terms underneath it.
	--
	-- Asked before the depth rule below, because a parent in another
	-- domain is out of scope rather than too deep. Reporting where it
	-- sits in its own taxonomy would send the reader to the wrong
	-- domain to fix a row that is wrong in this one.
	--
	-- domain_id is NOT NULL on every stored row, so a NULL here means
	-- no parent row was found, not a parent without a domain.
	--
	-- What it does not reach: the rule is asked at the child, so it
	-- binds every write naming a parent and nothing else. Moving a
	-- root that already has children into another domain is accepted
	-- and strands them across the boundary this refuses to create -- a
	-- root names no parent, so the first branch above returns first.
	IF parent_domain_id IS NOT NULL AND parent_domain_id <> NEW.domain_id THEN
		RAISE EXCEPTION
			'categories: parent % is in domain %, but % is in domain %',
			NEW.parent_id, parent_domain_id, NEW.key, NEW.domain_id
			USING ERRCODE = 'check_violation',
				HINT = 'A category and its parent belong to the same domain.';
	END IF;

	-- The parent must itself be a root. If it already has a parent then
	-- this row would sit two levels down, which is the one shape the
	-- shallow taxonomy does not admit.
	IF parent_parent_id IS NOT NULL THEN
		RAISE EXCEPTION
			'categories: parent % is itself a child of %, so % would be two levels deep',
			NEW.parent_id, parent_parent_id, NEW.key
			USING ERRCODE = 'check_violation',
				HINT = 'The taxonomy is one level deep: a category is a root, or the child of a root.';
	END IF;

	-- The row must also have nothing under it. Giving a parent to a
	-- row that is already one pushes its own children a level down
	-- without touching them, and the check above reads this row's
	-- parent rather than its children, so it never sees them. Same
	-- cap, broken from the other end.
	--
	-- Only an UPDATE can reach this. On INSERT the id is fresh from
	-- the sequence and nothing can point at it yet, so the lookup
	-- finds nothing and refuses nothing. It is left unconditional
	-- rather than guarded on TG_OP so the cap does not rest on that
	-- reasoning staying true.
	IF EXISTS (
		SELECT 1
		FROM "public"."categories" AS child
		WHERE child.parent_id = NEW.id
	) THEN
		RAISE EXCEPTION
			'categories: % already has children, so parent % would push them two levels deep',
			NEW.key, NEW.parent_id
			USING ERRCODE = 'check_violation',
				HINT = 'The taxonomy is one level deep: a category is a root, or the child of a root.';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
-- Attaching the function to the table is what gives the rule teeth.
-- Unattached it is an ordinary function nobody calls, and a database
-- can carry it while admitting every write it refuses above.
--
-- BEFORE, so the guard is asked while the row is still being written
-- and ahead of the foreign key's own check -- which is what leaves a
-- parent_id naming no row to the key, refused in its own terms
-- rather than reported here as a domain or a depth problem.
--
-- FOR EACH ROW, because every rule in the function is about one
-- written row and the row it names as its parent. A statement-level
-- trigger is handed a null NEW rather than an error, so the root
-- early-return above reads true and admits every write: the cap
-- would be gone with nothing raised anywhere to say so.
--
-- INSERT and UPDATE both, because the cap breaks from two ends and
-- the function guards both: an INSERT can reach for a parent that is
-- already a child, and an UPDATE can hand a parent to a row that
-- already has children of its own. Naming one event and not the
-- other would leave that half unguarded with nothing to report it.
--
-- What it does not buy: the guards read rows this write does not
-- lock, so two transactions can each read a taxonomy the other is
-- about to change and both commit. It refuses every writer, one at a
-- time; it does not serialize two of them.
CREATE OR REPLACE TRIGGER categories_enforce_depth_trigger
	BEFORE INSERT OR UPDATE ON "public"."categories"
	FOR EACH ROW
	EXECUTE FUNCTION categories_enforce_depth();
