import crypto from 'node:crypto';

const PAYFAST_SUCCESS_CODES = new Set(['00', '0', '79']);
const PAYFAST_PENDING_CODES = new Set(['001']);

const safeTrim = (value) => String(value || '').trim();

export const maskAccountNumber = (value = '') => {
  const raw = safeTrim(value).replace(/\s+/g, '');
  if (!raw) return '';
  if (raw.length <= 4) return raw;
  return `${'*'.repeat(Math.max(0, raw.length - 4))}${raw.slice(-4)}`;
};

export const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }
  const remoteAddress =
    req.ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    '';

  return remoteAddress.includes('::ffff:')
    ? remoteAddress.split('::ffff:').pop()
    : remoteAddress || '127.0.0.1';
};

export const normalizePayFastBaseUrl = (baseUrl = '') =>
  safeTrim(baseUrl).replace(/\/+$/, '');

export const buildPayFastHash = (value = '', hashKey = '') => {
  if (!value || !hashKey) return '';
  return crypto.createHmac('sha256', hashKey).update(value, 'utf8').digest('hex');
};

export const getAdminPaymentSetup = (adminUser) => adminUser?.paymentSetup || {};

export const getVisiblePayFastSetup = (adminUser) => {
  const setup = getAdminPaymentSetup(adminUser);
  return {
    payfastEnabled: Boolean(setup.payfastEnabled),
    merchantLabel: setup.payfastMerchantLabel || adminUser?.organization || adminUser?.name || 'Merchant',
    baseUrlConfigured: Boolean(setup.payfastBaseUrl),
    methods: {
      card: Boolean(setup.payfastCardBankCode && setup.payfastCardInstrumentId),
      easypaisa: Boolean(setup.payfastEasypaisaBankCode && setup.payfastEasypaisaInstrumentId),
      jazzcash: Boolean(setup.payfastJazzCashBankCode && setup.payfastJazzCashInstrumentId),
    },
    settlement: {
      accountTitle: setup.settlementAccountTitle || '',
      easypaisaNumber: setup.settlementEasypaisaNumber || '',
      jazzCashNumber: setup.settlementJazzCashNumber || '',
      bankName: setup.settlementBankName || '',
      bankIban: setup.settlementBankIban || '',
    },
  };
};

export const getPayFastMethodConfig = (adminUser, paymentMethod = '') => {
  const setup = getAdminPaymentSetup(adminUser);
  const normalizedMethod = safeTrim(paymentMethod).toLowerCase();

  if (normalizedMethod === 'card') {
    return {
      bankCode: safeTrim(setup.payfastCardBankCode),
      accountType: safeTrim(setup.payfastCardInstrumentId),
      label: 'Card',
    };
  }

  if (normalizedMethod === 'easypaisa') {
    return {
      bankCode: safeTrim(setup.payfastEasypaisaBankCode),
      accountType: safeTrim(setup.payfastEasypaisaInstrumentId),
      label: 'Easypaisa',
    };
  }

  if (normalizedMethod === 'jazzcash') {
    return {
      bankCode: safeTrim(setup.payfastJazzCashBankCode),
      accountType: safeTrim(setup.payfastJazzCashInstrumentId),
      label: 'JazzCash',
    };
  }

  return { bankCode: '', accountType: '', label: '' };
};

export const validateAdminPayFastConfig = (adminUser, paymentMethod = '', options = {}) => {
  const setup = getAdminPaymentSetup(adminUser);
  const methodConfig = getPayFastMethodConfig(adminUser, paymentMethod);
  const { requireMethodConfig = true } = options;
  const missingFields = [];

  if (!setup.payfastEnabled) missingFields.push('PayFast enabled flag');
  if (!safeTrim(setup.payfastBaseUrl)) missingFields.push('PayFast base URL');
  if (!safeTrim(setup.payfastMerchantId)) missingFields.push('Merchant ID');
  if (!safeTrim(setup.payfastSecuredKey)) missingFields.push('Secured Key');
  if (!safeTrim(setup.payfastHashKey)) missingFields.push('Hash Key');
  if (!safeTrim(setup.payfastMerchantCategoryCode)) missingFields.push('Merchant category code');
  if (requireMethodConfig) {
    if (!methodConfig.bankCode) missingFields.push(`${methodConfig.label || paymentMethod} bank code`);
    if (!methodConfig.accountType) missingFields.push(`${methodConfig.label || paymentMethod} instrument ID`);
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
    methodConfig,
  };
};

const parseGatewayResponse = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

export const callPayFast = async ({ baseUrl, path, form, accessToken }) => {
  const body = new URLSearchParams();
  Object.entries(form || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      body.append(key, String(value));
    }
  });

  const response = await fetch(`${normalizePayFastBaseUrl(baseUrl)}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body,
  });

  const payload = await parseGatewayResponse(response);
  if (!response.ok) {
    const message = payload?.message || payload?.status_msg || `PayFast request failed with ${response.status}`;
    const error = new Error(message);
    error.payload = payload;
    error.status = response.status;
    throw error;
  }

  return payload;
};

export const fetchPayFast = async ({ baseUrl, path, accessToken }) => {
  const response = await fetch(`${normalizePayFastBaseUrl(baseUrl)}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  const payload = await parseGatewayResponse(response);
  if (!response.ok) {
    const message = payload?.message || payload?.status_msg || `PayFast request failed with ${response.status}`;
    const error = new Error(message);
    error.payload = payload;
    error.status = response.status;
    throw error;
  }

  return payload;
};

export const requestPayFastAccessToken = async ({ adminUser, customerIp }) => {
  const setup = getAdminPaymentSetup(adminUser);
  return callPayFast({
    baseUrl: setup.payfastBaseUrl,
    path: '/token',
    form: {
      merchant_id: setup.payfastMerchantId,
      secured_key: setup.payfastSecuredKey,
      grant_type: 'client_credentials',
      customer_ip: customerIp,
    },
  });
};

export const isPayFastSuccess = (payload = {}) =>
  PAYFAST_SUCCESS_CODES.has(String(payload?.status_code ?? payload?.code ?? '').trim());

export const isPayFastPending = (payload = {}) =>
  PAYFAST_PENDING_CODES.has(String(payload?.status_code ?? payload?.code ?? '').trim());

export const getPayFastStatusLabel = (payload = {}) => {
  if (isPayFastSuccess(payload)) return 'paid';
  if (isPayFastPending(payload)) return 'pending';
  return 'failed';
};
