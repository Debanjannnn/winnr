import { fetch as dohFetch } from "undici";
import { MarketVenue, type MarketCandidate } from "../domain/types";
import { dohAgent } from "../net/doh";

interface GammaMarket {
  id?: string | number;
  slug?: string;
  question?: string;
  title?: string;
  groupItemTitle?: string;
  image?: string;
  icon?: string;
  conditionId?: string;
  clobTokenIds?: string | string[];
  outcomes?: string | string[];
  outcomePrices?: string | string[];
  liquidityNum?: number;
  liquidity?: number | string;
  volumeNum?: number;
  enableOrderBook?: boolean;
}

interface GammaEvent {
  id?: string | number;
  slug?: string;
  title?: string;
  image?: string;
  icon?: string;
  volume?: number | string;
  volumeNum?: number;
  closed?: boolean;
  active?: boolean;
  endDate?: string;
  markets?: GammaMarket[];
}

export interface PolymarketEventSummary {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  volumeUsd: number;
  closed: boolean;
  outcomes: { label: string; probability: number; clobTokenId: string }[];
}

export interface PricePoint {
  t: number;
  p: number;
}

export interface PolymarketMarketSummary {
  id: string;
  slug: string;
  title: string;
  currentProbability: number;
  liquidityUsd: number;
  volumeUsd: number;
  orderBookEnabled: boolean;
  url: string;
}

export interface PolymarketAdapter {
  findCandidate(input: { marketId: string }): Promise<MarketCandidate>;
  listMarkets(input?: { search?: string; limit?: number }): Promise<PolymarketMarketSummary[]>;
  listEvents(input?: {
    search?: string;
    limit?: number;
    offset?: number;
    category?: string;
    sort?: string;
  }): Promise<PolymarketEventSummary[]>;
  getPriceHistory(input: {
    tokenId: string;
    interval?: string;
    fidelity?: number;
  }): Promise<PricePoint[]>;
}

function parseJsonArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseNumber(value: number | string | undefined, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function yesPrice(market: GammaMarket): number {
  const outcomes = parseJsonArray(market.outcomes);
  const prices = parseJsonArray(market.outcomePrices);
  const yesIndex = outcomes.findIndex((outcome) => outcome.toLowerCase() === "yes");
  const index = yesIndex >= 0 ? yesIndex : 0;
  const price = Number(prices[index]);
  return Number.isFinite(price) && price > 0 ? price : 0.35;
}

function toCandidate(market: GammaMarket, requestedMarketId: string): MarketCandidate {
  const currentProbability = yesPrice(market);
  const liquidityUsd = parseNumber(market.liquidityNum, parseNumber(market.liquidity, 1200));
  const id = String(market.slug ?? market.id ?? requestedMarketId);
  const candidate: MarketCandidate = {
    id,
    venue: MarketVenue.POLYMARKET,
    title: market.question ?? market.title ?? "Polymarket prediction market",
    currentProbability,
    estimatedProbability: Math.min(0.99, currentProbability + 0.17),
    liquidityUsd,
    recencyScore: 0.74,
    anomalyScore: 0.67,
    url: `https://polymarket.com/event/${id}`,
    clobTokenIds: parseJsonArray(market.clobTokenIds),
    outcomes: parseJsonArray(market.outcomes),
    orderBookEnabled: market.enableOrderBook ?? true
  };
  if (market.conditionId) {
    candidate.conditionId = market.conditionId;
  }
  return candidate;
}

function toEventSummary(event: GammaEvent): PolymarketEventSummary {
  const id = String(event.slug ?? event.id ?? "");
  const markets = event.markets ?? [];
  const outcomes = markets
    .map((market) => ({
      label: market.groupItemTitle?.trim() || market.question?.trim() || "Outcome",
      probability: yesPrice(market),
      clobTokenId: parseJsonArray(market.clobTokenIds)[0] ?? ""
    }))
    .sort((left, right) => right.probability - left.probability);
  const endedByDate = event.endDate ? new Date(event.endDate).getTime() < Date.now() : false;
  return {
    id,
    title: event.title ?? "Polymarket event",
    slug: String(event.slug ?? id),
    imageUrl: String(event.image ?? event.icon ?? ""),
    volumeUsd: parseNumber(event.volumeNum, parseNumber(event.volume, 0)),
    closed: Boolean(event.closed) || event.active === false || endedByDate,
    outcomes
  };
}

function toSummary(market: GammaMarket): PolymarketMarketSummary {
  const id = String(market.slug ?? market.id ?? "");
  return {
    id,
    slug: String(market.slug ?? id),
    title: market.question ?? market.title ?? "Polymarket prediction market",
    currentProbability: yesPrice(market),
    liquidityUsd: parseNumber(market.liquidityNum, parseNumber(market.liquidity, 0)),
    volumeUsd: parseNumber(market.volumeNum, 0),
    orderBookEnabled: market.enableOrderBook ?? false,
    url: `https://polymarket.com/event/${id}`
  };
}

export class MockPolymarketAdapter implements PolymarketAdapter {
  async findCandidate({ marketId }: { marketId: string }): Promise<MarketCandidate> {
    return {
      id: marketId,
      venue: MarketVenue.POLYMARKET,
      title: "Will ETH exceed $7000 before Dec 2026?",
      currentProbability: 0.35,
      estimatedProbability: 0.52,
      liquidityUsd: 1200,
      recencyScore: 0.74,
      anomalyScore: 0.67,
      url: `https://polymarket.com/event/${marketId}`,
      conditionId: "demo-condition-id",
      clobTokenIds: ["demo-yes-token", "demo-no-token"],
      outcomes: ["Yes", "No"],
      orderBookEnabled: true
    };
  }

  async listMarkets({ search }: { search?: string; limit?: number } = {}): Promise<
    PolymarketMarketSummary[]
  > {
    const markets: PolymarketMarketSummary[] = [
      {
        id: "eth-7000-2026",
        slug: "eth-7000-2026",
        title: "Will ETH exceed $7000 before Dec 2026?",
        currentProbability: 0.35,
        liquidityUsd: 1200,
        volumeUsd: 48000,
        orderBookEnabled: true,
        url: "https://polymarket.com/event/eth-7000-2026"
      },
      {
        id: "btc-150k-2026",
        slug: "btc-150k-2026",
        title: "Will BTC reach $150k in 2026?",
        currentProbability: 0.42,
        liquidityUsd: 9800,
        volumeUsd: 210000,
        orderBookEnabled: true,
        url: "https://polymarket.com/event/btc-150k-2026"
      }
    ];
    if (!search) return markets;
    const needle = search.toLowerCase();
    return markets.filter((market) => market.title.toLowerCase().includes(needle));
  }

  async listEvents({
    search,
    offset = 0
  }: { search?: string; limit?: number; offset?: number } = {}): Promise<
    PolymarketEventSummary[]
  > {
    if (offset > 0) return [];
    const events: PolymarketEventSummary[] = [
      {
        id: "eth-7000-2026",
        title: "Will ETH exceed $7000 before Dec 2026?",
        slug: "eth-7000-2026",
        imageUrl: "",
        volumeUsd: 48000,
        closed: false,
        outcomes: [{ label: "Yes", probability: 0.35, clobTokenId: "" }]
      },
      {
        id: "btc-150k-2026",
        title: "Will BTC reach $150k in 2026?",
        slug: "btc-150k-2026",
        imageUrl: "",
        volumeUsd: 210000,
        closed: false,
        outcomes: [{ label: "Yes", probability: 0.42, clobTokenId: "" }]
      }
    ];
    if (!search) return events;
    const needle = search.toLowerCase();
    return events.filter((event) => event.title.toLowerCase().includes(needle));
  }

  async getPriceHistory(): Promise<PricePoint[]> {
    const start = 1_700_000_000;
    return Array.from({ length: 48 }, (_value, index) => ({
      t: start + index * 3600,
      p: 0.3 + 0.2 * Math.sin(index / 6) + index * 0.004
    }));
  }
}

export class GammaPolymarketAdapter implements PolymarketAdapter {
  constructor(private readonly baseUrl = "https://gamma-api.polymarket.com") {}

  async findCandidate({ marketId }: { marketId: string }): Promise<MarketCandidate> {
    const endpoint = new URL("/markets", this.baseUrl);
    endpoint.searchParams.set("limit", "1");
    endpoint.searchParams.set("active", "true");
    endpoint.searchParams.set("closed", "false");
    endpoint.searchParams.set("slug", marketId);

    const response = await dohFetch(endpoint.href, { dispatcher: dohAgent });
    if (!response.ok) {
      throw new Error(`Polymarket Gamma request failed with ${response.status}`);
    }
    const markets = (await response.json()) as GammaMarket[];
    const market = markets[0];
    if (!market) {
      throw new Error(`No active Polymarket market found for ${marketId}`);
    }
    return toCandidate(market, marketId);
  }

  async listMarkets({ search, limit = 24 }: { search?: string; limit?: number } = {}): Promise<
    PolymarketMarketSummary[]
  > {
    const endpoint = new URL("/markets", this.baseUrl);
    // Over-fetch so client-side title filtering still returns a useful page.
    endpoint.searchParams.set("limit", String(search ? Math.max(limit * 4, 100) : limit));
    endpoint.searchParams.set("active", "true");
    endpoint.searchParams.set("closed", "false");
    endpoint.searchParams.set("order", "liquidityNum");
    endpoint.searchParams.set("ascending", "false");

    const response = await dohFetch(endpoint.href, { dispatcher: dohAgent });
    if (!response.ok) {
      throw new Error(`Polymarket Gamma request failed with ${response.status}`);
    }
    const markets = (await response.json()) as GammaMarket[];
    const summaries = markets.map(toSummary).filter((market) => market.id.length > 0);
    const needle = search?.toLowerCase().trim();
    const filtered = needle
      ? summaries.filter((market) => market.title.toLowerCase().includes(needle))
      : summaries;
    return filtered.slice(0, limit);
  }

  async listEvents({
    search,
    limit = 24,
    offset = 0,
    category,
    sort = "volume24hr"
  }: {
    search?: string;
    limit?: number;
    offset?: number;
    category?: string;
    sort?: string;
  } = {}): Promise<PolymarketEventSummary[]> {
    const endpoint = new URL("/events", this.baseUrl);
    endpoint.searchParams.set("limit", String(search ? Math.max(limit * 4, 100) : limit));
    endpoint.searchParams.set("offset", String(offset));
    endpoint.searchParams.set("active", "true");
    endpoint.searchParams.set("closed", "false");
    endpoint.searchParams.set("order", sort);
    endpoint.searchParams.set("ascending", "false");
    if (category) endpoint.searchParams.set("tag_slug", category);

    const response = await dohFetch(endpoint.href, { dispatcher: dohAgent });
    if (!response.ok) {
      throw new Error(`Polymarket Gamma events request failed with ${response.status}`);
    }
    const events = (await response.json()) as GammaEvent[];
    const summaries = events
      .map(toEventSummary)
      .filter((event) => event.id.length > 0 && event.outcomes.length > 0);
    const needle = search?.toLowerCase().trim();
    const filtered = needle
      ? summaries.filter((event) => event.title.toLowerCase().includes(needle))
      : summaries;
    return filtered.slice(0, limit);
  }

  async getPriceHistory({
    tokenId,
    interval = "1w",
    fidelity = 60
  }: {
    tokenId: string;
    interval?: string;
    fidelity?: number;
  }): Promise<PricePoint[]> {
    const base = process.env.POLYMARKET_CLOB_URL ?? "https://clob.polymarket.com";
    const endpoint = new URL("/prices-history", base);
    endpoint.searchParams.set("market", tokenId);
    endpoint.searchParams.set("interval", interval);
    endpoint.searchParams.set("fidelity", String(fidelity));

    const response = await dohFetch(endpoint.href, { dispatcher: dohAgent });
    if (!response.ok) {
      throw new Error(`Polymarket CLOB price history failed with ${response.status}`);
    }
    const data = (await response.json()) as { history?: PricePoint[] };
    return Array.isArray(data.history) ? data.history : [];
  }
}

export function createPolymarketAdapter(): PolymarketAdapter {
  return new GammaPolymarketAdapter(process.env.POLYMARKET_GAMMA_URL);
}
