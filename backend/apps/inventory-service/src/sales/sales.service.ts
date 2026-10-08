import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { RpcException, ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { SalesOrder } from './schemas/sales-order.schema';
import { Prescription } from './schemas/prescription.schema';
import { Medicine } from '../medicine/schemas/medicine.schema';
import { MedicineBatch } from '../medicine/schemas/medicine-batch.schema';
import { BranchInventory } from '../medicine/schemas/branch-inventory.schema';
import { BranchStockBalance } from '../medicine/schemas/branch-stock-balance.schema';
import { PricingService } from '../pricing/pricing.service';
import { NationalPharmaService } from './national-pharma.service';
import { InventoryTransaction } from '../purchase/schemas/inventory-transaction.schema';
import {
  buildRetailDosageInstruction,
  getSelectedUnit,
  getUnitFactor,
  getUnitOptions,
  isPackageOnlyUnit,
  resolveUnitPrice,
} from './unit-pricing';

@Injectable()
export class SalesService implements OnModuleInit {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectModel(SalesOrder.name) private readonly saleModel: Model<SalesOrder>,
    @InjectModel(Prescription.name) private readonly prescriptionModel: Model<Prescription>,
    @InjectModel(Medicine.name) private readonly medicineModel: Model<Medicine>,
    @InjectModel(MedicineBatch.name) private readonly batchModel: Model<MedicineBatch>,
    @InjectModel(BranchInventory.name) private readonly branchInvModel: Model<BranchInventory>,
    @InjectModel(BranchStockBalance.name) private readonly balanceModel: Model<BranchStockBalance>,
    private readonly pricingService: PricingService,
    private readonly nationalPharmaService: NationalPharmaService,
    @InjectModel(InventoryTransaction.name) private readonly txnModel: Model<InventoryTransaction>,
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
  ) { }

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  async getPrescriptionByCode(code: string, branchId?: string) {
    this.logger.log(`Fetching prescription by code: ${code}`);
    const prescription = await this.prescriptionModel.findOne({ prescriptionCode: code }).exec();
    if (!prescription) {
      throw new RpcException({ message: 'Không tìm thấy đơn thuốc điện tử' });
    }

    const itemsWithDetails = [];
    for (const item of prescription.items) {
      const medicine = await this.medicineModel.findById(item.medicineId).exec();
      if (medicine) {
        // Tính tồn kho khả dụng động
        const batchQuery: any = {
          medicineId: item.medicineId,
          status: 'ACTIVE',
          stock: { $gt: 0 }
        };
        if (branchId) {
          batchQuery.branchId = branchId;
        }
        const batches = await this.batchModel.find(batchQuery).exec();

        const totalStock = batches.reduce((sum, b) => sum + b.stock, 0);

        let earliestExpiryStr: string | null = null;
        if (batches.length > 0) {
          const earliestBatch = batches.reduce((min, b) => new Date(b.expDate) < new Date(min.expDate) ? b : min, batches[0]);
          earliestExpiryStr = new Date(earliestBatch.expDate).toISOString().split('T')[0];
        } else if (medicine.expiry_date) {
          earliestExpiryStr = medicine.expiry_date;
        }

        itemsWithDetails.push({
          medicineId: item.medicineId,
          name: medicine.name,
          active_ingredient: medicine.active_ingredient || '',
          price: medicine.price ?? 0,
          quantity: item.quantity,
          dosage: item.dosage,
          unit: medicine.unit || 'Hộp',
          stock: totalStock,
          expiry: earliestExpiryStr,
          status: totalStock > 0 ? 'In Stock' : 'Out of Stock'
        });
      } else {
        itemsWithDetails.push({
          medicineId: item.medicineId,
          name: 'Thuốc không xác định',
          active_ingredient: '',
          price: 0,
          quantity: item.quantity,
          dosage: item.dosage,
          unit: 'Hộp',
          stock: 0,
          expiry: null,
          status: 'Out of Stock'
        });
      }
    }

    return {
      id: prescription._id.toString(),
      prescriptionCode: prescription.prescriptionCode,
      patientName: prescription.patientName,
      patientAge: prescription.patientAge,
      patientGender: prescription.patientGender,
      patientPhone: prescription.patientPhone,
      doctorName: prescription.doctorName,
      doctorSpecialty: prescription.doctorSpecialty,
      hospitalName: prescription.hospitalName,
      hospitalCode: prescription.hospitalCode,
      items: itemsWithDetails,
      status: prescription.status
    };
  }

  async listPrescriptions() {
    try {
      this.logger.log('Listing all prescriptions from database');
      const prescriptions = await this.prescriptionModel.find().sort({ createdAt: -1 }).exec();
      return (prescriptions || []).map(p => ({
        id: p._id.toString(),
        prescriptionCode: p.prescriptionCode,
        patientName: p.patientName,
        patientAge: p.patientAge,
        patientGender: p.patientGender,
        patientPhone: p.patientPhone,
        doctorName: p.doctorName,
        doctorSpecialty: p.doctorSpecialty,
        hospitalName: p.hospitalName,
        hospitalCode: p.hospitalCode,
        items: p.items || [],
        status: p.status,
        createdAt: (p as any).createdAt
      }));
    } catch (error) {
      this.logger.error('Lỗi khi truy vấn danh sách đơn thuốc từ database:', error);
      return [];
    }
  }

  private getTieredPrice(medicine: any, quantity: number): number {
    if (medicine.priceTiers && medicine.priceTiers.length > 0) {
      // Sắp xếp giảm dần theo minQuantity để lấy bậc cao nhất thỏa mãn
      const sortedTiers = [...medicine.priceTiers].sort((a, b) => b.minQuantity - a.minQuantity);
      for (const tier of sortedTiers) {
        if (quantity >= tier.minQuantity) {
          return tier.price;
        }
      }
    }
    // Giá bậc thang mặc định nếu không cấu hình riêng cho thuốc này
    const basePrice = medicine.price ?? 0;
    if (quantity >= 100) return Math.round(basePrice * 0.85); // Giảm 15%
    if (quantity >= 50) return Math.round(basePrice * 0.90);  // Giảm 10%
    if (quantity >= 10) return Math.round(basePrice * 0.95);  // Giảm 5%
    return basePrice;
  }

  async createSalesOrder(data: any) {
    this.logger.log(`Creating Sales Order. Type: ${data.type}, OrderCode: ${data.orderCode}`);

    // Check for duplicate sales order (idempotency check)
    if (data.orderCode) {
      const existingSale = await this.saleModel.findOne({ orderCode: data.orderCode }).exec();
      if (existingSale) {
        this.logger.log(`Sales Order for orderCode ${data.orderCode} already exists. Skipping inventory deduction.`);
        return {
          success: true,
          message: 'Trừ kho đã được thực hiện thành công từ trước!',
          data: existingSale,
        };
      }
    }

    let prescription = null;
    if (data.type === 'PRESCRIPTION') {
      if (!data.approvedBy || !data.approvedAt) {
        throw new RpcException({ message: 'Đơn kê đơn chưa có thông tin phê duyệt của dược sĩ', statusCode: 403 });
      }
      if (!data.prescriptionCode) {
        throw new RpcException({ message: 'Yêu cầu mã đơn thuốc để bán theo đơn' });
      }
      prescription = await this.prescriptionModel.findOne({ prescriptionCode: data.prescriptionCode }).exec();
      if (!prescription) {
        // Automatically save prescription if it is a manual paper prescription or flag is manual
        if (data.isManualPrescription || data.prescriptionCode.startsWith('PRX-HAND-')) {
          prescription = new this.prescriptionModel({
            prescriptionCode: data.prescriptionCode,
            patientName: data.patientName || 'Khách hàng kê đơn',
            patientAge: data.patientAge ? Number(data.patientAge) : 30,
            patientGender: data.patientGender || 'Nam',
            patientPhone: data.patientPhone || '',
            doctorName: data.doctorName || 'Bác sĩ kê đơn',
            doctorSpecialty: data.doctorSpecialty || 'Đa khoa',
            hospitalName: data.hospitalName || 'Bệnh viện',
            hospitalCode: data.hospitalCode || 'BV-01',
            items: data.items.map((it: any) => ({
              medicineId: it.medicineId,
              quantity: it.quantity,
              dosage: it.dosage || 'Ngày uống 2 lần, mỗi lần 1 viên sau ăn'
            })),
            status: 'PENDING'
          });
          await prescription.save();
        } else {
          throw new RpcException({ message: `Không tìm thấy đơn thuốc: ${data.prescriptionCode}` });
        }
      }
      if (prescription.status === 'FILLED') {
        throw new RpcException({ message: 'Đơn thuốc điện tử này đã được bán hoàn tất trước đó' });
      }
    }


    const today = new Date();
    const orderItems = [];
    let totalAmount = 0;
    const allWarnings: string[] = [];
    const transactionLogs: any[] = [];

    // Xuất kho FIFO
    for (const item of data.items) {
      let medicine: any = null;
      if (item.medicineId && mongoose.Types.ObjectId.isValid(item.medicineId)) {
        medicine = await this.medicineModel.findById(item.medicineId).exec();
      }
      if (!medicine) {
        medicine = await this.medicineModel.findOne({
          $or: [
            { id: item.medicineId },
            { name: item.name },
            { name: new RegExp(`^${item.name}$`, 'i') }
          ]
        }).exec();
      }

      if (!medicine) {
        throw new RpcException({ message: `Không tìm thấy thuốc có ID/tên: ${item.medicineId || item.name}` });
      }

      const medIdStr = medicine._id.toString();
      const selectedUnit = getSelectedUnit(medicine, item.unit);
      const unitOptions = getUnitOptions(medicine);
      const baseUnit = [...unitOptions].sort((a, b) => getUnitFactor(a) - getUnitFactor(b))[0] || selectedUnit;
      const exchangeValue = getUnitFactor(selectedUnit);

      // Truy cập các lô hoạt động sắp xếp tăng dần hạn sử dụng expDate ASC -> FIFO/FEFO
      const batchQuery: any = {
        $or: [
          { medicineId: medIdStr },
          { medicineId: medicine._id },
          { medicineId: item.medicineId }
        ],
        status: 'ACTIVE',
        stock: { $gt: 0 }
      };
      let batches: any[] = [];
      let isBranchInventoryUsed = false;

      // KIẾN TRÚC PHÂN TÁCH KHO VẬT LÝ (Phương án 2):
      // Nếu bán tại chi nhánh cụ thể, truy vấn trực tiếp vào collection vật lý riêng `branch_inventories`
      if (data.branchId && data.branchId !== 'CENTRAL_WH') {
        batches = await this.branchInvModel.find({
          branchId: data.branchId,
          $or: [
            { medicineId: medIdStr },
            { medicineId: medicine._id },
            { medicineId: item.medicineId }
          ],
          status: 'ACTIVE',
          stock: { $gt: 0 }
        }).sort({ expDate: 1 }).exec();

        if (batches.length > 0) {
          isBranchInventoryUsed = true;
        }
      }

      // Fallback: Nếu không tìm thấy trong branch_inventories hoặc là Kho Tổng, tra cứu medicinebatches
      if (batches.length === 0) {
        if (data.branchId) {
          batchQuery.branchId = data.branchId;
        } else {
          // Nếu đơn hàng online không gán chi nhánh, ưu tiên trừ kho tổng CENTRAL_WH
          batchQuery.branchId = 'CENTRAL_WH';
        }
        batches = await this.batchModel.find(batchQuery).sort({ expDate: 1 }).exec();
      }

      // Nếu vẫn không có lô hàng nào hợp lệ tại chi nhánh
      if (batches.length === 0 && data.branchId) {
        throw new RpcException({
          message: `Chi nhánh ${data.branchId} không có tồn kho khả dụng cho thuốc "${medicine.name}". Vui lòng liên hệ kho tổng để chuyển hàng.`
        });
      }

      let totalAvailable = batches.reduce((sum, b) => sum + b.stock, 0);

      // Tính toán quy đổi đơn vị từ danh mục thuốc, không tin hệ số client gửi lên.
      const requestedQuantity = Number(item.quantity);
      if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
        throw new RpcException({ message: `Số lượng bán của thuốc "${medicine.name}" phải là số nguyên dương` });
      }
      const baseDeductQty = Math.max(1, requestedQuantity * exchangeValue);

      if (totalAvailable < baseDeductQty) {
        throw new RpcException({
          message: `Thuốc "${medicine.name}" không đủ tồn kho khả dụng (Yêu cầu quy đổi: ${baseDeductQty} ${medicine.unit || 'đơn vị'}, Khả dụng: ${totalAvailable})`
        });
      }

      let remainingQty = baseDeductQty;
      const allocatedBatches = [];

      for (const batch of batches) {
        if (remainingQty <= 0) break;

        // Nếu lô hàng đã quá ngày hết hạn
        if (batch.expDate < today) {
          batch.status = 'EXPIRED';
          await batch.save();
          continue;
        }

        // Kiểm tra cảnh báo cận HSD (dưới 6 tháng = 180 ngày)
        const diffTime = batch.expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 180) {
          allWarnings.push(
            `Lô "${batch.batchNo}" của thuốc "${medicine.name}" sắp hết hạn (HSD: ${batch.expDate.toLocaleDateString()} - Còn ${diffDays} ngày)`
          );
        }

        const deductQty = Math.min(batch.stock, remainingQty);
        const stockBefore = batch.stock;
        // Conditional atomic decrement prevents two concurrent sales from
        // both consuming the same last units of a batch.
        const inventoryModel: any = isBranchInventoryUsed ? this.branchInvModel : this.batchModel;
        const updatedBatch = await inventoryModel.findOneAndUpdate(
          { _id: batch._id, status: 'ACTIVE', stock: { $gte: deductQty } },
          { $inc: { stock: -deductQty } },
          { new: true },
        ).exec();
        if (!updatedBatch) {
          throw new RpcException({ message: `Tồn kho lô ${batch.batchNo} vừa thay đổi, vui lòng thử lại` });
        }
        remainingQty -= deductQty;

        allocatedBatches.push({
          batchNo: batch.batchNo,
          quantity: deductQty,
          importPrice: batch.importPrice || 0
        });
        await batch.save();

        transactionLogs.push({
          type: 'SALE_EXPORT',
          medicineId: medIdStr,
          medicineName: medicine.name,
          batchNo: batch.batchNo,
          quantityChange: -deductQty,
          stockBefore,
          stockAfter: stockBefore - deductQty,
          referenceType: 'SALE',
          performedBy: data.soldBy || 'Dược sĩ',
          notes: `Bán hàng ${data.type === 'WHOLESALE' ? 'sỉ' : 'lẻ'} - Đơn vị: ${item.unit || 'Hộp'} (${isBranchInventoryUsed ? 'Kho Chi Nhánh' : 'Kho Tổng'})`,
        });
      }

      if (remainingQty > 0) {
        throw new RpcException({
          message: `Không đủ lô hàng khả dụng còn hạn cho thuốc "${medicine.name}"`
        });
      }

      // Đồng bộ ngay bảng số dư tồn kho chi nhánh (BranchStockBalance) để bảo đảm tính toàn vẹn tuyệt đối
      if (data.branchId && data.branchId !== 'CENTRAL_WH') {
        await this.balanceModel.findOneAndUpdate(
          { branchId: data.branchId, medicineId: medIdStr },
          {
            $inc: { totalStock: -baseDeductQty },
            $set: { lastSyncedAt: new Date() }
          },
          { upsert: true }
        ).exec();
      }

      // Cập nhật số lẻ đang mở chỉ cho thuốc có thể tách theo đơn vị cơ sở.
      // Tuýp/chai/lọ là bao gói nguyên chiếc; không được biến một lần bán
      // thành 99 đơn vị "đang mở" chỉ vì exchangeValue của chúng bằng 1.
      let currentOpened = Number(medicine.openedBoxUnits) || 0;
      const largestPackFactor = Math.max(...unitOptions.map(unit => getUnitFactor(unit)), 1);
      if (!isPackageOnlyUnit(selectedUnit.unitName) && exchangeValue < largestPackFactor) {
        if (baseDeductQty <= currentOpened) {
          currentOpened -= baseDeductQty;
        } else {
          const needed = baseDeductQty - currentOpened;
          const boxSize = largestPackFactor;
          const boxesOpened = Math.ceil(needed / boxSize);
          currentOpened = (boxesOpened * boxSize) - needed;
        }
      }
      await this.medicineModel.updateOne(
        { _id: medicine._id },
        { 
          $set: { openedBoxUnits: currentOpened }
        }
      ).exec();

      // Resolve giá theo chi nhánh và đơn vị đã chọn
      const branchReferencePrice = await this.pricingService.resolvePrice(
        data.branchId,
        medIdStr,
        data.type === 'WHOLESALE' ? 'WHOLESALE' : 'RETAIL',
        requestedQuantity,
      );
      const resolvedPrice = resolveUnitPrice(medicine, selectedUnit, branchReferencePrice);
      totalAmount += resolvedPrice * requestedQuantity;

      const dosePerTime = Number(item.dosePerTime) > 0 ? Number(item.dosePerTime) : 1;
      const timesPerDay = Number(item.timesPerDay) > 0 ? Number(item.timesPerDay) : 2;
      const durationDays = Number(item.durationDays) > 0 ? Number(item.durationDays) : 1;
      const dailyDose = Number(item.dailyDose) > 0 ? Number(item.dailyDose) : dosePerTime * timesPerDay;

      orderItems.push({
        medicineId: item.medicineId,
        name: medicine.name,
        quantity: requestedQuantity,
        price: resolvedPrice,
        unit: selectedUnit.unitName || medicine.unit || 'Hộp',
        exchangeValue: exchangeValue,
        baseQuantity: baseDeductQty,
        dosePerTime,
        timesPerDay,
        dailyDose,
        durationDays,
        dosageInstructions: item.dosageInstructions || buildRetailDosageInstruction({
          medicine,
          selectedUnit,
          dosePerTime,
          timesPerDay,
          durationDays,
          baseUnitName: baseUnit.unitName,
        }),
        batches: allocatedBatches
      });
    }

    // Tạo hóa đơn bán hàng
    const salesOrder = new this.saleModel({
      prescriptionId: prescription ? prescription._id.toString() : undefined,
      prescriptionCode: data.prescriptionCode,
      items: orderItems,
      totalAmount: totalAmount,
      paymentMethod: data.paymentMethod || 'CASH',
      type: data.type || 'RETAIL',
      patientName: data.patientName || (prescription ? prescription.patientName : undefined),
      patientPhone: data.patientPhone || (prescription ? prescription.patientPhone : undefined),
      soldBy: data.soldBy || 'Dược sĩ',
      orderCode: data.orderCode,
      branchId: data.branchId || null,
      redeemedPoints: data.redeemedPoints || 0,
      earnedPoints: data.earnedPoints || Math.round(totalAmount / 100),
    });

    // Tự động liên thông CSDL Dược Quốc gia (GPP Sandbox)
    try {
      const gppSync = await this.nationalPharmaService.syncSaleOrder(salesOrder, data.branchId);
      salesOrder.nationalFacilityCode = gppSync.facilityCode;
      salesOrder.nationalSyncStatus = gppSync.syncStatus;
      salesOrder.nationalSyncCode = gppSync.syncCode;
      salesOrder.nationalSyncedAt = gppSync.syncedAt;
      salesOrder.nationalSyncMessage = gppSync.message;
    } catch (gppErr: any) {
      this.logger.warn(`[GPP Sync Warning] ${gppErr.message}`);
      salesOrder.nationalSyncStatus = 'PENDING';
    }

    await salesOrder.save();

    // Lưu các transaction log liên kết với mã hóa đơn bán hàng vừa tạo
    for (const log of transactionLogs) {
      log.referenceId = salesOrder._id.toString();
      await new this.txnModel(log).save();
    }

    // Cập nhật trạng thái đơn thuốc
    if (prescription) {
      prescription.status = 'FILLED';
      await prescription.save();
    }

    // Broadcast Real-time event cho WebSockets
    this.kafkaClient.emit('broadcast.inventory_updated', {
      event: 'SALE_COMPLETED',
      timestamp: new Date().toISOString(),
      orderId: salesOrder._id.toString(),
      nationalSyncCode: salesOrder.nationalSyncCode,
    });

    return {
      success: true,
      message: 'Thanh toán & Liên thông Dược Quốc gia (GPP) thành công!',
      warnings: allWarnings,
      data: salesOrder
    };
  }

  async revertSalesOrder(orderCode: any) {
    this.logger.log(`Reverting sales order with orderCode: ${orderCode}`);
    const order = await this.saleModel.findOne({ orderCode }).exec();
    if (!order) {
      this.logger.warn(`Order code ${orderCode} not found in inventory, nothing to revert`);
      return { success: true, message: 'Nothing to revert' };
    }

    const txns = await this.txnModel.find({ referenceId: order._id.toString(), type: 'SALE_EXPORT' }).exec();
    const stockModel: any = order.branchId && order.branchId !== 'CENTRAL_WH'
      ? this.branchInvModel
      : this.batchModel;
    for (const txn of txns) {
      const quantityToRevert = Math.abs(txn.quantityChange);

      // Revert batch stock
      const batchFilter: any = { batchNo: txn.batchNo, medicineId: txn.medicineId };
      if (stockModel === this.branchInvModel) batchFilter.branchId = order.branchId;
      const batch = await stockModel.findOne(batchFilter).exec();
      if (batch) {
        const stockBefore = batch.stock;
        batch.stock += quantityToRevert;
        batch.status = batch.expDate < new Date() ? 'EXPIRED' : 'ACTIVE';
        await batch.save();

        // Create revert log
        await new this.txnModel({
          type: 'SALE_REVERT',
          medicineId: txn.medicineId,
          medicineName: txn.medicineName,
          batchNo: txn.batchNo,
          quantityChange: quantityToRevert,
          stockBefore: stockBefore,
          stockAfter: stockBefore + quantityToRevert,
          referenceType: 'SALE_REVERT',
          referenceId: order._id.toString(),
          performedBy: 'System (Saga Rollback)',
          notes: `Reverted sale for orderCode ${orderCode}`
        }).save();
      }

      // Revert medicine total stock
      await this.medicineModel.updateOne(
        { _id: txn.medicineId },
        { $inc: { stock: quantityToRevert } }
      ).exec();
    }

    // Revert prescription status if any
    if (order.prescriptionId) {
      await this.prescriptionModel.updateOne(
        { _id: order.prescriptionId },
        { status: 'APPROVED' }
      ).exec();
    }

    // Delete the sales order record
    await this.saleModel.deleteOne({ _id: order._id }).exec();
    return { success: true, message: 'Sales order reverted successfully' };
  }

  async listSalesOrders(search?: string, type?: string) {
    const filter: any = {};
    if (search) {
      if (search.match(/^[0-9a-fA-F]{24}$/)) {
        filter._id = search;
      } else {
        filter.$or = [
          { patientPhone: { $regex: search, $options: 'i' } },
          { patientName: { $regex: search, $options: 'i' } }
        ];
      }
    }
    if (type) {
      filter.type = type;
    }
    return this.saleModel.find(filter).sort({ createdAt: -1 }).limit(20).exec();
  }

  async getSalesOrderById(id: string) {
    this.logger.log(`Fetching Sales Order by ID: ${id}`);
    const order = await this.saleModel.findById(id).exec();
    if (!order) {
      throw new RpcException({ message: `Không tìm thấy hóa đơn có ID: ${id}` });
    }
    return order;
  }

  async processReturn(data: any) {
    const { salesOrderId, items, soldBy } = data;
    this.logger.log(`Processing return for Sales Order: ${salesOrderId}`);
    const salesOrder = await this.saleModel.findById(salesOrderId).exec();
    if (!salesOrder) {
      throw new RpcException({ message: `Không tìm thấy hóa đơn có ID: ${salesOrderId}` });
    }

    const returnLogItems = [];

    for (const returnItem of items) {
      const { medicineId, quantity, reason } = returnItem;
      const orderItem = salesOrder.items.find(
        (it) => it.medicineId.toString() === medicineId.toString()
      );
      if (!orderItem) {
        throw new RpcException({ message: `Sản phẩm với ID ${medicineId} không có trong hóa đơn gốc` });
      }

      const currentReturned = orderItem.returnedQuantity || 0;
      const returnQuantity = Number(quantity);
      if (!Number.isInteger(returnQuantity) || returnQuantity <= 0) {
        throw new RpcException({ message: 'Số lượng trả phải là số nguyên dương' });
      }
      if (currentReturned + returnQuantity > orderItem.quantity) {
        throw new RpcException({
          message: `Số lượng trả vượt quá số lượng đã mua (Đã trả: ${currentReturned}, Yêu cầu trả thêm: ${returnQuantity}, Đã mua: ${orderItem.quantity})`
        });
      }

      orderItem.returnedQuantity = currentReturned + returnQuantity;

      if (reason === 'CHANGE_OF_MIND') {
        // Batch allocations are stored in the base unit. Convert the sold
        // package quantity back before restoring stock (e.g. 1 vỉ = 10 viên).
        let remainingToReturn = returnQuantity * (Number(orderItem.exchangeValue) || 1);
        const stockModel: any = salesOrder.branchId && salesOrder.branchId !== 'CENTRAL_WH'
          ? this.branchInvModel
          : this.batchModel;
        for (const batchAlloc of orderItem.batches) {
          if (remainingToReturn <= 0) break;
          const batchFilter: any = {
            medicineId: orderItem.medicineId,
            batchNo: batchAlloc.batchNo
          };
          if (stockModel === this.branchInvModel) batchFilter.branchId = salesOrder.branchId;
          const dbBatch = await stockModel.findOne(batchFilter).exec();

          if (dbBatch) {
            const restored = Math.min(batchAlloc.quantity, remainingToReturn);
            dbBatch.stock += restored;
            if (dbBatch.status === 'EXPIRED' && dbBatch.expDate >= new Date()) {
              dbBatch.status = 'ACTIVE';
            }
            await dbBatch.save();
            remainingToReturn -= restored;
          }
        }
        if (remainingToReturn > 0) {
          const activeBatchFilter: any = {
            medicineId: orderItem.medicineId,
            status: 'ACTIVE'
          };
          if (stockModel === this.branchInvModel) activeBatchFilter.branchId = salesOrder.branchId;
          const activeBatches = await stockModel.find(activeBatchFilter).sort({ expDate: 1 }).exec();
          if (activeBatches.length > 0) {
            activeBatches[0].stock += remainingToReturn;
            await activeBatches[0].save();
          }
        }
        // Cập nhật tồn kho tổng của thuốc
        await this.medicineModel.updateOne({ _id: orderItem.medicineId }, { $inc: { stock: returnQuantity * (Number(orderItem.exchangeValue) || 1) } }).exec();
      }

      returnLogItems.push({
        medicineId,
        name: orderItem.name,
        quantity: returnQuantity,
        reason,
        unit: orderItem.unit,
        price: orderItem.price
      });
    }

    const returnEntry = {
      returnedAt: new Date(),
      soldBy: soldBy || 'Dược sĩ',
      items: returnLogItems
    };

    salesOrder.returns = salesOrder.returns || [];
    salesOrder.returns.push(returnEntry);

    salesOrder.markModified('items');
    salesOrder.markModified('returns');
    await salesOrder.save();

    // Broadcast Real-time event cho WebSockets
    this.kafkaClient.emit('broadcast.inventory_updated', {
      event: 'RETURN_COMPLETED',
      timestamp: new Date().toISOString(),
      orderId: salesOrder._id.toString()
    });

    return {
      success: true,
      message: 'Xử lý trả hàng thành công!',
      data: salesOrder
    };
  }

  async processExchange(data: any) {
    const { salesOrderId, returnedItems, newItems, soldBy } = data;
    this.logger.log(`Processing exchange for Sales Order: ${salesOrderId}`);
    const salesOrder = await this.saleModel.findById(salesOrderId).exec();
    if (!salesOrder) {
      throw new RpcException({ message: `Không tìm thấy hóa đơn có ID: ${salesOrderId}` });
    }

    const today = new Date();
    const returnLogItems = [];

    for (const returnItem of returnedItems) {
      const { medicineId, quantity, reason } = returnItem;
      const orderItem = salesOrder.items.find(
        (it) => it.medicineId.toString() === medicineId.toString()
      );
      if (!orderItem) {
        throw new RpcException({ message: `Sản phẩm với ID ${medicineId} không có trong hóa đơn gốc` });
      }

      const currentReturned = orderItem.returnedQuantity || 0;
      const returnQuantity = Number(quantity);
      if (!Number.isInteger(returnQuantity) || returnQuantity <= 0) {
        throw new RpcException({ message: 'Số lượng đổi trả phải là số nguyên dương' });
      }
      if (currentReturned + returnQuantity > orderItem.quantity) {
        throw new RpcException({
          message: `Số lượng trả vượt quá số lượng đã mua (Đã trả: ${currentReturned}, Yêu cầu trả thêm: ${returnQuantity}, Đã mua: ${orderItem.quantity})`
        });
      }

      orderItem.returnedQuantity = currentReturned + returnQuantity;

      if (reason === 'CHANGE_OF_MIND') {
        let remainingToReturn = returnQuantity * (Number(orderItem.exchangeValue) || 1);
        const stockModel: any = salesOrder.branchId && salesOrder.branchId !== 'CENTRAL_WH'
          ? this.branchInvModel
          : this.batchModel;
        for (const batchAlloc of orderItem.batches) {
          if (remainingToReturn <= 0) break;
          const batchFilter: any = {
            medicineId: orderItem.medicineId,
            batchNo: batchAlloc.batchNo
          };
          if (stockModel === this.branchInvModel) batchFilter.branchId = salesOrder.branchId;
          const dbBatch = await stockModel.findOne(batchFilter).exec();

          if (dbBatch) {
            const restored = Math.min(batchAlloc.quantity, remainingToReturn);
            dbBatch.stock += restored;
            if (dbBatch.status === 'EXPIRED' && dbBatch.expDate >= new Date()) {
              dbBatch.status = 'ACTIVE';
            }
            await dbBatch.save();
            remainingToReturn -= restored;
          }
        }
        if (remainingToReturn > 0) {
          const activeBatchFilter: any = {
            medicineId: orderItem.medicineId,
            status: 'ACTIVE'
          };
          if (stockModel === this.branchInvModel) activeBatchFilter.branchId = salesOrder.branchId;
          const activeBatches = await stockModel.find(activeBatchFilter).sort({ expDate: 1 }).exec();
          if (activeBatches.length > 0) {
            activeBatches[0].stock += remainingToReturn;
            await activeBatches[0].save();
          }
        }
        // Cập nhật tồn kho tổng của thuốc trả
        await this.medicineModel.updateOne({ _id: orderItem.medicineId }, { $inc: { stock: returnQuantity * (Number(orderItem.exchangeValue) || 1) } }).exec();
      }

      returnLogItems.push({
        medicineId,
        name: orderItem.name,
        quantity: returnQuantity,
        reason,
        unit: orderItem.unit,
        price: orderItem.price
      });
    }

    const exchangeItems = [];
    let exchangeTotalAmount = 0;
    const allWarnings = [];

    for (const newItem of newItems) {
      const { medicineId } = newItem;
      const medicine = await this.medicineModel.findById(medicineId).exec();
      if (!medicine) {
        throw new RpcException({ message: `Không tìm thấy thuốc có ID: ${medicineId}` });
      }

      const selectedUnit = getSelectedUnit(medicine, newItem.unit);
      const exchangeValue = getUnitFactor(selectedUnit);
      const requestedQuantity = Number(newItem.quantity);
      if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
        throw new RpcException({ message: `Số lượng đổi của thuốc "${medicine.name}" phải là số nguyên dương` });
      }
      const requiredBaseQuantity = requestedQuantity * exchangeValue;
      const stockModel: any = salesOrder.branchId && salesOrder.branchId !== 'CENTRAL_WH'
        ? this.branchInvModel
        : this.batchModel;
      const batchFilter: any = {
        medicineId,
        status: 'ACTIVE',
        stock: { $gt: 0 }
      };
      if (stockModel === this.branchInvModel) batchFilter.branchId = salesOrder.branchId;
      const batches = await stockModel.find(batchFilter).sort({ expDate: 1 }).exec();

      const totalAvailable = batches.reduce((sum, b) => sum + b.stock, 0);
      if (totalAvailable < requiredBaseQuantity) {
        throw new RpcException({
          message: `Thuốc "${medicine.name}" không đủ tồn kho khả dụng để đổi (Yêu cầu: ${requiredBaseQuantity}, Khả dụng: ${totalAvailable})`
        });
      }

      let remainingQty = requiredBaseQuantity;
      const allocatedBatches = [];

      for (const batch of batches) {
        if (remainingQty <= 0) break;

        if (batch.expDate < today) {
          batch.status = 'EXPIRED';
          await batch.save();
          continue;
        }

        const diffTime = batch.expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 180) {
          allWarnings.push(
            `Lô "${batch.batchNo}" của thuốc "${medicine.name}" sắp hết hạn (HSD: ${batch.expDate.toLocaleDateString()} - Còn ${diffDays} ngày)`
          );
        }

        const deductQty = Math.min(batch.stock, remainingQty);
        batch.stock -= deductQty;
        remainingQty -= deductQty;

        allocatedBatches.push({ batchNo: batch.batchNo, quantity: deductQty });
      }

      if (remainingQty > 0) {
        throw new RpcException({
          message: `Không đủ lô hàng khả dụng còn hạn cho thuốc "${medicine.name}"`
        });
      }

      // Cập nhật tồn kho tổng của thuốc mới đổi
      await this.medicineModel.updateOne({ _id: medicineId }, { $inc: { stock: -requiredBaseQuantity } }).exec();

      const branchReferencePrice = await this.pricingService.resolvePrice(
        salesOrder.branchId,
        medicineId,
        'RETAIL',
        requestedQuantity,
      );
      const itemPrice = resolveUnitPrice(medicine, selectedUnit, branchReferencePrice);
      exchangeTotalAmount += itemPrice * requestedQuantity;

      exchangeItems.push({
        medicineId,
        name: medicine.name,
        quantity: requestedQuantity,
        price: itemPrice,
        unit: selectedUnit.unitName || medicine.unit || 'Hộp',
        exchangeValue,
        baseQuantity: requiredBaseQuantity,
        batches: allocatedBatches,
        dosageInstructions: buildRetailDosageInstruction({
          medicine,
          selectedUnit,
          baseUnitName: getUnitOptions(medicine).sort((a, b) => getUnitFactor(a) - getUnitFactor(b))[0]?.unitName,
        })
      });
    }

    const exchangeEntry = {
      exchangedAt: new Date(),
      soldBy: soldBy || 'Dược sĩ',
      returnedItems: returnLogItems,
      newItems: exchangeItems,
      totalNewItemsAmount: exchangeTotalAmount
    };

    salesOrder.exchanges = salesOrder.exchanges || [];
    salesOrder.exchanges.push(exchangeEntry);

    salesOrder.markModified('items');
    salesOrder.markModified('exchanges');
    await salesOrder.save();

    // Broadcast Real-time event cho WebSockets
    this.kafkaClient.emit('broadcast.inventory_updated', {
      event: 'EXCHANGE_COMPLETED',
      timestamp: new Date().toISOString(),
      orderId: salesOrder._id.toString()
    });

    return {
      success: true,
      message: 'Xử lý đổi hàng thành công!',
      warnings: allWarnings,
      data: salesOrder
    };
  }

  async getRevenueReportData(branchId: string, period: string, dateStr: string) {
    this.logger.log(`Generating revenue report data. Branch: ${branchId}, Period: ${period}, Date: ${dateStr}`);
    
    let targetDate = new Date();
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        targetDate = parsed;
      }
    }

    let startDate: Date;
    let endDate: Date;
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();

    if (period === 'day') {
      startDate = new Date(year, month, day, 0, 0, 0, 0);
      endDate = new Date(year, month, day, 23, 59, 59, 999);
    } else if (period === 'week') {
      const currentDay = targetDate.getDay();
      const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
      startDate = new Date(year, month, day - distanceToMonday, 0, 0, 0, 0);
      endDate = new Date(startDate.getTime());
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      startDate = new Date(year, month, 1, 0, 0, 0, 0);
      endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    } else if (period === 'quarter') {
      const quarter = Math.floor(month / 3);
      startDate = new Date(year, quarter * 3, 1, 0, 0, 0, 0);
      endDate = new Date(year, (quarter + 1) * 3, 0, 23, 59, 59, 999);
    } else {
      throw new RpcException({ message: 'Period không hợp lệ. Hỗ trợ: day, week, month, quarter' });
    }

    const query: any = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    if (branchId && branchId !== 'all' && branchId !== 'CENTRAL_WH') {
      query.branchId = branchId;
    }

    const orders = await this.saleModel.find(query).sort({ createdAt: 1 }).exec();

    let totalGrossRevenue = 0;
    let totalReturnedAmount = 0;
    let totalExchangedOutAmount = 0;
    let netRevenue = 0;
    const paymentMethodBreakdown = {
      CASH: { count: 0, amount: 0 },
      CARD: { count: 0, amount: 0 },
      QR_PAY: { count: 0, amount: 0 }
    };

    const details = orders.map(order => {
      const gross = order.totalAmount || 0;
      
      const returned = (order.returns || []).reduce((sum, r) => {
        return sum + (r.items || []).reduce((s: number, it: any) => s + ((it.quantity || 0) * (it.price || 0)), 0);
      }, 0) + (order.exchanges || []).reduce((sum, e) => {
        return sum + (e.returnedItems || []).reduce((s: number, it: any) => s + ((it.quantity || 0) * (it.price || 0)), 0);
      }, 0);

      const exchangedOut = (order.exchanges || []).reduce((sum, e) => {
        return sum + (e.newItems || []).reduce((s: number, it: any) => s + ((it.quantity || 0) * (it.price || 0)), 0);
      }, 0);

      const net = gross - returned + exchangedOut;

      totalGrossRevenue += gross;
      totalReturnedAmount += returned;
      totalExchangedOutAmount += exchangedOut;
      netRevenue += net;

      const method = (order.paymentMethod || 'CASH').toUpperCase() as 'CASH' | 'CARD' | 'QR_PAY';
      if (paymentMethodBreakdown[method]) {
        paymentMethodBreakdown[method].count += 1;
        paymentMethodBreakdown[method].amount += net;
      }

      return {
        orderId: order._id.toString(),
        orderCode: order.orderCode,
        patientName: order.patientName || 'Khách lẻ',
        patientPhone: order.patientPhone || '',
        type: order.type || 'RETAIL',
        paymentMethod: order.paymentMethod,
        soldBy: order.soldBy,
        createdAt: (order as any).createdAt,
        branchId: order.branchId,
        gross,
        returned,
        exchangedOut,
        net
      };
    });

    return {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      branchId: branchId || 'all',
      summary: {
        totalOrders: orders.length,
        totalGrossRevenue,
        totalReturnedAmount,
        totalExchangedOutAmount,
        netRevenue,
        paymentMethodBreakdown
      },
      orders: details
    };
  }

  async getProfitReportData(branchId: string, period: string, dateStr: string) {
    this.logger.log(`Generating profit report data. Branch: ${branchId}, Period: ${period}, Date: ${dateStr}`);
    
    let targetDate = new Date();
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        targetDate = parsed;
      }
    }

    let startDate: Date;
    let endDate: Date;
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();

    if (period === 'day') {
      startDate = new Date(year, month, day, 0, 0, 0, 0);
      endDate = new Date(year, month, day, 23, 59, 59, 999);
    } else if (period === 'week') {
      const currentDay = targetDate.getDay();
      const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
      startDate = new Date(year, month, day - distanceToMonday, 0, 0, 0, 0);
      endDate = new Date(startDate.getTime());
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      startDate = new Date(year, month, 1, 0, 0, 0, 0);
      endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    } else if (period === 'quarter') {
      const quarter = Math.floor(month / 3);
      startDate = new Date(year, quarter * 3, 1, 0, 0, 0, 0);
      endDate = new Date(year, (quarter + 1) * 3, 0, 23, 59, 59, 999);
    } else {
      throw new RpcException({ message: 'Period không hợp lệ. Hỗ trợ: day, week, month, quarter' });
    }

    const query: any = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    if (branchId && branchId !== 'all' && branchId !== 'CENTRAL_WH') {
      query.branchId = branchId;
    }

    const orders = await this.saleModel.find(query).sort({ createdAt: 1 }).exec();

    let totalGrossRevenue = 0;
    let totalReturnedAmount = 0;
    let totalExchangedOutAmount = 0;
    let netRevenue = 0;
    let totalCogs = 0;
    const paymentMethodBreakdown = {
      CASH: { count: 0, amount: 0 },
      CARD: { count: 0, amount: 0 },
      QR_PAY: { count: 0, amount: 0 }
    };

    const details = orders.map(order => {
      const gross = order.totalAmount || 0;
      
      const returned = (order.returns || []).reduce((sum, r) => {
        return sum + (r.items || []).reduce((s: number, it: any) => s + ((it.quantity || 0) * (it.price || 0)), 0);
      }, 0) + (order.exchanges || []).reduce((sum, e) => {
        return sum + (e.returnedItems || []).reduce((s: number, it: any) => s + ((it.quantity || 0) * (it.price || 0)), 0);
      }, 0);

      const exchangedOut = (order.exchanges || []).reduce((sum, e) => {
        return sum + (e.newItems || []).reduce((s: number, it: any) => s + ((it.quantity || 0) * (it.price || 0)), 0);
      }, 0);

      const net = gross - returned + exchangedOut;

      // Tính toán COGS thực tế
      let orderCogs = 0;
      for (const item of order.items) {
        const retainedRatio = item.quantity > 0 ? Math.max(0, 1 - (item.returnedQuantity || 0) / item.quantity) : 0;
        const originalItemCogs = (item.batches || []).reduce((sum, b) => {
          const costPrice = b.importPrice || (item.price * 0.65); // Fallback về 65% nếu chưa có importPrice (lịch sử)
          return sum + (b.quantity * costPrice);
        }, 0);
        orderCogs += originalItemCogs * retainedRatio;
      }
      
      // Giả lập giá vốn 65% cho mặt hàng đổi mới
      orderCogs += exchangedOut * 0.65;

      const profit = net - orderCogs;

      totalGrossRevenue += gross;
      totalReturnedAmount += returned;
      totalExchangedOutAmount += exchangedOut;
      netRevenue += net;
      totalCogs += orderCogs;

      const method = (order.paymentMethod || 'CASH').toUpperCase() as 'CASH' | 'CARD' | 'QR_PAY';
      if (paymentMethodBreakdown[method]) {
        paymentMethodBreakdown[method].count += 1;
        paymentMethodBreakdown[method].amount += net;
      }

      return {
        orderId: order._id.toString(),
        orderCode: order.orderCode,
        patientName: order.patientName || 'Khách lẻ',
        patientPhone: order.patientPhone || '',
        type: order.type || 'RETAIL',
        paymentMethod: order.paymentMethod,
        soldBy: order.soldBy,
        createdAt: (order as any).createdAt,
        gross,
        returned,
        exchangedOut,
        net,
        cogs: Math.round(orderCogs),
        profit: Math.round(profit)
      };
    });

    const totalProfit = netRevenue - totalCogs;
    const profitMargin = netRevenue > 0 ? (totalProfit / netRevenue) * 100 : 0;

    return {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      branchId: branchId || 'all',
      summary: {
        totalOrders: orders.length,
        totalGrossRevenue,
        totalReturnedAmount,
        totalExchangedOutAmount,
        netRevenue,
        totalCogs: Math.round(totalCogs),
        totalProfit: Math.round(totalProfit),
        profitMargin: Number(profitMargin.toFixed(2)),
        paymentMethodBreakdown
      },
      orders: details
    };
  }

  async getInventoryPerformance(branchId: string, startDateStr: string, endDateStr: string) {
    this.logger.log(`Generating inventory performance report. Branch: ${branchId}`);
    
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Default to last 30 days
    if (startDateStr) startDate = new Date(startDateStr);
    
    let endDate = new Date();
    if (endDateStr) endDate = new Date(endDateStr);

    const query: any = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    if (branchId && branchId !== 'all' && branchId !== 'CENTRAL_WH') {
      query.branchId = branchId;
    }

    // 1. Top Selling Products
    const topSelling = await this.saleModel.aggregate([
      { $match: query },
      { $unwind: "$items" },
      { $group: {
          _id: "$items.medicineId",
          name: { $first: "$items.name" },
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 20 }
    ]);

    // 2. Slow Moving Products (Dead Stock)
    // Find medicines that have stock > 0 but were NOT in any sales order in the given period
    const activeMedicineIds = await this.saleModel.distinct("items.medicineId", query);
    
    const slowMovingQuery: any = {
      stock: { $gt: 0 },
      _id: { $nin: activeMedicineIds }
    };
    
    const slowMovingMedicines = await this.medicineModel
      .find(slowMovingQuery)
      .sort({ stock: -1 })
      .limit(50)
      .select('name sku stock category unit price createdAt')
      .lean();

    return {
      period: { startDate, endDate },
      branchId: branchId || 'all',
      topSelling: topSelling.map(t => ({
        medicineId: t._id,
        name: t.name,
        totalQuantity: t.totalQuantity,
        totalRevenue: t.totalRevenue
      })),
      slowMoving: slowMovingMedicines.map(m => ({
        medicineId: m._id,
        name: m.name,
        sku: (m as any).sku || 'N/A',
        stock: m.stock,
        price: m.price || 0,
        unit: m.unit || 'Hộp',
        daysInStock: Math.floor((Date.now() - new Date((m as any).createdAt).getTime()) / (1000 * 3600 * 24))
      }))
    };
  }
}
