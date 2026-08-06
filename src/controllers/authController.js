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
  const resetToken = await authService.createPasswordResetToken(req.body.email);

  if (!resetToken) {
    res.status(404);
    throw new Error('There is no user with that email');
  }

  let host = req.get('host');
  if (host.includes('8080')) {
    host = host.replace('8080', '3000');
  }
  const resetUrl = `${req.protocol}://${host}/reset-password/${resetToken}`;

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please click the link below to reset your password: \n\n ${resetUrl}`;

  try {
    await sendEmail({
      email: req.body.email,
      subject: 'Password Reset Token',
      message,
      html: `<p>You requested a password reset. Click the link below to reset your password:</p><a href="${resetUrl}">${resetUrl}</a>`
    });

    res.status(200).json({ success: true, data: 'Email sent' });
  } catch (err) {
    console.error('Email Error:', err);
    res.status(500);
    throw new Error('Email could not be sent');
  }
});

// @desc    Reset Password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
  const user = await authService.resetUserPassword(req.params.resettoken, req.body.password);

  if (!user) {
    res.status(400);
    throw new Error('Invalid token');
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
