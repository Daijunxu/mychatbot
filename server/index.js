import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { chatRouter } from './routes/chat.js';
import authRouter from './routes/auth.js';
import { config } from './config.js';

dotenv.config();

// 创建 Express 应用
const createApp = async () => {
  const app = express();

  app.use(cors({
    origin: config.cors.origin,
    credentials: true
  }));
  app.use(express.json());

  // 请求日志中间件
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
  });

  // 错误处理中间件
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something broke!', error: err.message });
  });

  // 路由
  app.use('/api/auth', authRouter);
  app.use('/api/chat', chatRouter);

  // 添加健康检查端点
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
};

// 只在非生产环境运行服务器
if (process.env.NODE_ENV !== 'production') {
  try {
    const app = await createApp();
    const PORT = process.env.PORT || 5001;
    
    mongoose.connect(config.mongodb.uri)
      .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, () => {
          console.log(`Server is running on port ${PORT}`);
        });
      })
      .catch((error) => {
        console.error('MongoDB connection error:', error);
        process.exit(1);
      });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

export { createApp };

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
}); 