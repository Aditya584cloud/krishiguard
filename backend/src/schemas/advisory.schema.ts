import { z } from "zod";

export const advisorySchema = z.object({
  farmerId: z.string(),
  crop: z.string().min(2).optional(),
  soil: z.string().min(2).optional(),
});

export type AdvisoryInput = z.infer<typeof advisorySchema>;