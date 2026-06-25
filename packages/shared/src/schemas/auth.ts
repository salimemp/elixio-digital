import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().email();

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().min(1).max(120),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
  rotate: z.boolean().default(true),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const emailOnlySchema = z.object({ email: emailSchema });

export const passwordResetRequestSchema = emailOnlySchema;

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});

export const magicLinkRequestSchema = emailOnlySchema;

export const magicLinkConsumeSchema = z.object({
  token: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const mfaCodeSchema = z.object({
  code: z.string().min(4).max(20),
});

export const mfaVerifySchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().min(4).max(20),
});

export const mfaDisableSchema = z.object({
  password: z.string().min(1),
});

export const backupCodesRegenSchema = z.object({
  password: z.string().min(1),
});

export const oauthProviderSchema = z.enum(["google", "github"]);

export const oauthBeginSchema = z.object({
  provider: oauthProviderSchema,
  redirectUri: z.string().url(),
});

export const oauthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export const oauthExchangeSchema = z.object({
  code: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type EmailOnlyInput = z.infer<typeof emailOnlySchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type MagicLinkConsumeInput = z.infer<typeof magicLinkConsumeSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type MfaCodeInput = z.infer<typeof mfaCodeSchema>;
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;
export type MfaDisableInput = z.infer<typeof mfaDisableSchema>;
export type BackupCodesRegenInput = z.infer<typeof backupCodesRegenSchema>;
export type OauthBeginInput = z.infer<typeof oauthBeginSchema>;
export type OauthCallbackInput = z.infer<typeof oauthCallbackSchema>;
export type OauthExchangeInput = z.infer<typeof oauthExchangeSchema>;
