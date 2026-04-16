import { cloudinary } from '../config/cloudinary.js';

// @desc    Get all images from Cloudinary
// @route   GET /api/images
// @access  Private/Admin
export const getCloudinaryImages = async (req, res) => {
  try {
    // Admin API resources method is more reliable across different Cloudinary plans
    // than the Search API.
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'bookdash_covers/',
      max_results: 100
    });
    
    res.json(result.resources);
  } catch (error) {
    res.status(500).json({ 
      message: 'Cloudinary API Error', 
      error: error.message,
      detail: error.error?.message || '' 
    });
  }
};

// @desc    Delete an image from Cloudinary
// @route   DELETE /api/images/:public_id
// @access  Private/Admin
export const deleteCloudinaryImage = async (req, res) => {
  try {
    const { public_id } = req.params;
    const decodedPublicId = decodeURIComponent(public_id);
    
    const result = await cloudinary.uploader.destroy(decodedPublicId);
    
    if (result.result === 'ok') {
      res.json({ message: 'Image deleted successfully' });
    } else {
      res.status(400).json({ message: 'Failed to delete image', result });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Upload an image to Cloudinary
// @route   POST /api/images
// @access  Private/Admin
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // The upload middleware already handled the Cloudinary upload
    // and returns the file details in req.file
    res.status(201).json({
      message: 'Image uploaded successfully',
      public_id: req.file.filename,
      secure_url: req.file.path,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
