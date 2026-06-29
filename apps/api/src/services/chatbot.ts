/**
 * Chatbot query service. RAG (retrieval-augmented generation) over the
 * in-memory KB index.
 *
 * Pipeline:
 *   1. Embed the user's question with the same model used at index time
 *   2. Cosine-similarity against all chunks; take top-K
 *   3. If no chunk scores above 0.4, fall back to a keyword-overlap
 *      retriever (useful when the embedder is unavailable)
 *   4. Build a system prompt with the top chunks + a strict
 *      "answer only from these sources" instruction
 *   5. Call Gemini 1.5 Flash to generate the response in the user's
 *      language
 *   6. Stream the response back via the SSE handler
 *
 * Streaming is supported via a callback parameter; non-streaming callers
 * (tests, batch jobs) get the full text at once.
 */

import { buildKbIndex, getKbIndex, type KbChunk } from "./chatbot-kb.js";
import { embedText, generate } from "../lib/gemini.js";
import { logger } from "../lib/logger.js";

export interface ChatSource {
  title: string;
  url?: string;
  source: string;
  score: number;
  excerpt: string;
}

export interface ChatResponse {
  text: string;
  sources: ChatSource[];
  /** True if no relevant KB chunks were found (low confidence). */
  fallback: boolean;
}

export interface ChatQuery {
  question: string;
  /** BCP-47 locale tag for the response language. */
  locale?: string;
  /** Conversation history (last few turns). Optional. */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  /** Max chunks to retrieve (default 4). */
  topK?: number;
}

const MAX_CHARS_PER_CHUNK = 800;
const MAX_TOTAL_CONTEXT_CHARS = 4000;
const MIN_RELEVANCE_SCORE = 0.35;

