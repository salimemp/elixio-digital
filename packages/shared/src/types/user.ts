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
