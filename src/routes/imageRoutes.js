import express from 'express';
import { getCloudinaryImages, deleteCloudinaryImage, uploadImage } from '../controllers/imageController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

router.route('/')
  .get(protect, admin, getCloudinaryImages)
  .post(protect, admin, upload.single('image'), uploadImage);

router.route('/:public_id')
  .delete(protect, admin, deleteCloudinaryImage);

export default router;
