import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cron from 'node-cron';

import pricesRouter from './routes/prices.js';
import assetsRouter from './routes/assets.js';
import { crawlAll } from './crawlers/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api', pricesRouter);
app.use('/api', assetsRouter);

app.listen(PORT, () => {
  console.log(`Asset tracker dang chay: http://localhost:${PORT}`);
});

// Lich crawl tu dong. Mac dinh moi 30 phut. Doi qua CRON_SCHEDULE neu muon.
// Giu tan suat thap de lich su voi server cua cac thuong hieu.
const schedule = process.env.CRON_SCHEDULE || '*/30 * * * *';
cron.schedule(schedule, async () => {
  const r = await crawlAll();
  console.log(`[cron] crawl xong: luu ${r.saved} dong`,
    r.sources.map(s => `${s.source}:${s.ok ? s.count : 'LOI'}`).join(' '));
});

// Crawl 1 lan ngay khi khoi dong (sau 2s) de co du lieu ban dau.
setTimeout(async () => {
  try {
    const r = await crawlAll();
    console.log(`[init] crawl xong: luu ${r.saved} dong`,
      r.sources.map(s => `${s.source}:${s.ok ? s.count : 'LOI'}`).join(' '));
  } catch (e) {
    console.error('[init] crawl loi:', e.message);
  }
}, 2000);
