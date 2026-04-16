import mongoose from 'mongoose';

const withdrawalRequestSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'processed'],
    default: 'pending',
  },
  bank_details: {
    account_number: String,
    ifsc_code: String,
    bank_name: String,
    holder_name: String,
  },
  requested_at: {
    type: Date,
    default: Date.now,
  },
  processed_at: {
    type: Date,
  },
}, {
  timestamps: true,
});

const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);

export default WithdrawalRequest;
