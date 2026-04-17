import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('--- MongoDB Connection Verifier ---');
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ ERROR: MONGODB_URI is not defined in your .env file.');
  process.exit(1);
}

console.log('Attempting to connect to MongoDB Atlas...');
// Mask the URI for security but show a part of it
const maskedUri = uri.replace(/\/\/.*@/, '//****:****@');
console.log(`Connecting to: ${maskedUri}`);

mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log('\n✅ SUCCESS: Successfully connected to MongoDB Atlas!');
    console.log('Environment configuration is correct.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ FAILURE: Could not connect to MongoDB Atlas.');
    console.error('Error Message:', err.message);
    console.log('\n--- Troubleshooting Tips ---');
    console.log('1. Check if MONGODB_URI in .env is correct.');
    console.log('2. Ensure your IP is whitelisted in MongoDB Atlas (Network Access -> 0.0.0.0/0).');
    console.log('3. Check if your database user has the correct permissions.');
    process.exit(1);
  });
