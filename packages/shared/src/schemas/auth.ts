import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().email().toLowerCase();

/**
 * Strong password policy. Enforced both client-side (for instant feedback
 * in the strength meter) and server-side (via Zod) so a tampered client
 * can't bypass it.
 *
 * Rules:
 *   - 8-128 characters
 *   - At least 1 letter (any case)
 *   - At least 1 number
 *   - At least 1 special character (non-alphanumeric, non-space)
 *
 * The /^[A-Za-z]/ lookahead requires a letter, /\d/ requires a digit,
 * and /[^A-Za-z0-9\s]/ requires a non-alphanumeric non-space character
 * (i.e. a "special").
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Za-z]/, "Password must include at least 1 letter")
  .regex(/\d/, "Password must include at least 1 number")
  .regex(/[^A-Za-z0-9\s]/, "Password must include at least 1 special character");

/**
 * Signup type — separate Creators from Buyers at the registration
 * step so we can:
 *   - Use distinct onboarding flows
 *   - Log registrations to separate audit logs
 *   - Show targeted messaging
 *   - Pre-set role-specific defaults
 *
 * Stored as the Prisma `role` enum ("buyer" or "creator"); admins are
 * never created via the public registration endpoint.
 */
export const signupTypeSchema = z.enum(["buyer", "creator"]);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().min(1).max(120),
  signupType: signupTypeSchema.default("buyer"),
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

/* ------------------------------------------------------------------------- */
/*  Password strength scoring — used by the client-side meter                 */
/* ------------------------------------------------------------------------- */

export type PasswordStrength = "very-weak" | "weak" | "okay" | "good" | "strong";

/**
 * Pure-function password scorer (no library, no deps). Returns a bucket
 * based on rule satisfaction + length + character diversity.
 *
 *   - very-weak: fails one or more core rules
 *   - weak:      meets the 3 rules but length is 8-9
 *   - okay:      meets rules, length 10-11
 *   - good:      meets rules, length 12-15 OR has 4+ character classes
 *   - strong:    meets rules, length 16+ AND has 4+ character classes
 *
 * Character classes: lowercase, uppercase, number, special.
 */
export const scorePassword = (password: string): PasswordStrength => {
  if (!password) return "very-weak";

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9\s]/.test(password);
  const classes = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

  const rulesMet =
    hasLower || hasUpper ? true : false; // at least one letter
  const hasDigit = hasNumber;
  const hasSpec = hasSpecial;
  const rulesAllMet = rulesMet && hasDigit && hasSpec;

  if (!rulesAllMet) return "very-weak";
  if (password.length < 10) return "weak";
  if (password.length < 12) return "okay";
  if (password.length >= 16 && classes >= 4) return "strong";
  return "good";
};

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
export type SignupType = z.infer<typeof signupTypeSchema>;
