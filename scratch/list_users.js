import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    email: String,
    role: String
  }));

  const admins = await User.find({ role: 'admin' });
  console.log('Admins in DB:');
  console.log(JSON.stringify(admins, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
