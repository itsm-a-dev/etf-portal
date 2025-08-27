import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { initDb } from './db.js';
import authRouter, { requireAuth } from './auth.js';
import uploadRouter from './upload.js';
import etfsRouter from './etfs.js';

// Initialize DB before accepting requests
await initDb();

const app = express();

// --- CORS configuration ---
// Apply CORS globally so every route, incl. /auth/login, gets the header
app.use(cors({ origin: process.env.CORS_ORIGIN }));
// Explicitly respond to all preflight requests
app.options('*', cors({ origin: process.env.CORS_ORIGIN }));

app.use(helmet());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// --- Routes ---
// Public login/auth routes
app.use('/auth', authRouter);

// Public data
app.use('/etfs', etfsRouter);

// Explicit OPTIONS handler for /upload so CORS runs before requireAuth
app.options('/upload', cors({ origin: process.env.CORS_ORIGIN }));
// Protected upload route
app.use('/upload', requireAuth, uploadRouter);

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API live on port ${port}`);
});
