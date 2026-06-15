import { decodeDelegations } from "@metamask/smart-accounts-kit/utils";
import { encodeFunctionData, erc20Abi, parseUnits, type Hex } from "viem";
import { assertCanExecuteMarketAction } from "../domain/permissions";
import { getRoleAccount } from "../chain/agent-keys";
import { redelegateToAddress } from "../chain/redelegation";
import {
  getCapabilities,
  getFeeData,
  getStatus,
  resolveFeeToken,
  send7710Transaction,
  type Delegation7710,
  type Execution7710
} from "../chain/oneshot-relayer";
import {
  AgentRole,
  type MarketAction,
  type MetaMaskPermissionGrant,
  type PermissionScope,
  type RelayerConfirmation,
  type RelayerSubmission
} from "../domain/types";

export interface OneShotRelayerAdapter {
  submitDelegatedTransaction(input: {
    permissionScope: PermissionScope;
    permissionGrant: MetaMaskPermissionGrant;
    executionContext: Hex;
    delegationManager: Hex;
    marketId: string;
    amountUsd: number;
    action: MarketAction;
  }): Promise<RelayerSubmission>;
  waitForConfirmation(taskId: string): Promise<RelayerConfirmation>;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for live 1Shot relayer integration`);
  return value;
}

function chainIdString(): string {
  return String(process.env.CHAIN_ID ?? "84532");
}

/** The USDC the bounded market action moves; defaults to the agent's execution sink. */
function executionSink(): Hex {
  const sink = process.env.EXECUTION_SINK_ADDRESS;
  if (sink) return sink as Hex;
  return getRoleAccount(AgentRole.EXECUTION).address;
}

/**
 * Real 1Shot permissionless-relayer adapter. The execution agent holds a
 * redelegated slice of the user's ERC-7715 grant; here it redelegates that slice
 * once more to the relayer's executor, decodes the full delegation chain, and
 * submits a bounded USDC transfer that the relayer lands on Base Sepolia while
 * paying gas in USDC (no native ETH needed).
 */
export class LiveOneShotRelayerAdapter implements OneShotRelayerAdapter {
  async submitDelegatedTransaction({
    permissionScope,
    executionContext,
    marketId,
    amountUsd,
    action
  }: {
    permissionScope: PermissionScope;
    permissionGrant: MetaMaskPermissionGrant;
    executionContext: Hex;
    delegationManager: Hex;
    marketId: string;
    amountUsd: number;
    action: MarketAction;
  }): Promise<RelayerSubmission> {
    assertCanExecuteMarketAction(permissionScope, marketId, amountUsd, action);

    // The relayer redeems as the leaf delegate, so its executor address must be
    // the final delegate. Redelegate the execution slice to it (signed by the
    // execution agent key, the current delegate of executionContext).
    const chainId = chainIdString();
    const caps = await getCapabilities([chainId]);
    const relayerTarget = caps[chainId]?.targetAddress;
    if (!relayerTarget) {
      throw new Error(`1Shot relayer exposes no target address for chain ${chainId}`);
    }

    const redelegated = await redelegateToAddress({
      parentContext: executionContext,
      toAddress: relayerTarget,
      fromIsRole: AgentRole.EXECUTION,
      saltLabel: "execution->1shot-relayer"
    });

    const permissionContext = decodeDelegations(
      redelegated.permissionContext
    ) as unknown as Delegation7710[];

    const usdc = requiredEnv("USDC_ADDRESS") as Hex;
    const execution: Execution7710 = {
      target: usdc,
      value: "0x0",
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [executionSink(), parseUnits(String(amountUsd), 6)]
      })
    };

    const feeToken = await resolveFeeToken(chainId);
    const fee = await getFeeData(feeToken, chainId);
    const taskId = await send7710Transaction({
      chainId,
      transactions: [{ permissionContext, executions: [execution] }],
      ...(fee.context ? { context: fee.context } : {})
    });

    return {
      taskId,
      status: "submitted",
      feeAsset: "USDC",
      feeUsd: fee.minFee ? Number(fee.minFee) : 0,
      transactionHash: null
    };
  }

  async waitForConfirmation(taskId: string): Promise<RelayerConfirmation> {
    const interval = 2500;
    const deadline = Date.now() + 60_000;
    let last = await getStatus(taskId as Hex);
    while (
      Date.now() < deadline &&
      last.status !== "confirmed" &&
      last.status !== "rejected" &&
      last.status !== "reverted"
    ) {
      await new Promise((resolve) => setTimeout(resolve, interval));
      last = await getStatus(taskId as Hex);
    }
    return {
      taskId,
      status:
        last.status === "rejected" || last.status === "reverted" ? last.status : "confirmed",
      transactionHash: last.transactionHash
    };
  }
}

export function createOneShotRelayerAdapter(): OneShotRelayerAdapter {
  return new LiveOneShotRelayerAdapter();
}
