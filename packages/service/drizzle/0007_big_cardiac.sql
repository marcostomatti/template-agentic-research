CREATE INDEX "documents_domain_id_captured_at_idx" ON "documents" USING btree ("domain_id","captured_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "finding_labels_finding_id_labelled_at_idx" ON "finding_labels" USING btree ("finding_id","labelled_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "findings_domain_id_score_created_at_idx" ON "findings" USING btree ("domain_id","score" DESC NULLS LAST,"created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "llm_calls_called_at_idx" ON "llm_calls" USING btree ("called_at");--> statement-breakpoint
CREATE INDEX "runs_domain_id_started_at_idx" ON "runs" USING btree ("domain_id","started_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "source_config_proposals_source_id_status_idx" ON "source_config_proposals" USING btree ("source_id","status");