const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// 中间件
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 配置
const config = {
  mongodb: {
    uri: process.env.MONGODB_URI
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '24h'
  }
};

// MongoDB 模型
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true }
});

const chatHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

let User, ChatHistory;

// 数据库连接
async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  
  try {
    await mongoose.connect(config.mongodb.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    User = mongoose.models.User || mongoose.model('User', userSchema);
    ChatHistory = mongoose.models.ChatHistory || mongoose.model('ChatHistory', chatHistorySchema);
    
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// 认证中间件
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, config.jwt.secret, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid token' });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    res.status(500).json({ message: 'Auth error' });
  }
};

// 路由
app.post('/auth/login', async (req, res) => {
  try {
    await connectToDatabase();
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

app.post('/auth/signup', async (req, res) => {
  try {
    await connectToDatabase();
    const { email, password, name } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, name });
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Signup failed' });
  }
});

app.get('/chat/history', authenticateToken, async (req, res) => {
  try {
    await connectToDatabase();
    const history = await ChatHistory.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json({ history });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Failed to get chat history' });
  }
});

app.post('/chat/send', authenticateToken, async (req, res) => {
  try {
    await connectToDatabase();
    const { message } = req.body;
    const chat = new ChatHistory({
      userId: req.user.id,
      message
    });
    await chat.save();
    res.json({ message: chat });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// 导出处理函数
const handler = serverless(app);
module.exports = { handler }; 