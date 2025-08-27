import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { initDb } from './db.js';
import authRouter, { requireAuth } from './auth.js';
import uploadRouter from './upload.js';
import etfsRouter from './etfs.js';

// Initialize database before accepting requests
await initDb();

const app = express();

// CORS must run first so every route (incl. preflights) gets headers
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.options('*', cors({ origin: process.env.CORS_ORIGIN }));

app.use(helmet());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Public routes
app.use('/auth', authRouter);
app.use('/etfs', etfsRouter);

// Protected routes
app.use('/upload', requireAuth, uploadRouter);

// Simple health check
app.get('/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API live on port ${port}`);
});
