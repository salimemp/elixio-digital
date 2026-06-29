#!/usr/bin/env node
/**
 * Adds the Aura branding + voice mode keys to the 12 priority/CJK
 * locale files. Keeps the same structure as en.json but with localized
 * strings.
 *
 * Run from monorepo root: node scripts/add-aura-i18n.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = resolve(__dirname, "../apps/web/messages");

// Localized strings for the 12 priority/CJK locales. Name "Aura" stays
// the same in every language (brand consistency). Greeting + voice labels
// are localized.

const localized = {
  es: {
    name: "Aura",
    tagline: "Tu asistente de Elixio",
    title: "Aura",
    subtitle: "Pregunta lo que quieras sobre Elixio. Aura está entrenada con nuestra documentación y habla 42 idiomas.",
    welcome_title: "¡Hola! Soy Aura.",
    welcome_body: "Pregúntame lo que quieras sobre Elixio: funciones, precios, problemas de cuenta, accesibilidad. Puedes escribir, hablar, o pedir que lea las respuestas en voz alta.",
    welcome_body_long: "Soy Aura, la asistente de Elixio. He leído nuestra documentación, preguntas frecuentes y guías de funciones, así que pregúntame lo que quieras sobre comprar, vender, configuración de cuenta, accesibilidad o solución de problemas. Puedes escribir, hablar (botón de micrófono) o activar el modo de voz para que lea las respuestas en voz alta.",
    thinking: "Aura está pensando…",
    voice_mode_on: "Modo de voz activado",
    voice_mode_off: "Modo de voz desactivado",
    voice_mode_description: "Leer respuestas en voz alta",
    voice_continuous_on: "Escuchando siempre",
    voice_continuous_off: "Pulsa para hablar",
    voice_continuous_description: "Habla tu pregunta, Aura responde en voz alta, repite",
    voice_speaking: "Aura está hablando…",
    voice_listening: "Escuchándote…",
    voice_no_support: "La voz no es compatible con este navegador. Prueba Chrome, Edge o Safari.",
    input_hint: "Enter para enviar. Shift+Enter nueva línea. 🎤 para voz.",
  },
  fr: {
    name: "Aura",
    tagline: "Votre assistante Elixio",
    title: "Aura",
    subtitle: "Posez vos questions sur Elixio. Aura est formée sur notre documentation et parle 42 langues.",
    welcome_title: "Bonjour ! Je suis Aura.",
    welcome_body: "Demandez-moi tout sur Elixio : fonctionnalités, tarifs, compte, accessibilité. Vous pouvez écrire, parler, ou m'écouter lire les réponses à voix haute.",
    welcome_body_long: "Je suis Aura, l'assistante Elixio. J'ai lu notre documentation, notre FAQ et nos guides de fonctionnalités, alors posez-moi vos questions sur l'achat, la vente, les paramètres du compte, l'accessibilité ou le dépannage. Vous pouvez écrire, parler (bouton micro), ou activer le mode vocal pour que je lise les réponses à voix haute.",
    thinking: "Aura réfléchit…",
    voice_mode_on: "Mode vocal activé",
    voice_mode_off: "Mode vocal désactivé",
    voice_mode_description: "Lire les réponses à voix haute",
    voice_continuous_on: "Toujours à l'écoute",
    voice_continuous_off: "Appuyer pour parler",
    voice_continuous_description: "Dites votre question, Aura répond à voix haute, recommencez",
    voice_speaking: "Aura parle…",
    voice_listening: "Je vous écoute…",
    voice_no_support: "La voix n'est pas prise en charge dans ce navigateur. Essayez Chrome, Edge ou Safari.",
    input_hint: "Entrée pour envoyer. Maj+Entrée nouvelle ligne. 🎤 pour la voix.",
  },
  de: {
    name: "Aura",
    tagline: "Deine Elixio-Assistentin",
    title: "Aura",
    subtitle: "Frag alles über Elixio. Aura ist mit unserer Dokumentation trainiert und spricht 42 Sprachen.",
    welcome_title: "Hallo! Ich bin Aura.",
    welcome_body: "Frag mich alles über Elixio — Funktionen, Preise, Konto-Probleme, Barrierefreiheit. Du kannst tippen, sprechen oder dir Antworten vorlesen lassen.",
    welcome_body_long: "Ich bin Aura, die Elixio-Assistentin. Ich habe unsere Dokumentation, FAQ und Funktionsanleitungen gelesen, also frag mich alles über Kaufen, Verkaufen, Kontoeinstellungen, Barrierefreiheit oder Fehlerbehebung. Du kannst tippen, sprechen (Mikrofon-Taste) oder den Sprachmodus aktivieren, damit ich die Antworten vorlese.",
    thinking: "Aura denkt nach…",
    voice_mode_on: "Sprachmodus an",
    voice_mode_off: "Sprachmodus aus",
    voice_mode_description: "Antworten vorlesen",
    voice_continuous_on: "Hört immer zu",
    voice_continuous_off: "Drücken zum Sprechen",
    voice_continuous_description: "Sprich deine Frage, Aura antwortet laut, wiederhole",
    voice_speaking: "Aura spricht…",
    voice_listening: "Hört dir zu…",
    voice_no_support: "Sprache wird in diesem Browser nicht unterstützt. Versuche Chrome, Edge oder Safari.",
    input_hint: "Enter zum Senden. Shift+Enter neue Zeile. 🎤 für Sprache.",
  },
  hi: {
    name: "Aura",
    tagline: "आपकी एलिक्सियो सहायक",
    title: "Aura",
    subtitle: "एलिक्सियो के बारे में कुछ भी पूछें। Aura हमारे दस्तावेज़ों पर प्रशिक्षित है और 42 भाषाएँ बोलती है।",
    welcome_title: "नमस्ते! मैं Aura हूँ।",
    welcome_body: "एलिक्सियो के बारे में मुझसे कुछ भी पूछें — सुविधाएँ, मूल्य, खाता समस्याएँ, पहुँच। आप टाइप कर सकते हैं, बोल सकते हैं, या मुझे जवाब ज़ोर से पढ़ने के लिए कह सकते हैं।",
    welcome_body_long: "मैं Aura हूँ, एलिक्सियो की सहायक। मैंने हमारे दस्तावेज़, FAQ और सुविधा गाइड पढ़े हैं, इसलिए खरीदारी, बिक्री, खाता सेटिंग्स, पहुँच या समस्या निवारण के बारे में मुझसे कुछ भी पूछें। आप टाइप कर सकते हैं, बोल सकते हैं (माइक बटन), या वॉइस मोड चालू कर सकते हैं ताकि मैं जवाब ज़ोर से पढ़ सकूँ।",
    thinking: "Aura सोच रही है…",
    voice_mode_on: "वॉइस मोड चालू",
    voice_mode_off: "वॉइस मोड बंद",
    voice_mode_description: "जवाब ज़ोर से पढ़ें",
    voice_continuous_on: "हमेशा सुन रही है",
    voice_continuous_off: "बोलने के लिए दबाएँ",
    voice_continuous_description: "अपना सवाल बोलें, Aura ज़ोर से जवाब देगी, दोहराएँ",
    voice_speaking: "Aura बोल रही है…",
    voice_listening: "आपको सुन रही है…",
    voice_no_support: "इस ब्राउज़र में वॉइस समर्थित नहीं है। Chrome, Edge या Safari आज़माएँ।",
    input_hint: "भेजने के लिए Enter। नई लाइन के लिए Shift+Enter। वॉइस के लिए 🎤।",
  },
  pt: {
    name: "Aura",
    tagline: "Sua assistente da Elixio",
    title: "Aura",
    subtitle: "Pergunte o que quiser sobre a Elixio. Aura é treinada com nossa documentação e fala 42 idiomas.",
    welcome_title: "Olá! Eu sou a Aura.",
    welcome_body: "Pergunte-me qualquer coisa sobre a Elixio — recursos, preços, problemas de conta, acessibilidade. Você pode digitar, falar, ou pedir que eu leia as respostas em voz alta.",
    welcome_body_long: "Eu sou a Aura, a assistente da Elixio. Li nossa documentação, FAQ e guias de recursos, então pergunte-me qualquer coisa sobre comprar, vender, configurações de conta, acessibilidade ou solução de problemas. Você pode digitar, falar (botão de microfone) ou ativar o modo de voz para que eu leia as respostas em voz alta.",
    thinking: "Aura está pensando…",
    voice_mode_on: "Modo de voz ativado",
    voice_mode_off: "Modo de voz desativado",
    voice_mode_description: "Ler respostas em voz alta",
    voice_continuous_on: "Sempre ouvindo",
    voice_continuous_off: "Pressione para falar",
    voice_continuous_description: "Fale sua pergunta, Aura responde em voz alta, repita",
    voice_speaking: "Aura está falando…",
    voice_listening: "Ouvindo você…",
    voice_no_support: "A voz não é compatível com este navegador. Tente Chrome, Edge ou Safari.",
    input_hint: "Enter para enviar. Shift+Enter nova linha. 🎤 para voz.",
  },
  ar: {
    name: "Aura",
    tagline: "مساعدتك في إليكسو",
    title: "Aura",
    subtitle: "اسألي أي شيء عن إليكسو. Aura مُدرَّبة على وثائقنا وتتحدث 42 لغة.",
    welcome_title: "مرحبا! أنا أورا.",
    welcome_body: "اسأليني أي شيء عن إليكسو — الميزات، الأسعار، مشاكل الحساب، إمكانية الوصول. يمكنك الكتابة أو التحدث أو أن أقرأ الردود بصوت عالٍ.",
    welcome_body_long: "أنا أورا، مساعدة إليكسو. قرأت وثائقنا والأسئلة الشائعة وأدلة الميزات، فاسأليني أي شيء عن الشراء والبيع وإعدادات الحساب وإمكانية الوصول واستكشاف الأخطاء وإصلاحها. يمكنك الكتابة أو التحدث (زر الميكروفون) أو تفعيل وضع الصوت لأقرأ الردود بصوت عالٍ.",
    thinking: "أورا تفكر…",
    voice_mode_on: "وضع الصوت مفعّل",
    voice_mode_off: "وضع الصوت معطّل",
    voice_mode_description: "قراءة الردود بصوت عالٍ",
    voice_continuous_on: "أستمع دائما",
    voice_continuous_off: "اضغط للتحدث",
    voice_continuous_description: "تحدث بسؤالك، أورا تجيب بصوت عالٍ، كرر",
    voice_speaking: "أورا تتحدث…",
    voice_listening: "أستمع إليك…",
    voice_no_support: "الصوت غير مدعوم في هذا المتصفح. جرب Chrome أو Edge أو Safari.",
    input_hint: "Enter للإرسال. Shift+Enter سطر جديد. 🎤 للصوت.",
  },
  ur: {
    name: "Aura",
    tagline: "آپ کی ایلیکسیو معاون",
    title: "Aura",
    subtitle: "ایلیکسیو کے بارے میں کچھ بھی پوچھیں۔ Aura ہماری دستاویزات پر تربیت یافتہ ہے اور 42 زبانیں بولتی ہے۔",
    welcome_title: "السلام علیکم! میں اورا ہوں۔",
    welcome_body: "ایلیکسیو کے بارے میں مجھ سے کچھ بھی پوچھیں — خصوصیات، قیمتیں، اکاؤنٹ مسائل، رسائی۔ آپ ٹائپ کر سکتے ہیں، بول سکتے ہیں، یا مجھے جوابات بلند آواز سے پڑھنے کو کہ سکتے ہیں۔",
    welcome_body_long: "میں اورا ہوں، ایلیکسیو کی معاون۔ میں نے ہماری دستاویزات، عمومی سوالات اور خصوصیت گائیڈز پڑھے ہیں، اس لیے خرید و فروخت، اکاؤنٹ سیٹنگز، رسائی یا مسئلہ حل کرنے کے بارے میں مجھ سے کچھ بھی پوچھیں۔ آپ ٹائپ کر سکتے ہیں، بول سکتے ہیں (مائیک بٹن) یا صوتی موڈ فعال کر سکتے ہیں تاکہ میں جوابات بلند آواز سے پڑھ سکوں۔",
    thinking: "اورا سوچ رہی ہے…",
    voice_mode_on: "صوتی موڈ آن",
    voice_mode_off: "صوتی موڈ آف",
    voice_mode_description: "جوابات بلند آواز سے پڑھیں",
    voice_continuous_on: "ہمیشہ سن رہی ہے",
    voice_continuous_off: "بولنے کے لیے دبائیں",
    voice_continuous_description: "اپنا سوال بولیں، اورا بلند آواز سے جواب دے گی، دہرائیں",
    voice_speaking: "اورا بول رہی ہے…",
    voice_listening: "آپ کو سن رہی ہے…",
    voice_no_support: "یہ براؤزر آواز کی حمایت نہیں کرتا۔ Chrome، Edge یا Safari آزمائیں۔",
    input_hint: "بھیجنے کے لیے Enter۔ نئی لائن کے لیے Shift+Enter۔ آواز کے لیے 🎤۔",
  },
  he: {
    name: "Aura",
    tagline: "העוזרת שלך ב-Elixio",
    title: "Aura",
    subtitle: "שאלי כל דבר על Elixio. Aura מאומנת על התיעוד שלנו ומדברת 42 שפות.",
    welcome_title: "שלום! אני אורה.",
    welcome_body: "שאלי אותי כל דבר על Elixio — תכונות, מחירים, בעיות חשבון, נגישות. את יכולה לכתוב, לדבר, או לבקש שאקרא תשובות בקול רם.",
    welcome_body_long: "אני אורה, העוזרת של Elixio. קראתי את התיעוד, השאלות הנפוצות ומדריכי התכונות שלנו, אז שאלי אותי כל דבר על קנייה, מכירה, הגדרות חשבון, נגישות או פתרון בעיות. את יכולה לכתוב, לדבר (כפתור מיקרופון) או להפעיל מצב קולי שיקרא לי את התשובות בקול רם.",
    thinking: "אורה חושבת…",
    voice_mode_on: "מצב קולי מופעל",
    voice_mode_off: "מצב קולי כבוי",
    voice_mode_description: "קרא תשובות בקול רם",
    voice_continuous_on: "תמיד מקשיבה",
    voice_continuous_off: "לחצי כדי לדבר",
    voice_continuous_description: "אמרי את השאלה שלך, אורה עונה בקול רם, חזרי על הפעולה",
    voice_speaking: "אורה מדברת…",
    voice_listening: "מקשיבה לך…",
    voice_no_support: "קול לא נתמך בדפדפן הזה. נסי Chrome, Edge או Safari.",
    input_hint: "Enter לשליחה. Shift+Enter שורה חדשה. 🎤 לקול.",
  },
  zh: {
    name: "Aura",
    tagline: "你的 Elixio 助手",
    title: "Aura",
    subtitle: "询问任何关于 Elixio 的问题。Aura 经过我们的文档训练，能说 42 种语言。",
    welcome_title: "你好！我是 Aura。",
    welcome_body: "关于 Elixio 的任何问题都可以问我——功能、价格、账户问题、无障碍。你可以打字、说话，或者让我大声朗读回答。",
    welcome_body_long: "我是 Aura，Elixio 的助手。我读过我们的文档、常见问题和功能指南，所以关于购买、销售、账户设置、无障碍或故障排除的任何问题都可以问我。你可以打字、说话（麦克风按钮），或者开启语音模式让我大声朗读回答。",
    thinking: "Aura 正在思考…",
    voice_mode_on: "语音模式已开启",
    voice_mode_off: "语音模式已关闭",
    voice_mode_description: "大声朗读回答",
    voice_continuous_on: "始终在听",
    voice_continuous_off: "按下说话",
    voice_continuous_description: "说出你的问题，Aura 大声回答，重复",
    voice_speaking: "Aura 正在说话…",
    voice_listening: "正在听你说话…",
    voice_no_support: "此浏览器不支持语音。试试 Chrome、Edge 或 Safari。",
    input_hint: "Enter 发送。Shift+Enter 换行。🎤 语音。",
  },
  "zh-TW": {
    name: "Aura",
    tagline: "你的 Elixio 助手",
    title: "Aura",
    subtitle: "詢問任何關於 Elixio 的問題。Aura 經過我們的文件訓練，能說 42 種語言。",
    welcome_title: "你好！我是 Aura。",
    welcome_body: "關於 Elixio 的任何問題都可以問我——功能、價格、帳號問題、無障礙。你可以打字、說話，或讓我大聲朗讀回答。",
    welcome_body_long: "我是 Aura，Elixio 的助手。我讀過我們的文件、常見問題和功能指南，所以關於購買、銷售、帳號設定、無障礙或疑難排解的任何問題都可以問我。你可以打字、說話（麥克風按鈕），或開啟語音模式讓我大聲朗讀回答。",
    thinking: "Aura 正在思考…",
    voice_mode_on: "語音模式已開啟",
    voice_mode_off: "語音模式已關閉",
    voice_mode_description: "大聲朗讀回答",
    voice_continuous_on: "始終在聽",
    voice_continuous_off: "按下說話",
    voice_continuous_description: "說出你的問題，Aura 大聲回答，重複",
    voice_speaking: "Aura 正在說話…",
    voice_listening: "正在聽你說話…",
    voice_no_support: "此瀏覽器不支援語音。試試 Chrome、Edge 或 Safari。",
    input_hint: "Enter 傳送。Shift+Enter 換行。🎤 語音。",
  },
  ja: {
    name: "Aura",
    tagline: "あなたの Elixio アシスタント",
    title: "Aura",
    subtitle: "Elixio について何でも聞いてください。Aura はドキュメントで訓練され、42 言語を話します。",
    welcome_title: "こんにちは！Aura です。",
    welcome_body: "Elixio について何でも聞いてください — 機能、価格、アカウントの問題、アクセシビリティ。入力、音声、または読み上げで回答を受け取れます。",
    welcome_body_long: "私は Aura、Elixio のアシスタントです。ドキュメント、FAQ、機能ガイドをすべて読んでいるので、購入、販売、アカウント設定、アクセシビリティ、トラブルシューティングについて何でも聞いてください。入力、音声（マイクボタン）、または読み上げモードで回答を聞くことができます。",
    thinking: "Aura 考え中…",
    voice_mode_on: "音声モードオン",
    voice_mode_off: "音声モードオフ",
    voice_mode_description: "回答を読み上げる",
    voice_continuous_on: "常に聞いています",
    voice_continuous_off: "押して話す",
    voice_continuous_description: "質問を話すと、Aura が大声で答えます。繰り返せます",
    voice_speaking: "Aura 話しています…",
    voice_listening: "聞いています…",
    voice_no_support: "このブラウザは音声をサポートしていません。Chrome、Edge、または Safari を試してください。",
    input_hint: "Enter で送信。Shift+Enter で改行。🎤 で音声。",
  },
  ko: {
    name: "Aura",
    tagline: "당신의 Elixio 도우미",
    title: "Aura",
    subtitle: "Elixio에 대해 무엇이든 물어보세요. Aura는 문서로 학습되었으며 42개 언어를 구사합니다.",
    welcome_title: "안녕하세요! Aura입니다.",
    welcome_body: "Elixio에 대해 무엇이든 물어보세요 — 기능, 가격, 계정 문제, 접근성. 입력하거나, 음성으로 말하거나, 대답을 소리 내어 읽게 할 수 있습니다.",
    welcome_body_long: "저는 Aura, Elixio의 도우미입니다. 문서, FAQ, 기능 가이드를 모두 읽었으므로 구매, 판매, 계정 설정, 접근성 또는 문제 해결에 대해 무엇이든 물어보세요. 입력하거나(텍스트), 말하거나(마이크 버튼), 음성 모드를 켜서 대답을 소리 내어 읽게 할 수 있습니다.",
    thinking: "Aura 생각 중…",
    voice_mode_on: "음성 모드 켜짐",
    voice_mode_off: "음성 모드 꺼짐",
    voice_mode_description: "대답을 소리 내어 읽기",
    voice_continuous_on: "항상 듣는 중",
    voice_continuous_off: "눌러서 말하기",
    voice_continuous_description: "질문을 말하면, Aura가 소리 내어 대답합니다. 반복하세요",
    voice_speaking: "Aura 말하는 중…",
    voice_listening: "듣는 중…",
    voice_no_support: "이 브라우저는 음성을 지원하지 않습니다. Chrome, Edge 또는 Safari를 시도하세요.",
    input_hint: "Enter로 보내기. Shift+Enter로 새 줄. 🎤로 음성.",
  },
};

// Run the merge
const updated = [];
for (const [locale, strings] of Object.entries(localized)) {
  const file = resolve(MESSAGES_DIR, `${locale}.json`);
  let messages;
  try {
    messages = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`Failed to read ${file}:`, e.message);
    continue;
  }

  // Ensure the chat block exists (create it if missing)
  if (!messages.chat) {
    messages.chat = {};
  }

  // Merge our localized strings (preserves any existing keys)
  const before = JSON.stringify(messages.chat);
  Object.assign(messages.chat, strings);
  const after = JSON.stringify(messages.chat);

  if (before === after) {
    console.log(`  ${locale}: no changes`);
    continue;
  }

  writeFileSync(file, JSON.stringify(messages, null, 2) + "\n", "utf8");
  updated.push(locale);
  console.log(`  ${locale}: updated (${Object.keys(strings).length} keys)`);
}

console.log(`\nDone. Updated ${updated.length} locale files: ${updated.join(", ")}`);