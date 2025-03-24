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
          await startNewChat(user.id);
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

  const startNewChat = async (userId) => {
    try {
      // 创建新会话
      const { data: newSession, error } = await supabase
        .from('chat_sessions')
        .insert([
          {
            user_id: userId || user.id,
            messages: [],
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // 更新状态
      setMessages([]);
      setCurrentSessionId(newSession.id);
      setChatHistory(prev => [newSession, ...prev]);
    } catch (error) {
      console.error('Error creating new chat:', error);
      setError('创建新对话失败');
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

    const userMessage = newMessage;
    setNewMessage('');
    setLoading(true);
    setError(null);

    // 更新消息列表
    const updatedMessages = [...messages, { content: userMessage, is_user: true }];
    setMessages(updatedMessages);

    try {
      const initialPrompt = '作为我的生活教练，帮助我一步一步的解决问题...'; // 你的完整prompt

      // 根据环境选择正确的 API URL
      const apiUrl = import.meta.env.PROD 
        ? '/.netlify/edge-functions/api'
        : '/api';  // 开发环境使用简单路径

      console.log('Calling API at:', apiUrl); // 调试日志

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: messages.length === 0 ? initialPrompt : userMessage 
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

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-4">
        {/* 顶部栏 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="AI Coach" className="w-8 h-8 rounded-full" />
            <span className="text-gray-700 font-medium">AI Coach</span>
            <button
              onClick={() => startNewChat()}
              className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              新对话
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar 
                name={user?.user_metadata?.full_name || user?.email || ''} 
                size={32} 
              />
              <span className="text-gray-700">
                {user?.user_metadata?.full_name || user?.email || '用户'}
              </span>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              退出
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          {/* 历史记录侧边栏 */}
          <div className="w-64 bg-white rounded-lg shadow-sm p-4 h-[600px] overflow-y-auto">
            <h3 className="text-gray-700 font-medium mb-4">历史对话</h3>
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                onClick={() => loadChatSession(chat.id)}
                className={`p-2 rounded-lg mb-2 cursor-pointer hover:bg-gray-50 ${
                  currentSessionId === chat.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="text-sm text-gray-600">
                  {new Date(chat.created_at).toLocaleString()}
                </div>
                <div className="text-sm text-gray-800 truncate">
                  {(chat.messages && chat.messages[0]?.content) || '新对话'}
                </div>
              </div>
            ))}
          </div>

          {/* 聊天主区域 */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4 h-[600px] overflow-y-auto">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 mb-4 ${
                    msg.is_user ? 'flex-row-reverse' : ''
                  }`}
                >
                  {msg.is_user ? (
                    <Avatar 
                      name={user?.user_metadata?.full_name || user?.email || ''} 
                      size={32} 
                    />
                  ) : (
                    <img src="/logo.png" alt="AI Coach" className="w-8 h-8 rounded-full" />
                  )}
                  <div
                    className={`px-4 py-2 rounded-lg max-w-[70%] ${
                      msg.is_user
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="输入消息..."
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
              >
                {loading ? '发送中...' : '发送'}
              </button>
            </form>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;