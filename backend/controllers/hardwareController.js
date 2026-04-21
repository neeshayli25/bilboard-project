import crypto from 'node:crypto';
import Booking from '../models/Booking.js';
import Billboard from '../models/Billboard.js';
import {
  doesDeviceTokenMatch,
  ensureBillboardDisplayConfig,
  sanitizeDisplayConfigForAdmin,
  sanitizeDisplayConfigForDevice,
} from '../utils/displayConfig.js';
import { parseTimePartToMinutes } from '../utils/bookingUtils.js';

const manualDisplayOverrides = new Map();
const MANUAL_OVERRIDE_MS = 20 * 60 * 1000;

const buildBillboardSummary = (billboard) => ({
  id: billboard?._id || billboard || '',
  name: billboard?.name || '',
  city: billboard?.city || '',
  location: billboard?.location || '',
  imageUrl: billboard?.imageUrl || '',
  size: billboard?.size || '',
  type: billboard?.type || '',
  resolution: billboard?.resolution || '',
});

const buildAdSummary = (ad) => ({
  id: ad?._id || '',
  title: ad?.title || 'Scheduled Ad',
  mediaUrl: ad?.mediaUrl || '',
  mediaType: ad?.mediaType || 'image',
  duration: ad?.duration || 30,
  description: ad?.description || '',
});

const getTodayBounds = (now = new Date()) => {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
};

const buildIdlePayload = (billboard = null) => ({
  bookingId: '',
  billboardId: billboard?._id || '',
  imageUrl: '',
  mediaType: 'image',
  duration: 30,
  title: 'No ad scheduled',
  status: 'idle',
  updatedAt: new Date().toISOString(),
  source: 'schedule',
  timeSlot: '',
  date: null,
  billboard: buildBillboardSummary(billboard),
  ad: buildAdSummary(null),
});

const parseTimeTokenToMinutes = (value = '') => parseTimePartToMinutes(String(value || '').trim());

const getSlotWindow = (timeSlot = '') => {
  const [rawStart = '', rawEnd = ''] = String(timeSlot || '').split('-');
  return {
    startMinutes: parseTimeTokenToMinutes(rawStart),
    endMinutes: parseTimeTokenToMinutes(rawEnd),
  };
};

const isCurrentTimeInsideSlot = (timeSlot, currentDate = new Date()) => {
  const { startMinutes, endMinutes } = getSlotWindow(timeSlot);
  const nowMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
  return startMinutes < endMinutes && nowMinutes >= startMinutes && nowMinutes < endMinutes;
};

const scheduleSort = (bookingA, bookingB) => {
  const slotA = getSlotWindow(bookingA.timeSlot);
  const slotB = getSlotWindow(bookingB.timeSlot);
  return slotA.startMinutes - slotB.startMinutes;
};

const toScheduleEntry = (booking, now = new Date()) => ({
  bookingId: booking._id,
  timeSlot: booking.timeSlot,
  date: booking.date,
  isCurrent: isCurrentTimeInsideSlot(booking.timeSlot, now),
  status: booking.status,
  paymentStatus: booking.paymentStatus,
  billboard: buildBillboardSummary(booking.billboard),
  ad: buildAdSummary(booking.ad),
});

const toDisplayPayload = (booking, source = 'schedule') => ({
  bookingId: booking._id,
  billboardId: booking.billboard?._id || booking.billboard || '',
  imageUrl: booking.ad?.mediaUrl || '',
  mediaType: booking.ad?.mediaType || 'image',
  duration: booking.ad?.duration || 30,
  title: booking.ad?.title || 'Scheduled Ad',
  timeSlot: booking.timeSlot,
  date: booking.date,
  status: booking.status === 'active' ? 'active' : 'scheduled',
  updatedAt: new Date().toISOString(),
  source,
  billboard: buildBillboardSummary(booking.billboard),
  ad: buildAdSummary(booking.ad),
});

const getDeviceToken = (req) =>
  String(req.query?.token || req.body?.token || req.headers['x-device-token'] || '').trim();

const assertBillboardAccess = (billboard, userId, res) => {
  if (!billboard || String(billboard.createdBy) !== String(userId)) {
    res.status(403).json({ message: 'Not authorized for this billboard.' });
    return false;
  }
  return true;
};

