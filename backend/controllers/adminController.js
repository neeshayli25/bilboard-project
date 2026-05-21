import Billboard from '../models/Billboard.js';
import Ad from '../models/Ad.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Transaction from '../models/Transaction.js';
import Invoice from '../models/Invoice.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';

import Stripe from 'stripe';

import {
  buildDisplayConfig,
  ensureBillboardDisplayConfig,
  sanitizeDisplayConfigForAdmin,
} from '../utils/displayConfig.js';

import {
  getRatePerMinute,
  normalizeBillboardPricing,
} from '../utils/bookingUtils.js';

import {
  expireStaleManualPaymentBookings,
} from '../utils/manualPaymentUtils.js';

// ---------------- SAFE HELPER ----------------

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ---------------- STRIPE ----------------

const stripe =
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY.startsWith('sk_')
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

const createInvoiceNumber = () => `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const getAdminBillboardIds = async (adminId) => {
  const billboards = await Billboard.find({ createdBy: adminId }).select('_id');
  return billboards.map((billboard) => billboard._id);
};

// ======================================================
// BILLBOARD CRUD
// ======================================================

export const getBillboards = async (req, res) => {
  const billboards = await Billboard.find({ createdBy: req.user._id });

  await Promise.all(
    billboards.map((b) => ensureBillboardDisplayConfig(b))
  );

  res.json(
    billboards.map((b) =>
      normalizeBillboardPricing({
        ...b.toObject(),
        displayConfig: sanitizeDisplayConfigForAdmin(b.displayConfig),
      })
    )
  );
};

export const createBillboard = async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.user._id };

    if (req.file) {
      data.imageUrl =
        req.file.storageUrl ||
        `/uploads/billboards/${req.file.filename}`;
    }

    if (typeof data.timeSlots === 'string') {
      try {
        data.timeSlots = JSON.parse(data.timeSlots);
      } catch {}
    }

    data.displayConfig = buildDisplayConfig(
      typeof data.displayConfig === 'string'
        ? JSON.parse(data.displayConfig)
        : data.displayConfig || {}
    );

    const billboard = await Billboard.create(data);

    res.status(201).json(billboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBillboard = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid Billboard ID' });
    }

    const billboard = await Billboard.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!billboard) {
      return res.status(404).json({ message: 'Billboard not found' });
    }

    const data = { ...req.body };

    if (req.file) {
      data.imageUrl =
        req.file.storageUrl ||
        `/uploads/billboards/${req.file.filename}`;
    }

    if (typeof data.timeSlots === 'string') {
      try {
        data.timeSlots = JSON.parse(data.timeSlots);
      } catch {}
    }

    const updated = await Billboard.findByIdAndUpdate(
      req.params.id,
      {
        ...data,
        displayConfig: buildDisplayConfig({
          ...billboard.displayConfig,
          ...(typeof data.displayConfig === 'string'
            ? JSON.parse(data.displayConfig)
            : data.displayConfig || {}),
        }),
      },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBillboard = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid Billboard ID' });
    }

    const billboard = await Billboard.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!billboard) {
      return res.status(404).json({ message: 'Not found' });
    }

    await Billboard.findByIdAndDelete(req.params.id);

    res.json({ message: 'Billboard deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ======================================================
// ADS
// ======================================================

export const getAllAds = async (req, res) => {
  const ads = await Ad.find()
    .populate('advertiser', 'name email')
    .sort({ createdAt: -1 });

  res.json(ads);
};

export const deleteAd = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid Ad ID' });
    }

    await Ad.findByIdAndDelete(req.params.id);

    res.json({ message: 'Ad deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveAd = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid Ad ID' });
  }

  const ad = await Ad.findByIdAndUpdate(
    req.params.id,
    { approvalStatus: 'approved' },
    { new: true }
  );

  if (ad) {
    await Notification.create({
      user: ad.advertiser,
      title: 'Ad Approved',
      message: `Your ad "${ad.title}" was approved.`,
    });
  }

  res.json(ad);
};

export const rejectAd = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid Ad ID' });
  }

  const ad = await Ad.findByIdAndUpdate(
    req.params.id,
    { approvalStatus: 'rejected' },
    { new: true }
  );

  if (ad) {
    await Notification.create({
      user: ad.advertiser,
      title: 'Ad Rejected',
      message: `Your ad "${ad.title}" was rejected.`,
    });
  }

  res.json(ad);
};

// ======================================================
// BOOKINGS (FIXED CRITICAL BUGS HERE)
// ======================================================

export const updateBookingStatus = async (req, res) => {
  const { status } = req.body;

  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid Booking ID' });
  }

  const booking = await Booking.findById(req.params.id).populate('billboard');

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  if (String(booking.billboard.createdBy) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  booking.status = status;
  await booking.save();

  res.json(booking);
};

export const approveBooking = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid Booking ID' });
  }

  const booking = await Booking.findById(req.params.id).populate(
    'billboard'
  );

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  booking.status = 'approved';
  await booking.save();

  res.json(booking);
};

export const rejectBooking = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid Booking ID' });
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  booking.status = 'rejected';
  await booking.save();

  res.json(booking);
};

// ======================================================
// USERS
// ======================================================

export const getUsers = async (req, res) => {
  const users = await User.find().select('-password');

  res.json(users);
};

export const deactivateUser = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid User ID' });
  }

  await User.findByIdAndUpdate(req.params.id, {
    isActive: false,
  });

  res.json({ message: 'User deactivated' });
};

export const activateUser = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid User ID' });
  }

  await User.findByIdAndUpdate(req.params.id, {
    isActive: true,
  });

  res.json({ message: 'User activated' });
};

export const updateUserRole = async (req, res) => {
  const { role } = req.body;
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid User ID' });
  }

  await User.findByIdAndUpdate(req.params.id, { role });

  res.json({ message: 'Role updated' });
};

// ======================================================
// NOTIFICATIONS
// ======================================================

export const getNotifications = async (req, res) => {
  const notifications = await Notification.find({
    user: req.user._id,
  }).sort('-createdAt');

  res.json(notifications);
};

export const markNotificationRead = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid Notification ID' });
  }

  await Notification.findByIdAndUpdate(req.params.id, {
    isRead: true,
  });

  res.json({ message: 'Marked as read' });
};

export const clearAllNotifications = async (req, res) => {
  await Notification.deleteMany({ user: req.user._id });

  res.json({ message: 'Cleared' });
};

export const markAllNotificationsRead = async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ message: 'All notifications marked as read' });
};

export const getPendingAds = async (req, res) => {
  const ads = await Ad.find({ approvalStatus: 'pending' })
    .populate('advertiser', 'name email phone organization')
    .sort({ createdAt: -1 });

  res.json(ads);
};

export const getDashboardStats = async (req, res) => {
  await expireStaleManualPaymentBookings();
  const billboardIds = await getAdminBillboardIds(req.user._id);
  const bookings = await Booking.find({ billboard: { $in: billboardIds } }).select('_id status paymentStatus totalPrice');
  const bookingIds = bookings.map((booking) => booking._id);
  const transactions = await Transaction.find({ booking: { $in: bookingIds }, status: 'completed' });

  res.json({
    totalBillboards: billboardIds.length,
    activeBillboards: await Billboard.countDocuments({ _id: { $in: billboardIds }, status: 'active' }),
    totalAds: await Ad.countDocuments(),
    pendingAds: await Ad.countDocuments({ approvalStatus: 'pending' }),
    totalBookings: bookings.length,
    pendingBookings: bookings.filter((booking) => ['pending', 'approved'].includes(booking.status)).length,
    scheduledBookings: bookings.filter((booking) => ['scheduled', 'active'].includes(booking.status)).length,
    revenue: transactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
    users: await User.countDocuments(),
  });
};

export const getRevenueTrend = async (req, res) => {
  const billboardIds = await getAdminBillboardIds(req.user._id);
  const bookings = await Booking.find({ billboard: { $in: billboardIds } }).select('_id');
  const bookingIds = bookings.map((booking) => booking._id);
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const trend = await Transaction.aggregate([
    { $match: { booking: { $in: bookingIds }, status: 'completed', createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$amount' } } },
    { $sort: { _id: 1 } },
  ]);

  res.json(trend.map((item) => ({ day: item._id, revenue: item.revenue })));
};

export const getBookings = async (req, res) => {
  await expireStaleManualPaymentBookings();
  const billboardIds = await getAdminBillboardIds(req.user._id);
  const status = String(req.query.status || '').trim();
  const filter = { billboard: { $in: billboardIds } };
  if (status) {
    filter.status = status;
  }

  const bookings = await Booking.find(filter)
    .populate('advertiser', 'name email phone organization')
    .populate('billboard', 'name city location imageUrl size type resolution displayConfig pricePerHour pricePerMinute')
    .populate('ad', 'title mediaUrl mediaType duration approvalStatus')
    .sort({ createdAt: -1 });

  res.json(bookings);
};

export const getPendingBookings = async (req, res) => {
  req.query.status = 'pending';
  return getBookings(req, res);
};

export const confirmBookingPayment = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid Booking ID' });
  }

  const booking = await Booking.findById(req.params.id)
    .populate('billboard', 'name createdBy')
    .populate('advertiser', 'name email phone');

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  if (String(booking.billboard?.createdBy) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Not authorized for this booking.' });
  }

  booking.status = 'scheduled';
  booking.paymentStatus = 'paid';
  booking.paymentCapturedAt = new Date();
  booking.adminReviewNote = req.body?.note || '';
  await booking.save();

  const invoiceNumber = booking.gatewayReference || createInvoiceNumber();
  let transaction = await Transaction.findOne({ booking: booking._id }).sort({ createdAt: -1 });
  if (transaction) {
    transaction.status = 'completed';
    transaction.amount = Number(booking.totalPrice || transaction.amount || 0);
    transaction.method = booking.paymentMethod || transaction.method || 'bank_transfer';
    transaction.gateway = booking.paymentGateway || transaction.gateway || 'manual';
    transaction.invoiceNumber = transaction.invoiceNumber || invoiceNumber;
    await transaction.save();
  } else {
    transaction = await Transaction.create({
      booking: booking._id,
      advertiser: booking.advertiser?._id || booking.advertiser,
      amount: Number(booking.totalPrice || 0),
      method: booking.paymentMethod || 'bank_transfer',
      gateway: booking.paymentGateway || 'manual',
      status: 'completed',
      invoiceNumber,
      customerName: booking.customerName || booking.advertiser?.name || '',
      customerEmail: booking.customerEmail || booking.advertiser?.email || '',
      customerPhone: booking.customerPhone || booking.advertiser?.phone || '',
      gatewayReference: booking.gatewayReference || invoiceNumber,
    });
  }

  const existingInvoice = await Invoice.findOne({ booking: booking._id });
  if (existingInvoice) {
    existingInvoice.status = 'paid';
    existingInvoice.amount = Number(booking.totalPrice || existingInvoice.amount || 0);
    await existingInvoice.save();
  } else {
    await Invoice.create({
      invoiceNumber: transaction.invoiceNumber || invoiceNumber,
      booking: booking._id,
      advertiser: booking.advertiser?._id || booking.advertiser,
      amount: Number(booking.totalPrice || 0),
      status: 'paid',
    });
  }

  await Notification.create({
    user: booking.advertiser?._id || booking.advertiser,
    title: 'Payment Confirmed',
    message: `Your payment for ${booking.billboard?.name || 'the billboard'} was confirmed. The ad is now scheduled.`,
    type: 'payment',
    relatedId: booking._id,
  });

  res.json({ booking, transaction, message: 'Booking payment confirmed and scheduled.' });
};

export const rejectBookingPayment = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid Booking ID' });
  }

  const booking = await Booking.findById(req.params.id).populate('billboard', 'name createdBy');
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  if (String(booking.billboard?.createdBy) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Not authorized for this booking.' });
  }

  booking.status = 'approved';
  booking.paymentStatus = 'failed';
  booking.adminReviewNote = req.body?.note || 'Payment proof rejected by admin.';
  await booking.save();

  await Notification.create({
    user: booking.advertiser,
    title: 'Payment Proof Rejected',
    message: `Payment proof for ${booking.billboard?.name || 'the billboard'} was rejected. Please submit a valid payment proof.`,
    type: 'payment',
    relatedId: booking._id,
  });

  res.json({ booking, message: 'Payment proof rejected.' });
};

export const getTransactions = async (req, res) => {
  const billboardIds = await getAdminBillboardIds(req.user._id);
  const bookings = await Booking.find({ billboard: { $in: billboardIds } }).select('_id');
  const bookingIds = bookings.map((booking) => booking._id);

  const transactions = await Transaction.find({ booking: { $in: bookingIds } })
    .populate('advertiser', 'name email phone')
    .populate({
      path: 'booking',
      populate: [
        { path: 'billboard', select: 'name city location imageUrl' },
        { path: 'ad', select: 'title mediaUrl mediaType' },
      ],
    })
    .sort({ createdAt: -1 });

  res.json(transactions);
};

export const updateTransactionStatus = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid Transaction ID' });
  }

  const transaction = await Transaction.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  res.json(transaction);
};

export const getPaymentSettings = async (req, res) => {
  const user = await User.findById(req.user._id).select('paymentSetup');
  res.json(user?.paymentSetup || {});
};

export const updatePaymentSettings = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.paymentSetup = {
    ...(user.paymentSetup?.toObject ? user.paymentSetup.toObject() : user.paymentSetup || {}),
    ...(req.body || {}),
  };
  await user.save();

  res.json(user.paymentSetup);
};

export const getRevenueReport = async (req, res) => getTransactions(req, res);

export const getCampaignReport = async (req, res) => {
  const bookings = await Booking.find({})
    .populate('advertiser', 'name email')
    .populate('billboard', 'name city location')
    .populate('ad', 'title mediaUrl mediaType')
    .sort({ createdAt: -1 });

  res.json(bookings);
};

export const getBookingReport = async (req, res) => getBookings(req, res);

export const getBillboardPerformance = async (req, res) => {
  const billboardIds = await getAdminBillboardIds(req.user._id);
  const billboards = await Billboard.find({ _id: { $in: billboardIds } }).select('name city location');
  const bookings = await Booking.find({ billboard: { $in: billboardIds } }).select('billboard status totalPrice');

  const performance = billboards.map((billboard) => {
    const relatedBookings = bookings.filter((booking) => String(booking.billboard) === String(billboard._id));
    return {
      billboardId: billboard._id,
      billboardName: billboard.name,
      city: billboard.city,
      location: billboard.location,
      bookings: relatedBookings.length,
      revenue: relatedBookings.reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0),
      activeBookings: relatedBookings.filter((booking) => ['scheduled', 'active'].includes(booking.status)).length,
    };
  });

  res.json(performance);
};
