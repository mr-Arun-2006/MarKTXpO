// Route all /api/* requests through the existing Express handlers.
// server.ts exports the app without opening a long-lived listener on Vercel.
import app from '../server.ts';

export default app;
