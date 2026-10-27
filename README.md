# name-neo Architecture

Production-grade architecture for the MarKtXPO-inspired market intelligence platform.

## 1. Overview

`name-neo` is a stock intelligence, AI insight, and market-analysis application built around:

- a React + Vite frontend
- an Express API layer
- third-party market data providers
- Gemini AI analysis endpoints
- Firebase auth and Postgres-backed user data

The current codebase is a functional MVP, but it is structured as a single large app. For production operation, it should evolve into a modular architecture with clear layers, explicit contracts, and resilient service boundaries.

## 2. Goals

The target production architecture should optimize for:

- maintainability
- isolated feature ownership
- scalable API design
- strong validation and security
- testability
- failure isolation for external AI and finance APIs
- easy deployment and observability

## 3. Core Architecture Principles

1. UI should be presentation-only.
   - React components should not contain business logic.
   - Data fetching and transformations should happen in services or hooks.

2. API routes should be thin.
   - Routes validate input, call domain services, and return normalized responses.
   - No DB logic or data-provider logic should live directly in route handlers.

3. External services must be isolated behind adapters.
   - AI provider logic should be separated from business logic.
   - Market data providers should be wrapped behind a service interface.

4. Domain logic should be explicit.
   - watchlists, portfolio behavior, alerting, and AI risk analysis should be domain services.

5. Errors must be observable.
   - Failures from Gemini, Yahoo Finance, Firebase, or Postgres must be logged and recoverable.

6. Security and validation are mandatory.
   - request validation
   - env validation
   - sanitized outputs
   - no secrets in client code

## 4. Target Production System Landscape

```text
Client (Browser)
    |
    v
React Frontend
    |
    +--> Feature modules
    +--> Shared UI + types
    +--> Hooks + API clients
    |
    v
API Gateway / Backend
    |
    +--> Auth middleware
    +--> Route handlers
    +--> Validation layer
    +--> Domain services
    +--> Repositories / database access
    |
    +--> AI providers (Gemini)
    +--> Market data providers (Yahoo / third-party)
    +--> Firebase auth integration
    |
    v
Data layer
    |
    +--> Postgres / Drizzle
    +--> Firebase Auth
    +--> Redis cache (optional)
    +--> Monitoring / logs / tracing
```

## 5. Recommended Repository Structure

```text
name-neo/
├── apps/
│   ├── web/
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── routes/
│   │   │   │   ├── providers/
│   │   │   │   └── stores/
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   ├── services/
│   │   │   │   │   └── types.ts
│   │   │   │   ├── market/
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   ├── services/
│   │   │   │   │   └── types.ts
│   │   │   │   ├── alerts/
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   └── services/
│   │   │   │   ├── portfolio/
│   │   │   │   ├── watchlist/
│   │   │   │   ├── ai/
│   │   │   │   └── profile/
│   │   │   ├── shared/
│   │   │   │   ├── components/
│   │   │   │   ├── lib/
│   │   │   │   ├── utils/
│   │   │   │   └── types/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── styles/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   └── env.ts
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   └── api/
│       ├── src/
│       │   ├── app/
│       │   │   ├── server.ts
│       │   │   ├── app.ts
│       │   │   └── bootstrap.ts
│       │   ├── routes/
│       │   │   ├── health.ts
│       │   │   ├── market.ts
│       │   │   ├── ai.ts
│       │   │   ├── watchlist.ts
│       │   │   ├── portfolio.ts
│       │   │   └── auth.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   ├── cors.ts
│       │   │   ├── logger.ts
│       │   │   ├── rate-limit.ts
│       │   │   └── error-handler.ts
│       │   ├── modules/
│       │   │   ├── ai/
│       │   │   │   ├── routes/
│       │   │   │   ├── services/
│       │   │   │   ├── providers/
│       │   │   │   └── types.ts
│       │   │   ├── market/
│       │   │   │   ├── services/
│       │   │   │   ├── providers/
│       │   │   │   └── schemas/
│       │   │   ├── auth/
│       │   │   ├── user/
│       │   │   ├── watchlist/
│       │   │   └── portfolio/
│       │   ├── services/
│       │   │   ├── aiService.ts
│       │   │   ├── marketDataService.ts
│       │   │   ├── userService.ts
│       │   │   └── alertService.ts
│       │   ├── repositories/
│       │   │   ├── userRepository.ts
│       │   │   ├── watchlistRepository.ts
│       │   │   └── portfolioRepository.ts
│       │   ├── lib/
│       │   │   ├── cache.ts
│       │   │   ├── logger.ts
│       │   │   ├── env.ts
│       │   │   └── retries.ts
│       │   ├── config/
│       │   │   ├── app.ts
│       │   │   ├── db.ts
│       │   │   └── providers.ts
│       │   ├── schemas/
│       │   │   ├── request.ts
│       │   │   └── response.ts
│       │   ├── utils/
│       │   ├── types/
│       │   └── index.ts
│       ├── package.json
│       ├── tsconfig.json
│       ├── .env.example
│       └── README.md
│
├── packages/
│   ├── shared/
│   │   ├── types/
│   │   │   ├── market.ts
│   │   │   ├── ai.ts
│   │   │   └── portfolio.ts
│   │   ├── schemas/
│   │   │   ├── stock.ts
│   │   │   ├── ai.ts
│   │   │   └── api.ts
│   │   ├── utils/
│   │   │   ├── ticker.ts
│   │   │   ├── currency.ts
│   │   │   └── time.ts
│   │   └── constants/
│   │       ├── sectors.ts
│   │       └── exchanges.ts
│   ├── ui/
│   │   ├── src/
│   │   └── package.json
│   ├── config/
│   │   ├── eslint/
│   │   ├── tsconfig/
│   │   └── scripts/
│   └── market-data/
│       ├── src/
│       └── package.json
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── security.md
│   └── observability.md
│
├── infra/
│   ├── docker/
│   │   ├── Dockerfile.api
│   │   └── Dockerfile.web
│   ├── k8s/
│   └── terraform/
│
├── .github/
│   ├── workflows/
│   └── dependabot.yml
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .gitignore
├── .env.example
├── README.md
├── LICENSE
└── docker-compose.yml
```

