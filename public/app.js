const $ = (s) => document.querySelector(s);
const fmt = (n) =>
  n == null ? "—" : new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " đ";
const fmtPct = (p) =>
  p == null ? "" : (p >= 0 ? "+" : "") + p.toFixed(2) + "%";

let LATEST = []; // cache gia moi nhat de do dropdown
let CONFIG = { cmcConvert: "VND" }; // se duoc cap nhat tu /api/config

async function loadConfig() {
  try {
    CONFIG = await fetch("/api/config").then((x) => x.json());
  } catch {
    /* giu mac dinh */
  }
}

// ---------- TAI DU LIEU ----------
async function loadPrices() {
  const r = await fetch("/api/prices").then((x) => x.json());
  LATEST = r.prices;
  $("#updated").textContent = r.updatedAt
    ? "Cập nhật: " + new Date(r.updatedAt).toLocaleString("vi-VN")
    : "Chưa có dữ liệu giá";
  renderPriceGroups(r.prices);
  refreshProductOptions();
}

function renderPriceGroups(prices) {
  const bySource = {};
  for (const p of prices) (bySource[p.source] ||= []).push(p);
  const names = {
    CMC: "CoinMarketCap · Crypto",
    BTMH: "Bảo Tín Mạnh Hải · Vàng",
    PhuQuy: "Phú Quý · Bạc",
    Ancarat: "Ancarat · Bạc",
  };
  const order = ["CMC", "BTMH", "PhuQuy", "Ancarat"];

  const wrap = $("#price-groups");
  wrap.innerHTML = "";
  if (prices.length === 0) {
    wrap.innerHTML =
      '<p class="empty">Chưa có giá. Bấm "Cập nhật giá" để crawl.</p>';
    return;
  }
  for (const src of order) {
    const rows = bySource[src];
    if (!rows || !rows.length) continue;
    const div = document.createElement("div");
    div.className = "table-wrap";

    let head, body;
    if (src === "CMC") {
      // Crypto: 1 gia + % thay doi 24h
      head = `<tr><th>Coin</th><th class="num">Giá (${CONFIG.cmcConvert})</th><th class="num">24h</th></tr>`;
      body = rows
        .map((p) => {
          const cls =
            p.change24h == null ? "muted" : p.change24h >= 0 ? "up" : "down";
          const pct =
            p.change24h == null
              ? "—"
              : (p.change24h >= 0 ? "+" : "") + p.change24h.toFixed(2) + "%";
          return `<tr class="price-row-link" data-source="${p.source}" data-product="${esc(p.product)}">
                  <td>${esc(p.product)}</td>
                  <td class="num">${fmt(p.buy)}</td>
                  <td class="num ${cls}">${pct}</td>
                </tr>`;
        })
        .join("");
    } else {
      head =
        '<tr><th>Sản phẩm</th><th class="num">Mua vào</th><th class="num">Bán ra</th></tr>';
      body = rows
        .map(
          (
            p,
          ) => `<tr class="price-row-link" data-source="${p.source}" data-product="${esc(p.product)}">
                <td>${esc(p.product)}</td>
                <td class="num">${fmt(p.buy)}</td>
                <td class="num">${fmt(p.sell)}</td>
              </tr>`,
        )
        .join("");
    }

    div.innerHTML = `
      <div style="padding:14px 16px 0">
        <h3 class="pg-title">${names[src] || src} <span class="badge">${rows.length} ${src === "CMC" ? "coin" : "sản phẩm"}</span></h3>
      </div>
      <table class="data">
        <thead>${head}</thead>
        <tbody>${body}</tbody>
      </table>`;
    wrap.appendChild(div);
  }
  document
    .querySelectorAll(".price-row-link")
    .forEach((tr) =>
      tr.addEventListener("click", () =>
        showChart(tr.dataset.source, tr.dataset.product),
      ),
    );
}

