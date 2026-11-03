from abc import ABC, abstractmethod
import math
import numpy as np

class ForecastResult:
    def __init__(self, forecast_m1: float, forecast_m2: float, forecast_m3: float, ci_lower: float, ci_upper: float, confidence: int):
        self.forecast_m1 = forecast_m1
        self.forecast_m2 = forecast_m2
        self.forecast_m3 = forecast_m3
        self.ci_lower = ci_lower
        self.ci_upper = ci_upper
        self.confidence = confidence # Percent 0-100

class IForecaster(ABC):
    @abstractmethod
    def forecast(self, sales_history: dict[str, float]) -> ForecastResult:
        pass

class MovingAverageForecaster(IForecaster):
    def forecast(self, sales_history: dict[str, float]) -> ForecastResult:
        # Sort sales history by month chronological key
        sorted_keys = sorted(sales_history.keys())
        sales = [sales_history[k] for k in sorted_keys]
        
        if not sales:
            return ForecastResult(0, 0, 0, 0, 0, 50)
            
        if len(sales) < 3:
            # Fallback when there is not enough history
            avg = sum(sales) / len(sales)
            return ForecastResult(round(avg, 2), round(avg, 2), round(avg, 2), round(avg * 0.8, 2), round(avg * 1.2, 2), 60)
            
        # 3-month moving average
        recent_sales = sales[-3:]
        avg = sum(recent_sales) / 3
        
        # Calculate standard deviation of historical sales to estimate CI
        mean = sum(sales) / len(sales)
        variance = sum((x - mean) ** 2 for x in sales) / len(sales)
        std_dev = math.sqrt(variance)
        
        ci_margin = 1.96 * std_dev
        ci_lower = max(0.0, avg - ci_margin)
        ci_upper = avg + ci_margin
        
        # Forecast confidence based on coefficient of variation (lower variance -> higher confidence)
        if mean > 0:
            cv = std_dev / mean
            confidence = max(50, min(95, int(100 - (cv * 40))))
        else:
            confidence = 50
            
        return ForecastResult(
            forecast_m1=round(avg, 2),
            forecast_m2=round(avg, 2),
            forecast_m3=round(avg, 2),
            ci_lower=round(ci_lower, 2),
            ci_upper=round(ci_upper, 2),
            confidence=confidence
        )

class LinearRegressionForecaster(IForecaster):
    def forecast(self, sales_history: dict[str, float]) -> ForecastResult:
        sorted_keys = sorted(sales_history.keys())
        sales = [sales_history[k] for k in sorted_keys]
        
        if not sales:
            return ForecastResult(0, 0, 0, 0, 0, 50)
            
        n = len(sales)
        if n < 3:
            avg = sum(sales) / n
            return ForecastResult(round(avg, 2), round(avg, 2), round(avg, 2), round(avg * 0.8, 2), round(avg * 1.2, 2), 60)
            
        # Solve y = ax + b using Linear Regression
        x = np.arange(n)
        y = np.array(sales)
        
        # polyfit fits model
        a, b = np.polyfit(x, y, 1)
        
        # Predict month+1, month+2, month+3
        m1 = max(0.0, a * n + b)
        m2 = max(0.0, a * (n + 1) + b)
        m3 = max(0.0, a * (n + 2) + b)
        
        # Calculate standard error of estimate (residuals standard deviation)
        y_pred = a * x + b
        residuals = y - y_pred
        std_error = np.std(residuals)
        
        # 95% Confidence Interval for predictions
        ci_margin = 1.96 * std_error
        ci_lower = max(0.0, m1 - ci_margin)
        ci_upper = m1 + ci_margin
        
        # Calculate R-squared to determine model forecast confidence
        y_mean = np.mean(y)
        if y_mean > 0:
            ss_tot = np.sum((y - y_mean) ** 2)
            ss_res = np.sum(residuals ** 2)
            r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
            
            # Confidence score is higher if linear model fits well (high R-squared)
            confidence = max(50, min(98, int(60 + (r_squared * 38))))
        else:
            confidence = 50
            
        return ForecastResult(
            forecast_m1=round(m1, 2),
            forecast_m2=round(m2, 2),
            forecast_m3=round(m3, 2),
            ci_lower=round(ci_lower, 2),
            ci_upper=round(ci_upper, 2),
            confidence=confidence
        )

