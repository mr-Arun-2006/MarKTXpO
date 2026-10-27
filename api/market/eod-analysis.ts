// Route-specific Vercel Function for authenticated daily EOD analysis.
import app from '../../server.ts';
import { createVercelExpressHandler } from '../../src/lib/vercelExpressHandler.ts';

export default createVercelExpressHandler(app, '/api/market/eod-analysis');
