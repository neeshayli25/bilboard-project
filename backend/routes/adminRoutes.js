import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  getBillboards,
  createBillboard,
  updateBillboard,
  deleteBillboard,
  getAllAds,
  deleteAd,
  getPendingAds,
  approveAd,
  rejectAd,
  getDashboardStats,
  getRevenueTrend,
  getBookings,
  updateBookingStatus,
  getTransactions,
  updateTransactionStatus,
  getUsers,
  deactivateUser,
  activateUser,
  updateUserRole,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications,
  getRevenueReport,
  getCampaignReport,
  getBookingReport,
  getBillboardPerformance,
  getPendingBookings,
  approveBooking,
  rejectBooking,
} from '../controllers/adminController.js';

const router = express.Router();
router.use(protect, admin);

// Dashboard
router.get('/stats', getDashboardStats);
router.get('/revenue-trend', getRevenueTrend);

// Billboards
router.route('/billboards').get(getBillboards).post(createBillboard);
router.route('/billboards/:id').put(updateBillboard).delete(deleteBillboard);

// Ads
router.get('/ads', getAllAds);
router.get('/ads/pending', getPendingAds);
router.put('/ads/:id/approve', approveAd);
router.put('/ads/:id/reject', rejectAd);
router.delete('/ads/:id', deleteAd);

// Bookings
router.get('/bookings', getBookings);
router.put('/bookings/:id/status', updateBookingStatus);
router.get('/bookings/pending', getPendingBookings);
router.put('/bookings/:id/approve', approveBooking);
router.put('/bookings/:id/reject', rejectBooking);

// Transactions
router.get('/transactions', getTransactions);
router.put('/transactions/:id', updateTransactionStatus);

// Users
router.get('/users', getUsers);
router.put('/users/:id/deactivate', deactivateUser);
router.put('/users/:id/activate', activateUser);
router.put('/users/:id/role', updateUserRole);

// Notifications
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);
router.put('/notifications/read-all', markAllNotificationsRead);
router.delete('/notifications', clearAllNotifications);

// Reports
router.get('/reports/revenue', getRevenueReport);
router.get('/reports/campaigns', getCampaignReport);
router.get('/reports/bookings', getBookingReport);
router.get('/reports/billboard', getBillboardPerformance);

export default router;