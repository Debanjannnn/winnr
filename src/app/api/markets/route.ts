import { NextResponse, type NextRequest } from "next/server";
import { createPolymarketAdapter } from "@/lib/adapters/polymarket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const polymarket = createPolymarketAdapter();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || undefined;
  const limitParam = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 24;

  try {
    const markets = await polymarket.listMarkets(search ? { search, limit } : { limit });
    return NextResponse.json(markets);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "failed to list markets";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
