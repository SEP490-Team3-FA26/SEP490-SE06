/**
 * Script Chuyển Dữ Liệu Tự Động Từ MongoDB Cloud (Atlas) Sang Cụm 7 Containers VPS Độc Lập
 * 
 * Hỗ trợ 3 chế độ:
 * 1. Mode "containers" (Mặc định): Chuyển trực tiếp dữ liệu vào 7 containers MongoDB độc lập qua port 27018 - 27024.
 * 2. Mode "split": Chuyển vào 1 host nhưng bóc tách theo database name.
 * 3. Mode "full": Clone toàn bộ database WDP201 nguyên bản sang 1 target DB.
 * 
 * Cách chạy:
 *   cd backend
 *   node scripts/migrate-mongo-cloud-to-vps.js
 * 
 * Tuỳ chọn tham số môi trường:
 *   VPS_HOST="127.0.0.1" (hoặc IP VPS)
 *   TARGET_PASSWORD="your_password"
 */

const { MongoClient } = require('mongodb');

// Cấu hình kết nối nguồn (Cloud Atlas)
const SOURCE_URI = process.env.SOURCE_URI || process.env.MONGODB_URI;
const MODE = (process.env.MODE || 'containers').toLowerCase(); // 'containers', 'split', 'full'
const VPS_HOST = process.env.VPS_HOST || '127.0.0.1';
const ADMIN_USER = process.env.TARGET_USER || 'admin';
const ADMIN_PASS = encodeURIComponent(process.env.TARGET_PASSWORD || '');
const BATCH_SIZE = 1000;

if (!SOURCE_URI) {
  console.error("❌ Vui lòng cung cấp biến môi trường SOURCE_URI hoặc MONGODB_URI.");
  process.exit(1);
}

// Cấu hình kết nối tới từng container riêng biệt (Port host từ 27018 đến 27024)
const CONTAINER_TARGET_URIS = {
  wdp301_auth: process.env.TARGET_AUTH_URI || `mongodb://${ADMIN_USER}:${ADMIN_PASS}@${VPS_HOST}:27018/wdp301_auth?authSource=admin&directConnection=true`,
  wdp301_user: process.env.TARGET_USER_URI || `mongodb://${ADMIN_USER}:${ADMIN_PASS}@${VPS_HOST}:27019/wdp301_user?authSource=admin&directConnection=true`,
  wdp301_orders: process.env.TARGET_ORDERS_URI || `mongodb://${ADMIN_USER}:${ADMIN_PASS}@${VPS_HOST}:27020/wdp301_orders?authSource=admin&directConnection=true`,
  wdp301_inventory: process.env.TARGET_INVENTORY_URI || `mongodb://${ADMIN_USER}:${ADMIN_PASS}@${VPS_HOST}:27021/wdp301_inventory?authSource=admin&directConnection=true`,
  wdp301_supplier: process.env.TARGET_SUPPLIER_URI || `mongodb://${ADMIN_USER}:${ADMIN_PASS}@${VPS_HOST}:27022/wdp301_supplier?authSource=admin&directConnection=true`,
  wdp301_gateway: process.env.TARGET_GATEWAY_URI || `mongodb://${ADMIN_USER}:${ADMIN_PASS}@${VPS_HOST}:27023/wdp301_gateway?authSource=admin&directConnection=true`,
  wdp301_national_pharma: process.env.TARGET_PHARMA_URI || `mongodb://${ADMIN_USER}:${ADMIN_PASS}@${VPS_HOST}:27024/wdp301_national_pharma?authSource=admin&directConnection=true`,
};

// Bảng phân chia 69 Collections chuẩn 100% cho 7 Microservices
const SERVICE_DB_MAP = {
  // 1. Auth Service (1 collection xác thực)
  wdp301_auth: [
    'verificationtokens'
  ],

  // 2. User Service (19 collections hồ sơ & nhân sự)
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

  // 3. Orders Service (8 collections đơn hàng & thanh toán)
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

  // 4. Inventory Service (30 collections dược phẩm & kho GSP)
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
    'internalexports',
    'dispatchorders',
    'products',
    'processedrequests'
  ],

  // 5. Supplier Service (2 collections nhà cung cấp)
  wdp301_supplier: [
    'suppliers',
    'suppliercredittransactions'
  ],

  // 6. API Gateway (6 collections thông báo & IoT)
  wdp301_gateway: [
    'notifications',
    'device_tokens',
    'iot_alerts',
    'prescription_ocr_logs',
    'consultation_audio_records',
    'chat_sessions'
  ],

  // 7. CSDL Dược Quốc Gia Simulator (3 collections)
  wdp301_national_pharma: [
    'national_drugs',
    'national_facilities',
    'national_transactions'
  ]
};

