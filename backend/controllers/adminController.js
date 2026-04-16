import Billboard from '../models/Billboard.js';
import Ad from '../models/Ad.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';

// ---------- Billboard CRUD ----------
export const getBillboards = async (req, res) => {
  const billboards = await Billboard.find({ createdBy: req.user._id });
  res.json(billboards);
};

export const createBillboard = async (req, res) => {
  const billboard = await Billboard.create({
    ...req.body,
    createdBy: req.user._id,
  });
  res.status(201).json(billboard);
};

export const updateBillboard = async (req, res) => {
  const billboard = await Billboard.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!billboard) return res.status(404).json({ message: 'Billboard not found or not owned by you' });
  const updated = await Billboard.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
};

export const deleteBillboard = async (req, res) => {
  const billboard = await Billboard.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!billboard) return res.status(404).json({ message: 'Billboard not found or not owned by you' });
  await Billboard.findByIdAndDelete(req.params.id);
  res.json({ message: 'Billboard deleted' });
};

// ---------- Ad Approvals ----------
export const getAllAds = async (req, res) => {
  const ads = await Ad.find().populate('advertiser', 'name email').sort({ createdAt: -1 });
  res.json(ads);
};

export const deleteAd = async (req, res) => {
  await Ad.findByIdAndDelete(req.params.id);
  res.json({ message: 'Ad deleted' });
};

export const getPendingAds = async (req, res) => {
  const ads = await Ad.find({ approvalStatus: 'pending' }).populate('advertiser', 'name email');
  res.json(ads);
};

export const approveAd = async (req, res) => {
  const ad = await Ad.findByIdAndUpdate(req.params.id, { approvalStatus: 'approved' }, { new: true });
  await Notification.create({ user: ad.advertiser, title: 'Ad Approved', message: `Your ad "${ad.title}" has been approved.` });
  res.json(ad);
};

export const rejectAd = async (req, res) => {
  const ad = await Ad.findByIdAndUpdate(req.params.id, { approvalStatus: 'rejected' }, { new: true });
  await Notification.create({ user: ad.advertiser, title: 'Ad Rejected', message: `Your ad "${ad.title}" was rejected. Please modify and resubmit.` });
  res.json(ad);
};

// ---------- Dashboard Stats ----------
export const getDashboardStats = async (req, res) => {
  const totalBillboards = await Billboard.countDocuments({ createdBy: req.user._id });
  const totalAds = await Ad.countDocuments();
  const pendingApprovals = await Ad.countDocuments({ approvalStatus: 'pending' });
  const totalUsers = await User.countDocuments();
  const pendingBookings = await Booking.countDocuments({ status: 'pending' });
  res.json({ totalBillboards, totalAds, pendingApprovals, totalUsers, pendingBookings });
};

