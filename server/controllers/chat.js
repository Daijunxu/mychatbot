import { ChatHistory } from '../models/ChatHistory.js';

export const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;

    // 创建新的聊天记录
    const chatHistory = new ChatHistory({
      userId,
      message,
      timestamp: new Date()
    });

    await chatHistory.save();

    res.status(200).json({
      success: true,
      data: chatHistory
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error sending message'
    });
  }
};

export const getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const history = await ChatHistory.find({ userId })
      .sort({ timestamp: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching chat history'
    });
  }
}; 