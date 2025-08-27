import express from 'express';
import { pool } from './db.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const meta = await pool.query('select columns from etf_metadata where id=1');
  const cols = meta.rows[0]?.columns || [];
  const data = await pool.query('select data from etf_rows');
  res.json({ columns: cols, rows: data.rows.map(r => r.data) });
});

export default router;