export const getRevenueTrend = async (req, res) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const revenue = await Transaction.aggregate([
    { $match: { status: 'completed', createdAt: { $gte: sixMonthsAgo } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$amount' } } },
    { $sort: { _id: 1 } }
  ]);
  res.json(revenue.map(r => ({ month: r._id, revenue: r.revenue })));
};

// ---------- Reports ----------
export const getRevenueReport = async (req, res) => {
  const { startDate, endDate } = req.query;
  const match = { status: 'completed' };
  if (startDate && endDate) match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  const result = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, amount: { $sum: '$amount' }, bookings: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  res.json(result.map(r => ({ month: r._id, amount: r.amount, bookings: r.bookings })));
};

export const getCampaignReport = async (req, res) => {
  const campaigns = await Ad.aggregate([
    { $group: { _id: '$title', advertiser: { $first: '$advertiser' }, impressions: { $sum: '$impressions' }, spend: { $sum: '$budget' } } },
    { $sort: { impressions: -1 } },
    { $limit: 10 }
  ]);
  res.json(campaigns);
};

export const getBookingReport = async (req, res) => {
  const bookings = await Booking.find().populate('advertiser', 'name');
  res.json(bookings.map(b => ({
    id: b._id,
    advertiser: b.advertiser?.name,
    billboards: 1,
    startDate: b.date,
    endDate: b.endDate,
    value: b.totalPrice
  })));
};

export const getBillboardPerformance = async (req, res) => {
  const billboards = await Billboard.aggregate([
    { $lookup: { from: 'bookings', localField: '_id', foreignField: 'billboard', as: 'bookings' } },
    { $project: { name: 1, location: '$city', plays: { $size: '$bookings' }, revenue: { $sum: '$bookings.totalPrice' } } }
  ]);
  res.json(billboards);
};

// ---------- Bookings ----------
export const getBookings = async (req, res) => {
  const adminBillboards = await Billboard.find({ createdBy: req.user._id }).select('_id');
  const billboardIds = adminBillboards.map(b => b._id);
  const bookings = await Booking.find({ billboard: { $in: billboardIds } })
    .populate('billboard', 'name city pricePerHour')
    .populate('ad', 'title mediaUrl mediaType')
    .populate('advertiser', 'name email');
  res.json(bookings);
};

export const getPendingBookings = async (req, res) => {
  const adminBillboards = await Billboard.find({ createdBy: req.user._id }).select('_id');
  const billboardIds = adminBillboards.map(b => b._id);
  const bookings = await Booking.find({ billboard: { $in: billboardIds }, status: 'pending' })
    .populate('billboard advertiser', 'name city title');
  res.json(bookings);
};

export const updateBookingStatus = async (req, res) => {
  const { status } = req.body;
  const booking = await Booking.findById(req.params.id).populate('billboard');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.billboard.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  booking.status = status;
  await booking.save();
  await Notification.create({ user: booking.advertiser, title: 'Booking Updated', message: `Your booking ${booking._id} status changed to ${status}.` });
  res.json(booking);
};

export const approveBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('billboard');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.billboard.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  booking.status = 'approved';
  booking.paymentStatus = 'paid';
  await booking.save();
  await Ad.findByIdAndUpdate(booking.ad, { approvalStatus: 'approved' });
  await Notification.create({ user: booking.advertiser, title: 'Booking Approved', message: `Your booking for ${booking.date} at ${booking.timeSlot} has been approved.` });
  res.json(booking);
};

export const rejectBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('billboard');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.billboard.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  booking.status = 'rejected';
  booking.paymentStatus = 'failed';
  await booking.save();
  await Notification.create({ user: booking.advertiser, title: 'Booking Rejected', message: `Your booking for ${booking.date} has been rejected. Payment will be refunded.` });
  res.json(booking);
};

// ---------- Transactions ----------
export const getTransactions = async (req, res) => {
  const adminBillboards = await Billboard.find({ createdBy: req.user._id }).select('_id');
  const billboardIds = adminBillboards.map(b => b._id);
  const bookings = await Booking.find({ billboard: { $in: billboardIds } }).select('_id');
  const bookingIds = bookings.map(b => b._id);
  const transactions = await Transaction.find({ booking: { $in: bookingIds } }).populate('advertiser', 'name email');
  res.json(transactions);
};

export const updateTransactionStatus = async (req, res) => {
  const { status } = req.body;
  const transaction = await Transaction.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.json(transaction);
};

// ---------- User Management ----------
export const getUsers = async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
};

export const deactivateUser = async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ message: 'User deactivated' });
};

export const activateUser = async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isActive: true });
  res.json({ message: 'User activated' });
};

export const updateUserRole = async (req, res) => {
  const { role } = req.body;
  await User.findByIdAndUpdate(req.params.id, { role });
  res.json({ message: 'Role updated' });
};

// ---------- Notifications ----------
export const getNotifications = async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort('-createdAt');
  res.json(notifications);
};

export const markNotificationRead = async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ message: 'Marked as read' });
};

export const markAllNotificationsRead = async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ message: 'All marked as read' });
};

export const clearAllNotifications = async (req, res) => {
  await Notification.deleteMany({ user: req.user._id });
  res.json({ message: 'All notifications cleared' });
};