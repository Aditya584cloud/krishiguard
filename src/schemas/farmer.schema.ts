import { z } from "zod";

export const createFarmerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10).max(15),
  language: z.enum(["English", "Odia", "Hindi"]),
  district: z.string().min(2),
  state: z.string().min(2),
  village: z.string().min(2),
});

export type CreateFarmerInput = z.infer<typeof createFarmerSchema>;
