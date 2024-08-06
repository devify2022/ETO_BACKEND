import { z } from "zod";

const userZodSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\d+$/, "Phone number must be numeric"),
  otp: z.string().min(4, "OTP is required"),
  isVerified: z.boolean().default(false),
  isDriver: z.boolean().default(false),
});

export const UserValidation = {
  userZodSchema,
};
