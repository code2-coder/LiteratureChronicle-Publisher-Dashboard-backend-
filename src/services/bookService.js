import Book from '../models/Book.js';

export const getAllBooks = async (query = {}, options = {}) => {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  const books = await Book.find(query)
    .populate('authorId', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Book.countDocuments(query);

  return {
    data: books,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

export const getBookById = async (id) => {
  return await Book.findById(id).populate('authorId', 'name email').lean();
};

export const createNewBook = async (bookData) => {
  const book = new Book(bookData);
  return await book.save();
};

export const updateExistingBook = async (id, updateData) => {
  const book = await Book.findById(id);
  if (!book) return null;

  Object.assign(book, updateData);
  return await book.save();
};

export const deleteBookById = async (id) => {
  const book = await Book.findById(id);
  if (!book) return null;

  await book.deleteOne();
  return true;
};
