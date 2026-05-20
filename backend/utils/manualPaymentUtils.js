import Booking from '../models/Booking.js';
import Notification from '../models/Notification.js';
import Transaction from '../models/Transaction.js';

export const MANUAL_PAYMENT_METHODS = ['easypaisa', 'jazzcash', 'bank_transfer'];

export const normalizeManualPaymentMethod = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  return MANUAL_PAYMENT_METHODS.includes(normalized) ? normalized : 'bank_transfer';
};

export const getManualPaymentMethodLabel = (value = '') => {
  const normalized = normalizeManualPaymentMethod(value);
  if (normalized === 'easypaisa') return 'Easypaisa';
  if (normalized === 'jazzcash') return 'JazzCash';
  return 'Bank Transfer';
};

export const createManualPaymentReference = (booking = {}) => {
  const bookingPart = String(booking?._id || 'BOOKING').slice(-6).toUpperCase();
  const timePart = Date.now().toString(36).toUpperCase();
  return `CDBMS-${bookingPart}-${timePart}`;
};

export const buildManualPaymentQrPayload = ({ booking = {}, snapshot = {}, reference = '' }) => {
  const amount = Number(booking?.totalPrice || 0).toFixed(2);
  return [
    'CDBMS Easypaisa Payment',
    `Reference: ${reference || booking?.gatewayReference || ''}`,
    `Booking: ${booking?._id || ''}`,
    `Amount: PKR ${amount}`,
    snapshot?.easypaisaNumber ? `Easypaisa: ${snapshot.easypaisaNumber}` : '',
    snapshot?.accountTitle ? `Account title: ${snapshot.accountTitle}` : '',
    snapshot?.merchantLabel ? `Merchant: ${snapshot.merchantLabel}` : '',
  ]
    .filter(Boolean)
    .join('\n');
};

export const sanitizeManualPaymentSnapshot = (adminUser = {}) => {
  const setup = adminUser?.paymentSetup || {};

  return {
    merchantLabel:
      setup.merchantLabel ||
      setup.payfastMerchantLabel ||
      adminUser?.organization ||
      adminUser?.name ||
      'CDBMS Admin',
    accountTitle: setup.settlementAccountTitle || adminUser?.name || '',
    easypaisaNumber: setup.settlementEasypaisaNumber || '',
    jazzCashNumber: setup.settlementJazzCashNumber || '',
    bankName: setup.settlementBankName || '',
    bankIban: setup.settlementBankIban || '',
    instructions:
      setup.settlementInstructions ||
      'Complete the transfer, include the booking reference if Easypaisa lets you add a note, then upload the screenshot before the timer ends.',
  };
};

export const hasManualPaymentDestination = (snapshot = {}) =>
  Boolean(
    snapshot?.easypaisaNumber ||
      snapshot?.jazzCashNumber ||
      snapshot?.bankIban ||
      snapshot?.instructions
  );

export const clampPaymentWindowHours = (value, fallback = 6) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.round(parsed), 1), 168);
};

export const buildPaymentExpiryDate = (hours) =>
  new Date(Date.now() + clampPaymentWindowHours(hours) * 60 * 60 * 1000);

export const isManualPaymentAwaitingReview = (booking) =>
  booking?.status === 'approved' &&
  ['pending', 'submitted', 'failed'].includes(String(booking?.paymentStatus || 'pending'));

export const isManualPaymentExpired = (booking, now = new Date()) =>
  isManualPaymentAwaitingReview(booking) &&
  booking?.checkoutExpiresAt &&
  new Date(booking.checkoutExpiresAt) <= now;

const buildDateLabel = (value) => {
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

export const expireStaleManualPaymentBookings = async () => {
  const now = new Date();
  const expiredBookings = await Booking.find({
    status: 'approved',
    paymentStatus: { $in: ['pending', 'submitted', 'failed'] },
    checkoutExpiresAt: { $ne: null, $lte: now },
  }).populate('billboard', 'name createdBy');

  if (!expiredBookings.length) {
    return [];
  }

  const expiredIds = expiredBookings.map((booking) => booking._id);
  await Transaction.updateMany(
    {
      booking: { $in: expiredIds },
      status: { $in: ['pending', 'requires_action'] },
    },
    {
      $set: {
        status: 'cancelled',
      },
    }
  );

  for (const booking of expiredBookings) {
    booking.status = 'cancelled';
    booking.paymentStatus = 'failed';
    booking.adminReviewNote = 'Payment time expired before admin confirmation. Please create the booking again.';
    booking.checkoutExpiresAt = null;
    booking.gatewayMeta = {
      ...(booking.gatewayMeta || {}),
      manualPayment: {
        ...(booking.gatewayMeta?.manualPayment || {}),
        expiredAt: now.toISOString(),
        expiryReason: 'payment_window_elapsed',
      },
    };
    await booking.save();
  }

  const notifications = [];
  for (const booking of expiredBookings) {
    const billboardName = booking.billboard?.name || 'your billboard booking';
    const dateLabel = buildDateLabel(booking.date);
    notifications.push({
      user: booking.advertiser,
      title: 'Payment Window Expired',
      message: `Your booking for ${billboardName} on ${dateLabel} at ${booking.timeSlot} expired before payment confirmation. Please create a new booking request.`,
      type: 'payment',
      relatedId: booking._id,
    });

    if (booking.billboard?.createdBy) {
      notifications.push({
        user: booking.billboard.createdBy,
        title: 'Booking Auto-Cancelled',
        message: `A payment deadline expired for ${billboardName} on ${dateLabel} at ${booking.timeSlot}. The request was cancelled automatically.`,
        type: 'booking',
        relatedId: booking._id,
      });
    }
  }

  if (notifications.length) {
    await Notification.insertMany(notifications, { ordered: false });
  }

  return expiredBookings;
};
