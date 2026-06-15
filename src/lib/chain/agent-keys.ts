import { concatHex, createWalletClient, http, keccak256, stringToHex, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import type { Account } from "viem";
import type { AgentRoleValue } from "../domain/types";

// Each autonomous sub-agent gets its OWN on-chain identity, deterministically
// derived from the single backend AGENT_PRIVATE_KEY. This makes redelegation a
// genuine agent-to-different-agent handoff (delegate != delegator) instead of a
// self-loop, which is the point of the A2A track: the coordinator holds the
// user's ERC-7715 grant and redelegates bounded slices of it to distinct
// evidence / execution agent keys.

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

function masterPrivateKey(): Hex {
  const pk = process.env.AGENT_PRIVATE_KEY;
  if (!pk) throw new Error("AGENT_PRIVATE_KEY is required for on-chain agent operations");
  return (pk.startsWith("0x") ? pk : `0x${pk}`) as Hex;
}

/** Deterministic per-role private key: keccak256(masterKey ‖ "agent-role:<role>"). */
function deriveRolePrivateKey(role: AgentRoleValue): Hex {
  return keccak256(concatHex([masterPrivateKey(), stringToHex(`agent-role:${role}`)]));
}

const accountCache = new Map<string, Account>();

/** The master backend agent account that the user's ERC-7715 grant is issued to. */
export function getMasterAgentAccount(): Account {
  const cached = accountCache.get("master");
  if (cached) return cached;
  const account = privateKeyToAccount(masterPrivateKey());
  accountCache.set("master", account);
  return account;
}

/** The distinct on-chain identity for a given agent role (evidence, execution, …). */
export function getRoleAccount(role: AgentRoleValue): Account {
  const cached = accountCache.get(role);
  if (cached) return cached;
  const account = privateKeyToAccount(deriveRolePrivateKey(role));
  accountCache.set(role, account);
  return account;
}

/** A Base Sepolia wallet client that can sign typed data for the master agent. */
export function getMasterWalletClient() {
  return createWalletClient({
    account: getMasterAgentAccount(),
    chain: baseSepolia,
    transport: http(RPC_URL)
  });
}

/** A Base Sepolia wallet client bound to a specific sub-agent role identity. */
export function getRoleWalletClient(role: AgentRoleValue) {
  return createWalletClient({
    account: getRoleAccount(role),
    chain: baseSepolia,
    transport: http(RPC_URL)
  });
}
