import { z } from "zod";

// Shared validator for base entity payloads used by multiple UI forms.
export const entityInputSchema = z.object({
  campaignId: z.string().uuid(),
  type: z.string().min(2).max(40),
  name: z.string().min(2).max(120),
  description: z.string().max(10000).optional(),
  stats: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string().min(1).max(30)).max(30).optional(),
  isVisibleToPlayers: z.boolean().optional(),
  imageUrl: z.string().url().optional(),
});
