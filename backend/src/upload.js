import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { pool } from './db.js';
import { s3, S3_BUCKET } from './s3.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// Preflight
router.options('/', (req, res) => res.sendStatus(200));

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // 1) Upload original file to S3
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
    if (!ws) return res.status(400).json({ error: 'No sheet found' });

    const json = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      blankrows: false,
      defval: null
    });

    if (!json.length) return res.status(400).json({ error: 'Empty sheet' });

    const headers = json[0].map(h => String(h ?? '').trim());

    // 3) Map rows to objects, filter out junk
    let removedCount = 0;
    const rows = json
      .slice(1)
      .map(r => {
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = r[i] !== undefined && r[i] !== null
            ? String(r[i]).trim()
            : null;
        });
        return obj;
      })
      .filter(row => {
        const symbol = row[headers[0]]; // first column value
        const isValid =
          symbol &&
          symbol.length <= 5 &&
          /^[A-Za-z0-9]+$/.test(symbol); // alphanumeric only
        if (!isValid) removedCount++;
        return isValid;
      });

    console.log(`Filtered out ${removedCount} junk/disclaimer rows`);

    if (!rows.length) {
      return res.status(400).json({ error: 'No valid data rows found' });
    }

    // 4) Replace DB contents atomically
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
