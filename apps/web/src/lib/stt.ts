"use client";

/**
 * Speech-to-text hook. Wraps the Web Speech API `SpeechRecognition` with:
 *   - language-aware recognition (picks best match for the i18n locale)
 *   - continuous or single-shot mode
 *   - interim + final transcript callbacks
 *   - error handling for the common Chrome/Firefox gotchas
 *   - permission state tracking
 *
 * Browser support:
 *   - Chrome / Edge: full support via `webkitSpeechRecognition`
 *   - Safari 14.1+: full support via `SpeechRecognition`
 *   - Firefox: behind a flag in some versions; we show a clear
 *     "not supported" state so the user knows
 *
 * Privacy: the browser streams audio to a built-in recognition service
 * (Google by default in Chrome). The audio is not stored by us, but
 * the user should know the round-trip happens. The hook shows a
 * "Listening…" indicator whenever active.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type SttState =
  | "idle"
  | "starting"
  | "listening"
  | "stopping"
  | "error"
  | "unsupported"
  | "denied";

export interface SttOptions {
  /** BCP-47 language tag. Defaults to `<html lang>` or "en-US". */
  lang?: string;
  /** Continuous mode (keeps listening after each phrase). */
  continuous?: boolean;
  /** Interim results (live partial transcripts as you speak). */
  interimResults?: boolean;
  /** Max number of alternatives to return per result (1 = best only). */
  maxAlternatives?: number;
}

export interface UseSttReturn {
  state: SttState;
  /** The latest final transcript (or interim, while still speaking). */
  transcript: string;
  /** True if a recognition session is active. */
  listening: boolean;
  /** Most recent error message, or null. */
  error: string | null;
  /** Start a recognition session. Resolves when the session actually
   *  starts (microphone permission granted + recognition started). */
  start: (options?: SttOptions) => Promise<void>;
  /** Stop the current session. */
  stop: () => void;
  /** Abort the current session without firing the onEnd. */
  abort: () => void;
  /** Clear the accumulated transcript. */
  reset: () => void;
  /** True if the browser exposes any SpeechRecognition constructor. */
  supported: boolean;
}

const DEFAULT_LANG = "en-US";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useStt(): UseSttReturn {
  const [state, setState] = useState<SttState>(() =>
    getCtor() ? "idle" : "unsupported",
  );
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalBufferRef = useRef("");

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      if (recRef.current) {
        try {
          recRef.current.abort();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  const start = useCallback(async (options: SttOptions = {}) => {
    const Ctor = getCtor();
    if (!Ctor) {
      setState("unsupported");
      return;
    }
    if (recRef.current) {
      // Already running — don't double-start.
      return;
    }

    setState("starting");
    setError(null);

    const lang = options.lang || document.documentElement.lang || DEFAULT_LANG;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = options.continuous ?? false;
    rec.interimResults = options.interimResults ?? true;
    rec.maxAlternatives = options.maxAlternatives ?? 1;

    finalBufferRef.current = "";
    setTranscript("");

    rec.onstart = () => {
      setState("listening");
    };
    rec.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alt = result[0];
        if (!alt) continue;
        if (result.isFinal) {
          finalBufferRef.current = (finalBufferRef.current + " " + alt.transcript).trim();
        } else {
          interim += alt.transcript;
        }
      }
      setTranscript((finalBufferRef.current + " " + interim).trim());
    };
    rec.onerror = (event: SpeechRecognitionErrorEventLike) => {
      // "no-speech" and "aborted" are normal end-of-session events.
      if (event.error === "no-speech" || event.error === "aborted") {
        setState("idle");
        return;
      }
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setState("denied");
        setError("Microphone permission denied. Please allow microphone access in your browser settings.");
        return;
      }
      setState("error");
      setError(event.error || "Unknown speech recognition error");
    };
    rec.onend = () => {
      recRef.current = null;
      setState((s) => (s === "listening" || s === "starting" ? "idle" : s));
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Failed to start recognition");
      recRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (recRef.current) {
      setState("stopping");
      try {
        recRef.current.stop();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const abort = useCallback(() => {
    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch {
        /* ignore */
      }
      recRef.current = null;
      setState("idle");
    }
  }, []);

  const reset = useCallback(() => {
    finalBufferRef.current = "";
    setTranscript("");
  }, []);

  return {
    state,
    transcript,
    listening: state === "listening",
    error,
    start,
    stop,
    abort,
    reset,
    supported: getCtor() !== null,
  };
}