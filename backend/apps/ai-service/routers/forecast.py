import os
import json
import threading
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
from services.forecaster import TorchGPUForecaster, ForecastResult

router = APIRouter(prefix="/api/ai/forecast", tags=["AI Demand Forecast & GPU Training"])

# Background training state tracker
TRAINING_STATE = {
    "is_training": False,
    "last_status": "idle",
    "progress": 0,
    "error": None,
    "last_result": None
}

class ForecastRequest(BaseModel):
    sales_history: Dict[str, float]
    safety_stock: Optional[float] = 50.0
    current_stock: Optional[float] = 0.0
    price: Optional[float] = 0.0

class TrainConfig(BaseModel):
    epochs: Optional[int] = 60
    batch_size: Optional[int] = 64
    learning_rate: Optional[float] = 0.001

@router.get("/hardware-status")
def get_hardware_status():
    """
    Trả về thông tin phần cứng GPU CUDA và siêu dữ liệu mô hình đã train
    """
    import torch
    
    cuda_available = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_available else "CPU (No CUDA GPU)"
    
    gpu_info = {
        "cuda_available": cuda_available,
        "device_name": device_name,
        "pytorch_version": torch.__version__,
        "device_count": torch.cuda.device_count() if cuda_available else 0
    }
    
    if cuda_available:
        total_mem = torch.cuda.get_device_properties(0).total_memory / (1024**2)
        alloc_mem = torch.cuda.memory_allocated(0) / (1024**2)
        gpu_info["vram_total_mb"] = round(total_mem, 2)
        gpu_info["vram_allocated_mb"] = round(alloc_mem, 2)
        gpu_info["vram_free_mb"] = round(total_mem - alloc_mem, 2)
        
    # Đọc metadata mô hình đã lưu
    metadata_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", "forecast_metadata.json"))
    model_metadata = None
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                model_metadata = json.load(f)
        except Exception:
            pass
            
    return {
        "gpu": gpu_info,
        "training_state": TRAINING_STATE,
        "model_metadata": model_metadata
    }

def _run_training_job(epochs: int, batch_size: int, learning_rate: float):
    global TRAINING_STATE
    TRAINING_STATE["is_training"] = True
    TRAINING_STATE["last_status"] = "training"
    TRAINING_STATE["error"] = None
    
    try:
        from scripts.train_forecast_gpu import train_pharma_forecast_model
        res = train_pharma_forecast_model(
            epochs=epochs,
            batch_size=batch_size,
            learning_rate=learning_rate
        )
        TRAINING_STATE["last_result"] = res
        TRAINING_STATE["last_status"] = "completed"
        
        # Reset instance trong forecaster để load model mới nhất
        TorchGPUForecaster._model_loaded = False
        TorchGPUForecaster._model_instance = None
    except Exception as e:
        TRAINING_STATE["error"] = str(e)
        TRAINING_STATE["last_status"] = "failed"
    finally:
        TRAINING_STATE["is_training"] = False

@router.post("/train")
def trigger_gpu_training(config: TrainConfig = TrainConfig(), background_tasks: BackgroundTasks = BackgroundTasks()):
    """
    Kích hoạt huấn luyện lại mô hình PyTorch Forecaster trên GPU CUDA hoặc CPU
    """
    global TRAINING_STATE
    if TRAINING_STATE["is_training"]:
        return {
            "success": False,
            "message": "Quá trình huấn luyện đang chạy trong background. Vui lòng chờ hoàn tất!",
            "training_state": TRAINING_STATE
        }
        
    thread = threading.Thread(
        target=_run_training_job,
        args=(config.epochs, config.batch_size, config.learning_rate)
    )
    thread.daemon = True
    thread.start()
    
    return {
        "success": True,
        "message": "Đã bắt đầu tiến trình huấn luyện AI Forecast trên thiết bị phần cứng!",
        "config": config.dict()
    }

class ForecastBatchRequest(BaseModel):
    dataset: Optional[List[dict]] = None
    periodDays: Optional[int] = 30
    branchId: Optional[str] = None

