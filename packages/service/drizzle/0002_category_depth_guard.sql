-- Custom SQL migration file, put your code below! --

CREATE OR REPLACE FUNCTION categories_enforce_depth() RETURNS trigger AS $$
DECLARE
	parent_parent_id bigint;
BEGIN
	-- A root is always legal: there is nothing above it to measure a
	-- depth against, and most categories are roots.
	IF NEW.parent_id IS NULL THEN
		RETURN NEW;
	END IF;

	-- The parent must itself be a root. If it already has a parent then
	-- this row would sit two levels down, which is the one shape the
	-- shallow taxonomy does not admit.
	--
	-- A parent_id naming no row leaves this NULL and falls through to
	-- the foreign key, which refuses it in its own terms rather than
	-- being reported here as a depth problem.
	SELECT parent.parent_id INTO parent_parent_id
	FROM "public"."categories" AS parent
	WHERE parent.id = NEW.parent_id;

	IF parent_parent_id IS NOT NULL THEN
		RAISE EXCEPTION
			'categories: parent % is itself a child of %, so % would be two levels deep',
			NEW.parent_id, parent_parent_id, NEW.key
			USING ERRCODE = 'check_violation',
				HINT = 'The taxonomy is one level deep: a category is a root, or the child of a root.';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
