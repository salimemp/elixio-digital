# Elixio Features

## Buying on Elixio

### Browse and search
Visit /explore to browse the marketplace. Filter by category, price
range, and rating. Search supports typos and synonyms (powered by
Postgres full-text search).

### Purchase and download
Click any asset to view details, previews, and reviews. After
purchase, your asset appears in /library. Click "Download" to get a
signed URL valid for 1 hour. You can re-download from /library as long
as your access is active.

### Library and downloads
Your purchased items live at /library. The download history (with
IP and timestamp for security) is also visible there.

### Reviews
You can leave a review on any asset you've purchased. Reviews are
moderated for spam and abuse.

### Refunds
If an asset doesn't work as described, contact the creator first.
If unresolved, email support@elixiodigital.com within 7 days of
purchase for a full refund.

## Selling on Elixio

### Become a creator
Go to /auth/register/creator or click "Start Selling" in the nav.
You'll set up a storefront (URL slug) and your first asset.

### Upload an asset
From /dashboard, click "New Asset". Add a title, description, category,
price, and the actual files. We support any file type up to 2 GB
per file (chunked uploads for larger).

### AI tools (Studio)
The Studio at /studio gives you four AI tools powered by Gemini:
- Listing copywriter — generates titles, descriptions, tags
- Asset critique — reviews your preview image and suggests improvements
- Sales coach — analyzes your conversion and suggests price/positioning
- Metadata SEO — generates keywords and meta tags for discoverability

### Bulk operations
From /dashboard/bulk, you can update many assets at once: change
prices, add tags, publish/draft, delete. Operations are recorded and
non-destructive ones can be rolled back.

### Analytics
From /dashboard, you see revenue, top assets, conversion rate,
cohort retention, and traffic sources. Export as CSV.

### Payouts
Connect a Stripe account from /dashboard/payouts. We pay out weekly
on Tuesdays for sales older than 7 days (refund window).

## Accessibility

### Voice control
The accessibility toolbar (bottom-left, person icon) has:
- Read aloud (text-to-speech) — speaks the page in your language
- Dictation (speech-to-text) — fills any text field with your voice
- Font size — 75% / 100% / 112.5% / 125% / 150%
- High contrast — for low vision
- Reset — clear all accessibility preferences

### Keyboard navigation
Tab through all controls. Skip-to-content link appears when you
press Tab on any page.

### Screen reader support
All pages have proper ARIA labels, live regions for dynamic updates,
and a logical heading hierarchy.

### Languages
42 languages including RTL (Arabic, Hebrew, Urdu). The chat widget
and AI tools respond in your selected language.
