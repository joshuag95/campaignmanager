import { z } from "zod";

// Shared validator for campaign creation/update payloads.
export const campaignInputSchema = z.object({
  name: z.string().min(2).max(120),
  setting: z.string().max(120).optional(),
  summary: z.string().max(5000).optional(),
});
