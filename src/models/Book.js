import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  isbn: {
    type: String,
    required: true,
  },
  mrp: {
    type: Number,
    required: true,
  },
  printing_cost: {
    type: Number,
    default: 0,
  },
  sku_code: {
    type: String,
    required: true,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  book_sizes: {
    type: String,
    default: '5x8',
  },
  book_cover: {
    type: String, // Cloudinary URL
  },
  format: {
    type: String,
    enum: ['ebook', 'physical'],
    default: 'physical',
  },
}, {
  timestamps: true,
});

// Performance Indexes
bookSchema.index({ authorId: 1 });
bookSchema.index({ sku_code: 1 });
bookSchema.index({ isbn: 1 });

const Book = mongoose.model('Book', bookSchema);

export default Book;
