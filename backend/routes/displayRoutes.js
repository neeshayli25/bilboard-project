import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { getCurrentDisplayContent, getDisplayContent, sendAdToDisplay } from '../controllers/hardwareController.js';

const router = express.Router();

router.get('/current', getCurrentDisplayContent);
router.get('/:id', getDisplayContent);
router.post('/send-ad', protect, admin, sendAdToDisplay);

export default router;
