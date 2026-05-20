import mongoose from 'mongoose';

const adSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    mediaUrl: {
      type: String,
      required: [true, 'Please upload an image or video'],
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    duration: {
      type: Number,
      default: 30,
    },
    thumbnailUrl: {
      type: String,
      default: '', // Optional: for video preview thumbnails
    },
    advertiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvalStatus: { 
      type: String,
       enum: ['pending', 'approved', 'rejected'], 
       default: 'pending' 
    },
    link: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(+new Date() + 30 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Ad', adSchema);
