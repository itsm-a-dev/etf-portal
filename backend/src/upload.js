// upload.js
import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { pool } from './db.js';
import { s3, S3_BUCKET } from './s3.js';

if (!S3_BUCKET || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('❌ Missing S3 configuration. Check env vars: S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
  process.exit(1);
}

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// Preflight
router.options('/', (req, res) => res.sendStatus(200));

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.file.mimetype.includes('spreadsheetml')) {
      return res.status(400).json({ error: 'Invalid file type. Please upload an XLSX spreadsheet.' });
    }

    // 1) Upload to S3
    const key = `uploads/${Date.now()}_${req.file.originalname}`;
    await s3.putObject({
      Bucket: S3_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    }).promise();

    // 2) Parse first sheet
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return res.status(400).json({ error: 'No sheet found in file' });

    const json = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: null });
    if (!json.length) return res.status(400).json({ error: 'Empty sheet' });

    const headers = json[0].map(h => String(h ?? '').trim());
    if (!headers.length) return res.status(400).json({ error: 'No headers found' });

    const rows = json.slice(1).map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i] ?? null; });
      return obj;
    });

    // 3) Replace DB contents atomically
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('TRUNCATE TABLE etf_rows');
      for (const row of rows) {
        await client.query('INSERT INTO etf_rows (data) VALUES ($1)', [row]);
      }
      await client.query('UPDATE etf_metadata SET columns=$1 WHERE id=1', [headers]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({ ok: true, count: rows.length, s3Key: key });
  } catch (err) {
    console.error('❌ Upload error:', err);
    next(err);
  }
});

// Error handler
router.use((err, _req, res, _next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large (max 10 MB)' });
  }
  res.status(500).json({ error: err.message || 'Upload failed' });
});

export default router;
