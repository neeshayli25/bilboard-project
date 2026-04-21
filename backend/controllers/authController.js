import crypto from 'node:crypto';
import os from 'node:os';
import { lookup as dnsLookup } from 'node:dns/promises';
import bcrypt from 'bcryptjs';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';

const EMAIL_VERIFY_HOURS = 24;
const RESET_PASSWORD_MINUTES = 30;
const CEREMONY_WINDOW_MS = 10 * 60 * 1000;
const registrationChallenges = new Map();
const authenticationChallenges = new Map();

const cleanEmail = (value = '') => String(value || '').trim().toLowerCase();
const cleanName = (value = '') => String(value || '').trim().replace(/\s+/g, ' ');
const getMailPassword = () => String(process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS || '').trim();
const hasMailConfig = () => Boolean(process.env.EMAIL_USER && getMailPassword());
const canUseEmailPreviewMode = () => process.env.ALLOW_EMAIL_PREVIEW !== 'false';
const canUseLanEmailLinks = () => process.env.ALLOW_LAN_EMAIL_LINKS === 'true';
const DEFAULT_FRONTEND_URL = 'http://localhost:5173';
const QUICK_TUNNEL_SUFFIX = '.trycloudflare.com';

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
const createRawToken = () => crypto.randomBytes(32).toString('hex');
const createFlowId = () => crypto.randomBytes(18).toString('hex');

const normalizeBaseUrl = (value = '') => {
  try {
    const parsed = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.origin.replace(/\/$/, '');
  } catch {
    return '';
  }
};

const isLoopbackBaseUrl = (value = '') => {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
  } catch {
    return false;
  }
};

const isPrivateNetworkBaseUrl = (value = '') => {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.local') ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    );
  } catch {
    return false;
  }
};

const isQuickTunnelBaseUrl = (value = '') => {
  try {
    return new URL(value).hostname.toLowerCase().endsWith(QUICK_TUNNEL_SUFFIX);
  } catch {
    return false;
  }
};

const getPortForBaseUrl = (value = '', fallbackPort = '5173') => {
  try {
    const parsed = new URL(value);
    if (parsed.port) return parsed.port;
    return parsed.protocol === 'https:' ? '443' : '80';
  } catch {
    return String(fallbackPort);
  }
};

const collectLanBaseUrls = (port) => {
  const urls = [];
  const interfaces = os.networkInterfaces();

  Object.values(interfaces).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (!entry || entry.family !== 'IPv4' || entry.internal) return;
      urls.push(`http://${entry.address}:${port}`);
    });
  });

  return [...new Set(urls)];
};

const isResolvableBaseUrl = async (value = '') => {
  try {
    const parsed = new URL(value);
    const hostname = String(parsed.hostname || '').trim();
    if (!hostname) return false;

    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
    ) {
      return true;
    }

    await dnsLookup(hostname);
    return true;
  } catch {
    return false;
  }
};

const resolveFirstReachableBaseUrl = async (candidates = []) => {
  const normalized = [...new Set(candidates.map((value) => normalizeBaseUrl(value)).filter(Boolean))];
  for (const candidate of normalized) {
    if (await isResolvableBaseUrl(candidate)) {
      return candidate;
    }
  }
  return '';
};

const pickMostReachableBaseUrl = (...candidates) => {
  const normalizedCandidates = candidates.map((value) => normalizeBaseUrl(value)).filter(Boolean);
  return normalizedCandidates.find((value) => !isPrivateNetworkBaseUrl(value)) || normalizedCandidates[0] || '';
};

