const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { User } = require('../models/User.js');
const { sendWelcomeEmail } = require('../services/email.js');
const { login, signup } = require('../controllers/auth.js');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 邮箱注册
router.post('/signup', signup);

// 邮箱登录
router.post('/login', login);

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

module.exports = { authRouter: router }; 