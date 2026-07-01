#!/usr/bin/env node
/**
 * Adds MFA setup + passkeys page i18n keys to all 42 locale files.
 *
 * Strategy:
 *   - English (en.json) gets the canonical strings.
 *   - Other locales get English placeholders (they already do for
 *     most keys via runtime fallback — but explicit keys make the
 *     translation handoff clearer).
 *
 * Idempotent — safe to re-run.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = path.resolve(__dirname, "../apps/web/messages");

const mfaKeys = {
  back_to_security: "Back to security",
  page_title: "Set up two-factor authentication",
  page_subtitle:
    "Add a one-time code from an authenticator app as a second login factor.",
  start: {
    body: "Two-factor authentication protects your account by requiring a 6-digit code from your authenticator app (Google Authenticator, 1Password, Authy, etc.) in addition to your password.",
    cta: "Start setup",
  },
  errors: {
    setup_failed: "Could not start setup. Please try again.",
    code_required: "Please enter the 6-digit code.",
    verify_failed: "That code didn't work. Try again with a fresh code.",
    disable_failed: "Could not disable two-factor. Please try again.",
  },
  verify: {
    scan_instruction:
      "Scan this QR code with your authenticator app, then enter the 6-digit code below.",
    qr_alt: "Two-factor QR code",
    manual_entry_toggle: "Can't scan? Enter the secret manually.",
    code_label: "6-digit code",
    cta: "Verify and enable",
  },
  backup: {
    success_notice: "Two-factor authentication enabled.",
    title: "Save your backup codes",
    instruction:
      "These one-time codes let you sign in if you lose access to your authenticator. Each code works once. Save them somewhere safe — you won't see them again.",
    copy: "Copy",
    done: "Done",
  },
  active: {
    enabled_notice: "Two-factor authentication is on.",
    body: "Your account is protected. Disable only if you're sure — without it, anyone with your password can sign in.",
    disable_cta: "Disable two-factor",
    disable_confirm:
      "This removes the second factor from your account. Anyone with your password will be able to sign in.",
    disable_confirm_cta: "Yes, disable",
  },
  disabled: {
    notice: "Two-factor authentication has been disabled.",
    re_enable_cta: "Re-enable two-factor",
  },
};

const passkeysKeys = {
  back_to_security: "Back to security",
  page_title: "Passkeys",
  page_subtitle:
    "Sign in with a fingerprint, face, or hardware security key — no password needed.",
  add: {
    title: "Add a passkey",
    subtitle:
      "Your device will ask you to verify with your fingerprint, face, or security key.",
    name_placeholder: "Name (e.g. MacBook Touch ID)",
    cta: "Add passkey",
    registering: "Waiting for your device…",
  },
  list: {
    title: "Your passkeys",
    empty: "No passkeys yet. Add one above to enable passwordless sign-in.",
    unnamed: "Unnamed passkey",
    created: "Added",
    last_used: "last used",
    confirm_delete: "Delete this passkey?",
  },
  errors: {
    load_failed: "Could not load your passkeys.",
    unsupported:
      "This browser doesn't support passkeys. Try the latest Chrome, Safari, Edge, or Firefox.",
    register_failed: "Could not register the passkey. Please try again.",
    rename_failed: "Could not rename the passkey.",
    delete_failed: "Could not delete the passkey.",
  },
  success: {
    added: "Passkey added. You can now sign in with it.",
    deleted: "Passkey removed.",
  },
  info: {
    rename_in_memory_only:
      "Rename support is local-only for now — your change will appear in this list until you reload.",
  },
};

const authSignInRequiredKey = {
  sign_in_required: "Please sign in to view this page.",
};

// Keys that must never be assigned via merge — they would mutate
// the global Object prototype and pollute every object in the
// process. JSON.parse() filters `__proto__` from parsed strings
// in modern Node, but defense in depth + we still iterate keys
// from sources that may have been mutated by upstream code.
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function deepMerge(target, source) {
  if (typeof source !== "object" || source === null || Array.isArray(source)) {
    return source;
  }
  if (typeof target !== "object" || target === null || Array.isArray(target)) {
    target = {};
  }
  for (const key of Object.keys(source)) {
    if (FORBIDDEN_KEYS.has(key)) continue; // skip prototype-polluting keys
    if (
      typeof source[key] === "object" &&
      source[key] !== null &&
      !Array.isArray(source[key])
    ) {
      target[key] = deepMerge(target[key] ?? {}, source[key]);
    } else if (!(key in target)) {
      target[key] = source[key];
    }
  }
  return target;
}

function loadLocale(code) {
  const file = path.join(MESSAGES_DIR, `${code}.json`);
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeLocale(code, data) {
  const file = path.join(MESSAGES_DIR, `${code}.json`);
  // Stable formatting: 2-space indent, no trailing newline chaos
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

// Read all locale files
const locales = [
  "en", "es", "fr", "de", "hi", "pt", "ar", "ur", "he",
  "zh", "zh-TW", "ja", "ko",
  "ru", "it", "nl", "pl", "tr", "vi",
  "id", "ms", "th", "ta", "te",
  "bn", "bg", "ca", "cs", "da", "el", "et", "fi", "hr", "hu",
  "lt", "lv", "no", "ro", "sk", "sl", "sv", "uk",
];

let enChanged = 0;
let otherChanged = 0;

for (const locale of locales) {
  const data = loadLocale(locale);
  const isEnglish = locale === "en";

  // Add auth.sign_in_required if missing
  const beforeAuth = JSON.stringify(data.auth ?? {});
  data.auth = deepMerge(data.auth ?? {}, authSignInRequiredKey);

  // Add mfa + passkeys blocks
  const beforeMfa = JSON.stringify(data.mfa ?? {});
  data.mfa = deepMerge(data.mfa ?? {}, mfaKeys);

  const beforePasskeys = JSON.stringify(data.passkeys ?? {});
  data.passkeys = deepMerge(data.passkeys ?? {}, passkeysKeys);

  // For non-English locales, replace any missing nested strings with
  // the English value (deepMerge already does this when target[key] missing).
  if (!isEnglish) {
    // Force non-English to use English placeholders for any missing keys
    const enData = loadLocale("en");
    const ensureEnglishFallback = (target, source) => {
      for (const k of Object.keys(source)) {
        // Defense in depth: skip prototype-polluting keys so a
        // malicious or malformed locale JSON can't mutate
        // Object.prototype globally. (CodeQL js/prototype-pollution-utility)
        if (FORBIDDEN_KEYS.has(k)) continue;
        if (
          typeof source[k] === "object" &&
          source[k] !== null &&
          !Array.isArray(source[k])
        ) {
          target[k] = ensureEnglishFallback(target[k] ?? {}, source[k]);
        } else if (target[k] === undefined) {
          target[k] = source[k];
        }
      }
      return target;
    };
    data.mfa = ensureEnglishFallback(data.mfa, enData.mfa ?? {});
    data.passkeys = ensureEnglishFallback(data.passkeys, enData.passkeys ?? {});
  }

  writeLocale(locale, data);

  const afterAuth = JSON.stringify(data.auth ?? {});
  const afterMfa = JSON.stringify(data.mfa ?? {});
  const afterPasskeys = JSON.stringify(data.passkeys ?? {});

  const changed =
    beforeAuth !== afterAuth ||
    beforeMfa !== afterMfa ||
    beforePasskeys !== afterPasskeys;

  if (changed) {
    if (isEnglish) enChanged++;
    else otherChanged++;
  }
}

console.log(`Added keys to ${enChanged} English + ${otherChanged} other locales.`);
console.log(`Total: ${enChanged + otherChanged} of ${locales.length} locales updated.`);