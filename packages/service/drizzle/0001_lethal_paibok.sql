CREATE TABLE "documents" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain_id" bigint NOT NULL,
	"source_id" bigint,
	"hash" text NOT NULL,
	"url" text,
	"body" text NOT NULL,
	"raw" jsonb,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"parse_status" text DEFAULT 'ok' NOT NULL,
	"parse_error" text,
	"features" jsonb,
	"feature_version" integer,
	"embedding" real[],
	"embedding_model" text,
	CONSTRAINT "documents_hash_unique" UNIQUE("hash"),
	CONSTRAINT "documents_parse_status_check" CHECK ("documents"."parse_status" in ('ok', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "ingested_files" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"path_hash" text NOT NULL,
	"path" text,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document_id" bigint,
	CONSTRAINT "ingested_files_path_hash_unique" UNIQUE("path_hash")
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"feature_version" integer,
	"embedding_model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domains_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain_id" bigint NOT NULL,
	"role" text NOT NULL,
	"system_text" text NOT NULL,
	CONSTRAINT "personas_domain_id_role_unique" UNIQUE("domain_id","role")
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain_id" bigint NOT NULL,
	"name" text NOT NULL,
	"name_norm" text NOT NULL,
	"alias_of" bigint,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "entities_domain_id_name_norm_unique" UNIQUE("domain_id","name_norm")
);
--> statement-breakpoint
CREATE TABLE "entity_research" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity_id" bigint NOT NULL,
	"run_id" bigint,
	"summary" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"researched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_pool" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain_id" bigint NOT NULL,
	"entity_id" bigint,
	"finding_id" bigint,
	"status" text DEFAULT 'pending' NOT NULL,
	"search_terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"researched_at" timestamp with time zone,
	CONSTRAINT "research_pool_status_check" CHECK ("research_pool"."status" in ('pending', 'approved', 'done', 'skipped')),
	CONSTRAINT "research_pool_approval_check" CHECK ("research_pool"."researched_at" IS NULL OR "research_pool"."approved_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "finding_labels" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"finding_id" bigint NOT NULL,
	"verdict" text NOT NULL,
	"note" text,
	"labelled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finding_sightings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"finding_id" bigint NOT NULL,
	"source_id" bigint NOT NULL,
	"external_id" text,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finding_sightings_finding_id_source_id_external_id_unique" UNIQUE("finding_id","source_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain_id" bigint NOT NULL,
	"document_id" bigint NOT NULL,
	"entity_id" bigint,
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"score" numeric,
	"score_version" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benchmark_cases" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain_id" bigint NOT NULL,
	"label" text NOT NULL,
	"payload" jsonb NOT NULL,
	"expected" jsonb
);
--> statement-breakpoint
CREATE TABLE "briefings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain_id" bigint NOT NULL,
	"run_id" bigint,
	"body" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_calls" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" bigint,
	"node" text NOT NULL,
	"model" text,
	"prompt_chars" integer,
	"est_tokens" integer,
	"called_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain_id" bigint,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scheduled_by" text NOT NULL,
	CONSTRAINT "runs_status_check" CHECK ("runs"."status" in ('running', 'ok', 'partial', 'failed')),
	CONSTRAINT "runs_scheduled_by_check" CHECK ("runs"."scheduled_by" in ('interval', 'agent', 'operator'))
);
--> statement-breakpoint
CREATE TABLE "export_subscriptions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain_id" bigint NOT NULL,
	"format" text NOT NULL,
	"connector_id" bigint NOT NULL,
	"interval_seconds" integer NOT NULL,
	"next_run_at" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	"min_interval_seconds" integer,
	"max_interval_seconds" integer,
	CONSTRAINT "export_subscriptions_domain_id_format_connector_id_unique" UNIQUE("domain_id","format","connector_id"),
	CONSTRAINT "export_subscriptions_format_check" CHECK ("export_subscriptions"."format" in ('obsidian_md', 'notion_md', 'rss', 'pdf', 'email_draft'))
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain_id" bigint NOT NULL,
	"name" text NOT NULL,
	"search_terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"interval_seconds" integer NOT NULL,
	"next_run_at" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	"min_interval_seconds" integer,
	"max_interval_seconds" integer,
	CONSTRAINT "topics_domain_id_name_unique" UNIQUE("domain_id","name")
);
--> statement-breakpoint
CREATE TABLE "connectors" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "connectors_kind_name_unique" UNIQUE("kind","name"),
	CONSTRAINT "connectors_kind_check" CHECK ("connectors"."kind" in ('llm', 'search', 'notebook', 'export_target'))
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain_id" bigint NOT NULL,
	"kind" text NOT NULL,
	"endpoint" text NOT NULL,
	"parser_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"contract" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cursor" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"last_success_at" timestamp with time zone,
	"last_failure_at" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	CONSTRAINT "sources_kind_check" CHECK ("sources"."kind" in ('url', 'api', 'rss', 'push'))
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain_id" bigint NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" bigint,
	CONSTRAINT "categories_domain_id_key_unique" UNIQUE("domain_id","key")
);
--> statement-breakpoint
CREATE TABLE "criteria" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain_id" bigint NOT NULL,
	"category_id" bigint NOT NULL,
	"value" text NOT NULL,
	"kind" text NOT NULL,
	"notes" text,
	CONSTRAINT "criteria_category_id_value_unique" UNIQUE("category_id","value")
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"category_id" bigint NOT NULL,
	"pattern" text NOT NULL,
	"weight" integer NOT NULL,
	"polarity" text NOT NULL,
	"notes" text,
	CONSTRAINT "terms_category_id_pattern_unique" UNIQUE("category_id","pattern"),
	CONSTRAINT "terms_polarity_check" CHECK ("terms"."polarity" in ('positive', 'negative', 'ignore'))
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingested_files" ADD CONSTRAINT "ingested_files_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_alias_of_entities_id_fk" FOREIGN KEY ("alias_of") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_research" ADD CONSTRAINT "entity_research_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_research" ADD CONSTRAINT "entity_research_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_pool" ADD CONSTRAINT "research_pool_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_pool" ADD CONSTRAINT "research_pool_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_pool" ADD CONSTRAINT "research_pool_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_labels" ADD CONSTRAINT "finding_labels_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_sightings" ADD CONSTRAINT "finding_sightings_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_sightings" ADD CONSTRAINT "finding_sightings_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmark_cases" ADD CONSTRAINT "benchmark_cases_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "briefings" ADD CONSTRAINT "briefings_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "briefings" ADD CONSTRAINT "briefings_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_calls" ADD CONSTRAINT "llm_calls_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_subscriptions" ADD CONSTRAINT "export_subscriptions_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_subscriptions" ADD CONSTRAINT "export_subscriptions_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."connectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criteria" ADD CONSTRAINT "criteria_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criteria" ADD CONSTRAINT "criteria_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "export_subscriptions_dispatch_claim_idx" ON "export_subscriptions" USING btree ("enabled","next_run_at") WHERE "export_subscriptions"."enabled";--> statement-breakpoint
CREATE INDEX "topics_dispatch_claim_idx" ON "topics" USING btree ("enabled","next_run_at") WHERE "topics"."enabled";