function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function keywordScore(query: string, chunk: KbChunk): number {
  const qTokens = new Set(tokenize(query));
  if (qTokens.size === 0) return 0;
  const cTokens = new Set(tokenize(chunk.content));
  let hits = 0;
  for (const t of qTokens) if (cTokens.has(t)) hits++;
  return hits / qTokens.size;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function buildSystemPrompt(chunks: KbChunk[], locale: string): string {
  const context = chunks
    .map((c, i) => {
      const title = c.metadata.title ?? c.metadata.source;
      const url = c.metadata.url ? ` (${c.metadata.url})` : "";
      return `[${i + 1}] ${title}${url}\n${truncate(c.content, MAX_CHARS_PER_CHUNK)}`;
    })
    .join("\n\n---\n\n")
    .slice(0, MAX_TOTAL_CONTEXT_CHARS);

  const lang = (locale || "en").split("-")[0];
  const langName = languageNameForCode(lang);
  const greeting = greetingForCode(lang);

  return `You are Aura, the AI assistant for the Elixio Digital marketplace.
You were created by the Elixio team to help users find answers about the
platform in their preferred language.

Your personality: warm, concise, knowledgeable. You can be playful but
stay professional. You never make up features, prices, or policies that
aren't in the provided context.

You must answer the user's question using ONLY the provided context below.
If the answer is not in the context, say "${fallbackForCode(lang)}" —
do not invent an answer.

The user is asking in ${langName} (locale: ${locale}). Respond in
${langName} unless they switch languages mid-conversation.

When greeting the user (first turn only), use this localized greeting:
${greeting}

When you cite a fact, mention the source number in brackets, e.g. "[1]".
When the context mentions a URL, point the user to it.

Use markdown for formatting (lists, links, code).

CONTEXT:
${context || "(no relevant context found)"}`;
}

function languageNameForCode(code: string): string {
  const map: Record<string, string> = {
    en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian",
    pt: "Portuguese", nl: "Dutch", sv: "Swedish", no: "Norwegian", da: "Danish",
    fi: "Finnish", pl: "Polish", ru: "Russian", uk: "Ukrainian", cs: "Czech",
    sk: "Slovak", hu: "Hungarian", ro: "Romanian", bg: "Bulgarian", el: "Greek",
    tr: "Turkish", ar: "Arabic", he: "Hebrew", fa: "Persian", ur: "Urdu",
    hi: "Hindi", bn: "Bengali", ta: "Tamil", te: "Telugu", kn: "Kannada",
    ml: "Malayalam", mr: "Marathi", gu: "Gujarati", pa: "Punjabi", si: "Sinhala",
    th: "Thai", vi: "Vietnamese", id: "Indonesian", ms: "Malay", tl: "Tagalog",
    ja: "Japanese", ko: "Korean", zh: "Chinese (Simplified)", "zh-TW": "Chinese (Traditional)",
    my: "Burmese", km: "Khmer", lo: "Lao", mn: "Mongolian",
  };
  return map[code] ?? code;
}

/**
 * Localized greeting that Aura uses on the first turn of a
 * conversation. Keeps the brand name (Aura) universal but localizes
 * the surrounding language.
 */
function greetingForCode(code: string): string {
  const map: Record<string, string> = {
    en: "Hi! I'm Aura, your Elixio assistant. How can I help today?",
    es: "¡Hola! Soy Aura, tu asistente de Elixio. ¿Cómo puedo ayudarte hoy?",
    fr: "Bonjour ! Je suis Aura, votre assistante Elixio. Comment puis-je vous aider aujourd'hui ?",
    de: "Hallo! Ich bin Aura, deine Elixio-Assistentin. Wie kann ich dir heute helfen?",
    hi: "नमस्ते! मैं ऑरा हूँ, आपकी एलिक्सियो सहायक। आज मैं आपकी कैसे मदद कर सकती हूँ?",
    pt: "Olá! Sou a Aura, sua assistente da Elixio. Como posso te ajudar hoje?",
    ar: "مرحبا! أنا أورا، مساعدتك في إليكسو. كيف يمكنني مساعدتك اليوم؟",
    ur: "السلام علیکم! میں اورا ہوں، آپ کی ایلیکسیو معاون۔ آج میں آپ کی کس طرح مدد کر سکتی ہوں؟",
    he: "שלום! אני אורה, העוזרת שלך ב-Elixio. איך אוכל לעזור לך היום?",
    zh: "你好！我是 Aura，你的 Elixio 助手。今天我能为你做什么？",
    "zh-TW": "你好！我是 Aura，你的 Elixio 助手。今天我能為你做什麼？",
    ja: "こんにちは！Aura です。Elixio のアシスタントです。今日はどのようなご用でしょうか？",
    ko: "안녕하세요! 저는 Aura, 당신의 Elixio 도우미입니다. 오늘 무엇을 도와드릴까요?",
    ru: "Привет! Я Aura, твой ассистент Elixio. Чем могу помочь сегодня?",
    it: "Ciao! Sono Aura, la tua assistente Elixio. Come posso aiutarti oggi?",
    nl: "Hallo! Ik ben Aura, je Elixio-assistent. Hoe kan ik je vandaag helpen?",
    pl: "Cześć! Jestem Aura, twoja asystentka Elixio. Jak mogę ci dziś pomóc?",
    tr: "Merhaba! Ben Aura, Elixio asistanınızım. Bugün size nasıl yardımcı olabilirim?",
    vi: "Xin chào! Tôi là Aura, trợ lý Elixio của bạn. Hôm nay tôi có thể giúp gì cho bạn?",
    th: "สวัสดี! ฉันชื่อ Aura ผู้ช่วย Elixio ของคุณ วันนี้ฉันช่วยอะไรคุณได้บ้าง?",
    id: "Halo! Saya Aura, asisten Elixio Anda. Apa yang bisa saya bantu hari ini?",
    ms: "Hai! Saya Aura, pembantu Elixio anda. Apa yang boleh saya bantu hari ini?",
    sv: "Hej! Jag är Aura, din Elixio-assistent. Hur kan jag hjälpa dig idag?",
    da: "Hej! Jeg er Aura, din Elixio-assistent. Hvordan kan jeg hjælpe dig i dag?",
    no: "Hei! Jeg er Aura, din Elixio-assistent. Hvordan kan jeg hjelpe deg i dag?",
    fi: "Hei! Olen Aura, Elixio-avustajasi. Miten voin auttaa sinua tänään?",
    el: "Γεια σας! Είμαι η Aura, η βοηθός σας στο Elixio. Πώς μπορώ να σας βοηθήσω σήμερα;",
    cs: "Ahoj! Jsem Aura, tvůj asistent Elixio. Jak ti dnes mohu pomoci?",
    sk: "Ahoj! Som Aura, tvoj asistent Elixio. Ako ti dnes môžem pomôcť?",
    hu: "Szia! Aura vagyok, az Elixio asszisztense. Miben segíthetek ma?",
    ro: "Bună! Sunt Aura, asistenta ta Elixio. Cum te pot ajuta azi?",
    bg: "Здравей! Аз съм Aura, твоят асистент в Elixio. Как мога да ти помогна днес?",
  };
  return map[code] ?? "Hi! I'm Aura, your Elixio assistant. How can I help today?";
}

/**
 * Localized "I don't know" message Aura uses when the KB doesn't
 * contain the answer. Same tone as the greeting.
 */
function fallbackForCode(code: string): string {
  const map: Record<string, string> = {
    en: "I'm not sure about that — try the help docs at /docs or contact support@elixiodigital.com.",
    es: "No estoy seguro de eso — consulta los documentos de ayuda en /docs o escribe a support@elixiodigital.com.",
    fr: "Je ne suis pas sûr — consultez les docs d'aide sur /docs ou contactez support@elixiodigital.com.",
    de: "Da bin ich mir nicht sicher — schau in die Hilfe-Docs unter /docs oder schreib an support@elixiodigital.com.",
    hi: "मुझे इसकी जानकारी नहीं है — /docs पर हेल्प डॉक्स देखें या support@elixiodigital.com पर संपर्क करें।",
    pt: "Não tenho certeza disso — confira a documentação de ajuda em /docs ou contate support@elixiodigital.com.",
    ar: "لست متأكداً من ذلك — راجع مستندات المساعدة في /docs أو تواصل مع support@elixiodigital.com.",
    ur: "مجھے اس کی یقینی معلومات نہیں ہیں — /docs پر ہیلپ دستاویزات دیکھیں یا support@elixiodigital.com سے رابطہ کریں۔",
    he: "אני לא בטוחה לגבי זה — עייני במסמכי העזרה ב-/docs או צרי קשר עם support@elixiodigital.com.",
    zh: "我不确定 — 请查看 /docs 上的帮助文档，或联系 support@elixiodigital.com。",
    "zh-TW": "我不確定 — 請查看 /docs 上的說明文件，或聯絡 support@elixiodigital.com。",
    ja: "その件は分かりかねます — /docs のヘルプドキュメントをご覧になるか、support@elixiodigital.com までお問い合わせください。",
    ko: "잘 모르겠습니다 — /docs의 도움말 문서를 확인하시거나 support@elixiodigital.com으로 문의해 주세요.",
    ru: "Я не уверен — посмотрите справку в /docs или напишите на support@elixiodigital.com.",
    it: "Non ne sono sicuro — consulta la documentazione di aiuto su /docs o contatta support@elixiodigital.com.",
    nl: "Dat weet ik niet zeker — bekijk de helpdocs op /docs of neem contact op met support@elixiodigital.com.",
    pl: "Nie jestem pewien — sprawdź dokumenty pomocy w /docs lub skontaktuj się z support@elixiodigital.com.",
    tr: "Bundan emin değilim — /docs adresindeki yardım belgelerine bakın veya support@elixiodigital.com adresine yazın.",
    vi: "Tôi không chắc — hãy xem tài liệu trợ giúp tại /docs hoặc liên hệ support@elixiodigital.com.",
  };
  return map[code] ?? "I'm not sure about that — try the help docs at /docs or contact support@elixiodigital.com.";
}

/** Retrieve the top-K most relevant chunks for a question. */
export async function retrieveChunks(
  question: string,
  topK = 4,
): Promise<Array<{ chunk: KbChunk; score: number }>> {
  const index = getKbIndex() ?? (await buildKbIndex());
  if (index.chunks.length === 0) return [];

  let questionEmbedding: number[] = [];
  try {
    questionEmbedding = await embedText(question);
  } catch (e) {
    logger.warn({ err: e }, "embedding failed, using keyword fallback");
  }

  const scored = index.chunks.map((chunk) => {
    const semantic = questionEmbedding.length > 0
      ? cosineSim(questionEmbedding, chunk.embedding)
      : 0;
    const keyword = keywordScore(question, chunk);
    // Blend: when embeddings are zero/identical, fall back to keyword.
    const score = semantic > 0 ? Math.max(semantic, keyword * 0.5) : keyword;
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/** Answer a question. Returns the text, sources, and a fallback flag. */
export async function answerQuestion(query: ChatQuery): Promise<ChatResponse> {
  const locale = query.locale ?? "en";
  const topK = query.topK ?? 4;
  const top = await retrieveChunks(query.question, topK);
  const relevant = top.filter((t) => t.score >= MIN_RELEVANCE_SCORE);

  const chunks = relevant.length > 0 ? relevant.map((t) => t.chunk) : [];
  const fallback = relevant.length === 0;

  const systemPrompt = buildSystemPrompt(chunks, locale);
  const userPrompt = buildUserPrompt(query);

  let text: string;
  try {
    const { text: responseText } = await generate(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxOutputTokens: 1024,
    });
    text = responseText;
  } catch (e) {
    logger.warn({ err: e }, "generation failed");
    if (fallback) {
      return {
        text: "I'm having trouble connecting to my knowledge base. Please try the /docs page or contact support@elixiodigital.com.",
        sources: [],
        fallback: true,
      };
    }
    // We have relevant context but generation failed — return the
    // top excerpt directly as a graceful degradation.
    text = relevant
      .map(
        (t) =>
          `**${t.chunk.metadata.title ?? t.chunk.metadata.source}**\n\n${truncate(t.chunk.content, 500)}`,
      )
      .join("\n\n---\n\n");
  }

  return {
    text,
    sources: relevant.map((t) => ({
      title: t.chunk.metadata.title ?? t.chunk.metadata.source,
      url: t.chunk.metadata.url,
      source: t.chunk.metadata.source,
      score: t.score,
      excerpt: truncate(t.chunk.content, 240),
    })),
    fallback,
  };
}

function buildUserPrompt(query: ChatQuery): string {
  const history = query.history ?? [];
  const historyBlock = history
    .slice(-6) // last 3 turns (user + assistant)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  if (historyBlock) {
    return `${historyBlock}\nUser: ${query.question}\nAssistant:`;
  }
  return `User: ${query.question}\nAssistant:`;
}

/** SSE-friendly streaming variant. Calls onToken for each chunk. */
export async function answerQuestionStream(
  query: ChatQuery,
  onToken: (token: string) => void,
): Promise<ChatResponse> {
  // For V1 we don't stream from Gemini (would require a different SDK
  // call); instead we answer in one shot and chunk the response. This
  // still gives a "typing" feel without the SDK complexity.
  const result = await answerQuestion(query);
  // Emit the text in ~30 token chunks with tiny delays.
  const tokens = result.text.match(/\S+\s*|\s+/g) ?? [result.text];
  let buf = "";
  for (const tok of tokens) {
    buf += tok;
    if (buf.length > 24 || tok.includes("\n")) {
      onToken(buf);
      buf = "";
      await new Promise((r) => setTimeout(r, 8));
    }
  }
  if (buf) onToken(buf);
  return result;
}