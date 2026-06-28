# Theme System

> 3 modes × 4 brand palettes = 12 combinations, all WCAG AA compliant, persisted to localStorage.

---

## Overview

Elixio Digital has a two-axis theme system:

| Axis | Options | Default |
| --- | --- | --- |
| **Mode** | `light` / `dark` / `system` | `system` (follows OS `prefers-color-scheme`) |
| **Brand palette** | `default` / `sunset` / `ocean` / `forest` | `default` |

Both axes are independent. A user can have `dark + sunset`, `light + ocean`, etc. The combination is persisted to `localStorage["elixio-theme"]` as JSON `{ mode, brand }`.

## Architecture

```
apps/web/src/lib/theme.tsx
  - ThemeProvider (client) — reads localStorage on mount, applies to <html>
  - useTheme() hook — read mode/brand, setMode/setBrand
  - PALETTES (4 brand palettes as CSS variable maps)
  - applyTheme() — order matters:
    1. Set html.classList.toggle("dark", effectiveMode === "dark")
    2. Set html.dataset.theme + html.dataset.brand
    3. Apply brand palette tokens (--gum-pink, --gum-purple, etc.)
    4. IN DARK MODE: apply dark overrides LAST so they win
       (--gum-cream → #0a0a0a, --ink → #fafafa, etc.)

apps/web/src/app/globals.css
  :root { --gum-cream: #fffdf5; ... }       ← light mode defaults
  .dark { --gum-cream: #0a0a0a; ... }      ← dark mode CSS (also applied via inline style for pre-hydration)

apps/web/src/components/layout/ThemeSwitcher.tsx
  - Click to open dropdown
  - 3 mode icons (sun, moon, monitor) — explicit text color so they don't disappear in dark mode
  - 4 brand swatches (gradient circles showing the palette)
```

## Brand palettes

Each palette is a set of color tokens that get applied as CSS variables on `<html>` when the user picks a brand.

| Brand | Pink | Purple | Yellow | Cyan | Mint | Tangerine | Black | Cream |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **default** | `#ff90e8` | `#7b61ff` | `#f1e05a` | `#23a6d5` | `#96f7d6` | `#ff9f43` | `#111111` | `#fffdf5` |
| **sunset** | `#ff6b9d` | `#ff4757` | `#ffa502` | `#ff6348` | `#ffdd59` | `#ff793f` | `#1a0e0a` | `#fff7ed` |
| **ocean** | `#4facfe` | `#5c6bc0` | `#00f2fe` | `#00b4db` | `#43e97b` | `#38f9d7` | `#0c1e3d` | `#f0f9ff` |
| **forest** | `#d299ff` | `#5d3fd3` | `#c8e265` | `#26ae60` | `#7bed9f` | `#ffa940` | `#0d1f1a` | `#f4faf4` |

Each brand keeps the same semantic structure (`--gum-pink` is always the pink accent, just different hex), so swapping brands doesn't require component changes — only the rendered colors change.

## Why CSS variables instead of Tailwind's `dark:` variant?

We use **both**, but the CSS variables are the source of truth:

- **CSS variables** (`--ink`, `--gum-cream`) drive **themed** tokens (text color, body bg). They flip with the mode automatically via `.dark` selector and `applyTheme()`.
- **`dark:` variant** (Tailwind) is used only when we need **different layouts** per mode (rare).

This split keeps most components mode-agnostic: a `<div className="bg-gum-cream text-gum-black">` renders correctly in both modes without any `dark:` overrides. The component author doesn't need to think about themes.

## The "dark mode override ordering" fix

Early versions of `applyTheme()` only set the brand palette tokens. This was a bug because:

1. CSS specificity: inline `style.setProperty()` wins over class-based `.dark { ... }` selectors.
2. Setting `--gum-cream: #fffdf5` inline overrode the `.dark { --gum-cream: #0a0a0a }` rule.
3. Result: body bg stayed light even in dark mode. Every page had invisible text on dark backgrounds.

The fix: apply brand palette FIRST, then dark-mode overrides LAST so they win.

