import type { Request } from 'express';
import app from '../server.ts';
import { createVercelExpressHandler } from '../src/lib/vercelExpressHandler.ts';

function resolveApiRoute(req: Request): string {
  const incomingUrl = new URL(req.url || '/', 'http://localhost');

  // Prefer the original URL when the adapter preserves it.
  if (incomingUrl.pathname.startsWith('/api/')) {
    return incomingUrl.pathname;
  }

  // Vercel exposes catch-all route segments as req.query.path.
  const routeParam = req.query.path;
  const segments = Array.isArray(routeParam)
    ? routeParam.map(String)
    : typeof routeParam === 'string'
      ? routeParam.split('/')
      : [];

  const normalizedPath = segments.filter(Boolean).join('/');
  return normalizedPath ? `/api/${normalizedPath}` : '/api';
}

export default createVercelExpressHandler(app, resolveApiRoute);
