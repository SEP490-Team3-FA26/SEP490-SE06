
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/WDP201?appName=Cluster0');
const schema = new mongoose.Schema({}, { strict: false, collection: 'medicinebatches' });
const Batch = mongoose.model('MedicineBatch', schema);
Batch.aggregate([
  { $group: { _id: '$location', count: { $sum: 1 } } }
]).then(res => {
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
});

