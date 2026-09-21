const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/?appName=Cluster0';

async function listDatabases() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('Databases on Cluster:');
    for (const d of dbs.databases) {
      console.log(`- ${d.name} (${d.sizeOnDisk} bytes)`);
      const db = client.db(d.name);
      const cols = await db.listCollections().toArray();
      const colNames = cols.map(c => c.name);
      if (colNames.includes('medicines')) {
        const count = await db.collection('medicines').countDocuments();
        console.log(`   --> Chứa collection 'medicines' với ${count} documents!`);
      }
    }
  } finally {
    await client.close();
  }
}

listDatabases();
