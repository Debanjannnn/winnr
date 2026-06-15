"use client";

import { useState } from "react";

export interface Run {
  id: string;
  title: string;
  side: string;
  stakeUsd: number;
  status: "pending" | "active" | "rejected";
  txHash: string | null;
  createdAt: string;
  closed: boolean;
}

type TabKey = "active" | "pending" | "history";

const TABS: { key: TabKey; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
  { key: "history", label: "History" }
];

function inTab(run: Run, tab: TabKey): boolean {
  if (tab === "pending") return run.status === "pending";
  if (tab === "active") return run.status === "active" && !run.closed;
  return run.status === "rejected" || run.closed;
}

export function PositionsView({ runs }: { runs: Run[] }) {
  const [tab, setTab] = useState<TabKey>("active");
  const filtered = runs.filter((run) => inTab(run, tab));

  return (
    <div className="min-h-full bg-[#080b0c] px-[6px] pt-[6px] text-[#f4f6f8]">
      <h1 className="text-[22px] leading-none text-white">Positions</h1>

      <div className="mt-[20px] flex items-center gap-[8px]">
        {TABS.map((entry) => {
          const active = tab === entry.key;
          const count = runs.filter((run) => inTab(run, entry.key)).length;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              className={`h-[34px] rounded-[9px] px-[14px] text-[13px] font-semibold transition ${
                active
                  ? "bg-[#1b1f27] text-white"
                  : "border border-[#171b20] bg-[#0c1013] text-[#9a9da5] hover:text-white"
              }`}
            >
              {entry.label}
              <span className="ml-[7px] text-[#6c717b]">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-[18px] space-y-[8px]">
        {filtered.length === 0 ? (
          <div className="rounded-[10px] border border-[#171b20] bg-[#0a0d0f] py-[40px] text-center text-[14px] text-[#6c717b]">
            No {tab} positions yet.
          </div>
        ) : (
          <>
            {filtered.map((run) => <PositionRow key={run.id} run={run} />)}
          </>
        )}
      </div>
    </div>
  );
}

function PositionRow({ run }: { run: Run }) {
  const statusStyle =
    run.status === "active"
      ? "bg-[#0f2417] text-[#54d07f]"
      : run.status === "pending"
        ? "bg-[#241f0f] text-[#e0c24a]"
        : "bg-[#2a1416] text-[#e0556b]";
  const statusLabel = run.closed ? "Resolved" : run.status;

  return (
    <article className="flex items-center justify-between gap-4 rounded-[10px] border border-[#171b20] bg-[#0c1013] px-[16px] py-[13px]">
      <div className="min-w-0">
        <div className="truncate text-[14px] text-[#f1f1f4]">{run.title}</div>
        <div className="mt-[5px] flex items-center gap-[10px] text-[12px] text-[#8a8f99]">
          <span className="text-[#cdd2da]">{run.side}</span>
          <span>{run.stakeUsd} USDC</span>
          <span>{new Date(run.createdAt).toLocaleTimeString()}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-[12px]">
        {run.txHash ? (
          <a
            href={`https://etherscan.io/tx/${run.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] text-[#58a7ff] hover:underline"
          >
            tx
          </a>
        ) : null}
        <a
          href={`/api/sessions/${run.id}/audit`}
          target="_blank"
          rel="noreferrer"
          className="text-[12px] text-[#9a9da5] hover:text-white"
        >
          audit
        </a>
        <span
          className={`rounded-[5px] px-[8px] py-[3px] text-[11px] font-semibold uppercase ${statusStyle}`}
        >
          {statusLabel}
        </span>
      </div>
    </article>
  );
}
