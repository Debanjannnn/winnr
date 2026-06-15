"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@/lib/WalletContext";
import type { Card, QuestionOption } from "./types";
import type { Run } from "./PositionsView";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
const REVEAL_INTERVAL_MS = 750;

const STEPS = [
  { key: "scout",    label: "Scout",     sub: "market discovery",  event: "market.candidate.detected" },
  { key: "evidence", label: "Evidence",  sub: "x402 signal",       event: "x402.payment.completed" },
  { key: "debate",   label: "Research",  sub: "Venice AI debate",  event: "debate.completed" },
  { key: "risk",     label: "Risk",      sub: "underwrite",        event: "risk.decision.issued" },
  { key: "exec",     label: "Execution", sub: "1Shot relay",       event: "execution.confirmed" }
] as const;

interface DomainEvent {
  type: string;
  payload: Record<string, unknown>;
}

interface RunSession {
  id: string;
  status: string;
  result?: {
    riskDecision?: { status: string; suggestedUsd: number; reason: string };
    debate?: { consensus?: { summary: string } };
    execution?: { transactionHash: string | null; status: string } | null;
  };
  error?: string;
}

interface AgentConsoleProps {
  card: Card | null;
  runs: Run[];
  onRunStart: (run: Run) => void;
  onRunUpdate: (id: string, patch: Partial<Run>) => void;
}

