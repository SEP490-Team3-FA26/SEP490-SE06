import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, isValidObjectId } from 'mongoose';
import * as crypto from 'crypto';
import { DispatchOrder } from './schemas/dispatch-order.schema';
import { Tote } from './schemas/tote.schema';
import { ProcessedRequest } from './schemas/processed-request.schema';
import { Medicine } from '../medicine/schemas/medicine.schema';
import { MedicineBatch } from '../medicine/schemas/medicine-batch.schema';
import { MedicineLocation } from '../medicine/schemas/medicine-location.schema';
import { InventoryTransaction } from '../purchase/schemas/inventory-transaction.schema';
import { PurchaseRequisition } from '../purchase/schemas/purchase-requisition.schema';
import { StockTransfer } from '../purchase/schemas/stock-transfer.schema';
import { NationalPharmaService } from '../national-pharma/national-pharma.service';

export interface ActorContext {
  userId: string;
  fullName?: string;
  role: string;
  isBranchPIC?: boolean;
}

const VALID_OVERRIDE_REASONS = ['Hàng hỏng bao bì', 'Lô thực tế không đủ', 'Khác'];
const VALID_MANUAL_GS1_REASONS = [
  'BARCODE_DAMAGED',
  'NO_DATAMATRIX_ON_PACK',
  'SCANNER_FAILURE',
];
const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 giờ không thao tác khi đang PICKING

/**
 * Service lõi xử lý toàn bộ nghiệp vụ Xuất Kho Tổng hai giai đoạn:
 * Lập phiếu -> Phê duyệt 2 người -> Nhặt hàng giữ chỗ (reservedQty) -> Tập kết Tote -> Xác nhận xuất trừ kho thật.
 */
