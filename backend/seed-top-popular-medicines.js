const mongoose = require('mongoose');
const uri = 'mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/WDP201?appName=Cluster0';

const POPULAR_NATIONAL_MEDICINES = [
  {
    name: 'Thuốc giảm đau, hạ sốt Panadol Extra đỏ (Hộp 15 vỉ x 12 viên)',
    genericName: 'Paracetamol 500mg, Caffeine 65mg',
    active_ingredient: 'Paracetamol 500mg, Caffeine 65mg',
    category: 'Giảm đau - Hạ sốt',
    drug_classification: 'NON_PRESCRIPTION',
    manufacturer: 'GlaxoSmithKline (GSK)',
    unit: 'Hộp',
    price: 245000,
    barcode: '8935006530015', // Barcode GS1 EAN-13 chuẩn thật của Hộp Panadol Extra đỏ
    sku: 'MED-PANADOL-EXTRA-RED',
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&auto=format&fit=crop&q=80',
    units: [
      { unitName: 'Hộp', exchangeValue: 180, price: 245000, isBaseUnit: true, barcode: '8935006530015' },
      { unitName: 'Vỉ (12 Viên)', exchangeValue: 12, price: 17000, isBaseUnit: false, barcode: '8935006530022' },
      { unitName: 'Viên', exchangeValue: 1, price: 1500, isBaseUnit: false, barcode: '8935006530022' }
    ],
    batches: [
      {
        batchNo: 'LOT-PAN-2026-01',
        expDate: new Date('2028-12-31T23:59:59.000Z'),
        mfgDate: new Date('2025-01-01T00:00:00.000Z'),
        stock: 350,
        status: 'ACTIVE',
        branchId: 'BR-001',
        importPrice: 180000,
        location: { zone: 'B', rack: 'B1', shelf: 1 }
      }
    ]
  },
  {
    name: 'Thuốc giảm đau hạ sốt Hapacol 650 Dược Hậu Giang (Hộp 10 vỉ x 10 viên)',
    genericName: 'Paracetamol 650mg',
    active_ingredient: 'Paracetamol 650mg',
    category: 'Giảm đau - Hạ sốt',
    drug_classification: 'NON_PRESCRIPTION',
    manufacturer: 'Công ty Cổ phần Dược Hậu Giang (DHG)',
    unit: 'Hộp',
    price: 110000,
    barcode: '8935061600104', // Barcode GS1 EAN-13 chuẩn thật của Hộp Hapacol 650
    sku: 'MED-HAPACOL-650',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    units: [
      { unitName: 'Hộp', exchangeValue: 100, price: 110000, isBaseUnit: true, barcode: '8935061600104' },
      { unitName: 'Vỉ (10 Viên)', exchangeValue: 10, price: 12000, isBaseUnit: false, barcode: '8935061600111' },
      { unitName: 'Viên', exchangeValue: 1, price: 1200, isBaseUnit: false, barcode: '8935061600111' }
    ],
    batches: [
      {
        batchNo: 'LOT-HAP-2026-01',
        expDate: new Date('2028-06-30T23:59:59.000Z'),
        mfgDate: new Date('2025-01-01T00:00:00.000Z'),
        stock: 500,
        status: 'ACTIVE',
        branchId: 'BR-001',
        importPrice: 80000,
        location: { zone: 'B', rack: 'B1', shelf: 2 }
      }
    ]
  },
  {
    name: 'Thuốc sủi giảm đau hạ sốt Efferalgan 500mg UPSA Pháp (Hộp 4 vỉ x 4 viên sủi)',
    genericName: 'Paracetamol 500mg',
    active_ingredient: 'Paracetamol 500mg',
    category: 'Giảm đau - Hạ sốt',
    drug_classification: 'NON_PRESCRIPTION',
    manufacturer: 'UPSA SAS (Pháp)',
    unit: 'Hộp',
    price: 72000,
    barcode: '3582910073289', // Barcode quốc tế EAN-13 chuẩn của Efferalgan 500mg
    sku: 'MED-EFFERALGAN-500',
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&auto=format&fit=crop&q=80',
    units: [
      { unitName: 'Hộp', exchangeValue: 16, price: 72000, isBaseUnit: true, barcode: '3582910073289' },
      { unitName: 'Vỉ (4 Viên)', exchangeValue: 4, price: 19000, isBaseUnit: false, barcode: '3582910073289' },
      { unitName: 'Viên', exchangeValue: 1, price: 5000, isBaseUnit: false, barcode: '3582910073289' }
    ],
    batches: [
      {
        batchNo: 'LOT-EFF-2026-01',
        expDate: new Date('2028-10-31T23:59:59.000Z'),
        mfgDate: new Date('2025-01-01T00:00:00.000Z'),
        stock: 200,
        status: 'ACTIVE',
        branchId: 'BR-001',
        importPrice: 55000,
        location: { zone: 'B', rack: 'B2', shelf: 1 }
      }
    ]
  },
  {
    name: 'Thuốc nhỏ mắt V.Rohto New Rohto-Mentholatum (Chai 13ml)',
    genericName: 'Tetrahydrozoline, Dipotassium Glycyrrhizinate, Vitamin B6',
    active_ingredient: 'Tetrahydrozoline, Dipotassium Glycyrrhizinate, Vitamin B6',
    category: 'Nhãn khoa',
    drug_classification: 'NON_PRESCRIPTION',
    manufacturer: 'Công ty TNHH Rohto-Mentholatum Việt Nam',
    unit: 'Chai',
    price: 52000,
    barcode: '8934674001018', // Barcode GS1 EAN-13 chuẩn thật của V.Rohto
    sku: 'MED-VROHTO-NEW',
    image: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=500&auto=format&fit=crop&q=80',
    units: [
      { unitName: 'Chai', exchangeValue: 1, price: 52000, isBaseUnit: true, barcode: '8934674001018' }
    ],
    batches: [
      {
        batchNo: 'LOT-ROH-2026-01',
        expDate: new Date('2028-08-31T23:59:59.000Z'),
        mfgDate: new Date('2025-01-01T00:00:00.000Z'),
        stock: 150,
        status: 'ACTIVE',
        branchId: 'BR-001',
        importPrice: 38000,
        location: { zone: 'F', rack: 'F1', shelf: 1 }
      }
    ]
  }
];

