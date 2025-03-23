import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Chat = () => {
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

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 添加 token 检查
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // 发送消息
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // 添加用户消息
    const userMessage = {
      content: inputMessage,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: inputMessage })
      });

      if (!response.ok) {
        if (response.status === 401) {
          // 只有在确实是认证问题时才登出
          const data = await response.json();
          if (data.error === 'Invalid token' || data.error === 'No token provided') {
            localStorage.removeItem('token');
            navigate('/login');
            return;
          }
        }
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // 添加 AI 回复
      const aiMessage = {
        content: data.response || "抱歉，我现在无法回答。请稍后再试。",
        isUser: false,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
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
    <div className="flex flex-col h-screen bg-gray-100">
      {/* 头部 */}
      <div className="bg-white shadow-sm p-4 flex items-center">
        <img src="/logo.png" alt="AI Coach" className="w-8 h-8 mr-2" />
        <h1 className="text-xl font-semibold">AI Coach</h1>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            {!message.isUser && (
              <img src="/logo.png" alt="AI" className="w-8 h-8 rounded-full mr-2" />
            )}
            <div
              className={`
                max-w-[80%] p-3 rounded-lg
                ${message.isUser 
                  ? 'bg-blue-500 text-white rounded-br-none' 
                  : 'bg-white shadow rounded-bl-none'}
                ${message.isError ? 'bg-red-100 text-red-600' : ''}
              `}
            >
              {message.content}
            </div>
            {message.isUser && (
              <img 
                src={localStorage.getItem('userAvatar') || '/user-avatar.png'} 
                alt="User" 
                className="w-8 h-8 rounded-full ml-2" 
              />
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <img src="/logo.png" alt="AI" className="w-8 h-8 rounded-full mr-2" />
            <div className="bg-white shadow p-3 rounded-lg rounded-bl-none">
              <div className="typing-indicator">思考中...</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
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
  );
};

export default Chat;