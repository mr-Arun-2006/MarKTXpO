import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { isDevelopmentFallbackAuthEnabled } from './authPolicy.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken | { uid: string; email?: string };
}

const unauthorized = (res: Response, message = 'Unauthorized') =>
  res.status(401).json({ error: message });

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authorization = req.headers.authorization;
  const fallbackUidHeader = req.headers['x-trader-uid'];
  const fallbackEmailHeader = req.headers['x-trader-email'];
  const fallbackUid = typeof fallbackUidHeader === 'string'
    ? fallbackUidHeader.trim()
    : '';
  const fallbackEmail = typeof fallbackEmailHeader === 'string'
    && fallbackEmailHeader.length <= 254
    ? fallbackEmailHeader.trim()
    : undefined;

  const allowDevelopmentFallback = isDevelopmentFallbackAuthEnabled();

  const useDevelopmentFallback = (): boolean => {
    if (!allowDevelopmentFallback || !fallbackUid || fallbackUid.length > 128) {
      return false;
    }

    req.user = {
      uid: fallbackUid,
      ...(fallbackEmail ? { email: fallbackEmail } : {}),
    };
    return true;
  };

  // A supplied bearer token is authoritative. Never downgrade an invalid token
  // to forgeable identity headers.
  if (authorization !== undefined) {
    if (!authorization.startsWith('Bearer ')) {
      return unauthorized(res, 'Unauthorized: Invalid authorization format');
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      return unauthorized(res, 'Unauthorized: Missing bearer token');
    }

    if (token.startsWith('fallback:')) {
      if (useDevelopmentFallback()) return next();
      return unauthorized(res, 'Unauthorized: Development fallback auth is disabled');
    }

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = decodedToken;
      return next();
    } catch {
      return unauthorized(res, 'Unauthorized: Invalid token');
    }
  }

  // Legacy/local fallback sessions are opt-in and never enabled in production.
  if (useDevelopmentFallback()) return next();

  return unauthorized(res, 'Unauthorized: Missing or invalid token');
};
