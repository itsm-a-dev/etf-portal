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

app.use(helmet());
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.use('/auth', authRouter);
app.use('/upload', requireAuth, uploadRouter);
app.use('/etfs', etfsRouter);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(process.env.PORT || 3000, () =>
  console.log(`API live on port ${process.env.PORT || 3000}`)
);
