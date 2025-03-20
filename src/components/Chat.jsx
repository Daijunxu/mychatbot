import { useState, useRef, useEffect } from 'react';
import Message from './Message';

function Chat({ currentChat, onMenuClick, setCurrentChat, onChatUpdate, user, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (currentChat) {
      setMessages(currentChat.messages);
    } else {
      setMessages([]);
    }
  }, [currentChat]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');

    try {
      let response;
      
      if (currentChat) {
        response = await fetch(`http://localhost:5001/api/chat/${currentChat._id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: input }),
        });
      } else {
        response = await fetch('http://localhost:5001/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: input }),
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API request failed');
      }

      const data = await response.json();
      
      if (!currentChat) {
        setCurrentChat(data);
      } else {
        setCurrentChat(data);
      }
      
      setMessages(data.messages);
      onChatUpdate();
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `错误信息: ${error.message}` 
      }]);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <button
            className="md:hidden mr-4"
            onClick={onMenuClick}
          >
            ☰
          </button>
          <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-full" />
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {user.name || user.email}
          </span>
          <button
            onClick={onLogout}
            className="px-4 py-2 text-sm text-blue-500 bg-white border border-blue-500 hover:bg-blue-50 rounded"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <Message key={index} {...message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-2 border rounded-l"
            placeholder="输入消息..."
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-r"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
}

export default Chat; 