import mongoose from 'mongoose';

const royaltySchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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

const Royalty = mongoose.model('Royalty', royaltySchema);

export default Royalty;
