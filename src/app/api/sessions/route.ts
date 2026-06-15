import { NextResponse, type NextRequest } from "next/server";
import { StartSessionSchema } from "@/lib/domain/schemas";
import { runtime as agentRuntime } from "@/lib/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = StartSessionSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json(
      { error: "invalid session request", issues: body.error.issues },
      { status: 400 }
    );
  }

  const session = await agentRuntime.startSession(body.data);
  return NextResponse.json(session, { status: 201 });
}
