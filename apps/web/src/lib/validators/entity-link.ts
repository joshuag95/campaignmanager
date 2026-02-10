import { z } from "zod";

export const entityLinkInputSchema = z
  .object({
    campaignId: z.string().uuid(),
    fromEntityId: z.string().uuid(),
    toEntityId: z.string().uuid(),
    relationType: z.string().min(2).max(50),
    notes: z.string().max(1000).optional(),
  })
  .refine((data) => data.fromEntityId !== data.toEntityId, {
    message: "fromEntityId and toEntityId must be different.",
    path: ["toEntityId"],
  });
