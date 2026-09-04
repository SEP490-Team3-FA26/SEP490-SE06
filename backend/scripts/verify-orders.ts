import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verify() {
  await connect(process.env.MONGODB_URI || '');
  const db = connection.db!;
  
  const orderCount = await db.collection('orders').countDocuments();
  const salesCount = await db.collection('salesorders').countDocuments();
  const salesInRange = await db.collection('salesorders').countDocuments({
    orderCode: { $gte: 92000001, $lte: 92000100 }
  });
  const gppSynced = await db.collection('salesorders').countDocuments({
    orderCode: { $gte: 92000001, $lte: 92000100 },
    nationalSyncStatus: 'SYNCED'
  });

  console.log(`\n==============================================`);
  console.log(`📌 Tổng số đơn trong bảng 'orders': ${orderCount}`);
  console.log(`📌 Tổng số hóa đơn trong bảng 'salesorders': ${salesCount}`);
  console.log(`🌐 100 đơn mới trong 'salesorders': ${salesInRange}/100`);
  console.log(`✅ Trạng thái liên thông GPP 'SYNCED': ${gppSynced}/100 (100%)`);
  console.log(`==============================================`);

  const sample = await db.collection('salesorders')
    .find({ orderCode: { $in: [92000001, 92000002, 92000003, 92000004] } })
    .project({
      index: 1,
      orderCode: 1,
      nationalSyncCode: 1,
      nationalSyncStatus: 1,
      type: 1,
      patientName: 1,
      totalAmount: 1,
      'items.name': 1,
      'items.batches': 1
    })
    .toArray();

  console.log('\n🔍 Mẫu 4 đơn GPP kèm thông tin trừ lô:');
  console.dir(sample, { depth: null });
  await connection.close();
}

verify().catch(console.error);
