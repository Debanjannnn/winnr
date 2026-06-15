import test from "node:test";
import assert from "node:assert/strict";
import { createRuntime } from "../src/lib/orchestration/workflow";

test("workflow requires a real MetaMask permission grant before agent execution", async () => {
  const runtime = createRuntime();
  await assert.rejects(
    runtime.startSession({
      objective: "Evaluate a market",
      marketId: "eth-7000-2026",
      userId: "u1"
    }),
    /MetaMask Advanced Permission grant is required/
  );
});
