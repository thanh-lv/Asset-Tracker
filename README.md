# Asset Tracker — Vàng & Bạc

Web Node.js để:

- Crawl giá vàng **Bảo Tín Mạnh Hải (BTMH)**, giá bạc **Phú Quý** và **Ancarat**.
- Thêm record vàng/bạc đang nắm giữ và tự động định giá (lãi/lỗ) theo giá hiện tại.

Không cần database cài đặt riêng. Dữ liệu lưu trong `data/db.json`.

## Yêu cầu

Node.js 18 trở lên (khuyến nghị 20+).

## Cài đặt & chạy

```bash
npm install
npm start
```

Mở http://localhost:3000

Server tự crawl 1 lần khi khởi động, sau đó crawl lại mỗi 30 phút. Nút "Cập nhật giá" trên web để crawl ngay.

Crawl thủ công từ terminal (không cần mở web):

```bash
npm run crawl
```

## Chạy bằng Docker

Cần Docker + Docker Compose.

```bash
docker compose up -d --build
```

Mở http://localhost:3000

- Dữ liệu lưu ở `./data/db.json` trên máy (mount volume), không mất khi restart container.
- Server tự crawl mỗi 30 phút trong nền, không cần mở terminal.

Lệnh hay dùng:

```bash
docker compose logs -f          # xem log crawl
docker compose down             # tắt
docker compose up -d --build    # build lại sau khi sửa code
```

Đổi cổng hoặc lịch crawl: sửa `docker-compose.yml` (mục `ports` và `CRON_SCHEDULE`).

Nếu không dùng Compose:

```bash
docker build -t asset-tracker .
docker run -d -p 3000:3000 -v "$(pwd)/data:/app/data" --name asset-tracker asset-tracker
```

## Cấu hình (tuỳ chọn)

Đặt biến môi trường trước khi chạy:

- `PORT` — cổng web, mặc định `3000`.
- `CRON_SCHEDULE` — lịch crawl, mặc định `*/30 * * * *` (30 phút/lần).
- `BTMH_URL` — URL nguồn giá BTMH (xem phần dưới).

Ví dụ: `PORT=8080 CRON_SCHEDULE="0 * * * *" npm start`

## Cách định giá tài sản

Khi thêm tài sản, chọn đúng **Nguồn giá** + **Sản phẩm** khớp với bảng giá để app tra giá hiện tại.

- **Vốn** = số lượng × giá mua (giá bạn thực trả khi mua, tức "giá bán ra" của hãng).
- **Giá trị hiện tại** = số lượng × **giá mua vào** hiện tại của hãng (số tiền bạn nhận nếu bán lại).
- **Lãi/Lỗ** = giá trị hiện tại − vốn.

Vì luôn mua ở giá bán ra và bán ở giá mua vào, ngay sau khi mua bạn sẽ thấy "lỗ" đúng bằng chênh lệch mua–bán. Đây là cách định giá sát thực tế thanh khoản.

## Nguồn dữ liệu

Chỉ lấy **bạc 1 lượng** từ Phú Quý và Ancarat (bỏ 5 lượng, kilo, gram, trang sức, vàng tham khảo...).

| Nguồn   | Loại | Nguồn lấy giá                                                       | Trạng thái         |
| ------- | ---- | ------------------------------------------------------------------- | ------------------ |
| Phú Quý | Bạc  | API JSON `be.phuquy.com.vn/.../api/products/get-price` (item `id=B`) | Chạy sẵn           |
| Ancarat | Bạc  | API JSON `giabac.ancarat.com/api/price-data` (lọc loại 1 lượng)      | Chạy sẵn           |
| BTMH    | Vàng | GraphQL `baotinmanhhai.vn/api/graphql` (`GetGoldRates`, code `KGB`)   | Chạy sẵn           |

Ghi chú:

- Phú Quý: trang `phuquy.com.vn/bang-gia/bac` là SPA, nên dùng API backend. `priceBuyTael`/`priceSellTael` là giá theo lượng → giá bạc 1 lượng.
- Ancarat: dùng API `giabac.ancarat.com/api/price-data` (mảng `[tên, bán_ra, mua_vào, mã, url, ẩn/hiện]`). App lấy **tất cả sản phẩm bạc loại 1 lượng đang hiển thị** (`ẩn/hiện = "1"`), bỏ 5 lượng/kilo/gram/chỉ, bỏ vàng tham khảo. Khi thêm tài sản bạn chọn đúng thỏi mình đang giữ trong danh sách. Muốn rút gọn về 1 sản phẩm: sửa hàm `parseAncaratPrice` trong `src/crawlers/ancarat.js`.
- BTMH: POST GraphQL query `GetGoldRates` tới `baotinmanhhai.vn/api/graphql`, lấy item có `code = "KGB"` (Nhẫn Tròn ép vỉ Kim Gia Bảo 24K 999.9). `buy_price` = mua vào, `sell_price` = bán ra. Muốn đổi sản phẩm khác: set biến môi trường `BTMH_CODE` (vd `BTMH_CODE=SJC`) hoặc sửa hằng `WANT_CODE` trong `src/crawlers/btmh.js`.

## Đổi sản phẩm / nguồn BTMH

Crawler BTMH gọi GraphQL `GetGoldRates` và lấy item `code = "KGB"`. Muốn theo sản phẩm khác:

- Cách nhanh: chạy với biến môi trường `BTMH_CODE`, vd `BTMH_CODE=SJC npm start` (hoặc thêm vào `docker-compose.yml`).
- Hoặc sửa hằng `WANT_CODE` trong `src/crawlers/btmh.js`.

Xem các `code` có sẵn: gọi thử API (Postman/curl) rồi nhìn danh sách `goldRates.items[].code`.

## Thêm nguồn mới

1. Tạo `src/crawlers/<ten>.js`, export `SOURCE` và `async crawl()` trả về `[{source, type, product, unit, buy, sell}]`.
2. Thêm vào mảng `SOURCES` trong `src/crawlers/index.js`.

Parser bảng dùng chung ở `src/crawlers/parse-table.js` tự nhận diện cột "mua vào / bán ra" nên dùng lại được cho hầu hết bảng giá HTML.

## Cấu trúc

```
src/
  server.js            web + lịch crawl
  store.js             lưu/đọc JSON (prices, assets)
  crawl-once.js        crawl 1 lần qua CLI
  crawlers/
    http.js            fetch có header trình duyệt
    parse-table.js     parser bảng giá dùng chung + test được
    phuquy.js  ancarat.js  btmh.js
    index.js           chạy tất cả nguồn, cô lập lỗi
  routes/
    prices.js  assets.js
public/                giao diện web (HTML/CSS/JS thuần)
data/db.json           dữ liệu (tự tạo)
test/                  test parser:  npm test
```

## Lưu ý

- Giữ tần suất crawl thấp (mặc định 30 phút) để tôn trọng server các hãng.
- Dữ liệu chỉ để tham khảo cá nhân, không phải tư vấn đầu tư.
