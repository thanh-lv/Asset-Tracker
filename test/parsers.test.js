import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePriceTable, parseVnNumber, isOneLuong } from '../src/crawlers/parse-table.js';
import { parsePhuQuyPrice } from '../src/crawlers/phuquy.js';
import { parseAncaratPrice } from '../src/crawlers/ancarat.js';
import { parseBtmhGraphql } from '../src/crawlers/btmh.js';

test('parseVnNumber xu ly dinh dang VN', () => {
  assert.equal(parseVnNumber('2,889,000'), 2889000);
  assert.equal(parseVnNumber('2.767.000'), 2767000);
  assert.equal(parseVnNumber(''), null);
});

test('isOneLuong chi nhan dung loai 1 luong', () => {
  assert.equal(isOneLuong('Ngân Long Quảng Tiến 999 - 1 lượng'), true);
  assert.equal(isOneLuong('Bắc Sư Tử 999 - 5 lượng'), false);
  assert.equal(isOneLuong('Ngân Long Quảng Tiến 999 - 1 Kilo'), false);
  assert.equal(isOneLuong('Bạc thỏi 2025 Ancarat 999 - 1000 gram'), false);
  assert.equal(isOneLuong('12 con giáp 999 - xu 1 chỉ'), false);
});

// parsePriceTable van dung cho fallback BTMH -> giu 1 test co ban (Ancarat cu: ban truoc, mua sau)
test('parsePriceTable tu nhan dien cot mua/ban', () => {
  const html = `<table>
    <tr><th>SẢN PHẨM</th><th>BÁN RA</th><th>MUA VÀO</th></tr>
    <tr><td>Sản phẩm A</td><td>2,889,000</td><td>2,802,000</td></tr></table>`;
  const rows = parsePriceTable(html);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].buy, 2802000);
  assert.equal(rows[0].sell, 2889000);
});

// Phu Quy JSON API
const PQ_JSON = { data: [
  { name:'Bạc PQ', priceBuyTael:2768000.0, priceSellTael:2854000.0, id:'B', unit_name:'Chỉ' },
  { name:'Vàng PQ', priceBuyTael:154500000.0, priceSellTael:157500000.0, id:'V' },
  { name:'SJC', priceBuyTael:154500000.0, priceSellTael:157500000.0, id:'S' }
]};
test('Phu Quy: JSON -> bac 1 luong, bo vang/SJC', () => {
  const rows = parsePhuQuyPrice(PQ_JSON);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].buy, 2768000);
  assert.equal(rows[0].sell, 2854000);
  assert.equal(rows[0].unit, 'lượng');
});

// Ancarat JSON API: [ten, BAN_RA, MUA_VAO, ma, url, an/hien]
const ANCARAT_JSON = [
  ['NHÓM BẠC TÍCH TRỮ','','','Mã Tham Chiếu','URL','Ẩn/Hiện'],
  ['Ngân Long Quảng Tiến 999 - 1 lượng','2,889,000','2,802,000','A4','http://x','1'],
  ['Ngân Long Quảng Tiến 999 - 5 lượng','14,445,000','14,010,000','B4','','1'],
  ['Ngân Long Quảng Tiến 999 - 1 Kilo','77,040,000','74,720,000','K4','','1'],
  ['Bắc Sư Tử 999 - 1 lượng','2,889,000','2,802,000','A5','','1'],
  ['Bạc thương hiệu khác 999 (lượng)','770.00','2,600,800','SMN999','','0'],
  ['BẠC TRANG SỨC'],
  ['Bạc trang sức 925 (gram)','70,810','62,042','','','1'],
  ['BẢNG GIÁ VÀNG THAM KHẢO'],
  ['Vàng Bắc Sư Tử 9999 (1 chỉ)','15,880,000','15,580,000','G-A5','','1'],
  ['','','5/28/2026 19:59:00'],
  ['Đơn giá trên đã bao gồm thuế GTGT']
];
test('Ancarat: JSON -> chi bac 1 luong dang hien, bo 5luong/kilo/gram/an/vang', () => {
  const rows = parseAncaratPrice(ANCARAT_JSON);
  assert.equal(rows.length, 2); // Ngan Long 1 luong + Bac Su Tu 1 luong
  assert.deepEqual(rows.map(r => r.product).sort(),
    ['Bắc Sư Tử 999 - 1 lượng', 'Ngân Long Quảng Tiến 999 - 1 lượng']);
  for (const r of rows) {
    assert.equal(r.buy, 2802000);   // MUA VAO (cot 3)
    assert.equal(r.sell, 2889000);  // BAN RA (cot 2)
    assert.ok(r.buy < r.sell);
    assert.equal(r.unit, 'lượng');
  }
});

// BTMH GraphQL: data.goldRates.items[] -> chi lay code = KGB
const BTMH_JSON = {
  data: { goldRates: { items: [
    { code:'SJC', name:'Vàng miếng SJC', buy_price:15450000, sell_price:15750000, unit:'chỉ', weight:1 },
    { code:'KGB', name:'Nhẫn Tròn ép vỉ (Kim Gia Bảo ) 24K (999.9)', buy_price:15400000, sell_price:15650000, unit:'chỉ', weight:1 },
    { code:'NQ', name:'Vàng nguyên liệu', buy_price:15300000, sell_price:0, unit:'chỉ', weight:1 }
  ], total_count: 3 } }
};
test('BTMH: GraphQL -> chi lay code KGB', () => {
  const rows = parseBtmhGraphql(BTMH_JSON);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].product, 'Nhẫn Tròn ép vỉ (Kim Gia Bảo ) 24K (999.9)');
  assert.equal(rows[0].buy, 15400000);
  assert.equal(rows[0].sell, 15650000);
  assert.equal(rows[0].unit, 'chỉ');
});
test('BTMH: xu ly buy_price dang chuoi co dau phay', () => {
  const j = { data:{ goldRates:{ items:[{ code:'KGB', name:'X', buy_price:'15,400,000', sell_price:'15,650,000', unit:'chỉ' }] } } };
  const rows = parseBtmhGraphql(j);
  assert.equal(rows[0].buy, 15400000);
  assert.equal(rows[0].sell, 15650000);
});
