// Vite remains the frontend build; this function forwards /api/* requests
// through the existing Express handlers without starting a persistent listener.
import app from '../server.ts';

export default app;
