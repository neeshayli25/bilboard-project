import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['paid', 'pending', 'cancelled'], default: 'pending' },
  pdfUrl: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Invoice', invoiceSchema);