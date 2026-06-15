import { type MarketAction, type PermissionScope, nowIso } from "./types";

interface CreatePermissionInput {
  userId: string;
  marketId: string;
}

export function createDefaultPermissionScope({
  userId,
  marketId
}: CreatePermissionInput): PermissionScope {
  const now = Date.now();
  return {
    id: `perm_${crypto.randomUUID()}`,
    userId,
    marketWhitelist: [marketId],
    allowedProviders: ["macro-signal-api"],
    allowedActions: ["buy", "sell", "purchase_evidence"],
    totalBudgetUsd: 10,
    remainingBudgetUsd: 10,
    maxEvidencePurchaseUsd: 0.25,
    maxTradeUsd: 2,
    slippageBps: 200,
    expiresAt: new Date(now + 30 * 60 * 1000).toISOString(),
    revokedAt: null,
    createdAt: nowIso()
  };
}

export function assertPermissionActive(
  scope: PermissionScope,
  at = new Date()
): void {
  if (scope.revokedAt) {
    throw new Error("Permission has been revoked");
  }
  if (new Date(scope.expiresAt).getTime() <= at.getTime()) {
    throw new Error("Permission has expired");
  }
}

export function assertCanPurchaseEvidence(
  scope: PermissionScope,
  providerId: string,
  amountUsd: number
): void {
  assertPermissionActive(scope);
  if (!scope.allowedProviders.includes(providerId)) {
    throw new Error(`Provider ${providerId} is not whitelisted`);
  }
  if (amountUsd > scope.maxEvidencePurchaseUsd) {
    throw new Error("Evidence purchase exceeds single-purchase cap");
  }
  if (amountUsd > scope.remainingBudgetUsd) {
    throw new Error("Evidence purchase exceeds remaining budget");
  }
}

export function assertCanExecuteMarketAction(
  scope: PermissionScope,
  marketId: string,
  amountUsd: number,
  action: MarketAction
): void {
  assertPermissionActive(scope);
  if (!scope.marketWhitelist.includes(marketId)) {
    throw new Error(`Market ${marketId} is not whitelisted`);
  }
  if (!scope.allowedActions.includes(action)) {
    throw new Error(`Action ${action} is not allowed`);
  }
  if (amountUsd > scope.maxTradeUsd) {
    throw new Error("Market action exceeds max trade cap");
  }
  if (amountUsd > scope.remainingBudgetUsd) {
    throw new Error("Market action exceeds remaining budget");
  }
}

export function consumeBudget(
  scope: PermissionScope,
  amountUsd: number
): PermissionScope {
  return {
    ...scope,
    remainingBudgetUsd: Number((scope.remainingBudgetUsd - amountUsd).toFixed(4))
  };
}
