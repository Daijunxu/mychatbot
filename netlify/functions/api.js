import express from 'express';
import serverless from 'serverless-http';
import mongoose from 'mongoose';
import cors from 'cors';
import { chatRouter } from '../../server/routes/chat.js';
import authRouter from '../../server/routes/auth.js';
import { config } from '../../server/config.js';

const app = express();

// 中间件
app.use(cors({
  origin: true, // 开发时允许所有来源
  credentials: true
}));
app.use(express.json());

// MongoDB Atlas 连接
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    await mongoose.connect(config.mongodb.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    cachedDb = mongoose.connection;
    console.log('Connected to MongoDB Atlas');
    return cachedDb;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw new Error('Database connection failed');
  }
}

// 测试路由 - 注意这里直接使用根路径
app.get('/test', async (req, res) => {
  try {
    await connectToDatabase();
    res.json({ status: 'ok', message: 'API is working' });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// 其他路由 - 同样使用相对路径
app.use('/auth', authRouter);
app.use('/chat', chatRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 处理函数
export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    await connectToDatabase();
    return await serverless(app)(event, context);
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: true, 
        message: error.message || 'Internal server error' 
      })
    };
  }
}; 