import type { Application, Request, Response } from 'express';

/**
 * Adapts a route-specific Vercel Function to the shared Express app.
 *
 * Some serverless adapters provide a function-relative URL rather than the
 * original /api/... URL. The function-file path is already known here, so
 * normalize the URL before Express evaluates its route table. Query strings
 * are kept intact for endpoints such as /api/market/history?ticker=RELIANCE.
 */
export function createVercelExpressHandler(app: Application, routePath: string) {
  return function vercelExpressHandler(req: Request, res: Response) {
    const incomingUrl = new URL(req.url || '/', 'http://localhost');
    req.url = `${routePath}${incomingUrl.search}`;
    return app(req, res);
  };
}
