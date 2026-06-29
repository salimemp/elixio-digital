import { generate, recordAIGeneration, type GenerationRecord } from "../lib/gemini.js";

export interface ListingCopywriterInput {
  /** What the asset IS (e.g. "minimalist wedding invitation template pack, 5 designs, A5"). */
  assetDescription: string;
  /** Optional category hint (e.g. "Wedding Templates"). */
  category?: string;
  /** Optional file types (e.g. ["PSD", "AI"]). */
  fileFormats?: string[];
  /** Optional price the creator has in mind. */
  suggestedPriceCents?: number;
}

export interface ListingCopywriterOutput {
  title: string;
  titleAlternatives: string[];
  shortPitch: string; // < 200 chars, used in cards
  description: string; // 2-3 paragraphs, plain text
  tags: string[];
  suggestedPriceCents: number;
  suggestedPriceRationale: string;
  seoKeywords: string[];
  socialCaption: string;
}

/**
 * Listing copywriter. Given a one-line description of what the asset
 * is, produces:
 * - 1 title + 3 alternatives
 * - 1 short pitch (<200 chars) for cards/grids
 * - 1 longer description (2-3 paragraphs)
 * - 5-10 tags
 * - 1 suggested price in cents + rationale
 * - 5 SEO keywords
 * - 1 social caption
 *
 * Returns structured JSON. Caller persists to ai_generations.
 */
