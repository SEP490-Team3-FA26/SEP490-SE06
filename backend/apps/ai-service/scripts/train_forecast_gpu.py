import os
import sys

# Đảm bảo in UTF-8 không bị lỗi trên Windows PowerShell / CMD
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import json
import time
import math
import random
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from dotenv import load_dotenv, find_dotenv

# Tìm và nạp .env
env_path = find_dotenv()
if env_path:
    load_dotenv(env_path)
else:
    load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.env")))
    load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "../.env")))

# Thêm thư mục gốc của ai-service vào path để import service
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from services.pharma_forecaster_nn import PharmaForecastLSTM, get_device

class PharmaSalesDataset(Dataset):
    """
    Dataset chuỗi thời gian bán hàng cho bài toán Dự báo nhu cầu thuốc
    """
    def __init__(self, sequences: list[list[float]], targets: list[list[float]]):
        self.sequences = torch.tensor(sequences, dtype=torch.float32).unsqueeze(-1) # (N, L, 1)
        self.targets = torch.tensor(targets, dtype=torch.float32) # (N, 3)

    def __len__(self):
        return len(self.sequences)

    def __getitem__(self, idx):
        return self.sequences[idx], self.targets[idx]


def generate_synthetic_pharma_history(num_series: int = 2000, sequence_len: int = 12) -> tuple[list, list]:
    """
    Tạo tập dữ liệu phong phú mô phỏng xu hướng thực tế của chuỗi nhà thuốc:
    - Thuốc kháng sinh / mùa vụ (mùa đông / mưa cảm cúm tăng mạnh)
    - Thuốc tim mạch / mạn tính (doanh số đều đặn ổn định)
    - Thuốc cấp cứu / bán chậm (doanh số ngắt quãng intermittency)
    - Thuốc xu hướng tăng trưởng (trend tăng)
    """
    sequences = []
    targets = []
    
    np.random.seed(42)
    random.seed(42)
    
    for _ in range(num_series):
        pattern_type = random.choice(["seasonal", "steady", "growing", "intermittent"])
        base_level = random.uniform(20.0, 500.0)
        
        series = []
        for t in range(sequence_len + 3):
            noise = np.random.normal(0, base_level * 0.08)
            
            if pattern_type == "seasonal":
                # Sóng sin mùa vụ chu kỳ 6 hoặc 12 tháng
                season_factor = 1.0 + 0.4 * math.sin(2 * math.pi * t / 6.0)
                val = base_level * season_factor + noise
            elif pattern_type == "growing":
                growth_factor = 1.0 + (0.05 * t)
                val = base_level * growth_factor + noise
            elif pattern_type == "intermittent":
                is_active = random.random() > 0.35
                val = (base_level * random.uniform(0.5, 1.5) + noise) if is_active else 0.0
            else: # steady
                val = base_level + noise
                
            series.append(max(0.0, round(float(val), 2)))
            
        # Chia thành Input Sequence (6 đến 12 tháng trước) và Target (3 tháng tiếp theo)
        seq = series[:sequence_len]
        target = series[sequence_len:sequence_len + 3]
        
        sequences.append(seq)
        targets.append(target)
        
    return sequences, targets


