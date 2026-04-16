import { body, validationResult } from 'express-validator';

export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(err => err.msg)
    });
  };
};

// Common Validation Rules
export const bookValidation = [
  body('title').notEmpty().withMessage('Title is required').trim(),
  body('isbn').notEmpty().withMessage('ISBN is required'),
  body('mrp').isNumeric().withMessage('MRP must be a number'),
  body('sku_code').notEmpty().withMessage('SKU Code is required'),
  body('authorId').isMongoId().withMessage('Invalid Author ID'),
];

export const saleValidation = [
  body('order_id').notEmpty().withMessage('Order ID is required'),
  body('mrp').isNumeric().withMessage('MRP must be a number'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('order_date').isISO8601().withMessage('Valid order date is required'),
];
