const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/WDP201?appName=Cluster0';

async function updateSalonpasTest() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('WDP201');
    const col = db.collection('medicines');

    // ID của Cao dán Salonpas Hisamitsu 20 miếng: 6a21a9a84f7acd1b57259765
    const id = new ObjectId('6a21a9a84f7acd1b57259765');
    
    // Thêm các biến thể barcode thực tế vào units và aliases
    const realBarcodes = [
      { unitName: 'Hộp 20 Miếng (Chính Hãng)', exchangeValue: 20, price: 35000, isBaseUnit: true, barcode: '8935001701118' },
      { unitName: 'Hộp 20 Miếng (GS1 VN)', exchangeValue: 20, price: 35000, isBaseUnit: false, barcode: '8935001701113' },
      { unitName: 'Gói 10 Miếng (Lẻ)', exchangeValue: 10, price: 18000, isBaseUnit: false, barcode: '8935001701101' },
      { unitName: 'Gói 10 Miếng (GS1 VN)', exchangeValue: 10, price: 18000, isBaseUnit: false, barcode: '8935001701106' },
      { unitName: 'Hộp 140 Miếng (Hisamitsu Nhật)', exchangeValue: 140, price: 290000, isBaseUnit: false, barcode: '4987188100325' },
      { unitName: 'Hộp 60 Miếng (Bản Mỹ Walmart)', exchangeValue: 60, price: 195000, isBaseUnit: false, barcode: '0799441262497' },
      { unitName: 'Hộp 60 Miếng (UPC-12)', exchangeValue: 60, price: 195000, isBaseUnit: false, barcode: '799441262497' },
      { unitName: 'Hộp 60 Miếng (US Packaging)', exchangeValue: 60, price: 195000, isBaseUnit: false, barcode: '0654322487744' },
      { unitName: 'Hộp 60 Miếng (US UPC-12)', exchangeValue: 60, price: 195000, isBaseUnit: false, barcode: '654322487744' },
      { unitName: 'Mã Định Danh Long Châu', exchangeValue: 20, price: 35000, isBaseUnit: false, barcode: '893100105223' },
      { unitName: 'Mã Long Châu EAN-13', exchangeValue: 20, price: 35000, isBaseUnit: false, barcode: '0893100105223' }
    ];

    const aliases = realBarcodes.map(u => u.barcode);

    await col.updateOne(
      { _id: id },
      {
        $set: {
          units: realBarcodes,
          aliases: aliases
        }
      }
    );

    console.log('✅ Đã cập nhật Salonpas 20 miếng với các mã barcode thực tế!');
  } finally {
    await client.close();
  }
}

updateSalonpasTest();
