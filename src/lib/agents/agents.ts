import type { Hex } from "viem";
import type { MetaMaskAdapter } from "../adapters/metamask";
import type { OneShotRelayerAdapter } from "../adapters/oneshot";
import type { PolymarketAdapter } from "../adapters/polymarket";
import type { VeniceAdapter } from "../adapters/venice";
import type { X402EvidenceAdapter } from "../adapters/x402";
import { consumeBudget } from "../domain/permissions";
import {
  AgentRole,
  EventType,
  RiskDecisionStatus,
  createId,
  type AuditSummary,
  type A2AMessage,
  type DebateResult,
  type Evidence,
  type EvidencePurchaseResult,
  type MarketCandidate,
  type PermissionScope,
  type RelayerConfirmation,
  type RiskDecision,
  type Session,
  type WorkflowResult
} from "../domain/types";
import type { EventStore, SessionStore } from "../orchestration/event-store";
import { decideRisk } from "../risk/risk-engine";

interface CoordinatorDeps {
  eventStore: EventStore;
  metamask: MetaMaskAdapter;
  x402: X402EvidenceAdapter;
  venice: VeniceAdapter;
  oneShot: OneShotRelayerAdapter;
  polymarket: PolymarketAdapter;
  sessionStore: SessionStore;
}

export class CoordinatorAgent {
  private readonly eventStore: EventStore;
  private readonly metamask: MetaMaskAdapter;
  private readonly x402: X402EvidenceAdapter;
  private readonly venice: VeniceAdapter;
  private readonly oneShot: OneShotRelayerAdapter;
  private readonly polymarket: PolymarketAdapter;
  private readonly sessionStore: SessionStore;

  constructor({
    eventStore,
    metamask,
    x402,
    venice,
    oneShot,
    polymarket,
    sessionStore
  }: CoordinatorDeps) {
    this.eventStore = eventStore;
    this.metamask = metamask;
    this.x402 = x402;
    this.venice = venice;
    this.oneShot = oneShot;
    this.polymarket = polymarket;
    this.sessionStore = sessionStore;
  }

