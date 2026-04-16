import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const platformSchema = new mongoose.Schema({
  name: { type: String, required: true },
  commission_percentage: { type: Number, required: true },
}, { timestamps: true });

const Platform = mongoose.model('Platform', platformSchema);

const seedPlatforms = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const platforms = [
      { name: 'Amazon', commission_percentage: 15 },
      { name: 'Flipkart', commission_percentage: 15 },
      { name: 'Kindle', commission_percentage: 15 }
    ];

    for (const p of platforms) {
      const exists = await Platform.findOne({ name: new RegExp(`^${p.name}$`, 'i') });
      if (!exists) {
        await Platform.create(p);
        console.log(`Created platform: ${p.name}`);
      } else {
        console.log(`Platform already exists: ${p.name}`);
      }
    }

    console.log('Seeding completed');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedPlatforms();
