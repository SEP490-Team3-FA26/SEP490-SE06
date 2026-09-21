const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/WDP201?appName=Cluster0';

async function testQuery() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('WDP201');
    const col = db.collection('medicines');

    const code = '4987188100325';
    console.time('find');
    const res = await col.findOne({
      $or: [
        { barcode: code },
        { sku: code },
        { 'units.barcode': code },
        { aliases: code }
      ]
    });
    console.timeEnd('find');
    console.log('Result found:', !!res, res ? res.name : null);
  } finally {
    await client.close();
  }
}

testQuery();
