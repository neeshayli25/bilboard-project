import Billboard from '../models/Billboard.js';
import Ad from '../models/Ad.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Transaction from '../models/Transaction.js';
import Invoice from '../models/Invoice.js';
import Notification from '../models/Notification.js';
import Stripe from 'stripe';
import {
  buildDisplayConfig,
  ensureBillboardDisplayConfig,
  sanitizeDisplayConfigForAdmin,
} from '../utils/displayConfig.js';
import {
  callPayFast,
  getAdminPaymentSetup,
  getClientIp,
  isPayFastSuccess,
  requestPayFastAccessToken,
  validateAdminPayFastConfig,
} from '../utils/payfast.js';
import {
  buildManualPaymentQrPayload,
  buildPaymentExpiryDate,
  clampPaymentWindowHours,
  createManualPaymentReference,
  expireStaleManualPaymentBookings,
  getManualPaymentMethodLabel,
  hasManualPaymentDestination,
  sanitizeManualPaymentSnapshot,
} from '../utils/manualPaymentUtils.js';

const hasUsableStripeSecret = (key = '') =>
  Boolean(key && key.startsWith('sk_') && !key.includes('...') && !key.toLowerCase().includes('stripe dashboard'));
const isDemoPaymentId = (paymentIntentId = '') => String(paymentIntentId).startsWith('demo_pi_');

const stripe = hasUsableStripeSecret(process.env.STRIPE_SECRET_KEY)
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const getConnectedAccountId = () => process.env.STRIPE_CONNECTED_ACCOUNT_ID || '';

const issueBookingRefund = async (booking, adminUser, customerIp) => {
  if (booking.paymentGateway === 'payfast' && booking.gatewayTransactionId) {
    const setup = getAdminPaymentSetup(adminUser);
    const tokenResponse = await requestPayFastAccessToken({ adminUser, customerIp });
    const refund = await callPayFast({
      baseUrl: setup.payfastBaseUrl,
      path: `/transaction/refund/${booking.gatewayTransactionId}`,
      accessToken: tokenResponse.token,
      form: {
        txnamt: Number(booking.totalPrice).toFixed(2),
        refund_reason: 'Booking rejected by admin',
        customer_ip: customerIp,
      },
    });

    if (!isPayFastSuccess(refund) && String(refund?.code ?? '') !== '00') {
      const error = new Error(refund?.message || refund?.status_msg || 'PayFast refund failed.');
      error.payload = refund;
      throw error;
    }

    return refund;
  }

  if (isDemoPaymentId(booking.paymentIntentId)) {
    return { id: `demo_re_${booking._id}_${Date.now()}`, object: 'refund', status: 'succeeded', livemode: false };
  }

  if (!stripe || !booking.paymentIntentId) return null;

  return stripe.refunds.create({
    payment_intent: booking.paymentIntentId,
    metadata: {
      bookingId: booking._id.toString(),
      action: 'booking_rejected',
    },
  });
};

const transferApprovedPayment = async (booking) => {
  if (isDemoPaymentId(booking.paymentIntentId)) {
    return { id: `demo_tr_${booking._id}_${Date.now()}`, object: 'transfer', status: 'paid', livemode: false };
  }

  const connectedAccountId = getConnectedAccountId();
  if (!stripe || !booking.paymentIntentId || !connectedAccountId) return null;

  const paymentIntent = await stripe.paymentIntents.retrieve(booking.paymentIntentId);
  if (!paymentIntent.latest_charge) return null;

  return stripe.transfers.create({
    amount: Math.round((Number(booking.totalPrice) || 0) * 100),
    currency: paymentIntent.currency || 'usd',
    destination: connectedAccountId,
    source_transaction: paymentIntent.latest_charge,
    transfer_group: `booking_${booking._id}`,
    metadata: {
      bookingId: booking._id.toString(),
      billboardId: booking.billboard?._id?.toString?.() || booking.billboard.toString(),
    },
  });
};

