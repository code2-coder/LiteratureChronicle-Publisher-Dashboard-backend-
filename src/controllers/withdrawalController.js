import asyncHandler from 'express-async-handler';
import * as withdrawalService from '../services/withdrawalService.js';
import User from '../models/User.js';

// @desc    Get author withdrawal requests
// @route   GET /api/withdrawals
// @access  Private
export const getWithdrawals = asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role !== 'admin') {
    query.authorId = req.user._id;
  }
  const withdrawals = await withdrawalService.getWithdrawals(query);
  res.json(withdrawals);
});

// @desc    Create a withdrawal request
// @route   POST /api/withdrawals
// @access  Private
export const createWithdrawal = asyncHandler(async (req, res) => {
  const { authorId, amount, bank_details, status } = req.body;

  let targetAuthorId = req.user._id;
  let targetBankDetails = req.user.bank_details;
  let targetStatus = 'pending';

  if (req.user.role === 'admin') {
    if (authorId) {
      targetAuthorId = authorId;
      if (!bank_details) {
        const targetUser = await User.findById(authorId);
        if (targetUser) {
          targetBankDetails = targetUser.bank_details;
        }
      } else {
        targetBankDetails = bank_details;
      }
    }
    if (status) {
      targetStatus = status;
    }
  }

  const withdrawal = await withdrawalService.createWithdrawal(
    targetAuthorId,
    amount,
    targetBankDetails,
    targetStatus
  );
  res.status(201).json(withdrawal);
});

// @desc    Update withdrawal request details/status
// @route   PUT /api/withdrawals/:id
// @access  Private
export const updateWithdrawal = asyncHandler(async (req, res) => {
  const { status, amount, bank_details } = req.body;
  const updatedWithdrawal = await withdrawalService.updateWithdrawal(
    req.params.id,
    req.user,
    { status, amount, bank_details }
  );

  if (!updatedWithdrawal) {
    res.status(404);
    throw new Error('Withdrawal request not found or unauthorized to update');
  }

  res.json(updatedWithdrawal);
});

// @desc    Delete withdrawal request
// @route   DELETE /api/withdrawals/:id
// @access  Private
export const deleteWithdrawal = asyncHandler(async (req, res) => {
  const success = await withdrawalService.deleteWithdrawal(req.params.id, req.user);

  if (!success) {
    res.status(404);
    throw new Error('Withdrawal request not found or unauthorized to delete');
  }

  res.json({ message: 'Withdrawal request removed' });
});

