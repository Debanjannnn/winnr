import { NextResponse } from "next/server";
import { runtime as agentRuntime } from "@/lib/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await agentRuntime.getSession(id);
  return NextResponse.json(session ?? { error: "session not found" }, {
    status: session ? 200 : 404
  });
}
