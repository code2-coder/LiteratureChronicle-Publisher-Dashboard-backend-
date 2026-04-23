import express from 'express';
import { 
  authUser, 
  registerUser, 
  getUserProfile, 
  getAuthors, 
  updateUser,
  updateUserProfile,
  deleteUser,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', authUser);
router.post('/register', registerUser);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);
router.get('/authors', protect, admin, getAuthors);
router.route('/:id')
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

export default router;