const sanitizePaymentSetup = (setup = {}) => ({
  manualPaymentEnabled: Boolean(setup.manualPaymentEnabled),
  merchantLabel: setup.merchantLabel || setup.payfastMerchantLabel || '',
  payfastEnabled: Boolean(setup.payfastEnabled),
  payfastMerchantLabel: setup.payfastMerchantLabel || '',
  payfastBaseUrl: setup.payfastBaseUrl || '',
  payfastMerchantId: setup.payfastMerchantId || '',
  payfastSecuredKey: setup.payfastSecuredKey || '',
  payfastHashKey: setup.payfastHashKey || '',
  payfastMerchantCategoryCode: setup.payfastMerchantCategoryCode || '',
  easypaisaEnabled: Boolean(setup.easypaisaEnabled),
  bankCardEnabled: Boolean(setup.bankCardEnabled),
  payfastEasypaisaBankCode: setup.payfastEasypaisaBankCode || '',
  payfastEasypaisaInstrumentId: setup.payfastEasypaisaInstrumentId || '',
  payfastCardBankCode: setup.payfastCardBankCode || '',
  payfastCardInstrumentId: setup.payfastCardInstrumentId || '',
  payfastJazzCashBankCode: setup.payfastJazzCashBankCode || '',
  payfastJazzCashInstrumentId: setup.payfastJazzCashInstrumentId || '',
  settlementAccountTitle: setup.settlementAccountTitle || '',
  settlementEasypaisaNumber: setup.settlementEasypaisaNumber || '',
  settlementJazzCashNumber: setup.settlementJazzCashNumber || '',
  settlementBankName: setup.settlementBankName || '',
  settlementBankIban: setup.settlementBankIban || '',
  settlementInstructions: setup.settlementInstructions || '',
});

