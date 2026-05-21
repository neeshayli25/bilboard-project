import Ad from '../models/Ad.js';
import path from 'path';
import fs from 'fs/promises';
import { isValidObjectId } from '../utils/billboardHelper.js';

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
      return res.status(400).json({ message: 'Please upload an image or video' });
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

    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all active ads (for frontend)
// @route   GET /api/ads/active
// @access  Public
const getActiveAds = async (req, res) => {
  try {
    const ads = await Ad.find({
      isActive: true,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(ads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all ads (admin)
// @route   GET /api/ads
// @access  Private/Admin
const getAllAds = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const total = await Ad.countDocuments();

    const ads = await Ad.find()
      .populate('advertiser', 'name email phone organization')
      .limit(limit)
      .skip(startIndex)
      .sort({ createdAt: -1 });

    res.json({
      ads,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get ads by current advertiser
// @route   GET /api/ads/myads
// @access  Private
const getMyAds = async (req, res) => {
  try {
    const ads = await Ad.find({ advertiser: req.user._id }).sort({ createdAt: -1 });
    res.json(ads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update ad (advertiser or admin)
// @route   PUT /api/ads/:id
// @access  Private
const updateAd = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid Ad ID' });
    }
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    if (
      ad.advertiser.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to update this ad' });
    }

    const { title, description, link, isActive } = req.body;

    ad.title = title || ad.title;
    ad.description = description || ad.description;
    ad.link = link || ad.link;

    if (isActive !== undefined) {
      ad.isActive = isActive;
    }

    const updatedAd = await ad.save();

    res.json(updatedAd);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete ad (advertiser or admin)
// @route   DELETE /api/ads/:id
// @access  Private
const deleteAd = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid Ad ID' });
    }
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    if (
      ad.advertiser.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to delete this ad' });
    }

    const fileName = path.basename(ad.mediaUrl);
    const filePath = path.join(process.cwd(), 'uploads', 'ads', fileName);
    await fs.unlink(filePath).catch(() => {});

    if (ad.thumbnailUrl) {
      const thumbFileName = path.basename(ad.thumbnailUrl);
      const thumbPath = path.join(process.cwd(), 'uploads', 'ads', thumbFileName);
      await fs.unlink(thumbPath).catch(() => {});
    }

    await ad.deleteOne();

    res.json({ message: 'Ad removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Increment click counter
// @route   POST /api/ads/:id/click
// @access  Public
const incrementClick = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid Ad ID' });
    }
    const ad = await Ad.findById(req.params.id);

    if (!ad || !ad.isActive) {
      return res.status(404).json({ message: 'Ad not found or inactive' });
    }

    ad.clicks += 1;
    await ad.save();

    res.json({ clicks: ad.clicks });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
