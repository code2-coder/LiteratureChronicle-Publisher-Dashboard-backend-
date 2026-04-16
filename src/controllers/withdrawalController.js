import asyncHandler from 'express-async-handler';
import WithdrawalRequest from '../models/WithdrawalRequest.js';

// @desc    Get author withdrawal requests
// @route   GET /api/withdrawals
// @access  Private
const getWithdrawals = asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role !== 'admin') {
    query.authorId = req.user._id;
  }
  const withdrawals = await WithdrawalRequest.find(query).sort({ createdAt: -1 });
  res.json(withdrawals);
});

// @desc    Create a withdrawal request
// @route   POST /api/withdrawals
// @access  Private
const createWithdrawal = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  const withdrawal = await WithdrawalRequest.create({
    authorId: req.user._id,
    amount,
    bank_details: req.user.bank_details,
  });
  res.status(201).json(withdrawal);
});

// @desc    Update withdrawal status
// @route   PUT /api/withdrawals/:id
// @access  Private/Admin
const updateWithdrawalStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const withdrawal = await WithdrawalRequest.findById(req.params.id);

  if (!withdrawal) {
    res.status(404);
    throw new Error('Withdrawal not found');
  }

  withdrawal.status = status;
  if (status === 'processed') {
    withdrawal.processed_at = Date.now();
  }
  const updatedWithdrawal = await withdrawal.save();
  res.json(updatedWithdrawal);
});

export { getWithdrawals, createWithdrawal, updateWithdrawalStatus };
