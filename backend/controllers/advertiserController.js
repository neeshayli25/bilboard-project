import Ad from '../models/Ad.js';
import Billboard from '../models/Billboard.js';
import Booking from '../models/Booking.js';
import Transaction from '../models/Transaction.js';
import Invoice from '../models/Invoice.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper: get current advertiser ID from req.user
const getAdvertiserId = (req) => req.user._id;

function formatRelativeTime(date) {
  const diff = Math.floor((new Date() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

// ---------- Dashboard ----------
export const getDashboardStats = async (req, res) => {
  const advertiserId = getAdvertiserId(req);
  const totalAdsRunning = await Ad.countDocuments({ advertiser: advertiserId, approvalStatus: 'approved' });
  const activeCampaigns = await Booking.countDocuments({ advertiser: advertiserId, status: { $in: ['confirmed', 'approved'] } });
  const totalSpend = await Transaction.aggregate([
    { $match: { advertiser: advertiserId, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalImpressions = await Ad.aggregate([
    { $match: { advertiser: advertiserId } },
    { $group: { _id: null, total: { $sum: '$impressions' } } }
  ]);
  const pendingApprovals = await Ad.countDocuments({ advertiser: advertiserId, approvalStatus: 'pending' });
  const remainingBudget = 50000 - (totalSpend[0]?.total || 0);

  res.json({
    totalAdsRunning,
    activeCampaigns,
    totalSpend: totalSpend[0]?.total || 0,
    totalImpressions: totalImpressions[0]?.total || 0,
    pendingApprovals,
    remainingBudget,
  });
};

export const getAdPerformance = async (req, res) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const data = await Ad.aggregate([
    { $match: { advertiser: getAdvertiserId(req), createdAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, impressions: { $sum: '$impressions' } } },
    { $sort: { _id: 1 } }
  ]);
  res.json(data.map(d => ({ day: d._id, impressions: d.impressions })));
};

export const getSpendingTrend = async (req, res) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const data = await Transaction.aggregate([
    { $match: { advertiser: getAdvertiserId(req), status: 'completed', createdAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, spend: { $sum: '$amount' } } },
    { $sort: { _id: 1 } }
  ]);
  res.json(data.map(d => ({ day: d._id, spend: d.spend })));
};

export const getTopAds = async (req, res) => {
  const ads = await Ad.find({ advertiser: getAdvertiserId(req) }).sort({ impressions: -1 }).limit(5);
  res.json(ads.map(ad => ({ name: ad.title, impressions: ad.impressions, ctr: ad.ctr || 0 })));
};

export const getAdPlacements = async (req, res) => {
  const bookings = await Booking.find({ advertiser: getAdvertiserId(req), status: 'approved' })
    .populate('ad', 'title')
    .populate('billboard', 'name city');
  const placements = bookings.map(b => ({
    ad: b.ad?.title,
    billboard: b.billboard?.name,
    location: b.billboard?.city,
    status: 'active',
  }));
  res.json(placements);
};

export const getRecentActivities = async (req, res) => {
  const advertiserId = getAdvertiserId(req);
  const uploads = await Ad.find({ advertiser: advertiserId }).sort({ createdAt: -1 }).limit(3);
  const bookings = await Booking.find({ advertiser: advertiserId }).sort({ createdAt: -1 }).limit(3);
  const invoices = await Invoice.find({ advertiser: advertiserId }).sort({ createdAt: -1 }).limit(3);

  const activities = [
    ...uploads.map(a => ({ type: 'upload', message: `Ad '${a.title}' uploaded`, time: a.createdAt })),
    ...bookings.map(b => ({ type: 'booking', message: `Booking #${b._id.toString().slice(-6)} ${b.status}`, time: b.createdAt })),
    ...invoices.map(i => ({ type: 'invoice', message: `Invoice #${i.invoiceNumber} generated`, time: i.createdAt })),
  ];
  activities.sort((a, b) => b.time - a.time);
  res.json(activities.slice(0, 5).map(a => ({ ...a, time: formatRelativeTime(a.time) })));
};

export const getAlerts = async (req, res) => {
  const advertiserId = getAdvertiserId(req);
  const alerts = [];
  const endingSoon = await Booking.find({ advertiser: advertiserId, endDate: { $lt: new Date(Date.now() + 3 * 86400000) } });
  if (endingSoon.length) alerts.push({ type: 'warning', message: `${endingSoon.length} campaign(s) ending in 3 days` });
  res.json(alerts);
};

// ---------- Ad Upload ----------
export const uploadAd = async (req, res) => {
  const { title, description, duration } = req.body;
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const mediaUrl = `/uploads/ads/${req.file.filename}`;
  const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
  const ad = await Ad.create({
    title,
    description,
    mediaUrl,
    mediaType,
    advertiser: req.user._id,
    approvalStatus: 'pending',
    duration: duration || 30,
  });
  const adminUsers = await User.find({ role: 'admin' }).select('_id');
  for (const admin of adminUsers) {
    await Notification.create({
      user: admin._id,
      title: 'New Ad Pending',
      message: `Ad "${title}" needs approval.`,
    });
  }
  res.status(201).json(ad);
};

// ---------- Update Ad (edit) – notify only the billboard owner ----------
export const updateAd = async (req, res) => {
  const { id } = req.params;
  const { title, description, duration } = req.body;
  let updateData = { title, description, duration };

  if (req.file) {
    const mediaUrl = `/uploads/ads/${req.file.filename}`;
    const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    updateData.mediaUrl = mediaUrl;
    updateData.mediaType = mediaType;
    updateData.approvalStatus = 'pending';
  } else {
    updateData.approvalStatus = 'pending';
  }

  const ad = await Ad.findOneAndUpdate(
    { _id: id, advertiser: req.user._id },
    updateData,
    { new: true }
  );
  if (!ad) return res.status(404).json({ message: 'Ad not found or not owned by you' });

  // Find the billboard associated with this ad (if any) to notify its owner
  const booking = await Booking.findOne({ ad: ad._id });
  if (booking) {
    const billboard = await Billboard.findById(booking.billboard);
    if (billboard && billboard.createdBy) {
      await Notification.create({
        user: billboard.createdBy,
        title: 'Ad Updated',
        message: `Ad "${ad.title}" has been updated and needs re-approval.`,
      });
    }
  } else {
    // Fallback: notify all admins (unlikely, but safe)
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        title: 'Ad Updated',
        message: `Ad "${ad.title}" has been updated and needs re-approval.`,
      });
    }
  }
  res.json(ad);
};

// ---------- Billboard Selection ----------
export const getCities = async (req, res) => {
  const cities = await Billboard.distinct('city');
  res.json(cities);
};

export const getBillboardsByCity = async (req, res) => {
  const { city } = req.query;
  const billboards = await Billboard.find({ city, status: 'active' })
    .populate('createdBy', 'name easypaisaNumber');
  res.json(billboards);
};

export const getAllBillboards = async (req, res) => {
  const billboards = await Billboard.find({ status: 'active' })
    .populate('createdBy', 'name easypaisaNumber');
  res.json(billboards);
};

export const getBillboardAvailability = async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;
  const billboard = await Billboard.findById(id);
  if (!billboard) return res.status(404).json({ message: 'Billboard not found' });
  const bookedSlots = await Booking.find({
    billboard: id,
    date: new Date(date),
    status: { $nin: ['cancelled', 'rejected'] }
  });
  const availableSlots = billboard.timeSlots.filter(slot => !bookedSlots.some(b => b.timeSlot === slot));
  res.json({ availableSlots, pricePerHour: billboard.pricePerHour });
};

// ---------- Booking Creation (notify only billboard owner) ----------
export const createBooking = async (req, res) => {
  const { adId, billboardId, date, timeSlot, totalPrice } = req.body;
  const ad = await Ad.findOne({ _id: adId, advertiser: req.user._id });
  if (!ad) return res.status(404).json({ message: 'Ad not found or not owned by you' });
  const existing = await Booking.findOne({
    billboard: billboardId,
    date: new Date(date),
    timeSlot,
    status: { $nin: ['cancelled', 'rejected'] }
  });
  if (existing) return res.status(409).json({ message: 'Slot already booked' });
  const booking = await Booking.create({
    advertiser: req.user._id,
    ad: adId,
    billboard: billboardId,
    date: new Date(date),
    timeSlot,
    totalPrice,
    status: 'pending',
    paymentStatus: 'pending',
  });
  const billboard = await Billboard.findById(billboardId);
  if (billboard && billboard.createdBy) {
    await Notification.create({
      user: billboard.createdBy,
      title: 'New Booking Request',
      message: `Booking #${booking._id} for ${new Date(date).toLocaleDateString()} at ${timeSlot} requires approval.`,
      type: 'booking',
    });
  }
  res.status(201).json(booking);
};

// ---------- Stripe Payment (kept for reference) ----------
export const createPaymentIntent = async (req, res) => {
  const { amount, currency = 'pkr' } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'pkr',
      metadata: { advertiserId: req.user._id.toString() },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const submitManualPayment = async (req, res) => {
  const { bookingId, transactionId } = req.body;
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.advertiser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (booking.paymentStatus !== 'pending') {
      return res.status(400).json({ message: 'Payment already submitted' });
    }
    booking.paymentStatus = 'submitted';
    booking.paymentProof = transactionId || `Manual payment on ${new Date().toISOString()}`;
    await booking.save();
    const billboard = await Billboard.findById(booking.billboard);
    if (billboard && billboard.createdBy) {
      await Notification.create({
        user: billboard.createdBy,
        title: 'Payment Submitted',
        message: `Booking #${booking._id} payment submitted. Awaiting verification.`,
        type: 'payment',
      });
    }
    res.json({ success: true, message: 'Payment submitted, waiting for admin verification.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const confirmPayment = async (req, res) => {
  const { bookingId, paymentIntentId, paymentMethod } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not successful' });
    }
    const transaction = await Transaction.create({
      booking: bookingId,
      advertiser: req.user._id,
      amount: paymentIntent.amount / 100,
      method: 'stripe',
      status: 'completed',
      invoiceNumber: `INV-${Date.now()}`,
    });
    await Booking.findByIdAndUpdate(bookingId, { paymentStatus: 'paid' });
    await Invoice.create({
      invoiceNumber: transaction.invoiceNumber,
      booking: bookingId,
      advertiser: req.user._id,
      amount: paymentIntent.amount / 100,
      status: 'paid',
    });
    res.json({ success: true, transaction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------- My Bookings ----------
export const getMyBookings = async (req, res) => {
  const bookings = await Booking.find({ advertiser: req.user._id }).populate('billboard ad');
  res.json(bookings);
};

// ---------- My Ads ----------
export const getMyAds = async (req, res) => {
  const ads = await Ad.find({ advertiser: req.user._id }).sort({ createdAt: -1 });
  res.json(ads);
};

// ---------- Payments & Invoices ----------
export const getPayments = async (req, res) => {
  const transactions = await Transaction.find({ advertiser: req.user._id }).sort({ createdAt: -1 });
  res.json(transactions);
};

export const getInvoices = async (req, res) => {
  const invoices = await Invoice.find({ advertiser: req.user._id }).sort({ createdAt: -1 });
  res.json(invoices);
};

// ---------- Reports ----------
export const getReports = async (req, res) => {
  res.json({ message: 'Reports coming soon' });
};

// ---------- Notifications ----------
export const getNotifications = async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(notifications);
};

export const markNotificationRead = async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ message: 'Marked as read' });
};

export const markAllNotificationsRead = async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ message: 'All marked as read' });
};

export const clearNotifications = async (req, res) => {
  await Notification.deleteMany({ user: req.user._id });
  res.json({ message: 'All notifications cleared' });
};