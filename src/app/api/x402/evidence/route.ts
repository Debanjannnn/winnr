import { NextResponse, type NextRequest } from "next/server";
import {
  buildEvidence,
  buildPaymentRequirements,
  evidencePriceUsd,
  verifyPayment
} from "@/lib/x402/seller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// x402 evidence seller. No X-PAYMENT → 402 + payment requirements. Valid
// X-PAYMENT (an ERC-7710 delegation payload) → the gated macro signal + receipt.
export async function GET(request: NextRequest) {
  const marketId = request.nextUrl.searchParams.get("marketId") ?? "unknown-market";
  const providerId = request.nextUrl.searchParams.get("providerId") ?? "macro-signal-api";

  const payment = verifyPayment(request.headers.get("x-payment"));
  if (!payment) {
    return NextResponse.json(buildPaymentRequirements(), {
      status: 402,
      headers: { "Cache-Control": "no-store" }
    });
  }

  const evidence = buildEvidence(marketId);
  return NextResponse.json(
    {
      evidence,
      providerId,
      paymentReceipt: {
        id: `x402_${payment.permissionContext.slice(2, 18)}`,
        asset: "USDC",
        amountUsd: evidencePriceUsd(),
        status: "paid",
        delegator: payment.delegator,
        delegationManager: payment.delegationManager
      }
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
