import { createRuntime } from "./orchestration/workflow";

// Cache the in-memory runtime on globalThis so it survives Next.js dev
// hot-reloads and is shared across every API route handler in the process.
const globalForRuntime = globalThis as unknown as {
  __mianRuntime?: ReturnType<typeof createRuntime>;
};

export const runtime =
  globalForRuntime.__mianRuntime ?? (globalForRuntime.__mianRuntime = createRuntime());
