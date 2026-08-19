import asyncHandler from 'express-async-handler';
import * as royaltyService from '../services/royaltyService.js';

// @desc    Get all royalties
// @route   GET /api/royalties
// @access  Private
export const getRoyalties = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const { startDate, endDate, search, dateField = 'payment_date' } = req.query;

  let query = {};
  if (req.user.role !== 'admin') {
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
    
    if (Object.keys(query).length > 0) {
      query = { $and: [query, searchFilter] };
    } else {
      query = searchFilter;
    }
  }

  const result = await royaltyService.getPaginatedRoyalties(query, { page, limit });
  res.json(result);
});

// @desc    Create a royalty record
// @route   POST /api/royalties
// @access  Private/Admin
export const createRoyalty = asyncHandler(async (req, res) => {
  const royalty = await royaltyService.createRoyalty(req.body);
  res.status(201).json(royalty);
});

// @desc    Update a royalty record
// @route   PUT /api/royalties/:id
// @access  Private/Admin
export const updateRoyalty = asyncHandler(async (req, res) => {
  const updatedRoyalty = await royaltyService.updateRoyalty(req.params.id, req.body);

  if (!updatedRoyalty) {
    res.status(404);
    throw new Error('Royalty record not found');
  }

  res.json(updatedRoyalty);
});

// @desc    Delete a royalty record
// @route   DELETE /api/royalties/:id
// @access  Private/Admin
export const deleteRoyalty = asyncHandler(async (req, res) => {
  const success = await royaltyService.deleteRoyalty(req.params.id);

  if (!success) {
    res.status(404);
    throw new Error('Royalty record not found');
  }

  res.json({ message: 'Royalty record removed' });
});

// @desc    Bulk upload royalties
// @route   POST /api/royalties/bulk-upload
// @access  Private/Admin
export const bulkUploadRoyalties = asyncHandler(async (req, res) => {
  const { royalties } = req.body;

  if (!royalties || !Array.isArray(royalties)) {
    res.status(400);
    throw new Error('Invalid royalties data');
  }

  const insertedRoyalties = await royaltyService.bulkUploadRoyalties(royalties);
  res.status(201).json({ count: insertedRoyalties.length });
});

// @desc    Get pending royalties ledger and summary across authors
// @route   GET /api/royalties/pending
// @access  Private/Admin
export const getPendingRoyalties = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const {
    search,
    minAmount,
    paymentStatus = 'all',
    sortBy = 'balance',
    sortOrder = 'desc',
    all = false
  } = req.query;

  const result = await royaltyService.getPendingRoyaltiesData({
    page,
    limit,
    search,
    minAmount,
    paymentStatus,
    sortBy,
    sortOrder,
    all: all === 'true' || all === true
  });

  res.json(result);
});

// @desc    Get detailed royalty and sales breakdown for a single author
// @route   GET /api/royalties/pending/:authorId/breakdown
// @access  Private/Admin
export const getAuthorRoyaltyBreakdown = asyncHandler(async (req, res) => {
  const result = await royaltyService.getAuthorDetailedRoyaltyBreakdown(req.params.authorId);

  if (!result) {
    res.status(404);
    throw new Error('Author breakdown not found');
  }

  res.json(result);
});

