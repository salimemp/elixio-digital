"use client";

/**
 * Floating accessibility toolbar. Sits at the bottom-left of the screen
 * (the chat widget is bottom-right, so we don't overlap). Exposes:
 *
 *   - Read aloud (TTS) — reads main content, or current selection
 *   - Stop / pause
 *   - Font size adjustment (75% / 100% / 112.5% / 125% / 150%)
 *   - High contrast toggle
 *   - Reduced motion (system pref only — we don't override)
 *   - Speak input (STT) — opens a dictation overlay
 *
 * The toolbar is keyboard-accessible (Tab + Enter) and uses
 * `aria-expanded` / `aria-controls` for the disclosure pattern. Each
 * control is a real `<button>` with an `aria-label` and visible focus
 * ring.
 */

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n-client";
import { useA11yPrefs, useAnnouncer, type FontScale } from "@/lib/a11y";
import { useTts } from "@/lib/tts";
import { useStt } from "@/lib/stt";

export function A11yToolbar() {
  const { t, locale } = useI18n();
  const { prefs, setPref, reset } = useA11yPrefs();
  const { announce } = useAnnouncer();
  const tts = useTts();
  const stt = useStt();
  const [sttOpen, setSttOpen] = useState(false);
  const [sttText, setSttText] = useState("");

  const onReadMain = useCallback(() => {
    tts.readSelector("main, [role=main]");
    announce(t("a11y.tts_started"));
  }, [tts, announce, t]);

  const onReadSelection = useCallback(() => {
    tts.readSelection();
    announce(t("a11y.tts_started"));
  }, [tts, announce, t]);

  const onStop = useCallback(() => {
    tts.stop();
    stt.abort();
    setSttOpen(false);
    announce(t("a11y.tts_stopped"));
  }, [tts, stt, announce, t]);

  const onFontStep = useCallback(
    (direction: 1 | -1) => {
      const scales: FontScale[] = [0.875, 1, 1.125, 1.25, 1.5];
      const idx = scales.indexOf(prefs.fontScale);
      const next = scales[Math.max(0, Math.min(scales.length - 1, idx + direction))];
      if (next !== undefined && next !== prefs.fontScale) {
        setPref("fontScale", next);
        announce(t("a11y.font_size_changed", { value: `${Math.round(next * 100)}%` }));
      }
    },
    [prefs.fontScale, setPref, announce, t],
  );

  const onContrast = useCallback(() => {
    const next = prefs.contrast === "more" ? "normal" : "more";
    setPref("contrast", next);
    announce(next === "more" ? t("a11y.contrast_on") : t("a11y.contrast_off"));
  }, [prefs.contrast, setPref, announce, t]);

  const onReset = useCallback(() => {
    reset();
    announce(t("a11y.prefs_reset"));
  }, [reset, announce, t]);

  // Push the STT transcript into a textarea.
  useEffect(() => {
    if (stt.listening || stt.transcript) {
      setSttText(stt.transcript);
    }
  }, [stt.transcript, stt.listening]);

  // Pick a TTS voice matching the current locale.
  useEffect(() => {
    // The hook itself auto-selects. This effect is for future use
    // (e.g. exposing a voice picker).
  }, [locale]);

  const ttsActive = tts.state === "speaking" || tts.state === "paused";

  return (
    <div
      role="region"
      aria-label={t("a11y.toolbar_label")}
      className="fixed bottom-4 left-4 z-40 flex flex-col items-end gap-2 print:hidden"
    >
      {/* Dictation panel */}
      {sttOpen && (
        <div
          className="gum-card w-80 max-w-[calc(100vw-2rem)] p-3"
          role="dialog"
          aria-labelledby="stt-panel-title"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 id="stt-panel-title" className="text-sm font-extrabold ink-default">
              {t("a11y.dictation_title")}
            </h3>
            <button
              type="button"
              onClick={onStop}
              className="rounded-lg p-1 text-xs ink-muted hover:bg-gum-mint"
              aria-label={t("a11y.close")}
            >
              ✕
            </button>
          </div>

          {stt.state === "unsupported" ? (
            <p className="text-xs text-red-700">
              {t("a11y.stt_unsupported")}
            </p>
          ) : stt.state === "denied" ? (
            <p className="text-xs text-red-700">{stt.error}</p>
          ) : (
            <>
              <textarea
                value={sttText}
                onChange={(e) => setSttText(e.target.value)}
                rows={4}
                aria-label={t("a11y.dictation_textarea")}
                className="w-full rounded-lg border-2 border-gum-black bg-gum-cream p-2 text-sm ink-default"
                placeholder={t("a11y.dictation_placeholder")}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {stt.listening ? (
                  <button
                    type="button"
                    onClick={() => stt.stop()}
                    className="rounded-lg border-2 border-red-600 bg-red-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    ⏹ {t("a11y.stop_dictation")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => stt.start({ lang: locale, continuous: true })}
                    disabled={!stt.supported}
                    className="rounded-lg border-2 border-gum-black bg-gum-purple px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    🎤 {t("a11y.start_dictation")}
                  </button>
                )}
                <span
                  className={`text-xs ${stt.listening ? "text-red-700" : "ink-muted"}`}
                  aria-live="polite"
                >
                  {stt.listening ? t("a11y.listening") : ""}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main toolbar */}
      <div className="flex flex-wrap items-center gap-1 rounded-2xl border-2 border-gum-black bg-gum-cream p-1 shadow-[0_3px_0_0_#111]">
        {/* TTS group */}
        <ToolbarGroup>
          {!ttsActive ? (
            <>
              <ToolbarButton
                onClick={onReadMain}
                label={t("a11y.read_main")}
                disabled={tts.state === "unavailable"}
              >
                🔊
              </ToolbarButton>
              <ToolbarButton
                onClick={onReadSelection}
                label={t("a11y.read_selection")}
                disabled={tts.state === "unavailable"}
              >
                📖
              </ToolbarButton>
            </>
          ) : (
            <>
              {tts.state === "speaking" ? (
                <ToolbarButton onClick={tts.pause} label={t("a11y.pause")}>
                  ⏸
                </ToolbarButton>
              ) : (
                <ToolbarButton onClick={tts.resume} label={t("a11y.resume")}>
                  ▶
                </ToolbarButton>
              )}
              <ToolbarButton onClick={onStop} label={t("a11y.stop")}>
                ⏹
              </ToolbarButton>
            </>
          )}
        </ToolbarGroup>

        <ToolbarDivider />

        {/* Font size group */}
        <ToolbarGroup>
          <ToolbarButton onClick={() => onFontStep(-1)} label={t("a11y.font_smaller")}>
            A−
          </ToolbarButton>
          <span
            className="px-1 text-xs font-extrabold ink-default"
            aria-label={t("a11y.font_size_label")}
          >
            {Math.round(prefs.fontScale * 100)}%
          </span>
          <ToolbarButton onClick={() => onFontStep(1)} label={t("a11y.font_larger")}>
            A+
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* Contrast + dictation + reset */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={onContrast}
            label={prefs.contrast === "more" ? t("a11y.contrast_off") : t("a11y.contrast_on")}
            active={prefs.contrast === "more"}
          >
            ◐
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setSttOpen((o) => !o)}
            label={t("a11y.dictation")}
            active={sttOpen}
          >
            🎤
          </ToolbarButton>
          <ToolbarButton onClick={onReset} label={t("a11y.reset")}>
            ↺
          </ToolbarButton>
        </ToolbarGroup>
      </div>
    </div>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-6 w-px bg-gum-black/20" aria-hidden="true" />;
}

function ToolbarButton({
  onClick,
  label,
  children,
  disabled,
  active,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gum-purple disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-gum-yellow text-gum-black"
          : "hover:bg-gum-mint"
      }`}
    >
      {children}
    </button>
  );
}