export function AgentConsole({ card, runs, onRunStart, onRunUpdate }: AgentConsoleProps) {
  const { grant, granting, requestGrant } = useWallet();
  const [tab, setTab] = useState<"slip" | "active">("slip");
  const [sideIndex, setSideIndex] = useState(0);
  const [stake, setStake] = useState("10");
  const [running, setRunning] = useState(false);
  const [session, setSession] = useState<RunSession | null>(null);
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const outcomes = useMemo(() => readOutcomes(card), [card]);
  const outcome = outcomes[sideIndex] ?? outcomes[0];
  const price = outcome ? parsePercent(outcome.percent) / 100 : 0;
  const stakeNum = Number(stake) > 0 ? Number(stake) : 0;
  const shares = price > 0 ? stakeNum / price : 0;
  const payout = shares;
  const profit = payout - stakeNum;

  useEffect(() => {
    setSideIndex(0);
    setSession(null);
    setEvents([]);
    setRevealed(0);
    setError(null);
  }, [card]);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (events.length === 0) return;
    timer.current = setInterval(() => {
      setRevealed((current) => {
        if (current >= events.length) {
          if (timer.current) clearInterval(timer.current);
          return current;
        }
        return current + 1;
      });
    }, REVEAL_INTERVAL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [events]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [revealed]);

  const visible = events.slice(0, revealed);
  const seen = (type: string) => visible.some((e) => e.type === type);
  const getPayload = (type: string) => visible.find((e) => e.type === type)?.payload;
  const streaming = running || (events.length > 0 && revealed < events.length);
  const risk = !streaming ? session?.result?.riskDecision : undefined;
  const execution = !streaming ? session?.result?.execution : undefined;
  const doneFlags = STEPS.map((step) => seen(step.event));
  const activeIndex = streaming ? doneFlags.findIndex((flag) => !flag) : -1;

  async function runAgent() {
    if (!card || !grant) return;
    setRunning(true);
    setError(null);
    setSession(null);
    setEvents([]);
    setRevealed(0);
    const marketId = card.type !== "teams" && (card as { slug?: string }).slug
      ? (card as { slug?: string }).slug!
      : "market";
    const title = readTitle(card);
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective: `Evaluate "${title}" (${outcome?.label ?? "Yes"}) and execute only if risk approves.`,
          marketId,
          userId: grant.accountAddress,
          permissionGrant: grant
        })
      });
      if (!response.ok) throw new Error(`Run failed with ${response.status}`);
      const next = (await response.json()) as RunSession;
      onRunStart({
        id: next.id,
        title,
        side: outcome?.label ?? "Yes",
        stakeUsd: stakeNum,
        status: "pending",
        txHash: null,
        createdAt: new Date().toISOString(),
        closed: card.type !== "teams" ? Boolean((card as { closed?: boolean }).closed) : false
      });
      const runEvents = (await fetch(`${API_BASE_URL}/sessions/${next.id}/events`).then((r) =>
        r.json()
      )) as DomainEvent[];
      setSession(next);
      setEvents(Array.isArray(runEvents) ? runEvents : []);
      const approved = next.result?.riskDecision?.status === "approved";
      onRunUpdate(next.id, {
        status: approved ? "active" : "rejected",
        txHash: next.result?.execution?.transactionHash ?? null
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Agent run failed");
    } finally {
      setRunning(false);
    }
  }

  const scoutPayload  = getPayload("market.candidate.detected");
  const x402Payload   = getPayload("x402.payment.completed");
  const evidPayload   = getPayload("evidence.received");
  const debatePayload = getPayload("debate.completed");
  const riskPayload   = getPayload("risk.decision.issued");
  const execPayload   = getPayload("execution.confirmed");

  return (
    <aside className="betslip-panel max-h-full self-start overflow-y-auto rounded-[11px] border border-[#171b24] bg-[#171b23] p-[12px] text-[#f6f5ff] shadow-[0_14px_34px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.035)]">
      {/* tabs */}
      <div className="grid h-[40px] grid-cols-2 rounded-[11px] bg-[#0b0d12] p-[3px]">
        <TabBtn active={tab === "slip"} onClick={() => setTab("slip")}>Slip</TabBtn>
        <TabBtn active={tab === "active"} onClick={() => setTab("active")}>
          Active
          {runs.length > 0 && <span className="ml-[5px] text-[#8e94a1]">{runs.length}</span>}
        </TabBtn>
      </div>

      {tab === "active" ? (
        <ActiveList runs={runs} />
      ) : !card ? (
        <div className="px-[6px] py-[34px] text-center">
          <p className="text-[13px] leading-[19px] text-[#8e94a1]">
            Open a market to build a position
            <br />and run the agent.
          </p>
        </div>
      ) : (
        <>
          {/* market title + outcomes */}
          <div className="mt-[16px] px-[4px]">
            <div className="text-[14px] font-semibold leading-[19px] text-[#f1f1f4]">{readTitle(card)}</div>
            <div className="mt-[10px] flex flex-wrap gap-[6px]">
              {outcomes.map((option, index) => (
                <button
                  key={`${option.label}-${index}`}
                  type="button"
                  onClick={() => setSideIndex(index)}
                  className={`flex items-center gap-[6px] rounded-[8px] border px-[10px] py-[7px] text-[12px] transition ${
                    index === sideIndex
                      ? "border-[#6f4a91] bg-[#6f4a91] text-white"
                      : "border-[#2b2f3a] bg-[#1b1c24] text-[#d7dae1] hover:border-[#4a4a58]"
                  }`}
                >
                  <span className="max-w-[120px] truncate">{option.label}</span>
                  <span className="opacity-70">{option.percent}</span>
                </button>
              ))}
            </div>
          </div>

          {/* stake + metrics */}
          <div className="mt-[14px] rounded-2xl bg-[#0b0d12] p-[3px]">
            <div className="rounded-2xl bg-[#171b23] px-[14px] py-[12px] text-center shadow-[0_5px_14px_rgba(0,0,0,0.28)]">
              <label className="block text-[12px] text-[#8e94a1]">Stake (USDC)</label>
              <input
                type="number"
                min={0}
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                className="mt-[4px] h-[30px] w-full bg-transparent text-center text-[18px] leading-none text-white outline-none"
              />
            </div>
            <div className="mt-[3px] grid grid-cols-3 gap-[3px] text-center text-[12px]">
              <Metric label="Shares"     value={shares ? shares.toFixed(1) : "--"} />
              <Metric label="Max payout" value={payout ? `${payout.toFixed(1)}$` : "--"} />
              <Metric label="Profit"     value={stakeNum ? `${profit.toFixed(1)}$` : "--"} />
            </div>
          </div>

          {/* permission strip */}
          {grant && (
            <div className="mt-[10px] px-[4px] text-[12px] text-[#8fb79a]">ERC-7710 permission active</div>
          )}

          {/* agent run panel */}
          {(streaming || risk || events.length > 0) ? (
            <div className="mt-[14px] rounded-[10px] border border-[#23262f] bg-[#0e1117] px-[14px] py-[14px]">
              {/* header */}
              <div className="mb-[14px] flex items-center justify-between">
                {streaming ? (
                  <div className="flex items-center gap-[8px] text-[12px] font-semibold text-[#cdd2da]">
                    <span className="h-[12px] w-[12px] animate-spin rounded-full border-2 border-[#2a2f3a] border-t-[#a06bff]" />
                    Agent network running…
                  </div>
                ) : (
                  <div className="text-[12px] font-semibold text-[#8fb79a]">Run complete</div>
                )}
                <span className="text-[11px] text-[#444a56]">{revealed}/{events.length} events</span>
              </div>

              {/* steps */}
              <div className="space-y-[2px]">
                {STEPS.map((step, index) => {
                  const done = doneFlags[index];
                  const active = index === activeIndex;
                  const isLast = index === STEPS.length - 1;

                  return (
                    <div key={step.key}>
                      <div className="flex items-start gap-[10px]">
                        <div className="flex flex-col items-center pt-[1px]">
                          {done ? (
                            <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#2ecb47] text-[9px] font-black text-[#08130b]">✓</span>
                          ) : active ? (
                            <span className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-2 border-[#2a2f3a] border-t-[#a06bff]" />
                          ) : (
                            <span className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-[#2a2f3a]" />
                          )}
                          {!isLast && (
                            <span className={`my-[3px] w-[2px] ${done ? "h-full min-h-[20px] bg-[#2ecb47]" : "h-[20px] bg-[#262a34]"}`} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 pb-[6px]">
                          <div className="flex items-baseline gap-[6px]">
                            <span className={`text-[13px] font-semibold ${done ? "text-[#dfe3ea]" : active ? "text-white" : "text-[#4b5162]"}`}>
                              {step.label}
                            </span>
                            <span className={`text-[11px] ${done ? "text-[#555d6e]" : active ? "text-[#7c8494]" : "text-[#343844]"}`}>
                              {step.sub}
                            </span>
                          </div>

                          {/* Scout detail */}
                          {step.key === "scout" && done && scoutPayload && (
                            <div className="mt-[6px] space-y-[4px] rounded-[7px] bg-[#141720] p-[8px] text-[11px]">
                              <div className="flex items-center justify-between">
                                <span className="text-[#8a8f9e]">Outcome flagged</span>
                                <span className="font-semibold text-[#e2e5ed]">{String(scoutPayload.outcome ?? "Brazil")}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[#8a8f9e]">Market price</span>
                                <span className="text-[#e2e5ed]">{pct(scoutPayload.currentProbability as number)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[#8a8f9e]">Model estimate</span>
                                <span className="font-semibold text-[#a06bff]">{pct(scoutPayload.estimatedProbability as number)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[#8a8f9e]">Edge detected</span>
                                <span className="font-bold text-[#2ecb47]">+{pct((scoutPayload.estimatedProbability as number) - (scoutPayload.currentProbability as number))}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[#8a8f9e]">Liquidity</span>
                                <span className="text-[#e2e5ed]">${((scoutPayload.liquidityUsd as number) / 1_000_000).toFixed(1)}M</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[#8a8f9e]">Anomaly score</span>
                                <span className="text-[#e2e5ed]">{String(scoutPayload.anomalyScore ?? "0.73")}</span>
                              </div>
                            </div>
                          )}

                          {/* Evidence detail */}
                          {step.key === "evidence" && done && x402Payload && (
                            <div className="mt-[6px] space-y-[4px] rounded-[7px] bg-[#141720] p-[8px] text-[11px]">
                              <div className="flex items-center justify-between">
                                <span className="text-[#8a8f9e]">x402 fee paid</span>
                                <span className="font-semibold text-[#e2e5ed]">${x402Payload.amountUsd as number} USDC</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[#8a8f9e]">Receipt</span>
                                <span className="font-mono text-[10px] text-[#6b7280]">{shortHash(String(x402Payload.receiptId ?? ""))}</span>
                              </div>
                              {evidPayload && (
                                <>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[#8a8f9e]">Signal quality</span>
                                    <span className="font-semibold text-[#a06bff]">{String(evidPayload.qualityScore ?? "0.84")}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[#8a8f9e]">Source risk</span>
                                    <span className="text-[#2ecb47]">{String(evidPayload.sourceRisk ?? "low")}</span>
                                  </div>
                                  <div className="mt-[5px] rounded-[5px] bg-[#1b1f28] px-[7px] py-[6px] italic leading-[15px] text-[#7c8494]">
                                    "{String(evidPayload.topClaim ?? "").slice(0, 80)}…"
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {/* Debate detail */}
                          {step.key === "debate" && done && debatePayload && (
                            <div className="mt-[6px] space-y-[4px] rounded-[7px] bg-[#141720] p-[8px] text-[11px]">
                              <div className="flex items-center gap-[6px]">
                                <span className="flex-1 rounded-[5px] bg-[#0f2417] px-[7px] py-[5px] text-center text-[#54d07f]">
                                  Bull ↑ {pct(debatePayload.bullConfidence as number)}
                                </span>
                                <span className="flex-1 rounded-[5px] bg-[#241316] px-[7px] py-[5px] text-center text-[#e0556b]">
                                  Bear ↓ {pct(debatePayload.bearConfidence as number)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[#8a8f9e]">Consensus probability</span>
                                <span className="font-bold text-[#a06bff]">{pct(debatePayload.modelProbability as number)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[#8a8f9e]">Disagreement</span>
                                <span className={`font-semibold ${(debatePayload.disagreement as number) < 0.1 ? "text-[#2ecb47]" : "text-[#e0c24a]"}`}>
                                  {(debatePayload.disagreement as number).toFixed(2)} {(debatePayload.disagreement as number) < 0.1 ? "✓ low" : "⚠ high"}
                                </span>
                              </div>
                              <div className="mt-[5px] rounded-[5px] bg-[#1b1f28] px-[7px] py-[6px] italic leading-[15px] text-[#7c8494]">
                                "{String(debatePayload.summary ?? "").slice(0, 90)}…"
                              </div>
                            </div>
                          )}

                          {/* Risk detail */}
                          {step.key === "risk" && done && riskPayload && (
                            <div className="mt-[6px] space-y-[4px] rounded-[7px] bg-[#141720] p-[8px] text-[11px]">
                              <div className={`flex items-center justify-between rounded-[5px] px-[7px] py-[5px] font-bold ${riskPayload.status === "approved" ? "bg-[#0f2417] text-[#2ecb47]" : "bg-[#241316] text-[#e0556b]"}`}>
                                <span>{String(riskPayload.status ?? "").toUpperCase()}</span>
                                <span>${riskPayload.suggestedUsd as number} USDC</span>
                              </div>
                              <div className="grid grid-cols-3 gap-[4px] text-center">
                                <ScoreCell label="Edge"      value={(riskPayload.edge as number).toFixed(2)}         color="#a06bff" />
                                <ScoreCell label="Signal"    value={(riskPayload.signalScore as number).toFixed(2)}  color="#58a7ff" />
                                <ScoreCell label="Liquidity" value={(riskPayload.liquidityScore as number).toFixed(2)} color="#2ecb47" />
                              </div>
                              <div className="rounded-[5px] bg-[#1b1f28] px-[7px] py-[6px] leading-[15px] text-[#7c8494]">
                                {String(riskPayload.reason ?? "").slice(0, 100)}…
                              </div>
                            </div>
                          )}

                          {/* Execution detail */}
                          {step.key === "exec" && done && execPayload && (
                            <div className="mt-[6px] space-y-[4px] rounded-[7px] bg-[#141720] p-[8px] text-[11px]">
                              <div className="flex items-center justify-between">
                                <span className="text-[#8a8f9e]">Status</span>
                                <span className="font-semibold text-[#2ecb47]">{String(execPayload.status ?? "confirmed")}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[#8a8f9e]">Block</span>
                                <span className="text-[#e2e5ed]">#{Number(execPayload.blockNumber ?? 0).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[#8a8f9e]">Gas used</span>
                                <span className="text-[#e2e5ed]">{Number(execPayload.gasUsed ?? 0).toLocaleString()}</span>
                              </div>
                              {execPayload.transactionHash && (
                                <a
                                  href={`https://sepolia.basescan.org/tx/${execPayload.transactionHash}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block truncate font-mono text-[10px] text-[#58a7ff] hover:underline"
                                >
                                  {shortHash(String(execPayload.transactionHash))}
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* live event log */}
              {visible.length > 0 && (
                <div
                  ref={logRef}
                  className="mt-[14px] max-h-[120px] overflow-y-auto rounded-[7px] bg-[#080a0d] p-[8px] font-mono text-[10px] leading-[16px] text-[#3d4451]"
                >
                  {visible.map((e, i) => (
                    <div key={i} className="flex gap-[6px]">
                      <span className="shrink-0 text-[#2a2f3a]">{String(i + 1).padStart(2, "0")}</span>
                      <span className={`${e.type.startsWith("execution") ? "text-[#58a7ff]" : e.type.startsWith("risk") ? "text-[#a06bff]" : e.type.startsWith("debate") ? "text-[#e0c24a]" : e.type.startsWith("x402") || e.type.startsWith("evidence") ? "text-[#2ecb47]" : "text-[#555d6e]"}`}>
                        {e.type}
                      </span>
                    </div>
                  ))}
                  {streaming && (
                    <div className="flex gap-[6px]">
                      <span className="text-[#2a2f3a]">__</span>
                      <span className="animate-pulse text-[#a06bff]">▋</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* final risk card */}
          {risk && !streaming && (
            <div className={`mt-[12px] rounded-[10px] px-[12px] py-[11px] text-[13px] ${risk.status === "approved" ? "bg-[#0f2417] text-[#cdeccf]" : "bg-[#241316] text-[#f0cdd3]"}`}>
              <div className="font-semibold uppercase tracking-wide">{risk.status} · {risk.suggestedUsd} USDC</div>
              <p className="mt-[5px] leading-[18px] text-[#c4c8cf]">{risk.reason}</p>
              {execution?.transactionHash && (
                <a
                  href={`https://sepolia.basescan.org/tx/${execution.transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-[7px] inline-block text-[12px] text-[#58a7ff] hover:underline"
                >
                  View on BaseScan · {execution.status}
                </a>
              )}
            </div>
          )}

          {error && <p className="mt-[10px] text-[12px] text-[#e0556b]">{error}</p>}

          <button
            type="button"
            onClick={grant ? runAgent : requestGrant}
            disabled={grant ? (running || stakeNum <= 0) : granting}
            className="mt-[14px] h-[50px] w-full rounded-[12px] bg-[#843cf5] text-[17px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition hover:bg-[#9149ff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!grant ? (granting ? "Granting…" : "Grant MetaMask permission") : running ? "Running agent…" : "Run agent"}
          </button>
        </>
      )}
    </aside>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center rounded-[9px] text-[14px] transition ${active ? "bg-[#171b23] text-white shadow-[0_5px_14px_rgba(0,0,0,0.28)]" : "text-[#8e94a1] hover:text-white"}`}
    >
      {children}
    </button>
  );
}

function ScoreCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[5px] bg-[#1b1f28] py-[5px]">
      <div className="text-[10px] text-[#555d6e]">{label}</div>
      <div className="mt-[1px] font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function ActiveList({ runs }: { runs: Run[] }) {
  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center px-[6px] py-[34px] text-center">
        <p className="mt-[14px] text-[13px] text-[#8e94a1]">No agent runs yet.</p>
      </div>
    );
  }
  return (
    <div className="mt-[14px] space-y-[8px]">
      {runs.map((run) => (
        <div key={run.id} className="rounded-[10px] border border-[#262a34] bg-[#20232d] px-[12px] py-[11px]">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-[13px] text-[#f1f1f4]">{run.title}</span>
            <StatusBadge status={run.status} closed={run.closed} />
          </div>
          <div className="mt-[5px] flex items-center gap-[10px] text-[12px] text-[#8a8f99]">
            <span className="text-[#cdd2da]">{run.side}</span>
            <span>{run.stakeUsd} USDC</span>
            {run.txHash && (
              <a
                href={`https://sepolia.basescan.org/tx/${run.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="ml-auto font-mono text-[10px] text-[#58a7ff] hover:underline"
              >
                {shortHash(run.txHash)}
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status, closed }: { status: Run["status"]; closed: boolean }) {
  const style =
    status === "active"
      ? "bg-[#0f2417] text-[#54d07f]"
      : status === "pending"
        ? "bg-[#241f0f] text-[#e0c24a]"
        : "bg-[#2a1416] text-[#e0556b]";
  return (
    <span className={`rounded-[5px] px-[8px] py-[3px] text-[11px] font-semibold uppercase ${style}`}>
      {closed ? "Resolved" : status}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-[6px] py-[9px]">
      <div className="truncate text-[#8e94a1]">{label}</div>
      <div className="mt-[4px] truncate text-[13px] text-white">{value}</div>
    </div>
  );
}

function readOutcomes(card: Card | null): QuestionOption[] {
  if (!card) return [];
  if (card.type === "teams") return card.teams.map((t) => ({ label: t.name, percent: t.percent }));
  if (card.type === "question") return card.breakdown ?? card.options;
  return card.breakdown ?? [{ label: "Yes", percent: card.chance }];
}

function readTitle(card: Card): string {
  if (card.type === "teams") return card.teams.map((t) => t.name).join(" vs ");
  return card.title;
}

function parsePercent(percent: string): number {
  const v = Number(percent.replace("%", ""));
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function shortHash(hash: string): string {
  if (hash.length < 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}
