import { getSmartAccountsEnvironment } from "@metamask/smart-accounts-kit";
import { erc7710WalletActions } from "@metamask/smart-accounts-kit/actions";
import { keccak256, stringToHex, type Hex } from "viem";
import type { SmartAccountsEnvironment } from "@metamask/smart-accounts-kit";
import type { AgentRoleValue, MetaMaskPermissionGrant } from "../domain/types";
import { getMasterWalletClient, getRoleWalletClient } from "./agent-keys";

// Real ERC-7710 redelegation. The browser issues the user's ERC-7715 grant to the
// master agent; here the master (the parent delegate) signs new, narrower
// delegations to each sub-agent's distinct key. Pure off-chain EIP-712 signing —
// no gas, no funds — producing a verifiable delegation chain the relayer / x402
// seller later redeems.

export interface GrantContext {
  /** The parent permission context (delegation chain) the agent may redeem. */
  permissionContext: Hex;
  /** The DelegationManager that will enforce the caveats on redemption. */
  delegationManager: Hex;
  /** Account-abstraction deploy dependencies for the user's smart account. */
  dependencies: { factory: Hex; factoryData: Hex }[];
  chainId: number;
}

interface RawGrantedPermission {
  context?: unknown;
  delegationManager?: unknown;
  dependencies?: unknown;
  chainId?: unknown;
}

function isHex(value: unknown): value is Hex {
  return typeof value === "string" && value.startsWith("0x");
}

function chainIdNumber(): number {
  const chainId = Number(process.env.CHAIN_ID ?? "84532");
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error("CHAIN_ID must be a positive integer");
  }
  return chainId;
}

let cachedEnvironment: SmartAccountsEnvironment | null = null;

export function getEnvironment(): SmartAccountsEnvironment {
  if (cachedEnvironment) return cachedEnvironment;
  cachedEnvironment = getSmartAccountsEnvironment(chainIdNumber());
  return cachedEnvironment;
}

/**
 * Pull the real permission context out of the browser ERC-7715 grant. The grant
 * carries the serialized PermissionResponse[]; the first entry holds the context,
 * delegationManager, and AA dependencies we need to redelegate and redeem.
 */
export function extractGrantContext(permissionGrant: MetaMaskPermissionGrant): GrantContext {
  const first = permissionGrant.grantedPermissions?.[0] as RawGrantedPermission | undefined;
  if (!first || !isHex(first.context)) {
    throw new Error(
      "ERC-7715 grant is missing a permission context. Re-run the MetaMask Advanced Permission grant."
    );
  }
  const delegationManager = isHex(first.delegationManager)
    ? first.delegationManager
    : (getEnvironment().DelegationManager as Hex);
  const dependencies = Array.isArray(first.dependencies)
    ? (first.dependencies as { factory: Hex; factoryData: Hex }[])
    : [];
  return {
    permissionContext: first.context,
    delegationManager,
    dependencies,
    chainId: permissionGrant.chainId ?? chainIdNumber()
  };
}

export interface RedelegationResult {
  /** The child permission context the recipient sub-agent can now redeem. */
  permissionContext: Hex;
  /** The signed child delegation (delegate = recipient role key). */
  delegation: unknown;
  fromAgent: AgentRoleValue;
  toAgent: AgentRoleValue;
  recipientAddress: Hex;
}

function deterministicSalt(label: string, parent: Hex): Hex {
  // Unique per (label, parent context) so repeat handoffs don't collide,
  // while staying reproducible for a given delegation chain.
  return keccak256(stringToHex(`redelegate:${label}:${parent}`));
}

/**
 * Core redelegation: the agent key behind `fromWallet` (the current delegate of
 * `parentContext`) signs a new delegation to `toAddress`. Pure local EIP-712
 * signing — no RPC, no gas.
 */
export async function redelegateToAddress(input: {
  parentContext: Hex;
  toAddress: Hex;
  fromIsRole?: AgentRoleValue;
  saltLabel: string;
}): Promise<{ permissionContext: Hex; delegation: unknown }> {
  const { parentContext, toAddress, fromIsRole, saltLabel } = input;
  const baseClient = fromIsRole ? getRoleWalletClient(fromIsRole) : getMasterWalletClient();
  const walletClient = baseClient.extend(erc7710WalletActions());
  const result = await walletClient.redelegatePermissionContext({
    environment: getEnvironment(),
    permissionContext: parentContext,
    to: toAddress,
    salt: deterministicSalt(saltLabel, parentContext)
  });
  return { permissionContext: result.permissionContext, delegation: result.delegation };
}

/**
 * Redelegate `parentContext` from one agent role to another. The `from` role
 * (default: master) must currently be the delegate of `parentContext`; it signs a
 * new delegation whose delegate is the `to` role's distinct key.
 */
export async function redelegateToRole(input: {
  parentContext: Hex;
  fromAgent: AgentRoleValue;
  toAgent: AgentRoleValue;
  /** When true the `from` role key signs; otherwise the master agent signs. */
  fromIsRole?: boolean;
}): Promise<RedelegationResult> {
  const { parentContext, fromAgent, toAgent, fromIsRole = false } = input;
  const recipient = getRoleWalletClient(toAgent).account;
  if (!recipient) throw new Error(`No account derived for agent role ${toAgent}`);

  const result = await redelegateToAddress({
    parentContext,
    toAddress: recipient.address,
    ...(fromIsRole ? { fromIsRole: fromAgent } : {}),
    saltLabel: `${fromAgent}->${toAgent}`
  });

  return {
    permissionContext: result.permissionContext,
    delegation: result.delegation,
    fromAgent,
    toAgent,
    recipientAddress: recipient.address
  };
}
