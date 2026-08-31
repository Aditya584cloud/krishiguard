import { z } from "zod";

// Distress assessment takes ONLY a farmer id. Rainfall, market and loan
// signals are derived server-side from data the system already has — the
// caller must never supply rainfallDeviationPercent, priceChangePercent or
// loanDueInDays directly.
export const distressSchema = z.object({
  farmerId: z.string(),
});

export type DistressInput = z.infer<typeof distressSchema>;
