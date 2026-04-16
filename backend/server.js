import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import errorHandler from './middleware/errorMiddleware.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.send('API Running 🚀');
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('⏳ Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 60000,
    });
    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);

    // Dynamically import routes after connection
    const authRoutes = (await import('./routes/authRoutes.js')).default;
    const productRoutes = (await import('./routes/productRoutes.js')).default;
    const orderRoutes = (await import('./routes/orderRoutes.js')).default;
    const adRoutes = (await import('./routes/adRoutes.js')).default;
    const adminRoutes = (await import('./routes/adminRoutes.js')).default;
    const advertiserRoutes = (await import('./routes/advertiserRoutes.js')).default;

    // Register routes
    app.use('/api/auth', authRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/ads', adRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/advertiser', advertiserRoutes);

    // Start the server
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error(`❌ Server startup error: ${err.message}`);
    process.exit(1);
  }
};

startServer();