// Parser bang gia tong quat. Tu phat hien cot "mua vao" / "ban ra" tu dong tieu de,
// nen dung duoc cho ca Phu Quy (mua truoc, ban sau) lan Ancarat (ban truoc, mua sau).

import * as cheerio from 'cheerio';

// "2,767,000" | "2.767.000" | "73.786.482 đ" -> 2767000. Tra null neu khong phai so hop le.
export function parseVnNumber(text) {
  if (text == null) return null;
  const digits = String(text).replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function norm(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

// True neu ten san pham la loai "1 luong" (loai tru 5/10/11 luong, kilo, gram, chi...).
// (?<!\d) dam bao khong khop "10 luong" / "21 luong".
export function isOneLuong(name) {
  return /(?<!\d)1\s*lượng/.test(String(name).toLowerCase());
}

function looksLikeBuy(h) {
  return /mua\s*v[àa]o|mua/i.test(h);
}
function looksLikeSell(h) {
  return /b[áa]n\s*ra|b[áa]n/i.test(h);
}
function looksLikeUnit(h) {
  return /đơn\s*vị|don\s*vi|\bunit\b/i.test(h);
}

// html -> [{product, unit, buy, sell}]
export function parsePriceTable(html) {
  const $ = cheerio.load(html);
  const out = [];
  const seen = new Set();

  $('table').each((_, table) => {
    const rows = $(table).find('tr').toArray();
    if (rows.length < 2) return;

    // Tim dong tieu de + vi tri cot
    let colBuy = -1, colSell = -1, colUnit = -1, colProduct = 0;
    for (const tr of rows) {
      const cells = $(tr).find('th,td').toArray().map(td => norm($(td).text()));
      if (cells.length < 2) continue;
      const buyIdx = cells.findIndex(looksLikeBuy);
      const sellIdx = cells.findIndex(looksLikeSell);
      if (buyIdx !== -1 && sellIdx !== -1 && buyIdx !== sellIdx) {
        colBuy = buyIdx;
        colSell = sellIdx;
        colUnit = cells.findIndex(looksLikeUnit);
        // Cot san pham = cot dau khong phai gia/don vi
        colProduct = cells.findIndex((_, i) => i !== colBuy && i !== colSell && i !== colUnit);
        if (colProduct === -1) colProduct = 0;
        break;
      }
    }
    if (colBuy === -1 || colSell === -1) return; // bang khong phai bang gia

    for (const tr of rows) {
      const tds = $(tr).find('td').toArray();
      if (tds.length === 0) continue;
      const cells = tds.map(td => norm($(td).text()));
      const product = norm(cells[colProduct]);
      const buy = parseVnNumber(cells[colBuy]);
      const sell = parseVnNumber(cells[colSell]);
      // Bo dong tieu de nhom (khong co gia) va dong rong
      if (!product || (buy == null && sell == null)) continue;
      const key = product.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        product,
        unit: colUnit !== -1 ? norm(cells[colUnit]) : '',
        buy,
        sell
      });
    }
  });

  return out;
}
