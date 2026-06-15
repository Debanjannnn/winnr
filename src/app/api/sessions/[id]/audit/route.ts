import { NextResponse } from "next/server";
import { runtime as agentRuntime } from "@/lib/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const audit = await agentRuntime.getAudit(id);
  return NextResponse.json(audit ?? { error: "session not found" }, {
    status: audit ? 200 : 404
  });
}
