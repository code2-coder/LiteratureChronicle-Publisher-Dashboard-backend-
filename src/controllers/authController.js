import asyncHandler from 'express-async-handler';
import * as authService from '../services/authService.js';
import sendEmail from '../services/emailService.js';
import generateToken from '../config/generateToken.js';

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUser(email, password);

  if (result) {
    res.json(result);
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const result = await authService.registerNewUser(req.body);

  if (result) {
    res.status(201).json(result);
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req, res) => {
  const profile = await authService.getProfileWithStats(req.user._id);

  if (profile) {
    res.json(profile);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get all authors
// @route   GET /api/auth/authors
// @access  Private/Admin
export const getAuthors = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';

  let filterQuery = {};
  if (search) {
    filterQuery.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { mobile_number: { $regex: search, $options: 'i' } }
    ];
  }

  const result = await authService.getPaginatedAuthors(filterQuery, { page, limit });
  res.json(result);
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req, res) => {
  const updatedUser = await authService.updateProfile(req.user._id, req.body);

  if (updatedUser) {
    res.json(updatedUser);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update a user
// @route   PUT /api/auth/:id
// @access  Private/Admin
export const updateUser = asyncHandler(async (req, res) => {
  const updatedUser = await authService.adminUpdateUser(req.params.id, req.body);

  if (updatedUser) {
    res.json(updatedUser);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error('Please provide an email address');
  }

  const otp = await authService.createPasswordResetOTP(email);

  if (!otp) {
    res.status(404);
    throw new Error('There is no user with that email');
  }

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Your One-Time Password (OTP) is:\n\n${otp}\n\nThis OTP is valid for 10 minutes.`;

  try {
    await sendEmail({
      email,
      subject: 'Password Reset OTP',
      message,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #333;">Password Reset OTP</h2>
          <p>You requested a password reset. Use the following 6-digit One-Time Password (OTP) to reset your password:</p>
          <div style="background-color: #f7f7f7; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 5px; border: 1px dashed #ccc;">
            ${otp}
          </div>
          <p style="color: #666; font-size: 12px;">This OTP is valid for 10 minutes. If you did not request this reset, please ignore this email.</p>
        </div>
      `
    });

    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Email Error:', err);
    res.status(500);
    throw new Error('OTP email could not be sent');
  }
});

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) {
    res.status(400);
    throw new Error('Please provide email, OTP, and new password');
  }

  const user = await authService.resetUserPassword(email, otp, password);

  if (!user) {
    res.status(400);
    throw new Error('Invalid OTP or OTP expired');
  }

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
export const deleteUser = asyncHandler(async (req, res) => {
  const success = await authService.deleteUserById(req.params.id);

  if (!success) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({ message: 'User removed successfully' });
});
