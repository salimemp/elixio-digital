# Account and privacy

## Account types
Elixio has two account types: Buyer and Creator. A single account
can be both — you can buy without becoming a creator, and you can
become a creator at any time from /profile.

## Profile
Your profile lives at /profile. From there you can:
- Edit your display name, bio, and avatar
- Manage security (password, MFA, passkeys, OAuth, sessions)
- Configure notification preferences
- Export or delete your data
- Update your public storefront (creators only)

## Security
We support:
- Email + password (with HIBP breach check + strength meter)
- Magic link login (passwordless)
- OAuth: Google, GitHub
- Passkeys (Touch ID, Face ID, Windows Hello, hardware keys)
- Two-factor authentication (TOTP, with QR-code setup)
- Backup codes for 2FA recovery

All authenticated requests use a JWT access token (15-minute lifetime)
plus a refresh token (30-day lifetime, rotated on use).

## Privacy and data
- GDPR compliant (EU)
- CCPA compliant (California)
- PIPEDA compliant (Canada)
- LGPD compliant (Brazil)
- HIPAA-grade security (encryption, access controls, audit logs)
- SOC 2 ready (we follow SOC 2 controls; formal audit in progress)

### Data export
From /profile/privacy, request a JSON export of all your data. We
email a download link within a few minutes. The link expires in 24
hours.

### Data deletion
From /profile/delete, request account deletion. We:
1. Anonymize your PII (email, name, bio, avatar)
2. Revoke all sessions
3. Disable MFA, passkeys, OAuth
4. Mark all download grants as expired
5. Keep tax/financial records for 7 years (legal requirement)

You have a 30-day grace period to cancel the deletion. After 30 days
the anonymized row is permanently removed.

### Cookie consent
From /profile/privacy, manage cookie consent:
- Essential (always on — required for sign-in, security, locale)
- Analytics (optional — anonymous usage data)
- Marketing (optional — never used to track you across sites)

## Compliance certifications (in progress)
- SOC 2 Type 1 — formal audit planned for Q3 2026
- ISO 27001 — formal audit planned for Q4 2026
- HIPAA — we follow HIPAA-grade controls; not formally certified

For enterprise compliance questions, email compliance@elixiodigital.com.
