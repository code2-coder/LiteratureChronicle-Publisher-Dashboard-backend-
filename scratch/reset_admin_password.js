import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const userSchema = new mongoose.Schema({
    email: String,
    password: String
  });

  userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
      return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  });

  const User = mongoose.model('User', userSchema);

  const admin = await User.findOne({ email: 'task.literaturechronicle@gmail.com' });
  if (admin) {
    admin.password = 'admin123';
    await admin.save();
    console.log('Password updated successfully for task.literaturechronicle@gmail.com!');
  } else {
    console.log('Admin not found!');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
