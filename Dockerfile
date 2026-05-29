# Image gon, khong can compiler (du an thuan JS).
FROM node:20-alpine

WORKDIR /app

# Cai dependencies truoc de tan dung cache layer
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy ma nguon
COPY src ./src
COPY public ./public

# Thu muc luu du lieu (se duoc mount volume de giu lich su gia + tai san)
RUN mkdir -p data

ENV PORT=3000
# baotinmanhhai.vn gui thieu intermediate cert -> Alpine khong verify duoc.
# Chi anh huong crawler, chap nhan duoc cho muc dich nay.
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
EXPOSE 3000

CMD ["node", "src/server.js"]
