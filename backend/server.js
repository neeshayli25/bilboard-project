import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import os from 'node:os';
import path from 'node:path';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import errorHandler from './middleware/errorMiddleware.js';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('API Running 🚀');
});


const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const getLanUrls = (port) => {
  const urls = [];
  const interfaces = os.networkInterfaces();

  Object.values(interfaces).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (!entry || entry.family !== 'IPv4' || entry.internal) return;
      urls.push(`http://${entry.address}:${port}`);
    });
  });

  return [...new Set(urls)];
};

const ensureDefaultAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn('Skipping admin bootstrap because ADMIN_EMAIL or ADMIN_PASSWORD is not configured.');
    return;
  }

  const adminByConfiguredEmail = await User.findOne({ role: 'admin', email: adminEmail });
  if (adminByConfiguredEmail) {
    return;
  }

  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    const conflictingUser = await User.findOne({ email: adminEmail, _id: { $ne: existingAdmin._id } });
    if (!conflictingUser) {
      existingAdmin.email = adminEmail;
      existingAdmin.isEmailVerified = true;
      existingAdmin.name = existingAdmin.name || process.env.ADMIN_NAME || 'CDBMS Admin';
      existingAdmin.organization = existingAdmin.organization || process.env.ADMIN_ORGANIZATION || 'CDBMS';
      await existingAdmin.save();
      console.log(`Updated admin email to ${adminEmail}`);
    }
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await User.create({
    name: process.env.ADMIN_NAME || 'CDBMS Admin',
    email: adminEmail,
    password: hashedPassword,
    role: 'admin',
    phone: process.env.ADMIN_PHONE || '',
    organization: process.env.ADMIN_ORGANIZATION || 'CDBMS',
    isEmailVerified: true,
  });

  console.log(`Seeded default admin account for ${adminEmail}`);
};

const startServer = async () => {
  try {
    console.log('⏳ Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 60000,
    });
    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required. Add it to backend environment variables before starting the server.');
    }

    await ensureDefaultAdmin();

    // Dynamically import routes after connection
    const authRoutes = (await import('./routes/authRoutes.js')).default;
    const productRoutes = (await import('./routes/productRoutes.js')).default;
    const orderRoutes = (await import('./routes/orderRoutes.js')).default;
    const adRoutes = (await import('./routes/adRoutes.js')).default;
    const adminRoutes = (await import('./routes/adminRoutes.js')).default;
    const advertiserRoutes = (await import('./routes/advertiserRoutes.js')).default;
    const hardwareRoutes = (await import('./routes/hardwareRoutes.js')).default;
    const paymentRoutes = (await import('./routes/paymentRoutes.js')).default;
    const displayRoutes = (await import('./routes/displayRoutes.js')).default;
    const { expireStaleManualPaymentBookings } = await import('./utils/manualPaymentUtils.js');

    // Register routes
    app.use('/api/auth', authRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/ads', adRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/advertiser', advertiserRoutes);
    app.use('/api/hardware', hardwareRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/display', displayRoutes);
    app.use(errorHandler);

    await expireStaleManualPaymentBookings();
    setInterval(() => {
      expireStaleManualPaymentBookings().catch((error) => {
        console.error(`Manual payment expiry sweep failed: ${error.message}`);
      });
    }, 60 * 1000);

    // Start the server
    const server = app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
      if (HOST === '0.0.0.0') {
        console.log(`Backend is accepting LAN connections on port ${PORT}.`);
        const lanUrls = getLanUrls(PORT);
        if (lanUrls.length) {
          console.log(`LAN URLs: ${lanUrls.join(', ')}`);
        }
      }
    });
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the other backend process or change PORT in backend/.env.`);
      } else {
        console.error(`Server listen error: ${error.message}`);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error(`❌ Server startup error: ${err.message}`);
    process.exit(1);
  }
};

startServer();
