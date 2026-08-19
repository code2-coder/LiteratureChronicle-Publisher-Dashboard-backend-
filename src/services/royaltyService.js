import Royalty from '../models/Royalty.js';
import User from '../models/User.js';
import Sale from '../models/Sale.js';

/**
 * Calculate royalty for a sale
 */
export const calculateRoyalty = (mrp, commissionPercentage, printingCost, quantity = 1, type = 'physical') => {
  const mrpVal = parseFloat(mrp) || 0;
  const commVal = parseFloat(commissionPercentage) || 0;
  const printCostVal = parseFloat(printingCost) || 0;
  const qtyVal = parseInt(quantity) || 1;

  const platformCommissionValue = mrpVal * (commVal / 100);
  let royaltyPerUnit = 0;

  if (type === 'ebook') {
    royaltyPerUnit = mrpVal - platformCommissionValue;
  } else {
    royaltyPerUnit = mrpVal - platformCommissionValue - printCostVal;
  }

  const totalRoyalty = Math.max(0, royaltyPerUnit * qtyVal);
  return Math.round(totalRoyalty * 100) / 100;
};

export const getPaginatedRoyalties = async (query = {}, options = {}) => {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  const total = await Royalty.countDocuments(query);
  const royalties = await Royalty.find(query)
    .sort({ payment_date: -1 })
    .skip(skip)
    .limit(limit)
    .populate('authorId', 'name mobile_number bank_details');

  return {
    data: royalties,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

export const createRoyalty = async (royaltyData) => {
  const { author_contact_number, amount, paid_amount, payment_date } = royaltyData;
  const author = await User.findOne({ mobile_number: author_contact_number });

  return await Royalty.create({
    authorId: author ? author._id : null,
    author_contact_number,
    amount,
    paid_amount,
    payment_date
  });
};

export const updateRoyalty = async (id, updateFields) => {
  const royalty = await Royalty.findById(id);
  if (!royalty) return null;

  royalty.author_contact_number = updateFields.author_contact_number || royalty.author_contact_number;
  royalty.amount = updateFields.amount || royalty.amount;
  royalty.paid_amount = updateFields.paid_amount !== undefined ? updateFields.paid_amount : royalty.paid_amount;
  royalty.payment_date = updateFields.payment_date || royalty.payment_date;

  if (updateFields.author_contact_number) {
    const author = await User.findOne({ mobile_number: updateFields.author_contact_number });
    royalty.authorId = author ? author._id : royalty.authorId;
  }

  return await royalty.save();
};

export const deleteRoyalty = async (id) => {
  const royalty = await Royalty.findById(id);
  if (!royalty) return null;

  await royalty.deleteOne();
  return true;
};

export const bulkUploadRoyalties = async (royalties) => {
  const authors = await User.find({ role: 'author' }).select('_id mobile_number');
  
  const processedRoyalties = royalties.map(r => {
    const author = authors.find(a => a.mobile_number === r.author_contact_number);
    return {
      ...r,
      authorId: author ? author._id : null,
      status: (r.status || 'paid').toLowerCase()
    };
  });

  return await Royalty.insertMany(processedRoyalties);
};

/**
 * High-performance aggregation for Royalty Pending Ledger across all authors
 */
export const getPendingRoyaltiesData = async (options = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    minAmount = null,
    paymentStatus = 'all', // 'all', 'ready', 'missing_details'
    sortBy = 'balance', // 'balance', 'name', 'totalRoyalty', 'totalPayments', 'mobile_number'
    sortOrder = 'desc', // 'desc', 'asc'
    all = false // if true, return all without pagination
  } = options;

  // 1. Fetch all authors
  const allAuthors = await User.find({ role: 'author' })
    .select('name email mobile_number bank_details createdAt')
    .lean();

  if (!allAuthors || allAuthors.length === 0) {
    return {
      data: [],
      summary: {
        totalPendingRoyalty: 0,
        totalRoyaltyEarned: 0,
        totalRoyaltyDisbursed: 0,
        authorsWithPendingCount: 0,
        totalAuthorsCount: 0,
        avgPendingAmount: 0,
        readyForPayoutCount: 0,
        missingDetailsCount: 0
      },
      pagination: {
        page: 1,
        limit: Number(limit) || 10,
        total: 0,
        pages: 0
      }
    };
  }

  // 2. Aggregate sales royalties for all authors
  const salesStats = await Sale.aggregate([
    {
      $lookup: {
        from: 'platforms',
        localField: 'platformId',
        foreignField: '_id',
        as: 'platform'
      }
    },
    { $unwind: { path: '$platform', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'books',
        localField: 'bookId',
        foreignField: '_id',
        as: 'book'
      }
    },
    { $unwind: { path: '$book', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        royaltyPerBook: {
          $subtract: [
            { $multiply: ["$mrp", { $subtract: [1, { $divide: [{ $ifNull: ["$platform.commission_percentage", 0] }, 100] }] }] },
            { $cond: [{ $eq: ["$format", "physical"] }, { $ifNull: ["$book.printing_cost", 0] }, 0] }
          ]
        }
      }
    },
    {
      $group: {
        _id: "$authorId",
        totalRoyalty: { $sum: { $multiply: ["$royaltyPerBook", "$quantity"] } },
        totalQuantitySold: { $sum: "$quantity" },
        totalSalesCount: { $sum: 1 },
        lastSaleDate: { $max: "$order_date" }
      }
    }
  ]);

  // 3. Aggregate royalty disbursements
  const paymentsByContact = await Royalty.aggregate([
    {
      $group: {
        _id: "$author_contact_number",
        totalPayments: { $sum: "$paid_amount" },
        lastPaymentDate: { $max: "$payment_date" },
        paymentsCount: { $sum: 1 }
      }
    }
  ]);

  const paymentsById = await Royalty.aggregate([
    { $match: { authorId: { $ne: null } } },
    {
      $group: {
        _id: "$authorId",
        totalPayments: { $sum: "$paid_amount" },
        lastPaymentDate: { $max: "$payment_date" },
        paymentsCount: { $sum: 1 }
      }
    }
  ]);

  // Map aggregates to each author
  let enrichedAuthors = allAuthors.map(author => {
    const sStat = salesStats.find(s => s._id && s._id.toString() === author._id.toString());
    const pStatContact = author.mobile_number ? paymentsByContact.find(p => p._id === author.mobile_number) : null;
    const pStatId = paymentsById.find(p => p._id && p._id.toString() === author._id.toString());

    const totalRoyalty = sStat ? Math.round(Math.max(0, sStat.totalRoyalty) * 100) / 100 : 0;
    const totalPayments = pStatContact ? pStatContact.totalPayments : (pStatId ? pStatId.totalPayments : 0);
    const balance = Math.round(Math.max(0, totalRoyalty - totalPayments) * 100) / 100;
    const totalQuantitySold = sStat ? sStat.totalQuantitySold : 0;
    const lastSaleDate = sStat ? sStat.lastSaleDate : null;
    const lastPaymentDate = pStatContact?.lastPaymentDate || pStatId?.lastPaymentDate || null;

    const hasBankDetails = Boolean(
      author.bank_details?.account_number && (author.bank_details?.ifsc_code || author.bank_details?.ifsc)
    );
    const hasUpi = Boolean(author.bank_details?.upi && author.bank_details.upi.trim());
    const isPaymentReady = hasBankDetails || hasUpi;

    return {
      _id: author._id,
      name: author.name || 'Unnamed Author',
      email: author.email || '',
      mobile_number: author.mobile_number || '',
      bank_details: author.bank_details || {},
      totalRoyalty,
      totalPayments,
      balance,
      totalQuantitySold,
      lastSaleDate,
      lastPaymentDate,
      hasBankDetails,
      hasUpi,
      isPaymentReady,
      createdAt: author.createdAt
    };
  });

  // Calculate Global Summary metrics across ALL authors in database
  const totalPendingRoyalty = Math.round(enrichedAuthors.reduce((acc, a) => acc + a.balance, 0) * 100) / 100;
  const totalRoyaltyEarned = Math.round(enrichedAuthors.reduce((acc, a) => acc + a.totalRoyalty, 0) * 100) / 100;
  const totalRoyaltyDisbursed = Math.round(enrichedAuthors.reduce((acc, a) => acc + a.totalPayments, 0) * 100) / 100;
  const authorsWithPending = enrichedAuthors.filter(a => a.balance > 0);
  const authorsWithPendingCount = authorsWithPending.length;
  const totalAuthorsCount = enrichedAuthors.length;
  const avgPendingAmount = authorsWithPendingCount > 0 ? Math.round((totalPendingRoyalty / authorsWithPendingCount) * 100) / 100 : 0;
  const readyForPayoutCount = enrichedAuthors.filter(a => a.balance > 0 && a.isPaymentReady).length;
  const missingDetailsCount = enrichedAuthors.filter(a => a.balance > 0 && !a.isPaymentReady).length;

  const summary = {
    totalPendingRoyalty,
    totalRoyaltyEarned,
    totalRoyaltyDisbursed,
    authorsWithPendingCount,
    totalAuthorsCount,
    avgPendingAmount,
    readyForPayoutCount,
    missingDetailsCount
  };

  // Apply Search Filter
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    enrichedAuthors = enrichedAuthors.filter(a => 
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.email && a.email.toLowerCase().includes(q)) ||
      (a.mobile_number && a.mobile_number.toLowerCase().includes(q)) ||
      (a.bank_details?.upi && a.bank_details.upi.toLowerCase().includes(q)) ||
      (a.bank_details?.bank_name && a.bank_details.bank_name.toLowerCase().includes(q))
    );
  }

  // Apply minAmount filter
  if (minAmount !== null && minAmount !== undefined && minAmount !== '') {
    const minVal = parseFloat(minAmount);
    if (!isNaN(minVal)) {
      enrichedAuthors = enrichedAuthors.filter(a => a.balance >= minVal);
    }
  }

  // Apply payment readiness filter
  if (paymentStatus === 'ready') {
    enrichedAuthors = enrichedAuthors.filter(a => a.isPaymentReady);
  } else if (paymentStatus === 'missing_details') {
    enrichedAuthors = enrichedAuthors.filter(a => !a.isPaymentReady);
  }

  // Apply Sorting
  enrichedAuthors.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === 'totalRoyalty') {
      comparison = a.totalRoyalty - b.totalRoyalty;
    } else if (sortBy === 'totalPayments') {
      comparison = a.totalPayments - b.totalPayments;
    } else if (sortBy === 'mobile_number') {
      comparison = (a.mobile_number || '').localeCompare(b.mobile_number || '');
    } else {
      // Default: balance
      comparison = a.balance - b.balance;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const totalFiltered = enrichedAuthors.length;

  // Pagination or Full Export
  if (all || String(limit) === '0' || Number(limit) >= 10000) {
    return {
      data: enrichedAuthors,
      summary,
      pagination: {
        page: 1,
        limit: totalFiltered,
        total: totalFiltered,
        pages: 1
      }
    };
  }

  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.max(1, parseInt(limit) || 10);
  const skip = (parsedPage - 1) * parsedLimit;
  const paginatedData = enrichedAuthors.slice(skip, skip + parsedLimit);

  return {
    data: paginatedData,
    summary,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total: totalFiltered,
      pages: Math.ceil(totalFiltered / parsedLimit) || 1
    }
  };
};

