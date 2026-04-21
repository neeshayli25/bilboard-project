export const parseTimePartToMinutes = (rawValue = '') => {
  const value = String(rawValue || '').trim();
  const twelveHourMatch = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHourMatch) {
    let hour = Number(twelveHourMatch[1]);
    const minutes = Number(twelveHourMatch[2]);
    const meridiem = twelveHourMatch[3].toUpperCase();

    if (meridiem === 'PM' && hour !== 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;

    return hour * 60 + minutes;
  }

  const twentyFourHourMatch = value.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHourMatch) {
    return Number(twentyFourHourMatch[1]) * 60 + Number(twentyFourHourMatch[2]);
  }

  return 0;
};

export const format24HourTo12Hour = (timeStr = '') => {
  const [hourRaw = '0', minuteRaw = '0'] = String(timeStr || '').split(':');
  let hours = Number(hourRaw);
  const minutes = Number(minuteRaw);
  const meridiem = hours >= 12 ? 'PM' : 'AM';

  hours %= 12;
  if (hours === 0) hours = 12;

  return `${hours}:${String(minutes).padStart(2, '0')} ${meridiem}`;
};

export const buildTimeSlotLabel = (startTime, endTime) =>
  `${format24HourTo12Hour(startTime)} - ${format24HourTo12Hour(endTime)}`;

export const extractDatePrefixFromSlot = (slot = '') => {
  const match = String(slot || '')
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
  return match ? match[1] : '';
};

export const extractTimeRangeFromSlot = (slot = '') => {
  const match = String(slot || '')
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
  return match ? match[2].trim() : String(slot || '').trim();
};

export const doSlotsOverlap = (slotA = '', slotB = '') => {
  const [slotAStart, slotAEnd] = extractTimeRangeFromSlot(slotA)
    .split('-')
    .map((part) => parseTimePartToMinutes(part));
  const [slotBStart, slotBEnd] = extractTimeRangeFromSlot(slotB)
    .split('-')
    .map((part) => parseTimePartToMinutes(part));

  return Math.max(slotAStart, slotBStart) < Math.min(slotAEnd, slotBEnd);
};

export const slotContainsRange = (containerSlot = '', targetSlot = '') => {
  const [containerStart, containerEnd] = extractTimeRangeFromSlot(containerSlot)
    .split('-')
    .map((part) => parseTimePartToMinutes(part));
  const [targetStart, targetEnd] = extractTimeRangeFromSlot(targetSlot)
    .split('-')
    .map((part) => parseTimePartToMinutes(part));

  return targetStart >= containerStart && targetEnd <= containerEnd;
};

export const getDurationMinutes = (startTime = '', endTime = '') => {
  const startMinutes = parseTimePartToMinutes(startTime);
  const endMinutes = parseTimePartToMinutes(endTime);
  return Math.max(0, endMinutes - startMinutes);
};

export const getRatePerMinute = (billboard) =>
  Number(billboard?.pricePerMinute ?? billboard?.pricePerHour ?? 0);

export const calculateBookingAmount = ({ billboard, startTime, endTime }) => {
  const durationMinutes = getDurationMinutes(startTime, endTime);
  const ratePerMinute = getRatePerMinute(billboard);
  const totalPrice = Number((durationMinutes * ratePerMinute).toFixed(2));

  return {
    durationMinutes,
    ratePerMinute,
    totalPrice,
    timeSlot: buildTimeSlotLabel(startTime, endTime),
  };
};

export const parseDateOnly = (dateValue) => {
  const value = String(dateValue || '').trim();
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
};

export const isCheckoutExpired = (booking, now = new Date()) =>
  booking?.status === 'checkout' &&
  booking?.checkoutExpiresAt &&
  new Date(booking.checkoutExpiresAt) <= now;

export const isApprovedPaymentExpired = (booking, now = new Date()) =>
  booking?.status === 'approved' &&
  booking?.paymentStatus !== 'paid' &&
  booking?.checkoutExpiresAt &&
  new Date(booking.checkoutExpiresAt) <= now;

export const bookingBlocksAvailability = (booking, now = new Date()) => {
  if (!booking) return false;
  if (['cancelled', 'rejected'].includes(booking.status)) return false;
  if (isCheckoutExpired(booking, now)) return false;
  if (isApprovedPaymentExpired(booking, now)) return false;
  return true;
};
