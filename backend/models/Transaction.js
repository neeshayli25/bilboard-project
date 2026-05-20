import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['stripe', 'card', 'easypaisa', 'jazzcash', 'bank_transfer'], required: true },
  gateway: { type: String, default: 'manual' },
  status: { type: String, enum: ['pending', 'requires_action', 'completed', 'failed', 'refunded', 'cancelled'], default: 'pending' },
  invoiceNumber: { type: String, unique: true },
  customerName: { type: String, default: '' },
  customerEmail: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  gatewayTransactionId: { type: String, default: '' },
  gatewayReference: { type: String, default: '' },
  gatewayMeta: { type: mongoose.Schema.Types.Mixed, default: {} },
  refundReference: { type: String, default: '' },
  stripePaymentIntentId: { type: String, default: '' },
  stripeTransferId: { type: String, default: '' },
  stripeRefundId: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