def fetch_database_sales_history(sequence_len: int = 12) -> tuple[list, list]:
    """
    Trích xuất và tổng hợp dữ liệu bán hàng thực tế từ cơ sở dữ liệu MongoDB:
    - Bảng salesorders, orders, inventorytransactions (giao dịch xuất bán)
    - Ghép nối với danh mục 1,606 mã thuốc trong collection `medicines`
    """
    sequences = []
    targets = []
    
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        return sequences, targets
        
    try:
        from pymongo import MongoClient
        from datetime import datetime, timedelta
        from collections import defaultdict
        
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)
        try:
            db = client.get_default_database()
        except Exception:
            db = None
        if db is None:
            db = client["WDP201"]
        
        # 1. Lấy danh mục thuốc từ medicines
        medicines = list(db["medicines"].find(
            {"status": {"$ne": "INACTIVE"}},
            {"_id": 1, "name": 1, "category": 1, "stock": 1, "safetyStock": 1, "reorderPoint": 1, "price": 1}
        ))
        
        med_ids = {str(m["_id"]): m for m in medicines}
        print(f"📊 [MongoDB] Đã nạp {len(medicines)} thuốc từ collection `medicines`.")
        
        # 1.1 Lấy tồn kho thực tế từ medicinebatches
        batch_col = "medicinebatches" if "medicinebatches" in db.list_collection_names() else "batches"
        if batch_col in db.list_collection_names():
            batches = list(db[batch_col].find({"status": {"$in": ["ACTIVE", "active", "IN_STOCK"]}}, {"medicineId": 1, "stock": 1}))
            stock_map = defaultdict(float)
            for b in batches:
                b_mid = str(b.get("medicineId", ""))
                stock_map[b_mid] += float(b.get("stock", 0))
            for b_mid, actual_stock in stock_map.items():
                if b_mid in med_ids:
                    med_ids[b_mid]["stock"] = actual_stock
            print(f"📦 [MongoDB] Đã cập nhật tồn kho thực tế từ collection `{batch_col}` cho {len(stock_map)} thuốc.")

        # 2. Tổng hợp lịch sử bán hàng theo từng tháng (hoặc khoảng 30 ngày)
        # Sales bucket: { medicine_id: { month_key: total_quantity } }
        sales_timeline = defaultdict(lambda: defaultdict(float))
        
        # A. Lấy từ salesorders
        if "salesorders" in db.list_collection_names():
            sales_orders = list(db["salesorders"].find({}, {"items": 1, "createdAt": 1}))
            for so in sales_orders:
                dt = so.get("createdAt")
                if isinstance(dt, str):
                    try:
                        dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
                    except Exception:
                        dt = datetime.now()
                elif not isinstance(dt, datetime):
                    dt = datetime.now()
                    
                m_key = dt.strftime("%Y-%m")
                for it in so.get("items", []):
                    mid = str(it.get("medicineId", "") or it.get("drugId", "") or it.get("id", ""))
                    qty = float(it.get("quantity", 0) or it.get("qty", 0) or 0)
                    if mid and qty > 0:
                        sales_timeline[mid][m_key] += qty
                    
        # B. Lấy từ orders
        if "orders" in db.list_collection_names():
            orders = list(db["orders"].find({}, {"items": 1, "createdAt": 1}))
            for od in orders:
                dt = od.get("createdAt")
                if isinstance(dt, str):
                    try:
                        dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
                    except Exception:
                        dt = datetime.now()
                elif not isinstance(dt, datetime):
                    dt = datetime.now()
                    
                m_key = dt.strftime("%Y-%m")
                for it in od.get("items", []):
                    mid = str(it.get("medicineId", "") or it.get("drugId", "") or it.get("id", ""))
                    qty = float(it.get("quantity", 0) or it.get("qty", 0) or 0)
                    if mid and qty > 0:
                        sales_timeline[mid][m_key] += qty

        # C. Lấy từ inventorytransactions (loại SALE / EXPORT / OUT)
        if "inventorytransactions" in db.list_collection_names():
            txs = list(db["inventorytransactions"].find(
                {"type": {"$in": ["SALE", "EXPORT", "DISPENSE", "TRANSFER_OUT", "OUT", "INTERNAL_EXPORT"]}},
                {"medicineId": 1, "quantity": 1, "quantityChange": 1, "qty": 1, "createdAt": 1}
            ))
            for tx in txs:
                dt = tx.get("createdAt")
                if isinstance(dt, str):
                    try:
                        dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
                    except Exception:
                        dt = datetime.now()
                elif not isinstance(dt, datetime):
                    dt = datetime.now()
                    
                m_key = dt.strftime("%Y-%m")
                mid = str(tx.get("medicineId", ""))
                qty = abs(float(tx.get("quantityChange") or tx.get("quantity") or tx.get("qty") or 0))
                if mid and qty > 0:
                    sales_timeline[mid][m_key] += qty
                
        print(f"📈 [MongoDB] Đã trích xuất lịch sử bán của {len(sales_timeline)} thuốc có phát sinh giao dịch.")
        
        # 3. Tạo các chuỗi thời gian cho từng thuốc
        for mid, m_info in med_ids.items():
            timeline = sales_timeline.get(mid, {})
            sorted_months = sorted(timeline.keys())
            
            if sorted_months:
                values = [timeline[k] for k in sorted_months]
            else:
                # Nếu thuốc chưa có giao dịch thực tế -> dùng mức tồn kho an toàn & baseline
                base_stock = float(m_info.get("stock", 0) or m_info.get("safetyStock", 20) or 20)
                values = [max(0.0, base_stock * 0.2 + random.uniform(-2, 5)) for _ in range(sequence_len + 3)]
                
            # Đảm bảo chuỗi có đủ độ dài sequence_len + 3
            if len(values) < (sequence_len + 3):
                avg = sum(values) / len(values) if values else 10.0
                padded = [max(0.0, round(avg + random.uniform(-2, 2), 2)) for _ in range(sequence_len + 3 - len(values))] + values
            else:
                padded = values[-(sequence_len + 3):]
                
            seq = padded[:sequence_len]
            tgt = padded[sequence_len:sequence_len + 3]
            
            sequences.append(seq)
            targets.append(tgt)
            
        print(f"✅ [MongoDB] Đã tổng hợp thành công {len(sequences)} chuỗi thời gian từ Database.")
    except Exception as e:
        print(f"⚠️ [MongoDB] Lỗi đọc dữ liệu DB: {e}. Sẽ dùng bộ dữ liệu tăng cường chuyên sâu.")
        
    return sequences, targets


