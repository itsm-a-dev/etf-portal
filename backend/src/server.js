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

// apply CORS globally so preflights hit it before auth/upload
app.use(cors({ origin: process.env.CORS_ORIGIN }));
// also explicitly respond to all OPTIONS preflights
app.options('*', cors({ origin: process.env.CORS_ORIGIN }));

 app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));


// now /auth route using the already-imported router
app.use('/auth', authRouter);
app.use('/upload', requireAuth, uploadRouter);

 app.use('/etfs', etfsRouter);

