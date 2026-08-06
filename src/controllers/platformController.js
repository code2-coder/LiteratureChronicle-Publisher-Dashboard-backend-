import asyncHandler from 'express-async-handler';
import * as platformService from '../services/platformService.js';

// @desc    Get all platforms
// @route   GET /api/platforms
// @access  Private
export const getPlatforms = asyncHandler(async (req, res) => {
  const platforms = await platformService.getPlatforms();
  res.json(platforms);
});

// @desc    Create a platform
// @route   POST /api/platforms
// @access  Private/Admin
export const createPlatform = asyncHandler(async (req, res) => {
  const platform = await platformService.createPlatform(req.body);
  res.status(201).json(platform);
});

// @desc    Update a platform
// @route   PUT /api/platforms/:id
// @access  Private/Admin
export const updatePlatform = asyncHandler(async (req, res) => {
  const updatedPlatform = await platformService.updatePlatform(req.params.id, req.body);

  if (!updatedPlatform) {
    res.status(404);
    throw new Error('Platform not found');
  }

  res.json(updatedPlatform);
});

// @desc    Delete a platform
// @route   DELETE /api/platforms/:id
// @access  Private/Admin
export const deletePlatform = asyncHandler(async (req, res) => {
  const success = await platformService.deletePlatform(req.params.id);

  if (!success) {
    res.status(404);
    throw new Error('Platform not found');
  }

  res.json({ message: 'Platform removed' });
});