## 6. Current Codebase Interpretation

The existing repo is already roughly aligned with a product domain split:

```text
name-neo/
├── api/
│   ├── ai/
│   ├── market/
│   └── sql/
├── src/
│   ├── components/
│   ├── data/
│   ├── db/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── views/
├── server.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
├── index.html
├── metadata.json
├── firestore.rules
├── .env.example
├── .nvmrc
├── .node-version
├── bun.lock
├── vercel.json
└── firebase-*.json
```

This structure is a good MVP layout, but production maturity requires moving from:

- large feature code in `src/App.tsx`
- large route logic in `server.ts`
- ad hoc utility modules

into a feature-first, service-layered architecture.

## 7. Layered Architecture Design

### Presentation Layer
Responsibilities:
- render UI for dashboards, alerts, screens, watchlists
- compose feature pages
- handle interactions with hooks and services
- present AI and market data in a user-friendly way

### Application Layer
Responsibilities:
- orchestrate workflows for stock exploration, alerts, AI explanations, portfolio actions
- coordinate API calls and state management
- keep UI logic thin and predictable

### Domain Layer
Responsibilities:
- business decisions and rules
- market alert logic
- watchlist validation
- portfolio rules
- user profile expectations

### Infrastructure Layer
Responsibilities:
- Gemini API integration
- market data providers
- firebase auth
- postgres access
- cache and rate limiting
- logging and tracing

## 8. Cross-Cutting Concerns

### Authentication and Authorization
- Firebase Authentication for user identity
- Postgres for user-specific app data
- server-side auth guard middleware on protected endpoints
- clear separation between login state and user profile persistence

### Market Data Integration
- backend should be the only place that calls third-party market data providers
- frontend should consume normalized API responses only
- provider response should be mapped into shared domain types

### AI Integration
- Prompt generation and provider-specific handling should live in dedicated AI services
- fallback logic and cache behavior should be centralized
- all AI responses must be treated as non-authoritative unless clearly sourced/validated

### Database Access
- Drizzle is a strong fit for typed Postgres operations
- user, watchlist, and position data should be stored and queried via repository modules
- all queries should be validated and typed

## 9. Production Readiness Requirements

### Error Handling
- no silent `catch {}` blocks in production code
- log with context, include operation and user impact
- fail gracefully with user-facing fallback states

### Validation
- use Zod or equivalent runtime validation
- validate all API inputs
- validate env config at startup
- validate third-party response shapes before use

### Monitoring
- structured logs
- request IDs
- API latency tracking
- AI provider failure metrics
- database connection and query metrics
- Sentry or equivalent error capture

### Security
- validate and sanitize user input
- do not expose API keys to the browser
- allowlist CORS
- use secure headers
- protect AI routes behind rate limits

## 10. Recommended Tech Stack

### Frontend
- React 19
- Vite
- TypeScript
- TanStack Query (recommended)
- Zustand or Redux Toolkit (recommended for app state)
- Tailwind CSS

### Backend
- Node.js / Express
- TypeScript
- Drizzle ORM
- Postgres
- Firebase Admin SDK

### AI and Data
- Google Gemini API
- Yahoo Finance / market data adapters
- provider abstraction layer for retries and fallbacks

### Observability
- structured logs
- OpenTelemetry / tracing
- Sentry
- health check endpoints

## 11. Production Implementation Roadmap

### Phase 1 — Stabilize foundations
- break `App.tsx` into feature modules
- split `server.ts` into route/service/repository files
- standardize error handling
- add validation for API payloads
- add tests for critical flows

### Phase 2 — Data and domain cleanup
- introduce typed repositories
- migrate user/watchlist/portfolio logic into repositories
- formalize market data adapters
- centralize AI prompts and provider logic

### Phase 3 — Production operations
- add Redis cache and distributed rate limiting
- add observability pipeline
- add CI/CD quality gates
- enable staging environment and smoke tests

### Phase 4 — Scale and optimize
- move to a multi-package monorepo structure
- build deployment separation for frontend and API
- increase performance monitoring and usage analytics

## 12. Architecture Summary

The right production architecture for `name-neo` is:

- feature-driven frontend
- layered backend
- typed repository/data access
- isolated AI and market providers
- robust validation and monitoring
- strong separation of concerns

That direction keeps the app scalable, maintainable, and production-safe without turning the codebase into a single monolithic file system.

## 13. Suggested Next Step

The next immediate refactor should be:

1. split `src/App.tsx` into feature modules
2. split `server.ts` into route + service + repository files
3. add environment validation and request schema validation
4. add real logging and error handling across external calls
5. install test coverage for rate limiting, API handling, and market data adapters

---

This architecture document is intended to define the target product structure and guide the refactor toward a production-ready codebase.
