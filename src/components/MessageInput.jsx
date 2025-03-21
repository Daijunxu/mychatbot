import React, { useState } from 'react';

const MessageInput = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <div className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={disabled}
          placeholder="输入消息..."
          className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className={`px-4 py-2 bg-indigo-600 text-white rounded-lg ${
            disabled || !message.trim()
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-indigo-700'
          }`}
        >
          发送
        </button>
      </div>
    </form>
  );
};

export default MessageInput; 