// Chay tat ca crawler. Moi nguon duoc cô lap: 1 nguon loi khong lam hong nguon khac.
import { savePrices } from '../store.js';
import * as phuquy from './phuquy.js';
import * as ancarat from './ancarat.js';
import * as btmh from './btmh.js';
import * as crypto from './crypto.js';

const SOURCES = [btmh, phuquy, ancarat, crypto];

export async function crawlAll() {
  const summary = [];
  let allRows = [];

  await Promise.all(
    SOURCES.map(async (mod) => {
      try {
        const rows = await mod.crawl();
        allRows = allRows.concat(rows);
        summary.push({ source: mod.SOURCE, ok: true, count: rows.length });
      } catch (err) {
        summary.push({ source: mod.SOURCE, ok: false, error: err.message });
      }
    })
  );

  const saved = savePrices(allRows);
  return { saved, at: new Date().toISOString(), sources: summary };
}
