import mongoose from 'mongoose';
import Book from '../src/models/Book.js';

async function check() {
  try {
    await mongoose.connect('mongodb+srv://maddyprojects3_db_user:m4hxCGIte4mDwbGr@cluster0.kdvm5qr.mongodb.net/?appName=Cluster0');
    const titles = [
      /Transforming Life Through Laws/i,
      /ONE HEART, TWO MIRRORS/i,
      /Before I knew the mess/i
    ];
    for (const title of titles) {
      const books = await Book.find({ title });
      console.log(`\nTitle pattern: ${title}`);
      books.forEach(b => console.log(`Format: ${b.format} | Cover: ${b.book_cover}`));
    }
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    process.exit(0);
  }
}
check();
