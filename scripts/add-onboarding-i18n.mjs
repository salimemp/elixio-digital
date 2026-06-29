#!/usr/bin/env node
/**
 * Adds the /onboarding page i18n keys to the 12 priority/CJK locales.
 * Adds them as English fallbacks; professional translation can be
 * done later by a human translator.
 *
 * Run from monorepo root: node scripts/add-onboarding-i18n.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = resolve(__dirname, "../apps/web/messages");

// All keys get the English value for now (run-time fallback would do
// the same, but adding them explicitly makes the locale files complete
// and translator-friendly).
const en = JSON.parse(readFileSync(resolve(MESSAGES_DIR, "en.json"), "utf8"));
const onboarding = en.onboarding;

if (!onboarding) {
  console.error("en.json has no onboarding block — aborting");
  process.exit(1);
}

const LOCALES = [
  "es", "fr", "de", "hi", "pt", "ar", "ur", "he",
  "zh", "zh-TW", "ja", "ko",
];

let updated = 0;
for (const locale of LOCALES) {
  const file = resolve(MESSAGES_DIR, `${locale}.json`);
  let messages;
  try {
    messages = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`  Failed to read ${file}:`, e.message);
    continue;
  }

  // Set/replace the onboarding block with the English version
  // (translator can localize later; run-time fallback would do this
  // implicitly but explicit keys are clearer for the translation team).
  messages.onboarding = onboarding;
  writeFileSync(file, JSON.stringify(messages, null, 2) + "\n", "utf8");
  updated++;
  console.log(`  ${locale}: added onboarding block (${Object.keys(onboarding).length} keys)`);
}

console.log(`\nDone. Updated ${updated} locale files.`);
console.log(`NOTE: Values are English placeholders. A human translator should`);
console.log(`localize them properly. The runtime fallback to English would have`);
console.log(`worked anyway, but explicit keys make the translation handoff clear.`);