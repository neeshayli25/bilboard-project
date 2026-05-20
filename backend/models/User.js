import mongoose from 'mongoose';

const passkeySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    publicKey: { type: Buffer, required: true },
    counter: { type: Number, default: 0 },
    transports: [{ type: String }],
    deviceType: { type: String, default: 'multiDevice' },
    backedUp: { type: Boolean, default: false },
    label: { type: String, default: 'This device' },
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: null },
  },
  { _id: false }
);

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
    
    // Optional profile fields
    phone: { type: String, default: '' },
    organization: { type: String, default: '' },
    walletBalance: { type: Number, default: 0 },
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

    // Passkeys / fingerprint login
    passkeys: { type: [passkeySchema], default: [] },

    // Payment / merchant settlement setup
    paymentSetup: {
      manualPaymentEnabled: { type: Boolean, default: false },
      merchantLabel: { type: String, default: '' },
      easypaisaEnabled: { type: Boolean, default: false },
      bankCardEnabled: { type: Boolean, default: false },
      settlementInstructions: { type: String, default: '' },
      payfastEnabled: { type: Boolean, default: false },
      payfastMerchantLabel: { type: String, default: '' },
      payfastBaseUrl: { type: String, default: '' },
      payfastMerchantId: { type: String, default: '' },
      payfastSecuredKey: { type: String, default: '' },
      payfastHashKey: { type: String, default: '' },
      payfastMerchantCategoryCode: { type: String, default: '' },
      payfastCardBankCode: { type: String, default: '' },
      payfastCardInstrumentId: { type: String, default: '' },
      payfastEasypaisaBankCode: { type: String, default: '' },
      payfastEasypaisaInstrumentId: { type: String, default: '' },
      payfastJazzCashBankCode: { type: String, default: '' },
      payfastJazzCashInstrumentId: { type: String, default: '' },
      settlementAccountTitle: { type: String, default: '' },
      settlementEasypaisaNumber: { type: String, default: '' },
      settlementJazzCashNumber: { type: String, default: '' },
      settlementBankName: { type: String, default: '' },
      settlementBankIban: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