const getRequestOrigin = (req) => {
  const candidates = [
    req?.query?.app,
    req?.body?.clientBaseUrl,
    req?.headers?.['x-client-origin'],
    req?.headers?.origin,
    req?.headers?.referer,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const normalized = normalizeBaseUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return '';
};

const getPreferredFrontendBaseUrl = () =>
  normalizeBaseUrl(process.env.PUBLIC_APP_URL || process.env.APP_PUBLIC_URL || '');

const getLegacyFrontendBaseUrl = () =>
  normalizeBaseUrl(process.env.FRONTEND_URL || process.env.CLIENT_URL || '');

const getDetectedLanFrontendBaseUrl = () => {
  const port = getPortForBaseUrl(
    getPreferredFrontendBaseUrl() || getLegacyFrontendBaseUrl() || DEFAULT_FRONTEND_URL,
    '5173'
  );
  return collectLanBaseUrls(port)[0] || '';
};

const getConfiguredFrontendBaseUrl = () =>
  getPreferredFrontendBaseUrl() || getLegacyFrontendBaseUrl() || DEFAULT_FRONTEND_URL;

const getConfiguredApiBaseUrl = () =>
  normalizeBaseUrl(process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || process.env.BACKEND_PUBLIC_URL || '');

const getDetectedLanApiBaseUrl = () => collectLanBaseUrls(String(process.env.PORT || '5000'))[0] || '';

const getEmailLinkMode = (value = '') => {
  if (isLoopbackBaseUrl(value)) return 'local';
  if (isQuickTunnelBaseUrl(value)) return 'public_tunnel';
  if (isPrivateNetworkBaseUrl(value)) return 'lan';
  return 'public';
};

const deriveApiBaseUrlFromFrontend = (frontendBaseUrl = '') => {
  try {
    const parsed = new URL(frontendBaseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }

    if (parsed.port === '5173' || parsed.port === '4173' || parsed.port === '') {
      parsed.port = String(process.env.PORT || '5000');
      return parsed.origin.replace(/\/$/, '');
    }

    return '';
  } catch {
    return '';
  }
};

const resolveEmailDeliveryTargets = async (req, kind = 'verify') => {
  const requestOrigin = getRequestOrigin(req);
  const preferredFrontendBaseUrl = getPreferredFrontendBaseUrl();
  const legacyFrontendBaseUrl = getLegacyFrontendBaseUrl();
  const configuredPublicFrontendBaseUrl = await resolveFirstReachableBaseUrl(
    [requestOrigin, preferredFrontendBaseUrl, legacyFrontendBaseUrl].filter(
      (value) => value && !isPrivateNetworkBaseUrl(value)
    )
  );

  if (!configuredPublicFrontendBaseUrl && !canUseLanEmailLinks()) {
    const error = new Error(
      'Public email links are not configured right now. Start a live public URL first, then resend the email.'
    );
    error.statusCode = 503;
    throw error;
  }

  const lanFrontendBaseUrl =
    resolveFirstReachableBaseUrl ? await resolveFirstReachableBaseUrl([requestOrigin, getDetectedLanFrontendBaseUrl()].filter(Boolean)) : '';
  const frontendBaseUrl = configuredPublicFrontendBaseUrl || lanFrontendBaseUrl || '';

  if (!frontendBaseUrl) {
    const error = new Error('No reachable frontend URL is available for email links right now.');
    error.statusCode = 503;
    throw error;
  }

  if (kind === 'reset') {
    return {
      frontendBaseUrl,
      actionBaseUrl: frontendBaseUrl,
      actionMode: getEmailLinkMode(frontendBaseUrl),
    };
  }

  const configuredPublicApiBaseUrl = await resolveFirstReachableBaseUrl(
    [getConfiguredApiBaseUrl(), deriveApiBaseUrlFromFrontend(configuredPublicFrontendBaseUrl)].filter(
      (value) => value && !isPrivateNetworkBaseUrl(value)
    )
  );
  const lanApiBaseUrl = await resolveFirstReachableBaseUrl(
    [getConfiguredApiBaseUrl(), getDetectedLanApiBaseUrl(), deriveApiBaseUrlFromFrontend(frontendBaseUrl)].filter(Boolean)
  );

  const actionBaseUrl =
    pickMostReachableBaseUrl(configuredPublicFrontendBaseUrl, configuredPublicApiBaseUrl) ||
    (canUseLanEmailLinks() ? pickMostReachableBaseUrl(frontendBaseUrl, lanApiBaseUrl) : '');

  if (!actionBaseUrl) {
    const error = new Error('No reachable public verification URL is available right now. Start the public host first.');
    error.statusCode = 503;
    throw error;
  }

  return {
    frontendBaseUrl,
    actionBaseUrl,
    actionMode: getEmailLinkMode(actionBaseUrl),
  };
};

const getFrontendBaseUrl = (req) => {
  const requestOrigin = getRequestOrigin(req);
  const preferredFrontendBaseUrl = getPreferredFrontendBaseUrl();
  const legacyFrontendBaseUrl = getLegacyFrontendBaseUrl();
  const lanFrontendBaseUrl = getDetectedLanFrontendBaseUrl();

  if (requestOrigin) {
    if (isLoopbackBaseUrl(requestOrigin)) {
      if (preferredFrontendBaseUrl && !isLoopbackBaseUrl(preferredFrontendBaseUrl) && !isQuickTunnelBaseUrl(preferredFrontendBaseUrl)) {
        return preferredFrontendBaseUrl;
      }
      if (legacyFrontendBaseUrl && !isLoopbackBaseUrl(legacyFrontendBaseUrl) && !isQuickTunnelBaseUrl(legacyFrontendBaseUrl)) {
        return legacyFrontendBaseUrl;
      }
      if (lanFrontendBaseUrl) {
        return lanFrontendBaseUrl;
      }
      if (preferredFrontendBaseUrl && !isLoopbackBaseUrl(preferredFrontendBaseUrl)) {
        return preferredFrontendBaseUrl;
      }
      if (legacyFrontendBaseUrl && !isLoopbackBaseUrl(legacyFrontendBaseUrl)) {
        return legacyFrontendBaseUrl;
      }
    }
    return requestOrigin;
  }

  return (
    (preferredFrontendBaseUrl && !isQuickTunnelBaseUrl(preferredFrontendBaseUrl) && preferredFrontendBaseUrl) ||
    (legacyFrontendBaseUrl && !isQuickTunnelBaseUrl(legacyFrontendBaseUrl) && legacyFrontendBaseUrl) ||
    lanFrontendBaseUrl ||
    preferredFrontendBaseUrl ||
    legacyFrontendBaseUrl ||
    DEFAULT_FRONTEND_URL
  );
};

const getEmailActionBaseUrl = (req) => {
  const frontendBaseUrl = getFrontendBaseUrl(req);
  const configuredApiBaseUrl = getConfiguredApiBaseUrl() || getDetectedLanApiBaseUrl();
  const derivedApiBaseUrl = deriveApiBaseUrlFromFrontend(frontendBaseUrl);

  return (
    pickMostReachableBaseUrl(frontendBaseUrl, configuredApiBaseUrl, derivedApiBaseUrl) ||
    frontendBaseUrl ||
    configuredApiBaseUrl ||
    derivedApiBaseUrl
  );
};

const buildFrontendActionUrl = (req, pathname, token, email = '') => {
  const params = new URLSearchParams({ token });
  if (email) params.set('email', email);
  return `${getFrontendBaseUrl(req)}${pathname}?${params.toString()}`;
};

const buildEmailActionUrl = (req, pathname, token, email = '') => {
  const params = new URLSearchParams({ token, view: 'email' });
  if (email) params.set('email', email);

  const frontendBaseUrl = getFrontendBaseUrl(req);
  if (frontendBaseUrl && !isLoopbackBaseUrl(frontendBaseUrl)) {
    params.set('app', frontendBaseUrl);
  }

  return `${getEmailActionBaseUrl(req)}${pathname}?${params.toString()}`;
};

const buildEmailVerifyUrl = (req, token, email = '') =>
  buildEmailActionUrl(req, '/api/auth/verify-email', token, email);
const buildVerifyUrl = (req, token, email = '') => buildEmailVerifyUrl(req, token, email);
const buildResetUrl = (req, token, email = '') => buildFrontendActionUrl(req, '/forgot-password', token, email);
const getWebAuthnRpName = () => process.env.WEBAUTHN_RP_NAME || 'CDBMS';
const getWebAuthnRpID = () => process.env.WEBAUTHN_RP_ID || new URL(getConfiguredFrontendBaseUrl()).hostname;
const getExpectedOrigins = () =>
  Array.from(
    new Set(
      [process.env.WEBAUTHN_ORIGIN, getConfiguredFrontendBaseUrl()]
        .filter(Boolean)
        .flatMap((value) => String(value).split(',').map((item) => item.trim()).filter(Boolean))
    )
  );

const assertMailConfig = () => {
  if (!hasMailConfig() && !canUseEmailPreviewMode()) {
    const error = new Error(
      'Email delivery is not configured. Add EMAIL_USER and EMAIL_APP_PASSWORD for the server sender account.'
    );
    error.statusCode = 500;
    throw error;
  }
};

const wantsHtmlResponse = (req) =>
  String(req?.query?.view || '').toLowerCase() === 'email' ||
  String(req?.headers?.accept || '').toLowerCase().includes('text/html');

const escapeHtml = (value = '') =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderEmailActionPage = ({
  title,
  message,
  tone = 'success',
  primaryHref = '',
  primaryLabel = '',
  secondaryHref = '',
  secondaryLabel = '',
}) => {
  const palette =
    tone === 'success'
      ? {
          accent: '#10b981',
          soft: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.28)',
        }
      : {
          accent: '#f59e0b',
          soft: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.28)',
        };

  const primaryButton = primaryHref
    ? `<a href="${escapeHtml(primaryHref)}" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 18px;border-radius:999px;background:${palette.accent};color:#ffffff;text-decoration:none;font-weight:700;">${escapeHtml(primaryLabel || 'Continue')}</a>`
    : '';
  const secondaryButton = secondaryHref
    ? `<a href="${escapeHtml(secondaryHref)}" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 18px;border-radius:999px;background:rgba(255,255,255,0.08);color:#e2e8f0;text-decoration:none;font-weight:700;">${escapeHtml(secondaryLabel || 'Back')}</a>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} | CDBMS</title>
  </head>
  <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#020617;padding:24px;font-family:Arial,sans-serif;color:#e2e8f0;">
    <div style="width:100%;max-width:560px;border-radius:28px;padding:36px;background:${palette.soft};border:1px solid ${palette.border};box-shadow:0 25px 80px rgba(0,0,0,0.45);backdrop-filter:blur(8px);">
      <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:${palette.accent};font-weight:800;">CDBMS Account</p>
      <h1 style="margin:0;font-size:32px;line-height:1.15;color:#ffffff;">${escapeHtml(title)}</h1>
      <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#cbd5e1;">${escapeHtml(message)}</p>
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:28px;">
        ${primaryButton}
        ${secondaryButton}
      </div>
    </div>
  </body>
</html>`;
};

