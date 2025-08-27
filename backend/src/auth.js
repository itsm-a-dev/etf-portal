import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query('select * from admins where email=$1', [email]);
  if (!rows.length) return res.status(401).json({ error: 'Invalid login' });
  const ok = await bcrypt.compare(password, rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid login' });

  const token = jwt.sign({ sub: rows[0].id, email }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export default router;
