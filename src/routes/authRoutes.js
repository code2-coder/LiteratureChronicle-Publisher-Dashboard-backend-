import express from 'express';
import { 
  authUser, 
  registerUser, 
  getUserProfile, 
  getAuthors, 
  requestPasswordReset,
  updateUser,
  deleteUser
} from '../controllers/authController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', authUser);
router.post('/register', registerUser);
router.post('/reset-password', requestPasswordReset);
router.get('/profile', protect, getUserProfile);
router.get('/authors', protect, admin, getAuthors);
router.route('/:id')
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

export default router;
