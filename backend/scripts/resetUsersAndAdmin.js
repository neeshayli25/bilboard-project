import dns from 'node:dns';
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Ad from '../models/Ad.js';
import Booking from '../models/Booking.js';
import Invoice from '../models/Invoice.js';
import Notification from '../models/Notification.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

const TARGET_ADMIN_EMAIL = 'nishachanna84@gmail.com';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../uploads/ads');

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const clearAdUploads = async () => {
  try {
    const entries = await fs.readdir(uploadsDir, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile());

    await Promise.all(
      files.map((file) => fs.unlink(path.join(uploadsDir, file.name)).catch(() => undefined))
    );

    return files.length;
  } catch (error) {
    if (error.code === 'ENOENT') return 0;
    throw error;
  }
};

const run = async () => {
  await connectDB();

  const adminUsers = await User.find({ role: 'admin' }).sort({ createdAt: 1 });
  let primaryAdmin = adminUsers.find((user) => user.email?.toLowerCase() === TARGET_ADMIN_EMAIL) || adminUsers[0] || null;

  if (!primaryAdmin) {
    throw new Error('No admin user exists. Start the server once with ADMIN_EMAIL / ADMIN_PASSWORD configured, then rerun this script.');
  }

  const advertiserIds = (await User.find({ role: { $ne: 'admin' } }).select('_id')).map((user) => user._id);

  const [bookingCount, adCount, transactionCount, invoiceCount, notificationCount, userCount] = await Promise.all([
    Booking.countDocuments({ advertiser: { $in: advertiserIds } }),
    Ad.countDocuments({ advertiser: { $in: advertiserIds } }),
    Transaction.countDocuments({ advertiser: { $in: advertiserIds } }),
    Invoice.countDocuments({ advertiser: { $in: advertiserIds } }),
    Notification.countDocuments({
      $or: [
        { user: { $in: advertiserIds } },
        { type: { $in: ['booking', 'payment', 'approval'] } },
      ],
    }),
    User.countDocuments({ role: { $ne: 'admin' } }),
  ]);

  primaryAdmin.email = TARGET_ADMIN_EMAIL;
  primaryAdmin.isEmailVerified = true;
  await primaryAdmin.save();

  if (adminUsers.length > 1) {
    const extraAdminIds = adminUsers
      .filter((user) => user._id.toString() !== primaryAdmin._id.toString())
      .map((user) => user._id);
    if (extraAdminIds.length) {
      await User.deleteMany({ _id: { $in: extraAdminIds } });
    }
  }

  await Promise.all([
    Transaction.deleteMany({ advertiser: { $in: advertiserIds } }),
    Invoice.deleteMany({ advertiser: { $in: advertiserIds } }),
    Booking.deleteMany({ advertiser: { $in: advertiserIds } }),
    Ad.deleteMany({ advertiser: { $in: advertiserIds } }),
    Notification.deleteMany({
      $or: [
        { user: { $in: advertiserIds } },
        { type: { $in: ['booking', 'payment', 'approval'] } },
      ],
    }),
    User.deleteMany({ role: { $ne: 'admin' } }),
  ]);

  const deletedUploadFiles = await clearAdUploads();

  console.log('User reset complete.');
  console.log(`Admin email set to: ${TARGET_ADMIN_EMAIL}`);
  console.log(`Advertiser users removed: ${userCount}`);
  console.log(`Bookings removed: ${bookingCount}`);
  console.log(`Ads removed: ${adCount}`);
  console.log(`Transactions removed: ${transactionCount}`);
  console.log(`Invoices removed: ${invoiceCount}`);
  console.log(`Notifications removed: ${notificationCount}`);
  console.log(`Uploaded ad files removed: ${deletedUploadFiles}`);

  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error('Failed to reset users/admin:', error.message);
  await mongoose.connection.close().catch(() => undefined);
  process.exit(1);
});