@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    @InjectModel(DispatchOrder.name) private readonly dispatchOrderModel: Model<DispatchOrder>,
    @InjectModel(Tote.name) private readonly toteModel: Model<Tote>,
    @InjectModel(ProcessedRequest.name) private readonly processedReqModel: Model<ProcessedRequest>,
    @InjectModel(Medicine.name) private readonly medicineModel: Model<Medicine>,
    @InjectModel(MedicineBatch.name) private readonly batchModel: Model<MedicineBatch>,
    @InjectModel(MedicineLocation.name) private readonly locationModel: Model<MedicineLocation>,
    @InjectModel(InventoryTransaction.name) private readonly txnModel: Model<InventoryTransaction>,
    @InjectModel(PurchaseRequisition.name) private readonly prModel: Model<PurchaseRequisition>,
    @InjectModel(StockTransfer.name) private readonly transferModel: Model<StockTransfer>,
    @Optional() private readonly nationalPharmaService?: NationalPharmaService,
    @Optional() @Inject('KAFKA_CLIENT') private readonly kafkaClient?: ClientKafka,
  ) {}

  /**
   * Chuẩn hóa mã khay thành chuỗi QR chuẩn BIN-{zone}-{rack}-S{shelf}-B{bin}
   */
  public formatBinCode(loc?: {
    zone?: string;
    rack?: string;
    shelf?: number;
    bin?: number;
  }): string {
    const zone = String(loc?.zone || 'A').trim().toUpperCase();
    const rack = String(loc?.rack || 'A1').trim().toUpperCase();
    const shelf = Number(loc?.shelf || 1);
    const bin = Number(loc?.bin || 1);
    return `BIN-${zone}-${rack}-S${shelf}-B${bin}`;
  }

  /**
   * Tính tồn khả dụng thực tế của lô: stock - reservedQty (chống undefined/null)
   */
  public getBatchAvailable(batch: { stock?: number; reservedQty?: number }): number {
    return Math.max(0, Number(batch?.stock || 0) - Math.max(0, Number(batch?.reservedQty || 0)));
  }

  /**
   * Phát sự kiện Kafka an toàn sang API Gateway (Socket.IO / Broadcast) mà không làm vỡ transaction
   */
  private emitKafkaNotification(topic: string, payload: Record<string, any>): void {
    if (!this.kafkaClient) return;
    try {
      this.kafkaClient.emit(topic, payload);
    } catch (err: any) {
      this.logger.warn(`[DispatchService] Không thể phát Kafka event ${topic}: ${err?.message}`);
    }
  }

  /**
   * Phát thông báo lỗi thao tác async (HTTP 202) về phòng user-{userId} để Mobile hoàn tác Optimistic UI
   */
  public notifyAsyncActionFailure(userId: string | undefined, action: string, dispatchOrderId: string, reason: string): void {
    if (!userId) return;
    this.emitKafkaNotification('notification.dispatch_error', {
      userId,
      action,
      dispatchOrderId,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Sinh mã phiếu tuần tự trong ngày theo mẫu tiền tố-YYYYMMDD-XXXX
   */
  private async generateDailyCode(
    model: Model<any>,
    prefix: 'DO' | 'ST' | 'PR',
    session?: ClientSession,
  ): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const query = model.countDocuments({
      createdAt: { $gte: startOfDay, $lt: endOfDay },
    });
    if (session) query.session(session);
    const count = await query.exec();
    const suffix = String(count + 1).padStart(4, '0');
    const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `${prefix}-${dateStr}-${suffix}-${rand}`;
  }

  /**
   * Đồng bộ lại tổng tồn kho trên document Medicine sau khi trừ/hỏng hàng
   */
  private async syncMedicineTotalStock(medicineId: string, session?: ClientSession): Promise<void> {
    const q = this.batchModel.find({
      medicineId,
      status: 'ACTIVE',
      stock: { $gt: 0 },
    });
    if (session) q.session(session);
    const activeBatches = await q.lean().exec();
    const totalStock = Math.max(
      0,
      activeBatches.reduce((sum, b) => sum + Number(b.stock || 0), 0),
    );
    await this.medicineModel
      .updateOne(
        { _id: medicineId },
        {
          $set: {
            stock: totalStock,
            status: totalStock > 0 ? 'In Stock' : 'Out of Stock',
          },
        },
      )
      .session(session || null)
      .exec();
  }

  /**
   * Đồng bộ trạng thái ô khay (EMPTY / OCCUPIED) trong MedicineLocation sau khi trừ kho thật
   */
  private async syncBinLocationsStatus(
    bins: Array<{ zone: string; rack: string; shelf: number; bin: number; slotType?: string }>,
    session?: ClientSession,
  ): Promise<void> {
    const seen = new Set<string>();
    for (const loc of bins) {
      if (loc.slotType === 'RESERVE') continue;
      const key = `${loc.zone}:${loc.rack}:${loc.shelf}:${loc.bin}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const q = this.batchModel.find({
        branchId: 'CENTRAL_WH',
        'location.zone': loc.zone,
        'location.rack': loc.rack,
        'location.shelf': Number(loc.shelf),
        'location.bin': Number(loc.bin),
        'location.slotType': 'MAIN',
        status: { $nin: ['REMOVED', 'DELETED'] },
        stock: { $gt: 0 },
      });
      if (session) q.session(session);
      const remainingBatches = await q.lean().exec();
      const totalStock = remainingBatches.reduce((sum, b) => sum + Number(b.stock || 0), 0);
      const nextStatus = totalStock > 0 ? 'OCCUPIED' : 'EMPTY';

      await this.locationModel
        .updateOne(
          {
            zone: loc.zone,
            rack: loc.rack,
            shelf: Number(loc.shelf),
            bin: Number(loc.bin),
          },
          { $set: { binStatus: nextStatus } },
        )
        .session(session || null)
        .exec();
    }
  }

  /**
   * Kiểm tra và lưu khóa Idempotency nhằm ngăn Kafka retry / bấm đúp tạo dữ liệu trùng lặp
   */
  private async checkIdempotency(idempotencyKey?: string): Promise<Record<string, any> | null> {
    if (!idempotencyKey || !String(idempotencyKey).trim()) return null;
    const existing = await this.processedReqModel
      .findOne({ idempotencyKey: String(idempotencyKey).trim() })
      .lean()
      .exec();
    return existing?.responseSnapshot || null;
  }

  private async saveIdempotency(
    idempotencyKey: string | undefined,
    action: string,
    dispatchOrderId: string,
    responseSnapshot: Record<string, any>,
    session?: ClientSession,
  ): Promise<void> {
    if (!idempotencyKey || !String(idempotencyKey).trim()) return;
    await this.processedReqModel.create(
      [
        {
          idempotencyKey: String(idempotencyKey).trim(),
          action,
          dispatchOrderId,
          responseSnapshot,
          processedAt: new Date(),
        },
      ],
      session ? { session } : undefined,
    );
  }

  // =========================================================================
  // 1. TẠO PHIẾU XUẤT KHO & LẬP PICKING LIST THEO FEFO
  // =========================================================================
  async createDispatchOrder(data: {
    type: 'TRANSFER' | 'DISPOSE';
    referenceId?: string;
    toBranchId?: string;
    toBranchName?: string;
    disposalReportCode?: string;
    items?: Array<{
      medicineId: string;
      quantity: number;
      batchId?: string;
      batchNo?: string;
    }>;
    notes?: string;
    actor: ActorContext;
  }) {
    if (!data?.actor?.userId) {
      throw new RpcException({ statusCode: 401, message: 'Thiếu thông tin người lập phiếu xuất kho.' });
    }
    if (!['TRANSFER', 'DISPOSE'].includes(data.type)) {
      throw new RpcException({ statusCode: 400, message: 'Loại phiếu xuất chỉ chấp nhận TRANSFER hoặc DISPOSE.' });
    }
    if (data.type === 'DISPOSE' && !String(data.disposalReportCode || '').trim()) {
      throw new RpcException({
        statusCode: 400,
        message: 'Phiếu xuất hủy (DISPOSE) bắt buộc phải có Mã biên bản tiêu hủy (disposalReportCode).',
      });
    }

    let targetBranchId = data.toBranchId;
    let targetBranchName = data.toBranchName;
    let referenceCode: string | undefined;
    let requestedItems = data.items || [];

    // Nếu lập phiếu từ Purchase Requisition của chi nhánh
    if (data.type === 'TRANSFER' && data.referenceId) {
      const pr = await this.prModel.findById(data.referenceId).exec();
      if (!pr) {
        throw new RpcException({ statusCode: 404, message: `Không tìm thấy yêu cầu nhập hàng (PR): ${data.referenceId}` });
      }
      if (['SHIPPING', 'COMPLETED', 'REJECTED', 'CANCELLED', 'DISPATCH_PENDING'].includes(pr.status)) {
        throw new RpcException({
          statusCode: 409,
          message: `Yêu cầu nhập hàng ${pr.prCode} đang ở trạng thái "${pr.status}", không thể lập phiếu xuất.`,
        });
      }

      // Chống tạo trùng phiếu xuất còn đang hoạt động cho cùng 1 PR
      const existingActive = await this.dispatchOrderModel
        .findOne({
          referenceId: pr._id.toString(),
          status: { $in: ['PENDING_APPROVAL', 'APPROVED', 'PICKING', 'STAGED'] },
        })
        .lean()
        .exec();
      if (existingActive) {
        throw new RpcException({
          statusCode: 409,
          message: `Yêu cầu ${pr.prCode} đã có phiếu xuất ${existingActive.dispatchCode} đang xử lý (${existingActive.status}).`,
        });
      }

      targetBranchId = pr.branchId;
      targetBranchName = pr.branchName;
      referenceCode = pr.prCode;
      if (requestedItems.length === 0) {
        requestedItems = pr.items.map((it: any) => ({
          medicineId: String(it.medicineId),
          quantity: Number(it.requestedQuantity),
        }));
      }
    }

    if (!requestedItems || requestedItems.length === 0) {
      throw new RpcException({ statusCode: 400, message: 'Danh sách thuốc cần xuất không được để trống.' });
    }
    if (data.type === 'TRANSFER' && !targetBranchId) {
      throw new RpcException({ statusCode: 400, message: 'Phiếu chuyển kho bắt buộc phải có chi nhánh nhận.' });
    }

    const now = new Date();
    const pickingList: any[] = [];
    let hasControlledDrugs = false;

    for (const item of requestedItems) {
      const reqQty = Number(item.quantity);
      if (!Number.isInteger(reqQty) || reqQty <= 0) {
        throw new RpcException({ statusCode: 400, message: 'Số lượng yêu cầu của mỗi dòng phải là số nguyên dương.' });
      }

      const medicine = isValidObjectId(item.medicineId)
        ? await this.medicineModel.findById(item.medicineId).lean().exec()
        : null;
      if (!medicine) {
        throw new RpcException({ statusCode: 404, message: `Không tìm thấy thuốc với ID ${item.medicineId}` });
      }

      const specialControlType = Number((medicine as any).special_control_type || 0);
      if (specialControlType > 0) {
        hasControlledDrugs = true;
      }

      // Truy vấn danh sách lô hợp lệ tại Kho Tổng (CENTRAL_WH) theo loại phiếu
      const batchFilter: any = {
        medicineId: medicine._id.toString(),
        branchId: 'CENTRAL_WH',
        stock: { $gt: 0 },
      };

      if (data.type === 'TRANSFER') {
        batchFilter.status = 'ACTIVE';
        batchFilter.expDate = { $gt: now }; // Chặn lô đã quá hạn dù status chưa kịp cập nhật
      } else {
        // Phiếu DISPOSE chỉ chọn được lô hết hạn hoặc đang biệt trữ
        batchFilter.$or = [
          { status: { $in: ['EXPIRED', 'QUARANTINED'] } },
          { expDate: { $lte: now } },
        ];
        if (item.batchId && isValidObjectId(item.batchId)) {
          batchFilter._id = item.batchId;
        } else if (item.batchNo) {
          batchFilter.batchNo = item.batchNo;
        }
      }

      const sortRule: any = data.type === 'TRANSFER' ? { expDate: 1, createdAt: 1 } : { expDate: 1 };
      const candidateBatches = await this.batchModel.find(batchFilter).sort(sortRule).lean().exec();

      // Lọc các lô còn khả dụng > 0 theo công thức available = stock - reservedQty
      const availableBatches = candidateBatches
        .map((b) => ({ ...b, available: this.getBatchAvailable(b) }))
        .filter((b) => b.available > 0);

      const totalAvailable = availableBatches.reduce((sum, b) => sum + b.available, 0);
      if (totalAvailable < reqQty) {
        throw new RpcException({
          statusCode: 400,
          message:
            data.type === 'TRANSFER'
              ? `Kho Tổng không đủ tồn khả dụng cho "${medicine.name}" (Yêu cầu: ${reqQty}, Khả dụng: ${totalAvailable}). Vui lòng lập đơn đặt hàng NCC (PO).`
              : `Không đủ tồn lô hết hạn/biệt trữ để hủy cho "${medicine.name}" (Yêu cầu: ${reqQty}, Khả dụng: ${totalAvailable}).`,
        });
      }

      // Tách dòng Picking List theo từng lô/khay theo FEFO
      let remaining = reqQty;
      for (const batch of availableBatches) {
        if (remaining <= 0) break;
        const allocateQty = Math.min(batch.available, remaining);
        const loc = batch.location || { zone: 'A', rack: 'A1', shelf: 1, bin: 1, slotType: 'MAIN' };

        pickingList.push({
          lineId: crypto.randomUUID(),
          medicineId: medicine._id.toString(),
          medicineName: medicine.name,
          unit: medicine.unit || 'Hộp',
          medicineBarcode: (medicine as any).barcode || (medicine as any).sku || '',
          specialControlType,
          batchId: batch._id.toString(),
          batchNo: batch.batchNo,
          expDate: batch.expDate,
          suggestedLocation: {
            zone: loc.zone || 'A',
            rack: loc.rack || 'A1',
            shelf: Number(loc.shelf || 1),
            bin: Number(loc.bin || 1),
            slotType: loc.slotType || 'MAIN',
            binCode: this.formatBinCode(loc),
          },
          requestedQty: allocateQty,
          pickedQty: 0,
          itemStatus: 'PENDING',
        });

        remaining -= allocateQty;
      }
    }

    // Sắp xếp lộ trình nhặt tối ưu theo tọa độ vật lý Zone -> Rack -> Shelf -> Bin -> HSD
    pickingList.sort((a, b) => {
      const z = a.suggestedLocation.zone.localeCompare(b.suggestedLocation.zone);
      if (z !== 0) return z;
      const r = a.suggestedLocation.rack.localeCompare(b.suggestedLocation.rack);
      if (r !== 0) return r;
      if (a.suggestedLocation.shelf !== b.suggestedLocation.shelf) {
        return a.suggestedLocation.shelf - b.suggestedLocation.shelf;
      }
      if (a.suggestedLocation.bin !== b.suggestedLocation.bin) {
        return a.suggestedLocation.bin - b.suggestedLocation.bin;
      }
      return new Date(a.expDate).getTime() - new Date(b.expDate).getTime();
    });

    const dispatchCode = await this.generateDailyCode(this.dispatchOrderModel, 'DO');
    const newOrder = await this.dispatchOrderModel.create({
      dispatchCode,
      type: data.type,
      status: 'PENDING_APPROVAL', // Mọi phiếu xuất 100% đều qua bước duyệt trước khi nhặt
      fromBranchId: 'CENTRAL_WH',
      referenceId: data.referenceId,
      referenceCode,
      toBranchId: targetBranchId,
      toBranchName: targetBranchName,
      disposalReportCode: data.disposalReportCode?.trim(),
      hasControlledDrugs,
      createdBy: data.actor.userId,
      createdByName: data.actor.fullName || 'Thủ kho',
      pickingList,
      picks: [],
      returnLogs: [],
      toteCodes: [],
      totalPicked: 0,
      isStale: false,
      notes: data.notes || '',
      version: 0,
    });

    const orderObj = newOrder.toObject();
    // Chuyển PR sang trạng thái DISPATCH_PENDING để tránh lập trùng và phản ánh ngay trên tab PR
    if (data.type === 'TRANSFER' && data.referenceId && isValidObjectId(data.referenceId)) {
      await this.prModel
        .updateOne(
          {
            _id: data.referenceId,
            status: { $in: ['SUBMITTED', 'CONSOLIDATED', 'OUT_OF_STOCK'] },
          },
          { $set: { status: 'DISPATCH_PENDING' } },
        )
        .exec();
      this.emitKafkaNotification('broadcast.inventory_updated', {
        event: 'PR_DISPATCH_PENDING',
        prId: data.referenceId,
        dispatchOrderId: orderObj._id.toString(),
        dispatchCode: orderObj.dispatchCode,
      });
    }

    this.emitKafkaNotification('notification.dispatch_created', {
      dispatchOrderId: orderObj._id.toString(),
      dispatchCode: orderObj.dispatchCode,
      type: orderObj.type,
      hasControlledDrugs: orderObj.hasControlledDrugs,
      toBranchId: orderObj.toBranchId,
      toBranchName: orderObj.toBranchName,
      createdBy: orderObj.createdBy,
      createdByName: orderObj.createdByName,
      itemsCount: pickingList.length,
    });

    return {
      success: true,
      message: `Đã lập phiếu xuất ${dispatchCode} và gửi chờ phê duyệt.`,
      data: orderObj,
    };
  }

  // =========================================================================
  // 2. ĐỌC DANH SÁCH & CHI TIẾT PHIẾU XUẤT
  // =========================================================================
  async listDispatchOrders(filter?: {
    status?: string;
    type?: string;
    isStale?: boolean | string;
    hasControlledDrugs?: boolean | string;
    toBranchId?: string;
    search?: string;
  }) {
    const query: any = {};
    if (filter?.status && filter.status !== 'ALL') {
      if (filter.status.includes(',')) {
        query.status = { $in: filter.status.split(',').map((s) => s.trim()) };
      } else {
        query.status = filter.status;
      }
    }
    if (filter?.type && filter.type !== 'ALL') {
      query.type = filter.type;
    }
    if (filter?.isStale !== undefined && filter.isStale !== '') {
      query.isStale = filter.isStale === true || filter.isStale === 'true';
    }
    if (filter?.hasControlledDrugs !== undefined && filter.hasControlledDrugs !== '') {
      query.hasControlledDrugs =
        filter.hasControlledDrugs === true || filter.hasControlledDrugs === 'true';
    }
    if (filter?.toBranchId) {
      query.toBranchId = filter.toBranchId;
    }
    if (filter?.search && filter.search.trim()) {
      const regex = new RegExp(filter.search.trim(), 'i');
      query.$or = [
        { dispatchCode: regex },
        { referenceCode: regex },
        { toBranchName: regex },
        { 'pickingList.medicineName': regex },
      ];
    }

    const list = await this.dispatchOrderModel.find(query).sort({ createdAt: -1 }).lean().exec();
    return { success: true, data: list };
  }

  async getDispatchOrderById(id: string) {
    const query = isValidObjectId(id) ? { _id: id } : { dispatchCode: id };
    const order = await this.dispatchOrderModel.findOne(query).lean().exec();
    if (!order) {
      throw new RpcException({ statusCode: 404, message: `Không tìm thấy phiếu xuất kho ${id}` });
    }
    return { success: true, data: order };
  }

  // =========================================================================
  // 3. PHÊ DUYỆT / TỪ CHỐI PHIẾU XUẤT KHO (KIỂM SOÁT HAI NGƯỜI)
  // =========================================================================
  private assertApproverAuthorized(order: DispatchOrder, actor: ActorContext): void {
    if (!actor?.userId) {
      throw new RpcException({ statusCode: 401, message: 'Thiếu thông tin người phê duyệt.' });
    }
    // Quy tắc kiểm soát 2 người: Người duyệt phải khác người lập phiếu
    if (String(actor.userId) === String(order.createdBy)) {
      throw new RpcException({
        statusCode: 403,
        message: 'Vi phạm kiểm soát hai người: Người lập phiếu không được tự phê duyệt hoặc từ chối phiếu của chính mình.',
      });
    }

    const normalizedRole = String(actor.role || '').toLowerCase();
    const isDirector = ['director', 'head_branch'].includes(normalizedRole);
    const isPicPharmacist = normalizedRole === 'pharmacist' && Boolean(actor.isBranchPIC);

    if (order.hasControlledDrugs) {
      if (!isPicPharmacist) {
        throw new RpcException({
          statusCode: 403,
          message: 'Phiếu có thuốc kiểm soát đặc biệt chỉ do Dược sĩ phụ trách chuyên môn (PIC) phê duyệt.',
        });
      }
      return;
    }

    if (order.type === 'DISPOSE') {
      if (!isPicPharmacist && !isDirector) {
        throw new RpcException({
          statusCode: 403,
          message: 'Phiếu xuất hủy phải do Dược sĩ PIC hoặc Giám đốc phê duyệt.',
        });
      }
      return;
    }

    // Thuốc thông thường: Giám đốc (director / head_branch) duyệt theo phương án đã chốt
    if (!isDirector) {
      throw new RpcException({
        statusCode: 403,
        message: 'Phiếu xuất chuyển kho thuốc thông thường cần Giám đốc (director) phê duyệt.',
      });
    }
  }

  async approveDispatchOrder(data: { id: string; note?: string; actor: ActorContext }) {
    const order = await this.dispatchOrderModel.findById(data.id).exec();
    if (!order) {
      throw new RpcException({ statusCode: 404, message: `Không tìm thấy phiếu xuất kho ${data.id}` });
    }
    if (order.status !== 'PENDING_APPROVAL') {
      throw new RpcException({
        statusCode: 409,
        message: `Phiếu ${order.dispatchCode} đang ở trạng thái "${order.status}", không thể duyệt.`,
      });
    }

    this.assertApproverAuthorized(order, data.actor);

    order.status = 'APPROVED';
    order.approvedBy = data.actor.userId;
    order.approvedByName = data.actor.fullName || data.actor.role;
    order.approvedByRole = data.actor.role;
    order.approvedAt = new Date();
    order.approvalNote = data.note || '';
    order.version += 1;
    await order.save();

    const updatedObj = order.toObject();
    this.emitKafkaNotification('notification.dispatch_approved', {
      dispatchOrderId: updatedObj._id.toString(),
      dispatchCode: updatedObj.dispatchCode,
      approvedBy: updatedObj.approvedBy,
      approvedByName: updatedObj.approvedByName,
      createdBy: updatedObj.createdBy,
    });

    return {
      success: true,
      message: `Đã phê duyệt phiếu xuất ${updatedObj.dispatchCode}. Thủ kho có thể tiến hành nhặt hàng.`,
      data: updatedObj,
    };
  }

  /**
   * Trả trạng thái PR từ DISPATCH_PENDING về SUBMITTED nếu phiếu xuất bị hủy/từ chối và không còn phiếu hoạt động khác
   */
  private async restorePrToSubmittedIfUnlinked(order: DispatchOrder): Promise<void> {
    if (order.type !== 'TRANSFER' || !order.referenceId || !isValidObjectId(order.referenceId)) {
      return;
    }
    const otherActive = await this.dispatchOrderModel
      .findOne({
        _id: { $ne: order._id },
        referenceId: order.referenceId,
        status: { $in: ['PENDING_APPROVAL', 'APPROVED', 'PICKING', 'STAGED'] },
      })
      .lean()
      .exec();
    if (!otherActive) {
      await this.prModel
        .updateOne(
          { _id: order.referenceId, status: 'DISPATCH_PENDING' },
          { $set: { status: 'SUBMITTED' } },
        )
        .exec();
    }
  }

  async rejectDispatchOrder(data: { id: string; reason: string; actor: ActorContext }) {
    if (!String(data.reason || '').trim()) {
      throw new RpcException({ statusCode: 400, message: 'Bắt buộc phải nhập lý do khi từ chối phiếu xuất kho.' });
    }

    const order = await this.dispatchOrderModel.findById(data.id).exec();
    if (!order) {
      throw new RpcException({ statusCode: 404, message: `Không tìm thấy phiếu xuất kho ${data.id}` });
    }
    if (order.status !== 'PENDING_APPROVAL') {
      throw new RpcException({
        statusCode: 409,
        message: `Chỉ có thể từ chối phiếu đang ở trạng thái PENDING_APPROVAL.`,
      });
    }

    this.assertApproverAuthorized(order, data.actor);

    order.status = 'CANCELLED';
    order.rejectedBy = data.actor.userId;
    order.rejectedByName = data.actor.fullName || data.actor.role;
    order.rejectedAt = new Date();
    order.rejectedReason = data.reason.trim();
    order.version += 1;
    await order.save();

    await this.restorePrToSubmittedIfUnlinked(order);

    const updatedObj = order.toObject();
    this.emitKafkaNotification('notification.dispatch_rejected', {
      dispatchOrderId: updatedObj._id.toString(),
      dispatchCode: updatedObj.dispatchCode,
      rejectedByName: updatedObj.rejectedByName,
      reason: updatedObj.rejectedReason,
    });

    return {
      success: true,
      message: `Đã từ chối phiếu xuất ${updatedObj.dispatchCode}.`,
      data: updatedObj,
    };
  }

  // =========================================================================
  // 4. NHẶT HÀNG GIỮ CHỖ (GIAI ĐOẠN 1: TĂNG reservedQty TRONG TRANSACTION)
  // =========================================================================
  async pickItem(data: {
    dispatchOrderId: string;
    lineId: string;
    scannedBinCode: string;
    toteCode: string;
    quantity: number;
    actualBatchId?: string;
    overrideReason?: string;
    gs1Scanned?: boolean;
    manualReason?: string;
    rawBarcodeScanned?: string;
    expectedVersion?: number;
    idempotencyKey?: string;
    actor: ActorContext;
  }) {
    // 1. Chống xử lý trùng lặp Kafka / bấm đúp
    const cachedResult = await this.checkIdempotency(
      data.idempotencyKey ? `PICK_ITEM:${data.dispatchOrderId}:${data.idempotencyKey}` : undefined,
    );
    if (cachedResult) return cachedResult;

    const qty = Number(data.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new RpcException({ statusCode: 400, message: 'Số lượng nhặt phải là số nguyên dương.' });
    }
    if (!String(data.toteCode || '').trim()) {
      throw new RpcException({ statusCode: 400, message: 'Bắt buộc phải quét hoặc chọn mã giỏ gom hàng (Tote).' });
    }
    if (!String(data.scannedBinCode || '').trim()) {
      throw new RpcException({ statusCode: 400, message: 'Bắt buộc phải quét mã QR khay kệ trước khi nhặt.' });
    }

    const gs1Scanned = data.gs1Scanned !== false;
    if (!gs1Scanned && !VALID_MANUAL_GS1_REASONS.includes(String(data.manualReason || ''))) {
      throw new RpcException({
        statusCode: 400,
        message: 'Khi nhập tay số lô/HSD bắt buộc chọn lý do hợp lệ (BARCODE_DAMAGED, NO_DATAMATRIX_ON_PACK, SCANNER_FAILURE).',
      });
    }

    const session = await this.batchModel.db.startSession();
    try {
      let responseSnapshot: any;

      await session.withTransaction(async () => {
        const order = await this.dispatchOrderModel
          .findById(data.dispatchOrderId)
          .session(session)
          .exec();
        if (!order) {
          throw new RpcException({ statusCode: 404, message: 'Không tìm thấy phiếu xuất kho.' });
        }
        if (!['APPROVED', 'PICKING'].includes(order.status)) {
          throw new RpcException({
            statusCode: 409,
            message: `Phiếu đang ở trạng thái "${order.status}", không thể nhặt hàng.`,
          });
        }
        if (data.expectedVersion !== undefined && order.version !== Number(data.expectedVersion)) {
          throw new RpcException({
            statusCode: 409,
            message: 'Dữ liệu phiếu vừa được cập nhật bởi thao tác khác. Vui lòng tải lại.',
          });
        }

        const line = order.pickingList.find((l: any) => l.lineId === data.lineId);
        if (!line) {
          throw new RpcException({ statusCode: 404, message: 'Không tìm thấy dòng thuốc trên Picking List.' });
        }
        if (line.itemStatus === 'SHORTAGE') {
          throw new RpcException({ statusCode: 409, message: 'Dòng hàng này đã chốt báo thiếu (SHORTAGE).' });
        }

        const remainingNeed = line.requestedQty - line.pickedQty;
        if (qty > remainingNeed) {
          throw new RpcException({
            statusCode: 400,
            message: `Số lượng nhặt (${qty}) vượt quá phần còn thiếu của dòng (${remainingNeed}).`,
          });
        }

        // Chiếm hoặc xác thực giỏ Tote thuộc phiếu này
        const normalizedToteCode = data.toteCode.trim().toUpperCase();
        const tote = await this.toteModel
          .findOne({ toteCode: normalizedToteCode })
          .session(session)
          .exec();
        if (!tote) {
          throw new RpcException({ statusCode: 404, message: `Không tìm thấy giỏ gom hàng ${normalizedToteCode}.` });
        }
        if (tote.status === 'IN_USE' && tote.currentDispatchOrderId !== order._id.toString()) {
          throw new RpcException({
            statusCode: 409,
            message: `Giỏ ${normalizedToteCode} đang bị chiếm cho phiếu ${tote.currentDispatchCode || tote.currentDispatchOrderId}.`,
          });
        }
        if (tote.status === 'AVAILABLE') {
          tote.status = 'IN_USE';
          tote.currentDispatchOrderId = order._id.toString();
          tote.currentDispatchCode = order.dispatchCode;
          tote.lockedBy = data.actor.userId;
          tote.lockedAt = new Date();
          await tote.save({ session });
        }

        // Xác định lô thực tế được nhặt (gợi ý FEFO hoặc override)
        const targetBatchId = data.actualBatchId || line.batchId;
        const isOverride = String(targetBatchId) !== String(line.batchId);
        if (isOverride && !VALID_OVERRIDE_REASONS.includes(String(data.overrideReason || ''))) {
          throw new RpcException({
            statusCode: 400,
            message: 'Đổi lô khác với gợi ý FEFO bắt buộc phải chọn lý do hợp lệ.',
          });
        }

        const batch = await this.batchModel.findById(targetBatchId).session(session).exec();
        if (!batch || String(batch.medicineId) !== String(line.medicineId)) {
          throw new RpcException({ statusCode: 400, message: 'Lô thuốc không khớp với mặt hàng cần nhặt.' });
        }

        // Đối chiếu mã QR khay: phải khớp tọa độ khay của lô đang lấy
        const expectedBinCode = this.formatBinCode(batch.location);
        const scannedBinUpper = data.scannedBinCode.trim().toUpperCase();
        if (scannedBinUpper !== expectedBinCode && scannedBinUpper !== line.suggestedLocation.binCode) {
          throw new RpcException({
            statusCode: 400,
            message: `Quét sai khay! Hệ thống yêu cầu khay ${expectedBinCode} nhưng đã quét ${scannedBinUpper}.`,
          });
        }

        // Kiểm tra hạn dùng và trạng thái lô ngay lúc nhặt
        const now = new Date();
        if (order.type === 'TRANSFER') {
          if (batch.status !== 'ACTIVE' || new Date(batch.expDate) <= now) {
            throw new RpcException({
              statusCode: 400,
              message: `Lô ${batch.batchNo} đã hết hạn hoặc không ở trạng thái ACTIVE, bị chặn xuất chuyển kho!`,
            });
          }
        } else {
          const isExpiredOrQuarantined =
            ['EXPIRED', 'QUARANTINED'].includes(batch.status) || new Date(batch.expDate) <= now;
          if (!isExpiredOrQuarantined) {
            throw new RpcException({
              statusCode: 400,
              message: `Phiếu xuất hủy chỉ được lấy lô đã quá hạn hoặc biệt trữ.`,
            });
          }
        }

        // Cập nhật nguyên tử reservedQty với điều kiện (stock - reservedQty >= qty) chống Race Condition
        const reservedBefore = Number(batch.reservedQty || 0);
        const updatedBatch = await this.batchModel
          .findOneAndUpdate(
            {
              _id: batch._id,
              $expr: {
                $gte: [{ $subtract: ['$stock', { $ifNull: ['$reservedQty', 0] }] }, qty],
              },
            },
            { $inc: { reservedQty: qty } },
            { new: true, session },
          )
          .exec();

        if (!updatedBatch) {
          const currentAvail = this.getBatchAvailable(batch);
          throw new RpcException({
            statusCode: 409,
            message: `Lô ${batch.batchNo} không đủ tồn khả dụng (Khả dụng hiện tại: ${currentAvail}, Cần nhặt: ${qty}).`,
          });
        }

        // Ghi nhận nhật ký thao tác nhặt trên phiếu
        order.picks.push({
          pickId: crypto.randomUUID(),
          lineId: line.lineId,
          medicineId: line.medicineId,
          batchId: batch._id.toString(),
          batchNo: batch.batchNo,
          expDate: batch.expDate,
          binCode: scannedBinUpper,
          qty,
          returnedQty: 0,
          toteCode: normalizedToteCode,
          isOverride,
          overrideReason: isOverride ? data.overrideReason : undefined,
          gs1Scanned,
          manualReason: !gs1Scanned ? data.manualReason : undefined,
          rawBarcodeScanned: data.rawBarcodeScanned,
          pickedBy: data.actor.userId,
          pickedByName: data.actor.fullName || 'Thủ kho',
          pickedAt: now,
        } as any);

        line.pickedQty += qty;
        line.itemStatus = line.pickedQty >= line.requestedQty ? 'PICKED' : 'PENDING';
        order.totalPicked = order.pickingList.reduce((sum: number, l: any) => sum + Number(l.pickedQty || 0), 0);
        order.status = 'PICKING';
        order.toteId = tote._id.toString();
        order.toteCode = normalizedToteCode;
        if (!order.toteCodes.includes(normalizedToteCode)) {
          order.toteCodes.push(normalizedToteCode);
        }
        order.isStale = false;
        order.lastActivityAt = now;
        order.version += 1;
        await order.save({ session });

        // Ghi lịch sử giữ chỗ PICK_RESERVE (stock thực chưa thay đổi)
        await this.txnModel.create(
          [
            {
              type: 'PICK_RESERVE',
              medicineId: line.medicineId,
              medicineName: line.medicineName,
              batchNo: batch.batchNo,
              quantityChange: 0,
              stockBefore: batch.stock,
              stockAfter: batch.stock,
              reservedBefore,
              reservedAfter: reservedBefore + qty,
              gs1Scanned,
              referenceId: order._id.toString(),
              referenceType: 'DISPATCH_ORDER',
              performedBy: data.actor.fullName || data.actor.userId,
              notes: `Giữ chỗ nhặt hàng vào ${normalizedToteCode} tại khay ${scannedBinUpper} (Phiếu ${order.dispatchCode})`,
            },
          ],
          { session },
        );

        responseSnapshot = {
          success: true,
          message: `Đã giữ chỗ ${qty} ${line.unit} (${line.medicineName}) vào ${normalizedToteCode}.`,
          data: order.toObject(),
        };

        await this.saveIdempotency(
          data.idempotencyKey ? `PICK_ITEM:${data.dispatchOrderId}:${data.idempotencyKey}` : undefined,
          'PICK_ITEM',
          order._id.toString(),
          responseSnapshot,
          session,
        );
      });

      this.emitKafkaNotification('notification.dispatch_updated', {
        dispatchOrderId: data.dispatchOrderId,
        action: 'PICK_ITEM',
        order: responseSnapshot.data,
      });

      return responseSnapshot;
    } catch (error: any) {
      const msg = error?.message || error?.getError?.()?.message || 'Lỗi khi nhặt hàng giữ chỗ.';
      this.notifyAsyncActionFailure(data.actor?.userId, 'PICK_ITEM', data.dispatchOrderId, msg);
      if (error instanceof RpcException) throw error;
      throw new RpcException({ statusCode: 400, message: msg });
    } finally {
      await session.endSession();
    }
  }

  // =========================================================================
  // 5. TRẢ HÀNG VỀ KHAY / XỬ LÝ HỎNG / BIỆT TRỮ (return-item)
  // =========================================================================
  async returnItem(data: {
    dispatchOrderId: string;
    pickId: string;
    quantity: number;
    outcome: 'RESTOCK' | 'DAMAGED' | 'QUARANTINE';
    targetBinCode?: string;
    reason?: string;
    idempotencyKey?: string;
    actor: ActorContext;
  }) {
    const cachedResult = await this.checkIdempotency(
      data.idempotencyKey ? `RETURN_ITEM:${data.dispatchOrderId}:${data.idempotencyKey}` : undefined,
    );
    if (cachedResult) return cachedResult;

    const qty = Number(data.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new RpcException({ statusCode: 400, message: 'Số lượng hoàn trả phải là số nguyên dương.' });
    }
    if (!['RESTOCK', 'DAMAGED', 'QUARANTINE'].includes(data.outcome)) {
      throw new RpcException({ statusCode: 400, message: 'Kết cục trả hàng chỉ chấp nhận RESTOCK, DAMAGED hoặc QUARANTINE.' });
    }
    if (data.outcome === 'RESTOCK' && !String(data.targetBinCode || '').trim()) {
      throw new RpcException({ statusCode: 400, message: 'Trả hàng tốt về kệ (RESTOCK) bắt buộc phải quét lại mã QR khay đích.' });
    }

    const session = await this.batchModel.db.startSession();
    let stockChanged = false;
    try {
      let responseSnapshot: any;

      await session.withTransaction(async () => {
        const order = await this.dispatchOrderModel
          .findById(data.dispatchOrderId)
          .session(session)
          .exec();
        if (!order) {
          throw new RpcException({ statusCode: 404, message: 'Không tìm thấy phiếu xuất kho.' });
        }
        if (!['PICKING', 'STAGED'].includes(order.status)) {
          throw new RpcException({
            statusCode: 409,
            message: `Chỉ có thể trả hàng khi phiếu đang ở trạng thái PICKING hoặc STAGED.`,
          });
        }

        const pick = order.picks.find((p: any) => p.pickId === data.pickId);
        if (!pick) {
          throw new RpcException({ statusCode: 404, message: 'Không tìm thấy bản ghi lần nhặt để hoàn trả.' });
        }
        const netPickQty = pick.qty - pick.returnedQty;
        if (qty > netPickQty) {
          throw new RpcException({
            statusCode: 400,
            message: `Số lượng trả (${qty}) vượt quá số còn lại trong lần nhặt này (${netPickQty}).`,
          });
        }

        if (
          data.outcome === 'RESTOCK' &&
          data.targetBinCode &&
          data.targetBinCode.trim().toUpperCase() !== String(pick.binCode).toUpperCase() &&
          !String(data.reason || '').trim()
        ) {
          throw new RpcException({
            statusCode: 400,
            message: 'Trả hàng vào khay khác với khay gốc bắt buộc phải nhập lý do.',
          });
        }

        const line = order.pickingList.find((l: any) => l.lineId === pick.lineId);
        const batch = await this.batchModel.findById(pick.batchId).session(session).exec();
        if (!batch) {
          throw new RpcException({ statusCode: 404, message: 'Không tìm thấy lô thuốc gốc.' });
        }

        const reservedBefore = Number(batch.reservedQty || 0);
        const stockBefore = Number(batch.stock || 0);

        if (data.outcome === 'RESTOCK') {
          // Hàng còn tốt: chỉ giảm reservedQty để hàng quay lại tồn khả dụng
          const updatedBatch = await this.batchModel
            .findOneAndUpdate(
              { _id: batch._id, reservedQty: { $gte: qty } },
              { $inc: { reservedQty: -qty } },
              { new: true, session },
            )
            .exec();
          if (!updatedBatch) {
            throw new RpcException({ statusCode: 409, message: 'Số lượng giữ chỗ của lô không khớp để hoàn trả.' });
          }

          await this.txnModel.create(
            [
              {
                type: 'PICK_RELEASE',
                medicineId: pick.medicineId,
                medicineName: line?.medicineName || '',
                batchNo: pick.batchNo,
                quantityChange: 0,
                stockBefore,
                stockAfter: stockBefore,
                reservedBefore,
                reservedAfter: reservedBefore - qty,
                referenceId: order._id.toString(),
                referenceType: 'DISPATCH_ORDER',
                performedBy: data.actor.fullName || data.actor.userId,
                notes: `Trả hàng tốt (RESTOCK) về khay ${data.targetBinCode?.trim().toUpperCase()} (${data.reason || 'Khớp khay gốc'})`,
              },
            ],
            { session },
          );
        } else {
          // DAMAGED / QUARANTINE: giảm CẢ stock và reservedQty, KHÔNG tự đổi trạng thái cả lô
          const updatedBatch = await this.batchModel
            .findOneAndUpdate(
              { _id: batch._id, stock: { $gte: qty }, reservedQty: { $gte: qty } },
              { $inc: { stock: -qty, reservedQty: -qty } },
              { new: true, session },
            )
            .exec();
          if (!updatedBatch) {
            throw new RpcException({ statusCode: 409, message: 'Tồn kho hoặc giữ chỗ của lô không đủ để ghi nhận hỏng/biệt trữ.' });
          }
          stockChanged = true;

          await this.txnModel.create(
            [
              {
                type: data.outcome === 'DAMAGED' ? 'PICK_DAMAGE' : 'ADJUSTMENT',
                medicineId: pick.medicineId,
                medicineName: line?.medicineName || '',
                batchNo: pick.batchNo,
                quantityChange: -qty,
                stockBefore,
                stockAfter: stockBefore - qty,
                reservedBefore,
                reservedAfter: reservedBefore - qty,
                referenceId: order._id.toString(),
                referenceType: 'DISPATCH_ORDER',
                performedBy: data.actor.fullName || data.actor.userId,
                notes:
                  data.outcome === 'DAMAGED'
                    ? `Hộp thuốc bị rách/hỏng khi nhặt - chuyển xử lý hủy (${data.reason || 'Hỏng bao bì'})`
                    : `Chuyển khu biệt trữ do nghi vấn chất lượng (${data.reason || 'Biệt trữ'})`,
              },
            ],
            { session },
          );

          await this.syncMedicineTotalStock(pick.medicineId, session);
          if (batch.location) {
            await this.syncBinLocationsStatus([batch.location], session);
          }
        }

        // Cập nhật nhật ký trả hàng (giữ nguyên pick record phục vụ truy vết GSP)
        pick.returnedQty += qty;
        order.returnLogs.push({
          returnId: crypto.randomUUID(),
          pickId: pick.pickId,
          lineId: pick.lineId,
          medicineId: pick.medicineId,
          batchId: pick.batchId,
          batchNo: pick.batchNo,
          qty,
          outcome: data.outcome,
          originalBinCode: pick.binCode,
          targetBinCode: data.targetBinCode?.trim().toUpperCase(),
          reason: data.reason || '',
          returnedBy: data.actor.userId,
          returnedByName: data.actor.fullName || 'Thủ kho',
          returnedAt: new Date(),
        } as any);

        if (line) {
          line.pickedQty = Math.max(0, Number(line.pickedQty || 0) - qty);
          if (line.pickedQty < line.requestedQty && line.itemStatus === 'PICKED') {
            line.itemStatus = 'PENDING';
          }
        }

        order.totalPicked = order.pickingList.reduce((sum: number, l: any) => sum + Number(l.pickedQty || 0), 0);

        // Nếu phiếu đang STAGED thì tự động lùi về PICKING khi trả hàng
        if (order.status === 'STAGED') {
          order.status = 'PICKING';
        }

        // Kiểm tra nếu Tote không còn hàng nào nữa thì giải phóng Tote về AVAILABLE
        const remainingInTote = order.picks
          .filter((p: any) => p.toteCode === pick.toteCode)
          .reduce((sum: number, p: any) => sum + Math.max(0, Number(p.qty) - Number(p.returnedQty || 0)), 0);

        if (remainingInTote === 0) {
          await this.toteModel
            .updateOne(
              { toteCode: pick.toteCode, currentDispatchOrderId: order._id.toString() },
              {
                $set: {
                  status: 'AVAILABLE',
                  currentDispatchOrderId: null,
                  currentDispatchCode: null,
                  lockedBy: null,
                  lockedAt: null,
                },
              },
            )
            .session(session)
            .exec();
          order.toteCodes = order.toteCodes.filter((c: string) => c !== pick.toteCode);
          if (order.toteCode === pick.toteCode) {
            order.toteCode = order.toteCodes[0] || undefined;
          }
        }

        order.lastActivityAt = new Date();
        order.version += 1;
        await order.save({ session });

        responseSnapshot = {
          success: true,
          message: `Đã xử lý trả ${qty} đơn vị (${data.outcome}) thành công.`,
          data: order.toObject(),
        };

        await this.saveIdempotency(
          data.idempotencyKey ? `RETURN_ITEM:${data.dispatchOrderId}:${data.idempotencyKey}` : undefined,
          'RETURN_ITEM',
          order._id.toString(),
          responseSnapshot,
          session,
        );
      });

      this.emitKafkaNotification('notification.dispatch_updated', {
        dispatchOrderId: data.dispatchOrderId,
        action: 'RETURN_ITEM',
        order: responseSnapshot.data,
      });
      if (stockChanged) {
        this.emitKafkaNotification('broadcast.inventory_updated', {
          event: 'DISPATCH_RETURN_STOCK_CHANGED',
          dispatchOrderId: data.dispatchOrderId,
          timestamp: new Date().toISOString(),
        });
      }

      return responseSnapshot;
    } catch (error: any) {
      const msg = error?.message || error?.getError?.()?.message || 'Lỗi khi trả hàng.';
      this.notifyAsyncActionFailure(data.actor?.userId, 'RETURN_ITEM', data.dispatchOrderId, msg);
      if (error instanceof RpcException) throw error;
      throw new RpcException({ statusCode: 400, message: msg });
    } finally {
      await session.endSession();
    }
  }

  // =========================================================================
  // 6. GHI NHẬN THIẾU HÀNG & TẠO ĐỀ XUẤT BỔ SUNG DRAFT
  // =========================================================================
  async markShortage(data: {
    dispatchOrderId: string;
    lineId: string;
    reason?: string;
    actor: ActorContext;
  }) {
    const order = await this.dispatchOrderModel.findById(data.dispatchOrderId).exec();
    if (!order) {
      throw new RpcException({ statusCode: 404, message: 'Không tìm thấy phiếu xuất kho.' });
    }
    if (!['APPROVED', 'PICKING', 'STAGED'].includes(order.status)) {
      throw new RpcException({
        statusCode: 409,
        message: `Không thể báo thiếu hàng khi phiếu đang ở trạng thái ${order.status}.`,
      });
    }

    const line = order.pickingList.find((l: any) => l.lineId === data.lineId);
    if (!line) {
      throw new RpcException({ statusCode: 404, message: 'Không tìm thấy dòng thuốc trên phiếu.' });
    }

    line.itemStatus = 'SHORTAGE';
    line.shortageReason = data.reason || 'Không đủ hàng trên kệ và khu dự trữ';
    order.lastActivityAt = new Date();
    order.version += 1;
    await order.save();

    // Tạo đề xuất bổ sung ở trạng thái DRAFT để chờ duyệt (không tự phát hành đơn mua)
    const missingQty = Math.max(0, Number(line.requestedQty) - Number(line.pickedQty || 0));
    let draftPrCode: string | null = null;
    if (missingQty > 0) {
      draftPrCode = await this.generateDailyCode(this.prModel, 'PR');
      await this.prModel.create({
        prCode: draftPrCode,
        branchId: order.toBranchId || 'CENTRAL_WH',
        branchName: order.toBranchName || 'Kho Tổng GSP',
        items: [
          {
            medicineId: line.medicineId,
            medicineName: line.medicineName,
            requestedQuantity: missingQty,
            unit: line.unit || 'Hộp',
          },
        ],
        reason: `Bổ sung thiếu hàng từ phiếu xuất ${order.dispatchCode}: ${line.shortageReason}`,
        status: 'DRAFT',
        createdBy: data.actor.userId,
      });
    }

    const updatedObj = order.toObject();
    this.emitKafkaNotification('notification.dispatch_updated', {
      dispatchOrderId: updatedObj._id.toString(),
      action: 'SHORTAGE',
      draftPrCode,
      order: updatedObj,
    });

    return {
      success: true,
      message: draftPrCode
        ? `Đã báo thiếu hàng và tạo đề xuất bổ sung nháp ${draftPrCode}.`
        : 'Đã ghi nhận thiếu hàng cho dòng sản phẩm.',
      data: updatedObj,
      draftPrCode,
    };
  }

  // =========================================================================
  // 7. TẬP KẾT TOTE TẠI KHU BÀN GIAO (DISPATCH-AREA-01)
  // =========================================================================
  async stageDispatchOrder(data: {
    dispatchOrderId: string;
    toteCode: string;
    actor: ActorContext;
  }) {
    const order = await this.dispatchOrderModel.findById(data.dispatchOrderId).exec();
    if (!order) {
      throw new RpcException({ statusCode: 404, message: 'Không tìm thấy phiếu xuất kho.' });
    }
    if (order.status !== 'PICKING') {
      throw new RpcException({
        statusCode: 409,
        message: `Phiếu phải ở trạng thái PICKING mới có thể tập kết bàn giao (Hiện tại: ${order.status}).`,
      });
    }

    const scannedTote = String(data.toteCode || '').trim().toUpperCase();
    const belongsToOrder =
      order.toteCode === scannedTote || (order.toteCodes || []).includes(scannedTote);
    if (!scannedTote || !belongsToOrder) {
      throw new RpcException({
        statusCode: 400,
        message: `Mã giỏ "${scannedTote}" không khớp với giỏ đang gom hàng của phiếu ${order.dispatchCode} (${order.toteCodes.join(', ') || 'Chưa gắn giỏ'}).`,
      });
    }

    if (Number(order.totalPicked || 0) <= 0) {
      throw new RpcException({
        statusCode: 400,
        message: 'Không thể tập kết khi tổng số lượng đã nhặt bằng 0.',
      });
    }

    const unfinishedLines = order.pickingList.filter(
      (l: any) => !['PICKED', 'SHORTAGE'].includes(l.itemStatus),
    );
    if (unfinishedLines.length > 0) {
      throw new RpcException({
        statusCode: 400,
        message: `Vẫn còn ${unfinishedLines.length} dòng chưa nhặt đủ hoặc chưa báo thiếu (SHORTAGE).`,
      });
    }

    order.status = 'STAGED';
    order.stagedAt = new Date();
    order.stagedBy = data.actor.userId;
    order.lastActivityAt = new Date();
    order.version += 1;
    await order.save();

    const updatedObj = order.toObject();
    this.emitKafkaNotification('notification.dispatch_updated', {
      dispatchOrderId: updatedObj._id.toString(),
      action: 'STAGE',
      order: updatedObj,
    });

    return {
      success: true,
      message: `Đã tập kết giỏ ${scannedTote} tại khu bàn giao (DISPATCH-AREA-01).`,
      data: updatedObj,
    };
  }

  // =========================================================================
  // 8. XÁC NHẬN XUẤT KHO (GIAI ĐOẠN 2: TRỪ KHO THẬT & CẬP NHẬT STOCK TRANSFER)
  // =========================================================================
  async confirmDispatch(data: {
    dispatchOrderId: string;
    handoverRecipient: {
      driverName: string;
      vehiclePlate?: string;
      carrierNote?: string;
    };
    idempotencyKey?: string;
    actor: ActorContext;
  }) {
    const cachedResult = await this.checkIdempotency(
      data.idempotencyKey ? `DISPATCH:${data.dispatchOrderId}:${data.idempotencyKey}` : undefined,
    );
    if (cachedResult) return cachedResult;

    if (!String(data.handoverRecipient?.driverName || '').trim()) {
      throw new RpcException({
        statusCode: 400,
        message: 'Bắt buộc nhập tên người nhận bàn giao (tài xế / đơn vị vận chuyển) trước khi xuất kho.',
      });
    }

    const session = await this.batchModel.db.startSession();
    const disposalSyncPayloads: Array<any> = [];
    let createdTransferObj: any = null;

    try {
      let responseSnapshot: any;

      await session.withTransaction(async () => {
        const order = await this.dispatchOrderModel
          .findById(data.dispatchOrderId)
          .session(session)
          .exec();
        if (!order) {
          throw new RpcException({ statusCode: 404, message: 'Không tìm thấy phiếu xuất kho.' });
        }
        if (order.status !== 'STAGED') {
          throw new RpcException({
            statusCode: 409,
            message: `Phiếu phải được tập kết ở trạng thái STAGED trước khi xác nhận xuất kho (Hiện tại: ${order.status}).`,
          });
        }

        // Gom tổng lượng ròng thực xuất theo từng lô (qty - returnedQty)
        const netByBatch = new Map<
          string,
          { batchId: string; medicineId: string; medicineName: string; unit: string; batchNo: string; netQty: number }
        >();
        for (const p of order.picks) {
          const net = Number(p.qty || 0) - Number(p.returnedQty || 0);
          if (net <= 0) continue;
          const line = order.pickingList.find((l: any) => l.lineId === p.lineId);
          const existing = netByBatch.get(p.batchId);
          if (existing) {
            existing.netQty += net;
          } else {
            netByBatch.set(p.batchId, {
              batchId: p.batchId,
              medicineId: p.medicineId,
              medicineName: line?.medicineName || 'Dược phẩm',
              unit: line?.unit || 'Hộp',
              batchNo: p.batchNo,
              netQty: net,
            });
          }
        }

        if (netByBatch.size === 0) {
          throw new RpcException({ statusCode: 400, message: 'Không có hàng hóa nào trong giỏ để xác nhận xuất kho.' });
        }

        const now = new Date();
        const touchedMedicineIds = new Set<string>();
        const touchedLocations: Array<{ zone: string; rack: string; shelf: number; bin: number; slotType?: string }> = [];
        const transferItems: Array<any> = [];

        for (const entry of netByBatch.values()) {
          const batch = await this.batchModel.findById(entry.batchId).session(session).exec();
          if (!batch) {
            throw new RpcException({ statusCode: 404, message: `Không tìm thấy lô ${entry.batchNo}.` });
          }

          // Tái kiểm tra hạn dùng và trạng thái lô tại thời điểm xuất thật
          if (order.type === 'TRANSFER') {
            if (batch.status !== 'ACTIVE' || new Date(batch.expDate) <= now) {
              throw new RpcException({
                statusCode: 409,
                message: `Lô ${batch.batchNo} (${entry.medicineName}) đã hết hạn hoặc bị khóa giữa hai bước! Vui lòng trả hàng về khay trước khi xuất.`,
              });
            }
          }

          const stockBefore = Number(batch.stock || 0);
          const reservedBefore = Number(batch.reservedQty || 0);

          const updatedBatch = await this.batchModel
            .findOneAndUpdate(
              {
                _id: batch._id,
                stock: { $gte: entry.netQty },
                reservedQty: { $gte: entry.netQty },
              },
              {
                $inc: { stock: -entry.netQty, reservedQty: -entry.netQty },
              },
              { new: true, session },
            )
            .exec();

          if (!updatedBatch) {
            throw new RpcException({
              statusCode: 409,
              message: `Dữ liệu tồn kho/giữ chỗ của lô ${batch.batchNo} không đủ để trừ kho thật.`,
            });
          }

          // Nếu là phiếu xuất hủy và lô về 0 thì cập nhật status EXPIRED
          if (order.type === 'DISPOSE' && updatedBatch.stock === 0) {
            await this.batchModel
              .updateOne({ _id: batch._id }, { $set: { status: 'EXPIRED' } })
              .session(session)
              .exec();
          }

          touchedMedicineIds.add(entry.medicineId);
          if (batch.location) touchedLocations.push(batch.location);

          await this.txnModel.create(
            [
              {
                type: order.type === 'DISPOSE' ? 'DISPOSE' : 'DISPATCH',
                medicineId: entry.medicineId,
                medicineName: entry.medicineName,
                batchNo: batch.batchNo,
                quantityChange: -entry.netQty,
                stockBefore,
                stockAfter: stockBefore - entry.netQty,
                reservedBefore,
                reservedAfter: reservedBefore - entry.netQty,
                referenceId: order._id.toString(),
                referenceType: 'DISPATCH_ORDER',
                performedBy: data.actor.fullName || data.actor.userId,
                notes:
                  order.type === 'DISPOSE'
                    ? `Xuất hủy theo phiếu ${order.dispatchCode} (Biên bản ${order.disposalReportCode})`
                    : `Xuất kho thật cho phiếu ${order.dispatchCode} - Tài xế: ${data.handoverRecipient.driverName}`,
              },
            ],
            { session },
          );

          transferItems.push({
            medicineId: entry.medicineId,
            medicineName: entry.medicineName,
            batchNo: batch.batchNo,
            quantity: entry.netQty,
            unit: entry.unit || 'Hộp',
          });

          if (order.type === 'DISPOSE') {
            disposalSyncPayloads.push({
              medicineId: entry.medicineId,
              batchNo: batch.batchNo,
              quantity: entry.netQty,
              expDate: batch.expDate,
              branchId: 'CENTRAL_WH',
              notes: `Xuất hủy từ phiếu ${order.dispatchCode} - BB: ${order.disposalReportCode}`,
            });
          }
        }

        // Đồng bộ tổng tồn kho trên Medicine & trạng thái EMPTY cho khay trên sơ đồ 2D/3D
        for (const medId of touchedMedicineIds) {
          await this.syncMedicineTotalStock(medId, session);
        }
        await this.syncBinLocationsStatus(touchedLocations, session);

        // Giải phóng mọi Tote gắn với phiếu này
        await this.toteModel
          .updateMany(
            { currentDispatchOrderId: order._id.toString() },
            {
              $set: {
                status: 'AVAILABLE',
                currentDispatchOrderId: null,
                currentDispatchCode: null,
                lockedBy: null,
                lockedAt: null,
              },
            },
          )
          .session(session)
          .exec();

        const hasShortage = order.pickingList.some((l: any) => l.itemStatus === 'SHORTAGE');
        order.status = hasShortage ? 'PARTIALLY_DISPATCHED' : 'DISPATCHED';
        order.handoverRecipient = {
          driverName: data.handoverRecipient.driverName.trim(),
          vehiclePlate: data.handoverRecipient.vehiclePlate?.trim() || '',
          carrierNote: data.handoverRecipient.carrierNote?.trim() || '',
        };
        order.dispatchedBy = data.actor.userId;
        order.dispatchedByName = data.actor.fullName || 'Thủ kho';
        order.dispatchedAt = now;
        order.lastActivityAt = now;
        order.version += 1;

        // Nếu TRANSFER: sinh StockTransfer trạng thái SHIPPING (tồn chi nhánh chưa tăng cho tới khi chi nhánh bấm nhận)
        if (order.type === 'TRANSFER') {
          const transferCode = await this.generateDailyCode(this.transferModel, 'ST', session);
          const transferDoc = new this.transferModel({
            transferCode,
            prId: order.referenceId || order._id.toString(),
            prCode: order.referenceCode || order.dispatchCode,
            fromBranchId: order.fromBranchId || 'CENTRAL_WH',
            toBranchId: order.toBranchId,
            toBranchName: order.toBranchName || order.toBranchId,
            items: transferItems,
            status: 'SHIPPING',
            shippedBy: data.actor.fullName || data.actor.userId,
            shippedAt: now,
            notes: `Xuất từ phiếu ${order.dispatchCode} - Tài xế: ${order.handoverRecipient.driverName}${
              order.handoverRecipient.vehiclePlate ? ` (${order.handoverRecipient.vehiclePlate})` : ''
            }`,
          });
          await transferDoc.save({ session });
          order.stockTransferId = transferDoc._id.toString();
          order.stockTransferCode = transferCode;
          createdTransferObj = transferDoc.toObject();

          if (order.referenceId && isValidObjectId(order.referenceId)) {
            await this.prModel
              .updateOne({ _id: order.referenceId }, { $set: { status: 'SHIPPING' } })
              .session(session)
              .exec();
          }
        }

        await order.save({ session });

        responseSnapshot = {
          success: true,
          message: `Đã xác nhận xuất kho thành công phiếu ${order.dispatchCode} (${order.status}).`,
          data: order.toObject(),
          stockTransfer: createdTransferObj,
        };

        await this.saveIdempotency(
          data.idempotencyKey ? `DISPATCH:${data.dispatchOrderId}:${data.idempotencyKey}` : undefined,
          'DISPATCH',
          order._id.toString(),
          responseSnapshot,
          session,
        );
      });

      // Liên thông CSDL Dược Quốc gia ngoài transaction (cảnh báo nếu lỗi)
      if (this.nationalPharmaService && disposalSyncPayloads.length > 0) {
        for (const p of disposalSyncPayloads) {
          try {
            await this.nationalPharmaService.syncDisposal(p);
          } catch (gppErr: any) {
            this.logger.warn(`[CSDL Dược Disposal Warning] ${gppErr?.message}`);
          }
        }
      }

      this.emitKafkaNotification('notification.dispatch_dispatched', {
        dispatchOrderId: data.dispatchOrderId,
        dispatchCode: responseSnapshot.data.dispatchCode,
        toBranchId: responseSnapshot.data.toBranchId,
        toBranchName: responseSnapshot.data.toBranchName,
        stockTransferId: responseSnapshot.stockTransfer?._id?.toString(),
        stockTransferCode: responseSnapshot.stockTransfer?.transferCode,
        order: responseSnapshot.data,
      });

      this.emitKafkaNotification('broadcast.inventory_updated', {
        event: 'DISPATCH_CONFIRMED',
        dispatchOrderId: data.dispatchOrderId,
        stockTransferCode: responseSnapshot.stockTransfer?.transferCode,
        toBranchId: responseSnapshot.data.toBranchId,
        timestamp: new Date().toISOString(),
      });

      return responseSnapshot;
    } catch (error: any) {
      const msg = error?.message || error?.getError?.()?.message || 'Lỗi khi xác nhận xuất kho.';
      this.notifyAsyncActionFailure(data.actor?.userId, 'CONFIRM_DISPATCH', data.dispatchOrderId, msg);
      if (error instanceof RpcException) throw error;
      throw new RpcException({ statusCode: 400, message: msg });
    } finally {
      await session.endSession();
    }
  }

  // =========================================================================
  // 9. HỦY PHIẾU XUẤT KHO (CHỈ KHI totalPicked === 0)
  // =========================================================================
  async cancelDispatchOrder(data: { dispatchOrderId: string; reason?: string; actor: ActorContext }) {
    const order = await this.dispatchOrderModel.findById(data.dispatchOrderId).exec();
    if (!order) {
      throw new RpcException({ statusCode: 404, message: 'Không tìm thấy phiếu xuất kho.' });
    }
    if (['DISPATCHED', 'PARTIALLY_DISPATCHED', 'CANCELLED'].includes(order.status)) {
      throw new RpcException({
        statusCode: 409,
        message: `Phiếu đang ở trạng thái "${order.status}", không thể hủy.`,
      });
    }
    if (Number(order.totalPicked || 0) > 0) {
      throw new RpcException({
        statusCode: 409,
        message: `Phiếu vẫn còn ${order.totalPicked} đơn vị đang giữ trong giỏ gom hàng. Vui lòng hoàn trả toàn bộ hàng về khay trước khi hủy!`,
      });
    }

    order.status = 'CANCELLED';
    order.rejectedBy = data.actor.userId;
    order.rejectedByName = data.actor.fullName || data.actor.role;
    order.rejectedAt = new Date();
    order.rejectedReason = data.reason || 'Hủy phiếu xuất kho';
    order.version += 1;
    await order.save();

    // Đảm bảo giải phóng nếu còn Tote gắn trống
    await this.toteModel
      .updateMany(
        { currentDispatchOrderId: order._id.toString() },
        {
          $set: {
            status: 'AVAILABLE',
            currentDispatchOrderId: null,
            currentDispatchCode: null,
            lockedBy: null,
            lockedAt: null,
          },
        },
      )
      .exec();

    await this.restorePrToSubmittedIfUnlinked(order);

    const updatedObj = order.toObject();
    this.emitKafkaNotification('notification.dispatch_updated', {
      dispatchOrderId: updatedObj._id.toString(),
      action: 'CANCEL',
      order: updatedObj,
    });

    return {
      success: true,
      message: `Đã hủy phiếu xuất ${updatedObj.dispatchCode}.`,
      data: updatedObj,
    };
  }

  // =========================================================================
  // 10. QUẢN LÝ GIỎ GOM HÀNG (TOTE) & CRONJOB PHIẾU TREO (isStale)
  // =========================================================================
  async listTotes(status?: string) {
    const query: any = {};
    if (status && ['AVAILABLE', 'IN_USE'].includes(status)) {
      query.status = status;
    }
    const totes = await this.toteModel.find(query).sort({ toteCode: 1 }).lean().exec();
    return { success: true, data: totes };
  }

  /**
   * Đánh dấu cờ isStale = true cho các phiếu PICKING không có thao tác quá 4 giờ.
   * TUYỆT ĐỐI KHÔNG tự động hủy hoặc tự nhả reservedQty vì thuốc vẫn đang nằm trong giỏ ngoài kệ.
   */
  async markStalePickingOrders(now: Date = new Date()): Promise<{ updatedCount: number; dispatchCodes: string[] }> {
    const cutoff = new Date(now.getTime() - STALE_THRESHOLD_MS);
    const staleOrders = await this.dispatchOrderModel
      .find({
        status: 'PICKING',
        isStale: false,
        lastActivityAt: { $lte: cutoff },
      })
      .select('_id dispatchCode toBranchName lastActivityAt')
      .lean()
      .exec();

    if (staleOrders.length === 0) {
      return { updatedCount: 0, dispatchCodes: [] };
    }

    const ids = staleOrders.map((o) => o._id);
    await this.dispatchOrderModel
      .updateMany({ _id: { $in: ids } }, { $set: { isStale: true } })
      .exec();

    const dispatchCodes = staleOrders.map((o) => o.dispatchCode);
    this.emitKafkaNotification('notification.dispatch_stale', {
      count: staleOrders.length,
      dispatchCodes,
      orders: staleOrders.map((o) => ({
        dispatchOrderId: o._id.toString(),
        dispatchCode: o.dispatchCode,
        toBranchName: o.toBranchName,
        lastActivityAt: o.lastActivityAt,
      })),
    });

    return { updatedCount: staleOrders.length, dispatchCodes };
  }
}
