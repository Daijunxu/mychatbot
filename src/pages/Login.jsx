const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const response = await fetch('/.netlify/edge-functions/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    navigate('/chat');
  } catch (error) {
    console.error('Login error:', error);
    setError('登录失败，请检查邮箱和密码');
  } finally {
    setLoading(false);
  }
}; 