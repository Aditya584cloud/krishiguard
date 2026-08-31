import { z } from "zod";

export const marketPriceSchema = z.object({
  farmerId: z.string(),
  // Optional — defaults to the farmer's registered primary crop when omitted.
  crop: z.string().min(2).optional(),
});

export type MarketPriceInput = z.infer<typeof marketPriceSchema>;