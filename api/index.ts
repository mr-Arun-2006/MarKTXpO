import type { Request } from 'express';
import app from '../server.ts';
import { createVercelExpressHandler } from '../src/lib/vercelExpressHandler.ts';

/**
 * Vercel's non-Next.js filesystem routing does not support this app's nested
 * catch-all API handler. vercel.json rewrites /api/* requests to this single
 * function and passes the original nested path in the "path" query parameter.
 */
function resolveApiRoute(req: Request): string {
  const routeParam = req.query.path;
  const segments = Array.isArray(routeParam)
    ? routeParam.map(String)
    : typeof routeParam === 'string'
      ? routeParam.split('/')
      : [];
  const normalizedPath = segments.filter(Boolean).join('/');

  if (normalizedPath) return `/api/${normalizedPath}`;

  const incomingUrl = new URL(req.url || '/', 'http://localhost');
  return incomingUrl.pathname === '/api/index' ? '/api' : incomingUrl.pathname;
}

export default createVercelExpressHandler(app, resolveApiRoute);
