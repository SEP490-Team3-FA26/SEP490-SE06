const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI || process.env.MONGODB_CONNECTION_STRING;

if (!uri) {
  console.error('❌ Thiếu biến môi trường MONGODB_URI trong file .env');
  process.exit(1);
}

async function run() {
  await mongoose.connect(uri);
  await mongoose.connection.collection('users').updateOne(
    { email: 'user@vinapharmacy.com' },
    { $set: { tier: 'Silver' } }
  );
  const user = await mongoose.connection.collection('users').findOne({ email: 'user@vinapharmacy.com' });
  console.log('UPDATED USER FROM DB:', {
    email: user.email,
    points: user.points,
    accumulatedPoints: user.accumulatedPoints,
    tier: user.tier
  });
  await mongoose.disconnect();
}
run().catch(console.error);
