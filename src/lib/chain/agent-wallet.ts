import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";

// Server-side identity of the autonomous agent. The ERC-7715 Advanced Permission
// is granted to this account, so the agent can redelegate and redeem on-chain.

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for on-chain agent operations`);
  return value;
}

export interface AgentIdentity {
  address: Hex;
  chainId: number;
  usdcAddress: Hex;
}

let cachedIdentity: AgentIdentity | null = null;

export function getAgentIdentity(): AgentIdentity {
  if (cachedIdentity) return cachedIdentity;
  const account = privateKeyToAccount(requiredEnv("AGENT_PRIVATE_KEY") as Hex);
  const chainId = Number(process.env.CHAIN_ID ?? "84532");
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error("CHAIN_ID must be a positive integer");
  }
  cachedIdentity = {
    address: account.address,
    chainId,
    usdcAddress: requiredEnv("USDC_ADDRESS") as Hex
  };
  return cachedIdentity;
}

export function getAgentAccount() {
  return privateKeyToAccount(requiredEnv("AGENT_PRIVATE_KEY") as Hex);
}
