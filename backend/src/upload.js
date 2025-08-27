import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { pool } from './db.js';
import { s3, S3_BUCKET } from './s3.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = express.Router();

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });

  const key = `uploads/${Date.now()}_${req.file.originalname}`;
  await s3.putObject({
    Bucket: S3_BUCKET,
    Key: key,
    Body: req.file.buffer,
    ContentType: req.file.mimetype
  }).promise();

  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (!json.length) return res.status(400).json({ error: 'Empty sheet' });
  const headers = json[0].map(h => String(h).trim());
  const rows = json.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i] ?? null);
    return obj;
  });

  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('truncate table etf_rows');
    for (const row of rows) {
      await client.query('insert into etf_rows (data) values ($1)', [row]);
    }
    await client.query('update etf_metadata set columns=$1 where id=1', [headers]);
    await client.query('commit');
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }

  res.json({ ok: true, count: rows.length });
});

export default router;
