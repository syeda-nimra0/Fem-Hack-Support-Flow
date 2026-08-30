import { Router } from 'express';
import { register, login, me, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);
router.patch('/me', protect, updateProfile);

export default router;
