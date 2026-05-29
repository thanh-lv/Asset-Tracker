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
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Config public cho frontend (chi nhung key an toan)
router.get('/config', (_req, res) => {
  res.json({
    cmcConvert: process.env.CMC_CONVERT || 'VND'
  });
});

export default router;
