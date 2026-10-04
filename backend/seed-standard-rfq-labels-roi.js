const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || process.env.MONGODB_CONNECTION_STRING;

if (!uri) {
  console.error('❌ Thiếu biến môi trường MONGODB_URI trong file .env');
  process.exit(1);
}

async function seedStandardData() {
  console.log('🔄 Đang kết nối tới MongoDB...');
  await mongoose.connect(uri);
  console.log('✅ Đã kết nối MongoDB thành công!');

  const db = mongoose.connection.db;

  // =========================================================================
  // 1. CHUẨN HÓA DỮ LIỆU THUỐC NHẬP KHẨU (TEM NHÃN PHỤ THÔNG TƯ 01/2018/TT-BYT)
  // =========================================================================
  console.log('\n🏷️ --- 1. CHUẨN HÓA DỮ LIỆU THUỐC NHẬP KHẨU ---');
  const medicinesCol = db.collection('medicines');

  const importedMeds = [
    {
      barcode: '8935001701125', // Salonpas Diclofenac Hisamitsu
      country_of_origin: 'Nhật Bản (Japan)',
      importer_name: 'CÔNG TY TNHH DƯỢC PHẨM HISAMITSU VIỆT NAM',
      importer_address: 'Số 14/3, Đường 3A, KCN Biên Hòa 2, Phường Long Bình Tân, TP. Biên Hòa, Đồng Nai',
      manufacturer: 'Hisamitsu Pharmaceutical Co., Inc. (Tosu Plant, Saga, Japan)',
      registration_number: 'VN-19543-16',
      storage_condition: 'Bảo quản nơi khô ráo, thoáng mát, nhiệt độ dưới 30°C, tránh ánh nắng trực tiếp',
      active_ingredient: 'Diclofenac sodium 1.5% w/w',
      unit: 'Gói',
      batchNo: 'LOT-HIS-2026-X1',
      expiry_date: new Date('2028-10-31T23:59:59.000Z'),
    },
    {
      name: 'Thuốc giảm đau, hạ sốt Panadol Extra đỏ (Hộp 15 vỉ x 12 viên)',
      barcode: '8935006530015', // Panadol Extra đỏ
      country_of_origin: 'Australia / Ireland',
      importer_name: 'CÔNG TY CỔ PHẦN DƯỢC PHẨM CPC1 HÀ NỘI',
      importer_address: 'Cụm Công Nghiệp Hà Bình Phương, Huyện Thường Tín, TP. Hà Nội',
      manufacturer: 'GlaxoSmithKline Dungarvan Ltd (Ireland)',
      registration_number: 'VN-21980-23',
      storage_condition: 'Bảo quản dưới 30°C, tránh ẩm và ánh sáng mặt trời',
      active_ingredient: 'Paracetamol 500mg, Caffeine 65mg',
      unit: 'Hộp',
      batchNo: 'LOT-PAN-2026-08',
      expiry_date: new Date('2028-12-31T23:59:59.000Z'),
    },
    {
      sku: 'MED-AUGMENTIN-1G',
      name: 'Thuốc kháng sinh Augmentin 1g GSK (Hộp 2 vỉ x 7 viên)',
      genericName: 'Amoxicillin 875mg, Clavulanic acid 125mg',
      active_ingredient: 'Amoxicillin 875mg, Acid Clavulanic 125mg',
      category: 'Kháng sinh',
      drug_classification: 'PRESCRIPTION',
      country_of_origin: 'Pháp (France)',
      importer_name: 'CÔNG TY CỔ PHẦN DƯỢC LIỆU TRUNG ƯƠNG 2 (PHYTOPHARMA)',
      importer_address: 'Số 24 Nguyễn Thị Nghĩa, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
      manufacturer: 'Glaxo Wellcome Production (Mayenne, Pháp)',
      registration_number: 'VN-18234-14',
      storage_condition: 'Bảo quản trong bao bì kín, nơi khô ráo, nhiệt độ không quá 25°C',
      unit: 'Hộp',
      price: 260000,
      barcode: '8935006530886',
      batchNo: 'LOT-AUG-2026-04',
      expiry_date: new Date('2028-09-30T23:59:59.000Z'),
      units: [
        { unitName: 'Hộp', exchangeValue: 14, price: 260000, isBaseUnit: true, barcode: '8935006530886' },
        { unitName: 'Viên', exchangeValue: 1, price: 19000, isBaseUnit: false, barcode: '8935006530886' },
      ],
      batches: [
        {
          batchNo: 'LOT-AUG-2026-04',
          expDate: new Date('2028-09-30T23:59:59.000Z'),
          mfgDate: new Date('2025-09-01T00:00:00.000Z'),
          stock: 200,
          status: 'ACTIVE',
          importPrice: 195000,
        },
      ],
    },
    {
      sku: 'MED-VOLTAREN-50MG',
      name: 'Thuốc giảm đau chống viêm Voltaren 50mg Novartis (Hộp 10 vỉ x 10 viên)',
      genericName: 'Diclofenac sodium 50mg',
      active_ingredient: 'Diclofenac natri 50mg',
      category: 'Kháng viêm - Giảm đau',
      drug_classification: 'PRESCRIPTION',
      country_of_origin: 'Thụy Sĩ (Switzerland)',
      importer_name: 'CÔNG TY TNHH DKSH VIỆT NAM',
      importer_address: 'Số 23 Đại lộ Độc Lập, KCN Việt Nam - Singapore, TP. Thuận An, Bình Dương',
      manufacturer: 'Novartis Pharma Stein AG (Schaffhauserstrasse, Stein, Thụy Sĩ)',
      registration_number: 'VN-20150-16',
      storage_condition: 'Bảo quản nơi khô ráo, tránh ánh sáng trực tiếp, nhiệt độ dưới 30°C',
      unit: 'Hộp',
      price: 385000,
      barcode: '7611136001234',
      batchNo: 'LOT-VOL-2026-A2',
      expiry_date: new Date('2028-11-30T23:59:59.000Z'),
      units: [
        { unitName: 'Hộp', exchangeValue: 100, price: 385000, isBaseUnit: true, barcode: '7611136001234' },
        { unitName: 'Vỉ (10 Viên)', exchangeValue: 10, price: 40000, isBaseUnit: false, barcode: '7611136001234' },
      ],
      batches: [
        {
          batchNo: 'LOT-VOL-2026-A2',
          expDate: new Date('2028-11-30T23:59:59.000Z'),
          mfgDate: new Date('2025-10-01T00:00:00.000Z'),
          stock: 150,
          status: 'ACTIVE',
          importPrice: 290000,
        },
      ],
    },
  ];

  for (const item of importedMeds) {
    if (item.barcode) {
      const existing = await medicinesCol.findOne({ barcode: item.barcode });
      if (existing) {
        await medicinesCol.updateOne(
          { _id: existing._id },
          {
            $set: {
              country_of_origin: item.country_of_origin,
              importer_name: item.importer_name,
              importer_address: item.importer_address,
              manufacturer: item.manufacturer,
              registration_number: item.registration_number,
              storage_condition: item.storage_condition,
              active_ingredient: item.active_ingredient || existing.active_ingredient,
              batchNo: item.batchNo,
              expiry_date: item.expiry_date,
            },
          }
        );
        console.log(`  ✓ Đã cập nhật tem nhãn phụ chuẩn cho thuốc: [${existing.name}]`);
        continue;
      }
    }
    // Nếu chưa có thì upsert
    await medicinesCol.updateOne(
      { sku: item.sku },
      { $set: item },
      { upsert: true }
    );
    console.log(`  ✓ Đã thêm/cập nhật thuốc nhập khẩu: [${item.name}]`);
  }

  // =========================================================================
  // 2. DỮ LIỆU CHUẨN CHO RFQ (YÊU CẦU BÁO GIÁ HÀNG LOẠT VỚI MA TRẬN SO SÁNH)
  // =========================================================================
  console.log('\n📋 --- 2. TẠO DỮ LIỆU CHUẨN CHO RFQ ---');
  const rfqCol = db.collection('requestforquotations');
  const suppliersCol = db.collection('suppliers');

  // Lấy các NCC thực tế từ DB
  const realSuppliers = await suppliersCol.find({}).limit(4).toArray();
  const sampleMeds = await medicinesCol.find({}).limit(3).toArray();

  if (realSuppliers.length >= 2 && sampleMeds.length >= 1) {
    const s1 = realSuppliers[0];
    const s2 = realSuppliers[1];
    const s3 = realSuppliers[2] || realSuppliers[0];
    const m1 = sampleMeds[0];
    const m2 = sampleMeds[1] || sampleMeds[0];

    // RFQ 1: Đang thẩm định so sánh giá (IN_REVIEW) - Kích hoạt cảnh báo đỏ Cận date
    const rfq1Code = 'RFQ-202610-0001';
    const rfq1Data = {
      rfqCode: rfq1Code,
      title: 'Yêu cầu chào giá Thuốc Thiết yếu & Kháng sinh Nhập khẩu Quý 4/2026',
      status: 'IN_REVIEW',
      deadline: new Date(Date.now() + 5 * 86400000), // Hạn chót còn 5 ngày
      minShelfLifeMonths: 18, // Tiêu chuẩn nhà thuốc: Hạn sử dụng tối thiểu phải còn 18 tháng
      requiredPaymentTermDays: 30,
      notes: 'Yêu cầu các Nhà cung cấp đính kèm chứng chỉ GDP và phiếu kiểm nghiệm xuất xưởng CoA.',
      items: [
        {
          medicineId: m1._id.toString(),
          medicineName: m1.name,
          sku: m1.sku || m1.barcode || 'SKU-001',
          unit: m1.unit || 'Hộp',
          quantityRequested: 500,
          targetPrice: m1.price ? Math.round(m1.price * 0.75) : 100000,
        },
        {
          medicineId: m2._id.toString(),
          medicineName: m2.name,
          sku: m2.sku || m2.barcode || 'SKU-002',
          unit: m2.unit || 'Hộp',
          quantityRequested: 300,
          targetPrice: m2.price ? Math.round(m2.price * 0.75) : 120000,
        },
      ],
      targetSuppliers: [
        {
          supplierId: s1._id.toString(),
          supplierName: s1.name,
          email: s1.email || 'kinhdoanh@pharma1.vn',
          status: 'SUBMITTED',
          sentAt: new Date(Date.now() - 2 * 86400000),
        },
        {
          supplierId: s2._id.toString(),
          supplierName: s2.name,
          email: s2.email || 'dauthau@pharma2.vn',
          status: 'SUBMITTED',
          sentAt: new Date(Date.now() - 2 * 86400000),
        },
        {
          supplierId: s3._id.toString(),
          supplierName: s3.name,
          email: s3.email || 'sales@pharma3.vn',
          status: 'SUBMITTED',
          sentAt: new Date(Date.now() - 2 * 86400000),
        },
      ],
      quotations: [
        {
          quotationId: 'QUOTE-001-A',
          supplierId: s1._id.toString(),
          supplierName: s1.name,
          submittedAt: new Date(Date.now() - 1 * 86400000),
          paymentTermsDays: 45, // Công nợ 45 ngày (Tốt)
          deliveryDays: 2,
          notes: 'Cam kết hàng xuất thẳng kho bảo quản lạnh GSP, date mới sản xuất 2026.',
          items: [
            {
              medicineId: m1._id.toString(),
              medicineName: m1.name,
              quotedPrice: 95000,
              committedShelfLifeMonths: 24, // 24 tháng >= 18 tháng (Đạt chuẩn Xanh)
              availableQuantity: 500,
              discountPercent: 2,
            },
            {
              medicineId: m2._id.toString(),
              medicineName: m2.name,
              quotedPrice: 115000,
              committedShelfLifeMonths: 22, // 22 tháng >= 18 tháng (Đạt chuẩn Xanh)
              availableQuantity: 300,
              discountPercent: 1.5,
            },
          ],
          totalAmount: 500 * 95000 * 0.98 + 300 * 115000 * 0.985,
          isSelected: false,
        },
        {
          quotationId: 'QUOTE-002-B',
          supplierId: s2._id.toString(),
          supplierName: s2.name,
          submittedAt: new Date(Date.now() - 1 * 86400000),
          paymentTermsDays: 30,
          deliveryDays: 1,
          notes: 'Chào giá xả hàng tồn kho theo lô - Giá cực rẻ nhưng date ngắn.',
          items: [
            {
              medicineId: m1._id.toString(),
              medicineName: m1.name,
              quotedPrice: 82000, // Giá rẻ hơn 15%
              committedShelfLifeMonths: 10, // ⚠️ CHỈ CÒN 10 THÁNG (< 18 THÁNG YÊU CẦU) -> CẢNH BÁO ĐỎ CẬN DATE
              availableQuantity: 500,
              discountPercent: 5,
            },
            {
              medicineId: m2._id.toString(),
              medicineName: m2.name,
              quotedPrice: 102000, // Giá rẻ
              committedShelfLifeMonths: 9, // ⚠️ CHỈ CÒN 9 THÁNG (< 18 THÁNG YÊU CẦU) -> CẢNH BÁO ĐỎ CẬN DATE
              availableQuantity: 300,
              discountPercent: 3,
            },
          ],
          totalAmount: 500 * 82000 * 0.95 + 300 * 102000 * 0.97,
          isSelected: false,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await rfqCol.updateOne({ rfqCode: rfq1Code }, { $set: rfq1Data }, { upsert: true });
    console.log(`  ✓ Đã nạp RFQ thẩm định so sánh giá: [${rfq1Code}] (Có ma trận cảnh báo cận date)`);

    // RFQ 2: Đã trúng thầu (AWARDED)
    const rfq2Code = 'RFQ-202610-0002';
    const rfq2Data = {
      rfqCode: rfq2Code,
      title: 'Chào giá Nhóm Thuốc Tim mạch & Huyết áp Phổ biến',
      status: 'AWARDED',
      deadline: new Date(Date.now() - 3 * 86400000),
      minShelfLifeMonths: 18,
      requiredPaymentTermDays: 30,
      notes: 'Đã hoàn tất chọn thầu và tạo Đơn đặt hàng PO tự động.',
      items: [
        {
          medicineId: m1._id.toString(),
          medicineName: m1.name,
          sku: m1.sku || m1.barcode || 'SKU-001',
          unit: m1.unit || 'Hộp',
          quantityRequested: 200,
          targetPrice: 90000,
        },
      ],
      targetSuppliers: [
        {
          supplierId: s1._id.toString(),
          supplierName: s1.name,
          email: s1.email || 'ncc1@pharma.vn',
          status: 'SUBMITTED',
          sentAt: new Date(Date.now() - 7 * 86400000),
        },
      ],
      quotations: [
        {
          quotationId: 'QUOTE-002-AWARDED',
          supplierId: s1._id.toString(),
          supplierName: s1.name,
          submittedAt: new Date(Date.now() - 5 * 86400000),
          paymentTermsDays: 45,
          deliveryDays: 2,
          items: [
            {
              medicineId: m1._id.toString(),
              medicineName: m1.name,
              quotedPrice: 88000,
              committedShelfLifeMonths: 28,
              availableQuantity: 200,
              discountPercent: 0,
            },
          ],
          totalAmount: 200 * 88000,
          isSelected: true,
          selectedReason: 'Hạn sử dụng dài 28 tháng, giá thấp hơn giá trần và công nợ 45 ngày.',
        },
      ],
      awardedSupplierId: s1._id.toString(),
      awardedSupplierName: s1.name,
      awardedAt: new Date(Date.now() - 2 * 86400000),
      createdAt: new Date(Date.now() - 7 * 86400000),
      updatedAt: new Date(),
    };

    await rfqCol.updateOne({ rfqCode: rfq2Code }, { $set: rfq2Data }, { upsert: true });
    console.log(`  ✓ Đã nạp RFQ hoàn tất chọn thầu: [${rfq2Code}]`);
  }

  // =========================================================================
  // 3. DỮ LIỆU CHUẨN CHIẾN DỊCH MARKETING & ĐƠN HÀNG ATTRIBUTION (ROI / ROAS)
  // =========================================================================
  console.log('\n📊 --- 3. TẠO DỮ LIỆU CHIẾN DỊCH MARKETING & ĐO LƯỜNG ROI ---');
  const campaignCol = db.collection('marketingcampaigns');
  const vouchersCol = db.collection('vouchers');
  const ordersCol = db.collection('orders');

  // Nạp 3 Voucher chiến dịch
  const vouchersData = [
    {
      code: 'TIMMACH2026',
      name: 'Ưu đãi Khám & Thuốc Tim Mạch 10%',
      discountType: 'PERCENT',
      discountValue: 10,
      minOrderAmount: 200000,
      maxDiscountAmount: 50000,
      isActive: true,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-11-30'),
    },
    {
      code: 'NGUOICAOTUOI',
      name: 'Chăm sóc Người cao tuổi Giảm 30K',
      discountType: 'FIXED',
      discountValue: 30000,
      minOrderAmount: 300000,
      isActive: true,
      startDate: new Date('2026-09-15'),
      endDate: new Date('2026-10-31'),
    },
    {
      code: 'TUVANPOS',
      name: 'Voucher Tư vấn Sức khỏe tại Điểm bán 20K',
      discountType: 'FIXED',
      discountValue: 20000,
      minOrderAmount: 150000,
      isActive: true,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-30'),
    },
  ];

  for (const v of vouchersData) {
    await vouchersCol.updateOne({ code: v.code }, { $set: v }, { upsert: true });
  }
  console.log('  ✓ Đã cập nhật 3 mã Voucher chiến dịch vào CSDL');

  // Nạp 3 Chiến dịch Marketing
  const campaignsData = [
    {
      code: 'MKT-2026-FACEBOOK',
      name: 'Chiến dịch Facebook Ads - Tầm soát Tim mạch & Mỡ máu Mùa lạnh',
      channel: 'FACEBOOK_ADS',
      budget: 15000000,
      totalCost: 12500000,
      costs: [
        {
          type: 'ADS',
          amount: 10000000,
          note: 'Chạy quảng cáo Facebook Meta Ads chuyển đổi và tin nhắn',
          date: new Date('2026-09-05'),
        },
        {
          type: 'PRINTING',
          amount: 2500000,
          note: 'In ấn Standee và tờ rơi giới thiệu đặt tại các chi nhánh',
          date: new Date('2026-09-08'),
        },
      ],
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-11-30'),
      status: 'ACTIVE',
      voucherCodes: ['TIMMACH2026'],
      notes: 'Tập trung khách hàng độ tuổi từ 40+ tại khu vực Hà Nội và TP.HCM.',
    },
    {
      code: 'MKT-2026-ZALOOA',
      name: 'Chiến dịch Chăm sóc Sức khỏe Người cao tuổi qua Zalo OA & SMS',
      channel: 'ZALO_OA',
      budget: 8000000,
      totalCost: 6000000,
      costs: [
        {
          type: 'ADS',
          amount: 6000000,
          note: 'Chi phí gửi tin nhắn Zalo ZNS và tin nhắn chăm sóc định kỳ',
          date: new Date('2026-09-18'),
        },
      ],
      startDate: new Date('2026-09-15'),
      endDate: new Date('2026-10-31'),
      status: 'ACTIVE',
      voucherCodes: ['NGUOICAOTUOI'],
      notes: 'Tương tác trực tiếp với tệp người già và gia đình có người cao tuổi.',
    },
    {
      code: 'MKT-2026-COMMUNITY',
      name: 'Ngày hội Tư vấn & Đo Huyết áp Miễn phí tại Điểm Bán',
      channel: 'COMMUNITY_HEALTH_EVENT',
      budget: 6000000,
      totalCost: 5500000,
      costs: [
        {
          type: 'GIFTS',
          amount: 3500000,
          note: 'Quà tặng đo huyết áp: Cặp khẩu trang y tế và hộp gạc bông',
          date: new Date('2026-10-01'),
        },
        {
          type: 'PRINTING',
          amount: 2000000,
          note: 'Băng rôn, background và áo thun Dược sĩ tư vấn',
          date: new Date('2026-10-02'),
        },
      ],
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-30'),
      status: 'ACTIVE',
      voucherCodes: ['TUVANPOS'],
      notes: 'Tăng lượng Foot-traffic khách vãng lai ghé thăm nhà thuốc.',
    },
  ];

  for (const c of campaignsData) {
    await campaignCol.updateOne({ code: c.code }, { $set: c }, { upsert: true });
    console.log(`  ✓ Đã nạp chiến dịch Marketing: [${c.code}] - ${c.name}`);
  }

  // Nạp các Đơn hàng thực tế PAID gắn với các Voucher trên
  // (Đảm bảo có cả khách hàng mới và khách hàng cũ để tính Cannibalization chân thực)
  const sampleOrders = [
    // Đơn từ Facebook Ads (Khách mới 0988111222, 0988333444)
    {
      orderCode: 'ORD-MKT-FB-01',
      patientPhone: '0988111222',
      customerName: 'Nguyễn Văn An',
      totalAmount: 850000,
      paymentStatus: 'PAID',
      voucherCode: 'TIMMACH2026',
      voucherDiscount: 50000,
      createdAt: new Date('2026-09-10T10:30:00Z'),
    },
    {
      orderCode: 'ORD-MKT-FB-02',
      patientPhone: '0988333444',
      customerName: 'Trần Thị Bình',
      totalAmount: 1200000,
      paymentStatus: 'PAID',
      voucherCode: 'TIMMACH2026',
      voucherDiscount: 50000,
      createdAt: new Date('2026-09-15T14:20:00Z'),
    },
    {
      orderCode: 'ORD-MKT-FB-03',
      patientPhone: '0988111222', // Khách mua lại lần 2
      customerName: 'Nguyễn Văn An',
      totalAmount: 650000,
      paymentStatus: 'PAID',
      voucherCode: 'TIMMACH2026',
      voucherDiscount: 50000,
      createdAt: new Date('2026-09-28T09:15:00Z'),
    },
    {
      orderCode: 'ORD-MKT-FB-04',
      patientPhone: '0912555666',
      customerName: 'Lê Hoàng Cường',
      totalAmount: 1850000,
      paymentStatus: 'PAID',
      voucherCode: 'TIMMACH2026',
      voucherDiscount: 50000,
      createdAt: new Date('2026-10-02T16:45:00Z'),
    },

    // Đơn từ Zalo OA (0903777888, 0903999000)
    {
      orderCode: 'ORD-MKT-ZL-01',
      patientPhone: '0903777888',
      customerName: 'Bùi Thị Dung',
      totalAmount: 920000,
      paymentStatus: 'PAID',
      voucherCode: 'NGUOICAOTUOI',
      voucherDiscount: 30000,
      createdAt: new Date('2026-09-20T11:00:00Z'),
    },
    {
      orderCode: 'ORD-MKT-ZL-02',
      patientPhone: '0903999000',
      customerName: 'Vũ Đức Giang',
      totalAmount: 1100000,
      paymentStatus: 'PAID',
      voucherCode: 'NGUOICAOTUOI',
      voucherDiscount: 30000,
      createdAt: new Date('2026-09-25T15:30:00Z'),
    },

    // Đơn từ Community Event Tại Điểm Bán (0977222333, 0977444555)
    {
      orderCode: 'ORD-MKT-POS-01',
      patientPhone: '0977222333',
      customerName: 'Hoàng Kim Huệ',
      totalAmount: 480000,
      paymentStatus: 'PAID',
      voucherCode: 'TUVANPOS',
      voucherDiscount: 20000,
      createdAt: new Date('2026-10-03T09:00:00Z'),
    },
    {
      orderCode: 'ORD-MKT-POS-02',
      patientPhone: '0977444555',
      customerName: 'Đặng Tuấn Khang',
      totalAmount: 760000,
      paymentStatus: 'PAID',
      voucherCode: 'TUVANPOS',
      voucherDiscount: 20000,
      createdAt: new Date('2026-10-03T16:10:00Z'),
    },
  ];

  for (const o of sampleOrders) {
    await ordersCol.updateOne(
      { orderCode: o.orderCode },
      { $set: o },
      { upsert: true }
    );
  }
  console.log(`  ✓ Đã nạp ${sampleOrders.length} đơn hàng quy gán chuẩn phục vụ tính ROI & Cannibalization`);

  console.log('\n============================================================');
  console.log('🎉 NẠP TOÀN BỘ DỮ LIỆU CHUẨN THÀNH CÔNG VÀO CSDL MONGODB!');
  console.log('============================================================');
  process.exit(0);
}

seedStandardData().catch((err) => {
  console.error('❌ Lỗi nạp dữ liệu chuẩn:', err);
  process.exit(1);
});
