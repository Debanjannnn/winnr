import { z } from "zod";

export const MetaMaskPermissionGrantSchema = z.object({
  mode: z.literal("metamask"),
  accountAddress: z.string().trim().min(1),
  sessionAddress: z.string().trim().min(1),
  chainId: z.number().int().positive(),
  grantedPermissions: z.array(z.unknown()).min(1),
  requestedAt: z.string().trim().min(1)
});

export const StartSessionSchema = z.object({
  objective: z.string().trim().min(1).max(500),
  marketId: z.string().trim().min(1).max(120),
  userId: z.string().trim().min(1).max(120).optional(),
  permissionGrant: MetaMaskPermissionGrantSchema.optional()
});

export type StartSessionRequest = z.infer<typeof StartSessionSchema>;
