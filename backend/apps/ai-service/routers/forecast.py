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
    Kích hoạt huấn luyện lại mô hình PyTorch Forecaster trên GPU CUDA
    """
    global TRAINING_STATE
    if TRAINING_STATE["is_training"]:
        return {
            "success": False,
            "message": "Quá trình huấn luyện GPU đang chạy trong background. Vui lòng chờ hoàn tất!",
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
        "message": "Đã bắt đầu tiến trình huấn luyện AI Forecast trên GPU CUDA!",
        "config": config.dict()
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
