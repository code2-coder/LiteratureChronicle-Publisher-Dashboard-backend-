import mongoose from 'mongoose';
import User from '../src/models/User.js';

async function run() {
  try {
    await mongoose.connect('mongodb+srv://maddyprojects3_db_user:m4hxCGIte4mDwbGr@cluster0.kdvm5qr.mongodb.net/?appName=Cluster0');
    const user = await User.findOne({ email: 'vp0303739@gmail.com' });
    if (user) {
      user.password = 'password123';
      await user.save();
      console.log("SUCCESS: Password updated for vp0303739@gmail.com");
    } else {
      console.log("ERROR: Admin user not found");
    }
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    process.exit(0);
  }
}
run();
