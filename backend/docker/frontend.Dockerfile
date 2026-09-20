# ============================================================
# Stage 1: Builder
# ============================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package.json để giải quyết phụ thuộc file:.. nếu có
COPY package.json /package.json
COPY frontend/package.json frontend/package-lock.json* ./

# Xóa tham chiếu workspace cục bộ nếu còn sót lại và cài đặt dependencies
RUN npm pkg delete dependencies.wdp301-workspace 2>/dev/null || true
RUN npm install --legacy-peer-deps

COPY frontend/ ./
RUN npm run build

# ============================================================
# Stage 2: Runner (Nginx)
# ============================================================
FROM nginx:alpine

# Copy built static files from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration to proxy /api requests
COPY backend/docker/nginx.frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
