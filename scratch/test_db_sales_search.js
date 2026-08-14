import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Sale from '../src/models/Sale.js';
import User from '../src/models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB successfully!');

  // Test Search 1: "Sumera"
  const search1 = 'Sumera';
  const matchedAuthors1 = await User.find({
    name: { $regex: search1, $options: 'i' }
  }).select('_id');
  const authorIds1 = matchedAuthors1.map(author => author._id);

  let query1 = {};
  query1.$or = [
    { title: { $regex: search1, $options: 'i' } },
    { isbn: { $regex: search1, $options: 'i' } },
    { order_id: { $regex: search1, $options: 'i' } }
  ];

  if (authorIds1.length > 0) {
    query1.$or.push({ authorId: { $in: authorIds1 } });
  }

  const sales1 = await Sale.find(query1).populate('authorId', 'name email').limit(5).lean();
  console.log('\n--- Sales matching search "Sumera" ---');
  sales1.forEach(s => {
    console.log(`Order ID: "${s.order_id}" | Title: "${s.title}" | Author: "${s.authorId?.name}" | MRP: ₹${s.mrp}`);
  });

  // Test Search 2: "JAVED"
  const search2 = 'JAVED';
  const matchedAuthors2 = await User.find({
    name: { $regex: search2, $options: 'i' }
  }).select('_id');
  const authorIds2 = matchedAuthors2.map(author => author._id);

  let query2 = {};
  query2.$or = [
    { title: { $regex: search2, $options: 'i' } },
    { isbn: { $regex: search2, $options: 'i' } },
    { order_id: { $regex: search2, $options: 'i' } }
  ];

  if (authorIds2.length > 0) {
    query2.$or.push({ authorId: { $in: authorIds2 } });
  }

  const sales2 = await Sale.find(query2).populate('authorId', 'name email').limit(5).lean();
  console.log('\n--- Sales matching search "JAVED" ---');
  sales2.forEach(s => {
    console.log(`Order ID: "${s.order_id}" | Title: "${s.title}" | Author: "${s.authorId?.name}" | MRP: ₹${s.mrp}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
