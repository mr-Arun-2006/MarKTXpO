import express from 'express';
import http from 'http';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  INDIAN_STOCKS_REGISTRY,
  getRealIndianStockQuotes,
  getRealBenchmarks,
  getRealStockHistory,
  getRealStockDividends,
} from './src/services/realMarketData.ts';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import { fetchEodHistory } from './src/services/eodDataProvider.ts';
import { calculateEodTechnicalSnapshot } from './src/utils/eodTechnicalAnalysis.ts';
import {
  getOrCreateUser,
  getUserWatchlist,
  addWatchlistItem,
  getUserPortfolio,
} from './src/db/users.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory cache for news digests to prevent rate-limit / quota exhaustion (TTL: 15 minutes)
interface CacheEntry {
  data: any;
  expiresAt: number;
}
const newsDigestCache = new Map<string, CacheEntry>();
const aiAnalysisCache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 1_000;

function setBoundedCache(
  cache: Map<string, CacheEntry>,
  key: string,
  data: any,
  ttlMs: number,
): void {
  const now = Date.now();
  if (cache.size >= MAX_CACHE_ENTRIES && !cache.has(key)) {
    for (const [storedKey, entry] of cache) {
      if (entry.expiresAt <= now) cache.delete(storedKey);
    }
    // Evict the oldest inserted entry if the cache is still full.
    if (cache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
  }
  cache.set(key, { data, expiresAt: now + ttlMs });
}

// Best-effort per-process protection. For multi-instance production deployments,
// use a shared rate-limit store (for example Redis) so limits apply across instances.
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const aiRateLimitEntries = new Map<string, RateLimitEntry>();
const AI_RATE_LIMIT_WINDOW_MS = 60_000;
const AI_RATE_LIMIT_MAX_REQUESTS = 20;
const AI_RATE_LIMIT_MAX_KEYS = 5_000;

function limitAiRequests(req: express.Request, res: express.Response, next: express.NextFunction) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  let entry = aiRateLimitEntries.get(key);

  if (!entry || entry.resetAt <= now) {
    if (aiRateLimitEntries.size >= AI_RATE_LIMIT_MAX_KEYS) {
      for (const [storedKey, storedEntry] of aiRateLimitEntries) {
        if (storedEntry.resetAt <= now) aiRateLimitEntries.delete(storedKey);
      }
      if (aiRateLimitEntries.size >= AI_RATE_LIMIT_MAX_KEYS) {
        return res.status(503).json({ error: 'AI service is temporarily busy. Please retry shortly.' });
      }
    }
    entry = { count: 0, resetAt: now + AI_RATE_LIMIT_WINDOW_MS };
    aiRateLimitEntries.set(key, entry);
  }

  if (entry.count >= AI_RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({ error: 'API request limit reached. Please retry later.' });
  }

  entry.count += 1;
  return next();
}

// If hosted behind a single trusted platform proxy, req.ip reflects the client IP.
app.set('trust proxy', 1);
app.use('/api/ai', limitAiRequests);
app.use('/api/market', limitAiRequests);

// Helper to instantiate Gemini SDK with proper telemetry headers
function getGeminiClient(customApiKey?: string) {
  const suppliedKey = typeof customApiKey === 'string' ? customApiKey.trim() : '';
  if (suppliedKey.length > 300) return null;

  const allowSharedKey = process.env.ALLOW_SHARED_GEMINI_KEY?.trim().toLowerCase() === 'true';
  const apiKey = suppliedKey || (allowSharedKey ? process.env.GEMINI_API_KEY : undefined);
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.startsWith('MY_')) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Curated institutional intelligence fallback generator for Indian equities
function getCuratedStockNewsDigest(ticker: string, companyName: string, language = 'English') {
  // Never invent article titles, timestamps, sources, or sentiment when live retrieval fails.
  return {
    ticker,
    companyName,
    language,
    oneSentenceImpact: 'Verified current news is unavailable. No news-driven market impact assessment was generated.',
    overallSentiment: 'Neutral',
    headlines: [],
    sources: [],
    dataAvailable: false,
    dataStatus: 'UNAVAILABLE',
  };
}

