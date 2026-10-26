/**
 * Gmail Workspace Integration Service for MarKtXPO
 * Provides authenticated Gmail access, email dispatch with user confirmation,
 * inbox query for contract notes & market feeds, and draft creation.
 */

import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { auth } from './firebase';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
];

// In-memory token cache (strictly not stored in localStorage)
let inMemoryAccessToken: string | null = null;

export function getGmailAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setGmailAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export interface GmailAuthResult {
  user: User | null;
  accessToken: string | null;
  cancelled?: boolean;
  errorMessage?: string;
}

/**
 * Sign in or re-authenticate with Google requesting Gmail Web OAuth scopes.
 * Gracefully catches popup closure/cancellation so no raw FirebaseError is thrown.
 */
export async function authenticateWithGmail(): Promise<GmailAuthResult> {
  const provider = new GoogleAuthProvider();
  GMAIL_SCOPES.forEach((scope) => {
    provider.addScope(scope);
  });
  provider.setCustomParameters({
    prompt: 'consent',
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      return {
        user: result.user,
        accessToken: null,
        errorMessage: 'No Google Workspace access token was returned. Please try again and grant Gmail permissions.',
      };
    }

    inMemoryAccessToken = credential.accessToken;
    return { user: result.user, accessToken: credential.accessToken };
  } catch (err: any) {
    const code = String(err?.code || '').toLowerCase();
    const msg = String(err?.message || '');
    if (
      code.includes('popup-closed-by-user') ||
      code.includes('cancelled-popup-request') ||
      msg.includes('popup-closed-by-user')
    ) {
      return {
        user: null,
        accessToken: null,
        cancelled: true,
        errorMessage: 'Google sign-in window was closed before completing authorization. Click below when ready to connect.',
      };
    }
    if (code.includes('popup-blocked')) {
      return {
        user: null,
        accessToken: null,
        cancelled: true,
        errorMessage: 'Sign-in popup was blocked by the browser. Please allow popups for this site and try again.',
      };
    }
    if (code.includes('unauthorized-domain')) {
      return {
        user: null,
        accessToken: null,
        errorMessage: 'This preview domain is not yet listed in Firebase Authorized Domains for Google Workspace OAuth.',
      };
    }
    return {
      user: null,
      accessToken: null,
      errorMessage: 'Google Workspace Gmail sign-in could not be completed. Please try again.',
    };
  }
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  date?: string;
  labels?: string[];
}

/**
 * Get basic profile info for the authorized Gmail account
 */
export async function getGmailProfile(accessToken: string): Promise<GmailProfile> {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Gmail Profile API error (${res.status})`);
  }

  return (await res.json()) as GmailProfile;
}

/**
 * List recent messages matching a query (e.g. "NSE", "BSE", "Contract Note", "Market")
 */
export async function listGmailMessages(
  accessToken: string,
  query: string = '',
  maxResults: number = 10
): Promise<GmailMessageSummary[]> {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
  });
  if (query.trim()) {
    params.set('q', query.trim());
  }

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Gmail List Messages API error (${res.status})`);
  }

  const data = await res.json();
  const rawList: { id: string; threadId: string }[] = data.messages || [];

  // Fetch headers for each message concurrently (up to 10)
  const summaries = await Promise.all(
    rawList.slice(0, maxResults).map(async (msg) => {
      try {
        const itemRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          }
        );
        if (!itemRes.ok) return { id: msg.id, threadId: msg.threadId };
        const itemData = await itemRes.json();
        const headers = itemData.payload?.headers || [];
        const subject = headers.find((h: any) => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)';
        const from = headers.find((h: any) => h.name?.toLowerCase() === 'from')?.value || '';
        const date = headers.find((h: any) => h.name?.toLowerCase() === 'date')?.value || '';

        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: itemData.snippet || '',
          subject,
          from,
          date,
          labels: itemData.labelIds || [],
        };
      } catch {
        return { id: msg.id, threadId: msg.threadId };
      }
    })
  );

  return summaries;
}

/**
 * Encode an RFC 2822 email string as a base64url string
 */
function encodeEmailRaw(to: string, from: string, subject: string, htmlContent: string, plainText?: string): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const cleanPlain = plainText || htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  const rfcLines = [
    `To: ${to}`,
    from ? `From: ${from}` : '',
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    cleanPlain,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlContent,
    '',
    `--${boundary}--`,
  ].filter(Boolean);

  const fullStr = rfcLines.join('\r\n');

  // Convert to base64url (RFC 4648 §5)
  return btoa(unescape(encodeURIComponent(fullStr)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export interface SendEmailPayload {
  to: string;
  from?: string;
  subject: string;
  htmlBody: string;
  plainText?: string;
}

/**
 * Send an email directly via the Gmail REST API
 * (Must only be executed after explicit user confirmation in the UI)
 */
export async function sendGmailEmail(accessToken: string, payload: SendEmailPayload): Promise<{ id: string; threadId: string }> {
  const raw = encodeEmailRaw(payload.to, payload.from || '', payload.subject, payload.htmlBody, payload.plainText);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to send email via Gmail (${res.status})`);
  }

  return await res.json();
}

/**
 * Save an email as a draft in Gmail
 */
export async function createGmailDraft(accessToken: string, payload: SendEmailPayload): Promise<{ id: string; message: { id: string } }> {
  const raw = encodeEmailRaw(payload.to, payload.from || '', payload.subject, payload.htmlBody, payload.plainText);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { raw },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to create Gmail draft (${res.status})`);
  }

  return await res.json();
}

