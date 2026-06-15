import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// Base Sepolia clients for server-side delegation work. sepolia.base.org and the
// 1Shot relayer resolve fine on this network, so no DoH dispatcher is needed here
// (unlike Neon/Polymarket).
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

export const baseSepoliaChain = baseSepolia;

export function getPublicClient() {
  return createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
}

export function getAgentAccount() {
  const pk = process.env.AGENT_PRIVATE_KEY;
  if (!pk) throw new Error("AGENT_PRIVATE_KEY is required for on-chain agent operations");
  return privateKeyToAccount(pk as Hex);
}

export function getAgentWalletClient() {
  return createWalletClient({
    account: getAgentAccount(),
    chain: baseSepolia,
    transport: http(RPC_URL)
  });
}
