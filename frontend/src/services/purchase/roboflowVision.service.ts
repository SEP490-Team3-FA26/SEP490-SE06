import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface RoboflowBoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
  label: string;
}

export interface RoboflowCountResult {
  detectedCount: number;
  confidence: number;
  boxes: RoboflowBoundingBox[];
  annotatedImage?: string;
}

export class RoboflowVisionService {
  public static async analyzeImage(file: File): Promise<RoboflowCountResult> {
    if (!file.size) {
      throw new Error('Dữ liệu hình ảnh không hợp lệ để phân tích AI');
    }
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<RoboflowCountResult>(API_ENDPOINTS.GOODS_RECEIPTS.COUNT_BOXES, formData);
    return response.data;
  }
}
