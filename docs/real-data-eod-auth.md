# Real-Data, Authentication, and EOD Analysis Notes

## User access flow

- The landing page is public and describes the product.
- Feature routes are gated behind Firebase Authentication.
- Registration uses Firebase Email/Password. Google sign-in and anonymous demo access are real Firebase flows when enabled in Firebase Console.
- Failed Firebase authentication is displayed as an error. The app must never invent a local user or persist a plaintext password to simulate a successful login.
- A user's AI key is kept in React memory for the current browser session, sent only over HTTPS to the server endpoint using it, and not written to localStorage or Firestore. Signing out clears it.

## Market data

The existing quote/history integration uses Yahoo Finance chart data as a third-party reference source. The UI must not label it as an official NSE/BSE feed or guarantee real-time delivery. Market freshness and access can vary by instrument and provider.

For a provider with explicit data entitlements, set:

```env
MARKET_DATA_PROVIDER=twelvedata
TWELVE_DATA_API_KEY=your_server_side_market_data_key
```

The Twelve Data plan must include the NSE daily-series market, and the applicable contract must allow the intended internal or external display. The key stays server-side. To use the current best-effort Yahoo development source, leave `MARKET_DATA_PROVIDER=yahoo`.

NSE Data & Analytics separately offers subscribed real-time and EOD/historical market-data products. For commercial display of official NSE/BSE market data, confirm licensing with the exchange or an authorized vendor before launch.

## EOD analysis

The EOD endpoint retrieves daily candles from the configured provider and calculates price returns, moving averages, RSI, MACD, Bollinger Bands, and volume comparisons from those candles. Missing history yields a null indicator, not a fabricated value. Before 15:45 India time, the latest daily candle for the current session is excluded because it might be incomplete.

The model-assisted explanation uses the API key entered by the signed-in user. Google Search grounding can return source links for current-news context; absence of grounded sources is not treated as verified news. AI output remains an explanation, not a trading instruction.

## Required deployment configuration

1. Firebase Authentication: enable Email/Password. Enable Google sign-in and Anonymous Auth only if those options should be available. Add production hostnames to Authorized domains.
2. Firestore: deploy the checked-in `firestore.rules` rules to the correct Firebase project.
3. Server auth: set `FIREBASE_SERVICE_ACCOUNT_JSON` to the service-account JSON only in the server's secret manager, or configure Application Default Credentials where supported.
4. Database-backed features: set SQL variables and use `SQL_SSL=true` with providers that require verified TLS.
5. Market data: configure a source whose plan permits the intended use; never infer a licensed exchange feed from a successful HTTP response.
6. AI: users enter their own Gemini key in the app. The key is not persisted by this app. Server-level `GEMINI_API_KEY` fallback is disabled unless explicitly opted in with `ALLOW_SHARED_GEMINI_KEY=true`; do not enable it for an unauthenticated public deployment.

## Data not yet proven to be live/official

Institutional FII/DII flows, delivery percentages, official circuit limits, intraday order-book depth, and complete corporate fundamentals require their own verified datasets and provider permissions. The application should display these as unavailable unless a connected source actually returns them.
