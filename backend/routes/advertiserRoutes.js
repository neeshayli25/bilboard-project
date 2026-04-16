import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getDashboardStats,
  getAdPerformance,
  getSpendingTrend,
  getTopAds,
  getAdPlacements,
  getRecentActivities,
  getAlerts,
  uploadAd,
  updateAd,
  getCities,
  getBillboardsByCity,
  getAllBillboards,
  getBillboardAvailability,
  createBooking,
  getMyBookings,
  getMyAds,
  getPayments,
  getInvoices,
  getReports,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
  submitManualPayment,
} from '../controllers/advertiserController.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();
router.use(protect);

// Dashboard
router.get('/stats', getDashboardStats);
router.get('/ad-performance', getAdPerformance);
router.get('/spending-trend', getSpendingTrend);
router.get('/top-ads', getTopAds);
router.get('/ad-placements', getAdPlacements);
router.get('/recent-activities', getRecentActivities);
router.get('/alerts', getAlerts);

// Ad upload & update
router.post('/upload-ad', upload.single('media'), uploadAd);
router.put('/my-ads/:id', upload.single('media'), updateAd);

// Billboard selection
router.get('/cities', getCities);
router.get('/billboards', getBillboardsByCity);
router.get('/billboards/all', getAllBillboards);
router.get('/billboard/:id/availability', getBillboardAvailability);

// Bookings
router.post('/bookings', createBooking);
router.get('/my-bookings', getMyBookings);

// Ads
router.get('/my-ads', getMyAds);

// Payments & Invoices
router.get('/payments', getPayments);
router.get('/invoices', getInvoices);
router.post('/submit-payment', protect, submitManualPayment);

// Reports
router.get('/reports', getReports);

// Notifications
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);
router.put('/notifications/read-all', markAllNotificationsRead);
router.delete('/notifications', clearNotifications);

export default router;