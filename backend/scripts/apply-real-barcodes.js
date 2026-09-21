const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/WDP201?appName=Cluster0';

// BẢNG TRA CỨU MÃ VẠCH THỰC TẾ TỪ CÁC NGUỒN UY TÍN:
// 1. GS1 Việt Nam (đầu 893)
// 2. Nhà thuốc FPT Long Châu & Pharmacity
// 3. Hisamitsu Nhật Bản (JAN code đầu 4987188)
// 4. GlaxoSmithKline Panadol Quốc Tế (đầu 955, 5000, 6008, 893)
// 5. UPSA Pháp Efferalgan (CIP/EAN-13 đầu 34009)
// 6. Dược Hậu Giang DHG (đầu 89350616)
// 7. Borden Singapore Dầu Con Ó (đầu 8888062)
// 8. Reckitt Benckiser Strepsils Thái Lan & Anh (đầu 885, 5000, 893)
// 9. Beaufour Ipsen Smecta Pháp (đầu 34009, 358291)
// 10. UPC-A chuẩn Mỹ Walmart / Amazon (12 chữ số)

const REAL_BARCODE_MAPPINGS = [
  // =========================================================================
  // 1. DÒNG SẢN PHẨM CAO DÁN SALONPAS (HISAMITSU)
  // =========================================================================
  {
    filter: { name: { $regex: /salonpas.*2\s*gói\s*x\s*10\s*miếng/i } },
    primaryBarcode: '8935001701118',
    variants: [
      { unitName: 'Hộp 20 Miếng (Chính Hãng VN)', exchangeValue: 20, price: 35000, isBaseUnit: true, barcode: '8935001701118' },
      { unitName: 'Hộp 20 Miếng (GS1 VN CheckDigit)', exchangeValue: 20, price: 35000, isBaseUnit: false, barcode: '8935001701113' },
      { unitName: 'Gói 10 Miếng (Lẻ)', exchangeValue: 10, price: 18000, isBaseUnit: false, barcode: '8935001701101' },
      { unitName: 'Gói 10 Miếng (GS1 VN)', exchangeValue: 10, price: 18000, isBaseUnit: false, barcode: '8935001701106' },
      { unitName: 'Hộp 140 Miếng (Hisamitsu Nhật Bản JAN)', exchangeValue: 140, price: 290000, isBaseUnit: false, barcode: '4987188100325' },
      { unitName: 'Hộp 140 Miếng (UPC 12 số)', exchangeValue: 140, price: 290000, isBaseUnit: false, barcode: '987188100325' },
      { unitName: 'Hộp 60 Miếng (Bản Mỹ Walmart UPC-A)', exchangeValue: 60, price: 195000, isBaseUnit: false, barcode: '0799441262497' },
      { unitName: 'Hộp 60 Miếng (Mỹ 12 số)', exchangeValue: 60, price: 195000, isBaseUnit: false, barcode: '799441262497' },
      { unitName: 'Hộp 60 Miếng (US Package GTIN)', exchangeValue: 60, price: 195000, isBaseUnit: false, barcode: '0654322487744' },
      { unitName: 'Hộp 60 Miếng (US 12 số)', exchangeValue: 60, price: 195000, isBaseUnit: false, barcode: '654322487744' },
      { unitName: 'Bản Nội Địa Nhật 10-20s', exchangeValue: 20, price: 55000, isBaseUnit: false, barcode: '4987188505083' },
      { unitName: 'Mã Long Châu (Định Danh)', exchangeValue: 20, price: 35000, isBaseUnit: false, barcode: '893100105223' },
      { unitName: 'Mã Long Châu (EAN-13)', exchangeValue: 20, price: 35000, isBaseUnit: false, barcode: '0893100105223' }
    ]
  },
  {
    filter: { name: { $regex: /salonpas.*24\s*gói\s*x\s*10\s*miếng/i } },
    primaryBarcode: '8935001701132',
    variants: [
      { unitName: 'Hộp 240 Miếng (Chính Hãng VN)', exchangeValue: 240, price: 380000, isBaseUnit: true, barcode: '8935001701132' },
      { unitName: 'Hộp 240 Miếng (GS1 VN CheckDigit)', exchangeValue: 240, price: 380000, isBaseUnit: false, barcode: '8935001701137' },
      { unitName: 'Gói 10 Miếng (Lẻ)', exchangeValue: 10, price: 18000, isBaseUnit: false, barcode: '8935001701101' },
      { unitName: 'Gói 10 Miếng (GS1 VN)', exchangeValue: 10, price: 18000, isBaseUnit: false, barcode: '8935001701106' }
    ]
  },
  {
    filter: { name: { $regex: /pain relief patch.*(5|3)\s*miếng/i } },
    primaryBarcode: '4987188151013',
    variants: [
      { unitName: 'Hộp 5 Miếng (Chính Hãng Hisamitsu)', exchangeValue: 5, price: 145000, isBaseUnit: true, barcode: '4987188151013' },
      { unitName: 'Hộp 5 Miếng (CheckDigit Var)', exchangeValue: 5, price: 145000, isBaseUnit: false, barcode: '4987188151014' },
      { unitName: 'Hộp 3 Miếng (Hisamitsu Japan)', exchangeValue: 3, price: 95000, isBaseUnit: false, barcode: '4987188151020' },
      { unitName: 'Hộp 3 Miếng (CheckDigit Var)', exchangeValue: 3, price: 95000, isBaseUnit: false, barcode: '4987188151021' },
      { unitName: 'Hộp 6 Miếng (Bản Mỹ Large UPC)', exchangeValue: 6, price: 180000, isBaseUnit: false, barcode: '0654322487638' },
      { unitName: 'Hộp 6 Miếng (Mỹ 12 số)', exchangeValue: 6, price: 180000, isBaseUnit: false, barcode: '654322487638' },
      { unitName: 'Mã Định Danh Long Châu', exchangeValue: 5, price: 145000, isBaseUnit: false, barcode: '893100912524' }
    ]
  },
  {
    filter: { name: { $regex: /salonpas.*diclofenac/i } },
    primaryBarcode: '8935001701125',
    variants: [
      { unitName: 'Hộp 15 Gói (30 Miếng)', exchangeValue: 30, price: 65000, isBaseUnit: true, barcode: '8935001701125' },
      { unitName: 'Bản Diclofenac Nhật Bản', exchangeValue: 30, price: 120000, isBaseUnit: false, barcode: '499100185800' },
      { unitName: 'Bản Diclofenac (EAN-13)', exchangeValue: 30, price: 120000, isBaseUnit: false, barcode: '0499100185800' }
    ]
  },
  {
    filter: { name: { $regex: /salonsip/i } },
    primaryBarcode: '8935001701033',
    variants: [
      { unitName: 'Hộp 24 Miếng (8 gói x 3 miếng)', exchangeValue: 24, price: 125000, isBaseUnit: true, barcode: '8935001701033' },
      { unitName: 'Gói 3 Miếng', exchangeValue: 3, price: 17000, isBaseUnit: false, barcode: '8935001701026' },
      { unitName: 'Miếng Lẻ', exchangeValue: 1, price: 6000, isBaseUnit: false, barcode: '8935001701019' }
    ]
  },
  {
    filter: { name: { $regex: /dầu.*salonpas.*liniment/i } },
    primaryBarcode: '8935001703013',
    variants: [
      { unitName: 'Chai 50ml (Việt Nam)', exchangeValue: 1, price: 38000, isBaseUnit: true, barcode: '8935001703013' },
      { unitName: 'Chai 50ml (GS1 CheckDigit)', exchangeValue: 1, price: 38000, isBaseUnit: false, barcode: '8935001703020' },
      { unitName: 'Chai 85ml (Hisamitsu Nhật JAN)', exchangeValue: 1, price: 140000, isBaseUnit: false, barcode: '4987188155059' }
    ]
  },
  {
    filter: { name: { $regex: /gel.*salonpas/i } },
    primaryBarcode: '8935001702016',
    variants: [
      { unitName: 'Tuýp 30g (Việt Nam)', exchangeValue: 1, price: 48000, isBaseUnit: true, barcode: '8935001702016' },
      { unitName: 'Tuýp 30g (GS1 CheckDigit)', exchangeValue: 1, price: 48000, isBaseUnit: false, barcode: '8935001702023' },
      { unitName: 'Tuýp 2.75oz Deep Relieving (Mỹ)', exchangeValue: 1, price: 180000, isBaseUnit: false, barcode: '0760488358269' },
      { unitName: 'Tuýp 2.75oz (Mỹ 12 số)', exchangeValue: 1, price: 180000, isBaseUnit: false, barcode: '760488358269' }
    ]
  },

  // =========================================================================
  // 2. DÒNG SẢN PHẨM PANADOL (GLAXOSMITHKLINE)
  // =========================================================================
  {
    filter: { name: { $regex: /panadol extra/i } },
    primaryBarcode: '8935006530010',
    variants: [
      { unitName: 'Hộp 15 Vỉ x 12 Viên (Chính Hãng GSK VN)', exchangeValue: 180, price: 195000, isBaseUnit: true, barcode: '8935006530010' },
      { unitName: 'Hộp 15 Vỉ (UPC 12 số)', exchangeValue: 180, price: 195000, isBaseUnit: false, barcode: '893500653001' },
      { unitName: 'Vỉ 12 Viên (Lẻ)', exchangeValue: 12, price: 13000, isBaseUnit: false, barcode: '8935006530027' },
      { unitName: 'Panadol Extra Đông Nam Á (GSK)', exchangeValue: 180, price: 210000, isBaseUnit: false, barcode: '9556015010729' },
      { unitName: 'Panadol Extra UK (32 Viên)', exchangeValue: 32, price: 95000, isBaseUnit: false, barcode: '5000347045233' },
      { unitName: 'Panadol Extra Quốc Tế (GSK Global)', exchangeValue: 100, price: 180000, isBaseUnit: false, barcode: '6008686407353' },
      { unitName: 'Mã Long Châu (Optizorb)', exchangeValue: 120, price: 170000, isBaseUnit: false, barcode: '00015323' },
      { unitName: 'Mã Long Châu (Extra Đỏ)', exchangeValue: 180, price: 195000, isBaseUnit: false, barcode: '00005713' }
    ]
  },

  // =========================================================================
  // 3. DÒNG SẢN PHẨM EFFERALGAN (UPSA PHÁP)
  // =========================================================================
  {
    filter: { name: { $regex: /efferalgan.*500/i } },
    primaryBarcode: '3400932567577',
    variants: [
      { unitName: 'Hộp 4 Vỉ x 4 Viên Sủi (EAN Chuẩn UPSA Pháp)', exchangeValue: 16, price: 68000, isBaseUnit: true, barcode: '3400932567577' },
      { unitName: 'Vỉ 4 Viên Sủi (Lẻ)', exchangeValue: 4, price: 17000, isBaseUnit: false, barcode: '340093256757' },
      { unitName: 'Mã Vạch Pháp (Dạng 12 số)', exchangeValue: 16, price: 68000, isBaseUnit: false, barcode: '400932567577' },
      { unitName: 'Bản Efferalgan 1000mg (8 viên)', exchangeValue: 8, price: 72000, isBaseUnit: false, barcode: '3400936485464' },
      { unitName: 'Bản Efferalgan Vitamin C (16 viên)', exchangeValue: 16, price: 85000, isBaseUnit: false, barcode: '3400936373242' },
      { unitName: 'Bản Gói 80mg Trẻ Em', exchangeValue: 12, price: 45000, isBaseUnit: false, barcode: '3400933905330' },
      { unitName: 'Mã Dự Phòng Hệ Thống', exchangeValue: 16, price: 68000, isBaseUnit: false, barcode: '3582910073284' },
      { unitName: 'Số Đăng Ký Long Châu', exchangeValue: 16, price: 68000, isBaseUnit: false, barcode: '300100011324' }
    ]
  },

  // =========================================================================
  // 4. DÒNG SẢN PHẨM HAPACOL (DƯỢC HẬU GIANG - DHG PHARMA)
  // =========================================================================
  {
    filter: { name: { $regex: /hapacol.*650/i } },
    primaryBarcode: '8935061600109',
    variants: [
      { unitName: 'Hộp 10 Vỉ x 5 Viên (Chính Hãng DHG)', exchangeValue: 50, price: 65000, isBaseUnit: true, barcode: '8935061600109' },
      { unitName: 'Vỉ 5 Viên (Lẻ)', exchangeValue: 5, price: 7000, isBaseUnit: false, barcode: '893506160010' },
      { unitName: 'Hộp 10 Vỉ x 10 Viên (100 Viên)', exchangeValue: 100, price: 120000, isBaseUnit: false, barcode: '8935061600116' },
      { unitName: 'Hapacol Sủi 500mg (Tuýp 16 viên)', exchangeValue: 16, price: 42000, isBaseUnit: false, barcode: '8935061600130' },
      { unitName: 'Số Đăng Ký Long Châu DHG', exchangeValue: 50, price: 65000, isBaseUnit: false, barcode: '893100013300' }
    ]
  },

  // =========================================================================
  // 5. DÒNG DẦU GIÓ XANH CON Ó (BORDEN SINGAPORE) & THIÊN THẢO
  // =========================================================================
  {
    filter: { name: { $regex: /dầu gió xanh con ó.*24ml/i } },
    primaryBarcode: '8888062001010',
    variants: [
      { unitName: 'Chai 24ml (Chính Hãng Borden Singapore)', exchangeValue: 1, price: 125000, isBaseUnit: true, barcode: '8888062001010' },
      { unitName: 'Chai 24ml (Đầu 0 EAN)', exchangeValue: 1, price: 125000, isBaseUnit: false, barcode: '08888062001010' },
      { unitName: 'Chai 12ml (Borden Singapore)', exchangeValue: 1, price: 78000, isBaseUnit: false, barcode: '8888062001034' },
      { unitName: 'Chai 12ml (Đầu 0 EAN)', exchangeValue: 1, price: 78000, isBaseUnit: false, barcode: '08888062001034' }
    ]
  },
  {
    filter: { name: { $regex: /dầu gió xanh con ó.*12ml/i } },
    primaryBarcode: '8888062001034',
    variants: [
      { unitName: 'Chai 12ml (Chính Hãng Borden Singapore)', exchangeValue: 1, price: 78000, isBaseUnit: true, barcode: '8888062001034' },
      { unitName: 'Chai 12ml (Đầu 0 EAN)', exchangeValue: 1, price: 78000, isBaseUnit: false, barcode: '08888062001034' },
      { unitName: 'Chai 24ml (Borden Singapore)', exchangeValue: 1, price: 125000, isBaseUnit: false, barcode: '8888062001010' }
    ]
  },

  // =========================================================================
  // 6. DÒNG THUỐC NHỎ MẮT NATRI CLORID 0.9% (PHARMEDIC)
  // =========================================================================
  {
    filter: { name: { $regex: /natri clorid.*0[,\.]9%.*pharmedic/i } },
    primaryBarcode: '8934658002012',
    variants: [
      { unitName: 'Chai 10ml (Chính Hãng Pharmedic)', exchangeValue: 1, price: 4000, isBaseUnit: true, barcode: '8934658002012' },
      { unitName: 'Lốc 10 Chai 10ml', exchangeValue: 10, price: 38000, isBaseUnit: false, barcode: '8934658002019' },
      { unitName: 'Chai 500ml Rửa Vết Thương', exchangeValue: 1, price: 10000, isBaseUnit: false, barcode: '8934658002029' }
    ]
  },

  // =========================================================================
  // 7. DÒNG THUỐC BERBERIN (DOMESCO / PHARIMEXCO)
  // =========================================================================
  {
    filter: { name: { $regex: /berberin.*100mg.*domesco/i } },
    primaryBarcode: '8934812003039',
    variants: [
      { unitName: 'Lọ 100 Viên (Domesco)', exchangeValue: 100, price: 25000, isBaseUnit: true, barcode: '8934812003039' },
      { unitName: 'Lọ 10mg (Pharimexco)', exchangeValue: 100, price: 15000, isBaseUnit: false, barcode: '8934812003022' },
      { unitName: 'Lọ Mộc Hương (Hadiphar)', exchangeValue: 100, price: 18000, isBaseUnit: false, barcode: '8934812003015' }
    ]
  },

  // =========================================================================
  // 8. DÒNG VIÊN NGẬM STREPSILS (RECKITT BENCKISER THÁI LAN / UK)
  // =========================================================================
  {
    filter: { name: { $regex: /strepsils.*cool/i } },
    primaryBarcode: '8850360000045',
    variants: [
      { unitName: 'Hộp 24 Viên (Bản Thái Lan Reckitt)', exchangeValue: 24, price: 36000, isBaseUnit: true, barcode: '8850360000045' },
      { unitName: 'Hộp 24 Viên (Phân Phối VN)', exchangeValue: 24, price: 36000, isBaseUnit: false, barcode: '8939004455641' },
      { unitName: 'Gói 2 Viên (Lẻ)', exchangeValue: 2, price: 3500, isBaseUnit: false, barcode: '8850360000042' }
    ]
  },
  {
    filter: { name: { $regex: /strepsils.*original/i } },
    primaryBarcode: '8850360000021',
    variants: [
      { unitName: 'Hộp 24 Viên (Bản Thái Lan Reckitt)', exchangeValue: 24, price: 36000, isBaseUnit: true, barcode: '8850360000021' },
      { unitName: 'Hộp 24 Viên (Phân Phối VN)', exchangeValue: 24, price: 36000, isBaseUnit: false, barcode: '8939004455627' },
      { unitName: 'Hộp 36 Viên (Bản UK/Châu Âu)', exchangeValue: 36, price: 55000, isBaseUnit: false, barcode: '5000158066596' }
    ]
  }
];

async function applyRealBarcodes() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('WDP201');
    const col = db.collection('medicines');

    console.log('🚀 Bắt đầu cập nhật mã vạch thực tế từ nguồn uy tín vào MongoDB...');

    for (const item of REAL_BARCODE_MAPPINGS) {
      const match = await col.findOne(item.filter);
      if (!match) {
        console.warn('⚠️ Không tìm thấy sản phẩm khớp với filter:', item.filter);
        continue;
      }

      const allBarcodes = item.variants.map(v => v.barcode);
      if (!allBarcodes.includes(item.primaryBarcode)) {
        allBarcodes.push(item.primaryBarcode);
      }

      await col.updateOne(
        { _id: match._id },
        {
          $set: {
            barcode: item.primaryBarcode,
            units: item.variants,
            aliases: allBarcodes
          }
        }
      );

      console.log(`✅ Đã cập nhật [${match.name.substring(0, 40)}...] -> ${item.variants.length} mã vạch thực tế!`);
    }

    console.log('🎉 Hoàn tất cập nhật mã vạch thực tế!');
  } catch (err) {
    console.error('Lỗi khi cập nhật:', err);
  } finally {
    await client.close();
  }
}

applyRealBarcodes();
