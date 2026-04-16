import asyncHandler from 'express-async-handler';
import * as bookService from '../services/bookService.js';

// @desc    Get all books
// @route   GET /api/books
// @access  Private
const getBooks = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';

  let query = {};
  if (req.user.role !== 'admin') {
    query.authorId = req.user._id;
  }

  // Search filter
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { isbn: { $regex: search, $options: 'i' } },
      { sku_code: { $regex: search, $options: 'i' } }
    ];
  }

  const result = await bookService.getAllBooks(query, { page, limit });
  res.json(result);
});

// @desc    Get single book
// @route   GET /api/books/:id
// @access  Private
const getBookById = asyncHandler(async (req, res) => {
  const book = await bookService.getBookById(req.params.id);
  
  if (!book) {
    res.status(404);
    throw new Error('Book not found');
  }

  if (req.user.role !== 'admin' && book.authorId._id.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized');
  }

  res.json(book);
});

// @desc    Create a book
// @route   POST /api/books
// @access  Private/Admin
const createBook = asyncHandler(async (req, res) => {
  const { title, isbn, mrp, printing_cost, sku_code, authorId, book_sizes, format } = req.body;

  const bookData = {
    title,
    isbn,
    mrp,
    printing_cost,
    sku_code,
    authorId,
    book_sizes,
    format,
    book_cover: req.file ? req.file.path : (req.body.book_cover || ''),
  };

  const createdBook = await bookService.createNewBook(bookData);
  res.status(201).json(createdBook);
});

// @desc    Update a book
// @route   PUT /api/books/:id
// @access  Private/Admin
const updateBook = asyncHandler(async (req, res) => {
  const { title, isbn, mrp, printing_cost, sku_code, authorId, book_sizes, format } = req.body;

  const updateData = {
    title,
    isbn,
    mrp,
    printing_cost,
    sku_code,
    authorId,
    book_sizes,
    format,
  };

  if (req.file) {
    updateData.book_cover = req.file.path;
  } else if (req.body.book_cover) {
    updateData.book_cover = req.body.book_cover;
  }

  const updatedBook = await bookService.updateExistingBook(req.params.id, updateData);
  
  if (!updatedBook) {
    res.status(404);
    throw new Error('Book not found');
  }

  res.json(updatedBook);
});

// @desc    Delete a book
// @route   DELETE /api/books/:id
// @access  Private/Admin
const deleteBook = asyncHandler(async (req, res) => {
  const success = await bookService.deleteBookById(req.params.id);
  
  if (!success) {
    res.status(404);
    throw new Error('Book not found');
  }

  res.json({ message: 'Book removed' });
});

export { getBooks, getBookById, createBook, updateBook, deleteBook };

