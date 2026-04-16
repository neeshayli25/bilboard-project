import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['stripe', 'card', 'easypaisa', 'jazzcash'], required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  invoiceNumber: { type: String, unique: true },
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);