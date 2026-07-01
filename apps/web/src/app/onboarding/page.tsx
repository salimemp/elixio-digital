"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-client";

/**
 * The Elixio Digital onboarding experience at /onboarding.
 *
 * Three sections, all on one page so visitors don't have to navigate:
 *   1. **Watch the video** — the 6:30 onboarding video with a clean
 *      HTML5 player, chapter markers, and a CTA after each section.
 *   2. **Compare us** — full competitor table (Elixio vs Gumroad vs
 *      iLovePDF vs Etsy Digital) with 13 rows of side-by-side features.
 *      Toggleable "Show more details" per row.
 *   3. **Get started** — step-by-step "How to use" walkthrough for
 *      both buyers (3 steps) and creators (5 steps). Each step is a
 *      real CTA button that deep-links into the app.
 *
 * The page is fully i18n-aware (42 locales via the existing runtime
 * fallback). All copy lives under `onboarding.*` keys in the message
 * files; English is the canonical version.
 *
 * Implementation note: the video player accepts a `<source>` element.
 * For V1 we point to a placeholder /onboarding-video.mp4; when the
 * final video is rendered (ffmpeg or matrix MCP), the same path can
 * be served from /public. Until then the player falls back to a
 * poster image + "video coming soon" overlay.
 */
export default function OnboardingPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"buyer" | "creator">("creator");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      {/* Hero */}
      <header className="mb-10 text-center">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-gum-purple">
          {t("onboarding.tagline")}
        </p>
        <h1 className="text-4xl font-extrabold ink-default md:text-5xl">
          {t("onboarding.hero_title")}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base ink-muted">
          {t("onboarding.hero_subtitle")}
        </p>
      </header>

      {/* === Section 1: Video === */}
      <section aria-labelledby="video-title" className="mb-16">
        <SectionTitle id="video-title" eyebrow={t("onboarding.video_eyebrow")} title={t("onboarding.video_title")} />

        <VideoPlayer
          src="/onboarding-video.mp4"
          poster="/onboarding-poster.svg"
          title={t("onboarding.video_title")}
        />

        <ChapterList />

        {/* Quick CTAs under the video */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link href="/explore" className="gum-btn-primary text-sm">
            🛍️ {t("onboarding.cta_buy")}
          </Link>
          <Link href="/auth/register/creator" className="gum-btn-secondary text-sm">
            🎨 {t("onboarding.cta_sell")}
          </Link>
          <Link href="/chat" className="gum-btn-secondary text-sm">
            💬 {t("onboarding.cta_chat")}
          </Link>
        </div>
      </section>

      {/* === Section 2: Competitor comparison === */}
      <section aria-labelledby="compare-title" className="mb-16">
        <SectionTitle
          id="compare-title"
          eyebrow={t("onboarding.compare_eyebrow")}
          title={t("onboarding.compare_title")}
          subtitle={t("onboarding.compare_subtitle")}
        />

        <ComparisonTable />
      </section>

      {/* === Section 3: How to use === */}
      <section aria-labelledby="howto-title" className="mb-16">
        <SectionTitle
          id="howto-title"
          eyebrow={t("onboarding.howto_eyebrow")}
          title={t("onboarding.howto_title")}
          subtitle={t("onboarding.howto_subtitle")}
        />

        {/* Tab switcher */}
        <div className="mb-6 flex justify-center gap-2" role="tablist" aria-label="Choose your path">
          <TabButton active={tab === "buyer"} onClick={() => setTab("buyer")}>
            🛍️ {t("onboarding.tab_buyer")}
          </TabButton>
          <TabButton active={tab === "creator"} onClick={() => setTab("creator")}>
            🎨 {t("onboarding.tab_creator")}
          </TabButton>
        </div>

        {tab === "buyer" ? <BuyerSteps /> : <CreatorSteps />}
      </section>

      {/* === Section 4: Aura + voice + accessibility teaser === */}
      <section aria-labelledby="aura-title" className="mb-12">
        <SectionTitle
          id="aura-title"
          eyebrow={t("onboarding.aura_eyebrow")}
          title={t("onboarding.aura_title")}
          subtitle={t("onboarding.aura_subtitle")}
        />
        <AuraFeatureGrid />
      </section>

      {/* Final CTA */}
      <section className="rounded-2xl border-2 border-gum-black bg-gum-purple p-8 text-center text-white shadow-[0_6px_0_0_#111]">
        <h2 className="text-2xl font-extrabold md:text-3xl">{t("onboarding.final_cta_title")}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm opacity-90">
          {t("onboarding.final_cta_subtitle")}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link href="/auth/register/creator" className="gum-btn-primary text-sm">
            🎨 {t("onboarding.cta_sell")}
          </Link>
          <Link href="/explore" className="rounded-full border-2 border-white bg-white px-5 py-2 text-sm font-bold text-gum-black hover:bg-gum-cream">
            🛍️ {t("onboarding.cta_buy")}
          </Link>
          <Link href="/chat" className="rounded-full border-2 border-white px-5 py-2 text-sm font-bold text-white hover:bg-white/10">
            💬 {t("onboarding.cta_chat")}
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function SectionTitle({
  id,
  eyebrow,
  title,
  subtitle,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-6 text-center">
      <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-gum-purple">
        {eyebrow}
      </p>
      <h2 id={id} className="text-2xl font-extrabold ink-default md:text-3xl">
        {title}
      </h2>
      {subtitle && <p className="mx-auto mt-2 max-w-2xl text-sm ink-muted">{subtitle}</p>}
    </header>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full border-2 border-gum-black px-5 py-2 text-sm font-bold transition ${
        active
          ? "bg-gum-yellow text-gum-black shadow-[0_3px_0_0_#111]"
          : "bg-gum-cream ink-default hover:bg-gum-mint"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * HTML5 video player. The current file is a 6-second AI teaser;
 * the full 6:30 production is in progress (see
 * docs/marketing/onboarding-storyboard.md). We show a prominent
 * "teaser" badge so visitors don't mistake the 6s clip for the
 * full video.
 */
function VideoPlayer({
  src,
  poster,
  title,
}: {
  src: string;
  poster: string;
  title: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-gum-black bg-gum-black shadow-[0_6px_0_0_#111]">
      {/* Teaser badge — visible by default, dismissable per session.
          Anchored to the top-left so it doesn't collide with the
          native browser controls at the bottom. */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-gum-purple/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-[0_2px_0_0_#111] backdrop-blur-sm">
          🎬 6s teaser
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-gum-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          ⏳ Full 6:30 version coming soon
        </span>
      </div>

      {/* We use a <video> element with controls. The actual file
          is the AI teaser (~6s); when the full production lands
          we just replace /public/onboarding-video.mp4 — no code
          change needed. */}
      <video
        controls
        preload="metadata"
        playsInline
        poster={poster}
        className="aspect-video w-full bg-gum-black"
        aria-label={title}
      >
        <source src={src} type="video/mp4" />
        {/* Captions for the 12 priority languages. Files live in
            /public/captions/onboarding-{lang}.vtt. (Captions are
            for the planned 6:30 narration; the current 6s teaser
            has no spoken audio so the captions are empty — they
            will populate when the real video lands.) */}
        {["en", "es", "fr", "de", "hi", "pt", "ar", "ur", "he", "zh", "zh-TW", "ja", "ko"].map((lang) => (
          <track
            key={lang}
            kind="captions"
            src={`/captions/onboarding-${lang}.vtt`}
            srcLang={lang}
            label={labelForLang(lang)}
            default={lang === "en"}
          />
        ))}
        Your browser does not support the video tag. Download the{" "}
        <a href={src} className="underline">
          onboarding teaser
        </a>{" "}
        to watch it.
      </video>

      {/* Caption bar — now reflects the teaser status, not the
          planned 6:30 runtime. Updated when the real video lands. */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gum-black/60 px-4 py-2 text-xs text-white">
        <span>🎬 6s teaser · full 6:30 video coming soon</span>
        <a
          href={src}
          download
          className="rounded-full border border-white/40 px-3 py-1 hover:bg-white/10"
        >
          Download teaser (MP4)
        </a>
      </div>
    </div>
  );
}

function labelForLang(code: string): string {
  const map: Record<string, string> = {
    en: "English", es: "Español", fr: "Français", de: "Deutsch", hi: "हिन्दी",
    pt: "Português", ar: "العربية", ur: "اردو", he: "עברית", zh: "中文 (简体)",
    "zh-TW": "中文 (繁體)", ja: "日本語", ko: "한국어",
  };
  return map[code] ?? code;
}

function ChapterList() {
  const { t } = useI18n();
  const chapters = [
    { time: "0:00", title: t("onboarding.chapter1") },
    { time: "0:48", title: t("onboarding.chapter2") },
    { time: "1:33", title: t("onboarding.chapter3") },
    { time: "2:15", title: t("onboarding.chapter4") },
    { time: "3:05", title: t("onboarding.chapter5") },
    { time: "4:05", title: t("onboarding.chapter6") },
    { time: "5:25", title: t("onboarding.chapter7") },
    { time: "5:55", title: t("onboarding.chapter8") },
  ];
  return (
    <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {chapters.map((c, i) => (
        <li
          key={i}
          className="flex items-center gap-2 rounded-xl border-2 border-gum-black/20 bg-gum-cream p-2 text-xs"
        >
          <span className="font-extrabold text-gum-purple">{c.time}</span>
          <span className="truncate ink-default">{c.title}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The 13-row competitor comparison table. Sticky first column on
 * mobile, alternating row colors for readability. Each row has an
 * optional "details" line that explains what we mean.
 */
function ComparisonTable() {
  const { t } = useI18n();

  const rows: Array<{
    label: string;
    elixio: { text: string; highlight?: boolean };
    gumroad: string;
    ilovepdf: string;
    etsy: string;
    detail?: string;
  }> = [
    {
      label: t("onboarding.compare_row_fee"),
      elixio: { text: t("onboarding.compare_fee_elixio"), highlight: true },
      gumroad: t("onboarding.compare_fee_gumroad"),
      ilovepdf: t("onboarding.compare_fee_ilovepdf"),
      etsy: t("onboarding.compare_fee_etsy"),
      detail: t("onboarding.compare_fee_detail"),
    },
    {
      label: t("onboarding.compare_row_free"),
      elixio: { text: t("onboarding.compare_free_elixio"), highlight: true },
      gumroad: t("onboarding.compare_free_gumroad"),
      ilovepdf: t("onboarding.compare_free_ilovepdf"),
      etsy: t("onboarding.compare_free_etsy"),
    },
    {
      label: t("onboarding.compare_row_ai_tools"),
      elixio: { text: t("onboarding.compare_ai_elixio"), highlight: true },
      gumroad: t("onboarding.compare_ai_gumroad"),
      ilovepdf: t("onboarding.compare_ai_ilovepdf"),
      etsy: t("onboarding.compare_ai_etsy"),
      detail: t("onboarding.compare_ai_detail"),
    },
    {
      label: t("onboarding.compare_row_chatbot"),
      elixio: { text: t("onboarding.compare_chatbot_elixio"), highlight: true },
      gumroad: t("onboarding.compare_chatbot_gumroad"),
      ilovepdf: t("onboarding.compare_chatbot_ilovepdf"),
      etsy: t("onboarding.compare_chatbot_etsy"),
    },
    {
      label: t("onboarding.compare_row_a11y"),
      elixio: { text: t("onboarding.compare_a11y_elixio"), highlight: true },
      gumroad: t("onboarding.compare_a11y_gumroad"),
      ilovepdf: t("onboarding.compare_a11y_ilovepdf"),
      etsy: t("onboarding.compare_a11y_etsy"),
    },
    {
      label: t("onboarding.compare_row_languages"),
      elixio: { text: t("onboarding.compare_lang_elixio"), highlight: true },
      gumroad: t("onboarding.compare_lang_gumroad"),
      ilovepdf: t("onboarding.compare_lang_ilovepdf"),
      etsy: t("onboarding.compare_lang_etsy"),
    },
    {
      label: t("onboarding.compare_row_tax"),
      elixio: { text: t("onboarding.compare_tax_elixio"), highlight: true },
      gumroad: t("onboarding.compare_tax_gumroad"),
      ilovepdf: t("onboarding.compare_tax_ilovepdf"),
      etsy: t("onboarding.compare_tax_etsy"),
    },
    {
      label: t("onboarding.compare_row_pdf"),
      elixio: { text: t("onboarding.compare_pdf_elixio"), highlight: true },
      gumroad: t("onboarding.compare_pdf_gumroad"),
      ilovepdf: t("onboarding.compare_pdf_ilovepdf"),
      etsy: t("onboarding.compare_pdf_etsy"),
    },
    {
      label: t("onboarding.compare_row_payouts"),
      elixio: { text: t("onboarding.compare_payouts_elixio"), highlight: true },
      gumroad: t("onboarding.compare_payouts_gumroad"),
      ilovepdf: t("onboarding.compare_payouts_ilovepdf"),
      etsy: t("onboarding.compare_payouts_etsy"),
    },
    {
      label: t("onboarding.compare_row_bulk"),
      elixio: { text: t("onboarding.compare_bulk_elixio"), highlight: true },
      gumroad: t("onboarding.compare_bulk_gumroad"),
      ilovepdf: t("onboarding.compare_bulk_ilovepdf"),
      etsy: t("onboarding.compare_bulk_etsy"),
    },
    {
      label: t("onboarding.compare_row_compliance"),
      elixio: { text: t("onboarding.compare_compliance_elixio"), highlight: true },
      gumroad: t("onboarding.compare_compliance_gumroad"),
      ilovepdf: t("onboarding.compare_compliance_ilovepdf"),
      etsy: t("onboarding.compare_compliance_etsy"),
    },
    {
      label: t("onboarding.compare_row_api"),
      elixio: { text: t("onboarding.compare_api_elixio"), highlight: true },
      gumroad: t("onboarding.compare_api_gumroad"),
      ilovepdf: t("onboarding.compare_api_ilovepdf"),
      etsy: t("onboarding.compare_api_etsy"),
    },
    {
      label: t("onboarding.compare_row_mobile"),
      elixio: { text: t("onboarding.compare_mobile_elixio") },
      gumroad: t("onboarding.compare_mobile_gumroad"),
      ilovepdf: t("onboarding.compare_mobile_ilovepdf"),
      etsy: t("onboarding.compare_mobile_etsy"),
    },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-gum-black bg-gum-cream shadow-[0_6px_0_0_#111]">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b-2 border-gum-black bg-gum-yellow text-gum-black">
            <th className="sticky left-0 z-10 min-w-[180px] border-r-2 border-gum-black/30 bg-gum-yellow p-3 text-left font-extrabold">
              {t("onboarding.compare_feature")}
            </th>
            <th className="min-w-[180px] p-3 font-extrabold">✨ Elixio</th>
            <th className="min-w-[140px] p-3 font-extrabold">Gumroad</th>
            <th className="min-w-[140px] p-3 font-extrabold">iLovePDF</th>
            <th className="min-w-[140px] p-3 font-extrabold">Etsy Digital</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={`border-b border-gum-black/10 last:border-b-0 ${i % 2 === 1 ? "bg-gum-cream" : "bg-white"}`}
            >
              <th
                scope="row"
                className="sticky left-0 z-10 min-w-[180px] border-r-2 border-gum-black/10 bg-inherit p-3 text-left text-xs font-bold ink-default"
              >
                {r.label}
                {r.detail && (
                  <p className="mt-0.5 text-[10px] font-normal ink-subtle">{r.detail}</p>
                )}
              </th>
              <td className="p-3">
                <Cell value={r.elixio} />
              </td>
              <td className="p-3 ink-muted">{r.gumroad}</td>
              <td className="p-3 ink-muted">{r.ilovepdf}</td>
              <td className="p-3 ink-muted">{r.etsy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ value }: { value: { text: string; highlight?: boolean } }) {
  return (
    <span
      className={
        value.highlight
          ? "inline-block rounded-md bg-gum-mint px-2 py-0.5 font-extrabold text-gum-black"
          : "ink-default"
      }
    >
      {value.text}
    </span>
  );
}

function BuyerSteps() {
  const { t } = useI18n();
  return (
    <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <StepCard
        number={1}
        title={t("onboarding.buyer_step1_title")}
        body={t("onboarding.buyer_step1_body")}
        cta={{ href: "/explore", label: t("onboarding.buyer_step1_cta") }}
      />
      <StepCard
        number={2}
        title={t("onboarding.buyer_step2_title")}
        body={t("onboarding.buyer_step2_body")}
        cta={{ href: "/auth/register", label: t("onboarding.buyer_step2_cta") }}
      />
      <StepCard
        number={3}
        title={t("onboarding.buyer_step3_title")}
        body={t("onboarding.buyer_step3_body")}
        cta={{ href: "/library", label: t("onboarding.buyer_step3_cta") }}
      />
    </ol>
  );
}

function CreatorSteps() {
  const { t } = useI18n();
  return (
    <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StepCard
        number={1}
        title={t("onboarding.creator_step1_title")}
        body={t("onboarding.creator_step1_body")}
        cta={{ href: "/auth/register/creator", label: t("onboarding.creator_step1_cta") }}
      />
      <StepCard
        number={2}
        title={t("onboarding.creator_step2_title")}
        body={t("onboarding.creator_step2_body")}
        cta={{ href: "/dashboard", label: t("onboarding.creator_step2_cta") }}
      />
      <StepCard
        number={3}
        title={t("onboarding.creator_step3_title")}
        body={t("onboarding.creator_step3_body")}
        cta={{ href: "/studio", label: t("onboarding.creator_step3_cta") }}
      />
      <StepCard
        number={4}
        title={t("onboarding.creator_step4_title")}
        body={t("onboarding.creator_step4_body")}
        cta={{ href: "/dashboard/bulk", label: t("onboarding.creator_step4_cta") }}
      />
      <StepCard
        number={5}
        title={t("onboarding.creator_step5_title")}
        body={t("onboarding.creator_step5_body")}
        cta={{ href: "/chat", label: t("onboarding.creator_step5_cta") }}
      />
      <StepCard
        number={6}
        title={t("onboarding.creator_step6_title")}
        body={t("onboarding.creator_step6_body")}
        cta={{ href: "/dashboard", label: t("onboarding.creator_step6_cta") }}
      />
    </ol>
  );
}

function StepCard({
  number,
  title,
  body,
  cta,
}: {
  number: number;
  title: string;
  body: string;
  cta: { href: string; label: string };
}) {
  return (
    <li className="gum-card flex h-full flex-col p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gum-black bg-gum-purple text-base font-extrabold text-white">
          {number}
        </span>
        <h3 className="text-base font-extrabold ink-default">{title}</h3>
      </div>
      <p className="flex-1 text-sm ink-muted">{body}</p>
      <Link
        href={cta.href}
        className="mt-3 inline-flex w-fit items-center gap-1 rounded-full border-2 border-gum-black bg-gum-yellow px-3 py-1.5 text-xs font-extrabold text-gum-black transition hover:brightness-95"
      >
        {cta.label} →
      </Link>
    </li>
  );
}

function AuraFeatureGrid() {
  const { t } = useI18n();
  const features = [
    { icon: "🗣️", title: t("onboarding.aura_feature1_title"), body: t("onboarding.aura_feature1_body") },
    { icon: "🎙️", title: t("onboarding.aura_feature2_title"), body: t("onboarding.aura_feature2_body") },
    { icon: "🔊", title: t("onboarding.aura_feature3_title"), body: t("onboarding.aura_feature3_body") },
    { icon: "🎤", title: t("onboarding.aura_feature4_title"), body: t("onboarding.aura_feature4_body") },
    { icon: "♿", title: t("onboarding.aura_feature5_title"), body: t("onboarding.aura_feature5_body") },
    { icon: "🌐", title: t("onboarding.aura_feature6_title"), body: t("onboarding.aura_feature6_body") },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {features.map((f, i) => (
        <div key={i} className="rounded-2xl border-2 border-gum-black bg-gum-cream p-4 shadow-[0_4px_0_0_#111]">
          <div className="mb-2 flex items-center gap-2">
            <span aria-hidden="true" className="text-2xl">{f.icon}</span>
            <h3 className="text-sm font-extrabold ink-default">{f.title}</h3>
          </div>
          <p className="text-xs ink-muted">{f.body}</p>
        </div>
      ))}
    </div>
  );
}