const setManualOverride = (billboardId, payload) => {
  manualDisplayOverrides.set(String(billboardId), {
    ...payload,
    expiresAt: Date.now() + MANUAL_OVERRIDE_MS,
  });
};

const getManualOverride = (billboardId) => {
  const override = manualDisplayOverrides.get(String(billboardId));
  if (!override) return null;
  if (override.expiresAt <= Date.now()) {
    manualDisplayOverrides.delete(String(billboardId));
    return null;
  }
  return override;
};

const loadBillboardWithConfig = async (billboardId) => {
  const billboard = await Billboard.findById(billboardId);
  if (!billboard) return null;
  await ensureBillboardDisplayConfig(billboard);
  return billboard;
};

const verifyDeviceToken = (billboard, req, res) => {
  const providedToken = getDeviceToken(req);
  if (!doesDeviceTokenMatch(billboard, providedToken)) {
    res.status(403).json({ message: 'Invalid display device token.' });
    return false;
  }
  return true;
};

const getScheduleForBillboard = async (billboardId, now = new Date()) => {
  const { dayStart, dayEnd } = getTodayBounds(now);

  const bookings = await Booking.find({
    billboard: billboardId,
    date: { $gte: dayStart, $lt: dayEnd },
    status: { $in: ['scheduled', 'active'] },
    paymentStatus: 'paid',
  })
    .populate('ad', 'title mediaUrl mediaType duration description')
    .populate('billboard', 'name city location imageUrl size type resolution displayConfig')
    .sort({ date: 1, createdAt: 1 });

  return bookings.sort(scheduleSort);
};

const buildDisplayResponse = ({ billboard, payload, schedule, now = new Date() }) => ({
  ...payload,
  device: sanitizeDisplayConfigForDevice(billboard?.displayConfig || {}, now),
  schedule: schedule.map((booking) => toScheduleEntry(booking, now)),
});

const updateBillboardPlaybackState = async (billboard, payload, req) => {
  const now = new Date();
  billboard.displayConfig = {
    ...(billboard.displayConfig?.toObject ? billboard.displayConfig.toObject() : billboard.displayConfig || {}),
    lastPayloadAt: now,
    lastPlaybackState: payload.status || 'idle',
    lastNowPlayingTitle: payload.title || '',
    lastBookingId: payload.bookingId || null,
    lastKnownIp: req.ip || billboard.displayConfig?.lastKnownIp || '',
    lastKnownUserAgent: req.get('user-agent') || billboard.displayConfig?.lastKnownUserAgent || '',
  };
  await billboard.save();
};

export const pushBookingToDisplay = async ({ bookingId, actorId, actorMode = 'admin', req }) => {
  const booking = await Booking.findById(bookingId)
    .populate('billboard', 'name city location imageUrl size type resolution createdBy displayConfig')
    .populate('ad', 'title mediaUrl mediaType duration description');

  if (!booking) {
    return { status: 404, body: { message: 'Booking not found' } };
  }

  const hasAccess =
    actorMode === 'advertiser'
      ? String(booking.advertiser) === String(actorId)
      : String(booking.billboard?.createdBy) === String(actorId);

  if (!hasAccess) {
    return {
      status: 403,
      body: { message: actorMode === 'advertiser' ? 'Not authorized for this booking.' : 'Not authorized for this billboard.' },
    };
  }

  if (!['scheduled', 'active'].includes(booking.status) || booking.paymentStatus !== 'paid') {
    return {
      status: 400,
      body: { message: 'Only paid and scheduled bookings can be pushed to the display.' },
    };
  }

  const payload = {
    ...toDisplayPayload(booking, 'manual_push'),
    status: 'active',
  };

  setManualOverride(booking.billboard._id, payload);
  await updateBillboardPlaybackState(booking.billboard, payload, req);

  return {
    status: 200,
    body: {
      message: 'Sent to display',
      data: buildDisplayResponse({ billboard: booking.billboard, payload, schedule: [booking] }),
    },
  };
};

