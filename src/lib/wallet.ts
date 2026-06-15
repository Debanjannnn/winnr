"use client";

// Shared client-side MetaMask Smart Accounts helpers. Used by the workflow
// Navbar and the home dashboard so the connect + ERC-7715 grant logic lives in
// one place.

export interface PermissionGrant {
  mode: "metamask";
  accountAddress: string;
  sessionAddress: string;
  chainId: number;
  grantedPermissions: unknown[];
  requestedAt: string;
}

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

// Base Sepolia testnet: one chain + one USDC token supported by both the x402
// facilitator and the 1Shot testnet relayer. The grant recipient is the
// autonomous agent (fetched from /api/agent-address), not a throwaway key.
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_CHAIN_HEX = "0x14a34";
export const BASE_SEPOLIA_USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export const EVIDENCE_BUDGET_USDC = "10";

interface AgentIdentityResponse {
  address: string;
  chainId: number;
  usdcAddress: string;
}

async function fetchAgentGrantee(): Promise<string> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
  const res = await fetch(`${base}/agent-address`);
  if (!res.ok) throw new Error("Could not load the agent address to grant to.");
  const data = (await res.json()) as AgentIdentityResponse;
  if (!data.address) throw new Error("Agent address endpoint returned no address.");
  return data.address;
}

export async function connectMetaMask(): Promise<string> {
  if (!window.ethereum) {
    throw new Error("MetaMask browser extension is required.");
  }
  const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
  const account = accounts?.[0];
  if (!account) {
    throw new Error("MetaMask did not return an account address.");
  }
  return account;
}

export async function requestPermissionGrant(): Promise<PermissionGrant> {
  if (!window.ethereum) {
    throw new Error(
      "MetaMask was not detected. Install MetaMask (Flask, with Smart Accounts enabled) and reload."
    );
  }

  const [{ createWalletClient, custom, parseUnits, isAddress }, { erc7715ProviderActions }, agentAddress] =
    await Promise.all([
      import("viem"),
      import("@metamask/smart-accounts-kit/actions"),
      fetchAgentGrantee()
    ]);

  if (!isAddress(agentAddress)) {
    throw new Error(
      `Agent grantee address is invalid ("${agentAddress}"). Check AGENT_ADDRESS / AGENT_PRIVATE_KEY in .env.`
    );
  }

  // Make sure MetaMask is on Base Sepolia before requesting the permission.
  await ensureBaseSepolia();

  const walletClient = createWalletClient({
    transport: custom(window.ethereum)
  }).extend(erc7715ProviderActions()) as unknown as {
    requestAddresses(): Promise<string[]>;
    requestExecutionPermissions(permissions: unknown[]): Promise<unknown[]>;
  };

  let accountAddress: string | undefined;
  try {
    const addresses = await walletClient.requestAddresses();
    accountAddress = addresses[0];
  } catch (error) {
    throw describeWalletError(error, "connect");
  }
  if (!accountAddress) {
    throw new Error("MetaMask did not return an account address. Unlock MetaMask and try again.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  let grantedPermissions: unknown[];
  try {
    grantedPermissions = await walletClient.requestExecutionPermissions([
      {
        chainId: BASE_SEPOLIA_CHAIN_ID,
        expiry: nowSeconds + 30 * 60,
        to: agentAddress,
        permission: {
          type: "erc20-token-periodic",
          data: {
            tokenAddress: BASE_SEPOLIA_USDC_ADDRESS,
            periodAmount: parseUnits(EVIDENCE_BUDGET_USDC, 6),
            periodDuration: 30 * 60,
            justification:
              "Permit a market-intelligence agent to spend bounded USDC on x402 evidence and bounded market execution during this session."
          },
          isAdjustmentAllowed: false
        }
      }
    ]);
  } catch (error) {
    throw describeWalletError(error, "grant");
  }

  if (!Array.isArray(grantedPermissions) || grantedPermissions.length === 0) {
    throw new Error("MetaMask returned no granted permissions.");
  }

  return {
    mode: "metamask",
    accountAddress,
    sessionAddress: agentAddress,
    chainId: BASE_SEPOLIA_CHAIN_ID,
    grantedPermissions: toJsonSafe(grantedPermissions),
    requestedAt: new Date().toISOString()
  };
}

interface ProviderError {
  code?: number;
  message?: string;
  data?: unknown;
  shortMessage?: string;
  details?: string;
  cause?: unknown;
}

/** Turn an opaque MetaMask/viem provider error into an actionable message. */
function describeWalletError(error: unknown, phase: "connect" | "grant"): Error {
  const err = (error ?? {}) as ProviderError;
  // viem wraps the provider error; dig for the underlying RPC code/message.
  const cause = (err.cause ?? {}) as ProviderError;
  const code = err.code ?? cause.code;
  const raw =
    err.shortMessage ?? err.message ?? cause.shortMessage ?? cause.message ?? String(error);

  if (code === 4001 || /user rejected|user denied/i.test(raw)) {
    return new Error("You rejected the request in MetaMask. Approve it to continue.");
  }
  if (code === -32601 || /method .*not (found|exist|support)|unsupported method/i.test(raw)) {
    return new Error(
      "This MetaMask build doesn't expose Smart Account permissions (wallet_requestExecutionPermissions). " +
        "Use MetaMask Flask and enable Settings → Experimental → Smart Accounts, then reload."
    );
  }
  if (code === 4100 || /unauthorized|not been authorized/i.test(raw)) {
    return new Error("MetaMask account is not authorized yet. Click Connect first, then Grant.");
  }
  if (code === -32602 || /invalid (params|request)/i.test(raw)) {
    return new Error(`MetaMask rejected the permission request as invalid: ${raw}`);
  }
  const prefix = phase === "grant" ? "Permission grant failed" : "Wallet connection failed";
  return new Error(`${prefix}: ${raw}${code ? ` (code ${code})` : ""}`);
}

async function ensureBaseSepolia(): Promise<void> {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_SEPOLIA_CHAIN_HEX }]
    });
  } catch (error) {
    const code = (error as { code?: number })?.code;
    // 4902 = chain not added yet; add it (which also switches to it).
    if (code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: BASE_SEPOLIA_CHAIN_HEX,
            chainName: "Base Sepolia",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://base-testnet.api.pocket.network"],
            blockExplorerUrls: ["https://sepolia.basescan.org"]
          }
        ]
      });
      return;
    }
    if (code === 4001) {
      throw new Error("You declined the Base Sepolia network switch in MetaMask.");
    }
    throw new Error(
      `Could not switch MetaMask to Base Sepolia (chain ${BASE_SEPOLIA_CHAIN_ID}). ` +
        `Switch networks manually and retry. ${(error as { message?: string })?.message ?? ""}`.trim()
    );
  }
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

function toJsonSafe(value: unknown): unknown[] {
  const serialized = JSON.stringify(value, (_key, nestedValue: unknown) =>
    typeof nestedValue === "bigint" ? nestedValue.toString() : nestedValue
  );
  const parsed = JSON.parse(serialized) as unknown;
  return Array.isArray(parsed) ? parsed : [parsed];
}