// 1. AI Stock Analysis Endpoint
app.post('/api/ai/explain', requireAuth, async (req: AuthRequest, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const safeString = (value: unknown, fallback: string, maxLength: number) =>
    typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : fallback;
  const safeNumber = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;

  const ticker = safeString(body.ticker, 'STOCK', 20).toUpperCase();
  const companyName = safeString(body.companyName, ticker, 120);
  const sector = safeString(body.sector, 'Unavailable', 80);
  const language = safeString(body.language, 'English', 40);
  const quoteTimestamp = safeString(body.quoteTimestamp, 'Unavailable', 60);
  const marketState = safeString(body.marketState, 'Unavailable', 30);
  const dataSource = safeString(body.dataSource, 'Unknown', 180);
  const price = safeNumber(body.price);
  const changePercent = safeNumber(body.changePercent);
  const rsi = safeNumber(body.rsi);
  const dma50 = safeNumber(body.dma50);
  const dma200 = safeNumber(body.dma200);
  const pe = safeNumber(body.pe);
  const nsePrice = safeNumber(body.nsePrice);
  const bsePrice = safeNumber(body.bsePrice);
  const volumeMultiplier = safeNumber(body.volumeMultiplier);
  const arbitragePercent = safeNumber(body.arbitragePercent);
  const macdSignal = safeString(body.macd?.signal, 'Unavailable', 30);
  const userApiKey = safeString(body.userApiKey, '', 300);

  const quoteIsAvailable = price !== undefined && price > 0;
  const unavailableAnalysis = `### AI analysis unavailable

A configured Gemini model is unavailable or the request failed. This fallback does not generate trade recommendations, target prices, stop-loss levels, sentiment scores, or execution-liquidity claims.

Available request inputs (not independently verified by this endpoint):
- Ticker: ${ticker} | Company: ${companyName} | Sector: ${sector}
- Current price: ${price !== undefined ? `₹${price}` : 'N/A'} | Change: ${changePercent !== undefined ? `${changePercent}%` : 'N/A'}
- RSI(14): ${rsi ?? 'N/A'} | MACD direction: ${macdSignal}
- 50-day average: ${dma50 !== undefined ? `₹${dma50}` : 'N/A'} | 200-day average: ${dma200 !== undefined ? `₹${dma200}` : 'N/A'}
- P/E reference: ${pe ?? 'N/A'}
- NSE/BSE prices: ${nsePrice !== undefined ? `₹${nsePrice}` : 'N/A'} / ${bsePrice !== undefined ? `₹${bsePrice}` : 'N/A'}
- Cross-provider quote spread: ${arbitragePercent !== undefined ? `${arbitragePercent}%` : 'N/A'}

Market quotes are from a third-party provider, not a verified exchange order book. Verify source timestamps and transaction costs before making investment decisions.`;

  if (!quoteIsAvailable) {
    return res.json({
      ticker,
      analysis: 'A valid current price was not supplied. Refresh market data before requesting a stock-specific analysis.',
      dataAvailable: false,
      timestamp: new Date().toISOString(),
    });
  }

  const cacheKey = [
    'explain', ticker, language, quoteTimestamp, marketState, dataSource,
    price, changePercent, rsi, macdSignal, dma50, dma200, pe, nsePrice, bsePrice,
    volumeMultiplier, arbitragePercent,
  ].join('_');
  const cached = aiAnalysisCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() && cached.data?.dataAvailable !== false) {
    return res.json(cached.data);
  }

  const ai = getGeminiClient(userApiKey);
  if (!ai) {
    return res.json({
      ticker,
      analysis: unavailableAnalysis,
      dataAvailable: false,
      timestamp: new Date().toISOString(),
    });
  }

  const prompt = `
Explain the supplied Indian equity snapshot for ${companyName} (${ticker}) in ${language}.
Treat every value as caller-supplied third-party data, not independently verified exchange data.
Source metadata:
- Provider/source label: ${dataSource}
- Provider quote timestamp: ${quoteTimestamp}
- Provider market state: ${marketState}
Observed inputs:
- Sector: ${sector}
- Price: ₹${price}; daily change: ${changePercent !== undefined ? `${changePercent}%` : 'unavailable'}
- RSI(14): ${rsi ?? 'unavailable'}
- MACD direction: ${macdSignal}
- 50-day and 200-day moving averages: ${dma50 ?? 'unavailable'} and ${dma200 ?? 'unavailable'}
- P/E reference: ${pe ?? 'unavailable'}
- NSE/BSE quote values: ${nsePrice ?? 'unavailable'} and ${bsePrice ?? 'unavailable'}
- Cross-provider price difference: ${arbitragePercent !== undefined ? `${arbitragePercent}%` : 'unavailable'}
- Volume multiplier: ${volumeMultiplier ?? 'unavailable'}

Write a clear, concise Markdown report in this exact structure:
### Snapshot quality
State the source and quote timestamp. Say when timestamp or source detail is unavailable; do not infer that a fetched response is a fresh exchange trade.
### What the indicators show
Explain price change, RSI, MACD and moving-average context using only the supplied numbers. Explain any important missing values.
### Positive evidence
List only signals supported by the observed inputs. Write “None identified from the supplied inputs” when appropriate.
### Risks and conflicting evidence
Explain bearish, overbought/oversold, disagreement or data-quality risks actually supported by the inputs.
### What to monitor next
Give neutral items to verify, not entry or exit instructions.
### Data limitations
State that Yahoo Finance is a third-party reference source when applicable. No direct official NSE/BSE feed, verified delivery statistics, FII/DII flows, market depth, synchronized bid/ask quotes, or trading costs are supplied here.

Do not invent current news, macroeconomic catalysts, institutional flows, delivery data, market depth, or trading costs. Do not give buy/sell recommendations, target prices, stop-loss levels, or guarantees. Any NSE/BSE price difference is not an executable arbitrage opportunity without synchronized bid/ask quotes, market depth and fees.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are a cautious Indian equity data-analysis assistant. Use only the supplied values and sound educational explanations. Never invent facts or claim current news/access to exchange order books when none is supplied.',
      },
    });
    if (!response.text) {
      return res.json({
        ticker,
        analysis: unavailableAnalysis,
        dataAvailable: false,
        timestamp: new Date().toISOString(),
      });
    }

    const result = {
      ticker,
      analysis: response.text,
      dataAvailable: true,
      timestamp: new Date().toISOString(),
    };
    setBoundedCache(aiAnalysisCache, cacheKey, result, 15 * 60 * 1000);
    return res.json(result);
  } catch (err: any) {
    console.warn('[AI Analysis] Generation unavailable:', err?.message);
    return res.json({
      ticker,
      analysis: unavailableAnalysis,
      dataAvailable: false,
      timestamp: new Date().toISOString(),
    });
  }
});

// 2. AI Sentiment Analysis
app.post('/api/ai/sentiment', requireAuth, async (req: AuthRequest, res) => {
  const { ticker, companyName, headlines, userApiKey, language = 'English' } = req.body || {};
  const normalizedTicker = typeof ticker === 'string' ? ticker.slice(0, 20).toUpperCase() : 'STOCK';
  const normalizedCompany = typeof companyName === 'string' ? companyName.slice(0, 120) : normalizedTicker;
  const safeHeadlines = Array.isArray(headlines)
    ? headlines.filter((item: unknown) => typeof item === 'string').slice(0, 20).map((item: string) => item.slice(0, 500))
    : typeof headlines === 'string' ? [headlines.slice(0, 5000)] : [];
  const safeLanguage = typeof language === 'string' ? language.slice(0, 40) : 'English';
  const fallback = {
    ticker: normalizedTicker,
    sentimentScore: 0,
    sentimentLabel: 'Neutral',
    confidenceScore: 0,
    newsScore: 0,
    socialScore: 0,
    institutionalScore: 0,
    fundamentalScore: 0,
    keyDrivers: [],
    shortSummary: 'Sentiment is unavailable because verified news, social, institutional-flow, and fundamental inputs were not analyzed.',
    dataAvailable: false,
    dataStatus: 'UNAVAILABLE',
  };

  const ai = getGeminiClient(userApiKey);
  if (!ai || safeHeadlines.length === 0) return res.json(fallback);

  try {
    const prompt = `
Analyze only the supplied headlines for Indian equity ${normalizedCompany} (${normalizedTicker}).
Verified headlines supplied:
${safeHeadlines.map((headline) => `- ${headline}`).join('\n')}

Do not invent social data, institutional flows, fundamentals, or facts not present in the headlines.
Return JSON with: sentimentScore (-100 to 100), sentimentLabel (Very Bullish/Bullish/Neutral/Bearish/Very Bearish), confidenceScore (0 to 100), newsScore (-100 to 100), socialScore (use 0 because no social data is supplied), institutionalScore (use 0 because no verified flow data is supplied), fundamentalScore (use 0 unless explicitly evidenced in the supplied headlines), keyDrivers (array), shortSummary in ${safeLanguage}.
`;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      ...fallback,
      ...parsed,
      ticker: normalizedTicker,
      socialScore: 0,
      institutionalScore: 0,
      dataAvailable: true,
      dataStatus: 'HEADLINES_ONLY',
    });
  } catch (err: any) {
    console.warn('[AI Sentiment] Analysis unavailable:', err?.message);
    return res.json(fallback);
  }
});

// 3. AI News Digest Endpoint with Google Search Grounding & 1-sentence market impact
app.post('/api/ai/news-digest', requireAuth, async (req: AuthRequest, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const ticker = (typeof body.ticker === 'string' ? body.ticker : 'STOCK').trim().slice(0, 20).toUpperCase() || 'STOCK';
  const companyName = (typeof body.companyName === 'string' ? body.companyName : ticker).trim().slice(0, 120) || ticker;
  const language = (typeof body.language === 'string' ? body.language : 'English').trim().slice(0, 40) || 'English';
  const userApiKey = typeof body.userApiKey === 'string' ? body.userApiKey : undefined;

  if (!req.user?.uid) {
    return res.status(401).json({ dataAvailable: false, headlines: [], sources: [], error: 'Sign in again to retrieve news.' });
  }

  // News generation is deliberately not shared or cached across users because each
  // request must use the signed-in user's own API key.
  const ai = getGeminiClient(userApiKey);
  if (!ai) {
    return res.status(400).json({
      dataAvailable: false,
      headlines: [],
      sources: [],
      error: 'A valid user-supplied Gemini API key is required. No sample news is returned.',
    });
  }

  try {
    const prompt = `
Find current financial news, earnings or corporate announcements for Indian equity ${companyName} (${ticker}).
Use Google Search grounding. Return only headlines supported by the grounding references actually available in this request.
Do not invent article titles, source names, publication times or financial facts. If no current sources are available, return an empty headlines array.
Respond entirely in ${language} using this JSON schema:
{
  "ticker": "${ticker}",
  "companyName": "${companyName}",
  "oneSentenceImpact": "A concise evidence-based impact summary, or an explicit unavailable statement.",
  "overallSentiment": "Bullish" | "Bearish" | "Neutral",
  "headlines": [
    {
      "title": "Source-backed headline",
      "source": "Source name",
      "timeAgo": "Publication age only if source metadata provides it",
      "snippet": "Brief source-supported summary",
      "sentimentTag": "Bullish" | "Bearish" | "Neutral",
      "impactScore": -100 to 100
    }
  ]
}
Do not assert FII/DII flows, official index movement, price targets, delivery percentage or order-book data unless grounding sources support the specific claim.
`;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
      },
    });

    let parsed: any = null;
    try {
      parsed = JSON.parse(response.text || '');
    } catch {
      const match = response.text?.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { parsed = null; }
      }
    }

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = Array.isArray(chunks)
      ? chunks.map((chunk: any) => ({
          title: typeof chunk?.web?.title === 'string' ? chunk.web.title.slice(0, 200) : '',
          url: typeof chunk?.web?.uri === 'string' ? chunk.web.uri : '',
        })).filter((source: any) => /^https:\/\//i.test(source.url)).slice(0, 8)
      : [];
    const headlines = Array.isArray(parsed?.headlines)
      ? parsed.headlines.filter((item: any) => typeof item?.title === 'string' && item.title.trim()).slice(0, 20).map((item: any) => ({
          title: item.title.slice(0, 500),
          source: typeof item.source === 'string' ? item.source.slice(0, 100) : 'Source name unavailable',
          timeAgo: typeof item.timeAgo === 'string' ? item.timeAgo.slice(0, 80) : 'Publication time unavailable',
          snippet: typeof item.snippet === 'string' ? item.snippet.slice(0, 800) : '',
          sentimentTag: ['Bullish', 'Bearish', 'Neutral'].includes(item.sentimentTag) ? item.sentimentTag : 'Neutral',
          impactScore: typeof item.impactScore === 'number' && Number.isFinite(item.impactScore)
            ? Math.max(-100, Math.min(100, item.impactScore))
            : 0,
        }))
      : [];

    if (headlines.length === 0 || sources.length === 0) {
      return res.status(503).json({
        dataAvailable: false,
        headlines: [],
        sources: [],
        error: 'No current headlines with grounded HTTPS source links were returned.',
      });
    }

    return res.json({
      ticker,
      companyName,
      oneSentenceImpact: typeof parsed?.oneSentenceImpact === 'string' ? parsed.oneSentenceImpact.slice(0, 1000) : 'Headline sources returned; impact summary unavailable.',
      overallSentiment: ['Bullish', 'Bearish', 'Neutral'].includes(parsed?.overallSentiment) ? parsed.overallSentiment : 'Neutral',
      headlines,
      sources,
      dataAvailable: true,
      dataStatus: 'GROUNDED_NEWS',
      retrievedAt: new Date().toISOString(),
    });
  } catch {
    console.warn('[AI News] Grounded request failed; no sample headlines are substituted.');
    return res.status(503).json({
      dataAvailable: false,
      headlines: [],
      sources: [],
      error: 'Current grounded news is unavailable. Retry later; no sample data is used.',
    });
  }
});

// 4. AI Strategy & Backtesting Audit Endpoint
app.post('/api/ai/strategy-audit', requireAuth, async (req: AuthRequest, res) => {
  const { strategyName, rules, backtestMetrics, userApiKey, language = 'English' } = req.body || {};
  const fallback = {
    audit: 'AI strategy audit is unavailable. No claim about profitability, statistical edge, or expected drawdown has been generated. Validate the backtest against cleaned, survivorship-bias-aware historical data and include fees, slippage, and out-of-sample testing.',
    dataAvailable: false,
    timestamp: new Date().toISOString(),
  };
  const ai = getGeminiClient(userApiKey);
  if (!ai) return res.json(fallback);

  try {
    const prompt = `
Critically review this user-supplied backtest. Treat the numbers as unverified user input, not as proof of profitability.
Strategy: ${String(strategyName || 'Unnamed strategy').slice(0, 120)}
Rules: ${JSON.stringify(rules ?? []).slice(0, 12000)}
Backtest metrics: ${JSON.stringify(backtestMetrics ?? {}).slice(0, 5000)}
Language: ${String(language).slice(0, 40)}

Discuss data leakage, look-ahead bias, survivorship bias, transaction fees, slippage, sample size, and out-of-sample validation. Do not claim the strategy has an edge unless the supplied evidence supports it. Return concise Markdown.
`;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });
    return res.json({
      audit: response.text || fallback.audit,
      dataAvailable: Boolean(response.text),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('[AI Strategy Audit] Analysis unavailable:', err?.message);
    return res.json(fallback);
  }
});

// 5. AI Portfolio Risk Management Endpoint
app.post('/api/ai/portfolio-risk', requireAuth, async (req: AuthRequest, res) => {
  const { portfolio, totalValue, userApiKey, language = 'English' } = req.body || {};
  const fallback = {
    riskAnalysis: 'Portfolio risk analysis is unavailable. Beta, diversification, and VaR have not been calculated. Supply verified holdings and historical return series before relying on numerical risk estimates.',
    dataAvailable: false,
    timestamp: new Date().toISOString(),
  };
  if (!Array.isArray(portfolio) || portfolio.length > 200) {
    return res.status(400).json({ error: 'Portfolio must be an array with at most 200 holdings.' });
  }

  const ai = getGeminiClient(userApiKey);
  if (!ai) return res.json(fallback);

  try {
    const prompt = `
Review the following user-supplied portfolio data. Identify missing inputs; do not invent price history, beta, VaR, correlations, sector weights, or market facts.
Declared total value: ${Number.isFinite(totalValue) ? totalValue : 'not supplied'}
Holdings: ${JSON.stringify(portfolio).slice(0, 20000)}
Language: ${String(language).slice(0, 40)}

Explain what can and cannot be assessed from the supplied data. Do not present numerical VaR/beta unless the data actually supports the calculation. Note that this is educational information, not personalized financial advice.
`;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });
    return res.json({
      riskAnalysis: response.text || fallback.riskAnalysis,
      dataAvailable: Boolean(response.text),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('[AI Portfolio Risk] Analysis unavailable:', err?.message);
    return res.json(fallback);
  }
});

// 6. Gemini API Key Tester & Validator
app.post('/api/ai/test-key', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { customApiKey, model = 'gemini-3.8-flash' } = req.body;
    const keyToTest = customApiKey?.trim();

    if (!keyToTest) {
      return res.status(400).json({
        valid: false,
        error: 'Please enter a Gemini API Key to test.',
      });
    }

    const ai = getGeminiClient(keyToTest);
    if (!ai) {
      return res.status(400).json({ valid: false, error: 'Failed to initialize Gemini SDK client.' });
    }

    const testPromise = ai.models.generateContent({
      model: model || 'gemini-3.8-flash',
      contents: 'Respond with "Gemini API Connection Verified" in 5 words.',
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timed out after 7 seconds. Please verify key permissions.')), 7000)
    );

    const response: any = await Promise.race([testPromise, timeoutPromise]);
    const replyText = response?.text || 'Gemini API Connection Verified';

    return res.json({
      valid: true,
      modelUsed: model,
      reply: replyText.trim(),
      message: `Gemini API Key successfully verified and active for ${model}.`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('[AI Key Test Error]:', err?.message);
    return res.status(400).json({
      valid: false,
      error: err?.message || 'Invalid Gemini API key or model permission denied.',
    });
  }
});

// 7. Multi-turn Gemini Chatbot Endpoint
app.post('/api/ai/chat', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      messages = [],
      model = 'gemini-3.8-flash',
      customApiKey,
      systemInstruction,
      temperature = 0.7,
    } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
      return res.status(400).json({ error: 'Messages must be an array containing between 1 and 40 items.' });
    }

    const normalizedMessages = messages.map((message: any) => ({
      role: message?.role === 'assistant' || message?.role === 'model' ? 'model' : 'user',
      content: String(message?.content ?? message?.text ?? '').slice(0, 4000),
    }));
    const totalMessageCharacters = normalizedMessages.reduce((sum, message) => sum + message.content.length, 0);
    if (totalMessageCharacters > 40_000) {
      return res.status(413).json({ error: 'Chat history is too large. Shorten the conversation and retry.' });
    }

    const selectedModel = typeof model === 'string' && /^[a-zA-Z0-9._-]{1,100}$/.test(model)
      ? model
      : 'gemini-3.8-flash';
    const safeTemperature = typeof temperature === 'number' && Number.isFinite(temperature)
      ? Math.min(1, Math.max(0, temperature))
      : 0.7;
    const defaultSystemInstruction =
      typeof systemInstruction === 'string' && systemInstruction.trim()
        ? systemInstruction.slice(0, 3000)
        : `You are an educational Indian-equity market assistant.
Explain financial concepts clearly. Distinguish user-supplied data from verified market data.
Do not invent current prices, news headlines, institutional flows, technical indicators, market depth, or trading costs. If evidence is missing, say so.
Do not claim to be a SEBI-registered adviser or guarantee results. Flag when information is educational rather than personalized financial advice.`;

    const ai = getGeminiClient(customApiKey);
    if (ai) {
      try {
        const contents = normalizedMessages.map((message) => ({
          role: message.role,
          parts: [{ text: message.content }],
        }));

        const response = await ai.models.generateContent({
          model: selectedModel,
          contents,
          config: {
            systemInstruction: defaultSystemInstruction,
            temperature: safeTemperature,
          },
        });
        const reply = response?.text;
        if (reply) {
          return res.json({
            reply,
            modelUsed: selectedModel,
            timestamp: new Date().toISOString(),
            isLiveAI: true,
            dataAvailable: true,
          });
        }
      } catch (err: any) {
        console.warn('[AI Chat] Generation unavailable:', err?.message);
      }
    }

    return res.json({
      reply: `### AI response unavailable

The Gemini service is not available for this request. No current prices, technical levels, news catalysts, institutional flows, or executable arbitrage opportunities have been verified.

You can still use the product for general educational explanations. For stock-specific analysis, refresh quote data and provide verified historical candles and dated sources. Do not use an unverified fallback as a trade signal.`,
      modelUsed: `${selectedModel} (unavailable)`,
      timestamp: new Date().toISOString(),
      isLiveAI: false,
      dataAvailable: false,
    });
  } catch (err: any) {
    console.error('[AI Chat Error]:', err?.message);
    return res.status(500).json({ error: 'Failed to process AI chat query.' });
  }
});

// Authenticated EOD analysis: use fetched daily candles and the signed-in user's own model key.
app.post('/api/market/eod-analysis', requireAuth, async (req: AuthRequest, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const ticker = typeof body.ticker === 'string' ? body.ticker.trim().toUpperCase() : '';
  const userApiKey = typeof body.userApiKey === 'string' ? body.userApiKey.trim() : '';
  const languageCode = typeof body.language === 'string' ? body.language.slice(0, 12) : 'en';
  const languageNames: Record<string, string> = {
    en: 'English', hi: 'Hindi', gu: 'Gujarati', ta: 'Tamil', mr: 'Marathi', bn: 'Bengali',
  };
  const language = languageNames[languageCode] || 'English';

  if (!req.user?.uid) return res.status(401).json({ success: false, error: 'Sign in again to run EOD analysis.' });
  if (!/^[A-Z0-9][A-Z0-9.&_-]{0,19}$/.test(ticker)) {
    return res.status(400).json({ success: false, error: 'Enter a valid NSE symbol (1–20 supported characters).' });
  }
  if (userApiKey.length < 8 || userApiKey.length > 300 || userApiKey.startsWith('MY_')) {
    return res.status(400).json({ success: false, error: 'Enter a valid Gemini API key. It is used for this request and is not persisted by the app.' });
  }

  try {
    const marketData = await fetchEodHistory(ticker);
    const registryItem = INDIAN_STOCKS_REGISTRY.find((stock) => stock.ticker === ticker);
    const snapshot = calculateEodTechnicalSnapshot(
      ticker,
      registryItem?.name || ticker,
      marketData.candles,
      new Date(),
      marketData.source,
    );
    if (!snapshot) {
      return res.status(422).json({
        success: false,
        error: 'No completed daily candles were available to calculate an EOD report for this symbol.',
      });
    }

    let aiAnalysis: any = null;
    let aiError: string | undefined;
    let sources: Array<{ title: string; url: string }> = [];
    const ai = getGeminiClient(userApiKey);
    if (!ai) {
      aiError = 'The supplied model key could not initialize the Gemini client.';
    } else {
      const prompt = `
You are explaining an end-of-day report for an Indian equity. Treat all values in the supplied JSON as observed third-party daily candle data, not as official exchange data.
Ticker: ${ticker}; company: ${registryItem?.name || ticker}; preferred explanation language: ${language}.
EOD technical snapshot (do not alter numeric values):
${JSON.stringify(snapshot)}

Use Google Search grounding for recent company-specific news only when available. In "newsContext", describe only material facts supported by grounded sources; otherwise write "No grounded company-news sources were available for this request." Do not invent headlines, FII/DII flows, fundamentals, delivery percentages, corporate actions, price targets, stop-loss levels or order-book liquidity.
Return JSON with:
{
  "bias": "Bullish" | "Bearish" | "Mixed" | "Neutral",
  "summary": "A short explanation that separates measured indicators from interpretation.",
  "bullishFactors": ["evidence-based items; can be empty"],
  "bearishFactors": ["evidence-based risks; can be empty"],
  "watchItems": ["what to verify in the next session; not a recommendation"],
  "newsContext": "Grounded news summary or explicit unavailable status",
  "disclaimer": "A brief note that this is educational analysis, not personalized financial advice."
}
Use only the supplied technical values and the sources actually returned by grounding. Do not claim an executable arbitrage opportunity. Keep arrays to five items and all output in ${language}.
`;
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json',
          },
        });
        let parsed: any = null;
        try {
          parsed = JSON.parse(response.text || '');
        } catch {
          const match = response.text?.match(/\{[\s\S]*\}/);
          if (match) {
            try { parsed = JSON.parse(match[0]); } catch { parsed = null; }
          }
        }
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const safeArray = (value: unknown) => Array.isArray(value)
            ? value.filter((item: unknown) => typeof item === 'string').slice(0, 5).map((item: string) => item.slice(0, 500))
            : [];
          aiAnalysis = {
            bias: ['Bullish', 'Bearish', 'Mixed', 'Neutral'].includes(parsed.bias) ? parsed.bias : 'Mixed',
            summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 2500) : '',
            bullishFactors: safeArray(parsed.bullishFactors),
            bearishFactors: safeArray(parsed.bearishFactors),
            watchItems: safeArray(parsed.watchItems),
            newsContext: typeof parsed.newsContext === 'string' ? parsed.newsContext.slice(0, 1500) : 'No grounded company-news sources were available for this request.',
            disclaimer: typeof parsed.disclaimer === 'string' ? parsed.disclaimer.slice(0, 500) : 'Educational information only; not personalized financial advice.',
          };
        } else {
          aiError = 'The model returned an invalid response format. Retry the analysis.';
        }

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (Array.isArray(groundingChunks)) {
          sources = groundingChunks
            .map((chunk: any) => ({ title: chunk.web?.title, url: chunk.web?.uri }))
            .filter((item: any) => typeof item.url === 'string' && /^https:\/\//i.test(item.url))
            .slice(0, 8);
        }
      } catch (error) {
        // Avoid sending SDK error details that could contain request or account metadata.
        console.warn('[EOD Analysis] Gemini request failed.');
        aiError = 'Gemini could not complete this request. Check the key and model access; the computed technical report is still available.';
      }
    }

    return res.json({
      success: true,
      report: snapshot,
      aiAnalysis,
      aiError,
      sources,
      provider: marketData.provider,
      fetchedAt: new Date().toISOString(),
      dataAvailable: true,
      aiAvailable: Boolean(aiAnalysis),
    });
  } catch (error) {
    console.warn('[EOD Analysis] Market data request failed:', error instanceof Error ? error.message : 'Unknown provider error');
    return res.status(502).json({
      success: false,
      error: error instanceof Error
        ? error.message.slice(0, 240)
        : 'The configured market-data provider did not return usable daily candles.',
    });
  }
});

// 6. Third-party Indian market data endpoints (Yahoo Finance quote/history metadata)
app.get('/api/market/stocks', async (req, res) => {
  // Quote responses must not be cached by browsers, CDNs, or installed PWAs.
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });
  try {
    const quotes = await getRealIndianStockQuotes();
    return res.json({
      success: true,
      count: quotes.length,
      dataSource: 'Yahoo Finance quote/history metadata (third-party provider; not a direct official NSE/BSE feed)',
      isLiveOfficial: false,
      timestamp: new Date().toISOString(),
      stocks: quotes,
    });
  } catch (err: any) {
    console.warn('[Market Feed] Error fetching real stocks:', err?.message);
    return res.status(500).json({ error: 'Failed to fetch live quotes' });
  }
});

app.get('/api/market/benchmarks', async (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });
  try {
    const benchmarks = await getRealBenchmarks();
    return res.json({
      success: true,
      dataSource: 'Yahoo Finance index quote metadata (third-party provider)',
      timestamp: new Date().toISOString(),
      benchmarks,
    });
  } catch (err: any) {
    console.warn('[Market Feed] Error fetching real benchmarks:', err?.message);
    return res.status(500).json({ error: 'Failed to fetch benchmarks' });
  }
});

// Historical candles are non-user-specific. Keep the chart/landing client public;
// /api/market remains rate-limited and this handler validates query inputs.
app.get('/api/market/history', async (req, res) => {
  try {
    const ticker = (typeof req.query.ticker === 'string' ? req.query.ticker : 'RELIANCE').toUpperCase();
    const range = (req.query.range as string) || '3mo';
    const interval = (req.query.interval as string) || '1d';
    const allowedRanges = new Set(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max']);
    const allowedIntervals = new Set(['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo']);

    if (!/^[A-Z0-9.^_-]{1,20}$/.test(ticker) || !allowedRanges.has(range) || !allowedIntervals.has(interval)) {
      return res.status(400).json({ error: 'Invalid ticker, range, or interval.' });
    }

    const candles = await getRealStockHistory(ticker, range, interval);
    return res.json({
      success: true,
      ticker,
      range,
      interval,
      count: candles.length,
      dataSource: 'Yahoo Finance historical chart data (third-party provider; BSE historical closes are not separately verified)',
      candles,
    });
  } catch (err: any) {
    console.warn('[Market Feed] Error fetching history:', err?.message);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Historical dividend events only. Future announcement/record/payment dates are not inferred.
app.get('/api/market/dividends', requireAuth, async (req: AuthRequest, res) => {
  const raw = typeof req.query.tickers === 'string'
    ? req.query.tickers
    : (typeof req.query.ticker === 'string' ? req.query.ticker : '');
  const tickers = Array.from(new Set(raw.split(',').map((item) => item.trim().toUpperCase())))
    .filter((ticker) => ticker.length > 0 && ticker.length <= 20)
    .slice(0, 25);
  const rangeInput = typeof req.query.range === 'string' ? req.query.range : '5y';
  const range = rangeInput === '1y' || rangeInput === '10y' ? rangeInput : '5y';
  if (tickers.length === 0) {
    return res.status(400).json({ success: false, error: 'Provide at least one ticker symbol.' });
  }

  const coverage = await Promise.all(tickers.map(async (ticker) => {
    try {
      const events = await getRealStockDividends(ticker, range);
      return { ticker, available: true, events };
    } catch {
      return { ticker, available: false, events: [] };
    }
  }));
  const dividends = coverage.flatMap((item) => item.events).sort((left, right) => right.exDate.localeCompare(left.exDate));
  return res.json({
    success: true,
    range,
    tickers,
    coverage: coverage.map((item) => ({ ticker: item.ticker, available: item.available, eventCount: item.events.length })),
    count: dividends.length,
    retrievedAt: new Date().toISOString(),
    dataSource: 'Yahoo Finance historical dividend events (third-party; not an official NSE/BSE feed)',
    dividends,
    limitations: [
      'Past dividend events only; future company announcements, record dates, payment dates and payout ratios are not inferred.',
      'Coverage may be incomplete; verify against company filings or exchange announcements.',
    ],
  });
});

// 7. Cloud SQL Relational Endpoints (Protected by Firebase Auth)
app.post('/api/sql/sync-user', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || `${uid}@user.marktxpo.ai`;
    if (!uid) {
      return res.status(401).json({ error: 'Missing user identification' });
    }
    const requestedName = req.body?.displayName;
    if (requestedName !== undefined
      && (typeof requestedName !== 'string' || requestedName.trim().length > 100)) {
      return res.status(400).json({ error: 'Display name must be a string of at most 100 characters.' });
    }
    const displayName = typeof requestedName === 'string' && requestedName.trim()
      ? requestedName.trim()
      : undefined;
    const synced = await getOrCreateUser(uid, email, displayName);
    return res.json({ success: true, user: synced });
  } catch (err: any) {
    console.error('[Cloud SQL] User sync error:', err?.message);
    return res.status(500).json({ error: 'Database user sync failed' });
  }
});

app.get('/api/sql/watchlist', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    const items = await getUserWatchlist(uid);
    return res.json({ success: true, watchlist: items });
  } catch (err: any) {
    console.error('[Cloud SQL] Watchlist fetch error:', err?.message);
    return res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

app.post('/api/sql/watchlist', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const ticker = typeof body.ticker === 'string' ? body.ticker.trim().toUpperCase() : '';
    const stockName = typeof body.stockName === 'string' ? body.stockName.trim() : '';
    const exchange = typeof body.exchange === 'string' ? body.exchange.trim().toUpperCase() : 'NSE';
    const targetPrice = body.targetPrice;
    const notes = body.notes;

    if (!/^[A-Z0-9][A-Z0-9.&_-]{0,19}$/.test(ticker)) {
      return res.status(400).json({ error: 'Ticker must be 1–20 characters and contain only valid symbol characters' });
    }
    if (!stockName || stockName.length > 100) {
      return res.status(400).json({ error: 'Stock name must contain 1–100 characters' });
    }
    if (!['NSE', 'BSE', 'BOTH'].includes(exchange)) {
      return res.status(400).json({ error: 'Exchange must be NSE, BSE, or BOTH' });
    }
    if (targetPrice !== undefined && targetPrice !== null
      && (typeof targetPrice !== 'number' || !Number.isFinite(targetPrice) || targetPrice <= 0)) {
      return res.status(400).json({ error: 'Target price must be a positive finite number' });
    }
    if (notes !== undefined && notes !== null
      && (typeof notes !== 'string' || notes.length > 500)) {
      return res.status(400).json({ error: 'Notes must be a string of at most 500 characters' });
    }

    const created = await addWatchlistItem({
      userId: uid,
      ticker,
      stockName,
      exchange,
      targetPrice: typeof targetPrice === 'number' ? targetPrice : undefined,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : undefined,
    });
    return res.json({ success: true, item: created });
  } catch (err: any) {
    console.error('[Cloud SQL] Add watchlist error:', err?.message);
    return res.status(500).json({ error: 'Failed to save to database' });
  }
});

app.get('/api/sql/portfolio', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    const positions = await getUserPortfolio(uid);
    return res.json({ success: true, portfolio: positions });
  } catch (err: any) {
    console.error('[Cloud SQL] Portfolio fetch error:', err?.message);
    return res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// Avoid background network work during serverless cold starts.
if (process.env.VERCEL !== '1') {
  setTimeout(async () => {
    try {
      await Promise.allSettled([getRealBenchmarks(), getRealIndianStockQuotes()]);
    } catch {}
  }, 1000);
}

const distPath = path.join(__dirname, 'dist');
const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

const QUIET_UNREGISTER_SW = `
self.addEventListener('install', function() {
  self.skipWaiting();
});
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() {
      return self.registration.unregister();
    })
  );
});
`;

const VITE_CLIENT_NOOP_MODULE = `
const sheetsMap = new Map();
export function updateStyle(id, content) {
  if (typeof document === "undefined") return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    style.textContent = content;
    document.head.appendChild(style);
  } else {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style && style.parentNode) {
    style.parentNode.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext(ownerPath) {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
    ownerPath,
  };
}
export function injectQuery(url) { return url; }
const BaseHTMLElement = typeof HTMLElement !== "undefined" ? HTMLElement : class {};
export class ErrorOverlay extends BaseHTMLElement { close() {} }
`;

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'MarKtXPO Indian Equity Intelligence',
    timestamp: new Date().toISOString(),
  });
});

app.get(['/@vite/client', '/node_modules/vite/dist/client/client.mjs'], (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.send(VITE_CLIENT_NOOP_MODULE);
});

app.get('/@react-refresh', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.send(`
export function injectIntoGlobalHook() {}
export function register() {}
export function createSignatureFunctionForTransform() { return (type) => type; }
export default { injectIntoGlobalHook, register, createSignatureFunctionForTransform };
`);
});

app.get('/manifest.webmanifest', (_req, res) => {
  const distManifest = path.join(distPath, 'manifest.webmanifest');
  const pubManifest = path.join(__dirname, 'public', 'manifest.webmanifest');
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  if (fs.existsSync(distManifest)) {
    return res.sendFile(distManifest);
  }
  if (fs.existsSync(pubManifest)) {
    return res.sendFile(pubManifest);
  }
  return res.status(404).end();
});

app.get('/registerSW.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  const distRegSw = path.join(distPath, 'registerSW.js');
  if (fs.existsSync(distRegSw)) {
    return res.sendFile(distRegSw);
  }
  res.send('// Service worker registration ready');
});

app.get(['/sw.js', '/workbox-*.js'], (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  const requestedFile = path.basename(req.path);
  const distFile = path.join(distPath, requestedFile);
  if (fs.existsSync(distFile)) {
    return res.sendFile(distFile);
  }
  res.send(QUIET_UNREGISTER_SW);
});

app.get('/assets/:file', (req, res, next) => {
  const file = req.params.file;
  const exactPath = path.join(distPath, 'assets', file);
  if (fs.existsSync(exactPath)) {
    return res.sendFile(exactPath);
  }
  if (/^index-[A-Za-z0-9_-]+\.js$/.test(file)) {
    const currentJs = path.join(distPath, 'assets', 'index.js');
    if (fs.existsSync(currentJs)) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(currentJs);
    }
  }
  if (/^index-[A-Za-z0-9_-]+\.css$/.test(file)) {
    const currentCss = path.join(distPath, 'assets', 'index.css');
    if (fs.existsSync(currentCss)) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(currentCss);
    }
  }
  next();
});

// Export the Express app for Vercel's catch-all function. Traditional Node
// deployments keep the existing static/Vite setup and listen on PORT.
if (process.env.VERCEL !== '1') {
  if (process.env.NODE_ENV === 'production' || hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/assets/') || req.path.startsWith('/node_modules/') || req.path.startsWith('/src/')) {
        return res.status(404).end();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const httpServer = http.createServer(app);
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`MarKtXPO Server running on http://0.0.0.0:${port}`);
  });
}

export default app;
