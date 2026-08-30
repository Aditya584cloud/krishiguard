import { z } from "zod";

export const advisorySchema = z.object({
  farmerId: z.string(),
  crop: z.string().min(2),
  soil: z.string().min(2),
});

export type AdvisoryInput = z.infer<typeof advisorySchema>;