"use client";

/**
 * Floating chat widget. Bottom-right (the a11y toolbar is bottom-left
 * so they don't overlap).
 *
 * The widget:
 *   - Shows a "Get help" bubble
 *   - Opens a drawer with the chat interface
 *   - Streams responses token-by-token (using our SSE endpoint)
 *   - Renders markdown-ish responses with source links
 *   - Lets the user rate each response (thumbs up/down)
 *   - Supports speech-to-text input via the Web Speech API
 *   - Persists session history in sessionStorage (cleared on tab close)
 *
 * For a fullscreen experience, /chat uses the same backend but a
 * different UI.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n-client";
import { useStt } from "@/lib/stt";
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
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [kbHealth, setKbHealth] = useState<{ ready: boolean; chunks: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load session on mount.
  useEffect(() => {
    setMessages(loadSession());
  }, []);

  // Persist on change.
  useEffect(() => {
    saveSession(messages);
  }, [messages]);

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
    announce(t("chat.thinking"));

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    const history = messages
      .filter((m) => !m.pending)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      // Use streaming via fetch + ReadableStream (no EventSource — we
      // need to POST).
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
        // Parse SSE events: lines starting with "data: " then a blank line
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
  }, []);

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
          className="fixed bottom-4 right-4 z-40 flex h-[min(640px,calc(100vh-2rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border-2 border-gum-black bg-gum-cream shadow-[0_6px_0_0_#111] print:hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-gum-black bg-gum-purple px-4 py-3 text-white">
            <h2 id="chat-title" className="text-base font-extrabold">
              {t("chat.title")}
            </h2>
            <div className="flex items-center gap-2">
              <a
                href="/chat"
                className="rounded-lg p-1 text-xs underline-offset-2 hover:underline"
                aria-label={t("chat.fullscreen")}
              >
                ⤢
              </a>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearSession}
                  className="rounded-lg p-1 text-xs hover:bg-white/20"
                  aria-label={t("chat.clear")}
                >
                  🗑
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 hover:bg-white/20"
                aria-label={t("chat.close")}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
            {messages.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-gum-black/20 p-4 text-center text-sm ink-muted">
                <p className="font-extrabold ink-default">{t("chat.welcome_title")}</p>
                <p className="mt-2 text-xs">{t("chat.welcome_body")}</p>
                {!kbHealth?.ready && (
                  <p className="mt-2 text-xs text-amber-700">
                    {t("chat.indexing")}
                  </p>
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
                disabled={streaming}
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
                  title={stt.supported ? (stt.listening ? t("chat.stop_dictation") : t("chat.start_dictation")) : t("chat.stt_unsupported")}
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
            <p className="mt-1 text-xs ink-subtle">
              {t("chat.input_hint")}
            </p>
          </div>
        </div>
      )}
    </>
  );
}