import torch
import torch.nn as nn
import numpy as np

class PharmaForecastLSTM(nn.Module):
    """
    Mô hình Deep Learning PyTorch LSTM + Multi-Head Dense
    Dự báo chuỗi thời gian nhu cầu dược phẩm (3 tháng tiếp theo M+1, M+2, M+3)
    cùng với khoảng tin cậy (Confidence Interval) và độ tin cậy mô hình.
    """
    def __init__(self, input_size: int = 1, hidden_size: int = 64, num_layers: int = 2, output_steps: int = 3, dropout: float = 0.2):
        super(PharmaForecastLSTM, self).__init__()
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.output_steps = output_steps
        
        # LSTM trích xuất đặc trưng chuỗi thời gian bán hàng
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )
        
        # Fully Connected Block
        self.fc_block = nn.Sequential(
            nn.Linear(hidden_size, 64),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(64, 32),
            nn.GELU()
        )
        
        # Head 1: Dự báo trung vị/kỳ vọng số lượng bán (M+1, M+2, M+3)
        self.mean_head = nn.Linear(32, output_steps)
        
        # Head 2: Dự báo độ biến động / sai số chuẩn (Standard Deviation) để ước lượng CI & Độ tin cậy
        self.std_head = nn.Sequential(
            nn.Linear(32, output_steps),
            nn.Softplus() # Đảm bảo sai số luôn > 0
        )

    def forward(self, x: torch.Tensor):
        """
        x: Tensor shape (batch_size, sequence_length, input_size)
        Returns:
            mean_pred: (batch_size, 3) - Dự báo M1, M2, M3
            std_pred: (batch_size, 3)  - Độ lệch chuẩn sai số
        """
        out, (hn, cn) = self.lstm(x)
        # Lấy hidden state ở bước thời gian cuối cùng
        last_hidden = out[:, -1, :] # (batch_size, hidden_size)
        
        features = self.fc_block(last_hidden)
        
        mean_pred = self.mean_head(features)
        # Giới hạn không âm cho số lượng bán hàng
        mean_pred = torch.relu(mean_pred)
        
        std_pred = self.std_head(features)
        
        return mean_pred, std_pred

def get_device() -> torch.device:
    """Trả về thiết bị tối ưu (CUDA GPU nếu có, ngược lại fallback CPU)"""
    if torch.cuda.is_available():
        return torch.device("cuda:0")
    return torch.device("cpu")
