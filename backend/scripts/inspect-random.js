const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/WDP201?appName=Cluster0';

async function inspectRandomMedicines() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('WDP201');
    const items = await db.collection('medicines').aggregate([{ $sample: { size: 10 } }]).toArray();
    console.log('--- 10 THUỐC NGẪU NHIÊN TRONG DB ---');
    items.forEach(i => {
      console.log(`ID: ${i._id} | Name: ${i.name?.substring(0, 35)} | Barcode: [${i.barcode}] | Units: ${i.units?.map(u => u.barcode).join(', ')}`);
    });
  } finally {
    await client.close();
  }
}

inspectRandomMedicines();
