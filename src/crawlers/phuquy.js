// Bac Phu Quy - dung API JSON goc (backend cua phuquy.com.vn).
// Response: { data: [ {id:"B"=Bac, priceBuyTael, priceSellTael, ...}, {id:"V"=Vang}, {id:"S"=SJC} ] }
// priceBuyTael / priceSellTael = gia theo LUONG -> dung lam gia bac 1 luong.
import { fetchJson } from './http.js';

export const SOURCE = 'PhuQuy';
const API = 'https://be.phuquy.com.vn/jewelry/product-payment-service/api/products/get-price';

function toInt(n) {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v > 0 ? v : null;
}

// json -> [{product, unit, buy, sell}] : chi lay BAC 1 LUONG
export function parsePhuQuyPrice(json) {
  const items = Array.isArray(json?.data) ? json.data : [];
  const silver = items.find(it => it.id === 'B' || /bạc/i.test(it.name || ''));
  if (!silver) return [];
  const buy = toInt(silver.priceBuyTael);
  const sell = toInt(silver.priceSellTael);
  if (buy == null && sell == null) return [];
  return [{ product: 'Bạc Phú Quý 999 (1 lượng)', unit: 'lượng', buy, sell }];
}

export async function crawl() {
  const json = await fetchJson(API, { headers: { Referer: 'https://phuquy.com.vn/' } });
  return parsePhuQuyPrice(json).map(r => ({ ...r, source: SOURCE, type: 'silver' }));
}
