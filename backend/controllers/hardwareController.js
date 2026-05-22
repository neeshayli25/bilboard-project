import crypto from 'node:crypto';
import Booking from '../models/Booking.js';
import Billboard from '../models/Billboard.js';
import { getBillboardByIdOrName, isValidObjectId } from '../utils/billboardHelper.js';
import {
  doesDeviceTokenMatch,
  ensureBillboardDisplayConfig,
  sanitizeDisplayConfigForAdmin,
  sanitizeDisplayConfigForDevice,
} from '../utils/displayConfig.js';
import { extractTimeRangeFromSlot, parseTimePartToMinutes } from '../utils/bookingUtils.js';

const manualDisplayOverrides = new Map();

// Display Now override lasts exactly 1 minute then screen returns to idle
const MANUAL_OVERRIDE_MS = 1 * 60 * 1000;

// ─── PKT Timezone Fix ─────────────────────────────────────────────────────────
// Render.com servers run on UTC. Pakistan Standard Time = UTC+5.
// Without this fix, isCurrentTimeInsideSlot() compares UTC hours against PKT
// slot times and never matches — scheduled ads never play.
//
// getNowPKT() returns a Date whose *UTC fields* represent PKT wall-clock time.
// Example: UTC 21:32 May 21  →  getNowPKT().getUTCHours() = 2
//                                getNowPKT().getUTCDate()  = 22   (2:32 AM May 22 PKT)
//
// To change timezone: update PKT_OFFSET_HOURS (e.g. 0 for UTC, 5 for PKT).
const PKT_OFFSET_HOURS = 5;
const PKT_OFFSET_MS    = PKT_OFFSET_HOURS * 60 * 60 * 1000;
const getNowPKT        = () => new Date(Date.now() + PKT_OFFSET_MS);

const getIsoNow = () => new Date().toISOString();

const getDeviceToken = (req) =>
  String(req.headers['x-device-token'] || req.query?.token || req.body?.token || '').trim();

// ─── Summary builders ─────────────────────────────────────────────────────────

const buildBillboardSummary = (billboard) => ({
  id:         billboard?._id || billboard || '',
  name:       billboard?.name || '',
  city:       billboard?.city || '',
  location:   billboard?.location || '',
  imageUrl:   billboard?.imageUrl || '',
  size:       billboard?.size || '',
  type:       billboard?.type || '',
  resolution: billboard?.resolution || '',
  status:     billboard?.status || '',
});

const buildAdSummary = (ad = {}) => ({
  id:          ad?._id || '',
  title:       ad?.title || 'Scheduled Ad',
  mediaUrl:    ad?.mediaUrl
    ? `https://cdbms-backend-w86i.onrender.com${ad.mediaUrl}`
    : '',
  mediaType:   ad?.mediaType || 'image',
  duration:    Number(ad?.duration) || 30,
  description: ad?.description || '',
});

const buildIdleContent = (billboard = null) => ({
  bookingId:   '',
  billboardId: billboard?._id || '',
  title:       'No ad scheduled',
  mediaUrl:    '',
  imageUrl:    '',
  mediaType:   'image',
  duration:    30,
  description: '',
  status:      'idle',
  source:      'schedule',
  timeSlot:    '',
  date:        null,
  updatedAt:   getIsoNow(),
  ad:          buildAdSummary(null),
  billboard:   buildBillboardSummary(billboard),
});

// ─── Time helpers (PKT-aware) ─────────────────────────────────────────────────

/**
 * Returns UTC timestamps bracketing "today in PKT" for MongoDB queries.
 *
 * Why: booking.date is stored as UTC-midnight of the chosen date
 * (e.g. 2026-05-22T00:00:00Z). At 2:32 AM PKT the server UTC clock shows
 * 21:32 May 21, so a plain setHours(0,0,0,0) gives May 21 bounds and misses
 * the May 22 booking entirely. Using getNowPKT() fixes this.
 */
const getTodayBounds = (nowPKT = getNowPKT()) => {
  const y = nowPKT.getUTCFullYear();
  const m = nowPKT.getUTCMonth();
  const d = nowPKT.getUTCDate();
  // PKT midnight expressed in UTC
  const dayStart = new Date(Date.UTC(y, m, d) - PKT_OFFSET_MS);
  const dayEnd   = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return { dayStart, dayEnd };
};

