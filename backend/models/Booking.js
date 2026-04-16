import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  billboard: { type: mongoose.Schema.Types.ObjectId, ref: 'Billboard', required: true },
  ad: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
  timeSlot: { type: String, required: true },
  date: { type: Date, required: true },
  totalPrice: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending', 'submitted', 'paid', 'failed'], default: 'pending' },
  paymentProof: { type: String, default: '' }, // screenshot URL or transaction ID
}, { timestamps: true });

export default mongoose.model('Booking', bookingSchema);