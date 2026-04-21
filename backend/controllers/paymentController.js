import Ad from '../models/Ad.js';
import Billboard from '../models/Billboard.js';
import Booking from '../models/Booking.js';
import Invoice from '../models/Invoice.js';
import Notification from '../models/Notification.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import {
  buildPayFastHash,
  callPayFast,
  fetchPayFast,
  getClientIp,
  getPayFastMethodConfig,
  getVisiblePayFastSetup,
  isPayFastPending,
  isPayFastSuccess,
  maskAccountNumber,
  requestPayFastAccessToken,
  validateAdminPayFastConfig,
} from '../utils/payfast.js';
import {
  buildTimeSlotLabel,
  bookingBlocksAvailability,
  calculateBookingAmount,
  doSlotsOverlap,
  extractDatePrefixFromSlot,
  extractTimeRangeFromSlot,
  parseDateOnly,
  slotContainsRange,
} from '../utils/bookingUtils.js';

const CHECKOUT_HOLD_MINUTES = 15;
const PAKISTAN_MOBILE_REGEX = /^03\d{9}$/;
const CNIC_REGEX = /^\d{13}$/;
const CARD_NUMBER_REGEX = /^\d{13,19}$/;
const CVV_REGEX = /^\d{3,4}$/;
const PAYFAST_OTP_CODES = new Set(['801', '803', '804']);
const PAYFAST_ISSUER_MANAGED_OTP_CODE = '850';
const PAYFAST_INVALID_OTP_CODES = new Set(['55', '806', '807']);

