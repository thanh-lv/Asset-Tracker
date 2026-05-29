// Bac Ancarat - dung API JSON: https://giabac.ancarat.com/api/price-data
// API tra ve mang cac dong: [ten, BAN_RA, MUA_VAO, ma_tham_chieu, url, an_hien("1"/"0")]
// Dong tieu de nhom co do dai 1 hoac khong co gia -> bo qua.
// Chi lay BAC loai 1 LUONG, dang hien thi (an_hien = "1"), bo vang tham khao.
import { fetchJson } from './http.js';
import { parseVnNumber, isOneLuong } from './parse-table.js';

export const SOURCE = 'Ancarat';
const API = 'https://giabac.ancarat.com/api/price-data';

function isGold(name) {
  return /\bvàng\b|9999|24k|nhẫn vàng/i.test(name);
}

// rows (mang cac mang) -> [{product, unit, buy, sell}] : chi bac 1 luong dang hien
export function parseAncaratPrice(rows) {
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const r of rows) {
    if (!Array.isArray(r) || r.length < 3) continue;     // dong tieu de nhom
    const name = String(r[0] || '').trim();
    const sell = parseVnNumber(r[1]);                    // BAN RA
    const buy = parseVnNumber(r[2]);                     // MUA VAO
    const visible = String(r[5] ?? '1');
    if (!name || (buy == null && sell == null)) continue; // dong rong / header
    if (visible !== '1') continue;                        // bo san pham an
    if (!isOneLuong(name) || isGold(name)) continue;      // chi bac 1 luong
    out.push({ product: name, unit: 'lượng', buy, sell });
  }
  return out;
}

export async function crawl() {
  const json = await fetchJson(API, { headers: { Referer: 'https://giabac.ancarat.com/' } });
  return parseAncaratPrice(json).map(r => ({ ...r, source: SOURCE, type: 'silver' }));
}
