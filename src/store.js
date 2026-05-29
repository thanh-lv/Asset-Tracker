// Luu tru du lieu bang file JSON. Khong can DB native, chay duoc moi may.
// Ghi atomic (ghi file tam roi rename) de tranh hong du lieu.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const EMPTY = { prices: [], assets: [], seq: { price: 0, asset: 0 } };

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) writeRaw(EMPTY);
}

function readRaw() {
  ensureFile();
  try {
    const txt = fs.readFileSync(DB_FILE, 'utf8');
    const data = JSON.parse(txt);
    return { ...EMPTY, ...data, seq: { ...EMPTY.seq, ...(data.seq || {}) } };
  } catch {
    return structuredClone(EMPTY);
  }
}

function writeRaw(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

// ---------- PRICES ----------

// Luu mot batch gia crawl duoc. Moi ban ghi: {source, type, product, unit, buy, sell, fetchedAt}
export function savePrices(rows) {
  if (!rows || rows.length === 0) return 0;
  const db = readRaw();
  const fetchedAt = new Date().toISOString();
  for (const r of rows) {
    db.seq.price += 1;
    db.prices.push({
      id: db.seq.price,
      source: r.source,
      type: r.type,            // 'gold' | 'silver'
      product: r.product,
      unit: r.unit || '',
      buy: r.buy ?? null,      // gia mua vao (dealer mua tu ban => so tien ban nhan khi ban ra)
      sell: r.sell ?? null,    // gia ban ra (dealer ban cho ban => so tien ban tra khi mua)
      fetchedAt
    });
  }
  // Gioi han lich su de file khong phinh vo han (giu 50k ban ghi gan nhat)
  if (db.prices.length > 50000) db.prices = db.prices.slice(-50000);
  writeRaw(db);
  return rows.length;
}

// Lay gia moi nhat cho moi (source, product)
export function latestPrices(filter = {}) {
  const db = readRaw();
  const byKey = new Map();
  for (const p of db.prices) {
    if (filter.source && p.source !== filter.source) continue;
    if (filter.type && p.type !== filter.type) continue;
    const key = p.source + '|' + p.product;
    const cur = byKey.get(key);
    if (!cur || p.fetchedAt > cur.fetchedAt || (p.fetchedAt === cur.fetchedAt && p.id > cur.id)) {
      byKey.set(key, p);
    }
  }
  return [...byKey.values()].sort((a, b) =>
    a.source.localeCompare(b.source) || a.product.localeCompare(b.product));
}

// Tim 1 gia moi nhat theo source + product (dung de dinh gia tai san)
export function latestPriceFor(source, product) {
  const db = readRaw();
  let best = null;
  for (const p of db.prices) {
    if (p.source === source && p.product === product) {
      if (!best || p.fetchedAt > best.fetchedAt || (p.fetchedAt === best.fetchedAt && p.id > best.id)) {
        best = p;
      }
    }
  }
  return best;
}

// Lich su gia cua 1 san pham (de ve bieu do)
export function priceHistory(source, product, limit = 500) {
  const db = readRaw();
  return db.prices
    .filter(p => p.source === source && p.product === product)
    .sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt))
    .slice(-limit);
}

export function lastUpdated() {
  const db = readRaw();
  if (db.prices.length === 0) return null;
  return db.prices.reduce((m, p) => (p.fetchedAt > m ? p.fetchedAt : m), '');
}

// ---------- ASSETS ----------

export function listAssets() {
  return readRaw().assets.sort((a, b) => b.buyDate.localeCompare(a.buyDate));
}

export function addAsset(a) {
  const db = readRaw();
  db.seq.asset += 1;
  const asset = {
    id: db.seq.asset,
    type: a.type,                  // 'gold' | 'silver'
    source: a.source || '',        // de tra cuu gia hien tai (BTMH/PhuQuy/Ancarat)
    product: a.product || '',      // ten san pham khop voi bang gia
    unit: a.unit || '',            // luong / chi / gram / kg
    quantity: Number(a.quantity),  // so don vi
    buyPrice: Number(a.buyPrice),  // gia mua tren 1 don vi (so tien thuc tra)
    buyDate: a.buyDate || new Date().toISOString().slice(0, 10),
    note: a.note || '',
    createdAt: new Date().toISOString()
  };
  db.assets.push(asset);
  writeRaw(db);
  return asset;
}

export function deleteAsset(id) {
  const db = readRaw();
  const before = db.assets.length;
  db.assets = db.assets.filter(x => x.id !== Number(id));
  writeRaw(db);
  return before !== db.assets.length;
}
