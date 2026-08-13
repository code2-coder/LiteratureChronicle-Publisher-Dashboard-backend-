import mongoose from 'mongoose';

const royaltySchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  author_name: {
    type: String,
  },
  author_contact_number: {
    type: String,
  },
  upload_date: {
    type: Date,
    default: Date.now,
  },
  payment_date: {
    type: Date,
  },
  paid_amount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

// Performance Indexes
royaltySchema.index({ authorId: 1 });
royaltySchema.index({ author_contact_number: 1 });
royaltySchema.index({ payment_date: -1 });

const Royalty = mongoose.model('Royalty', royaltySchema);

export default Royalty;
