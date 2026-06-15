import type { Hex } from "viem";
import type {
  AgentRoleValue,
  MetaMaskPermissionGrant,
  PermissionScope
} from "../domain/types";
import { extractGrantContext, redelegateToRole } from "../chain/redelegation";

export interface PermissionGrant {
  permissionId: string;
  userId: string;
  marketId: string;
  smartAccountAddress: string;
  /** The real ERC-7715 permission context (delegation chain) granted to the agent. */
  permissionContext: Hex;
  /** DelegationManager that enforces the caveats when the context is redeemed. */
  delegationManager: Hex;
  delegationHash: string;
  status: "granted";
  scope: PermissionScope;
}

export interface RedelegationGrant {
  redelegationId: string;
  parentPermissionId: string;
  fromAgent: AgentRoleValue;
  toAgent: AgentRoleValue;
  /** Child permission context the recipient sub-agent can redeem. */
  permissionContext: Hex;
  /** On-chain address of the recipient sub-agent (the new delegate). */
  recipientAddress: Hex;
  scope: PermissionScope;
  status: "created";
}

export interface MetaMaskAdapter {
  requestAdvancedPermission(input: {
    userId: string;
    marketId: string;
    requestedScope: PermissionScope;
    permissionGrant: MetaMaskPermissionGrant;
  }): Promise<PermissionGrant>;
  createRedelegation(input: {
    parentPermissionId: string;
    parentContext: Hex;
    fromAgent: AgentRoleValue;
    toAgent: AgentRoleValue;
    scope: PermissionScope;
  }): Promise<RedelegationGrant>;
}

/**
 * Real adapter over the MetaMask Smart Accounts Kit. It does not re-prompt the
 * user (the browser already produced the ERC-7715 grant); instead it reads the
 * real permission context out of that grant and performs genuine off-chain
 * ERC-7710 redelegations from the backend agent to its sub-agent keys.
 */
export class MetaMaskSmartAccountsAdapter implements MetaMaskAdapter {
  async requestAdvancedPermission({
    userId,
    marketId,
    requestedScope,
    permissionGrant
  }: {
    userId: string;
    marketId: string;
    requestedScope: PermissionScope;
    permissionGrant: MetaMaskPermissionGrant;
  }): Promise<PermissionGrant> {
    const grant = extractGrantContext(permissionGrant);
    return {
      permissionId: requestedScope.id,
      userId,
      marketId,
      smartAccountAddress: permissionGrant.accountAddress,
      permissionContext: grant.permissionContext,
      delegationManager: grant.delegationManager,
      delegationHash: grant.permissionContext.slice(0, 18),
      status: "granted",
      scope: requestedScope
    };
  }

  async createRedelegation({
    parentPermissionId,
    parentContext,
    fromAgent,
    toAgent,
    scope
  }: {
    parentPermissionId: string;
    parentContext: Hex;
    fromAgent: AgentRoleValue;
    toAgent: AgentRoleValue;
    scope: PermissionScope;
  }): Promise<RedelegationGrant> {
    const result = await redelegateToRole({ parentContext, fromAgent, toAgent });
    return {
      redelegationId: `redel_${result.recipientAddress.slice(2, 14)}`,
      parentPermissionId,
      fromAgent,
      toAgent,
      permissionContext: result.permissionContext,
      recipientAddress: result.recipientAddress,
      scope,
      status: "created"
    };
  }
}
