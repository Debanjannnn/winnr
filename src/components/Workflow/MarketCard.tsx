import type { ReactNode } from "react";
import { BookmarkMiniIcon, GiftIcon, RefreshIcon } from "./icons";
import type { Card, Team } from "./types";

export function MarketCard({ card, onOpen }: { card: Card; onOpen?: () => void }) {
  if (card.type === "teams") {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onOpen?.();
        }}
        className="market-card flex min-h-[194px] cursor-pointer flex-col justify-between"
      >
        <div className="space-y-[7px]">
          {card.teams.map((team) => (
            <div key={team.name} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="flex min-w-0 items-center gap-[9px]">
                <TeamBadge team={team} />
                <span className="truncate text-[14px] leading-[18px] text-[#f2f2f5]">{team.name}</span>
              </div>
              <span className="text-[15px] leading-[18px] text-[#f1f1f4]">{team.percent}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-[10px]">
          {card.buttons.map((button) => (
            <TradeButton key={button}>{button}</TradeButton>
          ))}
        </div>

        <Footer volume={card.volume} live={card.live} league={card.league} />
      </article>
    );
  }

  if (card.type === "binary") {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onOpen?.();
        }}
        className="market-card flex min-h-[194px] cursor-pointer flex-col justify-between"
      >
        <div className="grid grid-cols-[1fr_74px] gap-4">
          <div className="flex min-w-0 items-start gap-[13px]">
            <Thumb kind={card.image} url={card.imageUrl} />
            <h2 className="mt-[3px] max-w-[245px] text-[14px] leading-[18px] text-[#f3f3f6]">
              {card.title}
            </h2>
          </div>
          <Chance percent={card.chance} />
        </div>

        <div className="grid grid-cols-2 gap-[10px]">
          <TradeButton active>Yes</TradeButton>
          <TradeButton>No</TradeButton>
        </div>

        <Footer volume={card.volume} closed={card.closed} />
      </article>
    );
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen?.();
      }}
      className="market-card flex min-h-[184px] cursor-pointer flex-col justify-between"
    >
      <div className="flex min-w-0 items-start gap-[13px]">
        <Thumb kind={card.image} url={card.imageUrl} />
        <h2 className="max-w-[286px] text-[14px] leading-[18px] text-[#f3f3f6]">
          {card.title}
        </h2>
      </div>

      <div className="space-y-[5px]">
        {card.options.map((option) => (
          <div
            key={option.label}
            className="grid grid-cols-[minmax(0,1fr)_42px_auto_auto] items-center gap-[7px] rounded-[8px] bg-[#0f1316] px-[8px] py-[7px]"
          >
            <span className="min-w-0 truncate text-[12px] leading-none text-[#d9dde5]">
              {shortOptionLabel(card.title, option.label)}
            </span>
            <span className="text-right text-[13px] leading-none text-[#f1f1f4]">
              {option.percent}
            </span>
            <SmallPill active>Yes</SmallPill>
            <SmallPill>No</SmallPill>
          </div>
        ))}
      </div>

      <Footer volume={card.volume} />
    </article>
  );
}

function Footer({
  volume,
  live,
  league,
  closed
}: {
  volume: string;
  live?: boolean | undefined;
  league?: string | undefined;
  closed?: boolean | undefined;
}) {
  return (
    <div className="flex items-end justify-between gap-3 text-[#6c717b]">
      <div className="min-w-0">
        <div className="flex items-center gap-[6px] text-[13px] leading-none">
          {live && (
            <>
              <span className="h-[6px] w-[6px] rounded-full bg-[#f24a6a]" />
              <span className="text-[#f24a6a]">LIVE</span>
            </>
          )}
          {closed !== undefined && (
            <span
              className={`rounded-[4px] px-[6px] py-[2px] text-[10px] font-semibold uppercase leading-none ${
                closed ? "bg-[#2a1416] text-[#e0556b]" : "bg-[#0f2417] text-[#54d07f]"
              }`}
            >
              {closed ? "Closed" : "Open"}
            </span>
          )}
          <span className="truncate">{volume}</span>
          {/* {!live && <RefreshIcon />} */}
          {live && league && <span className="text-[#7a7f88]">. {league}</span>}
        </div>
        <div className="mt-[6px] truncate text-[10px] text-[#444a52]">Trade on: Polymarket</div>
      </div>
      <div className="flex shrink-0 items-center gap-[13px] text-[#626872]">
        {!live && <GiftIcon />}
        <BookmarkMiniIcon />
      </div>
    </div>
  );
}

function TeamBadge({ team }: { team: Team }) {
  return (
    <span className="asset-mark h-[22px] w-[28px]" aria-hidden>
      <img src={`/workflow-assets/${team.asset}.png`} alt="" />
    </span>
  );
}

function TradeButton({ children, active }: { children: ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={(event) => event.stopPropagation()}
      className={`h-[36px] rounded-[6px] border text-[14px] leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition ${
        active
          ? "border-[#6c4c87] bg-[#6f4a91] text-white hover:border-[#7d5a9b] hover:bg-[#76509a]"
          : "border-[#343541] bg-[#1b1c24] text-[#f0f0f3] hover:border-[#4a4a58] hover:bg-[#21222a]"
      }`}
    >
      {children}
    </button>
  );
}

function SmallPill({ children, active }: { children: ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={(event) => event.stopPropagation()}
      className={`h-[22px] min-w-[36px] justify-self-end rounded-[6px] border px-[7px] text-[12px] leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition ${
        active
          ? "border-[#76549a] bg-[#744d93] text-[#f8f3ff] hover:bg-[#7b559b]"
          : "border-[#3b3d49] bg-[#191a21] text-[#d7dae1] hover:border-[#565967]"
      }`}
    >
      {children}
    </button>
  );
}

function Thumb({ kind, url }: { kind: string; url?: string | undefined }) {
  const src = url && url.length > 0 ? url : `/workflow-assets/${kind}.png`;
  return (
    <span aria-hidden className="thumb">
      <img src={src} alt="" />
    </span>
  );
}

function Chance({ percent }: { percent: string }) {
  return (
    <div className="relative ml-auto grid h-[56px] w-[56px] place-items-center rounded-full border border-[#2a2f37] bg-[#111316] text-center shadow-[inset_7px_0_0_rgba(167,76,255,0.72),0_0_20px_rgba(140,70,255,0.2)]">
      <div>
        <div className="text-[15px] leading-[16px] text-[#f7f5ff]">{percent}</div>
        <div className="mt-[1px] text-[11px] leading-[13px] text-[#9b9fa7]">Chance</div>
      </div>
    </div>
  );
}

function shortOptionLabel(title: string, label: string): string {
  const compact = label.replace(title, "").replace(/^[:\s-]+/, "").trim();
  if (compact) return compact;
  const marker = label.match(/\b(Set\s+\d+|Total\s+Sets|Match\s+Winner|Winner|Set\s+Handicap)\b/i);
  return marker ? label.slice(marker.index).trim() : label;
}
