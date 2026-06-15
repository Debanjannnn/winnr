import { NextResponse, type NextRequest } from "next/server";
import { createPolymarketAdapter, type PolymarketEventSummary } from "@/lib/adapters/polymarket";
import type { Card } from "@/components/Workflow/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const polymarket = createPolymarketAdapter();

function formatVolume(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}m Vol`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k Vol`;
  return `$${Math.round(value)} Vol`;
}

function pct(probability: number): string {
  return `${Math.round(probability * 100)}%`;
}

function toCard(event: PolymarketEventSummary): Card {
  const volume = formatVolume(event.volumeUsd);
  const slug = event.slug;
  const clobTokenId = event.outcomes[0]?.clobTokenId ?? "";
  const closed = event.closed;
  const breakdown = event.outcomes.slice(0, 5).map((outcome) => ({
    label: outcome.label,
    percent: pct(outcome.probability)
  }));

  if (event.outcomes.length <= 1) {
    const probability = event.outcomes[0]?.probability ?? 0;
    return {
      type: "binary",
      title: event.title,
      image: "",
      imageUrl: event.imageUrl,
      chance: pct(probability),
      volume,
      slug,
      clobTokenId,
      closed,
      breakdown
    };
  }
  return {
    type: "question",
    title: event.title,
    image: "",
    imageUrl: event.imageUrl,
    options: event.outcomes.slice(0, 2).map((outcome) => ({
      label: outcome.label,
      percent: pct(outcome.probability)
    })),
    volume,
    slug,
    clobTokenId,
    closed,
    breakdown
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || undefined;
  const category = searchParams.get("category")?.trim() || undefined;
  const sort = searchParams.get("sort")?.trim() || undefined;
  const limitParam = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 60) : 24;
  const offsetParam = Number(searchParams.get("offset"));
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;

  try {
    const events = await polymarket.listEvents({
      limit,
      offset,
      ...(search ? { search } : {}),
      ...(category ? { category } : {}),
      ...(sort ? { sort } : {})
    });
    return NextResponse.json(events.map(toCard));
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "failed to list events";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
