import { Router } from 'express';
import { latestPrices, priceHistory, lastUpdated } from '../store.js';
import { crawlAll } from '../crawlers/index.js';

const router = Router();

// Gia moi nhat (loc theo ?type=gold|silver hoac ?source=BTMH|PhuQuy|Ancarat)
router.get('/prices', (req, res) => {
  const { type, source } = req.query;
  res.json({
    updatedAt: lastUpdated(),
    prices: latestPrices({ type, source })
  });
});

// Lich su 1 san pham de ve bieu do
router.get('/prices/history', (req, res) => {
  const { source, product } = req.query;
  if (!source || !product) {
    return res.status(400).json({ error: 'Can co source va product' });
  }
  res.json({ history: priceHistory(source, product) });
});

// Crawl ngay bay gio
router.post('/crawl', async (_req, res) => {
  try {
    const result = await crawlAll();
    console.log(`[manual] crawl xong: luu ${result.saved} dong`,
      result.sources.map(s => `${s.source}:${s.ok ? s.count : 'LOI'}`).join(' '));
    res.json(result);
  } catch (err) {
    console.error('[manual] crawl loi:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
