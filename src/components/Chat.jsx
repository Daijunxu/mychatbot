import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Avatar from './Avatar';  // 使用我们自己的 Avatar 组件

const Chat = ({ token }) => {
  const [messages, setMessages] = useState([
    {
      content: "你好！我是 AI Coach，很高兴为你提供帮助。我可以帮你解决职业发展、个人成长等方面的问题。",
      isUser: false,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    // 直接从 supabase 获取用户信息
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Error fetching user:', error);
          throw error;
        }
        
        if (!user) {
          throw new Error('No user found');
        }

        console.log('User data:', user); // 调试日志
        setUser(user);
      } catch (error) {
        console.error('Error getting user:', error);
        navigate('/login');
      }
    };

    fetchUser();
  }, [token, navigate]);

  // 如果用户数据还没加载完成，显示加载状态
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      // 清除所有 Supabase 相关的存储
      window.localStorage.removeItem('supabase.auth.token');
      window.localStorage.removeItem('supabase.auth.expires_at');
      window.localStorage.removeItem('supabase.auth.refresh_token');
      window.localStorage.removeItem('sb-kaolugejpluppefeznwc-auth-token');
      
      // 清除其他可能的会话数据
      await supabase.auth.clearSession();
      
      // 强制刷新页面并跳转到登录
      window.location.replace('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      // 即使出错也强制跳转
      window.location.replace('/login');
    }
  };

  // 发送消息
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: inputMessage })
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      setMessages(prev => [...prev, 
        { content: inputMessage, isUser: true, timestamp: new Date().toISOString() },
        { content: data.response, isUser: false, timestamp: new Date().toISOString() }
      ]);
      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      // 添加错误提示消息，但不登出
      setMessages(prev => [...prev, {
        content: "抱歉，发生了错误。请稍后再试。",
        isUser: false,
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-4">
        {/* 顶部栏 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="AI Coach" className="w-8 h-8 rounded-full" />
            <span className="text-gray-700 font-medium">AI Coach</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar 
                name={user.user_metadata?.full_name || user.email || ''} 
                size={32} 
              />
              <span className="text-gray-700">
                {user.user_metadata?.full_name || user.email || '用户'}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              退出
            </button>
          </div>
        </div>

        {/* 聊天区域 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 h-[600px] overflow-y-auto">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 mb-4 ${
                msg.isUser ? 'flex-row-reverse' : ''
              }`}
            >
              {msg.isUser ? (
                <Avatar 
                  name={user.user_metadata?.full_name || user.email || ''} 
                  size={32} 
                />
              ) : (
                <img src="/logo.png" alt="AI Coach" className="w-8 h-8 rounded-full" />
              )}
              <div
                className={`px-4 py-2 rounded-lg max-w-[70%] ${
                  msg.isUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* 输入区域 */}
        <form onSubmit={handleSendMessage} className="bg-white p-4 shadow-lg">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="输入你的问题..."
              className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className={`
                px-6 py-2 rounded-full font-medium
                ${isLoading || !inputMessage.trim()
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'}
              `}
            >
              发送
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chat;