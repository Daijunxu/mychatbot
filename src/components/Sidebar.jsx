import { useState, useEffect } from 'react';
import SearchBar from './SearchBar';

function Sidebar({ isOpen, onClose, onChatSelect, chats, setChats, loading }) {
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤对话
  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`
      fixed md:relative
      w-64 h-screen bg-gray-900 text-white
      transform transition-transform duration-200 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-64'}
    `}>
      <div className="flex flex-col h-full p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            className="text-white hover:bg-gray-700 rounded p-2"
            onClick={() => onChatSelect(null)}
          >
            新对话
          </button>
          <button
            className="md:hidden text-white"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        <SearchBar 
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <div className="flex-1 overflow-y-auto mt-4">
          {loading ? (
            <div className="text-center py-4">加载对话记录中...</div>
          ) : chats.length === 0 ? (
            <div className="text-center py-4">没有对话记录</div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-4">没有找到对话</div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat._id}
                className="p-2 hover:bg-gray-700 cursor-pointer rounded mb-1"
                onClick={() => onChatSelect(chat)}
              >
                <div className="text-sm truncate">{chat.title}</div>
                <div className="text-xs text-gray-400">
                  {new Date(chat.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Sidebar; 