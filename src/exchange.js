// Ti gia USD -> VND tu open.er-api.com (mien phi, khong can API key).
// Cache 6 gio de khong goi API moi request.

const EXCHANGE_RATE_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 gio

let rateCache = { usdToVnd: null, fetchedAt: 0 };

export async function getUsdToVnd() {
  if (rateCache.usdToVnd && Date.now() - rateCache.fetchedAt < CACHE_TTL_MS) {
    return rateCache.usdToVnd;
  }
  try {
    const res = await fetch(EXCHANGE_RATE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rate = json?.rates?.VND;
    if (rate) {
      rateCache = { usdToVnd: Math.round(rate), fetchedAt: Date.now() };
      console.log(`[exchange] USD -> VND = ${Math.round(rate)}`);
    }
    return rate || null;
  } catch (err) {
    console.error('[exchange] Loi lay ti gia:', err.message);
    return rateCache.usdToVnd || null; // tra cache cu neu co
  }
}