def train_pharma_forecast_model(
    epochs: int = 60,
    batch_size: int = 64,
    learning_rate: float = 0.001,
    hidden_size: int = 64,
    num_layers: int = 2,
    save_dir: str = "models"
) -> dict:
    """
    Quy trình huấn luyện AI Time-Series Forecaster trên GPU NVIDIA CUDA
    """
    device = get_device()
    print("=" * 60)
    print(f"🚀 BẮT ĐẦU HUẤN LUYỆN AI FORECAST TRÊN THIẾT BỊ: {device}")
    if device.type == "cuda":
        print(f"   🔥 GPU Name: {torch.cuda.get_device_name(0)}")
        print(f"   ⚡ CUDA Capability: {torch.cuda.get_device_capability(0)}")
        print(f"   💾 VRAM khả dụng: {torch.cuda.get_device_properties(0).total_memory / (1024**2):.1f} MB")
    print("=" * 60)
    
    # 1. Chuẩn bị dữ liệu huấn luyện
    db_seqs, db_targets = fetch_database_sales_history()
    synth_seqs, synth_targets = generate_synthetic_pharma_history(num_series=3500, sequence_len=12)
    
    all_seqs = db_seqs + synth_seqs
    all_targets = db_targets + synth_targets
    
    # Chia Train / Validation (85% / 15%)
    split_idx = int(len(all_seqs) * 0.85)
    train_seqs, val_seqs = all_seqs[:split_idx], all_seqs[split_idx:]
    train_targets, val_targets = all_targets[:split_idx], all_targets[split_idx:]
    
    train_dataset = PharmaSalesDataset(train_seqs, train_targets)
    val_dataset = PharmaSalesDataset(val_seqs, val_targets)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    
    # 2. Khởi tạo mô hình & đẩy lên GPU
    model = PharmaForecastLSTM(
        input_size=1,
        hidden_size=hidden_size,
        num_layers=num_layers,
        output_steps=3,
        dropout=0.2
    ).to(device)
    
    criterion_mse = nn.HuberLoss(delta=1.0)
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", patience=5, factor=0.5)
    
    # 3. Vòng lặp huấn luyện (Training Loop trên GPU)
    history = {"train_loss": [], "val_loss": [], "val_mae": [], "val_rmse": []}
    start_time = time.time()
    
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss_accum = 0.0
        
        for batch_x, batch_y in train_loader:
            batch_x = batch_x.to(device)
            batch_y = batch_y.to(device)
            
            optimizer.zero_grad()
            mean_pred, std_pred = model(batch_x)
            
            # Loss kết hợp: Sai số dự báo (Huber Loss) + Gaussian NLL cho độ lệch chuẩn
            loss_mean = criterion_mse(mean_pred, batch_y)
            # Ước lượng độ lệch chuẩn sai số
            residual = torch.abs(mean_pred.detach() - batch_y)
            loss_std = criterion_mse(std_pred, residual)
            
            total_loss = loss_mean + 0.5 * loss_std
            total_loss.backward()
            
            # Gradient clipping chống bùng nổ gradient
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=2.0)
            optimizer.step()
            
            train_loss_accum += total_loss.item() * len(batch_x)
            
        epoch_train_loss = train_loss_accum / len(train_dataset)
        
        # Đánh giá Validation
        model.eval()
        val_loss_accum = 0.0
        val_mae_accum = 0.0
        val_sq_accum = 0.0
        
        with torch.no_grad():
            for batch_x, batch_y in val_loader:
                batch_x = batch_x.to(device)
                batch_y = batch_y.to(device)
                
                mean_pred, std_pred = model(batch_x)
                loss = criterion_mse(mean_pred, batch_y)
                
                val_loss_accum += loss.item() * len(batch_x)
                val_mae_accum += torch.sum(torch.abs(mean_pred - batch_y)).item()
                val_sq_accum += torch.sum((mean_pred - batch_y) ** 2).item()
                
        epoch_val_loss = val_loss_accum / len(val_dataset)
        epoch_val_mae = val_mae_accum / (len(val_dataset) * 3)
        epoch_val_rmse = math.sqrt(val_sq_accum / (len(val_dataset) * 3))
        
        scheduler.step(epoch_val_loss)
        
        history["train_loss"].append(round(epoch_train_loss, 4))
        history["val_loss"].append(round(epoch_val_loss, 4))
        history["val_mae"].append(round(epoch_val_mae, 4))
        history["val_rmse"].append(round(epoch_val_rmse, 4))
        
        if epoch % 10 == 0 or epoch == 1 or epoch == epochs:
            vram_usage = f"{torch.cuda.memory_allocated(0)/(1024**2):.1f}MB" if device.type == "cuda" else "N/A"
            print(f"Epoch [{epoch:02d}/{epochs:02d}] | Train Loss: {epoch_train_loss:.4f} | Val Loss: {epoch_val_loss:.4f} | MAE: {epoch_val_mae:.2f} | RMSE: {epoch_val_rmse:.2f} | VRAM: {vram_usage}")
            
    training_duration = round(time.time() - start_time, 2)
    print("=" * 60)
    print(f"✅ HUẤN LUYỆN HOÀN TẤT TRONG {training_duration}s TRÊN GPU!")
    print(f"   Final Val MAE: {history['val_mae'][-1]} | Final Val RMSE: {history['val_rmse'][-1]}")
    
    # 4. Lưu Checkpoint & Metadata
    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", save_dir))
    os.makedirs(models_dir, exist_ok=True)
    
    model_save_path_pt = os.path.join(models_dir, "pharma_forecast_model.pt")
    model_save_path_pth = os.path.join(models_dir, "pharma_forecast_model.pth")
    metadata_save_path = os.path.join(models_dir, "forecast_metadata.json")
    
    # Checkpoint data
    checkpoint_data = {
        "model_state_dict": model.state_dict(),
        "input_size": 1,
        "hidden_size": hidden_size,
        "num_layers": num_layers,
        "output_steps": 3,
        "history_len": 12,
        "device_trained": str(device),
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    # Lưu cả định dạng .pt và .pth để hỗ trợ triển khai linh hoạt (deploy container / cloud)
    torch.save(checkpoint_data, model_save_path_pt)
    torch.save(checkpoint_data, model_save_path_pth)
    
    metadata = {
        "model_type": "PharmaForecastLSTM",
        "device": str(device),
        "device_name": torch.cuda.get_device_name(0) if device.type == "cuda" else "CPU",
        "training_duration_seconds": training_duration,
        "total_samples": len(all_seqs),
        "epochs": epochs,
        "final_train_loss": history["train_loss"][-1],
        "final_val_loss": history["val_loss"][-1],
        "final_val_mae": history["val_mae"][-1],
        "final_val_rmse": history["val_rmse"][-1],
        "saved_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    with open(metadata_save_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
        
    print(f"💾 Đã lưu Checkpoint PT:  {model_save_path_pt}")
    print(f"💾 Đã lưu Checkpoint PTH: {model_save_path_pth}")
    print(f"📄 Đã lưu Metadata:       {metadata_save_path}")
    print("=" * 60)
    
    return metadata

if __name__ == "__main__":
    train_pharma_forecast_model()
