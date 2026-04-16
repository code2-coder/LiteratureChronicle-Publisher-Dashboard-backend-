import asyncHandler from 'express-async-handler';
import Sale from '../models/Sale.js';

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
const getSales = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { startDate, endDate, search, dateField = 'order_date' } = req.query;

  let query = {};
  if (req.user.role !== 'admin') {
    query.authorId = req.user._id;
  }

  // Date Filtering
  if (startDate || endDate) {
    query[dateField] = {};
    if (startDate) query[dateField].$gte = new Date(startDate);
    if (endDate) query[dateField].$lte = new Date(endDate);
  }

  // Search Logic (Basic search by title or ISBN)
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { isbn: { $regex: search, $options: 'i' } },
      { order_id: { $regex: search, $options: 'i' } }
    ];
  }

  const total = await Sale.countDocuments(query);
  const sales = await Sale.find(query)
    .sort({ order_date: -1 })
    .skip(skip)
    .limit(limit)
    .populate('platformId', 'commission_percentage')
    .populate('bookId', 'printing_cost format');

  res.json({
    data: sales,
    total,
    page,
    pages: Math.ceil(total / limit)
  });
});

// @desc    Create a sale
// @route   POST /api/sales
// @access  Private/Admin
const createSale = asyncHandler(async (req, res) => {
  const { title, isbn, mrp, quantity, order_id, order_date, platform_name, authorId, bookId, platformId, format } = req.body;

  const sale = await Sale.create({
    title,
    isbn,
    mrp,
    quantity,
    order_id,
    order_date,
    platform_name,
    authorId,
    bookId,
    platformId,
    format
  });
  res.status(201).json(sale);
});

// @desc    Update a sale
// @route   PUT /api/sales/:id
// @access  Private/Admin
const updateSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);

  if (!sale) {
    res.status(404);
    throw new Error('Sale not found');
  }

  Object.assign(sale, req.body);
  const updatedSale = await sale.save();
  res.json(updatedSale);
});

// @desc    Delete a sale
// @route   DELETE /api/sales/:id
// @access  Private/Admin
const deleteSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);

  if (!sale) {
    res.status(404);
    throw new Error('Sale not found');
  }

  await sale.deleteOne();
  res.json({ message: 'Sale removed' });
});

// @desc    Bulk upload sales
// @route   POST /api/sales/bulk-upload
// @access  Private/Admin
const bulkUploadSales = asyncHandler(async (req, res) => {
  const { sales, upload_date } = req.body;

  if (!sales || !Array.isArray(sales)) {
    res.status(400);
    throw new Error('Invalid sales data');
  }

  const processedSales = sales.map(s => ({
    ...s,
    upload_date: upload_date || new Date()
  }));

    try {
      const insertedSales = await Sale.insertMany(processedSales);
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
const checkDuplicates = asyncHandler(async (req, res) => {
  const { order_ids } = req.body;

  if (!order_ids || !Array.isArray(order_ids)) {
    res.status(400);
    throw new Error('Invalid order IDs');
  }

  // Find existing order IDs in the database
  const existingSales = await Sale.find({ order_id: { $in: order_ids } }).select('order_id');
  const existingIds = existingSales.map(s => s.order_id);

  res.json({ existingIds });
});

export { getSales, createSale, updateSale, deleteSale, bulkUploadSales, checkDuplicates };

