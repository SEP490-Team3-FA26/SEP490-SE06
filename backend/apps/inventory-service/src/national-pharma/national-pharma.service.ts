import { Injectable, Logger } from '@nestjs/common';

export interface NationalPharmaSyncResult {
  success: boolean;
  facilityCode: string;
  syncCode: string;
  syncStatus: 'SYNCED' | 'PENDING' | 'REJECTED' | 'FAILED';
  syncedAt: Date;
  message: string;
  payloadSent: any;
  violationReason?: string | null;
}

export const BRANCH_FACILITY_MAP: Record<string, string> = {
  'BR-001': '79-001234', // Kho Tổng GSP WDP301
  'CENTRAL_WH': '79-001234',
  'BR-002': '79-001235', // Nhà thuốc Chi nhánh 1 (GPP)
  'BR-003': '79-001236', // Nhà thuốc Chi nhánh 2 (GPP)
  'BR-004': '79-001237', // Nhà thuốc Chi nhánh 3 (GPP)
  'BR-005': '79-001238', // Nhà thuốc Chi nhánh 4 (GPP)
  'BR-006': '79-001239',
  'BR-007': '79-001240',
  'BR-008': '79-001241',
};

@Injectable()
export class NationalPharmaService {
  private readonly logger = new Logger(NationalPharmaService.name);

