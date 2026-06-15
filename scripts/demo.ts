import { runtime } from "../src/lib/runtime";

const session = await runtime.startSession({
  objective: "Evaluate whether this market is mispriced and execute only if risk approves.",
  marketId: "eth-7000-2026",
  userId: "demo-user"
});

const events = await runtime.listEvents(session.id);
const audit = await runtime.getAudit(session.id);

if (!audit) {
  throw new Error(`Audit not found for session ${session.id}`);
}

console.log(JSON.stringify({
  sessionId: session.id,
  status: session.status,
  permission: {
    totalBudgetUsd: audit.permission.totalBudgetUsd,
    remainingBudgetUsd: audit.permission.remainingBudgetUsd,
    maxEvidencePurchaseUsd: audit.permission.maxEvidencePurchaseUsd,
    maxTradeUsd: audit.permission.maxTradeUsd,
    expiresAt: audit.permission.expiresAt
  },
  eventTimeline: events.map((event) => ({
    type: event.type,
    payload: event.payload
  })),
  audit: audit.summary
}, null, 2));
