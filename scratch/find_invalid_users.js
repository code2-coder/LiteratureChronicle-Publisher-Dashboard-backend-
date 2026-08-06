import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://maddyprojects3_db_user:m4hxCGIte4mDwbGr@cluster0.kdvm5qr.mongodb.net/?appName=Cluster0';
    await mongoose.connect(mongoUri);
    
    const users = await User.find({});
    console.log(`Total users in DB: ${users.length}`);
    
    const invalidUsers = [];
    for (const u of users) {
      const isBcrypt = u.password && (u.password.startsWith('$2a$') || u.password.startsWith('$2b$')) && u.password.length === 60;
      if (!u.password || !isBcrypt) {
        invalidUsers.push({
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          passwordLength: u.password ? u.password.length : 0,
          passwordContent: u.password
        });
      }
    }
    
    console.log(`Found ${invalidUsers.length} invalid users:`);
    console.log(JSON.stringify(invalidUsers, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
