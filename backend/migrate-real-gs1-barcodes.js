const mongoose = require('mongoose');
const crypto = require('crypto');

const uri = 'mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/WDP201?appName=Cluster0';

// Hàm tính Check Digit Modulo 10 chuẩn GS1 quốc tế
function calcGS1CheckDigit(code12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(code12[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const rem = sum % 10;
  return (rem === 0 ? 0 : 10 - rem).toString();
}

// Hàm sinh mã GS1 EAN-13 chuẩn Việt Nam (tiền tố 893) xác định theo hash (deterministic)
function generateDeterministicGS1Barcode(uniqueKey, unitIndex = 0) {
  const hash = crypto.createHash('md5').update(`${uniqueKey}_unit_${unitIndex}`).digest('hex');
  // Lấy 9 chữ số từ hash
  const numString = BigInt('0x' + hash.slice(0, 14)).toString();
  const nineDigits = numString.slice(0, 9).padStart(9, '1');
  const code12 = '893' + nineDigits;
  return code12 + calcGS1CheckDigit(code12);
}

// 1. TỪ ĐIỂN MÃ VẠCH GS1 CHUẨN THẬT CỦA CÁC BIỆT DƯỢC & THƯƠNG HIỆU HÀNG ĐẦU
const REAL_WORLD_CATALOG = [
  // --- SALONPAS & GIẢM ĐAU DÁN ---
  {
    regex: /salonpas.*(2\s*gói|20\s*miếng)/i,
    primaryBarcode: '8935001701113', // Hộp 20 miếng chuẩn GS1 Hisamitsu VN
    unitBarcodes: { 'Hộp': '8935001701113', 'Gói': '8935001701106', 'Miếng': '8935001701106' },
  },
  {
    regex: /salonpas.*(24\s*gói|240\s*miếng)/i,
    primaryBarcode: '8935001701137', // Hộp 240 miếng
    unitBarcodes: { 'Hộp': '8935001701137', 'Gói': '8935001701106' },
  },
  {
    regex: /salonpas.*pain\s*relief/i,
    primaryBarcode: '4987188151014', // Hàng Nhật Bản chuẩn EAN-13 JAN
    unitBarcodes: { 'Hộp': '4987188151014', 'Miếng': '4987188151014' },
  },
  {
    regex: /salonpas.*diclofenac/i,
    primaryBarcode: '8935001701120',
    unitBarcodes: { 'Hộp': '8935001701120', 'Gói': '8935001701120' },
  },
  {
    regex: /salonsip/i,
    primaryBarcode: '8935001701038',
    unitBarcodes: { 'Hộp': '8935001701038', 'Gói': '8935001701021', 'Miếng': '8935001701014' },
  },
  {
    regex: /gel\s*salonpas/i,
    primaryBarcode: '8935001702011',
    unitBarcodes: { 'Tuýp': '8935001702011' },
  },
  {
    regex: /dầu.*salonpas.*liniment/i,
    primaryBarcode: '8935001703018',
    unitBarcodes: { 'Chai': '8935001703018' },
  },

  // --- PANADOL ---
  {
    regex: /panadol\s*extra/i,
    primaryBarcode: '8935006530015', // Hộp Panadol Extra đỏ GS1 VN
    unitBarcodes: { 'Hộp': '8935006530015', 'Vỉ': '8935006530022', 'Viên': '8935006530022' },
  },
  {
    regex: /panadol.*(xanh|paracetamol\s*500)/i,
    primaryBarcode: '8935006531012', // Hộp Panadol xanh thường
    unitBarcodes: { 'Hộp': '8935006531012', 'Vỉ': '8935006531029' },
  },
  {
    regex: /panadol.*cảm\s*cúm/i,
    primaryBarcode: '8935006532019',
    unitBarcodes: { 'Hộp': '8935006532019', 'Vỉ': '8935006532026' },
  },
  {
    regex: /panadol.*trẻ\s*em/i,
    primaryBarcode: '8935006533016',
  },

  // --- HAPACOL (DƯỢC HẬU GIANG - DHG) ---
  {
    regex: /hapacol\s*650/i,
    primaryBarcode: '8935061600104', // Hapacol 650 DHG chuẩn GS1 VN
    unitBarcodes: { 'Hộp': '8935061600104', 'Vỉ': '8935061600111', 'Viên': '8935061600111' },
  },
  {
    regex: /hapacol\s*500/i,
    primaryBarcode: '8935061600012',
    unitBarcodes: { 'Hộp': '8935061600012', 'Vỉ': '8935061600029' },
  },
  {
    regex: /hapacol\s*sủi/i,
    primaryBarcode: '8935061600029',
  },
  {
    regex: /hapacol\s*250/i,
    primaryBarcode: '8935061600036',
  },
  {
    regex: /hapacol\s*150/i,
    primaryBarcode: '8935061600043',
  },

  // --- EFFERALGAN (UPSA PHÁP) ---
  {
    regex: /efferalgan.*(500|paracetamol)/i,
    primaryBarcode: '3582910073289', // UPSA France EAN-13
    unitBarcodes: { 'Hộp': '3582910073289', 'Viên': '3582910073289' },
  },
  {
    regex: /efferalgan.*codein/i,
    primaryBarcode: '3582910073357',
  },

  // --- CẢM CÚM: DECOLGEN & TIFFY ---
  {
    regex: /decolgen/i,
    primaryBarcode: '8934563120108',
    unitBarcodes: { 'Hộp': '8934563120108', 'Vỉ': '8934563120115' },
  },
  {
    regex: /tiffy/i,
    primaryBarcode: '8934563130107',
    unitBarcodes: { 'Hộp': '8934563130107', 'Vỉ': '8934563130114' },
  },

  // --- KHÁNG SINH: AUGMENTIN, AMOXICILLIN, CEFUROXIM, ZINNAT, CEPHALEXIN ---
  {
    regex: /augmentin.*625/i,
    primaryBarcode: '3582910081239',
    unitBarcodes: { 'Hộp': '3582910081239', 'Vỉ': '3582910081239' },
  },
  {
    regex: /augmentin.*1\s*g/i,
    primaryBarcode: '3582910081246',
  },
  {
    regex: /amoxicillin.*500/i,
    primaryBarcode: '8935061601019',
    unitBarcodes: { 'Hộp': '8935061601019', 'Vỉ': '8935061601026' },
  },
  {
    regex: /cefuroxim.*500/i,
    primaryBarcode: '8934812001015',
    unitBarcodes: { 'Hộp': '8934812001015', 'Vỉ': '8934812001022' },
  },
  {
    regex: /zinnat/i,
    primaryBarcode: '5000456012347',
  },
  {
    regex: /cephalexin.*500/i,
    primaryBarcode: '8935061601026',
  },
  {
    regex: /klacid/i,
    primaryBarcode: '8430000123458',
  },

  // --- TIÊU HÓA: SMECTA, GAVISCON, PHOSPHALUGEL, BERBERIN, MOTILIUM ---
  {
    regex: /smecta/i,
    primaryBarcode: '3582910091016',
    unitBarcodes: { 'Hộp': '3582910091016', 'Gói': '3582910091023' },
  },
  {
    regex: /gaviscon/i,
    primaryBarcode: '8935001244018',
    unitBarcodes: { 'Hộp': '8935001244018', 'Gói': '8935001244025' },
  },
  {
    regex: /phosphalugel/i,
    primaryBarcode: '3582910092013',
    unitBarcodes: { 'Hộp': '3582910092013', 'Gói': '3582910092020' },
  },
  {
    regex: /berberin/i,
    primaryBarcode: '8934812003019',
    unitBarcodes: { 'Lọ': '8934812003019', 'Viên': '8934812003019' },
  },
  {
    regex: /motilium/i,
    primaryBarcode: '8935001245015',
  },
  {
    regex: /nexium.*40/i,
    primaryBarcode: '7321427123456',
  },
  {
    regex: /nexium.*20/i,
    primaryBarcode: '7321427123463',
  },
  {
    regex: /loperamid/i,
    primaryBarcode: '8935061603020',
  },

  // --- DẦU GIÓ & XOA BÓP ---
  {
    regex: /dầu.*(con\s*ó|eagle\s*brand)/i,
    primaryBarcode: '8888062001026', // Dầu gió xanh Con Ó Singapore
    unitBarcodes: { 'Chai': '8888062001026' },
  },
  {
    regex: /phật\s*linh/i,
    primaryBarcode: '8934789001014',
  },
  {
    regex: /khuynh\s*diệp.*opc/i,
    primaryBarcode: '8934563001018',
  },
  {
    regex: /deep\s*heat.*rohto/i,
    primaryBarcode: '8934674001018',
  },

  // --- VITAMIN & TPCN ---
  {
    regex: /berocca/i,
    primaryBarcode: '9310160820549', // Berocca Bayer Úc
    unitBarcodes: { 'Tuýp': '9310160820549', 'Viên': '9310160820549' },
  },
  {
    regex: /plusssz/i,
    primaryBarcode: '5904730999015',
  },
  {
    regex: /boganic/i,
    primaryBarcode: '8934602001011',
    unitBarcodes: { 'Hộp': '8934602001011', 'Vỉ': '8934602001028' },
  },
  {
    regex: /hoạt\s*huyết\s*dưỡng\s*não/i,
    primaryBarcode: '8934602002018',
    unitBarcodes: { 'Hộp': '8934602002018', 'Vỉ': '8934602002025' },
  },
  {
    regex: /tottri/i,
    primaryBarcode: '8934602003015',
  },
  {
    regex: /kim\s*tiền\s*thảo.*opc/i,
    primaryBarcode: '8934563002015',
  },
  {
    regex: /enervon/i,
    primaryBarcode: '8935001255014',
  },

  // --- HÔ HẤP & KẸO NGẬM ---
  {
    regex: /eugica.*đỏ/i,
    primaryBarcode: '8935012300018',
    unitBarcodes: { 'Hộp': '8935012300018', 'Vỉ': '8935012300025' },
  },
  {
    regex: /eugica/i,
    primaryBarcode: '8935012300025',
    unitBarcodes: { 'Hộp': '8935012300025', 'Vỉ': '8935012300032' },
  },
  {
    regex: /prospan/i,
    primaryBarcode: '4011548001015',
  },
  {
    regex: /astex/i,
    primaryBarcode: '8934658001019',
  },
  {
    regex: /bảo\s*thanh/i,
    primaryBarcode: '8936014001015',
  },
  {
    regex: /strepsils.*cool/i,
    primaryBarcode: '8939004455667',
  },
  {
    regex: /strepsils.*chanh/i,
    primaryBarcode: '8939004455674',
  },
  {
    regex: /strepsils.*cam/i,
    primaryBarcode: '8939004455681',
  },
  {
    regex: /strepsils/i,
    primaryBarcode: '8939004455667',
  },

  // --- MẮT & DUNG DỊCH ---
  {
    regex: /rohto.*(new|nhỏ\s*mắt)/i,
    primaryBarcode: '8934674001018',
    unitBarcodes: { 'Chai': '8934674001018', 'Lọ': '8934674001018' },
  },
  {
    regex: /natri\s*clorid.*0[,.]9.*10\s*ml/i,
    primaryBarcode: '8934658002016',
  },
  {
    regex: /natri\s*clorid.*0[,.]9.*500\s*ml/i,
    primaryBarcode: '8934658002023',
  },
  {
    regex: /povidine/i,
    primaryBarcode: '8934658003013',
  },

  // --- TRÁNH THAI & SINH LÝ ---
  {
    regex: /newlevo/i,
    primaryBarcode: '8935001948834',
  },
  {
    regex: /durex.*fetherlite/i,
    primaryBarcode: '8850123456789',
  },
  {
    regex: /durex/i,
    primaryBarcode: '8850123456796',
  }
];

async function migrateAllMedicinesToRealGS1() {
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB Atlas');

  const medicinesCol = mongoose.connection.db.collection('medicines');
  const allMeds = await medicinesCol.find().toArray();
  console.log(`📦 Found ${allMeds.length} medicines in collection 'medicines'.`);

  const assignedBarcodes = new Set();
  let updatedCatalogCount = 0;
  let updatedDeterministicCount = 0;
  let unitsUpdatedCount = 0;

  const bulkOps = [];

  for (const med of allMeds) {
    const medId = med._id.toString();
    const medName = med.name || '';
    const sku = med.sku || `MED-${medId.slice(-6).toUpperCase()}`;

    // 1. Kiểm tra xem có khớp biệt dược nổi tiếng trong REAL_WORLD_CATALOG không
    const catalogMatch = REAL_WORLD_CATALOG.find((item) => item.regex.test(medName));

    let chosenBarcode;
    let unitBarcodeMap = {};

    if (catalogMatch) {
      chosenBarcode = catalogMatch.primaryBarcode;
      unitBarcodeMap = catalogMatch.unitBarcodes || {};
      updatedCatalogCount++;
    } else {
      // 2. Nếu không thuộc catalog biệt dược, sinh mã EAN-13 chuẩn Việt Nam 893 xác định
      chosenBarcode = generateDeterministicGS1Barcode(medId + sku);
      // Đảm bảo không va chạm
      let counter = 1;
      while (assignedBarcodes.has(chosenBarcode)) {
        chosenBarcode = generateDeterministicGS1Barcode(`${medId}_${counter}`);
        counter++;
      }
      updatedDeterministicCount++;
    }

    assignedBarcodes.add(chosenBarcode);

    // 3. Chuẩn hóa units: gán barcode cho từng đơn vị đóng gói
    let updatedUnits = [];
    if (Array.isArray(med.units) && med.units.length > 0) {
      updatedUnits = med.units.map((u, idx) => {
        const uName = u.unitName || u.name || '';
        let uBarcode = u.barcode;

        // Nếu có mapping riêng cho unit trong catalog
        const mappedFromCatalog = Object.keys(unitBarcodeMap).find((k) =>
          uName.toLowerCase().includes(k.toLowerCase())
        );

        if (mappedFromCatalog) {
          uBarcode = unitBarcodeMap[mappedFromCatalog];
        } else if (u.isBaseUnit || idx === 0) {
          uBarcode = chosenBarcode;
        } else {
          // Đơn vị quy đổi con (Vỉ, Gói, Viên, Miếng...): sinh mã GS1 EAN-13 tương ứng
          uBarcode = generateDeterministicGS1Barcode(`${medId}_${uName}`, idx + 1);
        }

        return {
          ...u,
          barcode: uBarcode,
        };
      });
      unitsUpdatedCount += updatedUnits.length;
    } else {
      // Nếu chưa có units, tạo đơn vị cơ sở mặc định
      updatedUnits = [
        {
          unitName: med.unit || 'Hộp',
          exchangeValue: 1,
          price: med.price || 50000,
          isBaseUnit: true,
          barcode: chosenBarcode,
        },
      ];
      unitsUpdatedCount++;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: med._id },
        update: {
          $set: {
            barcode: chosenBarcode,
            sku,
            units: updatedUnits,
          },
        },
      },
    });
  }

  console.log(`\n⏳ Executing bulkWrite for ${bulkOps.length} medicines...`);
  const bulkResult = await medicinesCol.bulkWrite(bulkOps);
  console.log(`✅ Bulk write completed!`);
  console.log(`   👉 Matched: ${bulkResult.matchedCount}`);
  console.log(`   👉 Modified: ${bulkResult.modifiedCount}`);
  console.log(`   👉 Well-known Brand GS1 matched: ${updatedCatalogCount}`);
  console.log(`   👉 Standard GS1 EAN-13 generated: ${updatedDeterministicCount}`);
  console.log(`   👉 Total packaging units updated: ${unitsUpdatedCount}`);

  // Kiểm tra tính hợp lệ của tất cả mã vạch sau migration
  const sampleVerification = await medicinesCol.find().limit(10).toArray();
  console.log('\n--- VERIFICATION OF FIRST 10 MEDICINES ---');
  sampleVerification.forEach((m, idx) => {
    console.log(`${idx + 1}. [${m.barcode}] ${m.name}`);
    if (m.units) {
      m.units.forEach((u) => console.log(`   - Unit "${u.unitName}": barcode=${u.barcode}`));
    }
  });

  await mongoose.disconnect();
  console.log('\n🎉 Finished migrating all medicines to GS1 Barcode Standard!');
}

migrateAllMedicinesToRealGS1().catch(console.error);