export const sendAdToDisplay = async (req, res) => {
  try {
    const { bookingId, billboardId, imageUrl, mediaUrl, duration = 30, title = 'Live Campaign' } = req.body;

    if (bookingId) {
      const result = await pushBookingToDisplay({
        bookingId,
        actorId: req.user._id,
        actorMode: 'admin',
        req,
      });
      return res.status(result.status).json(result.body);
    }

    const billboard = await loadBillboardWithConfig(billboardId);
    if (!billboard) {
      return res.status(404).json({ message: 'Billboard not found' });
    }

    if (!assertBillboardAccess(billboard, req.user._id, res)) return;

    const payload = {
      bookingId: '',
      billboardId: billboard._id,
      imageUrl: imageUrl || mediaUrl || '',
      mediaType: 'image',
      duration,
      title,
      status: imageUrl || mediaUrl ? 'active' : 'idle',
      updatedAt: new Date().toISOString(),
      source: 'manual_push',
      timeSlot: '',
      date: null,
      billboard: buildBillboardSummary(billboard),
      ad: buildAdSummary({
        title,
        mediaUrl: imageUrl || mediaUrl || '',
        mediaType: 'image',
        duration,
      }),
    };

    setManualOverride(billboard._id, payload);
    await updateBillboardPlaybackState(billboard, payload, req);

    return res.status(200).json({
      message: 'Sent to display',
      data: buildDisplayResponse({ billboard, payload, schedule: [] }),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to send ad to display', error: error.message });
  }
};

export const getDisplayRegistry = async (req, res) => {
  try {
    const billboards = await Billboard.find({})
      .select('name city location status imageUrl size type resolution displayConfig createdAt')
      .sort({ name: 1, createdAt: -1 });

    await Promise.all(billboards.map((billboard) => ensureBillboardDisplayConfig(billboard)));

    return res.json(
      billboards.map((billboard) => ({
        id: billboard._id,
        name: billboard.name,
        city: billboard.city,
        location: billboard.location,
        status: billboard.status,
        imageUrl: billboard.imageUrl || '',
        size: billboard.size || '',
        type: billboard.type || '',
        resolution: billboard.resolution || '',
        displayConfig: sanitizeDisplayConfigForAdmin(billboard.displayConfig || {}, new Date()),
      }))
    );
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to load display registry',
      error: error.message,
    });
  }
};

export const getCurrentDisplayContent = async (req, res) => {
  try {
    const { billboardId } = req.query;

    if (!billboardId) {
      const fallbackPayload = buildIdlePayload();
      return res.status(200).json({
        ...fallbackPayload,
        device: sanitizeDisplayConfigForDevice({}, new Date()),
        schedule: [],
      });
    }

    const billboard = await loadBillboardWithConfig(billboardId);
    if (!billboard) {
      return res.status(404).json({ message: 'Billboard not found' });
    }

    if (!verifyDeviceToken(billboard, req, res)) return;

    const now = new Date();
    const manualOverride = getManualOverride(billboardId);
    const schedule = await getScheduleForBillboard(billboardId, now);

    if (manualOverride) {
      return res.status(200).json(
        buildDisplayResponse({
          billboard,
          payload: manualOverride,
          schedule,
          now,
        })
      );
    }

    const currentBooking = schedule.find((booking) => isCurrentTimeInsideSlot(booking.timeSlot, now)) || null;

    if (currentBooking) {
      if (currentBooking.status !== 'active') {
        currentBooking.status = 'active';
        await currentBooking.save();
      }

      const payload = toDisplayPayload(currentBooking);
      return res.status(200).json(
        buildDisplayResponse({
          billboard,
          payload,
          schedule,
          now,
        })
      );
    }

    return res.status(200).json(
      buildDisplayResponse({
        billboard,
        payload: buildIdlePayload(billboard),
        schedule,
        now,
      })
    );
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load current display content', error: error.message });
  }
};