  async run(session: Session): Promise<WorkflowResult> {
    const { id: sessionId } = session;
    this.eventStore.append(sessionId, EventType.AGENT_STARTED, {
      role: AgentRole.COORDINATOR
    });

    const permissionGrant = await this.metamask.requestAdvancedPermission({
      userId: session.userId,
      marketId: session.marketId,
      requestedScope: session.permissionScope,
      permissionGrant: session.permissionGrant
    });
    this.eventStore.append(sessionId, EventType.PERMISSION_GRANTED, permissionGrant);

    const evidenceRedelegation = await this.metamask.createRedelegation({
      parentPermissionId: permissionGrant.permissionId,
      parentContext: permissionGrant.permissionContext,
      fromAgent: AgentRole.COORDINATOR,
      toAgent: AgentRole.EVIDENCE,
      scope: session.permissionScope
    });
    this.eventStore.append(sessionId, EventType.REDELEGATION_CREATED, evidenceRedelegation);

    const executionRedelegation = await this.metamask.createRedelegation({
      parentPermissionId: permissionGrant.permissionId,
      parentContext: permissionGrant.permissionContext,
      fromAgent: AgentRole.COORDINATOR,
      toAgent: AgentRole.EXECUTION,
      scope: session.permissionScope
    });
    this.eventStore.append(sessionId, EventType.REDELEGATION_CREATED, executionRedelegation);

    const scoutMessage = emitA2AMessage(this.eventStore, session, {
      fromAgent: AgentRole.COORDINATOR,
      toAgent: AgentRole.SCOUT,
      task: "discover_market_candidate",
      parentMessageId: null,
      payload: { marketId: session.marketId }
    });
    const market = await new ScoutAgent(this.eventStore, this.polymarket).run(session);
    const evidenceMessage = emitA2AMessage(this.eventStore, session, {
      fromAgent: AgentRole.SCOUT,
      toAgent: AgentRole.EVIDENCE,
      task: "purchase_paid_evidence",
      parentMessageId: scoutMessage.messageId,
      payload: { marketId: market.id, providerId: "macro-signal-api" }
    });
    const evidenceResult = await new EvidenceAgent(this.eventStore, this.x402).run({
      session,
      market,
      evidenceContext: evidenceRedelegation.permissionContext
    });

    let permissionScope = consumeBudget(
      session.permissionScope,
      evidenceResult.paymentReceipt.amountUsd
    );
    this.sessionStore.update(sessionId, { permissionScope });

    const researchMessage = emitA2AMessage(this.eventStore, session, {
      fromAgent: AgentRole.EVIDENCE,
      toAgent: AgentRole.RESEARCH,
      task: "debate_evidence",
      parentMessageId: evidenceMessage.messageId,
      payload: { marketId: market.id, evidenceId: evidenceResult.evidence.id }
    });
    const debate = await new ResearchAgent(this.eventStore, this.venice).run({
      session,
      market,
      evidence: evidenceResult.evidence
    });

    const riskMessage = emitA2AMessage(this.eventStore, session, {
      fromAgent: AgentRole.RESEARCH,
      toAgent: AgentRole.RISK,
      task: "score_position_risk",
      parentMessageId: researchMessage.messageId,
      payload: { marketId: market.id, modelProbability: debate.consensus.modelProbability }
    });
    const riskDecision = await new RiskAgent(this.eventStore).run({
      session,
      permissionScope,
      market,
      evidence: evidenceResult.evidence,
      debate
    });

    let execution: RelayerConfirmation | null = null;
    if (riskDecision.status === RiskDecisionStatus.APPROVED && !isOneShotConfigured()) {
      // Risk approved but live relaying is disabled. Record the skip so the run
      // stays complete and auditable instead of spending on-chain. The full 7710
      // execution path runs when ONESHOT_EXECUTION_ENABLED=true with a funded grant.
      this.eventStore.append(session.id, EventType.EXECUTION_SKIPPED, {
        reason: "1Shot execution disabled (set ONESHOT_EXECUTION_ENABLED=true to relay on-chain)",
        suggestedUsd: riskDecision.suggestedUsd
      });
    }
    if (riskDecision.status === RiskDecisionStatus.APPROVED && isOneShotConfigured()) {
      const executionMessage = emitA2AMessage(this.eventStore, session, {
        fromAgent: AgentRole.RISK,
        toAgent: AgentRole.EXECUTION,
        task: "execute_bounded_market_action",
        parentMessageId: riskMessage.messageId,
        payload: { marketId: market.id, suggestedUsd: riskDecision.suggestedUsd }
      });
      execution = await new ExecutionAgent(this.eventStore, this.oneShot).run({
        session,
        permissionScope,
        market,
        riskDecision,
        executionContext: executionRedelegation.permissionContext,
        delegationManager: permissionGrant.delegationManager
      });
      permissionScope = consumeBudget(permissionScope, riskDecision.suggestedUsd);
      this.sessionStore.update(sessionId, { permissionScope });
      emitA2AMessage(this.eventStore, session, {
        fromAgent: AgentRole.EXECUTION,
        toAgent: AgentRole.MONITORING,
        task: "track_oneshot_relayer_status",
        parentMessageId: executionMessage.messageId,
        payload: { taskId: execution.taskId }
      });
      await new MonitoringAgent(this.eventStore).run({ session, execution });
    }

    emitA2AMessage(this.eventStore, session, {
      fromAgent: execution ? AgentRole.MONITORING : AgentRole.RISK,
      toAgent: AgentRole.NARRATOR,
      task: "create_user_audit",
      parentMessageId: null,
      payload: { executed: Boolean(execution) }
    });
    const audit = await new NarratorAgent(this.eventStore, this.venice).run({ session });
    return {
      market,
      evidence: evidenceResult.evidence,
      debate,
      riskDecision,
      execution,
      audit
    };
  }
}

// 1Shot execution is optional. When the relayer isn't configured the workflow
// still completes (permission → evidence → debate → risk → audit) and records an
// EXECUTION_SKIPPED event instead of throwing at the execution step.
function isOneShotConfigured(): boolean {
  return process.env.ONESHOT_EXECUTION_ENABLED === "true";
}

function emitA2AMessage(
  eventStore: EventStore,
  session: Session,
  input: Omit<A2AMessage, "messageId" | "permissionScopeId">
): A2AMessage {
  const message: A2AMessage = {
    messageId: createId("a2a"),
    permissionScopeId: session.permissionScope.id,
    ...input
  };
  eventStore.append(session.id, EventType.A2A_MESSAGE_SENT, message);
  return message;
}

export class ScoutAgent {
  constructor(
    private readonly eventStore: EventStore,
    private readonly polymarket: PolymarketAdapter
  ) {}

  async run(session: Session): Promise<MarketCandidate> {
    this.eventStore.append(session.id, EventType.AGENT_STARTED, { role: AgentRole.SCOUT });
    const market = await this.polymarket.findCandidate({ marketId: session.marketId });
    this.eventStore.append(session.id, EventType.MARKET_CANDIDATE_DETECTED, market);
    return market;
  }
}

export class EvidenceAgent {
  constructor(
    private readonly eventStore: EventStore,
    private readonly x402: X402EvidenceAdapter
  ) {}

