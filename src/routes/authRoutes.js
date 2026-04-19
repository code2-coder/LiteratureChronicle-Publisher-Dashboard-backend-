import express from 'express';
import { 
  authUser, 
  registerUser, 
  getUserProfile, 
  getAuthors, 
  updateUser,
  updateUserProfile,
  deleteUser
} from '../controllers/authController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', authUser);
router.post('/register', registerUser);

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);
router.get('/authors', protect, admin, getAuthors);
router.route('/:id')
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

export default router;