/**
 * Detailed royalty and sales breakdown for a single author
 */
export const getAuthorDetailedRoyaltyBreakdown = async (authorId) => {
  const author = await User.findById(authorId).select('-password');
  if (!author) return null;

  // Aggregate book sales for this author
  const bookSales = await Sale.aggregate([
    { $match: { authorId: author._id } },
    {
      $lookup: {
        from: 'platforms',
        localField: 'platformId',
        foreignField: '_id',
        as: 'platform'
      }
    },
    { $unwind: { path: '$platform', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'books',
        localField: 'bookId',
        foreignField: '_id',
        as: 'book'
      }
    },
    { $unwind: { path: '$book', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        royaltyPerBook: {
          $subtract: [
            { $multiply: ["$mrp", { $subtract: [1, { $divide: [{ $ifNull: ["$platform.commission_percentage", 0] }, 100] }] }] },
            { $cond: [{ $eq: ["$format", "physical"] }, { $ifNull: ["$book.printing_cost", 0] }, 0] }
          ]
        }
      }
    },
    {
      $group: {
        _id: {
          bookId: "$bookId",
          title: "$title",
          isbn: "$isbn",
          format: "$format"
        },
        quantity: { $sum: "$quantity" },
        totalRevenue: { $sum: { $multiply: ["$mrp", "$quantity"] } },
        totalRoyalty: { $sum: { $multiply: ["$royaltyPerBook", "$quantity"] } },
        lastOrderDate: { $max: "$order_date" }
      }
    },
    {
      $project: {
        _id: 0,
        bookId: "$_id.bookId",
        title: "$_id.title",
        isbn: "$_id.isbn",
        format: "$_id.format",
        quantity: 1,
        totalRevenue: 1,
        totalRoyalty: { $round: ["$totalRoyalty", 2] },
        lastOrderDate: 1
      }
    },
    { $sort: { totalRoyalty: -1 } }
  ]);

  // Payment history for this author
  const paymentHistory = await Royalty.find({
    $or: [
      { authorId: author._id },
      { author_contact_number: author.mobile_number }
    ]
  })
    .sort({ payment_date: -1 })
    .limit(50)
    .lean();

  const totalRoyalty = bookSales.reduce((acc, b) => acc + (b.totalRoyalty || 0), 0);
  const totalPayments = paymentHistory.reduce((acc, p) => acc + (p.paid_amount || 0), 0);
  const balance = Math.max(0, totalRoyalty - totalPayments);

  return {
    author: {
      _id: author._id,
      name: author.name,
      email: author.email,
      mobile_number: author.mobile_number,
      bank_details: author.bank_details,
      createdAt: author.createdAt
    },
    stats: {
      totalRoyalty: Math.round(totalRoyalty * 100) / 100,
      totalPayments: Math.round(totalPayments * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      totalBooksCount: bookSales.length,
      totalCopiesSold: bookSales.reduce((acc, b) => acc + (b.quantity || 0), 0)
    },
    bookSales,
    paymentHistory
  };
};