/**
 * Generate formatted HTML template for Indian Equity Market Intelligence
 */
export function buildMarketReportEmailHtml(params: {
  title: string;
  traderName: string;
  summaryText: string;
  stocks: Array<{
    ticker: string;
    name: string;
    nsePrice: number;
    bsePrice: number;
    spread: number;
    changePercent: number;
  }>;
  benchmarks?: Array<{ name: string; value: number; changePercent: number }>;
}): string {
  const benchRows = (params.benchmarks || [])
    .map(
      (b) => `
      <td style="padding: 12px; background: #0f172a; border-radius: 8px; text-align: center; border: 1px solid #1e293b;">
        <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">${b.name}</div>
        <div style="font-size: 18px; font-weight: 700; color: #f8fafc; margin: 4px 0;">₹${b.value.toLocaleString('en-IN')}</div>
        <div style="font-size: 12px; font-weight: 600; color: ${b.changePercent >= 0 ? '#10b981' : '#ef4444'};">
          ${b.changePercent >= 0 ? '+' : ''}${b.changePercent.toFixed(2)}%
        </div>
      </td>
    `
    )
    .join('');

  const stockRows = params.stocks
    .map(
      (s) => `
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 12px 10px; font-weight: 700; color: #f8fafc;">
          ${s.ticker}
          <div style="font-size: 11px; color: #64748b; font-weight: 400;">${s.name}</div>
        </td>
        <td style="padding: 12px 10px; color: #cbd5e1; text-align: right;">₹${s.nsePrice.toFixed(2)}</td>
        <td style="padding: 12px 10px; color: #cbd5e1; text-align: right;">₹${s.bsePrice.toFixed(2)}</td>
        <td style="padding: 12px 10px; text-align: right; font-weight: 600; color: ${s.spread > 0.1 ? '#f59e0b' : '#94a3b8'};">
          ${s.spread.toFixed(2)}%
        </td>
        <td style="padding: 12px 10px; text-align: right; font-weight: 700; color: ${s.changePercent >= 0 ? '#10b981' : '#ef4444'};">
          ${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%
        </td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${params.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #e2e8f0; margin: 0; padding: 24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="padding: 24px; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border-bottom: 1px solid #1e293b;">
        <table width="100%">
          <tr>
            <td>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; font-weight: 700;">MarKtXPO Intelligence Brief</div>
              <h1 style="margin: 6px 0 0; font-size: 22px; color: #f8fafc; font-weight: 800;">${params.title}</h1>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <span style="display: inline-block; background: #22c55e22; color: #22c55e; border: 1px solid #22c55e44; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">
                LIVE DISPATCH
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Trader Greeting & Summary -->
    <tr>
      <td style="padding: 20px 24px; border-bottom: 1px solid #1e293b;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #94a3b8;">Hello <strong style="color: #f1f5f9;">${params.traderName}</strong>,</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">${params.summaryText}</p>
      </td>
    </tr>

    <!-- Benchmarks if available -->
    ${
      params.benchmarks && params.benchmarks.length > 0
        ? `
    <tr>
      <td style="padding: 16px 24px 8px;">
        <table width="100%" cellpadding="4" cellspacing="0">
          <tr>${benchRows}</tr>
        </table>
      </td>
    </tr>`
        : ''
    }

    <!-- Equity Table -->
    <tr>
      <td style="padding: 16px 24px;">
        <h3 style="margin: 0 0 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8;">High-Impact Equities & Cross-Exchange Spreads</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #334155; color: #94a3b8; font-size: 11px; text-transform: uppercase;">
              <th style="padding: 8px 10px; text-align: left;">Symbol</th>
              <th style="padding: 8px 10px; text-align: right;">NSE</th>
              <th style="padding: 8px 10px; text-align: right;">BSE</th>
              <th style="padding: 8px 10px; text-align: right;">Spread</th>
              <th style="padding: 8px 10px; text-align: right;">Change</th>
            </tr>
          </thead>
          <tbody>
            ${stockRows}
          </tbody>
        </table>
      </td>
    </tr>

    <!-- Footer & Disclaimer -->
    <tr>
      <td style="padding: 20px 24px; background-color: #020617; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; line-height: 1.5;">
        <p style="margin: 0 0 6px;">
          Generated automatically by <strong>MarKtXPO</strong> with Google Workspace Gmail Integration.
        </p>
        <p style="margin: 0;">
          <strong>SEBI Educational Disclaimer:</strong> Data provided for informational and analytical purposes only. Cross-exchange spreads do not constitute guaranteed arbitrage without considering trading fees, order book depth, and STT.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
