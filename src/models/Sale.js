import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
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
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  order_id: {
    type: String,
    required: true,
    unique: true,
  },
  order_date: {
    type: Date,
    required: true,
  },
  platform_name: {
    type: String,
    required: true,
  },
  platformId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Platform',
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
  },
  format: {
    type: String,
    enum: ['ebook', 'physical'],
    default: 'physical',
  },
  upload_date: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Performance Indexes
saleSchema.index({ authorId: 1 });
saleSchema.index({ bookId: 1 });
saleSchema.index({ order_date: -1 });
saleSchema.index({ isbn: 1 });
saleSchema.index({ authorId: 1, order_date: -1 }); // Compound index for performance dashboard

const Sale = mongoose.model('Sale', saleSchema);

export default Sale;
