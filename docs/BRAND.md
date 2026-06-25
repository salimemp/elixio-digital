# Brand — Elixio Digital

> Single source of truth for the brand mark, color, and wordmark. All
> new surface area (web pages, mobile screens, marketing, social cards)
> should pull from this doc.

---

## The name

- **Brand name (display):** Elixio Digital
- **Wordmark lowercase:** `elixio`
- **Wordmark small caps suffix:** `DIGITAL` (letter-spaced +6)
- **Pronounced:** /ɪˈlɪk.si.oʊ/ — rhymes with "video", with a soft "k"

> "Elixio" is a play on "elixir" — something that transforms the ordinary into
> the valuable. The marketplace is where creators turn their craft into income.

## The mark — "Petal E"

Three rounded horizontal bars on a dark rounded square, in a purple-to-pink
gradient. The bars are stacked and the middle one is shorter, suggesting:

- An abstract `E` (for Elixio)
- Three layers of value (premium tier concept)
- A petal/leaf (organic, growing)
- Forward motion (bars extend right)

| Variant | Use | Path |
| --- | --- | --- |
| **Master SVG** | Brand source, scaling, future use | `brand/mark.svg` |
| **Wordmark SVG** | Marketing, OG cards, docs | `brand/wordmark.svg` |
| **Favicon SVG** | Modern browsers, prefers-color-scheme | `brand/favicon.svg` |
| **Web app icons** | Next.js auto-pickup | `apps/web/src/app/{icon,apple-icon}.svg` |
| **PWA + Apple touch** | Web app install + iOS home screen | `apps/web/public/{apple-touch-icon,icon-192,icon-512}.png` |
| **Legacy ICO** | Older browsers, IE tab-fallback | `apps/web/public/favicon.ico` (16+32+48 packed) |
| **Expo app icon** | iOS + Android app stores | `apps/mobile/assets/icon.png` (1024×1024) |
| **Android adaptive** | Android launcher backgrounds | `apps/mobile/assets/adaptive-icon.png` (1024×1024) |
| **Splash screen** | Cold-start before first render | `apps/mobile/assets/splash-icon.png` (1024×1024) |

> All raster assets are generated from `brand/mark.svg` /
> `brand/favicon.svg` via `scripts/generate-brand-assets.py`. Re-run
> that script after editing the source SVGs.

## Colors

The brand mark uses a darker, more premium palette than the app's
playful "gum" interior. The app palette is the user's experience; the
brand palette is the company's voice.

| Token | Hex | Use |
| --- | --- | --- |
| `brand/purple` | `#7B61FF` | Primary accent, wordmark, gradient start |
| `brand/pink` | `#FF90E8` | Secondary accent, gradient end |
| `brand/black` | `#111111` | Mark background, body text |
| `brand/cream` | `#FFFDF5` | Light surfaces, marketing cards |
| `brand/gradient` | `linear-gradient(135deg, #7B61FF 0%, #B45CFF 55%, #FF90E8 100%)` | Hero sections, OG cards |

The app's interior palette remains untouched:

| Token | Hex | Use |
| --- | --- | --- |
| `gum/cream` | `#fffdf5` | App background |
| `gum/pink` | `#ff90e8` | Buttons, badges |
| `gum/purple` | `#7b61ff` | Active state, links |
| `gum/mint` | `#96f7d6` | Success, positive |
| `gum/yellow` | `#f1e05a` | Highlight, "new" |
| `gum/black` | `#111111` | Strokes, headings |

## Don'ts

- Don't stretch the mark out of proportion. Maintain 1:1.
- Don't add drop shadows, glows, or strokes to the bars.
- Don't replace the gradient with a flat color (unless the asset is monochrome by context — e.g. single-color print).
- Don't put the wordmark on a busy background. The dark mark needs breathing room.
- Don't translate the name. "Elixio" is the brand.

## When to update the brand

- After a major product repositioning
- If the visual identity is no longer recognisable at 16×16
- If the color is being confused with a competitor

For everything else, leave it alone. Brand recognition compounds over time.
