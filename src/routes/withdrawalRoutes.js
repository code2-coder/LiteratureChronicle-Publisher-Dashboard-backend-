import express from 'express';
import { getWithdrawals, createWithdrawal, updateWithdrawal, deleteWithdrawal } from '../controllers/withdrawalController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getWithdrawals)
  .post(protect, createWithdrawal);

router.route('/:id')
  .put(protect, updateWithdrawal)
  .delete(protect, deleteWithdrawal);

export default router;
