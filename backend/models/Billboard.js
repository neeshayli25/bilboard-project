import mongoose from 'mongoose';

const displayConfigSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    deviceLabel: { type: String, default: '' },
    deviceToken: { type: String, default: '' },
    screenCode: { type: String, default: '' },
    lastHeartbeatAt: { type: Date, default: null },
    lastPayloadAt: { type: Date, default: null },
    lastPlaybackState: { type: String, default: 'offline' },
    lastNowPlayingTitle: { type: String, default: '' },
    lastBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    lastKnownIp: { type: String, default: '' },
    lastKnownUserAgent: { type: String, default: '' },
    browserConnected: { type: Boolean, default: false },
    arduinoConnected: { type: Boolean, default: false },
    serialMode: { type: String, default: 'none' },
    hardwareNotes: { type: String, default: '' },
  },
  { _id: false }
);

const billboardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String, required: true },
  location: { type: String, required: true },
  size: { type: String, default: '' },
  type: { type: String, default: 'Digital LED' },
  resolution: { type: String, default: '1920x1080' },
  pricePerHour: { type: Number, required: true },
  pricePerMinute: { type: Number, default: null },
  status: { type: String, enum: ['active', 'offline', 'maintenance'], default: 'active' },
  imageUrl: { type: String, default: '' },
  timeSlots: [{ type: String }],
  displayConfig: { type: displayConfigSchema, default: () => ({}) },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('Billboard', billboardSchema);
