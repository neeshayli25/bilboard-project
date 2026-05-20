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

// Public hardware display endpoint (RASPBERRY PI USES THIS)
router.get('/display/:id', getDisplayContent);

// Other endpoints
router.get('/current', getCurrentDisplayContent);
router.get('/registry', protect, admin, getDisplayRegistry);

router.post('/send-ad', protect, admin, sendAdToDisplay);

router.post('/heartbeat/:id', reportDisplayHeartbeat);

router.get('/status/:id', protect, admin, getBillboardHardwareStatus);

router.post('/status/:id/rotate-token', protect, admin, rotateBillboardDeviceToken);

export default router;