import {
  bigserial,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";
import type {
  AuditSummary,
  MarketAction,
  MetaMaskPermissionGrant,
  PermissionScope,
  WorkflowResult
} from "@/lib/domain/types";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow();

/** Sessions — current state of each workflow run (projected from events). */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  objective: text("objective").notNull(),
  marketId: text("market_id").notNull(),
  status: text("status").notNull().$type<"running" | "completed" | "failed">(),
  permissionScope: jsonb("permission_scope").notNull().$type<PermissionScope>(),
  permissionGrant: jsonb("permission_grant").notNull().$type<MetaMaskPermissionGrant>(),
  result: jsonb("result").$type<WorkflowResult>(),
  error: text("error"),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow()
});

/** Events — append-only audit log. `seq` gives total insertion order. */
export const events = pgTable("events", {
  seq: bigserial("seq", { mode: "number" }).notNull(),
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
  createdAt: createdAt()
});

/** A2A messages — agent-to-agent handoffs with parent/child provenance chain. */
export const a2aMessages = pgTable("a2a_messages", {
  messageId: text("message_id").primaryKey(),
  sessionId: text("session_id").notNull(),
  parentMessageId: text("parent_message_id"),
  fromAgent: text("from_agent").notNull(),
  toAgent: text("to_agent").notNull(),
  task: text("task").notNull(),
  permissionScopeId: text("permission_scope_id"),
  payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
  createdAt: createdAt()
});

/** Permissions — granted scope + budget tracking per session. */
export const permissions = pgTable("permissions", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id").notNull(),
  marketWhitelist: jsonb("market_whitelist").$type<string[]>(),
  allowedProviders: jsonb("allowed_providers").$type<string[]>(),
  allowedActions: jsonb("allowed_actions").$type<MarketAction[]>(),
  totalBudgetUsd: doublePrecision("total_budget_usd").notNull(),
  remainingBudgetUsd: doublePrecision("remaining_budget_usd").notNull(),
  maxEvidencePurchaseUsd: doublePrecision("max_evidence_purchase_usd").notNull(),
  maxTradeUsd: doublePrecision("max_trade_usd").notNull(),
  slippageBps: integer("slippage_bps").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
  revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  createdAt: createdAt()
});

/** Evidence purchases — x402 paid intelligence, one row per purchase. */
export const evidencePurchases = pgTable("evidence_purchases", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  providerId: text("provider_id"),
  marketId: text("market_id"),
  amountUsd: doublePrecision("amount_usd"),
  evidenceHash: text("evidence_hash"),
  receipt: jsonb("receipt").$type<Record<string, unknown>>(),
  createdAt: createdAt()
});

/** Executions — relayed transactions, idempotency-keyed on (session, decision). */
export const executions = pgTable(
  "executions",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    decisionId: text("decision_id").notNull(),
    taskId: text("task_id"),
    status: text("status"),
    txHash: text("tx_hash"),
    fill: jsonb("fill").$type<Record<string, unknown>>(),
    createdAt: createdAt()
  },
  (table) => [uniqueIndex("executions_session_decision_idx").on(table.sessionId, table.decisionId)]
);

/** Audit records — the narrator's human-readable + structured summary. */
export const auditRecords = pgTable("audit_records", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  summary: text("summary"),
  eventCount: integer("event_count"),
  narrative: jsonb("narrative").$type<AuditSummary & Record<string, unknown>>(),
  createdAt: createdAt()
});
