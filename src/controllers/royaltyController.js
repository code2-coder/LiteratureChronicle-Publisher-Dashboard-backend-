import asyncHandler from 'express-async-handler';
import Royalty from '../models/Royalty.js';
import User from '../models/User.js';

// @desc    Get all royalties
// @route   GET /api/royalties
// @access  Private
const getRoyalties = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { startDate, endDate, search, dateField = 'payment_date' } = req.query;

  let query = {};
  if (req.user.role !== 'admin') {
    // Find by author ID or mobile number
    query = { $or: [{ authorId: req.user._id }, { author_contact_number: req.user.mobile_number }] };
  }

  // Date Filtering
  if (startDate || endDate) {
    query[dateField] = {};
    if (startDate) query[dateField].$gte = new Date(startDate);
    if (endDate) query[dateField].$lte = new Date(endDate);
  }

  // Search Logic
  if (search) {
    const searchFilter = {
      $or: [
        { author_name: { $regex: search, $options: 'i' } },
        { author_contact_number: { $regex: search, $options: 'i' } }
      ]
    };
    
    // If we already have filters (like author restriction), use $and
    if (Object.keys(query).length > 0) {
      query = { $and: [query, searchFilter] };
    } else {
      query = searchFilter;
    }
  }

  const total = await Royalty.countDocuments(query);
  const royalties = await Royalty.find(query)
    .sort({ payment_date: -1 })
    .skip(skip)
    .limit(limit)
    .populate('authorId', 'name mobile_number');

  res.json({
    data: royalties,
    total,
    page,
    pages: Math.ceil(total / limit)
  });
});

// @desc    Create a royalty record
// @route   POST /api/royalties
// @access  Private/Admin
const createRoyalty = asyncHandler(async (req, res) => {
  const { author_contact_number, amount, paid_amount, payment_date } = req.body;

  const author = await User.findOne({ mobile_number: author_contact_number });
  
  const royalty = await Royalty.create({
    authorId: author ? author._id : null,
    author_contact_number,
    amount,
    paid_amount,
    payment_date
  });

  res.status(201).json(royalty);
});

// @desc    Update a royalty record
// @route   PUT /api/royalties/:id
// @access  Private/Admin
const updateRoyalty = asyncHandler(async (req, res) => {
  const royalty = await Royalty.findById(req.params.id);

  if (!royalty) {
    res.status(404);
    throw new Error('Royalty record not found');
  }

  royalty.author_contact_number = req.body.author_contact_number || royalty.author_contact_number;
  royalty.amount = req.body.amount || royalty.amount;
  royalty.paid_amount = req.body.paid_amount !== undefined ? req.body.paid_amount : royalty.paid_amount;
  royalty.payment_date = req.body.payment_date || royalty.payment_date;

  if (req.body.author_contact_number) {
    const author = await User.findOne({ mobile_number: req.body.author_contact_number });
    royalty.authorId = author ? author._id : royalty.authorId;
  }

  const updatedRoyalty = await royalty.save();
  res.json(updatedRoyalty);
});

// @desc    Delete a royalty record
// @route   DELETE /api/royalties/:id
// @access  Private/Admin
const deleteRoyalty = asyncHandler(async (req, res) => {
  const royalty = await Royalty.findById(req.params.id);

  if (!royalty) {
    res.status(404);
    throw new Error('Royalty record not found');
  }

  await royalty.deleteOne();
  res.json({ message: 'Royalty record removed' });
});

// @desc    Bulk upload royalties
// @route   POST /api/royalties/bulk-upload
// @access  Private/Admin
const bulkUploadRoyalties = asyncHandler(async (req, res) => {
  const { royalties } = req.body;

  if (!royalties || !Array.isArray(royalties)) {
    res.status(400);
    throw new Error('Invalid royalties data');
  }

  // Pre-fetch all authors to avoid repeated DB calls in the loop
  const authors = await User.find({ role: 'author' }).select('_id mobile_number');
  
  const processedRoyalties = royalties.map(r => {
    const author = authors.find(a => a.mobile_number === r.author_contact_number);
    return {
      ...r,
      authorId: author ? author._id : null,
      status: (r.status || 'paid').toLowerCase()
    };
  });

  const insertedRoyalties = await Royalty.insertMany(processedRoyalties);
  res.status(201).json({ count: insertedRoyalties.length });
});

export { getRoyalties, createRoyalty, updateRoyalty, deleteRoyalty, bulkUploadRoyalties };

