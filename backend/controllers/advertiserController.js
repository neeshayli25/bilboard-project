import Ad from '../models/Ad.js';
import Billboard from '../models/Billboard.js';
import Booking from '../models/Booking.js';
import Transaction from '../models/Transaction.js';
import Invoice from '../models/Invoice.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Stripe from 'stripe';
import {
  bookingBlocksAvailability,
  calculateBookingAmount,
  doSlotsOverlap,
  extractDatePrefixFromSlot,
  extractTimeRangeFromSlot,
  parseDateOnly,
} from '../utils/bookingUtils.js';
import {
  expireStaleManualPaymentBookings,
  getManualPaymentMethodLabel,
  isManualPaymentExpired,
  normalizeManualPaymentMethod,
} from '../utils/manualPaymentUtils.js';

const hasUsableStripeSecret = (key = '') =>
  Boolean(key && key.startsWith('sk_') && !key.includes('...') && !key.toLowerCase().includes('stripe dashboard'));

const stripe = hasUsableStripeSecret(process.env.STRIPE_SECRET_KEY)
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Helper: get current advertiser ID from req.user
const getAdvertiserId = (req) => req.user._id;
const createInvoiceNumber = () => `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const getOccupiedSlotMessage = (booking) => {
  if (!booking) return 'This window is not available.';
  if (booking.status === 'active') return 'Currently an ad is already running there. Not available.';
  if (booking.status === 'scheduled') return 'Another ad is already scheduled there. Not available.';
  if (booking.status === 'approved') return 'This slot is reserved and waiting for payment confirmation. Not available.';
  return 'Another booking request already exists for this window. Not available.';
};

const upsertBillingRecords = async ({
  booking,
  advertiserId,
  amount,
  method,
  gateway,
  paymentReference = '',
  gatewayTransactionId = '',
  gatewayMeta = {},
  customerName = '',
  customerEmail = '',
  customerPhone = '',
}) => {
  const existingTransaction = await Transaction.findOne({ booking: booking._id }).sort({ createdAt: -1 });
  const existingInvoice = await Invoice.findOne({ booking: booking._id, advertiser: advertiserId });
  const invoiceNumber = existingTransaction?.invoiceNumber || existingInvoice?.invoiceNumber || createInvoiceNumber();

  let transaction = existingTransaction;
  if (transaction) {
    transaction.amount = amount;
    transaction.method = method;
    transaction.gateway = gateway;
    transaction.status = 'completed';
    transaction.invoiceNumber = invoiceNumber;
    transaction.customerName = customerName;
    transaction.customerEmail = customerEmail;
    transaction.customerPhone = customerPhone;
    transaction.gatewayReference = paymentReference;
    transaction.gatewayTransactionId = gatewayTransactionId;
    transaction.gatewayMeta = { ...(transaction.gatewayMeta || {}), ...(gatewayMeta || {}) };
    if (method === 'stripe') {
      transaction.stripePaymentIntentId = gatewayTransactionId;
    }
    await transaction.save();
  } else {
    transaction = await Transaction.create({
      booking: booking._id,
      advertiser: advertiserId,
      amount,
      method,
      gateway,
      status: 'completed',
      invoiceNumber,
      customerName,
      customerEmail,
      customerPhone,
      gatewayReference: paymentReference,
      gatewayTransactionId,
      gatewayMeta,
      stripePaymentIntentId: method === 'stripe' ? gatewayTransactionId : '',
    });
  }

  let invoice = existingInvoice;
  if (invoice) {
    invoice.amount = amount;
    invoice.invoiceNumber = invoiceNumber;
    invoice.status = 'paid';
    await invoice.save();
  } else {
    invoice = await Invoice.create({
      invoiceNumber,
      booking: booking._id,
      advertiser: advertiserId,
      amount,
      status: 'paid',
    });
  }

  return { transaction, invoice };
};

const upsertPendingManualTransaction = async ({
  booking,
  advertiserId,
  amount,
  method,
  paymentReference = '',
  gatewayTransactionId = '',
  gatewayMeta = {},
  customerName = '',
  customerEmail = '',
  customerPhone = '',
}) => {
  const transaction = await Transaction.findOne({ booking: booking._id }).sort({ createdAt: -1 });
  if (transaction && transaction.status !== 'completed') {
    transaction.amount = amount;
    transaction.method = method;
    transaction.gateway = 'manual';
    transaction.status = 'pending';
    transaction.customerName = customerName;
    transaction.customerEmail = customerEmail;
    transaction.customerPhone = customerPhone;
    transaction.gatewayReference = paymentReference;
    transaction.gatewayTransactionId = gatewayTransactionId || paymentReference;
    transaction.gatewayMeta = { ...(transaction.gatewayMeta || {}), ...(gatewayMeta || {}) };
    await transaction.save();
    return transaction;
  }

  return Transaction.create({
    booking: booking._id,
    advertiser: advertiserId,
    amount,
    method,
    gateway: 'manual',
    status: 'pending',
    invoiceNumber: createInvoiceNumber(),
    customerName,
    customerEmail,
    customerPhone,
    gatewayReference: paymentReference,
    gatewayTransactionId: gatewayTransactionId || paymentReference,
    gatewayMeta,
  });
};

function formatRelativeTime(date) {
  const diff = Math.floor((new Date() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

// ---------- Dashboard ----------
export const getDashboardStats = async (req, res) => {
  await expireStaleManualPaymentBookings();
  const advertiserId = getAdvertiserId(req);
  const totalAdsRunning = await Ad.countDocuments({ advertiser: advertiserId, approvalStatus: 'approved' });
  const totalAds = await Ad.countDocuments({ advertiser: advertiserId });
  const activeCampaigns = await Booking.countDocuments({ advertiser: advertiserId, status: { $in: ['scheduled', 'active'] } });
  const totalSpend = await Transaction.aggregate([
    { $match: { advertiser: advertiserId, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalImpressions = await Ad.aggregate([
    { $match: { advertiser: advertiserId } },
    { $group: { _id: null, total: { $sum: '$impressions' } } }
  ]);
  const pendingApprovals = await Booking.countDocuments({
    advertiser: advertiserId,
    $or: [
      { status: 'pending' },
      { status: 'approved', paymentStatus: { $in: ['pending', 'submitted', 'failed'] } },
    ],
  });
  const remainingBudget = 50000 - (totalSpend[0]?.total || 0);

  res.json({
    totalAds,
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
  const bookings = await Booking.find({ advertiser: getAdvertiserId(req), status: { $in: ['scheduled', 'active'] } })
    .populate('ad', 'title')
    .populate('billboard', 'name city');
  const placements = bookings.map(b => ({
    ad: b.ad?.title,
    billboard: b.billboard?.name,
    location: b.billboard?.city,
    status: b.status,
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
  
  // Notification loop removed per user request: Ad notifications happen strictly on booking now.
  res.status(201).json(ad);
};

// ---------- Update Ad (edit) - notify only the billboard owner ----------
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
  await expireStaleManualPaymentBookings();
  const { id } = req.params;
  const { date } = req.query;
  const billboard = await Billboard.findById(id);
  if (!billboard) return res.status(404).json({ message: 'Billboard not found' });
  const bookingDate = parseDateOnly(date);
  if (!bookingDate) {
    return res.status(400).json({ message: 'Valid date is required.' });
  }
  const bookedSlotsRaw = await Booking.find({
    billboard: id,
    date: bookingDate,
  });

  const activeBookings = bookedSlotsRaw.filter((booking) => bookingBlocksAvailability(booking));
  const bookedSlots = activeBookings.map((booking) => booking.timeSlot);
  const occupiedSlots = activeBookings.map((booking) => ({
    bookingId: booking._id,
    timeSlot: booking.timeSlot,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    message: getOccupiedSlotMessage(booking),
  }));

  const requestedDateKey = String(date || '').trim();
  const configuredSlots = (billboard.timeSlots || [])
    .filter((slot) => extractDatePrefixFromSlot(slot) === requestedDateKey)
    .map((slot) => extractTimeRangeFromSlot(slot));

  const availableSlots = configuredSlots.filter(
    (slot) => !bookedSlots.some((bookedSlot) => doSlotsOverlap(slot, bookedSlot))
  );

  let statusMessage = 'Select one of the free windows below.';
  if (!configuredSlots.length) {
    statusMessage = 'No billboard availability has been configured for this date yet.';
  } else if (!availableSlots.length && occupiedSlots.length) {
    statusMessage = 'Currently an ad is already running or reserved there. This billboard is not available for the selected date.';
  } else if (!availableSlots.length) {
    statusMessage = 'No free windows were found for this date.';
  }

  res.json({
    configuredSlots,
    availableSlots,
    bookedSlots,
    occupiedSlots,
    statusMessage,
    isFullyBooked: Boolean(configuredSlots.length && !availableSlots.length && occupiedSlots.length),
    pricePerHour: billboard.pricePerHour,
    pricePerMinute: Number(billboard.pricePerMinute ?? billboard.pricePerHour ?? 0),
  });
};

// ---------- Booking Creation (notify only billboard owner) ----------
export const createBooking = async (req, res) => {
  await expireStaleManualPaymentBookings();
  const {
    adId,
    billboardId,
    date,
    timeSlot,
    totalPrice,
    customerName = '',
    customerEmail = '',
    customerPhone = '',
  } = req.body;

  if (!billboardId || !date || !timeSlot || !totalPrice) {
    return res.status(400).json({ message: 'billboardId, date, timeSlot, and totalPrice are required.' });
  }

  if (!adId) {
    return res.status(400).json({ message: 'Please select an uploaded ad before sending the booking request.' });
  }

  const advertiser = await User.findById(req.user._id).select('name email phone');
  const ad = await Ad.findOne({ _id: adId, advertiser: req.user._id });
  if (!ad) {
    return res.status(404).json({ message: 'Ad not found or not owned by you.' });
  }
  if (ad.approvalStatus === 'rejected') {
    return res.status(400).json({ message: 'This ad was rejected earlier. Please upload or choose another ad.' });
  }

  const billboard = await Billboard.findById(billboardId);
  if (!billboard) {
    return res.status(404).json({ message: 'Billboard not found.' });
  }

  const bookingDate = parseDateOnly(date);
  if (!bookingDate) {
    return res.status(400).json({ message: 'A valid booking date is required.' });
  }

  const existingBookings = await Booking.find({
    billboard: billboardId,
    date: bookingDate,
  });
  const overlappingBooking = existingBookings.find(
    (booking) => bookingBlocksAvailability(booking) && doSlotsOverlap(booking.timeSlot, timeSlot)
  );
  if (overlappingBooking) return res.status(409).json({ message: 'Slot already booked' });

  const [startTime = '', endTime = ''] = String(timeSlot || '')
    .split('-')
    .map((value) => value.trim());
  const pricing = calculateBookingAmount({ billboard, startTime, endTime });
  const submittedAmount = Number(totalPrice) || 0;

  if (Math.abs(pricing.totalPrice - submittedAmount) > 0.01) {
    return res.status(400).json({
      message: `Pricing mismatch detected. Expected PKR ${pricing.totalPrice.toFixed(2)} for this slot.`,
    });
  }

  const booking = await Booking.create({
    advertiser: req.user._id,
    ad: adId,
    billboard: billboardId,
    date: bookingDate,
    timeSlot,
    durationMinutes: pricing.durationMinutes,
    ratePerMinute: pricing.ratePerMinute,
    totalPrice,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'bank_transfer',
    customerName: customerName || advertiser?.name || '',
    customerEmail: customerEmail || advertiser?.email || '',
    customerPhone: customerPhone || advertiser?.phone || '',
    paymentGateway: 'manual',
    checkoutExpiresAt: null,
  });

  if (billboard && billboard.createdBy) {
    await Notification.create({
      user: billboard.createdBy,
      title: 'New Booking Request',
      message: `${advertiser?.name || 'An advertiser'} requested ${billboard.name} for ${bookingDate.toLocaleDateString()} at ${timeSlot}. Review the request before payment is collected.`,
      type: 'booking',
      relatedId: booking._id,
    });
  }
  res.status(201).json({
    booking,
    message: 'Booking request created. Your admin will review it before you proceed to payment.',
  });
};

// ---------- Stripe Payment (kept for reference) ----------
export const createPaymentIntent = async (req, res) => {
  res.status(410).json({
    message: 'Direct gateway checkout has been retired for this project. Use the manual payment proof flow from My Bookings.',
  });
};

export const submitManualPayment = async (req, res) => {
  const {
    bookingId,
    paymentMethod = 'bank_transfer',
    transactionId = '',
    senderAccount = '',
    notes = '',
  } = req.body;

  try {
    await expireStaleManualPaymentBookings();
    const booking = await Booking.findById(bookingId).populate('billboard', 'name createdBy');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.advertiser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (booking.status !== 'approved') {
      return res.status(400).json({ message: 'This booking is not ready for payment yet. Wait for admin approval first.' });
    }
    if (booking.paymentStatus === 'paid' || booking.status === 'scheduled' || booking.status === 'active') {
      return res.status(400).json({ message: 'Payment has already been completed for this booking.' });
    }
    if (isManualPaymentExpired(booking)) {
      return res.status(400).json({
        message: 'The payment time for this booking has expired. Please create the booking again.',
      });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload the payment screenshot before submitting.' });
    }

    const normalizedMethod = normalizeManualPaymentMethod(paymentMethod);
    const customerTransactionId = String(transactionId || '').trim();
    if (!customerTransactionId) {
      return res.status(400).json({
        message: 'Enter the Easypaisa transaction/reference ID from your payment receipt before submitting proof.',
      });
    }

    const issuedPaymentReference =
      String(booking.gatewayMeta?.manualPayment?.paymentReference || booking.gatewayReference || '').trim();
    const paymentReference = issuedPaymentReference || `MANUAL-${Date.now()}`;
    const customer = await User.findById(req.user._id).select('name email phone');
    const proofUrl = `/uploads/payment-proofs/${req.file.filename}`;
    const methodLabel = getManualPaymentMethodLabel(normalizedMethod);
    const submittedAt = new Date();

    booking.paymentStatus = 'submitted';
    booking.status = 'approved';
    booking.paymentMethod = normalizedMethod;
    booking.paymentGateway = 'manual';
    booking.paymentProof = proofUrl;
    booking.gatewayReference = paymentReference;
    booking.gatewayTransactionId = customerTransactionId;
    booking.paymentCapturedAt = null;
    booking.adminReviewNote = 'Payment proof submitted. Waiting for admin verification.';
    booking.gatewayMeta = {
      ...(booking.gatewayMeta || {}),
      manualPayment: {
        ...(booking.gatewayMeta?.manualPayment || {}),
        senderAccount: String(senderAccount || '').trim(),
        issuedReference: paymentReference,
        paymentReference,
        customerTransactionId,
        notes: String(notes || '').trim(),
        proofUrl,
        submittedAt: submittedAt.toISOString(),
        submittedMethod: normalizedMethod,
      },
    };
    await booking.save();

    const transaction = await upsertPendingManualTransaction({
      booking,
      advertiserId: req.user._id,
      amount: Number(booking.totalPrice) || 0,
      method: normalizedMethod,
      paymentReference,
      gatewayTransactionId: customerTransactionId,
      gatewayMeta: booking.gatewayMeta,
      customerName: booking.customerName || customer?.name || '',
      customerEmail: booking.customerEmail || customer?.email || '',
      customerPhone: booking.customerPhone || customer?.phone || '',
    });

    if (booking.billboard?.createdBy) {
      await Notification.create({
        user: booking.billboard.createdBy,
        title: 'Payment Proof Submitted',
        message: `${customer?.name || 'An advertiser'} uploaded ${methodLabel} payment proof for ${booking.billboard?.name || 'the billboard'}. Review it to confirm the booking.`,
        type: 'payment',
        relatedId: booking._id,
      });
    }

    await Notification.create({
      user: booking.advertiser,
      title: 'Payment Proof Sent',
      message: `Your ${methodLabel} screenshot was uploaded successfully. The admin will verify it before the booking is scheduled.`,
      type: 'payment',
      relatedId: booking._id,
    });

    res.json({
      success: true,
      message: 'Payment proof submitted. The booking will move to scheduled after admin confirmation.',
      booking,
      transaction,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const confirmPayment = async (req, res) => {
  res.status(410).json({
    message: 'Direct gateway confirmation is no longer used. Upload manual payment proof from My Bookings instead.',
  });
};

// ---------- My Bookings ----------
export const getMyBookings = async (req, res) => {
  await expireStaleManualPaymentBookings();
  const bookings = await Booking.find({ advertiser: req.user._id })
    .populate('billboard ad')
    .sort({ createdAt: -1 });
  res.json(bookings);
};

export const displayMyBooking = async (req, res) => {
  try {
    const { pushBookingToDisplay } = await import('./hardwareController.js');
    const result = await pushBookingToDisplay({
      bookingId: req.params.id,
      actorId: req.user._id,
      actorMode: 'advertiser',
      req,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: 'Could not push this booking to the display right now.',
      error: error.message,
    });
  }
};

// ---------- My Ads ----------
export const getMyAds = async (req, res) => {
  const ads = await Ad.find({ advertiser: req.user._id }).sort({ createdAt: -1 });
  res.json(ads);
};

// ---------- Payments & Invoices ----------
export const getPayments = async (req, res) => {
  await expireStaleManualPaymentBookings();
  const transactions = await Transaction.find({ advertiser: req.user._id })
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
