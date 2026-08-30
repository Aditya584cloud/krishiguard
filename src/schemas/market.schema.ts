import { z } from "zod";

export const marketPriceSchema = z.object({
  farmerId: z.string(),
  crop: z.string().min(2),
});

export type MarketPriceInput = z.infer<typeof marketPriceSchema>;