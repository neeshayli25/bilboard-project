import crypto from 'node:crypto';

const ONLINE_WINDOW_MS = 45 * 1000;

const createScreenCode = () => `SCR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const createDeviceToken = () => crypto.randomBytes(18).toString('hex');

export const buildDisplayConfig = (raw = {}) => ({
  enabled: raw.enabled !== false,
  deviceLabel: raw.deviceLabel || '',
  deviceToken: raw.deviceToken || createDeviceToken(),
  screenCode: raw.screenCode || createScreenCode(),
  lastHeartbeatAt: raw.lastHeartbeatAt || null,
  lastPayloadAt: raw.lastPayloadAt || null,
  lastPlaybackState: raw.lastPlaybackState || 'offline',
  lastNowPlayingTitle: raw.lastNowPlayingTitle || '',
  lastBookingId: raw.lastBookingId || null,
  lastKnownIp: raw.lastKnownIp || '',
  lastKnownUserAgent: raw.lastKnownUserAgent || '',
  browserConnected: Boolean(raw.browserConnected),
  arduinoConnected: Boolean(raw.arduinoConnected),
  serialMode: raw.serialMode || 'none',
  hardwareNotes: raw.hardwareNotes || '',
});

export const getDisplayConnectivity = (raw = {}, now = new Date()) => {
  const displayConfig = buildDisplayConfig(raw);
  const lastHeartbeatAt = displayConfig.lastHeartbeatAt ? new Date(displayConfig.lastHeartbeatAt) : null;
  const isOnline = Boolean(lastHeartbeatAt && now.getTime() - lastHeartbeatAt.getTime() <= ONLINE_WINDOW_MS);

  return {
    isOnline,
    onlineStatus: isOnline ? 'online' : 'offline',
    lastHeartbeatAt: displayConfig.lastHeartbeatAt || null,
  };
};

export const sanitizeDisplayConfigForAdmin = (raw = {}, now = new Date()) => {
  const displayConfig = buildDisplayConfig(raw);
  const connectivity = getDisplayConnectivity(displayConfig, now);

  return {
    enabled: displayConfig.enabled,
    deviceLabel: displayConfig.deviceLabel,
    deviceToken: displayConfig.deviceToken,
    screenCode: displayConfig.screenCode,
    lastHeartbeatAt: displayConfig.lastHeartbeatAt,
    lastPayloadAt: displayConfig.lastPayloadAt,
    lastPlaybackState: displayConfig.lastPlaybackState,
    lastNowPlayingTitle: displayConfig.lastNowPlayingTitle,
    lastBookingId: displayConfig.lastBookingId,
    lastKnownIp: displayConfig.lastKnownIp,
    lastKnownUserAgent: displayConfig.lastKnownUserAgent,
    browserConnected: displayConfig.browserConnected,
    arduinoConnected: displayConfig.arduinoConnected,
    serialMode: displayConfig.serialMode,
    hardwareNotes: displayConfig.hardwareNotes,
    isOnline: connectivity.isOnline,
    onlineStatus: connectivity.onlineStatus,
  };
};

export const sanitizeDisplayConfigForDevice = (raw = {}, now = new Date()) => {
  const displayConfig = buildDisplayConfig(raw);
  const connectivity = getDisplayConnectivity(displayConfig, now);

  return {
    enabled: displayConfig.enabled,
    deviceLabel: displayConfig.deviceLabel,
    screenCode: displayConfig.screenCode,
    browserConnected: displayConfig.browserConnected,
    arduinoConnected: displayConfig.arduinoConnected,
    serialMode: displayConfig.serialMode,
    lastHeartbeatAt: displayConfig.lastHeartbeatAt,
    lastPayloadAt: displayConfig.lastPayloadAt,
    lastPlaybackState: displayConfig.lastPlaybackState,
    lastNowPlayingTitle: displayConfig.lastNowPlayingTitle,
    isOnline: connectivity.isOnline,
    onlineStatus: connectivity.onlineStatus,
  };
};

export const ensureBillboardDisplayConfig = async (billboard) => {
  if (!billboard) return billboard;

  const nextDisplayConfig = buildDisplayConfig(billboard.displayConfig || {});
  const currentToken = billboard.displayConfig?.deviceToken || '';
  const currentScreenCode = billboard.displayConfig?.screenCode || '';

  if (currentToken === nextDisplayConfig.deviceToken && currentScreenCode === nextDisplayConfig.screenCode) {
    billboard.displayConfig = {
      ...nextDisplayConfig,
      ...(billboard.displayConfig?.toObject ? billboard.displayConfig.toObject() : billboard.displayConfig || {}),
    };
    return billboard;
  }

  billboard.displayConfig = nextDisplayConfig;
  await billboard.save();
  return billboard;
};

export const doesDeviceTokenMatch = (billboard, providedToken = '') => {
  const expectedToken = billboard?.displayConfig?.deviceToken || '';
  if (!expectedToken) return true;
  return String(providedToken || '').trim() === expectedToken;
};
