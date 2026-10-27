import type { Application, Request, Response } from 'express';
import { createVercelExpressHandler } from '../src/lib/vercelExpressHandler.ts';

/**
 * Vercel's non-Next.js filesystem routing does not support a nested catch-all
 * API handler. vercel.json rewrites /api/* requests to this explicit function
 * and passes the original nested path in the "path" query parameter.
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

let appPromise: Promise<Application> | undefined;

export default async function handler(req: Request, res: Response) {
  try {
    // Load Express lazily so module initialisation errors can be returned as a
    // controlled API response and recorded in the Vercel function logs.
    appPromise ??= import('../server.ts').then((module) => module.default);
    const app = await appPromise;
    return createVercelExpressHandler(app, resolveApiRoute)(req, res);
  } catch (error: unknown) {
    const name = error instanceof Error ? error.name : 'UnknownError';
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : '';
    console.error('[Vercel API] Express app initialization failed', error);
    const response: Record<string, string> = {
      error: 'API initialization failed. Check the Vercel function logs.',
      code: code || name,
    };
    // Keep diagnostics private on production deployments.
    if (process.env.VERCEL_ENV !== 'production' && error instanceof Error) {
      response.previewDiagnostic = error.message.slice(0, 500);
    }
    return res.status(500).json(response);
  }
}
