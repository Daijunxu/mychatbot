import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';
import { sendWelcomeEmail } from '../services/email.js';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 邮箱注册
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // 检查邮箱是否已存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // 创建新用户
    const user = await User.create({
      email,
      password,
      name: name || email.split('@')[0]
    });

    // 创建 token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 发送欢迎邮件
    try {
      await sendWelcomeEmail(email, user.name);
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
      // 不要因为邮件发送失败而中断注册流程
    }

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      },
      message: 'Registration successful'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// 邮箱登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 查找用户
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    // 验证密码
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    // 创建 token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: '登录失败', error: error.message });
  }
});

// 保留现有的 Google 登录路由
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    console.log('Received credential:', credential);
    
    // 验证 Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    console.log('Google payload:', payload);
    
    // 查找或创建用户
    let user = await User.findOne({ email: payload.email });
    if (!user) {
      user = await User.create({
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        googleId: payload.sub
      });
    }

    // 创建 JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Auth successful for user:', user.email);
    res.json({ token, user });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
});

export default router; 