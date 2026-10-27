# Authentication and Database Hardening

## Authentication and ownership

- Protected API handlers accept verified Firebase ID tokens, not caller-controlled UID headers.
- Identity-header fallback is enabled only when NODE_ENV is exactly development and ALLOW_INSECURE_FALLBACK_AUTH=true. Never set it on preview or production.
- Firestore rules restrict profile and subcollection fields. New profiles start with zero XP, a standard rank, and virtual capital between ₹1 lakh and ₹1 crore. Client profile updates cannot change role, XP, capital, email, UID, or rank.
- Users cannot directly delete the profile document. Add a trusted account-deletion workflow before offering account deletion; it must process Firebase Auth and nested Firestore data.
- Client cache access requires the active Firebase UID; sign-out clears UID-scoped profile, watchlist, portfolio, game, and alert caches.
- Historical market candles are public and non-user-specific. The endpoint validates query values and remains under the existing per-IP market API limiter.

## PostgreSQL migrations

The versioned migration creates the core tables when missing, adds integrity checks to existing tables (using NOT VALID initially to avoid blocking rollout on legacy rows), and adds user-scoped indexes.

Set SQL_HOST, SQL_PORT (default 5432), SQL_DB_NAME, SQL_ADMIN_USER, and SQL_ADMIN_PASSWORD. Set SQL_SSL=true for managed PostgreSQL that requires verified TLS.

Run migrations explicitly before deploying code that depends on the schema:

```bash
npm run db:migrate
# or: bun run db:migrate
```

The runner records migrations in public.schema_migrations, uses one transaction per file, and serializes runners with a PostgreSQL advisory lock. Never run migrations on every serverless cold start.

For existing databases, take a backup and inspect legacy data before release. Existing rows are not rewritten; checks added to old tables as NOT VALID enforce new/updated rows, but need data cleanup and explicit validation. The migration-only database user should not be used as SQL_USER for normal runtime queries.

## Remaining limitations

- Game progress is client-authored. Do not use its XP as a trusted leaderboard, reward balance, or entitlement without moving score calculation to a trusted server.
- The code review does not prove deployed Firebase rules or Vercel secrets are correct. Verify the live project before merging.
- Size the runtime PostgreSQL pool and use the provider's supported pooling option for serverless concurrency.
