import { Controller } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload, RpcException } from '@nestjs/microservices';
import { MedicineService } from './medicine.service';
import { RecommendationService } from './recommendation.service';

@Controller()
export class MedicineController {
  constructor(
    private readonly medicineService: MedicineService,
    private readonly recommendationService: RecommendationService,
  ) { }

  @MessagePattern('inventory.medicine.list')
  async listMedicines(@Payload() query: any) {
    try {
      return await this.medicineService.listMedicines(query);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách thuốc');
    }
  }

  @MessagePattern('inventory.medicine.create')
  async createMedicine(@Payload() data: any) {
    try {
      return await this.medicineService.createMedicine(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tạo dược phẩm');
    }
  }

  @MessagePattern('inventory.medicine.update')
  async updateMedicine(@Payload() data: { id: string; updateData: any }) {
    try {
      return await this.medicineService.updateMedicine(data.id, data.updateData);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi cập nhật dược phẩm');
    }
  }

  @MessagePattern('inventory.medicine.branch_list')
  async listBranchMedicines(@Payload() query: any) {
    try {
      if (!query?.branchId) {
        return await this.medicineService.listMedicines(query);
      }
      return await this.medicineService.getBranchMedicines(query);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách thuốc chi nhánh');
    }
  }

  @MessagePattern('inventory.medicine.get_by_id')
  async getMedicineById(@Payload() data: { id: string }) {
    try {
      return await this.medicineService.getMedicineById(data.id);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy chi tiết thuốc');
    }
  }

  @MessagePattern('inventory.medicine.update_status')
  async updateMedicineStatus(@Payload() data: { id: string; status: string; stock?: number }) {
    try {
      return await this.medicineService.updateMedicineStatus(data.id, data.status, data.stock);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi cập nhật trạng thái thuốc');
    }
  }

  @MessagePattern('inventory.medicine.update_price_tiers')
  async updateMedicinePriceTiers(@Payload() data: { id: string; priceTiers: { minQuantity: number; price: number }[] }) {
    try {
      return await this.medicineService.updateMedicinePriceTiers(data.id, data.priceTiers);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi cập nhật giá sỉ bậc thang');
    }
  }

  @MessagePattern('inventory.medicine.update_price')
  async updateMedicinePrice(@Payload() data: { id: string; price: number }) {
    try {
      return await this.medicineService.updateMedicinePrice(data.id, data.price);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi cập nhật giá thuốc');
    }
  }

  @MessagePattern('inventory.medicine.get_filters')
  async getMedicineFilters(@Payload() data?: any) {
    try {
      return await this.medicineService.getMedicineFilters();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy bộ lọc thuốc');
    }
  }

  @MessagePattern('inventory.medicine.stats')
  async getInventoryStats(@Payload() data?: { branchId?: string }) {
    try {
      return await this.medicineService.getInventoryStats(data?.branchId);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy thống kê tồn kho');
    }
  }

  @MessagePattern('inventory.medicine.expiration_report')
  async getExpirationReport(@Payload() data?: any) {
    try {
      return await this.medicineService.getExpirationReport();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy báo cáo hết hạn');
    }
  }

  @MessagePattern('inventory.medicine.handle_expiration_action')
  async handleExpirationAction(@Payload() data: any) {
    try {
      return await this.medicineService.handleExpirationAction(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi xử lý hành động hết hạn');
    }
  }

  @MessagePattern('inventory.medicine.get_by_ids')
  async getMedicinesByIds(@Payload() data: { ids: string[] }) {
    try {
      return await this.medicineService.getMedicinesByIds(data.ids);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy chi tiết danh sách thuốc');
    }
  }

  @MessagePattern('inventory.check.create')
  async createInventoryCheck(@Payload() data: any) {
    try {
      return await this.medicineService.createInventoryCheck(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tạo biên bản kiểm kê');
    }
  }

  @MessagePattern('inventory.check.list')
  async listInventoryChecks(@Payload() data?: any) {
    try {
      return await this.medicineService.listInventoryChecks();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách biên bản kiểm kê');
    }
  }

  @MessagePattern('inventory.check.get_by_id')
  async getInventoryCheckById(@Payload() data: { id: string }) {
    try {
      return await this.medicineService.getInventoryCheckById(data.id);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy chi tiết biên bản kiểm kê');
    }
  }

  @MessagePattern('inventory.check.complete')
  async completeInventoryCheck(@Payload() data: { id: string }) {
    try {
      return await this.medicineService.completeInventoryCheck(data.id);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi hoàn tất biên bản kiểm kê');
    }
  }

  @MessagePattern('inventory.medicine.low_stock_report')
  async getLowStockReport(@Payload() data?: any) {
    try {
      return await this.medicineService.getLowStockReport();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy báo cáo thuốc sắp hết hàng');
    }
  }

  @MessagePattern('inventory.medicine.dropdown_list')
  async getMedicinesDropdown(@Payload() data?: any) {
    try {
      return await this.medicineService.getMedicinesDropdown();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách chọn thuốc');
    }
  }

  @MessagePattern('inventory.medicine.get_alternatives')
  async getAlternatives(@Payload() data: { medicineId: string; branchId: string }) {
    try {
      return await this.medicineService.findAlternatives(data.medicineId, data.branchId);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tìm thuốc thay thế');
    }
  }

  @MessagePattern('inventory.medicine.safe_stock_chain')
  async getSafeStockChain(@Payload() query: any) {
    try {
      return await this.medicineService.getSafeStockChain(query);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy báo cáo tồn kho an toàn');
    }
  }

  @MessagePattern('inventory.medicine.detect_anomalies')
  async getAnomalyDetection(@Payload() query: any) {
    try {
      return await this.medicineService.getAnomalyDetection(query);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi phát hiện bất thường tồn kho');
    }
  }

  @MessagePattern('inventory.medicine.warehouse_map')
  async getWarehouseMap() {
    try {
      return await this.medicineService.getWarehouseMap();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy sơ đồ kho');
    }
  }

  @MessagePattern('inventory.medicine.shelf_detail')
  async getShelfDetail(@Payload() data: { zone: string; rack: string; shelf: number }) {
    try {
      return await this.medicineService.getShelfDetail(data.zone, data.rack, data.shelf);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy chi tiết kệ hàng');
    }
  }

  @MessagePattern('inventory.medicine.warehouse_search')
  async warehouseSearch(@Payload() data: { q: string }) {
    try {
      return await this.medicineService.warehouseSearch(data.q);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tìm kiếm thuốc trong kho');
    }
  }

  @MessagePattern('inventory.medicine.sync_locations')
  async syncLocations() {
    try {
      return await this.medicineService.syncLocations();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi đồng bộ vị trí kệ hàng');
    }
  }

  @MessagePattern('inventory.medicine.get_by_barcode')
  async getMedicineByBarcode(@Payload() data: { barcode: string; branchId?: string }): Promise<any> {
    try {
      return await this.medicineService.getByBarcode(data.barcode, data.branchId);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tra cứu mã vạch');
    }
  }

  @MessagePattern('inventory.medicine.generate_barcode')
  async generateBarcode(@Payload() data: { id: string }) {
    try {
      return await this.medicineService.generateBarcodeForMedicine(data.id);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi sinh mã vạch');
    }
  }

  // ============================================================
  // WAREHOUSE MAP - So do kho 4 cap: Khu -> Ke -> Tang -> Thung
  // ============================================================

  // GET /api/medicines/shelf-layout?zone=A&rack=A1
  @MessagePattern('inventory.medicine.shelf.layout')
  async getShelfLayout(@Payload() data: { zone: string; rack: string }) {
    try {
      return await this.medicineService.getShelfLayout(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Loi lay layout ke');
    }
  }

  // GET /api/medicines/reserve-batches?branchId=CENTRAL_WH
  @MessagePattern('inventory.medicine.reserve.list')
  async getReserveBatches(@Payload() data: { branchId?: string }) {
    try {
      return await this.medicineService.getReserveBatches(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Loi lay Khu Du Tru');
    }
  }

  // GET /api/medicines/bin-detail?zone=A&rack=A1&shelf=3&bin=2
  @MessagePattern('inventory.medicine.bin.detail')
  async getBinDetail(@Payload() data: { zone: string; rack: string; shelf: number; bin: number }) {
    try {
      return await this.medicineService.getBinDetail(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Loi lay chi tiet thung');
    }
  }

  // POST /api/medicines/assign-location (async event)
  @EventPattern('inventory.medicine.event.location_assign')
  async assignMedicineLocation(@Payload() data: string) {
    try {
      const payload = typeof data === 'string' ? JSON.parse(data) : data;
      await this.medicineService.assignMedicineLocation(payload);
    } catch (error) {
      console.error('[inventory.medicine.event.location_assign] Error:', error.message);
    }
  }

  // PATCH /api/medicines/batches/:batchId/quarantine (async event)
  @EventPattern('inventory.medicine.event.quarantine')
  async quarantineBatch(@Payload() data: string) {
    try {
      const payload = typeof data === 'string' ? JSON.parse(data) : data;
      await this.medicineService.quarantineBatch(payload);
    } catch (error) {
      console.error('[inventory.medicine.event.quarantine] Error:', error.message);
    }
  }

  // =========================================================================
  // PHARMA-SMART RECOMMENDATION & SEARCH HISTORY HANDLERS
  // =========================================================================
  @EventPattern('recommendation.event.search_log')
  async handleSearchLog(@Payload() data: any) {
    try {
      const payload = typeof data === 'string' ? JSON.parse(data) : data;
      await this.recommendationService.logSearch(payload);
    } catch (error: any) {
      // Event pattern: do not throw to avoid crashing event loop
      console.warn('⚠️ [Inventory MS] Error in handleSearchLog:', error.message);
    }
  }

  @EventPattern('recommendation.event.clear_searches')
  async handleClearSearches(@Payload() data: any) {
    try {
      const payload = typeof data === 'string' ? JSON.parse(data) : data;
      await this.recommendationService.clearRecentSearches(payload);
    } catch (error: any) {
      console.warn('⚠️ [Inventory MS] Error in handleClearSearches:', error.message);
    }
  }

  @MessagePattern('inventory.recommendation.for_you')
  async getRecommendationsForYou(@Payload() data: any) {
    try {
      const payload = typeof data === 'string' ? JSON.parse(data) : (data || {});
      return await this.recommendationService.getPersonalizedRecommendations(payload);
    } catch (error: any) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi sinh gợi ý cá nhân hóa');
    }
  }

  @MessagePattern('inventory.recommendation.recent_searches')
  async getRecentSearches(@Payload() data: any) {
    try {
      const payload = typeof data === 'string' ? JSON.parse(data) : (data || {});
      return await this.recommendationService.getRecentSearches(payload);
    } catch (error: any) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy lịch sử tìm kiếm');
    }
  }
}


