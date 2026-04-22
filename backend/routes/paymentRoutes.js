import express from 'express';
import upload from '../middleware/uploadMiddleware.js';
import { persistRequestUpload } from '../utils/mediaStorage.js';
import {
  confirmPayFastPayment,
  getCheckoutConfig,
  initiatePayFastPayment,
  prepareBookingCheckout,
  syncPayFastPaymentStatus,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/checkout-config/:billboardId', protect, getCheckoutConfig);
router.post('/prepare-booking', protect, upload.single('media'), persistRequestUpload('ads'), prepareBookingCheckout);
router.post('/payfast/initiate', protect, initiatePayFastPayment);
router.post('/payfast/confirm', protect, confirmPayFastPayment);
router.post('/payfast/sync-status', protect, syncPayFastPaymentStatus);

export default router;
