# WDP301 — Kiến trúc triển khai VPS + Cloudflare (v2)

> Bản này phản ánh cấu hình hiện có trong `docker-compose.prod.yml`, `backend/docker/nginx.frontend.conf` và tài liệu triển khai VPS. Cloudflare là lớp biên chịu DNS/WAF/Rate Limiting; VPS chạy Docker Compose và các bounded context.

```mermaid
flowchart LR
  U[Web / Mobile / POS] --> CF[Cloudflare DNS + WAF<br/>Rate Limiting + TLS]
  CF -->|HTTPS :443| VPS[Cloud VPS<br/>Ubuntu • Docker Compose • 6GB RAM]

  subgraph EDGE[Public edge on VPS]
    NGINX[Nginx frontend<br/>static React + reverse proxy]
  end
  VPS --> NGINX

  NGINX -->|/api, WebSocket, SSE| GW[API Gateway :4000<br/>JWT • RBAC • validation • app rate limit]
  NGINX -->|static files| WEB[React Web]

  subgraph INTERNAL[Docker internal network: wdp301-network]
    AUTH[Auth Service]
    USER[User Service]
    INV[Inventory Service]
    ORD[Orders Service]
    SUP[Supplier Service]
    AI[AI Service :8000]
    NATIONAL[National Pharma Simulator :4005]
    KAFKA[(Kafka :29092)]
    REDIS[(Redis :6379)]
    QDRANT[(Qdrant :6333 / 6334)]
  end

  GW --> KAFKA
  KAFKA --> AUTH
  KAFKA --> USER
  KAFKA --> INV
  KAFKA --> ORD
  KAFKA --> SUP
  GW -. internal HTTP .-> AI
  INV -. GPP/QĐ 232 adapter .-> NATIONAL
  AUTH --> REDIS
  INV --> REDIS
  AI --> QDRANT
  AI --> KAFKA

  subgraph EXTERNAL[External managed services]
    MDB[(MongoDB Atlas)]
    S3[(AWS S3)]
    SQS[SQS + DLQ]
    LAMBDA[Lambda]
    SES[SES]
    ECR[ECR image registry]
  end
  AUTH --> MDB
  USER --> MDB
  INV --> MDB
  ORD --> MDB
  SUP --> MDB
  AI --> S3
  GW --> SQS --> LAMBDA --> SES
  GH[GitHub Actions CI/CD] --> ECR --> VPS

  OBS[Dozzle / logs / health checks] -.-> VPS
```

## Vị trí của Cloudflare Rate Limiting

- **Lớp Cloudflare:** giới hạn theo IP, route, quốc gia hoặc đặc tính request trước khi traffic chạm VPS; áp dụng cho các route công khai như đăng nhập, tìm kiếm, upload và API nhạy cảm.
- **Lớp API Gateway:** giới hạn theo user, JWT subject, role hoặc tenant để bảo vệ nghiệp vụ sau khi đã xác thực.
- **Lớp Redis:** lưu bộ đếm phân tán cho app rate limit, session và cache; không dùng Kafka để đếm request.
- Giữ Kafka, Redis, Qdrant và các service không public trong Docker network. Chỉ Nginx/Cloudflare-facing ports cần công khai.

## Ghi chú triển khai

- Frontend Nginx phục vụ React và proxy `/api`, WebSocket và SSE tới `backend-svc:4000`.
- VPS production chạy `api-gateway`, `auth-service`, `user-service`, `inventory-service`, `supplier-service`, `orders-service`, `ai-service`, Kafka, Redis, Qdrant và simulator CSDL Dược Quốc gia.
- MongoDB Atlas, S3, SQS/Lambda/SES và ECR nằm ngoài VPS. GitHub Actions triển khai code/container lên VPS.
- Khi bật Cloudflare proxy, origin VPS nên giới hạn firewall để chỉ nhận 80/443 từ Cloudflare IP ranges và SSH từ địa chỉ quản trị; không public trực tiếp 3000/4000/8000/9092/6333.
