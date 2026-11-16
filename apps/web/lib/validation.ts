import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/\d/, "Include a number");

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(254, "Email is too long");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
});

export const registerSchema = z
  .object({
    name: z.string().max(80, "Name is too long").optional(),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const contactSchema = z.object({
  name: z.string().min(1, "Your name is required").max(120, "Name is too long"),
  email: emailSchema,
  subject: z.string().max(160, "Subject is too long").optional(),
  message: z
    .string()
    .min(20, "Please provide at least 20 characters")
    .max(5000, "Message is too long"),
});

export const profileSchema = z.object({
  name: z.string().max(80, "Name is too long").optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirm: z.literal("DELETE", { errorMap: () => ({ message: "Type DELETE to confirm" }) }),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(60, "Name is too long"),
});

export const adminModelSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  version: z.string().min(1, "Version is required").max(40),
  backend: z.enum(["HF", "MOCK"]),
  modelId: z.string().min(1, "Model ID is required").max(200),
  calibrationTemperature: z.coerce.number().min(0.1).max(10),
  notes: z.string().max(2000).optional(),
  activate: z.boolean().optional(),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type ContactValues = z.infer<typeof contactSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
export type DeleteAccountValues = z.infer<typeof deleteAccountSchema>;
export type CreateApiKeyValues = z.infer<typeof createApiKeySchema>;
export type AdminModelValues = z.infer<typeof adminModelSchema>;
