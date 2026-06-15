"use client";

import { useEffect, useMemo, useState } from "react";
import type { Card, QuestionOption } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

const VIEW_W = 980;
const VIEW_H = 274;
const Y_TOP = 16;
const Y_BOTTOM = 250;

// Range buttons map to Polymarket CLOB price-history (interval window + fidelity in minutes).
const RANGES = [
  { label: "1m", interval: "6h", fidelity: 1 },
  { label: "3m", interval: "6h", fidelity: 3 },
  { label: "5m", interval: "1d", fidelity: 5 },
  { label: "15m", interval: "1d", fidelity: 15 },
  { label: "30m", interval: "1w", fidelity: 30 },
  { label: "1H", interval: "1w", fidelity: 60 },
  { label: "1D", interval: "max", fidelity: 1440 },
  { label: "1W", interval: "max", fidelity: 10080 },
  { label: "1M", interval: "max", fidelity: 43200 },
  { label: "1Y", interval: "max", fidelity: 525600 }
] as const;

const DEFAULT_RANGE = "1W";

const FALLBACK_SERIES = Array.from(
  { length: 40 },
  (_value, index) => 0.4 + 0.15 * Math.sin(index / 5) + index * 0.003
);

interface PricePoint {
  t: number;
  p: number;
}

export function MarketDetail({ card }: { card: Card }) {
  const [points, setPoints] = useState<PricePoint[]>([]);
  const [range, setRange] = useState<string>(DEFAULT_RANGE);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [filled, setFilled] = useState(true);

  const title = readCardTitle(card);
  const imageUrl = card.type === "teams" ? undefined : card.imageUrl;
  const clobTokenId = card.type === "teams" ? undefined : card.clobTokenId;
  const breakdown = readBreakdown(card);
  const topPercent = breakdown[0]?.percent ?? "--";

  useEffect(() => {
    if (!clobTokenId) {
      setPoints([]);
      return;
    }
    const config = RANGES.find((entry) => entry.label === range) ?? RANGES[7];
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/price-history?tokenId=${clobTokenId}&interval=${config.interval}&fidelity=${config.fidelity}`
        );
        if (!response.ok) return;
        const history = (await response.json()) as PricePoint[];
        if (!cancelled && Array.isArray(history)) setPoints(history);
      } catch {
        // Fall back to the synthetic series below.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clobTokenId, range]);

  const chart = useMemo(() => {
    const series = points.length >= 2 ? points.map((point) => point.p) : FALLBACK_SERIES;
    return buildChart(series);
  }, [points]);

  const current = chart.last;
  const change = chart.last - chart.first;

  return (
    <div className="min-h-full bg-[#080b0c] px-[20px] pb-[28px] pt-[12px] text-[#f4f6f8]">
      <div className="text-[14px] text-[#39a325]">Prediction market · Polymarket</div>

      <div className="mt-[16px] flex items-center gap-[14px]">
        {imageUrl ? (
          <span className="grid h-[40px] w-[40px] shrink-0 place-items-center overflow-hidden rounded-[8px] bg-[#0c1014]">
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          </span>
        ) : null}
        <h1 className="text-[26px] leading-[32px] text-white">{title}</h1>
      </div>

      <div className="mt-[28px] grid max-w-[640px] grid-cols-3 divide-x divide-[#1a1f2a]">
        <Metric label="Volume" value={card.volume} />
        <Metric label="Outcomes" value={String(breakdown.length)} />
        <Metric label="Top chance" value={topPercent} />
      </div>

      <div className="mt-[34px]">
        <div className="flex items-end justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-[8px] whitespace-nowrap text-[15px] text-[#aeb4be]">
              <span className="max-w-[360px] truncate text-[#f4f6f8]">{breakdown[0]?.label ?? "Yes"}</span>
              <span className="text-[#6c727c]">probability</span>
            </div>
            <div className="mt-[8px] flex items-end gap-[9px]">
              <span className="text-[30px] leading-none text-white">{fmtPct(current)}</span>
              <span className={`pb-[3px] text-[13px] ${change >= 0 ? "text-[#38a35a]" : "text-[#e0556b]"}`}>
                {change >= 0 ? "+" : ""}
                {(change * 100).toFixed(2)} pts
              </span>
            </div>
          </div>
          <div className="flex items-center gap-[10px] text-[13px] text-[#626975]">
            {RANGES.map((entry) => (
              <button
                key={entry.label}
                type="button"
                onClick={() => setRange(entry.label)}
                className={`h-[31px] rounded-full px-[9px] transition hover:text-white ${
                  range === entry.label ? "bg-[#303641] text-white" : ""
                }`}
              >
                {entry.label}
              </button>
            ))}
            <span className="h-[23px] w-px bg-[#171d26]" />
            <button
              type="button"
              aria-label="Toggle area fill"
              onClick={() => setFilled((value) => !value)}
              className={`grid h-[28px] w-[28px] place-items-center rounded-[7px] text-[18px] transition hover:text-white ${
                filled ? "bg-[#303641] text-white" : "text-[#626975]"
              }`}
            >
              ⌘
            </button>
            <button
              type="button"
              aria-label="Toggle crosshair"
              onClick={() => setShowCrosshair((value) => !value)}
              className={`grid h-[28px] w-[28px] place-items-center rounded-[7px] text-[20px] transition hover:text-white ${
                showCrosshair ? "bg-[#303641] text-white" : "text-[#626975]"
              }`}
            >
              ⌁
            </button>
          </div>
        </div>

        <div className="relative mt-[18px] h-[458px] overflow-hidden border-b border-l border-[#151b24] bg-[#080b0c]">
          <div className="absolute inset-0 bg-[linear-gradient(#111720_1px,transparent_1px),linear-gradient(90deg,#111720_1px,transparent_1px)] bg-[size:100%_70px,120px_100%] opacity-65" />
          <div className="absolute left-0 right-[130px] top-[92px] border-t border-dashed border-[#9aa1aa]/60" />
          {filled && (
            <div className="absolute bottom-0 left-0 right-0 h-[235px] bg-[linear-gradient(180deg,rgba(70,212,45,0.34),rgba(42,140,30,0.14),transparent)]" />
          )}
          <svg
            className="absolute inset-x-0 bottom-[58px] h-[274px] w-[calc(100%-120px)] overflow-visible"
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            fill="none"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path d={chart.line} stroke="#57d63f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {filled && <path d={chart.area} fill="url(#chartFill)" />}
            <defs>
              <linearGradient id="chartFill" x1="490" y1="16" x2="490" y2="274" gradientUnits="userSpaceOnUse">
                <stop stopColor="#59d83c" stopOpacity="0.42" />
                <stop offset="1" stopColor="#163915" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          {showCrosshair && (
            <>
              <div className="absolute left-[58%] top-[48px] h-[360px] border-l border-dashed border-[#a1a7af]/50" />
              <div className="absolute left-[calc(58%-10px)] top-[86px] text-[34px] leading-none text-[#d5d9df]">+</div>
            </>
          )}
          <div className="absolute right-[22px] top-[82px] rounded-[3px] bg-[#2f3440] px-[13px] py-[6px] text-[16px] text-[#e4e6ea]">
            {fmtPct(chart.max)}
          </div>
          <div className="absolute right-[22px] top-[214px] rounded-[3px] bg-[#59d63f] px-[13px] py-[6px] text-[16px] text-white">
            {fmtPct(current)}
          </div>
          <div className="absolute bottom-[18px] left-0 right-[120px] flex justify-between text-[13px] text-[#6d737e]">
            {axisTimes(points).map((time, index) => (
              <span key={`${time}-${index}`}>{time}</span>
            ))}
          </div>
          <div className="absolute right-[22px] top-[38px] space-y-[54px] text-[15px] text-[#8b9099]">
            {axisValues(chart.min, chart.max).map((value, index) => (
              <div key={`${value}-${index}`}>{value}</div>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-[42px] rounded-[12px] border border-[#18202a] bg-[#080b0c] px-[24px] pb-[30px] pt-[24px] shadow-[0_26px_44px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.025)]">
        <h2 className="text-[18px] text-[#dce0e7]">Rules</h2>
        <p className="mt-[18px] max-w-[960px] text-[13px] leading-[24px] text-[#646b74]">
          This market resolves on the official outcome reported by Polymarket. Prices reflect the live
          order book and represent the implied probability of each outcome. Read the full resolution
          criteria on{" "}
          <a
            className="text-[#58c538] hover:text-[#74e353]"
            href={card.type === "teams" || !card.slug ? "https://polymarket.com" : `https://polymarket.com/event/${card.slug}`}
            target="_blank"
            rel="noreferrer"
          >
            Polymarket
          </a>
          .
        </p>

        <div className="mt-[30px] max-w-[520px] rounded-[8px] bg-[linear-gradient(90deg,rgba(9,18,15,0.72),rgba(4,7,10,0))] px-[22px] py-[16px]">
          <h3 className="text-[15px] text-[#f2f4f5]">Price distribution</h3>
          <div className="mt-[18px] space-y-[12px]">
            {breakdown.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="grid grid-cols-[120px_minmax(0,310px)_44px] items-center gap-[12px] text-[13px] text-[#e6e8eb]"
              >
                <span className="truncate">{item.label}</span>
                <span className="h-[6px] overflow-hidden rounded-full bg-[#242a31]">
                  <span
                    className="block h-full rounded-full bg-[#2ecb47]"
                    style={{ width: `${parsePercent(item.percent)}%` }}
                  />
                </span>
                <span>{item.percent}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-[28px] first:pl-0">
      <div className="text-[14px] text-[#747b86]">{label}</div>
      <div className="mt-[10px] text-[18px] text-[#dfe3ea]">{value}</div>
    </div>
  );
}

function buildChart(series: number[]): {
  line: string;
  area: string;
  min: number;
  max: number;
  first: number;
  last: number;
} {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const step = series.length > 1 ? VIEW_W / (series.length - 1) : VIEW_W;
  const coords = series.map((value, index) => {
    const x = index * step;
    const norm = (value - min) / span;
    const y = Y_BOTTOM - norm * (Y_BOTTOM - Y_TOP);
    return [x, y] as const;
  });
  const line = coords
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${VIEW_W} ${VIEW_H} L 0 ${VIEW_H} Z`;
  return {
    line,
    area,
    min,
    max,
    first: series[0] ?? 0,
    last: series[series.length - 1] ?? 0
  };
}

function axisValues(min: number, max: number): string[] {
  return [0, 1, 2, 3, 4].map((index) => fmtPct(max - (index * (max - min)) / 4));
}

function axisTimes(points: PricePoint[]): string[] {
  if (points.length < 2) {
    return ["", "", "", "", "", "", "", "", ""];
  }
  return [0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
    const at = points[Math.floor((index / 8) * (points.length - 1))];
    if (!at) return "";
    const date = new Date(at.t * 1000);
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  });
}

function fmtPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function parsePercent(percent: string): number {
  const value = Number(percent.replace("%", ""));
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function readBreakdown(card: Card): QuestionOption[] {
  if (card.type === "teams") {
    return card.teams.map((team) => ({ label: team.name, percent: team.percent }));
  }
  if (card.type === "question") {
    return card.breakdown ?? card.options;
  }
  return card.breakdown ?? [{ label: "Yes", percent: card.chance }];
}

function readCardTitle(card: Card): string {
  if (card.type === "teams") return card.teams.map((team) => team.name).join(" vs ");
  return card.title;
}
