# 📖 TÀI LIỆU VẬN HÀNH & ĐẶC TẢ MÔ HÌNH AI DEMAND FORECASTING (GPU / PYTORCH)

Tài liệu hướng dẫn chi tiết về cấu trúc, cơ chế vận hành, đặc tả toán học của mô hình học sâu, quy trình tự động huấn luyện (Auto-Training Lifecycle) và hướng dẫn triển khai (Deployment) cho hệ thống AI Dự báo nhu cầu Dược phẩm WDP301.

---

## 1. 🏗️ Kiến trúc Tổng quan (System Architecture)

Hệ thống sử dụng mô hình dự báo chuỗi thời gian học sâu **Hybrid Deep Learning + LLM**:
1. **PyTorch LSTM Neural Network (`services/pharma_forecaster_nn.py`):** Xử lý định lượng, dự báo chuỗi thời gian số lượng tiêu thụ $M+1, M+2, M+3$ kèm khoảng tin cậy 95% và độ bất định (Uncertainty Estimation) trên GPU NVIDIA CUDA.
2. **Vectorized GPU Forecaster (`services/forecaster.py`):** Load mô hình `.pth` / `.pt` vào VRAM và tính toán dự báo hàng loạt toàn bộ danh mục thuốc trong vài mili-giây.
3. **Qualitative LLM Reasoner (`services/llm_service.py`):** Tổng hợp số liệu từ GPU, phân tích yếu tố mùa vụ, dịch bệnh, thời tiết và tạo báo cáo trực quan cho dược sĩ / quản lý kho.

```mermaid
flowchart TD
    subgraph Dữ Liệu & Huấn Luyện GPU
        DB[(MongoDB / Postgres)] -->|Lịch sử đơn hàng & GRN| DP[Data Preprocessor & Scaler]
        DP -->|Mini-batches (Batch: 64)| LSTM[PharmaForecastLSTM Model]
        GPU[NVIDIA GPU RTX 3050 CUDA] -->|Tăng tốc Huấn luyện FP32/TensorCore| LSTM
        LSTM -->|Export Checkpoints| PTT[pharma_forecast_model.pt]
        LSTM -->|Export Weights| PTH[pharma_forecast_model.pth]
        LSTM -->|Export Metadata| JSON[forecast_metadata.json]
    end

    subgraph Suy Luận & Phân Tầng Dược Phẩm
        PTH --> TGF[TorchGPUForecaster Engine]
        PTT -.-> TGF
        REQ[Inventory / Frontend Request] --> TGF
        TGF -->|Dự báo 3 tháng M1, M2, M3 + CI 95%| ENRICH[Làm giàu dữ liệu tồn kho & Phân tầng ABC-XYZ]
        ENRICH --> LLM[DeepSeek / LLaMA-3.3 LLM Reasoning]
        LLM --> RES[Báo cáo Dự báo Nhu Cầu & Đề Xuất Đơn Hàng PO]
    end
```

---

## 2. 🔬 Chi Tiết Kiến Trúc & Thuật Toán Mô Hình AI (`PharmaForecastLSTM`)

Mô hình **`PharmaForecastLSTM`** được thiết kế chuyên biệt cho bài toán dự báo chuỗi thời gian dược phẩm với các đặc tính: chuỗi ngắn, tính mùa vụ cao, xuất hiện nhu cầu gián đoạn (intermittent demand) và yêu cầu ước lượng độ bất định (Uncertainty Quantification) cho việc dự phòng an toàn.

### 2.1. Cấu trúc Lớp Mạng Nơ-ron (Neural Network Layers)

```text
Input Tensor: (Batch_Size, Sequence_Length = 6, Features = 1)
  │
  ├──► [1] Stacked LSTM Layer 1 (Hidden: 64, BatchFirst=True)
  │      └── Kích hoạt cổng Forget, Input, Output & Cell State
  │
  ├──► [2] Stacked LSTM Layer 2 (Hidden: 64, Dropout = 0.2)
  │      └── Trích xuất Temporal Context Vector (h_t) tại Time-step cuối cùng
  │
  ├──► [3] Non-linear Feature Dense Block:
  │      ├── Linear(64 -> 64)
  │      ├── GELU() Activation (Gaussian Error Linear Unit)
  │      ├── Dropout(p = 0.2)
  │      ├── Linear(64 -> 32)
  │      └── GELU()
  │
  ├──► [4] Multi-Head Dual Output:
  │      ├── Head 1 (Mean Head):
  │      │     └── Linear(32 -> 3) -> ReLU() ===> [Dự báo M+1, M+2, M+3]
  │      └── Head 2 (Uncertainty / Std Head):
  │            └── Linear(32 -> 3) -> Softplus() ===> [Độ lệch chuẩn sai số σ > 0]
```

### 2.2. Đặc tả Toán học (Mathematical Formulation)

1. **Chuỗi đầu vào (Input Sequence)**:
   Với mỗi mã dược phẩm $i$, vector đầu vào là lịch sử bán hàng $N$ tháng gần nhất:
   $$X^{(i)} = [x_{t-N+1}^{(i)}, x_{t-N+2}^{(i)}, \dots, x_t^{(i)}] \in \mathbb{R}^{N \times 1}$$

