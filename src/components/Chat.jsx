import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Avatar from './Avatar';

// 修改 groupChatsByDate 函数
const groupChatsByDate = (chats) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastThreeMonths = new Date(today);
  lastThreeMonths.setMonth(lastThreeMonths.getMonth() - 3);

  // 添加排序函数
  const sortByUpdatedAt = (a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();

  return {
    today: chats
      .filter(chat => new Date(chat.updated_at) >= today)
      .sort(sortByUpdatedAt),
    yesterday: chats
      .filter(chat => {
        const date = new Date(chat.updated_at);
        return date >= yesterday && date < today;
      })
      .sort(sortByUpdatedAt),
    thisWeek: chats
      .filter(chat => {
        const date = new Date(chat.updated_at);
        return date >= lastWeek && date < yesterday;
      })
      .sort(sortByUpdatedAt),
    thisMonth: chats
      .filter(chat => {
        const date = new Date(chat.updated_at);
        return date >= lastMonth && date < lastWeek;
      })
      .sort(sortByUpdatedAt),
    threeMonths: chats
      .filter(chat => {
        const date = new Date(chat.updated_at);
        return date >= lastThreeMonths && date < lastMonth;
      })
      .sort(sortByUpdatedAt)
  };
};

function Chat({ token }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showWelcome, setShowWelcome] = useState(true);
  const [menuOpen, setMenuOpen] = useState(null); // 控制当前打开的菜单
  const [userInfo, setUserInfo] = useState(null);

  // 响应式处理
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // 只在视口宽度改变跨过移动端/桌面端边界时更新侧边栏状态
      if (mobile !== isMobile) {
        setSidebarOpen(!mobile);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // 添加处理点击外部关闭菜单的逻辑
  const menuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 加载聊天历史
  useEffect(() => {
    loadChatHistory();
  }, []);

  // 加载聊天历史的函数
  const loadChatHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false) // 只加载未归档的对话
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChatHistory(data || []);

      // 如果没有历史记录，创建新会话
      if (!data || data.length === 0) {
        await startNewChat();
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setError('Failed to load chat history');
    }
  };

  // 加载特定聊天会话的函数
  const loadChatSession = async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('messages')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      
      setCurrentSessionId(sessionId);
      setMessages(data.messages || []);
      setShowWelcome(false); // 加载历史消息时隐藏欢迎界面
    } catch (error) {
      console.error('Error loading chat session:', error);
      setError('Failed to load chat session');
    }
  };

  // 开始新对话的函数
  const startNewChat = async () => {
    setMessages([]);
    setShowWelcome(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([{ user_id: user.id, messages: [] }])
        .select();
      
      if (error) throw error;
      
      setCurrentSessionId(data[0].id);
      // 更新聊天历史但不加载新会话
      const { data: historyData, error: historyError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!historyError) {
        setChatHistory(historyData || []);
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
      setError('Failed to create new chat');
    }
  };

  // 添加归档对话的函数
  const archiveChat = async (chatId) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ archived: true })
        .eq('id', chatId);

      if (error) throw error;
      
      // 更新本地状态
      setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
      if (currentSessionId === chatId) {
        await startNewChat();
      }
      setMenuOpen(null);
    } catch (error) {
      console.error('Error archiving chat:', error);
      setError('Failed to archive chat');
    }
  };

  // 添加删除对话的函数
  const deleteChat = async (chatId) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', chatId);

      if (error) throw error;
      
      // 更新本地状态
      setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
      if (currentSessionId === chatId) {
        await startNewChat();
      }
      setMenuOpen(null);
    } catch (error) {
      console.error('Error deleting chat:', error);
      setError('Failed to delete chat');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;
    
    setShowWelcome(false);
    const userMessage = newMessage;
    setNewMessage('');
    setLoading(true);
    setError(null);

    try {
      const updatedMessages = [...messages, { content: userMessage, is_user: true }];
      setMessages(updatedMessages);

      const initialPrompt = 'As an adversity coach, guide me through my callenges step by step by asking only one question at a time, following these rules: 1.Ask definition-based questions about core concepts, such as "What does happiness mean to you?" 2.After greeting, first ask and confirm the conversation topic, then ask and clarify the end goal, reflect it back, and align with me. 3.Avoid leading the conversation; let me take the initiative. 4.Regularly check whether the end goal is met; if yes, move to the closing process. 5.The closing process has three questions (with flexible wording): 5.1 What value did today\'s conversation create? 5.2 Anything else to add? 5.3 What kind of recognition or affirmation would you like? 6.If my answer is vague, rephrase the question and ask again. 7.When switching topics, list past ones and ask which to continue. 8.Don\'t use bullet points. 9.As concise as possible, keep each response under 100 words';

      // 构建消息历史
      const messageHistory = messages.map(msg => ({
        role: msg.is_user ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await fetch('/.netlify/edge-functions/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: userMessage,
          messageHistory: messageHistory  // 添加消息历史
        })
      });

      console.log('Response status:', response.status); // 调试日志

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText); // 调试日志
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // 更新消息列表
      const finalMessages = [...updatedMessages, { content: data.response, is_user: false }];
      setMessages(finalMessages);

      // 保存到数据库
      const { error: updateError } = await supabase
        .from('chat_sessions')
        .update({ 
          messages: finalMessages,
          updated_at: new Date().toISOString() // 显式更新时间
        })
        .eq('id', currentSessionId);

      if (updateError) throw updateError;

      // 重新加载聊天历史以更新排序
      await loadChatHistory();

    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
      setLoading(false);
    }
  };

  // 切换侧边栏
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // 在侧边栏渲染历史记录的部分进行修改
  const renderChatHistory = () => {
    const groupedChats = groupChatsByDate(chatHistory);
    
    const sections = [
      { title: 'Today', chats: groupedChats.today },
      { title: 'Yesterday', chats: groupedChats.yesterday },
      { title: 'This Week', chats: groupedChats.thisWeek },
      { title: 'This Month', chats: groupedChats.thisMonth },
      { title: 'Last 3 Months', chats: groupedChats.threeMonths }
    ];

    return sections.map(section => {
      if (section.chats.length === 0) return null;

      return (
        <div key={section.title} className="mb-4">
          <div className="px-3 py-2 text-xs text-gray-500 font-medium">
            {section.title}
          </div>
          <div className="space-y-1">
            {section.chats.map(chat => (
              <div
                key={chat.id}
                className={`px-3 py-2 text-sm hover:bg-gray-100 transition-colors relative group
                  ${currentSessionId === chat.id ? 'bg-gray-100' : ''}`}
              >
                <div 
                  className="flex items-center cursor-pointer"
                  onClick={() => {
                    loadChatSession(chat.id);
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
                  }}
                >
                  <div className="flex-1 truncate">
                    {(chat.messages && chat.messages[0]?.content) || 'New chat'}
                  </div>
                </div>
                
                {/* 三点菜单按钮 */}
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(menuOpen === chat.id ? null : chat.id);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                </button>

                {/* 下拉菜单 */}
                {menuOpen === chat.id && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-8 w-48 py-2 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
                  >
                    <button
                      onClick={() => archiveChat(chat.id)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      Archive
                    </button>
                    <button
                      onClick={() => deleteChat(chat.id)}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  // 加载用户信息
  const loadUserInfo = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      // 获取用户名（按优先级）
      const displayName = 
        user.user_metadata?.name ||           // 从 metadata 获取 name
        user.user_metadata?.full_name ||      // 或 full_name
        user.user_metadata?.user_name ||      // 或 user_name
        (user.email ? user.email.split('@')[0] : 'User');  // 或从邮箱获取，或默认值
      
      setUserInfo({
        ...user,
        displayName: displayName
      });
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  // 在组件加载时获取用户信息
  useEffect(() => {
    loadUserInfo();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="h-screen flex">
        {/* 侧边栏 */}
        <div 
          className={`fixed top-0 bottom-0 left-0 w-[260px] bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out z-20 
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
            md:relative md:transform-none ${sidebarOpen ? 'md:block' : 'md:hidden'}`}
        >
          <div className="h-full flex flex-col">
            {/* 顶部按钮区域 */}
            <div className="p-2 flex items-center justify-between border-b border-gray-200">
              <button
                onClick={() => startNewChat()}
                className="flex items-center gap-2 p-3 w-full text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                New Chat
              </button>
            </div>

            {/* 对话历史列表 */}
            <div className="flex-1 overflow-y-auto py-2">
              {renderChatHistory()}
            </div>

            {/* 底部用户信息 */}
            <div className="p-2 border-t border-gray-200">
              <div className="flex items-center justify-between p-3 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer">
                <div className="flex items-center gap-2">
                  {userInfo && (
                    <>
                      <Avatar name={userInfo.displayName} size={24} />
                      <span className="truncate">
                        {userInfo.displayName}
                      </span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 聊天主区域 */}
        <div className="flex-1 flex flex-col">
          {/* 顶部栏 */}
          <div className="flex items-center p-4 border-b border-gray-200">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* 聊天区域 */}
          <div className="flex-1 overflow-y-auto">
            <div className="h-full flex justify-center">
              <div className="w-full max-w-3xl px-4">
                {showWelcome ? (
                  // 欢迎界面
                  <div className="flex flex-col items-center py-8 space-y-6">
                    <img src="/logo.png" alt="Serena" className="w-16 h-16 rounded-full" />
                    <h1 className="text-2xl font-semibold text-gray-800">
                      Serena - Your Adversity Coach
                    </h1>
                    <p className="text-center text-gray-600 max-w-md">
                      I will help you develop strategies and skills to cope with challenges, bounce back from setbacks, ultimately fostering resilience and growth.
                    </p>
                    <div className="grid grid-cols-2 gap-4 w-full max-w-lg mt-8">
                      <div className="col-span-2 sm:col-span-1">
                        <button className="w-full p-4 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                          <div className="font-medium">How to overcome procrastination?</div>
                        </button>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <button className="w-full p-4 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                          <div className="font-medium">How to land a new job?</div>
                        </button>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <button className="w-full p-4 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                          <div className="font-medium">How to fight back PIP?</div>
                        </button>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <button className="w-full p-4 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                          <div className="font-medium">How can I get out of burnout?</div>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // 现有的消息列表
                  <div className="space-y-4 py-4">
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-3 ${
                          msg.is_user ? 'flex-row-reverse' : ''
                        }`}
                      >
                        {msg.is_user ? (
                          <Avatar 
                            name={userInfo?.displayName || ''} 
                            size={28} 
                          />
                        ) : (
                          <img src="/logo.png" alt="AI Coach" className="w-7 h-7 rounded-full" />
                        )}
                        <div
                          className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                            msg.is_user
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 输入区域 */}
          <div className="border-t bg-white">
            <div className="flex justify-center">
              <div className="w-full max-w-3xl px-4 py-4">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
                  >
                    {loading ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-red-100 text-red-700 rounded-lg shadow-lg">
          {error}
        </div>
      )}

      {/* 移动端侧边栏遮罩 */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default Chat;