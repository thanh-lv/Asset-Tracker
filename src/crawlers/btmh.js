// Vang Bao Tin Manh Hai (BTMH) - dung GraphQL API.
// POST https://baotinmanhhai.vn/api/graphql  query GetGoldRates
// Response: data.goldRates.items[] gom {code, name, buy_price, sell_price, unit, weight, ...}
// Lay san pham code = "KGB" (Nhan Tron ep vi Kim Gia Bao 24K 999.9).
import { fetchJson } from "./http.js";

export const SOURCE = "BTMH";
const API = "https://baotinmanhhai.vn/api/graphql";
const WANT_CODE = "KGB";

// Chi xin cac field can dung (GraphQL cho phep lay tap con).
const QUERY = `query GetGoldRates {
  goldRates {
    items { code name vendor_name buy_price sell_price unit weight last_updated }
    total_count
  }
}`;

function toInt(n) {
  if (n == null) return null;
  if (typeof n === "number") return Number.isFinite(n) ? Math.round(n) : null;
  const digits = String(n).replace(/[^\d]/g, "");
  if (!digits) return null;
  const v = parseInt(digits, 10);
  return v > 0 ? v : null;
}

// json -> [{product, unit, buy, sell}] : chi lay item code = KGB
export function parseBtmhGraphql(json) {
  const items = json?.data?.goldRates?.items;
  if (!Array.isArray(items)) return [];
  const it = items.find((x) => x && x.code === WANT_CODE);
  if (!it) return [];
  const buy = toInt(it.buy_price);
  const sell = toInt(it.sell_price);
  if (buy == null && sell == null) return [];
  return [
    {
      product: (it.name || "Nhẫn Tròn ép vỉ (Kim Gia Bảo) 24K (999.9)").trim(),
      unit: it.unit || (it.weight ? String(it.weight) : ""),
      buy,
      sell,
    },
  ];
}

export async function crawl() {
  const json = await fetchJson(API, {
    method: "POST",
    headers: {
      Referer: "https://baotinmanhhai.vn/",
      Origin: "https://baotinmanhhai.vn",
    },
    body: { query: QUERY, operationName: "GetGoldRates" },
  });
  console.log("json", json);
  const rows = parseBtmhGraphql(json);
  if (rows.length === 0) {
    throw new Error(
      `Khong tim thay san pham code="${WANT_CODE}" trong goldRates. Kiem tra lai API/code.`,
    );
  }
  return rows.map((r) => ({ ...r, source: SOURCE, type: "gold" }));
}
