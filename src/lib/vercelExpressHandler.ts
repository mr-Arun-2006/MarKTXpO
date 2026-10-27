import type { Application, Request, Response } from 'express';

type RoutePathResolver = (req: Request) => string;

/**
 * Adapts a Vercel Function URL to the shared Express application.
 * A fixed path supports route-specific functions; a resolver supports a
 * catch-all function while preserving query strings for Express handlers.
 */
export function createVercelExpressHandler(
  app: Application,
  routePath: string | RoutePathResolver,
) {
  return function vercelExpressHandler(req: Request, res: Response) {
    const incomingUrl = new URL(req.url || '/', 'http://localhost');
    const resolvedPath =
      typeof routePath === 'string' ? routePath : routePath(req);

    req.url = `${resolvedPath}${incomingUrl.search}`;
    return app(req, res);
  };
}
