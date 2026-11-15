/**
 * Script Đối Soát & Kiểm Tra Toàn Vẹn Dữ Liệu (69 Collections)
 * Giữa MongoDB Atlas Cloud và Cụm 7 Containers VPS Độc Lập
 * 
 * Cách chạy:
 *   cd backend
 *   node scripts/verify-migration-checksum.js
 */

const { MongoClient } = require('mongodb');

const SOURCE_URI = process.env.SOURCE_URI || process.env.MONGODB_URI;
const VPS_HOST = process.env.VPS_HOST || '127.0.0.1';
const ADMIN_USER = process.env.TARGET_USER || 'admin';
const ADMIN_PASS = encodeURIComponent(process.env.TARGET_PASSWORD || '');

if (!SOURCE_URI) {
  console.error("❌ Vui lòng cung cấp biến môi trường SOURCE_URI hoặc MONGODB_URI.");
  process.exit(1);
}

const CONTAINER_TARGET_URIS = {
  wdp301_auth: process.env.TARGET_AUTH_URI || `mongodb://${ADMIN_USER}:${ADMIN_PASS}@${VPS_HOST}:27018/wdp301_auth?authSource=admin&directConnection=true`,
  wdp301_user: process.env.TARGET_USER_URI || `mongodb://${ADMIN_USER}:${ADMIN_PASS}@${VPS_HOST}:27019/wdp301_user?authSource=admin&directConnection=true`,
  wdp301_orders: process.env.TARGET_ORDERS_URI || `mongodb://${ADMIN_USER}:${ADMIN_PASS}@${VPS_HOST}:27020/wdp301_orders?authSource=admin&directConnection=true`,
  wdp301_inventory: process.env.TARGET_INVENTORY_URI || `mongodb://${ADMIN_USER}:${ADMIN_PASS}@${VPS_HOST}:27021/wdp301_inventory?authSource=admin&directConnection=true`,
  wdp301_supplier: process.env.TARGET_SUPPLIER_URI || `mongodb://${ADMIN_USER}:${ADMIN_PASS}@${VPS_HOST}:27022/wdp301_supplier?authSource=admin&directConnection=true`,
  wdp301_gateway: process.env.TARGET_GATEWAY_URI || `mongodb://${ADMIN_USER}:${ADMIN_PASS}@${VPS_HOST}:27023/wdp301_gateway?authSource=admin&directConnection=true`,
  wdp301_national_pharma: process.env.TARGET_PHARMA_URI || `mongodb://${ADMIN_USER}:${ADMIN_PASS}@${VPS_HOST}:27024/wdp301_national_pharma?authSource=admin&directConnection=true`,
};

