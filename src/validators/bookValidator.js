import { body } from 'express-validator';

export const bookValidation = [
  body('title').notEmpty().withMessage('Title is required').trim(),
  body('isbn').notEmpty().withMessage('ISBN is required'),
  body('mrp').isNumeric().withMessage('MRP must be a number'),
  body('sku_code').notEmpty().withMessage('SKU Code is required'),
  body('authorId').isMongoId().withMessage('Invalid Author ID'),
];
