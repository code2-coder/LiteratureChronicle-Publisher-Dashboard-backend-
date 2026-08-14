import asyncHandler from 'express-async-handler';
import * as saleService from '../services/saleService.js';
import User from '../models/User.js';

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
export const getSales = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const { startDate, endDate, search, dateField = 'order_date' } = req.query;

  let query = {};
  if (req.user.role !== 'admin') {
    query.authorId = req.user._id;
  }

  // Date Filtering
  if (startDate || endDate) {
    query[dateField] = {};
    if (startDate) query[dateField].$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query[dateField].$lte = end;
    }
  }

  // Search Logic (Basic search by title or ISBN)
  if (search) {
    const matchedAuthors = await User.find({
      name: { $regex: search, $options: 'i' }
    }).select('_id');
    const authorIds = matchedAuthors.map(author => author._id);

    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { isbn: { $regex: search, $options: 'i' } },
      { order_id: { $regex: search, $options: 'i' } }
    ];

    if (authorIds.length > 0) {
      query.$or.push({ authorId: { $in: authorIds } });
    }
  }

  const result = await saleService.getPaginatedSales(query, { page, limit });
  res.json(result);
});

// @desc    Get sales stats
// @route   GET /api/sales/stats
// @access  Private
export const getSalesStats = asyncHandler(async (req, res) => {
  const { startDate, endDate, search, dateField = 'order_date' } = req.query;
  // Trigger nodemon reload

  let query = {};
  if (req.user.role !== 'admin') {
    query.authorId = req.user._id;
  }

  // Date Filtering
  if (startDate || endDate) {
    query[dateField] = {};
    if (startDate) query[dateField].$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query[dateField].$lte = end;
    }
  }

  // Search Logic (Basic search by title or ISBN)
  if (search) {
    const matchedAuthors = await User.find({
      name: { $regex: search, $options: 'i' }
    }).select('_id');
    const authorIds = matchedAuthors.map(author => author._id);

    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { isbn: { $regex: search, $options: 'i' } },
      { order_id: { $regex: search, $options: 'i' } }
    ];

    if (authorIds.length > 0) {
      query.$or.push({ authorId: { $in: authorIds } });
    }
  }

  const stats = await saleService.getSalesStats(query);
  res.json(stats);
});

// @desc    Create a sale
// @route   POST /api/sales
// @access  Private/Admin
export const createSale = asyncHandler(async (req, res) => {
  const sale = await saleService.createSale(req.body);
  res.status(201).json(sale);
});

// @desc    Update a sale
// @route   PUT /api/sales/:id
// @access  Private/Admin
export const updateSale = asyncHandler(async (req, res) => {
  const updatedSale = await saleService.updateSale(req.params.id, req.body);

  if (!updatedSale) {
    res.status(404);
    throw new Error('Sale not found');
  }

  res.json(updatedSale);
});

// @desc    Delete a sale
// @route   DELETE /api/sales/:id
// @access  Private/Admin
export const deleteSale = asyncHandler(async (req, res) => {
  const success = await saleService.deleteSale(req.params.id);

  if (!success) {
    res.status(404);
    throw new Error('Sale not found');
  }

  res.json({ message: 'Sale removed' });
});

// @desc    Bulk upload sales
// @route   POST /api/sales/bulk-upload
// @access  Private/Admin
export const bulkUploadSales = asyncHandler(async (req, res) => {
  const { sales, upload_date } = req.body;

  if (!sales || !Array.isArray(sales)) {
    res.status(400);
    throw new Error('Invalid sales data');
  }

  try {
    const insertedSales = await saleService.bulkUploadSales(sales, upload_date);
    res.status(201).json({ count: insertedSales.length });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400);
      throw new Error('Duplicate Order ID detected. One or more of these sales have already been imported.');
    }
    throw error;
  }
});

// @desc    Check for duplicate order IDs
// @route   POST /api/sales/check-duplicates
// @access  Private/Admin
export const checkDuplicates = asyncHandler(async (req, res) => {
  const { order_ids } = req.body;

  if (!order_ids || !Array.isArray(order_ids)) {
    res.status(400);
    throw new Error('Invalid order IDs');
  }

  const existingIds = await saleService.checkDuplicateOrderIds(order_ids);
  res.json({ existingIds });
});
