import mongoose from 'mongoose';
import { config } from '../config.js';

export const connectWithRetry = async (retries = 5, interval = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(config.mongodb.uri, config.mongodb.options);
      console.log('Successfully connected to MongoDB Atlas');
      return;
    } catch (err) {
      console.error(`Connection attempt ${i + 1} failed:`, err);
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
};

export const closeConnection = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
    throw err;
  }
}; 