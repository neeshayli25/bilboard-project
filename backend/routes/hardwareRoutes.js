import express from 'express';
import {
  getCurrentDisplayContent,
  getBillboardHardwareStatus,
  getDisplayContent,
  getDisplayRegistry,
  reportDisplayHeartbeat,
  rotateBillboardDeviceToken,
  sendAdToDisplay,
} from '../controllers/hardwareController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/current', getCurrentDisplayContent);
router.get('/registry', getDisplayRegistry);
router.post('/send-ad', protect, admin, sendAdToDisplay);
router.post('/heartbeat/:id', reportDisplayHeartbeat);
router.get('/status/:id', protect, admin, getBillboardHardwareStatus);
router.post('/status/:id/rotate-token', protect, admin, rotateBillboardDeviceToken);

// Public endpoint for hardware polling
router.get('/display/:id', getDisplayContent);

export default router;
