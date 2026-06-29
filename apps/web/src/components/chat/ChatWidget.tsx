"use client";

/**
 * Floating chat widget. Bottom-right (the a11y toolbar is bottom-left
 * so they don't overlap).
 *
 * The widget:
 *   - Shows an "Aura" branded bubble
 *   - Opens a drawer with the chat interface
 *   - Streams responses token-by-token (using our SSE endpoint)
 *   - Renders markdown-ish responses with source links
 *   - Lets the user rate each response (thumbs up/down)
 *   - Supports speech-to-text input via the Web Speech API
 *   - **Voice mode**: when enabled, every Aura response is read aloud
 *     via TTS in the user's locale
 *   - **Continuous voice conversation**: speak → STT → send → Aura
 *     responds → TTS → repeat
 *   - Persists session history in sessionStorage (cleared on tab close)
 *
 * For a fullscreen experience, /chat uses the same backend but a
 * different UI.
 */

import { useCallback, useEffect, useRef, useState } from "react";
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

const STORAGE_KEY = "elixio_chat_session";
const VOICE_MODE_KEY = "elixio_voice_mode";

function loadSession(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveSession(messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  } catch {
    /* ignore quota */
  }
}

export function ChatWidget() {
  const { t, locale } = useI18n();
  const { announce } = useAnnouncer();
  const stt = useStt();
  const tts = useTts();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [kbHealth, setKbHealth] = useState<{ ready: boolean; chunks: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load session + voice preference on mount.
  useEffect(() => {
    setMessages(loadSession());
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

  // Persist session on change.
  useEffect(() => {
    saveSession(messages);
  }, [messages]);

  // Persist voice preference.
  useEffect(() => {
    try {
      if (continuousMode) localStorage.setItem(VOICE_MODE_KEY, "continuous");
      else if (voiceMode) localStorage.setItem(VOICE_MODE_KEY, "on");
      else localStorage.setItem(VOICE_MODE_KEY, "off");
    } catch {
      /* ignore */
    }
  }, [voiceMode, continuousMode]);

  // Auto-scroll to bottom when messages change.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // Check KB health on first open.
  useEffect(() => {
    if (!open || kbHealth !== null) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    fetch(`${apiUrl}/v1/chat/health`)
      .then((r) => r.json())
      .then((d) => setKbHealth({ ready: d.kbReady, chunks: d.kbChunks }))
      .catch(() => setKbHealth({ ready: false, chunks: 0 }));
  }, [open, kbHealth]);

  // Pull STT transcript into input while listening.
  useEffect(() => {
    if (stt.listening && stt.transcript) {
      setInput(stt.transcript);
    }
  }, [stt.transcript, stt.listening]);

  /**
   * Voice mode: when enabled, speak the last assistant message
   * whenever it finishes streaming. Use the user's locale.
   */
  useEffect(() => {
    if (!voiceMode || streaming) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && !m.pending);
    if (!lastAssistant) return;
    // Avoid re-speaking the same message
    const lastSpokenId = (window as { __elixioLastSpoken?: string }).__elixioLastSpoken;
    if (lastSpokenId === lastAssistant.id) return;
    (window as { __elixioLastSpoken?: string }).__elixioLastSpoken = lastAssistant.id;

    tts.speak(lastAssistant.content, { lang: locale });
    if (continuousMode) announce(t("chat.voice_speaking"));
  }, [messages, streaming, voiceMode, tts, locale, continuousMode, announce, t]);

  /**
   * Continuous voice mode: after Aura finishes speaking, restart STT
   * so the user can immediately speak their next question. When STT
   * detects end of speech, auto-send the message.
   */
  useEffect(() => {
    if (!continuousMode) return;
    if (tts.state === "idle" && !streaming && !stt.listening) {
      // Aura finished speaking — listen for the user's next question.
      stt.reset();
      stt.start({ lang: locale, continuous: true });
    }
  }, [continuousMode, tts.state, streaming, stt, locale]);

  // When STT finalizes a transcript in continuous mode, auto-send.
  useEffect(() => {
    if (!continuousMode || !stt.transcript) return;
    if (stt.listening) return; // wait until user stops
    // If there's a complete transcript that hasn't been sent yet, send it.
    const text = stt.transcript.trim();
    if (text && !streaming && input !== text) {
      setInput(text);
      // Small delay to let STT finalize
      const t = setTimeout(() => {
        if (text.length > 2) {
          setInput(text);
          // Will trigger send via the input change + effect
        }
      }, 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [continuousMode, stt.transcript, stt.listening, streaming, input]);

  const sendFeedback = useCallback(
    async (messageId: string, rating: "up" | "down") => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return;
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m)));
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      try {
        await fetch(`${apiUrl}/v1/chat/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: messages[messages.findIndex((m) => m.id === messageId) - 1]?.content ?? "",
            answer: msg.content,
            rating,
            locale,
          }),
        });
      } catch {
        /* non-critical */
      }
    },
    [messages, locale],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    const aiMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: "",
      pending: true,
    };
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
    setStreaming(true);
    stt.abort();
    // Clear last-spoken marker so the new response gets spoken
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
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }
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
      announce(t("chat.answered"));
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsg.id
            ? { ...m, content: t("chat.error"), pending: false }
            : m,
        ),
      );
      announce(t("chat.error"), true);
      // eslint-disable-next-line no-console
      console.error("[chat]", e);
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, messages, locale, stt, announce, t]);

  // Auto-send when input gets a new transcript in continuous mode
  useEffect(() => {
    if (!continuousMode) return;
    if (!input.trim() || streaming) return;
    // Wait a moment for STT to finalize, then send
    const t = setTimeout(() => {
      if (input.trim() && !streaming) {
        void send();
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [input, continuousMode, streaming, send]);

  const onKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void send();
      }
    },
    [send],
  );

  const clearSession = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem(STORAGE_KEY);
    tts.stop();
  }, [tts]);

  const toggleVoiceMode = useCallback(() => {
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
    announce(voiceMode ? t("chat.voice_mode_off") : t("chat.voice_mode_on"));
  }, [voiceMode, continuousMode, tts, stt, announce, t]);

  const toggleContinuous = useCallback(() => {
    if (continuousMode) {
      setContinuousMode(false);
      stt.abort();
    } else {
      setContinuousMode(true);
      setVoiceMode(true);
    }
    announce(continuousMode ? t("chat.voice_continuous_off") : t("chat.voice_continuous_on"));
  }, [continuousMode, stt, announce, t]);

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            announce(t("chat.opened"));
          }}
          aria-label={t("chat.open")}
          className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-gum-black bg-gum-purple text-2xl text-white shadow-[0_4px_0_0_#111] transition-transform hover:-translate-y-0.5 print:hidden"
        >
          💬
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div
          role="dialog"
          aria-labelledby="chat-title"
          aria-modal="false"
          className="fixed bottom-4 right-4 z-40 flex h-[min(680px,calc(100vh-2rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border-2 border-gum-black bg-gum-cream shadow-[0_6px_0_0_#111] print:hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-gum-black bg-gum-purple px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-gum-yellow text-base">
                ✨
              </span>
              <div>
                <h2 id="chat-title" className="text-base font-extrabold leading-tight">
                  {t("chat.name")}
                </h2>
                <p className="text-[10px] opacity-80">{t("chat.tagline")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Voice mode toggle */}
              <button
                type="button"
                onClick={toggleVoiceMode}
                aria-pressed={voiceMode}
                aria-label={voiceMode ? t("chat.voice_mode_off") : t("chat.voice_mode_on")}
                title={t("chat.voice_mode_description")}
                className={`rounded-lg p-1.5 text-sm ${voiceMode ? "bg-gum-yellow text-gum-black" : "hover:bg-white/20"}`}
              >
                🔊
              </button>
              {/* Continuous mode toggle */}
              <button
                type="button"
                onClick={toggleContinuous}
                aria-pressed={continuousMode}
                aria-label={continuousMode ? t("chat.voice_continuous_off") : t("chat.voice_continuous_on")}
                title={t("chat.voice_continuous_description")}
                disabled={!stt.supported}
                className={`rounded-lg p-1.5 text-sm disabled:opacity-30 ${continuousMode ? "bg-gum-yellow text-gum-black" : "hover:bg-white/20"}`}
              >
                🎙️
              </button>
              <a
                href="/chat"
                className="rounded-lg p-1.5 text-sm hover:bg-white/20"
                aria-label={t("chat.fullscreen")}
              >
                ⤢
              </a>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearSession}
                  className="rounded-lg p-1.5 text-sm hover:bg-white/20"
                  aria-label={t("chat.clear")}
                >
                  🗑
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  tts.stop();
                  stt.abort();
                }}
                className="rounded-lg p-1.5 text-sm hover:bg-white/20"
                aria-label={t("chat.close")}
              >
                ✕
              </button>
            </div>
          </div>

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

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
            {messages.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-gum-black/20 p-4 text-center text-sm ink-muted">
                <p className="font-extrabold ink-default">{t("chat.welcome_title")}</p>
                <p className="mt-2 text-xs">{t("chat.welcome_body")}</p>
                {!kbHealth?.ready && (
                  <p className="mt-2 text-xs text-amber-700">{t("chat.indexing")}</p>
                )}
                <ul className="mt-3 space-y-1 text-xs">
                  <li>
                    <button
                      type="button"
                      onClick={() => setInput(t("chat.suggestion_pricing"))}
                      className="text-gum-purple underline-offset-2 hover:underline"
                    >
                      {t("chat.suggestion_pricing")}
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setInput(t("chat.suggestion_become_creator"))}
                      className="text-gum-purple underline-offset-2 hover:underline"
                    >
                      {t("chat.suggestion_become_creator")}
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setInput(t("chat.suggestion_refund"))}
                      className="text-gum-purple underline-offset-2 hover:underline"
                    >
                      {t("chat.suggestion_refund")}
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setInput(t("chat.suggestion_accessibility"))}
                      className="text-gum-purple underline-offset-2 hover:underline"
                    >
                      {t("chat.suggestion_accessibility")}
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
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
                    <ul className="mt-2 space-y-1 border-t border-gum-black/10 pt-2 text-xs">
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
                    <div className="mt-2 flex items-center gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => sendFeedback(m.id, "up")}
                        aria-label={t("chat.thumbs_up")}
                        aria-pressed={m.feedback === "up"}
                        className={`rounded px-1.5 py-0.5 ${m.feedback === "up" ? "bg-gum-mint" : "hover:bg-gum-mint"}`}
                      >
                        👍
                      </button>
                      <button
                        type="button"
                        onClick={() => sendFeedback(m.id, "down")}
                        aria-label={t("chat.thumbs_down")}
                        aria-pressed={m.feedback === "down"}
                        className={`rounded px-1.5 py-0.5 ${m.feedback === "down" ? "bg-red-100" : "hover:bg-red-50"}`}
                      >
                        👎
                      </button>
                      <button
                        type="button"
                        onClick={() => tts.speak(m.content, { lang: locale })}
                        aria-label={t("chat.voice_mode_on")}
                        className="rounded px-1.5 py-0.5 hover:bg-gum-mint"
                      >
                        🔊
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t-2 border-gum-black/20 p-2">
            <div className="flex items-end gap-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                rows={2}
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
                  aria-pressed={stt.listening}
                  aria-label={stt.listening ? t("chat.stop_dictation") : t("chat.start_dictation")}
                  title={stt.supported ? (stt.listening ? t("chat.stop_dictation") : t("chat.start_dictation")) : t("chat.voice_no_support")}
                  className={`rounded-xl border-2 border-gum-black px-2 py-1 text-base ${
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
                  className="rounded-xl border-2 border-gum-black bg-gum-purple px-2 py-1 text-sm font-bold text-white disabled:opacity-40"
                >
                  ↑
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs ink-subtle">{t("chat.input_hint")}</p>
          </div>
        </div>
      )}
    </>
  );
}