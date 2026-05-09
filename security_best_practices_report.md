# Security Best Practices Report

## Executive Summary

Reviewed the React/Vite frontend, Cloudflare Pages deployment files, Supabase client usage, and Supabase database policies for the current Fangzu app. No critical exploitable issue was found after the fixes below. The main data-isolation control, Supabase RLS on `public.landlord_backup`, was verified with two temporary users.

## Fixed Findings

### SEC-001 - Service Worker cached too broadly

- Severity: High
- Location: `public/sw.js:22`
- Evidence: The previous root `sw.js` used a broad network-first cache for all GET requests. It could intercept and cache cross-origin or authenticated API responses.
- Impact: User backup data could persist in browser Cache Storage after logout on a shared device, increasing privacy exposure if the browser profile is reused or compromised.
- Fix: Moved the deployed worker to `public/sw.js`, limited caching to same-origin GET requests, skipped authorization/API-style paths, skipped opaque responses, and bumped the cache name.
- Verification: `https://fangzu123.pages.dev/sw.js` now returns `const CACHE_NAME = 'rent-manager-v26';` and `Cache-Control: no-cache`.

### SEC-002 - Auth trigger functions were in an exposed schema

- Severity: Medium
- Location: Supabase project `jhdvuwzdzqujeopjwytg`, trigger functions formerly in `public`
- Evidence: Supabase guidance recommends not placing `security definer` functions in exposed schemas. The auto-confirm trigger functions were originally in `public`.
- Impact: Even though these are trigger functions, keeping privileged functions in an exposed schema is unnecessary attack surface and makes future RPC exposure mistakes easier.
- Fix: Moved `auto_confirm_email_user`, `sync_email_identity_verified`, and `sync_email_user_verified_after_insert` into private schema `private`, revoked `public`, `anon`, and `authenticated` execution, and kept triggers pointing at `private.*`.
- Verification: Function ACL now only grants `postgres` and `service_role`; new signup still returns a session and DB metadata is confirmed.

### SEC-003 - Missing Cloudflare Pages security headers

- Severity: Medium
- Location: `public/_headers:1`
- Evidence: No Pages `_headers` file existed before this review.
- Impact: Without headers, the site is easier to frame/clickjack and leaks more referrer information than necessary.
- Fix: Added `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive `Permissions-Policy`.
- Verification: `https://fangzu123.pages.dev` returns these headers.

### SEC-004 - Weak frontend password minimum

- Severity: Low
- Location: `components/CloudAuthModal.tsx:35`, `components/CloudAuthModal.tsx:60`
- Evidence: The frontend allowed 6-character passwords.
- Impact: Users could choose weaker passwords. This is only frontend validation; server-side Supabase password policy should still be configured in Auth settings when available.
- Fix: Raised frontend minimum to 8 characters.

## Remaining Risks

### SEC-005 - Tailwind CDN script runs with full page privileges

- Severity: Medium
- Location: `index.html:17`
- Evidence: The app loads `https://cdn.tailwindcss.com` in production.
- Impact: Any compromised third-party script loaded here can read page data and browser storage available to the app origin. This is a supply-chain risk.
- Recommended fix: Replace the CDN script with a local Tailwind build step and static CSS. This is more involved because the current project relies on runtime Tailwind generation.

### SEC-006 - Browser localStorage contains room data/session-side state

- Severity: Low to Medium
- Location: `App.tsx` localStorage usage
- Evidence: The app stores room data locally for offline/cache behavior.
- Impact: On a shared computer or compromised browser profile, locally cached room/tenant data can be read. Supabase RLS does not protect data already stored in the browser.
- Recommended mitigation: Keep logout clearing local cached data, avoid shared browsers for sensitive tenant data, and consider an optional "clear local data" button or encrypted local cache later.

## Verification Performed

- Production build: passed.
- `npm audit --omit=dev --registry=https://registry.npmjs.org`: 0 vulnerabilities.
- Supabase RLS test: user A could write own backup, could not write user B backup, and read 0 rows for user B backup.
- Supabase signup test: direct signup still returns a session after moving trigger functions private.
- Cloudflare deploy: completed to `fangzu123.pages.dev`.
- Runtime header check: status 200 with `DENY`, `nosniff`, and `strict-origin-when-cross-origin`.