const createInvoiceNumber = () => `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const cleanValue = (value) => String(value || '').trim();
const getAdvertiser = async (req) => User.findById(req.user._id).select('name email phone role isEmailVerified');
const isValidPakistaniMobile = (value = '') => PAKISTAN_MOBILE_REGEX.test(cleanValue(value));
const getCheckoutExpiry = () => new Date(Date.now() + CHECKOUT_HOLD_MINUTES * 60 * 1000);

const hasCorePayFastConfig = (setup = {}) =>
  Boolean(
    setup.payfastEnabled &&
      cleanValue(setup.payfastBaseUrl) &&
      cleanValue(setup.payfastMerchantId) &&
      cleanValue(setup.payfastSecuredKey) &&
      cleanValue(setup.payfastHashKey) &&
      cleanValue(setup.payfastMerchantCategoryCode)
  );

const ensureAdvertiserRole = async (req, res) => {
  const advertiser = await getAdvertiser(req);
  if (!advertiser || advertiser.role !== 'advertiser') {
    res.status(403).json({ message: 'Only advertisers can use checkout.' });
    return null;
  }
  if (!advertiser.isEmailVerified) {
    res.status(403).json({ message: 'Verify your email before creating or paying for a booking.' });
    return null;
  }
  return advertiser;
};

const validateCheckoutContact = ({ customerName, customerPhone }) => {
  if (!cleanValue(customerName) || cleanValue(customerName).length < 2) {
    return 'Enter the advertiser name exactly as it should appear on the booking.';
  }
  if (!isValidPakistaniMobile(customerPhone)) {
    return 'Enter a valid Pakistani mobile number in the format 03xxxxxxxxx.';
  }
  return '';
};

const normalizeUrlOrigin = (value = '') => {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
};

const getFrontendOrigin = (req) =>
  normalizeUrlOrigin(req.headers['x-client-origin']) ||
  normalizeUrlOrigin(process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL) ||
  'http://localhost:5173';

const formatPayFastOrderDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const normalizeLocalMobile = (value = '') => {
  const digits = cleanValue(value).replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 11) return digits;
  if (digits.startsWith('92') && digits.length === 12) return `0${digits.slice(2)}`;
  return '';
};

const formatPayFastCustomerMobile = (value = '') => {
  const localMobile = normalizeLocalMobile(value);
  return localMobile ? `92-${localMobile.slice(1)}` : '';
};

const normalizeCnic = (value = '') => cleanValue(value).replace(/\D/g, '');
const maskCnic = (value = '') => {
  const digits = normalizeCnic(value);
  if (!digits) return '';
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

const normalizeCardNumber = (value = '') => cleanValue(value).replace(/\D/g, '');
const normalizeExpiryMonth = (value = '') => {
  const digits = cleanValue(value).replace(/\D/g, '').slice(0, 2);
  if (!digits) return '';
  const month = Number(digits);
  if (!Number.isInteger(month) || month < 1 || month > 12) return '';
  return String(month).padStart(2, '0');
};
const normalizeExpiryYear = (value = '') => {
  const digits = cleanValue(value).replace(/\D/g, '');
  if (digits.length === 2) return `20${digits}`;
  if (digits.length === 4) return digits;
  return '';
};
const normalizeOtp = (value = '') => cleanValue(value).replace(/\s+/g, '');

const normalizePaymentSetup = (userOrSetup = {}) => {
  const setup = userOrSetup?.paymentSetup || userOrSetup || {};
  const visibleSetup = getVisiblePayFastSetup(userOrSetup);
  const hasLiveGatewayConfig = hasCorePayFastConfig(setup);

  return {
    gateway: 'payfast',
    gatewayMode: 'payfast',
    demoMode: false,
    gatewayEnabled: Boolean(setup.payfastEnabled),
    gatewayConfigured: hasLiveGatewayConfig,
    merchantLabel: cleanValue(visibleSetup.merchantLabel || setup.merchantLabel || userOrSetup?.organization || userOrSetup?.name),
    methods: {
      easypaisa: Boolean(hasLiveGatewayConfig && setup.easypaisaEnabled && visibleSetup.methods?.easypaisa),
      card: Boolean(hasLiveGatewayConfig && setup.bankCardEnabled && visibleSetup.methods?.card),
    },
    fieldsByMethod: {
      easypaisa: ['accountNumber', 'cnicNumber', 'accountTitle'],
      card: ['cardNumber', 'expiryMonth', 'expiryYear', 'cvv'],
    },
    settlement: {
      ...visibleSetup.settlement,
      instructions: cleanValue(setup.settlementInstructions),
    },
  };
};

const validatePaymentSetup = (adminUser, paymentMethod) => {
  const visibleSetup = normalizePaymentSetup(adminUser);
  const normalizedMethod = cleanValue(paymentMethod).toLowerCase();
  const { valid, missingFields, methodConfig } = validateAdminPayFastConfig(adminUser, normalizedMethod);
  const finalMissingFields = [...missingFields];
  const methodEnabled =
    (normalizedMethod === 'easypaisa' && visibleSetup.methods.easypaisa) ||
    (normalizedMethod === 'card' && visibleSetup.methods.card);

  if (!methodEnabled) {
    if (normalizedMethod === 'easypaisa') {
      finalMissingFields.push('Enable Easypaisa and save its bank code plus instrument ID');
    } else if (normalizedMethod === 'card') {
      finalMissingFields.push('Enable Bank Cards and save the card bank code plus instrument ID');
    } else {
      finalMissingFields.push('Use a supported live payment method');
    }
  }

  return {
    valid: valid && methodEnabled,
    missingFields: finalMissingFields,
    paymentMethod: normalizedMethod,
    visibleSetup,
    methodConfig,
  };
};

const markCheckoutAsFailed = async ({ booking, transaction, invoice, message = 'Checkout failed.' }) => {
  booking.status = 'cancelled';
  booking.paymentStatus = 'failed';
  booking.checkoutExpiresAt = null;
  booking.adminReviewNote = message;
  await booking.save();

  if (transaction) {
    transaction.status = 'failed';
    transaction.gatewayMeta = { ...(transaction.gatewayMeta || {}), failureReason: message };
    await transaction.save();
  }

  if (invoice) {
    invoice.status = 'cancelled';
    await invoice.save();
  }
};

const markGatewayAttemptFailed = async ({ booking, transaction, message, payfastPayment }) => {
  booking.paymentStatus = 'failed';
  booking.adminReviewNote = message;
  booking.gatewayMeta = {
    ...(booking.gatewayMeta || {}),
    payfastPayment: {
      ...(booking.gatewayMeta?.payfastPayment || {}),
      ...(payfastPayment || {}),
      lastStatusMessage: message,
      currentStep: 'failed',
    },
  };
  await booking.save();

  if (transaction) {
    transaction.status = 'failed';
    transaction.gatewayMeta = {
      ...(transaction.gatewayMeta || {}),
      payfastPayment: {
        ...(transaction.gatewayMeta?.payfastPayment || {}),
        ...(payfastPayment || {}),
        lastStatusMessage: message,
        currentStep: 'failed',
      },
    };
    await transaction.save();
  }
};

const createOrReplacePendingCheckout = async ({
  advertiserId,
  adId,
  billboardId,
  bookingDate,
  timeSlot,
  totalPrice,
  durationMinutes,
  ratePerMinute,
  customerName,
  customerEmail,
  customerPhone,
}) => {
  await Booking.updateMany(
    {
      advertiser: advertiserId,
      billboard: billboardId,
      date: bookingDate,
      timeSlot,
      status: 'checkout',
    },
    {
      $set: {
        status: 'cancelled',
        paymentStatus: 'failed',
        checkoutExpiresAt: null,
        adminReviewNote: 'Superseded by a newer checkout attempt.',
      },
    }
  );

  const invoiceNumber = createInvoiceNumber();

  const booking = await Booking.create({
    advertiser: advertiserId,
    ad: adId || undefined,
    billboard: billboardId,
    date: bookingDate,
    timeSlot,
    totalPrice,
    durationMinutes,
    ratePerMinute,
    currency: 'PKR',
    customerName,
    customerEmail,
    customerPhone,
    status: 'checkout',
    paymentStatus: 'initiated',
    paymentMethod: 'bank_transfer',
    paymentGateway: 'payfast',
    gatewayReference: invoiceNumber,
    checkoutExpiresAt: getCheckoutExpiry(),
  });

  const transaction = await Transaction.create({
    booking: booking._id,
    advertiser: advertiserId,
    amount: totalPrice,
    method: 'bank_transfer',
    gateway: 'payfast',
    status: 'pending',
    invoiceNumber,
    customerName,
    customerEmail,
    customerPhone,
    gatewayReference: invoiceNumber,
  });

  const invoice = await Invoice.create({
    invoiceNumber,
    booking: booking._id,
    advertiser: advertiserId,
    amount: totalPrice,
    status: 'pending',
  });

  booking.gatewayMeta = {
    ...(booking.gatewayMeta || {}),
    payfastPayment: {
      basketId: invoiceNumber,
      currentStep: 'checkout_created',
    },
  };
  await booking.save();

  return { booking, transaction, invoice };
};

const getCheckoutResources = async (userId, bookingId, options = {}) => {
  const bookingQuery = Booking.findOne({ _id: bookingId, advertiser: userId }).populate('billboard');
  if (options.withAd) {
    bookingQuery.populate('ad');
  }
  const booking = await bookingQuery;
  if (!booking) return null;

  let [transaction, invoice] = await Promise.all([
    Transaction.findOne({ booking: booking._id }).sort({ createdAt: -1 }),
    Invoice.findOne({ booking: booking._id, advertiser: userId }),
  ]);

  const invoiceNumber = cleanValue(transaction?.invoiceNumber || invoice?.invoiceNumber || booking.gatewayReference || createInvoiceNumber());

  if (!transaction) {
    transaction = await Transaction.create({
      booking: booking._id,
      advertiser: userId,
      amount: Number(booking.totalPrice || 0),
      method: booking.paymentMethod || 'bank_transfer',
      gateway: booking.paymentGateway || 'payfast',
      status: 'pending',
      invoiceNumber,
      customerName: booking.customerName || '',
      customerEmail: booking.customerEmail || '',
      customerPhone: booking.customerPhone || '',
      gatewayReference: invoiceNumber,
    });
  }

  if (!invoice) {
    invoice = await Invoice.create({
      invoiceNumber,
      booking: booking._id,
      advertiser: userId,
      amount: Number(booking.totalPrice || 0),
      status: booking.paymentStatus === 'paid' ? 'paid' : 'pending',
    });
  }

  if (!booking.gatewayReference) {
    booking.gatewayReference = invoiceNumber;
    await booking.save();
  }

  if (!transaction || !invoice) return null;
  return { booking, transaction, invoice };
};

const ensureCheckoutNotExpired = async (booking, transaction, invoice) => {
  if (booking.checkoutExpiresAt && new Date(booking.checkoutExpiresAt) <= new Date()) {
    await markCheckoutAsFailed({
      booking,
      transaction,
      invoice,
      message: 'Checkout session expired. Please start again.',
    });
    return false;
  }
  return true;
};

const normalizePayFastInput = ({ paymentMethod, paymentDetails = {} }) => {
  if (paymentMethod === 'easypaisa') {
    const accountNumber = normalizeLocalMobile(
      paymentDetails.accountNumber || paymentDetails.senderAccount || paymentDetails.senderNumber
    );
    const cnicNumber = normalizeCnic(paymentDetails.cnicNumber);
    const accountTitle = cleanValue(paymentDetails.accountTitle || paymentDetails.payerName);

    if (!accountNumber || !PAKISTAN_MOBILE_REGEX.test(accountNumber)) {
      return { error: 'Enter the Easypaisa number exactly in the format 03xxxxxxxxx.' };
    }
    if (!CNIC_REGEX.test(cnicNumber)) {
      return { error: 'Enter the 13-digit CNIC linked with the Easypaisa wallet.' };
    }

    return {
      paymentFields: {
        account_number: accountNumber,
        cnic_number: cnicNumber,
        account_title: accountTitle,
      },
      maskedDetails: {
        maskedAccount: maskAccountNumber(accountNumber),
        maskedCnic: maskCnic(cnicNumber),
        accountTitle,
      },
    };
  }

  if (paymentMethod === 'card') {
    const cardNumber = normalizeCardNumber(paymentDetails.cardNumber);
    const expiryMonth = normalizeExpiryMonth(paymentDetails.expiryMonth);
    const expiryYear = normalizeExpiryYear(paymentDetails.expiryYear);
    const cvv = cleanValue(paymentDetails.cvv).replace(/\D/g, '');

    if (!CARD_NUMBER_REGEX.test(cardNumber)) {
      return { error: 'Enter a valid card number before continuing.' };
    }
    if (!expiryMonth || !expiryYear) {
      return { error: 'Enter a valid card expiry month and year.' };
    }
    if (!CVV_REGEX.test(cvv)) {
      return { error: 'Enter a valid 3 or 4 digit CVV.' };
    }

    return {
      paymentFields: {
        card_number: cardNumber,
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        cvv,
      },
      maskedDetails: {
        maskedAccount: maskAccountNumber(cardNumber),
        maskedCnic: '',
        accountTitle: '',
      },
    };
  }

  return { error: 'Unsupported payment method selected.' };
};

const buildValidationHashSeed = ({ paymentMethod, paymentFields, basketId, amount }) => {
  if (paymentMethod === 'card') {
    return `${basketId}${amount}${paymentFields.card_number}${paymentFields.expiry_month}${paymentFields.expiry_year}${paymentFields.cvv}`;
  }
  return `${basketId}${amount}${paymentFields.account_number}${paymentFields.cnic_number}`;
};

const buildTransactionHashSeed = ({ paymentMethod, paymentFields, basketId, amount, otp = '' }) => {
  if (paymentMethod === 'card') {
    return `${basketId}${amount}${paymentFields.card_number}${paymentFields.expiry_month}${paymentFields.expiry_year}${paymentFields.cvv}${otp}`;
  }
  return `${basketId}${amount}${paymentFields.account_number}${paymentFields.cnic_number}${otp}`;
};

const getGatewayMessage = (payload = {}) =>
  cleanValue(payload?.message || payload?.status_msg || payload?.rdv_message_key || 'Payment could not be completed.');

const buildSuccessResponse = ({ booking, transaction, message }) => ({
  bookingId: booking._id,
  paymentStatus: booking.paymentStatus,
  bookingStatus: booking.status,
  transactionStatus: transaction.status,
  nextStep: 'completed',
  transactionReference: booking.gatewayTransactionId || '',
  checkoutReference: booking.gatewayReference || '',
  message,
});

const setGatewayActionState = async ({
  booking,
  transaction,
  paymentMethod,
  expiresAt,
  payfastPayment,
}) => {
  booking.paymentStatus = 'requires_action';
  booking.paymentMethod = paymentMethod;
  booking.paymentGateway = 'payfast';
  booking.checkoutExpiresAt = expiresAt || getCheckoutExpiry();
  booking.gatewayTransactionId = payfastPayment.transactionId || booking.gatewayTransactionId || '';
  booking.gatewayMeta = {
    ...(booking.gatewayMeta || {}),
    payfastPayment,
  };

  transaction.method = paymentMethod;
  transaction.gateway = 'payfast';
  transaction.status = 'requires_action';
  transaction.gatewayTransactionId = payfastPayment.transactionId || transaction.gatewayTransactionId || '';
  transaction.gatewayMeta = {
    ...(transaction.gatewayMeta || {}),
    payfastPayment,
  };

  await Promise.all([booking.save(), transaction.save()]);
};

const completeGatewayPayment = async ({
  advertiser,
  booking,
  transaction,
  invoice,
  paymentMethod,
  gatewayTransactionId,
  gatewayReference,
  payfastPayment,
  successMessage,
}) => {
  const paidAt = new Date();

  booking.status = 'scheduled';
  booking.paymentStatus = 'paid';
  booking.paymentMethod = paymentMethod;
  booking.paymentGateway = 'payfast';
  booking.gatewayTransactionId = gatewayTransactionId || booking.gatewayTransactionId || '';
  booking.gatewayReference = gatewayReference || booking.gatewayReference || invoice.invoiceNumber;
  booking.paymentProof = booking.gatewayTransactionId || booking.gatewayReference;
  booking.paymentCapturedAt = paidAt;
  booking.checkoutExpiresAt = null;
  booking.adminReviewNote = '';
  booking.gatewayMeta = {
    ...(booking.gatewayMeta || {}),
    payfastPayment: {
      ...(booking.gatewayMeta?.payfastPayment || {}),
      ...(payfastPayment || {}),
      currentStep: 'paid',
      paidAt,
    },
  };

  transaction.method = paymentMethod;
  transaction.gateway = 'payfast';
  transaction.status = 'completed';
  transaction.gatewayTransactionId = booking.gatewayTransactionId;
  transaction.gatewayReference = booking.gatewayReference;
  transaction.gatewayMeta = {
    ...(transaction.gatewayMeta || {}),
    payfastPayment: {
      ...(transaction.gatewayMeta?.payfastPayment || {}),
      ...(payfastPayment || {}),
      currentStep: 'paid',
      paidAt,
    },
  };

  invoice.status = 'paid';

  await Promise.all([booking.save(), transaction.save(), invoice.save()]);

  await Notification.create({
    user: booking.billboard.createdBy,
    title: 'Booking Paid and Scheduled',
    message: `${advertiser.name || booking.customerName || 'An advertiser'} completed payment for ${booking.billboard?.name || 'selected billboard'}. The booking is now scheduled automatically.`,
    type: 'booking',
    relatedId: booking._id,
  });

  await Notification.create({
    user: booking.advertiser,
    title: 'Payment Received',
    message: `Your payment for ${booking.billboard?.name || 'selected billboard'} was confirmed successfully. The booking is now scheduled on the billboard.`,
    type: 'payment',
    relatedId: booking._id,
  });

  return buildSuccessResponse({
    booking,
    transaction,
    message: successMessage || 'Payment completed successfully. Your booking is now scheduled on the billboard.',
  });
};

const runPayFastTransaction = async ({
  accessToken,
  adminUser,
  advertiser,
  booking,
  transaction,
  invoice,
  paymentMethod,
  paymentFields,
  validatePayload,
  otp = '',
  paRes = '',
  customerIp,
}) => {
  const setup = adminUser.paymentSetup || {};
  const methodConfig = getPayFastMethodConfig(adminUser, paymentMethod);
  const amount = Number(booking.totalPrice || 0).toFixed(2);
  const basketId = booking.gatewayReference || invoice.invoiceNumber;
  const orderDate = booking.gatewayMeta?.payfastPayment?.orderDate || formatPayFastOrderDate(booking.createdAt || new Date());
  const customerMobile = formatPayFastCustomerMobile(booking.customerPhone || advertiser.phone || '');

  if (!customerMobile) {
    throw new Error('A valid advertiser mobile number is required before PayFast can process payment.');
  }

  const transactionForm = {
    basket_id: basketId,
    txnamt: amount,
    order_date: orderDate,
    customer_mobile_no: customerMobile,
    customer_email_address: booking.customerEmail || advertiser.email,
    account_type_id: methodConfig.accountType,
    merCatCode: cleanValue(setup.payfastMerchantCategoryCode),
    customer_ip: customerIp,
    bank_code: methodConfig.bankCode,
    otp_required: 'yes',
    recurring_txn: 'no',
    transaction_id: validatePayload?.transaction_id || booking.gatewayTransactionId || '',
    eci: cleanValue(validatePayload?.eci || booking.gatewayMeta?.payfastPayment?.eci),
    secured_hash: buildPayFastHash(
      buildTransactionHashSeed({ paymentMethod, paymentFields, basketId, amount, otp }),
      cleanValue(setup.payfastHashKey)
    ),
    ...(otp ? { otp } : {}),
    ...(paymentMethod === 'card'
      ? {
          card_number: paymentFields.card_number,
          expiry_month: paymentFields.expiry_month,
          expiry_year: paymentFields.expiry_year,
          cvv: paymentFields.cvv,
          ...(cleanValue(booking.gatewayMeta?.payfastPayment?.data3dsSecureId)
            ? { data_3ds_secureid: cleanValue(booking.gatewayMeta?.payfastPayment?.data3dsSecureId) }
            : {}),
          ...(paRes ? { data_3ds_pares: paRes } : {}),
        }
      : {
          account_number: paymentFields.account_number,
          cnic_number: paymentFields.cnic_number,
          account_title: paymentFields.account_title,
        }),
  };

  const response = await callPayFast({
    baseUrl: setup.payfastBaseUrl,
    path: '/transaction',
    accessToken,
    form: transactionForm,
  });

  const statusCode = cleanValue(response?.status_code || response?.code);
  const nextMeta = {
    ...(booking.gatewayMeta?.payfastPayment || {}),
    transactionId: cleanValue(response?.transaction_id || validatePayload?.transaction_id || booking.gatewayTransactionId),
    eci: cleanValue(response?.eci || validatePayload?.eci || booking.gatewayMeta?.payfastPayment?.eci),
    lastStatusCode: statusCode,
    lastStatusMessage: getGatewayMessage(response),
    transactionResponse: response,
  };

  if (isPayFastSuccess(response)) {
    return completeGatewayPayment({
      advertiser,
      booking,
      transaction,
      invoice,
      paymentMethod,
      gatewayTransactionId: nextMeta.transactionId,
      gatewayReference: basketId,
      payfastPayment: nextMeta,
      successMessage: 'Payment completed successfully. Your booking is now scheduled on the billboard.',
    });
  }

  if (isPayFastPending(response) || statusCode === PAYFAST_ISSUER_MANAGED_OTP_CODE) {
    const payfastPayment = {
      ...nextMeta,
      currentStep: 'processing',
      requiresStatusPolling: true,
    };
    await setGatewayActionState({
      booking,
      transaction,
      paymentMethod,
      payfastPayment,
    });

    return {
      bookingId: booking._id,
      paymentStatus: booking.paymentStatus,
      bookingStatus: booking.status,
      transactionStatus: transaction.status,
      nextStep: 'status_poll',
      checkoutReference: booking.gatewayReference,
      gatewayTransactionId: payfastPayment.transactionId || '',
      message: getGatewayMessage(response) || 'Complete the approval inside your banking or wallet app. We will keep checking the payment status automatically.',
    };
  }

  if (PAYFAST_INVALID_OTP_CODES.has(statusCode)) {
    await setGatewayActionState({
      booking,
      transaction,
      paymentMethod,
      payfastPayment: {
        ...nextMeta,
        currentStep: 'otp',
        requiresOtp: true,
      },
    });

    const error = new Error(getGatewayMessage(response) || 'Invalid OTP. Please try again.');
    error.status = 400;
    throw error;
  }

  await markGatewayAttemptFailed({
    booking,
    transaction,
    message: getGatewayMessage(response),
    payfastPayment: nextMeta,
  });

  const error = new Error(getGatewayMessage(response));
  error.status = 400;
  throw error;
};

const syncGatewayStatus = async ({ advertiser, adminUser, booking, transaction, invoice, customerIp }) => {
  const tokenResponse = await requestPayFastAccessToken({ adminUser, customerIp });
  const setup = adminUser.paymentSetup || {};
  const payfastPayment = booking.gatewayMeta?.payfastPayment || {};
  const gatewayTransactionId = cleanValue(booking.gatewayTransactionId || payfastPayment.transactionId);
  const orderDate = cleanValue(payfastPayment.orderDate);
  const basketId = cleanValue(booking.gatewayReference || invoice.invoiceNumber);

  const response = gatewayTransactionId
    ? await fetchPayFast({
        baseUrl: setup.payfastBaseUrl,
        path: `/transaction/${gatewayTransactionId}`,
        accessToken: tokenResponse.token,
      })
    : await fetchPayFast({
        baseUrl: setup.payfastBaseUrl,
        path: `/transaction/basket_id/${encodeURIComponent(basketId)}?order_date=${encodeURIComponent(orderDate)}&customer_ip=${encodeURIComponent(customerIp)}`,
        accessToken: tokenResponse.token,
      });

  const nextMeta = {
    ...(payfastPayment || {}),
    transactionId: cleanValue(response?.transaction_id || gatewayTransactionId),
    lastStatusCode: cleanValue(response?.status_code || response?.code),
    lastStatusMessage: getGatewayMessage(response),
    lastSyncAt: new Date(),
    lastStatusResponse: response,
  };

  if (isPayFastSuccess(response)) {
    return completeGatewayPayment({
      advertiser,
      booking,
      transaction,
      invoice,
      paymentMethod: booking.paymentMethod || payfastPayment.paymentMethod || 'easypaisa',
      gatewayTransactionId: nextMeta.transactionId,
      gatewayReference: basketId,
      payfastPayment: nextMeta,
      successMessage: 'Payment was confirmed by PayFast. Your booking is now scheduled on the billboard.',
    });
  }

  if (isPayFastPending(response)) {
    await setGatewayActionState({
      booking,
      transaction,
      paymentMethod: booking.paymentMethod || payfastPayment.paymentMethod || 'easypaisa',
      payfastPayment: {
        ...nextMeta,
        currentStep: 'processing',
        requiresStatusPolling: true,
      },
    });

    return {
      bookingId: booking._id,
      paymentStatus: booking.paymentStatus,
      bookingStatus: booking.status,
      transactionStatus: transaction.status,
      nextStep: 'status_poll',
      checkoutReference: basketId,
      gatewayTransactionId: nextMeta.transactionId || '',
      lastSyncedAt: nextMeta.lastSyncAt,
      message: getGatewayMessage(response) || 'Payment is still being processed by PayFast.',
    };
  }

  await markGatewayAttemptFailed({
    booking,
    transaction,
    message: getGatewayMessage(response),
    payfastPayment: nextMeta,
  });

  return {
    bookingId: booking._id,
    paymentStatus: booking.paymentStatus,
    bookingStatus: booking.status,
    transactionStatus: transaction.status,
    nextStep: 'failed',
    checkoutReference: basketId,
    gatewayTransactionId: nextMeta.transactionId || '',
    message: getGatewayMessage(response),
  };
};

export const getCheckoutConfig = async (req, res) => {
  const advertiser = await ensureAdvertiserRole(req, res);
  if (!advertiser) return;

  const { billboardId } = req.params;
  const billboard = await Billboard.findById(billboardId).populate('createdBy');
  if (!billboard) {
    return res.status(404).json({ message: 'Billboard not found.' });
  }

  res.json({
    billboardId: billboard._id,
    paymentSetup: normalizePaymentSetup(billboard.createdBy),
  });
};

export const prepareBookingCheckout = async (req, res) => {
  const advertiser = await ensureAdvertiserRole(req, res);
  if (!advertiser) return;

  const {
    billboardId,
    date,
    startTime,
    endTime,
    customerName,
    customerEmail,
    customerPhone,
    adTitle,
    adDescription,
    adDuration,
  } = req.body;

  if (!billboardId || !date || !startTime || !endTime) {
    return res.status(400).json({ message: 'Billboard, date, start time, and end time are required.' });
  }

  if (!adTitle || !adDescription) {
    return res.status(400).json({ message: 'Ad title and description are required.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Please upload your ad media inside the booking form.' });
  }

  if (!customerName || !customerPhone) {
    return res.status(400).json({ message: 'Customer name and phone are required at checkout.' });
  }

  const customerValidationError = validateCheckoutContact({ customerName, customerPhone });
  if (customerValidationError) {
    return res.status(400).json({ message: customerValidationError });
  }

  const billboard = await Billboard.findById(billboardId).populate('createdBy');
  if (!billboard) {
    return res.status(404).json({ message: 'Billboard not found.' });
  }

  const bookingDate = parseDateOnly(date);
  if (!bookingDate) {
    return res.status(400).json({ message: 'Please choose a valid booking date.' });
  }

  const pricing = calculateBookingAmount({ billboard, startTime, endTime });
  if (!pricing.durationMinutes) {
    return res.status(400).json({ message: 'End time must be after start time.' });
  }

  const timeSlot = buildTimeSlotLabel(startTime, endTime);
  const requestedRange24 = `${startTime}-${endTime}`;
  const configuredSlots = (billboard.timeSlots || [])
    .filter((slot) => extractDatePrefixFromSlot(slot) === String(date).trim())
    .map((slot) => extractTimeRangeFromSlot(slot));

  if (!configuredSlots.length) {
    return res.status(400).json({ message: 'This billboard has no configured availability for the selected date.' });
  }

  const fitsConfiguredSchedule = configuredSlots.some((slot) => slotContainsRange(slot, requestedRange24));
  if (!fitsConfiguredSchedule) {
    return res.status(400).json({ message: 'Selected time must fall inside one of the billboard availability windows.' });
  }

  const existingBookings = await Booking.find({
    billboard: billboardId,
    date: bookingDate,
  });
  const overlappingBooking = existingBookings.find(
    (booking) => bookingBlocksAvailability(booking) && doSlotsOverlap(booking.timeSlot, timeSlot)
  );
  if (overlappingBooking) {
    return res.status(409).json({ message: 'This slot is no longer available. Please choose another time.' });
  }

  const mediaType = req.file.mimetype?.startsWith('image/') ? 'image' : 'video';
  let ad = null;

  try {
    ad = await Ad.create({
      title: adTitle,
      description: adDescription,
      duration: Number(adDuration) || 30,
      advertiser: req.user._id,
      mediaUrl: `/uploads/ads/${req.file.filename}`,
      mediaType,
      approvalStatus: 'pending',
    });

    const { booking, transaction, invoice } = await createOrReplacePendingCheckout({
      advertiserId: req.user._id,
      adId: ad._id,
      billboardId,
      bookingDate,
      timeSlot,
      totalPrice: pricing.totalPrice,
      durationMinutes: pricing.durationMinutes,
      ratePerMinute: pricing.ratePerMinute,
      customerName: cleanValue(customerName),
      customerEmail: customerEmail || advertiser.email,
      customerPhone: cleanValue(customerPhone),
    });

    res.status(201).json({
      bookingId: booking._id,
      transactionId: transaction._id,
      invoiceNumber: invoice.invoiceNumber,
      summary: {
        adTitle: ad.title,
        adMediaUrl: ad.mediaUrl,
        adMediaType: ad.mediaType,
        adDuration: ad.duration,
        invoiceNumber: invoice.invoiceNumber,
        billboardName: billboard.name,
        location: `${billboard.city}, ${billboard.location}`,
        date,
        timeSlot,
        durationMinutes: pricing.durationMinutes,
        ratePerMinute: pricing.ratePerMinute,
        totalPrice: pricing.totalPrice,
        currency: 'PKR',
      },
      paymentSetup: normalizePaymentSetup(billboard.createdBy),
    });
  } catch (error) {
    if (ad?._id) {
      await Ad.findByIdAndDelete(ad._id);
    }
    return res.status(500).json({ message: error.message || 'Checkout preparation failed.' });
  }
};

export const initiatePayFastPayment = async (req, res) => {
  const advertiser = await ensureAdvertiserRole(req, res);
  if (!advertiser) return;

  const { bookingId, paymentMethod, paymentDetails = {} } = req.body;
  if (!bookingId || !paymentMethod) {
    return res.status(400).json({ message: 'Booking ID and payment method are required.' });
  }

  const resources = await getCheckoutResources(req.user._id, bookingId, { withAd: true });
  if (!resources) {
    return res.status(404).json({ message: 'Checkout booking could not be located.' });
  }

  const { booking, transaction, invoice } = resources;
  if (booking.status !== 'approved') {
    return res.status(400).json({ message: 'This booking is not ready for payment yet. Wait for admin approval first.' });
  }
  if (booking.paymentStatus === 'paid' || booking.status === 'scheduled' || booking.status === 'active') {
    return res.status(400).json({ message: 'Payment has already been completed for this booking.' });
  }
  if (!(await ensureCheckoutNotExpired(booking, transaction, invoice))) {
    return res.status(400).json({ message: 'Checkout session expired. Please start again.' });
  }

  const adminUser = await User.findById(booking.billboard.createdBy);
  const { valid, missingFields, paymentMethod: normalizedMethod, methodConfig } = validatePaymentSetup(adminUser, paymentMethod);
  if (!valid) {
    return res.status(400).json({
      message: `Live PayFast setup is incomplete for ${paymentMethod}: ${missingFields.join(', ')}`,
    });
  }

  const normalizedInput = normalizePayFastInput({ paymentMethod: normalizedMethod, paymentDetails });
  if (normalizedInput.error) {
    return res.status(400).json({ message: normalizedInput.error });
  }

  const customerIp = getClientIp(req);
  const customerMobile = formatPayFastCustomerMobile(booking.customerPhone || advertiser.phone || '');
  if (!customerMobile) {
    return res.status(400).json({ message: 'Advertiser mobile number is required before payment can start.' });
  }

  try {
    const tokenResponse = await requestPayFastAccessToken({ adminUser, customerIp });
    const basketId = booking.gatewayReference || invoice.invoiceNumber;
    const orderDate = formatPayFastOrderDate(new Date());
    const amount = Number(booking.totalPrice || 0).toFixed(2);
    const setup = adminUser.paymentSetup || {};
    const callbackUrl = `${getFrontendOrigin(req)}/payfast-card-callback?bookingId=${encodeURIComponent(booking._id)}`;

    const validateForm = {
      basket_id: basketId,
      txnamt: amount,
      order_date: orderDate,
      customer_mobile_no: customerMobile,
      customer_email_address: booking.customerEmail || advertiser.email,
      account_type_id: methodConfig.accountType,
      merCatCode: cleanValue(setup.payfastMerchantCategoryCode),
      customer_ip: customerIp,
      bank_code: methodConfig.bankCode,
      otp_required: 'yes',
      recurring_txn: 'no',
      secured_hash: buildPayFastHash(
        buildValidationHashSeed({
          paymentMethod: normalizedMethod,
          paymentFields: normalizedInput.paymentFields,
          basketId,
          amount,
        }),
        cleanValue(setup.payfastHashKey)
      ),
      ...(normalizedMethod === 'card'
        ? {
            card_number: normalizedInput.paymentFields.card_number,
            expiry_month: normalizedInput.paymentFields.expiry_month,
            expiry_year: normalizedInput.paymentFields.expiry_year,
            cvv: normalizedInput.paymentFields.cvv,
            data_3ds_pagemode: 'SIMPLE',
            data_3ds_callback_url: callbackUrl,
          }
        : {
            account_number: normalizedInput.paymentFields.account_number,
            cnic_number: normalizedInput.paymentFields.cnic_number,
            account_title: normalizedInput.paymentFields.account_title,
          }),
    };

    const validateResponse = await callPayFast({
      baseUrl: setup.payfastBaseUrl,
      path: '/customer/validate',
      accessToken: tokenResponse.token,
      form: validateForm,
    });

    const responseCode = cleanValue(validateResponse?.code || validateResponse?.status_code);
    const payfastPayment = {
      basketId,
      orderDate,
      paymentMethod: normalizedMethod,
      transactionId: cleanValue(validateResponse?.transaction_id),
      eci: cleanValue(validateResponse?.eci),
      data3dsSecureId: cleanValue(validateResponse?.data_3ds_secureid),
      maskedAccount: normalizedInput.maskedDetails.maskedAccount,
      maskedCnic: normalizedInput.maskedDetails.maskedCnic,
      accountTitle: normalizedInput.maskedDetails.accountTitle,
      lastStatusCode: responseCode,
      lastStatusMessage: getGatewayMessage(validateResponse),
      validationResponse: validateResponse,
      customerMobileNo: customerMobile,
      currentStep: 'validated',
    };

    if (cleanValue(validateResponse?.data_3ds_html)) {
      await setGatewayActionState({
        booking,
        transaction,
        paymentMethod: normalizedMethod,
        payfastPayment: {
          ...payfastPayment,
          currentStep: 'card_challenge',
          requiresCardChallenge: true,
        },
      });

      return res.json({
        bookingId: booking._id,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.status,
        transactionStatus: transaction.status,
        nextStep: 'card_challenge',
        checkoutReference: basketId,
        gatewayTransactionId: payfastPayment.transactionId || '',
        challengeHtml: validateResponse.data_3ds_html,
        message: 'Complete the secure bank card challenge in the popup window to finish payment.',
      });
    }

    if (PAYFAST_OTP_CODES.has(responseCode)) {
      await setGatewayActionState({
        booking,
        transaction,
        paymentMethod: normalizedMethod,
        payfastPayment: {
          ...payfastPayment,
          currentStep: 'otp',
          requiresOtp: true,
        },
      });

      return res.json({
        bookingId: booking._id,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.status,
        transactionStatus: transaction.status,
        nextStep: 'otp',
        checkoutReference: basketId,
        gatewayTransactionId: payfastPayment.transactionId || '',
        delivery: responseCode === '803' ? 'email' : responseCode === '804' ? 'mobile' : 'otp',
        message: getGatewayMessage(validateResponse) || 'Enter the OTP sent by PayFast to finish this payment.',
      });
    }

    if (isPayFastSuccess(validateResponse) || responseCode === PAYFAST_ISSUER_MANAGED_OTP_CODE) {
      const result = await runPayFastTransaction({
        accessToken: tokenResponse.token,
        adminUser,
        advertiser,
        booking,
        transaction,
        invoice,
        paymentMethod: normalizedMethod,
        paymentFields: normalizedInput.paymentFields,
        validatePayload: validateResponse,
        customerIp,
      });

      return res.json(result);
    }

    await markGatewayAttemptFailed({
      booking,
      transaction,
      message: getGatewayMessage(validateResponse),
      payfastPayment,
    });

    return res.status(400).json({
      message: getGatewayMessage(validateResponse),
    });
  } catch (error) {
    return res.status(error.status && error.status < 500 ? error.status : 502).json({
      message: error.message || 'Could not start the PayFast payment request.',
      payload: error.payload || undefined,
    });
  }
};

export const confirmPayFastPayment = async (req, res) => {
  const advertiser = await ensureAdvertiserRole(req, res);
  if (!advertiser) return;

  const { bookingId, paymentMethod, paymentDetails = {}, verificationCode, paRes } = req.body;

  if (!bookingId) {
    return res.status(400).json({ message: 'Booking ID is required.' });
  }

  const resources = await getCheckoutResources(req.user._id, bookingId);
  if (!resources) {
    return res.status(404).json({ message: 'Checkout booking could not be located.' });
  }

  const { booking, transaction, invoice } = resources;
  if (booking.status !== 'approved') {
    return res.status(400).json({ message: 'This booking is not awaiting advertiser payment.' });
  }
  if (booking.paymentStatus === 'paid' || booking.status === 'scheduled' || booking.status === 'active') {
    return res.status(400).json({ message: 'Payment has already been completed for this booking.' });
  }
  if (!(await ensureCheckoutNotExpired(booking, transaction, invoice))) {
    return res.status(400).json({ message: 'Checkout session expired. Please start again.' });
  }

  const payfastPayment = booking.gatewayMeta?.payfastPayment;
  const normalizedMethod = cleanValue(paymentMethod || booking.paymentMethod || payfastPayment?.paymentMethod).toLowerCase();
  const adminUser = await User.findById(booking.billboard.createdBy);
  const { valid, missingFields } = validatePaymentSetup(adminUser, normalizedMethod);
  if (!valid) {
    return res.status(400).json({
      message: `Live PayFast setup is incomplete for ${normalizedMethod}: ${missingFields.join(', ')}`,
    });
  }

  if (!payfastPayment?.transactionId) {
    return res.status(400).json({ message: 'Start the payment request first before confirming it.' });
  }

  const normalizedInput = normalizePayFastInput({ paymentMethod: normalizedMethod, paymentDetails });
  if (normalizedInput.error) {
    return res.status(400).json({ message: normalizedInput.error });
  }

  const otp = normalizeOtp(verificationCode);
  const securePaRes = cleanValue(paRes);
  if (!otp && !securePaRes) {
    return res.status(400).json({ message: 'OTP or secure bank challenge response is required.' });
  }

  const customerIp = getClientIp(req);

  try {
    const tokenResponse = await requestPayFastAccessToken({ adminUser, customerIp });
    const result = await runPayFastTransaction({
      accessToken: tokenResponse.token,
      adminUser,
      advertiser,
      booking,
      transaction,
      invoice,
      paymentMethod: normalizedMethod,
      paymentFields: normalizedInput.paymentFields,
      validatePayload: {
        transaction_id: payfastPayment.transactionId,
        eci: payfastPayment.eci,
      },
      otp,
      paRes: securePaRes,
      customerIp,
    });

    return res.json(result);
  } catch (error) {
    return res.status(error.status && error.status < 500 ? error.status : 502).json({
      message: error.message || 'Could not confirm the PayFast payment.',
      payload: error.payload || undefined,
    });
  }
};

export const syncPayFastPaymentStatus = async (req, res) => {
  const advertiser = await ensureAdvertiserRole(req, res);
  if (!advertiser) return;

  const { bookingId } = req.body;
  if (!bookingId) {
    return res.status(400).json({ message: 'Booking ID is required.' });
  }

  const resources = await getCheckoutResources(req.user._id, bookingId);
  if (!resources) {
    return res.status(404).json({ message: 'Checkout booking could not be located.' });
  }

  const { booking, transaction, invoice } = resources;
  const adminUser = await User.findById(booking.billboard.createdBy);
  const customerIp = getClientIp(req);

  try {
    const response = await syncGatewayStatus({
      advertiser,
      adminUser,
      booking,
      transaction,
      invoice,
      customerIp,
    });
    return res.json(response);
  } catch (error) {
    return res.status(error.status && error.status < 500 ? error.status : 502).json({
      message: error.message || 'Could not sync the current PayFast payment status.',
      payload: error.payload || undefined,
    });
  }
};
