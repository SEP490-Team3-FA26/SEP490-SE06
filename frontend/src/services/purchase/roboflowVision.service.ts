// roboflowVision.service.ts - Dịch vụ tích hợp Roboflow Computer Vision kiểm đếm hộp thuốc tự động
// Tuân thủ nghiêm ngặt chính sách Zero Mock Data: Dữ liệu đếm và bounding boxes 100% từ mô hình AI thật

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
  predictions: any[];
}

export class RoboflowVisionService {
  private static readonly ROBOFLOW_URL =
    'https://serverless.roboflow.com/infer/workflows/thanh-le-truong/general-segmentation-api-13';
  private static readonly ROBOFLOW_API_KEY = 'm7tvhnXSMEGw3bYwdRyW';

  /**
   * Chuyển đổi File, Blob hoặc DataURL sang chuỗi base64 thuần (không có prefix data:image/...)
   */
  public static async toCleanBase64(input: File | Blob | string): Promise<string> {
    if (typeof input === 'string') {
      if (input.startsWith('data:image')) {
        const parts = input.split(',');
        return parts.length > 1 ? parts[1] : parts[0];
      }
      // Nếu là URL hình ảnh từ xa (http/https), tải về rồi chuyển sang base64
      if (input.startsWith('http://') || input.startsWith('https://')) {
        const response = await fetch(input);
        const blob = await response.blob();
        return this.blobToBase64(blob);
      }
      return input.trim();
    }
    return this.blobToBase64(input);
  }

  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Phân tích phản hồi thô từ Roboflow Workflow để trích xuất số lượng và Bounding Boxes theo %
   */
  public static parseRoboflowOutput(data: any): RoboflowCountResult {
    if (!data || !data.outputs || !Array.isArray(data.outputs) || data.outputs.length === 0) {
      throw new Error('Dịch vụ Roboflow không trả về kết quả hợp lệ');
    }

    const output = data.outputs[0];
    let annotatedImage = '';
    if (output.annotated_image && typeof output.annotated_image === 'object') {
      annotatedImage = `data:image/jpeg;base64,${output.annotated_image.value}`;
    }

    let predictions: any[] = [];
    let imgWidth = 1000;
    let imgHeight = 1000;

    for (const [key, val] of Object.entries(output)) {
      if (val && typeof val === 'object' && 'predictions' in (val as any)) {
        const predObj = val as { predictions: any[]; image?: { width?: number; height?: number } };
        predictions = Array.isArray(predObj.predictions) ? predObj.predictions : [];
        if (predObj.image) {
          imgWidth = predObj.image.width || 1000;
          imgHeight = predObj.image.height || 1000;
        }
        break;
      }
    }

    const count = predictions.length;
    let avgConfidence = 0;

    if (count > 0) {
      const sumConf = predictions.reduce((acc, p) => acc + (Number(p.confidence) || 0.9), 0);
      avgConfidence = Math.round((sumConf / count) * 1000) / 10;
    }

    const boxes: RoboflowBoundingBox[] = predictions.map((p, idx) => {
      const x = Number(p.x) || 0;
      const y = Number(p.y) || 0;
      const w = Number(p.width) || 0;
      const h = Number(p.height) || 0;
      const conf = Math.round((Number(p.confidence) || 0.9) * 100);

      // Quy đổi tọa độ tâm (center-x, center-y) sang góc trên bên trái theo tỉ lệ %
      const left = Math.max(0, Math.min(100, Math.round(((x - w / 2) / imgWidth) * 1000) / 10));
      const top = Math.max(0, Math.min(100, Math.round(((y - h / 2) / imgHeight) * 1000) / 10));
      const widthPct = Math.max(1, Math.min(100, Math.round((w / imgWidth) * 1000) / 10));
      const heightPct = Math.max(1, Math.min(100, Math.round((h / imgHeight) * 1000) / 10));

      return {
        top,
        left,
        width: widthPct,
        height: heightPct,
        label: `Hộp ${idx + 1} • ${conf}%`,
      };
    });

    return {
      detectedCount: count,
      confidence: avgConfidence,
      boxes,
      annotatedImage,
      predictions,
    };
  }

  /**
   * Gọi mô hình Roboflow Serverless Workflow để đếm hộp thuốc thực tế (Zero Mock Data)
   */
  public static async analyzeImage(input: File | Blob | string): Promise<RoboflowCountResult> {
    const cleanBase64 = await this.toCleanBase64(input);
    if (!cleanBase64) {
      throw new Error('Dữ liệu hình ảnh không hợp lệ để phân tích AI');
    }

    const payload = {
      api_key: this.ROBOFLOW_API_KEY,
      inputs: {
        image: {
          type: 'base64',
          value: cleanBase64,
        },
        classes: ['Medicine'],
      },
    };

    const response = await fetch(this.ROBOFLOW_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Roboflow API phản hồi lỗi (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return this.parseRoboflowOutput(data);
  }
}
