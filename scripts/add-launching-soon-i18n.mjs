#!/usr/bin/env node
/**
 * Adds the "Launching Soon" caption to the 12 priority/CJK locale
 * files. Only touches the two new keys (launch_badge + launch_aria),
 * preserving all other existing content.
 *
 * Run from monorepo root: node scripts/add-launching-soon-i18n.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = resolve(__dirname, "../apps/web/messages");

const localized = {
  en: { launch_badge: "🚀 Launching Soon", launch_aria: "Elixio is launching soon" },
  es: { launch_badge: "🚀 Próximamente", launch_aria: "Elixio se lanza pronto" },
  fr: { launch_badge: "🚀 Bientôt disponible", launch_aria: "Elixio arrive bientôt" },
  de: { launch_badge: "🚀 Demnächst verfügbar", launch_aria: "Elixio startet bald" },
  hi: { launch_badge: "🚀 जल्द आ रहा है", launch_aria: "एलिक्सियो जल्द लॉन्च हो रहा है" },
  pt: { launch_badge: "🚀 Em breve", launch_aria: "Elixio será lançado em breve" },
  ar: { launch_badge: "🚀 قريباً", launch_aria: "إليكسو ستطلق قريباً" },
  ur: { launch_badge: "🚀 جلد آرہا ہے", launch_aria: "ایلیکسیو جلد لانچ ہو رہا ہے" },
  he: { launch_badge: "🚀 בקרוב", launch_aria: "Elixio יושק בקרוב" },
  zh: { launch_badge: "🚀 即将上线", launch_aria: "Elixio 即将上线" },
  "zh-TW": { launch_badge: "🚀 即將上線", launch_aria: "Elixio 即將上線" },
  ja: { launch_badge: "🚀 近日公開", launch_aria: "Elixio 近日公開" },
  ko: { launch_badge: "🚀 곧 출시", launch_aria: "Elixio 곧 출시" },
};

let updated = 0;
for (const [locale, strings] of Object.entries(localized)) {
  const file = resolve(MESSAGES_DIR, `${locale}.json`);
  let messages;
  try {
    messages = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`  Failed to read ${file}:`, e.message);
    continue;
  }
  if (!messages.home) {
    messages.home = {};
  }
  Object.assign(messages.home, strings);
  writeFileSync(file, JSON.stringify(messages, null, 2) + "\n", "utf8");
  console.log(`  ${locale}: added launch_badge + launch_aria`);
  updated++;
}

console.log(`\nDone. Updated ${updated} locale files.`);
console.log(`\nTo remove the "Launching Soon" caption later, run:`);
console.log(`  git revert HEAD  (or delete the TEMPORARY block in apps/web/src/app/page.tsx)`);