const getSlotWindow = (timeSlot = '') => {
  const [rawStart = '', rawEnd = ''] = extractTimeRangeFromSlot(timeSlot).split('-');
  return {
    startMinutes: parseTimePartToMinutes(rawStart),
    endMinutes:   parseTimePartToMinutes(rawEnd),
  };
};

/**
 * Checks whether the current PKT time falls inside a booked timeSlot.
 * Uses getUTCHours/Minutes on the PKT-shifted Date so arithmetic is in PKT.
 *
 * Example: slot "2:32 AM-2:34 AM", PKT time 2:33 AM
 *   startMinutes = 152, endMinutes = 154
 *   nowMinutes   = getNowPKT().getUTCHours()*60 + getUTCMinutes() = 153  ✓
 */
const isCurrentTimeInsideSlot = (timeSlot = '', nowPKT = getNowPKT()) => {
  const { startMinutes, endMinutes } = getSlotWindow(timeSlot);
  const nowMinutes = nowPKT.getUTCHours() * 60 + nowPKT.getUTCMinutes();
  return startMinutes < endMinutes && nowMinutes >= startMinutes && nowMinutes < endMinutes;
};

const scheduleSort = (a, b) => {
  const slotA = getSlotWindow(a.timeSlot);
  const slotB = getSlotWindow(b.timeSlot);
  return slotA.startMinutes - slotB.startMinutes
    || new Date(a.createdAt) - new Date(b.createdAt);
};

const findCurrentBooking = (schedule = [], nowPKT = getNowPKT()) =>
  schedule.find((b) => isCurrentTimeInsideSlot(b.timeSlot, nowPKT)) || null;

const bookingHasPlayableAd = (booking) =>
  Boolean(
    booking?.ad &&
      booking.ad.mediaUrl &&
      booking.ad.isActive !== false &&
      booking.ad.approvalStatus !== 'rejected'
  );

// ─── Entry builders ───────────────────────────────────────────────────────────

const toScheduleEntry = (booking, nowPKT = getNowPKT()) => ({
  bookingId:     booking._id,
  timeSlot:      booking.timeSlot,
  date:          booking.date,
  isCurrent:     isCurrentTimeInsideSlot(booking.timeSlot, nowPKT),
  status:        booking.status,
  paymentStatus: booking.paymentStatus,
  billboard:     buildBillboardSummary(booking.billboard),
  ad:            buildAdSummary(booking.ad),
});

const toDisplayContent = (booking, nowPKT = getNowPKT(), source = 'schedule') => {
  const ad = buildAdSummary(booking.ad);
  return {
    bookingId:   booking._id,
    billboardId: booking.billboard?._id || booking.billboard || '',
    title:       ad.title,
    mediaUrl:    ad.mediaUrl,
    imageUrl:    ad.mediaUrl,
    mediaType:   ad.mediaType,
    duration:    ad.duration,
    description: ad.description,
    // Always derive status from real-time PKT slot check — never trust stale booking.status
    status:      isCurrentTimeInsideSlot(booking.timeSlot, getNowPKT()) ? 'active' : 'idle',
    source,
    timeSlot:    booking.timeSlot,
    date:        booking.date,
    updatedAt:   getIsoNow(),
    ad,
    billboard:   buildBillboardSummary(booking.billboard),
  };
};

const buildDisplayEnvelope = ({ billboard, type, content, schedule = [], nowPKT = getNowPKT() }) => ({
  type,
  content,
  current:    content,
  billboard:  buildBillboardSummary(billboard),
  device:     sanitizeDisplayConfigForDevice(billboard?.displayConfig || {}, nowPKT),
  schedule:   schedule.map((b) => toScheduleEntry(b, nowPKT)),
  serverTime: new Date().toISOString(),
});

const buildLegacyDisplayResponse = (envelope) => ({
  ...envelope.content,
  type:       envelope.type,
  content:    envelope.content,
  current:    envelope.current,
  billboard:  envelope.billboard,
  device:     envelope.device,
  schedule:   envelope.schedule,
  serverTime: envelope.serverTime,
});

// ─── DB / auth helpers ────────────────────────────────────────────────────────

const loadBillboardWithConfig = async (idOrName) => {
  const billboard = await getBillboardByIdOrName(idOrName);
  if (!billboard) return null;
  await ensureBillboardDisplayConfig(billboard);
  return billboard;
};

