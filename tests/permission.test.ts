import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCanExecuteMarketAction,
  assertCanPurchaseEvidence,
  createDefaultPermissionScope
} from "../src/lib/domain/permissions";

test("permission scope allows whitelisted evidence purchase within budget", () => {
  const scope = createDefaultPermissionScope({ userId: "u1", marketId: "m1" });
  assert.doesNotThrow(() => assertCanPurchaseEvidence(scope, "macro-signal-api", 0.1));
});

test("permission scope blocks oversized trade", () => {
  const scope = createDefaultPermissionScope({ userId: "u1", marketId: "m1" });
  assert.throws(
    () => assertCanExecuteMarketAction(scope, "m1", 3, "buy"),
    /exceeds max trade cap/
  );
});

test("permission scope blocks non-whitelisted market", () => {
  const scope = createDefaultPermissionScope({ userId: "u1", marketId: "m1" });
  assert.throws(
    () => assertCanExecuteMarketAction(scope, "m2", 1, "buy"),
    /not whitelisted/
  );
});
