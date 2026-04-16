import express from 'express';
import { getWithdrawals, createWithdrawal, updateWithdrawalStatus } from '../controllers/withdrawalController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getWithdrawals)
  .post(protect, createWithdrawal);

router.route('/:id')
  .put(protect, admin, updateWithdrawalStatus);

export default router;