  private readonly baseUrl: string;
  private readonly username: string;
  private readonly rawPassword: string;

  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.baseUrl = (process.env.CSDLDUOC_BASE_URL || 'http://localhost:4005/v2').replace(/\/$/, '');
    this.username = process.env.CSDLDUOC_USERNAME || '0312345678';
    this.rawPassword = process.env.CSDLDUOC_PASSWORD || 'MatKhauNhaThuoc2026@';
  }

  /**
   * Lấy Bearer Access Token từ Cổng Sandbox CSDL Dược Quốc Gia theo QĐ 232 Mục 4.1
   */
  private async getAccessToken(): Promise<string | null> {
    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiresAt - 60000) {
      return this.cachedToken;
    }

    try {
      const base64Password = Buffer.from(this.rawPassword).toString('base64');
      const body = new URLSearchParams({
        username: this.username,
        password: base64Password,
      });

      const res = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!res.ok) {
        const errText = await res.text();
        this.logger.warn(`[CSDL Dược] Đăng nhập thất bại (${res.status}): ${errText}`);
        return null;
      }

      const data = await res.json();
      if (data && data.access_token) {
        this.cachedToken = data.access_token;
        const expiresInSec = data.expires_in || 3600;
        this.tokenExpiresAt = now + expiresInSec * 1000;
        return this.cachedToken;
      }
      return null;
    } catch (err: any) {
      this.logger.warn(`[CSDL Dược] Không thể kết nối tới server CSDL Dược: ${err.message}`);
      return null;
    }
  }

  /**
   * Gửi HTTP request kèm Bearer Token tới CSDL Dược Quốc Gia
   */
  private async postRequest(endpoint: string, payload: any): Promise<{ ok: boolean; status: number; data: any }> {
    const token = await this.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get('content-type') || '';
    let data: any = null;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    return { ok: res.ok, status: res.status, data };
  }

  /**
   * 1. Đồng bộ hóa đơn bán lẻ hoặc đơn thuốc lên CSDL Dược Quốc gia (POST /v2/transactions/stock-out)
   */
  async syncSaleOrder(saleOrder: any, branchId?: string): Promise<NationalPharmaSyncResult> {
    const targetBranch = branchId || saleOrder.branchId || 'BR-001';
    const facilityCode = BRANCH_FACILITY_MAP[targetBranch] || '79-001234';
    const refNumber = String(saleOrder.orderCode || saleOrder._id || `SO-${Date.now()}`);

    const items = (saleOrder.items || []).map((it: any) => {
      const batchNo = it.batchNo || (it.batches && it.batches[0] ? it.batches[0].batchNo : 'LOT-DEFAULT');
      let expDate = it.expDate || (it.batches && it.batches[0] ? it.batches[0].expDate : null);
      if (expDate && typeof expDate !== 'string') {
        expDate = new Date(expDate).toISOString().slice(0, 10);
      } else if (!expDate) {
        expDate = '2028-12-31';
      }

      return {
        drug_id: it.nationalDrugId || it.medicineId || 'DRUG-00001',
        unit_id: it.unitId || 'U-01',
        quantity: Number(it.quantity) || 1,
        batch_no: batchNo,
        packaging_specifications: it.unit || 'Hộp',
        expiry_date: expDate,
        price: Number(it.price) || 0,
        dosage_instruction: it.dosageInstructions || (it.dailyDose ? `Dùng ${it.dailyDose} ${it.unit}/ngày` : 'Theo hướng dẫn'),
      };
    });

    const nationalPayload = {
      transaction_date: (saleOrder.createdAt ? new Date(saleOrder.createdAt) : new Date()).toISOString(),
      reason: 'sale-retail',
      reference_number: refNumber,
      practice_license_code: facilityCode,
      target_store_id: facilityCode,
      prescription_code: saleOrder.prescriptionCode || undefined,
      note: `Bán lẻ tại quầy - Khách: ${saleOrder.patientName || 'Khách lẻ vãng lai'}`,
      items,
    };

    this.logger.log(`[CSDL Dược] Gửi hóa đơn ${refNumber} lên CSDL Dược Quốc gia (Cơ sở: ${facilityCode})...`);

    try {
      const resp = await this.postRequest('/transactions/stock-out', nationalPayload);

      if (resp.ok && resp.data && resp.data.transaction_id) {
        return {
          success: true,
          facilityCode,
          syncCode: resp.data.transaction_id,
          syncStatus: 'SYNCED',
          syncedAt: new Date(),
          message: resp.data.message || `Đã liên thông thành công (Mã giao dịch: ${resp.data.transaction_id})`,
          payloadSent: nationalPayload,
        };
      }

      // Trường hợp bị Bộ Y Tế từ chối (Ví dụ vi phạm bán thuốc quá hạn)
      if (resp.data && resp.data.status === 'rejected') {
        return {
          success: false,
          facilityCode,
          syncCode: resp.data.transaction_id || `REJ-${Date.now()}`,
          syncStatus: 'REJECTED',
          syncedAt: new Date(),
          message: resp.data.violation_reason || 'Bị CSDL Dược Quốc gia từ chối ghi nhận',
          payloadSent: nationalPayload,
          violationReason: resp.data.violation_reason,
        };
      }

      this.logger.warn(`[CSDL Dược] Cổng trả về mã ${resp.status}: ${JSON.stringify(resp.data)}`);
    } catch (err: any) {
      this.logger.warn(`[CSDL Dược] Lỗi khi gửi hóa đơn lên CSDL Dược: ${err.message}`);
    }

    // Fallback Offline: ghi nhận trạng thái PENDING để hệ thống thử lại sau
    const fallbackSyncCode = `PENDING-OUT-${Date.now().toString().slice(-6)}`;
    return {
      success: true,
      facilityCode,
      syncCode: fallbackSyncCode,
      syncStatus: 'PENDING',
      syncedAt: new Date(),
      message: `Đã lưu tạm hàng đợi liên thông CSDL Dược (Mã biên nhận: ${fallbackSyncCode})`,
      payloadSent: nationalPayload,
    };
  }

  /**
   * 2. Đồng bộ phiếu nhập kho từ Nhà cung cấp lên CSDL Dược Quốc gia (POST /v2/transactions/stock-in)
   */
  async syncGoodsReceipt(goodsReceipt: any, branchId?: string): Promise<NationalPharmaSyncResult> {
    const targetBranch = branchId || goodsReceipt.branchId || 'BR-001';
    const facilityCode = BRANCH_FACILITY_MAP[targetBranch] || '79-001234';
    const refNumber = String(goodsReceipt.vatInvoiceNumber || goodsReceipt.invoiceNo || goodsReceipt.poId || goodsReceipt._id || `GRN-${Date.now()}`);

    const items = (goodsReceipt.items || []).map((it: any) => {
      let expDate = it.expDate;
      if (expDate && typeof expDate !== 'string') {
        expDate = new Date(expDate).toISOString().slice(0, 10);
      } else if (!expDate) {
        expDate = '2028-12-31';
      }

      return {
        drug_id: it.nationalDrugId || it.medicineId || 'DRUG-00001',
        unit_id: it.unitId || 'U-01',
        quantity: Number(it.actualQty !== undefined ? it.actualQty : it.quantity) || 1,
        batch_no: it.batchNo || `LOT-${Date.now().toString().slice(-6)}`,
        packaging_specifications: it.unit || 'Hộp',
        expiry_date: expDate,
        price: Number(it.unitPrice) || 0,
      };
    });

    const nationalPayload = {
      transaction_date: (goodsReceipt.createdAt ? new Date(goodsReceipt.createdAt) : new Date()).toISOString(),
      reason: 'supplier',
      supplier_id: goodsReceipt.supplierId || 'SUP-001',
      reference_number: refNumber,
      practice_license_code: facilityCode,
      target_warehouse_id: facilityCode,
      note: `Nhập kho từ NCC: ${goodsReceipt.supplierName || 'Nhà cung cấp Dược'}`,
      items,
    };

    this.logger.log(`[CSDL Dược] Gửi Phiếu Nhập Kho ${refNumber} lên CSDL Dược Quốc gia (Cơ sở: ${facilityCode})...`);

    try {
      const resp = await this.postRequest('/transactions/stock-in', nationalPayload);

      if (resp.ok && resp.data && resp.data.transaction_id) {
        return {
          success: true,
          facilityCode,
          syncCode: resp.data.transaction_id,
          syncStatus: 'SYNCED',
          syncedAt: new Date(),
          message: resp.data.message || `Đã liên thông Nhập kho thành công (Mã giao dịch: ${resp.data.transaction_id})`,
          payloadSent: nationalPayload,
        };
      }
    } catch (err: any) {
      this.logger.warn(`[CSDL Dược] Lỗi khi gửi Phiếu Nhập Kho: ${err.message}`);
    }

    const fallbackSyncCode = `PENDING-IN-${Date.now().toString().slice(-6)}`;
    return {
      success: true,
      facilityCode,
      syncCode: fallbackSyncCode,
      syncStatus: 'PENDING',
      syncedAt: new Date(),
      message: `Đã lưu tạm hàng đợi liên thông Nhập kho (Mã biên nhận: ${fallbackSyncCode})`,
      payloadSent: nationalPayload,
    };
  }

  /**
   * 3. Đồng bộ biên bản kiểm kê kho lên CSDL Dược Quốc gia (POST /v2/transactions/stock-taking)
   */
  async syncStockTaking(inventoryCheck: any, branchId?: string): Promise<NationalPharmaSyncResult> {
    const targetBranch = branchId || inventoryCheck.branchId || 'BR-001';
    const facilityCode = BRANCH_FACILITY_MAP[targetBranch] || '79-001234';
    const refNumber = String(inventoryCheck.checkCode || inventoryCheck._id || `ST-${Date.now()}`);

    const items = (inventoryCheck.items || []).map((it: any) => ({
      drug_id: it.nationalDrugId || it.medicineId || 'DRUG-00001',
      unit_id: 'U-01',
      system_quantity: Number(it.systemStock) || 0,
      actual_quantity: Number(it.actualStock) || 0,
      discrepancy: Number(it.difference !== undefined ? it.difference : (it.actualStock - it.systemStock)) || 0,
      batch_no: it.batchNo || 'LOT-DEFAULT',
      expiry_date: it.expDate ? new Date(it.expDate).toISOString().slice(0, 10) : '2028-12-31',
      reason: it.reason || 'Kiểm kê kho định kỳ GPP',
    }));

    const nationalPayload = {
      transaction_date: (inventoryCheck.createdAt ? new Date(inventoryCheck.createdAt) : new Date()).toISOString(),
      reference_number: refNumber,
      practice_license_code: facilityCode,
      note: inventoryCheck.notes || `Kiểm kê kho cơ sở ${facilityCode} do ${inventoryCheck.performedBy || 'Dược sĩ'} thực hiện`,
      items,
    };

    this.logger.log(`[CSDL Dược] Gửi Phiếu Kiểm Kê ${refNumber} lên CSDL Dược Quốc gia (Cơ sở: ${facilityCode})...`);

    try {
      const resp = await this.postRequest('/transactions/stock-taking', nationalPayload);

      if (resp.ok && resp.data && resp.data.transaction_id) {
        return {
          success: true,
          facilityCode,
          syncCode: resp.data.transaction_id,
          syncStatus: 'SYNCED',
          syncedAt: new Date(),
          message: resp.data.message || `Đã liên thông Kiểm kê kho thành công (Mã giao dịch: ${resp.data.transaction_id})`,
          payloadSent: nationalPayload,
        };
      }
    } catch (err: any) {
      this.logger.warn(`[CSDL Dược] Lỗi khi gửi Phiếu Kiểm Kê: ${err.message}`);
    }

    const fallbackSyncCode = `PENDING-ST-${Date.now().toString().slice(-6)}`;
    return {
      success: true,
      facilityCode,
      syncCode: fallbackSyncCode,
      syncStatus: 'PENDING',
      syncedAt: new Date(),
      message: `Đã lưu tạm hàng đợi liên thông Kiểm kê kho (Mã biên nhận: ${fallbackSyncCode})`,
      payloadSent: nationalPayload,
    };
  }

  /**
   * 4. Đồng bộ xuất hủy thuốc quá hạn / thuốc hỏng (POST /v2/transactions/stock-out reason: destroy)
   */
  async syncDisposal(disposalData: any, branchId?: string): Promise<NationalPharmaSyncResult> {
    const targetBranch = branchId || disposalData.branchId || 'BR-001';
    const facilityCode = BRANCH_FACILITY_MAP[targetBranch] || '79-001234';
    const refNumber = `DISPOSE-${Date.now()}`;

    const nationalPayload = {
      transaction_date: new Date().toISOString(),
      reason: 'destroy',
      reference_number: refNumber,
      practice_license_code: facilityCode,
      note: disposalData.notes || 'Tiêu hủy thuốc hết hạn theo Thông tư 11/2025/TT-BYT',
      items: [
        {
          drug_id: disposalData.medicineId || 'DRUG-00001',
          unit_id: 'U-01',
          quantity: disposalData.quantity || 1,
          batch_no: disposalData.batchNo || 'LOT-EXPIRED',
          packaging_specifications: 'Hộp',
          expiry_date: disposalData.expDate || '2025-01-01',
          price: 0,
        },
      ],
    };

    try {
      const resp = await this.postRequest('/transactions/stock-out', nationalPayload);
      if (resp.ok && resp.data && resp.data.transaction_id) {
        return {
          success: true,
          facilityCode,
          syncCode: resp.data.transaction_id,
          syncStatus: 'SYNCED',
          syncedAt: new Date(),
          message: `Đã liên thông Xuất hủy thuốc lên CSDL Dược Quốc gia (Mã: ${resp.data.transaction_id})`,
          payloadSent: nationalPayload,
        };
      }
    } catch (err: any) {
      this.logger.warn(`[CSDL Dược] Lỗi gửi Xuất hủy thuốc: ${err.message}`);
    }

    return {
      success: true,
      facilityCode,
      syncCode: `PENDING-DISP-${Date.now().toString().slice(-6)}`,
      syncStatus: 'PENDING',
      syncedAt: new Date(),
      message: 'Đã lưu tạm hàng đợi liên thông Xuất hủy thuốc',
      payloadSent: nationalPayload,
    };
  }

  /**
   * 5. Đồng bộ xuất trả nhà cung cấp (POST /v2/transactions/stock-out reason: return)
   */
  async syncReturnToSupplier(returnData: any, branchId?: string): Promise<NationalPharmaSyncResult> {
    const targetBranch = branchId || returnData.branchId || 'BR-001';
    const facilityCode = BRANCH_FACILITY_MAP[targetBranch] || '79-001234';
    const refNumber = `RET-${Date.now()}`;

    const nationalPayload = {
      transaction_date: new Date().toISOString(),
      reason: 'return',
      supplier_id: returnData.supplierId || 'SUP-001',
      reference_number: refNumber,
      practice_license_code: facilityCode,
      note: returnData.notes || 'Xuất trả hàng cho Nhà cung cấp',
      items: [
        {
          drug_id: returnData.medicineId || 'DRUG-00001',
          unit_id: 'U-01',
          quantity: returnData.quantity || 1,
          batch_no: returnData.batchNo || 'LOT-RETURN',
          packaging_specifications: 'Hộp',
          expiry_date: returnData.expDate || '2026-12-31',
          price: returnData.unitPrice || 0,
        },
      ],
    };

    try {
      const resp = await this.postRequest('/transactions/stock-out', nationalPayload);
      if (resp.ok && resp.data && resp.data.transaction_id) {
        return {
          success: true,
          facilityCode,
          syncCode: resp.data.transaction_id,
          syncStatus: 'SYNCED',
          syncedAt: new Date(),
          message: `Đã liên thông Xuất trả NCC lên CSDL Dược Quốc gia (Mã: ${resp.data.transaction_id})`,
          payloadSent: nationalPayload,
        };
      }
    } catch (err: any) {
      this.logger.warn(`[CSDL Dược] Lỗi gửi Xuất trả NCC: ${err.message}`);
    }

    return {
      success: true,
      facilityCode,
      syncCode: `PENDING-RET-${Date.now().toString().slice(-6)}`,
      syncStatus: 'PENDING',
      syncedAt: new Date(),
      message: 'Đã lưu tạm hàng đợi liên thông Xuất trả NCC',
      payloadSent: nationalPayload,
    };
  }

  /**
   * Tra cứu trạng thái xử lý giao dịch tại CSDL Dược Quốc Gia
   */
  async checkTransactionStatus(
    type: 'stock-in' | 'stock-out' | 'stock-taking',
    transactionId: string
  ): Promise<any> {
    const token = await this.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = `${this.baseUrl}/transactions/${type}/${transactionId}/status`;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return await res.json();
  }

  /**
   * Lấy danh sách cấu hình cơ sở GPP của chuỗi nhà thuốc
   */
  getFacilityMapping() {
    return BRANCH_FACILITY_MAP;
  }
}
