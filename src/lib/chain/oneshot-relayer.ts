import { fetch as undiciFetch } from "undici";
import type { Hex } from "viem";
import { dohAgent } from "../net/doh";

// Real client for the 1Shot permissionless relayer (EIP-7710 delegated execution).
// Shapes verified against the live testnet relayer + OpenRPC spec:
//   getCapabilities params = ["<chainId>"]            (array of chainId strings)
//   getFeeData        params = { chainId, token }      (by-name object)
//   send7710          params = { chainId, transactions:[{permissionContext, executions}], context, authorizationList? }
//   getStatus         params = { id, logs:false }      → status 100/110/200/400/500
// Gas is paid in USDC, so the agent needs no native ETH for relayed execution.

export interface Delegation7710 {
  delegate: Hex;
  delegator: Hex;
  authority: Hex;
  caveats: { enforcer: Hex; terms: Hex; args: Hex }[];
  salt: Hex;
  signature: Hex;
}

export interface Execution7710 {
  target: Hex;
  value: Hex;
  data: Hex;
}

export interface RelayerCapabilityToken {
  address: Hex;
  symbol: string;
  decimals: string;
}

export interface RelayerCapability {
  feeCollector: Hex;
  targetAddress: Hex;
  tokens: RelayerCapabilityToken[];
}

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code?: number; message?: string; data?: unknown };
}

export type RelayerStatus = "pending" | "submitted" | "confirmed" | "rejected" | "reverted";

export interface RelayerStatusResult {
  status: RelayerStatus;
  statusCode: number;
  transactionHash: Hex | null;
  message?: string;
}

const STATUS_BY_CODE: Record<number, RelayerStatus> = {
  100: "pending",
  110: "submitted",
  200: "confirmed",
  400: "rejected",
  500: "reverted"
};

function relayerUrl(): string {
  return process.env.ONESHOT_RELAYER_URL ?? "https://relayer.1shotapi.dev/relayers";
}

function chainIdString(): string {
  return String(process.env.CHAIN_ID ?? "84532");
}

async function rpc<T>(method: string, params: unknown): Promise<T> {
  const response = await undiciFetch(relayerUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Encoding": "identity" },
    body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomUUID(), method, params }),
    dispatcher: dohAgent
  });
  const json = (await response.json()) as JsonRpcResponse<T>;
  if (!response.ok || json.error) {
    throw new Error(`1Shot ${method} failed: ${json.error?.message ?? response.statusText}`);
  }
  if (json.result === undefined) {
    throw new Error(`1Shot ${method} returned no result`);
  }
  return json.result;
}

export async function getCapabilities(
  chainIds: string[] = [chainIdString()]
): Promise<Record<string, RelayerCapability>> {
  return rpc<Record<string, RelayerCapability>>("relayer_getCapabilities", chainIds);
}

/** Resolve the USDC token address the relayer accepts for the fee on this chain. */
export async function resolveFeeToken(chainId = chainIdString()): Promise<Hex> {
  const caps = await getCapabilities([chainId]);
  const tokens = caps[chainId]?.tokens ?? [];
  const usdc = tokens.find((t) => t.symbol.toUpperCase() === "USDC") ?? tokens[0];
  if (!usdc) throw new Error(`1Shot relayer has no fee tokens for chain ${chainId}`);
  return usdc.address;
}

interface FeeDataResult {
  context?: string;
  rate?: string;
  minFee?: string;
  expiry?: number;
}

export async function getFeeData(token: Hex, chainId = chainIdString()): Promise<FeeDataResult> {
  return rpc<FeeDataResult>("relayer_getFeeData", { chainId, token });
}

interface SendParams {
  chainId?: string;
  transactions: { permissionContext: Delegation7710[]; executions: Execution7710[] }[];
  context?: string;
  authorizationList?: unknown[];
}

/** Submit a delegated 7710 bundle. Returns the relayer TaskId. */
export async function send7710Transaction(params: SendParams): Promise<Hex> {
  const body = {
    chainId: params.chainId ?? chainIdString(),
    transactions: params.transactions,
    ...(params.context ? { context: params.context } : {}),
    ...(params.authorizationList ? { authorizationList: params.authorizationList } : {})
  };
  return rpc<Hex>("relayer_send7710Transaction", body);
}

interface StatusRpcResult {
  status?: number;
  receipt?: { transactionHash?: Hex };
  hash?: Hex;
  message?: string;
}

export async function getStatus(taskId: Hex): Promise<RelayerStatusResult> {
  const result = await rpc<StatusRpcResult>("relayer_getStatus", { id: taskId, logs: false });
  const statusCode = result.status ?? 100;
  return {
    statusCode,
    status: STATUS_BY_CODE[statusCode] ?? "pending",
    transactionHash: result.receipt?.transactionHash ?? result.hash ?? null,
    ...(result.message ? { message: result.message } : {})
  };
}

/**
 * High-level: relay a delegated execution and wait for a terminal status.
 * Quotes the fee (USDC), submits the bundle, then polls getStatus.
 */
export async function executeDelegated(input: {
  permissionContext: Delegation7710[];
  executions: Execution7710[];
  pollIntervalMs?: number;
  timeoutMs?: number;
}): Promise<{ taskId: Hex; result: RelayerStatusResult }> {
  const token = await resolveFeeToken();
  const fee = await getFeeData(token);
  const taskId = await send7710Transaction({
    transactions: [{ permissionContext: input.permissionContext, executions: input.executions }],
    ...(fee.context ? { context: fee.context } : {})
  });

  const interval = input.pollIntervalMs ?? 2500;
  const deadline = Date.now() + (input.timeoutMs ?? 60_000);
  let last: RelayerStatusResult = { status: "pending", statusCode: 100, transactionHash: null };
  while (Date.now() < deadline) {
    last = await getStatus(taskId);
    if (last.status === "confirmed" || last.status === "rejected" || last.status === "reverted") {
      return { taskId, result: last };
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return { taskId, result: last };
}
