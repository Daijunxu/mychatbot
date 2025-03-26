import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Avatar from './Avatar';

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

  // 获取用户信息和聊天历史
  useEffect(() => {
    const fetchUserAndHistory = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        setUser(user);

        // 获取用户的聊天历史
        const { data: sessions, error: historyError } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (historyError) throw historyError;
        setChatHistory(sessions || []);

        // 如果有历史会话，加载最新的一个
        if (sessions && sessions.length > 0) {
          setCurrentSessionId(sessions[0].id);
          setMessages(sessions[0].messages || []);
        } else {
          // 如果没有历史会话，创建新会话
          await startNewChat();
        }
      } catch (error) {
        console.error('Error:', error);
        setError('加载失败');
      }
    };

    if (token) {
      fetchUserAndHistory();
    }
  }, [token]);

  const startNewChat = async () => {
    setMessages([]);
    setCurrentSessionId(null);
    setShowWelcome(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('chat_sessions').insert([
        { user_id: user.id }
      ]).select();
      
      if (error) throw error;
      setCurrentSessionId(data[0].id);
    } catch (error) {
      console.error('Error creating new chat:', error);
      setError('Failed to create new chat');
    }
  };

  const loadChatSession = async (sessionId) => {
    try {
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      setMessages(session.messages || []);
      setCurrentSessionId(session.id);
    } catch (error) {
      console.error('Error loading chat session:', error);
      setError('加载对话失败');
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
      const { error: saveError } = await supabase
        .from('chat_sessions')
        .update({ 
          messages: finalMessages,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSessionId);

      if (saveError) {
        console.error('Error saving to database:', saveError);
        // 不中断用户体验，只记录错误
      }

    } catch (error) {
      console.error('Error details:', error);
      setError(`发送消息失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 切换侧边栏
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

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
                新对话
              </button>
            </div>

            {/* 对话历史列表 */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-1 p-2">
                {/* 时间分组标题 */}
                <div className="px-3 py-2 text-xs text-gray-500">今天</div>
                {chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => {
                      loadChatSession(chat.id);
                    }}
                    className={`p-3 text-sm rounded-lg cursor-pointer hover:bg-gray-100 transition-colors
                      ${currentSessionId === chat.id ? 'bg-gray-100' : ''}`}
                  >
                    <div className="text-gray-800 truncate">
                      {(chat.messages && chat.messages[0]?.content) || '新对话'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 底部用户信息 */}
            <div className="p-2 border-t border-gray-200">
              <div className="flex items-center justify-between p-3 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer">
                <div className="flex items-center gap-2">
                  <Avatar 
                    name={user?.user_metadata?.full_name || user?.email || ''} 
                    size={24} 
                  />
                  <span className="truncate">
                    {user?.user_metadata?.full_name || user?.email || '用户'}
                  </span>
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
                            name={user?.user_metadata?.full_name || user?.email || ''} 
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