const assertBillboardAccess = (billboard, userId, res) => {
  if (!billboard || String(billboard.createdBy) !== String(userId)) {
    res.status(403).json({ message: 'Not authorized for this billboard.' });
    return false;
  }
  return true;
};

const verifyDeviceToken = (billboard, req, res) => {
  const provided = getDeviceToken(req);
  const expected = String(billboard?.displayConfig?.deviceToken || '').trim();

  if (!expected) {
    res.status(403).json({ message: 'Display device token is not registered for this billboard.' });
    return false;
  }
  if (!provided || !doesDeviceTokenMatch(billboard, provided)) {
    res.status(403).json({ message: 'Invalid display device token.' });
    return false;
  }
  return true;
};

// ─── Manual override (Display Now) ───────────────────────────────────────────

const setManualOverride = (billboard, content) => {
  const expiresAt = Date.now() + MANUAL_OVERRIDE_MS;
  const payload   = { ...content, source: 'manual_push', status: 'active', updatedAt: getIsoNow() };

  manualDisplayOverrides.set(String(billboard._id), { ...payload, expiresAt });

  billboard.displayConfig = {
    ...(billboard.displayConfig?.toObject
      ? billboard.displayConfig.toObject()
      : billboard.displayConfig || {}),
    manualOverrideExpiresAt: new Date(expiresAt),
    manualOverridePayload:   payload,
  };

  return payload;
};

const getManualOverride = async (billboard) => {
  const billboardId    = String(billboard?._id || '');
  const memoryOverride = manualDisplayOverrides.get(billboardId);

  // In-memory hit (server hasn't restarted)
  if (memoryOverride?.expiresAt > Date.now()) return memoryOverride;
  if (memoryOverride) manualDisplayOverrides.delete(billboardId);

  // Fall back to DB-persisted override (survives server restart)
  const dc              = billboard?.displayConfig?.toObject
    ? billboard.displayConfig.toObject()
    : billboard?.displayConfig || {};
  const persistedExpiry = dc.manualOverrideExpiresAt
    ? new Date(dc.manualOverrideExpiresAt).getTime()
    : 0;

  if (dc.manualOverridePayload && persistedExpiry > Date.now()) {
    return { ...dc.manualOverridePayload, expiresAt: persistedExpiry };
  }

  // Override expired — clear from DB
  if (dc.manualOverridePayload || dc.manualOverrideExpiresAt) {
    billboard.displayConfig = {
      ...dc,
      manualOverrideExpiresAt: null,
      manualOverridePayload:   null,
    };
    await billboard.save();
  }

  return null;
};

// ─── Schedule loader ──────────────────────────────────────────────────────────

const getScheduleForBillboard = async (billboardId, nowPKT = getNowPKT()) => {
  // getTodayBounds uses PKT-aware nowPKT so the correct UTC date window is queried
  const { dayStart, dayEnd } = getTodayBounds(nowPKT);

  const bookings = await Booking.find({
    billboard:     billboardId,
    date:          { $gte: dayStart, $lt: dayEnd },
    status:        { $in: ['approved', 'scheduled', 'active'] },
    paymentStatus: 'paid',
  })
    .populate('ad',        'title mediaUrl mediaType duration description approvalStatus isActive')
    .populate('billboard', 'name city location imageUrl size type resolution status displayConfig')
    .sort({ date: 1, createdAt: 1 });

  return bookings.filter(bookingHasPlayableAd).sort(scheduleSort);
};

// ─── Core display-state resolver ──────────────────────────────────────────────

const resolveDisplayState = async (billboard, nowPKT = getNowPKT()) => {
  const schedule       = await getScheduleForBillboard(billboard._id, nowPKT);
  const manualOverride = await getManualOverride(billboard);

  // 1. Active Display-Now override always wins over schedule
  if (manualOverride?.mediaUrl || manualOverride?.imageUrl) {
    return {
      type: 'active',
      content: {
        ...manualOverride,
        mediaUrl: manualOverride.mediaUrl || manualOverride.imageUrl || '',
        imageUrl: manualOverride.imageUrl || manualOverride.mediaUrl || '',
      },
      schedule,
    };
  }

  // 2. Currently-active scheduled booking (PKT slot check)
  const currentBooking = findCurrentBooking(schedule, nowPKT);
  if (currentBooking) {
    if (currentBooking.status !== 'active') {
      currentBooking.status = 'active';
      await currentBooking.save();
    }
    return {
      type:    'active',
      content: toDisplayContent(currentBooking, nowPKT, 'schedule'),
      schedule,
    };
  }

  // 3. Nothing active — idle
  return {
    type:    'idle',
    content: buildIdleContent(billboard),
    schedule,
  };
};

