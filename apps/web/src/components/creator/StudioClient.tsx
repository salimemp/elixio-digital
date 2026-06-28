"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/auth";
import {
  runListingCopywriter,
  runAssetCritique,
  getSalesCoach,
  type ListingCopywriterOutput,
  type AssetCritiqueOutput,
  type SalesCoachOutput,
} from "@/lib/creator-ai";

/**
 * /studio — three-pane AI workspace:
 *   1. Listing copywriter — paste an asset description, get back a full listing
 *   2. Asset critique — paste an image URL, get back composition feedback
 *   3. Sales coach — auto-generated from your analytics (no input needed)
 */
export function StudioClient() {
  const [tab, setTab] = useState<"copywriter" | "critique" | "coach">("copywriter");
  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-full border-2 border-gum-black bg-gum-cream p-1">
        {[
          { id: "copywriter", label: "Listing copywriter" },
          { id: "critique", label: "Asset critique" },
          { id: "coach", label: "Sales coach" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-bold transition ${
              tab === t.id
                ? "bg-gum-black text-white"
                : "ink-default hover:bg-gum-cream"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "copywriter" && <CopywriterPanel />}
      {tab === "critique" && <CritiquePanel />}
      {tab === "coach" && <SalesCoachPanel />}
    </div>
  );
}

function CopywriterPanel() {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [fileFormats, setFileFormats] = useState("");
  const [out, setOut] = useState<ListingCopywriterOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const tok = getAccessToken();
    if (!tok) {
      setError("Sign in first");
      return;
    }
    if (description.length < 20) {
      setError("Description must be at least 20 characters");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formats = fileFormats
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const result = await runListingCopywriter(
        { assetDescription: description, category: category || undefined, fileFormats: formats.length ? formats : undefined },
        tok
      );
      setOut(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(value: string) {
    navigator.clipboard?.writeText(value);
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="gum-card">
        <h2 className="mb-3 text-lg font-bold">Describe your asset</h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Minimalist wedding invitation template pack with 5 designs, A5 size, editable in Canva and Photoshop"
          rows={5}
          className="w-full rounded-2xl border-2 border-gum-black bg-gum-cream p-3 text-sm"
        />
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (optional)"
            className="rounded-2xl border-2 border-gum-black bg-gum-cream p-2 text-sm"
          />
          <input
            value={fileFormats}
            onChange={(e) => setFileFormats(e.target.value)}
            placeholder="Formats: PSD, AI, PDF"
            className="rounded-2xl border-2 border-gum-black bg-gum-cream p-2 text-sm"
          />
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="gum-btn-primary mt-3 w-full disabled:opacity-50"
        >
          {loading ? "Writing…" : "Generate listing"}
        </button>
        {error && (
          <p className="mt-3 rounded-2xl border-2 border-red-500 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      {out && (
        <div className="gum-card space-y-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-2xl font-extrabold">{out.title}</h3>
              <button onClick={() => copyToClipboard(out.title)} className="text-xs underline">
                Copy
              </button>
            </div>
            <div className="mt-1 space-y-1 text-xs ink-muted">
              {out.titleAlternatives.map((t, i) => (
                <div key={i}>
                  Alt {i + 1}: <span className="font-bold">{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold ink-default">Short pitch</p>
            <p className="text-sm">{out.shortPitch}</p>
          </div>

          <div>
            <p className="text-sm font-bold ink-default">Description</p>
            <p className="whitespace-pre-wrap text-sm">{out.description}</p>
          </div>

          <div>
            <p className="text-sm font-bold ink-default">Tags</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {out.tags.map((t) => (
                <span key={t} className="rounded-full bg-gum-yellow px-2 py-1 text-xs font-bold">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold ink-default">Suggested price</p>
            <p className="text-2xl font-extrabold text-gum-purple">
              ${(out.suggestedPriceCents / 100).toFixed(2)}
            </p>
            <p className="text-xs ink-muted">{out.suggestedPriceRationale}</p>
          </div>

          <div>
            <p className="text-sm font-bold ink-default">Social caption</p>
            <p className="text-sm">{out.socialCaption}</p>
          </div>

          <details className="rounded-2xl border-2 border-gum-black bg-gum-cream p-2">
            <summary className="cursor-pointer text-sm font-bold">SEO keywords</summary>
            <p className="mt-2 text-xs">{out.seoKeywords.join(", ")}</p>
          </details>
        </div>
      )}
    </div>
  );
}

function CritiquePanel() {
  const [imageUrl, setImageUrl] = useState("");
  const [assetKind, setAssetKind] = useState("");
  const [question, setQuestion] = useState("");
  const [out, setOut] = useState<AssetCritiqueOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const tok = getAccessToken();
    if (!tok) {
      setError("Sign in first");
      return;
    }
    if (!imageUrl.startsWith("http")) {
      setError("Image URL must be a public https:// URL");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await runAssetCritique(
        { imageUrl, assetKind: assetKind || "digital asset", question: question || undefined },
        tok
      );
      setOut(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="gum-card">
        <h2 className="mb-3 text-lg font-bold">Critique your asset</h2>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Public image URL (https://…)"
          className="w-full rounded-2xl border-2 border-gum-black bg-gum-cream p-2 text-sm"
        />
        <input
          value={assetKind}
          onChange={(e) => setAssetKind(e.target.value)}
          placeholder="Asset kind (e.g. icon set, wedding invitation, 3D model)"
          className="mt-2 w-full rounded-2xl border-2 border-gum-black bg-gum-cream p-2 text-sm"
        />
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Optional specific question for the AI"
          rows={3}
          className="mt-2 w-full rounded-2xl border-2 border-gum-black bg-gum-cream p-2 text-sm"
        />
        <button
          onClick={run}
          disabled={loading}
          className="gum-btn-primary mt-3 w-full disabled:opacity-50"
        >
          {loading ? "Reviewing…" : "Run critique"}
        </button>
        {error && (
          <p className="mt-3 rounded-2xl border-2 border-red-500 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      {out && (
        <div className="gum-card space-y-4">
          <div>
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase ${
                out.overall === "ship-it"
                  ? "bg-green-200 text-green-900"
                  : out.overall === "needs-work"
                  ? "bg-yellow-200 text-yellow-900"
                  : "bg-red-200 text-red-900"
              }`}
            >
              {out.overall.replace("-", " ")}
            </span>
            <p className="mt-2 text-sm">{out.summary}</p>
          </div>

          <div>
            <p className="text-sm font-bold ink-default">Strengths</p>
            <ul className="ml-4 list-disc text-sm">
              {out.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>

          {out.issues.length > 0 && (
            <div>
              <p className="text-sm font-bold ink-default">Issues</p>
              <div className="space-y-2">
                {out.issues.map((iss, i) => (
                  <div key={i} className="rounded-2xl border-2 border-gum-black bg-gum-cream p-2">
                    <span
                      className={`text-xs font-bold uppercase ${
                        iss.severity === "blocker"
                          ? "text-red-700"
                          : iss.severity === "major"
                          ? "text-orange-700"
                          : "ink-muted"
                      }`}
                    >
                      {iss.severity}
                    </span>
                    <p className="text-sm">{iss.description}</p>
                    <p className="mt-1 text-xs ink-default">
                      <span className="font-bold">Fix:</span> {iss.fix}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-bold ink-default">Composition</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(out.composition).map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-gum-cream p-2">
                  <p className="text-xs capitalize ink-muted">{k}</p>
                  <p className="text-lg font-extrabold">{v}/10</p>
                </div>
              ))}
            </div>
          </div>

          {out.recommendations.length > 0 && (
            <div>
              <p className="text-sm font-bold ink-default">Recommendations</p>
              <ul className="ml-4 list-disc text-sm">
                {out.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SalesCoachPanel() {
  const [out, setOut] = useState<SalesCoachOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const tok = getAccessToken();
    if (!tok) {
      setError("Sign in first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await getSalesCoach(tok, "30d");
      setOut(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Sales coach</h2>
        <button onClick={run} disabled={loading} className="gum-btn-secondary text-sm">
          {loading ? "Analyzing…" : "Refresh"}
        </button>
      </div>
      {error && (
        <p className="rounded-2xl border-2 border-red-500 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {out && (
        <>
          <div className="gum-card">
            <p className="text-xl font-extrabold">{out.headline}</p>
          </div>

          {out.insights.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {out.insights.map((ins, i) => (
                <div key={i} className="gum-card">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                      ins.type === "opportunity"
                        ? "bg-green-200 text-green-900"
                        : ins.type === "warning"
                        ? "bg-red-200 text-red-900"
                        : "bg-gum-mint ink-default"
                    }`}
                  >
                    {ins.type}
                  </span>
                  <h3 className="mt-2 text-base font-bold">{ins.title}</h3>
                  <p className="mt-1 text-sm">{ins.body}</p>
                  {ins.action && (
                    <p className="mt-2 rounded-2xl bg-gum-yellow p-2 text-xs font-bold">
                      → {ins.action}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {out.pricingSuggestions.length > 0 && (
            <div className="gum-card">
              <h3 className="mb-2 text-base font-bold">Pricing suggestions</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gum-black text-left">
                    <th className="py-2">Asset</th>
                    <th>Current</th>
                    <th>Suggested</th>
                    <th>Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {out.pricingSuggestions.map((p) => (
                    <tr key={p.assetId} className="border-b border-gum-black/10">
                      <td className="py-2 font-bold">{p.assetTitle}</td>
                      <td>${(p.currentPriceCents / 100).toFixed(2)}</td>
                      <td className="font-extrabold text-gum-purple">
                        ${(p.suggestedPriceCents / 100).toFixed(2)}
                      </td>
                      <td className="text-xs">{p.rationale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {out.postingTips.length > 0 && (
            <div className="gum-card">
              <h3 className="mb-2 text-base font-bold">Posting tips</h3>
              <ul className="ml-4 list-disc text-sm">
                {out.postingTips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}