2. **Cơ chế cập nhật trạng thái LSTM (LSTM Cell Equations)**:
   $$\begin{aligned}
   f_t &= \sigma(W_f x_t + U_f h_{t-1} + b_f) \quad &&\text{(Forget Gate)} \\
   i_t &= \sigma(W_i x_t + U_i h_{t-1} + b_i) \quad &&\text{(Input Gate)} \\
   \tilde{c}_t &= \tanh(W_c x_t + U_c h_{t-1} + b_c) \quad &&\text{(Candidate State)} \\
   c_t &= f_t \odot c_{t-1} + i_t \odot \tilde{c}_t \quad &&\text{(Cell State)} \\
   o_t &= \sigma(W_o x_t + U_o h_{t-1} + b_o) \quad &&\text{(Output Gate)} \\
   h_t &= o_t \odot \tanh(c_t) \quad &&\text{(Hidden State)}
   \end{aligned}$$

3. **Hàm mất mát hỗn hợp (Heteroscedastic Gaussian NLL Loss)**:
   Thay vì chỉ tối ưu sai số trung bình (MSE), mô hình học đồng thời phân phối xác suất Gaussian $\mathcal{N}(\hat{\mu}, \hat{\sigma}^2)$:
   $$\mathcal{L}_{\text{NLL}}(\theta) = \frac{1}{2 B \cdot K} \sum_{b=1}^{B} \sum_{k=1}^{K} \left[ \log(\hat{\sigma}_{b,k}^2 + \epsilon) + \frac{(y_{b,k} - \hat{\mu}_{b,k})^2}{\hat{\sigma}_{b,k}^2 + \epsilon} \right]$$
   - $B$: Kích thước Batch ($B = 64$).
   - $K$: Số bước thời gian dự báo tương lai ($K = 3$, tương ứng tháng $M+1, M+2, M+3$).
   - $\hat{\mu}_{b,k}$: Giá trị dự báo sản lượng kỳ vọng (đảm bảo không âm nhờ hàm $\text{ReLU}$).
   - $\hat{\sigma}_{b,k}$: Độ biến động sai số chuẩn (đảm bảo $> 0$ nhờ hàm $\text{Softplus}$).

4. **Ước lượng Khoảng Tin Cậy 95% (95% Confidence Interval)**:
   $$\begin{aligned}
   \text{CI}_{\text{lower}} &= \max\left(0, \hat{\mu} - 1.96 \cdot \hat{\sigma}\right) \\
   \text{CI}_{\text{upper}} &= \hat{\mu} + 1.96 \cdot \hat{\sigma}
   \end{aligned}$$

5. **Độ Tin Cậy của Dự Báo (Confidence Score)**:
   Được tính toán dựa trên hệ số biến thiên $\text{CV} = \frac{\hat{\sigma}}{\hat{\mu} + 1}$:
   $$\text{Confidence Score} = \max\left(50, \min\left(98, \text{round}\left(100 \times \left(1 - \frac{\hat{\sigma}}{\hat{\mu} + \hat{\sigma} + 1}\right)\right)\right)\right) \%$$

---

## 3. 📦 Tích Hợp Quản Lý Tồn Kho & Công Thức Sinh Đơn Mua Hàng (Procurement & ROP)

Dựa trên kết quả dự báo từ mạng nơ-ron Deep Learning, hệ thống tự động kết nối với quy trình nghiệp vụ mua hàng Dược phẩm:

1. **Điểm Đặt Hàng Lại (Reorder Point - ROP)**:
   $$\text{ROP} = (\bar{d} \times L) + \text{SS}$$
   - $\bar{d}$: Nhu cầu tiêu thụ trung bình ngày ($\text{Average Daily Sales}$).
   - $L$: Thời gian nhà cung cấp giao hàng ($\text{Lead Time}$, ví dụ $3 - 7$ ngày).
   - $\text{SS}$: Mức tồn an toàn ($\text{Safety Stock} = Z \times \sigma_d \times \sqrt{L}$).

2. **Số Lượng Đề Xuất Đặt Hàng (Suggested Order Quantity)**:
   $$\text{Deficit} = (\hat{\mu}_{M+1} + \text{SS}) - (\text{CurrentStock} + \text{InTransit})$$
   $$\text{Suggested Quantity} = \begin{cases} 
   0 & \text{nếu } \text{Deficit} \le 0 \\
   \max(\text{MOQ}, \lceil \text{Deficit} \rceil) & \text{nếu } \text{Deficit} > 0 
   \end{cases}$$
   - $\text{MOQ}$: Số lượng đặt hàng tối thiểu của nhà cung cấp ($\text{Minimum Order Quantity}$).
   - $\text{InTransit}$: Lượng hàng từ các đơn PO đang trên đường vận chuyển.