@router.post("")
@router.post("/")
def batch_forecast_demand(req: ForecastBatchRequest):
    """
    Dự báo nhu cầu dược phẩm theo chu kỳ thực tế cho toàn bộ danh mục thuốc của nhà thuốc.
    Kết hợp mô hình Deep Learning PyTorch LSTM và các quy chuẩn ngành Dược (ROP, Safety Stock, Lead Time).
    """
    import math
    forecaster = TorchGPUForecaster()
    period_days = req.periodDays if req.periodDays and req.periodDays > 0 else 30
    raw_dataset = req.dataset or []

    # Nếu không có dataset từ Gateway, thử lấy từ MongoDB thực tế
    if not raw_dataset:
        try:
            from services.db_service import db_service
            # Tự động nạp danh mục thuốc đang hoạt động từ collection medicines
            meds = list(db_service.db["medicines"].find({"status": {"$ne": "INACTIVE"}}, {"_id": 1, "name": 1, "category": 1, "unit": 1, "stock": 1, "price": 1, "reorderPoint": 1, "safetyStock": 1}))
            raw_dataset = [
                {
                    "medicineId": str(m.get("_id")),
                    "name": m.get("name", "Dược phẩm"),
                    "category": m.get("category", "Dược phẩm"),
                    "unit": m.get("unit", "Hộp"),
                    "currentStock": float(m.get("stock", 0)),
                    "price": float(m.get("price", 0)),
                    "reorderPoint": float(m.get("reorderPoint", 30)),
                    "safetyStock": float(m.get("safetyStock", 20)),
                    "expectedIncoming": 0,
                    "averageDailySales": 0.5
                }
                for m in meds
            ]
        except Exception as e:
            print(f"[WARN] Không thể nạp tự động thuốc từ DB: {e}")

    recommendations = []
    urgent_count = 0
    shortage_count = 0

    for item in raw_dataset:
        med_id = str(item.get("medicineId") or item.get("_id") or item.get("id") or "")
        name = item.get("name") or "Dược phẩm"
        category = item.get("category") or "Dược phẩm"
        unit = item.get("unit") or "Hộp"
        current_stock = float(item.get("currentStock", 0) or item.get("stock", 0) or 0)
        expected_incoming = float(item.get("expectedIncoming", 0) or 0)
        avg_daily_sales = float(item.get("averageDailySales", 0) or 0)
        total_sold = float(item.get("totalSold", 0) or 0)
        reorder_point = float(item.get("reorderPoint", 30) or item.get("minStock", 30) or 30)
        safety_stock = float(item.get("safetyStock", 20) or 20)
        price = float(item.get("price", 0) or 0)

        # Chuẩn bị dữ liệu lịch sử bán hàng cho AI
        sales_history = item.get("sales_history") or item.get("monthlySales")
        if not sales_history or not isinstance(sales_history, dict):
            # Tạo chuỗi lịch sử dựa trên tốc độ bán thực tế và mức biến thiên tự nhiên
            base_monthly = avg_daily_sales * 30.0 if avg_daily_sales > 0 else (total_sold / max(1.0, period_days / 30.0))
            sales_history = {}
            for m in range(1, 13):
                # Mô phỏng tính chất mùa vụ và độ lệch ngẫu nhiên nhẹ
                season_mult = 1.0 + 0.15 * math.sin(2 * math.pi * m / 6.0)
                sales_history[f"2026-{m:02d}"] = max(0.0, round(base_monthly * season_mult, 1))

        # Chạy dự báo thông qua mô hình PyTorch Forecaster
        res: ForecastResult = forecaster.forecast(sales_history)
        forecast_m1 = max(0.0, res.forecast_m1)
        if forecast_m1 <= 0 and avg_daily_sales > 0:
            forecast_m1 = round(avg_daily_sales * 30.0, 1)

        # Tính số ngày tồn kho còn lại (daysRemaining)
        if current_stock <= 0:
            days_remaining = 0.0
        elif avg_daily_sales > 0:
            days_remaining = round(current_stock / avg_daily_sales, 1)
        else:
            days_remaining = 999.0  # Dồi dào

        # Tính toán nhu cầu và lượng đặt hàng đề xuất theo nhu cầu thực tế của nhà thuốc
        period_factor = period_days / 30.0
        expected_demand_in_period = max(forecast_m1 * period_factor, avg_daily_sales * period_days)
        target_buffer = max(reorder_point, safety_stock)
        total_needed = round(expected_demand_in_period + target_buffer)
        total_available = current_stock + expected_incoming
        raw_shortage = max(0.0, total_needed - total_available)

        # Quy chuẩn số lượng đặt hàng: làm tròn chẵn 10 để phù hợp với đóng gói thực tế của nhà sản xuất
        if raw_shortage <= 0:
            suggested_order_qty = 0
        else:
            suggested_order_qty = max(10, int(math.ceil(raw_shortage / 10.0) * 10))

        # Phân loại mức độ cấp thiết (urgency) theo rủi ro đứt hàng thực tế
        if current_stock <= 0:
            if expected_incoming > 0:
                urgency = "MEDIUM"
                reason = f"[CHỜ NHẬP HÀNG] Tồn kho tại quầy đã hết (0 {unit}), đơn mua PO trước đó đang trên đường về (+{int(expected_incoming)} {unit}). Dự báo tháng tới cần {int(forecast_m1)} {unit}."
            else:
                urgency = "HIGH"
                reason = f"[CẢNH BÁO ĐỎ] Hết sạch tồn kho (0 {unit}) và chưa có đơn hàng nào đang về! AI dự báo nhu cầu {int(forecast_m1)} {unit}. Cần lập đơn đặt hàng khẩn cấp {suggested_order_qty} {unit} từ Nhà cung cấp."
        elif days_remaining <= 3.0 or current_stock <= max(5.0, reorder_point * 0.3):
            urgency = "HIGH"
            reason = f"[NGUY CƠ ĐỨT HÀNG] Tồn kho chạm đáy ({int(current_stock)} {unit}), chỉ đủ bán trong khoảng {days_remaining} ngày (tốc độ {avg_daily_sales} {unit}/ngày). Khuyến nghị đặt gấp {suggested_order_qty} {unit}."
        elif suggested_order_qty > 0 or days_remaining <= 10.0 or current_stock <= reorder_point:
            urgency = "MEDIUM"
            reason = f"[CẦN BỔ SUNG] Tồn kho hiện tại ({int(current_stock)} {unit}) sắp chạm ngưỡng an toàn ROP ({int(reorder_point)} {unit}). Với tốc độ bán {avg_daily_sales} {unit}/ngày, lượng hàng còn duy trì được {days_remaining} ngày. Khuyên dùng nhập thêm {suggested_order_qty} {unit} (HSD >= 18 tháng)."
        else:
            urgency = "LOW"
            reason = f"[TỒN KHO AN TOÀN] Tồn kho hiện có ({int(current_stock)} {unit}) kết hợp hàng đang giao (+{int(expected_incoming)} {unit}) đáp ứng tốt nhu cầu tiêu thụ dự báo ({int(expected_demand_in_period)} {unit}) trong {period_days} ngày tới. Không cần nhập thêm."

        if urgency == "HIGH":
            urgent_count += 1
        if suggested_order_qty > 0:
            shortage_count += 1

        potential_lost_revenue = round(raw_shortage * price, 2)

        recommendations.append({
            "medicineId": med_id,
            "name": name,
            "category": category,
            "unit": unit,
            "price": price,
            "currentStock": int(current_stock),
            "totalSold": int(total_sold if total_sold > 0 else round(avg_daily_sales * period_days)),
            "averageDailySales": round(avg_daily_sales, 2),
            "expectedIncoming": int(expected_incoming),
            "reorderPoint": int(reorder_point),
            "daysRemaining": days_remaining,
            "forecast_m1": round(forecast_m1, 1),
            "forecast_m2": round(res.forecast_m2, 1),
            "forecast_m3": round(res.forecast_m3, 1),
            "ci_lower": round(res.ci_lower, 1),
            "ci_upper": round(res.ci_upper, 1),
            "confidence": res.confidence,
            "potential_lost_revenue": potential_lost_revenue,
            "suggestedOrderQty": suggested_order_qty,
            "urgency": urgency,
            "reason": reason
        })

    # Sắp xếp danh mục đề xuất: Ưu tiên HIGH lên trước, sau đó đến MEDIUM, rồi đến LOW
    urgency_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    recommendations.sort(key=lambda x: (urgency_order.get(x["urgency"], 3), -x["suggestedOrderQty"]))

    summary_text = f"Mô hình AI Demand Forecast đã phân tích {len(recommendations)} danh mục dược phẩm cho kỳ {period_days} ngày: Phát hiện {urgent_count} thuốc cần nhập khẩn cấp và {shortage_count} thuốc cần bổ sung kho."

    return {
        "success": True,
        "periodDays": period_days,
        "summary": summary_text,
        "totalMedicines": len(recommendations),
        "urgentCount": urgent_count,
        "shortageCount": shortage_count,
        "recommendations": recommendations,
        "enriched_dataset": recommendations
    }

@router.post("/predict")
def predict_demand(req: ForecastRequest):
    """
    Dự báo nhu cầu cho 1 mã thuốc bằng PyTorch GPU Engine
    """
    forecaster = TorchGPUForecaster()
    res: ForecastResult = forecaster.forecast(req.sales_history)
    
    forecast_net = res.forecast_m1 + req.safety_stock
    shortage = max(0.0, forecast_net - req.current_stock)
    potential_lost_revenue = round(shortage * req.price, 2)
    
    return {
        "forecast_m1": res.forecast_m1,
        "forecast_m2": res.forecast_m2,
        "forecast_m3": res.forecast_m3,
        "ci_lower": res.ci_lower,
        "ci_upper": res.ci_upper,
        "confidence": res.confidence,
        "potential_lost_revenue": potential_lost_revenue,
        "suggested_order_qty": round(shortage)
    }

