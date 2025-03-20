import express from 'express';
import serverless from 'serverless-http';
import mongoose from 'mongoose';
import cors from 'cors';
import { chatRouter } from '../../server/routes/chat.js';
import authRouter from '../../server/routes/auth.js';
import { config } from '../../server/config.js';

const app = express();

// 错误处理中间件
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: true,
    message: err.message || 'Internal Server Error'
  });
};

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// MongoDB 连接
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    await mongoose.connect(config.mongodb.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    cachedDb = mongoose.connection;
    console.log('Connected to MongoDB');
    return cachedDb;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// 测试路由
app.get('/test', async (req, res) => {
  try {
    await connectToDatabase();
    res.json({ status: 'ok', message: 'API is working' });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// 路由
app.use('/auth', authRouter);
app.use('/chat', chatRouter);

// 错误处理
app.use(errorHandler);

// 处理函数
export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    // 确保数据库连接
    await connectToDatabase();
    
    // 处理请求
    const handler = serverless(app);
    const result = await handler(event, context);
    
    console.log('Response:', result);
    return result;
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