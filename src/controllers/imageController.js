import asyncHandler from 'express-async-handler';
import { cloudinary } from '../config/cloudinary.js';

// @desc    Get all images from Cloudinary
// @route   GET /api/images
// @access  Private/Admin
export const getCloudinaryImages = asyncHandler(async (req, res) => {
  const result = await cloudinary.api.resources({
    type: 'upload',
    prefix: 'bookdash_covers/',
    max_results: 100
  });
  
  res.json(result.resources);
});

// @desc    Delete an image from Cloudinary
// @route   DELETE /api/images/:public_id
// @access  Private/Admin
export const deleteCloudinaryImage = asyncHandler(async (req, res) => {
  const { public_id } = req.params;
  const decodedPublicId = decodeURIComponent(public_id);
  
  const result = await cloudinary.uploader.destroy(decodedPublicId);
  
  if (result.result === 'ok') {
    res.json({ message: 'Image deleted successfully' });
  } else {
    res.status(400);
    throw new Error('Failed to delete image from Cloudinary');
  }
});

// @desc    Upload an image to Cloudinary
// @route   POST /api/images
// @access  Private/Admin
export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }
  
  res.status(201).json({
    message: 'Image uploaded successfully',
    public_id: req.file.filename,
    secure_url: req.file.path,
  });
});
