import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import User from '../models/User.js';
import Sale from '../models/Sale.js';
import Royalty from '../models/Royalty.js';
import generateToken from '../config/generateToken.js';
import sendEmail from '../services/emailService.js';

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (or Admin only depending on requirement)
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, mobile_number, bank_details } = req.body;

  const userExists = await User.findOne({ 
    $or: [
      { email },
      { name },
      { mobile_number }
    ]
  });

  if (userExists) {
    res.status(400);
    if (userExists.email === email) throw new Error('User with this email already exists');
    if (userExists.name === name) throw new Error('User with this name already exists');
    if (userExists.mobile_number === mobile_number) throw new Error('User with this mobile number already exists');
  }

  const userData = {
    name,
    email,
    password,
    role,
    mobile_number,
  };

  if (bank_details) {
    userData.bank_details = {
      bank_name: bank_details.bank_name,
      holder_name: bank_details.account_holder || bank_details.holder_name,
      account_number: bank_details.account_number,
      ifsc_code: bank_details.ifsc_code,
      upi: bank_details.upi
    };
  }

  const user = await User.create(userData);

  if (user) {
    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // 2. Fetch Aggregated stats for the profile (single author)
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
            { $cond: [ { $eq: ["$format", "physical"] }, { $ifNull: ["$book.printing_cost", 0] }, 0 ] }
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

  res.json({
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
  });
});

// @desc    Get all authors
// @route   GET /api/auth/authors
// @access  Private/Admin
const getAuthors = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';

  let query = { role: 'author' };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { mobile_number: { $regex: search, $options: 'i' } }
    ];
  }

  const authors = await User.find(query)
    .select('name email mobile_number bank_details')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await User.countDocuments(query);

  // 2. Fetch Aggregated stats for the authors (can be optimized but let's do robust aggregation first)
  // Get all relevant author IDs and mobile numbers
  const authorIds = authors.map(a => a._id);
  const mobileNumbers = authors.map(a => a.mobile_number).filter(Boolean);

  // Sales Stats Aggregation
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
            { $cond: [ { $eq: ["$format", "physical"] }, { $ifNull: ["$book.printing_cost", 0] }, 0 ] }
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

  // Payments Stats Aggregation
  const paymentsStats = await Royalty.aggregate([
    { $match: { author_contact_number: { $in: mobileNumbers } } },
    {
      $group: {
        _id: "$author_contact_number",
        totalPayments: { $sum: "$paid_amount" }
      }
    }
  ]);

  // 3. Merge stats into authors array
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

  res.json({
    data: enrichedAuthors,
    total,
    page,
    pages: Math.ceil(total / limit)
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.name = req.body.name || user.name;
  user.email = req.body.email || user.email;
  user.mobile_number = req.body.mobile_number || user.mobile_number;

  if (req.body.password) {
    user.password = req.body.password;
  }

  // SECURITY: Bank details can ONLY be updated by Admin via the /api/auth/:id route.
  // We explicitly ignore bank_details here to prevent authors from editing their own settlements.

  const updatedUser = await user.save();

  res.json({
    id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    mobile_number: updatedUser.mobile_number,
    bank_details: updatedUser.bank_details, // Return current values (unchanged)
  });
});



// @desc    Update a user
// @route   PUT /api/auth/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.name = req.body.name || user.name;
  user.email = req.body.email || user.email;
  user.mobile_number = req.body.mobile_number || user.mobile_number;
  user.role = req.body.role || user.role;
  
  if (req.body.bank_details) {
    user.bank_details = {
      bank_name: req.body.bank_details.bank_name !== undefined ? req.body.bank_details.bank_name : user.bank_details?.bank_name,
      holder_name: (req.body.bank_details.account_holder !== undefined ? req.body.bank_details.account_holder : 
                    req.body.bank_details.holder_name !== undefined ? req.body.bank_details.holder_name : 
                    user.bank_details?.holder_name),
      account_number: req.body.bank_details.account_number !== undefined ? req.body.bank_details.account_number : user.bank_details?.account_number,
      ifsc_code: req.body.bank_details.ifsc_code !== undefined ? req.body.bank_details.ifsc_code : user.bank_details?.ifsc_code,
      upi: req.body.bank_details.upi !== undefined ? req.body.bank_details.upi : user.bank_details?.upi,
    };
  }

  if (req.body.password) {
    user.password = req.body.password;
  }

  const updatedUser = await user.save();

  res.json({
    id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    mobile_number: updatedUser.mobile_number,
    bank_details: updatedUser.bank_details,
  });
});

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
// @desc    Forgot Password (Secure Token Flow)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.trim() });

  if (!user) {
    res.status(404);
    throw new Error('There is no user with that email');
  }

  // Get reset token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  user.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins

  await user.save();

  // Create reset url (pointing to frontend)
  // In development (port 8080), we must redirect the user to the Vite dev server (port 3000).
  let host = req.get('host');
  if (host.includes('8080')) {
    host = host.replace('8080', '3000');
  }
  const resetUrl = `${req.protocol}://${host}/reset-password/${resetToken}`;

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please click the link below to reset your password: \n\n ${resetUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Token',
      message,
      html: `<p>You requested a password reset. Click the link below to reset your password:</p><a href="${resetUrl}">${resetUrl}</a>`
    });

    res.status(200).json({ success: true, data: 'Email sent' });
  } catch (err) {
    console.error('Email Error:', err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(500);
    throw new Error('Email could not be sent');
  }
});

// @desc    Reset Password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid token');
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id),
  });
});

// @desc    Delete a user
// @route   DELETE /api/auth/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Optional: Check if user has associated books in backend or just allow delete
  // For now, allow delete but return success
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User removed successfully' });
});

export { 
  authUser, 
  registerUser, 
  getUserProfile, 
  getAuthors, 
  updateUser, 
  updateUserProfile, 
  deleteUser,
  forgotPassword,
  resetPassword
};