export async function runListingCopywriter(
  creatorId: string,
  input: ListingCopywriterInput
): Promise<ListingCopywriterOutput> {
  const systemPrompt = `You are a marketplace listing copywriter for Elixio, a digital-assets marketplace for designers, illustrators, and 3D artists. You write in clean, confident English. You never use emojis, exclamation marks beyond a single closing one, or hype words like "amazing", "stunning", "ultimate". You focus on what the asset IS, who it's FOR, and what it INCLUDES. Keep titles under 60 characters. Descriptions under 800 words. Tags lowercase, hyphenated, 1-2 words each. Prices in USD cents (integer).`;

  const userPrompt = `Write a marketplace listing for this asset:

Description: ${input.assetDescription}
${input.category ? `Category: ${input.category}` : ""}
${input.fileFormats?.length ? `File formats: ${input.fileFormats.join(", ")}` : ""}
${input.suggestedPriceCents ? `Creator's price hint: $${(input.suggestedPriceCents / 100).toFixed(2)}` : ""}

Return a JSON object with exactly these fields:
{
  "title": "primary title (under 60 chars)",
  "titleAlternatives": ["alt 1", "alt 2", "alt 3"],
  "shortPitch": "under 200 chars, no line breaks",
  "description": "2-3 paragraphs, plain text, no markdown",
  "tags": ["tag-1", "tag-2", "tag-3", "tag-4", "tag-5", "tag-6", "tag-7", "tag-8"],
  "suggestedPriceCents": integer_in_cents,
  "suggestedPriceRationale": "1-2 sentences explaining the price",
  "seoKeywords": ["keyword-1", "keyword-2", "keyword-3", "keyword-4", "keyword-5"],
  "socialCaption": "under 280 chars, suitable for X/Twitter"
}`;

  const startedAt = Date.now();
  let result: { text: string; record: GenerationRecord };
  try {
    result = await generate(systemPrompt, userPrompt, {
      temperature: 0.6,
      maxOutputTokens: 1500,
      jsonMode: true,
    });
  } catch (e) {
    const msg = (e as Error).message;
    await recordAIGeneration({
      creatorId,
      kind: "listing_copywriter",
      inputJson: input,
      outputJson: null,
      record: { modelName: "gemini-2.5-flash", tokensIn: 0, tokensOut: 0, costUsd: 0 },
      durationMs: Date.now() - startedAt,
      errorMessage: msg,
    });
    throw e;
  }

  let parsed: ListingCopywriterOutput;
  try {
    parsed = JSON.parse(result.text) as ListingCopywriterOutput;
  } catch {
    await recordAIGeneration({
      creatorId,
      kind: "listing_copywriter",
      inputJson: input,
      outputJson: { raw: result.text.slice(0, 1000) },
      record: result.record,
      durationMs: Date.now() - startedAt,
      errorMessage: "Gemini returned non-JSON output",
    });
    throw new Error("Listing copywriter returned malformed output. Try again.");
  }

  // Sanity: clamp tag count, ensure shortPitch is short
  parsed.tags = (parsed.tags ?? []).slice(0, 12).map((t) => String(t).toLowerCase().trim());
  parsed.titleAlternatives = (parsed.titleAlternatives ?? []).slice(0, 3);
  if ((parsed.title?.length ?? 0) > 80) parsed.title = parsed.title.slice(0, 77) + "...";

  await recordAIGeneration({
    creatorId,
    kind: "listing_copywriter",
    inputJson: input,
    outputJson: parsed,
    record: result.record,
    durationMs: Date.now() - startedAt,
  });

  return parsed;
}

export interface AssetCritiqueInput {
  /** Public URL of the image to critique (already uploaded to R2). */
  imageUrl: string;
  /** What the asset is (e.g. "icon set", "wedding invitation", "3D model"). */
  assetKind: string;
  /** Optional creator question. */
  question?: string;
}

export interface AssetCritiqueOutput {
  overall: "ship-it" | "needs-work" | "major-revisions";
  summary: string; // 2-3 sentences
  strengths: string[];
  issues: Array<{
    severity: "minor" | "major" | "blocker";
    description: string;
    fix: string; // concrete suggestion
  }>;
  composition: {
    balance: number; // 0-10
    contrast: number;
    typography: number;
    colorHarmony: number;
  };
  recommendations: string[];
}

/**
 * Asset critique. Sends the image to Gemini Vision and asks for a
 * structured critique. Scores composition 0-10 across 4 axes.
 */
export async function runAssetCritique(
  creatorId: string,
  input: AssetCritiqueInput
): Promise<AssetCritiqueOutput> {
  const systemPrompt = `You are a senior visual designer reviewing assets for Elixio, a digital-assets marketplace. Be direct, specific, and actionable. Avoid generic praise. Always tie critiques back to concrete things visible in the image. Output must be JSON.`;

  const userPrompt = `Review this ${input.assetKind}.

${input.question ? `Creator asks: ${input.question}` : "Critique composition, typography, color, and overall readiness for sale."}

Return JSON with:
{
  "overall": "ship-it" | "needs-work" | "major-revisions",
  "summary": "2-3 sentence overall verdict",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "issues": [
    {
      "severity": "minor" | "major" | "blocker",
      "description": "what is wrong",
      "fix": "what to do about it"
    }
  ],
  "composition": {
    "balance": 0-10,
    "contrast": 0-10,
    "typography": 0-10,
    "colorHarmony": 0-10
  },
  "recommendations": ["rec 1", "rec 2", "rec 3", "rec 4"]
}`;

  const startedAt = Date.now();
  let result: { text: string; record: GenerationRecord };
  try {
    // Multimodal image critique. Bypasses the SDK for the same reason
    // as `generate()` in lib/gemini.ts — the SDK sends wrong field
    // names + wrong API version. Raw fetch with snake_case wire format.
    const { env } = await import("../config/env.js");
    if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: userPrompt },
              {
                file_data: {
                  mime_type: "image/jpeg",
                  file_uri: input.imageUrl,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2000,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Gemini ${res.status} ${res.statusText}: ${errBody.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
      };
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    result = {
      text,
      record: {
        modelName: "gemini-2.5-flash",
        tokensIn: data.usageMetadata?.promptTokenCount ?? 0,
        tokensOut: data.usageMetadata?.candidatesTokenCount ?? 0,
        costUsd: 0,
      },
    };
  } catch (e) {
    const msg = (e as Error).message;
    await recordAIGeneration({
      creatorId,
      kind: "asset_critique",
      inputJson: input,
      outputJson: null,
      record: { modelName: "gemini-2.5-flash", tokensIn: 0, tokensOut: 0, costUsd: 0 },
      durationMs: Date.now() - startedAt,
      errorMessage: msg,
    });
    throw e;
  }

  let parsed: AssetCritiqueOutput;
  try {
    parsed = JSON.parse(result.text) as AssetCritiqueOutput;
  } catch {
    await recordAIGeneration({
      creatorId,
      kind: "asset_critique",
      inputJson: input,
      outputJson: { raw: result.text.slice(0, 1000) },
      record: result.record,
      durationMs: Date.now() - startedAt,
      errorMessage: "Gemini returned non-JSON output",
    });
    throw new Error("Asset critique returned malformed output. Try again.");
  }

  await recordAIGeneration({
    creatorId,
    kind: "asset_critique",
    inputJson: input,
    outputJson: parsed,
    record: result.record,
    durationMs: Date.now() - startedAt,
  });

  return parsed;
}

export interface SalesCoachInput {
  /** Overview rollup from analytics.getCreatorOverview. */
  overview: unknown;
  /** Per-asset drilldown for top 5 assets. */
  topAssetsDetail: unknown[];
}

export interface SalesCoachOutput {
  headline: string; // one-line summary
  insights: Array<{
    type: "opportunity" | "warning" | "info";
    title: string;
    body: string;
    /** Suggested action the creator can take. */
    action?: string;
  }>;
  /** Specific price-change suggestions per asset. */
  pricingSuggestions: Array<{
    assetId: string;
    assetTitle: string;
    currentPriceCents: number;
    suggestedPriceCents: number;
    rationale: string;
  }>;
  /** Optimal posting time suggestion. */
  postingTips: string[];
}

/**
 * Sales coach. Reads the creator's own analytics and returns
 * actionable suggestions. Hard rule: NO data leaks to other creators —
 * everything is scoped to request.user.userId at the call site.
 */
export async function runSalesCoach(
  creatorId: string,
  input: SalesCoachInput
): Promise<SalesCoachOutput> {
  const systemPrompt = `You are a marketplace growth advisor for Elixio creators. You read analytics data and produce specific, actionable suggestions. You never give generic advice. Every recommendation must reference a concrete number from the data. You output JSON only.`;

  const userPrompt = `Here is the creator's analytics summary for the current period:

${JSON.stringify(input.overview, null, 2)}

Top 5 assets (with detail):
${JSON.stringify(input.topAssetsDetail, null, 2)}

Return JSON with:
{
  "headline": "one-sentence summary of where the creator is right now",
  "insights": [
    {
      "type": "opportunity" | "warning" | "info",
      "title": "short title",
      "body": "2-3 sentences explaining the pattern",
      "action": "concrete next step"
    }
  ],
  "pricingSuggestions": [
    {
      "assetId": "id from data",
      "assetTitle": "title from data",
      "currentPriceCents": 0,
      "suggestedPriceCents": 0,
      "rationale": "why"
    }
  ],
  "postingTips": ["tip 1", "tip 2"]
}

Keep insights to 5 or fewer. Keep pricing suggestions to 3 or fewer.`;

  const startedAt = Date.now();
  let result: { text: string; record: GenerationRecord };
  try {
    result = await generate(systemPrompt, userPrompt, {
      temperature: 0.5,
      maxOutputTokens: 2500,
      jsonMode: true,
      model: "gemini-2.5-flash", // structured analysis — flash tier is enough
    });
  } catch (e) {
    const msg = (e as Error).message;
    await recordAIGeneration({
      creatorId,
      kind: "sales_coach",
      inputJson: input,
      outputJson: null,
      record: { modelName: "gemini-2.5-flash", tokensIn: 0, tokensOut: 0, costUsd: 0 },
      durationMs: Date.now() - startedAt,
      errorMessage: msg,
    });
    throw e;
  }

  let parsed: SalesCoachOutput;
  try {
    parsed = JSON.parse(result.text) as SalesCoachOutput;
  } catch {
    await recordAIGeneration({
      creatorId,
      kind: "sales_coach",
      inputJson: input,
      outputJson: { raw: result.text.slice(0, 1000) },
      record: result.record,
      durationMs: Date.now() - startedAt,
      errorMessage: "Gemini returned non-JSON output",
    });
    throw new Error("Sales coach returned malformed output. Try again.");
  }

  // Cap the lists
  parsed.insights = (parsed.insights ?? []).slice(0, 5);
  parsed.pricingSuggestions = (parsed.pricingSuggestions ?? []).slice(0, 3);

  await recordAIGeneration({
    creatorId,
    kind: "sales_coach",
    inputJson: input,
    outputJson: parsed,
    record: result.record,
    durationMs: Date.now() - startedAt,
  });

  return parsed;
}