class TorchGPUForecaster(IForecaster):
    """
    Forecaster sử dụng mạng nơ-ron Deep Learning PyTorch LSTM
    Chạy trực tiếp trên GPU NVIDIA RTX 3050 (CUDA) với cơ chế tự động fallback CPU
    """
    _model_instance = None
    _device = None
    _model_loaded = False

    def __init__(self, model_path: str = None):
        import os
        if model_path is None:
            models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
            pth_path = os.path.join(models_dir, "pharma_forecast_model.pth")
            pt_path = os.path.join(models_dir, "pharma_forecast_model.pt")
            self.model_path = pth_path if os.path.exists(pth_path) else pt_path
        else:
            self.model_path = model_path
            
        self.fallback_forecaster = LinearRegressionForecaster()
        self._lazy_init_model()

    def _lazy_init_model(self):
        if TorchGPUForecaster._model_loaded:
            return
            
        try:
            import os
            import torch
            from services.pharma_forecaster_nn import PharmaForecastLSTM, get_device
            
            TorchGPUForecaster._device = get_device()
            # Kiểm tra cả 2 định dạng file .pth hoặc .pt
            target_file = self.model_path
            if not os.path.exists(target_file):
                alt_file = target_file.replace(".pt", ".pth") if target_file.endswith(".pt") else target_file.replace(".pth", ".pt")
                if os.path.exists(alt_file):
                    target_file = alt_file
                    
            if os.path.exists(target_file):
                checkpoint = torch.load(target_file, map_location=TorchGPUForecaster._device)
                hidden_size = checkpoint.get("hidden_size", 64)
                num_layers = checkpoint.get("num_layers", 2)
                
                model = PharmaForecastLSTM(
                    input_size=1,
                    hidden_size=hidden_size,
                    num_layers=num_layers,
                    output_steps=3
                )
                model.load_state_dict(checkpoint["model_state_dict"])
                model.to(TorchGPUForecaster._device)
                model.eval()
                
                TorchGPUForecaster._model_instance = model
                TorchGPUForecaster._model_loaded = True
                print(f"[OK] TorchGPUForecaster: Loaded model successfully on device {TorchGPUForecaster._device}")
            else:
                print(f"[INFO] TorchGPUForecaster: Checkpoint not found at {self.model_path}. Using fallback forecaster.")
        except Exception as e:
            print(f"[WARN] TorchGPUForecaster init warning: {e}. Using fallback forecaster.")

    def forecast(self, sales_history: dict[str, float]) -> ForecastResult:
        sorted_keys = sorted(sales_history.keys())
        sales = [sales_history[k] for k in sorted_keys]
        
        if not sales or len(sales) < 3 or not TorchGPUForecaster._model_loaded or TorchGPUForecaster._model_instance is None:
            return self.fallback_forecaster.forecast(sales_history)
            
        try:
            import torch
            
            # Chuẩn bị chuỗi dữ liệu đầu vào (cắt hoặc đệm về độ dài 12 tháng)
            seq_len = 12
            if len(sales) < seq_len:
                # Đệm giá trị trung bình ở đầu chuỗi
                avg_val = sum(sales) / len(sales)
                padded_sales = [avg_val] * (seq_len - len(sales)) + sales
            else:
                padded_sales = sales[-seq_len:]
                
            x_tensor = torch.tensor([[padded_sales]], dtype=torch.float32).permute(0, 2, 1) # (1, 12, 1)
            x_tensor = x_tensor.to(TorchGPUForecaster._device)
            
            with torch.no_grad():
                mean_pred, std_pred = TorchGPUForecaster._model_instance(x_tensor)
                
            m1 = float(mean_pred[0, 0].item())
            m2 = float(mean_pred[0, 1].item())
            m3 = float(mean_pred[0, 2].item())
            
            std_err = float(std_pred[0, 0].item())
            ci_margin = 1.96 * max(0.1, std_err)
            ci_lower = max(0.0, m1 - ci_margin)
            ci_upper = m1 + ci_margin
            
            # Confidence score tính theo tỷ lệ sai số trên dự báo
            mean_val = max(1.0, m1)
            cv = std_err / mean_val
            confidence = max(55, min(99, int(98 - (cv * 30))))
            
            return ForecastResult(
                forecast_m1=round(m1, 2),
                forecast_m2=round(m2, 2),
                forecast_m3=round(m3, 2),
                ci_lower=round(ci_lower, 2),
                ci_upper=round(ci_upper, 2),
                confidence=confidence
            )
        except Exception as e:
            # Fallback nếu có lỗi tính toán tensor
            return self.fallback_forecaster.forecast(sales_history)

def get_default_forecaster() -> IForecaster:
    """Trả về GPU Forecaster nếu có model, ngược lại fallback Linear Regression"""
    return TorchGPUForecaster()