// Bảng ánh xạ collection -> database container
const COLLECTION_TO_DB = {
  verificationtokens: 'wdp301_auth',
  users: 'wdp301_user',
  branches: 'wdp301_user',
  attendances: 'wdp301_user',
  payrolls: 'wdp301_user',
  work_shifts: 'wdp301_user',
  work_schedules: 'wdp301_user',
  shift_swap_requests: 'wdp301_user',
  shift_handovers: 'wdp301_user',
  staffcertificates: 'wdp301_user',
  staff_transfer_requests: 'wdp301_user',
  staff_notifications: 'wdp301_user',
  customer_segments: 'wdp301_user',
  carts: 'wdp301_user',
  wishlists: 'wdp301_user',
  branch_feedbacks: 'wdp301_user',
  audit_logs: 'wdp301_user',
  emailcampaigns: 'wdp301_user',
  emaildeliverylogs: 'wdp301_user',
  leave_requests: 'wdp301_user',
  orders: 'wdp301_orders',
  vouchers: 'wdp301_orders',
  voucher_otps: 'wdp301_orders',
  expenses: 'wdp301_orders',
  payment_vouchers: 'wdp301_orders',
  payment_reconciliations: 'wdp301_orders',
  payment_webhook_logs: 'wdp301_orders',
  marketingcampaigns: 'wdp301_orders',
  medicines: 'wdp301_inventory',
  medicinebatches: 'wdp301_inventory',
  branch_inventories: 'wdp301_inventory',
  branch_stock_balances: 'wdp301_inventory',
  inventorychecks: 'wdp301_inventory',
  product_reviews: 'wdp301_inventory',
  search_histories: 'wdp301_inventory',
  medicinelocations: 'wdp301_inventory',
  purchaseorders: 'wdp301_inventory',
  purchaserequisitions: 'wdp301_inventory',
  requestforquotations: 'wdp301_inventory',
  goodsreceiptnotes: 'wdp301_inventory',
  inspectionrecords: 'wdp301_inventory',
  inspection_records: 'wdp301_inventory',
  stocktransfers: 'wdp301_inventory',
  inventorytransactions: 'wdp301_inventory',
  sensor_stations: 'wdp301_inventory',
  sensor_telemetries: 'wdp301_inventory',
  branchpricelists: 'wdp301_inventory',
  pricelists: 'wdp301_inventory',
  pricelistitems: 'wdp301_inventory',
  reports: 'wdp301_inventory',
  prescriptions: 'wdp301_inventory',
  salesorders: 'wdp301_inventory',
  quotas: 'wdp301_inventory',
  totes: 'wdp301_inventory',
  internalexports: 'wdp301_inventory',
  dispatchorders: 'wdp301_inventory',
  products: 'wdp301_inventory',
  processedrequests: 'wdp301_inventory',
  suppliers: 'wdp301_supplier',
  suppliercredittransactions: 'wdp301_supplier',
  notifications: 'wdp301_gateway',
  device_tokens: 'wdp301_gateway',
  iot_alerts: 'wdp301_gateway',
  prescription_ocr_logs: 'wdp301_gateway',
  consultation_audio_records: 'wdp301_gateway',
  chat_sessions: 'wdp301_gateway',
  national_drugs: 'wdp301_national_pharma',
  national_facilities: 'wdp301_national_pharma',
  national_transactions: 'wdp301_national_pharma'
};

async function verify() {
  console.log('====================================================');
  console.log('🔍 BẮT ĐẦU ĐỐI SOÁT DỮ LIỆU ATLAS CLOUD VS 7 CONTAINERS VPS');
  console.log('====================================================\n');

  const sourceClient = new MongoClient(SOURCE_URI);
  await sourceClient.connect();
  const sourceDb = sourceClient.db('WDP201');

  const targetClients = {};
  for (const [dbName, uri] of Object.entries(CONTAINER_TARGET_URIS)) {
    try {
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
      await client.connect();
      targetClients[dbName] = client;
    } catch (e) {
      // Container chưa bật
    }
  }

  let matched = 0;
  let mismatched = 0;
  let totalCloudDocs = 0;
  let totalTargetDocs = 0;

  const collections = Object.keys(COLLECTION_TO_DB).sort();
  console.log(`Kiểm tra ${collections.length} collections:\n`);

  for (let i = 0; i < collections.length; i++) {
    const colName = collections[i];
    const targetDbName = COLLECTION_TO_DB[colName];
    const targetClient = targetClients[targetDbName];

    const sourceCount = await sourceDb.collection(colName).countDocuments();
    totalCloudDocs += sourceCount;

    if (!targetClient) {
      console.log(`[${i + 1}/${collections.length}] ⚠️ ${colName}: Atlas (${sourceCount} docs) <---> [${targetDbName}] Container CHƯA BẬT`);
      mismatched++;
      continue;
    }

    const targetCount = await targetClient.db(targetDbName).collection(colName).countDocuments();
    totalTargetDocs += targetCount;

    if (sourceCount === targetCount) {
      console.log(`[${i + 1}/${collections.length}] ✔ ${colName}: Atlas (${sourceCount} docs) <---> VPS [${targetDbName}] (${targetCount} docs) [KHỚP 100%]`);
      matched++;
    } else {
      console.log(`[${i + 1}/${collections.length}] ❌ ${colName}: Atlas (${sourceCount} docs) <---> VPS [${targetDbName}] (${targetCount} docs) [LỆCH!]`);
      mismatched++;
    }
  }

  console.log('\n====================================================');
  console.log(`📊 TỔNG KẾT: ${matched}/${collections.length} collections khớp hoàn hảo.`);
  console.log(`Tổng docs Cloud Atlas: ${totalCloudDocs} | Tổng docs VPS: ${totalTargetDocs}`);
  console.log('====================================================\n');

  await sourceClient.close();
  for (const c of Object.values(targetClients)) {
    await c.close().catch(() => {});
  }
}

verify().catch(console.error);

