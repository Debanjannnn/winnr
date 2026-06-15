"use client";

import { useCallback, useEffect, useRef, useState, type UIEvent } from "react";
import { Sidebar, type WorkflowView } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { WalletProvider } from "@/lib/WalletContext";
import { AgentConsole } from "./AgentConsole";
import { FilterRow } from "./FilterRow";
import { MarketDetail } from "./MarketDetail";
import { MarketCard } from "./MarketCard";
import { PositionsView, type Run } from "./PositionsView";
import type { Card } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
const PAGE_SIZE = 24;
const SCROLL_THRESHOLD_PX = 360;
const DEFAULT_SORT = "volume24hr";

function cardId(card: Card, index: number): string {
  return card.type !== "teams" && card.slug ? card.slug : String(index);
}

export function WorkflowDashboard() {
  return (
    <WalletProvider>
      <DashboardInner />
    </WalletProvider>
  );
}

function DashboardInner() {
  const [view, setView] = useState<WorkflowView>("markets");
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAgentPanelOnGrid, setShowAgentPanelOnGrid] = useState(true);

  const addRun = useCallback((run: Run) => {
    setRuns((prev) => [run, ...prev]);
  }, []);

  const updateRun = useCallback((id: string, patch: Partial<Run>) => {
    setRuns((prev) => prev.map((run) => (run.id === id ? { ...run, ...patch } : run)));
  }, []);

  const navigate = useCallback((next: WorkflowView) => {
    setView(next);
    if (next !== "markets") setSelectedCard(null);
  }, []);

  const scrollRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<Card[]>([]);
  cardsRef.current = cards;

  const buildUrl = useCallback(
    (pageOffset: number) => {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(pageOffset));
      if (category) params.set("category", category);
      if (sort) params.set("sort", sort);
      return `${API_BASE_URL}/workflow-markets?${params.toString()}`;
    },
    [category, sort]
  );

  const fetchPage = useCallback(
    async (pageOffset: number): Promise<Card[]> => {
      const response = await fetch(buildUrl(pageOffset));
      if (!response.ok) return [];
      const data = (await response.json()) as Card[];
      return Array.isArray(data) ? data : [];
    },
    [buildUrl]
  );

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      const page = await fetchPage(0);
      setCards(page);
      setOffset(PAGE_SIZE);
      setHasMore(page.length >= PAGE_SIZE);
    } catch {
      // Leave cards as-is on error.
    } finally {
      setRefreshing(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || refreshing || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(offset);
      if (page.length === 0) {
        setHasMore(false);
        return;
      }
      setCards((prev) => [...prev, ...page]);
      setOffset((prev) => prev + PAGE_SIZE);
      if (page.length < PAGE_SIZE) setHasMore(false);
    } catch {
      // Ignore; another scroll will retry.
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, offset, hasMore, loadingMore, refreshing]);

  // Reload when search / category / sort change (debounced so typing doesn't spam the API).
  useEffect(() => {
    const handle = setTimeout(() => {
      void reload();
    }, 250);
    return () => clearTimeout(handle);
  }, [reload]);

  const handleScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      if (selectedCard || !hasMore || loadingMore) return;
      const el = event.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD_PX) {
        void loadMore();
      }
    },
    [selectedCard, hasMore, loadingMore, loadMore]
  );

  // Opening a card pushes a history entry so the browser Back button returns to the grid.
  const openCard = useCallback((card: Card, index: number) => {
    setSelectedCard(card);
    window.history.pushState({}, "", `/workflow?market=${encodeURIComponent(cardId(card, index))}`);
  }, []);

  const closeCard = useCallback(() => {
    window.history.back();
  }, []);

  // Keep the view in sync with the URL: grid on a clean /workflow, the card when ?market is set.
  useEffect(() => {
    const onPop = () => {
      const id = new URLSearchParams(window.location.search).get("market");
      if (!id) {
        setSelectedCard(null);
        return;
      }
      setSelectedCard(cardsRef.current.find((card, index) => cardId(card, index) === id) ?? null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Always show an opened card from the top, even if the grid was scrolled down.
  useEffect(() => {
    if (selectedCard && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [selectedCard]);

  const isMarkets = view === "markets";
  const gridMode = isMarkets && !selectedCard;
  const showAgentPanel = !gridMode || showAgentPanelOnGrid;

  return (
    <div className="workflow-dashboard fixed inset-0 overflow-hidden bg-[#080b0c] text-[#f1f1f4]">
      <div
        className={`flex h-full overflow-hidden bg-[#080b0c] transition-[padding] duration-200 ${
          sidebarCollapsed ? "xl:pl-[72px]" : "xl:pl-[176px]"
        }`}
      >
        <Sidebar
          active={view}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          onNavigate={navigate}
        />
        <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <Navbar
            showAgentPanel={showAgentPanelOnGrid}
            onShowAgentPanelChange={setShowAgentPanelOnGrid}
            onBack={isMarkets && selectedCard ? closeCard : undefined}
          />
          <main className="flex min-h-0 flex-1 flex-col bg-[#080b0c] px-4 pb-[26px] pt-0 lg:px-8 xl:px-[44px]">
            {isMarkets && !selectedCard && (
              <FilterRow
                category={category}
                onCategoryChange={setCategory}
                sort={sort}
                onSortChange={setSort}
                onRefresh={reload}
                refreshing={refreshing}
              />
            )}
            <div
              className={`mt-[14px] grid min-h-0 flex-1 grid-cols-1 items-start gap-[10px] ${
                showAgentPanel ? "lg:grid-cols-[minmax(0,1fr)_350px]" : ""
              }`}
            >
              <section
                ref={scrollRef}
                onScroll={gridMode ? handleScroll : undefined}
                className={`${
                  gridMode
                    ? `grid grid-cols-1 gap-[10px] md:grid-cols-2 ${showAgentPanel ? "xl:grid-cols-3" : "xl:grid-cols-4"}`
                    : "block"
                } h-full min-h-0 overflow-y-auto bg-[#080b0c] pr-[2px]`}
              >
                {view === "positions" ? (
                  <PositionsView runs={runs} />
                ) : selectedCard ? (
                  <MarketDetail card={selectedCard} />
                ) : cards.length === 0 ? (
                  <div className="col-span-full py-[48px] text-center text-[14px] text-[#6c717b]">
                    {refreshing ? "Loading markets…" : "No markets available."}
                  </div>
                ) : (
                  <>
                    {cards.map((card, index) => (
                      <MarketCard key={`${card.type}-${index}`} card={card} onOpen={() => openCard(card, index)} />
                    ))}
                    {loadingMore && (
                      <div className="col-span-full py-[18px] text-center text-[13px] text-[#6c717b]">
                        Loading more markets…
                      </div>
                    )}
                  </>
                )}
              </section>
              {showAgentPanel ? (
                <AgentConsole
                  card={isMarkets ? selectedCard : null}
                  runs={runs}
                  onRunStart={addRun}
                  onRunUpdate={updateRun}
                />
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