const respondToEmailAction = (req, res, { statusCode = 200, title, message, tone, primaryHref, primaryLabel, secondaryHref, secondaryLabel, payload }) => {
  if (!wantsHtmlResponse(req)) {
    return res.status(statusCode).json(payload || { message });
  }

  return res
    .status(statusCode)
    .type('html')
    .send(
      renderEmailActionPage({
        title,
        message,
        tone,
        primaryHref,
        primaryLabel,
        secondaryHref,
        secondaryLabel,
      })
    );
};

const pruneExpiredChallenges = () => {
  const now = Date.now();
  for (const [key, value] of registrationChallenges.entries()) {
    if (value.expiresAt <= now) registrationChallenges.delete(key);
  }
  for (const [key, value] of authenticationChallenges.entries()) {
    if (value.expiresAt <= now) authenticationChallenges.delete(key);
  }
};

const buildProfileResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  organization: user.organization,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  passkeyEnabled: Array.isArray(user.passkeys) && user.passkeys.length > 0,
});

const touchLoginHistory = async (user) => {
  user.lastLoginAt = new Date();
  user.loginHistory.push({ timestamp: new Date() });
  if (user.loginHistory.length > 50) user.loginHistory = user.loginHistory.slice(-50);
  await user.save();
};

const buildEmailDeliveryResponse = ({ delivery, previewUrl, actionUrl, kind }) => {
  const actionMode = getEmailLinkMode(actionUrl || previewUrl || '');

  if (delivery === 'preview') {
    return {
      delivery,
      previewUrl,
      actionUrl: previewUrl,
      actionMode,
      reason: 'missing_sender_app_password',
      message:
        kind === 'verify'
          ? 'Real Gmail sending is off because the server sender app password is missing, so a verification preview link was generated for local testing.'
          : 'Real Gmail sending is off because the server sender app password is missing, so a password reset preview link was generated for local testing.',
    };
  }

  return {
    delivery: 'email',
    previewUrl: '',
    actionUrl: '',
    actionMode,
    message:
      actionMode === 'public_tunnel'
        ? kind === 'verify'
          ? 'Verification link sent. It will work from any phone or laptop while the public tunnel stays online.'
          : 'Password reset link sent. It will work from any phone or laptop while the public tunnel stays online.'
        : actionMode === 'lan'
        ? kind === 'verify'
          ? 'Verification link sent. Open the newest email on another phone or laptop connected to the same Wi-Fi while this server stays running.'
          : 'Password reset link sent. Open the newest email on another phone or laptop connected to the same Wi-Fi while this server stays running.'
        : kind === 'verify'
        ? 'Verification link sent to your email inbox. Verify your email before signing in.'
        : 'Password reset link sent to your email inbox.',
  };
};

