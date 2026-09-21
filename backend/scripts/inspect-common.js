const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/WDP201?appName=Cluster0';

async function checkCommonMedicines() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('WDP201');
    const col = db.collection('medicines');

    const keywords = ['panadol', 'efferalgan', 'hapacol', 'berberin', 'natri clorid', 'strepsils', 'con ó'];
    for (const kw of keywords) {
      const items = await col.find({ name: { $regex: new RegExp(kw, 'i') } }).limit(4).toArray();
      console.log(`=== KEYWORD: ${kw} (${items.length} items) ===`);
      items.forEach(i => {
        console.log(`ID: ${i._id} | Tên: ${i.name.substring(0, 50)}... | Barcode: ${i.barcode} | Sku: ${i.sku}`);
      });
    }
  } finally {
    await client.close();
  }
}

checkCommonMedicines();
