import express from 'express';
import { Chat } from '../models/Chat.js';
import { generateResponse, generateTitle, generateSummaryTitle } from '../services/ai.js';
import jwt from 'jsonwebtoken';
import { sendMessage, getHistory } from '../controllers/chat.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 中间件：验证 JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '无效的认证令牌' });
    }
    req.user = user;
    next();
  });
};

// 应用认证中间件到所有路由
router.use(authenticateToken);

// 获取用户的所有对话
router.get('/', async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.userId })
      .sort({ updatedAt: -1 });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取单个对话
router.get('/:id', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ message: '对话不存在' });
    }
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 创建新对话
router.post('/', async (req, res) => {
  try {
    const userMessage = {
      role: 'user',
      content: req.body.message
    };

    const [aiResponse, title] = await Promise.all([
      generateResponse([userMessage]),
      generateTitle(req.body.message)
    ]);

    const chat = new Chat({
      title: title,
      userId: req.user.userId,  // 添加用户ID
      messages: [
        userMessage,
        {
          role: 'assistant',
          content: aiResponse
        }
      ]
    });

    const newChat = await chat.save();
    res.status(201).json(newChat);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// 向现有对话添加消息
router.post('/:id/messages', async (req, res) => {
  try {
    const chat = await Chat.findOne({ 
      _id: req.params.id,
      userId: req.user.userId  // 确保只能访问自己的对话
    });

    if (!chat) {
      return res.status(404).json({ message: '对话不存在' });
    }

    const userMessage = {
      role: 'user',
      content: req.body.message
    };

    chat.messages.push(userMessage);

    const aiResponse = await generateResponse(chat.messages);
    chat.messages.push({
      role: 'assistant',
      content: aiResponse
    });

    if (chat.messages.length === 8) {
      const newTitle = await generateSummaryTitle(chat.messages);
      chat.title = newTitle;
    }

    const updatedChat = await chat.save();
    res.json(updatedChat);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// 搜索对话
router.get('/search/:query', async (req, res) => {
  try {
    const searchQuery = req.params.query;
    console.log('Searching for:', searchQuery);
    
    const chats = await Chat.find({
      $or: [
        { title: { $regex: searchQuery, $options: 'i' } },
        { 'messages.content': { $regex: searchQuery, $options: 'i' } }
      ]
    }).exec();
    
    console.log('Found chats:', chats.length);
    res.json(chats);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: error.message });
  }
});

// 删除对话
router.delete('/:id', async (req, res) => {
  try {
    const chat = await Chat.findByIdAndDelete(req.params.id);
    if (!chat) {
      return res.status(404).json({ message: '对话不存在' });
    }
    res.json({ message: '对话已删除' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 聊天路由
router.post('/send', sendMessage);
router.get('/history', getHistory);

// 导出路由器实例
export { router as chatRouter }; 