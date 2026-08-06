import WithdrawalRequest from '../models/WithdrawalRequest.js';

export const getWithdrawals = async (query = {}) => {
  return await WithdrawalRequest.find(query).populate('authorId', 'name email').sort({ createdAt: -1 });
};

export const createWithdrawal = async (authorId, amount, bank_details, status = 'pending') => {
  const withdrawal = await WithdrawalRequest.create({
    authorId,
    amount,
    bank_details,
    status,
  });
  return await WithdrawalRequest.findById(withdrawal._id).populate('authorId', 'name email');
};

export const updateWithdrawal = async (id, user, updateFields) => {
  const withdrawal = await WithdrawalRequest.findById(id);
  if (!withdrawal) return null;

  // If not admin, check if they own it and if it's pending
  if (user.role !== 'admin') {
    if (withdrawal.authorId.toString() !== user._id.toString()) return null;
    if (withdrawal.status !== 'pending') return null;
  }

  if (updateFields.status !== undefined && user.role === 'admin') {
    withdrawal.status = updateFields.status;
    if (updateFields.status === 'processed') {
      withdrawal.processed_at = Date.now();
    }
  }

  if (updateFields.amount !== undefined) {
    withdrawal.amount = updateFields.amount;
  }

  if (updateFields.bank_details !== undefined) {
    withdrawal.bank_details = updateFields.bank_details;
  }

  const updated = await withdrawal.save();
  return await WithdrawalRequest.findById(updated._id).populate('authorId', 'name email');
};

export const deleteWithdrawal = async (id, user) => {
  const withdrawal = await WithdrawalRequest.findById(id);
  if (!withdrawal) return null;

  // If not admin, check if they own it and if it's pending
  if (user.role !== 'admin') {
    if (withdrawal.authorId.toString() !== user._id.toString()) return null;
    if (withdrawal.status !== 'pending') return null;
  }

  await withdrawal.deleteOne();
  return true;
};

