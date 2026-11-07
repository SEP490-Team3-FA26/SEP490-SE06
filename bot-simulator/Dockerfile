FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV TZ=Asia/Ho_Chi_Minh

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4050

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=10s \
  CMD wget -qO- http://localhost:4050/api/sim/health > /dev/null 2>&1 || exit 1

CMD ["node", "server.js"]