export const getDisplayContent = async (req, res) => {
  try {
    const billboard = await loadBillboardWithConfig(req.params.id);
    if (!billboard) {
      return res.status(404).json({ message: 'Billboard not found' });
    }

    if (!verifyDeviceToken(billboard, req, res)) return;

    const now = new Date();
    const schedule = await getScheduleForBillboard(req.params.id, now);
    const currentBooking = schedule.find((booking) => isCurrentTimeInsideSlot(booking.timeSlot, now)) || null;

    if (!schedule.length) {
      return res.status(200).json({
        type: 'idle',
        content: buildIdlePayload(billboard),
        device: sanitizeDisplayConfigForDevice(billboard.displayConfig, now),
        schedule: [],
      });
    }

    return res.status(200).json({
      type: currentBooking ? 'active' : 'schedule',
      content: currentBooking ? toDisplayPayload(currentBooking) : buildIdlePayload(billboard),
      device: sanitizeDisplayConfigForDevice(billboard.displayConfig, now),
      schedule: schedule.map((booking) => toScheduleEntry(booking, now)),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching hardware display', error: error.message });
  }
};

export const reportDisplayHeartbeat = async (req, res) => {
  try {
    const billboard = await loadBillboardWithConfig(req.params.id);
    if (!billboard) {
      return res.status(404).json({ message: 'Billboard not found' });
    }

    if (!verifyDeviceToken(billboard, req, res)) return;

    const now = new Date();
    const {
      deviceLabel = '',
      browserConnected = true,
      arduinoConnected = false,
      serialMode = 'none',
      playbackState = 'idle',
      nowPlayingTitle = '',
      bookingId = '',
      hardwareNotes = '',
    } = req.body || {};

    billboard.displayConfig = {
      ...(billboard.displayConfig?.toObject ? billboard.displayConfig.toObject() : billboard.displayConfig || {}),
      deviceLabel: String(deviceLabel || billboard.displayConfig?.deviceLabel || '').trim(),
      lastHeartbeatAt: now,
      lastPayloadAt: now,
      lastPlaybackState: String(playbackState || 'idle').trim() || 'idle',
      lastNowPlayingTitle: String(nowPlayingTitle || '').trim(),
      lastBookingId: bookingId || null,
      lastKnownIp: req.ip || '',
      lastKnownUserAgent: req.get('user-agent') || '',
      browserConnected: Boolean(browserConnected),
      arduinoConnected: Boolean(arduinoConnected),
      serialMode: String(serialMode || 'none').trim() || 'none',
      hardwareNotes: String(hardwareNotes || '').trim().slice(0, 250),
    };
    await billboard.save();

    const currentPayload = await getScheduleForBillboard(billboard._id, now);
    const activeBooking = currentPayload.find((booking) => isCurrentTimeInsideSlot(booking.timeSlot, now)) || null;

    return res.json({
      message: 'Heartbeat received.',
      heartbeatId: crypto.randomUUID(),
      device: sanitizeDisplayConfigForAdmin(billboard.displayConfig, now),
      current: activeBooking ? toDisplayPayload(activeBooking) : buildIdlePayload(billboard),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to record display heartbeat', error: error.message });
  }
};

export const getBillboardHardwareStatus = async (req, res) => {
  try {
    const billboard = await loadBillboardWithConfig(req.params.id);
    if (!billboard) {
      return res.status(404).json({ message: 'Billboard not found' });
    }

    if (!assertBillboardAccess(billboard, req.user._id, res)) return;

    const now = new Date();
    const schedule = await getScheduleForBillboard(billboard._id, now);
    const manualOverride = getManualOverride(billboard._id);

    return res.json({
      billboard: {
        ...buildBillboardSummary(billboard),
        displayConfig: sanitizeDisplayConfigForAdmin(billboard.displayConfig, now),
      },
      current: manualOverride || (schedule.find((booking) => isCurrentTimeInsideSlot(booking.timeSlot, now)) ? toDisplayPayload(schedule.find((booking) => isCurrentTimeInsideSlot(booking.timeSlot, now))) : buildIdlePayload(billboard)),
      schedule: schedule.map((booking) => toScheduleEntry(booking, now)),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load billboard hardware status', error: error.message });
  }
};

export const rotateBillboardDeviceToken = async (req, res) => {
  try {
    const billboard = await loadBillboardWithConfig(req.params.id);
    if (!billboard) {
      return res.status(404).json({ message: 'Billboard not found' });
    }

    if (!assertBillboardAccess(billboard, req.user._id, res)) return;

    billboard.displayConfig = {
      ...(billboard.displayConfig?.toObject ? billboard.displayConfig.toObject() : billboard.displayConfig || {}),
      deviceToken: crypto.randomBytes(18).toString('hex'),
      lastHeartbeatAt: null,
      browserConnected: false,
      arduinoConnected: false,
      serialMode: 'none',
      lastPlaybackState: 'offline',
    };
    await billboard.save();

    return res.json({
      message: 'Display device token rotated successfully.',
      displayConfig: sanitizeDisplayConfigForAdmin(billboard.displayConfig),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to rotate billboard device token', error: error.message });
  }
};
