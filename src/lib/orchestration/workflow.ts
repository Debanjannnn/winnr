import { MetaMaskSmartAccountsAdapter } from "../adapters/metamask";
import { createOneShotRelayerAdapter } from "../adapters/oneshot";
import { createPolymarketAdapter } from "../adapters/polymarket";
import { createVeniceAdapter } from "../adapters/venice";
import { createX402EvidenceAdapter } from "../adapters/x402";
import { CoordinatorAgent } from "../agents/agents";
import { createDefaultPermissionScope } from "../domain/permissions";
import {
  createId,
  EventType,
  type AuditSummary,
  type DomainEvent,
  type MetaMaskPermissionGrant,
  type Session,
  type StartSessionInput,
  nowIso
} from "../domain/types";
import { EventStore, SessionStore } from "./event-store";
import { loadEvents, loadSession, persistRun } from "./persistence";

export interface Runtime {
  eventStore: EventStore;
  sessionStore: SessionStore;
  startSession(input: StartSessionInput): Promise<Session>;
  getSession(sessionId: string): Promise<Session | null>;
  listEvents(sessionId: string): Promise<DomainEvent[]>;
  getAudit(sessionId: string): Promise<RuntimeAudit | null>;
}

export interface RuntimeAudit {
  session: Session;
  events: DomainEvent[];
  permission: Session["permissionScope"];
  summary: AuditSummary | null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown workflow error";
}

function assertPermissionGrantAllowed(
  permissionGrant: MetaMaskPermissionGrant | undefined
): asserts permissionGrant is MetaMaskPermissionGrant {
  if (permissionGrant?.mode !== "metamask") {
    throw new Error("MetaMask Advanced Permission grant is required for this session");
  }
}

export function createRuntime(): Runtime {
  const eventStore = new EventStore();
  const sessionStore = new SessionStore();
  const coordinator = new CoordinatorAgent({
    eventStore,
    sessionStore,
    metamask: new MetaMaskSmartAccountsAdapter(),
    x402: createX402EvidenceAdapter(),
    venice: createVeniceAdapter(),
    oneShot: createOneShotRelayerAdapter(),
    polymarket: createPolymarketAdapter()
  });

  return {
    eventStore,
    sessionStore,
    async startSession({
      objective,
      marketId,
      permissionGrant,
      userId = "demo-user"
    }: StartSessionInput): Promise<Session> {
      assertPermissionGrantAllowed(permissionGrant);
      const effectiveUserId = permissionGrant?.accountAddress ?? userId;
      const session = sessionStore.create({
        id: createId("session"),
        userId: effectiveUserId,
        objective,
        marketId,
        status: "running",
        permissionScope: createDefaultPermissionScope({ userId: effectiveUserId, marketId }),
        permissionGrant,
        createdAt: nowIso(),
        updatedAt: nowIso()
      });

      eventStore.append(session.id, EventType.SESSION_CREATED, {
        objective,
        marketId,
        userId: effectiveUserId
      });

      let finalSession: Session;
      try {
        const result = await coordinator.run(session);
        finalSession = sessionStore.update(session.id, {
          status: "completed",
          result
        });
      } catch (error) {
        const message = errorMessage(error);
        eventStore.append(session.id, EventType.WORKFLOW_FAILED, { message });
        finalSession = sessionStore.update(session.id, {
          status: "failed",
          error: message
        });
      }

      // Durably project the completed/failed run into Neon. Best-effort: a
      // persistence failure must not mask the run result the caller is awaiting.
      try {
        await persistRun(finalSession, eventStore.list(session.id));
      } catch (error) {
        eventStore.append(session.id, EventType.WORKFLOW_FAILED, {
          message: `persistence failed: ${errorMessage(error)}`,
          nonFatal: true
        });
      }
      return finalSession;
    },
    async getSession(sessionId: string): Promise<Session | null> {
      return sessionStore.get(sessionId) ?? (await loadSession(sessionId));
    },
    async listEvents(sessionId: string): Promise<DomainEvent[]> {
      if (sessionStore.get(sessionId)) return eventStore.list(sessionId);
      return loadEvents(sessionId);
    },
    async getAudit(sessionId: string): Promise<RuntimeAudit | null> {
      const session = sessionStore.get(sessionId) ?? (await loadSession(sessionId));
      if (!session) return null;
      const events = sessionStore.get(sessionId)
        ? eventStore.list(sessionId)
        : await loadEvents(sessionId);
      return {
        session,
        events,
        permission: session.permissionScope,
        summary: session.result?.audit ?? null
      };
    }
  };
}