  async run({
    session,
    market,
    evidenceContext
  }: {
    session: Session;
    market: MarketCandidate;
    evidenceContext: Hex;
  }): Promise<EvidencePurchaseResult> {
    this.eventStore.append(session.id, EventType.AGENT_STARTED, {
      role: AgentRole.EVIDENCE
    });
    const result = await this.x402.purchaseEvidence({
      permissionScope: session.permissionScope,
      permissionGrant: session.permissionGrant,
      evidenceContext,
      providerId: "macro-signal-api",
      marketId: market.id,
      amountUsd: 0.1
    });
    this.eventStore.append(session.id, EventType.X402_PAYMENT_REQUIRED, result.paymentRequired);
    this.eventStore.append(session.id, EventType.X402_PAYMENT_COMPLETED, result.paymentReceipt);
    this.eventStore.append(session.id, EventType.EVIDENCE_RECEIVED, result.evidence);
    return result;
  }
}

export class ResearchAgent {
  constructor(
    private readonly eventStore: EventStore,
    private readonly venice: VeniceAdapter
  ) {}

  async run({
    session,
    market,
    evidence
  }: {
    session: Session;
    market: MarketCandidate;
    evidence: Evidence;
  }): Promise<DebateResult> {
    this.eventStore.append(session.id, EventType.AGENT_STARTED, {
      role: AgentRole.RESEARCH
    });
    const debate = await this.venice.runDebate({ market, evidence });
    this.eventStore.append(session.id, EventType.RESEARCH_COMPLETED, {
      marketId: market.id,
      evidenceId: evidence.id
    });
    this.eventStore.append(session.id, EventType.DEBATE_COMPLETED, debate);
    return debate;
  }
}

export class RiskAgent {
  constructor(private readonly eventStore: EventStore) {}

  async run({
    session,
    permissionScope,
    market,
    evidence,
    debate
  }: {
    session: Session;
    permissionScope: PermissionScope;
    market: MarketCandidate;
    evidence: Evidence;
    debate: DebateResult;
  }): Promise<RiskDecision> {
    this.eventStore.append(session.id, EventType.AGENT_STARTED, { role: AgentRole.RISK });
    const decision = decideRisk({ permissionScope, market, evidence, debate });
    this.eventStore.append(session.id, EventType.RISK_DECISION_ISSUED, decision);
    return decision;
  }
}

export class ExecutionAgent {
  constructor(
    private readonly eventStore: EventStore,
    private readonly oneShot: OneShotRelayerAdapter
  ) {}

  async run({
    session,
    permissionScope,
    market,
    riskDecision,
    executionContext,
    delegationManager
  }: {
    session: Session;
    permissionScope: PermissionScope;
    market: MarketCandidate;
    riskDecision: RiskDecision;
    executionContext: Hex;
    delegationManager: Hex;
  }): Promise<RelayerConfirmation> {
    this.eventStore.append(session.id, EventType.AGENT_STARTED, {
      role: AgentRole.EXECUTION
    });
    const submitted = await this.oneShot.submitDelegatedTransaction({
      permissionScope,
      permissionGrant: session.permissionGrant,
      executionContext,
      delegationManager,
      marketId: market.id,
      amountUsd: riskDecision.suggestedUsd,
      action: "buy"
    });
    this.eventStore.append(session.id, EventType.EXECUTION_SUBMITTED, submitted);
    const confirmed = await this.oneShot.waitForConfirmation(submitted.taskId);
    this.eventStore.append(session.id, EventType.EXECUTION_CONFIRMED, confirmed);
    return confirmed;
  }
}

export class MonitoringAgent {
  constructor(private readonly eventStore: EventStore) {}

  async run({
    session,
    execution
  }: {
    session: Session;
    execution: RelayerConfirmation;
  }): Promise<void> {
    this.eventStore.append(session.id, EventType.AGENT_STARTED, {
      role: AgentRole.MONITORING
    });
    this.eventStore.append(session.id, EventType.MONITORING_STATUS_UPDATED, {
      taskId: execution.taskId,
      status: execution.status,
      source: "1shot-status"
    });
  }
}

export class NarratorAgent {
  constructor(
    private readonly eventStore: EventStore,
    private readonly venice: VeniceAdapter
  ) {}

  async run({ session }: { session: Session }): Promise<AuditSummary> {
    this.eventStore.append(session.id, EventType.AGENT_STARTED, {
      role: AgentRole.NARRATOR
    });
    const events = this.eventStore.list(session.id);
    const summary = await this.venice.summarizeAudit({ events });
    const audit: AuditSummary = { summary, eventCount: events.length };
    this.eventStore.append(session.id, EventType.AUDIT_CREATED, audit);
    return audit;
  }
}
