import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import NewChatButton from './components/NewChatButton';
import Login from './components/Login';

function App() {
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentChat, setCurrentChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const fetchChats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/chat', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch chats');
      const data = await response.json();
      setChats(data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setChats([]);
    setCurrentChat(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        onChatSelect={setCurrentChat}
        chats={chats}
        setChats={setChats}
        loading={loading}
        user={user}
        onLogout={handleLogout}
      />
      
      <div className="flex-1 flex flex-col">
        {!isSidebarOpen && (
          <NewChatButton onClick={() => setIsSidebarOpen(true)} />
        )}
        <Chat 
          currentChat={currentChat}
          setCurrentChat={setCurrentChat}
          onMenuClick={() => setIsSidebarOpen(true)}
          onChatUpdate={fetchChats}
          user={user}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
}

export default App; 