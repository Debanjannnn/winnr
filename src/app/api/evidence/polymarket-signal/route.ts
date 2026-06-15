import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// x402-style paid evidence seller. Without an `X-PAYMENT` header it returns a
// 402 challenge; with one it returns paid evidence and a receipt.
export function GET(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl;
  const marketId = searchParams.get("marketId") ?? "unknown-market";
  const providerId = searchParams.get("providerId") ?? "macro-signal-api";
  const payment = request.headers.get("x-payment");

  if (!payment) {
    return NextResponse.json(
      {
        x402Version: 1,
        endpoint: `${pathname}?marketId=${marketId}&providerId=${providerId}`,
        accepts: [
          {
            asset: "USDC",
            amountUsd: 0.1,
            network: process.env.X402_NETWORK ?? "base-sepolia",
            payTo: process.env.X402_PROVIDER_ADDRESS ?? "set-X402_PROVIDER_ADDRESS"
          }
        ]
      },
      { status: 402 }
    );
  }

  return NextResponse.json({
    receiptId: `x402_receipt_${crypto.randomUUID()}`,
    paymentReceipt: {
      id: `x402_receipt_${crypto.randomUUID()}`,
      asset: "USDC",
      amountUsd: 0.1,
      status: "paid"
    },
    evidence: {
      id: `evidence_${marketId}_${crypto.randomUUID()}`,
      qualityScore: 0.78,
      sourceRisk: "medium",
      claims: [
        `Paid provider ${providerId} found a probability gap on ${marketId}.`,
        "Evidence quality is useful but should be capped because provider reputation is not yet battle-tested.",
        "Liquidity check is required before any prediction-market execution."
      ]
    }
  });
}
