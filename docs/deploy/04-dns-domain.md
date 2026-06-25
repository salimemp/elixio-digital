# Step 4 — DNS and Custom Domains

This wires the custom domain to your deploys. After this step:
- `https://elixiodigital.com` → Cloudflare Pages
- `https://api.elixiodigital.com` → Railway API
- Email DNS (Resend) is verified
- HSTS is on

## 4.1 Add `elixiodigital.com` to Cloudflare

1. Go to https://dash.cloudflare.com → **Add a site** → `elixiodigital.com`.
2. Cloudflare will scan for existing DNS records. Review them — the Hostinger parking page means there's likely an `A` record pointing at Hostinger's parking IP. **Delete that record.**
3. Cloudflare gives you two nameservers (e.g., `chip.ns.cloudflare.com`, `kara.ns.cloudflare.com`).
4. Go to your **Hostinger domain settings** (or wherever you bought `elixiodigital.com`) → change the nameservers to the Cloudflare ones.
5. Wait 5–30 minutes for the nameserver switch to propagate. Cloudflare emails you when active.

## 4.2 Add DNS records

In Cloudflare → **DNS** → **Records**, add:

| Type | Name | Value | Proxy |
| --- | --- | --- | --- |
| `CNAME` | `@` | `elixio-digital.pages.dev` | Proxied (orange cloud) |
| `CNAME` | `api` | `<railway-subdomain>.up.railway.app` | **DNS only** (grey cloud) — Railway handles its own TLS |
| `CNAME` | `www` | `elixio-digital.pages.dev` | Proxied |
| `TXT` | `@` | (Resend DKIM record — see step 4.4) | n/a |
| `TXT` | `@` | `v=spf1 include:_spf.resend.com ~all` | n/a |

> Find the Railway subdomain in the API service's **Settings** → **Domains** → the auto-generated `*.up.railway.app` value.

## 4.3 Add the custom domain to Cloudflare Pages

1. Pages → **elixio-digital** → **Custom domains** → **Set up a custom domain**.
2. Enter `elixiodigital.com`. Cloudflare auto-detects the CNAME you just created.
3. Wait for the SSL certificate to provision (~2 minutes for Cloudflare-managed).
4. Repeat for `www.elixiodigital.com` (redirect to apex).

## 4.4 Add the custom domain to Railway

1. Railway → API service → **Settings** → **Domains** → **Add Domain**.
2. Enter `api.elixiodigital.com`. Railway will give you the target (e.g., `api.elixiodigital.com.up.railway.app`) — but because you already have the CNAME pointing at `*.up.railway.app`, you can just confirm.
3. Railway auto-provisions a Let's Encrypt cert.

## 4.5 Verify Resend DKIM

Resend gives you three CNAME records when you add the domain. Add them in Cloudflare:

| Type | Name | Value |
| --- | --- | --- |
| `CNAME` | `resend._domainkey` | (Resend-provided) |
| `CNAME` | `resend2._domainkey` | (Resend-provided) |
| `CNAME` | `resend3._domainkey` | (Resend-provided) |

Back in Resend → **Domains** → wait for the green checkmark.

## 4.6 Update environment variables

Now that the real URLs work, update:

| Where | Variable | New value |
| --- | --- | --- |
| Railway API | `ELIXIO_API_URL` | `https://api.elixiodigital.com` |
| Railway API | `ELIXIO_WEB_URL` | `https://elixiodigital.com` |
| Cloudflare Pages (Production) | `NEXT_PUBLIC_API_URL` | `https://api.elixiodigital.com` |
| EAS `eas.json` (preview + production) | `EXPO_PUBLIC_API_URL` | `https://api.elixiodigital.com` |
| Google OAuth | Authorized redirect URIs | add `https://api.elixiodigital.com/v1/auth/oauth/google/callback` |
| GitHub OAuth App | Authorization callback URL | add `https://api.elixiodigital.com/v1/auth/oauth/github/callback` |

After saving, redeploy each service. Railway does this automatically when you change a variable.

## 4.7 HSTS (optional but recommended)

Cloudflare → **SSL/TLS** → **Edge Certificates** → enable **Always Use HTTPS** + **HTTP Strict Transport Security (HSTS)** with `max-age=31536000; includeSubDomains; preload`.

## ✅ Done when

- `https://elixiodigital.com` shows the Elixio Digital landing page.
- `https://api.elixiodigital.com/v1/health` returns `ok`.
- `dig api.elixiodigital.com` returns the Railway hostname.
- Resend shows the green check for `elixiodigital.com`.

## Next

→ [05-secrets.md](./05-secrets.md) — wire GitHub Secrets so CI can deploy + run admin scripts.
