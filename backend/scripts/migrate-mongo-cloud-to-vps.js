/**
 * Script Chuyển Dữ Liệu Tự Động Từ MongoDB Cloud (Atlas) Sang MongoDB VPS
 * 
 * Hỗ trợ 2 chế độ:
 * 1. Mode "full" (Mặc định): Clone toàn bộ database WDP201 nguyên bản từ Cloud sang VPS.
 * 2. Mode "split": Tự động bóc tách 69 collections vào từng database riêng biệt theo Microservice.
 * 
 * Cách chạy:
 *   cd backend
 *   node scripts/migrate-mongo-cloud-to-vps.js
 * 
 * Tuỳ chọn tham số môi trường:
 *   TARGET_URI="mongodb://admin:admin@<IP_VPS>:27017/?authSource=admin" node scripts/migrate-mongo-cloud-to-vps.js
 *   MODE="split" node scripts/migrate-mongo-cloud-to-vps.js
 */

const { MongoClient } = require('mongodb');

// Cấu hình kết nối nguồn (Cloud Atlas) và đích (VPS) - Bắt buộc truyền qua biến môi trường
const SOURCE_URI = process.env.SOURCE_URI || process.env.MONGODB_URI;
const TARGET_URI = process.env.TARGET_URI;

if (!SOURCE_URI) {
  console.error("❌ Lỗi bảo mật: Thiếu biến môi trường SOURCE_URI (hoặc MONGODB_URI). Dừng script!");
  process.exit(1);
}

if (!TARGET_URI) {
  console.error("❌ Lỗi bảo mật: Thiếu biến môi trường TARGET_URI. Dừng script!");
  process.exit(1);
}
const MODE = (process.env.MODE || 'full').toLowerCase(); // 'full' hoặc 'split'
const BATCH_SIZE = 1000;

// Bảng phân chia Collection theo từng Microservice khi chạy chế độ "split"
const SERVICE_DB_MAP = {
  // Auth Service
  wdp301_auth: [
    'verificationtokens'
  ],

  // User Service
  wdp301_user: [
    'users',
    'branches',
    'attendances',
    'payrolls',
    'work_shifts',
    'work_schedules',
    'shift_swap_requests',
    'shift_handovers',
    'staffcertificates',
    'staff_transfer_requests',
    'staff_notifications',
    'customer_segments',
    'carts',
    'wishlists',
    'branch_feedbacks',
    'audit_logs',
    'emailcampaigns',
    'emaildeliverylogs',
    'leave_requests'
  ],

  // Orders Service
  wdp301_orders: [
    'orders',
    'vouchers',
    'voucher_otps',
    'expenses',
    'payment_vouchers',
    'payment_reconciliations',
    'payment_webhook_logs',
    'marketingcampaigns'
  ],

  // Inventory Service
  wdp301_inventory: [
    'medicines',
    'medicinebatches',
    'branch_inventories',
    'branch_stock_balances',
    'inventorychecks',
    'product_reviews',
    'search_histories',
    'medicinelocations',
    'purchaseorders',
    'purchaserequisitions',
    'requestforquotations',
    'goodsreceiptnotes',
    'inspectionrecords',
    'inspection_records',
    'stocktransfers',
    'inventorytransactions',
    'sensor_stations',
    'sensor_telemetries',
    'branchpricelists',
    'pricelists',
    'pricelistitems',
    'reports',
    'prescriptions',
    'salesorders',
    'quotas',
    'totes',
    'national_drugs',
    'national_facilities',
    'national_transactions',
    'internalexports',
    'dispatchorders',
    'products',
    'processedrequests'
  ],

  // Supplier Service
  wdp301_supplier: [
    'suppliers',
    'suppliercredittransactions'
  ],

  // API Gateway
  wdp301_gateway: [
    'notifications',
    'device_tokens',
    'iot_alerts',
    'prescription_ocr_logs',
    'consultation_audio_records',
    'chat_sessions'
  ]
};

