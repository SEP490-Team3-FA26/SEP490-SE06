/// <reference types="jest" />
/**
 * Bộ kiểm thử đơn vị cho Script Migration Xuất Kho Tổng v6.0 (migrate-dispatch-v6.js)
 * Tuân thủ đủ 3 nhóm giá trị chuẩn: [Normal Values], [Boundary Values], [Abnormal Values]
 */

const { runDispatchV6Migration } = require('../../../scripts/migrate-dispatch-v6');

describe('Migration Xuất Kho v6.0 (reservedQty, binStatus, Seed Totes)', () => {
  // Hàm tạo giả lập đối tượng collection MongoDB trong bộ nhớ
  const createMockDb = ({ batches = [], locations = [], existingTotes = [] }) => {
    const updateCalls = { batches: 0, locations: [], totes: [] };

    const batchesCol = {
      updateMany: jest.fn(async () => {
        let modifiedCount = 0;
        batches.forEach((b) => {
          if (b.reservedQty === undefined || b.reservedQty === null || b.reservedQty < 0) {
            b.reservedQty = 0;
            modifiedCount++;
          }
        });
        updateCalls.batches = modifiedCount;
        return { modifiedCount };
      }),
      find: jest.fn((query) => ({
        toArray: async () =>
          batches.filter(
            (b) =>
              b.branchId === query.branchId &&
              b.location?.zone === query['location.zone'] &&
              b.location?.rack === query['location.rack'] &&
              b.location?.shelf === query['location.shelf'] &&
              b.location?.bin === query['location.bin'] &&
              b.location?.slotType === query['location.slotType'],
          ),
      })),
    };

    const locationsCol = {
      find: jest.fn(() => ({ toArray: async () => locations })),
      updateOne: jest.fn(async ({ _id }, { $set }) => {
        const target = locations.find((l) => l._id === _id);
        if (target) target.binStatus = $set.binStatus;
        updateCalls.locations.push({ _id, ...$set });
        return { modifiedCount: 1 };
      }),
    };

    const totesCol = {
      updateOne: jest.fn(async ({ toteCode }, { $setOnInsert }) => {
        const existed = existingTotes.find((t) => t.toteCode === toteCode);
        if (!existed) {
          existingTotes.push({ ...$setOnInsert });
          updateCalls.totes.push(toteCode);
          return { upsertedCount: 1 };
        }
        return { upsertedCount: 0 };
      }),
    };

    return {
      collection: jest.fn((name) => {
        if (name === 'medicinebatches') return batchesCol;
        if (name === 'medicinelocations') return locationsCol;
        if (name === 'totes') return totesCol;
        throw new Error(`Unknown collection ${name}`);
      }),
    };
  };

  describe('1. [Normal Values] Khởi tạo chuẩn dữ liệu v6.0', () => {
    it('Đặt reservedQty = 0 cho lô cũ, cập nhật binStatus đúng và seed đủ 10 Tote mới', async () => {
      const mockDb = createMockDb({
        batches: [
          {
            _id: 'b1',
            branchId: 'CENTRAL_WH',
            stock: 50,
            location: { zone: 'A', rack: 'A1', shelf: 1, bin: 1, slotType: 'MAIN' },
          },
          {
            _id: 'b2',
            branchId: 'CENTRAL_WH',
            stock: 0,
            location: { zone: 'A', rack: 'A1', shelf: 1, bin: 2, slotType: 'MAIN' },
          },
        ],
        locations: [
          { _id: 'loc1', zone: 'A', rack: 'A1', shelf: 1, bin: 1 },
          { _id: 'loc2', zone: 'A', rack: 'A1', shelf: 1, bin: 2 },
        ],
      });

      const res = await runDispatchV6Migration(mockDb);

      expect(res.batchesUpdated).toBe(2);
      expect(res.locationsMarkedOccupied).toBe(1);
      expect(res.locationsMarkedEmpty).toBe(1);
      expect(res.totesSeeded).toBe(10);
    });
  });

  describe('2. [Boundary Values] Tính Idempotency khi chạy lại nhiều lần và bảo toàn Tote đang IN_USE', () => {
    it('Chạy lần 2 không sửa thêm bản ghi nào và không ghi đè Tote đang IN_USE', async () => {
      const existingTotes = [
        { toteCode: 'TOTE-01', status: 'IN_USE', currentDispatchOrderId: 'DO-001' },
      ];
      const batches = [
        {
          _id: 'b1',
          branchId: 'CENTRAL_WH',
          stock: 10,
          reservedQty: 5,
          location: { zone: 'A', rack: 'A1', shelf: 1, bin: 1, slotType: 'MAIN' },
        },
      ];
      const locations = [
        { _id: 'loc1', zone: 'A', rack: 'A1', shelf: 1, bin: 1, binStatus: 'OCCUPIED' },
      ];

      const mockDb = createMockDb({ batches, locations, existingTotes });
      const res = await runDispatchV6Migration(mockDb);

      expect(res.batchesUpdated).toBe(0);
      expect(res.locationsMarkedOccupied).toBe(0);
      expect(res.locationsMarkedEmpty).toBe(0);
      expect(res.totesSeeded).toBe(9);
      expect(existingTotes.find((t) => t.toteCode === 'TOTE-01').status).toBe('IN_USE');
      expect(batches[0].reservedQty).toBe(5);
    });
  });

  describe('3. [Abnormal Values] Dữ liệu hỏng, giá trị âm hoặc thiếu kết nối DB', () => {
    it('Ném lỗi rõ ràng khi không truyền đối tượng db hợp lệ', async () => {
      await expect(runDispatchV6Migration(null)).rejects.toThrow(/Thiếu đối tượng kết nối/);
      await expect(runDispatchV6Migration(undefined)).rejects.toThrow(/Thiếu đối tượng kết nối/);
    });

    it('Tự động sửa dữ liệu reservedQty bị âm hoặc null về 0 an toàn', async () => {
      const batches = [
        {
          _id: 'b_neg',
          branchId: 'CENTRAL_WH',
          stock: 20,
          reservedQty: -5,
          location: { zone: 'B', rack: 'B1', shelf: 2, bin: 3, slotType: 'MAIN' },
        },
        {
          _id: 'b_null',
          branchId: 'CENTRAL_WH',
          stock: 0,
          reservedQty: null,
          location: { zone: 'B', rack: 'B1', shelf: 2, bin: 4, slotType: 'MAIN' },
        },
      ];
      const mockDb = createMockDb({ batches, locations: [] });
      const res = await runDispatchV6Migration(mockDb);

      expect(res.batchesUpdated).toBe(2);
      expect(batches[0].reservedQty).toBe(0);
      expect(batches[1].reservedQty).toBe(0);
    });
  });
});
