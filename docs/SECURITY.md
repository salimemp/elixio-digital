# Security

> JWT auth with strict role separation, DB-backed sliding-window rate limits, HSTS + CSP via helmet, new-location alerts, MFA + passkeys, weekly CodeQL.

---

## Overview

Elixio Digital is built with security-first defaults for a marketplace that handles money and personal data. This doc covers authentication, authorization, rate limiting, encryption, secret management, headers, monitoring, and supply-chain scanning.

| Concern | Approach |
| --- | --- |
| Authentication | JWT (15min access + 7d refresh), bcrypt(12) passwords, MFA (TOTP + WebAuthn passkeys), OAuth (Google, GitHub), magic link |
| Authorization | `requireBuyer` / `requireCreator` / `requireAdmin` Fastify decorators with **DB role re-check** (defense in depth — JWT claims can be stale) |
| Rate limiting | DB-backed sliding-window per action (10/15min login, 5/hr register, 3/hr password-reset, 3/15min magic-link, 5/5min MFA) + global 2000/min/IP via `@fastify/rate-limit` |
| Password security | bcrypt cost 12 + HIBP k-anonymity check (fails open on network error) + 8-char min + letter/number/special complexity |
| Headers | HSTS 2yr preload, strict CSP via `@fastify/helmet`, X-Frame-Options: DENY |
| Encryption at rest | AES-256-GCM for TOTP seeds and OAuth tokens (key in env, separate from DB) |
| Encryption in transit | TLS 1.3 everywhere (Railway-managed cert, Cloudflare proxy) |
| Monitoring | Login attempts geo-tagged (ipapi.co, 7-day cache); new-location alerts via email; rate-limit exceptions logged |
| Scanning | Weekly CodeQL (`security-and-quality` query pack) via GitHub Actions |

## Authentication

### Registration

```
POST /v1/auth/register
Body: { email, password, displayName, signupType: "buyer" | "creator" }
```

Flow:

1. **Zod validation** of input shape.
2. **`checkPassword(password)`** runs `validatePasswordStrength()` + `checkPwnedPassword()` (HIBP k-anonymity).
3. **`bcrypt.hash(password, 12)`** stores the hash.
4. **`limitRegister(clientIp)`** DB-backed sliding window (5/hr per IP).
5. **Email verification** email sent (24h TTL token). Verification is non-fatal — user can log in but sees a "verify your email" banner.
6. **Log** to `logs/creators.log` or `logs/buyers.log` based on `signupType`.
7. **Return** `{ accessToken, refreshToken, user: { id, email, role, ... } }`.

### Login

```
POST /v1/auth/login
Body: { email, password }
```

Flow:

1. **`limitLogin(email)`** DB-backed (10/15min per email-or-IP).
2. **Lookup user** by email.
3. **`bcrypt.compare(password, user.passwordHash)`**.
4. **Geo lookup** via ipapi.co (7-day cache, fails open).
5. **New-location check** via `isLoginFromNewLocation(userId, ip, geo)`.
6. If new location: send security email (fire-and-forget, 3x retry with backoff in `sendEmail`).
7. **`issueSession(user)`** returns access + refresh tokens.
8. **Log** to `LoginAttempt` table (success/fail, IP, geo, MFA status).

### JWT

```
Header: { alg: "HS256", typ: "JWT" }
Payload: {
  userId: string;
  email: string;
  role: "buyer" | "creator" | "admin";
  isCreator: boolean;
  isAdmin: boolean;
  iat: number;
  exp: number;
}
```

- **Access token**: 15-minute TTL, signed with `JWT_SECRET`.
- **Refresh token**: 7-day TTL, stored in `RefreshToken` table for rotation/revocation. Sliding window: each refresh issues a new token, old one is marked revoked.

### MFA

- **TOTP** (`pyotp` server-side, `qr_flutter` client-side). Secrets encrypted at rest with AES-256-GCM.
- **Backup codes**: 10 alphanumeric codes, generated with rejection sampling (not modulo-biased — see `generateBackupCode`).
- **WebAuthn / passkeys** via `@simplewebauthn/server`. Public keys stored; private keys never leave the device.

