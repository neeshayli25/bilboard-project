import mongoose from 'mongoose';

const billboardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String, required: true },
  location: { type: String, required: true },
  size: { type: String, default: '' },
  type: { type: String, default: 'Digital LED' },
  resolution: { type: String, default: '1920x1080' },
  pricePerHour: { type: Number, required: true },
  status: { type: String, enum: ['active', 'offline', 'maintenance'], default: 'active' },
  imageUrl: { type: String, default: '' },
  timeSlots: [{ type: String }],
  easypaisaNumber: { type: String, required: true }, 
  // ... existing fields
createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },// Admin's Easypaisa account
}, { timestamps: true });

export default mongoose.model('Billboard', billboardSchema);