import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "../db/client";
import {
  EventType,
  type A2AMessage,
  type AuditSummary,
  type DomainEvent,
  type Session
} from "../domain/types";

// Durable projection of a run into Neon. The live run uses the in-memory stores;
// at the end of startSession we write the full audit trail (session, events, A2A
// handoffs, permission scope, audit) so runs survive restarts and are queryable.

function asRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
}

export async function persistRun(session: Session, events: DomainEvent[]): Promise<void> {
  const db = getDb();
  await db
    .insert(schema.sessions)
    .values({
      id: session.id,
      userId: session.userId,
      objective: session.objective,
      marketId: session.marketId,
      status: session.status,
      permissionScope: session.permissionScope,
      permissionGrant: session.permissionGrant,
      result: session.result ?? null,
      error: session.error ?? null,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    })
    .onConflictDoUpdate({
      target: schema.sessions.id,
      set: {
        status: session.status,
        permissionScope: session.permissionScope,
        result: session.result ?? null,
        error: session.error ?? null,
        updatedAt: session.updatedAt
      }
    });

  const scope = session.permissionScope;
  await db
    .insert(schema.permissions)
    .values({
      id: scope.id,
      sessionId: session.id,
      userId: scope.userId,
      marketWhitelist: scope.marketWhitelist,
      allowedProviders: scope.allowedProviders,
      allowedActions: scope.allowedActions,
      totalBudgetUsd: scope.totalBudgetUsd,
      remainingBudgetUsd: scope.remainingBudgetUsd,
      maxEvidencePurchaseUsd: scope.maxEvidencePurchaseUsd,
      maxTradeUsd: scope.maxTradeUsd,
      slippageBps: scope.slippageBps,
      expiresAt: scope.expiresAt,
      revokedAt: scope.revokedAt,
      createdAt: scope.createdAt
    })
    .onConflictDoUpdate({
      target: schema.permissions.id,
      set: { remainingBudgetUsd: scope.remainingBudgetUsd }
    });

  if (events.length > 0) {
    await db
      .insert(schema.events)
      .values(
        events.map((event) => ({
          id: event.id,
          sessionId: event.sessionId,
          type: event.type,
          payload: asRecord(event.payload),
          createdAt: event.createdAt
        }))
      )
      .onConflictDoNothing({ target: schema.events.id });
  }

  const a2aRows = events
    .filter((event) => event.type === EventType.A2A_MESSAGE_SENT)
    .map((event) => {
      const message = event.payload as A2AMessage;
      return {
        messageId: message.messageId,
        sessionId: event.sessionId,
        parentMessageId: message.parentMessageId ?? null,
        fromAgent: message.fromAgent,
        toAgent: message.toAgent,
        task: message.task,
        permissionScopeId: message.permissionScopeId ?? null,
        payload: asRecord(message.payload),
        createdAt: event.createdAt
      };
    });
  if (a2aRows.length > 0) {
    await db
      .insert(schema.a2aMessages)
      .values(a2aRows)
      .onConflictDoNothing({ target: schema.a2aMessages.messageId });
  }

  const auditEvent = events.find((event) => event.type === EventType.AUDIT_CREATED);
  if (auditEvent) {
    const audit = auditEvent.payload as AuditSummary;
    await db
      .insert(schema.auditRecords)
      .values({
        id: auditEvent.id,
        sessionId: auditEvent.sessionId,
        summary: audit.summary,
        eventCount: audit.eventCount,
        narrative: { ...audit },
        createdAt: auditEvent.createdAt
      })
      .onConflictDoNothing({ target: schema.auditRecords.id });
  }
}

export async function loadSession(sessionId: string): Promise<Session | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    objective: row.objective,
    marketId: row.marketId,
    status: row.status,
    permissionScope: row.permissionScope,
    permissionGrant: row.permissionGrant,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...(row.result ? { result: row.result } : {}),
    ...(row.error ? { error: row.error } : {})
  };
}

export async function loadEvents(sessionId: string): Promise<DomainEvent[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.events)
    .where(eq(schema.events.sessionId, sessionId))
    .orderBy(asc(schema.events.seq));
  return rows.map((row) => ({
    id: row.id,
    sessionId: row.sessionId,
    type: row.type as DomainEvent["type"],
    payload: row.payload,
    createdAt: row.createdAt
  }));
}