async function loadAssets() {
  const r = await fetch("/api/assets").then((x) => x.json());
  const body = $("#assets-body");
  const totalProfit = $("#assets-foot");
  body.innerHTML = "";
  totalProfit.innerHTML = "";
  $("#assets-empty").style.display = r.assets.length ? "none" : "block";

  for (const a of r.assets) {
    const plClass =
      a.profitLoss == null ? "muted" : a.profitLoss >= 0 ? "up" : "down";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="tag ${a.type}">${a.type === "gold" ? "Vàng" : a.type === "silver" ? "Bạc" : "Crypto"}</span></td>
      <td>${esc(a.product || "(không gắn bảng giá)")}<br><small class="muted">${esc(a.source || "")} ${esc(a.unit || "")}</small></td>
      <td class="num">${a.quantity}</td>
      <td class="num">${fmt(a.buyPrice)}</td>
      <td class="num">${fmt(a.cost)}</td>
      <td class="num">${fmt(a.currentUnitPrice)}</td>
      <td class="num">${fmt(a.currentValue)}</td>
      <td class="num ${plClass}">${a.profitLoss == null ? "—" : fmt(a.profitLoss)}<br><small>${fmtPct(a.profitLossPct)}</small></td>
      <td><button class="del" data-id="${a.id}" title="Xoá">✕</button></td>`;
    body.appendChild(tr);
  }
  body.querySelectorAll(".del").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm("Xoá tài sản này?")) return;
      await fetch("/api/assets/" + b.dataset.id, { method: "DELETE" });
      loadAssets();
    }),
  );

  const t = r.totals;
  $("#t-cost").textContent = fmt(t.cost);
  $("#t-value").textContent = fmt(t.currentValue);
  totalProfit.textContent = fmt(t.currentValue);
  totalProfit.className = "value " + (t.currentValue >= 0 ? "up" : "down");
  const plEl = $("#t-pl");
  plEl.textContent = fmt(t.profitLoss);
  plEl.className = "value " + (t.profitLoss >= 0 ? "up" : "down");
  const pctEl = $("#t-pct");
  pctEl.textContent = fmtPct(t.profitLossPct);
  pctEl.className = "pct " + (t.profitLoss >= 0 ? "up" : "down");

  // Dong tong trong bang
  const foot = $("#assets-foot");
  if (r.assets.length > 0) {
    const plClass =
      t.profitLoss == null ? "muted" : t.profitLoss >= 0 ? "up" : "down";
    foot.innerHTML = `<tr class="total-row">
      <td colspan="4"><strong>Tổng cộng</strong></td>
      <td class="num"><strong>${fmt(t.cost)}</strong></td>
      <td></td>
      <td class="num"><strong>${fmt(t.currentValue)}</strong></td>
      <td class="num ${plClass}"><strong>${t.profitLoss == null ? "—" : fmt(t.profitLoss)}</strong><br><small>${fmtPct(t.profitLossPct)}</small></td>
      <td></td>
    </tr>`;
  } else {
    foot.innerHTML = "";
  }
}

// ---------- FORM THEM TAI SAN ----------
function refreshProductOptions() {
  const type = $("#f-type").value;
  // nguon phu hop voi loai
  const sources = [
    ...new Set(LATEST.filter((p) => p.type === type).map((p) => p.source)),
  ];
  const srcSel = $("#f-source");
  const prevSrc = srcSel.value;
  srcSel.innerHTML =
    sources.map((s) => `<option value="${s}">${s}</option>`).join("") ||
    '<option value="">(chưa có giá — crawl trước)</option>';
  if (sources.includes(prevSrc)) srcSel.value = prevSrc;
  fillProducts();
}

function fillProducts() {
  const type = $("#f-type").value;
  const src = $("#f-source").value;
  const items = LATEST.filter((p) => p.type === type && p.source === src);
  $("#f-product").innerHTML =
    items
      .map(
        (p) => `<option value="${esc(p.product)}">${esc(p.product)}</option>`,
      )
      .join("") || '<option value="">(không có sản phẩm)</option>';
  prefillFromProduct();
}

function prefillFromProduct() {
  const src = $("#f-source").value;
  const product = $("#f-product").value;
  const p = LATEST.find((x) => x.source === src && x.product === product);
  if (p) {
    if (p.unit) $("#f-unit").value = p.unit;
    if (p.sell)
      $("#f-price").placeholder = "giá bán ra hiện tại: " + fmt(p.sell);
  }
}

$("#f-type").addEventListener("change", refreshProductOptions);
$("#f-source").addEventListener("change", fillProducts);
$("#f-product").addEventListener("change", prefillFromProduct);

$("#toggle-form").addEventListener("click", () => {
  $("#asset-form").classList.toggle("hidden");
  if (!$("#f-date").value)
    $("#f-date").value = new Date().toISOString().slice(0, 10);
});
$("#cancel-form").addEventListener("click", () =>
  $("#asset-form").classList.add("hidden"),
);

$("#asset-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const payload = {
    type: f.type.value,
    source: f.source.value,
    product: f.product.value,
    unit: f.unit.value,
    quantity: f.quantity.value,
    buyPrice: f.buyPrice.value,
    buyDate: f.buyDate.value,
    note: f.note.value,
  };
  const res = await fetch("/api/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    alert("Lỗi: " + (await res.json()).error);
    return;
  }
  f.reset();
  $("#asset-form").classList.add("hidden");
  loadAssets();
});

// ---------- CRAWL ----------
$("#refresh").addEventListener("click", async () => {
  const btn = $("#refresh");
  btn.disabled = true;
  btn.textContent = "Đang cập nhật…";
  try {
    const r = await fetch("/api/crawl", { method: "POST" }).then((x) =>
      x.json(),
    );
    const fail = (r.sources || []).filter((s) => !s.ok);
    if (fail.length) {
      console.warn("Nguồn lỗi:", fail);
    }
    await loadPrices();
    await loadAssets();
  } finally {
    btn.disabled = false;
    btn.textContent = "Cập nhật giá";
  }
});

// ---------- BIEU DO LICH SU ----------
async function showChart(source, product) {
  const r = await fetch(
    `/api/prices/history?source=${encodeURIComponent(source)}&product=${encodeURIComponent(product)}`,
  ).then((x) => x.json());
  const hist = r.history.filter((h) => h.buy != null);
  $("#chart-block").style.display = "block";
  $("#chart-title").textContent = "Giá mua vào · " + product;
  $("#chart-block").scrollIntoView({ behavior: "smooth", block: "nearest" });
  drawChart(hist);
}
$("#chart-close").addEventListener(
  "click",
  () => ($("#chart-block").style.display = "none"),
);

function drawChart(hist) {
  const cv = $("#chart");
  const ctx = cv.getContext("2d");
  const W = (cv.width = cv.clientWidth * devicePixelRatio);
  const H = (cv.height = 220 * devicePixelRatio);
  ctx.clearRect(0, 0, W, H);
  if (hist.length < 2) {
    ctx.fillStyle = "#9a958a";
    ctx.font = `${14 * devicePixelRatio}px "IBM Plex Mono"`;
    ctx.fillText("Chưa đủ dữ liệu lịch sử (cần ≥ 2 lần crawl)", 20, H / 2);
    return;
  }
  const pad = 40 * devicePixelRatio;
  const xs = hist.map((_, i) => i);
  const ys = hist.map((h) => h.buy);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const range = maxY - minY || 1;
  const X = (i) => pad + (i / (xs.length - 1)) * (W - pad * 1.4);
  const Y = (v) => H - pad - ((v - minY) / range) * (H - pad * 1.6);

  // grid + labels
  ctx.strokeStyle = "#262a31";
  ctx.fillStyle = "#9a958a";
  ctx.font = `${11 * devicePixelRatio}px "IBM Plex Mono"`;
  ctx.lineWidth = devicePixelRatio;
  for (let g = 0; g <= 3; g++) {
    const v = minY + (range * g) / 3;
    const y = Y(v);
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(W - pad * 0.4, y);
    ctx.stroke();
    ctx.fillText(
      new Intl.NumberFormat("vi-VN").format(Math.round(v)),
      4,
      y + 4 * devicePixelRatio,
    );
  }

  // line
  ctx.strokeStyle = "#d9a441";
  ctx.lineWidth = 2 * devicePixelRatio;
  ctx.beginPath();
  hist.forEach((h, i) =>
    i ? ctx.lineTo(X(i), Y(h.buy)) : ctx.moveTo(X(i), Y(h.buy)),
  );
  ctx.stroke();

  // fill
  ctx.lineTo(X(xs.length - 1), H - pad);
  ctx.lineTo(X(0), H - pad);
  ctx.closePath();
  ctx.fillStyle = "rgba(217,164,65,.08)";
  ctx.fill();
}

function esc(s) {
  return String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}

// init
loadConfig().then(() => {
  loadPrices();
  loadAssets();
});
