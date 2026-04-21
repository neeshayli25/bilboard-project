import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const purge = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');
    
    // Deleting all ads, bookings, billboards
    const db = mongoose.connection.db;
    
    console.log('Purging Ads...');
    await db.collection('ads').deleteMany({});
    console.log('Purging Bookings...');
    await db.collection('bookings').deleteMany({});
    console.log('Purging Billboards...');
    await db.collection('billboards').deleteMany({});
    
    console.log('Purging Advertisers (keeping admins)...');
    await db.collection('users').deleteMany({ role: { $ne: 'admin' } });
    
    console.log('Purge Complete. Exiting.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

purge();
