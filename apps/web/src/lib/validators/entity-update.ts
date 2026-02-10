import { z } from "zod";

export const entityUpdateInputSchema = z
  .object({
    type: z.string().min(2).max(40).optional(),
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(10000).nullable().optional(),
    stats: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.string().min(1).max(30)).max(30).optional(),
    isVisibleToPlayers: z.boolean().optional(),
    imageUrl: z.string().url().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });
