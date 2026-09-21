const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/WDP201?appName=Cluster0';
async function checkEcosip() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('WDP201');
  const items = await db.collection('medicines').find({ name: { $regex: /ecosip/i } }).toArray();
  console.log('Ecosip items:', items.length);
  items.forEach(i => console.log(i._id, i.name, 'Barcode:', i.barcode, 'SKU:', i.sku, 'Units:', JSON.stringify(i.units)));
  await client.close();
}
checkEcosip();
