import express from 'express';
import {
  createAd,
  getActiveAds,
  getAllAds,
  getMyAds,
  updateAd,
  deleteAd,
  incrementClick,
} from '../controllers/adController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.get('/active', getActiveAds);
router.post('/:id/click', incrementClick);

// Protected routes (require authentication)
router.post('/', protect, upload.single('image'), createAd);
router.get('/myads', protect, getMyAds);
router.put('/:id', protect, updateAd);
router.delete('/:id', protect, deleteAd);

// Admin-only routes
router.get('/', protect, admin, getAllAds);

export default router;