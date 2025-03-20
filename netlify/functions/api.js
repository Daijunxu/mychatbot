const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');
const { chatRouter } = require('../../server/routes/chat.js');
const { authRouter } = require('../../server/routes/auth.js');
const { config } = require('../../server/config.js');

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
    console.log('Using cached database connection');
    return cachedDb;
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('Connection string exists:', !!config.mongodb.uri);
    
    await mongoose.connect(config.mongodb.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    cachedDb = mongoose.connection;
    console.log('Successfully connected to MongoDB');
    return cachedDb;
  } catch (error) {
    console.error('MongoDB connection error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
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
if (chatRouter && chatRouter.stack) {
  app.use('/chat', chatRouter);
}

if (authRouter && authRouter.stack) {
  app.use('/auth', authRouter);
}

// 错误处理
app.use(errorHandler);

// 处理函数
const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  console.log('Request received:', {
    path: event.path,
    httpMethod: event.httpMethod,
    headers: event.headers
  });
  
  try {
    await connectToDatabase();
    const handler = serverless(app);
    const result = await handler(event, context);
    
    console.log('Response:', {
      statusCode: result.statusCode,
      headers: result.headers
    });
    return result;
  } catch (error) {
    console.error('Handler error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: true,
        message: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

module.exports = { handler }; 