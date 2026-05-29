// BTC & ETH qua CoinMarketCap API.
// GET pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC,ETH&convert=VND
// Header: X-CMC_PRO_API_KEY. Can API key free (pro.coinmarketcap.com).
// Response: data[SYMBOL].quote[VND].{price, percent_change_24h}
import { fetchJson } from './http.js';

export const SOURCE = 'CMC';
const BASE = process.env.CMC_URL || 'https://pro-api.coinmarketcap.com';
const CONVERT = process.env.CMC_CONVERT || 'VND';
const COINS = [
  { symbol: 'BTC', name: 'Bitcoin (BTC)' },
  { symbol: 'ETH', name: 'Ethereum (ETH)' }
];

function num(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v) : null;
}

// CMC co the tra data[symbol] la object hoac mang -> lay phan tu dau.
function pick(data, sym) {
  const d = data?.[sym];
  return Array.isArray(d) ? d[0] : d;
}

// json (CMC quotes/latest) -> [{product, unit, buy, sell, change24h}]
export function parseCmc(json, convert = CONVERT) {
  const data = json?.data;
  if (!data) return [];
  const out = [];
  for (const c of COINS) {
    const q = pick(data, c.symbol)?.quote?.[convert];
    const price = num(q?.price);
    if (price == null) continue;
    out.push({
      product: c.name,
      unit: 'coin',
      buy: price,             // crypto khong co spread -> mua = ban = gia thi truong
      sell: price,
      change24h: q?.percent_change_24h != null ? Number(q.percent_change_24h) : null
    });
  }
  return out;
}

export async function crawl() {
  const key = process.env.CMC_API_KEY;
  if (!key) {
    throw new Error('Thiếu CMC_API_KEY. Lấy key free tại pro.coinmarketcap.com rồi đặt biến môi trường CMC_API_KEY.');
  }
  const symbols = COINS.map(c => c.symbol).join(',');
  const url = `${BASE}/v1/cryptocurrency/quotes/latest?symbol=${symbols}&convert=${CONVERT}`;
  const json = await fetchJson(url, { headers: { 'X-CMC_PRO_API_KEY': key } });
  return parseCmc(json).map(r => ({ ...r, source: SOURCE, type: 'crypto' }));
}
