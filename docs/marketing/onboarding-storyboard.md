# Onboarding Video — Storyboard

**Format:** 16:9 (1920×1080), 30 fps
**Duration:** 6:30 (10 scenes)
**Style:** Mixed product screencast + motion graphics + light 2D animation. No live action.

This storyboard gives shot-by-shot direction for the editor or for an AI video generation pipeline. Each frame is described in terms of: what's on screen, what moves, what sound plays, what the voiceover says.

---

## Color palette
- Gum pink: `#ff90e8`
- Gum purple: `#7b61ff`
- Gum yellow: `#f1e05a`
- Gum mint: `#96f7d6`
- Gum cyan: `#23a6d5`
- Gum black: `#111111`
- Gum cream: `#fffdf5`
- Sunset red: `#ff4757`
- Forest green: `#26ae60`
- Ink: `#111111`
- Ink muted: `#525252`

## Typography
- **Display:** Inter (Extra Bold for headlines, Regular for body)
- **Serif:** IBM Plex Serif (for emphasis lines only)
- **Monospace:** JetBrains Mono (for code blocks if any)

## Logo
- White wordmark "Elixio Digital" on gum-purple background
- ✨ emoji (spark) for Aura
- Sticky-positioned mark in top-left of every frame

---

## SCENE 1 — HOOK (0:00–0:18, 18s, 540 frames)

| Frame | Time | What you see | What moves | Sound |
|---|---|---|---|---|
| 1.1 | 0:00–0:03 | Black background. Centered white text: "You made something great." | Text types in (left to right) over 0.8s | Single synth note (C major, soft attack) |
| 1.2 | 0:04–0:05 | Cut. A 3D model rotating on a turntable (gum-purple bg) | Slow rotation | Soft click on cut |
| 1.3 | 0:05–0:06 | Cut. A Notion template card sliding in from left | Slide-in (0.3s) | Click |
| 1.4 | 0:06–0:07 | Cut. A Photoshop brush preview | Pop-in (0.3s) | Click |
| 1.5 | 0:07–0:08 | Cut. A code repo screenshot | Fade-in (0.3s) | Click |
| 1.6 | 0:08–0:13 | All four items fly toward center, condense into a gum-purple card. Card shows prices: $4.99, $12.00, $29, $0.99 | Items converge over 1.5s. Card scales up. | Soft swoosh |
| 1.7 | 0:14–0:17 | Card tilts (rotateX 15deg). Text below: "Selling digital work shouldn't be this hard." | Tilt + text fade-in | Subtle bass note |
| 1.8 | 0:17–0:18 | Card and text fade out. Elixio logo wipes in from right. | Logo wipe (0.3s) | Logo "snap" sound |

### Voiceover
> "You made something great. A template, a brush, a 3D model, a snippet. And you want to sell it. So you set up a storefront, you price it, you write the description, you do taxes, you deal with payments, you wait. There has to be a better way."

### On-screen text (English)
- 0:00 — "You made something great."
- 0:14 — "Selling digital work shouldn't be this hard."

### Captions
See `apps/web/public/captions/onboarding-en.vtt` line 1-4.

---

## SCENE 2 — PROBLEM (0:18–0:48, 30s, 900 frames)

| Frame | Time | What you see | What moves | Sound |
|---|---|---|---|---|
| 2.1 | 0:18–0:24 | 2x2 grid of "friction" vignettes. Top-left: an invoice with 12% circled red. Top-right: PayPal decline screen. Bottom-left: Google Doc with 47 tabs. Bottom-right: Support ticket "5-7 days". | Each vignette fades in sequentially (0.3s each) | Soft ticks |
| 2.2 | 0:24–0:32 | Single number counter. "0" → "11 hours/week on platform admin" | Counter ticks up over 3s. Satisfying ding at 11. | Soft ticking, ding at end |
| 2.3 | 0:32–0:40 | Four stat blocks appear one at a time, stacked vertically | Slide-in from left (0.4s each) | Soft "pop" on each |
| 2.4 | 0:40–0:46 | All four blocks pull toward center, collapse into a frustrated face made of red squiggles. Face crumbles (particles fly out). | Convergence + crumble (1.5s) | Crumple sound (paper) |
| 2.5 | 0:46–0:48 | Black. White text: "There's a better way." | Text fade-in | Final bass note |

