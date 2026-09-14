/**
 * Migration Script: Phân Tách Kho Chi Nhánh Sang Collection Vật Lý Riêng Biệt (Phương án 2)
 *
 * Nhiệm vụ:
 * 1. Di chuyển toàn bộ các lô thuốc có branchId !== 'CENTRAL_WH' từ collection `medicinebatches` sang `branch_inventories`.
 * 2. Tổng hợp tồn kho theo từng cặp (branchId, medicineId) và khởi tạo bảng số dư tức thời `branch_stock_balances`.
 * 3. Tạo Index chuẩn cho cả 2 collection mới.
 */

const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_CONNECTION_STRING || process.env.MONGODB_ATLAS_URI;

if (!MONGODB_URI) {
  console.error('❌ Lỗi: MONGODB_URI / MONGODB_CONNECTION_STRING chưa được cấu hình trong biến môi trường hoặc file backend/.env!');
  process.exit(1);
}

async function migrateBranchInventory() {
  const client = new MongoClient(MONGODB_URI);
  try {
    console.log('🔗 Đang kết nối tới MongoDB...');
    await client.connect();
    console.log('✅ Kết nối MongoDB thành công!');

    const db = client.db(); // Sử dụng default db từ URI

    const legacyBatchCol = db.collection('medicinebatches');
    const branchInvCol = db.collection('branch_inventories');
    const stockBalanceCol = db.collection('branch_stock_balances');

    // 1. Tạo Indexes chuẩn cho collection mới
    console.log('⚙️ Đang thiết lập Indexes cho branch_inventories & branch_stock_balances...');
    await branchInvCol.createIndex({ branchId: 1, medicineId: 1, status: 1, expDate: 1 });
    await branchInvCol.createIndex({ branchId: 1, batchNo: 1, medicineId: 1 });
    await branchInvCol.createIndex({ branchId: 1, stock: 1 });

    await stockBalanceCol.createIndex({ branchId: 1, medicineId: 1 }, { unique: true });
    await stockBalanceCol.createIndex({ branchId: 1, status: 1 });
    console.log('✅ Đã tạo xong Indexes!');

    // 2. Tìm tất cả các lô thuốc chi nhánh
    const branchBatchesQuery = {
      branchId: { $exists: true, $ne: 'CENTRAL_WH' }
    };

    const branchBatches = await legacyBatchCol.find(branchBatchesQuery).toArray();
    console.log(`📦 Tìm thấy ${branchBatches.length} lô thuốc thuộc các kho chi nhánh.`);

    if (branchBatches.length === 0) {
      console.log('ℹ️ Không có lô thuốc chi nhánh nào cần migrate. Hoàn tất!');
      return;
    }

    // 3. Migrate từng lô sang branch_inventories
    let migratedBatchesCount = 0;
    const balanceAggregator = new Map(); // key: `${branchId}___${medicineId}`, value: { branchId, medicineId, totalStock }

    for (const batch of branchBatches) {
      const bId = String(batch.branchId).trim();
      const mId = String(batch.medicineId).trim();
      const stock = Number(batch.stock) || 0;
      const openedStock = Number(batch.openedStock) || 0;
      const status = batch.status || 'ACTIVE';

      // Upsert vào branch_inventories
      await branchInvCol.updateOne(
        {
          branchId: bId,
          medicineId: mId,
          batchNo: batch.batchNo
        },
        {
          $set: {
            branchId: bId,
            medicineId: mId,
            batchNo: batch.batchNo,
            expDate: batch.expDate ? new Date(batch.expDate) : new Date(Date.now() + 365 * 24 * 3600 * 1000),
            stock,
            openedStock,
            importPrice: Number(batch.importPrice) || 0,
            status,
            cabinetLocation: batch.cabinetLocation || batch.location || { cabinet: 'Tủ 1', shelf: 'Ngăn A', bin: 'Khay 1' },
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: batch.createdAt ? new Date(batch.createdAt) : new Date()
          }
        },
        { upsert: true }
      );
      migratedBatchesCount++;

      // Cộng dồn vào balance map nếu lô còn hiệu lực
      if (status === 'ACTIVE' && stock > 0) {
        const key = `${bId}___${mId}`;
        const current = balanceAggregator.get(key) || { branchId: bId, medicineId: mId, totalStock: 0 };
        current.totalStock += stock;
        balanceAggregator.set(key, current);
      }
    }

    console.log(`✅ Đã di chuyển thành công ${migratedBatchesCount} lô vào collection vật lý 'branch_inventories'.`);

    // 4. Khởi tạo/cập nhật bảng số dư tức thời branch_stock_balances
    console.log(`📊 Đang cập nhật bảng số dư cho ${balanceAggregator.size} cặp (Chi nhánh, Dược phẩm)...`);
    let balanceUpdatedCount = 0;

    for (const [_, bal] of balanceAggregator.entries()) {
      await stockBalanceCol.updateOne(
        {
          branchId: bal.branchId,
          medicineId: bal.medicineId
        },
        {
          $set: {
            branchId: bal.branchId,
            medicineId: bal.medicineId,
            totalStock: bal.totalStock,
            reservedStock: 0,
            safetyStock: 20,
            status: bal.totalStock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
            lastSyncedAt: new Date(),
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
      balanceUpdatedCount++;
    }

    console.log(`🎉 HOÀN TẤT MIGRATION PHÂN TÁCH KHO VẬT LÝ!`);
    console.log(`   - Tổng lô di chuyển sang branch_inventories: ${migratedBatchesCount}`);
    console.log(`   - Tổng bản ghi số dư khởi tạo trên branch_stock_balances: ${balanceUpdatedCount}`);

  } catch (error) {
    console.error('❌ Lỗi trong quá trình migration:', error);
  } finally {
    await client.close();
    console.log('🔒 Đã đóng kết nối Database.');
  }
}

migrateBranchInventory();
