// Route-specific Vercel Function for historical dividend events.
import app from '../../server.ts';
import { createVercelExpressHandler } from '../../src/lib/vercelExpressHandler.ts';

export default createVercelExpressHandler(app, '/api/market/dividends');
