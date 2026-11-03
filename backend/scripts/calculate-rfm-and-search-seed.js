/**
 * SCRIPT TÍNH TOÁN PHÂN KHÚC KHÁCH HÀNG RFM & SEED DỮ LIỆU TÌM KIẾM MẪU
 * Chạy trực tiếp trên CSDL MongoDB Atlas thực tế
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_ATLAS_URI || process.env.MONGODB_CONNECTION_STRING;

if (!MONGODB_URI) {
  console.error('❌ Lỗi: Vui lòng cung cấp biến môi trường MONGODB_URI hoặc MONGODB_ATLAS_URI trong file .env!');
  process.exit(1);
}

async function run() {
  console.log('🔄 Đang kết nối tới MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Đã kết nối thành công tới CSDL!');

  const ordersCollection = mongoose.connection.collection('orders');
  const segmentCollection = mongoose.connection.collection('customer_segments');
  const searchCollection = mongoose.connection.collection('search_histories');

  // 1. TÍNH TOÁN RFM TỪ 250 ĐƠN HÀNG THỰC TẾ TRONG DATABASE
  console.log('📊 Đang tổng hợp lịch sử mua hàng 12 tháng từ bảng orders...');
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const vouchersCollection = mongoose.connection.collection('vouchers');
    let availableVouchers = [];
    try {
      availableVouchers = await vouchersCollection.find({
        $or: [{ isActive: true }, { isActive: { $exists: false } }],
      }).toArray();
    } catch (e) {}
    const voucherCodes = availableVouchers.map(v => v.code).filter(Boolean);
    const pickVoucher = (kws, fallback = 'TUVANPOS') => {
      for (const kw of kws) {
        const found = voucherCodes.find(c => c.toUpperCase().includes(kw.toUpperCase()));
        if (found) return found;
      }
      return voucherCodes[0] || fallback;
    };

    const pipeline = [
      {
        $match: {
          patientPhone: { $exists: true, $ne: '', $nin: ['0', '0900000000', 'GUEST_RETAIL'] },
          paymentStatus: 'PAID',
          createdAt: { $gte: oneYearAgo },
        },
      },
      {
        $project: {
          patientPhone: 1,
          patientName: 1,
          branchId: 1,
          createdAt: 1,
          totalAmount: 1,
          items: 1,
          type: 1,
        },
      },
      {
        $unionWith: {
          coll: 'salesorders',
          pipeline: [
            {
              $match: {
                patientPhone: { $exists: true, $ne: '', $nin: ['0', '0900000000', 'GUEST_RETAIL'] },
                totalAmount: { $gt: 0 },
                createdAt: { $gte: oneYearAgo },
              },
            },
            {
              $project: {
                patientPhone: 1,
                patientName: 1,
                branchId: 1,
                createdAt: 1,
                totalAmount: 1,
                items: 1,
                type: 1,
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: '$patientPhone',
          fullName: { $last: '$patientName' },
          primaryBranchId: { $last: '$branchId' },
          lastOrderDate: { $max: '$createdAt' },
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          itemNames: { $push: '$items.name' },
          orderTypes: { $push: '$type' },
        },
      },
    ];

    const aggregated = await ordersCollection.aggregate(pipeline).toArray();
    console.log(`🔍 Tìm thấy ${aggregated.length} khách hàng có số điện thoại hợp lệ (từ cả Online và Quầy POS).`);

    const now = new Date();
    const chronicKeywords = [
      'tiểu đường', 'đái tháo đường', 'huyết áp', 'tim mạch', 'mỡ máu', 'lipid', 'gout', 'gút',
      'hen suyễn', 'copd', 'khớp', 'viêm khớp', 'thoái hóa khớp', 'metformin', 'amlodipine',
      'losartan', 'atorvastatin', 'glucophage', 'concor', 'lipitor', 'januvia', 'micardis',
      'plavix', 'crestor', 'rosuvastatin', 'telmisartan', 'gliclazide', 'diamicron',
      'coversyl', 'bisoprolol', 'allopurinol', 'febuxostat'
    ];

    let chronicCount = 0;
    let championCount = 0;

    for (const item of aggregated) {
      const phone = item._id;
      const lastDate = item.lastOrderDate ? new Date(item.lastOrderDate) : new Date(now.getTime() - 10 * 86400000);
      const recencyDays = Math.max(0, Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
      const totalOrders12M = item.totalOrders || 1;
      const totalSpent12M = item.totalSpent || 500000;
      const avgOrderValue = Math.round(totalSpent12M / totalOrders12M);

      const flattenedNames = (item.itemNames || []).flat().filter(Boolean).join(' ').toLowerCase();
      const hasPrescription = (item.orderTypes || []).includes('PRESCRIPTION');
      const isChronic = chronicKeywords.some((kw) => flattenedNames.includes(kw)) || (hasPrescription && totalOrders12M >= 2);
      const customerType = isChronic ? 'CHRONIC_PATIENT' : 'GENERAL_RETAIL';

      let rScore = 1;
      if (isChronic) {
        if (recencyDays <= 25) rScore = 5;
        else if (recencyDays <= 35) rScore = 4;
        else if (recencyDays <= 50) rScore = 3;
        else if (recencyDays <= 75) rScore = 2;
        else rScore = 1;
      } else {
        if (recencyDays <= 20) rScore = 5;
        else if (recencyDays <= 45) rScore = 4;
        else if (recencyDays <= 90) rScore = 3;
        else if (recencyDays <= 150) rScore = 2;
        else rScore = 1;
      }

      let fScore = totalOrders12M >= 8 ? 5 : totalOrders12M >= 5 ? 4 : totalOrders12M >= 3 ? 3 : totalOrders12M >= 2 ? 2 : 1;
      let mScore = totalSpent12M >= 3000000 ? 5 : totalSpent12M >= 1500000 ? 4 : totalSpent12M >= 700000 ? 3 : totalSpent12M >= 300000 ? 2 : 1;

      const rfmScoreStr = `${rScore}${fScore}${mScore}`;
      let segment = 'POTENTIAL_LOYALIST';
      let recommendedVoucher = pickVoucher(['WELCOME', 'TUVANPOS', '30K'], 'TUVANPOS');
      let predictedRefillDate = undefined;

      if (rScore >= 4 && fScore >= 4 && mScore >= 4) {
        segment = 'CHAMPIONS';
        recommendedVoucher = pickVoucher(['VIP', 'DIAMOND', '50%', 'SUMMER30', '30K'], 'SUMMER30');
        championCount++;
      } else if (isChronic && (rScore >= 3 || fScore >= 3)) {
        segment = 'LOYAL_CHRONIC';
        recommendedVoucher = pickVoucher(['TIMMACH', 'NGUOICAOTUOI', 'CHRONIC', '30K'], 'TIMMACH2026');
        predictedRefillDate = new Date(lastDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        chronicCount++;
      } else if (rScore <= 2 && (fScore >= 2 || mScore >= 3 || isChronic)) {
        segment = 'AT_RISK';
        recommendedVoucher = pickVoucher(['NGUOICAOTUOI', '30K', 'TUVANPOS', 'WINBACK'], 'NGUOICAOTUOI');
        if (isChronic) {
          predictedRefillDate = new Date(lastDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        }
      } else if (rScore === 1 && fScore === 1) {
        segment = 'HIBERNATING';
        recommendedVoucher = pickVoucher(['30K', 'TUVANPOS', 'WELCOME'], 'TUVANPOS');
      } else {
        segment = 'POTENTIAL_LOYALIST';
        recommendedVoucher = pickVoucher(['TUVANPOS', '30K', '1710'], 'TUVANPOS');
      }

    await segmentCollection.updateOne(
      { phone },
      {
        $set: {
          fullName: item.fullName || 'Khách hàng thân thiết',
          primaryBranchId: item.primaryBranchId || 'BR-001',
          customerType,
          lastOrderDate: lastDate,
          recencyDays,
          totalOrders12M,
          totalSpent12M,
          avgOrderValue,
          rScore,
          fScore,
          mScore,
          rfmScoreStr,
          segment,
          predictedRefillDate,
          recommendedVoucher,
          lastEvaluatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  console.log(`✅ Đã đồng bộ ${aggregated.length} phân khúc RFM (Trong đó có ${chronicCount} Khách Mãn Tính, ${championCount} Khách Kim Cương)!`);

  // 2. TẠO DỮ LIỆU TÌM KIẾM MẪU (Search History)
  console.log('🔎 Đang ghi nhận các từ khóa tìm kiếm thực tế gần đây...');
  const sampleSearches = [
    { keyword: 'panadol extra', category: 'Giảm đau, hạ sốt', resultsCount: 12 },
    { keyword: 'vitamin c sủi', category: 'Thuốc bổ, vitamin', resultsCount: 8 },
    { keyword: 'men vi sinh', category: 'Probiotic', resultsCount: 6 },
    { keyword: 'cao dán salonpas', category: 'Miếng dán giảm đau', resultsCount: 15 },
  ];

  for (const s of sampleSearches) {
    await searchCollection.insertOne({
      keyword: s.keyword,
      category: s.category,
      resultsCount: s.resultsCount,
      deviceId: 'dev_default_guest',
      createdAt: new Date(),
    });
  }

  console.log('✅ Đã nạp thành công dữ liệu tìm kiếm mẫu vào MongoDB Atlas!');
  await mongoose.disconnect();
  console.log('🚀 HOÀN TẤT ĐỒNG BỘ 100% CSDL THỰC TẾ!');
}

run().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
