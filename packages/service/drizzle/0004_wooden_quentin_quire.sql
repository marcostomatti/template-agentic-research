CREATE TABLE "source_config_proposals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain_id" bigint NOT NULL,
	"source_id" bigint NOT NULL,
	"parser_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"contract" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"proposed_by" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"proposed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	CONSTRAINT "source_config_proposals_status_check" CHECK ("source_config_proposals"."status" in ('pending', 'approved', 'done', 'skipped')),
	CONSTRAINT "source_config_proposals_approval_check" CHECK ("source_config_proposals"."applied_at" IS NULL OR "source_config_proposals"."approved_at" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "source_config_proposals" ADD CONSTRAINT "source_config_proposals_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_config_proposals" ADD CONSTRAINT "source_config_proposals_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;