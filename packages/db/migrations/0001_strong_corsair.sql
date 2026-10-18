CREATE TYPE "public"."share_role" AS ENUM('editor', 'viewer');--> statement-breakpoint
CREATE TABLE "flow_access" (
	"flow_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "share_role" NOT NULL,
	"invited_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flow_access_flow_id_email_pk" PRIMARY KEY("flow_id","email")
);
--> statement-breakpoint
CREATE TABLE "flow_version" (
	"id" text PRIMARY KEY NOT NULL,
	"flow_id" text NOT NULL,
	"doc" "bytea" NOT NULL,
	"snapshot" jsonb NOT NULL,
	"label" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "flow" ADD COLUMN "public_token" text;--> statement-breakpoint
ALTER TABLE "flow_access" ADD CONSTRAINT "flow_access_flow_id_flow_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flow"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_access" ADD CONSTRAINT "flow_access_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_version" ADD CONSTRAINT "flow_version_flow_id_flow_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flow"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_version" ADD CONSTRAINT "flow_version_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flow_access_email_idx" ON "flow_access" USING btree ("email");--> statement-breakpoint
CREATE INDEX "flow_version_flow_created_idx" ON "flow_version" USING btree ("flow_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "flow" ADD CONSTRAINT "flow_public_token_unique" UNIQUE("public_token");