import express from 'express';
import { getRoyalties, createRoyalty, updateRoyalty, deleteRoyalty, bulkUploadRoyalties } from '../controllers/royaltyController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getRoyalties)
  .post(protect, admin, createRoyalty);

router.route('/bulk-upload')
  .post(protect, admin, bulkUploadRoyalties);

router.route('/:id')
  .put(protect, admin, updateRoyalty)
  .delete(protect, admin, deleteRoyalty);

export default router;
