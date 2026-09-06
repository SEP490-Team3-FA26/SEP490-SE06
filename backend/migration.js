
const mongoose = require('mongoose');

async function migrate() {
  await mongoose.connect('mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/WDP201?appName=Cluster0');
  const batchSchema = new mongoose.Schema({}, { strict: false, collection: 'medicinebatches' });
  const Batch = mongoose.model('MedicineBatch', batchSchema);
  const medSchema = new mongoose.Schema({}, { strict: false, collection: 'medicines' });
  const Med = mongoose.model('Medicine', medSchema);

  const batches = await Batch.find({ location: { $exists: false } });
  console.log('Found batches:', batches.length);

  const categoryZoneMap = {
    'Kháng sinh': 'A',
    'H? s?t & Gi?m dau': 'B',
    'Tim m?ch': 'C',
    'Tiêu hóa': 'D',
    'Th?c ph?m ch?c nang': 'E',
    'V?t tu y t?': 'F'
  };

  const medicineIds = [...new Set(batches.map(b => b.medicineId))];
  const medicines = await Med.find({ _id: { $in: medicineIds } }).select('category');
  const medMap = new Map(medicines.map(m => [m._id.toString(), m.category || '']));

  const counters = {};
  let updatedCount = 0;

  for (const batch of batches) {
    const category = medMap.get(batch.medicineId) || 'Kháng sinh';
    const zone = categoryZoneMap[category] || 'A';
    
    if (!counters[zone]) counters[zone] = { rack: 1, shelf: 1 };
    
    const rackStr = zone + counters[zone].rack;
    const shelfNum = counters[zone].shelf;

    await Batch.updateOne({ _id: batch._id }, { $set: { location: { zone, rack: rackStr, shelf: shelfNum } } });
    updatedCount++;

    counters[zone].shelf++;
    if (counters[zone].shelf > 4) {
      counters[zone].shelf = 1;
      counters[zone].rack++;
      if (counters[zone].rack > 4) counters[zone].rack = 1; // Wrap around
    }
  }

  console.log('Updated:', updatedCount);
  process.exit(0);
}

migrate();

