import axios from 'axios';

// Base URL for backend API
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create Axios instance
const API = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT token
API.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
      config.headers['X-Client-Origin'] = window.location.origin;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

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

// ================== PRODUCTS (if needed) ==================
export const getProducts = (page = 1, limit = 10) => API.get(`/products?page=${page}&limit=${limit}`);
export const getProductById = (id) => API.get(`/products/${id}`);
export const createProduct = (productData) => API.post('/products', productData);
export const updateProduct = (id, productData) => API.put(`/products/${id}`, productData);
export const deleteProduct = (id) => API.delete(`/products/${id}`);

// ================== ORDERS ==================
export const createOrder = (orderData) => API.post('/orders', orderData);
export const getMyOrders = () => API.get('/orders/myorders');
export const getOrderById = (id) => API.get(`/orders/${id}`);

// ================== ADS (general) ==================
export const getActiveAds = () => API.get('/ads/active');
export const getMyAds = () => API.get('/ads/myads');
export const getAllAds = (page = 1, limit = 10) => API.get(`/ads?page=${page}&limit=${limit}`);
export const createAd = (formData) => API.post('/ads', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateGeneralAd = (id, data) => API.put(`/ads/${id}`, data);   // renamed
export const deleteAd = (id) => API.delete(`/ads/${id}`);
export const incrementAdClick = (id) => API.post(`/ads/${id}/click`);

// ================== ADMIN DASHBOARD & MANAGEMENT ==================
export const getDashboardStats = () => API.get('/admin/stats');
export const getRevenueTrend = () => API.get('/admin/revenue-trend');

// Billboards (admin)
export const getBillboards = () => API.get('/admin/billboards');
export const createBillboard = (data) => API.post('/admin/billboards', data);
export const updateBillboard = (id, data) => API.put(`/admin/billboards/${id}`, data);
export const deleteBillboard = (id) => API.delete(`/admin/billboards/${id}`);

// Ad approvals (admin)
export const getPendingAds = () => API.get('/admin/ads/pending');
export const approveAd = (id) => API.put(`/admin/ads/${id}/approve`);
export const rejectAd = (id) => API.put(`/admin/ads/${id}/reject`);
export const deleteAdAdmin = (id) => API.delete(`/admin/ads/${id}`); // alias

// Bookings (admin)
export const getBookings = () => API.get('/admin/bookings');
export const updateBookingStatus = (id, status) => API.put(`/admin/bookings/${id}/status`, { status });
export const approveBooking = (id, data = {}) => API.put(`/admin/bookings/${id}/approve`, data);
export const rejectBooking = (id, data = {}) => API.put(`/admin/bookings/${id}/reject`, data);
export const confirmBookingPayment = (id, data = {}) => API.put(`/admin/bookings/${id}/confirm-payment`, data);
export const rejectBookingPayment = (id, data = {}) => API.put(`/admin/bookings/${id}/reject-payment`, data);

// Transactions (admin)
export const getTransactions = () => API.get('/admin/transactions');
export const updateTransactionStatus = (id, status) => API.put(`/admin/transactions/${id}`, { status });
export const getAdminPaymentSettings = () => API.get('/admin/payment-settings');
export const updateAdminPaymentSettings = (data) => API.put('/admin/payment-settings', data);

// Users (admin)
export const getUsers = () => API.get('/admin/users');
export const deactivateUser = (id) => API.put(`/admin/users/${id}/deactivate`);
export const activateUser = (id) => API.put(`/admin/users/${id}/activate`);
export const updateUserRole = (id, role) => API.put(`/admin/users/${id}/role`, { role });

// Notifications (admin)
export const getAdminNotifications = () => API.get('/admin/notifications');
export const markAdminNotificationRead = (id) => API.put(`/admin/notifications/${id}/read`);
export const markAllAdminNotificationsRead = () => API.put('/admin/notifications/read-all');
export const clearAllAdminNotifications = () => API.delete('/admin/notifications');

// Reports (admin)
export const getRevenueReport = (params = '') => API.get(`/admin/reports/revenue${params}`);
export const getCampaignReport = () => API.get('/admin/reports/campaigns');
export const getBookingReport = () => API.get('/admin/reports/bookings');
export const getBillboardPerformance = () => API.get('/admin/reports/billboard');

// ================== ADVERTISER MODULE ==================
export const getAdvertiserStats = () => API.get('/advertiser/stats');
export const getAdvertiserDashboardStats = getAdvertiserStats;

export const getAdPerformance = () => API.get('/advertiser/ad-performance');
export const getSpendingTrend = () => API.get('/advertiser/spending-trend');
export const getTopAds = () => API.get('/advertiser/top-ads');
export const getAdPlacements = () => API.get('/advertiser/ad-placements');
export const getRecentActivities = () => API.get('/advertiser/recent-activities');
export const getAlerts = () => API.get('/advertiser/alerts');
export const uploadAd = (formData) => API.post('/advertiser/upload-ad', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
// Ad update (advertiser specific)
export const updateAdvertiserAd = (id, formData) => API.put(`/advertiser/my-ads/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateAd = updateAdvertiserAd; // alias for components
export const getCities = () => API.get('/advertiser/cities');
export const getBillboardsByCity = (city) => API.get(`/advertiser/billboards?city=${city}`);
export const getBillboardAvailability = (id, date) => API.get(`/advertiser/billboard/${id}/availability?date=${date}`);
export const createBooking = (data) => API.post('/advertiser/bookings', data);
export const getMyBookings = () => API.get('/advertiser/my-bookings');
export const displayMyBooking = (id) => API.post(`/advertiser/bookings/${id}/display`);
export const getMyAdsAdvertiser = () => API.get('/advertiser/my-ads');
export const getPayments = () => API.get('/advertiser/payments');
export const processPayment = (data) => API.post('/advertiser/payment', data);
export const getAllBillboards = () => API.get('/advertiser/billboards/all');
export const getInvoices = () => API.get('/advertiser/invoices');
export const getReports = () => API.get('/advertiser/reports');
export const getAdvertiserNotifications = () => API.get('/advertiser/notifications');
export const markAdvertiserNotificationRead = (id) => API.put(`/advertiser/notifications/${id}/read`);
export const markAllAdvertiserNotificationsRead = () => API.put('/advertiser/notifications/read-all');
export const clearAllAdvertiserNotifications = () => API.delete('/advertiser/notifications');
export const submitManualPayment = (formData) =>
  API.post('/advertiser/submit-payment', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const createPaymentIntent = (data) => API.post('/advertiser/create-payment-intent', data);
export const confirmPayment = (data) => API.post('/advertiser/confirm-payment', data);
export const getCheckoutConfig = (billboardId) => API.get(`/payments/checkout-config/${billboardId}`);
export const prepareBookingCheckout = (data) => API.post('/payments/prepare-booking', data);
export const requestBookingPaymentCode = (data) => API.post('/payments/payfast/initiate', data);
export const verifyBookingPaymentCode = (data) => API.post('/payments/payfast/confirm', data);
export const resendBookingPaymentCode = (data) => API.post('/payments/payfast/sync-status', data);
export const initiatePayFastPayment = requestBookingPaymentCode;
export const confirmPayFastPayment = verifyBookingPaymentCode;
export const syncPayFastPaymentStatus = resendBookingPaymentCode;

// Aliases for simpler naming in components
export const getNotifications = getAdvertiserNotifications;
export const markNotificationRead = markAdvertiserNotificationRead;
export const markAllNotificationsRead = markAllAdvertiserNotificationsRead;
export const clearAllNotifications = clearAllAdvertiserNotifications;

// ================== EXPORT DEFAULT ==================
export default API;
