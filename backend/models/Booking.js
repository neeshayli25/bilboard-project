import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  billboard: { type: mongoose.Schema.Types.ObjectId, ref: 'Billboard', required: true },
  ad: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' },
  timeSlot: { type: String, required: true },
  date: { type: Date, required: true },
  totalPrice: { type: Number, required: true },
  durationMinutes: { type: Number, default: 0 },
  ratePerMinute: { type: Number, default: 0 },
  currency: { type: String, default: 'PKR' },
  customerName: { type: String, default: '' },
  customerEmail: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  status: {
    type: String,
    enum: ['checkout', 'pending', 'paid', 'approved', 'scheduled', 'active', 'rejected', 'completed', 'cancelled'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'initiated', 'requires_action', 'submitted', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'card', 'easypaisa', 'jazzcash', 'bank_transfer'],
    default: 'bank_transfer',
  },
  paymentGateway: { type: String, default: 'manual' },
  paymentIntentId: { type: String, default: '' },
  paymentProof: { type: String, default: '' },
  gatewayTransactionId: { type: String, default: '' },
  gatewayReference: { type: String, default: '' },
  gatewayMeta: { type: mongoose.Schema.Types.Mixed, default: {} },
  checkoutExpiresAt: { type: Date, default: null },
  paymentCapturedAt: { type: Date, default: null },
  adminReviewNote: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Booking', bookingSchema);
