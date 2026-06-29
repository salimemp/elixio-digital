"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-client";
import { useStt } from "@/lib/stt";
import { useTts } from "@/lib/tts";
import { useAnnouncer } from "@/lib/a11y";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  feedback?: "up" | "down";
  pending?: boolean;
}

interface ChatSource {
  title: string;
  url?: string;
  source: string;
  score: number;
  excerpt: string;
}

const VOICE_MODE_KEY = "elixio_voice_mode_fullscreen";

/**
 * Fullscreen chat page at /chat. Reuses the same backend as the
 * floating widget but with a wider layout, a left-side rail showing
 * suggested topics, and persistent history (localStorage). Includes
 * the full voice mode + continuous voice conversation features.
 */
export default function ChatPage() {
  const { t, locale } = useI18n();
  const { announce } = useAnnouncer();
  const stt = useStt();
  const tts = useTts();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const STORAGE_KEY = "elixio_chat_history_v1";

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setMessages(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch {
      /* ignore */
    }
    try {
      const stored = localStorage.getItem(VOICE_MODE_KEY);
      if (stored === "on") setVoiceMode(true);
      if (stored === "continuous") {
        setVoiceMode(true);
        setContinuousMode(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
    } catch {
      /* ignore */
    }
  }, [messages]);

  useEffect(() => {
    try {
      if (continuousMode) localStorage.setItem(VOICE_MODE_KEY, "continuous");
      else if (voiceMode) localStorage.setItem(VOICE_MODE_KEY, "on");
      else localStorage.setItem(VOICE_MODE_KEY, "off");
    } catch {
      /* ignore */
    }
  }, [voiceMode, continuousMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // Auto-speak the latest assistant message when voice mode is on.
  useEffect(() => {
    if (!voiceMode || streaming) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && !m.pending);
    if (!lastAssistant) return;
    const lastSpokenId = (window as { __elixioLastSpoken?: string }).__elixioLastSpoken;
    if (lastSpokenId === lastAssistant.id) return;
    (window as { __elixioLastSpoken?: string }).__elixioLastSpoken = lastAssistant.id;
    tts.speak(lastAssistant.content, { lang: locale });
  }, [messages, streaming, voiceMode, tts, locale]);

  // Continuous voice: after TTS finishes, listen for next question.
  useEffect(() => {
    if (!continuousMode) return;
    if (tts.state === "idle" && !streaming && !stt.listening) {
      stt.reset();
      stt.start({ lang: locale, continuous: true });
    }
  }, [continuousMode, tts.state, streaming, stt, locale]);

  // Auto-send the STT transcript in continuous mode
  useEffect(() => {
    if (!continuousMode) return;
    if (!input.trim() || streaming) return;
    const t = setTimeout(() => {
      if (input.trim() && !streaming) {
        void send();
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [input, continuousMode, streaming]);

  // Pull STT transcript into input while listening
  useEffect(() => {
    if (stt.listening && stt.transcript) {
      setInput(stt.transcript);
    }
  }, [stt.transcript, stt.listening]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    const aiMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: "",
      pending: true,
    };
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
    setStreaming(true);
    (window as { __elixioLastSpoken?: string }).__elixioLastSpoken = undefined;
    announce(t("chat.thinking"));

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    const history = messages
      .filter((m) => !m.pending)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(`${apiUrl}/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, locale, history, stream: true }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: { text: string; sources: ChatSource[] } | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const ev of events) {
          const lines = ev.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7).trim();
            else if (line.startsWith("data: ")) data += line.slice(6);
          }
          if (event === "token" && data) {
            try {
              const { token } = JSON.parse(data);
              setMessages((prev) =>
                prev.map((m) => (m.id === aiMsg.id ? { ...m, content: m.content + token } : m)),
              );
            } catch {
              /* ignore */
            }
          } else if (event === "done" && data) {
            try {
              finalResult = JSON.parse(data);
            } catch {
              /* ignore */
            }
          }
        }
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsg.id
            ? { ...m, content: finalResult?.text || m.content, sources: finalResult?.sources, pending: false }
            : m,
        ),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsg.id ? { ...m, content: t("chat.error"), pending: false } : m)),
      );
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, messages, locale, announce, t]);

  const onKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void send();
      }
    },
    [send],
  );

  const toggleVoiceMode = () => {
    if (continuousMode) {
      setContinuousMode(false);
      setVoiceMode(false);
      tts.stop();
      stt.abort();
    } else if (voiceMode) {
      setVoiceMode(false);
      tts.stop();
    } else {
      setVoiceMode(true);
    }
  };

  const toggleContinuous = () => {
    if (continuousMode) {
      setContinuousMode(false);
      stt.abort();
    } else {
      setContinuousMode(true);
      setVoiceMode(true);
    }
  };

  const suggestions = [
    t("chat.suggestion_pricing"),
    t("chat.suggestion_become_creator"),
    t("chat.suggestion_refund"),
    t("chat.suggestion_accessibility"),
    t("chat.suggestion_languages"),
    t("chat.suggestion_data_export"),
  ];

  return (
    <div className="mx-auto flex max-w-6xl gap-4 px-4 py-6 md:py-10">
      {/* Side rail (desktop only) */}
      <aside className="hidden w-64 flex-shrink-0 md:block">
        <div className="gum-card p-4">
          <h2 className="text-sm font-extrabold ink-default">{t("chat.suggested_topics")}</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setInput(s)}
                  className="w-full rounded-lg px-2 py-1.5 text-left text-xs ink-default hover:bg-gum-mint"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
          <hr className="my-3 border-t border-gum-black/10" />
          <h2 className="text-sm font-extrabold ink-default">{t("chat.quick_links")}</h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              <Link href="/docs" className="text-gum-purple underline-offset-2 hover:underline">
                {t("nav.docs")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-gum-purple underline-offset-2 hover:underline">
                {t("footer.privacy_policy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-gum-purple underline-offset-2 hover:underline">
                {t("footer.terms")}
              </Link>
            </li>
            <li>
              <Link href="/profile" className="text-gum-purple underline-offset-2 hover:underline">
                {t("nav.profile")}
              </Link>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main chat column */}
      <main className="flex min-h-[600px] flex-1 flex-col overflow-hidden rounded-2xl border-2 border-gum-black bg-gum-cream shadow-[0_6px_0_0_#111]">
        <header className="flex items-center justify-between border-b-2 border-gum-black bg-gum-purple px-5 py-3 text-white">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-gum-yellow text-lg">
              ✨
            </span>
            <div>
              <h1 className="text-lg font-extrabold leading-tight">{t("chat.name")}</h1>
              <p className="text-xs opacity-80">{t("chat.tagline")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleVoiceMode}
              aria-pressed={voiceMode}
              aria-label={voiceMode ? t("chat.voice_mode_off") : t("chat.voice_mode_on")}
              title={t("chat.voice_mode_description")}
              className={`rounded-lg p-2 text-sm ${voiceMode ? "bg-gum-yellow text-gum-black" : "hover:bg-white/20"}`}
            >
              🔊
            </button>
            <button
              type="button"
              onClick={toggleContinuous}
              aria-pressed={continuousMode}
              aria-label={continuousMode ? t("chat.voice_continuous_off") : t("chat.voice_continuous_on")}
              title={t("chat.voice_continuous_description")}
              disabled={!stt.supported}
              className={`rounded-lg p-2 text-sm disabled:opacity-30 ${continuousMode ? "bg-gum-yellow text-gum-black" : "hover:bg-white/20"}`}
            >
              🎙️
            </button>
          </div>
        </header>

        {/* Voice status bar */}
        {(voiceMode || stt.listening || tts.state === "speaking") && (
          <div className="flex items-center justify-center gap-2 border-b border-gum-black/10 bg-gum-yellow/30 px-3 py-1.5 text-xs">
            {tts.state === "speaking" && (
              <span className="flex items-center gap-1 font-bold text-gum-black">
                <span aria-hidden>🗣️</span> {t("chat.voice_speaking")}
              </span>
            )}
            {stt.listening && (
              <span className="flex items-center gap-1 font-bold text-red-700">
                <span aria-hidden>🎤</span> {t("chat.voice_listening")}
              </span>
            )}
            {continuousMode && tts.state !== "speaking" && !stt.listening && (
              <span className="ink-muted">{t("chat.voice_continuous_description")}</span>
            )}
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
          {messages.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gum-black/20 p-6 text-center text-sm ink-muted">
              <p className="text-lg font-extrabold ink-default">{t("chat.welcome_title")}</p>
              <p className="mt-2 text-sm">{t("chat.welcome_body_long")}</p>
              <p className="mt-2 text-xs text-amber-700">
                {t("chat.kb_disclaimer")}
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-gum-yellow text-gum-black"
                      : "border-2 border-gum-black/20 bg-white"
                  }`}
                >
                  {m.role === "assistant" && (
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-gum-purple">
                      {t("chat.name")} ✨
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{m.content || (m.pending ? "…" : "")}</p>
                  {m.sources && m.sources.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-gum-black/10 pt-2 text-xs">
                      {m.sources.map((s, i) => (
                        <li key={i}>
                          <a
                            href={s.url ?? "#"}
                            className="text-gum-purple underline-offset-2 hover:underline"
                            target={s.url?.startsWith("http") ? "_blank" : undefined}
                            rel={s.url?.startsWith("http") ? "noopener noreferrer" : undefined}
                          >
                            [{i + 1}] {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  {m.role === "assistant" && !m.pending && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => tts.speak(m.content, { lang: locale })}
                        aria-label={t("chat.voice_mode_on")}
                        className="rounded px-1.5 py-0.5 hover:bg-gum-mint"
                      >
                        🔊 {t("chat.voice_mode_on")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t-2 border-gum-black/20 p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={3}
              aria-label={t("chat.input_label")}
              placeholder={t("chat.input_placeholder")}
              disabled={streaming || (continuousMode && stt.listening)}
              className="flex-1 resize-none rounded-xl border-2 border-gum-black bg-white px-3 py-2 text-sm ink-default focus:outline-none focus-visible:ring-2 focus-visible:ring-gum-purple disabled:opacity-50"
            />
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  if (stt.listening) stt.stop();
                  else {
                    stt.reset();
                    stt.start({ lang: locale, continuous: true });
                  }
                }}
                disabled={!stt.supported}
                aria-label={stt.listening ? t("chat.stop_dictation") : t("chat.start_dictation")}
                className={`rounded-xl border-2 border-gum-black px-3 py-2 text-base ${
                  stt.listening ? "bg-red-100" : "bg-white hover:bg-gum-mint"
                } disabled:opacity-40`}
              >
                🎤
              </button>
              <button
                type="button"
                onClick={send}
                disabled={streaming || !input.trim()}
                aria-label={t("chat.send")}
                className="rounded-xl border-2 border-gum-black bg-gum-purple px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {t("chat.send")}
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs ink-subtle">{t("chat.input_hint")}</p>
        </div>
      </main>
    </div>
  );
}