### OAuth

- Google + GitHub via `arctic` library.
- OAuth tokens (access + refresh) encrypted at rest with AES-256-GCM.

### Magic link

- 15-minute single-use token sent via email.
- Rate-limited to 3/15min per email.

### Password reset

- 1-hour single-use token sent via email.
- Rate-limited to 3/hr per email.

## Authorization

### Role guards (`apps/api/src/plugins/auth.ts`)

```ts
app.decorate("requireCreator", async (request, reply) => {
  if (!request.user) {
    reply.status(401).send({ error: { code: "UNAUTHORIZED" } });
    return;
  }
  if (request.user.isAdmin) return;  // admins pass everything
  // STRICT: re-check DB row. JWT claims can be stale if role was changed.
  const u = await prisma.user.findUnique({
    where: { id: request.user.userId },
    select: { isCreator: true, role: true },
  });
  if (!u || (u.role !== "admin" && !u.isCreator)) {
    reply.status(403).send({
      error: { code: "FORBIDDEN", message: "Creator access required", role: request.user.role },
    });
  }
});
```

Three guards:

- `requireBuyer` — buyer-only routes (`/downloads/*` etc.). Returns 403 for creators.
- `requireCreator` — creator-only routes (`/creator/*`). Returns 403 for buyers.
- `requireAdmin` — admin-only routes (`/admin/*`). JWT-claim check only (no DB re-check — admins don't get downgraded often).

**Why DB re-check on buyer/creator**: If an admin demotes a creator to buyer (or vice versa), the old JWT still says the old role. The DB re-check catches this within 15 minutes (when the access token expires).

## Rate limiting

Two layers:

### Per-action (`apps/api/src/lib/rate-limit.ts`)

DB-backed sliding-window via `RateLimitBucket` table. Per-action limits:

| Action | Limit | Window | Key |
| --- | --- | --- | --- |
| Login | 10 | 15 min | email OR IP |
| Register | 5 | 1 hr | IP |
| Password reset | 3 | 1 hr | email |
| Magic link | 3 | 15 min | email |
| MFA verify | 5 | 5 min | userId |

### Global (`@fastify/rate-limit`)

2000 requests per minute per IP. Key generator uses `cf-connecting-ip` (Cloudflare) when behind the proxy, falls back to `request.ip`.

`/health` endpoint is excluded from rate limits so monitoring probes don't get 429'd.

## Password security

```ts
// apps/api/src/lib/password-security.ts
export const validatePasswordStrength = (password: string): PasswordIssue[] => {
  const issues: PasswordIssue[] = [];
  if (password.length < 8) issues.push("too-short");
  if (password.length > 128) issues.push("too-long");
  if (!/[A-Za-z]/.test(password)) issues.push("no-letter");
  if (!/\d/.test(password)) issues.push("no-number");
  if (!/[^A-Za-z0-9\s]/.test(password)) issues.push("no-special");
  return issues;
};
```

HIBP check uses k-anonymity: we send only the first 5 hex chars of the SHA-1 hash to `https://api.pwnedpasswords.com/range/{prefix}`, get matching suffixes, and look up locally. **The full hash never leaves the server.**

**Fail-open on network error**: We allow the password if HIBP is unreachable. Rationale: blocking users on a flaky dependency is worse than letting one in. The strong-password policy already covers common weakness.

## Headers (`@fastify/helmet`)

```ts
await app.register(helmet, {
  // Default Helmet config + our additions
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://*.vercel.app"],
      // ...
    },
  },
  hsts: {
    maxAge: 63072000,  // 2 years in seconds
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: "deny" },  // X-Frame-Options: DENY (no iframes)
  // ...
});
```

- **HSTS preload**: 2 years, include subdomains, eligible for browser preload list.
- **Strict CSP**: Only allow scripts from self + Vercel (our deploy target).
- **X-Frame-Options DENY**: Prevents clickjacking via iframe embedding.
- **X-Content-Type-Options nosniff**: Prevents MIME sniffing.

## Encryption at rest

| Field | Method | Key location |
| --- | --- | --- |
| User passwords | bcrypt(cost=12) | N/A (one-way) |
| TOTP seeds | AES-256-GCM | `ELIXIO_MFA_KEY_ENCRYPTION_KEY` (separate from DB) |
| OAuth tokens | AES-256-GCM | Same key |
| WebAuthn public keys | Stored plain | Public by design |

Key management: `ELIXIO_MFA_KEY_ENCRYPTION_KEY` is a 32-byte random base64 value stored in Railway env vars (NOT in the database). If the DB is dumped, the attacker still needs this key to decrypt TOTP secrets.

## Monitoring

### Login attempts

Every login attempt (success + fail) is logged to `LoginAttempt` with:

- `email`, `userId`
- `success`, `failureReason`
- `ip`, `userAgent`
- `geo` (country, city from ipapi.co)
- `isNewLocation` (boolean)

Admin dashboard (planned P1) lets the operator see suspicious patterns (e.g., one user account trying to log in from 10 countries in 1 hour).

### New-location security alerts

When a user signs in from a country they haven't used before, we send a security email (fire-and-forget). The user can:

1. Ignore (if it was them).
2. Change password + enable MFA (if not them).

The check uses 7-day caching of `ipapi.co` lookups and compares the new country to the set of countries in their login history.

## Supply-chain security

### CodeQL

`.github/workflows/codeql.yml` runs on push, PRs, weekly Monday 06:37 UTC, and `workflow_dispatch`.

- **Query pack**: `security-and-quality` (~150 rules including security, correctness, performance).
- **Languages**: javascript-typescript.
- **Build mode**: `none` (we analyze at source — no build step needed for TS).
- **Config**: `.github/codeql/codeql-config.yml` excludes false-positive files via `paths-ignore`. `.github/codeql/SUPPRESSIONS.md` documents the rationale for each dismissal.

### Dependency audits

- `pnpm audit` in CI catches known vulnerabilities in transitive deps.
- Lockfile (`pnpm-lock.yaml`) is committed — every dep version is reproducible.
- Renovate (not yet enabled) is on the roadmap for automated PR-based upgrades.

## Backups

- Railway Postgres: automatic daily snapshots, retained 7 days.
- Test database: separate from prod, can be wiped safely.
- Backups are encrypted at rest (Railway-managed).

## Incident response

If we suspect a breach:

1. **Rotate `JWT_SECRET`** immediately → invalidates all access tokens.
2. **Rotate `ELIXIO_MFA_KEY_ENCRYPTION_KEY`** → re-encrypts TOTP secrets on next user MFA verify.
3. **Rotate OAuth client secrets** (Google, GitHub) → invalidates third-party tokens.
4. **Force-logout all users** by deleting all `RefreshToken` rows.
5. **Email all users** with a security notice (transactional email path is independent of auth).
6. **Notify GDPR authorities within 72h** if EU users' data is impacted (per Article 33).

## Reference

- Auth plugin: [`apps/api/src/plugins/auth.ts`](./../apps/api/src/plugins/auth.ts) (73 lines, 18 tests)
- Password security: [`apps/api/src/lib/password-security.ts`](./../apps/api/src/lib/password-security.ts) (30 tests)
- Rate limiter: [`apps/api/src/lib/rate-limit.ts`](./../apps/api/src/lib/rate-limit.ts)
- Email: [`apps/api/src/services/email.ts`](./../apps/api/src/services/email.ts)
- CodeQL workflow: [`.github/workflows/codeql.yml`](./../.github/workflows/codeql.yml)
- CodeQL config: [`.github/codeql/codeql-config.yml`](./../.github/codeql/codeql-config.yml)
- Secrets: [`docs/SECRETS.md`](./SECRETS.md)
- Plan (Phase 1/2 security scope): [`docs/PLAN.md`](./PLAN.md)