import { z } from "zod";
export const distressSchema = z.object({
  farmerId: z.string(),
});

export type DistressInput = z.infer<typeof distressSchema>;