// ─── Playback-state updater ───────────────────────────────────────────────────

const updateBillboardPlaybackState = async (billboard, content, req) => {
  billboard.displayConfig = {
    ...(billboard.displayConfig?.toObject
      ? billboard.displayConfig.toObject()
      : billboard.displayConfig || {}),
    lastPayloadAt:       new Date(),
    lastPlaybackState:   content.status || 'idle',
    lastNowPlayingTitle: content.title  || '',
    lastBookingId:       content.bookingId || null,
    lastKnownIp:         req.ip || billboard.displayConfig?.lastKnownIp || '',
    lastKnownUserAgent:  req.get('user-agent') || billboard.displayConfig?.lastKnownUserAgent || '',
  };
  await billboard.save();
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTED CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Public billboard details ─────────────────────────────────────────────────
export const getBillboardPublicDetails = async (req, res) => {
  try {
    const billboard = await loadBillboardWithConfig(req.params.id);
    if (!billboard) return res.status(404).json({ message: 'Billboard not found' });

    const nowPKT = getNowPKT();
    const state  = await resolveDisplayState(billboard, nowPKT);

    return res.json({
      billboard: {
        ...buildBillboardSummary(billboard),
        pricePerHour:   billboard.pricePerHour,
        pricePerMinute: billboard.pricePerMinute,
        timeSlots:      billboard.timeSlots || [],
      },
      display: buildDisplayEnvelope({
        billboard,
        type:     state.type,
        content:  state.content,
        schedule: state.schedule,
        nowPKT,
      }),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load billboard', error: error.message });
  }
};

// ─── Push booking to display (shared — used by admin & advertiser) ────────────
export const pushBookingToDisplay = async ({ bookingId, actorId, actorMode = 'admin', req }) => {
  if (!isValidObjectId(bookingId)) {
    return { status: 400, body: { message: 'Invalid Booking ID' } };
  }

  const booking = await Booking.findById(bookingId)
    .populate('billboard', 'name city location imageUrl size type resolution createdBy displayConfig status')
    .populate('ad',        'title mediaUrl mediaType duration description approvalStatus isActive');

  if (!booking) return { status: 404, body: { message: 'Booking not found' } };

  const hasAccess =
    actorMode === 'advertiser'
      ? String(booking.advertiser) === String(actorId)
      : String(booking.billboard?.createdBy) === String(actorId);

  if (!hasAccess) {
    return {
      status: 403,
      body: {
        message: actorMode === 'advertiser'
          ? 'Not authorized for this booking.'
          : 'Not authorized for this billboard.',
      },
    };
  }

  if (
    !bookingHasPlayableAd(booking) ||
    booking.paymentStatus !== 'paid' ||
    !['approved', 'scheduled', 'active'].includes(booking.status)
  ) {
    return {
      status: 400,
      body: { message: 'Only paid bookings with playable ad media can be pushed to the display.' },
    };
  }

  await ensureBillboardDisplayConfig(booking.billboard);
  const nowPKT  = getNowPKT();
  const content = setManualOverride(
    booking.billboard,
    toDisplayContent(booking, nowPKT, 'manual_push')
  );
  await updateBillboardPlaybackState(booking.billboard, content, req);
  await booking.billboard.save();

  const schedule = await getScheduleForBillboard(booking.billboard._id, nowPKT);
  const envelope = buildDisplayEnvelope({
    billboard: booking.billboard,
    type:      'active',
    content,
    schedule,
    nowPKT,
  });

  return { status: 200, body: { message: 'Sent to display', data: envelope } };
};

// ─── Admin: Display Now ───────────────────────────────────────────────────────
export const sendAdToDisplay = async (req, res) => {
  try {
    const {
      bookingId,
      billboardId,
      imageUrl,
      mediaUrl,
      mediaType = 'image',
      duration  = 30,
      title     = 'Live Campaign',
    } = req.body;

    if (bookingId) {
      const result = await pushBookingToDisplay({
        bookingId,
        actorId:   req.user._id,
        actorMode: 'admin',
        req,
      });
      return res.status(result.status).json(result.body);
    }

    const billboard = await loadBillboardWithConfig(billboardId);
    if (!billboard) return res.status(404).json({ message: 'Billboard not found' });
    if (!assertBillboardAccess(billboard, req.user._id, res)) return;

    const resolvedMedia = mediaUrl || imageUrl || '';
    const nowPKT        = getNowPKT();

    const content = setManualOverride(billboard, {
      ...buildIdleContent(billboard),
      title,
      mediaUrl:  resolvedMedia,
      imageUrl:  resolvedMedia,
      mediaType,
      duration:  Number(duration) || 30,
      status:    'active',
      source:    'manual_push',
      ad: buildAdSummary({ title, mediaUrl: resolvedMedia, mediaType, duration }),
    });

    await updateBillboardPlaybackState(billboard, content, req);
    await billboard.save();

    const envelope = buildDisplayEnvelope({
      billboard,
      type:     'active',
      content,
      schedule: [],
      nowPKT,
    });

    return res.status(200).json({ message: 'Sent to display', data: envelope });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to send ad to display', error: error.message });
  }
};

// ─── Admin: display registry ──────────────────────────────────────────────────
export const getDisplayRegistry = async (req, res) => {
  try {
    const billboards = await Billboard.find({})
      .select('name city location status imageUrl size type resolution displayConfig createdAt')
      .sort({ name: 1, createdAt: -1 });

    await Promise.all(billboards.map((b) => ensureBillboardDisplayConfig(b)));

    return res.json(
      billboards.map((b) => ({
        ...buildBillboardSummary(b),
        displayConfig: sanitizeDisplayConfigForAdmin(b.displayConfig || {}, new Date()),
      }))
    );
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load display registry', error: error.message });
  }
};

// ─── Pi: current display content (legacy flat response) ──────────────────────
// Route: GET /hardware/display  (query param ?billboardId=)
export const getCurrentDisplayContent = async (req, res) => {
  try {
    const billboardRef = req.query.billboardId || req.query.id || req.params.id;

    if (!billboardRef) {
      const fallback = buildIdleContent();
      return res.status(200).json(
        buildLegacyDisplayResponse({
          type:       'idle',
          content:    fallback,
          current:    fallback,
          billboard:  buildBillboardSummary(null),
          device:     sanitizeDisplayConfigForDevice({}, new Date()),
          schedule:   [],
          serverTime: getIsoNow(),
        })
      );
    }

    const billboard = await loadBillboardWithConfig(billboardRef);
    if (!billboard) return res.status(404).json({ message: 'Billboard not found' });
    if (!verifyDeviceToken(billboard, req, res)) return;

    const nowPKT   = getNowPKT();
    const state    = await resolveDisplayState(billboard, nowPKT);
    const envelope = buildDisplayEnvelope({
      billboard,
      type:     state.type,
      content:  state.content,
      schedule: state.schedule,
      nowPKT,
    });
    await updateBillboardPlaybackState(billboard, state.content, req);

    return res.status(200).json(buildLegacyDisplayResponse(envelope));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load current display content', error: error.message });
  }
};

// ─── Pi: display content by billboard ID ─────────────────────────────────────
// Route: GET /hardware/display/:billboardId
export const getDisplayContent = async (req, res) => {
  try {
    // FIX: req.params.billboardId matches route param :billboardId (was .id)
    const billboard = await loadBillboardWithConfig(req.params.billboardId);
    if (!billboard) return res.status(404).json({ message: 'Billboard not found' });
    if (!verifyDeviceToken(billboard, req, res)) return;

    const nowPKT   = getNowPKT();
    const state    = await resolveDisplayState(billboard, nowPKT);
    const envelope = buildDisplayEnvelope({
      billboard,
      type:     state.type,
      content:  state.content,
      schedule: state.schedule,
      nowPKT,
    });
    await updateBillboardPlaybackState(billboard, state.content, req);

    return res.status(200).json(envelope);
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching hardware display', error: error.message });
  }
};

// ─── Pi: heartbeat ────────────────────────────────────────────────────────────
// Route: POST /hardware/heartbeat/:billboardId
export const reportDisplayHeartbeat = async (req, res) => {
  try {
    // FIX: req.params.billboardId matches route param :billboardId (was .id)
    const billboard = await loadBillboardWithConfig(req.params.billboardId);
    if (!billboard) return res.status(404).json({ message: 'Billboard not found' });
    if (!verifyDeviceToken(billboard, req, res)) return;

    const now = new Date();
    const {
      deviceLabel      = '',
      browserConnected = true,
      arduinoConnected = false,
      serialMode       = 'raspberry_pi_native_player',
      playbackState    = 'idle',
      nowPlayingTitle  = '',
      bookingId        = '',
      hardwareNotes    = '',
    } = req.body || {};

    billboard.displayConfig = {
      ...(billboard.displayConfig?.toObject
        ? billboard.displayConfig.toObject()
        : billboard.displayConfig || {}),
      deviceLabel:         String(deviceLabel || billboard.displayConfig?.deviceLabel || '').trim(),
      lastHeartbeatAt:     now,
      lastPlaybackState:   String(playbackState || 'idle').trim() || 'idle',
      lastNowPlayingTitle: String(nowPlayingTitle || '').trim(),
      lastBookingId:       bookingId || null,
      lastKnownIp:         req.ip || '',
      lastKnownUserAgent:  req.get('user-agent') || '',
      browserConnected:    Boolean(browserConnected),
      arduinoConnected:    Boolean(arduinoConnected),
      serialMode:          String(serialMode || 'raspberry_pi_native_player').trim(),
      hardwareNotes:       String(hardwareNotes || '').trim().slice(0, 250),
    };
    await billboard.save();

    const nowPKT = getNowPKT();
    const state  = await resolveDisplayState(billboard, nowPKT);

    return res.json({
      message:     'Heartbeat received.',
      heartbeatId: crypto.randomUUID(),
      device:      sanitizeDisplayConfigForAdmin(billboard.displayConfig, now),
      current:     state.content,
      type:        state.type,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to record display heartbeat', error: error.message });
  }
};

// ─── Admin: hardware status for one billboard ─────────────────────────────────
export const getBillboardHardwareStatus = async (req, res) => {
  try {
    const billboard = await loadBillboardWithConfig(req.params.id);
    if (!billboard) return res.status(404).json({ message: 'Billboard not found' });
    if (!assertBillboardAccess(billboard, req.user._id, res)) return;

    const nowPKT = getNowPKT();
    const state  = await resolveDisplayState(billboard, nowPKT);

    return res.json({
      billboard: {
        ...buildBillboardSummary(billboard),
        displayConfig: sanitizeDisplayConfigForAdmin(billboard.displayConfig, new Date()),
      },
      current:  state.content,
      type:     state.type,
      schedule: state.schedule.map((b) => toScheduleEntry(b, nowPKT)),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load billboard hardware status', error: error.message });
  }
};

// ─── Admin: register a display device ────────────────────────────────────────
export const registerDisplayDevice = async (req, res) => {
  try {
    const billboard = await loadBillboardWithConfig(req.params.id);
    if (!billboard) return res.status(404).json({ message: 'Billboard not found' });
    if (!assertBillboardAccess(billboard, req.user._id, res)) return;

    billboard.displayConfig = {
      ...(billboard.displayConfig?.toObject
        ? billboard.displayConfig.toObject()
        : billboard.displayConfig || {}),
      deviceLabel:       String(req.body?.deviceLabel || billboard.displayConfig?.deviceLabel || billboard.name || '').trim(),
      browserConnected:  false,
      arduinoConnected:  false,
      serialMode:        'raspberry_pi_native_player',
      lastPlaybackState: 'registered',
    };
    await ensureBillboardDisplayConfig(billboard);
    await billboard.save();

    return res.json({
      message:       'Display device registered.',
      billboard:     buildBillboardSummary(billboard),
      displayConfig: sanitizeDisplayConfigForAdmin(billboard.displayConfig),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to register display device', error: error.message });
  }
};

// ─── Admin: rotate device token ───────────────────────────────────────────────
export const rotateBillboardDeviceToken = async (req, res) => {
  try {
    const billboard = await Billboard.findById(req.params.id);
    if (!billboard) return res.status(404).json({ message: 'Billboard not found' });

    const newToken = crypto.randomBytes(18).toString('hex');
    billboard.displayConfig = { ...(billboard.displayConfig || {}), deviceToken: newToken };
    await billboard.save();

    return res.json({ success: true, token: newToken, billboardId: billboard._id });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};