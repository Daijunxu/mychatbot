import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Chat from './components/Chat';
import { supabase } from './lib/supabase';

function AuthWrapper({ token }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isProd = import.meta.env.PROD;
  const baseUrl = isProd 
    ? 'https://gilded-cucurucho-a6bf54.netlify.app'
    : 'http://localhost:3000';

  useEffect(() => {
    if (token && location.pathname === '/login') {
      navigate('/', { replace: true });
    } else if (!token && location.pathname === '/') {
      navigate('/login', { replace: true });
    }
  }, [token, location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Chat token={token} />} />
    </Routes>
  );
}

function App() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查初始会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || null);
      setLoading(false);
    });

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AuthWrapper token={token} />
    </BrowserRouter>
  );
}

export default App; 