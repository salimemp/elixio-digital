export type UserRole = "buyer" | "creator" | "admin";

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isBuyer: boolean;
  isCreator: boolean;
  isAdmin: boolean;
  isVerified: boolean;
  emailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
  mfaRequired?: boolean;
}

export interface Storefront {
  id: string;
  userId: string;
  slug: string;
  bannerUrl: string | null;
  accentColor: string | null;
  socialLinks: SocialLinks;
}

export interface SocialLinks {
  website?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  github?: string;
  linkedin?: string;
}

export type OAuthProviderName = "google" | "github";
export type MfaFactorKind = "totp" | "webauthn";

export interface PasskeySummary {
  id: string;
  name: string;
  aaguid: string | null;
  transports: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export interface TotpSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export interface MfaStatus {
  enabled: boolean;
  enrolledAt: string | null;
  lastVerifiedAt: string | null;
}
