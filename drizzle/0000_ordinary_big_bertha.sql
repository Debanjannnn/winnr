CREATE TABLE "a2a_messages" (
	"message_id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"parent_message_id" text,
	"from_agent" text NOT NULL,
	"to_agent" text NOT NULL,
	"task" text NOT NULL,
	"permission_scope_id" text,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_records" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"summary" text,
	"event_count" integer,
	"narrative" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"seq" bigserial NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"provider_id" text,
	"market_id" text,
	"amount_usd" double precision,
	"evidence_hash" text,
	"receipt" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executions" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"decision_id" text NOT NULL,
	"task_id" text,
	"status" text,
	"tx_hash" text,
	"fill" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"market_whitelist" jsonb,
	"allowed_providers" jsonb,
	"allowed_actions" jsonb,
	"total_budget_usd" double precision NOT NULL,
	"remaining_budget_usd" double precision NOT NULL,
	"max_evidence_purchase_usd" double precision NOT NULL,
	"max_trade_usd" double precision NOT NULL,
	"slippage_bps" integer NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"objective" text NOT NULL,
	"market_id" text NOT NULL,
	"status" text NOT NULL,
	"permission_scope" jsonb NOT NULL,
	"permission_grant" jsonb NOT NULL,
	"result" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "executions_session_decision_idx" ON "executions" USING btree ("session_id","decision_id");