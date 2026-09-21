const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/WDP201?appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('WDP201');
    const collection = db.collection('medicines');
    
    // Tìm salonpas
    const results = await collection.find({ 
      $or: [
        { name: { $regex: /salonpas/i } },
        { name: { $regex: /dán/i } }
      ]
    }).limit(15).toArray();

    console.log(`Tìm thấy ${results.length} sản phẩm liên quan:`);
    results.forEach(r => {
      console.log('--------------------------------------------------');
      console.log('ID:', r._id.toString());
      console.log('Tên:', r.name);
      console.log('Barcode:', r.barcode);
      console.log('SKU:', r.sku);
      console.log('Aliases:', r.aliases);
      console.log('Units:', JSON.stringify(r.units));
    });
  } catch (err) {
    console.error('Lỗi:', err);
  } finally {
    await client.close();
  }
}

run();
