import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Please add a name'], trim: true },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'],
    },
    password: { type: String, required: [true, 'Please add a password'], minlength: 6 },
    role: { type: String, enum: ['user', 'admin', 'advertiser'], default: 'advertiser' },
    
    // New fields for signup
    phone: { type: String, default: '' },
    organization: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    // Login history
    loginHistory: [{ timestamp: { type: Date, default: Date.now } }],
    lastLoginAt: { type: Date, default: null },
    
    // Email verification
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },
    
    // Password reset
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);