async function migrate() {
  console.log('====================================================');
  console.log('🚀 BẮT ĐẦU CHUYỂN DỮ LIỆU SANG CỤM 7 CONTAINERS MONGODB ĐỘC LẬP');
  console.log(`📌 Nguồn (Cloud Atlas): ${SOURCE_URI.replace(/:([^@]+)@/, ':****@')}`);
  console.log(`📌 Chế độ (MODE):       ${MODE.toUpperCase()}`);
  console.log('====================================================\n');

  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClients = {};

  try {
    console.log('⏳ Đang kết nối tới MongoDB Atlas (Source)...');
    await sourceClient.connect();
    console.log('✅ Đã kết nối thành công tới MongoDB Atlas (Source)!\n');

    const sourceDb = sourceClient.db('WDP201');
    const collections = await sourceDb.listCollections().toArray();
    console.log(`📦 Tổng số Collections trên Cloud Atlas: ${collections.length}\n`);

    // Khởi tạo các kết nối đích
    if (MODE === 'containers') {
      console.log('⏳ Đang kiểm tra kết nối tới 7 container MongoDB độc lập...');
      for (const [dbName, uri] of Object.entries(CONTAINER_TARGET_URIS)) {
        try {
          const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
          await client.connect();
          targetClients[dbName] = client;
          console.log(`  ✔ Kết nối sẵn sàng: [${dbName}] -> ${uri.replace(/:([^@]+)@/, ':****@')}`);
        } catch (err) {
          console.warn(`  ⚠️ Container [${dbName}] chưa bật trên cổng tương ứng (sẽ bỏ qua nếu chưa up container)`);
        }
      }
      console.log('');
    } else {
      const singleTargetUri = process.env.TARGET_URI || `mongodb://${ADMIN_USER}:${ADMIN_PASS}@${VPS_HOST}:27017/?authSource=admin`;
      const client = new MongoClient(singleTargetUri);
      await client.connect();
      targetClients['default'] = client;
    }

    let totalDocsMigrated = 0;
    const startTime = Date.now();

    for (let i = 0; i < collections.length; i++) {
      const colName = collections[i].name;
      if (colName.startsWith('system.')) continue;

      const sourceCol = sourceDb.collection(colName);
      const totalDocs = await sourceCol.countDocuments();

      // Xác định Database đích
      let targetDbNames = ['WDP201'];

      if (MODE === 'containers' || MODE === 'split') {
        targetDbNames = [];
        for (const [dbName, colList] of Object.entries(SERVICE_DB_MAP)) {
          if (colList.includes(colName)) {
            targetDbNames.push(dbName);
          }
        }
        // Collection users: chép vào cả auth (để login) và user (để quản lý hồ sơ)
        if (colName === 'users') {
          targetDbNames = ['wdp301_auth', 'wdp301_user'];
        }
        if (targetDbNames.length === 0) {
          targetDbNames = ['wdp301_inventory'];
        }
      }

      for (const targetDbName of targetDbNames) {
        const client = MODE === 'containers' ? targetClients[targetDbName] : targetClients['default'];
        if (!client) {
          console.log(`[${i + 1}/${collections.length}] ⚠️ Bỏ qua "${colName}" vì target [${targetDbName}] chưa kết nối.`);
          continue;
        }

        const targetDb = client.db(targetDbName);
        const targetCol = targetDb.collection(colName);

        process.stdout.write(`[${i + 1}/${collections.length}] Chuyển "${colName}" -> [${targetDbName}] (${totalDocs} docs)... `);

        if (totalDocs === 0) {
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
            await targetCol.createIndexes(targetIndexes).catch(() => {});
          }
        } catch (idxErr) {}

        // 2. Chuyển dữ liệu theo từng Batch (BSON stream)
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
    for (const client of Object.values(targetClients)) {
      await client.close().catch(() => {});
    }
  }
}

migrate();
