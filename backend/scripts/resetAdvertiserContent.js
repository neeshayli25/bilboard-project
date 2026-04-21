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

  const [bookingCount, adCount, transactionCount, invoiceCount, notificationCount] = await Promise.all([
    Booking.countDocuments(),
    Ad.countDocuments(),
    Transaction.countDocuments(),
    Invoice.countDocuments(),
    Notification.countDocuments({ type: { $in: ['booking', 'payment', 'approval'] } }),
  ]);

  await Promise.all([
    Transaction.deleteMany({}),
    Invoice.deleteMany({}),
    Booking.deleteMany({}),
    Ad.deleteMany({}),
    Notification.deleteMany({ type: { $in: ['booking', 'payment', 'approval'] } }),
  ]);

  const deletedUploadFiles = await clearAdUploads();

  console.log('Advertiser content reset complete.');
  console.log(`Bookings removed: ${bookingCount}`);
  console.log(`Ads removed: ${adCount}`);
  console.log(`Transactions removed: ${transactionCount}`);
  console.log(`Invoices removed: ${invoiceCount}`);
  console.log(`Notifications removed: ${notificationCount}`);
  console.log(`Uploaded ad files removed: ${deletedUploadFiles}`);

  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error('Failed to reset advertiser content:', error.message);
  await mongoose.connection.close().catch(() => undefined);
  process.exit(1);
});
