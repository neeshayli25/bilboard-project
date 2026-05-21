import express from 'express';
import { getBillboardPublicDetails } from '../controllers/hardwareController.js';

const router = express.Router();

router.get('/:id', getBillboardPublicDetails);

export default router;