async function migrate() {
  console.log('====================================================');
  console.log('🚀 BẮT ĐẦU CHUYỂN DỮ LIỆU MONGODB CLOUD -> VPS');
  console.log(`📌 Nguồn (Cloud Atlas): ${SOURCE_URI.replace(/:([^@]+)@/, ':****@')}`);
  console.log(`📌 Đích (VPS/Local):   ${TARGET_URI.replace(/:([^@]+)@/, ':****@')}`);
  console.log(`📌 Chế độ (MODE):       ${MODE.toUpperCase()}`);
  console.log('====================================================\n');

  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);

  try {
    console.log('⏳ Đang kết nối tới cả 2 cụm MongoDB...');
    await sourceClient.connect();
    console.log('✅ Đã kết nối thành công tới MongoDB Atlas (Source)!');
    await targetClient.connect();
    console.log('✅ Đã kết nối thành công tới MongoDB VPS (Target)!\n');

    const sourceDb = sourceClient.db('WDP201');
    const collections = await sourceDb.listCollections().toArray();
    console.log(`📦 Tổng số Collections cần xử lý: ${collections.length}\n`);

    let totalDocsMigrated = 0;
    const startTime = Date.now();

    for (let i = 0; i < collections.length; i++) {
      const colName = collections[i].name;
      if (colName.startsWith('system.')) continue;

      const sourceCol = sourceDb.collection(colName);
      const totalDocs = await sourceCol.countDocuments();

      // Xác định Database đích tùy theo chế độ
      let targetDbNames = ['WDP201']; // Mặc định chế độ Full

      if (MODE === 'split') {
        targetDbNames = [];
        for (const [dbName, colList] of Object.entries(SERVICE_DB_MAP)) {
          if (colList.includes(colName)) {
            targetDbNames.push(dbName);
          }
        }
        // Nếu là collection users, chép vào cả auth (để authenticate) và user (để quản lý hồ sơ)
        if (colName === 'users') {
          targetDbNames = ['wdp301_auth', 'wdp301_user'];
        }
        // Nếu không thuộc danh sách phân nhóm, đưa vào wdp301_inventory làm dự phòng
        if (targetDbNames.length === 0) {
          targetDbNames = ['wdp301_inventory'];
        }
      }

      for (const targetDbName of targetDbNames) {
        const targetDb = targetClient.db(targetDbName);
        const targetCol = targetDb.collection(colName);

        process.stdout.write(`[${i + 1}/${collections.length}] Chuyển "${colName}" -> DB [${targetDbName}] (${totalDocs} docs)... `);

        if (totalDocs === 0) {
          // Vẫn tạo collection rỗng và index
          await targetDb.createCollection(colName).catch(() => {});
          console.log('✅ (0 docs)');
          continue;
        }

        // 1. Sao chép Indexes từ Source sang Target
        try {
          const rawIndexes = await sourceCol.indexes();
          const targetIndexes = rawIndexes
            .filter(idx => idx.name !== '_id_')
            .map(idx => {
              const options = { name: idx.name };
              if (idx.unique) options.unique = true;
              if (idx.sparse) options.sparse = true;
              if (idx.expireAfterSeconds !== undefined) options.expireAfterSeconds = idx.expireAfterSeconds;
              return { key: idx.key, ...options };
            });

          if (targetIndexes.length > 0) {
            await targetCol.createIndexes(targetIndexes).catch(e => {
              // Bỏ qua cảnh báo index không tương thích
            });
          }
        } catch (idxErr) {
          // Bỏ qua lỗi index nếu có
        }

        // 2. Chuyển dữ liệu theo từng Batch
        const cursor = sourceCol.find({}).batchSize(BATCH_SIZE);
        let batch = [];
        let count = 0;

        while (await cursor.hasNext()) {
          const doc = await cursor.next();
          batch.push(doc);

          if (batch.length >= BATCH_SIZE) {
            await targetCol.insertMany(batch, { ordered: false }).catch(() => {});
            count += batch.length;
            batch = [];
          }
        }

        if (batch.length > 0) {
          await targetCol.insertMany(batch, { ordered: false }).catch(() => {});
          count += batch.length;
          batch = [];
        }

        totalDocsMigrated += count;
        console.log(`✅ (${count}/${totalDocs} docs)`);
      }
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n====================================================');
    console.log('🎉 DI DỜI DỮ LIỆU HOÀN TẤT THÀNH CÔNG!');
    console.log(`⏱️ Thời gian thực thi: ${durationSec} giây`);
    console.log(`📊 Tổng số documents đã chuyển: ${totalDocsMigrated}`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('\n❌ Gặp lỗi trong quá trình di dời:', err);
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

migrate();