3. **Phân loại Mức độ Khẩn Cấp (Urgency Classification)**:
   - 🔴 **HIGH (Khẩn cấp)**: $\text{CurrentStock} + \text{InTransit} \le \text{ROP}$ hoặc số ngày tồn kho dự kiến $\le 7$ ngày.
   - 🟡 **MEDIUM (Cần theo dõi)**: $\text{ROP} < \text{CurrentStock} + \text{InTransit} \le \text{ROP} \times 1.5$.
   - 🔵 **LOW (An toàn)**: Tồn kho dồi dào, đảm bảo chu kỳ bán hàng.

---

## 4. 🔄 Cơ Chế Vận Hành Huấn Luyện (AI Training Lifecycle)

Anh yêu **KHÔNG CẦN** phải chạy lệnh thủ công mỗi lần! Hệ thống được thiết kế với **3 chế độ tự động hóa & linh hoạt**:

| Chế độ | Cách thức hoạt động | Trường hợp sử dụng |
|---|---|---|
| **1. Tự động khi khởi động (Auto-train on Startup)** | Khi AI Service bật lên, hệ thống sẽ tự động quét thư mục `models/`. Nếu chưa có file `pharma_forecast_model.pth` (ví dụ lần đầu deploy container mới), server sẽ **tự động train ngầm trong background thread** mà không làm treo hay gián đoạn API server. | Tự động hóa 100% khi deploy Docker / Cloud / Railway / Kubernetes. |
| **2. Kích hoạt qua API (On-Demand API Trigger)** | Gửi HTTP POST tới `http://localhost:8000/api/ai/forecast/train` (hoặc bấm nút "Huấn luyện lại AI" trên Dashboard). | Khi có đợt nhập dữ liệu mới lớn hoặc định kỳ chạy Cronjob hàng tuần/tháng. |
| **3. Lệnh thủ công (Manual CLI Script)** | Chạy lệnh `python scripts/train_forecast_gpu.py`. | Dành cho kỹ sư AI muốn debug trực tiếp, tùy chỉnh số Epochs hoặc Hyperparameters. |

---

## 5. 📂 Cấu Trúc Thư Mục & Trọng Số Model

```text
backend/apps/ai-service/
├── models/
│   ├── pharma_forecast_model.pth    # File trọng số chuẩn PyTorch phục vụ Deploy (< 0.5s loading)
│   ├── pharma_forecast_model.pt     # File checkpoint PyTorch đầy đủ (Weights + Optimizer state)
│   └── forecast_metadata.json       # Siêu dữ liệu (Số Epochs, Val MAE, Val RMSE, GPU Device)
├── routers/
│   └── forecast.py                  # API endpoints (/train, /predict, /hardware-status)
├── scripts/
│   └── train_forecast_gpu.py        # Script huấn luyện chính trên GPU CUDA
├── services/
│   ├── pharma_forecaster_nn.py      # Định nghĩa mạng nơ-ron PharmaForecastLSTM
│   ├── forecaster.py                # Engine nạp model và suy luận (TorchGPUForecaster)
│   └── llm_service.py               # Tích hợp Hybrid AI với LLM
├── main.py                          # Điểm khởi động FastAPI & Background Auto-train
└── pipeline.md                      # Tài liệu đặc tả kỹ thuật này
```

---

## 6. 🚀 Hướng Dẫn Triển Khai (Deployment Guide)

### Cách 1: Chạy trực tiếp trên máy chủ / Local
1. Kích hoạt môi trường ảo:
   ```powershell
   cd backend\apps\ai-service
   .\.venv\Scripts\activate
   ```
2. Khởi động AI Service:
   ```powershell
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```
   *(Server sẽ tự kiểm tra model và tự nạp vào GPU RTX 3050)*

### Cách 2: Triển khai Docker / Container
Trong `Dockerfile`, file trọng số `models/pharma_forecast_model.pth` sẽ được copy cùng code. Khi container khởi động:
- Nếu đã có file `.pth`: Sẽ load ngay lập tức trong **< 0.5s**.
- Nếu chưa có: Tự động chạy tiến trình Auto-train ngầm tạo model mới.

---

## 7. 📡 Danh Sách API Reference

### 1. Kiểm tra trạng thái Phần cứng & Model
- **Endpoint:** `GET /api/ai/forecast/hardware-status`
- **Response mẫu:**
  ```json
  {
    "gpu": {
      "cuda_available": true,
      "device_name": "NVIDIA GeForce RTX 3050 Laptop GPU",
      "vram_total_mb": 4096.0,
      "vram_free_mb": 3950.0
    },
    "model_metadata": {
      "model_type": "PharmaForecastLSTM",
      "final_val_mae": 132.2,
      "final_val_rmse": 221.0,
      "saved_at": "2026-09-04"
    }
  }
  ```

### 2. Kích hoạt Huấn luyện lại trên GPU
- **Endpoint:** `POST /api/ai/forecast/train`
- **Body (Tùy chọn):**
  ```json
  {
    "epochs": 60,
    "batch_size": 64,
    "learning_rate": 0.001
  }
  ```

### 3. Dự báo Nhu cầu theo mã thuốc
- **Endpoint:** `POST /api/ai/forecast/predict`
- **Body:**
  ```json
  {
    "sales_history": { "2026-01": 120, "2026-02": 135, "2026-03": 150 },
    "safety_stock": 50,
    "current_stock": 100,
    "price": 45000
  }
  ```
