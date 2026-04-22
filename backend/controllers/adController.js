import Ad from '../models/Ad.js';
import path from 'path';
import fs from 'fs/promises';

// Helper to determine media type from file mimetype
const getMediaType = (mimetype) => {
  return mimetype.startsWith('image/') ? 'image' : 'video';
};

// @desc    Create a new ad (with image or video upload)
// @route   POST /api/ads
// @access  Private
const createAd = async (req, res) => {
  try {
    const { title, description, link } = req.body;
    
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload an image or video');
    }

    const mediaUrl = req.file.storageUrl || `/uploads/ads/${req.file.filename}`;
    const mediaType = getMediaType(req.file.mimetype);

    const ad = await Ad.create({
      title,
      description,
      mediaUrl,
      mediaType,
      link: link || '',
      advertiser: req.user._id,
      // Optional: generate thumbnail later for videos
    });

    res.status(201).json({
      success: true,
      data: ad,
    });
  } catch (error) {
    if (req.file) {
      const filePath = path.join(process.cwd(), 'uploads', 'ads', req.file.filename);
      await fs.unlink(filePath).catch(console.error);
    }
    throw error;
  }
};

// @desc    Get all active ads (for frontend)
// @route   GET /api/ads/active
// @access  Public
const getActiveAds = async (req, res) => {
  const ads = await Ad.find({ isActive: true, expiresAt: { $gt: new Date() } })
    .sort({ createdAt: -1 })
    .limit(10);
  res.json(ads);
};

// @desc    Get all ads (admin)
// @route   GET /api/ads
// @access  Private/Admin
const getAllAds = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;

  const total = await Ad.countDocuments();
  const ads = await Ad.find()
    .populate('advertiser', 'name email')
    .limit(limit)
    .skip(startIndex)
    .sort({ createdAt: -1 });

  res.json({
    ads,
    page,
    pages: Math.ceil(total / limit),
    total,
  });
};

// @desc    Get ads by current advertiser
// @route   GET /api/ads/myads
// @access  Private
const getMyAds = async (req, res) => {
  const ads = await Ad.find({ advertiser: req.user._id })
    .sort({ createdAt: -1 });
  res.json(ads);
};

// @desc    Update ad (advertiser or admin)
// @route   PUT /api/ads/:id
// @access  Private
const updateAd = async (req, res) => {
  const ad = await Ad.findById(req.params.id);
  
  if (!ad) {
    res.status(404);
    throw new Error('Ad not found');
  }

  if (ad.advertiser.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this ad');
  }

  const { title, description, link, isActive } = req.body;
  ad.title = title || ad.title;
  ad.description = description || ad.description;
  ad.link = link || ad.link;
  ad.isActive = isActive !== undefined ? isActive : ad.isActive;

  const updatedAd = await ad.save();
  res.json(updatedAd);
};

// @desc    Delete ad (advertiser or admin) – deletes file too
// @route   DELETE /api/ads/:id
// @access  Private
const deleteAd = async (req, res) => {
  const ad = await Ad.findById(req.params.id);
  
  if (!ad) {
    res.status(404);
    throw new Error('Ad not found');
  }

  if (ad.advertiser.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this ad');
  }

  // Delete the media file
  const fileName = path.basename(ad.mediaUrl);
  const filePath = path.join(process.cwd(), 'uploads', 'ads', fileName);
  await fs.unlink(filePath).catch(console.error);

  // Also delete thumbnail if exists (optional)
  if (ad.thumbnailUrl) {
    const thumbFileName = path.basename(ad.thumbnailUrl);
    const thumbPath = path.join(process.cwd(), 'uploads', 'ads', thumbFileName);
    await fs.unlink(thumbPath).catch(console.error);
  }

  await ad.deleteOne();
  res.json({ message: 'Ad removed successfully' });
};

// @desc    Increment click counter
// @route   POST /api/ads/:id/click
// @access  Public
const incrementClick = async (req, res) => {
  const ad = await Ad.findById(req.params.id);
  if (ad && ad.isActive) {
    ad.clicks += 1;
    await ad.save();
    res.json({ clicks: ad.clicks });
  } else {
    res.status(404);
    throw new Error('Ad not found or inactive');
  }
};

export {
  createAd,
  getActiveAds,
  getAllAds,
  getMyAds,
  updateAd,
  deleteAd,
  incrementClick,
};
