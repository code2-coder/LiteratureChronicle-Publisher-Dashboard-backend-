import { body } from 'express-validator';

export const saleValidation = [
  body('order_id').notEmpty().withMessage('Order ID is required'),
  body('mrp').isNumeric().withMessage('MRP must be a number'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('order_date').isISO8601().withMessage('Valid order date is required'),
];
