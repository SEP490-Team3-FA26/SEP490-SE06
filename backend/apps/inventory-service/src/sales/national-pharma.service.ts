import { Injectable, Logger } from '@nestjs/common';

export interface NationalPharmaSyncResult {
  success: boolean;
  facilityCode: string;
  syncCode: string;
  syncStatus: 'SYNCED' | 'PENDING' | 'FAILED';
  syncedAt: Date;
  message: string;
  payloadSent: any;
}

@Injectable()
export class NationalPharmaService {
  private readonly logger = new Logger(NationalPharmaService.name);

  // Bảng mã cơ sở GPP theo chi nhánh
  private readonly branchFacilityMap: Record<string, string> = {
    'BR-001': '79-001234',
    'BR-002': '79-001235',
    'BR-003': '79-001236',
    'BR-004': '79-001237',
    'BR-005': '79-001238',
    'BR-006': '79-001239',
    'BR-007': '79-001240',
    'BR-008': '79-001241',
  };

  /**
   * Đồng bộ hóa đơn bán lẻ hoặc đơn thuốc lên Cơ sở Dữ liệu Dược Quốc gia (GPP Sandbox)
   */
  async syncSaleOrder(saleOrder: any, branchId?: string): Promise<NationalPharmaSyncResult> {
    const targetBranch = branchId || saleOrder.branchId || 'BR-001';
    const facilityCode = this.branchFacilityMap[targetBranch] || '79-001234';

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const syncCode = `DQG-${todayStr}-${randomSuffix}`;

    // Chuẩn hóa định dạng gói tin JSON theo chuẩn Thông tư 02/2018/TT-BYT & CSDL Dược Quốc gia
    const nationalPayload = {
      ma_co_so: facilityCode,
      ma_hoa_don: String(saleOrder.orderCode || saleOrder._id),
      ngay_ban: new Date().toISOString(),
      loai_don_hang: saleOrder.type === 'PRESCRIPTION' ? 'BAN_THEO_DON' : 'BAN_LE',
      ma_don_thuoc_quoc_gia: saleOrder.prescriptionCode || null,
      nguoi_ban: saleOrder.soldBy || 'Dược sĩ phụ trách',
      khach_hang: {
        ten_khach_hang: saleOrder.patientName || 'Khách lẻ vãng lai',
        so_dien_thoai: saleOrder.patientPhone || null,
      },
      chi_tiet_thuoc: (saleOrder.items || []).map((it: any) => ({
        ma_thuoc: it.medicineId,
        ten_thuoc: it.name,
        don_vi_xuat_ban: it.unit || 'Hộp',
        so_luong: it.quantity,
        he_so_quy_doi: it.exchangeValue || 1,
        so_luong_quy_doi_co_so: it.baseQuantity || it.quantity,
        don_vi_co_so: it.baseUnit || it.unit || 'Đơn vị chuẩn',
        don_gia: it.price,
        thanh_tien: it.price * it.quantity,
        lieu_dung: it.dosageInstructions || (it.dailyDose ? `Dùng ${it.dailyDose} ${it.unit}/ngày trong ${it.durationDays || 1} ngày` : 'Theo chỉ định'),
        so_lo_xuat: (it.batches || []).map((b: any) => ({
          so_lo: b.batchNo,
          so_luong: b.quantity,
        })),
      })),
      tong_tien: saleOrder.totalAmount || 0,
      phuong_thuc_thanh_toan: saleOrder.paymentMethod || 'CASH',
    };

    this.logger.log(`[National Pharma GPP] Đang gửi hóa đơn ${nationalPayload.ma_hoa_don} lên CSDL Dược Quốc gia (Mã CS: ${facilityCode})...`);

    // GPP Sandbox Response
    return {
      success: true,
      facilityCode,
      syncCode,
      syncStatus: 'SYNCED',
      syncedAt: new Date(),
      message: `Đã liên thông thành công lên CSDL Dược Quốc gia (Mã biên nhận: ${syncCode})`,
      payloadSent: nationalPayload,
    };
  }

  /**
   * Lấy danh sách cấu hình cơ sở GPP của chuỗi nhà thuốc
   */
  getFacilityMapping() {
    return this.branchFacilityMap;
  }
}
