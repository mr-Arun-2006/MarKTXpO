import express from 'express';
import http from 'http';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  getRealIndianStockQuotes,
  getRealBenchmarks,
  getRealStockHistory,
} from './src/services/realMarketData.ts';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
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
    return res.status(429).json({ error: 'AI request limit reached. Please retry later.' });
  }

  entry.count += 1;
  return next();
}

// If hosted behind a single trusted platform proxy, req.ip reflects the client IP.
app.set('trust proxy', 1);
app.use('/api/ai', limitAiRequests);

// Helper to instantiate Gemini SDK with proper telemetry headers
function getGeminiClient(customApiKey?: string) {
  const apiKey = customApiKey?.trim() || process.env.GEMINI_API_KEY;
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
app.post('/api/ai/explain', async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const safeString = (value: unknown, fallback: string, maxLength: number) =>
    typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : fallback;
  const safeNumber = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;

  const ticker = safeString(body.ticker, 'STOCK', 20).toUpperCase();
  const companyName = safeString(body.companyName, ticker, 120);
  const sector = safeString(body.sector, 'Unavailable', 80);
  const language = safeString(body.language, 'English', 40);
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
    'explain', ticker, language, price, changePercent, rsi, macdSignal,
    dma50, dma200, pe, nsePrice, bsePrice, volumeMultiplier, arbitragePercent,
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
Explain this third-party quote snapshot for Indian equity ${companyName} (${ticker}) in ${language}.
All values below were supplied by the caller and have not been independently verified:
- Sector: ${sector}
- Price: ₹${price}; daily change: ${changePercent !== undefined ? `${changePercent}%` : 'unavailable'}
- RSI(14): ${rsi ?? 'unavailable'}
- MACD direction: ${macdSignal}
- 50-day and 200-day moving averages: ${dma50 ?? 'unavailable'} and ${dma200 ?? 'unavailable'}
- P/E reference: ${pe ?? 'unavailable'}
- NSE/BSE quote values: ${nsePrice ?? 'unavailable'} and ${bsePrice ?? 'unavailable'}
- Cross-provider price difference: ${arbitragePercent !== undefined ? `${arbitragePercent}%` : 'unavailable'}
- Volume multiplier: ${volumeMultiplier ?? 'unavailable'}

Do not invent current news, macroeconomic catalysts, institutional flows, delivery data, market depth, or trading costs. Do not describe the provider as an official exchange feed. Clearly distinguish observed inputs from interpretation and explain missing fields. If you discuss a possible trade setup, make it conditional and educational, not a recommendation or guarantee. Mention that any price difference is not an executable arbitrage opportunity without synchronized bid/ask quotes, market depth and fees.
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
app.post('/api/ai/sentiment', async (req, res) => {
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
app.post('/api/ai/news-digest', async (req, res) => {
  const ticker = (req.body.ticker || 'STOCK').toUpperCase();
  const companyName = req.body.companyName || ticker;
  const language = req.body.language || 'English';
  const userApiKey = req.body.userApiKey;

  // 1. Check in-memory cache first to avoid repetitive API calls and rate-limiting
  const cacheKey = `news_${ticker}_${language}`;
  const cached = newsDigestCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() && cached.data?.dataAvailable !== false) {
    return res.json(cached.data);
  }

  const ai = getGeminiClient(userApiKey);
  if (!ai) {
    return res.json(getCuratedStockNewsDigest(ticker, companyName, language));
  }

  try {
    const prompt = `
Find the latest financial news, quarterly earnings, corporate developments, and market events for Indian equity: ${companyName} (${ticker}), listed on NSE and BSE.
Gather recent relevant news headlines and market reports using your Google Search tool.
Return a structured JSON object with this exact schema:
{
  "ticker": "${ticker}",
  "companyName": "${companyName}",
  "oneSentenceImpact": "A single sharp, insightful sentence summarizing the direct potential market impact of this news on the stock price and trader sentiment in ${language}.",
  "overallSentiment": "Bullish" | "Bearish" | "Neutral",
  "headlines": [
    {
      "title": "Concise headline string",
      "source": "Source name (e.g. Economic Times, Moneycontrol, Livemint, CNBC TV18, Reuters)",
      "timeAgo": "e.g. 2 hours ago or 1 day ago",
      "snippet": "1 sentence takeaway of the news item",
      "sentimentTag": "Bullish" | "Neutral" | "Bearish",
      "impactScore": number between -100 and +100
    }
  ]
}
`;

    let response: any = null;
    try {
      // Step 1: Attempt with Google Search Grounding
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
        },
      });
    } catch (_searchQuotaErr: any) {
      // Step 2: If Search Grounding is rate-limited (429) or unavailable, fallback to fast text generation
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
      } catch (_textQuotaErr: any) {
        // Step 3: Quota exhausted; smoothly return institutional curated intelligence
        response = null;
      }
    }

    if (!response || !response.text) {
      const curated = getCuratedStockNewsDigest(ticker, companyName, language);
      return res.json(curated);
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(response.text || '{}');
    } catch {
      const match = response.text?.match(/\{[\s\S]*\}/);
      if (match) parsedData = JSON.parse(match[0]);
    }

    // Attach search grounding citations if present
    const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (searchChunks && Array.isArray(searchChunks)) {
      parsedData.sources = searchChunks
        .map((c: any) => ({
          title: c.web?.title,
          url: c.web?.uri,
        }))
        .filter((s: any) => s.url);
    }

    // A current-news result is only considered available when headlines and
    // source URLs are present. Do not merge ungrounded model prose into a fallback.
    if (!parsedData.oneSentenceImpact || !Array.isArray(parsedData.headlines) ||
        parsedData.headlines.length === 0 || !Array.isArray(parsedData.sources) ||
        parsedData.sources.length === 0) {
      return res.json(getCuratedStockNewsDigest(ticker, companyName, language));
    }

    parsedData.dataAvailable = true;
    parsedData.dataStatus = 'GROUNDED_NEWS';
    setBoundedCache(newsDigestCache, cacheKey, parsedData, 15 * 60 * 1000);
    return res.json(parsedData);
  } catch (_generalErr: any) {
    return res.json(getCuratedStockNewsDigest(ticker, companyName, language));
  }
});

