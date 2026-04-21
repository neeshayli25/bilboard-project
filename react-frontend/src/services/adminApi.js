import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
});

// Request interceptor: attach JWT token
API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    config.headers['X-Client-Origin'] = window.location.origin;
  }
  return config;
});

// Response interceptor: handle 401 Unauthorized
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ================== AUTHENTICATION ==================
export const register = (userData) => API.post('/auth/register', userData);
export const login = (credentials) => API.post('/auth/login', credentials);
export const verifyEmailToken = (token) => API.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
export const resendVerificationEmail = (data) => API.post('/auth/resend-verification', data);
export const requestPasswordReset = (data) => API.post('/auth/forgot-password', data);
export const resetPassword = (token, data) => API.post(`/auth/reset-password/${token}`, data);
export const getProfile = () => API.get('/auth/me');
export const updateProfile = (data) => API.put('/auth/profile', data);
export const changePassword = (data) => API.put('/auth/change-password', data);

// ================== ADMIN DASHBOARD ==================
export const getDashboardStats = () => API.get('/admin/stats');
export const getRevenueTrend = () => API.get('/admin/revenue-trend');

// ========== ADMIN: BILLBOARD MANAGEMENT ==========
export const getBillboards = () => API.get('/admin/billboards');
export const createBillboard = (data) => API.post('/admin/billboards', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateBillboard = (id, data) => API.put(`/admin/billboards/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteBillboard = (id) => API.delete(`/admin/billboards/${id}`);
export const getBillboardHardwareStatus = (id) => API.get(`/hardware/status/${id}`);
export const rotateBillboardDisplayToken = (id) => API.post(`/hardware/status/${id}/rotate-token`);

// ========== ADMIN: AD MANAGEMENT & APPROVALS ==========
export const getAllAds = () => API.get('/admin/ads');
export const getPendingAds = () => API.get('/admin/ads/pending');
export const approveAd = (id) => API.put(`/admin/ads/${id}/approve`);
export const rejectAd = (id) => API.put(`/admin/ads/${id}/reject`);
export const deleteAd = (id) => API.delete(`/admin/ads/${id}`);

// ========== ADMIN: BOOKING MANAGEMENT ==========
export const getBookings = () => API.get('/admin/bookings');
export const updateBookingStatus = (id, status) => API.put(`/admin/bookings/${id}/status`, { status });
export const getPendingBookings = () => API.get('/admin/bookings?status=pending');
export const approveBooking = (id, data = {}) => API.put(`/admin/bookings/${id}/approve`, data);
export const rejectBooking = (id, data = {}) => API.put(`/admin/bookings/${id}/reject`, data);
export const confirmBookingPayment = (id, data = {}) => API.put(`/admin/bookings/${id}/confirm-payment`, data);
export const rejectBookingPayment = (id, data = {}) => API.put(`/admin/bookings/${id}/reject-payment`, data);

// ========== ADMIN: PAYMENTS / TRANSACTIONS ==========
export const getTransactions = () => API.get('/admin/transactions');
export const updateTransactionStatus = (id, status) => API.put(`/admin/transactions/${id}`, { status });
export const getAdminPaymentSettings = () => API.get('/admin/payment-settings');
export const updateAdminPaymentSettings = (data) => API.put('/admin/payment-settings', data);

// ========== ADMIN: USER MANAGEMENT ==========
export const getUsers = () => API.get('/admin/users');
export const deactivateUser = (id) => API.put(`/admin/users/${id}/deactivate`);
export const activateUser = (id) => API.put(`/admin/users/${id}/activate`);
export const updateUserRole = (id, role) => API.put(`/admin/users/${id}/role`, { role });

// ========== ADMIN: NOTIFICATIONS ==========
export const getNotifications = () => API.get('/admin/notifications');
export const markNotificationRead = (id) => API.put(`/admin/notifications/${id}/read`);
export const markAllNotificationsRead = () => API.put('/admin/notifications/read-all');
export const clearAllNotifications = () => API.delete('/admin/notifications');

// ========== ADMIN: REPORTS ==========
export const getRevenueReport = (params = '') => API.get(`/admin/reports/revenue${params}`);
export const getCampaignReport = () => API.get('/admin/reports/campaigns');
export const getBookingReport = () => API.get('/admin/reports/bookings');
export const getBillboardPerformance = () => API.get('/admin/reports/billboard');

// ================== ADVERTISER MODULE ==================
// Dashboard
export const getAdvertiserStats = () => API.get('/advertiser/stats');
export const getAdPerformance = () => API.get('/advertiser/ad-performance');
export const getSpendingTrend = () => API.get('/advertiser/spending-trend');
export const getTopAds = () => API.get('/advertiser/top-ads');
export const getAdPlacements = () => API.get('/advertiser/ad-placements');
export const getRecentActivities = () => API.get('/advertiser/recent-activities');
export const getAlerts = () => API.get('/advertiser/alerts');

// Ad upload
export const uploadAd = (formData) => API.post('/advertiser/upload-ad', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// Billboard browsing
export const getCities = () => API.get('/advertiser/cities');
export const getBillboardsByCity = (city) => API.get(`/advertiser/billboards?city=${city}`);
export const getAllBillboards = () => API.get('/advertiser/billboards/all');
export const getBillboardAvailability = (id, date) => API.get(`/advertiser/billboard/${id}/availability?date=${date}`);

// Booking creation & management
export const createBooking = (data) => API.post('/advertiser/bookings', data);
export const getMyBookings = () => API.get('/advertiser/my-bookings');
export const getMyAds = () => API.get('/advertiser/my-ads');
export const getPayments = () => API.get('/advertiser/payments');
export const getInvoices = () => API.get('/advertiser/invoices');
export const getReports = () => API.get('/advertiser/reports');

// Checkout / Verified Sandbox Payments
export const getCheckoutConfig = (billboardId) => API.get(`/payments/checkout-config/${billboardId}`);
export const prepareBookingCheckout = (data) =>
  API.post('/payments/prepare-booking', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
export const requestBookingPaymentCode = (data) => API.post('/payments/payfast/initiate', data);
export const verifyBookingPaymentCode = (data) => API.post('/payments/payfast/confirm', data);
export const resendBookingPaymentCode = (data) => API.post('/payments/payfast/sync-status', data);
export const submitManualBookingPayment = requestBookingPaymentCode;
export const initiatePayFastPayment = requestBookingPaymentCode;
export const confirmPayFastPayment = verifyBookingPaymentCode;
export const syncPayFastPaymentStatus = resendBookingPaymentCode;

// Display / hardware
export const sendAdToDisplay = (data) => API.post('/display/send-ad', data);
export const getCurrentDisplay = () => API.get('/display/current');

// Advertiser notifications
export const getAdvertiserNotifications = () => API.get('/advertiser/notifications');
export const markAdvertiserNotificationRead = (id) => API.put(`/advertiser/notifications/${id}/read`);
export const markAllAdvertiserNotificationsRead = () => API.put('/advertiser/notifications/read-all');
export const clearAllAdvertiserNotifications = () => API.delete('/advertiser/notifications');

// Aliases for simpler naming (optional)
export const getAdvertiserDashboardStats = getAdvertiserStats;

export default API;
