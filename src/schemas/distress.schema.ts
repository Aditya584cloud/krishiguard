import { z } from "zod";

export const distressSchema = z.object({
  farmerId: z.string(),
  rainfallDeviationPercent: z.number(),
  priceChangePercent: z.number(),
  loanDueInDays: z.number().int().min(0),
});

export type DistressInput = z.infer<typeof distressSchema>;