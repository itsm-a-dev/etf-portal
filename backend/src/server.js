import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { initDb } from './db.js';
import authRouter, { requireAuth } from './auth.js';
import uploadRouter from './upload.js';
import etfsRouter from './etfs.js';

await initDb();

const app = express();
app.set('trust proxy', 1); // <-- add this line

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.options('*', cors({ origin: process.env.CORS_ORIGIN }));

app.use(helmet());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// routes...


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

