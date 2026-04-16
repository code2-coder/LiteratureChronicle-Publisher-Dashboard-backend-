import mongoose from 'mongoose';

const platformSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  commission_percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
}, {
  timestamps: true,
});

const Platform = mongoose.model('Platform', platformSchema);

export default Platform;
