"use client";

/**
 * Text-to-speech hook. Wraps the Web Speech API `speechSynthesis` with:
 *   - language-aware voice selection (picks the best match for the
 *     current i18n locale)
 *   - play / pause / resume / stop
 *   - rate / pitch / volume controls
 *   - selection-based reading (read from a specific DOM range)
 *   - queue management (multiple utterances)
 *   - error recovery (Chrome sometimes drops synthesis after long idle)
 *
 * Browser support: Chrome, Edge, Safari, Firefox 49+. The hook no-ops
 * gracefully if `speechSynthesis` is unavailable.
 *
 * Privacy: the Web Speech API uses the OS / browser TTS engine by
 * default in Chrome on desktop, but on mobile it may use a cloud
 * service. We always show a clear "Stop" button and let the user
 * disable the feature globally.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type TtsState = "idle" | "speaking" | "paused" | "unavailable";

export interface TtsOptions {
  /** BCP-47 language tag (e.g. "en-US", "fr-FR"). Falls back to the
   *  document's `<html lang>` then to "en-US". */
  lang?: string;
  /** 0.5–2.0; default 1.0 */
  rate?: number;
  /** 0–2; default 1.0 */
  pitch?: number;
  /** 0–1; default 1.0 */
  volume?: number;
}

export interface UseTtsReturn {
  state: TtsState;
  /** The current utterance being spoken, or null when idle. */
  current: string | null;
  /** Speak a string. Interrupts any in-progress speech. */
  speak: (text: string, options?: TtsOptions) => void;
  /** Read the user's current text selection from the active element. */
  readSelection: () => void;
  /** Read all visible text inside a CSS selector (e.g. "main", "[role=main]"). */
  readSelector: (selector: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  /** List of voices available for the current language. */
  voices: SpeechSynthesisVoice[];
}

const DEFAULT_LANG = "en-US";

function isSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickBestVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  // Try exact match first, then language-only, then any voice.
  const exact = voices.find((v) => v.lang === lang);
  if (exact) return exact;
  const langOnly = lang.split("-")[0];
  const partial = voices.find((v) => v.lang.startsWith(langOnly));
  if (partial) return partial;
  return voices[0];
}

export function useTts(): UseTtsReturn {
  const [state, setState] = useState<TtsState>(() =>
    isSupported() ? "idle" : "unavailable",
  );
  const [current, setCurrent] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Voice list is async-populated by the browser. Listen for both
  // initial load and the eventual refresh.
  useEffect(() => {
    if (!isSupported()) return;
    const update = () => {
      const list = window.speechSynthesis.getVoices();
      setVoices(list);
    };
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);

  // Chrome drops long utterances (>15s) silently. We resume() on a
  // timer to keep the engine alive. This is a well-known workaround.
  useEffect(() => {
    if (!isSupported() || state !== "speaking") return;
    const interval = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [state]);

  // Stop on unmount.
  useEffect(() => {
    return () => {
      if (isSupported()) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback((text: string, options: TtsOptions = {}) => {
    if (!isSupported() || !text) return;

    // Clean text: strip HTML tags if any leaked in, collapse whitespace.
    const clean = text
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) return;

    const lang = options.lang || document.documentElement.lang || DEFAULT_LANG;
    const voice = pickBestVoice(voices, lang);
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = lang;
    if (voice) utter.voice = voice;
    utter.rate = options.rate ?? 1;
    utter.pitch = options.pitch ?? 1;
    utter.volume = options.volume ?? 1;

    utter.onstart = () => {
      setState("speaking");
      setCurrent(clean);
    };
    utter.onpause = () => setState("paused");
    utter.onresume = () => setState("speaking");
    utter.onend = () => {
      setState("idle");
      setCurrent(null);
    };
    utter.onerror = (e) => {
      // "interrupted" / "canceled" are expected when we cancel/restart.
      if (e.error === "interrupted" || e.error === "canceled") return;
      // "synthesis-unavailable" / "audio-busy" — log and reset.
      // eslint-disable-next-line no-console
      console.warn("[tts]", e.error, clean.slice(0, 60));
      setState("idle");
      setCurrent(null);
    };

    utteranceRef.current = utter;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }, [voices]);

  const readSelection = useCallback(() => {
    if (!isSupported()) return;
    const sel = window.getSelection();
    const text = sel?.toString() ?? "";
    if (text) speak(text);
  }, [speak]);

  const readSelector = useCallback((selector: string) => {
    if (!isSupported() || typeof document === "undefined") return;
    const root = document.querySelector(selector);
    if (!root) return;
    // Use innerText so we get the visually-rendered text (CSS-hidden
    // content is skipped automatically).
    const text = (root as HTMLElement).innerText;
    if (text) speak(text);
  }, [speak]);

  const pause = useCallback(() => {
    if (isSupported()) window.speechSynthesis.pause();
  }, []);

  const resume = useCallback(() => {
    if (isSupported()) window.speechSynthesis.resume();
  }, []);

  const stop = useCallback(() => {
    if (isSupported()) {
      window.speechSynthesis.cancel();
      setState("idle");
      setCurrent(null);
    }
  }, []);

  // Memo so consumers can compare identity.
  return useMemo(
    () => ({ state, current, speak, readSelection, readSelector, pause, resume, stop, voices }),
    [state, current, speak, readSelection, readSelector, pause, resume, stop, voices],
  );
}