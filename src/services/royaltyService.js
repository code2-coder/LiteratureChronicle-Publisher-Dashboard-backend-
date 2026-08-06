import Royalty from '../models/Royalty.js';
import User from '../models/User.js';

/**
 * Calculate royalty for a sale
 */
export const calculateRoyalty = (mrp, commissionPercentage, printingCost, quantity = 1, type = 'physical') => {
  const mrpVal = parseFloat(mrp) || 0;
  const commVal = parseFloat(commissionPercentage) || 0;
  const printCostVal = parseFloat(printingCost) || 0;
  const qtyVal = parseInt(quantity) || 1;

  const platformCommissionValue = mrpVal * (commVal / 100);
  let royaltyPerUnit = 0;

  if (type === 'ebook') {
    royaltyPerUnit = mrpVal - platformCommissionValue;
  } else {
    royaltyPerUnit = mrpVal - platformCommissionValue - printCostVal;
  }

  const totalRoyalty = Math.max(0, royaltyPerUnit * qtyVal);
  return Math.round(totalRoyalty * 100) / 100;
};

export const getPaginatedRoyalties = async (query = {}, options = {}) => {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  const total = await Royalty.countDocuments(query);
  const royalties = await Royalty.find(query)
    .sort({ payment_date: -1 })
    .skip(skip)
    .limit(limit)
    .populate('authorId', 'name mobile_number bank_details');

  return {
    data: royalties,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

export const createRoyalty = async (royaltyData) => {
  const { author_contact_number, amount, paid_amount, payment_date } = royaltyData;
  const author = await User.findOne({ mobile_number: author_contact_number });

  return await Royalty.create({
    authorId: author ? author._id : null,
    author_contact_number,
    amount,
    paid_amount,
    payment_date
  });
};

export const updateRoyalty = async (id, updateFields) => {
  const royalty = await Royalty.findById(id);
  if (!royalty) return null;

  royalty.author_contact_number = updateFields.author_contact_number || royalty.author_contact_number;
  royalty.amount = updateFields.amount || royalty.amount;
  royalty.paid_amount = updateFields.paid_amount !== undefined ? updateFields.paid_amount : royalty.paid_amount;
  royalty.payment_date = updateFields.payment_date || royalty.payment_date;

  if (updateFields.author_contact_number) {
    const author = await User.findOne({ mobile_number: updateFields.author_contact_number });
    royalty.authorId = author ? author._id : royalty.authorId;
  }

  return await royalty.save();
};

export const deleteRoyalty = async (id) => {
  const royalty = await Royalty.findById(id);
  if (!royalty) return null;

  await royalty.deleteOne();
  return true;
};

export const bulkUploadRoyalties = async (royalties) => {
  const authors = await User.find({ role: 'author' }).select('_id mobile_number');
  
  const processedRoyalties = royalties.map(r => {
    const author = authors.find(a => a.mobile_number === r.author_contact_number);
    return {
      ...r,
      authorId: author ? author._id : null,
      status: (r.status || 'paid').toLowerCase()
    };
  });

  return await Royalty.insertMany(processedRoyalties);
};
