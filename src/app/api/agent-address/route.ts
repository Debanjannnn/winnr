import { NextResponse } from "next/server";
import { getAgentIdentity } from "@/lib/chain/agent-wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The browser calls this to learn which account to grant the ERC-7715 Advanced
// Permission to. The grant recipient is the autonomous agent's server-side key,
// so the agent can later redelegate and redeem the delegation on its own.
export function GET() {
  const { address, chainId, usdcAddress } = getAgentIdentity();
  return NextResponse.json({ address, chainId, usdcAddress });
}
