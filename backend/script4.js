
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/WDP201?appName=Cluster0');
const schema = new mongoose.Schema({}, { strict: false, collection: 'medicinebatches' });
const Batch = mongoose.model('MedicineBatch', schema);

Batch.aggregate([
  {
    $match: {
      branchId: 'CENTRAL_WH',
      status: 'ACTIVE',
      stock: { $gt: 0 }
    }
  },
  {
    $group: {
      _id: {
        zone: { $ifNull: ['$location.zone', 'A'] },
        rack: { $ifNull: ['$location.rack', 'A1'] },
        shelf: { $ifNull: ['$location.shelf', 1] }
      },
      totalStock: { $sum: '$stock' }
    }
  }
]).then(res => {
  console.log(res.length);
  process.exit(0);
});

