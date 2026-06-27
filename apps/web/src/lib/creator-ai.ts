// Creator AI client. All endpoints under /creator/ai.

import { api } from "./api";

export interface ListingCopywriterInput {
  assetDescription: string;
  category?: string;
  fileFormats?: string[];
  suggestedPriceCents?: number;
}

export interface ListingCopywriterOutput {
  title: string;
  titleAlternatives: string[];
  shortPitch: string;
  description: string;
  tags: string[];
  suggestedPriceCents: number;
  suggestedPriceRationale: string;
  seoKeywords: string[];
  socialCaption: string;
}

export async function runListingCopywriter(
  input: ListingCopywriterInput,
  authToken: string
): Promise<ListingCopywriterOutput> {
  return api<ListingCopywriterOutput>("/creator/ai/listing-copywriter", {
    method: "POST",
    body: input,
    authToken,
  });
}

export interface AssetCritiqueOutput {
  overall: "ship-it" | "needs-work" | "major-revisions";
  summary: string;
  strengths: string[];
  issues: Array<{
    severity: "minor" | "major" | "blocker";
    description: string;
    fix: string;
  }>;
  composition: {
    balance: number;
    contrast: number;
    typography: number;
    colorHarmony: number;
  };
  recommendations: string[];
}

export async function runAssetCritique(
  input: { imageUrl: string; assetKind: string; question?: string },
  authToken: string
): Promise<AssetCritiqueOutput> {
  return api<AssetCritiqueOutput>("/creator/ai/asset-critique", {
    method: "POST",
    body: input,
    authToken,
  });
}

export interface SalesCoachOutput {
  headline: string;
  insights: Array<{
    type: "opportunity" | "warning" | "info";
    title: string;
    body: string;
    action?: string;
  }>;
  pricingSuggestions: Array<{
    assetId: string;
    assetTitle: string;
    currentPriceCents: number;
    suggestedPriceCents: number;
    rationale: string;
  }>;
  postingTips: string[];
}

export async function getSalesCoach(
  authToken: string,
  range: "7d" | "30d" | "90d" | "1y" | "all" = "30d"
): Promise<SalesCoachOutput> {
  return api<SalesCoachOutput>(`/creator/ai/sales-coach?range=${range}`, { authToken });
}

export interface AIGeneration {
  id: string;
  kind: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
}

export async function getAIHistory(
  authToken: string
): Promise<{ history: AIGeneration[] }> {
  return api<{ history: AIGeneration[] }>("/creator/ai/history", { authToken });
}