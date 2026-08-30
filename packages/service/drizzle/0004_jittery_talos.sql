CREATE TABLE "operator_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operator_settings_singleton_check" CHECK ("operator_settings"."id" = 1)
);