const sendActionEmail = async ({ user, rawToken, kind, req }) => {
  const { frontendBaseUrl, actionBaseUrl, actionMode } = await resolveEmailDeliveryTargets(req, kind);
  const actionUrl =
    kind === 'verify'
      ? `${actionBaseUrl}/api/auth/verify-email?${new URLSearchParams({
          token: rawToken,
          view: 'email',
          ...(frontendBaseUrl && !isLoopbackBaseUrl(frontendBaseUrl) ? { app: frontendBaseUrl } : {}),
          ...(user.email ? { email: user.email } : {}),
        }).toString()}`
      : `${frontendBaseUrl}/forgot-password?${new URLSearchParams({
          token: rawToken,
          ...(user.email ? { email: user.email } : {}),
        }).toString()}`;

  if (!hasMailConfig()) {
    if (canUseEmailPreviewMode()) {
      return buildEmailDeliveryResponse({ delivery: 'preview', previewUrl: actionUrl, actionUrl, kind });
    }
    assertMailConfig();
  }

  try {
    if (kind === 'verify') {
      await sendEmail({
        email: user.email,
        subject: 'Verify your CDBMS account',
        message: `Hello ${user.name},\n\nPlease verify your account by opening this link:\n${actionUrl}\n\nThis link expires in ${EMAIL_VERIFY_HOURS} hours.`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Verify your CDBMS account</h2>
            <p>Hello ${user.name},</p>
            <p>Click the button below to verify your account and activate advertiser access.</p>
            <p>
              <a href="${actionUrl}" style="display:inline-block;padding:12px 18px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">
                Verify Email
              </a>
            </p>
            <p>If the button does not open, copy this link into your browser:</p>
            <p>${actionUrl}</p>
            <p>This link expires in ${EMAIL_VERIFY_HOURS} hours.</p>
          </div>
        `,
      });
    } else {
      await sendEmail({
        email: user.email,
        subject: 'Reset your CDBMS password',
        message: `Hello ${user.name},\n\nUse this link to reset your password:\n${actionUrl}\n\nThis link expires in ${RESET_PASSWORD_MINUTES} minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Reset your password</h2>
            <p>Hello ${user.name},</p>
            <p>Click the button below to create a new password for your account.</p>
            <p>
              <a href="${actionUrl}" style="display:inline-block;padding:12px 18px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">
                Reset Password
              </a>
            </p>
            <p>If the button does not open, copy this link into your browser:</p>
            <p>${actionUrl}</p>
            <p>This link expires in ${RESET_PASSWORD_MINUTES} minutes.</p>
          </div>
        `,
      });
    }
  } catch (error) {
    if (canUseEmailPreviewMode()) {
      return buildEmailDeliveryResponse({ delivery: 'preview', previewUrl: actionUrl, actionUrl, kind });
    }
    throw error;
  }

  return buildEmailDeliveryResponse({ delivery: 'email', previewUrl: '', actionUrl, kind, actionMode });
};

const toPasskeyDescriptor = (passkey) => ({
  id: passkey.id,
  transports: Array.isArray(passkey.transports) ? passkey.transports : [],
});

const toStoredCredential = (passkey) => ({
  id: passkey.id,
  publicKey: new Uint8Array(passkey.publicKey),
  counter: Number(passkey.counter || 0),
  transports: Array.isArray(passkey.transports) ? passkey.transports : [],
});

const buildTokenResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  organization: user.organization,
  role: user.role,
  passkeyEnabled: Array.isArray(user.passkeys) && user.passkeys.length > 0,
  token: generateToken(user._id),
});

// @desc    Register a new advertiser and send email verification
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    const normalizedName = cleanName(name);
    const normalizedEmail = cleanEmail(email);

    if (!normalizedName || normalizedName.length < 2) {
      return res.status(400).json({ message: 'Please enter your full name.' });
    }

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      if (!userExists.isEmailVerified) {
        const rawVerificationToken = createRawToken();
        userExists.emailVerificationToken = hashToken(rawVerificationToken);
        userExists.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFY_HOURS * 60 * 60 * 1000);
        if (!userExists.name && normalizedName) {
          userExists.name = normalizedName;
        }
        await userExists.save();

        const emailResult = await sendActionEmail({
          user: userExists,
          rawToken: rawVerificationToken,
          kind: 'verify',
          req,
        });

        return res.status(200).json({
          ...emailResult,
          message:
            emailResult.delivery === 'email'
              ? 'This email is already registered but not verified yet. A fresh verification link has been sent.'
              : 'This email is already registered but not verified yet. A fresh local verification preview link was generated.',
        });
      }
      if (userExists.role === 'admin') {
        return res.status(409).json({
          message: 'This email is already the admin account. Use Sign In instead of creating a new account.',
          canLogin: true,
          isAdminAccount: true,
        });
      }
      return res.status(409).json({
        message: 'This email already has a verified account. Please sign in or use Forgot Password.',
        canLogin: true,
        canResetPassword: true,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const rawVerificationToken = createRawToken();
    const emailVerificationToken = hashToken(rawVerificationToken);
    const emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFY_HOURS * 60 * 60 * 1000);

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'advertiser',
      isEmailVerified: false,
      emailVerificationToken,
      emailVerificationExpires,
    });

    const emailResult = await sendActionEmail({ user, rawToken: rawVerificationToken, kind: 'verify', req });

    return res.status(201).json({
      ...emailResult,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email token
// @route   GET /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res, next) => {
  const token = String(req.query.token || req.body?.token || '').trim();
  const requestedEmail = cleanEmail(req.query.email || req.body?.email);
  const frontendBaseUrl = getFrontendBaseUrl(req);
  const loginUrl = frontendBaseUrl ? `${frontendBaseUrl}/login` : '';
  const resendUrl = frontendBaseUrl
    ? `${frontendBaseUrl}/verify-email${requestedEmail ? `?email=${encodeURIComponent(requestedEmail)}` : ''}`
    : '';

  try {
    if (!token) {
      return respondToEmailAction(req, res, {
        statusCode: 400,
        title: 'Verification Link Missing',
        message: 'This verification link is incomplete. Request a fresh verification email and try again.',
        tone: 'warning',
        primaryHref: resendUrl,
        primaryLabel: 'Request New Link',
        secondaryHref: loginUrl,
        secondaryLabel: 'Back to Login',
        payload: { message: 'Verification token is required.' },
      });
    }

    const hashedToken = hashToken(token);
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      if (requestedEmail) {
        const existingUser = await User.findOne({ email: requestedEmail }).select('isEmailVerified');
        if (existingUser?.isEmailVerified) {
          return respondToEmailAction(req, res, {
            statusCode: 200,
            title: 'Email Already Verified',
            message: 'This email address has already been verified. You can sign in now.',
            tone: 'success',
            primaryHref: loginUrl,
            primaryLabel: 'Go to Login',
            secondaryHref: resendUrl,
            secondaryLabel: 'Verification Help',
            payload: { message: 'Email is already verified. You can sign in.' },
          });
        }
      }

      return respondToEmailAction(req, res, {
        statusCode: 400,
        title: 'Verification Link Expired',
        message: 'This verification link is invalid or has expired. Request a fresh verification email to continue.',
        tone: 'warning',
        primaryHref: resendUrl,
        primaryLabel: 'Send Fresh Verification',
        secondaryHref: loginUrl,
        secondaryLabel: 'Back to Login',
        payload: { message: 'Verification link is invalid or has expired.' },
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    return respondToEmailAction(req, res, {
      statusCode: 200,
      title: 'Email Verified',
      message: 'Your email has been verified successfully. You can now sign in to CDBMS.',
      tone: 'success',
      primaryHref: loginUrl,
      primaryLabel: 'Continue to Login',
      secondaryHref: frontendBaseUrl || '',
      secondaryLabel: 'Open App',
      payload: { message: 'Email verified successfully. You can now sign in.' },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
const resendVerificationEmail = async (req, res, next) => {
  const normalizedEmail = cleanEmail(req.body?.email);

  try {
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'This account is already verified.' });
    }

    const rawVerificationToken = createRawToken();
    user.emailVerificationToken = hashToken(rawVerificationToken);
    user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFY_HOURS * 60 * 60 * 1000);
    await user.save();

    const emailResult = await sendActionEmail({ user, rawToken: rawVerificationToken, kind: 'verify', req });

    return res.json({
      ...emailResult,
      message:
        emailResult.delivery === 'email'
          ? 'A fresh verification link has been sent to your email.'
          : emailResult.message,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const normalizedEmail = cleanEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'This account is currently disabled.' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Verify your email address before signing in.' });
    }

    await touchLoginHistory(user);

    return res.json(buildTokenResponse(user));
  } catch (error) {
    next(error);
  }
};

// @desc    Request password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  const normalizedEmail = cleanEmail(req.body?.email);

  try {
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address.' });
    }

    const rawResetToken = createRawToken();
    user.resetPasswordToken = hashToken(rawResetToken);
    user.resetPasswordExpires = new Date(Date.now() + RESET_PASSWORD_MINUTES * 60 * 1000);
    await user.save();

    const emailResult = await sendActionEmail({ user, rawToken: rawResetToken, kind: 'reset', req });

    return res.json(emailResult);
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res, next) => {
  const token = String(req.params.token || '').trim();
  const { password } = req.body;

  try {
    if (!token) {
      return res.status(400).json({ message: 'Reset token is required.' });
    }

    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const hashedToken = hashToken(token);
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({ message: 'Password reset successful. You can now sign in with your new password.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -passkeys.publicKey');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      ...user.toObject(),
      passkeyEnabled: Array.isArray(user.passkeys) && user.passkeys.length > 0,
      passkeys: (user.passkeys || []).map((passkey) => ({
        id: passkey.id,
        transports: passkey.transports || [],
        label: passkey.label || 'This device',
        createdAt: passkey.createdAt,
        lastUsedAt: passkey.lastUsedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile (name, email)
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const nextName = req.body.name || user.name;
    const nextPhone = req.body.phone ?? user.phone;
    const nextOrganization = req.body.organization ?? user.organization;
    const nextEmail = cleanEmail(req.body.email || user.email);

    if (nextEmail !== user.email) {
      const alreadyExists = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
      if (alreadyExists) {
        return res.status(400).json({ message: 'Another account already uses this email.' });
      }

      const rawVerificationToken = createRawToken();
      user.email = nextEmail;
      user.isEmailVerified = false;
      user.emailVerificationToken = hashToken(rawVerificationToken);
      user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFY_HOURS * 60 * 60 * 1000);
      const emailResult = await sendActionEmail({
        user: { ...user.toObject(), email: nextEmail, name: nextName },
        rawToken: rawVerificationToken,
        kind: 'verify',
        req,
      });
      user.$locals = { ...(user.$locals || {}), emailResult };
    }

    user.name = nextName;
    user.phone = nextPhone;
    user.organization = nextOrganization;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      organization: user.organization,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      passkeyEnabled: Array.isArray(user.passkeys) && user.passkeys.length > 0,
      verificationDelivery: user.$locals?.emailResult?.delivery || '',
      verificationPreviewUrl: user.$locals?.emailResult?.previewUrl || '',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate passkey registration options for the logged-in user
// @route   POST /api/auth/passkey/register/options
// @access  Private
const getPasskeyRegistrationOptions = async (req, res, next) => {
  try {
    pruneExpiredChallenges();

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const options = await generateRegistrationOptions({
      rpName: getWebAuthnRpName(),
      rpID: getWebAuthnRpID(),
      userName: user.email,
      userDisplayName: user.name,
      userID: new TextEncoder().encode(user._id.toString()),
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
        authenticatorAttachment: 'platform',
      },
      excludeCredentials: (user.passkeys || []).map(toPasskeyDescriptor),
      preferredAuthenticatorType: 'localDevice',
    });

    const flowId = createFlowId();
    registrationChallenges.set(flowId, {
      userId: user._id.toString(),
      challenge: options.challenge,
      expiresAt: Date.now() + CEREMONY_WINDOW_MS,
    });

    return res.json({ flowId, options });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify passkey registration response
// @route   POST /api/auth/passkey/register/verify
// @access  Private
const verifyPasskeyRegistration = async (req, res, next) => {
  const { flowId, response, label = 'This device' } = req.body || {};

  try {
    pruneExpiredChallenges();

    const pending = registrationChallenges.get(String(flowId || ''));
    if (!pending) {
      return res.status(400).json({ message: 'Passkey registration session expired. Start again.' });
    }

    const user = await User.findById(req.user._id);
    if (!user || user._id.toString() !== pending.userId) {
      registrationChallenges.delete(String(flowId || ''));
      return res.status(404).json({ message: 'User not found for passkey registration.' });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: pending.challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getWebAuthnRpID(),
      requireUserVerification: true,
    });

    registrationChallenges.delete(String(flowId || ''));

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ message: 'Passkey registration could not be verified.' });
    }

    const credential = verification.registrationInfo.credential;
    const alreadyExists = (user.passkeys || []).some((passkey) => passkey.id === credential.id);
    if (!alreadyExists) {
      user.passkeys.push({
        id: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        transports: response.response?.transports || [],
        deviceType: verification.registrationInfo.credentialDeviceType,
        backedUp: verification.registrationInfo.credentialBackedUp,
        label: String(label || 'This device').trim().slice(0, 40) || 'This device',
      });
      await user.save();
    }

    return res.json({
      message: 'Fingerprint/passkey login enabled for this device.',
      passkeyEnabled: true,
      passkeyCount: user.passkeys.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate passkey authentication options
// @route   POST /api/auth/passkey/authenticate/options
// @access  Public
const getPasskeyAuthenticationOptions = async (req, res, next) => {
  const normalizedEmail = cleanEmail(req.body?.email);
  const discoverable = Boolean(req.body?.discoverable);

  try {
    pruneExpiredChallenges();

    let user = null;
    if (normalizedEmail) {
      user = await User.findOne({ email: normalizedEmail });
      if (!user || !Array.isArray(user.passkeys) || user.passkeys.length === 0) {
        return res.status(404).json({ message: 'No fingerprint login is saved for this email yet.' });
      }
    } else if (!discoverable) {
      return res.status(400).json({ message: 'Email is required for this passkey sign-in.' });
    }

    const options = await generateAuthenticationOptions({
      rpID: getWebAuthnRpID(),
      allowCredentials: user && !discoverable ? user.passkeys.map(toPasskeyDescriptor) : undefined,
      userVerification: 'required',
    });

    const flowId = createFlowId();
    authenticationChallenges.set(flowId, {
      challenge: options.challenge,
      email: normalizedEmail,
      expiresAt: Date.now() + CEREMONY_WINDOW_MS,
    });

    return res.json({ flowId, options });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify passkey authentication response
// @route   POST /api/auth/passkey/authenticate/verify
// @access  Public
const verifyPasskeyAuthentication = async (req, res, next) => {
  const { flowId, response } = req.body || {};

  try {
    pruneExpiredChallenges();

    const pending = authenticationChallenges.get(String(flowId || ''));
    if (!pending) {
      return res.status(400).json({ message: 'Passkey sign-in session expired. Start again.' });
    }

    const user = pending.email
      ? await User.findOne({ email: pending.email })
      : await User.findOne({ 'passkeys.id': response?.id });

    if (!user) {
      authenticationChallenges.delete(String(flowId || ''));
      return res.status(404).json({ message: 'No account matches this passkey.' });
    }

    if (!user.isActive) {
      authenticationChallenges.delete(String(flowId || ''));
      return res.status(403).json({ message: 'This account is currently disabled.' });
    }

    if (!user.isEmailVerified) {
      authenticationChallenges.delete(String(flowId || ''));
      return res.status(403).json({ message: 'Verify your email address before using fingerprint login.' });
    }

    const passkey = (user.passkeys || []).find((item) => item.id === response?.id);
    if (!passkey) {
      authenticationChallenges.delete(String(flowId || ''));
      return res.status(404).json({ message: 'Passkey not found for this account.' });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: pending.challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getWebAuthnRpID(),
      credential: toStoredCredential(passkey),
      requireUserVerification: true,
    });

    authenticationChallenges.delete(String(flowId || ''));

    if (!verification.verified) {
      return res.status(401).json({ message: 'Fingerprint/passkey verification failed.' });
    }

    passkey.counter = verification.authenticationInfo.newCounter;
    passkey.backedUp = verification.authenticationInfo.credentialBackedUp;
    passkey.deviceType = verification.authenticationInfo.credentialDeviceType;
    passkey.lastUsedAt = new Date();
    await touchLoginHistory(user);

    return res.json(buildTokenResponse(user));
  } catch (error) {
    next(error);
  }
};

export {
  registerUser,
  verifyEmail,
  resendVerificationEmail,
  loginUser,
  forgotPassword,
  resetPassword,
  getPasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  getPasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
  getMe,
  updateProfile,
  changePassword,
};
