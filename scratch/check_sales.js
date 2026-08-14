import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Sale from '../src/models/Sale.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  
  const count = await Sale.countDocuments();
  console.log(`Total Sales in DB: ${count}`);

  const sampleSales = await Sale.find().populate('authorId', 'name').limit(5).lean();
  console.log('Sample Sales:');
  sampleSales.forEach(s => {
    console.log(`Order ID: "${s.order_id}" | Title: "${s.title}" | Author: "${s.authorId?.name}"`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