// 4. AI Strategy & Backtesting Audit Endpoint
app.post('/api/ai/strategy-audit', async (req, res) => {
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
app.post('/api/ai/portfolio-risk', async (req, res) => {
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
app.post('/api/ai/test-key', async (req, res) => {
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
app.post('/api/ai/chat', async (req, res) => {
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

// 6. Third-party Indian market data endpoints (Yahoo Finance quote/history metadata)
app.get('/api/market/stocks', async (req, res) => {
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

// 7. Cloud SQL Relational Endpoints (Protected by Firebase Auth)
app.post('/api/sql/sync-user', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || `${uid}@user.marktxpo.ai`;
    if (!uid) {
      return res.status(401).json({ error: 'Missing user identification' });
    }
    const synced = await getOrCreateUser(uid, email, req.body?.displayName);
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
    const { ticker, stockName, exchange, targetPrice, notes } = req.body;
    if (!ticker || !stockName) {
      return res.status(400).json({ error: 'Ticker and stockName are required' });
    }
    const created = await addWatchlistItem({
      userId: uid,
      ticker,
      stockName,
      exchange: exchange || 'NSE',
      targetPrice: typeof targetPrice === 'number' ? targetPrice : undefined,
      notes: notes || undefined,
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

// Export the Express app for Vercel's catch-all function. Traditional Node
// deployments keep the existing static/Vite setup and listen on PORT.
if (process.env.VERCEL !== '1') {
  if (process.env.NODE_ENV === 'production' || hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
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
