import express from 'express';
import { getSales, createSale, updateSale, deleteSale, bulkUploadSales, checkDuplicates, getSalesStats } from '../controllers/saleController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { saleValidation } from '../validators/saleValidator.js';

const router = express.Router();

router.route('/stats')
  .get(protect, getSalesStats);

router.route('/')
  .get(protect, getSales)
  .post(protect, admin, validate(saleValidation), createSale);

router.post('/bulk-upload', protect, admin, bulkUploadSales);
router.post('/check-duplicates', protect, admin, checkDuplicates);

router.route('/:id')
  .put(protect, admin, validate(saleValidation), updateSale)
  .delete(protect, admin, deleteSale);

export default router;
