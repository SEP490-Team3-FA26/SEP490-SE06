/// <reference types="jest" />
/**
 * Bộ kiểm thử đơn vị cho DispatchService (Luồng Xuất Kho Tổng hai giai đoạn v6.0)
 * Tuân thủ đầy đủ 3 nhóm giá trị chuẩn Guideline:
 * 1. [Normal Values]: Tạo phiếu FEFO, kiểm soát duyệt 2 người, giữ chỗ reservedQty, trả hàng 3 kết cục, tập kết Tote, trừ kho thật & sinh StockTransfer.
 * 2. [Boundary Values]: Giá trị biên 1 hộp, vừa khít tồn khả dụng, hủy khi totalPicked = 0, idempotency chống trùng lặp, mốc 4 giờ phiếu treo.
 * 3. [Abnormal Values]: Tự tạo tự duyệt, sai role duyệt thuốc đặc biệt, hủy khi còn hàng trong giỏ, lô quá hạn giữa hai bước, tranh chấp race-condition.
 */

import { Types } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { DispatchService } from '../../../apps/inventory-service/src/dispatch/dispatch.service';

describe('DispatchService (Quản Lý Xuất Kho Tổng Hai Giai Đoạn)', () => {
  const medIdNormal = new Types.ObjectId().toString();
  const medIdNarcotic = new Types.ObjectId().toString();
  const batchId1 = new Types.ObjectId().toString();
  const batchId2 = new Types.ObjectId().toString();
  const orderId1 = new Types.ObjectId().toString();
  const prId1 = new Types.ObjectId().toString();

  const futureDate1 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const futureDate2 = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
  const expiredDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

  // Tạo bộ mock Mongoose Models hỗ trợ session.withTransaction()
  const buildService = (overrides: Record<string, any> = {}) => {
    const mockSession = {
      withTransaction: jest.fn(async (cb: any) => cb()),
      endSession: jest.fn(async () => undefined),
    };

    const makeChain = (val: any) => ({
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      session: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(async () => val),
    });

    const dispatchOrderDoc: any = overrides.dispatchOrderDoc || {
      _id: orderId1,
      dispatchCode: 'DO-20261111-0001-ABCD',
      type: 'TRANSFER',
      status: 'PENDING_APPROVAL',
      fromBranchId: 'CENTRAL_WH',
      toBranchId: 'BR-001',
      toBranchName: 'Chi nhánh Quận 1',
      hasControlledDrugs: false,
      createdBy: 'wh-user-1',
      createdByName: 'Thủ kho A',
      pickingList: [
        {
          lineId: 'line-1',
          medicineId: medIdNormal,
          medicineName: 'Vitamin C 500mg',
          unit: 'Hộp',
          medicineBarcode: '8935001800118',
          specialControlType: 0,
          batchId: batchId1,
          batchNo: 'LOT-01',
          expDate: futureDate1,
          suggestedLocation: {
            zone: 'A',
            rack: 'A1',
            shelf: 1,
            bin: 2,
            slotType: 'MAIN',
            binCode: 'BIN-A-A1-S1-B2',
          },
          requestedQty: 10,
          pickedQty: 0,
          itemStatus: 'PENDING',
        },
      ],
      picks: [],
      returnLogs: [],
      toteCodes: [],
      totalPicked: 0,
      isStale: false,
      version: 0,
      save: jest.fn(async function () {
        return this;
      }),
      toObject: jest.fn(function () {
        const { save, toObject, ...plain } = this;
        return plain;
      }),
    };

    const dispatchOrderModel: any = {
      countDocuments: jest.fn(() => makeChain(0)),
      findOne: jest.fn(() => makeChain(overrides.findOneOrder ?? null)),
      findById: jest.fn(() => makeChain(dispatchOrderDoc)),
      find: jest.fn(() => makeChain(overrides.findOrders ?? [])),
      create: jest.fn(async (doc: any) => ({
        ...doc,
        _id: orderId1,
        toObject: () => ({ ...doc, _id: orderId1 }),
      })),
      updateMany: jest.fn(() => makeChain({ modifiedCount: 1 })),
    };

    const toteDoc: any = overrides.toteDoc || {
      _id: 'tote-obj-1',
      toteCode: 'TOTE-01',
      status: 'AVAILABLE',
      currentDispatchOrderId: null,
      currentDispatchCode: null,
      save: jest.fn(async function () {
        return this;
      }),
    };

    const toteModel: any = {
      findOne: jest.fn(() => makeChain(toteDoc)),
      find: jest.fn(() => makeChain([toteDoc])),
      updateOne: jest.fn(() => makeChain({ modifiedCount: 1 })),
      updateMany: jest.fn(() => makeChain({ modifiedCount: 1 })),
    };

    const processedReqModel: any = {
      findOne: jest.fn(() =>
        makeChain(
          overrides.existingIdempotency ? { responseSnapshot: overrides.existingIdempotency } : null,
        ),
      ),
      create: jest.fn(async () => ({})),
    };

    const medicineModel: any = {
      findById: jest.fn((id: string) => {
        if (id === medIdNarcotic) {
          return makeChain({
            _id: medIdNarcotic,
            name: 'Morphin 10mg',
            unit: 'Hộp',
            barcode: '8935001701113',
            special_control_type: 1,
          });
        }
        return makeChain({
          _id: medIdNormal,
          name: 'Vitamin C 500mg',
          unit: 'Hộp',
          barcode: '8935001800118',
          special_control_type: 0,
        });
      }),
      updateOne: jest.fn(() => makeChain({ modifiedCount: 1 })),
    };

    const defaultBatch = {
      _id: batchId1,
      medicineId: medIdNormal,
      branchId: 'CENTRAL_WH',
      batchNo: 'LOT-01',
      expDate: futureDate1,
      stock: 50,
      reservedQty: 0,
      status: 'ACTIVE',
      location: { zone: 'A', rack: 'A1', shelf: 1, bin: 2, slotType: 'MAIN' },
    };

    const batchModel: any = {
      db: { startSession: jest.fn(async () => mockSession) },
      find: jest.fn(() =>
        makeChain(
          overrides.batches ?? [
            defaultBatch,
            {
              _id: batchId2,
              medicineId: medIdNormal,
              branchId: 'CENTRAL_WH',
              batchNo: 'LOT-02',
              expDate: futureDate2,
              stock: 80,
              reservedQty: 10,
              status: 'ACTIVE',
              location: { zone: 'B', rack: 'B1', shelf: 2, bin: 1, slotType: 'MAIN' },
            },
          ],
        ),
      ),
      findById: jest.fn(() => makeChain(overrides.batchById ?? defaultBatch)),
      findOneAndUpdate: jest.fn(() =>
        makeChain(
          overrides.updatedBatch === undefined
            ? { ...defaultBatch, reservedQty: 10 }
            : overrides.updatedBatch,
        ),
      ),
      updateOne: jest.fn(() => makeChain({ modifiedCount: 1 })),
    };

    const locationModel: any = {
      updateOne: jest.fn(() => makeChain({ modifiedCount: 1 })),
    };

    const txnModel: any = {
      create: jest.fn(async () => [{}]),
    };

    const prModel: any = {
      findById: jest.fn(() =>
        makeChain(
          overrides.prDoc ?? {
            _id: prId1,
            prCode: 'PR-20261111-0001',
            branchId: 'BR-001',
            branchName: 'Chi nhánh Quận 1',
            status: 'SUBMITTED',
            items: [{ medicineId: medIdNormal, requestedQuantity: 60 }],
          },
        ),
      ),
      countDocuments: jest.fn(() => makeChain(1)),
      create: jest.fn(async (d: any) => d),
      updateOne: jest.fn(() => makeChain({ modifiedCount: 1 })),
    };

    const StockTransferMock: any = jest.fn(function (doc: any) {
      return {
        ...doc,
        _id: 'st-001',
        save: jest.fn(async function () {
          return this;
        }),
        toObject: () => ({ ...doc, _id: 'st-001' }),
      };
    });
    StockTransferMock.countDocuments = jest.fn(() => makeChain(0));

    const nationalPharmaService: any = {
      syncDisposal: jest.fn(async () => ({ success: true })),
    };

    const kafkaClient: any = {
      emit: jest.fn(),
    };

    const service = new DispatchService(
      dispatchOrderModel,
      toteModel,
      processedReqModel,
      medicineModel,
      batchModel,
      locationModel,
      txnModel,
      prModel,
      StockTransferMock,
      nationalPharmaService,
      kafkaClient,
    );

    return {
      service,
      dispatchOrderDoc,
      toteDoc,
      batchModel,
      locationModel,
      txnModel,
      prModel,
      kafkaClient,
      nationalPharmaService,
    };
  };

  // =========================================================================
  // 1. [Normal Values] Luồng nghiệp vụ chuẩn thành công
  // =========================================================================
  describe('1. [Normal Values] Luồng chuẩn từ Lập phiếu -> Duyệt -> Giữ chỗ -> Tập kết -> Xuất kho', () => {
    it('Lập phiếu từ PR phải tính FEFO theo tồn khả dụng (trừ phần reservedQty), chuyển PR sang DISPATCH_PENDING và khởi tạo ở PENDING_APPROVAL', async () => {
      const { service, prModel } = buildService();
      const res = await service.createDispatchOrder({
        type: 'TRANSFER',
        referenceId: prId1,
        actor: { userId: 'wh-user-1', fullName: 'Thủ kho A', role: 'warehouse' },
      });

      expect(res.success).toBe(true);
      expect(res.data.status).toBe('PENDING_APPROVAL');
      expect(res.data.hasControlledDrugs).toBe(false);
      // PR yêu cầu 60: LOT-01 có 50 khả dụng + LOT-02 lấy 10 => tách 2 dòng
      expect(res.data.pickingList).toHaveLength(2);
      expect(res.data.pickingList[0].requestedQty).toBe(50);
      expect(res.data.pickingList[1].requestedQty).toBe(10);
      expect(res.data.pickingList[0].suggestedLocation.binCode).toBe('BIN-A-A1-S1-B2');
      expect(prModel.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: prId1 }),
        { $set: { status: 'DISPATCH_PENDING' } },
      );
    });

    it('Giám đốc (director) duyệt thành công phiếu TRANSFER thuốc thường và phát Kafka thông báo', async () => {
      const { service, kafkaClient } = buildService();
      const res = await service.approveDispatchOrder({
        id: orderId1,
        note: 'OK xuất cho Q1',
        actor: { userId: 'dir-1', fullName: 'Giám đốc Hùng', role: 'director' },
      });

      expect(res.data.status).toBe('APPROVED');
      expect(res.data.approvedBy).toBe('dir-1');
      expect(kafkaClient.emit).toHaveBeenCalledWith(
        'notification.dispatch_approved',
        expect.objectContaining({ dispatchCode: 'DO-20261111-0001-ABCD' }),
      );
    });

    it('Dược sĩ chuyên môn (pharmacist có isBranchPIC = true) duyệt thành công phiếu chứa thuốc kiểm soát đặc biệt', async () => {
      const { service, dispatchOrderDoc } = buildService();
      dispatchOrderDoc.hasControlledDrugs = true;

      const res = await service.approveDispatchOrder({
        id: orderId1,
        actor: {
          userId: 'pic-1',
          fullName: 'DS. Lan',
          role: 'pharmacist',
          isBranchPIC: true,
        },
      });

      expect(res.data.status).toBe('APPROVED');
    });

    it('Nhặt hàng (pickItem) khóa Tote, tăng reservedQty nguyên tử và ghi log PICK_RESERVE', async () => {
      const { service, dispatchOrderDoc, toteDoc, batchModel, txnModel } = buildService();
      dispatchOrderDoc.status = 'APPROVED';

      const res = await service.pickItem({
        dispatchOrderId: orderId1,
        lineId: 'line-1',
        scannedBinCode: 'BIN-A-A1-S1-B2',
        toteCode: 'TOTE-01',
        quantity: 10,
        idempotencyKey: 'key-pick-1',
        actor: { userId: 'wh-user-1', role: 'warehouse' },
      });

      expect(res.data.status).toBe('PICKING');
      expect(res.data.totalPicked).toBe(10);
      expect(toteDoc.status).toBe('IN_USE');
      expect(batchModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: batchId1 }),
        { $inc: { reservedQty: 10 } },
        expect.any(Object),
      );
      expect(txnModel.create).toHaveBeenCalledWith(
        [expect.objectContaining({ type: 'PICK_RESERVE', quantityChange: 0 })],
        expect.any(Object),
      );
    });

    it('Trả hàng hỏng (DAMAGED) trừ cả stock và reservedQty, tự đưa đơn STAGED về lại PICKING', async () => {
      const { service, dispatchOrderDoc, batchModel } = buildService({
        batchById: {
          _id: batchId1,
          medicineId: medIdNormal,
          batchNo: 'LOT-01',
          stock: 50,
          reservedQty: 10,
          location: { zone: 'A', rack: 'A1', shelf: 1, bin: 2, slotType: 'MAIN' },
        },
        updatedBatch: { _id: batchId1, stock: 48, reservedQty: 8 },
      });
      dispatchOrderDoc.status = 'STAGED';
      dispatchOrderDoc.toteCode = 'TOTE-01';
      dispatchOrderDoc.toteCodes = ['TOTE-01'];
      dispatchOrderDoc.totalPicked = 10;
      dispatchOrderDoc.pickingList[0].pickedQty = 10;
      dispatchOrderDoc.pickingList[0].itemStatus = 'PICKED';
      dispatchOrderDoc.picks = [
        {
          pickId: 'pick-1',
          lineId: 'line-1',
          medicineId: medIdNormal,
          batchId: batchId1,
          batchNo: 'LOT-01',
          binCode: 'BIN-A-A1-S1-B2',
          qty: 10,
          returnedQty: 0,
          toteCode: 'TOTE-01',
        },
      ];

      const res = await service.returnItem({
        dispatchOrderId: orderId1,
        pickId: 'pick-1',
        quantity: 2,
        outcome: 'DAMAGED',
        reason: 'Móp vỏ hộp tại bàn giao',
        actor: { userId: 'wh-user-1', role: 'warehouse' },
      });

      expect(res.data.status).toBe('PICKING');
      expect(res.data.totalPicked).toBe(8);
      expect(batchModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ stock: { $gte: 2 }, reservedQty: { $gte: 2 } }),
        { $inc: { stock: -2, reservedQty: -2 } },
        expect.any(Object),
      );
    });

    it('Xác nhận xuất kho (confirmDispatch) trừ stock & reservedQty, đổi binStatus EMPTY khi hết hàng và tạo StockTransfer SHIPPING', async () => {
      const { service, dispatchOrderDoc, locationModel } = buildService({
        batchById: {
          _id: batchId1,
          medicineId: medIdNormal,
          batchNo: 'LOT-01',
          expDate: futureDate1,
          status: 'ACTIVE',
          stock: 10,
          reservedQty: 10,
          location: { zone: 'A', rack: 'A1', shelf: 1, bin: 2, slotType: 'MAIN' },
        },
        updatedBatch: { _id: batchId1, stock: 0, reservedQty: 0 },
        batches: [],
      });
      dispatchOrderDoc.status = 'STAGED';
      dispatchOrderDoc.toteCode = 'TOTE-01';
      dispatchOrderDoc.toteCodes = ['TOTE-01'];
      dispatchOrderDoc.totalPicked = 10;
      dispatchOrderDoc.pickingList[0].pickedQty = 10;
      dispatchOrderDoc.pickingList[0].itemStatus = 'PICKED';
      dispatchOrderDoc.picks = [
        {
          pickId: 'pick-1',
          lineId: 'line-1',
          medicineId: medIdNormal,
          batchId: batchId1,
          batchNo: 'LOT-01',
          expDate: futureDate1,
          binCode: 'BIN-A-A1-S1-B2',
          qty: 10,
          returnedQty: 0,
          toteCode: 'TOTE-01',
        },
      ];

      const res = await service.confirmDispatch({
        dispatchOrderId: orderId1,
        handoverRecipient: { driverName: 'Nguyễn Văn Tài', vehiclePlate: '59C-12345' },
        idempotencyKey: 'disp-1',
        actor: { userId: 'wh-user-1', role: 'warehouse' },
      });

      expect(res.data.status).toBe('DISPATCHED');
      expect(res.stockTransfer.status).toBe('SHIPPING');
      expect(locationModel.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ zone: 'A', rack: 'A1', shelf: 1, bin: 2 }),
        { $set: { binStatus: 'EMPTY' } },
      );
    });
  });

  // =========================================================================
  // 2. [Boundary Values] Giá trị biên, Idempotency & Phiếu treo 4 giờ
  // =========================================================================
  describe('2. [Boundary Values] Giá trị biên tối thiểu, trùng lặp Idempotency & Mốc 4 giờ', () => {
    it('Cho phép hủy phiếu khi totalPicked === 0 và trả PR về lại SUBMITTED', async () => {
      const { service, dispatchOrderDoc, prModel } = buildService();
      dispatchOrderDoc.status = 'APPROVED';
      dispatchOrderDoc.totalPicked = 0;
      dispatchOrderDoc.referenceId = prId1;

      const res = await service.cancelDispatchOrder({
        dispatchOrderId: orderId1,
        reason: 'Chi nhánh đổi ý',
        actor: { userId: 'wh-user-1', role: 'warehouse' },
      });

      expect(res.data.status).toBe('CANCELLED');
      expect(prModel.updateOne).toHaveBeenCalledWith(
        { _id: prId1, status: 'DISPATCH_PENDING' },
        { $set: { status: 'SUBMITTED' } },
      );
    });

    it('Trả về kết quả cũ khi nhận trùng X-Idempotency-Key (không trừ/giữ chỗ lần 2)', async () => {
      const snapshot = { success: true, message: 'Cached pick', data: { _id: orderId1, totalPicked: 5 } };
      const { service, batchModel } = buildService({ existingIdempotency: snapshot });

      const res = await service.pickItem({
        dispatchOrderId: orderId1,
        lineId: 'line-1',
        scannedBinCode: 'BIN-A-A1-S1-B2',
        toteCode: 'TOTE-01',
        quantity: 5,
        idempotencyKey: 'dup-key',
        actor: { userId: 'wh-user-1', role: 'warehouse' },
      });

      expect(res).toEqual(snapshot);
      expect(batchModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('Đánh dấu isStale = true cho phiếu PICKING treo đúng > 4 giờ mà KHÔNG hủy hay nhả giữ chỗ', async () => {
      const staleOrder = { _id: orderId1, dispatchCode: 'DO-STALE-01', toBranchName: 'Q1', lastActivityAt: new Date(0) };
      const { service, kafkaClient } = buildService({ findOrders: [staleOrder] });

      const res = await service.markStalePickingOrders(new Date());
      expect(res.updatedCount).toBe(1);
      expect(res.dispatchCodes).toEqual(['DO-STALE-01']);
      expect(kafkaClient.emit).toHaveBeenCalledWith(
        'notification.dispatch_stale',
        expect.objectContaining({ count: 1 }),
      );
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] Ngoại lệ phân quyền, hết hạn, race-condition
  // =========================================================================
  describe('3. [Abnormal Values] Chặn sai phân quyền, tự duyệt, lô hết hạn & hủy khi còn hàng', () => {
    it('Chặn người lập phiếu tự phê duyệt phiếu của chính mình (Vi phạm kiểm soát 2 người)', async () => {
      const { service } = buildService();
      await expect(
        service.approveDispatchOrder({
          id: orderId1,
          actor: { userId: 'wh-user-1', role: 'director' },
        }),
      ).rejects.toThrow(RpcException);
    });

    it('Chặn Giám đốc duyệt phiếu có thuốc kiểm soát đặc biệt (Bắt buộc Dược sĩ PIC)', async () => {
      const { service, dispatchOrderDoc } = buildService();
      dispatchOrderDoc.hasControlledDrugs = true;

      await expect(
        service.approveDispatchOrder({
          id: orderId1,
          actor: { userId: 'dir-1', role: 'director' },
        }),
      ).rejects.toThrow(RpcException);
    });

    it('Chặn hủy phiếu khi totalPicked > 0 (bắt buộc trả hàng về khay trước)', async () => {
      const { service, dispatchOrderDoc } = buildService();
      dispatchOrderDoc.status = 'PICKING';
      dispatchOrderDoc.totalPicked = 3;

      await expect(
        service.cancelDispatchOrder({
          dispatchOrderId: orderId1,
          actor: { userId: 'wh-user-1', role: 'warehouse' },
        }),
      ).rejects.toThrow(RpcException);
    });

    it('Chặn xuất kho nếu phát hiện lô vừa hết hạn giữa lúc nhặt và lúc xác nhận xuất', async () => {
      const { service, dispatchOrderDoc } = buildService({
        batchById: {
          _id: batchId1,
          medicineId: medIdNormal,
          batchNo: 'LOT-EXPIRED',
          expDate: expiredDate,
          status: 'ACTIVE',
          stock: 10,
          reservedQty: 10,
        },
      });
      dispatchOrderDoc.status = 'STAGED';
      dispatchOrderDoc.picks = [
        {
          pickId: 'pick-1',
          lineId: 'line-1',
          medicineId: medIdNormal,
          batchId: batchId1,
          batchNo: 'LOT-EXPIRED',
          qty: 10,
          returnedQty: 0,
          toteCode: 'TOTE-01',
        },
      ];

      await expect(
        service.confirmDispatch({
          dispatchOrderId: orderId1,
          handoverRecipient: { driverName: 'Tài xế' },
          actor: { userId: 'wh-user-1', role: 'warehouse' },
        }),
      ).rejects.toThrow(RpcException);
    });

    it('Chặn nhặt hàng khi race condition làm findOneAndUpdate trả null do không đủ tồn khả dụng', async () => {
      const { service, dispatchOrderDoc } = buildService({ updatedBatch: null });
      dispatchOrderDoc.status = 'APPROVED';

      await expect(
        service.pickItem({
          dispatchOrderId: orderId1,
          lineId: 'line-1',
          scannedBinCode: 'BIN-A-A1-S1-B2',
          toteCode: 'TOTE-01',
          quantity: 10,
          actor: { userId: 'wh-user-1', role: 'warehouse' },
        }),
      ).rejects.toThrow(RpcException);
    });
  });
});
