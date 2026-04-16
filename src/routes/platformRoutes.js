import express from 'express';
import { getPlatforms, createPlatform, updatePlatform, deletePlatform } from '../controllers/platformController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getPlatforms)
  .post(protect, admin, createPlatform);

router.route('/:id')
  .put(protect, admin, updatePlatform)
  .delete(protect, admin, deletePlatform);

export default router;
