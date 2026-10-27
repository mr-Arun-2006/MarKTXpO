# Security and Code Quality Audit

**Repository:** `mr-Arun-2006/name-neo`  
**Review date:** 2026-10-27  
**Scope:** repository tree, authentication middleware, SQL handlers, Firestore rules, environment examples, Vercel wrappers, package scripts, and CI workflow.

## Changes made in this branch

### High severity — SQL API identity spoofing
Before this patch, `requireAuth` accepted `X-Trader-UID` when the Firebase bearer token was absent and also fell back to that header after token verification failed. Since callers can choose that header, they could impersonate another user when calling protected SQL watchlist and portfolio endpoints.

**Fix:** production and default configurations now require a verified Firebase ID token. Invalid bearer tokens always fail closed. The legacy fallback identity is enabled only when both conditions hold: `NODE_ENV` is not `production` and `ALLOW_INSECURE_FALLBACK_AUTH=true`. This compatibility option is for local development only.

### Medium severity — Watchlist writes lacked payload validation
The SQL watchlist endpoint previously checked only whether ticker and stock name were truthy. It now validates symbol characters and lengths, name length, exchange enum, positive finite target price, and notes type/length before issuing a database write.

### Low severity — TypeScript server startup was inconsistent
The development script used `tsx`, but the production-style `start` script invoked `node server.ts`. The start script now uses `tsx server.ts` so TypeScript execution follows the same path. The package is also named after the repository.

### Low severity — PostgreSQL TLS was hard-coded off in configuration
Runtime pooling and Drizzle configuration now honor `SQL_SSL=true`, with certificate verification enabled for the runtime pool. Keep this false only for local/non-TLS databases; use true when your managed PostgreSQL provider requires TLS.

### CI coverage
A focused test suite now checks that fallback authentication is disabled by default, requires explicit opt-in for non-production use, and cannot be enabled when `NODE_ENV=production`. CI runs it alongside the existing type-check and frontend build.

## Remaining risks and recommended follow-up

1. **Distributed API rate limiting:** the current AI/market limiter stores counters in process memory. It is not a reliable global quota across multiple serverless instances. If a server-side `GEMINI_API_KEY` is configured, use a shared rate-limit store and provider-level quota/alerting to reduce anonymous quota-exhaustion risk.
2. **Fallback identity is not real authentication:** client-side fallback sessions stored in local storage are forgeable and should remain limited to local/demo data. Do not enable `ALLOW_INSECURE_FALLBACK_AUTH` in any reachable production or shared staging deployment.
3. **Backend modularity and validation:** `server.ts` contains many route handlers in one large file and request validation is not yet uniform across all endpoints. Move handlers into route modules and apply shared schemas to every API request/response.
4. **Integration testing:** the new unit tests cover the fallback-auth policy, not end-to-end Firebase token verification, SQL ownership isolation, database migrations, or provider failures. Add integration tests with a test database and Firebase emulator/test project before relying on these paths in production.
5. **Market-data freshness:** the service worker uses a network-first cache for market API responses with a one-day maximum age. Confirm that the UI always makes stale/offline data obvious before users rely on quote data for financial decisions.
6. **Secret hygiene:** the committed Firebase web configuration is client configuration, not a server service-account private key. Keep Gemini keys, database passwords, and Firebase service-account JSON only in deployment secrets or local ignored environment files; rotate any actual private credential if one has ever been committed.

## Validation status

The repository was inspected before edits. CI is configured to run TypeScript checking, the authentication-policy tests, and a Vite production build. A successful GitHub Actions result should be checked on the resulting pull request; this audit does not claim those commands have passed until CI reports that outcome.
