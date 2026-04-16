import express from 'express';
import { getSales, createSale, updateSale, deleteSale, bulkUploadSales, checkDuplicates } from '../controllers/saleController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validate, saleValidation } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getSales)
  .post(protect, admin, validate(saleValidation), createSale);

router.post('/bulk-upload', protect, admin, bulkUploadSales);
router.post('/check-duplicates', protect, admin, checkDuplicates);

router.route('/:id')
  .put(protect, admin, validate(saleValidation), updateSale)
  .delete(protect, admin, deleteSale);

export default router;