### Voiceover
> "Creators don't hate selling — they hate selling around the friction. Eleven hours a week on platform admin, not on creating. Forty-seven percent of you say platform fees are the biggest pain. Almost a third of you have lost a sale because payment processing failed. And most platforms take a week to answer a support question. We think that's broken. So we built Elixio."

### On-screen text
- 0:24 — "11 hours/week on platform admin"
- 0:32 — "47% of creators say platform fees are their #1 frustration"
- 0:34 — "32% have lost a sale to a payment processing failure"
- 0:36 — "68% want better analytics, not more dashboards"
- 0:38 — "5-7 days average support response time"
- 0:46 — "There's a better way."

---

## SCENE 3 — INTRO TO ELIXIO (0:48–1:33, 45s, 1350 frames)

| Frame | Time | What you see | What moves | Sound |
|---|---|---|---|---|
| 3.1 | 0:48–0:52 | Logo reveal. Gum-purple background, white wordmark, ✨ next to it. Subtitle: "Digital marketplace for creators." | Soft pop animation (0.4s) | Logo "snap" |
| 3.2 | 0:52–0:56 | Cut. /explore page. Real product UI. | Slow pan from top to bottom (3s) | Ambient UI sound |
| 3.3 | 0:56–1:00 | Cut. Asset detail page. | Pan across (3s) | Ambient UI sound |
| 3.4 | 1:00–1:08 | Cut. /chat page. Aura avatar (✨) appears in the corner. Aura says: "Hi! I'm Aura, your Elixio assistant." | Aura slides in (0.4s), text types in (0.8s) | Soft "ding" |
| 3.5 | 1:08–1:12 | User types a question. Aura responds. User clicks 🔊 button. Aura "speaks" (waveform animation). | Click on 🔊, waveform animates | TTS "voice" sample (1-2s of Aura's actual response) |
| 3.6 | 1:12–1:22 | Cut. Accessibility toolbar (bottom-left). Font size slider, high contrast, voice controls. A user with hand on screen reader shown briefly. | Toolbar slides in (0.4s), font size increases 100% → 125% | Click sounds |
| 3.7 | 1:22–1:30 | Cut. Top-right globe icon. Page text cycles through 12 languages: EN → ES → FR → DE → HI → PT → AR → UR → HE → ZH → JA → KO. Each language flag appears for 0.6s. | Language fade | Soft whoosh each |
| 3.8 | 1:30–1:33 | Hold. Gum-cream background. Centered: "elixiodigital.com" + subtitle "The marketplace where creators and buyers meet without the platform tax headaches." | Slow zoom-in (0.5s) | Soft pad swell |

### Voiceover
> "Elixio is a marketplace built for digital creators, by people who've been frustrated by marketplaces. We have the things you'd expect: a beautiful storefront, secure checkout, instant delivery. But we've also built things nobody else has. Aura — our AI assistant that knows every page of our docs and speaks forty-two languages. A full accessibility layer: text-to-speech, speech-to-text, voice-mode continuous conversation. Forty-two-locale translation built in, RTL included. All of it running on the same docs the community maintains, so it stays accurate."

### On-screen text
- 0:48 — "Elixio Digital" (logo)
- 1:00 — "✨ Hi! I'm Aura, your Elixio assistant."
- 1:30 — "elixiodigital.com" + subtitle

---

## SCENE 4 — BUYER EXPERIENCE (1:33–2:15, 42s, 1260 frames)

| Frame | Time | What you see | What moves | Sound |
|---|---|---|---|---|
| 4.1 | 1:33–1:36 | Section title card. "BUYER EXPERIENCE" in gum-purple on cream. | Slide-in from top (0.3s) | Soft tick |
| 4.2 | 1:36–1:40 | /explore page. Filter sidebar opens. | Sidebar expands (0.4s) | Click |
| 4.3 | 1:40–1:48 | Click an asset. Asset detail page opens. Gallery, description, reviews, Buy now button. | Click + page transition (0.5s) | Click, page "whoosh" |
| 4.4 | 1:48–1:52 | Click Buy now. Checkout shows tax calculation: 3 country tabs cycle (US $0 → EU €2.40 → India ₹90). | Tab cycle | Click on each tab |
| 4.5 | 1:52–1:58 | Payment completes. Redirect to /library. Asset appears with Download button. Click Download. | Page transition (0.4s) | Success "ding" |
| 4.6 | 1:58–2:05 | Library view. Asset list. Review prompt appears for one. User clicks 5 stars. | Stars animate | Click, "ding" |
| 4.7 | 2:05–2:15 | Five feature bullets appear one at a time on a clean Elixio background. | Bullets slide in (0.3s each) | Soft ticks |

### Voiceover
> "Buying on Elixio is fast. Smart search handles typos. Checkout shows you the exact tax in your country — we cover 127 regions, US, EU, UK, India, Japan, Brazil, the GCC, and more. Pay with Stripe, Apple Pay, Google Pay, or local methods. Your file is ready the second payment clears. You can re-download any time from your library. And every review on the platform is from a verified buyer — no fakes, no shills."

### On-screen text (feature bullets)
- 2:06 — "🔍 Smart search with typo tolerance"
- 2:07 — "🌍 127 tax regions, auto-calculated"
- 2:08 — "📥 Instant download, signed URLs"
- 2:09 — "♾️ Re-download anytime from your library"
- 2:10 — "⭐ Verified reviews from real buyers"

---

## SCENE 5 — CREATOR EXPERIENCE (2:15–3:05, 50s, 1500 frames)

| Frame | Time | What you see | What moves | Sound |
|---|---|---|---|---|
| 5.1 | 2:15–2:18 | Section title card. "CREATOR EXPERIENCE" in gum-purple on cream. | Slide-in | Tick |
| 5.2 | 2:18–2:25 | /dashboard. Top stats: revenue, top assets, conversion, cohort. | Numbers count up (2s) | Subtle ticking |
| 5.3 | 2:25–2:35 | Cut. /studio. Listing copywriter. User types: "Minimalist wedding invitation pack with 5 designs, A5 size." Full listing generates over 8s. | Type-in (2s) → generation animation (8s) | Type sounds, "generation" tone |
| 5.4 | 2:35–2:45 | Cut. Asset critique. Upload a preview. AI scores it. Suggestions appear. Cut to sales coach. | Upload animation + score reveal | "ding" on score |
| 5.5 | 2:45–2:55 | Cut. /dashboard/bulk. 200 assets selected. "Update prices +10%" button. Click. Progress bar fills in 1.5s. | Selection animation (1s) + click + progress bar | Click + progress sound |
| 5.6 | 2:55–3:05 | Five feature bullets. | Slide in | Ticks |

### Voiceover
> "Selling is where it gets interesting. Your dashboard shows revenue, top assets, conversion, and cohort retention in real time. Our AI Studio writes your listing copy, critiques your preview image, coaches you on pricing, and generates your SEO metadata. Bulk operations let you update two hundred assets in one click — change prices, add tags, publish, archive — with a thirty-day rollback if you change your mind. We take a flat 10% — no monthly fee, no listing fee. You keep 90% of every sale. We pay out weekly on Tuesdays, in your currency, to 135 countries."

### On-screen text
- 2:15 — "CREATOR EXPERIENCE"
- 2:56 — "🤖 4 AI tools: copywriter, critique, coach, SEO"
- 2:57 — "📊 Revenue + cohort analytics"
- 2:58 — "🔄 Bulk operations with 30-day rollback"
- 2:59 — "💸 90% creator share, 10% platform fee"
- 3:00 — "🌐 Sell in 135 countries, 25+ payout methods"

---

## SCENE 6 — COMPETITOR COMPARISON (3:05–4:05, 60s, 1800 frames)

| Frame | Time | What you see | What moves | Sound |
|---|---|---|---|---|
| 6.1 | 3:05–3:10 | Title card. "HOW DOES ELIXIO COMPARE?" | Slide in | Tick |
| 6.2 | 3:10–3:12 | Empty table appears. Headers: Feature / Elixio / Gumroad / iLovePDF / Etsy Digital. | Headers fade in | Soft ticks |
| 6.3 | 3:12–3:35 | Rows appear one at a time. Winning cell (Elixio) pulses mint-green when revealed. | Row slide-in + pulse | Tick on each row |
| 6.4 | 3:35–3:50 | Three callouts appear with arrows pointing to specific cells. | Callouts pop in (0.4s each) | "pop" sound |
| 6.5 | 3:50–4:05 | Hold on the full table. Camera slowly pulls back to show all of it. | Slow zoom-out | Soft pad swell |

### Voiceover
> "How does Elixio compare? We took a look at the biggest names. Gumroad: ten percent plus a ten-dollar monthly Pro fee, no AI tools, seven languages, and you handle your own taxes. iLovePDF: free, but it's a PDF tool, not a marketplace — and they don't sell. Etsy Digital: six-point-five percent plus twenty cents per listing, fourteen languages, and you'll set up your own tax calculator. Elixio is ten percent flat, no monthly fee, four built-in AI tools, Aura in forty-two languages, voice controls, a hundred and twenty-seven tax regions, and we file your GDPR and CCPA paperwork for you. Every feature on this slide is built in. Nothing's a paid add-on."

### On-screen text — the comparison table

| Feature | Elixio | Gumroad | iLovePDF | Etsy Digital |
|---|---|---|---|---|
| Platform fee | **10% flat** | 10% + $10/mo Pro | 0% (PDF only) | 6.5% + $0.20 listing |
| Free to start | **Yes** | Yes (10% fee) | Yes | No ($0.20/listing) |
| Built-in AI tools | **4 (copywriter, critique, coach, SEO)** | None | None | None |
| AI assistant (chatbot) | **Aura, 42 languages** | None | None | None |
| Voice / accessibility | **TTS + STT, WCAG 2.1 AA** | None | None | None |
| Languages | **42 (RTL included)** | 7 | 1 | 14 |
| Tax regions | **127 (auto-calc)** | 1 (you handle) | 0 | 1 (you handle) |
| Built-in PDF tools | **Yes (PDF→images, bundle, metadata)** | No | Yes (PDF only) | No |
| Payout methods | **135 countries** | 50+ | 0 (creator pays) | 50+ |
| Bulk ops + rollback | **Yes (30-day)** | No | No | No |
| GDPR + CCPA + PIPEDA | **Yes (built-in)** | Partial | Yes | Partial |
| Open API + webhooks | **Yes** | Yes | No | Limited |
| Mobile app | **Coming Q3** | Yes | Yes | Yes |

### Callouts
- 3:35 — "No monthly fees, ever. 90% goes to you." (arrow to "10% flat" cell)
- 3:40 — "Every other platform says 'use ChatGPT separately.' We don't." (arrow to "Built-in AI tools" row)
- 3:45 — "Aura speaks 42 languages. The competition averages 6." (arrow to "Languages" row)

---

## SCENE 7 — HOW TO USE: BUYERS (4:05–4:35, 30s, 900 frames)

| Frame | Time | What you see | What moves | Sound |
|---|---|---|---|---|
| 7.1 | 4:05–4:10 | Title card. "FOR BUYERS: 3 STEPS" | Slide in | Tick |
| 7.2 | 4:10–4:15 | Step 1: "Search". /explore. User types "wedding invitation". | Type-in (3s) | Type sounds |
| 7.3 | 4:15–4:22 | Step 2: "Buy". Asset page. Click Buy. Checkout shows local tax. Click Pay. | Click + page transitions | Click, success "ding" |
| 7.4 | 4:22–4:30 | Step 3: "Download". /library. Click Download. | Click + download animation | "Download" sound |
| 7.5 | 4:30–4:35 | Hero shot. "That's it. Three steps. 90 seconds." | Fade in | Pad swell |

### Voiceover
> "If you're a buyer, three steps. Search the marketplace. Buy with one click — your local tax is calculated automatically. Download instantly. The whole thing takes about ninety seconds. And you can re-download any time from your library."

---

## SCENE 8 — HOW TO USE: CREATORS (4:35–5:25, 50s, 1500 frames)

| Frame | Time | What you see | What moves | Sound |
|---|---|---|---|---|
| 8.1 | 4:35–4:40 | Title card. "FOR CREATORS: 5 STEPS" | Slide in | Tick |
| 8.2 | 4:40–4:48 | Step 1: "Sign up". Click "Start Selling." Email + password. Pick slug. | Form interactions (3s) | Click + type sounds |
| 8.3 | 4:48–4:55 | Step 2: "Add your first asset". /dashboard. Click "New asset". Upload files. | File picker + upload animation | Click + upload sound |
| 8.4 | 4:55–5:02 | Step 3: "Let Aura write your listing". /studio. Type one line. Generate. | Type + generation | Type + "generation" tone |
| 8.5 | 5:02–5:10 | Step 4: "Publish". Preview. Click Publish. | Click | Success "ding" |
| 8.6 | 5:10–5:18 | Step 5: "Get paid". Connect Stripe. Payout schedule. | Stripe Connect flow (3s) | Click |
| 8.7 | 5:18–5:25 | Hero shot. "Five steps. 10 minutes. Sell tonight." | Fade in | Pad swell |

### Voiceover
> "If you're a creator, five steps. Sign up — pick a username and a URL slug for your storefront. Add your first asset — title, description, price, files up to two gigabytes each, chunked uploads. Let our AI write your listing copy for you from a one-line description. Click publish. Connect your payout method — Stripe in most countries, Razorpay in India. Five steps, about ten minutes. You could be selling tonight."

---

## SCENE 9 — AURA + VOICE (5:25–5:55, 30s, 900 frames)

| Frame | Time | What you see | What moves | Sound |
|---|---|---|---|---|
| 9.1 | 5:25–5:30 | /chat page. Aura greets. Quick demo: language switch EN → ES → JA. | Language tabs | Tab click |
| 9.2 | 5:30–5:38 | User clicks 🎙️ (continuous voice mode). User speaks: "What languages do you support?" Aura responds with text + speaks aloud. STT picks up next question, Aura answers. | Voice mode toggle + animated audio wave | Voice + speech + TTS audio |
| 9.3 | 5:38–5:45 | Accessibility toolbar (bottom-left). Font size, high contrast, TTS, motion. | Toolbar slide-in + interactions | Click sounds |
| 9.4 | 5:45–5:55 | Three callouts. | Pop in | Ticks |

### Voiceover
> "One more thing. Meet Aura — our AI assistant trained on every page of our documentation. She speaks forty-two languages, including Arabic, Hebrew, and Urdu with full right-to-left support. Toggle continuous voice mode, and you can have a real hands-free conversation: you speak, she answers, you speak again. And every accessibility feature you'd expect — text-to-speech, speech-to-text, full keyboard navigation, screen reader support, WCAG two point one AA compliance — built in from day one."

### On-screen text
- 5:25 — "✨ Meet Aura"
- 5:45 — "🗣️ Aura speaks 42 languages"
- 5:48 — "🎙️ Continuous voice conversation"
- 5:51 — "♿ WCAG 2.1 AA, full keyboard nav, screen reader support"

---

## SCENE 10 — CLOSING + CTA (5:55–6:30, 35s, 1050 frames)

| Frame | Time | What you see | What moves | Sound |
|---|---|---|---|---|
| 10.1 | 5:55–6:05 | Hero shot. Elixio logo. "elixiodigital.com" + tagline. | Slow zoom | Pad swell + sustained chord |
| 10.2 | 6:05–6:15 | Three CTA cards appear, one per second. | Slide up (0.4s each) | "pop" on each |
| 10.3 | 6:15–6:25 | Footer: "elixiodigital.com • hello@elixiodigital.com • @elixiodigital on every platform" | Fade in | Ambient music |
| 10.4 | 6:25–6:30 | Final. Cream background. URL pulses. Fade to black. | Pulse + fade | Final fade-out |

### Voiceover
> "Elixio. The marketplace where creators and buyers meet without the platform tax headaches. Start buying, start selling, or just ask Aura anything. Elixiodigital.com. We'll see you there."

### On-screen text
- 5:55 — "Elixio Digital" (logo) + "elixiodigital.com"
- 6:05 — "🛍️ Start buying"
- 6:08 — "🎨 Start selling"
- 6:11 — "💬 Ask Aura"
- 6:15 — "elixiodigital.com • hello@elixiodigital.com • @elixiodigital on every platform"

---

## Production specs

- **Resolution:** 1920×1080
- **Frame rate:** 30 fps
- **Color space:** sRGB
- **Codec:** H.264 (for web delivery), ProRes 422 HQ (for archival)
- **Audio:** AAC LC, 48 kHz, 320 kbps, stereo
- **Captions:** WebVTT format (12 languages: en, es, fr, de, hi, pt, ar, ur, he, zh, zh-TW, ja, ko)
- **Loudness target:** -16 LUFS integrated (YouTube optimal), -12 LUFS (broadcast)
- **File size:** ~50-80 MB at H.264 1080p
- **Hosting:** /public/onboarding-video.mp4, served via Vercel CDN

## AI video generation prompts (per scene)

For matrix MCP `matrix_batch_text_to_video` (if available) or other text-to-video tools, use prompts like:

### Scene 1.1 (0:00-0:03)
> "A dark background fades in. White text 'You made something great.' types onto the screen letter by letter in a clean sans-serif font. Soft cinematic lighting. 1080p, 30fps, 3 seconds."

### Scene 3.4 (1:00-1:08)
> "A modern chat interface with a friendly AI assistant. The assistant's avatar is a soft glowing yellow spark emoji. Text appears: 'Hi! I'm Aura, your Elixio assistant.' Clean UI, soft purple background, modern web design. 1080p, 30fps, 8 seconds."

### Scene 6.3 (3:12-3:35)
> "A clean comparison table appears row by row. Four columns: Elixio, Gumroad, iLovePDF, Etsy Digital. Rows include platform fee, free to start, AI tools, languages, tax regions. Elixio column has a subtle mint-green highlight on each row. 1080p, 30fps, 23 seconds."

(Continue for each shot that needs AI generation. Product screencasts (Scenes 2-5, 7-8) should be recorded as actual screen captures from the live elixiodigital.com app.)

---

## Distribution channels

- [ ] **elioxiodigital.com/onboarding** (primary, embedded HTML5 player with captions)
- [ ] **YouTube** (upload as unlisted first, then public; 12 language tracks via YouTube's CC)
- [ ] **Homepage hero** (autoplay muted, loop, click to unmute)
- [ ] **/auth/register** (gate for both buyer and creator signup, plays on page load)
- [ ] **Email welcome series** (Day 1 email links to /onboarding)
- [ ] **Twitter/X** (60s cut for social — Scene 6 comparison + Scene 3 intro)
- [ ] **LinkedIn** (full 6:30, native upload, professional context)
- [ ] **YouTube ads** (15s cut = Scene 1 hook + Scene 10 CTA)

## Cuts to produce

- [ ] 6:30 master (full)
- [ ] 2:00 "How Elixio compares" (Scene 6 only, with VO)
- [ ] 1:00 "Meet Aura" (Scene 9 only, with VO)
- [ ] 0:30 "Why Elixio" (Scene 1 hook + Scene 10 CTA, music only, no VO)
- [ ] 0:15 "Get started" (Scene 10 CTA only, music only, no VO)

## Cost & time estimate

If produced in-house with the existing team:
- **Screen recordings:** 2 hours (capture all product UI states)
- **Motion graphics:** 8-12 hours (After Effects or Motion)
- **Voiceover (English):** 1 hour studio time
- **Voiceover (11 translations):** 11 hours studio time (1 hour each, with native speaker)
- **Editing + assembly:** 6-8 hours
- **Localization (SRT files):** 4 hours
- **Distribution + upload:** 2 hours
- **Total:** ~36-42 hours of work, ~$3-5k cost (voice talent is the biggest line item)

If outsourced to a video production agency: $8-15k for a polished version with custom motion graphics and stock music.