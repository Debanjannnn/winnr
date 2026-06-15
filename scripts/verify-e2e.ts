import "dotenv/config";
import { createDelegation, signDelegation } from "@metamask/smart-accounts-kit";
import { decodeDelegations, encodeDelegations } from "@metamask/smart-accounts-kit/utils";
import { createx402DelegationProvider } from "@metamask/smart-accounts-kit/experimental";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { parseUnits, type Hex } from "viem";
import { getMasterAgentAccount, getRoleAccount } from "../src/lib/chain/agent-keys";
import {
  extractGrantContext,
  getEnvironment,
  redelegateToRole
} from "../src/lib/chain/redelegation";
import { getCapabilities, resolveFeeToken } from "../src/lib/chain/oneshot-relayer";
import { buildEvidence, buildPaymentRequirements, getSellerAddress, verifyPayment } from "../src/lib/x402/seller";
import { loadEvents, loadSession, persistRun } from "../src/lib/orchestration/persistence";
import {
  AgentRole,
  EventType,
  createId,
  nowIso,
  type DomainEvent,
  type MetaMaskPermissionGrant,
  type Session
} from "../src/lib/domain/types";
import { createDefaultPermissionScope } from "../src/lib/domain/permissions";

const results: { step: string; ok: boolean; detail: string }[] = [];
async function step(name: string, fn: () => Promise<string> | string) {
  try {
    const detail = await fn();
    results.push({ step: name, ok: true, detail });
    console.log(`✅ ${name} — ${detail}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ step: name, ok: false, detail });
    console.log(`❌ ${name} — ${detail}`);
  }
}

const CHAIN_ID = Number(process.env.CHAIN_ID ?? "84532");
const USDC = process.env.USDC_ADDRESS as Hex;

// Shared between steps once produced.
let parentContext: Hex;
let evidenceContext: Hex;

await step("derive distinct per-role agent keys", () => {
  const master = getMasterAgentAccount().address;
  const evidence = getRoleAccount(AgentRole.EVIDENCE).address;
  const execution = getRoleAccount(AgentRole.EXECUTION).address;
  const all = new Set([master, evidence, execution]);
  if (all.size !== 3) throw new Error("role addresses are not distinct");
  return `master=${master.slice(0, 10)} evidence=${evidence.slice(0, 10)} execution=${execution.slice(0, 10)}`;
});

await step("resolve Smart Accounts environment", () => {
  const env = getEnvironment();
  if (!env.DelegationManager) throw new Error("no DelegationManager in environment");
  return `DelegationManager=${env.DelegationManager}`;
});

await step("build + sign a real parent ERC-7710 delegation (user → master)", async () => {
  const env = getEnvironment();
  const userKey = generatePrivateKey();
  const user = privateKeyToAccount(userKey);
  const master = getMasterAgentAccount().address as Hex;
  const delegation = createDelegation({
    environment: env,
    from: user.address,
    to: master,
    scope: {
      type: "erc20PeriodTransfer",
      tokenAddress: USDC,
      periodAmount: parseUnits("10", 6),
      periodDuration: 1800,
      startDate: 1_700_000_000
    }
  });
  const signature = await signDelegation({
    privateKey: userKey,
    delegation,
    delegationManager: env.DelegationManager as Hex,
    chainId: CHAIN_ID
  });
  const signed = { ...delegation, signature };
  // Encode to Hex exactly as the browser ERC-7715 grant returns `context`.
  parentContext = encodeDelegations([signed]);
  const decoded = decodeDelegations(parentContext);
  if (decoded[0]?.delegate?.toLowerCase() !== master.toLowerCase()) {
    throw new Error("parent leaf delegate is not the master agent");
  }
  return `parent chain length=${decoded.length}, delegate=master`;
});

await step("extract grant context from a synthetic browser grant", () => {
  const env = getEnvironment();
  const grant: MetaMaskPermissionGrant = {
    mode: "metamask",
    accountAddress: getMasterAgentAccount().address,
    sessionAddress: getMasterAgentAccount().address,
    chainId: CHAIN_ID,
    grantedPermissions: [
      { context: parentContext, delegationManager: env.DelegationManager, dependencies: [] }
    ],
    requestedAt: nowIso()
  };
  const extracted = extractGrantContext(grant);
  if (!extracted.permissionContext) throw new Error("no permission context extracted");
  return `context bytes=${JSON.stringify(extracted.permissionContext).length}`;
});

await step("real A2A redelegation master → evidence", async () => {
  const redel = await redelegateToRole({
    parentContext,
    fromAgent: AgentRole.COORDINATOR,
    toAgent: AgentRole.EVIDENCE
  });
  evidenceContext = redel.permissionContext;
  const decoded = decodeDelegations(evidenceContext);
  const evidenceAddr = getRoleAccount(AgentRole.EVIDENCE).address.toLowerCase();
  const hasEvidenceDelegate = decoded.some((d) => d.delegate?.toLowerCase() === evidenceAddr);
  if (!hasEvidenceDelegate) throw new Error("redelegated leaf delegate is not the evidence agent");
  if (redel.recipientAddress.toLowerCase() !== evidenceAddr) {
    throw new Error("recipient address mismatch");
  }
  return `child chain length=${decoded.length}, delegate=evidence`;
});

await step("x402 seller — payment requirements + deterministic evidence + payload verify", () => {
  const reqs = buildPaymentRequirements();
  if (reqs.scheme !== "exact" || !reqs.payTo) throw new Error("bad payment requirements");
  const e1 = buildEvidence("eth-7000-2026");
  const e2 = buildEvidence("eth-7000-2026");
  if (e1.id !== e2.id || e1.qualityScore !== e2.qualityScore) {
    throw new Error("evidence is not deterministic");
  }
  const payload = {
    delegationManager: getEnvironment().DelegationManager,
    permissionContext: "0xabc123",
    delegator: getMasterAgentAccount().address
  };
  const header = Buffer.from(JSON.stringify(payload)).toString("base64");
  if (!verifyPayment(header)) throw new Error("valid payment payload rejected");
  if (verifyPayment("not-base64-json")) throw new Error("invalid payment payload accepted");
  return `price=${reqs.amount} micro-USDC, payTo=${getSellerAddress().slice(0, 10)}`;
});

await step("x402 payment minting via kit delegation provider", async () => {
  const provider = createx402DelegationProvider({
    account: getRoleAccount(AgentRole.EVIDENCE),
    environment: getEnvironment(),
    parentPermissionContext: evidenceContext,
    redeemers: { requireRedeemers: true, addresses: [getSellerAddress()] }
  });
  const payload = await provider(buildPaymentRequirements());
  if (!payload.permissionContext || !payload.delegationManager || !payload.delegator) {
    throw new Error("x402 provider returned an incomplete payload");
  }
  return `delegator=${payload.delegator.slice(0, 10)}, dm=${payload.delegationManager.slice(0, 10)}`;
});

await step("1Shot relayer live — getCapabilities + USDC fee token", async () => {
  const caps = await getCapabilities([String(CHAIN_ID)]);
  const target = caps[String(CHAIN_ID)]?.targetAddress;
  if (!target) throw new Error("relayer exposed no target address for this chain");
  const feeToken = await resolveFeeToken(String(CHAIN_ID));
  return `target=${target.slice(0, 10)}, feeToken=${feeToken.slice(0, 10)}`;
});

await step("Neon persistence round-trip", async () => {
  const scope = createDefaultPermissionScope({ userId: "verify-user", marketId: "eth-7000-2026" });
  const session: Session = {
    id: createId("session"),
    userId: "verify-user",
    objective: "verify persistence",
    marketId: "eth-7000-2026",
    status: "completed",
    permissionScope: scope,
    permissionGrant: {
      mode: "metamask",
      accountAddress: getMasterAgentAccount().address,
      sessionAddress: getMasterAgentAccount().address,
      chainId: CHAIN_ID,
      grantedPermissions: [{ context: "0x00" }],
      requestedAt: nowIso()
    },
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  const events: DomainEvent[] = [
    { id: createId("evt"), sessionId: session.id, type: EventType.SESSION_CREATED, payload: { objective: session.objective }, createdAt: nowIso() },
    { id: createId("evt"), sessionId: session.id, type: EventType.AUDIT_CREATED, payload: { summary: "verified", eventCount: 1 }, createdAt: nowIso() }
  ];
  await persistRun(session, events);
  const loaded = await loadSession(session.id);
  const loadedEvents = await loadEvents(session.id);
  if (!loaded || loaded.id !== session.id) throw new Error("session did not round-trip");
  if (loadedEvents.length < 2) throw new Error("events did not round-trip");
  return `session ${session.id.slice(0, 16)} + ${loadedEvents.length} events persisted`;
});

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
if (passed !== results.length) process.exit(1);
