// Normalize Vercel's function-relative URL before dispatching to Express.
import app from '../../server.ts';
import { createVercelExpressHandler } from '../../src/lib/vercelExpressHandler.ts';

export default createVercelExpressHandler(app, '/api/ai/sentiment');
