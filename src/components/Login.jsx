import { useState, useEffect, useCallback } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

function Login({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState('');

  const handleCredentialResponse = useCallback(async (response) => {
    try {
      const verifyResponse = await fetch('http://localhost:5001/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: response.credential,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify Google token');
      }

      const data = await verifyResponse.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (error) {
      console.error('Login error:', error);
    }
  }, [onLogin]);

  useEffect(() => {
    window.handleCredentialResponse = handleCredentialResponse;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      delete window.handleCredentialResponse;
    };
  }, [handleCredentialResponse]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const endpoint = isSignUp ? '/auth/signup' : '/auth/login';
      const url = `${import.meta.env.VITE_API_URL}${endpoint}`;
      console.log('Sending request to:', url); // 调试日志

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Request failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (error) {
      console.error('Login error:', error); // 调试日志
      setError(error.message || 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <div className="flex justify-center mb-6">
          <img 
            src="/logo.png" 
            alt="AI Coach Logo" 
            className="w-20 h-20 object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold mb-6 text-center">Your AI Coach</h1>
        
        <form onSubmit={handleSubmit} className="mb-6">
          {error && (
            <div className="mb-4 text-red-500 text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          {isSignUp && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-2 border rounded"
              />
            </div>
          )}
          
          <div className="mb-6 relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full p-2 border rounded"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          
          <button
            type="submit"
            className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="text-center mb-6">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-500 hover:underline"
          >
            {isSignUp ? 'Already have an account? Sign in' : 'No account? Sign up'}
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-gray-500 mb-4">or</div>
          <div
            id="g_id_onload"
            data-client_id="你的Google Client ID"
            data-callback="handleCredentialResponse"
            data-auto_prompt="false"
          />
          <div
            className="g_id_signin"
            data-type="standard"
            data-size="large"
            data-theme="outline"
            data-text="sign_in_with"
            data-shape="rectangular"
            data-logo_alignment="left"
          />
        </div>
      </div>
    </div>
  );
}

export default Login; 