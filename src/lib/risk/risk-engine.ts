import {
  RiskDecisionStatus,
  type DebateResult,
  type Evidence,
  type MarketCandidate,
  type PermissionScope,
  type RiskDecision
} from "../domain/types";

export interface RiskInput {
  permissionScope: PermissionScope;
  market: MarketCandidate;
  evidence: Evidence;
  debate: DebateResult;
}

export function scoreOpportunity({
  market,
  evidence,
  debate
}: Pick<RiskInput, "market" | "evidence" | "debate">): RiskDecision["score"] {
  const edge = debate.consensus.modelProbability - market.currentProbability;
  const liquidityScore = Math.min(1, market.liquidityUsd / 5000);
  const disagreementPenalty = 1 - debate.consensus.disagreement;
  const signalScore =
    edge * 0.35 +
    evidence.qualityScore * 0.25 +
    liquidityScore * 0.15 +
    market.recencyScore * 0.1 +
    disagreementPenalty * 0.15;

  return {
    edge: Number(edge.toFixed(4)),
    liquidityScore: Number(liquidityScore.toFixed(4)),
    signalScore: Number(signalScore.toFixed(4))
  };
}

export function decideRisk({
  permissionScope,
  market,
  evidence,
  debate
}: RiskInput): RiskDecision {
  const score = scoreOpportunity({ market, evidence, debate });
  const approved =
    score.edge >= 0.08 && score.signalScore >= 0.45 && market.liquidityUsd >= 500;
  const suggestedUsd = approved
    ? Math.min(permissionScope.maxTradeUsd, permissionScope.remainingBudgetUsd, 1.5)
    : 0;

  return {
    status: approved ? RiskDecisionStatus.APPROVED : RiskDecisionStatus.REJECTED,
    suggestedUsd,
    score,
    constraints: {
      maxTradeUsd: permissionScope.maxTradeUsd,
      remainingBudgetUsd: permissionScope.remainingBudgetUsd,
      slippageBps: permissionScope.slippageBps
    },
    reason: approved
      ? "Signal clears edge, confidence, liquidity, and permission constraints."
      : "Signal did not clear risk thresholds."
  };
}
