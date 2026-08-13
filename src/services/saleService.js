import Sale from '../models/Sale.js';

export const getPaginatedSales = async (query = {}, options = {}) => {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  const total = await Sale.countDocuments(query);
  const sales = await Sale.find(query)
    .sort({ order_date: -1 })
    .skip(skip)
    .limit(limit)
    .populate('platformId', 'commission_percentage')
    .populate('bookId', 'printing_cost format')
    .populate('authorId', 'name')
    .lean();

  return {
    data: sales,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

export const createSale = async (saleData) => {
  return await Sale.create(saleData);
};

export const updateSale = async (id, updateFields) => {
  const sale = await Sale.findById(id);
  if (!sale) return null;

  Object.assign(sale, updateFields);
  return await sale.save();
};

export const deleteSale = async (id) => {
  const sale = await Sale.findById(id);
  if (!sale) return null;

  await sale.deleteOne();
  return true;
};

export const bulkUploadSales = async (sales, upload_date) => {
  const processedSales = sales.map(s => ({
    ...s,
    upload_date: upload_date || new Date()
  }));

  return await Sale.insertMany(processedSales);
};

export const checkDuplicateOrderIds = async (order_ids) => {
  const existingSales = await Sale.find({ order_id: { $in: order_ids } }).select('order_id');
  return existingSales.map(s => s.order_id);
};

export const getSalesStats = async (query = {}) => {
  const result = await Sale.aggregate([
    { $match: query },
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
      $addFields: {
        royaltyPerBook: { $cond: [{ $gt: ["$royaltyPerBook", 0] }, "$royaltyPerBook", 0] }
      }
    },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalItems: { $sum: 1 },
              totalQuantity: { $sum: "$quantity" },
              totalEbook: { $sum: { $cond: [{ $eq: ["$format", "ebook"] }, "$quantity", 0] } },
              totalPhysical: { $sum: { $cond: [{ $eq: ["$format", "physical"] }, "$quantity", 0] } },
              totalEbookRecords: { $sum: { $cond: [{ $eq: ["$format", "ebook"] }, 1, 0] } },
              totalPhysicalRecords: { $sum: { $cond: [{ $eq: ["$format", "physical"] }, 1, 0] } },
              totalRevenue: { $sum: { $multiply: ["$mrp", "$quantity"] } },
              totalRoyalty: { $sum: { $multiply: ["$royaltyPerBook", "$quantity"] } }
            }
          }
        ],
        dailySales: [
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$order_date" } },
              salesCount: { $sum: "$quantity" },
              royalty: { $sum: { $multiply: ["$royaltyPerBook", "$quantity"] } },
              revenue: { $sum: { $multiply: ["$mrp", "$quantity"] } }
            }
          },
          { $sort: { _id: 1 } }
        ],
        platformDistribution: [
          {
            $group: {
              _id: "$platform_name",
              quantity: { $sum: "$quantity" },
              royalty: { $sum: { $multiply: ["$royaltyPerBook", "$quantity"] } },
              revenue: { $sum: { $multiply: ["$mrp", "$quantity"] } }
            }
          },
          { $sort: { quantity: -1 } }
        ]
      }
    }
  ]);

  const defaultSummary = {
    totalItems: 0,
    totalQuantity: 0,
    totalEbook: 0,
    totalPhysical: 0,
    totalEbookRecords: 0,
    totalPhysicalRecords: 0,
    totalRevenue: 0,
    totalRoyalty: 0
  };

  return {
    summary: result[0]?.summary[0] || defaultSummary,
    dailySales: result[0]?.dailySales || [],
    platformDistribution: result[0]?.platformDistribution || []
  };
};
