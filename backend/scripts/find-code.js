const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/WDP201?appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const col = client.db('WDP201').collection('medicines');
    const code = '8930003785326';
    const found = await col.find({
      $or: [
        { barcode: code },
        { sku: code },
        { 'units.barcode': code },
        { aliases: code }
      ]
    }).toArray();
    console.log(`Tìm thấy với mã ${code}:`, found.length);
    found.forEach(f => console.log(f._id, f.name, f.barcode));
  } finally {
    await client.close();
  }
}

run();
