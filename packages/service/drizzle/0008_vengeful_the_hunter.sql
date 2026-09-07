ALTER TABLE "research_pool" ADD COLUMN "root_event_id" bigint;--> statement-breakpoint
ALTER TABLE "research_pool" ADD CONSTRAINT "research_pool_root_event_id_runs_id_fk" FOREIGN KEY ("root_event_id") REFERENCES "public"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "research_pool_root_event_id_idx" ON "research_pool" USING btree ("root_event_id");