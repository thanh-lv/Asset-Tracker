# Deploy lên AWS EC2 (Ubuntu) bằng Docker, code pull từ GitHub

Hướng dẫn deploy bản personal, truy cập an toàn qua SSH tunnel (không mở port ra Internet).

## Cảnh báo bảo mật

App chưa có chức năng đăng nhập. Nếu mở port 3000 ra Internet, ai biết IP cũng xem và sửa được tài sản của bạn. Hướng dẫn này cấu hình app chỉ lắng nghe ở `127.0.0.1:3000` trên EC2, bạn truy cập từ máy mình qua SSH tunnel. Đơn giản và an toàn nhất cho dùng cá nhân.

## 1. Đẩy project lên GitHub

Trên máy local, trong thư mục `asset-tracker`:

```bash
git init
git add .
git commit -m "init asset tracker"
# Tạo repo trống trên github.com (private khuyến nghị), copy URL
git branch -M main
git remote add origin git@github.com:<ban>/<repo>.git
git push -u origin main
```

Lưu ý: `.gitignore` đã loại `.env` và `data/db.json`, key và dữ liệu cá nhân không bị commit.

## 2. Tạo EC2 instance

Trên AWS Console → EC2 → Launch instance:

- **AMI**: Ubuntu Server 24.04 LTS.
- **Instance type**: `t2.micro` hoặc `t3.micro` (free tier đủ chạy).
- **Key pair**: tạo hoặc dùng key SSH có sẵn, tải file `.pem` về.
- **Security group**: chỉ mở **SSH (22)** với source **My IP** (không mở 3000, không mở 0.0.0.0/0).
- **Storage**: 8 GB là đủ.

Sau khi launch, copy **Public IPv4** của instance.

## 3. SSH vào server và cài Docker

Trên máy local:

```bash
chmod 400 /duong-dan/key.pem
ssh -i /duong-dan/key.pem ubuntu@<EC2_PUBLIC_IP>
```

Trên server (Ubuntu), cài Docker bằng script chính thức:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu     # cho phep chay docker khong can sudo
exit                                # thoat ra de session moi co quyen
```

SSH lại vào server, kiểm tra:

```bash
docker --version
docker compose version
```

## 4. Clone repo và tạo file `.env`

Trên server:

```bash
# Repo public:
git clone https://github.com/<ban>/<repo>.git asset-tracker

# Repo private (dung HTTPS + personal access token, hoac SSH key da setup):
# git clone git@github.com:<ban>/<repo>.git asset-tracker

cd asset-tracker
cp .env.example .env
nano .env                          # dien CMC_API_KEY=...
```

Lấy CMC_API_KEY free tại `pro.coinmarketcap.com/signup` → copy key → dán vào `.env`.

## 5. Chạy app

```bash
docker compose up -d --build
docker compose logs -f             # Ctrl+C de thoat log, container van chay
```

Kiểm tra app đang lắng nghe trên localhost của server (không public):

```bash
curl -s http://localhost:3000/api/prices | head
```

## 6. Truy cập app từ máy bạn (SSH tunnel)

Trên **máy local** (không phải server), mở terminal mới:

```bash
ssh -i /duong-dan/key.pem -L 3000:localhost:3000 ubuntu@<EC2_PUBLIC_IP>
```

Giữ terminal này mở, rồi mở trình duyệt: **http://localhost:3000**. Bạn đang dùng app trên EC2 qua đường hầm SSH mã hoá.

Có thể đặt alias cho gọn (trên máy local, vào `~/.ssh/config`):

```
Host tracker
    HostName <EC2_PUBLIC_IP>
    User ubuntu
    IdentityFile /duong-dan/key.pem
    LocalForward 3000 localhost:3000
```

Sau đó chỉ cần: `ssh tracker` → mở `http://localhost:3000`.

## 7. Cập nhật khi có code mới

Trên máy local: sửa code → commit → push.

Trên server, vào `~/asset-tracker`:

```bash
./deploy.sh
```

Script này chạy `git pull` rồi `docker compose up -d --build` và in 30 dòng log gần nhất.

## 8. Sao lưu dữ liệu

Toàn bộ giá lịch sử + tài sản nằm trong `~/asset-tracker/data/db.json`.

```bash
# Tai ve may local:
scp -i /duong-dan/key.pem ubuntu@<EC2_PUBLIC_IP>:~/asset-tracker/data/db.json ./db-backup.json
```

Có thể cron lệnh trên ở máy local để backup định kỳ.

## (Tuỳ chọn) Nếu thật sự cần expose public

Không khuyến nghị, nhưng nếu muốn: đặt Caddy hoặc Cloudflare Tunnel trước app + thêm basic auth, và sửa `docker-compose.yml` bỏ phần `127.0.0.1:` cho ports. Tốt hơn hết: thêm authentication vào app trước khi mở public.
