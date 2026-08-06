import User from '../models/User.js';
import Sale from '../models/Sale.js';
import Royalty from '../models/Royalty.js';
import generateToken from '../config/generateToken.js';
import crypto from 'crypto';

export const loginUser = async (email, password) => {
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    };
  }
  return null;
};

export const registerNewUser = async (userData) => {
  const { name, email, password, role, mobile_number, bank_details } = userData;

  const userExists = await User.findOne({ 
    $or: [{ email }, { name }, { mobile_number }]
  });

  if (userExists) {
    if (userExists.email === email) throw new Error('User with this email already exists');
    if (userExists.name === name) throw new Error('User with this name already exists');
    if (userExists.mobile_number === mobile_number) throw new Error('User with this mobile number already exists');
  }

  const userPayload = { name, email, password, role, mobile_number };

  if (bank_details) {
    userPayload.bank_details = {
      bank_name: bank_details.bank_name,
      holder_name: bank_details.account_holder || bank_details.holder_name,
      account_number: bank_details.account_number,
      ifsc_code: bank_details.ifsc_code,
      upi: bank_details.upi
    };
  }

  const user = await User.create(userPayload);

  if (user) {
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    };
  }
  return null;
};

export const getProfileWithStats = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  // Aggregate stats for the single author
  const salesStats = await Sale.aggregate([
    { $match: { authorId: user._id } },
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
        totalQuantitySold: { $sum: "$quantity" }
      }
    }
  ]);

  const paymentsStats = await Royalty.aggregate([
    { $match: { author_contact_number: user.mobile_number } },
    {
      $group: {
        _id: "$author_contact_number",
        totalPayments: { $sum: "$paid_amount" }
      }
    }
  ]);

  const totalRoyalty = salesStats.length > 0 ? Math.max(0, salesStats[0].totalRoyalty) : 0;
  const totalQuantitySold = salesStats.length > 0 ? salesStats[0].totalQuantitySold : 0;
  const totalPayments = paymentsStats.length > 0 ? paymentsStats[0].totalPayments : 0;

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    mobile_number: user.mobile_number,
    bank_details: user.bank_details,
    stats: {
      totalRoyalty,
      totalPayments,
      balance: Math.max(0, totalRoyalty - totalPayments),
      totalQuantitySold
    }
  };
};

export const getPaginatedAuthors = async (filterQuery = {}, options = {}) => {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  const authors = await User.find({ ...filterQuery, role: 'author' })
    .select('name email mobile_number bank_details')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await User.countDocuments({ ...filterQuery, role: 'author' });

  const authorIds = authors.map(a => a._id);
  const mobileNumbers = authors.map(a => a.mobile_number).filter(Boolean);

  const salesStats = await Sale.aggregate([
    { $match: { authorId: { $in: authorIds } } },
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
        totalRoyalty: { $sum: { $multiply: ["$royaltyPerBook", "$quantity"] } }
      }
    }
  ]);

  const paymentsStats = await Royalty.aggregate([
    { $match: { author_contact_number: { $in: mobileNumbers } } },
    {
      $group: {
        _id: "$author_contact_number",
        totalPayments: { $sum: "$paid_amount" }
      }
    }
  ]);

  const enrichedAuthors = authors.map(author => {
    const sStat = salesStats.find(s => s._id.toString() === author._id.toString());
    const pStat = paymentsStats.find(p => p._id === author.mobile_number);
    
    const totalRoyalty = sStat ? Math.max(0, sStat.totalRoyalty) : 0;
    const totalPayments = pStat ? pStat.totalPayments : 0;
    
    return {
      ...author,
      totalRoyalty,
      totalPayments,
      balance: Math.max(0, totalRoyalty - totalPayments)
    };
  });

  return {
    data: enrichedAuthors,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

export const updateProfile = async (userId, updateFields) => {
  const user = await User.findById(userId);
  if (!user) return null;

  user.name = updateFields.name || user.name;
  user.email = updateFields.email || user.email;
  user.mobile_number = updateFields.mobile_number || user.mobile_number;

  if (updateFields.password) {
    user.password = updateFields.password;
  }

  const updatedUser = await user.save();
  return {
    id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    mobile_number: updatedUser.mobile_number,
    bank_details: updatedUser.bank_details
  };
};

export const adminUpdateUser = async (userId, updateFields) => {
  const user = await User.findById(userId);
  if (!user) return null;

  user.name = updateFields.name || user.name;
  user.email = updateFields.email || user.email;
  user.mobile_number = updateFields.mobile_number || user.mobile_number;
  user.role = updateFields.role || user.role;

  if (updateFields.bank_details) {
    user.bank_details = {
      bank_name: updateFields.bank_details.bank_name !== undefined ? updateFields.bank_details.bank_name : user.bank_details?.bank_name,
      holder_name: (updateFields.bank_details.account_holder !== undefined ? updateFields.bank_details.account_holder : 
                    updateFields.bank_details.holder_name !== undefined ? updateFields.bank_details.holder_name : 
                    user.bank_details?.holder_name),
      account_number: updateFields.bank_details.account_number !== undefined ? updateFields.bank_details.account_number : user.bank_details?.account_number,
      ifsc_code: updateFields.bank_details.ifsc_code !== undefined ? updateFields.bank_details.ifsc_code : user.bank_details?.ifsc_code,
      upi: updateFields.bank_details.upi !== undefined ? updateFields.bank_details.upi : user.bank_details?.upi,
    };
  }

  if (updateFields.password) {
    user.password = updateFields.password;
  }

  const updatedUser = await user.save();
  return {
    id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    mobile_number: updatedUser.mobile_number,
    bank_details: updatedUser.bank_details,
  };
};

export const createPasswordResetToken = async (email) => {
  const user = await User.findOne({ email: email.trim() });
  if (!user) return null;

  const resetToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  await user.save();
  return resetToken;
};

export const resetUserPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) return null;

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();
  return user;
};

export const deleteUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) return null;

  await user.deleteOne();
  return true;
};
