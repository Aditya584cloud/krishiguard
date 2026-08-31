import { z } from "zod";

export const SOIL_TYPES = [
  "Alluvial",
  "Black",
  "Red",
  "Laterite",
  "Sandy",
  "Clay",
  "Loamy",
] as const;

export const createFarmerSchema = z
  .object({
    name: z.string().min(2),
    phone: z.string().min(10).max(15),
    language: z.enum(["English", "Odia", "Hindi"]),
    district: z.string().min(2),
    state: z.string().min(2),
    village: z.string().min(2),

    primaryCrop: z.string().min(2),
    soilType: z.enum(SOIL_TYPES),

    hasActiveLoan: z.boolean().default(false),
    loanDueDate: z.string().date().optional(),
    loanAmountRupees: z.number().positive().optional(),
  })
  .refine((data) => !data.hasActiveLoan || !!data.loanDueDate, {
    message: "loanDueDate is required when hasActiveLoan is true",
    path: ["loanDueDate"],
  });

export type CreateFarmerInput = z.infer<typeof createFarmerSchema>;
