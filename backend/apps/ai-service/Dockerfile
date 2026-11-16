FROM python:3.11-slim

WORKDIR /app

# Thiết lập biến môi trường tối ưu: chống timeout và tự động retry khi tải gói
ENV PIP_DEFAULT_TIMEOUT=1000 \
    PIP_RETRIES=10 \
    PYTHONUNBUFFERED=1

# Bước 1: Cài đặt trước PyTorch bản CPU (~180MB) từ index chính thức của PyTorch
# Tách thành layer độc lập TRƯỚC KHI copy requirements để Docker cache vĩnh viễn
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install torch --index-url https://download.pytorch.org/whl/cpu

# Bước 2: Cài đặt các thư viện ứng dụng từ requirements.txt
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Bước 3: Sao chép toàn bộ mã nguồn vào container
COPY . .

EXPOSE ${PORT:-8000}

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
