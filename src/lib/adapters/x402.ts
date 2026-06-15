import { createx402DelegationProvider } from "@metamask/smart-accounts-kit/experimental";
import type { PaymentRequirements } from "@metamask/smart-accounts-kit/experimental";
import type { Hex } from "viem";
import { assertCanPurchaseEvidence } from "../domain/permissions";
import { getRoleAccount } from "../chain/agent-keys";
import { getEnvironment } from "../chain/redelegation";
import {
  AgentRole,
  type Evidence,
  type EvidencePurchaseResult,
  type MetaMaskPermissionGrant,
  type PermissionScope
} from "../domain/types";

export interface X402EvidenceAdapter {
  purchaseEvidence(input: {
    permissionScope: PermissionScope;
    permissionGrant: MetaMaskPermissionGrant;
    evidenceContext: Hex;
    providerId: string;
    marketId: string;
    amountUsd: number;
  }): Promise<EvidencePurchaseResult>;
}

interface EvidenceProviderResponse {
  receiptId?: string;
  paymentReceipt?: { id?: string; asset?: string; amountUsd?: number; status?: string };
  evidence?: Evidence;
  claims?: string[];
  qualityScore?: number;
  sourceRisk?: "low" | "medium" | "high";
}

function sellerUrl(marketId: string, providerId: string): string {
  const base =
    process.env.X402_SELLER_URL ?? "http://localhost:3000/api/x402/evidence";
  const url = new URL(base);
  url.searchParams.set("marketId", marketId);
  url.searchParams.set("providerId", providerId);
  return url.toString();
}

function sourceRisk(value: unknown): "low" | "medium" | "high" {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
}

function parseEvidence(body: EvidenceProviderResponse): Evidence {
  if (body.evidence) return body.evidence;
  return {
    id: `evidence_${crypto.randomUUID()}`,
    qualityScore:
      typeof body.qualityScore === "number" && Number.isFinite(body.qualityScore)
        ? Math.max(0, Math.min(1, body.qualityScore))
        : 0.5,
    claims: Array.isArray(body.claims)
      ? body.claims.filter((claim): claim is string => typeof claim === "string")
      : [],
    sourceRisk: sourceRisk(body.sourceRisk)
  };
}

/**
 * Real x402 client. The evidence agent holds a redelegated slice of the user's
 * grant; on a 402 challenge it uses the kit's x402 delegation provider to mint a
 * payment payload — a further ERC-7710 redelegation to the seller's redeemer —
 * and replays the request with the X-PAYMENT header. No EOA pre-approval, the
 * payment authority flows entirely through the delegation chain.
 */
export class LiveX402EvidenceAdapter implements X402EvidenceAdapter {
  async purchaseEvidence({
    permissionScope,
    evidenceContext,
    providerId,
    marketId,
    amountUsd
  }: {
    permissionScope: PermissionScope;
    permissionGrant: MetaMaskPermissionGrant;
    evidenceContext: Hex;
    providerId: string;
    marketId: string;
    amountUsd: number;
  }): Promise<EvidencePurchaseResult> {
    assertCanPurchaseEvidence(permissionScope, providerId, amountUsd);
    const endpoint = sellerUrl(marketId, providerId);

    // 1) Hit the gated resource and expect a 402 with payment requirements.
    const challengeResponse = await fetch(endpoint);
    if (challengeResponse.status !== 402) {
      throw new Error(
        `Expected x402 seller to return 402, received ${challengeResponse.status}`
      );
    }
    const requirements = (await challengeResponse.json()) as PaymentRequirements;

    // 2) Mint the payment payload by redelegating the evidence slice to the
    //    seller's redeemer via the kit x402 delegation provider.
    const provider = createx402DelegationProvider({
      account: getRoleAccount(AgentRole.EVIDENCE),
      environment: getEnvironment(),
      parentPermissionContext: evidenceContext,
      ...(requirements.payTo
        ? { redeemers: { requireRedeemers: true, addresses: [requirements.payTo as Hex] } }
        : {})
    });
    const payload = await provider(requirements);
    const paymentHeader = Buffer.from(JSON.stringify(payload)).toString("base64");

    // 3) Replay with the X-PAYMENT header to unlock the evidence.
    const evidenceResponse = await fetch(endpoint, {
      headers: { "X-PAYMENT": paymentHeader }
    });
    if (!evidenceResponse.ok) {
      const body = await evidenceResponse.text();
      throw new Error(`x402 evidence purchase failed with ${evidenceResponse.status}: ${body}`);
    }
    const body = (await evidenceResponse.json()) as EvidenceProviderResponse;
    const receipt = body.paymentReceipt;
    const requiredUsd = Number(requirements.amount) / 1_000_000 || amountUsd;

    return {
      providerId,
      marketId,
      amountUsd,
      paymentRequired: {
        status: 402,
        asset: "USDC",
        amountUsd: requiredUsd,
        endpoint
      },
      paymentReceipt: {
        id: receipt?.id ?? body.receiptId ?? `x402_${crypto.randomUUID()}`,
        asset: "USDC",
        amountUsd: receipt?.amountUsd ?? requiredUsd,
        status: "paid"
      },
      evidence: parseEvidence(body)
    };
  }
}

export function createX402EvidenceAdapter(): X402EvidenceAdapter {
  return new LiveX402EvidenceAdapter();
}
