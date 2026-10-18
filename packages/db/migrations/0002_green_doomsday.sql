CREATE TYPE "public"."flow_event_kind" AS ENUM('message', 'flow.created', 'flow.renamed', 'flow.deleted', 'flow.restored', 'node.added', 'node.removed', 'edge.added', 'edge.removed', 'graph.bulk', 'share.invited', 'share.role_changed', 'share.removed', 'link.enabled', 'link.disabled', 'version.saved', 'version.restored');--> statement-breakpoint
CREATE TABLE "flow_event" (
	"id" text PRIMARY KEY NOT NULL,
	"flow_id" text NOT NULL,
	"actor_id" text,
	"actor_name" text NOT NULL,
	"kind" "flow_event_kind" NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "flow_event" ADD CONSTRAINT "flow_event_flow_id_flow_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flow"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_event" ADD CONSTRAINT "flow_event_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flow_event_flow_created_idx" ON "flow_event" USING btree ("flow_id","created_at" DESC NULLS LAST);