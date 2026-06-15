import { NextResponse, type NextRequest } from "next/server";
import { createPolymarketAdapter } from "@/lib/adapters/polymarket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const polymarket = createPolymarketAdapter();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get("tokenId")?.trim();
  if (!tokenId) {
    return NextResponse.json({ error: "tokenId is required" }, { status: 400 });
  }
  const interval = searchParams.get("interval")?.trim() || undefined;
  const fidelityParam = Number(searchParams.get("fidelity"));
  const fidelity = Number.isFinite(fidelityParam) && fidelityParam > 0 ? fidelityParam : undefined;

  try {
    const history = await polymarket.getPriceHistory({
      tokenId,
      ...(interval ? { interval } : {}),
      ...(fidelity ? { fidelity } : {})
    });
    return NextResponse.json(history);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "failed to load price history";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
