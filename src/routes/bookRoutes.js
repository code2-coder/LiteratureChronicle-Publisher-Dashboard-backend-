import express from 'express';
import { getBooks, getBookById, createBook, updateBook, deleteBook } from '../controllers/bookController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';
import { upload } from '../config/cloudinary.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { bookValidation } from '../validators/bookValidator.js';

const router = express.Router();

router.route('/')
  .get(protect, getBooks)
  .post(protect, admin, upload.single('book_cover'), validate(bookValidation), createBook);

router.route('/:id')
  .get(protect, getBookById)
  .put(protect, admin, upload.single('book_cover'), validate(bookValidation), updateBook)
  .delete(protect, admin, deleteBook);

export default router;
