import { Router } from 'express';
import { listAssets, addAsset, deleteAsset, latestPriceFor } from '../store.js';

const router = Router();

// Dinh gia 1 tai san theo gia "mua vao" hien tai (so tien nhan duoc neu ban ra).
function value(asset) {
  const price = latestPriceFor(asset.source, asset.product);
  const cost = asset.quantity * asset.buyPrice;
  let currentUnit = null, currentValue = null, pl = null, plPct = null;
  if (price && price.buy != null) {
    currentUnit = price.buy;
    currentValue = asset.quantity * price.buy;
    pl = currentValue - cost;
    plPct = cost > 0 ? (pl / cost) * 100 : null;
  }
  return {
    ...asset,
    cost,
    currentUnitPrice: currentUnit,
    currentValue,
    profitLoss: pl,
    profitLossPct: plPct,
    priceAt: price ? price.fetchedAt : null
  };
}

router.get('/assets', (_req, res) => {
  const assets = listAssets().map(value);
  const totals = assets.reduce(
    (t, a) => {
      t.cost += a.cost;
      if (a.currentValue != null) {
        t.currentValue += a.currentValue;
        t.valued += a.cost;
      }
      return t;
    },
    { cost: 0, currentValue: 0, valued: 0 }
  );

  totals.profitLoss = totals.currentValue - totals.valued;
  totals.profitLossPct = totals.valued > 0 ? (totals.profitLoss / totals.valued) * 100 : null;
  res.json({ assets, totals });
});

router.post('/assets', (req, res) => {
  const b = req.body || {};
  if (!b.type || !b.quantity || !b.buyPrice) {
    return res.status(400).json({ error: 'Can co type, quantity, buyPrice' });
  }
  if (!['gold', 'silver'].includes(b.type)) {
    return res.status(400).json({ error: 'type phai la gold hoac silver' });
  }
  const asset = addAsset(b);
  res.status(201).json(value(asset));
});

router.delete('/assets/:id', (req, res) => {
  const ok = deleteAsset(req.params.id);
  res.status(ok ? 200 : 404).json({ ok });
});

export default router;
