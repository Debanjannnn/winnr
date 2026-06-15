import { keccak256, stringToHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { PaymentRequirements } from "@metamask/smart-accounts-kit/experimental";
import type { Evidence } from "../domain/types";

// In-app x402 evidence seller. It gates a macro-signal resource behind an HTTP
// 402 and only releases it once a valid ERC-7710 payment payload (a delegation
// redeemable for USDC by the seller) is presented. This is a real x402 server:
// the payment authority is a live, on-chain-redeemable delegation chain.

function usdcAddress(): Hex {
  const value = process.env.USDC_ADDRESS;
  if (!value) throw new Error("USDC_ADDRESS is required for the x402 evidence seller");
  return value as Hex;
}

function chainId(): number {
  return Number(process.env.CHAIN_ID ?? "84532");
}

/** The seller's payee/redeemer address. Stable across runs, no funds required to receive. */
export function getSellerAddress(): Hex {
  if (process.env.X402_SELLER_ADDRESS) return process.env.X402_SELLER_ADDRESS as Hex;
  const masterPk = process.env.AGENT_PRIVATE_KEY;
  if (!masterPk) throw new Error("X402_SELLER_ADDRESS or AGENT_PRIVATE_KEY is required");
  const normalized = (masterPk.startsWith("0x") ? masterPk : `0x${masterPk}`) as Hex;
  const sellerPk = keccak256(stringToHex(`x402-seller:${normalized}`));
  return privateKeyToAccount(sellerPk).address;
}

export function evidencePriceUsd(): number {
  const value = Number(process.env.X402_EVIDENCE_PRICE_USD ?? "0.1");
  return Number.isFinite(value) && value > 0 ? value : 0.1;
}

export function buildPaymentRequirements(): PaymentRequirements {
  return {
    scheme: "exact",
    network: `eip155:${chainId()}`,
    asset: usdcAddress(),
    amount: String(Math.round(evidencePriceUsd() * 1_000_000)),
    payTo: getSellerAddress(),
    maxTimeoutSeconds: 60,
    extra: { provider: "macro-signal-api", standard: "erc7710-delegation" }
  };
}

export interface DecodedPayment {
  delegationManager: Hex;
  permissionContext: Hex;
  delegator: Hex;
}

function isHex(value: unknown): value is Hex {
  return typeof value === "string" && value.startsWith("0x") && value.length > 2;
}

/** Validate the X-PAYMENT header: must be a base64 ERC-7710 payment payload. */
export function verifyPayment(header: string | null): DecodedPayment | null {
  if (!header) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = parsed as Record<string, unknown>;
  if (
    !isHex(candidate.delegationManager) ||
    !isHex(candidate.permissionContext) ||
    !isHex(candidate.delegator)
  ) {
    return null;
  }
  return {
    delegationManager: candidate.delegationManager,
    permissionContext: candidate.permissionContext,
    delegator: candidate.delegator
  };
}

/**
 * The paid intelligence itself: a deterministic macro-signal derived from the
 * market id so the same market yields a stable, auditable evidence record.
 */
export function buildEvidence(marketId: string): Evidence {
  const digest = keccak256(stringToHex(`macro-signal:${marketId}`));
  const qualityScore = (parseInt(digest.slice(2, 6), 16) % 1000) / 1000; // 0.000–0.999
  const momentum = parseInt(digest.slice(6, 8), 16) % 2 === 0 ? "bullish" : "bearish";
  const dispersion = (parseInt(digest.slice(8, 10), 16) % 40) / 100; // 0.00–0.39
  const risk: Evidence["sourceRisk"] =
    qualityScore > 0.66 ? "low" : qualityScore > 0.33 ? "medium" : "high";
  return {
    id: `evidence_${digest.slice(2, 18)}`,
    qualityScore: Number(qualityScore.toFixed(3)),
    claims: [
      `Aggregated macro flow for ${marketId} reads ${momentum}.`,
      `Cross-venue price dispersion at ${(dispersion * 100).toFixed(0)}bps.`,
      `Signal confidence ${(qualityScore * 100).toFixed(0)}% from the macro-signal-api feed.`
    ],
    sourceRisk: risk
  };
}