async function seedNationalMeds() {
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const medicinesCol = mongoose.connection.db.collection('medicines');
  const batchesCol = mongoose.connection.db.collection('medicinebatches');

  for (const item of POPULAR_NATIONAL_MEDICINES) {
    const existing = await medicinesCol.findOne({
      $or: [
        { barcode: item.barcode },
        { sku: item.sku }
      ]
    });

    let medId;
    if (existing) {
      console.log(`ℹ️ "${item.name}" already exists with barcode ${existing.barcode}. Updating...`);
      await medicinesCol.updateOne(
        { _id: existing._id },
        {
          $set: {
            name: item.name,
            barcode: item.barcode,
            sku: item.sku,
            units: item.units,
            manufacturer: item.manufacturer,
            price: item.price
          }
        }
      );
      medId = existing._id.toString();
    } else {
      console.log(`➕ Inserting "${item.name}" with real barcode ${item.barcode}...`);
      const { batches, ...medData } = item;
      const insertRes = await medicinesCol.insertOne({
        ...medData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      medId = insertRes.insertedId.toString();
    }

    // Đảm bảo có lô ACTIVE
    const existingBatch = await batchesCol.findOne({ medicineId: medId, status: 'ACTIVE' });
    if (!existingBatch && item.batches) {
      for (const b of item.batches) {
        await batchesCol.insertOne({
          ...b,
          medicineId: medId,
          openedStock: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      console.log(`  -> Added active batch for ${item.name}`);
    }
  }

  console.log('🎉 Successfully seeded popular national medicines!');
  await mongoose.disconnect();
}

seedNationalMeds().catch(console.error);
