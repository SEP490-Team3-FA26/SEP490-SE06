const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const uri = process.env.MONGODB_URI;
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB Atlas via Mongoose!");
    const db = mongoose.connection.db;

    const branches = await db.collection("branches").find().toArray();
    console.log(`=== BRANCHES (${branches.length}) ===`);
    branches.forEach(b => console.log({ branchCode: b.branchCode, name: b.name, address: b.address, location: b.location }));

    const users = await db.collection("users").find().toArray();
    console.log(`=== USERS (${users.length}) ===`);
    users.forEach(u => console.log({ email: u.email, fullName: u.fullName, phone: u.phone, address: u.address, branchId: u.branchId, role: u.role }));

    const orders = await db.collection("orders").find().sort({ createdAt: -1 }).limit(5).toArray();
    console.log(`=== RECENT ORDERS (${orders.length}) ===`);
    orders.forEach(o => console.log({ 
      orderCode: o.orderCode, 
      paymentStatus: o.paymentStatus, 
      deliveryStatus: o.deliveryStatus,
      status: o.status,
      shippingAddress: o.shippingAddress,
      branchId: o.branchId,
      branchName: o.branchName,
      createdAt: o.createdAt,
      patientName: o.patientName,
      patientPhone: o.patientPhone
    }));

  } catch (err) {
    console.error("Error: ", err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