const createInvoiceNumber = () => `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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

const buildBookingDateLabel = (value) => {
  try {
    return new Date(value).toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'the selected date';
  }
};

// ---------- Billboard CRUD ----------
export const getBillboards = async (req, res) => {
  const billboards = await Billboard.find({ createdBy: req.user._id });
  await Promise.all(billboards.map((billboard) => ensureBillboardDisplayConfig(billboard)));
  res.json(
    billboards.map((billboard) => ({
      ...billboard.toObject(),
      displayConfig: sanitizeDisplayConfigForAdmin(billboard.displayConfig),
    }))
  );
};

export const createBillboard = async (req, res) => {
  const data = { ...req.body, createdBy: req.user._id };
  if (req.file) {
    data.imageUrl = req.file.storageUrl || `/uploads/billboards/${req.file.filename}`;
  }

  if (data.pricePerHour && !data.pricePerMinute) {
    data.pricePerMinute = data.pricePerHour;
  }
  
  // if timeSlots is stringified (FormData), parse it
  if (data.timeSlots && typeof data.timeSlots === 'string') {
    try { data.timeSlots = JSON.parse(data.timeSlots); } catch (e) {}
  }

  data.displayConfig = buildDisplayConfig(data.displayConfig || {});

  const billboard = await Billboard.create(data);
  res.status(201).json({
    ...billboard.toObject(),
    displayConfig: sanitizeDisplayConfigForAdmin(billboard.displayConfig),
  });
};

export const updateBillboard = async (req, res) => {
  const billboard = await Billboard.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!billboard) return res.status(404).json({ message: 'Billboard not found or not owned by you' });
  
  const data = { ...req.body };
  if (req.file) {
    data.imageUrl = req.file.storageUrl || `/uploads/billboards/${req.file.filename}`;
  }

  if (data.pricePerHour && !data.pricePerMinute) {
    data.pricePerMinute = data.pricePerHour;
  }

  // parse timeSlots if stringified
  if (data.timeSlots && typeof data.timeSlots === 'string') {
    try { data.timeSlots = JSON.parse(data.timeSlots); } catch (e) {}
  }

  data.displayConfig = buildDisplayConfig({
    ...(billboard.displayConfig?.toObject ? billboard.displayConfig.toObject() : billboard.displayConfig || {}),
    ...(data.displayConfig || {}),
  });

  const updated = await Billboard.findByIdAndUpdate(req.params.id, data, { new: true });
  res.json({
    ...updated.toObject(),
    displayConfig: sanitizeDisplayConfigForAdmin(updated.displayConfig),
  });
};

export const deleteBillboard = async (req, res) => {
  const billboard = await Billboard.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!billboard) return res.status(404).json({ message: 'Billboard not found or not owned by you' });
  await Billboard.findByIdAndDelete(req.params.id);
  res.json({ message: 'Billboard deleted' });
};

// ---------- Ad Approvals ----------
export const getAllAds = async (req, res) => {
  const ads = await Ad.find().populate('advertiser', 'name email').sort({ createdAt: -1 });
  res.json(ads);
};

export const deleteAd = async (req, res) => {
  await Ad.findByIdAndDelete(req.params.id);
  res.json({ message: 'Ad deleted' });
};

export const getPendingAds = async (req, res) => {
  const ads = await Ad.find({ approvalStatus: 'pending' }).populate('advertiser', 'name email');
  res.json(ads);
};

export const approveAd = async (req, res) => {
  const ad = await Ad.findByIdAndUpdate(req.params.id, { approvalStatus: 'approved' }, { new: true });
  await Notification.create({ user: ad.advertiser, title: 'Ad Approved', message: `Your ad "${ad.title}" has been approved.` });
  res.json(ad);
};

export const rejectAd = async (req, res) => {
  const ad = await Ad.findByIdAndUpdate(req.params.id, { approvalStatus: 'rejected' }, { new: true });
  await Notification.create({ user: ad.advertiser, title: 'Ad Rejected', message: `Your ad "${ad.title}" was rejected. Please modify and resubmit.` });
  res.json(ad);
};

// ---------- Dashboard Stats ----------
export const getDashboardStats = async (req, res) => {
  await expireStaleManualPaymentBookings();
  const totalBillboards = await Billboard.countDocuments({ createdBy: req.user._id });
  const totalAds = await Ad.countDocuments();
  const pendingApprovals = await Ad.countDocuments({ approvalStatus: 'pending' });
  const totalUsers = await User.countDocuments();
  const adminBillboards = await Billboard.find({ createdBy: req.user._id }).select('_id');
  const billboardIds = adminBillboards.map((billboard) => billboard._id);
  const pendingBookings = await Booking.countDocuments({
    billboard: { $in: billboardIds },
    $or: [
      { status: 'pending' },
      { status: 'approved', paymentStatus: { $in: ['pending', 'submitted', 'failed'] } },
    ],
  });
  res.json({ totalBillboards, totalAds, pendingApprovals, totalUsers, pendingBookings });
};

export const getRevenueTrend = async (req, res) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const revenue = await Transaction.aggregate([
    { $match: { status: 'completed', createdAt: { $gte: sixMonthsAgo } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$amount' } } },
    { $sort: { _id: 1 } }
  ]);
  res.json(revenue.map(r => ({ month: r._id, revenue: r.revenue })));
};

// ---------- Reports ----------
export const getRevenueReport = async (req, res) => {
  const { startDate, endDate } = req.query;
  const match = { status: 'completed' };
  if (startDate && endDate) match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  const result = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, amount: { $sum: '$amount' }, bookings: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  res.json(result.map(r => ({ month: r._id, amount: r.amount, bookings: r.bookings })));
};

export const getCampaignReport = async (req, res) => {
  const campaigns = await Ad.aggregate([
    { $group: { _id: '$title', advertiser: { $first: '$advertiser' }, impressions: { $sum: '$impressions' }, spend: { $sum: '$budget' } } },
    { $sort: { impressions: -1 } },
    { $limit: 10 }
  ]);
  res.json(campaigns);
};

export const getBookingReport = async (req, res) => {
  const bookings = await Booking.find().populate('advertiser', 'name');
  res.json(bookings.map(b => ({
    id: b._id,
    advertiser: b.advertiser?.name,
    billboards: 1,
    startDate: b.date,
    endDate: b.endDate,
    value: b.totalPrice
  })));
};

export const getBillboardPerformance = async (req, res) => {
  const billboards = await Billboard.aggregate([
    { $lookup: { from: 'bookings', localField: '_id', foreignField: 'billboard', as: 'bookings' } },
    { $project: { name: 1, location: '$city', plays: { $size: '$bookings' }, revenue: { $sum: '$bookings.totalPrice' } } }
  ]);
  res.json(billboards);
};

// ---------- Bookings ----------
export const getBookings = async (req, res) => {
  await expireStaleManualPaymentBookings();
  const adminBillboards = await Billboard.find({ createdBy: req.user._id }).select('_id');
  const billboardIds = adminBillboards.map(b => b._id);
  const bookings = await Booking.find({ billboard: { $in: billboardIds } })
    .populate('billboard', 'name city location pricePerHour imageUrl size resolution type status displayConfig')
    .populate('ad', 'title description mediaUrl mediaType duration approvalStatus')
    .populate('advertiser', 'name email phone organization')
    .sort({ createdAt: -1 });
  res.json(bookings);
};

export const getPendingBookings = async (req, res) => {
  await expireStaleManualPaymentBookings();
  const adminBillboards = await Billboard.find({ createdBy: req.user._id }).select('_id');
  const billboardIds = adminBillboards.map(b => b._id);
  const bookings = await Booking.find({
    billboard: { $in: billboardIds },
    status: 'pending',
  })
    .populate('billboard', 'name city location')
    .populate('advertiser', 'name email phone')
    .sort({ createdAt: -1 });
  res.json(bookings);
};

export const updateBookingStatus = async (req, res) => {
  await expireStaleManualPaymentBookings();
  const { status } = req.body;
  const booking = await Booking.findById(req.params.id).populate('billboard');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.billboard.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  const allowedStatuses = ['pending', 'paid', 'approved', 'scheduled', 'active', 'rejected', 'completed', 'cancelled'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid booking status' });
  }
  if ((status === 'scheduled' || status === 'active') && booking.paymentStatus !== 'paid') {
    return res.status(400).json({
      message: 'Only paid bookings can be moved into scheduled or active status.',
    });
  }
  booking.status = status;
  if (status === 'scheduled' || status === 'active') {
    booking.paymentStatus = 'paid';
  }
  if (status === 'approved') {
    booking.paymentStatus = 'pending';
  }
  if (status === 'rejected') {
    booking.paymentStatus = booking.paymentStatus === 'paid' ? 'refunded' : 'pending';
  }
  await booking.save();
  await Notification.create({ user: booking.advertiser, title: 'Booking Updated', message: `Your booking ${booking._id} status changed to ${status}.` });
  res.json(booking);
};

export const approveBooking = async (req, res) => {
  await expireStaleManualPaymentBookings();
  const { paymentWindowHours = 6, note = '' } = req.body || {};
  const booking = await Booking.findById(req.params.id).populate('billboard');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.billboard.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  if (booking.status !== 'pending') {
    return res.status(400).json({ message: 'Only pending booking requests can be approved.' });
  }

  const paymentSnapshot = sanitizeManualPaymentSnapshot(req.user);
  if (!hasManualPaymentDestination(paymentSnapshot)) {
    return res.status(400).json({
      message: 'Add your EasyPaisa, JazzCash, or bank settlement details in Admin Payment Settings before approving bookings.',
    });
  }

  const hours = clampPaymentWindowHours(paymentWindowHours);
  const expiresAt = buildPaymentExpiryDate(hours);
  const approvedAt = new Date();
  const paymentReference = createManualPaymentReference(booking);
  const qrPayload = buildManualPaymentQrPayload({
    booking,
    snapshot: paymentSnapshot,
    reference: paymentReference,
  });

  booking.status = 'approved';
  booking.paymentStatus = 'pending';
  booking.paymentGateway = 'manual';
  booking.paymentMethod = paymentSnapshot.easypaisaNumber
    ? 'easypaisa'
    : paymentSnapshot.jazzCashNumber
    ? 'jazzcash'
    : 'bank_transfer';
  booking.checkoutExpiresAt = expiresAt;
  booking.paymentCapturedAt = null;
  booking.paymentProof = '';
  booking.gatewayReference = paymentReference;
  booking.gatewayTransactionId = '';
  booking.adminReviewNote =
    String(note || '').trim() ||
    `Approved by admin. Pay within ${hours} hour${hours === 1 ? '' : 's'} using reference ${paymentReference}, then upload the screenshot to confirm the slot.`;
  booking.gatewayMeta = {
    ...(booking.gatewayMeta || {}),
    manualPayment: {
      ...(booking.gatewayMeta?.manualPayment || {}),
      approvedAt: approvedAt.toISOString(),
      approvedBy: req.user._id.toString(),
      paymentWindowHours: hours,
      paymentReference,
      qrPayload,
      instructions: paymentSnapshot,
      lastAction: 'approved',
    },
  };
  await booking.save();
  if (booking.ad) {
    await Ad.findByIdAndUpdate(booking.ad, { approvalStatus: 'approved' });
  }
  await Notification.create({
    user: booking.advertiser,
    title: 'Booking Approved - Pay to Confirm',
    message: `Your booking for ${booking.billboard?.name || 'the billboard'} on ${buildBookingDateLabel(booking.date)} at ${booking.timeSlot} was approved. Pay within ${hours} hour${hours === 1 ? '' : 's'} using reference ${paymentReference}, then upload the screenshot from My Bookings to confirm the slot.`,
    type: 'payment',
    relatedId: booking._id,
  });
  res.json({
    booking,
    message: `Booking approved. The advertiser now has ${hours} hour${hours === 1 ? '' : 's'} to submit payment proof.`,
  });
};

export const rejectBooking = async (req, res) => {
  await expireStaleManualPaymentBookings();
  const { note = '' } = req.body || {};
  const booking = await Booking.findById(req.params.id).populate('billboard');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.billboard.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  if (booking.status === 'scheduled' || booking.status === 'active') {
    return res.status(400).json({ message: 'Scheduled bookings can no longer be rejected from the review queue.' });
  }

  const transaction = await Transaction.findOne({ booking: booking._id }).sort({ createdAt: -1 });
  if (booking.paymentStatus === 'paid' || transaction?.status === 'completed') {
    return res.status(400).json({
      message: 'This booking already has a confirmed payment. Move it from the scheduled flow instead of rejecting it here.',
    });
  }

  if (transaction) {
    transaction.status = 'cancelled';
    transaction.gatewayMeta = {
      ...(transaction.gatewayMeta || {}),
      rejectedAt: new Date().toISOString(),
      rejectionNote: String(note || '').trim(),
    };
    await transaction.save();
  }

  booking.status = 'rejected';
  booking.paymentStatus = booking.paymentStatus === 'submitted' ? 'failed' : 'pending';
  booking.checkoutExpiresAt = null;
  booking.adminReviewNote = String(note || '').trim() || 'Rejected by admin before scheduling.';
  booking.gatewayMeta = {
    ...(booking.gatewayMeta || {}),
    manualPayment: {
      ...(booking.gatewayMeta?.manualPayment || {}),
      rejectedAt: new Date().toISOString(),
      rejectedBy: req.user._id.toString(),
      rejectionNote: String(note || '').trim(),
      lastAction: 'rejected',
    },
  };
  await booking.save();
  await Notification.create({
    user: booking.advertiser,
    title: 'Booking Rejected',
    message: booking.paymentStatus === 'failed'
      ? `Your booking for ${buildBookingDateLabel(booking.date)} at ${booking.timeSlot} was rejected after payment proof review. ${String(note || '').trim() || 'Please create a new request if you still need the slot.'}`
      : `Your booking for ${buildBookingDateLabel(booking.date)} at ${booking.timeSlot} was rejected by the admin. No payment is required for this request.`,
    type: booking.paymentStatus === 'failed' ? 'payment' : 'booking',
    relatedId: booking._id,
  });
  res.json({
    booking,
    refundCreated: false,
    refundId: '',
    refundMode: 'manual',
  });
};

export const confirmBookingPayment = async (req, res) => {
  await expireStaleManualPaymentBookings();
  const { note = '' } = req.body || {};
  const booking = await Booking.findById(req.params.id)
    .populate('billboard', 'name city location createdBy')
    .populate('advertiser', 'name email phone');

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }
  if (String(booking.billboard?.createdBy) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  if (booking.status !== 'approved' || booking.paymentStatus !== 'submitted') {
    return res.status(400).json({
      message: 'Only bookings with submitted payment proof can be confirmed.',
    });
  }

  const confirmedAt = new Date();
  booking.status = 'scheduled';
  booking.paymentStatus = 'paid';
  booking.paymentCapturedAt = confirmedAt;
  booking.checkoutExpiresAt = null;
  booking.adminReviewNote =
    String(note || '').trim() || 'Payment verified by admin. Booking scheduled successfully.';
  booking.gatewayMeta = {
    ...(booking.gatewayMeta || {}),
    manualPayment: {
      ...(booking.gatewayMeta?.manualPayment || {}),
      confirmedAt: confirmedAt.toISOString(),
      confirmedBy: req.user._id.toString(),
      confirmationNote: String(note || '').trim(),
      lastAction: 'confirmed',
    },
  };
  await booking.save();

  const { transaction } = await upsertBillingRecords({
    booking,
    advertiserId: booking.advertiser?._id || booking.advertiser,
    amount: Number(booking.totalPrice) || 0,
    method: booking.paymentMethod || 'bank_transfer',
    gateway: 'manual',
    paymentReference: booking.gatewayReference || booking.gatewayTransactionId || `MANUAL-${Date.now()}`,
    gatewayTransactionId: booking.gatewayTransactionId || booking.gatewayReference || `MANUAL-${Date.now()}`,
    gatewayMeta: booking.gatewayMeta,
    customerName: booking.customerName || booking.advertiser?.name || '',
    customerEmail: booking.customerEmail || booking.advertiser?.email || '',
    customerPhone: booking.customerPhone || booking.advertiser?.phone || '',
  });

  await Notification.create({
    user: booking.advertiser?._id || booking.advertiser,
    title: 'Payment Confirmed - Booking Scheduled',
    message: `Your ${getManualPaymentMethodLabel(booking.paymentMethod)} payment for ${booking.billboard?.name || 'the billboard'} has been verified. The booking is now scheduled.`,
    type: 'payment',
    relatedId: booking._id,
  });

  res.json({
    booking,
    transaction,
    message: 'Payment confirmed and the booking moved to the scheduled section.',
  });
};

export const rejectBookingPayment = async (req, res) => {
  await expireStaleManualPaymentBookings();
  const { note = '' } = req.body || {};
  const booking = await Booking.findById(req.params.id)
    .populate('billboard', 'name city location createdBy')
    .populate('advertiser', 'name email phone');

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }
  if (String(booking.billboard?.createdBy) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  if (booking.status !== 'approved' || booking.paymentStatus !== 'submitted') {
    return res.status(400).json({
      message: 'Only submitted payment proofs can be rejected from this screen.',
    });
  }

  const transaction = await Transaction.findOne({ booking: booking._id }).sort({ createdAt: -1 });
  if (transaction && transaction.status !== 'completed') {
    transaction.status = 'failed';
    transaction.gatewayMeta = {
      ...(transaction.gatewayMeta || {}),
      reviewRejectedAt: new Date().toISOString(),
      reviewRejectionNote: String(note || '').trim(),
    };
    await transaction.save();
  }

  const previousProof = booking.paymentProof;
  const previousReference = booking.gatewayReference;
  booking.paymentStatus = 'pending';
  booking.paymentProof = '';
  booking.gatewayReference = '';
  booking.gatewayTransactionId = '';
  booking.adminReviewNote =
    String(note || '').trim() ||
    'Payment proof was rejected. Upload a new screenshot before the timer ends.';
  booking.gatewayMeta = {
    ...(booking.gatewayMeta || {}),
    manualPayment: {
      ...(booking.gatewayMeta?.manualPayment || {}),
      rejectedAt: new Date().toISOString(),
      rejectedBy: req.user._id.toString(),
      rejectionNote: String(note || '').trim(),
      lastRejectedProof: previousProof,
      lastRejectedReference: previousReference,
      lastAction: 'proof_rejected',
    },
  };
  await booking.save();

  await Notification.create({
    user: booking.advertiser?._id || booking.advertiser,
    title: 'Payment Proof Rejected',
    message: `Your payment screenshot for ${booking.billboard?.name || 'the billboard'} was rejected. ${String(note || '').trim() || 'Upload a clearer or correct proof before the timer ends.'}`,
    type: 'payment',
    relatedId: booking._id,
  });

  res.json({
    booking,
    message: 'Payment proof rejected. The advertiser can upload a new screenshot before the timer ends.',
  });
};

// ---------- Transactions ----------
export const getTransactions = async (req, res) => {
  await expireStaleManualPaymentBookings();
  const adminBillboards = await Billboard.find({ createdBy: req.user._id }).select('_id');
  const billboardIds = adminBillboards.map(b => b._id);
  const bookings = await Booking.find({ billboard: { $in: billboardIds } }).select('_id');
  const bookingIds = bookings.map(b => b._id);
  const transactions = await Transaction.find({ booking: { $in: bookingIds } })
    .populate('advertiser', 'name email phone')
    .populate({
      path: 'booking',
      populate: [
        { path: 'billboard', select: 'name city location' },
        { path: 'ad', select: 'title mediaUrl mediaType' },
      ],
    })
    .sort({ createdAt: -1 });
  res.json(transactions);
};

export const updateTransactionStatus = async (req, res) => {
  const { status } = req.body;
  const transaction = await Transaction.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.json(transaction);
};

// ---------- User Management ----------
export const getUsers = async (req, res) => {
  const users = await User.find().select('-password').lean();
  const advertiserIds = users
    .filter((user) => user.role === 'advertiser')
    .map((user) => user._id);

  const [ads, bookings, transactions] = await Promise.all([
    Ad.find({ advertiser: { $in: advertiserIds } })
      .select('advertiser title approvalStatus mediaUrl mediaType createdAt')
      .sort({ createdAt: -1 })
      .lean(),
    Booking.find({ advertiser: { $in: advertiserIds } })
      .select('advertiser status paymentStatus totalPrice createdAt')
      .sort({ createdAt: -1 })
      .lean(),
    Transaction.find({ advertiser: { $in: advertiserIds } })
      .select('advertiser amount status method invoiceNumber createdAt')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const adMap = new Map();
  const bookingMap = new Map();
  const transactionMap = new Map();

  ads.forEach((ad) => {
    const key = String(ad.advertiser);
    if (!adMap.has(key)) adMap.set(key, []);
    adMap.get(key).push(ad);
  });

  bookings.forEach((booking) => {
    const key = String(booking.advertiser);
    if (!bookingMap.has(key)) bookingMap.set(key, []);
    bookingMap.get(key).push(booking);
  });

  transactions.forEach((transaction) => {
    const key = String(transaction.advertiser);
    if (!transactionMap.has(key)) transactionMap.set(key, []);
    transactionMap.get(key).push(transaction);
  });

  const enrichedUsers = users.map((user) => {
    const key = String(user._id);
    const userAds = adMap.get(key) || [];
    const userBookings = bookingMap.get(key) || [];
    const userTransactions = transactionMap.get(key) || [];
    const completedTransactions = userTransactions.filter((transaction) => transaction.status === 'completed');

    return {
      ...user,
      adCount: userAds.length,
      bookingCount: userBookings.length,
      scheduledCount: userBookings.filter((booking) => ['scheduled', 'active', 'completed'].includes(booking.status)).length,
      paidCount: completedTransactions.length,
      totalSpent: completedTransactions.reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0),
      ads: userAds.slice(0, 3),
      bookings: userBookings.slice(0, 5),
      payments: userTransactions.slice(0, 3).map((transaction) => ({
        ...transaction,
        description: transaction.invoiceNumber || 'Booking payment',
      })),
    };
  });

  res.json(enrichedUsers);
};

export const deactivateUser = async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ message: 'User deactivated' });
};

export const activateUser = async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isActive: true });
  res.json({ message: 'User activated' });
};

export const updateUserRole = async (req, res) => {
  const { role } = req.body;
  await User.findByIdAndUpdate(req.params.id, { role });
  res.json({ message: 'Role updated' });
};

export const getPaymentSettings = async (req, res) => {
  const adminUser = await User.findById(req.user._id).select('paymentSetup name organization');
  res.json(sanitizePaymentSetup(adminUser?.paymentSetup || {}));
};

export const updatePaymentSettings = async (req, res) => {
  const adminUser = await User.findById(req.user._id);
  if (!adminUser) {
    return res.status(404).json({ message: 'Admin user not found.' });
  }

  adminUser.paymentSetup = {
    ...sanitizePaymentSetup(adminUser.paymentSetup || {}),
    ...sanitizePaymentSetup(req.body || {}),
  };

  await adminUser.save();
  res.json({
    message: 'Payment settings updated successfully.',
    paymentSetup: sanitizePaymentSetup(adminUser.paymentSetup),
  });
};

// ---------- Notifications ----------
export const getNotifications = async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort('-createdAt');
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

export const clearAllNotifications = async (req, res) => {
  await Notification.deleteMany({ user: req.user._id });
  res.json({ message: 'All notifications cleared' });
};
