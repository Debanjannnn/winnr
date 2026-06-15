export const AgentRole = {
  COORDINATOR: "coordinator",
  SCOUT: "scout",
  EVIDENCE: "evidence",
  RESEARCH: "research",
  RISK: "risk",
  EXECUTION: "execution",
  MONITORING: "monitoring",
  NARRATOR: "narrator"
} as const;

export type AgentRoleValue = (typeof AgentRole)[keyof typeof AgentRole];

export const EventType = {
  SESSION_CREATED: "session.created",
  PERMISSION_GRANTED: "permission.granted",
  REDELEGATION_CREATED: "permission.redelegation.created",
  A2A_MESSAGE_SENT: "a2a.message.sent",
  AGENT_STARTED: "agent.started",
  MARKET_CANDIDATE_DETECTED: "market.candidate.detected",
  X402_PAYMENT_REQUIRED: "x402.payment.required",
  X402_PAYMENT_COMPLETED: "x402.payment.completed",
  EVIDENCE_RECEIVED: "evidence.received",
  RESEARCH_COMPLETED: "research.completed",
  DEBATE_COMPLETED: "debate.completed",
  RISK_DECISION_ISSUED: "risk.decision.issued",
  EXECUTION_SUBMITTED: "execution.submitted",
  EXECUTION_CONFIRMED: "execution.confirmed",
  EXECUTION_SKIPPED: "execution.skipped",
  MONITORING_STATUS_UPDATED: "monitoring.status.updated",
  AUDIT_CREATED: "audit.created",
  WORKFLOW_FAILED: "workflow.failed"
} as const;

export type EventTypeValue = (typeof EventType)[keyof typeof EventType];

export const RiskDecisionStatus = {
  APPROVED: "approved",
  REJECTED: "rejected"
} as const;

export const MarketVenue = {
  POLYMARKET: "polymarket"
} as const;

export type MarketVenueValue = (typeof MarketVenue)[keyof typeof MarketVenue];

export type RiskDecisionStatusValue =
  (typeof RiskDecisionStatus)[keyof typeof RiskDecisionStatus];

export type MarketAction = "buy" | "sell" | "purchase_evidence";

export interface PermissionScope {
  id: string;
  userId: string;
  marketWhitelist: string[];
  allowedProviders: string[];
  allowedActions: MarketAction[];
  totalBudgetUsd: number;
  remainingBudgetUsd: number;
  maxEvidencePurchaseUsd: number;
  maxTradeUsd: number;
  slippageBps: number;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface MetaMaskPermissionGrant {
  mode: "metamask";
  accountAddress: string;
  sessionAddress: string;
  chainId: number;
  grantedPermissions: unknown[];
  requestedAt: string;
}

export interface A2AMessage {
  messageId: string;
  fromAgent: AgentRoleValue;
  toAgent: AgentRoleValue;
  task: string;
  permissionScopeId: string;
  parentMessageId: string | null;
  payload: Record<string, unknown>;
}

export interface Session {
  id: string;
  userId: string;
  objective: string;
  marketId: string;
  status: "running" | "completed" | "failed";
  permissionScope: PermissionScope;
  permissionGrant: MetaMaskPermissionGrant;
  createdAt: string;
  updatedAt: string;
  result?: WorkflowResult;
  error?: string;
}

export interface MarketCandidate {
  id: string;
  venue: MarketVenueValue;
  title: string;
  currentProbability: number;
  estimatedProbability: number;
  liquidityUsd: number;
  recencyScore: number;
  anomalyScore: number;
  url: string;
  conditionId?: string;
  clobTokenIds?: string[];
  outcomes?: string[];
  orderBookEnabled: boolean;
}

export interface Evidence {
  id: string;
  qualityScore: number;
  claims: string[];
  sourceRisk: "low" | "medium" | "high";
}

export interface X402PaymentRequired {
  status: 402;
  asset: "USDC";
  amountUsd: number;
  endpoint: string;
}

export interface X402PaymentReceipt {
  id: string;
  asset: "USDC";
  amountUsd: number;
  status: "paid";
}

export interface EvidencePurchaseResult {
  providerId: string;
  marketId: string;
  amountUsd: number;
  paymentRequired: X402PaymentRequired;
  paymentReceipt: X402PaymentReceipt;
  evidence: Evidence;
}

export interface DebateResult {
  bull: {
    confidence: number;
    thesis: string;
    reasons: string[];
  };
  bear: {
    confidence: number;
    thesis: string;
    reasons: string[];
  };
  consensus: {
    modelProbability: number;
    disagreement: number;
    summary: string;
  };
}

export interface RiskDecision {
  status: RiskDecisionStatusValue;
  suggestedUsd: number;
  score: {
    edge: number;
    liquidityScore: number;
    signalScore: number;
  };
  constraints: {
    maxTradeUsd: number;
    remainingBudgetUsd: number;
    slippageBps: number;
  };
  reason: string;
}

export interface RelayerSubmission {
  taskId: string;
  status: "submitted";
  feeAsset: "USDC";
  feeUsd: number;
  transactionHash: string | null;
}

export interface RelayerConfirmation {
  taskId: string;
  status: "confirmed" | "rejected" | "reverted";
  transactionHash: string | null;
}

export interface AuditSummary {
  summary: string;
  eventCount: number;
}

export interface WorkflowResult {
  market: MarketCandidate;
  evidence: Evidence;
  debate: DebateResult;
  riskDecision: RiskDecision;
  execution: RelayerConfirmation | null;
  audit: AuditSummary;
}

export interface DomainEvent<TPayload = unknown> {
  id: string;
  sessionId: string;
  type: EventTypeValue;
  payload: TPayload;
  createdAt: string;
}

export interface StartSessionInput {
  objective: string;
  marketId: string;
  userId?: string | undefined;
  permissionGrant?: MetaMaskPermissionGrant | undefined;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
