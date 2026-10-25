import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken | { uid: string; email?: string };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const fallbackUid = req.headers['x-trader-uid'] as string | undefined;
  const fallbackEmail = req.headers['x-trader-email'] as string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    if (token && !token.startsWith('fallback:')) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        req.user = decodedToken;
        return next();
      } catch (error) {
        // If token verification fails but fallback headers are present, allow fallback session sync
        if (fallbackUid) {
          req.user = { uid: fallbackUid, email: fallbackEmail };
          return next();
        }
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
    }
  }

  if (fallbackUid) {
    req.user = { uid: fallbackUid, email: fallbackEmail };
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
};