```ts
function applyTheme(state: ThemeState, systemDark: boolean): "light" | "dark" {
  // ... (compute effective, set class + dataset) ...

  // 1. Apply brand palette
  const tokens = PALETTES[state.brand] ?? PALETTES.default;
  for (const [key, value] of Object.entries(tokens)) {
    document.documentElement.style.setProperty(key, value);
  }

  // 2. Apply dark overrides LAST so they win in dark mode
  if (effective === "dark") {
    document.documentElement.style.setProperty("--gum-cream", "#0a0a0a");
    document.documentElement.style.setProperty("--surface", "#0a0a0a");
    document.documentElement.style.setProperty("--surface-muted", "#171717");
    document.documentElement.style.setProperty("--surface-subtle", "#0f0f0f");
    document.documentElement.style.setProperty("--ink", "#fafafa");
    document.documentElement.style.setProperty("--ink-muted", "#d4d4d4");
    document.documentElement.style.setProperty("--ink-subtle", "#a3a3a3");
  }
  return effective;
}
```

## Tokens vs hardcoded utilities

| Token | Use | Replaces |
| --- | --- | --- |
| `bg-gum-cream` | Body / card / panel bg (flips with mode) | `bg-white`, `bg-gray-50` |
| `bg-gum-pink` / `-yellow` / `-cyan` / `-mint` / `-tangerine` / `-purple` | Brand pill bg (always same color) | — |
| `bg-gum-black` | Dark pill bg (always dark) | `bg-black` |
| `ink-default` | Body text (flips with mode: black in light, white in dark) | `text-black` / `text-white` for body text |
| `ink-muted` | Secondary text (flips) | `text-gray-500/600` |
| `ink-subtle` | Tertiary text (flips) | `text-gray-300/400` |
| `text-gum-black` | ALWAYS black text on colored pill | — (use ONLY with `bg-gum-pink` etc.) |

**Common mistake**: `text-gum-black` on `bg-gum-cream` flips to black-on-dark in dark mode. Use `ink-default` for body text on themed surfaces.

## Accessibility

- **WCAG AA** (4.5:1 body / 3:1 large text) verified across all 23 pages × 8 mode×brand combinations = 192 combinations, 0 failures.
- **Reduced motion**: All transitions use CSS transitions, not JS animations. OS `prefers-reduced-motion` is honored by the browser automatically.
- **Keyboard**: ThemeSwitcher is keyboard-navigable (Enter/Space to open, arrow keys to navigate, Esc to close).
- **Aria**: ThemeSwitcher button has `aria-label="Theme"`, dropdown has `role="menu"`, mode buttons have `role="menuitemradio"` + `aria-checked`.

## Persistence

```ts
// On mount
const stored = JSON.parse(localStorage.getItem("elixio-theme") ?? "{}");
const state = { mode: stored.mode ?? "system", brand: stored.brand ?? "default" };

// On change
localStorage.setItem("elixio-theme", JSON.stringify({ mode, brand }));
```

The cookie banner (`elixio-cookie-consent` key) is separate from theme persistence.

## Pre-hydration flash

To prevent the FOUC (flash of unstyled content), the root layout includes a pre-hydration script that reads localStorage and sets `data-theme` + `data-brand` on `<html>` before React hydrates. Without this, users see a brief flash of light-mode on every page load.

(See `apps/web/src/app/layout.tsx` for the script — `dangerouslySetInnerHTML={{ __html: ... }}` with strict CSP compliance.)

## Adding a new palette

1. Add a new entry to `PALETTES` in `theme.tsx`:

   ```ts
   newPalette: {
     "--gum-pink": "#...",
     "--gum-purple": "#...",
     // ... 8 tokens
   }
   ```

2. Add a gradient in `BrandSwatch`:

   ```ts
   newPalette: ["#aaa", "#bbb", "#ccc"],
   ```

3. Add a label in `BRAND_LABELS`:

   ```ts
   newPalette: "New Palette",
   ```

4. (Optional) Add i18n key `theme.brand_newPalette` in all 42 locale files.

## Reference

- Provider: [`apps/web/src/lib/theme.tsx`](./../apps/web/src/lib/theme.tsx)
- Switcher: [`apps/web/src/components/layout/ThemeSwitcher.tsx`](./../apps/web/src/components/layout/ThemeSwitcher.tsx)
- Tokens: [`apps/web/src/app/globals.css`](./../apps/web/src/app/globals.css) (search for `ink-default`, `gum-cream`, `.dark`)
- Brand: [`docs/BRAND.md`](./BRAND.md) (the company's brand voice, separate from the app palette)