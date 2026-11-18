/**
 * Script Migration Dữ Liệu Xuất Kho Tổng v6.0 (Idempotent)
 *
 * Công việc thực hiện:
 * 1. Đặt reservedQty = 0 cho các lô thuốc (medicinebatches) cũ chưa có trường này.
 * 2. Đồng bộ binStatus ('OCCUPIED' | 'EMPTY') cho bảng medicinelocations theo tồn kho thực tế.
 * 3. Khởi tạo danh sách 10 giỏ gom hàng mặc định (TOTE-01 .. TOTE-10) nếu chưa tồn tại.
 *
 * Chạy thủ công: node backend/scripts/migrate-dispatch-v6.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

/**
 * Thực thi logic migration với đối tượng kết nối db (MongoDB native Db hoặc Mongoose connection.db)
 * Thiết kế tách hàm thuần để có thể kiểm thử đơn vị (Unit Test) mà không phụ thuộc kết nối ngoài.
 */
async function runDispatchV6Migration(db) {
  if (!db) {
    throw new Error('Thiếu đối tượng kết nối cơ sở dữ liệu (db) để thực hiện migration!');
  }

  const batchesCol = db.collection('medicinebatches');
  const locationsCol = db.collection('medicinelocations');
  const totesCol = db.collection('totes');

  // 1. Cập nhật reservedQty = 0 cho mọi lô chưa có trường này hoặc giá trị âm/null
  const batchRes = await batchesCol.updateMany(
    {
      $or: [
        { reservedQty: { $exists: false } },
        { reservedQty: null },
        { reservedQty: { $lt: 0 } },
      ],
    },
    { $set: { reservedQty: 0 } },
  );

  // 2. Tính lại binStatus cho từng vị trí khay dựa vào tổng stock của lô MAIN còn hiệu lực
  const locations = await locationsCol.find({}).toArray();
  let updatedOccupied = 0;
  let updatedEmpty = 0;

  for (const loc of locations) {
    const activeBatches = await batchesCol
      .find({
        branchId: 'CENTRAL_WH',
        'location.zone': loc.zone,
        'location.rack': loc.rack,
        'location.shelf': loc.shelf,
        'location.bin': loc.bin,
        'location.slotType': 'MAIN',
        status: { $nin: ['REMOVED', 'DELETED'] },
      })
      .toArray();

    const totalStock = activeBatches.reduce((sum, b) => sum + Math.max(0, Number(b.stock || 0)), 0);
    const nextStatus = totalStock > 0 ? 'OCCUPIED' : 'EMPTY';

    if (loc.binStatus !== nextStatus) {
      await locationsCol.updateOne(
        { _id: loc._id },
        { $set: { binStatus: nextStatus } },
      );
      if (nextStatus === 'EMPTY') updatedEmpty++;
      else updatedOccupied++;
    }
  }

  // 3. Khởi tạo TOTE-01 .. TOTE-10 (không ghi đè Tote đang IN_USE)
  const defaultTotes = Array.from({ length: 10 }, (_, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    return {
      toteCode: `TOTE-${num}`,
      label: `Giỏ gom hàng tiêu chuẩn #${num}`,
    };
  });

  let seededTotes = 0;
  for (const t of defaultTotes) {
    const upsertRes = await totesCol.updateOne(
      { toteCode: t.toteCode },
      {
        $setOnInsert: {
          toteCode: t.toteCode,
          label: t.label,
          status: 'AVAILABLE',
          currentDispatchOrderId: null,
          currentDispatchCode: null,
          lockedBy: null,
          lockedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
    if (upsertRes && (upsertRes.upsertedCount > 0 || upsertRes.upsertedId)) {
      seededTotes++;
    }
  }

  return {
    batchesUpdated: batchRes?.modifiedCount || 0,
    locationsMarkedOccupied: updatedOccupied,
    locationsMarkedEmpty: updatedEmpty,
    totesSeeded: seededTotes,
  };
}

// Chạy CLI trực tiếp khi được gọi từ node
if (require.main === module) {
  (async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌ Thiếu biến môi trường MONGODB_URI.');
      process.exit(1);
    }
    await mongoose.connect(uri);
    console.log('✅ Đã kết nối MongoDB, bắt đầu chạy migration Xuất Kho v6.0...');
    const summary = await runDispatchV6Migration(mongoose.connection.db);
    console.log('🎉 Hoàn tất migration Xuất Kho v6.0:', JSON.stringify(summary));
    await mongoose.disconnect();
  })().catch((err) => {
    console.error('❌ Migration thất bại:', err);
    process.exit(1);
  });
}

module.exports = { runDispatchV6Migration };
